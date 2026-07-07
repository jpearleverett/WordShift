// Lightweight expo-font stub for the Node test env. The real package ships an
// ESM build that jest cannot transform; the app only calls Font.loadAsync at
// runtime (theme/fonts.ts), never in tests, so a no-op resolve is enough.
export function loadAsync(): Promise<void> {
  return Promise.resolve();
}

export function isLoaded(): boolean {
  return true;
}
