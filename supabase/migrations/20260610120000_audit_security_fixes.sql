-- =============================================================================
-- SECURITY AUDIT FIXES (June 2026)
-- Addresses findings: C1 (double-booking), C3 (guest PII), C4 (wallet race),
-- H1 (credit reservation), H2 (voucher refund), H3 (newsletter), H5 (secret
-- masking), H17 (superadmin role seed).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. (C1) Fix double-booking constraint: the exclusion constraint only covered
--    'pending'/'confirmed' but the app uses 'pending_payment', so two users
--    could hold the same slot. Clean up conflicting rows, then recreate the
--    constraint over 'pending_payment' + 'confirmed'.
-- -----------------------------------------------------------------------------

-- Cancel expired holds first so they don't block the new constraint
SELECT public.cleanup_expired_bookings();

-- Cancel any still-overlapping pending_payment rows (keep the older row)
UPDATE public.bookings b
SET status = 'cancelled', cancelled_at = now()
WHERE b.status = 'pending_payment'
  AND EXISTS (
    SELECT 1 FROM public.bookings o
    WHERE o.court_id = b.court_id
      AND o.id <> b.id
      AND o.status IN ('pending_payment', 'confirmed')
      AND tstzrange(o.start_time, o.end_time) && tstzrange(b.start_time, b.end_time)
      AND o.created_at < b.created_at
  );

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status = ANY (ARRAY['pending_payment'::booking_status, 'confirmed'::booking_status]));

-- -----------------------------------------------------------------------------
-- 2. (C3) Guest booking PII: the anon SELECT policy exposed guest_name,
--    guest_email, guest_phone of ALL guest bookings to anyone. Replace with a
--    SECURITY DEFINER function that requires knowing the booking UUID.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "anon_select_guest_booking" ON public.bookings;

