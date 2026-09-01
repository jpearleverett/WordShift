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
 *   all_rooms     a carpenter's mallet crossed over a try-square-> an L with a bar across it
 *   amber_1000    a clay pot, gems heaped above its rim         -> a tall urn with a lumpy top
 *   amber_5000    an iron strongbox, lid up, gems spilling      -> a squat box with a raised slab
 *
 * The amber pair shares the one `gem()` primitive so the two read as one line:
 * the pot is the SMALLER hoard (terracotta, open, gems just clearing the rim),
 * the strongbox the LARGER (iron-banded, locked, gems overrunning the front).
 * The clay of the pot is the same TERRA as the paw-print disc, which ties the
 * category together as one material family without repeating a silhouette.
 *
 * JOURNEY: the four phase crests follow the game's descent, each in the palette
 * of the phase it marks, and the three daily/sharing crests are plain objects:
 *
 *   phase_1       a steaming teacup, ONE curl of steam bent into a question hook
 *                 (Curious Thoughts: sage glaze, warm)          -> cup + a hook above it
 *   phase_2       a stone well, a crescent moon lying in its water
 *                 (Deeper Questions: night stone, navy water)   -> a cylinder under a frame
 *   phase_3       a bare tree, its shadow lying long across the ground
 *                 (Growing Shadows: dusk mauve, wine bark)      -> a forked tree on a slab
 *   phase_4       a black sun on the horizon, rimmed in crimson
 *                 (The Horizon: the dread palette)              -> a rayed disc on a bar
 *   daily_first   a kraft envelope under a red wax seal stamped with an X
 *   daily_7       a brass bell hanging from a cord, a red bow at its crown
 *   daily_30      a garden gate standing OPEN between two posts under a lintel
 *   shared_first  a paper airplane climbing to the upper right
 *
 * PALETTE. Terracotta (TERRA), the kit's WOOD/BRASS/STONE/AMB, a warm IRON grey
 * (never cool vector steel next to the wood), sage for the glaze and the roof,
 * KRAFT for the envelope — kraft rather than cream paper because a cream letter
 * on the cream parchment row is invisible (rule 6: no large area within ~0.13
 * luminance of a ground). The four phase crests darken in order: sage, night
 * navy, dusk mauve, then ash/indigo with a crimson rim — the only crimson in the
 * family, so the dread crest is the one that glows red. No glow is drawn on
 * cream-adjacent surfaces at all: every soft wash here is a contact shadow.
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
const PAPER = { hi: '#FFFFFF', base: '#F2F1EC', lo: '#C6BFB0', deep: '#8E8474' };
const SAGE = { hi: '#CFE3B4', base: '#8DB86A', lo: '#527A36', deep: '#345224' };
const TEA = { hi: '#C9822F', lo: '#7A4412' };
const STEAM = { hi: '#FBF8F0', lo: '#CFC6C4' };
const NIGHT = { hi: '#4A5896', base: '#2A325E', lo: '#151A38' };
const MOON = '#F6EEC8';
const DUSK = { gHi: '#C29ABC', gLo: '#6E4A72', shadow: '#2E1A33' };
const BARK = { hi: '#9E6650', base: '#6A3F33', lo: '#3E241E' };
const DREAD = { gHi: '#8C7692', gLo: '#4E3E5A', sun: '#130D16', sunHi: '#2C1F31', rim: '#C8283A', rimHi: '#FF6A62' };
const TWINE = { hi: '#F3E6C4', base: '#D8C296', lo: '#A98F5F' };

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

  { // === all_rooms.png — a carpenter's mallet crossed over a try-square ========
    // The square is an L (thick wooden stock along the bottom, brass blade up the
    // left) and the mallet lies diagonally across its inside, head at the upper
    // left so the blade passes BEHIND the head and shows again above it: the two
    // tools genuinely cross rather than sit side by side.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 344, 150, 18, 0.3);
    const ang = Math.atan2(150 - 322, -40 - 120);                    // handle, lower-right to upper-left
    const HX = c + 120, HY = 322, TX = c - 40, TY = 150;
    withOutline(cv, t => {
      // try-square: brass blade (vertical) + wooden stock (horizontal)
      roundRect(t, c - 132, 190, 16, 130, 5, BRASS.hi, 1, BRASS.lo);
      capsule(t, c - 138, 64, c - 138, 300, 5, '#FFF0C4', 0.55);
      roundRect(t, c - 30, 302, 132, 22, 7, WOOD.light, 1, WOOD.dark);
      capsule(t, c - 150, 290, c + 92, 290, 7, WOOD.rim, 0.55);
      for (const x of [c - 66, c + 4, c + 74]) ellipse(t, x, 302, 7, 7, BRASS.lo, 0.9, 2);  // rivets
      // mallet handle, thick enough to stay a handle at 32dp
      poly(t, roundRectPts((HX + TX) / 2, (HY + TY) / 2, Math.hypot(HX - TX, HY - TY) / 2 + 4, 18, 9, ang), WOOD.base, 1, WOOD.dark);
      poly(t, roundRectPts((HX + TX) / 2 - 7, (HY + TY) / 2 - 7, Math.hypot(HX - TX, HY - TY) / 2 - 12, 6, 4, ang), WOOD.rim, 0.55);
      // mallet head: a BIG barrel across the handle's top end. The first pass drew
      // it at 68x42 and the square's L swallowed it at 32dp; the head is the
      // thing that says "mallet", so it is now the largest mass on the tile.
      const hx = c - 70, hy = 118;
      poly(t, roundRectPts(hx, hy, 84, 52, 20, ang + Math.PI / 2), WOOD.light, 1, WOOD.dark);
      poly(t, roundRectPts(hx - 10, hy - 14, 62, 14, 9, ang + Math.PI / 2), WOOD.rim, 0.6);
      for (const s of [-1, 1]) {                                     // iron hoops on the barrel ends
        const ex = hx + Math.cos(ang + Math.PI / 2) * 64 * s, ey = hy + Math.sin(ang + Math.PI / 2) * 64 * s;
        poly(t, roundRectPts(ex, ey, 11, 50, 4, ang + Math.PI / 2), IRON.base, 1, IRON.deep);
      }
    }, { width: 10 });
    sheen(cv, c - 112, 96, 14, 22, 0.42);
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

  { // === amber_5000.png — an iron strongbox, lid up, gems spilling from it =====
    // Iron and squat where the puzzle ladder's chest (puzzle_750) is wood and
    // domed: a flat slab lid standing open on its back hinge, two vertical bands,
    // a brass padlock hanging open at the front, and the gems overrun the lip.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 344, 148, 18, 0.32);
    withOutline(cv, t => {
      // lid: its underside faces us
      poly(t, [[c - 134, 196], [c + 134, 196], [c + 122, 96], [c - 122, 96]], IRON.lo, 1, IRON.base);
      roundRect(t, c, 96, 124, 9, 4, IRON.hi, 1, IRON.base);           // lid's lit top edge
      for (const x of [c - 74, c + 74]) poly(t, [[x - 14, 196], [x + 14, 196], [x + 13, 100], [x - 13, 100]], IRON.deep, 0.8);
      // body
      roundRect(t, c, 262, 134, 66, 8, IRON.hi, 1, IRON.lo);
      for (const x of [c - 74, c + 74]) {
        roundRect(t, x, 262, 15, 66, 3, IRON.deep, 0.95);
        capsule(t, x - 5, 200, x - 5, 324, 4, IRON.hi, 0.45);
      }
      capsule(t, c - 130, 198, c + 130, 198, 12, IRON.deep, 0.9);      // the open mouth's lip
      for (const x of [c - 108, c + 108]) roundRect(t, x, 334, 20, 8, 3, IRON.deep);  // feet
      // padlock, open
      arcStroke(t, c, 276, 18, 10, Math.PI, Math.PI * 2, BRASS.lo);
      roundRect(t, c, 300, 24, 22, 6, BRASS.hi, 1, BRASS.lo);
      ellipse(t, c, 302, 6, 6, INK, 0.8, 2);
      // the hoard
      gem(t, c - 84, 184, 30, 0.2);
      gem(t, c - 28, 176, 31, -0.3);
      gem(t, c + 30, 180, 31, 0.35);
      gem(t, c + 86, 186, 29, -0.1);
      gem(t, c + 2, 130, 30, 0.15);
      gem(t, c - 102, 232, 27, 0.4);                                   // over the lip
      gem(t, c + 54, 236, 27, -0.35);
      gem(t, c + 140, 318, 25, 0.2);                                   // one on the ground
    }, { width: 10 });
    sheen(cv, c - 106, 220, 12, 30, 0.4);
    savePNG(path.join(OUT, 'amber_5000.png'), W, W, down2(cv, W, W));
  }

  { // === phase_1.png — a steaming teacup, the steam bent into a question hook ==
    // Sage glaze, not creamware: cream china on the cream parchment row is a
    // contour with nothing inside it. The steam is ONE thick pale ribbon (solid,
    // so withOutline contours it) drawn as the hook of a '?' with its stem
    // dropping into the tea. No dot: a lone dot at 32dp is a stray fleck.
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
      // the steam: hook + stem
      capsule(t, c - 2, 148, c - 2, 194, 24, STEAM.hi);
      arcStroke(t, c - 2, 100, 46, 26, Math.PI * 0.98, Math.PI * 2.5, STEAM.hi);
      arcStroke(t, c + 2, 104, 46, 9, Math.PI * 1.1, Math.PI * 2.4, STEAM.lo, 0.7);
      capsule(t, c + 6, 152, c + 6, 190, 8, STEAM.lo, 0.6);
    }, { width: 10 });
    sheen(cv, c - 70, 216, 16, 30, 0.42);
    sheen(cv, c - 36, 70, 14, 10, 0.45);
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

  { // === phase_4.png — a black sun on the horizon, rimmed in crimson ===========
    // The dread crest, and the family's only crimson. A crimson sun-with-rays is
    // laid first and the black sun-with-rays over it a step smaller, so a rim of
    // crimson shows all the way round disc and rays alike; the ground slab then
    // covers the lower third so the sun SITS on the horizon rather than floating.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 342, 160, 16, 0.3);
    const SX = c, SY = 196;
    const rays = (rIn, rOut, halfAng, color, alpha = 1) => {
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 4;
        tri(t0, [SX + Math.cos(a - halfAng) * rIn, SY + Math.sin(a - halfAng) * rIn],
          [SX + Math.cos(a + halfAng) * rIn, SY + Math.sin(a + halfAng) * rIn],
          [SX + Math.cos(a) * rOut, SY + Math.sin(a) * rOut], color, alpha);
      }
    };
    let t0 = null;
    withOutline(cv, t => {
      t0 = t;
      rays(84, 158, 0.30, DREAD.rim);
      ellipse(t, SX, SY, 106, 106, DREAD.rim, 1, 3);
      arcStroke(t, SX, SY, 98, 12, Math.PI * 0.95, Math.PI * 1.7, DREAD.rimHi, 0.9);
      rays(84, 140, 0.19, DREAD.sun);
      ellipse(t, SX, SY, 92, 92, DREAD.sun, 1, 3);
      ellipse(t, SX - 12, SY - 22, 62, 52, DREAD.sunHi, 0.8, 34);
      // the ground, over the sun's lower third, and the crimson horizon line
      roundRect(t, c, 312, 162, 40, 24, DREAD.gHi, 1, DREAD.gLo);
      capsule(t, c - 156, 274, c + 156, 274, 9, DREAD.rim, 0.95);
    }, { width: 10 });
    sheen(cv, c - 130, 288, 22, 8, 0.32);
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
    const { cv, c } = canvas();
    const ang = -0.5, ca = Math.cos(ang), sa = Math.sin(ang);
    const OX = c + 130, OY = 132;                                     // the nose
    const P = (u, v) => [OX + u * ca - v * sa, OY + u * sa + v * ca];
    contactShadow(cv, c + 14, 320, 132, 16, 0.3);
    withOutline(cv, t => {
      poly(t, [P(0, 0), P(-262, 44), P(-206, 6)], PAPER.base, 1, PAPER.lo);      // near wing
      poly(t, [P(0, 0), P(-206, 6), P(-196, 72)], PAPER.lo, 1, PAPER.deep);      // keel
      poly(t, [P(0, 0), P(-256, -78), P(-206, 6)], PAPER.hi, 1, PAPER.base);     // far wing
      const [x1, y1] = P(-6, 0), [x2, y2] = P(-204, 6);
      capsule(t, x1, y1, x2, y2, 6, PAPER.deep, 0.5);                            // the spine crease
    }, { width: 10 });
    const [sx, sy] = P(-150, -34);
    sheen(cv, sx, sy, 34, 12, 0.45);
    savePNG(path.join(OUT, 'shared_first.png'), W, W, down2(cv, W, W));
  }
}

// Allow `node scripts/tools/gameIcons/achievementsCollectionJourney.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('achievementsCollectionJourney.mjs')) draw();
