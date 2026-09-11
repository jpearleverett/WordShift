import { AnimalType, DialoguePhase, getAnimalPhase } from '../types/homeWorld';
import { ANIMAL_INFO, getDialoguesForAnimal } from './dialogue/animalDialogueBase';
import { lineMentionsLockedAnimal } from './dialogue/animalDialogueNarrative';
import { StoryContext, StoryMemory, StorySpeaker, STORY_COPY, getStoryPages } from './storySpine';

/**
 * One archive chapter is ONE ANIMAL: every earlier line they are allowed to
 * show, oldest first. The archive used to split each animal into a row per
 * stretch of the story, and each of those rows had to be titled with the mood
 * of that stretch ('By the warm hearth', 'While the shadows gathered'), which
 * is an era name by another name. A chapter is a speaker now, so the title is
 * a person and the order carries the rest.
 */
export interface StoryArchiveChapter { id: string; animal: AnimalType; count: number }
export function getStorySpeakerName(speaker: StorySpeaker): string {
  return speaker === 'narrator' ? STORY_COPY.narrator : speaker === 'player' ? STORY_COPY.player : ANIMAL_INFO[speaker]?.name ?? STORY_COPY.narrator;
}
export function getStoryArchiveDialogues(context: StoryContext, animal: AnimalType, phase: DialoguePhase) {
  if (!context.unlockedAnimals.includes(animal)) return [];
  const availablePhase = context.phase >= 5 ? 4 : Math.min(context.phase, getAnimalPhase(context.phase, animal));
  if (phase > availablePhase || phase >= 5) return [];
  const unlocked = new Set(context.unlockedAnimals);
  return getDialoguesForAnimal(animal, phase).filter(line => line.phase === phase &&
    !line.requiresAnimals?.some(required => !unlocked.has(required)) &&
    !lineMentionsLockedAnimal(line.text, animal, [...context.unlockedAnimals]));
}
/** Every earlier line one animal may show, oldest first. Same gating as the
 *  per-stretch reader it concatenates: nothing unreached and no locked speaker. */
export function getStoryArchiveChapterLines(context: StoryContext, animal: AnimalType) {
  const lines: ReturnType<typeof getStoryArchiveDialogues> = [];
  for (let phase = 0; phase <= 4; phase++) lines.push(...getStoryArchiveDialogues(context, animal, phase as DialoguePhase));
  return lines;
}
export function getStoryArchiveChapters(context: StoryContext): StoryArchiveChapter[] {
  const chapters: StoryArchiveChapter[] = [];
  for (const animal of Object.keys(ANIMAL_INFO) as AnimalType[]) {
    const lines = getStoryArchiveChapterLines(context, animal);
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
