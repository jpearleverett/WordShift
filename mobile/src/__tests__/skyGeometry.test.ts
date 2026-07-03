/**
 * Sky/house geometry tripwires.
 *
 * The home screen's "house sits just below the river" fix rests on three
 * facts that live in different places and can silently drift apart:
 *
 *   1. All five sky assets are 941x1972, where rows 1672-1971 are a mirrored
 *      meadow extension and the river never reaches below row ~1335 in any
 *      variant (measured via pngjs scans of every sky).
 *   2. HouseWorld anchors the sky Image to the container BOTTOM with a box
 *      height that forces height-driven cover scaling, so the art's bottom
 *      row sits exactly on the container bottom on every device (no fill
 *      band, device-independent seat math).
 *   3. The house column's bottom margins put the foundation top at image
 *      rows ~1360-1470 across real devices — below the river, on the meadow.
 *
 * HouseWorld.tsx can't be imported in the Node test env (it pulls the full
 * native surface), so — following the appIntegration.test.ts precedent —
 * facts 2-3 are pinned by source scan + replicated math.
 */

import fs from 'fs';
import path from 'path';

const ENV_DIR = path.resolve(__dirname, '../../assets/environment');
const HOUSE_WORLD = fs.readFileSync(
  path.resolve(__dirname, '../components/home/HouseWorld.tsx'),
  'utf8'
);

const SKIES = ['sky_day', 'sky_afternoon', 'sky_dusk', 'sky_storm', 'sky_shadow'];

/** Read a PNG's dimensions straight from the IHDR chunk (no image lib needed). */
function pngDimensions(file: string): { width: number; height: number } {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(24);
  fs.readSync(fd, buf, 0, 24, 0);
  fs.closeSync(fd);
  // bytes 0-7 signature, 8-15 IHDR length+type, 16-19 width, 20-23 height
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('sky asset dimensions', () => {
  test.each(SKIES)('%s.png is 941x1972 (meadow-extended)', (name) => {
    const dims = pngDimensions(path.join(ENV_DIR, `${name}.png`));
    expect(dims).toEqual({ width: 941, height: 1972 });
  });
});

describe('HouseWorld sky anchoring', () => {
  test('sky image constants match the real assets', () => {
    expect(HOUSE_WORLD).toMatch(/const SKY_IMG_WIDTH = 941;/);
    expect(HOUSE_WORLD).toMatch(/const SKY_IMG_HEIGHT = 1972;/);
  });

  test('sky box is bottom-anchored with height-driven cover scaling', () => {
    // The box height must beat width-driven scaling so the art's full height
    // maps onto the box and its bottom row lands on the container bottom.
    expect(HOUSE_WORLD).toMatch(
      /const SKY_BOX_HEIGHT = Math\.max\(\s*SCREEN_HEIGHT,\s*Math\.ceil\(SCREEN_WIDTH \* \(SKY_IMG_HEIGHT \/ SKY_IMG_WIDTH\)\) \+ 2,\s*940,?\s*\);/
    );
    const skyStyle = HOUSE_WORLD.slice(
      HOUSE_WORLD.indexOf('skyBackground: {'),
      HOUSE_WORLD.indexOf('},', HOUSE_WORLD.indexOf('skyBackground: {'))
    );
    expect(skyStyle).toContain('bottom: 0');
    expect(skyStyle).toContain('height: SKY_BOX_HEIGHT');
    expect(skyStyle).not.toContain('top:');
  });

  test('the tuck/offset era stays gone (top-anchored sky broke house-vs-art alignment)', () => {
    expect(HOUSE_WORLD).not.toMatch(/SKY_BOTTOM_TUCK/);
  });

  test('house-vs-art seat margins stay pinned', () => {
    expect(HOUSE_WORLD).toMatch(/const HOUSE_BOTTOM_MARGIN = 30;/);
    expect(HOUSE_WORLD).toMatch(/const PIT_DOCK_CLEARANCE = 80;/);
  });
});

describe('phase lighting settles the house into each sky', () => {
  test('per-phase tint + contact-shadow maps exist for all six phases', () => {
    const tint = HOUSE_WORLD.slice(
      HOUSE_WORLD.indexOf('PHASE_HOUSE_TINT'),
      HOUSE_WORLD.indexOf('CONTACT_SHADOW')
    );
    const shadow = HOUSE_WORLD.slice(
      HOUSE_WORLD.indexOf('const CONTACT_SHADOW'),
      HOUSE_WORLD.indexOf('};', HOUSE_WORLD.indexOf('const CONTACT_SHADOW'))
    );
    for (let p = 0; p <= 5; p++) {
      expect(tint).toMatch(new RegExp(`\\n  ${p}: \\{`));
      expect(shadow).toMatch(new RegExp(`\\n  ${p}: \\{`));
    }
    // Phase 0 (day) must stay untouched.
    expect(tint).toMatch(/0: \{ color: '#000000', ext: 0, room: 0 \}/);
  });

  test('roof / foundation / pit carry a same-source tintColor overlay', () => {
    // tintColor on a same-source Image follows the art alpha exactly; there
    // must be one guarded overlay per silhouette piece.
    const overlays = HOUSE_WORLD.match(/styles\.tintFill, \{ tintColor: houseTint\.color/g) || [];
    expect(overlays.length).toBeGreaterThanOrEqual(3);
  });

  test('the two body scrims tint wall/frame fully but rooms at ~half', () => {
    expect(HOUSE_WORLD).toMatch(/const wallTintOpacity =/);
    expect(HOUSE_WORLD).toMatch(/styles\.bodyScrim, \{ backgroundColor: houseTint\.color, opacity: wallTintOpacity \}/);
    expect(HOUSE_WORLD).toMatch(/styles\.bodyRoomScrim, \{ backgroundColor: houseTint\.color, opacity: houseTint\.room \}/);
  });
});

describe('foundation seats below the river on real devices', () => {
  // Replicates HouseWorld's bottom-anchored seat math. If any constant in
  // HouseWorld changes (margins, pit size, foundation height, sky dims),
  // update BOTH places — this test failing means the house may be back in
  // the river on some device.
  const IMG_W = 941;
  const IMG_H = 1972;
  const RIVER_BOTTOM_ROW = 1335; // lowest river/bank pixel across all 5 skies
  const HOUSE_BOTTOM_MARGIN = 30;
  const PIT_DOCK_CLEARANCE = 80;
  const PIT_BLOCK = 137; // pit height 153 + marginTop -16 (PIT_FLOW_HEIGHT)
  const FOUNDATION_H = 42; // 282 * (118/792)

  const foundationTopArtRow = (sw: number, sh: number) => {
    const boxH = Math.max(sh, Math.ceil(sw * (IMG_H / IMG_W)) + 2, 940);
    const scale = boxH / IMG_H;
    const foundationTopDp =
      HOUSE_BOTTOM_MARGIN + PIT_DOCK_CLEARANCE + PIT_BLOCK + FOUNDATION_H; // above container bottom
    return IMG_H - foundationTopDp / scale;
  };

  test.each([
    [320, 640],
    [360, 640],
    [360, 800],
    [393, 852],
    [411, 915],
    [428, 926],
  ])('at %ix%idp the foundation top is below the river', (sw, sh) => {
    expect(foundationTopArtRow(sw, sh)).toBeGreaterThan(RIVER_BOTTOM_ROW);
  });
});
