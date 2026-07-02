/**
 * Shared safe-area screen insets.
 *
 * Full-screen views used to hardcode their status-bar clearance
 * (`Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60`)
 * and nothing padded the bottom — headers sat under tall notches and bottom
 * controls hugged the home indicator / gesture nav bar. This hook wraps
 * react-native-safe-area-context and yields the SAFE BASE values only:
 * screens add their own breathing room on top (e.g. `top + 16`) and compose
 * the bottom with their pre-inset margin via `Math.max(existing, bottom)`.
 */
import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The legacy hardcoded iOS `paddingTop: 60` was 44px of status bar + 16px of
 * per-screen breathing room. 44 stays as the floor so devices reporting a
 * smaller top inset (pre-notch iPhones report 20) keep the exact old layout.
 */
export const IOS_LEGACY_TOP_BASE = 44;

export interface ScreenInsets {
  /** Status-bar-safe top base — screens add their own breathing room (+16 etc). */
  top: number;
  /** Home-indicator/nav-bar-safe bottom base — compose via Math.max(existing, bottom). */
  bottom: number;
}

/**
 * Pure core (exported for tests). Preserves the pre-inset Android numbers
 * exactly: the safe top never drops below `StatusBar.currentHeight || 24`,
 * and only grows when the reported inset is larger (edge-to-edge devices).
 */
export function computeScreenInsets(
  insets: { top: number; bottom: number },
  platform: typeof Platform.OS,
  androidStatusBarHeight: number | undefined,
): ScreenInsets {
  const top = platform === 'android'
    ? Math.max(androidStatusBarHeight || 24, insets.top)
    : Math.max(insets.top, IOS_LEGACY_TOP_BASE);
  return { top, bottom: insets.bottom };
}

export function useScreenInsets(): ScreenInsets {
  const insets = useSafeAreaInsets();
  return computeScreenInsets(insets, Platform.OS, StatusBar.currentHeight);
}
