/**
 * gameIcons/achievementsCollectionJourney.mjs — the COLLECTION crests (6) and the
 * JOURNEY crests (8) of the achievements set. 192px each, filed as
 * assets/ui/achievements/<id>.png, shown at 34dp in the Stats list and 26dp in
 * the unlock toast. All 56 achievements sit in ONE scrolling list, so every
 * crest here has to be told from its category-mates by SILHOUETTE alone.
 *
 * COLLECTION: cozy household objects, the things a cottage would hang on a wall
 * or keep on a shelf. Two short ladders live inside it and each escalates by
 * STRUCTURE, never by glow:
 *
 *   first_animal  a paw print pressed into a round clay disc   -> a disc
 *   animals_5     a wooden birdhouse, heart door, sage roof     -> a peaked house on a ring
 *   all_animals   a five-point gold crown                       -> a jagged crown
 *   all_rooms     a carpenter's mallet, a small try-square (wooden
 *                 stock, brass blade) crossed behind its handle -> a banded barrel on a diagonal
 *   amber_1000    a clay pot, gems heaped above its rim         -> a tall urn with a lumpy top
 *   amber_5000    a walnut strongbox, lid standing OPEN, gems
 *                 CASCADING out of it down the front-left       -> a wide box under a raised slab
 *
 * The amber pair shares the one `gem()` primitive so the two read as one line,
 * but they escalate by STRUCTURE (pot to strongbox) AND by what the gems DO:
 * the pot is the SMALLER hoard (terracotta, open, gems HEAPED in a pyramid
 * over its mouth, one tipping off the rim, one caught on the belly), the
 * strongbox the LARGER (walnut, iron-strapped, hasp-locked, its lid thrown
 * open and the gems SPILLING in a diagonal run over the front-left lip to a
 * last one on the ground). At 32dp the two read as "heaped in a pot" against
 * "pouring out of a chest". The clay of the pot is the same TERRA as the
 * paw-print disc, which ties the category together as one material family
 * without repeating a silhouette.
 *
 * JOURNEY: the four phase crests follow the game's descent, each in the palette
 * of the phase it marks, and the three daily/sharing crests are plain objects:
 *
 *   phase_1       a steaming teacup, ONE tapered curl of steam hooked like a
 *                 question (Curious Thoughts: sage glaze, warm) -> cup + a curl above it
 *   phase_2       a stone well, a crescent moon lying in its water
 *                 (Deeper Questions: night stone, navy water)   -> a cylinder under a frame
 *   phase_3       a bare tree, its shadow lying long across the ground
 *                 (Growing Shadows: dusk mauve, wine bark)      -> a forked tree on a slab
 *   phase_4       a black half-sun ON a straight horizon, a thick crimson rim
 *                 and seven long rays (The Horizon: dread)      -> a rayed dome on a flat band
 *   daily_first   a kraft envelope under a red wax seal stamped with an X
 *   daily_7       a brass bell hanging from a cord, a red bow at its crown
 *   daily_30      a garden gate standing OPEN between two posts under a lintel
 *   shared_first  a parchment paper airplane climbing to the upper right
 *
 * PALETTE. Terracotta (TERRA), the kit's WOOD/BRASS/STONE/AMB, WALNUT for the
 * strongbox (darker and redder than the blond WOOD, mid-tone still clear of ash
 * paper), a warm IRON grey and a warmer WIRON for straps and hoops (never cool
 * vector steel next to the wood), sage for the glaze and the roof, KRAFT for
 * the envelope and PLANE parchment for the airplane — kraft rather than cream
 * paper because a cream letter on the cream parchment row is invisible (rule 6:
 * no large area within ~0.13 luminance of a ground), and parchment rather than
 * white because a white dart was the only cool-neutral object on a warm sheet.
 * The four phase crests darken in order: sage, night navy, dusk mauve, then
 * indigo on a wine ground with a crimson rim — the only crimson in the family,
 * so the dread crest is the one that glows red; the tree keeps its mauve pill
 * and the sun gets its own flat horizon band so the two are not a series. No
 * glow is drawn on cream-adjacent surfaces at all: every soft wash here is a
 * contact shadow.
 *
 * House doctrine (see _draw.mjs): contact shadow goes down on the real canvas
 * FIRST (never contoured), the subject is drawn inside withOutline (INK contour,
 * never #000), the upper-left sheen lands last on top of the contour. Top-lit via
 * gradTo everywhere. No Math.random: every coordinate is a literal, so the
 * generator is byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline,
  INK, WOOD, BRASS, STONE, AMB, ACCENT,
  ellipse, roundRect, poly, capsule, arcStroke, tri, hexPts,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/achievements');

// --- palettes ----------------------------------------------------------------
const TERRA = { hi: '#EBA876', base: '#CE7A45', lo: '#96502A', deep: '#5A2A12' };
const GOLD = { hi: '#FFE07A', base: '#F2BE3A', lo: '#B77A12', deep: '#7A4E08' };
const IRON = { hi: '#C2BAB0', base: '#867E76', lo: '#524C46', deep: '#332E2A' };
const RUBY = { hi: '#FF8A86', base: '#D8383E', lo: '#8A1A24' };
const TEALGEM = { hi: '#8DEBD4', base: '#3FBFA6', lo: '#1E6E63' };
const WAX = { hi: '#F06A66', base: '#C4272E', lo: '#7E141B', groove: '#4E0A10' };
const KRAFT = { hi: '#E6BC86', base: '#C4914F', lo: '#8A6030', crease: '#5E3F1C' };
const SAGE = { hi: '#CFE3B4', base: '#8DB86A', lo: '#527A36', deep: '#345224' };
const TEA = { hi: '#C9822F', lo: '#7A4412' };
// Steam is parchment-warm, a step DARKER than cream at its base, so the curl is a
// form the contour can hold on the cream row rather than a white glyph on white.
const STEAM = { tip: '#E8D6B8', base: '#D2BA98' };
const NIGHT = { hi: '#4A5896', base: '#2A325E', lo: '#151A38' };
const MOON = '#F6EEC8';
const DUSK = { gHi: '#C29ABC', gLo: '#6E4A72', shadow: '#2E1A33' };
const BARK = { hi: '#9E6650', base: '#6A3F33', lo: '#3E241E' };
// The dread crest: a top-lit indigo disc (never flat black) inside a THICK
// crimson rim that is the contour holding it on the ash row, long rays that
// fade crimson -> wine toward their tips, and a wine ground whose lit top edge
// clears ash by > 0.13 luminance.
const DREAD = { gHi: '#7A4C64', gLo: '#46293E', sun: '#16101F', sunHi: '#4A3468', rim: '#C8283A', rimHi: '#E8505A', rayTip: '#7E1826', line: '#D0343E' };
const TWINE = { hi: '#F3E6C4', base: '#D8C296', lo: '#A98F5F' };
// Walnut for the strongbox: darker and redder than the kit's WOOD so the box is
// not the puzzle ladder's blond chest, but its mid-tone stays >= 0.32 luminance
// so the body clears ash paper (the round-1 iron box sat AT ash luminance).
const WALNUT = { hi: '#A6734E', base: '#7A5036', lo: '#6A4630', deep: '#3E2416', lidHi: '#C49468', lidLo: '#8E6242', edge: '#5A3824', mouth: '#2A1810' };
// Warm iron (R > B on every step) for straps and mallet hoops; IRON above stays
// as it is for the passing crests, which must not change by a byte.
const WIRON = { hi: '#8E7A6C', base: '#6B5548', lo: '#4A3A32' };
// Parchment for the paper plane: the one white object in round 1 was the only
// cool-neutral thing on a warm sheet, so it now folds from the kit's paper.
const PLANE = { hi: '#F6E9CF', base: '#E4CFA8', lo: '#C9AF88', deep: '#A88C66' };

// --- local helpers -------------------------------------------------------------

/** A polygon pushed outward from its own centroid by `g` (its own keyline). */
function grow(pts, g) {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  return pts.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [x + ((x - cx) / d) * g, y + ((y - cy) / d) * g];
  });
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

