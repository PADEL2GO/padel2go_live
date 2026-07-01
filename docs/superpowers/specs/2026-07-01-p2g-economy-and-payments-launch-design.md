# PADEL2GO — P2G Economy + Payments Launch — Design Spec (2026-07-01)

## Context & goal

PADEL2GO is pre-launch. This epic makes the platform's payment + points economy
launch-ready in four connected parts:

1. **P2G points become a unified discount currency** — a user's `reward` + `play`
   credits redeem, at one admin-set value, as a **direct discount** on the price they
   pay, in both the booking flow and the marketplace, up to **100%** of the price.
2. **The marketplace becomes a real money store** — items (rackets, etc.) have a €
   price, are bought via **Stripe (card + PayPal)**, with P2G points discounting the
   price up to 100%. It becomes viewable to all users via its own feature flag.
3. **Superadmin P2G controls** — set any user's reward/play/lifetime points to an exact
   value, and edit the point exchange rate, from the P2G admin section.
4. **Stripe/PayPal go-live** — close the code blockers and provide a go-live checklist.

**Non-negotiable requirement:** point balances and discount math are **server-side and
hack-proof**. No client can mint or self-adjust points; the client can only *request* a
discount amount, which the server independently caps against the user's real balance.

## Confirmed decisions

| Decision | Choice |
|---|---|
| Point value | **Unified** single value for reward + play (cents-per-point). Spend **play first, then reward**. |
| Max discount | Configurable cap; **allow up to 100%** (fully points-covered → skip Stripe). |
| Marketplace visibility | Its **own flag** (`feature_marketplace_enabled`), independent of the master app-launch switch. |
| Marketplace charging | **Money store** (€ price) + points discount up to 100%, via Stripe/PayPal. |
| Payment methods | **Stripe card + PayPal** in both booking and marketplace flows. |
| Production domains | `www.padel2go-official.com`, `www.padel2go-official.de` (+ `.de` apex redirect). Already in `create-checkout-session` allowlist. |

## Existing infrastructure this builds on

- **Points value setting** lives in `site_settings` (row `id='global'`): `credits_per_euro`
  (default 100 → 1 cent/point), `credits_payment_max_percent` (default 50),
  `feature_credits_payment_enabled`. Editable in `AdminFeatures.tsx`. Server
  (`create-checkout-session`) honors `credits_per_euro`; the **frontend hardcodes 100**
  (`BookingCheckout.tsx` / `useBookingCheckout.ts`) — a bug to fix.
- **Booking discount today** uses `play_credits` **only**, via the atomic, service-role
  `reserve_play_credits` RPC; reserved on the booking (`reserved_credits`), settled/refunded
  by `stripe-webhook`/cron via `settle_booking_reserves` / `release_booking_reserves`.
- **Wallet integrity:** `wallets` is the source of truth, `points_ledger` the audit trail.
  RLS gives users **no write** access; all credit RPCs are `REVOKE`d from `authenticated`
  and `GRANT`ed to `service_role` only. Atomic RPCs exist: `increment_wallet_credits`
  (reward+lifetime), `increment_play_and_lifetime` (play+lifetime).
- **Admin points:** `P2GWalletsTab.tsx` shows reward/play/lifetime + a **relative**
  add/subtract dialog → `admin-credits` `adjust_credits`. No "set to X", no lifetime editor;
  it uses non-atomic writes and its role check **ignores the `fsteinfelder@padel2go.eu`
  email superadmin bypass** (client-only bypass in `useAdminAuth`).
- **Marketplace today:** points-only redemption. `marketplace_items` (RLS: public read of
  `is_active=true`; admin-manage). `marketplace-redeem` deducts play-then-reward.
  `/dashboard/marketplace` is gated by `RequireAppLaunched` (master flag); the nav link by
  `feature_marketplace_enabled`.
- **Stripe:** keys from `Deno.env` → `site_integration_configs` fallback. `stripe-webhook`
  verifies signatures and handles `checkout.session.completed/expired`, `charge.refunded`,
  `payment_intent.payment_failed`. The AdminIntegrations "mode" dropdown and `publishable_key`
  are non-functional (Stripe-hosted checkout; live vs test = the key string).

