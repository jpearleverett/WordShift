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
} from 'react-native';
import { CandyColors, getPhaseTheme, getTileColor } from '../theme/colors';
import { DialoguePhase } from '../types/homeWorld';
import {
  getPitScreenTitle,
  getPitScreenSubtitle,
  getPitOfferAllLabel,
  getPitEmptyMessage,
  getPitOfferResultMessage,
  getPitHarvestLabel,
  getPitPendingAmberLabel,
  getPitOverflowText,
} from '../services/phaseNarrative';
import {
  getHarvestState,
  offerBatch,
  offerAllBatches,
  HarvestState,
} from '../services/wordHarvest';
import { awardBonusAmber } from '../services/amberCurrency';
import { getSettingsSync } from '../services/settings';
import { hapticLight, hapticMedium, hapticSuccess } from '../services/haptics';
import { getDeviceTier, shouldSimplifyAnimations } from '../services/deviceTier';

// ---------------------------------------------------------------------------
// Assets & Constants
// ---------------------------------------------------------------------------

const PIT_DAY = require('../../assets/environment/pitt_day.png');
const PIT_DUSK = require('../../assets/environment/pitt_dusk.png');
const PIT_NIGHT = require('../../assets/environment/pitt_night.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PIT_BG_COLORS: Record<number, string> = {
  0: '#6fb7df',
  1: '#6fb7df',
  2: '#514378',
  3: '#060612',
  4: '#1a122a',
};

function getPitBackground(phase: number) {
  if (phase >= 3) return PIT_NIGHT;
  if (phase >= 2) return PIT_DUSK;
  return PIT_DAY;
}

// Pit center in background images (calibrated to asset)
const PIT_CENTER = {
  x: SCREEN_WIDTH * 0.5,
  y: SCREEN_HEIGHT * 0.62,
};

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50;

// Zone where words float (above the pit)
const FLOAT_ZONE = {
  top: STATUS_BAR_HEIGHT + 90,
  bottom: SCREEN_HEIGHT * 0.50,
  left: 16,
  right: SCREEN_WIDTH - 16,
};

function getMaxFloatingWords(): number {
  switch (getDeviceTier()) {
    case 'low': return 20;
    case 'medium': return 40;
    case 'high': return 60;
  }
}

function getMaxTrailParticles(): number {
  return shouldSimplifyAnimations() ? 2 : 5;
}

function getMaxAmberParticles(): number {
  return shouldSimplifyAnimations() ? 3 : 7;
}

// Phase-aware devour trail / glow colors
const DEVOUR_COLORS: Record<number, { trail: string; glow: string; glowOpacity: number }> = {
  0: { trail: '#FFD700', glow: '#FFD700', glowOpacity: 0.30 },
  1: { trail: '#F0C050', glow: '#F0C050', glowOpacity: 0.25 },
  2: { trail: '#B088D0', glow: '#9060C0', glowOpacity: 0.20 },
  3: { trail: '#5A2080', glow: '#3A1060', glowOpacity: 0.15 },
  4: { trail: '#C03050', glow: '#C03050', glowOpacity: 0.40 },
};

function getDevourDuration(phase: number): number {
  if (phase >= 3) return 500;
  if (phase >= 2) return 650;
  return 800;
}

// ---------------------------------------------------------------------------
// FlyingWord data type
// ---------------------------------------------------------------------------

interface FlyingWord {
  id: string;
  word: string;
  batchId: string;
  color: { bg: string; border: string; glow: string };
  translateX: Animated.Value;
  translateY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  baseX: number;
  baseY: number;
  driftAmplitude: number;
  driftPeriod: number;
  bobAmplitude: number;
  bobPeriod: number;
  isDevoured: boolean;
  floatLoop: Animated.CompositeAnimation | null;
}

// ---------------------------------------------------------------------------
// Ephemeral particle types
// ---------------------------------------------------------------------------

