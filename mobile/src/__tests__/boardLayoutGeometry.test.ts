/**
 * Arc <-> standard letter geometry.
 *
 * The target row lays its letters out interleaved with drop slots; every other
 * row lays them out as a plain centred run. Row.tsx animates the difference so
 * the letters visibly close ranks instead of teleporting when the slots
 * unmount. That only works if these two functions describe the SAME layout the
 * flexbox actually produces, so the invariants are pinned here (the repo has no
 * renderer in test env, and this is pure math).
 */
import fs from 'fs';
import path from 'path';
import {
  arcLetterCenterOffset,
  standardLetterCenterOffset,
  ARC_SLOT_RENDERED_WIDTH,
  ARC_SLOT_MARGIN_H,
  ARC_SLOT_OUTER_MARGIN_H,
  ARC_SLOT_CELL_W,
  ARC_LETTER_MARGIN_H,
  STANDARD_TILE_W,
  STANDARD_TILE_MARGIN_H,
  COMPACT_TILE_W,
  COMPACT_TILE_MARGIN_H,
} from '../constants/tileLayout';

const COUNTS = [3, 4, 5, 6, 7];

describe('letter centre offsets', () => {
  for (const compact of [false, true]) {
    const label = compact ? 'compact' : 'standard';

    it(`${label}: both layouts are symmetric about the row centre`, () => {
      for (const n of COUNTS) {
        for (const fn of [arcLetterCenterOffset, standardLetterCenterOffset]) {
          const first = fn(0, n, compact);
          const last = fn(n - 1, n, compact);
          expect(first + last).toBeCloseTo(0, 6);
        }
        // An odd count puts the middle letter exactly on the axis.
        if (n % 2 === 1) {
          expect(arcLetterCenterOffset((n - 1) / 2, n, compact)).toBeCloseTo(0, 6);
          expect(standardLetterCenterOffset((n - 1) / 2, n, compact)).toBeCloseTo(0, 6);
        }
      }
    });

    it(`${label}: spacing matches the rendered cell footprints`, () => {
      const tileW = compact
        ? COMPACT_TILE_W + COMPACT_TILE_MARGIN_H * 2
        : STANDARD_TILE_W + STANDARD_TILE_MARGIN_H * 2;
      // The slot cell is ARC_SLOT_CELL_W, not the bare rendered width plus the
      // wrapper margin: Row nests a `slotOuter` View with its own margin inside
      // the arcSlotWrapper, and this test used to recompute the step WITHOUT it
      // (16dp against a rendered 20dp), so it pinned the drift rather than
      // catching it.
      const arcStep = tileW + ARC_LETTER_MARGIN_H * 2 + ARC_SLOT_CELL_W;
      for (const n of COUNTS) {
        for (let i = 1; i < n; i++) {
          // Consecutive arc letters are one letter cell + one slot cell apart.
          expect(arcLetterCenterOffset(i, n, compact) - arcLetterCenterOffset(i - 1, n, compact))
            .toBeCloseTo(arcStep, 6);
          // Consecutive standard letters are one letter cell apart.
          expect(standardLetterCenterOffset(i, n, compact) - standardLetterCenterOffset(i - 1, n, compact))
            .toBeCloseTo(tileW, 6);
        }
      }
    });

    it(`${label}: the arc is strictly wider, so ranks always CLOSE on collapse`, () => {
      // The glide direction matters: letters must move toward the axis, never
      // away from it, or the collapse would read as the row bursting apart.
      for (const n of COUNTS) {
        for (let i = 0; i < n; i++) {
          const arc = arcLetterCenterOffset(i, n, compact);
          const std = standardLetterCenterOffset(i, n, compact);
          expect(Math.abs(std)).toBeLessThanOrEqual(Math.abs(arc) + 1e-9);
          // Same side of the axis (no letter crosses over during the glide).
          if (Math.abs(arc) > 1e-9) expect(Math.sign(std) * Math.sign(arc)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  }

  it('a committed move shifts surviving letters outward, making room for the new one', () => {
    // Arc row of 4 letters -> standard row of 5 (a letter landed). Each
    // surviving letter's seeded offset is arc(old) - standard(new); the row
    // must end up WIDER than the arc row it came from at the edges.
    const before = 4;
    const after = 5;
    for (let oldIdx = 0; oldIdx < before; oldIdx++) {
      // Insertion at the end keeps indices; the seed must be finite and small
      // enough to read as a settle rather than a jump across the board.
      const seed = arcLetterCenterOffset(oldIdx, before, false) - standardLetterCenterOffset(oldIdx, after, false);
      expect(Number.isFinite(seed)).toBe(true);
      expect(Math.abs(seed)).toBeLessThan(STANDARD_TILE_W * 3);
    }
  });
});

// ---------------------------------------------------------------------------
// The arc slot cell must equal what Row.tsx actually renders.
//
// The drift this guards was invisible for exactly one reason: every consumer
// reconstructed the cell from the same two constants and nobody checked them
// against the tree. `slotOuter`'s own margin is a third term, and it is the one
// that went missing. Read it back out of the stylesheet source so a future edit
// to Row's slot chrome fails here instead of silently moving every slot centre.
// ---------------------------------------------------------------------------
describe('arc slot cell matches Row.tsx', () => {
  const ROW_SRC = fs.readFileSync(
    path.resolve(__dirname, '../components/Row.tsx'),
    'utf8',
  );

  /** Pull `marginHorizontal` out of a named StyleSheet entry (literal or the constant). */
  function styleMarginH(styleName: string, constantName: string): number | string {
    const block = new RegExp(`${styleName}:\\s*\\{([^}]*)\\}`).exec(ROW_SRC);
    expect(block).not.toBeNull();
    const margin = /marginHorizontal:\s*([A-Za-z_0-9-]+)/.exec(block![1]);
    expect(margin).not.toBeNull();
    const raw = margin![1];
    if (raw === constantName) return constantName;
    return Number(raw);
  }

  it('slotOuter carries the margin ARC_SLOT_OUTER_MARGIN_H names', () => {
    const rendered = styleMarginH('slotOuter', 'ARC_SLOT_OUTER_MARGIN_H');
    if (typeof rendered === 'number') {
      expect(rendered).toBe(ARC_SLOT_OUTER_MARGIN_H);
    } else {
      expect(rendered).toBe('ARC_SLOT_OUTER_MARGIN_H');
    }
  });

  it('slotCompact renders ARC_SLOT_RENDERED_WIDTH', () => {
    expect(ROW_SRC).toMatch(/slotCompact:\s*\{[^}]*width:\s*ARC_SLOT_RENDERED_WIDTH/);
  });

  it('the cell constant sums all THREE terms (18 + 2*2 - 1*2 = 20)', () => {
    expect(ARC_SLOT_CELL_W).toBe(
      ARC_SLOT_RENDERED_WIDTH + ARC_SLOT_OUTER_MARGIN_H * 2 + ARC_SLOT_MARGIN_H * 2,
    );
    expect(ARC_SLOT_CELL_W).toBe(20);
    // The value the consumers used to compute, which is what regressed.
    expect(ARC_SLOT_CELL_W).not.toBe(ARC_SLOT_RENDERED_WIDTH + ARC_SLOT_MARGIN_H * 2);
  });
});
