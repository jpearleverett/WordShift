import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { installGlobalFont as installGlobalFontForPlatform } from './installGlobalFont';

/**
 * Single-typeface system — Shantell Sans everywhere.
 *
 * The whole game renders in Shantell Sans (SIL OFL, Google Fonts): every
 * screen, every element, no exceptions. There is intentionally no second face.
 *
 * Shantell Sans ships real weights and italics, so we register four faces and
 * map them by ROLE. Crucially, bold text uses the BOLD family and italic text
 * uses the ITALIC family — the family name itself carries the weight/slant, so
 * a `fontWeight`/`fontStyle` on top always matches an available face and iOS
 * never falls back to the system font (the trap the single-weight Kurale hit).
 *
 * Registration is PLATFORM-SPLIT because the platforms resolve custom fonts
 * differently:
 *
 * - ANDROID registers the fonts NATIVELY via the expo-font config plugin
 *   (app.json -> plugins -> expo-font -> android.fonts). That builds a real
 *   multi-weight font family per face (an XML `<font-family>` resource) so a
 *   `fontWeight`/`fontStyle` on top always resolves to a genuine face. Runtime
 *   `Font.loadAsync` on Android only registers the NORMAL style, so a bold
 *   weight would fall back to the SYSTEM font (the bug that made every bold
 *   plaque render as the OS font) — so we do NOT loadAsync on Android.
 * - iOS resolves a loaded font by its own name, so runtime `Font.loadAsync`
 *   (below) is enough there and needs no config-plugin ambiguity.
 */

// The four faces. These strings are the family names used everywhere.
export const SHANTELL_REGULAR = 'ShantellSans-Regular';
export const SHANTELL_BOLD = 'ShantellSans-Bold';
export const SHANTELL_ITALIC = 'ShantellSans-Italic';
export const SHANTELL_BOLD_ITALIC = 'ShantellSans-BoldItalic';

// Legacy aliases — mapped to Shantell by role. Kept so the ~320 existing
// `fontFamily` references (PIXEL_FONT_BOLD / BODY_FONT / BODY_FONT_ITALIC ...)
// and their imports keep working unchanged.
export const PIXEL_FONT = SHANTELL_REGULAR;
export const PIXEL_FONT_BOLD = SHANTELL_BOLD;
export const BODY_FONT = SHANTELL_REGULAR;
export const BODY_FONT_BOLD = SHANTELL_BOLD;
export const BODY_FONT_ITALIC = SHANTELL_ITALIC;

/**
 * Load the app fonts. Awaited in the App bootstrap gate so the first frame is
 * already styled (no swap-in flash). Never throws — a load failure degrades to
 * the system font. (Kept the historical name so the bootstrap import is stable.)
 */
export async function loadPixelFonts(): Promise<void> {
  // Android is served by the config plugin's native multi-weight families;
  // loading here would shadow them with a NORMAL-only registration and bring
  // back the bold/italic system-font fallback. iOS uses this runtime path.
  if (Platform.OS === 'android') return;
  try {
    await Font.loadAsync({
      [SHANTELL_REGULAR]: require('../../assets/fonts/ShantellSans-Regular.ttf'),
      [SHANTELL_BOLD]: require('../../assets/fonts/ShantellSans-Bold.ttf'),
      [SHANTELL_ITALIC]: require('../../assets/fonts/ShantellSans-Italic.ttf'),
      [SHANTELL_BOLD_ITALIC]: require('../../assets/fonts/ShantellSans-BoldItalic.ttf'),
    });
  } catch {
    // Non-fatal — the UI falls back to the system font for these families.
  }
}

/** Install the platform's global Text/TextInput font behavior before render. */
export function installGlobalFont(): void {
  installGlobalFontForPlatform(SHANTELL_REGULAR);
}
