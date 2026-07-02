import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  StatusBar,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import {
  CandyColors,
  getOverlayBannerTheme,
  getPhaseTheme,
  getTileColor,
  PIT_BACKGROUND_COLORS as PIT_BG_COLORS,
  PIT_DEVOUR_COLORS as DEVOUR_COLORS,
} from '../theme/colors';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { DialoguePhase } from '../types/homeWorld';
import {
  getPitOfferAllLabel,
  getPitEmptyMessage,
  getPitOfferResultMessage,
  getPitHarvestLabel,
  getPitPendingAmberLabel,
  getPitOverflowText,
  PIT_WARD_COUNT,
  getPitWardHint,
  getPitTransitionReadyText,
  getPitTransitionCeremonyText,
  getWardMarkColors,
  getTendingTitle,
  getTendingSubtitle,
  getTendingButtonLabel,
  getTendingDailyBonusHint,
  getTendingResultMessage,
  getTendingMilestoneCeremonyText,
  getTendingLevelLabel,
} from '../services/phaseNarrative';
import { confirmPhaseTransition, spendAmber, awardBonusAmber } from '../services/amberCurrency';
import {
  loadTendingState,
  getNextTendingInfo,
  applyTend,
  isTendingAvailable,
  getTendingIntensity,
  NextTendingInfo,
} from '../services/tending';
import { updateQuestProgress, Quest } from '../services/weeklyQuests';
import {
  getHarvestState,
  offerBatch,
  offerAllBatches,
  HarvestState,
} from '../services/wordHarvest';
import { getSettingsSync } from '../services/settings';
import { logEvent } from '../services/eventLogger';
import { hapticLight, hapticMedium, hapticHeavy } from '../services/haptics';
import { getDeviceTier, shouldSimplifyAnimations } from '../services/deviceTier';
import { RewardedAdButton } from './monetization/RewardedAdButton';

/** Bonus amber granted for a player-initiated rewarded ad at the Tending Shrine. */
const REWARDED_TEND_BONUS = 30;

// ---------------------------------------------------------------------------
// Assets & Constants
// ---------------------------------------------------------------------------

const PIT_DAY = require('../../assets/environment/pitt_day.png');
const PIT_AFTERNOON = require('../../assets/environment/pitt_afternoon.png');
const PIT_DUSK = require('../../assets/environment/pitt_dusk.png');
const PIT_NIGHT = require('../../assets/environment/pitt_night.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getPitBackground(phase: number) {
  if (phase >= 3) return PIT_NIGHT;
  if (phase >= 2) return PIT_DUSK;
  if (phase >= 1) return PIT_AFTERNOON;
  return PIT_DAY;
}

const PIT_CENTER = {
  x: SCREEN_WIDTH * 0.5,
  y: SCREEN_HEIGHT * 0.72,
};

// Pit opening oval dimensions — used to position overlays that align with
// the pit opening in all three background images.
const PIT_OVAL = {
  radiusX: SCREEN_WIDTH * 0.29,
  radiusY: SCREEN_HEIGHT * 0.06,
};

// Pre-inset header-height estimate — only positions the module-level FLOAT_ZONE
// for spawning word chips. The rendered header uses useScreenInsets instead.
const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60;

const FLOAT_ZONE = {
  top: STATUS_BAR_HEIGHT + 60,
  bottom: SCREEN_HEIGHT * 0.55,
  left: 10,
  right: SCREEN_WIDTH - 10,
};

// Mini candy tile size (per letter)
const MINI_TILE_W = 22;
const MINI_TILE_H = 28;
const MINI_TILE_BODY_H = 24;
const MINI_TILE_EDGE_H = 4;
const MINI_TILE_RADIUS = 6;
const MINI_TILE_GAP = 1.5;
const MINI_FONT = 13;

function getMaxFloatingWords(): number {
  switch (getDeviceTier()) {
    case 'low': return 15;
    case 'medium': return 30;
    case 'high': return 50;
  }
}

function getMaxTrailParticles(): number {
  return shouldSimplifyAnimations() ? 2 : 5;
}

function getMaxAmberParticles(): number {
  return shouldSimplifyAnimations() ? 3 : 7;
}

function getMaxImpactBurstParticles(): number {
  return shouldSimplifyAnimations() ? 4 : 8;
}

function getMaxRimParticles(): number {
  switch (getDeviceTier()) {
    case 'low': return 2;
    case 'medium': return 4;
    case 'high': return 6;
  }
}

// Multi-layered concentric glow — creates depth and natural radial falloff
// Each layer is rendered as a circle then stretched with scaleX for a true ellipse
// (football/rugby ball shape with tapered pointed ends, not a flat-edged capsule)
const PIT_GLOW_BASE_WIDTH = SCREEN_WIDTH * 0.7;
const PIT_GLOW_BASE_HEIGHT = 90;

// Pre-computed ellipse scaleX ratios (targetWidth / circleSize) for each layer
const GLOW_OUTER_SIZE = PIT_GLOW_BASE_HEIGHT * 1.1;     // 99px circle
const GLOW_OUTER_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.9) / GLOW_OUTER_SIZE;
const GLOW_MIDDLE_SIZE = PIT_GLOW_BASE_HEIGHT * 0.9;    // 81px circle
const GLOW_MIDDLE_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.64) / GLOW_MIDDLE_SIZE;
const GLOW_INNER_SIZE = PIT_GLOW_BASE_HEIGHT * 0.7;     // 63px circle
const GLOW_INNER_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.4) / GLOW_INNER_SIZE;
const GLOW_CORE_SIZE = PIT_GLOW_BASE_HEIGHT * 0.5;      // 45px circle
const GLOW_CORE_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.28) / GLOW_CORE_SIZE;
const GLOW_RIM_SIZE_Y = PIT_OVAL.radiusY * 2;           // rim uses PIT_OVAL dims
const GLOW_RIM_SCALE_X = (PIT_OVAL.radiusX * 2) / GLOW_RIM_SIZE_Y;

// Colors that match the pit rim glow baked into each background image
const RIM_PARTICLE_COLORS: Record<number, string> = {
  0: '#80E8D0', // turquoise sparkles (day)
  1: '#80E8D0',
  2: '#FFA040', // warm orange (dusk)
  3: '#60D8C8', // cyan supernatural (night)
  4: '#60D8C8',
};

// Phase-aware breathing glow opacity [min, max]
const BREATH_OPACITY: Record<number, [number, number]> = {
  0: [0.03, 0.12],
  1: [0.03, 0.12],
  2: [0.05, 0.18],
  3: [0.06, 0.22],
  4: [0.08, 0.30],
};

// Phase-aware breathing glow scale [min, max]
const BREATH_SCALE: Record<number, [number, number]> = {
  0: [0.90, 1.05],
  1: [0.90, 1.05],
  2: [0.92, 1.06],
  3: [0.93, 1.08],
  4: [0.95, 1.10],
};

const BREATH_CYCLE_MS = 4000; // half-cycle: 4s in, 4s out = 8s full

function getDevourDuration(phase: number): number {
  if (phase >= 3) return 600;
  if (phase >= 2) return 750;
  return 900;
}

// Compute a parametric spiral path from (startX, startY) to (centerX, centerY).
// Returns input range [0..1] and corresponding X/Y output ranges.
function computeSpiralPath(
  startX: number,
  startY: number,
  centerX: number,
  centerY: number,
  rotations: number,
  steps: number,
): { input: number[]; outputX: number[]; outputY: number[] } {
  const dx = startX - centerX;
  const dy = startY - centerY;
  const startRadius = Math.sqrt(dx * dx + dy * dy);
  const startAngle = Math.atan2(dy, dx);

  const input: number[] = [];
  const outputX: number[] = [];
  const outputY: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // radius shrinks with acceleration (power > 1 means faster collapse near center)
    const radius = startRadius * Math.pow(1 - t, 1.8);
    const angle = startAngle + rotations * 2 * Math.PI * t;
    input.push(t);
    outputX.push(centerX + radius * Math.cos(angle));
    outputY.push(centerY + radius * Math.sin(angle));
  }

  return { input, outputX, outputY };
}

const SPIRAL_STEPS = 20;
const SPIRAL_ROTATIONS = 2.5;

// ---------------------------------------------------------------------------
// FlyingWord data type
// ---------------------------------------------------------------------------

interface FlyingWord {
  id: string;
  word: string;
  batchId: string;
  // Single progress values for smooth looped float (0 → 1, linear)
  driftProgress: Animated.Value;
  bobProgress: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  // For devour: absolute position overrides
  devourX: Animated.Value;
  devourY: Animated.Value;
  // Spiral path — parametric keyframes computed at devour time
  devourProgress: Animated.Value;
  spiralInput?: number[];
  spiralRangeX?: number[];
  spiralRangeY?: number[];
  useDevourPos: boolean; // when true, render uses spiral interpolation
  baseX: number;
  baseY: number;
  driftAmplitude: number;
  driftPeriod: number;
  driftPhaseOffset: number; // 0-1 random phase shift for sine wave
  bobAmplitude: number;
  bobPeriod: number;
  bobPhaseOffset: number; // 0-1 random phase shift for sine wave
  isDevoured: boolean;
  floatLoopX: Animated.CompositeAnimation | null;
  floatLoopY: Animated.CompositeAnimation | null;
}

interface TrailParticle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

interface ImpactParticle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

interface AmberParticle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
}

interface RimParticle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

interface ShockwaveRing {
  id: string;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
}

// ---------------------------------------------------------------------------
// MiniCandyTile — single letter with 3D candy styling
// ---------------------------------------------------------------------------

const MiniCandyTile = React.memo(({ char }: { char: string }) => {
  const color = getTileColor(char);
  return (
    <View style={tileStyles.outer}>
      <View style={[tileStyles.body, { backgroundColor: color.bg }]}>
        {/* Top bevel highlight */}
        <View style={tileStyles.bevel} />
        {/* Specular dot */}
        <View style={tileStyles.specular} />
        {/* Letter */}
        <Text style={tileStyles.letter}>{char}</Text>
      </View>
      {/* 3D bottom edge */}
      <View style={[tileStyles.edge, { backgroundColor: color.border }]} />
    </View>
  );
});
MiniCandyTile.displayName = 'MiniCandyTile';

