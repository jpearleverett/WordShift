import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
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
import { getStoreArt } from './storeArt';
import { AmberInline } from '../AmberInline';
import {
  PRODUCT_IDS,
  getProducts,
  purchaseProduct,
  restorePurchases,
  IapProduct,
} from '../../services/iap';
import { isPatronSync, isAdFreeSync } from '../../services/entitlements';
import { PATRON_AMBER_BONUS } from '../../constants/gameBalance';
import { getSettingsSync } from '../../services/settings';
import { hapticLight, hapticMedium } from '../../services/haptics';
import { logEvent } from '../../services/eventLogger';
import { FONT_SIZE } from '../../theme/typeScale';

interface PatronModalProps {
  visible: boolean;
  /** Narrative phase, for phase-aware theming. */
  phase: number;
  onClose: () => void;
  /**
   * Optional callback fired after Patron status changes (purchase or restore
   * succeeds), so the host can refresh amber/cosmetic state. Receives the new
   * Patron flag.
   */
  onPatronChange?: (isPatron: boolean) => void;
}

type FlowState = 'idle' | 'working' | 'unavailable';

/**
 * Fallback price labels shown when the store product isn't fetchable (NoOp
 * billing, Expo Go, or a failed fetch) — mirrors the `fallbackPrice` pattern on
 * the consumable catalog in services/iap.ts. A price-less CTA reads as broken;
 * the native charge sheet always shows the store's own localized price, so a
 * stale label here can never mischarge. Keep in sync with the Play Console /
 * App Store Connect price tiers.
 */
// Value ladder (revenue-pass reprice): Remove-Ads moved to the word-game norm
// ($5.99; Wordscapes/WWF sit $5.99-9.99 for standalone ad-removal), and Patron
// sits above it so the superset (ad-free + amber/puzzle + exclusive cosmetic)
// never costs less than the ad-free-only tier. The Supporter subscription
// ($3.99/mo) is the cheaper recurring alternative between the two. These are
// fallback labels only — the real charge is the Play Console / App Store Connect
// price tier, which MUST be updated to match.
export const PATRON_FALLBACK_PRICE = '$8.99';
export const REMOVE_ADS_FALLBACK_PRICE = '$5.99';

/** Rendered size of a store thumbnail (art is drawn at 192px: scales DOWN only). */
const STORE_ART_DP = 56;

/**
 * The generated cottage thumbnail for one of this modal's two products.
 * Decorative on purpose (`accessible={false}`): the heading and the CTA label
 * already carry the semantics. Centred rather than leading, because this modal
 * is a centred column and a left-aligned thumbnail would break its axis (and
 * cost the copy width it does not have to spare).
 *
 * Never give this a borderRadius or a border - the art is pixel work.
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
 * "Become a Patron" modal — cosmetic & convenience only.
 *
 * Patron's Key grants two things, both read live from the source-of-truth
 * constants/services (never invented here):
 *   - a flat +PATRON_AMBER_BONUS amber per puzzle (the REWARD only — never phase
 *     progress; pacing is identical for free and paid players), and
 *   - the exclusive `theme_patron` gold tile theme (Cosmetic Shop).
 *
 * Every billing state is handled calmly: the NoOp/unconfigured backend returns
 * `success:false` / `'billing_unavailable'`, which surfaces as a quiet "not
 * available right now" state — never a crash or a scary error. Copy never breaks
 * the fourth wall (the animals don't know they're in a game).
 *
 * Surface language: the shared feel kit (`getSurfaceTheme`, PanelCard benefit
 * card, CandyButton actions — one primary CTA, quiet restore/dismiss).
 */