CREATE OR REPLACE FUNCTION public.get_guest_booking(p_booking_id uuid)
RETURNS TABLE (
  id uuid,
  start_time timestamptz,
  end_time timestamptz,
  status public.booking_status,
  price_cents integer,
  currency text,
  hold_expires_at timestamptz,
  guest_name text,
  guest_email text,
  location_name text,
  location_slug text,
  location_address text,
  court_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.start_time,
    b.end_time,
    b.status,
    b.price_cents,
    b.currency,
    b.hold_expires_at,
    b.guest_name,
    b.guest_email,
    l.name    AS location_name,
    l.slug    AS location_slug,
    l.address AS location_address,
    c.name    AS court_name
  FROM public.bookings b
  LEFT JOIN public.locations l ON l.id = b.location_id
  LEFT JOIN public.courts c    ON c.id = b.court_id
  WHERE b.id = p_booking_id
    AND b.user_id IS NULL
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_booking(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. (H3) Newsletter: signup form is public, but the INSERT policy only
--    allowed authenticated users — anonymous subscriptions silently failed.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. (H17) Superadmin role seed: the superadmin email bypass only works in
--    frontend code; persist a proper admin role row so DB policies match.
-- -----------------------------------------------------------------------------

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'fsteinfelder@padel2go.eu'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = u.id AND r.role = 'admin'
  );

-- -----------------------------------------------------------------------------
-- 5. (H1) Credit reservation: track reserved play credits / voucher per booking
--    and provide service-role-only RPCs to reserve/refund atomically.
-- -----------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reserved_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reserved_voucher_id uuid;

CREATE OR REPLACE FUNCTION public.reserve_play_credits(p_user_id uuid, p_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.wallets
  SET play_credits = play_credits - p_amount,
      updated_at   = now()
  WHERE user_id = p_user_id
    AND play_credits >= p_amount;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_play_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_amount > 0 THEN
    UPDATE public.wallets
    SET play_credits = play_credits + p_amount,
        updated_at   = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- CRITICAL: without these revokes any logged-in user could mint credits via
-- PostgREST rpc. Only edge functions (service_role) may call them.
REVOKE ALL ON FUNCTION public.reserve_play_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_play_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_play_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_play_credits(uuid, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. (C4) Atomic wallet increment: replaces read-modify-write of
--    reward_credits/lifetime_credits in edge functions (race condition).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_wallet_credits(
  p_user_id uuid,
  p_reward_delta integer,
  p_lifetime_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET reward_credits   = GREATEST(0, reward_credits + p_reward_delta),
      lifetime_credits = GREATEST(0, lifetime_credits + p_lifetime_delta),
      updated_at       = now()
  WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_wallet_credits(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_credits(uuid, integer, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- 7. (H1+H2) Cleanup refunds: expired pending_payment bookings must refund
--    reserved play credits and release voucher usage before being cancelled.
--    The pg_cron schedule 'cleanup-expired-bookings' already exists — only the
--    function body is replaced, do NOT reschedule.
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
    SELECT id, user_id, reserved_credits, reserved_voucher_id
    FROM public.bookings
    WHERE status = 'pending_payment'
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF rec.user_id IS NOT NULL AND rec.reserved_credits > 0 THEN
      UPDATE public.wallets
      SET play_credits = play_credits + rec.reserved_credits,
          updated_at   = now()
      WHERE user_id = rec.user_id;
    END IF;

    IF rec.reserved_voucher_id IS NOT NULL THEN
      UPDATE public.voucher_codes
      SET current_uses = GREATEST(0, current_uses - 1),
          updated_at   = now()
      WHERE id = rec.reserved_voucher_id;
    END IF;

    UPDATE public.bookings
    SET status              = 'cancelled',
        cancelled_at        = now(),
        reserved_credits    = 0,
        reserved_voucher_id = NULL
    WHERE id = rec.id;

    affected_rows := affected_rows + 1;
  END LOOP;

  RETURN affected_rows;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8. (H5) Integration secrets masking: drop the broad FOR ALL policy (which
--    let any admin SELECT raw API keys via PostgREST). Keep write access via
--    separate INSERT/UPDATE/DELETE policies, but provide reads only through a
--    masking function.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "admins_manage_integration_configs" ON public.site_integration_configs;

DROP POLICY IF EXISTS "admins_insert_integration_configs" ON public.site_integration_configs;
CREATE POLICY "admins_insert_integration_configs"
ON public.site_integration_configs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "admins_update_integration_configs" ON public.site_integration_configs;
CREATE POLICY "admins_update_integration_configs"
ON public.site_integration_configs
FOR UPDATE
TO authenticated
USING (
  auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
)
WITH CHECK (
  auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "admins_delete_integration_configs" ON public.site_integration_configs;
CREATE POLICY "admins_delete_integration_configs"
ON public.site_integration_configs
FOR DELETE
TO authenticated
USING (
  auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Intentionally NO SELECT policy: reads go through the masking function below.

CREATE OR REPLACE FUNCTION public.get_integration_configs_masked()
RETURNS TABLE (service text, config jsonb, updated_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  masked jsonb;
  k text;
  v jsonb;
  raw text;
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR (auth.jwt()->>'email') = 'fsteinfelder@padel2go.eu'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR rec IN
    SELECT c.service, c.config, c.updated_at
    FROM public.site_integration_configs c
  LOOP
    masked := COALESCE(rec.config, '{}'::jsonb);

    FOR k, v IN SELECT * FROM jsonb_each(masked) LOOP
      IF jsonb_typeof(v) = 'string'
        AND (
          lower(k) LIKE '%key%'
          OR lower(k) LIKE '%secret%'
          OR lower(k) LIKE '%token%'
          OR lower(k) LIKE '%password%'
        )
      THEN
        raw := v #>> '{}';
        IF length(raw) > 4 THEN
          masked := jsonb_set(masked, ARRAY[k], to_jsonb('••••' || right(raw, 4)));
        ELSE
          masked := jsonb_set(masked, ARRAY[k], to_jsonb('••••'::text));
        END IF;
      END IF;
    END LOOP;

    service    := rec.service;
    config     := masked;
    updated_at := rec.updated_at;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_integration_configs_masked() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. (C4-support) Relax points_ledger.entry_type CHECK to cover every value the
--    edge functions actually write. The original constraint (20251222143818)
--    only allowed 4 values while live code writes 9+ — inserts like AUTO_CREDIT
--    would be rejected wherever the original constraint is still in force.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_entry_type_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_entry_type_check
  CHECK (entry_type IN (
    'EARN_CLAIM', 'REVERSAL', 'ADMIN_ADJUST', 'MARKETPLACE_REDEEM',
    'AUTO_CREDIT', 'STREAK_BONUS', 'REDEMPTION', 'REPAIR_CLAIM',
    'ADMIN_APPROVED', 'ADMIN_CREDIT', 'ADMIN_RESET'
  ));
