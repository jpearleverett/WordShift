import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CandyColors } from '../theme/colors';
import { useScreenInsets } from '../hooks/useScreenInsets';
import {
  getGroupedEntries,
  getGalleryStats,
  getGalleryTitle,
  getGallerySubtitle,
  getPhaseEraName,
  WhisperEntry,
} from '../services/whisperGallery';
import { ANIMAL_INFO } from '../services/animalDialogue';
import { getWhisperGalleryEmptyText } from '../services/phaseNarrative';
import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { CHARACTER_SPRITES } from './home/AnimalSprite';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WhisperGalleryScreenProps {
  phase: number;
  onClose: () => void;
}

export const WhisperGalleryScreen: React.FC<WhisperGalleryScreenProps> = ({
  phase,
  onClose,
}) => {
  const screenInsets = useScreenInsets();
  const [grouped, setGrouped] = useState<Record<string, WhisperEntry[]>>({});
  const [totalCollected, setTotalCollected] = useState(0);
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [entries, stats] = await Promise.all([
          getGroupedEntries(),
          getGalleryStats(),
        ]);
        setGrouped(entries);
        setTotalCollected(stats.totalCollected);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const title = getGalleryTitle(phase);
  const subtitle = getGallerySubtitle(phase, totalCollected);

  const isDark = phase >= 3;
  const bgColor = isDark ? '#0A0A14' : '#1A1030';
  const textColor = isDark ? 'rgba(180, 100, 130, 0.9)' : 'rgba(220, 200, 240, 0.9)';
  const headerColor = isDark ? '#8B3050' : CandyColors.purple.main;
  const entryBg = isDark ? 'rgba(60, 20, 40, 0.3)' : 'rgba(100, 70, 150, 0.15)';
  const entryBorder = isDark ? 'rgba(100, 30, 50, 0.3)' : 'rgba(130, 100, 180, 0.2)';

  const animalTypes = Object.keys(grouped);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header — safe-area top inset applied inline */}
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>{'<'} Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: headerColor }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        )}

        {!loading && animalTypes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: textColor }]}>
              {getWhisperGalleryEmptyText(phase as DialoguePhase)}
            </Text>
          </View>
        )}

        {animalTypes.map(animalType => {
          const entries = grouped[animalType];
          const typedAnimal = animalType as keyof typeof ANIMAL_INFO;
          const animalName = ANIMAL_INFO[typedAnimal]?.name || animalType;
          const animalEmoji = ANIMAL_INFO[typedAnimal]?.emoji || '🐾';
          const animalSprite = CHARACTER_SPRITES[animalType as AnimalType]?.idle;
          const isExpanded = expandedAnimal === animalType;

          return (
            <View key={animalType} style={styles.animalSection}>
              <TouchableOpacity
                style={[styles.animalHeader, { borderColor: entryBorder }]}
                onPress={() => setExpandedAnimal(isExpanded ? null : animalType)}
                accessibilityLabel={`${animalName}: ${entries.length} entries`}
                accessibilityRole="button"
              >
                <View style={[styles.animalPortrait, { borderColor: entryBorder }]}>
                  {animalSprite ? (
                    <Image
                      source={animalSprite}
                      style={styles.animalPortraitImage}
                      resizeMode="contain"
                      accessibilityLabel={animalName}
                    />
                  ) : (
                    <Text style={styles.animalEmoji}>{animalEmoji}</Text>
                  )}
                </View>
                <Text style={[styles.animalName, { color: headerColor }]}>
                  {animalName}
                </Text>
                <Text style={[styles.entryCount, { color: textColor }]}>
                  {entries.length}
                </Text>
                <Text style={[styles.expandArrow, { color: textColor }]}>
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </Text>
              </TouchableOpacity>

              {isExpanded && entries.map((entry, i) => (
                <View
                  key={entry.id || i}
                  style={[styles.entryCard, { backgroundColor: entryBg, borderColor: entryBorder }]}
                >
                  <Text
                    style={[styles.entryType, { color: textColor }]}
                    accessibilityLabel={getPhaseEraName(entry.phase)}
                  >
                    {entry.type === 'whisper' ? '💭' :
                     entry.type === 'dialogue' ? '💬' :
                     entry.type === 'cross_reference' ? '🔗' :
                     entry.type === 'trigger_reaction' ? '⚡' : '📜'}
                    {' '}{getPhaseEraName(entry.phase)}
                  </Text>
                  <Text style={[styles.entryText, { color: textColor }]}>
                    &ldquo;{entry.text}&rdquo;
                  </Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingBottom: 12,
  },
  backButton: {
    width: 70,
  },
  backButtonText: {
    color: CandyColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  animalSection: {
    marginBottom: 12,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    gap: 10,
  },
  animalPortrait: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animalPortraitImage: {
    width: 34,
    height: 34,
  },
  animalEmoji: {
    fontSize: 22,
  },
  animalName: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  entryCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  expandArrow: {
    fontSize: 10,
  },
  entryCard: {
    marginTop: 6,
    marginLeft: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  entryType: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  entryText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default WhisperGalleryScreen;
