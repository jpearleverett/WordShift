/**
 * Slot position estimation for drag-and-drop letter placement.
 *
 * Mirrors the arc layout geometry from Row.tsx to convert a raw
 * screen-space X coordinate into the closest slot index.
 */
import { Dimensions } from 'react-native';
// Single source of truth: the arc geometry lives in a neutral constants module
// shared with Row.tsx/LetterTile.tsx, so the drag-drop slot math can never
// silently drift from the rendered layout.
import {
  ROW_HORIZONTAL_MARGIN,
  ROW_PADDING,
  ARC_SLOT_RENDERED_WIDTH,
  ARC_SLOT_MARGIN_H,
  ARC_LETTER_MARGIN_H,
  STANDARD_TILE_W,
  STANDARD_TILE_MARGIN_H,
  COMPACT_TILE_W,
  COMPACT_TILE_MARGIN_H,
} from '../constants/tileLayout';

// Compact threshold: target rows with wordLength >= 6 use compact tiles (Row.tsx)
const COMPACT_THRESHOLD = 6;

// Board scale-to-fit (F139/F140). Below this device width the fixed arc geometry
// can overflow a narrow screen (a 5-letter row's content is ~356px, wider than a
// 360dp screen's ~320px inner width), clipping the outer slots/previews. At/above
// the tablet width the fixed board is marooned in a small central column. A
// single uniform board scale, applied to the render AND fed back into the slot
// math here, keeps drag drops aligned with what the player sees.
const TABLET_MIN_WIDTH = 600;
const TABLET_MAX_SCALE = 1.2;

interface SlotPreview {
  word: string;
  isValid: boolean;
}

/**
 * Natural (unscaled) horizontal width of a row's arc content for `letterCount`
 * letters. Shared by the slot math and the board-scale computation so they can
 * never drift. `letterCount` letters render `letterCount + 1` slots.
 */
function naturalContentWidth(letterCount: number): number {
  const compact = letterCount >= COMPACT_THRESHOLD;
  const tileW = compact ? COMPACT_TILE_W : STANDARD_TILE_W;
  const tileMarginH = compact ? COMPACT_TILE_MARGIN_H : STANDARD_TILE_MARGIN_H;
  const letterCellW = tileW + tileMarginH * 2 + ARC_LETTER_MARGIN_H * 2;
  const slotEffectiveW = ARC_SLOT_RENDERED_WIDTH + ARC_SLOT_MARGIN_H * 2;
  const slotCount = letterCount + 1;
  return slotCount * slotEffectiveW + letterCount * letterCellW;
}

/**
 * The uniform board scale for a device width and the board's base word length.
 * A standard move grows the target row by one letter, so the widest state a row
 * reaches is `baseWordLength + 1` letters; the scale is derived from that so no
 * transient row ever overflows.
 *
 *  - Narrow screens where the widest row would overflow: scale < 1 (fit down).
 *  - Tablets/large aspect: a modest scale up (capped) so the board uses the room.
 *  - Ordinary phones where it already fits: exactly 1 (byte-identical rendering
 *    and drag math, so the common case is never perturbed).
 */
export function computeBoardScale(availableWidth: number, baseWordLength: number): number {
  const widestLetters = Math.max(1, baseWordLength) + 1;
  const natural = naturalContentWidth(widestLetters);
  const rowInnerW = availableWidth - ROW_HORIZONTAL_MARGIN * 2 - ROW_PADDING * 2;
  if (natural <= 0 || rowInnerW <= 0) return 1;
  if (natural > rowInnerW) {
    return rowInnerW / natural; // fit down
  }
  if (availableWidth >= TABLET_MIN_WIDTH) {
    return Math.min(TABLET_MAX_SCALE, rowInnerW / natural); // modest scale up
  }
  return 1; // ordinary phone, already fits
}

/**
 * Estimate which slot index a drop at `dropX` (page-space) lands on.
 *
 * The arc layout alternates [slot][letter][slot]...[slot], producing
 * `letterCount + 1` slots for a word of `letterCount` letters.
 * `slotCount` equals `letterCount + 1` (same as previews.length).
 *
 * Arc transforms only affect Y and rotation — X positions are unmodified,
 * so we can compute horizontal centers without considering the arc curve.
 */
