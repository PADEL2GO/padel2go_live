-- =============================================================================
-- MATCH REMINDERS (July 2026)
-- Track whether the T-1h reminder was already sent for a booking, so the
-- send-match-reminders cron never double-notifies. Partial index backs the
-- "reminders due in the next hour" lookup.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_reminder_due
  ON public.bookings (start_time)
  WHERE status = 'confirmed'::booking_status AND reminder_sent_at IS NULL;
