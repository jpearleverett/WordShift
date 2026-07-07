import { speedTickKind, SPEED_TICK_THRESHOLD_SEC, SPEED_TICK_CRITICAL_SEC } from '../constants/timing';

describe('speedTickKind (final-countdown tick decision)', () => {
  test('critical threshold is inside the tick zone', () => {
    expect(SPEED_TICK_THRESHOLD_SEC).toBeGreaterThan(SPEED_TICK_CRITICAL_SEC);
  });

  test('ticks once per downward second inside the zone, escalating at critical', () => {
    const seq = [6, 5, 4, 3, 2, 1, 0];
    const kinds: string[] = [];
    let prev: number | null = 7;
    for (const next of seq) {
      kinds.push(speedTickKind(prev, next));
      prev = next;
    }
    // 6: above threshold -> none; 5,4: normal; 3,2,1: critical; 0: none.
    expect(kinds).toEqual(['none', 'normal', 'normal', 'critical', 'critical', 'critical', 'none']);
  });

  test('does not tick on the null -> value start', () => {
    expect(speedTickKind(null, 5)).toBe('none');
  });

  test('does not tick when a rescue raises the clock back up', () => {
    expect(speedTickKind(2, 32)).toBe('none'); // +30 rescue jump
    expect(speedTickKind(32, 31)).toBe('none'); // still above threshold
    expect(speedTickKind(6, 5)).toBe('normal'); // resumes ticking back in-zone
  });

  test('never ticks at or below 0', () => {
    expect(speedTickKind(1, 0)).toBe('none');
    expect(speedTickKind(1, -1)).toBe('none');
  });
});
