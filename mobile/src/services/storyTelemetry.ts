import { EventType, logEvent } from './eventLogger';
import { StoryContext, StoryMemory } from './storySpine';

/** Coarse delivery facts only. Never include dialogue or the player's transcript. */
export function logStoryEvent(type: EventType, context: StoryContext, memory: StoryMemory,
  extra: { elapsedMs?: number; choiceId?: string } = {}): void {
  logEvent({ type, data: { sceneId: memory.scene.id, phase: context.phase,
    puzzlesSolved: context.puzzlesSolved, cycle: context.cycleCount, page: memory.page, ...extra } });
}
