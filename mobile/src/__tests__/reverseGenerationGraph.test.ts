import { getReverseRemovalCandidates } from '../services/localGenerator';

jest.mock('../services/amberCurrency', () => ({ getCurrentPhase: async () => 0 }));
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: async () => new Map(),
  calculateFreshnessPenalty: () => 0,
  isInHardCooldown: () => false,
  recordPuzzleWords: async () => {},
}));

test('reverse search can move an original duplicate while the incoming copy stays locked', () => {
  expect(getReverseRemovalCandidates('SPATS', 0, new Set(['PATS', 'SPAT']), new Set())).toEqual([
    { charIndex: 4, char: 'S', remainder: 'SPAT' },
  ]);
  expect(getReverseRemovalCandidates('SPATS', 4, new Set(['PATS', 'SPAT']), new Set())).toEqual([
    { charIndex: 0, char: 'S', remainder: 'PATS' },
  ]);
});

test('reverse search still excludes unavailable and previously used remainders', () => {
  expect(getReverseRemovalCandidates('SPATS', 0, new Set(['PATS']), new Set())).toEqual([]);
  expect(getReverseRemovalCandidates('SPATS', 0, new Set(['SPAT']), new Set(['SPAT']))).toEqual([]);
});
