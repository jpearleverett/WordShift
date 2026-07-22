import {
  getVictoryTitle,
  getVictoryFeedback,
  getMoveMessage,
  getVictoryGlitch,
  getFirstWinGlitchText,
  getShareCardTagline,
  getDailyLadderLine,
  getDailyLadderTrendLabel,
  getHintMessage,
  getHintFallback,
  getLoadingMessage,
  getStartMessage,
  getPhaseChangeNarrative,
  getPhaseIndicator,
  getRulesText,
  getInvalidWordMessage,
  getLockedLetterMessage,
  getNoValidMovesMessage,
  getComboMoveMessage,
  getDragMissMessage,
  getNotificationPromptText,
  getWinBackMessage,
  getSpeedTimeUpMessage,
  getWhisperGalleryEmptyText,
  getNextStreakMilestoneText,
  checkNarrativeMicroBeat,
  resetMicroBeats,
  getHomescreenNudge,
  getHarvestOverflowMessage,
  getChallengeIntroLines,
  getJournalIntroLines,
  getJournalSpotlightSteps,
  getPitMandatoryText,
  getPitMandatoryCTA,
  getGoalSuggestion,
  getRitualEchoHeader,
  getRitualEchoFooter,
  getWordsOfferedText,
  getIncantationName,
  getNewCyclePointerLine,
  NEW_CYCLE_POINTER_LINES,
  ANIMAL_WHISPERS,
  getAnimalWhisper,
  getPersonalizedPhase5Whisper,
  getTendingMilestoneCeremonyText,
  VICTORY_FEEDBACK_POOLS,
  MOVE_MESSAGES,
  COMBO_MOVE_POOLS,
  MICRO_BEATS,
  isSilentVictoryBeat,
  PIT_OFFER_RESULT_MESSAGES,
  getPitOfferResultMessage,
  INTERJECTION_MESSAGES,
  getDwellLine,
  getPostCapDwellLine,
  getStreakHeldMessage,
  getPreviewGraduationMessage,
  getSwiftVictoryHintMessage,
  getFinalBoardStartMessage,
  getCycleMicroBeat,
  CYCLE_MICRO_BEATS,
  checkCycleNarrativeMicroBeat,
  resolveVictoryMicroBeat,
} from '../services/phaseNarrative';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';

const ALL_PHASES: DialoguePhase[] = [0, 1, 2, 3, 4];
const STAR_LEVELS = [1, 2, 3];
const ALL_ANIMAL_TYPES = [
  'fox', 'owl', 'pangolin', 'axolotl', 'capybara', 'fennec_fox',
  'sloth', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
];
const FORBIDDEN_PHASE_3_CONTENT = /\b(game|puzzle|summoning|spreadsheet|consent)\b/i;

describe('getVictoryTitle', () => {
  test.each(
    ALL_PHASES.flatMap(phase =>
      STAR_LEVELS.map(stars => ({ phase, stars }))
    )
  )('returns a non-empty string for phase $phase, $stars stars', ({ phase, stars }) => {
    const title = getVictoryTitle(stars, phase);
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  test('phase 0 returns expected titles', () => {
    expect(getVictoryTitle(3, 0)).toBe('PERFECT!');
    expect(getVictoryTitle(2, 0)).toBe('GREAT!');
    expect(getVictoryTitle(1, 0)).toBe('WELL DONE!');
  });

  test('phase 4 titles reflect nihilistic tone', () => {
    expect(getVictoryTitle(3, 4)).toContain('WHY DOES');
    expect(getVictoryTitle(2, 4)).toBe('AND YET...');
    expect(getVictoryTitle(1, 4)).toBe('...AGAIN.');
  });

  test('different phases produce different titles for 3 stars', () => {
    const titles = ALL_PHASES.map(p => getVictoryTitle(3, p));
    const unique = new Set(titles);
    expect(unique.size).toBe(5);
  });
});

describe('getVictoryFeedback', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test.each(
    ALL_PHASES.flatMap(phase =>
      STAR_LEVELS.map(stars => ({ phase, stars }))
    )
  )('returns a non-empty string for phase $phase, $stars stars', ({ phase, stars }) => {
    const feedback = getVictoryFeedback(stars, phase);
    expect(typeof feedback).toBe('string');
    expect(feedback.length).toBeGreaterThan(0);
  });

  test('every phase x star cell is a pool of 4-5 lines (reread ~25-40 times per phase)', () => {
    for (const phase of allSixPhases) {
      const pools = VICTORY_FEEDBACK_POOLS[phase];
      for (const cell of [pools.three, pools.two, pools.one]) {
        expect(cell.length).toBeGreaterThanOrEqual(4);
        expect(cell.length).toBeLessThanOrEqual(5);
      }
    }
  });

  test('picks come from the matching pool', () => {
    for (const phase of allSixPhases) {
      const pools = VICTORY_FEEDBACK_POOLS[phase];
      for (let i = 0; i < 20; i++) {
        expect(pools.three).toContain(getVictoryFeedback(3, phase));
        expect(pools.two).toContain(getVictoryFeedback(2, phase));
        expect(pools.one).toContain(getVictoryFeedback(1, phase));
      }
    }
  });

  test('phase 0 keeps the flagship bright line; phase 4 keeps the void line', () => {
    expect(VICTORY_FEEDBACK_POOLS[0].three).toContain('Flawless! The words knew exactly where to go.');
    expect(VICTORY_FEEDBACK_POOLS[4].three).toContain('Perfection in an imperfect void.');
  });

  test('phase 2 two-star pool keeps exactly ONE rhetorical question (the rest are statements)', () => {
    const questions = VICTORY_FEEDBACK_POOLS[2].two.filter(line => line.includes('?'));
    expect(questions).toEqual(['Another puzzle solved. Does it feel different?']);
  });

  test('cells within a phase are disjoint, so star levels always read differently', () => {
    for (const phase of allSixPhases) {
      const pools = VICTORY_FEEDBACK_POOLS[phase];
      const all = [...pools.three, ...pools.two, ...pools.one];
      expect(new Set(all).size).toBe(all.length);
    }
  });

  test('no pool line says Phase or carries a dash', () => {
    for (const phase of allSixPhases) {
      const pools = VICTORY_FEEDBACK_POOLS[phase];
      for (const line of [...pools.three, ...pools.two, ...pools.one]) {
        expect(line).not.toMatch(/[–—]/);
        expect(line).not.toMatch(/\bPhase\b/);
      }
    }
  });

  test('the flat phase-1 one-star line is retired', () => {
    expect(VICTORY_FEEDBACK_POOLS[1].one).not.toContain('Completed. Every puzzle teaches something.');
  });
});

describe('getMoveMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getMoveMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('pool sizes match the reread budget (phase 2 is the longest phase, deepest pool)', () => {
    expect(MOVE_MESSAGES[0].length).toBeGreaterThanOrEqual(16);
    expect(MOVE_MESSAGES[1].length).toBeGreaterThanOrEqual(16);
    expect(MOVE_MESSAGES[2].length).toBeGreaterThanOrEqual(26);
    expect(MOVE_MESSAGES[3].length).toBeGreaterThanOrEqual(20);
    expect(MOVE_MESSAGES[4].length).toBeGreaterThanOrEqual(24);
    expect(MOVE_MESSAGES[5].length).toBeGreaterThanOrEqual(16);
  });

  test('phase 2 filler is retired in favor of the deeper-questions register', () => {
    expect(MOVE_MESSAGES[2]).not.toContain('Onward.');
    expect(MOVE_MESSAGES[2]).not.toContain('Continuing...');
  });

  test('phase 0 messages come from the pool or the rare darkness seeds', () => {
    // getMoveMessage uses Math.random; Phase 0 includes ~7% rare "seed" messages.
    const seedWords = ['remember', 'shifted', 'feel', 'wanted'];
    for (let i = 0; i < 60; i++) {
      const msg = getMoveMessage(0);
      const isPool = MOVE_MESSAGES[0].includes(msg);
      const isSeed = seedWords.some(w => msg.toLowerCase().includes(w));
      expect(isPool || isSeed).toBe(true);
    }
  });

  test('phase 4 messages come from the phase 4 pool', () => {
    for (let i = 0; i < 60; i++) {
      expect(MOVE_MESSAGES[4]).toContain(getMoveMessage(4));
    }
  });

  test('no move message says Phase or carries a dash', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as DialoguePhase[]) {
      for (const msg of MOVE_MESSAGES[phase]) {
        expect(msg).not.toMatch(/[–—]/);
        expect(msg).not.toMatch(/\bPhase\b/);
      }
    }
  });
});

