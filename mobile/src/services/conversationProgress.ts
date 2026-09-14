import storage, { runStorageTransaction } from './persistenceStorage';
import { invalidateProgressCache, loadProgress } from './amberCurrency';
import { getDialoguesForAnimal, getTotalDialogueCount } from './dialogue/animalDialogueBase';
import { AnimalType, Dialogue, DialoguePhase, HomeWorldProgress, getAnimalPhase } from '../types/homeWorld';

const PROGRESS_KEY = 'wordshift_home_progress';

export interface AnimalConversationLine {
  dialogue: Dialogue;
  index: number;
}

export interface AnimalConversationCompletion {
  conversationReadIds: Record<string, string[]>;
  next: AnimalConversationLine | null;
  nextIndex: number;
  cycleCount: number;
  /** False for an idempotent retry of an already completed line. */
  completed: boolean;
}

function readIds(progress: HomeWorldProgress): Record<string, string[]> {
  const value = progress.conversationReadIds;
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      (progress.conversationReadVersion !== undefined && progress.conversationReadVersion !== 1) ||
      !Object.values(value).every(ids => Array.isArray(ids) &&
        ids.every(id => typeof id === 'string' && id.length > 0))) {
    throw new Error('Your conversation history could not be read. Please try again.');
  }
  return value;
}

const copyIds = (value: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(Object.entries(value).map(([animal, ids]) => [animal, [...ids]]));

/**
 * Select the oldest eligible line that has no completion receipt.
 * Legacy cursor positions include automatic jumps, so they cannot prove a line
 * was read. Such saves begin this ledger empty while retaining world progress,
 * completed introductions, story choices and the separate late-pool cursors.
 * A locked-resident reference is deferred, never consumed, and becomes eligible
 * when that resident joins. Arrival opens the remaining regular corpus first.
 */
export function getNextAnimalConversation(
  progress: HomeWorldProgress,
  animalType: AnimalType,
  phase: DialoguePhase = getAnimalPhase(progress.currentPhase, animalType),
  unlocked: Set<AnimalType> = new Set(progress.unlockedAnimals as AnimalType[]),
): AnimalConversationLine | null {
  const completed = new Set(readIds(progress)[animalType] ?? []);
  const maxPhase = Math.min(phase, 4) as DialoguePhase;
  const dialogues = getDialoguesForAnimal(animalType, maxPhase);
  for (let index = 0; index < dialogues.length; index++) {
    const dialogue = dialogues[index];
    if (completed.has(dialogue.id) || dialogue.requiresAnimals?.some(type => !unlocked.has(type))) continue;
    return { dialogue, index };
  }
  return null;
}

function completion(progress: HomeWorldProgress, animalType: AnimalType, completed: boolean): AnimalConversationCompletion {
  const next = getNextAnimalConversation(progress, animalType);
  const phase = getAnimalPhase(progress.currentPhase, animalType);
  const total = getTotalDialogueCount(animalType, Math.min(phase, 4) as DialoguePhase);
  return {
    conversationReadIds: copyIds(readIds(progress)),
    next,
    nextIndex: next?.index ?? (phase === 5 ? Math.max(total, progress.lastDialogueRead[animalType] ?? 0) : total),
    cycleCount: progress.cycleCount ?? 0,
    completed,
  };
}

/**
 * Save one fully read regular line with the owning home-progress record. The
 * cycle check protects a new descent from a callback belonging to an old visit;
 * a retry of the same receipt neither skips another line nor rewrites the pool
 * cursor. Pass the cycle captured when opening the conversation.
 */
export async function completeAnimalConversationLine(
  animalId: string,
  lineId: string,
  expectedCycle?: number,
): Promise<AnimalConversationCompletion> {
  try {
    return await runStorageTransaction('animal_conversation_read', async () => {
      invalidateProgressCache();
      // Read the owning record strictly: loadProgress's legacy recovery fallback
      // must not turn an unreadable save into a new, empty conversation ledger.
      const raw = await storage.getItem(PROGRESS_KEY);
      const progress: HomeWorldProgress = raw ? JSON.parse(raw) : await loadProgress();
      if (!progress || !Array.isArray(progress.unlockedAnimals) ||
          !progress.lastDialogueRead || typeof progress.lastDialogueRead !== 'object' ||
          ![0, 1, 2, 3, 4, 5].includes(progress.currentPhase)) {
        throw new Error('Your conversation history could not be read. Please try again.');
      }
      if (expectedCycle !== undefined && expectedCycle !== (progress.cycleCount ?? 0)) {
        throw new Error('This conversation belongs to an earlier visit. Please open it again.');
      }
      const type = animalId as AnimalType;
      if (!progress.unlockedAnimals.includes(animalId)) {
        throw new Error('Invite this resident before continuing their conversation.');
      }
      const ids = readIds(progress);
      const line = getDialoguesForAnimal(type, 4).find(dialogue => dialogue.id === lineId);
      if (!line) throw new Error('This conversation line is no longer available.');
      if (ids[animalId]?.includes(lineId)) return completion(progress, type, false);
      const next = getNextAnimalConversation(progress, type);
      if (next?.dialogue.id !== lineId) {
        throw new Error('Your conversation has moved on. Please open it again.');
      }
      const updated: HomeWorldProgress = {
        ...progress,
        conversationReadVersion: 1,
        conversationReadIds: { ...copyIds(ids), [animalId]: [...(ids[animalId] ?? []), lineId] },
      };
      await storage.setItem(PROGRESS_KEY, JSON.stringify(updated));
      return completion(updated, type, true);
    });
  } finally {
    invalidateProgressCache();
  }
}
