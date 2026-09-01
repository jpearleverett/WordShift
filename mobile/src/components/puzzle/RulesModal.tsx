import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { CandyColors } from '../../theme/colors';
import { SURFACE, getSurfaceTheme, getModalInSpring } from '../../theme/surfaces';
import { PanelCard } from '../ui/PanelCard';
import { getRulesStepArt } from './difficultyArt';
import { CandyButton } from '../ui/CandyButton';
import { getSettingsSync } from '../../services/settings';
import { getRulesText } from '../../services/phaseNarrative';
import { DialoguePhase } from '../../types/homeWorld';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';

/**
 * Numbered step-chip hue rotation. The candy cycle survives every phase; only
 * its loudness changes: full pastels through Phase 1, tinted down at Phase 2,
 * dim glowing rings once the dark phases arrive.
 */
const STEP_HUES = [
  // `ink` is a purpose-picked deep tone per hue: the CandyColors dark values
  // sit under 4.5:1 on their own pastel fills, so the chip numbers carry
  // their own ink (>= 4.5:1 on both the full pastel and the phase-2 tint).
  { bright: CandyColors.pink.light, deep: CandyColors.pink.dark, ink: '#701A43' },
  { bright: CandyColors.blue.light, deep: CandyColors.blue.dark, ink: '#1E3A8A' },
  { bright: CandyColors.yellow.light, deep: CandyColors.yellow.shadow, ink: '#5C3D00' },
  { bright: CandyColors.green.light, deep: CandyColors.green.dark, ink: '#0F3D22' },
];

function getStepChipColors(
  idx: number,
  phase: number
): { bg: string; border: string; text: string } {
  const hue = STEP_HUES[idx % STEP_HUES.length];
  if (phase <= 1) return { bg: hue.bright, border: 'transparent', text: hue.ink };
  if (phase === 2) return { bg: hue.bright + '59', border: hue.deep + '26', text: hue.ink };
  // Dark phases: the hue survives as a dim ember behind a faint ring.
  return { bg: hue.deep + '2E', border: hue.bright + '3D', text: hue.bright };
}

interface RulesModalProps {
  visible: boolean;
  phase: DialoguePhase;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  visible,
  phase,
  onClose,
}) => {
  const rules = getRulesText(phase);
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

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlayRoot}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: t.overlay, opacity: backdropOpacity },
          ]}
        />
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.cardWrap,
              { transform: [{ scale: cardScale }], opacity: cardOpacity },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <PanelCard phase={phase} kind="panel" style={styles.rulesModal}>
              <CandyButton
                label={'✕'}
                onPress={handleClose}
                phase={phase}
                variant="quiet"
                style={styles.closeButton}
                accessibilityLabel="Close"
              />

              <Text style={[styles.rulesTitle, { color: t.title }]}>{rules.title}</Text>

              {rules.steps.map((step, idx) => {
                const chip = getStepChipColors(idx, phase);
                return (
                  <View key={idx} style={styles.ruleItem}>
                    {/* The step's own generated diagram (assets/ui/rules, built
                        from the game's candy tile) with the numbered candy chip
                        pinned to its corner, so the hue rotation survives and
                        the number stays readable. A step past the drawn set
                        keeps the plain chip. */}
                    {getRulesStepArt(idx) ? (
                      <View style={styles.ruleArtWrap}>
                        <Image source={getRulesStepArt(idx)!} style={styles.ruleArt} resizeMode="contain" accessible={false} />
                        <View
                          style={[
                            styles.ruleNumber,
                            styles.ruleNumberMini,
                            { backgroundColor: chip.bg, borderColor: chip.border },
                          ]}
                        >
                          <Text style={[styles.ruleNumberText, styles.ruleNumberTextMini, { color: chip.text }]}>{idx + 1}</Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.ruleNumber,
                          { backgroundColor: chip.bg, borderColor: chip.border },
                        ]}
                      >
                        <Text style={[styles.ruleNumberText, { color: chip.text }]}>{idx + 1}</Text>
                      </View>
                    )}
                    <View style={styles.ruleContent}>
                      <Text style={[styles.ruleHeading, { color: t.title }]}>{step.heading}</Text>
                      <Text style={[styles.ruleDesc, { color: t.body }]}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}

              <CandyButton
                label={rules.dismissLabel}
                onPress={handleClose}
                phase={phase}
                variant="primary"
                size="lg"
                style={styles.gotItButton}
              />
            </PanelCard>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
  },
  overlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
  },
  rulesModal: {
    width: '100%',
    paddingVertical: 28,
    paddingHorizontal: SURFACE.panelPadX,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  rulesTitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 24,
    // Clear the absolutely-positioned ✕ button: long phase titles ("THE
    // PATTERN") otherwise run underneath it.
    paddingHorizontal: 48,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  ruleNumber: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ruleNumberText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.headline,
    fontWeight: '900',
  },
  // Diagram + corner chip. The wrap is a touch wider than the art so the
  // chip can overhang its bottom-right corner without clipping.
  ruleArtWrap: {
    width: 58,
    height: 56,
    marginRight: 14,
    alignItems: 'flex-start',
  },
  ruleArt: {
    width: 52,
    height: 52,
  },
  ruleNumberMini: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 8,
    marginRight: 0,
  },
  ruleNumberTextMini: {
    fontSize: FONT_SIZE.caption,
  },
  ruleContent: {
    flex: 1,
  },
  ruleHeading: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
    fontWeight: '800',
    marginBottom: 2,
  },
  ruleDesc: {
    fontFamily: BODY_FONT,
    fontSize: FONT_SIZE.bodyLg,
    lineHeight: 19,
  },
  gotItButton: {
    marginTop: 8,
  },
});
