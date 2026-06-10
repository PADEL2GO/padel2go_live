# PADEL2GO Full Site Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Systematically check every page, every backend connector (Supabase queries, RPCs, edge function calls), every visual, and find bugs: broken connectors, logic errors, unused visuals/components, mobile/i18n issues.

**Architecture:** Read-only audit. Each task audits one functional area, cross-referencing frontend calls against `src/integrations/supabase/types.ts`, `supabase/migrations/*.sql`, and `supabase/functions/*/index.ts`. Findings are written to `docs/superpowers/audits/2026-06-10-findings.md` with severity (Critical / High / Medium / Low) and exact `file:line` references. A final verification pass re-checks every finding before reporting.

**Tech Stack:** React 18 + TS + Vite, React Router v7, TanStack Query, Supabase (Postgres + Auth + Deno edge functions), Stripe, Resend, i18next (de/en), Tailwind + shadcn/ui.

**Project root:** `/Users/floriansteinfelder/Desktop/padel2go_live/padel2go-edit-main`

---

## Standard checks (apply in every page-area task)

For each page, check:

1. **Backend connectors** — every `supabase.from("...")`, `supabase.rpc("...")`, `supabase.functions.invoke("...")`, and raw `fetch` to `/functions/v1/...`:
   - Does the table/column/RPC/function actually exist in `src/integrations/supabase/types.ts` or `supabase/migrations/`?
   - Does the invoked edge function exist in `supabase/functions/<name>/index.ts`?
   - Does the payload shape match what the edge function reads from `req.json()`?
   - Is the error path handled (no silently swallowed errors, no infinite spinners on failure)?
   - React Query: correct `queryKey` (collisions/mismatches with `src/lib/queryKeys.ts`), `enabled` guards for params that may be undefined, invalidation after mutations.
2. **Logic bugs** — wrong conditions, timezone/date math (`date-fns`), currency math (cents vs euros), feature-flag checks inconsistent with `useFeatureToggles`, guards bypassed.
3. **Visual bugs** — layouts that break at 320–375px (3+ col grids without `sm:`, fixed widths, overflowing flex rows), unreadable contrast (light text on light bg), broken/missing image imports, z-index conflicts with nav/drawers.
4. **i18n** — hardcoded German/English strings in components that otherwise use `t(...)`; keys used but missing in `src/locales/de/*.json` or `src/locales/en/*.json`.
5. **Dead UI** — buttons/links with no handler or `href="#"`, rendered sections fed only by `src/lib/mockData.ts` where real data exists.

**Finding format (append to `docs/superpowers/audits/2026-06-10-findings.md`):**

```markdown
### [SEVERITY] Short title
- **Where:** src/pages/Foo.tsx:123
- **What:** One-paragraph description of the bug.
- **Evidence:** The exact code line(s) and the contradicting fact (e.g. "table `xyz` not in types.ts; no migration creates it").
- **Suggested fix:** One sentence.
```

---

### Task 1: Unused assets & dead components audit

**Files:**
- Read: all of `src/assets/` (42 files), `src/components/**`, `src/hooks/*`, `src/lib/*`
- Output: append to `docs/superpowers/audits/2026-06-10-findings.md`

- [ ] **Step 1:** For every file in `src/assets/`, grep its basename across `src/` and `index.html`. List assets with zero imports as findings (Low severity, "unused visual").
- [ ] **Step 2:** For every component in `src/components/` (top level + subfolders, excluding `ui/`), grep its export name across `src/`. List components never imported anywhere as findings.
- [ ] **Step 3:** Same for every hook in `src/hooks/` and every module in `src/lib/` (especially `mockData.ts` — list which pages still render mock data).
- [ ] **Step 4:** For `src/components/ui/`, only flag clearly app-specific dead files (e.g. `faulty-terminal.tsx`, `galaxy-hero.tsx`, `synthetic-hero.tsx`, `skew-level-cards.tsx`, `tubelight-navbar.tsx`, `background-paths.tsx`, `infinite-slider.tsx`, `logo-cloud.tsx`, `progressive-blur.tsx`) if unimported.
- [ ] **Step 5:** Check `public/` for orphaned files referenced nowhere in `index.html`, `src/`, or `SeoHead.tsx`.

### Task 2: Public marketing pages

