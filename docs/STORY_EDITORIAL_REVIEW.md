**WordShift: complete story and dialogue editorial review**

Reviewed against the local `main` checkout on 5 September 2026. This is an assessment and proposed revision direction; it does not change the game or establish new canon. Full spoilers follow.

**My assessment: the game has a strong artistic identity, but needs substantial structural revision to deliver the emotional impact its premise promises.**

The domestic vocabulary is its greatest asset: a kettle, a fish, a borrowed book, a wall someone repaired, a place kept warm. The shift from hospitality to ritual makes the familiar game loop disturbing. The animal companions have enough specificity to support real affection. The use of the player's actual words is especially valuable.

The principal weakness is dramatic movement. Across many conversations, the same discovery recurs: something is listening; the house is preparing; the animals have a purpose; your words are bringing it closer. The finale confirms that discovery, then the animals explain how peaceful they feel. There are compelling individual passages, but too few consequential encounters in which a relationship changes before the player's eyes.

My recommendation is to preserve the premise, setting, cast, and strongest domestic details while rebuilding the central sequence of discoveries, confrontations, and choices. Adding more ominous dialogue would currently amplify the repetition. A memorable version needs sharper differences between what characters want, a consequential final discovery, and a small number of actions whose meaning the player can understand and influence.

“Groundbreaking” is an audience judgment, not something a review can certify. The practical target is a story players discuss through specific experiences: “I helped him bring the fish back, and then…” or “She remembered that I had refused.” Those are stronger foundations for lasting impact than “the cute animals were secretly a cult.”

**The scope includes both the script and the way the game delivers it.**

The review covers the 1,742 base dialogue entries, introductions and catch-up material, post-revelation dialogue, exhaustion and tending material, word and variant reactions, cross-animal references, coordinated events, narrative seeds and callbacks, player choices, onboarding, phase cinematics, offerings, puzzle narration, the final board, the Keeper's Record, and New Cycle. The delivery review traces awareness tiers, recruitment, conversation budgets, cooldowns, and ending conditions.

This is a source-based editorial and implementation review, not a physical-device playthrough or an audience study. The attempted targeted test run could not start because `npm` was unavailable in the execution environment. Findings below distinguish source-confirmed inconsistencies from interpretation and proposed new material. No gameplay files were edited.

Useful source entry points: [base animal dialogue](../mobile/src/services/dialogue/animalDialogueBase.ts), [introductions and post-revelation dialogue](../mobile/src/services/dialogue/animalDialogueIntro.ts), [cross-references, coordinated events, and seeds](../mobile/src/services/dialogue/animalDialogueNarrative.ts), [choices](../mobile/src/services/dialogueChoices.ts), [shared narration](../mobile/src/services/phaseNarrative.ts), [cinematics](../mobile/src/services/phaseEvents.ts), and [delivery flow](../mobile/src/hooks/useDialogueFlow.ts).

**The existing story, from beginning to end, has a clear mood progression and a less developed chain of dramatic discoveries.**

| Passage | What the player encounters | Editorial assessment |
|---|---|---|
| Opening puzzle and invitation | An unnamed warm guide helps with the first puzzle; Ember appears afterward. Words go into the pit and return as amber to build rooms. | A good opening connection between the verb, the house, and its first friend. Ember helping before being invited is a useful understated mystery. |
| Bright days | Animal introductions, comforts, jokes, domestic routines, and already numerous supernatural hints. The first free-play victory guarantees a `WE SEE YOU` glitch. | Affection has promising material, but the combined channels announce the horror early. A player can identify the genre before becoming attached to a particular friendship. |
| Curious thoughts and deeper questions | Warmth behaves strangely; words recur in books, water, dreams, and records; the building responds to offerings. | The evidence accumulates, but most clues support the same hypothesis. More encounters should rule out a plausible explanation or expose a disagreement. |
| Growing shadows | The animals connect their observations, reveal personal histories, struggle with approaching change, and offer curiosity/refusal choices. | This contains much of the best emotional writing. It needs protected delivery and more direct interaction. Ahead-of-time animal phases can make explicit ritual knowledge available before the global reveal. |
| The Horizon and robes | Ritual roles become explicit. Earlier comforts are reinterpreted as preparation or recruitment. | The aesthetic reveal works conceptually. The dramatic question should now become what the arrival costs, who knew, and whether the friends can still be trusted. Too much current dialogue continues explaining that the arrangement exists. |
| Completion and the wait | The full-house route celebrates all thirteen keepers; subsequent puzzles build a held-breath approach. | Eight dwell wins provide room to experience the change, but many dwell lines describe equivalent stillness. Use part of this window for a confrontation and an attempted intervention. |
| Final board and Arrival | A marked, quiet final puzzle can echo a real dread word. Undo is refused. The shadow descends; actual words can be named in the cinematic. | Strong machinery for a personal climax. The scene itself mostly summarizes a known truth, and important animal actions are left offscreen. |
| After and ongoing play | The next eligible win brings the post-revelation state. Animals find peace; memories of the player enter dialogue. Tending and mastery continue. | The contrast is effective, but the story needs observable evidence of what peace preserves and what it removes. The player also needs room to remain angry or unconvinced. |
| New Cycle | The bright days return with the house retained and half-memories of prior events. | A promising afterlife for the story. It needs a new dramatic question beyond recognizing the repetition. |

