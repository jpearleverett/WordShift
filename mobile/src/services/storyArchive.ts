import { AnimalType, DialoguePhase, getAnimalPhase } from '../types/homeWorld';
import { ANIMAL_INFO, getDialoguesForAnimal } from './dialogue/animalDialogueBase';
import { lineMentionsLockedAnimal } from './dialogue/animalDialogueNarrative';
import { StoryContext, StoryMemory, StorySpeaker, STORY_COPY, getStoryPages } from './storySpine';

export interface StoryArchiveChapter { id: string; animal: AnimalType; phase: Exclude<DialoguePhase, 5>; count: number }
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
export function getStoryArchiveChapters(context: StoryContext): StoryArchiveChapter[] {
  const chapters: StoryArchiveChapter[] = [];
  for (const animal of Object.keys(ANIMAL_INFO) as AnimalType[]) {
    for (let phase = 0; phase <= 4; phase++) {
      const lines = getStoryArchiveDialogues(context, animal, phase as DialoguePhase);
      if (lines.length) chapters.push({ id: `${animal}:${phase}`, animal, phase: phase as Exclude<DialoguePhase, 5>, count: lines.length });
    }
  }
  return chapters;
}
export function getVisibleStoryMemoryLines(memory: StoryMemory, context: StoryContext) {
  const pages = getStoryPages(memory);
  return pages.slice(0, memory.completed ? pages.length : memory.page + 1).filter(line => {
    if (line.speaker !== 'narrator' && line.speaker !== 'player' && !context.unlockedAnimals.includes(line.speaker)) return false;
    return !lineMentionsLockedAnimal(line.text, line.speaker as AnimalType, [...context.unlockedAnimals]);
  });
}