const tileStyles = StyleSheet.create({
  outer: {
    width: MINI_TILE_W,
    height: MINI_TILE_H,
    marginHorizontal: MINI_TILE_GAP / 2,
  },
  body: {
    width: MINI_TILE_W,
    height: MINI_TILE_BODY_H,
    borderRadius: MINI_TILE_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%' as unknown as number,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderTopLeftRadius: MINI_TILE_RADIUS,
    borderTopRightRadius: MINI_TILE_RADIUS,
  },
  specular: {
    position: 'absolute',
    top: 3,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  letter: {
    color: '#FFFFFF',
    fontSize: MINI_FONT,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  edge: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    right: 2,
    height: MINI_TILE_EDGE_H,
    borderBottomLeftRadius: MINI_TILE_RADIUS - 1,
    borderBottomRightRadius: MINI_TILE_RADIUS - 1,
    zIndex: -1,
  },
});

// ---------------------------------------------------------------------------
// FloatingWordChip — word as a row of mini candy tiles
// ---------------------------------------------------------------------------

// Compute 5 sine-wave sample points with a phase offset for smooth looped drift
function sineOutputRange(base: number, amplitude: number, phaseOffset: number): number[] {
  const TWO_PI = 2 * Math.PI;
  return [0, 0.25, 0.5, 0.75, 1].map(t =>
    base + amplitude * Math.sin(TWO_PI * (t + phaseOffset))
  );
}

const FloatingWordChip = React.memo(({
  fw,
  onTap,
}: {
  fw: FlyingWord;
  onTap: (fw: FlyingWord) => void;
}) => {
  const spin = fw.rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Derive smooth sinusoidal position from linear progress + phase offset
  // sin(2π(t + φ)) where t goes 0→1 in a loop and φ is the random phase offset
  // At t=0 and t=1, sin(2π(0+φ)) === sin(2π(1+φ)), so the loop wraps perfectly
  const driftXRange = useMemo(
    () => sineOutputRange(fw.baseX, fw.driftAmplitude, fw.driftPhaseOffset),
    [fw.baseX, fw.driftAmplitude, fw.driftPhaseOffset]
  );
  const driftYRange = useMemo(
    () => sineOutputRange(fw.baseY, -fw.bobAmplitude, fw.bobPhaseOffset),
    [fw.baseY, fw.bobAmplitude, fw.bobPhaseOffset]
  );

  const driftX = fw.driftProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: driftXRange,
  });

  const driftY = fw.bobProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: driftYRange,
  });

  // Use spiral interpolation when actively spiraling, otherwise interpolated drift
  const posX = (fw.useDevourPos && fw.spiralInput)
    ? fw.devourProgress.interpolate({ inputRange: fw.spiralInput, outputRange: fw.spiralRangeX! })
    : driftX;
  const posY = (fw.useDevourPos && fw.spiralInput)
    ? fw.devourProgress.interpolate({ inputRange: fw.spiralInput, outputRange: fw.spiralRangeY! })
    : driftY;

  return (
    <Animated.View
      style={[
        chipStyles.wrapper,
        {
          transform: [
            { translateX: posX },
            { translateY: posY },
            { scale: fw.scale },
            { rotate: spin },
          ],
          opacity: fw.opacity,
        },
      ]}
      pointerEvents={fw.isDevoured ? 'none' : 'auto'}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onTap(fw)}
        accessibilityLabel={`Word: ${fw.word}, tap to offer`}
        accessibilityRole="button"
      >
        <View style={chipStyles.tileRow}>
          {fw.word.split('').map((ch, i) => (
            <MiniCandyTile key={`${ch}_${i}`} char={ch} />
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
FloatingWordChip.displayName = 'FloatingWordChip';

const chipStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
});

// ---------------------------------------------------------------------------
// Particle & effect renderers
// ---------------------------------------------------------------------------

const TrailParticleView = React.memo(({ p }: { p: TrailParticle }) => (
  <Animated.View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: p.color,
      transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
      opacity: p.opacity,
    }}
  />
));
TrailParticleView.displayName = 'TrailParticleView';

const ImpactParticleView = React.memo(({ p }: { p: ImpactParticle }) => (
  <Animated.View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: p.color,
      transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
      opacity: p.opacity,
    }}
  />
));
ImpactParticleView.displayName = 'ImpactParticleView';

const AmberParticleView = React.memo(({ p }: { p: AmberParticle }) => (
  <Animated.View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 12,
      height: 12,
      borderRadius: 2,
      backgroundColor: '#FFBF00',
      transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }, { rotate: '45deg' }],
      opacity: p.opacity,
    }}
  />
));
AmberParticleView.displayName = 'AmberParticleView';

const RimParticleView = React.memo(({ p }: { p: RimParticle }) => (
  <Animated.View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: p.color,
      shadowColor: p.color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 3,
      transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
      opacity: p.opacity,
    }}
  />
));
RimParticleView.displayName = 'RimParticleView';

const ShockwaveRingView = React.memo(({ ring }: { ring: ShockwaveRing }) => {
  const size = PIT_OVAL.radiusX * 2.6;
  const sizeY = PIT_OVAL.radiusY * 2.6;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: PIT_CENTER.y - sizeY / 2,
        left: PIT_CENTER.x - size / 2,
        width: size,
        height: sizeY,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: ring.color,
        transform: [{ scale: ring.scale }],
        opacity: ring.opacity,
      }}
    />
  );
});
ShockwaveRingView.displayName = 'ShockwaveRingView';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Onboarding pit-offering decisions (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Whether floating word chips respond to taps. Taps are live outside
 * onboarding and during the pit_offering step — the FoxGuide tells the player
 * to tap each glowing word, so the tap path must never be suppressed there.
 * Earlier onboarding beats (pit_intro) keep taps inert so the player can't
 * offer words before Fox explains them.
 */
export function isPitWordTapEnabled(
  isOnboarding: boolean | undefined,
  onboardingStep: string | undefined,
): boolean {
  return !isOnboarding || onboardingStep === 'pit_offering';
}

/**
 * What the pit_offering progress effect should do for the current harvest
 * state. The step completes ONLY through the player's own taps (each devoured
 * word finalizes its batch; pendingBatches drains to 0) — there is no
 * auto-offer. 'arm_fallback' covers reaching the step with nothing offerable
 * (missing/empty batch, or a relaunch after the words were already offered),
 * where no tap interaction exists that could ever complete the step.
 */
export type PitOnboardingOfferAction =
  | 'reset'          // not in pit_offering — clear tracking
  | 'wait'           // harvest state not loaded yet
  | 'track_pending'  // words remain — remember we had something to offer
  | 'complete'       // player devoured the last pending batch
  | 'arm_fallback';  // nothing was ever pending — schedule completion

export function getPitOnboardingOfferAction(
  onboardingStep: string | undefined,
  hadPending: boolean,
  pendingBatchCount: number | null,
): PitOnboardingOfferAction {
  if (onboardingStep !== 'pit_offering') return 'reset';
  if (pendingBatchCount == null) return 'wait';
  if (pendingBatchCount > 0) return 'track_pending';
  return hadPending ? 'complete' : 'arm_fallback';
}

/**
 * How long the pit_offering step may sit with pending words and no successful
 * devour before the stalled-pending safety net auto-offers the remainder.
 * Generous on purpose: the manual tap-to-devour flow is primary, and every
 * player devour resets this clock — the net only catches a player whose taps
 * never register (or who is genuinely stuck), never one actively tapping.
 */
export const PIT_ONBOARDING_STALL_RESCUE_MS = 30000;

/**
 * Stalled-pending safety net for the pit_offering onboarding step.
 *
 * The player-driven flow ('track_pending' → taps drain batches → 'complete')
 * has no way out if the player taps some-but-not-all word chips, or their
 * taps never register: nothing else can ever complete the step, soft-locking
 * onboarding forever. This watchdog rescues that case: `arm()` (re)starts a
 * generous clock — called when words become pending and again after every
 * successful devour, so an actively-tapping player is never preempted — and
 * `cancel()` clears it (unmount / step change / effect re-run). If the clock
 * runs out, `onStall` auto-offers the remaining batches and completes the
 * step. Pure timer logic, exported for tests (fake timers).
 */
export function createPitOnboardingStallRescue(
  onStall: () => void,
  timeoutMs: number = PIT_ONBOARDING_STALL_RESCUE_MS,
): { arm: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const arm = () => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      onStall();
    }, timeoutMs);
  };
  return { arm, cancel };
}

// ---------------------------------------------------------------------------
// Pit amber display accounting (pure, exported for tests)
// ---------------------------------------------------------------------------

/**
 * Display increment for the k-th devoured word of a batch (or Offer All
 * cascade) worth `batchValue` amber across `totalWords` words.
 *
 * Both harvest paths route their on-screen accounting through this: as each
 * word is devoured, the displayed pending amber goes DOWN by this amount and
 * the displayed total goes UP by the same amount. Increments partition
 * `batchValue` exactly — the cumulative sum after k words is
 * `round(batchValue * k / totalWords)` — so the running display total can
 * never exceed the real credited balance and the last word always lands
 * exactly on it. (Naive per-word rounding, e.g. round(10/4)=3 four times,
 * overshoots by 2; this never does.)
 */
export function computeDevourAmberIncrement(
  batchValue: number,
  totalWords: number,
  devouredCount: number,
): number {
  if (totalWords <= 0 || batchValue <= 0) return 0;
  const k = Math.floor(devouredCount);
  if (k < 1 || k > totalWords) return 0;
  const cumulative = Math.round((batchValue * k) / totalWords);
  const previous = Math.round((batchValue * (k - 1)) / totalWords);
  return Math.max(0, cumulative - previous);
}

interface OfferingPitScreenProps {
  phase: DialoguePhase;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
  onOpenStats?: () => void;
  onOpenSettings?: () => void;
  /** 0.0 to 1.0 — how close the player is to the next phase */
  phaseProgressFraction: number;
  /** Non-null when a phase transition is pending and ready to confirm */
  pendingPhaseTransition: DialoguePhase | null;
  /** Called after the pit confirms the phase transition */
  onPhaseTransitionConfirmed?: (newPhase: DialoguePhase) => void;
  /** Whether onboarding is active — suppresses normal interaction */
  isOnboarding?: boolean;
  /** Current onboarding step (gates the manual tap-to-offer flow) */
  onboardingStep?: string;
  /** Called once the player has tap-devoured every pending word during onboarding */
  onOnboardingOfferComplete?: () => void;
}

