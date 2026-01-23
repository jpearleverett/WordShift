# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words. Features a vibrant Candy Crush-inspired visual style.

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
- **Navigation**: Single-screen game (no router)
- **State**: React useState/useEffect (no external state library)
- **Target**: iOS and Android via Expo Go

## Project Structure

```
mobile/
├── App.tsx                      # Main game component, all game logic
├── src/
│   ├── types.ts                 # TypeScript interfaces
│   ├── constants.ts             # Word lists by length (3-6 letters)
│   ├── dictionary.ts            # 8000+ word dictionary for validation
│   ├── components/
│   │   ├── Row.tsx              # Game row with PICK/DROP badges, arc layout for slots
│   │   ├── LetterTile.tsx       # Animated letter tile with 3D candy styling
│   │   ├── AnimatedBackground.tsx  # Floating particles/decorations background
│   │   └── Confetti.tsx         # Win celebration confetti effect
│   ├── theme/
│   │   └── colors.ts            # CandyColors palette and tile color system
│   └── services/
│       ├── localGenerator.ts    # Puzzle generation algorithm
│       ├── wordHistory.ts       # Word history tracking for diversity
│       └── starRating.ts        # Star rating system and cumulative stats
```

## Game Mechanics

1. Player sees a chain of words (3-5 rows depending on difficulty)
2. Pick a letter from current word → word shrinks by 1 letter
3. Drop letter into next word → word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

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

### Word Dictionaries (`constants.ts`)

Words organized by length in arrays:
- `WORDS_3`, `WORDS_4`, `WORDS_5`, `WORDS_6` - Word lists
- `COMMON_WORDS` - Set of all valid words for validation

### Game State (`App.tsx`)

Key state variables:
- `rows` - Current puzzle words with letter states
- `selectedTile` - Currently picked letter
- `currentRowIndex` - Active row being solved
- `gamePhase` - 'playing' | 'won'
- `difficulty` - 'EASY' (3 rows) | 'MEDIUM' (4 rows) | 'HARD' (5 rows, 5-letter words)
- `invalidAttempts` - Count of wrong moves this puzzle (for star rating)
- `hintsUsed` - Count of hints used this puzzle (for star rating)
- `earnedStars` - Stars earned on current puzzle (1-3)
- `cumulativeStats` - Lifetime stats loaded from storage

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

### Adding new tile colors
Add to `tileColors` array in `theme/colors.ts`

## Testing

Test on physical device via Expo Go app:
1. Run `npx expo start` in mobile/
2. Scan QR code with Expo Go
3. Test all three difficulty modes
4. Verify puzzle generation doesn't hang (should complete in <3s)
5. Test DROP row arc layout with different word lengths

## Known Constraints

- Puzzle generation has 2.5s timeout to prevent UI blocking
- 4s wrapper timeout in App.tsx as fallback
- Dictionary limited to common English words (no proper nouns, abbreviations)
- Arc layout uses `overflow: visible` - elements can extend beyond row container
