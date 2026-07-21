# WordShift — AAA Design Audit

**Date:** 2026-07-21 · **Branch:** `claude/wordshift-design-audit-fg52kd` · **Scope:** design/experience audit only, no game code changed.

**The bar:** Monument Valley II, Alto's Odyssey, Two Dots, Royal Match, Cult of the Lamb, NYT Games. The question asked of every system: would it survive a frame-by-frame comparison with those titles on a mid-tier Android phone?

---

## 1. How to read this audit

**Method.** Thirteen parallel per-system auditors read the code and assets first (docs were treated as unverified claims — correctly, since they still describe fonts the game no longer ships). Every finding was then re-read at its cited lines by an independent adversarial verifier whose default stance was *refuted*; findings could survive as CONFIRMED, be corrected in place (ADJUSTED), or die. A completeness critic then swept for uncovered ground until dry. Separately, six pixel-accurate HTML recreations of shipped screens were built from the real assets and fonts and screenshotted headlessly — the render evidence in §3 is derived from code, not from imagination. Verification stats: 127 findings filed, 0 refuted outright, ~42% adjusted (usually to *sharpen* evidence or add feasibility caveats, not weaken claims).

**Three tests, applied per system:**
- **Screenshot Test** — would a random frame sell the game?
- **GIF Test** — does any moment beg to be clipped and shared?
- **Hands Test** — does it feel alive in the first 60 seconds of touching it?

**What is sacred** (identity, not doc dogma — every recommendation amplifies these, none flattens them): the cozy→cosmic-horror descent across phases 0–5; *feel it before being told*; spoiler-safe shares and dailies; the entity is never named; the player never sees a phase label.

**Engineering reality is binding:** everything proposed below is native-driver (transform/opacity), Fabric-safe, `reducedMotion`-and-device-tier gated, and judged against a low-end Android phone.

---

## 2. Executive verdict

WordShift today is a game with **AAA bones wearing mid-market clothes in exactly the places players look longest**. The tile idle/selection feel, the phase-lighting model, the cottage panel kit, the pit devour spiral, the audio architecture, and the asset discipline are genuinely at or near the bar — several systems would pass a Monument Valley bar review untouched. What keeps the whole from reaching the bar is concentrated in three structural gaps and a long tail of unfinished wiring:

1. **The animals are not alive.** One walk cycle among thirteen animals; a single cloned breathe for every species; no blink, nap, stretch, or reaction anywhere; dialogue is a 300ms metronome mouth-flap over instantly-dumped text; "sleeping" animals pace their rooms; and a coin-flip `scaleX:-1` renders name tags and badges **mirror-imaged**. The game's emotional core — *you should like these animals* — is carried entirely by static art.
2. **The most-repeated ceremonies never age.** Victory springs, star haptic rhythm, confetti physics, toasts, and modal entrances keep bright-candy body language from phase 0 through the reveal, while the tiles around them heavy-up on a six-parameter phase ladder. The game's own best pattern (LetterTile) proves the doctrine; the ceremonies ignore it. And the single most important cinematic in the game — the entity's arrival — sits on a clearable 1.5-second timer that a habitual fast exit **cancels forever** (the completion flag persists first).
3. **A finished game is still standing in for its own placeholder in dozens of places.** OS color emoji serve as ambient world FX (💀/👁 float over hand-painted skies), emote bubbles, ceremony hero art, achievement icons, and the crash screen; five authored celebration sounds ship in the binary with zero call sites; the home ambient particle system renders **behind the opaque sky**; six secondary screens have zero animation while the design system ships an unused stagger token.

None of this is a rewrite. The audit found the delight ceiling is high precisely because the hard systems — phase theming, 9-slice cottage materials, synth pipeline, sprite discipline, native-driver hygiene — already exist. Most of the roadmap is *finishing wiring* and *extending proven patterns to the surfaces that missed them*.

### Scorecard (1–10 against the named bar)

| System | Screenshot | GIF | Hands | Overall | One-line verdict |
|---|---|---|---|---|---|
| Core board feel | 7 | 5 | 8 | **6.5** | Idle/selection layers are AAA; the commit — the core verb — is an un-animated state swap |
| House world | 6 | 4 | 5 | **5.5** | Gorgeous static composite; not a living diorama (particles occluded, zero parallax, emoji actors, no pan physics) |
| Animal life & rooms | 5 | 5 | 6 | **5.0** | Complete sprite sets + one real walk cycle; everything else is one cloned breathe and mirrored chrome |
| Victory ceremony | 6 | 5 | 7 | **5.5** | Honest economy + great skip craft; generic white card, phase-blind choreography, whisper hidden behind the modal |
| World ceremonies (pit/phase/finale/daily) | 6.5 | 6 | 6.5 | **6.0** | Best motion architecture in the game, half its sensory layer unwired (ceremony sounds never called) |
| Dead screens (Stats/Ledger/Gallery/Shop/Season/Difficulty) | 6 | 2 | 4 | **4.0** | Handcrafted materials, zero motion: unfinished-static wearing calm-crafted clothes |
| Emoji-vs-sprite consistency | 5 | 4 | 6 | **5.0** | Puzzle screen nearly clean; the painterly home world floats OS emoji as its FX layer |
| Motion vocabulary | 7 | 6 | 8 | **7.0** | ~510 animations, 100% native-driver; the aging rule superbly executed at the core, abandoned at celebrations |
| Audio & haptics | 6 | 5 | 8 | **6.0** | Board loop is near-AAA multimodal; the climaxes above the board play in silence |
| Typography, color, a11y | 7 | 7 | 6 | **6.5** | Near-AAA architecture; contrast collapses exactly where hands spend the first hour |
| Choreography integrity | 6 | 7 | 7 | **5.0** | AAA-adjacent choreography sitting on clearable timers and z-order mistakes |
| Asset base | 8 | 7 | 7 | **7.5** | A coherent, sellable painterly-pixel family; the strongest single system in the audit |
| First 60 seconds | 7 | 5 | 6 | **6.0** | Store-quality stills; a stuttery, unchoreographed lived sequence |

