import { Platform } from 'react-native';
import * as Font from 'expo-font';
import { installGlobalFont as installGlobalFontForPlatform } from './installGlobalFont';

/**
 * Two-typeface system: Figtree for the header/title chrome, Shantell Sans for
 * everything else.
 *
 * - HEADERS / titles / plaques / buttons / prominent bold-and-bigger UI text
 *   render in Figtree (SIL OFL, Google Fonts) — a clean geometric-humanist sans
 *   that sharpens hierarchy. This is the `PIXEL_FONT` role (the "chrome" face).
 * - BODY / running text / dialogue / inline emphasis stay in Shantell Sans (the
 *   cozy handwritten face). This is the `BODY_FONT` role — including its BOLD
 *   and ITALIC, so inline bold-within-a-sentence and the letter tiles keep the
 *   handwritten feel and never switch font mid-line.
 *
 * Both faces ship real weights, so we register them per-face and map by ROLE.
 * The family name itself carries the weight/slant (e.g. `Figtree-Bold`,
 * `ShantellSans-Italic`), so a `fontWeight`/`fontStyle` on top always matches an
 * available face and iOS never falls back to the system font (the trap the
 * single-weight Kurale hit).
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

// Shantell Sans faces (the BODY / running-text role).
export const SHANTELL_REGULAR = 'ShantellSans-Regular';
export const SHANTELL_BOLD = 'ShantellSans-Bold';
export const SHANTELL_ITALIC = 'ShantellSans-Italic';
export const SHANTELL_BOLD_ITALIC = 'ShantellSans-BoldItalic';

// Figtree faces (the HEADER / title / prominent-bold chrome role).
export const FIGTREE_REGULAR = 'Figtree-Regular';
export const FIGTREE_BOLD = 'Figtree-Bold';

// Role aliases. The ~320 existing `fontFamily` references keep working; only the
// FACE behind each role changes. PIXEL_FONT* (headers/chrome, 245+ uses) now
// resolves to Figtree; BODY_FONT* (body/tiles/inline emphasis) stays Shantell.
export const PIXEL_FONT = FIGTREE_REGULAR;
export const PIXEL_FONT_BOLD = FIGTREE_BOLD;
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
      [FIGTREE_REGULAR]: require('../../assets/fonts/Figtree-Regular.ttf'),
      [FIGTREE_BOLD]: require('../../assets/fonts/Figtree-Bold.ttf'),
    });
  } catch {
    // Non-fatal — the UI falls back to the system font for these families.
  }
}

/** Install the platform's global Text/TextInput font behavior before render. */
export function installGlobalFont(): void {
  installGlobalFontForPlatform(SHANTELL_REGULAR);
}
