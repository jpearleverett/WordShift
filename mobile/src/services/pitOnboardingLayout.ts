/**
 * Deterministic placement for the few words the onboarding pit step asks the
 * player to tap one at a time.
 *
 * Outside onboarding the floating words are scattered at random through the
 * float zone and an overlap costs nothing: the player taps whichever word they
 * can reach and "Offer All" clears the rest. During `pit_offering` there is no
 * Offer All and no continue button, and the step advances only once EVERY word
 * has been tapped individually, so a word that lands under Ember's standing
 * prompt card, or under another word, is simply unreachable. The step then sits
 * there until the stall rescue bails the player out, which is a safety net, not
 * a tutorial.
 *
 * So the tutorial words are laid out on a grid of cells that cannot overlap,
 * inside a band the caller has already cleared of the prompt card, and their
 * drift is bounded to their own cell. Random scatter resumes the moment
 * onboarding is over.
 */

/** Vertical breathing room between two stacked tutorial words. */
export const ONBOARDING_WORD_ROW_GAP = 16;
/** How far a tutorial word may drift from its cell's resting position. */
export const ONBOARDING_WORD_MAX_DRIFT = 10;
/** Row-to-row horizontal offset, so a stack of words still reads as scattered. */
export const ONBOARDING_WORD_STAGGER = 26;

export interface OnboardingWordZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface OnboardingWordPlacement {
  x: number;
  y: number;
  /** Horizontal sine amplitude that keeps the word inside its own cell. */
  driftAmplitude: number;
}

/**
 * Places one word per grid cell, top to bottom then left to right.
 *
 * The band is filled with as many rows as fit at the tile height plus
 * `ONBOARDING_WORD_ROW_GAP`; anything left over starts a second column. Cells
 * never overlap, so neither do the words, and each word's drift is clamped to
 * the slack inside its own cell.
 */
export function layoutOnboardingWords(
  wordWidths: number[],
  zone: OnboardingWordZone,
  tileHeight: number,
): OnboardingWordPlacement[] {
  const count = wordWidths.length;
  if (count === 0) return [];

  const bandHeight = Math.max(tileHeight, zone.bottom - zone.top);
  const bandWidth = Math.max(tileHeight, zone.right - zone.left);
  const rowPitch = tileHeight + ONBOARDING_WORD_ROW_GAP;
  const rowsThatFit = Math.max(1, Math.floor((bandHeight - tileHeight) / rowPitch) + 1);
  const rows = Math.min(count, rowsThatFit);
  const columns = Math.max(1, Math.ceil(count / rows));
  const columnWidth = bandWidth / columns;
  // With one row the word sits on the band's centre line rather than its top.
  const usedHeight = rows > 1 ? bandHeight - tileHeight : 0;
  const rowStep = rows > 1 ? usedHeight / (rows - 1) : 0;
  const rowTop = rows > 1 ? zone.top : zone.top + (bandHeight - tileHeight) / 2;

  return wordWidths.map((width, index) => {
    const row = index % rows;
    const column = Math.floor(index / rows);
    const cellLeft = zone.left + column * columnWidth;
    // Slack is what the cell has left over once the word is in it: half of it
    // centres the word, and the drift may not exceed the other half.
    const slack = Math.max(0, columnWidth - width);
    const driftAmplitude = Math.min(ONBOARDING_WORD_MAX_DRIFT, slack / 2);
    // A centred column of words reads as a list rather than as the scatter the
    // pit is made of, so alternate rows lean, by however much the cell has left
    // once the drift is paid for.
    const lean = Math.min(ONBOARDING_WORD_STAGGER, Math.max(0, slack / 2 - driftAmplitude));
    return {
      x: cellLeft + slack / 2 + (row % 2 === 0 ? -lean : lean),
      y: rowTop + row * rowStep,
      driftAmplitude,
    };
  });
}
