import path from 'node:path';
import { validateUneaseLevel } from './playStoreUnease.mjs';

export const APPROVED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'flawless-victory',
  'home-dusk',
];

export const CAMPAIGN_THEMES = new Set(['bright', 'dusk', 'mystery']);

export function isSafePngBasename(filename) {
  return typeof filename === 'string'
    && path.basename(filename) === filename
    && !filename.includes('\\')
    && path.extname(filename) === '.png'
    && path.basename(filename, '.png').length > 0;
}

export function isAllowedCaptureRequest(urlString) {
  if (urlString.startsWith('data:') || urlString.startsWith('blob:')) {
    return true;
  }
  try {
    const { hostname, protocol } = new URL(urlString);
    return (protocol === 'http:' || protocol === 'https:')
      && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getValidDropZoneLabelMatcher(position, formedWord) {
  const escapedWord = escapeRegExp(formedWord);
  return new RegExp(
    `^(?:Drop|Guided drop) zone ${position}`
    + `(?: of \\d+, forms ${escapedWord}, valid word)?$`
  );
}

export function requireAllVisibleCompanions(
  metrics,
  requiredLabels,
  minimumVisibleRatio
) {
  const metricsByLabel = new Map(metrics.map(metric => [metric.label, metric]));
  const visibleLabels = requiredLabels.filter(label =>
    (metricsByLabel.get(label)?.visibleRatio ?? 0) >= minimumVisibleRatio
  );
  const missingLabels = requiredLabels.filter(label =>
    !visibleLabels.includes(label)
  );
  if (missingLabels.length > 0) {
    throw new Error(
      `House pan missing ${missingLabels.join(', ')}; `
      + `${visibleLabels.length}/${requiredLabels.length} companions visible `
      + `at ratio ${minimumVisibleRatio}`
    );
  }
  return visibleLabels;
}

export function requireNoPartialVerticalOcclusion(
  subject,
  overlay,
  subjectLabel,
  clearance = 2
) {
  for (const [name, rect] of [['subject', subject], ['overlay', overlay]]) {
    if (
      !rect
      || !Number.isFinite(rect.top)
      || !Number.isFinite(rect.bottom)
      || rect.bottom <= rect.top
    ) {
      throw new Error(`${subjectLabel} has invalid ${name} geometry`);
    }
  }

  if (
    subject.bottom <= overlay.top - clearance
    || subject.top >= overlay.bottom + clearance
  ) {
    return 'clear';
  }
  if (
    subject.top >= overlay.top + clearance
    && subject.bottom <= overlay.bottom - clearance
  ) {
    return 'occluded';
  }
  throw new Error(
    `${subjectLabel} partially overlaps the Next Unlock bar: `
    + `line ${subject.top}-${subject.bottom}, bar ${overlay.top}-${overlay.bottom}`
  );
}

export function summarizeRgbaDiff(first, second) {
  if (
    first?.width !== second?.width
    || first?.height !== second?.height
    || first?.data?.length !== second?.data?.length
  ) {
    throw new Error('RGBA images must have identical dimensions and data lengths');
  }

  const { width, height } = first;
  const changed = new Uint8Array(width * height);
  let differentPixels = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let pixel = 0; pixel < changed.length; pixel += 1) {
    const offset = pixel * 4;
    if (
      first.data[offset] === second.data[offset]
      && first.data[offset + 1] === second.data[offset + 1]
      && first.data[offset + 2] === second.data[offset + 2]
      && first.data[offset + 3] === second.data[offset + 3]
    ) {
      continue;
    }
    changed[pixel] = 1;
    differentPixels += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  if (differentPixels === 0) {
    return { differentPixels: 0, bounds: null, components: [] };
  }

  const queue = new Int32Array(width * height);
  const components = [];
  for (let start = 0; start < changed.length; start += 1) {
    if (changed[start] !== 1) continue;
    let read = 0;
    let write = 1;
    queue[0] = start;
    changed[start] = 2;
    let componentPixels = 0;
    let componentLeft = width;
    let componentTop = height;
    let componentRight = -1;
    let componentBottom = -1;

    while (read < write) {
      const pixel = queue[read++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      componentPixels += 1;
      componentLeft = Math.min(componentLeft, x);
      componentTop = Math.min(componentTop, y);
      componentRight = Math.max(componentRight, x);
      componentBottom = Math.max(componentBottom, y);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (changed[neighbor] !== 1) continue;
          changed[neighbor] = 2;
          queue[write++] = neighbor;
        }
      }
    }

    components.push({
      pixels: componentPixels,
      left: componentLeft,
      top: componentTop,
      right: componentRight,
      bottom: componentBottom,
    });
  }

  components.sort((a, b) =>
    b.pixels - a.pixels
    || a.top - b.top
    || a.left - b.left
  );
  return {
    differentPixels,
    bounds: { left, top, right, bottom },
    components,
  };
}

export function validateCampaign(campaign) {
  if (!Array.isArray(campaign) || campaign.length !== APPROVED_SCENARIOS.length) {
    throw new Error(
      `Campaign must contain exactly ${APPROVED_SCENARIOS.length} scenarios`
    );
  }

  const actualScenarios = campaign.map(item => item?.scenario);
  if (actualScenarios.some((scenario, index) => scenario !== APPROVED_SCENARIOS[index])) {
    throw new Error(
      `Campaign scenarios are out of order: ${actualScenarios.join(', ')}`
    );
  }

  const sourceNames = new Set();
  const finalNames = new Set();
  for (const item of campaign) {
    for (const field of ['source', 'final', 'headline', 'support', 'altText', 'theme']) {
      if (typeof item[field] !== 'string' || item[field].trim().length === 0) {
        throw new Error(`${item.scenario}: campaign field "${field}" is missing`);
      }
    }
    validateUneaseLevel(item.uneaseLevel, item.scenario);
    if (!isSafePngBasename(item.source)) {
      throw new Error(`${item.scenario}: invalid source filename "${item.source}"`);
    }
    if (!isSafePngBasename(item.final)) {
      throw new Error(`${item.scenario}: invalid final filename "${item.final}"`);
    }
    if (!CAMPAIGN_THEMES.has(item.theme)) {
      throw new Error(`${item.scenario}: invalid theme "${item.theme}"`);
    }
    if (sourceNames.has(item.source) || finalNames.has(item.final)) {
      throw new Error(`${item.scenario}: campaign filenames must be unique`);
    }
    sourceNames.add(item.source);
    finalNames.add(item.final);
  }

  const uneaseLevels = campaign.map(item => item.uneaseLevel);
  if (uneaseLevels.some((level, index) => level !== index + 1)) {
    throw new Error(
      'Campaign unease levels must strictly increase as 1, 2, 3, 4, 5, 6, 7'
    );
  }

  return campaign;
}
