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
 *   no_hints          a squat brass hand lantern, three louvers shut, light only
 *                     at the seams -> a peaked hood over a wide box, a ring on top
 *   challenge_mode    a rolled letter, red ribbon, red wax seal, tails hanging
 *                     -> a diagonal tube with a disc on it
 *   speed_wins        a wooden hourglass grown two feathered wings
 *                     -> a pinched column between two wings
 *   earn_amber        a cinched leather pouch with amber gems at its mouth
 *                     -> a sack with a spiky crown
 *   visit_animals     a sage stoneware teapot and two cream cups on one wooden
 *                     tray -> an oval board, a round pot, two cups on its foot
 *   streak_days       a thick hemp rope with a gentle S in it, three knots
 *                     -> a fat horizontal cord with three bulges
 *   sacrifice_amber   a stone altar bowl on a foot, gems inside, a low flame
 *                     -> a wide shallow dish over a stem, plume above
 *   tend_amber        a tilted brass watering can pouring onto a glowing sprout,
 *                     both on one mound -> a leaning cylinder, a long spout, drops
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
 *   tend_amber (Phase 5) goes SERENE — the brass kept, but lilac water, mauve
 *     soil, sage leaves, and a cream halo on the sprout.
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
/** The lantern's ironwork and shut interior: warm dark browns, never grey; the seam glow is lighter than cream in every channel. */
const LANTERN = { mid: '#B98A3A', under: '#6E4715', inside: '#4A2C18', seam: '#FFF6C8' };
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
/** Serene: lilac water, mauve soil, sage leaves; the drops are objects drawn outside the contour, so they carry a lilac rim for the cream ground. */
const SERENE = { water: '#C9D3F2', dropRim: '#A6C2EC', dropCore: '#E4F0FF', soil: '#8A6E80', soilLo: '#5E4858', leafHi: '#9CCB84', leafLo: '#5F9464', stem: '#6FA070' };

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

