// Guards for the rules the page lives under: strict CSP with Trusted Types and
// no policy, no dashes in copy, nothing fetched from anywhere but this origin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC = join(ROOT, 'public');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const publicFiles = walk(PUBLIC);
const fixtureFiles = [...walk(join(ROOT, 'test', 'fixtures')), ...walk(join(ROOT, 'fixtures'))].filter((p) => p.endsWith('.json'));
const rel = (p) => relative(ROOT, p);

test('public/ has the files the server allowlists', () => {
  const names = publicFiles.map(rel).sort();
  for (const expected of ['public/index.html', 'public/login.html', 'public/app.css', 'public/app.js', 'public/favicon.svg', 'public/manifest.webmanifest']) {
    assert.ok(names.includes(expected), expected);
  }
  for (const p of names) {
    assert.match(p, /^public\/(js\/)?[a-z.]+\.(html|js|css|svg|webmanifest)$/, `${p} is not servable by the static allowlist`);
  }
});

test('no em dash or en dash anywhere in public/ or the fixtures', () => {
  for (const p of [...publicFiles, ...fixtureFiles]) {
    const text = readFileSync(p, 'utf8');
    assert.ok(!/[–—]/.test(text), `${rel(p)} contains an em or en dash`);
  }
});

test('no HTML string sinks or dynamic code (Trusted Types has no policy)', () => {
  const banned = [/\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/, /document\.write/, /\beval\s*\(/, /new\s+Function\b/, /setTimeout\(\s*['"`]/, /setInterval\(\s*['"`]/, /\.srcdoc\b/];
  for (const p of publicFiles.filter((f) => /\.(js|html)$/.test(f))) {
    const text = readFileSync(p, 'utf8');
    for (const re of banned) assert.ok(!re.test(text), `${rel(p)} matches ${re}`);
  }
});

test('HTML has no inline scripts, handlers or style attributes', () => {
  for (const p of publicFiles.filter((f) => f.endsWith('.html'))) {
    const text = readFileSync(p, 'utf8');
    assert.ok(!/\son[a-z]+\s*=/i.test(text), `${rel(p)} has an inline event handler`);
    assert.ok(!/\sstyle\s*=/i.test(text), `${rel(p)} has a style attribute`);
    for (const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      assert.match(m[1], /\ssrc="\/[a-z.]+\.js"/, `${rel(p)} has a script without a same-origin src`);
      assert.match(m[1], /type="module"/, `${rel(p)} script is not a module`);
      assert.equal(m[2].trim(), '', `${rel(p)} has inline script text`);
    }
    assert.ok(!/<style\b/i.test(text), `${rel(p)} has an inline style block`);
  }
});

test('scripts never set a style attribute string (CSP blocks it; CSSOM is fine)', () => {
  for (const p of publicFiles.filter((f) => f.endsWith('.js'))) {
    const text = readFileSync(p, 'utf8');
    assert.ok(!/setAttribute\(\s*['"]style['"]/.test(text), `${rel(p)} sets a style attribute`);
    assert.ok(!/\.style\.cssText/.test(text), `${rel(p)} writes cssText`);
  }
});

test('nothing loads from another origin', () => {
  // The SVG namespace is an identifier, not a request.
  const allowed = new Set(['http://www.w3.org/2000/svg']);
  for (const p of publicFiles) {
    const text = readFileSync(p, 'utf8');
    for (const m of text.matchAll(/\bhttps?:\/\/[^\s"'`)<>]+/g)) {
      assert.ok(allowed.has(m[0]), `${rel(p)} references ${m[0]}`);
    }
    if (p.endsWith('.css')) assert.ok(!/@import|url\(/.test(text), `${rel(p)} imports or fetches from CSS`);
    assert.ok(!/\bimport\s*\(/.test(text), `${rel(p)} uses a dynamic import`);
  }
});

test('module imports are relative and stay inside public/', () => {
  for (const p of publicFiles.filter((f) => f.endsWith('.js'))) {
    const text = readFileSync(p, 'utf8');
    for (const m of text.matchAll(/^import\s[^;]*?from\s+['"]([^'"]+)['"]/gm)) {
      assert.match(m[1], /^\.\.?\/[a-z/]+\.js$/, `${rel(p)} imports ${m[1]}`);
    }
  }
});

test('login template has exactly one message placeholder and posts to /login', () => {
  const text = readFileSync(join(PUBLIC, 'login.html'), 'utf8');
  assert.equal(text.split('{{MESSAGE}}').length - 1, 1);
  assert.match(text, /<form method="post" action="\/login"/);
  assert.match(text, /name="password"[^>]*autocomplete="current-password"/);
  assert.ok(!/<script/i.test(text), 'the sign-in page needs no script');
});

test('index has one h1, a heading per section and a sign-out form', () => {
  const text = readFileSync(join(PUBLIC, 'index.html'), 'utf8');
  assert.equal((text.match(/<h1\b/g) || []).length, 1);
  assert.match(text, /<form method="post" action="\/logout"/);
  for (const id of ['sec-now', 'sec-today', 'sec-installs', 'sec-funnel', 'sec-retention', 'sec-story', 'sec-money', 'sec-health', 'sec-daily', 'sec-builds', 'sec-links', 'sec-glossary']) {
    assert.match(text, new RegExp(`<section class="card" id="${id}" aria-labelledby="h-`), id);
  }
});
