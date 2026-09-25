/**
 * A difficulty reaches the player only through getDifficultyName (running
 * text) or getDifficultyShortName (chips and tight rows). The enum value
 * 'MEDIUM_PLUS' once showed on the victory screen ("First MEDIUM_PLUS Clear"),
 * in Stats, in shared text and in a screen-reader label.
 */
jest.mock('react-native', () => ({
  Share: { share: jest.fn(), sharedAction: 'sharedAction' },
  Platform: { OS: 'ios' },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());

import * as fs from 'fs';
import * as path from 'path';
import { getDifficultyName, getDifficultyShortName } from '../services/phaseNarrative';
import { generateShareText } from '../services/shareResults';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

test('every tier has a name without an underscore', () => {
  for (const d of ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT']) {
    expect(getDifficultyName(d)).not.toContain('_');
    expect(getDifficultyShortName(d)).not.toContain('_');
  }
  expect(getDifficultyName('MEDIUM_PLUS')).toBe('Medium+');
  expect(getDifficultyShortName('MEDIUM_PLUS')).toBe('MED+');
});

test('the surfaces that leaked the raw value now name it', () => {
  const modal = read('../components/puzzle/VictoryModal.tsx');
  expect(modal).toContain('First {getDifficultyName(difficulty)} Clear');
  expect(modal).not.toMatch(/>\{difficulty\}</);
  expect(read('../components/StatsScreen.tsx')).not.toMatch(/>\{difficulty\}</);
  expect(read('../../App.tsx')).toContain('Difficulty ${getDifficultyName(chipDifficulty)}');
  // No hand-rolled spellings left.
  for (const rel of ['../components/puzzle/DifficultyMenu.tsx', '../components/StatsScreen.tsx', '../components/share/ShareCard.tsx']) {
    expect(read(rel)).not.toMatch(/=== 'MEDIUM_PLUS' \? '(MED\+|Medium Plus)'/);
  }
});

test('shared text names the difficulty', () => {
  const text = generateShareText({
    difficulty: 'MEDIUM_PLUS', stars: 3, moveCount: 3, hintsUsed: 0, invalidAttempts: 0, phase: 0,
  } as never);
  expect(text).toContain('MED+');
  expect(text).not.toContain('MEDIUM_PLUS');
});
