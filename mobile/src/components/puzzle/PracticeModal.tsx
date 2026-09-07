import { TEXT_ROLE } from '../../theme/typography';
import { AppText } from '../ui/AppText';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DialoguePhase } from '../../types/homeWorld';
import { useScreenInsets } from '../../hooks/useScreenInsets';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { getSurfaceTheme, SURFACE } from '../../theme/surfaces';
import { PanelCard } from '../ui/PanelCard';
import { CandyButton } from '../ui/CandyButton';
import { announceForA11y } from '../../services/a11yAnnounce';
import { createPracticeState, PRACTICE_LESSONS, placePracticeLetter, PracticeLessonId, selectPracticeLetter } from '../../services/practiceLessons';

export interface PracticeModalProps {
  visible: boolean;
  lessonId: PracticeLessonId;
  phase: DialoguePhase;
  onClose: () => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({ visible, lessonId, phase, onClose }) => {
  const [state, setState] = useState(() => createPracticeState(lessonId));
  const insets = useScreenInsets();
  const { height } = useWindowDimensions();
  const theme = getSurfaceTheme(phase);
  const [presentation, setPresentation] = useState({ visible, lessonId });
  if (presentation.visible !== visible || presentation.lessonId !== lessonId) {
    setPresentation({ visible, lessonId });
    if (visible) setState(createPracticeState(lessonId));
  }
  useEffect(() => { if (visible) announceForA11y(state.message); }, [visible, state.message]);
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    globalThis.addEventListener?.('keydown', handleKey);
    return () => globalThis.removeEventListener?.('keydown', handleKey);
  }, [visible, onClose]);
  const lesson = PRACTICE_LESSONS[state.lessonId];
  const step = lesson.steps[state.step];
  const selectedLetter = step && state.selected != null ? state.rows[step.sourceRow][state.selected].char : null;
  const targetWord = step ? state.rows[step.targetRow].map(cell => cell.char).join('') : '';
  return <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
    <View accessibilityViewIsModal style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <PanelCard phase={phase} kind="panel" style={{ width: '100%', maxWidth: 540, maxHeight: height - insets.top - insets.bottom - 24 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>{lesson.title}</AppText>
          <AppText textRole="reading" style={[styles.body, { color: theme.body }]}>A short example. Hints and progress stay as they are.</AppText>
          <AppText textRole="reading" accessibilityLiveRegion="polite" style={[styles.body, { color: theme.body }]}>{state.message}</AppText>
          {state.rows.map((row, rowIndex) => <View key={rowIndex} style={styles.row}>
            <AppText textRole="caption" style={[styles.caption, { color: theme.body }]}>
              {step?.sourceRow === rowIndex ? 'Pick from here' : step?.targetRow === rowIndex ? 'Place into here' : 'Finished word'}
            </AppText>
            {step?.sourceRow === rowIndex && !state.failed ? <ScrollView horizontal contentContainerStyle={styles.letters}>
              {row.map((cell, index) => <Pressable key={index}
                accessibilityRole="button"
                accessibilityLabel={`${cell.char}, letter ${index + 1}${cell.locked ? ', locked' : ''}`}
                accessibilityState={{ selected: state.selected === index }}
                onPress={() => setState(previous => selectPracticeLetter(previous, index))}
                style={[styles.letter, { borderColor: theme.title, backgroundColor: state.selected === index ? theme.amberTint : 'transparent', opacity: cell.locked ? 0.6 : 1 }]}>
                <AppText textRole="label" style={[styles.letterText, { color: theme.title }]}>{cell.char}</AppText>
                {cell.locked && <AppText style={[styles.locked, { color: theme.body }]}>lock</AppText>}
              </Pressable>)}
            </ScrollView> : <AppText textRole="label" style={[styles.word, { color: theme.title }]}>{row.map(cell => cell.char).join('')}</AppText>}
          </View>)}
          {selectedLetter && <View style={styles.slots}>
            {Array.from({ length: targetWord.length + 1 }, (_, slot) => {
              const preview = targetWord.slice(0, slot) + selectedLetter + targetWord.slice(slot);
              return <Pressable key={slot} accessibilityRole="button"
                accessibilityLabel={`Position ${slot + 1}${state.lessonId === 'blind' ? '' : `, ${preview}`}`}
                onPress={() => setState(previous => placePracticeLetter(previous, slot))}
                style={[styles.slot, { borderColor: theme.title }]}>
                <AppText textRole="reading" style={[styles.body, { color: theme.title }]}>{state.lessonId === 'blind' ? `Position ${slot + 1}` : `${slot + 1}: ${preview}`}</AppText>
              </Pressable>;
            })}
          </View>}
          <CandyButton label={state.complete || state.failed ? 'Practice again' : 'Start example again'} phase={phase} variant="secondary" onPress={() => setState(createPracticeState(lessonId))} />
          <CandyButton label="Close practice" phase={phase} variant="primary" onPress={onClose} />
        </ScrollView>
      </PanelCard>
    </View>
  </Modal>;
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  content: { paddingHorizontal: SURFACE.panelPadX, paddingVertical: SURFACE.panelPadY, gap: 12 },
  title: { ...TEXT_ROLE.title, textAlign: 'center' },
  body: { ...TEXT_ROLE.body, lineHeight: 23 },
  caption: { ...TEXT_ROLE.caption, marginBottom: 6 },
  row: { gap: 4 },
  letters: { gap: 4 },
  letter: { minWidth: 44, minHeight: 52, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22 },
  locked: { fontFamily: BODY_FONT, fontSize: 10 },
  word: { fontFamily: PIXEL_FONT_BOLD, fontSize: 24, letterSpacing: 3 },
  slots: { gap: 8 },
  slot: { minHeight: 44, padding: 8, borderWidth: 1, borderRadius: 8 },
});
