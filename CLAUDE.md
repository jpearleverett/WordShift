# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. Features a vibrant Candy Crush-inspired visual style and a home screen with unlockable animal characters whose dialogue evolves from cheerful to existential dread.

## Quick Commands

```bash
cd mobile
npm install          # Install dependencies
npx expo start       # Start dev server (scan QR with Expo Go)
npx expo start --clear  # Clear cache and start
npx jest --no-coverage   # Run all tests (144 tests, 11 suites)
```

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript (strict)
- **Navigation**: State-based (`currentScreen: 'home' | 'puzzle' | 'settings' | 'stats'`)
- **State**: React useState/useEffect (no external state library)
- **Persistence**: AsyncStorage with in-memory cache pattern
- **Haptics**: expo-haptics (settings-gated)
- **Audio**: expo-av (placeholder infrastructure, awaiting real audio assets)
- **Testing**: Jest with ts-jest preset
- **Target**: iOS and Android via Expo Go

## Project Structure

```
mobile/
├── App.tsx                      # Main app: screen routing, victory flow, achievement queue
├── assets/                      # Image assets (see Asset System below)
│   ├── characters/              # Animal character sprites
│   ├── rooms/                   # Room background images
│   ├── house/                   # House structure elements
│   └── environment/             # Sky, trees, ground, etc.
├── src/
│   ├── types.ts                 # TypeScript interfaces (RowData, Letter, GameState, etc.)
│   ├── types/
│   │   └── homeWorld.ts         # Home screen types, config constants, streak/amber types
│   ├── constants.ts             # Word lists by length (3-6 letters), COMMON_WORDS set
│   ├── dictionary.ts            # 8000+ word dictionary for validation
│   ├── hooks/
│   │   ├── usePuzzleGame.ts     # All puzzle game state and actions (extracted from App.tsx)
│   │   └── useGamePersistence.ts # Persistence: amber, stats, phases (extracted from App.tsx)
│   ├── components/
│   │   ├── Row.tsx              # Game row with PICK/DROP badges, arc layout for slots
│   │   ├── LetterTile.tsx       # Animated letter tile with 3D candy styling
│   │   ├── AnimatedBackground.tsx  # Floating particles (respects reducedMotion)
│   │   ├── Confetti.tsx         # Win celebration confetti (respects reducedMotion)
│   │   ├── ErrorBoundary.tsx    # React error boundary wrapper
│   │   ├── Tutorial.tsx         # 5-step animated onboarding
│   │   ├── SettingsScreen.tsx   # Sound/Haptics/Reduced Motion toggles + Reset All
│   │   ├── StatsScreen.tsx      # Stats overview + achievements (two tabs)
│   │   ├── AchievementToast.tsx # Slide-in achievement notification
│   │   ├── DailyChallengeCard.tsx # Daily challenge status card with pulse animation
│   │   └── home/
│   │       ├── HomeScreen.tsx   # Main home screen with animal house, shop, unlock progress
│   │       ├── HouseWorld.tsx   # Zoomable/pannable house view
│   │       ├── RoomView.tsx     # Individual room with decorations
│   │       ├── AnimalSprite.tsx # Animated animal characters
│   │       ├── JuicyButton.tsx  # Bouncy animated button with pulse
│   │       └── index.ts         # Home component exports
│   ├── theme/
│   │   └── colors.ts            # CandyColors palette and tile color system
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation with DFS, quality scoring, dread words
│       ├── wordHistory.ts       # Word cooldown tracking for puzzle diversity
│       ├── starRating.ts        # Star rating system + cumulative stats + noHintPuzzleCount
│       ├── amberCurrency.ts     # Amber economy, streak (grace period), phase progression
│       ├── animalDialogue.ts    # 520 dialogue lines (52 per animal, 5 phases)
│       ├── dialogueSession.ts   # Dialogue sessions with puzzle-based cooldowns
│       ├── homeWorldData.ts     # Room/animal definitions and unlock progression
│       ├── dailyChallenge.ts    # Daily puzzle with seeded PRNG for determinism
│       ├── achievements.ts      # 28 achievements across 5 categories
│       ├── shareResults.ts      # Wordle-style emoji grid sharing
│       ├── settings.ts          # User preferences (sound, haptics, reducedMotion)
│       ├── haptics.ts           # Haptic feedback (settings-gated)
│       ├── audio.ts             # Sound effects (placeholder, awaiting assets)
│       └── eventLogger.ts       # Analytics event logging
├── src/__tests__/               # Test suites (144 tests, 11 suites)
│   ├── achievements.test.ts
│   ├── amberCurrency.test.ts
│   ├── dailyChallenge.test.ts
│   ├── dialogueSession.test.ts
│   ├── eventLogger.test.ts
│   ├── homeWorldData.test.ts
│   ├── localGenerator.test.ts
│   ├── settings.test.ts
│   ├── shareResults.test.ts
│   ├── starRating.test.ts
│   └── wordHistory.test.ts
```

