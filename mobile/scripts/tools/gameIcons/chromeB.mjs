/**
 * gameIcons/chromeB.mjs — the SMALL CHROME MARKS (7 icons, 256px, saved flat in
 * assets/ui beside their shipped siblings).
 *
 * These are the smallest pictures in the game. A completed-row badge is 12dp, a
 * chevron in a row 16dp, a close mark 24dp: the whole icon lands on a patch of
 * screen the size of a fingernail clipping, and a device downscales the 256px
 * file 10-20x to get there. Everything that makes the bigger families read
 * (a second element, a texture, a grain) averages to a smear at that size, so
 * each of these is exactly ONE bold shape, drawn under three rules:
 *
 *   - STROKE >= 1/8 OF THE FRAME. A tick arm, a chevron limb, an X bar, the
 *     exclamation's stem: none is thinner than 64 px of the 512 supersample
 *     (32 at 256 = 1/8), so at 14 px the thinnest stroke is still ~2 px.
 *   - TWO VALUE STEPS and nothing finer. One top-lit gradient for the body, one
 *     lit crest on the upper-left side, one dark seat on the lower-right side.
 *     Every bevel is a thick band, never a hairline.
 *   - A FULL CONTOUR at ~2.5x the family default (withOutline width 24 => 12 px
 *     at 256, still ~1 px at 20dp). Without it a cream tick on a green button is
 *     a green blob on ash paper, and a brass star on cream parchment is a
 *     yellow smudge on yellow paper.
 *
 * Two pairs here share a shape family and MUST NOT be twins:
 *   check.png       ONE bold tick, a green-ENAMEL face set inside a thick BRASS
 *                   bevel rim. There is no seat: the first pass tucked a brass
 *                   coin behind the heel and the blind review saw two things (a
 *                   check laid over a disc) and a twin of the badge below. The
 *                   brass is now the carved SETTING of the mark itself, so the
 *                   silhouette is a check and nothing else, and it is told from
 *                   the badge by shape AND by colour inversion (green face in a
 *                   brass rim here; green ball with a cream tick there).
 *   check_badge.png a round green CANDY BUTTON carrying a raised CREAM tick. The
 *                   button is the subject: the tick sits wholly inside the disc,
 *                   so the silhouette is a plain circle.
 *   alert_pip.png   the same button in candy RED with a raised cream "!"; it is
 *                   check_badge's sibling on purpose (they are the two states of
 *                   one row badge) and is told apart by colour AND by the glyph.
 *
 * The chevron points RIGHT in the file and is rotated at render time for left
 * and down. Its light is therefore built into the WOOD, not the scene: a lit
 * crest along each limb's centre and a dark seat along each limb's trailing
 * edge. Rotated, it still reads as a carved arrow; the crest simply becomes a
 * ridge under whichever light the frame implies.
 *
 * Materials: the kit's BRASS for the seat, the star and the close mark (with a
 * pale crest and a deep shade added so a brass form has a genuine top and
 * bottom); the kit's WOOD for the chevron; AMB for the play face; candy green
 * and candy red picked to sit near the game's tile greens/reds and to clear
 * BOTH grounds by more than 0.13 luminance once the contour is between them.
 *
 * House doctrine (see _draw.mjs): contact shadow BEFORE withOutline, subject
 * inside it, sheen AFTER it. No Math.random; every coordinate is a literal, so
 * the set is byte-reproducible. All coordinates are in the 512x512 supersample
 * (c = 256 is the centre); each file downsamples 2x to 256px.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  savePNG, down2, contactShadow, sheen, withOutline, INK,
  C, hex, blend, ellipse, roundRect, capsule, arcStroke, poly,
  WOOD, BRASS, AMB,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui');
const S = 512;              // supersample size for a 256px icon
const c = 256;              // centre
const OUTLINE = { width: 24 };

// --- local palettes ---------------------------------------------------------
/** The kit's BRASS pair widened to five steps: a pale crest for the lit side,
 *  a deep shade for the seated side. hi/lo are the kit's own. */