interface TrailParticle {
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

// ---------------------------------------------------------------------------
// FloatingWordChip — single candy-styled word drifting above the pit
// ---------------------------------------------------------------------------

const FloatingWordChip = React.memo(({
  fw,
  onTap,
  phase,
}: {
  fw: FlyingWord;
  onTap: (fw: FlyingWord) => void;
  phase: number;
}) => {
  const spin = fw.rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Phase-aware shadow
  const shadowColor = phase >= 3
    ? 'rgba(192, 48, 80, 0.6)'
    : phase >= 2
      ? 'rgba(90, 32, 128, 0.5)'
      : fw.color.glow;

  return (
    <Animated.View
      style={[
        chipStyles.wrapper,
        {
          transform: [
            { translateX: fw.translateX },
            { translateY: fw.translateY },
            { scale: fw.scale },
            { rotate: spin },
          ],
          opacity: fw.opacity,
        },
      ]}
      pointerEvents={fw.isDevoured ? 'none' : 'auto'}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onTap(fw)}
        accessibilityLabel={`Word: ${fw.word}, tap to offer`}
        accessibilityRole="button"
      >
        <View
          style={[
            chipStyles.chip,
            {
              backgroundColor: fw.color.bg,
              borderBottomColor: fw.color.border,
              shadowColor,
            },
          ]}
        >
          <Text style={chipStyles.chipText}>{fw.word}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const chipStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  chip: {
    paddingHorizontal: 11,
    paddingTop: 5,
    paddingBottom: 7,
    borderRadius: 14,
    borderBottomWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

// ---------------------------------------------------------------------------
// Trail particle renderer
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
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { scale: p.scale },
      ],
      opacity: p.opacity,
    }}
  />
));

// ---------------------------------------------------------------------------
// Amber rise particle renderer
// ---------------------------------------------------------------------------

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
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { scale: p.scale },
        { rotate: '45deg' },
      ],
      opacity: p.opacity,
    }}
  />
));

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface OfferingPitScreenProps {
  phase: DialoguePhase;
  amberBalance: number;
  onClose: () => void;
  onAmberChange?: (newBalance: number) => void;
}

