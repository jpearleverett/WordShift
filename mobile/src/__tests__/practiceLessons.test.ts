import { COMMON_WORDS } from '../constants/wordLists';
import { createPracticeState, PRACTICE_LESSONS, placePracticeLetter, selectPracticeLetter, PracticeLessonId } from '../services/practiceLessons';

describe('optional practice lessons', () => {
  test.each(['reverse', 'double_shift', 'blind'] as PracticeLessonId[])('%s is a complete playable lesson using the shipped dictionary', id => {
    let state = createPracticeState(id);
    for (const step of PRACTICE_LESSONS[id].steps) {
      const index = state.rows[step.sourceRow].findIndex(cell => cell.char === step.letter && !cell.locked);
      state = selectPracticeLetter(state, index);
      expect(state.selected).toBe(index);
      state = placePracticeLetter(state, step.slot);
    }
    expect(state.complete).toBe(true);
    expect(state.failed).toBe(false);
    for (const row of state.rows) expect(COMMON_WORDS.has(row.map(cell => cell.char).join(''))).toBe(true);
  });

  test('reverse return cannot pick the letter just moved down', () => {
    let state = placePracticeLetter(selectPracticeLetter(createPracticeState('reverse'), 3), 3);
    expect(state.step).toBe(1);
    state = selectPracticeLetter(state, 3);
    expect(state.selected).toBeNull();
    expect(state.message).toContain('locked');
  });

  test('double shift allows its intermediate non-word before the second drop', () => {
    const state = placePracticeLetter(selectPracticeLetter(createPracticeState('double_shift'), 0), 4);
    expect(state.rows[0].map(cell => cell.char).join('')).toBe('EART');
    expect(state.failed).toBe(false);
    expect(state.complete).toBe(false);
  });

  test('blind placement judges the finished board and allows a clean retry', () => {
    const initial = createPracticeState('blind');
    const failed = placePracticeLetter(selectPracticeLetter(initial, 2), 3);
    expect(failed.rows[1].map(cell => cell.char).join('')).toBe('TIEM');
    expect(failed.failed).toBe(true);
    expect(createPracticeState('blind')).toEqual(initial);
  });
});
