/**
 * Dialogue portrait framing (the alcove crop).
 *
 * Every character PNG is a SQUARE 500x500 canvas, but the dialogue portrait
 * alcove is a tall box, and the layers render with `resizeMode="cover"`. Cover
 * scales square art by the box HEIGHT, so the art is rendered `boxHeight` wide
 * inside an alcove that is only `alcoveWidth` wide: the visible slice of the
 * art is
 *
 *     band = alcoveWidth / boxHeight
 *
 * and it used to be centred on the CANVAS centre rather than on the subject.
 * Six of the thirteen characters have a subject wider than that band and/or
 * sitting off canvas centre, so they lost their front and/or their back in the
 * alcove (the pangolin lost both its snout and the tip of its tail) while the
 * same PNGs render whole in the room, where AnimalSprite uses a square box and
 * `contain`.
 *
 * The fix is a measured per-character frame instead of a height-only compact
 * flag. Two levers, both derived from the subject's alpha bounding box:
 *
 *   - ZOOM. The box height is lowered until the band covers the subject plus a
 *     hair of air. Lowering the height widens the band (shows MORE art), so it
 *     is the direction that un-crops. It is capped at the surface's existing
 *     height, so a character that already fits is never zoomed IN: only the
 *     characters that clip today change size.
 *   - CENTRE. The layer is shifted so the alcove's window is centred on the
 *     SUBJECT rather than on the canvas. Without this the axolotl could not be
 *     shown whole at any zoom (its subject is 83% of the canvas wide and sits
 *     left of centre, so a canvas-centred window would need a band above 1.0).
 *
 * The spans below are the union of every frame a character can show in a
 * portrait (idle / talk / robed / robed_talk), measured as alpha bounding boxes
 * over the real art, so a character cannot clip only while speaking or only
 * after the robes land. `homeDialoguePortraits.test.ts` re-measures the PNGs and
 * fails if a re-export moves a subject outside its row here, and fails if a new
 * character has no row at all.
 */

import type { AnimalType } from '../types/homeWorld';

/** A character's subject extent, as fractions of the square art canvas. */
export interface PortraitSubject {
  /** Left edge of the alpha bounding box (0 = canvas left). */
  left: number;
  /** Right edge of the alpha bounding box (1 = canvas right). */
  right: number;
}

/**
 * Air kept around the silhouette, as a fraction of the art width (half of it on
 * each side). Also absorbs the 1.02 "talking" scale, which shaves ~2% off the
 * band on surfaces where the alcove re-clips the scaled box: any margin above
 * 0.02 * subjectWidth covers that, so this clears it for every character.
 *
 * The value is deliberately modest. The zoom is only ever lowered, never
 * raised, so a wider margin would start shrinking characters that are already
 * whole in order to buy them air they did not ask for. At 0.03 exactly the six
 * characters that lose art today are reframed and the other seven keep their
 * current size to the dp, at every screen width the alcove supports.
 */
export const DIALOGUE_PORTRAIT_MARGIN = 0.03;

/**
 * The sprite alcove's share of the dialogue sheet's content width. Used both by
 * the `dialogueSpriteCol` style and by the frame maths, which needs the alcove
 * as a NUMBER (the crop is computed against it), so the two cannot drift.
 */
export const DIALOGUE_SPRITE_COL_FRACTION = 0.3;

/**
 * Measured alpha bounding boxes of the 500x500 character art, union of
 * idle/talk/robed/robed_talk. Re-measure with the test's own scan if the art is
 * ever re-exported.
 */
export const DIALOGUE_PORTRAIT_SUBJECTS: Record<AnimalType, PortraitSubject> = {
  axolotl: { left: 0.028, right: 0.858 },
  aye_aye: { left: 0.112, right: 0.820 },
  capybara: { left: 0.274, right: 0.688 },
  fennec_fox: { left: 0.236, right: 0.912 },
  fox: { left: 0.262, right: 0.716 },
  kakapo: { left: 0.178, right: 0.780 },
  owl: { left: 0.310, right: 0.710 },
  pangolin: { left: 0.148, right: 0.792 },
  rabbit: { left: 0.298, right: 0.680 },
  red_panda: { left: 0.112, right: 0.692 },
  sloth: { left: 0.232, right: 0.728 },
  tarsier: { left: 0.252, right: 0.730 },
  wombat: { left: 0.264, right: 0.730 },
};

/**
 * Fallback for a character with no measured row: show the WHOLE canvas (square
 * box) rather than guessing a crop. Smaller, never clipped, and the test fails
 * before it can ship.
 */
const FALLBACK_SUBJECT: PortraitSubject = { left: 0, right: 1 };

export interface PortraitFrame {
  /** Dimensions for the portrait crop box. */
  box: { width: number; height: number };
  /** Offset for each cover-scaled layer inside that box (recentres the subject). */
  layer: { left: number };
}

export function getPortraitSubject(animalType: string): PortraitSubject {
  return (
    DIALOGUE_PORTRAIT_SUBJECTS[animalType as AnimalType] ?? FALLBACK_SUBJECT
  );
}

/**
 * The band a character needs: its subject width plus the air margin, capped at
 * the whole canvas (a band above 1.0 is unreachable under cover).
 */
export function getRequiredBand(animalType: string): number {
  const subject = getPortraitSubject(animalType);
  return Math.min(1, subject.right - subject.left + DIALOGUE_PORTRAIT_MARGIN);
}

/**
 * Frame one character into a portrait alcove.
 *
 * @param animalType   which character is showing
 * @param alcoveWidth  the visible width of the alcove, in dp
 * @param maxHeight    the surface's existing box height, in dp. The result is
 *                     never taller than this, so the band is never narrowed
 *                     below what the surface shows today: characters that are
 *                     framed correctly keep their exact size.
 */
export function getDialoguePortraitFrame(
  animalType: string,
  alcoveWidth: number,
  maxHeight: number
): PortraitFrame {
  const subject = getPortraitSubject(animalType);
  const band = getRequiredBand(animalType);
  // band = alcoveWidth / height. Never below alcoveWidth, or cover would start
  // scaling by WIDTH and crop the subject vertically instead.
  const height = Math.max(
    alcoveWidth,
    Math.min(maxHeight, alcoveWidth / band)
  );
  const center = (subject.left + subject.right) / 2;
  return {
    box: { width: alcoveWidth, height },
    // The cover-scaled art is `height` wide and centred in the box, so moving
    // the layer by this much puts the SUBJECT'S centre on the alcove's centre.
    layer: { left: (0.5 - center) * height },
  };
}
