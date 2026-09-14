/**
 * Production-cut configuration gate.
 *
 * The thing that ships broken is almost never a code defect on a project with
 * a green suite. It is a CONFIG value, because config is what nothing covers.
 * The specific landmine here is `expo.extra.adsUseTestIds`.
 *
 * Only `__DEV__` or an explicit `adsUseTestIds: true` forces Google's test ad
 * units, so `false` means every build serves LIVE ads, and tapping your own
 * live ads on a test build is an AdMob policy violation that can limit the
 * whole account. (A previous hand flip to `false` was deliberately reverted.)
 *
 * The flag used to be a hand-edited literal that had to be flipped at the
 * production cut, which meant the repository could not hold the production
 * value with a green CI (this file asserted the testing value by default).
 * It is now DERIVED in app.config.js from WORDSHIFT_RELEASE_CHANNEL: the
 * production channel forces live units no matter what app.json says, every
 * other channel keeps the app.json literal, which must stay `true`.
 *
 * This file evaluates the REAL app.config.js for both states on every run, so
 * CI validates the production configuration without any workflow edit on cut
 * day. WORDSHIFT_PRODUCTION_CUT=1 remains a one-command pre-release gate: it
 * additionally asserts that the channel in the CURRENT shell (defaulting to
 * production) resolves to live ads, so cutting a release from a shell that is
 * still pointed at a testing channel fails loudly:
 *
 *   WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig
 */
import appJson from '../../app.json';

type Extra = {
  adsUseTestIds?: boolean;
  releaseChannel?: string;
  creatorCode?: string;
  admobInterstitialIdAndroid?: string;
  admobRewardedIdAndroid?: string;
  admobBannerIdAndroid?: string;
  revenueCatAndroidKey?: string;
};

type ExpoConfig = {
  name: string;
  version: string;
  runtimeVersion?: unknown;
  extra: Extra;
  android: { versionCode: number };
};

const resolveAppConfig: (input: { config: ExpoConfig }) => ExpoConfig = require('../../app.config.js');

const staticConfig = (appJson as { expo: ExpoConfig }).expo;
const IS_PRODUCTION_CUT = process.env.WORDSHIFT_PRODUCTION_CUT === '1';
const TESTING_CHANNELS = ['development', 'preview', 'internal-testing'] as const;

/** Run `fn` with WORDSHIFT_RELEASE_CHANNEL set (undefined = unset), always restoring the shell's own value. */
function withChannel<T>(channel: string | undefined, fn: () => T): T {
  const previous = process.env.WORDSHIFT_RELEASE_CHANNEL;
  if (channel === undefined) delete process.env.WORDSHIFT_RELEASE_CHANNEL;
  else process.env.WORDSHIFT_RELEASE_CHANNEL = channel;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.WORDSHIFT_RELEASE_CHANNEL;
    else process.env.WORDSHIFT_RELEASE_CHANNEL = previous;
  }
}

/** Evaluate app.config.js exactly as `expo config` would for the given channel (undefined = unset). */
function resolveForChannel(channel: string | undefined, config: ExpoConfig = staticConfig): ExpoConfig {
  return withChannel(channel, () => resolveAppConfig({ config: JSON.parse(JSON.stringify(config)) }));
}

