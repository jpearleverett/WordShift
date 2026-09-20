import { TEXT_ROLE } from '../theme/typography';
import { AppText } from './ui/AppText';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StoryContext, StoryMemory, StorySceneId, StoryState, STORY_COPY, canResumeStoryScene, loadStoryState, selectStoryScene, getStoryPortraitSpeaker, getStoryPresentationPhase } from '../services/storySpine';
import { StoryArchiveChapter, StoryArchiveHistory, loadStoryArchiveHistory, getStoryArchiveChapterLines, getStoryArchiveChapterSummary, getStoryArchiveChapters, getStorySpeakerName, getVisibleStoryMemoryLines } from '../services/storyArchive';
import { getSettingsSync } from '../services/settings';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../theme/fonts';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { STORY_ART } from './storyArt';
import { StoryPortrait } from './StoryPortrait';

const JOURNAL_ICON = require('../../assets/ui/journal.png');
const ENTRY_PORTRAIT_SIZE = 56;

export interface StoryJournalModalProps { visible: boolean; context: StoryContext | null; onClose: () => void; onResume: (id?: StorySceneId) => void }
export const StoryJournalModal: React.FC<StoryJournalModalProps> = props => props.visible
  ? <StoryJournalContents key={JSON.stringify(props.context)} {...props} />
  : null;
