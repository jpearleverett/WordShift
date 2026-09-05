# WordShift: the house can change

This implementation follows [the editorial review](STORY_EDITORIAL_REVIEW.md). It preserves the word puzzle, thirteen residents, growing pixel house and gradual tonal descent, while giving that descent an observable cost and the player an answer that survives the ending.

## Private canon

The words sustain an unnamed presence. Ember understood enough of the invitation to owe the player an explanation; she did not understand the full cost. The presence can preserve comfort by correcting change, dissent and loss. Its affection can be real while that correction is unacceptable. Neither affection nor the arrival automatically forgives concealment.

Sloane wanted the arrival without knowing it would be harmless. Bamboo mistook an interpretation for certainty and has to revise it. Warren understands construction, discovers the seal's function later, and does not claim to have built every future room before the player. The other residents discover and respond according to their own concerns. They are not interchangeable members of an omniscient conspiracy.

There is one arrival: the midnight descent, an opening in the sky, the presence entering, the seam closing. The presence remains afterward. Its origin, ultimate nature and complete powers remain unknown. The player can establish specific effects and insist on a specific limit.

## Essential conversations

More than 2,000 existing utterances were revised across the cast, including introductions, visits, reactions, tending and the aftermath. Existing dialogue IDs and pool lengths remain stable for saved visit positions. The new durable conversation sequence is scheduled around ordinary play. Optional visits retain their separate voices. Closing a conversation saves its current page and releases the pending gameplay action; it does not consume unseen pages or select a response. Older missed scenes are explicitly retrospective. An armed finale prioritizes the complete council explanation even when a player skipped earlier visits.

| Conversation | Purpose |
| --- | --- |
| A cup by the fire | An ordinary, player-chosen attachment before the mystery dominates. |
| PLUM | Establish Axel's actual loss when he has been recruited. |
| Echo | Let the player and residents examine what words do. |
| Supper | Let affection happen in a shared scene. |
| Plan | Separate the new rooms from the older structure beneath them. |
| Record | Let an unwelcome original survive a correction. |
| Seeds | Make Thyme's confidence something the player can protect. |
| Promise | Let the player choose Ember's proximity. |
| Returned | Observe preservation's benefit and cost; use the cup if Axel's earlier scene did not occur. |
| Council | Explain the final word's two boundaries before asking the player to act. |
| After | Observe the chosen boundary working, without a universal declaration of peace. |
| Reply | Permit anger, hope, uncertainty or quiet. |
| Old mark | Let a boundary and a kept record leave a trace in New Cycle. |

Scene speakers and concrete callbacks adapt to the recruited roster and delivered memories. Things We Kept stores the player's actual conversation transcript and answer. Earlier conversations makes phase-appropriate regular dialogue available without changing live visit progression or revealing future chapters.

## The last arrangement

The authored board begins with `SPARK / CARED / SCARE / SHARE / CARVE / CARED / CLOSE`. It retains the existing shift rules. Exhaustive traversal using the game's real dictionary and locked-letter rule verifies two complete routes and no dead ends.

The shared path reaches `CARVED / CLOSE`. Moving D produces CLOSED, keeping one private room where an uncorrected thought can remain. Moving R produces CLOSER, keeping an outward road so staying can be a choice. Both routes are valid and receive the same gameplay rewards. The council and the free final-step hint explain the meanings; the hint does not pick an answer.

Only a committed result from this authored board records the boundary. A resumed legacy final board remains valid and receives a neutral aftermath rather than an invented decision. Existing post-arrival saves enter the new aftermath honestly without replaying the arrival.

## Delivery and persistence

Narrative seeds and callbacks commit when delivered, not when peeked for a queued page. Coordinated discoveries can have two distinct recruited witnesses. Late Phase-4 recruitment can still offer a personal choice. Phase 5 does not introduce a fresh pre-arrival choice.

The core story has its own serialized AsyncStorage record. Cloud saves include it, restores invalidate its cache, Reset All clears it, and New Cycle carries forward the boundary and kept-record consequence. Save failures leave the visible answer available for retry. Victory exits wait for ending persistence before scheduling a conversation or next board. Core conversation handoffs suppress adjacent interstitials and promotional nudges.

## Visual direction

