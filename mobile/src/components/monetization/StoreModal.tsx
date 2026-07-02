import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { getPhaseTheme } from '../../theme/colors';
import { AmberInline } from '../AmberInline';
import {
  PRODUCT_IDS,
  CONSUMABLE_PRODUCTS,
  ConsumableProductInfo,
  STARTER_PACK_INFO,
  getProducts,
  purchaseConsumable,
  purchaseStarterPack,
  purchaseProduct,
  IapProduct,
} from '../../services/iap';
import {
  hasEntitlementSync,
  hasMadeAmberPurchaseSync,
  ENTITLEMENTS,
} from '../../services/entitlements';
import { awardBonusAmber } from '../../services/amberCurrency';
import { addHints } from '../../services/hints';
import { getSettingsSync } from '../../services/settings';
import { hapticLight, hapticMedium } from '../../services/haptics';
import { logEvent } from '../../services/eventLogger';

interface StoreModalProps {
  visible: boolean;
  /** Narrative phase, for phase-aware theming. */
  phase: number;
  amberBalance: number;
  hintBalance: number;
  onClose: () => void;
  /** Fired with the new amber balance after an amber pack purchase. */
  onAmberChange?: (newBalance: number) => void;
  /** Fired with the new hint balance after a hint pack purchase. */
  onHintsChange?: (newBalance: number) => void;
  /** Open the Patron modal (the store links to it for the ad-free / +amber upsell). */
  onOpenPatron?: () => void;
}

type FlowState = 'idle' | 'working' | 'unavailable';

const AMBER_PACK_IDS = [PRODUCT_IDS.AMBER_SMALL, PRODUCT_IDS.AMBER_MEDIUM, PRODUCT_IDS.AMBER_LARGE];
const HINT_PACK_IDS = [PRODUCT_IDS.HINTS_SMALL, PRODUCT_IDS.HINTS_LARGE];

/**
 * The Store — consumable amber & hint packs plus the one-time cosmetic bundle.
 *
 * Consumables credit the amber reward balance / hint balance directly (the caller
 * convention: `purchaseConsumable` reports success + a reward, this modal applies
 * it via `awardBonusAmber` / `addHints`). Amber buys *convenience for the shop +
 * amber sinks* — it is the REWARD balance only and never feeds phase progress, so
 * the story keeps its own pace. The cosmetic bundle is a non-consumable that
 * grants an entitlement (Eclipse tile theme + confetti).
 *
 * Every billing failure (NoOp/unconfigured, e.g. Expo Go or iOS-before-keys) is a
 * calm "not available right now" — never a crash. Prices come from the store when
 * fetchable, else each product's `fallbackPrice` label.
 */
