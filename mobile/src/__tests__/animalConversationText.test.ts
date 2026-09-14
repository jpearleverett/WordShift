import { AnimalType, Dialogue, DialoguePhase } from '../types/homeWorld';
import { ANIMAL_INFO, getDialoguesForAnimal } from '../services/dialogue/animalDialogueBase';
import { INTRO_DIALOGUES } from '../services/dialogue/animalDialogueIntro';
import {
  ANIMAL_CONVERSATION_ADAPTATIONS,
  adaptAnimalConversationText,
  adaptAnimalIntroductionLines,
  hasAnimalConversationArrivalOccurred,
} from '../services/dialogue/animalConversationText';

const animals = Object.keys(ANIMAL_INFO) as AnimalType[];
const manuscript = animals.flatMap(animal => getDialoguesForAnimal(animal, 4));
const byId = new Map(manuscript.map(line => [line.id, line]));
const say = (id: string, worldPhase: DialoguePhase, arrivalOccurred = false): string => {
  const line = byId.get(id)!;
  return adaptAnimalConversationText({
    animalType: line.animalType,
    id: line.id,
    text: line.text,
    authoredPhase: line.phase,
    worldPhase,
    arrivalOccurred,
  });
};

describe('full animal conversations in a later house', () => {
  test.each(animals)('%s keeps every utterance and the original order in every house phase', animal => {
    const lines = getDialoguesForAnimal(animal, 4);
    const original = lines.map(line => ({ ...line }));
    expect(lines).toHaveLength(134);
    for (const worldPhase of [0, 1, 2, 3, 4, 5] as DialoguePhase[]) {
      const delivered = lines.map(line => ({ id: line.id, text: say(line.id, worldPhase) }));
      expect(delivered.map(line => line.id)).toEqual(original.map(line => line.id));
      expect(delivered.every(line => line.text.trim().length > 0)).toBe(true);
      // The resolver is presentation only: its original script and saved-ID
      // source cannot become a shortened chapter or change after a visit.
      expect(lines).toEqual(original);
    }
  });

  test('all hand-authored variants point to actual stable manuscript or intro IDs', () => {
    for (const [id, variants] of Object.entries(ANIMAL_CONVERSATION_ADAPTATIONS)) {
      const intro = id.match(/^(.+):intro:(\d+)$/);
      const line = byId.get(id);
      const original = intro
        ? INTRO_DIALOGUES[intro[1] as AnimalType]?.[Number(intro[2])]
        : line?.text;
      expect(original).toBeDefined();
      expect(Object.values(variants).length).toBeGreaterThan(0);
      for (const [era, text] of Object.entries(variants)) {
        expect(text.trim().length).toBeGreaterThan(20);
        expect(text).not.toBe(original);
        expect(text).not.toMatch(/TODO|undefined|\{(?:name|animal|room|phase)\}/);
        if (line) {
          const threshold = era === 'shadows' ? 3 : era === 'revealed' ? 4 : 5;
          expect(threshold).toBeGreaterThanOrEqual(line.phase);
        }
      }
    }
  });

  test('temporal variants retain the original resident-reference gates', () => {
    for (const [id, variants] of Object.entries(ANIMAL_CONVERSATION_ADAPTATIONS)) {
      const intro = id.match(/^(.+):intro:(\d+)$/);
      const line = byId.get(id);
      const speaker = intro ? intro[1] : line?.animalType;
      const original = intro
        ? INTRO_DIALOGUES[intro[1] as AnimalType]?.[Number(intro[2])]
        : line?.text;
      if (!original) continue;
      for (const animal of animals) {
        // Ember is the first required meeting before any other resident.
        if (animal === 'fox' || animal === speaker || line?.requiresAnimals?.includes(animal)) continue;
        const name = ANIMAL_INFO[animal].name;
        const namedResident = new RegExp(`\\b${name}\\b`);
        if (namedResident.test(original)) continue;
        for (const text of Object.values(variants)) {
          expect({ id, newResident: namedResident.test(text) ? name : null }).toEqual({ id, newResident: null });
        }
      }
    }
  });

  test.each(animals)('%s can still make its ordinary early jokes after the arrival', animal => {
    const firstLines = getDialoguesForAnimal(animal, 0).slice(0, 6);
    for (const line of firstLines) {
      if (!ANIMAL_CONVERSATION_ADAPTATIONS[line.id]) expect(say(line.id, 5)).toBe(line.text);
    }
    // All early phases keep the actual manuscript before any temporal
    // threshold applies; a hobby is never replaced by a world recap.
    for (const line of getDialoguesForAnimal(animal, 4)) {
      if (line.phase <= 2 || !ANIMAL_CONVERSATION_ADAPTATIONS[line.id]) {
        expect(say(line.id, line.phase)).toBe(line.text);
      }
    }
  });

  test('an impending arrival becomes a present fact without discarding the sentinel report', () => {
    expect(say('ff_3_28', 3)).toBe('Three words, as plainly as I can give the report: It is coming.');
    expect(say('ff_3_28', 4)).toBe(say('ff_3_28', 3));
    expect(say('ff_3_28', 5)).toBe('Three words, as plainly as I can give the report: It is here.');
  });

  test('arrival completion, not the later Phase-5 gate, retires approach predictions', () => {
    expect(say('ff_3_28', 4, true)).toBe(say('ff_3_28', 5));
    expect(say('ax_3_7', 4, true)).toContain('seam is closed');
    expect(say('cp_4_5', 4, true)).toContain('old calendar stopped at the arrival');
    expect(say('cp_4_5', 4)).toBe(byId.get('cp_4_5')!.text);
  });

  test('a final board with an owed Arrival ceremony has not delivered the arrival yet', () => {
    const arrival = { id: 'arrival:0', kind: 'arrival' as const, phase: 4 as const, cycle: 0 };
    expect(hasAnimalConversationArrivalOccurred({ currentPhase: 4, finalPuzzleCompleted: false })).toBe(false);
    expect(hasAnimalConversationArrivalOccurred({
      currentPhase: 4, finalPuzzleCompleted: true, pendingCeremonies: [arrival],
    })).toBe(false);
    expect(hasAnimalConversationArrivalOccurred({
      currentPhase: 4, finalPuzzleCompleted: true, pendingCeremonies: [],
    })).toBe(true);
    expect(hasAnimalConversationArrivalOccurred({
      currentPhase: 4, finalPuzzleCompleted: true,
      pendingCeremonies: [{ ...arrival, id: 'after:0', kind: 'post_arrival' }],
    })).toBe(true);
  });

  test('legacy and post-arrival progress retain their completed event without a queued record', () => {
    expect(hasAnimalConversationArrivalOccurred({ currentPhase: 4, finalPuzzleCompleted: true })).toBe(true);
    expect(hasAnimalConversationArrivalOccurred({ currentPhase: 4, postRevelation: true })).toBe(true);
    expect(hasAnimalConversationArrivalOccurred({ currentPhase: 5 })).toBe(true);
  });

  test('a first meeting after Arrival does not invent the keeper being present for it', () => {
    const after = adaptAnimalIntroductionLines('aye_aye', INTRO_DIALOGUES.aye_aye, 5);
    expect(after[2]).toContain('That midnight has already come and gone');
    expect(after[2]).not.toMatch(/never rung|became her keeper before|being here for the first/i);
    expect(adaptAnimalIntroductionLines('aye_aye', INTRO_DIALOGUES.aye_aye, 4, true)).toEqual(after);
    expect(adaptAnimalIntroductionLines('aye_aye', INTRO_DIALOGUES.aye_aye, 4)[2]).toContain('never rung');
  });

  test('later knowledge changes a mistaken explanation without deleting its personal discovery', () => {
    expect(say('cp_1_7', 1)).toContain("I'm sure is only the heating ducts");
    expect(say('cp_1_7', 3)).toContain('called it the heating ducts at first');
    expect(say('cp_1_7', 5)).toBe(say('cp_1_7', 3));
    expect(say('ax_0_18', 3)).toContain('PLUM used to spend his days');
    expect(say('ax_0_18', 3)).toContain('submit a report');
  });

  test('each original introduction remains complete and ordered through late recruitment', () => {
    for (const animal of animals) {
      const original = [...INTRO_DIALOGUES[animal]];
      for (const phase of [0, 1, 2, 3, 4, 5] as DialoguePhase[]) {
        const intro = adaptAnimalIntroductionLines(animal, original, phase);
        expect(intro).toHaveLength(original.length);
        original.forEach((line, index) => {
          if (!ANIMAL_CONVERSATION_ADAPTATIONS[`${animal}:intro:${index}`]) expect(intro[index]).toBe(line);
        });
        expect(original).toEqual(INTRO_DIALOGUES[animal]);
        expect(intro).not.toBe(original);
      }
      expect(adaptAnimalIntroductionLines(animal, original, 0)).toEqual(original);
    }
  });

  test('custom unindexed dialogue and another resident\'s ID never borrow an adaptation', () => {
    const report = byId.get('ff_3_28') as Dialogue;
    expect(adaptAnimalConversationText({
      animalType: 'fennec_fox', text: 'A fresh thought about the gecko.', authoredPhase: 3, worldPhase: 5,
    })).toBe('A fresh thought about the gecko.');
    expect(adaptAnimalConversationText({
      animalType: 'fox', id: report.id, text: report.text, authoredPhase: 3, worldPhase: 5,
    })).toBe(report.text);
  });
});
