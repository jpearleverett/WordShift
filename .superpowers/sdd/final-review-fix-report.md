# Final Whole-Branch Review Fix Report

## Scope

This fix addresses every finding in the final whole-branch review for
`cursor/player-fun-overhaul-da6a`.

## Findings and fixes

### Capped dwell voice repetition

`recordPhase4Dwell()` retains its capped persisted count and `canArmFinale()`
retains its existing arming predicate. `App.tsx` now reads the dwell count
before recording the win:

- Wins one through eight use the existing escalating `getDwellLine()` sequence.
- Later wins while the finale remains unarmed use
  `getPostCapDwellLine(completedTotal, phase)`.
- The post-cap selector is deterministic, in-world, and contains no em dashes.

Direct regression coverage verifies that puzzle 144 and puzzle 159 both avoid
the eighth dwell line and avoid each other.

### Documentation

`CLAUDE.md` now states the Patron nudge gate is 50 puzzles.

### Unbroken Weave presentation tests

`unbrokenWeavePresentation.test.ts` now renders actual `DifficultyMenu` and
`StatsScreen` component trees using the repository's synchronous Node component
test convention. It asserts the setup row's rank/title/objective/rule and the
Stats MASTERY card's Weave rank/objective. The existing VictoryModal test
remains intact.

## TDD evidence

The capped-dwell regression was added before implementation and run in RED:

`npm test -- --no-coverage --runInBand --testPathPattern=phaseNarrative.test.ts`

It failed because puzzle 144 returned the stored eighth line:

`There is nothing left to make ready. The house has drawn a long breath, and holds it, and holds it.`

The implementation then made the targeted suites pass.

## Verification

- Targeted finale and presentation tests: 3 suites, 419 tests passed.
- TypeScript: `tsc --noEmit` passed.
- ESLint: exited 0 with the repository baseline of 827 warnings and 0 errors.
- `git diff --check` passed.

## Concerns

No functional blockers. The post-cap selector cycles deterministically through
eight lines for a very long pre-finale run; normal progression arms at puzzle
160, so this is only a resilience fallback rather than expected player-facing
cadence.
