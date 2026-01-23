# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. Features a vibrant Candy Crush-inspired visual style and a home screen with unlockable animal characters whose dialogue evolves from cheerful to existential dread.

## Quick Commands

```bash
cd mobile
npm install          # Install dependencies
npx expo start       # Start dev server (scan QR with Expo Go)
npx expo start --clear  # Clear cache and start
```

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: Home screen ↔ Puzzle screen (state-based)
- **State**: React useState/useEffect (no external state library)
- **Target**: iOS and Android via Expo Go

## Project Structure

```
mobile/
├── App.tsx                      # Main app with screen navigation (home/puzzle)
├── src/
│   ├── types.ts                 # TypeScript interfaces for puzzle game
│   ├── types/
│   │   └── homeWorld.ts         # Types for home screen (animals, rooms, currency)
│   ├── constants.ts             # Word lists by length (3-6 letters)
│   ├── dictionary.ts            # 8000+ word dictionary for validation
│   ├── components/
│   │   ├── Row.tsx              # Game row with PICK/DROP badges, arc layout for slots
│   │   ├── LetterTile.tsx       # Animated letter tile with 3D candy styling
│   │   ├── AnimatedBackground.tsx  # Floating particles/decorations background
│   │   ├── Confetti.tsx         # Win celebration confetti effect
│   │   └── home/
│   │       ├── HomeScreen.tsx   # Main home screen with animal house
│   │       ├── HouseWorld.tsx   # Zoomable/pannable house view
│   │       ├── RoomView.tsx     # Individual room with decorations
│   │       ├── AnimalSprite.tsx # Animated animal characters
│   │       └── index.ts         # Home component exports
│   ├── theme/
│   │   └── colors.ts            # CandyColors palette and tile color system
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation with dread word progression
│       ├── wordHistory.ts       # Word history tracking for diversity
│       ├── starRating.ts        # Star rating system and cumulative stats
│       ├── amberCurrency.ts     # Amber currency system with persistence
│       ├── animalDialogue.ts    # Animal dialogue content by phase (0-4), 52 per animal
│       ├── dialogueSession.ts   # Dialogue session system with cooldowns
│       └── homeWorldData.ts     # Room/animal definitions and unlock progression
```

## Game Mechanics

1. Player sees a chain of words (3-5 rows depending on difficulty)
2. Pick a letter from current word → word shrinks by 1 letter
3. Drop letter into next word → word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

## Home Screen & Animal House

The home screen features a multi-story house with unlockable rooms and animal characters.

### Currency System (Amber)

- Players earn **Amber** (💎) by completing puzzles
- Rewards scale by difficulty: EASY=5, MEDIUM=10, HARD=20
- Bonus amber for 3-star performances (+50%) or 2-star (+25%)
- Amber is spent to unlock new characters and rooms

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
- **Phase 0 (0+ puzzles)**: Happy, friendly, light
- **Phase 1 (10+ puzzles)**: Curious, slightly philosophical
- **Phase 2 (25+ puzzles)**: Questioning existence
- **Phase 3 (50+ puzzles)**: Existential dread
- **Phase 4 (100+ puzzles)**: Complete philosophical crisis

Each animal has unique dialogue fitting their personality (owl becomes intellectual crisis, sloth has slow-motion dread, etc.)

**Dialogue Count**: 52 dialogues per animal (520 total)
- Phase 0: 12 dialogues (happy, friendly)
- Phases 1-4: 10 dialogues each (progressively darker)

### Dialogue Session System

Animals have conversation sessions with cooldown periods to pace interactions:

**Session Parameters** (in `dialogueSession.ts`):
- Session duration: 2.5 minutes
- Max dialogues per session: 10
- Cooldown after session: 5 minutes
- Min interval between dialogues: 3 seconds

**Session Flow**:
1. Player taps animal → starts session if available
2. Session timer begins (2.5 min)
3. Player can have up to 10 dialogues during session
4. Session ends when: time expires, max dialogues reached, or player leaves
5. Cooldown begins → animal unavailable for 5 minutes
6. After cooldown → animal available again

**UI Indicators**:
- Session status bar shows time/dialogues remaining
- Cooldown toast appears when animal is unavailable
- Session persists via AsyncStorage (survives app restart)

### House Building System (Bottom-Up)

The house is built from the ground up, one room at a time:

