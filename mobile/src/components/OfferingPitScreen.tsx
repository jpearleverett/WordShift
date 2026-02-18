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
import { hapticLight, hapticMedium, hapticHeavy } from '../services/haptics';
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

const PIT_CENTER = {
  x: SCREEN_WIDTH * 0.5,
  y: SCREEN_HEIGHT * 0.62,
};

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50;

const FLOAT_ZONE = {
  top: STATUS_BAR_HEIGHT + 60,
  bottom: SCREEN_HEIGHT * 0.48,
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

const DEVOUR_COLORS: Record<number, { trail: string; glow: string; glowOpacity: number; burst: string }> = {
  0: { trail: '#FFD700', glow: '#FFD700', glowOpacity: 0.35, burst: '#FFE680' },
  1: { trail: '#F0C050', glow: '#F0C050', glowOpacity: 0.30, burst: '#F5D88A' },
  2: { trail: '#B088D0', glow: '#9060C0', glowOpacity: 0.25, burst: '#C8A8E8' },
  3: { trail: '#5A2080', glow: '#3A1060', glowOpacity: 0.20, burst: '#7040A0' },
  4: { trail: '#C03050', glow: '#C03050', glowOpacity: 0.45, burst: '#E05070' },
};

function getDevourDuration(phase: number): number {
  if (phase >= 3) return 600;
  if (phase >= 2) return 750;
  return 900;
}

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
  useDevourPos: boolean; // when true, render uses devourX/Y instead of interpolated drift
  baseX: number;
  baseY: number;
  driftAmplitude: number;
  driftPeriod: number;
  bobAmplitude: number;
  bobPeriod: number;
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

  // Derive smooth sinusoidal position from linear progress values
  const driftX = fw.driftProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      fw.baseX,
      fw.baseX + fw.driftAmplitude,
      fw.baseX,
      fw.baseX - fw.driftAmplitude,
      fw.baseX,
    ],
  });

  const driftY = fw.bobProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [
      fw.baseY,
      fw.baseY - fw.bobAmplitude,
      fw.baseY,
      fw.baseY + fw.bobAmplitude,
      fw.baseY,
    ],
  });

  // Use devour position when actively spiraling, otherwise interpolated drift
  const posX = fw.useDevourPos ? fw.devourX : driftX;
  const posY = fw.useDevourPos ? fw.devourY : driftY;

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
// Particle renderers
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

  const [harvestState, setHarvestState] = useState<HarvestState | null>(null);
  const [flyingWords, setFlyingWords] = useState<FlyingWord[]>([]);
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [impactParticles, setImpactParticles] = useState<ImpactParticle[]>([]);
  const [amberParticles, setAmberParticles] = useState<AmberParticle[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isOffering, setIsOffering] = useState(false);
  const [displayBalance, setDisplayBalance] = useState(amberBalance);
  const [overflowCount, setOverflowCount] = useState(0);

  const devouredPerBatch = useRef<Map<string, Set<string>>>(new Map());
  const batchWordCounts = useRef<Map<string, number>>(new Map());
  const finalizingBatches = useRef<Set<string>>(new Set());
  const pitGlowOpacity = useRef(new Animated.Value(0)).current;
  const pitGlowScale = useRef(new Animated.Value(0.8)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);
  const flyingWordsRef = useRef<FlyingWord[]>([]);

  // Stable callback ref to avoid re-rendering all chips when devourWord deps change
  const devourWordRef = useRef<(fw: FlyingWord) => void>(() => {});
  const stableDevourWord = useCallback((fw: FlyingWord) => devourWordRef.current(fw), []);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { flyingWordsRef.current = flyingWords; }, [flyingWords]);
  useEffect(() => { setDisplayBalance(amberBalance); }, [amberBalance]);

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
          driftProgress: new Animated.Value(Math.random()), // random start phase
          bobProgress: new Animated.Value(Math.random()),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.3),
          rotation: new Animated.Value(0),
          devourX: new Animated.Value(baseX),
          devourY: new Animated.Value(baseY),
          useDevourPos: false,
          baseX,
          baseY,
          driftAmplitude: 12 + Math.random() * 20,
          driftPeriod: 4000 + Math.random() * 4000,
          bobAmplitude: 6 + Math.random() * 8,
          bobPeriod: 3000 + Math.random() * 3000,
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
    allWords.forEach((fw, i) => {
      const delay = reducedMotion ? 0 : i * 50;
      setTimeout(() => {
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
    });

    return () => {
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

  // ---- Pit glow + scale flash ----
  const flashPitGlow = useCallback(() => {
    if (reducedMotion) return;
    const colors = DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0];
    pitGlowScale.setValue(0.8);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pitGlowOpacity, { toValue: colors.glowOpacity, duration: 120, useNativeDriver: true }),
        Animated.timing(pitGlowOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.spring(pitGlowScale, { toValue: 1.2, friction: 4, tension: 200, useNativeDriver: true }),
        Animated.timing(pitGlowScale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [phase, pitGlowOpacity, pitGlowScale, reducedMotion]);

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
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(p.x, { toValue: PIT_CENTER.x + (Math.random() - 0.5) * 30, duration: duration * 0.75, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.y, { toValue: PIT_CENTER.y + (Math.random() - 0.5) * 20, duration: duration * 0.75, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: duration * 0.75, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: duration * 0.5, delay: duration * 0.3, useNativeDriver: true }),
        ]).start(() => { if (mountedRef.current) setTrailParticles(prev => prev.filter(tp => tp.id !== p.id)); });
      }, delay);
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
      setTimeout(() => {
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
      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      if (mountedRef.current) {
        setDisplayBalance(newBalance);
        onAmberChange?.(newBalance);
        spawnAmberRise(result.amberAwarded);
        hapticMedium();
        showResultToast(getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded));
      }
    } catch { /* batch may already be offered */ }
  }, [phase, onAmberChange, spawnAmberRise, showResultToast]);

  // ---- Handle word devoured ----
  const handleWordDevoured = useCallback((fw: FlyingWord) => {
    if (!mountedRef.current) return;
    flashPitGlow();
    spawnImpactBurst();
    if (!devouredPerBatch.current.has(fw.batchId)) {
      devouredPerBatch.current.set(fw.batchId, new Set());
    }
    devouredPerBatch.current.get(fw.batchId)!.add(fw.id);
    setFlyingWords(prev => prev.filter(w => w.id !== fw.id));
    tryFinalizeBatch(fw.batchId);
  }, [flashPitGlow, spawnImpactBurst, tryFinalizeBatch]);

  // ---- Devour a single word ----
  const devourWord = useCallback((fw: FlyingWord) => {
    if (fw.isDevoured || isOffering) return;
    fw.isDevoured = true;
    hapticLight();

    // Stop float loops
    fw.floatLoopX?.stop(); fw.floatLoopX = null;
    fw.floatLoopY?.stop(); fw.floatLoopY = null;

    spawnTrail(fw.baseX, fw.baseY);

    if (reducedMotion) {
      fw.opacity.setValue(0);
      fw.scale.setValue(0);
      handleWordDevoured(fw);
      return;
    }

    const duration = getDevourDuration(phase);

    // Snapshot current drift position into devourX/Y, then switch to devour mode
    // Approximate current pos from progress (we use baseX as fallback — close enough since
    // the timing naturally continues from current native value)
    fw.devourX.setValue(fw.baseX);
    fw.devourY.setValue(fw.baseY);
    fw.useDevourPos = true;
    // Force re-render with devour position
    setFlyingWords(prev => [...prev]);

    // Phase 1: brief pop-up (100ms)
    Animated.sequence([
      Animated.spring(fw.scale, { toValue: 1.2, friction: 6, tension: 300, useNativeDriver: true }),
      // Phase 2: spiral into pit
      Animated.parallel([
        Animated.timing(fw.devourX, {
          toValue: PIT_CENTER.x,
          duration,
          easing: Easing.bezier(0.3, 0.1, 0.7, 0.15),
          useNativeDriver: true,
        }),
        Animated.timing(fw.devourY, {
          toValue: PIT_CENTER.y,
          duration,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fw.scale, {
          toValue: 0.05,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fw.rotation, {
          toValue: 6,
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
      ]),
    ]).start(() => handleWordDevoured(fw));
  }, [phase, isOffering, reducedMotion, spawnTrail, handleWordDevoured]);

  // Keep devourWordRef in sync
  useEffect(() => { devourWordRef.current = devourWord; }, [devourWord]);

  // ---- Harvest All ----
  const handleHarvestAll = useCallback(async () => {
    if (isOffering || !harvestState || harvestState.pendingBatches.length === 0) return;
    setIsOffering(true);
    hapticHeavy();

    const result = await offerAllBatches();
    if (result.amberAwarded > 0) {
      const newBalance = await awardBonusAmber(result.amberAwarded, 'word_offering');
      if (mountedRef.current) onAmberChange?.(newBalance);
    }

    const words = flyingWordsRef.current.filter(w => !w.isDevoured);
    if (words.length === 0) {
      if (mountedRef.current) { setIsOffering(false); await loadState(); }
      return;
    }

    const staggerDelay = Math.min(70, 1800 / words.length);

    words.forEach((fw, i) => {
      fw.isDevoured = true;
      setTimeout(() => {
        if (!mountedRef.current) return;
        fw.floatLoopX?.stop(); fw.floatLoopX = null;
        fw.floatLoopY?.stop(); fw.floatLoopY = null;

        if (i % 3 === 0) spawnTrail(fw.baseX, fw.baseY);
        const duration = getDevourDuration(phase);

        if (reducedMotion) {
          fw.opacity.setValue(0); fw.scale.setValue(0); flashPitGlow(); return;
        }

        fw.devourX.setValue(fw.baseX);
        fw.devourY.setValue(fw.baseY);
        fw.useDevourPos = true;

        Animated.parallel([
          Animated.timing(fw.devourX, { toValue: PIT_CENTER.x + (Math.random() - 0.5) * 20, duration, easing: Easing.bezier(0.3, 0.1, 0.7, 0.15), useNativeDriver: true }),
          Animated.timing(fw.devourY, { toValue: PIT_CENTER.y + (Math.random() - 0.5) * 15, duration, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(fw.scale, { toValue: 0.05, duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(fw.rotation, { toValue: 4 + Math.random() * 3, duration, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(duration * 0.6),
            Animated.timing(fw.opacity, { toValue: 0, duration: duration * 0.4, useNativeDriver: true }),
          ]),
        ]).start(() => { if (mountedRef.current) { flashPitGlow(); if (i % 4 === 0) spawnImpactBurst(); } });
      }, i * staggerDelay);
    });

    const cascadeDuration = words.length * staggerDelay + getDevourDuration(phase) + 300;
    setTimeout(async () => {
      if (!mountedRef.current) return;
      const freshState = await getHarvestState();
      if (mountedRef.current) {
        setDisplayBalance(prev => prev + result.amberAwarded);
        spawnAmberRise(result.amberAwarded);
        showResultToast(getPitOfferResultMessage(phase, result.wordsOffered, result.amberAwarded));
        setHarvestState(freshState);
        setFlyingWords([]);
        setOverflowCount(0);
        setIsOffering(false);
      }
    }, cascadeDuration);
  }, [isOffering, harvestState, phase, reducedMotion, onAmberChange, spawnTrail, spawnAmberRise, spawnImpactBurst, flashPitGlow, showResultToast, loadState]);

  // ---- Summary stats ----
  const pendingAmber = useMemo(() => {
    if (!harvestState) return 0;
    return harvestState.pendingBatches.reduce((s, b) => s + b.amberValue, 0);
  }, [harvestState]);

  const pendingWordCount = useMemo(() => {
    if (!harvestState) return 0;
    return harvestState.pendingBatches.reduce((s, b) => s + b.words.length, 0);
  }, [harvestState]);

  const glowColor = (DEVOUR_COLORS[phase] ?? DEVOUR_COLORS[0]).glow;

  if (!harvestState) return null;

  return (
    <View style={[styles.container, { backgroundColor: PIT_BG_COLORS[phase] ?? PIT_BG_COLORS[0] }]}>
      <Image source={getPitBackground(phase)} style={styles.backgroundImage} resizeMode="cover" />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Pit glow overlay */}
      <Animated.View
        pointerEvents="none"
        style={[styles.pitGlow, {
          backgroundColor: glowColor,
          opacity: pitGlowOpacity,
          transform: [{ scale: pitGlowScale }],
        }]}
      />

      {/* Particle layers */}
      {trailParticles.map(p => <TrailParticleView key={p.id} p={p} />)}
      {impactParticles.map(p => <ImpactParticleView key={p.id} p={p} />)}
      {amberParticles.map(p => <AmberParticleView key={p.id} p={p} />)}

      {/* Floating word chips */}
      {flyingWords.map(fw => (
        <FloatingWordChip key={fw.id} fw={fw} onTap={stableDevourWord} />
      ))}

      {/* Header — matches HomeScreen frosted glass style */}
      <View style={[styles.header, { paddingTop: STATUS_BAR_HEIGHT }]}>
        <View style={styles.headerLeft}>
          <View style={styles.amberContainer} accessibilityLabel={`${displayBalance} amber`}>
            <View style={styles.amberInner}>
              <Text style={styles.amberEmoji}>{'\uD83D\uDC8E'}</Text>
              <Text style={styles.amberCount}>{displayBalance}</Text>
            </View>
          </View>
          {pendingAmber > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>+{pendingAmber}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => { hapticLight(); onClose(); }}
            accessibilityLabel="Return home"
            accessibilityRole="button"
          >
            <Text style={styles.headerIconText}>{'\uD83C\uDFE0'}</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Result toast */}
      {resultMessage && (
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

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <View style={[styles.summaryRow, {
          backgroundColor: phase >= 3 ? 'rgba(10, 5, 20, 0.8)' : 'rgba(40, 20, 80, 0.7)',
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
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>{harvestState.totalWordsOffered}</Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>
              Lifetime {getPitHarvestLabel(phase)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: phaseTheme.modalTextColor }]}>
              {'\uD83D\uDC8E'} {displayBalance}
            </Text>
            <Text style={[styles.summaryLabel, { color: phaseTheme.modalSecondaryTextColor }]}>Spendable</Text>
          </View>
        </View>

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
  // ---- Pit glow ----
  pitGlow: {
    position: 'absolute',
    top: PIT_CENTER.y - 45,
    left: PIT_CENTER.x - SCREEN_WIDTH * 0.35,
    width: SCREEN_WIDTH * 0.7,
    height: 90,
    borderRadius: 45,
  },
  // ---- Content overlays ----
  emptyContainer: {
    position: 'absolute',
    top: FLOAT_ZONE.top + 40,
    left: 30, right: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16, fontWeight: '600',
    textAlign: 'center', lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    top: SCREEN_HEIGHT * 0.42,
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
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '900' },
  summaryLabel: { fontSize: 9, fontWeight: '600', marginTop: 2, textAlign: 'center' },
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
});
