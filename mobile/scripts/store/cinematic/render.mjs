// Offline renderer for the cinematic trailer.
//
// Serves mobile/ over HTTP, opens scripts/store/cinematic/index.html in
// headless Chromium (software WebGL through SwiftShader), steps the trailer's
// deterministic timeline one frame at a time and writes every frame as a JPEG.
// `encode.mjs` turns the frames and the score into the MP4s.
//
//   node scripts/store/cinematic/render.mjs 16x9            # every frame
//   node scripts/store/cinematic/render.mjs 9x16 --workers=2
//   node scripts/store/cinematic/render.mjs 16x9 --stills=0,4.5,12   # seconds -> PNG stills
//   node scripts/store/cinematic/render.mjs 16x9 --from=300 --to=420  # a frame range
//   node scripts/store/cinematic/render.mjs 16x9 --scale=0.5          # half-resolution draft
//
// Frames go to $CINEMATIC_WORK/frames-<aspect>[-draft]/NNNNN.jpg (default work
// dir: /tmp/wordshift-cinematic). A frame that already exists is skipped, so a
// killed render resumes where it stopped; pass --force to redraw.

import { Buffer } from 'node:buffer';
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '../../..');
export const WORK = process.env.CINEMATIC_WORK || '/tmp/wordshift-cinematic';
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
};

export function serve(port = 0) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(MOBILE, rel);
    if (!file.startsWith(MOBILE)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

export const SIZES = { '16x9': [1920, 1080], '9x16': [1080, 1920] };

export async function openTrailer(browser, port, aspect, scale = 1) {
  const [w, h] = SIZES[aspect];
  const page = await browser.newPage({ viewport: { width: Math.round(w * scale), height: Math.round(h * scale) }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/scripts/store/cinematic/index.html?mode=capture&aspect=${aspect}&scale=${scale}${process.env.CINEMATIC_QS || ''}`);
  await page.waitForFunction(() => window.TRAILER && window.TRAILER.isReady === true, null, { timeout: 180000 });
  return page;
}

export function launch() {
  return chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-driver-bug-workarounds'],
  });
}

async function renderFrames(page, frames, dir, fps, quality) {
  let done = 0; const t0 = Date.now();
  for (const f of frames) {
    const out = path.join(dir, String(f).padStart(5, '0') + '.jpg');
    const b64 = await page.evaluate(async ([t, q]) => { await window.TRAILER.renderAt(t); return window.TRAILER.grab(q); }, [f / fps, quality]);
    fs.writeFileSync(out + '.tmp', Buffer.from(b64, 'base64'));
    fs.renameSync(out + '.tmp', out);
    done++;
    if (done % 30 === 0) {
      const per = (Date.now() - t0) / done;
      console.log(`${path.basename(dir)} ${done}/${frames.length} frames, ${per.toFixed(0)} ms/frame, ~${((frames.length - done) * per / 60000).toFixed(1)} min left`);
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const aspect = argv.find((a) => SIZES[a]) || '16x9';
  const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
  const scale = opt.scale ? Number(opt.scale) : 1;
  const workers = opt.workers ? Number(opt.workers) : 1;
  const server = await serve();
  const port = server.address().port;
  const browser = await launch();
  try {
    const probe = await openTrailer(browser, port, aspect, scale);
    const { duration, fps } = await probe.evaluate(() => ({ duration: window.TRAILER.duration, fps: window.TRAILER.fps }));
    const total = Math.round(duration * fps);

    if (opt.stills) {
      const dir = path.join(WORK, `stills-${aspect}`);
      fs.mkdirSync(dir, { recursive: true });
      for (const s of String(opt.stills).split(',')) {
        const t = Number(s);
        const b64 = await probe.evaluate(async (tt) => { await window.TRAILER.renderAt(tt); return window.TRAILER.grab(0.95); }, t);
        const out = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        console.log(out);
      }
      return;
    }

    const dir = path.join(WORK, `frames-${aspect}${scale !== 1 ? '-draft' : ''}`);
    fs.mkdirSync(dir, { recursive: true });
    const from = opt.from ? Number(opt.from) : 0;
    const to = opt.to ? Math.min(total, Number(opt.to)) : total;
    const todo = [];
    for (let f = from; f < to; f++) {
      if (opt.force || !fs.existsSync(path.join(dir, String(f).padStart(5, '0') + '.jpg'))) todo.push(f);
    }
    console.log(`${aspect}: ${total} frames at ${fps} fps, ${todo.length} to render with ${workers} worker(s) into ${dir}`);
    const quality = opt.quality ? Number(opt.quality) : 0.96;
    const pages = [probe];
    for (let i = 1; i < workers; i++) pages.push(await openTrailer(browser, port, aspect, scale));
    // Interleave so each worker walks the timeline in order (texture caches stay warm).
    const chunk = Math.ceil(todo.length / workers);
    await Promise.all(pages.map((p, i) => renderFrames(p, todo.slice(i * chunk, (i + 1) * chunk), dir, fps, quality)));
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ aspect, fps, total, scale }, null, 1));
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
