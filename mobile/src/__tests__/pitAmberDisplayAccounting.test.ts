/**
 * Offering Pit amber display accounting (player-reported bugs).
 *
 * Two reported defects shared one root problem — the displayed totals were
 * not derived from a single exact partition of the credited amber:
 *
 *  - BUG A (Offer All): offerAllBatches credits the REAL total up front and
 *    onAmberChange echoes the final balance back through the amberBalance
 *    prop; the prop-sync effect then jumped displayBalance to the final
 *    value mid-cascade while the per-word ticks kept adding on top — the
 *    total overshot, then snapped down at settle. Fixed by guarding the
 *    prop-sync effect during the cascade (isOfferingRef), counting up from
 *    the pre-offer balance, and clamping every tick at the final balance.
 *
 *  - BUG B (tap-to-devour): each devour decremented the pending badge but
 *    the total only moved when the whole batch finalized (offerBatch is
 *    atomic per batch) — with one pending batch the total sat flat until the
 *    last word. Fixed by optimistically bumping the total per devour with
 *    the same increments, so the finalize settle lands with no jump.
 *
 * Both paths now route through the exported pure helper
 * computeDevourAmberIncrement, whose invariants these tests pin:
 * increments are non-negative, cumulatively never exceed the batch value,
 * and sum to it EXACTLY (naive per-word rounding — round(10/4)=3 four
 * times = 12 — overshoots; the partition never does).
 */

// OfferingPitScreen imports react-native + side-effectful services at module
// scope; stub them so the pure helper can be imported in the Node test env
// (component-test convention — string tags, no renderer).
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: 'Modal',
  Image: 'Image',
  StyleSheet: { create: (s: unknown) => s },
  Platform: { OS: 'ios' },
  StatusBar: { currentHeight: 24 },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  Easing: {
    in: (e: unknown) => e,
    out: (e: unknown) => e,
    inOut: (e: unknown) => e,
    quad: jest.fn(),
    cubic: jest.fn(),
    linear: jest.fn(),
    sin: jest.fn(),
  },
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Image: 'AnimatedImage',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    delay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
    loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn() }),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: 'SafeAreaProvider',
}));

jest.mock('../services/settings', () => ({
  getSettingsSync: () => ({ reducedMotion: true, soundEnabled: false, hapticsEnabled: false }),
}));
jest.mock('../services/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticHeavy: jest.fn(),
}));
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../services/deviceTier', () => ({
  getDeviceTier: () => 'high',
  shouldSimplifyAnimations: () => true,
}));
jest.mock('../services/wordHarvest', () => ({
  getHarvestState: jest.fn(async () => ({ pendingBatches: [] })),
  offerBatch: jest.fn(),
  offerAllBatches: jest.fn(),
}));
jest.mock('../services/amberCurrency', () => ({
  confirmPhaseTransition: jest.fn(),
  spendAmber: jest.fn(),
  awardBonusAmber: jest.fn(),
}));
jest.mock('../services/tending', () => ({
  loadTendingState: jest.fn(async () => ({ level: 0 })),
  getNextTendingInfo: jest.fn(),
  applyTend: jest.fn(),
  isTendingAvailable: () => false,
  getTendingIntensity: () => 0,
}));
jest.mock('../services/weeklyQuests', () => ({
  updateQuestProgress: jest.fn(),
}));
jest.mock('../components/monetization/RewardedAdButton', () => ({
  RewardedAdButton: () => null,
}));

import { computeDevourAmberIncrement } from '../components/OfferingPitScreen';
import * as fs from 'fs';
import * as path from 'path';

/** Sum the increments for devouring all `totalWords` words of a batch. */
function partition(batchValue: number, totalWords: number): number[] {
  const increments: number[] = [];
  for (let k = 1; k <= totalWords; k++) {
    increments.push(computeDevourAmberIncrement(batchValue, totalWords, k));
  }
  return increments;
}

