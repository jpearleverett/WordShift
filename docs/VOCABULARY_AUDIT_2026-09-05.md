# Vocabulary audit — 5 September 2026

The historical dictionary contains 22,749 entries. This revision makes newly served puzzles use a reviewed vocabulary policy and keeps the historical dictionary for compatibility with a board already in progress.

## What changed

- **58 forms are quarantined** from fresh-board word acceptance and required solutions pending editorial review. These include punctuation-stripped or highly specialized forms that make ordinary play feel arbitrary. Absence from a reference list is not proof that a word is invented.
- **977 additional forms are advanced vocabulary**: permitted as required words in EXPERT or explicitly selected Lexicon banks, rather than ordinary EASY–HARD boards.
- **1,658 very obscure forms** remain optional player discoveries but are not required in newly served puzzles.
- Familiar regional spellings and reviewed variants remain supported. An American-only spellchecker would reject legitimate English; this audit includes all reference dialects.
- Future dictionary additions do not automatically qualify for required puzzle words. They must appear in the audited source snapshot or be reviewed in a new snapshot.

Fresh boards carry `vocabularyVersion: 1`. A saved board without that marker retains version 0, including after restart and re-save. Completing that board returns the player to the new policy. Daily boards also carry a separate board version so older and revised daily puzzles do not compete in the same leaderboard cohort.

The physical generated banks remain unchanged. Selection filters their complete authored route, including intermediate formed and leftover words, before serving. The supported gated generators use the same policy for future replacements. Authored fallback pools were separately checked under the fresh dictionary; six invalid fallback entries were replaced and every fallback now proves a full route before serving.

## Evidence and reproducibility

Reference: [English Speller Database / SCOWL](https://github.com/en-wl/wordlist), revision `1e5b7d3a72f47a71da5d28686c1dd4b397178485`. The query uses lowercase ASCII entries across dialects, an empty category, non-abbreviation parts of speech, and variant levels through 5; minimum SCOWL size provides an editorial familiarity proxy. Spellchecker list size is not a measured player comprehension score.

The full per-word snapshot and exact query are committed in [esdb-2026-09-05.json](../mobile/scripts/vocabulary/esdb-2026-09-05.json). Its [license](../mobile/docs/licenses/ESDB-Copyright.txt) is retained. Rebuild policy with `cd mobile && npm run generate:vocabulary-policy`, then run `npm run audit:vocabulary -- ../docs/review-2026-09-05/vocabulary-bank-audit.json` and the vocabulary/fallback/bank tests.

Fifteen familiar spellings absent from the strict query have explicit reviewed exceptions: MOMMA, MOMMAS, SAUTE, SAUTEED, DJINN, SCHEMAS, DIALOGS, TSARIST, FRIER, PRICY, SPACY, FLUKEY, WHACKY, ROPEY and KIDDY. META is treated as familiar modern vocabulary, consistent with its [dictionary entry](https://www.merriam-webster.com/dictionary/meta).

Some quarantined forms are legitimate in narrower dictionaries or contexts: [ALLS](https://scrabble.merriam.com/finder/alls) and [LITTLES](https://www.merriam-webster.com/dictionary/littles) are examples. Their quarantine is a game editorial choice pending context review, not a declaration that they are fake. Reinstatement should preserve both word fairness and complete-route checks.

## Coverage and limits

The audit evaluates all 30 banks, containing 9,611 original boards. The committed [bank report](review-2026-09-05/vocabulary-bank-audit.json) records per-family coverage. An additional complete-path audit checks newly eligible boards under the fresh dictionary, rather than relying only on historical solvability tests. One EASY board lost its second route when WHATS was removed and is withheld from fresh selection. The standard-bank multi-route promise must be checked using the same dictionary that the player receives.

The stricter policy substantially reduces bank depth, particularly EXPERT Reverse Lexicon. Repetition controls can exhaust a small eligible pool sooner; this is a content-capacity limitation, not an excuse to silently serve rejected words. Future top-ups must use the supported gated generators, a sidecar review, fresh-dictionary solvability/branch checks, and the profanity audit. No legacy generator or manual edit of generated banks is part of this change.

The policy is deliberately reviewable rather than claiming that an automated word list perfectly predicts familiarity. Reader feedback and actual rejected-word reports should guide subsequent exceptions. A blind vocabulary review protocol is included in the story/playtest delivery documents.

## Quarantined forms

`ALLS`, `ALTHO`, `AMEER`, `AWAKED`, `AWEING`, `BASSETT`, `BLOWED`, `BOGY`, `BONEY`, `BONNIE`, `BUILDED`, `CALIF`, `CAYMAN`, `CAYMANS`, `CHID`, `CHOOSEY`, `DEADS`, `DIGGED`, `DOGY`, `DOPY`, `DRYEST`, `ENOUGHS`, `FORMERS`, `GASSES`, `GAYLY`, `GUMTREE`, `HALLO`, `HES`, `ILLER`, `ILLEST`, `JUN`, `LEASTS`, `LIKEST`, `LITTLES`, `LOCATER`, `LOONEY`, `MADAMES`, `MAMBOES`, `MASSE`, `MOSTS`, `MUCHES`, `NONES`, `NOS`, `PRYER`, `RENO`, `REVERY`, `SCAREY`, `SHAMMY`, `SHES`, `SHOED`, `STANDUP`, `STONEY`, `THATS`, `TREADED`, `WALLA`, `WHATS`, `WINTERY`, `WOOLY`.
