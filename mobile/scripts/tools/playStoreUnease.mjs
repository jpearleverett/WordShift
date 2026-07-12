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
}) {
  return Object.freeze({
    name,
    minLevel,
    contentKind,
    bounds,
    paintRects: Object.freeze(paintRects),
  });
}

const FRAME_GRAIN_BOUNDS = rect(25.5, 90, 381, 668);

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
    contentKind: 'empty',
    bounds: rect(369, 292, 2, 410),
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
    rect(160, 345, 200, 361, 'variant-copy-and-controls'),
  ]),
});

export const TASK4_REAUDIT_LEVELS = Object.freeze([6, 7]);

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