The house remains pixel art with dimensional lighting. New ending illustrations distinguish a private room, an outward road and a shared table. The road has separate moonlit-arrival and dawn-aftermath treatments; provenance and generation prompts are in [the story asset README](../mobile/assets/story/README.md). Cinematics pair an art stage with readable, scrollable text and explicit speaker portraits. The arrival, aftermath and New Cycle advance at the player's pace, including under reduced motion.

Tall-house air gains restrained clouds, haze and later-phase stars above the existing painted horizon. The sky and foundation keep their original shared pan geometry. Recess shading, floor reflections and timber bevels give rooms depth beneath moving resident sprites. After the arrival, interiors recover warmth while the exterior remains a cool night. Low-tier devices use fewer layers; decorative elements do not intercept input.

The puzzle now shares the house's material language: painted clay, sage, lilac and ochre tokens; warm paper rows; timber edges; a restrained forest backdrop; and quieter particles. Source-letter ink adapts to equipped cosmetic palettes and meets a 4.5:1 contrast check across the catalog. Existing purchased materials retain their individual finishes.

Distinct bell and answering cues occur with the actual ensemble actions, rather than implying those actions in retrospective text. Essential audio cues do not replace readable dialogue.

## Reviewed visuals

| View | Screenshot |
| --- | --- |
| Painted puzzle tokens and controls | [Puzzle](visual-review/painted-puzzle.png) |
| Warm rooms after the arrival | [House](visual-review/house-after.png) |
| First essential conversation | [A cup by the fire](visual-review/first-memory.png) |
| CLOSED arrival | [Private room](visual-review/closed-arrival.png) |
| CLOSER arrival | [Moonlit road](visual-review/closer-arrival.png) |
| CLOSER aftermath | [The road at dawn](visual-review/closer-aftermath.png) |
| Saved story journal | [Things We Kept](visual-review/story-journal.png) |
| Small screen with enlarged browser text | [Scrollable conversation](visual-review/small-screen-large-text.png) |

These are actual web renders. They contain late-game spoilers. The house and utility views use seeded progress to inspect specific states.

## Validation

- Full independent `npm run typecheck`: passed.
- Full Jest suite: **138 suites and 3,817 tests passed**, with no skipped tests and a clean exit. Three existing suites now cancel their telemetry debounce in teardown so it cannot import modules after Jest closes the environment.
- ESLint with the repository configuration across **355 files: zero errors**. The configured rules report 1,202 warnings, including React Native animation/ref patterns, effect resets and existing cleanup items. The new hook test harness was corrected to satisfy hook rules.
- Pointer-driven web playthroughs completed both authored final words and all nine Arrival passages for each. The CLOSER run continued through an actual subsequent puzzle, all five After passages, the essential After conversation and the angry Reply. Reload preserved `boundary: release`, the completed aftermath and `reply: angry`.
- Reviewed the house in phases 0, 2, 4 and 5, plus the journal/archive, statistics, settings, store and offering pit. The main inspection viewport was 390×844. Conversation and puzzle checks also used 320×568; browser text enlarged to 150% remained scrollable with reachable conversation controls. Cinematic playthroughs used reduced motion and explicit advancement.
- Persistence regression coverage includes cold reload, failed-save retry, sparse visits and rosters, interrupted callbacks, later-cycle legacy saves, final-board migration, New Cycle carryover, cloud restoration and Reset All.
- `git diff --check`: passed. Generated puzzle banks, dependencies, app keys and monetization configuration are unchanged.

The VM has 2 GB of RAM. TypeScript ran with a 1,536 MB Node heap. The all-at-once lint process exhausted VM memory; the same ESLint configuration was then applied in separate file batches, without disabling rules or excluding additional files. Jest used the repository suite through `npm test` with a temporary configuration enabling ts-jest isolated transpilation; the repository's test configuration was not changed. Independent full TypeScript checking supplies the type validation omitted by that temporary transform setting. The no-dash test uses a typed compiler `require` to keep ESLint from expanding TypeScript's large export namespace; its assertions are unchanged. No tests were skipped to fit memory.

These checks use web rendering, seeded progress checkpoints and local persistence. External backend requests were blocked during synthetic browser QA. Chrome's autoplay restriction appeared on reload; story and save state continued correctly. Physical Android performance, native font scaling, audio, purchases and ad presentation still require the owner's signed internal-testing build. Audience playtesting is needed to judge the mystery's clarity and emotional impact.
