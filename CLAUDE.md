# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. What begins as a bright, candy-colored experience with adorable animal companions gradually descends into cosmic horror — the animals are revealed to be members of a cult, and every puzzle the player solves brings them closer to summoning a dark entity.

## Narrative Vision

**The core conceit**: The player is unknowingly participating in a ritual. Every puzzle solved is an incantation. The animal "friends" aren't just getting philosophical — they're preparing for something. The house isn't just a home — it's a temple being constructed, room by room, to house something ancient.

**The tone shift must be gradual and earned.** The game should feel genuinely delightful for the first 25+ puzzles. Players should *like* these animals. The betrayal of that warmth is the entire point. When Fox says "The fire grows cold... but something else burns," it should land because the player remembers when Fox just wanted to tell them about cozy blankets.

**Everything reflects the transition:**
- **Puzzle words**: Shift from FUN/SPARK/TIGER → VOID/DOOM/ABYSS/RITUAL
- **Background visuals**: Bright candy purple → near-black with crimson accents
- **Floating particles**: Sparkles and stars → dim, dying embers
- **Victory text**: "PERFECT!" → "WHY DOES IT MATTER?"
- **Move messages**: "Delicious!" → "The void accepts."
- **Confetti**: Vibrant rainbow → muted, dark colors
- **Hints**: "Move 'R' — think WARM!" → "If it matters, 'R' — see VOID."
- **Home screen**: Sunny day, happy clouds → storm sky, shadow figure looming
- **Animal sprites**: Cute idle poses → robed cult figures
- **Room decorations**: Cozy furnishings → ritual objects, sigils, altars
- **Music/sound** (future): Cheerful chimes → droning, dissonant ambience

**Key narrative rules:**
1. Never break the fourth wall. The animals don't know they're in a game.
2. The darkness should feel *earned*, not sudden. Each phase is a gradual shift.
3. Phase 4 animals aren't "evil" — they're reverent, serene, certain. That's what makes it unsettling.
4. The player should feel complicit. "You solved the puzzle. You brought us closer."
5. Visual changes should slightly precede dialogue revelations — the player should *feel* something is off before they're told.
6. The shadow_figure.png entity is never named, never explained. It just *is*.

**Phase narrative arc:**
- **Phase 0 (Bright Days)**: Pure joy. Cute animals, candy colors, fun words. The trap is set.
- **Phase 1 (Curious Thoughts)**: Animals start wondering about the nature of things. Subtle philosophical undertones. "Have you ever noticed how letters can become anything?"
- **Phase 2 (Deeper Questions)**: Isolation creeps in. Animals question reality, impermanence. Words shift toward emptiness. The background noticeably darkens.
- **Phase 3 (Growing Shadows)**: Overt dread. Animals speak of endings, purpose, something approaching. The puzzle screen feels cold. Victory feels hollow.
- **Phase 4 (The Horizon)**: The cult is revealed. Animals speak of "the arrangement," "the pattern," "what comes through." Robed sprites. Storm sky. The shadow figure appears. Every puzzle solved is explicitly framed as part of the summoning. Victory text questions why the player continues.

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
│   │   ├── AnimatedBackground.tsx  # Phase-aware floating particles + gradient pulse
│   │   ├── Confetti.tsx         # Phase-aware confetti + StarBurst for valid moves
│   │   ├── ErrorBoundary.tsx    # React error boundary wrapper
│   │   ├── Tutorial.tsx         # Fox-guided interactive onboarding with mini-puzzle
│   │   ├── SettingsScreen.tsx   # Sound/Haptics/Reduced Motion toggles + Reset All
│   │   ├── StatsScreen.tsx      # Stats overview + achievements (two tabs)
│   │   ├── AchievementToast.tsx # Slide-in achievement notification
│   │   ├── DailyChallengeCard.tsx # Compact collapsible daily challenge pill bar
│   │   └── home/
│   │       ├── HomeScreen.tsx   # Main home screen with animal house, shop, unlock progress
│   │       ├── HouseWorld.tsx   # Zoomable house view (vertical pan only, pinch zoom)
│   │       ├── RoomView.tsx     # Individual room with decorations
│   │       ├── AnimalSprite.tsx # Animated animal characters
│   │       ├── JuicyButton.tsx  # Bouncy animated button with pulse
│   │       └── index.ts         # Home component exports
│   ├── theme/
│   │   └── colors.ts            # CandyColors palette, tile colors, PhaseTheme system
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation with DFS, quality scoring, dread words
│       ├── wordHistory.ts       # Word cooldown tracking for puzzle diversity
│       ├── starRating.ts        # Star rating system + cumulative stats + noHintPuzzleCount
│       ├── amberCurrency.ts     # Amber economy, streak (grace period), phase progression
│       ├── animalDialogue.ts    # 520 dialogue lines (52 per animal, 5 phases)
│       ├── dialogueSession.ts   # Dialogue sessions with puzzle-based cooldowns
│       ├── homeWorldData.ts     # Room/animal definitions and unlock progression
│       ├── dailyChallenge.ts    # Daily puzzle with seeded PRNG for determinism
│       ├── phaseNarrative.ts     # Phase-aware text: victory, moves, hints, loading
│       ├── achievements.ts      # 36 achievements across 6 categories
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
    ├── sky_day.png             # Blue gradient with clouds (Phase 0-1)
    ├── sky_dusk.png            # Muted dusk sky (Phase 2)
    ├── sky_storm.png           # Dark, ominous sky (Phase 3)
    ├── sky_shadow.png          # Near-black with entity silhouette (Phase 4)
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
- **Fox character sprites** (`idle.png`, `talk.png`, `robed.png`) in `AnimalSprite.tsx` - other animals fall back to emoji
- **All 10 room backgrounds** in `RoomView.tsx` - fully wired up
- **Environment images** in `HouseWorld.tsx`:
  - `sky_day.png` / `sky_dusk.png` / `sky_storm.png` / `sky_shadow.png` - phase-aware sky background (day → dusk → storm → shadow)
