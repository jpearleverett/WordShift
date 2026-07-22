import { speedTickKind, SPEED_TICK_THRESHOLD_SEC, SPEED_TICK_CRITICAL_SEC, SPEED_TICK_SOFT_SEC } from '../constants/timing';

describe('speedTickKind (countdown tick decision)', () => {
  test('the bands nest: critical < threshold < soft', () => {
    expect(SPEED_TICK_THRESHOLD_SEC).toBeGreaterThan(SPEED_TICK_CRITICAL_SEC);
    expect(SPEED_TICK_SOFT_SEC).toBeGreaterThan(SPEED_TICK_THRESHOLD_SEC);
  });

  test('drain envelope ramps soft -> normal -> critical down the countdown', () => {
    const seq = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
    const kinds: string[] = [];
    let prev: number | null = 11;
    for (const next of seq) {
      kinds.push(speedTickKind(prev, next));
      prev = next;
    }
    // 10..6: soft; 5,4: normal; 3,2,1: critical; 0: none.
    expect(kinds).toEqual([
      'soft', 'soft', 'soft', 'soft', 'soft',
      'normal', 'normal',
      'critical', 'critical', 'critical',
      'none',
    ]);
  });

  test('stays silent above the soft band', () => {
    expect(speedTickKind(12, 11)).toBe('none'); // 11 > soft(10)
    expect(speedTickKind(11, 10)).toBe('soft'); // first downward step INTO the soft band
  });

  test('does not tick on the null -> value start', () => {
    expect(speedTickKind(null, 5)).toBe('none');
    expect(speedTickKind(null, 9)).toBe('none');
  });

  test('does not tick when a rescue raises the clock back up', () => {
    expect(speedTickKind(2, 32)).toBe('none'); // +30 rescue jump
    expect(speedTickKind(32, 31)).toBe('none'); // still above the soft band
    expect(speedTickKind(6, 5)).toBe('normal'); // resumes ticking back in-zone
  });

  test('never ticks at or below 0', () => {
    expect(speedTickKind(1, 0)).toBe('none');
    expect(speedTickKind(1, -1)).toBe('none');
  });
});
