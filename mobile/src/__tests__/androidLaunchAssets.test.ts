/**
 * Android launch surfaces that only a native build would otherwise exercise.
 *
 * 1. The MERGED Android manifest, produced by running the real installed config
 *    plugins against the real Expo template (`expo config --type introspect`,
 *    no native project generated, ~1s): the launch audit found expo-audio's
 *    defaults declaring the Microphone permission and a media-playback
 *    foreground service, and the template's SYSTEM_ALERT_WINDOW / legacy
 *    external-storage permissions reaching the Play listing, because nothing
 *    in CI ever evaluated the plugin chain. An SDK bump that re-adds a
 *    permission now fails here instead of on the Play "App permissions" page.
 *
 * 2. The Android 12+ icon masks: the adaptive-icon foreground must keep its
 *    whole subject inside the 66/108 safe circle (the audit measured 32.7% of
 *    the old subject outside it), and the icon-only splash image must fit the
 *    192dp circle of the system splash icon container at the configured
 *    imageWidth. All three launch PNGs must be the clean RGBA PNGs AAPT2
 *    accepts.
 *
 * 3. The launch handoff itself. The native splash is baked into the binary at
 *    prebuild and the JS boot hold is OTA-able, so nothing but a test keeps
 *    them agreeing: the same mark file, at the same dp, on the same background
 *    hex. When they drifted the player saw the app icon twice, at two sizes,
 *    over a pale pink that appears nowhere in the game.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const { PNG } = require('pngjs');

const MOBILE_ROOT = path.resolve(__dirname, '../..');
const appJson = require('../../app.json').expo;

type ManifestEntry = { $: Record<string, string> };
type Manifest = {
  'uses-permission'?: ManifestEntry[];
  application: { $: Record<string, string>; service?: ManifestEntry[] }[];
};

function introspect(): { manifest: Manifest; appName: string | undefined; iosBackgroundModes: unknown } {
  const raw = execFileSync(
    process.execPath,
    [require.resolve('expo/bin/cli'), 'config', '--type', 'introspect', '--json'],
    {
      cwd: MOBILE_ROOT,
      encoding: 'utf8',
      env: { ...process.env, WORDSHIFT_RELEASE_CHANNEL: 'production', CI: '1' },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const config = JSON.parse(raw.slice(raw.indexOf('{')));
  const android = config._internal.modResults.android;
  const strings = android.strings.resources.string as { $: { name: string }; _: string }[];
  return {
    manifest: android.manifest.manifest as Manifest,
    appName: strings.find((entry) => entry.$.name === 'app_name')?._,
    iosBackgroundModes: config._internal.modResults.ios.infoPlist.UIBackgroundModes,
  };
}

describe('merged Android manifest (real config plugins, production channel)', () => {
  const resolved = introspect();
  const permissions = resolved.manifest['uses-permission'] ?? [];
  const declared = permissions.filter((entry) => entry.$['tools:node'] !== 'remove').map((entry) => entry.$['android:name']);
  const removed = permissions.filter((entry) => entry.$['tools:node'] === 'remove').map((entry) => entry.$['android:name']);

  test('never declares the microphone or any foreground-service permission', () => {
    expect(declared).not.toContain('android.permission.RECORD_AUDIO');
    expect(declared.filter((name) => name.startsWith('android.permission.FOREGROUND_SERVICE'))).toEqual([]);
  });

  test('blocks the template-default permissions a word game never uses', () => {
    for (const name of [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ]) {
      expect(declared).not.toContain(name);
      expect(removed).toContain(name);
    }
  });

  test('keeps the permissions the game relies on', () => {
    expect(declared).toEqual(expect.arrayContaining(['android.permission.INTERNET', 'android.permission.VIBRATE']));
  });

  test('registers no expo-audio foreground service and no iOS background audio mode', () => {
    const services = (resolved.manifest.application[0].service ?? []).map((entry) => entry.$['android:name']);
    expect(services.filter((name) => name.startsWith('expo.modules.audio'))).toEqual([]);
    expect(resolved.iosBackgroundModes ?? []).not.toContain('audio');
  });

  test('the launcher label is the brand name', () => {
    expect(resolved.appName).toBe('WordShift');
  });
});

type Png = { width: number; height: number; data: Buffer };

function readPng(relative: string): Png {
  return PNG.sync.read(fs.readFileSync(path.join(MOBILE_ROOT, relative)));
}

/** Chunk types of a PNG file, in order (sanitizePng.mjs emits IHDR/IDAT/IEND only). */
function pngChunkTypes(relative: string): string[] {
  const bytes = fs.readFileSync(path.join(MOBILE_ROOT, relative));
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const types: string[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    types.push(bytes.toString('ascii', offset + 4, offset + 8));
    offset += 12 + length;
  }
  return types;
}

/** Largest distance of any non-transparent pixel from the canvas centre, as a fraction of the width. */
function maxSubjectRadius(png: Png): number {
  const { width, height, data } = png;
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      const r = Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2);
      if (r > max) max = r;
    }
  }
  return max / width;
}

const ADAPTIVE_SAFE_RADIUS = 33 / 108; // the adaptive-icon safe zone is a 66dp circle on a 108dp canvas
const SPLASH_ICON_CIRCLE_DP = 192;     // Android 12+ splash icon container (no icon background)