describe('getShareCardTagline', () => {
  test.each(ALL_PHASES)('returns a non-empty, spoiler-safe tagline for phase %i', (phase) => {
    const line = getShareCardTagline(phase);
    expect(typeof line).toBe('string');
    expect(line.length).toBeGreaterThan(0);
    // Spoiler-safe: the decaying share card lures, it never explains the turn.
    expect(line.toLowerCase()).not.toMatch(/cult|summon|ritual|sacrifice|phase|shadow|entity/);
    expect(line).not.toMatch(/[—–]/); // no em/en dashes in player-facing copy
  });

  test('stays cozy in the bright phases, grows wrong in the dark ones', () => {
    expect(getShareCardTagline(0).toLowerCase()).toContain('cozy');
    expect(getShareCardTagline(1).toLowerCase()).toContain('cozy');
    // The dark phases drop the "cozy" framing entirely.
    expect(getShareCardTagline(4).toLowerCase()).not.toContain('cozy');
    expect(getShareCardTagline(5).toLowerCase()).not.toContain('cozy');
  });
});

describe('getDailyLadderLine', () => {
  test('prefers this week best rank, tone shifts with phase', () => {
    const s = { bestRankThisWeek: 3, bestPercentileThisWeek: 90, participationCount: 5 };
    expect(getDailyLadderLine(s, 0)).toBe('Best this week: #3');
    expect(getDailyLadderLine(s, 2)).toContain('#3');
    expect(getDailyLadderLine(s, 4)).toContain('#3');
    // Tone actually differs across the descent.
    expect(getDailyLadderLine(s, 0)).not.toBe(getDailyLadderLine(s, 4));
  });

  test('falls back to percentile, then participation, then null', () => {
    expect(getDailyLadderLine({ bestRankThisWeek: null, bestPercentileThisWeek: 82, participationCount: 4 }, 0))
      .toContain('82%');
    expect(getDailyLadderLine({ bestRankThisWeek: null, bestPercentileThisWeek: null, participationCount: 3 }, 0))
      .toContain('3');
    // First daily (participation 1, no rank) → nothing worth showing.
    expect(getDailyLadderLine({ bestRankThisWeek: null, bestPercentileThisWeek: null, participationCount: 1 }, 0))
      .toBeNull();
  });

  test('is safe for null / non-object input (getter-sweep safety)', () => {
    expect(getDailyLadderLine(null, 0)).toBeNull();
    expect(getDailyLadderLine(undefined, 3)).toBeNull();
  });
});

describe('getDailyLadderTrendLabel', () => {
  test('maps up/down/flat per phase, null otherwise', () => {
    expect(getDailyLadderTrendLabel('up', 0)).toBe('Rising');
    expect(getDailyLadderTrendLabel('up', 2)).toBe('Ascending');
    expect(getDailyLadderTrendLabel('down', 0)).toBe('Slipping');
    expect(getDailyLadderTrendLabel('down', 2)).toBe('Receding');
    expect(getDailyLadderTrendLabel('flat', 4)).toBe('Holding');
    expect(getDailyLadderTrendLabel(null, 0)).toBeNull();
    expect(getDailyLadderTrendLabel(undefined, 0)).toBeNull();
  });
});

describe('getHintMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getHintMessage('R', 'WARM', phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('includes the letter and target word', () => {
    const msg = getHintMessage('R', 'WARM', 0);
    expect(msg).toContain("'R'");
    expect(msg).toContain('"WARM"');
  });

  test('phase 0 uses encouraging prefix', () => {
    const msg = getHintMessage('T', 'COLD', 0);
    expect(msg).toMatch(/^Move/);
  });

  test('phase 4 uses nihilistic prefix', () => {
    const msg = getHintMessage('T', 'VOID', 4);
    expect(msg).toMatch(/^If it matters/);
  });

  test('each phase produces a unique hint for the same input', () => {
    const hints = ALL_PHASES.map(p => getHintMessage('X', 'TEST', p));
    const unique = new Set(hints);
    expect(unique.size).toBe(5);
  });

  test('punctuation cools with the descent: ! at phases 0-2, . from phase 3 up', () => {
    for (const p of [0, 1, 2] as DialoguePhase[]) {
      expect(getHintMessage('R', 'WARM', p).endsWith('"WARM"!')).toBe(true);
    }
    for (const p of [3, 4, 5] as DialoguePhase[]) {
      expect(getHintMessage('R', 'VOID', p).endsWith('"VOID".')).toBe(true);
    }
  });
});

describe('getHintFallback', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getHintFallback(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('phase 0 mentions undoing', () => {
    expect(getHintFallback(0)).toContain('undo');
  });

  test('phase 4 is existential', () => {
    expect(getHintFallback(4)).toContain('Lost');
  });

  test('all phases return different fallback messages', () => {
    const messages = ALL_PHASES.map(p => getHintFallback(p));
    const unique = new Set(messages);
    expect(unique.size).toBe(5);
  });
});

describe('getLoadingMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getLoadingMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('phase 0 is cheerful', () => {
    expect(getLoadingMessage(0)).toBe('Mixing words...');
  });

  test('phase 4 is dark', () => {
    expect(getLoadingMessage(4)).toBe('The void speaks...');
  });

  test('all phases return different messages', () => {
    const messages = ALL_PHASES.map(p => getLoadingMessage(p));
    const unique = new Set(messages);
    expect(unique.size).toBe(5);
  });
});

describe('getStartMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getStartMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('phase 0 is inviting', () => {
    expect(getStartMessage(0)).toBe('Tap a tile to begin!');
  });

  test('phase 4 is ominous', () => {
    expect(getStartMessage(4)).toContain('waiting');
  });

  test('all phases return different messages', () => {
    const messages = ALL_PHASES.map(p => getStartMessage(p));
    const unique = new Set(messages);
    expect(unique.size).toBe(5);
  });
});

describe('getPhaseChangeNarrative', () => {
  const narrativePhases: DialoguePhase[] = [1, 2, 3, 4];

  test.each(narrativePhases)('returns object with emoji, title, body for phase %i', (phase) => {
    const narrative = getPhaseChangeNarrative(phase);
    expect(narrative).toHaveProperty('emoji');
    expect(narrative).toHaveProperty('title');
    expect(narrative).toHaveProperty('body');
    expect(narrative.emoji.length).toBeGreaterThan(0);
    expect(narrative.title.length).toBeGreaterThan(0);
    expect(narrative.body.length).toBeGreaterThan(0);
  });

  test('phase 0 returns default narrative', () => {
    const narrative = getPhaseChangeNarrative(0);
    expect(narrative.title).toBe('A new beginning');
  });

  test('phase 1 narrative is about conversations', () => {
    const narrative = getPhaseChangeNarrative(1);
    expect(narrative.title).toContain('conversations');
  });

  test('phase 4 narrative signals something ominous', () => {
    const narrative = getPhaseChangeNarrative(4);
    expect(narrative.title).toContain('changed');
  });

  test('each phase returns a different narrative', () => {
    const titles = narrativePhases.map(p => getPhaseChangeNarrative(p).title);
    const unique = new Set(titles);
    expect(unique.size).toBe(narrativePhases.length);
  });
});

describe('getGoalSuggestion', () => {
  test('prioritizes pending harvest over other suggestions', () => {
    const suggestion = getGoalSuggestion(0, true, ['MEDIUM'], 'reverse', true, 0, true);
    expect(suggestion?.action).toBe('pit');
  });

  test('returns quest action for claimable weekly rewards', () => {
    const suggestion = getGoalSuggestion(1, false, [], null, false, 40, true);
    expect(suggestion?.action).toBe('quests');
    expect(suggestion?.text).toContain('+40 amber');
  });
});

describe('getNewCyclePointerLine', () => {
  test.each([0, 1, 2, 3, 4] as DialoguePhase[])('returns null below phase 5 (phase %i)', (phase) => {
    expect(getNewCyclePointerLine(phase)).toBeNull();
  });

  test('returns one of the pointer variants at phase 5', () => {
    const line = getNewCyclePointerLine(5);
    expect(typeof line).toBe('string');
    expect(line!.length).toBeGreaterThan(0);
    expect(NEW_CYCLE_POINTER_LINES).toContain(line);
  });

  test('is deterministic (repeated calls agree)', () => {
    expect(getNewCyclePointerLine(5)).toBe(getNewCyclePointerLine(5));
  });

  test('variants stay in-world: no settings/UI/phase language, no em dashes', () => {
    expect(NEW_CYCLE_POINTER_LINES.length).toBeGreaterThanOrEqual(2);
    for (const line of NEW_CYCLE_POINTER_LINES) {
      expect(line.length).toBeGreaterThan(0);
      expect(line.toLowerCase()).not.toMatch(/setting|button|menu|screen|tap|phase|cycle/);
      expect(line).not.toMatch(/[–—]/);
    }
  });
});