**Starting State**:
- Player starts with one empty room (Cozy Den) on the ground floor
- No animals unlocked - must invite the first one
- House only shows unlocked rooms (single vertical stack)

**Unlock Flow**: Invite animal → Build room → Invite animal → Build room...
1. **Fox (Ember)** - FREE to invite into Cozy Den (starter)
2. **Kitchen** - 30 amber to build above Cozy Den
3. **Pangolin (Panko)** - 25 amber to invite into Kitchen
4. **Study** - 50 amber to build
5. **Owl (Archimedes)** - 40 amber to invite
6. ...continues alternating rooms and animals

**Invite System**:
- Empty rooms show "Tap to Invite!" indicator
- Tapping opens invite modal with animal info and cost
- First animal (Fox) is free to introduce house-building lore
- Fox's opening dialogue explains the amber/building mechanic

**Unlock Sequence Validation**:
- Can only invite an animal if their room exists
- Can only build a room if previous animal is invited
- `isUnlockAvailable()` function validates prerequisites
- UI shows reason if unlock is blocked (e.g., "Invite Panko first")

### House & Room Visuals

**House Structure** (`HouseWorld.tsx`):
- Single column of rooms stacked vertically (bottom-up)
- Only unlocked rooms are rendered
- Rooms sorted by floor number (ground = 0, increasing upward)
- Dynamic height based on number of unlocked rooms
- Pinch-to-zoom support via PanResponder

**Room Decorations** (`RoomView.tsx`):
- Each room theme has 6-7 furniture/decoration items
- Items positioned at: wall-left/center/right, floor-left/center/right, corners
- Sizes: small (14px), medium (20px), large (28px)
- Some rooms have windows (study, kitchen, cozy_den)
- Wall and floor patterns for themed textures

### Word Theme Evolution

Puzzle words gradually shift to match the existential theme:
- Phase 0: Fun words (SPARK, FLAME, TIGER)
- Higher phases: Dread words preferred (VOID, FADE, DOOM, ABYSS)

## Key Architecture

### Row Component (`Row.tsx`)

The Row component handles two states:
- **PICK row**: Active row where player selects a letter (purple border, PICK badge)
- **DROP row**: Target row showing insertion slots (pink dashed border, DROP badge)

Arc layout for DROP row:
- Interleaved elements: `[slot][letter][slot][letter]...[slot]`
- Center elements lift upward, edges tilt outward creating a fan effect
- Letters stay full-size, slots are upside-down trapezoid shapes (wider top, narrower bottom)
- Slots render on top of letters (zIndex: 10) for better tap targeting
- Smooth 450ms glide animation on expand, 300ms on collapse; replays on each letter selection
- Configuration constants at top of file:
  - `ARC_ROTATION` (12°) - Max rotation for edge elements (steeper = more fan spread)
  - `ARC_LIFT` (18px) - Vertical arc depth, centered in container
  - `SLOT_WIDTH` (14px) - Base width for drop slots (rendered +4px wider for trapezoid effect)
  - `SLOT_HEIGHT` (52px) - Matches letter tile height

### Theme System (`theme/colors.ts`)

`CandyColors` object provides:
- Named color groups: `purple`, `pink`, `blue`, `green`, `yellow`, `orange`, `red`, `cyan`
- Each has: `light`, `main`, `dark`, `glow`, `shadow` variants
- `tileColors` array for letter variety (6 colors, assigned by char code)
- `getTileColor(char)` - Returns consistent color for a letter

### Puzzle Generation (`localGenerator.ts`)

The generator creates word chains using DFS with quality scoring:

- **Anti-boring detection**: Penalizes obvious transforms (S→plural, ED→past tense, ING, LY)
- **Position scoring**: Prefers middle-position letter moves over edge moves
- **Semantic journey**: Bonus for traversing different word categories (animals→food→nature)
- **Quality threshold**: Rejects puzzles scoring below 45/100
- **Multi-candidate**: Generates 3 puzzles, selects highest scoring
- **Word history integration**: Penalizes/excludes recently used words for diversity

Key functions:
- `generateLocalPuzzle(difficulty)` - Main entry point
- `findPath()` - Recursive DFS to find valid word chains
- `scorePuzzleChain()` - Evaluates puzzle quality (includes freshness scoring)
- `getBoringTransformPenalty()` - Penalizes obvious suffix/prefix moves
- `scoreWordInterestingness()` - Scores words by interest + freshness

