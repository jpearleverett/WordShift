/**
 * Tests for drag-and-drop slot estimation logic.
 *
 * These pure-function tests verify that `estimateSlotIndex` maps a screen-space
 * X coordinate to the correct arc-layout slot index, and that `findClosestValidSlot`
 * searches outward from a target with left bias.
 */

jest.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
  },
}));

import { estimateSlotIndex, findClosestValidSlot, computeBoardScale, getBoardScaleWrapperStyle } from '../services/slotEstimation';

describe('estimateSlotIndex', () => {
  // With a 400px screen width:
  // ROW_HORIZONTAL_MARGIN=4, ROW_PADDING=4 → rowInnerW = 400-8-8 = 384
  // Standard tiles (wordLength < 6): 52px + 2×3 margin = 58px per letter cell
  // Arc slot cell: 18 + 2×2 outer - 2×1 arc margin = 20px (16px on compact rows)
  // Arc letter wrapper margin: -3 each side = -6 per letter

  it('returns slot 0 for far-left drop', () => {
    // 4-letter word → 5 slots
    const result = estimateSlotIndex(0, 5, 4);
    expect(result).toBe(0);
  });

  it('returns last slot for far-right drop', () => {
    // 4-letter word → 5 slots
    const result = estimateSlotIndex(400, 5, 4);
    expect(result).toBe(4);
  });

  it('returns a middle slot for center-screen drop', () => {
    // 4-letter word → 5 slots; center of screen = 200
    const result = estimateSlotIndex(200, 5, 4);
    // Should be slot 2 (center of 5 slots)
    expect(result).toBe(2);
  });

  it('handles compact mode (wordLength >= 6) correctly', () => {
    // 6-letter word → 7 slots, compact tiles (42px)
    const farLeft = estimateSlotIndex(0, 7, 6);
    const farRight = estimateSlotIndex(400, 7, 6);
    expect(farLeft).toBe(0);
    expect(farRight).toBe(6);
  });

  it('handles 3-letter word (4 slots)', () => {
    const center = estimateSlotIndex(200, 4, 3);
    // Should pick one of the center slots (1 or 2)
    expect(center).toBeGreaterThanOrEqual(1);
    expect(center).toBeLessThanOrEqual(2);
  });

  it('handles 5-letter word (6 slots)', () => {
    const farLeft = estimateSlotIndex(0, 6, 5);
    const farRight = estimateSlotIndex(400, 6, 5);
    expect(farLeft).toBe(0);
    expect(farRight).toBe(5);
  });

  it('returns valid index for 7-letter word (8 slots, compact)', () => {
    const center = estimateSlotIndex(200, 8, 7);
    expect(center).toBeGreaterThanOrEqual(0);
    expect(center).toBeLessThanOrEqual(7);
  });

  it('returns 0 for a single-slot scenario', () => {
    // Edge case: 0-letter word → 1 slot
    const result = estimateSlotIndex(200, 1, 0);
    expect(result).toBe(0);
  });

  describe('board scale (F139/F140)', () => {
    it('scale=1 (explicit) matches the default no-scale result exactly', () => {
      for (const [x, slots, wl] of [[0, 5, 4], [200, 5, 4], [400, 5, 4], [123, 6, 5], [400, 8, 7]] as const) {
        expect(estimateSlotIndex(x, slots, wl, undefined, 1)).toBe(estimateSlotIndex(x, slots, wl));
      }
    });

    it('still maps ends and center correctly when the board is scaled down', () => {
      const scale = 0.8;
      expect(estimateSlotIndex(0, 6, 5, undefined, scale)).toBe(0); // far left -> first slot
      expect(estimateSlotIndex(400, 6, 5, undefined, scale)).toBe(5); // far right -> last slot
      expect(estimateSlotIndex(200, 6, 5, undefined, scale)).toBeGreaterThanOrEqual(2);
      expect(estimateSlotIndex(200, 6, 5, undefined, scale)).toBeLessThanOrEqual(3);
    });

    it('rightward drops resolve to non-decreasing slot indices at a scaled width', () => {
      const scale = 0.75;
      let prev = -1;
      for (let x = 0; x <= 400; x += 20) {
        const slot = estimateSlotIndex(x, 6, 5, undefined, scale);
        expect(slot).toBeGreaterThanOrEqual(prev);
        prev = slot;
      }
    });
  });
});

