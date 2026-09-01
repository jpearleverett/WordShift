/**
 * gameIcons/ceremony.mjs — the three PHASE-TRANSITION EMBLEMS (512px).
 *
 * PhaseTransitionOverlay plays a cinematic when the pit's wards ignite and the
 * game steps from one era to the next. The phase-4 and phase-5 ceremonies have
 * real in-engine art (the shadow figure, the roof the player raised), but the
 * three earlier transitions — Curious Thoughts, Deeper Questions, Growing
 * Shadows — had nothing behind their text. These three emblems fill that gap.
 * They are rendered at ~60% of the screen width, at ~0.55 opacity, over a
 * near-black ground (#2D2B55 / #1A1832 / #0D0B1A), so unlike every row icon in
 * the game they are LUMINOUS: each carries a soft bloom that is meant to be
 * seen, and the light in the picture IS the picture.
 *
 * What does NOT change from the row icons is the house voice. Each emblem is
 * still ONE anchored silhouette wrapped in `withOutline` (the warm INK contour,
 * scaled up to the 1024 supersample), top-lit from the upper-left with the
 * `gradTo` argument, with a contact shadow under it and one sheen on it. The
 * blooms are drawn on the real canvas BEFORE the contour pass (a glow must
 * never be outlined) and, per the kit's hard-won rule, every bloom colour sits
 * ABOVE cream parchment in all three channels — the review sheet still grades
 * these on cream and on ash, and a warm-white glow lightens both, where an
 * amber one would have laid a grey smudge on the light ground.
 *
 * The three darken as a set, which is the family's ladder:
 *
 *   ceremony_curious.png  a standing brass lantern, LIT, and two big moths
 *                         drawn to its glass. Warm brass and amber glass, the
 *                         widest bloom of the three. "Lean in, as if listening."
 *   ceremony_deeper.png   a four-pane cottage window at night, its interior a
 *                         deep indigo, ONE candle stub on the sill with its flame
 *                         BENT to the right as if in a draught. Weathered wood
 *                         frame, a tighter bloom. Emptier, quieter, waiting.
 *   ceremony_shadows.png  a bare tree standing against a round dusk sky, its
 *                         long shadow reaching right along the ground toward a
 *                         small distant cottage with one lit window; a CRIMSON
 *                         horizon line cuts the disc. Mauve and wine, the
 *                         faintest bloom. Growing Shadows.
 *
 * Why the third one is a MEDALLION rather than a landscape: a dusk sky cannot be
 * a glow (any mauve halo is darker than cream and smudges the light ground) and
 * a tree-on-a-hairline-rail is the composition the doctrine forbids. Cutting
 * the sky as a solid disc gives the scene one anchored silhouette — a circle
 * with the tree's crown breaking its top edge — and puts the sky INSIDE the
 * contour, where its value structure is read against the disc, not the ground.
 *
 * Values are pitched for both review grounds. Anything large is kept a full
 * step off ash (#352A31): the window frame is mid wood, not dark wood; the
 * tree's bark grades from a dusk-lit tan at the crown down to dark at the
 * roots; the disc's sky opens on a lifted violet rather than a night navy, and
 * the ground under the tree is a mauve-grey so the tree's own cast shadow has
 * something to be darker than.
 *
 * Every coordinate is a literal in the 1024x1024 supersample (c = 512); each
 * file is downsampled 2x to 512px. No Math.random: byte-reproducible.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  C, savePNG, down2, withOutline, INK, WOOD, BRASS,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, hex, blend,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/spots');
const S = 1024;
const c = 512;
/** Contour width for the 1024 supersample: the same ~2.3% of frame the 192px
 *  set uses (9 in a 384 space), so the three read with the kit's line weight. */
const RING_W = 22;

// --- local palettes ---------------------------------------------------------
/** Warm-white blooms. Every stop sits above cream (#F3E2BF) in all three
 *  channels, so on the parchment review ground they can only lighten. */
