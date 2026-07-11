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

  const base = { fontFamily };

  const patch = (mod: { default?: unknown } | undefined): void => {
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
      Object.assign(Wrapped, Orig);
      (Wrapped as { __fontWrapped?: boolean }).__fontWrapped = true;
      (Wrapped as { displayName?: string }).displayName = 'ShantellText';

      mod!.default = Wrapped;
    } catch {
      // Non-fatal. Explicit fontFamily styles remain available.
    }
  };

  // Metro requires literal paths here. The web platform resolves the sibling
  // installGlobalFont.web.ts instead, keeping these native internals out of its graph.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patch(require('react-native/Libraries/Text/Text'));
  } catch {
    // Non-fatal.
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patch(require('react-native/Libraries/Components/TextInput/TextInput'));
  } catch {
    // Non-fatal.
  }
}
