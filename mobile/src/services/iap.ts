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

import AsyncStorage, { runStorageTransaction, isStorageTransactionActive } from './persistenceStorage';
import { saveWithPlayerRetry } from './saveRetry';
import { refreshEquippedOwnership } from './cosmetics';
import { claimSupporterStipendIfDue } from './supporterStipend';
import { awardBonusAmberInTransaction, getAmberBalance, invalidateProgressCache } from './amberCurrency';
import { addHintsInTransaction, getHintBalance, invalidateHintsCache } from './hints';
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
  invalidateEntitlementsCache,
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
  /** Verified store timestamp, never the device checkout clock. */
  purchasedAt?: number;
  /**
   * OTHER ids the store's receipt history uses for this SAME purchase. On
   * Google Play, RevenueCat's checkout result carries the Play order id while
   * its customerInfo.nonSubscriptionTransactions (the receipt-recovery surface
   * fed to `reconcileStorePurchaseHistory`) lists the same purchase under
   * RevenueCat's own transaction id. Every id here is recorded as already
   * covered in the same durable write as the grant, so recovery can never
   * re-credit a purchase the checkout path already delivered.
   */
  linkedTransactionIds?: string[];
  /** True when the user dismissed the native purchase sheet. */
  cancelled?: boolean;
  /** The store is waiting for payment approval; no reward is granted yet. */
  pending?: boolean;
  error?: string;
}

/**
 * Provider failures that mean the STORE could not take an order at all (nothing
 * was attempted, so there is no purchase to look for in a store history):
 * billing not connected / not yet configured, the product not visible to this
 * account, or another checkout still owning the flow. The UI shows a calm
 * "not available right now" for these and reserves the unconfirmed-purchase
 * copy for a failure AFTER the native sheet.
 */
export const STORE_UNAVAILABLE_ERRORS: ReadonlySet<string> = new Set([
  'billing_unavailable',
  'product_not_found',
  'purchase_in_progress',
]);

/** True when a purchase-result error means the store never took the order. */
export function isStoreUnavailableError(error: string | undefined): boolean {
  return error !== undefined && STORE_UNAVAILABLE_ERRORS.has(error);
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface BillingProvider {
  initialize(): Promise<void>;
  getProducts(productIds: ProductId[]): Promise<IapProduct[]>;
  purchase(productId: ProductId): Promise<PurchaseResult>;
  /**
   * Returns the entitlement keys the store reports as ACTIVE, plus (optionally)
   * the keys its explicit records mark INACTIVE (an expired subscription, a
   * refunded one-time purchase). iap.ts merges: active keys are granted, a
   * locally held key is dropped only when it is listed in `inactive`. A key the
   * response merely omits (another store account, a sparse reply) is kept.
   */
  restorePurchases(): Promise<{ entitlements: EntitlementKey[]; inactive?: EntitlementKey[]; error?: string }>;
  /**
   * Where the player manages (cancels) their subscription, when the store
   * reports one (RevenueCat: customerInfo.managementURL). Optional; absent or
   * null falls back to the platform's subscriptions page.
   */
  getSubscriptionManagementUrl?(): Promise<string | null>;
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
async function purchaseProductUnlocked(productId: ProductId): Promise<PurchaseResult> {
  const result = await provider.purchase(productId);
  if (result.success) {
    const reported = result.entitlements ?? [];
    // CustomerInfo can contain older purchases before its new entitlement
    // attachment appears. A verified known SKU still grants its own item.
    const expected = Object.values(PRODUCT_IDS).some(id => id === productId) || reported.length === 0
      ? entitlementsForProduct(productId) : [];
    const ents = [...new Set([...expected, ...reported])];
    await saveWithPlayerRetry(async () => {
      try {
        await runStorageTransaction('paid_entitlement', async () => {
          invalidateEntitlementsCache();
          await grantEntitlements(ents);
        });
      } catch (error) { invalidateEntitlementsCache(); throw error; }
    }, PAID_SAVE_COPY);
    if (ents.includes(ENTITLEMENTS.SUPPORTER)) await saveWithPlayerRetry(claimSupporterStipendIfDue, PAID_SAVE_COPY);
    notifyBillingChanges({ productId, entitlements: ents });
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
  /** The store is waiting for payment approval; no reward is granted yet. */
  pending?: boolean;
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
  /** Absent only on legacy/device-dated grants; never compare those to store time. */
  storePurchasedAt?: number;
  /** True when this grant's amber amount includes the one-time first-purchase 2x. */
  firstPurchaseDoubled?: boolean;
  /**
   * Receipt-history ids that name this same purchase (see
   * PurchaseResult.linkedTransactionIds). Recovery resolves a receipt to the
   * grant that owns it by grantId OR any linked id, and settling the grant
   * records every id as applied, so neither surface can re-credit it.
   */
  linkedIds?: string[];
}

const PENDING_GRANTS_KEY = 'wordshift_pending_iap_grants';
const APPLIED_GRANTS_KEY = 'wordshift_applied_iap_grants';
const PAID_SAVE_COPY = { title: 'Your purchase is waiting', message: 'Your purchase succeeded. We need to save its reward before continuing. Free some device storage if it is full, then retry. You will not be charged again.' };

/** Session-monotonic suffix so fallback grant ids can never collide in-session. */
let grantIdSeq = 0;

async function loadPendingGrants(): Promise<PendingConsumableGrant[]> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_GRANTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((g) => g && typeof g.grantId === 'string' && g.reward && typeof g.reward.amount === 'number')
          .map((g) => Array.isArray(g.linkedIds)
            ? { ...g, linkedIds: g.linkedIds.filter((id: unknown) => typeof id === 'string') }
            : g);
      }
    }
  } catch (error) {
    if (isStorageTransactionActive()) throw error;
    /* ignore — fall through to empty */
  }
  return [];
}

