import type {
  BillingProvider,
  IapProduct,
  ProductId,
  PurchaseResult,
} from '../iap';
import type { EntitlementKey } from '../entitlements';

export interface RevenueCatConfig {
  iosKey?: string;
  androidKey?: string;
}

export function createRevenueCatBillingProvider(
  _config: RevenueCatConfig = {}
): BillingProvider {
  return {
    async initialize(): Promise<void> {},
    async getProducts(_productIds: ProductId[]): Promise<IapProduct[]> {
      return [];
    },
    async purchase(productId: ProductId): Promise<PurchaseResult> {
      return { success: false, productId, error: 'billing_unavailable' };
    },
    async restorePurchases(): Promise<{ entitlements: EntitlementKey[] }> {
      return { entitlements: [] };
    },
    isReady(): boolean {
      return false;
    },
    getName(): string {
      return 'RevenueCat (Web NoOp)';
    },
  };
}
