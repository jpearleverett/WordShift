import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import { SURFACE, getSurfaceTheme, getPressSpring } from '../../theme/surfaces';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in rewardReveal.test.ts).
// ---------------------------------------------------------------------------

/**
 * Rounded display value for a count-up at eased progress `fraction` (0..1).
 * Clamps the fraction so out-of-range inputs (e.g. a late rAF frame) never
 * overshoot past the target or dip below the start. Kept pure so the tick
 * math is deterministic and testable without a renderer or timers.
 */
export function countUpDisplayValue(fraction: number, target: number, start = 0): number {
  const f = fraction <= 0 ? 0 : fraction >= 1 ? 1 : fraction;
  return Math.round(start + (target - start) * f);
}

/**
 * Phase-aware count-up duration in ms. Longer for bigger numbers (up to a
 * cap) and heavier as the descent deepens (a phase-5 reveal settles slower
 * than a bright phase-0 pop), mirroring the tile weight language. Returns 0
 * for a trivial target so a 0/1 reward shows instantly instead of ticking.
 */
export function getCountUpDurationMs(target: number, phase: number): number {
  const magnitude = Math.abs(Math.round(target));
  if (magnitude <= 1) return 0;
  const base = Math.min(1100, Math.max(320, magnitude * 26));
  const phaseFactor = 1 + Math.min(Math.max(phase, 0), 5) * 0.08;
  return Math.min(1300, Math.round(base * phaseFactor));
}

/**
 * Stagger delay for the item at `index` in an entrance cascade. Items past
 * `maxStaggered` share the capped delay so a long list snaps in together
 * instead of crawling. `baseMs` lets the header settle before the rows begin.
 */
export function getCascadeDelayMs(
  index: number,
  opts: { staggerMs?: number; maxStaggered?: number; baseMs?: number } = {},
): number {
  const staggerMs = opts.staggerMs ?? SURFACE.staggerMs;
  const maxStaggered = opts.maxStaggered ?? 10;
  const baseMs = opts.baseMs ?? 0;
  if (index <= 0) return baseMs;
  const capped = index < maxStaggered ? index : maxStaggered;
  return baseMs + capped * staggerMs;
}

/** Entrance fade/rise duration, phase-weighted (bright quick, dark heavier). */
function entranceDurationMs(phase: number): number {
  return 240 + Math.min(Math.max(phase, 0), 5) * 34;
}

// ---------------------------------------------------------------------------
// EntranceCascadeItem: a reusable fade + rise wrapper for staggered content.
// Native-driver opacity + translateY only. Reduced motion / low-tier devices
// pin the settled state instantly.
// ---------------------------------------------------------------------------

interface EntranceCascadeItemProps {
  phase: number;
  /** Delay before this item animates in (usually from getCascadeDelayMs). */
  delay?: number;
  /** How far the item rises from (dp). */
  riseFrom?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const EntranceCascadeItem: React.FC<EntranceCascadeItemProps> = ({
  phase,
  delay = 0,
  riseFrom = 14,
  style,
  children,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    if (reduced) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: entranceDurationMs(phase),
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
      anim.stopAnimation();
    };
    // Run once on mount: each item self-animates with its own delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [riseFrom, 0],
  });

  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// RewardReveal: a standalone, presentational reward reveal. Icon springs in,
// a soft phase-tinted glow blooms, the amount counts up, an optional label
// fades in. Native-driver transforms/opacity only; the number ticks on the JS
// thread (a plain rAF loop, never an Animated listener under the native
// driver). onDone fires when the count-up settles.
// ---------------------------------------------------------------------------

const GLOW_PEAK = 0.55;
const GLOW_REST = 0.3;

interface RewardRevealProps {
  amount: number;
  icon?: ImageSourcePropType;
  label?: string;
  phase: number;
  onDone?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const RewardReveal: React.FC<RewardRevealProps> = ({
  amount,
  icon,
  label,
  phase,
  onDone,
  style,
}) => {
  const t = getSurfaceTheme(phase);
  const target = Math.round(amount);

  const iconScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const labelOpacity = useRef(new Animated.Value(0)).current;

  const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
  const [display, setDisplay] = useState(reduced ? target : 0);

  // Keep the latest onDone without re-running the mount effect.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let rafId = 0;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;
    const anims: Animated.CompositeAnimation[] = [];

    if (reduced) {
      iconScale.setValue(1);
      glowOpacity.setValue(GLOW_REST);
      labelOpacity.setValue(1);
      setDisplay(target);
      doneTimer = setTimeout(() => onDoneRef.current?.(), 0);
      return () => {
        if (doneTimer) clearTimeout(doneTimer);
      };
    }

    iconScale.setValue(0);
    glowOpacity.setValue(0);
    labelOpacity.setValue(0);
    setDisplay(0);

    const pop = getPressSpring(phase);
    const iconAnim = Animated.spring(iconScale, {
      toValue: 1,
      friction: pop.friction,
      tension: pop.tension,
      useNativeDriver: true,
    });
    const glowAnim = Animated.sequence([
      Animated.timing(glowOpacity, {
        toValue: GLOW_PEAK,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: GLOW_REST,
        duration: 520,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]);
    const labelAnim = Animated.timing(labelOpacity, {
      toValue: 1,
      duration: 300,
      delay: 120,
      useNativeDriver: true,
    });
    anims.push(iconAnim, glowAnim, labelAnim);
    iconAnim.start();
    glowAnim.start();
    labelAnim.start();

    const duration = getCountUpDurationMs(target, phase);
    if (duration <= 0) {
      setDisplay(target);
      doneTimer = setTimeout(() => onDoneRef.current?.(), 0);
    } else {
      const startedAt = Date.now();
      const tick = () => {
        const fraction = Math.min(1, (Date.now() - startedAt) / duration);
        setDisplay(countUpDisplayValue(fraction, target));
        if (fraction < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          onDoneRef.current?.();
        }
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (doneTimer) clearTimeout(doneTimer);
      anims.forEach(a => a.stop());
      iconScale.stopAnimation();
      glowOpacity.stopAnimation();
      labelOpacity.stopAnimation();
    };
    // Reveal plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const a11yLabel = label ? `${label}: ${target}` : `${target}`;

  return (
    <View style={[styles.container, style]} accessible accessibilityLabel={a11yLabel}>
      <View style={styles.amountRow}>
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { backgroundColor: t.glow, opacity: glowOpacity }]}
        />
        {icon ? (
          <Animated.Image
            source={icon}
            style={[styles.icon, { transform: [{ scale: iconScale }] }]}
            resizeMode="contain"
          />
        ) : null}
        <Text style={[styles.amount, { color: t.amberText }]}>{display}</Text>
      </View>
      {label ? (
        <Animated.Text style={[styles.label, { color: t.body, opacity: labelOpacity }]}>
          {label}
        </Animated.Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  // Soft phase-tinted bloom behind the icon + number (native-driven opacity,
  // never an animated backgroundColor).
  glow: {
    position: 'absolute',
    left: -24,
    right: -24,
    top: -18,
    bottom: -18,
    borderRadius: 44,
  },
  icon: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  amount: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 34,
    fontWeight: '900',
  },
  label: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default RewardReveal;
