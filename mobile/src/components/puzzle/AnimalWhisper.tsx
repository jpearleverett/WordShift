import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { DialoguePhase } from '../../types/homeWorld';
import { getSettingsSync } from '../../services/settings';
import { CandyColors } from '../../theme/colors';

interface AnimalWhisperProps {
  visible: boolean;
  animalName: string;
  whisperText: string;
  phase: DialoguePhase;
  onComplete: () => void;
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
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to always call the latest onComplete, avoiding stale closure capture
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

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
  }, [visible]);

  if (!visible) return null;

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

  return (
    <Animated.View
      style={[styles.container, containerStyle, { opacity: opacityAnim }]}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={`${animalName} whispers: ${whisperText}`}
    >
      <Text style={[styles.nameText, nameStyle]}>{animalName}</Text>
      <Text style={[styles.whisperText, textStyle]}>{whisperText}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: '85%',
    alignItems: 'center',
  },
  containerLight: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  containerMuted: {
    backgroundColor: 'rgba(90, 56, 120, 0.25)',
  },
  containerDark: {
    backgroundColor: 'rgba(20, 10, 15, 0.55)',
  },
  nameText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nameLight: {
    color: CandyColors.pink.dark,
  },
  nameMuted: {
    color: 'rgba(180, 150, 200, 0.8)',
  },
  nameDark: {
    color: 'rgba(180, 60, 70, 0.9)',
  },
  whisperText: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  textLight: {
    color: CandyColors.purple.dark,
  },
  textMuted: {
    color: 'rgba(160, 140, 180, 0.85)',
  },
  textDark: {
    color: 'rgba(200, 80, 90, 0.85)',
  },
});