async function savePendingGrants(grants: PendingConsumableGrant[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_GRANTS_KEY, JSON.stringify(grants));
}

/**
 * Persist a just-paid consumable grant. Returns the ledger id. A persist
 * failure keeps the paid result in memory and retries its storage operation.
 * Retrying never invokes provider.purchase again.
 */
interface GrantIntent {
  productId: ProductId;
  reward: ConsumableReward;
  transactionId?: string;
  /** Verified store timestamp, never the device checkout clock. */
  purchasedAt?: number;
  /**
   * Receipt-history ids that describe this same purchase under another name
   * (see PurchaseResult.linkedTransactionIds; for the starter pack each id
   * already carries its `:amber` / `:hints` suffix). Stored on the pending
   * grant in the SAME transaction, so receipt recovery resolves those ids to
   * this grant before it settles and finds them applied after.
   */
  linkedTransactionIds?: string[];
  firstPurchaseDoubled: boolean;
}

/**
 * How far apart the checkout's own record of a purchase and the receipt-history
 * entry for it may be dated and still be treated as the same purchase, when the
 * checkout could not link the receipt id directly. Play's `purchaseDate` and
 * RevenueCat's receipt date are produced by different systems and have been
 * observed to disagree by seconds; a checkout whose store date failed to parse
 * falls back to the device clock. Two minutes covers both, and it cannot
 * swallow a distinct repeat purchase: each checkout acquires at most ONE
 * receipt alias, and a receipt links only to the nearest unlinked checkout.
 */
export const RECEIPT_MATCH_WINDOW_MS = 2 * 60_000;
const CHECKOUT_RECEIPTS_KEY = 'wordshift_iap_checkout_receipts';
/**
 * Where a malformed checkout-receipt record is parked instead of trapping every
 * purchase and recovery in a retry dialog. Device-local, never cloud-synced,
 * kept for diagnosis; the applied-grant set still dedupes delivered grants.
 */