export const PatronModal: React.FC<PatronModalProps> = ({
  visible,
  phase,
  onClose,
  onPatronChange,
}) => {
  const reducedMotion = getSettingsSync().reducedMotion;

  const [isPatron, setIsPatron] = useState<boolean>(isPatronSync());
  const [adFree, setAdFree] = useState<boolean>(isAdFreeSync());
  const [flow, setFlow] = useState<FlowState>('idle');
  const [priceString, setPriceString] = useState<string | null>(null);
  const [adsPriceString, setAdsPriceString] = useState<string | null>(null);

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  // Sync entitlement flags whenever the modal opens (cache may have warmed since mount).
  useEffect(() => {
    if (visible) {
      setIsPatron(isPatronSync());
      setAdFree(isAdFreeSync());
    }
  }, [visible]);

  // Fetch a localized price string from the store when available. The NoOp
  // provider returns [], so we simply fall back to a generic label.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const products: IapProduct[] = await getProducts([PRODUCT_IDS.PATRON_KEY, PRODUCT_IDS.REMOVE_ADS]);
        const patron = products.find(p => p.productId === PRODUCT_IDS.PATRON_KEY);
        const ads = products.find(p => p.productId === PRODUCT_IDS.REMOVE_ADS);
        if (!cancelled) {
          setPriceString(patron?.priceString ?? null);
          setAdsPriceString(ads?.priceString ?? null);
        }
      } catch {
        if (!cancelled) {
          setPriceString(null);
          setAdsPriceString(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Entry animation.
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
      Animated.spring(cardScale, {
        toValue: 1,
        ...getModalInSpring(phase),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, cardScale, cardOpacity]);

  const handlePurchase = useCallback(async () => {
    if (flow === 'working') return;
    setFlow('working');
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: PRODUCT_IDS.PATRON_KEY, kind: 'patron' } });
    try {
      const result = await purchaseProduct(PRODUCT_IDS.PATRON_KEY);
      if (result.success) {
        const patron = isPatronSync();
        setIsPatron(patron);
        onPatronChange?.(patron);
        logEvent({ type: 'iap_purchase', data: { productId: PRODUCT_IDS.PATRON_KEY, kind: 'patron' } });
        hapticMedium();
        setFlow('idle');
        return;
      }
      // User dismissed the native sheet → just return to idle (no error state).
      if (result.cancelled) {
        logEvent({ type: 'purchase_cancelled', data: { productId: PRODUCT_IDS.PATRON_KEY, kind: 'patron' } });
        setFlow('idle');
        return;
      }
      // billing_unavailable (NoOp) or any other failure → calm unavailable state.
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.PATRON_KEY, kind: 'patron', reason: result.error ?? 'unknown' } });
      setFlow('unavailable');
    } catch {
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.PATRON_KEY, kind: 'patron', reason: 'exception' } });
      setFlow('unavailable');
    }
  }, [flow, onPatronChange]);

  const handlePurchaseRemoveAds = useCallback(async () => {
    if (flow === 'working') return;
    setFlow('working');
    hapticLight();
    logEvent({ type: 'purchase_initiated', data: { productId: PRODUCT_IDS.REMOVE_ADS, kind: 'adfree' } });
    try {
      const result = await purchaseProduct(PRODUCT_IDS.REMOVE_ADS);
      if (result.success) {
        // adFree reads patron OR remove-ads; refresh both flags from cache.
        setAdFree(isAdFreeSync());
        setIsPatron(isPatronSync());
        logEvent({ type: 'iap_purchase', data: { productId: PRODUCT_IDS.REMOVE_ADS, kind: 'adfree' } });
        hapticMedium();
        setFlow('idle');
        return;
      }
      if (result.cancelled) {
        logEvent({ type: 'purchase_cancelled', data: { productId: PRODUCT_IDS.REMOVE_ADS, kind: 'adfree' } });
        setFlow('idle');
        return;
      }
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.REMOVE_ADS, kind: 'adfree', reason: result.error ?? 'unknown' } });
      setFlow('unavailable');
    } catch {
      logEvent({ type: 'purchase_failed', data: { productId: PRODUCT_IDS.REMOVE_ADS, kind: 'adfree', reason: 'exception' } });
      setFlow('unavailable');
    }
  }, [flow]);

  const handleRestore = useCallback(async () => {
    if (flow === 'working') return;
    setFlow('working');
    hapticLight();
    try {
      await restorePurchases();
      const patron = isPatronSync();
      setIsPatron(patron);
      setAdFree(isAdFreeSync());
      onPatronChange?.(patron);
      if (patron) hapticMedium();
      setFlow('idle');
    } catch {
      // Restore on the NoOp backend yields an empty set; nothing to restore.
      setFlow('idle');
    }
  }, [flow, onPatronChange]);

  const handleClose = useCallback(() => {
    setFlow('idle');
    onClose();
  }, [onClose]);

  const t = getSurfaceTheme(phase);
  const skin = getPixelSkin(phase);

  const benefits: { key: string; render: React.ReactNode }[] = [
    {
      key: 'amber',
      render: (
        <Text style={[styles.benefitText, { color: t.body }]}>
          {'+'}{PATRON_AMBER_BONUS} <AmberInline size={13} /> amber on every puzzle you
          finish, a small, steady warmth. (It only sweetens the reward; the story
          keeps its own pace.)
        </Text>
      ),
    },
    {
      key: 'theme',
      render: (
        <Text style={[styles.benefitText, { color: t.body }]}>
          The exclusive amber-and-gold <Text style={{ fontWeight: '800', color: t.title }}>Patron</Text> tile set,
          yours to equip in the shop.
        </Text>
      ),
    },
    {
      key: 'quiet',
      render: (
        <Text style={[styles.benefitText, { color: t.body }]}>
          A quieter table. The occasional interludes between rooms step aside.
        </Text>
      ),
    },
  ];

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
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
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

          <Text style={[styles.eyebrow, { color: t.muted }]}>WORDSHIFT</Text>
          <StoreArtThumb artKey={PRODUCT_IDS.PATRON_KEY} />
          <Text style={[styles.title, { color: t.title }]}>Become a Patron</Text>
          <Text style={[styles.subtitle, { color: t.body }]}>
            A one-time thank-you that dresses up the table, never the path through it.
          </Text>

          {isPatron ? (
            <PanelCard phase={phase} style={styles.patronActiveBox}>
              <Text style={[styles.patronActiveTitle, { color: t.amberText }]}>
                You are a Patron <Image source={CHROME_ICONS.starBullet} style={styles.inlineMark} />
              </Text>
              <Text style={[styles.patronActiveBody, { color: t.body }]}>
                The warmth is already yours. {'+'}{PATRON_AMBER_BONUS} amber a puzzle and the
                Patron tile set in the shop. Thank you.
              </Text>
            </PanelCard>
          ) : (
            <PanelCard phase={phase} style={styles.benefits}>
              {benefits.map(b => (
                <View key={b.key} style={styles.benefitRow}>
                  <Image source={CHROME_ICONS.starBullet} style={styles.benefitBulletIcon} resizeMode="contain" accessible={false} />
                  {b.render}
                </View>
              ))}
            </PanelCard>
          )}

          {flow === 'unavailable' && !isPatron && (
            <View style={[styles.unavailableBox, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
              <Text style={[styles.unavailableText, { color: t.body }]}>
                Patronage isn’t available right now. Nothing was charged. Please try
                again later.
              </Text>
            </View>
          )}

          {/* Actions */}
          {!isPatron && (
            <CandyButton
              label={`Become a Patron · ${priceString ?? PATRON_FALLBACK_PRICE}`}
              onPress={handlePurchase}
              phase={phase}
              variant="primary"
              size="lg"
              disabled={flow === 'working'}
              accessibilityLabel="Become a Patron"
              style={styles.primaryBtn}
            />
          )}

          {/* Secondary, cheaper tier: Remove Ads — your 2x rewards instantly, no ad. */}
          {!isPatron && !adFree && (
            <View style={styles.removeAdsBlock}>
              <StoreArtThumb artKey={PRODUCT_IDS.REMOVE_ADS} />
              <Text style={[styles.removeAdsHint, { color: t.body }]}>
                Just want the convenience? Skip the ads and claim your doubled
                reward after each puzzle with a single tap.
              </Text>
              <CandyButton
                label={`Remove Ads · ${adsPriceString ?? REMOVE_ADS_FALLBACK_PRICE}`}
                onPress={handlePurchaseRemoveAds}
                phase={phase}
                variant="secondary"
                disabled={flow === 'working'}
                accessibilityLabel="Remove ads"
              />
            </View>
          )}

          {!isPatron && adFree && (
            <Text style={[styles.adFreeNote, { color: t.body }]}>
              Ads removed <Image source={CHROME_ICONS.check} style={styles.inlineMark} />. Your doubled reward is granted with a single tap.
            </Text>
          )}

          {flow === 'working' && (
            <View style={styles.workingRow}>
              <ActivityIndicator size="small" color={t.amberText} />
            </View>
          )}

          {(!isPatron || !adFree) && (
            <CandyButton
              label="Restore Purchases"
              onPress={handleRestore}
              phase={phase}
              variant="quiet"
              disabled={flow === 'working'}
              accessibilityLabel="Restore purchases"
              style={styles.restoreBtn}
            />
          )}

          <CandyButton
            label={isPatron ? 'Close' : 'Maybe later'}
            onPress={handleClose}
            phase={phase}
            variant="quiet"
            accessibilityLabel={isPatron ? 'Close' : 'Maybe later'}
          />

          <Text style={[styles.footnote, { color: t.muted }]}>
            Patron changes how the game looks and feels, never the story, the puzzles,
            or your progress.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    paddingVertical: 24,
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
  // NO borderRadius, NO border, NO overflow clip: the art is pixel work and
  // CSS-rounding a baked corner is the documented cozy-pixel anti-pattern.
  // Centred on the modal's axis, so it costs the copy no width at all.
  storeArt: { width: STORE_ART_DP, height: STORE_ART_DP, alignSelf: 'center', marginTop: 6 },
  eyebrow: {
    fontSize: FONT_SIZE.caption,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 3,
    textAlign: 'center',
  },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: FONT_SIZE.body,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  benefits: {
    marginTop: 20,
    gap: 12,
    paddingVertical: SURFACE.cardPadY,
    paddingHorizontal: SURFACE.cardPadX,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // Brass star bullet / inline check (generateGameIcons chrome) in place of
  // the '✦' and '✓' glyphs.
  inlineMark: {
    width: 13,
    height: 13,
  },
  benefitBulletIcon: {
    width: 14,
    height: 14,
    marginRight: 10,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: FONT_SIZE.body,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    lineHeight: 19,
  },
  patronActiveBox: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: SURFACE.cardPadX,
  },
  patronActiveTitle: {
    fontSize: FONT_SIZE.large,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    textAlign: 'center',
  },
  patronActiveBody: {
    fontSize: FONT_SIZE.body,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  unavailableBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  unavailableText: {
    fontSize: FONT_SIZE.small,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    lineHeight: 17,
  },
  // Primary CTA — the surface's ONE chunky primary CandyButton.
  primaryBtn: {
    marginTop: 22,
  },
  removeAdsBlock: {
    marginTop: 18,
  },
  removeAdsHint: {
    fontSize: FONT_SIZE.small,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  adFreeNote: {
    fontSize: FONT_SIZE.small,
    fontWeight: '600',
    fontFamily: PIXEL_FONT_BOLD,
    textAlign: 'center',
    marginTop: 16,
  },
  workingRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  restoreBtn: {
    marginTop: 8,
  },
  footnote: {
    fontSize: FONT_SIZE.caption,
    fontWeight: '500',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 15,
  },
});

export default PatronModal;
