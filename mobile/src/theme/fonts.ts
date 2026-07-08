import React from 'react';
import { Text, TextInput } from 'react-native';
import * as Font from 'expo-font';

/**
 * Single-typeface system — Kurale everywhere.
 *
 * The whole game renders in Kurale (SIL OFL, Google Fonts): every screen,
 * every element, no exceptions. There is intentionally no second face — the
 * goal is one cohesive voice with zero chance of a stray system font (or the
 * old pixel/body faces) showing through.
 *
 * Kurale ships a single weight (Regular / 400). Existing `fontWeight` /
 * `fontStyle` props are left in place; with only one face the renderer either
 * synthesizes weight/slant or draws the regular glyphs, but it always stays
 * Kurale — it never falls back to another family.
 *
 * The family NAME is the key we register in Font.loadAsync, so we control it.
 */

// The one font.
export const KURALE_FONT = 'Kurale';

// Legacy aliases — all resolve to Kurale. Kept so the ~320 existing
// `fontFamily` references (PIXEL_FONT_BOLD / BODY_FONT / BODY_FONT_ITALIC ...)
// and their imports keep working unchanged; there is only one font now.
export const PIXEL_FONT = KURALE_FONT;
export const PIXEL_FONT_BOLD = KURALE_FONT;
export const BODY_FONT = KURALE_FONT;
export const BODY_FONT_BOLD = KURALE_FONT;
export const BODY_FONT_ITALIC = KURALE_FONT;

/**
 * Load the app font. Awaited in the App bootstrap gate so the first frame is
 * already styled (no swap-in flash). Never throws — a load failure degrades to
 * the system font. (Kept the historical name so the bootstrap import is stable.)
 */
export async function loadPixelFonts(): Promise<void> {
  try {
    await Font.loadAsync({
      [KURALE_FONT]: require('../../assets/fonts/Kurale-Regular.ttf'),
    });
  } catch {
    // Non-fatal — the UI falls back to the system font for this family.
  }
}

/**
 * Force Kurale as the BASE family on every <Text> / <TextInput> in the app,
 * including ones whose style omits `fontFamily` entirely (those would otherwise
 * render the system font). Element styles still win, but every `fontFamily` in
 * the codebase already resolves to Kurale, so the net result is Kurale
 * everywhere — nothing else can show.
 *
 * Called once at App module load (before the first render). Fully defensive:
 * if the renderer internals differ, it degrades to the well-understood
 * `defaultProps` default and, failing that, no-ops — the explicit `fontFamily`
 * aliases above still route all styled text to Kurale.
 */
let globalFontInstalled = false;
export function installGlobalFont(): void {
  if (globalFontInstalled) return;
  globalFontInstalled = true;

  const base = { fontFamily: KURALE_FONT };

  const patch = (Component: unknown): void => {
    try {
      const Comp = Component as {
        render?: (...args: unknown[]) => unknown;
        defaultProps?: { style?: unknown };
      };
      if (!Comp) return;

      // Preferred: wrap the forwardRef render so the base family is prepended
      // to the resolved style of EVERY instance (even styled-but-no-family
      // text). Element style stays last, so it always wins.
      const orig = Comp.render;
      if (typeof orig === 'function') {
        Comp.render = function patchedRender(this: unknown, ...args: unknown[]) {
          const el = orig.apply(this, args);
          if (!React.isValidElement(el)) return el;
          const prevStyle = (el.props as { style?: unknown } | null)?.style;
          return React.cloneElement(
            el as React.ReactElement<{ style?: unknown }>,
            { style: [base, prevStyle] },
          );
        };
        return;
      }

      // Fallback: default style (covers text with no `style` prop at all).
      Comp.defaultProps = Comp.defaultProps || {};
      Comp.defaultProps.style = [base, Comp.defaultProps.style];
    } catch {
      // Non-fatal — the fontFamily aliases already route styled text to Kurale.
    }
  };

  patch(Text);
  patch(TextInput);
}
