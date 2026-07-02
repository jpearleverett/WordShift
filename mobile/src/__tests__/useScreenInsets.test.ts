/**
 * Safe-area screen insets contract (useScreenInsets).
 *
 * Screens used to hardcode their status-bar clearance
 * (`Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60`)
 * and never padded the bottom. The shared hook must:
 *  - preserve the legacy Android numbers EXACTLY when the reported inset is
 *    no larger than the status bar height (the normal case), only growing
 *    when the safe-area inset is bigger (edge-to-edge devices);
 *  - keep the legacy iOS 44px base (44 + per-screen 16 = the old 60) as a
 *    floor so pre-notch devices (inset 20) keep the exact old layout while
 *    notched devices grow to their real inset;
 *  - pass the bottom inset through untouched — call sites compose it via
 *    Math.max(existingBottomMargin, bottom).
 */

// Node test env — stub react-native and the safe-area context (the mocked
// hook value is what useScreenInsets composes).
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  StatusBar: { currentHeight: undefined },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: 'SafeAreaProvider',
}));

import {
  computeScreenInsets,
  useScreenInsets,
  IOS_LEGACY_TOP_BASE,
} from '../hooks/useScreenInsets';

describe('computeScreenInsets — Android', () => {
  test('preserves the legacy status bar base exactly when insets match it', () => {
    // Legacy: (StatusBar.currentHeight || 24); screens add their own +16.
    expect(computeScreenInsets({ top: 24, bottom: 0 }, 'android', 24).top).toBe(24);
    expect(computeScreenInsets({ top: 0, bottom: 0 }, 'android', 30).top).toBe(30);
  });

  test('falls back to 24 when StatusBar.currentHeight is unavailable', () => {
    expect(computeScreenInsets({ top: 0, bottom: 0 }, 'android', undefined).top).toBe(24);
    expect(computeScreenInsets({ top: 0, bottom: 0 }, 'android', 0).top).toBe(24);
  });

  test('grows to the reported inset on edge-to-edge devices', () => {
    expect(computeScreenInsets({ top: 36, bottom: 0 }, 'android', 30).top).toBe(36);
  });
});

describe('computeScreenInsets — iOS', () => {
  test('keeps the legacy 44 base (44 + 16 = old hardcoded 60) as a floor', () => {
    // Pre-notch devices report a 20px top inset — legacy layout preserved.
    expect(computeScreenInsets({ top: 20, bottom: 0 }, 'ios', undefined).top).toBe(IOS_LEGACY_TOP_BASE);
    expect(computeScreenInsets({ top: 0, bottom: 0 }, 'ios', undefined).top).toBe(IOS_LEGACY_TOP_BASE);
  });

  test('grows to the real inset on notched devices', () => {
    expect(computeScreenInsets({ top: 59, bottom: 34 }, 'ios', undefined).top).toBe(59);
  });
});

describe('computeScreenInsets — bottom', () => {
  test('passes the bottom inset through untouched (call sites Math.max it)', () => {
    expect(computeScreenInsets({ top: 0, bottom: 0 }, 'ios', undefined).bottom).toBe(0);
    expect(computeScreenInsets({ top: 59, bottom: 34 }, 'ios', undefined).bottom).toBe(34);
    expect(computeScreenInsets({ top: 24, bottom: 48 }, 'android', 24).bottom).toBe(48);
  });
});

describe('useScreenInsets', () => {
  test('composes useSafeAreaInsets with the platform status bar values', () => {
    // Mocked: iOS, insets { top: 59, bottom: 34 } — no React state involved,
    // so the hook is directly callable here.
    expect(useScreenInsets()).toEqual({ top: 59, bottom: 34 });
  });
});
