# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. What begins as a bright, candy-colored experience with adorable animal companions gradually descends into cosmic horror — the animals are revealed to be members of a cult, and every puzzle the player solves brings them closer to summoning a dark entity.

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
- **Shadow figure**: Invisible → faint silhouette → full presence with crimson eyes above house
- **Music/sound** (future): Cheerful chimes → droning, dissonant ambience

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
- **Phase 1 (Curious Thoughts)**: Animals start wondering about the nature of things. Subtle philosophical undertones. "Have you ever noticed how letters can become anything?"
- **Phase 2 (Deeper Questions)**: Isolation creeps in. Animals question reality, impermanence. Words shift toward emptiness. The background noticeably darkens.
- **Phase 3 (Growing Shadows)**: Overt dread. Animals speak of endings, purpose, something approaching. The puzzle screen feels cold. Victory feels hollow.
- **Phase 4 (The Horizon)**: The cult is revealed. Animals speak of "the arrangement," "the pattern," "what comes through." Robed sprites. Storm sky. The shadow figure appears. Every puzzle solved is explicitly framed as part of the summoning. Victory text questions why the player continues.
- **Phase 5 (Post-Revelation)**: After the final puzzle + house completion. Terrible peace. Animals are serene, not dreadful. The shadow has settled. The pattern continues. Victory text: "The pattern continues." / "Another thread in the weave."

## Quick Commands

```bash
cd mobile
npm install          # Install dependencies
npx expo start       # Start dev server (scan QR with Expo Go)
npx expo start --clear  # Clear cache and start
npx jest --no-coverage   # Run all tests (680 tests, 26 suites)
```

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript (strict)
- **Navigation**: State-based (`currentScreen: 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery'`)
- **State**: React useState/useEffect (no external state library)
- **Persistence**: AsyncStorage with in-memory cache pattern
- **Haptics**: expo-haptics (settings-gated)
- **Audio**: expo-av (placeholder infrastructure, awaiting real audio assets)
- **Testing**: Jest with ts-jest preset
- **Target**: iOS and Android via Expo Go

## Project Structure

```
mobile/
├── App.tsx                      # Main app: screen routing, onboarding orchestration, wires hooks together
├── assets/                      # Image assets (see Asset System below)
│   ├── characters/              # Animal character sprites
│   ├── rooms/                   # Room background images
│   ├── house/                   # House structure elements
│   └── environment/             # Sky, trees, ground, etc.
├── src/
│   ├── types.ts                 # TypeScript interfaces (RowData, Letter, GameState, etc.)
│   ├── types/
│   │   └── homeWorld.ts         # Home screen types, config constants, streak/amber types
│   ├── constants.ts             # Word lists by length (3-7 letters), COMMON_WORDS set, fallback puzzle pools
│   ├── dictionary.ts            # 11500+ word dictionary for validation (3-7 letter words)
│   ├── hooks/
│   │   ├── usePuzzleGame.ts     # All puzzle game state and actions (extracted from App.tsx)
│   │   ├── useGamePersistence.ts # Persistence: amber, stats, phases (extracted from App.tsx)
│   │   ├── useVictoryFlow.ts    # Victory animation choreography (stars, modal, phase flash)
│   │   ├── useAchievementQueue.ts # Achievement checking + toast queue processing
│   │   ├── useDialogueFlow.ts   # Dialogue session state, animations, cooldown messaging
│   │   └── useUnlockFlow.ts     # Home unlock flow: in-world room/animal prompts, purchases, modal state
│   ├── components/
│   │   ├── Row.tsx              # Game row with PICK/DROP badges, arc layout (React.memo'd)
│   │   ├── LetterTile.tsx       # Animated letter tile with 3D candy styling, phase-aware springs/trails, resonant word glow (compact mode for 6+ letters)
│   │   ├── AnimatedBackground.tsx  # Phase-aware floating particles + native-driver pulse
│   │   ├── PhaseTransitionOverlay.tsx # Cinematic multi-scene interstitial for phase changes
│   │   ├── Confetti.tsx         # Phase-aware confetti + StarBurst for valid moves
│   │   ├── ErrorBoundary.tsx    # React error boundary wrapper
│   │   ├── FoxGuide.tsx         # Floating Fox speech bubble overlay (used during onboarding)
│   │   ├── Tutorial.tsx         # [DEPRECATED] Old mini-puzzle tutorial overlay; utility functions still used for backward compat
│   │   ├── SettingsScreen.tsx   # Sound/Haptics/Reduced Motion toggles + Reset All
│   │   ├── StatsScreen.tsx      # Stats overview + achievements (two tabs)
│   │   ├── AchievementToast.tsx # Slide-in achievement notification
│   │   ├── DailyChallengeCard.tsx # Compact circular daily challenge button (header, shown after unlock)
│   │   ├── puzzle/              # Extracted puzzle screen UI components
│   │   │   ├── ActionButton.tsx # 3D-styled button with glow animation + spring press
│   │   │   ├── AnimatedLogo.tsx # Animated WORDSHIFT logo with bounce + subtle rotation
│   │   │   ├── LevelDisplay.tsx # Level/stat badge display
│   │   │   ├── Toast.tsx        # Animated toast notification (slide-in + error shake)
│   │   │   ├── VictoryModal.tsx # Victory screen modal (stars, stats, amber breakdown)
│   │   │   ├── RulesModal.tsx   # Phase-aware "How to Play" rules modal
│   │   │   ├── DifficultyMenu.tsx # Phase-aware setup menu: difficulty + challenge + variant/combo selector (unlocked styles only)
│   │   │   ├── AnimalWhisper.tsx # Ghost-like post-puzzle whisper from animals (fade in/out)
│   │   │   ├── RitualEchoChain.tsx # In-puzzle real-time word chain display (phase-aware styling)
│   │   │   └── index.ts         # Puzzle component exports
│   │   ├── WhisperGalleryScreen.tsx # Collectible whisper/dialogue archive screen (phase-aware)
│   │   ├── WordLedger.tsx       # Scrollable ritual word history screen (phase-aware styling)
│   │   └── home/
│   │       ├── HomeScreen.tsx   # Main home screen with animal house, in-world unlock prompts, unlock progress
│   │       ├── HouseWorld.tsx   # Pannable house view (vertical pan only)
│   │       ├── RoomView.tsx     # Individual room rendering
│   │       ├── AnimalSprite.tsx # Animated animal characters with movement + emotions
│   │       ├── JuicyButton.tsx  # Bouncy animated button with pulse
│   │       ├── AmberSparkle.tsx # Animated sparkle particles floating upward
│   │       ├── CelebrationConfetti.tsx # 30-piece confetti burst on unlock celebration
│   │       └── index.ts         # Home component exports
│   ├── theme/
│   │   └── colors.ts            # CandyColors palette, tile colors, PhaseTheme system
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation with DFS, quality scoring, phase-tiered dread words, resonance tier export
│       ├── wordHistory.ts       # Word cooldown tracking for puzzle diversity
│       ├── starRating.ts        # Star rating system + cumulative stats + noHintPuzzleCount
│       ├── amberCurrency.ts     # Amber economy, streak (grace period), phase progression
│       ├── animalDialogue.ts    # 560+ dialogue lines (Stephen King literary voice), cross-animal refs, catch-up, tutorial callbacks, coordinated events, narrative seeds, word threshold dialogues, sacrifice reactions
│       ├── dialogueSession.ts   # Dialogue sessions with puzzle-based cooldowns
│       ├── homeWorldData.ts     # Room/animal definitions and unlock progression
│       ├── dailyChallenge.ts    # Daily puzzle with seeded PRNG for determinism
│       ├── phaseNarrative.ts    # Phase-aware text: victory, moves, hints, loading, rules, animal whispers, interjections, micro-events, victory glitch seeds
│       ├── phaseEvents.ts       # Phase transition narrative events (cinematic interstitials with particle configs and scene effects)
│       ├── achievements.ts      # 33 achievements across 6 categories
│       ├── shareResults.ts      # Enhanced Wordle-style sharing with word chains, animal whispers
│       ├── weeklyQuests.ts      # Weekly quest system: 4 rotating quests, amber rewards, phase-aware descriptions
│       ├── puzzleVariety.ts     # Puzzle variant configs, unlock requirements, selector options, restrictions, and combo metadata
│       ├── whisperGallery.ts    # Collectible archive of all seen whispers, dialogue, and narrative moments
│       ├── dialogueChoices.ts   # Player choice points at Phase 3 — illusion of agency in the narrative
│       ├── sacrifice.ts         # Phase 4+ amber sacrifice mechanic — voluntary offerings to the arrangement
│       ├── notifications.ts     # Push notification scheduling: daily reminders, re-engagement, phase-aware messages
│       ├── cloudSave.ts         # Cloud save infrastructure: provider interface, data collection, sync status
│       ├── settings.ts          # User preferences (sound, haptics, reducedMotion)
│       ├── haptics.ts           # Haptic feedback (settings-gated)
│       ├── audio.ts             # Sound effects (placeholder, awaiting assets)
│       ├── eventLogger.ts       # Analytics event logging
│       ├── deviceTier.ts        # Device capability detection for animation scaling
│       ├── performanceMonitor.ts # Frame rate, render timing, puzzle gen metrics
│       ├── onboarding.ts        # Multi-screen onboarding state machine with AsyncStorage persistence
│       ├── dataMigration.ts     # Schema versioning with sequential migrations
│       └── errorReporting.ts    # Error reporting infrastructure (breadcrumbs, context)
├── src/__tests__/               # Test suites (680 tests, 26 suites)
│   ├── helpers/
│   │   └── mockAsyncStorage.ts  # Shared AsyncStorage mock factory
│   ├── achievements.test.ts
│   ├── animalDialogueVariants.test.ts # Variant tutorial dialogue coverage across variants/animals/phases
│   ├── amberCurrency.test.ts
│   ├── cloudSave.test.ts        # Cloud save infrastructure: providers, sync, collect/restore
│   ├── components.test.ts       # Component data contracts, phase theme, rules modal
│   ├── dailyChallenge.test.ts
│   ├── dataMigration.test.ts
│   ├── dialogueChoices.test.ts  # Player choice points, Phase 4 callbacks
│   ├── dialogueSession.test.ts
│   ├── eventLogger.test.ts
│   ├── homeWorldData.test.ts
│   ├── integration.test.ts      # End-to-end: victory flow, phase transitions, economy, achievements
│   ├── localGenerator.test.ts
│   ├── notifications.test.ts    # Notification prefs, phase-aware messages
│   ├── performanceMonitor.test.ts # Frame monitoring, render timing, generation metrics
│   ├── phaseNarrative.test.ts
│   ├── puzzleVariety.test.ts    # Puzzle variant modes, overrides, amber multipliers
│   ├── sacrifice.test.ts        # Sacrifice mechanic, milestones, stats
│   ├── settings.test.ts
│   ├── shareResults.test.ts
│   ├── starRating.test.ts
│   ├── useGamePersistence.test.ts
│   ├── usePuzzleGame.test.ts
│   ├── weeklyQuests.test.ts     # Weekly quest generation, progress, rewards
│   ├── whisperGallery.test.ts   # Whisper recording, dedup, gallery stats
│   └── wordHistory.test.ts
```

## Asset System (Images)

The home screen is transitioning from emoji-based graphics to proper image assets. Assets are added incrementally - when an asset exists, use it; otherwise fall back to the current emoji/styled implementation.

### Asset Directory Structure