### Word History (`wordHistory.ts`)

Tracks recently used words to ensure puzzle diversity across sessions:

- **AsyncStorage persistence**: History survives app restarts
- **Tracks ~100 puzzles**: Stores last ~500 words (5 words/puzzle average)
- **Hard cooldown (15 puzzles)**: Words completely excluded from generation
- **Soft cooldown (15-40 puzzles)**: Decaying penalty (50→10 points)
- **Freshness bonus**: Never-seen words get +5 score boost

Key functions:
- `getWordHistoryWithRecency()` - Returns Map<word, puzzlesAgo>
- `calculateFreshnessPenalty(word, recencyMap)` - Returns 0-100 penalty
- `isInHardCooldown(word, recencyMap)` - Check if word should be excluded
- `recordPuzzleWords(words)` - Save words after puzzle generation
- `clearWordHistory()` - Reset history (for testing)

Cooldown constants (at top of file):
- `HARD_COOLDOWN = 15` - Puzzles before word can reappear
- `SOFT_COOLDOWN = 40` - Puzzles before penalty fully decays
- `MAX_HISTORY_SIZE = 100` - Max puzzles tracked

### Star Rating System (`starRating.ts`)

Grades puzzle performance without time pressure. Stars are awarded based on hints and mistakes:

**Star Thresholds:**
- **3 stars (PERFECT)**: 0 hints, 0-1 invalid attempts
- **2 stars (SWEET)**: 1 hint OR 2-3 invalid attempts
- **1 star (NICE)**: 2+ hints OR 4+ invalid attempts

**Design Philosophy:**
- Stars are a "grade" on performance, not a replay target
- Each puzzle is one-shot (like Wordle) - no replaying for better stars
- Forward momentum: "Try to do better on the next one"
- Non-stressful: no timer, always completable

**Tracked Metrics:**
- `invalidAttempts` - Incremented when player tries invalid word combinations
- `hintsUsed` - Incremented when player uses hint button (only counts helpful hints)

**Cumulative Stats (persisted via AsyncStorage):**
- `totalPuzzlesCompleted` - Total games finished
- `totalStars` - Sum of all stars earned
- `threeStarCount` / `twoStarCount` / `oneStarCount` - Breakdown by rating
- `byDifficulty` - Per-difficulty stats (EASY/MEDIUM/HARD)

Key functions:
- `calculateStars(hintsUsed, invalidAttempts)` - Returns 1-3 stars
- `recordPuzzleCompletion(difficulty, hintsUsed, invalidAttempts)` - Save after win
- `getCumulativeStats()` - Load lifetime stats
- `clearStats()` - Reset all stats (for testing)

### Dialogue Session System (`dialogueSession.ts`)

Manages timed dialogue sessions with cooldown periods:

**Configuration Constants**:
```typescript
DIALOGUE_SESSION_CONFIG = {
  SESSION_DURATION_MS: 2.5 * 60 * 1000,   // 2.5 minutes
  COOLDOWN_DURATION_MS: 5 * 60 * 1000,    // 5 minutes
  MIN_DIALOGUE_INTERVAL_MS: 3000,          // 3 seconds
  DIALOGUES_PER_SESSION: 10,               // Max per session
}
```

**Key Types**:
```typescript
interface DialogueSession {
  animalId: string;
  sessionStartTime: number;
  lastDialogueTime: number;
  dialoguesInSession: number;
  cooldownEndTime: number | null;
}
```

**Key Functions**:
- `checkDialogueAvailability(animalId)` - Returns availability status and time remaining
- `recordDialogue(animalId)` - Record a dialogue, start/continue session
- `endSession(animalId)` - End session and start cooldown
- `getSessionStatus(animalId)` - Get 'available' | 'in_session' | 'cooldown' status
- `formatTimeRemaining(seconds)` - Format time for display (e.g., "2m 30s")
- `loadDialogueSessions()` - Load sessions from AsyncStorage on app start

### Word Dictionaries (`constants.ts`)

Words organized by length in arrays:
- `WORDS_3`, `WORDS_4`, `WORDS_5`, `WORDS_6` - Word lists
- `COMMON_WORDS` - Set of all valid words for validation

### Game State (`App.tsx`)

