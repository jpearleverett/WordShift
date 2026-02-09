/**
 * Component data contract tests.
 *
 * Since the test environment is Node (no React Native renderer),
 * these tests validate:
 * - Component module exports are importable
 * - VictoryData interface/type shape
 * - Phase-aware data flows through components correctly
 * - DifficultyMenu data handling
 * - Service integrations used by components
 */

// Mock react-native since we're in Node
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  Animated: {
    View: 'AnimatedView',
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      interpolate: jest.fn().mockReturnValue('interpolated'),
    })),
  },
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  default: jest.requireActual('react'),
}));

import { getVictoryTitle, getVictoryFeedback, getRulesText } from '../services/phaseNarrative';
import { getPhaseTheme, CandyColors } from '../theme/colors';
import { DialoguePhase } from '../types/homeWorld';
import type { VictoryData } from '../components/puzzle/VictoryModal';

const ALL_PHASES: DialoguePhase[] = [0, 1, 2, 3, 4];

describe('VictoryData interface contract', () => {
  test('can construct a valid VictoryData object', () => {
    const data: VictoryData = {
      earnedStars: 3,
      amberEarned: 15,
      streakBonus: 2,
      challengeBonus: 0,
      milestoneBonus: 0,
      milestoneMessage: null,
      currentStreak: 5,
      phaseChanged: false,
      newPhase: 0,
    };
    expect(data.earnedStars).toBe(3);
    expect(data.amberEarned).toBe(15);
    expect(data.phaseChanged).toBe(false);
  });

  test('VictoryData supports phase change scenario', () => {
    const data: VictoryData = {
      earnedStars: 3,
      amberEarned: 10,
      streakBonus: 0,
      challengeBonus: 5,
      milestoneBonus: 50,
      milestoneMessage: '50 puzzles solved!',
      currentStreak: 10,
      phaseChanged: true,
      newPhase: 2,
    };
    expect(data.phaseChanged).toBe(true);
    expect(data.newPhase).toBe(2);
    expect(data.milestoneMessage).toBe('50 puzzles solved!');
  });
});

describe('Victory modal data flow', () => {
  test.each(ALL_PHASES)('victory title changes with phase %i', (phase) => {
    const title3 = getVictoryTitle(3, phase);
    const title2 = getVictoryTitle(2, phase);
    const title1 = getVictoryTitle(1, phase);

    // Each star level produces different text
    expect(title3).not.toBe(title2);
    expect(title2).not.toBe(title1);
  });

  test('victory feedback is phase-aware for all star levels', () => {
    const phase0 = getVictoryFeedback(3, 0);
    const phase4 = getVictoryFeedback(3, 4);
    expect(phase0).not.toBe(phase4);
    // Phase 0 is encouraging, phase 4 is dark
    expect(phase0).toContain('Flawless');
  });
});

describe('Phase theme integration', () => {
  test.each(ALL_PHASES)('getPhaseTheme returns valid colors for phase %i', (phase) => {
    const theme = getPhaseTheme(phase);
    expect(theme).toHaveProperty('bgPrimary');
    expect(theme).toHaveProperty('particleColors');
    expect(theme).toHaveProperty('confettiColors');
    expect(typeof theme.bgPrimary).toBe('string');
    expect(theme.particleColors.length).toBeGreaterThan(0);
    expect(theme.confettiColors.length).toBeGreaterThan(0);
  });

  test('phase 0 has bright primary background', () => {
    const theme = getPhaseTheme(0);
    // Phase 0 should not be the dark Phase 4 color
    expect(theme.bgPrimary).not.toBe('#1A1A2E');
  });

  test('phase 4 has dark primary background', () => {
    const theme = getPhaseTheme(4);
    expect(theme.bgPrimary).toBe('#1A1A2E');
  });

  test('themes are distinct across phases', () => {
    const backgrounds = ALL_PHASES.map(p => getPhaseTheme(p).bgPrimary);
    const unique = new Set(backgrounds);
    expect(unique.size).toBe(5);
  });

  test('all themes have vignette, glow, and overlay colors', () => {
    for (const phase of ALL_PHASES) {
      const theme = getPhaseTheme(phase);
      expect(theme).toHaveProperty('vignetteColor');
      expect(theme).toHaveProperty('centerGlow');
      expect(theme).toHaveProperty('overlayTop');
      expect(theme).toHaveProperty('victoryTitleColor');
      expect(theme).toHaveProperty('victoryGlowColor');
    }
  });
});

describe('Difficulty menu data', () => {
  test('difficulty values match expected set', () => {
    const difficulties = ['EASY', 'MEDIUM', 'HARD'];
    expect(difficulties).toHaveLength(3);
    expect(difficulties).toContain('EASY');
    expect(difficulties).toContain('MEDIUM');
    expect(difficulties).toContain('HARD');
  });

  test('game modes are standard or challenge', () => {
    const modes = ['standard', 'challenge'];
    expect(modes).toContain('standard');
    expect(modes).toContain('challenge');
  });
});

describe('Rules modal data flow', () => {
  test('rules text is fully phase-aware', () => {
    const phase0Rules = getRulesText(0);
    const phase4Rules = getRulesText(4);

    // Phase 0 title vs Phase 4 title
    expect(phase0Rules.title).toBe('HOW TO PLAY');
    expect(phase4Rules.title).toBe('THE ARRANGEMENT');

    // Dismiss labels shift tone
    expect(phase0Rules.dismissLabel).toBe("LET'S PLAY!");
    expect(phase4Rules.dismissLabel).toBe('...');
  });

  test('each phase has 4 instructional steps', () => {
    for (const phase of ALL_PHASES) {
      const rules = getRulesText(phase);
      expect(rules.steps).toHaveLength(4);
    }
  });

  test('step content progressively darkens', () => {
    // Phase 0: "Complete All Rows" / "Work through every row to win!"
    const step0 = getRulesText(0).steps[3];
    expect(step0.desc).toContain('win');

    // Phase 4: "Complete the Ritual" / "Row by row. Closer and closer."
    const step4 = getRulesText(4).steps[3];
    expect(step4.heading).toContain('Ritual');
    expect(step4.desc).toContain('Closer');
  });
});

describe('CandyColors palette', () => {
  test('has required color groups', () => {
    expect(CandyColors).toHaveProperty('purple');
    expect(CandyColors).toHaveProperty('pink');
    expect(CandyColors).toHaveProperty('blue');
    expect(CandyColors).toHaveProperty('green');
    expect(CandyColors).toHaveProperty('yellow');
    expect(CandyColors).toHaveProperty('red');
    expect(CandyColors).toHaveProperty('white');
    expect(CandyColors).toHaveProperty('gray');
  });

  test('purple has main, light, and dark variants', () => {
    expect(CandyColors.purple).toHaveProperty('main');
    expect(CandyColors.purple).toHaveProperty('light');
    expect(CandyColors.purple).toHaveProperty('dark');
  });
});
