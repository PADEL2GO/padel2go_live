-- Disable the onboarding bonus system for launch.
-- The frontend Welcome/Onboarding checklist has been removed; this also turns
-- the RPC into a no-op so the bonus cannot be claimed via direct API calls.
-- Schema (wallets.onboarding_*_credited columns) is intentionally preserved
-- so we can re-enable the flow later without a data migration.
CREATE OR REPLACE FUNCTION public.claim_onboarding_bonus(p_flag text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN jsonb_build_object('credited', false, 'reason', 'disabled');
END;
$$;
