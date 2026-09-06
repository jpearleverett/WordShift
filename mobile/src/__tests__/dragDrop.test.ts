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

import { estimateSlotIndex, findClosestValidSlot, computeBoardScale } from '../services/slotEstimation';

describe('estimateSlotIndex', () => {
  // With a 400px screen width:
  // ROW_HORIZONTAL_MARGIN=12, ROW_PADDING=8 → rowInnerW = 400-24-16 = 360
  // Standard tiles (wordLength < 6): 52px + 2×3 margin = 58px per letter cell
  // Arc slot: 14 + 2×(-1) = 12px effective width
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

  it.each([320, 360, 390, 400, 768])('fits independently measured row footprints at width %i', width => {
    for (const base of [4, 5, 6]) {
      const widest = base + 1;
      // Rendered tree: 18dp slot + two 2dp outer margins - two 1dp arc margins.
      const rendered = (widest + 1) * (18 + 4 - 2) + widest * (widest >= 6 ? 42 + 4 - 6 : 52 + 6 - 6);
      expect(rendered * computeBoardScale(width, base)).toBeLessThanOrEqual(width - 40 + 0.00001);
    }
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
    const centers = [20, 80, 140, 200, 260, 320, 380].map(center => 200 + (center - 200) * scale);
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
