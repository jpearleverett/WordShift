import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  ImageSourcePropType,
} from 'react-native';
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../../theme/surfaces';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { hapticSuccess } from '../../services/haptics';
import { playUiSound } from '../../services/uiSound';
import { getSettingsSync } from '../../services/settings';
import { PanelCard } from '../ui/PanelCard';
import { CandyButton } from '../ui/CandyButton';
import { RewardReveal } from '../ui/RewardReveal';

/** One granted line in the gift (e.g. 400 amber, 5 hints). */
export interface GiftItem {
  /** Icon for the reward reveal (amber gem, hint bulb, ...). */
  icon?: ImageSourcePropType;
  /** The granted amount, counts up from zero in the reveal. */
  amount: number;
  /** Short label under the count-up ("amber", "hints"). */
  label: string;
}

interface GiftOverlayProps {
  /** Show the gift. Toggling to true replays the reveal from zero. */
  visible: boolean;
  /** Narrative phase, for phase-aware theming (the card ages with the descent). */
  phase: number;
  /** Warm, in-world headline (never names money). */
  title: string;
  /** Optional supporting line in the game's register. */
  subtitle?: string;
  /** The granted contents, each shown as a magnitude-aware RewardReveal. */
  items: GiftItem[];
  /** Dismiss label; defaults to a warm confirmation. */
  ctaLabel?: string;
  onClose: () => void;
}

/**
 * A bespoke one-shot GIFT moment, the marquee reward presentation for the paid
 * first-purchase 2x and the Keeper's Welcome starter pack. Reuses the
 * DailyLoginModal card anatomy (backdrop fade + SURFACE.modalIn card spring +
 * a settling pop on the reward block) so the grant lands as a real gift instead
 * of an appended text line.
 *
 * Purely presentational: the amber / hints have already been credited by the
 * caller (the pending-IAP-grant ledger is untouched). This only PRESENTS what
 * was granted, composing the shared RewardReveal so every line counts up with
 * celebration. Native-driver transforms / opacity only; reduced motion pins the
 * settled state instantly. Copy stays in the game's register, the store's price
 * strings are the only place money is ever named.
 */
export const GiftOverlay: React.FC<GiftOverlayProps> = ({
  visible,
  phase,
  title,
  subtitle,
  items,
  ctaLabel,
  onClose,
}) => {
  const t = getSurfaceTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;

  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const giftPop = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    // Mark the reward moment (self-gated on the sound / haptic prefs).
    hapticSuccess();
    playUiSound('amber_earn');
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      giftPop.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    giftPop.setValue(0);
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
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
      ]),
      Animated.spring(giftPop, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, cardScale, cardOpacity, giftPop]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion) {
      onClose();
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: SURFACE.modalOutMs,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [reducedMotion, backdropOpacity, cardOpacity, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlayRoot}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[
            styles.cardWrap,
            { transform: [{ scale: cardScale }], opacity: cardOpacity },
          ]}
        >
          <PanelCard phase={phase} kind="panel" style={styles.card}>
            <View style={[styles.glow, { backgroundColor: t.glow }]} />

            <Text style={[styles.eyebrow, { color: t.amberText }]}>A GIFT</Text>
            <Text style={[styles.title, { color: t.title }]}>{title}</Text>

            {subtitle ? (
              <Text style={[styles.subtitle, { color: t.muted }]}>{subtitle}</Text>
            ) : null}

            <Animated.View style={[styles.rewards, { transform: [{ scale: giftPop }] }]}>
              {items.map((item, idx) => (
                <RewardReveal
                  key={`${item.label}-${idx}`}
                  amount={item.amount}
                  icon={item.icon}
                  label={item.label}
                  phase={phase}
                  style={idx > 0 ? styles.rewardStacked : undefined}
                />
              ))}
            </Animated.View>

            <CandyButton
              label={ctaLabel ?? 'Wonderful'}
              onPress={handleClose}
              phase={phase}
              variant="primary"
              size="lg"
              style={styles.cta}
              accessibilityLabel="Accept gift"
            />
          </PanelCard>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    width: '100%',
    paddingTop: 26,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 180,
    opacity: 0.3,
    borderRadius: 100,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 3,
    textAlign: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: BODY_FONT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  rewards: {
    marginTop: 22,
    marginBottom: 4,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  rewardStacked: {
    marginTop: 14,
  },
  cta: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});

export default GiftOverlay;
