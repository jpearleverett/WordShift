# Story editorial review — 6 September 2026

The code/content pass is complete. Reader comprehension and spontaneous voice recognition still require people who have not read the script.

## Changes and evidence

The base corpus contains **1,742 distinct dialogue IDs**, covering **13 residents in all five pre-arrival phases**. This pass edited **202 base speeches**, including every remaining speech longer than 60 words, plus **20 coordinated-event speeches**, **two Council contributions**, and **one Arrival scene**. The 222 base/coordinated changes reduce those passages from **15,698 to 6,785 words**. Three subsequent continuity fixes give Vesper a shaded lantern after it begins glowing and stop Warren implying he excavated a newly added burrow for thirty years.

The saved ID, phase, animal and question-route coordinates remain stable. Each resident still has 134 base entries: 24 at phase 0, 28 at phase 1, 22 at phase 2, 30 at phase 3 and 30 at phase 4. A shortened speech replaces its old wording at the same index; existing progress is not rewound. Delivered journal memories remain their saved text.

- [Complete before/after record for the 222 base/coordinated edits and six supplementary scene/continuity edits](review-2026-09-05/story-editorial-changes-2026-09-06.json).
- [Final structural corpus audit](review-2026-09-05/story-corpus-audit-2026-09-06.json).
- Reproduce the structural/pacing check: `cd mobile && node scripts/tools/auditStoryCorpus.mjs`.

The audit checks unique IDs, roster/phase coverage, nonempty speeches and a 60-word review budget. It is a structural guard, not a measurement of whether a person recognizes a voice or understands an ending.

## Resident review

| Resident | Voice and action retained | Concrete edit and distinction |
| --- | --- | --- |
| Ember | Hospitable fox; jokes and tea can conceal an uncomfortable answer. | Gives up the table-standing surprise in her own voice. A cold grate becomes a kettle moved to the floor and a joke wearing thin. Her referral admits she made tea instead of asking Warren again. |
| Panko | Practical cook, exact tastes, irritation expressed through kitchen work. | The enchanted loaf has a good crust and is infuriating. Flour around the moving tureen becomes evidence. A withheld spoon makes her hesitation physical. |
| Archimedes | Sources, citations and disputed interpretations; formal precision with dry jokes. | Independent witnesses and a better test replace an atmospheric lamp paragraph. A crossed-out margin stays legible. His question asks for Fennick's exact words, not an improved translation. |
| Axel | Immediate delight, splashes, small experiments, emotional openness. | Waves at a distant vision of his own room; a warm pawprint becomes two ordinary five-toed hands. New punctuation restores breath without removing his excitement. |
| Sloane | Long experience, slow practical noticing, understated humor. | Measures the leaf's drips against their own breathing. Misses the frogs that made the clearing feel quiet. Offers a branch during fear without promising the player's ending. |
| Fennick | Reports, bearings, hearing limits and the cost of vigilance. | Four camp bearings and a sky bearing fit in one report. Requests sleep and another pair of ears. Stops assuming that everybody must hear what he hears. |
| Chill | Sparse administrative vocabulary, short conclusions, restrained feeling. | An acceptable suggestion has an unacceptable signature. A moving marble needs a revised containment proposal. Repeated ink blots expose the ledger's false calm. |
| Warren | Builder's inspection, load, grain, joints and useful tools. | Takes the lamp down to a disappearing soil sample. A flour ring records movement. In Council, the resident tries the latch before Warren declares the door finished. |
| Thyme | Specific counting and garden records; fear does not erase competence. | Keeps the old bee dance beside the changed one, records an unchosen planting decision, and asks for Bamboo's actual answer. Removed a referral that immediately told the player not to ask. |
| Bamboo | Reflective attention, plain physical adjustments, awareness of their own persuasive habits. | The cushion moves, the window opens, a blossom occupies a hand that needed freeing. Council makes room by moving furniture instead of adding another abstract explanation of permission. |
| Vesper | Watch intervals, positions and boundaries of sight; a careful observer rather than a second book scholar. | Cut 52 base speeches overall. Retains the rail, chalk, family log, lantern and named stars. Reports the urge to keep watching without treating inherited eyes as inherited agreement. |
| Tock | Taps and pauses, timber/bell craft, an outsider's pleasure at being answered. | Cut 66 base speeches overall. Retains the call sign, seven-beat private rhythm, chalk hollows, rope practice and memory of closed shutters. Recognition remains tempting; friendliness does not prove kindness. |
| Moss | Grower's seasons, baskets, soil, old waiting and bodily humor. | Cut 43 base speeches overall. Retains the mast, bowl, seedlings and ninety-year call. Removes claims that the player's puzzle play was informed agreement. Empty baskets and ordinary watering carry the uncertainty. |

The first ten voices already had concise phase-0 and phase-4 scaffolding. The long late-trio passages were the disproportionate pacing cost: 149 of the 150 remaining base speeches over 60 words. Those passages were edited individually, preserving their observations and relationship beats rather than truncating a final sentence automatically. All base speeches now fit the 60-word review budget.

## Council, Arrival and aftermath

Council retains the complete explanation of **CLOSED** and **CLOSER**, the truthful missing-record bridge, the private seed choice, and Ember's agreed distance. The two added resident beats show a cushion moved and a latch tested. Neither branch receives a moral score or greater reward.

Arrival still demonstrates the selected boundary before the aftermath: warmth stops at the private door, or leaves a road outward. Its ordinary spoon/cup sound replaces one sentence restating a principle. Roster-conditioned participants, an original saved record, an unbuilt house and the exact final word still control the variants. The player advances the essential passages at their own pace.

The full-reader aftermath stays ordinary breakfast, a squeaking hinge and optional grief. The sparse/legacy aftermath keeps its missing-context explanation. The post-arrival voice pools preserve ordinary work, disagreements and individual wants. Vesper now shades the lantern; it no longer incorrectly “remains unlit” after the earlier glowing-lantern sequence.

## What still needs readers

Use the existing [five-reader protocol](STORY_PLAYTEST_PROTOCOL.md). Measure both endings and a sparse-roster route, then use unlabelled excerpts from the table's examples for voice recognition. Ask for the reason behind an attribution; this is a writing test, not a memory exam.

Only these perceptual results remain unknown: whether four of five unfamiliar readers can explain the two boundaries, whether the late trio feel distinct in play, whether the shorter speeches preserve suspense, and whether a player chooses to read optional conversations between puzzles. Those outcomes cannot be established by a corpus script or by the author rereading the text.
