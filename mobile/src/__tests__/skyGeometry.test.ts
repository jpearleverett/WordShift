/**
 * Sky/house geometry tripwires.
 *
 * The home screen's "house sits just below the river" fix rests on three
 * facts that live in different places and can silently drift apart:
 *
 *   1. All six sky assets are 941x1972, where rows 1672-1971 are a mirrored
 *      meadow extension and the river never reaches below row ~1335 in any
 *      variant (measured via pngjs scans of every sky; sky_peace is derived
 *      pixel-for-pixel from sky_shadow by settleSkies.mjs, so its geometry is
 *      identical by construction).
 *   2. HouseWorld anchors the sky Image to the container BOTTOM with a box
 *      height that forces height-driven cover scaling, so the art's bottom
 *      row sits exactly on the container bottom on every device (no fill
 *      band, device-independent seat math).
 *   3. The house column's bottom margins put the foundation top at image
 *      rows ~1360-1470 across real devices — below the river, on the meadow.
 *
 * HouseWorld.tsx can't be imported in the Node test env (it pulls the full
 * native surface), so — following the appIntegration.test.ts precedent —
 * anchoring is pinned by source scan and seat math invokes the shared production geometry.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getSkyBoxHeight, SKY_IMG_WIDTH, SKY_IMG_HEIGHT } from '../services/worldGeometry';

const ENV_DIR = path.resolve(__dirname, '../../assets/environment');
const HOUSE_WORLD = fs.readFileSync(
  path.resolve(__dirname, '../components/home/HouseWorld.tsx'),
  'utf8'
);

const SKIES = ['sky_day', 'sky_afternoon', 'sky_dusk', 'sky_storm', 'sky_shadow', 'sky_peace'];

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
    expect(SKY_IMG_WIDTH).toBe(941);
    expect(SKY_IMG_HEIGHT).toBe(1972);
  });

  test('sky box is bottom-anchored with height-driven cover scaling', () => {
    // The box height must beat width-driven scaling so the art's full height
    // maps onto the box and its bottom row lands on the container bottom.
    for (const [width, height] of [[320, 640], [393, 852], [852, 393], [1024, 1366]]) {
      const boxHeight = getSkyBoxHeight(width, height);
      expect(boxHeight).toBeGreaterThanOrEqual(height);
      expect(boxHeight / SKY_IMG_HEIGHT).toBeGreaterThan(width / SKY_IMG_WIDTH);
    }
    expect(HOUSE_WORLD).toContain('getSkyBoxHeight(SCREEN_WIDTH, SCREEN_HEIGHT)');
    expect(HOUSE_WORLD).toContain('width: SCREEN_WIDTH, height: SKY_BOX_HEIGHT');
    const skyStyle = HOUSE_WORLD.slice(
      HOUSE_WORLD.indexOf('skyBackground: {'),
      HOUSE_WORLD.indexOf('},', HOUSE_WORLD.indexOf('skyBackground: {'))
    );
    expect(skyStyle).toContain('bottom: 0');
    expect(skyStyle).not.toContain('top:');
  });

  test('the tuck/offset era stays gone (top-anchored sky broke house-vs-art alignment)', () => {
    expect(HOUSE_WORLD).not.toMatch(/SKY_BOTTOM_TUCK/);
  });

  test('phase 5 serves its own settled sky and foundation (Terrible Peace art)', () => {
    // The shadow no longer looms at phase 5 — sky_peace (ember eyes
    // extinguished, mauve settle) and foundation_5 are derived from the
    // phase-4 art by settleSkies.mjs. Phase 5 must never fall back to the
    // shadow sky again.
    expect(HOUSE_WORLD).toMatch(/currentPhase >= 5 \? SKY_PEACE :/);
    expect(HOUSE_WORLD).toMatch(/sky_peace\.webp/);
    expect(HOUSE_WORLD).toMatch(/foundation_5\.png/);
    expect(fs.existsSync(path.join(ENV_DIR, 'foundation_5.png'))).toBe(true);
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

  test('the pannable diorama is NOT layer-rasterized (rasterization clips the overflow sky)', () => {
    // The pan is OVERFLOW-BASED: the sky Image overflows the transformContainer's
    // top and panning reveals it. Rasterizing that container (shouldRasterizeIOS /
    // renderToHardwareTextureAndroid) clips it to its bounds, so a non-zero pan
    // exposes the flat PHASE_BG_COLORS backdrop as a band above the scene. These
    // props must never ride the transform container again.
    const containerStart = HOUSE_WORLD.indexOf(
      '<Animated.View',
      HOUSE_WORLD.indexOf('styles.gestureContainer')
    );
    const container = HOUSE_WORLD.slice(
      containerStart,
      HOUSE_WORLD.indexOf('transform: [', containerStart)
    );
    expect(container).not.toContain('renderToHardwareTextureAndroid');
    expect(container).not.toContain('shouldRasterizeIOS');
  });

  test('the sky/celestials are FLAT direct children of the pan container (no wrapper layer)', () => {
    // The audit added a `skyParallaxLayer` absoluteFill wrapper (for a parallax
    // that was later removed 1:1). That vestigial viewport-sized negative-z layer
    // nesting the ~940px overflowing sky raster made Fabric/Android promote +
    // recomposite it each pan frame, which shimmered while scrolling. The proven
    // pre-audit structure renders the sky Image + groundExtension + clouds/stars
    // as DIRECT children of transformContainer. Keep it flat — no wrapper.
    expect(HOUSE_WORLD).not.toMatch(/skyParallaxLayer/);
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
  // Exercises HouseWorld's bottom-anchored seat math. If any constant in
  // HouseWorld changes (margins, pit size, foundation height, sky dims),
  // update BOTH places — this test failing means the house may be back in
  // the river on some device.
  const IMG_H = 1972;
  const RIVER_BOTTOM_ROW = 1335; // lowest river/bank pixel across all 5 skies
  const HOUSE_BOTTOM_MARGIN = 30;
  const PIT_DOCK_CLEARANCE = 80;
  const PIT_BLOCK = 140; // pit height 140 + marginTop 0 (PIT_FLOW_HEIGHT)
  const FOUNDATION_H = 43; // 282 * (120/792)

  const foundationTopArtRow = (sw: number, sh: number) => {
    const boxH = getSkyBoxHeight(sw, sh);
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

/**
 * Pixel-level guards for the two retouches that made the world art meet its
 * neighbours cleanly. Unlike the rest of this file these decode the real
 * assets: the property under test IS the pixels, so a source scan cannot see
 * it. `sharp` is already a devDependency (the art tools use it) and reads both
 * WebP and PNG, so no second decoder is pulled in.
 */

const hexRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/** The declared backdrop fill per phase, read from HouseWorld's own map. */
function declaredSkyFills(): string[] {
  const start = HOUSE_WORLD.indexOf('const PHASE_BG_COLORS');
  const map = HOUSE_WORLD.slice(start, HOUSE_WORLD.indexOf('};', start));
  return SKIES.map((sky, phase) => {
    const match = map.match(new RegExp(`\\n  ${phase}: '(#[0-9a-fA-F]{6})'`));
    if (!match) throw new Error(`PHASE_BG_COLORS has no entry for phase ${phase} (${sky})`);
    return match[1].toLowerCase();
  });
}

describe('sky top band blends into the flat backdrop fill', () => {
  // HouseWorld paints PHASE_BG_COLORS[phase] above the bottom-anchored sky, so
  // panning up exposes that flat colour meeting the sky's row 0. The art's own
  // row 0 varied horizontally by up to 40/255 (sky_dusk), which no flat fill can
  // match, so a seam line sat at the join. scripts/tools/retouchSkyTopSeam.mjs
  // now holds the top rows at EXACTLY the declared hex and smoothsteps back into
  // the art below, which makes the fill constant a CONTRACT rather than a sample.
  // The stored WebP is lossy, so the decoded row can sit 1/255 off what the tool
  // wrote; anything beyond that means the retouch was lost (a sky regenerated
  // without re-running the tool) or a fill hex was "re-sampled" and drifted.
  const TOLERANCE = 1;
  const fills = declaredSkyFills();

  test.each(SKIES.map((sky, phase) => [sky, phase] as const))(
    '%s row 0 is flat across the full width and matches its declared fill',
    async (sky, phase) => {
      const expected = hexRgb(fills[phase]);
      const { data, info } = await sharp(path.join(ENV_DIR, `${sky}.webp`))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.width).toBe(941);

      const offenders: Record<string, number>[] = [];
      for (let c = 0; c < 3; c++) {
        let min = 255;
        let max = 0;
        for (let x = 0; x < info.width; x++) {
          const v = data[x * info.channels + c];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        // Flat (no horizontal variation for the flat backdrop to fail to match)
        // AND sitting on the colour the app paints above it.
        const deviation = Math.max(Math.abs(min - expected[c]), Math.abs(max - expected[c]));
        if (max - min > TOLERANCE || deviation > TOLERANCE) {
          offenders.push({ channel: c, min, max, expected: expected[c] });
        }
      }
      expect(offenders).toEqual([]);
    }
  );
});

describe('the pit road runs up under the house at every phase', () => {
  // scripts/tools/carveFoundationRoad.mjs carves the pit's dirt road through the
  // foundation's vegetation band (corridor x 302..493) and forces the corridor
  // opaque down to the last row, because the foundations' own bottom alpha is
  // ragged and on some phases stops short of the corridor entirely — which left
  // a notch where the road meets the pit art (PIT_MARGIN_TOP is 0, so the two
  // butt together). The outermost ~5 columns each side are the deliberately
  // feathered verge, so the assertion covers the road's core.
  const ROAD_X0 = 302;
  const ROAD_X1 = 493;
  const VERGE_FEATHER = 8;

  test.each([0, 1, 2, 3, 4, 5])(
    'foundation_%i.png is opaque across the road corridor at its bottom row',
    async (phase) => {
      const { data, info } = await sharp(path.join(ENV_DIR, `foundation_${phase}.png`))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect({ width: info.width, height: info.height }).toEqual({ width: 792, height: 120 });

      const bottom = info.height - 1;
      const transparent: number[] = [];
      for (let x = ROAD_X0 + VERGE_FEATHER; x <= ROAD_X1 - VERGE_FEATHER; x++) {
        if (data[(bottom * info.width + x) * info.channels + 3] !== 255) transparent.push(x);
      }
      expect(transparent).toEqual([]);
    }
  );
});
