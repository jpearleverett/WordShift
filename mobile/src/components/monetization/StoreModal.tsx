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
import { getPixelSkin, PANEL_CORNER_DP, PANEL_EDGE_DP } from '../../theme/pixelSkin.generated';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { NineSliceFrame } from '../ui/NineSlice';
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
  acknowledgeConsumableGrant,
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
import { RewardReveal } from '../ui/RewardReveal';
import { GiftOverlay, GiftItem } from './GiftOverlay';
import { isAdsReady } from '../../services/ads';
import {
  getDailyAmberStatus,
  recordDailyAmberClaim,
  dailyAmberGrantFor,
  DailyAmberStatus,
} from '../../services/dailyAmberReward';
import { DAILY_AMBER_REWARD, SUPPORTER_MONTHLY_AMBER } from '../../constants/gameBalance';

const HINT_ICON = require('../../../assets/ui/hint.png');
const AMBER_ICON = require('../../../assets/ui/amber.png');

/**
 * Fallback price label for The Keeper's Collection when the store product isn't
 * fetchable (NoOp billing, Expo Go, or a failed fetch) — mirrors the
 * `fallbackPrice` pattern on the consumable catalog in services/iap.ts. Keep in
 * sync with the Play Console / App Store Connect price tier; the charge sheet
 * always shows the store's own localized price.
 */
