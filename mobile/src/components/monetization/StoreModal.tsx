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
import { CandyColors, getPhaseTheme } from '../../theme/colors';
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
 * Store/Patron surface theming — speaks the same visual language as the game's
 * best modals (VictoryModal / DailyLoginModal): the card takes the phase's
 * `getPhaseTheme` modal background, sections sit in the phase's stat-box tone
 * with subtle divider borders, and ONE warm amber accent is reserved for
 * prices and amber amounts. Every text/background pair below holds >= 4.5:1
 * WCAG contrast across phases 0-5 (the theme's light cards need deeper body
 * tones than its gray-400 secondary; the dark cards' secondary passes as-is).
 */
function getStoreSurfaceTheme(phase: number) {
  const pt = getPhaseTheme(phase);
  const dark = phase >= 3;
  const body = dark
    ? pt.modalSecondaryTextColor
    : phase >= 2 ? '#493C66' : phase >= 1 ? '#554B70' : '#475569';
  return {
    overlay: pt.modalOverlayColor,
    cardBg: pt.modalBgColor,
    cardBorder: dark ? 'rgba(147, 51, 234, 0.22)' : 'rgba(255, 255, 255, 0.4)',
    glow: pt.victoryGlowColor,
    title: pt.modalTextColor,
    body,
    sectionBg: pt.modalStatBgColor,
    sectionBorder: pt.modalDividerColor,
    // The single warm amber accent (prices + amber amounts). Muted at dark
    // phases so the endgame never turns cheerful-gold.
    amberText: dark ? '#E9B468' : '#7A4E00',
    amberTint: dark ? 'rgba(255, 201, 77, 0.10)' : 'rgba(202, 138, 4, 0.10)',
    amberTintBorder: dark ? 'rgba(255, 201, 77, 0.30)' : 'rgba(202, 138, 4, 0.35)',
    pillBg: dark ? '#C98A4A' : '#F6BA3F',
    pillEdge: dark ? '#8F5F2E' : '#C8901E',
    pillText: dark ? '#241302' : '#3F2B04',
  };
}

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
  const reducedMotion = getSettingsSync().reducedMotion;

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
                ? `+${result.reward.amount} amber added. 2× first purchase!`
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

  const t = getStoreSurfaceTheme(phase);
  const working = flow === 'working';

  /** Price pinned right in a weighty amber pill — the store's single accent. */
  const renderPricePill = (
    label: string,
    onPress: () => void,
    accessibilityLabel: string,
  ) => (
    <TouchableOpacity
      style={[
        styles.pricePill,
        { backgroundColor: t.pillBg, borderBottomColor: t.pillEdge },
        working && styles.pricePillDisabled,
      ]}
      onPress={onPress}
      disabled={working}
      accessibilityRole="button"
      accessibilityState={{ disabled: working }}
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[styles.pricePillText, { color: t.pillText }]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderPackRow = (info: ConsumableProductInfo, suffix: React.ReactNode) => (
    <View
      key={info.productId}
      style={[styles.row, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}
    >
      <View style={styles.rowInfo}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, { color: t.title }]}>{info.name}</Text>
          {info.bestValue && (
            <Text style={[styles.ribbon, { color: t.pillText, backgroundColor: t.pillBg }]}>
              BEST VALUE
            </Text>
          )}
          {info.reward.kind === 'amber' && firstAmberDouble && (
            <Text style={[styles.ribbon, { color: t.pillText, backgroundColor: t.pillBg }]}>
              2× FIRST PURCHASE!
            </Text>
          )}
        </View>
        <Text style={[styles.rowDesc, { color: t.body }]}>
          {info.description} {suffix}
        </Text>
      </View>
      {renderPricePill(
        priceLabel(info),
        () => handleBuyConsumable(info),
        `Buy ${info.name} for ${priceLabel(info)}`,
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: t.overlay }]}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: t.cardBg, borderColor: t.cardBorder, opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          <View style={[styles.glow, { backgroundColor: t.glow }]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: t.title }]}>Store</Text>
            <View style={[styles.balances, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
              <Text style={[styles.balanceText, { color: t.amberText }]}>
                <AmberInline size={13} /> {amberBalance}
              </Text>
              <Text style={[styles.balanceText, { color: t.body }]}>💡 {hintBalance}</Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {!ownsStarter && (
              <View style={[styles.heroCard, { backgroundColor: t.sectionBg, borderColor: t.amberTintBorder }]}>
                <View style={styles.heroRibbonRow}>
                  <Text style={[styles.ribbon, { color: t.pillText, backgroundColor: t.pillBg }]}>
                    BEST VALUE · ONE TIME
                  </Text>
                </View>
                <View style={styles.heroBody}>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.heroTitle, { color: t.title }]}>{STARTER_PACK_INFO.name}</Text>
                    <Text style={[styles.rowDesc, { color: t.body }]}>
                      {STARTER_PACK_INFO.description} <AmberInline size={11} />
                    </Text>
                  </View>
                  {renderPricePill(
                    prices[STARTER_PACK_INFO.productId] ?? STARTER_PACK_INFO.fallbackPrice,
                    handleBuyStarter,
                    `Buy ${STARTER_PACK_INFO.name} for ${prices[STARTER_PACK_INFO.productId] ?? STARTER_PACK_INFO.fallbackPrice}`,
                  )}
                </View>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: t.body }]}>AMBER</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'amber').map(info =>
              renderPackRow(info, <AmberInline size={11} />),
            )}

            <Text style={[styles.sectionLabel, { color: t.body }]}>HINTS</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'hints').map(info =>
              renderPackRow(info, '💡'),
            )}

            <Text style={[styles.sectionLabel, { color: t.body }]}>COSMETIC BUNDLE</Text>
            <View style={[styles.row, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: t.title }]}>The Keeper&apos;s Collection</Text>
                <Text style={[styles.rowDesc, { color: t.body }]}>
                  The exclusive Eclipse tile set + Eclipse confetti. Equip them in the Cosmetic Shop.
                </Text>
              </View>
              {ownsBundle ? (
                <Text style={[styles.ownedText, { color: t.amberText }]}>Owned ✦</Text>
              ) : (
                renderPricePill(
                  prices[PRODUCT_IDS.COSMETIC_BUNDLE] ?? '$4.99',
                  handleBuyBundle,
                  "Buy The Keeper's Collection",
                )
              )}
            </View>

            {onOpenPatron && (
              <TouchableOpacity
                style={[styles.patronLink, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}
                onPress={() => {
                  hapticLight();
                  onClose();
                  onOpenPatron();
                }}
                accessibilityRole="button"
                accessibilityLabel="Learn about Patron"
              >
                <Text style={[styles.patronLinkText, { color: t.body }]}>
                  Want a quieter table and a little amber every puzzle?{' '}
                  <Text style={{ fontWeight: '800', color: t.title }}>Become a Patron →</Text>
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {successMsg && flow !== 'unavailable' && (
            <View
              style={[styles.successBox, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}
              accessibilityLiveRegion="polite"
            >
              <Text style={[styles.successText, { color: t.amberText }]}>{successMsg}</Text>
            </View>
          )}

          {flow === 'unavailable' && (
            <View style={[styles.unavailableBox, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
              <Text style={[styles.unavailableText, { color: t.body }]}>
                The store isn&apos;t available right now. Nothing was charged. Please try again later.
              </Text>
            </View>
          )}

          {working && (
            <View style={styles.workingRow}>
              <ActivityIndicator size="small" color={t.amberText} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.closeBtn, { borderColor: t.sectionBorder }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close store"
          >
            <Text style={[styles.closeBtnText, { color: t.body }]}>Close</Text>
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
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
  },
  // Soft top glow, matching VictoryModal / DailyLoginModal.
  glow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 160,
    opacity: 0.25,
    borderRadius: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  balances: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: { fontSize: 14, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 16, marginBottom: 6 },

  // Starter pack hero — first card, framed by the amber accent border.
  heroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 12,
  },
  heroRibbonRow: { flexDirection: 'row', marginBottom: 8 },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: { fontSize: 18, fontWeight: '900', marginBottom: 2 },

  // Section rows — quiet phase-toned cards; consistent heights.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    minHeight: 68,
  },
  rowInfo: { flex: 1, paddingRight: 12 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  ribbon: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: 'hidden',
  },
  rowDesc: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },

  // Price pill — solid amber, weighty bottom edge (JuicyButton-style mass).
  pricePill: {
    borderRadius: 14,
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 76,
    alignItems: 'center',
  },
  pricePillDisabled: { opacity: 0.5 },
  pricePillText: { fontSize: 14, fontWeight: '900' },
  ownedText: { fontSize: 13, fontWeight: '800', paddingHorizontal: 8 },

  patronLink: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  patronLinkText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },

  successBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  successText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', fontWeight: '700' },
  unavailableBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
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
