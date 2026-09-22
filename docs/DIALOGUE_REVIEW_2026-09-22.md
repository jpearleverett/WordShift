# Dialogue and scene review (2026-09-22)

An end-to-end review of every line where a resident speaks or a scene plays:
regular conversations (all 13 residents, phases 0-4), the phase-2 pool, the
post-revelation and Tending pools, introductions, temporal adaptations, the
personal choices and their callbacks, narrative seeds, cross-references,
coordinated events, word and offering reactions, gift scenes, whispers,
Ember's guide cards, the story spine, every cinematic, and the phase
reactions. The review looked for quality, clarity, awkward formality,
continuity across phases and engagement, with the most attention on the
reveal, the Arrival and the phase 4 -> 5 transition.

Method: each resident's material was read in delivery order (sessions of
3/3/5/5/6/4 lines, adaptations beneath the lines they replace), the story
path was transcribed page by page from the end of phase 3 through the
Reply scene under every branch, and every edit was checked against the
canon, the register device, pinned tests and the fourth-wall rule. 660+
string edits across 21 files; ids, counts, order, `requiresAnimals` and
`mentions` are unchanged.

## What was wrong

1. **Phase 4 collapsed at the climax.** Phases 1-3 averaged 37-39 words a
   line with running threads and images; phase 4 averaged 17.7, and many
   lines were free-floating disclaimers repeated across the cast ("You do
   not have to...", "Take as long as you need", "It does not mean...", about
   40 in all). The reveal read as the same apology in thirteen costumes.
   Several first sessions ignored the resident's last phase-3 line, and
   several phase-4 lines repeated phase-3 lines nearly verbatim.
2. **The reveal did not say what it revealed.** The Horizon cinematic opened
   on jargon ("The arrangement is almost whole"), called the presence "the
   warmth", and "Your friends have found their robes" read as a costume
   party. The pit ceremony a page earlier said "The arrangement is complete".
3. **The final choice was misleading.** The council said "CLOSER lets it
   come and live with us", implying CLOSED keeps it out (both let it in).
   Nothing said which letter makes which word, and one final-board move
   message ("the house leans closer") nudged toward CLOSER.
4. **The Arrival was vague.** "The incantation has learned the sound of
   this house", an unintroduced "seam", and "a cold draft remains" left the
   player unable to say what their word did. The Tock and Moss endings
   dropped "The presence stays". Fennick's and Moss's Arrival lines sat in
   branches that can never run (the reveal requires the full house, so Tock
   is always present).
