import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import {
  isAllowedCaptureRequest,
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

async function waitForLocatorAnimations(page, locator) {
  await locator.waitFor();
  const handle = await locator.elementHandle();
  if (!handle) throw new Error('Animated capture surface is not attached');
  await page.waitForFunction(element => {
    let current = element;
    while (current) {
      const animations = typeof current.getAnimations === 'function'
        ? current.getAnimations()
        : [];
      if (animations.some(animation =>
        animation.playState === 'pending' || animation.playState === 'running'
      )) {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }, handle);
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

async function panHouseToVisibleCompanions(page) {
  let metrics = await getCompanionViewportMetrics(page);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const visible = metrics.filter(item => item.visibleRatio >= 0.6);
    if (visible.length >= 3) {
      const labels = visible.map(item => item.label);
      console.log(`[capture] home-sunny: visible companions: ${labels.join(', ')}`);
      return labels;
    }

    // HouseWorld starts at its positive maxPanY to frame the roof. Dragging the
    // real RNGH pan surface upward reduces that state and reveals the lower
    // occupied rooms. Keep the gesture left of the dock and animal controls.
    await page.mouse.move(24, 620);
    await page.mouse.down();
    await page.mouse.move(24, 300, { steps: 16 });
    await page.mouse.up();
    await waitForDocumentReadiness(page);
    metrics = await getCompanionViewportMetrics(page);
  }

  const visible = metrics.filter(item => item.visibleRatio >= 0.6);
  if (visible.length < 3) {
    throw new Error(
      `House pan framed only ${visible.length}/4 companions: ${JSON.stringify(metrics)}`
    );
  }
  const labels = visible.map(item => item.label);
  console.log(`[capture] home-sunny: visible companions: ${labels.join(', ')}`);
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

    case 'daily':
      await page.getByLabel(/^Daily challenge completed\..*7 day streak\./).click();
      await page.getByText('Today’s Standing', { exact: true }).waitFor();
      await page.getByText(
        'The standings are still gathering. Check back a little later. Daily streak: 7 days.',
        { exact: true }
      ).waitFor();
      await page.getByLabel('OK', { exact: true }).waitFor();
      await waitForLocatorAnimations(
        page,
        page.getByLabel('Dismiss alert', { exact: true })
      );
      await page.getByLabel('Play puzzle', { exact: true }).waitFor();
      return;

    case 'flawless-victory':
      // Capture fixtures use reduced motion for deterministic static states.
      // Toggle it through the production Settings UI so this scenario can
      // exercise the real celebration skip control required by the campaign.
      await enableVictoryAnimation(page);
      await clickPlayPuzzle(page);
      await getActiveLetter(page, 'L').click();
      await page.getByLabel('Drop zone 2', { exact: true }).click();
      await getActiveLetter(page, 'T').click();
      await page.getByLabel('Drop zone 5', { exact: true }).click();
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

async function captureScenario(browser, item, outputDir) {
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
  if (process.argv.includes('--list')) {
    console.log(`[capture] manifest valid: ${CAMPAIGN_PATH}`);
    for (const [index, item] of campaign.entries()) {
      console.log(
        `[capture] ${index + 1}/${campaign.length} ${item.scenario} -> ${item.source}`
      );
    }
    return;
  }

  await fs.mkdir(SOURCE_DIR, { recursive: true });
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
    await withStagedPublication({
      finalDir: SOURCE_DIR,
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
