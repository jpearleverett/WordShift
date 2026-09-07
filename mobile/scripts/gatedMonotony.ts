import type { PuzzleSolutionStep } from '../src/types';

interface Candidate {
  words: string[];
  solution?: PuzzleSolutionStep[];
}

/** Retain the shipped 30% bank-wide variety limits while growing a pool. */
export function passesBankMonotony(bank: Candidate[], candidate: Candidate): boolean {
  // Small initial samples are noisy. Once seeded, only the candidate's own
  // letter can gain share; other letters may safely dilute an inherited spike.
  if (bank.length < 20) return true;
  const size = bank.length + 1;
  const start = candidate.words[0][0];
  if ((1 + bank.filter(puzzle => puzzle.words[0][0] === start).length) / size > 0.30) return false;
  const first = candidate.solution?.[0]?.letterToMove;
  if (first && (1 + bank.filter(puzzle => puzzle.solution?.[0]?.letterToMove === first).length) / size > 0.30) return false;
  const steps = bank.flatMap(puzzle => puzzle.solution ?? []);
  const added = candidate.solution ?? [];
  const totalS = [...steps, ...added].filter(step => step.letterToMove === 'S').length;
  const addedS = added.filter(step => step.letterToMove === 'S').length;
  // Let a less repetitive board dilute a previously undersized S-heavy pool.
  return !(totalS / (steps.length + added.length) > 0.30 && addedS / added.length > 0.30);
}
