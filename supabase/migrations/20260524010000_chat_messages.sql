-- ============================================================
-- 1:1 Chat between accepted friends.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_chat CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_pair
  ON public.chat_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_unread
  ON public.chat_messages (recipient_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON public.chat_messages (sender_id, created_at DESC);

-- Friendship check helper (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.are_friends(u1 UUID, u2 UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = u1 AND addressee_id = u2)
        OR (requester_id = u2 AND addressee_id = u1)
      )
  );
$$;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: only see your own conversations
CREATE POLICY "chat_messages_select_own"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- INSERT: must be the sender AND recipient must be an accepted friend
CREATE POLICY "chat_messages_insert_to_friends"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.are_friends(auth.uid(), recipient_id)
  );

-- UPDATE: only recipient may mark as read (set read_at)
CREATE POLICY "chat_messages_update_recipient_read"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- DELETE: senders may delete their own messages
CREATE POLICY "chat_messages_delete_own"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Enable Realtime so clients receive INSERT events live
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;
