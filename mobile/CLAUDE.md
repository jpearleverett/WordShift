# WordShift Mobile App

React Native game built with Expo SDK 54.

## Commands

```bash
npm install              # Install dependencies
npx expo start           # Start dev server
npx expo start --clear   # Clear cache and restart
```

## File Overview

| File | Purpose |
|------|---------|
| `App.tsx` | Main game component, state management, UI |
| `src/types.ts` | TypeScript interfaces (PuzzleConfig, Difficulty, etc.) |
| `src/constants.ts` | Word lists organized by length |
| `src/dictionary.ts` | Full dictionary for word validation |
| `src/components/Row.tsx` | Game row with slots and badges |
| `src/components/LetterTile.tsx` | Draggable letter tile |
| `src/services/localGenerator.ts` | Puzzle generation with quality scoring |

## Architecture Notes

- **No navigation library** - Single screen game
- **No state library** - Uses React useState
- **No gesture library** - Uses TouchableOpacity for tile selection
- **Puzzle generation is async** - Wrapped in timeout to prevent blocking

## Styling

All styles use React Native `StyleSheet.create()`. Key measurements:
- Tile: 42x52px, font 22px
- Slot: 22x46px
- Row margins: 12px horizontal

## Puzzle Generation Flow

```
generateLocalPuzzle(difficulty)
  → weightedShuffle(words)      # Prioritize interesting starting words
  → findPath(chain, depth)      # DFS to build word chain
    → scoreMoveQuality()        # Rate each potential move
    → getBoringTransformPenalty() # Penalize S/ED/ER/ING moves
  → scorePuzzleChain()          # Rate complete puzzle
  → Select best of 3 candidates
```

## Difficulty Settings

| Mode | Rows | Word Length |
|------|------|-------------|
| EASY | 3 | 4 letters |
| MEDIUM | 4 | 4 letters |
| HARD | 5 | 5 letters |
