# WordShift Mobile (Expo SDK 54)

React Native version of WordShift for Android/iOS using Expo Go.

## Prerequisites

- Node.js 18+ (install via `pkg install nodejs` in Termux)
- Expo Go app installed on your phone
- Phone and dev machine on same WiFi network

## Quick Start

### In Termux on Android:

```bash
# Navigate to this folder
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

### On your phone:

1. Open Expo Go app
2. Scan the QR code shown in Termux
3. The app will load and hot-reload as you make changes

## Project Structure

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
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## Troubleshooting

### "Unable to resolve module"
Run `npm install` to ensure all dependencies are installed.

### QR code won't scan
Make sure your phone and computer are on the same WiFi network.

### Slow performance in Termux
This is normal for first load. Subsequent reloads are faster.

## Building for Production

```bash
# Create development build
npx expo prebuild

# Or use EAS Build (requires Expo account)
npx eas build --platform android
```
