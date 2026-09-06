import { TEXT_ROLE } from '../theme/typography';
import { AppText } from './ui/AppText';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
export const StoryJournalModal: React.FC<StoryJournalModalProps> = props => props.visible
  ? <StoryJournalContents key={JSON.stringify(props.context)} {...props} />
  : null;
const StoryJournalContents: React.FC<StoryJournalModalProps> = ({ visible, context, onClose, onResume }) => {
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
          <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>{selected?.scene.title ?? (chapter ? chapterTitle(chapter) : STORY_COPY.journalTitle)}</AppText>
          {!selected && !chapter && <AppText textRole="caption" style={[styles.subtitle, { color: theme.muted }]}>{STORY_COPY.journalSubtitle}</AppText>}
          {(selected || chapter) && <CandyButton phase={phase} label={STORY_COPY.back} onPress={back} variant="quiet" />}
        </View>
        {error ? <View style={styles.message}><AppText textRole="reading" style={[styles.body, { color: theme.body }]}>{STORY_COPY.saveError}</AppText><CandyButton phase={phase} label={STORY_COPY.retry} onPress={() => { setError(false); setAttempt(value => value + 1); }} /></View> : !state ? <AppText textRole="reading" style={[styles.message, styles.body, { color: theme.body }]}>{STORY_COPY.loading}</AppText> : selected ? <ScrollView style={styles.scroll} contentContainerStyle={styles.reading}>
          {selectedCycle !== null && <AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>Cycle {selectedCycle + 1}. This answer belongs to that earlier morning.</AppText>}
          {selected.completed && <AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{selected.scene.memory}</AppText>}
          {answer && <AppText textRole="label" style={[styles.answer, { color: theme.title }]}>{STORY_COPY.savedChoice}: {answer}</AppText>}
          {memoryLines.map((line, index) => <View key={`${index}:${line.speaker}`} style={styles.line}><AppText textRole="label" style={[styles.speaker, { color: theme.title }]}>{getStorySpeakerName(line.speaker)}</AppText><AppText textRole="reading"  style={[styles.body, { color: theme.body }]}>{line.text}</AppText></View>)}
          {selectedCycle === null && !selected.completed && resumable === selected.scene.id && <CandyButton phase={phase} label={STORY_COPY.resume} onPress={resume} />}
        </ScrollView> : chapter ? <FlatList style={styles.scroll} key={chapter.id} data={earlierLines} keyExtractor={item => item.id} initialNumToRender={6} windowSize={5} contentContainerStyle={styles.reading} ListHeaderComponent={<AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.archiveHint}</AppText>} renderItem={({ item }) => <AppText  style={[styles.archiveLine, styles.body, { color: theme.body, borderColor: theme.sectionBorder }]}>{item.text}</AppText>} /> : <>
          <View style={styles.tabs}>{(['memories', 'archive'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, { borderColor: theme.sectionBorder, backgroundColor: tab === value ? theme.sectionBg : 'transparent' }]}><AppText textRole="label" style={[styles.tabText, { color: theme.title }]}>{STORY_COPY[value]}</AppText></Pressable>)}</View>
          {tab === 'memories' ? <ScrollView style={styles.scroll} contentContainerStyle={styles.reading}>
            <Image source={STORY_ART.tableHeader} resizeMode="cover" style={styles.art} accessible={false} />
            {memories.length === 0 && <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>{STORY_COPY.empty}</AppText>}
            {memories.map(memory => <Pressable key={memory.scene.id} accessibilityRole="button" onPress={() => setSelected(memory)} style={[styles.row, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}><AppText textRole="label" style={[styles.rowTitle, { color: theme.title }]}>{memory.scene.title}</AppText><AppText textRole="caption" style={[styles.rowBody, { color: theme.body }]}>{memory.completed ? memory.scene.memory : STORY_COPY.unread}</AppText></Pressable>)}
            {resumable && <CandyButton phase={phase} label={STORY_COPY.resume} onPress={resume} variant="secondary" />}
            {!!state.previousCycles?.length && <>
              <AppText textRole="label" accessibilityRole="header" style={[styles.rowTitle, { color: theme.title, marginTop: 28 }]}>{STORY_COPY.previousCycles}</AppText>
              <AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.cycleHistoryHint}</AppText>
              {[...state.previousCycles].reverse().map(cycle => <View key={cycle.cycle}>
                <AppText textRole="label" style={[styles.speaker, { color: theme.title }]}>Cycle {cycle.cycle + 1}{cycle.boundary ? ` · ${cycle.boundary === 'remember' ? 'CLOSED' : 'CLOSER'}` : ''}</AppText>
                {Object.values(cycle.memories).filter((memory): memory is StoryMemory => !!memory).map(memory => <Pressable key={memory.scene.id} accessibilityRole="button" onPress={() => { setSelectedCycle(cycle.cycle); setSelected(memory); }} style={[styles.row, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
                  <AppText textRole="label" style={[styles.rowTitle, { color: theme.title }]}>{memory.scene.title}</AppText>
                  <AppText textRole="caption" style={[styles.rowBody, { color: theme.body }]}>{memory.completed ? memory.scene.memory : 'The pages you reached'}</AppText>
                </Pressable>)}
              </View>)}
            </>}
          </ScrollView> : <FlatList style={styles.scroll} key="chapters" data={chapters} keyExtractor={item => item.id} initialNumToRender={12} windowSize={5} contentContainerStyle={styles.reading} ListHeaderComponent={<AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.archiveHint}</AppText>} ListEmptyComponent={<AppText textRole="reading" style={[styles.body, { color: theme.body }]}>{STORY_COPY.archiveEmpty}</AppText>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setChapter(item)} style={[styles.row, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}><AppText textRole="label" style={[styles.rowTitle, { color: theme.title }]}>{getStorySpeakerName(item.animal)}</AppText><AppText textRole="caption" style={[styles.rowBody, { color: theme.body }]}>{STORY_COPY.archiveChapterTitles[item.phase]}</AppText></Pressable>} />}
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
  title: { ...TEXT_ROLE.title, lineHeight: 30 },
  subtitle: { fontFamily: BODY_FONT, fontSize: 14, lineHeight: 22 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: SURFACE.panelPadX, paddingBottom: 12 },
  tab: { flex: 1, minHeight: 48, justifyContent: 'center', padding: 10, borderWidth: 1 },
  tabText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  reading: { paddingHorizontal: SURFACE.panelPadX, paddingBottom: 20 },
  art: { width: '100%', height: 148, marginBottom: 20 },
  message: { flex: 1, padding: SURFACE.panelPadX },
  body: { ...TEXT_ROLE.reading, lineHeight: 28 },
  speaker: { ...TEXT_ROLE.label, marginBottom: 8 },
  line: { marginBottom: 24 },
  summary: { fontFamily: BODY_FONT, fontSize: 15, lineHeight: 25, marginBottom: 22 },
  answer: { fontFamily: PIXEL_FONT_BOLD, fontSize: 15, lineHeight: 24, marginBottom: 24 },
  archiveLine: { paddingBottom: 22, marginBottom: 22, borderBottomWidth: 1 },
  row: { padding: 16, borderWidth: 1, marginBottom: 12, minHeight: 72 },
  rowTitle: { ...TEXT_ROLE.label, marginBottom: 6 },
  rowBody: { ...TEXT_ROLE.caption, lineHeight: 23 },
  footer: { paddingHorizontal: SURFACE.panelPadX, paddingTop: 12, paddingBottom: 26 },
});
export default StoryJournalModal;
