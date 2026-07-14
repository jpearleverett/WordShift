// Metro configuration.
//
// The only customization here exists to make the WEB dev bundle
// (`npx expo start --web`) compile. A few dependencies are native-only: they
// import React Native codegen/internal modules that do not exist on web, so
// Metro fails while statically resolving them at bundle time even though the
// app already guards their runtime use with `Platform.OS === 'web'` checks
// (e.g. src/services/providers/googleAdMobAds.ts). For web only, we redirect
// those modules to an empty shim. Native (iOS/Android) resolution is untouched,
// so real builds keep the real native modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyModule = path.resolve(__dirname, 'web-shims/empty.js');

// Native-only modules (and native-only deep imports) to stub out on web.
// - react-native-google-mobile-ads: native codegen components (banner view).
// - react-native/Libraries/Text/Text & .../TextInput: internal RN paths that
//   src/theme/fonts.ts requires to patch the default font. They pull in the
//   native Fabric renderer, which does not exist on web. fonts.ts already wraps
//   those requires in try/catch, so an empty module degrades gracefully on web.
const WEB_STUBBED_MODULES = [
  'react-native-google-mobile-ads',
  'react-native/Libraries/Text/Text',
  'react-native/Libraries/Components/TextInput/TextInput',
];

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    WEB_STUBBED_MODULES.some(
      (m) => moduleName === m || moduleName.startsWith(`${m}/`),
    )
  ) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  const resolver = defaultResolveRequest || context.resolveRequest;
  return resolver(context, moduleName, platform);
};

module.exports = config;
