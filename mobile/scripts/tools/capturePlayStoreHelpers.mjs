import path from 'node:path';

export const APPROVED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'daily',
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

  return campaign;
}
