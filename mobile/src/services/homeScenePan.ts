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

interface GestureBaseInput {
  /** Is a momentum spring actually mid-flight right now? */
  settling: boolean;
  /** JS mirror of the natively-driven animated value. May lie: see below. */
  liveMirror: number;
  /** The last position JS itself put the scene at. Never written by the mirror. */
  lastRestingPanY: number;
  maxPanY: number;
}

/**
 * Which number a fresh gesture should treat as its starting point.
 *
 * The subtlety is that the JS mirror of a natively-driven Animated.Value CAN
 * LIE, and specifically it can lie as zero. React Native delivers native value
 * updates through `__onAnimatedValueUpdateReceived(value, offset)`, which calls
 * `_updateValue(value)` FIRST (firing listeners with `value + this._offset`,
 * the OLD offset) and assigns the new offset only afterwards. So an update
 * emitted by native before `flattenOffset()` but delivered to JS after it
 * arrives carrying the raw gesture translation while JS has already zeroed the
 * offset it belonged to. For a tap, or any touch that moves a pixel or two,
 * that translation is ~0 — and the mirror collapses to ~0, which on this scene
 * is the pit end. The next gesture then reads that as its base and the whole
 * house snaps to the bottom.
 *
 * The mirror is only genuinely needed in one window: mid-spring, where JS has
 * no other way to know where the scene is (and where the offset is stably zero,
 * so the race above cannot occur). At rest, JS's own bookkeeping is both
 * sufficient and trustworthy. Clamped either way, so even a mirror corrupted
 * the other direction cannot throw the scene past a bound.
 */
export const resolveGestureBasePanY = ({
  settling,
  liveMirror,
  lastRestingPanY,
  maxPanY,
}: GestureBaseInput): number => {
  return clampHomeScenePanY(settling ? liveMirror : lastRestingPanY, maxPanY);
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
  /** Where to put the scene now. */
  panY: number;
  /** Whether this position is worth REMEMBERING (writing back to the caller). */
  commit: boolean;
}

/**
 * The restore decision for the home diorama, kept pure because getting it wrong
 * is invisible in a single frame and only shows up as drift over many sessions.
 *
 * The house mounts before it knows how tall it is: the room list is seeded from
 * a paint-ahead snapshot but the "next unlock" ghost room arrives several
 * storage round trips later, so for that window the pan bound is one room short
 * of the truth. If the value clamped against that provisional bound is adopted
 * as the live position AND written back to memory, every trip home shaves a
 * room's height off a player parked near the roof. It compounds, it never
 * recovers, and it presents as the house dumping you at the bottom.
 *
 * So: before the player has touched the scene, the saved value stays the source
 * of truth (any clamp is a temporary rendering that a later, larger bound
 * undoes) and nothing is committed. Once they HAVE touched it, their live
 * position wins outright, so the house growing above them cannot move it.
 */
export const resolveHomeScenePanRestore = ({
  currentPanY,
  savedPanY = null,
  maxPanY,
  userOwnsPosition,
}: HomeScenePanRestoreInput): HomeScenePanRestore => {
  const panY = resolveHomeScenePanY({
    currentPanY: userOwnsPosition ? currentPanY : null,
    savedPanY,
    maxPanY,
  });
  return { panY, commit: userOwnsPosition && currentPanY !== panY };
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
