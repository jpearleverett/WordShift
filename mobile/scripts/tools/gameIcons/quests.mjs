/**
 * gameIcons/quests.mjs — the QUEST TYPE set (12 icons). 192px each, filed as
 * assets/ui/quests/<type>.png, shown at 44dp at the head of a quest row in the
 * Journal hub. The hub's quest PILL already wears a red bullseye target, so
 * nothing here is a target: twelve distinct household objects instead, one per
 * quest type in src/services/weeklyQuests.ts, each nameable at 32dp by its
 * silhouette alone.
 *
 * NOT A LADDER. Quest types are siblings, not rungs, and a quest list shows
 * several of them stacked at once, so the whole job here is that no two rows
 * share a silhouette:
 *
 *   solve_count       a woven basket with three candy letter tiles standing in it
 *                     -> a trapezoid under an arched handle, squares poking up
 *   solve_difficulty  a wooden signpost, three arrow boards climbing a green hill
 *                     -> a post with three stacked arrows, a mound at its foot
 *   earn_stars        three gold stars hung from a sagging string
 *                     -> three stars in a shallow V
 *   no_hints          a brass box lantern, three louvre boards shut, warm light
 *                     at the seams and spilling at its foot -> a peaked cap and
 *                     ring over a banded box on a foot bar
 *   challenge_mode    a rolled letter, red ribbon, red wax seal, tails hanging
 *                     -> a diagonal tube with a disc on it
 *   speed_wins        a wooden hourglass grown two feathered wings
 *                     -> a pinched column between two wings
 *   earn_amber        a cinched leather pouch with amber gems at its mouth
 *                     -> a sack with a spiky crown
 *   visit_animals     a sage stoneware teapot and two cream cups on one wooden
 *                     tray -> an oval board, a round pot, two cups on its foot
 *   streak_days       a thick hemp rope on a lazy S, tied in three round
 *                     overhand knots -> a fat horizontal cord with three lumps
 *   sacrifice_amber   a stone altar bowl on a foot, gems inside, a low flame
 *                     -> a wide shallow dish over a stem, plume above
 *   tend_amber        a brass watering can tilted to pour, three ribbons of
 *                     water landing on a sprout, all on one mound -> a leaning
 *                     cylinder, a long spout, a pale fall onto two leaves
 *   variant_wins      three playing cards fanned from one pivot, a glyph on each
 *                     -> a splayed fan of rounded rectangles
 *
 * PALETTES. Ten of the twelve are warm cottage: kit WOOD / BRASS / AMB / STONE /
 * PARCH plus the game's own candy tile hues (TILE, copied from
 * CandyColors.tileColors in src/theme/colors.ts). There is NO cool grey in the
 * set: the first cut's iron lantern read as a birdcage beside the wood and
 * brass, so the lantern is brass now and its ironwork is warm dark brown. Two
 * are phase-keyed on purpose, because the quest types they name only exist in
 * those phases:
 *   sacrifice_amber (Phase 4+) goes DREAD — mauve-ash stone, an indigo well,
 *     a crimson flame that cools to amber only at its core; it is the ONE
 *     cool-toned row in the family, by design;
 *   tend_amber (Phase 5) goes SERENE — the brass kept, but pale lilac water,
 *     mauve soil, sage leaves, and a cream halo on the sprout.
 * Every glow is '#FFFBEC'/'#FFE6D8' at low alpha, LIGHTER than cream parchment
 * in every channel, so it lifts the surface it lands on instead of smudging it.
 * The darkest large area of any subject stays well above phase-4 ash paper
 * (#352A31) — INK itself is ash-luminance, so on the dark ground it is the
 * subject's own lower edge, not the contour, that has to separate from the row.
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
  INK, WOOD, PARCH, ACCENT, BRASS, AMB,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, starPts, hexPts,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/quests');

// --- palettes ----------------------------------------------------------------
/** [face, edge] pairs from CandyColors.tileColors (src/theme/colors.ts). */
const TILE = {
  pink: ['#FF6B9D', '#D44D7A'], blue: ['#4DAFFF', '#2E8BC0'], yellow: ['#FFD84D', '#CCB030'],
};
const GOLD = { hi: '#FFE07A', base: '#F2BE3A', lo: '#B77A12' };
/** The lantern's ironwork and shut interior: warm dark browns, never grey. The seam is amber edged with a cream core (inside the silhouette); the escaping glow is lighter than cream in every channel. */
const LANTERN = { mid: '#B98A3A', under: '#6E4715', inside: '#4A2C18', amber: '#FFC845', seam: '#FFF6C8', glow: '#FFF6C8' };
const LEAF = { hi: '#A6D46A', base: '#6FAF3F', lo: '#3D7A26' };
const TWINE = { hi: '#F3E6C4', base: '#D8C296', lo: '#A98F5F' };
const RIBBON = { hi: '#E2564F', lo: '#9A2A25' };
const WAX = { hi: '#E0433E', base: '#B52A2A', lo: '#7E1A1B' };
const LEATHER = { hi: '#C48A55', base: '#9B5E30', lo: '#6E3E1B' };
/** Sage-glazed stoneware (the teapot): kit ACCENT with a lit top. */
const POT = { hi: '#9CBF74', lo: ACCENT.lo, mouth: '#2F4A26' };
const GLAZE = { hi: '#FBF2E0', lo: '#D9C49C' };
const GLASS = { hi: '#DCEFF6', lo: '#98BCCC' };
const FEATHER = { hi: '#FBEDC9', lo: '#D3A862' };
/** Hemp rope: tan lit from above, dark brown underside, darker cut ends. */
const HEMP = { hi: '#DDBD82', base: '#C49E5C', lo: '#8A672E', fray: '#6B4E22' };
/** Dread stone: mauve-ash, kept light enough to stand on ash paper. */
const ALTAR = { hi: '#BFAFBC', base: '#928092', lo: '#6B5B6E', well: '#2A2140' };
const DREAD = { out: '#8E1B2E', mid: '#DA3F3E', in: '#FF9B5C', core: '#FFE0A8' };
/** Serene: pale lilac water (the pour is contoured, so it can sit below cream), mauve soil, sage leaves. */
const SERENE = { water: '#DCE6FA', waterHi: '#F4F8FF', waterLo: '#A9BEE8', soil: '#8A6E80', soilLo: '#5E4858', leafHi: '#9CCB84', leafLo: '#5F9464', stem: '#6FA070' };

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

