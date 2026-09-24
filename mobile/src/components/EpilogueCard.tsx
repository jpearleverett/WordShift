import React, { useEffect } from 'react';
import { Image, Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TEXT_ROLE } from '../theme/typography';
import { AppText } from './ui/AppText';
import { PanelCard } from './ui/PanelCard';
import { CandyButton } from './ui/CandyButton';
import { SURFACE, getSurfaceTheme } from '../theme/surfaces';
import { getSettingsSync } from '../services/settings';
import { announceForA11y } from '../services/a11yAnnounce';
import { EpilogueCopy } from '../services/phaseNarrative';
import { ARRIVAL_ART } from './arrivalArt';

/**
 * The closing card, shown once after the player's reply the morning after the
 * Arrival. It closes the story of the arrival without closing the game: the
 * house and everyone in it are still there, and the one button goes home.
 */
export interface EpilogueCardProps {
  copy: EpilogueCopy | null;
  boundary: 'remember' | 'release' | null;
  onClose: () => void;
}

export const EpilogueCard: React.FC<EpilogueCardProps> = ({ copy, boundary, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const theme = getSurfaceTheme(5);
  const cardWidth = Math.min(width - 32, 520);
  const artWidth = cardWidth - SURFACE.panelPadX * 2;
  const artHeight = Math.min(artWidth / 1.5, height * 0.3);
  useEffect(() => {
    if (copy) announceForA11y(`${copy.title}. ${copy.lines.join('. ')}. ${copy.closing}`);
  }, [copy]);
  if (!copy) return null;
  const art = boundary === 'remember' ? ARRIVAL_ART.morning_door : boundary === 'release' ? ARRIVAL_ART.morning_road : ARRIVAL_ART.morning_house;
  return <Modal visible transparent animationType={getSettingsSync().reducedMotion ? 'none' : 'fade'} onRequestClose={onClose}>
    <View style={[styles.overlay, { backgroundColor: theme.overlay, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <PanelCard phase={5} kind="panel" style={{ width: cardWidth, maxHeight: height - insets.top - insets.bottom - 32, paddingVertical: SURFACE.panelPadY }}>
        <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: SURFACE.panelPadX, alignItems: 'center' }}>
          <Image source={art} resizeMode="cover" fadeDuration={0} style={{ width: artWidth, height: artHeight, marginBottom: 14 }} accessible={false} />
          <AppText textRole="label" style={[styles.eyebrow, { color: theme.muted }]}>{copy.eyebrow}</AppText>
          <AppText textRole="title" accessibilityRole="header" style={[styles.title, { color: theme.title }]}>{copy.title}</AppText>
          <View style={[styles.rule, { backgroundColor: theme.sectionBorder }]} />
          {copy.lines.map(line => (
            <AppText key={line} textRole="reading" style={[styles.line, { color: theme.body }]}>{line}</AppText>
          ))}
          <View style={[styles.rule, { backgroundColor: theme.sectionBorder }]} />
          <AppText textRole="reading" style={[styles.closing, { color: theme.body }]}>{copy.closing}</AppText>
          <View style={styles.action}>
            <CandyButton phase={5} label={copy.button} onPress={onClose} />
          </View>
        </ScrollView>
      </PanelCard>
    </View>
  </Modal>;
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  eyebrow: { ...TEXT_ROLE.label, letterSpacing: 2, marginBottom: 4 },
  title: { ...TEXT_ROLE.title, textAlign: 'center', marginBottom: 10 },
  rule: { alignSelf: 'stretch', height: 1, marginVertical: 10 },
  line: { ...TEXT_ROLE.reading, textAlign: 'center', marginBottom: 4 },
  closing: { ...TEXT_ROLE.reading, textAlign: 'center', marginBottom: 16 },
  action: { alignSelf: 'stretch' },
});

export default EpilogueCard;