- **Animated emoji sky elements** (clouds, sun/moon, birds, shooting stars, night stars) rendered inside the transform container so they zoom/pan with the scene
- Trees, fence, and ground emoji have been removed for a cleaner look
- `shadow_figure.png` and `ground.png` assets exist but are not currently wired up in code

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
- All puzzle state: rows, selected letter, game state, hints, validation, gameMode, currentPhase
- `initGame(words, hint?, solution?, wordLength?)` - Load pre-generated puzzle
- `startNewGame(difficulty?, mode?)` - Generate and start a random puzzle (standard or challenge)
- `handleLetterPress(letter, rowIndex)` - Pick a letter
- `handleSlotPress(targetIndex)` - Drop letter into slot, returns completion data + gameMode
- `handleHint()` - Show phase-aware hint (blocked in challenge mode)
- `handleUndo()` - Undo last move (limited to 1 in challenge mode)
- `setCurrentPhase(phase)` - Sync narrative phase from persistence layer
- All messages (start, loading, move success, hints) use `phaseNarrative.ts` for phase-aware tone

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
2. Record puzzle completion via `amberCurrency.awardPuzzleAmber()`
3. Check for newly unlocked achievements
4. Queue achievement toasts for display
5. Choreographed victory sequence:
   - Stars pop in one-by-one with 200ms stagger (spring animation)
   - Victory modal scales + fades in after stars complete
   - Phase-aware title: "PERFECT!" (Phase 0) → "WHY DOES IT MATTER?" (Phase 4)
   - Phase-aware feedback text shifts tone with narrative phase
6. If phase changed: dramatic screen flash (double flicker to black)
7. StarBurst particle effect plays on each valid intermediate move

### Achievement System (`services/achievements.ts`)

36 achievements across 6 categories (puzzle, mastery, streak, collection, journey, challenge):
- Each has `check: (state: AchievementCheckState) => boolean`
- State includes: stats, puzzlesSolved, currentPhase, currentStreak, unlockedAnimals, challengeCompletions, decorationCount, etc.
- Persisted via AsyncStorage (`wordshift_unlocked_achievements`)
- `checkAchievements(state)` returns newly unlocked achievements
- `AchievementToast` component shows slide-in notification

### Daily Challenge System (`services/dailyChallenge.ts`)

- **Deterministic**: Uses seeded PRNG (`seededRandom()`) with date as seed
- **`generateDailyPuzzle()`** temporarily overrides `Math.random` for deterministic generation
- Concurrency guard prevents race conditions during async generation
- Difficulty cycles: Easy (day%3===0), Medium (day%3===1), Hard (day%3===2)
- Streak tracking: consecutive days of daily completion
- DailyChallengeCard: compact inline pill bar on home screen (not completed → PLAY button starts challenge; completed → tap toggles community stats with LayoutAnimation)

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

### Dialogue Progression (Phases 0-4)