const BLOOM = { wide: '#FFF3D2', core: '#FFFBEC', dusk: '#FFEFE6' };
const GLASS = { hi: '#FFE9A9', lo: '#EE8E24', heart: '#FFF3C8' };
const FIRE = { out: '#FF8A1E', mid: '#FFD25A', core: '#FFF8E0' };
const WAX = { hi: '#FCF2DC', lo: '#D8C199', drip: '#FFF8E8', shade: '#C9B08A' };
const NIGHT = { hi: '#2B2752', lo: '#0F0D1C', warm: '#E88A2A', warmer: '#FFC060' };
const MOTH = { foreHi: '#E0C892', foreLo: '#A8804A', hindHi: '#D2B884', hindLo: '#8A6640', body: '#5C3E26', head: '#3E2A1A' };
const DUSK = { skyHi: '#7A5A9A', skyLo: '#B8506A', bandHi: '#C84A5E', band: '#C8283C', core: '#F05A66' };
const GROUND = { hi: '#7A5A70', lo: '#463040', cast: '#160C1A' };
const BARK = { crownHi: '#9C7458', crownLo: '#5E4034', hi: '#8E6650', lo: '#3E2620', rim: '#B08A68' };
const COTTAGE = { wallHi: '#9C7480', wallLo: '#5A3E4C', roofHi: '#6E3A46', roofLo: '#3A2030', roofRim: '#D0606A', door: '#3A2030', winHi: '#FFD36A', winLo: '#FFA030' };

// --- local helpers ----------------------------------------------------------
/** Contact shadow, scaled for the 1024 space. */
function shadow(cv, cx, cy, rx, ry, alpha = 0.3) {
  ellipse(cv, cx, cy, rx, ry, INK, alpha, 36);
}
/** Upper-left specular, scaled for the 1024 space. */
function sheen(cv, cx, cy, rx, ry, alpha = 0.5) {
  ellipse(cv, cx, cy, rx, ry, '#FFFFFF', alpha, 26);
}
/** A soft bloom: the kit's ellipse feathers INSIDE its radius (alpha is
 *  (1 - d) * rx / soft), so `soft` near rx gives a near-linear falloff from
 *  the centre to a clean zero at the rim — nothing lands past rx. */
function bloom(cv, cx, cy, rx, ry, color, alpha) {
  ellipse(cv, cx, cy, rx, ry, color, alpha, Math.round(rx * 0.85));
}
/** Full closed ring stroke (arcStroke double-caps a seam; see misc.mjs). */
function ringStroke(cv, cx, cy, r, th, color, alpha = 1) {
  const [rr, gg, bb] = hex(color);
  const half = th / 2, ext = r + half + 2;
  for (let y = Math.max(0, ~~(cy - ext)); y <= Math.min(cv.h - 1, ~~(cy + ext)); y++)
    for (let x = Math.max(0, ~~(cx - ext)); x <= Math.min(cv.w - 1, ~~(cx + ext)); x++) {
      const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r) - half;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blend(cv, x, y, rr, gg, bb, a * alpha);
    }
}
/** Push every vertex of a polygon out from its centroid by `g` px, for an ink
 *  underlay that follows the shape (the moth technique from upgrades.mjs). */
function grow(pts, g) {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  return pts.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g];
  });
}
/** A tapered stick as a quad: a branch, a shadow spike. */
function stick(x1, y1, x2, y2, w1, w2) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  return [
    [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2],
    [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2],
  ];
}
/** The horizontal slice of a disc between two scanlines, as a polygon whose
 *  sides follow the circle. Used to paint the dusk sky, the horizon band and
 *  the ground as one stacked medallion with no seams poking past the rim. */
function discSeg(cx, cy, R, y0, y1, n = 28) {
  const a0 = Math.asin(Math.max(-1, Math.min(1, (y0 - cy) / R)));
  const a1 = Math.asin(Math.max(-1, Math.min(1, (y1 - cy) / R)));
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    right.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    left.push([cx - Math.cos(a) * R, cy + Math.sin(a) * R]);
  }
  return right.concat(left.reverse());
}
/**
 * A flame BENT by a draught. The spine is a quadratic bezier from the wick
 * (bx, by) that rises straight up and then curves over to the tip (tx, ty);
 * each layer runs from the wick to a fraction `f` of the spine with the kit's
 * flameLobe profile (rounded base, widest a third of the way up, a point at
 * the end), so the three tongues share one curve instead of three.
 */
function bentFlame(cv, bx, by, tx, ty, layers, n = 22) {
  const px = bx, py = by - (by - ty) * 0.62;                // control: straight up
  const at = u => [
    (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * px + u * u * tx,
    (1 - u) * (1 - u) * by + 2 * (1 - u) * u * py + u * u * ty,
  ];
  for (const [f, w, color] of layers) {
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * f;
      const [x, y] = at(u);
      const [xa, ya] = at(Math.max(0, u - 0.01)), [xb, yb] = at(Math.min(1, u + 0.01));
      const dx = xb - xa, dy = yb - ya, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const hw = w * Math.sin(Math.min(1, (1 - i / n) * 1.15) * Math.PI * 0.62);
      L.push([x + nx * hw, y + ny * hw]);
      R.push([x - nx * hw, y - ny * hw]);
    }
    poly(cv, L.concat(R.reverse()), color, 1);
  }
}
/**
 * ONE moth, upright (head up, wings spread, antennae in a V), rotated by `ang`
 * and scaled by `s`. Built back to front and every part lays its own grown ink
 * shape first, so nothing ends in open air: hind wings, fore wings over them,
 * antennae, then the body over all four wing roots, then the head.
 */
