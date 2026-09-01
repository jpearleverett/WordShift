/**
 * gameIcons/achievementsPuzzleStreak.mjs — the PUZZLE ladder (9 crests) and the
 * STREAK ladder (6 crests) of the achievements set. 192px each, filed as
 * assets/ui/achievements/<id>.png, shown at 34dp in the Stats list and 26dp in
 * the unlock toast. All 56 achievements sit in ONE scrolling list, so every
 * crest here has to be told from its ladder-mates by SILHOUETTE alone.
 *
 * TWO LADDERS, TWO VESSELS.
 *
 * The puzzle ladder's vessel is the game's identity object: the beveled candy
 * letter tile (see theme_default.png in assets/ui/shop for how the shipped set
 * draws one). Every crest is drawn with the ONE `tile()` primitive below, so the
 * tile is byte-consistent from first_puzzle to puzzle_750 and what changes is
 * the structure around it. Early rungs escalate by COUNT, late rungs by SETTING:
 *
 *   first_puzzle  ONE tile, a sprout growing from its top edge   -> square + plume
 *   puzzle_10     THREE tiles in a neat column                   -> a squat tower
 *   puzzle_25     FIVE smaller tiles, the column leaning         -> a tall crooked tower
 *   puzzle_35     a brass magnifying glass held over one tile    -> circle + diagonal handle
 *   puzzle_50     two tiles locked knob-into-socket, jigsaw-wise -> a wide two-tone bar
 *   puzzle_100    a laurel wreath ringing one tile               -> a leafy ring
 *   puzzle_250    a tile resting on a blacksmith's anvil         -> the horned anvil
 *   puzzle_500    a tile standing on a stone plinth, star on top -> a stepped pedestal
 *   puzzle_750    an iron-banded chest, lid open, spilling tiles -> a box with a raised lid
 *
 * The streak ladder's vessel is FIRE, drawn by the one `flame()` primitive, and
 * the ladder escalates by the THING THAT HOLDS the fire, from the most fragile
 * to the most permanent:
 *
 *   streak_3      a single struck match                          -> a slanted stick + flame
 *   streak_7      a brass hand lantern with an arched carry handle -> a bell with a hoop
 *   streak_14     a campfire: three crossed logs, one flame      -> flame over a log pile
 *   streak_30     a stone hearth with fire in its arched mouth   -> a wide block with a dark arch
 *   streak_60     an unbroken iron chain ring, flame at centre   -> a knobbly ring
 *   streak_100    a phoenix: the flame grown two wings           -> a winged V
 *
 * Luminous escalation is invisible at 32dp (every glow averages to the same warm
 * blur), so nothing here escalates by glow; the halo is the same light cream
 * wash on every lit crest and only the silhouette climbs.
 *
 * PALETTE. Tiles wear the game's own candy hues (TILE, copied from
 * CandyColors.tileColors in src/theme/colors.ts). Fire is one four-step ramp
 * (FIRE) from a deep red-orange out to a cream core, wide enough to keep value
 * structure at 15px tall. Iron is a WARM grey (IRON) so it never reads as cool
 * vector steel next to the wood; stone and brass come from the kit. Every glow
 * is '#FFF3D2'/'#FFFBEC' at low alpha, LIGHTER than cream parchment in every
 * channel, so it lifts the surface it lands on instead of smudging it grey.
 *
 * House doctrine (see _draw.mjs): contact shadow and any halo go down on the
 * real canvas FIRST (neither is contoured), the subject is drawn inside
 * withOutline (INK contour, never #000), the upper-left sheen lands last on top
 * of the contour. Top-lit via gradTo everywhere. No Math.random: every
 * coordinate is a literal, so the generator is byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline,
  INK, WOOD, BRASS, STONE,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, starPts,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/achievements');

// --- palettes ----------------------------------------------------------------
/** [face, edge] pairs from CandyColors.tileColors (src/theme/colors.ts). */
const TILE = {
  pink: ['#FF6B9D', '#D44D7A'], purple: ['#C44DFF', '#9933CC'], blue: ['#4DAFFF', '#2E8BC0'],
  teal: ['#4DE8C2', '#2EAF8E'], yellow: ['#FFD84D', '#CCB030'], orange: ['#FF8C4D', '#CC6633'],
};
const FIRE = { out: '#C8401A', mid: '#FF7A28', in: '#FFC24E', core: '#FFF0BE' };
const IRON = { hi: '#BDB5AC', base: '#7E7770', lo: '#4C4741', deep: '#332E2A' };
const LEAF = { hi: '#A6D46A', base: '#6FAF3F', lo: '#3D7A26' };
const GOLD = { hi: '#FFE07A', base: '#F2BE3A', lo: '#B77A12' };
const GLASS = '#CFEAF6';
const MATCH = { hi: '#D8634A', lo: '#7A2416' };
const RIBBON = { hi: '#E2564F', lo: '#8E2620' };

