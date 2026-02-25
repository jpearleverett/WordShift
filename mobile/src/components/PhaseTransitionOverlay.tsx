import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing } from 'react-native';
import { PhaseTransitionEvent, PhaseScene, CinematicParticleConfig } from '../services/phaseEvents';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticHeavy, hapticWarning } from '../services/haptics';

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
  const mainLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const wobbleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  const startDelay = useRef(index * 300 + Math.random() * 500).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;

    const isVertical = config.direction === 'rise' || config.direction === 'fall';
    const distance = isVertical ? SCREEN_HEIGHT + 50 : SCREEN_WIDTH + 50;
    const duration = (distance / config.speed) * 80;
    const target = config.direction === 'rise' ? -(SCREEN_HEIGHT + 50) : distance;

    delayTimerRef.current = setTimeout(() => {
      mainLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(translateMain, {
            toValue: target,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(translateMain, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      mainLoopRef.current.start();

      if (isVertical) {
        wobbleLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(wobble, { toValue: 15, duration: 1000, useNativeDriver: true }),
            Animated.timing(wobble, { toValue: -15, duration: 1000, useNativeDriver: true }),
          ])
        );
        wobbleLoopRef.current.start();
      }
    }, startDelay);

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      mainLoopRef.current?.stop();
      wobbleLoopRef.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: particles are
  // created fresh per transition event and destroyed when the overlay closes.
  }, []);

  const isVertical = config.direction === 'rise' || config.direction === 'fall';
  const startY = config.direction === 'rise' ? SCREEN_HEIGHT : -50;
  const baseOpacity = getSettingsSync().reducedMotion ? config.opacity * 0.5 : config.opacity;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: isVertical ? startX : -50,
          top: isVertical ? startY : Math.random() * SCREEN_HEIGHT,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: baseOpacity,
        },
        {
          transform: isVertical
            ? [{ translateY: translateMain }, { translateX: wobble }]
            : [{ translateX: translateMain }],
        },
      ]}
    />
  );
};

export const PhaseTransitionOverlay: React.FC<PhaseTransitionOverlayProps> = ({
  event,
  onComplete,
}) => {
  const overlayOpacity  = useRef(new Animated.Value(0)).current;
  const sceneOpacity    = useRef(new Animated.Value(0)).current;
  const sceneTranslateY = useRef(new Animated.Value(20)).current;
  const overlayAnimRef  = useRef<Animated.CompositeAnimation | null>(null);
  const sceneAnimRef    = useRef<Animated.CompositeAnimation | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasSkipped = useRef(false);

  const handleSkip = () => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // Stop any in-flight animations
    sceneAnimRef.current?.stop();
    overlayAnimRef.current?.stop();
    overlayOpacity.setValue(0);
    onComplete();
  };

  useEffect(() => {
    if (!event) return;
    hasSkipped.current = false;

    const reducedMotion = getSettingsSync().reducedMotion;
    // Scale ALL timing by 0.4x in reduced motion
    const timeScale = reducedMotion ? 0.4 : 1.0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Fade in overlay
    if (reducedMotion) {
      overlayOpacity.setValue(1);
    } else {
      overlayAnimRef.current = Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 600 * timeScale,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      overlayAnimRef.current.start();
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
        }
        if (reducedMotion) {
          sceneOpacity.setValue(1);
          sceneTranslateY.setValue(0);
        } else {
          sceneOpacity.setValue(0);
          sceneTranslateY.setValue(20);
          sceneAnimRef.current = Animated.parallel([
            Animated.timing(sceneOpacity, {
              toValue: 1,
              duration: 400 * timeScale,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(sceneTranslateY, {
              toValue: 0,
              duration: 400 * timeScale,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]);
          sceneAnimRef.current.start();
        }

        // Fade out scene before next one
        const fadeOutTimer = setTimeout(() => {
          if (reducedMotion) {
            sceneOpacity.setValue(0);
          } else {
            sceneAnimRef.current = Animated.timing(sceneOpacity, {
              toValue: 0,
              duration: 300 * timeScale,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            });
            sceneAnimRef.current.start();
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
        overlayAnimRef.current = Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 500 * timeScale,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        });
        overlayAnimRef.current.start(({ finished }) => {
          if (finished) onComplete();
        });
      }
    }, totalDuration);
    timers.push(completeTimer);

    timersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [event]);

  if (!event) return null;

  const activeScene: PhaseScene | undefined = event.scenes[activeSceneIndex];

  return (
    <Animated.View
      style={[
        styles.overlay,
        { backgroundColor: event.bgColor, opacity: overlayOpacity },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`Phase transition: ${event.title}`}
    >
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
          { opacity: sceneOpacity, transform: [{ translateY: sceneTranslateY }] },
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 40,
  },
  title: {
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
    fontSize: 48,
    marginBottom: 24,
  },
  sceneText: {
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
    fontSize: 14,
    fontWeight: '600',
  },
});

