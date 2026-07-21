import {
  clampHomeScenePanY,
  resolveHomeScenePanY,
  projectPanMomentum,
  computePanSettleTarget,
  rubberBandPanY,
  HOME_PAN_PROJECTION_FACTOR,
} from '../services/homeScenePan';

describe('clampHomeScenePanY', () => {
  test('clamps negative pan values to zero', () => {
    expect(clampHomeScenePanY(-25, 180)).toBe(0);
  });

  test('clamps oversized pan values to the current max', () => {
    expect(clampHomeScenePanY(260, 180)).toBe(180);
  });
});

describe('resolveHomeScenePanY', () => {
  test('uses the default framed position on first mount', () => {
    expect(resolveHomeScenePanY({ currentPanY: null, savedPanY: null, maxPanY: 140 })).toBe(140);
  });

  test('restores the saved pan position after a remount', () => {
    expect(resolveHomeScenePanY({ currentPanY: null, savedPanY: 92, maxPanY: 140 })).toBe(92);
  });

  test('preserves the live viewport when the house grows', () => {
    expect(resolveHomeScenePanY({ currentPanY: 92, savedPanY: 40, maxPanY: 190 })).toBe(92);
  });

  test('clamps the live viewport when the visible bounds shrink', () => {
    expect(resolveHomeScenePanY({ currentPanY: 92, savedPanY: 92, maxPanY: 60 })).toBe(60);
  });
});

describe('projectPanMomentum', () => {
  test('zero velocity leaves the release position untouched', () => {
    expect(projectPanMomentum(100, 0)).toBe(100);
  });

  test('positive velocity (dragging down) projects further down', () => {
    expect(projectPanMomentum(100, 1000, 0.12)).toBeCloseTo(220);
  });

  test('negative velocity (dragging up) projects the other way', () => {
    expect(projectPanMomentum(100, -1000, 0.12)).toBeCloseTo(-20);
  });

  test('uses the shared default projection factor', () => {
    expect(projectPanMomentum(0, 1000)).toBeCloseTo(1000 * HOME_PAN_PROJECTION_FACTOR);
  });
});

describe('computePanSettleTarget', () => {
  test('a zero-velocity release settles at the clamped release point', () => {
    expect(computePanSettleTarget({ releasePanY: 92, velocityY: 0, maxPanY: 180 })).toBe(92);
  });

  test('an in-bounds fling carries momentum to the projected point', () => {
    // 92 + 400*0.12 = 140, still inside [0, 180]
    expect(computePanSettleTarget({ releasePanY: 92, velocityY: 400, maxPanY: 180 })).toBeCloseTo(140);
  });

  test('a fling projected past the top bound clamps to max', () => {
    expect(computePanSettleTarget({ releasePanY: 150, velocityY: 5000, maxPanY: 180 })).toBe(180);
  });

  test('a fling projected past the bottom bound clamps to zero', () => {
    expect(computePanSettleTarget({ releasePanY: 20, velocityY: -5000, maxPanY: 180 })).toBe(0);
  });

  test('with no scroll range everything settles at zero', () => {
    expect(computePanSettleTarget({ releasePanY: 0, velocityY: 3000, maxPanY: 0 })).toBe(0);
  });
});

describe('rubberBandPanY', () => {
  const DIM = 800;

  test('is identity inside the bounds', () => {
    expect(rubberBandPanY(50, 200, DIM)).toBe(50);
    expect(rubberBandPanY(0, 200, DIM)).toBe(0);
    expect(rubberBandPanY(200, 200, DIM)).toBe(200);
  });

  test('resists overscroll past the bottom (below zero)', () => {
    const out = rubberBandPanY(-100, 200, DIM);
    expect(out).toBeLessThan(0);
    expect(Math.abs(out)).toBeLessThan(100); // pulled less than the raw distance
  });

  test('resists overscroll past the top (beyond max)', () => {
    const out = rubberBandPanY(300, 200, DIM); // 100px past max
    expect(out).toBeGreaterThan(200);
    expect(out).toBeLessThan(300); // never the full raw distance
  });

  test('resistance grows with distance (further pull yields diminishing travel)', () => {
    const near = rubberBandPanY(250, 200, DIM) - 200; // 50px overscroll -> travel
    const far = rubberBandPanY(400, 200, DIM) - 200; // 200px overscroll -> travel
    expect(far).toBeGreaterThan(near); // still moves further out...
    expect(far).toBeLessThan(200); // ...but never the full raw overscroll
  });

  test('caps the overscroll travel when maxOverscroll is given', () => {
    const out = rubberBandPanY(100000, 200, DIM, undefined, 40);
    expect(out).toBeCloseTo(240); // max (200) + capped overscroll (40)
  });

  test('rubber-bands symmetrically around a zero-range scene', () => {
    const up = rubberBandPanY(-50, 0, DIM);
    const down = rubberBandPanY(50, 0, DIM);
    expect(up).toBeCloseTo(-down);
    expect(down).toBeGreaterThan(0);
    expect(down).toBeLessThan(50);
  });
});
