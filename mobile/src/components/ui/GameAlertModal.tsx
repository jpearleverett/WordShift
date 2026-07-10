import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getSurfaceTheme } from '../../theme/surfaces';
import { PanelCard } from './PanelCard';
import { CandyButton } from './CandyButton';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import {
  GameAlertRequest,
  GameAlertButton,
  setGameAlertListener,
} from '../../services/gameAlert';

interface GameAlertModalProps {
  phase: number;
}

/**
 * Cottage-skinned host for showGameAlert (the in-game Alert.alert
 * replacement). Mounted ONCE at the App root, above every screen, so any
 * service/component can pop a skinned alert without plumbing. Shows one
 * alert at a time; further requests queue in arrival order.
 */
export const GameAlertModal: React.FC<GameAlertModalProps> = ({ phase }) => {
  const [current, setCurrent] = useState<GameAlertRequest | null>(null);
  const queueRef = useRef<GameAlertRequest[]>([]);

  useEffect(() => {
    const unsubscribe = setGameAlertListener((request) => {
      setCurrent((showing) => {
        if (showing) {
          queueRef.current.push(request);
          return showing;
        }
        return request;
      });
    });
    return unsubscribe;
  }, []);

  const dismiss = useCallback((button?: GameAlertButton) => {
    setCurrent(queueRef.current.shift() ?? null);
    // Fire after the state update is queued so a button opening ANOTHER
    // alert (or modal) doesn't race the dismissal.
    button?.onPress?.();
  }, []);

  // Scrim tap / hardware back behaves like the cancel button when one
  // exists, else like a plain single-button dismiss.
  const handleRequestClose = useCallback(() => {
    if (!current) return;
    const cancel = current.buttons.find((b) => b.style === 'cancel');
    if (cancel) {
      dismiss(cancel);
    } else if (current.buttons.length === 1) {
      dismiss(current.buttons[0]);
    }
    // Multi-button alerts with no explicit cancel require a choice.
  }, [current, dismiss]);

  if (!current) return null;

  const t = getSurfaceTheme(phase);
  // Cancel renders last (bottom), mirroring the stacked-alert convention.
  const ordered = [
    ...current.buttons.filter((b) => b.style !== 'cancel'),
    ...current.buttons.filter((b) => b.style === 'cancel'),
  ];

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={handleRequestClose}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: t.overlay }]}
        activeOpacity={1}
        onPress={handleRequestClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss alert"
      >
        {/* claim touches so taps inside the card never hit the scrim */}
        <TouchableOpacity activeOpacity={1} style={styles.cardWrap}>
          <PanelCard phase={phase} kind="panel" style={styles.card}>
            {current.title !== '' && (
              <Text style={[styles.title, { color: t.title }]}>{current.title}</Text>
            )}
            {Boolean(current.message) && (
              <Text style={[styles.message, { color: t.body }]}>{current.message}</Text>
            )}
            <View style={styles.buttonColumn}>
              {ordered.map((button, index) => (
                <CandyButton
                  key={`${button.text}-${index}`}
                  label={button.text}
                  phase={phase}
                  variant={
                    button.style === 'cancel'
                      ? 'quiet'
                      : index === 0
                        ? 'primary'
                        : 'secondary'
                  }
                  style={styles.button}
                  onPress={() => dismiss(button)}
                  accessibilityLabel={button.text}
                />
              ))}
            </View>
          </PanelCard>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    paddingVertical: 26,
    paddingHorizontal: 26,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: BODY_FONT,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  buttonColumn: {
    marginTop: 2,
  },
  button: {
    marginTop: 8,
  },
});

export default GameAlertModal;
