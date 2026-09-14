import * as fs from 'fs';
import * as path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRODUCT_IDS,
  CONSUMABLE_PRODUCTS,
  STARTER_PACK_INFO,
  consumableReward,
  entitlementsForProduct,
  purchaseConsumable,
  purchaseStarterPack,
  setBillingProvider,
  BillingProvider,
  PurchaseResult,
  isStoreUnavailableError,
  PLAY_SUBSCRIPTIONS_URL,
} from '../services/iap';
import { getSupporterRenewalNote } from '../services/phaseNarrative';
import {
  ENTITLEMENTS,
  loadEntitlements,
  getGrantedEntitlements,
  clearEntitlements,
  hasEntitlement,
  hasMadeAmberPurchase,
  markAmberPurchaseMade,
} from '../services/entitlements';
import {
  AMBER_PACK_GRANTS,
  HINT_PACK_GRANTS,
  STARTER_PACK_GRANTS,
  FIRST_PURCHASE_AMBER_MULTIPLIER,
} from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

function fakeProvider(overrides: Partial<BillingProvider> = {}): BillingProvider {
  return {
    initialize: async () => {},
    getProducts: async () => [],
    purchase: async (productId): Promise<PurchaseResult> => ({ success: true, productId }),
    restorePurchases: async () => ({ entitlements: [] }),
    isReady: () => true,
    getName: () => 'Fake',
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearEntitlements();
  await loadEntitlements();
});

describe('consumable catalog', () => {
  it('maps amber/hint SKUs to the right reward amounts from gameBalance', () => {
    expect(consumableReward(PRODUCT_IDS.AMBER_SMALL)).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.small });
    expect(consumableReward(PRODUCT_IDS.AMBER_MEDIUM)).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.medium });
    expect(consumableReward(PRODUCT_IDS.AMBER_LARGE)).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.large });
    expect(consumableReward(PRODUCT_IDS.HINTS_SMALL)).toEqual({ kind: 'hints', amount: HINT_PACK_GRANTS.small });
    expect(consumableReward(PRODUCT_IDS.HINTS_LARGE)).toEqual({ kind: 'hints', amount: HINT_PACK_GRANTS.large });
  });

  it('returns undefined for non-consumable products', () => {
    expect(consumableReward(PRODUCT_IDS.PATRON_KEY)).toBeUndefined();
    expect(consumableReward(PRODUCT_IDS.COSMETIC_BUNDLE)).toBeUndefined();
  });

  it('every catalog entry has a fallback price and a positive amount', () => {
    for (const p of CONSUMABLE_PRODUCTS) {
      expect(p.fallbackPrice).toMatch(/^\$/);
      expect(p.reward.amount).toBeGreaterThan(0);
    }
  });

  it('amber packs escalate value per dollar and badge the genuine best value', () => {
    const byId = (id: string) => CONSUMABLE_PRODUCTS.find(p => p.productId === id)!;
    const small = byId(PRODUCT_IDS.AMBER_SMALL);
    const medium = byId(PRODUCT_IDS.AMBER_MEDIUM);
    const large = byId(PRODUCT_IDS.AMBER_LARGE);
    const perDollar = (p: typeof small) =>
      p.reward.amount / parseFloat(p.fallbackPrice.replace('$', ''));

    // Value must strictly increase with pack size (ladder psychology).
    expect(perDollar(medium)).toBeGreaterThan(perDollar(small));
    expect(perDollar(large)).toBeGreaterThan(perDollar(medium));

    // The "best value" badge belongs on the genuine best-per-dollar amber SKU.
    expect(large.bestValue).toBe(true);
    expect(medium.bestValue).toBeFalsy();
  });
});

describe('purchaseConsumable', () => {
  it('returns the reward to apply on success WITHOUT granting an entitlement', async () => {
    setBillingProvider(fakeProvider());
    // Consume the one-time first-purchase 2x so this checks the steady-state amount.
    await markAmberPurchaseMade();
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
    expect(res.success).toBe(true);
    expect(res.reward).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.medium });
    // Consumables must NOT leave an entitlement behind (they're repeatable).
    expect(await getGrantedEntitlements()).toEqual([]);
  });

  it('passes through a user cancellation', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, cancelled: true }),
    }));
    const res = await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
    expect(res.success).toBe(false);
    expect(res.cancelled).toBe(true);
    expect(res.reward).toBeUndefined();
  });

  it('reports a clean failure on billing_unavailable', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, error: 'billing_unavailable' }),
    }));
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(res.success).toBe(false);
    expect(res.error).toBe('billing_unavailable');
  });

  it('rejects an unknown product id', async () => {
    setBillingProvider(fakeProvider());
    const res = await purchaseConsumable('com.wordshift.not_a_real_sku');
    expect(res.success).toBe(false);
    expect(res.error).toBe('unknown_product');
  });
});

