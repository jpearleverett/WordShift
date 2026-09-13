# WordShift: the house can change

> Current behavior reviewed against `main` at `6f96ebb` on September 13, 2026. Build configuration, merged fixes and validation limits: [current build](CURRENT_BUILD.md). The original implementation validation below is historical evidence, not a test report for the latest Android bundle.

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
| Witness | Choose whether the first written account is shared with the household or kept private. |
| Supper | Let affection happen in a shared scene. |
| Plan | Separate the new rooms from the older structure beneath them. |
| Shelter | Choose a practical precaution: mark the outward road or fit a latch before the final boundary is known. |
| Record | Let an unwelcome original survive a correction. |
| Seeds | Make Thyme's confidence something the player can protect. |
| Promise | Let the player choose Ember's proximity. |
| Returned | Observe preservation's benefit and cost; use the cup if Axel's earlier scene did not occur. |
| Council | Explain the final word's two boundaries before asking the player to act. |
| After | Observe the chosen boundary working, without a universal declaration of peace. |
| Reply | Permit anger, hope, uncertainty or quiet. |
| Old mark | Let a boundary and a kept record leave a trace in New Cycle. |

Scene speakers and concrete callbacks adapt to the recruited roster and delivered memories. Things We Kept stores the player's actual conversation transcript and answer. Earlier conversations makes phase-appropriate regular dialogue available without changing live visit progression or revealing future chapters.

## Getting to know later residents

Warren (wombat), Thyme (rabbit), Bamboo (red panda), Vesper (tarsier), Tock (aye-aye) and Moss (kakapo) have a separate three-visit acquaintance arc. For a new arrival first met in Phase 2 or later, the visits introduce the resident, offer ordinary company, then connect that personal detail to the house's current circumstances. These pages select the resident's existing introduction, regular dialogue and aftermath prose verbatim; they do not replace the manuscript or rewind the regular dialogue cursor.

The selected words, visit and current page persist in `wordshift_animal_acquaintance`. Leaving a visit defers the remaining pages. Existing friends can opt in to the company and current-concern visits without being introduced as new arrivals again. A visit reopened after the Arrival uses its Phase-5 setting rather than preserving a prediction about an event that has already happened.

The tea/cocoa decision is one of several authored choices. The story spine also includes sharing or keeping the first account, a road or room precaution, the kept record, a confidence about leaving, Ember's proximity and the player's reply after the Arrival; availability and wording depend on the recruited cast and delivered memories. Separately, each resident has one personal ask/refuse choice offered after the relevant Phase-3 material, with late availability through Phase 4 and callbacks that require a saved answer. Phase 5 does not manufacture a missed pre-arrival decision.

Resident choice pages keep the speaker and full question above two equally weighted, wrapping answers. “Come back later” leaves the question unanswered. Controls lock as soon as saving begins; a save failure exposes a retry instead of advancing to a response that was never stored. The response can repeat the player's own words in a “You said” panel. This is relationship and narrative consequence, not an amber advantage for a preferred answer.

Implementation: `animalAcquaintance.ts`, `dialogue/animalAcquaintanceContent.ts`, `dialogueChoices.ts`, `storySpine.ts`, `useDialogueFlow.ts` and `DialogueChoicePage.tsx` under `mobile/src/`.

## The last arrangement

The authored board begins with `SPARK / CARED / SCARE / SHARE / CARVE / CARED / CLOSE`. It retains the existing shift rules. Exhaustive traversal using the game's real dictionary and locked-letter rule verifies two complete routes and no dead ends.

The shared path reaches `CARVED / CLOSE`. Moving D produces CLOSED, keeping one private room where an uncorrected thought can remain. Moving R produces CLOSER, keeping an outward road so staying can be a choice. Both routes are valid and receive the same gameplay rewards. The council and the free final-step hint explain the meanings; the hint does not pick an answer.

Only a committed result from this authored board records the boundary. A resumed legacy final board remains valid and receives a neutral aftermath rather than an invented decision. Existing post-arrival saves enter the new aftermath honestly without replaying the arrival.

## Delivery and persistence

Narrative seeds and callbacks commit when delivered, not when peeked for a queued page. Coordinated discoveries can have two distinct recruited witnesses. Late Phase-4 recruitment can still offer a personal choice. Phase 5 does not introduce a fresh pre-arrival choice.

The core story has its own serialized AsyncStorage record. Cloud saves include it, restores invalidate its cache, Reset All clears it, and New Cycle carries forward the boundary and kept-record consequence. Save failures leave the visible answer available for retry. Victory exits wait for ending persistence before scheduling a conversation or next board. Core conversation handoffs suppress adjacent interstitials and promotional nudges.

## Ceremonies and interrupted progression

Home progress retains an ordered `pendingCeremonies` queue for phase transitions, the completed house, Arrival, post-arrival and New Cycle. A ceremony is consumed only after completion or the player's confirmed Skip, with the acknowledgement saved before the next queued event opens. Ordinary navigation, a stale completion callback or a backgrounded timer cannot consume a different scene. A failed acknowledgement holds the handoff for a save retry.

Cold restart replays an unfinished queued ceremony from its beginning. It does **not** restore an exact passage cursor. Backgrounding or a temporary save overlay within the same mounted presentation preserves the current page and scroll position. Legacy saves do not receive a retrospective queue of every previously completed phase.

