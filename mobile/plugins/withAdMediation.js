const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * AdMob mediation adapters (Android). With these on the classpath, AdMob can
 * hand an ad slot to AppLovin or Unity Ads whenever their bid beats Google's.
 * The JavaScript ad code does not change: mediation is configured in the
 * AdMob console (mediation groups), which is what actually turns a network on.
 * An adapter with no mediation group is inert.
 *
 * Versions are pinned to the adapters built against Google Mobile Ads 25.0.0,
 * the SDK react-native-google-mobile-ads 16.x ships. A newer adapter declares a
 * newer play-services-ads and Gradle would silently lift the ads SDK past the
 * version the React Native module was tested with. When that module moves to a
 * new SDK, move these to the adapter releases built against it.
 */
const ADAPTERS = [
  'com.google.ads.mediation:applovin:13.6.1.0',
  'com.google.ads.mediation:unity:4.17.0.0',
  // The Unity adapter does not depend on the Unity Ads SDK itself (AppLovin's
  // does); Google's setup pairs adapter 4.17.0.0 with SDK 4.17.0.
  'com.unity3d.ads:unity-ads:4.17.0',
];

const MARKER = '// WordShift AdMob mediation adapters';

function addAdapters(contents) {
  if (contents.includes(MARKER)) return contents;
  const opening = /^dependencies\s*\{\s*$/m;
  if (!opening.test(contents)) {
    throw new Error('WordShift ad mediation: the app build.gradle has no top-level dependencies block; review this plugin.');
  }
  const lines = ADAPTERS.map(dep => `    implementation("${dep}")`).join('\n');
  return contents.replace(opening, match => `${match}\n    ${MARKER}\n${lines}`);
}

module.exports = function withAdMediation(config) {
  return withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('WordShift ad mediation: the generated Gradle language changed; review this plugin.');
    }
    mod.modResults.contents = addAdapters(mod.modResults.contents);
    return mod;
  });
};

module.exports.ADAPTERS = ADAPTERS;
