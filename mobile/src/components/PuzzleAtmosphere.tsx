import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { STORY_ART } from './storyArt';

interface PuzzleAtmosphereProps {
  phase: number;
}

const PALETTES = [
  { ink: '#725838', light: '#FFF5D9', timber: '#7C6245', paper: '#F8EDD1', texture: 0.065, edge: 0.10 },
  { ink: '#665A43', light: '#F2E7CD', timber: '#6B5C47', paper: '#E8DEC4', texture: 0.055, edge: 0.10 },
  { ink: '#55524A', light: '#DAD5C6', timber: '#4F4A42', paper: '#CAC8B8', texture: 0.045, edge: 0.12 },
  { ink: '#A19AAE', light: '#C5BBCE', timber: '#0C111A', paper: '#8A8598', texture: 0.018, edge: 0.15 },
  { ink: '#A08B9C', light: '#BBA7BA', timber: '#080810', paper: '#75667B', texture: 0.012, edge: 0.19 },
  { ink: '#A7A6B4', light: '#D0CCDF', timber: '#121521', paper: '#A8A6B9', texture: 0.035, edge: 0.13 },
] as const;

/**
 * The puzzle rests in the same house as the characters: paper, worn timber,
 * and the faint light of the table. All detail stays at the edges. This layer
 * is static; AnimatedBackground owns motion and reduced-motion behavior.
 */
export const PuzzleAtmosphere: React.FC<PuzzleAtmosphereProps> = ({ phase }) => {
  const { width, height } = useWindowDimensions();
  const value = Number.isFinite(phase) ? Math.max(0, Math.min(5, Math.floor(phase))) : 0;
  const palette = PALETTES[value];
  const rail = width > 600 ? 12 : 6;
  const corner = Math.min(88, Math.max(48, width * 0.16));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.root}
    >
      <View style={[styles.tableMemory, { height: Math.min(height * 0.38, 310), opacity: palette.texture }]}>
        <Image
          source={STORY_ART.tableHeader}
          accessible={false}
          resizeMode="cover"
          style={styles.texture}
        />
      </View>

      <View style={[styles.rail, { left: 0, width: rail, backgroundColor: palette.timber, opacity: palette.edge }]} />
      <View style={[styles.rail, { right: 0, width: rail, backgroundColor: palette.timber, opacity: palette.edge }]} />
      <View style={[styles.edgeLight, { left: rail, backgroundColor: palette.light }]} />
      <View style={[styles.edgeLight, { right: rail, backgroundColor: palette.light }]} />

      <View style={[styles.topRule, { left: rail + 10, right: rail + 10, backgroundColor: palette.ink }]} />
      <View style={[styles.bottomRule, { left: rail + 10, right: rail + 10, backgroundColor: palette.ink }]} />

      <View
        style={[
          styles.corner,
          styles.cornerTop,
          { width: corner, height: corner, borderColor: palette.ink },
        ]}
      />
      <View
        style={[
          styles.corner,
          styles.cornerBottom,
          { width: corner, height: corner, borderColor: palette.ink },
        ]}
      />

      <View style={[styles.paperEdge, { backgroundColor: palette.paper, borderColor: palette.ink }]} />
      <View style={[styles.paperEdgeBack, { backgroundColor: palette.paper, borderColor: palette.ink }]} />

      <View style={[styles.grain, { top: '23%', left: 2, width: rail + 1, backgroundColor: palette.ink }]} />
      <View style={[styles.grain, { top: '61%', right: 1, width: rail + 2, backgroundColor: palette.ink }]} />
      <View style={[styles.grain, { top: '77%', left: 1, width: rail, backgroundColor: palette.light }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  tableMemory: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  texture: { width: '100%', height: '100%' },
  rail: { position: 'absolute', top: 0, bottom: 0 },
  edgeLight: { position: 'absolute', top: 0, bottom: 0, width: 1, opacity: 0.10 },
  topRule: { position: 'absolute', top: 9, height: 1, opacity: 0.09 },
  bottomRule: { position: 'absolute', bottom: 10, height: 1, opacity: 0.09 },
  corner: { position: 'absolute', opacity: 0.09 },
  cornerTop: { left: 14, top: 16, borderLeftWidth: 1, borderTopWidth: 1 },
  cornerBottom: { right: 14, bottom: 18, borderRightWidth: 1, borderBottomWidth: 1 },
  paperEdge: {
    position: 'absolute', width: 100, height: 138, left: -94, top: '38%',
    borderWidth: 1, opacity: 0.13, transform: [{ rotate: '-7deg' }],
  },
  paperEdgeBack: {
    position: 'absolute', width: 100, height: 138, right: -96, top: '49%',
    borderWidth: 1, opacity: 0.10, transform: [{ rotate: '6deg' }],
  },
  grain: { position: 'absolute', height: 1, opacity: 0.13 },
});

export default PuzzleAtmosphere;
