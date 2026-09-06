import React, { useEffect, useRef, useState } from 'react';
import { FONT_SIZE } from '../theme/typeScale';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Image, ScrollView, useWindowDimensions, AppState } from 'react-native';
import { PhaseTransitionEvent, PhaseScene, SceneImage, CinematicParticleConfig } from '../services/phaseEvents';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticHeavy, hapticWarning } from '../services/haptics';
import { createCeremonySoundScope, stopCeremonyMusic } from '../services/uiSound';
import { logEvent } from '../services/eventLogger';
import { announceForA11y } from '../services/a11yAnnounce';
import { BODY_FONT, BODY_FONT_BOLD, PIXEL_FONT_BOLD } from '../theme/fonts';
import { getPhaseTheme } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoryPortrait } from './StoryPortrait';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getStorySpeakerName } from '../services/storyArchive';
import { STORY_ART } from './storyArt';


// ---------------------------------------------------------------------------
// The Skip control's ink. It used to paint the event's own accentColor at 50%
// alpha, which composited to 1.26-2.47:1 against the eight event backgrounds —
// black on black at the finale and post-revelation, i.e. the only escape from a
// 10-20 second cinematic that cannot be dismissed any other way was invisible.
// The event's textColor is no exception (4.22 at phase 4, 3.35 at The Arrival),
// so the skip deliberately drops out of the event palette entirely: it is
// chrome, not narrative colour, and one near-white ink clears 4.5:1 on every
// bgColor (10.6:1 at the brightest). The border sits a shade back so the pill
// still reads as secondary while clearing the 3:1 non-text bar everywhere.
// Pinned by cinematicSkipContrast.test.ts.
// ---------------------------------------------------------------------------
export const SKIP_INK_COLOR = '#E8E4F0';
export const SKIP_BORDER_COLOR = '#B9B0CC';

// ---------------------------------------------------------------------------
// In-engine cinematic art: the REAL game assets (never emoji). The entity is
// the same soft shadow_figure.png HouseWorld renders behind the house; the
// house is the roof art the player raised room by room.
// ---------------------------------------------------------------------------
const SCENE_IMAGE_SOURCES: Record<SceneImage, ReturnType<typeof require>> = {
  private_room: STORY_ART.private,
  outward_road_night: STORY_ART.roadNight,
  outward_road: STORY_ART.road,
  kept_table: STORY_ART.table,
  shadow_figure: require('../../assets/environment/shadow_figure.png'),
  house: require('../../assets/environment/roof.png'),
  // Phase 1-3 ceremony emblems (512px, generateGameIcons): luminous painted
  // subjects for the three transitions that had no image of their own.
  ceremony_curious: require('../../assets/ui/spots/ceremony_curious.png'),
  ceremony_deeper: require('../../assets/ui/spots/ceremony_deeper.png'),
  ceremony_shadows: require('../../assets/ui/spots/ceremony_shadows.png'),
};
const SCENE_IMAGE_ASPECT: Record<SceneImage, number> = {
  private_room: 1.5, outward_road_night: 1.5, outward_road: 1.5, kept_table: 1.5,
  shadow_figure: 0.5, house: 792 / 283,
  ceremony_curious: 1, ceremony_deeper: 1, ceremony_shadows: 1,
};

/** Default peak opacity for a scene image when the scene doesn't set one. */
const SCENE_IMAGE_DEFAULT_OPACITY = 0.6;
/** How far (px) the descend effect lowers the image into place. Sized so the
 *  Arrival reads as travel, not drift (~40% of the figure's rendered height
 *  on a typical device); paired with a slight scale settle below. */
const DESCEND_DISTANCE = 170;
/** The descend starts a touch larger and settles to 1.0 — coming DOWN and
 *  closing in, not sliding on a rail. */
const DESCEND_SCALE_FROM = 1.1;

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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
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

