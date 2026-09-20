import { AnimalType, DialoguePhase, getAnimalPhase } from '../types/homeWorld';
import { getFullProgress, invalidateProgressCache } from './amberCurrency';
import { getConversationReadIds } from './conversationProgress';
import { runTransientStorageOperation } from './persistenceStorage';
import { ANIMAL_INFO, getDialoguesForAnimal } from './dialogue/animalDialogueBase';
import { lineMentionsLockedAnimal } from './dialogue/animalDialogueNarrative';
import { StoryContext, StoryMemory, StorySpeaker, STORY_COPY, getStoryPages } from './storySpine';

/** A snapshot of actual completed lines in one playthrough, never a phase unlock. */
export interface StoryArchiveHistory {
  cycleCount: number;
  readIds: Readonly<Record<string, readonly string[]>>;
}

/**
 * Wait for any in-flight completion/reset before reading its durable receipts.
 * Old saves have no trustworthy receipt ledger: historical cursors jumped past
 * unread lines, so they must never be used to reconstruct a reading history.
 * Storage errors propagate to the journal's retry state instead of looking empty.
 */
export function loadStoryArchiveHistory(): Promise<StoryArchiveHistory> {
  return runTransientStorageOperation(async () => {
    invalidateProgressCache();
    const progress = await getFullProgress();
    const ids = getConversationReadIds(progress);
    return {
      cycleCount: progress.cycleCount ?? 0,
      readIds: Object.fromEntries(Object.entries(ids).map(([animal, lines]) => [animal, [...lines]])),
    };
  });
}

/** One chapter per resident, containing only their finished regular lines. */
export interface StoryArchiveChapter { id: string; animal: AnimalType; count: number }
export function getStorySpeakerName(speaker: StorySpeaker): string {
  return speaker === 'narrator' ? STORY_COPY.narrator : speaker === 'player' ? STORY_COPY.player : ANIMAL_INFO[speaker]?.name ?? STORY_COPY.narrator;
}
export function getStoryArchiveDialogues(context: StoryContext, animal: AnimalType, phase: DialoguePhase, history: StoryArchiveHistory | null) {
  if (!history || history.cycleCount !== context.cycleCount || !context.unlockedAnimals.includes(animal)) return [];
  const completed = new Set(history.readIds[animal] ?? []);
  const availablePhase = context.phase >= 5 ? 4 : Math.min(context.phase, getAnimalPhase(context.phase, animal));
  if (phase > availablePhase || phase >= 5) return [];
  const unlocked = new Set(context.unlockedAnimals);
  return getDialoguesForAnimal(animal, phase).filter(line => completed.has(line.id) && line.phase === phase &&
    !line.requiresAnimals?.some(required => !unlocked.has(required)) &&
    !lineMentionsLockedAnimal(line.text, animal, [...context.unlockedAnimals]));
}
/** Finished lines in authored order. Merely opening a page earns no receipt. */
export function getStoryArchiveChapterLines(context: StoryContext, animal: AnimalType, history: StoryArchiveHistory | null) {
  const lines: ReturnType<typeof getStoryArchiveDialogues> = [];
  for (let phase = 0; phase <= 4; phase++) lines.push(...getStoryArchiveDialogues(context, animal, phase as DialoguePhase, history));
  return lines;
}
export function getStoryArchiveChapters(context: StoryContext, history: StoryArchiveHistory | null): StoryArchiveChapter[] {
  const chapters: StoryArchiveChapter[] = [];
  for (const animal of Object.keys(ANIMAL_INFO) as AnimalType[]) {
    const lines = getStoryArchiveChapterLines(context, animal, history);
    if (lines.length) chapters.push({ id: animal, animal, count: lines.length });
  }
  return chapters;
}
/** Row body under a chapter's speaker name: how much of them is kept, counted,
 *  never described. */
export function getStoryArchiveChapterSummary(count: number): string {
  return count === 1 ? STORY_COPY.archiveLineOne : `${count} ${STORY_COPY.archiveLineMany}`;
}
export function getVisibleStoryMemoryLines(memory: StoryMemory, context: StoryContext) {
  const pages = getStoryPages(memory);
  return pages.slice(0, memory.completed ? pages.length : memory.page + 1).filter(line => {
    if (line.speaker !== 'narrator' && line.speaker !== 'player' && !context.unlockedAnimals.includes(line.speaker)) return false;
    return !lineMentionsLockedAnimal(line.text, line.speaker as AnimalType, [...context.unlockedAnimals]);
  });
}
