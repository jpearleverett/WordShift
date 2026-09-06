import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TouchableOpacity as GestureTouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DialoguePhase } from '../../types/homeWorld';
import { StoryContext, StoryWorldKeepsake, inspectStoryWorld } from '../../services/storySpine';
import { logEvent } from '../../services/eventLogger';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { BODY_FONT, PIXEL_FONT_BOLD } from '../../theme/fonts';
import { getSurfaceTheme } from '../../theme/surfaces';
import { CandyButton } from '../ui/CandyButton';
import { PanelCard } from '../ui/PanelCard';
import { STORY_ART } from '../storyArt';
const WorldButton = Platform.OS === 'web' ? TouchableOpacity : GestureTouchableOpacity;

/** Part of the foundation, with the same touch arbitration as the resident sprites. */
export function StoryWorldObject({ keepsake, onPress }: { keepsake: StoryWorldKeepsake; onPress: () => void }) {
  const door = keepsake.boundary === 'remember';
  return <WorldButton onPress={onPress} accessibilityRole="button" accessibilityLabel={`Inspect ${keepsake.title.toLowerCase()}`} style={styles.object}>
    <View style={door ? styles.door : styles.gate} pointerEvents="none">
      <View style={styles.plank} /><View style={styles.plank} />
      {door ? <View style={styles.latch} /> : <View style={styles.crossbar} />}
    </View>
    <Text style={styles.objectLabel}>{door ? 'PRIVATE' : 'OUTWARD'}</Text>
  </WorldButton>;
}

export function StoryWorldInspection({ keepsake, context, phase, onClose, onInspected }: {
  keepsake: StoryWorldKeepsake | null; context: StoryContext | null; phase: DialoguePhase;
  onClose: () => void; onInspected: () => void;
}) {
  const theme = getSurfaceTheme(phase);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { setChecked(false); setError(false); }, [keepsake?.boundary, !!keepsake]);
  const inspect = async () => {
    if (!context || !keepsake || busy) return;
    setBusy(true); setError(false);
    try {
      await inspectStoryWorld(context);
      logEvent({ type: 'story_world_inspected', data: { boundary: keepsake.boundary, cycle: context.cycleCount, inherited: keepsake.inherited } });
      setChecked(true); onInspected();
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <Modal visible={!!keepsake} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, backgroundColor: theme.overlay }]} accessibilityViewIsModal>
      <PanelCard phase={phase} style={styles.panel}>
        <ScrollView contentContainerStyle={styles.reading}>
          <Image source={keepsake?.boundary === 'remember' ? STORY_ART.privateHeader : STORY_ART.roadHeader} style={styles.art} resizeMode="cover" accessible={false} />
          <Text accessibilityRole="header" style={[styles.title, { color: theme.title }]}>{keepsake?.title}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.body }]}>{checked ? keepsake?.result : keepsake?.invitation}</Text>
          {checked && <Text style={[styles.body, { color: theme.body }]}>{keepsake?.residentLine}</Text>}
          {checked && keepsake?.cupLine && <Text style={[styles.body, { color: theme.body }]}>{keepsake.cupLine}</Text>}
          {checked && keepsake?.replyLine && <Text style={[styles.body, { color: theme.body }]}>{keepsake.replyLine}</Text>}
          {!checked && <CandyButton phase={phase} label={keepsake?.action ?? 'Look closer'} disabled={busy} onPress={() => { void inspect(); }} />}
          {error && <Text accessibilityLiveRegion="assertive" style={[styles.body, { color: theme.body }]}>The page did not settle. Try once more.</Text>}
          <CandyButton phase={phase} label="Back to the house" variant="quiet" disabled={busy} onPress={onClose} />
        </ScrollView>
      </PanelCard>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  object: { position: 'absolute', right: 8, bottom: 8, width: 64, minHeight: 72, alignItems: 'center', zIndex: 5 },
  door: { width: 40, height: 54, backgroundColor: '#573B31', borderWidth: 4, borderColor: '#A38158', flexDirection: 'row', gap: 3, padding: 3 },
  gate: { width: 48, height: 48, borderLeftWidth: 5, borderRightWidth: 5, borderColor: '#A38158', flexDirection: 'row', gap: 5, padding: 5 },
  plank: { flex: 1, backgroundColor: '#725143' },
  latch: { position: 'absolute', right: 4, top: 24, width: 5, height: 5, backgroundColor: '#E8C77C' },
  crossbar: { position: 'absolute', top: 24, left: 0, right: 0, height: 6, backgroundColor: '#A38158', transform: [{ rotate: '-25deg' }] },
  objectLabel: { fontFamily: PIXEL_FONT_BOLD, fontSize: 9, color: '#F5E4C2', backgroundColor: '#352B30', paddingHorizontal: 4, paddingVertical: 3 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 560, maxHeight: '100%' },
  reading: { padding: 24, gap: 16 },
  art: { width: '100%', height: 180 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22, lineHeight: 30 },
  body: { fontFamily: BODY_FONT, fontSize: 18, lineHeight: 29 },
});
