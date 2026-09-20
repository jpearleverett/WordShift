import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PhaseTransitionEvent } from '../services/phaseEvents';
import { announceForA11y } from '../services/a11yAnnounce';
import { getStorySpeakerName } from '../services/storyArchive';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { StoryPortrait } from './StoryPortrait';
import { AppText } from './ui/AppText';
import { CandyButton } from './ui/CandyButton';
import { PanelCard } from './ui/PanelCard';

/** A resident responds while the ceremony still owns the global story layer. */
export function PhaseReactionDialogue({ event, suspended, onComplete }: {
  event: PhaseTransitionEvent | null;
  suspended: boolean;
  onComplete: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const busy = useRef(false);
  const currentEvent = useRef(event);
  const [status, setStatus] = useState({ event, saving: false, failed: false });
  const saving = status.event === event && status.saving;
  const failed = status.event === event && status.failed;
  const scene = event?.scenes[0];
  const speaker = scene?.speaker;
  const name = speaker ? getStorySpeakerName(speaker) : '';
  useLayoutEffect(() => {
    currentEvent.current = event;
    busy.current = false;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [event]);
  useEffect(() => {
    if (!event || suspended || !scene) return;
    announceForA11y(`${name}. ${scene.text}`);
    // Back does not silently consume a response. Its visible Continue is the
    // acknowledgement, just as it is for the preceding ceremony's last page.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [event, suspended, scene, name]);
  if (!event || !scene || !speaker) return null;
  const theme = getSurfaceTheme(event.phase);
  const finish = async () => {
    if (busy.current || suspended || currentEvent.current !== event) return;
    busy.current = true;
    setStatus({ event, saving: true, failed: false });
    try {
      await onComplete();
    } catch {
      if (currentEvent.current === event) setStatus({ event, saving: false, failed: true });
    } finally {
      if (currentEvent.current === event) {
        busy.current = false;
        setStatus(previous => previous.event === event ? { ...previous, saving: false } : previous);
      }
    }
  };
  return <View
    testID="phase-reaction-dialogue"
    style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, opacity: suspended ? 0 : 1 }]}
    pointerEvents={suspended ? 'none' : 'auto'}
    accessibilityViewIsModal={!suspended}
    accessibilityElementsHidden={suspended}
    importantForAccessibility={suspended ? 'no-hide-descendants' : 'auto'}
  >
    <PanelCard phase={event.phase} kind="panel" style={{ width: Math.min(440, width - 32), maxHeight: height - insets.top - insets.bottom - 32, paddingVertical: SURFACE.panelPadY }}>
      <ScrollView ref={scroll} testID="phase-reaction-scroll" style={styles.scroll} contentContainerStyle={styles.content} bounces={false}>
        <StoryPortrait speaker={speaker} phase={event.phase} passage={`phase-response:${event.phase}`} size={100} speaking={!suspended} />
        <AppText textRole="title" accessibilityRole="header" style={[styles.name, { color: theme.title }]}>{name}</AppText>
        <AppText testID="phase-reaction-text" textRole="reading" style={{ color: theme.body }}>{scene.text}</AppText>
      </ScrollView>
      <View style={styles.actions}>
        {failed && <AppText textRole="caption" accessibilityLiveRegion="assertive" style={{ color: theme.body }}>Your response is still here. Please try Continue again.</AppText>}
        <CandyButton phase={event.phase} label="Continue" accessibilityLabel={`Continue after ${name}'s response`} disabled={saving || suspended} onPress={() => { void finish(); }} soundKind="none" />
      </View>
    </PanelCard>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 9999, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: SURFACE.panelPadX, paddingBottom: 16 },
  name: { textAlign: 'center', marginBottom: 16 },
  actions: { paddingHorizontal: SURFACE.panelPadX, gap: 12 },
});
