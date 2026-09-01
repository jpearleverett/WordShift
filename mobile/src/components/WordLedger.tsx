import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ListRenderItem,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { PIXEL_FONT_BOLD } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { getResonanceConfig } from '../theme/colors';
import { PanelCard } from './ui/PanelCard';
import { EntranceCascadeItem, getGroupedCascadeDelayMs } from './ui/RewardReveal';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { DialoguePhase } from '../types/homeWorld';
import { getFullProgress } from '../services/amberCurrency';
import { markScreenReady } from '../services/screenReady';
import { getWordPhaseTier } from '../services/localGenerator';
import { getWordsOfferedText } from '../services/phaseNarrative';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import { FONT_SIZE } from '../theme/typeScale';
import { playUiSound, uiHapticSelection } from '../services/uiSound';

// Content waits this long so the header reads as settling in first.
const HEADER_CASCADE_BASE_MS = 120;
// Chips per windowed FlatList row-group. Grouping lets the wrap-cloud layout
// survive virtualization: each list item is a self-contained flex-wrap block
// the list can mount/unmount, instead of 500 chips flat in one ScrollView.
const LEDGER_GROUP_SIZE = 18;
// Per-chip stagger WITHIN a windowed group. Tighter than SURFACE.staggerMs so
// a full 18-chip group still lands in well under a second, and bounded by the
// group size rather than the ledger size (which is what lets EVERY chip
// animate instead of only a global first N).
const CHIP_CASCADE_STAGGER_MS = 28;
// Group-to-group offset so the first screenful reads as one continuous
// top-to-bottom cascade instead of parallel columns, capped at
// GROUP_CASCADE_CAP so a group reached later never sits blank waiting.
const GROUP_CASCADE_STAGGER_MS = 70;
const GROUP_CASCADE_CAP = 2;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const JOURNAL_ICON = require('../../assets/ui/journal.png');

// Dread highlighting keys off the CANONICAL 615-word tier system (the same
// map that scores boards, tile resonance, and move resonance) — the old local
// ~46-word list here missed marquee vocabulary like OMEN and WRAITH, so the
// words the descent worked hardest to serve rendered as plain chips in the
// one screen whose premise is "the words remember". Tier >= 2 matches the old
// set's emptiness register (tier 1 is the broad curiosity band — THINK,
// DRIFT — and highlighting it would light half the ledger).
const isDread = (word: string): boolean => getWordPhaseTier(word.toUpperCase()) >= 2;

// The newest dread chips (post-reversal) that visibly breathe with a slow
// opacity pulse once the dread arc has truly deepened (phase >= 3) -- the
// ledger should feel faintly alive, not lit up.
const DREAD_BREATHE_CAP = 6;
const DREAD_BREATHE_MIN = 0.75;
const DREAD_BREATHE_MAX = 1;
const DREAD_BREATHE_CYCLE_MS = 2400;
const DREAD_BREATHE_SEGMENTS = 12;

/** A 0..1 triangle wave (period 1, peak at 0.5). */
function triangleWave(x: number): number {
  const t = ((x % 1) + 1) % 1;
  return t < 0.5 ? t * 2 : (1 - t) * 2;
}

/**
 * Sample a phase-shifted triangle wave of a single continuously-looping
 * `driver` value into an Animated interpolation over [min, max]. Several
 * chips (plus the shared dread glow) can read their own out-of-sync breathing
 * curve from ONE driver + ONE loop (this surface's one idle animator) via a
 * static lookup table each — no extra Animated nodes or timers.
 */
function breatheInterpolation(
  driver: Animated.Value,
  phaseOffset: number,
  min: number,
  max: number,
) {
  const inputRange = Array.from({ length: DREAD_BREATHE_SEGMENTS + 1 }, (_, k) => k / DREAD_BREATHE_SEGMENTS);
  const outputRange = inputRange.map(x => min + triangleWave(x + phaseOffset) * (max - min));
  return driver.interpolate({ inputRange, outputRange });
}

/** A windowed row-group of ledger chips. `startIndex` is the group's first
 *  chip's global position (preserves the original order and per-chip stagger). */
export interface LedgerChipGroup {
  key: string;
  startIndex: number;
  words: string[];
}

