/**
 * Geometry guards for the generated shop icons (assets/ui/shop, drawn by
 * scripts/tools/generateShopIcons.mjs).
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

const SHOP_DIR = path.resolve(__dirname, '../../assets/ui/shop');

/** Every icon is drawn at this size so a ~56dp row thumbnail never upscales. */
const EXPECTED_SIZE = 192;
/** Alpha above this counts as painted; below it is anti-aliasing tail. */
const ALPHA_FLOOR = 8;

const files = fs
  .readdirSync(SHOP_DIR)
  .filter((f) => f.endsWith('.png'))
  .sort();

describe('shop icon geometry', () => {
  it('has at least one icon to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is 192x192 with transparent edges and real content', async (file) => {
    const { data, info } = await sharp(path.join(SHOP_DIR, file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: c } = info;

    expect(`${file}:${w}x${h}`).toBe(`${file}:${EXPECTED_SIZE}x${EXPECTED_SIZE}`);

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
    expect({ file, tooSparse: coverage < 0.12 }).toEqual({ file, tooSparse: false });
  });
});
