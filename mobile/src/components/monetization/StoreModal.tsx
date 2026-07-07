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
  Image,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { SURFACE, getSurfaceTheme } from '../../theme/surfaces';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
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
  isPatronSync,
  ENTITLEMENTS,
} from '../../services/entitlements';
import { awardBonusAmber } from '../../services/amberCurrency';
import { addHints } from '../../services/hints';
import { getSettingsSync } from '../../services/settings';
import { hapticLight, hapticMedium } from '../../services/haptics';
import { logEvent } from '../../services/eventLogger';
import { RewardedAdButton } from './RewardedAdButton';
import { isAdsReady } from '../../services/ads';
import {
  getDailyAmberStatus,
  recordDailyAmberClaim,
  DailyAmberStatus,
} from '../../services/dailyAmberReward';
import { DAILY_AMBER_REWARD } from '../../constants/gameBalance';

const HINT_ICON = require('../../../assets/ui/hint.png');

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
 *
 * Surface language: the shared feel kit (`getSurfaceTheme` + PanelCard rows +
 * CandyButton price pills) — the amber variant is reserved for prices/claims,
 * the one primary CTA is the starter-pack hero.
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
  const [amberFaucet, setAmberFaucet] = useState<DailyAmberStatus | null>(null);

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setOwnsBundle(hasEntitlementSync(ENTITLEMENTS.COSMETIC_BUNDLE));
      setOwnsStarter(hasEntitlementSync(ENTITLEMENTS.STARTER_PACK));
      setFirstAmberDouble(!hasMadeAmberPurchaseSync());
      setSuccessMsg(null);
      getDailyAmberStatus().then(setAmberFaucet).catch(() => {});
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
      Animated.spring(cardScale, { toValue: 1, ...SURFACE.modalIn, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, cardScale, cardOpacity]);

  const priceLabel = useCallback(
    (info: ConsumableProductInfo) => prices[info.productId] ?? info.fallbackPrice,
    [prices],
  );

  // Grant the daily free-amber reward (called after a completed rewarded view, or
  // directly for Patron holders who don't watch ads). recordDailyAmberClaim caps
  // it per local day; awardBonusAmber credits the reward-only amber.
  const handleClaimDailyAmber = useCallback(async () => {
    hapticMedium();
    const status = await recordDailyAmberClaim();
    const balance = await awardBonusAmber(DAILY_AMBER_REWARD, 'rewarded_daily_amber');
    onAmberChange?.(balance);
    setAmberFaucet(status);
    setSuccessMsg(`+${DAILY_AMBER_REWARD} amber added.`);
    logEvent({ type: 'daily_amber_claimed', data: { amount: DAILY_AMBER_REWARD, remaining: status.remaining } });
  }, [onAmberChange]);

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

  const t = getSurfaceTheme(phase);
  const working = flow === 'working';

  /** Price pinned right in a chunky amber CandyButton — the store's single accent. */
  const renderPricePill = (
    label: string,
    onPress: () => void,
    accessibilityLabel: string,
  ) => (
    <CandyButton
      label={label}
      onPress={onPress}
      phase={phase}
      variant="amber"
      disabled={working}
      accessibilityLabel={accessibilityLabel}
      style={styles.pricePill}
    />
  );

  const renderPackRow = (info: ConsumableProductInfo, suffix: React.ReactNode) => (
    <PanelCard key={info.productId} phase={phase} style={styles.row}>
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
    </PanelCard>
  );

  const heroPrice = prices[STARTER_PACK_INFO.productId] ?? STARTER_PACK_INFO.fallbackPrice;

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
          {/* Layered material bands (PanelCard anatomy, inline for the animated card). */}
          <View pointerEvents="none" style={styles.cardHighlight} />
          <View pointerEvents="none" style={styles.cardShade} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: t.title }]}>Store</Text>
            <View style={[styles.balances, { backgroundColor: t.rowBg, borderColor: t.rowBorder }]}>
              <Text style={[styles.balanceText, { color: t.amberText }]}>
                <AmberInline size={13} /> {amberBalance}
              </Text>
              <Text style={[styles.balanceText, { color: t.body }]}>
                <Image source={HINT_ICON} style={styles.hintInline} accessibilityLabel="hints" />{' '}
                {hintBalance}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {!ownsStarter && (
              <PanelCard
                phase={phase}
                style={{ ...styles.heroCard, borderColor: t.amberTintBorder }}
              >
                <View style={styles.heroRibbonRow}>
                  <Text style={[styles.ribbon, { color: t.pillText, backgroundColor: t.pillBg }]}>
                    BEST VALUE · ONE TIME
                  </Text>
                </View>
                <Text style={[styles.heroTitle, { color: t.title }]}>{STARTER_PACK_INFO.name}</Text>
                <Text style={[styles.rowDesc, { color: t.body }]}>
                  {STARTER_PACK_INFO.description} <AmberInline size={11} />
                </Text>
                <CandyButton
                  label={heroPrice}
                  onPress={handleBuyStarter}
                  phase={phase}
                  variant="primary"
                  size="lg"
                  disabled={working}
                  accessibilityLabel={`Buy ${STARTER_PACK_INFO.name} for ${heroPrice}`}
                  style={styles.heroCta}
                />
              </PanelCard>
            )}

            {/* Daily free-amber faucet: watch a short clip (or free for Patron).
                Only shown when there's actually something to offer — a real ad
                backend for free players, or always for Patron holders. */}
            {amberFaucet && (isPatronSync() || isAdsReady()) && (
              <>
                <Text style={[styles.sectionLabel, { color: t.muted }]}>FREE AMBER</Text>
                <PanelCard phase={phase} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowTitle, { color: t.title }]}>Daily Amber</Text>
                    <Text style={[styles.rowDesc, { color: t.body }]}>
                      {amberFaucet.available
                        ? `Watch a short clip for +${DAILY_AMBER_REWARD} amber. ${amberFaucet.remaining} left today.`
                        : 'Collected for today. Come back tomorrow!'}
                    </Text>
                  </View>
                  {amberFaucet.available && (isPatronSync()
                    ? renderPricePill('Claim', handleClaimDailyAmber, `Claim ${DAILY_AMBER_REWARD} free amber`)
                    : (
                      <RewardedAdButton
                        placement="daily_amber"
                        onReward={handleClaimDailyAmber}
                        label={`Watch · +${DAILY_AMBER_REWARD}`}
                        phase={phase}
                      />
                    ))}
                </PanelCard>
              </>
            )}

            <Text style={[styles.sectionLabel, { color: t.muted }]}>AMBER</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'amber').map(info =>
              renderPackRow(info, <AmberInline size={11} />),
            )}

            <Text style={[styles.sectionLabel, { color: t.muted }]}>HINTS</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'hints').map(info =>
              renderPackRow(info, <Image source={HINT_ICON} style={styles.hintInlineSmall} accessibilityLabel="hints" />),
            )}

            <Text style={[styles.sectionLabel, { color: t.muted }]}>COSMETIC BUNDLE</Text>
            <PanelCard phase={phase} style={styles.row}>
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
            </PanelCard>

            {onOpenPatron && (
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onClose();
                  onOpenPatron();
                }}
                accessibilityRole="button"
                accessibilityLabel="Learn about Patron"
              >
                <PanelCard phase={phase} style={styles.patronLink}>
                  <Text style={[styles.patronLinkText, { color: t.body }]}>
                    Want a quieter table and a little amber every puzzle?{' '}
                    <Text style={{ fontWeight: '800', color: t.title }}>Become a Patron →</Text>
                  </Text>
                </PanelCard>
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

          <CandyButton
            label="Close"
            onPress={handleClose}
            phase={phase}
            variant="quiet"
            accessibilityLabel="Close store"
            style={styles.closeBtn}
          />
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
    borderRadius: SURFACE.panelRadius,
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
  // Top highlight / bottom shade — the panel reads as lit material.
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '34%',
    borderTopLeftRadius: SURFACE.panelRadius,
    borderTopRightRadius: SURFACE.panelRadius,
    backgroundColor: `rgba(255, 255, 255, ${SURFACE.highlightAlpha})`,
  },
  cardShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '22%',
    borderBottomLeftRadius: SURFACE.panelRadius,
    borderBottomRightRadius: SURFACE.panelRadius,
    backgroundColor: `rgba(10, 6, 24, ${SURFACE.shadeAlpha})`,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  balances: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: { fontSize: 14, fontWeight: '700' },
  hintInline: { width: 13, height: 13 },
  hintInlineSmall: { width: 11, height: 11 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 16,
    marginBottom: 6,
  },

  // Starter pack hero — first card, framed by the amber accent border.
  heroCard: {
    padding: 14,
    marginTop: 12,
  },
  heroRibbonRow: { flexDirection: 'row', marginBottom: 8 },
  heroTitle: { fontSize: 18, fontWeight: '900', marginBottom: 2 },
  heroCta: { marginTop: 12 },

  // Section rows — layered PanelCard material; consistent heights.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Price pill — chunky amber CandyButton (the single warm accent).
  pricePill: { minWidth: 84 },
  ownedText: { fontSize: 13, fontWeight: '800', paddingHorizontal: 8 },

  patronLink: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  patronLinkText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },

  successBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  successText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', fontWeight: '700' },
  unavailableBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unavailableText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center' },
  workingRow: { marginTop: 12, alignItems: 'center' },
  closeBtn: { marginTop: 12 },
});

export default StoreModal;
