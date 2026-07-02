import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../../theme/colors';
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
 * Store/Patron surface theming — mirrors StoreModal's helper so the two
 * monetization surfaces speak one language: the phase's `getPhaseTheme` modal
 * card, quiet stat-box section tones, and ONE warm amber accent reserved for
 * the purchase CTA and amber amounts. Every text/background pair holds
 * >= 4.5:1 WCAG contrast across phases 0-5. (Duplicated rather than imported
 * across component modules to keep each modal's dependency graph standalone.)
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
    amberText: dark ? '#E9B468' : '#7A4E00',
    amberTint: dark ? 'rgba(255, 201, 77, 0.10)' : 'rgba(202, 138, 4, 0.10)',
    amberTintBorder: dark ? 'rgba(255, 201, 77, 0.30)' : 'rgba(202, 138, 4, 0.35)',
    pillBg: dark ? '#C98A4A' : '#F6BA3F',
    pillEdge: dark ? '#8F5F2E' : '#C8901E',
    pillText: dark ? '#241302' : '#3F2B04',
  };
}

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

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.9)).current;
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
    cardScale.setValue(0.9);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
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

  const t = getStoreSurfaceTheme(phase);

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
              backgroundColor: t.cardBg,
              borderColor: t.cardBorder,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={[styles.glow, { backgroundColor: t.glow }]} />

          <Text style={[styles.eyebrow, { color: t.body }]}>WORDSHIFT</Text>
          <Text style={[styles.title, { color: t.title }]}>Become a Patron</Text>
          <Text style={[styles.subtitle, { color: t.body }]}>
            A one-time thank-you that dresses up the table, never the path through it.
          </Text>

          {isPatron ? (
            <View style={[styles.patronActiveBox, { backgroundColor: t.amberTint, borderColor: t.amberTintBorder }]}>
              <Text style={[styles.patronActiveTitle, { color: t.amberText }]}>
                You are a Patron ✦
              </Text>
              <Text style={[styles.patronActiveBody, { color: t.body }]}>
                The warmth is already yours. {'+'}{PATRON_AMBER_BONUS} amber a puzzle and the
                Patron tile set in the shop. Thank you.
              </Text>
            </View>
          ) : (
            <View style={[styles.benefits, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
              {benefits.map(b => (
                <View key={b.key} style={styles.benefitRow}>
                  <Text style={[styles.benefitBullet, { color: t.amberText }]}>✦</Text>
                  {b.render}
                </View>
              ))}
            </View>
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
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: t.pillBg, borderBottomColor: t.pillEdge }]}
              onPress={handlePurchase}
              disabled={flow === 'working'}
              accessibilityRole="button"
              accessibilityState={{ disabled: flow === 'working' }}
              accessibilityLabel="Become a Patron"
            >
              {flow === 'working' ? (
                <ActivityIndicator size="small" color={t.pillText} />
              ) : (
                <Text style={[styles.primaryBtnText, { color: t.pillText }]}>
                  {priceString ? `Become a Patron · ${priceString}` : 'Become a Patron'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Secondary, cheaper tier: Remove Ads — your 2x rewards instantly, no ad. */}
          {!isPatron && !adFree && (
            <View style={[styles.removeAdsBlock, { borderTopColor: t.sectionBorder }]}>
              <Text style={[styles.removeAdsHint, { color: t.body }]}>
                Just want the convenience? Skip the ads and claim your doubled
                reward after each puzzle with a single tap.
              </Text>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}
                onPress={handlePurchaseRemoveAds}
                disabled={flow === 'working'}
                accessibilityRole="button"
                accessibilityState={{ disabled: flow === 'working' }}
                accessibilityLabel="Remove ads"
              >
                <Text style={[styles.secondaryBtnText, { color: t.title }]}>
                  {adsPriceString ? `Remove Ads · ${adsPriceString}` : 'Remove Ads'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isPatron && adFree && (
            <Text style={[styles.adFreeNote, { color: t.body }]}>
              Ads removed ✓. Your doubled reward is granted with a single tap.
            </Text>
          )}

          {(!isPatron || !adFree) && (
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={flow === 'working'}
              accessibilityRole="button"
              accessibilityState={{ disabled: flow === 'working' }}
              accessibilityLabel="Restore purchases"
            >
              <Text style={[styles.restoreText, { color: t.body }]}>Restore Purchases</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={isPatron ? 'Close' : 'Maybe later'}
          >
            <Text style={[styles.closeText, { color: t.body }]}>
              {isPatron ? 'Close' : 'Maybe later'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footnote, { color: t.body }]}>
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
    borderRadius: 28,
    borderWidth: 1.5,
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  benefits: {
    marginTop: 20,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  benefitBullet: {
    fontSize: 14,
    fontWeight: '900',
    marginRight: 10,
    marginTop: 1,
  },
  benefitText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 19,
  },
  patronActiveBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  patronActiveTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  patronActiveBody: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  unavailableBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  unavailableText: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
  },
  // Primary CTA — the modal's single amber accent, weighty bottom edge.
  primaryBtn: {
    marginTop: 22,
    paddingVertical: 15,
    borderRadius: 16,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  removeAdsBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  removeAdsHint: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  adFreeNote: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  restoreBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footnote: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 15,
  },
});

export default PatronModal;
