import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { PhaseTransitionEvent, PhaseScene } from '../services/phaseEvents';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticHeavy, hapticWarning } from '../services/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

export const PhaseTransitionOverlay: React.FC<PhaseTransitionOverlayProps> = ({
  event,
  onComplete,
}) => {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);
  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const sceneTranslateY = useRef(new Animated.Value(20)).current;
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasSkipped = useRef(false);

  /** Skip the cinematic and immediately complete */
  const handleSkip = useCallback(() => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    // Clear all pending timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    // Fade out quickly and complete
    overlayOpacity.setValue(0);
    sceneOpacity.setValue(0);
    onComplete();
  }, [onComplete, overlayOpacity, sceneOpacity]);

  useEffect(() => {
    if (!event) return;
    hasSkipped.current = false;

    const reducedMotion = getSettingsSync().reducedMotion;
    // With reduced motion, scale down all timing by 60% to reduce wait without animations
    const timeScale = reducedMotion ? 0.4 : 1.0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Fade in overlay
    if (reducedMotion) {
      overlayOpacity.setValue(1);
    } else {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }

    // Opening haptic beat
    if (!reducedMotion) {
      hapticMedium();
    }

    // Schedule each scene
    event.scenes.forEach((scene, index) => {
      const showDelay = Math.round((scene.delay + 600) * timeScale);
      const sceneDur = Math.round(scene.duration * timeScale);
      const showTimer = setTimeout(() => {
        if (hasSkipped.current) return;
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
          Animated.parallel([
            Animated.timing(sceneOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(sceneTranslateY, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        }

        // Fade out scene before next one
        const fadeOutDelay = Math.max(sceneDur - 300, 100);
        const fadeOutTimer = setTimeout(() => {
          if (hasSkipped.current) return;
          if (reducedMotion) {
            sceneOpacity.setValue(0);
          } else {
            Animated.timing(sceneOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        }, fadeOutDelay);
        timers.push(fadeOutTimer);
      }, showDelay);
      timers.push(showTimer);
    });

    // Complete after all scenes finish
    const lastScene = event.scenes[event.scenes.length - 1];
    const totalDuration = Math.round((lastScene.delay + lastScene.duration + 600 + 500) * timeScale);
    const completeTimer = setTimeout(() => {
      if (hasSkipped.current) return;
      if (reducedMotion) {
        overlayOpacity.setValue(0);
        onComplete();
      } else {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => onComplete());
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
        {
          opacity: overlayOpacity,
          backgroundColor: event.bgColor,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`Phase transition: ${event.title}`}
    >
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

      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityLabel="Skip cinematic"
        accessibilityRole="button"
        activeOpacity={0.6}
      >
        <Text style={[styles.skipText, { color: event.accentColor + '80' }]}>
          Skip
        </Text>
      </TouchableOpacity>
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
