import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
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
  const translateMain = useSharedValue(0);
  const wobble = useSharedValue(0);

  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  const startDelay = useRef(index * 300 + Math.random() * 500).current;

  useEffect(() => {
    if (getSettingsSync().reducedMotion) return;

    const isVertical = config.direction === 'rise' || config.direction === 'fall';
    const distance = isVertical ? SCREEN_HEIGHT + 50 : SCREEN_WIDTH + 50;
    const duration = (distance / config.speed) * 80;
    const target = config.direction === 'rise' ? -(SCREEN_HEIGHT + 50) : distance;

    translateMain.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(target, { duration, easing: Easing.linear }),
          withTiming(0, { duration: 0 })
        ),
        -1
      )
    );

    if (isVertical) {
      wobble.value = withRepeat(
        withSequence(
          withTiming(15,  { duration: 1000 }),
          withTiming(-15, { duration: 1000 })
        ),
        -1
      );
    }

    return () => {
      cancelAnimation(translateMain);
      cancelAnimation(wobble);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: particles are
  // created fresh per transition event and destroyed when the overlay closes.
  }, []);

  const isVertical = config.direction === 'rise' || config.direction === 'fall';
  const startY = config.direction === 'rise' ? SCREEN_HEIGHT : -50;
  const baseOpacity = getSettingsSync().reducedMotion ? config.opacity * 0.5 : config.opacity;

  const animStyle = useAnimatedStyle(() => ({
    transform: isVertical
      ? [{ translateY: translateMain.value }, { translateX: wobble.value }]
      : [{ translateX: translateMain.value }],
  }));

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
        animStyle,
      ]}
    />
  );
};

export const PhaseTransitionOverlay: React.FC<PhaseTransitionOverlayProps> = ({
  event,
  onComplete,
}) => {
  const overlayOpacity  = useSharedValue(0);
  const sceneOpacity    = useSharedValue(0);
  const sceneTranslateY = useSharedValue(20);
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasSkipped = useRef(false);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [{ translateY: sceneTranslateY.value }],
  }));

  const handleSkip = () => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // Stop any in-flight animations
    cancelAnimation(sceneOpacity);
    cancelAnimation(sceneTranslateY);
    cancelAnimation(overlayOpacity);
    overlayOpacity.value = 0;
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
      overlayOpacity.value = 1;
    } else {
      overlayOpacity.value = withTiming(1, {
        duration: 600 * timeScale,
        easing: Easing.out(Easing.cubic),
      });
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
          sceneOpacity.value = 1;
          sceneTranslateY.value = 0;
        } else {
          sceneOpacity.value = 0;
          sceneTranslateY.value = 20;
          sceneOpacity.value = withTiming(1, {
            duration: 400 * timeScale,
            easing: Easing.out(Easing.cubic),
          });
          sceneTranslateY.value = withTiming(0, {
            duration: 400 * timeScale,
            easing: Easing.out(Easing.cubic),
          });
        }

        // Fade out scene before next one
        const fadeOutTimer = setTimeout(() => {
          if (reducedMotion) {
            sceneOpacity.value = 0;
          } else {
            sceneOpacity.value = withTiming(0, {
              duration: 300 * timeScale,
              easing: Easing.in(Easing.cubic),
            });
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
        overlayOpacity.value = 0;
        onComplete();
      } else {
        overlayOpacity.value = withTiming(
          0,
          { duration: 500 * timeScale, easing: Easing.in(Easing.cubic) },
          (finished) => { if (finished) runOnJS(onComplete)(); }
        );
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
        { backgroundColor: event.bgColor },
        overlayStyle,
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
      <Animated.View style={[styles.sceneContainer, sceneStyle]}>
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
