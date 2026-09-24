/**
 * docs/ is BOTH the GitHub Pages source and the repo's internal docs folder.
 * Jekyll publishes every file there that docs/_config.yml does not exclude, so
 * an internal doc (story spoilers, open defects, press fast-forward codes)
 * added without an exclude entry goes live beside the privacy link players tap
 * from Settings (launch readiness finding SPL-1).
 *
 * This guard makes that impossible to do silently: every top-level file or
 * folder in docs/ must be either one of the public pages (or an asset those
 * pages actually reference) or be listed by EXACT name in the exclude list.
 * The globs in the list are a second net for Jekyll only; they never satisfy
 * this test, so a new doc fails CI until someone deliberately lists it.
 */
import * as fs from 'fs';
import * as path from 'path';

const DOCS = path.resolve(__dirname, '../../../docs');
const CONFIG = path.join(DOCS, '_config.yml');

/** The four public pages. Their URLs are wired into the app and the store listing. */
const PUBLIC_PAGES = ['index.md', 'privacy-policy.md', 'terms.md', 'data-deletion.md'];
/** Published on purpose when present (AdMob verification). */
// CNAME is written by GitHub when a custom domain is set in Settings > Pages.
const OPTIONAL_PUBLIC = ['app-ads.txt', 'CNAME'];

function readExcludes(): string[] {
  const lines = fs.readFileSync(CONFIG, 'utf8').split('\n');
  const start = lines.findIndex((l) => /^exclude:\s*$/.test(l));
  expect(start).toBeGreaterThanOrEqual(0);
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // next top-level key
    const m = line.match(/^\s*-\s*(?:"([^"]+)"|'([^']+)'|([^#\s][^#]*?))\s*(?:#.*)?$/);
    if (m) out.push((m[1] ?? m[2] ?? m[3]).trim());
  }
  return out;
}

/** Minimal fnmatch for Jekyll's glob entries (*, ?, [..]). */
function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '[') {
      const end = glob.indexOf(']', i);
      re += glob.slice(i, end + 1);
      i = end;
    } else re += c.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** Local assets (images, stylesheets) the public pages reference. */
function publicPageAssets(): Set<string> {
  const assets = new Set<string>();
  for (const page of PUBLIC_PAGES) {
    const text = fs.readFileSync(path.join(DOCS, page), 'utf8');
    const refs = [
      ...text.matchAll(/\]\(([^)\s]+)\)/g),
      ...text.matchAll(/(?:src|href)=["']([^"']+)["']/g),
    ].map((m) => m[1]);
    for (const ref of refs) {
      if (/^[a-z]+:|^#|^\.\.?\/?$/i.test(ref)) continue;
      const clean = ref.replace(/^\.\//, '').replace(/[?#].*$/, '');
      if (/\.[a-z0-9]+$/i.test(clean) && !clean.endsWith('.md')) {
        assets.add(clean.split('/')[0]);
      }
    }
  }
  return assets;
}

describe('docs/ GitHub Pages publication', () => {
  const excludes = readExcludes();
  const exact = new Set(excludes.filter((e) => !/[*?[]/.test(e)).map((e) => e.replace(/\/$/, '')));
  const globs = excludes.filter((e) => /[*?[]/.test(e)).map(globToRegExp);

  it('publishes each public page and never excludes one', () => {
    for (const page of PUBLIC_PAGES) {
      expect(fs.existsSync(path.join(DOCS, page))).toBe(true);
      expect(exact.has(page)).toBe(false);
      expect(globs.some((g) => g.test(page))).toBe(false);
    }
  });

  it('lists every internal file and folder in docs/ by exact name', () => {
    const allowed = new Set([...PUBLIC_PAGES, ...OPTIONAL_PUBLIC, ...publicPageAssets()]);
    const unlisted = fs
      .readdirSync(DOCS)
      // Jekyll never publishes names starting with '_' or '.' (e.g. _config.yml).
      .filter((name) => !/^[_.]/.test(name))
      .filter((name) => !allowed.has(name) && !exact.has(name));
    // A failure here means: add the name to docs/_config.yml's exclude list
    // (or, for a genuinely public page, to PUBLIC_PAGES above).
    expect(unlisted).toEqual([]);
  });

  it('keeps the pages the app links to at their published names', () => {
    const links = fs.readFileSync(path.resolve(__dirname, '../constants/links.ts'), 'utf8');
    for (const slug of ['privacy-policy', 'terms', 'data-deletion']) {
      if (links.includes(slug)) expect(fs.existsSync(path.join(DOCS, `${slug}.md`))).toBe(true);
    }
  });
});
