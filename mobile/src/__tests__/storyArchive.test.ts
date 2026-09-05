import { getStoryArchiveChapters, getStoryArchiveDialogues, getVisibleStoryMemoryLines } from '../services/storyArchive';
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
      const preserved = getStoryArchiveChapters(after).filter(chapter => chapter.animal === animal)
        .flatMap(chapter => getStoryArchiveDialogues(after, animal, chapter.phase));
      expect(preserved.map(line => line.id)).toEqual(getDialoguesForAnimal(animal, 4).map(line => line.id));
      expect(getStoryArchiveDialogues(after, animal, 5)).toEqual([]);
    }
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
