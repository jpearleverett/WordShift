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
import { markScreenReady } from '../services/screenReady';
import { ANIMAL_INFO } from '../services/animalDialogue';
import { getWhisperGalleryEmptyText } from '../services/phaseNarrative';
import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { CHARACTER_SPRITES } from './home/AnimalSprite';
import { FONT_SIZE } from '../theme/typeScale';
import { playUiSound, uiHapticSelection } from '../services/uiSound';

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

// --- Idle shimmer sweep -----------------------------------------------------
// ONE looping driver for the whole screen (the WordLedger breathe pattern):
// every collection bar reads its own windowed slice of it, so the sweeps are
// staggered instead of synchronized and no card owns a timer of its own.
/** Full driver period. Each bar sweeps exactly once per cycle. */
const SHIMMER_CYCLE_MS = 20000;
/** How long ONE bar's sweep takes (the old one-shot was 900ms). */
const SHIMMER_SWEEP_MS = 2400;
/** Fraction of the cycle a single bar is actually sweeping. */
const SHIMMER_WINDOW = SHIMMER_SWEEP_MS / SHIMMER_CYCLE_MS;
/** No bar sweeps before this point, so the first glint lands after the
 *  entrance cascade has settled (120ms base + 8 x 50ms stagger + fade). */
const SHIMMER_LEAD_IN = 0.08;
/** Tail margin so `offset + SHIMMER_WINDOW` can never reach 1 (an
 *  interpolation inputRange must stay monotonically increasing). */
const SHIMMER_TAIL_MARGIN = 0.02;
/** Band opacity at the middle of a sweep (unchanged from the one-shot). */
const SHIMMER_PEAK_OPACITY = 0.5;
/** Band travel, in dp, across a card. */
const SHIMMER_START_X = -60;
const SHIMMER_END_X = SCREEN_WIDTH;
/** Golden-ratio conjugate: stepping by it per list index puts neighbouring
 *  bars maximally far apart in the cycle, so the column never reads as a
 *  top-to-bottom wave. */
const SHIMMER_GOLDEN = 0.6180339887498949;
/** How far the per-animal hash may nudge a bar off its golden-ratio slot. Kept
 *  well under the golden step's guaranteed 0.382 separation so the scatter
 *  stays irregular without ever letting two neighbouring bars sweep together. */
const SHIMMER_JITTER = 0.08;

/** Cheap stable FNV-1a string hash (mirrors the seeded-shuffle convention). */
export function shimmerHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic 0..1 start position in the shared shimmer cycle for one bar.
 * A golden-ratio step by list index does the placing (consecutive indices land
 * at least 0.382 of a cycle apart, so neighbouring bars can never sweep
 * together and the column never reads as a top-to-bottom wave); the animal key
 * adds a bounded jitter so the scatter looks irregular rather than patterned,
 * the same way every run (no Math.random). Always returns a value in
 * [SHIMMER_LEAD_IN, 1 - SHIMMER_WINDOW - SHIMMER_TAIL_MARGIN] so the sweep
 * window always closes inside the cycle.
 */
export function getShimmerCycleOffset(key: string, index: number): number {
  const span = 1 - SHIMMER_WINDOW - SHIMMER_TAIL_MARGIN - SHIMMER_LEAD_IN;
  const jitter = (shimmerHash(key) / 4294967296) * SHIMMER_JITTER;
  const raw = ((index * SHIMMER_GOLDEN) + jitter) % 1;
  return SHIMMER_LEAD_IN + raw * span;
}

/** One collapsible animal group: a SectionList section (data = the entries
 *  shown while expanded; the header always shows the full count). */
interface GallerySection {
  animalType: string;
  sectionIndex: number;
  entriesTotal: number;
  data: WhisperEntry[];
}

/**
 * One bar's reflection sweep. Purely presentational: it owns NO timer and NO
 * state, it reads a windowed slice of the screen's single looping `driver`, so
 * N bars cost N interpolation nodes and zero extra animators. Outside its slice
 * the band sits off-screen at opacity 0. Native-driver transform + opacity only.
 */
