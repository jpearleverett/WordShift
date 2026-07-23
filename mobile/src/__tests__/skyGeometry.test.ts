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

/**
 * Read a WebP's dimensions from its header (no image lib needed). The skies
 * ship as WebP (the ~15MB->~1.5MB install-size win); sharp writes them as the
 * simple lossy `VP8 ` variant, but this handles VP8/VP8L/VP8X so the tripwire
 * survives a future re-encode to any variant.
 */
function webpDimensions(file: string): { width: number; height: number } {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(30);
  fs.readSync(fd, buf, 0, 30, 0);
  fs.closeSync(fd);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error(`${file}: not a WebP`);
  }
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') {
    // Lossy: 14-bit width/height little-endian after the 3-byte start code.
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8X') {
    // Extended: 24-bit LE canvas (width-1) at 24, (height-1) at 27.
    return {
      width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
      height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
    };
  }
  if (fourcc === 'VP8L') {
    // Lossless: after the 0x2f signature, 14-bit (width-1) then (height-1).
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  throw new Error(`${file}: unknown WebP variant ${fourcc}`);
}

describe('sky asset dimensions', () => {
  test.each(SKIES)('%s.webp is 941x1972 (meadow-extended)', (name) => {
    const dims = webpDimensions(path.join(ENV_DIR, `${name}.webp`));
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

  test('the pan hard-floors at the pit end (art never lifts off the container bottom)', () => {
    // The sky is bottom-anchored, so overscrolling PAST the pit end (translateY
    // < 0) would lift the scene and expose the flat ground fill beneath the art
    // ("green beneath the background"). The drag clamps the bottom to a hard 0
    // (Math.max(0, rubberBandPanY(...))) and the settle drops its seeded velocity
    // at the floor, so only the roof end can overscroll (into seamless sky bg).
    expect(HOUSE_WORLD).toMatch(/Math\.max\(0,\s*rubberBandPanY\(/);
    expect(HOUSE_WORLD).toMatch(/velocity:\s*settleTarget\s*<=\s*0\s*\?\s*0\s*:\s*velocityY/);
  });

  test('house-vs-art seat margins stay pinned', () => {
    expect(HOUSE_WORLD).toMatch(/const HOUSE_BOTTOM_MARGIN = 30;/);
    expect(HOUSE_WORLD).toMatch(/const PIT_DOCK_CLEARANCE = 80;/);
  });

  test('the panned diorama is promoted to a cached GPU texture (scroll-flicker fix)', () => {
    // The pan drives one translateY on the transformContainer. Without a cached
    // layer, Fabric/Android re-composites all of its overlapping/negative-z
    // children (full-bleed sky + ground + body scrims) every frame, which
    // shimmers while scrolling. Rasterizing the subtree turns that per-frame
    // recomposite into a per-frame texture blit. Both platform hints must ride
    // the SAME Animated.View that carries the translateY transform.
    const containerStart = HOUSE_WORLD.indexOf(
      '<Animated.View',
      HOUSE_WORLD.indexOf('styles.gestureContainer')
    );
    const container = HOUSE_WORLD.slice(
      containerStart,
      HOUSE_WORLD.indexOf('transform: [', containerStart)
    );
    expect(container).toContain('renderToHardwareTextureAndroid');
    expect(container).toContain('shouldRasterizeIOS');
  });

  test('the ambient particle system is a memoized child (never re-renders the pan scene)', () => {
    // The ~2s particle spawn setState must NOT live on HouseWorld — a spawn tick
    // would re-commit the pan transform (stale JS value mid-settle) and
    // invalidate the cached texture above. It lives in a memoized child.
    expect(HOUSE_WORLD).toMatch(/const AmbientParticles: React\.FC<[^>]*>\s*=\s*React\.memo\(/);
    // And HouseWorld must render that child rather than mapping particles inline.
    expect(HOUSE_WORLD).toMatch(/<AmbientParticles\b/);
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

  test('roof + pit carry a same-source tintColor overlay (foundation is per-phase art)', () => {
    // tintColor on a same-source Image follows the art alpha exactly. The
    // foundation is now hand-lit per phase (no tint overlay), so only the
    // single-asset roof and pit are programmatically tinted.
    const overlays = HOUSE_WORLD.match(/styles\.tintFill, \{ tintColor: houseTint\.color/g) || [];
    expect(overlays.length).toBeGreaterThanOrEqual(2);
  });

  test('the two body scrims tint wall/frame fully but rooms at ~half', () => {
    expect(HOUSE_WORLD).toMatch(/const wallTintOpacity =/);
    expect(HOUSE_WORLD).toMatch(/styles\.bodyScrim, \{ backgroundColor: houseTint\.color, opacity: wallTintOpacity \}/);
    expect(HOUSE_WORLD).toMatch(/styles\.bodyRoomScrim, \{ backgroundColor: houseTint\.color, opacity: houseTint\.room \}/);
  });

  test('the house is grounded (grass baked into the foundation + soft contact shadow)', () => {
    // The grass tufts live in the foundation art now (not a separate fringe),
    // so the old fringe asset/require must be gone; a soft contact band remains.
    expect(fs.existsSync(path.join(ENV_DIR, 'grass_fringe.png'))).toBe(false);
    expect(HOUSE_WORLD).not.toMatch(/GRASS_FRINGE_IMG/);
    expect(fs.existsSync(path.join(ENV_DIR, 'house_shadow.png'))).toBe(true);
    expect(HOUSE_WORLD).toMatch(/HOUSE_SHADOW_IMG/);
  });
});

describe('phase-appropriate room windows', () => {
  const ROOM_VIEW = fs.readFileSync(
    path.resolve(__dirname, '../components/home/RoomView.tsx'),
    'utf8'
  );
  // Room THEME -> window-mask filename. The filename matches the theme except
  // for the descent trio, whose masks are named for their art file
  // (star_loft = observatory, belfry = workshop, sky_garden = rainforest).
  const WINDOW_MASKS: Record<string, string> = {
    cozy_den: 'cozy_den', kitchen: 'kitchen', study: 'study', office: 'office',
    garden: 'garden', desert: 'desert', jungle: 'jungle',
    star_loft: 'observatory', belfry: 'workshop', sky_garden: 'rainforest',
  };
  const WINDOWS_DIR = path.resolve(__dirname, '../../assets/rooms/windows');

  test.each(Object.entries(WINDOW_MASKS))('%s theme has its %s window mask asset', (_theme, file) => {
    expect(fs.existsSync(path.join(WINDOWS_DIR, `${file}.png`))).toBe(true);
  });

  test('every treated room is wired to its mask; the aquarium stays untreated', () => {
    for (const [theme, file] of Object.entries(WINDOW_MASKS)) {
      expect(ROOM_VIEW).toMatch(new RegExp(`${theme}: require\\(.*windows/${file}\\.png`));
    }
    // The aquarium's water is deliberately never recolored.
    expect(ROOM_VIEW).not.toMatch(/windows\/aquarium/);
    expect(fs.existsSync(path.join(WINDOWS_DIR, 'aquarium.png'))).toBe(false);
  });

  test('the mask recolors per phase via WINDOW_TINT (day untouched)', () => {
    expect(ROOM_VIEW).toMatch(/const WINDOW_TINT/);
    expect(ROOM_VIEW).toMatch(/0: \{ color: '#000000', opacity: 0 \}/);
    expect(ROOM_VIEW).toMatch(/tintColor: tint\.color, opacity: tint\.opacity/);
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
  const PIT_BLOCK = 140; // pit height 140 + marginTop 0 (PIT_FLOW_HEIGHT)
  const FOUNDATION_H = 43; // 282 * (120/792)

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
