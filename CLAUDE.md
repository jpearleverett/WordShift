# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. What begins as a bright, candy-colored experience with adorable animal companions gradually descends into cosmic horror — the animals are revealed to be members of a cult, and every puzzle the player solves brings them closer to summoning a dark entity.

## Quick Commands

```bash
cd mobile
npx expo start           # Start dev server (scan QR with Expo Go)
npx expo start --clear   # Clear cache and start
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint 9 flat config (eslint-config-expo)
npm run generate:assets  # Regenerate icons/splash/notification icon/SFX (pure Node)
```

## Testing

- **Run all tests**: `cd mobile && npm test -- --no-coverage`
- **Run a single test file**: `cd mobile && npm test -- --no-coverage --testPathPattern=<filename>`
- **Run tests for changed files only**: `cd mobile && npm test -- --no-coverage --changedSince=main`
- Do NOT use `npx jest` directly — it does not find the local install and triggers a full remote download + deprecated dependency warnings every time. Always use `npm test` which routes through the locally installed jest.
- Do NOT run `npm install` unless explicitly asked to — all dependencies are already installed.
- The full suite has ~1,000 tests across 35 suites, expected green (counts drift as features land — don't treat the number as load-bearing). **Prefer running only the relevant test file(s)** rather than the full suite unless explicitly asked to run everything.

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript (strict)
- **Navigation**: State-based (`currentScreen: 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery' | 'pit'`)
- **State**: React useState/useEffect (no external state library)
- **Persistence**: AsyncStorage with in-memory cache pattern
- **Haptics**: expo-haptics (settings-gated)
- **Audio**: expo-av playing a bundled 14-sound WAV SFX pack (`assets/sounds/`, settings-gated, plays in iOS silent mode). Music is still future work.
- **Analytics/crash**: local event log (`eventLogger.ts`) + global error handler installed at startup; optional remote upload via `telemetry.ts` (disabled until an endpoint is configured)
- **Testing**: Jest with ts-jest preset
- **Target**: iOS and Android via Expo Go

## Narrative Vision

**The core conceit**: The player is unknowingly participating in a ritual. Every puzzle solved is an incantation. The animal "friends" aren't just getting philosophical — they're preparing for something. The house isn't just a home — it's a temple being constructed, room by room, to house something ancient.

**The tone shift must be gradual and earned.** The game should feel genuinely delightful for the first 25+ puzzles. Players should *like* these animals. The betrayal of that warmth is the entire point. When Fox says "The fire grows cold... but something else burns," it should land because the player remembers when Fox just wanted to tell them about cozy blankets.

**Everything reflects the transition:**
- **Puzzle words**: Shift from FUN/SPARK/TIGER → VOID/DOOM/ABYSS/RITUAL
- **Background visuals**: Bright candy purple → near-black with crimson accents
- **Floating particles**: Sparkles and stars → dim, dying embers
- **Victory text**: "PERFECT!" → "WHY DOES IT MATTER?" (plus ritual echo showing completed word chain)
- **Words offered counter**: Simple stat → "N words offered to the arrangement"
- **Move messages**: "Delicious!" → "The void accepts."
- **Confetti**: Vibrant rainbow → muted, dark colors
- **Hints**: "Move 'R' — think WARM!" → "If it matters, 'R' — see VOID."
- **Home screen**: Sunny day, happy clouds → storm sky, shadow figure looming
- **Animal sprites**: Cute idle poses → robed cult figures
- **Letter tiles**: Bouncy, fast wobble → heavy, ponderous movement with trailing glow
- **Shadow figure**: Invisible (Phase 0-2) → faint silhouette (Phase 3, opacity 0.18) → full looming presence with crimson eyes (Phase 4, 0.5) → settled (Phase 5, 0.35). `ShadowFigure` in HouseWorld.tsx renders `shadow_figure.png` behind the house with a slow breathing loop (native driver, reduced-motion aware)
- **Music/sound**: SFX shipped (cheerful candy chimes + a low `phase_change` swell); phase-darkened SFX variants and music are future work

**Key narrative rules:**
1. Never break the fourth wall. The animals don't know they're in a game.
2. The darkness should feel *earned*, not sudden. Each phase is a gradual shift.
3. Phase 4 animals aren't "evil" — they're reverent, serene, certain. That's what makes it unsettling.
4. The player should feel complicit. "You solved the puzzle. You brought us closer."
5. Visual changes should slightly precede dialogue revelations — the player should *feel* something is off before they're told.
6. The shadow_figure.png entity is never named, never explained. It just *is*.
7. **Never reveal the phase system to the player.** No "Phase 2/5" labels, no progress bars toward phase transitions. The player should experience the shift organically through visuals, dialogue, and tone — never through a UI label telling them what stage they're in.

**Phase narrative arc:**
- **Phase 0 (Bright Days)**: Pure joy. Cute animals, candy colors, fun words. The trap is set.
- **Phase 1 (Curious Thoughts)**: Animals start wondering about the nature of things. Subtle philosophical undertones.
- **Phase 2 (Deeper Questions)**: Isolation creeps in. Animals question reality, impermanence. Words shift toward emptiness. The background noticeably darkens.
- **Phase 3 (Growing Shadows)**: Overt dread. Animals speak of endings, purpose, something approaching. The puzzle screen feels cold. Victory feels hollow.
- **Phase 4 (The Horizon)**: The cult is revealed. Animals speak of "the arrangement," "the pattern," "what comes through." Robed sprites. Storm sky. The shadow figure appears. Every puzzle solved is explicitly framed as part of the summoning.
- **Phase 5 (Post-Revelation)**: After the final puzzle + house completion. Terrible peace. Animals are serene, not dreadful. The shadow has settled. Victory text: "The pattern continues."

## Project Structure

```
mobile/
├── App.tsx                      # Bootstrap gate (migrations + error handler) wrapping MainApp (~1850 lines): screen routing, onboarding, post-victory intros, Android back handling
├── assets/                      # Image assets (characters/, rooms/, house/, environment/)
├── src/
│   ├── types.ts                 # TypeScript interfaces (RowData, Letter, GameState, etc.)
│   ├── types/homeWorld.ts       # Home screen types, config constants, DialoguePhase = 0|1|2|3|4|5
│   ├── constants.ts             # Word lists by length (3-7 letters), COMMON_WORDS, fallback puzzle pools
│   ├── constants/               # Centralized game balance and timing constants
│   │   ├── gameBalance.ts       # Phase thresholds, amber rewards, streak config, puzzle gen timeouts
│   │   └── timing.ts            # Animation/interaction timing constants
│   ├── dictionary.ts            # 11,504-word dictionary (3-7 letters, profanity-filtered)
│   ├── data/                    # Pre-generated puzzle banks (12 banks, ~480 puzzles each after profanity purge; lazy-loaded)
│   │   ├── puzzleBankTypes.ts   # PreGeneratedPuzzle interface
│   │   ├── puzzleBankEasy.ts .. puzzleBankHard.ts           # Standard banks
│   │   ├── puzzleBankReverseEasy.ts .. puzzleBankReverseHard.ts  # Reverse banks
│   │   └── puzzleBankDoubleShiftEasy.ts .. puzzleBankDoubleShiftHard.ts  # Double-shift banks
│   ├── hooks/
│   │   ├── usePuzzleGame.ts     # All puzzle game state and actions
│   │   ├── useGamePersistence.ts # Persistence: amber, stats, phases, phase transitions
│   │   ├── useVictoryFlow.ts    # Victory animation choreography
│   │   ├── useVictoryOrchestration.ts # Post-victory cascade: glitch, micro-beats, whispers, interjections
│   │   ├── useSpeedTimer.ts     # Speed-variant countdown timer
│   │   ├── useDreadEffects.ts   # Dread pulse overlay + screen shake (phase-scaled)
│   │   ├── useOnboardingFlow.ts # Multi-screen onboarding state machine (11 steps)
│   │   ├── useAchievementQueue.ts # Achievement checking + toast queue
│   │   ├── useDialogueFlow.ts   # Dialogue session state, cooldowns, Phase 5 routing
│   │   ├── useUnlockFlow.ts     # Home unlock flow: room/animal purchases
│   │   └── useAutosave.ts       # Debounced mid-session puzzle state autosave
│   ├── components/
│   │   ├── Row.tsx              # Game row with PICK/DROP badges, arc layout (React.memo'd)
│   │   ├── LetterTile.tsx       # Animated letter tile with 3D candy styling, phase-aware springs/trails
│   │   ├── DraggableTile.tsx    # PanResponder drag wrapper for LetterTile
│   │   ├── AnimatedBackground.tsx  # Phase-aware floating particles + pulse
│   │   ├── PhaseTransitionOverlay.tsx # Cinematic multi-scene interstitial
│   │   ├── Confetti.tsx         # Phase-aware confetti + StarBurst
│   │   ├── FoxGuide.tsx         # Floating Fox speech bubble (onboarding)
│   │   ├── SettingsScreen.tsx   # Sound/Haptics/Reduced Motion/Daily Reminders toggles, legal links, support contact, Reset All
│   │   ├── StatsScreen.tsx      # Stats overview + achievements
│   │   ├── AchievementToast.tsx # Slide-in achievement notification
│   │   ├── DailyChallengeCard.tsx # Compact daily challenge button (header)
│   │   ├── puzzle/              # Extracted puzzle UI components
│   │   │   ├── ActionButton.tsx, AnimatedLogo.tsx, LevelDisplay.tsx, Toast.tsx
│   │   │   ├── VictoryModal.tsx # Victory screen (stars, stats, amber breakdown)
│   │   │   ├── RulesModal.tsx   # Phase-aware "How to Play" rules
│   │   │   ├── DifficultyMenu.tsx # Setup menu: difficulty + variant selector
│   │   │   ├── AnimalWhisper.tsx # Ghost-like post-puzzle whisper
│   │   │   └── RitualEchoChain.tsx # Real-time word chain display
│   │   ├── OfferingPitScreen.tsx # Offering Pit: tap-to-devour words, ward marks, phase transitions
│   │   ├── WhisperGalleryScreen.tsx # Collectible whisper/dialogue archive
│   │   ├── WordLedger.tsx       # Ritual word history screen
│   │   └── home/
│   │       ├── HomeScreen.tsx   # Main home screen with animal house, unlocks, journal hub
│   │       ├── HouseWorld.tsx   # Pannable house view (vertical pan, saved position)
│   │       ├── RoomView.tsx     # Individual room rendering
│   │       ├── AnimalSprite.tsx # Animated animal characters
│   │       ├── JuicyButton.tsx, AmberSparkle.tsx, CelebrationConfetti.tsx
│   │       └── FeatureTooltip.tsx # Post-onboarding floating tooltip
│   ├── theme/colors.ts          # CandyColors palette, tile colors, PhaseTheme system
│   ├── styles/appStyles.ts      # App.tsx StyleSheet, getScreenBackgroundColor()
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation (DFS, adjacency indices, quality scoring, dread words)
│       ├── puzzleBank.ts        # Pre-generated puzzle bank selection + recycling
│       ├── wordHistory.ts       # Word cooldown tracking for diversity
│       ├── starRating.ts        # Star rating + cumulative stats
│       ├── amberCurrency.ts     # Amber economy, streak, phase progression, deferred transitions
│       ├── dialogue/            # Split dialogue system (5 submodules)
│       │   ├── animalDialogueBase.ts, animalDialogueIntro.ts
│       │   ├── animalDialogueReactions.ts, animalDialogueNarrative.ts
│       │   └── animalDialogueVariants.ts
│       ├── dialogueSession.ts   # Dialogue sessions with puzzle-based cooldowns
│       ├── homeWorldData.ts     # Room/animal definitions, unlock progression
│       ├── dailyChallenge.ts    # Daily puzzle with seeded PRNG
│       ├── phaseNarrative.ts    # ALL phase-aware text (victory, moves, hints, loading, etc.)
│       ├── phaseEvents.ts       # Phase transition cinematic events
│       ├── achievements.ts      # 34 achievements across 5 categories, each grants one-time amber
│       ├── weeklyQuests.ts      # Weekly quest system (4 rotating quests)
│       ├── puzzleVariety.ts     # Puzzle variant configs + unlock requirements
│       ├── whisperGallery.ts    # Collectible whisper archive
│       ├── dialogueChoices.ts   # Phase 3 player choice points
│       ├── sacrifice.ts         # Phase 4+ amber sacrifice mechanic
│       ├── notifications.ts     # Push notification scheduling
│       ├── cloudSave.ts         # Cloud save infrastructure
│       ├── wordHarvest.ts       # Offering Pit harvest batches
│       ├── slotEstimation.ts    # Drag-and-drop slot position estimation
│       ├── puzzleSaveState.ts   # Mid-puzzle autosave/restore
│       ├── roomUpgrades.ts      # Room upgrade amber sink (Phase 2+)
│       ├── onboarding.ts        # Onboarding state machine + persistence
│       ├── dataMigration.ts     # Schema versioning + migrations (v3)
│       ├── configValidation.ts  # Configuration data validation
│       ├── telemetry.ts         # Optional remote event/crash uploader (disabled by default)
│       ├── settings.ts, haptics.ts, audio.ts, eventLogger.ts
│       ├── deviceTier.ts, performanceMonitor.ts, errorReporting.ts
│       ├── homeScenePan.ts, shareResults.ts
│       └── animalDialogue.ts    # Re-export shim → dialogue/ submodules
├── src/__tests__/               # ~1,000 tests, 35 suites
├── scripts/                     # Puzzle bank generator scripts (12 generators)
├── scripts/tools/               # Pure-Node asset generators + profanity purge + image downscaler
├── eas.json                     # EAS build profiles (development/preview/production)
└── eslint.config.js             # ESLint 9 flat config
```

## Game Mechanics

### Core Puzzle Loop
1. Player sees a chain of words (3-5 rows depending on difficulty)
2. Pick a letter from current word — word shrinks by 1 letter
3. Drop letter into next word — word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

### Word Preview Mechanic
When a letter is selected, ghost previews show what word would form at each slot position. Valid words green with a "✓ " prefix, invalid red/dimmed with "✗ " (validity is never conveyed by color alone). Computed via `useMemo` in `usePuzzleGame.ts`, passed to `Row.tsx` as `slotPreviews`.

### Difficulty Levels

| Difficulty | Word Length | Rows | Amber | Description |
|-----------|-------------|------|-------|-------------|
| EASY | 4 letters | 3 | 8 | Quick intro puzzles |
| MEDIUM | 4 letters | 4 | 10 | The standard experience |
| MEDIUM_PLUS | 5 letters | 4 | 15 | Bridge to HARD |
| HARD | 5 letters | 5 | 20 | Full challenge |

### Puzzle Variant Modes (`puzzleVariety.ts`)

Player-selected from the setup menu. Persisted as preferred variant.

- **Reverse Shift** (unlock: 8 puzzles): Play down then back up. Forward-pass letters stay locked (cumulative locking). All served from pre-generated banks with `reverseSolution` for hints.
- **Double Shift** (unlock: 25 puzzles): Move 2 letters per step. 4-phase input cycle: `pick1 → drop1 → pick2 → drop2`. All words are 5 letters (W=5). Difficulty by row count: EASY=3, MEDIUM=4, MEDIUM_PLUS=5, HARD=6. 1.65x amber multiplier.
- **Speed Shift** (unlock: 35 puzzles): Timed run with difficulty-aware timers (EASY 65s → HARD 48s). The clock **pauses while the app is backgrounded** (AppState listener in `useSpeedTimer`) and resumes from the saved remaining seconds after a relaunch (`speedTimeRemainingSec` in autosave; legacy `speedTimerExpireAt` still restores as a fallback). Time-up shows `getSpeedTimeUpMessage(phase)` with a warning haptic + sound.
- **Chain Shift** (design idea, NOT implemented): 3 linked puzzles where each final word becomes the next starting word. No type, config, or unlock exists in code.

### Pre-Generated Puzzle Banks

12 banks of ~480 puzzles each (~5,800 total) — generated at 500 each, then filtered by `scripts/tools/purgeProfanity.mjs`. Banks are **lazy-loaded** on first use via `require()` thunks in `puzzleBank.ts` (keeps ~5.7MB of data out of cold start). Standard, reverse, and double-shift variants at all 4 difficulties. Phase-aware selection scores by dread tier proximity. Word freshness cross-references with `wordHistory.ts`, plus a per-bank hub-word frequency penalty (the generator over-uses ~50 'hub' words like MATER/CATER — high-frequency words cost score so the vocabulary long tail surfaces). Top-10 random pick for variety. Recycling when exhausted. Graceful fallback to on-device generation.

### Curated Early Puzzles
First 3 post-onboarding puzzles are hand-picked (`CURATED_EARLY_PUZZLES` in `constants.ts`) for a compelling first session.

### Star Rating
- **3 stars**: 0 hints, 0-1 invalid attempts
- **2 stars**: 1 hint OR 2-3 invalid attempts
- **1 star**: 2+ hints OR 4+ invalid attempts

### Challenge Mode
Optional harder mode: difficulty-aware undo limit (EASY/MEDIUM=2, MEDIUM_PLUS/HARD=1), no hints. 1.5x amber. Challenge completions count 2x toward phase progression.

### Daily Challenge
Deterministic seeded generation. Always HARD: 6-letter words, 5 rows. Streak tracking with 2-day grace period. Unlocked at 5 puzzles or Phase 1+ (early unlock is the Day-1 retention hook). One-time Fox intro.

## App Architecture

### Custom Hooks

**`usePuzzleGame()`** — All puzzle state: rows, selected letter, game state, hints, validation, variant handling. Key methods: `initGame()`, `startNewGame()`, `handleLetterPress()`, `handleSlotPress()`, `handleHint()`, `handleUndo()`, `clearBoard()`. Returns `slotPreviews` for word preview mechanic. After each committed move (non-double-shift), `hasAnyValidMove()` runs stuck detection and surfaces `getNoValidMovesMessage()` when no legal move remains.

**`useGamePersistence()`** — Persistence: amber, stats, phases, streak. Key: `recordVictory()` returns VictoryData (includes `phaseTransitionPending`, `harvestedWords`, `pendingHarvest`, `firstCompletionBonus`). `refreshStats()` reloads from storage. Reports phase 5 when post-revelation.

**`useVictoryFlow()`** — Victory animation: star pop-in, modal reveal, phase flash. `playVictorySequence(stars)`, `skipToEnd(stars)`, `resetVictory()`. `isProcessingVictory` lock prevents double-tap.

**`useVictoryOrchestration()`** — Post-victory cascade: glitch text, narrative micro-beats, animal whispers, interjections, home nudges. Generation-guarded async callbacks.

**`useDialogueFlow()`** — Animal dialogue sessions, cooldowns, trigger word reactions, sacrifice reactions, cross-animal references, coordinated events, Phase 5 post-revelation routing.

**`useUnlockFlow()`** — Home unlock flow: in-world room/animal prompts, purchases, intro dialogue for new characters.

**`useOnboardingFlow()`** — 11-step onboarding state machine. Fox guides player through home → puzzle → pit → home.

**`useDreadEffects()`** — Crimson pulse overlay + screen shake for dread words (Phase 2+, phase-scaled intensity).

**`useSpeedTimer()`** — Speed variant countdown with `onTimeUp` callback.

**`useAchievementQueue()`** — Achievement checking + toast queue processing.

**`useAutosave()`** — Debounced mid-session puzzle state autosave.

### App Bootstrap & Reliability

- `installGlobalErrorHandler()` (errorReporting.ts) is called at App.tsx module load — global JS errors and unhandled promise rejections are captured into the event log.
- The default export `App` is a bootstrap gate: it awaits `runMigrations()` (dataMigration.ts) **before** mounting `MainApp`, so service caches always read migrated data. Renders a quiet dark view while booting; migration failures log and never block launch.
- Android hardware back: sub-screens navigate home (puzzle screen also resets transient UI state); home lets the OS exit; back is swallowed during onboarding.
- `telemetry.ts`: anonymous-install-id event uploader, fired from the event logger's flush. **Disabled by default** (`TELEMETRY_ENDPOINT = ''`); set an HTTPS collector URL to enable before a data-informed launch, and update the privacy policy when doing so.
- FTUE funnel events: `app_open`, `onboarding_step` / `onboarding_complete` (logged from `setOnboardingStep`), `puzzle_started/completed`, `notification_permission_result`, `pit_offer` — enough to answer "where do players drop off" once telemetry is pointed at a collector.

### Screen Navigation

State-based routing in `App.tsx`. Screen transitions use an opaque overlay pattern: overlay fades IN (120ms), screen swaps while hidden, overlay fades OUT (180ms). Overlay/root `backgroundColor` dynamically matches destination via `getScreenBackgroundColor()`. Instant when `reducedMotion` enabled.

### Victory Flow

1. `isProcessingVictory` lock prevents double-tap; the mid-puzzle autosave is cleared at completion AND at every victory-exit (`startVictoryExitFlow`) so Play can never resume a finished puzzle
2. Record stars, award amber (deferred to harvest), check achievements
3. Choreographed sequence: stars pop in with 200ms stagger → modal scales in
4. VictoryModal shows: ritual echo chain, named incantation (Phase 2+), words offered count, amber breakdown (itemized), action buttons
5. Phase transitions are **deferred** — `pendingPhaseTransition` set, VictoryModal shows pit hint, player must visit pit for ward ignition ceremony
6. Post-victory effects: AnimalWhisper (1.2s delay), interjection/home nudge (2.5s delay, 30% chance), ritual micro-event (Phase 2+, 60% trigger)

### Offering Pit Economy (Deferred Amber)

Puzzle completion queues amber in harvest batches instead of crediting directly. Player must offer batches in the Offering Pit to convert to spendable amber.

**Flow**: Puzzle complete → `enqueueHarvestBatch()` → VictoryModal shows "Collect Now" → pit screen → tap floating words to devour → `offerBatch()` credits amber.

**Auto-collect window**: through the first `AUTO_COLLECT_PUZZLE_LIMIT` (8, `gameBalance.ts`) puzzles, amber auto-credits without a pit visit; Fox's `pit_harvest` intro fires when the window closes and manual harvesting begins.

**Pit Features**: Flying mini candy-tile words, tap-to-devour spiral animation, multi-layered pit glow (4 concentric ovals), ward marks (7 circles showing phase progress), ward ignition ceremony for phase transitions, phase-aware background images.

### Phase Transition System

Phase transitions are deferred, not instant. When `phaseProgress` crosses a threshold, `pendingPhaseTransition` is set. Player visits pit → ward marks illuminate → tap to confirm → ignition ceremony → `PhaseTransitionOverlay` cinematic → phase advances.

Ward marks: 7 circles along upper pit arc. Phase-aware colors (turquoise → purple → crimson). Pulsing when transition ready.

## Home Screen & Animal House

### Currency (Amber)
- Base rewards: EASY=8, MEDIUM=10, MEDIUM_PLUS=15, HARD=20
- First-completion bonus (one-time per difficulty): +10/+20/+30/+50
- Star bonuses: 3-star +50%, 2-star +25%
- Challenge mode: 1.5x multiplier
- Streak multiplier: 10% per day (max 100%, requires 2+ day streak)
- Streak grace period: 2 days. Streak freeze: 50 amber (or free once per 14 days)
- Streak milestones: 3/7/14/21/30 days → 15/30/50/65/100 amber
- Puzzle count milestones (10, 15, 25, 50... up to 350)
- Achievement rewards: each of the 34 achievements grants one-time amber (10-100, `rewardAmber` in achievements.ts)
- Daily share bonus: +5 amber for the first completed share each day (`maybeAwardDailyShareBonus` in shareResults.ts; hinted on the VictoryModal share button)

### House Building (Bottom-Up)

Rooms and animals unlock alternately. Starting: empty Cozy Den + free Fox invite. Then: build Kitchen (50 amber) → invite Pangolin (100) → build Study (100) → invite Owl (100) → etc. Costs escalate for rooms (50-475), flat 100 for animals.

Late unlocks have puzzle-count gates to prevent amber surplus outrunning narrative:
| Unlock | Min Puzzles |
|--------|------------|
| Jungle (Sloth) | 55 |
| Desert (Fennec) | 75 |
| Office (Capybara) | 95 |
| Burrow (Wombat) | 115 |
| Garden (Rabbit) | 140 |
| Bamboo Attic (Red Panda) | 170 |

### Animal Characters (10 total, in unlock order)

| Animal | Name | Surface | Cult Role | Awareness Tier |
|--------|------|---------|-----------|---------------|
| Fox | Ember | Introspective, cozy den | Oracle, reads flames | Vanguard (+1) |
| Pangolin | Panko | Chef, rustic kitchen | Prepares ritual offerings | Middle (=) |
| Owl | Archimedes | Scholar, book-filled study | Lorekeeper, found the text | Vanguard (+1) |
| Axolotl | Axel | Dreamy, aquarium room | Medium, sees it in the water | Middle (=) |
| Capybara | Chill | Calm, office | Administrator, coordinating everything | Middle (=) |
| Fennec Fox | Fennick | Alert listener, desert camp | Sentinel, hears it approaching | Middle (=) |
| Sloth | Sloane | Slow observer, jungle | Has always known | Lagging (-1) |
| Wombat | Warren | Grounded digger, burrow | Built the foundation | Lagging (-1) |
| Rabbit | Thyme | Anxious, garden patio | Anxious because they understand | Lagging (-1) |
| Red Panda | Bamboo | Zen, bamboo attic | Spiritual leader, at peace | Lagging (-1) |

**Awareness tiers**: Vanguard animals are +1 phase ahead, Lagging are -1 behind. `getAnimalPhase(globalPhase, animalType)` applies offset. Narratively the lagging tier lags *publicly, not privately* — Sloane and Bamboo have always known; they simply speak late.

**Canon pronouns** (established by in-dialogue references — keep consistent): Ember she/her, Panko she/her, Archimedes he/him, Axel he/him, Chill he/him, Fennick he/him, Sloane she/her, Warren he/him, Thyme she/her, Bamboo they/them.

### Dialogue System

**670 base dialogues** (67 per animal) + **100 post-revelation** (10 per animal):
- Phase 0: 12, Phase 1: 14, Phase 2: 11 (incl. question-web hook), Phases 3-4: 15 each, Phase 5: 10 each
- Counts are enforced by `configValidation.ts` (`EXPECTED_DIALOGUE_COUNTS_BY_PHASE`) — update it when adding lines

**Session mechanics**: Max dialogues per session phase-aware (3-6). Cooldown: 2-5 puzzles between sessions. Grace period for newly unlocked animals.

**Rich interaction layers**:
- **Cross-animal references**: Phase-scaled frequency (20% → 60%). Vanguard animals get guaranteed first ref at each new phase. Dynamic refs filter by `unlockedAnimals` (multi-name lines must set `mentions` to the *latest-unlocking* animal named — sequential unlocks guarantee the rest); static base lines that name another animal carry `requiresAnimals` tags and are skipped by `resolveDialogueIndex()` until that animal is unlocked; coordinated event lines are name-scanned against `unlockedAnimals` at delivery time (`getCoordinatedEventLine`). All of these invariants are enforced by `dialogueGating.test.ts` — no animal is ever mentioned before the player has met them.
- **Question web** (Phase 2): each animal has one `*_2_w1` hook line pointing the player at another animal's mystery ("Ask Warren what he found"), gated on that animal being unlocked.
- **Trigger word reactions**: Puzzle words (FLAME, VOID, etc.) queue per-animal, consumed on visit.
- **Sacrifice reactions** (Phase 4+): Animals comment on amber offerings.
- **Coordinated events**: At puzzle milestones (80, 100, 120, 160, 200, 230), all animals share thematically linked dialogue.
- **Word threshold dialogues**: Reactions at 100/250/500/750 total words.
- **Catch-up dialogue**: Late-unlocked animals (Phase 2+) get compressed intro arcs, AND their catch-up arc opens with how their recruiter (the previous animal in unlock order) called them to the house, and their `lastDialogueRead` index fast-forwards to the start of their previous phase's block (`fastForwardLateUnlockDialogue` in homeWorldData.ts + `getPhaseStartIndex` in animalDialogueBase.ts) — they arrive with a little personal history to share but never replay bright-days small talk under a dark sky.
- **Tutorial callback**: Fox at Phase 4 recontextualizes innocent tutorial lines as cult recruitment.
- **Narrative seeds**: Phase 0 seed lines → Phase 4 callbacks for all 10 animals.
- **Player choice points** (Phase 3): Each animal offers one binary choice. Both paths converge. Phase 4 delivers a one-time pre-dialogue callback recontextualizing the choice (`getAndMarkPhase4CallbackPage`), and Phase 5 weaves a serene choice callback into each animal's post-revelation cycle (`getPhase5ChoiceCallback`).

### Journal Hub Modal
📚 icon in header groups Word Ledger, Whisper Gallery, and Weekly Quests. Gated until puzzle 6. Fox introduces with 5-line walkthrough.

## Incantation System (Puzzle-Narrative Connection)

The core system making puzzles feel like rituals:

- **Ritual Word Memory**: Every word formed is recorded (capped at 500). `recordRitualWords()` in `amberCurrency.ts`.
- **Ritual Echo**: VictoryModal shows completed word chain. Styling evolves: bright candy → muted → dark/vertical arrows. Header: "Your Word Journey:" → "The Offering:".
- **Named Incantations** (Phase 2+): Deterministic chain names. Phase 2: "The HEAT Dance". Phase 4: "Offering: VOID to DOOM".
- **Ritual Energy**: Dread word presence scored 0-10. Each point adds 0.1 to `phaseProgress`. High-energy puzzles (7+) trigger micro-events.
- **Word Ledger**: Scrollable screen of all formed words. Dread words highlighted at Phase 2+.
- **Animal Whispers**: 150+ lines (3 per animal per phase). Prefers animals matching puzzle trigger words.
- **Dread Word Visual Feedback** (Phase 2+): Crimson pulse overlay on dread word formation. Phase-scaled opacity (0.10 → 0.25).
- **In-Puzzle Ritual Echo Chain**: Real-time word chain on puzzle screen left side. Phase-aware styling.
- **Arrangement Pattern** (Phase 2+): Visual sigil lines connecting rooms on house exterior.
- **Room Word Echoes** (Phase 2+): Faint puzzle words scattered across room backgrounds.

## Phase-Aware Visual Theming

### PhaseTheme System (`getPhaseTheme(phase)`)
- **Phase 0**: Bright candy purple (#667EEA), white/pink particles, vibrant confetti
- **Phase 1**: Muted lavender (#5B6DB0), amber-toned particles
- **Phase 2**: Cool blue-purple (#4A5580), desaturated particles
- **Phase 3**: Dark indigo (#2E3355), dim muted particles
- **Phase 4**: Near-black (#1A1A2E), crimson/purple accents, dying embers
- **Phase 5**: Muted purple (#252040), ghostly mauve particles, serene resignation

### Letter Tile Animation Evolution
- **Spring params**: Phase 0 bouncy (friction:3/tension:200) → Phase 4 heavy (friction:9/tension:80)
- **Wobble speed**: Phase 0 fast (150/300ms) → Phase 4 ponderous (400/800ms)
- **Trail glow** (Phase 3+): Purple → crimson shadow pulses
- **Resonance glow** (Phase 1+): Dread-tier words show inner glow (gold shimmer → crimson breathing)

### Home Background Colors
Phase 0-1: `#6fb7df` (sky_day) → Phase 2: `#514378` (sky_dusk) → Phase 3: `#060612` (sky_storm) → Phase 4: `#1a122a` (sky_shadow)

### Phase-Aware Text (`phaseNarrative.ts`)
ALL player-facing text shifts with phase. Key functions:
- `getVictoryTitle()`, `getVictoryFeedback()`, `getMoveMessage()`, `getHintMessage()`
- `getLoadingMessage()`, `getStartMessage()`, `getRulesText()`, `getPhaseChangeNarrative()`
- `getRitualEchoHeader/Footer()`, `getIncantationName()`, `getWordsOfferedText()`
- `getAnimalWhisper()`, `getAnimalInterjection()`, `getRitualMicroEvent()`
- `getInvalidWordMessage()`, `getLockedLetterMessage()`, `getHintFallback()`, `getNoValidMovesMessage()`
- `getNotificationPromptText()` — phase-aware copy for the one-time in-app notification pre-permission prompt
- Pit functions: `getPitScreenTitle/Subtitle()`, `getPitButtonLabel()`, `getPitOfferAllLabel()`, etc.
- Ward functions: `getPitWardHint()`, `getPitTransitionReadyText/CeremonyText()`, `getWardMarkColors()`

## Early Darkness Seeds (Phase 0)

Phase 0 contains subtle foreshadowing:
- **Victory Glitch**: ~8% chance of flash text ("WE SEE YOU", "CLOSER"). First victory always glitches.
- **Seed Move Messages**: ~5% chance of "wrong" messages at Phase 0 ("The letters remember.").
- **Onboarding Seeds**: Fox's lines have ominous undertones: "We've been waiting for someone like you.\n...A long time."

## Narrative Micro-Beats

One-time events at specific puzzle milestones (35, 40, 50, 55, 65, 80, 90, 100, 110, 130) to break the Phase 1-2 retention valley. `glitch_title` type briefly shows wrong victory text. `ambient_whisper` type shows atmospheric messages.

## Endgame

**House Completion**: All 10 rooms + animals → ceremony modal + cinematic event.
**Final Puzzle**: After house completion + Phase 4, next puzzle triggers `FINAL_PUZZLE_EVENT`.
**Post-Revelation (Phase 5)**: Next puzzle after final triggers `POST_REVELATION_EVENT` + `markPostRevelation()`. Special victory text, 10 new dialogues per animal.

## Onboarding (11-Step Guided Intro)

Fox guides new players through real screens:
1. `home_empty` → `fox_invited`: See empty den, invite Fox, Fox intro (4 lines)
2. `going_to_puzzle` → `puzzle_tutorial` → `puzzle_complete`: Real EASY puzzle with guided highlights
3. `going_to_pit` → `pit_intro` → `pit_offering`: Fox explains pit, player offers words
4. `returning_home` → `unlock_explained` → `complete`: Fox explains the cycle

During onboarding: simplified UI (no difficulty selector, stats, NEW button). Backward compatible with legacy tutorial flag. Persisted via `wordshift_onboarding_step`.

## Fox Post-Victory Intros

One-time Fox sequences triggered after victories in App.tsx:
- `variant_unlock`: New variant unlocked
- `home_tools`: Home screen features
- `setup_selector`: Puzzle setup selector
- `pit_harvest`: Pit harvest system (fires at puzzle 8, when the auto-collect window closes)
- `challenge_intro`: Challenge Mode (after 15 puzzles)
- `journal_intro`: Journal hub (from HomeScreen after puzzle 6)
- `daily_challenge_intro`: Daily Challenge on unlock

## Key Services Detail

### Puzzle Generation (`localGenerator.ts`)

Two-track generator with pre-computed indices:

- **Adjacency index**: `getInsertionIndex(wordLength)` — O(1) lookup for letter insertion candidates. Cached per word length.
- **Removal index**: `getRemovalIndex(wordLength)` — inverse mapping for reverse chain generation.
- **Standard**: Forward DFS, 2.5s timeout, 3 candidates, score ≥ 45. Anti-boring detection (penalizes S→plural, ED→past tense, etc.).
- **Reverse**: `generateReverseChain()` — random sampling + `isReverseSolvable()` validation. 25s timeout. `relaxBoring` flag widens pool.
- **Double shift**: `generateDoubleShiftPuzzle()` — 2-letter moves, `getDoubleInsertionIndex()` for pair lookups. Position-based locking via `receivedPositions`.
- **Phase-tiered dread words**: 548 words in 4 tiers. Scoring: `phase² × 2.5 × proximity_multiplier`.
- **Quality scoring**: Position preference (middle > edge), semantic journey bonus, word freshness, dread tier proximity.

### Amber Currency (`amberCurrency.ts`)

Core economy manager. Key functions:
- `awardPuzzleAmber()` — Returns balance/phase/streak + `phaseTransitionPending`. Deferred: sets `pendingPhaseTransition` instead of bumping phase.
- `confirmPhaseTransition()` — Bumps phase from pending, clears fraction. Called from pit ceremony.
- `applyVariantAmberBonus()` — Variant bonus with anti-farm decay (consecutive + weekly).
- `awardBonusAmber()` — General-purpose credit (streak milestones, etc.).
- `recordRitualWords()` — Record words, queue triggers, accumulate ritual energy.
- `consumeTriggerWords(animalType)` — Per-animal trigger word filtering.
- Phase tracking: `getFullProgress()`, `getPendingPhaseTransition()`, `getPhaseProgressFraction()`.
- Many one-time flags: `hasSeenChallengeIntro`, `hasSeenDailyChallengeIntro`, `hasSeenJournalIntro`, etc.

### Weekly Quests (`weeklyQuests.ts`)

4 rotating quests generated each Monday (seeded deterministic). Types: solve_count, solve_difficulty, earn_stars, daily_complete, no_hints, challenge_mode, earn_amber, visit_animals, streak_days, sacrifice_amber (Phase 4+ only), daily_streak. Rewards: 30-140 amber base, phase-scaled (1.0x → 2.0x).

### Whisper Gallery (`whisperGallery.ts`)
Collectible archive of all whispers, dialogue snippets, and narrative moments. Cap: 500 entries. Phase-aware titles.

### Sacrifice Mechanic (`sacrifice.ts`)
Phase 4+: voluntary amber destruction. No gameplay benefit. Phase-aware responses. Milestone messages at 1/5/10/25/50/100.

### Room Upgrades (`roomUpgrades.ts`)
Phase 2+: one cosmetic enhancement per room (10 total, 75-150 amber). Phase-aware descriptions.

### Notifications (`notifications.ts`)
Local push: daily reminders (phase-aware morning messages), streak-at-risk reminders (7pm the next missed day when streak ≥ 2, copy via `getStreakRiskMessage(phase, streak)`), and re-engagement (6pm; next day for non-streak players, day after the streak warning for streak holders — an escalation ladder). Each app session reschedules everything, so reminders only fire on genuinely missed days. Phase 5 has distinct serene tone.

**Permission flow**: `scheduleAllNotifications()` never prompts — it only schedules when permission is already granted. The OS dialog is triggered solely by `requestNotificationPermission()`, reached two ways: the one-time contextual prompt after the player's 3rd+ victory (App.tsx `maybePromptForNotifications`, copy from `getNotificationPromptText()`), or the Daily Reminders toggle in Settings. The prompt result is logged as a `notification_permission_result` event.

### Cloud Save (`cloudSave.ts`)
Client-side sync layer with pluggable `CloudProvider` interface. Currently `NoOpProvider`. `collectLocalSaveData()` / `restoreFromCloudData()`.

## Asset System

### Current State
- **Store assets are real**: 1024×1024 icon.png, adaptive-icon.png, splash.png, and the Android notification-icon.png are generated by `scripts/tools/generateAppIcons.mjs` / `generateNotificationIcon.mjs` (`npm run generate:assets`)
- **SFX pack**: 14 WAV chimes in `assets/sounds/`, generated by `scripts/tools/generateSounds.mjs`
- **All 10 character sprites** wired up: idle.png, talk.png, robed.png per animal
- **All 10 room backgrounds** wired up in RoomView.tsx
- **Environment**: sky_day/dusk/storm/shadow.png (phase-aware), pitt_day/dusk/night.png (pit backgrounds). Oversized backgrounds were downscaled for mobile via `scripts/tools/downscaleImages.mjs` (skies 1080px wide, aquarium/jungle/office rooms downscaled too)
- **World art (pixel style, wired into HouseWorld)**: `cloud_1/2.png`, `roof.png` (chimney + attic window baked in; smoke puffs animate above it), `foundation.png`, and the tappable `pit_entrance.png` (stone path + glowing mouth) rendered in the layout flow below the foundation — all crisp pixel art matching the room interiors, generated by `scripts/tools/generatePixelWorld.mjs`. `ground.png`/`tree.png` exist but are intentionally NOT rendered: the sky backgrounds are full landscapes with their own grass and trees. The soft `shadow_figure.png` (the entity) is deliberately NOT pixel art — it should read as otherworldly against the pixel world (`generateWorldArt.mjs`)
- **UI sprites**: `assets/ui/` star_filled/star_empty/amber/flame/journal/pit.png replace the ⭐ 💎 🔥 📚 ⭕ emoji in VictoryModal, the home header, stats, and unlock prompts (`scripts/tools/generateUiIcons.mjs`). `<AmberInline />` embeds the amber gem inside Text runs. Icon art is tuned bright/high-contrast for the translucent dark header pills. Remaining emoji (🏆 📋 ✨) are intentional accents with accessibility labels
- **Store kit**: `docs/feature-graphic.png` (1024×500) + `docs/STORE_LISTING.md` (descriptions, keywords, age rating, screenshot shot list)
- **Not yet created**: replacing the generated icon/SFX/world art with commissioned art/audio is optional polish

### Asset Directories
```
mobile/assets/
├── characters/{fox,pangolin,owl,axolotl,capybara,sloth,fennec_fox,wombat,rabbit,red_panda}/
│   └── idle.png, talk.png, robed.png
├── rooms/{cozy_den,kitchen,study,aquarium,jungle,desert,office,burrow,garden,bamboo}.png
├── house/           # Planned: roof, frame, foundation, chimney
└── environment/     # sky_day/dusk/storm/shadow.png, pitt_day/dusk/night.png + planned assets
```

### Phase 4 Visual Changes
- Use `robed.png` for all animals
- Sky: `sky_shadow.png`
- Puzzle background: near-black (#1A1A2E) with crimson embers
- Confetti: dark muted colors
- All text: nihilistic/ritual tone

## Coding Conventions

- TypeScript with explicit types for props and state
- React Native StyleSheet (not inline styles)
- Functional components with hooks
- Import colors from `CandyColors` in `theme/colors.ts`; use `getPhaseTheme(phase)` for phase-aware
- **All player-facing text through `phaseNarrative.ts`** — never hardcode strings
- **Animation cleanup**: Store animation return values, `.stop()` in useEffect cleanup
- **Native driver preferred**: `useNativeDriver: true`; use opacity overlays instead of JS-bridge backgroundColor. As of the ship-readiness pass there are **zero `useNativeDriver: false` animations** in src/components — glows are pre-styled overlay Views with native-driven opacity
- **Device tier gating**: `shouldSimplifyAnimations()` to skip decorative animations on low-end
- **React.memo** on expensive pure components (e.g., Row)
- **MoveDelta pattern**: Undo uses lightweight deltas, not deep clones
- **Schema versioning**: `dataMigration.ts` for storage format changes
- **Concurrent spend guard**: `spendInProgress` flag in amberCurrency
- AsyncStorage with in-memory cache pattern (load → cache → return cached)
- TS strict: module-level nullable caches need local variable assignment
- `reducedMotion`: All animations must check and skip/set-instantly
- **Narrative consistency**: Any new feature must respect current phase. Cheerful-only-at-Phase-0.
- **No over-engineering**: Only make directly requested changes. Don't add features, refactoring, or docstrings beyond what's asked.
- Accessibility: `accessibilityLabel` and `accessibilityRole` on interactive elements; never convey information by color alone (see the ✓/✗ slot-preview prefixes); dark-phase text colors must hold ≥4.5:1 contrast against their backgrounds
- Store/legal: privacy policy + terms live in `docs/` (GitHub Pages); Settings links route through `src/constants/links.ts`

## Testing Patterns

- Shared AsyncStorage mock: `createMockAsyncStorage()` from `helpers/mockAsyncStorage.ts`
- `beforeEach`: call both `AsyncStorage.clear()` AND service-specific clear functions
- Puzzle generator tests mock `amberCurrency.getCurrentPhase` + all `wordHistory` functions
- Hook tests use manual React mock with stateStore Map + index rewind
- `DialoguePhase` is `0|1|2|3|4|5` literal — mock return values need `as number` cast
- Component tests use `jest.mock('react-native', ...)` stubs (Node env, no renderer)
- Performance monitor tests mock `requestAnimationFrame`, `cancelAnimationFrame`, `performance.now`
- Date-sensitive tests must build dates from local components (`new Date(2026, 1, 9)`), never ISO strings (`new Date('2026-02-09')` parses as UTC midnight → previous local day in timezones behind UTC)
- Tests whose code path calls `logEvent` should `jest.mock('../services/eventLogger')` so the 5s debounced flush timer can't fire after teardown
- Phase-threshold tests must use `PHASE_THRESHOLDS` values from `constants/gameBalance.ts` ([0, 20, 65, 150, 235]) — don't hardcode stale balance numbers

## Common Tasks

### Adding new word categories
Edit `SEMANTIC_CLUSTERS` in `localGenerator.ts`

### Adjusting puzzle difficulty
Modify scoring weights in `scorePuzzleChain()` or `MIN_ACCEPTABLE_SCORE`

### Adjusting word diversity/cooldowns
Edit constants in `wordHistory.ts`: `HARD_COOLDOWN` (25), `SOFT_COOLDOWN` (60), `MAX_HISTORY_SIZE` (150). Bank selection also applies a hub-word penalty (`getBankWordFrequency` in `puzzleBank.ts`) against the generator's over-used words, and picks randomly from the top 10 scored candidates.

### Adjusting star ratings
Edit `calculateStars()` in `starRating.ts`

### UI adjustments
- Tile sizes: `LetterTile.tsx` (standard 52x64, compact 42x52 when wordLength ≥ 6)
- Row layout/arc: constants in `Row.tsx` (ARC_ROTATION, ARC_LIFT, SLOT_WIDTH, SLOT_HEIGHT)
- Colors: `theme/colors.ts`
- Room dimensions: `ROOM_WIDTH` (250), `ROOM_HEIGHT` (~123) in `HouseWorld.tsx`
- Status bar padding: `Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60`

### Adding achievements
1. Add to `ACHIEVEMENTS` array in `achievements.ts` with `id`, `title`, `description`, `icon`, `category`, `rewardAmber`, `check`
2. `check` receives `AchievementCheckState`; `rewardAmber` is credited once via `awardBonusAmber` when the achievement unlocks (shown in AchievementToast)
3. Add test in `achievements.test.ts`

### Adding animals
1. Add type to `AnimalType` in `types/homeWorld.ts`
2. Add dialogues in `animalDialogue.ts` (all 5 phases)
3. Add animal/room in `homeWorldData.ts`
4. Add to `UNLOCK_PROGRESSION`

### Adjusting amber rewards
Edit `AMBER_REWARDS` in `types/homeWorld.ts`

### Adjusting dialogue phases
Edit `PHASE_THRESHOLDS` in `constants/gameBalance.ts`. `MIN_PUZZLES_FOR_PHASE` sets minimum real puzzles per phase.

### Adjusting dialogue sessions
Edit `DIALOGUE_SESSION_CONFIG` in `types/homeWorld.ts`:
- `getDialoguesPerSession(phase)` — Phase 0-1=3, Phase 2-3=5, Phase 4=6, Phase 5=4
- `getPuzzlesBetweenSessions(phase)` — Phase 0=2, Phase 1=3, Phase 2=4, Phase 3-4=5

### Adding sound effects
1. Add file to `assets/sounds/` (or regenerate the synth pack: `node scripts/tools/generateSounds.mjs`)
2. Register in `SOUND_SOURCES` in `audio.ts` (add to `PRELOAD_SOUND_NAMES` if hot-path)
3. Call from relevant component (auto-checks `settings.soundEnabled`)

### Regenerating puzzle banks
1. `npm run generate:puzzles` (long-running jest generators in `scripts/`)
2. **Always** run `node scripts/tools/purgeProfanity.mjs` afterwards — the generator does not filter offensive words; the purge script removes them from both dictionaries and drops affected bank puzzles
3. The blocklist lives in `scripts/tools/purgeProfanity.mjs` (`BLOCKED_WORDS`)

## Narrative Acceleration

Engaged players can reach Phase 4 in ~120-150 puzzles instead of 250:
- High three-star rate: 1.5x phase progress
- Long streaks (7+ days): 1.25x
- Hard difficulty: 1.5x
- Challenge mode: 2.0x

## Known Constraints

- Standard/reverse/double_shift at ALL difficulties from pre-generated banks (lazy-loaded); speed generates on-device
- On-device timeout: 2.5s standard, 25s reverse, 5s double-shift. Wrapper: 4s/30s
- Fallback pool: 15 pre-validated puzzles across 3 tiers
- Dictionary: common English only (no proper nouns), 3-7 letters
- Arc layout uses `overflow: visible`
- Dialogue sessions persist across restarts
- House view: `react-native-gesture-handler` (vertical pan only)
- TouchableOpacity in home components from `react-native-gesture-handler`; HomeScreen modals use react-native's
- Daily challenge uses Math.random override (concurrency-guarded)
- Victory flow: `isProcessingVictory` lock
- AnimatedBackground: opacity overlay (native driver compatible)
- Device tier detection is heuristic (PixelRatio + screen size)

## Monetization

Full plan in `MONETIZATION_PLAN.md`. Core principle: players pay for *expression* and *convenience*, never for *narrative progression*.

**Key points:**
- **Rewarded video ads** (opt-in): bonus amber, cooldown skip, quest bonus, hint recovery
- **Interstitials** (between puzzles only): every 3rd (Phase 0-2) or 5th (Phase 3+), many exemptions
- **Patron's Key** ($6.99): ad-free, exclusive tile theme, +2 amber/puzzle, extended undo, cloud save
- **Cosmetic Shop**: tile themes, room accents, confetti effects, animal accessories
- **Content Pass**: monthly ($1.99) and quarterly ($4.99) curated content
- **Mid-game amber sinks**: animal gifts, room upgrades, amber altar
- **Never**: energy/lives, loot boxes, pay-to-skip-phases, forced ads, paywalled animals, amber bundles