export const OfferingPitScreen: React.FC<OfferingPitScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
  onOpenStats,
  onOpenSettings,
  phaseProgressFraction,
  pendingPhaseTransition,
  onPhaseTransitionConfirmed,
  isOnboarding,
  onboardingStep,
  onOnboardingOfferComplete,
}) => {
  const screenInsets = useScreenInsets();
  const phaseTheme = getPhaseTheme(phase);
  const reducedMotion = getSettingsSync()?.reducedMotion ?? false;
  const simplify = shouldSimplifyAnimations();

  const [harvestState, setHarvestState] = useState<HarvestState | null>(null);
  const [flyingWords, setFlyingWords] = useState<FlyingWord[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [impactParticles, setImpactParticles] = useState<ImpactParticle[]>([]);
  const [amberParticles, setAmberParticles] = useState<AmberParticle[]>([]);
  const [rimParticles, setRimParticles] = useState<RimParticle[]>([]);
  const [shockwaveRings, setShockwaveRings] = useState<ShockwaveRing[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isOffering, setIsOffering] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(amberBalance);
  const [overflowCount, setOverflowCount] = useState(0);
  // Tracks amber visually consumed during harvest-all cascade (for decrementing pending display)
  const [pendingAmberOffset, setPendingAmberOffset] = useState(0);
  const [showUtilityModal, setShowUtilityModal] = useState(false);

  // Tending Shrine (Phase 5 endgame loop) — the repeatable cosmetic amber sink.
  const tendingEnabled = isTendingAvailable(phase);
  const [showTendingModal, setShowTendingModal] = useState(false);
  const [tendingLevel, setTendingLevel] = useState(0);
  const [tendingNext, setTendingNext] = useState<NextTendingInfo | null>(null);
  const [tendingBusy, setTendingBusy] = useState(false);
  // Pending ceremony/result toast timers, tracked so they're cleared on unmount.
  const tendTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const devouredPerBatch = useRef<Map<string, Set<string>>>(new Map());
  const batchWordCounts = useRef<Map<string, number>>(new Map());
  const finalizingBatches = useRef<Set<string>>(new Set());

  // Onboarding stalled-pending safety net (see the effect below handleHarvestAll).
  // Held in a ref so every successful player devour can reset its clock without
  // re-running the effect. Null outside the pit_offering onboarding step.
  const stallRescueRef = useRef<{ arm: () => void; cancel: () => void } | null>(null);

  // Surge glow — flashes on devour impact / inhale
  const pitSurgeOpacity = useRef(new Animated.Value(0)).current;
  const pitSurgeScale = useRef(new Animated.Value(0.8)).current;

  // Breathing glow — continuous ambient pulse
  const pitBreathProgress = useRef(new Animated.Value(0)).current;
  const breathLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Glow intensity — dims when no words are floating (0.35 = quiet, 1.0 = full)
  const glowIntensity = useRef(new Animated.Value(0.35)).current;
  const glowIntensityAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const flyingWordsRef = useRef<FlyingWord[]>([]);

  // Stable callback ref to avoid re-rendering all chips when devourWord deps change
  const devourWordRef = useRef<(fw: FlyingWord) => void>(() => {});
  const stableDevourWord = useCallback((fw: FlyingWord) => devourWordRef.current(fw), []);
  const noopDevour = useCallback((_fw: FlyingWord) => {}, []);

  const harvestStateRef = useRef(harvestState);
  const amberBalanceRef = useRef(amberBalance);
  // Mirrors isOffering synchronously (state lags a render) so async callbacks
  // and the amberBalance prop-sync effect can tell when the Offer All cascade
  // owns the displayed balance.
  const isOfferingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      tendTimersRef.current.forEach(clearTimeout);
      tendTimersRef.current = [];
    };
  }, []);
  useEffect(() => { flyingWordsRef.current = flyingWords; }, [flyingWords]);
  useEffect(() => {
    // During the Offer All cascade the parent echoes the already-credited
    // FINAL balance back through this prop (onAmberChange fires before the
    // words animate). Syncing here would jump the display straight to that
    // final value while the per-word increments keep adding on top — the
    // overshoot-then-snap-down bug. The cascade settles the display itself.
    if (isOfferingRef.current) return;
    setDisplayBalance(amberBalance);
  }, [amberBalance]);
  useEffect(() => { amberBalanceRef.current = amberBalance; }, [amberBalance]);
  useEffect(() => { harvestStateRef.current = harvestState; }, [harvestState]);

  // ---- Ward mark ceremony state machine ----
  type CeremonyStatus = 'idle' | 'igniting' | 'erupting' | 'text' | 'complete';
  const [ceremonyStatus, setCeremonyStatus] = useState<CeremonyStatus>('idle');
  const [ceremonyIgniteStep, setCeremonyIgniteStep] = useState(-1);
  const [ceremonyTextIndex, setCeremonyTextIndex] = useState(-1);
  const ceremonyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const popInTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const amberRiseTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const trailTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Ward mark pulse animation (for pending state)
  const wardPulseProgress = useRef(new Animated.Value(0)).current;
  const wardPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  // Ward ignition flash per mark
  const wardFlashAnims = useRef<Animated.Value[]>(
    Array.from({ length: PIT_WARD_COUNT }, () => new Animated.Value(0))
  ).current;

  // Ceremony text fade
  const ceremonyTextOpacity = useRef(new Animated.Value(0)).current;
  const ceremonyOverlayOpacity = useRef(new Animated.Value(0)).current;

  // Ward mark positions: distributed along upper arc of the pit oval
  const wardPositions = useMemo(() => {
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < PIT_WARD_COUNT; i++) {
      const t = PIT_WARD_COUNT > 1 ? i / (PIT_WARD_COUNT - 1) : 0.5;
      const angle = -Math.PI * 0.85 + t * Math.PI * 0.7;
      positions.push({
        x: PIT_CENTER.x + PIT_OVAL.radiusX * 1.18 * Math.cos(angle),
        y: PIT_CENTER.y + PIT_OVAL.radiusY * 1.8 * Math.sin(angle),
      });
    }
    return positions;
  }, []);

  const wardColors = getWardMarkColors(phase);
  const litCount = pendingPhaseTransition != null
    ? PIT_WARD_COUNT
    : Math.floor(phaseProgressFraction * PIT_WARD_COUNT);

  // Ward pulse loop for pending state
  useEffect(() => {
    if (pendingPhaseTransition == null || reducedMotion || ceremonyStatus !== 'idle') {
      wardPulseLoop.current?.stop();
      wardPulseLoop.current = null;
      wardPulseProgress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wardPulseProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wardPulseProgress, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    wardPulseLoop.current = loop;
    loop.start();
    return () => { loop.stop(); wardPulseLoop.current = null; };
  }, [pendingPhaseTransition, reducedMotion, ceremonyStatus, wardPulseProgress]);

  const wardPulseOpacity = wardPulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.0],
  });
  const wardPulseScale = wardPulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.15],
  });

  // Start ward ignition ceremony — defined via ref pattern because
  // flashPitSurge and spawnShockwave are useCallbacks declared later.
  const startCeremonyRef = useRef<() => void>(() => {});
  const startCeremony = useCallback(() => startCeremonyRef.current(), []);

  // Clean up all tracked timers on unmount
  useEffect(() => {
    return () => {
      ceremonyTimers.current.forEach(clearTimeout);
      popInTimeoutsRef.current.forEach(clearTimeout);
      amberRiseTimeoutsRef.current.forEach(clearTimeout);
      trailTimeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Ward hint or ready text
  const wardHintText = useMemo(() => {
    if (pendingPhaseTransition != null && ceremonyStatus === 'idle') {
      return getPitTransitionReadyText(pendingPhaseTransition);
    }
    if (phase < 4 && phaseProgressFraction >= 0.3 && pendingPhaseTransition == null) {
      return getPitWardHint(phase, phaseProgressFraction);
    }
    return null;
  }, [phase, phaseProgressFraction, pendingPhaseTransition, ceremonyStatus]);

  // ---- Auto-trigger ceremony when entering pit with pending transition and no harvest ----
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (
      pendingPhaseTransition != null &&
      ceremonyStatus === 'idle' &&
      harvestState &&
      harvestState.pendingBatches.length === 0 &&
      !autoTriggeredRef.current &&
      !isOnboarding
    ) {
      autoTriggeredRef.current = true;
      const timer = setTimeout(() => {
        if (mountedRef.current) startCeremony();
      }, 1200); // Longer delay so player sees the pit before ceremony
      return () => clearTimeout(timer);
    }
  }, [pendingPhaseTransition, ceremonyStatus, harvestState, isOnboarding, startCeremony]);

  // ---- Ambient breathing glow loop ----
  useEffect(() => {
    if (reducedMotion) {
      // Static mid-value glow for reduced motion
      pitBreathProgress.setValue(0.5);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pitBreathProgress, {
          toValue: 1,
          duration: BREATH_CYCLE_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pitBreathProgress, {
          toValue: 0,
          duration: BREATH_CYCLE_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breathLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      breathLoopRef.current = null;
    };
  }, [reducedMotion, pitBreathProgress]);

  // Animate glow intensity based on floating word presence
  const hasActiveWords = flyingWords.some(w => !w.isDevoured);
  const hasPendingBatches = harvestState != null && harvestState.pendingBatches.length > 0;
  const pitIsActive = hasActiveWords || hasPendingBatches;
  useEffect(() => {
    glowIntensityAnimRef.current?.stop();
    const anim = Animated.timing(glowIntensity, {
      toValue: pitIsActive ? 1.0 : 0.35,
      duration: pitIsActive ? 400 : 800,
      useNativeDriver: true,
    });
    glowIntensityAnimRef.current = anim;
    anim.start(() => { glowIntensityAnimRef.current = null; });
    return () => { anim.stop(); };
  }, [pitIsActive, glowIntensity]);

  // Derive breathing opacity and scale from progress + phase. The Phase-5
  // Tending Level deepens the pit: a small boost to the inner/core glow so the
  // pit visibly grows warmer/deeper as the player tends (caps via the sqrt curve).
  const breathOpacityRange = BREATH_OPACITY[phase] ?? BREATH_OPACITY[0];
  const breathScaleRange = BREATH_SCALE[phase] ?? BREATH_SCALE[0];
  const tendDeepening = getTendingIntensity(tendingLevel);
  const tendGlowMul = 1 + tendDeepening * 0.5; // up to +50% inner/core glow

  // Per-layer opacity interpolations for concentric glow (outer→inner: 0.4x, 0.7x, 1.0x, 2.5x of base)
  // Each layer is multiplied by glowIntensity so the glow dims when no words are present
  const breathOpacityOuter = Animated.multiply(
    pitBreathProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [breathOpacityRange[0] * 0.4, breathOpacityRange[1] * 0.4],
    }),
    glowIntensity,
  );
  const breathOpacityMiddle = Animated.multiply(
    pitBreathProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [breathOpacityRange[0] * 0.7, breathOpacityRange[1] * 0.7],
    }),
    glowIntensity,
  );
  const breathOpacityInner = Animated.multiply(
    pitBreathProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [
        Math.min(breathOpacityRange[0] * tendGlowMul, 0.85),
        Math.min(breathOpacityRange[1] * tendGlowMul, 0.95),
      ],
    }),
    glowIntensity,
  );
  const breathOpacityCore = Animated.multiply(
    pitBreathProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [
        Math.min(breathOpacityRange[0] * 2.5 * tendGlowMul, 0.8),
        Math.min(breathOpacityRange[1] * 2.5 * tendGlowMul, 0.92),
      ],
    }),
    glowIntensity,
  );
  const breathScale = pitBreathProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [breathScaleRange[0], breathScaleRange[1]],
  });

  // ---- Ambient rim particles (embers rising from pit edge) ----
  useEffect(() => {
    if (reducedMotion || simplify) return;

    // More embers rise as the player tends the pattern (Phase-5 deepening),
    // up to roughly double at full intensity — still device-tier/motion gated.
    const maxRim = Math.round(getMaxRimParticles() * (1 + getTendingIntensity(tendingLevel)));
    const spawnInterval = 1000; // ms between spawns
    let spawnCount = 0;

    const spawnRimParticle = () => {
      if (!mountedRef.current) return;
      const color = RIM_PARTICLE_COLORS[phase] ?? RIM_PARTICLE_COLORS[0];
      const angle = Math.random() * Math.PI * 2;
      const startX = PIT_CENTER.x + PIT_OVAL.radiusX * Math.cos(angle) * (0.7 + Math.random() * 0.3);
      const startY = PIT_CENTER.y + PIT_OVAL.radiusY * Math.sin(angle) * (0.7 + Math.random() * 0.3);
      const riseHeight = 80 + Math.random() * 100;
      const driftX = (Math.random() - 0.5) * 40;
      const duration = 3000 + Math.random() * 2000;

      const p: RimParticle = {
        id: `rim_${Date.now()}_${spawnCount++}`,
        x: new Animated.Value(startX),
        y: new Animated.Value(startY),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.3 + Math.random() * 0.4),
        color,
      };

      setRimParticles(prev => {
        // Cap total rim particles
        const capped = prev.length >= maxRim * 2 ? prev.slice(-maxRim) : prev;
        return [...capped, p];
      });

      Animated.parallel([
        Animated.timing(p.y, {
          toValue: startY - riseHeight,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.x, {
          toValue: startX + driftX,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.opacity, { toValue: 0.7 + Math.random() * 0.3, duration: duration * 0.2, useNativeDriver: true }),
          Animated.delay(duration * 0.4),
          Animated.timing(p.opacity, { toValue: 0, duration: duration * 0.4, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(p.scale, { toValue: 0.8 + Math.random() * 0.4, duration: duration * 0.5, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: duration * 0.5, useNativeDriver: true }),
        ]),
      ]).start(() => {
        if (mountedRef.current) setRimParticles(prev => prev.filter(rp => rp.id !== p.id));
      });
    };

    // Stagger initial spawns
    for (let i = 0; i < maxRim; i++) {
      setTimeout(() => spawnRimParticle(), i * (spawnInterval / maxRim));
    }

    const interval = setInterval(spawnRimParticle, spawnInterval);
    return () => clearInterval(interval);
  }, [phase, reducedMotion, simplify, tendingLevel]);

  // ---- Load harvest state ----
  const loadState = useCallback(async () => {
    const state = await getHarvestState();
    if (mountedRef.current) setHarvestState(state);
  }, []);

  useEffect(() => { loadState(); }, [loadState]);

  // ---- Build flying words ----
  useEffect(() => {
    if (!harvestState) return;

    const maxWords = getMaxFloatingWords();
    const allWords: FlyingWord[] = [];
    const batchCounts = new Map<string, number>();
    let totalWords = 0;

    for (const batch of harvestState.pendingBatches) {
      batchCounts.set(batch.id, batch.words.length);
      for (let i = 0; i < batch.words.length; i++) {
        totalWords++;
        if (allWords.length >= maxWords) continue;
        const word = batch.words[i];
        const id = `${batch.id}_${i}`;
        const wordPixelWidth = word.length * (MINI_TILE_W + MINI_TILE_GAP);
        const zoneWidth = FLOAT_ZONE.right - FLOAT_ZONE.left - wordPixelWidth;
        const zoneHeight = FLOAT_ZONE.bottom - FLOAT_ZONE.top;
        const baseX = FLOAT_ZONE.left + Math.random() * Math.max(zoneWidth, 20);
        const baseY = FLOAT_ZONE.top + Math.random() * zoneHeight;

        allWords.push({
          id,
          word,
          batchId: batch.id,
          driftProgress: new Animated.Value(0), // always start at 0 — phase offset creates variety
          bobProgress: new Animated.Value(0),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.3),
          rotation: new Animated.Value(0),
          devourX: new Animated.Value(baseX),
          devourY: new Animated.Value(baseY),
          devourProgress: new Animated.Value(0),
          useDevourPos: false,
          baseX,
          baseY,
          driftAmplitude: 12 + Math.random() * 20,
          driftPeriod: 4000 + Math.random() * 4000,
          driftPhaseOffset: Math.random(), // random 0-1 shifts the sine wave start
          bobAmplitude: 6 + Math.random() * 8,
          bobPeriod: 3000 + Math.random() * 3000,
          bobPhaseOffset: Math.random(),
          isDevoured: false,
          floatLoopX: null,
          floatLoopY: null,
        });
      }
    }

    batchWordCounts.current = batchCounts;
    devouredPerBatch.current = new Map();
    finalizingBatches.current = new Set();
    setOverflowCount(Math.max(0, totalWords - maxWords));
    setFlyingWords(allWords);

    // Staggered pop-in
    popInTimeoutsRef.current.forEach(clearTimeout);
    popInTimeoutsRef.current = [];
    allWords.forEach((fw, i) => {
      const delay = reducedMotion ? 0 : i * 50;
      const tid = setTimeout(() => {
        if (!mountedRef.current) return;
        if (reducedMotion) {
          fw.opacity.setValue(1);
          fw.scale.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.spring(fw.scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
          Animated.timing(fw.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          if (mountedRef.current) startFloatLoop(fw);
        });
      }, delay);
      popInTimeoutsRef.current.push(tid);
    });

    return () => {
      popInTimeoutsRef.current.forEach(clearTimeout);
      popInTimeoutsRef.current = [];
      allWords.forEach(fw => {
        fw.floatLoopX?.stop();
        fw.floatLoopY?.stop();
        fw.floatLoopX = null;
        fw.floatLoopY = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harvestState]);

  // ---- Smooth float loop using single linear progress → interpolated sine ----
  const startFloatLoop = useCallback((fw: FlyingWord) => {
    if (reducedMotion || simplify || fw.isDevoured) return;

    // X drift: single linear timing 0→1 looped, interpolated to sine in render
    const loopX = Animated.loop(
      Animated.timing(fw.driftProgress, {
        toValue: 1,
        duration: fw.driftPeriod,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    fw.floatLoopX = loopX;
    loopX.start();

    // Y bob: same approach, different period
    const loopY = Animated.loop(
      Animated.timing(fw.bobProgress, {
        toValue: 1,
        duration: fw.bobPeriod,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    fw.floatLoopY = loopY;
    loopY.start();
  }, [reducedMotion, simplify]);

  // ---- Pit surge flash (on devour impact) ----
  const flashPitSurge = useCallback(() => {
    if (reducedMotion) return;
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    pitSurgeScale.setValue(0.8);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pitSurgeOpacity, { toValue: colors.glowOpacity, duration: 120, useNativeDriver: true }),
        Animated.delay(40),
        Animated.timing(pitSurgeOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(pitSurgeScale, { toValue: 1.3, friction: 4, tension: 200, useNativeDriver: true }),
        Animated.timing(pitSurgeScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [phase, pitSurgeOpacity, pitSurgeScale, reducedMotion]);

  // ---- Pit inhale surge (on devour START — pit "pulls" the word) ----
  const triggerInhale = useCallback(() => {
    if (reducedMotion) return;
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pitSurgeOpacity, { toValue: colors.glowOpacity * 0.6, duration: 150, useNativeDriver: true }),
        Animated.timing(pitSurgeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(pitSurgeScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(pitSurgeScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [phase, pitSurgeOpacity, pitSurgeScale, reducedMotion]);

  // ---- Spawn trail particles ----
  const spawnTrail = useCallback((startX: number, startY: number) => {
    if (reducedMotion) return;
    const count = getMaxTrailParticles();
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    const duration = getDevourDuration(phase);
    const newParticles: TrailParticle[] = [];
    for (let i = 0; i < count; i++) {
      const p: TrailParticle = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${i}`,
        x: new Animated.Value(startX + (Math.random() - 0.5) * 20),
        y: new Animated.Value(startY + (Math.random() - 0.5) * 20),
        opacity: new Animated.Value(0.8),
        scale: new Animated.Value(0.5 + Math.random() * 0.5),
        color: colors.trail,
      };
      newParticles.push(p);
      const delay = i * 50;
      const tid = setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.x, { toValue: PIT_CENTER.x + (Math.random() - 0.5) * 30, duration: duration * 0.75, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: PIT_CENTER.y + (Math.random() - 0.5) * 20, duration: duration * 0.75, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: duration * 0.75, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: duration * 0.5, delay: duration * 0.3, useNativeDriver: true }),
        ]).start(() => { if (mountedRef.current) setTrailParticles(prev => prev.filter(tp => tp.id !== p.id)); });
      }, delay);
      trailTimeoutsRef.current.push(tid);
    }
    setTrailParticles(prev => [...prev, ...newParticles]);
  }, [phase, reducedMotion]);

  // ---- Spawn impact burst (radial ring at pit center) ----
  const spawnImpactBurst = useCallback(() => {
    if (reducedMotion) return;
    const count = getMaxImpactBurstParticles();
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    const newParticles: ImpactParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      const p: ImpactParticle = {
        id: `imp_${Date.now()}_${i}`,
        x: new Animated.Value(PIT_CENTER.x),
        y: new Animated.Value(PIT_CENTER.y),
        opacity: new Animated.Value(0.9),
        scale: new Animated.Value(0.3),
        color: colors.burst,
      };
      newParticles.push(p);
      Animated.parallel([
        Animated.timing(p.x, { toValue: PIT_CENTER.x + Math.cos(angle) * dist, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(p.y, { toValue: PIT_CENTER.y + Math.sin(angle) * dist, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(p.scale, { toValue: 1.0, friction: 5, tension: 150, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(p.opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]),
      ]).start(() => { if (mountedRef.current) setImpactParticles(prev => prev.filter(ip => ip.id !== p.id)); });
    }
    setImpactParticles(prev => [...prev, ...newParticles]);
  }, [phase, reducedMotion]);

  // ---- Spawn shockwave ring (expanding ripple from pit center) ----
  const spawnShockwave = useCallback(() => {
    if (reducedMotion || simplify) return;
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    const ring: ShockwaveRing = {
      id: `sw_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0.6),
      color: colors.glow,
    };
    setShockwaveRings(prev => {
      // Limit max concurrent shockwaves
      const trimmed = prev.length >= 3 ? prev.slice(-2) : prev;
      return [...trimmed, ring];
    });
    Animated.parallel([
      Animated.timing(ring.scale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ring.opacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (mountedRef.current) setShockwaveRings(prev => prev.filter(r => r.id !== ring.id));
    });
  }, [phase, reducedMotion, simplify]);

  // ---- Ward ignition ceremony implementation (ref-based) ----
  useEffect(() => {
    startCeremonyRef.current = () => {
      if (ceremonyStatus !== 'idle' || pendingPhaseTransition == null) return;
      setCeremonyStatus('igniting');
      setCeremonyIgniteStep(0);

      ceremonyTimers.current.forEach(clearTimeout);
      ceremonyTimers.current = [];

      wardPulseLoop.current?.stop();
      wardPulseLoop.current = null;

      hapticMedium();

      // Sequential ward ignition
      for (let i = 0; i < PIT_WARD_COUNT; i++) {
        const timer = setTimeout(() => {
          if (!mountedRef.current) return;
          setCeremonyIgniteStep(i);
          wardFlashAnims[i].setValue(1);
          Animated.timing(wardFlashAnims[i], {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }).start();
          if (i < PIT_WARD_COUNT - 1) hapticLight();
        }, i * 200);
        ceremonyTimers.current.push(timer);
      }

      // After all wards ignite -> eruption
      const eruptTimer = setTimeout(() => {
        if (!mountedRef.current) return;
        setCeremonyStatus('erupting');
        hapticHeavy();
        flashPitSurge();
        spawnShockwave();
        const sw1 = setTimeout(() => { if (mountedRef.current) spawnShockwave(); }, 150);
        const sw2 = setTimeout(() => { if (mountedRef.current) spawnShockwave(); }, 300);
        ceremonyTimers.current.push(sw1, sw2);

        // After eruption -> ceremony text
        const textTimer = setTimeout(() => {
          if (!mountedRef.current) return;
          setCeremonyStatus('text');
          setCeremonyTextIndex(0);

          Animated.timing(ceremonyOverlayOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start();

          const texts = getPitTransitionCeremonyText(pendingPhaseTransition!);
          let delay = 0;
          const textTimers: ReturnType<typeof setTimeout>[] = [];
          for (let j = 0; j < texts.length; j++) {
            const showTimer = setTimeout(() => {
              if (!mountedRef.current) return;
              setCeremonyTextIndex(j);
              ceremonyTextOpacity.setValue(0);
              Animated.timing(ceremonyTextOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start();
            }, delay);
            textTimers.push(showTimer);
            delay += 2500;
          }
          ceremonyTimers.current.push(...textTimers);

          const completeTimer = setTimeout(async () => {
            if (!mountedRef.current) return;
            const result = await confirmPhaseTransition();
            if (result && mountedRef.current) {
              Animated.timing(ceremonyOverlayOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
              setCeremonyStatus('complete');
              onPhaseTransitionConfirmed?.(result.newPhase);
            } else if (mountedRef.current) {
              // Recovery: fade out overlay and reset to idle so user can retry
              Animated.timing(ceremonyOverlayOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
              setCeremonyStatus('idle');
            }
          }, delay + 1500);
          ceremonyTimers.current.push(completeTimer);
        }, 800);
        ceremonyTimers.current.push(textTimer);
      }, PIT_WARD_COUNT * 200 + 200);
      ceremonyTimers.current.push(eruptTimer);
    };
  }, [ceremonyStatus, pendingPhaseTransition, wardFlashAnims, flashPitSurge, spawnShockwave, ceremonyOverlayOpacity, ceremonyTextOpacity, onPhaseTransitionConfirmed]);

  // ---- Spawn amber rise ----
  const spawnAmberRise = useCallback((_amberAmount: number) => {
    if (reducedMotion) return;
    const count = getMaxAmberParticles();
    const newParticles: AmberParticle[] = [];
    for (let i = 0; i < count; i++) {
      const p: AmberParticle = {
        id: `a_${Date.now()}_${i}`,
        x: new Animated.Value(PIT_CENTER.x - 6 + (Math.random() - 0.5) * 40),
        y: new Animated.Value(PIT_CENTER.y),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.4),
      };
      newParticles.push(p);
      const delay = i * 80;
      const tid = setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.y, { toValue: PIT_CENTER.y - 200 - Math.random() * 100, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.x, { toValue: PIT_CENTER.x - 6 + (Math.random() - 0.5) * 80, duration: 1200, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 0.9, duration: 200, useNativeDriver: true }),
            Animated.delay(500),
            Animated.timing(p.opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
          Animated.spring(p.scale, { toValue: 1.0 + Math.random() * 0.4, friction: 4, useNativeDriver: true }),
        ]).start(() => { if (mountedRef.current) setAmberParticles(prev => prev.filter(ap => ap.id !== p.id)); });
      }, delay);
      amberRiseTimeoutsRef.current.push(tid);
    }
    setAmberParticles(prev => [...prev, ...newParticles]);
  }, [reducedMotion]);

  // ---- Result toast ----
  const showResultToast = useCallback((message: string) => {
    setResultMessage(message);
    resultOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(resultOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(resultOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => { if (mountedRef.current) setResultMessage(null); });
  }, [resultOpacity]);

  // ---- Tending Shrine (Phase 5 endgame sink) ----
  const refreshTending = useCallback(async () => {
    if (!tendingEnabled) return;
    try {
      const state = await loadTendingState();
      if (!mountedRef.current) return;
      setTendingLevel(state.level);
      setTendingNext(getNextTendingInfo(state));
    } catch {}
  }, [tendingEnabled]);

  useEffect(() => { refreshTending(); }, [refreshTending]);

  const handleDeepenPattern = useCallback(async () => {
    if (tendingBusy || !tendingNext) return;
    const cost = tendingNext.cost;
    if (displayBalance < cost) {
      showResultToast('Not enough amber to deepen the pattern yet.');
      return;
    }
    setTendingBusy(true);
    try {
      const spend = await spendAmber(cost, 'tending');
      if (!spend.success) {
        showResultToast('The pattern could not accept that offering right now.');
        return;
      }
      if (mountedRef.current) {
        setDisplayBalance(spend.newBalance);
        onAmberChange?.(spend.newBalance);
      }
      const result = await applyTend(cost);
      // A tend quest is deliberately a sink disguised as a quest — record the
      // amount and surface any quest that completes (so it's not silent).
      let completedQuests: Quest[] = [];
      try {
        completedQuests = await updateQuestProgress({ amberTended: cost }, phase);
      } catch { /* quest tracking is best-effort */ }
      logEvent({ type: 'pit_offer', data: { tending: result.level, amber: cost } });
      await refreshTending();
      if (!mountedRef.current) return;

      // Schedule a toast on a tracked timer (cleared on unmount).
      const schedule = (msg: string, delay: number, heavy = false) => {
        const t = setTimeout(() => {
          if (!mountedRef.current) return;
          if (heavy) hapticHeavy(); else hapticMedium();
          showResultToast(msg);
        }, delay);
        tendTimersRef.current.push(t);
      };

      let nextDelay = 0;
      if (result.milestone != null) {
        // Milestone: close the modal and sequence the serene ceremony lines.
        setShowTendingModal(false);
        hapticHeavy();
        const lines = getTendingMilestoneCeremonyText(result.milestone);
        lines.forEach((line, i) => schedule(line, i * 2600, i === 0));
        nextDelay = lines.length * 2600;
      } else {
        hapticMedium();
        showResultToast(getTendingResultMessage(result.level));
        nextDelay = 2700;
      }

      // Quest-completion feedback after the result/ceremony settles.
      if (completedQuests.length > 0) {
        schedule(`Quest complete: ${completedQuests[0].title}`, nextDelay);
      }
    } finally {
      if (mountedRef.current) setTendingBusy(false);
    }
  }, [tendingBusy, tendingNext, displayBalance, onAmberChange, phase, refreshTending, showResultToast]);

  // ---- Batch completion ----
  const tryFinalizeBatch = useCallback(async (batchId: string) => {
    if (finalizingBatches.current.has(batchId)) return;
    const totalWords = batchWordCounts.current.get(batchId) ?? 0;
    const devoured = devouredPerBatch.current.get(batchId);
    if (!devoured || devoured.size < totalWords) return;
    finalizingBatches.current.add(batchId);
    try {
      const result = await offerBatch(batchId);
      if (!result) return;
      logEvent({ type: 'pit_offer', data: { amber: result.amberAwarded, words: result.wordsOffered } });
      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      if (mountedRef.current) {
        // Settle on the real credited balance. The per-word optimistic bumps
        // for this batch summed to exactly its amberValue, so this lands
        // where the display already is (no jump). It also rolls back bumps
        // for any OTHER partially-devoured batch — consistent, because those
        // chips respawn when the flying words rebuild from the fresh harvest
        // state below (devour tracking resets with them).
        setDisplayBalance(newBalance);
        onAmberChange?.(newBalance);
        spawnAmberRise(result.amberAwarded);
        hapticMedium();
        showResultToast(getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded));
        // Refresh harvest state so pending amber/count updates in UI
        // Spread to create new reference — harvestCache is mutated in-place by offerBatch,
        // so getHarvestState returns the same object; React skips re-render without a new ref.
        const freshState = await getHarvestState();
        if (mountedRef.current) {
          setHarvestState({ ...freshState, pendingBatches: [...freshState.pendingBatches] });
          // Reset offset since pendingAmber useMemo recomputes from fresh state
          setPendingAmberOffset(0);
          // Trigger phase transition ceremony if pending
          if (pendingPhaseTransition != null && ceremonyStatus === 'idle') {
            // Small delay so the batch completion message shows first
            setTimeout(() => { if (mountedRef.current) startCeremony(); }, 600);
          }
        }
      }
    } catch { /* batch may already be offered */ }
  }, [phase, onAmberChange, spawnAmberRise, showResultToast, pendingPhaseTransition, ceremonyStatus, startCeremony]);

  // ---- Handle word devoured ----
  const handleWordDevoured = useCallback((fw: FlyingWord) => {
    if (!mountedRef.current) return;
    // A successful devour resets the onboarding stalled-pending rescue clock,
    // so an actively-tapping player is never preempted by the auto-offer.
    stallRescueRef.current?.arm();
    flashPitSurge();
    spawnImpactBurst();
    spawnShockwave();
    if (!devouredPerBatch.current.has(fw.batchId)) {
      devouredPerBatch.current.set(fw.batchId, new Set());
    }
    devouredPerBatch.current.get(fw.batchId)!.add(fw.id);
    setFlyingWords(prev => prev.filter(w => w.id !== fw.id));

    // Per-word display accounting: pending amber goes DOWN and the displayed
    // total goes UP by the same amount as each word is devoured. The real
    // credit lands when the whole batch finalizes (offerBatch is atomic per
    // batch), so the total is bumped optimistically here; increments
    // partition the batch's amberValue exactly, so the display lands on the
    // settled balance at finalize with no jump and can never overshoot it.
    // Skipped during the Offer All cascade — a tap-devour that completes
    // mid-cascade is already accounted for by the cascade's own increments
    // (offerAllBatches swept its batch, so its value is in amberAwarded).
    const currentState = harvestStateRef.current;
    if (currentState && !isOfferingRef.current) {
      const batch = currentState.pendingBatches.find(b => b.id === fw.batchId);
      if (batch) {
        const devouredCount = devouredPerBatch.current.get(fw.batchId)?.size ?? 0;
        const increment = computeDevourAmberIncrement(batch.amberValue, batch.words.length, devouredCount);
        if (increment > 0) {
          setPendingAmberOffset(prev => prev + increment);
          setDisplayBalance(prev => prev + increment);
        }
      }
    }

    tryFinalizeBatch(fw.batchId);
  }, [flashPitSurge, spawnImpactBurst, spawnShockwave, tryFinalizeBatch]);

  // ---- Compute approximate current position from progress + phase offset ----
  const getCurrentPos = useCallback((fw: FlyingWord): { x: number; y: number } => {
    const TWO_PI = 2 * Math.PI;
    const driftT = (fw.driftProgress as any).__getValue?.() ?? 0;
    const bobT = (fw.bobProgress as any).__getValue?.() ?? 0;
    return {
      x: fw.baseX + fw.driftAmplitude * Math.sin(TWO_PI * (driftT + fw.driftPhaseOffset)),
      y: fw.baseY + -fw.bobAmplitude * Math.sin(TWO_PI * (bobT + fw.bobPhaseOffset)),
    };
  }, []);

  // ---- Devour a single word (true spiral path) ----
  const devourWord = useCallback((fw: FlyingWord) => {
    if (fw.isDevoured || isOffering) return;
    fw.isDevoured = true;
    hapticLight();

    // Snapshot current visual position before stopping loops
    const currentPos = getCurrentPos(fw);

    // Stop float loops
    fw.floatLoopX?.stop(); fw.floatLoopX = null;
    fw.floatLoopY?.stop(); fw.floatLoopY = null;

    spawnTrail(currentPos.x, currentPos.y);

    if (reducedMotion) {
      fw.opacity.setValue(0);
      fw.scale.setValue(0);
      handleWordDevoured(fw);
      return;
    }

    const duration = getDevourDuration(phase);

    // Compute parametric spiral path from current position to pit center
    const spiral = computeSpiralPath(
      currentPos.x, currentPos.y,
      PIT_CENTER.x, PIT_CENTER.y,
      SPIRAL_ROTATIONS, SPIRAL_STEPS,
    );

    // Store spiral keyframes on the FlyingWord for render interpolation
    fw.spiralInput = spiral.input;
    fw.spiralRangeX = spiral.outputX;
    fw.spiralRangeY = spiral.outputY;
    fw.devourProgress.setValue(0);
    fw.useDevourPos = true;

    // Create new object reference so React.memo re-renders this chip
    setFlyingWords(prev => prev.map(w => w.id === fw.id ? { ...fw } : w));

    // Pit "inhale" — surge as the pit pulls the word in
    triggerInhale();

    // Phase 1: brief pop-up (100ms), then Phase 2: spiral into pit
    Animated.sequence([
      Animated.spring(fw.scale, { toValue: 1.2, friction: 6, tension: 300, useNativeDriver: true }),
      Animated.parallel([
        // True spiral via devourProgress driving interpolated X/Y
        Animated.timing(fw.devourProgress, {
          toValue: 1,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Scale shrinks as word spirals inward
        Animated.timing(fw.scale, {
          toValue: 0.05,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Single rotation (spiral path provides visual rotation itself)
        Animated.timing(fw.rotation, {
          toValue: 1,
          duration,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // Fade out near the end
        Animated.sequence([
          Animated.delay(duration * 0.65),
          Animated.timing(fw.opacity, {
            toValue: 0,
            duration: duration * 0.35,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => handleWordDevoured(fw));
  }, [phase, isOffering, reducedMotion, spawnTrail, handleWordDevoured, getCurrentPos, triggerInhale]);

  // Keep devourWordRef in sync
  useEffect(() => { devourWordRef.current = devourWord; }, [devourWord]);

  // ---- Harvest All (with spiral paths) ----
  const handleHarvestAll = useCallback(async () => {
    if (isOffering || !harvestState || harvestState.pendingBatches.length === 0) return;
    isOfferingRef.current = true;
    setIsOffering(true);
    hapticHeavy();

    const totalAmber = harvestState.pendingBatches.reduce((s, b) => s + b.amberValue, 0);
    const totalWordCount = harvestState.pendingBatches.reduce((s, b) => s + b.words.length, 0);

    // Pre-offer REAL balance — the cascade counts the display up from here to
    // the final credited balance, never beyond it.
    const baseBalance = amberBalanceRef.current;

    // Offer all batches atomically first
    const result = await offerAllBatches();
    logEvent({ type: 'pit_offer', data: { amber: result.amberAwarded, words: result.wordsOffered } });
    let finalBalance = baseBalance;
    if (result.amberAwarded > 0) {
      finalBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      if (mountedRef.current) onAmberChange?.(finalBalance);
    }

    // Reset display accounting for the cascade: pending counts down from the
    // full pending value while the total counts up from the pre-offer balance
    // (this also rolls back optimistic tap bumps for any partially-devoured
    // batch — its value is included in amberAwarded and will be re-counted).
    setPendingAmberOffset(0);
    setDisplayBalance(baseBalance);

    const words = flyingWordsRef.current.filter(w => !w.isDevoured);
    if (words.length === 0) {
      if (mountedRef.current) {
        setDisplayBalance(finalBalance);
        spawnAmberRise(result.amberAwarded);
        showResultToast(getPitOfferResultMessage(phase, totalWordCount, result.amberAwarded));
        const freshState = await getHarvestState();
        setHarvestState({ ...freshState, pendingBatches: [...freshState.pendingBatches] });
        setOverflowCount(0);
        isOfferingRef.current = false;
        setIsOffering(false);
        // Trigger ceremony if pending
        if (pendingPhaseTransition != null && ceremonyStatus === 'idle') {
          setTimeout(() => { if (mountedRef.current) startCeremony(); }, 600);
        }
      }
      return;
    }

    // Animate balance incrementally as words fly in
    const staggerDelay = Math.min(70, 1800 / words.length);

    words.forEach((fw, i) => {
      fw.isDevoured = true;
      setTimeout(() => {
        if (!mountedRef.current) return;

        // Snapshot current position before stopping loops
        const currentPos = getCurrentPos(fw);
        fw.floatLoopX?.stop(); fw.floatLoopX = null;
        fw.floatLoopY?.stop(); fw.floatLoopY = null;

        if (i % 3 === 0) spawnTrail(currentPos.x, currentPos.y);
        const duration = getDevourDuration(phase);

        // Count the displayed total up and the visual pending amber down as
        // each word flies in. Increments partition amberAwarded exactly
        // across the cascade (computeDevourAmberIncrement), and the clamp
        // pins the running total at the true post-offer balance — it can
        // never overshoot and then "snap down".
        const increment = computeDevourAmberIncrement(result.amberAwarded, words.length, i + 1);
        if (increment > 0) {
          setDisplayBalance(prev => Math.min(prev + increment, finalBalance));
          setPendingAmberOffset(prev => prev + increment);
        }

        if (reducedMotion) {
          fw.opacity.setValue(0); fw.scale.setValue(0); flashPitSurge(); return;
        }

        // Compute spiral path for this word (slight randomization)
        const spiralRots = SPIRAL_ROTATIONS + (Math.random() - 0.5) * 0.8;
        const spiral = computeSpiralPath(
          currentPos.x, currentPos.y,
          PIT_CENTER.x + (Math.random() - 0.5) * 20,
          PIT_CENTER.y + (Math.random() - 0.5) * 15,
          spiralRots, SPIRAL_STEPS,
        );

        fw.spiralInput = spiral.input;
        fw.spiralRangeX = spiral.outputX;
        fw.spiralRangeY = spiral.outputY;
        fw.devourProgress.setValue(0);
        fw.useDevourPos = true;

        // Create new object reference so React.memo re-renders this chip
        setFlyingWords(prev => prev.map(w => w.id === fw.id ? { ...fw } : w));

        Animated.parallel([
          Animated.timing(fw.devourProgress, {
            toValue: 1,
            duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(fw.scale, { toValue: 0.05, duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(fw.rotation, { toValue: 0.8 + Math.random() * 0.5, duration, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(duration * 0.6),
            Animated.timing(fw.opacity, { toValue: 0, duration: duration * 0.4, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (mountedRef.current) {
            flashPitSurge();
            if (i % 4 === 0) { spawnImpactBurst(); spawnShockwave(); }
          }
        });
      }, i * staggerDelay);
    });

    const cascadeDuration = words.length * staggerDelay + getDevourDuration(phase) + 300;
    setTimeout(async () => {
      if (!mountedRef.current) return;
      const freshState = await getHarvestState();
      if (mountedRef.current) {
        // Settle exactly on the credited balance (the increments already sum
        // to it; this also corrects any drift from a concurrent credit).
        setDisplayBalance(finalBalance);
        spawnAmberRise(result.amberAwarded);
        showResultToast(getPitOfferResultMessage(phase, totalWordCount, result.amberAwarded));
        setHarvestState({ ...freshState, pendingBatches: [...freshState.pendingBatches] });
        setFlyingWords([]);
        setOverflowCount(0);
        setPendingAmberOffset(0);
        isOfferingRef.current = false;
        setIsOffering(false);
        // Trigger ceremony if pending
        if (pendingPhaseTransition != null && ceremonyStatus === 'idle') {
          setTimeout(() => { if (mountedRef.current) startCeremony(); }, 600);
        }
      }
    }, cascadeDuration);
  }, [isOffering, harvestState, phase, amberBalance, reducedMotion, onAmberChange, getCurrentPos, spawnTrail, spawnAmberRise, spawnImpactBurst, spawnShockwave, flashPitSurge, showResultToast, pendingPhaseTransition, ceremonyStatus, startCeremony]);

  // ---- Onboarding: advance when the PLAYER has offered every word ----
  // The pit_offering step is completed by the player's own taps (each word
  // devoured → batch finalized → pendingBatches drains to 0) — the manual
  // flow is primary and there is no early auto-offer; the FoxGuide instructs
  // "tap each glowing word" and the pit waits for the player to do that.
  // Two safety nets guarantee the step can never soft-lock:
  //  - 'arm_fallback': reached the step with nothing offerable (missing/empty
  //    batch, or a relaunch after the words were already offered) — no devour
  //    interaction exists, so completion fires after a short delay. If
  //    batches load late, this effect re-runs, tracks pending, and the timer
  //    is cleared before it fires.
  //  - 'track_pending' stall rescue: words ARE pending but nothing has been
  //    devoured for a generous window (taps not registering, player stuck on
  //    some-but-not-all chips) — auto-offer the REMAINING batches via the
  //    existing handleHarvestAll path and complete the step. Every successful
  //    devour re-arms the clock (handleWordDevoured → stallRescueRef), so an
  //    actively-tapping player is never preempted. Completion upstream
  //    (handlePitOnboardingOfferComplete) is idempotent, so the 'complete'
  //    branch firing again once pending drains is harmless.
  // (This effect lives below handleHarvestAll because it calls it directly.)
  const onboardingHadPending = useRef(false);
  useEffect(() => {
    const action = getPitOnboardingOfferAction(
      onboardingStep,
      onboardingHadPending.current,
      harvestState ? harvestState.pendingBatches.length : null,
    );
    switch (action) {
      case 'reset':
        onboardingHadPending.current = false;
        return;
      case 'track_pending': {
        onboardingHadPending.current = true;
        const rescue = createPitOnboardingStallRescue(() => {
          // Offer whatever the player hasn't devoured (credits amber
          // atomically up front), then advance the step even if the offer
          // path failed — a stuck player must always get unstuck.
          handleHarvestAll().finally(() => onOnboardingOfferComplete?.());
        });
        stallRescueRef.current = rescue;
        rescue.arm();
        return () => {
          rescue.cancel();
          if (stallRescueRef.current === rescue) stallRescueRef.current = null;
        };
      }
      case 'complete':
        // Last pending batch devoured by the player's taps
        onOnboardingOfferComplete?.();
        return;
      case 'arm_fallback': {
        const fallback = setTimeout(() => onOnboardingOfferComplete?.(), 4000);
        return () => clearTimeout(fallback);
      }
      default:
        return;
    }
  }, [onboardingStep, harvestState, onOnboardingOfferComplete, handleHarvestAll]);

  // ---- Summary stats ----
  const pendingAmber = useMemo(() => {
    if (!harvestState) return 0;
    return harvestState.pendingBatches.reduce((s, b) => s + b.amberValue, 0);
  }, [harvestState]);

  const pendingWordCount = useMemo(() => {
    if (!harvestState) return 0;
    return harvestState.pendingBatches.reduce((s, b) => s + b.words.length, 0);
  }, [harvestState]);

  const phaseColors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
  const glowColor = phaseColors.glow;
  const coreColor = phaseColors.core;

  if (!harvestState) return null;

  return (
    <View style={[styles.container, { backgroundColor: PIT_BG_COLORS[phase] ?? PIT_BG_COLORS[0] }]}>
      <Image source={getPitBackground(phase)} style={styles.backgroundImage} resizeMode="cover" />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Layered breathing glow — outer halo (faintest, largest) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_OUTER_SIZE / 2,
          top: PIT_CENTER.y - GLOW_OUTER_SIZE / 2,
          width: GLOW_OUTER_SIZE,
          height: GLOW_OUTER_SIZE,
          borderRadius: GLOW_OUTER_SIZE / 2,
          backgroundColor: glowColor,
          opacity: breathOpacityOuter,
          transform: [{ scaleX: GLOW_OUTER_SCALE_X }, { scale: breathScale }],
        }}
      />
      {/* Middle glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_MIDDLE_SIZE / 2,
          top: PIT_CENTER.y - GLOW_MIDDLE_SIZE / 2,
          width: GLOW_MIDDLE_SIZE,
          height: GLOW_MIDDLE_SIZE,
          borderRadius: GLOW_MIDDLE_SIZE / 2,
          backgroundColor: glowColor,
          opacity: breathOpacityMiddle,
          transform: [{ scaleX: GLOW_MIDDLE_SCALE_X }, { scale: breathScale }],
        }}
      />
      {/* Inner glow — brightest, smallest */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_INNER_SIZE / 2,
          top: PIT_CENTER.y - GLOW_INNER_SIZE / 2,
          width: GLOW_INNER_SIZE,
          height: GLOW_INNER_SIZE,
          borderRadius: GLOW_INNER_SIZE / 2,
          backgroundColor: glowColor,
          opacity: breathOpacityInner,
          transform: [{ scaleX: GLOW_INNER_SCALE_X }, { scale: breathScale }],
        }}
      />
      {/* Dark pit core — creates depth illusion */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_CORE_SIZE / 2,
          top: PIT_CENTER.y - GLOW_CORE_SIZE / 2,
          width: GLOW_CORE_SIZE,
          height: GLOW_CORE_SIZE,
          borderRadius: GLOW_CORE_SIZE / 2,
          backgroundColor: coreColor,
          opacity: breathOpacityCore,
          transform: [{ scaleX: GLOW_CORE_SCALE_X }, { scale: breathScale }],
        }}
      />
      {/* Pit rim ring — subtle edge definition (circle + scaleX for true ellipse) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_RIM_SIZE_Y / 2,
          top: PIT_CENTER.y - GLOW_RIM_SIZE_Y / 2,
          width: GLOW_RIM_SIZE_Y,
          height: GLOW_RIM_SIZE_Y,
          borderRadius: GLOW_RIM_SIZE_Y / 2,
          borderWidth: 1,
          borderColor: glowColor + '25',
          transform: [{ scaleX: GLOW_RIM_SCALE_X }],
        }}
      />

      {/* Pit surge glow layers — flash on devour impact / inhale */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_OUTER_SIZE / 2,
          top: PIT_CENTER.y - GLOW_OUTER_SIZE / 2,
          width: GLOW_OUTER_SIZE,
          height: GLOW_OUTER_SIZE,
          borderRadius: GLOW_OUTER_SIZE / 2,
          backgroundColor: glowColor,
          opacity: pitSurgeOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5],
          }),
          transform: [{ scaleX: GLOW_OUTER_SCALE_X }, { scale: pitSurgeScale }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: PIT_CENTER.x - GLOW_INNER_SIZE / 2,
          top: PIT_CENTER.y - GLOW_INNER_SIZE / 2,
          width: GLOW_INNER_SIZE,
          height: GLOW_INNER_SIZE,
          borderRadius: GLOW_INNER_SIZE / 2,
          backgroundColor: glowColor,
          opacity: pitSurgeOpacity,
          transform: [{ scaleX: GLOW_INNER_SCALE_X }, { scale: pitSurgeScale }],
        }}
      />

      {/* Ambient rim particles — embers rising from pit edge */}
      {rimParticles.map(p => <RimParticleView key={p.id} p={p} />)}

      {/* Shockwave rings — expanding ripple on word impact */}
      {shockwaveRings.map(ring => <ShockwaveRingView key={ring.id} ring={ring} />)}

      {/* Ward marks — phase progression indicators around the pit rim */}
      {phase < 4 && (litCount > 0 || pendingPhaseTransition != null) && (
        <>
          {wardPositions.map((pos, idx) => {
            const isLit = idx < litCount;
            const isPending = pendingPhaseTransition != null && ceremonyStatus === 'idle';
            const isIgnited = ceremonyStatus === 'igniting' && idx <= ceremonyIgniteStep;
            const flashAnim = wardFlashAnims[idx];

            const baseColor = isIgnited
              ? wardColors.pendingPulse
              : isLit
                ? (isPending ? wardColors.pendingPulse : wardColors.lit)
                : wardColors.unlit;

            const flashScale = flashAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 2.5],
            });

            return (
              <Animated.View
                key={`ward-${idx}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: pos.x - 6,
                  top: pos.y - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: baseColor,
                  opacity: isPending ? wardPulseOpacity : (isLit ? 0.9 : 1),
                  transform: [
                    { scale: isPending ? wardPulseScale : (isIgnited ? flashScale : 1) },
                  ],
                  ...(isLit && !simplify ? {
                    shadowColor: wardColors.glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                  } : {}),
                }}
              />
            );
          })}
          {/* Tap target for ward ring when transition is pending */}
          {pendingPhaseTransition != null && ceremonyStatus === 'idle' && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                left: PIT_CENTER.x - PIT_OVAL.radiusX * 1.3,
                top: PIT_CENTER.y - PIT_OVAL.radiusY * 3,
                width: PIT_OVAL.radiusX * 2.6,
                height: PIT_OVAL.radiusY * 4,
              }}
              onPress={() => {
                hapticMedium();
                startCeremony();
              }}
              accessibilityLabel="Activate the ward marks"
              accessibilityRole="button"
            />
          )}
        </>
      )}

      {/* Ward hint / ready text — shown above the pit */}
      {wardHintText && ceremonyStatus === 'idle' && (
        <View style={styles.wardHintContainer} pointerEvents="none">
          <Text style={[styles.wardHintText, {
            color: pendingPhaseTransition != null ? wardColors.pendingPulse : wardColors.lit,
            fontSize: pendingPhaseTransition != null ? 18 : 15,
          }]}>
            {wardHintText}
          </Text>
        </View>
      )}

      {/* Ceremony overlay — text during phase transition */}
      {(ceremonyStatus === 'text' || ceremonyStatus === 'erupting') && (
        <Animated.View
          style={[styles.ceremonyOverlay, { opacity: ceremonyOverlayOpacity }]}
          pointerEvents="none"
        >
          {ceremonyStatus === 'text' && ceremonyTextIndex >= 0 && (
            <Animated.Text style={[styles.ceremonyText, {
              color: wardColors.pendingPulse,
              opacity: ceremonyTextOpacity,
            }]}>
              {(getPitTransitionCeremonyText(pendingPhaseTransition ?? 1 as DialoguePhase))[ceremonyTextIndex] ?? ''}
            </Animated.Text>
          )}
        </Animated.View>
      )}

      {/* Particle layers */}
      {trailParticles.map(p => <TrailParticleView key={p.id} p={p} />)}
      {impactParticles.map(p => <ImpactParticleView key={p.id} p={p} />)}
      {amberParticles.map(p => <AmberParticleView key={p.id} p={p} />)}

      {/* Floating word chips — taps disabled during onboarding except during pit_offering step */}
      {flyingWords.map(fw => (
        <FloatingWordChip key={fw.id} fw={fw} onTap={isPitWordTapEnabled(isOnboarding, onboardingStep) ? stableDevourWord : noopDevour} />
      ))}

      {/* Header — matches HomeScreen frosted glass style; safe-area aware */}
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.amberContainer} accessibilityLabel={`${Math.max(0, displayBalance)} amber`}>
            <View style={styles.amberInner}>
              <Text style={styles.amberEmoji}>{'\uD83D\uDC8E'}</Text>
              <Text style={styles.amberCount}>{Math.max(0, displayBalance)}</Text>
            </View>
          </View>
          {pendingAmber - pendingAmberOffset > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>+{pendingAmber - pendingAmberOffset}</Text>
            </View>
          )}
        </View>
        {!isOnboarding && (
          <View style={styles.headerRight}>
            {tendingEnabled && !isOnboarding && (
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => { hapticLight(); refreshTending(); setShowTendingModal(true); }}
                accessibilityLabel={`Tend the pattern, ${getTendingLevelLabel(tendingLevel)}`}
                accessibilityRole="button"
              >
                <Text style={styles.headerIconText}>{'✴'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => { hapticLight(); setShowUtilityModal(true); }}
              accessibilityLabel="Open utility menu"
              accessibilityRole="button"
            >
              <Text style={styles.headerIconText}>☰</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => { hapticLight(); onClose(); }}
              accessibilityLabel="Return home"
              accessibilityRole="button"
            >
              <Text style={styles.headerIconText}>{'\uD83C\uDFE0'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={showUtilityModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowUtilityModal(false)}
      >
        <TouchableOpacity
          style={styles.utilityOverlay}
          activeOpacity={1}
          onPress={() => setShowUtilityModal(false)}
          accessibilityLabel="Close utility menu"
          accessibilityRole="button"
        >
          <View style={styles.utilityModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.utilityTitle}>Menu</Text>
            {onOpenStats && (
              <TouchableOpacity
                style={styles.utilityButton}
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenStats?.();
                }}
                accessibilityLabel="View stats"
                accessibilityRole="button"
              >
                <Text style={styles.utilityButtonText}>📊 Statistics</Text>
              </TouchableOpacity>
            )}
            {onOpenSettings && (
              <TouchableOpacity
                style={styles.utilityButton}
                onPress={() => {
                  setShowUtilityModal(false);
                  onOpenSettings?.();
                }}
                accessibilityLabel="Open settings"
                accessibilityRole="button"
              >
                <Text style={styles.utilityButtonText}>⚙️ Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tending Shrine modal — Phase 5 cosmetic amber sink */}
      <Modal
        visible={showTendingModal}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setShowTendingModal(false)}
      >
        <TouchableOpacity
          style={styles.utilityOverlay}
          activeOpacity={1}
          onPress={() => setShowTendingModal(false)}
          accessibilityLabel="Close tending"
          accessibilityRole="button"
        >
          <View style={styles.tendingModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.tendingTitle}>{getTendingTitle()}</Text>
            <Text style={styles.tendingDepth}>{getTendingLevelLabel(tendingLevel)}</Text>
            <Text style={styles.tendingSubtitle}>{getTendingSubtitle(tendingLevel)}</Text>

            {tendingNext && (
              <>
                <View style={styles.tendingCostRow}>
                  <Text style={styles.tendingCostText}>
                    {'💎'} {tendingNext.cost}
                  </Text>
                  {tendingNext.dailyBonusApplied && (
                    <Text style={styles.tendingCostStrike}>{tendingNext.baseCost}</Text>
                  )}
                </View>
                {tendingNext.dailyBonusApplied && (
                  <Text style={styles.tendingBonusHint}>{getTendingDailyBonusHint()}</Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.tendingButton,
                    (tendingBusy || displayBalance < tendingNext.cost) && styles.tendingButtonDisabled,
                  ]}
                  disabled={tendingBusy || displayBalance < tendingNext.cost}
                  onPress={handleDeepenPattern}
                  accessibilityLabel={`${getTendingButtonLabel()} for ${tendingNext.cost} amber`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: tendingBusy || displayBalance < tendingNext.cost }}
                >
                  <Text style={styles.tendingButtonText}>{getTendingButtonLabel()}</Text>
                </TouchableOpacity>
                {displayBalance < tendingNext.cost && (
                  <Text style={styles.tendingInsufficient}>
                    Earn more amber to deepen the pattern further.
                  </Text>
                )}
                <RewardedAdButton
                  placement="quest_bonus"
                  phase={phase}
                  label={`Offer your attention  ·  +${REWARDED_TEND_BONUS} amber`}
                  onReward={async () => {
                    const newBalance = await awardBonusAmber(REWARDED_TEND_BONUS, 'rewarded_tend');
                    setDisplayBalance(newBalance);
                    onAmberChange?.(newBalance);
                    hapticMedium();
                  }}
                />
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Empty state */}
      {pendingWordCount === 0 && !resultMessage && (() => {
        const bt = getOverlayBannerTheme(phase);
        return (
          <View style={[styles.emptyContainer, {
            backgroundColor: bt.containerBg,
            borderColor: bt.borderColor,
          }]}>
            <Text style={[styles.emptyText, {
              color: bt.textColor,
              textShadowColor: bt.textShadowColor,
            }]}>
              {getPitEmptyMessage(phase)}
            </Text>
          </View>
        );
      })()}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <View style={styles.overflowContainer}>
          <Text style={[styles.overflowText, { color: getOverlayBannerTheme(phase).secondaryTextColor }]}>
            {getPitOverflowText(phase as DialoguePhase, overflowCount)}
          </Text>
        </View>
      )}

      {/* Result toast — hidden during onboarding to avoid overlapping FoxGuide */}
      {resultMessage && !isOnboarding && (
        <Animated.View
          style={[styles.resultToast, {
            backgroundColor: phase >= 3 ? 'rgba(139, 26, 58, 0.9)' : 'rgba(100, 60, 180, 0.9)',
            opacity: resultOpacity,
          }]}
          pointerEvents="none"
        >
          <Text style={styles.resultToastText}>{resultMessage}</Text>
        </Animated.View>
      )}

      {/* Bottom panel — hidden during onboarding (FoxGuide occupies this space) */}
      {!isOnboarding && (
        <View style={[styles.bottomPanel, { paddingBottom: Math.max(Platform.OS === 'ios' ? 34 : 16, screenInsets.bottom) }]}>
          {(() => {
            const bt = getOverlayBannerTheme(phase);
            return (
              <View style={[styles.summaryRow, {
                backgroundColor: phase >= 3 ? 'rgba(8, 4, 16, 0.82)' : 'rgba(20, 12, 45, 0.72)',
                borderColor: bt.borderColor,
              }]}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: bt.textColor, textShadowColor: bt.textShadowColor }]}>
                    {'\uD83D\uDC8E'} {Math.max(0, pendingAmber - pendingAmberOffset)}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: bt.secondaryTextColor }]}>
                    {getPitPendingAmberLabel(phase)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: bt.textColor, textShadowColor: bt.textShadowColor }]}>{harvestState.totalWordsOffered}</Text>
                  <Text style={[styles.summaryLabel, { color: bt.secondaryTextColor }]}>
                    Lifetime {getPitHarvestLabel(phase)}
                  </Text>
                </View>
              </View>
            );
          })()}

          {pendingWordCount > 0 && pendingAmber - pendingAmberOffset > 0 && (
            <TouchableOpacity
              style={[styles.harvestAllButton, {
                backgroundColor: phase >= 3 ? '#8B1A3A' : CandyColors.pink.main,
                opacity: isOffering ? 0.5 : 1,
              }]}
              onPress={handleHarvestAll}
              disabled={isOffering}
              accessibilityLabel={`${getPitOfferAllLabel(phase)}: ${Math.max(0, pendingAmber - pendingAmberOffset)} amber from ${pendingWordCount} words`}
              accessibilityRole="button"
            >
              <Text style={styles.harvestAllText}>
                {getPitOfferAllLabel(phase)} ({'\uD83D\uDC8E'} {Math.max(0, pendingAmber - pendingAmberOffset)})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  // ---- Home-screen style header ----
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  amberContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  amberInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amberEmoji: { fontSize: 20 },
  amberCount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 165, 0, 0.20)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFBF00',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: { fontSize: 16 },
  utilityOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8, 8, 18, 0.45)',
  },
  utilityModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    backgroundColor: 'rgba(20, 16, 36, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  utilityTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: CandyColors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  utilityButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  utilityButtonText: {
    color: CandyColors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  // ---- Tending Shrine modal ----
  tendingModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    backgroundColor: 'rgba(18, 14, 32, 0.99)',
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 220, 0.3)',
  },
  tendingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: CandyColors.white,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tendingDepth: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(206, 184, 232, 0.95)',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1.5,
  },
  tendingSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(225, 215, 240, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 20,
  },
  tendingCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  tendingCostText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFD479',
  },
  tendingCostStrike: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(225, 215, 240, 0.5)',
    textDecorationLine: 'line-through',
  },
  tendingBonusHint: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(180, 210, 170, 0.9)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  tendingButton: {
    marginTop: 18,
    backgroundColor: 'rgba(120, 80, 180, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 170, 240, 0.45)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  tendingButtonDisabled: {
    opacity: 0.45,
  },
  tendingButtonText: {
    color: CandyColors.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tendingInsufficient: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(225, 215, 240, 0.6)',
    textAlign: 'center',
    marginTop: 12,
  },
  // ---- Pit glow (old single-oval style removed — now uses inline multi-layered glow) ----
  // ---- Content overlays ----
  emptyContainer: {
    position: 'absolute',
    top: FLOAT_ZONE.top + 40,
    left: 24, right: 24,
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  emptyText: {
    fontSize: 17, fontWeight: '600',
    textAlign: 'center', lineHeight: 26,
    letterSpacing: 0.3,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  overflowContainer: {
    position: 'absolute',
    top: FLOAT_ZONE.bottom + 4,
    left: 0, right: 0,
    alignItems: 'center',
  },
  overflowText: {
    fontSize: 12, fontWeight: '700', fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  resultToast: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.60,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  resultToastText: {
    color: '#FFFFFF',
    fontSize: 14, fontWeight: '700', textAlign: 'center',
  },
  // ---- Bottom panel ----
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    // paddingBottom applied inline via useScreenInsets (home-indicator aware)
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: {
    fontSize: 18, fontWeight: '900',
    letterSpacing: 0.3,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  summaryLabel: {
    fontSize: 10.5, fontWeight: '700', marginTop: 2, textAlign: 'center',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  summaryDivider: { width: 1, height: 28, borderRadius: 1 },
  harvestAllButton: {
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignSelf: 'center',
    shadowColor: CandyColors.pink.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  harvestAllText: {
    color: '#FFFFFF',
    fontSize: 16, fontWeight: '900', letterSpacing: 1, textAlign: 'center',
  },
  // ---- Ward mark & ceremony ----
  wardHintContainer: {
    position: 'absolute',
    top: PIT_CENTER.y - PIT_OVAL.radiusY * 4.5,
    left: 24, right: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  wardHintText: {
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  ceremonyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ceremonyText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 30,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
