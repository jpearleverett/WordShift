/**
 * Geometry guards for the generated cottage icon sets: the shop's purchasables
 * (assets/ui/shop, scripts/tools/generateShopIcons.mjs), the store's
 * purchasables (assets/ui/store, scripts/tools/generateStoreIcons.mjs), and the
 * game-surface families drawn by scripts/tools/generateGameIcons.mjs
 * (achievement crests, quest icons, difficulty seals, rules diagrams, the two
 * empty-state spots, and the flat chrome glyphs it added to assets/ui).
 *
 * These exist because a blind art review caught a defect class that is invisible
 * in a diff and easy to reintroduce: a subject drawn slightly too large reaches
 * its canvas edge, where it loses both its contour and its contact-shadow gap.
 * In a shop row that reads as a sheared silhouette, or as one item sitting a
 * step lower than its neighbours. Eleven of the fifty-eight icons had it at one
 * point, one of them clipped on BOTH sides, so a mechanical check earns its keep.
 *
 * Uses sharp, which is already a devDependency (encodeBackgroundsWebp.mjs, the
 * asset tools and skyGeometry.test.ts all decode real files the same way).
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Both generated sets, checked by the same rules. The store set is drawn by a
 * different script but sits in the same rows at the same size, so it inherits
 * the same defect class (and the same guard) rather than being trusted because
 * its generator is newer.
 */
type IconSet = {
  set: string;
  dir: string;
  /** Every icon in the set is drawn at this size so its row never upscales. */
  size: number;
  /** Painted-alpha coverage floor (a blank icon passes the edge check trivially). */
  minCoverage: number;
  /** Restrict to these basenames (for a set that shares its folder with older art). */
  only?: string[];
  /** Skip these basenames (a folder that also holds a differently-sized set). */
  exclude?: string[];
};
const CEREMONY_FILES = ['ceremony_curious.png', 'ceremony_deeper.png', 'ceremony_shadows.png'];
const ui = (rel: string) => path.resolve(__dirname, '../../assets/ui', rel);
const ICON_SETS: ReadonlyArray<IconSet> = [
  { set: 'shop', dir: ui('shop'), size: 192, minCoverage: 0.12 },
  { set: 'store', dir: ui('store'), size: 192, minCoverage: 0.12 },
  // generateGameIcons.mjs families (see gameArt.test.ts for the registries).
  { set: 'achievements', dir: ui('achievements'), size: 192, minCoverage: 0.12 },
  { set: 'quests', dir: ui('quests'), size: 192, minCoverage: 0.12 },
  { set: 'difficulty', dir: ui('difficulty'), size: 192, minCoverage: 0.12 },
  { set: 'rules', dir: ui('rules'), size: 192, minCoverage: 0.12 },
  { set: 'spots', dir: ui('spots'), size: 256, minCoverage: 0.12, exclude: CEREMONY_FILES },
  // The phase 1-3 ceremony emblems share the spots folder at 512px.
  { set: 'ceremony', dir: ui('spots'), size: 512, minCoverage: 0.1, only: CEREMONY_FILES },
  // The chrome glyphs live flat beside the older 256px candy set, whose files
  // predate these rules, so only the generateGameIcons ones are checked.
  {
    set: 'chrome',
    dir: ui('.'),
    size: 256,
    minCoverage: 0.1,
    only: ['sun.png', 'hourglass.png', 'book_closed.png', 'book_open.png', 'season_pass.png', 'rules.png', 'shop_sign.png', 'clover.png', 'ribbon.png'],
  },
  // The smallest marks (12-24dp) are mostly air by design: a chevron or a
  // tick cannot fill 10% of its frame without turning into a blob.
  {
    set: 'chrome-marks',
    dir: ui('.'),
    size: 256,
    minCoverage: 0.06,
    only: ['check.png', 'check_badge.png', 'chevron.png', 'alert_pip.png', 'play.png', 'star_bullet.png', 'close.png', 'cycle_loop.png', 'ledger_quill.png', 'word_echo.png', 'paper_plane.png'],
  },
];
/** Alpha above this counts as painted; below it is anti-aliasing tail. */
const ALPHA_FLOOR = 8;

/** [label, absolute path] for every PNG in both sets, so a failure names the set. */
const files: Array<[string, string, number, number]> = ICON_SETS.flatMap(({ set, dir, size, minCoverage, only, exclude }) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.png') && (!only || only.includes(f)) && !(exclude && exclude.includes(f)))
    .sort()
    .map((f) => [`${set}/${f}`, path.join(dir, f), size, minCoverage] as [string, string, number, number]),
);

describe('generated icon geometry', () => {
  it('has icons from every set to check', () => {
    for (const { set } of ICON_SETS) {
      expect({ set, found: files.some(([label]) => label.startsWith(`${set}/`)) }).toEqual({
        set,
        found: true,
      });
    }
  });

  it.each(files)('%s is drawn at its set size with transparent edges and real content', async (file, filePath, size, minCoverage) => {
    const { data, info } = await sharp(filePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: c } = info;

    expect(`${file}:${w}x${h}`).toBe(`${file}:${size}x${size}`);

    const alphaAt = (x: number, y: number) => data[(y * w + x) * c + 3];
    let top = 0;
    let bottom = 0;
    let left = 0;
    let right = 0;
    for (let x = 0; x < w; x++) {
      if (alphaAt(x, 0) > ALPHA_FLOOR) top++;
      if (alphaAt(x, h - 1) > ALPHA_FLOOR) bottom++;
    }
    for (let y = 0; y < h; y++) {
      if (alphaAt(0, y) > ALPHA_FLOOR) left++;
      if (alphaAt(w - 1, y) > ALPHA_FLOOR) right++;
    }
    // Compared as one object so a failure names the file and every offending
    // side at once, rather than stopping at the first bad edge.
    expect({ file, top, bottom, left, right }).toEqual({ file, top: 0, bottom: 0, left: 0, right: 0 });

    // A blank or near-blank icon would pass the edge check trivially, so also
    // require the subject to actually fill the frame the way the set does.
    let painted = 0;
    for (let i = 3; i < data.length; i += c) if (data[i] > 128) painted++;
    const coverage = painted / (w * h);
    expect({ file, tooSparse: coverage < minCoverage }).toEqual({ file, tooSparse: false });
  });
});
