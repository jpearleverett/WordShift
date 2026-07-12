import path from 'node:path';

export const APPROVED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'flawless-victory',
  'home-dusk',
  'home-storm',
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
    if (
      !Number.isInteger(item.uneaseLevel)
      || item.uneaseLevel < 1
      || item.uneaseLevel > APPROVED_SCENARIOS.length
    ) {
      throw new Error(
        `${item.scenario}: unease level must be an integer from 1 to `
        + APPROVED_SCENARIOS.length
      );
    }
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
      'Campaign unease levels must strictly increase as 1, 2, 3, 4, 5, 6, 7, 8'
    );
  }

  return campaign;
}
