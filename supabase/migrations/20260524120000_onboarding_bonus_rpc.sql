-- Make onboarding bonuses actually work backend.
-- Adds (idempotent) the wallet flag columns the OnboardingChecklist relies on,
-- and introduces a SECURITY DEFINER RPC that:
--   1) Verifies the caller's eligibility server-side from authoritative tables
--      (profiles / bookings / friendships) — client trust is not required.
--   2) Creates the wallets row if it doesn't exist.
--   3) Awards points + flips the corresponding onboarding flag atomically.
--   4) Is idempotent — re-calls return { credited: false, reason: 'already_claimed' }.

-- 1. Make sure the wallet columns exist (some envs missed the original 0412 migration)
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS onboarding_profile_credited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_booking_credited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_friend_credited  boolean NOT NULL DEFAULT false;

-- 2. The claim RPC
CREATE OR REPLACE FUNCTION public.claim_onboarding_bonus(p_flag text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id          uuid := auth.uid();
  v_already_credited boolean;
  v_points           int;
  v_eligible         boolean := false;
  v_display_name     text;
  v_avatar_url       text;
  v_bookings_count   int;
  v_friends_count    int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_flag NOT IN (
    'onboarding_profile_credited',
    'onboarding_booking_credited',
    'onboarding_friend_credited'
  ) THEN
    RAISE EXCEPTION 'Invalid flag: %', p_flag;
  END IF;

  v_points := CASE p_flag
    WHEN 'onboarding_profile_credited' THEN 250
    WHEN 'onboarding_booking_credited' THEN 500
    WHEN 'onboarding_friend_credited'  THEN 150
  END;

  -- Ensure a wallets row exists for this user
  INSERT INTO public.wallets (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Idempotency check — fetch the requested flag dynamically
  EXECUTE format('SELECT %I FROM public.wallets WHERE user_id = $1', p_flag)
    INTO v_already_credited
    USING v_user_id;

  IF v_already_credited THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_claimed');
  END IF;

  -- Server-side eligibility verification from authoritative tables
  IF p_flag = 'onboarding_profile_credited' THEN
    SELECT display_name, avatar_url
      INTO v_display_name, v_avatar_url
      FROM public.profiles
      WHERE user_id = v_user_id;
    v_eligible :=
      v_display_name IS NOT NULL AND length(trim(v_display_name)) > 0
      AND v_avatar_url IS NOT NULL AND length(trim(v_avatar_url)) > 0;

  ELSIF p_flag = 'onboarding_booking_credited' THEN
    SELECT count(*) INTO v_bookings_count
      FROM public.bookings
      WHERE user_id = v_user_id AND status = 'confirmed';
    v_eligible := v_bookings_count > 0;

  ELSIF p_flag = 'onboarding_friend_credited' THEN
    SELECT count(*) INTO v_friends_count
      FROM public.friendships
      WHERE status = 'accepted'
        AND (requester_id = v_user_id OR addressee_id = v_user_id);
    v_eligible := v_friends_count > 0;
  END IF;

  IF NOT v_eligible THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'not_eligible');
  END IF;

  -- Award points + set the flag atomically (dynamic column name is the
  -- already-whitelisted p_flag, escaped via format(%I) — safe from injection)
  EXECUTE format(
    'UPDATE public.wallets
        SET play_credits     = COALESCE(play_credits, 0)     + $1,
            lifetime_credits = COALESCE(lifetime_credits, 0) + $1,
            %I               = true,
            updated_at       = now()
      WHERE user_id = $2',
    p_flag
  ) USING v_points, v_user_id;

  RETURN jsonb_build_object('credited', true, 'points', v_points);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_onboarding_bonus(text) TO authenticated;