/**
 * Chunk the flat word list into fixed-size groups for a windowed FlatList.
 * Pure + deterministic (unit-tested): each group carries its global
 * `startIndex` so the renderer can keep the original chip order and stagger.
 * A non-positive size falls back to 1 so a bad caller can never spin.
 */
export function groupLedgerWords(words: string[], size: number): LedgerChipGroup[] {
  const groupSize = size > 0 ? Math.floor(size) : 1;
  const groups: LedgerChipGroup[] = [];
  for (let i = 0; i < words.length; i += groupSize) {
    groups.push({ key: `g${i}`, startIndex: i, words: words.slice(i, i + groupSize) });
  }
  return groups;
}

interface LedgerChipGroupRowProps {
  group: LedgerChipGroup;
  groupIndex: number;
  /** False under reduced motion / low tier: chips mount plain, no wrappers. */
  animate: boolean;
  revealedRef: React.MutableRefObject<Set<string>>;
  renderChip: (word: string, globalIndex: number) => React.ReactNode;
  phase: DialoguePhase;
}

/**
 * One windowed row-group of chips. The cascade is GROUP-relative, so every
 * group animates its own chips on its first mount however deep in the ledger
 * it sits, and the per-chip delay is bounded by the group size rather than by
 * the (up to 500 word) ledger length.
 */
const LedgerChipGroupRow: React.FC<LedgerChipGroupRowProps> = ({
  group,
  groupIndex,
  animate,
  revealedRef,
  renderChip,
  phase,
}) => {
  // Decided ONCE per mounted instance so an ordinary re-render (phase change,
  // data identity churn) can never swap a mid-flight EntranceCascadeItem for a
  // plain Fragment and snap the chip in.
  const firstRevealRef = useRef<boolean | null>(null);
  if (firstRevealRef.current === null) {
    firstRevealRef.current = animate && !revealedRef.current.has(group.key);
  }
  const firstReveal = firstRevealRef.current;

  // Written in an effect, never during render: a double render would otherwise
  // mark the group revealed before its own chips had mounted.
  useEffect(() => {
    revealedRef.current.add(group.key);
  }, [group.key, revealedRef]);

  return (
    <View style={styles.wordChips}>
      {group.words.map((word, i) => {
        const globalIndex = group.startIndex + i;
        const key = `${word}-${globalIndex}`;
        const chip = renderChip(word, globalIndex);
        if (!firstReveal) return <React.Fragment key={key}>{chip}</React.Fragment>;
        return (
          <EntranceCascadeItem
            key={key}
            phase={phase}
            delay={getGroupedCascadeDelayMs(groupIndex, i, {
              staggerMs: CHIP_CASCADE_STAGGER_MS,
              groupStaggerMs: GROUP_CASCADE_STAGGER_MS,
              maxStaggeredGroups: GROUP_CASCADE_CAP,
              baseMs: HEADER_CASCADE_BASE_MS,
            })}
          >
            {chip}
          </EntranceCascadeItem>
        );
      })}
    </View>
  );
};

interface WordLedgerProps {
  phase: DialoguePhase;
  onClose: () => void;
}

