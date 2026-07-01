-- =============================================================================
-- PERFORMANCE INDEXES (July 2026)
-- Back the hot query paths surfaced by the performance audit. All IF NOT EXISTS
-- so this is safe to run and re-run. Pre-launch data volume is small, so plain
-- (non-CONCURRENT) creation is fine and fast.
-- =============================================================================

-- Booking availability / conflict check runs on every booking + guest-booking
-- creation: court_id + a start/end time-range filter, restricted to live statuses.
-- A partial composite index lets the "no conflict" happy path use an index range
-- scan instead of scanning a court's whole booking history.
CREATE INDEX IF NOT EXISTS idx_bookings_court_conflict
  ON public.bookings (court_id, start_time, end_time)
  WHERE status NOT IN ('cancelled'::booking_status, 'expired'::booking_status);

-- Leaderboard / rankings (p2g-points-api) repeatedly orders and counts wallets by
-- play_credits; the table previously had only its user_id primary key.
CREATE INDEX IF NOT EXISTS idx_wallets_play_credits
  ON public.wallets (play_credits DESC);

-- The notification bell list query (run on every authenticated page load) filters
-- by user_id and orders by created_at; the only prior index was a partial
-- unread-only one that does not cover this ordered list.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
