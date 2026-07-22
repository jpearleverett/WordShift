import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Image } from 'react-native';
import { PhaseTransitionEvent, PhaseScene, SceneImage, CinematicParticleConfig } from '../services/phaseEvents';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticHeavy, hapticWarning } from '../services/haptics';
import { playUiSound, stopCeremonyMusic } from '../services/uiSound';
import { BODY_FONT_BOLD } from '../theme/fonts';
import { getPhaseTheme } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// In-engine cinematic art: the REAL game assets (never emoji). The entity is
// the same soft shadow_figure.png HouseWorld renders behind the house; the
// house is the roof art the player raised room by room.
// ---------------------------------------------------------------------------
const SCENE_IMAGE_SOURCES: Record<SceneImage, ReturnType<typeof require>> = {
  shadow_figure: require('../../assets/environment/shadow_figure.png'),
  house: require('../../assets/environment/roof.png'),
};

// Rendered sizes preserve each asset's aspect (shadow_figure 600x1200,
// roof 792x283) and sit behind the centered scene text.
const SCENE_IMAGE_SIZES: Record<SceneImage, { width: number; height: number }> = {
  shadow_figure: {
    height: Math.round(SCREEN_HEIGHT * 0.52),
    width: Math.round(SCREEN_HEIGHT * 0.52 * (600 / 1200)),
  },
  house: {
    width: Math.round(SCREEN_WIDTH * 0.72),
    height: Math.round(SCREEN_WIDTH * 0.72 * (283 / 792)),
  },
};

/** Default peak opacity for a scene image when the scene doesn't set one. */
const SCENE_IMAGE_DEFAULT_OPACITY = 0.6;
/** How far (px) the descend effect lowers the image into place. */
const DESCEND_DISTANCE = 90;

