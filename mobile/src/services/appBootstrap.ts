import { createBootCoordinator } from './bootCoordinator';
import { recoverPendingStorageTransaction } from './persistenceStorage';
import { installCloudProviderIfConfigured, maybeAutoRestoreOnFreshInstall, holdUploadsUntil } from './cloudSave';
import { runMigrations } from './dataMigration';
import { recoverPendingVictory } from './victoryPersistence';
import { getSettings, startSystemMotionPreference } from './settings';
import { initCosmetics } from './cosmetics';
import { initHints } from './hints';
import { loadEntitlements } from './entitlements';
import { loadPixelFonts } from '../theme/fonts';
import { initIAP, setBillingProvider, reconcilePendingConsumableGrants, settleConsumableGrant } from './iap';
import { initAds, setAdProvider } from './ads';
import { createRevenueCatBillingProvider } from './providers/revenueCatBilling';
import { createAdMobAdProvider } from './providers/googleAdMobAds';
import { initShareImage } from './shareImage';
import { logEvent } from './eventLogger';

/** Process-wide ordering survives Strict Mode cleanup/remount and retry. */
export const appBootstrap = createBootCoordinator({
  recoverStorage: recoverPendingStorageTransaction,
  installCloud: installCloudProviderIfConfigured,
  restoreCloud: maybeAutoRestoreOnFreshInstall,
  holdUploads: holdUploadsUntil,
  migrate: runMigrations,
  recoverVictory: recoverPendingVictory,
  async warmLocalState() {
    // Every synchronous first-render cache is authoritative before play opens.
    await Promise.all([getSettings(), initCosmetics(), initHints(), loadEntitlements(), loadPixelFonts()]);
  },
  reconcilePurchases: reconcilePendingConsumableGrants,
  settlePurchase: settleConsumableGrant,
  startSession(onMotionChange) {
    initShareImage();
    setBillingProvider(createRevenueCatBillingProvider());
    setAdProvider(createAdMobAdProvider());
    // SDK consent/network work is optional. It never holds the playable frame.
    void initIAP().catch((error) => console.warn('initIAP failed:', error));
    void initAds().catch((error) => console.warn('initAds failed:', error));
    logEvent({ type: 'app_open' });
    return startSystemMotionPreference(onMotionChange);
  },
});
