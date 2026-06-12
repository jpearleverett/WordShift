import {
  getVictoryTitle,
  getVictoryFeedback,
  getMoveMessage,
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
  getNotificationPromptText,
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
} from '../services/phaseNarrative';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DialoguePhase } from '../types/homeWorld';

const ALL_PHASES: DialoguePhase[] = [0, 1, 2, 3, 4];
const STAR_LEVELS = [1, 2, 3];

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
  test.each(
    ALL_PHASES.flatMap(phase =>
      STAR_LEVELS.map(stars => ({ phase, stars }))
    )
  )('returns a non-empty string for phase $phase, $stars stars', ({ phase, stars }) => {
    const feedback = getVictoryFeedback(stars, phase);
    expect(typeof feedback).toBe('string');
    expect(feedback.length).toBeGreaterThan(0);
  });

  test('phase 0 feedback is encouraging', () => {
    expect(getVictoryFeedback(3, 0)).toContain('Flawless');
  });

  test('phase 4 feedback is dark', () => {
    expect(getVictoryFeedback(3, 4)).toContain('void');
  });

  test('different star levels produce different feedback within same phase', () => {
    const fb3 = getVictoryFeedback(3, 2);
    const fb2 = getVictoryFeedback(2, 2);
    const fb1 = getVictoryFeedback(1, 2);
    expect(fb3).not.toBe(fb2);
    expect(fb2).not.toBe(fb1);
    expect(fb3).not.toBe(fb1);
  });
});

describe('getMoveMessage', () => {
  test.each(ALL_PHASES)('returns a non-empty string for phase %i', (phase) => {
    const msg = getMoveMessage(phase);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  test('phase 0 messages are upbeat (with rare darkness seeds)', () => {
    // getMoveMessage uses Math.random; Phase 0 now includes ~5% rare "seed" messages
    // that hint at darkness. Both normal upbeat and rare seed messages are valid.
    const phase0Words = ['Delicious', 'Tasty', 'Sweet', 'Yummy', 'Perfect', 'Brilliant', 'Nice', 'Sparkling', 'Juicy', 'Wonderful'];
    const seedWords = ['remember', 'shifted', 'feel', 'wanted'];
    for (let i = 0; i < 50; i++) {
      const msg = getMoveMessage(0);
      const isUpbeat = phase0Words.some(w => msg.includes(w));
      const isSeed = seedWords.some(w => msg.toLowerCase().includes(w));
      expect(isUpbeat || isSeed).toBe(true);
    }
  });

  test('phase 4 messages are dark', () => {
    const phase4Words = ['void', 'dissolve', 'Nothing', 'matter', 'shift', '...', 'silence', 'arrangement', 'verse', 'deeper', 'going', 'listening'];
    for (let i = 0; i < 50; i++) {
      const msg = getMoveMessage(4);
      expect(phase4Words.some(w => msg.includes(w))).toBe(true);
    }
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
    expect(beat5!.text).toContain('Fox');

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

  test('returns a beat at puzzle 50', async () => {
    const beat = await checkNarrativeMicroBeat(50);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a beat at puzzle 65', async () => {
    const beat = await checkNarrativeMicroBeat(65);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
  });

  test('returns a beat at puzzle 100', async () => {
    const beat = await checkNarrativeMicroBeat(100);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
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

    const beat50 = await checkNarrativeMicroBeat(50);
    expect(beat50).not.toBeNull();

    // 35 already consumed, 50 already consumed
    expect(await checkNarrativeMicroBeat(35)).toBeNull();
    expect(await checkNarrativeMicroBeat(50)).toBeNull();

    // 65 and 100 still available
    expect(await checkNarrativeMicroBeat(65)).not.toBeNull();
    expect(await checkNarrativeMicroBeat(100)).not.toBeNull();
  });

  test('resetMicroBeats clears consumed state', async () => {
    await checkNarrativeMicroBeat(35);
    expect(await checkNarrativeMicroBeat(35)).toBeNull();

    await resetMicroBeats();

    const beat = await checkNarrativeMicroBeat(35);
    expect(beat).not.toBeNull();
  });

  // New micro-beat thresholds (assessment-driven expansion)
  test('returns a beat at puzzle 40', async () => {
    const beat = await checkNarrativeMicroBeat(40);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
    expect(beat!.durationMs).toBeGreaterThan(0);
  });

  test('returns a beat at puzzle 55', async () => {
    const beat = await checkNarrativeMicroBeat(55);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a glitch_title beat at puzzle 80', async () => {
    const beat = await checkNarrativeMicroBeat(80);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('glitch_title');
    expect(beat!.glitchTitle).toBeDefined();
    expect(beat!.durationMs).toBeGreaterThan(0);
  });

  test('returns a beat at puzzle 90', async () => {
    const beat = await checkNarrativeMicroBeat(90);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a beat at puzzle 110', async () => {
    const beat = await checkNarrativeMicroBeat(110);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('returns a beat at puzzle 130', async () => {
    const beat = await checkNarrativeMicroBeat(130);
    expect(beat).not.toBeNull();
    expect(beat!.type).toBe('ambient_whisper');
    expect(beat!.text).toBeDefined();
  });

  test('all 19 micro-beat thresholds fire independently', async () => {
    const thresholds = [5, 8, 12, 16, 20, 25, 30, 35, 40, 50, 55, 65, 70, 74, 80, 90, 100, 110, 130];
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
