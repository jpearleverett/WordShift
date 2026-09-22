/**
 * Real-money checkout for the season premium track, and its analytics.
 *
 * Kept out of SeasonPassModal on purpose: that modal's AMBER unlock must never
 * log `iap_purchase` (seasonPremiumEvent.test.ts; the purchase-funnel view in
 * docs/supabase/analytics_views_v1.sql excludes rows of kind "season" as amber
 * spends). This is a real payment, so it logs the ordinary funnel events under
 * its own kind, `season_premium`, which that view counts.
 */
import { logEvent } from './eventLogger';
import { saveWithPlayerRetry } from './saveRetry';
import { purchaseSeasonPremium, settleConsumableGrant, isStoreUnavailableError, SEASON_PREMIUM_INFO } from './iap';

const KIND = 'season_premium';
const PAID_SAVE_COPY = {
  title: 'Your purchase is waiting',
  message: 'Your purchase was confirmed, but we could not save the premium track yet. Free some device storage if needed, then retry the save. You will not be charged again.',
};

export type SeasonPremiumCheckoutOutcome =
  | { status: 'unlocked'; amberBalance: number }
  /** Paid, but the track could not open any more: its amber price was added. */
  | { status: 'amber_instead'; amberBalance: number; amber: number }
  | { status: 'pending' }
  | { status: 'cancelled' }
  | { status: 'already_owned' }
  | { status: 'unavailable' }
  | { status: 'failed' };

export async function buySeasonPremium(puzzlesSolved: number): Promise<SeasonPremiumCheckoutOutcome> {
  const productId = SEASON_PREMIUM_INFO.productId;
  logEvent({ type: 'purchase_initiated', data: { productId, kind: KIND } });
  try {
    const result = await purchaseSeasonPremium(puzzlesSolved);
    if (result.success && result.grantId) {
      const credit = await saveWithPlayerRetry(() => settleConsumableGrant(result.grantId!), PAID_SAVE_COPY);
      logEvent({ type: 'iap_purchase', data: { productId, kind: KIND } });
      return credit.seasonOutcome === 'unavailable'
        ? { status: 'amber_instead', amberBalance: credit.amberBalance, amber: result.reward?.amount ?? 0 }
        : { status: 'unlocked', amberBalance: credit.amberBalance };
    }
    if (result.pending) return { status: 'pending' };
    if (result.cancelled) {
      logEvent({ type: 'purchase_cancelled', data: { productId, kind: KIND } });
      return { status: 'cancelled' };
    }
    if (result.alreadyOwned) return { status: 'already_owned' };
    logEvent({ type: 'purchase_failed', data: { productId, kind: KIND, reason: result.error ?? 'unknown' } });
    return { status: isStoreUnavailableError(result.error) ? 'unavailable' : 'failed' };
  } catch {
    logEvent({ type: 'purchase_failed', data: { productId, kind: KIND, reason: 'exception' } });
    return { status: 'failed' };
  }
}
