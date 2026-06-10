# Security & Vulnerability Fix Plan (from 2026-06-10 audit)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical (C1–C8) and High security/money/integrity findings from `docs/superpowers/audits/2026-06-10-findings.md`, plus security-relevant Mediums (M8–M10, M18, M19, H10/M4 dedupe).

**Architecture:** One new SQL migration carries all DB changes (constraint, policies, RPCs, columns, cron function). Edge functions get in-code auth + server-side validation. Frontend gets the reset-password form, guest-booking RPC path, and the broken-link/crash fixes. No new test infra (project has none; CLAUDE.md minimal-change rules apply) — verification is `tsc --noEmit` + `vite build` + line-by-line diff review.

**Tech Stack:** Supabase Postgres + Deno edge functions, React 18 + TS, Stripe.

**Out of scope (this pass):** i18n gaps, dead-code deletion, mobile/cosmetic fixes, non-security Mediums/Lows.

**IMPORTANT for Florian:** the new migration `supabase/migrations/20260610120000_audit_security_fixes.sql` must be run in the Supabase SQL editor before the edge-function changes are deployed.

---

### Task 1: Migration `20260610120000_audit_security_fixes.sql` (C1, C3, H3, H17, H1, H2, C4-support)

- [ ] 1. **C1:** Cancel stale/overlapping `pending_payment` rows, then drop + recreate `no_overlapping_bookings` with `WHERE (status IN ('pending_payment','confirmed'))`.
- [ ] 2. **C3:** `DROP POLICY "anon_select_guest_booking"`; create `get_guest_booking(p_booking_id uuid)` SECURITY DEFINER returning only the fields `useBookingCheckout.fetchBooking` selects (id, times, status, price_cents, currency, hold_expires_at, guest_name, guest_email, location name/slug/address, court name) for `user_id IS NULL` rows; GRANT EXECUTE to anon+authenticated.
- [ ] 3. **H3:** Replace authenticated-only newsletter INSERT policy with one for `anon, authenticated`.
- [ ] 4. **H17:** Insert `user_roles(user_id,'admin')` for `fsteinfelder@padel2go.eu` via `SELECT id FROM auth.users WHERE email=...` + `WHERE NOT EXISTS` guard.
- [ ] 5. **H1:** `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reserved_credits int NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS reserved_voucher_id uuid;` plus RPCs `reserve_play_credits(p_user_id,p_amount) → boolean` (conditional decrement `WHERE play_credits >= p_amount`) and `refund_play_credits(p_user_id,p_amount)`. **REVOKE EXECUTE from PUBLIC/anon/authenticated** (service-role only).
- [ ] 6. **C4-support:** RPC `increment_wallet_credits(p_user_id, p_reward_delta, p_lifetime_delta)` — atomic `UPDATE wallets SET reward_credits=GREATEST(0,reward_credits+δ), lifetime_credits=GREATEST(0,lifetime_credits+δ)`. REVOKE from clients.
- [ ] 7. **H2 + H1:** Rewrite `cleanup_expired_bookings()`: for each expired `pending_payment` booking — refund `reserved_credits` to the wallet, decrement `voucher_codes.current_uses` for `reserved_voucher_id`, zero both columns, set `cancelled`.

### Task 2: `create-checkout-session` + `stripe-webhook` (C2, H1, H2)