```
mobile/assets/
├── characters/                  # Animal character sprites (idle.png, talk.png, robed.png each)
│   ├── fox/                    # ✓ Complete (idle, talk, robed)
│   ├── pangolin/               # ✓ Complete
│   ├── owl/                    # ✓ Complete
│   ├── axolotl/                # ✓ Complete
│   ├── capybara/               # ✓ Complete
│   ├── sloth/                  # ✓ Complete
│   ├── fennec_fox/             # ✓ Complete
│   ├── wombat/                 # ✓ Complete
│   ├── rabbit/                 # ✓ Complete
│   └── red_panda/              # ✓ Complete
│
├── rooms/                       # Room background images (280x140 recommended)
│   ├── cozy_den.png            # Fox's room - fireplace, armchair, rug, lamp
│   ├── kitchen.png             # Pangolin's - stove, pots, stone hearth, table
│   ├── study.png               # Owl's - bookshelves, desk, quill, globe
│   ├── aquarium.png            # Axolotl's - large tank, bubbles, coral, fish
│   ├── jungle.png              # Sloth's - vines, hammock, plants, tropical
│   ├── desert.png              # Fennec's - tent, cactus, starry window, sand
│   ├── office.png              # Capybara's - desk, computer, lamp, papers
│   ├── burrow.png              # Wombat's - dirt walls, roots, cozy underground
│   ├── garden.png              # Rabbit's - flowers, table, teacups, outdoor patio
│   └── bamboo.png              # Red Panda's - bamboo walls, lantern, zen decor
│
├── house/                       # House structure elements (planned, not yet created)
│   ├── roof.png                # Dark shingles roof
│   ├── frame_left.png          # Left wall/border of house
│   ├── frame_right.png         # Right wall/border of house
│   ├── foundation.png          # Stone base at bottom
│   ├── floor_divider.png       # Horizontal beam between rooms
│   └── chimney.png             # Chimney with smoke (optional)
│
└── environment/                 # Background and scenery
    ├── sky_day.png             # ✓ Blue gradient with clouds (Phase 0-1)
    ├── sky_dusk.png            # ✓ Muted dusk sky (Phase 2)
    ├── sky_storm.png           # ✓ Dark, ominous sky (Phase 3)
    ├── sky_shadow.png          # ✓ Near-black with entity silhouette (Phase 4)
    ├── tree_left.png           # Planned: tree on left side of house
    ├── tree_right.png          # Planned: tree on right side of house
    ├── ground.png              # Planned: grass, path, flowers at bottom
    ├── cloud_1.png             # Planned: animated cloud sprite
    ├── cloud_2.png             # Planned: second cloud variant
    ├── shadow_figure.png       # Planned: the looming entity (Phase 4 only)
    └── birds.png               # Planned: optional flying birds
```

### Asset Integration Guidelines

**When adding a new asset:**
1. Drop the image file into the appropriate folder
2. Update the corresponding component to check for and use the asset
3. Keep emoji fallback for missing assets

**Loading pattern:**
```typescript
// Example: Check if asset exists, fallback to emoji
const foxIdleImage = require('../../assets/characters/fox/idle.png');
// Use Image component when asset exists, Text with emoji otherwise
```

