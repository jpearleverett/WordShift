import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';

/**
 * The Blind Offering judges the whole chain exactly ONCE, when the final letter
 * lands — validity was hidden the entire board, so that judgment IS the mode's
 * payoff. Without a bespoke beat it fell straight into the identical victory
 * choreography (success) or a plain error shake (failure), leaving the apex
 * mode's whole reason to exist unmarked.
 *
 * This overlay marks the moment over the board itself, in the window before the
 * victory modal covers it (the stars pop over the board first):
 *  - accepted: a green light SWEEPS down the rows, revealing that the whole
 *    hidden chain was valid all along.
 *  - rejected: a heavy crimson pulse — the chain was refused, walk it back.
 *
 * Purely presentational + pointer-transparent (never blocks board input), and
 * native-driver only (opacity + translateY). Reduced motion / low-tier devices
 * collapse the sweep to a single instant flash so the beat still reads without
 * the animation. Fires on each new `signal.id`.
 */

export interface BlindJudgmentSignal {
  kind: 'accepted' | 'rejected';
  /** Monotonic id so a repeat of the same kind still re-fires the beat. */
  id: number;
}

interface BlindJudgmentOverlayProps {
  signal: BlindJudgmentSignal | null;
  phase: number;
}

const ACCEPT_GREEN = '#3BE08A';
const REJECT_CRIMSON = '#C0304A';

export const BlindJudgmentOverlay: React.FC<BlindJudgmentOverlayProps> = ({ signal }) => {
  // Sweep band (accepted) travels top -> bottom; the flash layer (both kinds)
  // fades in and out. Two native-driven values, reused across fires.
  const sweepProgress = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const kindRef = useRef<'accepted' | 'rejected'>('accepted');
  const lastIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!signal) return;
    if (lastIdRef.current === signal.id) return;
    lastIdRef.current = signal.id;
    kindRef.current = signal.kind;

    const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    sweepProgress.stopAnimation();
    flashOpacity.stopAnimation();
    sweepProgress.setValue(0);

    if (reduced) {
      // A single quick flash carries the verdict without the sweep.
      flashOpacity.setValue(0);
      const flash = Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.32, duration: 90, useNativeDriver: true }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]);
      flash.start();
      return () => flash.stop();
    }

    if (signal.kind === 'accepted') {
      // Green light sweeps down the rows (the hidden chain validating in
      // sequence), with a soft accept wash that lifts and settles.
      flashOpacity.setValue(0);
      const anim = Animated.parallel([
        Animated.timing(sweepProgress, {
          toValue: 1,
          duration: 680,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.22, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 480, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]);
      anim.start();
      return () => anim.stop();
    }

    // rejected: a heavier crimson pulse (a double-throb reads as refusal).
    const anim = Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.4, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0.12, duration: 150, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0.34, duration: 120, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [signal, sweepProgress, flashOpacity]);

  if (!signal) return null;
  const color = kindRef.current === 'accepted' ? ACCEPT_GREEN : REJECT_CRIMSON;

  // The sweep band is a soft horizontal light that translates down the board.
  const bandTranslateY = sweepProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30%', '130%'],
  });
  const bandOpacity = sweepProgress.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 0.5, 0.5, 0],
  });

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Full-board wash (both kinds) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: flashOpacity }]}
      />
      {/* Sweep band — accepted only */}
      {kindRef.current === 'accepted' && (
        <Animated.View
          style={[
            styles.sweepBand,
            { backgroundColor: ACCEPT_GREEN, opacity: bandOpacity, transform: [{ translateY: bandTranslateY }] },
          ]}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sweepBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '22%',
  },
});

export default BlindJudgmentOverlay;
