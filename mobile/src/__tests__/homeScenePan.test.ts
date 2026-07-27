import {
  clampHomeScenePanY,
  resolveHomeScenePanY,
  projectPanMomentum,
  computePanSettleTarget,
  rubberBandPanY,
  resolveHomeScenePanRestore,
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

// ===========================================================================
// The restore decision. Getting this wrong is invisible in one frame and only
// shows up as drift across sessions, which is exactly how it shipped: players
// reported the house "taking me back down to the bottom" after unlocks.
// ===========================================================================
describe('resolveHomeScenePanRestore', () => {
  // The house mounts before it knows its own height: rooms come from a
  // paint-ahead snapshot, but the next-unlock ghost room lands several storage
  // reads later, so the bound is briefly one room (~140dp) short.
  const ROOM = 140;
  const TRUE_MAX = 900;
  const PROVISIONAL_MAX = TRUE_MAX - ROOM;

  test('a mount never commits, so a provisional bound cannot eat the memory', () => {
    const parkedAtRoof = TRUE_MAX;
    const early = resolveHomeScenePanRestore({
      currentPanY: null,
      savedPanY: parkedAtRoof,
      maxPanY: PROVISIONAL_MAX,
      userOwnsPosition: false,
    });
    // Rendered against the short bound for now...
    expect(early.panY).toBe(PROVISIONAL_MAX);
    // ...but NOT written back. This is the whole fix.
    expect(early.commit).toBe(false);
  });

  test('the real bound arriving restores the position the player actually left', () => {
    const parkedAtRoof = TRUE_MAX;
    const settled = resolveHomeScenePanRestore({
      currentPanY: PROVISIONAL_MAX, // what the early pass rendered
      savedPanY: parkedAtRoof,
      maxPanY: TRUE_MAX,
      userOwnsPosition: false,
    });
    expect(settled.panY).toBe(parkedAtRoof);
  });

  test('repeated trips home do not erode the remembered position', () => {
    // The shipped leak: each mount clamped against the short bound AND wrote
    // the clamped value back, so a player parked near the roof lost a room per
    // visit, cumulatively, with no floor. Simulate five round trips.
    let remembered = TRUE_MAX;
    for (let trip = 0; trip < 5; trip++) {
      const early = resolveHomeScenePanRestore({
        currentPanY: null,
        savedPanY: remembered,
        maxPanY: PROVISIONAL_MAX,
        userOwnsPosition: false,
      });
      if (early.commit) remembered = early.panY;
      const late = resolveHomeScenePanRestore({
        currentPanY: early.panY,
        savedPanY: remembered,
        maxPanY: TRUE_MAX,
        userOwnsPosition: false,
      });
      if (late.commit) remembered = late.panY;
    }
    expect(remembered).toBe(TRUE_MAX);
  });

  test('once the player pans, their live position wins and the house may grow above them', () => {
    // Rooms are added at the TOP of a bottom-anchored scene, so holding the
    // number holds the view. Growing the bound must not move them.
    const held = 420;
    const grown = resolveHomeScenePanRestore({
      currentPanY: held,
      savedPanY: 900,
      maxPanY: TRUE_MAX + ROOM,
      userOwnsPosition: true,
    });
    expect(grown.panY).toBe(held);
    expect(grown.commit).toBe(false); // unchanged, nothing to re-record
  });

  test('a live position that the bound genuinely clamps IS re-recorded', () => {
    // House completion is the one shrink. If the bound really did move under a
    // position the player owns, the new truth must be remembered.
    const clamped = resolveHomeScenePanRestore({
      currentPanY: 900,
      savedPanY: 900,
      maxPanY: 500,
      userOwnsPosition: true,
    });
    expect(clamped.panY).toBe(500);
    expect(clamped.commit).toBe(true);
  });

  test('a first-ever launch still frames the roof', () => {
    const fresh = resolveHomeScenePanRestore({
      currentPanY: null,
      savedPanY: null,
      maxPanY: TRUE_MAX,
      userOwnsPosition: false,
    });
    expect(fresh.panY).toBe(TRUE_MAX);
    expect(fresh.commit).toBe(false);
  });
});

// ===========================================================================
// Source contracts for the HouseWorld wiring around that decision. Both of
// these are invisible in a single frame and both were live defects.
// ===========================================================================
describe('HouseWorld pan wiring', () => {
  const fs = require('fs');
  const path = require('path');
  const SRC: string = fs.readFileSync(
    path.resolve(__dirname, '../components/home/HouseWorld.tsx'),
    'utf8',
  );

  it('does not re-enter the restore effect on its own committed release', () => {
    // onPanYChange writes the released position into App state, which comes
    // straight back down as the savedPanY prop. With savedPanY in this effect's
    // deps, a release re-ran the effect on the next commit and syncPanPosition
    // STOPS any running settle, so the momentum spring died a frame after it
    // started: no deceleration, no rubber-band bounce.
    const effect = SRC.slice(SRC.indexOf('const { panY, commit } = resolveHomeScenePanRestore'));
    const deps = effect.slice(effect.indexOf('}, ['), effect.indexOf(']);') + 1);
    expect(deps).toContain('panBoundsMax');
    expect(deps).toContain('containerHeight');
    expect(deps).not.toContain('savedPanY');
    // ...which is only safe because it reads the current value through a ref.
    expect(SRC).toMatch(/savedPanY: savedPanYRef\.current/);
  });

  it('hands the position to the player on ACTIVE, never on a bare touch', () => {
    // BEGAN fires on finger-down, so arming ownership there would hand it to
    // every TAP — including the tap that opens a room's unlock modal — and make
    // a provisionally clamped position authoritative for the rest of the mount.
    const began = SRC.indexOf('if (state === State.BEGAN)');
    const active = SRC.indexOf('if (state === State.ACTIVE)');
    const owns = SRC.indexOf('hasUserPannedRef.current = true');
    expect(began).toBeGreaterThan(-1);
    expect(active).toBeGreaterThan(began);
    expect(owns).toBeGreaterThan(active);
    // And the BEGAN branch returns before reaching it.
    expect(SRC.slice(began, active)).toMatch(/stopSettle\(\);\s*\n\s*return;/);
  });

  it('commits a release when the settle STARTS, not only when it finishes', () => {
    // A settle stopped in flight never runs its finish callback, which left the
    // remembered position a whole pan behind what the player was looking at.
    const release = SRC.slice(
      SRC.indexOf('const settleTarget = computePanSettleTarget'),
      SRC.indexOf('const settle = Animated.spring(panRaw'),
    );
    expect(release).toMatch(/onPanYChange\?\.\(settleTarget\)/);
  });
});
