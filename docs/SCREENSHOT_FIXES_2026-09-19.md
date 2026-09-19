# September 19 screenshot follow-up

Work branch: `feature/play-store-refresh`, draft [PR 450](https://github.com/jpearleverett/WordShift/pull/450). These are source changes for the next Android build, not evidence of a new Play upload.

## Reported issues and changes

| Report | Change |
| --- | --- |
| Axel fills too much of the aquarium room | Reduce the axolotl art stack by 12%, preserving its measured foot baseline, interaction area, and pose/outfit alignment. |
| Decision pages repeat an unrelated tea banner | Assign illustrations to individual authored story beats, including choice responses and retrospective pages. Preserve narrative copy and saved choices. |
| The resident disappears on narrator/player pages | Keep the scene resident portrait visible while retaining the actual speaker label. |
| Victory information is crowded | Remove the harvested-word count and cumulative words-shifted line. Keep the word chain, rewards, and collection actions. |
| Home shows two flame counters | Keep the overall play-streak indicator. Daily challenge retains its completion check, stars, navigation, and separately identified daily streak in accessibility text. |
| Swift Victories uses the older visual treatment | Use the full victory modal's cottage frame and controls, with scrolling for short screens and large text. |
| Recovery code cannot be copied | Add Copy and selectable text; explain that the code remains stable for the current game. Clipboard failure retains the selection fallback. |
| Reset destroys the save that recovery should restore | Serialize a final backup and local reset, then atomically assign the fresh game a separate cloud identity. The old code continues to address its preserved backup. |
| Visitor welcome overlaps onboarding dialogue | Hold the home guide and achievement toast while a home modal is active; resume pending dialogue afterward. |
| Trust Your Ear arrives one board late | Remove the ceremony deferral. Gate interaction with the first ordinary board using neutral drop-slot feedback until its explanation is acknowledged. |
| Dragged tile clips at the board viewport | Render the floating tile in a root overlay outside the native ScrollView, while preserving the original gesture responder and drop coordinates. |

## Recovery semantics

A continuing game intentionally has one stable recovery code. Opening Settings backs it up before revealing the code. Reset now preserves the latest recoverable state and gives the fresh game a different identity; a later fresh-game autosave cannot overwrite the previous game's backup.

An existing backed-up game is left intact if the final backup fails or detects a newer remote revision. A first-time game without a prior backup can still reset offline. A reset already performed by the old implementation may have overwritten its remote save; the code alone cannot reconstruct data no longer stored there.

No real recovery credential or live player save was used during testing.

## Validation

All **222 collected Jest suites** have verified passing results. The initial full-suite process ended without an aggregate summary after 106 passing suites and a legacy-art resolver failure. The 116 remaining/unverified suites were run separately; two stale source-shape assertions were then corrected and their 26 tests rerun successfully. This is complete suite coverage across runs, not a claim of one uninterrupted green full-suite invocation.

Typecheck and lint with zero warnings passed. Focused checks include:

- Recovery: 8 suites / 175 tests, including reset, a new game's separate upload, and restoration through the original code, plus offline, conflict, and in-flight upload ordering.
- Flow and drag: 7 suites / 216 tests, including the first neutral board, modal ownership, scaled visual movement, lifted drop coordinates, cancellation and assistive activation.
- Story presentation: 39 independent checks for authored branches, legacy frozen transcripts, continuous portraits, and preservation of saved choices, page and phase. An older-wording collision found by this check was fixed by reserving exact illustrations for later pages before matching unknown wording.

All **185 page illustrations** passed final visual review and the strict asset validator: unique, opaque 960 × 540 WebP images, with no missing or invalid files. Their combined size is **20,781,058 bytes (19.82 MiB)**. Coverage includes conditional branches, choice responses, aftermath and recollections. Image hashes and dimensions are recorded for every asset; 151 records also preserve the exact generation prompt, while 34 earlier records explicitly retain historical-recipe provenance. See the [art coverage review](ART_COVERAGE_REVIEW_2026-09-19.md) and its per-image review manifest.

The production **Android Hermes JavaScript/assets export passed**. All 185 final story-image hashes were found in its 910 exported assets. This establishes successful module resolution and inclusion of the final artwork, not a signed native build or device pass. The checked-in [validation summary](SCREENSHOT_FIXES_2026-09-19-validation.json) preserves the suite, asset and export results.

`expo-clipboard` uses the SDK-matched version. Its native implementation requires a new signed Android build. Source tests and assembled previews do not establish native clipboard behavior, drag rendering, or Android lifecycle behavior. The device check should exercise the reported flows on the next Play internal-testing build.

### CI follow-up: first-home greeting

[CI run 528](https://github.com/jpearleverett/WordShift/actions/runs/35464067358), on `ac62738`, passed all 222 Jest suites / 5,217 tests and the other source gates, but failed one of 43 rendered journeys. The empty-home onboarding journey could not find Ember's “Hello up there” greeting. The unlock-data refresh opened the free visitor invite immediately, bypassing HomeScreen's 2.6-second reveal delay; the new modal-overlap protection then hid the greeting before it could be read.

The correction defers automatic invite opening specifically during `home_empty`, so HomeScreen owns the existing reveal and recovery timers. Manual den taps and normal later auto-invites still work. A late refresh uses the current policy and does not close an invitation already opened by the timer or the player. Five focused suites / 176 tests passed, including four new behavioral regressions. The rendered journey retains its greeting assertion and additionally checks that the greeting is unmounted while the visitor modal is visible. The feature branch's GitHub checks remain the gate for the complete rendered journey.

## Listing assets

The complete listing campaign is assembled from the game's source art and UI specifications in `mobile/assets/Play_store/assembled-listing-2026-09/`. All eight portrait exports use opaque RGB PNG at 1080 × 1920 (9:16). The house composition includes the entire foundation-to-pit path and 70 pixels of bottom breathing room. The package also includes a 1024 × 500 feature graphic, 512-pixel icon options, an alternate opener, listing copy, provenance, and a self-contained review.

All eight images were visually reviewed. Dimensions, format, source/export hashes, daily-board spacing, full pit bounds and ZIP integrity passed. The daily puzzle uses the actual September 19 source-seeded board; no player rank or streak was invented. The choice-card illustration preserves its full 16:9 frame, matching the updated story modal.

These are source-assembled marketing images. Their review package records source provenance; they are not labeled device captures. The separate real-capture workflow and its validation requirements remain in place.
