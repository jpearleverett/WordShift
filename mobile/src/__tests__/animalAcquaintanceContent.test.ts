import { AnimalType, DialoguePhase } from '../types/homeWorld';
import {
  ACQUAINTANCE_ANIMALS,
  getAnimalAcquaintanceVisit,
} from '../services/dialogue/animalAcquaintanceContent';
import { ANIMAL_INFO, getDialoguesForAnimal } from '../services/dialogue/animalDialogueBase';
import {
  CATCHUP_INTRO_DIALOGUES,
  INTRO_DIALOGUES,
  POST_REVELATION_DIALOGUES,
} from '../services/dialogue/animalDialogueIntro';

const animals = [...ACQUAINTANCE_ANIMALS];
const phases: DialoguePhase[] = [0, 1, 2, 3, 4, 5];
const textOf = (animal: AnimalType, visit: number, phase: DialoguePhase) =>
  getAnimalAcquaintanceVisit(animal, visit, phase)!.lines.join(' ');

test.each(animals)('%s uses only its existing authored manuscript, with no missing references', animal => {
  const existing = new Set([
    ...INTRO_DIALOGUES[animal],
    ...getDialoguesForAnimal(animal, 4).map(dialogue => dialogue.text),
    ...Object.values(CATCHUP_INTRO_DIALOGUES[animal]).flat(),
    ...POST_REVELATION_DIALOGUES[animal],
  ]);
  for (const phase of phases) {
    for (let visit = 0; visit < 3; visit += 1) {
      const content = getAnimalAcquaintanceVisit(animal, visit, phase)!;
      expect(content.title.trim()).not.toHaveLength(0);
      expect(content.lines.length).toBeGreaterThanOrEqual(3);
      expect(content.lines.length).toBeLessThanOrEqual(5);
      expect(new Set(content.lines).size).toBe(content.lines.length);
      for (const line of content.lines) expect(existing.has(line)).toBe(true);
    }
  }
});

test.each(animals)('%s is a person before a duty, without requiring any other resident', animal => {
  expect(textOf(animal, 0, 3)).toContain(ANIMAL_INFO[animal].name);
  const otherNames = Object.entries(ANIMAL_INFO)
    .filter(([type]) => type !== animal)
    .map(([, info]) => info.name);
  const otherResident = new RegExp(`\\b(${otherNames.join('|')})\\b`);
  for (const phase of phases) {
    for (let visit = 0; visit < 3; visit += 1) {
      expect(textOf(animal, visit, phase)).not.toMatch(otherResident);
    }
  }
});

test.each(animals)('%s returns to ordinary company before the current concern', animal => {
  const welcome = getAnimalAcquaintanceVisit(animal, 0, 3)!.lines;
  const company = getAnimalAcquaintanceVisit(animal, 1, 3)!.lines;
  expect(company.every(line => !welcome.includes(line))).toBe(true);
  // An old-save opt-in starts at this visit, without pretending to move in again.
  expect(company.join(' ')).not.toMatch(/only just (?:met|arrived)|I'm your new|I've only just become/);
  expect(getAnimalAcquaintanceVisit(animal, 1, 5)!.lines).toEqual(company);
  expect(getAnimalAcquaintanceVisit(animal, 2, 3)!.lines).not.toEqual(company);
});

test.each(animals)('%s respects the arrival even when its personal visits happen late', animal => {
  const post = new Set(POST_REVELATION_DIALOGUES[animal]);
  const before = getAnimalAcquaintanceVisit(animal, 2, 4)!.lines;
  const after = getAnimalAcquaintanceVisit(animal, 2, 5)!.lines;
  expect(after).not.toEqual(before);
  expect(after.every(line => post.has(line))).toBe(true);
  for (let visit = 0; visit < 3; visit += 1) {
    expect(textOf(animal, visit, 5)).not.toMatch(/never rung|hasn't rung|something is coming|sky is nearly open/i);
  }
});

test('the third visit connects each ordinary detail to its current concern', () => {
  expect(textOf('wombat', 1, 3)).toContain('hold the lamp');
  expect(textOf('wombat', 2, 3)).toContain("numbers don't stay the same");
  expect(textOf('rabbit', 1, 3)).toContain('measure the water');
  expect(textOf('rabbit', 2, 3)).toContain('checking my notes');
  expect(textOf('red_panda', 1, 3)).toContain('page of teachings');
  expect(textOf('red_panda', 2, 5)).toContain('my own words back');
  expect(textOf('tarsier', 1, 3)).toContain('chalk');
  expect(textOf('tarsier', 2, 3)).toContain('counting how often I look away');
  expect(textOf('aye_aye', 1, 3)).toContain('loose peg');
  expect(textOf('aye_aye', 2, 5)).toContain('one loose peg');
  expect(textOf('kakapo', 0, 4)).toContain('needs years');
  expect(textOf('kakapo', 2, 4)).toContain('kept as seedlings forever');
});

test('unsupported animals and invalid visit indices do not create an arc', () => {
  expect(getAnimalAcquaintanceVisit('fox', 0, 3)).toBeNull();
  expect(getAnimalAcquaintanceVisit('axolotl', 0, 3)).toBeNull();
  for (const index of [-1, 3, 0.5, NaN]) {
    expect(getAnimalAcquaintanceVisit('wombat', index, 3)).toBeNull();
  }
});