**Files:**
- Read: `src/pages/Index.tsx`, `FuerSpieler.tsx`, `FuerVereine.tsx`, `FuerPartner.tsx`, `AppBooking.tsx`, `Rewards.tsx`, `League.tsx`, `UeberUns.tsx`, `FaqKontakt.tsx`, `Impressum.tsx`, `AGB.tsx`, `Datenschutz.tsx`, `Play.tsx`, `QrLanding.tsx`, `NotFound.tsx`
- Read supporting: `src/components/HeroSection.tsx`, `FeaturesSection.tsx`, `CommunitySection.tsx`, `ForClubsSection.tsx`, `ForPlayersSection.tsx`, `LocationTeasersSection.tsx`, `SectionDivider.tsx`, `SiteVisual.tsx`, `WhatsAppBusiness.tsx`, `components/partner/*`, `components/rewards/*`, `hooks/useSiteVisuals.ts`, `useLocationTeasers.ts`, `usePartnerTiles.ts`, `usePartnerTouchpoints.ts`, `useQrSections.ts`, `useSkyPadelGallery.ts`, `usePinAccess.ts`, edge functions `validate-pin`, `send-contact-email`
- Apply: Standard checks 1–5.

- [ ] **Step 1:** Audit Index + shared sections (hero, features, community, teasers, footer, navigation).
- [ ] **Step 2:** Audit FuerSpieler / FuerVereine / FuerPartner incl. partner components and `usePartnerTiles`/`usePartnerTouchpoints` connectors and PIN gate (`PinGate.tsx` + `validate-pin` function).
- [ ] **Step 3:** Audit AppBooking, Rewards, League, Play, QrLanding (`useQrSections` ↔ `qr_sections` table from `20260605160000_qr_sections.sql`).
- [ ] **Step 4:** Audit UeberUns, FaqKontakt (contact form ↔ `send-contact-email` payload match), legal pages (AGB, Datenschutz, Impressum), NotFound.

### Task 3: Events & News

**Files:**
- Read: `src/pages/Events.tsx`, `EventDetail.tsx`, `src/components/events/*`, `src/components/news/*`, `src/hooks/useArticles.ts`, `useAdminArticles.ts`, edge function `generate-article`, `translate-content`, migrations `20260519140000_create_articles_table.sql`, `20260522120000_add_article_source_url.sql`
- Apply: Standard checks 1–5.

- [ ] **Step 1:** Audit Events list + filters + NewsletterCTA (does the newsletter form actually submit anywhere?).
- [ ] **Step 2:** Audit EventDetail slug lookup (what happens for unknown slug — 404 or crash?).
- [ ] **Step 3:** Audit article feed/cards ↔ `articles` table columns; check `localized.ts` usage for de/en fields.

### Task 4: Auth, Account & Public Profile

**Files:**
- Read: `src/pages/Auth.tsx`, `Account.tsx`, `PublicProfile.tsx`, `src/hooks/useAuth.tsx`, `useAccountData.ts`, `src/components/account/*`, `src/components/profile/ProfileLink.tsx`, edge functions `public-profile-api`, `user-search`, migration `20260415130000_fix_avatar_storage_policies.sql`, `20260415140000_create_avatars_bucket.sql`
- Apply: Standard checks 1–5.

- [ ] **Step 1:** Audit Auth page: redirect param handling, signup/login error paths, password reset flow.
- [ ] **Step 2:** Audit Account: profile form ↔ `profiles` columns, avatar upload ↔ `avatars` bucket, skill level + performance cards.
- [ ] **Step 3:** Audit PublicProfile ↔ `public-profile-api` response shape.

### Task 5: Booking flow (highest risk — money involved)

**Files:**
- Read: `src/pages/Booking.tsx`, `BookingLocation.tsx`, `BookingCheckout.tsx`, `BookingSuccess.tsx`, `BookingCancel.tsx`, `src/components/booking/*`, `src/hooks/useBookingCheckout.ts`, `useBookingLocation.ts`, `useBookingSlots.ts`, `useCourtPrices.ts`, `useCourtsVisibility.ts`, `useClubQuota.ts`, `useWeeklyBookingStreak.ts`, `src/lib/pricing.ts`, `bookingCredits.ts`, edge functions `create-checkout-session`, `create-guest-booking`, `stripe-webhook`, `send-booking-confirmation`, `process-completed-bookings`, `voucher-validate`, `voucher-redeem`, migrations `20260412180000_booking_play_credits.sql`, `20260412190000_credits_payment.sql`, `20260412200000_guest_bookings.sql`, `20260415120000_auto_cancel_unpaid_bookings.sql`, `20260413140000_voucher_codes_add_discount_columns.sql`
- Apply: Standard checks 1–5, plus:

- [ ] **Step 1:** Trace slot availability: `useBookingSlots` query vs. bookings table — double-booking window? Timezone of slot generation vs. DB timestamps?
- [ ] **Step 2:** Trace price end-to-end: `pricing.ts` → checkout payload → `create-checkout-session` — is the amount recomputed server-side or trusted from client (Critical if client-trusted)?
- [ ] **Step 3:** Voucher math: discount applied in cents vs euros; can a voucher exceed total (negative price)? Reuse prevention in `voucher-redeem`?
- [ ] **Step 4:** Guest checkout: `GuestCheckoutModal` payload ↔ `create-guest-booking`; email confirmation trigger.
- [ ] **Step 5:** `stripe-webhook`: signature verification present? Idempotency (duplicate webhook events)? Booking status transitions match what `BookingSuccess.tsx` polls for?
- [ ] **Step 6:** Credits flow: `bookingCredits.ts` ↔ `admin-credits` function ↔ migrations — can credits go negative / be double-spent?

