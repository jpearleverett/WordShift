/**
 * In-app purchase layer.
 *
 * A real billing SDK is a NATIVE module and would break Expo Go, so it is
 * abstracted behind a `BillingProvider` interface — exactly like `cloudSave.ts`
 * abstracts the cloud backend behind `CloudProvider`. The DEFAULT provider is a
 * `NoOpBillingProvider` (purchases fail cleanly), which keeps Expo Go / Jest
 * working; at boot App.tsx registers the live RevenueCat adapter
 * (`providers/revenueCatBilling.ts`) via `setBillingProvider()`, so real builds
 * sell for real whenever a RevenueCat key is configured.
 *
 * On a verified purchase/restore, this module translates products → entitlement
 * keys and writes them to `entitlements.ts`, which is what the rest of the app reads.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENTITLEMENTS,
  EntitlementKey,
  grantEntitlements,
  setEntitlements,
  loadEntitlements,
  getGrantedEntitlements,
  hasEntitlement,
  hasMadeAmberPurchase,
  markAmberPurchaseMade,
} from './entitlements';
import {
  AMBER_PACK_GRANTS,
  HINT_PACK_GRANTS,
  STARTER_PACK_GRANTS,
  FIRST_PURCHASE_AMBER_MULTIPLIER,
} from '../constants/gameBalance';

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------

/** Store product identifiers. Must match App Store Connect / Play Console product ids. */
export const PRODUCT_IDS = {
  PATRON_KEY: 'com.wordshift.patron_key',
  /** The Keeper's Collection — non-consumable cosmetic bundle (grants an entitlement). */
  COSMETIC_BUNDLE: 'com.wordshift.cosmetic_bundle',
  /** Remove Ads — ad-free + the victory 2x granted with no ad. */
  REMOVE_ADS: 'com.wordshift.remove_ads',
  /**
   * Supporter — an auto-renewing subscription (ad-free + monthly amber stipend
   * + exclusive cosmetic). Grants the `supporter` entitlement while active; the
   * live RevenueCat adapter keeps it in sync via customer-info updates, so a
   * lapsed sub drops the entitlement on the next restore/refresh.
   */
  SUPPORTER_SUB: 'com.wordshift.supporter_monthly',
  /** Starter Pack — one-time-per-account welcome bundle (amber + hints). */
  STARTER_PACK: 'com.wordshift.starter',
  // Consumable amber packs (repeatable; credit the amber reward balance).
  AMBER_SMALL: 'com.wordshift.amber_small',
  AMBER_MEDIUM: 'com.wordshift.amber_medium',
  AMBER_LARGE: 'com.wordshift.amber_large',
  // Consumable hint packs (repeatable; credit the hint balance).
  HINTS_SMALL: 'com.wordshift.hints_small',
  HINTS_LARGE: 'com.wordshift.hints_large',
} as const;

export type ProductId = string;

// ---------------------------------------------------------------------------
// Consumable catalog (amber + hint packs)
// ---------------------------------------------------------------------------

/** What a consumable purchase grants. Applied by the caller (StoreModal). */
export type ConsumableReward =
  | { kind: 'amber'; amount: number }
  | { kind: 'hints'; amount: number };

export interface ConsumableProductInfo {
  productId: ProductId;
  reward: ConsumableReward;
  /** Display name shown in the store. */
  name: string;
  /**
   * Short blurb. Deliberately does NOT repeat the reward quantity: the store
   * row renders `reward` as its own value line opposite the price, so the
   * blurb carries the REASON to pick this tier, not the number.
   */
  description: string;
  /** Marks the best-value tier in the UI. */
  bestValue?: boolean;
  /** Fallback price label when the store product isn't fetchable (e.g. Expo Go). */
  fallbackPrice: string;
}

/**
 * Consumable SKUs. Amber amounts come from `AMBER_PACK_GRANTS`, hint amounts from
 * `HINT_PACK_GRANTS` (gameBalance.ts) so balance lives in one place. These are
 * intentionally separate from the amber-bought cosmetic catalog — cash buys the
 * *currency/convenience*, never a specific cosmetic that's also amber-priced.
 */
