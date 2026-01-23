# WordShift

A word puzzle game where you shift letters between words to transform them into new words.

## Game Overview

Pick a letter from the current word, drop it into the next word to form a valid English word, and progress through the puzzle chain. Each level presents a unique challenge with carefully crafted puzzles that avoid boring transformations.

## Mobile App (Expo)

The game is built as a React Native app using Expo SDK 54.

### Prerequisites

- Node.js 18+
- Expo Go app on your phone
- Phone and dev machine on same WiFi network

### Quick Start

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with Expo Go on your device.

### Project Structure

```
mobile/
├── App.tsx                 # Main app component
├── src/
│   ├── types.ts           # TypeScript interfaces
│   ├── constants.ts       # Word lists and fallbacks
│   ├── dictionary.ts      # 8000+ word dictionary
│   ├── components/
│   │   ├── Row.tsx        # Game row component
│   │   └── LetterTile.tsx # Individual letter tile
│   └── services/
│       └── localGenerator.ts  # Puzzle generation algorithm
├── assets/                # App icons and splash
├── app.json              # Expo configuration
└── package.json          # Dependencies
```

## Puzzle Generation

The puzzle generator creates engaging word chains with:

- **Anti-boring detection**: Heavily penalizes obvious suffix transforms (S, ED, ER, ING, LY)
- **Middle-position preference**: Favors letter moves to/from middle of words
- **Surprise scoring**: Rewards unexpected letter placements
- **Semantic journey**: Bonus for puzzles traversing multiple word categories
- **Quality threshold**: Only accepts puzzles scoring above minimum engagement level

## Dictionary

The game uses `dictionary.txt` containing 20,855 valid English words for puzzle generation and word validation.
