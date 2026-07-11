/**
 * React Native Web does not expose the live native module getters patched on
 * Android/iOS. Font.loadAsync plus explicit fontFamily styles cover web safely.
 */
export function installGlobalFont(_fontFamily: string): void {
  // Intentionally empty.
}
