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

// Arc wrapper margins (negative = elements nestle together)
export const ARC_LETTER_MARGIN_H = -3; // arcLetterWrapper marginHorizontal
export const ARC_SLOT_MARGIN_H = -1; // arcSlotWrapper marginHorizontal

// Tile horizontal footprint (standard vs compact for 6+ letter words)
export const STANDARD_TILE_W = 52;
export const STANDARD_TILE_MARGIN_H = 3;
export const COMPACT_TILE_W = 42;
export const COMPACT_TILE_MARGIN_H = 2;
