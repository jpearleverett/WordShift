import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENTITLEMENTS,
  loadEntitlements,
  hasEntitlement,
  hasEntitlementSync,
  isPatron,
  isPatronSync,
  grantEntitlements,
  setEntitlements,
  getGrantedEntitlements,
  clearEntitlements,
} from '../services/entitlements';
import {
  PRODUCT_IDS,
  entitlementsForProduct,
  purchaseProduct,
  restorePurchases,
  setBillingProvider,
  isBillingReady,
  BillingProvider,
  PurchaseResult,
} from '../services/iap';
import {
  interstitialFrequency,
  shouldShowInterstitial,
  showRewarded,
  maybeShowInterstitial,
  isRewardedCapReached,
  setAdProvider,
  clearAdPacing,
  AdProvider,
  RewardedResult,
} from '../services/ads';
import {
  COSMETICS,
  ownsCosmetic,
  recordAmberCosmeticPurchase,
  equipCosmetic,
  getEquipped,
  clearCosmetics,
} from '../services/cosmetics';
import { REWARDED_DAILY_CAP } from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearEntitlements();
  await clearCosmetics();
  await clearAdPacing();
  await loadEntitlements(); // warm cache for sync accessors
});

// ===========================================================================
// entitlements
// ===========================================================================

describe('entitlements', () => {
  it('starts with no entitlements', async () => {
    expect(await isPatron()).toBe(false);
    expect(isPatronSync()).toBe(false);
    expect(await getGrantedEntitlements()).toEqual([]);
  });

  it('grants and persists entitlements (idempotent)', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
    expect(hasEntitlementSync(ENTITLEMENTS.PATRON)).toBe(true);
    expect(await isPatron()).toBe(true);

    // Idempotent — re-granting keeps a single entry
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    expect(await getGrantedEntitlements()).toEqual([ENTITLEMENTS.PATRON]);
  });

  it('setEntitlements replaces the full set (restore semantics)', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON, 'com.wordshift.theme_x']);
    await setEntitlements(['com.wordshift.theme_x']); // store no longer reports patron
    expect(await isPatron()).toBe(false);
    expect(await hasEntitlement('com.wordshift.theme_x')).toBe(true);
  });

  it('clears entitlements', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    await clearEntitlements();
    expect(isPatronSync()).toBe(false);
    expect(await getGrantedEntitlements()).toEqual([]);
  });
});

// ===========================================================================
// iap
// ===========================================================================

describe('iap', () => {
  it('defaults to a not-ready NoOp provider; purchases fail cleanly', async () => {
    expect(isBillingReady()).toBe(false);
    const res = await purchaseProduct(PRODUCT_IDS.PATRON_KEY);
    expect(res.success).toBe(false);
    expect(await isPatron()).toBe(false);
  });

  it('maps products to entitlements', () => {
    expect(entitlementsForProduct(PRODUCT_IDS.PATRON_KEY)).toEqual([ENTITLEMENTS.PATRON]);
    expect(entitlementsForProduct('com.wordshift.theme_x')).toEqual(['com.wordshift.theme_x']);
  });

  it('grants entitlements after a successful purchase via a fake provider', async () => {
    const fake: BillingProvider = {
      initialize: async () => {},
      getProducts: async () => [],
      purchase: async (productId): Promise<PurchaseResult> => ({ success: true, productId }),
      restorePurchases: async () => ({ entitlements: [] }),
      isReady: () => true,
      getName: () => 'Fake',
    };
    setBillingProvider(fake);
    const res = await purchaseProduct(PRODUCT_IDS.PATRON_KEY);
    expect(res.success).toBe(true);
    expect(res.entitlements).toEqual([ENTITLEMENTS.PATRON]);
    expect(await isPatron()).toBe(true);
    setBillingProvider(new (class {
      async initialize() {}
      async getProducts() { return []; }
      async purchase(productId: string): Promise<PurchaseResult> { return { success: false, productId }; }
      async restorePurchases() { return { entitlements: [] }; }
      isReady() { return false; }
      getName() { return 'Not Connected'; }
    })());
  });

  it('restorePurchases makes the store the authoritative set', async () => {
    const fake: BillingProvider = {
      initialize: async () => {},
      getProducts: async () => [],
      purchase: async (productId): Promise<PurchaseResult> => ({ success: true, productId }),
      restorePurchases: async () => ({ entitlements: [ENTITLEMENTS.PATRON] }),
      isReady: () => true,
      getName: () => 'Fake',
    };
    setBillingProvider(fake);
    const { entitlements } = await restorePurchases();
    expect(entitlements).toEqual([ENTITLEMENTS.PATRON]);
    expect(await isPatron()).toBe(true);
  });
});

