import { getStoryArchiveChapterLines, getStoryArchiveChapterSummary, getStoryArchiveChapters, getStoryArchiveDialogues, getVisibleStoryMemoryLines } from '../services/storyArchive';
import { getDialoguesForAnimal } from '../services/dialogue/animalDialogueBase';
import { StoryContext, StoryMemory } from '../services/storySpine';
import { AnimalType } from '../types/homeWorld';

const context: StoryContext = { phase: 3, puzzlesSolved: 85, cycleCount: 0, unlockedAnimals: ['fox', 'owl', 'sloth'] };
const all: AnimalType[] = ['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'];

describe('earlier conversation archive', () => {
  it('does not expose a vanguard future reveal or a lagging future block', () => {
    expect(getStoryArchiveDialogues(context, 'fox', 4)).toEqual([]);
    expect(getStoryArchiveDialogues(context, 'sloth', 3)).toEqual([]);
    expect(getStoryArchiveDialogues(context, 'fox', 3).length).toBeGreaterThan(0);
    expect(getStoryArchiveDialogues(context, 'sloth', 2).length).toBeGreaterThan(0);
  });
  it('does not expose locked speakers or forward references', () => {
    const early = { ...context, phase: 0 as const, unlockedAnimals: ['fox'] };
    expect(getStoryArchiveDialogues(early, 'owl', 0)).toEqual([]);
    expect(getStoryArchiveChapters(early).map(chapter => chapter.animal)).toEqual(['fox']);
    for (const line of getStoryArchiveDialogues(early, 'fox', 0)) {
      expect(line.text).not.toMatch(/Archimedes|Panko|Thyme|Vesper|Tock|Moss/);
      expect(line.requiresAnimals?.every(animal => animal === 'fox') ?? true).toBe(true);
    }
  });
  it('preserves every earlier regular line after arrival without reintroducing them as live dialogue', () => {
    const after = { ...context, phase: 5 as const, unlockedAnimals: all };
    for (const animal of all) {
      // One chapter per animal now, holding every earlier line in order: the
      // same preservation the per-stretch chapters used to prove.
      const chapters = getStoryArchiveChapters(after).filter(chapter => chapter.animal === animal);
      expect(chapters.length).toBe(1);
      const preserved = getStoryArchiveChapterLines(after, animal);
      expect(preserved.map(line => line.id)).toEqual(getDialoguesForAnimal(animal, 4).map(line => line.id));
      expect(chapters[0].count).toBe(preserved.length);
      expect(getStoryArchiveDialogues(after, animal, 5)).toEqual([]);
    }
  });
  it('titles a chapter by nothing but its speaker and the count it keeps', () => {
    // The archive used to carry one row per stretch of the story, each titled
    // with that stretch's mood ('By the warm hearth', 'While the shadows
    // gathered'), which is an era label by another name. A chapter identifies
    // an animal and nothing else, and its row body counts rather than describes.
    const chapters = getStoryArchiveChapters({ ...context, unlockedAnimals: all });
    expect(chapters.map(chapter => chapter.id)).toEqual(chapters.map(chapter => chapter.animal));
    expect(new Set(chapters.map(chapter => chapter.animal)).size).toBe(chapters.length);
    expect(Object.keys(chapters[0])).toEqual(['id', 'animal', 'count']);
    expect(getStoryArchiveChapterSummary(1)).toBe('One line kept');
    expect(getStoryArchiveChapterSummary(12)).toBe('12 lines kept');
    for (const era of ['By the warm hearth', 'When questions began', 'The changing house', 'While the shadows gathered', 'Before the arrival',
      'Bright Days', 'Curious Thoughts', 'Deeper Questions', 'Growing Shadows', 'The Horizon', 'Terrible Peace']) {
      expect(getStoryArchiveChapterSummary(3)).not.toContain(era);
    }
  });
  it('keeps a lagging animal behind and a vanguard animal ahead inside one chapter', () => {
    // Collapsing the rows must not widen what a chapter may show: the gate is
    // still per animal and per stretch, applied while the lines are gathered.
    const lines = getStoryArchiveChapterLines(context, 'sloth');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every(line => line.phase <= 2)).toBe(true);
    expect(getStoryArchiveChapterLines(context, 'fox').some(line => line.phase === 3)).toBe(true);
    expect(getStoryArchiveChapterLines(context, 'fox').every(line => line.phase <= 3)).toBe(true);
    expect(getStoryArchiveChapterLines(context, 'rabbit')).toEqual([]);
  });
  it('does not change the caller progress or choices while browsing', () => {
    const frozen = Object.freeze({ ...context, unlockedAnimals: Object.freeze([...context.unlockedAnimals]) });
    const before = JSON.stringify(frozen);
    getStoryArchiveChapters(frozen);
    getStoryArchiveDialogues(frozen, 'fox', 2);
    expect(JSON.stringify(frozen)).toBe(before);
  });
});

describe('saved scene transcript', () => {
  const memory: StoryMemory = {
    scene: { id: 'cup', title: 'The cup', memory: 'The answer mattered.', lines: [
      { speaker: 'fox', text: 'Which cup?' }, { speaker: 'narrator', text: 'One has a flower.' },
    ], options: [
      { id: 'flower', label: 'The flower.', response: [{ speaker: 'fox', text: 'This one is yours.' }] },
      { id: 'other', label: 'The other.', response: [{ speaker: 'fox', text: 'An answer you did not choose.' }] },
    ] }, page: 0, completed: false,
  };
  it('keeps unvisited pages and unchosen answers out of an unfinished memory', () => {
    expect(getVisibleStoryMemoryLines(memory, context).map(line => line.text)).toEqual(['Which cup?']);
    expect(getVisibleStoryMemoryLines({ ...memory, page: 2, choice: 'flower' }, context).map(line => line.text))
      .toEqual(['Which cup?', 'One has a flower.', 'This one is yours.']);
  });
  it('filters a restored transcript against the actual current roster', () => {
    expect(getVisibleStoryMemoryLines(memory, { ...context, unlockedAnimals: [] })).toEqual([]);
  });
});
