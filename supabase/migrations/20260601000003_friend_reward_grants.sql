-- Per-pair lock for the "+50 reward points on accepted friendship" bonus.
-- Without this, a user could farm points by repeatedly removing and re-adding
-- the same friend. We store one row per unordered pair of user IDs; the unique
-- primary key + CHECK constraint enforce that lo < hi, so order doesn't matter.
CREATE TABLE IF NOT EXISTS public.friend_reward_grants (
  user_lo    uuid        NOT NULL,
  user_hi    uuid        NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_lo, user_hi),
  CONSTRAINT friend_reward_grants_pair_order CHECK (user_lo < user_hi)
);

-- Internal accounting only — no client should ever read or write this table.
-- The friends-api edge function uses the service role key, which bypasses RLS.
ALTER TABLE public.friend_reward_grants ENABLE ROW LEVEL SECURITY;
