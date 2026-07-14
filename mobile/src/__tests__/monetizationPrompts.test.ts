import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowPatronNudge,
  shouldShowRemoveAdsNudge,
  recordInterstitialSeen,
  consumePatronNudge,
  armRemoveAdsNudgeIfEligible,
  consumePendingRemoveAdsNudge,
  clearMonetPrompts,
} from '../services/monetizationPrompts';
import {
  ENTITLEMENTS,
  grantEntitlements,
  loadEntitlements,
  clearEntitlements,
} from '../services/entitlements';
import {
  PATRON_NUDGE_MIN_PUZZLES,
  REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS,
} from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearMonetPrompts();
  await clearEntitlements();
  await loadEntitlements();
});

describe('pure decisions', () => {
  it('patron nudge: gated on min puzzles, suppressed for patrons / once shown', () => {
    expect(shouldShowPatronNudge({ puzzlesSolved: PATRON_NUDGE_MIN_PUZZLES, isPatron: false, alreadyShown: false })).toBe(true);
    expect(shouldShowPatronNudge({ puzzlesSolved: PATRON_NUDGE_MIN_PUZZLES - 1, isPatron: false, alreadyShown: false })).toBe(false);
    expect(shouldShowPatronNudge({ puzzlesSolved: 999, isPatron: true, alreadyShown: false })).toBe(false);
    expect(shouldShowPatronNudge({ puzzlesSolved: 999, isPatron: false, alreadyShown: true })).toBe(false);
  });

  it('remove-ads nudge: gated on interstitials seen, suppressed for ad-free / once shown', () => {
    expect(shouldShowRemoveAdsNudge({ interstitialsSeen: REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS, isAdFree: false, alreadyShown: false })).toBe(true);
    expect(shouldShowRemoveAdsNudge({ interstitialsSeen: REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS - 1, isAdFree: false, alreadyShown: false })).toBe(false);
    expect(shouldShowRemoveAdsNudge({ interstitialsSeen: 99, isAdFree: true, alreadyShown: false })).toBe(false);
    expect(shouldShowRemoveAdsNudge({ interstitialsSeen: 99, isAdFree: false, alreadyShown: true })).toBe(false);
  });
});

describe('consumePatronNudge', () => {
  it('fires once at the threshold then never again', async () => {
    expect(await consumePatronNudge(PATRON_NUDGE_MIN_PUZZLES)).toBe(true);
    expect(await consumePatronNudge(PATRON_NUDGE_MIN_PUZZLES)).toBe(false); // one-time
  });

  it('does not fire before the threshold', async () => {
    expect(await consumePatronNudge(PATRON_NUDGE_MIN_PUZZLES - 1)).toBe(false);
  });

  it('is suppressed for Patrons', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    await loadEntitlements();
    expect(await consumePatronNudge(999)).toBe(false);
  });
});

describe('remove-ads nudge (arm on the ad exit, present on the NEXT exit)', () => {
  async function seeInterstitials(n: number) {
    for (let i = 0; i < n; i++) {
      await recordInterstitialSeen();
    }
  }

  it('does not arm before enough interstitials, and nothing pends', async () => {
    await seeInterstitials(REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS - 1);
    expect(await armRemoveAdsNudgeIfEligible()).toBe(false);
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
  });

  it('never presents on the exit that armed it: consume requires a prior arm', async () => {
    await seeInterstitials(REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS);
    // Threshold reached but not armed (no interstitial-exit arm ran yet) —
    // a qualifying exit must stay quiet.
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
  });

  it('arms at the threshold, then fires exactly once on a later exit', async () => {
    await seeInterstitials(REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS);
    expect(await armRemoveAdsNudgeIfEligible()).toBe(true);
    expect(await consumePendingRemoveAdsNudge()).toBe(true);  // next exit: fires
    expect(await consumePendingRemoveAdsNudge()).toBe(false); // one-time
    // Re-arming after it has shown must refuse (alreadyShown).
    expect(await armRemoveAdsNudgeIfEligible()).toBe(false);
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
  });

  it('arming is idempotent across multiple interstitial exits before the offer lands', async () => {
    await seeInterstitials(REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS);
    expect(await armRemoveAdsNudgeIfEligible()).toBe(true);
    expect(await armRemoveAdsNudgeIfEligible()).toBe(true); // still armed, still pending
    expect(await consumePendingRemoveAdsNudge()).toBe(true); // still fires only once
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
  });

  it('is suppressed for ad-free players at the arm step', async () => {
    await grantEntitlements([ENTITLEMENTS.ADFREE]);
    await loadEntitlements();
    await seeInterstitials(REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS + 2);
    expect(await armRemoveAdsNudgeIfEligible()).toBe(false);
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
  });

  it('an armed offer is discarded (not shown, not marked shown) if the player goes ad-free before it lands', async () => {
    await seeInterstitials(REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS);
    expect(await armRemoveAdsNudgeIfEligible()).toBe(true);
    await grantEntitlements([ENTITLEMENTS.ADFREE]);
    await loadEntitlements();
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
    // And the stale pending flag does not linger.
    expect(await consumePendingRemoveAdsNudge()).toBe(false);
  });
});
