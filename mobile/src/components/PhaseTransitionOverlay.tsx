import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { PhaseTransitionEvent, PhaseScene, CinematicParticleConfig } from '../services/phaseEvents';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticHeavy, hapticWarning } from '../services/haptics';
import { BODY_FONT, BODY_FONT_BOLD } from '../theme/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Fire a haptic scaled to the scene's visual effect and event intensity */
function fireSceneHaptic(scene: PhaseScene, shakeIntensity?: number): void {
  const isIntense = (shakeIntensity ?? 0) >= 0.5;
  switch (scene.effect) {
    case 'flash':
    case 'shake':
      isIntense ? hapticWarning() : hapticHeavy();
      break;
    case 'pulse':
    case 'vignette_close':
      hapticMedium();
      break;
    case 'fade':
    case 'particles_rise':
    case 'particles_fall':
      hapticLight();
      break;
    default:
      hapticLight();
      break;
  }
}

/**
 * Phase-appropriate flash color: bright/white at low phases (still candy-cute),
 * shifting toward crimson at the dark phases.
 */
function getFlashColor(phase: number): string {
  if (phase >= 4) return '#E03050'; // crimson
  if (phase === 3) return '#7A4A6A'; // dim rose
  if (phase === 2) return '#B0A8D8'; // pale lavender
  return '#FFFFFF'; // bright
}

interface PhaseTransitionOverlayProps {
  event: PhaseTransitionEvent | null;
  onComplete: () => void;
}

const CinematicParticle: React.FC<{
  config: CinematicParticleConfig;
  index: number;
}> = ({ config, index }) => {
  const translateMain = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  const startDelay = useRef(index * 300 + Math.random() * 500).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;

    const isVertical = config.direction === 'rise' || config.direction === 'fall';
    const distance = isVertical ? SCREEN_HEIGHT + 50 : SCREEN_WIDTH + 50;
    const duration = (distance / config.speed) * 80;

    const mainAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.timing(translateMain, {
          toValue: config.direction === 'rise' ? -(SCREEN_HEIGHT + 50) : distance,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateMain, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const wobbleAnim = isVertical ? Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 15, duration: 1000, useNativeDriver: true }),
        Animated.timing(wobble, { toValue: -15, duration: 1000, useNativeDriver: true }),
      ])
    ) : null;

    loopRef.current = mainAnim;
    mainAnim.start();
    wobbleAnim?.start();

    return () => {
      mainAnim.stop();
      wobbleAnim?.stop();
      translateMain.stopAnimation();
      wobble.stopAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: particles are
  // created fresh per transition event and destroyed when the overlay closes.
  }, []);

  const isVertical = config.direction === 'rise' || config.direction === 'fall';
  const startY = config.direction === 'rise' ? SCREEN_HEIGHT : -50;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: isVertical ? startX : -50,
        top: isVertical ? startY : Math.random() * SCREEN_HEIGHT,
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        backgroundColor: config.color,
        opacity: getSettingsSync().reducedMotion ? config.opacity * 0.5 : config.opacity,
        transform: isVertical
          ? [{ translateY: translateMain }, { translateX: wobble }]
          : [{ translateX: translateMain }],
      }}
    />
  );
};

