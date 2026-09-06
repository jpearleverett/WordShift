/** Geometry derived from the current viewport, shared with resize regression tests. */
export const SKY_IMG_WIDTH = 941;
export const SKY_IMG_HEIGHT = 1972;

/** Height-driven cover scaling seats the house below the painted river on small screens. */
export const getSkyBoxHeight = (width: number, height: number): number => Math.max(
  height, Math.ceil(width * (SKY_IMG_HEIGHT / SKY_IMG_WIDTH)) + 2, 940,
);

const PIT_WARD_RIM_OFFSET = 10;

export function getPitGeometry(SCREEN_WIDTH: number, SCREEN_HEIGHT: number, statusBarHeight = 0) {
  const PIT_CENTER = { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.72 };
  const PIT_OVAL = { radiusX: SCREEN_WIDTH * 0.29, radiusY: SCREEN_HEIGHT * 0.06 };
  const WARD_RING_SIZE_Y = (PIT_OVAL.radiusY + PIT_WARD_RIM_OFFSET) * 2;
  const WARD_RING_SCALE_X = ((PIT_OVAL.radiusX + PIT_WARD_RIM_OFFSET) * 2) / WARD_RING_SIZE_Y;
  const FLOAT_ZONE = { top: Math.min(statusBarHeight + 60, SCREEN_HEIGHT * 0.35), bottom: SCREEN_HEIGHT * 0.55, left: 10, right: SCREEN_WIDTH - 10 };
  const PIT_GLOW_BASE_WIDTH = SCREEN_WIDTH * 0.7;
  const PIT_GLOW_BASE_HEIGHT = 90;

  // Pre-computed ellipse scaleX ratios (targetWidth / circleSize) for each layer
  const GLOW_OUTER_SIZE = PIT_GLOW_BASE_HEIGHT * 1.1;     // 99px circle
  const GLOW_OUTER_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.9) / GLOW_OUTER_SIZE;
  const GLOW_MIDDLE_SIZE = PIT_GLOW_BASE_HEIGHT * 0.9;    // 81px circle
  const GLOW_MIDDLE_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.64) / GLOW_MIDDLE_SIZE;
  const GLOW_INNER_SIZE = PIT_GLOW_BASE_HEIGHT * 0.7;     // 63px circle
  const GLOW_INNER_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.4) / GLOW_INNER_SIZE;
  const GLOW_CORE_SIZE = PIT_GLOW_BASE_HEIGHT * 0.5;      // 45px circle
  const GLOW_CORE_SCALE_X = (PIT_GLOW_BASE_WIDTH * 0.28) / GLOW_CORE_SIZE;
  const GLOW_RIM_SIZE_Y = PIT_OVAL.radiusY * 2;           // rim uses PIT_OVAL dims
  const GLOW_RIM_SCALE_X = (PIT_OVAL.radiusX * 2) / GLOW_RIM_SIZE_Y;
  return { PIT_CENTER, PIT_OVAL, WARD_RING_SIZE_Y, WARD_RING_SCALE_X, FLOAT_ZONE, GLOW_OUTER_SIZE, GLOW_OUTER_SCALE_X, GLOW_MIDDLE_SIZE, GLOW_MIDDLE_SCALE_X, GLOW_INNER_SIZE, GLOW_INNER_SCALE_X, GLOW_CORE_SIZE, GLOW_CORE_SCALE_X, GLOW_RIM_SIZE_Y, GLOW_RIM_SCALE_X };
}
