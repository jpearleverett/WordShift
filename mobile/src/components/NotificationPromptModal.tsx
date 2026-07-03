import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';

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
  const phaseTheme = getPhaseTheme(phase);
  const reducedMotion = getSettingsSync().reducedMotion;

  const cardScale = useRef(new Animated.Value(reducedMotion ? 1 : 0.85)).current;
  const cardOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    cardScale.setValue(0.85);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDecline}
    >
      <View style={[styles.overlay, { backgroundColor: phaseTheme.modalOverlayColor }]}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: phaseTheme.modalBgColor,
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          <View style={[styles.glow, { backgroundColor: phaseTheme.victoryGlowColor }]} />

          <View style={[styles.iconBadge, { backgroundColor: phaseTheme.modalStatBgColor }]}>
            <Text
              style={styles.iconGlyph}
              accessibilityLabel="Reminder bell"
            >
              🔔
            </Text>
          </View>

          <Text style={[styles.title, { color: phaseTheme.modalTextColor }]}>
            {title}
          </Text>

          <Text style={[styles.body, { color: phaseTheme.modalSecondaryTextColor }]}>
            {body}
          </Text>

          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: phaseTheme.modalTextColor }]}
            onPress={onAccept}
            accessibilityRole="button"
            accessibilityLabel={acceptLabel}
            activeOpacity={0.85}
          >
            <Text style={[styles.acceptText, { color: phaseTheme.modalBgColor }]}>
              {acceptLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            accessibilityRole="button"
            accessibilityLabel={declineLabel}
            activeOpacity={0.7}
          >
            <Text style={[styles.declineText, { color: phaseTheme.modalSecondaryTextColor }]}>
              {declineLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
    overflow: 'hidden',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconGlyph: {
    fontSize: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  acceptButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  declineButton: {
    width: '100%',
    paddingVertical: 13,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
