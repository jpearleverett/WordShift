import { TEXT_ROLE } from '../theme/typography';
import { AppText } from './ui/AppText';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DialoguePhase } from '../types/homeWorld';
import { getSettingsSync } from '../services/settings';
import { StoryMemory, STORY_COPY, getStoryPages, getStoryPresentationPhase, getStoryPortraitSpeaker } from '../services/storySpine';
import { getStorySpeakerName } from '../services/storyArchive';
import { announceForA11y } from '../services/a11yAnnounce';
import { BODY_FONT, BODY_FONT_ITALIC } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { StoryPortrait } from './StoryPortrait';
import { getStoryPageArt } from './storyPageArt';
import { getStorySceneLayout } from './storySceneLayout';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';

/**
 * A page save normally lands within a few frames. Showing the "saving" state
 * for that window (dimmed buttons, a caption mounting under them) read as the
 * card flickering on EVERY Continue tap, so the affordance reveals only once a
 * write has been slow for this long. Fast writes never show it at all.
 *
 * On the slow path the un-dim and the page swap land in ONE commit because
 * useStoryFlow.save calls setActive before its promise resolves and run()'s
 * finally runs in the very next continuation; keep `advance` / `choose` direct
 * pass-throughs to save() so no extra await tick can split them.
 */
const SAVING_REVEAL_MS = 350;

