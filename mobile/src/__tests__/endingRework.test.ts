/**
 * The reworked ending (2026-09-24, owner: "the lead up to it and payoff feel
 * like a major let down"):
 *  - the vigil: each of the eight nights before the final board is voiced by
 *    one resident, never a resident who doesn't live here;
 *  - the eve: the home dock becomes the door to the last arrangement;
 *  - the final win's coda names the word the player chose;
 *  - the Morning After follows the Arrival directly (amberCurrency test);
 *  - a one-time closing card after the reply, with real numbers.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  getVigilLine, getPostCapVigilLine, getFinaleEvePlayLabel, getFinaleEveLine,
  getFinalWordCoda, getEpilogueCopy,
} from '../services/phaseNarrative';
import { isEpilogueOwed, StoryState, StoryContext } from '../services/storySpine';

const EVERYONE = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];
const CONTRACTED = /\b\w+'(?:t|m|s|re|ve|ll|d)\b/;
const STRANDED = /\b(?:I'm|you're|we're|they're|it's|that's|there's|he's|she's)[.!?]/;

describe('the vigil', () => {
  test('eight different residents speak the eight nights, Ember last', () => {
    const lines = [1, 2, 3, 4, 5, 6, 7, 8].map(n => getVigilLine(n, EVERYONE)!);
    expect(new Set(lines.map(line => line.animalType)).size).toBe(8);
    expect(lines[7].animalType).toBe('fox');
    for (const line of lines) {
      expect(line.text).toMatch(CONTRACTED);
      expect(line.text).not.toMatch(STRANDED);
      expect(line.text).not.toMatch(/[–—‘’“”]/);
    }
  });

  test('a resident who does not live here yet is never heard', () => {
    expect(getVigilLine(1, ['fox'])).toBeNull();
    expect(getVigilLine(8, ['fox'])?.animalName).toBe('Ember');
    expect(getPostCapVigilLine(3, [])).toBeNull();
    const heard = new Set([0, 1, 2, 3, 4].map(n => getPostCapVigilLine(n, EVERYONE)!.animalType));
    expect(heard.size).toBe(5);
    // none of the post-cap voices repeat a night's speaker
    const nights = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(n => getVigilLine(n, EVERYONE)!.animalType));
    for (const speaker of heard) expect(nights.has(speaker)).toBe(false);
  });
});

describe('the eve and the final word', () => {
  test('the dock names the last arrangement and the home line says where everyone is', () => {
    expect(getFinaleEvePlayLabel()).toBe('The last arrangement');
    expect(getFinaleEveLine(true)).toMatch(/long table/);
  });

  test('the final coda is the word the player chose', () => {
    expect(getFinalWordCoda('closed', true).title).toBe('CLOSED');
    expect(getFinalWordCoda('CLOSER', true).title).toBe('CLOSER');
    expect(getFinalWordCoda('CLOSED', true).text).toMatch(/room/);
    expect(getFinalWordCoda('CLOSER', true).text).toMatch(/road/);
    expect(getFinalWordCoda(undefined, false).text).toMatch(/unbuilt/);
  });

  test('App wires the vigil, the coda and the eve dock', () => {
    const app = fs.readFileSync(path.join(__dirname, '../../App.tsx'), 'utf8');
    expect(app).toContain('getVigilLine(');
    expect(app).toContain('getPostCapVigilLine(');
    expect(app).toContain('getFinalWordCoda(');
    const home = fs.readFileSync(path.join(__dirname, '../components/home/HomeScreen.tsx'), 'utf8');
    expect(home).toContain('getFinaleEvePlayLabel()');
    expect(home).toMatch(/finaleEve \? 'Begin the last arrangement' : 'Play puzzle'/);
  });
});

describe('the closing card', () => {
  const context = (over: Partial<StoryContext> = {}): StoryContext => ({
    phase: 5, puzzlesSolved: 130, cycleCount: 0, unlockedAnimals: EVERYONE, postRevelation: true, ...over,
  });
  const state = (over: Partial<StoryState> = {}): StoryState => ({
    version: 1, cycle: 0, memories: {}, boundary: 'remember', carriedBoundary: null,
    carriedRecord: false, arrivedBeforeRevision: false, ...over,
  });
  const replied = { reply: { scene: { id: 'reply' as const, title: 'x', lines: [{ speaker: 'fox' as const, text: 'x' }], memory: 'x' }, page: 0, completed: true } };

  test('is owed once, after the reply, only after the arrival', () => {
    expect(isEpilogueOwed(state(), context())).toBe(false);
    expect(isEpilogueOwed(state({ memories: replied }), context())).toBe(true);
    expect(isEpilogueOwed(state({ memories: replied, epilogueSeen: true }), context())).toBe(false);
    expect(isEpilogueOwed(state({ memories: replied }), context({ phase: 4, postRevelation: false }))).toBe(false);
  });

  test('names the last word and real numbers, and never an em dash', () => {
    const copy = getEpilogueCopy({ boundary: 'release', puzzlesSolved: 1204, daysSinceArrival: 41, residents: 13 });
    expect(copy.lines).toContain('Your last word: CLOSER');
    expect(copy.lines.join(' ')).toContain('1,204');
    expect(copy.lines.join(' ')).toContain('41 days');
    expect(copy.closing).toMatch(/still here/);
    expect(JSON.stringify(copy)).not.toMatch(/[–—]/);
    expect(getEpilogueCopy({ boundary: null, puzzlesSolved: 1, daysSinceArrival: 0, residents: 1 }).lines.join(' ')).toContain('one day');
  });
});
