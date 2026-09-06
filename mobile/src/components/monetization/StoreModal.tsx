import { SupportComparison } from './SupportComparison';
import { saveWithPlayerRetry } from '../../services/saveRetry';
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
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../../theme/surfaces';
import { getPixelSkin, PANEL_CORNER_DP, PANEL_EDGE_DP } from '../../theme/pixelSkin.generated';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { NineSliceFrame } from '../ui/NineSlice';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import { CHROME_ICONS } from '../ui/chromeIcons';
import { AmberValue } from '../AmberInline';
import { AmberSparkle } from '../home/AmberSparkle';
import {
  PRODUCT_IDS,
  CONSUMABLE_PRODUCTS,
  ConsumableProductInfo,
  STARTER_PACK_INFO,
  getProducts,
  isBillingReady,
  purchaseConsumable,
  purchaseStarterPack,
  purchaseProduct,
  settleConsumableGrant,
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
import { announceForA11y } from '../../services/a11yAnnounce';
import { logEvent } from '../../services/eventLogger';
import { RewardedAdButton } from './RewardedAdButton';
import { RewardReveal } from '../ui/RewardReveal';
import { GiftOverlay, GiftItem } from './GiftOverlay';
import { isAdsReady, isRewardedCapReached } from '../../services/ads';
import { getStoreArt, STORE_ART_KEYS } from './storeArt';
import {
  getDailyAmberStatus,
  recordDailyAmberClaim,
  dailyAmberGrantFor,
  DailyAmberStatus,
} from '../../services/dailyAmberReward';
import { DAILY_AMBER_REWARD, SUPPORTER_MONTHLY_AMBER } from '../../constants/gameBalance';
import { FONT_SIZE } from '../../theme/typeScale';

const HINT_ICON = require('../../../assets/ui/hint.png');
const AMBER_ICON = require('../../../assets/ui/amber.png');

/** Rendered size of a store thumbnail. The art is drawn at 192px, so this only
 *  ever scales DOWN. */
const STORE_ART_DP = 60;

/**
 * The generated cottage thumbnail for a purchasable, mirroring ShopScreen's
 * ShopArtThumb. Decorative on purpose (`accessible={false}`): the row's name /
 * description Text and the price button's label already carry the semantics, so
 * the art adds no new strings for a screen reader to read out.
 *
 * Never give this a borderRadius or a border - the art is pixel work and
 * CSS-rounding a baked corner is the documented cozy-pixel anti-pattern.
 */
const StoreArtThumb: React.FC<{ artKey: string }> = ({ artKey }) => (
  <Image
    source={getStoreArt(artKey)}
    style={styles.storeArt}
    resizeMode="contain"
    accessible={false}
  />
);

/**
 * Fallback price label for The Keeper's Collection when the store product isn't
 * fetchable (NoOp billing, Expo Go, or a failed fetch) — mirrors the
 * `fallbackPrice` pattern on the consumable catalog in services/iap.ts. Keep in
 * sync with the Play Console / App Store Connect price tier; the charge sheet
 * always shows the store's own localized price.
 */
export const COSMETIC_BUNDLE_FALLBACK_PRICE = '$4.99';
/** Supporter subscription fallback label (monthly). Keep in sync with the store tier. */
// No '/mo' suffix: the row's value line carries the cadence ("Monthly"), and a
// live RevenueCat priceString never includes a period either — so the suffix
// made the fallback the ONLY price in the store wide enough to push its button
// past the rail's budget and squeeze the value line into an ellipsis. Since
// iOS billing is unconfigured, that fallback is what every iOS build renders.
export const SUPPORTER_SUB_FALLBACK_PRICE = '$3.99';

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
  // The faucet's own 2/day counter and the SHARED rewarded-view cap (8/day
  // across victory doubles, hint recovery, quest bonuses, speed rescues and
  // this faucet) are independent. RewardedAdButton hides itself entirely once
  // the shared cap is spent, so a player with a faucet claim still owed but
  // eight views already watched was told to "Watch a short clip. N left today."
  // beside nothing tappable — a cap reading as a broken button. Held as state
  // and read fresh on every modal open (isRewardedCapReached is async, so it
  // can never be called during render).
  const [rewardedCapReached, setRewardedCapReached] = useState(false);
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
      isRewardedCapReached().then(setRewardedCapReached).catch(() => {});
      logEvent({ type: 'store_opened', data: { surface: 'store_modal' } });
    }
  }, [visible]);

  // Fetch localized price strings from the store; NoOp returns [] → fallbacks used.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        // Cold-start race: initIAP() is fire-and-forget, so the modal can open
        // before RevenueCat has finished configuring. If we fetch then, getProducts
        // returns [] and every purchase reads "not available" until a reopen. Wait
        // briefly (bounded) for billing to become ready, then fetch, and retry once
        // if it still comes back empty. This never touches the purchase path, so it
        // cannot abort a real in-progress purchase.
        for (let i = 0; i < 10 && !isBillingReady() && !cancelled; i++) {
          await new Promise((r) => setTimeout(r, 300));
        }
        if (cancelled) return;
        const ids = [
          PRODUCT_IDS.STARTER_PACK,
          ...AMBER_PACK_IDS,
          ...HINT_PACK_IDS,
          PRODUCT_IDS.COSMETIC_BUNDLE,
          PRODUCT_IDS.SUPPORTER_SUB,
        ];
        let products: IapProduct[] = await getProducts(ids);
        if (products.length === 0 && !cancelled) {
          await new Promise((r) => setTimeout(r, 600));
          products = await getProducts(ids);
        }
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
      Animated.spring(cardScale, { toValue: 1, ...getModalInSpring(phase), useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, cardScale, cardOpacity]);

  // Header amber balance: ticks from the old to the new value over ~400ms
  // (plain setState steps at ~30ms intervals, text-only) instead of an
  // instant number swap, with a one-cycle AmberSparkle burst on the pill.
  const [displayedAmber, setDisplayedAmber] = useState(amberBalance);
  const prevAmberRef = useRef(amberBalance);
  const [amberBurst, setAmberBurst] = useState(false);
  useEffect(() => {
    if (!visible) {
      prevAmberRef.current = amberBalance;
      setDisplayedAmber(amberBalance);
      setAmberBurst(false);
      return;
    }
    const prev = prevAmberRef.current;
    if (prev === amberBalance) return;
    if (reducedMotion) {
      setDisplayedAmber(amberBalance);
      prevAmberRef.current = amberBalance;
      return;
    }
    const start = prev;
    const end = amberBalance;
    const steps = 13; // ~400ms at ~30ms/step
    let i = 0;
    setAmberBurst(true);
    const id = setInterval(() => {
      i++;
      const fraction = Math.min(1, i / steps);
      setDisplayedAmber(Math.round(start + (end - start) * fraction));
      if (i >= steps) {
        clearInterval(id);
        prevAmberRef.current = end;
        setAmberBurst(false);
      }
    }, 30);
    return () => clearInterval(id);
  }, [amberBalance, visible, reducedMotion]);

  // successBox springs in (scale 0.9 -> 1 + fade) instead of popping.
  const successBoxScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.9)).current;
  const successBoxOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (!successMsg) {
      successBoxOpacity.setValue(0);
      successBoxScale.setValue(0.9);
      return;
    }
    if (reducedMotion) {
      successBoxOpacity.setValue(1);
      successBoxScale.setValue(1);
      return;
    }
    successBoxOpacity.setValue(0);
    successBoxScale.setValue(0.9);
    const anim = Animated.parallel([
      Animated.spring(successBoxScale, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
      Animated.timing(successBoxOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [successMsg, reducedMotion, successBoxScale, successBoxOpacity]);

  // Cross-platform screen-reader fallback for the store's transient messages:
  // accessibilityLiveRegion (below) is Android-only, so these announce the same
  // copy under VoiceOver too (announceForA11y is a no-op when no reader runs).
  useEffect(() => {
    if (successMsg) announceForA11y(successMsg);
  }, [successMsg]);
  useEffect(() => {
    if (faucetReveal) announceForA11y(`Added ${faucetReveal.amount} amber`);
  }, [faucetReveal]);
  useEffect(() => {
    if (flow === 'unavailable') {
      announceForA11y('The store is not available right now. Nothing was charged.');
    }
  }, [flow]);

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
    // A faucet claim SPENDS a rewarded view, so re-read the shared cap here or
    // a player at 7 views who claims once lands right back in the contradiction
    // ("1 left today", no button) on the second claim.
    isRewardedCapReached().then(setRewardedCapReached).catch(() => {});
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
          const credit = await saveWithPlayerRetry(() => settleConsumableGrant(result.grantId!));
          if (result.reward.kind === 'amber') {
            const balance = credit.amberBalance;
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
            const balance = credit.hintBalance;
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
    setFaucetReveal(null);
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: STARTER_PACK_INFO.productId, kind: 'starter' } });
    try {
      const result = await purchaseStarterPack();
      if (result.success && result.reward) {
        const amberCredit = await saveWithPlayerRetry(() => settleConsumableGrant(result.grantIds!.amber!));
        onAmberChange?.(amberCredit.amberBalance);
        const hintCredit = await saveWithPlayerRetry(() => settleConsumableGrant(result.grantIds!.hints!));
        onHintsChange?.(hintCredit.hintBalance);
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

  /**
   * The row's bottom rail: what you GET on the left, what it costs on the
   * right, sharing one baseline. The value slot flexes (and its text is
   * single-line) so a long value shrinks rather than shoving the action off
   * the card, and a row with nothing to state leaves an empty spacer that
   * still pins the action right.
   */
  const renderRowFooter = (value: React.ReactNode, action: React.ReactNode) => (
    <View style={styles.rowFooter}>
      <View style={styles.rowValue}>{value}</View>
      {action}
    </View>
  );

  /** Quantity as its own fact — the one number a buyer actually compares. */
  const renderRewardValue = (reward: ConsumableProductInfo['reward']) =>
    reward.kind === 'amber' ? (
      <AmberValue
        amount={reward.amount}
        size={14}
        color={t.amberText}
        textStyle={styles.valueAmber}
        accessibilityLabel={`${reward.amount} amber`}
      />
    ) : (
      <Text style={[styles.valueWord, { color: t.amberText }]} numberOfLines={1}>
        {reward.amount} hints
      </Text>
    );

  const renderPackRow = (info: ConsumableProductInfo) => (
    <PanelCard key={info.productId} phase={phase} style={styles.row}>
      <View style={styles.rowTop}>
        <StoreArtThumb artKey={info.productId} />
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
          <Text style={[styles.rowDesc, { color: t.body }]}>{info.description}</Text>
          {renderRowFooter(
            renderRewardValue(info.reward),
            renderPricePill(
              priceLabel(info),
              () => handleBuyConsumable(info),
              `Buy ${info.name}, ${info.reward.amount} ${info.reward.kind}, for ${priceLabel(info)}`,
            ),
          )}
        </View>
      </View>
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
          // VoiceOver: treat the store card as a modal so the reader stays
          // within it (accessibilityLiveRegion elsewhere is Android-only).
          accessibilityViewIsModal
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
              <View style={styles.amberBalanceWrap}>
                <AmberValue
                  amount={displayedAmber}
                  size={13}
                  color={t.amberText}
                  textStyle={styles.balanceText}
                  accessibilityLabel={`${displayedAmber} amber`}
                />
                {amberBurst && <AmberSparkle phase={phase} />}
              </View>
              <Text style={[styles.balanceText, { color: t.body }]}>
                <Image source={HINT_ICON} style={styles.hintInline} accessibilityLabel="hints" />{' '}
                {hintBalance}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <SupportComparison phase={phase} />
            {!ownsStarter && (
              <PanelCard phase={phase} style={styles.heroCard}>
                <View style={styles.heroRibbonRow}>
                  <Text style={[styles.ribbon, { color: t.pillText, backgroundColor: t.pillBg }]}>
                    BEST VALUE · ONE TIME
                  </Text>
                </View>
                <View style={styles.rowTop}>
                  <StoreArtThumb artKey={STARTER_PACK_INFO.productId} />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.heroTitle, { color: t.title }]}>{STARTER_PACK_INFO.name}</Text>
                    <Text style={[styles.rowDesc, { color: t.body }]}>
                      {STARTER_PACK_INFO.description}
                    </Text>
                  </View>
                </View>
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
                  <View style={styles.rowTop}>
                    <StoreArtThumb artKey={STORE_ART_KEYS.dailyAmber} />
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowTitle, { color: t.title }]}>Daily Amber</Text>
                      <Text style={[styles.rowDesc, { color: t.body }]}>
                        {/* Patrons never touch ads (handleClaimDailyAmber grants
                            directly and RewardedAdButton returns null for them),
                            so the shared cap is irrelevant to them — gating this
                            copy unconditionally would tell a Patron their free
                            amber was gone and hide a claim they can still make.

                            OWED: the cap-reached line below is inline only
                            because this batch could not edit phaseNarrative.ts.
                            It belongs in a phase-aware getter there
                            (getDailyAmberCapReachedLine(phase, amount)) like
                            every other player-facing string; the rest of this
                            card's copy predates the convention and should ride
                            the same move. Keep it free of em dashes either way,
                            noEmDashes.test.ts sweeps this file's literals. */}
                        {amberFaucet.available
                          ? (!isPatronSync() && rewardedCapReached
                              ? `Waiting for you. You have watched every clip today, so come back tomorrow for these ${DAILY_AMBER_REWARD} amber.`
                              : `Watch a short clip. ${amberFaucet.remaining} left today.`)
                          : 'Collected for today. Come back tomorrow!'}
                      </Text>
                      {amberFaucet.available && renderRowFooter(
                        // The reward rides the rail like every other row rather
                        // than being spelled into one branch's button label: the
                        // Patron action is just "Claim", so with the amount only
                        // in the button a Patron saw the offer with no number on
                        // it anywhere. Stating it here covers both branches and
                        // lets the rewarded button shed its "· +60" suffix, which
                        // also buys back the width its busy copy needs.
                        <AmberValue
                          amount={DAILY_AMBER_REWARD}
                          size={14}
                          color={t.amberText}
                          textStyle={styles.valueAmber}
                          accessibilityLabel={`${DAILY_AMBER_REWARD} amber`}
                        />,
                        isPatronSync() ? (
                          renderPricePill('Claim', handleClaimDailyAmber, `Claim ${DAILY_AMBER_REWARD} free amber`)
                        ) : (
                          <RewardedAdButton
                            placement="daily_amber"
                            onReward={handleClaimDailyAmber}
                            label="Watch"
                            accessibilityLabel={`Watch a clip for ${DAILY_AMBER_REWARD} free amber`}
                            phase={phase}
                            // Host is the cottage PanelCard, which stays light
                            // parchment through phase 3 (storm) and flips dark at
                            // 4 — 'auto' assumes a dark host from phase 3 and made
                            // the label near-invisible on the storm card.
                            surface={phase >= 4 ? 'dark' : 'light'}
                          />
                        ),
                      )}
                    </View>
                  </View>
                </PanelCard>
              </>
            )}

            <Text style={[styles.sectionLabel, { color: t.muted }]}>AMBER</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'amber').map(renderPackRow)}

            <Text style={[styles.sectionLabel, { color: t.muted }]}>HINTS</Text>
            {CONSUMABLE_PRODUCTS.filter(p => p.reward.kind === 'hints').map(renderPackRow)}

            <Text style={[styles.sectionLabel, { color: t.muted }]}>SUPPORTER</Text>
            <PanelCard phase={phase} style={styles.row}>
              <View style={styles.rowTop}>
                <StoreArtThumb artKey={PRODUCT_IDS.SUPPORTER_SUB} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: t.title }]}>Supporter</Text>
                  <Text style={[styles.rowDesc, { color: t.body }]}>
                    Ad-free, {SUPPORTER_MONTHLY_AMBER} amber every month, the season pass premium track, and an exclusive confetti. Cancel anytime.
                  </Text>
                  {renderRowFooter(
                    // Cadence rather than a count: the left slot always answers
                    // "what do I get", and for a subscription that is "monthly".
                    <Text style={[styles.valueWord, { color: t.amberText }]} numberOfLines={1}>Monthly</Text>,
                    isSupporterActive ? (
                      <Text style={[styles.ownedText, { color: t.amberText }]}>Active <Image source={CHROME_ICONS.starBullet} style={styles.inlineMark} /></Text>
                    ) : (
                      renderPricePill(
                        prices[PRODUCT_IDS.SUPPORTER_SUB] ?? SUPPORTER_SUB_FALLBACK_PRICE,
                        handleBuySupporter,
                        'Subscribe as a Supporter',
                      )
                    ),
                  )}
                </View>
              </View>
            </PanelCard>

            <Text style={[styles.sectionLabel, { color: t.muted }]}>COSMETIC BUNDLE</Text>
            <PanelCard phase={phase} style={styles.row}>
              <View style={styles.rowTop}>
                <StoreArtThumb artKey={PRODUCT_IDS.COSMETIC_BUNDLE} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: t.title }]}>The Keeper&apos;s Collection</Text>
                  <Text style={[styles.rowDesc, { color: t.body }]}>
                    The exclusive Eclipse tile set + Eclipse confetti. Equip them in the Cosmetic Shop.
                  </Text>
                  {renderRowFooter(
                    // Reads against Supporter's "Monthly" one row up: the two
                    // cash tiers differ by cadence, and that is the comparison.
                    <Text style={[styles.valueWord, { color: t.amberText }]} numberOfLines={1}>Forever</Text>,
                    ownsBundle ? (
                      <Text style={[styles.ownedText, { color: t.amberText }]}>Owned <Image source={CHROME_ICONS.starBullet} style={styles.inlineMark} /></Text>
                    ) : (
                      renderPricePill(
                        prices[PRODUCT_IDS.COSMETIC_BUNDLE] ?? COSMETIC_BUNDLE_FALLBACK_PRICE,
                        handleBuyBundle,
                        "Buy The Keeper's Collection",
                      )
                    ),
                  )}
                </View>
              </View>
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
                    <Text style={{ fontWeight: '800', color: t.title }}>Become a Patron <Image source={CHROME_ICONS.chevron} style={styles.inlineMark} /></Text>
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
            <Animated.View
              style={[
                styles.successBox,
                { backgroundColor: t.amberTint, borderColor: t.amberTintBorder },
                { opacity: successBoxOpacity, transform: [{ scale: successBoxScale }] },
              ]}
              accessibilityLiveRegion="polite"
            >
              <Text style={[styles.successText, { color: t.amberText }]}>{successMsg}</Text>
            </Animated.View>
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
    paddingVertical: SURFACE.panelPadY,
    paddingHorizontal: SURFACE.panelPadX,
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
  title: { fontSize: FONT_SIZE.display, fontWeight: '900', letterSpacing: 0.5, fontFamily: PIXEL_FONT_BOLD },
  balances: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceText: { fontSize: FONT_SIZE.bodyLg, fontWeight: '700', fontFamily: PIXEL_FONT_BOLD },
  // Wraps the amber balance so the one-cycle AmberSparkle burst has a
  // positioned anchor to overlay on credit.
  amberBalanceWrap: { position: 'relative' },
  hintInline: { width: 13, height: 13 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 4 },
  sectionLabel: {
    fontSize: FONT_SIZE.small,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: SURFACE.sectionLetterSpacing,
    marginTop: 16,
    marginBottom: 6,
  },

  // Starter pack hero — first card, framed by the amber accent border.
  heroCard: {
    paddingVertical: SURFACE.cardPadY,
    paddingHorizontal: SURFACE.cardPadX,
    marginTop: 12,
  },
  heroRibbonRow: { flexDirection: 'row', marginBottom: 8 },
  heroTitle: { fontSize: FONT_SIZE.title, fontWeight: '900', marginBottom: 2, fontFamily: PIXEL_FONT_BOLD },
  heroCta: { marginTop: 12 },

  // Section rows — layered PanelCard material.
  //
  // ART COLUMN + INFO COLUMN, and the info column carries its own bottom rail.
  // The width budget is the hard constraint: the cottage frames nest, so a row's
  // content box is only ~224dp on a 360dp screen (320 card - 2x28 panel band -
  // 2x20 card band). Art (60) + gap (10) leaves 154dp of info column; the rail
  // spends 80 of that on the action and ~66 on the value, and the description
  // gets the full 154 above them.
  //
  // The earlier anatomy stacked [art | title+desc] and then dropped the action
  // onto its own full-width tier below. That kept the text wide but left the art
  // floating mid-card with nothing under it and an L-shaped void in the bottom
  // left of every row, because the action only ever filled ~84dp of the right
  // edge. Moving the action INTO the info column and giving it a partner on the
  // same baseline closes the void without inlining the price beside the art —
  // which genuinely does not fit (art + price on one line leaves the words 68dp).
  row: {
    paddingVertical: SURFACE.cardPadY,
    paddingHorizontal: SURFACE.cardPadX,
    marginBottom: 8,
    minHeight: 68,
  },
  // The art + info columns. `gap` is the only separation between them, so the
  // text column keeps every dp the frame clearance left it (this is the store's
  // version of the shop's trimmed body gutter: rowInfo's old paddingRight is
  // gone, the space it held now sits between the art and the words).
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // NO borderRadius, NO border, NO overflow clip: the art is pixel work and
  // CSS-rounding a baked corner is the documented cozy-pixel anti-pattern.
  storeArt: { width: STORE_ART_DP, height: STORE_ART_DP },
  rowInfo: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowTitle: { fontSize: FONT_SIZE.callout, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  ribbon: {
    fontSize: FONT_SIZE.micro,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: 'hidden',
  },
  rowDesc: { fontSize: FONT_SIZE.small, marginTop: 3, lineHeight: 17, fontFamily: BODY_FONT },

  // The bottom rail: what you get (left) against what it costs (right), sharing
  // one baseline at the foot of the info column.
  //
  // It WRAPS rather than squeezes. The value is now the only place a row states
  // its reward quantity, and a CandyButton has no flexShrink (Yoga defaults it
  // to 0), so a plain `flex: 1` value slot is a pure subtraction remainder: the
  // button takes what its label needs and the quantity ellipsizes away first.
  // That fires on real devices — at the OS "Largest" font setting the 16pt price
  // label grows past the ~66dp the value has, and 5500 renders as "55...". With
  // flexBasis 'auto' the value contributes its REAL content width to the line,
  // so once value + gap + action exceeds the column the action drops to its own
  // line (flex-end keeps it right-aligned, and `gap` supplies the row gap) —
  // i.e. it degrades back to the old two-tier stack, but only on the devices
  // that need it. At default scale nothing moves: flexGrow still eats the slack
  // and pins the action right.
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rowValue: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // The quantity, in the store's one warm accent — sized just under the row
  // title so it reads as a fact about the row, never as a second title.
  valueAmber: { fontSize: FONT_SIZE.bodyLg, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },
  // Word-shaped values ("5 hints", "Monthly", "Forever") a step smaller again:
  // they are longer, and the width budget above leaves them ~66dp.
  valueWord: { fontSize: FONT_SIZE.body, fontWeight: '800', fontFamily: PIXEL_FONT_BOLD },

  // Price pill — chunky amber CandyButton (the single warm accent). Sits at the
  // right end of the rail, so the prices still stack into one scannable column
  // down the store. Position comes from the rail, not from the pill.
  pricePill: { minWidth: 80 },
  // Inline brass star / chevron marks (generateGameIcons chrome), x-height sized.
  inlineMark: {
    width: 12,
    height: 12,
  },
  // Owned/Active stands in for the price pill on the same rail.
  ownedText: {
    fontSize: FONT_SIZE.body,
    fontWeight: '800',
    paddingHorizontal: 8,
    fontFamily: PIXEL_FONT_BOLD,
  },

  patronLink: {
    marginTop: 16,
    paddingVertical: SURFACE.cardPadY,
    paddingHorizontal: SURFACE.cardPadX,
  },
  patronLinkText: { fontSize: FONT_SIZE.body, lineHeight: 18, textAlign: 'center', fontFamily: BODY_FONT },

  successBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  successText: { fontSize: FONT_SIZE.small, lineHeight: 17, textAlign: 'center', fontWeight: '700', fontFamily: PIXEL_FONT_BOLD },
  // Faucet claim reward reveal (magnitude-aware count-up in place of a static line).
  rewardBox: { marginTop: 12, alignItems: 'center' },
  unavailableBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unavailableText: { fontSize: FONT_SIZE.small, lineHeight: 17, textAlign: 'center', fontFamily: BODY_FONT },
  workingRow: { marginTop: 12, alignItems: 'center' },
  closeBtn: { marginTop: 12 },
});

export default StoreModal;