Animal dialogue evolves as players complete puzzles, gradually revealing the cult:
- **Phase 0 (0-24 puzzles)**: Happy, friendly, light. The animals are your friends. No hint of anything dark.
- **Phase 1 (25-74 puzzles)**: Curious, slightly philosophical. "Have you ever wondered why the letters move?" Subtle signs they know more than they let on.
- **Phase 2 (75-149 puzzles)**: Questioning existence, isolation. "The words are changing, aren't they? Or are we?" First hints of shared purpose among the animals.
- **Phase 3 (150-249 puzzles)**: Existential dread, references to "the arrangement," "what's coming." Animals start speaking in unison-like themes. Something is being prepared.
- **Phase 4 (250+ puzzles)**: The cult revealed. Animals speak reverently of the summoning, the player's role, the entity approaching. Robed sprites. They're grateful — terrifyingly so.

Each animal filters the cult narrative through their personality:
- **Fox (Ember)**: Fireside prophet. "The embers whisper of what's to come."
- **Owl (Archimedes)**: Has read the texts. "I found the passage. It was always in the letters."
- **Sloth (Sloane)**: Slow, inevitable acceptance. "It approaches... at the speed... it was always... going to."
- **Rabbit (Thyme)**: Anxious but devoted. "I'm scared, but... this is what we prepared for, right?"
- **Red Panda (Bamboo)**: Zen certainty. "The pattern completes. Breathe. Accept."

**Dialogue Count**: 52 dialogues per animal (520 total)
- Phase 0: 12 dialogues (happy, friendly)
- Phases 1-4: 10 dialogues each (progressively darker, culminating in cult revelation)

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

The house is built from the ground up, one room at a time. What begins as "building a cozy home for your animal friends" is gradually revealed to be constructing a temple — each room a chamber, each animal a cultist taking their position:

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

### Room Decorations (Post-Completion Content)

After all rooms and animals are unlocked, players can purchase cosmetic decorations (30 total, 3 per room, 75-150 amber each). At higher phases, these decorations take on a darker significance — what starts as "a velvet rug" or "copper pots" eventually feels like "ritual furnishings."

Managed via `purchaseDecoration()`, `hasDecoration()`, `getAllDecorations()` in `amberCurrency.ts`.

### House & Room Visuals

**House Structure** (`HouseWorld.tsx`):
- Single-column layout of rooms stacked vertically (bottom-up)
- Only unlocked rooms are rendered
- Vertical-only pan + pinch zoom via `react-native-gesture-handler` (horizontal pan disabled to prevent side gaps)
- Sky background is inside the transform container (moves with scene) but oversized (1.4x in each dimension) to prevent gaps at any zoom/pan combo
- Phase-aware sky: `sky_day.png` → `sky_dusk.png` → `sky_storm.png` → `sky_shadow.png`
- Phase-aware background color behind sky image (`PHASE_BG_COLORS`): Phase 0-1 `#6fb7df`, Phase 2 `#514378`, Phase 3 `#060612`, Phase 4 `#1a122a`
- Animated emoji sky elements (clouds, sun/moon, birds, shooting stars, night stars) inside the transform container — they zoom/pan with the scene
- No landscape emojis (trees, fence removed for cleaner look)
- Room dimensions: `ROOM_WIDTH` (250) and `ROOM_HEIGHT` (~123, maintains 2:1 aspect ratio of room PNGs)
- Zoom: MIN_SCALE (0.75) to MAX_SCALE (2.0), snaps back to 0.8 if zoomed below

### Word Theme Evolution

Puzzle words gradually shift to match the ritual narrative:
- Phase 0: Fun words (SPARK, FLAME, TIGER) — innocent, playful
- Phase 1: Questioning words (THINK, WONDER, DRIFT, SHIFT) — curiosity
- Phase 2: Isolation words (VOID, EMPTY, ALONE, FADE, FLOAT) — impermanence
- Phase 3: Dread words (DOOM, DARK, COLD, NUMB, GRAVE, ECHO) — something approaching
- Phase 4: Cosmic/ritual words (ABYSS, RIFT, SUMMON, PORTAL, GATE, ETERNAL) — the summoning

The `DREAD_WORDS` set in `localGenerator.ts` contains 200+ words organized by phase. The dread bonus formula is `phase * phase * 2.5` (Phase 4 = +40 score), making ritual-themed words strongly preferred at higher phases.

## Phase-Aware Visual Theming

The entire puzzle screen transforms across narrative phases via the `PhaseTheme` system in `theme/colors.ts` and narrative text in `services/phaseNarrative.ts`.