// ---------------------------------------------------------------------------
// One-shot cinematic burst — a short spray of particles for a `particles_rise`
// / `particles_fall` scene (previously a declared-but-dead no-op). Each
// particle runs a SINGLE native-driven pass across the screen at ~3x ambient
// speed over the scene's dwell, then the whole layer is unmounted by the
// caller (keyed by nonce). Transform/opacity only; the caller only mounts it
// when motion is on.
// ---------------------------------------------------------------------------
const BURST_PARTICLE_COUNT = 12;
const BurstParticleBase: React.FC<{
  direction: 'rise' | 'fall';
  color: string;
  size: number;
  durationMs: number;
}> = ({ direction, color, size, durationMs }) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  // Stagger the spray across the first third of the dwell.
  const startDelay = useRef(Math.random() * (durationMs * 0.35)).current;
  const startY = direction === 'rise' ? SCREEN_HEIGHT + size : -size;
  const travel = direction === 'rise'
    ? -(SCREEN_HEIGHT + size * 2)
    : SCREEN_HEIGHT + size * 2;

  useEffect(() => {
    const dur = Math.max(360, durationMs - startDelay);
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.timing(translateY, { toValue: travel, duration: dur, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(startDelay),
        Animated.timing(opacity, { toValue: 1, duration: dur * 0.2, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: dur * 0.8, useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
    // mount-only one-shot; the whole layer is remounted (nonce key) per burst.
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
};
const BurstParticle = React.memo(BurstParticleBase);

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
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
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
  const { width, height } = useWindowDimensions();
  const effectiveReducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);
  const [manualPlayback, setManualPlayback] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sceneOpacity = useRef(new Animated.Value(0)).current;
  const sceneTranslateY = useRef(new Animated.Value(20)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const vignetteOpacity = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const imageTranslateY = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const [activeImage, setActiveImage] = useState<SceneImage | null>(null);
  const effectAnimsRef = useRef<Animated.CompositeAnimation[]>([]);
  const [flashColor, setFlashColor] = useState('#FFFFFF');
  const [burst, setBurst] = useState<{
    direction: 'rise' | 'fall'; color: string; size: number;
    durationMs: number; nonce: number;
  } | null>(null);
  const burstNonceRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasSkipped = useRef(false);
  const visibleEventRef = useRef<PhaseTransitionEvent | null>(null);
  const onCompleteRef = useRef(onComplete);
  const scrollRef = useRef<ScrollView>(null);
  const soundScope = useRef<ReturnType<typeof createCeremonySoundScope> | null>(null);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (!effectiveReducedMotion) return;
    effectAnimsRef.current.forEach(animation => animation.stop());
    shakeX.setValue(0); shakeY.setValue(0); flashOpacity.setValue(0);
    imageTranslateY.setValue(0); imageScale.setValue(1); sceneTranslateY.setValue(0);
    sceneOpacity.setValue(1); setBurst(null);
  }, [effectiveReducedMotion, shakeX, shakeY, flashOpacity, imageTranslateY, imageScale, sceneTranslateY, sceneOpacity]);

  const stopEffectAnims = () => {
    effectAnimsRef.current.forEach((a) => a.stop());
    effectAnimsRef.current = [];
    shakeX.stopAnimation();
    shakeY.stopAnimation();
    flashOpacity.stopAnimation();
    imageOpacity.stopAnimation();
    imageTranslateY.stopAnimation();
    imageScale.stopAnimation();
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
      imageScale.setValue(1);
      imageOpacity.setValue(target);
      return;
    }

    if (scene.effect === 'descend') {
      // The descent: start above, unseen; settle slowly into place with a
      // decelerating ease and a slight scale-down, so it reads as something
      // arriving from height rather than drifting on a rail.
      imageTranslateY.setValue(-DESCEND_DISTANCE);
      imageScale.setValue(DESCEND_SCALE_FROM);
      imageOpacity.setValue(0);
      const descendMs = Math.min(scene.duration * 0.75, 3800) * timeScale;
      const anim = Animated.parallel([
        Animated.timing(imageTranslateY, {
          toValue: 0,
          duration: descendMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(imageScale, {
          toValue: 1,
          duration: descendMs,
          easing: Easing.out(Easing.cubic),
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
    imageScale.setValue(1);
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

  const finish = (skipped = false) => {
    if (hasSkipped.current) return;
    hasSkipped.current = true;
    soundScope.current?.stop();
    if (skipped && event) logEvent({ type: 'cinematic_skipped', data: {
      phase: event.phase, ceremony: event.title, page: activeSceneIndex,
    } });
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    sceneOpacity.stopAnimation();
    sceneTranslateY.stopAnimation();
    stopEffectAnims();
    overlayOpacity.stopAnimation();
    overlayOpacity.setValue(0);
    setBurst(null);
    onCompleteRef.current();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const next = () => {
    if (!event || activeSceneIndex < 0 || hasSkipped.current) return;
    if (activeSceneIndex === event.scenes.length - 1) finishRef.current();
    else setActiveSceneIndex(activeSceneIndex + 1);
  };

  // A fresh event always opens on its own first scene. In particular, a
  // previously skipped scene must not briefly appear under the next title.
  useEffect(() => {
    visibleEventRef.current = null;
    hasSkipped.current = false;
    setManualPlayback(event?.readAtOwnPace === true);
    setActiveSceneIndex(-1);
    setActiveImage(null);
    setBurst(null);
    sceneOpacity.setValue(0);
    sceneTranslateY.setValue(0);
    shakeX.setValue(0);
    shakeY.setValue(0);
    flashOpacity.setValue(0);
    imageOpacity.setValue(0);
    imageTranslateY.setValue(0);
    imageScale.setValue(1);
    vignetteOpacity.setValue(event?.vignette ? 0.35 : 0);
    if (!event) return;
    soundScope.current = createCeremonySoundScope();
    const appStateListener = AppState.addEventListener('change', state => {
      soundScope.current?.stop();
      // A return allows future passages to sound; it never replays an old tail.
      if (state === 'active' && !hasSkipped.current) soundScope.current = createCeremonySoundScope();
    });
    const reducedMotion = getSettingsSync().reducedMotion;
    if (reducedMotion) overlayOpacity.setValue(1);
    else {
      overlayOpacity.setValue(0);
      Animated.timing(overlayOpacity, {
        toValue: 1, duration: 650, useNativeDriver: true,
      }).start();
    }
    hapticMedium();
    announceForA11y(event.showTitle === false ? 'A moment in the house.' : event.title);
    const timer = setTimeout(() => {
      visibleEventRef.current = event;
      setActiveSceneIndex(0);
    }, reducedMotion ? 0 : 600);
    timersRef.current.push(timer);
    return () => {
      appStateListener.remove();
      soundScope.current?.stop();
      visibleEventRef.current = null;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      stopEffectAnims();
      overlayOpacity.stopAnimation();
      sceneOpacity.stopAnimation();
      sceneTranslateY.stopAnimation();
    };
    // Animation refs are stable; this effect owns one complete event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  // Only a newly visible scene speaks or plays its cue. Changing playback
  // mode cannot replay the bell, the descent, or the screen-reader announcement.
  useEffect(() => {
    const scene = event?.scenes[activeSceneIndex];
    if (!event || visibleEventRef.current !== event || !scene || hasSkipped.current) return;
    const reducedMotion = getSettingsSync().reducedMotion;
    const timeScale = 1.25;
    stopEffectAnims();
    shakeX.setValue(0);
    shakeY.setValue(0);
    flashOpacity.setValue(0);
    setBurst(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    runSceneImage(scene, timeScale, reducedMotion);
    announceForA11y(
      scene.speaker ? getStorySpeakerName(scene.speaker) + '. ' + scene.text : scene.text
    );
    if (scene.effect === 'descend') {
      stopCeremonyMusic();
      soundScope.current?.play('arrival');
    }
    if (scene.cue === 'bell') soundScope.current?.play('story_bell');
    if (scene.cue === 'answer') soundScope.current?.play('story_answer');
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    fireSceneHaptic(scene, event.shakeIntensity);
    if (scene.effect === 'descend') {
      settleTimer = setTimeout(() => {
        if (!hasSkipped.current) hapticHeavy();
      }, Math.min(scene.duration * 0.75, 3800) * timeScale);
      timersRef.current.push(settleTimer);
    }
    if (!reducedMotion) {
      runSceneEffect(scene, event.shakeIntensity ?? 0, event.phase);
      if (scene.effect === 'particles_rise' || scene.effect === 'particles_fall') {
        burstNonceRef.current += 1;
        setBurst({
          direction: scene.effect === 'particles_rise' ? 'rise' : 'fall',
          color: event.particles?.color ?? event.accentColor,
          size: event.particles?.size ?? 8,
          durationMs: scene.duration * timeScale,
          nonce: burstNonceRef.current,
        });
      }
      sceneOpacity.setValue(0);
      sceneTranslateY.setValue(12);
      Animated.parallel([
        Animated.timing(sceneOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(sceneTranslateY, { toValue: 0, duration: 360, useNativeDriver: true }),
      ]).start();
    } else {
      sceneOpacity.setValue(1);
      sceneTranslateY.setValue(0);
    }
    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      stopEffectAnims();
      sceneOpacity.stopAnimation();
      sceneTranslateY.stopAnimation();
    };
    // Playback mode is deliberately absent: it only controls the timer below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, activeSceneIndex]);

  useEffect(() => {
    const scene = event?.scenes[activeSceneIndex];
    if (!event || visibleEventRef.current !== event || !scene ||
        manualPlayback || hasSkipped.current) return;
    // Reduced motion changes movement, never the time available to read.
    const nextScene = event.scenes[activeSceneIndex + 1];
    const authoredGap = nextScene ? Math.max(0, nextScene.delay - scene.delay - scene.duration) : 350;
    const timer = setTimeout(() => {
      if (hasSkipped.current) return;
      if (activeSceneIndex >= event.scenes.length - 1) finishRef.current();
      else setActiveSceneIndex(index => index + 1);
    }, (scene.duration + authoredGap) * 1.25);
    timersRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [event, activeSceneIndex, manualPlayback]);

  if (!event) return null;
  const eventIsVisible = visibleEventRef.current === event;
  const activeScene = eventIsVisible ? event.scenes[activeSceneIndex] : undefined;
  const isIllustration = (key: SceneImage) =>
    key === 'private_room' || key === 'outward_road' || key === 'outward_road_night' || key === 'kept_table';
  const lastScene = activeSceneIndex === event.scenes.length - 1;
  const contentWidth = Math.min(width - 32, 720);
  const heroHeight = Math.max(100, Math.min(height * 0.37, 400));
  const readingHeight = Math.max(160, height - insets.top - insets.bottom - heroHeight - 115);
  const imageSize = (key: SceneImage) => isIllustration(key)
    ? { width: contentWidth, height: heroHeight }
    : { width: Math.min(contentWidth * 0.84, heroHeight * SCENE_IMAGE_ASPECT[key]),
        height: Math.min(contentWidth * 0.84 / SCENE_IMAGE_ASPECT[key], heroHeight) };

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity, backgroundColor: event.bgColor,
        transform: [{ translateX: shakeX }, { translateY: shakeY }] }]}
      accessibilityViewIsModal
      accessibilityLabel={event.showTitle === false ? 'A moment in the house' : event.title}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.topGlow, { backgroundColor: event.accentColor + '16' }]} />
        {event.particles && !effectiveReducedMotion && Array.from({ length: event.particles.count }, (_, i) => (
          <CinematicParticle key={`${width}:${height}:${i}`} config={event.particles!} index={i} />
        ))}
      </View>
      <View style={[styles.shell, { width: contentWidth, paddingTop: insets.top + 14,
        paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={styles.eyebrow}>WORDSHIFT</Text>
            {event.showTitle !== false && <Text style={styles.title}>{event.title}</Text>}
          </View>
          <TouchableOpacity style={styles.skipButton} onPress={() => finish(true)}
            accessibilityLabel="Skip transition" accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.artStage, { height: heroHeight }]} pointerEvents="none">
          {event.backdrop && (
            <View style={styles.imageLayer}>
              <Image source={SCENE_IMAGE_SOURCES[event.backdrop.image]}
                resizeMode={isIllustration(event.backdrop.image) ? 'cover' : 'contain'}
                style={[imageSize(event.backdrop.image), { opacity: event.backdrop.opacity }]}
                accessible={false} />
            </View>
          )}
          {eventIsVisible && activeImage && (
            <Animated.View style={[styles.imageLayer, { opacity: imageOpacity,
              transform: [{ translateY: imageTranslateY }, { scale: imageScale }] }]}>
              <Image source={SCENE_IMAGE_SOURCES[activeImage]}
                resizeMode={isIllustration(activeImage) ? 'cover' : 'contain'}
                style={imageSize(activeImage)} accessible={false} />
            </Animated.View>
          )}
          <SoftVignette opacity={vignetteOpacity} color={getPhaseTheme(event.phase).vignetteColor} />
          {burst && <View key={`${width}:${height}:${burst.nonce}`} style={StyleSheet.absoluteFill}>
            {Array.from({ length: BURST_PARTICLE_COUNT }, (_, i) => (
              <BurstParticle key={i} direction={burst.direction} color={burst.color}
                size={burst.size} durationMs={burst.durationMs} />
            ))}
          </View>}
          <View style={styles.artRule} />
        </View>

        <Animated.View style={[styles.sceneContainer, { maxHeight: readingHeight,
          opacity: sceneOpacity, transform: [{ translateY: sceneTranslateY }] }]}>
          {activeScene && <>
            {activeScene.speaker && <View style={styles.speakerRow}>
              <StoryPortrait speaker={activeScene.speaker} phase={event.phase} passage={`${event.title}:${activeSceneIndex}`} size={76} />
              <View style={styles.speakerCaption}>
                <Text style={styles.speakerName}>{getStorySpeakerName(activeScene.speaker)}</Text>
                <View style={[styles.speakerRule, { backgroundColor: event.accentColor }]} />
              </View>
            </View>}
            <ScrollView ref={scrollRef} style={styles.readingScroll}
              contentContainerStyle={styles.readingContent} bounces={false}
              showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
              <Text style={styles.sceneText}>{activeScene.text}</Text>
            </ScrollView>
            <View style={styles.footer}>
              <View style={styles.progressGroup}>
                <Text style={styles.progressText}>
                  {activeSceneIndex + 1} / {event.scenes.length}
                </Text>
                <Text style={styles.modeText}>{manualPlayback ? 'At your pace' : 'A moment unfolds'}</Text>
              </View>
              {manualPlayback ? <TouchableOpacity onPress={next} style={styles.continueButton}
                accessibilityRole="button" accessibilityLabel={lastScene ? 'Return to the house' : 'Continue the scene'}>
                <Text style={styles.continueText}>{lastScene ? 'Return' : 'Continue'}</Text>
              </TouchableOpacity> : <TouchableOpacity onPress={() => setManualPlayback(true)}
                style={styles.readButton} accessibilityRole="button" accessibilityLabel="Pause and read at my pace">
                <Text style={styles.readButtonText}>Read at my pace</Text>
              </TouchableOpacity>}
            </View>
          </>}
        </Animated.View>
      </View>
      <Animated.View pointerEvents="none" style={[styles.flash,
        { opacity: flashOpacity, backgroundColor: flashColor }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', zIndex: 1000 },
  shell: { flex: 1, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    minHeight: 58, marginBottom: 12 },
  titleGroup: { flex: 1, paddingRight: 16 },
  eyebrow: { fontFamily: PIXEL_FONT_BOLD, fontSize: 10, letterSpacing: 3, color: '#CBB9A0', marginBottom: 8 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22, lineHeight: 30, color: '#F3E8D7' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '48%' },
  artStage: { width: '100%', overflow: 'hidden', marginBottom: 16, backgroundColor: '#100B15' },
  imageLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  artRule: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: '#D7BE8B60' },
  sceneContainer: { flex: 1, flexShrink: 1, backgroundColor: '#17121D',
    borderWidth: 1, borderColor: '#8B755D60', paddingHorizontal: 20, paddingTop: 12 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  portrait: { width: 56, height: 56, marginRight: 12 },
  speakerCaption: { flex: 1 },
  speakerName: { fontFamily: PIXEL_FONT_BOLD, fontSize: 16, lineHeight: 24, color: '#E9CCA2' },
  speakerRule: { height: 2, width: 30, marginTop: 8 },
  readingScroll: { flexShrink: 1 },
  readingContent: { paddingVertical: 12 },
  sceneText: { fontFamily: BODY_FONT, fontSize: 20, lineHeight: 31, color: '#F2E7D6' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, borderTopWidth: 1, borderTopColor: '#806B5560', paddingVertical: 14, marginTop: 10 },
  progressGroup: { flexShrink: 1 },
  progressText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 11, letterSpacing: 2, color: '#D5C3A9' },
  modeText: { fontFamily: BODY_FONT, fontSize: 12, color: '#C3B5CC', marginTop: 5 },
  continueButton: { minHeight: 48, minWidth: 110, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18, borderWidth: 1, borderColor: '#D8B680', backgroundColor: '#3A2D29' },
  continueText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 14, color: '#F4E8D1' },
  readButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  readButtonText: { fontFamily: BODY_FONT_BOLD, fontSize: 14, color: '#E2D2BD' },
  skipButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16,
    borderWidth: 1, borderColor: SKIP_BORDER_COLOR, backgroundColor: '#100B15', zIndex: 1000 },
  skipText: { fontFamily: BODY_FONT_BOLD, fontSize: FONT_SIZE.bodyLg, color: SKIP_INK_COLOR },
  flash: { ...StyleSheet.absoluteFill, zIndex: 1001 },
  vignette: { ...StyleSheet.absoluteFill, zIndex: 1 },
});
