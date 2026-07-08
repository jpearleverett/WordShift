import * as Font from 'expo-font';

/**
 * Two-typeface system.
 *
 * The UI chrome is drawn in a hand-authored pixel-art cottage skin. Text plays
 * two roles against it:
 *
 * - COTTAGE / display (PIXEL_FONT*): Pixelify Sans (SIL OFL), a legible pixel
 *   font, for the "chrome" — headers, wooden plaques, buttons, big numbers,
 *   and the puzzle letter tiles. It belongs to the pixel art.
 * - BODY / prose (BODY_FONT*): Nunito (SIL OFL), a warm rounded humanist sans,
 *   for running text — descriptions, dialogue body, labels, stats. It is far
 *   more readable at paragraph sizes than a pixel font and, crucially, ships a
 *   real italic (Pixelify has none, so italic body text used to fall back to
 *   the system font — a smooth intruder among the pixels).
 *
 * The family NAME is the key we register in Font.loadAsync, so we control it.
 * If loading ever fails, React Native falls back to the system font for these
 * families — text stays readable, just un-styled.
 */

// Cottage / display (pixel)
export const PIXEL_FONT = 'PixelifySans-Regular';
export const PIXEL_FONT_BOLD = 'PixelifySans-Bold';

// Body / prose (Nunito)
export const BODY_FONT = 'Nunito-Regular';
export const BODY_FONT_BOLD = 'Nunito-Bold';
export const BODY_FONT_ITALIC = 'Nunito-Italic';

/**
 * Load the app fonts. Awaited in the App bootstrap gate so the first frame is
 * already styled (no swap-in flash). Never throws — a load failure degrades to
 * the system font. (Kept the historical name so the bootstrap import is stable.)
 */
export async function loadPixelFonts(): Promise<void> {
  try {
    await Font.loadAsync({
      [PIXEL_FONT]: require('../../assets/fonts/PixelifySans-Regular.ttf'),
      [PIXEL_FONT_BOLD]: require('../../assets/fonts/PixelifySans-Bold.ttf'),
      [BODY_FONT]: require('../../assets/fonts/Nunito-Regular.ttf'),
      [BODY_FONT_BOLD]: require('../../assets/fonts/Nunito-Bold.ttf'),
      [BODY_FONT_ITALIC]: require('../../assets/fonts/Nunito-Italic.ttf'),
    });
  } catch {
    // Non-fatal — the UI falls back to the system font for these families.
  }
}