// --- local helpers -------------------------------------------------------------
function shade(colorHex, f) {
  const n = parseInt(colorHex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  const v = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return '#' + (v | 0x1000000).toString(16).slice(1).toUpperCase();
}

/** A rotated rounded rectangle as a point list for `poly`. */
function roundRectPts(cx, cy, hw, hh, rad, ang, per = 6) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const r = Math.min(rad, hw, hh);
  const corners = [
    [hw - r, hh - r, 0], [-(hw - r), hh - r, Math.PI / 2],
    [-(hw - r), -(hh - r), Math.PI], [hw - r, -(hh - r), -Math.PI / 2],
  ];
  const pts = [];
  for (const [kx, ky, a0] of corners) {
    for (let i = 0; i <= per; i++) {
      const a = a0 + (i / per) * (Math.PI / 2);
      const lx = kx + Math.cos(a) * r, ly = ky + Math.sin(a) * r;
      pts.push([cx + lx * ca - ly * sa, cy + lx * sa + ly * ca]);
    }
  }
  return pts;
}

/** A rotated oval as a point list (chain links, lens glints). */
function ovalPts(cx, cy, ra, rb, rot, n = 28) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * ra, v = Math.sin(a) * rb;
    return [cx + u * ca - v * sa, cy + u * sa + v * ca];
  });
}

/** Upper half of an ellipse closed along its flat base — a dome, a lid, an arch. */
function domePts(cx, cy, rx, ry, n = 26) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/**
 * Cut a round hole out of whatever is already on the scratch canvas. The kit
 * only paints, and a jigsaw SOCKET is an absence: the one thing a tile with a
 * bite out of its edge needs is for the background to show through the bite,
 * so withOutline contours the notch like any other edge. The canvas stores
 * premultiplied colour, so all four channels scale together.
 */
function punch(t, cx, cy, r) {
  for (let y = Math.max(0, ~~(cy - r - 2)); y <= Math.min(t.h - 1, ~~(cy + r + 2)); y++)
    for (let x = Math.max(0, ~~(cx - r - 2)); x <= Math.min(t.w - 1, ~~(cx + r + 2)); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r;
      const keep = Math.max(0, Math.min(1, 0.5 + d));
      if (keep >= 1) continue;
      const i = (y * t.w + x) * 4;
      t.px[i] *= keep; t.px[i + 1] *= keep; t.px[i + 2] *= keep; t.px[i + 3] *= keep;
    }
}

/** A pointed leaf centred at (x, y), long axis along `ang`. */
function leafPts(x, y, len, wid, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const local = [
    [-len, 0], [-len * 0.45, -wid * 0.78], [0, -wid], [len * 0.55, -wid * 0.66], [len, 0],
    [len * 0.55, wid * 0.66], [0, wid], [-len * 0.45, wid * 0.78],
  ];
  return local.map(([lx, ly]) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca]);
}
function leaf(t, x, y, len, wid, ang, hi, lo) {
  poly(t, leafPts(x, y, len + 6, wid + 6, ang), INK, 0.95);
  poly(t, leafPts(x, y, len, wid, ang), hi, 1, lo);
}

/** Letter glyphs as stroke segments in a unit box (y down). */
const GLYPHS = {
  W: [[-1, -1, -0.55, 1], [-0.55, 1, 0, -0.2], [0, -0.2, 0.55, 1], [0.55, 1, 1, -1]],
  A: [[-0.9, 1, 0, -1], [0, -1, 0.9, 1], [-0.5, 0.3, 0.5, 0.3]],
  T: [[-0.9, -1, 0.9, -1], [0, -1, 0, 1]],
  L: [[-0.7, -1, -0.7, 1], [-0.7, 1, 0.8, 1]],
  E: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.8, -1], [-0.7, 0, 0.5, 0], [-0.7, 1, 0.8, 1]],
  I: [[0, -1, 0, 1], [-0.6, -1, 0.6, -1], [-0.6, 1, 0.6, 1]],
  H: [[-0.8, -1, -0.8, 1], [0.8, -1, 0.8, 1], [-0.8, 0, 0.8, 0]],
  N: [[-0.8, 1, -0.8, -1], [-0.8, -1, 0.8, 1], [0.8, 1, 0.8, -1]],
  M: [[-0.9, 1, -0.9, -1], [-0.9, -1, 0, 0.3], [0, 0.3, 0.9, -1], [0.9, -1, 0.9, 1]],
  V: [[-0.9, -1, 0, 1], [0, 1, 0.9, -1]],
  X: [[-0.8, -1, 0.8, 1], [0.8, -1, -0.8, 1]],
  Y: [[-0.8, -1, 0, 0], [0.8, -1, 0, 0], [0, 0, 0, 1]],
  K: [[-0.8, -1, -0.8, 1], [0.8, -1, -0.8, 0.1], [-0.5, -0.15, 0.8, 1]],
  F: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.8, -1], [-0.7, 0, 0.4, 0]],
  Z: [[-0.8, -1, 0.8, -1], [0.8, -1, -0.8, 1], [-0.8, 1, 0.8, 1]],
  D: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.2, -1], [0.2, -1, 0.8, -0.4], [0.8, -0.4, 0.8, 0.4], [0.8, 0.4, 0.2, 1], [0.2, 1, -0.7, 1]],
  P: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.4, -1], [0.4, -1, 0.8, -0.6], [0.8, -0.6, 0.4, -0.1], [0.4, -0.1, -0.7, -0.1]],
  R: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.4, -1], [0.4, -1, 0.8, -0.6], [0.8, -0.6, 0.4, -0.1], [0.4, -0.1, -0.7, -0.1], [0.1, -0.1, 0.8, 1]],
  S: [[0.8, -0.85, -0.2, -1], [-0.2, -1, -0.8, -0.5], [-0.8, -0.5, 0, -0.05], [0, -0.05, 0.8, 0.45], [0.8, 0.45, 0.2, 1], [0.2, 1, -0.8, 0.85]],
  B: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.3, -1], [0.3, -1, 0.75, -0.55], [0.75, -0.55, 0.3, -0.05], [0.3, -0.05, -0.7, -0.05], [0.3, -0.05, 0.8, 0.45], [0.8, 0.45, 0.3, 1], [0.3, 1, -0.7, 1]],
};

