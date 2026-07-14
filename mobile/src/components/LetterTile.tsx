import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Letter } from '../types';
import { getTileColor, CandyColors, getPhaseTheme, getResonanceConfig } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import {
  STANDARD_TILE_W,
  STANDARD_TILE_MARGIN_H,
  COMPACT_TILE_W,
  COMPACT_TILE_MARGIN_H,
} from '../constants/tileLayout';
import { PIXEL_FONT_BOLD } from '../theme/fonts';

interface LetterTileProps {
  letter: Letter;
  onPress?: () => void;
  /**
   * Feedback-only press for tiles that are NOT interactable (locked tiles in
   * the active source row, letter tiles in the target row during targeting).
   * Mounts the touchable so the tap is acknowledged — the handler gives
   * feedback (shake / message / haptic / slot pulse) but never commits a move.
   * Ignored when the tile is genuinely clickable (isInteractable/isSelected
   * with onPress).
   */
  onLockedPress?: () => void;
  isSelected?: boolean;
  isInteractable?: boolean;
  highlight?: 'default' | 'source' | 'locked';
  phase?: number;
  compact?: boolean;
  /** Whether this tile belongs to a word that resonates with the current narrative phase */
  isResonant?: boolean;
  /** Tutorial guidance highlight for the recommended tile */
  isGuided?: boolean;
  /**
   * When set (and changed), plays the arrival settle: the tile scales in from
   * ~0.65 and slides from the direction it travelled, replacing the tap-path
   * teleport. Provided only for the letter just placed by a committed tap move.
   */
  arrivalMoveId?: number;
  /** Direction the letter travelled: 'down' = it came from the row above. */
  arrivalDirection?: 'down' | 'up';
}

// Compact tile dimensions for 6+ letter words
const COMPACT_OUTER_W = COMPACT_TILE_W; // 42
const COMPACT_OUTER_H = 52;
const COMPACT_BODY_W = 42;
const COMPACT_BODY_H = 46;
const COMPACT_FONT = 21;

