const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Declares WordShift a game in the Android manifest
 * (<application android:appCategory="game">).
 *
 * Targeting API 36, Android 16 ignores orientation and resizability locks on
 * screens 600dp and wider (tablets, unfolded foldables) for every app EXCEPT
 * games, so without this the portrait-only layout rotates into an untested
 * landscape. The Play Console "Game" category is a store listing setting and
 * does not write this attribute.
 */
module.exports = function withGameCategory(config) {
  return withAndroidManifest(config, mod => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) {
      throw new Error('WordShift game category: the manifest has no <application>; review this plugin.');
    }
    application.$ = { ...application.$, 'android:appCategory': 'game' };
    return mod;
  });
};
