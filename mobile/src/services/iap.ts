import { Platform } from 'react-native';
import { getRuntimeConfig } from '../config/runtime';

interface IapStatus {
  enabled: boolean;
  configured: boolean;
  initialized: boolean;
  patronEntitled: boolean;
  provider: string;
  lastError: string | null;
}

interface PurchaseResult {
  success: boolean;
  patronEntitled: boolean;
  message: string;
}

let purchasesModule: any | null = null;
let initialized = false;
let patronEntitled = false;
let lastError: string | null = null;

function resolveApiKey(): string {
  const runtime = getRuntimeConfig();
  return Platform.OS === 'ios'
    ? runtime.revenueCatIosApiKey
    : runtime.revenueCatAndroidApiKey;
}

function isConfigured(): boolean {
  const runtime = getRuntimeConfig();
  return runtime.enableIap && Boolean(resolveApiKey());
}

function getPurchasesModule(): any | null {
  if (purchasesModule) return purchasesModule;
  try {
    const loaded = require('react-native-purchases');
    purchasesModule = loaded.default ?? loaded;
    return purchasesModule;
  } catch {
    return null;
  }
}

export async function initIap(): Promise<boolean> {
  if (initialized) return true;
  if (!isConfigured()) return false;

  const Purchases = getPurchasesModule();
  if (!Purchases) {
    lastError = 'react-native-purchases module not available';
    return false;
  }

  try {
    if (typeof Purchases.setLogLevel === 'function' && Purchases.LOG_LEVEL?.WARN) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
    }
    await Purchases.configure({ apiKey: resolveApiKey() });
    initialized = true;
    await syncIapEntitlement();
    return true;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    initialized = false;
    return false;
  }
}

async function extractPatronEntitlement(info: any): Promise<boolean> {
  const runtime = getRuntimeConfig();
  const entitlementId = runtime.revenueCatEntitlementId || 'patron';
  const active = info?.entitlements?.active;
  return Boolean(active && active[entitlementId]);
}

export async function syncIapEntitlement(): Promise<boolean> {
  if (!initialized) {
    const ok = await initIap();
    if (!ok) return false;
  }

  const Purchases = getPurchasesModule();
  if (!Purchases) return false;

  try {
    const info = await Purchases.getCustomerInfo();
    patronEntitled = await extractPatronEntitlement(info);
    return patronEntitled;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    return false;
  }
}

export async function isPatronEntitled(): Promise<boolean> {
  await syncIapEntitlement();
  return patronEntitled;
}

export async function purchasePatronEntitlement(): Promise<PurchaseResult> {
  if (!isConfigured()) {
    return {
      success: false,
      patronEntitled: false,
      message: 'IAP is not configured.',
    };
  }
  const ok = await initIap();
  if (!ok) {
    return {
      success: false,
      patronEntitled: false,
      message: 'Unable to initialize purchases.',
    };
  }

  const Purchases = getPurchasesModule();
  if (!Purchases) {
    return {
      success: false,
      patronEntitled: false,
      message: 'Purchases module unavailable.',
    };
  }

  const runtime = getRuntimeConfig();
  try {
    if (typeof Purchases.purchaseProduct === 'function') {
      await Purchases.purchaseProduct(runtime.revenueCatProductId);
    } else {
      const offerings = await Purchases.getOfferings();
      const current = offerings?.current;
      const targetPackage =
        current?.availablePackages?.find(
          (pkg: any) => pkg?.product?.identifier === runtime.revenueCatProductId
        ) ?? current?.availablePackages?.[0];
      if (!targetPackage) {
        return {
          success: false,
          patronEntitled: false,
          message: 'No purchasable packages found.',
        };
      }
      await Purchases.purchasePackage(targetPackage);
    }
    const entitled = await syncIapEntitlement();
    return {
      success: entitled,
      patronEntitled: entitled,
      message: entitled ? 'Patron Key unlocked.' : 'Purchase completed but entitlement was not detected yet.',
    };
  } catch (err: any) {
    if (err?.userCancelled) {
      return {
        success: false,
        patronEntitled: patronEntitled,
        message: 'Purchase cancelled.',
      };
    }
    lastError = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      patronEntitled: patronEntitled,
      message: 'Purchase failed. Please try again.',
    };
  }
}

export async function restorePatronEntitlement(): Promise<PurchaseResult> {
  if (!isConfigured()) {
    return {
      success: false,
      patronEntitled: false,
      message: 'IAP is not configured.',
    };
  }
  const ok = await initIap();
  if (!ok) {
    return {
      success: false,
      patronEntitled: false,
      message: 'Unable to initialize purchases.',
    };
  }

  const Purchases = getPurchasesModule();
  if (!Purchases || typeof Purchases.restorePurchases !== 'function') {
    return {
      success: false,
      patronEntitled: false,
      message: 'Restore is unavailable.',
    };
  }

  try {
    await Purchases.restorePurchases();
    const entitled = await syncIapEntitlement();
    return {
      success: entitled,
      patronEntitled: entitled,
      message: entitled ? 'Purchases restored.' : 'No Patron Key purchase found to restore.',
    };
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      patronEntitled: patronEntitled,
      message: 'Restore failed. Please try again.',
    };
  }
}

export function getIapStatus(): IapStatus {
  return {
    enabled: getRuntimeConfig().enableIap,
    configured: isConfigured(),
    initialized,
    patronEntitled,
    provider: 'RevenueCat',
    lastError,
  };
}
