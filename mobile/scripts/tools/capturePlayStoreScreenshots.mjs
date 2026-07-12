import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createConnection } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import {
  getValidDropZoneLabelMatcher,
  getRequiredGroupUpwardShiftForVerticalClearance,
  isAllowedCaptureRequest,
  measureUnoccludedVisibleArea,
  requireAllVisibleCompanions,
  requireNoPartialVerticalOcclusion,
  validateCampaign,
} from './capturePlayStoreHelpers.mjs';
import { withStagedPublication } from './composePlayStoreScreenshots.mjs';
import { validateSourceAssets } from './validatePlayStoreAssets.mjs';

const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const REPO_ROOT = path.resolve(MOBILE_DIR, '..');
const CAMPAIGN_PATH = path.join(REPO_ROOT, 'docs/play-store/campaign.json');
const SOURCE_DIR = path.join(REPO_ROOT, 'docs/play-store/source');
const DEBUG_DIR = path.join(MOBILE_DIR, '.cache/play-store-capture');

const VIEWPORT = { width: 432, height: 768 };
const DEVICE_SCALE_FACTOR = 2.5;
const EXPECTED_DIMENSIONS = { width: 1080, height: 1920 };
const BASE_URL = 'http://127.0.0.1:8091';
const EXPO_HOST = '127.0.0.1';
const EXPO_PORT = 8091;
const HOME_PAN_ACTIVATION_DISTANCE = 10;
const HOME_PAN_MAX_ATTEMPTS = 5;
const HOME_SIGNAGE_ASSERTION_CLEARANCE = 0.5;
const HOME_SIGNAGE_TARGET_CLEARANCE = 1;

function describeError(error) {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

async function loadCampaign() {
  let campaign;
  try {
    campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));
  } catch (error) {
    throw new Error(
      `Cannot read campaign manifest at ${CAMPAIGN_PATH}: ${describeError(error)}`
    );
  }

  await fs.access(path.join(MOBILE_DIR, 'package.json'));
  await fs.access(path.dirname(CAMPAIGN_PATH));
  return validateCampaign(campaign);
}

async function assertCapturePortAvailable() {
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: EXPO_HOST, port: EXPO_PORT });
    let settled = false;
    const settle = callback => {
      if (settled) return;
      settled = true;
      socket.destroy();
      callback();
    };

    socket.setTimeout(2_000);
    socket.once('connect', () => settle(() => reject(new Error(
      `Port ${EXPO_PORT} already has a listener; stop it before running capture`
    ))));
    socket.once('timeout', () => settle(() => reject(new Error(
      `Timed out while checking whether port ${EXPO_PORT} is available`
    ))));
    socket.once('error', error => settle(() => {
      if (error?.code === 'ECONNREFUSED') {
        resolve();
      } else {
        reject(new Error(
          `Cannot verify port ${EXPO_PORT} is available: ${describeError(error)}`
        ));
      }
    }));
  });
}

async function canReuseCaptureServer(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, expoChild, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (expoChild.exitCode !== null || expoChild.signalCode !== null) {
      throw new Error(
        `Expo exited (${expoChild.exitCode ?? expoChild.signalCode}) before ${url} became ready`
      );
    }
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok) return;
    } catch {
      // The server is still starting. The next poll will retry.
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error(`Expo web server did not become ready within ${timeoutMs}ms`);
}

