import React from 'react';
import { Platform } from 'react-native';
import * as Font from 'expo-font';

/**
 * Two-typeface system: Figtree for the header/title chrome, Epunda Slab for
 * everything else.
 *
 * - HEADERS / titles / plaques / buttons / prominent bold-and-bigger UI text
 *   render in Figtree (SIL OFL, Google Fonts) — a clean geometric-humanist sans
 *   that sharpens hierarchy. This is the `PIXEL_FONT` role (the "chrome" face).
 * - BODY / running text / dialogue / inline emphasis and the letter tiles render
 *   in Epunda Slab (SIL OFL, Google Fonts) — a warm slab serif. This is the
 *   `BODY_FONT` role, including its BOLD and ITALIC, so inline bold- or
 *   italic-within-a-sentence and the tiles never switch font mid-line.
 *
 * Both faces ship real weights AND italics, so we register them per-face and map
 * by ROLE. The family name itself carries the weight/slant (e.g. `Figtree-Bold`,
 * `EpundaSlab-Italic`), so a `fontWeight`/`fontStyle` on top always matches an
 * available face and iOS never falls back to the system font (the trap the
 * single-weight Kurale hit).
 *
 * Registration is PLATFORM-SPLIT because the platforms resolve custom fonts
 * differently:
 *
 * - ANDROID registers the fonts NATIVELY via the expo-font config plugin
 *   (app.json -> plugins -> expo-font -> android.fonts). That builds a real
 *   multi-weight font family per face (an XML `<font-family>` resource) so a
 *   `fontWeight` on top always resolves to a genuine face. Runtime
 *   `Font.loadAsync` on Android only registers the NORMAL style, so a bold
 *   weight would fall back to the SYSTEM font (the bug that made every bold
 *   plaque render as the OS font) — so we do NOT loadAsync on Android.
 * - iOS resolves a loaded font by its own name, so runtime `Font.loadAsync`
 *   (below) is enough there and needs no config-plugin ambiguity.
 */

// Epunda Slab faces (the BODY / running-text role).
export const EPUNDA_REGULAR = 'EpundaSlab-Regular';
export const EPUNDA_BOLD = 'EpundaSlab-Bold';
export const EPUNDA_ITALIC = 'EpundaSlab-Italic';
export const EPUNDA_BOLD_ITALIC = 'EpundaSlab-BoldItalic';

// Figtree faces (the HEADER / title / prominent-bold chrome role).
export const FIGTREE_REGULAR = 'Figtree-Regular';
export const FIGTREE_BOLD = 'Figtree-Bold';

// Role aliases. The ~320 existing `fontFamily` references keep working; only the
// FACE behind each role changes. PIXEL_FONT* (headers/chrome, 245+ uses)
// resolves to Figtree; BODY_FONT* (body/tiles/inline emphasis) is Epunda Slab.
export const PIXEL_FONT = FIGTREE_REGULAR;
export const PIXEL_FONT_BOLD = FIGTREE_BOLD;
export const BODY_FONT = EPUNDA_REGULAR;
export const BODY_FONT_BOLD = EPUNDA_BOLD;
export const BODY_FONT_ITALIC = EPUNDA_ITALIC;

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
      [EPUNDA_REGULAR]: require('../../assets/fonts/EpundaSlab-Regular.ttf'),
      [EPUNDA_BOLD]: require('../../assets/fonts/EpundaSlab-Bold.ttf'),
      [EPUNDA_ITALIC]: require('../../assets/fonts/EpundaSlab-Italic.ttf'),
      [EPUNDA_BOLD_ITALIC]: require('../../assets/fonts/EpundaSlab-BoldItalic.ttf'),
      [FIGTREE_REGULAR]: require('../../assets/fonts/Figtree-Regular.ttf'),
      [FIGTREE_BOLD]: require('../../assets/fonts/Figtree-Bold.ttf'),
    });
  } catch {
    // Non-fatal — the UI falls back to the system font for these families.
  }
}

/**
 * Force Epunda Slab onto EVERY <Text> / <TextInput> in the app, including
 * ones whose style omits `fontFamily` entirely (those would otherwise render
 * the system font). Element styles still win, so the ~320 explicit fontFamily
 * usages keep their role-correct face; text with no family gets the regular
 * face as its base. Net result: nothing but the app faces can render.
 *
 * Mechanism (RN 0.85 / React 19): `Text` is a plain function component, so it
 * has no `.render` to wrap and React 19 ignores `defaultProps` on function
 * components — both classic hooks are dead. But React Native's index re-exports
 * Text via a LIVE getter (`get Text() { return require('.../Text').default }`),
 * so we replace that module's `.default` with a thin wrapper that prepends the
 * base family. Every `import { Text } from 'react-native'` reads the getter at
 * render time and therefore sees the wrapper. Fully defensive: if the module
 * shape differs it no-ops, and the explicit fontFamily aliases above still route
 * all styled text to Epunda Slab.
 *
 * Must run once at App module load, before the first render.
 */
let globalFontInstalled = false;
export function installGlobalFont(): void {
  if (globalFontInstalled) return;
  globalFontInstalled = true;

  // Everything below touches PRIVATE React Native internals
  // ('react-native/Libraries/...') that an RN minor bump is free to move or
  // reshape. The entire patch is therefore layered in try/catch guards with a
  // safe no-op fallback: if any step fails, we log a warning and boot
  // continues on the system font (the explicit fontFamily aliases above still
  // route all styled text to Epunda Slab). This must NEVER be able to crash boot.
  const warnPatchSkipped = (which: string, err: unknown): void => {
    try {
      console.warn(
        `[fonts] global ${which} font patch skipped (React Native internals changed?); ` +
          'falling back to explicit fontFamily styles.',
        err
      );
    } catch {
      // Even logging is best-effort.
    }
  };

  try {
    const base = { fontFamily: EPUNDA_REGULAR };

    const patch = (mod: { default?: unknown } | undefined, which: string): void => {
      try {
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
        (Wrapped as { displayName?: string }).displayName = 'EpundaText';

        mod!.default = Wrapped;
      } catch (err) {
        warnPatchSkipped(which, err);
      }
    };

    // Metro only bundles a module it can see via a STATIC require('literal'); a
    // dynamic require(variable) is rejected at transform time ("Invalid call").
    // So require each Text module by its literal path and hand the module object
    // to patch(). Each require is guarded in case the internal path ever moves.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      patch(require('react-native/Libraries/Text/Text'), 'Text');
    } catch (err) {
      warnPatchSkipped('Text', err);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      patch(require('react-native/Libraries/Components/TextInput/TextInput'), 'TextInput');
    } catch (err) {
      warnPatchSkipped('TextInput', err);
    }
  } catch (err) {
    // Outer belt-and-braces guard: no failure mode in the patch may escape.
    warnPatchSkipped('Text/TextInput', err);
  }
}