/** A rotated oval as a point list (bow loops). */
function ovalPts(cx, cy, ra, rb, rot, n = 28) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, u = Math.cos(a) * ra, v = Math.sin(a) * rb;
    return [cx + u * ca - v * sa, cy + u * sa + v * ca];
  });
}

/** Closed anti-aliased ring stroke (no seam bead, unlike a chained arcStroke). */
function ringStroke(cv, cx, cy, r, th, color, alpha = 1) {
  arcStroke(cv, cx, cy, r, th, 0, Math.PI * 2, color, alpha);
}

/**
 * ONE cut amber gem: a hexagon with its own ink keyline, a top-lit face, a
 * smaller lit table set toward the light and a hard white glint. Shared by the
 * two amber crests so the hoard reads as one line at two sizes.
 */
function gem(t, x, y, r, rot = 0) {
  const outer = hexPts(x, y, r, rot);
  poly(t, grow(outer, 6), INK, 0.95);
  poly(t, outer, AMB.hi, 1, AMB.lo);
  poly(t, hexPts(x - r * 0.06, y - r * 0.1, r * 0.56, rot), '#FFE9A6', 0.92);
  ellipse(t, x - r * 0.34, y - r * 0.38, r * 0.2, r * 0.14, '#FFFFFF', 0.9, 2);
}

/** A picket-gate plank as a poly between two rails (see daily_30). */
function lerp(a, b, u) { return a + (b - a) * u; }

/** Mix two hex colours (u = 0 -> a, u = 1 -> b) back to a hex string. */
function mix(a, b, u) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], u)).toString(16).padStart(2, '0')).join('');
}

/**
 * A tapered ribbon along a Catmull-Rom spline through `pts`: thickness runs
 * th0 -> th1 and the colour col0 -> col1 from the first point to the last. It is
 * a chain of solid capsules, so withOutline contours it as one form (steam).
 */
