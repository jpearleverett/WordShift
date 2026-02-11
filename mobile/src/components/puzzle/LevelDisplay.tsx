import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPhaseSurfaceTheme } from '../../theme/colors';

interface LevelDisplayProps {
  level: number;
  phase?: number;
}

export const LevelDisplay: React.FC<LevelDisplayProps> = ({ level, phase = 0 }) => {
  const surfaceTheme = getPhaseSurfaceTheme(phase);

  return (
    <View style={styles.statsContainer} accessibilityLabel={`Level ${level}`}>
      <View style={styles.statBox}>
        <Text style={[styles.statLabel, { color: surfaceTheme.textMuted }]}>LEVEL</Text>
        <View
          style={[
            styles.statValueContainer,
            {
              backgroundColor: surfaceTheme.glassStrong,
              borderColor: surfaceTheme.glassBorder,
              shadowColor: surfaceTheme.cardShadow,
            },
          ]}
        >
          <View style={[styles.valueShine, { backgroundColor: surfaceTheme.glassShine }]} />
          <Text style={[styles.statValue, { color: surfaceTheme.textPrimary }]}>{level}</Text>
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
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueContainer: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 50,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  valueShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
