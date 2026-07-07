import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { useScreenInsets } from '../hooks/useScreenInsets';
import { DialoguePhase } from '../types/homeWorld';
import { getFullProgress } from '../services/amberCurrency';
import { getWordsOfferedText } from '../services/phaseNarrative';

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
      </View>

      {/* Word grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.wordGrid, { paddingBottom: Math.max(40, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {words.length === 0 ? (
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
        ) : (
          <View style={styles.wordChips}>
            {words.map((word, index) => {
              const dread = isDread(word) && phase >= 2;
              return (
                <View
                  key={`${word}-${index}`}
                  style={[
                    styles.wordChip,
                    { backgroundColor: t.sectionBg, borderColor: t.sectionBorder },
                    dread && styles.wordChipDread,
                  ]}
                >
                  <Text style={[
                    styles.wordText,
                    { color: t.body },
                    dread && styles.wordTextDread,
                  ]}>
                    {word}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
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
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  // Dread words keep their crimson highlight (Phase 2+ only reaches here on
  // the dark screen backgrounds), now framed like every other chip.
  wordChipDread: {
    backgroundColor: 'rgba(150, 20, 40, 0.3)',
    borderColor: 'rgba(200, 50, 60, 0.55)',
  },
  wordText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  wordTextDread: {
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
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
});