function startExpo(logLines) {
  const expoChild = spawn(
    'npx',
    ['expo', 'start', '--web', '--port', '8091'],
    {
      cwd: MOBILE_DIR,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        BROWSER: 'none',
        CI: '1',
        EXPO_NO_INTERACTIVE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  const recordOutput = chunk => {
    const lines = String(chunk).split(/\r?\n/).filter(Boolean);
    logLines.push(...lines);
    if (logLines.length > 60) logLines.splice(0, logLines.length - 60);
  };
  expoChild.stdout.on('data', recordOutput);
  expoChild.stderr.on('data', recordOutput);
  return expoChild;
}

function signalExpoProcessGroup(expoGroupId, expoChild, signal) {
  try {
    if (process.platform === 'win32') {
      return expoChild?.kill(signal) ?? false;
    }
    process.kill(-expoGroupId, signal);
    return true;
  } catch (error) {
    if (error?.code !== 'ESRCH') throw error;
    return false;
  }
}

function isExpoProcessGroupRunning(expoGroupId, expoChild) {
  if (!expoGroupId) return false;
  if (process.platform === 'win32') {
    return expoChild?.exitCode === null && expoChild?.signalCode === null;
  }
  try {
    process.kill(-expoGroupId, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
}

async function waitForExpoProcessGroupExit(expoGroupId, expoChild, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isExpoProcessGroupRunning(expoGroupId, expoChild)) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return !isExpoProcessGroupRunning(expoGroupId, expoChild);
}

async function stopExpoProcessGroup(expoGroupId, expoChild) {
  if (!expoGroupId || !isExpoProcessGroupRunning(expoGroupId, expoChild)) return;

  signalExpoProcessGroup(expoGroupId, expoChild, 'SIGTERM');
  if (await waitForExpoProcessGroupExit(expoGroupId, expoChild, 5_000)) return;

  signalExpoProcessGroup(expoGroupId, expoChild, 'SIGKILL');
  if (!await waitForExpoProcessGroupExit(expoGroupId, expoChild, 5_000)) {
    throw new Error(`Expo process group ${expoGroupId} survived SIGKILL`);
  }
}

async function waitForDocumentReadiness(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;

    const imageFailures = [];
    await Promise.all(Array.from(document.images).map(async (image, index) => {
      const source = image.currentSrc || image.src || `image ${index + 1}`;
      if (!image.complete) {
        await new Promise(resolve => {
          let settled = false;
          const finish = failure => {
            if (settled) return;
            settled = true;
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
            if (failure) imageFailures.push(failure);
            resolve();
          };
          const handleLoad = () => finish();
          const handleError = () => finish(`${source} failed to load`);
          image.addEventListener('load', handleLoad, { once: true });
          image.addEventListener('error', handleError, { once: true });
          if (image.complete) {
            finish(image.naturalWidth === 0 ? `${source} failed to load` : undefined);
          }
        });
      }
      if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        imageFailures.push(`${source} has no decoded dimensions`);
        return;
      }
      if (typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch (error) {
          imageFailures.push(
            `${source} failed to decode: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }));

    if (imageFailures.length > 0) {
      throw new Error(`Broken document images: ${imageFailures.join(' | ')}`);
    }

    await new Promise((resolve, reject) => {
      let previousSnapshot = '';
      let stableFrameCount = 0;
      let frameCount = 0;
      const sampleFrame = () => {
        const snapshot = [
          document.documentElement.scrollWidth,
          document.documentElement.scrollHeight,
          document.body?.scrollWidth ?? 0,
          document.body?.scrollHeight ?? 0,
          document.images.length,
          document.fonts.status,
        ].join(':');
        stableFrameCount = snapshot === previousSnapshot ? stableFrameCount + 1 : 0;
        previousSnapshot = snapshot;
        frameCount += 1;
        if (stableFrameCount >= 2) {
          resolve();
        } else if (frameCount >= 120) {
          reject(new Error('Document layout did not stabilize within 120 frames'));
        } else {
          requestAnimationFrame(sampleFrame);
        }
      };
      requestAnimationFrame(sampleFrame);
    });
  });
}

async function waitForScreenTransition(page) {
  const overlay = page.getByTestId('screen-transition-overlay');
  await overlay.waitFor({ state: 'attached' });
  const handle = await overlay.elementHandle();
  if (!handle) throw new Error('Screen transition overlay is not attached');
  await page.waitForFunction(
    element => Number.parseFloat(getComputedStyle(element).opacity) <= 0.001,
    handle
  );
}

async function waitForHome(page) {
  await page.getByLabel('Play puzzle', { exact: true }).waitFor();
  await page.getByLabel('Ember the fox', { exact: true }).waitFor();
}

async function clickPlayPuzzle(page) {
  const playButton = page.getByLabel('Play puzzle', { exact: true });
  await playButton.waitFor();
  // JuicyButton intentionally pulses forever, so it can never satisfy
  // Playwright's geometric-stability check even after the home state is ready.
  await playButton.click({ force: true });
}

async function enableVictoryAnimation(page) {
  await waitForHome(page);
  await page.getByLabel('Open utility menu', { exact: true }).click();
  await page.getByLabel('Open settings', { exact: true }).click();
  const reducedMotion = page.getByRole('switch', {
    name: 'Reduced motion',
    checked: true,
  });
  await reducedMotion.click();
  await page.waitForFunction(() => {
    const input = document.querySelector(
      'input[role="switch"][aria-label="Reduced motion"]'
    );
    return input instanceof HTMLInputElement && !input.checked;
  });
  await page.getByLabel('Back to home', { exact: true }).click();
  await waitForHome(page);
}

function getActiveLetter(page, letter) {
  const activeRow = page
    .getByLabel('Pick a letter from this row', { exact: true })
    .locator('..');
  // DraggableTile renders its real control as a button and also renders
  // labelled visual clones. Scope to the active row and semantic button so
  // the selector identifies the actual production control, not a clone.
  return activeRow.locator(`button[aria-label="Letter ${letter}"]`);
}

async function resetPuzzleScrollPosition(page, rowCount) {
  const scrollArea = page.getByLabel(
    `Puzzle with ${rowCount} word rows`,
    { exact: true }
  );
  const handle = await scrollArea.elementHandle();
  if (!handle) throw new Error('Puzzle scroll area is not attached');
  await scrollArea.evaluate(element => {
    element.scrollTop = 0;
  });
  await page.waitForFunction(
    element => Math.abs(element.scrollTop) < 0.5,
    handle
  );
}

const HOME_COMPANION_LABELS = [
  'Ember the fox',
  'Panko the pangolin',
  'Archimedes the owl',
  'Axel the axolotl',
];
const HOME_CAPTURE_FIXTURES = Object.freeze({
  'home-sunny': { amber: 180 },
  'home-storm': { amber: 420 },
});
const HOME_GEOMETRY_TEST_IDS = [
  'home-world-pan-surface',
  'home-header',
  'home-next-unlock-sign',
  'home-play-dock',
  'home-ambient-line',
];

function boxesOverlap(first, second, tolerance = 0.5) {
  return first.x < second.x + second.width - tolerance
    && first.x + first.width > second.x + tolerance
    && first.y < second.y + second.height - tolerance
    && first.y + first.height > second.y + tolerance;
}

async function assertHomeChromeGeometry(page, scenario) {
  const elements = [
    {
      label: 'amber header',
      locator: page.getByLabel(/^\d+ amber\. Opens the store\.$/).first(),
    },
    {
      label: 'utility header',
      locator: page.getByLabel('Open utility menu', { exact: true }),
    },
    {
      label: 'Next Unlock sign',
      locator: page.getByLabel(/^Next unlock\./).first(),
    },
    {
      label: 'PLAY dock',
      locator: page.getByLabel('Play puzzle', { exact: true }),
    },
  ];
  await Promise.all(elements.map(({ locator }) =>
    locator.waitFor({ state: 'visible' })
  ));
  const boxes = await Promise.all(elements.map(({ locator }) => locator.boundingBox()));
  const viewport = page.viewportSize();
  if (!viewport || boxes.some(box => !box)) {
    throw new Error(`Cannot measure ${scenario} home chrome`);
  }

  for (const [index, box] of boxes.entries()) {
    const { label } = elements[index];
    if (
      box.x < 0
      || box.y < 0
      || box.x + box.width > viewport.width
      || box.y + box.height > viewport.height
    ) {
      throw new Error(
        `${scenario} ${label} is outside the viewport: ${JSON.stringify(box)}`
      );
    }
  }

  for (const [firstIndex, secondIndex] of [
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 3],
  ]) {
    if (boxesOverlap(boxes[firstIndex], boxes[secondIndex])) {
      throw new Error(
        `${scenario} ${elements[firstIndex].label} overlaps `
        + `${elements[secondIndex].label}`
      );
    }
  }
  console.log(`[capture] ${scenario}: header, signage, and PLAY dock are clear`);
}

async function getHomeOverlayRects(page) {
  const candidates = [
    { label: 'header', testId: 'home-header', required: true },
    {
      label: 'Next Unlock sign',
      testId: 'home-next-unlock-sign',
      required: true,
    },
    { label: 'ambient line', testId: 'home-ambient-line', required: false },
    { label: 'PLAY dock', testId: 'home-play-dock', required: true },
  ];
  const overlays = [];
  for (const candidate of candidates) {
    const locator = page.getByTestId(candidate.testId);
    if (await locator.count() === 0) {
      if (candidate.required) {
        throw new Error(`Missing ${candidate.label} geometry hook`);
      }
      continue;
    }
    if (candidate.testId === 'home-ambient-line') {
      const opacity = await locator.evaluate(element =>
        Number.parseFloat(getComputedStyle(element).opacity)
      );
      if (opacity <= 0.001) continue;
    }
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(`Cannot measure ${candidate.label} overlay`);
    }
    overlays.push({ label: candidate.label, ...box });
  }
  return overlays;
}

async function getCompanionViewportMetrics(page, overlays) {
  const viewportSize = page.viewportSize();
  if (!viewportSize) throw new Error('Capture viewport is unavailable');
  const viewport = { x: 0, y: 0, ...viewportSize };
  return Promise.all(HOME_COMPANION_LABELS.map(async label => {
    const locator = page.getByLabel(label, { exact: true });
    await locator.waitFor({ state: 'attached' });
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(`Cannot measure companion ${label}`);
    }
    return {
      label,
      rect: box,
      top: Math.round(box.y),
      bottom: Math.round(box.y + box.height),
      ...measureUnoccludedVisibleArea(box, viewport, overlays),
    };
  }));
}

async function waitForStableHomeGeometry(page) {
  await page.evaluate(async ({ companionLabels, testIds }) => {
    const stableFrameTarget = 3;
    const frameTolerance = 0.25;
    const maxFrames = 120;
    const requiredTestIds = new Set(testIds.filter(
      testId => testId !== 'home-ambient-line'
    ));
    const readRect = element => {
      const rect = element.getBoundingClientRect();
      return [
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        Number.parseFloat(getComputedStyle(element).opacity),
      ];
    };
    const readSnapshot = () => {
      const snapshot = [];
      const labelled = Array.from(document.querySelectorAll('[aria-label]'));
      for (const label of companionLabels) {
        const element = labelled.find(candidate =>
          candidate.getAttribute('aria-label') === label
        );
        if (!element) return null;
        snapshot.push([`label:${label}`, ...readRect(element)]);
      }
      for (const testId of testIds) {
        const element = document.querySelector(`[data-testid="${testId}"]`);
        if (!element) {
          if (requiredTestIds.has(testId)) return null;
          continue;
        }
        snapshot.push([`testid:${testId}`, ...readRect(element)]);
      }
      return snapshot;
    };
    const matches = (first, second) =>
      first !== null
      && second !== null
      && first.length === second.length
      && first.every((entry, index) =>
        entry[0] === second[index][0]
        && entry.slice(1).every((value, valueIndex) =>
          Math.abs(value - second[index][valueIndex + 1]) <= frameTolerance
        )
      );

    let previousSnapshot = null;
    let stableFrameCount = 0;
    for (let frame = 0; frame < maxFrames; frame += 1) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const snapshot = readSnapshot();
      stableFrameCount = matches(previousSnapshot, snapshot)
        ? stableFrameCount + 1
        : 0;
      if (stableFrameCount >= stableFrameTarget) return;
      previousSnapshot = snapshot;
    }
    throw new Error(
      `Home geometry did not remain stable for ${stableFrameTarget} animation frames`
    );
  }, {
    companionLabels: HOME_COMPANION_LABELS,
    testIds: HOME_GEOMETRY_TEST_IDS,
  });
}

async function confirmAmbientCaptureState(page) {
  await page.waitForFunction(testId => {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    if (!element || !(element.textContent ?? '').trim()) return false;
    const opacity = Number.parseFloat(getComputedStyle(element).opacity);
    return opacity >= 0.999;
  }, 'home-ambient-line', { timeout: 10_000 });
  console.log('[capture] home ambient line reached deterministic visible state');
}

async function waitForAmbientOverlaySettled(page) {
  await page.waitForFunction(testId => {
    const element = document.querySelector(`[data-testid="${testId}"]`);
    const detached = element === null;
    const opacity = detached
      ? 0
      : Number.parseFloat(getComputedStyle(element).opacity);
    return detached || opacity <= 0.001;
  }, 'home-ambient-line', { timeout: 7_000 });
}

async function measureHomeLockedRoomGeometry(page, scenario, amber) {
  const nextUnlockBar = page.getByLabel(/^Next unlock\./).first();
  const lockedRoom = page.getByLabel(
    'Build Jungle Hammock for 200 amber',
    { exact: true }
  );
  const affordabilityLine = amber >= 200
    ? 'Tap to build this room'
    : `${amber} / 200`;
  const lockedRoomLines = [
    {
      label: 'Jungle Hammock',
      locator: lockedRoom.getByText('Jungle Hammock', { exact: true }).first(),
    },
    { label: 'Build: 200', locator: lockedRoom.getByText(/^Build:/).first() },
    {
      label: affordabilityLine,
      locator: lockedRoom.getByText(affordabilityLine, { exact: true }).first(),
    },
  ];
  await Promise.all([
    nextUnlockBar.waitFor({ state: 'visible' }),
    ...lockedRoomLines.map(({ locator }) =>
      locator.waitFor({ state: 'attached' })
    ),
  ]);
  const [barBox, ...lineBoxes] = await Promise.all([
    nextUnlockBar.boundingBox(),
    ...lockedRoomLines.map(({ locator }) => locator.boundingBox()),
  ]);
  if (!barBox || lineBoxes.some(lineBox => !lineBox)) {
    throw new Error(
      `Cannot measure ${scenario} Next Unlock and locked-room geometry`
    );
  }
  return { barBox, lineBoxes, lockedRoomLines };
}

async function assertHomeLockedRoomGeometry(page, scenario, amber) {
  const {
    barBox,
    lineBoxes,
    lockedRoomLines,
  } = await measureHomeLockedRoomGeometry(page, scenario, amber);
  for (const [index, lineBox] of lineBoxes.entries()) {
    const { label } = lockedRoomLines[index];
    const relationship = requireNoPartialVerticalOcclusion(
      { top: lineBox.y, bottom: lineBox.y + lineBox.height },
      { top: barBox.y, bottom: barBox.y + barBox.height },
      label,
      HOME_SIGNAGE_ASSERTION_CLEARANCE
    );
    console.log(`[capture] ${scenario}: ${label} is ${relationship}`);
  }
}

async function getHomeLockedRoomUpwardAdjustment(page, scenario, amber) {
  const {
    barBox,
    lineBoxes,
  } = await measureHomeLockedRoomGeometry(page, scenario, amber);
  return getRequiredGroupUpwardShiftForVerticalClearance(
    lineBoxes.map(lineBox => ({
      top: lineBox.y,
      bottom: lineBox.y + lineBox.height,
    })),
    { top: barBox.y, bottom: barBox.y + barBox.height },
    HOME_SIGNAGE_TARGET_CLEARANCE
  );
}

function getRequiredUpwardPanDistance(metrics, overlays, minimumVisibleRatio) {
  const playDock = overlays.find(overlay => overlay.label === 'PLAY dock');
  if (!playDock) throw new Error('PLAY dock overlay is unavailable');
  const lowestCompanion = metrics.reduce((lowest, metric) =>
    metric.rect.y > lowest.rect.y ? metric : lowest
  );
  const requiredVisibleHeight =
    lowestCompanion.rect.height * minimumVisibleRatio;
  return Math.max(
    20,
    lowestCompanion.rect.y + requiredVisibleHeight - playDock.y + 12
  );
}

async function dragHomePanSurface(page, requestedUpwardDistance) {
  const panSurface = page.getByTestId('home-world-pan-surface');
  await panSurface.waitFor({ state: 'visible' });
  const box = await panSurface.boundingBox();
  if (!box) throw new Error('Cannot measure HouseWorld pan surface');

  const dragX = box.x + Math.max(12, Math.min(28, box.width * 0.08));
  const dragStartY = box.y + box.height * 0.82;
  const upwardDistance = Math.min(
    requestedUpwardDistance + HOME_PAN_ACTIVATION_DISTANCE,
    box.height * 0.42
  );
  const dragEndY = dragStartY - upwardDistance;
  if (upwardDistance < 10 || dragEndY < box.y) {
    throw new Error(
      `HouseWorld pan surface cannot satisfy an upward drag of `
      + `${requestedUpwardDistance}: ${JSON.stringify(box)}`
    );
  }
  await page.mouse.move(dragX, dragStartY);
  await page.mouse.down();
  await page.mouse.move(dragX, dragEndY, { steps: 16 });
  await page.mouse.up();
}

async function panHouseToVisibleCompanions(page, scenario) {
  const fixture = HOME_CAPTURE_FIXTURES[scenario];
  if (!fixture) throw new Error(`Missing home capture fixture for ${scenario}`);
  await confirmAmbientCaptureState(page);

  let metrics = [];
  for (let attempt = 0; attempt < HOME_PAN_MAX_ATTEMPTS; attempt += 1) {
    await waitForStableHomeGeometry(page);
    const overlays = await getHomeOverlayRects(page);
    metrics = await getCompanionViewportMetrics(page, overlays);
    const visible = metrics.filter(item => item.visibleRatio >= 0.6);
    const signageAdjustment = await getHomeLockedRoomUpwardAdjustment(
      page,
      scenario,
      fixture.amber
    );
    if (
      visible.length === HOME_COMPANION_LABELS.length
      && signageAdjustment === 0
    ) {
      break;
    }

    // HouseWorld starts at its positive maxPanY to frame the roof. Dragging the
    // real RNGH pan surface upward reduces that state and reveals lower rooms.
    const companionAdjustment =
      visible.length === HOME_COMPANION_LABELS.length
        ? 0
        : getRequiredUpwardPanDistance(metrics, overlays, 0.6);
    const upwardDistance = Math.max(
      signageAdjustment,
      companionAdjustment
    );
    await dragHomePanSurface(page, upwardDistance);
    await waitForDocumentReadiness(page);
  }

  await waitForAmbientOverlaySettled(page);
  await waitForDocumentReadiness(page);
  await waitForStableHomeGeometry(page);
  const settledOverlays = await getHomeOverlayRects(page);
  metrics = await getCompanionViewportMetrics(page, settledOverlays);
  const labels = requireAllVisibleCompanions(
    metrics,
    HOME_COMPANION_LABELS,
    0.6
  );
  await assertHomeChromeGeometry(page, scenario);
  await assertHomeLockedRoomGeometry(page, scenario, fixture.amber);
  console.log(`[capture] ${scenario}: visible companions: ${labels.join(', ')}`);
  return labels;
}

async function prepareScenario(page, scenario) {
  switch (scenario) {
    case 'puzzle-preview':
      await clickPlayPuzzle(page);
      await getActiveLetter(page, 'L').waitFor();
      await page.getByText('✓ PLANT', { exact: true }).waitFor();
      return;

    case 'puzzle-chain':
      await clickPlayPuzzle(page);
      await page.getByLabel('Pick a letter from this row', { exact: true }).waitFor();
      await getActiveLetter(page, 'T').waitFor();
      await page.getByLabel('Letter L, locked', { exact: true }).waitFor();
      return;

    case 'home-sunny':
      await waitForHome(page);
      await panHouseToVisibleCompanions(page, 'home-sunny');
      return;

    case 'animal-dialogue':
      await waitForHome(page);
      await page.getByLabel('Ember the fox', { exact: true }).click();
      await page.getByLabel('Continue dialogue', { exact: true }).waitFor();
      return;

    case 'variant-menu':
      await clickPlayPuzzle(page);
      await page.getByLabel(/^Difficulty .+Tap to change puzzle setup$/).click();
      const advertisedModes = [
        { name: 'Standard', locator: page.getByLabel(/^Standard(?:,|$)/) },
        { name: 'Reverse Shift', locator: page.getByLabel(/^Reverse Shift(?:,|$)/) },
        { name: 'Speed Shift', locator: page.getByLabel(/^Speed Shift(?:,|$)/) },
        { name: 'Double Shift', locator: page.getByLabel(/^Double Shift(?:,|$)/) },
        { name: 'Challenge', locator: page.getByLabel(/^Challenge mode,/) },
        { name: 'Blind Mode', locator: page.getByLabel(/^Blind offering,/) },
      ];
      await Promise.all(advertisedModes.map(({ locator }) => locator.waitFor()));
      const blindOffering = page.getByLabel(/^Blind offering,/);
      const panelMetrics = await blindOffering.evaluate(async element => {
        let ancestor = element.parentElement;
        let scrollArea = null;
        let panel = null;
        while (ancestor && ancestor !== document.body) {
          const style = getComputedStyle(ancestor);
          if (!scrollArea &&
            ancestor.scrollHeight > ancestor.clientHeight
            && (style.overflowY === 'auto' || style.overflowY === 'scroll')
          ) {
            scrollArea = ancestor;
          }
          if (style.position === 'absolute' && style.overflowY === 'hidden') {
            panel = ancestor;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        if (!scrollArea) throw new Error('Difficulty menu scroll area was not found');
        if (!panel) throw new Error('Difficulty menu panel frame was not found');
        scrollArea.scrollTop = scrollArea.scrollHeight - scrollArea.clientHeight;
        window.scrollTo(0, document.documentElement.scrollHeight - window.innerHeight);
        await new Promise(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        });

        const blindRect = element.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        return {
          blindBottom: blindRect.bottom,
          blindTop: blindRect.top,
          panelBottom: panelRect.bottom,
          panelTop: panelRect.top,
          viewportHeight: window.innerHeight,
        };
      });

      const safeBottom = panelMetrics.viewportHeight - 12;
      if (
        panelMetrics.panelBottom > safeBottom
        || panelMetrics.blindTop < panelMetrics.panelTop
        || panelMetrics.blindBottom > panelMetrics.panelBottom - 18
      ) {
        throw new Error(
          `Difficulty menu lower frame is outside the safe area: `
          + JSON.stringify(panelMetrics)
        );
      }
      for (const { name, locator } of advertisedModes) {
        const box = await locator.boundingBox();
        if (!box || box.y < 0 || box.y + box.height > safeBottom) {
          throw new Error(
            `${name} is outside the variant capture safe area: ${JSON.stringify(box)}`
          );
        }
      }
      return;

    case 'flawless-victory':
      // Capture fixtures use reduced motion for deterministic static states.
      // Toggle it through the production Settings UI so this scenario can
      // exercise the real celebration skip control required by the campaign.
      await enableVictoryAnimation(page);
      await clickPlayPuzzle(page);
      await getActiveLetter(page, 'L').click();
      await page.getByLabel(
        getValidDropZoneLabelMatcher(2, 'PLANT')
      ).click();
      console.log('[capture] flawless-victory: completed move 1 (PAY / PLANT)');
      await getActiveLetter(page, 'T').click();
      await page.getByLabel(
        getValidDropZoneLabelMatcher(5, 'HEART')
      ).click();
      console.log('[capture] flawless-victory: completed move 2 (PLAN / HEART)');
      const skipCelebration = page.getByLabel(
        'Skip celebration animation',
        { exact: true }
      );
      await skipCelebration.waitFor({
        timeout: 60_000,
      });
      await skipCelebration.click();
      await skipCelebration.waitFor({ state: 'detached', timeout: 60_000 });
      await page.getByLabel('3 of 3 stars', { exact: true }).waitFor({
        timeout: 60_000,
      });
      // Browser actionability may scroll the nested puzzle list to expose the
      // final drop target. Its focus scroll races with the victory overlay, so
      // explicitly restore the fixture's intended top-of-board composition.
      await resetPuzzleScrollPosition(page, 3);
      console.log('[capture] flawless-victory: victory complete (3 of 3 stars)');
      return;

    case 'home-dusk':
      await waitForHome(page);
      return;

    case 'home-storm':
      await waitForHome(page);
      await panHouseToVisibleCompanions(page, 'home-storm');
      return;

    default:
      throw new Error(`No interaction is defined for scenario "${scenario}"`);
  }
}

async function assertPngDimensions(filePath) {
  const png = PNG.sync.read(await fs.readFile(filePath));
  if (
    png.width !== EXPECTED_DIMENSIONS.width
    || png.height !== EXPECTED_DIMENSIONS.height
  ) {
    throw new Error(
      `${path.basename(filePath)} is ${png.width}x${png.height}; `
      + `expected ${EXPECTED_DIMENSIONS.width}x${EXPECTED_DIMENSIONS.height}`
    );
  }
  return `${png.width}x${png.height}`;
}

function collectPageIntegrity(context, page) {
  const pageErrors = [];
  const localResourceFailures = [];

  page.on('pageerror', error => pageErrors.push(describeError(error)));
  context.on('response', response => {
    const url = response.url();
    if (isAllowedCaptureRequest(url) && response.status() >= 400) {
      localResourceFailures.push(`${response.status()} ${url}`);
    }
  });
  context.on('requestfailed', request => {
    const url = request.url();
    if (isAllowedCaptureRequest(url)) {
      localResourceFailures.push(
        `${request.failure()?.errorText ?? 'request failed'} ${url}`
      );
    }
  });

  return () => {
    const failures = [];
    if (pageErrors.length > 0) {
      failures.push(`page errors: ${pageErrors.join(' | ')}`);
    }
    if (localResourceFailures.length > 0) {
      failures.push(`local resource failures: ${localResourceFailures.join(' | ')}`);
    }
    if (failures.length > 0) {
      throw new Error(failures.join('; '));
    }
  };
}

async function captureScenario(
  browser,
  item,
  outputDir,
  { debugDirectory = DEBUG_DIR } = {}
) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });

  try {
    await context.addInitScript(({ seed }) => {
      let state = 0x811c9dc5;
      for (let index = 0; index < seed.length; index += 1) {
        state ^= seed.charCodeAt(index);
        state = Math.imul(state, 0x01000193);
      }
      Math.random = () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
    }, { seed: item.scenario });
    await context.route('**/*', async route => {
      if (isAllowedCaptureRequest(route.request().url())) {
        await route.continue();
      } else {
        await route.abort('blockedbyclient');
      }
    });
    const page = await context.newPage();
    const assertPageIntegrity = collectPageIntegrity(context, page);
    page.setDefaultTimeout(45_000);
    try {
      await page.goto(
        `${BASE_URL}/?playStoreScenario=${encodeURIComponent(item.scenario)}`,
        { waitUntil: 'domcontentloaded', timeout: 120_000 }
      );
      await waitForDocumentReadiness(page);
      await prepareScenario(page, item.scenario);
      await waitForScreenTransition(page);
      await waitForDocumentReadiness(page);
      assertPageIntegrity();

      const outputPath = path.join(outputDir, item.source);
      await page.screenshot({ path: outputPath, fullPage: false });
      assertPageIntegrity();
      const dimensions = await assertPngDimensions(outputPath);
      return { outputPath, dimensions };
    } catch (error) {
      await fs.mkdir(debugDirectory, { recursive: true });
      const debugPath = path.join(
        debugDirectory,
        `${item.scenario}-failure.png`
      );
      await page.screenshot({ path: debugPath, fullPage: false }).catch(() => {});
      throw new Error(
        `${item.scenario} failed: ${describeError(error)} Debug screenshot: ${debugPath}`
      );
    }
  } finally {
    await context.close();
  }
}

async function assertCapturesAreUnique(results) {
  const hashes = new Map();
  for (const result of results) {
    const digest = createHash('sha256')
      .update(await fs.readFile(result.outputPath))
      .digest('hex');
    const duplicate = hashes.get(digest);
    if (duplicate) {
      throw new Error(
        `Duplicate captures detected: ${path.basename(duplicate)} and `
        + `${path.basename(result.outputPath)}`
      );
    }
    hashes.set(digest, result.outputPath);
  }
}

async function runHomeStormSmoke(browser, campaign) {
  const smokeItem = campaign.find(item => item.scenario === 'home-storm');
  if (!smokeItem) throw new Error('Campaign is missing home-storm');
  const smokeDirectory = await fs.mkdtemp(path.join(
    os.tmpdir(),
    'wordshift-home-storm-smoke-'
  ));
  try {
    const result = await captureScenario(
      browser,
      smokeItem,
      smokeDirectory,
      { debugDirectory: smokeDirectory }
    );
    const dimensions = await assertPngDimensions(result.outputPath);
    const smokeFiles = await fs.readdir(smokeDirectory);
    if (
      smokeFiles.length !== 1
      || smokeFiles[0] !== smokeItem.source
    ) {
      throw new Error(
        `Storm smoke directory contains unexpected files: ${smokeFiles.join(', ')}`
      );
    }
    console.log(
      `[capture-smoke] PASS home-storm ${dimensions}; `
      + `isolated output ${result.outputPath}`
    );
    return dimensions;
  } finally {
    await fs.rm(smokeDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const campaign = await loadCampaign();
  const smokeHomeStorm = process.argv.includes('--smoke-home-storm');
  if (process.argv.includes('--list')) {
    console.log(`[capture] manifest valid: ${CAMPAIGN_PATH}`);
    for (const [index, item] of campaign.entries()) {
      console.log(
        `[capture] ${index + 1}/${campaign.length} ${item.scenario} -> ${item.source}`
      );
    }
    return;
  }

  if (!smokeHomeStorm) {
    await fs.mkdir(SOURCE_DIR, { recursive: true });
  }
  const expoLogs = [];
  let expoChild;
  let expoGroupId;
  let browser;
  let receivedSignal;
  let cleanupChain = Promise.resolve();

  const cleanup = () => {
    cleanupChain = cleanupChain.catch(() => {}).then(async () => {
      const activeBrowser = browser;
      browser = undefined;
      await activeBrowser?.close().catch(() => {});

      const activeExpoGroupId = expoGroupId;
      if (activeExpoGroupId) {
        await stopExpoProcessGroup(activeExpoGroupId, expoChild);
        expoGroupId = undefined;
      }
    });
    return cleanupChain;
  };

  const handleSignal = signal => {
    if (receivedSignal) return;
    receivedSignal = signal;
    process.exitCode = signal === 'SIGINT' ? 130 : 143;
    console.error(`[capture] ${signal} received; cleaning up capture processes`);
    void cleanup().catch(error => {
      console.error(`[capture] signal cleanup failed: ${describeError(error)}`);
    });
  };
  const handleSigint = () => handleSignal('SIGINT');
  const handleSigterm = () => handleSignal('SIGTERM');
  const throwIfInterrupted = () => {
    if (receivedSignal) {
      throw new Error(`Capture interrupted by ${receivedSignal}`);
    }
  };

  process.once('SIGINT', handleSigint);
  process.once('SIGTERM', handleSigterm);
  try {
    throwIfInterrupted();
    if (await canReuseCaptureServer(BASE_URL)) {
      console.log('[capture] reusing Expo web on 127.0.0.1:8091');
    } else {
      await assertCapturePortAvailable();
      console.log('[capture] starting Expo web on 127.0.0.1:8091');
      expoChild = startExpo(expoLogs);
      expoGroupId = expoChild.pid;
      if (!expoGroupId) {
        throw new Error('Expo child started without a process group id');
      }
      await waitForServer(BASE_URL, expoChild);
    }
    throwIfInterrupted();
    console.log(
      `[capture] Expo ready${expoChild ? ` (pid ${expoChild.pid})` : ' (reused)'}`
    );

    browser = await chromium.launch({ headless: true });
    throwIfInterrupted();
    if (smokeHomeStorm) {
      await runHomeStormSmoke(browser, campaign);
      return;
    }
    await withStagedPublication({
      finalDir: SOURCE_DIR,
      preserveNames: ['feature-background.png'],
      populateAndValidate: async stagingDir => {
        const results = [];
        for (const [index, item] of campaign.entries()) {
          throwIfInterrupted();
          console.log(`[capture] ${index + 1}/${campaign.length} ${item.scenario}`);
          const result = await captureScenario(browser, item, stagingDir);
          results.push(result);
          console.log(
            `[capture] ${item.scenario}: staged ${result.dimensions} -> ${item.source}`
          );
        }
        await assertCapturesAreUnique(results);
        const stagedSources = await validateSourceAssets({
          campaignPath: CAMPAIGN_PATH,
          sourceDir: stagingDir,
        });
        if (results.length !== campaign.length) {
          throw new Error(
            `Staged capture count ${results.length} does not match campaign ${campaign.length}`
          );
        }
        if (stagedSources.length !== campaign.length + 1) {
          throw new Error(
            `Staged source validation found ${stagedSources.length} files; `
            + `expected ${campaign.length + 1}`
          );
        }
        console.log(
          `[capture] staged validation complete: ${results.length} unique `
          + 'screenshots plus the audited feature background'
        );
      },
    });
    console.log(`[capture] published: ${campaign.length} unique source PNGs`);
  } catch (error) {
    const expoDetail = expoLogs.length > 0
      ? `\n[capture] recent Expo output:\n${expoLogs.join('\n')}`
      : '';
    throw new Error(`${describeError(error)}${expoDetail}`);
  } finally {
    process.removeListener('SIGINT', handleSigint);
    process.removeListener('SIGTERM', handleSigterm);
    await cleanup();
  }
}

main().catch(error => {
  console.error(`[capture] ERROR\n${describeError(error)}`);
  if (process.exitCode == null) process.exitCode = 1;
});
