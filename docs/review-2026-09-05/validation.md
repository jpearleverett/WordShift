# Delivery validation record

Prepared on 2026-09-06 for the September 5 improvement work. This record separates verified local evidence from remaining release checks. Source reference: the tested source tree on `feature/game-improvements-vocabulary-audit`; see branch history for its delivery commit.

Scope and remaining work: [implementation ledger](../IMPLEMENTATION_STATUS_2026-09-05.md), [release procedure](../RELEASE_VALIDATION_1_3_0.md), [vocabulary audit](../VOCABULARY_AUDIT_2026-09-05.md).

## Confirmed evidence

| Check | Observed result | Limit |
|---|---|---|
| Fresh bank delivery | **3,809 eligible boards** from 9,611 historical records: 1,465 standard boards with at least two complete routes, 1,057 Reverse boards and 1,287 Double Shift boards with complete legal solutions. Stored solutions and preferred Reverse hint continuations replay successfully. | These are delivered bank proofs, not measurements of player comprehension or native generation latency. Generated source banks remain unchanged. |
| Local PostgreSQL rehearsal | **26 assertions passed** using PGlite PostgreSQL; **zero remote writes**. | Covers revisions, permissions, event deduplication, daily partitions and scoped support deletion. Does not establish hosted concurrency, PostgREST behavior or deployed migrations. |
| Dependency audit | **981 packages audited; zero reported vulnerabilities** at the recorded installation. | An audit result is time-specific and does not prove native behavior. |
| Expo Doctor | **21 of 21 checks passed** for Expo 57.0.17 / React Native 0.86.3. | Dependency/configuration checks do not establish signed-device compatibility or measured memory improvement. |

The [bank delivery report](../reports/BANK_DELIVERY_VALIDATION_2026-09-05.md) contains exact reproduction commands and exclusions. Machine-readable evidence: [vocabulary/branching](vocabulary-bank-audit.json) and [route/replay audit](bank-route-audit.json).

## Final run record

| Check | Final result |
|---|---|
| Full Jest suite | **Passed**, exit 0: **151 suites / 3,925 tests**, 89.999 seconds. Command: `npm test -- --no-coverage --runInBand --config=/tmp/wordshift-jest-delivery.config.cjs`. The temporary configuration enables isolated transpilation to bound VM memory; separate whole-project TypeScript validates types. Four affected test suites clear telemetry debounce timers during cleanup. Overlapping focused runs are not added to this total. |
| Whole-project TypeScript | **Passed again after all final visual edits**, exit 0 with no diagnostics: `npm run typecheck` (`tsc --noEmit`), with `NODE_OPTIONS=--max-old-space-size=1250`. |
| Full lint and focused reruns after corrections | Full run completed: **393 files, 0 errors, 1,254 warnings**, 203.7 seconds. Command: `npm run lint -- --debug --format json --output-file /tmp/wordshift-final-lint.json`. Focused reruns passed, exit 0: **9 files, 0 errors, 56 warnings**, then **4 final UI/browser-test files, 0 errors, 29 warnings**. Scopes and commands below. Scoped warnings overlap and are not added together or to the full-run total; warnings remain. |
| Native export/bundling | **Passed**, exit 0: Android export with 700 asset records and a 13,045,974-byte Hermes bundle. All seven referenced story images are optimized WebPs; no story PNG masters remain in the manifest. [Manifest summary and bundle hash](android-export.json). The uncompressed export directory is 57,468,594 bytes; this is not an AAB size or signed-device result. Command and temporary artifact location below. |
| Seven rendered browser journeys | **All seven final journeys passed**, each in an isolated `--grep` invocation: small enlarged-text Rules, repeated hint/reload, optional practice, ordinary victory, both seeded ending-object inspections/reload, and Journal/Tasks/Store navigation. Initial batch invocations were interrupted by SIGTERM (exit 143); this record does not claim a completed seven-test batch. Details below. |
| Screenshots | **Ten updated captures reviewed**, with no observed visual blockers after practice-panel padding and victory Pit-icon corrections. Files and states are listed below. Older unprefixed captures remain historical evidence. |
| Checks after final visual corrections | Focused Jest **passed**, exit 0: **3 suites / 58 tests**, 3.292 seconds. Command: `npm test -- --no-coverage --runInBand --config=/tmp/wordshift-jest-delivery.config.cjs --testPathPattern='victoryModal\|practiceLessons\|dateUtils'`. These tests overlap the full result; do not add their counts. The full Jest run predates the final practice-panel padding, victory Pit-icon and puzzle-table artwork-reference corrections. Final whole-project TypeScript and the four-file UI/browser-test lint rerun also passed. |
| Generated bank and raw dictionary guard | **Passed**: the final diff contains no changes to the generated bank source files or `mobile/src/dictionary.ts`. Fresh delivery is filtered and qualified separately. |

The browser fixtures block non-local network requests. Seeded ending inspections do not play through the final choice. The Tasks/Store journey checks navigation and comparison visibility; bulk claims and pending-pit collection require their own evidence. Browser text enlargement does not replace OS font-scale or screen-reader testing.

### Rendered journey results

The final invocations isolate one journey at a time to fit this VM. Reproduce from `mobile/` with `npm run test:e2e -- --grep '<journey title>'`; keep Metro available between invocations. All seven final invocations exited 0. Fixture corrections set the already-seen endgame introduction state and target the Journal's quest link unambiguously.

