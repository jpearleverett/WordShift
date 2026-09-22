/**
 * Every asset the app require()s must be covered by app.json's
 * assetBundlePatterns.
 *
 * `assetBundlePatterns` is an explicit ALLOWLIST, not a default-everything
 * rule: it was narrowed from ['**\/*'] to eight named patterns on 2026-07-24 to
 * keep assets/raw and assets/Play_store out of the binary. Nothing re-checked
 * it afterwards, so an asset family added LATER simply was not listed. That is
 * exactly what happened to the story scene art: src/components/storyArt.ts
 * landed 2026-09-06 requiring assets/story/optimized/*.webp, six weeks after
 * the allowlist was written, and no pattern covered it. Those seven images are
 * the finale's illustrated scenes, so the failure mode was a blank Arrival on
 * the most important screen in the game.
 *
 * This test derives the requirement from the source rather than restating it:
 * it reads every require() of an assets/ path out of src/ and App.tsx, and
 * fails if any resolved path is unmatched. A new asset directory therefore
 * cannot ship unbundled, and this guard needs no edit when one is added.
 */
import fs from 'fs';
import path from 'path';
import appJson from '../../app.json';

const MOBILE_ROOT = path.resolve(__dirname, '../..');
const SCAN_ROOTS = [path.join(MOBILE_ROOT, 'src'), path.join(MOBILE_ROOT, 'App.tsx')];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

/** Collect every .ts/.tsx file under the scan roots (tests excluded: they may reference unbundled raws). */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (target: string) => {
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (SOURCE_EXTENSIONS.has(path.extname(target))) out.push(target);
      return;
    }
    for (const entry of fs.readdirSync(target)) {
      if (entry === '__tests__' || entry === '__mocks__') continue;
      walk(path.join(target, entry));
    }
  };
  SCAN_ROOTS.forEach(walk);
  return out;
}

/**
 * Resolve every require('...assets/...') literal to its path relative to
 * mobile/, the form assetBundlePatterns is written in.
 */
function requiredAssetPaths(): Map<string, string[]> {
  const byAsset = new Map<string, string[]>();
  for (const file of sourceFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.matchAll(/require\(\s*'([^']*assets\/[^']+)'\s*\)/g);
    for (const match of matches) {
      const resolved = path.resolve(path.dirname(file), match[1]);
      const relative = path.relative(MOBILE_ROOT, resolved).split(path.sep).join('/');
      const owners = byAsset.get(relative) ?? [];
      owners.push(path.relative(MOBILE_ROOT, file).split(path.sep).join('/'));
      byAsset.set(relative, owners);
    }
  }
  return byAsset;
}

/** Minimal glob matcher for the '**' / '*' forms assetBundlePatterns uses. */
function globToRegExp(pattern: string): RegExp {
  let source = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith('**', i)) {
      source += '.*';
      i += 2;
    } else if (pattern[i] === '*') {
      source += '[^/]*';
      i += 1;
    } else {
      source += pattern[i].replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${source}$`);
}

describe('asset bundle coverage', () => {
  const patterns: string[] = appJson.expo.assetBundlePatterns;
  const matchers = patterns.map(globToRegExp);
  const covered = (assetPath: string) => matchers.some((re) => re.test(assetPath));

  test('the scan finds the app assets at all (guards against a silently empty sweep)', () => {
    const assets = requiredAssetPaths();
    expect(assets.size).toBeGreaterThan(50);
    expect([...assets.keys()].some((p) => p.startsWith('assets/characters/'))).toBe(true);
  });

  test('every require()d asset is covered by an assetBundlePatterns entry', () => {
    const uncovered = [...requiredAssetPaths().entries()]
      .filter(([assetPath]) => !covered(assetPath))
      .map(([assetPath, owners]) => `${assetPath} (required by ${owners.join(', ')})`);
    expect(uncovered).toEqual([]);
  });

  test('the story scene art is bundled (its absence shipped the finale blank)', () => {
    expect(patterns).toContain('assets/story/optimized/**');
    expect(patterns).toContain('assets/story/pages/**');
    // The painted masters are optimizeStoryAssets.mjs inputs, not shipped art.
    expect(covered('assets/story/outward-road.png')).toBe(false);
    expect(covered('assets/story/optimized/outward-road-hero.webp')).toBe(true);
  });

  test('assets/raw stays OUT of the bundle (authoring sources, not shipped)', () => {
    expect(covered('assets/raw/music/home_phase0.mp3')).toBe(false);
    expect(covered('assets/raw/app_icon_source.png')).toBe(false);
  });

  test('the Play Store listing pack stays OUT of the bundle', () => {
    expect(covered('assets/Play_store/launch-2026-09/upload/store-icon-512.png')).toBe(false);
  });
});