Timing is conditional. The minimum solve floors for the first four transitions are 12, 28, 62, and 90, alongside weighted progression and transition confirmation. They are not guaranteed chapter boundaries for every player. On the intended completed-house route, the finale can arm at 115, play around 116, and reach After around 117. The listed phase-5 floor of 120 is not enforced by the actual `markPostRevelation()` path. The game also permits the ending with an unfinished house after the solve-floor fallback and dwell requirement. See [ending orchestration](../mobile/App.tsx#L3084).

For scale, 90 puzzles means 45 days at two puzzles a day, and 120 means 60 days; these are arithmetic illustrations, not retention predictions. A mystery spread across that calendar needs memorable incidents and easy recall. A player may not remember which of ten characters mentioned a warm floor weeks earlier.

**The twist needs two distinct discoveries: the purpose of the ritual, then the consequence of completing it.**

The current first discovery is sound: the house is a temple, friendship has also been recruitment, and the puzzle loop is a ritual. The problem is that the text frequently discloses it before the major reveal. The coordinated events explicitly connect the words to the arrangement and name the animals' offices. These events use weighted progress, so their numbers are not literal guaranteed puzzle appointments. Ember's ordinary third-phase dialogue also explains that something ancient is coming and the words are being arranged below the house.

By the time the Arrival says “Every word you ever formed was an incantation,” a careful reader is likely waiting for the next answer. What will happen to Axel? Can Thyme still leave? Did Ember protect me or use me? What does being kept actually mean?

The final line, “It was always coming. You just gave it the words,” also pulls against Ember's assertion that the player is the reason it can come at all. This can be reconciled: its desire or eventual approach may be inevitable, while this particular invitation depends on the player. That distinction needs to be legible. Otherwise the story both blames the player and declares the outcome inevitable.

My recommended direction, **as a new proposal**, is to develop the tension already present between preservation and freedom: the presence really does keep what the animals love, but keeping something perfectly can stop it changing, leaving, disagreeing, or becoming something else. The animals' affection remains real. Their error is treating their own longing for safety as permission to decide for everyone.

That gives the familiar shifting mechanic thematic force. In a puzzle, moving a letter changes the meanings on both sides. In the house, helping someone keep what they love may change someone else's possibilities. The final discovery becomes a concrete cost of the bargain, and the player's last meaningful act concerns a boundary or a relationship.

This does not require a name, origin story, taxonomy, or villain speech for the entity. Keep the cosmic uncertainty. Establish what happened to a particular friend clearly enough that players can disagree about whether it was worth it.

Other coherent directions remain possible. An unequivocal horror ending would establish an irreversible loss of self. A disturbing but compassionate ending would demonstrate that the presence can accept a meaningful refusal. The current script contains evidence for both, but rarely stages the encounter that would make their tension deliberate.

**Give the mystery a sequence of testable questions.**

At present, repeated warmth, listening, dreams, and rearrangement are atmospheric corroboration. They seldom force a new interpretation. A stronger clue sequence could use existing characters and objects:

| Step | Player's plausible explanation | Evidence or action that changes it |
|---|---|---|
| 1 | This is an enchanted house that responds to care. | An ordinary act visibly helps an animal. Keep the benefit sincere. |
| 2 | The new rooms are causing shared disturbances. | The same player-formed word appears independently in a book and the tank. Let the player compare the actual word. |
| 3 | The friends are trying to protect the house from something outside. | Warren's plan or Vesper's sightline shows that one supposed defense directs attention inward. |
| 4 | Some friends knew; others were deceived. | A confrontation establishes who commissioned what, who concealed it, and who misunderstood. |
| 5 | Completing the ritual will grant the thing they most want. | PLUM's return or a rewritten ledger demonstrates both a benefit and a disturbing limitation. |
| 6 | The only options are total acceptance or losing everyone. | A character attempts a small refusal. The player discovers whether the invitation can preserve one boundary. |

The latter steps are proposed scenes, not existing implementation. The crucial editorial rule is that each scene changes a belief, relationship, or available action. A fresh description of the same approaching presence does not fill that role by itself.

Preserve selected clues in a small, factual journal: the line actually heard, the word actually formed, the discrepancy the player observed. The existing ledger/gallery gives this a natural home. Avoid adding an exhaustive lore encyclopedia or another checklist. A few durable memories would help players returning after several days.

**The animals need different relationships to the truth.**

The cast already has distinct imagery. What it needs most is different moral positions. “I knew all along, I wanted this, and now I am serene” cannot carry thirteen equally interesting arcs.

Before rewriting, make a private canon table for every animal: what they knew at recruitment, what they believed incorrectly, what they concealed, whom they were protecting, which scene changed their belief, and what they choose after learning more. Knowledge, belief, and willingness are different facts. Awareness tiers in the code should follow this dramatic map.

| Animal | Preserve | Main revision |
|---|---|---|
| **Ember** | Hospitality, jokes made under pressure, the kettle, protective affection, inherited flame-reading. Her promise that the presence must go through her to reach the player is a powerful commitment. | Make her the emotional center of the betrayal. Establish exactly what she knew. Give her a scene where the player challenges the promise and she must act on it, apologize, or knowingly break it. Reserve some warmth for ordinary friendship, outside tutorials and sales introductions. |
| **Panko** | Ant soufflé, practical hospitality, kitchen pride, her grandmother's objects, feeding other animals. | Let feeding become an ethical problem: does love mean always giving someone what they ask for? Give her one dish she will not prepare or one guest she will not turn into an ingredient. Reconcile the spoon/kept theology with old reactions saying the animals are the meal. |
| **Archimedes** | Filing by affection, scholarly vanity, a notebook that preserves who people were, reading a book that has no ritual purpose. | Give him an interpretation that is plausible and wrong, then an admission that costs him authority. He should distinguish evidence from certainty. Protect “I was fond of you … That part was mine” as a possible cornerstone of accountability. |
| **Axel** | Bubbles, the new pink toe, GLOW and PLUM, gentleness, being a window, uncertain resurrection. | Promote PLUM's life, death, and return into a protected mini-arc. Let the player know the fish before losing him. Let the returned fish do one observable thing that makes its identity uncertain. Axel should want the comfort enough that the player understands his acceptance. |
| **Chill** | Dry administrative humor, the good chair, helping another animal regulate their breathing, unease hidden in paperwork. | Make the ledger an investigative object. One entry he wrote should visibly disagree with what the house wants recorded. His decision to retain or erase it can be his action. Avoid treating his calm only as sinister affect or turning the player's refusal into irrelevant paperwork. |
| **Fennick** | Sensory precision, the burden of hearing, his bond with Axel, the private duet with Vesper. | Give him a warning he must decide to pass on. His wish for quiet makes the bargain emotionally credible. Let the player experience a silence or an altered sound rather than hearing another explanation that it is closer. |
| **Sloane** | Wry patience, Gerald, her long perspective, and the candid admission that she wanted this without knowing it meant no harm. | Keep her the difficult willing participant. Make someone confront the difference between patience and allowing harm. Give her one act of urgency; movement matters when this particular character finally chooses it. |
| **Warren** | Craft pride, practical speech, labor, warm stone, bracing, the relationship between foundations and rooms. | Give him a consistent knowledge history and a construction decision with consequences. Distinguish structural support from a seal. A passage he preserves against the plan would give him agency beyond explaining the building. |
| **Thyme** | Precise observation, lists, seed tin, escape routes, tenderness, the residual flutter she calls the last thing that is only hers. | Make her observations useful and sometimes correct. Do not make the disappearance of anxiety the sole proof of a happy ending. Let her test whether safety still includes the right to leave or refuse. Resolve the explicit contradiction about whether she asked Bamboo why they were unafraid. |
| **Bamboo** | Practical stillness, the view of the whole house, a loose reed, leaving room in the pattern. | Move beyond being the serene authority who explains why acceptance is wisdom. Give them a belief that Thyme's experience challenges. A guide should be able to admit “I don't know” and still accompany someone. |
| **Vesper** | The watch, ancestral obligation, the named star, her private relationship with Fennick, choosing the watch after the arrival. | Clarify what changes if she looks away and let that fact matter. Her late arrival needs an immediate personal stake and reachable choice, not a compressed lore lecture. Distinguish her watching from Thyme's witnessing and Fennick's listening. |
| **Tock** | Exile, being treated as an omen, affection for the bell, his wish that another misunderstood creature might find a home. | His wound is one of the clearest reasons anyone would welcome the presence. Build the rope/bell decision into the actual finale and let us witness the ring. Trim explanatory tail sentences so the best images can land. |
| **Moss** | The old caller who has waited for an answer, patience with growth, the rooftop garden, the real emotional weight of being heard. | Establish the unanswered call immediately on recruitment, then distinguish being answered from being understood. Give his true call an actual place in the climax. Clarify germination versus the decades needed for a mature tree. |

These are not recommendations for thirteen new branching campaigns. A few central characters should carry the dramatic spine, with the rest enriching and complicating it. I would anchor the main conflict in Ember and Thyme, use Axel for the concrete temptation, and let Archimedes or Warren establish the causal evidence. Tock and Moss can give the arrival its audible payoff. All thirteen can remain valuable without equal word counts or equal narrative duties.

**Let relationships happen in front of the player.**

Cross-references frequently contain excellent care: food delivered, a scarf made, a cup set out, a friend sitting beside a tank until the lamp dies. These establish a community beyond the player. But many important events arrive as reports about yesterday.

Add a handful of short shared scenes using the existing portraits and dialogue surface. An interrupted supper. Thyme asks a question Ember tries to answer for Archimedes. Warren arrives with a plan no longer matching his tunnel. Panko refuses to clear an unused place setting. Fennick hears Tock's bell before anyone has touched the rope.

These scenes should have friction as well as tenderness. Let a friend misunderstand another, borrow without asking, evade an apology, or make a joke that fails. If every disagreement dissolves immediately into a graceful observation, the affection becomes less convincing. Small ordinary conflicts also establish what is missing if the arrival removes disagreement.

**The dialogue often excels at imagery and overuses the same underlying rhythm.**

An effective recurring pattern becomes a mannerism when nearly everyone uses it: a domestic observation, an extended comparison, a correction of what it really means, and a polished closing thought. Many paragraphs also explain the image after the player has understood it. The late-game register becomes especially uniform.

The intentional shift toward expanded forms at the reveal is a good idea. Keep each animal's rhythm within it. Chill can remain brief. Warren can retain tradesman's contractions. Axel can run on when avoiding something painful. Archimedes can qualify a statement precisely. Tock need not make every knock yield an entire philosophy. Shared ceremonial speech will be more striking if it is rare.

The strongest lines often need little explanation. Axel's fear that the returned fish may merely wear PLUM's face, Sloane's willingness without certainty, and Tock saying he has been “the thing in the walls” all carry conflict inside a concrete detail. Give that kind of line space.

Do a human sentence-level pass after structural edits. The recent contraction work has introduced audible errors, including “and here you're,” “Tell the others. I'll, I will,” and “The ceiling of it's thinning.” The last is grammatically interpretable as “of it is” but unnatural to the intended voice. There are also fragments created by splitting comparisons. These issues need contextual editing rather than another corpus-wide substitution. Examples are in [Ember's dialogue](../mobile/src/services/dialogue/animalDialogueBase.ts#L728) and [Axel's dialogue](../mobile/src/services/dialogue/animalDialogueBase.ts#L216).

Useful editing constraints for a revision pass:

- Give each visit one main emotional turn; do not spend its entire budget restating the phase's mood.
- Keep a short reply short when the character is frightened, evasive, or busy.
- Allow some visits to end on an action or an unanswered question rather than an epigram.
- Cut repeated interpretation before cutting a singular physical detail.
- Maintain jokes and ordinary wants after the reveal so that the characters remain recognizable.
- Replace claims about the player's feelings with things a character can actually observe or ask.
- Review the combined dialogue, whisper, cinematic, and UI exposure. Repetition across surfaces matters as much as repetition inside one file.

**These sample rewrites illustrate the direction; they are proposed material, not changes to the shipped script.**

**Ember: give the withheld truth an accountable speaker.** The existing tutorial callback says, “Not asking was your part, friend, and you played it perfectly.” The player was not offered a meaningful chance to ask about the arrangement during onboarding. A confrontation could instead read:

> PLAYER: You said you were keeping me safe.
>
> EMBER: I was.
>
> PLAYER: From what?
>
> EMBER: …I kept hoping you wouldn't ask that.
>
> PLAYER: Did you know what the words were for?
>
> EMBER: Enough to tell you. I knew enough to tell you.

This gives Ember ownership of the concealment and leaves her motives open for the next exchange. The player can judge her without the narrator assigning their guilt or forgiveness.

**Axel: make the benefit and the cost visible.** Build on the existing PLUM material:

> AXEL: He came back.
>
> PLAYER: Is it PLUM?
>
> AXEL: Same little face. Same bite out of his fin.
>
> [The fish completes a circle. Then repeats it exactly.]
>
> AXEL: He used to stop when I laughed.
>
> PLAYER: Axel—
>
> AXEL: Let me have tonight.

This proposed behavior would establish a specific new fact about preservation, so it must be approved as canon during the rewrite. Its value is that the player understands why Axel might accept something frightening.

**Thyme: let peace encounter a boundary.** Build on the existing escape paths and seed tin:

> THYME: The gate opens. I've checked.
>
> PLAYER: Have you gone through it?
>
> THYME: Every path comes back here.
>
> [She sets a small tin beside the latch.]
>
> THYME: I kept the seeds. Please don't tell Bamboo I'm being brave. I haven't decided what I'm being yet.

This preserves uncertainty and humor while giving the player a particular confidence to respect. It could lead to an action involving the path or the seeds, rather than another general question about fear.

**Chill: make one refusal survive.** For a player who asks him to retain an unwelcome record:

> CHILL: I left your answer as you gave it.
>
> PLAYER: The house didn't mind?
>
> CHILL: It corrected the page twice.
>
> [He uncaps his pen.]
>
> CHILL: I have ink.

This earns the administrative imagery through conduct. Whether the entry survives becomes a meaningful, manageable branch in a largely linear story.

**The player's involvement needs more honest choices and fewer assertions of complicity.**

The existing choices are expressive: they select an immediate response and later callbacks, while the plot converges. That is a legitimate structure. The problem is that thirteen variations of ask/refuse offer limited variety, and some later responses overwrite the refusal or claim the player performed something they did not do. “Procedurally irrelevant. You wrote it either way” is a particularly clear example. See [choice resolution](../mobile/src/services/dialogueChoices.ts#L321).

Some refusal callbacks are already much stronger. Axel keeps the player's “no” whole; Fennick recognizes why someone would not want to listen; Vesper treats restraint as discipline. Use that approach more widely.

Introduce three or four consequential relationship decisions, each with a visible response and a later memory. Protect Thyme's confidence or tell Ember. Preserve Chill's original record or accept the corrected version. Ask Warren to brace a dangerous opening or leave a way out. Choose whether to stand beside Ember at the arrival. These are proposed options; the final selection should follow the settled canon.

One shared arrival can accommodate those choices. What changes might be who trusts the player, what evidence remains, who stands beside them, or which boundary is honored. This is feasible without a large branching ending tree.

Revise “You gave us [word]. You didn't have to” to match actual agency. A selected word may have come from a constrained board or been required in the available route. Animal offering requests also fulfill automatically when a matching formed word appears. Those systems provide memory and personalization; they do not always establish an informed intention to offer that meaning.

Similarly, the amber altar's “you get nothing” framing is undermined by quests that award progress and amber for using it. The transaction can remain net-negative while still incentivized. Either remove those incentives from the particular act meant to represent giving without return, or describe the exchange honestly. This is a narrative-design issue, not a reason to remove optional spending systems generally.

Finally, let the player express an attitude after the event. Anger, grief, relief, curiosity, silence: the game can acknowledge one of these without giving each a separate plot. A character saying “You've made peace with it too” should depend on what the player actually expressed.

**Build the finale around an action and the friends who made it matter.**

Preserve the marked final board, quiet victory, recalled words, and held silence. The existing final-board machinery is a substantial strength. But a generated legal chain with an evocative first word is not yet an authored dramatic choice, and refusing Undo while allowing Restart carries limited weight as irreversibility.

A revised finale could fit the existing presentation style:

1. The final discovery occurs before the board, so the player understands a concrete consequence of finishing it.
2. One friend makes a request that draws on a protected earlier scene: keep an entry, a path, a name, or a promise.
3. An authored, solvable puzzle interaction gives that request a consequence. Curate and validate its legal routes; do not assume the current generator supplies the necessary semantic choice.
4. On the last shift, an actual ensemble moment unfolds. Warren holds the structure. Fennick hears the arrival. Tock pulls the rope. Moss answers. Ember turns toward the player. The exact participants and wording adapt to who has been recruited.
5. A small observed change establishes what the presence has granted or taken. Then the shadow's arrival provides scale to a consequence the player already understands personally.
6. The aftermath immediately pays off the player's earlier relationship decision. One cup remains unused, one line stays uncorrected, or one path still leads out.

This can be staged with portraits, brief dialogue, a few existing visual changes, and precise audio. It does not require full voice acting or costly animation. Do not make the player imagine the central encounter only because an animal later says “You were there.”

The current [Arrival](../mobile/src/services/phaseEvents.ts#L328) does not show Ember introducing the player, Bamboo greeting first, Tock ringing the bell, or Moss making the true call, even though the post-revelation dialogue recalls those acts. This is a particularly valuable opportunity to turn existing written material into an experienced climax.

**The aftermath needs evidence, individual differences, and room for a completed experience.**

The post-revelation script contains two interesting kinds of peace. Archimedes reads a history of lighthouses that serves no ritual purpose. Warren digs for no reason. Vesper chooses her watch each dusk. These suggest freedom from compulsory purpose. Other passages describe a ledger correcting itself, feelings becoming inaccessible, or escape routes ceasing to matter. These suggest accommodation or assimilation.

Keep that tension, but let the player inspect an outcome instead of repeatedly labeling it “terrible, beautiful peace.” Show three different responses: one animal feels released, one is grateful but changed, one retains a disagreement. The meaning of the whole should emerge from those particulars.

The Keeper's Record is worth protecting. Recalling actual words makes the journey personal, and “I will keep writing anyway, because I like remembering you” gives Ember an act that can outlive her assigned purpose. Its account of what she knew must agree with her earlier concealment. See [the Record](../mobile/src/services/phaseNarrative.ts#L338).

Avoid putting a foundational new claim only behind prolonged tending. The level-35 ceremony says, “There was never anything to summon,” and asserts that the player understands. That is large enough to destabilize the entire story. Decide whether it is metaphor, a new revelation, or a character's belief; establish the distinction in the main conclusion. Optional tending should deepen an emotionally complete ending.

Give the player a quiet place to stop after the Record. Continuing puzzles, mastery, and tending can remain available. The ending will be more satisfying if the player can feel they have completed something even when the pattern continues.

New Cycle should be a lower priority than the first ending. When revised, carry forward one specific consequence rather than only generalized déjà vu: an entry the player protected, an outward-facing flower, a confidence kept. Let one animal notice it early. The question becomes whether the relationship can change the pattern. Do not require another whole run before offering the first new evidence.

**Several continuity and delivery problems should be fixed regardless of the chosen rewrite direction.**

| Priority | Source-confirmed issue | Why it matters and what to change |
|---|---|---|
| High | Thyme says she asked Bamboo why they were unafraid in `rb_3_16`, then says she never asked in `rb_4_9`. Base dialogue lines 1383 and 1407. | This is an explicit contradicted action. Choose one history, or deliberately stage a discovery that someone has altered the memory. |
| High | Warren discovers the foundation's purpose in the third-phase block, then says he knew with every day of digging in the fourth-phase block and seed callbacks. Base lines 1226–1229 and 1257–1258; narrative line 748. Similar knowledge conflicts recur across the cast. | Unreliable narration is possible, but needs evidence. Build the per-character knowledge timeline before polishing these passages. |
| High | The unfinished-house fallback is supported by `App.tsx`, but the Arrival still says the temple is complete. Micro-beats 109 and 112 also assume completion from puzzle count alone. | The narrator contradicts a world the player can see. Supply house/recruitment state to these scenes, with truthful variants. Preserve the fallback so currency spending does not block the ending. |
| High | Coordinated events check a minimum phase, with no upper bound. The dialogue flow permits them in phase 5. | A late reader can receive an approaching-arrival speech after the arrival. Retire or rewrite obsolete events when the underlying event occurs. A phase number alone is insufficient chronology. |
| High | Coordinated events are consumed globally by theme after one animal speaks. | The supposed independent corroboration may be represented by only one witness. Use per-animal delivery for chosen corroborating lines, or a short shared scene. Avoid making every animal recite every milestone. |
| High | Seed/callback pages can be marked consumed when queued, before the player reaches the page. | Dismissing an earlier page can lose the setup or payoff permanently. Acknowledge the narrative fact when displayed or completed, with resume behavior. |
| High | The phase-5 handoff retires unread ordinary phases 0–4. Session and phase budgets can prevent complete reading before that handoff. | Important character arcs disappear. Protect a small essential scene sequence and provide an archive/catch-up approach for the remaining optional material. |
| High | Vesper can arrive at global phase 3 with effective animal phase 4 and fast-forward directly there; her choice requires her third-phase reading block and only grants the phase-4 exception to lagging animals. Moss can similarly skip his choice if recruited at global phase 4. | Authored choices and their later consequences can be absent on intended routes. Give late recruits a scene-based introduction and choice trigger independent of the skipped block. |
| Medium | Arrival accounts describe dawn, dusk, teatime, and deepest night; some say the sky stays open and others that the seam closes. Intro lines 147, 175, 229, 265, 279, 327, 345, 367–368, 411. | Multiple perceptions could be intentional. Define the common physical event, or make the contradiction a finding characters acknowledge. Do not leave the reader to invent a time-distortion rule to repair it. |
| Medium | Panko's corrected base/callback text says the player is kept as a spoon, while word reactions say “we are the meal” and “it feasts on us.” Reactions lines 110–111. | Consumption and preservation imply different stakes. Decide when these are metaphors and edit all surfaces consistently. |
| Medium | Some phase-4 word reactions describe descent happening now. Phase-5 ritual micro-events reuse phase-4 approach language. | Reserve irreversible event claims for actual event state; use reactions appropriate to before and after arrival. |
| Medium | House origins differ between old introductions, base memories, and catch-up recruitment stories. | Define what physically existed before the player's construction, what “arriving” means, and whether they are meeting old residents or inviting new ones. Rewrite recruitment memories against that timeline. |
| Medium | Some tutorial callbacks describe teaching step-by-step by Ember's fire, whereas the current cold open precedes her invitation. | Callback copy should match the onboarding route actually experienced, including skipped/legacy onboarding if supported. |
| Medium | The readability pass introduced malformed contractions, comparison fragments, and a count mismatch such as “three words” followed by “It's coming.” | Run a contextual copyedit and an aloud-reading pass after structural edits. Automated style ratios cannot evaluate voice. |

Relevant implementation anchors: [coordinated selection](../mobile/src/services/dialogue/animalDialogueNarrative.ts#L623), [phase-5 handoff](../mobile/src/hooks/useDialogueFlow.ts#L903), [queued seeds](../mobile/src/hooks/useDialogueFlow.ts#L1106), [session budgets](../mobile/src/types/homeWorld.ts#L508), [late recruitment fast-forward](../mobile/src/services/homeWorldData.ts#L1012), and [choice eligibility](../mobile/src/services/dialogueChoices.ts#L299).

**There is more written story than some routes can deliver, even to an attentive reader.**

Every animal has 134 ordinary entries before the twenty post-revelation entries. Equal quantities create a maintenance contract, but they do not guarantee equal dramatic value or achievable reading.

One concrete capacity example: an already recruited, otherwise caught-up lagging animal gains access to both its thirty third-phase lines and thirty fourth-phase lines when global phase 4 arrives. On a route entering phase 4 at 90 and After at 117, an animal whose grace sessions are used has at most six eight-line sessions at 90, 95, 100, 105, 110, and 115, even allowing the catch-up boost. That is 48 slots for 60 newly available ordinary entries. Some of the arc cannot be read before retirement on that route. Flavor pages and player absence can make the experience more fragmented still. This is a conditional source-derived example, not a measured average playthrough.

The repair should be editorial as well as technical. Define a compact essential spine whose scenes are delivered in order. Optional conversations can remain abundant, discoverable, and replayable. Give the player an invitation to a new scene, rather than requiring visits to every animal after every cooldown to reconstruct the main plot. Do not delay the ending until all 1,742 entries have been read.

Existing saved dialogue indices and count assertions make large cuts a migration task. Preserve stable IDs where appropriate and plan state migration with the structural rewrite. Do not pad weaker passages solely to satisfy an old per-phase quota.

**The opening needs a deliberate exposure budget for its uncanny details.**

The design notes ask for more than twenty-five puzzles of sincere delight, while the actual phase floor can move the first transition to twelve and the first free-play win guarantees a conspicuous horror signal. Base introductions and early dialogue add sentient warmth, anticipatory fires, writing water, impossible architecture, and knowledge of the player's arrival. Each clue may be subtle alone; together they are emphatic.

I would keep an early promise of strangeness, while reducing the number of channels making that promise at once. Let the first meaningful wrongness emerge from something the player learned to recognize: Ember sets out the player's preferred cup before they choose it, or a fish turns before the letter lands. These are proposed staging alternatives. Keep most early visits concerned with a character's ordinary want.

Do not prolong the cozy section simply to conceal the genre. The aim is a bond worth complicating, not a fixed number of untroubled puzzles. A short scene where an animal makes room for the player can accomplish more than dozens of agreeable greetings.

Review Ember's commerce dialogue in this context. She carries warmth, tutorials, new-mode introductions, store introductions, and the central betrayal. Too many instructional appearances can make her feel like the game's attendant instead of a friend. In particular, the starter-pack line “Small comforts, freely offered” leads to a paid product; use accurate neutral language there. The emotional betrayal should arise from the fiction's deliberate conduct, not confusion about what an actual purchase costs. The existing suppression of ads around later story phases is worth retaining.

**A practical revision order will improve the story more than another general polish pass.**

1. **Settle the ending's meaning and the private canon.** Write a short ending treatment, the cost/benefit of peace, the house's origin, the arrival's physical sequence, and each animal's knowledge timeline. Specify what remains unknowable and what the player can establish.
2. **Design the essential scene sequence.** Map roughly ten to twelve short anchor scenes from invitation through aftermath. Every scene should change a belief, a relationship, or an action. Associate every major callback with an earlier delivered scene or observed action.
3. **Write one complete slice before touching the whole corpus.** The best candidate is Ember's welcome, Axel and PLUM, Thyme's objection, a word-related intervention, and its aftermath. This tests the emotional engine and the use of puzzles together.
4. **Rebuild the confrontation and finale.** Establish the final discovery, give the last puzzle a legible meaning, and stage the animal actions the epilogue currently only remembers.
5. **Repair delivery and continuity.** Fix stale events, prematurely consumed pages, late-recruit choices, state-blind completion claims, and essential-story retirement. This work can begin alongside writing once the scene contract is clear.
6. **Revise the cast around distinct motives.** Keep the best ordinary and unsettling passages. Move, merge, or cut repetitions. Give every important character at least one decision that could not be handed unchanged to another animal.
7. **Perform the voice and copyedit pass.** Read conversations aloud in their actual order and mobile-sized presentation. Correct contractions, repetitions, callbacks, names, objects, timings, and pronouns together.
8. **Refine tending and New Cycle after the first ending works.** These should reward attachment and deepen a completed story rather than compensate for an incomplete main payoff.

Avoid expanding the cast, adding a cosmic lore dump, extending the wait with more “almost here” beats, introducing a large ending tree, or funding expensive voice work before the scene structure is settled. Those changes add production work without resolving the main dramatic weakness.

**Test the revision through what players believe, remember, and choose.**

Use small qualitative playtests as diagnostic evidence, not as statistical proof. Include players who read everything offered, those who mostly solve puzzles, and those who return after several days. Preserve saves at key moments so you can observe the complete arc and the effect of missed conversations.

- After the first visits: which animal do they want to see again, and what ordinary thing do they remember about that animal?
- Before the ritual reveal: what do they believe the house is doing, and which observation changed their mind?
- At the reveal: what did they learn that they did not already believe?
- Before the final board: can they describe what finishing may do to a specific friend?
- After a refusal: can they point to something the game remembered or respected?
- After the ending: which action do they wish they had made differently? Do they disagree about the bargain while agreeing about the observable events?
- After a few days away: can they resume the mystery without rereading a large archive?

The technical checks should model sparse visits, skipped introductions, late recruitment, incomplete houses, ahead-of-time awareness, dismissal before a queued page, arrival with unread events, and New Cycle state. Content-count tests remain useful for storage integrity; they do not establish that the story lands in the intended order.

The most valuable next deliverable is the revised scene outline and one fully written, playable emotional arc. WordShift already has enough atmosphere and language to sustain something distinctive. Its next leap depends on letting the player experience the moment when affection becomes a difficult choice, and then letting that choice remain part of the house.