describe('computeBoardScale', () => {
  it('leaves phones at exactly 1 when the rendered widest row actually fits', () => {
    // The 5-letter transient row occupies 380dp including slotOuter margins.
    expect(computeBoardScale(430, 4)).toBe(1);
    expect(computeBoardScale(441, 4)).toBe(1);
  });

  it.each([320, 360, 390, 400, 768])('fits every rendered row state at width %i', width => {
    for (const base of [4, 5, 6]) {
      for (const doubleShift of [false, true]) {
        const scale = computeBoardScale(width, base, doubleShift);
        // Measured from Row's actual live-length compact rule: the fan exists
        // before insertion (and after drop one for Double Shift). Completed
        // rows have no slots. gameArea adds 8dp each side, row adds 4+4 each.
        for (const liveLength of doubleShift ? [base, base + 1] : [base]) {
          const compact = liveLength >= 6;
          const slotCell = compact ? 14 + 4 - 2 : 18 + 4 - 2;
          const letterCell = compact ? 42 + 2 - 6 : 52 + 6 - 6;
          const fanWidth = (liveLength + 1) * slotCell + liveLength * letterCell;
          expect(fanWidth * scale).toBeLessThanOrEqual(width - 32 + 0.00001);
        }
        const finalLength = base + (doubleShift ? 2 : 1);
        const plainWidth = finalLength * (finalLength >= 6 ? 42 + 2 : 52 + 6);
        expect(plainWidth * scale).toBeLessThanOrEqual(width - 32 + 0.00001);
      }
    }
  });

  it('fits the noncompact first-row fan when EXPERT reverses back up', () => {
    const fiveLetterFan = 6 * 20 + 5 * 52;
    const scale = computeBoardScale(360, 6, false, true);
    expect(fiveLetterFan * scale).toBeLessThanOrEqual(328);
  });

  // accessibility-devices-1: the 6-letter tier (EXPERT + every Sunday daily)
  // used to scale to 0.727 on the dominant 360dp Android width, rendering
  // ~30x38dp compact tiles. The margin/padding/slot/tile-margin reclaim above
  // lifts it past 0.85 (tiles >= 36x44dp); pin the floor so a future geometry
  // change cannot quietly give it back.
  it('keeps a 6-letter board at or above 0.85 on a 360dp phone', () => {
    const s = computeBoardScale(360, 6);
    expect(s).toBeGreaterThanOrEqual(0.85);
    expect(42 * s).toBeGreaterThanOrEqual(36); // compact tile width
    expect(52 * s).toBeGreaterThanOrEqual(44); // compact tile height
  });

  it('fits the wide five-letter fan on a 360dp phone and keeps four-letter boards full size', () => {
    expect(computeBoardScale(360, 5)).toBeCloseTo(328 / 380);
    expect(computeBoardScale(360, 4)).toBeGreaterThanOrEqual(0.9);
  });

  it('scales DOWN below 1 when the widest row would overflow a narrow screen', () => {
    const s = computeBoardScale(320, 5); // 5-letter board on a 320dp phone
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('scales UP (capped) on a tablet-width screen', () => {
    const s = computeBoardScale(768, 4);
    expect(s).toBeGreaterThan(1);
    expect(s).toBeLessThanOrEqual(1.2);
  });

  it('never returns a non-positive or NaN scale for degenerate widths', () => {
    expect(computeBoardScale(0, 4)).toBe(1);
    expect(Number.isFinite(computeBoardScale(300, 5))).toBe(true);
  });
});

describe('rendered slot boundary alignment', () => {
  it.each([0.75, 1, 1.2])('uses the complete cell footprint at scale %s', scale => {
    // 6-letter compact row on a 400dp screen: 7 x 16dp slot cells + 6 x 38dp
    // letter cells = 340dp, centred at 30dp; slot 0's centre is 38 and each
    // step is one slot cell + one letter cell = 54.
    const centers = [38, 92, 146, 200, 254, 308, 362].map(center => 200 + (center - 200) * scale);
    for (let index = 0; index < centers.length - 1; index++) {
      const midpoint = (centers[index] + centers[index + 1]) / 2;
      expect(estimateSlotIndex(midpoint - 0.1, 7, 6, undefined, scale)).toBe(index);
      expect(estimateSlotIndex(midpoint + 0.1, 7, 6, undefined, scale)).toBe(index + 1);
    }
  });
});

describe('findClosestValidSlot', () => {
  const valid = (word: string) => ({ word, isValid: true });
  const invalid = (word: string) => ({ word, isValid: false });

  it('returns target index when it is valid', () => {
    const previews = [invalid('AB'), valid('AC'), invalid('AD')];
    expect(findClosestValidSlot(1, previews)).toBe(1);
  });

  it('searches left first (left bias) on equidistant valid slots', () => {
    // Target index 2, valid at indices 1 and 3 (equidistant)
    const previews = [invalid('A'), valid('B'), invalid('C'), valid('D'), invalid('E')];
    expect(findClosestValidSlot(2, previews)).toBe(1); // Left bias (default)
  });

  it('breaks ties toward the finger when preferRightOnTie is true', () => {
    // Target index 2, valid at indices 1 and 3 (equidistant). When the drop
    // landed to the right of the estimated slot's center, prefer the right slot.
    const previews = [invalid('A'), valid('B'), invalid('C'), valid('D'), invalid('E')];
    expect(findClosestValidSlot(2, previews, true)).toBe(3); // Right preferred
    expect(findClosestValidSlot(2, previews, false)).toBe(1); // Still left by default
  });

  it('finds the nearest valid slot to the right when left is invalid', () => {
    const previews = [invalid('A'), invalid('B'), invalid('C'), valid('D')];
    expect(findClosestValidSlot(1, previews)).toBe(3);
  });

  it('finds the nearest valid slot to the left when right is invalid', () => {
    const previews = [valid('A'), invalid('B'), invalid('C'), invalid('D')];
    expect(findClosestValidSlot(2, previews)).toBe(0);
  });

  it('returns null when no valid slots exist', () => {
    const previews = [invalid('A'), invalid('B'), invalid('C')];
    expect(findClosestValidSlot(1, previews)).toBeNull();
  });

  it('returns the only valid slot regardless of distance', () => {
    const previews = [invalid('A'), invalid('B'), invalid('C'), invalid('D'), valid('E')];
    expect(findClosestValidSlot(0, previews)).toBe(4);
  });

  it('handles single-element array', () => {
    expect(findClosestValidSlot(0, [valid('A')])).toBe(0);
    expect(findClosestValidSlot(0, [invalid('A')])).toBeNull();
  });

  it('handles target at boundaries', () => {
    const previews = [invalid('A'), valid('B'), invalid('C'), invalid('D'), valid('E')];
    // Target at 0 → nearest valid is index 1
    expect(findClosestValidSlot(0, previews)).toBe(1);
    // Target at 4 → direct hit (valid)
    expect(findClosestValidSlot(4, previews)).toBe(4);
    // Target at 3 → equidistant to 1 and 4, left bias → searches left first but 2 is invalid, then right → 4
    // Actually offset=1: left=2 (invalid), right=4 (valid) → 4
    expect(findClosestValidSlot(3, previews)).toBe(4);
  });
});

describe('getBoardScaleWrapperStyle', () => {
  it('is layout-transparent at scale 1 and a bare shrink below it', () => {
    expect(getBoardScaleWrapperStyle(1, 500)).toBeUndefined();
    expect(getBoardScaleWrapperStyle(0.87, 500)).toEqual({ transform: [{ scale: 0.87 }] });
  });

  it('lays a tablet enlargement out narrower so the scaled rows span exactly the board area', () => {
    const scale = computeBoardScale(720, 4);
    expect(scale).toBeGreaterThan(1);
    const style = getBoardScaleWrapperStyle(scale, 600)!;
    const pct = parseFloat(String(style.width));
    // (board area x pct%) x scale == board area: nothing leaves the screen.
    expect((pct / 100) * scale).toBeCloseTo(1);
    expect(style.alignSelf).toBe('center');
    expect(style.transform).toEqual([{ scale }]);
  });

  it('reserves exactly the height the enlargement adds, split above and below', () => {
    const style = getBoardScaleWrapperStyle(1.2, 500)!;
    expect(style.marginVertical).toBeCloseTo(50);
    // Before the first layout the margin is simply 0, never NaN.
    expect(getBoardScaleWrapperStyle(1.2, 0)!.marginVertical).toBe(0);
  });
});