---

## Part 1 — Points foundation + admin controls

### Data / RPC (new migration)
- **`reserve_points(p_user_id uuid, p_amount int)`** — SECURITY DEFINER, service-role only.
  Atomically spends `play_credits` first then `reward_credits` (never below 0), returns
  `(play_spent int, reward_spent int)`. Returns `(0,0)` if balance insufficient for a
  full requested `p_amount` — caller passes only the server-capped amount so it always fits.
- **`refund_points(p_user_id, p_play, p_reward)`** — adds back on cancel/expiry (uses the
  atomic increment RPCs; never touches `lifetime_credits`).
- **`set_wallet_credits(p_user_id, p_credit_type text, p_value int, p_lifetime int|null)`** —
  SECURITY DEFINER, service-role only. Reads current, writes the exact target atomically,
  inserts a `points_ledger` audit row (`entry_type='ADMIN_SET'`, `balance_after=p_value`),
  returns the delta. Explicit `lifetime` handling (editable, not auto-derived).
- Bookings/orders gain `reserved_reward int NOT NULL DEFAULT 0` (booking already has
  `reserved_credits` → treated as `reserved_play`).
- Raise the effective cap: `credits_payment_max_percent` stays configurable; default/allow
  **100**.

### Admin (superadmin)
- **`admin-credits`** gains a `set_credits` action (reward/play/lifetime → exact value) using
  `set_wallet_credits` + `admin_activity_log` + user notification, mirroring `adjust_credits`.
- **Fix the server auth gate** in `admin-credits` (and any admin-only function touched) to
  also accept the `auth.jwt()->>'email' = 'fsteinfelder@padel2go.eu'` superadmin bypass, so
  the email-only superadmin is authorized server-side (matching the client gate).
- **`P2GWalletsTab.tsx`**: add a "Set to exact value" mode + a lifetime field to the dialog.
- **Exchange-rate control in the P2G admin section** (`AdminP2GPoints` — add a small settings
  card reading/writing `credits_per_euro` + `credits_payment_max_percent` + the
  enable toggle in `site_settings`), so the rate is editable "there" as requested. (Keep the
  existing `AdminFeatures` controls in sync — same columns.)

## Part 2 — Booking flow (points discount up to 100%)

- **`create-checkout-session`**: replace the play-only credits block with a unified points
  discount — server computes `centsPerPoint = 100/credits_per_euro`, caps the requested
  points to `min(available play+reward, maxPercent% of price)`, calls `reserve_points`,
  and persists `reserved_credits` (play) + `reserved_reward` on the booking.
  - If the discount covers the **full** price → **skip Stripe**, confirm the booking directly
    (reuse the existing free-booking/`voucher-redeem` free path), settle the reserved points.
  - Else create the Stripe session (card+PayPal) for the remainder (respecting the 50c min).
- **`stripe-webhook` / cron**: settle both `reserved_credits` + `reserved_reward` on
  confirm; refund both via `refund_points` on expiry/cancel. Extend
  `settle_booking_reserves` / `release_booking_reserves` to cover `reserved_reward`.
- **Frontend** (`useBookingCheckout.ts`, `BookingCheckout.tsx`): read `credits_per_euro`
  from settings (stop hardcoding 100); slider max + € discount computed at the real rate;
  show **combined** available points (play+reward); support the "fully free" state.

## Part 3 — Marketplace as a money store

- **Schema (migration):** add `price_cents int` to `marketplace_items` (the € price). Points
  discount `price_cents` up to `maxPercent%` (same unified currency/value as bookings).
  `credit_cost` is kept only for existing-row back-compat and is NOT used by the new
  money+points flow (items are priced by `price_cents`, discounted by points like bookings).
- **`marketplace-checkout` edge function** (new, mirrors bookings): validates item + stock +
  shipping (for `purchase` type), computes the points discount server-side, `reserve_points`,
  then — if fully covered → place the order immediately (deduct/settle points, decrement
  stock, create the order row, email fulfillment); else create a Stripe session (card+PayPal)
  for the remainder with `metadata.type='marketplace_purchase'`.
