import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

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
const APPROVED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'daily',
  'flawless-victory',
  'home-dusk',
];

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

  if (!Array.isArray(campaign) || campaign.length !== APPROVED_SCENARIOS.length) {
    throw new Error(
      `Campaign must contain exactly ${APPROVED_SCENARIOS.length} scenarios`
    );
  }

  const actualScenarios = campaign.map(item => item.scenario);
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
    if (path.basename(item.source) !== item.source || !item.source.endsWith('.png')) {
      throw new Error(`${item.scenario}: invalid source filename "${item.source}"`);
    }
    if (sourceNames.has(item.source) || finalNames.has(item.final)) {
      throw new Error(`${item.scenario}: campaign filenames must be unique`);
    }
    sourceNames.add(item.source);
    finalNames.add(item.final);
  }

  await fs.access(path.join(MOBILE_DIR, 'package.json'));
  await fs.access(path.dirname(CAMPAIGN_PATH));
  return campaign;
}

async function waitForServer(url, expoChild, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (expoChild.exitCode !== null) {
      throw new Error(
        `Expo exited with code ${expoChild.exitCode} before ${url} became ready`
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

async function stopExpo(expoChild) {
  if (
    !expoChild
    || expoChild.exitCode !== null
    || expoChild.signalCode !== null
    || !expoChild.pid
  ) {
    return;
  }

  const signalExactProcessTree = signal => {
    try {
      if (process.platform === 'win32') {
        expoChild.kill(signal);
      } else {
        process.kill(-expoChild.pid, signal);
      }
      return true;
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error;
      return false;
    }
  };

  signalExactProcessTree('SIGTERM');
  const waitForExit = async () => {
    if (expoChild.exitCode !== null || expoChild.signalCode !== null) return true;
    return Promise.race([
      once(expoChild, 'exit').then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 5_000)),
    ]);
  };

  if (!await waitForExit()) {
    signalExactProcessTree('SIGKILL');
    if (!await waitForExit()) {
      throw new Error(`Expo process tree ${expoChild.pid} did not exit after SIGKILL`);
    }
  }
}

function isAllowedRequest(urlString) {
  if (urlString.startsWith('data:') || urlString.startsWith('blob:')) {
    return true;
  }
  try {
    const { hostname } = new URL(urlString);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function waitForFontsAndPaint(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
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
      return;

    case 'animal-dialogue':
      await waitForHome(page);
      await page.getByLabel('Ember the fox', { exact: true }).click();
      await page.getByLabel('Continue dialogue', { exact: true }).waitFor();
      return;

    case 'variant-menu':
      await clickPlayPuzzle(page);
      await page.getByLabel(/^Difficulty .+Tap to change puzzle setup$/).click();
      await page.getByLabel(/^Reverse Shift(?:,|$)/).waitFor();
      await page.getByLabel(/^Double Shift(?:,|$)/).waitFor();
      await page.getByLabel(/^Speed Shift(?:,|$)/).waitFor();
      const blindOffering = page.getByLabel(/^Blind offering,/);
      await blindOffering.waitFor();
      const blindMetrics = await blindOffering.evaluate(element => {
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.body) {
          const style = getComputedStyle(ancestor);
          if (
            ancestor.scrollHeight > ancestor.clientHeight
            && (style.overflowY === 'auto' || style.overflowY === 'scroll')
          ) {
            ancestor.scrollTop = ancestor.scrollHeight - ancestor.clientHeight;
            break;
          }
          ancestor = ancestor.parentElement;
        }

        const overflow = element.getBoundingClientRect().bottom - window.innerHeight;
        if (overflow > 0) window.scrollBy(0, overflow);
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          top: rect.top,
          viewportHeight: window.innerHeight,
        };
      });
      if (blindMetrics.top < 0 || blindMetrics.bottom > blindMetrics.viewportHeight) {
        throw new Error(
          `Blind offering is outside the viewport after scrolling: `
          + JSON.stringify(blindMetrics)
        );
      }
      return;

    case 'daily':
      await page.getByLabel(/^Daily challenge completed\..*7 day streak\./).waitFor();
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
      await page.getByLabel('Skip celebration animation', { exact: true }).waitFor({
        timeout: 60_000,
      });
      await page.getByLabel('Skip celebration animation', { exact: true }).click();
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

async function captureScenario(browser, item) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(describeError(error)));

  try {
    await page.route('**/*', async route => {
      if (isAllowedRequest(route.request().url())) {
        await route.continue();
      } else {
        await route.abort('blockedbyclient');
      }
    });
    page.setDefaultTimeout(45_000);
    await page.goto(
      `${BASE_URL}/?playStoreScenario=${encodeURIComponent(item.scenario)}`,
      { waitUntil: 'domcontentloaded', timeout: 120_000 }
    );
    await waitForFontsAndPaint(page);
    await prepareScenario(page, item.scenario);
    await waitForScreenTransition(page);
    await waitForFontsAndPaint(page);

    const outputPath = path.join(SOURCE_DIR, item.source);
    await page.screenshot({ path: outputPath, fullPage: false });
    const dimensions = await assertPngDimensions(outputPath);
    return { outputPath, dimensions };
  } catch (error) {
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    const debugPath = path.join(DEBUG_DIR, `${item.scenario}-failure.png`);
    await page.screenshot({ path: debugPath, fullPage: false }).catch(() => {});
    const browserDetail = pageErrors.length > 0
      ? ` Browser errors: ${pageErrors.join(' | ')}`
      : '';
    throw new Error(
      `${item.scenario} failed: ${describeError(error)}`
      + `${browserDetail} Debug screenshot: ${debugPath}`
    );
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
  const expoLogs = [];
  let expoChild;
  let browser;
  try {
    console.log('[capture] starting Expo web on 127.0.0.1:8091');
    expoChild = startExpo(expoLogs);
    await waitForServer(BASE_URL, expoChild);
    console.log(`[capture] Expo ready (pid ${expoChild.pid})`);

    browser = await chromium.launch({ headless: true });
    const results = [];
    for (const [index, item] of campaign.entries()) {
      console.log(`[capture] ${index + 1}/${campaign.length} ${item.scenario}`);
      const result = await captureScenario(browser, item);
      results.push(result);
      console.log(
        `[capture] ${item.scenario}: captured ${result.dimensions} -> ${item.source}`
      );
    }
    await assertCapturesAreUnique(results);
    console.log(`[capture] complete: ${results.length} unique source PNGs`);
  } catch (error) {
    const expoDetail = expoLogs.length > 0
      ? `\n[capture] recent Expo output:\n${expoLogs.join('\n')}`
      : '';
    throw new Error(`${describeError(error)}${expoDetail}`);
  } finally {
    await browser?.close().catch(() => {});
    await stopExpo(expoChild);
  }
}

main().catch(error => {
  console.error(`[capture] ERROR\n${describeError(error)}`);
  process.exitCode = 1;
});