| Journey title | Final result |
|---|---|
| `fresh board has a visible help icon and scrollable rules at a small viewport` | Passed, 15.0 seconds. |
| `repeating disclosed advice spends one hint and survives reload` | Passed, 44.3 seconds. |
| `optional practice can be played and closed without changing progress` | Passed, 20.2 seconds. |
| `solving a board exposes accessible results and durable progress` | Passed, 38.5 seconds. |
| `remember ending remains visible and inspectable in the house` | Passed, approximately 1.1 minutes. |
| `release ending remains visible and inspectable in the house` | Passed, approximately 1.0 minute. |
| `journal rewards and support benefits are discoverable` | Passed, 42.1 seconds. |

### Reviewed captures

These are browser review images, not signed-build store screenshots. The two ending cohorts are explicit seeded QA fixtures.

| Capture | State and review scope |
|---|---|
| [Fresh puzzle](updated-fresh-puzzle.png) | Fresh board, visible help icon and ordinary controls. |
| [Small enlarged-text Rules](updated-rules-small-large-text.png) | 320×568 viewport with 35% browser text enlargement and reachable Close control. |
| [Double Shift practice](updated-double-practice.png) | Completed lesson, padded panel and reachable dismissal. |
| [Ordinary victory](updated-victory.png) | Solved board result, visible next action and corrected Pit icon. |
| [Remember house](updated-house-remember.png) | Seeded remember ending with its private-door affordance. |
| [Remember inspection](updated-inspection-remember.png) | Private-page inspection response. |
| [Release house](updated-house-release.png) | Seeded release ending with its outward-gate affordance. |
| [Release inspection](updated-inspection-release.png) | Outward-walk inspection response. |
| [Tasks and rewards](updated-tasks-rewards.png) | Journal-linked Tasks surface with season access. |
| [Support comparison](updated-support-comparison.png) | Remove Ads, Patron and Supporter benefits comparison. |

### Reproduce the memory-bounded Jest run

From `mobile/`, create this temporary configuration outside the repository. It inherits the repository's Jest configuration and changes transpilation mode only; it does not change the package or CI test command. Separate TypeScript checking remains required.

An optional probe of the default Jest configuration reached approximately 1.55 GB Jest RSS on this 2 GB VM and was terminated after memory exhaustion, without a test result. That probe is not a pass or an application assertion failure. The completed full and focused results above use the documented temporary override.

```sh
cat > /tmp/wordshift-jest-delivery.config.cjs <<'JS'
const path = require('node:path');
const mobileRoot = process.cwd();
const base = require(path.join(mobileRoot, 'jest.config.js'));
module.exports = {
  ...base,
  rootDir: mobileRoot,
  transform: Object.fromEntries(
    Object.entries(base.transform).map(([pattern, [name, options]]) => [
      pattern,
      [name, {
        ...options,
        isolatedModules: true,
        tsconfig: {
          ...options.tsconfig,
          rootDir: mobileRoot,
          ignoreDeprecations: '6.0',
          isolatedModules: true,
        },
      }],
    ]),
  ),
};
JS
NODE_OPTIONS=--max-old-space-size=650 npm test -- --no-coverage --runInBand --config=/tmp/wordshift-jest-delivery.config.cjs
NODE_OPTIONS=--max-old-space-size=1250 npm run typecheck
```

### Focused lint commands

Run from `mobile/`. This checks App, Settings, the rendered journeys and the six changed regression suites after the full lint run.

```sh
npm exec -- eslint App.tsx src/components/SettingsScreen.tsx e2e/game.spec.ts src/__tests__/appIntegration.test.ts src/__tests__/homeSurfaceFixes.test.ts src/__tests__/saveIntegrity.test.ts src/__tests__/cloudSave.test.ts src/__tests__/monetization.test.ts src/__tests__/supabaseCloud.test.ts --format json --output-file /tmp/wordshift-final-lint-rerun.json
```

The final four-file rerun covers the three visual corrections and the updated browser fixtures.

```sh
npm exec -- eslint src/components/puzzle/PracticeModal.tsx src/components/puzzle/VictoryModal.tsx src/components/PuzzleAtmosphere.tsx e2e/game.spec.ts --format json --output-file /tmp/wordshift-final-visual-lint.json
```

### Android export

Run from `mobile/`:

```sh
SENTRY_DISABLE_AUTO_UPLOAD=true EXPO_NO_TELEMETRY=1 NODE_OPTIONS=--max-old-space-size=900 npx expo export --platform android --max-workers 1 --dump-assetmap --output-dir /tmp/wordshift-android-export-final
```

The final asset-map check required exactly seven story entries, each from `assets/story/optimized/` with type `webp`, and zero PNG masters. The source masters remain in the repository for editing and regeneration. The exported bundle is local verification; no source maps, store build or update were uploaded.

## Release gates still open

No signed native build, store submission, OTA publication, physical-device pass, hosted SQL deployment, unfamiliar-reader pilot, native performance capture or signed-build store screenshots are claimed here. Follow the [release matrix](../RELEASE_VALIDATION_1_3_0.md) and [reader protocol](../STORY_PLAYTEST_PROTOCOL.md). F36 remains a partial structural extraction in the implementation ledger.

This directory and future `docs/device-evidence/` captures are excluded from the public GitHub Pages site.
