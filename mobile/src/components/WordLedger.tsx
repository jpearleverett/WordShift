import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { CandyColors, getPhaseTheme, getPhaseSurfaceTheme } from '../theme/colors';
import { DialoguePhase } from '../types/homeWorld';
import { getFullProgress } from '../services/amberCurrency';
import { getWordsOfferedText } from '../services/phaseNarrative';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  const phaseTheme = getPhaseTheme(phase);
  const surfaceTheme = getPhaseSurfaceTheme(phase);

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

  const bgColor = phaseTheme.bgPrimary;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: surfaceTheme.glassSoft,
              borderColor: surfaceTheme.glassBorder,
            },
          ]}
          onPress={onClose}
          accessibilityLabel="Close ledger"
          accessibilityRole="button"
        >
          <Text style={[styles.backButtonText, { color: surfaceTheme.textSecondary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={[
            styles.title,
            { color: surfaceTheme.textPrimary },
            phase >= 3 && styles.titleDark,
          ]}>
            {getTitle()}
          </Text>
          <Text style={[
            styles.subtitle,
            { color: surfaceTheme.textMuted },
            phase >= 3 && styles.subtitleDark,
          ]}>
            {getSubtitle()}
          </Text>
        </View>
      </View>

      {/* Word count */}
      <View
        style={[
          styles.countContainer,
          {
            backgroundColor: surfaceTheme.glassSoft,
            borderColor: surfaceTheme.glassBorder,
          },
          phase >= 3 && styles.countContainerDark,
        ]}
      >
        <Text style={[styles.countText, { color: surfaceTheme.textSecondary }, phase >= 3 && styles.countTextDark]}>
          {getWordsOfferedText(totalFormed, phase)}
        </Text>
      </View>

      {/* Word grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.wordGrid}
        showsVerticalScrollIndicator={false}
      >
        {words.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>
              {phase <= 1
                ? 'Complete puzzles to start your word collection!'
                : 'The ledger awaits your first offering.'}
            </Text>
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
                    {
                      borderColor: phase >= 2 ? surfaceTheme.glassBorder : 'transparent',
                    },
                    phase <= 1 && styles.wordChipBright,
                    phase === 2 && styles.wordChipMuted,
                    phase >= 3 && styles.wordChipDark,
                    dread && styles.wordChipDread,
                  ]}
                >
                  <Text style={[
                    styles.wordText,
                    { color: surfaceTheme.textSecondary },
                    phase <= 1 && styles.wordTextBright,
                    phase >= 3 && styles.wordTextDark,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  titleArea: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: CandyColors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  titleDark: {
    color: 'rgba(200, 120, 160, 0.9)',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtitleDark: {
    color: 'rgba(180, 100, 130, 0.7)',
    fontStyle: 'italic',
  },
  countContainer: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  countContainerDark: {
    backgroundColor: 'rgba(120, 30, 60, 0.2)',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  countTextDark: {
    color: 'rgba(180, 100, 130, 0.9)',
    fontStyle: 'italic',
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
    gap: 6,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
  },
  wordChipBright: {
    backgroundColor: 'rgba(255, 182, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 150, 220, 0.3)',
  },
  wordChipMuted: {
    backgroundColor: 'rgba(100, 80, 140, 0.3)',
  },
  wordChipDark: {
    backgroundColor: 'rgba(40, 20, 50, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(80, 30, 60, 0.3)',
  },
  wordChipDread: {
    backgroundColor: 'rgba(150, 20, 40, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(200, 50, 60, 0.4)',
  },
  wordText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  wordTextBright: {
    color: CandyColors.pink.dark,
  },
  wordTextDark: {
    color: 'rgba(160, 120, 150, 0.9)',
  },
  wordTextDread: {
    color: 'rgba(220, 80, 80, 0.95)',
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