export const OfferingPitScreen: React.FC<OfferingPitScreenProps> = ({
  phase,
  amberBalance,
  onClose,
  onAmberChange,
}) => {
  const phaseTheme = getPhaseTheme(phase);
  const reducedMotion = getSettingsSync()?.reducedMotion ?? false;
  const simplify = shouldSimplifyAnimations();

  // ---- State ----
  const [harvestState, setHarvestState] = useState<HarvestState | null>(null);
  const [flyingWords, setFlyingWords] = useState<FlyingWord[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [amberParticles, setAmberParticles] = useState<AmberParticle[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isOffering, setIsOffering] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(amberBalance);
  const [overflowCount, setOverflowCount] = useState(0);

  // ---- Refs ----
  const devouredPerBatch = useRef<Map<string, Set<string>>>(new Map());
  const batchWordCounts = useRef<Map<string, number>>(new Map());
  const finalizingBatches = useRef<Set<string>>(new Set());
  const pitGlowOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const flyingWordsRef = useRef<FlyingWord[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    flyingWordsRef.current = flyingWords;
  }, [flyingWords]);

  // Sync displayBalance when parent changes
  useEffect(() => {
    setDisplayBalance(amberBalance);
  }, [amberBalance]);

  // ---- Load harvest state ----
  const loadState = useCallback(async () => {
    const state = await getHarvestState();
    if (mountedRef.current) setHarvestState(state);
  }, []);

  useEffect(() => { loadState(); }, [loadState]);

  // ---- Build flying words when harvest state loads ----
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
        if (allWords.length >= maxWords) continue; // count but don't render
        const word = batch.words[i];
        const id = `${batch.id}_${i}`;
        const zoneWidth = FLOAT_ZONE.right - FLOAT_ZONE.left;
        const zoneHeight = FLOAT_ZONE.bottom - FLOAT_ZONE.top;
        const baseX = FLOAT_ZONE.left + Math.random() * zoneWidth;
        const baseY = FLOAT_ZONE.top + Math.random() * zoneHeight;

        allWords.push({
          id,
          word,
          batchId: batch.id,
          color: getTileColor(word.charAt(0)),
          translateX: new Animated.Value(baseX),
          translateY: new Animated.Value(baseY),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.3),
          rotation: new Animated.Value(0),
          baseX,
          baseY,
          driftAmplitude: 15 + Math.random() * 25,
          driftPeriod: 3000 + Math.random() * 3000,
          bobAmplitude: 8 + Math.random() * 7,
          bobPeriod: 2000 + Math.random() * 2000,
          isDevoured: false,
          floatLoop: null,
        });
      }
    }

    batchWordCounts.current = batchCounts;
    devouredPerBatch.current = new Map();
    finalizingBatches.current = new Set();
    setOverflowCount(Math.max(0, totalWords - maxWords));
    setFlyingWords(allWords);

    // Staggered pop-in
    allWords.forEach((fw, i) => {
      const delay = reducedMotion ? 0 : i * 40;
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (reducedMotion) {
          fw.opacity.setValue(1);
          fw.scale.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.spring(fw.scale, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.timing(fw.opacity, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (!mountedRef.current) return;
          startFloatLoop(fw);
        });
      }, delay);
    });

    return () => {
      // Cleanup all float loops
      allWords.forEach(fw => {
        if (fw.floatLoop) {
          fw.floatLoop.stop();
          fw.floatLoop = null;
        }
      });
    };
    // We only rebuild flying words when harvestState identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [harvestState]);

  // ---- Float loop for a single word ----
  const startFloatLoop = useCallback((fw: FlyingWord) => {
    if (reducedMotion || simplify || fw.isDevoured) return;

    const driftHalf = fw.driftPeriod / 2;
    const bobHalf = fw.bobPeriod / 2;

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(fw.translateX, {
            toValue: fw.baseX + fw.driftAmplitude,
            duration: driftHalf,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(fw.translateX, {
            toValue: fw.baseX - fw.driftAmplitude,
            duration: driftHalf,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(fw.translateY, {
            toValue: fw.baseY - fw.bobAmplitude,
            duration: bobHalf,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(fw.translateY, {
            toValue: fw.baseY + fw.bobAmplitude,
            duration: bobHalf,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    fw.floatLoop = loop;
    loop.start();
  }, [reducedMotion, simplify]);

  // ---- Pit glow flash ----
  const flashPitGlow = useCallback(() => {
    if (reducedMotion) return;
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    const dur = phase >= 3 ? 200 : phase >= 2 ? 250 : 300;
    Animated.sequence([
      Animated.timing(pitGlowOpacity, {
        toValue: colors.glowOpacity,
        duration: dur * 0.4,
        useNativeDriver: true,
      }),
      Animated.timing(pitGlowOpacity, {
        toValue: 0,
        duration: dur * 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [phase, pitGlowOpacity, reducedMotion]);

  // ---- Spawn trail particles ----
  const spawnTrail = useCallback((startX: number, startY: number) => {
    if (reducedMotion) return;
    const count = getMaxTrailParticles();
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    const duration = getDevourDuration(phase);
    const newParticles: TrailParticle[] = [];

    for (let i = 0; i < count; i++) {
      const p: TrailParticle = {
        id: `trail_${Date.now()}_${i}`,
        x: new Animated.Value(startX + (Math.random() - 0.5) * 20),
        y: new Animated.Value(startY + (Math.random() - 0.5) * 20),
        opacity: new Animated.Value(0.8),
        scale: new Animated.Value(0.6 + Math.random() * 0.6),
        color: colors.trail,
      };
      newParticles.push(p);

      const delay = i * 40;
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.x, {
            toValue: PIT_CENTER.x + (Math.random() - 0.5) * 30,
            duration: duration * 0.8,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: PIT_CENTER.y + (Math.random() - 0.5) * 20,
            duration: duration * 0.8,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.scale, {
            toValue: 0,
            duration: duration * 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: duration * 0.6,
            delay: duration * 0.3,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (mountedRef.current) {
            setTrailParticles(prev => prev.filter(tp => tp.id !== p.id));
          }
        });
      }, delay);
    }

    setTrailParticles(prev => [...prev, ...newParticles]);
  }, [phase, reducedMotion]);

  // ---- Spawn amber rise particles ----
  const spawnAmberRise = useCallback((amberAmount: number) => {
    if (reducedMotion) return;
    const count = getMaxAmberParticles();
    const newParticles: AmberParticle[] = [];

    for (let i = 0; i < count; i++) {
      const p: AmberParticle = {
        id: `amber_${Date.now()}_${i}`,
        x: new Animated.Value(PIT_CENTER.x - 6 + (Math.random() - 0.5) * 40),
        y: new Animated.Value(PIT_CENTER.y),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0.4),
      };
      newParticles.push(p);

      const delay = i * 80;
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.y, {
            toValue: PIT_CENTER.y - 200 - Math.random() * 100,
            duration: 1200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: PIT_CENTER.x - 6 + (Math.random() - 0.5) * 80,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.opacity, {
              toValue: 0.9,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.delay(500),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(p.scale, {
            toValue: 1.0 + Math.random() * 0.4,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (mountedRef.current) {
            setAmberParticles(prev => prev.filter(ap => ap.id !== p.id));
          }
        });
      }, delay);
    }

    setAmberParticles(prev => [...prev, ...newParticles]);
  }, [reducedMotion]);

  // ---- Show result toast ----
  const showResultToast = useCallback((message: string) => {
    setResultMessage(message);
    resultOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(resultOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (mountedRef.current) setResultMessage(null);
    });
  }, [resultOpacity]);

  // ---- Handle batch completion (all words devoured) ----
  const tryFinalizeBatch = useCallback(async (batchId: string) => {
    if (finalizingBatches.current.has(batchId)) return;
    const totalWords = batchWordCounts.current.get(batchId) ?? 0;
    const devoured = devouredPerBatch.current.get(batchId);
    if (!devoured || devoured.size < totalWords) return;

    finalizingBatches.current.add(batchId);

    try {
      const result = await offerBatch(batchId);
      if (!result) return;

      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      if (mountedRef.current) {
        setDisplayBalance(newBalance);
        onAmberChange?.(newBalance);
        spawnAmberRise(result.amberAwarded);
        hapticMedium();
        showResultToast(
          getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded)
        );
      }
    } catch {
      // Silently handle — batch may already have been offered
    }
  }, [phase, onAmberChange, spawnAmberRise, showResultToast]);

  // ---- Devour a single word (spiral animation) ----
  const devourWord = useCallback((fw: FlyingWord) => {
    if (fw.isDevoured || isOffering) return;
    fw.isDevoured = true;

    hapticLight();

    // Stop float loop
    if (fw.floatLoop) {
      fw.floatLoop.stop();
      fw.floatLoop = null;
    }

    // Spawn trail from approximate position
    spawnTrail(fw.baseX, fw.baseY);

    const duration = getDevourDuration(phase);

    if (reducedMotion) {
      // Instant
      fw.opacity.setValue(0);
      fw.scale.setValue(0);
      handleWordDevoured(fw);
      return;
    }

    Animated.parallel([
      // Curve toward pit X via bezier easing
      Animated.timing(fw.translateX, {
        toValue: PIT_CENTER.x,
        duration,
        easing: Easing.bezier(0.4, 0, 0.7, 0.2),
        useNativeDriver: true,
      }),
      // Accelerate into pit Y
      Animated.timing(fw.translateY, {
        toValue: PIT_CENTER.y,
        duration,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      // Shrink
      Animated.timing(fw.scale, {
        toValue: 0.1,
        duration,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      // Spin — 4 full rotations
      Animated.timing(fw.rotation, {
        toValue: 4,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      // Fade in final 30%
      Animated.sequence([
        Animated.delay(duration * 0.7),
        Animated.timing(fw.opacity, {
          toValue: 0,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      handleWordDevoured(fw);
    });
  }, [phase, isOffering, reducedMotion, spawnTrail, flashPitGlow]);

  // ---- After devour animation completes ----
  const handleWordDevoured = useCallback((fw: FlyingWord) => {
    if (!mountedRef.current) return;

    // Flash the pit
    flashPitGlow();

    // Track batch progress
    if (!devouredPerBatch.current.has(fw.batchId)) {
      devouredPerBatch.current.set(fw.batchId, new Set());
    }
    devouredPerBatch.current.get(fw.batchId)!.add(fw.id);

    // Remove from visible words
    setFlyingWords(prev => prev.filter(w => w.id !== fw.id));

    // Check batch completion
    tryFinalizeBatch(fw.batchId);
  }, [flashPitGlow, tryFinalizeBatch]);

  // ---- Harvest All ----
  const handleHarvestAll = useCallback(async () => {
    if (isOffering || !harvestState || harvestState.pendingBatches.length === 0) return;
    setIsOffering(true);
    hapticSuccess();

    // 1. Atomic economy — settle all batches immediately
    const result = await offerAllBatches();
    if (result.amberAwarded > 0) {
      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      if (mountedRef.current) {
        onAmberChange?.(newBalance);
        // We'll update display balance after the cascade for dramatic effect
      }
    }

    // 2. Visual cascade — stagger all words spiraling in
    const words = flyingWordsRef.current.filter(w => !w.isDevoured);
    if (words.length === 0) {
      if (mountedRef.current) {
        setIsOffering(false);
        await loadState();
      }
      return;
    }

    const staggerDelay = Math.min(80, 2000 / words.length);

    words.forEach((fw, i) => {
      fw.isDevoured = true; // Mark immediately to prevent taps
      const delay = i * staggerDelay;

      setTimeout(() => {
        if (!mountedRef.current) return;

        // Stop float
        if (fw.floatLoop) {
          fw.floatLoop.stop();
          fw.floatLoop = null;
        }

        // Spawn trail every 3rd word to avoid particle overload
        if (i % 3 === 0) {
          spawnTrail(fw.baseX, fw.baseY);
        }

        const duration = getDevourDuration(phase);

        if (reducedMotion) {
          fw.opacity.setValue(0);
          fw.scale.setValue(0);
          flashPitGlow();
          return;
        }

        Animated.parallel([
          Animated.timing(fw.translateX, {
            toValue: PIT_CENTER.x + (Math.random() - 0.5) * 20,
            duration,
            easing: Easing.bezier(0.4, 0, 0.7, 0.2),
            useNativeDriver: true,
          }),
          Animated.timing(fw.translateY, {
            toValue: PIT_CENTER.y + (Math.random() - 0.5) * 15,
            duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(fw.scale, {
            toValue: 0.1,
            duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(fw.rotation, {
            toValue: 3 + Math.random() * 2,
            duration,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(duration * 0.65),
            Animated.timing(fw.opacity, {
              toValue: 0,
              duration: duration * 0.35,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          if (mountedRef.current) flashPitGlow();
        });
      }, delay);
    });

    // 3. After cascade finishes, show results + amber rise
    const cascadeDuration = words.length * staggerDelay + getDevourDuration(phase) + 200;
    setTimeout(async () => {
      if (!mountedRef.current) return;

      // Update display balance now (dramatic reveal)
      const freshState = await getHarvestState();
      if (mountedRef.current) {
        setDisplayBalance(prev => prev + result.amberAwarded);
        spawnAmberRise(result.amberAwarded);
        showResultToast(
          getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded)
        );
        setHarvestState(freshState);
        setFlyingWords([]);
        setOverflowCount(0);
        setIsOffering(false);
      }
    }, cascadeDuration);
  }, [
    isOffering, harvestState, phase, reducedMotion,
    onAmberChange, spawnTrail, spawnAmberRise, flashPitGlow,
    showResultToast, loadState,
  ]);

  // ---- Compute summary stats ----
  const pendingAmber = useMemo(() => {
    if (!harvestState) return 0;
    return harvestState.pendingBatches.reduce((s, b) => s + b.amberValue, 0);
  }, [harvestState]);

  const pendingWordCount = useMemo(() => {
    if (!harvestState) return 0;
    return harvestState.pendingBatches.reduce((s, b) => s + b.words.length, 0);
  }, [harvestState]);

  // ---- Pit glow color ----
  const glowColor = (DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0]).glow;

  if (!harvestState) return null;

  return (
    <View style={[styles.container, { backgroundColor: PIT_BG_COLORS[phase] ?? PIT_BG_COLORS[0] }]}>
      {/* Full-screen background image */}
      <Image
        source={getPitBackground(phase)}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Pit glow overlay (flashes on devour) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pitGlow,
          {
            backgroundColor: glowColor,
            opacity: pitGlowOpacity,
          },
        ]}
      />

      {/* Trail particles layer */}
      {trailParticles.map(p => (
        <TrailParticleView key={p.id} p={p} />
      ))}

      {/* Amber rise particles layer */}
      {amberParticles.map(p => (
        <AmberParticleView key={p.id} p={p} />
      ))}

      {/* Floating word chips */}
      {flyingWords.map(fw => (
        <FloatingWordChip
          key={fw.id}
          fw={fw}
          onTap={devourWord}
          phase={phase}
        />
      ))}

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticLight();
            onClose();
          }}
          accessibilityLabel="Return home"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'\u2190'} Home</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: phaseTheme.victoryTitleColor }]}>
          {getPitScreenTitle(phase)}
        </Text>
        <View style={styles.amberBadge}>
          <Text style={styles.amberBadgeText}>
            {'\uD83D\uDC8E'} {displayBalance}
          </Text>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: phaseTheme.modalSecondaryTextColor }]}>
        {getPitScreenSubtitle(phase)}
      </Text>

      {/* Empty state */}
      {pendingWordCount === 0 && !resultMessage && (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: phaseTheme.modalSecondaryTextColor }]}>
            {getPitEmptyMessage(phase)}
          </Text>
        </View>
      )}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <View style={styles.overflowContainer}>
          <Text style={[styles.overflowText, { color: phaseTheme.modalSecondaryTextColor }]}>
            {getPitOverflowText(phase as DialoguePhase, overflowCount)}
          </Text>
        </View>
      )}

      {/* Result toast (auto-dismiss) */}
      {resultMessage && (
        <Animated.View
          style={[
            styles.resultToast,
            {
              backgroundColor: phase >= 3 ? 'rgba(139, 26, 58, 0.85)' : 'rgba(100, 60, 180, 0.85)',
              opacity: resultOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.resultToastText}>{resultMessage}</Text>
        </Animated.View>
      )}

      {/* Bottom panel: stats + harvest all */}
      <View style={styles.bottomPanel}>
        {/* Summary stats row */}
        <View style={[styles.summaryRow, {
          backgroundColor: phase >= 3
            ? 'rgba(10, 5, 20, 0.8)'
            : 'rgba(40, 20, 80, 0.7)',
        }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {'\uD83D\uDC8E'} {pendingAmber}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              {getPitPendingAmberLabel(phase)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {harvestState.totalWordsOffered}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              Lifetime {getPitHarvestLabel(phase)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {'\uD83D\uDC8E'} {displayBalance}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              Spendable
            </Text>
          </View>
        </View>

        {/* Harvest All button */}
        {pendingWordCount > 0 && (
          <TouchableOpacity
            style={[styles.harvestAllButton, {
              backgroundColor: phase >= 3 ? '#8B1A3A' : CandyColors.pink.main,
              opacity: isOffering ? 0.5 : 1,
            }]}
            onPress={handleHarvestAll}
            disabled={isOffering}
            accessibilityLabel={`${getPitOfferAllLabel(phase)}: ${pendingAmber} amber from ${pendingWordCount} words`}
            accessibilityRole="button"
          >
            <Text style={styles.harvestAllText}>
              {getPitOfferAllLabel(phase)} ({'\uD83D\uDC8E'} {pendingAmber})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  amberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  amberBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFBF00',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 30,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pitGlow: {
    position: 'absolute',
    top: PIT_CENTER.y - 35,
    left: PIT_CENTER.x - SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.6,
    height: 70,
    borderRadius: 35,
  },
  emptyContainer: {
    position: 'absolute',
    top: FLOAT_ZONE.top + 40,
    left: 30,
    right: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overflowContainer: {
    position: 'absolute',
    top: FLOAT_ZONE.bottom + 4,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overflowText: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  resultToast: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.42,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  resultToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 28,
    borderRadius: 1,
  },
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
