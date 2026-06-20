-- ============================================================
-- Court utilization (Auslastung) RPCs
-- Single source of truth for the manager dashboard (/club/utilization)
-- and the super-admin dashboard (/admin/utilization).
--
-- Capacity denominator = parent LOCATION opening hours
-- (locations.opening_hours_json, is_24_7 -> 24h/day). No per-court hours.
-- Occupied time = bookings with status IN ('confirmed','completed').
-- Bookings are bucketed into months by the location's local timezone so
-- wall-clock day boundaries line up with opening hours.
--
-- Authorization is enforced INSIDE each SECURITY DEFINER function:
--   admin  -> email 'fsteinfelder@padel2go.eu' OR user_roles.role = 'admin'
--   manager-> courts via club_court_assignments (+ active club_users)
--             or legacy club_owner_assignments
-- ============================================================

-- ------------------------------------------------------------
-- Helper: total open minutes for a location across one month
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.location_open_minutes(
  p_opening_hours jsonb,
  p_is_24_7 boolean,
  p_month_start date
) RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_month     date := date_trunc('month', p_month_start)::date;
  v_month_end date := (date_trunc('month', p_month_start) + interval '1 month')::date;
  v_keys      text[] := ARRAY['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  v_total     integer := 0;
  v_day       date;
  v_entry     jsonb;
  v_open_min  integer;
  v_close_min integer;
BEGIN
  IF p_is_24_7 THEN
    RETURN (v_month_end - v_month) * 1440;
  END IF;

  IF p_opening_hours IS NULL THEN
    RETURN 0;
  END IF;

  v_day := v_month;
  WHILE v_day < v_month_end LOOP
    v_entry := p_opening_hours -> v_keys[EXTRACT(DOW FROM v_day)::int + 1];

    IF v_entry IS NOT NULL AND v_entry ? 'open' AND v_entry ? 'close'
       AND length(v_entry ->> 'open') >= 4 AND length(v_entry ->> 'close') >= 4 THEN
      v_open_min  := split_part(v_entry ->> 'open',  ':', 1)::int * 60 + split_part(v_entry ->> 'open',  ':', 2)::int;
      v_close_min := split_part(v_entry ->> 'close', ':', 1)::int * 60 + split_part(v_entry ->> 'close', ':', 2)::int;

      IF v_close_min > v_open_min THEN
        v_total := v_total + (v_close_min - v_open_min);
      ELSIF v_close_min < v_open_min THEN
        -- crosses midnight
        v_total := v_total + ((1440 - v_open_min) + v_close_min);
      END IF;
    END IF;

    v_day := v_day + 1;
  END LOOP;

  RETURN v_total;
END;
$$;

-- ------------------------------------------------------------
-- Per-court utilization for one month (serves BOTH dashboards;
-- returns only the rows the caller is authorized to see)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_court_utilization(p_month_start date)
RETURNS TABLE(
  court_id         uuid,
  court_name       text,
  location_id      uuid,
  location_name    text,
  location_city    text,
  is_active        boolean,
  is_online        boolean,
  possible_minutes integer,
  booked_minutes   integer,
  bookings_count   integer,
  capacity_pct     numeric,
  revenue_cents    bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text := auth.jwt() ->> 'email';
  v_is_admin  boolean;
  v_month     date := date_trunc('month', p_month_start)::date;
  v_month_end date := (date_trunc('month', p_month_start) + interval '1 month')::date;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  v_is_admin := (v_email = 'fsteinfelder@padel2go.eu')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin');

  RETURN QUERY
  WITH authorized_courts AS (
    SELECT c.id
    FROM public.courts c
    JOIN public.locations l ON l.id = c.location_id
    WHERE v_is_admin AND l.is_online = true
    UNION
    SELECT cca.court_id
    FROM public.club_court_assignments cca
    JOIN public.club_users cu ON cu.club_id = cca.club_id
    WHERE NOT v_is_admin AND cu.user_id = v_uid AND cu.is_active = true
    UNION
    SELECT coa.court_id
    FROM public.club_owner_assignments coa
    WHERE NOT v_is_admin AND coa.user_id = v_uid
  ),
  booking_agg AS (
    SELECT
      b.court_id AS c_id,
      COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0)::int AS booked_minutes,
      COUNT(*)::int AS bookings_count,
      COALESCE(SUM(b.price_cents), 0)::bigint AS revenue_cents
    FROM public.bookings b
    JOIN public.courts bc ON bc.id = b.court_id
    JOIN public.locations bl ON bl.id = bc.location_id
    WHERE b.court_id IN (SELECT id FROM authorized_courts)
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time AT TIME ZONE bl.timezone) >= v_month::timestamp
      AND (b.start_time AT TIME ZONE bl.timezone) <  v_month_end::timestamp
    GROUP BY b.court_id
  )
  SELECT
    c.id,
    c.name,
    l.id,
    l.name,
    l.city,
    c.is_active,
    l.is_online,
    public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_month) AS possible_minutes,
    COALESCE(ba.booked_minutes, 0) AS booked_minutes,
    COALESCE(ba.bookings_count, 0) AS bookings_count,
    CASE
      WHEN public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_month) > 0
        THEN round(100.0 * COALESCE(ba.booked_minutes, 0)
             / public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_month), 1)
      ELSE 0
    END AS capacity_pct,
    COALESCE(ba.revenue_cents, 0) AS revenue_cents
  FROM authorized_courts ac
  JOIN public.courts c    ON c.id = ac.id
  JOIN public.locations l ON l.id = c.location_id
  LEFT JOIN booking_agg ba ON ba.c_id = c.id
  ORDER BY l.name, c.name;