## Asset System (Images)

The home screen is transitioning from emoji-based graphics to proper image assets. Assets are added incrementally - when an asset exists, use it; otherwise fall back to the current emoji/styled implementation.

### Asset Directory Structure

```
mobile/assets/
├── characters/                  # Animal character sprites
│   ├── fox/
│   │   ├── idle.png            # Standing pose, facing right
│   │   ├── walk.png            # 4-frame sprite sheet (or walk_1.png - walk_4.png)
│   │   ├── talk.png            # Mouth open variant for dialogue
│   │   └── robed.png           # Phase 4 dark version with cloak
│   ├── pangolin/               # Same structure for each animal
│   ├── owl/
│   ├── axolotl/
│   ├── sloth/
│   ├── fennec_fox/
│   ├── capybara/
│   ├── wombat/
│   ├── rabbit/
│   └── red_panda/
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
├── house/                       # House structure elements
│   ├── roof.png                # Dark shingles roof
│   ├── frame_left.png          # Left wall/border of house
│   ├── frame_right.png         # Right wall/border of house
│   ├── foundation.png          # Stone base at bottom
│   ├── floor_divider.png       # Horizontal beam between rooms
│   └── chimney.png             # Chimney with smoke (optional)
│
└── environment/                 # Background and scenery
    ├── sky_day.png             # Blue gradient with clouds (default)
    ├── sky_storm.png           # Dark, ominous sky (Phase 4)
    ├── tree_left.png           # Tree on left side of house
    ├── tree_right.png          # Tree on right side of house
    ├── ground.png              # Grass, path, flowers at bottom
    ├── cloud_1.png             # Animated cloud sprite
    ├── cloud_2.png             # Second cloud variant
    ├── shadow_figure.png       # The looming entity (Phase 4 only)
    └── birds.png               # Optional flying birds
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

**Phase 4 visual changes:**
- Use `robed.png` variants for all animals at Phase 4
- Switch from `sky_day.png` to `sky_storm.png`
- Show `shadow_figure.png` in background

**Room backgrounds:**
- Room images should be 280x140px (or 2x/3x for retina)
- Include all furniture/decorations baked into the image
- Animal sprites render on top of room background

### Current Asset State

The home screen now uses image assets for:
- **Fox character sprites** (`idle.png`, `talk.png`, `robed.png`) in `AnimalSprite.tsx` - other animals fall back to emoji
- **All 10 room backgrounds** in `RoomView.tsx` - fully wired up
- **Environment images** in `HouseWorld.tsx`:
  - `sky_day.png` / `sky_storm.png` - sky background (storm at Phase 4)
  - `shadow_figure.png` - appears at Phase 4
  - `ground.png` - ground beneath the house
- Animated emoji clouds, sun, birds, trees, fence still use emoji/styled Views

As more character sprites are added, update `CHARACTER_SPRITES` in `AnimalSprite.tsx`.

## Game Mechanics

1. Player sees a chain of words (3-5 rows depending on difficulty)
2. Pick a letter from current word - word shrinks by 1 letter
3. Drop letter into next word - word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

## App Architecture

### Custom Hooks

Game logic is extracted into two custom hooks:

**`usePuzzleGame()`** (`src/hooks/usePuzzleGame.ts`):
- All puzzle state: rows, selected letter, game state, hints, validation
- `initGame(words, hint?, solution?, wordLength?)` - Load pre-generated puzzle
- `startNewGame(difficulty?)` - Generate and start a random puzzle
- `handleLetterPress(letter, rowIndex)` - Pick a letter
- `handleSlotPress(targetIndex)` - Drop letter into slot, returns completion data
- `handleHint()` - Show educational hint ("Move 'R' - think "WARM"!")
- `handleUndo()` - Undo last move

**`useGamePersistence()`** (`src/hooks/useGamePersistence.ts`):
- All persistence: amber balance, cumulative stats, phase, streak
- `handleVictory(difficulty, hintsUsed, invalidAttempts)` - Record win, update stats
- `refreshProgress()` - Reload from storage

### Screen Navigation

State-based routing in `App.tsx`:
- `currentScreen: 'home' | 'puzzle' | 'settings' | 'stats'`
- Screen transitions use `Animated.timing` fade (150ms out, 200ms in)
- Transitions instant when `reducedMotion` setting is enabled
- `transitionTo(screen, callback?)` handles all navigation

### Victory Flow

When puzzle completes (`handleSlotPress` returns `{completed: true}`):
1. Record stars via `calculateStars(hintsUsed, invalidAttempts)`
2. Record puzzle completion via `amberCurrency.awardPuzzleCompletion()`
3. Check for newly unlocked achievements
4. Queue achievement toasts for display
5. Show victory modal with positive feedback

### Achievement System (`services/achievements.ts`)

28 achievements across 5 categories (puzzle, mastery, streak, collection, journey):
- Each has `check: (state: AchievementCheckState) => boolean`
- State includes: stats, puzzlesSolved, currentPhase, currentStreak, unlockedAnimals, etc.
- Persisted via AsyncStorage (`wordshift_unlocked_achievements`)
- `checkAchievements(state)` returns newly unlocked achievements
- `AchievementToast` component shows slide-in notification

### Daily Challenge System (`services/dailyChallenge.ts`)

- **Deterministic**: Uses seeded PRNG (`seededRandom()`) with date as seed
- **`generateDailyPuzzle()`** temporarily overrides `Math.random` for deterministic generation
- Concurrency guard prevents race conditions during async generation
- Difficulty cycles: Easy (day%3===0), Medium (day%3===1), Hard (day%3===2)
- Streak tracking: consecutive days of daily completion
- DailyChallengeCard shows status on home screen

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

### Currency System (Amber)

- Players earn **Amber** by completing puzzles
- Rewards: EASY=5, MEDIUM=10, HARD=20 base
- Star bonuses: 3-star +50%, 2-star +25%
- Streak multiplier: 5% per day (max 50%, requires MIN_STREAK_FOR_BONUS=3)
- **Streak grace period**: Players can miss up to STREAK_RESET_DAYS (2) days

### Animal Characters

10 unique animals, each with their own room and personality (listed in unlock order):
- **Fox (Ember)** - Introspective, cozy den with fireplace (STARTER - free to invite)
- **Pangolin (Panko)** - Practical chef, rustic kitchen
- **Owl (Archimedes)** - Scholar, study full of books
- **Axolotl (Axel)** - Dreamy, aquarium room
- **Capybara (Chill)** - Seemingly calm, office
- **Fennec Fox (Fennick)** - Alert listener, desert camp
- **Sloth (Sloane)** - Slow observer, jungle hammock
- **Wombat (Warren)** - Grounded digger, underground burrow
- **Rabbit (Thyme)** - Anxious, garden patio
- **Red Panda (Bamboo)** - Zen/contemplative, bamboo attic (final unlock)

### Dialogue Progression (Phases 0-4)

Animal dialogue evolves as players complete puzzles:
- **Phase 0 (0-24 puzzles)**: Happy, friendly, light
- **Phase 1 (25-74 puzzles)**: Curious, slightly philosophical
- **Phase 2 (75-149 puzzles)**: Questioning existence
- **Phase 3 (150-249 puzzles)**: Existential dread
- **Phase 4 (250+ puzzles)**: Complete philosophical crisis

Each animal has unique dialogue fitting their personality (owl becomes intellectual crisis, sloth has slow-motion dread, etc.)

**Dialogue Count**: 52 dialogues per animal (520 total)
- Phase 0: 12 dialogues (happy, friendly)
- Phases 1-4: 10 dialogues each (progressively darker)

### Dialogue Session System

Animals have conversation sessions with puzzle-based cooldowns to pace interactions:

**Session Parameters** (in `dialogueSession.ts` and `types/homeWorld.ts`):
- Max dialogues per session: 8
- Cooldown: 3 puzzles between sessions
- Dialogue progress persists (animals remember where they left off)

**Session Flow**:
1. Player taps animal -> starts session if available
2. Player can have up to 8 dialogues during session
3. Session ends when: max dialogues reached or player leaves
4. Cooldown begins -> must complete 3 puzzles to talk again
5. After cooldown -> animal continues from next dialogue (not repeat)

**UI Indicators**:
- Session status bar shows dialogues remaining
- Cooldown toast appears at bottom of screen when animal is unavailable
- Session/cooldown state persists via AsyncStorage

### House Building System (Bottom-Up)

The house is built from the ground up, one room at a time:

**Starting State**:
- Player starts with one empty room (Cozy Den) on the ground floor
- No animals unlocked - must invite the first one
- House only shows unlocked rooms (single vertical stack)

**Unlock Flow**: Invite animal -> Build room -> Invite animal -> Build room...
1. **Fox (Ember)** - FREE to invite into Cozy Den (starter)
2. **Kitchen** - 30 amber to build above Cozy Den
3. **Pangolin (Panko)** - 25 amber to invite into Kitchen
4. **Study** - 50 amber to build
5. **Owl (Archimedes)** - 40 amber to invite
6. ...continues alternating rooms and animals

**Unlock Progress Bar**: Home screen shows amber progress toward next unlock with a visual bar.

### House & Room Visuals

**House Structure** (`HouseWorld.tsx`):
- Single column of rooms stacked vertically (bottom-up)
- Only unlocked rooms are rendered
- Pan/zoom via `react-native-gesture-handler` (PanGestureHandler + PinchGestureHandler)
- Fixed sky background with animated clouds, sun, birds
- Room dimensions: `ROOM_WIDTH` (165) and `ROOM_HEIGHT` (130)

### Word Theme Evolution

Puzzle words gradually shift to match the existential theme:
- Phase 0: Fun words (SPARK, FLAME, TIGER)
- Higher phases: Dread words preferred (VOID, FADE, DOOM, ABYSS)

## Key Services

### Puzzle Generation (`localGenerator.ts`)

DFS-based word chain generator with quality scoring:

- **Anti-boring detection**: Penalizes obvious transforms (S->plural, ED->past tense, ING, LY)
- **Position scoring**: Prefers middle-position letter moves over edge moves
- **Semantic journey**: Bonus for traversing different word categories
- **Quality threshold**: Rejects puzzles scoring below 45/100
- **Multi-candidate**: Generates 3 puzzles, selects highest scoring
- **Word history integration**: Penalizes/excludes recently used words

Key functions:
- `generateLocalPuzzle(difficulty)` - Main entry point (2.5s timeout)
- `findPath()` - Recursive DFS to find valid word chains
- `scorePuzzleChain()` - Evaluates puzzle quality (includes freshness scoring)

### Star Rating System (`starRating.ts`)

Grades puzzle performance without time pressure:

**Star Thresholds (generous, reward exploration):**
- **3 stars (PERFECT!)**: 0 hints, 0-2 invalid attempts
- **2 stars (GREAT!)**: 1 hint OR 3-4 invalid attempts
- **1 star (WELL DONE!)**: 2+ hints OR 5+ invalid attempts

**Victory feedback is always positive** - no negative framing.

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

- `awardPuzzleCompletion(difficulty)` - Main entry, returns balance/phase/streak
- `updateStreak()` - Grace period of STREAK_RESET_DAYS (2 days)
- `getStreakInfo()` - Current streak, multiplier, bonus percentage
- `getFullProgress()` - All progress data (amber, puzzles, phase, unlocks)
- `clearProgress()` - Full reset

### Hint System

Educational hints show the target word:
- "Move 'R' - think "WARM"!" instead of just "Try the letter: R"
- Falls back to undo suggestion if player is off the solution path

## Tutorial System (`components/Tutorial.tsx`)

5-step animated onboarding:
1. Welcome
2. Pick Letter
3. Drop Down
4. Complete Chain
5. Build House

Checks `AsyncStorage` for `wordshift_tutorial_completed`. Spring animations between steps.

## Coding Conventions

- Use TypeScript with explicit types for props and state
- React Native StyleSheet for styling (not inline styles)
- Functional components with hooks
- Custom hooks extract game logic from App.tsx (`usePuzzleGame`, `useGamePersistence`)
- Import colors from `CandyColors` in `src/theme/colors.ts`
- Use `Animated` API for smooth animations
- Services use AsyncStorage with in-memory cache pattern (load -> cache -> return cached)
- TS strict: module-level nullable caches need local variable assignment before return to avoid TS2322
- Accessibility: interactive elements should have `accessibilityLabel` and `accessibilityRole`

## Testing

### Automated Tests

```bash
cd mobile && npx jest --no-coverage  # 144 tests, 11 suites
```

**Test patterns:**
- Tests mock `@react-native-async-storage/async-storage` with inline factory per file
- Tests that import react-native modules need `jest.mock('react-native', ...)` at top
- `beforeEach` must call both `AsyncStorage.clear()` AND service-specific clear functions
- Puzzle generator tests mock `amberCurrency.getCurrentPhase` + all `wordHistory` functions

### Manual Testing

Test on physical device via Expo Go app:
1. Run `npx expo start` in mobile/
2. Scan QR code with Expo Go
3. Test all three difficulty modes
4. Verify puzzle generation doesn't hang (should complete in <3s)
5. Test tutorial on fresh install
6. Test daily challenge (should give same puzzle if opened twice same day)
7. Test home screen unlock flow (Fox free -> build Kitchen -> invite Panko)
8. Test settings (toggle reduced motion -> verify no confetti/particles)
9. Test Reset All Data -> verify complete reset including tutorial/amber/unlocks
10. Test stats screen shows correct streak

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
- Tile sizes/styling: `LetterTile.tsx` styles
- Row layout: `Row.tsx` styles
- Arc/fan effect: Constants at top of `Row.tsx` (ARC_ROTATION, ARC_LIFT, SLOT_WIDTH, SLOT_HEIGHT)
- Color palette: `theme/colors.ts`
- Game container: `App.tsx` styles object
- Room dimensions: `ROOM_WIDTH` (165) and `ROOM_HEIGHT` (130) in `HouseWorld.tsx`
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
- EASY: 5, MEDIUM: 10, HARD: 20

### Home Screen - Adjusting dialogue phases
Edit `PHASE_THRESHOLDS` in `types/homeWorld.ts`:
- Default: [0, 25, 75, 150, 250] puzzles for phases 0-4

### Home Screen - Adjusting dialogue sessions
Edit `DIALOGUE_SESSION_CONFIG` in `types/homeWorld.ts`:
- `DIALOGUES_PER_SESSION` - Max dialogues before cooldown (default: 8)
- `PUZZLES_BETWEEN_SESSIONS` - Puzzles required to unlock next session (default: 3)

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
- Dictionary limited to common English words (no proper nouns, abbreviations)
- Arc layout uses `overflow: visible` - elements can extend beyond row container
- Dialogue sessions persist across app restarts (cooldowns continue)
- House view uses `react-native-gesture-handler` for pan/zoom (GestureHandlerRootView wraps content)
- TouchableOpacity in home screen components must be imported from `react-native-gesture-handler` for proper touch handling
- HomeScreen.tsx uses react-native TouchableOpacity (not RNGH) for modal content
- Daily challenge uses Math.random override for seeded generation (guarded against concurrency)
- Sound system is placeholder infrastructure (API wired up, awaiting real audio asset files)