**Phase 4 visual changes (the cult is revealed):**
- Use `robed.png` variants for all animals at Phase 4 — cult robes/cloaks
- Sky progresses: `sky_day.png` → `sky_dusk.png` → `sky_storm.png` → `sky_shadow.png`
- Show `shadow_figure.png` in background — the entity being summoned
- Puzzle screen background shifts to near-black (#1A1A2E) with crimson particle embers
- Victory confetti uses dark muted colors instead of rainbow
- All text (victory, hints, move messages) takes on nihilistic/ritual tone

**Room backgrounds:**
- Room images should be 280x140px (or 2x/3x for retina)
- Include all furniture/decorations baked into the image
- Animal sprites render on top of room background

### Current Asset State

The home screen now uses image assets for:
- **Character sprites** (`idle.png`, `talk.png`, `robed.png`) in `AnimalSprite.tsx`:
  - **All 10 animals have sprites**: Fox, Pangolin, Owl, Axolotl, Capybara, Fennec Fox, Sloth, Wombat, Rabbit, Red Panda (all 3 variants each)
- **All 10 room backgrounds** in `RoomView.tsx` - fully wired up
- **Environment images** in `HouseWorld.tsx`:
  - `sky_day.png` / `sky_dusk.png` / `sky_storm.png` / `sky_shadow.png` - phase-aware sky background (day → dusk → storm → shadow)
- **Animated emoji sky elements** (clouds, sun/moon, birds, shooting stars, night stars) rendered inside the transform container so they zoom/pan with the scene
- Trees, fence, and ground emoji have been removed for a cleaner look
- **Not yet created**: `shadow_figure.png`, `ground.png`, all house structure elements (`house/` folder empty), tree/cloud/bird sprites

All 10 character sprites are wired up in `CHARACTER_SPRITES` in `AnimalSprite.tsx`.

## Game Mechanics

1. Player sees a chain of words (3-5 rows depending on difficulty; daily challenge is always 5 rows of 6-letter words)
2. Pick a letter from current word - word shrinks by 1 letter
3. Drop letter into next word - word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

### Difficulty Levels

| Difficulty | Word Length | Rows | Amber | Description |
|-----------|-------------|------|-------|-------------|
| EASY | 4 letters | 3 | 5 | Quick intro puzzles |
| MEDIUM | 4 letters | 4 | 10 | The standard experience |
| MEDIUM_PLUS | 5 letters | 4 | 15 | Bridge between MEDIUM and HARD |
| HARD | 5 letters | 5 | 20 | Full challenge |

### Puzzle Variant Modes (`puzzleVariety.ts`)

Variants are now player-selected from the setup menu (not randomly injected). Players can choose any unlocked base variant or combo before starting a puzzle, and a preferred variant is persisted for future runs.
- **Reverse Shift**: Standard rules down to the bottom, then return all the way back up to the first row.
- **Blind Shift**: Unreached rows stay concealed until revealed by progress.
- **Speed Shift**: 60-second timed run.
- **Chain Shift**: 3 linked puzzles where each final word becomes the next starting word.
- **No Vowel / No Consonant**: Restriction variants that lock one letter class.
- **Combos**: `reverse_blind`, `blind_no_vowel`, `blind_no_consonant`, `speed_no_vowel`, `speed_no_consonant`.

Variant descriptions/instructions shift tone at Phase 3+ (dark descriptions). Locked variants and combos stay fully hidden until unlocked, so players only see styles they can actually select.
- **Progressive disclosure**: combo variants are only shown once unlocked; until then, the setup menu shows a generic “more combinations later” message (without showing locked entries).
- **Difficulty pressure scaling**: speed variants use difficulty-aware timers (EASY 65s, MEDIUM 60s, MEDIUM_PLUS 54s, HARD 48s); chain variants scale up on higher difficulty (`targetRows` and `chainLength` increase at higher tiers).
- **Economy anti-farm**: variant multipliers were rebalanced for selectable play and now taper with repeated back-to-back use of the same variant through `applyVariantAmberBonus()` in `amberCurrency.ts`.
- **Wired in**: `DifficultyMenu.tsx` renders only unlocked variant cards (selected/active states). `usePuzzleGame.ts` uses selected variant in `startNewGame(...)`, persists preference via `amberCurrency` (`getPreferredPuzzleVariant` / `setPreferredPuzzleVariant`), enforces restrictions in input handling, and returns active `variant` in completion data. `useGamePersistence.ts` applies variant bonus via `applyVariantAmberBonus(...)` (persisted, anti-farm decay).

## App Architecture

### Custom Hooks

Game logic is extracted into six custom hooks:

**`usePuzzleGame()`** (`src/hooks/usePuzzleGame.ts`):
- All puzzle state: rows, selected letter, game state, hints, validation, gameMode, currentPhase
- `initGame(words, hint?, solution?, wordLength?)` - Load pre-generated puzzle
- `startNewGame(difficulty?, mode?, variant?)` - Generate and start a puzzle using the selected/preferred variant (or explicit override)
- `setSelectedVariant(variant)` - Update preferred variant and persist it for subsequent runs
- `handleLetterPress(letter, rowIndex)` - Pick a letter
- `handleSlotPress(targetIndex)` - Drop letter into slot, returns completion data + gameMode; intermediate moves return `{ completed: false, formedWord }` for dread word detection
- `handleHint()` - Show phase-aware hint (blocked in challenge mode)
- `handleUndo()` - Undo last move (limited to 1 in challenge mode); uses MoveDelta pattern (lightweight deltas instead of deep clones)
- `setCurrentPhase(phase)` - Sync narrative phase from persistence layer
- All messages (start, loading, move success, hints) use `phaseNarrative.ts` for phase-aware tone

**`useGamePersistence()`** (`src/hooks/useGamePersistence.ts`):
- All persistence: amber balance, cumulative stats, phase, streak
- `recordVictory(difficulty, hintsUsed, invalidAttempts, gameMode?, completedWords?)` - Record win, update stats, returns VictoryData
- `refreshStats()` - Reload stats, amber balance, AND current phase from storage (called on puzzle screen navigation to sync phase after DEV or external changes)
- `setAmberBalance(balance)` - Direct setter for amber balance

**`useVictoryFlow()`** (`src/hooks/useVictoryFlow.ts`):
- Victory animation state: star pop-in refs, modal scale/opacity, phase flash overlay
- `playVictorySequence(stars)` - Choreographed star stagger + modal reveal
- `playPhaseChangeFlash()` - Double flicker to black for phase transitions
- `resetVictory()` - Clear animation state for next puzzle
- `isProcessingVictory` - Lock flag to block interaction during async victory chain

**`useAchievementQueue()`** (`src/hooks/useAchievementQueue.ts`):
- Achievement checking and toast queue processing
- `checkForAchievements()` - Fetches progress and checks for newly unlocked achievements
- Auto-processes queue via useEffect (shows next when current dismissed)
- Haptic feedback on achievement notification

**`useDialogueFlow()`** (`src/hooks/useDialogueFlow.ts`):
- Animal dialogue session state, animations, and cooldown messaging for home screen
- `handleAnimalTap(animal)` - Check availability, start session or show cooldown message; also consumes trigger words (per-animal filtering), checks for sacrifice reactions (Phase 4+), checks for tutorial callbacks (Fox Phase 4), rolls for cross-animal references (frequency scales with phase: 10% → 60%, guaranteed first for Vanguard animals), checks for coordinated dialogue events at puzzle milestones, and checks for word threshold dialogues
- `handleNextDialogue()` - Advance dialogue, record progress, check session limits
- `handleCloseDialogue()` - End session, clean up state
- One-time early-game Fox nudge: injects `getFoxPostTutorialPlayPrompt(...)` and calls `onFoxPlayPrompt` to highlight PLAY after the first post-tutorial Fox session
- Returns: `selectedAnimal`, `showDialogue`, `dialogueText`, `sessionInfo`, `cooldownMessage`, `isTalking`, `triggerReaction`, `crossAnimalRef`
- Animations: cooldown toast slide-in/out, dialogue modal spring, talking sprite alternation (idle/talk every 300ms)

**`useUnlockFlow()`** (`src/hooks/useUnlockFlow.ts`):
- Home unlock flow for rooms/animals: in-world prompts, modal state, purchases
- `handlePurchase(unlock)` - Execute purchase, trigger celebration, show intro dialogue for new characters
- `handleRoomPress(room)` - Handle locked room tap or room needing an animal
- `refreshUnlockData(freshRooms, freshAnimals)` - Refresh state from storage (avoids stale closures)
- Returns: `showShop`, `showRoomUnlock`, `showInvitePrompt`, `nextUnlock`, `allUnlocks`

### Screen Navigation

State-based routing in `App.tsx`:
- `currentScreen: 'home' | 'puzzle' | 'settings' | 'stats' | 'ledger' | 'gallery'`
- Screen transitions use `Animated.timing` fade (150ms out, 200ms in)
- Transitions instant when `reducedMotion` setting is enabled
- `transitionTo(screen, callback?)` handles all navigation
- **Phase sync on puzzle entry**: `handlePlayPuzzle` and `handleStartDaily` call `persistenceActions.refreshStats()` before transitioning, ensuring the puzzle screen always has the latest phase for correct visual theming

### Victory Flow

Managed by `useVictoryFlow()` hook. When puzzle completes (`handleSlotPress` returns `{completed: true}`):
1. `isProcessingVictory` lock prevents double-tap during async chain
2. Record stars via `calculateStars(hintsUsed, invalidAttempts)`
3. Record puzzle completion via `amberCurrency.awardPuzzleAmber()` + `recordRitualWords()`
4. Check for newly unlocked achievements via `useAchievementQueue()`
5. Choreographed victory sequence (`playVictorySequence`):
   - Stars pop in one-by-one with 200ms stagger (spring animation)
   - Victory modal scales + fades in after stars complete
   - Phase-aware title: "PERFECT!" (Phase 0) → "WHY DOES IT MATTER?" (Phase 4)
   - **Ritual Echo** (all phases): Completed word chain displayed below title. Phase 0-1: bright candy styling. Phase 2: muted. Phase 3+: dark, arrows become vertical (↓). Header reframes from "Your Word Journey:" → "The Offering:"
   - **Named Incantation** (Phase 2+): Puzzle chain name shown in ritual echo. Phase 2: innocent ("The HEAT Dance"). Phase 3: shadowy ("The HEAT's Shadow"). Phase 4: ritual ("Offering: HEAT to COLD")
   - **Words Offered** (all phases): Running total of words formed across all puzzles
   - **Completion Coda** (endgame): first final-puzzle/post-revelation wins show a dedicated acknowledgement block in VictoryModal for stronger emotional closure
   - Phase-aware feedback text shifts tone with narrative phase
6. If phase changed: `PhaseTransitionOverlay` plays cinematic multi-scene interstitial, then `playPhaseChangeFlash()` does dramatic double flicker to black
7. StarBurst particle effect plays on each valid intermediate move
8. **Dread Pulse** (Phase 2+): When a valid intermediate move forms a dread word, the screen briefly flashes with a crimson overlay. Phase-scaled opacity (0.10 → 0.18 → 0.25). Uses `isDreadWord()` from `localGenerator.ts`. `handleSlotPress` returns `{ completed: false, formedWord }` for intermediate moves.
9. **Animal Whisper** (post-victory): 1.2s after victory, `AnimalWhisper` component shows a ghost-like message from a random unlocked animal. Prefers animals whose trigger words match the puzzle. Phase-aware styling (pink → purple → crimson). Fade in 400ms, hold 3s, fade out 600ms.
10. **Animal Interjection** (post-victory): 2.5s after victory, 30% chance of an animal interjection that pulls the player toward the home screen. Phase-aware messages: Phase 0 "Ember is excited to see you!" → Phase 4 "Ember whispers: 'The house remembers every word you've given us.'" Generated by `getAnimalInterjection()` in `phaseNarrative.ts`. Auto-dismisses after 4s. Rendered in App.tsx below AnimalWhisper.
11. **Ritual Micro-Event** (Phase 2+): When a puzzle has high ritual energy (7+), a toast message connects specific dread words to the house: "The house trembled when you formed VOID." 60% trigger rate at qualifying energy. Generated by `getRitualMicroEvent()` in `phaseNarrative.ts`.
12. **In-Puzzle Ritual Echo Chain**: `RitualEchoChain` component (`puzzle/RitualEchoChain.tsx`) shows the word chain building in real-time on the left side of the puzzle screen as words are formed. Phase 0-1: subtle pink, `pointerEvents="none"`. Phase 2+: prominent with vertical stacking and arrows. Phase 4: crimson incantation styling. Words animate in with fade, auto-scrolls. Cleared on new puzzle/difficulty change.
13. **Endgame triggers** (Phase 4+ after house completion, in App.tsx):
   - First puzzle after house completion → `FINAL_PUZZLE_EVENT` cinematic overlay
   - First puzzle after final puzzle → `POST_REVELATION_EVENT` cinematic overlay + `markPostRevelation()`

### Achievement System (`services/achievements.ts`)

33 achievements across 6 categories (puzzle, mastery, streak, collection, journey, challenge):
- Each has `check: (state: AchievementCheckState) => boolean`
- State includes: stats, puzzlesSolved, currentPhase, currentStreak, unlockedAnimals, challengeCompletions, etc.
- Persisted via AsyncStorage (`wordshift_unlocked_achievements`)
- `checkAchievements(state)` returns newly unlocked achievements
- `AchievementToast` component shows slide-in notification

### Daily Challenge System (`services/dailyChallenge.ts`)

- **Deterministic**: Uses seeded PRNG (`seededRandom()`) with date as seed
- **`generateDailyPuzzle()`** temporarily overrides `Math.random` for deterministic generation
- Concurrency guard prevents race conditions during async generation
- **Always HARD**: 6-letter base words, 5 rows (uses `generateLocalPuzzle('HARD', { wordLength: 6, targetRows: 5 })`)
- Requires 5-letter, 6-letter, and 7-letter words in dictionary for the pick/drop chain mechanic
- Streak tracking: consecutive days of daily completion (2-day grace period)
- **Unlock gated**: hidden until `isDailyChallengeUnlocked(puzzlesSolved, currentPhase)` returns true (20 puzzles solved, or naturally by phase progression at Phase 1+)
- **One-time intro scene**: when it unlocks, Fox introduces Daily Challenge via `getDailyChallengeIntroLines(...)` (tracked by `hasSeenDailyChallengeIntro()` / `markDailyChallengeIntroSeen()`)
- DailyChallengeCard: compact 42px circular button in the home screen header row once unlocked (not completed → pulsing glow, tap starts challenge; completed → checkmark with stars; streak badge when streak > 1)

### Settings System (`services/settings.ts`)

User preferences persisted via AsyncStorage:
- `soundEnabled` - Controls audio playback
- `hapticsEnabled` - Controls haptic feedback
- `reducedMotion` - Controls animations (confetti, particles, screen transitions)

Pattern: `getSettingsSync()` for synchronous reads (after initial `getSettings()` populates cache)

### Share Results (`services/shareResults.ts`)

Wordle-style emoji grid sharing:
- Performance grid: green/yellow/orange/red squares
- Star display and difficulty badge
- Uses React Native `Share` API

## Home Screen & Animal House

The home screen features a multi-story house with unlockable rooms and animal characters.
- Header amber is display-only (non-tappable); room/animal progression is driven through in-world unlock prompts on the house.

### Currency System (Amber)

- Players earn **Amber** by completing puzzles
- Rewards: EASY=5, MEDIUM=10, MEDIUM_PLUS=15, HARD=20 base
- Star bonuses: 3-star +50%, 2-star +25%
- Challenge mode: 1.5x amber multiplier
- Streak multiplier: 10% per day (max 100%, requires MIN_STREAK_FOR_BONUS=2)
- **Streak grace period**: Players can miss up to STREAK_RESET_DAYS (2) days
- Milestone bonuses at key puzzle counts (10, 25, 50... up to 350)

### Animal Characters

10 unique animals, each with their own room and personality (listed in unlock order). Each has a surface persona and a deeper cult role that emerges at higher phases:

- **Fox (Ember)** - Surface: introspective, cozy den with fireplace. Depth: the cult's oracle, reads meaning in flames. (STARTER - free to invite)
- **Pangolin (Panko)** - Surface: practical chef, rustic kitchen. Depth: prepares ritual offerings, "the recipe was always leading here."
- **Owl (Archimedes)** - Surface: scholar, study full of books. Depth: the cult's lorekeeper, found the summoning text in ancient words.
- **Axolotl (Axel)** - Surface: dreamy, aquarium room. Depth: the medium, "I can see it in the water... it's close."
- **Capybara (Chill)** - Surface: seemingly calm, office. Depth: the cult's administrator, has been coordinating everything. Unshakably serene about the end.
- **Fennec Fox (Fennick)** - Surface: alert listener, desert camp. Depth: the sentinel, hears the entity approaching.
- **Sloth (Sloane)** - Surface: slow observer, jungle hammock. Depth: has always known, moves slowly because time doesn't matter anymore.
- **Wombat (Warren)** - Surface: grounded digger, underground burrow. Depth: built the foundation — literally. The burrow connects to something beneath.
- **Rabbit (Thyme)** - Surface: anxious, garden patio. Depth: anxious because they understand what's coming, but committed anyway.
- **Red Panda (Bamboo)** - Surface: zen/contemplative, bamboo attic. Depth: the cult's spiritual leader, at perfect peace with the summoning. (final unlock)

### Dialogue Progression (Phases 0-5)

Animal dialogue evolves as players complete puzzles, gradually revealing the cult:
- **Phase 0 (0-24 puzzles)**: Happy, friendly, light. The animals are your friends. No hint of anything dark.
- **Phase 1 (25-74 puzzles)**: Curious, slightly philosophical. "Have you ever wondered why the letters move?" Subtle signs they know more than they let on.
- **Phase 2 (75-149 puzzles)**: Questioning existence, isolation. "The words are changing, aren't they? Or are we?" First hints of shared purpose among the animals.
- **Phase 3 (150-249 puzzles)**: Existential dread, references to "the arrangement," "what's coming." Animals start speaking in unison-like themes. Something is being prepared.
- **Phase 4 (250+ puzzles)**: The cult revealed. Animals speak reverently of the summoning, the player's role, the entity approaching. Robed sprites. They're grateful — terrifyingly so.
- **Phase 5 (Post-Revelation)**: After house completion + final puzzle. Terrible peace. Animals are serene, not dreadful. The shadow has settled. Triggered via `markPostRevelation()` in `amberCurrency.ts`, content in `POST_REVELATION_DIALOGUES` in `animalDialogue.ts`.

Each animal filters the cult narrative through their personality:
- **Fox (Ember)**: Fireside prophet. "The embers whisper of what's to come."
- **Owl (Archimedes)**: Has read the texts. "I found the passage. It was always in the letters."
- **Sloth (Sloane)**: Slow, inevitable acceptance. "It approaches... at the speed... it was always... going to."
- **Rabbit (Thyme)**: Anxious but devoted. "I'm scared, but... this is what we prepared for, right?"
- **Red Panda (Bamboo)**: Zen certainty. "The pattern completes. Breathe. Accept."

**Dialogue Style**: All 560+ dialogues written in Stephen King's literary voice — each animal has a fully distinct personality with natural pronoun usage, flowing sentences, and earned emotional weight. No clipped or robotic dialogue. Each phase transition feels organic and the descent from candy-cute warmth to cosmic horror is gradual and earned.

**Dialogue Count**: 56 dialogues per animal (560 total) + 5 post-revelation per animal (50 total)
- Phase 0: 12 dialogues (happy, friendly)
- Phase 1: 14 dialogues (curious + expanded variety: letters/words, house changes, community, personality)
- Phases 2-4: 10 dialogues each (progressively darker, culminating in cult revelation)
- Phase 5: 5 dialogues each (terrible peace — the aftermath)

### Per-Animal Phase Awareness (Cult Hierarchy)

Not all animals realize the truth at the same time. Defined in `ANIMAL_AWARENESS_TIERS` in `types/homeWorld.ts`:

| Tier | Animals | Phase Offset | Narrative Role |
|------|---------|-------------|----------------|
| **Vanguard** (+1 ahead) | Fox, Owl | `globalPhase + 1` | The oracle and lorekeeper — they figured it out first |
| **Middle** (matches player) | Pangolin, Axolotl, Fennec, Capybara | `globalPhase + 0` | Discover the truth in real-time with the player |
| **Lagging** (-1 behind) | Sloth, Wombat, Rabbit, Red Panda | `globalPhase - 1` | Most impactful — when they finally catch up, it hits harder |

`getAnimalPhase(globalPhase, animalType)` applies the offset (clamped 0-4). Used in `useDialogueFlow.ts` and `HomeScreen.tsx` for dialogue selection and sprite display.

### Cross-Animal References

Animals reference other animals in dialogue with phase-scaled frequency (Phase 0-1: ~10%, Phase 2: ~25%, Phase 3: ~45%, Phase 4: ~60%), creating the feeling of growing coordination among the cult. Defined in `CROSS_ANIMAL_REFERENCES` in `animalDialogue.ts` (phase-keyed lines per animal, filtered to only mention unlocked animals). Wired via `getCrossAnimalReference()` in `useDialogueFlow.ts`, displayed as a sequential conversation page within the animal's dialogue flow — the player taps "Next" to naturally progress from cross-animal reference to regular dialogue (no separate chat boxes or overlaid text).

**Guaranteed First Cross-Reference**: Vanguard animals (Fox/Owl) get a forced cross-reference the first time they're tapped at each new phase (Phase 1+), ensuring players see inter-animal coordination early. Tracked via `hasSeenGuaranteedCrossRef(phase)` / `markGuaranteedCrossRefSeen(phase)` in `amberCurrency.ts`. Bypasses the random roll in `useDialogueFlow.ts`.

### Catch-Up Dialogue for Late Unlocks

When an animal is unlocked at Phase 2+, they get special catch-up intro dialogue that acknowledges the player's progress and compresses the emotional arc. Defined in `CATCHUP_INTRO_DIALOGUES` in `animalDialogue.ts` (4 lines per animal per phase 2/3/4). `getCatchupIntroDialogue()` / `getCatchupIntroDialogueCount()` are used in `HomeScreen.tsx` intro dialogue flow when `currentPhase >= 2`.

### Tutorial Callback (Fox at Phase 4)

When Fox is first tapped at Phase 4, a one-time tutorial callback dialogue is shown — recontextualizing innocent tutorial lines as cult recruitment. E.g., "Remember when I said we'd been waiting for someone like you? I wasn't being friendly. I was being honest." Defined in `TUTORIAL_CALLBACK_DIALOGUES` in `animalDialogue.ts`. Tracked via `tutorialSeedsPlanted` flag in progress, checked in `useDialogueFlow.ts`.

### Dialogue Session System

Animals have conversation sessions with puzzle-based cooldowns to pace interactions:

**Session Parameters** (in `dialogueSession.ts` and `types/homeWorld.ts`):
- Max dialogues per session: Phase-aware via `getDialoguesPerSession(phase)` — Phase 0-1: 4, Phase 2-3: 5, Phase 4: 6
- Cooldown: Phase-aware via `getPuzzlesBetweenSessions(phase)` — Phase 0: 2 puzzles, Phase 1: 3 puzzles, Phase 2: 4 puzzles, Phase 3-4: 5 puzzles
- **Grace period**: First 1 session after unlock has no cooldown (`GRACE_PERIOD_SESSIONS`). Wired into `checkDialogueAvailability`, `isOnCooldown`, and `getSessionStatus` in `dialogueSession.ts`.
- Dialogue progress persists (animals remember where they left off)

**Session Flow**:
1. Player taps animal -> starts session if available
2. Pre-dialogue pages shown first (trigger reactions, sacrifice reactions, cross-animal refs, coordinated events) — each as a separate conversation page, tapped through with "Next". These don't count toward session limits.
3. Regular dialogue follows, up to 4-6 dialogues per session (phase-aware)
4. Session ends when: max dialogues reached or player leaves
5. Cooldown begins -> must complete 2-5 puzzles to talk again (skipped during grace period)
6. After cooldown -> animal continues from next dialogue (not repeat)

**UI Indicators**:
- `hasNewDialogue` exclamation (`!`) badge: computed dynamically from `isUnlocked && !isOnCooldown && currentDialogueIndex < totalDialogueCount`. Shows when there's genuinely unread dialogue, disappears on cooldown, reappears when cooldown expires and more dialogue is available.
- Cooldown toast appears at bottom of screen when animal is unavailable
- Sleeping Z's overlay shown on animal sprite during cooldown
- Session/cooldown state persists via AsyncStorage

### House Building System (Bottom-Up)

The house is built from the ground up, one room at a time. What begins as "building a cozy home for your animal friends" is gradually revealed to be constructing a temple — each room a chamber, each animal a cultist taking their position:

**Starting State**:
- Player starts with one empty room (Cozy Den) on the ground floor
- No animals unlocked - must invite the first one
- House shows unlocked rooms plus the next locked room preview when the next unlock is a room (with in-world build prompt/cost)

**Unlock Flow**: Invite animal -> Build room -> Invite animal -> Build room...
1. **Fox (Ember)** - FREE to invite into Cozy Den (starter)
2. **Kitchen** - 50 amber to build above Cozy Den
3. **Pangolin (Panko)** - 100 amber to invite into Kitchen
4. **Study** - 100 amber to build
5. **Owl (Archimedes)** - 100 amber to invite
6. ...continues alternating rooms (escalating: 50-475 amber) and animals (flat: 100 amber each)

**Unlock Progress Bar**: Home screen shows amber progress toward next unlock with a visual bar.

### Phase-Aware Room Descriptions

Room descriptions evolve with the narrative phase. `getRoomDescription(roomId, phase)` in `homeWorldData.ts` returns different descriptions per phase (e.g., Kitchen at Phase 0: "A cozy space where friends gather around good food" → Phase 4: "The ovens have been repurposed. Something else is being prepared."). Used in unlock/detail modal copy for room purchases.

### Incantation System (Puzzle-Narrative Connection)

The core system that makes puzzles feel like rituals, not just gates:

**Ritual Word Memory / Ledger**: Every word formed across all puzzles is recorded in `ritualWords` array (capped at 500). Tracked via `recordRitualWords()` in `amberCurrency.ts`, called from `useGamePersistence.ts` after each victory.

**Post-Puzzle Ritual Echo**: At ALL phases, the VictoryModal shows the completed word chain (e.g., FLAME → LAME → BLAME → LAMB). Phase 0-1: bright candy-colored styling (pink/purple). Phase 2: muted. Phase 3+: dark containers, arrows become vertical (↓ instead of →). Header reframes from "Your Word Journey:" (Phase 0) → "Words Arranged:" → "Words Transformed:" → "The Incantation:" → "The Offering:" (Phase 4). Footer text from `getRitualEchoFooter()` in `phaseNarrative.ts`.

**Named Incantations**: At Phase 2+, each puzzle chain gets a name. Phase 2: innocent ("The HEAT Dance", "A FLAME's Journey"). Phase 3: shadowy ("The HEAT's Shadow", "COLD Emerges"). Phase 4: ritual ("Offering: VOID to DOOM", "Incantation of DARK"). Generated by `getIncantationName()` in `phaseNarrative.ts` (also in `localGenerator.ts`) using deterministic hashing. Displayed in VictoryModal below the ritual echo chain.

**Words Offered Counter**: VictoryModal AND home screen show a running count of total words formed. Phase-aware text from `getWordsOfferedText()` — Phase 0: "Words shifted: 847" → Phase 4: "847 words offered to the arrangement". Home screen counter is tappable, opens the Word Ledger.

**Ritual Energy**: Puzzles with darker words contribute more to phase progression. `calculateRitualEnergy()` in `localGenerator.ts` scores dread word presence (0-10 scale). Each ritual energy point adds 0.1 to `phaseProgress`. Accumulated in `ritualEnergy` field on progress.

**Animals React to Specific Words**: Trigger words from puzzles (FLAME, VOID, GATE, etc.) are queued and consumed **per-animal** when visiting. `consumeTriggerWords(animalType)` in `amberCurrency.ts` filters the queue by the animal's specific trigger word list, leaving other words for their respective animals. This way one puzzle with FLAME, WATER, and DIG creates 3 separate animal reactions. At Phase 1+, animals show reactions tied to their theme. Defined in `ANIMAL_TRIGGER_WORDS` / `TRIGGER_WORD_REACTIONS` in `animalDialogue.ts`. Wired via `extractTriggerWords()`, `consumeTriggerWords()`, and displayed in `useDialogueFlow.ts`.

**Word Ledger Screen**: Scrollable screen showing all ritual words ever formed (`WordLedger.tsx`). Phase-aware titles: "Your Word Collection" (Phase 0-1) → "The Words Remember" (Phase 2) → "The Incantation Ledger" (Phase 3) → "The Offering Record" (Phase 4). Dread words highlighted in crimson at Phase 2+. Accessible via tapping the Words Offered counter on the home screen. Navigated as `currentScreen: 'ledger'`.

**Animal Whispers Post-Puzzle**: After each puzzle completion, a ghost-like whisper from a random unlocked animal appears at the bottom of the puzzle screen (`AnimalWhisper.tsx`). 150+ whisper lines across 5 phases × 10 animals (3 per animal per phase) in `ANIMAL_WHISPERS` in `phaseNarrative.ts`. `getAnimalWhisper()` selects based on phase and optionally prefers animals whose trigger words match. Phase 0: "Ember says nice work!" Phase 4: "Every word brings us closer. The fire knows."

**Word Threshold Dialogues**: Animals react to word count milestones (100, 250, 500, 750 total words formed). Each animal has a unique line per milestone reflecting their personality. Defined in `WORD_THRESHOLD_DIALOGUES` in `animalDialogue.ts`. `getWordThresholdDialogue(animalType, totalWordsFormed, previousWordsFormed, currentPhase)` checks if a threshold was just crossed. Wired in `useDialogueFlow.ts` `handleAnimalTap()` as a low-priority trigger reaction (only shown if no other reaction is active).

**Coordinated Dialogue Events**: At specific puzzle milestones (80, 100, 120, 160, 200, 230), ALL animals have thematically linked dialogue available — creating the sense of a coordinated cult. Defined in `COORDINATED_EVENTS` in `animalDialogue.ts`. Each event has a theme name, puzzle threshold, required phase, and per-animal lines. Consumed via `recordConsumedCoordinatedEvent()` to prevent repeats. Wired in `useDialogueFlow.ts` `handleAnimalTap()`.

**Narrative Seeds (Phase 0 → Phase 4 Callbacks)**: Each animal has 2 innocent Phase 0 seed lines and 2 dark Phase 4 callback lines that recontextualize them. Defined in `NARRATIVE_SEEDS` in `animalDialogue.ts`. `getNarrativeSeed()` returns a seed line at Phase 0. `getNarrativeCallback()` returns a callback at Phase 4. Extends the tutorial callback pattern (previously Fox-only) to all 10 animals.

**Dread Word Visual Feedback**: At Phase 2+, when a valid intermediate puzzle move forms a dread word, the puzzle screen briefly pulses with a crimson overlay. Phase-scaled opacity: Phase 2 = 0.10, Phase 3 = 0.18, Phase 4 = 0.25. Uses `isDreadWord()` from `localGenerator.ts`. `usePuzzleGame.handleSlotPress()` returns `{ completed: false, formedWord }` for intermediate moves to enable this.

**The Arrangement (House Visual Pattern)**: At Phase 2+, visual sigil lines appear connecting rooms on the house exterior in `HouseWorld.tsx`. Phase 2: thin purple connector lines. Phase 3: thicker lines with glow nodes. Phase 4: crimson pulsing lines. Creates the visual impression that the house is becoming a ritual structure. Accepts `ritualWords` prop.

**Puzzle Words Echo in Rooms**: At Phase 2+, recently formed puzzle words appear as faint text scattered across animal rooms in `RoomView.tsx`. Phase 2: barely visible (opacity 0.08). Phase 3: muted purple (0.15). Phase 4: dense crimson (0.25). Words are deterministically placed based on room dimensions. Accepts `ritualWords` prop from `HouseWorld.tsx`.

### Endgame: House Completion + Final Puzzle + Post-Revelation

**House Completion Ceremony**: When all 10 rooms + 10 animals are unlocked, `markHouseCompleted()` is called and a ceremony modal displays in `HomeScreen.tsx` with text from `getHouseCompletionText()` in `phaseNarrative.ts`. Also available as a cinematic event `HOUSE_COMPLETION_EVENT` in `phaseEvents.ts`.

**The Final Puzzle**: After house completion + Phase 4, the next puzzle completed triggers `FINAL_PUZZLE_EVENT` (cinematic overlay in App.tsx). Marks `finalPuzzleCompleted` on progress via `markFinalPuzzleCompleted()`.

**Post-Revelation (Phase 5)**: After the final puzzle, the next puzzle triggers `POST_REVELATION_EVENT` and marks `postRevelation` on progress via `markPostRevelation()`. Post-revelation content: special victory text (`getPostRevelationVictoryTitle`, `getPostRevelationMoveMessage` in `phaseNarrative.ts`), 5 new dialogues per animal (`POST_REVELATION_DIALOGUES` / `getPostRevelationDialogue()` in `animalDialogue.ts`).

### Phase-Aware Milestone Messages

Milestone bonuses at key puzzle counts use phase-aware messages. Each `MILESTONE_BONUSES` entry has `message` (default), `darkMessage` (Phase 2+), and `dreadMessage` (Phase 3+). `getMilestoneMessage(milestone, phase)` in `types/homeWorld.ts` selects the appropriate tone.

### House & Room Visuals

**House Structure** (`HouseWorld.tsx`):
- Single-column layout of rooms stacked vertically (bottom-up)
- Unlocked rooms are rendered, plus one pending room preview when the next unlock is a room
- Vertical-only pan via `react-native-gesture-handler` (horizontal pan disabled to prevent side gaps)
- Layout uses `justifyContent: 'flex-end'` to anchor house at viewport bottom; `houseContainer` has `marginTop: 50` and `marginBottom: 40` (gap between foundation and screen edge)
- **Initial pan position**: On mount and when rooms change, `translateY` is set to the overflow amount (total content height minus measured container height) so the roof is visible. Container height is measured via `onLayout` for accuracy
- **Asymmetric pan bounds**: `min: 0` (prevents panning below the house / empty space below foundation), `max: overflow + 50` (allows panning up to see the roof plus padding). Content height includes margins, roof, house body, foundation, and ArrangementConnector heights between rooms
- Sky background is inside the transform container (moves with scene), sized to screen dimensions (1x)
- Phase-aware sky: `sky_day.png` → `sky_dusk.png` → `sky_storm.png` → `sky_shadow.png`
- Phase-aware background color behind sky image (`PHASE_BG_COLORS`): Phase 0-1 `#6fb7df`, Phase 2 `#514378`, Phase 3 `#060612`, Phase 4 `#1a122a`
- Animated emoji sky elements (clouds, sun/moon, birds, shooting stars, night stars) inside the transform container — they pan with the scene
- No landscape emojis (trees, fence removed for cleaner look)
- Room dimensions: `ROOM_WIDTH` (250) and `ROOM_HEIGHT` (~123, maintains 2:1 aspect ratio of room PNGs)
- **Arrangement pattern** (Phase 2+): Visual sigil lines connecting rooms. Phase 2: thin purple. Phase 3: thicker with nodes. Phase 4: crimson pulsing. Accepts `ritualWords` prop for room word echoes
- **Room word echoes** (Phase 2+): Faint text of recent puzzle words scattered across room backgrounds in `RoomView.tsx`. Opacity/density/color scales with phase
- **Shadow Presence** (Phase 2+): `ShadowPresence` internal component in `HouseWorld.tsx` renders a dark silhouette above the house roof. Phase 2: barely visible (opacity 0.06, 60% scale). Phase 3: growing (0.15, 80%). Phase 4: full presence (0.30, 100%) with crimson "eyes". Provides a looming visual before `shadow_figure.png` asset is created

### Word Theme Evolution

Puzzle words gradually shift to match the ritual narrative:
- Phase 0: Fun words (SPARK, FLAME, TIGER) — innocent, playful
- Phase 1: Questioning words (THINK, WONDER, DRIFT, SHIFT) — curiosity
- Phase 2: Isolation words (VOID, EMPTY, ALONE, FADE, FLOAT) — impermanence
- Phase 3: Dread words (DOOM, DARK, COLD, NUMB, GRAVE, ECHO) — something approaching
- Phase 4: Cosmic/ritual words (ABYSS, RIFT, SUMMON, PORTAL, GATE, ETERNAL) — the summoning

**Phase-tiered scoring**: Dread words are organized into four separate tier sets (`DREAD_WORDS_PHASE_1` through `DREAD_WORDS_PHASE_4`) in `localGenerator.ts`, with a `DREAD_WORD_TIER` lookup map assigning each word to its earliest tier. The scoring formula is `phase² × 2.5 × proximity_multiplier`, where the multiplier depends on the distance between the word's tier and the current phase:
- Same tier as current phase: 1.0× (full bonus — these words dominate)
- Adjacent tier (±1): 0.5× (foreshadowing from future tier, echoes from past)
- Distant tier (±2+): 0.15× (faint presence)

This creates natural vocabulary evolution: Phase 2 puzzles gravitate toward VOID/EMPTY/FADE, while ABYSS only appears as rare foreshadowing. By Phase 4, cosmic words dominate and earlier-tier words echo in the background.

**Resonant word visuals**: Words belonging to a dread tier get a visual "resonance" glow on their letter tiles (see Letter Tile Animation Evolution below). `getWordPhaseTier(word)` exported from `localGenerator.ts` returns 0 (not dread) or 1-4 (tier). `Row.tsx` computes resonance from `rowData.originalWord` and passes `isResonant` to all child `LetterTile` components.

## Phase-Aware Visual Theming

The entire puzzle screen transforms across narrative phases via the `PhaseTheme` system in `theme/colors.ts` and narrative text in `services/phaseNarrative.ts`.

### Visual Theme (`getPhaseTheme(phase)`)
Returns phase-specific colors for backgrounds, particles, confetti, victory modal, and vignettes:
- **Phase 0**: Bright candy purple (#667EEA), white/pink particles, vibrant confetti
- **Phase 1**: Muted lavender (#5B6DB0), amber-toned particles
- **Phase 2**: Cool blue-purple (#4A5580), desaturated particles
- **Phase 3**: Dark indigo (#2E3355), dim muted particles
- **Phase 4**: Near-black (#1A1A2E), crimson/purple accents, dying embers
- **Phase 5**: Terrible peace — muted purple (#252040), ghostly mauve particles, peaceful purple victory title. Distinct from Phase 4's aggression; serene resignation

### Phase-Aware Victory Modal (`VictoryModal.tsx`)
The victory modal visually transforms across narrative phases via additional `PhaseTheme` fields:
- `modalOverlayColor`, `modalBgColor`, `modalTextColor`, `modalSecondaryTextColor`, `modalStatBgColor`, `modalDividerColor`
- **Phase 0-1**: Bright white card, dark text, light stat containers
- **Phase 2**: Slightly muted card background and text
- **Phase 3**: Dark purple-gray card, light text, dim dividers
- **Phase 4**: Near-black card with crimson accents, ghostly text
- VictoryModal uses `getPhaseTheme(phase)` for overlay color, card background, all text colors, stat container backgrounds, and divider lines

### Phase-Aware Difficulty Menu (`DifficultyMenu.tsx`)
The setup dropdown adapts to the narrative phase:
- Accepts `phase` prop
- Includes sections for **Difficulty**, **Challenge mode**, and **Puzzle Style** (variant/combo selector)
- Shows clear **selected** and **active** states for available variants
- Locked variants and combos are fully hidden until unlocked (no greyed/disabled cards)
- Combo styles are progressively disclosed (section appears only after at least one combo unlocks; otherwise a generic “more combinations later” message is shown)
- **Phase 0-2**: Bright menu styling and lighter copy tone
- **Phase 3+**: Dark background, phase-themed text colors from `getPhaseTheme()`, darker ritualized copy tone

### Letter Tile Animation Evolution (`LetterTile.tsx`)
Letter tiles physically change behavior across phases to make puzzles *feel* different:
- **Spring parameters** (`getSelectedSpringParams(phase)`): Phase 0 bouncy (friction:3/tension:200) → Phase 4 heavy (friction:9/tension:80)
- **Wobble speed** (`getWobbleDurations(phase)`): Phase 0 fast (150/300ms) → Phase 4 ponderous (400/800ms)
- **Bounce height** (`getBounceHeight(phase)`): Phase 0 high (-4) → Phase 4 barely lifts (-1.5)
- **Trail glow** (Phase 3+): Selected tiles emit shadow pulses. Phase 3: purple glow. Phase 4: crimson glow. Uses `useNativeDriver: false` for shadow animation.
- **Resonance glow** (Phase 1+): Tiles belonging to dread-tier words (`isResonant` prop) show a phase-aware inner glow overlay that intensifies across the narrative. Phase 1: subliminal warm gold shimmer (opacity 0.02-0.05, 4s cycle). Phase 2: faint purple-blue pulse (0.04-0.12, 3s). Phase 3: visible dark purple aura (0.08-0.20, 2.5s). Phase 4: crimson breathing light (0.12-0.28, 2s). Phase 5: ghostly mauve (0.06-0.10). Uses `useNativeDriver: true` (opacity only). Respects `reducedMotion` (static glow) and `shouldSimplifyAnimations()` (skips animation loop).
- **Phase 5 tile colors**: Purple-gray tints for locked/selected/default tiles (distinct from Phase 4 crimson)

### Home Screen Background Colors
The home screen container and HouseWorld use phase-aware background colors that blend with each sky image:
- **Phase 0-1**: `#6fb7df` (matches sky_day.png)
- **Phase 2**: `#514378` (matches sky_dusk.png)
- **Phase 3**: `#060612` (matches sky_storm.png)
- **Phase 4**: `#1a122a` (matches sky_shadow.png)

Defined as `PHASE_BG_COLORS` in `HouseWorld.tsx` and inline map in `HomeScreen.tsx`.

### Narrative Text (`phaseNarrative.ts`)
All player-facing text shifts tone with phase:
- `getVictoryTitle(stars, phase)` — "PERFECT!" → "WHY DOES IT MATTER?"
- `getVictoryFeedback(stars, phase)` — "Flawless solve!" → "Perfection in an imperfect void."
- `getMoveMessage(phase)` — "Delicious!" → "The void accepts."
- `getHintMessage(letter, word, phase)` — "Move 'R'" → "If it matters, 'R'"
- `getLoadingMessage(phase)` — "Mixing words..." → "The void speaks..."
- `getStartMessage(phase)` — "Tap a tile to begin!" → "The words are waiting. They always are."
- `getRulesText(phase)` — Phase-aware "How to Play" modal: "HOW TO PLAY" → "THE ARRANGEMENT"
- `getPhaseChangeNarrative(phase)` — Dramatic text for phase transitions
- `getPhaseIndicator(phase)` — Icon + label for puzzle header badge
- `getRitualEchoHeader(phase)` / `getRitualEchoFooter(phase, wordCount)` — Ritual echo framing in VictoryModal
- `getIncantationName(words, phase)` — Named puzzle chains at Phase 2+ (innocent → shadowy → ritual, deterministic)
- `getWordsOfferedText(totalWords, phase)` — Running word count: "Words shifted: N" → "N words offered to the arrangement"
- `getHouseCompletionText()` — Text lines for house completion ceremony modal
- `getPostRevelationVictoryTitle(stars)` / `getPostRevelationMoveMessage()` — Phase 5 victory/move text
- `getAnimalWhisper(phase, unlockedAnimals, triggerWords?)` — Random ambient whisper from unlocked animal after puzzle completion (150+ lines across 5 phases × 10 animals)
- `getAnimalInterjection(phase, unlockedAnimals, puzzlesSolved)` — Post-victory animal interjection pulling player to home screen (30% trigger rate, phase-aware messages)
- `getRitualMicroEvent(ritualEnergy, phase, completedWords)` — Toast message when high-ritual-energy puzzle connects words to the house (Phase 2+, 60% trigger)

### Challenge Mode
Optional harder mode for experienced players (`GameMode = 'standard' | 'challenge'`):
- Max 1 undo, no hints allowed
- 1.5x amber reward multiplier
- Challenge completions count 2x toward phase progression (accelerating the narrative)

### Narrative Acceleration
Engaged players can reach Phase 4 in ~120-150 puzzles instead of 250 via `NARRATIVE_ACCELERATION` config:
- High three-star rate: 1.5x phase progress
- Long streaks (7+ days): 1.25x phase progress
- Hard difficulty: 1.5x phase progress
- Challenge mode: 2.0x phase progress

## Key Services

### Puzzle Generation (`localGenerator.ts`)

DFS-based word chain generator with quality scoring:

- **Anti-boring detection**: Penalizes obvious transforms (S->plural, ED->past tense, ING, LY)
- **Position scoring**: Prefers middle-position letter moves over edge moves
- **Semantic journey**: Bonus for traversing different word categories
- **Quality threshold**: Rejects puzzles scoring below 45/100
- **Multi-candidate**: Generates 3 puzzles, selects highest scoring
- **Word history integration**: Penalizes/excludes recently used words
- **Phase-tiered dread words**: 200+ words split into 4 tier sets (curiosity → emptiness → dread → cosmic). Scoring weights by tier proximity to current phase (same tier: 1.0×, adjacent: 0.5×, distant: 0.15×)

Key functions:
- `generateLocalPuzzle(difficulty, overrides?)` - Main entry point (2.5s timeout); optional `overrides` for custom `wordLength` and `targetRows` (used by daily challenge)
- `findPath()` - Recursive DFS to find valid word chains
- `scorePuzzleChain()` - Evaluates puzzle quality (includes freshness scoring)
- `isDreadWord(word)` - Check if a word is in the combined dread words set (used for dread pulse visual feedback at Phase 2+)
- `getWordPhaseTier(word)` - Returns 0 (not dread) or 1-4 (phase tier); used by `Row.tsx` to determine tile resonance visuals

### Star Rating System (`starRating.ts`)

Grades puzzle performance without time pressure:

**Star Thresholds (generous, reward exploration):**
- **3 stars (PERFECT!)**: 0 hints, 0-2 invalid attempts
- **2 stars (GREAT!)**: 1 hint OR 3-4 invalid attempts
- **1 star (WELL DONE!)**: 2+ hints OR 5+ invalid attempts

**Victory feedback shifts with narrative phase** — always positive at Phase 0, increasingly hollow/questioning at higher phases. See `phaseNarrative.ts` for the full text progression.

**Cumulative Stats (persisted via AsyncStorage):**
- `totalPuzzlesCompleted`, `totalStars`, star count breakdowns
- `noHintPuzzleCount` - Number of puzzles completed without hints
- `totalInvalidAttempts`, `totalHintsUsed`
- `byDifficulty` - Per-difficulty stats (EASY/MEDIUM/HARD)

### Word History (`wordHistory.ts`)

Tracks recently used words to ensure puzzle diversity:

- **Hard cooldown (15 puzzles)**: Words completely excluded from generation
- **Soft cooldown (15-40 puzzles)**: Decaying penalty (50->10 points)
- **Freshness bonus**: Never-seen words get +5 score boost
- **Max history**: 100 puzzles tracked (~500 words)

### Amber Currency (`amberCurrency.ts`)

Manages amber balance, streak, and phase progression:

- `awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate)` - Main entry, returns balance/phase/streak/challenge bonus
- `calculatePhaseAcceleration(threeStarRate, streak, difficulty, gameMode)` - Weighted phase progress multiplier
- `updateStreak()` - Grace period of STREAK_RESET_DAYS (2 days)
- `getStreakInfo()` - Current streak, multiplier, bonus percentage
- `getFullProgress()` - All progress data (amber, puzzles, phase, unlocks)
- `getPuzzlesUntilNextPhase()` - Uses weighted `phaseProgress` plus minimum puzzle-exposure pacing guardrails
- `recordRitualWords(words, triggerWords, ritualEnergy)` - Record words to ledger, queue triggers, accumulate ritual energy
- `consumeTriggerWords(animalType?)` - Dequeue trigger words for a specific animal (per-animal filtering; without arg: legacy consume-all)
- `recordVariantEncounter(variant)` / `consumePendingVariantTutorial()` - Queue/consume one-time animal explanations for newly encountered variants
- `setPreferredPuzzleVariant(variant)` / `getPreferredPuzzleVariant()` - Persist and load the player's preferred setup-menu variant
- `applyVariantAmberBonus(variant, baseAmberAward, configuredMultiplier)` - Applies persisted variant bonus with repeat-use anti-farm decay
- `markHouseCompleted()` / `isHouseCompleted()` - House completion ceremony tracking
- `markFinalPuzzleCompleted()` / `isFinalPuzzleCompleted()` - Final puzzle endgame tracking
- `markPostRevelation()` / `isPostRevelation()` - Phase 5 post-revelation state
- `markTutorialSeedsPlanted()` / `wereTutorialSeedsPlanted()` - Tutorial callback tracking for Fox at Phase 4
- `hasSeenDailyChallengeIntro()` / `markDailyChallengeIntroSeen()` - One-time Daily Challenge intro tracking
- `hasSeenFoxPlayNudge()` / `markFoxPlayNudgeSeen()` - One-time post-tutorial Fox "play more" nudge tracking
- `recordConsumedCoordinatedEvent(theme)` / `getConsumedCoordinatedEvents()` - Track consumed coordinated dialogue events
- `hasSeenGuaranteedCrossRef(phase)` / `markGuaranteedCrossRefSeen(phase)` - Track guaranteed first cross-reference for Vanguard animals at each phase
- `clearProgress()` - Full reset (includes guaranteed cross-ref keys)

### Phase Transition Events (`phaseEvents.ts`)

Cinematic interstitial scenes that play at phase boundaries:

- 4 events (one per phase transition, phases 1-4), each with 4 multi-scene sequences
- Each scene has text, optional emoji, delay, and duration
- Tone darkens: Phase 1 "The words seem to want something" → Phase 4 "Go home. See what you've built."
- `getPhaseTransitionEvent(phase)` returns event or null (no event for Phase 0)
- `getEventDuration(event)` calculates total playback time
- **Endgame events**: `HOUSE_COMPLETION_EVENT` (all 10 rooms + animals), `FINAL_PUZZLE_EVENT` (Phase 4 endgame), `POST_REVELATION_EVENT` (Phase 5 transition)
- Rendered by `PhaseTransitionOverlay` component with animated fade-in/out, progress dots

### Device Tier Detection (`deviceTier.ts`)

Heuristic device capability detection for adaptive animation quality:

- Classifies devices as `low`, `medium`, or `high` using PixelRatio and screen dimensions
- `shouldSimplifyAnimations()` - Skip decorative pulse/glow on low-end devices
- `getMaxParticleCount()` - 6/10/15 particles by tier (used by AnimatedBackground)
- `getMaxConfettiCount()` - 8/15/25 confetti pieces by tier
- `getMaxAnimationCount()` - General animation count limit

### Data Migration (`dataMigration.ts`)

Schema versioning system for persistent storage:

- Sequential migration functions keyed by version number
- `migrateData()` runs all pending migrations in order
- `getCurrentSchemaVersion()` / `setSchemaVersion()` for version tracking
- Add new migrations by adding to the `MIGRATIONS` record and bumping `CURRENT_SCHEMA_VERSION`

### Error Reporting (`errorReporting.ts`)

Lightweight error reporting infrastructure:

- `reportError(error, context?)` - Log errors with optional context
- `addBreadcrumb(message)` - Track user actions leading up to errors
- `getRecentBreadcrumbs()` - Retrieve breadcrumb trail for debugging
- Designed for easy integration with external services (Sentry, etc.) later

### Performance Monitoring (`performanceMonitor.ts`)

In-memory performance metrics for animation health and puzzle generation:

- `startFrameMonitoring()` / `stopFrameMonitoring()` - Frame rate tracking via requestAnimationFrame
- `markRenderStart(component)` - Returns end function; tracks component render duration
- `recordGenerationMetric(metric)` - Records puzzle generation timing, scores, fallback usage
- `getPerformanceSummary()` - Aggregated stats: FPS (avg/min/p95/dropped), render times (by component, slow renders), generation (avg duration, timeouts, fallbacks)
- `isPerformanceDegraded()` - True if avg FPS < 45 in recent samples
- `clearMetrics()` - Reset all collected data
- Frame monitoring starts automatically on app mount via App.tsx

### Hint System

Educational hints show the target word with phase-aware tone:
- Phase 0: "Move 'R' — think "WARM"!" (encouraging)
- Phase 2: "Consider 'R' — notice "COLD"." (distant)
- Phase 4: "If it matters, 'R' — see "VOID"." (nihilistic)
- Falls back to phase-aware undo suggestion if player is off the solution path
- Challenge mode blocks hints entirely

## Onboarding System (Multi-Screen Guided Intro)

New players experience a guided multi-screen onboarding flow instead of a popup tutorial. The player uses the **real** home screen and puzzle screen from the start, with Fox (Ember) guiding them through each step via a floating `FoxGuide` speech bubble overlay.

### Onboarding Flow

| Step | Screen | What Happens |
|------|--------|-------------|
| `home_empty` | Home | Player sees empty Cozy Den. Invite prompt auto-appears, guiding them to welcome Fox. |
| `fox_invited` | Home | Fox intro dialogue via FoxGuide (4 lines). Fox introduces himself and the world. |
| `going_to_puzzle` | Transition | Fox says "Follow me!" — screen transitions to puzzle. |
| `puzzle_tutorial` | Puzzle | Real EASY puzzle with contextual Fox tips. The exact letter to pick and target slot are highlighted, and tutorial input is guided to prevent early dead-ends. UI simplified: no difficulty selector, no NEW button, no home button. |
| `puzzle_complete` | Puzzle | Victory plays, Fox congratulates. "Let's go home!" button. |
| `returning_home` | Transition | Screen transitions back to home. |
| `unlock_explained` | Home | Fox explains amber & unlock system (3 lines). Unlock progress bar visible. |
| `complete` | Home | Onboarding done. All UI elements appear. Player is free. |

### Architecture

**State Machine** (`services/onboarding.ts`):
- `OnboardingStep` type with 8 steps + `not_started`
- `getOnboardingStep()` / `setOnboardingStep()` — AsyncStorage persistence with in-memory cache
- `isOnboardingComplete()` / `resetOnboarding()` — Query and reset helpers
- `ONBOARDING_FOX_LINES` — Fox dialogue text for each step (keyed by step name)

**FoxGuide Component** (`components/FoxGuide.tsx`):
- Floating Fox sprite + speech bubble overlay with dynamic placement (`top`/`middle`/`bottom`) and optional `anchorStyle` for context-aware positioning
- Fox talk sprite (with emoji fallback), bounce animation when speaking
- Fade in/out + spring slide animations, text fade on change
- Continue button, optional Skip button
- Respects `reducedMotion` setting

**App.tsx Orchestration**:
- `onboardingStep` state replaces old `showTutorial`
- On mount: checks legacy `wordshift_tutorial_completed` for backward compat, then reads `wordshift_onboarding_step`
- `handleOnboardingContinue()` — advances through dialogue lines and transitions between screens
- `handleSkipOnboarding()` — marks onboarding + tutorial as complete
- FoxGuide rendered on both home screen (home_empty, fox_invited, unlock_explained) and puzzle screen (puzzle_tutorial, puzzle_complete)
- `tutorialGuidance` derives the exact source letter/target slot from solution steps and drives guided highlights + input guardrails during `puzzle_tutorial`
- During onboarding: hides difficulty selector, stats row, NEW button, home button on puzzle screen; hides PLAY, settings, stats, daily challenge on home screen

**HomeScreen Integration**:
- Accepts `onboardingStep` and `onAdvanceOnboarding` props
- Auto-shows invite prompt during `home_empty` step
- Hides "Maybe Later" button during onboarding (player must invite Fox)
- After Fox is invited: suppresses standard intro dialogue, advances to `fox_invited` step
- Shows unlock progress bar during `unlock_explained` step

**Narrative seeds** (innocent now, ominous in retrospect):
- "We've been waiting for someone like you."
- "Every puzzle you solve helps us build the house."
- "The others are going to love you. There's so much more to discover... together."

**Backward Compatibility**: Existing players who completed the old `Tutorial` overlay are detected via the `wordshift_tutorial_completed` AsyncStorage flag and skip onboarding automatically. The old `Tutorial` component is deprecated but preserved; its utility functions (`hasTutorialCompleted`, `markTutorialCompleted`, `resetTutorial`) are still used. `resetOnboarding()` is called alongside `resetTutorial()` in Settings > Reset All Data.

**Persistence**: `wordshift_onboarding_step` in AsyncStorage. If the app closes mid-onboarding, it resumes from the last saved step.

## Coding Conventions

- Use TypeScript with explicit types for props and state
- React Native StyleSheet for styling (not inline styles)
- Functional components with hooks
- Custom hooks extract game logic from App.tsx (`usePuzzleGame`, `useGamePersistence`, `useVictoryFlow`, `useAchievementQueue`) and home screen logic (`useDialogueFlow`, `useUnlockFlow`)
- Extracted UI components live in `components/puzzle/` (VictoryModal, RulesModal, DifficultyMenu, ActionButton, AnimatedLogo, LevelDisplay, Toast)
- Import colors from `CandyColors` in `src/theme/colors.ts`; use `getPhaseTheme(phase)` for phase-aware colors
- All player-facing text must go through `phaseNarrative.ts` — never hardcode victory/move/hint strings
- Use `Animated` API for smooth animations; choreograph multi-step animations with `Animated.sequence` + `Animated.stagger`
- **Animation loops**: Store `Animated.loop()` return value in a ref, call `.stop()` in useEffect cleanup to prevent accumulation
- **Native driver preferred**: Use `useNativeDriver: true` for all animations; if you need to animate backgroundColor, use an opacity overlay on a static-colored view instead
- **Device tier gating**: Use `shouldSimplifyAnimations()` from `deviceTier.ts` to skip decorative animations on low-end devices; use `getMaxParticleCount()`/`getMaxConfettiCount()` for particle limits
- **React.memo**: Applied to expensive pure components (e.g., `Row`) to prevent unnecessary re-renders
- **MoveDelta pattern**: Undo history uses lightweight deltas (`{rowIndex, letterIndex, letter, action}`) instead of deep-cloning entire game state
- **Schema versioning**: Persistent data uses `dataMigration.ts` for schema versions + sequential migrations; always bump version when storage format changes
- **Concurrent spend guard**: `amberCurrency.ts` uses `spendInProgress` flag to prevent double-spend race conditions
- Services use AsyncStorage with in-memory cache pattern (load -> cache -> return cached)
- TS strict: module-level nullable caches need local variable assignment before return to avoid TS2322
- Accessibility: interactive elements should have `accessibilityLabel` and `accessibilityRole`; progress bars use `accessibilityValue` with `min`/`max`/`now`
- **reducedMotion**: All animations must check `getSettingsSync().reducedMotion` and either skip or set values instantly
- **Narrative consistency**: Any new feature, UI text, or visual element must respect the current phase. If it looks cheerful, it should only be cheerful at Phase 0. If it's always cheerful regardless of phase, it breaks the narrative.

## Testing

### Automated Tests

```bash
cd mobile && npx jest --no-coverage  # 680 tests, 26 suites
```

**Test patterns:**
- Shared AsyncStorage mock factory in `src/__tests__/helpers/mockAsyncStorage.ts` — use `createMockAsyncStorage()` instead of duplicating inline mocks
- Tests that import react-native modules need `jest.mock('react-native', ...)` at top
- `beforeEach` must call both `AsyncStorage.clear()` AND service-specific clear functions
- Puzzle generator tests mock `amberCurrency.getCurrentPhase` + all `wordHistory` functions
- Hook tests (`usePuzzleGame`, `useGamePersistence`) use manual React mock with stateStore Map + index rewind pattern
- `jest.fn(async () => ...)` infers 0 args — add typed optional params `(_d?: any, _s?: any)` for TS
- `DialoguePhase` is `0 | 1 | 2 | 3 | 4` literal type — mock return values need `as number` or `as any` cast
- Component tests use `jest.mock('react-native', ...)` with stub exports since test env is Node (no renderer); test data contracts and service integrations rather than rendering
- Performance monitor tests mock `requestAnimationFrame`, `cancelAnimationFrame`, and `performance.now` globally

### Manual Testing

Test on physical device via Expo Go app:
1. Run `npx expo start` in mobile/
2. Scan QR code with Expo Go
3. Test all three difficulty modes
4. Verify puzzle generation doesn't hang (should complete in <3s)
5. Test tutorial on fresh install
6. Test daily challenge gating + unlock intro (hidden before unlock threshold; Fox intro appears once; challenge remains deterministic 6-letter/5-row and same puzzle if opened twice on the same day)
7. Test home screen unlock flow (Fox free -> build Kitchen -> invite Panko)
8. Test settings (toggle reduced motion -> verify no confetti/particles)
9. Test Reset All Data -> verify complete reset including tutorial/amber/unlocks
10. Test stats screen shows correct streak

## New Systems (Assessment-Driven Enhancements)

### Early Darkness Seeds (Phase 0 Narrative Hook)

Phase 0 now contains subtle "wrongness" to foreshadow the horror:
- **Victory Glitch**: ~8% chance of a brief flash text ("WE SEE YOU", "CLOSER") during Phase 0 victories. First victory always glitches. Generated by `getVictoryGlitch()` in `phaseNarrative.ts`. **Wired in**: App.tsx renders a 200ms flash overlay (`victoryGlitchOverlay`) with red text 300ms after victory sequence starts.
- **Seed Move Messages**: ~5% chance of a "wrong" move message at Phase 0 ("The letters remember.", "Something shifted.") replacing the normal upbeat messages. Implemented in `getPhase0MoveMessageWithSeed()`.
- **Onboarding Seeds**: Fox's intro lines have subtle ominous pauses: "We've been waiting for someone like you.\n...A long time." and "They need you." at the end.

### Weekly Quests System (`weeklyQuests.ts`)

4 rotating quests generated each Monday, with seeded deterministic selection:
- Quest types: solve_count, solve_difficulty, earn_stars, daily_complete, no_hints, challenge_mode, earn_amber
- Rewards: 20-100 amber per quest (base), scaled by phase
- Phase-aware descriptions (Phase 3+: dark ritual-themed text)
- **Phase-scaled rewards**: `getPhaseRewardMultiplier(phase)` — Phase 0-1: 1.0x, Phase 2: 1.25x, Phase 3: 1.5x, Phase 4+: 2.0x. Applied when claiming rewards, rewarding players who have progressed deeper into the narrative
- `loadWeeklyQuests(phase)` — loads or generates quests for current week
- `updateQuestProgress(event, phase)` — called after puzzle completion, returns newly completed quests
- `claimQuestReward(questId, currentPhase)` — claim amber with phase-scaled multiplier
- `getUnclaimedAmber(currentPhase)` — total unclaimed amber with phase multiplier applied
- `getTimeUntilReset()` — time until next Monday reset
- `getWeekId()` — ISO week identifier for deterministic generation
- **Wired in**: `useGamePersistence.ts` calls `updateQuestProgress(event, phase)` after each victory with difficulty, stars, hints, challenge/daily status, and amber earned

### Whisper Gallery (`whisperGallery.ts`)

Collectible archive screen recording every whisper, dialogue snippet, and narrative moment:
- `recordWhisper(entry)` — records a whisper/dialogue, deduplicates by content hash
- `getGroupedEntries()` — entries grouped by animal, sorted by phase then time
- `getGalleryStats()` — collection stats (total, by animal, by phase, by type)
- Phase-aware titles: "Whisper Gallery" → "The Echoes" → "Voices in the Walls" → "The Archive"
- Cap: 500 entries (keeps most recent)
- **Wired in**: App.tsx (records whispers after AnimalWhisper display), `useDialogueFlow.ts` (records dialogue lines in `handleNextDialogue`). `WhisperGalleryScreen.tsx` component renders the archive, accessible via Gallery button on HomeScreen or `currentScreen: 'gallery'`

### Player Choice Points (`dialogueChoices.ts`)

At Phase 3, each animal offers a single dialogue choice that creates the illusion of agency:
- Two options per animal (e.g., Fox: "What arrangement?" vs. "I don't want to know.")
- Both paths converge — the narrative is the same regardless
- Responses are animal-specific and character-consistent
- Phase 4 callbacks reference the player's earlier choice
- `getChoiceForAnimal(type, phase, dialogueIndex)` — returns choice content or null
- `recordChoice(type, choice)` — saves choice, returns response + convergence
- `getPhase4ChoiceCallback(type, choice)` — callback text for Phase 4
- **Wired in**: `useDialogueFlow.ts` checks for choice points in `handleAnimalTap` (Phase 3, dialogueIndex 4-6), exposes `activeChoice` and `handleDialogueChoice`. `HomeScreen.tsx` renders choice buttons in the dialogue modal when `activeChoice` is active

### Sacrifice Mechanic (`sacrifice.ts`)

Phase 4+ feature: players can voluntarily "offer" amber to the arrangement:
- Amber is destroyed — no gameplay benefit
- Phase-aware response messages (first sacrifice special, milestones at 1/5/10/25/50/100)
- `performSacrifice(amount, phase)` — destroys amber, returns response message
- `isSacrificeAvailable(phase)` — only Phase 4+
- `getSacrificeAmounts(balance)` — suggested amounts based on current balance
- `getSacrificeCount()` — returns total number of sacrifices performed
- **Wired in**: `HomeScreen.tsx` renders a sacrifice modal (Phase 4+ only) with amount selection buttons, amber deduction via `spendAmber()`, and response display. Accessible via "Sacrifice" button in the action row

**Animals React to Sacrifices**: At Phase 4+, animals acknowledge the player's offerings. `SACRIFICE_REACTIONS` in `animalDialogue.ts` defines per-animal reactions — each animal has 1 first-sacrifice line and 3 subsequent lines reflecting their personality (e.g., Fox speaks of flames consuming the offering, Owl references ancient texts about sacrifice). `getSacrificeReaction(animalType, sacrificeCount, phase)` in `animalDialogue.ts` selects the appropriate line. Wired into `useDialogueFlow.ts` as a pre-dialogue page (shown between trigger word reactions and word threshold dialogues), so the animal naturally comments on the player's sacrifice before continuing regular dialogue.

### Push Notifications (`notifications.ts`)

Local push notification scheduling via expo-notifications (lazy-loaded):
- **Daily Reminders**: Phase-aware morning messages ("Your daily puzzle is ready" → "The daily offering awaits")
- **Re-engagement**: Fires after 2 days of inactivity ("Ember is wondering where you've been" → "The keepers await your return")
- Preferences: master toggle, daily reminder hour, re-engagement toggle
- `scheduleAllNotifications(phase)` — called on app launch and after puzzle completion
- `getNotificationPrefs()` / `setNotificationPrefs(prefs)` — preferences management
- **Wired in**: App.tsx calls `scheduleAllNotifications(0)` on mount and `scheduleAllNotifications(currentPhase)` after each victory

### Cloud Save Infrastructure (`cloudSave.ts`)

Client-side cloud sync layer with pluggable backend:
- `CloudProvider` interface: upload, download, hasNewerSave, isReady
- Currently uses `NoOpProvider` (logs operations, no actual backend)
- `collectLocalSaveData()` — gathers all AsyncStorage keys into a CloudSaveData object
- `restoreFromCloudData(data)` — overwrites local with cloud data
- `uploadToCloud()` / `downloadFromCloud()` — provider-mediated sync
- `markPendingChanges()` — tracks unsaved local changes
- Swap provider via `setCloudProvider(provider)` when real backend is connected
- **Wired in**: App.tsx calls `markPendingChanges()` after each victory to flag unsaved local changes

### Enhanced Phase Transition Cinematics

Phase transition events now include visual effect configs:
- Per-scene effects: `fade`, `pulse`, `shake`, `flash`, `particles_rise`, `particles_fall`, `vignette_close`
- Per-event ambient particles: `CinematicParticleConfig` with count, color, direction, speed, size, opacity
- Per-event vignette overlay and screen shake intensity
- Phase 1: subtle fade + rising purple particles
- Phase 2: vignette close + falling particles
- Phase 3: flash + shake + rising particles
- Phase 4: heavy shake + crimson particles + full vignette

### Enhanced Shadow Figure (`HouseWorld.tsx`)

The ShadowPresence component now features:
- **Animated breathing**: Slow scale pulse (1.0→1.03 at Phase 2, 1.0→1.06 at Phase 4)
- **Wispy tendrils**: Side extensions at Phase 3+ (rotated semi-transparent shapes)
- **Pulsing eyes**: Phase 4 crimson dots with red shadow glow, opacity pulses 0.5→1.0
- All animations use `useNativeDriver: true` and clean up in useEffect return

### Enhanced Social Sharing (`shareResults.ts`)

Share results now include:
- **Word chain display**: Horizontal (Phase 0-2: "FLAME → FAME → FRAME") or vertical (Phase 3+: arrows become ↓)
- **Animal whisper**: Post-puzzle whisper text included as a quote
- **MEDIUM_PLUS difficulty**: Orange 🟠 emoji indicator

### Smoothed Unlock Curve

Adjusted costs to remove the retention cliff at puzzles 100-150:
- Burrow: 325 → **250** amber
- Garden: 400 → **300** amber
- New milestone bonus at puzzle 125: **100 amber** ("Halfway to mastery!")

## Common Tasks

### Adding new word categories
Edit `SEMANTIC_CLUSTERS` in `localGenerator.ts`

### Adjusting puzzle difficulty
Modify scoring weights in `scorePuzzleChain()` or `MIN_ACCEPTABLE_SCORE` threshold

### Adjusting word diversity/cooldowns
Edit constants at top of `wordHistory.ts`:
- `HARD_COOLDOWN` - Puzzles before word can reappear (default: 15)
- `SOFT_COOLDOWN` - Puzzles before penalty fully decays (default: 40)
- `MAX_HISTORY_SIZE` - How many puzzles of history to track (default: 100)

### Adjusting star rating thresholds
Edit `calculateStars()` function in `starRating.ts`:
- Current: 3 stars = 0 hints + 0-2 mistakes, 2 stars = 1 hint OR 3-4 mistakes, 1 star = rest

### UI adjustments
- Tile sizes/styling: `LetterTile.tsx` styles; standard tiles 52x64, compact tiles 42x52 (activated when `wordLength >= 6`)
- Row layout: `Row.tsx` styles; accepts `wordLength` prop to trigger compact tile mode
- Arc/fan effect: Constants at top of `Row.tsx` (ARC_ROTATION, ARC_LIFT, SLOT_WIDTH, SLOT_HEIGHT)
- Color palette: `theme/colors.ts`
- Game container: `App.tsx` styles object
- Room dimensions: `ROOM_WIDTH` (250) and `ROOM_HEIGHT` (~123) in `HouseWorld.tsx`
- Status bar: `Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50`

### Adding new tile colors
Add to `tileColors` array in `theme/colors.ts`

### Adding new achievements
1. Add achievement definition to `ACHIEVEMENTS` array in `achievements.ts`
2. Include `id`, `title`, `description`, `icon`, `category`, and `check` function
3. `check` receives `AchievementCheckState` with stats, streak, phase, etc.
4. Add test case in `achievements.test.ts`

### Home Screen - Adding new animals
1. Add animal type to `AnimalType` in `types/homeWorld.ts`
2. Add dialogue entries in `animalDialogue.ts` (all 5 phases)
3. Add animal definition in `ANIMALS` array in `homeWorldData.ts`
4. Add room definition in `ROOMS` array
5. Add unlock entries in `UNLOCK_PROGRESSION`

### Home Screen - Adjusting amber rewards
Edit `AMBER_REWARDS` in `types/homeWorld.ts`:
- EASY: 5, MEDIUM: 10, MEDIUM_PLUS: 15, HARD: 20

### Home Screen - Adjusting dialogue phases
Edit `PHASE_THRESHOLDS` in `types/homeWorld.ts`:
- Default: [0, 25, 75, 150, 250] puzzles for phases 0-4

### Home Screen - Adjusting dialogue sessions
Edit `DIALOGUE_SESSION_CONFIG` in `types/homeWorld.ts`:
- `getDialoguesPerSession(phase)` - Phase-aware max dialogues: Phase 0-1=4, Phase 2-3=5, Phase 4=6
- `getPuzzlesBetweenSessions(phase)` - Phase-aware cooldown: Phase 0=2, Phase 1=3, Phase 2=4, Phase 3-4=5 puzzles
- `GRACE_PERIOD_SESSIONS` - Sessions before cooldown kicks in for new animals (default: 1)

### Home Screen - Adjusting streak grace period
Edit `STREAK_BONUSES.STREAK_RESET_DAYS` in `types/homeWorld.ts`:
- Default: 2 (can miss 2 days before streak resets)

### Adding sound effects
1. Add audio file to `assets/sounds/`
2. Register in `audio.ts` sound map
3. Call the corresponding `sound*()` function from App.tsx or relevant component
4. Audio functions already check `settings.soundEnabled` before playing

## Known Constraints

- Puzzle generation has 2.5s timeout to prevent UI blocking
- 4s wrapper timeout in App.tsx as fallback
- Fallback puzzle pool: 15 pre-validated puzzles across 3 difficulty tiers (5 easy/5 medium/5 hard) used when generation times out; `getRandomFallback(difficulty)` selects randomly
- Dictionary limited to common English words (no proper nouns, abbreviations)
- Arc layout uses `overflow: visible` - elements can extend beyond row container
- Dialogue sessions persist across app restarts (cooldowns continue)
- House view uses `react-native-gesture-handler` for vertical pan (horizontal pan disabled; GestureHandlerRootView wraps content)
- TouchableOpacity in home screen components must be imported from `react-native-gesture-handler` for proper touch handling
- HomeScreen.tsx uses react-native TouchableOpacity (not RNGH) for modal content
- Daily challenge uses Math.random override for seeded generation (guarded against concurrency)
- Sound system is placeholder infrastructure (API wired up, awaiting real audio asset files)
- Victory flow uses `isProcessingVictory` lock to prevent interaction during async chain
- AnimatedBackground uses opacity overlay instead of JS-bridge backgroundColor animation (native driver compatible)
- Low-end device detection is heuristic (PixelRatio + screen size) — not 100% accurate but good enough

## Monetization

Free-to-play with ethical hybrid monetization. Full plan in `MONETIZATION_PLAN.md`. Core principle: players pay for *expression* and *convenience*, never for *narrative progression*. The phase system, dialogue, and all 10 animals are fully earnable through play.

### Ads

**Rewarded video ads** (opt-in, never forced):
- Post-victory "Bonus Amber" button: flat +8 amber (not percentage-based — prevents multiplier stacking with streak/star/challenge bonuses). 3/day cap.
- Post-cooldown dialogue unlock: skip 1 puzzle of cooldown. 2/day cap.
- Weekly quest bonus: +25% quest reward on claim. 4/week cap.
- Hint recovery: restore 1 used hint for star rating purposes. 1/puzzle cap.

**Interstitial ads** (between puzzles only, never mid-puzzle):
- Phase 0-2: every 3rd puzzle completion. Phase 3+: every 5th (invested players get less interruption).
- 3-second skip timer.
- Exempt: first 10 puzzles (onboarding), phase transitions, daily challenge, ritualEnergy ≥ 7, within 5 puzzles of a phase boundary, Premium users.

All ad placements removed for Patron's Key purchasers.

### Patron's Key ($6.99, one-time IAP)

| Feature | Description |
|---|---|
| Ad-free | All ad placements removed |
| Exclusive tile theme | "Patron's Script" — calligraphy-styled tiles |
| Amber drip | +2 flat amber per puzzle (post-multiplier, ~10-15% boost) |
| Extended undo | 2 undos in Challenge mode (up from 1) |
| Gallery highlight | Gold border on Whisper Gallery entries |
| Cloud save | Account-bound backup/restore via `cloudSave.ts` (Firebase Auth / Game Center / Play Games). Whisper Gallery excluded from sync to prevent spoiler distribution. |
| Patron badge | Subtle icon on share result cards |

Also available as "Patron's Key + Starter Collection" bundle at $9.99 (includes 3 tile themes).

### Cosmetic Shop — "The Collection"

Purely visual. No gameplay or amber-earning impact.

**Tile theme packs** ($1.99-$2.99, 12 at launch): Reskin LetterTile colors, borders, fonts, and animations. 8 always available, 4 phase-gated (appear after Phase 1/2/3/4 via progressive disclosure — completely hidden until reached, no locked slots, no phase labels). Phase-gated names are tonally evocative but non-spoilery ("Obsidian," "Etched"). Expand by 2-3 per quarter. Add puzzle background themes in Q2.

**Room accent packs** ($0.99-$1.99): Decorative overlays on room backgrounds (fairy lights, books, candles). Phase 3+ pack ("Low Light") appears via progressive disclosure.

**Confetti & victory effects** ($0.99 each): Custom particle effects for victory/StarBurst (Sakura Petals, Snowflakes, Dark Embers, etc.).

**Animal accessories** ($0.99-$1.49 each, or $3.99 5-pack): Hats, scarves, glasses on animal sprites. **Suppressed at Phase 4** — robed sprites override accessories with a one-time narrative prompt ("The robes cover everything now."). Accessories return at Phase 5 (scarf on a serene post-cult animal is effectively unsettling).

### Content Pass — "The Chronicle"

**Monthly mini-pass** ($1.99): 5 curated puzzles, 1 cosmetic item, 2 bonus weekly quests.

**Quarterly major season** ($4.99, or $16.99/year): 15 curated puzzles, 2 season-exclusive puzzle variants, exclusive tile theme, +2 amber per puzzle (flat additive to base, applied before multipliers), 8 bonus quests, and seasonal narrative echoes (found objects/journal fragments scattered across rooms — collectible lore artifacts persisting in Whisper Gallery after season ends).

**No guest animals in seasonal content.** The closed 10-animal cult is the narrative's core horror device. An 11th animal — in or out of the cult — breaks it.

### Mid-Game Amber Sinks (Replaces Amber Bundles)

**No amber bundles for cash.** The organic economy generates ~2.5-3x the amber needed for full unlock over 300+ puzzles. Selling amber would let players build the full house by puzzle 42 while needing 225+ puzzles for Phase 4, creating a 180-puzzle engagement gap.

Instead, in-game amber sinks maintain earn/spend tension through the mid-game:

| Feature | Phase | Cost | Effect |
|---|---|---|---|
| Animal gifts | 1+ | 15-30 amber | Cosmetic gift + unique one-time dialogue line. 3 per animal, 30 total. |
| Room upgrades | 2+ | 50-100 amber | Cosmetic room enhancements (furniture, lighting). |
| Amber altar | 3+ | Accumulative | Visual structure on home screen that transforms as amber is poured in. Ties into ritual narrative. |

**Puzzle-count gates on late unlocks** prevent amber surplus from outrunning narrative:

| Unlock | Amber Cost | Min Puzzles |
|---|---|---|
| Jungle (Sloth) | 275 | 55 |
| Desert (Fennec) | 225 | 75 |
| Office (Capybara) | 200 | 95 |
| Burrow (Wombat) | 250 | 115 |
| Garden (Rabbit) | 300 | 140 |
| Bamboo Attic (Red Panda) | 475 | 170 |

### Additional Revenue Streams

- **Gifting**: Purchase Patron's Key as a gift via share link.
- **Creator's Commentary** ($2.99, one-time, Phase 4+ only): Developer commentary mode — which Fox lines were foreshadowing, how word lists shifted, when visual changes first appeared. "DVD extras" for narrative-invested players.
- **Challenge a Friend** (free, UA tool): Send a specific puzzle to a friend. Recipient gets a "Join WordShift" prompt.
- **Wildlife Partnership**: $2.99 cosmetic bundle with 50% to pangolin/axolotl conservation.

### Phase-Aware Monetization Tone

Monetization UI shifts through **visual desaturation**, not narrative voice. The shop feels *tired* at later phases, not *ritualistic*. The void does not sell ads.

| Element | Phase 0-1 | Phase 2 | Phase 3-4 |
|---|---|---|---|
| Shop button | "The Collection" | "The Collection" | "Offerings" |
| Purchase confirm | "Thank you!" | "Thanks." | "Accepted." |
| Ad prompt | "Watch for bonus amber!" | "Watch for amber." | "More amber." |
| Shop background | Bright, candy-colored | Muted, desaturated | Dark, minimal |

### What We Will NOT Do

- **Energy/lives system** — puzzles are always playable
- **Loot boxes / gacha** — all purchases are deterministic
- **Pay-to-skip phases** — the narrative IS the product
- **Pay-to-win hints** — hints are educational, not a frustration-payment loop
- **Forced/pre-roll/mid-puzzle ads** — never
- **Paywalled animals or dialogue** — all 10 animals and 610+ lines are earnable
- **Difficulty manipulation** — puzzles are never made harder to encourage purchases
- **Dark patterns** — no disguised ads, no tiny X buttons, no opt-out-by-default
- **Amber bundles for cash** — breaks the earn/spend loop
- **Guest/temporary animals** — breaks the closed cult narrative