describe('Android icon masks', () => {
  const adaptive = appJson.android.adaptiveIcon as { foregroundImage: string; backgroundColor: string };
  const splash = appJson.plugins.find((plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1] as {
    image: string;
    imageWidth: number;
    backgroundColor: string;
    android: { image: string; imageWidth: number };
  };

  test('the adaptive-icon foreground keeps its whole subject inside the 66/108 safe circle', () => {
    const png = readPng(adaptive.foregroundImage);
    expect([png.width, png.height]).toEqual([1024, 1024]);
    expect(maxSubjectRadius(png)).toBeLessThanOrEqual(ADAPTIVE_SAFE_RADIUS);
    // A transparent surround: the launcher paints adaptiveIcon.backgroundColor behind it.
    expect(png.data[3]).toBe(0);
    expect(adaptive.backgroundColor).toBe('#FFF0F5');
  });

  test('the Android splash icon fits the 12+ splash icon circle at the configured imageWidth', () => {
    const png = readPng(splash.android.image);
    expect([png.width, png.height]).toEqual([1024, 1024]);
    // The plugin renders the image at imageWidth dp centred on the 288dp
    // canvas, so the icon circle's radius in image-width units is 96 / imageWidth.
    const circleRadius = SPLASH_ICON_CIRCLE_DP / 2 / splash.android.imageWidth;
    expect(maxSubjectRadius(png)).toBeLessThanOrEqual(circleRadius);
    expect(png.data[3]).toBe(0);
  });

  test.each(['assets/adaptive-icon.png', 'assets/splash-icon-android.png', 'assets/splash.png'])('%s is a clean RGBA PNG AAPT2 accepts', (relative) => {
    const types = pngChunkTypes(relative);
    expect(types[0]).toBe('IHDR');
    expect(types[types.length - 1]).toBe('IEND');
    expect(new Set(types)).toEqual(new Set(['IHDR', 'IDAT', 'IEND']));
    const png = readPng(relative);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });

  test('the iOS storyboard image is transparent, so only one place owns the launch colour', () => {
    // splash.png used to bake the background in, which meant this file's hex
    // and app.json's had to agree exactly or `contain` letterboxing showed a
    // seam. The storyboard paints SplashScreenBackground behind it instead.
    expect(splash.image).toBe('./assets/splash.png');
    expect(readPng('assets/splash.png').data[3]).toBe(0);
  });

  test('iOS renders the mark at the same size Android and the boot screen do', () => {
    // getIosSplashConfig falls through to `imageWidth ?? 100`, so leaving the
    // ROOT imageWidth unset silently shipped a 100pt thumbnail that then jumped
    // 3.3x into the JS boot hold. 400pt over the 1600px master puts the mark
    // box at 200pt, matching android.imageWidth and BOOT_MARK_DP.
    expect(splash.imageWidth).toBe(400);
    expect(splash.android.imageWidth).toBe(200);
  });
});

describe('the native splash hands over to the JS boot hold without a jump', () => {
  const APP_TSX = fs.readFileSync(path.join(MOBILE_ROOT, 'App.tsx'), 'utf8');
  const splash = appJson.plugins.find((plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1] as {
    backgroundColor: string;
    android: { image: string; imageWidth: number };
  };
  const bootHold = APP_TSX.slice(APP_TSX.indexOf('function BootHold('), APP_TSX.indexOf('function resetAfterRootRenderError'));
  const bootStyles = APP_TSX.slice(APP_TSX.indexOf('const bootStyles = StyleSheet.create'));

  test('the boot screen paints the splash background colour', () => {
    // A mismatch here is a full-screen colour cut on the first frame the player
    // ever sees. app.json owns the hex; bootStyles.container must echo it.
    expect(splash.backgroundColor).toBe('#F3E2BF');
    expect(bootStyles).toMatch(/container: \{[^}]*backgroundColor: '#F3E2BF'/s);
  });

  test('the boot screen renders the SAME mark file at the SAME dp as the system splash', () => {
    expect(bootHold).toContain("require('./assets/splash-icon-android.png')");
    expect(bootHold).not.toContain("require('./assets/icon.png')");
    expect(APP_TSX).toMatch(new RegExp(`const BOOT_MARK_DP = ${splash.android.imageWidth};`));
    expect(bootStyles).toMatch(/mark: \{\s*width: BOOT_MARK_DP,\s*height: BOOT_MARK_DP,\s*\}/);
  });

  test('the boot-failure card keeps its retry, cloud escape and support route', () => {
    expect(bootHold).toMatch(/accessibilityLabel="Retry opening save"/);
    expect(bootHold).toMatch(/accessibilityRole="link"/);
    expect(bootHold).toMatch(/accessibilityLabel="WordShift"/);
    // The loading branch is two absolute layers pinned to the window centre.
    // The failure branch must stay a flowing centred column with its own
    // smaller mark: there is no scroll view here, so an absolutely centred
    // 200dp mark would sit ON the card and the card itself would push the
    // support link off a short screen.
    const failedBranch = bootHold.slice(bootHold.indexOf('if (failed) {'), bootHold.indexOf('// Two absolute layers'));
    expect(failedBranch).toContain('BOOT_FAILED_MARK_DP');
    expect(failedBranch).toContain('bootStyles.failedCard');
    expect(failedBranch).not.toContain('bootStyles.markLayer');
  });
});