/** A thick stroke along a sampled path (a string, a stream). */
function polyline(t, pts, th, color, alpha = 1) {
  for (let i = 1; i < pts.length; i++) capsule(t, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], th, color, alpha);
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

  { // === no_hints.png — a squat brass hand lantern, three louvers shut, light at the seams ===
    // Round 1 drew a tall narrow grey box with five thin bars and the blind
    // reviewer saw a birdcage. This one is wider than it is tall in the body,
    // brass throughout, with a peaked hood, a fat carry ring, a base plate
    // wider than the body, and THREE broad louvers (46px, ~1/8 frame) so the
    // shutters read as shutters; the only light out is a thin warm seam where
    // slat meets slat, over an interior that is dark, not pale.
    const { cv } = canvas();
    contactShadow(cv, c + 10, 340, 130, 14, 0.32);
    withOutline(cv, t => {
      // the carry ring: a thick brass torus, and the collar it hangs from
      arcStroke(t, c, 64, 28, 24, 0, Math.PI * 2, BRASS.lo);
      arcStroke(t, c - 2, 62, 28, 9, Math.PI * 1.05, Math.PI * 1.85, BRASS.hi, 0.85);
      roundRect(t, c, 100, 22, 10, 4, BRASS.hi, 1, BRASS.lo);
      // the base plate first so the body stands on it; wider than the body
      roundRect(t, c, 314, 126, 12, 6, BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 118, 322, c + 118, 322, 8, LANTERN.under, 0.7);
      // the body: a brass box whose inside is shut dark
      roundRect(t, c, 228, 110, 78, 12, LANTERN.mid, 1, LANTERN.under);
      roundRect(t, c, 228, 98, 72, 8, LANTERN.inside);
      // three broad louvers, each a top-lit brass slat with a dark underside,
      // with a 12px dark gap between slats for the seam light to sit in
      for (const y of [173, 227, 281]) {
        roundRect(t, c, y, 100, 21, 5, BRASS.hi, 1, LANTERN.mid);
        capsule(t, c - 96, y + 16, c + 96, y + 16, 9, LANTERN.under, 0.85);
      }
      // the light: one warm seam in each gap, flanked by the dark inside, nothing else
      for (const y of [200, 254]) capsule(t, c - 92, y, c + 92, y, 6, LANTERN.seam);
      // corner posts framing the louvers
      capsule(t, c - 104, 158, c - 104, 300, 14, LANTERN.under);
      capsule(t, c + 104, 158, c + 104, 300, 14, LANTERN.under);
      capsule(t, c - 107, 162, c - 107, 296, 5, BRASS.hi, 0.6);
      // the peaked hood over the body, its eave shading the top slat
      poly(t, [[c - 122, 152], [c + 122, 152], [c + 34, 104], [c - 34, 104]], BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 114, 156, c + 114, 156, 10, LANTERN.under, 0.8);
    }, { width: 9 });
    sheen(cv, c - 66, 128, 20, 8, 0.5);
    sheen(cv, c - 72, 166, 16, 6, 0.4);
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

  { // === streak_days.png — a thick hemp rope with a gentle S in it, tied in three knots ===
    // Round 1 was a thin diagonal rod with three flat discs on it and read as
    // beads on a skewer. The rope is now FAT (52px, ~1/7 frame), laid across
    // the frame with a soft S so it is a cord and not a rod, its ends frayed
    // in a darker hemp instead of tipped in red, and each knot is a real bulge
    // ~1.5x the rope with one dark loop of rope wrapped over it.
    const { cv } = canvas();
    const N = 40, X0 = 62, X1 = 322;
    const rope = [];
    for (let i = 0; i <= N; i++) {
      const x = X0 + ((X1 - X0) * i) / N;
      rope.push([x, 200 + 28 * Math.sin(((x - X0) / (X1 - X0)) * Math.PI * 2)]);
    }
    const at = f => rope[Math.round(f * N)];
    const tangent = f => {
      const i = Math.round(f * N), a = rope[Math.max(0, i - 1)], b = rope[Math.min(N, i + 1)];
      return Math.atan2(b[1] - a[1], b[0] - a[0]);
    };
    const KNOTS = [0.19, 0.5, 0.81];
    contactShadow(cv, c + 10, 300, 148, 16, 0.28);
    withOutline(cv, t => {
      // frayed cut ends first: three short darker strands splaying from each end
      for (const [f, dir] of [[0, -1], [1, 1]]) {
        const [x, y] = at(f), a = tangent(f);
        for (const da of [-0.55, 0, 0.55]) {
          capsule(t, x, y, x + Math.cos(a + da) * 37 * dir, y + Math.sin(a + da) * 37 * dir, 14, HEMP.fray);
        }
      }
      // the rope: a fat tube, lit along its upper edge, shaded along its lower one
      polyline(t, rope, 52, HEMP.base);
      polyline(t, rope.map(([x, y]) => [x - 2, y - 12]), 14, HEMP.hi, 0.85);
      polyline(t, rope.map(([x, y]) => [x + 2, y + 14]), 12, HEMP.lo, 0.7);
      // the lay of the rope: a few broad diagonal bands per segment, clear of
      // the knots, never fine hatching
      for (let i = 2; i < N; i += 5) {
        const f = i / N;
        if (KNOTS.some(k => Math.abs(k - f) < 0.16)) continue;
        const [x, y] = rope[i], a = tangent(f), nx = -Math.sin(a), ny = Math.cos(a), tx = Math.cos(a), ty = Math.sin(a);
        capsule(t, x - nx * 22 + tx * 9, y - ny * 22 + ty * 9, x + nx * 22 - tx * 9, y + ny * 22 - ty * 9, 15, HEMP.lo, 0.32);
      }
      // three knots: each an overhand bulge, elongated ALONG the cord so it is
      // a swelling of the rope and not a ball threaded on it, with one strand
      // of rope crossing diagonally over the bulge (its own keyline, a dark
      // crease beside it) so it reads as tied
      for (const f of KNOTS) {
        const [kx, ky] = at(f), a = tangent(f);
        const tx = Math.cos(a), ty = Math.sin(a), nx = -ty, ny = tx;
        poly(t, ovalPts(kx, ky, 50, 40, a), INK, 0.95);
        poly(t, ovalPts(kx, ky, 43, 33, a), HEMP.hi, 1, HEMP.lo);
        const p = [kx - tx * 16 - nx * 30, ky - ty * 16 - ny * 30], q = [kx + tx * 16 + nx * 30, ky + ty * 16 + ny * 30];
        capsule(t, p[0] + tx * 12, p[1] + ty * 12, q[0] + tx * 12, q[1] + ty * 12, 12, HEMP.lo, 0.7);   // the crease
        capsule(t, p[0], p[1], q[0], q[1], 24, INK, 0.9);
        capsule(t, p[0], p[1], q[0], q[1], 15, HEMP.base);
        capsule(t, p[0] - 2, p[1] - 4, q[0] - 2, q[1] - 4, 5, HEMP.hi, 0.8);
      }
    }, { width: 9 });
    sheen(cv, at(0.19)[0] - 14, at(0.19)[1] - 14, 12, 8, 0.5);
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

  { // === tend_amber.png — a tilted brass can pouring onto a glowing sprout, both on one mound (serene) ===
    // Round 1 stood the can upright with an arch handle over the top (a
    // padlock at 32dp) beside a sprout in its own dish. Now the can LEANS 25deg
    // clockwise with its spout low on the right, the handle is a side loop on
    // its back, the pour is three fat drops (drawn outside the contour so they
    // stay a glow), and can and sprout stand on ONE low mound of mauve earth
    // under one contact shadow.
    const { cv } = canvas();
    const ang = 0.436;                                             // the can's tilt, 25deg clockwise
    const bx = c - 70, by = 200;                                   // the can body's centre
    const sx = c + 100;                                            // the sprout
    ellipse(cv, sx, 246, 50, 44, '#FFF4D6', 0.6, 20);              // the sprout's warm halo, uncontoured
    contactShadow(cv, c + 14, 334, 140, 14, 0.3);
    withOutline(cv, t => {
      // the mound of earth both pieces stand on
      poly(t, domePts(c + 6, 322, 138, 40), SERENE.soil, 1, SERENE.soilLo);
      capsule(t, c - 118, 320, c + 130, 320, 8, SERENE.soilLo, 0.7);
      // the sprout: one stem, two big leaves
      capsule(t, sx, 296, sx, 250, 14, SERENE.stem);
      leaf(t, sx - 28, 240, 38, 19, -2.5, SERENE.leafHi, SERENE.leafLo);
      leaf(t, sx + 28, 236, 38, 19, -0.6, SERENE.leafHi, SERENE.leafLo);
      // the can: side loop handle on its back FIRST, then the spout, then the
      // body over both roots
      arcStroke(t, bx - 50, 156, 36, 22, Math.PI * 0.45, Math.PI * 1.55, BRASS.lo);
      arcStroke(t, bx - 52, 154, 36, 8, Math.PI * 0.95, Math.PI * 1.5, BRASS.hi, 0.8);
      capsule(t, bx + 30, 226, c + 80, 176, 28, BRASS.lo);
      capsule(t, bx + 28, 220, c + 76, 170, 10, BRASS.hi, 0.7);
      poly(t, roundRectPts(bx, by, 54, 66, 14, ang), BRASS.hi, 1, BRASS.lo);
      // the cylinder's lit back edge and shaded front edge
      capsule(t, c - 86, 126, c - 140, 234, 10, '#FFF0C4', 0.5);
      capsule(t, c + 1, 168, c - 53, 278, 9, '#6E4715', 0.5);
      // the rim: an oval opening on the tilted top, lilac water inside
      poly(t, ovalPts(c - 42, 140, 54, 16, ang), INK, 0.6);
      poly(t, ovalPts(c - 42, 140, 50, 13, ang), '#6E4715');
      poly(t, ovalPts(c - 40, 141, 42, 9, ang), SERENE.water);
      // the rose at the spout's end: a wide flat sprinkler disc
      poly(t, ovalPts(c + 92, 172, 30, 15, 0.5), INK, 0.95);
      poly(t, ovalPts(c + 92, 172, 26, 12, 0.5), BRASS.hi, 1, BRASS.lo);
      poly(t, ovalPts(c + 94, 174, 18, 7, 0.5), '#6E4715', 0.85);
    }, { width: 9 });
    // three fat drops falling from the rose onto the leaves: objects, not
    // contour, with a lilac rim so they hold their shape on cream
    for (const [dx, y0] of [[-20, 192], [2, 200], [24, 190]]) {
      flameLobe(cv, sx + dx, y0, y0 + 36, 9, SERENE.dropRim);
      flameLobe(cv, sx + dx, y0 + 4, y0 + 33, 6, SERENE.dropCore);
    }
    sheen(cv, c - 96, 160, 12, 20, 0.5);
    sheen(cv, c - 120, 132, 6, 10, 0.4);
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
