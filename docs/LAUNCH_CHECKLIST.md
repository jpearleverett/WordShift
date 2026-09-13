# WordShift launch checklist

Reviewed against main `6f96ebb` on 2026-09-13. [Current build](CURRENT_BUILD.md) is
the source of truth for merged behavior and configured versions; [build and
upload](BUILD_AND_UPLOAD.md) covers EAS archives and Android optimization. Checked
historical account/device items below retain their original dates. They do not
verify the latest binary, backend deployment or public release.

## Android release gates

- [x] **Production access granted.** The owner completed the 12-tester/14-day
  closed test and confirmed access on 2026-08-31.
- [ ] **Identify the exact release artifact.** Source currently configures app
  **1.3.4**, Android **98**, with local version management and no automatic
  increment. Compare the next code with Play Console before uploading; increase
  it if already used. Record commit, EAS build ID, version/code, runtime, track
  and device. `package.json`'s 1.3.1 is package metadata, not the native app version.
- [ ] **Run the release checks on that commit.** From `mobile/`: `npm ci`,
  `npm run typecheck`, `npm run lint -- --max-warnings 0`,
  `npm test -- --no-coverage`, `npm run test:e2e`, `npx expo install --check`
  and `npx expo-doctor`. Consult [current build](CURRENT_BUILD.md) for already
  recorded CI evidence; green JavaScript CI does not establish native release QA.
- [ ] **Build the optimized signed AAB and test through Play internal testing.**
  Release minification/resource shrinking and the optimized ProGuard default are
  enabled in source. The template/config tests do not prove a minified Android
  binary starts or that reflection-dependent SDKs work. Recheck cold start,
  fonts/art/audio, notifications, sharing, RevenueCat, AdMob consent and ads.
  Record actual DEX size, download/install size and Play's 16 KB result for this
  artifact; do not interpret the EAS source upload as the player download size.
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
  closed testing. Verify UMP required/not-required/error paths and Settings →
  Privacy Options; an error alone never permits ad requests. Test interstitial,
  rewarded and Stats banner placements using a tester without restored ad-free
  entitlements, as well as paid-player suppression. Collect Now is ad-exempt.
- [ ] **Backend release evidence.** Apply/rehearse the current SQL upgrades,
  verify hosted v2 save/event/daily/support RPCs, actual event arrival, two-device
  conflict handling, verified support recovery/deletion and a successful retention
  run. Confirm project availability/backup policy and Sentry alerting plus a
  symbolicated event from the exact signed release. Follow [backend setup](BACKEND_SETUP.md).
- [ ] **Review the current store package.** Use the reviewed launch package in
  `mobile/assets/Play_store/launch-2026-09/`, its claims ledger and
  [store listing](STORE_LISTING.md). Confirm the files actually uploaded are the
  current captures and show the shipped +25% Challenge reward, current counts
  and spoiler-safe UI. Earlier uploaded July/August images were stale; the
  presence of replacements in Git does not update Play Console.
- [ ] **Production configuration cut.** Change `expo.extra.adsUseTestIds` to
  `false` only for the reviewed public-release configuration, keep `creatorCode`
  empty, and target the `production` runtime/channel. Run
  `WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig`.
  Update the corresponding CI test environment in the same production-cut change
  so it enforces the intended ad mode. This documentation update leaves test ads
  enabled. Follow [OTA instructions](OTA_UPDATES.md) for compatible updates.
- [ ] **Publish the documentation clarification with release notes.** The September 13
  privacy/terms revision clarifies existing purchase delivery, restore and reset
  behavior. Include that clarification in the app release notes as the terms
  require, and verify the deployed policy links.
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
