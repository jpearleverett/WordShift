import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENTITLEMENTS,
  loadEntitlements,
  hasEntitlement,
  hasEntitlementSync,
  isPatron,
  isPatronSync,
  isAdFree,
  isAdFreeSync,
  grantEntitlements,
  setEntitlements,
  getGrantedEntitlements,
  clearEntitlements,
  hasMadeAmberPurchase,
  hasMadeAmberPurchaseSync,
  markAmberPurchaseMade,
} from '../services/entitlements';
import {
  PRODUCT_IDS,
  entitlementsForProduct,
  purchaseProduct,
  purchaseConsumable,
  reconcilePendingConsumableGrants,
  acknowledgeConsumableGrant,
  restorePurchases,
  setBillingProvider,
  isBillingReady,
  BillingProvider,
  PurchaseResult,
} from '../services/iap';
import {
  interstitialFrequency,
  shouldShowInterstitial,
  isDailyInterstitialAllowed,
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
  unequipCosmetic,
  getEquipped,
  getEquippedSync,
  initCosmetics,
  clearCosmetics,
} from '../services/cosmetics';
import {
  getTileColor,
  getEquippedTileTheme,
  setEquippedTileTheme,
  TILE_THEMES,
  CONFETTI_THEMES,
} from '../theme/colors';
import {
  REWARDED_DAILY_CAP,
  AMBER_PACK_GRANTS,
  HINT_PACK_GRANTS,
  FIRST_PURCHASE_AMBER_MULTIPLIER,
} from '../constants/gameBalance';

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

  it('tracks the first-amber-purchase flag (default off, idempotent mark)', async () => {
    expect(await hasMadeAmberPurchase()).toBe(false);
    expect(hasMadeAmberPurchaseSync()).toBe(false);

    await markAmberPurchaseMade();
    expect(await hasMadeAmberPurchase()).toBe(true);
    expect(hasMadeAmberPurchaseSync()).toBe(true);

    await markAmberPurchaseMade(); // idempotent
    expect(await hasMadeAmberPurchase()).toBe(true);
  });

  it('setEntitlements (restore semantics) preserves the first-amber-purchase flag', async () => {
    await markAmberPurchaseMade();
    await setEntitlements([ENTITLEMENTS.PATRON]); // store restore replaces the granted set...
    expect(await isPatron()).toBe(true);
    expect(await hasMadeAmberPurchase()).toBe(true); // ...but never resurrects the one-time 2x
  });

  it('clearEntitlements resets the first-amber-purchase flag', async () => {
    await markAmberPurchaseMade();
    await clearEntitlements();
    expect(await hasMadeAmberPurchase()).toBe(false);
    expect(hasMadeAmberPurchaseSync()).toBe(false);
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
    expect(entitlementsForProduct(PRODUCT_IDS.REMOVE_ADS)).toEqual([ENTITLEMENTS.ADFREE]);
    expect(entitlementsForProduct('com.wordshift.theme_x')).toEqual(['com.wordshift.theme_x']);
  });

  it('ad-free is granted by Remove-Ads AND by Patron (superset)', async () => {
    await loadEntitlements();
    expect(isAdFreeSync()).toBe(false);
    expect(await isAdFree()).toBe(false);

    await grantEntitlements([ENTITLEMENTS.ADFREE]);
    expect(isAdFreeSync()).toBe(true);
    expect(await isAdFree()).toBe(true);
    expect(isPatronSync()).toBe(false); // remove-ads is not patron

    await clearEntitlements();
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    expect(isAdFreeSync()).toBe(true); // patron is ad-free too
    expect(await isAdFree()).toBe(true);
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

  it('falls back to local entitlement mapping when a successful purchase reports no entitlements', async () => {
    const fake: BillingProvider = {
      initialize: async () => {},
      getProducts: async () => [],
      purchase: async (productId): Promise<PurchaseResult> => ({ success: true, productId, entitlements: [] }),
      restorePurchases: async () => ({ entitlements: [] }),
      isReady: () => true,
      getName: () => 'Fake',
    };
    setBillingProvider(fake);
    const res = await purchaseProduct(PRODUCT_IDS.REMOVE_ADS);
    expect(res.success).toBe(true);
    expect(res.entitlements).toEqual([ENTITLEMENTS.ADFREE]);
    expect(await isAdFree()).toBe(true);
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

  it('does not clear local entitlements when restore returns an empty set from an unavailable provider', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    const fake: BillingProvider = {
      initialize: async () => {},
      getProducts: async () => [],
      purchase: async (productId): Promise<PurchaseResult> => ({ success: false, productId }),
      restorePurchases: async () => ({ entitlements: [] }),
      isReady: () => false,
      getName: () => 'Not Connected',
    };
    setBillingProvider(fake);
    const { entitlements } = await restorePurchases();
    expect(entitlements).toEqual([ENTITLEMENTS.PATRON]);
    expect(await isPatron()).toBe(true);
  });
});

// ===========================================================================
// iap — pending consumable-grant ledger (crash safety)
// ===========================================================================

describe('pending consumable-grant ledger', () => {
  function successProvider(transactionId?: string): BillingProvider {
    return {
      initialize: async () => {},
      getProducts: async () => [],
      purchase: async (productId): Promise<PurchaseResult> => ({
        success: true,
        productId,
        ...(transactionId ? { transactionId } : {}),
      }),
      restorePurchases: async () => ({ entitlements: [] }),
      isReady: () => true,
      getName: () => 'Fake',
    };
  }

  it('persists the grant BEFORE returning — a kill between store success and apply is recoverable', async () => {
    setBillingProvider(successProvider('GPA.1111-2222'));
    const res = await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
    expect(res.success).toBe(true);
    expect(res.grantId).toBe('GPA.1111-2222'); // store transaction id is the ledger id

    // SIMULATED KILL: the caller (StoreModal) never applies the reward or
    // acknowledges. The next boot/store-open reconcile still finds the paid grant.
    const pending = await reconcilePendingConsumableGrants();
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      grantId: 'GPA.1111-2222',
      productId: PRODUCT_IDS.HINTS_SMALL,
      reward: { kind: 'hints', amount: HINT_PACK_GRANTS.small },
    });
    expect(typeof pending[0].purchasedAt).toBe('number');
  });

  it('acknowledge clears the grant after apply; re-acknowledging is a harmless no-op', async () => {
    setBillingProvider(successProvider('GPA.3333-4444'));
    const res = await purchaseConsumable(PRODUCT_IDS.HINTS_LARGE);
    expect((await reconcilePendingConsumableGrants())).toHaveLength(1);

    await acknowledgeConsumableGrant(res.grantId!);
    expect(await reconcilePendingConsumableGrants()).toEqual([]);
    // Idempotent — a double-ack (e.g. retried apply path) never throws.
    await expect(acknowledgeConsumableGrant(res.grantId!)).resolves.toBeUndefined();
  });

  it('dedupes by store transaction id — a replayed transaction never double-enters the ledger', async () => {
    setBillingProvider(successProvider('GPA.5555-6666'));
    await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
    await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL); // same store transaction replayed
    const pending = await reconcilePendingConsumableGrants();
    expect(pending).toHaveLength(1);
    expect(pending[0].grantId).toBe('GPA.5555-6666');
  });

  it('falls back to locally-unique grant ids when the provider reports no transaction id', async () => {
    setBillingProvider(successProvider()); // no transactionId in the result
    const a = await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
    const b = await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
    expect(a.grantId).toBeTruthy();
    expect(b.grantId).toBeTruthy();
    expect(a.grantId).not.toBe(b.grantId); // two real purchases → two ledger entries
    expect(await reconcilePendingConsumableGrants()).toHaveLength(2);
  });

  it('ledgers the ALREADY-DOUBLED first-purchase amber amount, so a crash replay grants exactly what was paid for', async () => {
    setBillingProvider(successProvider('GPA.7777-8888'));
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL); // first amber pack ever
    expect(res.firstPurchaseDoubled).toBe(true);

    const pending = await reconcilePendingConsumableGrants();
    expect(pending).toHaveLength(1);
    expect(pending[0].reward).toEqual({
      kind: 'amber',
      amount: AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER,
    });
    expect(pending[0].firstPurchaseDoubled).toBe(true);
  });

  it('persists the first-purchase grant BEFORE consuming the one-time 2x flag (no paid-nothing window)', async () => {
    // The first-amber-pack flag must never be spent unless the doubled grant is
    // already on the replay ledger. Ordering guarantee: after a successful first
    // purchase, the ledger carries the doubled grant AND the flag is set — a
    // crash between the two could only ever replay the grant (never lose it).
    setBillingProvider(successProvider('GPA.order-1'));
    expect(hasMadeAmberPurchaseSync()).toBe(false);
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(res.firstPurchaseDoubled).toBe(true);
    // Grant is on the ledger (survives a kill)...
    expect(await reconcilePendingConsumableGrants()).toHaveLength(1);
    // ...and only then is the one-time flag consumed.
    await loadEntitlements();
    expect(hasMadeAmberPurchaseSync()).toBe(true);
    // A second amber pack no longer doubles.
    const res2 = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
    expect(res2.firstPurchaseDoubled).toBeUndefined();
  });

  it('a failed/cancelled purchase writes nothing to the ledger', async () => {
    setBillingProvider({
      ...successProvider(),
      purchase: async (productId): Promise<PurchaseResult> => ({
        success: false,
        productId,
        cancelled: true,
      }),
    });
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
    expect(res.success).toBe(false);
    expect(res.grantId).toBeUndefined();
    expect(await reconcilePendingConsumableGrants()).toEqual([]);
  });
});