export const WordLedger: React.FC<WordLedgerProps> = ({ phase, onClose }) => {
  const screenInsets = useScreenInsets();
  const [words, setWords] = useState<string[]>([]);
  const [totalFormed, setTotalFormed] = useState(0);
  // Loading gate so a 500-word ledger never flashes the wrong empty card
  // while the async read resolves (mirrors WhisperGalleryScreen).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const progress = await getFullProgress();
      setWords(progress.ritualWords || []);
      setTotalFormed(progress.totalWordsFormed || 0);
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
      // First real content is in state: release the navigation cover, which
      // has been holding rather than lifting on the loading gate.
      markScreenReady('ledger');
    }
  };

  const t = getSurfaceTheme(phase);

  // Phase-aware titles
  const getTitle = (): string => {
    if (phase <= 0) return 'Your Word Collection';
    if (phase === 1) return 'Words Arranged';
    if (phase === 2) return 'The Words Remember';
    if (phase === 3) return 'The Incantation Ledger';
    return 'The Offering Record';
  };

  const getSubtitle = (): string => {
    if (phase <= 0) return 'Every word you\'ve formed on your journey';
    if (phase === 1) return 'The words are beginning to form a pattern...';
    if (phase === 2) return 'They remember being formed. They remember your hands.';
    if (phase === 3) return 'Every word was an incantation. Every puzzle, a verse.';
    return 'The record of offerings. Written in your hand.';
  };

  // Newest offerings first — the latest words the player formed lead the
  // ledger instead of being buried under up to 500 older chips.
  const displayWords = useMemo(() => words.slice().reverse(), [words]);

  // The one idle element on this surface: a single continuously-looping
  // driver shared by the dread glow overlay AND the capped breathing chips
  // (native-driven opacity only). Breathing only starts once the dread arc
  // has truly deepened (phase >= 3); below that (or under reduced motion /
  // a low-tier device) it parks at a stable resting frame.
  const breatheEnabled = phase >= 3 && !getSettingsSync().reducedMotion && !shouldSimplifyAnimations();
  const dreadAnim = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    if (!breatheEnabled) {
      dreadAnim.setValue(phase < 2 ? 0 : 0.25);
      return;
    }
    dreadAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(dreadAnim, {
        toValue: 1,
        duration: DREAD_BREATHE_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      dreadAnim.stopAnimation();
    };
  }, [breatheEnabled, phase, dreadAnim]);

  // Reduced motion / low tier: chips appear instantly, no wrappers mounted.
  const cascadeReducedMotion = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
  // Per-GROUP entrance latch: a windowed group cascades on its FIRST mount and
  // never again, so scrolling a long ledger away and back can't replay the
  // fade+rise (what the old global settle timer was for) while a group reached
  // for the first time, at any point however deep, still animates in.
  const revealedGroupsRef = useRef<Set<string>>(new Set());

  const resonance = getResonanceConfig(phase);
  // The shared dread-glow overlay (every dread chip, phase >= 2) reads offset
  // 0 of the same driver — a plain sample when at rest, a smooth pulse once
  // breathing is enabled.
  const dreadGlowOpacity = breatheInterpolation(dreadAnim, 0, resonance.minOpacity, resonance.maxOpacity);

  // Only the first DREAD_BREATHE_CAP dread chips (by newest-first display
  // order) get the whole-chip breathing treatment; each gets its own rank so
  // it reads its own phase-shifted slice of the shared driver.
  const breatheRank = useMemo(() => {
    const m = new Map<number, number>();
    if (phase < 3) return m;
    // The DEEPEST chips breathe first (tier desc, then newest-first): the
    // freshest tier-3/4 offerings are the ones that feel faintly alive.
    const candidates: { index: number; tier: number }[] = [];
    for (let i = 0; i < displayWords.length; i++) {
      const tier = getWordPhaseTier(displayWords[i].toUpperCase());
      if (tier >= 2) candidates.push({ index: i, tier });
    }
    candidates.sort((a, b) => (b.tier - a.tier) || (a.index - b.index));
    for (const c of candidates.slice(0, DREAD_BREATHE_CAP)) m.set(c.index, m.size);
    return m;
  }, [displayWords, phase]);

  const groups = useMemo(() => groupLedgerWords(displayWords, LEDGER_GROUP_SIZE), [displayWords]);

  // One chip, without its key or its cascade wrapper (the group row owns both).
  const renderChip = React.useCallback((word: string, globalIndex: number): React.ReactNode => {
    const dread = isDread(word) && phase >= 2;
    const rank = breatheRank.get(globalIndex);
    const breathingChip = breatheEnabled && dread && rank !== undefined;
    const chipStyle = [
      styles.wordChip,
      { backgroundColor: t.sectionBg, borderColor: t.sectionBorder },
      dread && styles.wordChipDread,
    ];
    const chipInner = (
      <>
        {dread && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dreadGlow,
              { backgroundColor: resonance.color, opacity: dreadGlowOpacity },
            ]}
          />
        )}
        <Text style={[
          styles.wordText,
          { color: t.body },
          dread && styles.wordTextDread,
        ]}>
          {word}
        </Text>
      </>
    );
    return breathingChip ? (
      <Animated.View
        style={[
          chipStyle,
          { opacity: breatheInterpolation(dreadAnim, rank! / DREAD_BREATHE_CAP, DREAD_BREATHE_MIN, DREAD_BREATHE_MAX) },
        ]}
      >
        {chipInner}
      </Animated.View>
    ) : (
      <View style={chipStyle}>{chipInner}</View>
    );
  }, [t, phase, breatheRank, breatheEnabled, dreadAnim, resonance, dreadGlowOpacity]);

  // Each windowed item is one flex-wrap group that cascades its own chips
  // relative to itself, so a group scrolled to later animates in too.
  const renderGroup: ListRenderItem<LedgerChipGroup> = ({ item, index }) => (
    <LedgerChipGroupRow
      group={item}
      groupIndex={index}
      animate={!cascadeReducedMotion}
      revealedRef={revealedGroupsRef}
      renderChip={renderChip}
      phase={phase}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg, paddingTop: screenInsets.top + 16 }]}>
      {/* Soft vignette glow behind the content */}
      <View pointerEvents="none" style={[styles.vignetteGlow, { backgroundColor: t.glow }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}
          onPress={() => { playUiSound('selection'); uiHapticSelection(); onClose(); }}
          accessibilityLabel="Close ledger"
          accessibilityRole="button"
        >
          <Text style={[styles.backChipText, { color: t.title }]}>← Back</Text>
        </TouchableOpacity>
        <EntranceCascadeItem phase={phase}>
        <PanelCard phase={phase} kind="card" style={styles.titlePlaque}>
          <Text style={[styles.title, { color: t.title }]}>
            {getTitle()}
          </Text>
          <Text style={[
            styles.subtitle,
            { color: t.muted },
            phase >= 3 && styles.textLate,
          ]}>
            {getSubtitle()}
          </Text>
          {/* Word count */}
          <View style={[styles.countPill, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
            <Text style={[styles.countText, { color: t.body }, phase >= 3 && styles.textLate]}>
              {getWordsOfferedText(totalFormed, phase)}
            </Text>
          </View>
        </PanelCard>
        </EntranceCascadeItem>
      </View>

      {/* Word grid — windowed so a 500-word ledger never mounts every chip. */}
      <FlatList
        style={styles.scrollView}
        data={groups}
        keyExtractor={item => item.key}
        renderItem={renderGroup}
        extraData={`${phase}-${breatheEnabled}`}
        contentContainerStyle={[styles.wordGrid, { paddingBottom: Math.max(40, screenInsets.bottom) }]}
        ItemSeparatorComponent={ChipGroupSeparator}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={t.muted} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <PanelCard phase={phase} kind="card" style={styles.emptyCard}>
                <Image source={JOURNAL_ICON} style={styles.emptyIcon} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: t.body }]}>
                  {phase <= 1
                    ? 'Complete puzzles to start your word collection!'
                    : 'The ledger awaits your first offering.'}
                </Text>
              </PanelCard>
            </View>
          )
        }
      />
    </View>
  );
};

