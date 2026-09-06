# Vocabulary audit — 5 September 2026

The historical dictionary contains 22,749 entries. This revision makes newly served puzzles use a reviewed vocabulary policy and keeps the historical dictionary for compatibility with a board already in progress.

## What changed

- **The 58 previously quarantined forms all have final editorial decisions:** 9 familiar attested variants are restored and 49 remain excluded from fresh-board acceptance and required solutions. The [complete 58-word decision table](VOCABULARY_EDITORIAL_DECISIONS_2026-09-06.md) records primary evidence and the game-policy reason for every decision. No word awaits owner adjudication. Excluded does not mean invented: many are uncommon variants or specialized inflections.
- **977 additional forms are advanced vocabulary**: permitted as required words in EXPERT or explicitly selected Lexicon banks, rather than ordinary EASY–HARD boards.
- **1,658 very obscure forms** remain optional player discoveries but are not required in newly served puzzles.
- Familiar regional spellings and reviewed variants remain supported. An American-only spellchecker would reject legitimate English; this audit includes all reference dialects.
- Future dictionary additions do not automatically qualify for required puzzle words. They must appear in the audited source snapshot or be reviewed in a new snapshot.

Fresh boards carry `vocabularyVersion: 1`. A saved board without that marker retains version 0, including after restart and re-save. Completing that board returns the player to the new policy. Daily boards also carry a separate board version so older and revised daily puzzles do not compete in the same leaderboard cohort.

The original review filtered historical banks without editing them. The [6 September gated top-up](PUZZLE_BANK_TOP_UP_2026-09-06.md) subsequently replaced 13 thin families and purged three unsafe Double Shift half-move boards. Selection filters their complete authored route, including intermediate formed and leftover words, before serving. The supported gated generators use the same policy for future replacements. Authored fallback pools were separately checked under the fresh dictionary; six invalid fallback entries were replaced and every fallback now proves a full route before serving.

## Evidence and reproducibility

Reference: [English Speller Database / SCOWL](https://github.com/en-wl/wordlist), revision `1e5b7d3a72f47a71da5d28686c1dd4b397178485`. The query uses lowercase ASCII entries across dialects, an empty category, non-abbreviation parts of speech, and variant levels through 5; minimum SCOWL size provides an editorial familiarity proxy. Spellchecker list size is not a measured player comprehension score.

The full per-word snapshot and exact query are committed in [esdb-2026-09-05.json](../mobile/scripts/vocabulary/esdb-2026-09-05.json). Its [license](../mobile/docs/licenses/ESDB-Copyright.txt) is retained. Rebuild policy with `cd mobile && npm run generate:vocabulary-policy`, then run `npm run audit:vocabulary -- ../docs/review-2026-09-05/vocabulary-bank-audit.json` and the vocabulary/fallback/bank tests.

Fifteen familiar spellings absent from the strict query were already reviewed: MOMMA, MOMMAS, SAUTE, SAUTEED, DJINN, SCHEMAS, DIALOGS, TSARIST, FRIER, PRICY, SPACY, FLUKEY, WHACKY, ROPEY and KIDDY. META is treated as familiar modern vocabulary, consistent with its [dictionary entry](https://www.merriam-webster.com/dictionary/meta).

Some excluded forms are legitimate in narrower dictionaries or contexts: [ALLS](https://scrabble.merriam.com/finder/alls) and [LITTLES](https://www.merriam-webster.com/dictionary/littles) are examples. Their exclusion is now a completed game editorial choice, not a declaration that they are fake. The follow-up review restores BONNIE, CAYMAN, CAYMANS, CHOOSEY, GASSES, HALLO, STANDUP, WINTERY and WOOLY on publisher and ESDB evidence. Together with the original 15 exceptions, these give 24 reviewed allowed variants.

## Coverage and limits

The original audit evaluated all 30 banks, containing 9,611 historical boards. The completed top-up now supplies 4,372 eligible boards from 7,356 stored records, with at least 100 eligible boards in every family. The committed [bank report](review-2026-09-05/vocabulary-bank-audit.json) records per-family coverage. An additional complete-path audit checks newly eligible boards under the fresh dictionary, rather than relying only on historical solvability tests. One EASY board lost its second route when WHATS was removed and is withheld from fresh selection. The standard-bank multi-route promise must be checked using the same dictionary that the player receives.

All 13 families that fell below 100 eligible boards have now been replenished. Current capacity, retained diversity caps, complete-route proofs and review/install evidence are recorded in the [completed top-up report](PUZZLE_BANK_TOP_UP_2026-09-06.md). CI fails a pool below 100, a duplicate delivered chain, or a broken route. Future top-ups use the same gated sidecar workflow and mandatory profanity purge; legacy generators and manual bank edits remain prohibited.

The policy is deliberately reviewable rather than claiming that an automated word list perfectly predicts familiarity. Reader feedback and actual rejected-word reports should guide subsequent exceptions. A blind vocabulary review protocol is included in the story/playtest delivery documents.

## Final excluded forms

`ALLS`, `ALTHO`, `AMEER`, `AWAKED`, `AWEING`, `BASSETT`, `BLOWED`, `BOGY`, `BONEY`, `BUILDED`, `CALIF`, `CHID`, `DEADS`, `DIGGED`, `DOGY`, `DOPY`, `DRYEST`, `ENOUGHS`, `FORMERS`, `GAYLY`, `GUMTREE`, `HES`, `ILLER`, `ILLEST`, `JUN`, `LEASTS`, `LIKEST`, `LITTLES`, `LOCATER`, `LOONEY`, `MADAMES`, `MAMBOES`, `MASSE`, `MOSTS`, `MUCHES`, `NONES`, `NOS`, `PRYER`, `RENO`, `REVERY`, `SCAREY`, `SHAMMY`, `SHES`, `SHOED`, `STONEY`, `THATS`, `TREADED`, `WALLA`, `WHATS`.
