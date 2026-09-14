/**
 * The home header's amber number, counting itself up to a new total.
 *
 * The count-up used to live as HomeScreen state (`setDisplayAmber` on every
 * requestAnimationFrame for 320-1,300 ms), which re-rendered the whole home
 * screen, HouseWorld included, at up to 60 times a second on the most
 * frequent transition in the game (victory -> home), right while the 13
 * rooms were mounting (performance-size-7). This memoized leaf owns the
 * ticking state, so each frame re-renders exactly one Text.
 *
 * Semantics are byte-for-byte the old effect's: the first value snaps (the
 * component mounts showing `value`), a spend snaps down, reduced motion and
 * low-tier devices snap, and only a gain climbs, on the shared RewardReveal
 * tick math. The gem pop that accompanies a gain stays in HomeScreen (it is a
 * native-driver Animated.Value, not a render).
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { countUpDisplayValue, getCountUpDurationMs } from '../ui/RewardReveal';

interface AmberCountUpTextProps {
  /** The settled balance to count toward. */
  value: number;
  /** Global phase (the count-up duration cools with the house). */
  phase: number;
  style?: StyleProp<TextStyle>;
}

export const AmberCountUpText: React.FC<AmberCountUpTextProps> = memo(({ value, phase, style }) => {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const to = value;
    const from = displayRef.current;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    const duration = to > from && !reduced ? getCountUpDurationMs(to - from, phase) : 0;
    // A spend, reduced motion, or a zero-length climb: snap the number.
    if (duration <= 0) {
      displayRef.current = to;
      setDisplay(to);
      return;
    }
    const startedAt = Date.now();
    const tick = () => {
      const f = Math.min(1, (Date.now() - startedAt) / duration);
      const v = countUpDisplayValue(f, to, from);
      displayRef.current = v;
      setDisplay(v);
      if (f < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [value, phase]);

  return (
    <Text style={style} numberOfLines={1}>
      {display}
    </Text>
  );
});
AmberCountUpText.displayName = 'AmberCountUpText';
