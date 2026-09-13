const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

/**
 * Expo SDK 57's template still selects proguard-android.txt (-dontoptimize).
 * The build-properties minify flag enables R8 but cannot undo that rule.
 * Select Android's optimizing defaults in the generated release block while
 * retaining the app and dependency keep rules. No AGP/NDK override is needed.
 */
function optimizeReleaseDefaults(contents) {
  const releases = [...contents.matchAll(/^([\t ]*)release\s*\{[\s\S]*?^\1\}/gm)];
  if (releases.length !== 1) {
    throw new Error('WordShift Android optimization: expected one generated release block; review the Expo template.');
  }
  const release = releases[0][0];
  const defaults = /getDefaultProguardFile\(\s*(['"])proguard-android(?:-optimize)?\.txt\1\s*\)/g;
  const matches = [...release.matchAll(defaults)];
  if (matches.length !== 1) {
    throw new Error('WordShift Android optimization: expected one default ProGuard file in release; review the Expo template.');
  }
  const original = matches[0][0];
  const optimized = original.replace('proguard-android.txt', 'proguard-android-optimize.txt');
  return contents.replace(release, release.replace(original, optimized));
}

module.exports = function withAndroidOptimization(config) {
  config = withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('WordShift Android optimization: the generated Gradle language changed; review this plugin.');
    }
    mod.modResults.contents = optimizeReleaseDefaults(mod.modResults.contents);
    return mod;
  });

  // The pinned React Native toolchain uses AGP 8.12. This documented opt-in
  // joins code and resource shrinking; AGP 9+ makes it the default.
  return withGradleProperties(config, mod => {
    const key = 'android.r8.optimizedResourceShrinking';
    let found = false;
    mod.modResults = mod.modResults.flatMap(entry => {
      if (entry.type !== 'property' || entry.key !== key) return [entry];
      if (found) return [];
      found = true;
      return [{ ...entry, value: 'true' }];
    });
    if (!found) mod.modResults.push({ type: 'property', key, value: 'true' });
    return mod;
  });
};
