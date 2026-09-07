import { COMMON_WORDS } from '../constants/wordLists';

export type PracticeLessonId = 'reverse' | 'double_shift' | 'blind';
interface PracticeStep {
  sourceRow: number;
  targetRow: number;
  letter: string;
  slot: number;
  instruction: string;
}
export interface PracticeLesson {
  title: string;
  words: string[];
  steps: PracticeStep[];
  completion: string;
}
export const PRACTICE_LESSONS: Record<PracticeLessonId, PracticeLesson> = {
  reverse: {
    title: 'Practice Reverse Shift',
    words: ['HOPE', 'ROBS'],
    steps: [
      { sourceRow: 0, targetRow: 1, letter: 'E', slot: 3,
        instruction: 'Pick E from HOPE, then put it between B and S below. Both words must fit.' },
      { sourceRow: 1, targetRow: 0, letter: 'S', slot: 3,
        instruction: 'Now travel upward. The E you just moved is locked. Pick S from ROBES and put it after HOP.' },
    ],
    completion: 'HOPS and ROBE both fit. Reverse Shift finishes when you return to the top. Moved letters stay locked on the return trip.',
  },
  double_shift: {
    title: 'Practice Double Shift',
    words: ['HEART', 'BEATS'],
    steps: [
      { sourceRow: 0, targetRow: 1, letter: 'H', slot: 4,
        instruction: 'Move H from HEART between T and S below. This is only the first half of the move.' },
      { sourceRow: 0, targetRow: 1, letter: 'R', slot: 1,
        instruction: 'EART and BEATHS are allowed for this moment. Now move R from EART between B and E below. Both finished words must fit.' },
    ],
    completion: 'EAT and BREATHS both fit. Pick, place, pick, place: temporary non-words are allowed until the second letter lands.',
  },
  blind: {
    title: 'Practice Blind Offering',
    words: ['TIME', 'TIE'],
    steps: [
      { sourceRow: 0, targetRow: 1, letter: 'M', slot: 2,
        instruction: 'Move M from TIME into TIE. There are no word previews. Place it where you think it belongs; the finished board will be checked.' },
    ],
    completion: 'TIE and TIME both fit. Blind Offering waits until the finished board to judge your words. You can undo and try another arrangement.',
  },
};

interface PracticeCell { char: string; locked: boolean }
export interface PracticeState {
  lessonId: PracticeLessonId;
  rows: PracticeCell[][];
  step: number;
  selected: number | null;
  complete: boolean;
  failed: boolean;
  message: string;
}

export function createPracticeState(lessonId: PracticeLessonId): PracticeState {
  const lesson = PRACTICE_LESSONS[lessonId];
  return {
    lessonId,
    rows: lesson.words.map(word => [...word].map(char => ({ char, locked: false }))),
    step: 0, selected: null, complete: false, failed: false,
    message: lesson.steps[0].instruction,
  };
}

export function selectPracticeLetter(state: PracticeState, index: number): PracticeState {
  if (state.complete || state.failed) return state;
  const step = PRACTICE_LESSONS[state.lessonId].steps[state.step];
  const cell = state.rows[step.sourceRow][index];
  if (!cell || cell.locked) return { ...state, message: 'That letter is locked. Choose an unlocked letter for the next move.' };
  if (cell.char !== step.letter) return { ...state, message: `For this example, choose ${step.letter}. ${step.instruction}` };
  return { ...state, selected: index, message: step.instruction };
}

/** Pure lesson state: no scores, hints, timers, storage, or game progression. */
export function placePracticeLetter(state: PracticeState, slot: number): PracticeState {
  if (state.selected == null || state.complete || state.failed) return state;
  const lesson = PRACTICE_LESSONS[state.lessonId];
  const step = lesson.steps[state.step];
  const target = state.rows[step.targetRow];
  if (!Number.isInteger(slot) || slot < 0 || slot > target.length) return state;
  if (state.lessonId !== 'blind' && slot !== step.slot) {
    return { ...state, message: `Try position ${step.slot + 1} for this example. ${step.instruction}` };
  }
  const moved = state.rows[step.sourceRow][state.selected];
  const rows = state.rows.map(row => row.map(cell => ({ ...cell })));
  rows[step.sourceRow].splice(state.selected, 1);
  rows[step.targetRow].splice(slot, 0, { char: moved.char, locked: true });
  const nextStep = state.step + 1;
  const finished = nextStep === lesson.steps.length;
  const failed = finished && rows.some(row => !COMMON_WORDS.has(row.map(cell => cell.char).join('')));
  return {
    ...state, rows, step: nextStep, selected: null,
    complete: finished && !failed, failed,
    message: failed ? 'The finished words do not both fit. Nothing was spent. Try this practice again.'
      : finished ? lesson.completion : lesson.steps[nextStep].instruction,
  };
}
