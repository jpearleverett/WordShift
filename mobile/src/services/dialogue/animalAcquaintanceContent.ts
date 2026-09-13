import { AnimalType, DialoguePhase } from '../../types/homeWorld';
import { getDialoguesForAnimal } from './animalDialogueBase';
import {
  CATCHUP_INTRO_DIALOGUES,
  INTRO_DIALOGUES,
  POST_REVELATION_DIALOGUES,
} from './animalDialogueIntro';

const ANIMALS = ['wombat', 'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo'] as const;
type AcquaintanceAnimal = typeof ANIMALS[number];

export const ACQUAINTANCE_ANIMALS: ReadonlySet<AnimalType> = new Set(ANIMALS);

export interface AnimalAcquaintanceVisit {
  title: string;
  lines: string[];
}

// These are selections from the existing manuscript, not a second dialogue
// corpus. Stable dialogue IDs and explicit intro indices keep every page's
// provenance visible and leave all existing reading cursors unchanged.
type Source =
  | { kind: 'intro'; index: number }
  | { kind: 'dialogue'; id: string }
  | { kind: 'catchup'; phase: number; index: number }
  | { kind: 'after'; index: number };
const intro = (index: number): Source => ({ kind: 'intro', index });
const line = (id: string): Source => ({ kind: 'dialogue', id });
const catchup = (phase: number, index: number): Source => ({ kind: 'catchup', phase, index });
const after = (index: number): Source => ({ kind: 'after', index });

interface AcquaintanceSelection {
  titles: readonly [string, string, string];
  welcome: Source[];
  company: Source[];
  ordinaryConcern: Source[];
  changingConcern: Source[];
  nearArrivalConcern: Source[];
  afterArrivalConcern: Source[];
}

// First visits introduce a person before their role in the mystery. The second
// visit is an ordinary invitation which also works for existing acquaintances.
// Only the third visit moves into the current house's circumstances. All
// selections stand on their own without requiring another resident or assuming
// the player witnessed an earlier scene. Even the welcome is arrival-safe:
// Tock never says his bell has not rung, and Vesper does not await an opening.
const SELECTIONS: Record<AcquaintanceAnimal, AcquaintanceSelection> = {
  wombat: {
    titles: ['Mind the lintel', 'Useful things', 'Checking the work'],
    welcome: [intro(0), intro(1), intro(3), intro(4), intro(5)],
    company: [line('wb_0_2'), line('wb_0_6'), line('wb_0_13'), line('wb_0_16')],
    ordinaryConcern: [line('wb_0_4'), line('wb_0_18'), line('wb_0_20')],
    changingConcern: [line('wb_0_17'), line('wb_1_13'), line('wb_1_28')],
    nearArrivalConcern: [line('wb_0_17'), catchup(4, 2), catchup(4, 4)],
    afterArrivalConcern: [after(1), after(5), after(9), after(18)],
  },
  rabbit: {
    titles: ['Catch the gate', 'A little help', 'Things worth keeping'],
    welcome: [intro(0), intro(1), intro(2), intro(4), intro(5)],
    company: [line('rb_0_7'), line('rb_0_13'), line('rb_0_14'), line('rb_0_16')],
    ordinaryConcern: [line('rb_0_10'), line('rb_0_17'), line('rb_0_22')],
    changingConcern: [line('rb_1_2'), line('rb_1_18'), catchup(2, 4)],
    nearArrivalConcern: [line('rb_0_10'), catchup(4, 2), catchup(4, 3), catchup(4, 4)],
    afterArrivalConcern: [after(13), after(9), after(12), after(19)],
  },
  red_panda: {
    titles: ['Room on the mat', 'Tea first', 'Leaving room'],
    welcome: [intro(0), intro(1), intro(2), intro(4), intro(5)],
    company: [line('rp_0_3'), line('rp_0_8'), line('rp_0_18'), line('rp_0_19')],
    ordinaryConcern: [line('rp_0_15'), line('rp_0_22'), line('rp_0_23')],
    changingConcern: [line('rp_0_20'), line('rp_1_18'), line('rp_1_28')],
    nearArrivalConcern: [catchup(4, 1), catchup(4, 3), catchup(4, 4)],
    afterArrivalConcern: [after(2), after(16), after(14)],
  },
  tarsier: {
    titles: ['Up on the rail', 'Small true things', 'Where to look'],
    welcome: [intro(0), intro(1), intro(3), intro(5)],
    company: [line('tr_0_16'), line('tr_0_6'), line('tr_0_5'), line('tr_0_22')],
    ordinaryConcern: [line('tr_0_12'), line('tr_0_20'), line('tr_0_21')],
    changingConcern: [line('tr_0_12'), line('tr_0_18'), line('tr_1_15'), catchup(3, 4)],
    nearArrivalConcern: [intro(2), catchup(4, 2), catchup(4, 3), catchup(4, 4)],
    afterArrivalConcern: [after(0), after(1), after(9), after(19)],
  },
  aye_aye: {
    titles: ['Tok, tok', 'The ordinary wood', 'A turn to answer'],
    welcome: [intro(0), intro(1), intro(3), intro(4), intro(5)],
    company: [line('ay_0_20'), line('ay_0_4'), line('ay_0_5'), line('ay_0_16')],
    ordinaryConcern: [line('ay_0_11'), line('ay_0_12'), line('ay_0_15')],
    changingConcern: [line('ay_0_18'), line('ay_1_1'), line('ay_1_6')],
    nearArrivalConcern: [line('ay_0_17'), catchup(4, 2), catchup(4, 3)],
    afterArrivalConcern: [after(16), after(10), after(5), after(18)],
  },
  kakapo: {
    titles: ['Mind the seedlings', "Today's watering", 'Room to grow'],
    welcome: [intro(0), intro(1), intro(2), intro(3), intro(5)],
    company: [line('kk_0_10'), line('kk_0_15'), line('kk_0_18'), line('kk_0_24')],
    ordinaryConcern: [line('kk_0_12'), line('kk_0_14'), line('kk_0_21')],
    changingConcern: [line('kk_1_4'), line('kk_1_5'), catchup(3, 2)],
    nearArrivalConcern: [catchup(4, 1), catchup(4, 2), catchup(4, 3)],
    afterArrivalConcern: [after(5), after(13), after(7), after(19)],
  },
};