/**
 * ONE candy letter tile, wearing the game's own tile chrome: the darker edge
 * slab below (LetterTile's `tileEdge`), a bevel plane over the top half
 * (`bevelTop`), the gloss bar (`glossyShine`) and the upper-right specular dot.
 * EXTRUDED, not printed — the face is stacked on a side plane and a dark base
 * plane so the tile has thickness, which is what lets a stack of them read as a
 * stack of objects. `e` is the extrusion depth. `letter` is optional: a glyph
 * only survives the 64px cell, but a tile without one is a rounded square.
 */
function tile(t, cx, cy, hw, hh, angDeg, pal, letter = null, e = Math.round(hh * 0.2)) {
  const ang = (angDeg * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
  const RR = (lx, ly, w, h, rad) => roundRectPts(...P(lx, ly), w, h, rad, ang);
  const rad = Math.min(22, hw * 0.28, hh * 0.28);

  poly(t, RR(0, e, hw + 8, hh + e + 8, rad + 6), INK);                      // own keyline
  poly(t, RR(0, 2 * e, hw, hh, rad), shade(pal[1], 0.54));                  // base plane
  poly(t, RR(0, e, hw, hh, rad), pal[1]);                                   // side plane
  poly(t, RR(0, 0, hw, hh, rad), pal[0]);                                   // face
  poly(t, RR(0, -hh * 0.46, hw - 6, hh * 0.54, rad * 0.9), shade(pal[0], 1.16));  // bevel plane
  poly(t, RR(0, -hh * 0.62, hw * 0.76, hh * 0.13, Math.min(13, hh * 0.12)), '#FFFFFF', 0.4);
  const [sx, sy] = P(hw * 0.56, -hh * 0.54);
  ellipse(t, sx, sy, hw * 0.14, hw * 0.14, '#FFFFFF', 0.75, 3);            // specular dot

  if (!letter) return;
  const s = Math.min(hw, hh) * 0.52, th = s * 0.36;
  const dark = shade(pal[1], 0.62), light = '#FFF6E2';
  if (letter === 'O' || letter === 'C') {
    // round letters are arcs, not segment chains; C leaves its mouth on the right
    const a0 = letter === 'C' ? ang + Math.PI * 0.28 : 0;
    const a1 = letter === 'C' ? ang + Math.PI * 1.72 : Math.PI * 2;
    const [ox, oy] = P(0, s * 0.16);
    arcStroke(t, ox, oy, s * 0.72, th, a0, a1, dark, 0.55);
    const [ox2, oy2] = P(0, s * 0.04);
    arcStroke(t, ox2, oy2, s * 0.72, th * 0.9, a0, a1, light);
    return;
  }
  const seg = GLYPHS[letter];
  for (const [x0, y0, x1, y1] of seg) {
    const a = P(x0 * s, y0 * s + s * 0.16), b = P(x1 * s, y1 * s + s * 0.16);
    capsule(t, a[0], a[1], b[0], b[1], th, dark, 0.55);
  }
  for (const [x0, y0, x1, y1] of seg) {
    const a = P(x0 * s, y0 * s + s * 0.04), b = P(x1 * s, y1 * s + s * 0.04);
    capsule(t, a[0], a[1], b[0], b[1], th * 0.9, light);
  }
}

/**
 * ONE flame: four nested lobes on the FIRE ramp over an ink under-lobe (so the
 * flame keeps a keyline wherever it crosses another material). `lean` nudges the
 * inner lobes so the fire reads as licking rather than stamped.
 */
function flame(t, cx, topY, botY, r, lean = -0.06, keyline = true) {
  const H = botY - topY;
  if (keyline) flameLobe(t, cx, topY - 6, botY + 4, r + 6, INK, 0.92);
  flameLobe(t, cx, topY, botY, r, FIRE.out);
  flameLobe(t, cx + r * lean, topY + H * 0.2, botY - 2, r * 0.74, FIRE.mid);
  flameLobe(t, cx + r * lean * 1.6, topY + H * 0.45, botY - 4, r * 0.48, FIRE.in);
  flameLobe(t, cx + r * lean * 2, topY + H * 0.68, botY - 6, r * 0.24, FIRE.core);
}

/** The lit-crest halo: LIGHTER than cream in every channel, laid before the outline. */
function warmGlow(cv, x, y, rx, ry, a = 0.28) {
  ellipse(cv, x, y, rx, ry, '#FFF3D2', a, Math.min(rx, ry) * 0.5);
  ellipse(cv, x, y, rx * 0.62, ry * 0.62, '#FFFBEC', a * 0.8, Math.min(rx, ry) * 0.3);
}

/** A cut log: rounded body with a rim highlight, a seam, and a ringed end face. */
function log(t, x1, y1, x2, y2, th, endAt = 'both') {
  capsule(t, x1, y1, x2, y2, th + 8, INK, 0.92);
  capsule(t, x1, y1, x2, y2, th, WOOD.mid);
  capsule(t, x1, y1 - th * 0.2, x2, y2 - th * 0.2, th * 0.34, WOOD.light, 0.8);
  capsule(t, x1, y1 + th * 0.26, x2, y2 + th * 0.26, th * 0.22, WOOD.seam, 0.45);
  const ends = endAt === 'both' ? [[x1, y1], [x2, y2]] : endAt === 'a' ? [[x1, y1]] : [[x2, y2]];
  for (const [ex, ey] of ends) {
    ellipse(t, ex, ey, th * 0.5, th * 0.5, INK, 0.9, 2);
    ellipse(t, ex, ey, th * 0.42, th * 0.42, WOOD.rim, 1, 2);
    ellipse(t, ex, ey, th * 0.24, th * 0.24, WOOD.dark, 0.7, 2);
  }
}

// --- the crests ----------------------------------------------------------------
export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === first_puzzle.png — ONE tile, a sprout from its top edge ===============
    const { cv, c } = canvas();
    const ty = c + 30;
    contactShadow(cv, c + 8, ty + 120, 96, 18, 0.32);
    withOutline(cv, t => {
      tile(t, c, ty, 76, 80, 0, TILE.pink, 'A');
      // the sprout: a curving stem out of the top edge, two fat leaves
      capsule(t, c - 2, ty - 74, c + 8, 66, 26, INK, 0.92);
      capsule(t, c - 2, ty - 74, c + 8, 66, 16, LEAF.base);
      capsule(t, c - 6, ty - 80, c + 3, 74, 6, LEAF.hi, 0.6);
      leaf(t, c - 30, 62, 40, 22, Math.atan2(-26, -44), LEAF.hi, LEAF.lo);
      leaf(t, c + 42, 52, 40, 22, Math.atan2(-30, 46), LEAF.hi, LEAF.lo);
    }, { width: 10 });
    sheen(cv, c - 44, ty - 46, 20, 12, 0.5);
    savePNG(path.join(OUT, 'first_puzzle.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_10.png — THREE tiles, a neat column ============================
    // Wide slabs so the column is a squat tower and the extrusion of each tile
    // sits ON the face of the one beneath it.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 354, 100, 16, 0.32);
    withOutline(cv, t => {
      tile(t, c, 286, 80, 38, 0, TILE.blue, 'W', 14);
      tile(t, c + 2, 196, 80, 38, 0, TILE.yellow, 'I', 14);
      tile(t, c - 2, 106, 80, 38, 0, TILE.pink, 'N', 14);
    }, { width: 10 });
    sheen(cv, c - 50, 78, 22, 10, 0.5);
    savePNG(path.join(OUT, 'puzzle_10.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_25.png — FIVE tiles, a tall leaning column ======================
    // Smaller tiles, one more pitch, each set a little further left and tilted
    // a little more, so the silhouette is a crooked tower, not the neat one.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 350, 84, 14, 0.32);
    const pals = [TILE.blue, TILE.orange, TILE.purple, TILE.yellow, TILE.pink];
    const letters = ['T', 'O', 'W', 'E', 'R'];
    withOutline(cv, t => {
      for (let i = 0; i < 5; i++) {
        const cy = 310 - i * 60, cx = c + 10 - [0, 8, 18, 30, 44][i], ang = -[0, 2, 4, 6, 9][i];
        tile(t, cx, cy, 58, 25, ang, pals[i], letters[i], 10);
      }
    }, { width: 10 });
    sheen(cv, c - 60, 52, 18, 8, 0.5);
    savePNG(path.join(OUT, 'puzzle_25.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_35.png — a brass magnifying glass over a tile ===================
    const { cv, c } = canvas();
    const lx = c + 14, ly = c - 30, R = 84;
    contactShadow(cv, c - 20, c + 148, 92, 16, 0.32);
    withOutline(cv, t => {
      tile(t, c - 30, c + 40, 62, 66, -8, TILE.teal, 'A');
      // the lens: a pale glass disc that lets the tile show through
      ellipse(t, lx, ly, R - 4, R - 4, GLASS, 0.62, 3);
      // the brass rim, top-lit
      arcStroke(t, lx, ly, R, 24, 0, Math.PI * 2, BRASS.lo);
      arcStroke(t, lx, ly, R, 12, Math.PI * 1.05, Math.PI * 1.95, BRASS.hi, 0.95);
      arcStroke(t, lx, ly, R - 9, 5, Math.PI * 1.15, Math.PI * 1.85, '#FFF3D2', 0.55);
      // ferrule + wooden handle running down-right
      const hx0 = lx + Math.cos(Math.PI / 4) * (R + 4), hy0 = ly + Math.sin(Math.PI / 4) * (R + 4);
      capsule(t, hx0, hy0, hx0 + 22, hy0 + 22, 42, BRASS.lo);
      capsule(t, hx0 - 6, hy0 - 6, hx0 + 14, hy0 + 14, 18, BRASS.hi, 0.8);
      capsule(t, hx0 + 22, hy0 + 22, hx0 + 74, hy0 + 74, 36, WOOD.mid);
      capsule(t, hx0 + 16, hy0 + 30, hx0 + 66, hy0 + 80, 12, WOOD.rim, 0.65);
      ellipse(t, hx0 + 76, hy0 + 76, 21, 21, WOOD.dark, 1, 3);                 // pommel
    }, { width: 10 });
    // glass glint sits on top of the contour like every other specular
    poly(cv, ovalPts(lx - 34, ly - 34, 26, 12, -Math.PI / 4), '#FFFFFF', 0.6);
    sheen(cv, c - 66, c - 8, 16, 10, 0.45);
    savePNG(path.join(OUT, 'puzzle_35.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_50.png — two tiles locked knob-into-socket ======================
    const { cv, c } = canvas();
    const ang = -5, ar = (ang * Math.PI) / 180, ca = Math.cos(ar), sa = Math.sin(ar);
    const P = (lx, ly) => [c + lx * ca - ly * sa, c + 8 + lx * sa + ly * ca];
    contactShadow(cv, c + 10, c + 118, 150, 18, 0.32);
    // An extruded round tab in a tile's own colours, pushed out of its edge.
    const knob = (t, kx, ky, pal) => {
      ellipse(t, kx, ky + 8, 32, 32, INK, 1, 3);                  // socket keyline
      ellipse(t, kx, ky + 16, 25, 25, shade(pal[1], 0.54), 1, 3);
      ellipse(t, kx, ky + 8, 25, 25, pal[1], 1, 3);
      ellipse(t, kx, ky, 25, 25, pal[0], 1, 3);
      ellipse(t, kx - 2, ky - 8, 18, 14, shade(pal[0], 1.16), 1, 3);
    };
    withOutline(cv, t => {
      tile(t, ...P(58, 0), 56, 66, ang, TILE.yellow, 'E');
      tile(t, ...P(-58, 0), 56, 66, ang, TILE.blue, 'W');
      // The jigsaw read lives in the OUTER edges: a socket bitten out of the
      // blue tile's left edge, a knob standing off the yellow tile's right edge.
      // Between them the blue knob is pushed into the yellow tile.
      const [nx, ny] = P(-114, 6);
      punch(t, nx, ny + 6, 24);
      knob(t, ...P(8, 2), TILE.blue);
      knob(t, ...P(122, 2), TILE.yellow);
    }, { width: 10 });
    sheen(cv, c - 104, c - 44, 18, 10, 0.5);
    savePNG(path.join(OUT, 'puzzle_50.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_100.png — a laurel wreath ringing one tile =======================
    const { cv, c } = canvas();
    const wx = c, wy = c + 6, R = 122;
    contactShadow(cv, c + 8, wy + R + 22, 118, 16, 0.32);
    withOutline(cv, t => {
      // two branches: stems along the ring from the bottom knot up toward the gap
      for (const side of [-1, 1]) {
        const a0 = Math.PI / 2 - side * 0.30, a1 = Math.PI / 2 - side * 2.55;
        const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
        arcStroke(t, wx, wy, R, 22, lo, hi, INK, 0.92);
        arcStroke(t, wx, wy, R, 12, lo, hi, LEAF.lo);
        for (let i = 0; i < 7; i++) {
          const a = a0 + (a1 - a0) * (0.12 + i * 0.13);
          const tang = a - side * Math.PI / 2;                    // toward the tip
          const out = i % 2 ? 1 : -1;                             // alternate sides
          const px = wx + Math.cos(a) * (R + out * 10), py = wy + Math.sin(a) * (R + out * 10);
          leaf(t, px + Math.cos(tang) * 14, py + Math.sin(tang) * 14, 30, 16, tang - side * out * 0.55, LEAF.hi, LEAF.lo);
        }
      }
      // the knot at the bottom: a red bow, two loops and a wrap
      const bx = wx, by = wy + R;
      for (const s of [-1, 1]) {
        poly(t, ovalPts(bx + s * 30, by - 4, 28, 16, s * 0.35), INK, 0.95);
        poly(t, ovalPts(bx + s * 30, by - 4, 22, 11, s * 0.35), RIBBON.hi, 1, RIBBON.lo);
      }
      roundRect(t, bx, by, 16, 14, 6, INK);
      roundRect(t, bx, by - 2, 11, 10, 4, RIBBON.hi, 1, RIBBON.lo);
      tile(t, wx, wy - 4, 50, 56, 0, TILE.pink, 'C');
    }, { width: 10 });
    sheen(cv, wx - 26, wy - 40, 14, 8, 0.5);
    savePNG(path.join(OUT, 'puzzle_100.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_250.png — a tile resting on a blacksmith's anvil ================
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 342, 128, 16, 0.32);
    withOutline(cv, t => {
      // foot, waist, face + horn: three big iron masses, top-lit
      poly(t, [[c - 104, 298], [c + 116, 298], [c + 124, 344], [c - 112, 344]], IRON.base, 1, IRON.lo);
      poly(t, [[c - 48, 232], [c + 84, 232], [c + 72, 298], [c - 36, 298]], IRON.base, 1, IRON.deep);
      poly(t, [[c - 154, 200], [c - 74, 180], [c + 122, 180], [c + 122, 232], [c - 74, 232], [c - 154, 212]], IRON.hi, 1, IRON.lo);
      capsule(t, c - 70, 188, c + 112, 188, 9, '#E6E0D8', 0.7);      // lit top edge
      capsule(t, c - 100, 304, c + 110, 304, 6, IRON.hi, 0.5);
      tile(t, c + 20, 132, 46, 46, -6, TILE.orange, 'W', 11);
    }, { width: 10 });
    sheen(cv, c - 20, 194, 30, 6, 0.4);
    savePNG(path.join(OUT, 'puzzle_250.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_500.png — a tile on a stone plinth, a gold star above ===========
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 352, 122, 16, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, 338, 116, 12, 5, STONE.hi, 1, STONE.lo);         // base slab
      roundRect(t, c, 296, 82, 34, 6, STONE.base, 1, STONE.lo);        // column
      capsule(t, c - 70, 270, c - 70, 322, 10, STONE.hi, 0.5);
      roundRect(t, c, 254, 104, 12, 5, STONE.hi, 1, STONE.base);       // cap
      tile(t, c, 176, 52, 52, 0, TILE.purple, 'A', 12);
      // the star, seated on the tile's top edge so the contour joins
      poly(t, starPts(c, 82, 46, 21), INK);
      poly(t, starPts(c, 82, 40, 17), GOLD.hi, 1, GOLD.lo);
      poly(t, starPts(c - 2, 78, 22, 9), '#FFF6D2', 0.55);
    }, { width: 10 });
    sheen(cv, c - 28, 134, 12, 8, 0.5);
    savePNG(path.join(OUT, 'puzzle_500.png'), W, W, down2(cv, W, W));
  }

  { // === puzzle_750.png — an iron-banded chest, lid open, brimming with tiles ===
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 350, 130, 18, 0.32);
    withOutline(cv, t => {
      // the raised lid: its underside faces us, lighter wood, iron edge
      // The lid is lifted well clear of the box, so a deep dark interior shows
      // between them: that gap is what makes the lid OPEN. Sat on the tiles it
      // read as a domed closed lid with sweets stuck in the seam.
      poly(t, domePts(c, 128, 108, 44), WOOD.rim, 1, WOOD.light);
      roundRect(t, c, 148, 108, 22, 6, WOOD.light, 1, WOOD.base);
      capsule(t, c - 106, 150, c + 106, 150, 14, INK, 0.9);
      capsule(t, c - 106, 148, c + 106, 148, 8, IRON.base);
      for (const x of [c - 62, c + 62]) {
        capsule(t, x, 96, x, 166, 18, IRON.lo);
        capsule(t, x - 3, 98, x - 3, 164, 6, IRON.hi, 0.6);
      }
      roundRect(t, c, 202, 108, 46, 6, '#4A2A16', 1, '#2E1A0E');       // the dark inside
      // tiles heaped inside, over the rim
      tile(t, c - 60, 210, 26, 28, -16, TILE.pink, 'A', 8);
      tile(t, c + 56, 212, 26, 28, 18, TILE.blue, 'T', 8);
      tile(t, c - 4, 200, 27, 29, 4, TILE.yellow, 'W', 8);
      tile(t, c + 22, 224, 26, 28, -9, TILE.teal, 'E', 8);
      // the box front, drawn over the tiles' feet, then its bands and hasp
      roundRect(t, c, 288, 118, 58, 8, WOOD.light, 1, WOOD.dark);
      capsule(t, c - 110, 236, c + 110, 236, 10, WOOD.seam, 0.5);
      for (const x of [c - 66, c + 66]) {
        capsule(t, x, 232, x, 344, 20, IRON.lo);
        capsule(t, x - 4, 234, x - 4, 342, 7, IRON.hi, 0.65);
      }
      roundRect(t, c, 246, 20, 20, 5, IRON.lo);                       // hasp
      roundRect(t, c, 244, 14, 14, 4, IRON.hi, 1, IRON.base);
    }, { width: 10 });
    sheen(cv, c - 80, 262, 18, 10, 0.45);
    savePNG(path.join(OUT, 'puzzle_750.png'), W, W, down2(cv, W, W));
  }

  { // === streak_3.png — a single struck match =================================
    const { cv, c } = canvas();
    const hx = c - 30, hy = 122;                                     // the head
    warmGlow(cv, hx - 4, 98, 104, 86, 0.3);
    contactShadow(cv, c + 46, 356, 72, 12, 0.32);
    withOutline(cv, t => {
      capsule(t, c + 52, 340, hx, hy, 40, INK, 0.92);
      capsule(t, c + 52, 340, hx, hy, 30, WOOD.light);
      capsule(t, c + 44, 336, hx - 8, hy, 10, WOOD.rim, 0.75);
      capsule(t, c + 60, 344, hx + 6, hy + 6, 9, WOOD.dark, 0.5);
      ellipse(t, hx, hy, 30, 36, INK, 1, 3);
      ellipse(t, hx, hy, 24, 30, MATCH.lo, 1, 3);
      ellipse(t, hx - 2, hy - 6, 19, 22, MATCH.hi, 1, 3);
      flame(t, hx - 6, 30, 136, 46, -0.08);
    }, { width: 10 });
    sheen(cv, hx - 10, hy - 14, 8, 6, 0.5);
    savePNG(path.join(OUT, 'streak_3.png'), W, W, down2(cv, W, W));
  }

  { // === streak_7.png — a brass hand lantern, arched handle, lit ===============
    const { cv, c } = canvas();
    warmGlow(cv, c, 214, 120, 116, 0.3);
    contactShadow(cv, c + 8, 344, 96, 16, 0.32);
    withOutline(cv, t => {
      // carry handle: a hoop standing on the roof
      arcStroke(t, c, 104, 54, 22, Math.PI, Math.PI * 2, BRASS.lo);
      arcStroke(t, c, 104, 54, 10, Math.PI * 1.1, Math.PI * 1.55, BRASS.hi, 0.9);
      // roof: a dome with a chimney cap
      roundRect(t, c, 96, 22, 8, 4, BRASS.hi, 1, BRASS.lo);
      poly(t, domePts(c, 134, 78, 40), BRASS.hi, 1, BRASS.lo);
      roundRect(t, c, 136, 82, 8, 4, BRASS.lo);
      // the cage: a lit glass window between two brass posts
      roundRect(t, c, 220, 76, 84, 10, BRASS.lo);
      roundRect(t, c, 220, 60, 74, 8, '#FFE39B', 1, '#F0972E');
      flame(t, c, 152, 280, 30, -0.06);
      for (const x of [c - 66, c + 66]) {
        capsule(t, x, 140, x, 300, 18, BRASS.lo);
        capsule(t, x - 3, 144, x - 3, 296, 6, BRASS.hi, 0.6);
      }
      // base plate and foot
      roundRect(t, c, 308, 88, 14, 6, BRASS.hi, 1, BRASS.lo);
      roundRect(t, c, 326, 66, 10, 5, BRASS.lo, 1, '#5E3E14');
    }, { width: 10 });
    sheen(cv, c - 44, 118, 16, 8, 0.5);
    savePNG(path.join(OUT, 'streak_7.png'), W, W, down2(cv, W, W));
  }

  { // === streak_14.png — a campfire: three crossed logs, one flame =============
    const { cv, c } = canvas();
    warmGlow(cv, c, 190, 124, 120, 0.3);
    contactShadow(cv, c + 8, 350, 122, 16, 0.32);
    withOutline(cv, t => {
      // the two crossed logs lean HIGH, so their upper ends clear the flame on
      // either side and the X is visible rather than swallowed by the fire
      log(t, c - 106, 322, c + 84, 186, 32, 'both');
      log(t, c + 106, 322, c - 84, 186, 32, 'both');
      flame(t, c, 50, 296, 60, -0.06);
      log(t, c - 100, 324, c + 100, 324, 36, 'both');
    }, { width: 10 });
    sheen(cv, c - 70, 314, 14, 8, 0.4);
    savePNG(path.join(OUT, 'streak_14.png'), W, W, down2(cv, W, W));
  }

  { // === streak_30.png — a stone hearth with fire in its arched mouth ===========
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 354, 150, 16, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, 226, 136, 114, 10, STONE.hi, 1, STONE.lo);       // the stone mass
      // four BIG mortar courses, staggered — blocks, not texture
      for (const [x1, x2, y] of [[c - 130, c + 130, 168], [c - 130, c + 130, 300], [c - 130, c - 88, 232], [c + 88, c + 130, 232]]) {
        capsule(t, x1, y, x2, y, 7, STONE.lo, 0.55);
      }
      for (const [x, y1, y2] of [[c - 60, 118, 168], [c + 60, 118, 168], [c - 108, 168, 232], [c + 108, 168, 232], [c - 108, 300, 336], [c + 108, 300, 336]]) {
        capsule(t, x, y1, x, y2, 7, STONE.lo, 0.55);
      }
      roundRect(t, c, 102, 150, 14, 5, STONE.hi, 1, STONE.base);        // mantel
      roundRect(t, c, 338, 150, 10, 4, STONE.base, 1, STONE.lo);        // hearth floor
      // the mouth: a dark arch cut into the stone
      poly(t, domePts(c, 216, 78, 44), '#2A1911');
      roundRect(t, c, 264, 78, 50, 4, '#2A1911');
      ellipse(t, c, 306, 56, 12, '#6A2408', 1, 4);                       // ember bed
      ellipse(t, c, 304, 40, 8, FIRE.out, 1, 4);
      flame(t, c, 174, 310, 44, -0.06);
    }, { width: 10 });
    sheen(cv, c - 96, 104, 26, 6, 0.45);
    savePNG(path.join(OUT, 'streak_30.png'), W, W, down2(cv, W, W));
  }

  { // === streak_60.png — an unbroken iron chain ring, flame at centre ===========
    const { cv, c } = canvas();
    const rx = c, ry = c + 4, R = 116, N = 12;
    warmGlow(cv, rx, ry, 100, 104, 0.28);
    contactShadow(cv, rx + 8, ry + R + 28, 112, 14, 0.32);
    withOutline(cv, t => {
      // alternating face-on ovals and edge-on bars, laid round the ring
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / N;
        const px = rx + Math.cos(a) * R, py = ry + Math.sin(a) * R, tang = a + Math.PI / 2;
        if (i % 2 === 0) {
          poly(t, ovalPts(px, py, 36, 22, tang), INK);
          poly(t, ovalPts(px, py, 30, 16, tang), IRON.hi, 1, IRON.lo);
          poly(t, ovalPts(px, py, 17, 6, tang), IRON.deep);                 // the eye of the link
        } else {
          const dx = Math.cos(tang) * 20, dy = Math.sin(tang) * 20;
          capsule(t, px - dx, py - dy, px + dx, py + dy, 30, INK);
          capsule(t, px - dx, py - dy, px + dx, py + dy, 20, IRON.base);
          capsule(t, px - dx - 2, py - dy - 4, px + dx - 2, py + dy - 4, 7, IRON.hi, 0.7);
        }
      }
      flame(t, rx, ry - 70, ry + 66, 44, -0.06);
    }, { width: 10 });
    sheen(cv, rx - 80, ry - 78, 16, 10, 0.5);
    savePNG(path.join(OUT, 'streak_60.png'), W, W, down2(cv, W, W));
  }

  { // === streak_100.png — a phoenix: the flame grown two wings ==================
    const { cv, c } = canvas();
    warmGlow(cv, c, 190, 150, 130, 0.3);
    contactShadow(cv, c + 8, 326, 100, 14, 0.32);
    // Each wing is one feathered poly: a swept upper edge out to the tip, then
    // four big feather scallops back to the body. No tail — a pair of tongues
    // under the body read as feet at 32px and turned the phoenix into a hen.
    const wing = s => [
      [c + s * 22, 214], [c + s * 70, 162], [c + s * 120, 114], [c + s * 160, 78],
      [c + s * 142, 122], [c + s * 156, 154], [c + s * 124, 164], [c + s * 132, 206],
      [c + s * 96, 204], [c + s * 94, 246], [c + s * 56, 236], [c + s * 32, 272],
    ];
    const inner = s => [
      [c + s * 24, 220], [c + s * 62, 176], [c + s * 104, 134], [c + s * 132, 108],
      [c + s * 118, 148], [c + s * 98, 174], [c + s * 90, 212], [c + s * 60, 226], [c + s * 36, 258],
    ];
    withOutline(cv, t => {
      for (const s of [-1, 1]) {
        poly(t, wing(s), FIRE.in, 1, FIRE.out);
        poly(t, inner(s), FIRE.core, 0.85, FIRE.in);
      }
      flame(t, c, 54, 302, 56, -0.05);
    }, { width: 10 });
    sheen(cv, c - 24, 132, 10, 16, 0.45);
    savePNG(path.join(OUT, 'streak_100.png'), W, W, down2(cv, W, W));
  }
}