5. **Old "terrible peace" and devoted-cult canon survived** in places the
   player reads constantly: the offering altar (twelve near-identical
   disclaimers), phase-4 cross-references ("It begins", "I will bow", "what
   the arrangement needed to wake"), interjections ("{name} is at peace. You
   could be too."), the post-arrival victory coda ("THE PATTERN REMEMBERS
   YOU"), and the phase-5 victory feedback ("Nothing is measured here
   anymore. Everything is kept.").
6. **The aftermath was mostly permission lines.** Post-revelation pools gave
   each resident several variations of "you do not owe me a feeling", with
   little sign of the presence actually living in the house.
7. **Setups without payoffs, and payoffs without setups.** Sloane promised
   the story of "one bad night" and never told it; Axel's "PLUM stops when I
   laugh" (the whole point of the Returned scene) was never established in
   his own conversations; Chill's ledger and uncapped pen were never planted
   before the corrected-ledger scene; several seed callbacks never touched
   their seed.
8. **Smaller defects:** guide cards that taught wrong rules (Challenge "hides
   previews"; Speed "a shorter board"; Reverse never mentioned the lock on
   the climb back), fourth-wall "puzzle"/"button"/"tap" in Ember's mouth,
   a wrong etymology, Axel given paws and whiskers, contradictions between
   paired cross-references, British spellings.

## What changed

- **Phase 4, every resident.** The first session is now the morning after
  the reveal in that resident's own voice, and the block carries the canon
  concretely: the words fed something that is fond enough of the house to
  correct it. Each room shows the correction in its own terms (Ember's
  kettle lid straightened overnight, Axel's dropped stone returned without
  a speck of algae and his scratched "A" healing, Archimedes' book
  backdating new rooms in fresher ink, Sloane's hammock restored "new and
  tight", Chill's worries corrected and then Chill, Warren's "door laid
  flat", Thyme's mint gap hedged over, Vesper's crooked chalk mark
  straightened, Tock's hollows filled, Moss offered a copy of his
  grandmother's voice). Residents disagree with each other, act, and end
  sessions on hooks. Average length is now 23.5 words; one or two short
  lines per resident remain for rhythm. Every robe beat is distinct.
- **Post-revelation.** Each resident has a distinct stance (Ember's nightly
  list of what she changed anyway, Sloane humming badly on purpose, Chill
  letting the presence listen but not "take the minutes", Bamboo neither
  bowing nor leaving). Relationships are shown being repaired or not; the
  presence still prefers sameness, and the boundary visibly holds.
- **Story spine and cinematics.**
  - The Horizon now states the reveal.
  - The council presents CLOSED and CLOSER as parallel terms ("one room it
    can never enter" / "one road out it can never close"), says either word
    lets it in, and names which letter makes which word. The free hint and
    `STORY_COPY.finalChoice` use the same wording.
  - The Arrival makes the offered words a single call ("It says: come in"),
    introduces the seam before it opens, ties the figure to the warmth the
    player fed, and states "Your last word holds".
  - Fennick and Moss now get beats that actually play: Moss holds his breath
    in the complete-house page and answers once beside the bell.
  - After, the phase-5 reactions and the After/Reply scenes are less
    repetitive (the cooling cup is kept where it earns its place).
- **Event systems.** Offering-altar reactions are eerie room-specific
  effects instead of disclaimers; phase-4 word reactions show the house
  correcting; interjections and nudges show a divided household; Ember's
  tutorial callbacks quote her real first-day lines.
- **Guide cards.** Rules taught correctly, fourth-wall words removed, the
  setup chip located correctly ("the seal above the board").
- **Phase-5 victory feedback.** The lines endorsing stillness now show a
  house that leaves rough edges alone.

Art catalog samples were appended for every reworded story line (old
samples kept), so frozen transcripts still resolve their illustrations.

## Invariants verified

- Register device: phases 0-3 resident speech 92-96% contracted; phase 4,
  post-revelation and Tending pools 0 contractions; narration never
  contracts; the player always does. One test that pinned a contraction at
  phase 4 (`getJournalIntroLines`) now accepts either form.
- No em/en dashes or curly quotes; no new fourth-wall words; pronoun canon.
- Full Jest suite (230 suites, 5,332 tests), `tsc --noEmit`, ESLint with
  `--max-warnings 0`, and the daily cohort check all pass.

## Open items for the owner (not changed; they need code or a design call)

1. **Fixed (follow-up): late recruits read most of their story after the
   Arrival.** Vesper (84), Tock (88) and Moss (92) were met at world phase 3
   and reached only ~35 of their 134 lines before the finale; their personal
   choice needed the reading cursor inside phase 3 and was almost never
   offered, and their narrative seeds only planted while the house was at
   phase 0-1. Now: a resident whose next line is two or more phases behind
   the house gets longer visits and a short rest until they catch up
   (`getConversationBacklogPlan`); the personal choice follows the house
   phase, offered after nine lines read to a reader still in earlier
   chapters; seeds plant on the resident's own 2nd and 5th visits while
   they are reading their bright chapters, and the reveal callbacks wait
   until that material is behind them. The finale still never waits on
   reading: the Arrival, and whatever a player has not heard, stay the
   player's own pace.
2. **Fixed (follow-up): the first board after the Arrival** used to play
   entirely in the phase-4 register (dread theme, music, move messages)
   because the durable phase stays 4 until that win plays After. The session
   now presents phase 5 once the Arrival ceremony is acknowledged
   (`hasArrivalBeenPresented`); phase-5 features such as the Unbroken Weave
   still gate on the durable `postRevelation` flag.
3. **Fixed (follow-up): house-wide events are delivered only in their own
   phase.** `getCoordinatedEventLine` skips an event written for an earlier
   phase, so a fast player never hears phase-2/3 testimony ("almost time",
   the first naming of the arrangement) after the reveal.
4. **Phase-5 ritual micro-events reuse the phase-4 pool.** The one false line
   was rewritten to work at both phases; a dedicated phase-5 pool is better.
5. **Unreachable lines:** Vesper's, Tock's and Moss's 100/250-word threshold
   lines and Fennick's 100-word line fire before those residents join; Moss's
   phase-2 extra pool is effectively unreachable.
6. **Phase-5 system copy** (move messages, pit "Loom/Weave" labels, rules
   text, hint receipts, difficulty suggestions) keeps the older serene
   "weave" register. Resident dialogue is aligned; a system-copy pass would
   finish the job.
7. **`arrived` adaptations of phase 0-3 lines keep their contractions.**
   This matches the one-time "I will tell it the way I saw it then" lead-in,
   but the owner may prefer them uncontracted.
8. The spine's `seeds` scene and Thyme's personal phase-3 choice both ask
   "keep this between us"; consider differentiating one.
