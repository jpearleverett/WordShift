import React, { useState, useEffect, useRef } from 'react';
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
  Easing,
} from 'react-native';
import { PIXEL_FONT_BOLD } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { getResonanceConfig } from '../theme/colors';
import { PanelCard } from './ui/PanelCard';
import { EntranceCascadeItem, getCascadeDelayMs } from './ui/RewardReveal';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { DialoguePhase } from '../types/homeWorld';
import { getFullProgress } from '../services/amberCurrency';
import { getWordsOfferedText } from '../services/phaseNarrative';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';

// Cap the staggered chips so a long ledger (up to 500 words) snaps the rest in.
const CHIP_CASCADE_CAP = 10;
// Content waits this long so the header reads as settling in first.
const HEADER_CASCADE_BASE_MS = 120;
// Chips per windowed FlatList row-group. Grouping lets the wrap-cloud layout
// survive virtualization: each list item is a self-contained flex-wrap block
// the list can mount/unmount, instead of 500 chips flat in one ScrollView.
const LEDGER_GROUP_SIZE = 18;
// Once the initial entrance has settled we disarm the cascade so a first-group
// remount (scrolling a long ledger to the bottom and back) can never replay it.
const LEDGER_CASCADE_SETTLE_MS = 1500;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const JOURNAL_ICON = require('../../assets/ui/journal.png');

// Dread words that glow differently at higher phases
const DREAD_WORD_SET = new Set([
  'VOID', 'EMPTY', 'HOLLOW', 'FADE', 'WANE', 'DECAY', 'ALONE', 'LOST',
  'DRIFT', 'SINK', 'FALL', 'DOOM', 'DARK', 'COLD', 'NUMB', 'GRAVE',
  'ECHO', 'ABYSS', 'RIFT', 'DREAD', 'FEAR', 'SHADOW', 'SHADE', 'GHOST',
  'ASH', 'DUST', 'TOMB', 'CRYPT', 'RUIN', 'END', 'FINAL', 'LAST',
  'GATE', 'PORTAL', 'RIFT', 'SUMMON', 'RITUAL', 'VOID', 'NOTHING',
  'OBLIVION', 'DARKNESS', 'SILENCE', 'STILL', 'FROZEN', 'DEAD', 'BONE',
]);

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

interface WordLedgerProps {
  phase: DialoguePhase;
  onClose: () => void;
}

export const WordLedger: React.FC<WordLedgerProps> = ({ phase, onClose }) => {
  const screenInsets = useScreenInsets();
  const [words, setWords] = useState<string[]>([]);
  const [totalFormed, setTotalFormed] = useState(0);

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

  const isDread = (word: string): boolean => DREAD_WORD_SET.has(word.toUpperCase());

  // The one idle element on this surface: a single breathing driver shared by
  // every dread chip's glow overlay (reusing the letter-tile resonance visual
  // language). One loop, many overlays, native-driven opacity only.
  const dreadAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    if (phase < 2 || reduced) {
      dreadAnim.setValue(phase < 2 ? 0 : 0.5);
      return;
    }
    dreadAnim.setValue(0);
    const cycle = phase >= 4 ? 2000 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dreadAnim, {
          toValue: 1,
          duration: cycle,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(dreadAnim, {
          toValue: 0,
          duration: cycle,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      dreadAnim.stopAnimation();
    };
  }, [phase, dreadAnim]);

  // Entrance-cascade latch: arm on mount, disarm once the initial stagger has
  // settled so a windowed group scrolled back into view never re-triggers the
  // fade+rise. Reduced motion / low tier never arm it (chips appear instantly).
  const cascadeReducedMotion = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
  const [cascadeArmed, setCascadeArmed] = useState(!cascadeReducedMotion);
  useEffect(() => {
    if (cascadeReducedMotion) return;
    const timer = setTimeout(() => setCascadeArmed(false), LEDGER_CASCADE_SETTLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resonance = getResonanceConfig(phase);
  const dreadGlowOpacity = dreadAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [resonance.minOpacity, resonance.maxOpacity],
  });

  const groups = groupLedgerWords(words, LEDGER_GROUP_SIZE);

  // Each windowed item is one flex-wrap group; the chips inside keep their
  // global index so the first on-screen chips still cascade in original order.
  const renderGroup: ListRenderItem<LedgerChipGroup> = ({ item }) => (
    <View style={styles.wordChips}>
      {item.words.map((word, i) => {
        const globalIndex = item.startIndex + i;
        const dread = isDread(word) && phase >= 2;
        const chip = (
          <View
            style={[
              styles.wordChip,
              { backgroundColor: t.sectionBg, borderColor: t.sectionBorder },
              dread && styles.wordChipDread,
            ]}
          >
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
          </View>
        );
        // Only the first on-screen chips cascade, and only while armed; the
        // rest snap in (a long ledger must not crawl, and a scrolled-in group
        // must not replay the entrance).
        if (cascadeArmed && globalIndex < CHIP_CASCADE_CAP) {
          return (
            <EntranceCascadeItem
              key={`${word}-${globalIndex}`}
              phase={phase}
              delay={getCascadeDelayMs(globalIndex, { baseMs: HEADER_CASCADE_BASE_MS })}
            >
              {chip}
            </EntranceCascadeItem>
          );
        }
        return <React.Fragment key={`${word}-${globalIndex}`}>{chip}</React.Fragment>;
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg, paddingTop: screenInsets.top + 16 }]}>
      {/* Soft vignette glow behind the content */}
      <View pointerEvents="none" style={[styles.vignetteGlow, { backgroundColor: t.glow }]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}
          onPress={onClose}
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
        extraData={`${cascadeArmed}-${phase}`}
        contentContainerStyle={[styles.wordGrid, { paddingBottom: Math.max(40, screenInsets.bottom) }]}
        ItemSeparatorComponent={ChipGroupSeparator}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        ListEmptyComponent={
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
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titlePlaque: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 13,
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
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