export const CONSUMABLE_PRODUCTS: ConsumableProductInfo[] = [
  {
    productId: PRODUCT_IDS.AMBER_SMALL,
    reward: { kind: 'amber', amount: AMBER_PACK_GRANTS.small },
    name: 'Pouch of Amber',
    description: 'A little amber for the shop.',
    fallbackPrice: '$0.99',
  },
  {
    productId: PRODUCT_IDS.AMBER_MEDIUM,
    reward: { kind: 'amber', amount: AMBER_PACK_GRANTS.medium },
    name: 'Jar of Amber',
    description: 'More amber per coin.',
    fallbackPrice: '$2.99',
  },
  {
    productId: PRODUCT_IDS.AMBER_LARGE,
    reward: { kind: 'amber', amount: AMBER_PACK_GRANTS.large },
    name: 'Hoard of Amber',
    description: 'The most amber per coin.',
    bestValue: true,
    fallbackPrice: '$6.99',
  },
  {
    productId: PRODUCT_IDS.HINTS_SMALL,
    reward: { kind: 'hints', amount: HINT_PACK_GRANTS.small },
    name: 'Handful of Hints',
    description: "For when you're stuck.",
    fallbackPrice: '$0.99',
  },
  {
    productId: PRODUCT_IDS.HINTS_LARGE,
    reward: { kind: 'hints', amount: HINT_PACK_GRANTS.large },
    name: 'Satchel of Hints',
    description: 'Never caught short.',
    bestValue: true,
    fallbackPrice: '$2.99',
  },
];

/** The reward a consumable product grants, or undefined if it isn't a consumable. */
export function consumableReward(productId: ProductId): ConsumableReward | undefined {
  return CONSUMABLE_PRODUCTS.find(p => p.productId === productId)?.reward;
}

// ---------------------------------------------------------------------------
// Subscriptions (auto-renewing)
// ---------------------------------------------------------------------------

/**
 * Product ids that are auto-renewing SUBSCRIPTIONS rather than one-time/consumable
 * in-app products. This is the single source of truth the billing adapter uses to
 * pick the RevenueCat/Play product CATEGORY: subscriptions MUST be fetched with the
 * SUBSCRIPTION category and one-time products with NON_SUBSCRIPTION — a mismatch
 * returns [] on Android and the purchase dies as `product_not_found`.
 */
export const SUBSCRIPTION_PRODUCT_IDS: ReadonlySet<string> = new Set([
  PRODUCT_IDS.SUPPORTER_SUB,
]);

/** True when the product id is an auto-renewing subscription (see above). */
export function isSubscriptionProduct(productId: ProductId): boolean {
  return SUBSCRIPTION_PRODUCT_IDS.has(productId);
}

// ---------------------------------------------------------------------------
// Starter pack (one-time welcome bundle)
// ---------------------------------------------------------------------------

/** Display info for the one-time starter bundle (not part of the consumable catalog). */
export const STARTER_PACK_INFO = {
  productId: PRODUCT_IDS.STARTER_PACK as ProductId,
  name: "Keeper's Welcome",
  description: `${STARTER_PACK_GRANTS.amber} amber + ${STARTER_PACK_GRANTS.hints} hints. One per player, ever.`,
  fallbackPrice: '$1.99',
} as const;

