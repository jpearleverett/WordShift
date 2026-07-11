import React from 'react';

/**
 * Force the supplied family onto every native Text/TextInput whose style omits
 * `fontFamily`. React Native exposes these components through live getters, so
 * replacing each internal module's default export updates named imports too.
 */
let globalFontInstalled = false;
export function installGlobalFont(fontFamily: string): void {
  if (globalFontInstalled) return;
  globalFontInstalled = true;

  // Everything below touches private React Native internals that a minor
  // release may move. Every layer therefore fails safely while explicit
  // fontFamily styles continue to work.
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
    const base = { fontFamily };

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
        // Preserve statics (for example TextInput.State) and identity markers.
        Object.assign(Wrapped, Orig);
        (Wrapped as { __fontWrapped?: boolean }).__fontWrapped = true;
        (Wrapped as { displayName?: string }).displayName = 'ShantellText';

        mod!.default = Wrapped;
      } catch (err) {
        warnPatchSkipped(which, err);
      }
    };

    // Metro requires literal paths here. Web resolves the sibling
    // installGlobalFont.web.ts, keeping native internals out of its graph.
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
    warnPatchSkipped('Text/TextInput', err);
  }
}
