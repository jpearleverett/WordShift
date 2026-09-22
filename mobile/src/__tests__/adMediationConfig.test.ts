import { execFileSync } from 'child_process';
import path from 'path';

// Runs the real config plugin against the real Expo template's app/build.gradle.
const withAdMediation = require('../../plugins/withAdMediation');
const app = require('../../app.json').expo;
const expoDir = path.dirname(require.resolve('expo/package.json'));
const templateGradle = execFileSync('tar', ['-xOzf', path.join(expoDir, 'template.tgz'), 'package/android/app/build.gradle'], { encoding: 'utf8' });
const adsPackage = require('react-native-google-mobile-ads/package.json');

async function apply(contents: string, language = 'groovy'): Promise<string> {
  const value = withAdMediation({ name: app.name, slug: app.slug });
  const result = await value.mods.android.appBuildGradle({ ...value, modResults: { contents, language }, modRequest: {} });
  return result.modResults.contents;
}

test('the app registers the mediation plugin', () => {
  expect(app.plugins).toContain('./plugins/withAdMediation');
});

test('AppLovin and Unity adapters land inside the dependencies block, once', async () => {
  const once = await apply(templateGradle);
  for (const dep of withAdMediation.ADAPTERS) {
    expect(once).toContain(`implementation("${dep}")`);
  }
  const block = once.slice(once.search(/^dependencies\s*\{/m));
  expect(block.indexOf('com.google.ads.mediation:applovin')).toBeGreaterThan(0);
  expect(await apply(once)).toBe(once);
});

test('adapter versions stay pinned to the Google Mobile Ads SDK the React Native module ships', () => {
  // Both pinned adapters were built against play-services-ads 25.0.0. If the
  // module moves to a new SDK, re-pick the adapter releases built against it.
  expect(adsPackage.sdkVersions.android.googleMobileAds).toBe('25.0.0');
  expect(withAdMediation.ADAPTERS).toEqual([
    'com.google.ads.mediation:applovin:13.6.1.0',
    'com.google.ads.mediation:unity:4.17.0.0',
    'com.unity3d.ads:unity-ads:4.17.0',
  ]);
});

test('an unexpected Gradle shape fails the build instead of shipping without adapters', async () => {
  await expect(apply(templateGradle, 'kt')).rejects.toThrow('Gradle language');
  await expect(apply('android {}\n')).rejects.toThrow('dependencies block');
});
