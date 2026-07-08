import React from 'react';
import * as Font from 'expo-font';

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
 * Registration is done PURELY through `Font.loadAsync` at runtime (no expo-font
 * config plugin), so the family name is exactly the key we choose, identically
 * on iOS, Android, Expo Go and release builds — no native-name ambiguity.
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

/**
 * Force Shantell Sans onto EVERY <Text> / <TextInput> in the app, including
 * ones whose style omits `fontFamily` entirely (those would otherwise render
 * the system font). Element styles still win, so the ~320 explicit fontFamily
 * usages keep their role-correct face; text with no family gets the regular
 * face as its base. Net result: nothing but Shantell can render.
 *
 * Mechanism (RN 0.85 / React 19): `Text` is a plain function component, so it
 * has no `.render` to wrap and React 19 ignores `defaultProps` on function
 * components — both classic hooks are dead. But React Native's index re-exports
 * Text via a LIVE getter (`get Text() { return require('.../Text').default }`),
 * so we replace that module's `.default` with a thin wrapper that prepends the
 * base family. Every `import { Text } from 'react-native'` reads the getter at
 * render time and therefore sees the wrapper. Fully defensive: if the module
 * shape differs it no-ops, and the explicit fontFamily aliases above still route
 * all styled text to Shantell.
 *
 * Must run once at App module load, before the first render.
 */
let globalFontInstalled = false;
export function installGlobalFont(): void {
  if (globalFontInstalled) return;
  globalFontInstalled = true;

  const base = { fontFamily: SHANTELL_REGULAR };

  const wrap = (modulePath: string): void => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(modulePath) as { default?: unknown };
      const Orig = mod?.default as
        | (React.ComponentType<{ style?: unknown }> & { __fontWrapped?: boolean })
        | undefined;
      if (typeof Orig !== 'function' || Orig.__fontWrapped) return;

      const Wrapped = (props: { style?: unknown }) =>
        React.createElement(Orig, {
          ...props,
          style: [base, props?.style],
        });
      // Preserve statics (e.g. TextInput.State) and identity markers.
      Object.assign(Wrapped, Orig);
      (Wrapped as { __fontWrapped?: boolean }).__fontWrapped = true;
      (Wrapped as { displayName?: string }).displayName = 'ShantellText';

      mod.default = Wrapped;
    } catch {
      // Non-fatal — explicit fontFamily aliases already route styled text.
    }
  };

  wrap('react-native/Libraries/Text/Text');
  wrap('react-native/Libraries/Components/TextInput/TextInput');
}