function ribbon(t, pts, th0, th1, col0, col1, steps = 12) {
  const P = i => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    for (let s = 0; s < steps; s++) {
      const u = s / steps, u2 = u * u, u3 = u2 * u;
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3);
      const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
      samples.push([x, y]);
    }
  }
  samples.push(pts[pts.length - 1]);
  const n = samples.length - 1;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    capsule(t, samples[i][0], samples[i][1], samples[i + 1][0], samples[i + 1][1], lerp(th0, th1, u), mix(col0, col1, u));
  }
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === first_animal.png — a paw print pressed into a round clay disc ==========
    // The disc is a hand-pressed clay medallion (wider than tall, so it is never
    // the tile). The print is an ABSENCE: a dark recess with a lit lower-right lip
    // (light from the upper-left falls on the far wall of a hollow) and a floor
    // one step lighter than the wall so the hollow has depth at 32dp.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 336, 136, 20, 0.32);
    withOutline(cv, t => {
      ellipse(t, c, 200, 146, 132, TERRA.lo, 1, 3);
      ellipse(t, c, 192, 142, 126, TERRA.base, 1, 3);
      ellipse(t, c - 8, 156, 118, 82, TERRA.hi, 0.8, 44);              // top-lit cap
      arcStroke(t, c, 192, 132, 14, 0.35, Math.PI - 0.35, TERRA.deep, 0.45);  // lower bevel
      const press = (x, y, rx, ry) => {
        ellipse(t, x + 4, y + 9, rx, ry, TERRA.hi, 0.95, 3);           // lit far lip
        ellipse(t, x, y, rx, ry, TERRA.deep, 1, 3);                    // the hollow
        ellipse(t, x + 3, y + 5, rx * 0.72, ry * 0.68, TERRA.lo, 1, 3);  // its floor
      };
      press(c - 72, 168, 25, 31);
      press(c - 26, 128, 27, 34);
      press(c + 26, 128, 27, 34);
      press(c + 72, 168, 25, 31);
      // ONE pad, wider at the bottom than the top. A first pass gave it two
      // lower lobes and at 32dp they read as a mouth under four eyes: a face.
      press(c, 240, 62, 46);
      ellipse(t, c + 4, 274, 74, 34, TERRA.hi, 0.95, 3);
      ellipse(t, c, 266, 72, 32, TERRA.deep, 1, 3);
      ellipse(t, c + 3, 270, 52, 22, TERRA.lo, 1, 3);
      ellipse(t, c, 240, 50, 36, TERRA.lo, 1, 3);                      // one continuous floor
    }, { width: 10 });
    sheen(cv, c - 96, 112, 30, 18, 0.45);
    savePNG(path.join(OUT, 'first_animal.png'), W, W, down2(cv, W, W));
  }

  { // === animals_5.png — a wooden birdhouse with a heart-shaped door ============
    // Hung from a ring, sage roof (the chrome home icon owns the red roof), a
    // heart cut clean through the front, a perch peg under it and a floor ledge.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 350, 118, 18, 0.3);
    withOutline(cv, t => {
      ringStroke(t, c, 46, 16, 9, IRON.base);                          // hanging ring
      arcStroke(t, c - 2, 44, 15, 4, Math.PI * 1.05, Math.PI * 1.85, IRON.hi, 0.8);
      capsule(t, c, 60, c, 84, 10, IRON.lo);
      roundRect(t, c, 246, 104, 84, 8, WOOD.light, 1, WOOD.dark);       // body
      for (const x of [c - 40, c + 40]) capsule(t, x, 170, x, 322, 6, WOOD.seam, 0.28);  // planks
      roundRect(t, c, 332, 122, 12, 5, WOOD.base, 1, WOOD.seam);        // floor ledge
      // roof: a thick sage slab with a darker under-eave
      poly(t, [[c - 152, 176], [c, 68], [c + 152, 176], [c + 152, 194], [c, 88], [c - 152, 194]], SAGE.lo, 1, SAGE.deep);
      poly(t, [[c - 148, 172], [c, 66], [c + 148, 172], [c, 82]], SAGE.hi, 1, SAGE.base);
      capsule(t, c, 62, c, 78, 14, SAGE.deep);                          // ridge cap
      // the heart door, cut through
      const DK = '#22130D';
      ellipse(t, c - 30, 214, 34, 33, DK, 1, 3);
      ellipse(t, c + 30, 214, 34, 33, DK, 1, 3);
      tri(t, [c - 62, 222], [c + 62, 222], [c, 282], DK);
      // perch: a peg seen end-on, seated under the door
      ellipse(t, c, 300, 17, 13, WOOD.dark, 1, 3);
      ellipse(t, c - 3, 297, 10, 7, WOOD.light, 0.9, 3);
    }, { width: 10 });
    sheen(cv, c - 70, 112, 30, 12, 0.45);
    savePNG(path.join(OUT, 'animals_5.png'), W, W, down2(cv, W, W));
  }

  { // === all_animals.png — a five-point gold crown =============================
    // One jagged silhouette: five points with ball finials over a wide band, a
    // ruby at the band's centre and two small teal stones. Nothing else in the
    // achievement list has a sawtooth top.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 328, 150, 20, 0.32);
    withOutline(cv, t => {
      poly(t, [
        [c - 144, 246], [c - 144, 128], [c - 106, 214], [c - 70, 112], [c - 36, 212],
        [c, 82], [c + 36, 212], [c + 70, 112], [c + 106, 214], [c + 144, 128], [c + 144, 246],
      ], GOLD.hi, 1, GOLD.base);
      roundRect(t, c, 270, 146, 38, 10, GOLD.base, 1, GOLD.lo);        // band
      capsule(t, c - 136, 250, c + 136, 250, 10, GOLD.hi, 0.7);        // band's lit upper edge
      capsule(t, c - 134, 296, c + 134, 296, 12, GOLD.deep, 0.55);     // band's dark foot
      for (const [x, y] of [[c - 144, 128], [c - 70, 112], [c, 82], [c + 70, 112], [c + 144, 128]]) {
        ellipse(t, x, y - 4, 18, 18, GOLD.lo, 1, 3);
        ellipse(t, x - 2, y - 7, 14, 14, GOLD.hi, 1, 3);
      }
      ellipse(t, c, 270, 30, 28, RUBY.lo, 1, 3);                       // the ruby
      ellipse(t, c - 2, 267, 24, 22, RUBY.base, 1, 3);
      ellipse(t, c - 9, 259, 10, 8, RUBY.hi, 0.9, 3);
      for (const x of [c - 90, c + 90]) {
        ellipse(t, x, 270, 18, 17, TEALGEM.lo, 1, 3);
        ellipse(t, x - 1, 268, 14, 13, TEALGEM.base, 1, 3);
        ellipse(t, x - 6, 262, 6, 5, TEALGEM.hi, 0.9, 3);
      }
    }, { width: 10 });
    sheen(cv, c - 108, 168, 20, 30, 0.42);
    savePNG(path.join(OUT, 'all_animals.png'), W, W, down2(cv, W, W));
  }

  { // === all_rooms.png — a carpenter's mallet, a small try-square crossed behind
    // The MALLET is the sole anchor: a banded barrel head at the upper left
    // (~42% of the frame long) with the handle running down-right at ~42 degrees,
    // the whole tool spanning ~75% of the frame. Round 1 drew the try-square at
    // the mallet's own scale and material, and the two wooden pieces closed into
    // a triangle that read as a hammer on a rack. Round 2 shrank it to a brass L
    // but parked it UNDER the handle's end, so the handle closed the L's open
    // side and it read as a wedge. Now it is a real try-square, small: a short
    // WOODEN stock standing on the left, clear of the handle, and a thin BRASS
    // blade running right from the stock's foot, which passes BEHIND the lower
    // handle and shows again on the far side — crossed, not capped. The inside
    // corner of the L stays open to the light. Tilted 15 degrees so neither arm
    // runs parallel to a canvas edge. Drawn first, so the handle covers it.
    const { cv, c } = canvas();
    contactShadow(cv, c + 10, 330, 150, 18, 0.3);
    const ang = 0.733;                                               // handle: down-right, ~42 degrees
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const HX = c - 74, HY = 118;                                     // head centre
    const along = (d) => [HX + ca * d, HY + sa * d];                 // a point d px down the handle
    withOutline(cv, t => {
      // the try-square: outer corner K, the blade along u, the stock up along v
      const th = -0.26, cu = Math.cos(th), su = Math.sin(th);        // -15 degrees
      const K = [c - 62, 324];
      const L = (a, b) => [K[0] + cu * a + su * b, K[1] + su * a - cu * b];   // local (a right, b up)
      const blade = L(112, 17), stock = L(26, 52);
      poly(t, roundRectPts(blade[0], blade[1], 112, 17, 4, th), BRASS.hi, 1, BRASS.lo);
      const e0 = L(8, 26), e1 = L(216, 26);                          // the blade's lit top edge
      capsule(t, e0[0], e0[1], e1[0], e1[1], 5, '#FFF0C4', 0.55);
      // the stock stops well short of the mallet head, so the L's open side
      // stays open and the tools never close into a frame
      poly(t, roundRectPts(stock[0], stock[1], 26, 52, 5, th), WOOD.light, 1, WOOD.dark);
      const f0 = L(13, 40), f1 = L(13, 94);                          // the stock's lit left edge
      capsule(t, f0[0], f0[1], f1[0], f1[1], 6, WOOD.rim, 0.6);
      const r0 = L(39, 40), r1 = L(39, 94);                          // its shaded inner face
      capsule(t, r0[0], r0[1], r1[0], r1[1], 6, WOOD.seam, 0.35);
      // the handle: from inside the head to the lower right
      const [h0x, h0y] = along(20), [h1x, h1y] = along(262);
      poly(t, roundRectPts((h0x + h1x) / 2, (h0y + h1y) / 2, 121, 18, 9, ang), WOOD.base, 1, WOOD.dark);
      const [g0x, g0y] = along(60), [g1x, g1y] = along(250);
      capsule(t, g0x + sa * 6, g0y - ca * 6, g1x + sa * 6, g1y - ca * 6, 6, WOOD.rim, 0.5);
      // the head: a barrel across the handle's top, two dark bands at its ends
      poly(t, roundRectPts(HX, HY, 80, 38, 16, ang + Math.PI / 2), WOOD.light, 1, WOOD.dark);
      poly(t, roundRectPts(HX - 8, HY - 12, 58, 10, 6, ang + Math.PI / 2), WOOD.rim, 0.6);
      for (const s of [-1, 1]) {
        const ex = HX + Math.cos(ang + Math.PI / 2) * 62 * s, ey = HY + Math.sin(ang + Math.PI / 2) * 62 * s;
        poly(t, roundRectPts(ex, ey, 11, 37, 4, ang + Math.PI / 2), WIRON.base, 1, WIRON.lo);
        poly(t, roundRectPts(ex - 3, ey - 3, 4, 30, 2, ang + Math.PI / 2), WIRON.hi, 0.6);
      }
    }, { width: 10 });
    sheen(cv, c - 108, 92, 14, 22, 0.42);
    savePNG(path.join(OUT, 'all_rooms.png'), W, W, down2(cv, W, W));
  }

  { // === amber_1000.png — a clay pot with amber gems heaped above its rim ======
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 342, 124, 20, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, 252, 98, 84, 44, TERRA.hi, 1, TERRA.lo);         // belly
      capsule(t, c - 90, 296, c + 90, 296, 22, TERRA.deep, 0.35);      // shaded lower belly
      roundRect(t, c, 330, 68, 10, 5, TERRA.lo, 1, TERRA.deep);        // foot
      roundRect(t, c, 174, 110, 18, 9, TERRA.hi, 1, TERRA.base);       // flared rim
      ellipse(t, c, 168, 96, 20, TERRA.deep, 1, 3);                    // the dark mouth
      // the hoard: gems stacked over the mouth. The overflow is ONE gem tipping
      // off the rim on the left and ONE caught on the belly on the right — the
      // first pass sat a pair on the ground either side of the foot and at 32dp
      // two round yellow dots under a vessel are wheels, so it read as a cart.
      gem(t, c + 4, 158, 30, 0.2);
      gem(t, c - 62, 146, 31, -0.3);
      gem(t, c + 62, 148, 31, 0.4);
      gem(t, c - 24, 110, 32, 0.1);
      gem(t, c + 34, 108, 30, -0.2);
      gem(t, c + 6, 64, 30, 0.3);
      gem(t, c - 112, 190, 27, 0.45);
      gem(t, c + 108, 236, 26, -0.25);
    }, { width: 10 });
    sheen(cv, c - 62, 210, 16, 34, 0.42);
    savePNG(path.join(OUT, 'amber_1000.png'), W, W, down2(cv, W, W));
  }

  { // === amber_5000.png — a walnut strongbox thrown open, gems spilling out ====
    // Round 1 was a cool iron box whose body sat AT ash luminance, so on the dark
    // row only the bands and gems survived, and it heaped its gems in the same
    // pyramid as the pot, so rows 5 and 6 read as twins. Round 2 warmed it to
    // walnut but kept the heap. Now the lid stands OPEN, tilted back toward the
    // upper right on its back hinge so its lighter underside shows as a tall
    // slab (a different silhouette from the pot's round shoulders), and the
    // gems do a different THING: a run of six big gems pours over the FRONT-LEFT
    // lip, down the corner of the box and onto the ground, while a low heap
    // still fills the mouth. Walnut planks top-lit (mid-tone > 0.32 luminance),
    // warm dark iron straps, one brass hasp padlock, contact shadow under the base.
    const { cv, c } = canvas();
    const BX = c + 10;                                               // box centre, nudged right to make room for the spill
    contactShadow(cv, BX + 10, 348, 150, 14, 0.32);
    withOutline(cv, t => {
      // the lid: underside facing us, standing open, leaning to the upper right
      poly(t, [[BX - 132, 208], [BX + 138, 208], [BX + 126, 96], [BX - 96, 96]], WALNUT.lidHi, 1, WALNUT.lidLo);
      poly(t, [[BX - 100, 104], [BX + 130, 104], [BX + 128, 90], [BX - 98, 90]], WALNUT.edge, 1, WALNUT.deep);   // the lid's free edge
      for (const [x0, x1] of [[BX - 62, BX - 40], [BX + 78, BX + 74]]) {
        poly(t, [[x0 - 14, 208], [x0 + 14, 208], [x1 + 13, 92], [x1 - 13, 92]], WIRON.base, 1, WIRON.lo);       // lid straps
      }
      // the mouth: a dark band between hinge and lip
      roundRect(t, BX, 212, 134, 12, 3, WALNUT.mouth);
      // the body: wide walnut planks, two seams, a lit lip
      roundRect(t, BX, 274, 128, 58, 10, WALNUT.hi, 1, WALNUT.lo);
      for (const y of [256, 296]) capsule(t, BX - 120, y, BX + 120, y, 6, WALNUT.deep, 0.35);
      capsule(t, BX - 122, 219, BX + 122, 219, 9, '#BE8A60', 0.85);   // the front lip, lit
      for (const x of [BX - 76, BX + 76]) {                            // straps
        roundRect(t, x, 274, 15, 58, 3, WIRON.base, 1, WIRON.lo);
        capsule(t, x - 6, 220, x - 6, 328, 4, WIRON.hi, 0.6);
      }
      for (const x of [BX - 100, BX + 100]) roundRect(t, x, 338, 22, 8, 3, WALNUT.deep);  // feet
      // the hasp padlock: brass, its shackle open since the lid is up
      roundRect(t, BX, 246, 20, 12, 4, WIRON.base, 1, WIRON.lo);         // the hasp plate
      arcStroke(t, BX + 6, 262, 20, 12, Math.PI * 1.05, Math.PI * 1.95, BRASS.lo);
      roundRect(t, BX, 292, 30, 24, 8, BRASS.hi, 1, BRASS.lo);
      ellipse(t, BX, 291, 7, 7, INK, 0.85, 2);
      capsule(t, BX, 293, BX, 306, 7, INK, 0.85);
      // the hoard: a low heap in the mouth ...
      gem(t, BX - 12, 196, 30, -0.3);
      gem(t, BX + 46, 198, 29, 0.35);
      gem(t, BX + 100, 200, 27, -0.1);
      gem(t, BX + 16, 156, 31, -0.2);
      gem(t, BX + 74, 160, 28, 0.3);
      gem(t, BX + 44, 120, 28, 0.25);
      // ... and the SPILL: a diagonal run over the front-left lip, down the
      // corner of the box, to one gem resting on the ground. Every gem is
      // >= 1/8 of the frame so the run stays a run of gems at 32dp.
      gem(t, BX - 72, 178, 30, 0.1);
      gem(t, BX - 108, 214, 30, 0.4);
      gem(t, BX - 128, 260, 29, -0.25);
      gem(t, BX - 138, 300, 28, 0.15);
      gem(t, BX - 152, 334, 27, 0.35);                                 // on the ground, beside the foot
    }, { width: 10 });
    sheen(cv, BX - 78, 118, 22, 10, 0.42);
    savePNG(path.join(OUT, 'amber_5000.png'), W, W, down2(cv, W, W));
  }

  { // === phase_1.png — a steaming teacup, ONE curl of steam hooked like a question
    // Sage glaze, not creamware: cream china on the cream parchment row is a
    // contour with nothing inside it. Round 1 typeset the steam as a literal '?'
    // (dot and all), which the doctrine forbids and which vanished as a white
    // hook on cream. The steam is now ONE tapered ribbon (1/8 of the frame thick
    // at the tea, 1/14 at the tip) that rises, bows left, and curls over to the
    // upper right like a hook, warm parchment a step darker than cream so the
    // INK contour holds it, plus a second much smaller wisp so it reads as steam
    // rather than a symbol. The cup stays the dominant mass.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 332, 150, 18, 0.32);
    withOutline(cv, t => {
      // saucer
      ellipse(t, c, 310, 152, 30, SAGE.lo, 1, 3);
      ellipse(t, c, 304, 148, 26, SAGE.base, 1, 3);
      ellipse(t, c - 10, 298, 120, 14, SAGE.hi, 0.6, 12);
      // handle, right
      arcStroke(t, c + 112, 244, 40, 24, -Math.PI * 0.55, Math.PI * 0.55, SAGE.lo);
      arcStroke(t, c + 112, 244, 40, 11, -Math.PI * 0.5, Math.PI * 0.1, SAGE.hi, 0.7);
      // cup body
      poly(t, [[c - 104, 200], [c + 104, 200], [c + 84, 290], [c + 60, 304], [c - 60, 304], [c - 84, 290]], SAGE.hi, 1, SAGE.lo);
      capsule(t, c - 92, 254, c + 92, 254, 16, '#F6F0DE', 0.8);       // a cream band
      // rim + tea
      ellipse(t, c, 200, 106, 24, SAGE.hi, 1, 3);
      ellipse(t, c, 202, 96, 18, TEA.lo, 1, 3);
      ellipse(t, c - 4, 200, 88, 14, TEA.hi, 1, 3);
      // the steam: one hooked curl, and a small wisp to its left
      ribbon(t, [[c + 14, 198], [c + 30, 166], [c + 12, 126], [c + 30, 84], [c + 72, 60], [c + 102, 80], [c + 98, 110]],
        50, 32, STEAM.base, STEAM.tip);
      ribbon(t, [[c - 44, 198], [c - 56, 176], [c - 46, 152], [c - 58, 130]], 28, 18, STEAM.base, STEAM.tip);
    }, { width: 10 });
    sheen(cv, c - 70, 216, 16, 30, 0.42);
    sheen(cv, c + 40, 78, 12, 9, 0.4);
    savePNG(path.join(OUT, 'phase_1.png'), W, W, down2(cv, W, W));
  }

  { // === phase_2.png — a stone well, a crescent moon lying in its water ========
    // A cylinder of cool stone under a windlass frame; the water is a navy disc
    // and the moon is a crescent LYING IN IT, cut from the moon's own disc with an
    // offset ellipse of water. Night palette: the well is the first cold crest.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 344, 140, 18, 0.32);
    withOutline(cv, t => {
      // frame: two posts, a crossbar, a windlass drum
      for (const x of [c - 120, c + 120]) {
        capsule(t, x, 76, x, 250, 24, WOOD.mid);
        capsule(t, x - 6, 84, x - 6, 240, 8, WOOD.light, 0.6);
      }
      capsule(t, c - 138, 74, c + 138, 74, 22, WOOD.base);
      capsule(t, c - 132, 66, c + 132, 66, 7, WOOD.rim, 0.65);
      capsule(t, c - 46, 74, c + 46, 74, 40, WOOD.dark);               // the drum
      capsule(t, c - 40, 62, c + 40, 62, 10, WOOD.mid, 0.9);
      capsule(t, c, 94, c, 150, 8, TWINE.base);                        // rope, to the water
      // the wall
      roundRect(t, c, 262, 134, 64, 22, STONE.hi, 1, STONE.lo);
      for (const y of [232, 268]) capsule(t, c - 126, y, c + 126, y, 9, STONE.lo, 0.6);
      for (const [x, y] of [[c - 70, 214], [c + 20, 214], [c + 100, 214], [c - 30, 250], [c + 66, 250], [c - 96, 286], [c + 10, 286], [c + 104, 286]]) {
        capsule(t, x, y, x, y + 34, 9, STONE.lo, 0.6);
      }
      // the top ring, then the water inside it
      ellipse(t, c, 198, 136, 46, STONE.hi, 1, 3);
      arcStroke(t, c, 198, 130, 10, 0.2, Math.PI - 0.2, STONE.lo, 0.5);
      ellipse(t, c, 198, 108, 32, INK, 0.9, 3);
      ellipse(t, c, 198, 102, 28, NIGHT.lo, 1, 3);
      ellipse(t, c, 204, 92, 18, NIGHT.base, 1, 3);
      // the moon in the water: a disc with a bite of water taken out of it
      ellipse(t, c + 8, 200, 42, 26, MOON, 1, 2);
      ellipse(t, c + 26, 194, 36, 22, NIGHT.base, 1, 2);
      capsule(t, c - 74, 190, c - 30, 188, 9, NIGHT.hi, 0.7);           // one ripple glint
    }, { width: 10 });
    sheen(cv, c - 100, 174, 24, 10, 0.45);
    savePNG(path.join(OUT, 'phase_2.png'), W, W, down2(cv, W, W));
  }

  { // === phase_3.png — a bare tree, its shadow lying long across the ground ====
    // Dusk palette: mauve ground, wine-brown bark lit down its left flank so the
    // trunk survives the ash row, and the shadow is the darkest thing on the tile,
    // stretched right across the slab as a forked wedge.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 344, 156, 16, 0.3);
    withOutline(cv, t => {
      roundRect(t, c, 318, 158, 26, 26, DUSK.gHi, 1, DUSK.gLo);        // the ground
      // the shadow, forked like the tree that casts it
      poly(t, [[c - 74, 300], [c - 60, 330], [c + 92, 336], [c + 154, 326], [c + 150, 316], [c + 96, 318], [c + 140, 304], [c + 134, 298], [c + 80, 312]], DUSK.shadow, 0.92);
      // the tree
      const limb = (x1, y1, x2, y2, th) => {
        capsule(t, x1, y1, x2, y2, th, BARK.base);
        capsule(t, x1 - th * 0.22, y1, x2 - th * 0.22, y2, th * 0.32, BARK.hi, 0.7);
      };
      capsule(t, c - 96, 306, c - 40, 296, 22, BARK.lo);               // root flare
      capsule(t, c - 4, 306, c - 44, 296, 22, BARK.lo);
      limb(c - 48, 306, c - 40, 176, 46);                              // trunk
      limb(c - 40, 196, c - 118, 100, 28);
      limb(c - 40, 184, c + 44, 92, 30);
      limb(c - 42, 224, c + 88, 160, 22);
      limb(c - 118, 100, c - 148, 46, 17);
      limb(c - 118, 100, c - 72, 42, 17);
      limb(c + 44, 92, c + 32, 34, 17);
      limb(c + 44, 92, c + 116, 48, 17);
      limb(c + 88, 160, c + 152, 126, 15);
      limb(c + 20, 118, c + 6, 62, 13);
    }, { width: 10 });
    sheen(cv, c - 130, 300, 22, 8, 0.4);
    savePNG(path.join(OUT, 'phase_3.png'), W, W, down2(cv, W, W));
  }

  { // === phase_4.png — a black half-sun ON the horizon, crimson rim, long rays =
    // The dread crest, and the family's only crimson. Round 1 gave a full black
    // orb a ring of small spikes on a purple pill: an urchin, and on the ash row
    // the flat-black core vanished. Round 2 cut it with a horizon but kept three
    // stubby spikes and a 9px rim, and still read as an orb on a pill. Now it is
    // built the way a sun on a horizon is drawn: a HALF-disc seated ON a flat
    // wine ground band (square corners, not a pill, so it is not the tree's
    // mound), a crimson rim 1/12 of the frame thick that is the contour holding
    // the dark body on ash (the INK ring runs outside it), the body top-lit in
    // two steps from deep indigo to near-black at the horizon, and SEVEN long
    // tapered rays above the horizon only, widely spaced, crimson at the root
    // fading to wine at the tip: rays, not spines. A dim rose sheen sits at the
    // disc's upper left. The whole subject is pulled in to ~78% of the frame.
    // No glow: a crimson wash darkens cream.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 352, 146, 12, 0.3);
    const SX = c, SY = 206, R = 92, RIM = 30;                        // RIM = 15px at 192, 1/12 of the frame
    const HZ = 240;                                                  // the horizon
    withOutline(cv, t => {
      // seven long rays, root at the rim, tip well past it, fanned over the top half only
      for (let k = -3; k <= 3; k++) {
        const a = -Math.PI / 2 + k * 0.4;
        const rIn = R - 8, rOut = R + 66, hw = 19;
        const nx = -Math.sin(a), ny = Math.cos(a);
        const root = s => [SX + Math.cos(a) * rIn + nx * hw * s, SY + Math.sin(a) * rIn + ny * hw * s];
        const tip = [SX + Math.cos(a) * rOut, SY + Math.sin(a) * rOut];
        tri(t, root(-1), root(1), tip, DREAD.rayTip);                // the wine tip is the whole ray ...
        const mid = [SX + Math.cos(a) * (rIn + 44), SY + Math.sin(a) * (rIn + 44)];
        tri(t, root(-0.8), root(0.8), mid, DREAD.rim);               // ... with a crimson root laid over it
      }
      // the rim, seen as a full disc; the ground band will cut it at the horizon
      ellipse(t, SX, SY, R, R, DREAD.rim, 1, 3);
      arcStroke(t, SX, SY, R - RIM * 0.5, 9, Math.PI * 0.98, Math.PI * 1.62, DREAD.rimHi, 0.9);  // lit upper-left rim
      // the body: a circle poly so it can take gradTo, top-lit indigo to near-black
      const body = Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return [SX + Math.cos(a) * (R - RIM), SY + Math.sin(a) * (R - RIM)];
      });
      poly(t, body, DREAD.sunHi, 1, DREAD.sun);
      ellipse(t, SX - 20, SY - 40, 40, 30, DREAD.sunHi, 0.55, 20);    // a second lit step up top
      // the ground: a flat wine band with square corners, a crimson line along its top edge
      roundRect(t, c, 292, 140, 52, 5, DREAD.gHi, 1, DREAD.gLo);
      capsule(t, c - 138, HZ, c + 138, HZ, 14, DREAD.line);
    }, { width: 10 });
    ellipse(cv, SX - 30, SY - 44, 22, 14, '#E8A4B4', 0.28, 10);        // the dim rose sheen
    sheen(cv, c - 118, 254, 18, 7, 0.28);
    savePNG(path.join(OUT, 'phase_4.png'), W, W, down2(cv, W, W));
  }

  { // === daily_first.png — a kraft envelope under a red wax seal stamped X =====
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 326, 142, 18, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, 212, 140, 96, 10, KRAFT.hi, 1, KRAFT.lo);        // the envelope
      // lower folds and the flap
      capsule(t, c - 132, 302, c, 226, 6, KRAFT.crease, 0.4);
      capsule(t, c + 132, 302, c, 226, 6, KRAFT.crease, 0.4);
      poly(t, [[c - 140, 118], [c + 140, 118], [c, 238]], KRAFT.hi, 1, KRAFT.base);
      capsule(t, c - 136, 122, c, 236, 7, KRAFT.crease, 0.55);
      capsule(t, c + 136, 122, c, 236, 7, KRAFT.crease, 0.55);
      // the seal: a blobby wax disc, top-lit, stamped with a deep X
      for (const [dx, dy, r] of [[-38, -12, 22], [34, 18, 20], [8, -40, 18], [-14, 36, 19]]) {
        ellipse(t, c + dx, 230 + dy, r, r, WAX.base, 1, 3);
      }
      ellipse(t, c, 232, 50, 47, WAX.lo, 1, 3);
      ellipse(t, c - 2, 228, 46, 43, WAX.base, 1, 3);
      ellipse(t, c - 12, 210, 28, 20, WAX.hi, 0.7, 14);
      for (const s of [-1, 1]) {
        capsule(t, c - 26 * s, 204, c + 26 * s, 254, 14, WAX.groove, 0.95);
        capsule(t, c - 26 * s - 3, 201, c + 26 * s - 3, 251, 5, WAX.hi, 0.55);
      }
    }, { width: 10 });
    sheen(cv, c - 112, 136, 24, 10, 0.4);
    savePNG(path.join(OUT, 'daily_first.png'), W, W, down2(cv, W, W));
  }

  { // === daily_7.png — a brass bell hanging from a cord, a red bow at its crown =
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 344, 116, 16, 0.3);
    withOutline(cv, t => {
      capsule(t, c, 26, c, 82, 11, TWINE.base);                        // the cord
      capsule(t, c - 3, 30, c - 3, 78, 4, TWINE.hi, 0.7);
      // the bell: flared profile, top-lit, a lip and a clapper below
      poly(t, [
        [c - 24, 118], [c - 40, 160], [c - 52, 208], [c - 70, 254], [c - 106, 284], [c - 106, 300],
        [c + 106, 300], [c + 106, 284], [c + 70, 254], [c + 52, 208], [c + 40, 160], [c + 24, 118],
      ], GOLD.hi, 1, GOLD.lo);
      capsule(t, c - 32, 150, c - 40, 236, 12, '#FFF3C4', 0.7);        // lit left flank
      capsule(t, c + 42, 160, c + 60, 250, 12, GOLD.deep, 0.5);        // shaded right flank
      roundRect(t, c, 300, 110, 15, 7, GOLD.base, 1, GOLD.deep);      // the lip
      capsule(t, c, 306, c, 326, 12, IRON.lo);                         // clapper
      ellipse(t, c, 336, 17, 16, IRON.deep, 1, 3);
      ellipse(t, c - 2, 333, 12, 11, IRON.base, 1, 3);
      ellipse(t, c - 6, 329, 5, 4, IRON.hi, 0.9, 2);
      // the bow: two filled loops, a knot, two short tails over the shoulders
      poly(t, ovalPts(c - 40, 100, 38, 22, -0.4), RUBY.base, 1, RUBY.lo);
      poly(t, ovalPts(c + 40, 100, 38, 22, 0.4), RUBY.base, 1, RUBY.lo);
      poly(t, ovalPts(c - 44, 96, 18, 8, -0.4), RUBY.hi, 0.6);
      capsule(t, c - 6, 112, c - 44, 168, 17, RUBY.base);
      capsule(t, c + 6, 112, c + 46, 168, 17, RUBY.base);
      capsule(t, c - 10, 116, c - 40, 160, 6, RUBY.lo, 0.5);
      capsule(t, c + 10, 116, c + 42, 160, 6, RUBY.lo, 0.5);
      ellipse(t, c, 106, 17, 15, RUBY.lo, 1, 3);
      ellipse(t, c - 2, 103, 12, 10, RUBY.base, 1, 3);
    }, { width: 10 });
    sheen(cv, c - 48, 176, 12, 26, 0.42);
    savePNG(path.join(OUT, 'daily_7.png'), W, W, down2(cv, W, W));
  }

  { // === daily_30.png — a garden gate standing OPEN between two posts ==========
    // Two capped posts under a lintel with a sprig of leaves, and the gate leaf
    // hinged to the LEFT post and swung toward the viewer, so its free end drops
    // lower and larger and daylight shows between it and the right post. Three
    // fat pickets, not six thin ones: six average to a striped block at 32dp.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 350, 150, 16, 0.3);
    withOutline(cv, t => {
      for (const x of [c - 130, c + 130]) {                            // posts
        roundRect(t, x, 224, 17, 110, 5, WOOD.light, 1, WOOD.dark);
        roundRect(t, x, 110, 26, 11, 5, WOOD.base, 1, WOOD.seam);      // caps
        capsule(t, x - 7, 126, x - 7, 320, 5, WOOD.rim, 0.5);
      }
      roundRect(t, c, 90, 156, 13, 6, WOOD.base, 1, WOOD.dark);        // lintel
      capsule(t, c - 150, 82, c + 150, 82, 5, WOOD.rim, 0.55);
      // a sprig on the lintel's left end: three fat leaves
      for (const [x, y, ang] of [[c - 118, 60, -0.9], [c - 86, 50, -0.3], [c - 62, 66, 0.5]]) {
        poly(t, ovalPts(x, y, 24, 12, ang, 20), SAGE.base, 1, SAGE.lo);
        capsule(t, x - 12 * Math.cos(ang), y - 12 * Math.sin(ang), x + 12 * Math.cos(ang), y + 12 * Math.sin(ang), 4, SAGE.hi, 0.6);
      }
      // The gate leaf: hinged on the left post and swung WIDE toward the viewer,
      // so it is foreshortened to under half the opening, its free end drops well
      // below the posts, and the rest of the doorway is open daylight — that gap
      // is what says "open". A first pass swung it only a little, laid a diagonal
      // brace across three pickets, and at 32dp the brace and pickets hashed into
      // a lattice that filled the doorway: it read as a closed fence panel. So:
      // no brace, three FAT pickets with real gaps, a top and bottom rail.
      const HXg = c - 110, FX = c - 6;
      const topH = 158, topF = 118, botH = 296, botF = 348;
      const railTop = [[HXg, topH], [FX, topF], [FX, topF + 24], [HXg, topH + 20]];
      const railBot = [[HXg, botH - 20], [FX, botF - 26], [FX, botF], [HXg, botH]];
      poly(t, railTop, WOOD.rim, 1, WOOD.mid);
      poly(t, railBot, WOOD.rim, 1, WOOD.mid);
      for (const u of [0.14, 0.5, 0.86]) {
        const x = lerp(HXg, FX, u), hw = 12 + u * 4;
        const yT = lerp(topH, topF, u) - 14, yB = lerp(botH, botF, u) - 2;
        poly(t, [[x - hw, yT + 18], [x, yT], [x + hw, yT + 18], [x + hw, yB], [x - hw, yB]], WOOD.light, 1, WOOD.mid);
        capsule(t, x - hw * 0.45, yT + 26, x - hw * 0.45, yB - 10, 5, WOOD.rim, 0.6);
      }
      for (const y of [topH + 10, botH - 10]) roundRect(t, HXg + 2, y, 12, 8, 3, IRON.deep);  // hinges
    }, { width: 10 });
    sheen(cv, c - 92, 200, 8, 26, 0.4);
    savePNG(path.join(OUT, 'daily_30.png'), W, W, down2(cv, W, W));
  }

  { // === shared_first.png — a paper airplane climbing to the upper right =======
    // A dart seen from three-quarters: the far wing lit white, the near wing a
    // step down, the keel below darkest — three flat value steps and one crease,
    // which is all a folded sheet has and all a 32dp cell can carry.
    // Round 1 folded it from white paper and it was the one cool-neutral object
    // on the warm sheet, and at a 29-degree glide it filled under half the
    // frame's height, the thinnest icon on the sheet. It is parchment now
    // (R > B on every fill, the fold shadow in warm wood-brown, the contact
    // shadow INK), and it CLIMBS: nose to the upper right at ~37 degrees, a
    // wider far wing, scaled up so it fills ~63% of the frame's height and reads
    // as in flight. The chromeC paper_plane is a warm plane in a flat glide, so
    // this crest keeps the steep pose on purpose.
    const { cv, c } = canvas();
    const ang = -0.64, ca = Math.cos(ang), sa = Math.sin(ang), S = 1.2;
    const OX = c + 132, OY = 62;                                      // the nose
    const P = (u, v) => [OX + (u * ca - v * sa) * S, OY + (u * sa + v * ca) * S];
    contactShadow(cv, c - 2, 332, 132, 16, 0.3);
    withOutline(cv, t => {
      poly(t, [P(0, 0), P(-262, 46), P(-206, 6)], PLANE.base, 1, PLANE.lo);      // near wing
      poly(t, [P(0, 0), P(-206, 6), P(-196, 74)], PLANE.lo, 1, PLANE.deep);      // keel
      poly(t, [P(0, 0), P(-242, -92), P(-206, 6)], PLANE.hi, 1, PLANE.base);     // far wing
      const [x1, y1] = P(-6, 0), [x2, y2] = P(-204, 6);
      capsule(t, x1, y1, x2, y2, 7, WOOD.seam, 0.7);                             // the spine fold
      const [k1, k2] = [P(-14, 2), P(-192, 68)];
      capsule(t, k1[0], k1[1], k2[0], k2[1], 4, WOOD.dark, 0.35);                // the keel fold
    }, { width: 10 });
    const [sx, sy] = P(-140, -40);
    sheen(cv, sx, sy, 34, 12, 0.45);
    savePNG(path.join(OUT, 'shared_first.png'), W, W, down2(cv, W, W));
  }
}

// Allow `node scripts/tools/gameIcons/achievementsCollectionJourney.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('achievementsCollectionJourney.mjs')) draw();