/** A rotated oval as a point list (scroll ends, spout mouths). */
function ovalPts(cx, cy, ra, rb, rot, n = 28) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * ra, v = Math.sin(a) * rb;
    return [cx + u * ca - v * sa, cy + u * sa + v * ca];
  });
}

/** Upper half of an ellipse closed along its flat base — a dome, a lid, a hill. */
function domePts(cx, cy, rx, ry, n = 26) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
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

/** A thick stroke along a sampled path (a string, a stream). `th` may be a
 *  function of the segment's 0..1 position, so a cord can be pinched. */
function polyline(t, pts, th, color, alpha = 1) {
  const w = typeof th === 'function' ? th : () => th;
  for (let i = 1; i < pts.length; i++) {
    capsule(t, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w((i - 0.5) / (pts.length - 1)), color, alpha);
  }
}

/** A quadratic bezier sampled to a point list (handles, bails, pour arcs). */
function quadPts(p0, cp, p1, n = 18) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n, v = 1 - u;
    return [v * v * p0[0] + 2 * v * u * cp[0] + u * u * p1[0], v * v * p0[1] + 2 * v * u * cp[1] + u * u * p1[1]];
  });
}

/** Letter glyphs as stroke segments in a unit box (y down). */
const GLYPH = {
  W: [[-1, -1, -0.5, 1], [-0.5, 1, 0, -0.2], [0, -0.2, 0.5, 1], [0.5, 1, 1, -1]],
  A: [[-0.95, 1, 0, -1], [0, -1, 0.95, 1], [-0.5, 0.25, 0.5, 0.25]],
  E: [[-0.7, -1, -0.7, 1], [-0.7, -1, 0.8, -1], [-0.7, 0, 0.5, 0], [-0.7, 1, 0.8, 1]],
};

/**
 * One candy letter tile wearing the game's OWN tile chrome (LetterTile's edge
 * slab, bevel plane, gloss bar and specular dot), extruded on two offset planes
 * so it has visible thickness. Same construction as the shipped shop tile.
 */
