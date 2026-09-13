import storage from './persistenceStorage';
import { AnimalType, DialoguePhase } from '../types/homeWorld';
import { ACQUAINTANCE_ANIMALS, getAnimalAcquaintanceVisit } from './dialogue/animalAcquaintanceContent';

export const ACQUAINTANCE_STORAGE_KEY = 'wordshift_animal_acquaintance';
const VISIT_COUNT = 3;

/** The actual words and reading position are kept once a visit begins. */
export interface AnimalAcquaintanceMemory {
  animalType: AnimalType;
  visit: number;
  page: number;
  phase: DialoguePhase;
  title: string;
  lines: string[];
}

export interface AnimalAcquaintanceState {
  version: 1;
  animals: Partial<Record<AnimalType, {
    /** Three means finished; optional visits with an old friend start at one. */
    nextVisit: number;
    active?: AnimalAcquaintanceMemory;
  }>>;
}

let cache: AnimalAcquaintanceState | null = null;
let writes: Promise<unknown> = Promise.resolve();
let generation = 0;

export function invalidateAnimalAcquaintanceCache(): void {
  cache = null;
  generation += 1;
}

const fresh = (): AnimalAcquaintanceState => ({ version: 1, animals: {} });
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function validState(value: unknown): value is AnimalAcquaintanceState {
  if (!value || typeof value !== 'object') return false;
  const state = value as AnimalAcquaintanceState;
  return state.version === 1 && !!state.animals && typeof state.animals === 'object' &&
    !Array.isArray(state.animals) && Object.entries(state.animals).every(([type, record]) => {
      if (!ACQUAINTANCE_ANIMALS.has(type as AnimalType) || !record ||
          !Number.isInteger(record.nextVisit) || record.nextVisit < 0 || record.nextVisit > VISIT_COUNT) return false;
      const memory = record.active;
      if (memory === undefined) return true;
      return record.nextVisit < VISIT_COUNT && !!memory && memory.animalType === type &&
        memory.visit === record.nextVisit && [0, 1, 2, 3, 4, 5].includes(memory.phase) &&
        typeof memory.title === 'string' && memory.title.trim().length > 0 &&
        Array.isArray(memory.lines) && memory.lines.length > 0 &&
        memory.lines.every(line => typeof line === 'string' && line.trim().length > 0) &&
        Number.isInteger(memory.page) && memory.page >= 0 && memory.page < memory.lines.length;
    });
}

async function readState(): Promise<AnimalAcquaintanceState> {
  const raw = await storage.getItem(ACQUAINTANCE_STORAGE_KEY);
  let value: unknown;
  try { value = raw ? JSON.parse(raw) : null; } catch { value = null; }
  return validState(value) ? value : fresh();
}

export async function loadAnimalAcquaintanceState(): Promise<AnimalAcquaintanceState> {
  await writes.catch(() => {});
  if (!cache) {
    const readGeneration = generation;
    const readWrites = writes;
    const state = await readState();
    if (generation !== readGeneration || writes !== readWrites) return loadAnimalAcquaintanceState();
    cache = state;
  }
  return copy(cache);
}

/** Reads and writes share one queue so rapid taps cannot skip a page or a visit. */
function mutate<T>(change: (state: AnimalAcquaintanceState) => T): Promise<T> {
  const writeGeneration = generation;
  const run = writes.catch(() => {}).then(async () => {
    const state = cache ?? await readState();
    const next = copy(state);
    const result = change(next);
    if (generation !== writeGeneration) throw new Error('The saved conversation changed. Please open it again.');
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      await storage.setItem(ACQUAINTANCE_STORAGE_KEY, JSON.stringify(next));
      if (generation !== writeGeneration) throw new Error('The saved conversation changed. Please open it again.');
    }
    cache = next;
    return copy(result);
  });
  writes = run;
  return run;
}

/** New arrivals get the arc automatically; established friends opt in themselves. */
export function hasPendingAnimalAcquaintance(
  state: AnimalAcquaintanceState,
  animalType: AnimalType,
  phase: DialoguePhase,
  introSeen: boolean,
): boolean {
  if (!ACQUAINTANCE_ANIMALS.has(animalType)) return false;
  const record = state.animals[animalType];
  return record ? record.nextVisit < VISIT_COUNT : phase >= 2 && !introSeen;
}

export function canOfferAnimalAcquaintance(state: AnimalAcquaintanceState, animalType: AnimalType): boolean {
  return ACQUAINTANCE_ANIMALS.has(animalType) && !state.animals[animalType];
}

export function openAnimalAcquaintance(
  animalType: AnimalType,
  phase: DialoguePhase,
  mode: 'introduction' | 'continue' | 'optional',
): Promise<AnimalAcquaintanceMemory | null> {
  return mutate(state => {
    if (!ACQUAINTANCE_ANIMALS.has(animalType)) return null;
    let record = state.animals[animalType];
    if (!record) {
      if (mode === 'continue' || (mode === 'introduction' && phase < 2)) return null;
      record = { nextVisit: mode === 'optional' ? 1 : 0 };
    }
    if (record.nextVisit >= VISIT_COUNT) return null;
    // Arrival retires prospective mystery claims, including an interrupted
    // visit. Keep the same personal moment using its authored morning setting.
    if (!record.active || (phase === 5 && record.active.phase < 5)) {
      const visit = getAnimalAcquaintanceVisit(animalType, record.nextVisit, phase);
      if (!visit) return null;
      record.active = {
        animalType, visit: record.nextVisit, page: 0, phase,
        title: visit.title, lines: [...visit.lines],
      };
    }
    state.animals[animalType] = record;
    return record.active;
  });
}

export function advanceAnimalAcquaintance(
  animalType: AnimalType,
  expectedVisit: number,
  expectedPage: number,
): Promise<AnimalAcquaintanceMemory | null> {
  return mutate(state => {
    const record = state.animals[animalType];
    const memory = record?.active;
    if (!record || !memory) return null;
    if (memory.visit !== expectedVisit || memory.page !== expectedPage) return memory;
    if (memory.page + 1 < memory.lines.length) {
      memory.page += 1;
      return memory;
    }
    record.nextVisit += 1;
    delete record.active;
    return null;
  });
}
