# Animal walking correction — September 17, 2026

Work is on `feature/alternating-animal-walks`, based on `main` at `3b7ec4e`.
[PR #449](https://github.com/jpearleverett/WordShift/pull/449) is ready for owner review and merge.
The complete artwork and runtime are preserved in checkpoints `9f7c67e` and `05862a3`.

## Findings and changes

The old atlas clock played all eight cells correctly, but several sheets repeated
the same leading leg in both halves of the cycle. Robed movement was separately
blocked by explicit phase gates and a static-glide policy.

The replacement art alternates the near and far legs across a complete two-step
cycle. All thirteen residents receive robed walking; twelve receive new or
refreshed normal atlases. Fox retains its original ten-frame normal animation.
Axolotl retains its mask and gains alternating paddle/step motion. Existing idle,
talk and robed portraits remain unchanged.

The runtime chooses the matching outfit, including separate fennec facing
corrections. It keeps that outfit's static portrait visible until the walk image
decodes, isolates image failures by source, resets frame offsets on stops and
outfit changes, and stops interrupted travel at its actual position. Late phases
retain slower travel and longer pauses. Reduced motion and low-tier limits remain.

## Art provenance and review

Every packed cycle has eight 256px cells in a 4×2 sheet. Each outfit matches its
own portrait's scale and floor. Twenty-one accepted prepared atlases survived an
automatic workspace cleanup; the larger source sheets and exact per-call prompts
for those assets did not. Their unchanged prepared outputs, checksums and clearly
labelled prompt summaries are retained as rebuild sources. The four sloth/wombat
cycles retain fresh original sheets and exact prompts. The manifest distinguishes
these formats; no lost original is claimed as retained.

Visual acceptance checks both contacts (frames 0/4), opposite passing legs (2/6),
the complete loop and seam, both travel directions, consistent costume/eyes,
uncropped extremities, and readability at the actual 90px sprite-box size.
All thirteen chronological strips were independently reviewed, including the
opposing sloth/wombat contact and passing poses in both outfits. The generated
HTML was exercised at game size and double size with pause, complete-cycle
scrubbing, direction reversal and resume. The frame strips were retired from `docs/` on
2026-09-22 (git history holds them); regenerate them with
`node scripts/tools/buildWalkReview.mjs --html <file> --evidence-dir <dir>`
from `mobile/`, writing outside `docs/` so they are never published.

## Validation

- All 25 atlas checks pass, including source checksums and deterministic rebuild.
- All 26 asset tests pass; evidence hashes match all 35 runtime PNGs (25 atlases plus the ten original fox frames).
- 219 Jest suites / **5,161 tests** pass, including interrupted travel/facing and outfit changes. TypeScript and zero-warning lint pass.
- Four local browser journeys pass: all thirteen residents decode and play complete correctly facing cycles while traveling in phases 3, 4 and 5; reduced motion keeps all robed residents still without decoding walks.
- [GitHub CI run 467](https://github.com/jpearleverett/WordShift/actions/runs/35228207088) passes on runtime commit `05862a3`: the same Jest total, 11 separate top-up regressions, production config, story/vocabulary/route/daily-cohort gates and **all 43 browser journeys**.
- [CI browser screenshots and observations](https://github.com/jpearleverett/WordShift/actions/runs/35228207088/artifacts/10500252570) retain the in-game evidence. The subsequent checkpoint adds documentation and review evidence only.
- EAS includes all 35 runtime walk PNGs (6.10 MB) and excludes raw source sheets and review artifacts.

The browser journeys exercise real house sprites with actual decoded art and
movement. Artifact previews complement those checks; they do not replace runtime
validation. Signed Android observation has not been performed in this environment.
