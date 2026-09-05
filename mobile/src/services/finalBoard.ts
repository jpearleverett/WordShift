import { CURATED_FINAL_PUZZLE, CuratedFinalPuzzle } from '../constants/wordLists';

export interface FinalBoardPuzzle extends CuratedFinalPuzzle { hint?: string }

/**
 * The final transfer is a narrative choice, so its two legal outcomes must
 * survive every player's word history. Personal words are echoed by the
 * arrival ceremony and Keeper's Record instead of randomizing this board.
 */
export async function buildFinalBoard(_ritualWords: string[]): Promise<FinalBoardPuzzle> {
  return {
    ...CURATED_FINAL_PUZZLE,
    words: [...CURATED_FINAL_PUZZLE.words],
    solution: CURATED_FINAL_PUZZLE.solution.map(step => ({ ...step })),
  };
}
