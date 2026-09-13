# WordShift completion checklist

Reviewed September 13, 2026 against `main` at `6f96ebb`. This is a current handoff summary. The former August 31 / September 1 checklist described v1.2.2 and is superseded; its old test totals, open walk-cycle gap, SDK-56 advice and screenshot tasks are not the status of the current source.

[Current build](CURRENT_BUILD.md) records the release configuration and latest validation. [Launch checklist](LAUNCH_CHECKLIST.md) owns production gates. When a new build or console decision changes either, update those canonical records rather than maintaining a second release recipe here.

## Implemented in current main

- [x] Story choices extend beyond tea/cocoa: authored story decisions, individual resident choices and saved callbacks, plus the CLOSED/CLOSER final boundary. Deferral does not invent an answer; failed saves remain recoverable.
- [x] New late arrivals among animals 8–13 receive three personal visits drawn from their existing writing before the current concern. Established friends can opt into the remaining acquaintance visits without replaying a move-in introduction.
- [x] Resident choice screens retain the animal, full question, equal answer trays, visible deferral and save/retry handling in a scrollable reading surface.
- [x] Ordinary phase-transition passages include art. The compact card keeps illustration and controls visible while the reading panel scrolls; larger text reduces the art stage and stacks controls.
- [x] Phase, house-completion, Arrival, post-arrival and New Cycle ceremonies have durable delivery. Completion or confirmed Skip acknowledges the scene. Backgrounding pauses; an unfinished queued ceremony replays from its beginning after a cold restart. Legacy completed phases are not backfilled.
- [x] Mode-unlock notices are acknowledged through their final page. Dialogue and puzzle operations guard against stale asynchronous results, rapid taps and interrupted handoffs.
- [x] Fox keeps its ten-frame walk; eleven other animals have eight-frame walk atlases. Axolotl keeps its movement. Fennec's direction is corrected per pose. Robed phases, reduced motion and device-tier simplification retain their intended behavior.
- [x] All thirteen rooms have placements for their decoration, deepening and three attunement purchases: 65 purchasable steps. Room-specific props, lighting and marks follow the existing paintings.
- [x] Store room/cosmetic purchases and relevant reward grants use durable transaction and duplicate-claim protection. Paid checkout/restore, storage retry and entitlement refresh have regression coverage. Native store behavior still needs a signed-build check; automated coverage is not a receipt from a real purchase.
- [x] Android release minification and resource shrinking are configured, with the optimizing ProGuard default and the AGP-8.12 optimized-resource-shrinking property. Actual native output size and runtime behavior must be measured on a new EAS build; see [build and upload guide](BUILD_AND_UPLOAD.md).
- [x] Play production access was granted after the owner's 12-tester/14-day closed test. This is owner-confirmed context, not proof that every later change has been tested on a device.

## Still needs evidence on the release candidate

- [ ] Complete the current [launch checklist](LAUNCH_CHECKLIST.md), including the ad test-ID production cut, runtime/version separation, signed internal-track validation and deliberate Play promotion. Do not infer completion from a green JavaScript CI run.
- [ ] Verify the new optimized native bundle: clean install, cold start and resume, story transitions, audio, sharing, notifications, cloud recovery, RevenueCat and AdMob. Record the exact app version, Android version code, EAS build and device alongside the result.
- [ ] Check purchasing interruptions: duplicate taps, Back/navigation, cancellation, pending payment, failed local save and retry, then restart. Check each reward against its balance and ownership/claim record. Consumable recovery has limits; use the current [monetization guide](MONETIZATION_SETUP.md), not an assumption that reinstall restores spent amber packs.
- [ ] Check the hardest progression handoffs on-device: all ordinary transitions, a mode unlock, house completion, both authored final words, post-arrival and New Cycle. Test cancelled Skip, confirmed Skip, rapid Continue, backgrounding and process restart while a ceremony is pending.
- [ ] Review room upgrades in Phases 2, 4 and 5, including full attunement, and all walking residents in both directions at device scale. Browser screenshots and atlas geometry checks do not establish native animation quality.
- [ ] Check TalkBack, enlarged OS text, reduced motion and small-screen reachability for puzzles, choices, introductions, story scenes, store controls and ceremonies. Reading surfaces allow the OS reading scale; the old universal 1.35× assumption does not describe `AppText`.
- [ ] Run or record the unfamiliar-reader [story pilot](STORY_PLAYTEST_PROTOCOL.md), including a Phase-3 late recruit. There is no completed report for that protocol in the repository; do not count the earlier Play eligibility test as its results.
- [ ] Review the current Play listing assets, support contact and console declarations against [store listing](STORE_LISTING.md), [backend setup](BACKEND_SETUP.md) and [support runbook](SUPPORT_AND_RETENTION_RUNBOOK.md). Repository edits alone do not prove that console-side work has been applied.

## Follow-up scope

The iOS release remains a separate track requiring its platform keys, store products, credentials and device validation. Live economy/retention decisions require real player data; the earlier audits and design ledgers are dated planning evidence rather than current launch gates. English is the current game language. Broader localization, improved challenge-link distribution and additional ambient character art are product follow-ups, not evidence that the merged launch fixes are absent.