Key state variables:
- `currentScreen` - 'home' | 'puzzle' (navigation state)
- `rows` - Current puzzle words with letter states
- `selectedTile` - Currently picked letter
- `currentRowIndex` - Active row being solved
- `gamePhase` - 'playing' | 'won'
- `difficulty` - 'EASY' (3 rows) | 'MEDIUM' (4 rows) | 'HARD' (5 rows, 5-letter words)
- `invalidAttempts` - Count of wrong moves this puzzle (for star rating)
- `hintsUsed` - Count of hints used this puzzle (for star rating)
- `earnedStars` - Stars earned on current puzzle (1-3)
- `cumulativeStats` - Lifetime stats loaded from storage
- `amberEarned` - Amber earned from current puzzle
- `amberBalance` - Total amber balance
- `phaseChanged` - Whether completing puzzle triggered phase transition

## Coding Conventions

- Use TypeScript with explicit types for props and state
- React Native StyleSheet for styling (not inline styles)
- Functional components with hooks
- Keep components focused - game logic stays in App.tsx
- Import colors from `CandyColors` in `src/theme/colors.ts`
- Use `Animated` API for smooth animations

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
- Current: 3 stars = 0 hints + ≤1 mistake, 2 stars = 1 hint OR 2-3 mistakes, 1 star = rest
- Modify the conditionals to adjust difficulty of earning stars

### UI adjustments
- Tile sizes/styling: `LetterTile.tsx` styles
- Row layout: `Row.tsx` styles
- Arc/fan effect: Constants at top of `Row.tsx` (ARC_ROTATION, ARC_LIFT, SLOT_WIDTH, SLOT_HEIGHT)
- Color palette: `theme/colors.ts`
- Game container: `App.tsx` styles object
- Status bar handling: Use `paddingTop: 50` on headers (not SafeAreaView) for Android compatibility

### Adding new tile colors
Add to `tileColors` array in `theme/colors.ts`

### Home Screen - Adding new animals
1. Add animal type to `AnimalType` in `types/homeWorld.ts`
2. Add dialogue entries in `animalDialogue.ts` (all 5 phases)
3. Add animal definition in `ANIMALS` array in `homeWorldData.ts`
4. Add room definition in `ROOMS` array
5. Add unlock entries in `UNLOCK_PROGRESSION`

### Home Screen - Adjusting amber rewards
Edit `AMBER_REWARDS` in `types/homeWorld.ts`:
- EASY: 5 → change for easier/harder progression
- MEDIUM: 10
- HARD: 20

### Home Screen - Adjusting dialogue phases
Edit `PHASE_THRESHOLDS` in `types/homeWorld.ts`:
- Default: [0, 10, 25, 50, 100] puzzles for phases 0-4
- Lower values = faster descent into existential dread

### Home Screen - Adding dread words
Edit `DREAD_WORDS` set in `localGenerator.ts` to add/remove words
that appear more frequently at higher phases

### Home Screen - Adjusting dialogue sessions
Edit `DIALOGUE_SESSION_CONFIG` in `types/homeWorld.ts`:
- `SESSION_DURATION_MS` - How long a session lasts (default: 2.5 min)
- `COOLDOWN_DURATION_MS` - Rest period after session (default: 5 min)
- `MIN_DIALOGUE_INTERVAL_MS` - Time between dialogues (default: 3s)
- `DIALOGUES_PER_SESSION` - Max dialogues before cooldown (default: 10)

## Testing

Test on physical device via Expo Go app:
1. Run `npx expo start` in mobile/
2. Scan QR code with Expo Go
3. Test all three difficulty modes
4. Verify puzzle generation doesn't hang (should complete in <3s)
5. Test DROP row arc layout with different word lengths
6. Test home screen features:
   - New game: starts with empty Cozy Den, invite prompt appears
   - Invite Fox for free, verify intro dialogue about building
   - Tap animals to start dialogue sessions
   - Verify session timer and dialogue count display
   - Verify cooldown appears after session ends
   - Test unlock sequence (invite animal → build room → invite animal)
   - Test pinch-to-zoom on house view

## Known Constraints

- Puzzle generation has 2.5s timeout to prevent UI blocking
- 4s wrapper timeout in App.tsx as fallback
- Dictionary limited to common English words (no proper nouns, abbreviations)
- Arc layout uses `overflow: visible` - elements can extend beyond row container
- Dialogue sessions persist across app restarts (cooldowns continue)
- House view supports pinch-to-zoom via PanResponder (basic implementation)