END;
$$;

-- ------------------------------------------------------------
-- Per-court monthly trend (last N months) — court-scoped, auth checked
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_court_utilization_trend(
  p_court_id uuid,
  p_months   int DEFAULT 6
)
RETURNS TABLE(
  month_start      date,
  possible_minutes integer,
  booked_minutes   integer,
  capacity_pct     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_email      text := auth.jwt() ->> 'email';
  v_is_admin   boolean;
  v_authorized boolean;
  v_tz         text;
  v_oh         jsonb;
  v_24         boolean;
  v_cur_month  date := date_trunc('month', now())::date;
  v_i          int;
  v_m          date;
  v_pm         integer;
  v_bm         integer;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  v_is_admin := (v_email = 'fsteinfelder@padel2go.eu')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin');

  IF v_is_admin THEN
    v_authorized := EXISTS (SELECT 1 FROM public.courts WHERE id = p_court_id);
  ELSE
    v_authorized :=
      EXISTS (
        SELECT 1 FROM public.club_court_assignments cca
        JOIN public.club_users cu ON cu.club_id = cca.club_id
        WHERE cca.court_id = p_court_id AND cu.user_id = v_uid AND cu.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM public.club_owner_assignments coa
        WHERE coa.court_id = p_court_id AND coa.user_id = v_uid
      );
  END IF;

  IF NOT v_authorized THEN RETURN; END IF;

  SELECT l.timezone, l.opening_hours_json, l.is_24_7
    INTO v_tz, v_oh, v_24
  FROM public.courts c
  JOIN public.locations l ON l.id = c.location_id
  WHERE c.id = p_court_id;

  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    v_m := (v_cur_month - (v_i || ' months')::interval)::date;
    v_pm := public.location_open_minutes(v_oh, v_24, v_m);

    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0)::int
      INTO v_bm
    FROM public.bookings b
    WHERE b.court_id = p_court_id
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time AT TIME ZONE v_tz) >= v_m::timestamp
      AND (b.start_time AT TIME ZONE v_tz) <  (v_m + interval '1 month')::timestamp;

    month_start      := v_m;
    possible_minutes := v_pm;
    booked_minutes   := v_bm;
    capacity_pct     := CASE WHEN v_pm > 0 THEN round(100.0 * v_bm / v_pm, 1) ELSE 0 END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- Network-wide monthly trend (admin only) — all online courts summed
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_network_utilization_trend(p_months int DEFAULT 6)
RETURNS TABLE(
  month_start      date,
  possible_minutes bigint,
  booked_minutes   bigint,
  capacity_pct     numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text := auth.jwt() ->> 'email';
  v_is_admin  boolean;
  v_cur_month date := date_trunc('month', now())::date;
  v_i         int;
  v_m         date;
  v_pm        bigint;
  v_bm        bigint;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  v_is_admin := (v_email = 'fsteinfelder@padel2go.eu')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin');

  IF NOT v_is_admin THEN RETURN; END IF;

  FOR v_i IN REVERSE (p_months - 1)..0 LOOP
    v_m := (v_cur_month - (v_i || ' months')::interval)::date;

    SELECT COALESCE(SUM(public.location_open_minutes(l.opening_hours_json, l.is_24_7, v_m)), 0)
      INTO v_pm
    FROM public.courts c
    JOIN public.locations l ON l.id = c.location_id
    WHERE l.is_online = true;

    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 60), 0)::bigint
      INTO v_bm
    FROM public.bookings b
    JOIN public.courts c ON c.id = b.court_id
    JOIN public.locations l ON l.id = c.location_id
    WHERE l.is_online = true
      AND b.status IN ('confirmed', 'completed')
      AND (b.start_time AT TIME ZONE l.timezone) >= v_m::timestamp
      AND (b.start_time AT TIME ZONE l.timezone) <  (v_m + interval '1 month')::timestamp;

    month_start      := v_m;
    possible_minutes := v_pm;
    booked_minutes   := v_bm;
    capacity_pct     := CASE WHEN v_pm > 0 THEN round(100.0 * v_bm / v_pm, 1) ELSE 0 END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- Grants (authorization is enforced inside each function)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.location_open_minutes(jsonb, boolean, date)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_court_utilization(date)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_court_utilization_trend(uuid, int)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_network_utilization_trend(int)               TO authenticated;
