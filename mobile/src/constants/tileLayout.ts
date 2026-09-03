/**
 * Shared arc-layout geometry — the single source of truth for tile/slot sizing.
 *
 * Both the rendering components (Row.tsx, LetterTile.tsx) and the drag-drop slot
 * math (services/slotEstimation.ts) import these. Keeping them in one neutral
 * module (no React/RN imports) prevents the slot estimation from silently
 * drifting out of sync with the rendered layout, and avoids a service→component
 * dependency.
 */

// Row container spacing
export const ROW_HORIZONTAL_MARGIN = 12;
export const ROW_PADDING = 8;

// Arc slot width (narrow slots keep letters close together)
export const SLOT_WIDTH = 14;

// The arc layout always renders slots with the compact style, whose width is
// slightly wider than SLOT_WIDTH for trapezoid visibility (Row.tsx `slotCompact`).
// Drag-drop slot math MUST use this rendered width — not the bare SLOT_WIDTH — or
// the estimated slot centers drift a few px each and compound left-to-right,
// causing long-word drops to resolve to the neighbouring slot.
export const ARC_SLOT_RENDERED_WIDTH = SLOT_WIDTH + 4;

// Arc wrapper margins (negative = elements nestle together)
export const ARC_LETTER_MARGIN_H = -3; // arcLetterWrapper marginHorizontal
export const ARC_SLOT_MARGIN_H = -1; // arcSlotWrapper marginHorizontal

// Row.tsx wraps every arc slot in a `slotOuter` View that carries its OWN
// horizontal margin, INSIDE the arcSlotWrapper. That term was never accounted
// for anywhere: the geometry consumers all reconstructed the cell as
// ARC_SLOT_RENDERED_WIDTH + ARC_SLOT_MARGIN_H * 2 = 16dp while the tree
// actually renders 18 + 2*2 - 1*2 = 20dp. The 4dp shortfall compounds slot by
// slot outward from the row centre (+/-12dp at the ends of a 6-letter row), so
// the swelling drop slot was not always the one under the finger and the fan
// collapse ended on a visible snap. One constant now carries the whole cell so
// there is nothing left to forget.
export const ARC_SLOT_OUTER_MARGIN_H = 2; // Row.tsx `slotOuter` marginHorizontal
export const ARC_SLOT_CELL_W =
  ARC_SLOT_RENDERED_WIDTH + (ARC_SLOT_OUTER_MARGIN_H + ARC_SLOT_MARGIN_H) * 2;

// Tile horizontal footprint (standard vs compact for 6+ letter words)
export const STANDARD_TILE_W = 52;
export const STANDARD_TILE_MARGIN_H = 3;
export const COMPACT_TILE_W = 42;
export const COMPACT_TILE_MARGIN_H = 2;

// ─── Arc <-> standard letter positions ───────────────────────────────────────
// The target row lays its letters out INTERLEAVED with drop slots
// ([slot][letter][slot]...[slot]); every other row lays them out as a plain
// centred run. The slots occupy real width, so the same letters sit noticeably
// further apart in the arc. Without these, the swap between the two layouts is
// a hard flexbox re-centre — the letters teleport inward the instant the slots
// unmount. Row.tsx uses the delta to glide them instead.
//
// Both return a letter's centre X measured from the row content's CENTRE, so
// the row's own centring cancels and the caller needs no screen width. The
// board scale (computeBoardScale) is a uniform transform on an ancestor, so it
// scales these offsets along with everything else — no adjustment needed.

function tileFootprint(compact: boolean): number {
  return compact
    ? COMPACT_TILE_W + COMPACT_TILE_MARGIN_H * 2
    : STANDARD_TILE_W + STANDARD_TILE_MARGIN_H * 2;
}

/** Arc (interleaved) layout: centre offset of letter `index` of `letterCount`. */
export function arcLetterCenterOffset(
  index: number,
  letterCount: number,
  compact: boolean,
): number {
  const letterW = tileFootprint(compact) + ARC_LETTER_MARGIN_H * 2;
  const slotW = ARC_SLOT_CELL_W;
  const total = (letterCount + 1) * slotW + letterCount * letterW;
  const center = (index + 1) * slotW + index * letterW + letterW / 2;
  return center - total / 2;
}

/** Standard (plain run) layout: centre offset of letter `index` of `letterCount`. */
export function standardLetterCenterOffset(
  index: number,
  letterCount: number,
  compact: boolean,
): number {
  const letterW = tileFootprint(compact);
  const total = letterCount * letterW;
  return index * letterW + letterW / 2 - total / 2;
}
