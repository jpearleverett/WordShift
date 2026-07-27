export const clampHomeScenePanY = (panY: number, maxPanY: number): number => {
  return Math.max(0, Math.min(maxPanY, panY));
};

interface ResolveHomeScenePanYInput {
  currentPanY: number | null;
  savedPanY?: number | null;
  maxPanY: number;
}

export const resolveHomeScenePanY = ({
  currentPanY,
  savedPanY = null,
  maxPanY,
}: ResolveHomeScenePanYInput): number => {
  return clampHomeScenePanY(currentPanY ?? savedPanY ?? maxPanY, maxPanY);
};

interface HomeScenePanRestoreInput extends ResolveHomeScenePanYInput {
  /**
   * Has the player physically touched the scene during THIS mount? Until they
   * have, `currentPanY` is only a provisional rendering of `savedPanY` and must
   * not be treated as the truth.
   */
  userOwnsPosition: boolean;
}

export interface HomeScenePanRestore {
  /** Where to put the scene now, clamped for DISPLAY against the current bound. */
  panY: number;
  /**
   * The player's intent, UNCLAMPED. This is what the next restore should reason
   * from, so that a bound which is momentarily too small can shrink the picture
   * without ever shrinking the intent.
   */
  intendedPanY: number | null;
}

/**
 * The restore decision for the home diorama, kept pure because getting it wrong
 * is invisible in a single frame and only shows up as drift over many sessions.
 *
 * THE ONE RULE: A CLAMP IS A RENDERING CONCERN, NEVER A NEW TRUTH.
 *
 * The pan bound is not stable. The house mounts before it knows its own height
 * (rooms come from a paint-ahead snapshot, but the next-unlock ghost room lands
 * several storage reads later), it shrinks for a beat whenever the unlock flow
 * clears its pending room before the reload arrives, and it moves again with
 * every layout change. Each of those windows makes `maxPanY` momentarily one
 * room (~140dp) short of the truth.
 *
 * If the value clamped against a short bound is allowed to become the position
 * of record, every one of those windows permanently drags the player one room
 * closer to the pit, cumulatively, with no recovery. That is the whole family
 * of "it takes me back down to the bottom of the house" reports: not one reset,
 * a ratchet.
 *
 * So the intent is carried UNCLAMPED and the clamp is applied only to what gets
 * drawn. When a bigger bound arrives, the intent is still intact and the scene
 * comes back. Nothing here writes to durable memory either: the remembered
 * position is written by real releases only, so a restore can never record a
 * position the player did not choose.
 */
export const resolveHomeScenePanRestore = ({
  currentPanY,
  savedPanY = null,
  maxPanY,
  userOwnsPosition,
}: HomeScenePanRestoreInput): HomeScenePanRestore => {
  // Before the player touches the scene, the saved value is the intent; after,
  // their own live position is.
  const intendedPanY = (userOwnsPosition ? currentPanY : null) ?? savedPanY ?? maxPanY;
  return { panY: clampHomeScenePanY(intendedPanY, maxPanY), intendedPanY };
};

// ─── Pan momentum + rubber-band physics ──────────────────────────────────────
// Pure math for the home diorama's "snow-globe you can nudge" pan feel. Kept
// out of the component (which pulls the full native surface) so the physics is
// unit-testable. HouseWorld wires these into the vertical PanGestureHandler:
// the drag applies `rubberBandPanY` for resistance past the bounds, and the
// release runs a native-driver spring toward `computePanSettleTarget`.

/**
 * How far a fling projects, in display px per (px/s) of release velocity.
 * A ~1500px/s fling carries ~180px past the release point before settling —
 * a controlled diorama nudge, not a long scroll throw. The release spring
 * also carries the raw velocity, so this only sets the settle *target*.
 */
export const HOME_PAN_PROJECTION_FACTOR = 0.12;

/** iOS-style rubber-band tightness (0..1); higher = looser pull. */
export const HOME_PAN_RUBBER_BAND_COEFF = 0.55;

/**
 * Project a release position forward by its momentum (unclamped).
 * Positive velocity (finger dragged down, revealing the roof) increases panY.
 */
export const projectPanMomentum = (
  releasePanY: number,
  velocityY: number,
  projectionFactor: number = HOME_PAN_PROJECTION_FACTOR,
): number => {
  return releasePanY + velocityY * projectionFactor;
};

interface PanSettleInput {
  /** The clamped logical position at the moment of release. */
  releasePanY: number;
  /** Release velocity in px/s (down = positive, matching translateY). */
  velocityY: number;
  maxPanY: number;
  projectionFactor?: number;
}

/**
 * Where a released fling should come to rest: the momentum-projected point,
 * clamped back inside [0, maxPanY]. When the projection lands out of bounds the
 * target pins to the bound and the release spring (seeded with the raw
 * velocity) overshoots into the rubber-band zone and settles back — the bounce.
 */
export const computePanSettleTarget = ({
  releasePanY,
  velocityY,
  maxPanY,
  projectionFactor = HOME_PAN_PROJECTION_FACTOR,
}: PanSettleInput): number => {
  return clampHomeScenePanY(
    projectPanMomentum(releasePanY, velocityY, projectionFactor),
    maxPanY,
  );
};

/**
 * The iOS rubber-band easing of an overscroll distance: resistance grows as
 * you pull further past a bound, so the pull is progressively harder and never
 * runs away. `dimension` is the viewport extent (bigger = looser band).
 * `maxOverscroll`, when given, hard-caps how far past a bound the display can
 * travel so a very long drag can't peel the whole scene off its seat.
 */
export const rubberBandPanY = (
  rawPanY: number,
  maxPanY: number,
  dimension: number,
  coeff: number = HOME_PAN_RUBBER_BAND_COEFF,
  maxOverscroll?: number,
): number => {
  const max = Math.max(0, maxPanY);
  const d = Math.max(1, dimension);
  const band = (overscroll: number): number => {
    const over = Math.max(0, overscroll);
    const eased = (1 - 1 / ((over * coeff) / d + 1)) * d;
    return maxOverscroll != null ? Math.min(eased, maxOverscroll) : eased;
  };
  if (rawPanY < 0) return -band(-rawPanY);
  if (rawPanY > max) return max + band(rawPanY - max);
  return rawPanY;
};
