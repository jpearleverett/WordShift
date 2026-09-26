// Optional browser smoke test: npm run test:ui
// Starts the demo server (fixtures, no database), signs in with Chromium and
// checks the page at phone and desktop widths in light and dark. Screenshots
// land in a temp directory for review. Skips when Chromium or playwright-core
// is missing. Never run "playwright install"; point WORDSHIFT_CHROMIUM at a
// Chromium binary instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmtCompact, fmtInt, fmtShort } from '../../public/js/format.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CHROMIUM = process.env.WORDSHIFT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PASSWORD = 'demo-password-1234';
const HEADINGS = ['Right now', 'Today', 'New installs by day', 'Tutorial funnel', 'Retention', 'Story progress',
  'Money', 'Health', 'Daily Challenge', 'Builds, 24 h', 'Other dashboards', 'What these numbers mean'];

let chromium = null;
try {
  ({ chromium } = await import('playwright-core'));
} catch { /* skipped below */ }
const skip = !chromium ? 'playwright-core is not installed' : (!existsSync(CHROMIUM) ? `no Chromium at ${CHROMIUM}` : false);

async function startDemo(port) {
  const child = spawn(process.execPath, ['scripts/demo.mjs'], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'development', PORT: String(port), DASHBOARD_PASSWORD: PASSWORD },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let log = '';
  child.stderr.on('data', (d) => { log += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try {
      const res = await fetch(`${base}/healthz`);
      if (res.ok) return { child, base };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  child.kill();
  throw new Error(`demo server did not start: ${log}`);
}

async function signIn(page, base) {
  await page.goto(`${base}/login`);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(`${base}/`), page.click('button[type="submit"]')]);
  await page.waitForFunction(() => !document.querySelector('.card .loading'), null, { timeout: 15000 });
}

test('dashboard renders cleanly in Chromium', { skip, timeout: 120000 }, async () => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const { child, base } = await startDemo(port);
  const shots = mkdtempSync(join(tmpdir(), 'wordshift-dashboard-smoke-'));
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  try {
    for (const [width, height] of [[360, 800], [1280, 900]]) {
      for (const colorScheme of ['light', 'dark']) {
        const context = await browser.newContext({ viewport: { width, height }, colorScheme });
        const page = await context.newPage();
        const errors = [];
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', (e) => errors.push(e.message));
        await signIn(page, base);

        assert.deepEqual(errors, [], `console errors at ${width} ${colorScheme} (CSP or Trusted Types?)`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 0, `horizontal page scroll of ${overflow}px at ${width}`);
        assert.equal(await page.locator('#status-chips .chip').count(), 3);
        const titles = await page.locator('#status-chips .chip-title').allTextContents();
        assert.ok(titles.every((t) => t && !t.includes('Loading')), `status strip: ${titles}`);
        const headings = (await page.locator('main h2:not(.sr-only)').allTextContents()).map((t) => t.trim());
        for (const hd of HEADINGS) assert.ok(headings.includes(hd), `missing heading ${hd}`);
        assert.equal(await page.getByRole('button', { name: 'Sign out' }).count(), 1);
        assert.equal(await page.locator('h1').count(), 1);

        // Hover the per-minute chart: the tooltip shows a value.
        const plot = page.locator('#sec-now .plot').first();
        if (await plot.count()) {
          await plot.scrollIntoViewIfNeeded();
          const box = await plot.boundingBox();
          await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
          await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5);
          await page.waitForSelector('#tooltip:not([hidden])', { timeout: 2000 });
          assert.match(await page.locator('#tooltip').textContent(), /event/);
        }

        await page.screenshot({ path: join(shots, `dashboard-${width}-${colorScheme}.png`), fullPage: true });
        assert.deepEqual(errors, [], `console errors after interaction at ${width} ${colorScheme}`);
        await context.close();
      }
    }

    // Big numbers stay on one line and inside their tile on narrow phones: the
    // three-across tiles through fmtShort, the two-across ones through fmtCompact.
    for (const width of [360, 412]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page, base);
      for (const value of [9_999, 13_363, 48_210, 123_456, 999_999, 1_250_000]) {
        const texts = { three: fmtShort(value), two: fmtCompact(value), raw: fmtInt(value) };
        const result = await page.evaluate((t) => {
          const lines = (el) => {
            const lh = parseFloat(getComputedStyle(el).lineHeight);
            return Math.round(el.getBoundingClientRect().height / lh);
          };
          const out = [];
          for (const el of document.querySelectorAll('.tiles-3 .tile-value, .tiles:not(.tiles-3) .tile-value')) {
            const three = Boolean(el.closest('.tiles-3'));
            if (el.closest('.tile-pending')) continue;
            const before = el.textContent;
            el.textContent = three ? t.three : t.two;
            const tile = el.closest('.tile');
            const pad = parseFloat(getComputedStyle(tile).paddingLeft) + parseFloat(getComputedStyle(tile).paddingRight);
            out.push({ three, text: el.textContent, lines: lines(el), overflow: el.scrollWidth - (tile.clientWidth - pad) });
            el.textContent = t.raw; // even the unshortened number never breaks mid-number
            out.push({ three, text: el.textContent, lines: lines(el), overflow: 0 });
            el.textContent = before;
          }
          return out;
        }, texts);
        assert.ok(result.length >= 10, `found ${result.length} tiles`);
        for (const r of result) {
          assert.equal(r.lines, 1, `${r.text} wraps at ${width}px (${r.three ? 'three' : 'two'} across)`);
          assert.ok(r.overflow <= 0, `${r.text} overflows its tile by ${r.overflow}px at ${width}px`);
        }
      }
      await context.close();
    }

    // A launch time set too late: many "test devices" first seen in the day before it.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.route('**/api/live', async (route) => {
        const response = await route.fetch();
        const env = await response.json();
        env.data.testers.recentBeforeLaunch = 6;
        await route.fulfill({ response, json: env });
      });
      await signIn(page, base);
      const notices = await page.locator('#notices li').allTextContents();
      assert.ok(notices.some((t) => /6 test devices first appeared in the 24 hours before the launch time/.test(t) && /deploy\.sh --reconfigure/.test(t)),
        `launch-time warning missing: ${notices}`);
      await context.close();
    }

    // Wrong password, sign-out, and the 401 path back to the sign-in page.
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.fill('input[name="password"]', 'not-the-password');
    await Promise.all([page.waitForURL(/\/login\?e=wrong$/), page.click('button[type="submit"]')]);
    assert.match(await page.locator('.login-message').textContent(), /did not work/);

    await page.waitForTimeout(1200); // the per-IP backoff after one failure is 1 s
    await signIn(page, base);
    await context.clearCookies();
    // The page polls again when it becomes visible; with no session the API says 401.
    await Promise.all([
      page.waitForURL(/\/login$/, { timeout: 10000 }),
      page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))),
    ]);

    await page.waitForTimeout(2200);
    await signIn(page, base);
    await Promise.all([page.waitForURL(/\/login\?e=out$/), page.getByRole('button', { name: 'Sign out' }).click()]);
    assert.match(await page.locator('.login-message').textContent(), /signed out/);
    await context.close();
    console.log(`screenshots: ${shots}`);
  } finally {
    await browser.close();
    child.kill();
  }
});
