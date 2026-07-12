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

function assertRect(rect, label) {
  if (
    !rect
    || !Number.isFinite(rect.x)
    || !Number.isFinite(rect.y)
    || !Number.isFinite(rect.width)
    || !Number.isFinite(rect.height)
    || rect.width <= 0
    || rect.height <= 0
  ) {
    throw new Error(`${label} has invalid rectangle geometry`);
  }
}

function intersectRects(first, second) {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  if (right <= left || bottom <= top) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function subtractRect(subject, overlay) {
  const intersection = intersectRects(subject, overlay);
  if (!intersection) return [subject];

  const subjectRight = subject.x + subject.width;
  const subjectBottom = subject.y + subject.height;
  const intersectionRight = intersection.x + intersection.width;
  const intersectionBottom = intersection.y + intersection.height;
  return [
    {
      x: subject.x,
      y: subject.y,
      width: subject.width,
      height: intersection.y - subject.y,
    },
    {
      x: subject.x,
      y: intersectionBottom,
      width: subject.width,
      height: subjectBottom - intersectionBottom,
    },
    {
      x: subject.x,
      y: intersection.y,
      width: intersection.x - subject.x,
      height: intersection.height,
    },
    {
      x: intersectionRight,
      y: intersection.y,
      width: subjectRight - intersectionRight,
      height: intersection.height,
    },
  ].filter(piece => piece.width > 0 && piece.height > 0);
}

export function measureUnoccludedVisibleArea(subject, viewport, overlays = []) {
  assertRect(subject, 'subject');
  assertRect(viewport, 'viewport');
  for (const overlay of overlays) {
    assertRect(overlay, overlay.label ?? 'overlay');
  }

  const subjectArea = subject.width * subject.height;
  const viewportIntersection = intersectRects(subject, viewport);
  const viewportArea = viewportIntersection
    ? viewportIntersection.width * viewportIntersection.height
    : 0;
  let visiblePieces = viewportIntersection ? [viewportIntersection] : [];
  for (const overlay of overlays) {
    visiblePieces = visiblePieces.flatMap(piece => subtractRect(piece, overlay));
  }
  const visibleArea = visiblePieces.reduce(
    (sum, piece) => sum + piece.width * piece.height,
    0
  );
  const occludedBy = overlays.flatMap(overlay => {
    if (!viewportIntersection) return [];
    const overlap = intersectRects(viewportIntersection, overlay);
    if (!overlap) return [];
    return [{
      label: overlay.label ?? 'overlay',
      overlapRatio: (overlap.width * overlap.height) / subjectArea,
    }];
  });

  return {
    subjectArea,
    viewportRatio: viewportArea / subjectArea,
    visibleArea,
    visibleRatio: visibleArea / subjectArea,
    occludedBy,
  };
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
    const diagnostics = missingLabels.map(label => {
      const metric = metricsByLabel.get(label);
      const visibleRatio = metric?.visibleRatio ?? 0;
      const viewportRatio = metric?.viewportRatio ?? 0;
      const occlusion = (metric?.occludedBy ?? [])
        .filter(item => item.overlapRatio > 0)
        .map(item => `${item.label}=${item.overlapRatio.toFixed(3)}`)
        .join(', ');
      return `${label}=${visibleRatio.toFixed(3)} `
        + `(viewport=${viewportRatio.toFixed(3)}`
        + `${occlusion ? `; occluded by ${occlusion}` : ''})`;
    });
    throw new Error(
      `House pan missing ${missingLabels.join(', ')}; `
      + `${diagnostics.join('; ')}; `
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

function assertVerticalRect(rect, label) {
  if (
    !rect
    || !Number.isFinite(rect.top)
    || !Number.isFinite(rect.bottom)
    || rect.bottom <= rect.top
  ) {
    throw new Error(`${label} has invalid vertical geometry`);
  }
}

function classifyVerticalPlacement(subject, header, lowerOverlay, clearance) {
  if (
    subject.top >= header.bottom + clearance
    && subject.bottom <= lowerOverlay.top - clearance
  ) {
    return 'clear';
  }
  if (
    subject.bottom <= header.bottom - clearance
    || (
      subject.top >= lowerOverlay.top + clearance
      && subject.bottom <= lowerOverlay.bottom - clearance
    )
  ) {
    return 'occluded';
  }
  return 'partial';
}

export function requireCoherentVerticalGroupPlacement(
  subjects,
  header,
  lowerOverlay,
  groupLabel,
  clearance = 2
) {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error(`${groupLabel} must contain at least one subject`);
  }
  assertVerticalRect(header, `${groupLabel} header`);
  assertVerticalRect(lowerOverlay, `${groupLabel} lower overlay`);
  if (header.bottom > lowerOverlay.top) {
    throw new Error(`${groupLabel} overlays are out of vertical order`);
  }
  for (const [index, subject] of subjects.entries()) {
    assertVerticalRect(subject, `${groupLabel} subject ${index + 1}`);
  }

  const placements = subjects.map(subject =>
    classifyVerticalPlacement(subject, header, lowerOverlay, clearance)
  );
  if (placements.every(placement => placement === 'clear')) return 'clear';
  if (placements.every(placement => placement === 'occluded')) {
    return 'occluded';
  }
  throw new Error(
    `${groupLabel} has mixed vertical visibility: ${placements.join(', ')}`
  );
}

export function getRequiredCoherentGroupUpwardShift(
  subjects,
  header,
  lowerOverlay,
  clearance = 2
) {
  const groupLabel = 'Locked-room text group';
  try {
    requireCoherentVerticalGroupPlacement(
      subjects,
      header,
      lowerOverlay,
      groupLabel,
      clearance
    );
    return 0;
  } catch (error) {
    if (!String(error).includes('mixed vertical visibility')) throw error;
  }

  const candidates = new Set([0]);
  for (const subject of subjects) {
    candidates.add(Math.max(
      0,
      subject.bottom - (header.bottom - clearance)
    ));
    candidates.add(Math.max(
      0,
      subject.bottom - (lowerOverlay.top - clearance)
    ));
  }
  const groupBottom = Math.max(...subjects.map(subject => subject.bottom));
  candidates.add(Math.max(
    0,
    groupBottom - (header.bottom - clearance)
  ));

  for (const correction of [...candidates].sort((first, second) => first - second)) {
    if (correction === 0) continue;
    const shifted = subjects.map(subject => ({
      top: subject.top - correction,
      bottom: subject.bottom - correction,
    }));
    try {
      requireCoherentVerticalGroupPlacement(
        shifted,
        header,
        lowerOverlay,
        groupLabel,
        clearance
      );
      return correction;
    } catch (error) {
      if (!String(error).includes('mixed vertical visibility')) throw error;
    }
  }
  throw new Error('Locked-room text group has no safe upward correction');
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
