/**
 * Pure-helper tests for components/ui/RewardReveal.
 *
 * Only the exported tick/stagger math is exercised here (no renderer). The
 * react-native module is stubbed to the pieces RewardReveal touches at module
 * eval (StyleSheet.create) so importing the module is Node-safe; the Animated
 * component paths are never invoked.
 */
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Animated: {
    View: 'Animated.View',
    Image: 'Animated.Image',
    Text: 'Animated.Text',
  },
  Easing: { out: (x: unknown) => x, inOut: (x: unknown) => x, cubic: 0, quad: 0, sin: 0 },
  StyleSheet: { create: (s: unknown) => s, absoluteFillObject: {} },
  Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios },
  PixelRatio: { get: () => 2 },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
}));

import {
  countUpDisplayValue,
  getCountUpDurationMs,
  getCascadeDelayMs,
  getGroupedCascadeDelayMs,
} from '../components/ui/RewardReveal';

describe('countUpDisplayValue', () => {
  test('maps 0 -> start and 1 -> target', () => {
    expect(countUpDisplayValue(0, 200)).toBe(0);
    expect(countUpDisplayValue(1, 200)).toBe(200);
  });

  test('clamps out-of-range fractions', () => {
    expect(countUpDisplayValue(-0.5, 200)).toBe(0);
    expect(countUpDisplayValue(1.5, 200)).toBe(200);
  });

  test('rounds the interpolated midpoint', () => {
    expect(countUpDisplayValue(0.5, 200)).toBe(100);
    expect(countUpDisplayValue(0.5, 5)).toBe(3); // round(2.5) === 3
  });

  test('honors a nonzero start value', () => {
    expect(countUpDisplayValue(0, 10, 4)).toBe(4);
    expect(countUpDisplayValue(1, 10, 4)).toBe(10);
    expect(countUpDisplayValue(0.5, 10, 4)).toBe(7);
  });

  test('is monotonic non-decreasing across progress and lands exactly on target', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 10; i++) {
      const v = countUpDisplayValue(i / 10, 37);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(countUpDisplayValue(1, 37)).toBe(37);
  });
});

describe('getCountUpDurationMs', () => {
  test('a trivial target skips the count-up (0ms)', () => {
    expect(getCountUpDurationMs(0, 0)).toBe(0);
    expect(getCountUpDurationMs(1, 0)).toBe(0);
  });

  test('floors and caps the duration', () => {
    expect(getCountUpDurationMs(2, 0)).toBeGreaterThanOrEqual(320);
    expect(getCountUpDurationMs(100000, 0)).toBeLessThanOrEqual(1100);
    expect(getCountUpDurationMs(100000, 5)).toBeLessThanOrEqual(1300);
  });

  test('gets heavier (longer) as the phase rises', () => {
    expect(getCountUpDurationMs(500, 5)).toBeGreaterThan(getCountUpDurationMs(500, 0));
  });

  test('uses magnitude for negative targets', () => {
    expect(getCountUpDurationMs(-50, 0)).toBe(getCountUpDurationMs(50, 0));
  });
});

describe('getCascadeDelayMs', () => {
  test('index 0 returns the base delay', () => {
    expect(getCascadeDelayMs(0)).toBe(0);
    expect(getCascadeDelayMs(0, { baseMs: 100 })).toBe(100);
    expect(getCascadeDelayMs(-3, { baseMs: 100 })).toBe(100);
  });

  test('staggers linearly under the cap', () => {
    expect(getCascadeDelayMs(3, { staggerMs: 50 })).toBe(150);
    expect(getCascadeDelayMs(3, { staggerMs: 50, baseMs: 80 })).toBe(230);
  });

  test('snaps a long list to a single capped max delay', () => {
    const cap = getCascadeDelayMs(10, { staggerMs: 50, maxStaggered: 10 });
    expect(getCascadeDelayMs(50, { staggerMs: 50, maxStaggered: 10 })).toBe(cap);
    expect(getCascadeDelayMs(999, { staggerMs: 50, maxStaggered: 10 })).toBe(cap);
  });

  test('defaults to the shared SURFACE stagger interval', () => {
    expect(getCascadeDelayMs(2)).toBe(2 * 50);
  });
});

describe('getGroupedCascadeDelayMs', () => {
  test('the first chip of the first group has no delay beyond the base', () => {
    expect(getGroupedCascadeDelayMs(0, 0)).toBe(0);
    expect(getGroupedCascadeDelayMs(0, 0, { baseMs: 120 })).toBe(120);
  });

  test('the in-group stagger is never capped (this is what animates every chip)', () => {
    expect(getGroupedCascadeDelayMs(0, 17, { staggerMs: 28 })).toBe(476);
    expect(getGroupedCascadeDelayMs(0, 200, { staggerMs: 28 })).toBe(200 * 28);
    expect(getGroupedCascadeDelayMs(0, 200, { staggerMs: 28 }))
      .toBeGreaterThan(getGroupedCascadeDelayMs(0, 17, { staggerMs: 28 }));
  });

  test('the group base IS capped so a deep group never sits blank waiting', () => {
    const opts = { groupStaggerMs: 70, maxStaggeredGroups: 2 };
    expect(getGroupedCascadeDelayMs(2, 0, opts)).toBe(140);
    expect(getGroupedCascadeDelayMs(9, 0, opts)).toBe(140);
    expect(getGroupedCascadeDelayMs(99, 0, opts)).toBe(140);
  });

  test('the per-chip delay stays bounded by the GROUP size, not the list size', () => {
    const worst = getGroupedCascadeDelayMs(999, 17, {
      staggerMs: 28,
      groupStaggerMs: 70,
      maxStaggeredGroups: 2,
      baseMs: 120,
    });
    expect(worst).toBe(120 + 140 + 476);
  });

  test('a negative index clamps to the group base', () => {
    expect(getGroupedCascadeDelayMs(1, -4, { groupStaggerMs: 70, baseMs: 120 })).toBe(190);
  });

  test('defaults to the shared SURFACE stagger for the in-group step', () => {
    expect(getGroupedCascadeDelayMs(0, 2)).toBe(2 * 50);
  });
});