export const CHECKOUT_RECEIPTS_QUARANTINE_KEY = 'wordshift_iap_checkout_receipts_quarantine';
interface CheckoutReceipt {
  grantId: string;
  productId: ProductId;
  purchasedAt: number;
  linkedIds: string[];
}
function isValidCheckoutReceipts(receipts: unknown): receipts is CheckoutReceipt[] {
  return Array.isArray(receipts) && receipts.every(item => item && typeof item.grantId === 'string' &&
    typeof item.productId === 'string' && Number.isFinite(item.purchasedAt) &&
    Array.isArray(item.linkedIds) && item.linkedIds.every((id: unknown) => typeof id === 'string'));
}

/**
 * Must run inside a storage transaction. A malformed record used to throw here
 * forever, which trapped the player in the purchase-retry dialog with no way
 * out. It is now moved aside (quarantine key) and treated as empty: these
 * records only ever PREVENT a double credit of a late receipt, while the
 * applied-grant set still blocks re-crediting every settled grant.
 */
async function loadCheckoutReceipts(): Promise<CheckoutReceipt[]> {
  const raw = await AsyncStorage.getItem(CHECKOUT_RECEIPTS_KEY);
  if (raw === null) return [];
  let receipts: unknown;
  try { receipts = JSON.parse(raw); } catch { receipts = undefined; }
  if (isValidCheckoutReceipts(receipts)) return receipts;
  console.warn('[IAP] Quarantined a malformed checkout-receipt record');
  await AsyncStorage.setItem(CHECKOUT_RECEIPTS_QUARANTINE_KEY, raw);
  await AsyncStorage.setItem(CHECKOUT_RECEIPTS_KEY, '[]');
  return [];
}

function receiptCoveredByGrant(transaction: StorePurchaseTransaction, receipts: CheckoutReceipt[]): CheckoutReceipt[] {
  // A checkout may acquire one receipt-history alias, and a receipt links to
  // ONE checkout only (the nearest in time), so two purchases of the same pack
  // inside the window each keep their own credit. Once linked, a checkout can
  // never swallow a distinct repeat purchase of the same pack.
  let nearest: CheckoutReceipt | null = null;
  for (const grant of receipts) {
    if (grant.productId !== transaction.productId || grant.linkedIds.length > 0) continue;
    const distance = Math.abs(grant.purchasedAt - transaction.purchasedAt);
    if (distance > RECEIPT_MATCH_WINDOW_MS) continue;
    if (nearest === null || distance < Math.abs(nearest.purchasedAt - transaction.purchasedAt)) nearest = grant;
  }
  if (!nearest) return [];
  // The starter bundle records its amber and hints halves as two checkout
  // entries of one purchase; the receipt names both, so both take the alias.
  if (transaction.productId === PRODUCT_IDS.STARTER_PACK) {
    const anchor = nearest;
    return receipts.filter(grant => grant.productId === anchor.productId && grant.linkedIds.length === 0 &&
      grant.purchasedAt === anchor.purchasedAt);
  }
  return [nearest];
}