const LetterTileComponent: React.FC<LetterTileProps> = ({
  letter,
  onPress,
  onLockedPress,
  isSelected,
  isInteractable,
  highlight = 'default',
  phase = 0,
  compact = false,
  isResonant = false,
  isGuided = false,
  arrivalMoveId,
  arrivalDirection,
}) => {
  const settings = getSettingsSync();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const trailGlowAnim = useRef(new Animated.Value(0)).current;
  const resonanceAnim = useRef(new Animated.Value(0)).current;
  const guidePulseAnim = useRef(new Animated.Value(0)).current;
  const arrivalScaleAnim = useRef(new Animated.Value(1)).current;
  const arrivalTranslateYAnim = useRef(new Animated.Value(0)).current;

  // Loop refs for proper cleanup (prevents memory leaks)
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const shineLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const wobbleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const trailGlowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const resonanceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const guideLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const arrivalAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const trailParticleAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      translateY: new Animated.Value(0),
    }))
  ).current;
  const trailParticleLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Phase-aware animation parameters for selected tiles
  const getSelectedSpringParams = () => {
    if (phase >= 4) return { friction: 9, tension: 80 };
    if (phase >= 3) return { friction: 7, tension: 100 };
    if (phase >= 2) return { friction: 5, tension: 150 };
    // Phase 1: a barely-perceptible settling — the first hint the candy is cooling.
    if (phase >= 1) return { friction: 4, tension: 175 };
    return { friction: 3, tension: 200 };
  };

  const getWobbleDurations = () => {
    if (phase >= 4) return { quarter: 400, half: 800 };
    if (phase >= 3) return { quarter: 300, half: 600 };
    if (phase >= 2) return { quarter: 200, half: 400 };
    if (phase >= 1) return { quarter: 175, half: 350 };
    return { quarter: 150, half: 300 };
  };

  const getBounceHeight = () => {
    if (phase >= 4) return -1.5;
    if (phase >= 3) return -2;
    if (phase >= 2) return -3;
    if (phase >= 1) return -3.5;
    return -4;
  };

  // The selected-tile float bob slows as it shrinks: a small SLOW bob reads as
  // weight, a small fast bob just reads as jitter.
  const getBounceDuration = () => {
    if (phase >= 4) return 850;
    if (phase >= 3) return 700;
    if (phase >= 2) return 550;
    if (phase >= 1) return 450;
    return 400;
  };

  // Idle timings (every tile, all the time — this is where the board's weight
  // actually reads, since only one tile is ever selected). The candy glow
  // pulse slows from a lively shimmer to a long tired breath, and the glass
  // shine sweep comes rarer and drags slower as the phases descend.
  const getIdleTimings = () => {
    if (phase >= 4) return { pulse: 2600, shineDelay: 5200, shineSweep: 1150 };
    if (phase >= 3) return { pulse: 2100, shineDelay: 4200, shineSweep: 950 };
    if (phase >= 2) return { pulse: 1700, shineDelay: 3200, shineSweep: 780 };
    if (phase >= 1) return { pulse: 1400, shineDelay: 2500, shineSweep: 680 };
    return { pulse: 1200, shineDelay: 2000, shineSweep: 600 };
  };

  // Heavy tiles barely tip; bright candy rocks freely.
  const getWobbleAmplitudeDeg = () => {
    if (phase >= 4) return 1.6;
    if (phase >= 3) return 2;
    if (phase >= 2) return 2.4;
    if (phase >= 1) return 2.8;
    return 3;
  };

  // Get consistent color based on letter
  const tileColor = getTileColor(letter.char);

  // Idle animation for interactable tiles
  useEffect(() => {
    if (settings.reducedMotion || shouldSimplifyAnimations()) return;
    if (isInteractable && !isSelected) {
      const idleTimings = getIdleTimings();
      // Subtle pulse glow — drives only the glow overlay's opacity (native
      // driver). Phase-aware cadence: lively candy shimmer at Phase 0, a long
      // tired breath by Phase 4 (the always-visible half of the tiles'
      // "heavier every phase" language).
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: idleTimings.pulse,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: idleTimings.pulse,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoopRef.current = glowLoop;
      glowLoop.start();

      // Shine sweep animation — rarer and slower as the phases descend (the
      // glass losing its sparkle).
      const shineLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(idleTimings.shineDelay),
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: idleTimings.shineSweep,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      shineLoopRef.current = shineLoop;
      shineLoop.start();
    } else {
      glowAnim.setValue(0);
      shineAnim.setValue(0);
    }

    return () => {
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
      if (shineLoopRef.current) {
        shineLoopRef.current.stop();
        shineLoopRef.current = null;
      }
      glowAnim.stopAnimation();
      shineAnim.stopAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- anim values are stable refs
  }, [isInteractable, isSelected, settings.reducedMotion, phase]);

  // Selected bounce animation (phase-aware: bouncy at Phase 0, heavy/ritualistic at Phase 4)
  useEffect(() => {
    const currentSettings = getSettingsSync();
    if (currentSettings.reducedMotion) {
      scaleAnim.setValue(isSelected ? 1.08 : 1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
      trailGlowAnim.setValue(0);
      return;
    }
    if (isSelected) {
      const springParams = getSelectedSpringParams();
      const wobbleDurations = getWobbleDurations();
      const bounceHeight = getBounceHeight();

      // Initial pop - phase-aware spring (bouncy Phase 0 → heavy Phase 4)
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: springParams.friction,
          tension: springParams.tension,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: springParams.friction + 1,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous wobble - phase-aware speed (quick Phase 0 → very slow Phase 4)
      const wobbleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, {
            toValue: 1,
            duration: wobbleDurations.quarter,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -1,
            duration: wobbleDurations.half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 0,
            duration: wobbleDurations.quarter,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      wobbleLoopRef.current = wobbleLoop;
      wobbleLoop.start();

      // Floating bounce - phase-aware height AND speed (light quick float at
      // Phase 0 → a small slow heave by Phase 4; a shrunken-but-fast bob reads
      // as jitter, not weight)
      const bounceDuration = getBounceDuration();
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: bounceHeight,
            duration: bounceDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: bounceDuration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      bounceLoopRef.current = bounceLoop;
      bounceLoop.start();

      // Trail glow effect at Phase 3+ (energy mark pulsing glow overlay).
      // Drives only the pre-styled overlay's opacity — native driver safe.
      // Skipped entirely on low-end devices.
      if (phase >= 3 && !shouldSimplifyAnimations()) {
        const trailGlowLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(trailGlowAnim, {
              toValue: 1,
              duration: phase >= 4 ? 800 : 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(trailGlowAnim, {
              toValue: 0,
              duration: phase >= 4 ? 800 : 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        trailGlowLoopRef.current = trailGlowLoop;
        trailGlowLoop.start();
      }
    } else {
      scaleAnim.setValue(1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
      trailGlowAnim.setValue(0);
    }

    return () => {
      if (wobbleLoopRef.current) {
        wobbleLoopRef.current.stop();
        wobbleLoopRef.current = null;
      }
      if (bounceLoopRef.current) {
        bounceLoopRef.current.stop();
        bounceLoopRef.current = null;
      }
      if (trailGlowLoopRef.current) {
        trailGlowLoopRef.current.stop();
        trailGlowLoopRef.current = null;
      }
      scaleAnim.stopAnimation();
      bounceAnim.stopAnimation();
      wobbleAnim.stopAnimation();
      trailGlowAnim.stopAnimation();
    };
  }, [isSelected, phase]);

  // Resonance glow — phase-aware inner light for dread/ritual words.
  // Phase 1: subliminal shimmer. Phase 2: faint pulse. Phase 3: visible aura.
  // Phase 4: crimson breathing. Phase 5: ghostly settled glow.
  useEffect(() => {
    if (!isResonant || phase < 1) {
      resonanceAnim.setValue(0);
      return;
    }

    if (settings.reducedMotion || shouldSimplifyAnimations()) {
      // Static resonance glow (no animation)
      resonanceAnim.setValue(0.5);
      return () => { resonanceAnim.setValue(0); };
    }

    // Phase 1: very slow, barely perceptible shimmer
    // Phase 2-3: moderate pulse
    // Phase 4: faster breathing
    const cycleDuration = phase >= 4 ? 2000 : phase >= 3 ? 2500 : phase >= 2 ? 3000 : phase >= 1 ? 3500 : 4000;

    const resonanceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(resonanceAnim, {
          toValue: 1,
          duration: cycleDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(resonanceAnim, {
          toValue: 0,
          duration: cycleDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    resonanceLoopRef.current = resonanceLoop;
    resonanceLoop.start();

    return () => {
      if (resonanceLoopRef.current) {
        resonanceLoopRef.current.stop();
        resonanceLoopRef.current = null;
      }
      resonanceAnim.stopAnimation();
    };
  }, [isResonant, phase, settings.reducedMotion]);

  // Tutorial guidance pulse for the exact recommended tile.
  useEffect(() => {
    if (!isGuided) {
      guidePulseAnim.setValue(0);
      return;
    }

    if (settings.reducedMotion) {
      guidePulseAnim.setValue(1);
      return;
    }

    const guideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(guidePulseAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    guideLoopRef.current = guideLoop;
    guideLoop.start();

    return () => {
      if (guideLoopRef.current) {
        guideLoopRef.current.stop();
        guideLoopRef.current = null;
      }
      guidePulseAnim.stopAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- guidePulseAnim is a stable ref
  }, [isGuided, settings.reducedMotion]);

  // Arrival settle: the tile just placed by a committed tap move scales in
  // from ~0.65 and slides from the direction it travelled, settling with the
  // phase-aware spring (heavy at Phase 4, bouncy at Phase 0). Replaces the
  // tap-path teleport; drag-drops are suppressed upstream (they keep the
  // floating-tile collapse + catch bounce).
  useEffect(() => {
    if (!arrivalMoveId) return;
    if (settings.reducedMotion || shouldSimplifyAnimations()) {
      arrivalScaleAnim.setValue(1);
      arrivalTranslateYAnim.setValue(0);
      return;
    }

    const springParams = getSelectedSpringParams();
    arrivalScaleAnim.setValue(0.65);
    // 'down' move = the letter came from the row above → slide down into place.
    arrivalTranslateYAnim.setValue(arrivalDirection === 'up' ? 14 : -14);
    const arrivalAnim = Animated.parallel([
      Animated.spring(arrivalScaleAnim, {
        toValue: 1,
        friction: springParams.friction,
        tension: springParams.tension,
        useNativeDriver: true,
      }),
      Animated.spring(arrivalTranslateYAnim, {
        toValue: 0,
        friction: springParams.friction,
        tension: springParams.tension,
        useNativeDriver: true,
      }),
    ]);
    arrivalAnimRef.current = arrivalAnim;
    arrivalAnim.start();

    return () => {
      if (arrivalAnimRef.current) {
        arrivalAnimRef.current.stop();
        arrivalAnimRef.current = null;
      }
      arrivalScaleAnim.setValue(1);
      arrivalTranslateYAnim.setValue(0);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- anim values are stable refs; direction/phase ride with moveId
  }, [arrivalMoveId, settings.reducedMotion]);

  // Particle trail for selected tiles
  useEffect(() => {
    if (!isSelected || settings.reducedMotion || shouldSimplifyAnimations()) {
      // Reset particles
      trailParticleAnims.forEach(p => {
        p.opacity.setValue(0);
        p.scale.setValue(0.5);
        p.translateY.setValue(0);
      });
      if (trailParticleLoopRef.current) {
        trailParticleLoopRef.current.stop();
        trailParticleLoopRef.current = null;
      }
      return;
    }

    const particleAnimations = trailParticleAnims.map((p, i) =>
      Animated.sequence([
        Animated.delay(i * 150),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
          Animated.timing(p.translateY, { toValue: -25, duration: 600, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(p.scale, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          Animated.timing(p.translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    const loop = Animated.loop(Animated.stagger(150, particleAnimations));
    trailParticleLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      trailParticleAnims.forEach(p => {
        p.opacity.stopAnimation();
        p.scale.stopAnimation();
        p.translateY.stopAnimation();
      });
    };
  }, [isSelected]);

  // Resonance visual config — color and opacity range per phase (from theme)
  const resonanceConfig = isResonant && phase >= 1 ? getResonanceConfig(phase) : null;
  const resonanceOpacity = resonanceConfig ? resonanceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [resonanceConfig.minOpacity, resonanceConfig.maxOpacity],
  }) : null;

  const handlePressIn = () => {
    if (settings.reducedMotion) return;
    if (isInteractable || isSelected) {
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (settings.reducedMotion) return;
    if (isInteractable || isSelected) {
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.08 : 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const getStyles = () => {
    if (highlight === 'locked') {
      if (phase >= 5) {
        return {
          bgColor: '#2E2A40',        // Muted purple-gray — eerie calm
          borderColor: '#3A3555',
          textColor: '#706890',       // Soft ghostly purple
          shadowColor: '#2E2A40',
        };
      }
      if (phase >= 4) {
        return {
          bgColor: CandyColors.gray[700],
          borderColor: CandyColors.gray[800],
          textColor: CandyColors.gray[500],
          shadowColor: CandyColors.gray[800],
        };
      }
      if (phase >= 3) {
        return {
          bgColor: CandyColors.gray[500],
          borderColor: CandyColors.gray[600],
          textColor: CandyColors.gray[700],
          shadowColor: CandyColors.gray[600],
        };
      }
      return {
        bgColor: CandyColors.gray[300],
        borderColor: CandyColors.gray[400],
        textColor: CandyColors.gray[500],
        shadowColor: CandyColors.gray[400],
      };
    }
    if (isSelected) {
      if (phase >= 5) {
        // Muted purple — peaceful, not aggressive
        return {
          bgColor: '#504580',
          borderColor: '#3A3060',
          textColor: '#D0C8E8',       // Soft lavender text
          shadowColor: '#504580',
        };
      }
      if (phase >= 4) {
        // Deep purple instead of pink at phase 4
        return {
          bgColor: CandyColors.purple.dark,
          borderColor: CandyColors.purple.shadow,
          textColor: CandyColors.gray[200],
          shadowColor: CandyColors.purple.dark,
        };
      }
      if (phase >= 3) {
        // Darker pink/purple at phase 3
        return {
          bgColor: CandyColors.pink.dark,
          borderColor: CandyColors.pink.shadow,
          textColor: CandyColors.gray[100],
          shadowColor: CandyColors.pink.dark,
        };
      }
      return {
        bgColor: CandyColors.pink.main,
        borderColor: CandyColors.pink.shadow,
        textColor: CandyColors.white,
        shadowColor: CandyColors.pink.main,
      };
    }
    if (isInteractable && highlight === 'source') {
      return {
        bgColor: tileColor.bg,
        borderColor: tileColor.border,
        textColor: CandyColors.white,
        shadowColor: tileColor.bg,
      };
    }
    // Default (non-interactable, non-selected)
    if (phase >= 5) {
      return {
        bgColor: '#3A3550',      // Muted purple-gray instead of dark gray
        borderColor: '#4A4565',
        textColor: '#9990B0',     // Soft purple text
        shadowColor: '#3A3550',
      };
    }
    if (phase >= 4) {
      return {
        bgColor: CandyColors.gray[600],
        borderColor: CandyColors.gray[700],
        textColor: CandyColors.gray[300],
        shadowColor: CandyColors.gray[700],
      };
    }
    if (phase >= 3) {
      return {
        bgColor: CandyColors.gray[200],
        borderColor: CandyColors.gray[400],
        textColor: CandyColors.gray[500],
        shadowColor: CandyColors.gray[400],
      };
    }
    if (phase >= 2) {
      return {
        bgColor: CandyColors.gray[100],
        borderColor: CandyColors.gray[300],
        textColor: CandyColors.gray[600],
        shadowColor: CandyColors.gray[400],
      };
    }
    return {
      bgColor: CandyColors.white,
      borderColor: CandyColors.gray[300],
      textColor: CandyColors.gray[600],
      shadowColor: CandyColors.gray[400],
    };
  };

  const tileStyles = getStyles();
  const isClickable = (isInteractable || isSelected) && onPress;
  // Feedback-only touchable: a non-interactable tile with an onLockedPress
  // still mounts a touchable so its tap is ACKNOWLEDGED (locked-tile shake /
  // inter-slot pulse) instead of being swallowed silently. Without this, the
  // hook's locked-letter feedback path was literally unreachable — the tile
  // rendered bare content with no touch target.
  const isFeedbackPressable = !isClickable && !!onLockedPress;
  const trailColor = phase >= 4 ? '#C03050' : phase >= 3 ? '#9050B0' : '#FFD700';

  // Animated glow intensity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Shine sweep position
  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  // Wobble rotation — amplitude shrinks with phase (heavy tiles barely tip)
  const wobbleDeg = getWobbleAmplitudeDeg();
  const wobbleRotate = wobbleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [`-${wobbleDeg}deg`, '0deg', `${wobbleDeg}deg`],
  });

  // Trail glow interpolation for Phase 3+ energy mark effect — drives the
  // pre-styled glow overlay's opacity (shadow/radius are fixed at max intensity)
  const trailGlowOpacity = trailGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, phase >= 4 ? 0.7 : 0.55],
  });
  const trailGlowColor = phase >= 4 ? '#9B1B30' : '#7B2FBE';
  const showTrailGlow = isSelected && phase >= 3 && !shouldSimplifyAnimations();
  const guideRingScale = guidePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const guideRingOpacity = guidePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.0],
  });

  const content = (
    <Animated.View
      // Non-pressable tiles carry their own accessibility info; clickable and
      // feedback-pressable tiles are labeled by the wrapping TouchableOpacity.
      accessible={!isClickable && !isFeedbackPressable}
      accessibilityLabel={!isClickable && !isFeedbackPressable ? `Letter ${letter.char}${letter.isLocked ? ', locked' : ''}` : undefined}
      style={[
        styles.tileOuter,
        compact && { width: COMPACT_TILE_W, height: COMPACT_OUTER_H, marginHorizontal: COMPACT_TILE_MARGIN_H },
        {
          transform: [
            // Arrival settle composes with the press/bounce animations
            // (arrival values rest at 1/0 outside the settle window).
            { scale: Animated.multiply(scaleAnim, arrivalScaleAnim) },
            { translateY: Animated.add(bounceAnim, arrivalTranslateYAnim) },
            { rotate: isSelected ? wobbleRotate : '0deg' },
          ],
        },
      ]}
    >
      {isSelected && !settings.reducedMotion && !shouldSimplifyAnimations() && (
        <View style={trailStyles.container} pointerEvents="none">
          {trailParticleAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: trailColor,
                opacity: anim.opacity,
                transform: [
                  { scale: anim.scale },
                  { translateY: anim.translateY },
                  { translateX: (i - 1.5) * 12 },
                ],
                top: -5,
              }}
            />
          ))}
        </View>
      )}

      {/* Outer glow for interactable/selected */}
      {(isInteractable || isSelected) && highlight !== 'locked' && (
        <Animated.View
          style={[
            styles.glowOuter,
            {
              backgroundColor: tileStyles.shadowColor,
              opacity: isSelected ? 0.6 : glowOpacity,
            },
          ]}
        />
      )}

      {isGuided && (
        <Animated.View
          style={[
            styles.guideRing,
            {
              opacity: guideRingOpacity,
              transform: [{ scale: guideRingScale }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Trail glow at Phase 3+ — pre-styled shadow layer behind the tile,
          opacity driven natively by trailGlowAnim */}
      {showTrailGlow && (
        <Animated.View
          style={[
            styles.trailGlowOverlay,
            compact && { height: COMPACT_BODY_H, borderRadius: 12 },
            {
              backgroundColor: trailGlowColor,
              shadowColor: trailGlowColor,
              shadowRadius: phase >= 4 ? 24 : 16,
              opacity: trailGlowOpacity,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Main tile body */}
      <Animated.View
        style={[
          styles.tileBody,
          compact && { width: COMPACT_BODY_W, height: COMPACT_BODY_H, borderRadius: 12 },
          {
            backgroundColor: tileStyles.bgColor,
            borderBottomColor: tileStyles.borderColor,
            shadowColor: tileStyles.shadowColor,
          },
          isGuided && styles.tileBodyGuided,
          isSelected && styles.tileBodySelected,
          highlight === 'locked' && styles.tileBodyLocked,
        ]}
      >
        {/* Top highlight (bevel effect) */}
        <View style={styles.bevelTop} />

        {/* Glossy shine overlay */}
        <View style={styles.glossyShine} />

        {/* Resonance glow — inner light for dread/ritual words */}
        {resonanceConfig && (
          <Animated.View
            style={[
              styles.resonanceOverlay,
              {
                backgroundColor: resonanceConfig.color,
                opacity: resonanceOpacity!,
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Letter text with shadow */}
        <Text
          maxFontSizeMultiplier={1.2}
          style={[
            styles.letterText,
            compact && { fontSize: COMPACT_FONT },
            { color: tileStyles.textColor },
            isSelected && styles.letterTextSelected,
          ]}
        >
          {letter.char}
        </Text>

        {/* Specular highlight dot */}
        {highlight !== 'locked' && (
          <View style={styles.specularDot} />
        )}

        {/* Moving shine effect */}
        {isInteractable && !isSelected && (
          <Animated.View
            style={[
              styles.shineSweep,
              {
                transform: [{ translateX: shineTranslate }],
              },
            ]}
          />
        )}

        {/* Subtle lock overlay for locked tiles */}
        {highlight === 'locked' && (
          <View style={styles.lockOverlay} />
        )}
      </Animated.View>

      {/* 3D bottom edge */}
      <View
        style={[
          styles.tileEdge,
          { backgroundColor: tileStyles.borderColor },
          highlight === 'locked' && styles.tileEdgeLocked,
        ]}
      />
    </Animated.View>
  );

  if (isClickable || isFeedbackPressable) {
    return (
      <TouchableOpacity
        onPress={isClickable ? onPress : onLockedPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Letter ${letter.char}${letter.isLocked ? ', locked' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ selected: !!isSelected, disabled: !!letter.isLocked }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  tileOuter: {
    width: STANDARD_TILE_W,
    height: 64,
    marginHorizontal: STANDARD_TILE_MARGIN_H,
    alignItems: 'center',
  },
  glowOuter: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 6,
    borderRadius: 14,
    transform: [{ scale: 1.15 }],
  },
  trailGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    borderRadius: 14,
    transform: [{ scale: 1.15 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 8,
  },
  guideRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: CandyColors.yellow.main,
    backgroundColor: 'rgba(250, 204, 21, 0.30)',
    shadowColor: CandyColors.yellow.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  tileBody: {
    width: 52,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  tileBodyGuided: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
  },
  tileBodySelected: {
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  tileBodyLocked: {
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tileEdge: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: -1,
  },
  tileEdgeLocked: {
    height: 6,
  },
  bevelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  glossyShine: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
  },
  letterText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  letterTextSelected: {
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  specularDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  shineSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ skewX: '-20deg' }],
  },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  resonanceOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
});

const trailStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
});

// Memoized: LetterTile is instantiated many-per-row across multiple rows and
// carries several Animated.Values; a shallow prop guard avoids re-rendering
// tiles whose row props didn't change (Row is already memoized, so props are
// referentially stable within a stable row).
export const LetterTile = React.memo(LetterTileComponent);

export default LetterTile;