// ===========================================================================
// ads — pure policy
// ===========================================================================

describe('ads policy', () => {
  it('keeps a light interstitial cadence in the candy phase, widening toward the reveal', () => {
    // Early (Phase 0-2) is the LOOSER base gap so the cozy first-impression /
    // review window is the least ad-dense; Phase 3 doubles it, Phase 4+ silences.
    expect(interstitialFrequency(0)).toBe(6);
    expect(interstitialFrequency(2)).toBe(6);
    expect(interstitialFrequency(3)).toBe(5);
    expect(interstitialFrequency(5 as 5)).toBe(5);
  });

  it('suppresses interstitials for ad-free entitlements and for exemptions', () => {
    expect(
      shouldShowInterstitial({ puzzlesSolved: 100, lastInterstitialPuzzle: 0, phase: 0, isAdFree: true, exempt: false })
    ).toBe(false);
    expect(
      shouldShowInterstitial({ puzzlesSolved: 100, lastInterstitialPuzzle: 0, phase: 0, isAdFree: false, exempt: true })
    ).toBe(false);
  });

  it('shows an interstitial only once the cadence threshold is met', () => {
    const base = { phase: 0 as const, isAdFree: false, exempt: false };
    const earlyFreq = interstitialFrequency(0); // candy-phase cadence
    expect(shouldShowInterstitial({ ...base, puzzlesSolved: earlyFreq - 1, lastInterstitialPuzzle: 0 })).toBe(false);
    expect(shouldShowInterstitial({ ...base, puzzlesSolved: earlyFreq, lastInterstitialPuzzle: 0 })).toBe(true);
  });

  it('suppresses interstitials entirely at Phase 4+ (tonal protection of the reveal/endgame)', () => {
    // Huge gap that would normally fire — still no ad once the sky goes black.
    expect(shouldShowInterstitial({ puzzlesSolved: 300, lastInterstitialPuzzle: 0, phase: 4 as any, isAdFree: false, exempt: false })).toBe(false);
    expect(shouldShowInterstitial({ puzzlesSolved: 300, lastInterstitialPuzzle: 0, phase: 5 as any, isAdFree: false, exempt: false })).toBe(false);
  });

  it('throttles interstitials at Phase 3 (doubled gap, rare not gone)', () => {
    const base = { isAdFree: false, exempt: false };
    const lateFreq = interstitialFrequency(3 as any); // LATE cadence
    // Just under 2x the late gap → not yet.
    expect(shouldShowInterstitial({ ...base, phase: 3 as any, puzzlesSolved: 2 * lateFreq - 1, lastInterstitialPuzzle: 0 })).toBe(false);
    // At 2x → allowed.
    expect(shouldShowInterstitial({ ...base, phase: 3 as any, puzzlesSolved: 2 * lateFreq, lastInterstitialPuzzle: 0 })).toBe(true);
  });

  it('allows daily-challenge interstitials only at the bright phases (0-2)', () => {
    // Monetize the daily's reliable session while the world is still candy;
    // Phase 3+ stays exempt to protect the dread arc and ceremonies.
    expect(isDailyInterstitialAllowed(0)).toBe(true);
    expect(isDailyInterstitialAllowed(1)).toBe(true);
    expect(isDailyInterstitialAllowed(2)).toBe(true);
    expect(isDailyInterstitialAllowed(3)).toBe(false);
    expect(isDailyInterstitialAllowed(4)).toBe(false);
    expect(isDailyInterstitialAllowed(5)).toBe(false);
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

  it('does not show interstitials to Remove Ads holders', async () => {
    setAdProvider(fakeAdProvider());
    await grantEntitlements([ENTITLEMENTS.ADFREE]);
    const shown = await maybeShowInterstitial({ puzzlesSolved: 99, phase: 0 });
    expect(shown).toBe(false);
  });

  it('shows an interstitial when cadence is met for a non-Patron', async () => {
    setAdProvider(fakeAdProvider());
    const freq = interstitialFrequency(0);
    const shown = await maybeShowInterstitial({ puzzlesSolved: freq, phase: 0 });
    expect(shown).toBe(true);
    // Counter advanced — immediately after, not due again
    const again = await maybeShowInterstitial({ puzzlesSolved: freq + 1, phase: 0 });
    expect(again).toBe(false);
  });

  it('requests consent + ATT once at first ad exposure, never before', async () => {
    let consent = 0;
    let att = 0;
    setAdProvider(fakeAdProvider({
      requestConsentIfNeeded: async () => { consent++; },
      requestATTIfNeeded: async () => { att++; },
    }));
    // Nothing shown yet → no consent/ATT prompt (no cold-start permission wall).
    expect(consent).toBe(0);
    expect(att).toBe(0);
    // First interstitial triggers consent + ATT exactly once.
    const shown = await maybeShowInterstitial({ puzzlesSolved: 50, phase: 0 });
    expect(shown).toBe(true);
    expect(consent).toBe(1);
    expect(att).toBe(1);
    // A later ad (rewarded) does not re-request within the session.
    await showRewarded('victory_double');
    expect(consent).toBe(1);
    expect(att).toBe(1);
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

  it('records an amber-bought theme as owned and equippable', async () => {
    expect(await ownsCosmetic('theme_ember')).toBe(false);
    expect(await recordAmberCosmeticPurchase('theme_ember')).toBe(true);
    expect(await ownsCosmetic('theme_ember')).toBe(true);
    // Already owned → second record is a no-op false.
    expect(await recordAmberCosmeticPurchase('theme_ember')).toBe(false);
    expect(await equipCosmetic('theme_ember')).toBe(true);
    expect(await getEquipped('tile_theme')).toBe('theme_ember');
  });

  it('every amber tile theme has a matching palette in TILE_THEMES', () => {
    COSMETICS.filter(c => c.category === 'tile_theme' && c.acquisition.kind === 'amber')
      .forEach(c => expect(TILE_THEMES[c.id]).toBeDefined());
  });

  it('equipping a theme applies it to getTileColor (and unequip restores default)', async () => {
    const defaultColor = getTileColor('A');
    await recordAmberCosmeticPurchase('theme_tide');
    await equipCosmetic('theme_tide');
    expect(getEquippedTileTheme()).toBe('theme_tide');
    expect(getTileColor('A')).toEqual(TILE_THEMES.theme_tide['A'.charCodeAt(0) % TILE_THEMES.theme_tide.length]);

    await unequipCosmetic('tile_theme');
    expect(getEquippedTileTheme()).toBeNull();
    expect(getTileColor('A')).toEqual(defaultColor);
  });

  it('getEquippedSync mirrors the equipped selection', async () => {
    expect(getEquippedSync('tile_theme')).toBeUndefined();
    await recordAmberCosmeticPurchase('theme_bone');
    await equipCosmetic('theme_bone');
    expect(getEquippedSync('tile_theme')).toBe('theme_bone');
  });

  it('initCosmetics re-applies the equipped theme to colors', async () => {
    await recordAmberCosmeticPurchase('theme_ember');
    await equipCosmetic('theme_ember');
    // Simulate the colors module starting cold (e.g. a fresh launch).
    setEquippedTileTheme(null);
    expect(getEquippedTileTheme()).toBeNull();
    await initCosmetics();
    expect(getEquippedTileTheme()).toBe('theme_ember');
  });

  it('supports an independent confetti category (buy/equip + sync)', async () => {
    expect(getEquippedSync('confetti')).toBeUndefined();
    expect(await ownsCosmetic('confetti_gold')).toBe(false);
    expect(await recordAmberCosmeticPurchase('confetti_gold')).toBe(true);
    expect(await equipCosmetic('confetti_gold')).toBe(true);
    expect(await getEquipped('confetti')).toBe('confetti_gold');
    expect(getEquippedSync('confetti')).toBe('confetti_gold');
    // Equipping confetti does not touch the tile-theme selection.
    expect(getEquippedSync('tile_theme')).toBeUndefined();
  });

  it('every amber confetti theme has a matching palette in CONFETTI_THEMES', () => {
    COSMETICS.filter(c => c.category === 'confetti' && c.acquisition.kind === 'amber')
      .forEach(c => expect(CONFETTI_THEMES[c.id]).toBeDefined());
  });
});
