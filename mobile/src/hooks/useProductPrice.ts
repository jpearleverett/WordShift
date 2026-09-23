import { useEffect, useState } from 'react';
import { getProducts, isBillingReady, ProductId } from '../services/iap';

export interface ProductPrice {
  /** The store's localized price, the catalog fallback (no store), or '' while unknown. */
  label: string;
  /** True only when the store returned this product: never sell against a guessed price. */
  available: boolean;
}

/**
 * Localized price for ONE product, fetched while `active`. Mirrors the Store's
 * cold-start handling: billing initializes fire-and-forget, so wait briefly for
 * it before fetching, and retry once on an empty reply. With no billing at all
 * (Expo Go, web) the catalog fallback is shown for orientation but the product
 * stays unavailable.
 */
export function useProductPrice(productId: ProductId, fallbackPrice: string, active: boolean): ProductPrice {
  const [price, setPrice] = useState<ProductPrice>({ label: '', available: false });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 10 && !isBillingReady() && !cancelled; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      if (cancelled) return;
      let products = await getProducts([productId]);
      if (products.length === 0 && !cancelled) {
        await new Promise(resolve => setTimeout(resolve, 600));
        products = await getProducts([productId]);
      }
      if (cancelled) return;
      const live = products.find(product => product.productId === productId)?.priceString;
      setPrice(live
        ? { label: live, available: true }
        : { label: isBillingReady() ? '' : fallbackPrice, available: false });
    })().catch(() => {
      if (!cancelled) setPrice({ label: '', available: false });
    });
    return () => { cancelled = true; };
  }, [productId, fallbackPrice, active]);

  return price;
}