export interface IapProduct {
  productId: ProductId;
  title: string;
  description: string;
  /** Localized, currency-formatted price string from the store (e.g. "$6.99"). */
  priceString: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: ProductId;
  /** Entitlement keys granted by this purchase (already written to entitlements.ts). */
  entitlements?: EntitlementKey[];
  /**
   * Store transaction id when the provider exposes one (RevenueCat:
   * transaction.transactionIdentifier). Used as the pending-grant ledger id so
   * a consumable grant is deduped against the exact store transaction.
   */
  transactionId?: string;
  /** True when the user dismissed the native purchase sheet. */
  cancelled?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface BillingProvider {
  initialize(): Promise<void>;
  getProducts(productIds: ProductId[]): Promise<IapProduct[]>;
  purchase(productId: ProductId): Promise<PurchaseResult>;
  /** Returns the authoritative set of entitlement keys the store reports as owned. */
  restorePurchases(): Promise<{ entitlements: EntitlementKey[]; error?: string }>;
  isReady(): boolean;
  getName(): string;
}

// ---------------------------------------------------------------------------
// No-op provider (placeholder until a real billing SDK is connected)
// ---------------------------------------------------------------------------

class NoOpBillingProvider implements BillingProvider {
  async initialize(): Promise<void> {
    console.log('[IAP] NoOp provider - no billing SDK configured');
  }
  async getProducts(): Promise<IapProduct[]> {
    return [];
  }
  async purchase(productId: ProductId): Promise<PurchaseResult> {
    console.log('[IAP] NoOp purchase - no billing SDK configured:', productId);
    return { success: false, productId, error: 'billing_unavailable' };
  }
  async restorePurchases(): Promise<{ entitlements: EntitlementKey[] }> {
    return { entitlements: [] };
  }
  isReady(): boolean {
    return false;
  }
  getName(): string {
    return 'Not Connected';
  }
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

let provider: BillingProvider = new NoOpBillingProvider();

/** Swap in a real billing provider during app initialization. */
export function setBillingProvider(newProvider: BillingProvider): void {
  provider = newProvider;
}

/** The active provider's display name (for diagnostics / Settings). */
export function getBillingProviderName(): string {
  return provider.getName();
}

/** Whether a real, configured billing backend is connected. */
export function isBillingReady(): boolean {
  return provider.isReady();
}

/**
 * Map a product to the entitlement keys it grants. Patron's Key grants the
 * `patron` entitlement; cosmetic products grant an entitlement keyed by product id.
 */
export function entitlementsForProduct(productId: ProductId): EntitlementKey[] {
  if (productId === PRODUCT_IDS.PATRON_KEY) return [ENTITLEMENTS.PATRON];
  if (productId === PRODUCT_IDS.REMOVE_ADS) return [ENTITLEMENTS.ADFREE];
  if (productId === PRODUCT_IDS.SUPPORTER_SUB) return [ENTITLEMENTS.SUPPORTER];
  if (productId === PRODUCT_IDS.COSMETIC_BUNDLE) return [ENTITLEMENTS.COSMETIC_BUNDLE];
  if (productId === PRODUCT_IDS.STARTER_PACK) return [ENTITLEMENTS.STARTER_PACK];
  return [productId];
}

/**
 * Initialize billing. Warms the entitlement cache first (so synchronous
 * entitlement checks work immediately), then initializes the provider.
 * Call from the App bootstrap gate alongside runMigrations().
 */
export async function initIAP(): Promise<void> {
  await loadEntitlements();
  try {
    await provider.initialize();
  } catch (error) {
    console.warn('[IAP] provider initialize failed:', error);
  }
}

/** Fetch displayable product info for the shop / Patron screen. */
export async function getProducts(
  productIds: ProductId[] = Object.values(PRODUCT_IDS),
): Promise<IapProduct[]> {
  try {
    return await provider.getProducts(productIds);
  } catch (error) {
    console.warn('[IAP] getProducts failed:', error);
    return [];
  }
}

/**
 * Purchase a product. On success, the granted entitlements are persisted to
 * entitlements.ts before returning, so callers can immediately read updated state.
 */
export async function purchaseProduct(productId: ProductId): Promise<PurchaseResult> {
  const result = await provider.purchase(productId);
  if (result.success) {
    const ents = result.entitlements && result.entitlements.length > 0
      ? result.entitlements
      : entitlementsForProduct(productId);
    await grantEntitlements(ents);
    return { ...result, entitlements: ents };
  }
  return result;
}

export interface ConsumablePurchaseResult {
  success: boolean;
  productId?: ProductId;
  /** The reward to apply on success (caller credits amber/hints). Already doubled when `firstPurchaseDoubled`. */
  reward?: ConsumableReward;
  /**
   * Pending-grant ledger id for this purchase. The caller MUST call
   * `acknowledgeConsumableGrant(grantId)` after applying `reward`, or the grant
   * will be re-served by `reconcilePendingConsumableGrants()` on the next
   * reconcile (that replay is the crash-safety net, not a bug).
   */
  grantId?: string;
  /** True when this was the player's first-ever amber pack — the amount was doubled. */
  firstPurchaseDoubled?: boolean;
  cancelled?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Pending consumable-grant ledger (crash safety between store success + grant)
// ---------------------------------------------------------------------------

/**
 * `purchaseConsumable` succeeds at the STORE, then returns the reward for the
 * caller (StoreModal) to apply. An app kill/crash in that window means the
 * player PAID and never received the amber/hints. This ledger closes the gap:
 * the grant is persisted BEFORE `purchaseConsumable` returns, the caller
 * acknowledges it after applying the reward, and anything left un-acked is
 * re-served by `reconcilePendingConsumableGrants()` (boot / store-open path)
 * until it is applied — never lost, and the ledger id (the store transaction
 * id when available) is the dedupe, so it is never double-granted either.
 *
 * Deliberately cache-less (fresh AsyncStorage read per op): this is a rare,
 * cold-path ledger and crash-safety is the whole point — no stale in-memory
 * state can disagree with disk. Device-local like `wordshift_entitlements`
 * (store-transaction-adjacent), so it is NOT in cloudSave.SYNC_KEYS, and it is
 * intentionally NOT cleared by Reset All (a reset must not destroy paid value
 * that was never delivered).
 */
export interface PendingConsumableGrant {
  /** Unique ledger id — store transaction id when available, else productId+timestamp. */
  grantId: string;
  productId: ProductId;
  /** Reward to apply (already includes the first-purchase 2x when applicable). */
  reward: ConsumableReward;
  purchasedAt: number;
  /** True when this grant's amber amount includes the one-time first-purchase 2x. */
  firstPurchaseDoubled?: boolean;
}

const PENDING_GRANTS_KEY = 'wordshift_pending_iap_grants';

/** Session-monotonic suffix so fallback grant ids can never collide in-session. */
let grantIdSeq = 0;

async function loadPendingGrants(): Promise<PendingConsumableGrant[]> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_GRANTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (g) => g && typeof g.grantId === 'string' && g.reward && typeof g.reward.amount === 'number',
        );
      }
    }
  } catch {
    /* ignore — fall through to empty */
  }
  return [];
}

