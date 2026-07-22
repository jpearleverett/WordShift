import { getBulkOfferTiming } from '../services/pitOfferTiming';

const WORD_COUNTS = [1, 3, 20, 200];
const PHASES = [0, 1, 2, 3, 4, 5];

describe('getBulkOfferTiming', () => {
  test.each(PHASES.flatMap(phase => WORD_COUNTS.map(wordCount => [wordCount, phase] as const)))(
    'keeps %d offered words in phase %d within one second',
    (wordCount, phase) => {
      const timing = getBulkOfferTiming(wordCount, phase, false);

      // Brisk cap for ≤20 words; big harvests may stretch to ~1600ms so they
      // read bigger (per-word stagger stays capped — nothing lands slower).
      const cap = wordCount > 20 ? 1600 : 1000;
      expect(timing.staggerMs).toBeGreaterThanOrEqual(0);
      expect(timing.staggerMs).toBeLessThanOrEqual(80);
      expect(timing.wordDurationMs).toBeGreaterThanOrEqual(0);
      expect(timing.cascadeDurationMs).toBeGreaterThanOrEqual(0);
      expect(timing.cascadeDurationMs).toBeLessThanOrEqual(cap);
      expect(timing.cascadeDurationMs).toBeGreaterThanOrEqual(
        (wordCount - 1) * timing.staggerMs + timing.wordDurationMs,
      );
      expect(timing.cascadeDurationMs).toBe(
        (wordCount - 1) * timing.staggerMs + timing.wordDurationMs + 100,
      );
    },
  );

  test.each(PHASES)('returns immediate timing with reduced motion in phase %d', (phase) => {
    expect(getBulkOfferTiming(20, phase, true)).toEqual({
      staggerMs: 0,
      wordDurationMs: 0,
      cascadeDurationMs: 0,
    });
  });

  test.each(PHASES)('returns immediate timing for an empty offering in phase %d', (phase) => {
    expect(getBulkOfferTiming(0, phase, false)).toEqual({
      staggerMs: 0,
      wordDurationMs: 0,
      cascadeDurationMs: 0,
    });
  });

  test('does not slow down as the offering grows', () => {
    for (const phase of PHASES) {
      const small = getBulkOfferTiming(3, phase, false);
      const large = getBulkOfferTiming(200, phase, false);

      expect(large.staggerMs).toBeLessThanOrEqual(small.staggerMs);
      expect(large.wordDurationMs).toBeLessThanOrEqual(small.wordDurationMs);
    }
  });
});
