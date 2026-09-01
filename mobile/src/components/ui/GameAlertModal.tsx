import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SURFACE, getSurfaceTheme, getPressSpring } from '../../theme/surfaces';
import { PanelCard } from './PanelCard';
import { CandyButton, CandyButtonVariant } from './CandyButton';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
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
 *
 * The card springs in (SURFACE.modalIn blended toward the phase press spring)
 * like every other restyled surface, not a stock linear crossfade. A
 * tone: 'beat' request (an authored "the rules just changed" moment) deepens
 * the scrim, pops from further back, and wears a soft accent glow so it never
 * reads like a mundane OK confirm. reducedMotion / low-tier pin it instant.
 */
export const GameAlertModal: React.FC<GameAlertModalProps> = ({ phase }) => {
  const [current, setCurrent] = useState<GameAlertRequest | null>(null);
  const queueRef = useRef<GameAlertRequest[]>([]);

  const reduceMotion = getSettingsSync().reducedMotion || shouldSimplifyAnimations();

  // Native-driven entrance values (opacity + transform only).
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

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

  // Spring entrance, re-run for each freshly shown alert (keyed on identity so
  // a queued alert taking the slot animates in fresh too).
  useEffect(() => {
    if (!current) return;
    if (reduceMotion) {
      backdropOpacity.setValue(1);
      cardScale.setValue(1);
      cardOpacity.setValue(1);
      return;
    }
    const isBeat = current.tone === 'beat';
    // A narrative beat pops from further back than a utility confirm.
    backdropOpacity.setValue(0);
    cardScale.setValue(isBeat ? 0.84 : 0.92);
    cardOpacity.setValue(0);
    // SURFACE.modalIn is the shared entrance; blend toward the phase press
    // spring so the alert takes the same weight language as the buttons
    // (bright snaps, dark releases heavily). A beat leans springier.
    const press = getPressSpring(phase);
    const blend = isBeat ? 0.5 : 0.35;
    const spring = {
      friction: SURFACE.modalIn.friction + (press.friction - SURFACE.modalIn.friction) * blend,
      tension: SURFACE.modalIn.tension + (press.tension - SURFACE.modalIn.tension) * blend,
    };
    const anim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        ...spring,
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
  }, [current, reduceMotion, phase, backdropOpacity, cardScale, cardOpacity]);

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
  const isBeat = current.tone === 'beat';
  // Cancel renders last (bottom), mirroring the stacked-alert convention.
  const ordered = [
    ...current.buttons.filter((b) => b.style !== 'cancel'),
    ...current.buttons.filter((b) => b.style === 'cancel'),
  ];
  const hasDestructive = current.buttons.some((b) => b.style === 'destructive');

  // A destructive action must NEVER out-emphasize the safe / keep-going one:
  //  - destructive -> quiet (a soft parchment bevel, never the loud primary)
  //  - cancel      -> primary WHEN a destructive sibling exists (the safe
  //                   option becomes the visible CTA), else quiet as before
  //  - other       -> first non-cancel primary, the rest secondary
  // Without this a style:'destructive' fell through to the index-0 primary,
  // inverting the onboarding skip-confirm so "Skip it all" read as the loud
  // primary over "Keep going".
  const variantFor = (button: GameAlertButton, index: number): CandyButtonVariant => {
    if (button.style === 'destructive') return 'quiet';
    if (button.style === 'cancel') return hasDestructive ? 'primary' : 'quiet';
    return index === 0 ? 'primary' : 'secondary';
  };

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleRequestClose}
    >
      {/* Animated tinted scrim (native opacity). A beat stacks a second pass
          to deepen it. Never a hard black scrim. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
      />
      {isBeat && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay, opacity: backdropOpacity }]}
        />
      )}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleRequestClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss alert"
      >
        <Animated.View
          style={[
            styles.cardWrap,
            isBeat && styles.cardWrapBeat,
            { transform: [{ scale: cardScale }], opacity: cardOpacity },
          ]}
        >
          {isBeat && (
            <View pointerEvents="none" style={[styles.glow, { backgroundColor: t.glow }]} />
          )}
          {/* claim touches so taps inside the card never hit the scrim */}
          <TouchableOpacity activeOpacity={1} style={styles.cardTouch}>
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
                    variant={variantFor(button, index)}
                    style={styles.button}
                    onPress={() => dismiss(button)}
                    accessibilityLabel={button.text}
                  />
                ))}
              </View>
            </PanelCard>
          </TouchableOpacity>
        </Animated.View>
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
  cardWrapBeat: {
    // A "the rules just changed" beat gets a touch more presence.
    maxWidth: 380,
  },
  cardTouch: {
    width: '100%',
  },
  glow: {
    position: 'absolute',
    top: -46,
    left: -30,
    right: -30,
    height: 200,
    borderRadius: 120,
    opacity: 0.28,
  },
  card: {
    paddingVertical: 26,
    paddingHorizontal: SURFACE.panelPadX,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.bodyLg,
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