const BR = { lite: '#F8E2A6', hi: BRASS.hi, mid: '#C48F3C', lo: BRASS.lo, deep: '#63401A' };
/** Candy green enamel. `lo` (0.19 lum) clears ash by 0.10 only through the
 *  contour; `hi` (0.50) clears cream by 0.27 outright. */
const GR = { lite: '#BFF0BE', hi: '#7DCF84', mid: '#4FA85A', lo: '#337A3D', deep: '#1F5228' };
/** Candy red. Same value spread as the green so the two badges are siblings. */
const RD = { lite: '#FFB9AC', hi: '#F4705F', mid: '#D9463A', lo: '#A52A22', deep: '#6A1813' };
/** Amber for the play face, the kit's AMB pair plus a pale crest and a deep rim. */
const AM = { lite: '#FFE9A4', hi: AMB.hi, mid: '#F5A21C', lo: AMB.lo, deep: '#784906' };
/** The raised cream glyphs. */
const CR = { hi: '#FFF9EA', base: '#F6E8C6', lo: '#D6BC8A' };

// ---------------------------------------------------------------------------
// Local primitives
// ---------------------------------------------------------------------------

/** Anti-aliased closed ring stroke (arcStroke's caps bead at the seam). */
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

/**
 * Replace every vertex of a polygon with a fillet arc of radius `rad`, so a
 * poly (which is the only kit primitive that takes gradTo) can have the rounded
 * candy corners the game's tiles have. Works on convex and concave corners
 * alike: the arc centre sits along the bisector of the two edges at the vertex,
 * on whichever side that bisector points, and the arc runs the short way from
 * one tangent point to the other.
 */
function roundPts(pts, rad, n = 8) {
  const out = [];
  const L = pts.length;
  for (let i = 0; i < L; i++) {
    const p = pts[i], a = pts[(i - 1 + L) % L], b = pts[(i + 1) % L];
    let ux = a[0] - p[0], uy = a[1] - p[1];
    const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
    let vx = b[0] - p[0], vy = b[1] - p[1];
    const vl = Math.hypot(vx, vy); vx /= vl; vy /= vl;
    const theta = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
    const half = theta / 2;
    const dist = rad / Math.sin(half);
    const t = rad / Math.tan(half);
    let bx = ux + vx, by = uy + vy;
    const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const cx = p[0] + bx * dist, cy = p[1] + by * dist;
    const t1 = [p[0] + ux * t, p[1] + uy * t], t2 = [p[0] + vx * t, p[1] + vy * t];
    const a1 = Math.atan2(t1[1] - cy, t1[0] - cx), a2 = Math.atan2(t2[1] - cy, t2[0] - cx);
    let d = a2 - a1;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    for (let k = 0; k <= n; k++) {
      const ang = a1 + (d * k) / n;
      out.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
    }
  }
  return out;
}

