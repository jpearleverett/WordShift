function rect(left, top, width, height, name) {
  return Object.freeze({
    ...(name ? { name } : {}),
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
}

function cue({
  name,
  minLevel,
  contentKind,
  bounds,
  paintRects = [bounds],
  nodes,
}) {
  return Object.freeze({
    name,
    minLevel,
    contentKind,
    bounds,
    paintRects: Object.freeze(paintRects),
    ...(nodes ? { nodes: Object.freeze(nodes) } : {}),
  });
}

function metricBounds({
  minChangedFraction,
  minVisibilityScore,
  maxChangedFraction,
  maxVisibilityScore,
}) {
  return Object.freeze({
    minChangedFraction,
    minVisibilityScore,
    maxChangedFraction,
    maxVisibilityScore,
  });
}

function visibilityProfile({ name, level, final, thumbnail }) {
  return Object.freeze({
    name,
    level,
    final: metricBounds(final),
    thumbnail: metricBounds(thumbnail),
  });
}

const FRAME_GRAIN_BOUNDS = rect(25.5, 90, 381, 668);
const MODE_THREAD_BOUNDS = rect(154, 359, 11, 323);

export const MODE_THREAD_ICON_TARGETS = Object.freeze([
  Object.freeze({ x: 165, y: 368 }),
  Object.freeze({ x: 165, y: 439 }),
  Object.freeze({ x: 165, y: 496 }),
  Object.freeze({ x: 165, y: 550 }),
  Object.freeze({ x: 165, y: 616 }),
  Object.freeze({ x: 165, y: 673 }),
]);

const MODE_THREAD_PAINT_RECTS = Object.freeze([
  rect(155, 367, 2, 307),
  ...MODE_THREAD_ICON_TARGETS.map(target =>
    rect(156, target.y - 1, target.x - 156, 2)
  ),
]);

export const UNEASE_CUE_REGISTRY = Object.freeze([
  cue({
    name: 'crimson-glint',
    minLevel: 1,
    contentKind: 'empty',
    bounds: rect(43.5, 90, 58, 2),
  }),
  cue({
    name: 'frame-grain',
    minLevel: 1,
    contentKind: 'empty',
    bounds: FRAME_GRAIN_BOUNDS,
    paintRects: [
      rect(25.5, 90, 381, 6),
      rect(25.5, 752, 381, 6),
      rect(25.5, 90, 6, 668),
      rect(400.5, 90, 6, 668),
    ],
  }),
  cue({
    name: 'title-sigil',
    minLevel: 2,
    contentKind: 'empty',
    bounds: rect(192, 89, 48, 6),
  }),
  cue({
    name: 'distant-eyes',
    minLevel: 3,
    contentKind: 'eyes',
    bounds: rect(360, 196, 32, 10),
  }),
  cue({
    name: 'portrait-echo',
    minLevel: 4,
    contentKind: 'source-echo',
    bounds: rect(49.5, 551, 76, 120),
  }),
  cue({
    name: 'mode-thread',
    minLevel: 5,
    contentKind: 'mode-thread',
    bounds: MODE_THREAD_BOUNDS,
    paintRects: MODE_THREAD_PAINT_RECTS,
    nodes: MODE_THREAD_ICON_TARGETS,
  }),
  cue({
    name: 'reward-glow',
    minLevel: 6,
    contentKind: 'empty',
    bounds: rect(141.5, 531, 155, 122),
  }),
  cue({
    name: 'dusk-vignette',
    minLevel: 7,
    contentKind: 'empty',
    bounds: rect(31.5, 96, 369, 656),
  }),
  cue({
    name: 'watching-eyes',
    minLevel: 7,
    contentKind: 'eyes',
    bounds: rect(346, 88.5, 34, 7),
  }),
]);

export const PROTECTED_COMPOSITION_REGIONS = Object.freeze({
  modeMenu: Object.freeze([
    rect(160, 296, 200, 48, 'difficulty-control'),
    rect(180, 345, 180, 361, 'variant-copy-and-controls'),
    ...MODE_THREAD_ICON_TARGETS.map((target, index) =>
      rect(166, target.y - 9, 13, 18, `mode-icon-${index + 1}`)
    ),
  ]),
});

export const TASK4_REAUDIT_LEVELS = Object.freeze([6, 7]);

// Floors are deliberately below the 2026-07-12 reference renders:
// thumbnail scores low=0.001245, mid=0.001829, high=0.006338.
// They catch materially faded cues while leaving headroom for source-image and
// browser rasterization differences. Existing area/score caps remain intact.
export const UNEASE_VISIBILITY_PROFILES = Object.freeze([
  visibilityProfile({
    name: 'low',
    level: 1,
    final: {
      minChangedFraction: 0.00035,
      minVisibilityScore: 0.00001,
      maxChangedFraction: 0.06,
      maxVisibilityScore: 0.05,
    },
    thumbnail: {
      minChangedFraction: 0.008,
      minVisibilityScore: 0.0006,
      maxChangedFraction: 0.08,
      maxVisibilityScore: 0.05,
    },
  }),
  visibilityProfile({
    name: 'mid',
    level: 4,
    final: {
      minChangedFraction: 0.006,
      minVisibilityScore: 0.0002,
      maxChangedFraction: 0.12,
      maxVisibilityScore: 0.05,
    },
    thumbnail: {
      minChangedFraction: 0.018,
      minVisibilityScore: 0.001,
      maxChangedFraction: 0.15,
      maxVisibilityScore: 0.05,
    },
  }),
  visibilityProfile({
    name: 'high',
    level: 7,
    final: {
      minChangedFraction: 0.09,
      minVisibilityScore: 0.0024,
      maxChangedFraction: 0.42,
      maxVisibilityScore: 0.05,
    },
    thumbnail: {
      minChangedFraction: 0.09,
      minVisibilityScore: 0.003,
      maxChangedFraction: 0.45,
      maxVisibilityScore: 0.05,
    },
  }),
]);

export function validateUneaseLevel(uneaseLevel, scenario = 'campaign item') {
  if (
    !Number.isInteger(uneaseLevel)
    || uneaseLevel < 1
    || uneaseLevel > 7
  ) {
    throw new Error(
      `${scenario}: unease level must be an integer from 1 to 7`
    );
  }
}

export function getUneaseVisibilityProfile(uneaseLevel, scenario) {
  validateUneaseLevel(uneaseLevel, scenario);
  return UNEASE_VISIBILITY_PROFILES.findLast(
    profile => profile.level <= uneaseLevel
  );
}

export function validateUneaseVisibilityMetrics({
  scenario = 'campaign item',
  level,
  final,
  thumbnail,
}) {
  const profile = getUneaseVisibilityProfile(level, scenario);
  for (const [size, metrics] of Object.entries({ final, thumbnail })) {
    const bounds = profile[size];
    for (const [metricName, label] of [
      ['changedFraction', 'changed fraction'],
      ['visibilityScore', 'visibility score'],
    ]) {
      const value = metrics?.[metricName];
      const capitalized = metricName[0].toUpperCase() + metricName.slice(1);
      const minimum = bounds[`min${capitalized}`];
      const maximum = bounds[`max${capitalized}`];
      if (!Number.isFinite(value)) {
        throw new Error(`${scenario}: ${size} ${label} is not finite`);
      }
      if (value < minimum) {
        throw new Error(
          `${scenario}: ${size} ${label} ${value} is below ${minimum}`
        );
      }
      if (value > maximum) {
        throw new Error(
          `${scenario}: ${size} ${label} ${value} exceeds ${maximum}`
        );
      }
    }
  }
  return profile;
}

export function getActiveUneaseCues(uneaseLevel, scenario) {
  validateUneaseLevel(uneaseLevel, scenario);
  return UNEASE_CUE_REGISTRY.filter(cueDefinition =>
    cueDefinition.minLevel <= uneaseLevel
  );
}

export function cueGeometryCss() {
  return UNEASE_CUE_REGISTRY.map(({ name, bounds }) => `
      .cue-${name} {
        top: ${bounds.top}px;
        left: ${bounds.left}px;
        width: ${bounds.width}px;
        height: ${bounds.height}px;
      }`).join('');
}

export function rectanglesOverlap(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}
