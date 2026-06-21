import { AnimalType } from '../../types/homeWorld';
import { PlayerChoice, getPhase5ChoiceCallback } from '../dialogueChoices';
import { getPostRevelationDialogue, getPostRevelationDialogueCount } from './animalDialogueIntro';
import { getTendingMilestoneLines } from './animalDialogueTending';

/**
 * Build an animal's ordered Phase-5 line pool:
 *   [ base post-revelation lines, optional Phase-3 choice callback, unlocked
 *     Tending milestone lines ]
 *
 * The pool grows as the player deepens the pattern at the Tending Shrine (new
 * milestone lines append at the end). It is the single source of truth shared by
 * the dialogue hook's selection and the home-screen "new dialogue" badge so the
 * two can never disagree about how much content currently exists.
 */
export function buildPhase5Pool(
  animalType: AnimalType,
  tendingLevel: number,
  playerChoice: PlayerChoice | null
): string[] {
  const prCount = getPostRevelationDialogueCount(animalType);
  const base: string[] = [];
  for (let i = 0; i < prCount; i++) {
    base.push(getPostRevelationDialogue(animalType, i) || '');
  }
  const choiceCallback = getPhase5ChoiceCallback(animalType, playerChoice);
  const tendingLines = getTendingMilestoneLines(animalType, tendingLevel);
  return [
    ...base,
    ...(choiceCallback ? [choiceCallback] : []),
    ...tendingLines,
  ];
}

/** Length of the Phase-5 pool — how many distinct lines currently exist. */
export function getPhase5PoolLength(
  animalType: AnimalType,
  tendingLevel: number,
  playerChoice: PlayerChoice | null
): number {
  return buildPhase5Pool(animalType, tendingLevel, playerChoice).length;
}