- [ ] **C2:** `create-checkout-session/index.ts:214` — use the server-recomputed `priceCents` always; log a warning when `booking.price_cents` differs and persist the corrected price to the booking row.
- [ ] **H1:** After computing `appliedCredits`, call `reserve_play_credits` RPC (reject checkout when false: "Nicht genug Credits"); store `reserved_credits: appliedCredits` and `reserved_voucher_id: appliedVoucherId` on the booking. If the post-credit total would fall below Stripe's 50-cent minimum, reduce `appliedCredits` so the discount equals what's actually granted (fixes the Low credit-loss edge too).
- [ ] **H1 (webhook):** `stripe-webhook` no longer re-deducts credits on `checkout.session.completed` (they're already reserved) — clear `reserved_credits`/`reserved_voucher_id` on confirm, keep `play_credits_awarded` logic. On `checkout.session.expired`: refund `reserved_credits` via `refund_play_credits` and keep the existing voucher release, then zero the columns.

### Task 3: Rewards cluster (C4, H6, H10/M4)

- [ ] **C4:** `rewards-claim` — replace `update({reward_credits: newBalance})` with `increment_wallet_credits(user_id, +points, +points)`; stop using ledger-sum as absolute wallet truth.
- [ ] **C4/M3:** `marketplace-redeem` — insert a `points_ledger` row (negative delta, REDEMPTION source) alongside the wallet deduction; `friends-api` — ledger row for the +50 friend bonus.
- [ ] **H6:** `rewards-trigger` — drop the admin-JWT path; service-role bearer only.
- [ ] **H10:** `rewards-api` `daily_login` — claim via the `daily_claims` table (insert with unique constraint as the dedupe lock; skip award when today's row exists), so the p2g `claim-daily` path can't double-pay. **M4:** compute the claim date in `Europe/Berlin` in both `rewards-api` and `p2g-points-api` (claim-daily + status), and fix the streak loop double-count (seed 1, start loop at j=1).

### Task 4: p2g / referral / friends / lobby / camera / translate (C5, C6, H4, H7, H8, H9, H11, H14-backend, M19)

- [ ] **C5:** `p2g-points-api` `/skill-credit` — require admin (`user_roles` check); 403 otherwise.
- [ ] **C6:** `referral-api` `/attribution` — require Authorization, `referredUserId = auth user id` (ignore body value).
- [ ] **H4:** `translate-content` — add JWT + admin-role check (same pattern as `generate-article`); add `[functions.translate-content] verify_jwt = true` and `[functions.create-guest-booking] verify_jwt = false` stanzas to `supabase/config.toml` (M19).
- [ ] **H7:** `camera-webhook` — in `join-session`, `match-complete`, `session-status`: resolve session → court → `location_id` and 403 when it differs from the API key's location. Fix `cta_url` `/app/p2g-points` → `/dashboard/p2g-points` (H14).
- [ ] **H8:** `friends-api` `/request` — when an existing row is `declined`/`cancelled`, UPDATE it back to `pending` with the new requester instead of INSERT. Fix notification link `/friends?tab=requests` → `/dashboard/friends` (H14).
- [ ] **H9/H11:** `lobby-api` — `respond_invite`: re-check lobby `status==='open'` + free capacity before inserting the member (409 otherwise). `join_lobby`: after insert, recount active members; if over capacity delete the just-inserted row and 409. Add `get_lobby`+`list_lobbies` to `authActions`; for private lobbies return details only to host/members/invitees.
- [ ] **H18:** `public-profile-api` — allow the `profile` action without a user JWT (public fields only); keep auth for everything else.

### Task 5: club-booking-api (C7, H20, M10)

- [ ] **C7:** Parse/validate `startTime`/`endTime` (valid ISO, `start < end`, start ≥ now−5min, start ≤ now+60d); **recompute** `duration = (end−start)/60000` server-side, require integer 30–240; ignore the body's `duration` everywhere (quota check, ledger, allocation_minutes).
- [ ] **H20:** Evaluate `allowed_booking_windows` in `Europe/Berlin` (convert via `toLocaleString` with timeZone before extracting weekday/minutes).
- [ ] **M10:** Only honor `memberUserId` when that user is a member of the same club (`club_users` lookup); otherwise store/notify nothing.

### Task 6: Auth page (C8, H16)

- [ ] **C8:** `Auth.tsx` — render a `mode === "reset"` form (new password + confirm, min 8 chars) calling `supabase.auth.updateUser({ password })`, success toast + redirect to login; suppress the `user`-based auto-redirect effect while `mode === "reset"`.
- [ ] **H16:** After login, navigate to `searchParams.get("redirect")` when it `startsWith("/") && !startsWith("//")`, else role-based redirect.

### Task 7: Booking/marketplace/dashboard frontend (C3-frontend, H13, H14, H12)

- [ ] **C3:** `useBookingCheckout.fetchBooking` — for the guest path (no `user`) call `supabase.rpc("get_guest_booking", { p_booking_id: bookingId })` instead of selecting `bookings`.
- [ ] **H13:** Convert `useAccountData` to React Query with `queryKey: ["account-data", userId]` so the existing `invalidateQueries({queryKey:["account-data"]})` works; also invalidate `marketplace-items` + `p2g-credit-breakdown` after redeem.
- [ ] **H14:** `DashboardRewards.tsx` — `/app/marketplace` → `/dashboard/marketplace` (2×); `rewards-claim/index.ts:145` `/app/rewards` → `/dashboard/rewards`.
- [ ] **H12:** `DashboardHome.tsx` — replace direct `friendships` table writes with `useFriendships().acceptRequest/declineRequest`.

### Task 8: Misc UI + admin (H15, H19, H21, H22, H23, H5, M18, C5-frontend)

- [ ] **H15:** `SkillLast5Section.tsx` + `useP2GPoints.ts` types — read `avg_skill_level` / `play_credits_earned` (match the API). **C5:** delete the now-dead `awardSkillCredits` mutation from `useP2GPoints.ts`.
- [ ] **H19:** `TouchpointCarousel.tsx` — clamp the slide index when `count` shrinks (`Math.min(current, count-1)` + reset effect).
- [ ] **H21:** `ClubCourtFeatures.tsx` — remove the Card-level `onClick` handlers (keep the Switch as the single toggle).
- [ ] **H22:** `src/i18n/index.ts` — remove `returnEmptyString: false`.
- [ ] **H23:** `EventDetail.tsx` — when the slug param is a UUID, look up by `id` as fallback.
- [ ] **H5:** `AdminIntegrations.tsx` + migration addendum — replace the read-back of raw secrets: SECURITY DEFINER RPC `get_integration_configs_masked()` (admin/superadmin-gated) that masks values of keys matching key/secret/token (`••••` + last 4); UI loads via RPC and skips masked (unchanged) fields on save; correct the "encrypted" copy.
- [ ] **M18:** `CameraApiKeysTab.tsx` + `AdminVouchers.tsx` — generate keys/codes with `crypto.getRandomValues()`.

### Task 9: Verify & ship

- [ ] `npx tsc --noEmit -p tsconfig.app.json` and `npm run build` pass.
- [ ] Review full `git diff` against this plan.
- [ ] Commit in logical chunks; push to `origin` and `padel2go` per CLAUDE.md.
- [ ] Remind Florian: run the new migration in the Supabase SQL editor, then redeploy all changed edge functions.