### Task 6: Dashboard pages (logged-in)

**Files:**
- Read: `src/pages/dashboard/*` (9 files), `src/components/dashboard/*`, `src/components/p2g/*`, `src/components/rewards/*`, `src/components/friends/*`, `src/components/lobby/*`, `src/components/chat/CreateGroupDialog.tsx`, `src/components/marketplace/*`, `src/components/notifications/*`, hooks `useDashboardSummary.ts`, `useP2GPoints.ts`, `useRewards.ts`, `useUserRedemptions.ts`, `useMarketplaceItems.ts`, `useMarketplaceRedeem.ts`, `useFriendships.ts`, `useChat.ts`, `useLobbies.ts`, `useNotifications.ts`, `useRealtimeNotifications.ts`, `useLevelUpDetection.ts`, `src/lib/expertLevels.ts`, edge functions `p2g-points-api`, `rewards-api`, `rewards-claim`, `rewards-estimate`, `rewards-trigger`, `marketplace-redeem`, `friends-api`, `lobby-api`, `referral-api`, `user-search`, `admin-notifications-api`, `cleanup-expired-notifications`, chat/lobby migrations (`20260524010000_chat_messages.sql`, `20260527000000_chat_groups.sql`, `20260527010000_prevent_group_creator_leave.sql`, `20260527020000_lobby_invites.sql`, `20260601000004_chat_lobby_invites.sql`)
- Apply: Standard checks 1–5, plus:

- [ ] **Step 1:** DashboardHome + DashboardBooking (summary metrics ↔ real tables).
- [ ] **Step 2:** P2G points: claim/streak/level-up logic, double-claim protection in `p2g-points-api`, `useLevelUpDetection` race conditions.
- [ ] **Step 3:** Rewards + Marketplace: redemption flow ↔ `marketplace-redeem` (stock decrement, points deduction atomicity), `ShippingAddressForm` payload match.
- [ ] **Step 4:** Friends + Chat: `friends-api` request/accept/decline states, realtime subscriptions cleanup (memory leaks on unmount), group creation, `prevent_group_creator_leave` consistency with UI.
- [ ] **Step 5:** Lobbies (`/lobbies`, `/lobbies/:id` both render `Lobbies.tsx` — does the `:id` deep link actually open the detail drawer?), invite flow ↔ `send-invite-notification` (NOTE: CLAUDE.md mentions this function but it does NOT exist in `supabase/functions/` — verify and flag).
- [ ] **Step 6:** DashboardLeague + DashboardEvents (mock vs real data; feature flag gating).

### Task 7: Club portal

**Files:**
- Read: `src/pages/club/*` (4 files), `src/components/club/*`, hooks `useClubAuth.ts`, `useClubOwnerAuth.ts`, `useClubQuota.ts`, `useCourtsVisibility.ts`, `src/lib/courtFeatures.ts`, edge functions `club-booking-api`, `club-court-update`, migration `20260601000001_add_courts_public_toggle.sql`
- Apply: Standard checks 1–5, plus:

- [ ] **Step 1:** ClubLayout gating: can a non-club user reach club pages by direct URL? Is the check server-side (RLS / edge function) or client-only?
- [ ] **Step 2:** ClubBookings/ClubCalendar ↔ `club-booking-api`: does it verify the caller owns that club, or trust a club_id from the client (Critical if trusted)?
- [ ] **Step 3:** ClubCourtFeatures ↔ `club-court-update` payload + auth.

### Task 8: Admin panel (22 pages)

**Files:**
- Read: `src/pages/admin/*` (22 files), `src/components/admin/**`, hooks `useAdminAuth.ts`, `useAdminArticles.ts`, `useAdminMarketplace.ts`, `useSiteSettings.ts`, `useSiteVisuals.ts`, `useTranslateContent.ts`, edge functions `integrations-admin-api` (NOTE: referenced in CLAUDE.md — verify it exists; it is NOT in `supabase/functions/`), `admin-credits`, `admin-notifications-api`, `generate-article`, `translate-content`, `camera-webhook`, migrations `20260411000002_add_integration_configs.sql`, `20260413130000_integration_configs_admin_policy.sql`, `20260413000000_fix_admin_rls_policies.sql`, `20260414100000_site_visuals_superadmin_policy.sql`
- Apply: Standard checks 1–5, plus:

