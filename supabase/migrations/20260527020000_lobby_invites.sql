-- ============================================================
-- Lobby invites — host can invite friends to a lobby (public or private).
-- Invitees get a notification + see the lobby in their pending invites list.
-- Accepting an invite leads to the normal join_lobby (Stripe) flow.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lobby_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id     UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  inviter_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,

  CONSTRAINT no_self_invite CHECK (inviter_id <> invitee_id),
  CONSTRAINT unique_active_invite UNIQUE (lobby_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_lobby_invites_invitee_pending
  ON public.lobby_invites (invitee_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_lobby_invites_lobby
  ON public.lobby_invites (lobby_id);

-- NOTE: public.is_lobby_host(UUID, UUID) already exists in this database
-- from an earlier migration. We reuse it instead of recreating
-- (cannot CREATE OR REPLACE with different parameter names).

ALTER TABLE public.lobby_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: invitee, inviter, or any lobby member can see invites for the lobby
DROP POLICY IF EXISTS "lobby_invites_select" ON public.lobby_invites;
CREATE POLICY "lobby_invites_select"
  ON public.lobby_invites FOR SELECT
  USING (
    auth.uid() = invitee_id
    OR auth.uid() = inviter_id
    OR public.is_lobby_host(lobby_id, auth.uid())
  );

-- INSERT: only the lobby host may invite, and only their own friends
DROP POLICY IF EXISTS "lobby_invites_insert_host" ON public.lobby_invites;
CREATE POLICY "lobby_invites_insert_host"
  ON public.lobby_invites FOR INSERT
  WITH CHECK (
    auth.uid() = inviter_id
    AND public.is_lobby_host(lobby_id, auth.uid())
    AND public.are_friends(auth.uid(), invitee_id)
  );

-- UPDATE: invitee may accept/decline; inviter may cancel
DROP POLICY IF EXISTS "lobby_invites_update" ON public.lobby_invites;
CREATE POLICY "lobby_invites_update"
  ON public.lobby_invites FOR UPDATE
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- DELETE: inviter (host) only
DROP POLICY IF EXISTS "lobby_invites_delete_host" ON public.lobby_invites;
CREATE POLICY "lobby_invites_delete_host"
  ON public.lobby_invites FOR DELETE
  USING (auth.uid() = inviter_id);

-- Realtime so invitees see new invites live
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'lobby_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_invites;
  END IF;
END $$;