**Weighted read:** the game's *materials* (assets 7.5, motion hygiene 7.0, type/color architecture 6.5) outscore its *moments* (dead screens 4.0, animal life 5.0, victory 5.5). That inversion is the audit in one sentence: the studio-quality raw ingredients are assembled into under-rehearsed scenes. The roadmap in §5 is ordered to fix the moments using the materials that already exist.

---

## 3. Render evidence (current state)

Pixel-accurate HTML recreations built from the shipped assets, fonts, and code-derived geometry, captured at 412×915 @2x. Each caption lists what the frame *proves*. Full fidelity notes (every approximation disclosed) live with the render generators; nothing shown here is speculative — layout, colors, and states were derived from cited code.

### 3.1 Home world, phase 0 — `renders/current-home-p0.png`
The panned-down view of the bright-days home. **Proves:** the painterly world and room interiors are store-quality (the audit's strongest material); animal name tags are clipped invisible by the rooms' `overflow:hidden` (every companion is anonymous on the main screen); the `!` dialogue badge floats mid-room, detached from Ember; room nameplates are generic dark pills rather than the cottage kit's wooden plaques; the header is flat translucent-black chrome over hand-painted art; the roof (and its smoke) is cut off at this camera.

### 3.2 Home world, phase 4 — `renders/current-home-p4.png`
The launch-default camera (fresh sessions resolve the pan to `maxPanY` — the roof view). **Proves:** the upper third of the reveal-era home is featureless near-black (the bottom-anchored sky art sits below the viewport at this pan; the flat backdrop color fills the rest); the shadow figure — the game's marquee horror visual — is imperceptible at 0.5 opacity over near-black with its crimson eyes cropped above the frame; ambient dread "particles" are literal 12px 💀/👁 OS emoji; the locked-room card is a flat dark box with an emoji-grade padlock; bright candy header icons (🎯 red target, purple journal) never age. The robed sprites, faint word echoes, and dark cottage Next-Unlock bar genuinely land.

### 3.3 Puzzle board, phase 0 — `renders/current-board-p0.png`
Mid-move on the curated opener (letter lifted, graded previews showing). **Proves:** the candy tiles hold up frame-by-frame (bevel, gloss, per-letter color); the ✓/✗ preview words clip at row edges and collide with the slot pillars at the game's most-viewed location; an EASY board leaves ~40% of the screen as empty violet void below the future row; the home button is an emoji 🏠 chip beside the hand-painted wooden wordmark; the disabled UNDO state is a muddy brown slab.

### 3.4 Victory modal, phase 0 — `renders/current-victory-p0.png`
A settled 3-star win. **Proves:** the game's most-repeated ceremony surface is a generic flat-white rounded card — the 275-piece cottage kit never reached it; confetti renders **on top of** the modal text (zIndex 1000 vs 500 — a piece sits mid-word in the render exactly as the code layers it); emoji stand-ins (🌾🔥🏠) carry the receipt rows; the blue Share button is off-palette next to the pink primary.

### 3.5 Offering pit, phase 1 — `renders/current-pit-day.png`
Two batches waiting, one ward lit. **Proves:** the pit environment art is the single best Screenshot-Test frame in the game; the seven ward marks — the phase-progress anchor — are functionally invisible (unlit = 6% white over busy art; the lit ward's glow is iOS-shadow-only, so Android renders a flat dot); the pit-mouth glow at phase 1 is a stack of hard-edged ellipses at ~7% opacity; the floating offering words scatter into the sky with no gravitational relationship to the mouth that is supposed to devour them; there is no screen title (`getPitScreenTitle` exists and is never rendered).

### 3.6 Stats screen (dead-screen exhibit) — `renders/current-stats-dead.png` + `renders/current-stats-dead-achievements.png`
**Proves:** the cottage materials make a static frame look handcrafted (plaques, parchment, 9-slice wood); nothing on the screen ever moves (zero `Animated` usage in the file); the hero panel's glow blob paints *over* the wood frame like a rendering defect; achievements are iconed with raw emoji and locked rows are literal 🔒 characters; a phase-5-gated mode ("Rank 0: Unbroken Weave") leaks into a phase-0 player's MASTERY card; BY DIFFICULTY omits MEDIUM_PLUS so its counts don't sum to the hero total.

*"After" mocks for the top three proposals are in §6.*

---

*Sections 4–8 (findings ledger, Delight Roadmap, after-mocks, Top 10, Do-Not-Touch) follow.*