async function persistPendingConsumableGrants(entries: GrantIntent[]): Promise<string[]> {
  // One device instant for the whole batch: a starter bundle's two halves are
  // one purchase and must carry the same fallback time.
  const checkoutNow = Date.now();
  const intents: PendingConsumableGrant[] = entries.map(entry => {
    const grantId = entry.transactionId ?? `${entry.productId}:${Date.now()}:${++grantIdSeq}:${Math.random().toString(36).slice(2,8)}`;
    const linkedIds = (entry.linkedTransactionIds ?? [])
      .filter(id => typeof id === 'string' && id.length > 0 && id !== grantId);
    return {
      grantId, productId: entry.productId, reward: entry.reward, purchasedAt: entry.purchasedAt ?? checkoutNow,
      ...(Number.isFinite(entry.purchasedAt) ? { storePurchasedAt: entry.purchasedAt } : {}),
      ...(entry.firstPurchaseDoubled ? {firstPurchaseDoubled:true} : {}),
      ...(linkedIds.length > 0 ? {linkedIds} : {}),
    };
  });
  // Retry storage only; never call the store purchase API a second time.
  await saveWithPlayerRetry(async () => { try { await runStorageTransaction('paid_grant_intent', async () => {
    const grants = await loadPendingGrants();
    const receipts = await loadCheckoutReceipts();
    const applied = new Set<string>(JSON.parse(await AsyncStorage.getItem(APPLIED_GRANTS_KEY) ?? '[]'));
    for (const intent of intents) {
      // Always record the checkout: when the store date was missing or
      // unparseable the device clock stands in, and the widened match window
      // absorbs the difference to the receipt's own date.
      if (!receipts.some(receipt => receipt.grantId === intent.grantId)) {
        receipts.push({ grantId: intent.grantId, productId: intent.productId,
          purchasedAt: intent.storePurchasedAt ?? intent.purchasedAt, linkedIds: intent.linkedIds ?? [] });
      }
      if (!applied.has(intent.grantId) && !grants.some(grant => grant.grantId===intent.grantId)) grants.push(intent);
    }
    await savePendingGrants(grants);
    await AsyncStorage.setItem(CHECKOUT_RECEIPTS_KEY, JSON.stringify(receipts));
    if (entries.some(entry=>entry.firstPurchaseDoubled)) await markAmberPurchaseMade();
    if (entries.some(entry=>entry.productId===PRODUCT_IDS.STARTER_PACK)) await grantEntitlements([ENTITLEMENTS.STARTER_PACK]);
  }); } catch(error) { invalidateEntitlementsCache(); throw error; } }, PAID_SAVE_COPY);
  return intents.map(intent=>intent.grantId);
}

async function persistPendingConsumableGrant(entry: GrantIntent): Promise<string> {
  return (await persistPendingConsumableGrants([entry]))[0];
}

/** Credit + ledger acknowledgement + applied-ID receipt share one commit. */
export async function settleConsumableGrant(grantId: string): Promise<{ amberBalance: number; hintBalance: number; applied: boolean }> {
  let productId: string | undefined;
  try {
    const result = await runStorageTransaction('paid_grant_credit', async () => {
      const applied = new Set<string>(JSON.parse(await AsyncStorage.getItem(APPLIED_GRANTS_KEY) ?? '[]'));
      const grants = await loadPendingGrants();
      const grant = grants.find(item => item.grantId===grantId);
      productId = grant?.productId;
      // A starter bundle becomes complete only after both halves settle.
      if (productId === PRODUCT_IDS.STARTER_PACK && grants.some(item =>
        item.productId === PRODUCT_IDS.STARTER_PACK && item.grantId !== grantId && !applied.has(item.grantId))) productId = undefined;
      if (!grant && !applied.has(grantId)) throw new Error('Paid reward intent needs recovery');
      if (grant && !applied.has(grantId)) {
        if (!Number.isFinite(grant.reward.amount) || grant.reward.amount<0) throw new Error('Invalid paid reward');
        if (grant.reward.kind==='amber') await awardBonusAmberInTransaction(grant.reward.amount, `iap_${grant.productId}`);
        else if (grant.reward.kind==='hints') await addHintsInTransaction(grant.reward.amount, `iap_${grant.productId}`);
        else throw new Error('Invalid paid reward kind');
        applied.add(grantId);
        for (const linked of grant.linkedIds ?? []) applied.add(linked);
        await AsyncStorage.setItem(APPLIED_GRANTS_KEY, JSON.stringify([...applied]));
      }
      await savePendingGrants(grants.filter(item=>item.grantId!==grantId));
      return {amberBalance:await getAmberBalance(), hintBalance:await getHintBalance(), applied:!!grant};
    });
    notifyBillingChanges({ productId });
    return result;
  } catch(error) { invalidateProgressCache(); invalidateHintsCache(); throw error; }
}

/**
 * All paid-but-not-yet-acknowledged consumable grants, oldest first. Grants
 * stay in the ledger until `acknowledgeConsumableGrant` clears them, so a boot
 * or store-open reconcile can re-apply anything a crash orphaned. Callers
 * apply each grant's reward, then acknowledge it.
 */