/** Corner points of a thick bar from A to B, as a rectangle (for poly+gradTo). */
function barPts(ax, ay, bx, by, th) {
  const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (th / 2), ny = (dx / l) * (th / 2);
  return [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
}

/** Four-point spark: tips at radius rOut on the axes, waists at rIn on the diagonals. */
const spark4Pts = (cx, cy, rOut, rIn) => Array.from({ length: 8 }, (_, i) => {
  const r = i % 2 ? rIn : rOut, a = -Math.PI / 2 + (i * Math.PI) / 4;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});

/**
 * A round candy button: top-lit disc, a dark seat band around the lower rim,
 * a lit crest around the upper rim. Two value steps beyond the gradient, both
 * thick enough to survive 12dp.
 */
function candyButton(t, cx, cy, r, pal) {
  roundRect(t, cx, cy, r, r, r, pal.hi, 1, pal.lo);
  arcStroke(t, cx, cy, r - 16, 26, 0.30, Math.PI - 0.30, pal.deep, 0.55);
  arcStroke(t, cx, cy, r - 18, 18, -Math.PI + 0.42, -0.42, pal.lite, 0.55);
}

/**
 * A raised cream glyph stroke: a dark drop under it (down-right), the cream
 * body, and a pale crest set up-left. `th` is the body thickness.
 */
function creamStroke(t, x1, y1, x2, y2, th, shade) {
  capsule(t, x1 + 8, y1 + 10, x2 + 8, y2 + 10, th + 4, shade, 0.85);
  capsule(t, x1, y1, x2, y2, th, CR.base);
  capsule(t, x1 - 3, y1 - 5, x2 - 3, y2 - 5, th * 0.52, CR.hi, 0.9);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === check.png — one bold green-enamel tick in a brass bevel rim ========
    // A single silhouette. The whole mark is drawn at K = 0.78 of its first
    // pass: that pass painted 0.95 x 0.89 of the frame (a 3px margin at 256)
    // and rendered visibly larger than close/check_badge/alert_pip beside it;
    // at K the painted bbox sits at ~0.75 of the frame with a >= 28px clear
    // margin, matching its siblings. The arms are 106px across in the
    // supersample (still over 1/5 of the frame), the brass rim 19px each side
    // (~1px at 20dp), the enamel face 68px. The face is split along each arm's
    // midline into a lit upper half and a deep lower half (two value steps),
    // the rim is lit along its upper-left run and dark along its lower-right,
    // and the INK contact shadow is tucked under the long arm's lower run,
    // offset down-right, so the bezel-only mark never reads as floating.
    const cv = C(S, S);
    const K = 0.78;
    const P = (dx, dy) => [c + dx * K, c + dy * K];
    const A = P(-152, 2), B = P(-34, 130), T = P(148, -140);                 // tick
    const TH = Math.round(136 * K), RIM = Math.round(24 * K), FACE = TH - RIM * 2;
    // up-facing normals of each arm (unit), for the lit half of the face
    const nLong = [-0.829, -0.559], nShort = [0.735, -0.678];
    const off = (Q, n, k) => [Q[0] + n[0] * k, Q[1] + n[1] * k];
    const lerp = (Q, R, k) => [Q[0] + (R[0] - Q[0]) * k, Q[1] + (R[1] - Q[1]) * k];
    const Sd = lerp(B, T, 0.28);
    contactShadow(cv, Sd[0] + 14, Sd[1] + TH / 2 + 10, 96, 20, 0.32);
    withOutline(cv, t => {
      // brass rim: dark run first, then the lit run set up-left so the bevel
      // has a genuine top and bottom
      capsule(t, A[0], A[1], B[0], B[1], TH, BR.lo);
      capsule(t, B[0], B[1], T[0], T[1], TH, BR.lo);
      capsule(t, A[0] - 7, A[1] - 7, B[0] - 7, B[1] - 7, TH - 5, BR.hi);
      capsule(t, B[0] - 7, B[1] - 7, T[0] - 7, T[1] - 7, TH - 5, BR.hi);
      // enamel face: deep green body, then the lit half of each arm
      capsule(t, A[0], A[1], B[0], B[1], FACE, GR.lo);
      capsule(t, B[0], B[1], T[0], T[1], FACE, GR.lo);
      capsule(t, B[0], B[1], B[0], B[1], FACE, GR.lo);                 // solid heel
      // (each lit half stops short of the heel, so the joint stays deep and
      // the two halves never cross into a pale X at the foot)
      const Bs = lerp(A, B, 0.72), Bl = lerp(B, T, 0.2);
      const a1 = off(A, nShort, FACE / 4), b1 = off(Bs, nShort, FACE / 4);
      const b2 = off(Bl, nLong, FACE / 4), t2 = off(T, nLong, FACE / 4);
      capsule(t, a1[0], a1[1], b1[0], b1[1], FACE / 2, GR.hi);
      capsule(t, b2[0], b2[1], t2[0], t2[1], FACE / 2, GR.hi);
      // a thin mint crest along the very top of the lit half (candy edge)
      const a3 = off(A, nShort, FACE * 0.38), b3 = off(Bs, nShort, FACE * 0.38);
      const b4 = off(Bl, nLong, FACE * 0.38), t4 = off(T, nLong, FACE * 0.38);
      capsule(t, a3[0], a3[1], b3[0], b3[1], FACE * 0.16, GR.lite, 0.7);
      capsule(t, b4[0], b4[1], t4[0], t4[1], FACE * 0.16, GR.lite, 0.7);
    }, OUTLINE);
    sheen(cv, c + 39, c - 50, 12, 20, 0.5);
    savePNG(path.join(OUT, 'check.png'), 256, 256, down2(cv, 256, 256));
  }

  { // === check_badge.png — round green candy button, raised cream tick ======
    // The completed-row badge. A plain circle in silhouette; the tick lives
    // entirely inside the disc and is raised off it by its own dark drop.
    const cv = C(S, S);
    const r = 170, cy = c + 4;
    contactShadow(cv, c + 8, cy + r + 12, 132, 24, 0.32);
    withOutline(cv, t => {
      candyButton(t, c, cy, r, GR);
      const A = [c - 96, cy + 6], B = [c - 30, cy + 84], T = [c + 104, cy - 78];
      const TH = 66;
      capsule(t, A[0] + 8, A[1] + 10, B[0] + 8, B[1] + 10, TH + 4, GR.deep, 0.85);
      capsule(t, B[0] + 8, B[1] + 10, T[0] + 8, T[1] + 10, TH + 4, GR.deep, 0.85);
      capsule(t, A[0], A[1], B[0], B[1], TH, CR.base);
      capsule(t, B[0], B[1], T[0], T[1], TH, CR.base);
      capsule(t, A[0] - 3, A[1] - 5, B[0] - 3, B[1] - 5, TH * 0.52, CR.hi, 0.9);
      capsule(t, B[0] - 3, B[1] - 5, T[0] - 3, T[1] - 5, TH * 0.52, CR.hi, 0.9);
    }, OUTLINE);
    sheen(cv, c - 96, cy - 100, 30, 18, 0.5);
    savePNG(path.join(OUT, 'check_badge.png'), 256, 256, down2(cv, 256, 256));
  }

  { // === chevron.png — chunky carved-wood chevron, pointing RIGHT ===========
    // Rotated at render time, so the light lives IN the limbs: a lit crest down
    // each limb's centre and a dark seat along each limb's trailing edge read
    // as carved relief whichever way up the frame turns it.
    const cv = C(S, S);
    // Limbs are 120px wide across (~88px perpendicular, well over 1/8 frame):
    // the first pass at 102 was the thinnest stroke on the sheet at 14px.
    const outer = [
      [c - 136, c - 180], [c - 16, c - 180], [c + 156, c],
      [c - 16, c + 180], [c - 136, c + 180], [c + 36, c],
    ];
    contactShadow(cv, c + 22, c + 196, 96, 22, 0.3);
    withOutline(cv, t => {
      poly(t, roundPts(outer, 22), WOOD.rim, 1, WOOD.dark);
      // dark seat: the trailing (left/inner) side of each limb
      capsule(t, c - 108, c - 150, c + 36, c - 6, 24, WOOD.seam, 0.5);
      capsule(t, c - 108, c + 150, c + 36, c + 6, 24, WOOD.seam, 0.5);
      // lit crest down each limb's centre. (A first pass also capped the two
      // heels with darker end grain; at 32px the caps read as notches cut into
      // the limbs, so the heels are now plain and the crest carries the relief.)
      capsule(t, c - 76, c - 158, c + 96, c - 6, 26, WOOD.rim, 0.85);
      capsule(t, c - 76, c + 158, c + 96, c + 6, 26, WOOD.light, 0.7);
    }, OUTLINE);
    sheen(cv, c - 60, c - 150, 22, 12, 0.45);
    savePNG(path.join(OUT, 'chevron.png'), 256, 256, down2(cv, 256, 256));
  }

  { // === alert_pip.png — candy-red round pip, raised cream exclamation ======
    // check_badge's sibling: the same button geometry in red, carrying a "!"
    // whose stem is a full 1/8 of the frame wide and whose dot is a fat bead.
    const cv = C(S, S);
    const r = 170, cy = c + 4;
    contactShadow(cv, c + 8, cy + r + 12, 132, 24, 0.32);
    withOutline(cv, t => {
      candyButton(t, c, cy, r, RD);
      // stem: a tapered bar, wider at the top, rounded ends
      const stem = roundPts([[c - 38, cy - 118], [c + 38, cy - 118], [c + 27, cy + 24], [c - 27, cy + 24]], 20);
      const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
      poly(t, shift(stem, 8, 10), RD.deep, 0.85);
      ellipse(t, c + 8, cy + 104, 40, 40, RD.deep, 0.85, 3);
      poly(t, stem, CR.hi, 1, CR.base);
      ellipse(t, c, cy + 94, 36, 36, CR.base, 1, 3);
      poly(t, shift(roundPts([[c - 22, cy - 106], [c + 8, cy - 106], [c + 2, cy + 8], [c - 14, cy + 8]], 8), -4, -4), CR.hi, 0.9);
      ellipse(t, c - 6, cy + 88, 22, 22, CR.hi, 0.9, 3);
    }, OUTLINE);
    sheen(cv, c - 96, cy - 100, 30, 18, 0.5);
    savePNG(path.join(OUT, 'alert_pip.png'), 256, 256, down2(cv, 256, 256));
  }

  { // === play.png — right-pointing candy-bevel triangle, amber face =========
    // A rounded triangle in two steps: a dark amber rim (the bevel) and a
    // brighter inset face, both top-lit, plus a lit ridge along the top edge.
    const cv = C(S, S);
    const rim = [[c - 118, c - 176], [c + 172, c], [c - 118, c + 176]];
    const face = [[c - 78, c - 112], [c + 104, c], [c - 78, c + 112]];
    contactShadow(cv, c + 14, c + 194, 108, 22, 0.32);
    withOutline(cv, t => {
      poly(t, roundPts(rim, 30), AM.mid, 1, AM.deep);
      capsule(t, c - 100, c - 156, c + 136, c - 12, 16, AM.lite, 0.6);   // lit top edge
      poly(t, roundPts(face, 20), AM.lite, 1, AM.mid);
      capsule(t, c - 70, c + 96, c + 78, c + 8, 14, AM.lo, 0.35);        // face foot shade
    }, OUTLINE);
    sheen(cv, c - 70, c - 92, 18, 26, 0.5);
    savePNG(path.join(OUT, 'play.png'), 256, 256, down2(cv, 256, 256));
  }

  { // === star_bullet.png — small brass four-point star (the ✦ bullet) =======
    // A true ✦ silhouette. The first passes gave the star a fat waist (rIn 80
    // against rOut 198), split each arm into four facets with ridge lines and
    // set a brass boss at the hub; at 14px the ridges and the boss collapsed
    // into a dark centre knot and the shallow concaves read as a fat PLUS, and
    // the mark was a rotation-twin of close.png (same gold, same mass, four
    // constant-width arms). Now the concaves are cut deep: the waist sits at
    // rIn 50, so the hub is ~71px across (0.19 of the 372px span, under the
    // 1/4 ceiling) and each arm TAPERS from that hub to a sharp tip. There is
    // no boss and no ridge: each arm is modelled with exactly two value steps,
    // a lit half on the side whose outer edge faces the upper-left light and a
    // shaded half on the other, each a top-lit gradient. The mass is smaller
    // and the lit step brighter than close.png's bars, so the two brass marks
    // differ by silhouette (tapered spark vs rounded constant-width bars) AND
    // by mass, and the negative space between the arms is unmistakable.
    const cv = C(S, S);
    const rOut = 186, rIn = 50;
    const pts = spark4Pts(c, c, rOut, rIn);
    // fillet the eight vertices (a hair at the tips so they do not vanish, a
    // little more at the waists so the concaves are candy, not razor cuts)
    const N = 8;
    const R = roundPts(pts, 7, N);
    const idx = (v, m) => R[v * (N + 1) + m];
    const run = (v, m0, m1) => { const o = []; for (let m = m0; m <= m1; m++) o.push(idx(v, m)); return o; };
    const LIT = { top: '#F6DC96', bot: '#DFAE55' };
    const SHD = { top: '#B07C34', bot: '#7E5522' };
    contactShadow(cv, c + 10, c + 196, 66, 16, 0.3);
    withOutline(cv, t => {
      poly(t, R, BR.mid, 1, BR.lo);                                   // seed fill under the seams
      const Lv = [-0.707, -0.707];
      for (let k = 0; k < 4; k++) {
        const tip = k * 2, wPrev = (tip + 7) % 8, wNext = tip + 1;
        // half A runs from the previous waist's arc midpoint to the tip's arc
        // midpoint; half B from there on to the next waist's midpoint
        const halves = [
          [[c, c], ...run(wPrev, N / 2, N), ...run(tip, 0, N / 2)],
          [[c, c], ...run(tip, N / 2, N), ...run(wNext, 0, N / 2)],
        ];
        for (const h of halves) {
          // outer-edge normal of this half, pointing away from the centre
          const a = pts[tip], w = h === halves[0] ? pts[wPrev] : pts[wNext];
          let nx = -(w[1] - a[1]), ny = w[0] - a[0];
          const mx = (a[0] + w[0]) / 2 - c, my = (a[1] + w[1]) / 2 - c;
          if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
          const nl = Math.hypot(nx, ny) || 1;
          const lit = (nx / nl) * Lv[0] + (ny / nl) * Lv[1] > 0;
          poly(t, h, lit ? LIT.top : SHD.top, 1, lit ? LIT.bot : SHD.bot);
        }
      }
    }, OUTLINE);
    sheen(cv, c - 13, c - 104, 8, 20, 0.5);                             // upper arm, lit half
    savePNG(path.join(OUT, 'star_bullet.png'), 256, 256, down2(cv, 256, 256));
  }

  { // === close.png — carved X mark with a brass face ========================
    // Two thick brass bars crossed, each a rounded bar so the corners are
    // candy, with one lit crest down the centre of each and a dark seat along
    // its lower side: the relief of a mark cut into a plate and gilded.
    const cv = C(S, S);
    const TH = 86, R = 150;
    contactShadow(cv, c + 12, c + 176, 104, 22, 0.32);
    withOutline(cv, t => {
      poly(t, roundPts(barPts(c - R, c - R, c + R, c + R, TH), 30), BR.hi, 1, BR.lo);
      poly(t, roundPts(barPts(c - R, c + R, c + R, c - R, TH), 30), BR.hi, 1, BR.lo);
      // dark seats along the lower side of each bar
      capsule(t, c - R + 30, c + R + 4, c + R - 4, c - R + 30, 20, BR.deep, 0.5);
      capsule(t, c - R + 4, c - R + 30, c + R - 30, c + R + 4, 20, BR.deep, 0.5);
      // lit crests down the centre of each bar (the up-left facing bar brighter)
      capsule(t, c - R + 20, c + R - 20, c + R - 20, c - R + 20, 24, BR.lite, 0.85);
      capsule(t, c - R + 20, c - R + 20, c + R - 20, c + R - 20, 22, BR.lite, 0.6);
      // the crossing sits proud: a small cap over the join, kept quiet so the
      // mark stays an X and not an X with a rivet in it
      ellipse(t, c, c, 40, 40, BR.hi, 1, 3);
      ellipse(t, c - 5, c - 5, 24, 24, BR.lite, 0.6, 3);
    }, OUTLINE);
    sheen(cv, c - 108, c - 122, 18, 14, 0.5);
    savePNG(path.join(OUT, 'close.png'), 256, 256, down2(cv, 256, 256));
  }
}
