import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CandyColors } from '../../theme/colors';
import { PIXEL_FONT_BOLD } from '../../theme/fonts';
import { FONT_SIZE } from '../../theme/typeScale';

interface LevelDisplayProps {
  level: number;
}

export const LevelDisplay: React.FC<LevelDisplayProps> = ({ level }) => {
  return (
    <View style={styles.statsContainer} accessibilityLabel={`Level ${level}`}>
      <View style={styles.statBox}>
        <Text style={styles.statLabel}>LEVEL</Text>
        <View style={styles.statValueContainer}>
          <Text style={styles.statValue}>{level}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.micro,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: PIXEL_FONT_BOLD,
    fontSize: FONT_SIZE.title,
    fontWeight: '900',
    color: CandyColors.white,
  },
});