function resolveSource(animalType: AnimalType, source: Source): string {
  let text: string | undefined;
  switch (source.kind) {
    case 'intro':
      text = INTRO_DIALOGUES[animalType][source.index];
      break;
    case 'dialogue':
      text = getDialoguesForAnimal(animalType, 4).find(dialogue => dialogue.id === source.id)?.text;
      break;
    case 'catchup':
      text = CATCHUP_INTRO_DIALOGUES[animalType][source.phase]?.[source.index];
      break;
    case 'after':
      text = POST_REVELATION_DIALOGUES[animalType][source.index];
      break;
  }
  if (!text) {
    throw new Error(`Missing acquaintance dialogue source for ${animalType}: ${JSON.stringify(source)}`);
  }
  return text;
}

/**
 * Three short visits, independent of the main dialogue's phase/cursor. Existing
 * residents can begin at visit 1: it assumes neither a fresh move nor a replayed
 * introduction. The caller persists the selected pages and their reading cursor.
 */
export function getAnimalAcquaintanceVisit(
  animalType: AnimalType,
  visitIndex: number,
  worldPhase: DialoguePhase,
): AnimalAcquaintanceVisit | null {
  if (!ACQUAINTANCE_ANIMALS.has(animalType) || !Number.isInteger(visitIndex) || visitIndex < 0 || visitIndex > 2) {
    return null;
  }
  const selection = SELECTIONS[animalType as AcquaintanceAnimal];
  let sources: Source[];
  if (visitIndex === 0) sources = selection.welcome;
  else if (visitIndex === 1) sources = selection.company;
  else if (worldPhase >= 5) sources = selection.afterArrivalConcern;
  else if (worldPhase >= 4) sources = selection.nearArrivalConcern;
  else if (worldPhase >= 2) sources = selection.changingConcern;
  else sources = selection.ordinaryConcern;
  return {
    title: selection.titles[visitIndex],
    lines: sources.map(source => resolveSource(animalType, source)),
  };
}