export interface StorySceneModalProps {
  memory: StoryMemory | null; phase: DialoguePhase;
  onAdvance: () => Promise<void>; onChoose: (choice: string) => Promise<void>; onClose: () => Promise<void>;
}
export const StorySceneModal: React.FC<StorySceneModalProps> = ({ memory, phase, onAdvance, onChoose, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const theme = getSurfaceTheme(phase);
  const scroll = useRef<ScrollView>(null);
  const busy = useRef(false);
  const retry = useRef<(() => Promise<void>) | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Visible only for a SLOW write (see SAVING_REVEAL_MS). Double-tap protection
  // does not depend on it: `busy` swallows re-entry for the whole write.
  const [showSaving, setShowSaving] = useState(false);
  const pageKey = `${memory?.scene.id ?? ''}:${memory?.page ?? 0}`;
  const [errorPage, setErrorPage] = useState<string | null>(null);
  const setError = (value: boolean) => setErrorPage(value ? pageKey : null);
  const [reading, setReading] = useState<{ key: string; page: number } | null>(null);
  const readingPage = reading?.key === pageKey ? reading.page : memory?.page ?? 0;
  const setReadingPage = (page: number) => setReading({ key: pageKey, page });
  const pages = memory ? getStoryPages(memory) : [];
  const visiblePage = memory ? Math.min(readingPage, memory.page, pages.length - 1) : 0;
  const error = errorPage === pageKey && visiblePage === memory?.page;
  const line = memory ? pages[visiblePage] : undefined;
  const speakerName = line ? getStorySpeakerName(line.speaker) : '';
  const options = memory && visiblePage === memory.page && !memory.choice && memory.page === memory.scene.lines.length - 1 ? memory.scene.options : undefined;
  const presentationPhase = memory ? getStoryPresentationPhase(memory) : phase;
  // Bound both image dimensions explicitly: Android otherwise retains the
  // asset's intrinsic height even with width + aspectRatio in a ScrollView.
  const layout = getStorySceneLayout(width, height, insets.top, insets.bottom, fontScale);
  const illustration = memory && line ? getStoryPageArt(memory, visiblePage) : null;
  const portraitSpeaker = memory ? getStoryPortraitSpeaker(memory, visiblePage) : null;
  useEffect(() => {
    retry.current = null;
  }, [pageKey]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (line) announceForA11y(`${speakerName}. ${line.text}`);
  }, [memory?.scene.id, memory?.page, speakerName, line?.text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; retry.current = action; setError(false);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowSaving(true), SAVING_REVEAL_MS);
    try { await action(); retry.current = null; } catch {
      setError(true);
      // iOS has no live regions, so the failure is spoken explicitly.
      announceForA11y(STORY_COPY.saveError);
    }
    finally {
      if (revealTimer.current) clearTimeout(revealTimer.current);
      revealTimer.current = null;
      busy.current = false;
      setShowSaving(false);
    }
  };
  const close = () => { void run(onClose); };
  return <Modal visible={!!memory && !!line} transparent animationType={getSettingsSync().reducedMotion ? 'none' : 'fade'} onRequestClose={close}>
    <View style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <PanelCard phase={phase} kind="panel" style={{ width: layout.cardWidth, maxHeight: layout.cardMaxHeight, paddingVertical: SURFACE.panelPadY }}>
        <ScrollView ref={scroll} testID="story-scene-scroll" style={{ flexShrink: 1, maxHeight: layout.scrollMaxHeight }} contentContainerStyle={[styles.content, { width: layout.cardWidth }]} bounces={false} keyboardShouldPersistTaps="handled">
          {illustration && <Image source={illustration.source} testID="story-scene-art" resizeMode="contain" style={[styles.sceneArt, { width: layout.artWidth, height: layout.artHeight }]} accessible={false} />}
          <AppText textRole="title" accessibilityRole="header"  style={[styles.title, { color: theme.title }]}>{memory?.scene.title}</AppText>
          <View style={styles.speakerRow}>
            {portraitSpeaker && <StoryPortrait speaker={portraitSpeaker} phase={presentationPhase} passage={`${memory?.scene.id}:${visiblePage}`} size={layout.portraitSize} speaking={line?.speaker === portraitSpeaker} />}
            <AppText textRole="label" style={[styles.speaker, { color: theme.title }]}>{speakerName}</AppText>
          </View>
          <AppText testID="story-scene-text" textRole="reading" style={[styles.body, line?.speaker === 'narrator' && styles.narration, { color: theme.body }]}>{line?.text}</AppText>
          <View style={styles.actions}>
            {/* The counter and the slow-save caption share one line, so a
                reveal never moves a button or re-sizes the card. */}
            <View style={styles.statusRow}>
              <AppText textRole="caption" accessibilityLabel={`Page ${visiblePage + 1} of ${pages.length}`} style={[styles.status, { color: theme.muted }]}>{visiblePage + 1} / {pages.length}</AppText>
              {showSaving && <AppText textRole="caption" accessibilityLiveRegion="polite" numberOfLines={1} style={[styles.status, styles.statusSaving, { color: theme.muted }]}>{STORY_COPY.saving}</AppText>}
            </View>
            {options?.length ? options.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ disabled: showSaving }} disabled={showSaving} onPress={() => { void run(() => onChoose(option.id)); }} style={({ pressed }) => [styles.option, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder, opacity: showSaving ? 0.6 : pressed ? 0.8 : 1 }]}>
              <AppText textRole="label"  style={[styles.optionText, { color: theme.title }]}>{option.label}</AppText>
            </Pressable>) : <CandyButton phase={phase} label={memory && visiblePage >= pages.length - 1 ? STORY_COPY.finish : STORY_COPY.continue} disabled={showSaving} onPress={() => { if (memory && visiblePage < memory.page) setReadingPage(visiblePage + 1); else void run(onAdvance); }} soundKind="none" />}
            {pages.length > 1 && <View
              style={visiblePage === 0 ? styles.hiddenAction : undefined}
              pointerEvents={visiblePage === 0 ? 'none' : 'auto'}
              accessibilityElementsHidden={visiblePage === 0}
              importantForAccessibility={visiblePage === 0 ? 'no-hide-descendants' : 'auto'}
            >
              <CandyButton phase={phase} label={STORY_COPY.previousPage} disabled={showSaving || visiblePage === 0} onPress={() => { if (!busy.current && visiblePage > 0) setReadingPage(visiblePage - 1); }} variant="quiet" soundKind="none" />
            </View>}
            {error && <View accessibilityLiveRegion="assertive"><AppText textRole="caption" style={[styles.status, { color: theme.body }]}>{STORY_COPY.saveError}</AppText><CandyButton phase={phase} label={STORY_COPY.retry} onPress={() => { if (retry.current) void run(retry.current); }} variant="secondary" /></View>}
            <CandyButton phase={phase} label={STORY_COPY.later} onPress={close} disabled={showSaving} variant="quiet" soundKind="none" />
          </View>
        </ScrollView>
      </PanelCard>
    </View>
  </Modal>;
};
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  content: { paddingHorizontal: SURFACE.panelPadX },
  sceneArt: { alignSelf: 'center', flexShrink: 0, marginBottom: 12 },
  title: { ...TEXT_ROLE.title, textAlign: 'center', marginBottom: 8 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  speaker: { ...TEXT_ROLE.label, flex: 1 },
  body: { ...TEXT_ROLE.reading, marginBottom: 16 },
  narration: { fontFamily: BODY_FONT_ITALIC },
  actions: { gap: 12 },
  option: { minHeight: 56, padding: 16, borderWidth: 1 },
  optionText: { ...TEXT_ROLE.label, lineHeight: 24 },
  status: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 22, marginBottom: 10 },
  // One line for the page counter and the slow-save caption: the row's resting
  // height is the counter's own, so the caption can appear without a reflow.
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statusSaving: { flexShrink: 1, marginLeft: 12, textAlign: 'right' },
  // The previous-page bevel keeps its slot on page one so the action column
  // never grows under the thumb when page two arrives.
  hiddenAction: { opacity: 0 },
});
export default StorySceneModal;
