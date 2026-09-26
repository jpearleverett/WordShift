// Allowlisted static files, read once at startup from public/ (top level) and
// public/js/ (top level). Requests are matched against this map by exact
// path; no request input is ever joined into a filesystem path.
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { CONTENT_TYPES } from './security.js';

const ALLOWED_EXTENSIONS = new Set(['.html', '.js', '.css', '.svg', '.webmanifest']);
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,100}$/;
// Served without a session: the login page needs them.
export const PUBLIC_STATIC = new Set(['/app.css', '/favicon.svg', '/manifest.webmanifest']);

const FALLBACK_LOGIN = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WordShift live</title><link rel="stylesheet" href="/app.css"></head>
<body><main><h1>WordShift live</h1>
<form method="post" action="/login">
<input type="text" name="username" value="owner" autocomplete="username" hidden>
<label>Password <input type="password" name="password" autocomplete="current-password" required></label>
<button type="submit">Sign in</button></form>
<p>{{MESSAGE}}</p><p>Private dashboard.</p></main></body></html>
`;

async function listFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && SAFE_NAME.test(e.name) && ALLOWED_EXTENSIONS.has(extname(e.name))).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * @returns {Promise<{ files: Map<string, { body: Buffer, type: string }>, index: Buffer | null, loginTemplate: string }>}
 */
export async function loadStatic(publicDir) {
  const files = new Map();
  let index = null;
  let loginTemplate = FALLBACK_LOGIN;
  for (const name of await listFiles(publicDir)) {
    const body = await readFile(join(publicDir, name));
    if (name === 'index.html') index = body;
    else if (name === 'login.html') {
      const text = body.toString('utf8');
      if (text.includes('{{MESSAGE}}')) loginTemplate = text;
    } else files.set(`/${name}`, { body, type: CONTENT_TYPES[extname(name)] });
  }
  for (const name of await listFiles(join(publicDir, 'js'))) {
    if (extname(name) !== '.js') continue;
    files.set(`/js/${name}`, { body: await readFile(join(publicDir, 'js', name)), type: CONTENT_TYPES['.js'] });
  }
  return { files, index, loginTemplate };
}
