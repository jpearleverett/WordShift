import React, { useState } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
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

// Painted keepsakes (scripts/tools/processKeepsakeArt.mjs, raws and prompts in
// assets/raw/keepsakes/). Each is drawn at exactly the size the script prints,
// so one art pixel lands on the dp grid.
const GATE_IMG = require('../../../assets/ui/world/gate.png');
const DOOR_IMG = require('../../../assets/ui/world/door.png');
export const KEEPSAKE_GATE = { width: 41, height: 44, feetAboveBottom: 2 } as const;
export const KEEPSAKE_DOOR = { width: 31.25, height: 36.25 } as const;
/** The door's sill sits this far above the foundation's bottom edge, this far in from its right end. */
const DOOR_BOTTOM_DP = 7;
const DOOR_RIGHT_DP = 12;
/** The gate's feet stand on the ground line this far above the foundation's bottom edge. */
const GATE_GROUND_DP = 4;

/**
 * Where the gate stands, relative to the foundation's left edge: on the grass
 * just past the foundation's right end, pulled in on a narrow phone so the
 * latch post never runs off the screen (the house is centred in the window).
 */
export function getKeepsakeGateLeft(houseWidth: number, windowWidth: number): number {
  const edgeRoom = (windowWidth + houseWidth) / 2 - KEEPSAKE_GATE.width - 2;
  return Math.round(Math.min(houseWidth + 1, edgeRoom));
}

interface StoryWorldObjectProps {
  keepsake: StoryWorldKeepsake;
  onPress: () => void;
  /** The foundation's width; the object is laid out against its right end. */
  houseWidth: number;
  /** The house exterior's phase light, so the keepsake sits in the same light as the roof and pit. */
  tintColor: string;
  tintOpacity: number;
}

/**
 * Part of the foundation, with the same touch arbitration as the resident
 * sprites: the private door drawn into the stones, or the outward gate on the
 * grass beside them.
 */
export function StoryWorldObject({ keepsake, onPress, houseWidth, tintColor, tintOpacity }: StoryWorldObjectProps) {
  const { width: windowWidth } = useWindowDimensions();
  const door = keepsake.boundary === 'remember';
  const size = door ? KEEPSAKE_DOOR : KEEPSAKE_GATE;
  const source = door ? DOOR_IMG : GATE_IMG;
  const place = door
    ? { right: DOOR_RIGHT_DP, bottom: DOOR_BOTTOM_DP }
    : { left: getKeepsakeGateLeft(houseWidth, windowWidth), bottom: GATE_GROUND_DP - KEEPSAKE_GATE.feetAboveBottom };
  return <WorldButton onPress={onPress} accessibilityRole="button" accessibilityLabel={`Inspect ${keepsake.title.toLowerCase()}`}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    style={[styles.object, place, { width: size.width, height: size.height }]}>
    <Image source={source} style={styles.fill} resizeMode="contain" fadeDuration={0} accessible={false} />
    {tintOpacity > 0 && (
      <Image source={source} style={[styles.fill, styles.tint, { tintColor, opacity: tintOpacity }]} resizeMode="contain" fadeDuration={0} accessible={false} />
    )}
  </WorldButton>;
}

interface StoryWorldInspectionProps {
  keepsake: StoryWorldKeepsake | null; context: StoryContext | null; phase: DialoguePhase;
  onClose: () => void; onInspected: () => void;
}
export function StoryWorldInspection(props: StoryWorldInspectionProps) {
  return props.keepsake ? <StoryWorldInspectionContents key={`${props.context?.cycleCount}:${props.keepsake.boundary}`} {...props} /> : null;
}
function StoryWorldInspectionContents({ keepsake, context, phase, onClose, onInspected }: StoryWorldInspectionProps) {
  const theme = getSurfaceTheme(phase);
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
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
  object: { position: 'absolute', zIndex: 5 },
  fill: { width: '100%', height: '100%' },
  tint: { position: 'absolute', top: 0, left: 0 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  panel: { width: '100%', maxWidth: 560, maxHeight: '100%' },
  reading: { padding: 24, gap: 16 },
  art: { width: '100%', height: 180 },
  title: { fontFamily: PIXEL_FONT_BOLD, fontSize: 22, lineHeight: 30 },
  body: { fontFamily: BODY_FONT, fontSize: 18, lineHeight: 29 },
});
