/**
 * Production-cut configuration gate.
 *
 * The thing that ships broken is almost never a code defect on a project with
 * a green suite — it is a CONFIG value, because config is what nothing covers.
 * The specific landmine here is `expo.extra.adsUseTestIds`.
 *
 * That flag MUST stay `true` through development and closed testing: only
 * `__DEV__` or this flag forces Google's test ad units, so a `false` value
 * means every release build serves LIVE ads, and tapping your own live ads on
 * a test build is an AdMob policy violation that can limit the whole account.
 * (A previous flip to `false` was deliberately reverted for exactly this.)
 *
 * But it must be flipped to `false` at the production cut, and until now
 * nothing enforced that — it was one unchecked box on a 100-line manual
 * checklist, worth 100% of ad revenue.
 *
 * This test is the enforcement. Normally it just documents the current value
 * and passes. Run it with WORDSHIFT_PRODUCTION_CUT=1 as a one-command
 * pre-release gate and it asserts the production-only invariants:
 *
 *   WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig
 */
import appJson from '../../app.json';

type Extra = {
  adsUseTestIds?: boolean;
  admobInterstitialIdAndroid?: string;
  admobRewardedIdAndroid?: string;
  admobBannerIdAndroid?: string;
  revenueCatAndroidKey?: string;
};

const extra = (appJson as { expo: { extra: Extra; android: { versionCode: number } } }).expo;
const IS_PRODUCTION_CUT = process.env.WORDSHIFT_PRODUCTION_CUT === '1';

describe('production configuration', () => {
  test('the ads test-id flag is explicitly declared (never left undefined)', () => {
    // An undefined flag is the dangerous state: the adapters treat only an
    // explicit `true` as "use test units", so a missing key silently serves
    // live ads in every build, including local development.
    expect(typeof extra.extra.adsUseTestIds).toBe('boolean');
  });

  test('android versionCode is a positive integer', () => {
    expect(Number.isInteger(extra.android.versionCode)).toBe(true);
    expect(extra.android.versionCode).toBeGreaterThan(0);
  });

  if (IS_PRODUCTION_CUT) {
    test('PRODUCTION CUT: ads serve LIVE units, not Google test units', () => {
      expect(extra.extra.adsUseTestIds).toBe(false);
    });

    test('PRODUCTION CUT: every Android ad unit id is populated', () => {
      // With test ids off, an empty unit id means that placement silently
      // stops serving — a revenue hole with no error anywhere.
      expect(extra.extra.admobInterstitialIdAndroid).toBeTruthy();
      expect(extra.extra.admobRewardedIdAndroid).toBeTruthy();
      expect(extra.extra.admobBannerIdAndroid).toBeTruthy();
    });

    test('PRODUCTION CUT: the billing key is populated', () => {
      expect(extra.extra.revenueCatAndroidKey).toBeTruthy();
    });
  } else {
    test('development/testing build keeps Google TEST ad units (policy safety)', () => {
      // Deliberately asserts the SAFE state rather than the shipped one:
      // serving live ads to your own testers risks the AdMob account.
      expect(extra.extra.adsUseTestIds).toBe(true);
    });
  }
});
