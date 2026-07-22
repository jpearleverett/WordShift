/**
 * Guarded UI-haptic bridge for presentational components — the haptic sibling of
 * uiSound. `haptics.ts` statically imports expo-haptics (a native module), so a
 * shared component that imported it directly would pull that native module into
 * the Jest (Node) and web bundle graphs and break component tests that use a
 * hand-stubbed react-native. This module lazy-`require`s haptics.ts INSIDE each
 * call, so a button can add a press haptic without ever putting expo-haptics in
 * its STATIC import graph. Fully guarded: a missing module or a failed call can
 * never crash a render or a press handler. The haptic helpers self-gate on the
 * user's hapticsEnabled setting.
 */

/** Which press haptic to fire. */
export type UiHapticKind = 'selection' | 'light' | 'medium';

/** Fire a UI press haptic by role. No-op (never throws) when haptics are unavailable. */
export function playUiHaptic(kind: UiHapticKind = 'selection'): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const haptics = require('./haptics');
    switch (kind) {
      case 'light': haptics.hapticLight?.(); break;
      case 'medium': haptics.hapticMedium?.(); break;
      default: haptics.hapticSelection?.(); break;
    }
  } catch {
    // No native haptics layer in this environment — silent by design.
  }
}