const StoryJournalContents: React.FC<StoryJournalModalProps> = ({ visible, context, onClose, onResume }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const phase = context?.phase ?? 0;
  const theme = getSurfaceTheme(phase);
  const [state, setState] = useState<StoryState | null>(null);
  const [history, setHistory] = useState<StoryArchiveHistory | null>(null);
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
    Promise.all([loadStoryState(context), loadStoryArchiveHistory()])
      .then(([value, completedLines]) => {
        if (!active) return;
        setHistory(completedLines);
        setState(value);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [visible, contextKey, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const chapters = useMemo(() => context ? getStoryArchiveChapters(context, history) : [], [contextKey, history]); // eslint-disable-line react-hooks/exhaustive-deps
  const memories = state ? Object.values(state.memories).filter((value): value is StoryMemory => !!value) : [];
  const resumable = state && context ? selectStoryScene(context, state) : null;
  const earlierLines = context && chapter ? getStoryArchiveChapterLines(context, chapter.animal, history) : [];
  const memoryLines = context && selected ? getVisibleStoryMemoryLines(selected, context) : [];
  const answer = selected?.scene.options?.find(option => option.id === selected.choice)?.label;
  const back = () => { setSelected(null); setSelectedCycle(null); setChapter(null); };
  const resume = (id?: StorySceneId) => { onClose(); onResume(id); };
  // A chapter is one animal, so its title is that animal. No mood word, no name
  // for the stretch of the story the lines came from.
  const chapterTitle = (item: StoryArchiveChapter) => getStorySpeakerName(item.animal);
  const memoryCard = (memory: StoryMemory, summary: string, onPress: () => void) => {
    const resident = getStoryPortraitSpeaker(memory, 0);
    const speaker = context?.unlockedAnimals.includes(resident) ? resident : null;
    const name = speaker ? getStorySpeakerName(speaker) : STORY_COPY.narrator;
    return <Pressable key={memory.scene.id} accessibilityRole="button" accessibilityLabel={`${memory.scene.title}. ${name}. ${summary}`} onPress={onPress} style={[styles.row, styles.entryRow, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
      <View style={styles.entryPortrait} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
        {speaker ? <StoryPortrait speaker={speaker} phase={getStoryPresentationPhase(memory)} passage={`journal:${memory.scene.id}`} size={ENTRY_PORTRAIT_SIZE} speaking={false} />
          : <Image source={JOURNAL_ICON} resizeMode="contain" style={styles.fallbackPortrait} accessible={false} />}
      </View>
      <View style={styles.entryText}>
        <AppText textRole="label" style={[styles.rowTitle, { color: theme.title }]}>{memory.scene.title}</AppText>
        <AppText textRole="caption" style={[styles.rowResident, { color: theme.muted }]}>{name}</AppText>
        <AppText textRole="caption" style={[styles.rowBody, { color: theme.body }]}>{summary}</AppText>
      </View>
    </Pressable>;
  };
  return <Modal visible={visible} transparent animationType={getSettingsSync().reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
      <PanelCard phase={phase} kind="panel" style={{ width: '100%', maxWidth: 660, height: height - insets.top - insets.bottom - 24 }}>
        <View style={styles.header}>
          <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>{selected?.scene.title ?? (chapter ? chapterTitle(chapter) : STORY_COPY.journalTitle)}</AppText>
          {!selected && !chapter && <AppText textRole="caption" style={[styles.subtitle, { color: theme.muted }]}>{STORY_COPY.journalSubtitle}</AppText>}
          {(selected || chapter) && <CandyButton phase={phase} label={STORY_COPY.back} onPress={back} variant="quiet" />}
        </View>
        {error ? <View style={styles.message}><AppText textRole="reading" style={[styles.body, { color: theme.body }]}>{STORY_COPY.journalLoadError}</AppText><CandyButton phase={phase} label={STORY_COPY.retry} onPress={() => { setError(false); setAttempt(value => value + 1); }} /></View> : !state ? <AppText textRole="reading" style={[styles.message, styles.body, { color: theme.body }]}>{STORY_COPY.loading}</AppText> : selected ? <ScrollView style={styles.scroll} contentContainerStyle={styles.reading}>
          {selectedCycle !== null && <AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>Cycle {selectedCycle + 1}. This answer belongs to that earlier morning.</AppText>}
          {selected.completed && <AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{selected.scene.memory}</AppText>}
          {answer && <AppText textRole="label" style={[styles.answer, { color: theme.title }]}>{STORY_COPY.savedChoice}: {answer}</AppText>}
          {memoryLines.map((line, index) => <View key={`${index}:${line.speaker}`} style={styles.line}><AppText textRole="label" style={[styles.speaker, { color: theme.title }]}>{getStorySpeakerName(line.speaker)}</AppText><AppText textRole="reading"  style={[styles.body, { color: theme.body }]}>{line.text}</AppText></View>)}
          {selectedCycle === null && context && state && canResumeStoryScene(context, state, selected.scene.id) && <CandyButton phase={phase} label={STORY_COPY.resume} onPress={() => resume(selected.scene.id)} />}
        </ScrollView> : chapter ? <FlatList style={styles.scroll} key={chapter.id} data={earlierLines} keyExtractor={item => item.id} initialNumToRender={6} windowSize={5} contentContainerStyle={styles.reading} ListHeaderComponent={<AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.archiveHint}</AppText>} renderItem={({ item }) => <AppText  style={[styles.archiveLine, styles.body, { color: theme.body, borderColor: theme.sectionBorder }]}>{item.text}</AppText>} /> : <>
          <View style={styles.tabs}>{(['memories', 'archive'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, { borderColor: theme.sectionBorder, backgroundColor: tab === value ? theme.sectionBg : 'transparent' }]}><AppText textRole="label" style={[styles.tabText, { color: theme.title }]}>{STORY_COPY[value]}</AppText></Pressable>)}</View>
          {tab === 'memories' ? <ScrollView style={styles.scroll} contentContainerStyle={styles.reading}>
            <Image source={STORY_ART.tableHeader} resizeMode="cover" style={styles.art} accessible={false} />
            {memories.length === 0 && <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>{STORY_COPY.empty}</AppText>}
            {memories.map(memory => memoryCard(memory, memory.completed ? memory.scene.memory : context && canResumeStoryScene(context, state, memory.scene.id) ? STORY_COPY.unread : STORY_COPY.archivedPages, () => setSelected(memory)))}
            {resumable && <CandyButton phase={phase} label={STORY_COPY.resume} onPress={() => resume()} variant="secondary" />}
            {!!state.previousCycles?.length && <>
              <AppText textRole="label" accessibilityRole="header" style={[styles.rowTitle, { color: theme.title, marginTop: 28 }]}>{STORY_COPY.previousCycles}</AppText>
              <AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.cycleHistoryHint}</AppText>
              {[...state.previousCycles].reverse().map(cycle => <View key={cycle.cycle}>
                <AppText textRole="label" style={[styles.speaker, { color: theme.title }]}>Cycle {cycle.cycle + 1}{cycle.boundary ? ` · ${cycle.boundary === 'remember' ? 'CLOSED' : 'CLOSER'}` : ''}</AppText>
                {Object.values(cycle.memories).filter((memory): memory is StoryMemory => !!memory).map(memory => memoryCard(memory, memory.completed ? memory.scene.memory : STORY_COPY.archivedPages, () => { setSelectedCycle(cycle.cycle); setSelected(memory); }))}
              </View>)}
            </>}
          </ScrollView> : <FlatList style={styles.scroll} key="chapters" data={chapters} keyExtractor={item => item.id} initialNumToRender={12} windowSize={5} contentContainerStyle={styles.reading} ListHeaderComponent={<AppText textRole="caption" style={[styles.summary, { color: theme.muted }]}>{STORY_COPY.archiveHint}</AppText>} ListEmptyComponent={<AppText textRole="reading" style={[styles.body, { color: theme.body }]}>{STORY_COPY.archiveEmpty}</AppText>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${getStorySpeakerName(item.animal)}. ${getStoryArchiveChapterSummary(item.count)}`} onPress={() => setChapter(item)} style={[styles.row, styles.entryRow, { backgroundColor: theme.sectionBg, borderColor: theme.sectionBorder }]}>
            <View style={styles.entryPortrait} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none"><StoryPortrait speaker={item.animal} phase={phase} passage={`archive:${item.animal}`} size={ENTRY_PORTRAIT_SIZE} speaking={false} /></View>
            <View style={styles.entryText}><AppText textRole="label" style={[styles.rowTitle, { color: theme.title }]}>{getStorySpeakerName(item.animal)}</AppText><AppText textRole="caption" style={[styles.rowBody, { color: theme.body }]}>{getStoryArchiveChapterSummary(item.count)}</AppText></View>
          </Pressable>} />}
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
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryPortrait: { width: ENTRY_PORTRAIT_SIZE, flexShrink: 0, alignItems: 'center' },
  fallbackPortrait: { width: ENTRY_PORTRAIT_SIZE, height: ENTRY_PORTRAIT_SIZE },
  entryText: { flex: 1, minWidth: 0 },
  rowResident: { ...TEXT_ROLE.caption, marginBottom: 4 },
  rowTitle: { ...TEXT_ROLE.label, marginBottom: 6 },
  rowBody: { ...TEXT_ROLE.caption, lineHeight: 23 },
  footer: { paddingHorizontal: SURFACE.panelPadX, paddingTop: 12, paddingBottom: 26 },
});
export default StoryJournalModal;