- **`stripe-webhook`**: add a `marketplace_purchase` branch on `checkout.session.completed`
  (finalize points, decrement stock atomically, create the order + `points_ledger` row, email
  fulfillment) and release points on `expired`. Reuse the existing atomic stock-decrement +
  rollback pattern from `marketplace-redeem`.
- **Retire/redirect** the points-only `marketplace-redeem` to `marketplace-checkout` (the
  store is money+points; no points-only redemption path remains).
- **Admin** (`AdminMarketplace.tsx`): add a `price_cents` field; keep the `is_active` toggle.
- **Visibility:** change `/dashboard/marketplace` route gating from `RequireAppLaunched`
  (master flag) to a marketplace-specific guard on `feature_marketplace_enabled` (admins
  always pass) so the store can be turned on for everyone independently. Admin-added items are
  already instantly public (active + public read). Run the pending feature-flag migrations.

## Part 4 — Stripe/PayPal go-live

- **Code blockers:** ensure `create-guest-booking` and the new `marketplace-checkout` include
  the production domains in `allowedOrigins` (`create-checkout-session` already does). Keep
  **PayPal** in the `payment_method_types` for both flows.
- **Go-live checklist (owner actions):**
  1. Set `STRIPE_SECRET_KEY` = `sk_live_…` (Supabase edge secret, or AdminIntegrations).
  2. Register the live webhook → `stripe-webhook` URL, events: `checkout.session.completed`,
     `checkout.session.expired`, `charge.refunded`, `payment_intent.payment_failed`; put its
     `whsec_…` in `STRIPE_WEBHOOK_SECRET`.
  3. Run the `site_integration_configs` migrations (`20260411000002` + policy `20260413130000`)
     if using the DB-config/AdminIntegrations path.
  4. **Enable PayPal** on the live Stripe account (since both flows offer it).
  5. Live end-to-end test: a paid booking + a paid marketplace purchase → webhook `completed`,
     `payments`/order updated, points settled, emails sent; then a refund.
  6. Ignore the AdminIntegrations "mode" dropdown / `publishable_key` — not wired; live vs test
     is the key string.

## Hack-proofing (cross-cutting)

- The discount is **always** computed server-side: `centsPerPoint` from the admin-set
  `credits_per_euro`, capped by `maxPercent%` of the server-recomputed price and by the user's
  **real** balance via `reserve_points` (which cannot overdraw). A client that inflates
  `points_to_use` is clamped; it can never reduce the charge below the true entitlement.
- No new user-writable RLS. All point mutations go through `service_role`-only SECURITY
  DEFINER RPCs. Admin set-points is superadmin-gated (email bypass + `user_roles`) and always
  writes a `points_ledger` + `admin_activity_log` audit row.
- Marketplace stock + order finalization use the existing atomic decrement + rollback pattern.

## Out of scope (this epic)

- The deferred `cancel-with-refund` redesign, play-credit-award-timing, and the P1b play_credits
  ledger (tracked separately). Marketplace *shipping/logistics* beyond the fulfillment email.
  Non-Stripe payment providers. Admin i18n.

## Verification

- `npx tsc --noEmit` + `npm run build` green after each part.
- **Points hack-proofing test:** call `create-checkout-session` / `marketplace-checkout` with an
  inflated `points_to_use` and assert the server caps to `min(balance, maxPercent%)`; assert a
  non-admin cannot call the credit RPCs or write `wallets`/`points_ledger` (RLS/GRANT).
- **Booking:** partial-points + card; fully-points-covered (free path); cancel refunds both
  reserved play + reward. Frontend € display matches at a non-100 `credits_per_euro`.
- **Marketplace:** money purchase with card+PayPal; points discount; fully-points-covered order;
  stock decrement + rollback on race; order email.
- **Admin:** superadmin (email-only) sets a user's reward/play/lifetime to an exact value → wallet
  + ledger + activity log consistent; exchange-rate edit in the P2G section changes the discount.
- **Stripe go-live:** live test booking + purchase per the checklist; refund path.
- **Adversarial review** (as with P1/cancel-booking) of every new money/points path before deploy.