describe('getPersonalizedPhase5Whisper', () => {
  const realRandom = Math.random;
  afterEach(() => {
    Math.random = realRandom;
  });

  test('weaves a remembered word into the whisper', () => {
    Math.random = () => 0; // word idx 0, animal idx 0, personalized branch (0 < 0.65)
    const whisper = getPersonalizedPhase5Whisper(['fox'], ['ember']);
    expect(whisper).not.toBeNull();
    expect(whisper!.animalName).toBe('Ember');
    expect(whisper!.animalType).toBe('fox');
    expect(whisper!.text).toContain('EMBER');
  });

  test('covers every animal including the descent trio', () => {
    Math.random = () => 0;
    const animals = [
      'fox', 'pangolin', 'owl', 'axolotl', 'capybara', 'fennec_fox',
      'sloth', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
    ];
    for (const animal of animals) {
      const whisper = getPersonalizedPhase5Whisper([animal], ['VOID']);
      expect(whisper).not.toBeNull();
      expect(whisper!.animalType).toBe(animal);
      // A personalized template (not the generic pool) must exist for each.
      expect(whisper!.text).toContain('VOID');
      expect(whisper!.text).not.toMatch(/[–—]/);
    }
  });

  test('falls back to the standard pool when no words are recorded', () => {
    Math.random = () => 0;
    const whisper = getPersonalizedPhase5Whisper(['fox'], []);
    // Fallback delegates to getAnimalWhisper(5, ...) — may be null or generic,
    // but must never throw and never fabricate a word reference.
    if (whisper) {
      expect(typeof whisper.text).toBe('string');
      expect(whisper.text.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 3 animal whisper restraint', () => {
  test('keeps exactly five non-empty whispers for every animal', () => {
    expect(Object.keys(ANIMAL_WHISPERS[3]).sort()).toEqual([...ALL_ANIMAL_TYPES].sort());
    for (const animalType of ALL_ANIMAL_TYPES) {
      expect(ANIMAL_WHISPERS[3][animalType]).toHaveLength(5);
      expect(ANIMAL_WHISPERS[3][animalType].every(line => line.trim().length > 0)).toBe(true);
    }
  });

  test('keeps mechanics and explicit answers out of the whispers', () => {
    const normalized = Object.values(ANIMAL_WHISPERS[3]).flat().join(' ');
    expect(normalized).not.toMatch(FORBIDDEN_PHASE_3_CONTENT);
  });
});

describe('Phase 4 animal whisper subtlety', () => {
  const animalTypes = [
    'fox', 'owl', 'pangolin', 'axolotl', 'capybara', 'fennec_fox',
    'sloth', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
  ];
  const bluntExposition = /your plan|especially you|you wrote the last verse|you summoned/i;

  test('keeps exactly three in-character whispers per animal', () => {
    expect(Object.keys(ANIMAL_WHISPERS[4]).sort()).toEqual([...animalTypes].sort());
    for (const animalType of animalTypes) {
      expect(ANIMAL_WHISPERS[4][animalType]).toHaveLength(3);
    }
  });

  test('removes blunt explanations of the player role', () => {
    for (const whispers of Object.values(ANIMAL_WHISPERS[4])) {
      for (const whisper of whispers) {
        expect(whisper).not.toMatch(bluntExposition);
      }
    }
  });

  test('the public selector still draws from each animal voice', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      for (const animalType of animalTypes) {
        const result = getAnimalWhisper(4, [animalType]);
        expect(result?.animalType).toBe(animalType);
        expect(ANIMAL_WHISPERS[4][animalType]).toContain(result?.text);
      }
    } finally {
      random.mockRestore();
    }
  });
});

describe('Tending milestone ceremony compression', () => {
  const milestones = [3, 8, 15, 35, 70];

  test.each(milestones)('level %i has authored two-part ceremony copy', (level) => {
    const lines = getTendingMilestoneCeremonyText(level);
    expect(lines).toHaveLength(2);
    expect(lines.every(line => line.trim().length > 0)).toBe(true);
    expect(lines.join(' ')).not.toMatch(/[–—]/);
    expect(lines).not.toEqual([
      'The pattern deepens.',
      'Something old turns over in its long sleep, and is content.',
    ]);
  });

  test.each([5, 10, 25, 50, 100])('retired level %i uses the non-milestone fallback', (level) => {
    expect(getTendingMilestoneCeremonyText(level)).toEqual([
      'The pattern deepens.',
      'Something old turns over in its long sleep, and is content.',
    ]);
  });
});

describe('getPhaseIndicator', () => {
  test.each(ALL_PHASES)('returns object with icon and label for phase %i', (phase) => {
    const indicator = getPhaseIndicator(phase);
    expect(indicator).toHaveProperty('icon');
    expect(indicator).toHaveProperty('label');
    expect(typeof indicator.icon).toBe('string');
    expect(typeof indicator.label).toBe('string');
    expect(indicator.icon.length).toBeGreaterThan(0);
  });

  test('phase 0 is Bright Days', () => {
    const indicator = getPhaseIndicator(0);
    expect(indicator.label).toBe('Bright Days');
  });

  test('phase 4 is The Horizon', () => {
    const indicator = getPhaseIndicator(4);
    expect(indicator.label).toBe('The Horizon');
  });

  test('all phases return different labels', () => {
    const labels = ALL_PHASES.map(p => getPhaseIndicator(p).label);
    const unique = new Set(labels);
    expect(unique.size).toBe(5);
  });

  test('all phases return different icons', () => {
    const icons = ALL_PHASES.map(p => getPhaseIndicator(p).icon);
    const unique = new Set(icons);
    expect(unique.size).toBe(5);
  });
});

describe('getRulesText', () => {
  test.each(ALL_PHASES)('returns valid rules object for phase %i', (phase) => {
    const rules = getRulesText(phase);
    expect(rules).toHaveProperty('title');
    expect(rules).toHaveProperty('steps');
    expect(rules).toHaveProperty('dismissLabel');
    expect(typeof rules.title).toBe('string');
    expect(rules.title.length).toBeGreaterThan(0);
    expect(typeof rules.dismissLabel).toBe('string');
    expect(rules.dismissLabel.length).toBeGreaterThan(0);
  });

  test.each(ALL_PHASES)('has exactly 4 steps for phase %i', (phase) => {
    const rules = getRulesText(phase);
    expect(rules.steps).toHaveLength(4);
  });

  test.each(ALL_PHASES)('each step has heading and desc for phase %i', (phase) => {
    const rules = getRulesText(phase);
    for (const step of rules.steps) {
      expect(typeof step.heading).toBe('string');
      expect(step.heading.length).toBeGreaterThan(0);
      expect(typeof step.desc).toBe('string');
      expect(step.desc.length).toBeGreaterThan(0);
    }
  });

  test('phase 0 is cheerful and inviting', () => {
    const rules = getRulesText(0);
    expect(rules.title).toBe('HOW TO PLAY');
    expect(rules.dismissLabel).toBe("LET'S PLAY!");
    expect(rules.steps[0].heading).toContain('Pick');
  });

  test('phase 2 shifts to detached tone', () => {
    const rules = getRulesText(2);
    expect(rules.title).toBe('THE RULES');
    expect(rules.dismissLabel).toBe('CONTINUE');
  });

  test('phase 3 is unsettling', () => {
    const rules = getRulesText(3);
    expect(rules.title).toBe('THE PATTERN');
    expect(rules.dismissLabel).toBe('PROCEED');
  });

  test('phase 4 is existential/ritual', () => {
    const rules = getRulesText(4);
    expect(rules.title).toBe('THE ARRANGEMENT');
    expect(rules.dismissLabel).toBe('...');
    expect(rules.steps[3].heading).toContain('Ritual');
  });

  test('all phases have different titles', () => {
    const titles = ALL_PHASES.map(p => getRulesText(p).title);
    const unique = new Set(titles);
    // Phase 0 and 1 share "HOW TO PLAY", so 4 unique
    expect(unique.size).toBeGreaterThanOrEqual(4);
  });

  test('all phases have different dismiss labels', () => {
    const labels = ALL_PHASES.map(p => getRulesText(p).dismissLabel);
    const unique = new Set(labels);
    expect(unique.size).toBe(5);
  });

  test('step descriptions darken across phases', () => {
    const phase0Desc = getRulesText(0).steps[0].desc;
    const phase4Desc = getRulesText(4).steps[0].desc;
    // Phase 0 is "Tap any colorful tile", Phase 4 is much darker
    expect(phase0Desc).toContain('colorful');
    expect(phase4Desc).not.toContain('colorful');
  });
});

// ============================================================================
// Phase-Aware Error Messages (C3)
// ============================================================================

describe('getInvalidWordMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getInvalidWordMessage('BLORP', phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('includes the attempted word in all phases', () => {
    for (const phase of ALL_PHASES) {
      const msg = getInvalidWordMessage('ZXQW', phase);
      expect(msg).toContain('ZXQW');
    }
  });

  test('phase 0 is encouraging', () => {
    const msg = getInvalidWordMessage('CAT', 0);
    expect(msg).toContain("isn't a word");
    expect(msg).toContain('Try again');
  });

  test('phase 2 references the pattern', () => {
    const msg = getInvalidWordMessage('CAT', 2);
    expect(msg).toContain('pattern');
  });

  test('phase 3 references the arrangement', () => {
    const msg = getInvalidWordMessage('CAT', 3);
    expect(msg).toContain('arrangement');
  });

  test('phase 4 is nihilistic', () => {
    const msg = getInvalidWordMessage('CAT', 4);
    expect(msg).toContain('dissolves');
  });

  test('each phase produces a unique message for the same word', () => {
    const messages = ALL_PHASES.map(p => getInvalidWordMessage('TEST', p));
    const unique = new Set(messages);
    expect(unique.size).toBe(5);
  });
});

