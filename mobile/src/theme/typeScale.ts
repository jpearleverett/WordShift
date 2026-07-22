/**
 * typeScale.ts — the app's single canonical font-size scale.
 *
 * Before this existed the codebase carried ~34 distinct `fontSize` literals,
 * including half-points (10.5 / 11.5 / 12.5 / 13.5 / 14.5 / 15.5) and clusters
 * of near-duplicate integers a single pixel apart. There was no shared ladder,
 * so every screen invented its own sizes and the visual hierarchy drifted.
 *
 * `FONT_SIZE` is that ladder: a small set of named tokens tuned to the sizes the
 * app actually uses. New UI should pick a token, never a raw number. When you
 * find a stray literal, SNAP IT TO THE NEAREST TOKEN — half-points and one-off
 * near-duplicates collapse into the token beside them (that consolidation is the
 * whole point). Break an exact `.5` tie toward the lower (floor) token.
 *
 * The dense 10-16 band keeps a token per integer on purpose: the app's running
 * text, labels and small headers cluster there at 1px intervals, and preserving
 * each preserves the existing hierarchy (only the half-points collapse, all
 * sub-1px shifts). Above 16 the steps widen the way a modular scale does.
 *
 * Load-bearing exact values are tokens by design:
 *   - `headline` (20) is the COMPACT letter-tile glyph (6+ letter words).
 *   - `display` (24) is the STANDARD letter-tile glyph.
 * Do not retune those two without checking LetterTile.
 *
 * Out of scale on purpose: a couple of huge one-off DECORATIVE splash numerals
 * (the ~60/80 celebration/hero glyphs) are not text and stay bespoke; they do
 * not belong on this ladder and should not be snapped up/down to `giant`.
 */
export const FONT_SIZE = {
  /** 10 — tiny badges, superscripts, fine counters (absorbs 7-10 + 10.5). */
  micro: 10,
  /** 11 — captions, chips, fine print (absorbs 11.5). */
  caption: 11,
  /** 12 — secondary labels, dense metadata (absorbs 12.5). */
  small: 12,
  /** 13 — default running text / body copy, the single most common size (absorbs 13.5). */
  body: 13,
  /** 14 — emphasized body, standard button labels (absorbs 14.5). */
  bodyLg: 14,
  /** 15 — prominent body, row titles, pill text (absorbs 15.5). */
  callout: 15,
  /** 16 — larger body, small section headers (absorbs 17). */
  large: 16,
  /** 18 — card / row / section titles (absorbs 19 — an 18/20 tie breaks down). */
  title: 18,
  /** 20 — compact letter tile (kept exact); modal/screen titles (absorbs 22 — a 20/24 tie breaks down). */
  headline: 20,
  /** 24 — standard letter tile (kept exact); big numbers, modal headers (absorbs 25/26). */
  display: 24,
  /** 30 — hero numerals, big modal titles (absorbs 28/32/34). */
  hero: 30,
  /** 40 — celebration / splash glyphs, the largest text tier (absorbs 38-48). */
  giant: 40,
} as const;

export type FontSizeToken = keyof typeof FONT_SIZE;