export const StoreModal: React.FC<StoreModalProps> = ({
  visible,
  phase,
  amberBalance,
  hintBalance,
  onClose,
  onAmberChange,
  onHintsChange,
  onOpenPatron,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;
  const isDark = phase >= 3;

  const [flow, setFlow] = useState<FlowState>('idle');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [ownsBundle, setOwnsBundle] = useState<boolean>(
    hasEntitlementSync(ENTITLEMENTS.COSMETIC_BUNDLE),
  );
  const [ownsStarter, setOwnsStarter] = useState<boolean>(
    hasEntitlementSync(ENTITLEMENTS.STARTER_PACK),
  );
  const [firstAmberDouble, setFirstAmberDouble] = useState<boolean>(
    !hasMadeAmberPurchaseSync(),
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setOwnsBundle(hasEntitlementSync(ENTITLEMENTS.COSMETIC_BUNDLE));
      setOwnsStarter(hasEntitlementSync(ENTITLEMENTS.STARTER_PACK));
      setFirstAmberDouble(!hasMadeAmberPurchaseSync());
      setSuccessMsg(null);
      logEvent({ type: 'store_opened', data: { surface: 'store_modal' } });
    }
  }, [visible]);

  // Fetch localized price strings from the store; NoOp returns [] → fallbacks used.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const ids = [
          PRODUCT_IDS.STARTER_PACK,
          ...AMBER_PACK_IDS,
          ...HINT_PACK_IDS,
          PRODUCT_IDS.COSMETIC_BUNDLE,
        ];
        const products: IapProduct[] = await getProducts(ids);
        if (!cancelled) {
          const map: Record<string, string> = {};
          for (const p of products) if (p.priceString) map[p.productId] = p.priceString;
          setPrices(map);
        }
      } catch {
        if (!cancelled) setPrices({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, cardScale, cardOpacity]);

  const priceLabel = useCallback(
    (info: ConsumableProductInfo) => prices[info.productId] ?? info.fallbackPrice,
    [prices],
  );

  const handleBuyConsumable = useCallback(
    async (info: ConsumableProductInfo) => {
      if (flow === 'working') return;
      setFlow('working');
      setSuccessMsg(null);
      hapticLight();
      logEvent({ type: 'purchase_initiated', data: { productId: info.productId, kind: info.reward.kind } });
      try {
        const result = await purchaseConsumable(info.productId);
        if (result.success && result.reward) {
          if (result.reward.kind === 'amber') {
            const balance = await awardBonusAmber(result.reward.amount, `iap_${info.productId}`);
            onAmberChange?.(balance);
            setFirstAmberDouble(!hasMadeAmberPurchaseSync());
            setSuccessMsg(
              result.firstPurchaseDoubled
                ? `+${result.reward.amount} amber added — 2× first purchase!`
                : `+${result.reward.amount} amber added.`,
            );
          } else {
            const balance = await addHints(result.reward.amount, `iap_${info.productId}`);
            onHintsChange?.(balance);
            setSuccessMsg(`+${result.reward.amount} hints added.`);
          }
          logEvent({ type: 'iap_purchase', data: { productId: info.productId, kind: result.reward.kind } });
          hapticMedium();
          setFlow('idle');
          return;
        }
        if (result.cancelled) {
          logEvent({ type: 'purchase_cancelled', data: { productId: info.productId, kind: info.reward.kind } });
          setFlow('idle');
          return;
        }
        logEvent({ type: 'purchase_failed', data: { productId: info.productId, kind: info.reward.kind, reason: result.error ?? 'unknown' } });
        setFlow('unavailable');
      } catch {
        logEvent({ type: 'purchase_failed', data: { productId: info.productId, kind: info.reward.kind, reason: 'exception' } });
        setFlow('unavailable');
      }
    },
    [flow, onAmberChange, onHintsChange],
  );

  const handleBuyStarter = useCallback(async () => {
    if (flow === 'working' || ownsStarter) return;
    setFlow('working');
    setSuccessMsg(null);
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter' } });
    try {
      const result = await purchaseStarterPack();
      if (result.success && result.reward) {
        const balance = await awardBonusAmber(result.reward.amber, 'iap_starter');
        onAmberChange?.(balance);
        const hints = await addHints(result.reward.hints, 'iap_starter');
        onHintsChange?.(hints);
        setOwnsStarter(true);
        setSuccessMsg(`+${result.reward.amber} amber and +${result.reward.hints} hints added.`);
        logEvent({ type: 'iap_purchase', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter' } });
        hapticMedium();
        setFlow('idle');
        return;
      }
      if (result.alreadyOwned) {
        setOwnsStarter(true);
        setFlow('idle');
        return;
      }
      if (result.cancelled) {
        logEvent({ type: 'purchase_cancelled', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter' } });
        setFlow('idle');
        return;
      }
      logEvent({ type: 'purchase_failed', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter', reason: result.error ?? 'unknown' } });
      setFlow('unavailable');
    } catch {
      logEvent({ type: 'purchase_failed', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter', reason: 'exception' } });
      setFlow('unavailable');
    }
  }, [flow, ownsStarter, onAmberChange, onHintsChange]);

  const handleBuyBundle = useCallback(async () => {
    if (flow === 'working' || ownsBundle) return;
    setFlow('working');
    setSuccessMsg(null);
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: PRODUCT_IDS.COSMETIC_BUNDLE, kind: 'cosmetic' } });
    try {
      const result = await purchaseProduct(PRODUCT_IDS.COSMETIC_BUNDLE);
      if (result.success) {
        setOwnsBundle(hasEntitlementSync(ENTITLEMENTS.COSMETIC_BUNDLE));
        logEvent({ type: 'iap_purchase', data: { productId: PRODUCT_IDS.COSMETIC_BUNDLE, kind: 'cosmetic' } });
        hapticMedium();
        setFlow('idle');
        return;
      }
      if (result.cancelled) {
        logEvent({ type: 'purchase_cancelled', data: { productId: PRODUCT_IDS.COSMETIC_BUNDLE, kind: 'cosmetic' } });
        setFlow('idle');
        return;
      }
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.COSMETIC_BUNDLE, kind: 'cosmetic', reason: result.error ?? 'unknown' } });
      setFlow('unavailable');
    } catch {
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.COSMETIC_BUNDLE, kind: 'cosmetic', reason: 'exception' } });
      setFlow('unavailable');
    }
  }, [flow, ownsBundle]);

  const handleClose = useCallback(() => {
    setFlow('idle');
    setSuccessMsg(null);
    onClose();
  }, [onClose]);

  // Theming
  const bgOverlay = phaseTheme.modalOverlayColor;
  const cardBg = isDark ? '#13101F' : '#241640';
  const cardBorder = isDark ? 'rgba(150, 90, 60, 0.4)' : 'rgba(255, 210, 140, 0.38)';
  const headerColor = isDark ? '#E0B080' : '#FFD479';
  const bodyColor = isDark ? 'rgba(220, 200, 180, 0.9)' : 'rgba(232, 222, 250, 0.92)';
  const accent = isDark ? '#C98A4A' : '#FFC94D';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)';
  const working = flow === 'working';

  const renderPackRow = (info: ConsumableProductInfo, suffix: React.ReactNode) => (
    <View key={info.productId} style={[styles.row, { backgroundColor: rowBg }]}>
      <View style={styles.rowInfo}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: headerColor }]}>{info.name}</Text>
          {info.bestValue && (
            <Text style={[styles.badge, { color: '#1B1206', backgroundColor: accent }]}>BEST VALUE</Text>
          )}
          {info.reward.kind === 'amber' && firstAmberDouble && (
            <Text style={[styles.badge, { color: '#1B1206', backgroundColor: headerColor }]}>
              2× FIRST PURCHASE!
            </Text>
          )}
        </View>
        <Text style={[styles.rowDesc, { color: bodyColor }]}>
          {info.description} {suffix}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.priceBtn, { borderColor: accent }]}
        onPress={() => handleBuyConsumable(info)}
        disabled={working}
        accessibilityRole="button"
        accessibilityLabel={`Buy ${info.name} for ${priceLabel(info)}`}
      >
        <Text style={[styles.priceBtnText, { color: accent }]}>{priceLabel(info)}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: bgOverlay }]}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder, opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: headerColor }]}>Store</Text>
            <View style={styles.balances}>
              <Text style={[styles.balanceText, { color: bodyColor }]}>
                <AmberInline size={13} /> {amberBalance}
              </Text>
              <Text style={[styles.balanceText, { color: bodyColor }]}>💡 {hintBalance}</Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {!ownsStarter && (
              <View style={[styles.starterCard, { backgroundColor: rowBg, borderColor: accent }]}>
                <View style={styles.rowInfo}>
                  <View style={styles.rowTitleLine}>
                    <Text style={[styles.rowTitle, { color: headerColor }]}>{STARTER_PACK_INFO.name}</Text>
                    <Text style={[styles.badge, { color: '#1B1206', backgroundColor: accent }]}>
                      BEST VALUE · ONE TIME
                    </Text>
                  </View>
                  <Text style={[styles.rowDesc, { color: bodyColor }]}>
                    {STARTER_PACK_INFO.description} <AmberInline size={11} />
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.priceBtn, { borderColor: accent }]}
                  onPress={handleBuyStarter}
                  disabled={working}
                  accessibilityRole="button"
                  accessibilityLabel={`Buy ${STARTER_PACK_INFO.name} for ${prices[STARTER_PACK_INFO.productId] ?? STARTER_PACK_INFO.fallbackPrice}`}
                >
                  <Text style={[styles.priceBtnText, { color: accent }]}>
                    {prices[STARTER_PACK_INFO.productId] ?? STARTER_PACK_INFO.fallbackPrice}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: accent }]}>AMBER</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'amber').map(info =>
              renderPackRow(info, <AmberInline size={11} />),
            )}

            <Text style={[styles.sectionLabel, { color: accent }]}>HINTS</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'hints').map(info =>
              renderPackRow(info, '💡'),
            )}

            <Text style={[styles.sectionLabel, { color: accent }]}>COSMETIC BUNDLE</Text>
            <View style={[styles.row, { backgroundColor: rowBg }]}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: headerColor }]}>The Keeper&apos;s Collection</Text>
                <Text style={[styles.rowDesc, { color: bodyColor }]}>
                  The exclusive Eclipse tile set + Eclipse confetti — equip them in the Cosmetic Shop.
                </Text>
              </View>
              {ownsBundle ? (
                <Text style={[styles.ownedText, { color: accent }]}>Owned ✦</Text>
              ) : (
                <TouchableOpacity
                  style={[styles.priceBtn, { borderColor: accent }]}
                  onPress={handleBuyBundle}
                  disabled={working}
                  accessibilityRole="button"
                  accessibilityLabel="Buy The Keeper's Collection"
                >
                  <Text style={[styles.priceBtnText, { color: accent }]}>
                    {prices[PRODUCT_IDS.COSMETIC_BUNDLE] ?? '$4.99'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {onOpenPatron && (
              <TouchableOpacity
                style={styles.patronLink}
                onPress={() => {
                  hapticLight();
                  onClose();
                  onOpenPatron();
                }}
                accessibilityRole="button"
                accessibilityLabel="Learn about Patron"
              >
                <Text style={[styles.patronLinkText, { color: bodyColor }]}>
                  Want a quieter table and a little amber every puzzle?{' '}
                  <Text style={{ fontWeight: '800', color: headerColor }}>Become a Patron →</Text>
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {successMsg && flow !== 'unavailable' && (
            <View style={styles.successBox} accessibilityLiveRegion="polite">
              <Text style={[styles.successText, { color: headerColor }]}>{successMsg}</Text>
            </View>
          )}

          {flow === 'unavailable' && (
            <View style={styles.unavailableBox}>
              <Text style={[styles.unavailableText, { color: bodyColor }]}>
                The store isn&apos;t available right now. Nothing was charged — please try again later.
              </Text>
            </View>
          )}

          {working && (
            <View style={styles.workingRow}>
              <ActivityIndicator size="small" color={accent} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { borderColor: cardBorder }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close store"
          >
            <Text style={[styles.closeBtnText, { color: bodyColor }]}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800' },
  balances: { flexDirection: 'row', gap: 14 },
  balanceText: { fontSize: 14, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  starterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 12,
  },
  rowInfo: { flex: 1, paddingRight: 12 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  badge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rowDesc: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  priceBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 72,
    alignItems: 'center',
  },
  priceBtnText: { fontSize: 14, fontWeight: '800' },
  ownedText: { fontSize: 13, fontWeight: '800', paddingHorizontal: 8 },
  patronLink: { marginTop: 16, paddingVertical: 6 },
  patronLinkText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  successBox: { marginTop: 12 },
  successText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', fontWeight: '700' },
  unavailableBox: { marginTop: 12 },
  unavailableText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center' },
  workingRow: { marginTop: 12, alignItems: 'center' },
  closeBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '700' },
});

export default StoreModal;