describe('computeDevourAmberIncrement (exact partition invariants)', () => {
  // Awkward divisions on purpose — 10/4 is the classic naive-rounding
  // overshoot (round(2.5)=3 per word → 12 > 10).
  const cases: Array<[value: number, words: number]> = [
    [10, 4], [10, 3], [8, 10], [1, 7], [7, 1], [23, 5],
    [100, 7], [999, 13], [50, 6], [15, 2], [20, 20], [3, 9],
  ];

  test.each(cases)('increments for %d amber over %d words sum to EXACTLY the batch value', (value, words) => {
    const increments = partition(value, words);
    expect(increments.reduce((s, inc) => s + inc, 0)).toBe(value);
  });

  test.each(cases)('running total for %d amber over %d words never overshoots', (value, words) => {
    let cumulative = 0;
    for (const inc of partition(value, words)) {
      cumulative += inc;
      expect(cumulative).toBeLessThanOrEqual(value);
    }
    expect(cumulative).toBe(value);
  });

  test.each(cases)('every increment for %d amber over %d words is non-negative (total never ticks down)', (value, words) => {
    for (const inc of partition(value, words)) {
      expect(inc).toBeGreaterThanOrEqual(0);
    }
  });

  test('single-word batch pays out its full value on the one devour', () => {
    expect(computeDevourAmberIncrement(25, 1, 1)).toBe(25);
  });

  test('degenerate inputs contribute nothing (never corrupt the display)', () => {
    expect(computeDevourAmberIncrement(10, 0, 1)).toBe(0);   // empty batch
    expect(computeDevourAmberIncrement(0, 4, 2)).toBe(0);    // zero-value batch
    expect(computeDevourAmberIncrement(-5, 4, 2)).toBe(0);   // negative value
    expect(computeDevourAmberIncrement(10, 4, 0)).toBe(0);   // nothing devoured yet
    expect(computeDevourAmberIncrement(10, 4, -1)).toBe(0);  // nonsense count
    expect(computeDevourAmberIncrement(10, 4, 5)).toBe(0);   // stray extra devour
  });
});

describe('display accounting: both harvest paths share one honest ledger', () => {
  test('tap path: total ticks UP and pending ticks DOWN per devour, landing exactly on the credited balance', () => {
    // BUG B regression: one pending batch, devoured word by word. Each devour
    // must visibly bump the total; the batch-finalize settle (base + value)
    // must land with no jump.
    const base = 100;
    const batchValue = 10;
    const words = 4;

    let displayTotal = base;
    let pendingShown = batchValue;
    for (let k = 1; k <= words; k++) {
      const inc = computeDevourAmberIncrement(batchValue, words, k);
      expect(inc).toBeGreaterThan(0); // every devour visibly moves the total
      displayTotal += inc;
      pendingShown -= inc;
      expect(displayTotal).toBeLessThanOrEqual(base + batchValue); // never overshoots
      expect(pendingShown).toBeGreaterThanOrEqual(0);              // never goes negative
      // Conservation: amber only moves between the two counters.
      expect(displayTotal + pendingShown).toBe(base + batchValue);
    }
    // Finalize settles to the real credited balance — already there, no snap.
    expect(displayTotal).toBe(base + batchValue);
    expect(pendingShown).toBe(0);
  });

  test('Offer All cascade: counts up from the pre-offer balance and never exceeds the final balance', () => {
    // BUG A regression: the displayed total starts at the pre-offer balance
    // and must never exceed final = base + awarded mid-cascade (the old code
    // jumped to final via the prop sync, then added the award again on top).
    const base = 250;
    const awarded = 37;
    const flyingWords = 11;
    const finalBalance = base + awarded;

    let displayTotal = base;
    for (let i = 0; i < flyingWords; i++) {
      const inc = computeDevourAmberIncrement(awarded, flyingWords, i + 1);
      displayTotal = Math.min(displayTotal + inc, finalBalance); // the component's clamp
      expect(displayTotal).toBeLessThanOrEqual(finalBalance);
    }
    expect(displayTotal).toBe(finalBalance); // settle is a no-op, not a snap-down
  });
});

describe('accounting regression tripwires', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'components', 'OfferingPitScreen.tsx'),
    'utf8',
  );

  test('naive per-word rounding (the overshooting math) stays gone', () => {
    expect(src).not.toMatch(/Math\.round\(batch\.amberValue\s*\/\s*batch\.words\.length\)/);
  });

  test('both harvest paths route through the shared partition helper', () => {
    // 1 definition + tap path + Offer All cascade.
    const calls = src.match(/computeDevourAmberIncrement\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  test('the amberBalance prop-sync effect yields to the Offer All cascade', () => {
    // The mid-cascade prop echo (already-credited final balance) must not
    // clobber the counting display — the guard is the Bug A fix.
    expect(src).toMatch(/if \(isOfferingRef\.current\) return;\s*\n\s*setDisplayBalance\(amberBalance\);/);
  });
});