export async function reconcilePendingConsumableGrants(): Promise<PendingConsumableGrant[]> {
  return runStorageTransaction('paid_grant_recovery_snapshot', loadPendingGrants);
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
    if (isStorageTransactionActive()) throw error;
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
async function purchaseConsumableUnlocked(productId: ProductId): Promise<ConsumablePurchaseResult> {
  const reward = consumableReward(productId);
  if (!reward) {
    return { success: false, productId, error: 'unknown_product' };
  }
  const result = await provider.purchase(productId);
  if (result.success) {
    let grantedReward: ConsumableReward = reward;
    let doubled = false;
    if (reward.kind === 'amber') {
      const isFirst = !(await saveWithPlayerRetry(hasMadeAmberPurchase, PAID_SAVE_COPY));
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
      purchasedAt: result.purchasedAt,
      linkedTransactionIds: result.linkedTransactionIds,
      firstPurchaseDoubled: doubled,
    });
    if (doubled) {
      return { success: true, productId, reward: grantedReward, grantId, firstPurchaseDoubled: true };
    }
    return { success: true, productId, reward: grantedReward, grantId };
  }
  return { success: false, productId, cancelled: result.cancelled, pending: result.pending, error: result.error };
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
  /** The store is waiting for payment approval; no reward is granted yet. */
  pending?: boolean;
  error?: string;
}

/**
 * Purchase the one-time STARTER PACK bundle. One-per-account enforcement is the
 * `starter_pack` entitlement: owned → the purchase is refused before hitting
 * billing. On success the entitlement is granted (so it can never be re-bought
 * and survives store restore) and the amber+hints grants are returned for the
 * caller to apply — same convention as `purchaseConsumable`.
 */
async function purchaseStarterPackUnlocked(): Promise<StarterPackPurchaseResult> {
  const productId = PRODUCT_IDS.STARTER_PACK;
  if (await hasEntitlement(ENTITLEMENTS.STARTER_PACK)) {
    return { success: false, productId, alreadyOwned: true, error: 'already_owned' };
  }
  const result = await provider.purchase(productId);
  if (result.success) {
    // Both currency intents become durable together before the entitlement.
    const txBase = result.transactionId;
    // The receipt-history alias covers both halves of the bundle too.
    const linked = (kind: 'amber' | 'hints') =>
      (result.linkedTransactionIds ?? []).map(id => `${id}:${kind}`);
    const [amberGrantId, hintsGrantId] = await persistPendingConsumableGrants([
      {productId,reward:{kind:'amber',amount:STARTER_PACK_GRANTS.amber},
        transactionId:txBase ? `${txBase}:amber` : undefined,purchasedAt:result.purchasedAt,linkedTransactionIds:linked('amber'),firstPurchaseDoubled:false},
      {productId,reward:{kind:'hints',amount:STARTER_PACK_GRANTS.hints},
        transactionId:txBase ? `${txBase}:hints` : undefined,purchasedAt:result.purchasedAt,linkedTransactionIds:linked('hints'),firstPurchaseDoubled:false},
    ]);
    return {
      success: true,
      productId,
      reward: { ...STARTER_PACK_GRANTS },
      grantIds: { amber: amberGrantId, hints: hintsGrantId },
    };
  }
  return { success: false, productId, cancelled: result.cancelled, pending: result.pending, error: result.error };
}

/**
 * Restore previously-purchased products. Active keys the store reports are
 * granted; a locally held key is removed only when the store explicitly marks
 * it inactive (the same rule the customer-info listener applies). Restoring
 * while signed in to a different store account therefore never strips a
 * permanent purchase this device already owns.
 */
