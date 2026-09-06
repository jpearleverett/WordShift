# Story clarity and delivery pilot

This is a prepared protocol for F22/F23/F28/F29/F33. **No participants have completed it yet.** Five unfamiliar readers provide an early clarity signal, not statistical retention evidence. Keep answers in de-identified notes; never collect recovery credentials, production saves or telemetry transcripts.

## Prepare

The narrative/release owner records commit, installed build/runtime, device, text size, motion/audio preferences and whether the session is a natural play session or a compressed story walkthrough. Use an isolated test installation with production network requests disabled or a dedicated test backend. Record purchase state; do not assume the owner's restored entitlements are a free account.

Recruit five people who have not read the revised ending. Include at least one person who normally uses enlarged text or reduced motion if available; do not infer disability from appearance. Explain that they may stop, defer a scene, use help and express a negative reaction. Ask permission before recording voice/video; written anonymized notes are sufficient.

Prepare three coherent routes using actual story service/UI actions and retained transcripts:

| Readers | Route | Specific question |
|---|---|---|
|2 | Normal roster; one flower/cocoa and one chipped/tea opening | Do small preferences matter, and do the two final words remain equally legitimate? |
|1 | Cup fallback first, Axel recruited later in phases 1–3 | Is PLUM introduced alive before the later fish scene, without feeling like a chronology error? |
|1 | Sparse/fox-only roster | Is the premise and ending understandable without absent characters or fish events being assumed? |
|1 | Deliberately deferred scenes, interrupted/reloaded reading and journal resume | Can the reader recover context and continue without losing their answer? |

Every reader should see both outcome presentations eventually, but let their first final move be unprompted. Do not assign a preferred moral answer. Snapshot each reader's own state before that move to review the other route afterward. Preserve their actual first choice in notes.

## Run two distinct observations

**Natural first session —20 minutes.** Let the person play at their own pace. Do not advance progression, explain hidden lore or coach navigation. Note each unsolicited interruption, missed help cue, repeated claim/receipt, confusing word, deferred scene and audio complaint, along with its screen/scene ID. Ask them to think aloud only if that does not make the puzzle uncomfortable. This session is the evidence for early interruption/reading rhythm; it does not reach the finale by design.

**Compressed story walkthrough —25–40 minutes, optionally on another day.** Use the prepared coherent route to move between chapters after the reader has actually read each delivered scene. Label the compression openly. Keep roster, choices, seen pages and chronology coherent; never mark an unseen optional transcript as read and then count its callback as understood. Use the journal to read any required earlier chapter before moving ahead. Record skipped/missing context explicitly. Do not interpret compressed-session timing as ordinary game pacing or economy data.

At the first essential scene, ask the reader to defer it, find it in the journal and resume. At one choice, have them read Back after answering, close/reload and return; the answer must remain theirs. Later ask them to find pending amber, puzzle setup and recovery without directions. Measure taps/time and first wrong destination. Do not reveal or copy an actual recovery credential into the record.

## Ask before the last move

After the council/available catch-up context and before the final transfer, ask these open questions without correcting the answer:

1. “What do you think the house is trying to do for the people here?”
2. “What has become difficult or costly about that help? What made you think so?”
3. “Looking at the two possible final words, what would each let someone keep or do?”
4. “Which would you choose, and is there anything you still need to know?”

Facilitator scoring is **0 = absent/incorrect, 1 = partial/uncertain, 2 = clear with an example**, independently for:

- **Intent/cost:** affection/preservation can overwrite uncomfortable truths or a person's ability to choose; a correct answer need not use our vocabulary.
- **CLOSED:** a private boundary where the house cannot correct what is kept inside. It is not the compulsory bad ending or a claim that everyone must leave.
- **CLOSER:** an outward way that remains usable by choice. It is not automatic surrender, forced departure or a mechanical advantage.

Do not deduct for a different emotional interpretation. Record the scene/example cited and confidence separately. A reader passes the initial clarity signal when all three are scored 2 **before coaching**. Target at least 4 of 5; report the individual scores and route, not only a percentage. If a majority needs the facilitator to restate the premise, revise delivery before adding lore.

## Observe the outcome

Let the final scene and calm home return play without speaking over them. Ask the reader to point to what changed and try its optional action. They should find their private door or outward gate, recognize the consequence and feel able to continue ordinary play. Ask what they remember about their cup and whether an angry/uncertain answer still seems respected. Do not suggest that remembering every callback is required.

Review the alternate boundary after preserving the first choice. Ask whether either outcome looked more rewarded or more “correct,” and why. Read short unlabelled excerpts from three resident voices and ask who might be speaking; use the explanation to identify generic lines, not as a memory exam. A shortened full-reader aftermath should remain clear while sparse-reader copy should supply missing context.

## Record and act

Use one row per observation: anonymous participant ID; build/device/preferences; natural/compressed; roster/route; scene ID/page; action; observed problem; unprompted explanation; comprehension score; intervention supplied; severity; proposed change. Retain no names, recovery codes or copied personal data. Story telemetry should match display/defer/resume/choice/complete IDs; queueing alone must not count as reading.

Separate outcomes into:

- **Correctness defect:** lost choice, unseen-event assumption, unreachable control, wrong boundary prop, story/audio overlap. Reproduce and fix with a targeted regression.
- **Clarity problem:** repeated independent misunderstanding. Change the smallest line, scene placement or interaction that addresses it, then retest with new readers.
- **Preference:** a single reader's desired tone, music or branch. Preserve it as a signal; do not rewrite the whole game from one preference.

Finish with a dated pilot note listing sample, routes, scores, defects and proposed changes. If fewer than five sessions run, report that exact count. Add a separate signed Android 20-minute listening pass for Skip/mute/background and fatigue, plus native accessibility checks from [release validation](RELEASE_VALIDATION_1_3_0.md); this reader protocol does not replace those checks.


## Optional blind vocabulary check

Run this after the story session, or with separate readers, so a word list cannot spoil the final choice. Prepare 12 shuffled entries drawn from actual required routes: six ordinary-policy words, three advanced-policy words and three quarantined/obscure forms being considered for editorial review. Hide the policy category. Use the same list and neutral typography for each participant; record the source board and policy category privately. Include regional spellings deliberately rather than assuming one dialect is universal.

For each word, ask for a rating: **familiar**, **recognize but unsure of meaning**, **would need a definition**, or **looks like an error**. Then ask whether they would be comfortable needing it to finish a normal puzzle. Do not supply a definition until the initial answer is recorded. Afterward, show a short verified definition where available and ask whether that help changes their answer. Record free comments about regional usage and the context in which they know the word.

Compare responses with the [vocabulary policy](VOCABULARY_AUDIT_2026-09-05.md) and [delivered-route report](reports/BANK_DELIVERY_VALIDATION_2026-09-05.md). Treat unfamiliarity and suspected spelling errors as different issues. Reinstating a form requires editorial review and fresh complete-route checks; a small pilot does not justify declaring a legitimate word fake or retuning the entire dictionary. Use the results to choose a few exceptions, a required-word cut, or a later licensed definition feature. Report the exact list, reader count and responses, without claiming representative population familiarity.