function tile(t, cx, cy, hw, hh, angDeg, pal, letter) {
  const ang = (angDeg * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (lx, ly) => [cx + lx * ca - ly * sa, cy + lx * sa + ly * ca];
  const RR = (lx, ly, w, h, rad) => roundRectPts(...P(lx, ly), w, h, rad, ang);
  poly(t, RR(0, 12, hw + 8, hh + 20, 22), INK);                                // own keyline
  poly(t, RR(0, 24, hw, hh, 18), shade(pal[1], 0.56));                         // base plane
  poly(t, RR(0, 12, hw, hh, 18), pal[1]);                                      // side plane
  poly(t, RR(0, 0, hw, hh, 18), pal[0]);                                       // face
  poly(t, RR(0, -hh * 0.46, hw - 5, hh * 0.54, 16), shade(pal[0], 1.16));      // bevel plane
  poly(t, RR(0, -hh * 0.64, hw * 0.74, hh * 0.12, 10), '#FFFFFF', 0.4);        // gloss bar
  const [sx, sy] = P(hw * 0.58, -hh * 0.56);
  ellipse(t, sx, sy, 8, 8, '#FFFFFF', 0.75, 3);                                // specular dot
  if (letter) {
    const gx = hw * 0.5, gy = hh * 0.5, th = hw * 0.3;
    for (const [x0, y0, x1, y1] of GLYPH[letter]) {
      const a = P(x0 * gx, y0 * gy + 8), b = P(x1 * gx, y1 * gy + 8);
      capsule(t, a[0], a[1], b[0], b[1], th + 4, shade(pal[1], 0.62), 0.55);
    }
    for (const [x0, y0, x1, y1] of GLYPH[letter]) {
      const a = P(x0 * gx, y0 * gy + 2), b = P(x1 * gx, y1 * gy + 2);
      capsule(t, a[0], a[1], b[0], b[1], th, '#FFF6E2');
    }
  }
}

/** A gold five-point star with its own keyline and a lit upper facet. */
function star(t, cx, cy, rOut, rot = -Math.PI / 2) {
  const rIn = rOut * 0.42;
  poly(t, starPts(cx, cy, rOut + 7, rIn + 5, rot), INK, 0.95);
  poly(t, starPts(cx, cy, rOut, rIn, rot), GOLD.hi, 1, GOLD.lo);
  poly(t, starPts(cx, cy - rOut * 0.06, rOut * 0.56, rIn * 0.56, rot), '#FFF4C2', 0.55);
}

/** A small cut amber gem: pointy-top hexagon, keyline, lit upper-left facet. */
function gem(t, cx, cy, r) {
  poly(t, hexPts(cx, cy, r + 6), INK, 0.95);
  poly(t, hexPts(cx, cy, r), AMB.hi, 1, AMB.lo);
  const h = hexPts(cx, cy, r * 0.72);
  poly(t, [h[4], h[5], h[0], [cx, cy]], '#FFEBB0', 0.75);
  ellipse(t, cx - r * 0.3, cy - r * 0.34, r * 0.2, r * 0.16, '#FFFFFF', 0.8, 3);
}

/**
 * A cream-glazed cup standing on the tray, handle on the outward side
 * (`side` = -1 left, +1 right), tea showing at the lip. 64px wide (1/6 frame)
 * so it survives 32dp; its own keyline at the lip and handle, the rest of its
 * contour comes from the family withOutline.
 */
function cup(t, cx, cy, side) {
  const a0 = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, a1 = a0 + Math.PI;
  arcStroke(t, cx + side * 28, cy - 2, 16, 20, a0, a1, INK, 0.95);
  arcStroke(t, cx + side * 28, cy - 2, 16, 12, a0, a1, GLAZE.lo);
  roundRect(t, cx, cy, 32, 24, 10, GLAZE.hi, 1, GLAZE.lo);          // cup body
  ellipse(t, cx, cy - 22, 32, 9, INK, 0.95, 3);                     // lip keyline
  ellipse(t, cx, cy - 23, 28, 7, GLAZE.hi, 1, 3);
  ellipse(t, cx + 2, cy - 22, 21, 4, '#8E5A2C', 0.8, 3);            // the tea
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });
  const c = W;

  { // === solve_count.png — a woven basket with three letter tiles standing in it ===
    const { cv } = canvas();
    contactShadow(cv, c + 6, 342, 128, 20, 0.32);
    withOutline(cv, t => {
      // arched handle, behind everything
      arcStroke(t, c, 220, 120, 28, Math.PI + 0.12, 2 * Math.PI - 0.12, WOOD.mid);
      arcStroke(t, c, 220, 120, 11, Math.PI + 0.3, Math.PI * 1.55, WOOD.rim, 0.8);
      // three tiles standing in the basket, leaning apart
      tile(t, c - 74, 196, 34, 38, -13, TILE.pink, 'W');
      tile(t, c + 72, 198, 34, 38, 14, TILE.yellow, 'E');
      tile(t, c, 186, 36, 40, 2, TILE.blue, 'A');
      // the basket body: a trapezoid, wider at the rim, top-lit
      poly(t, [[c - 128, 226], [c + 128, 226], [c + 112, 318], [c + 96, 332], [c - 96, 332], [c - 112, 318]], WOOD.light, 1, WOOD.dark);
      // weave: three BOLD dark bands and three light bands, plus four stakes.
      // Cells are ~45x30 supersample px, above the 1/12-frame floor, so the
      // weave stays a weave at 32dp instead of averaging to a wash.
      for (const y of [252, 282, 310]) capsule(t, c - 118 + (y - 226) * 0.18, y, c + 118 - (y - 226) * 0.18, y, 14, WOOD.dark, 0.5);
      for (const y of [238, 267, 296]) capsule(t, c - 122 + (y - 226) * 0.18, y, c + 122 - (y - 226) * 0.18, y, 9, WOOD.rim, 0.55);
      for (const x of [-72, -24, 24, 72]) capsule(t, c + x, 232, c + x * 0.86, 326, 11, WOOD.seam, 0.42);
      // rim lip
      roundRect(t, c, 226, 138, 14, 7, WOOD.rim, 1, WOOD.mid);
      capsule(t, c - 134, 240, c + 134, 240, 6, INK, 0.5);
      // foot band
      capsule(t, c - 98, 326, c + 98, 326, 10, WOOD.seam, 0.5);
    }, { width: 9 });
    sheen(cv, c - 92, 236, 26, 8, 0.5);
    sheen(cv, c - 64, 104, 16, 8, 0.4);
    savePNG(path.join(OUT, 'solve_count.png'), W, W, down2(cv, W, W));
  }

  { // === solve_difficulty.png — a signpost with three arrow boards climbing a hill ===
    const { cv } = canvas();
    const px = c - 48;                                            // the post
    contactShadow(cv, c + 30, 350, 150, 16, 0.3);
    withOutline(cv, t => {
      // post, with a little pointed cap
      capsule(t, px, 74, px, 312, 32, WOOD.base);
      capsule(t, px - 8, 80, px - 8, 300, 10, WOOD.rim, 0.6);
      capsule(t, px + 9, 84, px + 9, 300, 8, WOOD.seam, 0.4);
      poly(t, [[px - 22, 76], [px, 50], [px + 22, 76]], WOOD.light, 1, WOOD.dark);
      // green hill over the post's foot: the slope the arrows climb. Kept
      // inside the frame (the first cut ran 6px off the right edge).
      poly(t, domePts(c + 24, 358, 136, 100), LEAF.hi, 1, LEAF.lo);
      capsule(t, c - 60, 304, c + 104, 274, 18, LEAF.hi, 0.35);
      // three arrow boards, each tilted up toward the summit, stacked up the
      // post with clear air between them (touching boards fused into a ladder
      // at 32dp) and a long, deep arrowhead so the DIRECTION survives the shrink.
      const board = (y, len) => {
        const ang = -0.26, ca = Math.cos(ang), sa = Math.sin(ang);
        const P = (lx, ly) => [px - 18 + lx * ca - ly * sa, y + lx * sa + ly * ca];
        const pts = [P(0, -19), P(len - 46, -19), P(len - 40, -30), P(len, 0), P(len - 40, 30), P(len - 46, 19), P(0, 19)];
        poly(t, pts, INK, 0.95);
        poly(t, pts.map(([x, yy]) => [x + (px - 18 - x) * 0.05, yy + (y - yy) * 0.2]), WOOD.light, 1, WOOD.mid);
        const a = P(8, -7), b = P(len - 50, -7);
        capsule(t, a[0], a[1], b[0], b[1], 7, WOOD.rim, 0.7);
        const n1 = P(16, 0), n2 = P(len - 58, 0);
        capsule(t, n1[0], n1[1], n1[0], n1[1], 9, WOOD.seam, 0.7);   // two nail heads
        capsule(t, n2[0], n2[1], n2[0], n2[1], 9, WOOD.seam, 0.7);
      };
      board(244, 150);
      board(174, 172);
      board(104, 194);
    }, { width: 9 });
    sheen(cv, px - 40, 104, 12, 8, 0.45);
    sheen(cv, c - 30, 288, 30, 10, 0.35);
    savePNG(path.join(OUT, 'solve_difficulty.png'), W, W, down2(cv, W, W));
  }

  { // === earn_stars.png — three gold stars hung from a sagging string ===
    const { cv } = canvas();
    contactShadow(cv, c + 6, 350, 118, 16, 0.28);
    withOutline(cv, t => {
      // the string: a shallow parabola, knotted at both ends
      const str = [];
      for (let i = 0; i <= 16; i++) {
        const x = 44 + (i / 16) * 296;
        str.push([x, 170 - 0.002465 * (x - 192) * (x - 192)]);
      }
      polyline(t, str, 12, TWINE.base);
      polyline(t, str.map(([x, y]) => [x - 2, y - 3]), 5, TWINE.hi, 0.7);
      capsule(t, 44, 116, 44, 116, 24, TWINE.lo);
      capsule(t, 340, 116, 340, 116, 24, TWINE.lo);
      // short ties from the string down to each star's top point
      capsule(t, 96, 150, 96, 168, 10, TWINE.lo);
      capsule(t, 192, 170, 192, 196, 10, TWINE.lo);
      capsule(t, 288, 150, 288, 168, 10, TWINE.lo);
      star(t, 96, 226, 62);
      star(t, 288, 226, 62);
      star(t, 192, 268, 74);
    }, { width: 9 });
    sheen(cv, 172, 232, 10, 14, 0.5);
    sheen(cv, 80, 196, 8, 11, 0.45);
    sheen(cv, 272, 196, 8, 11, 0.45);
    savePNG(path.join(OUT, 'earn_stars.png'), W, W, down2(cv, W, W));
  }

  { // === no_hints.png — a brass box lantern, three louvres shut, warm light at the seams and spilling at the foot ===
    // Round 1 drew a tall narrow grey box with five thin bars and the blind
    // reviewer saw a birdcage; round 2 went brass but squat, with hairline
    // seams that vanished at 32dp, so it read as a brass box. This one is a
    // proper box lantern, a little taller than wide: a peaked cap under a fat
    // carry ring, a foot bar wider than the body, and THREE broad louvre
    // boards (40px, ~1/10 frame) overlapping downward with a dark underside
    // step on each. The LIGHT is the subject now: every seam between boards is
    // a 16px amber band with a cream core (inside the silhouette, so it is
    // never contoured), and one pale fan of light escapes the bottom seam
    // onto the ground, drawn OUTSIDE withOutline in a value lighter than cream
    // in every channel so it lifts either ground instead of smudging it.
    const { cv } = canvas();
    contactShadow(cv, c + 10, 342, 124, 14, 0.32);
    // the escaping light: a fan on the ground under the foot seam, uncontoured
    poly(cv, [[c - 62, 298], [c + 62, 298], [c + 132, 352], [c - 120, 352]], LANTERN.glow, 0.85);
    withOutline(cv, t => {
      // the carry ring: a thick brass torus, and the collar it hangs from
      arcStroke(t, c, 62, 24, 20, 0, Math.PI * 2, BRASS.lo);
      arcStroke(t, c - 2, 60, 24, 8, Math.PI * 1.05, Math.PI * 1.85, BRASS.hi, 0.85);
      roundRect(t, c, 92, 18, 10, 4, BRASS.hi, 1, BRASS.lo);
      // the foot bar first so the body stands on it; wider than the body
      roundRect(t, c, 312, 104, 11, 5, BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 98, 319, c + 98, 319, 7, LANTERN.under, 0.7);
      // the body: a brass box whose inside is shut dark, with two corner posts
      roundRect(t, c, 222, 90, 82, 10, LANTERN.mid, 1, LANTERN.under);
      roundRect(t, c, 222, 82, 76, 6, LANTERN.inside);
      capsule(t, c - 92, 146, c - 92, 296, 10, LANTERN.under);
      capsule(t, c + 92, 146, c + 92, 296, 10, LANTERN.under);
      // the seams: three warm bands of light, amber edged, cream cored,
      // laid down BEFORE the boards so each board overlaps the one below
      for (const y of [186, 242, 296]) {
        capsule(t, c - 84, y, c + 84, y, 16, LANTERN.amber);
        capsule(t, c - 82, y - 1, c + 82, y - 1, 8, LANTERN.seam);
      }
      // three broad louvre boards, top-lit brass, a dark underside step each,
      // overhanging the posts so they read as shutters and not as bands
      for (const y of [158, 214, 270]) {
        roundRect(t, c, y, 96, 20, 5, BRASS.hi, 1, LANTERN.mid);
        capsule(t, c - 92, y + 16, c + 92, y + 16, 9, LANTERN.under, 0.85);
      }
      // the peaked cap over the body, its eave shading the top board
      poly(t, [[c - 108, 138], [c + 108, 138], [c + 30, 96], [c - 30, 96]], BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 100, 141, c + 100, 141, 10, LANTERN.under, 0.8);
    }, { width: 9 });
    sheen(cv, c - 58, 118, 18, 7, 0.5);
    sheen(cv, c - 66, 148, 14, 5, 0.4);
    savePNG(path.join(OUT, 'no_hints.png'), W, W, down2(cv, W, W));
  }
  { // === challenge_mode.png — a rolled letter, red ribbon, red wax seal ===
    const { cv } = canvas();
    const A = [86, 250], B = [298, 134];                          // the roll's axis
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;   // n points down-right
    const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const R = 48;
    contactShadow(cv, c + 8, 332, 128, 18, 0.3);
    withOutline(cv, t => {
      // ribbon tails hang from under the roll first, so the roll lies on them
      const tail = (x0, y0, dx, len, sway) => {
        const pts = [[x0 - 16, y0], [x0 + 16, y0], [x0 + 16 + dx + sway, y0 + len], [x0 + dx, y0 + len - 18], [x0 - 16 + dx - sway, y0 + len]];
        poly(t, pts, RIBBON.hi, 1, RIBBON.lo);
      };
      tail(M[0] - 10, M[1] + 30, -22, 106, 6);
      tail(M[0] + 30, M[1] + 30, 18, 96, 6);
      // the roll: a parchment cylinder along the axis
      capsule(t, A[0], A[1], B[0], B[1], R * 2, PARCH.base);
      capsule(t, A[0] - nx * 26, A[1] - ny * 26, B[0] - nx * 26, B[1] - ny * 26, 30, PARCH.hi, 0.9);
      capsule(t, A[0] + nx * 30, A[1] + ny * 30, B[0] + nx * 30, B[1] + ny * 30, 22, PARCH.shadow, 0.8);
      // the rolled ends: an oval face with a spiral of two rings
      for (const [E, s] of [[A, -1], [B, 1]]) {
        const ex = E[0] + ca * s * 4, ey = E[1] + sa * s * 4;
        poly(t, ovalPts(ex, ey, 18, R, ang), INK, 0.9);
        poly(t, ovalPts(ex, ey, 15, R - 3, ang), PARCH.dim);
        poly(t, ovalPts(ex, ey, 9, R * 0.62, ang), '#C9A76E');
        poly(t, ovalPts(ex, ey, 5, R * 0.3, ang), PARCH.hi);
      }
      // the ribbon band, wrapped around the middle
      capsule(t, M[0] + nx * (R + 6), M[1] + ny * (R + 6), M[0] - nx * (R + 6), M[1] - ny * (R + 6), 40, RIBBON.lo);
      capsule(t, M[0] + nx * (R + 4), M[1] + ny * (R + 4), M[0] - nx * (R + 4), M[1] - ny * (R + 4), 26, RIBBON.hi);
      // the wax seal, sitting proud on the ribbon
      const sx = M[0] + 4, sy = M[1] + 8;
      ellipse(t, sx, sy, 44, 44, INK, 0.95, 3);
      roundRect(t, sx, sy, 40, 40, 40, WAX.hi, 1, WAX.lo);
      arcStroke(t, sx, sy, 28, 7, 0, Math.PI * 2, WAX.lo, 0.6);
      poly(t, starPts(sx, sy + 1, 18, 8), WAX.lo, 0.85);
      ellipse(t, sx - 12, sy - 14, 9, 6, '#FF9A8E', 0.7, 3);
    }, { width: 9 });
    sheen(cv, 132, 190, 18, 8, 0.5);
    savePNG(path.join(OUT, 'challenge_mode.png'), W, W, down2(cv, W, W));
  }

  { // === speed_wins.png — a wooden hourglass grown two feathered wings ===
    const { cv } = canvas();
    contactShadow(cv, c + 6, 330, 104, 16, 0.32);
    withOutline(cv, t => {
      // wings first, so the frame sits in front of their roots
      const wing = (s) => {
        const R = [c - 34 * s, 198];
        const P = (dx, dy) => [R[0] + dx * s, R[1] + dy];
        const pts = [P(0, -16), P(-34, -58), P(-84, -88), P(-122, -82), P(-88, -48), P(-114, -32), P(-72, -10), P(-90, 14), P(-42, 22), P(-4, 26)];
        poly(t, pts, FEATHER.hi, 1, FEATHER.lo);
        // feather divisions: thick INK strokes from the root toward the tips
        const q = [P(-14, -6)];
        for (const [tx, ty] of [[-88, -48], [-72, -10]]) capsule(t, q[0][0], q[0][1], P(tx, ty)[0], P(tx, ty)[1], 7, INK, 0.55);
        capsule(t, P(-20, -30)[0], P(-20, -30)[1], P(-100, -76)[0], P(-100, -76)[1], 6, '#FFFFFF', 0.45);
      };
      wing(1); wing(-1);
      // the glass: one pinched polygon
      const g = [];
      for (let y = 108; y <= 284; y += 6) g.push([c + 12 + 46 * Math.pow(Math.abs(y - 196) / 88, 1.5), y]);
      for (let y = 284; y >= 108; y -= 6) g.push([c - 12 - 46 * Math.pow(Math.abs(y - 196) / 88, 1.5), y]);
      poly(t, g, GLASS.hi, 1, GLASS.lo);
      // sand: the fallen pile, the trickle, the last of the top
      const sand = [];
      for (let y = 236; y <= 280; y += 4) sand.push([c + 8 + 46 * Math.pow(Math.abs(y - 196) / 88, 1.5), y]);
      for (let y = 280; y >= 236; y -= 4) sand.push([c - 8 - 46 * Math.pow(Math.abs(y - 196) / 88, 1.5), y]);
      poly(t, sand, AMB.hi, 1, AMB.lo);
      capsule(t, c, 194, c, 246, 7, AMB.hi);
      poly(t, domePts(c, 186, 22, 20), AMB.hi, 1, AMB.lo);
      // wooden frame: two caps and two posts
      capsule(t, c - 62, 104, c - 62, 292, 14, WOOD.dark);
      capsule(t, c + 62, 104, c + 62, 292, 14, WOOD.dark);
      roundRect(t, c, 96, 76, 14, 6, WOOD.light, 1, WOOD.dark);
      roundRect(t, c, 300, 76, 14, 6, WOOD.light, 1, WOOD.dark);
      capsule(t, c - 70, 92, c + 70, 92, 5, WOOD.rim, 0.7);
    }, { width: 9 });
    sheen(cv, c - 30, 134, 12, 22, 0.45);
    sheen(cv, c - 118, 128, 14, 8, 0.35);
    savePNG(path.join(OUT, 'speed_wins.png'), W, W, down2(cv, W, W));
  }

  { // === earn_amber.png — a cinched leather pouch with amber gems at its mouth ===
    const { cv } = canvas();
    contactShadow(cv, c + 8, 344, 106, 16, 0.32);
    withOutline(cv, t => {
      // the sack: a gathered neck widening to a round belly
      const sack = [[c + 46, 178], [c + 64, 198], [c + 86, 224], [c + 100, 254], [c + 104, 284]];
      for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI; sack.push([c + 104 * Math.cos(a), 290 + 46 * Math.sin(a)]); }
      sack.push([c - 100, 254], [c - 86, 224], [c - 64, 198], [c - 46, 178]);
      poly(t, sack, LEATHER.hi, 1, LEATHER.lo);
      capsule(t, c - 60, 300, c + 60, 300, 26, LEATHER.lo, 0.35);      // belly shade
      // the gathered mouth flaring above the tie, suede side out
      poly(t, [[c - 50, 180], [c - 70, 140], [c - 34, 154], [c - 8, 130], [c + 20, 154], [c + 48, 130], [c + 72, 142], [c + 52, 180]], '#D9A472', 1, LEATHER.base);
      // gems spilling at the mouth
      gem(t, c - 38, 128, 29);
      gem(t, c + 54, 132, 27);
      gem(t, c + 8, 104, 32);
      // the drawstring: a cord around the neck, knotted, two tails
      capsule(t, c - 54, 180, c + 54, 180, 22, TWINE.lo);
      capsule(t, c - 52, 177, c + 52, 177, 12, TWINE.hi);
      capsule(t, c + 58, 184, c + 58, 184, 22, TWINE.lo);
      capsule(t, c + 58, 184, c + 84, 226, 13, TWINE.lo);
      capsule(t, c + 58, 184, c + 68, 236, 13, TWINE.lo);
      capsule(t, c + 58, 184, c + 58, 184, 12, TWINE.hi);
    }, { width: 9 });
    sheen(cv, c - 56, 228, 20, 30, 0.4);
    savePNG(path.join(OUT, 'earn_amber.png'), W, W, down2(cv, W, W));
  }

  { // === visit_animals.png — a sage stoneware teapot and two cream cups on one wooden tray ===
    // Round 1 re-drew the shop's brown kitchen teapot with two loose cups
    // beside it (rule 12, and two stray blobs at 32dp). This is a different
    // vessel, a squat sage-glazed pot with a cream lid and a short straight
    // spout, and ONE silhouette: pot and cups all stand on an oval wooden tray,
    // the cups overlapping the pot's foot, so the tray edge and one contact
    // shadow anchor everything.
    const { cv } = canvas();
    const px = c - 6, py = 206;                                    // the pot's belly
    contactShadow(cv, c + 10, 342, 146, 14, 0.32);
    withOutline(cv, t => {
      // the tray: a top-lit oval board with a dark rim and a visible thickness
      poly(t, ovalPts(c, 306, 138, 38, 0), WOOD.dark, 1, WOOD.seam);
      poly(t, ovalPts(c, 298, 130, 32, 0), WOOD.light, 1, WOOD.mid);
      // spout (left, short and straight) and handle (right) under the body
      poly(t, [[px - 70, 176], [px - 142, 142], [px - 150, 166], [px - 72, 222]], POT.hi, 1, POT.lo);
      poly(t, ovalPts(px - 146, 152, 8, 13, Math.atan2(-45, -75)), POT.mouth, 0.9);
      arcStroke(t, px + 80, 208, 38, 22, -Math.PI * 0.55, Math.PI * 0.55, POT.lo);
      arcStroke(t, px + 80, 208, 38, 9, -Math.PI * 0.5, -0.1, POT.hi, 0.7);
      // the belly: squat and round, sage glaze lit from above
      roundRect(t, px, py, 84, 68, 52, POT.hi, 1, POT.lo);
      capsule(t, px - 40, 254, px + 44, 254, 24, POT.lo, 0.35);       // foot shade
      // cream lid with a small brass knob
      capsule(t, px - 74, 146, px + 74, 146, 14, GLAZE.hi);
      capsule(t, px - 72, 150, px + 72, 150, 5, GLAZE.lo, 0.6);
      poly(t, domePts(px, 140, 62, 26), GLAZE.hi, 1, GLAZE.lo);
      roundRect(t, px, 112, 13, 10, 5, BRASS.hi, 1, BRASS.lo);
      // two cream cups standing ON the tray in front of the pot, overlapping
      // its foot so the three pieces make one silhouette
      cup(t, c - 62, 280, -1);
      cup(t, c + 58, 284, 1);
    }, { width: 9 });
    sheen(cv, px - 50, 180, 20, 14, 0.5);
    sheen(cv, px - 34, 126, 10, 5, 0.4);
    savePNG(path.join(OUT, 'visit_animals.png'), W, W, down2(cv, W, W));
  }

  { // === streak_days.png — a thick hemp rope on a lazy S, tied in three round overhand knots ===
    // Round 1 was a thin diagonal rod with three flat discs on it and read as
    // beads on a skewer; round 2 fattened the rope but stretched each knot
    // ALONG the cord with a strand running diagonally over it, and the three
    // together read as one twisted cruller at 32dp. Now the rope (46px, ~1/8
    // frame) lies on a gentle S that never rises past ~20deg, its cut ends
    // frayed in a darker hemp, and each knot is a near-ROUND bulge (64px,
    // ~1/6 frame) with its own keyline and ONE dark strand crossing it
    // steeply, so it is a tied lump on the cord and not a bead or a twist.
    const { cv } = canvas();
    const N = 40, X0 = 58, X1 = 326;
    const rope = [];
    for (let i = 0; i <= N; i++) {
      const x = X0 + ((X1 - X0) * i) / N;
      rope.push([x, 206 + 16 * Math.sin(((x - X0) / (X1 - X0)) * Math.PI * 2)]);
    }
    const at = f => rope[Math.round(f * N)];
    const tangent = f => {
      const i = Math.round(f * N), a = rope[Math.max(0, i - 1)], b = rope[Math.min(N, i + 1)];
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    };
    const KNOTS = [0.16, 0.5, 0.84];
    contactShadow(cv, c + 8, 292, 150, 16, 0.28);
    withOutline(cv, t => {
      // frayed cut ends first: three short darker strands splaying from each end
      for (const [f, dir] of [[0, -1], [1, 1]]) {
        const [x, y] = at(f), a = tangent(f);
        for (const da of [-0.5, 0, 0.5]) {
          capsule(t, x, y, x + Math.cos(a + da) * 30 * dir, y + Math.sin(a + da) * 30 * dir, 13, HEMP.fray);
        }
      }
      // the rope: a fat tube, lit along its upper edge, shaded along its lower one
      polyline(t, rope, 46, HEMP.base);
      polyline(t, rope.map(([x, y]) => [x - 2, y - 11]), 12, HEMP.hi, 0.85);
      polyline(t, rope.map(([x, y]) => [x + 2, y + 13]), 11, HEMP.lo, 0.7);
      // the lay of the rope: two broad diagonal bands in each free stretch
      // between knots, 16px wide (~1/24 frame, well clear of hatching)
      for (const i of [12, 15, 25, 28]) {
        const [x, y] = rope[i], a = tangent(i / N), nx = -Math.sin(a), ny = Math.cos(a), tx = Math.cos(a), ty = Math.sin(a);
        capsule(t, x - nx * 20 + tx * 8, y - ny * 20 + ty * 8, x + nx * 20 - tx * 8, y + ny * 20 - ty * 8, 16, HEMP.lo, 0.35);
      }
      // three knots: each a near-round overhand bulge with its own keyline,
      // a shaded underside, and one strand of rope crossing it steeply
      for (const f of KNOTS) {
        const [kx, ky] = at(f), a = tangent(f);
        poly(t, ovalPts(kx, ky, 40, 38, a), INK, 0.95);
        poly(t, ovalPts(kx, ky, 32, 30, a), HEMP.hi, 1, HEMP.lo);
        ellipse(t, kx + 2, ky + 12, 22, 10, HEMP.lo, 0.5, 4);
        const b = a + 1.1, bx = Math.cos(b) * 30, by = Math.sin(b) * 30;
        capsule(t, kx - bx, ky - by, kx + bx, ky + by, 20, INK, 0.92);
        capsule(t, kx - bx, ky - by, kx + bx, ky + by, 11, HEMP.base);
        capsule(t, kx - bx - 2, ky - by - 3, kx + bx - 2, ky + by - 3, 4, HEMP.hi, 0.8);
      }
    }, { width: 9 });
    sheen(cv, at(0.16)[0] - 12, at(0.16)[1] - 13, 11, 7, 0.5);
    savePNG(path.join(OUT, 'streak_days.png'), W, W, down2(cv, W, W));
  }
  { // === sacrifice_amber.png — a stone altar bowl, gems inside, a low flame (dread) ===
    const { cv } = canvas();
    // firelight: lighter than cream in every channel, so it lifts, never smudges
    ellipse(cv, c, 180, 118, 96, '#FFE6D8', 0.26, 44);
    contactShadow(cv, c + 6, 344, 112, 16, 0.32);
    withOutline(cv, t => {
      // foot and stem
      poly(t, [[c - 72, 314], [c + 72, 314], [c + 100, 338], [c - 100, 338]], ALTAR.hi, 1, ALTAR.lo);
      roundRect(t, c, 296, 30, 22, 8, ALTAR.base, 1, ALTAR.lo);
      // the bowl: a wide shallow dish, top-lit; the well inside it is indigo
      poly(t, [[c - 130, 210], [c + 130, 210], [c + 124, 238], [c + 100, 258], [c + 62, 272], [c - 62, 272], [c - 100, 258], [c - 124, 238]], ALTAR.hi, 1, ALTAR.lo);
      ellipse(t, c, 210, 130, 26, ALTAR.base, 1, 3);
      ellipse(t, c, 210, 130, 26, INK, 0.5, 3);
      ellipse(t, c, 212, 114, 18, ALTAR.well, 1, 3);
      arcStroke(t, c, 210, 128, 8, Math.PI * 1.08, Math.PI * 1.92, ALTAR.hi, 0.8);   // lit far rim
      // gems lying in the well, either side of the fire
      gem(t, c - 74, 206, 22);
      gem(t, c - 34, 214, 20);
      gem(t, c + 38, 214, 20);
      gem(t, c + 76, 206, 22);
      // the low flame: crimson out to an amber core
      flameLobe(t, c + 2, 112, 222, 50, INK, 0.92);
      flameLobe(t, c + 2, 122, 220, 44, DREAD.out);
      flameLobe(t, c, 146, 218, 32, DREAD.mid);
      flameLobe(t, c - 2, 174, 216, 19, DREAD.in);
      flameLobe(t, c - 3, 194, 214, 9, DREAD.core);
    }, { width: 9 });
    sheen(cv, c - 92, 226, 22, 7, 0.45);
    savePNG(path.join(OUT, 'sacrifice_amber.png'), W, W, down2(cv, W, W));
  }

  { // === tend_amber.png — a brass can tilted to pour, three ribbons of water landing on a sprout, all on one mound (serene) ===
    // Round 1 stood the can upright with an arch handle over the top (a
    // padlock at 32dp) beside a sprout in its own dish; round 2 tilted it but
    // kept a stub spout and three drops the size of pixels. Now the can LEANS
    // 35deg clockwise, its spout runs ~40% of the frame down-right to a flared
    // rose, the handle is an open loop from the top rim to the back, and the
    // pour is three FAT ribbons of pale water (24px, ~1/16 frame) drawn inside
    // the contour so can, water and sprout are ONE silhouette; the sprout's
    // two fat sage leaves stand on the same mauve mound the can rests on,
    // under one contact shadow. Palette serene: brass, mauve earth, sage.
    const { cv } = canvas();
    const ang = 0.61;                                              // the can's tilt, 35deg clockwise
    const bx = c - 82, by = 208, hw = 54, hh = 70;                 // the can body
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (lx, ly) => [bx + lx * ca - ly * sa, by + lx * sa + ly * ca];
    const sx = c + 112;                                            // the sprout's stem
    const root = P(hw, -44), rose = [c + 104, 224];                // the spout's ends
    const dl = Math.hypot(rose[0] - root[0], rose[1] - root[1]);
    const dx = (rose[0] - root[0]) / dl, dy = (rose[1] - root[1]) / dl, nx = -dy, ny = dx;
    ellipse(cv, sx, 278, 54, 44, '#FFF4D6', 0.6, 20);              // the sprout's warm halo, uncontoured
    contactShadow(cv, c + 16, 336, 150, 14, 0.3);
    withOutline(cv, t => {
      // the mound of earth both pieces stand on
      poly(t, domePts(c + 20, 324, 150, 36), SERENE.soil, 1, SERENE.soilLo);
      capsule(t, c - 124, 322, c + 164, 322, 8, SERENE.soilLo, 0.7);
      // the sprout: one stem, two fat leaves
      capsule(t, sx, 302, sx, 264, 14, SERENE.stem);
      leaf(t, sx - 26, 270, 34, 20, -2.55, SERENE.leafHi, SERENE.leafLo);
      leaf(t, sx + 26, 266, 34, 20, -0.6, SERENE.leafHi, SERENE.leafLo);
      // three ribbons of water from the rose down onto the leaves: pale, lit
      // down their left edge, a lilac shade down their right
      for (const [x0, y0, x1, y1] of [[c + 108, 236, c + 90, 288], [c + 122, 240, c + 112, 296], [c + 136, 234, c + 134, 286]]) {
        capsule(t, x0, y0, x1, y1, 24, SERENE.water);
        capsule(t, x0 + 5, y0 + 2, x1 + 5, y1 - 2, 6, SERENE.waterLo, 0.7);
        capsule(t, x0 - 5, y0 + 4, x1 - 5, y1 - 4, 5, SERENE.waterHi, 0.8);
      }
      // the handle: an open loop from the top rim round to the back
      arcStroke(t, c - 108, 118, 38, 22, 1.88, 0.09 + Math.PI * 2, BRASS.lo);
      arcStroke(t, c - 110, 116, 38, 8, Math.PI * 1.05, Math.PI * 1.6, BRASS.hi, 0.8);
      // the spout: a long tapered tube from the can's front to the rose
      poly(t, [
        [root[0] + nx * 21, root[1] + ny * 21], [rose[0] + nx * 13, rose[1] + ny * 13],
        [rose[0] - nx * 13, rose[1] - ny * 13], [root[0] - nx * 21, root[1] - ny * 21],
      ], BRASS.hi, 1, BRASS.lo);
      capsule(t, root[0] + nx * 12, root[1] + ny * 12, rose[0] + nx * 7, rose[1] + ny * 7, 7, '#FFF0C4', 0.55);
      capsule(t, root[0] - nx * 13, root[1] - ny * 13, rose[0] - nx * 8, rose[1] - ny * 8, 7, '#6E4715', 0.55);
      // the body over the roots of handle and spout
      poly(t, roundRectPts(bx, by, hw, hh, 14, ang), BRASS.hi, 1, BRASS.lo);
      const bl0 = P(-hw + 7, -hh + 12), bl1 = P(-hw + 7, hh - 12), fr0 = P(hw - 6, -hh + 12), fr1 = P(hw - 6, hh - 12);
      capsule(t, bl0[0], bl0[1], bl1[0], bl1[1], 10, '#FFF0C4', 0.5);       // lit back edge
      capsule(t, fr0[0], fr0[1], fr1[0], fr1[1], 9, '#6E4715', 0.5);        // shaded front edge
      // the rim: an oval opening on the tilted top, lilac water inside
      const [rx, ry] = P(0, -hh + 2);
      poly(t, ovalPts(rx, ry, hw, 16, ang), INK, 0.6);
      poly(t, ovalPts(rx, ry, hw - 4, 13, ang), '#6E4715');
      poly(t, ovalPts(rx + 2, ry + 1, hw - 12, 9, ang), SERENE.water);
      // the rose: a flare at the spout's end and a wide disc face, dark centred
      const fc = [rose[0] + dx * 16, rose[1] + dy * 16], rot = Math.atan2(ny, nx);
      poly(t, [
        [rose[0] + nx * 13, rose[1] + ny * 13], [fc[0] + nx * 27, fc[1] + ny * 27],
        [fc[0] - nx * 27, fc[1] - ny * 27], [rose[0] - nx * 13, rose[1] - ny * 13],
      ], BRASS.hi, 1, BRASS.lo);
      poly(t, ovalPts(fc[0], fc[1], 31, 14, rot), INK, 0.95);
      poly(t, ovalPts(fc[0], fc[1], 27, 11, rot), BRASS.hi, 1, BRASS.lo);
      poly(t, ovalPts(fc[0] + 1, fc[1] + 1, 19, 6, rot), '#6E4715', 0.85);
    }, { width: 9 });
    const sh = P(-hw * 0.45, -hh * 0.5);
    sheen(cv, sh[0], sh[1], 12, 20, 0.5);
    sheen(cv, c - 122, 96, 6, 9, 0.4);
    savePNG(path.join(OUT, 'tend_amber.png'), W, W, down2(cv, W, W));
  }
  { // === variant_wins.png — three playing cards fanned from one pivot, a glyph on each ===
    const { cv } = canvas();
    contactShadow(cv, c + 6, 334, 124, 16, 0.3);
    // card centres ride a 230px radius about a pivot below the frame, +/-18deg
    const cards = [
      { x: c - 71, y: 221, ang: -0.314, hue: ACCENT.main, lo: ACCENT.lo, glyph: 'loop' },
      { x: c + 71, y: 221, ang: 0.314, hue: TILE.blue[0], lo: TILE.blue[1], glyph: 'chevrons' },
      { x: c, y: 210, ang: 0, hue: WAX.base, lo: WAX.lo, glyph: 'bolt' },
    ];
    withOutline(cv, t => {
      for (const k of cards) {
        const ca = Math.cos(k.ang), sa = Math.sin(k.ang);
        const P = (lx, ly) => [k.x + lx * ca - ly * sa, k.y + lx * sa + ly * ca];
        poly(t, roundRectPts(k.x, k.y, 62, 86, 14, k.ang), INK, 0.95);          // own keyline
        poly(t, roundRectPts(k.x, k.y, 56, 80, 10, k.ang), k.hue, 1, k.lo);     // coloured border
        poly(t, roundRectPts(k.x, k.y, 46, 70, 7, k.ang), '#FBF3E2', 1, '#E7D7B4');
        if (k.glyph === 'loop') {
          arcStroke(t, k.x, k.y, 24, 14, 0, Math.PI * 2, k.lo);
          poly(t, [P(12, 2), P(38, 2), P(25, 22)], k.lo);              // the loop's arrowhead
        } else if (k.glyph === 'chevrons') {
          for (const ox of [-16, 10]) {
            const a = P(ox - 8, -30), b = P(ox + 10, 0), d = P(ox - 8, 30);
            capsule(t, a[0], a[1], b[0], b[1], 13, k.lo);
            capsule(t, b[0], b[1], d[0], d[1], 13, k.lo);
          }
        } else {
          poly(t, [P(-4, -44), P(16, -44), P(6, -8), P(22, -8), P(-10, 44), P(-2, 6), P(-18, 6)], k.lo);
        }
      }
    }, { width: 9 });
    sheen(cv, c - 30, 154, 12, 20, 0.4);
    savePNG(path.join(OUT, 'variant_wins.png'), W, W, down2(cv, W, W));
  }
}
