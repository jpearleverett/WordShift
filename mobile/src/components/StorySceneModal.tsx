import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DialoguePhase } from '../types/homeWorld';
import { getSettingsSync } from '../services/settings';
import { StoryMemory, STORY_COPY, getStoryPages, getStoryPresentationPhase } from '../services/storySpine';
import { getStorySpeakerName } from '../services/storyArchive';
import { announceForA11y } from '../services/a11yAnnounce';
import { BODY_FONT, BODY_FONT_ITALIC, PIXEL_FONT_BOLD } from '../theme/fonts';
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
  const [error, setError] = useState(false);
  const [readingPage, setReadingPage] = useState(memory?.page ?? 0);
  useEffect(() => { setReadingPage(memory?.page ?? 0); }, [memory?.scene.id, memory?.page]);
  const pages = memory ? getStoryPages(memory) : [];
  const visiblePage = memory ? Math.min(readingPage, memory.page, pages.length - 1) : 0;
  const line = memory ? pages[visiblePage] : undefined;
  const speakerName = line ? getStorySpeakerName(line.speaker) : '';
  const options = memory && visiblePage === memory.page && !memory.choice && memory.page === memory.scene.lines.length - 1 ? memory.scene.options : undefined;
  const presentationPhase = memory ? getStoryPresentationPhase(memory) : phase;
  useEffect(() => {
    setError(false); retry.current = null;
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
          <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, { color: theme.title }]}>{memory?.scene.title}</Text>
          {line && line.speaker !== 'narrator' && line.speaker !== 'player' && <StoryPortrait speaker={line.speaker} phase={presentationPhase} passage={`${memory?.scene.id}:${visiblePage}`} />}
          <Text maxFontSizeMultiplier={2} style={[styles.speaker, { color: theme.title }]}>{speakerName}</Text>
          <Text maxFontSizeMultiplier={2} style={[styles.body, line?.speaker === 'narrator' && styles.narration, { color: theme.body }]}>{line?.text}</Text>
          <View style={styles.actions}>
            <Text accessibilityLabel={`Page ${visiblePage + 1} of ${pages.length}`} style={[styles.status, { color: theme.muted }]}>{visiblePage + 1} / {pages.length}</Text>
            {options?.length ? options.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => { void run(() => onChoose(option.id)); }} style={({ pressed }) => [styles.option, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder, opacity: saving ? 0.6 : pressed ? 0.8 : 1 }]}>
              <Text maxFontSizeMultiplier={2} style={[styles.optionText, { color: theme.title }]}>{option.label}</Text>
            </Pressable>) : <CandyButton phase={phase} label={memory && visiblePage >= pages.length - 1 ? STORY_COPY.finish : STORY_COPY.continue} disabled={saving} onPress={() => { if (memory && visiblePage < memory.page) setReadingPage(visiblePage + 1); else void run(onAdvance); }} soundKind="none" />}
            {visiblePage > 0 && <CandyButton phase={phase} label={STORY_COPY.previousPage} disabled={saving} onPress={() => setReadingPage(visiblePage - 1)} variant="quiet" soundKind="none" />}
            {saving && <Text accessibilityLiveRegion="polite" style={[styles.status, { color: theme.muted }]}>{STORY_COPY.saving}</Text>}
            {error && <View accessibilityLiveRegion="assertive"><Text style={[styles.status, { color: theme.body }]}>{STORY_COPY.saveError}</Text><CandyButton phase={phase} label={STORY_COPY.retry} onPress={() => { if (retry.current) void run(retry.current); }} variant="secondary" /></View>}
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
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22, lineHeight: 29, textAlign: 'center', marginBottom: 18 },
  portrait: { width: 96, height: 96, alignSelf: 'center', marginBottom: 8 },
  speaker: { fontFamily: PIXEL_FONT_BOLD, fontSize: 15, lineHeight: 23, marginBottom: 10 },
  body: { fontFamily: BODY_FONT, fontSize: 18, lineHeight: 30, marginBottom: 24 },
  narration: { fontFamily: BODY_FONT_ITALIC },
  actions: { gap: 12 },
  option: { minHeight: 56, padding: 16, borderWidth: 1 },
  optionText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 16, lineHeight: 24 },
  status: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 22, marginBottom: 10 },
});
export default StorySceneModal;
