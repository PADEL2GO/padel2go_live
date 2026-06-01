-- Allow chat_messages to carry structured payloads (e.g. lobby invites that
-- render in the chat thread with Accept/Decline buttons).
--
-- - kind: discriminates the renderer on the client. Default 'text' keeps every
--   existing message rendered as a normal bubble.
-- - metadata: JSONB blob, free-form per kind. For 'lobby_invite' we store
--   { lobby_id, invite_id, location_name, start_time }.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS kind     text  NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Whitelist known kinds so a typo in client code fails loudly instead of
-- silently rendering as text.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_kind_check'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_kind_check
        CHECK (kind IN ('text', 'lobby_invite'));
  END IF;
END $$;