### Visual Theme (`getPhaseTheme(phase)`)
Returns phase-specific colors for backgrounds, particles, confetti, victory modal, and vignettes:
- **Phase 0**: Bright candy purple (#667EEA), white/pink particles, vibrant confetti
- **Phase 1**: Muted lavender (#5B6DB0), amber-toned particles
- **Phase 2**: Cool blue-purple (#4A5580), desaturated particles
- **Phase 3**: Dark indigo (#2E3355), dim muted particles
- **Phase 4**: Near-black (#1A1A2E), crimson/purple accents, dying embers

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
- `getPhaseChangeNarrative(phase)` — Dramatic text for phase transitions
- `getPhaseIndicator(phase)` — Icon + label for puzzle header badge

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

Manages amber balance, streak, phase progression, and decorations:

- `awardPuzzleAmber(difficulty, stars, gameMode, threeStarRate)` - Main entry, returns balance/phase/streak/challenge bonus
- `calculatePhaseAcceleration(threeStarRate, streak, difficulty, gameMode)` - Weighted phase progress multiplier
- `updateStreak()` - Grace period of STREAK_RESET_DAYS (2 days)
- `getStreakInfo()` - Current streak, multiplier, bonus percentage
- `getFullProgress()` - All progress data (amber, puzzles, phase, unlocks)
- `purchaseDecoration(roomId, decorationId, cost)` - Buy room decoration
- `hasDecoration(roomId, decorationId)` / `getAllDecorations()` / `getDecorationCount()` - Decoration queries
- `clearProgress()` - Full reset

### Hint System

Educational hints show the target word with phase-aware tone:
- Phase 0: "Move 'R' — think "WARM"!" (encouraging)
- Phase 2: "Consider 'R' — notice "COLD"." (distant)
- Phase 4: "If it matters, 'R' — see "VOID"." (nihilistic)
- Falls back to phase-aware undo suggestion if player is off the solution path
- Challenge mode blocks hints entirely

## Tutorial System (`components/Tutorial.tsx`)

Fox-guided interactive onboarding with a real mini-puzzle. Ember (Fox) greets the player and walks them through a single puzzle move: HEAT → ATE (pick H from HEAT → EAT, drop H into ATE → HATE).

**7 tutorial phases**: `welcome` → `show_puzzle` → `pick_letter` → `letter_picked` → `drop_letter` → `move_complete` → `house_intro`

**Components**:
- `FoxCharacter` — Fox talk sprite with emoji fallback, bounce animation when speaking
- `MiniTile` — Smaller LetterTile (44x54) with 3D candy styling, pulse animation for guided hints
- `MiniSlot` — Pulsing dashed-border drop zones
- `SpeechBubble` — Fade-in dialogue with emphasis variant

**Narrative seeds** (innocent now, ominous in retrospect):
- "We've been waiting for someone like you."
- "Every puzzle you solve helps us build the house."
- "The others are going to love you. There's so much more to discover... together."

**Features**: Interactive mini-puzzle (not just text slides), progress dots (5 stages), skip button, content fade transitions, spring animations for celebration.

Checks `AsyncStorage` for `wordshift_tutorial_completed`. Exports: `hasTutorialCompleted()`, `markTutorialCompleted()`, `resetTutorial()`, `Tutorial`.

## Coding Conventions

- Use TypeScript with explicit types for props and state
- React Native StyleSheet for styling (not inline styles)
- Functional components with hooks
- Custom hooks extract game logic from App.tsx (`usePuzzleGame`, `useGamePersistence`)
- Import colors from `CandyColors` in `src/theme/colors.ts`; use `getPhaseTheme(phase)` for phase-aware colors
- All player-facing text must go through `phaseNarrative.ts` — never hardcode victory/move/hint strings
- Use `Animated` API for smooth animations; choreograph multi-step animations with `Animated.sequence` + `Animated.stagger`
- Services use AsyncStorage with in-memory cache pattern (load -> cache -> return cached)
- TS strict: module-level nullable caches need local variable assignment before return to avoid TS2322
- Accessibility: interactive elements should have `accessibilityLabel` and `accessibilityRole`
- **Narrative consistency**: Any new feature, UI text, or visual element must respect the current phase. If it looks cheerful, it should only be cheerful at Phase 0. If it's always cheerful regardless of phase, it breaks the narrative.

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
- House view uses `react-native-gesture-handler` for vertical pan + pinch zoom (horizontal pan disabled; GestureHandlerRootView wraps content)
- TouchableOpacity in home screen components must be imported from `react-native-gesture-handler` for proper touch handling
- HomeScreen.tsx uses react-native TouchableOpacity (not RNGH) for modal content
- Daily challenge uses Math.random override for seeded generation (guarded against concurrency)
- Sound system is placeholder infrastructure (API wired up, awaiting real audio asset files)
