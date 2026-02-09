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
} from '../services/phaseNarrative';
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

  test('phase 0 messages are upbeat', () => {
    // getMoveMessage uses Math.random, so seed-check that all possible results are upbeat
    // We'll call it many times and check every result is from the expected set
    const phase0Words = ['Delicious', 'Tasty', 'Sweet', 'Yummy', 'Perfect', 'Brilliant', 'Nice', 'Sparkling', 'Juicy', 'Wonderful'];
    for (let i = 0; i < 50; i++) {
      const msg = getMoveMessage(0);
      expect(phase0Words.some(w => msg.includes(w))).toBe(true);
    }
  });

  test('phase 4 messages are dark', () => {
    const phase4Words = ['void', 'dissolve', 'Nothing', 'matter', 'shift', '...', 'silence'];
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