// ===========================================================================
// ads — pure policy
// ===========================================================================

describe('ads policy', () => {
  it('uses looser interstitial cadence early, tighter late', () => {
    expect(interstitialFrequency(0)).toBe(3);
    expect(interstitialFrequency(2)).toBe(3);
    expect(interstitialFrequency(3)).toBe(5);
    expect(interstitialFrequency(5 as 5)).toBe(5);
  });

  it('suppresses interstitials for Patron and for exemptions', () => {
    expect(
      shouldShowInterstitial({ puzzlesSolved: 100, lastInterstitialPuzzle: 0, phase: 0, isPatron: true, exempt: false })
    ).toBe(false);
    expect(
      shouldShowInterstitial({ puzzlesSolved: 100, lastInterstitialPuzzle: 0, phase: 0, isPatron: false, exempt: true })
    ).toBe(false);
  });

  it('shows an interstitial only once the cadence threshold is met', () => {
    const base = { phase: 0 as const, isPatron: false, exempt: false };
    expect(shouldShowInterstitial({ ...base, puzzlesSolved: 2, lastInterstitialPuzzle: 0 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, puzzlesSolved: 3, lastInterstitialPuzzle: 0 })).toBe(true);
  });
});

// ===========================================================================
// ads — runtime gating
// ===========================================================================

describe('ads runtime', () => {
  function fakeAdProvider(overrides: Partial<AdProvider> = {}): AdProvider {
    return {
      initialize: async () => {},
      loadRewarded: async () => {},
      showRewarded: async (): Promise<RewardedResult> => ({ completed: true }),
      showInterstitial: async () => true,
      requestATTIfNeeded: async () => {},
      requestConsentIfNeeded: async () => {},
      isReady: () => true,
      getName: () => 'FakeAds',
      ...overrides,
    };
  }

  afterEach(() => {
    // reset to a NoOp-equivalent so other suites aren't affected
    setAdProvider(fakeAdProvider({ showRewarded: async () => ({ completed: false, reason: 'no_provider' }), showInterstitial: async () => false, isReady: () => false, getName: () => 'Not Connected' }));
  });

  it('does not show interstitials to Patron holders', async () => {
    setAdProvider(fakeAdProvider());
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    const shown = await maybeShowInterstitial({ puzzlesSolved: 99, phase: 0 });
    expect(shown).toBe(false);
  });

  it('shows an interstitial when cadence is met for a non-Patron', async () => {
    setAdProvider(fakeAdProvider());
    const shown = await maybeShowInterstitial({ puzzlesSolved: 3, phase: 0 });
    expect(shown).toBe(true);
    // Counter advanced — immediately after, not due again
    const again = await maybeShowInterstitial({ puzzlesSolved: 4, phase: 0 });
    expect(again).toBe(false);
  });

  it('enforces the rewarded daily cap', async () => {
    setAdProvider(fakeAdProvider());
    for (let i = 0; i < REWARDED_DAILY_CAP; i++) {
      const r = await showRewarded('victory_double');
      expect(r.completed).toBe(true);
    }
    expect(await isRewardedCapReached()).toBe(true);
    const capped = await showRewarded('victory_double');
    expect(capped.completed).toBe(false);
    expect(capped.reason).toBe('daily_cap');
  });
});

// ===========================================================================
// cosmetics
// ===========================================================================

describe('cosmetics', () => {
  it('exposes a catalog', () => {
    expect(COSMETICS.length).toBeGreaterThan(0);
  });

  it('auto-owns the Patron theme via entitlement', async () => {
    expect(await ownsCosmetic('theme_patron')).toBe(false);
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    expect(await ownsCosmetic('theme_patron')).toBe(true);
  });

  it('rejects amber-purchase recording for a non-amber item', async () => {
    // theme_patron is an entitlement item, not amber-purchasable
    expect(await recordAmberCosmeticPurchase('theme_patron')).toBe(false);
  });

  it('equips an owned cosmetic and persists the selection', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    expect(await equipCosmetic('theme_patron')).toBe(true);
    expect(await getEquipped('tile_theme')).toBe('theme_patron');
  });

  it('refuses to equip an unowned cosmetic', async () => {
    expect(await equipCosmetic('theme_patron')).toBe(false);
  });
});