describe('cosmetic bundle entitlement', () => {
  it('maps the bundle product to the COSMETIC_BUNDLE entitlement', () => {
    expect(entitlementsForProduct(PRODUCT_IDS.COSMETIC_BUNDLE)).toEqual([ENTITLEMENTS.COSMETIC_BUNDLE]);
  });
});

describe('first-purchase amber double', () => {
  it('doubles the FIRST amber pack ever, then grants subsequent packs normally', async () => {
    setBillingProvider(fakeProvider());

    const first = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(first.success).toBe(true);
    expect(first.firstPurchaseDoubled).toBe(true);
    expect(first.reward).toEqual({
      kind: 'amber',
      amount: AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER,
    });
    expect(await hasMadeAmberPurchase()).toBe(true);

    const second = await purchaseConsumable(PRODUCT_IDS.AMBER_LARGE);
    expect(second.success).toBe(true);
    expect(second.firstPurchaseDoubled).toBeFalsy();
    expect(second.reward).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.large });
  });

  it('a hint pack purchase does NOT consume the amber first-purchase double', async () => {
    setBillingProvider(fakeProvider());
    const hints = await purchaseConsumable(PRODUCT_IDS.HINTS_LARGE);
    expect(hints.success).toBe(true);
    expect(hints.firstPurchaseDoubled).toBeFalsy();
    expect(hints.reward).toEqual({ kind: 'hints', amount: HINT_PACK_GRANTS.large });
    expect(await hasMadeAmberPurchase()).toBe(false);

    // The double is still live for the first actual amber pack.
    const amber = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
    expect(amber.firstPurchaseDoubled).toBe(true);
    expect(amber.reward!.amount).toBe(AMBER_PACK_GRANTS.medium * FIRST_PURCHASE_AMBER_MULTIPLIER);
  });

  it('a failed or cancelled amber purchase does NOT consume the double', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, cancelled: true }),
    }));
    await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(await hasMadeAmberPurchase()).toBe(false);

    setBillingProvider(fakeProvider());
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(res.firstPurchaseDoubled).toBe(true);
  });
});

