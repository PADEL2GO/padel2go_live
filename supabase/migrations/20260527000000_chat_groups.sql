-- ============================================================
-- Group chat (multi-user) — extends the existing 1:1 chat_messages.
-- Only the group creator may add / remove members.
-- ============================================================

-- 1) Group + membership tables
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  group_id     UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON public.chat_group_members(user_id);

-- 2) Extend chat_messages so it can target a group instead of a single recipient
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.chat_groups(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages ALTER COLUMN recipient_id DROP NOT NULL;

-- Either 1:1 (recipient_id set, group_id null) OR group (group_id set, recipient_id null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_target_xor'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_target_xor CHECK (
        (recipient_id IS NOT NULL AND group_id IS NULL)
        OR (recipient_id IS NULL AND group_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_group
  ON public.chat_messages (group_id, created_at DESC)
  WHERE group_id IS NOT NULL;

-- 3) Helper: is user a member of group? (SECURITY DEFINER to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.is_group_member(g UUID, u UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_group_members
    WHERE group_id = g AND user_id = u
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_creator(g UUID, u UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE id = g AND created_by = u
  );
$$;

-- 4) RLS — chat_groups
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_groups_select_members" ON public.chat_groups;
CREATE POLICY "chat_groups_select_members"
  ON public.chat_groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_group_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_groups_insert_self" ON public.chat_groups;
CREATE POLICY "chat_groups_insert_self"
  ON public.chat_groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chat_groups_update_creator" ON public.chat_groups;
CREATE POLICY "chat_groups_update_creator"
  ON public.chat_groups FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "chat_groups_delete_creator" ON public.chat_groups;
CREATE POLICY "chat_groups_delete_creator"
  ON public.chat_groups FOR DELETE
  USING (created_by = auth.uid());

-- 5) RLS — chat_group_members
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_group_members_select_member" ON public.chat_group_members;
CREATE POLICY "chat_group_members_select_member"
  ON public.chat_group_members FOR SELECT
  USING (
    public.is_group_member(group_id, auth.uid())
    OR public.is_group_creator(group_id, auth.uid())
  );

-- Only the group creator may add members; creator's own self-membership is also covered here
DROP POLICY IF EXISTS "chat_group_members_insert_creator" ON public.chat_group_members;
CREATE POLICY "chat_group_members_insert_creator"
  ON public.chat_group_members FOR INSERT
  WITH CHECK (public.is_group_creator(group_id, auth.uid()));

-- Creator may remove anyone; members may remove themselves (leave)
DROP POLICY IF EXISTS "chat_group_members_delete" ON public.chat_group_members;
CREATE POLICY "chat_group_members_delete"
  ON public.chat_group_members FOR DELETE
  USING (
    public.is_group_creator(group_id, auth.uid())
    OR user_id = auth.uid()
  );

-- Members may update their own last_read_at
DROP POLICY IF EXISTS "chat_group_members_update_self" ON public.chat_group_members;
CREATE POLICY "chat_group_members_update_self"
  ON public.chat_group_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6) Extend chat_messages RLS so group messages work
-- (existing 1:1 policies stay; we add additive policies for groups)
DROP POLICY IF EXISTS "chat_messages_select_group_member" ON public.chat_messages;
CREATE POLICY "chat_messages_select_group_member"
  ON public.chat_messages FOR SELECT
  USING (
    group_id IS NOT NULL
    AND public.is_group_member(group_id, auth.uid())
  );

DROP POLICY IF EXISTS "chat_messages_insert_to_group" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_to_group"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND group_id IS NOT NULL
    AND public.is_group_member(group_id, auth.uid())
  );

-- 7) Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
  END IF;
END $$;
