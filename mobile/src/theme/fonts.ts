import * as Font from 'expo-font';

/**
 * Cottage pixel typography.
 *
 * The UI chrome is drawn in a hand-authored pixel-art cottage skin, but the text
 * inside it was the system sans — a plain blob that fought the aesthetic. These
 * families are Pixelify Sans (SIL Open Font License), a *legible* pixel font
 * chosen specifically so long dialogue still reads well on a phone.
 *
 * The family NAME is the key we register in Font.loadAsync (see loadPixelFonts),
 * so we control it. If loading ever fails, React Native falls back to the system
 * font for these families — text stays readable, just un-pixeled.
 */
export const PIXEL_FONT = 'PixelifySans-Regular';
export const PIXEL_FONT_BOLD = 'PixelifySans-Bold';

/**
 * Load the pixel fonts. Awaited in the App bootstrap gate so the first frame is
 * already pixeled (no swap-in flash). Never throws — a load failure degrades to
 * the system font.
 */
export async function loadPixelFonts(): Promise<void> {
  try {
    await Font.loadAsync({
      [PIXEL_FONT]: require('../../assets/fonts/PixelifySans-Regular.ttf'),
      [PIXEL_FONT_BOLD]: require('../../assets/fonts/PixelifySans-Bold.ttf'),
    });
  } catch {
    // Non-fatal — the UI falls back to the system font for these families.
  }
}