describe('production configuration', () => {
  test('the app.json ads test-id literal is explicitly declared and stays true (policy safety)', () => {
    // An undefined literal is the dangerous state: the adapters treat only an
    // explicit `true` as "use test units", and the testing channels inherit
    // this literal. It must stay `true`: serving live ads to your own testers
    // risks the AdMob account. The production channel ignores it (below).
    expect(typeof staticConfig.extra.adsUseTestIds).toBe('boolean');
    expect(staticConfig.extra.adsUseTestIds).toBe(true);
  });

  test('android versionCode is a positive integer', () => {
    expect(Number.isInteger(staticConfig.android.versionCode)).toBe(true);
    expect(staticConfig.android.versionCode).toBeGreaterThan(0);
  });

  test('an unset channel resolves to internal testing with Google TEST ad units', () => {
    const resolved = resolveForChannel(undefined);
    expect(resolved.extra.releaseChannel).toBe('internal-testing');
    expect(resolved.runtimeVersion).toBe(`${staticConfig.version}-internal-testing`);
    expect(resolved.extra.adsUseTestIds).toBe(true);
  });

  test.each(TESTING_CHANNELS)('the %s channel keeps Google TEST ad units and its own runtime', (channel) => {
    const resolved = resolveForChannel(channel);
    expect(resolved.extra.releaseChannel).toBe(channel);
    expect(resolved.runtimeVersion).toBe(`${staticConfig.version}-${channel}`);
    expect(resolved.extra.adsUseTestIds).toBe(true);
  });

  test('a testing channel resolves a MISSING literal to test units, never to undefined', () => {
    const broken = JSON.parse(JSON.stringify(staticConfig)) as ExpoConfig;
    delete broken.extra.adsUseTestIds;
    // The ad adapters read anything but an explicit `true` as "live units",
    // so a lost literal must resolve to the SAFE explicit boolean on a
    // testing channel.
    expect(resolveForChannel('internal-testing', broken).extra.adsUseTestIds).toBe(true);
  });

  test('an unknown channel is refused rather than silently building a testing runtime', () => {
    expect(() => resolveForChannel('staging')).toThrow('Unknown WordShift release channel');
  });

  describe('PRODUCTION channel (the public-release configuration, validated on every run)', () => {
    const production = resolveForChannel('production');

    test('ads serve LIVE units, not Google test units, regardless of the app.json literal', () => {
      expect(production.extra.adsUseTestIds).toBe(false);
      const literalFlipped = JSON.parse(JSON.stringify(staticConfig)) as ExpoConfig;
      literalFlipped.extra.adsUseTestIds = true;
      expect(resolveForChannel('production', literalFlipped).extra.adsUseTestIds).toBe(false);
    });

    test('the runtime is the production runtime', () => {
      expect(production.runtimeVersion).toBe(`${staticConfig.version}-production`);
      expect(production.extra.releaseChannel).toBe('production');
    });

    test('every Android ad unit id is populated', () => {
      // With test ids off, an empty unit id means that placement silently
      // stops serving: a revenue hole with no error anywhere.
      expect(production.extra.admobInterstitialIdAndroid).toBeTruthy();
      expect(production.extra.admobRewardedIdAndroid).toBeTruthy();
      expect(production.extra.admobBannerIdAndroid).toBeTruthy();
    });

    test('the billing key is populated', () => {
      expect(production.extra.revenueCatAndroidKey).toBeTruthy();
    });

    test('the creator kit stays inert (empty creatorCode)', () => {
      expect(production.extra.creatorCode).toBe('');
    });
  });

  if (IS_PRODUCTION_CUT) {
    test('PRODUCTION CUT: the channel in THIS shell resolves to live ads', () => {
      // The pre-release gate is run from the shell that will build. If that
      // shell still points at a testing channel, the cut is not a cut.
      const channel = process.env.WORDSHIFT_RELEASE_CHANNEL || 'production';
      const resolved = resolveForChannel(channel);
      expect(resolved.extra.releaseChannel).toBe('production');
      expect(resolved.extra.adsUseTestIds).toBe(false);
      expect(resolved.runtimeVersion).toBe(`${staticConfig.version}-production`);
    });
  }
});

describe('Android manifest hygiene (app.json)', () => {
  type Plugin = string | [string, Record<string, unknown>];
  const plugins = (appJson as { expo: { plugins: Plugin[] } }).expo.plugins;
  const pluginOptions = (name: string): Record<string, unknown> | undefined => {
    const entry = plugins.find((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === name);
    return Array.isArray(entry) ? entry[1] : undefined;
  };
  const android = (appJson as { expo: { android: { blockedPermissions: string[] } } }).expo.android;

  test('the launcher label matches the store name and every other surface', () => {
    expect(staticConfig.name).toBe('WordShift');
    expect(JSON.stringify(appJson)).not.toContain('Word Shift');
  });

  test('expo-audio never declares the microphone or a media-playback foreground service', () => {
    // The plugin DEFAULTS (recordAudioAndroid + enableBackgroundPlayback true)
    // add RECORD_AUDIO, the FOREGROUND_SERVICE pair and an AudioControlsService
    // to the merged manifest. The game plays foreground SFX only.
    expect(pluginOptions('expo-audio')).toEqual({
      recordAudioAndroid: false,
      enableBackgroundPlayback: false,
    });
  });

  test('template-default and plugin-default permissions the game never uses are blocked', () => {
    expect(android.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ]),
    );
    // VIBRATE is legitimately used by haptics and must never be blocked.
    expect(android.blockedPermissions).not.toContain('android.permission.VIBRATE');
  });

  test('Android shows the icon-only splash image inside the 12+ icon container; iOS keeps the full splash', () => {
    const splash = pluginOptions('expo-splash-screen') as {
      image: string;
      android?: { image?: string; imageWidth?: number };
    };
    expect(splash.image).toBe('./assets/splash.png');
    expect(splash.android).toEqual({ image: './assets/splash-icon-android.png', imageWidth: 200 });
  });
});
