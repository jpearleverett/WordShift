import { TEXT_ROLE } from '../theme/typography';
import { AppText } from './ui/AppText';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DialoguePhase } from '../types/homeWorld';
import { getSettingsSync } from '../services/settings';
import { StoryMemory, STORY_COPY, getStoryPages, getStoryPresentationPhase } from '../services/storySpine';
import { getStorySpeakerName } from '../services/storyArchive';
import { announceForA11y } from '../services/a11yAnnounce';
import { BODY_FONT, BODY_FONT_ITALIC } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { StoryPortrait } from './StoryPortrait';
import { STORY_ART } from './storyArt';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';

export interface StorySceneModalProps {
  memory: StoryMemory | null; phase: DialoguePhase;
  onAdvance: () => Promise<void>; onChoose: (choice: string) => Promise<void>; onClose: () => void;
}
export const StorySceneModal: React.FC<StorySceneModalProps> = ({ memory, phase, onAdvance, onChoose, onClose }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const theme = getSurfaceTheme(phase);
  const scroll = useRef<ScrollView>(null);
  const busy = useRef(false);
  const retry = useRef<(() => Promise<void>) | null>(null);
  const [saving, setSaving] = useState(false);
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
  useEffect(() => {
    retry.current = null;
  }, [pageKey]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (line) announceForA11y(`${speakerName}. ${line.text}`);
  }, [memory?.scene.id, memory?.page, speakerName, line?.text]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (action: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; retry.current = action; setSaving(true); setError(false);
    try { await action(); retry.current = null; } catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  };
  const close = () => { if (!busy.current) onClose(); };
  return <Modal visible={!!memory && !!line} transparent animationType={getSettingsSync().reducedMotion ? 'none' : 'fade'} onRequestClose={close}>
    <View style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <PanelCard phase={phase} kind="panel" style={{ width: '100%', maxWidth: 560, maxHeight: height - insets.top - insets.bottom - 32 }}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">
          {visiblePage === 0 && presentationPhase < 3 && memory && ['cup', 'supper', 'plum'].includes(memory.scene.id) && <Image source={STORY_ART.tableHeader} resizeMode="cover" style={styles.sceneArt} accessible={false} />}
          <AppText textRole="title" accessibilityRole="header"  style={[styles.title, { color: theme.title }]}>{memory?.scene.title}</AppText>
          {line && line.speaker !== 'narrator' && line.speaker !== 'player' && <StoryPortrait speaker={line.speaker} phase={presentationPhase} passage={`${memory?.scene.id}:${visiblePage}`} />}
          <AppText textRole="label"  style={[styles.speaker, { color: theme.title }]}>{speakerName}</AppText>
          <AppText textRole="reading"  style={[styles.body, line?.speaker === 'narrator' && styles.narration, { color: theme.body }]}>{line?.text}</AppText>
          <View style={styles.actions}>
            <AppText textRole="caption" accessibilityLabel={`Page ${visiblePage + 1} of ${pages.length}`} style={[styles.status, { color: theme.muted }]}>{visiblePage + 1} / {pages.length}</AppText>
            {options?.length ? options.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { void run(() => onChoose(option.id)); }} style={({ pressed }) => [styles.option, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder, opacity: saving ? 0.6 : pressed ? 0.8 : 1 }]}>
              <AppText textRole="label"  style={[styles.optionText, { color: theme.title }]}>{option.label}</AppText>
            </Pressable>) : <CandyButton phase={phase} label={memory && visiblePage >= pages.length - 1 ? STORY_COPY.finish : STORY_COPY.continue} disabled={saving} onPress={() => { if (memory && visiblePage < memory.page) setReadingPage(visiblePage + 1); else void run(onAdvance); }} soundKind="none" />}
            {visiblePage > 0 && <CandyButton phase={phase} label={STORY_COPY.previousPage} disabled={saving} onPress={() => setReadingPage(visiblePage - 1)} variant="quiet" soundKind="none" />}
            {saving && <AppText textRole="caption" accessibilityLiveRegion="polite" style={[styles.status, { color: theme.muted }]}>{STORY_COPY.saving}</AppText>}
            {error && <View accessibilityLiveRegion="assertive"><AppText textRole="caption" style={[styles.status, { color: theme.body }]}>{STORY_COPY.saveError}</AppText><CandyButton phase={phase} label={STORY_COPY.retry} onPress={() => { if (retry.current) void run(retry.current); }} variant="secondary" /></View>}
            <CandyButton phase={phase} label={STORY_COPY.later} onPress={close} disabled={saving} variant="quiet" soundKind="none" />
          </View>
        </ScrollView>
      </PanelCard>
    </View>
  </Modal>;
};
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  content: { paddingHorizontal: SURFACE.panelPadX, paddingVertical: 32 },
  sceneArt: { width: '100%', height: 132, marginBottom: 20 },
  title: { ...TEXT_ROLE.title, textAlign: 'center', marginBottom: 18 },
  portrait: { width: 96, height: 96, alignSelf: 'center', marginBottom: 8 },
  speaker: { ...TEXT_ROLE.label, marginBottom: 10 },
  body: { ...TEXT_ROLE.reading, marginBottom: 24 },
  narration: { fontFamily: BODY_FONT_ITALIC },
  actions: { gap: 12 },
  option: { minHeight: 56, padding: 16, borderWidth: 1 },
  optionText: { ...TEXT_ROLE.label, lineHeight: 24 },
  status: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 22, marginBottom: 10 },
});
export default StorySceneModal;
