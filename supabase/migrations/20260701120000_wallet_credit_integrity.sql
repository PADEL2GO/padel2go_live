-- =============================================================================
-- WALLET / CREDIT INTEGRITY (July 2026)
-- Follow-up to the June audit fixes. Addresses:
--   F1  checkout not idempotent  -> release a booking's prior reserve before re-reserving
--   F2  voucher release not idempotent across cron + expired webhook
--   F3  play_credits awarded via non-atomic read-modify-write (lost-update race)
--   F6  double credit refund race between the expired webhook and the cron
-- Strategy: a single atomic, idempotent release RPC (used by checkout retry, the
-- expired webhook, AND the cron) plus an atomic play/lifetime credit RPC.
-- Service-role only — never callable from the browser via PostgREST.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. release_booking_reserves: atomically refund a booking's reserved play
--    credits and release its soft-reserved voucher use, then zero the reserve
--    columns. Idempotent + race-free: the row is locked FOR UPDATE, so whichever
--    caller runs first wins; every later caller sees zeroed reserves and no-ops.
--    Used by (a) create-checkout-session before taking fresh reserves on a retry,
--    (b) the stripe-webhook 'expired' handler, and (c) cleanup_expired_bookings.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.release_booking_reserves(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  -- Lock the booking row so concurrent callers serialize on it.
  SELECT user_id, status, reserved_credits, reserved_voucher_id
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Never refund reserves on a confirmed booking: those credits were SETTLED
  -- (recorded as credits_used), not held — refunding them would leak credits.
  IF rec.status = 'confirmed' THEN
    RETURN;
  END IF;

  -- Nothing reserved (or already released) → idempotent no-op.
  IF COALESCE(rec.reserved_credits, 0) = 0 AND rec.reserved_voucher_id IS NULL THEN
    RETURN;
  END IF;

  -- Clear the reserve markers first (still holding the row lock).
  UPDATE public.bookings
  SET reserved_credits = 0,
      reserved_voucher_id = NULL
  WHERE id = p_booking_id;

  -- Refund reserved play credits to the wallet.
  IF rec.user_id IS NOT NULL AND rec.reserved_credits > 0 THEN
    UPDATE public.wallets
    SET play_credits = play_credits + rec.reserved_credits,
        updated_at   = now()
    WHERE user_id = rec.user_id;
  END IF;

  -- Release the soft-reserved voucher use.
  IF rec.reserved_voucher_id IS NOT NULL THEN
    UPDATE public.voucher_codes
    SET current_uses = GREATEST(0, current_uses - 1),
        updated_at   = now()
    WHERE id = rec.reserved_voucher_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.release_booking_reserves(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_booking_reserves(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. increment_play_and_lifetime: atomic delta on play_credits + lifetime_credits
--    (creates the wallet row if missing). Replaces the stale-read upsert in the
--    stripe-webhook booking-award path (F3) so a concurrent reserve/refund can't
--    clobber the award.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_play_and_lifetime(
  p_user_id uuid,
  p_play_delta integer,
  p_lifetime_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, play_credits, lifetime_credits)
  VALUES (p_user_id, GREATEST(0, p_play_delta), GREATEST(0, p_lifetime_delta))
  ON CONFLICT (user_id) DO UPDATE
  SET play_credits     = GREATEST(0, public.wallets.play_credits + p_play_delta),
      lifetime_credits = GREATEST(0, public.wallets.lifetime_credits + p_lifetime_delta),
      updated_at       = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_play_and_lifetime(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_play_and_lifetime(uuid, integer, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- 2b. settle_booking_reserves: atomically confirm a paid booking and finalize
--     credits_used from the LOCKED reserved_credits, but only if it is still
--     'pending_payment'. Returns false for a duplicate (already-confirmed) webhook
--     or a booking a sibling expired session already cancelled — the caller must
--     then NOT award, else it would confirm a booking whose reserves were already
--     refunded (credit leak). Exactly one caller ever wins the pending→confirmed
--     transition, so it also serializes the play-credit award.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.settle_booking_reserves(p_booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  SELECT status, reserved_credits
  INTO rec
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Already settled (duplicate webhook) or cancelled by an expired sibling session.
  IF rec.status <> 'pending_payment' THEN
    RETURN false;
  END IF;

  UPDATE public.bookings
  SET status              = 'confirmed',
      credits_used        = CASE WHEN COALESCE(reserved_credits, 0) > 0
                                 THEN reserved_credits ELSE credits_used END,
      reserved_credits    = 0,
      reserved_voucher_id = NULL
  WHERE id = p_booking_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_booking_reserves(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_booking_reserves(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. cleanup_expired_bookings: reuse the single release RPC instead of its own
--    inline refund/voucher logic, so cron and webhook can never double-release.
--    (The pg_cron schedule already invokes this function by name — body only.)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows integer := 0;
  rec record;
BEGIN
  FOR rec IN
    SELECT id
    FROM public.bookings
    WHERE status = 'pending_payment'
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.release_booking_reserves(rec.id);

    UPDATE public.bookings
    SET status       = 'cancelled',
        cancelled_at = now()
    WHERE id = rec.id;

    affected_rows := affected_rows + 1;
  END LOOP;

  RETURN affected_rows;
END;
$$;
