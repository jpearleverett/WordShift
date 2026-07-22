import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Modal,
} from 'react-native';
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../theme/surfaces';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { getSettingsSync } from '../services/settings';

const BELL_ICON = require('../../assets/ui/bell.png');

interface NotificationPromptModalProps {
  /** Whether the prompt is showing. */
  visible: boolean;
  /** Narrative phase, for phase-aware theming + tone. */
  phase: number;
  title: string;
  body: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * The one-time daily-reminder pre-permission prompt, styled to match the game
 * instead of a bare OS Alert. Purely presentational: the caller decides when to
 * show it and owns the accept/decline side effects (permission request +
 * telemetry). Phase-aware + reduced-motion aware, like the rest of the modals.
 */
export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  visible,
  phase,
  title,
  body,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}) => {
  const t = getSurfaceTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;

  const backdropOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    if (reducedMotion) {
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    backdropOpacity.setValue(0);
    cardScale.setValue(0.92);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
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
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, reducedMotion, backdropOpacity, cardScale, cardOpacity]);

  const animateOut = useCallback((done: () => void) => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion) {
      done();
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
    ]).start(() => done());
  }, [reducedMotion, backdropOpacity, cardOpacity]);

  const handleAccept = useCallback(() => animateOut(onAccept), [animateOut, onAccept]);
  const handleDecline = useCallback(() => animateOut(onDecline), [animateOut, onDecline]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDecline}
    >
      <View style={styles.overlayRoot}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[
            styles.cardWrap,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          <PanelCard phase={phase} kind="panel" style={styles.card}>
            <View style={[styles.glow, { backgroundColor: t.glow }]} />

            <View style={[styles.iconBadge, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
              <Image
                source={BELL_ICON}
                style={styles.iconImage}
                accessibilityLabel="Reminder bell"
              />
            </View>

            <Text style={[styles.title, { color: t.title }]}>
              {title}
            </Text>

            <Text style={[styles.body, { color: t.body }]}>
              {body}
            </Text>

            <CandyButton
              label={acceptLabel}
              onPress={handleAccept}
              phase={phase}
              variant="primary"
              size="lg"
              style={styles.acceptButton}
              accessibilityLabel={acceptLabel}
            />

            <CandyButton
              label={declineLabel}
              onPress={handleDecline}
              phase={phase}
              variant="quiet"
              style={styles.declineButton}
              accessibilityLabel={declineLabel}
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
    paddingTop: 28,
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
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconGlyph: {
    fontSize: 30,
    fontFamily: BODY_FONT,
  },
  iconImage: {
    width: 38,
    height: 38,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: PIXEL_FONT_BOLD,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: PIXEL_FONT_BOLD,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  acceptButton: {
    alignSelf: 'stretch',
  },
  declineButton: {
    alignSelf: 'stretch',
    marginTop: 4,
  },
});
