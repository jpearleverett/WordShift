import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import {
  getValidDropZoneLabelMatcher,
  isAllowedCaptureRequest,
  requireAllVisibleCompanions,
  requireNoPartialVerticalOcclusion,
  summarizeRgbaDiff,
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
const FLAWLESS_REPRO_DIR = path.join(DEBUG_DIR, 'flawless-repro');
const DEBUG_LOG_PATH = '/opt/cursor/logs/debug.log';
const DEBUG_FLAWLESS_ARG = '--debug-flawless-repeats=';

const VIEWPORT = { width: 432, height: 768 };
const DEVICE_SCALE_FACTOR = 2.5;
const EXPECTED_DIMENSIONS = { width: 1080, height: 1920 };
const BASE_URL = 'http://127.0.0.1:8091';
const EXPO_HOST = '127.0.0.1';
const EXPO_PORT = 8091;

function describeError(error) {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

function getDebugFlawlessRepeatCount() {
  const argument = process.argv.find(arg => arg.startsWith(DEBUG_FLAWLESS_ARG));
  if (!argument) return null;
  const repeatCount = Number.parseInt(argument.slice(DEBUG_FLAWLESS_ARG.length), 10);
  if (!Number.isInteger(repeatCount) || repeatCount < 2 || repeatCount > 20) {
    throw new Error(`${DEBUG_FLAWLESS_ARG}<count> requires an integer from 2 to 20`);
  }
  return repeatCount;
}

async function appendAgentDebugLog(hypothesisId, location, message, data) {
  await fs.appendFile(
    DEBUG_LOG_PATH,
    `${JSON.stringify({ hypothesisId, location, message, data, timestamp: Date.now() })}\n`
  );
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

const SUNNY_COMPANION_LABELS = [
  'Ember the fox',
  'Panko the pangolin',
  'Archimedes the owl',
  'Axel the axolotl',
];

async function getCompanionViewportMetrics(page) {
  return Promise.all(SUNNY_COMPANION_LABELS.map(async label => {
    const locator = page.getByLabel(label, { exact: true });
    await locator.waitFor({ state: 'attached' });
    return locator.evaluate((element, companionLabel) => {
      const rect = element.getBoundingClientRect();
      const intersectionWidth = Math.max(
        0,
        Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
      );
      const intersectionHeight = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
      );
      const area = Math.max(1, rect.width * rect.height);
      return {
        label: companionLabel,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        visibleRatio: (intersectionWidth * intersectionHeight) / area,
      };
    }, label);
  }));
}

async function assertHomeSunnyOverlayGeometry(page) {
  const nextUnlockBar = page.getByLabel(/^Next unlock\./).first();
  const lockedRoom = page.getByLabel(
    'Build Jungle Hammock for 200 amber',
    { exact: true }
  );
  const lockedRoomLines = [
    {
      label: 'Jungle Hammock',
      locator: lockedRoom.getByText('Jungle Hammock', { exact: true }).first(),
    },
    { label: 'Build: 200', locator: lockedRoom.getByText(/^Build:/).first() },
    { label: '180 / 200', locator: lockedRoom.getByText('180 / 200').first() },
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
    throw new Error('Cannot measure home-sunny Next Unlock and locked-room geometry');
  }

  for (const [index, lineBox] of lineBoxes.entries()) {
    const { label } = lockedRoomLines[index];
    const relationship = requireNoPartialVerticalOcclusion(
      { top: lineBox.y, bottom: lineBox.y + lineBox.height },
      { top: barBox.y, bottom: barBox.y + barBox.height },
      label,
      0.5
    );
    console.log(`[capture] home-sunny: ${label} is ${relationship}`);
  }
}

async function panHouseToVisibleCompanions(page) {
  let metrics = await getCompanionViewportMetrics(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const visible = metrics.filter(item => item.visibleRatio >= 0.6);
    if (visible.length === SUNNY_COMPANION_LABELS.length) {
      break;
    }

    // HouseWorld starts at its positive maxPanY to frame the roof. Dragging the
    // real RNGH pan surface upward reduces that state and reveals the lower
    // occupied rooms. Keep the gesture left of the dock and animal controls.
    await page.mouse.move(24, 620);
    await page.mouse.down();
    await page.mouse.move(24, 314, { steps: 16 });
    await page.mouse.up();
    await waitForDocumentReadiness(page);
    metrics = await getCompanionViewportMetrics(page);
  }

  const labels = requireAllVisibleCompanions(
    metrics,
    SUNNY_COMPANION_LABELS,
    0.6
  );
  await page.getByText("Today's challenge is ready.", { exact: true }).waitFor({
    state: 'detached',
    timeout: 7_000,
  });
  await assertHomeSunnyOverlayGeometry(page);
  console.log(`[capture] home-sunny: visible companions: ${labels.join(', ')}`);
  return labels;
}

async function collectFlawlessVisualState(page) {
  return page.evaluate(() => {
    const describeElement = (element, fallbackName) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const childStyle = element.firstElementChild
        ? getComputedStyle(element.firstElementChild)
        : null;
      return {
        name:
          element.getAttribute('data-testid')
          || element.getAttribute('aria-label')
          || fallbackName,
        rect: {
          left: Number(rect.left.toFixed(3)),
          top: Number(rect.top.toFixed(3)),
          right: Number(rect.right.toFixed(3)),
          bottom: Number(rect.bottom.toFixed(3)),
        },
        opacity: style.opacity,
        transform: style.transform,
        backgroundColor: style.backgroundColor,
        childBackgroundColor: childStyle?.backgroundColor ?? null,
        text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
      };
    };
    const visuals = [];
    const seen = new Set();
    const collect = (selector, fallbackName) => {
      for (const element of document.querySelectorAll(selector)) {
        if (seen.has(element)) continue;
        seen.add(element);
        visuals.push(describeElement(element, fallbackName));
      }
    };

    collect('[data-testid^="play-store-"]', 'play-store-probe');
    collect('[aria-label="WordShift"]', 'wordmark');
    collect('[aria-label="Skip celebration animation"]', 'skip-layer');
    collect('[aria-label="3 of 3 stars"]', 'victory-stars');
    collect('[role="alert"]', 'alert');

    const animatedCandidates = [];
    for (const element of document.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      if (style.transform === 'none' && style.opacity === '1') continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      animatedCandidates.push(describeElement(
        element,
        `animated-${element.tagName.toLowerCase()}`
      ));
      if (animatedCandidates.length >= 250) break;
    }

    const bodyText = document.body?.innerText ?? '';
    const glitchText = [
      'WE SEE YOU',
      'THANK YOU',
      'CLOSER',
      'THE PATTERN',
      'AGAIN',
      'WE REMEMBER',
    ].find(text => bodyText.includes(text)) ?? null;
    const timing = window.__wordshiftFlawlessTiming ?? {};
    return {
      performanceNow: Number(performance.now().toFixed(3)),
      prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      timing,
      glitchText,
      visuals,
      animatedCandidates,
      webAnimations: document.getAnimations().map(animation => ({
        currentTime: animation.currentTime,
        playState: animation.playState,
        target:
          animation.effect?.target?.getAttribute?.('data-testid')
          || animation.effect?.target?.getAttribute?.('aria-label')
          || animation.effect?.target?.tagName
          || null,
      })),
    };
  });
}

async function prepareScenario(page, scenario, debugRunLabel = null) {
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
      await panHouseToVisibleCompanions(page);
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
      if (debugRunLabel) {
        await page.evaluate(() => {
          window.__wordshiftFlawlessTiming = {
            ...window.__wordshiftFlawlessTiming,
            finalDropStartedAt: performance.now(),
          };
        });
      }
      await page.getByLabel(
        getValidDropZoneLabelMatcher(5, 'HEART')
      ).click();
      if (debugRunLabel) {
        await page.evaluate(() => {
          window.__wordshiftFlawlessTiming = {
            ...window.__wordshiftFlawlessTiming,
            finalDropReturnedAt: performance.now(),
          };
        });
        // #region agent log
        await appendAgentDebugLog(
          'B,D',
          'capturePlayStoreScreenshots.mjs:flawless-final-move',
          'Final move returned before victory skip',
          { run: debugRunLabel, state: await collectFlawlessVisualState(page) }
        );
        // #endregion
      }
      console.log('[capture] flawless-victory: completed move 2 (PLAN / HEART)');
      const skipCelebration = page.getByLabel(
        'Skip celebration animation',
        { exact: true }
      );
      await skipCelebration.waitFor({
        timeout: 60_000,
      });
      if (debugRunLabel) {
        await page.evaluate(() => {
          window.__wordshiftFlawlessTiming = {
            ...window.__wordshiftFlawlessTiming,
            skipVisibleAt: performance.now(),
          };
        });
      }
      await skipCelebration.click();
      await skipCelebration.waitFor({ state: 'detached', timeout: 60_000 });
      await page.getByLabel('3 of 3 stars', { exact: true }).waitFor({
        timeout: 60_000,
      });
      // Browser actionability may scroll the nested puzzle list to expose the
      // final drop target. Its focus scroll races with the victory overlay, so
      // explicitly restore the fixture's intended top-of-board composition.
      await resetPuzzleScrollPosition(page, 3);
      if (debugRunLabel) {
        await page.evaluate(() => {
          window.__wordshiftFlawlessTiming = {
            ...window.__wordshiftFlawlessTiming,
            skipSettledAt: performance.now(),
          };
        });
        // #region agent log
        await appendAgentDebugLog(
          'A,B,C,D',
          'capturePlayStoreScreenshots.mjs:flawless-skip-settled',
          'Victory skip layer detached and stars settled',
          { run: debugRunLabel, state: await collectFlawlessVisualState(page) }
        );
        // #endregion
      }
      console.log('[capture] flawless-victory: victory complete (3 of 3 stars)');
      return;

    case 'home-dusk':
      await waitForHome(page);
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

function visualLabelsForComponent(component, ...states) {
  const matches = [];
  for (const state of states) {
    for (const visual of state?.visuals ?? []) {
      const rect = {
        left: Math.floor(visual.rect.left * DEVICE_SCALE_FACTOR),
        top: Math.floor(visual.rect.top * DEVICE_SCALE_FACTOR),
        right: Math.ceil(visual.rect.right * DEVICE_SCALE_FACTOR),
        bottom: Math.ceil(visual.rect.bottom * DEVICE_SCALE_FACTOR),
      };
      if (
        component.right < rect.left
        || component.left > rect.right
        || component.bottom < rect.top
        || component.top > rect.bottom
      ) {
        continue;
      }
      const area = Math.max(1, (rect.right - rect.left) * (rect.bottom - rect.top));
      matches.push({ name: visual.name, area });
    }
  }
  return [...new Map(
    matches
      .sort((a, b) => a.area - b.area || a.name.localeCompare(b.name))
      .map(match => [match.name, match])
  ).values()].slice(0, 12).map(match => match.name);
}

async function writeVisualDiff(firstPng, secondPng, outputPath) {
  const diff = new PNG({ width: firstPng.width, height: firstPng.height });
  for (let pixel = 0; pixel < firstPng.width * firstPng.height; pixel += 1) {
    const offset = pixel * 4;
    const changed =
      firstPng.data[offset] !== secondPng.data[offset]
      || firstPng.data[offset + 1] !== secondPng.data[offset + 1]
      || firstPng.data[offset + 2] !== secondPng.data[offset + 2]
      || firstPng.data[offset + 3] !== secondPng.data[offset + 3];
    if (changed) {
      diff.data[offset] = 255;
      diff.data[offset + 1] = 0;
      diff.data[offset + 2] = 80;
      diff.data[offset + 3] = 255;
    } else {
      const gray = Math.round(
        (
          firstPng.data[offset]
          + firstPng.data[offset + 1]
          + firstPng.data[offset + 2]
        ) / 3
      );
      const muted = Math.round(220 + gray * 0.12);
      diff.data[offset] = muted;
      diff.data[offset + 1] = muted;
      diff.data[offset + 2] = muted;
      diff.data[offset + 3] = 255;
    }
  }
  await fs.writeFile(outputPath, PNG.sync.write(diff));
}

async function compareFlawlessDebugRuns(results) {
  const firstPng = PNG.sync.read(await fs.readFile(results[0].outputPath));
  const comparisons = [];
  for (let index = 1; index < results.length; index += 1) {
    const result = results[index];
    const currentPng = PNG.sync.read(await fs.readFile(result.outputPath));
    const summary = summarizeRgbaDiff(firstPng, currentPng);
    const annotatedComponents = summary.components.slice(0, 200).map(component => ({
      ...component,
      visualLabels: visualLabelsForComponent(
        component,
        results[0].diagnostics,
        result.diagnostics
      ),
    }));
    const diffPath = path.join(
      FLAWLESS_REPRO_DIR,
      `diff_run_1_vs_${index + 1}.png`
    );
    await writeVisualDiff(firstPng, currentPng, diffPath);
    comparisons.push({
      firstRun: 1,
      secondRun: index + 1,
      differentPixels: summary.differentPixels,
      bounds: summary.bounds,
      componentCount: summary.components.length,
      components: annotatedComponents,
      diffPath,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    runs: results.map((result, index) => ({
      run: index + 1,
      outputPath: result.outputPath,
      encodedSha256: result.encodedSha256,
      diagnostics: result.diagnostics,
    })),
    comparisons,
  };
  const reportPath = path.join(FLAWLESS_REPRO_DIR, 'diff-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  // #region agent log
  await appendAgentDebugLog(
    'A,B,C,D,E',
    'capturePlayStoreScreenshots.mjs:flawless-repeat-diff',
    'Repeated flawless captures compared at decoded pixel level',
    {
      reportPath,
      comparisons: comparisons.map(comparison => ({
        secondRun: comparison.secondRun,
        differentPixels: comparison.differentPixels,
        bounds: comparison.bounds,
        componentCount: comparison.componentCount,
        leadingComponents: comparison.components.slice(0, 20),
      })),
    }
  );
  // #endregion
  return { reportPath, comparisons };
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
  { debugRunLabel = null } = {}
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
      await prepareScenario(page, item.scenario, debugRunLabel);
      await waitForScreenTransition(page);
      await waitForDocumentReadiness(page);
      assertPageIntegrity();

      const diagnostics = debugRunLabel && item.scenario === 'flawless-victory'
        ? await collectFlawlessVisualState(page)
        : null;
      if (diagnostics) {
        // #region agent log
        await appendAgentDebugLog(
          'A,B,C,D,E',
          'capturePlayStoreScreenshots.mjs:flawless-before-screenshot',
          'Visual state immediately before Playwright screenshot',
          { run: debugRunLabel, state: diagnostics }
        );
        // #endregion
      }
      const outputPath = path.join(outputDir, item.source);
      await page.screenshot({ path: outputPath, fullPage: false });
      assertPageIntegrity();
      const dimensions = await assertPngDimensions(outputPath);
      const encodedSha256 = createHash('sha256')
        .update(await fs.readFile(outputPath))
        .digest('hex');
      if (debugRunLabel) {
        // #region agent log
        await appendAgentDebugLog(
          'E',
          'capturePlayStoreScreenshots.mjs:flawless-screenshot-written',
          'Playwright screenshot encoded',
          {
            run: debugRunLabel,
            outputPath,
            encodedSha256,
            browserElapsedMs: diagnostics
              ? Number((diagnostics.performanceNow - diagnostics.timing.finalDropStartedAt).toFixed(3))
              : null,
          }
        );
        // #endregion
      }
      return { outputPath, dimensions, diagnostics, encodedSha256 };
    } catch (error) {
      await fs.mkdir(DEBUG_DIR, { recursive: true });
      const debugPath = path.join(DEBUG_DIR, `${item.scenario}-failure.png`);
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

async function main() {
  const campaign = await loadCampaign();
  const debugFlawlessRepeatCount = getDebugFlawlessRepeatCount();
  if (process.argv.includes('--list')) {
    console.log(`[capture] manifest valid: ${CAMPAIGN_PATH}`);
    for (const [index, item] of campaign.entries()) {
      console.log(
        `[capture] ${index + 1}/${campaign.length} ${item.scenario} -> ${item.source}`
      );
    }
    return;
  }

  if (debugFlawlessRepeatCount === null) {
    await fs.mkdir(SOURCE_DIR, { recursive: true });
  }
  await assertCapturePortAvailable();
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
    console.log('[capture] starting Expo web on 127.0.0.1:8091');
    expoChild = startExpo(expoLogs);
    expoGroupId = expoChild.pid;
    if (!expoGroupId) throw new Error('Expo child started without a process group id');
    await waitForServer(BASE_URL, expoChild);
    throwIfInterrupted();
    console.log(`[capture] Expo ready (pid ${expoChild.pid})`);

    browser = await chromium.launch({ headless: true });
    throwIfInterrupted();
    if (debugFlawlessRepeatCount !== null) {
      const flawlessItem = campaign.find(item => item.scenario === 'flawless-victory');
      if (!flawlessItem) throw new Error('Campaign has no flawless-victory scenario');
      await fs.rm(FLAWLESS_REPRO_DIR, { recursive: true, force: true });
      await fs.mkdir(FLAWLESS_REPRO_DIR, { recursive: true });
      const results = [];
      for (let index = 0; index < debugFlawlessRepeatCount; index += 1) {
        throwIfInterrupted();
        const runNumber = index + 1;
        const runDir = path.join(FLAWLESS_REPRO_DIR, `run-${runNumber}`);
        await fs.mkdir(runDir);
        console.log(
          `[capture] flawless diagnostic ${runNumber}/${debugFlawlessRepeatCount}`
        );
        results.push(await captureScenario(browser, flawlessItem, runDir, {
          debugRunLabel: `run-${runNumber}`,
        }));
      }
      const { reportPath, comparisons } = await compareFlawlessDebugRuns(results);
      const mismatches = comparisons.filter(item => item.differentPixels > 0);
      console.log(
        `[capture] flawless diagnostic complete: ${mismatches.length}/`
        + `${comparisons.length} repeats differed from run 1`
      );
      console.log(`[capture] flawless diagnostic report: ${reportPath}`);
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