export const COSMETIC_BUNDLE_FALLBACK_PRICE = '$4.99';
/** Supporter subscription fallback label (monthly). Keep in sync with the store tier. */
export const SUPPORTER_SUB_FALLBACK_PRICE = '$3.99/mo';

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
  const [isSupporterActive, setIsSupporterActive] = useState<boolean>(
    hasEntitlementSync(ENTITLEMENTS.SUPPORTER),
  );
  const [firstAmberDouble, setFirstAmberDouble] = useState<boolean>(
    !hasMadeAmberPurchaseSync(),
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [amberFaucet, setAmberFaucet] = useState<DailyAmberStatus | null>(null);
  // The daily faucet claim resolves into a magnitude-aware RewardReveal count-up
  // (nonce forces a fresh reveal each claim, since the faucet allows 2/day).
  const [faucetReveal, setFaucetReveal] = useState<{ amount: number; nonce: number } | null>(null);
  // The marquee gift moment (starter pack / first-purchase 2x) — presented as a
  // real gift overlay instead of an appended success line. Presentation only;
  // the grant + pending-ledger ack already ran on the success path.
  const [gift, setGift] = useState<{
    title: string;
    subtitle?: string;
    items: GiftItem[];
  } | null>(null);

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setOwnsBundle(hasEntitlementSync(ENTITLEMENTS.COSMETIC_BUNDLE));
      setOwnsStarter(hasEntitlementSync(ENTITLEMENTS.STARTER_PACK));
      setIsSupporterActive(hasEntitlementSync(ENTITLEMENTS.SUPPORTER));
      setFirstAmberDouble(!hasMadeAmberPurchaseSync());
      setSuccessMsg(null);
      setFaucetReveal(null);
      setGift(null);
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
          PRODUCT_IDS.SUPPORTER_SUB,
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
  // it per local day and reports whether THIS claim was recorded — amber is
  // credited only when it was, so a repeat tap past the cap (cheap for Patrons,
  // who skip the ad) can never over-grant while the tracker stays pinned.
  const handleClaimDailyAmber = useCallback(async () => {
    hapticMedium();
    const result = await recordDailyAmberClaim();
    setAmberFaucet(result);
    const grant = dailyAmberGrantFor(result);
    if (grant <= 0) {
      // Already collected today (stale card or rapid re-tap): the card flips to
      // its "Collected for today" state above; nothing is credited.
      return;
    }
    const balance = await awardBonusAmber(grant, 'rewarded_daily_amber');
    onAmberChange?.(balance);
    // Present the claim as a magnitude-aware count-up, not a static line.
    setSuccessMsg(null);
    setFaucetReveal({ amount: grant, nonce: Date.now() });
    logEvent({ type: 'daily_amber_claimed', data: { amount: grant, remaining: result.remaining } });
  }, [onAmberChange]);

  const handleBuyConsumable = useCallback(
    async (info: ConsumableProductInfo) => {
      if (flow === 'working') return;
      setFlow('working');
      setSuccessMsg(null);
      setFaucetReveal(null);
      hapticLight();
      logEvent({ type: 'purchase_initiated', data: { productId: info.productId, kind: info.reward.kind } });
      try {
        const result = await purchaseConsumable(info.productId);
        if (result.success && result.reward) {
          if (result.reward.kind === 'amber') {
            const balance = await awardBonusAmber(result.reward.amount, `iap_${info.productId}`);
            onAmberChange?.(balance);
            setFirstAmberDouble(!hasMadeAmberPurchaseSync());
            if (result.firstPurchaseDoubled) {
              // The one-time first-purchase 2x is a marquee moment: present it
              // as a real gift, not an appended line. The amount is already
              // doubled by the iap layer.
              setGift({
                title: 'Doubled, with thanks',
                subtitle: 'The house returns your very first gift twice over. Just this once.',
                items: [{ icon: AMBER_ICON, amount: result.reward.amount, label: 'amber' }],
              });
            } else {
              setSuccessMsg(`+${result.reward.amount} amber added.`);
            }
          } else {
            const balance = await addHints(result.reward.amount, `iap_${info.productId}`);
            onHintsChange?.(balance);
            setSuccessMsg(`+${result.reward.amount} hints added.`);
          }
          // Apply-then-ack: the grant is only cleared from the pending ledger
          // once the reward has actually landed, so a kill mid-flow replays the
          // grant (at-least-once) instead of losing a paid purchase.
          if (result.grantId) {
            acknowledgeConsumableGrant(result.grantId).catch(() => {});
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
    setFaucetReveal(null);
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter' } });
    try {
      const result = await purchaseStarterPack();
      if (result.success && result.reward) {
        // Apply-then-ack per grant (see handleBuyConsumable): a kill mid-flow
        // replays the missing half rather than losing a paid bundle.
        const balance = await awardBonusAmber(result.reward.amber, 'iap_starter');
        onAmberChange?.(balance);
        if (result.grantIds?.amber) {
          acknowledgeConsumableGrant(result.grantIds.amber).catch(() => {});
        }
        const hints = await addHints(result.reward.hints, 'iap_starter');
        onHintsChange?.(hints);
        if (result.grantIds?.hints) {
          acknowledgeConsumableGrant(result.grantIds.hints).catch(() => {});
        }
        setOwnsStarter(true);
        // The Keeper's Welcome is a marquee moment: present the bundle as a
        // real gift (amber + hints each counting up), not an appended line.
        setGift({
          title: STARTER_PACK_INFO.name,
          subtitle: 'A welcome gift, set on the shelf for you.',
          items: [
            { icon: AMBER_ICON, amount: result.reward.amber, label: 'amber' },
            { icon: HINT_ICON, amount: result.reward.hints, label: 'hints' },
          ],
        });
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
    setFaucetReveal(null);
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

  const handleBuySupporter = useCallback(async () => {
    if (flow === 'working' || isSupporterActive) return;
    setFlow('working');
    setSuccessMsg(null);
    setFaucetReveal(null);
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: PRODUCT_IDS.SUPPORTER_SUB, kind: 'supporter' } });
    try {
      const result = await purchaseProduct(PRODUCT_IDS.SUPPORTER_SUB);
      if (result.success) {
        setIsSupporterActive(hasEntitlementSync(ENTITLEMENTS.SUPPORTER));
        logEvent({ type: 'iap_purchase', data: { productId: PRODUCT_IDS.SUPPORTER_SUB, kind: 'supporter' } });
        hapticMedium();
        setSuccessMsg('Thank you. Your monthly amber will be waiting each month.');
        setFlow('idle');
        return;
      }
      if (result.cancelled) {
        logEvent({ type: 'purchase_cancelled', data: { productId: PRODUCT_IDS.SUPPORTER_SUB, kind: 'supporter' } });
        setFlow('idle');
        return;
      }
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.SUPPORTER_SUB, kind: 'supporter', reason: result.error ?? 'unknown' } });
      setFlow('unavailable');
    } catch {
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.SUPPORTER_SUB, kind: 'supporter', reason: 'exception' } });
      setFlow('unavailable');
    }
  }, [flow, isSupporterActive]);

  const handleClose = useCallback(() => {
    setFlow('idle');
    setSuccessMsg(null);
    setFaucetReveal(null);
    onClose();
  }, [onClose]);

  const t = getSurfaceTheme(phase);
  const skin = getPixelSkin(phase);
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
            { opacity: cardOpacity, transform: [{ scale: cardScale }] },
          ]}
        >
          {/* Cottage pixel panel frame (wood 9-slice + solid parchment fill). */}
          <NineSliceFrame
            skin={skin.panel}
            cornerDp={PANEL_CORNER_DP}
            edgeDp={PANEL_EDGE_DP}
            fillColor={skin.fill}
          />
          <View style={[styles.glow, { backgroundColor: t.glow }]} />

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
              <PanelCard phase={phase} style={styles.heroCard}>
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
                        // Host is the cottage PanelCard, which stays light
                        // parchment through phase 3 (storm) and flips dark at
                        // 4 — 'auto' assumes a dark host from phase 3 and made
                        // the label near-invisible on the storm card.
                        surface={phase >= 4 ? 'dark' : 'light'}
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

            <Text style={[styles.sectionLabel, { color: t.muted }]}>SUPPORTER</Text>
            <PanelCard phase={phase} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: t.title }]}>Supporter</Text>
                <Text style={[styles.rowDesc, { color: t.body }]}>
                  Ad-free, {SUPPORTER_MONTHLY_AMBER} amber every month, the season pass premium track, and an exclusive confetti. Cancel anytime.
                </Text>
              </View>
              {isSupporterActive ? (
                <Text style={[styles.ownedText, { color: t.amberText }]}>Active ✦</Text>
              ) : (
                renderPricePill(
                  prices[PRODUCT_IDS.SUPPORTER_SUB] ?? SUPPORTER_SUB_FALLBACK_PRICE,
                  handleBuySupporter,
                  'Subscribe as a Supporter',
                )
              )}
            </PanelCard>

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
                  prices[PRODUCT_IDS.COSMETIC_BUNDLE] ?? COSMETIC_BUNDLE_FALLBACK_PRICE,
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

          {faucetReveal && flow !== 'unavailable' && (
            <View style={styles.rewardBox}>
              <RewardReveal
                key={faucetReveal.nonce}
                amount={faucetReveal.amount}
                icon={AMBER_ICON}
                label="added to your amber"
                phase={phase}
              />
            </View>
          )}

          {successMsg && !faucetReveal && flow !== 'unavailable' && (
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

        {/* Marquee gift moment (starter pack / first-purchase 2x) — presented
            as a real gift over the store. Presentation only; the grant already
            landed on the success path. */}
        <GiftOverlay
          visible={gift !== null}
          phase={phase}
          title={gift?.title ?? ''}
          subtitle={gift?.subtitle}
          items={gift?.items ?? []}
          onClose={() => setGift(null)}
        />
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
    padding: 24,
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
  title: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  balances: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: { fontSize: 14, fontWeight: '700', fontFamily: PIXEL_FONT_BOLD },
  hintInline: { width: 13, height: 13 },
  hintInlineSmall: { width: 11, height: 11 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
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
  heroTitle: { fontSize: 18, fontWeight: '900', marginBottom: 2, fontFamily: PIXEL_FONT_BOLD },
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
  rowTitle: { fontSize: 15, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  ribbon: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: 'hidden',
  },
  rowDesc: { fontSize: 12.5, marginTop: 3, lineHeight: 17, fontFamily: BODY_FONT },

  // Price pill — chunky amber CandyButton (the single warm accent).
  pricePill: { minWidth: 84 },
  ownedText: { fontSize: 13, fontWeight: '800', paddingHorizontal: 8, fontFamily: PIXEL_FONT_BOLD },

  patronLink: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  patronLinkText: { fontSize: 13, lineHeight: 18, textAlign: 'center', fontFamily: BODY_FONT },

  successBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  successText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', fontWeight: '700', fontFamily: PIXEL_FONT_BOLD },
  // Faucet claim reward reveal (magnitude-aware count-up in place of a static line).
  rewardBox: { marginTop: 12, alignItems: 'center' },
  unavailableBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unavailableText: { fontSize: 12.5, lineHeight: 17, textAlign: 'center', fontFamily: BODY_FONT },
  workingRow: { marginTop: 12, alignItems: 'center' },
  closeBtn: { marginTop: 12 },
});

export default StoreModal;