describe('getLockedLetterMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getLockedLetterMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('phase 0 says letter is locked', () => {
    expect(getLockedLetterMessage(0)).toContain('locked');
  });

  test('phase 2 says letter won\'t move', () => {
    expect(getLockedLetterMessage(2)).toContain("won't move");
  });

  test('phase 4 references the arrangement', () => {
    expect(getLockedLetterMessage(4)).toContain('arrangement');
  });

  test('each phase produces a unique message', () => {
    const messages = ALL_PHASES.map(p => getLockedLetterMessage(p));
    const unique = new Set(messages);
    expect(unique.size).toBe(5);
  });
});

describe('getNoValidMovesMessage', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test.each(allSixPhases)('returns a non-empty string for phase %i', (phase) => {
    const msg = getNoValidMovesMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('phase 0 tells the player to undo or clear', () => {
    const msg = getNoValidMovesMessage(0).toLowerCase();
    expect(msg).toContain('undo');
    expect(msg).toContain('clear');
  });

  test('phase 4 reflects the ritual tone', () => {
    expect(getNoValidMovesMessage(4)).toContain('arrangement');
  });

  test('each phase produces a unique message', () => {
    const messages = allSixPhases.map(p => getNoValidMovesMessage(p));
    const unique = new Set(messages);
    expect(unique.size).toBe(6);
  });
});

describe('getComboMoveMessage', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test.each(allSixPhases)('returns a non-empty string for phase %i at streak 2', (phase) => {
    const msg = getComboMoveMessage(2, phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('tier pools are sized 3 / 3 / 5 in every phase', () => {
    for (const phase of allSixPhases) {
      const [t2, t3, t4] = COMBO_MOVE_POOLS[phase];
      expect(t2).toHaveLength(3);
      expect(t3).toHaveLength(3);
      expect(t4).toHaveLength(5);
    }
  });

  test('each streak draws from its own tier pool', () => {
    for (const phase of allSixPhases) {
      const [t2, t3, t4] = COMBO_MOVE_POOLS[phase];
      for (let i = 0; i < 15; i++) {
        expect(t2).toContain(getComboMoveMessage(2, phase));
        expect(t3).toContain(getComboMoveMessage(3, phase));
        expect(t4).toContain(getComboMoveMessage(4, phase));
      }
    }
  });

  test('tiers within a phase are disjoint, so escalation always reads as climbing', () => {
    for (const phase of allSixPhases) {
      const all = COMBO_MOVE_POOLS[phase].flat();
      expect(new Set(all).size).toBe(all.length);
    }
  });

  test('signature lines survive as pool members', () => {
    expect(COMBO_MOVE_POOLS[4][2]).toContain('A flawless verse. It hears.');
    expect(COMBO_MOVE_POOLS[0][2]).toContain('On fire! Nothing is stopping you now!');
    expect(COMBO_MOVE_POOLS[5][2]).toContain('The weave sings, unbroken.');
  });

  test('saturates at the top tier for very long streaks', () => {
    // streak 4 and 9 both map to the final tier pool
    expect(COMBO_MOVE_POOLS[2][2]).toContain(getComboMoveMessage(9, 2));
    expect(COMBO_MOVE_POOLS[2][2]).toContain(getComboMoveMessage(4, 2));
  });

  test('clamps streaks below 2 to the first tier without throwing', () => {
    expect(typeof getComboMoveMessage(0, 3)).toBe('string');
    expect(COMBO_MOVE_POOLS[3][0]).toContain(getComboMoveMessage(1, 3));
  });
});

describe('getDragMissMessage', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test.each(allSixPhases)('returns a non-empty string for phase %i', (phase) => {
    const msg = getDragMissMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('each phase produces a unique message', () => {
    const unique = new Set(allSixPhases.map(p => getDragMissMessage(p)));
    expect(unique.size).toBe(6);
  });

  test('every phase references dropping onto a row', () => {
    allSixPhases.forEach(p => {
      expect(getDragMissMessage(p).toLowerCase()).toContain('row');
    });
  });
});

describe('getNotificationPromptText', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test.each(allSixPhases)('returns complete prompt copy for phase %i', (phase) => {
    const prompt = getNotificationPromptText(phase);
    expect(prompt.title.length).toBeGreaterThan(0);
    expect(prompt.body.length).toBeGreaterThan(0);
    expect(prompt.accept.length).toBeGreaterThan(0);
    expect(prompt.decline.length).toBeGreaterThan(0);
  });

  test('phase 0 copy is friendly', () => {
    const prompt = getNotificationPromptText(0);
    expect(prompt.title).toBe('Daily reminder?');
    expect(prompt.accept).toBe('Sounds good');
    expect(prompt.decline).toBe('Not now');
  });

  test('all phases stay honest — body mentions Settings', () => {
    for (const phase of allSixPhases) {
      expect(getNotificationPromptText(phase).body).toContain('Settings');
    }
  });

  test('each phase produces a unique title', () => {
    const titles = allSixPhases.map(p => getNotificationPromptText(p).title);
    const unique = new Set(titles);
    expect(unique.size).toBe(6);
  });
});

describe('getWinBackMessage', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];
  const rungs: (1 | 2 | 3)[] = [1, 2, 3];

  test.each(
    allSixPhases.flatMap(phase => rungs.map(rung => ({ phase, rung })))
  )('returns a non-empty string for phase $phase, rung $rung', ({ phase, rung }) => {
    const msg = getWinBackMessage(phase, rung);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('rungs escalate — each rung is distinct copy within a phase', () => {
    for (const phase of allSixPhases) {
      const unique = new Set(rungs.map(r => getWinBackMessage(phase, r)));
      expect(unique.size).toBe(3);
    }
  });

  test('phase 0 is warm and never leaks dark vocabulary', () => {
    for (const rung of rungs) {
      const msg = getWinBackMessage(0, rung);
      expect(msg).not.toContain('arrangement');
      expect(msg).not.toContain('void');
      expect(msg.toLowerCase()).not.toContain('silence');
    }
  });

  test('phases 2-3 open quietly unsettling — the house is quieter without you', () => {
    expect(getWinBackMessage(2, 1)).toContain('The house is quieter without you');
    expect(getWinBackMessage(3, 1)).toContain('The house is quieter without you');
  });

  test('phase 4 is reverent — the arrangement is incomplete', () => {
    expect(getWinBackMessage(4, 1)).toContain('The arrangement is incomplete');
  });

  test('phase 5 stays serene — no urgency, no dread', () => {
    for (const rung of rungs) {
      const msg = getWinBackMessage(5, rung).toLowerCase();
      expect(msg).not.toContain('incomplete');
      expect(msg).not.toContain('waits for your hand');
    }
    expect(getWinBackMessage(5, 3)).toContain('Nothing is lost');
  });

  test('rung 3 marks the week away at every phase', () => {
    for (const phase of allSixPhases) {
      expect(getWinBackMessage(phase, 3).toLowerCase()).toMatch(/week|seven days/);
    }
  });

  test('clamps out-of-bounds phases without throwing', () => {
    expect(() => getWinBackMessage(-1, 1)).not.toThrow();
    expect(() => getWinBackMessage(99, 3)).not.toThrow();
    expect(getWinBackMessage(-1, 1)).toBe(getWinBackMessage(0, 1));
    expect(getWinBackMessage(99, 2)).toBe(getWinBackMessage(5, 2));
  });
});

// ============================================================================
// Narrative Micro-Beats (B3)
// ============================================================================

describe('checkNarrativeMicroBeat', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await resetMicroBeats();
  });

  test('returns null for non-milestone puzzle counts', async () => {
    expect(await checkNarrativeMicroBeat(1)).toBeNull();
    expect(await checkNarrativeMicroBeat(10)).toBeNull();
    expect(await checkNarrativeMicroBeat(36)).toBeNull();
    expect(await checkNarrativeMicroBeat(99)).toBeNull();
  });

  test('returns early micro-beats in puzzles 5-25', async () => {
    const beat5 = await checkNarrativeMicroBeat(5);
    expect(beat5).not.toBeNull();
    expect(beat5!.type).toBe('ambient_whisper');
    // Ember is she/her (canon) — the first micro-beat must never misgender her.
    expect(beat5!.text).toContain('Ember');
    expect(beat5!.text).toContain('She');
    expect(beat5!.text).not.toMatch(/\bHe\b|\bhe\b|\bhis\b/);

    const beat8 = await checkNarrativeMicroBeat(8);
    expect(beat8).not.toBeNull();
    expect(beat8!.type).toBe('ambient_whisper');

    const beat12 = await checkNarrativeMicroBeat(12);
    expect(beat12).not.toBeNull();
    expect(beat12!.type).toBe('ambient_whisper');

    const beat16 = await checkNarrativeMicroBeat(16);
    expect(beat16).not.toBeNull();
    expect(beat16!.type).toBe('glitch_title');
    expect(beat16!.glitchTitle).toBe('WELCOME HOME');

    const beat20 = await checkNarrativeMicroBeat(20);
    expect(beat20).not.toBeNull();
    expect(beat20!.type).toBe('ambient_whisper');

    const beat25 = await checkNarrativeMicroBeat(25);
    expect(beat25).not.toBeNull();
    expect(beat25!.type).toBe('ambient_whisper');
  });

  test('returns a beat at puzzle 35', async () => {
    const beat = await checkNarrativeMicroBeat(35);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('glitch_title');
    expect(beat!.glitchTitle).toBeDefined();
    expect(beat!.durationMs).toBeGreaterThan(0);
  });

  test('returns a beat at puzzle 42', async () => {
    const beat = await checkNarrativeMicroBeat(42);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a beat at puzzle 50', async () => {
    const beat = await checkNarrativeMicroBeat(50);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
  });

  test('returns a beat at puzzle 70', async () => {
    const beat = await checkNarrativeMicroBeat(70);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
  });

  test('keeps the narrative pulse alive through the valley and the dwell window', async () => {
    for (const count of [75, 82, 88, 92, 106, 109, 112, 115]) {
      await resetMicroBeats();
      (AsyncStorage.clear as jest.Mock)();
      const beat = await checkNarrativeMicroBeat(count);
      expect(beat).not.toBeNull();
      expect(beat!.type).toBe('ambient_whisper');
      expect(beat!.text).toBeTruthy();
      expect(beat!.durationMs).toBeGreaterThan(0);
    }
  });

  test('does not fire the same beat twice', async () => {
    const first = await checkNarrativeMicroBeat(35);
    expect(first).not.toBeNull();

    const second = await checkNarrativeMicroBeat(35);
    expect(second).toBeNull();
  });

  test('different milestones fire independently', async () => {
    const beat35 = await checkNarrativeMicroBeat(35);
    expect(beat35).not.toBeNull();

    const beat42 = await checkNarrativeMicroBeat(42);
    expect(beat42).not.toBeNull();

    // 35 already consumed, 42 already consumed
    expect(await checkNarrativeMicroBeat(35)).toBeNull();
    expect(await checkNarrativeMicroBeat(42)).toBeNull();

    // 54 and 70 still available
    expect(await checkNarrativeMicroBeat(54)).not.toBeNull();
    expect(await checkNarrativeMicroBeat(70)).not.toBeNull();
  });

  test('resetMicroBeats clears consumed state', async () => {
    await checkNarrativeMicroBeat(35);
    expect(await checkNarrativeMicroBeat(35)).toBeNull();

    await resetMicroBeats();

    const beat = await checkNarrativeMicroBeat(35);
    expect(beat).not.toBeNull();
  });

  // New micro-beat thresholds (assessment-driven expansion)
  test('returns a beat at puzzle 38', async () => {
    const beat = await checkNarrativeMicroBeat(38);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
    expect(beat!.durationMs).toBeGreaterThan(0);
  });

  test('returns a beat at puzzle 45', async () => {
    const beat = await checkNarrativeMicroBeat(45);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a glitch_title beat at puzzle 61', async () => {
    const beat = await checkNarrativeMicroBeat(61);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('glitch_title');
    expect(beat!.glitchTitle).toBeDefined();
    expect(beat!.durationMs).toBeGreaterThan(0);
  });

  test('returns a beat at puzzle 64', async () => {
    const beat = await checkNarrativeMicroBeat(64);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a beat at puzzle 75 (first valley beat)', async () => {
    const beat = await checkNarrativeMicroBeat(75);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a beat at puzzle 92 (reveal-adjacent)', async () => {
    const beat = await checkNarrativeMicroBeat(92);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('all 28 micro-beat thresholds fire independently', async () => {
    const thresholds = [
      5, 8, 12, 16, 20, 25, 30, 31, 33, 35, 38, 42, 45, 50, 54, 58, 61, 64, 70,
      75, 82, 88, 92, 104, 106, 109, 112, 115,
    ];
    for (const t of thresholds) {
      const beat = await checkNarrativeMicroBeat(t);
      expect(beat).not.toBeNull();
    }
    // All consumed — none should fire again
    for (const t of thresholds) {
      expect(await checkNarrativeMicroBeat(t)).toBeNull();
    }
  });
});

// ============================================================================
// Micro-beat geography (v1.3.2 compressed pacing: reveal ~90,
// completion/recruit ~96-100, dwell ~104-108, arming floor 115, final board
// ~116, post-revelation ~117-122)
// ============================================================================

describe('MICRO_BEATS geography', () => {
  const keys = Object.keys(MICRO_BEATS).map(Number).sort((a, b) => a - b);

  test('keys match the new geography exactly', () => {
    expect(keys).toEqual([
      5, 8, 12, 16, 20, 25, 30, 31, 33, 35, 38, 42, 45, 50, 54, 58, 61, 64, 70,
      75, 82, 88, 92, 104, 106, 109, 112, 115,
    ]);
  });

  test('the puzzle-31 held glitch is prominent and the 33 whisper half-normalizes it', () => {
    expect(MICRO_BEATS[31].type).toBe('glitch_title');
    expect(MICRO_BEATS[31].glitchTitle).toBe('YOU ARE DOING SO WELL');
    // Held long enough to be read on purpose, unlike the subliminal flickers.
    expect(MICRO_BEATS[31].durationMs).toBeGreaterThan(MICRO_BEATS[16].durationMs);
    expect(MICRO_BEATS[33].type).toBe('ambient_whisper');
    expect(MICRO_BEATS[33].text).toContain('only the house');
  });

  test('nothing fires past 115 (the arming floor): the finale (~116) gets the silence', () => {
    expect(keys[keys.length - 1]).toBe(115);
  });

  test('the silent-victory anticlimax sits at 104, before the finale', () => {
    expect(MICRO_BEATS[104].type).toBe('silent_victory');
    expect(isSilentVictoryBeat(104)).toBe(true);
    // Exactly one silent victory in the whole table.
    const silents = keys.filter(k => MICRO_BEATS[k].type === 'silent_victory');
    expect(silents).toEqual([104]);
    expect(isSilentVictoryBeat(115)).toBe(false);
  });

  test('the complicity beat lands at 106', () => {
    expect(MICRO_BEATS[106].text).toBe(
      'You could stop now. You know that. You won\'t. They know that too.'
    );
  });

  test('house-wholeness language only appears at or after completion (~96-100)', () => {
    for (const k of keys) {
      const text = (MICRO_BEATS[k].text ?? '').toLowerCase();
      if (/is whole|every room is built|every keeper is home/.test(text)) {
        expect(k).toBeGreaterThanOrEqual(96);
      }
    }
    // And the dwell-window beats DO speak of the whole house.
    expect(MICRO_BEATS[109].text!.toLowerCase()).toContain('every room is built');
    expect(MICRO_BEATS[112].text!.toLowerCase()).toContain('the house is whole');
  });

  test('dwell beats never surface a counter or number', () => {
    for (const k of [109, 112]) {
      expect(MICRO_BEATS[k].text).not.toMatch(/\d/);
    }
  });

  test('the pre-completion builder beat sits before the house is whole', () => {
    expect(MICRO_BEATS[88].text).toContain('The house keeps making room');
  });

  test('no beat says Phase or carries a dash', () => {
    for (const k of keys) {
      const text = MICRO_BEATS[k].text ?? '';
      expect(text).not.toMatch(/[–—]/);
      expect(text).not.toMatch(/\bPhase\b/);
    }
  });
});

// ============================================================================
// Home Screen Nudge
// ============================================================================

describe('getHomescreenNudge', () => {
  test('returns null when puzzlesSinceHome < 3', () => {
    expect(getHomescreenNudge(0, ['fox'], 0)).toBeNull();
    expect(getHomescreenNudge(0, ['fox'], 1)).toBeNull();
    expect(getHomescreenNudge(0, ['fox'], 2)).toBeNull();
  });

  test('returns null when no animals are unlocked', () => {
    expect(getHomescreenNudge(0, [], 5)).toBeNull();
  });

  test('returns object with animalName and text when conditions met', () => {
    const result = getHomescreenNudge(0, ['fox'], 3);
    expect(result).not.toBeNull();
    expect(result!.animalName).toBeDefined();
    expect(result!.animalName.length).toBeGreaterThan(0);
    expect(result!.text).toBeDefined();
    expect(result!.text.length).toBeGreaterThan(0);
  });

  test.each(ALL_PHASES)('returns valid nudge for phase %i', (phase) => {
    const result = getHomescreenNudge(phase, ['fox', 'owl'], 5);
    expect(result).not.toBeNull();
    expect(typeof result!.text).toBe('string');
    expect(result!.text.length).toBeGreaterThan(0);
  });

  test('nudge text contains animal name', () => {
    // Run multiple times since animal selection is random
    for (let i = 0; i < 20; i++) {
      const result = getHomescreenNudge(0, ['fox'], 4);
      if (result) {
        expect(result.animalName).toBe('Ember');
      }
    }
  });
});

// ============================================================================
// Harvest Overflow Warning (Feature 6)
// ============================================================================

describe('getHarvestOverflowMessage', () => {
  test('returns a non-empty string for all phases', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const msg = getHarvestOverflowMessage(phase);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  test('phase 0-1 is friendly and mentions the Pit', () => {
    expect(getHarvestOverflowMessage(0)).toContain('Pit');
    expect(getHarvestOverflowMessage(1)).toContain('Pit');
  });

  test('phase 2 references the harvest overflowing', () => {
    expect(getHarvestOverflowMessage(2)).toContain('overflows');
  });

  test('phase 3+ is dark and imperative', () => {
    expect(getHarvestOverflowMessage(3)).toContain('Feed it');
    expect(getHarvestOverflowMessage(4)).toContain('Feed it');
  });

  test('different phase ranges produce different messages', () => {
    const p0 = getHarvestOverflowMessage(0);
    const p2 = getHarvestOverflowMessage(2);
    const p3 = getHarvestOverflowMessage(3);
    expect(p0).not.toBe(p2);
    expect(p2).not.toBe(p3);
    expect(p0).not.toBe(p3);
  });
});

// ============================================================================
// Challenge Mode Fox Intro (Feature 3)
// ============================================================================

describe('getChallengeIntroLines', () => {
  test('returns exactly 3 lines for all phases', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const lines = getChallengeIntroLines(phase);
      expect(Array.isArray(lines)).toBe(true);
      expect(lines).toHaveLength(3);
    }
  });

  test('all lines are non-empty strings', () => {
    for (const phase of [0, 1, 2, 3, 4] as const) {
      const lines = getChallengeIntroLines(phase);
      for (const line of lines) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  test('phase 0-1 mentions amber reward bonus', () => {
    const lines = getChallengeIntroLines(0);
    const joined = lines.join(' ');
    expect(joined).toContain('amber');
  });

  test('phase 2 uses curious tone', () => {
    const lines = getChallengeIntroLines(2);
    const joined = lines.join(' ');
    expect(joined).toContain('harder path');
  });

  test('phase 3+ uses ritual language', () => {
    const lines = getChallengeIntroLines(3);
    const joined = lines.join(' ');
    expect(joined).toContain('arrangement');
  });

  test('different phase ranges produce different content', () => {
    const p0 = getChallengeIntroLines(0).join('');
    const p2 = getChallengeIntroLines(2).join('');
    const p3 = getChallengeIntroLines(3).join('');
    expect(p0).not.toBe(p2);
    expect(p2).not.toBe(p3);
  });
});

describe('getJournalIntroLines', () => {
  test('returns exactly 5 lines for all phases', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const lines = getJournalIntroLines(phase);
      expect(Array.isArray(lines)).toBe(true);
      expect(lines).toHaveLength(5);
    }
  });

  test('all lines are non-empty strings', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const lines = getJournalIntroLines(phase);
      for (const line of lines) {
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  test('phase 0 keeps the tone warm and welcoming', () => {
    const joined = getJournalIntroLines(0).join(' ');
    expect(joined).toContain('journal');
    expect(joined).toContain('scrapbook');
  });

  test('phase 2 references the house and recorded whispers', () => {
    const joined = getJournalIntroLines(2).join(' ');
    expect(joined).toContain('house');
    expect(joined).toContain('whispers');
  });

  test('phase 4 uses arrangement language', () => {
    const joined = getJournalIntroLines(4).join(' ');
    expect(joined).toContain('arrangement');
    expect(joined).toContain('offered');
  });

  test('different phase ranges produce different content', () => {
    const p0 = getJournalIntroLines(0).join('');
    const p2 = getJournalIntroLines(2).join('');
    const p4 = getJournalIntroLines(4).join('');
    expect(p0).not.toBe(p2);
    expect(p2).not.toBe(p4);
    expect(p0).not.toBe(p4);
  });
});

describe('getJournalSpotlightSteps', () => {
  test('returns exactly 5 steps for all phases', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const steps = getJournalSpotlightSteps(phase, 'Whisper Gallery');
      expect(steps).toHaveLength(5);
    }
  });

  test('marks only the first 4 steps as preview cards', () => {
    const steps = getJournalSpotlightSteps(0, 'Whisper Gallery');
    expect(steps.filter(step => step.showInPreview)).toHaveLength(4);
    expect(steps[4].showInPreview).toBe(false);
  });

  test('uses a warm CTA in phase 0 and darker CTA in phase 4', () => {
    const phase0 = getJournalSpotlightSteps(0, 'Whisper Gallery');
    const phase4 = getJournalSpotlightSteps(4, 'Whisper Gallery');
    expect(phase0[4].finalCtaLabel).toBe('Take a Look');
    expect(phase4[4].finalCtaLabel).toBe('Enter the Record');
  });

  test('preserves the provided gallery title', () => {
    const steps = getJournalSpotlightSteps(2, 'Voices in the Walls');
    expect(steps[2].title).toBe('Voices in the Walls');
  });
});

// ============================================================================
// Mandatory Pit Phase Transition (Feature 1)
// ============================================================================

describe('getPitMandatoryText', () => {
  test('returns a non-empty string for all phases', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const text = getPitMandatoryText(phase);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('phase 0-1 mentions stirring and offering words', () => {
    const text = getPitMandatoryText(0);
    expect(text).toContain('stirring');
    expect(text).toContain('Offer');
  });

  test('phase 2 mentions something stirs beneath', () => {
    const text = getPitMandatoryText(2);
    expect(text).toContain('stirs');
  });

  test('phase 3+ references wards and the pit', () => {
    const text = getPitMandatoryText(3);
    expect(text).toContain('wards');
    expect(text).toContain('pit');
  });

  test('different phase ranges produce different messages', () => {
    const p0 = getPitMandatoryText(0);
    const p2 = getPitMandatoryText(2);
    const p3 = getPitMandatoryText(3);
    expect(p0).not.toBe(p2);
    expect(p2).not.toBe(p3);
  });
});

describe('getPitMandatoryCTA', () => {
  test('returns a non-empty string for all phases', () => {
    for (const phase of [0, 1, 2, 3, 4, 5] as const) {
      const cta = getPitMandatoryCTA(phase);
      expect(typeof cta).toBe('string');
      expect(cta.length).toBeGreaterThan(0);
    }
  });

  test('phase 0-2 says Visit the Pit', () => {
    expect(getPitMandatoryCTA(0)).toBe('Visit the Pit');
    expect(getPitMandatoryCTA(1)).toBe('Visit the Pit');
    expect(getPitMandatoryCTA(2)).toBe('Visit the Pit');
  });

  test('phase 3+ is more demanding', () => {
    expect(getPitMandatoryCTA(3)).toContain('demands');
    expect(getPitMandatoryCTA(4)).toContain('demands');
  });
});

describe('getSpeedTimeUpMessage', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test('returns a non-empty string for every phase', () => {
    for (const phase of allSixPhases) {
      expect(getSpeedTimeUpMessage(phase).length).toBeGreaterThan(0);
    }
  });

  test('messages are distinct across phases', () => {
    const messages = allSixPhases.map(p => getSpeedTimeUpMessage(p));
    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe('getWhisperGalleryEmptyText', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test('returns a non-empty string for every phase', () => {
    for (const phase of allSixPhases) {
      expect(getWhisperGalleryEmptyText(phase).length).toBeGreaterThan(0);
    }
  });
});

describe('getNextStreakMilestoneText', () => {
  test('returns progress text below the top milestone', () => {
    const text = getNextStreakMilestoneText(0, 2);
    expect(text).not.toBeNull();
    // next milestone after 2 days is 3 days -> +15 amber
    expect(text).toContain('15');
  });

  test('returns null at or above the top milestone', () => {
    expect(getNextStreakMilestoneText(0, 30)).toBeNull();
    expect(getNextStreakMilestoneText(0, 45)).toBeNull();
  });

  test('returns a string for darker phases too', () => {
    const text = getNextStreakMilestoneText(4, 5);
    expect(typeof text).toBe('string');
    expect((text as string).length).toBeGreaterThan(0);
  });
});

describe('Phase 5 victory register (serene, distinct from Phase 4 offering)', () => {
  it('getRitualEchoHeader gives Phase 5 its own settled header', () => {
    expect(getRitualEchoHeader(4)).toBe('The Offering:');
    expect(getRitualEchoHeader(5)).toBe('The Pattern:');
    expect(getRitualEchoHeader(5)).not.toBe(getRitualEchoHeader(4));
  });

  it('getRitualEchoFooter weaves rather than offers at Phase 5', () => {
    expect(getRitualEchoFooter(4, 3)).toContain('offered');
    expect(getRitualEchoFooter(5, 3)).toContain('woven');
    expect(getRitualEchoFooter(5, 3)).not.toBe(getRitualEchoFooter(4, 3));
  });

  it('getWordsOfferedText shifts to the Phase 5 weave register', () => {
    expect(getWordsOfferedText(7, 4)).toContain('arrangement');
    expect(getWordsOfferedText(7, 5)).toContain('woven');
    expect(getWordsOfferedText(7, 5)).not.toBe(getWordsOfferedText(7, 4));
  });

  it('getIncantationName uses serene Phase 5 templates', () => {
    const words = ['VOID', 'DOOM'];
    const p4 = getIncantationName(words, 4);
    const p5 = getIncantationName(words, 5);
    expect(typeof p5).toBe('string');
    expect((p5 as string).length).toBeGreaterThan(0);
    // Phase 5 templates never use the Phase 4 "Offering:"/"Incantation" framing
    expect(p5).not.toMatch(/Offering|Incantation|Descends/);
  });
});

describe('small interaction copy (toasts, alerts, buttons)', () => {
  const {
    getFirstDailyMercyMessage,
    getSpeedRescueLabel,
    getDailyLockedMessage,
    getBadChallengeLinkMessage,
    getUnplayableChallengeMessage,
    getShopStoreBridgeText,
    getDailyLoginFirstClaimCopy,
  } = require('../services/phaseNarrative');

  const phases = [0, 1, 2, 3, 4, 5];

  it('mercy message always names the hint count and shifts tone by phase', () => {
    for (const p of phases) {
      expect(getFirstDailyMercyMessage(p, 2)).toContain('+2');
    }
    expect(getFirstDailyMercyMessage(0, 2)).not.toBe(getFirstDailyMercyMessage(4, 2));
  });

  it('speed rescue label always names the seconds granted', () => {
    for (const p of phases) {
      expect(getSpeedRescueLabel(p, 30)).toContain('+30s');
    }
    expect(getSpeedRescueLabel(0, 30)).not.toBe(getSpeedRescueLabel(4, 30));
  });

  it('alert copy is non-empty at every phase and never leaks phase numbers', () => {
    for (const p of phases) {
      for (const text of [
        getDailyLockedMessage(p),
        getBadChallengeLinkMessage(p),
        getUnplayableChallengeMessage(p),
      ]) {
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/Phase \d/);
      }
    }
  });

  it('shop store bridge gives title + subtitle at every phase', () => {
    for (const p of phases) {
      const { title, subtitle } = getShopStoreBridgeText(p);
      expect(title.length).toBeGreaterThan(0);
      expect(subtitle.length).toBeGreaterThan(0);
    }
    expect(getShopStoreBridgeText(0).title).toBe('Need more amber?');
    expect(getShopStoreBridgeText(0).title).not.toBe(getShopStoreBridgeText(4).title);
  });

  it('first-claim login copy never says Welcome Back and stays phase-toned', () => {
    for (const p of phases) {
      const { title, subtitle } = getDailyLoginFirstClaimCopy(p);
      expect(title.toLowerCase()).not.toContain('welcome back');
      expect(subtitle.length).toBeGreaterThan(0);
    }
    expect(getDailyLoginFirstClaimCopy(0).title).toBe('Welcome to the House');
  });
});

describe('victory glitch', () => {
  test('getVictoryGlitch no longer force-fires on the first puzzle (that landed on the tutorial)', () => {
    // With Math.random pinned high, the ambient path never fires — proving the
    // old puzzlesSolved===1 guarantee is gone (the guaranteed one moved to the
    // first free win via getFirstWinGlitchText).
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      expect(getVictoryGlitch(0, 1)).toBeNull();
      expect(getVictoryGlitch(0, 5)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  test('getVictoryGlitch stays Phase-0 only and can fire ambiently', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.0);
    try {
      expect(getVictoryGlitch(0, 5)).not.toBeNull();
      expect(getVictoryGlitch(2, 5)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  test('getFirstWinGlitchText returns a stable non-empty glitch', () => {
    expect(getFirstWinGlitchText()).toBe('WE SEE YOU');
  });
});

// ============================================================================
// Incantation article fix (a/an)
// ============================================================================

describe('getIncantationName indefinite article', () => {
  // The template pick is a deterministic hash of the joined words; filler
  // second words A-E cover every residue mod the template count, so exactly
  // one candidate lands on the Journey template.
  const journeyFor = (first: string): string | null => {
    for (const filler of ['A', 'B', 'C', 'D', 'E']) {
      const name = getIncantationName([first, filler], 2);
      if (name && name.includes("'s Journey")) return name;
    }
    return null;
  };

  test('vowel-initial words take An (never "A ABYSS\'s Journey")', () => {
    expect(journeyFor('ABYSS')).toBe("An ABYSS's Journey");
  });

  test('consonant-initial words keep A', () => {
    expect(journeyFor('DOOM')).toBe("A DOOM's Journey");
  });
});

// ============================================================================
// Goal-suggestion register (UI nomenclature never fused with dread)
// ============================================================================

describe('goal-suggestion register separation', () => {
  test('phase 4 Medium names the mode plainly; the dread colors its own sentence', () => {
    const s = getGoalSuggestion(4, false, ['MEDIUM'], null, false, 0, false);
    expect(s).not.toBeNull();
    expect(s!.text).toBe('Medium remains open. Whatever you form there is received.');
    expect(s!.text).not.toContain('Medium offerings');
  });

  test('phase 5 Medium+ no longer strengthens the tapestry as a compound slogan', () => {
    const s = getGoalSuggestion(5, false, ['MEDIUM_PLUS'], null, false, 0, false);
    expect(s).not.toBeNull();
    expect(s!.text).not.toContain('Medium+ patterns');
  });

  test('the "Feed the void faster" slogan is retired', () => {
    const s = getGoalSuggestion(4, false, [], 'speed', false, 0, false);
    expect(s).not.toBeNull();
    expect(s!.text).toContain('Speed Shift');
    expect(s!.text).not.toContain('Feed the void faster');
  });

  test('phase 5 quest nudges no longer fuse Weekly with the weave register', () => {
    for (let i = 0; i < 20; i++) {
      const s = getGoalSuggestion(5, false, [], null, false, 0, true);
      expect(s).not.toBeNull();
      expect(s!.text).not.toBe('Weekly patterns await completion.');
      expect(s!.text.toLowerCase()).not.toContain('weekly threads');
      expect(s!.text.toLowerCase()).not.toContain('weekly patterns');
    }
  });
});

// ============================================================================
// Pit offer-result pools
// ============================================================================

describe('getPitOfferResultMessage', () => {
  const allSixPhases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];

  test('five templates per phase', () => {
    for (const p of allSixPhases) {
      expect(PIT_OFFER_RESULT_MESSAGES[p]).toHaveLength(5);
    }
  });

  test('every template pays the amber; placeholders always resolve', () => {
    for (const p of allSixPhases) {
      for (const t of PIT_OFFER_RESULT_MESSAGES[p]) {
        expect(t).toContain('{amber}');
        expect(t).not.toMatch(/[–—]/);
        expect(t).not.toMatch(/\bPhase\b/);
      }
      for (let i = 0; i < 25; i++) {
        const msg = getPitOfferResultMessage(p, 7, 42);
        expect(msg).not.toContain('{words}');
        expect(msg).not.toContain('{amber}');
        expect(msg).toContain('42');
      }
    }
  });
});

// ============================================================================
// Animal interjection pools
// ============================================================================

describe('INTERJECTION_MESSAGES', () => {
  test('six templates per phase, each carrying the {name} slot', () => {
    for (const p of [0, 1, 2, 3, 4, 5]) {
      expect(INTERJECTION_MESSAGES[p]).toHaveLength(6);
      for (const t of INTERJECTION_MESSAGES[p]) {
        expect(t).toContain('{name}');
        expect(t).not.toMatch(/[–—]/);
        expect(t).not.toMatch(/\bPhase\b/);
      }
    }
  });
});

// ============================================================================
// New copy surfaces: dwell window, streak-held mercy, preview graduation,
// swift-victory pointer, final board, New Cycle half-memories
// ============================================================================

describe('getDwellLine', () => {
  const DWELL_WINDOW = [1, 2, 3, 4, 5, 6, 7, 8];

  test('each of the 8 dwell wins gets its own line (no recycling as padding)', () => {
    const lines = DWELL_WINDOW.map(n => getDwellLine(n, 4));
    expect(new Set(lines).size).toBe(8);
    for (const line of lines) {
      expect(line.trim().length).toBeGreaterThan(0);
      expect(line).not.toMatch(/\d/);
      expect(line).not.toMatch(/[–—]/);
      expect(line.toLowerCase()).not.toContain('phase');
    }
    expect(lines[0].toLowerCase()).toContain('whole');
  });

  test('the original anchor lines stay at their positions', () => {
    expect(getDwellLine(1, 4)).toBe(
      'The house is whole. It is quiet in a new way, like a table set before the guests arrive.'
    );
    expect(getDwellLine(3, 4)).toBe(
      'The rooms are ready. The keepers are ready. What is coming is almost ready too.'
    );
    expect(getDwellLine(7, 4)).toBe(
      'It is very close now. The house holds still, the way you hold still when something is about to speak.'
    );
  });

  test('keeps a distinct serene register at phase 5, also 8 distinct lines', () => {
    const serene = DWELL_WINDOW.map(n => getDwellLine(n, 5));
    expect(new Set(serene).size).toBe(8);
    for (let i = 0; i < DWELL_WINDOW.length; i++) {
      expect(serene[i].trim().length).toBeGreaterThan(0);
      expect(serene[i]).not.toBe(getDwellLine(DWELL_WINDOW[i], 4));
      expect(serene[i]).not.toMatch(/\d/);
      expect(serene[i]).not.toMatch(/[–—]/);
      expect(serene[i].toLowerCase()).not.toContain('phase');
    }
  });

  test('clamps out-of-window counts instead of crashing', () => {
    expect(getDwellLine(0, 4)).toBe(getDwellLine(1, 4));
    expect(getDwellLine(99, 4)).toBe(getDwellLine(8, 4));
    expect(getDwellLine(99, 5)).toBe(getDwellLine(8, 5));
  });

  test('uses distinct held-breath lines after the capped eighth dwell at puzzles 108 and 113', () => {
    const eighthDwell = getDwellLine(8, 4);
    const puzzle108 = getPostCapDwellLine(108, 4);
    const puzzle113 = getPostCapDwellLine(113, 4);

    expect(puzzle108).not.toBe(eighthDwell);
    expect(puzzle113).not.toBe(eighthDwell);
    expect(puzzle113).not.toBe(puzzle108);
    for (const line of [puzzle108, puzzle113]) {
      expect(line).not.toMatch(/[–—]/);
      expect(line.toLowerCase()).not.toContain('phase');
      expect(line).not.toMatch(/\d/);
    }
  });
});

describe('getStreakHeldMessage', () => {
  test('always names the held streak and shifts register with phase', () => {
    for (const p of [0, 2, 4]) {
      const msg = getStreakHeldMessage(9, p);
      expect(msg).toContain('9');
      expect(msg).not.toMatch(/[–—]/);
    }
    expect(getStreakHeldMessage(9, 0)).toContain('held at 9');
    expect(getStreakHeldMessage(9, 0)).not.toBe(getStreakHeldMessage(9, 4));
  });

  test('stays warm at every register: never blame, never loss language', () => {
    for (const p of [0, 1, 2, 3, 4, 5]) {
      expect(getStreakHeldMessage(3, p).toLowerCase()).not.toMatch(/lost|broke\b|reset|missed it/);
    }
  });

  test('phase defaults to the bright voice when omitted', () => {
    expect(getStreakHeldMessage(5)).toBe(getStreakHeldMessage(5, 0));
  });
});

describe('getPreviewGraduationMessage', () => {
  test('marks earned word judgment, in-world, without mechanics vocabulary', () => {
    for (const p of [0, 2, 4]) {
      const msg = getPreviewGraduationMessage(p);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg.toLowerCase()).not.toMatch(/easy|difficulty|preview|setting|valid/);
      expect(msg).not.toMatch(/[–—]/);
    }
    expect(getPreviewGraduationMessage(0).toLowerCase()).toMatch(/learned|trust your ear/);
    expect(getPreviewGraduationMessage(2)).not.toBe(getPreviewGraduationMessage(0));
    expect(getPreviewGraduationMessage(4)).not.toBe(getPreviewGraduationMessage(2));
  });
});

describe('getSwiftVictoryHintMessage', () => {
  test('points at Settings in an in-world voice, never a tutorial voice', () => {
    for (const p of [0, 2, 4]) {
      const msg = getSwiftVictoryHintMessage(p);
      expect(msg).toContain('Settings');
      expect(msg.toLowerCase()).not.toMatch(/tap |toggle|enable|button/);
      expect(msg).not.toMatch(/[–—]/);
    }
    expect(getSwiftVictoryHintMessage(0)).not.toBe(getSwiftVictoryHintMessage(4));
  });
});

describe('getFinalBoardStartMessage', () => {
  test('is quiet and heavy, with no fourth wall', () => {
    const msg = getFinalBoardStartMessage(4);
    expect(msg).toBe('The last arrangement. Take your time. It has waited this long.');
    expect(msg.toLowerCase()).not.toMatch(/game|level|screen/);
    expect(getFinalBoardStartMessage(5)).not.toBe(msg);
  });
});

describe('getCycleMicroBeat', () => {
  test('six half-memories at the cycle-relative keys, silence everywhere else', () => {
    const keys = Object.keys(CYCLE_MICRO_BEATS).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([3, 10, 20, 34, 52, 75]);
    for (const k of keys) {
      const beat = getCycleMicroBeat(k);
      expect(beat).not.toBeNull();
      expect(beat!.type).toBe('ambient_whisper');
      expect(beat!.text!.length).toBeGreaterThan(0);
      expect(beat!.text).not.toMatch(/[–—]/);
      // Half-memory, never explicit: the animals must never name the loop.
      expect(beat!.text!.toLowerCase()).not.toMatch(/cycle|last time|start over|began again/);
      expect(beat!.durationMs).toBeGreaterThan(0);
    }
    expect(getCycleMicroBeat(0)).toBeNull();
    expect(getCycleMicroBeat(4)).toBeNull();
    expect(getCycleMicroBeat(99)).toBeNull();
  });

  test('the first half-memory belongs to Ember at the fire', () => {
    const beat = getCycleMicroBeat(3);
    expect(beat!.text).toContain('Ember');
    expect(beat!.text).toContain('fire');
  });

  test('canon pronouns hold across the half-memories', () => {
    expect(getCycleMicroBeat(10)!.text).toContain('she says'); // Panko
    expect(getCycleMicroBeat(20)!.text).toContain('his handwriting'); // Archimedes
    expect(getCycleMicroBeat(75)!.text).toContain('her'); // Sloane
  });
});

// ============================================================================
// Cycle-relative micro-beat delivery (NG+ depth): on cycleCount > 0 the beats
// key on puzzles-solved-this-cycle, with a per-cycle seen set. Half-memory
// CYCLE_MICRO_BEATS win at shared keys; regular MICRO_BEATS re-fire EXCEPT the
// forever-once silent_victory (and the first-win glitch, which lives on its
// own never-reset flag).
// ============================================================================

describe('checkCycleNarrativeMicroBeat + resolveVictoryMicroBeat', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await resetMicroBeats();
  });

  test('cycle beats fire once per cycle at their cycle-relative keys', async () => {
    const beat = await checkCycleNarrativeMicroBeat(3, 1);
    expect(beat).not.toBeNull();
    expect(beat!.text).toContain('Ember'); // the half-memory wins its key
    // Consumed for THIS cycle.
    expect(await checkCycleNarrativeMicroBeat(3, 1)).toBeNull();
    // A deeper cycle replays it (the seen set is per-cycle).
    expect(await checkCycleNarrativeMicroBeat(3, 2)).not.toBeNull();
  });

  test('regular micro-beats re-fire cycle-relative on a new cycle', async () => {
    // 35 is a regular MICRO_BEATS key (no cycle beat there).
    const beat = await checkCycleNarrativeMicroBeat(35, 1);
    expect(beat).not.toBeNull();
    expect(beat).toEqual(MICRO_BEATS[35]);
    expect(await checkCycleNarrativeMicroBeat(35, 1)).toBeNull();
  });

  test('half-memory beats take priority over regular beats at shared keys', async () => {
    // 20 and 75 exist on BOTH tracks — the cycle half-memory must win.
    const beat20 = await checkCycleNarrativeMicroBeat(20, 1);
    expect(beat20).toEqual(CYCLE_MICRO_BEATS[20]);
    const beat75 = await checkCycleNarrativeMicroBeat(75, 1);
    expect(beat75).toEqual(CYCLE_MICRO_BEATS[75]);
  });

  test('the silent_victory anticlimax stays forever-once (never re-fires on a cycle)', async () => {
    const silentKey = Number(
      Object.keys(MICRO_BEATS).find(k => MICRO_BEATS[Number(k)].type === 'silent_victory')
    );
    expect(Number.isFinite(silentKey)).toBe(true);
    expect(await checkCycleNarrativeMicroBeat(silentKey, 1)).toBeNull();
  });

  test('returns null on the first playthrough or at non-keys', async () => {
    expect(await checkCycleNarrativeMicroBeat(3, 0)).toBeNull();
    expect(await checkCycleNarrativeMicroBeat(0, 1)).toBeNull();
    expect(await checkCycleNarrativeMicroBeat(999, 1)).toBeNull();
  });

  test('resolveVictoryMicroBeat routes by cycle: absolute on cycle 0, relative after', async () => {
    // First playthrough: absolute count consumes the classic track.
    const first = await resolveVictoryMicroBeat(35, 0, 0);
    expect(first).toEqual(MICRO_BEATS[35]);
    // Cycle 1 at total 203, started at 200 → cycle-relative 3 → Ember's half-memory.
    const cycled = await resolveVictoryMicroBeat(203, 1, 200);
    expect(cycled).toEqual(CYCLE_MICRO_BEATS[3]);
    // Legacy cycled save with no anchor (cycleStartPuzzles 0): relative count
    // equals the huge total → outruns every key → the old silence, no crash.
    expect(await resolveVictoryMicroBeat(203, 1, 0)).toBeNull();
  });

  test('resetMicroBeats clears the cycle-scoped seen set too', async () => {
    await checkCycleNarrativeMicroBeat(3, 1);
    expect(await checkCycleNarrativeMicroBeat(3, 1)).toBeNull();
    await resetMicroBeats();
    expect(await checkCycleNarrativeMicroBeat(3, 1)).not.toBeNull();
  });
});