/** Fire a haptic scaled to the scene's visual effect and event intensity */
function fireSceneHaptic(scene: PhaseScene, shakeIntensity?: number): void {
  const isIntense = (shakeIntensity ?? 0) >= 0.5;
  switch (scene.effect) {
    case 'descend':
      // The Arrival: the entity's descent begins on a warning pulse (the
      // heaviest scene of the game); the landing settle is scheduled
      // separately at descendMs by the caller.
      hapticWarning();
      break;
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

const CinematicParticleBase: React.FC<{
  config: CinematicParticleConfig;
  index: number;
}> = ({ config, index }) => {
  const translateMain = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  // Horizontal-drift particles keep a STABLE top across scene changes (stored in
  // a ref, like startX). Previously it was an inline Math.random() at render, so
  // every setActiveSceneIndex re-render teleported all drift particles to a new
  // random Y, breaking the continuous ambient motion.
  const startTop = useRef(Math.random() * SCREEN_HEIGHT).current;
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
        top: isVertical ? startY : startTop,
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
// Memoized so a scene change (setActiveSceneIndex) does not re-render every
// ambient particle and restart its motion — the drift stays continuous.
const CinematicParticle = React.memo(CinematicParticleBase);

// Stepped translucent edge bands, alpha fading toward the center.
const VIGNETTE_STEPS = 5;
const VIGNETTE_ALPHAS = [0.85, 0.55, 0.32, 0.16, 0.06];

/** 0..1 alpha -> a 2-digit hex suffix for a 6-digit hex color (#RRGGBB + AA). */
function alphaHex(a: number): string {
  const clamped = Math.max(0, Math.min(1, a));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Soft atmospheric edge vignette. Replaces the old bordered rounded-rect (which
 * read as a hard picture frame) with stepped translucent bands hugging each
 * screen edge, alpha fading toward the center so there is no hard edge — the
 * layered-concentric approach the Offering Pit glow uses. Corners naturally read
 * darkest where two edges overlap. Phase-aware tint; the whole group's opacity is
 * driven by the caller's Animated value (native driver, reduced-motion aware —
 * the caller only animates it in when motion is on).
 */
const SoftVignette: React.FC<{ opacity: Animated.Value; color: string }> = ({ opacity, color }) => {
  const depth = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.34;
  const band = depth / VIGNETTE_STEPS;
  const bands: React.ReactNode[] = [];
  for (let i = 0; i < VIGNETTE_STEPS; i++) {
    const bg = color + alphaHex(VIGNETTE_ALPHAS[i]);
    const offset = i * band;
    const thickness = band + 1; // +1 overlap so rounding can't open a seam
    bands.push(
      <View
        key={`t${i}`}
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: offset, height: thickness, backgroundColor: bg }}
      />,
      <View
        key={`b${i}`}
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: offset, height: thickness, backgroundColor: bg }}
      />,
      <View
        key={`l${i}`}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, left: offset, width: thickness, backgroundColor: bg }}
      />,
      <View
        key={`r${i}`}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, bottom: 0, right: offset, width: thickness, backgroundColor: bg }}
      />
    );
  }
  return (
    <Animated.View pointerEvents="none" style={[styles.vignette, { opacity }]}>
      {bands}
    </Animated.View>
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
  // Scene-image drivers (the in-engine arrival: shadow figure / house art)
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageTranslateY = useRef(new Animated.Value(0)).current;
  const [activeImage, setActiveImage] = useState<SceneImage | null>(null);
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
    imageOpacity.stopAnimation();
    imageTranslateY.stopAnimation();
  };

  /**
   * Drive the scene's in-engine image. 'descend' = the arrival: a slow
   * translateY down + opacity-in (native driver); every other scene with an
   * image gets a plain opacity fade toward its target. Consecutive scenes
   * sharing an image animate opacity from the current value, so a settled
   * shadow persists rather than blinking. Reduced motion: static fade
   * (values set instantly, no movement).
   */
  const runSceneImage = (scene: PhaseScene, timeScale: number, reducedMotion: boolean) => {
    if (!scene.image) {
      // No image this scene — fade any lingering one away.
      if (reducedMotion) {
        imageOpacity.setValue(0);
      } else {
        const fadeOut = Animated.timing(imageOpacity, {
          toValue: 0,
          duration: 300 * timeScale,
          useNativeDriver: true,
        });
        effectAnimsRef.current.push(fadeOut);
        fadeOut.start();
      }
      return;
    }

    setActiveImage(scene.image);
    const target = scene.imageOpacity ?? SCENE_IMAGE_DEFAULT_OPACITY;

    if (reducedMotion) {
      imageTranslateY.setValue(0);
      imageOpacity.setValue(target);
      return;
    }

    if (scene.effect === 'descend') {
      // The descent: start above, unseen; settle slowly into place.
      imageTranslateY.setValue(-DESCEND_DISTANCE);
      imageOpacity.setValue(0);
      const descendMs = Math.min(scene.duration * 0.75, 3800) * timeScale;
      const anim = Animated.parallel([
        Animated.timing(imageTranslateY, {
          toValue: 0,
          duration: descendMs,
          useNativeDriver: true,
        }),
        Animated.timing(imageOpacity, {
          toValue: target,
          duration: descendMs * 0.6,
          useNativeDriver: true,
        }),
      ]);
      effectAnimsRef.current.push(anim);
      anim.start();
      return;
    }

    // Plain image scene: settle in place, fade from wherever opacity is now
    // (0 for a fresh image, the previous target for a persisting one).
    imageTranslateY.setValue(0);
    const fade = Animated.timing(imageOpacity, {
      toValue: target,
      duration: 450 * timeScale,
      useNativeDriver: true,
    });
    effectAnimsRef.current.push(fade);
    fade.start();
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
      case 'pulse': {
        // A soft breathing swell (previously a no-op that still fired a haptic).
        // Reuses the flash layer at a gentle peak so the scene "breathes".
        setFlashColor(getFlashColor(phase));
        flashOpacity.setValue(0);
        const peak = (0.2 + 0.25 * intensity);
        const anim = Animated.sequence([
          Animated.timing(flashOpacity, { toValue: peak, duration: 260, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 360, useNativeDriver: true }),
        ]);
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
    imageOpacity.setValue(0);
    imageTranslateY.setValue(0);
    setActiveImage(null);
    // Reset the SCENE drivers too, so a fresh ceremony always opens dark. Without
    // this, a skipped cinematic left activeSceneIndex/sceneOpacity from the prior
    // event, and the next ceremony could flash the wrong scene line at full
    // opacity before its own first scene timer fired.
    setActiveSceneIndex(-1);
    sceneOpacity.setValue(0);
    sceneTranslateY.setValue(20);

    const reducedMotion = getSettingsSync().reducedMotion;
    // Scale ALL timing: 0.4x in reduced motion (not just skip animations),
    // 1.25x otherwise — playtest read the per-scene text as a touch too fast
    // at 1.0, and uniform scaling stretches the dwell without disturbing the
    // scene layout (delays and durations scale together; tap-to-skip remains).
    const timeScale = reducedMotion ? 0.4 : 1.25;
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

    // Honor the event-level vignette flag (previously dead code): a base
    // atmospheric darkening at open, so the endgame ceremonies (house
    // completion, the finale, post-revelation) that declare no 'vignette_close'
    // scene still get their declared vignette. Scenes that DO close in compose
    // a stronger frame on top (their 0.5-0.9 targets exceed this 0.35 base).
    if (event.vignette) {
      if (reducedMotion) {
        vignetteOpacity.setValue(0.35);
      } else {
        Animated.timing(vignetteOpacity, {
          toValue: 0.35,
          duration: 700 * timeScale,
          useNativeDriver: true,
        }).start();
      }
    }

    // Opening haptic beat
    if (!reducedMotion) {
      hapticMedium();
    }

    // Schedule each scene
    event.scenes.forEach((scene, index) => {
      const showTimer = setTimeout(() => {
        setActiveSceneIndex(index);
        runSceneImage(scene, timeScale, reducedMotion);
        // The Arrival's dark ritual swell (soundPhaseChange resolves its dark
        // variant by audioPhase at phase 3+) rides the descent. Audio self-
        // gates on soundEnabled and must play even under reducedMotion (which
        // governs motion, not sound).
        if (scene.effect === 'descend') {
          // Duck the looping music bed so the dark ritual swell owns the Arrival
          // soundscape (App's music effect restarts the phase's bed once the
          // event clears on complete). Guarded bridge, so it is a no-op without
          // the native audio layer.
          stopCeremonyMusic();
          playUiSound('phase_change');
        }
        if (!reducedMotion) {
          fireSceneHaptic(scene, event.shakeIntensity);
          runSceneEffect(scene, event.shakeIntensity ?? 0, event.phase);
          if (scene.effect === 'descend') {
            // A heavy settle lands with the figure at descendMs. Timer parked
            // in timersRef so handleSkip/cleanup clear it.
            const descendMs = Math.min(scene.duration * 0.75, 3800) * timeScale;
            timersRef.current.push(setTimeout(() => hapticHeavy(), descendMs));
          }
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
      accessibilityLabel={
        event.showTitle === false
          ? (event.scenes[0]?.text ?? 'Narrative transition')
          : event.title
      }
    >
      {/* Event-long backdrop: the settled entity behind every line (static, faint) */}
      {event.backdrop && (
        <View style={styles.imageLayer} pointerEvents="none">
          <Image
            source={SCENE_IMAGE_SOURCES[event.backdrop.image]}
            resizeMode="contain"
            style={{
              ...SCENE_IMAGE_SIZES[event.backdrop.image],
              opacity: event.backdrop.opacity,
            }}
          />
        </View>
      )}

      {/* Per-scene in-engine image (the arrival descends behind the text) */}
      {activeImage && (
        <Animated.View
          style={[
            styles.imageLayer,
            { opacity: imageOpacity, transform: [{ translateY: imageTranslateY }] },
          ]}
          pointerEvents="none"
        >
          <Image
            source={SCENE_IMAGE_SOURCES[activeImage]}
            resizeMode="contain"
            style={SCENE_IMAGE_SIZES[activeImage]}
          />
        </Animated.View>
      )}

      {/* Soft atmospheric edge vignette (fades in on vignette_close scenes) */}
      <SoftVignette opacity={vignetteOpacity} color={getPhaseTheme(event.phase).vignetteColor} />

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
      {event.showTitle !== false && (
        <Text style={[styles.title, { color: event.accentColor }]}>
          {event.title}
        </Text>
      )}

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
    zIndex: 2,
  },
  sceneContainer: {
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    zIndex: 2,
  },
  // Centered layer for the in-engine cinematic art (backdrop + scene image).
  // Sits behind the text (zIndex under sceneContainer) and never intercepts
  // touches — the imagery is presence, the words stay legible on top.
  imageLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
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
    zIndex: 2,
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
    zIndex: 2,
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
  // Soft edge vignette container. The darkening comes from stepped translucent
  // bands (see SoftVignette) rather than a bordered rounded-rect, so there is no
  // hard picture-frame edge — just an atmospheric darkening toward the corners.
  vignette: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
});