// Vertical breathing room between windowed chip groups (matches the in-group
// 8dp gap so group boundaries read as ordinary wrap rows).
const ChipGroupSeparator: React.FC = () => <View style={styles.groupSeparator} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop applied inline via useScreenInsets (safe-area aware)
  },
  // Large tinted radial-ish glow anchored behind the header. Gives the flat
  // screen background a soft vignette depth without any animation cost.
  vignetteGlow: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.55,
    left: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 1.6,
    height: SCREEN_WIDTH * 1.1,
    borderRadius: SCREEN_WIDTH * 0.8,
    opacity: 0.22,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backChip: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: SURFACE.buttonRadius,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  backChipText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titlePlaque: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: SURFACE.cardPadX,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  textLate: {
    fontStyle: 'italic',
  },
  countPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: SURFACE.cardRadius,
    borderWidth: 1.5,
  },
  countText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.bodyLg,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  wordGrid: {
    paddingBottom: 40,
  },
  wordChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  groupSeparator: {
    height: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  // Breathing dread aura, clipped to the chip's rounded rect. Native-driven
  // opacity is supplied at render from the shared dread driver.
  dreadGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  // Dread words keep their crimson highlight (Phase 2+ only reaches here on
  // the dark screen backgrounds), now framed like every other chip.
  wordChipDread: {
    backgroundColor: 'rgba(150, 20, 40, 0.3)',
    borderColor: 'rgba(200, 50, 60, 0.55)',
  },
  wordText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.body,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wordTextDread: {
    fontFamily: PIXEL_FONT_BOLD,
    // Bright enough to clear 4.5:1 on the phase-2 mid-tone screenBg through
    // the translucent crimson chip (deeper phases only get darker under it).
    color: '#FF9C9C',
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 8,
  },
  emptyCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    marginBottom: 14,
  },
  emptyText: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.callout,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