export async function restorePurchases(): Promise<{ entitlements: EntitlementKey[]; error?: string }> {
  if (checkoutDone) return { entitlements: await getGrantedEntitlements(), error: 'purchase_in_progress' };
  const release = beginCheckout();
  try {
    if (!provider.isReady()) {
      return { entitlements: await getGrantedEntitlements(), error: 'billing_unavailable' };
    }
    const { entitlements: active, inactive = [], error } = await provider.restorePurchases();
    if (error) return { entitlements: await getGrantedEntitlements(), error };
    let entitlements: EntitlementKey[] = active;
    try {
      await saveWithPlayerRetry(async () => {
        try {
          await runStorageTransaction('restore_entitlements', async () => {
            invalidateEntitlementsCache();
            const kept = (await getGrantedEntitlements())
              .filter(key => active.includes(key) || !inactive.includes(key));
            entitlements = [...new Set([...kept, ...active])];
            await setEntitlements(entitlements);
          });
        } catch (error) { invalidateEntitlementsCache(); throw error; }
      }, { title: 'Your purchases are waiting', message: 'We could not save your restored purchases yet. Free some device storage if it is full, then retry. You will not be charged.' });
    } catch (error) { invalidateEntitlementsCache(); throw error; }
    notifyBillingChanges({ entitlements: entitlements.filter(key => key !== ENTITLEMENTS.STARTER_PACK) });
    return { entitlements };
  } finally { release(); }
}

/** Platform subscriptions pages, used when the store reports no management URL. */
export const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';
export const APP_STORE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

/**
 * Where an active subscriber manages (cancels) their subscription. Prefers the
 * store-reported management URL (RevenueCat customerInfo.managementURL); the
 * caller supplies the platform's subscriptions page as the fallback so this
 * module stays free of react-native imports.
 */