export function estimateSlotIndex(
  dropX: number,
  slotCount: number,
  targetWordLength: number,
  out?: { droppedRightOfCenter?: boolean },
  scale = 1,
): number {
  const screenWidth = Dimensions.get('window').width;

  // Determine tile sizing
  const compact = targetWordLength >= COMPACT_THRESHOLD;
  const tileW = compact ? COMPACT_TILE_W : STANDARD_TILE_W;
  const tileMarginH = compact ? COMPACT_TILE_MARGIN_H : STANDARD_TILE_MARGIN_H;

  // Each letter cell width (tile + 2 × margin), and the slot cell width (rendered
  // compact slot + 2 × arc margin). The arc always renders the compact slot style
  // (ARC_SLOT_RENDERED_WIDTH), so the estimation must match that width to avoid
  // drift compounding across slots. Both are multiplied by the board scale
  // (F139/F140): the board renders scaled around its horizontal center, and the
  // content stays centered at screenWidth/2, so scaling both cell widths here
  // makes every slot center track the rendered (scaled) layout exactly.
  const letterCellW = (tileW + tileMarginH * 2) * scale;
  const slotEffectiveW = (ARC_SLOT_RENDERED_WIDTH + ARC_SLOT_MARGIN_H * 2) * scale;
  // The inter-letter wrapper margin scales with the board too, or the walk would
  // drift a few px per letter at scale != 1.
  const letterMarginH = ARC_LETTER_MARGIN_H * scale;

  // Letter count is slotCount - 1
  const letterCount = slotCount - 1;

  // Total content width: slots + letters + letter margins
  const contentW =
    slotCount * slotEffectiveW +
    letterCount * (letterCellW + letterMarginH * 2);

  // Content starts centered in the row
  const rowInnerW = screenWidth - ROW_HORIZONTAL_MARGIN * 2 - ROW_PADDING * 2;
  const contentStartX =
    ROW_HORIZONTAL_MARGIN + ROW_PADDING + (rowInnerW - contentW) / 2;

  // Walk through the arc layout to compute each slot center
  let bestSlot = 0;
  let bestDist = Infinity;
  let bestCenter = contentStartX;
  let x = contentStartX;

  for (let i = 0; i < slotCount; i++) {
    // Slot center
    const slotCenter = x + slotEffectiveW / 2;
    const dist = Math.abs(dropX - slotCenter);
    if (dist < bestDist) {
      bestDist = dist;
      bestSlot = i;
      bestCenter = slotCenter;
    }
    x += slotEffectiveW;

    // After each slot (except the last), there's a letter
    if (i < letterCount) {
      x += letterMarginH; // left margin of letter wrapper
      x += letterCellW;
      x += letterMarginH; // right margin of letter wrapper
    }
  }

  // Report whether the drop fell to the right of the chosen slot's center, so
  // callers can break outward-search ties toward the finger (see
  // findClosestValidSlot).
  if (out) {
    out.droppedRightOfCenter = dropX >= bestCenter;
  }

  return bestSlot;
}

/**
 * Given a target slot index and the available previews, find the
 * closest valid slot — preferring the target, then searching outward.
 *
 * At each equidistant offset the search checks one side before the other.
 * By default it checks LEFT first (the historical left bias). When
 * `preferRightOnTie` is true — i.e. the finger dropped to the right of the
 * estimated slot's center — it checks RIGHT first so a tie resolves toward
 * the finger rather than always leftward.
 *
 * Returns the valid slot index, or null if no valid slots exist.
 */
export function findClosestValidSlot(
  targetIndex: number,
  previews: SlotPreview[],
  preferRightOnTie = false,
): number | null {
  if (previews[targetIndex]?.isValid) return targetIndex;

  // Search outward from target
  for (let offset = 1; offset < previews.length; offset++) {
    const left = targetIndex - offset;
    const right = targetIndex + offset;
    const leftValid = left >= 0 && previews[left]?.isValid;
    const rightValid = right < previews.length && previews[right]?.isValid;

    // On a tie (both sides valid at this offset), resolve toward the finger.
    if (preferRightOnTie) {
      if (rightValid) return right;
      if (leftValid) return left;
    } else {
      if (leftValid) return left;
      if (rightValid) return right;
    }
  }

  return null;
}