describe('starter pack', () => {
  it('exposes catalog info with a fallback price and grants from gameBalance', () => {
    expect(STARTER_PACK_INFO.productId).toBe(PRODUCT_IDS.STARTER_PACK);
    expect(STARTER_PACK_INFO.fallbackPrice).toMatch(/^\$/);
    expect(STARTER_PACK_GRANTS.amber).toBeGreaterThan(0);
    expect(STARTER_PACK_GRANTS.hints).toBeGreaterThan(0);
  });

  it('is NOT a consumable (repeat-purchase path rejects it)', async () => {
    expect(consumableReward(PRODUCT_IDS.STARTER_PACK)).toBeUndefined();
    setBillingProvider(fakeProvider());
    const res = await purchaseConsumable(PRODUCT_IDS.STARTER_PACK);
    expect(res.success).toBe(false);
    expect(res.error).toBe('unknown_product');
  });

  it('maps to the STARTER_PACK entitlement', () => {
    expect(entitlementsForProduct(PRODUCT_IDS.STARTER_PACK)).toEqual([ENTITLEMENTS.STARTER_PACK]);
  });

  it('purchases once: grants amber+hints reward + the entitlement exactly once', async () => {
    let purchaseCalls = 0;
    setBillingProvider(fakeProvider({
      purchase: async (productId): Promise<PurchaseResult> => {
        purchaseCalls++;
        return { success: true, productId };
      },
    }));

    const first = await purchaseStarterPack();
    expect(first.success).toBe(true);
    expect(first.reward).toEqual({
      amber: STARTER_PACK_GRANTS.amber,
      hints: STARTER_PACK_GRANTS.hints,
    });
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(true);
    expect(purchaseCalls).toBe(1);

    // Second attempt is blocked BEFORE billing — no reward, no second charge.
    const second = await purchaseStarterPack();
    expect(second.success).toBe(false);
    expect(second.alreadyOwned).toBe(true);
    expect(second.reward).toBeUndefined();
    expect(purchaseCalls).toBe(1);
  });

  it('grants nothing on cancellation or failure', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, cancelled: true }),
    }));
    const cancelled = await purchaseStarterPack();
    expect(cancelled.success).toBe(false);
    expect(cancelled.cancelled).toBe(true);
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(false);

    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, error: 'billing_unavailable' }),
    }));
    const failed = await purchaseStarterPack();
    expect(failed.success).toBe(false);
    expect(failed.error).toBe('billing_unavailable');
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(false);
  });

  it('buying the starter pack does NOT consume the amber first-purchase double', async () => {
    setBillingProvider(fakeProvider());
    const starter = await purchaseStarterPack();
    expect(starter.success).toBe(true);
    expect(await hasMadeAmberPurchase()).toBe(false);

    const amber = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(amber.firstPurchaseDoubled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Store UI contracts (source-level, like appIntegration.test.ts): the modals
// are heavy RN components, so these pin the load-bearing patterns in source.
// ---------------------------------------------------------------------------

const readComponent = (name: string): string =>
  fs.readFileSync(
    path.resolve(__dirname, '../components/monetization', name),
    'utf8',
  );

describe('price pills wait for the store price (no live USD literals on a connected store)', () => {
  // Google Play shows the localized price on its sheet; the in-app pill must
  // not lead with a "$0.99" literal a French or Indian player will see
  // contradicted, and must not be tappable before billing can sell. The USD
  // catalog literals survive ONLY for the never-connected path (NoOp / Expo
  // Go), where they orient and the pill stays disabled.
  it('PatronModal keeps dollar fallback constants for the never-connected path only', () => {
    const src = readComponent('PatronModal.tsx');
    expect(src).toMatch(/export const PATRON_FALLBACK_PRICE = '\$\d+\.\d{2}'/);
    expect(src).toMatch(/export const REMOVE_ADS_FALLBACK_PRICE = '\$\d+\.\d{2}'/);
    expect(src).toContain('const showFallbackPrices = pricesSettled && !isBillingReady()');
    expect(src).toContain('priceString ?? (showFallbackPrices ? PATRON_FALLBACK_PRICE : STORE_PRICE_PLACEHOLDER)');
    expect(src).toContain('adsPriceString ?? (showFallbackPrices ? REMOVE_ADS_FALLBACK_PRICE : STORE_PRICE_PLACEHOLDER)');
    // The old price-less branches must not come back.
    expect(src).not.toMatch(/priceString\s*\?\s*`Become a Patron/);
    expect(src).not.toMatch(/adsPriceString\s*\?\s*`Remove Ads/);
  });

  it('PatronModal CTAs stay disabled until their store price has arrived', () => {
    const src = readComponent('PatronModal.tsx');
    expect(src).toContain('disabled={purchaseDisabled || !priceString}');
    expect(src).toContain('disabled={purchaseDisabled || !adsPriceString}');
  });

  it('every StoreModal purchase row routes its price through priceFor', () => {
    const src = readComponent('StoreModal.tsx');
    // Consumable amber/hint rows (fallbackPrice from the iap.ts catalog).
    expect(src).toContain('priceFor(info.productId, info.fallbackPrice)');
    // Starter-pack hero.
    expect(src).toContain('priceFor(STARTER_PACK_INFO.productId, STARTER_PACK_INFO.fallbackPrice)');
    // Cosmetic bundle + Supporter (named constants, not inline magic strings).
    expect(src).toMatch(/export const COSMETIC_BUNDLE_FALLBACK_PRICE = '\$\d+\.\d{2}'/);
    expect(src).toContain('priceFor(PRODUCT_IDS.COSMETIC_BUNDLE, COSMETIC_BUNDLE_FALLBACK_PRICE)');
    expect(src).toContain('priceFor(PRODUCT_IDS.SUPPORTER_SUB, SUPPORTER_SUB_FALLBACK_PRICE)');
    // No row reaches for a literal directly any more.
    expect(src).not.toContain('?? info.fallbackPrice');
    expect(src).not.toContain('?? STARTER_PACK_INFO.fallbackPrice');
    expect(src).not.toContain('?? COSMETIC_BUNDLE_FALLBACK_PRICE');
    expect(src).not.toContain('?? SUPPORTER_SUB_FALLBACK_PRICE');
    // priceFor: placeholder while loading, literal only when billing never connected, disabled without a live price.
    expect(src).toContain("if (live) return { label: live, available: true, note: '' };");
    expect(src).toContain('label: isBillingReady() ? STORE_PRICE_PLACEHOLDER : fallbackPrice');
    expect(src).toContain('disabled={disabled || !price.available}');
    expect(src).toContain('disabled={purchaseDisabled || !heroPrice.available}');
    expect(src).toContain('disabled={purchaseDisabled || !supporterPrice.available}');
    expect(src).toContain('disabled={purchaseDisabled || !bundlePrice.available}');
  });

  it('store-unavailable failures never show the unconfirmed-purchase copy', () => {
    for (const name of ['StoreModal.tsx', 'PatronModal.tsx']) {
      const src = readComponent(name);
      expect(src).toContain('isStoreUnavailableError(');
      expect(src).toContain('getStoreUnavailableMessage(phase)');
    }
    // The three provider errors that mean nothing was attempted.
    expect(isStoreUnavailableError('billing_unavailable')).toBe(true);
    expect(isStoreUnavailableError('product_not_found')).toBe(true);
    expect(isStoreUnavailableError('purchase_in_progress')).toBe(true);
    // A post-sheet failure keeps the "check your purchase history" path.
    expect(isStoreUnavailableError('purchase_failed')).toBe(false);
    expect(isStoreUnavailableError(undefined)).toBe(false);
  });

  it('the Supporter row states auto-renewal and the cancel location, with a manage link for subscribers', () => {
    const src = readComponent('StoreModal.tsx');
    expect(src).toContain('getSupporterRenewalNote(subscriptionStoreName)');
    expect(src).not.toContain('Cancel anytime.');
    expect(src).toContain('getManageSubscriptionLabel(phase)');
    expect(src).toContain('getSubscriptionManagementUrl(fallback)');
    expect(getSupporterRenewalNote('Google Play')).toBe('Renews monthly at the price shown until cancelled in Google Play.');
    expect(PLAY_SUBSCRIPTIONS_URL).toBe('https://play.google.com/store/account/subscriptions');
  });
});

describe('daily free-amber grant honors the recorded claim (no Patron over-grant)', () => {
  it('StoreModal uses one atomic claim service instead of separately recording and crediting', () => {
    const src = readComponent('StoreModal.tsx');
    const start = src.indexOf('const handleClaimDailyAmber');
    const end = src.indexOf('const handleBuyConsumable');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const claimFn = src.slice(start, end);

    // Behavioral save/retry/cap coverage lives in dailyAmberPurchase.test.ts.
    // This seam ensures the Store actually uses that operation.
    expect(claimFn).toContain('claimDailyAmberReward(');
    expect(claimFn).toContain('result.newBalance');
    expect(claimFn).not.toContain('recordDailyAmberClaim(');
    expect(claimFn).not.toContain('awardBonusAmber(');
  });

  it('the Free Amber card gates Patron Claim and the rewarded button identically', () => {
    const src = readComponent('StoreModal.tsx');
    const start = src.indexOf('{amberFaucet && (isPatronSync() || isAdsReady())');
    const end = src.indexOf(']}>AMBER</Text>', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const card = src.slice(start, end);

    // ONE shared availability gate covering both branches: at cap the Patron
    // pill and the rewarded button disappear together, and the copy flips to
    // "Collected for today". Asserted structurally (a single `available &&`
    // gate that both branches sit inside) rather than by matching one exact
    // JSX spelling, so a layout change cannot fail a policy test.
    expect(card.match(/amberFaucet\.available\s*&&/g) ?? []).toHaveLength(1);
    const gateIdx = card.search(/amberFaucet\.available\s*&&/);
    expect(card.indexOf('isPatronSync()', gateIdx)).toBeGreaterThan(gateIdx);
    expect(card.indexOf('RewardedAdButton', gateIdx)).toBeGreaterThan(gateIdx);
    expect(card).toContain('Collected for today. Come back tomorrow!');
  });

  it('the copy is cap-aware, and the cap branch never applies to Patrons', () => {
    const src = readComponent('StoreModal.tsx');
    // The faucet's 2/day counter and the SHARED 8/day rewarded cap are
    // independent, and RewardedAdButton hides itself at the shared cap — so a
    // faucet claim still owed past 8 views rendered "Watch a short clip. N left
    // today." beside nothing tappable. The cap has to be read (async, so it is
    // held as state, never called during render) and stated in the copy.
    expect(src).toContain('isRewardedCapReached');
    expect(src).not.toMatch(/\{\s*isRewardedCapReached\(\)/); // never inline in JSX

    const start = src.indexOf('{amberFaucet && (isPatronSync() || isAdsReady())');
    const end = src.indexOf(']}>AMBER</Text>', start);
    const card = src.slice(start, end);
    // Patrons never watch an ad for this (handleClaimDailyAmber grants direct),
    // so an ungated cap branch would withhold a claim they can still make.
    expect(card).toMatch(/!isPatronSync\(\) && rewardedCapReached/);

    // The cap state is refreshed on modal open AND after a claim (a claim
    // itself spends a rewarded view, so claim #2 at count 7 would otherwise
    // land back in the same contradiction).
    const claimStart = src.indexOf('const handleClaimDailyAmber');
    const claimEnd = src.indexOf('const handleBuyConsumable');
    expect(src.slice(claimStart, claimEnd)).toContain('isRewardedCapReached()');
  });
});
