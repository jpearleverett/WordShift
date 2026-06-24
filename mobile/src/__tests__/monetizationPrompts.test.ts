import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowPatronNudge,
  shouldShowRemoveAdsNudge,
  recordInterstitialSeen,
  consumePatronNudge,
  consumeRemoveAdsNudge,
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

describe('consumeRemoveAdsNudge', () => {
  it('fires once after enough interstitials, then never again', async () => {
    for (let i = 0; i < REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS; i++) {
      await recordInterstitialSeen();
    }
    expect(await consumeRemoveAdsNudge()).toBe(true);
    expect(await consumeRemoveAdsNudge()).toBe(false);
  });

  it('does not fire before enough interstitials', async () => {
    await recordInterstitialSeen();
    expect(await consumeRemoveAdsNudge()).toBe(false);
  });

  it('is suppressed for ad-free players', async () => {
    await grantEntitlements([ENTITLEMENTS.ADFREE]);
    await loadEntitlements();
    for (let i = 0; i < REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS + 2; i++) {
      await recordInterstitialSeen();
    }
    expect(await consumeRemoveAdsNudge()).toBe(false);
  });
});
