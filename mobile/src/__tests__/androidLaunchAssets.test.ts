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
 *    the old subject outside it) AND fill it -- the replacement for that art
 *    passed the ceiling while rendering as a rounded square floating in a ring
 *    of pale pink, so a ceiling alone was never the whole rule. The icon-only
 *    splash image must fit the 192dp circle of the system splash icon container
 *    at the configured imageWidth. Every launch PNG must be the clean RGBA PNG
 *    AAPT2 accepts.
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

/**
 * Width of the subject's SOLID body (alpha >= 128) as a fraction of the canvas.
 *
 * The companion to maxSubjectRadius, and the axis the real defect lived on. A
 * ceiling on the radius cannot catch it: the art this replaced measured
 * maxSubjectRadius 0.30043, i.e. 98.3% of the cap, while filling only 71.2% of
 * the 72dp mask, because it was a rounded CARD and a rounded card spends its
 * whole radius budget on its four corners. Masked by a circle it rendered as a
 * square floating in a ring of background colour. So the subject must also FILL
 * the safe circle, not merely fit inside it.
 *
 * WIDTH only, deliberately: an eared silhouette is not symmetric (this mark's
 * solid height is 0.484) and a height floor would be a number that looks like a
 * guard while enforcing a shape nobody wants. Span was the defect; span is what
 * is pinned.
 */
function solidBodyWidth(png: Png): number {
  const { width, height, data } = png;
  let x0 = width, x1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }
  return x1 < x0 ? 0 : (x1 - x0 + 1) / width;
}

const ADAPTIVE_SAFE_RADIUS = 33 / 108; // the adaptive-icon safe zone is a 66dp circle on a 108dp canvas
const ADAPTIVE_MIN_BODY_WIDTH = 0.5;   // ... and the subject has to fill it (see solidBodyWidth)
const SPLASH_ICON_CIRCLE_DP = 192;     // Android 12+ splash icon container (no icon background)

// One hex across the launcher field, the native splash and the JS boot hold.
// It is PARCH.base, the parchment fill of every cottage card. Kept as a literal
// rather than read out of app.json, or the assertions below become tautologies.
const LAUNCH_BG = '#F3E2BF';

describe('Android icon masks', () => {
  const adaptive = appJson.android.adaptiveIcon as { foregroundImage: string; backgroundColor: string };
  const splash = appJson.plugins.find((plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1] as {
    image: string;
    imageWidth: number;
    backgroundColor: string;
    android: { image: string; imageWidth: number };
  };

  test('the adaptive-icon foreground fills the 66/108 safe circle without leaving it', () => {
    const png = readPng(adaptive.foregroundImage);
    expect([png.width, png.height]).toEqual([1024, 1024]);
    expect(maxSubjectRadius(png)).toBeLessThanOrEqual(ADAPTIVE_SAFE_RADIUS);
    // The floor is the half that was missing. The foreground used to be the
    // whole app-icon TILE shrunk to 47.5% of the canvas: it passed the ceiling
    // (0.30043 of 0.30556) and still rendered as a rounded square floating in a
    // circle with ~10dp of pale pink on every cardinal side. That art scores
    // 0.4746 here and would now fail.
    expect(solidBodyWidth(png)).toBeGreaterThanOrEqual(ADAPTIVE_MIN_BODY_WIDTH);
    // A transparent surround: the launcher paints adaptiveIcon.backgroundColor behind it.
    expect(png.data[3]).toBe(0);
    // The field is the game's own parchment, not a colour that appears nowhere
    // else. Pinning it against the splash's hex too is what makes a future
    // drift between the launcher and the launch screen a failure, not an edit.
    expect(adaptive.backgroundColor).toBe(LAUNCH_BG);
    expect(adaptive.backgroundColor).toBe(splash.backgroundColor);
  });

  test('the iOS / store icon is a full-bleed opaque square with no baked corners', () => {
    // expo.icon feeds the iOS app icon and the legacy Android mipmaps, and it
    // is also what generateSplash.mjs mattes Ember out of -- yet it carried no
    // assertions at all. iOS rejects (or black-flattens) a transparent icon,
    // and both iOS and Play apply their OWN corner mask, so a baked rounded
    // corner fights the system mask. Full-bleed opaque is the only correct shape.
    const png = readPng(appJson.icon.replace('./', ''));
    expect([png.width, png.height]).toEqual([1024, 1024]);
    let transparent = 0;
    for (let i = 3; i < png.data.length; i += 4) if (png.data[i] !== 255) transparent += 1;
    expect(transparent).toBe(0);
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

  test.each(['assets/icon.png', 'assets/adaptive-icon.png', 'assets/splash-icon-android.png', 'assets/splash.png'])('%s is a clean RGBA PNG AAPT2 accepts', (relative) => {
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
    expect(splash.backgroundColor).toBe(LAUNCH_BG);
    expect(bootStyles).toContain(`backgroundColor: '${LAUNCH_BG}'`);
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
