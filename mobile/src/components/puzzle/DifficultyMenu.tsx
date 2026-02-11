import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CandyColors, getPhaseSurfaceTheme } from '../../theme/colors';
import { Difficulty, GameMode } from '../../types';

interface DifficultyMenuProps {
  visible: boolean;
  currentDifficulty: Difficulty;
  gameMode: GameMode;
  phase?: number;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onToggleChallengeMode: () => void;
}

export const DifficultyMenu: React.FC<DifficultyMenuProps> = ({
  visible,
  currentDifficulty,
  gameMode,
  phase = 0,
  onSelectDifficulty,
  onToggleChallengeMode,
}) => {
  if (!visible) return null;
  const surfaceTheme = getPhaseSurfaceTheme(phase);

  return (
    <View
      style={[
        styles.difficultyMenu,
        {
          backgroundColor: surfaceTheme.cardBg,
          borderColor: surfaceTheme.cardBorder,
          shadowColor: surfaceTheme.cardShadow,
        },
      ]}
    >
      {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
        <TouchableOpacity
          key={d}
          style={[
            styles.difficultyMenuItem,
            currentDifficulty === d && {
              backgroundColor: surfaceTheme.accentSoft,
            },
          ]}
          onPress={() => onSelectDifficulty(d)}
        >
          <View style={[
            styles.difficultyMenuDot,
            d === 'EASY' && styles.difficultyDotEasy,
            d === 'MEDIUM' && styles.difficultyDotMedium,
            d === 'HARD' && styles.difficultyDotHard,
          ]} />
          <Text
            style={[
              styles.difficultyMenuText,
              { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[600] },
              currentDifficulty === d && { color: surfaceTheme.accent },
            ]}
          >
            {d}
          </Text>
        </TouchableOpacity>
      ))}
      {/* Challenge mode toggle */}
      <View style={[styles.challengeMenuDivider, { backgroundColor: surfaceTheme.glassBorder }]} />
      <TouchableOpacity
        style={[
          styles.difficultyMenuItem,
          gameMode === 'challenge' && { backgroundColor: 'rgba(200, 70, 90, 0.16)' },
        ]}
        onPress={onToggleChallengeMode}
      >
        <Text style={styles.challengeMenuIcon}>
          {gameMode === 'challenge' ? '\uD83D\uDD13' : '\uD83D\uDD12'}
        </Text>
        <View style={styles.challengeMenuContent}>
          <Text style={[
            styles.difficultyMenuText,
            { color: phase >= 2 ? surfaceTheme.textSecondary : CandyColors.gray[600] },
            gameMode === 'challenge' && { color: surfaceTheme.dangerAccent },
          ]}>
            CHALLENGE
          </Text>
          <Text style={[styles.challengeMenuDesc, { color: phase >= 2 ? surfaceTheme.textMuted : CandyColors.gray[400] }]}>
            {gameMode === 'challenge' ? '1 undo, no hints, 1.5x amber' : 'Limited undos, +50% amber'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  difficultyMenu: {
    position: 'absolute',
    right: 20,
    top: 52,
    borderRadius: 16,
    padding: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 200,
    borderWidth: 1,
  },
  difficultyMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  difficultyMenuItemActive: {
    backgroundColor: CandyColors.purple.light + '30',
  },
  difficultyMenuDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  difficultyDotEasy: {
    backgroundColor: CandyColors.green.main,
  },
  difficultyDotMedium: {
    backgroundColor: CandyColors.yellow.main,
  },
  difficultyDotHard: {
    backgroundColor: CandyColors.red.main,
  },
  difficultyMenuText: {
    fontSize: 13,
    fontWeight: '700',
  },
  difficultyMenuTextActive: {
    color: CandyColors.purple.main,
  },
  challengeMenuDivider: {
    height: 1,
    marginVertical: 6,
    marginHorizontal: 8,
  },
  challengeMenuItemActive: {
    backgroundColor: CandyColors.red.main + '15',
  },
  challengeMenuIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  challengeMenuContent: {
    flex: 1,
  },
  challengeMenuTextActive: {
    color: CandyColors.red.main,
  },
  challengeMenuDesc: {
    fontSize: 10,
    color: CandyColors.gray[400],
    marginTop: 1,
  },
});