function moth(t, mx, my, ang, s) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = ([lx, ly]) => [mx + (lx * ca - ly * sa) * s, my + (lx * sa + ly * ca) * s];
  const wing = (pts, sgn) => pts.map(([x, y]) => P([x * sgn, y]));
  const FORE = [[8, -34], [42, -46], [70, -20], [48, 14], [14, 4]];
  const HIND = [[10, 4], [46, 16], [50, 42], [24, 48], [8, 26]];
  for (const sgn of [-1, 1]) {
    const w = wing(HIND, sgn);
    poly(t, grow(w, 5 * s), INK, 0.95);
    poly(t, w, MOTH.hindHi, 1, MOTH.hindLo);
  }
  for (const sgn of [-1, 1]) {
    const w = wing(FORE, sgn);
    poly(t, grow(w, 5 * s), INK, 0.95);
    poly(t, w, MOTH.foreHi, 1, MOTH.foreLo);
    const [ex, ey] = P([sgn * 44, -18]);                    // one eye-spot per forewing
    ellipse(t, ex, ey, 7 * s, 7 * s, MOTH.body, 0.85, 2);
  }
  for (const sgn of [-1, 1]) {
    const [ax, ay] = P([sgn * 4, -36]), [bx, by] = P([sgn * 22, -66]);
    capsule(t, ax, ay, bx, by, 7 * s, INK, 0.95);
    capsule(t, ax, ay, bx, by, 3.5 * s, MOTH.body, 1);
  }
  const [b0x, b0y] = P([0, -30]), [b1x, b1y] = P([0, 44]);
  capsule(t, b0x, b0y, b1x, b1y, 20 * s, INK, 0.95);
  capsule(t, b0x, b0y, b1x, b1y, 13 * s, MOTH.body, 1);
  const [hx, hy] = P([0, -36]);
  ellipse(t, hx, hy, 10 * s, 10 * s, INK, 0.95, 2);
  ellipse(t, hx, hy, 7 * s, 7 * s, MOTH.head, 1, 2);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === ceremony_curious.png — the lit lantern and its two moths ===========
    // A standing hand lantern: ring, finial, peaked brass cap, amber glass with
    // a candle flame, two dark corner bars, a brass foot. The moths are BIG
    // (each spans ~19% of the frame) and sit on opposite diagonals — one over
    // the cap's right shoulder, one across the lower-left bar — which is the
    // only arrangement that reads as "circling" once the tile is 48px wide.
    const cv = C(S, S);
    bloom(cv, c, 540, 340, 400, BLOOM.wide, 0.34);
    bloom(cv, c, 540, 230, 280, BLOOM.core, 0.3);
    shadow(cv, c + 18, 884, 210, 30, 0.3);
    withOutline(cv, t => {
      // ring handle + finial
      ringStroke(t, c, 150, 46, 22, BRASS.lo);
      arcStroke(t, c, 150, 46, 12, -Math.PI + 0.3, -0.4, BRASS.hi, 0.9);
      capsule(t, c, 196, c, 232, 26, BRASS.lo);
      ellipse(t, c, 198, 17, 14, BRASS.hi, 1, 2);
      // peaked cap, top-lit
      poly(t, [[c - 84, 232], [c + 84, 232], [c + 186, 312], [c - 186, 312]], BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 178, 306, c + 178, 306, 12, '#6E4A1E', 0.7);
      roundRect(t, c, 322, 178, 14, 6, BRASS.lo, 1, '#6E4A1E');
      // the glass, lit from within
      roundRect(t, c, 545, 156, 218, 12, GLASS.hi, 1, GLASS.lo);
      ellipse(t, c, 520, 112, 152, GLASS.heart, 0.55, 100);
      // candle stub + flame
      roundRect(t, c, 705, 28, 48, 8, WAX.hi, 1, WAX.lo);
      capsule(t, c, 656, c, 640, 8, INK, 0.9);
      flameLobe(t, c, 405, 662, 62, FIRE.out);
      flameLobe(t, c, 470, 660, 40, FIRE.mid);
      flameLobe(t, c, 540, 658, 20, FIRE.core);
      // corner bars, with a brass edge catching the light
      for (const dx of [-150, 150]) {
        capsule(t, c + dx, 316, c + dx, 770, 26, INK, 0.95);
        capsule(t, c + dx - 6, 322, c + dx - 6, 764, 7, BRASS.hi, 0.6);
      }
      // rail, foot, base plate
      roundRect(t, c, 776, 176, 16, 6, BRASS.hi, 1, BRASS.lo);
      roundRect(t, c, 812, 120, 22, 8, BRASS.lo, 1, '#6E4A1E');
      roundRect(t, c, 848, 170, 20, 8, BRASS.hi, 1, BRASS.lo);
      // the two moths, drawn to the glass
      moth(t, c + 210, 300, 0.45, 1.35);
      moth(t, c - 212, 655, -0.4, 1.35);
    }, { width: RING_W });
    sheen(cv, c - 100, 268, 40, 12, 0.4);
    sheen(cv, c - 92, 380, 22, 60, 0.45);
    savePNG(path.join(OUT, 'ceremony_curious.png'), 512, 512, down2(cv, 512, 512));
  }

  { // === ceremony_deeper.png — one candle guttering in a dark window ========
    // A four-pane cottage window seen square on: mid-wood frame and mullions
    // (never dark wood — the ash ground would swallow it), a deep indigo
    // interior, and on the sill a fat wax stub in a brass dish whose flame is
    // bent hard to the right by a draught. The interior is lit ONLY where the
    // flame reaches, so the value structure inside the frame is a warm pool
    // in a dark room, which is what survives 48px.
    const cv = C(S, S);
    bloom(cv, c + 28, 520, 300, 330, BLOOM.wide, 0.2);
    shadow(cv, c + 16, 928, 330, 24, 0.3);
    withOutline(cv, t => {
      roundRect(t, c, 500, 300, 360, 14, WOOD.light, 1, WOOD.dark);       // frame
      capsule(t, c - 292, 152, c + 292, 152, 14, WOOD.rim, 0.55);           // lit top edge
      roundRect(t, c, 500, 262, 322, 8, INK, 0.9);                          // rebate
      roundRect(t, c, 502, 254, 314, 6, NIGHT.hi, 1, NIGHT.lo);             // the dark room
      ellipse(t, c + 44, 540, 190, 210, NIGHT.warm, 0.55, 150);             // candle-light pool
      ellipse(t, c + 44, 520, 110, 130, NIGHT.warmer, 0.55, 90);
      // mullions: a lit edge on the upper-left, a shade on the lower-right
      capsule(t, c, 190, c, 812, 34, WOOD.base);
      capsule(t, c - 8, 190, c - 8, 812, 9, WOOD.rim, 0.7);
      capsule(t, c + 10, 190, c + 10, 812, 8, WOOD.dark, 0.6);
      capsule(t, c - 254, 480, c + 254, 480, 34, WOOD.base);
      capsule(t, c - 254, 471, c + 254, 471, 9, WOOD.rim, 0.7);
      capsule(t, c - 254, 490, c + 254, 490, 8, WOOD.dark, 0.6);
      // sill and its lip
      roundRect(t, c, 858, 336, 28, 8, WOOD.rim, 1, WOOD.mid);
      roundRect(t, c, 894, 318, 14, 6, WOOD.dark, 1, '#5A3418');
      // brass dish with a ring handle
      ringStroke(t, c + 118, 796, 24, 13, BRASS.lo);
      arcStroke(t, c + 118, 796, 24, 7, -Math.PI + 0.3, -0.5, BRASS.hi, 0.9);
      roundRect(t, c, 816, 88, 16, 8, BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 82, 804, c + 82, 804, 10, BRASS.hi);
      // the wax stub, drips, shade
      roundRect(t, c, 700, 46, 108, 10, WAX.hi, 1, WAX.lo);
      capsule(t, c - 34, 640, c - 38, 700, 14, WAX.drip);
      capsule(t, c + 34, 630, c + 38, 668, 12, WAX.drip);
      capsule(t, c + 36, 600, c + 36, 796, 12, WAX.shade, 0.6);
      capsule(t, c, 594, c + 6, 572, 9, INK, 0.9);                          // wick
      bentFlame(t, c + 2, 600, c + 128, 420, [
        [1, 34, FIRE.out], [0.78, 22, FIRE.mid], [0.52, 11, FIRE.core],
      ]);
    }, { width: RING_W });
    sheen(cv, c - 250, 176, 40, 14, 0.4);
    sheen(cv, c - 26, 640, 10, 40, 0.45);
    savePNG(path.join(OUT, 'ceremony_deeper.png'), 512, 512, down2(cv, 512, 512));
  }

  { // === ceremony_shadows.png — the bare tree, its shadow, the far house =====
    // One round dusk medallion: lifted violet at the top grading to rose at the
    // horizon, the CRIMSON band, a mauve-grey ground. The tree stands left of
    // centre with its crown breaking the disc's top edge; its cast shadow is
    // a long dark wedge along the ground that stops at the doorstep of a small
    // cottage on the right, whose roof edge catches the horizon light and
    // whose one window is lit.
    const cv = C(S, S);
    const CX = c, CY = 530, R = 340;
    bloom(cv, CX, 560, 400, 380, BLOOM.dusk, 0.16);
    shadow(cv, CX + 16, 896, 300, 26, 0.3);
    withOutline(cv, t => {
      poly(t, discSeg(CX, CY, R, CY - R, 612), DUSK.skyHi, 1, DUSK.skyLo);   // sky
      poly(t, discSeg(CX, CY, R, 540, 612, 8), DUSK.skyLo, 0.9, DUSK.bandHi); // afterglow
      poly(t, discSeg(CX, CY, R, 604, 638, 6), DUSK.band, 1);                // the crimson line
      capsule(t, CX - 300, 616, CX + 300, 616, 10, DUSK.core, 0.9);
      poly(t, discSeg(CX, CY, R, 636, CY + R), GROUND.hi, 1, GROUND.lo);     // ground
      // the tree's cast shadow, reaching right toward the house
      poly(t, [[352, 744], [452, 744], [740, 710], [762, 704], [740, 696], [452, 720]], GROUND.cast, 0.85);
      capsule(t, 700, 712, 748, 690, 12, GROUND.cast, 0.85);
      capsule(t, 715, 714, 760, 716, 8, GROUND.cast, 0.85);
      // the distant cottage
      ellipse(t, 806, 708, 52, 6, GROUND.cast, 0.5, 4);
      roundRect(t, 800, 684, 46, 22, 4, COTTAGE.wallHi, 1, COTTAGE.wallLo);
      roundRect(t, 786, 696, 8, 12, 2, COTTAGE.door, 1);
      roundRect(t, 812, 686, 9, 9, 2, COTTAGE.winHi, 1, COTTAGE.winLo);
      roundRect(t, 830, 636, 8, 16, 2, COTTAGE.roofLo, 1);
      poly(t, [[744, 664], [856, 664], [800, 616]], COTTAGE.roofHi, 1, COTTAGE.roofLo);
      capsule(t, 748, 662, 800, 618, 7, COTTAGE.roofRim, 0.75);
      // the tree: branches first (crown-lit), then the trunk over their roots
      const BRANCHES = [
        [410, 420, 300, 270, 30, 14], [410, 410, 560, 250, 30, 14],
        [405, 500, 280, 420, 22, 10], [415, 480, 545, 400, 20, 10],
        [300, 270, 230, 175, 14, 6], [300, 270, 320, 150, 14, 6],
        [560, 250, 620, 150, 14, 6], [560, 250, 500, 160, 14, 6],
        [355, 345, 250, 300, 12, 5], [485, 330, 600, 300, 12, 5],
        [280, 420, 215, 370, 10, 5], [545, 400, 610, 370, 10, 5],
        [230, 175, 195, 140, 6, 3], [620, 150, 660, 115, 6, 3],
        [320, 150, 310, 110, 6, 3], [500, 160, 480, 120, 6, 3],
      ];
      for (const [x1, y1, x2, y2, w1, w2] of BRANCHES) {
        const hi = y2 < 300 ? BARK.crownHi : BARK.hi, lo = y2 < 300 ? BARK.crownLo : BARK.lo;
        poly(t, stick(x1, y1, x2, y2, w1, w2), hi, 1, lo);
      }
      poly(t, [[368, 728], [395, 560], [402, 400], [418, 400], [425, 560], [436, 728]], BARK.hi, 1, BARK.lo);
      poly(t, [[340, 730], [372, 690], [388, 730]], BARK.lo, 1);             // root flare
      poly(t, [[420, 730], [432, 690], [462, 730]], BARK.lo, 1);
      capsule(t, 396, 560, 372, 716, 8, BARK.rim, 0.5);                     // lit left flank
    }, { width: RING_W });
    sheen(cv, 352, 236, 40, 22, 0.3);
    savePNG(path.join(OUT, 'ceremony_shadows.png'), 512, 512, down2(cv, 512, 512));
  }
}

// Allow `node scripts/tools/gameIcons/ceremony.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('ceremony.mjs')) draw();