const CardShimmer: React.FC<{
  phase: number;
  driver: Animated.Value;
  offset: number;
}> = ({ phase, driver, offset }) => {
  const t = getSurfaceTheme(phase);
  const end = offset + SHIMMER_WINDOW;
  const translateX = driver.interpolate({
    inputRange: [0, offset, end, 1],
    outputRange: [SHIMMER_START_X, SHIMMER_START_X, SHIMMER_END_X, SHIMMER_END_X],
  });
  const opacity = driver.interpolate({
    inputRange: [
      0,
      offset,
      offset + SHIMMER_WINDOW * 0.15,
      offset + SHIMMER_WINDOW * 0.85,
      end,
      1,
    ],
    outputRange: [0, 0, SHIMMER_PEAK_OPACITY, SHIMMER_PEAK_OPACITY, 0, 0],
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

/**
 * Disclosure chevron: rotates open/closed over ~180ms via a native-driver
 * interpolation instead of swapping two static rotated styles. Reduced
 * motion / low-tier devices snap to the target rotation instantly.
 */
const AnimatedChevron: React.FC<{ expanded: boolean; color: string }> = ({ expanded, color }) => {
  const anim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    const reduced = getSettingsSync().reducedMotion || shouldSimplifyAnimations();
    if (reduced) {
      anim.setValue(expanded ? 1 : 0);
      return;
    }
    const animation = Animated.timing(anim, {
      toValue: expanded ? 1 : 0,
      duration: 180,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, anim]);

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '-135deg'] });
  // Small vertical nudge (was a per-state marginTop) reproduced as a
  // native-driver-safe translateY instead of an animated layout property.
  const nudgeY = anim.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });

  return (
    <View style={styles.chevronBox}>
      <Animated.View
        style={[styles.chevron, { borderColor: color, transform: [{ rotate }, { translateY: nudgeY }] }]}
      />
    </View>
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
        // First real content is in state: release the navigation cover.
        markScreenReady('gallery');
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

  // The one idle animator on this surface: a single linear loop every bar's
  // shimmer reads a slice of. Skipped entirely under reduced motion / on
  // low-tier devices (the bands are not even mounted then).
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerEnabled = !galleryReducedMotion && animalTypes.length > 0;
  useEffect(() => {
    if (!shimmerEnabled) return;
    shimmerAnim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: SHIMMER_CYCLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      shimmerAnim.stopAnimation();
    };
  }, [shimmerEnabled, shimmerAnim]);

  // One section per collapsible animal group. Collapsed sections carry no data
  // (only their header renders); the expanded one's entries virtualize.
  const sections: GallerySection[] = animalTypes.map((animalType, sectionIndex) => {
    const entries = grouped[animalType];
    return {
      animalType,
      sectionIndex,
      entriesTotal: entries.length,
      data: expandedAnimal === animalType ? entries : [],
    };
  });

  const renderSectionHeader = ({ section }: { section: GallerySection }) => {
    const { animalType, sectionIndex, entriesTotal } = section;
    const typedAnimal = animalType as keyof typeof ANIMAL_INFO;
    const animalName = ANIMAL_INFO[typedAnimal]?.name || animalType;
    const animalEmoji = ANIMAL_INFO[typedAnimal]?.emoji || '🐾';
    const animalSprite = CHARACTER_SPRITES[animalType as AnimalType]?.idle;
    const isExpanded = expandedAnimal === animalType;

    const headerBody = (
      <View style={styles.shimmerClip}>
        <TouchableOpacity
          onPress={() => {
            // The gallery's most-used gesture finally ticks (the quiet
            // selection sound, so expanding a collection reads lighter than
            // committing an action).
            playUiSound('selection');
            uiHapticSelection();
            setExpandedAnimal(isExpanded ? null : animalType);
          }}
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
            <AnimatedChevron expanded={isExpanded} color={t.muted} />
          </PanelCard>
        </TouchableOpacity>
        {shimmerEnabled && (
          <CardShimmer
            phase={phase}
            driver={shimmerAnim}
            offset={getShimmerCycleOffset(animalType, sectionIndex)}
          />
        )}
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

  // Entries fade in on expand (opacity 0->1 + translateY 8->0), staggered by
  // SURFACE.staggerMs and capped at the first 8 (the rest appear alongside the
  // 8th) — the game's most atmospheric collection finally has some motion.
  // EntranceCascadeItem already lengthens the fade at deeper phases (~350ms by
  // phase 3+, matching "entries should surface, not pop") and pins the
  // settled state instantly under reduced motion / low-tier devices.
  const ENTRY_CASCADE_CAP = 8;
  const renderEntry = ({ item, index }: { item: WhisperEntry; index: number }) => {
    const card = (
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
      <EntranceCascadeItem
        phase={phase}
        delay={getCascadeDelayMs(index, { maxStaggered: ENTRY_CASCADE_CAP })}
        riseFrom={8}
      >
        {card}
      </EntranceCascadeItem>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: t.screenBg }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Soft vignette glow behind the content */}
      <View pointerEvents="none" style={[styles.vignetteGlow, { backgroundColor: t.glow }]} />

      {/* Header, safe-area top inset applied inline */}
      <View style={[styles.header, { paddingTop: screenInsets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backChip, { backgroundColor: t.cardBg, borderColor: t.cardBorder }]}
          onPress={() => { playUiSound('selection'); uiHapticSelection(); onClose(); }}
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
    fontSize: FONT_SIZE.callout,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  titlePlaque: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: SURFACE.cardPadX,
  },
  title: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.small,
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
    fontSize: FONT_SIZE.callout,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionFooter: {
    height: 12,
  },
  // Clips each collection bar's shimmer sweep to that card's own bounds.
  // Rectangular (no borderRadius) so it never rounds the card's baked
  // pixel-frame corners.
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
    paddingHorizontal: SURFACE.cardPadX,
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
    fontSize: FONT_SIZE.headline,
  },
  animalName: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.large,
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
    fontSize: FONT_SIZE.bodyLg,
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
    fontSize: FONT_SIZE.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  entryText: {
    fontFamily: BODY_FONT_ITALIC,
    fontSize: FONT_SIZE.bodyLg,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default WhisperGalleryScreen;
