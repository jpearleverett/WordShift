import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { EntranceCascadeItem, getCascadeDelayMs } from './ui/RewardReveal';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';
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

// Generated candy sprites replacing the bare entry-type emoji (💭/💬/🔗/⚡/📜).
const ENTRY_TYPE_ICONS: Record<string, ReturnType<typeof require>> = {
  whisper: require('../../assets/ui/whisper.png'),
  dialogue: require('../../assets/ui/speech.png'),
  cross_reference: require('../../assets/ui/link.png'),
  trigger_reaction: require('../../assets/ui/variant_speed.png'),
};
const SCROLL_ICON = require('../../assets/ui/scroll.png');
const getEntryTypeIcon = (type: string) => ENTRY_TYPE_ICONS[type] || SCROLL_ICON;

// Content waits this long so the header reads as settling in first.
const HEADER_CASCADE_BASE_MS = 120;
// Only the section headers in the first screenful cascade; later ones (scrolled
// into a windowed SectionList) appear without re-triggering the entrance.
const GALLERY_CASCADE_WINDOW = 8;
// Disarm the cascade once the initial stagger has settled so a header scrolled
// back into view never replays it.
const GALLERY_CASCADE_SETTLE_MS = 1500;

/** One collapsible animal group: a SectionList section (data = the entries
 *  shown while expanded; the header always shows the full count). */
interface GallerySection {
  animalType: string;
  sectionIndex: number;
  isNewest: boolean;
  entriesTotal: number;
  data: WhisperEntry[];
}

/**
 * A one-time light sweep across the newest (top) collection card, then it
 * rests (unmounts) so nothing keeps animating idle. Native-driven transform +
 * opacity only; reduced motion / low-tier devices skip it entirely.
 */
const HeaderShimmer: React.FC<{ phase: number }> = ({ phase }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
      setDone(true);
      return;
    }
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      delay: 260,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) setDone(true);
    });
    return () => animation.stop();
  }, [anim]);

  if (done) return null;

  const t = getSurfaceTheme(phase);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, SCREEN_WIDTH] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 0.5, 0.5, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmerBand,
        { backgroundColor: t.glow, opacity, transform: [{ translateX }, { rotate: '18deg' }] },
      ]}
    />
  );
};

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

  // Entrance-cascade latch: arm on mount, disarm once the initial stagger has
  // settled so a windowed section header scrolled back into view never replays
  // the fade+rise. Reduced motion / low tier never arm it (headers appear at rest).
  const galleryReducedMotion = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
  const [cascadeArmed, setCascadeArmed] = useState(!galleryReducedMotion);
  useEffect(() => {
    if (galleryReducedMotion) return;
    const timer = setTimeout(() => setCascadeArmed(false), GALLERY_CASCADE_SETTLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = getGalleryTitle(phase);
  const subtitle = getGallerySubtitle(phase, totalCollected);

  const t = getSurfaceTheme(phase);

  const animalTypes = Object.keys(grouped);

  // One section per collapsible animal group. Collapsed sections carry no data
  // (only their header renders); the expanded one's entries virtualize.
  const sections: GallerySection[] = animalTypes.map((animalType, sectionIndex) => {
    const entries = grouped[animalType];
    return {
      animalType,
      sectionIndex,
      isNewest: sectionIndex === 0,
      entriesTotal: entries.length,
      data: expandedAnimal === animalType ? entries : [],
    };
  });

  const renderSectionHeader = ({ section }: { section: GallerySection }) => {
    const { animalType, sectionIndex, isNewest, entriesTotal } = section;
    const typedAnimal = animalType as keyof typeof ANIMAL_INFO;
    const animalName = ANIMAL_INFO[typedAnimal]?.name || animalType;
    const animalEmoji = ANIMAL_INFO[typedAnimal]?.emoji || '🐾';
    const animalSprite = CHARACTER_SPRITES[animalType as AnimalType]?.idle;
    const isExpanded = expandedAnimal === animalType;

    const headerBody = (
      <View style={isNewest ? styles.shimmerClip : undefined}>
        <TouchableOpacity
          onPress={() => setExpandedAnimal(isExpanded ? null : animalType)}
          accessibilityLabel={`${animalName}: ${entriesTotal} entries`}
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
                {entriesTotal}
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
        {isNewest && <HeaderShimmer phase={phase} />}
      </View>
    );

    // Only the first on-screen headers cascade, and only while armed.
    if (cascadeArmed && sectionIndex < GALLERY_CASCADE_WINDOW) {
      return (
        <EntranceCascadeItem
          phase={phase}
          delay={getCascadeDelayMs(sectionIndex, { baseMs: HEADER_CASCADE_BASE_MS })}
        >
          {headerBody}
        </EntranceCascadeItem>
      );
    }
    return headerBody;
  };

  const renderEntry = ({ item }: { item: WhisperEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: t.sectionBg, borderColor: t.sectionBorder }]}>
      <View
        style={styles.entryTypeRow}
        accessible
        accessibilityLabel={getPhaseEraName(item.phase)}
      >
        <Image source={getEntryTypeIcon(item.type)} style={styles.entryTypeIcon} />
        <Text style={[styles.entryType, { color: t.muted }]}>
          {getPhaseEraName(item.phase)}
        </Text>
      </View>
      <Text style={[styles.entryText, { color: t.body }]}>
        &ldquo;{item.text}&rdquo;
      </Text>
    </View>
  );

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
        <EntranceCascadeItem phase={phase}>
          <PanelCard phase={phase} kind="card" style={styles.titlePlaque}>
            <Text style={[styles.title, { color: t.title }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: t.muted }]}>{subtitle}</Text>
          </PanelCard>
        </EntranceCascadeItem>
      </View>

      <SectionList
        style={styles.scrollView}
        sections={sections}
        keyExtractor={(item, index) => item.id || `${item.animalType}-${index}`}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderEntry}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
        stickySectionHeadersEnabled={false}
        extraData={`${expandedAnimal}-${cascadeArmed}-${phase}`}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(40, screenInsets.bottom) }]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={t.headerTitle} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <PanelCard phase={phase} kind="card" style={styles.emptyCard}>
                <Image source={FLAME_ICON} style={styles.emptyIcon} resizeMode="contain" />
                <Text style={[styles.emptyText, { color: t.body }]}>
                  {getWhisperGalleryEmptyText(phase as DialoguePhase)}
                </Text>
              </PanelCard>
            </View>
          )
        }
      />
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
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionFooter: {
    height: 12,
  },
  // Clips the one-time shimmer sweep to the newest card's bounds. Rectangular
  // (no borderRadius) so it never rounds the card's baked pixel-frame corners.
  shimmerClip: {
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    left: 0,
    width: 56,
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
    fontFamily: BODY_FONT,
    fontSize: 22,
  },
  animalName: {
    fontFamily: PIXEL_FONT_BOLD,
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
    fontFamily: PIXEL_FONT_BOLD,
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
  entryTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  entryTypeIcon: {
    width: 17,
    height: 17,
  },
  entryType: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  entryText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default WhisperGalleryScreen;