- [ ] **Step 1:** AdminOverview, AdminBookings (BookingDetailDrawer, BookingWeekCalendar), AdminCourts (court/location CRUD ↔ `useLocationMutations`).
- [ ] **Step 2:** AdminUsers, AdminClubOwners, AdminClubs — role assignment writes ↔ `user_roles` table + RLS.
- [ ] **Step 3:** AdminMarketplace, AdminVouchers, AdminP2GPoints (all p2g admin tabs) — credit/point mutations server-validated?
- [ ] **Step 4:** AdminIntegrations — are API keys (Stripe/Resend/Anthropic) ever sent back to the browser in cleartext after save (High if yes)? Check `site_integration_configs` RLS.
- [ ] **Step 5:** AdminNews (ArticleEditor, VoiceInArticle ↔ `generate-article` + `translate-content`), AdminVisuals/AdminSkyPadelGallery/AdminLocationTeasers/AdminPartnerTiles/AdminTouchpointSlides/AdminQrPanel (image upload paths, orphaned `site_visuals` rows per cleanup migrations), AdminFeatures, AdminSettings, AdminNotifications, AdminAnalytics, AdminEvents (incl. cameras components — is the camera feature wired to anything live? `camera-webhook` auth?).
- [ ] **Step 6:** AdminSidebar: every link points to an existing route; every admin route appears in the sidebar.

### Task 9: Edge functions cross-cutting

**Files:**
- Read: all 28 `supabase/functions/*/index.ts`, `src/lib/edgeFunctionUtils.ts`, `supabase/config.toml`
- Apply:

- [ ] **Step 1:** For each function: CORS headers present on ALL response paths (incl. errors + OPTIONS)? Auth: does it verify the JWT / use service role appropriately, or is it callable unauthenticated when it shouldn't be?
- [ ] **Step 2:** Env pattern: `Deno.env.get` → `site_integration_configs` fallback used consistently (per project convention)?
- [ ] **Step 3:** Input validation at boundaries (per CLAUDE.md security rule); no secrets logged; no service-role key leaked in responses.
- [ ] **Step 4:** Cross-reference: every function invoked from `src/` exists; every deployed function is invoked from somewhere (or flag as dead).
- [ ] **Step 5:** `supabase/config.toml` `verify_jwt` settings per function match the function's own auth assumptions.

### Task 10: Routing, guards & feature flags

**Files:**
- Read: `src/App.tsx`, `RequireAuth.tsx`, `RequireAppLaunched.tsx`, `Navigation.tsx`, `DashboardNavigation.tsx`, `Footer.tsx`, `useFeatureToggles.ts`, `useAdminAuth.ts`, `ComingSoonOverlay.tsx`, `LockedContentOverlay.tsx`, migrations `20260411000001_add_app_launched_toggle.sql`, `20260411000003_add_page_feature_toggles.sql`
- Apply:

- [ ] **Step 1:** Every nav/footer link resolves to a defined route; no defined route is orphaned (unreachable from any nav — flag intentional ones like /qr).
- [ ] **Step 2:** Feature-flag consistency: every flag in `useFeatureToggles` is actually consulted by the route/nav that CLAUDE.md says it gates; flags that exist in DB but are never read (dead flags); pages reachable by URL even when their flag is off (flag-bypass).
- [ ] **Step 3:** `/lobbies` is inside RequireAuth but NOT RequireAppLaunched while `feature_lobbies_enabled` exists — verify intended behavior.
- [ ] **Step 4:** Hardcoded superadmin email `fsteinfelder@padel2go.eu` in `useAdminAuth` — verify it's also enforced server-side (RLS), not client-only.

### Task 11: i18n completeness

**Files:**
- Read: `src/i18n/index.ts`, `src/locales/de/*.json`, `src/locales/en/*.json`, `src/lib/localized.ts`, `LanguageSwitch.tsx`, `GeoLanguageBanner.tsx`
- Apply:

- [ ] **Step 1:** Diff key sets de vs en per namespace file; list keys present in one language but missing in the other.
- [ ] **Step 2:** Grep `t("` / `t('` usages; sample-check that referenced keys exist in both languages (focus on namespaces: booking, auth, common).
- [ ] **Step 3:** Check `localized.ts` fallback when `*_en` DB column is null (post `20260605120000_add_en_translation_columns.sql`).

### Task 12: Verify & consolidate findings

- [ ] **Step 1:** For every Critical/High finding, re-open the cited files and confirm the evidence line-by-line; downgrade or delete anything not reproducible from code.
- [ ] **Step 2:** Deduplicate findings reported by multiple tasks.
- [ ] **Step 3:** Sort final report by severity, then by area. Write summary table (counts per severity per area) at top of `docs/superpowers/audits/2026-06-10-findings.md`.