Skip and Android Back first open a confirmation. Continue has a 350 ms duplicate-tap guard. Arrival, aftermath and New Cycle start in manual reading mode. Ordinary phase and house scenes can advance on their authored timing; touching the text, beginning a scroll, or using Continue hands subsequent advancement to the reader. Reduced motion changes effects, not the time available to read.

Mode-unlock notices remain pending until their last page is acknowledged. Dialogue opening and page advances have session ownership guards; an older asynchronous request cannot replace a newly opened conversation. Puzzle generation and rewarded victory claims use corresponding ownership and persistence protections. The latest regression evidence and native verification still required are recorded in [current build](CURRENT_BUILD.md).

## Visual direction

The house remains pixel art with dimensional lighting. New ending illustrations distinguish a private room, an outward road and a shared table. The road has separate moonlit-arrival and dawn-aftermath treatments; provenance and generation prompts are in [the story asset README](../mobile/assets/story/README.md). Every ordinary phase-transition passage has authored art, using wide or closer views of the table, private room and road. Cinematics pair that art stage with readable, scrollable text and explicit speaker portraits when the scene names a participant. The arrival, aftermath and New Cycle advance at the player's pace, including under reduced motion.

Tall-house air gains restrained clouds, haze and later-phase stars above the existing painted horizon. The sky and foundation keep their original shared pan geometry. Recess shading, floor reflections and timber bevels give rooms depth beneath moving resident sprites. After the arrival, interiors recover warmth while the exterior remains a cool night. Low-tier devices use fewer layers; decorative elements do not intercept input.

The puzzle now shares the house's material language: painted clay, sage, lilac and ochre tokens; warm paper rows; timber edges; a restrained forest backdrop; and quieter particles. Source-letter ink adapts to equipped cosmetic palettes and meets a 4.5:1 contrast check across the catalog. Existing purchased materials retain their individual finishes.

All thirteen rooms have five amber purchase steps: one decoration, one deepening and three attunement levels. Deepening and attunement each require the decoration; attunement does not require buying the deepening first. Room-specific coordinates in `roomUpgradeVisuals.ts` place props on their actual floor, table, wall, hanging or water surface. A deepening can add or replace a prop, or change the existing room through an effect. Light sources and marks belong to each room's art rather than a shared center glow. The paid `purchaseHouseUpgrade` path saves amber, ledger and ownership in one storage transaction, and checks the requested attunement level before charging.

Fox retains ten individual walk frames. Eleven other residents have eight-frame atlases; axolotl retains its existing movement. Fennec's left-facing idle/speaking/robed art is normalized separately from its right-facing walking atlas. Walking frames run in Phases 0–3 when animation settings and device tier permit; robed phases retain their existing glide. Provenance and rebuilding instructions are in the [walk source README](../mobile/assets/raw/animal_walk_sheets/README.md).

Distinct bell and answering cues occur with the actual ensemble actions, rather than implying those actions in retrospective text. Essential audio cues do not replace readable dialogue.

## Original implementation visual review (historical)

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

## Original implementation validation (historical)

The numbers and environment details in this section describe the earlier implementation pass. They are retained as evidence of that pass, not current suite totals or a claim that the latest native build passed these checks. Use [current build](CURRENT_BUILD.md) for the latest recorded validation.

- Full independent `npm run typecheck`: passed.
- Full Jest suite: **138 suites and 3,817 tests passed**, with no skipped tests and a clean exit. Three existing suites now cancel their telemetry debounce in teardown so it cannot import modules after Jest closes the environment.
- ESLint with the repository configuration across **355 files: zero errors**. The configured rules report 1,202 warnings, including React Native animation/ref patterns, effect resets and existing cleanup items. The new hook test harness was corrected to satisfy hook rules.
- Pointer-driven web playthroughs completed both authored final words and all nine Arrival passages for each. The CLOSER run continued through an actual subsequent puzzle, all five After passages, the essential After conversation and the angry Reply. Reload preserved `boundary: release`, the completed aftermath and `reply: angry`.
- Reviewed the house in phases 0, 2, 4 and 5, plus the journal/archive, statistics, settings, store and offering pit. The main inspection viewport was 390×844. Conversation and puzzle checks also used 320×568; browser text enlarged to 150% remained scrollable with reachable conversation controls. Cinematic playthroughs used reduced motion and explicit advancement.
- Persistence regression coverage includes cold reload, failed-save retry, sparse visits and rosters, interrupted callbacks, later-cycle legacy saves, final-board migration, New Cycle carryover, cloud restoration and Reset All.
- `git diff --check`: passed. Generated puzzle banks, dependencies, app keys and monetization configuration are unchanged.

The VM has 2 GB of RAM. TypeScript ran with a 1,536 MB Node heap. The all-at-once lint process exhausted VM memory; the same ESLint configuration was then applied in separate file batches, without disabling rules or excluding additional files. Jest used the repository suite through `npm test` with a temporary configuration enabling ts-jest isolated transpilation; the repository's test configuration was not changed. Independent full TypeScript checking supplies the type validation omitted by that temporary transform setting. The no-dash test uses a typed compiler `require` to keep ESLint from expanding TypeScript's large export namespace; its assertions are unchanged. No tests were skipped to fit memory.

These checks use web rendering, seeded progress checkpoints and local persistence. External backend requests were blocked during synthetic browser QA. Chrome's autoplay restriction appeared on reload; story and save state continued correctly. Physical Android performance, native font scaling, audio, purchases and ad presentation still require the owner's signed internal-testing build. Audience playtesting is needed to judge the mystery's clarity and emotional impact.