export const PhaseTransitionOverlay: React.FC<PhaseTransitionOverlayProps> = ({
  event,
  onComplete,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);
  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const sceneTranslateY = useRef(new Animated.Value(20)).current;
  // Screen-effect drivers (native-driven, transform/opacity only)
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const effectAnimsRef = useRef<Animated.CompositeAnimation[]>([]);
  const [flashColor, setFlashColor] = useState('#FFFFFF');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasSkipped = useRef(false);

  const stopEffectAnims = () => {
    effectAnimsRef.current.forEach((a) => a.stop());
    effectAnimsRef.current = [];
    shakeX.stopAnimation();
    shakeY.stopAnimation();
    flashOpacity.stopAnimation();
  };

  /**
   * Render the scene's declared screen effect. Native driver only; fully
   * skipped in reduced motion (the static scene is already shown by the caller).
   */
  const runSceneEffect = (scene: PhaseScene, eventShake: number, phase: number) => {
    if (getSettingsSync().reducedMotion) return;
    const intensity = scene.effectIntensity ?? eventShake ?? 0.5;

    switch (scene.effect) {
      case 'shake': {
        const mag = 6 + 14 * intensity; // px
        shakeX.setValue(0);
        shakeY.setValue(0);
        const step = (toX: number, toY: number) =>
          Animated.timing(shakeX, { toValue: toX, duration: 45, useNativeDriver: true });
        // Drive both axes via a parallel of two sequences so X/Y desync slightly
        const xSeq = Animated.sequence([
          step(mag, 0),
          Animated.timing(shakeX, { toValue: -mag, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: mag * 0.6, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -mag * 0.4, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]);
        const ySeq = Animated.sequence([
          Animated.timing(shakeY, { toValue: -mag * 0.5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: mag * 0.4, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: -mag * 0.25, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeY, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]);
        const anim = Animated.parallel([xSeq, ySeq]);
        effectAnimsRef.current.push(anim);
        anim.start();
        break;
      }
      case 'flash': {
        setFlashColor(getFlashColor(phase));
        flashOpacity.setValue(0);
        const peak = 0.35 + 0.45 * intensity;
        const anim = Animated.sequence([
          Animated.timing(flashOpacity, { toValue: peak, duration: 90, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
        ]);
        effectAnimsRef.current.push(anim);
        anim.start();
        break;
      }
      case 'vignette_close': {
        // Darkening edge frame fades in and lingers (it stays for the dark phases).
        const target = 0.5 + 0.4 * intensity;
        const anim = Animated.timing(vignetteOpacity, {
          toValue: target,
          duration: 700,
          useNativeDriver: true,
        });
        effectAnimsRef.current.push(anim);
        anim.start();
        break;
      }
      default:
        break;
    }
  };

  const handleSkip = () => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // Stop any in-flight animations from the current scene
    sceneOpacity.stopAnimation();
    sceneTranslateY.stopAnimation();
    stopEffectAnims();
    overlayOpacity.stopAnimation();
    overlayOpacity.setValue(0);
    onComplete();
  };

  useEffect(() => {
    if (!event) return;
    hasSkipped.current = false;
    // Reset screen-effect drivers for a fresh event
    stopEffectAnims();
    shakeX.setValue(0);
    shakeY.setValue(0);
    flashOpacity.setValue(0);
    vignetteOpacity.setValue(0);

    const reducedMotion = getSettingsSync().reducedMotion;
    // Scale ALL timing by 0.4x in reduced motion (not just skip animations)
    const timeScale = reducedMotion ? 0.4 : 1.0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Fade in overlay
    if (reducedMotion) {
      overlayOpacity.setValue(1);
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 600 * timeScale,
        useNativeDriver: true,
      }).start();
    }

    // Opening haptic beat
    if (!reducedMotion) {
      hapticMedium();
    }

    // Schedule each scene
    event.scenes.forEach((scene, index) => {
      const showTimer = setTimeout(() => {
        setActiveSceneIndex(index);
        if (!reducedMotion) {
          fireSceneHaptic(scene, event.shakeIntensity);
          runSceneEffect(scene, event.shakeIntensity ?? 0, event.phase);
        }
        if (reducedMotion) {
          sceneOpacity.setValue(1);
          sceneTranslateY.setValue(0);
        } else {
          sceneOpacity.setValue(0);
          sceneTranslateY.setValue(20);
          Animated.parallel([
            Animated.timing(sceneOpacity, {
              toValue: 1,
              duration: 400 * timeScale,
              useNativeDriver: true,
            }),
            Animated.timing(sceneTranslateY, {
              toValue: 0,
              duration: 400 * timeScale,
              useNativeDriver: true,
            }),
          ]).start();
        }

        // Fade out scene before next one
        const fadeOutTimer = setTimeout(() => {
          if (reducedMotion) {
            sceneOpacity.setValue(0);
          } else {
            Animated.timing(sceneOpacity, {
              toValue: 0,
              duration: 300 * timeScale,
              useNativeDriver: true,
            }).start();
          }
        }, (scene.duration - 300) * timeScale);
        timers.push(fadeOutTimer);
      }, (scene.delay + 600) * timeScale); // +600 for initial overlay fade-in
      timers.push(showTimer);
    });

    // Complete after all scenes finish
    const lastScene = event.scenes[event.scenes.length - 1];
    const totalDuration = (lastScene.delay + lastScene.duration + 600 + 500) * timeScale;
    const completeTimer = setTimeout(() => {
      if (reducedMotion) {
        overlayOpacity.setValue(0);
        onComplete();
      } else {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 500 * timeScale,
          useNativeDriver: true,
        }).start(() => onComplete());
      }
    }, totalDuration);
    timers.push(completeTimer);

    timersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
      stopEffectAnims();
    };
  }, [event]);

  if (!event) return null;

  const activeScene: PhaseScene | undefined = event.scenes[activeSceneIndex];

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
          backgroundColor: event.bgColor,
          transform: [{ translateX: shakeX }, { translateY: shakeY }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`Phase transition: ${event.title}`}
    >
      {/* Darkening edge vignette (fades in on vignette_close scenes) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.vignette, { opacity: vignetteOpacity }]}
      />

      {/* Full-screen flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flash,
          { opacity: flashOpacity, backgroundColor: flashColor },
        ]}
      />

      {/* Cinematic ambient particles */}
      {event.particles && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: event.particles.count }, (_, i) => (
            <CinematicParticle key={i} config={event.particles!} index={i} />
          ))}
        </View>
      )}

      {/* Title */}
      <Text style={[styles.title, { color: event.accentColor }]}>
        {event.title}
      </Text>

      {/* Active scene */}
      <Animated.View
        style={[
          styles.sceneContainer,
          {
            opacity: sceneOpacity,
            transform: [{ translateY: sceneTranslateY }],
          },
        ]}
      >
        {Boolean(activeScene?.emoji) && (
          <Text style={styles.sceneEmoji}>{activeScene.emoji}</Text>
        )}
        {activeScene && (
          <Text style={[styles.sceneText, { color: event.textColor }]}>
            {activeScene.text}
          </Text>
        )}
      </Animated.View>

      {/* Skip button */}
      <TouchableOpacity
        style={[styles.skipButton, { borderColor: event.accentColor + '80' }]}
        onPress={handleSkip}
        accessibilityLabel="Skip transition"
        accessibilityRole="button"
      >
        <Text style={[styles.skipText, { color: event.accentColor + '80' }]}>Skip</Text>
      </TouchableOpacity>

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {event.scenes.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i <= activeSceneIndex ? event.accentColor : event.accentColor + '40',
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 40,
  },
  title: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 60,
    opacity: 0.6,
  },
  sceneContainer: {
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  sceneEmoji: {
    fontFamily: BODY_FONT,
    fontSize: 48,
    marginBottom: 24,
  },
  sceneText: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 80,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  skipText: {
    fontFamily: BODY_FONT_BOLD,
    fontSize: 14,
    fontWeight: '600',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    zIndex: 1001,
  },
  // Approximated radial vignette: a thick dark border whose inner corners are
  // rounded, darkening the screen edges while leaving the center clearer.
  // (No new assets; a true radial gradient isn't available without one.)
  vignette: {
    ...StyleSheet.absoluteFill,
    borderColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: Math.round(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.32),
    borderRadius: Math.round(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.55),
    zIndex: 999,
  },
});
