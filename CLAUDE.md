# Documentation for Expo SDK 54 with react-native-reanimated, skia, and worklets

For Expo SDK 54 with `react-native-reanimated`, `skia`, and `worklets`, you must use an EAS development build (`expo-dev-client`) instead of Expo Go due to a native/JS worklets mismatch.

## Working Dependency Versions
- `reanimated`: ~4.1.1
- `worklets`: 0.5.1
- `skia`: 2.2.12
- `expo-dev-client`: ~6.0.20

## Termux Workaround
To avoid issues, set the following environment variable:

```bash
EAS_SKIP_AUTO_FINGERPRINT=1
```

### Commands Used
1. Install dependencies ignoring peer dependency issues:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Install dependencies with Expo, fixing any issues:
   ```bash
   npx expo install --fix
   ```
3. Start the development client:
   ```bash
   npx expo start --dev-client --clear
   ```