import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoryContext, StoryMemory, StoryState, STORY_COPY, loadStoryState, selectStoryScene } from '../services/storySpine';
import { StoryArchiveChapter, getStoryArchiveChapters, getStoryArchiveDialogues, getStorySpeakerName, getVisibleStoryMemoryLines } from '../services/storyArchive';
import { getSettingsSync } from '../services/settings';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { STORY_ART } from './storyArt';

export interface StoryJournalModalProps { visible: boolean; context: StoryContext | null; onClose: () => void; onResume: () => void }
export const StoryJournalModal: React.FC<StoryJournalModalProps> = ({ visible, context, onClose, onResume }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const phase = context?.phase ?? 0;
  const theme = getSurfaceTheme(phase);
  const [state, setState] = useState<StoryState | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'memories' | 'archive'>('memories');
  const [selected, setSelected] = useState<StoryMemory | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [chapter, setChapter] = useState<StoryArchiveChapter | null>(null);
  const contextKey = JSON.stringify(context);
  useEffect(() => {
    if (!visible || !context) return;
    let active = true;
    setState(null); setError(false); setSelected(null); setSelectedCycle(null); setChapter(null);
    loadStoryState(context).then(value => { if (active) setState(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [visible, contextKey, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const chapters = useMemo(() => context ? getStoryArchiveChapters(context) : [], [contextKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const memories = state ? Object.values(state.memories).filter((value): value is StoryMemory => !!value) : [];
  const resumable = state && context ? selectStoryScene(context, state) : null;
  const earlierLines = context && chapter ? getStoryArchiveDialogues(context, chapter.animal, chapter.phase) : [];
  const memoryLines = context && selected ? getVisibleStoryMemoryLines(selected, context) : [];
  const answer = selected?.scene.options?.find(option => option.id === selected.choice)?.label;
  const back = () => { setSelected(null); setSelectedCycle(null); setChapter(null); };
  const resume = () => { onClose(); onResume(); };
  const chapterTitle = (item: StoryArchiveChapter) => `${getStorySpeakerName(item.animal)} · ${STORY_COPY.archiveChapterTitles[item.phase]}`;
  return <Modal visible={visible} transparent animationType={getSettingsSync().reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
      <PanelCard phase={phase} kind="panel" style={{ width: '100%', maxWidth: 660, height: height - insets.top - insets.bottom - 24 }}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.title }]}>{selected?.scene.title ?? (chapter ? chapterTitle(chapter) : STORY_COPY.journalTitle)}</Text>
          {!selected && !chapter && <Text style={[styles.subtitle, { color: theme.muted }]}>{STORY_COPY.journalSubtitle}</Text>}
          {(selected || chapter) && <CandyButton phase={phase} label={STORY_COPY.back} onPress={back} variant="quiet" />}
        </View>
        {error ? <View style={styles.message}><Text style={[styles.body, { color: theme.body }]}>{STORY_COPY.saveError}</Text><CandyButton phase={phase} label={STORY_COPY.retry} onPress={() => setAttempt(value => value + 1)} /></View> : !state ? <Text style={[styles.message, styles.body, { color: theme.body }]}>{STORY_COPY.loading}</Text> : selected ? <ScrollView style={styles.scroll} contentContainerStyle={styles.reading}>
          {selectedCycle !== null && <Text style={[styles.summary, { color: theme.muted }]}>Cycle {selectedCycle + 1}. This answer belongs to that earlier morning.</Text>}
          {selected.completed && <Text style={[styles.summary, { color: theme.muted }]}>{selected.scene.memory}</Text>}
          {answer && <Text style={[styles.answer, { color: theme.title }]}>{STORY_COPY.savedChoice}: {answer}</Text>}
          {memoryLines.map((line, index) => <View key={`${index}:${line.speaker}`} style={styles.line}><Text style={[styles.speaker, { color: theme.title }]}>{getStorySpeakerName(line.speaker)}</Text><Text maxFontSizeMultiplier={2} style={[styles.body, { color: theme.body }]}>{line.text}</Text></View>)}
          {selectedCycle === null && !selected.completed && resumable === selected.scene.id && <CandyButton phase={phase} label={STORY_COPY.resume} onPress={resume} />}
        </ScrollView> : chapter ? <FlatList style={styles.scroll} key={chapter.id} data={earlierLines} keyExtractor={item => item.id} initialNumToRender={6} windowSize={5} contentContainerStyle={styles.reading} ListHeaderComponent={<Text style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.archiveHint}</Text>} renderItem={({ item }) => <Text maxFontSizeMultiplier={2} style={[styles.archiveLine, styles.body, { color: theme.body, borderColor: theme.sectionBorder }]}>{item.text}</Text>} /> : <>
          <View style={styles.tabs}>{(['memories', 'archive'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, { borderColor: theme.sectionBorder, backgroundColor: tab === value ? theme.sectionBg : 'transparent' }]}><Text style={[styles.tabText, { color: theme.title }]}>{STORY_COPY[value]}</Text></Pressable>)}</View>
          {tab === 'memories' ? <ScrollView style={styles.scroll} contentContainerStyle={styles.reading}>
            <Image source={STORY_ART.tableHeader} resizeMode="cover" style={styles.art} accessible={false} />
            {memories.length === 0 && <Text style={[styles.body, { color: theme.body }]}>{STORY_COPY.empty}</Text>}
            {memories.map(memory => <Pressable key={memory.scene.id} accessibilityRole="button" onPress={() => setSelected(memory)} style={[styles.row, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}><Text style={[styles.rowTitle, { color: theme.title }]}>{memory.scene.title}</Text><Text style={[styles.rowBody, { color: theme.body }]}>{memory.completed ? memory.scene.memory : STORY_COPY.unread}</Text></Pressable>)}
            {resumable && <CandyButton phase={phase} label={STORY_COPY.resume} onPress={resume} variant="secondary" />}
            {!!state.previousCycles?.length && <>
              <Text accessibilityRole="header" style={[styles.rowTitle, { color: theme.title, marginTop: 28 }]}>{STORY_COPY.previousCycles}</Text>
              <Text style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.cycleHistoryHint}</Text>
              {[...state.previousCycles].reverse().map(cycle => <View key={cycle.cycle}>
                <Text style={[styles.speaker, { color: theme.title }]}>Cycle {cycle.cycle + 1}{cycle.boundary ? ` · ${cycle.boundary === 'remember' ? 'CLOSED' : 'CLOSER'}` : ''}</Text>
                {Object.values(cycle.memories).filter((memory): memory is StoryMemory => !!memory).map(memory => <Pressable key={memory.scene.id} accessibilityRole="button" onPress={() => { setSelectedCycle(cycle.cycle); setSelected(memory); }} style={[styles.row, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
                  <Text style={[styles.rowTitle, { color: theme.title }]}>{memory.scene.title}</Text>
                  <Text style={[styles.rowBody, { color: theme.body }]}>{memory.completed ? memory.scene.memory : 'The pages you reached'}</Text>
                </Pressable>)}
              </View>)}
            </>}
          </ScrollView> : <FlatList style={styles.scroll} key="chapters" data={chapters} keyExtractor={item => item.id} initialNumToRender={12} windowSize={5} contentContainerStyle={styles.reading} ListHeaderComponent={<Text style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.archiveHint}</Text>} ListEmptyComponent={<Text style={[styles.body, { color: theme.body }]}>{STORY_COPY.archiveEmpty}</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setChapter(item)} style={[styles.row, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}><Text style={[styles.rowTitle, { color: theme.title }]}>{getStorySpeakerName(item.animal)}</Text><Text style={[styles.rowBody, { color: theme.body }]}>{STORY_COPY.archiveChapterTitles[item.phase]}</Text></Pressable>} />}
        </>}
        <View style={styles.footer}><CandyButton phase={phase} label={STORY_COPY.close} onPress={onClose} variant="quiet" /></View>
      </PanelCard>
    </View>
  </Modal>;
};
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: SURFACE.panelPadX, paddingTop: 30, paddingBottom: 16, gap: 10 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 23, lineHeight: 30 },
  subtitle: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 22 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: SURFACE.panelPadX, paddingBottom: 12 },
  tab: { flex: 1, minHeight: 48, justifyContent: 'center', padding: 10, borderWidth: 1 },
  tabText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  reading: { paddingHorizontal: SURFACE.panelPadX, paddingBottom: 20 },
  art: { width: '100%', height: 148, marginBottom: 20 },
  message: { flex: 1, padding: SURFACE.panelPadX },
  body: { fontFamily: BODY_FONT, fontSize: 17, lineHeight: 28 },
  speaker: { fontFamily: PIXEL_FONT_BOLD, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  line: { marginBottom: 24 },
  summary: { fontFamily: BODY_FONT, fontSize: 15, lineHeight: 25, marginBottom: 22 },
  answer: { fontFamily: PIXEL_FONT_BOLD, fontSize: 15, lineHeight: 24, marginBottom: 24 },
  archiveLine: { paddingBottom: 22, marginBottom: 22, borderBottomWidth: 1 },
  row: { padding: 16, borderWidth: 1, marginBottom: 12, minHeight: 72 },
  rowTitle: { fontFamily: PIXEL_FONT_BOLD, fontSize: 17, lineHeight: 24, marginBottom: 6 },
  rowBody: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 23 },
  footer: { paddingHorizontal: SURFACE.panelPadX, paddingTop: 12, paddingBottom: 26 },
});
export default StoryJournalModal;
