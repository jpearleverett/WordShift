# WordShift launch checklist

> September 17 refresh: revised copy and nighttime promotional artwork are prepared on `feature/play-store-refresh`; fresh screenshots/trailer and publication remain pending. See [refresh status](../mobile/assets/Play_store/launch-2026-09-v2/README.md). Earlier owner-upload checkmarks below describe the September 7 campaign and do not certify the refresh.

Reviewed against main `6f96ebb` on 2026-09-13. [Current build](CURRENT_BUILD.md) is
the source of truth for merged behavior and configured versions; [build and
upload](BUILD_AND_UPLOAD.md) covers EAS archives and Android optimization. Checked
historical account/device items below retain their original dates. They do not
verify the latest binary, backend deployment or public release.

## Android release gates

- [x] **Production access granted.** The owner completed the 12-tester/14-day
  closed test and confirmed access on 2026-08-31.
- [ ] **Identify the exact release artifact.** Source configures app **1.4.5**,
  Android **110** (raised on 2026-09-22 for the production candidate, which
  carries new native configuration: the `android:appCategory="game"` manifest
  flag, the Sentry Android Gradle plugin and Metro debug IDs; codes 102-109
  were the owner's internal-testing builds of 1.3.x-1.4.4),
  with local version management and no automatic increment. Compare the next code with Play Console
  before uploading, and raise it again for each further upload: the internal-testing
  and production candidates are separate uploads and cannot share a code. Record commit, EAS build ID, version/code,
  runtime, track and device. `package.json`'s 1.3.1 is package metadata, not the native app version.
- [ ] **Run the release checks on that commit.** From `mobile/`: `npm ci`,
  `npm run typecheck`, `npm run lint -- --max-warnings 0`,
  `npm test -- --no-coverage`, `npm run test:e2e`, `npx expo install --check`
  and `npx expo-doctor`. Consult [current build](CURRENT_BUILD.md) for already
  recorded CI evidence; green JavaScript CI does not establish native release QA.
- [x] **Play Console declarations.** Data safety, content rating (IARC), target
  audience and the listing website field were all declared by the owner on
  2026-09-15. Guidance they were answered against is in
  [the launch readiness review](LAUNCH_READINESS_REVIEW_2026-09-14.md). RTDN to
  RevenueCat is an integration rather than a declaration and is still open below.
- [ ] **Build the optimized signed AAB and test through Play internal testing.**
  PARTIAL, 2026-09-15: the owner built the `expo-device` native binary (code 101)
  and confirmed it installs and runs. That clears "does a minified binary start",
  which was the open question expo-device raised. It does NOT clear the rest of
  this item, which is what actually gates promotion.
  Release minification/resource shrinking and the optimized ProGuard default are
  enabled in source. The template/config tests do not prove a minified Android
  binary starts or that reflection-dependent SDKs work. Recheck cold start,
  fonts/art/audio, notifications, sharing, RevenueCat, AdMob consent and ads.
  Record actual DEX size, download/install size and Play's 16 KB result for this
  artifact; do not interpret the EAS source upload as the player download size.
- [ ] **Owner device pass, 2026-09-22 (internal-testing build, 1.4.4).** The
  owner reported: the game works, purchases credit correctly, onboarding runs,
  cloud backup and restore after Reset All work, ads show, and notifications
  fire and route into the game; no major issues found. Still to run on the
  1.4.5 / 110 **production-profile** candidate (live ad units, new native
  config): cold start, one real amber-pack purchase credited exactly once
  (then force-stop, relaunch and Restore: no second credit), portrait lock on
  an Android 16 tablet or foldable if one is available, and one deliberate
  Sentry event arriving symbolicated under the `production` environment.
- [ ] **Repeat gameplay interruption checks on the signed build.** Try rapid
  Next/Home/Collect taps around mode unlocks; later animals' introduction visits
  and choices; every phase ceremony; Back, background and force-close during
  each. A saved ceremony replays after restart until completion or confirmed
  Skip; restart resumes the scene from its beginning, not its last page.
  Exercise the final house/arrival/New Cycle sequences on a test save too.
- [ ] **Repeat the purchasing matrix.** Cover every paid product kind, including
  Supporter; rapid/cross-product taps; Back/navigation during checkout; pending
  payment, cancellation, store errors and local-save retry; termination after
  payment; same-install history reconciliation; entitlement restore/expiry.
  Verify room/cosmetic ownership, automatic equipment and Amber spending together.
  Old spent consumables must not replay after reset, restore or reinstall.
  See [monetization setup](MONETIZATION_SETUP.md) for recovery limits.
- [ ] **Check reward claims under interruption.** Victory double, Store Daily
  Amber, a monthly Supporter stipend and tending purchases must apply once.
  A completed Store rewarded ad can finish saving after the UI closes; retrying
  a failed save must not require another ad or another paid checkout.
- [ ] **Fresh and returning-player device pass.** Fresh onboarding, offline cold
  start, saved unfinished puzzle, Daily challenge/rank, cloud restore/conflict,
  notification cold-start routing, challenge deep links and PNG sharing. Include
  a longer session on low/mid/high-end Android where available; record device,
  thermal/frame/memory observations rather than extrapolating from a July build.
- [ ] **Ad and consent matrix.** Keep `adsUseTestIds: true` through internal and
  closed testing: with the channel-derived flag that means running this matrix
  on an `internal-testing`-profile build (its channel keeps Google test units,
  so tapping ads is safe); the `production`-profile candidate serves live units,
  so on that build only confirm ads become available and never tap one, or
  register the test phones as AdMob test devices first. Verify UMP required/not-required/error paths and Settings →
  Privacy Options; an error alone never permits ad requests. Test interstitial,
  rewarded and Stats banner placements using a tester without restored ad-free
  entitlements, as well as paid-player suppression. Collect Now is ad-exempt.
- [x] **Hosted v2 migrations verified (2026-09-14).** A read-only probe with the
  shipped publishable key found `get_save_v2`, `upsert_save_v2`,
  `get_legacy_save_for_upgrade`, `ingest_events_v2`, `submit_daily_score_v2`,
  `daily_rank_v2`, `bump_words_offered` and `aggregate_proof` deployed, the
  operator RPCs (`support_preview`, `support_delete_verified`,
  `prune_expired_events`) denied to `anon`, the legacy save RPCs revoked and
  every table denied to `anon`. Commands and the result table are in
  [backend setup](BACKEND_SETUP.md#hosted-state-verified-2026-09-14). Do not
  re-run `security_setup.sql` alone: it would re-grant the legacy names.
- [x] **Apply `docs/supabase/rate_limits_v1.sql`** (request budgets, Daily
  plausibility floor and activity requirement, legacy daily RPC revocation,
  `purge_daily_cohort`). Rehearsed offline (`rehearse.mjs`, 78 checks) on
  2026-09-14; applied by the owner on 2026-09-15 through `apply_upgrade.sql`,
  who re-ran the probe and reported `submit_daily_score` and `daily_rank`
  answering `42501` and `bump_words_offered` still accepting the two-argument
  body. **Standing rule, now load-bearing: never re-run `security_setup.sql`.**
  It would recreate the two-argument `bump_words_offered` beside the
  three-argument one (ambiguous overload, PostgREST 300) and re-grant the legacy
  daily RPCs. One item remains below: a signed build must still post a Daily
  rank end to end.
- [x] **Event retention deployed and executing.** The
  `wordshift-event-retention` cron job was created by the owner on 2026-09-15
  (it is NOT created by `apply_upgrade.sql`: it needs Supabase Cron enabled plus
  `docs/supabase/schedule_event_retention.sql` run as postgres) and has
  completed a successful run. Keep the job/run row with the release record. Its
  oldest-row query is what proves the window actually prunes, and that only
  becomes meaningful once real event volume arrives, so re-check it after the
  first days of live traffic rather than treating it as closed forever.
- [ ] **Governing-law clause for the terms (owner).** The draft moved out of
  `docs/terms.md` on 2026-09-22, because its bracketed placeholders were
  visible in the live page source. Fill in your home jurisdiction and courts,
  add it to the terms as "## 10. Governing law", renumber "Changes" to 11,
  update the effective date and mention it in the release notes. Draft:

  > ", renumber
     "Changes" to 11, and mention the addition in the revision note above and
     in the app's release notes.

## 10. Governing law

These terms are governed by the laws of [GOVERNING JURISDICTION], without regard to its conflict-of-law rules. Any dispute arising from these terms or your use of the app that cannot be resolved informally will be brought in the courts of [VENUE], except where the consumer-protection law of the country in which you live gives you the right to bring a claim in your local courts or grants you protections that cannot be waived, in which case those rights and protections apply.
- [ ] **Remaining backend evidence.** From an operator connection: actual event
  rows from the signed build, a **Daily rank posted end to end by a signed
  build** (the one part of the rate-limit migration a key-only probe cannot
  prove), two-device conflict handling, verified support recovery/deletion, the
  project plan tier plus disk/usage alerts (the events table shares the disk
  with saves), Sentry alert rules and a symbolicated event from the exact signed
  release. Follow [backend setup](BACKEND_SETUP.md).
- [x] **Review the current store package.** Done by the owner on 2026-09-15.
  Use the reviewed launch package in
  `mobile/assets/Play_store/launch-2026-09/`, its claims ledger and
  [store listing](STORE_LISTING.md). Confirm the files actually uploaded are the
  current captures and show the shipped +25% Challenge reward, current counts
  and spoiler-safe UI. Earlier uploaded July/August images were stale; the
  presence of replacements in Git does not update Play Console.
- [x] **Upload the 512x512 Play listing icon BY HAND.** Uploaded by the owner on
  2026-09-15. `docs/store-icon-512.png`
  (Ember close-up in the green sweater holding a wooden W tile; a clean RGBA
  re-encode of `mobile/assets/Play_store/launch-2026-09/upload/store-icon-512.png`,
  512x512, fully opaque, no baked rounded corners and no baked drop shadow, since
  Play applies its own rounding and shadow). This asset does NOT come from the
  build and no CI step touches it: Play Console -> Main store listing -> Graphics
  -> App icon. The in-app launcher icon is a separate surface that ships in the
  binary, and it deliberately carries no letter tile (see the Asset System
  section of `CLAUDE.md`).
- [x] **Upload the 1024x500 feature graphic BY HAND.** Uploaded by the owner on
  2026-09-15. `docs/feature-graphic.png`
  (Ember by the hearth under the wooden wordmark and the tagline "A little
  wordplay. / A world to uncover."), a byte-identical mirror of
  `mobile/assets/Play_store/launch-2026-09/upload/feature-graphic-1024x500.png`,
  1024x500 RGB with no alpha. Same place as the icon: Play Console -> Main store
  listing -> Graphics -> Feature graphic. It does not come from the build either;
  `npm run generate:assets` used to overwrite this path with a placeholder
  gradient and no longer writes it at all. Both Graphics assets are manual, so
  changing either file in Git does NOT update Play Console: re-upload by hand.

- [ ] **Production configuration cut.** Do NOT edit `expo.extra.adsUseTestIds`
  or `ci.yml`: `app.config.js` derives the shipped flag from
  `WORDSHIFT_RELEASE_CHANNEL`, so `eas build --profile production` resolves live
  ad units by itself and every other channel keeps the `true` literal (a literal
  `false` would put live ads into the testing channels and fails
  `productionConfig.test.ts`). Bump `android.versionCode` above the last Play
  upload, keep `creatorCode` empty, run
  `WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig`,
  and confirm `WORDSHIFT_RELEASE_CHANNEL=production npx expo config --type public`
  shows `adsUseTestIds: false` and runtime `<app version>-production` (1.4.5-production today). Follow
  [OTA instructions](OTA_UPDATES.md) for compatible updates.
  The Play release notes for this build must carry the legal line: "Privacy
  Policy updated (effective September 22, 2026) and Terms updated (effective
  September 14, 2026): clarified purchase restore and Reset All behavior, added
  data retention periods, and described network addresses, the purchase
  identifier and anonymous daily totals." Append "and a governing-law clause" only once the clause
  below is actually published.
- [ ] **Publish the documentation clarification with release notes.** The
  September 13 privacy/terms revision clarifies existing purchase delivery,
  restore and reset behavior; the September 14 revision adds retention periods
  to the privacy policy. A governing-law clause for the terms is DRAFTED (see the governing-law item below; it moved out of the terms page on 2026-09-22) and was previously inside
  an HTML comment in `docs/terms.md` (so the live page never shows bracketed
  placeholders; the Pages workflow refuses a placeholder outside its comment):
  fill in the jurisdiction and venue, move the section out of the comment,
  renumber "Changes", then mention the clause in the revision note and the
  release notes. Both documents promise a release-notes mention, so the line
  above is not optional. Verify the deployed policy links.
- [ ] **Submit and promote deliberately.** Both configured Android submit
  profiles target Play's **internal** track. Validate the production-configured
  artifact there, then promote it in Play Console with a staged rollout while
  monitoring Android Vitals/Sentry. Verify live ad availability without clicking
  your own live ads. Link the public Play listing in AdMob and verify app-ads.txt
  status; a configured publisher file alone does not establish console approval.

## Historical account and device evidence

These records came from earlier owner confirmations and checklists. Keep them as
history, and repeat changed flows in the current release matrix above.

- [x] **2026-07-02:** original Supabase security setup verified; Sentry org/project
  and EAS source-map secret configured; Play listing/app-content declarations,
  Android AdMob units/UMP message and publisher app-ads.txt configured; original
  nine one-time products and four RevenueCat entitlements created. The newer SQL
  migrations still need their own hosted evidence.
- [x] **2026-07-10:** Android non-subscription category lookup and startup
  entitlement restoration implemented; first purchase-recovery ledger, cloud
  conflict UI, press kit and source-map integration recorded. Current receipt
  transactions and native recovery limits supersede the old unconditional
  “a kill can no longer lose currency” claim.
- [x] **2026-07-13:** one real purchase of each then-existing product kind and
  Restore verified on Play internal testing; offline startup and a multi-hour
  session through Phase 4 observed without reported performance problems; store
  listing screenshots/feature graphic uploaded. This predates Supporter and the
  September progression/purchase/optimization changes.
- [x] **2026-07-16:** Android banner unit configured; testing ad IDs deliberately
  retained after an earlier live-ad flag change.
- [x] **2026-08-31:** Supporter subscription/base plan and entitlement confirmed
  console-side; repriced Remove Ads ($5.99), Patron ($8.99), Supporter ($3.99/month)
  tiers confirmed. Device verification of Supporter remains above. RTDN wiring
  was owner-deferred; revisit with the RevenueCat subscription operations setup.
- [x] **2026-09-05:** Expo SDK 57 / RN 0.86.3 dependency update, Doctor 21/21 and
  zero known npm vulnerabilities recorded at that time. Re-run current checks;
  these dated results are not current measurements.
- [x] **2026-09-14:** hosted Supabase v2 migrations verified by read-only probe
  (see the backend gates above); `rate_limits_v1.sql` written and rehearsed
  offline, not applied. Launch readiness review recorded in
  [`LAUNCH_READINESS_REVIEW_2026-09-14.md`](LAUNCH_READINESS_REVIEW_2026-09-14.md).

## iOS: separate release track

Android production access does not establish iOS readiness. The source currently
has a Google sample iOS AdMob app ID and blank iOS unit/RevenueCat keys.

- [ ] Apple Developer membership, App Store Connect app and EAS signing credentials
  for `com.wordshift.app`; build and test with TestFlight.
- [ ] RevenueCat iOS public SDK key and App Store integration credentials.
- [ ] Real iOS AdMob app ID, interstitial/rewarded/banner units and iOS UMP message.
- [ ] The same ten product IDs mapped to the five entitlement identifiers;
  sandbox checkout, restore, subscription expiry and paid-reward recovery tests.
- [ ] Review ATT behavior, App Privacy disclosures, current screenshots and the
  iOS store listing against the actual integrations. The tracking-transparency
  config plugin and matching Info.plist description are already present.
- [ ] Confirm app-ads.txt/store association and all device/backend release gates.

## Optional press preparation

- [ ] Set `creatorCode` only on a separate press/reviewer build and distribute its
  instructions with [the press kit](PRESS_KIT.md). Empty in shipping builds keeps
  the creator deep link inert; never publish the press unlock code as app copy.