async function savePendingGrants(grants: PendingConsumableGrant[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_GRANTS_KEY, JSON.stringify(grants));
}

/**
 * Persist a just-paid consumable grant. Returns the ledger id. A persist
 * failure must never fail the purchase (the caller still applies the returned
 * reward; only the crash-replay net is lost for that one grant), so this
 * swallows storage errors.
 */
async function persistPendingConsumableGrant(entry: {
  productId: ProductId;
  reward: ConsumableReward;
  transactionId?: string;
  firstPurchaseDoubled: boolean;
}): Promise<string> {
  const grantId =
    entry.transactionId ??
    `${entry.productId}:${Date.now()}:${++grantIdSeq}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    const grants = await loadPendingGrants();
    // The ledger is the dedupe: the same store transaction never gets two entries.
    if (!grants.some((g) => g.grantId === grantId)) {
      grants.push({
        grantId,
        productId: entry.productId,
        reward: entry.reward,
        purchasedAt: Date.now(),
        ...(entry.firstPurchaseDoubled ? { firstPurchaseDoubled: true } : {}),
      });
      await savePendingGrants(grants);
    }
  } catch (error) {
    console.warn('[IAP] failed to persist pending consumable grant:', error);
  }
  return grantId;
}

/**
 * All paid-but-not-yet-acknowledged consumable grants, oldest first. Grants
 * stay in the ledger until `acknowledgeConsumableGrant` clears them, so a boot
 * or store-open reconcile can re-apply anything a crash orphaned. Callers
 * apply each grant's reward, then acknowledge it.
 */
export async function reconcilePendingConsumableGrants(): Promise<PendingConsumableGrant[]> {
  return loadPendingGrants();
}

/**
 * Clear a grant from the ledger AFTER its reward has been applied. Idempotent —
 * acknowledging an unknown/already-acked id is a no-op.
 */
export async function acknowledgeConsumableGrant(grantId: string): Promise<void> {
  try {
    const grants = await loadPendingGrants();
    const remaining = grants.filter((g) => g.grantId !== grantId);
    if (remaining.length !== grants.length) {
      await savePendingGrants(remaining);
    }
  } catch (error) {
    console.warn('[IAP] failed to acknowledge consumable grant:', error);
  }
}

/**
 * Purchase a CONSUMABLE pack (amber / hints). Unlike `purchaseProduct`, this
 * grants NO entitlement (consumables are repeatable) — on success it returns the
 * `reward` to apply, and the caller credits amber (`awardBonusAmber`) or hints
 * (`addHints`). This mirrors the codebase convention where the purchase layer
 * records the transaction and the caller orchestrates the currency grant.
 *
 * First-purchase incentive: the first amber pack a player EVER buys grants
 * `FIRST_PURCHASE_AMBER_MULTIPLIER`x amber — the returned reward is already
 * doubled, and the one-time flag is consumed (persisted in entitlements.ts).
 *
 * Crash safety: the final reward is persisted to the pending-grant ledger
 * BEFORE this returns (see `PendingConsumableGrant`). The caller applies the
 * reward, then calls `acknowledgeConsumableGrant(result.grantId)`; if the app
 * dies in between, `reconcilePendingConsumableGrants()` re-serves the grant.
 */
export async function purchaseConsumable(productId: ProductId): Promise<ConsumablePurchaseResult> {
  const reward = consumableReward(productId);
  if (!reward) {
    return { success: false, productId, error: 'unknown_product' };
  }
  const result = await provider.purchase(productId);
  if (result.success) {
    let grantedReward: ConsumableReward = reward;
    let doubled = false;
    if (reward.kind === 'amber') {
      const isFirst = !(await hasMadeAmberPurchase());
      if (isFirst) {
        grantedReward = { kind: 'amber', amount: reward.amount * FIRST_PURCHASE_AMBER_MULTIPLIER };
        doubled = true;
      }
    }
    // Persist the paid-for grant BEFORE returning, so a kill between the store
    // success and the caller's apply can never lose the player's money.
    const grantId = await persistPendingConsumableGrant({
      productId,
      reward: grantedReward,
      transactionId: result.transactionId,
      firstPurchaseDoubled: doubled,
    });
    // Mark the one-time 2x flag AFTER the grant is safely on the ledger. If a
    // kill lands between the two, the grant still replays on reconcile (player
    // keeps their money) and the worst case is the next amber pack also doubles
    // — strictly player-favorable, versus the old ordering where a crash here
    // burned the flag AND left no ledger entry (paid, got nothing).
    if (doubled) {
      await markAmberPurchaseMade();
    }
    if (doubled) {
      return { success: true, productId, reward: grantedReward, grantId, firstPurchaseDoubled: true };
    }
    return { success: true, productId, reward: grantedReward, grantId };
  }
  return { success: false, productId, cancelled: result.cancelled, error: result.error };
}

export interface StarterPackPurchaseResult {
  success: boolean;
  productId?: ProductId;
  /** The bundle to apply on success (caller credits amber + hints). */
  reward?: { amber: number; hints: number };
  /**
   * Pending-ledger ids for the bundle's two grants (amber, hints). The caller
   * acknowledges each after applying its half of the reward — same crash-replay
   * contract as `purchaseConsumable` (see PendingConsumableGrant).
   */
  grantIds?: { amber?: string; hints?: string };
  /** True when the one-per-account limit blocked the purchase. */
  alreadyOwned?: boolean;
  cancelled?: boolean;
  error?: string;
}

/**
 * Purchase the one-time STARTER PACK bundle. One-per-account enforcement is the
 * `starter_pack` entitlement: owned → the purchase is refused before hitting
 * billing. On success the entitlement is granted (so it can never be re-bought
 * and survives store restore) and the amber+hints grants are returned for the
 * caller to apply — same convention as `purchaseConsumable`.
 */
export async function purchaseStarterPack(): Promise<StarterPackPurchaseResult> {
  const productId = PRODUCT_IDS.STARTER_PACK;
  if (await hasEntitlement(ENTITLEMENTS.STARTER_PACK)) {
    return { success: false, productId, alreadyOwned: true, error: 'already_owned' };
  }
  const result = await provider.purchase(productId);
  if (result.success) {
    await grantEntitlements([ENTITLEMENTS.STARTER_PACK]);
    // Same crash-replay net as purchaseConsumable: the entitlement persists
    // instantly, but the amber+hints currency grant could be lost to a kill
    // between this return and the caller's award. Two ledger entries (one per
    // reward kind) ride the existing consumable reconcile path.
    const txBase = result.transactionId;
    const amberGrantId = await persistPendingConsumableGrant({
      productId,
      reward: { kind: 'amber', amount: STARTER_PACK_GRANTS.amber },
      transactionId: txBase ? `${txBase}:amber` : undefined,
      firstPurchaseDoubled: false,
    });
    const hintsGrantId = await persistPendingConsumableGrant({
      productId,
      reward: { kind: 'hints', amount: STARTER_PACK_GRANTS.hints },
      transactionId: txBase ? `${txBase}:hints` : undefined,
      firstPurchaseDoubled: false,
    });
    return {
      success: true,
      productId,
      reward: { ...STARTER_PACK_GRANTS },
      grantIds: { amber: amberGrantId, hints: hintsGrantId },
    };
  }
  return { success: false, productId, cancelled: result.cancelled, error: result.error };
}

/**
 * Restore previously-purchased products. The store's reported set becomes the
 * authoritative local entitlement state.
 */
export async function restorePurchases(): Promise<{ entitlements: EntitlementKey[] }> {
  if (!provider.isReady()) {
    return { entitlements: await getGrantedEntitlements() };
  }
  const { entitlements, error } = await provider.restorePurchases();
  if (error) {
    return { entitlements: await getGrantedEntitlements() };
  }
  await setEntitlements(entitlements);
  return { entitlements };
}
