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
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
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

const FLAME_ICON = require('../../assets/ui/flame.png');

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

  const t = getSurfaceTheme(phase);

  const animalTypes = Object.keys(grouped);

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Soft vignette glow behind the content */}
      <View pointerEvents="none" style={[styles.vignetteGlow, { backgroundColor: t.glow }]} />

      {/* Header, safe-area top inset applied inline */}
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}
          onPress={onClose}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={[styles.backChipText, { color: t.title }]}>{'<'} Back</Text>
        </TouchableOpacity>
        <PanelCard phase={phase} kind="card" style={styles.titlePlaque}>
          <Text style={[styles.title, { color: t.title }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: t.muted }]}>{subtitle}</Text>
        </PanelCard>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={t.primaryText} />
          </View>
        )}

        {!loading && animalTypes.length === 0 && (
          <View style={styles.emptyState}>
            <PanelCard phase={phase} kind="card" style={styles.emptyCard}>
              <Image source={FLAME_ICON} style={styles.emptyIcon} resizeMode="contain" />
              <Text style={[styles.emptyText, { color: t.body }]}>
                {getWhisperGalleryEmptyText(phase as DialoguePhase)}
              </Text>
            </PanelCard>
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
                onPress={() => setExpandedAnimal(isExpanded ? null : animalType)}
                accessibilityLabel={`${animalName}: ${entries.length} entries`}
                accessibilityRole="button"
                activeOpacity={0.85}
              >
                <PanelCard phase={phase} kind="card" style={styles.animalHeader}>
                  <View style={[
                    styles.animalPortrait,
                    { borderColor: t.secondaryBorder, backgroundColor: t.secondaryBg },
                  ]}>
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
                  <Text style={[styles.animalName, { color: t.title }]}>
                    {animalName}
                  </Text>
                  <View style={[
                    styles.countPill,
                    { backgroundColor: t.secondaryBg, borderColor: t.secondaryBorder },
                  ]}>
                    <Text style={[styles.entryCount, { color: t.secondaryText }]}>
                      {entries.length}
                    </Text>
                  </View>
                  <View style={styles.chevronBox}>
                    <View style={[
                      styles.chevron,
                      { borderColor: t.muted },
                      isExpanded ? styles.chevronUp : styles.chevronDown,
                    ]} />
                  </View>
                </PanelCard>
              </TouchableOpacity>

              {isExpanded && entries.map((entry, i) => (
                <View
                  key={entry.id || i}
                  style={[styles.entryCard, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}
                >
                  <Text
                    style={[styles.entryType, { color: t.muted }]}
                    accessibilityLabel={getPhaseEraName(entry.phase)}
                  >
                    {entry.type === 'whisper' ? '💭' :
                     entry.type === 'dialogue' ? '💬' :
                     entry.type === 'cross_reference' ? '🔗' :
                     entry.type === 'trigger_reaction' ? '⚡' : '📜'}
                    {' '}{getPhaseEraName(entry.phase)}
                  </Text>
                  <Text style={[styles.entryText, { color: t.body }]}>
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
    paddingHorizontal: 16,
    // paddingTop applied inline via useScreenInsets (safe-area aware)
    paddingBottom: 12,
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
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
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
  animalSection: {
    marginBottom: 12,
  },
  animalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  animalPortrait: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
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
    letterSpacing: 0.3,
    flex: 1,
  },
  countPill: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  entryCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Rotated-View chevron replaces the old text-triangle disclosure glyph.
  chevronBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 10,
    height: 10,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
  },
  chevronDown: {
    transform: [{ rotate: '45deg' }],
    marginTop: -3,
  },
  chevronUp: {
    transform: [{ rotate: '-135deg' }],
    marginTop: 3,
  },
  entryCard: {
    marginTop: 8,
    marginLeft: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: SURFACE.cardRadius,
    borderWidth: 1.5,
  },
  entryType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  entryText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default WhisperGalleryScreen;
