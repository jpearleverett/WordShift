# Fresh bank delivery validation — 2026-09-05

All 30 generated banks were audited against the actual fresh-board dictionary and shared runtime qualification. The generated bank files were not edited. Out of 9,611 historical boards, 3,809 currently qualify for new play.

| Family | Delivered boards | Required proof | Result |
|---|---:|---|---|
| Standard, including Expert and Lexicon | 1,465 | At least two complete legal paths | All pass |
| Reverse | 1,057 | Complete descent and return with the shipped lock rules | All pass |
| Double Shift | 1,287 | Complete legal paired moves with the shipped lock rules | All pass |

Every delivered stored solution was also replayed with fresh validation, including source/target words, removals, insertions, intermediate remainder words and locks. No delivered canonical replay failed. Following the preferred stored Reverse hints and testing continuation after each move found no dead-end advice. These proofs concern the shipped generated banks; bounded live hint search and generated/fallback boards have separate tests.

## Defects addressed

- Standard EASY `33a2d13c19a0` (`ACME / TOES / WHAT`) retained only one route after `WHATS` left fresh validation. A documented selection exclusion preserves the standard multi-route contract until a gated regeneration replaces it. Historical saves remain compatible.
- Twenty-three vocabulary-qualified Reverse records contained inconsistent authored source/target metadata. Selection now rebuilds the metadata only after proving a complete legal replay using the authored moved letters. It writes copies, leaving historical bank data intact. Missing or impossible replay proofs exclude the candidate.
- Rechecking the actual replayed words withheld five more Reverse boards: four require `KINS`, and one requires `RENTES`, which do not meet the current required-word policy. Those IDs and reasons are included in the full artifact.

The initial vocabulary-only pool was 3,815 boards; the standard exclusion and five replay vocabulary exclusions produce the final 3,809. The largest standard analysis explored seven states. The full audit completed at approximately 152 MB resident memory.

Reverse and Double Shift gated generators use their own solvability and quality criteria; their current toolkit does not promise two complete routes. Applying the standard-only analyzer to those rule sets would produce misleading coverage. Strengthening those variant contracts requires a separately designed variant-aware branching metric and gated regeneration.

## Reproduce

From `mobile/`:

```sh
node --max-old-space-size=180 scripts/tools/auditVocabulary.mjs ../docs/review-2026-09-05/vocabulary-bank-audit.json --branching
node --max-old-space-size=180 scripts/tools/auditBankRoutes.mjs ../docs/review-2026-09-05/bank-route-audit.json
```

Both commands use `qualifyFreshBankPuzzle`, the same pure delivery helper used by runtime bank selection. The full audit exits with an error for a delivered route, stored replay or preferred Reverse hint failure. Its JSON retains all 30 family counts, historical metadata defects, exclusions and results.

Artifacts: [vocabulary and branch coverage](../review-2026-09-05/vocabulary-bank-audit.json), [complete replay and hint audit](../review-2026-09-05/bank-route-audit.json). Focused regressions cover the standard exclusion and a real Reverse anagram/locked-letter inconsistency, including refusal on failed or exhausted proof.
