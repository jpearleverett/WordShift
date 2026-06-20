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
  SLOT_WIDTH,
  ARC_SLOT_MARGIN_H,
  ARC_LETTER_MARGIN_H,
  STANDARD_TILE_W,
  STANDARD_TILE_MARGIN_H,
  COMPACT_TILE_W,
  COMPACT_TILE_MARGIN_H,
} from '../constants/tileLayout';

// Compact threshold: target rows with wordLength >= 6 use compact tiles (Row.tsx)
const COMPACT_THRESHOLD = 6;

interface SlotPreview {
  word: string;
  isValid: boolean;
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
): number {
  const screenWidth = Dimensions.get('window').width;

  // Determine tile sizing
  const compact = targetWordLength >= COMPACT_THRESHOLD;
  const tileW = compact ? COMPACT_TILE_W : STANDARD_TILE_W;
  const tileMarginH = compact ? COMPACT_TILE_MARGIN_H : STANDARD_TILE_MARGIN_H;

  // Each letter cell width (tile + 2 × margin)
  const letterCellW = tileW + tileMarginH * 2;

  // Each slot cell width (slot inner + 2 × arc margin)
  const slotEffectiveW = SLOT_WIDTH + ARC_SLOT_MARGIN_H * 2;

  // Letter count is slotCount - 1
  const letterCount = slotCount - 1;

  // Total content width: slots + letters + letter margins
  const contentW =
    slotCount * slotEffectiveW +
    letterCount * (letterCellW + ARC_LETTER_MARGIN_H * 2);

  // Content starts centered in the row
  const rowInnerW = screenWidth - ROW_HORIZONTAL_MARGIN * 2 - ROW_PADDING * 2;
  const contentStartX =
    ROW_HORIZONTAL_MARGIN + ROW_PADDING + (rowInnerW - contentW) / 2;

  // Walk through the arc layout to compute each slot center
  let bestSlot = 0;
  let bestDist = Infinity;
  let x = contentStartX;

  for (let i = 0; i < slotCount; i++) {
    // Slot center
    const slotCenter = x + slotEffectiveW / 2;
    const dist = Math.abs(dropX - slotCenter);
    if (dist < bestDist) {
      bestDist = dist;
      bestSlot = i;
    }
    x += slotEffectiveW;

    // After each slot (except the last), there's a letter
    if (i < letterCount) {
      x += ARC_LETTER_MARGIN_H; // left margin of letter wrapper
      x += letterCellW;
      x += ARC_LETTER_MARGIN_H; // right margin of letter wrapper
    }
  }

  return bestSlot;
}

/**
 * Given a target slot index and the available previews, find the
 * closest valid slot — preferring the target, then searching outward
 * with left bias on ties.
 *
 * Returns the valid slot index, or null if no valid slots exist.
 */
export function findClosestValidSlot(
  targetIndex: number,
  previews: SlotPreview[],
): number | null {
  if (previews[targetIndex]?.isValid) return targetIndex;

  // Search outward from target
  for (let offset = 1; offset < previews.length; offset++) {
    const left = targetIndex - offset;
    const right = targetIndex + offset;

    // Left bias: check left first
    if (left >= 0 && previews[left]?.isValid) return left;
    if (right < previews.length && previews[right]?.isValid) return right;
  }

  return null;
}
