# WordShift - Claude Code Context

A word puzzle game where players shift letters between words to form valid English words.

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
│   │   ├── Row.tsx              # Game row with PICK/DROP badges and slots
│   │   └── LetterTile.tsx       # Draggable letter tile
│   └── services/
│       └── localGenerator.ts    # Puzzle generation algorithm
```

## Game Mechanics

1. Player sees a chain of words (3-5 rows depending on difficulty)
2. Pick a letter from current word → word shrinks by 1 letter
3. Drop letter into next word → word grows by 1 letter
4. Both resulting words must be valid English words
5. Progress through all rows to win

## Key Architecture

### Puzzle Generation (`localGenerator.ts`)

The generator creates word chains using DFS with quality scoring:

- **Anti-boring detection**: Penalizes obvious transforms (S→plural, ED→past tense, ING, LY)
- **Position scoring**: Prefers middle-position letter moves over edge moves
- **Semantic journey**: Bonus for traversing different word categories (animals→food→nature)
- **Quality threshold**: Rejects puzzles scoring below 45/100
- **Multi-candidate**: Generates 3 puzzles, selects highest scoring

Key functions:
- `generateLocalPuzzle(difficulty)` - Main entry point
- `findPath()` - Recursive DFS to find valid word chains
- `scorePuzzleChain()` - Evaluates puzzle quality
- `getBoringTransformPenalty()` - Penalizes obvious suffix/prefix moves

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

## Coding Conventions

- Use TypeScript with explicit types for props and state
- React Native StyleSheet for styling (not inline styles)
- Functional components with hooks
- Keep components focused - game logic stays in App.tsx
- Colors: Purple (#7C3AED) primary, Pink (#EC4899) accent

## Common Tasks

### Adding new word categories
Edit `SEMANTIC_CLUSTERS` in `localGenerator.ts:348`

### Adjusting puzzle difficulty
Modify scoring weights in `scorePuzzleChain()` or `MIN_ACCEPTABLE_SCORE` threshold

### UI adjustments
- Tile sizes: `LetterTile.tsx` styles
- Row layout: `Row.tsx` styles
- Game container: `App.tsx` styles object

## Testing

Test on physical device via Expo Go app:
1. Run `npx expo start` in mobile/
2. Scan QR code with Expo Go
3. Test all three difficulty modes
4. Verify puzzle generation doesn't hang (should complete in <3s)

## Known Constraints

- Puzzle generation has 2.5s timeout to prevent UI blocking
- 4s wrapper timeout in App.tsx as fallback
- Dictionary limited to common English words (no proper nouns, abbreviations)