export async function getSubscriptionManagementUrl(fallbackUrl: string): Promise<string> {
  try {
    const url = await provider.getSubscriptionManagementUrl?.();
    if (typeof url === 'string' && /^https?:\/\//.test(url)) return url;
  } catch (error) {
    console.warn('[IAP] management URL lookup failed:', error);
  }
  return fallbackUrl;
}

/** Process-wide, synchronous lock: remounts and two taps in one React frame
 * cannot open a second native sheet or race a restore against a paid grant. */
let checkoutDone: Promise<void> | null = null;
function beginCheckout(): () => void {
  let release!: () => void;
  checkoutDone = new Promise<void>(resolve => { release = resolve; });
  return () => { checkoutDone = null; release(); };
}
async function runCheckout<T extends PurchaseResult>(productId: ProductId, purchase: () => Promise<T>): Promise<T> {
  if (checkoutDone) return { success: false, productId, error: 'purchase_in_progress' } as T;
  const release = beginCheckout();
  try { return await purchase(); } finally { release(); }
}
export function purchaseProduct(productId: ProductId): Promise<PurchaseResult> {
  return runCheckout(productId, () => purchaseProductUnlocked(productId));
}
export function purchaseConsumable(productId: ProductId): Promise<ConsumablePurchaseResult> {
  return runCheckout(productId, () => purchaseConsumableUnlocked(productId));
}
export function purchaseStarterPack(): Promise<StarterPackPurchaseResult> {
  return runCheckout(PRODUCT_IDS.STARTER_PACK, purchaseStarterPackUnlocked);
}

/** Verified receipt history from the billing SDK, never from player input. */
export interface StorePurchaseTransaction {
  transactionId: string;
  productId: ProductId;
  purchasedAt: number;
}

// Local purchase-history receipts survive Reset All and are deliberately absent
// from cloud saves. Replaying spent consumables after a restore would mint money.
const HISTORY_BASELINE_KEY = 'wordshift_iap_history_baseline';

function validStoreTransactions(transactions: StorePurchaseTransaction[]): StorePurchaseTransaction[] {
  return transactions.filter(transaction =>
    typeof transaction.transactionId === 'string' && transaction.transactionId.length > 0 &&
    (consumableReward(transaction.productId) || transaction.productId === PRODUCT_IDS.STARTER_PACK) &&
    Number.isFinite(transaction.purchasedAt));
}

/** Establish the upgrade/install boundary BEFORE the first native checkout.
 * Old transactions may already have been spent under an older app version or
 * restored cloud save, so historical unknown receipts are never granted again. */
export async function initializeStorePurchaseHistory(transactions: StorePurchaseTransaction[]): Promise<void> {
  try {
    await runStorageTransaction('iap_history_baseline', async () => {
      const stored = await AsyncStorage.getItem(HISTORY_BASELINE_KEY);
      const valid = validStoreTransactions(transactions);
      const baseline: unknown = stored === null ? valid.map(item => item.transactionId) : JSON.parse(stored);
      if (!Array.isArray(baseline) || !baseline.every(id => typeof id === 'string')) throw new Error('Purchase history needs recovery');
      if (stored === null) await AsyncStorage.setItem(HISTORY_BASELINE_KEY, JSON.stringify(baseline));
      const applied = new Set<string>(JSON.parse(await AsyncStorage.getItem(APPLIED_GRANTS_KEY) ?? '[]'));
      // Only an old or already-delivered pack can consume this offer here.
      // A new checkout callback must leave its legitimate first bonus intact.
      if (valid.some(item => consumableReward(item.productId)?.kind === 'amber' &&
          (baseline.includes(item.transactionId) || applied.has(item.transactionId)))) {
        invalidateEntitlementsCache();
        await markAmberPurchaseMade();
      }
    });
  } catch (error) { invalidateEntitlementsCache(); throw error; }
}

let historyRecovery: Promise<void> = Promise.resolve();
/** Recover completed payments that never reached the purchase promise (app
 * killed during checkout, delayed payment approval). The callback may arrive
 * before purchaseStoreProduct resolves, so first let that path record its exact
 * reward/first-purchase bonus. Settlement then shares its transaction ID dedupe. */
export function reconcileStorePurchaseHistory(transactions: StorePurchaseTransaction[]): Promise<void> {
  const run = historyRecovery.catch(() => {}).then(async () => {
    while (checkoutDone) await checkoutDone;
    const release = beginCheckout();
    try {
    const sorted = validStoreTransactions(transactions).sort((a, b) => a.purchasedAt - b.purchasedAt);
    for (const transaction of sorted) {
      const snapshot = await saveWithPlayerRetry(() => runStorageTransaction('iap_history_snapshot', async () => {
        const raw = await AsyncStorage.getItem(HISTORY_BASELINE_KEY);
        if (raw === null) throw new Error('Purchase history has not been initialized');
        const baseline = new Set<string>(JSON.parse(raw));
        const applied = new Set<string>(JSON.parse(await AsyncStorage.getItem(APPLIED_GRANTS_KEY) ?? '[]'));
        const pending = await loadPendingGrants();
        return { ignored: baseline.has(transaction.transactionId), applied, pending, receipts: await loadCheckoutReceipts() };
      }), PAID_SAVE_COPY);
      if (snapshot.ignored) continue;
      const ids = transaction.productId === PRODUCT_IDS.STARTER_PACK
        ? [`${transaction.transactionId}:amber`, `${transaction.transactionId}:hints`]
        : [transaction.transactionId];
      if (ids.every(id => snapshot.applied.has(id))) continue;
      // A checkout grant may hold this receipt under its OWN id (the Play
      // order id) with the receipt id linked: settle that grant, never a copy.
      const settleIds = ids.map(id =>
        snapshot.pending.find(grant => grant.grantId === id || grant.linkedIds?.includes(id))?.grantId ?? id);
      if (!settleIds.some(id => snapshot.pending.some(grant => grant.grantId === id))) {
        // Same product, same moment as a grant this device already recorded
        // under another id (a lagging customer info left no linked id to
        // match): the checkout path owns its delivery, so never re-grant it.
        const covered = receiptCoveredByGrant(transaction, snapshot.receipts);
        if (covered.length > 0) {
          // Record the receipt's own ids as delivered NOW: the covering grant
          // knows nothing of this id, so once it has settled (or the app
          // restarts before the caller settles) nothing else would
          // stop the next reconcile from crediting the same purchase again.
          await saveWithPlayerRetry(() => recordReceiptAliases(ids, covered.map(grant => grant.grantId)), PAID_SAVE_COPY);
          continue;
        }
        await saveWithPlayerRetry(() => persistRecoveredStorePurchase(transaction), PAID_SAVE_COPY);
      }
      for (const id of settleIds) await saveWithPlayerRetry(() => settleConsumableGrant(id), PAID_SAVE_COPY);
    }
    } finally { release(); }
  });
  historyRecovery = run;
  return run;
}

/**
 * Durably mark receipt-history ids as already delivered: they name a purchase
 * this device credited under another id (the checkout grant), so neither the
 * listener nor a later cold-start reconcile may credit them again.
 */
async function recordReceiptAliases(ids: string[], coveringGrantIds: string[]): Promise<void> {
  await runStorageTransaction('iap_receipt_alias', async () => {
    const applied = new Set<string>(JSON.parse(await AsyncStorage.getItem(APPLIED_GRANTS_KEY) ?? '[]'));
    for (const id of ids) applied.add(id);
    await AsyncStorage.setItem(APPLIED_GRANTS_KEY, JSON.stringify([...applied]));
    const receipts = await loadCheckoutReceipts();
    for (const receipt of receipts) {
      if (coveringGrantIds.includes(receipt.grantId)) receipt.linkedIds = ids;
    }
    await AsyncStorage.setItem(CHECKOUT_RECEIPTS_KEY, JSON.stringify(receipts));
  });
}

async function persistRecoveredStorePurchase(transaction: StorePurchaseTransaction): Promise<void> {
  try {
    await runStorageTransaction('iap_recovered_payment', async () => {
      invalidateEntitlementsCache();
      const pending = await loadPendingGrants();
      const applied = new Set<string>(JSON.parse(await AsyncStorage.getItem(APPLIED_GRANTS_KEY) ?? '[]'));
      const starter = transaction.productId === PRODUCT_IDS.STARTER_PACK;
      const reward = consumableReward(transaction.productId);
      const doubled = reward?.kind === 'amber' && !(await hasMadeAmberPurchase());
      const rewards: ConsumableReward[] = starter
        ? [{ kind: 'amber', amount: STARTER_PACK_GRANTS.amber }, { kind: 'hints', amount: STARTER_PACK_GRANTS.hints }]
        : reward ? [{ ...reward, amount: reward.amount * (doubled ? FIRST_PURCHASE_AMBER_MULTIPLIER : 1) }] : [];
      for (const item of rewards) {
        const grantId = starter ? `${transaction.transactionId}:${item.kind}` : transaction.transactionId;
        if (applied.has(grantId) || pending.some(grant => grant.grantId === grantId)) continue;
        pending.push({ grantId, productId: transaction.productId, reward: item, purchasedAt: transaction.purchasedAt,
          ...(doubled ? { firstPurchaseDoubled: true } : {}) });
      }
      await savePendingGrants(pending);
      if (doubled) await markAmberPurchaseMade();
      if (starter) await grantEntitlements([ENTITLEMENTS.STARTER_PACK]);
    });
  } catch (error) { invalidateEntitlementsCache(); throw error; }
}


export interface BillingChange {
  productId?: string;
  entitlements?: readonly string[];
}
const billingListeners = new Set<(change: BillingChange) => void>();
/** UI refreshes happen only after durable ownership/currency commits. */
export function subscribeBillingChanges(listener: (change: BillingChange) => void): () => void {
  billingListeners.add(listener);
  return () => { billingListeners.delete(listener); };
}
export function notifyBillingChanges(change: BillingChange = {}): void {
  refreshEquippedOwnership();
  billingListeners.forEach(listener => {
    try { listener(change); } catch (error) { console.warn('[IAP] Purchase UI refresh failed:', error); }
  });
}
