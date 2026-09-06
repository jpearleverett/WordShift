import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, Animated, Image, View } from 'react-native';
import { AnimalType, DialoguePhase } from '../../types/homeWorld';
import { getSettingsSync } from '../../services/settings';
import { BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { CHARACTER_SPRITES } from '../home/AnimalSprite';

interface AnimalWhisperProps {
  visible: boolean;
  animalName: string;
  whisperText: string;
  phase: DialoguePhase;
  onComplete: () => void;
  /** Safe-area top inset so the banner clears the status bar / notch. */
  topInset?: number;
  /**
   * The whispering animal, for the small spectral portrait beside the text.
   * Follows the house-wide robe rule (robed from Phase 4); when absent or
   * unknown the banner keeps its portrait-less layout (e.g. some
   * personalized Phase-5 templates).
   */
  animalType?: string;
}

const FADE_IN_DURATION = 400;
const HOLD_DURATION = 3000;
const FADE_OUT_DURATION = 600;

/**
 * A ghost-like whisper from an animal that fades in and out at the bottom
 * of the puzzle screen after puzzle completion. Phase-aware styling shifts
 * from friendly pink/purple to dark crimson as the narrative progresses.
 */
export const AnimalWhisper: React.FC<AnimalWhisperProps> = ({
  visible,
  animalName,
  whisperText,
  phase,
  onComplete,
  topInset = 0,
  animalType,
}) => {
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to always call the latest onComplete, avoiding stale closure capture
  const onCompleteRef = useRef(onComplete);
  useLayoutEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    if (!visible) {
      opacityAnim.setValue(0);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const { reducedMotion } = getSettingsSync();

    if (reducedMotion) {
      // Show instantly, hold, then hide and call onComplete
      opacityAnim.setValue(1);
      timerRef.current = setTimeout(() => {
        opacityAnim.setValue(0);
        onCompleteRef.current();
      }, HOLD_DURATION);
    } else {
      // Fade in -> hold -> fade out -> onComplete
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        useNativeDriver: true,
      }).start(() => {
        timerRef.current = setTimeout(() => {
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: FADE_OUT_DURATION,
            useNativeDriver: true,
          }).start(() => {
            onCompleteRef.current();
          });
        }, HOLD_DURATION);
      });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, opacityAnim]);

  if (!visible) return null;

  // The whisper is the per-win narrative beat and must layer ABOVE the victory
  // modal scrim (zIndex 500). It banners in at the TOP of the screen (below the
  // notch) — the bottom is where the modal's Next Level / Home / Share CTAs
  // live, and a translucent pill there was both occluded and unreadable. A
  // small downward settle derived from the same opacity value reads the banner
  // dropping in (native driver; reduced motion carries the translate instantly).
  const driftY = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  const containerStyle = phase >= 3
    ? styles.containerDark
    : phase === 2
      ? styles.containerMuted
      : styles.containerLight;

  const textStyle = phase >= 3
    ? styles.textDark
    : phase === 2
      ? styles.textMuted
      : styles.textLight;

  const nameStyle = phase >= 3
    ? styles.nameDark
    : phase === 2
      ? styles.nameMuted
      : styles.nameLight;

  // The speaker's face follows the whisper into the puzzle room: idle in the
  // bright phases (attachment when it matters most), ROBED from Phase 4 — a
  // robed figure silently whispering over the victory modal. Kept small and
  // slightly translucent so the ghost-like register survives; nothing renders
  // when the type is unknown, and the a11y label already speaks name + text.
  const sprites = animalType
    ? CHARACTER_SPRITES[animalType as AnimalType]
    : undefined;
  const portrait = sprites ? (phase >= 4 ? sprites.robed : sprites.idle) : undefined;

  return (
    <Animated.View
      style={[styles.container, containerStyle, { top: topInset + 12, opacity: opacityAnim, transform: [{ translateY: driftY }] }]}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={`${animalName} whispers: ${whisperText}`}
    >
      {portrait ? (
        <View style={styles.row}>
          <Image source={portrait} style={styles.portrait} resizeMode="contain" />
          <View style={styles.textColumn}>
            <Text style={[styles.nameText, styles.nameTextRow, nameStyle]}>{animalName}</Text>
            <Text style={[styles.whisperText, styles.whisperTextRow, textStyle]}>{whisperText}</Text>
          </View>
        </View>
      ) : (
        <>
          <Text style={[styles.nameText, nameStyle]}>{animalName}</Text>
          <Text style={[styles.whisperText, textStyle]}>{whisperText}</Text>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Top-anchored (the exact top is set inline from the safe-area inset) so it
    // banners in below the notch, clear of the modal's bottom CTAs.
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    maxWidth: '88%',
    alignItems: 'center',
    borderWidth: 1,
    // Layer above the victory modal overlay (zIndex 500) so the whisper is
    // not occluded at its only surfacing moment. elevation mirrors it for
    // Android's separate paint-order model.
    zIndex: 501,
    elevation: 14,
    // Soft lift off the bright modal so it reads as a floating banner.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  // Solid, readable banners (the old translucent pills vanished on the bright
  // modal). Each carries a matching hairline border for definition.
  containerLight: {
    backgroundColor: 'rgba(70, 34, 120, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  containerMuted: {
    backgroundColor: 'rgba(52, 34, 78, 0.96)',
    borderColor: 'rgba(210, 180, 230, 0.22)',
  },
  containerDark: {
    backgroundColor: 'rgba(18, 9, 14, 0.96)',
    borderColor: 'rgba(200, 70, 80, 0.30)',
  },
  // Portrait row layout: face | name-over-text. The column keeps the text's
  // max width in check so long whispers wrap beside the portrait.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portrait: {
    width: 38,
    height: 38,
    marginRight: 10,
    opacity: 0.9,
  },
  textColumn: {
    flexShrink: 1,
  },
  nameText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nameTextRow: {
    textAlign: 'left',
  },
  whisperTextRow: {
    textAlign: 'left',
  },
  // Light inks on the now-solid dark banners (were dark inks tuned for the old
  // translucent light pill, which vanished on the bright modal). All clear
  // >=4.5:1 on their banner background.
  nameLight: {
    color: '#FBD0E4',
  },
  nameMuted: {
    color: 'rgba(216, 190, 234, 0.96)',
  },
  nameDark: {
    color: 'rgba(232, 116, 126, 0.96)',
  },
  whisperText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  textLight: {
    color: 'rgba(255, 255, 255, 0.96)',
  },
  textMuted: {
    color: 'rgba(236, 226, 246, 0.96)',
  },
  textDark: {
    color: 'rgba(236, 202, 206, 0.94)',
  },
});
