/**
 * gameIcons/achievementsMasteryA.mjs — MASTERY CRESTS, PART A (13 icons).
 *
 * One painted crest per mastery achievement (src/services/achievements.ts),
 * filed as assets/ui/achievements/<id>.png. They render at 34dp in the Stats
 * list and 26dp in the unlock toast, in ONE scrolling list with every other
 * achievement, so every crest here has to be told from its category-mates by
 * SILHOUETTE alone. Think "a badge a cottage would hang on the wall".
 *
 * Three groups, two of them ladders:
 *
 *   STARS ladder (perfect-solve counts), vessel = the GOLD STAR, escalating by
 *   COUNT and then by the thing that HOLDS the stars:
 *     first_perfect  ONE star half-risen behind a FLAT-TOPPED sage horizon band,
 *                    six brass ray rods radiating from it (First Light)
 *                    -> a sunburst over a straight edge. The horizon is a band
 *                    with a straight top, not a mound: the first blind round
 *                    read a domed hill as something the star stood ON.
 *     perfect_10     a FAN of three stars, the big one centre and high
 *                    -> a three-lobed arc. Wider than tall.
 *     perfect_25     a corked GLASS JAR filled with stars
 *                    -> a bottle. Taller than wide, a lid on top.
 *     perfect_50     a brass-rimmed night MEDAL hung from a wine ribbon and a
 *                    brass bar, five stars joined into a constellation on its
 *                    face, ONE anchor star clearly larger than the other four
 *                    -> a disc with a ribbon V and a bar above it. The only round
 *                    thing in the ladder, and its ribbon keeps it off the
 *                    challenge buckler's plain-circle silhouette (row 10 of the
 *                    same list): the first blind round confused the two, so the
 *                    straps and bar are fat enough to survive 32px.
 *   Every star is drawn by the one `goldStar` below, so the four read as one line.
 *   The medal is a deliberate addition to the brief's bare "five stars and
 *   lines": five loose stars are a particle field at 26dp, and the house rule is
 *   ONE centred silhouette. Set into a disc they are a constellation on a coin.
 *
 *   STANDALONE crests (difficulty / self-reliance / flawless play):
 *     all_difficulties  a five-petal pinwheel rosette, one petal per tier colour
 *                       (green, gold, orange, red, purple) on a brass hub
 *     hard_10           a crimson knight's helm: a domed skull cap over a face
 *                       plate with two eye slits and breath slits, a brass visor
 *                       hinge between them, a flared steel gorget below (wider
 *                       than the crown) and a tall cream plume curling to the
 *                       upper-right. The plume, the paired eye slits and the
 *                       flare are the cues only a helmet owns: the earlier
 *                       dome + top knob + flat base band + T-slot read as a
 *                       paper lantern or a bell to a blind reviewer.
 *     no_hints_10       a lit brass oil lamp, spout left, loop handle right,
 *                       the BODY on the canvas centre so the flame stays well
 *                       inside the left edge; no aura behind the flame (see the
 *                       kit fact below: a translucent halo on the bare canvas
 *                       ships as a grey smudge)
 *     flawless_first    a cut clear gem, side view, on a wine cushion
 *     flawless_25       an arrow dead-centre in a wooden target
 *   The five share nothing but the house voice, on purpose: each is a different
 *   achievement and they sit in one list.
 *
 *   CHALLENGE ladder (challenge-mode wins), vessel = the SHIELD, escalating by
 *   MATERIAL first and then by what is MOUNTED on it:
 *     challenge_first  a plain round WOODEN buckler with an iron rim
 *                      -> a wooden circle
 *     challenge_10     an IRON kite shield with a BRASS boss
 *                      -> a kite, grey
 *     challenge_25     the same kite shield with ONE sword crossed behind it
 *                      -> a kite with one diagonal
 *     challenge_50     the same shield, TWO swords crossed behind, a CROWN above
 *                      -> a kite with an X and a spiky top
 *   The kite shield's geometry is byte-identical across 10/25/50 (`kiteShield`
 *   with one fixed anchor); everything the eye uses to tell them apart is a large
 *   added element, never a glow.
 *
 * Palette: the gold is the shop's attunement gold so the stars match the amber
 * furniture around them; iron is a cool light steel three value steps off the ash
 * paper; crimson and wine are the house's dread reds used here as heraldry, not
 * horror. Tier colours on the pinwheel are CandyColors green/yellow/orange/red/
 * purple .main from src/theme/colors.ts, each with a hand-picked darker foot.
 *
 * House doctrine (see _draw.mjs): contact shadow and any halo go down on the real
 * canvas FIRST (never contoured), the subject is drawn inside withOutline, the
 * upper-left sheen lands on top of the contour. INK outlines, never #000.
 *
 * A kit fact that decided first_perfect's dawn light: the canvas starts as
 * transparent BLACK and the PNG is saved straight-alpha, so a translucent layer
 * laid on the bare canvas exports as its colour scaled by its alpha (a cream
 * #FFF3D2 disc at 0.34 ships as rgb 87,83,71 @ 34%). Composited over parchment
 * that can only DARKEN it, however light the source colour was. A glow that must
 * read light therefore has to be OPAQUE paint inside the contour: first_perfect's
 * rays are solid brass rods and no_hints_10's flame carries no aura at all. No
 * Math.random: every coordinate is a literal, so the generator is
 * byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline,
  INK, WOOD, PARCH, ACCENT, BRASS,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, tri, starPts, blend, hex,
} from '../shopIcons/_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/achievements');

// --- local palettes ---------------------------------------------------------
const GOLD = { up: '#FFE9A8', hi: '#FFD469', mid: '#F0A81E', lo: '#A96406', deep: '#6E3D06' };
const IRON = { hi: '#DCDEE6', base: '#AEB1BF', mid: '#767A8C', lo: '#454857' };
const CRIMSON = { hi: '#F2685A', base: '#C4302B', lo: '#7C1518' };
const WINE = { hi: '#B84A74', base: '#8C2D52', lo: '#54152F' };
const GLASS = { hi: '#D4EAF4', base: '#A9D0E4', lo: '#6D9BB6' };
const NIGHT = { hi: '#5468B4', base: '#38468C', lo: '#1F2756' };
const HALO = '#FFF3D2';              // lighter than cream (#F3E2BF) in every channel
/** Difficulty tier colours: CandyColors .main on top, a darker foot below. */
const TIER = [
  ['#22C55E', '#15803D'],           // EASY        green
  ['#FACC15', '#B58A00'],           // MEDIUM      gold
  ['#F97316', '#B54708'],           // MEDIUM_PLUS orange
  ['#EF4444', '#991B1B'],           // HARD        red
  ['#9333EA', '#5B1FA0'],           // EXPERT      purple
];

// --- local primitives --------------------------------------------------------

/** Closed ring stroke (arcStroke double-beads at a full-circle seam). */
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
 * THE family star: a chunky five-point star with its own ink keyline (so stars
 * can overlap each other and still separate), a top-lit gold body and a small
 * lit facet at the upper-left. Every star in the STARS ladder is this one.
 */
function goldStar(cv, cx, cy, R, rot = -Math.PI / 2) {
  poly(cv, starPts(cx, cy, R + 8, R * 0.5 + 5, rot), INK, 0.95);
  poly(cv, starPts(cx, cy, R, R * 0.5, rot), GOLD.hi, 1, GOLD.lo);
  poly(cv, starPts(cx - R * 0.08, cy - R * 0.1, R * 0.5, R * 0.25, rot), GOLD.up, 0.75);
}

/** A pointed oval petal centred at (x,y), long axis along `ang`. */
function petalPts(x, y, len, wid, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const local = [
    [-len, 0], [-len * 0.45, -wid * 0.78], [0, -wid],
    [len * 0.55, -wid * 0.66], [len, 0],
    [len * 0.55, wid * 0.66], [0, wid], [-len * 0.45, wid * 0.78],
  ];
  return local.map(([lx, ly]) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca]);
}

/** Upper half of an ellipse as a closed polygon — a dome. */
function domePts(cx, cy, rx, ry, n = 26) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

/**
 * A sword from hilt point (hx,hy) to tip (tx,ty): pommel, dark grip, brass
 * crossguard, a steel blade tapering to the point with a lit fuller. Drawn
 * BEFORE the shield so only the ends show past it.
 */
function sword(cv, hx, hy, tx, ty) {
  const L = Math.hypot(tx - hx, ty - hy) || 1;
  const dx = (tx - hx) / L, dy = (ty - hy) / L, px = -dy, py = dx;
  const P = (s, o) => [hx + dx * s + px * o, hy + dy * s + py * o];
  // blade: parallel edges then a 64px point
  poly(cv, [P(58, 17), P(L - 66, 17), P(L, 0), P(L - 66, -17), P(58, -17)], IRON.hi, 1, IRON.mid);
  capsule(cv, ...P(70, -4), ...P(L - 60, -4), 7, '#F5F6FA', 0.7);     // fuller, lit side
  capsule(cv, ...P(70, 7), ...P(L - 66, 7), 6, IRON.lo, 0.5);          // shaded side
  // crossguard
  capsule(cv, ...P(52, -46), ...P(52, 46), 20, BRASS.lo);
  capsule(cv, ...P(50, -44), ...P(50, 44), 11, BRASS.hi, 0.9);
  // grip + pommel
  capsule(cv, ...P(6, 0), ...P(46, 0), 22, WOOD.dark);
  capsule(cv, ...P(10, -5), ...P(42, -5), 7, WOOD.base, 0.7);
  ellipse(cv, ...P(2, 0), 17, 17, BRASS.lo);
  ellipse(cv, ...P(-1, -2), 12, 12, BRASS.hi);
}

// Fixed anchor of the challenge ladder's kite shield (byte-identical in 10/25/50).
const KITE = { cx: W, cy: W + 14, hw: 118, hh: 126 };
function kitePts(cx, cy, hw, hh) {
  return [
    [cx - hw, cy - hh + 30], [cx - hw * 0.72, cy - hh + 5], [cx, cy - hh],
    [cx + hw * 0.72, cy - hh + 5], [cx + hw, cy - hh + 30], [cx + hw, cy - hh * 0.16],
    [cx + hw * 0.56, cy + hh * 0.56], [cx, cy + hh],
    [cx - hw * 0.56, cy + hh * 0.56], [cx - hw, cy - hh * 0.16],
  ];
}

/** The iron kite shield with a brass boss: the challenge ladder's vessel. */
function kiteShield(cv) {
  const { cx, cy, hw, hh } = KITE;
  poly(cv, kitePts(cx, cy, hw, hh), IRON.mid, 1, IRON.lo);             // rim band
  poly(cv, kitePts(cx, cy - 3, hw - 16, hh - 16), IRON.hi, 1, IRON.mid); // face
  // a lit upper-left field and a shaded lower-right one: two big value steps
  poly(cv, [[cx - hw + 20, cy - hh + 36], [cx - 6, cy - hh + 8], [cx - 6, cy + hh - 44], [cx - hw + 20, cy - hh * 0.18]], '#EEF0F5', 0.55);
  poly(cv, [[cx + 8, cy + 10], [cx + hw - 18, cy - hh * 0.2], [cx + hw * 0.5, cy + hh * 0.52], [cx + 4, cy + hh - 20]], IRON.lo, 0.35);
  // the brass boss, domed and ringed
  ellipse(cv, cx, cy - 12, 42, 42, INK, 0.92, 3);
  ellipse(cv, cx, cy - 14, 36, 36, BRASS.lo, 1, 3);
  ellipse(cv, cx - 2, cy - 17, 27, 27, BRASS.hi, 1, 3);
  ellipse(cv, cx - 8, cy - 23, 11, 11, '#FFF3D2', 0.9, 3);
}

/** A small gold crown: five points, a jewelled band. */
function crown(cv, cx, baseY) {
  const pts = [
    [cx - 72, baseY], [cx - 72, baseY - 42], [cx - 38, baseY - 20], [cx, baseY - 56],
    [cx + 38, baseY - 20], [cx + 72, baseY - 42], [cx + 72, baseY],
  ];
  poly(cv, pts, GOLD.hi, 1, GOLD.lo);
  roundRect(cv, cx, baseY - 6, 72, 9, 4, GOLD.deep, 0.8);
  for (const [x, y] of [[cx - 72, baseY - 42], [cx, baseY - 56], [cx + 72, baseY - 42]]) {
    ellipse(cv, x, y, 9, 9, INK, 0.9, 2);
    ellipse(cv, x, y, 6.5, 6.5, CRIMSON.hi, 1, 2);
  }
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === first_perfect.png — First Light: one star rising over a flat horizon ===
    const { cv, c } = canvas();
    const sy = 204, R = 100, hz = 254;                                     // star centre / radius, horizon top edge
    contactShadow(cv, c + 10, 342, 136, 14, 0.32);                         // under the band, down-right: the ONLY thing outside the contour
    withOutline(cv, t => {
      // six brass ray RODS radiating from the star's centre: two horizontal
      // along the horizon and four fanned over the top, each 18 degrees OFF a
      // star point so no rod extends a point (a fan hugging the points read as
      // crown prongs in the first blind round). Each rod is 26px wide at 384
      // (13 at 192, over the 1/16-frame floor) and shows ~40-70px at 192 past
      // the star's silhouette. Brass, a full step darker than the gold star and
      // separated from it by an extra-heavy keyline, so at 32px the star stays
      // the bright form and the rays stay behind it. Opaque paint, contoured
      // with the star: it can never darken the ground the way a halo does.
      for (const deg of [-180, -144, -108, -72, -36, 0]) {
        const a = (deg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
        capsule(t, c + ca * 40, sy + sa * 40, c + ca * (R + 46), sy + sa * (R + 46), 26, BRASS.lo);
        capsule(t, c + ca * 44, sy + sa * 44 - 4, c + ca * (R + 40), sy + sa * (R + 40) - 4, 12, BRASS.hi, 0.85);
      }
      poly(t, starPts(c, sy, R + 16, R * 0.5 + 10), INK, 0.95);           // heavy keyline vs the rays
      goldStar(t, c, sy, R);
      // the horizon: a flat-topped sage band ~70% of the frame wide, drawn OVER
      // the star so its two lower points sink behind the straight top edge
      // (the edge runs through the star's bottom inner vertex): half risen is
      // rising. A lit crest strip just under the edge, a darker foot.
      poly(t, [[c - 134, hz], [c + 134, hz], [c + 124, 334], [c - 124, 334]], ACCENT.main, 1, ACCENT.lo);
      capsule(t, c - 118, hz + 12, c + 118, hz + 12, 12, '#9BC46E', 0.6);
    }, { width: 10 });
    sheen(cv, c - 34, sy - 34, 17, 11, 0.5);
    savePNG(path.join(OUT, 'first_perfect.png'), W, W, down2(cv, W, W));
  }

  { // === perfect_10.png — a fan of three stars ==============================
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 336, 150, 20, 0.32);
    withOutline(cv, t => {
      goldStar(t, c - 104, 236, 66, -Math.PI / 2 - 0.42);
      goldStar(t, c + 104, 236, 66, -Math.PI / 2 + 0.42);
      goldStar(t, c, 176, 92);
    }, { width: 10 });
    sheen(cv, c - 30, 146, 16, 10, 0.5);
    savePNG(path.join(OUT, 'perfect_10.png'), W, W, down2(cv, W, W));
  }

  { // === perfect_25.png — a corked glass jar full of stars ===================
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 348, 112, 18, 0.32);
    withOutline(cv, t => {
      // cork + neck + body
      roundRect(t, c, 66, 66, 22, 9, WOOD.light, 1, WOOD.dark);
      capsule(t, c - 52, 52, c + 52, 52, 8, WOOD.rim, 0.7);
      roundRect(t, c, 100, 62, 18, 8, GLASS.hi, 1, GLASS.base);
      roundRect(t, c, 228, 104, 108, 34, GLASS.hi, 1, GLASS.lo);
      capsule(t, c - 78, 128, c + 78, 128, 12, GLASS.lo, 0.45);            // shoulder seam
      // the stars, each >= 1/10 of the frame across
      const STARS = [
        [c - 50, 298, 30, 0.3], [c + 48, 294, 30, -0.25], [c - 2, 246, 30, 0.1],
        [c - 60, 210, 27, -0.4], [c + 56, 214, 27, 0.35], [c, 164, 26, 0.0],
      ];
      for (const [x, y, r, rot] of STARS) goldStar(t, x, y, r, -Math.PI / 2 + rot);
      // glass over the stars: one broad reflection band on the lit side
      roundRect(t, c - 66, 226, 16, 92, 8, '#FFFFFF', 0.42);
      roundRect(t, c + 78, 236, 8, 80, 4, GLASS.lo, 0.35);
    }, { width: 10 });
    sheen(cv, c - 40, 64, 12, 7, 0.45);
    savePNG(path.join(OUT, 'perfect_25.png'), W, W, down2(cv, W, W));
  }

  { // === perfect_50.png — a night medal on a ribbon, a five-star constellation ===
    const { cv, c } = canvas();
    const cy = 244, R = 112;                                               // disc ~58% of the frame
    contactShadow(cv, c + 8, cy + R + 4, 100, 16, 0.32);
    withOutline(cv, t => {
      // the ribbon: a brass pin bar at the top, two wine straps falling in a V
      // to a brass suspension ring at the disc's crown. The bar + V is what
      // breaks the plain-circle silhouette the challenge buckler owns.
      // Straps 44px wide at the bar and a 168px bar (at 384): fat enough that
      // the V + bar still reads at 32px, where the first round's thinner
      // ribbon let the disc read as a bare circle.
      const barY = 40;
      poly(t, [[c - 74, barY + 9], [c - 30, barY + 9], [c + 6, 148], [c - 24, 148]], WINE.base, 1, WINE.lo);   // left strap
      poly(t, [[c + 30, barY + 9], [c + 74, barY + 9], [c + 24, 148], [c - 6, 148]], WINE.hi, 1, WINE.base);   // right strap (lit)
      capsule(t, c - 54, barY + 20, c - 14, 140, 9, WINE.hi, 0.55);        // lit stripe, left strap
      capsule(t, c + 54, barY + 20, c + 14, 140, 9, '#D66A93', 0.5);       // lit stripe, right strap
      roundRect(t, c, barY, 84, 13, 6, BRASS.hi, 1, BRASS.lo);            // pin bar
      capsule(t, c - 70, barY - 4, c + 70, barY - 4, 5, '#FFF3D2', 0.55);  // bar highlight
      ringStroke(t, c, 128, 15, 11, BRASS.lo);                             // suspension ring
      arcStroke(t, c, 128, 15, 5, Math.PI * 1.05, Math.PI * 1.7, BRASS.hi, 0.9);
      // the medal disc
      roundRect(t, c, cy, R, R, R, BRASS.hi, 1, BRASS.lo);                 // brass rim
      ringStroke(t, c, cy, R - 11, 7, GOLD.deep, 0.6);
      roundRect(t, c, cy, R - 20, R - 20, R - 20, NIGHT.hi, 1, NIGHT.lo);   // night field
      ringStroke(t, c, cy, R - 24, 7, NIGHT.lo, 0.7);
      // the constellation: five stars on five fat gold cords (20px at 384 =
      // 10px at 192, over the 1/24-frame floor) laid out as a DIPPER, a
      // four-star bowl to the lower right and one handle star up-left. A
      // symmetric W read as the letter M at 32px; the dipper is the one
      // constellation everyone names. The bowl's inner corner star, nearest the
      // disc centre, is the ANCHOR: 34px against 20px for the other four, so
      // one star clearly leads the group.
      const S = [[c - 16, cy + 18], [c + 46, cy + 42], [c + 58, cy - 16], [c + 6, cy - 46], [c - 40, cy - 44]];
      const links = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4]];
      for (const [a, b] of links) capsule(t, S[a][0], S[a][1], S[b][0], S[b][1], 20, GOLD.lo);
      for (const [a, b] of links) capsule(t, S[a][0], S[a][1], S[b][0], S[b][1], 10, GOLD.hi, 0.9);
      const RS = [34, 20, 20, 20, 20];
      [1, 2, 3, 4, 0].forEach(i => goldStar(t, S[i][0], S[i][1], RS[i], -Math.PI / 2 + (i - 2) * 0.12));
    }, { width: 10 });
    sheen(cv, c - 70, cy - 70, 22, 14, 0.45);
    savePNG(path.join(OUT, 'perfect_50.png'), W, W, down2(cv, W, W));
  }

  { // === all_difficulties.png — Well-Rounded: a five-petal tier pinwheel =====
    const { cv, c } = canvas();
    const cy = c + 2, r = 134;
    contactShadow(cv, c + 8, cy + 170, 128, 18, 0.32);
    withOutline(cv, t => {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const x = c + Math.cos(a) * r * 0.6, y = cy + Math.sin(a) * r * 0.6;
        // each vane leans a little off its radius, which is what makes a rosette
        // read as a PINWHEEL rather than a flower
        poly(t, petalPts(x, y, r * 0.66 + 7, r * 0.38 + 7, a + 0.22), INK, 0.95);
        poly(t, petalPts(x, y, r * 0.66, r * 0.38, a + 0.22), TIER[i][0], 1, TIER[i][1]);
      }
      // the brass hub, domed
      ellipse(t, c, cy, 46, 46, INK, 0.95, 3);
      ellipse(t, c, cy, 40, 40, BRASS.lo, 1, 3);
      ellipse(t, c - 2, cy - 3, 30, 30, BRASS.hi, 1, 3);
      ellipse(t, c - 9, cy - 10, 12, 12, '#FFF3D2', 0.9, 3);
    }, { width: 10 });
    sheen(cv, c - 42, cy - 118, 18, 12, 0.45);
    savePNG(path.join(OUT, 'all_difficulties.png'), W, W, down2(cv, W, W));
  }

  { // === hard_10.png — Fearless: a crimson knight's helm, plumed ==============
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 344, 130, 16, 0.32);
    withOutline(cv, t => {
      // the PLUME first (the skull cap covers its root): a cream feather rising
      // from the crown and curling to the upper-right, fat through the middle,
      // ~54px tall at 192. Drawn as a bead of discs along a quadratic curve
      // with a parchment-shadow twin offset down-right for its underside.
      const P0 = [c - 2, 136], P1 = [c + 4, 12], P2 = [c + 122, 52];
      const bz = s => [
        (1 - s) * (1 - s) * P0[0] + 2 * (1 - s) * s * P1[0] + s * s * P2[0],
        (1 - s) * (1 - s) * P0[1] + 2 * (1 - s) * s * P1[1] + s * s * P2[1],
      ];
      const thick = s => 26 + 32 * Math.sin(s * Math.PI) - 6 * s;
      for (let i = 0; i <= 24; i++) { const s = i / 24, [x, y] = bz(s); capsule(t, x + 6, y + 11, x + 6, y + 11, thick(s), PARCH.shadow); }
      for (let i = 0; i <= 24; i++) { const s = i / 24, [x, y] = bz(s); capsule(t, x, y, x, y, thick(s) - 4, PARCH.hi); }
      // the GORGET: a flared steel neck guard, wider than the crown (a lantern
      // tapers the other way), with a dark lip along its bottom
      poly(t, [[c - 100, 284], [c + 100, 284], [c + 122, 330], [c - 122, 330]], IRON.hi, 1, IRON.mid);
      capsule(t, c - 110, 318, c + 110, 318, 8, IRON.lo, 0.5);
      // the FACE PLATE: a crimson box a step darker than the skull, cheeks
      // tucked in toward the chin, a lit nasal ridge down the middle
      poly(t, [[c - 96, 206], [c + 96, 206], [c + 98, 258], [c + 86, 300], [c - 86, 300], [c - 98, 258]], CRIMSON.base, 1, CRIMSON.lo);
      capsule(t, c, 214, c, 296, 14, CRIMSON.hi, 0.35);
      // two eye slits (26px wide, 13 tall at 192 each: ~2px tall at 32px, the
      // thinnest dark mark that still shows) either side of the nasal bar,
      // three short breath slits below them
      roundRect(t, c - 44, 234, 26, 13, 6, INK, 1);
      roundRect(t, c + 44, 234, 26, 13, 6, INK, 1);
      for (const x of [c - 26, c, c + 26]) roundRect(t, x, 274, 5, 16, 3, INK, 1);
      // the SKULL CAP: a crimson dome, lit left cheek, shaded right
      poly(t, domePts(c, 210, 102, 86), CRIMSON.hi, 1, CRIMSON.base);
      poly(t, [[c - 92, 206], [c - 58, 140], [c - 30, 130], [c - 46, 206]], '#FF8C7A', 0.45);
      poly(t, [[c + 40, 136], [c + 92, 176], [c + 100, 206], [c + 60, 206]], CRIMSON.lo, 0.35);
      // brass plume socket on the crown
      roundRect(t, c, 122, 18, 12, 6, BRASS.hi, 1, BRASS.lo);
      // the VISOR HINGE: a brass band between skull and face, a rivet at each end
      roundRect(t, c, 208, 110, 9, 4, BRASS.hi, 1, BRASS.lo);
      for (const x of [c - 100, c + 100]) { ellipse(t, x, 208, 9, 9, INK, 0.9, 2); ellipse(t, x, 207, 6, 6, BRASS.hi, 1, 2); }
    }, { width: 10 });
    sheen(cv, c - 52, 160, 20, 13, 0.5);
    savePNG(path.join(OUT, 'hard_10.png'), W, W, down2(cv, W, W));
  }

  { // === no_hints_10.png — Independent Thinker: a lit brass oil lamp =========
    const { cv, c } = canvas();
    // The BODY sits on the canvas centre (bx = c + 10 puts the whole lamp's
    // bounding box there once the spout and the big ring handle are counted),
    // so the flame tip stays ~26px at 192 inside the left edge. No aura behind
    // the flame: on the bare canvas a translucent halo ships as a grey smudge
    // (see the kit fact in the header).
    const bx = c + 10, by = 246;
    contactShadow(cv, bx + 6, 336, 134, 18, 0.32);
    withOutline(cv, t => {
      // foot
      roundRect(t, bx, 312, 66, 12, 6, BRASS.hi, 1, BRASS.lo);
      capsule(t, bx, 300, bx, 286, 30, BRASS.lo);
      // loop handle, right: big enough to be carried by
      arcStroke(t, bx + 100, 232, 48, 24, -Math.PI * 0.6, Math.PI * 0.6, BRASS.lo);
      arcStroke(t, bx + 100, 232, 48, 11, -Math.PI * 0.55, Math.PI * 0.05, BRASS.hi, 0.8);
      // spout, left, a little shorter, rising to the flame
      capsule(t, bx - 78, 238, bx - 118, 184, 40, BRASS.lo);
      capsule(t, bx - 82, 236, bx - 116, 186, 24, BRASS.hi, 0.9);
      // body: a squat teardrop belly
      roundRect(t, bx, by, 104, 52, 46, BRASS.hi, 1, BRASS.lo);
      capsule(t, bx - 90, 264, bx + 90, 264, 20, '#7E5320', 0.4);           // belly shade
      // lid + knob
      roundRect(t, bx - 4, 192, 44, 11, 5, BRASS.hi, 1, BRASS.lo);
      capsule(t, bx - 4, 186, bx - 4, 172, 12, BRASS.lo);
      ellipse(t, bx - 4, 166, 13, 12, BRASS.hi);
      // the flame at the spout's mouth
      flameLobe(t, bx - 116, 66, 184, 34, '#D8461B');
      flameLobe(t, bx - 118, 88, 182, 25, '#FF9A2E');
      flameLobe(t, bx - 120, 120, 180, 13, '#FFF0B4');
    }, { width: 10 });
    sheen(cv, bx - 44, 216, 26, 13, 0.5);
    savePNG(path.join(OUT, 'no_hints_10.png'), W, W, down2(cv, W, W));
  }

  { // === flawless_first.png — a cut clear gem on a wine cushion ===============
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 344, 148, 16, 0.32);
    ellipse(cv, c, 176, 120, 96, HALO, 0.3, 36);
    withOutline(cv, t => {
      // cushion: a plump top pad over a darker under-pad, gold tassels at the corners
      for (const [x, y] of [[c - 138, 300], [c + 138, 300], [c - 130, 262], [c + 130, 262]]) {
        ellipse(t, x, y, 13, 13, GOLD.mid, 1, 2);
        ellipse(t, x - 3, y - 3, 7, 7, GOLD.up, 0.8, 2);
      }
      roundRect(t, c, 304, 134, 30, 22, WINE.base, 1, WINE.lo);
      roundRect(t, c, 282, 130, 30, 22, WINE.hi, 1, WINE.base);
      capsule(t, c - 90, 268, c + 90, 268, 14, '#D66A93', 0.45);
      // the gem, side view: table, crown, girdle, pavilion
      const T1 = [c - 54, 118], T2 = [c + 54, 118], G1 = [c - 112, 176], G2 = [c + 112, 176];
      const M1 = [c - 34, 176], M2 = [c + 34, 176], P = [c, 272];
      poly(t, [T1, G1, M1], '#C2E4F6', 1, '#8FC4E4');
      poly(t, [T1, T2, M2, M1], '#F2FAFF', 1, '#C8E6F6');
      poly(t, [T2, M2, G2], '#8CC0E2', 1, '#5E9AC6');
      poly(t, [G1, M1, P], '#7FB9E3', 1, '#4B8CC2');
      poly(t, [M1, M2, P], '#5A9BD2', 1, '#2C6BA5');
      poly(t, [M2, G2, P], '#3B78B4', 1, '#1E4C80');
      for (const [a, b] of [[T1, G1], [T2, G2], [T1, M1], [T2, M2], [G1, P], [G2, P], [M1, P], [M2, P], [G1, G2]]) {
        capsule(t, a[0], a[1], b[0], b[1], 4.5, INK, 0.5);
      }
      capsule(t, T1[0] + 8, T1[1] + 8, T2[0] - 30, T2[1] + 8, 6, '#FFFFFF', 0.7);   // table light
    }, { width: 10 });
    sheen(cv, c - 40, 134, 16, 8, 0.5);
    savePNG(path.join(OUT, 'flawless_first.png'), W, W, down2(cv, W, W));
  }

  { // === flawless_25.png — Unerring: an arrow dead-centre in a wooden target ==
    const { cv, c } = canvas();
    const tx = c - 12, ty = c + 12, R = 132;
    contactShadow(cv, tx + 10, ty + R + 6, 120, 18, 0.32);
    withOutline(cv, t => {
      // the boss has thickness: its rim shows below-right
      ellipse(t, tx + 12, ty + 12, R, R, WOOD.seam, 1, 3);
      roundRect(t, tx, ty, R, R, R, WOOD.light, 1, WOOD.dark);            // wooden face
      ringStroke(t, tx, ty, R - 10, 6, WOOD.seam, 0.5);
      roundRect(t, tx, ty, 94, 94, 94, PARCH.hi, 1, PARCH.shadow);          // painted ring
      roundRect(t, tx, ty, 54, 54, 54, CRIMSON.hi, 1, CRIMSON.lo);          // the centre
      ringStroke(t, tx, ty, 94, 5, INK, 0.5);
      ringStroke(t, tx, ty, 54, 5, INK, 0.6);
      // the arrow, from the upper right into the centre
      const ax = c + 148, ay = 42;                                         // nock
      capsule(t, tx + 6, ty + 8, ax + 4, ay + 8, 16, INK, 0.35);            // cast on the face
      capsule(t, tx, ty, ax, ay, 15, WOOD.mid);
      capsule(t, tx - 3, ty - 3, ax - 3, ay - 3, 6, WOOD.rim, 0.7);
      // fletching: two feather vanes near the nock
      const dx = (ax - tx) / Math.hypot(ax - tx, ay - ty), dy = (ay - ty) / Math.hypot(ax - tx, ay - ty);
      const px = -dy, py = dx;
      const F = (s, o) => [ax - dx * s + px * o, ay - dy * s + py * o];
      poly(t, [F(0, 4), F(58, 4), F(50, 30), F(8, 30)], CRIMSON.base, 1, CRIMSON.lo);
      poly(t, [F(0, -4), F(58, -4), F(50, -30), F(8, -30)], PARCH.hi, 1, PARCH.shadow);
      // the head: buried, only its dark shoulders show at the centre
      tri(t, [tx - 10, ty + 12], [tx + 22, ty + 4], [tx + 14, ty - 22], INK, 1);
      ellipse(t, tx, ty, 9, 9, IRON.hi, 1, 2);
    }, { width: 10 });
    sheen(cv, tx - 80, ty - 84, 24, 14, 0.42);
    savePNG(path.join(OUT, 'flawless_25.png'), W, W, down2(cv, W, W));
  }

  { // === challenge_first.png — a plain round wooden buckler ===================
    const { cv, c } = canvas();
    const cy = c + 4, R = 140;
    contactShadow(cv, c + 8, cy + R + 4, 124, 18, 0.32);
    withOutline(cv, t => {
      roundRect(t, c, cy, R, R, R, IRON.base, 1, IRON.lo);                 // iron rim
      roundRect(t, c, cy, R - 20, R - 20, R - 20, WOOD.light, 1, WOOD.dark); // wooden face
      // three plank seams, vertical, wood-dark
      for (const x of [c - 46, c + 46]) capsule(t, x, cy - R + 34, x, cy + R - 34, 7, WOOD.seam, 0.55);
      capsule(t, c - 96, cy - 62, c + 96, cy - 62, 6, WOOD.seam, 0.35);
      capsule(t, c - 96, cy + 62, c + 96, cy + 62, 6, WOOD.seam, 0.35);
      // a small iron hub rivet, not a boss (the boss is what the iron shield adds)
      ellipse(t, c, cy, 22, 22, INK, 0.92, 3);
      ellipse(t, c, cy - 1, 17, 17, IRON.base, 1, 3);
      ellipse(t, c - 4, cy - 5, 8, 8, IRON.hi, 0.9, 3);
      // four rim rivets
      for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
        ellipse(t, c + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10), 8, 8, IRON.hi, 0.9, 2);
      }
    }, { width: 10 });
    sheen(cv, c - 84, cy - 84, 28, 16, 0.42);
    savePNG(path.join(OUT, 'challenge_first.png'), W, W, down2(cv, W, W));
  }

  { // === challenge_10.png — an iron kite shield with a brass boss =============
    const { cv } = canvas();
    contactShadow(cv, KITE.cx + 8, KITE.cy + KITE.hh + 4, 96, 16, 0.32);
    withOutline(cv, t => kiteShield(t), { width: 10 });
    sheen(cv, KITE.cx - 70, KITE.cy - 82, 22, 14, 0.45);
    savePNG(path.join(OUT, 'challenge_10.png'), W, W, down2(cv, W, W));
  }

  { // === challenge_25.png — Iron Will: the shield with one sword behind =======
    const { cv, c } = canvas();
    contactShadow(cv, KITE.cx + 8, KITE.cy + KITE.hh + 4, 96, 16, 0.32);
    withOutline(cv, t => {
      sword(t, c - 150, c + 152, c + 152, c - 148);
      kiteShield(t);
    }, { width: 10 });
    sheen(cv, KITE.cx - 70, KITE.cy - 82, 22, 14, 0.45);
    savePNG(path.join(OUT, 'challenge_25.png'), W, W, down2(cv, W, W));
  }

  { // === challenge_50.png — Unyielding: two swords behind, a crown above ======
    const { cv, c } = canvas();
    contactShadow(cv, KITE.cx + 8, KITE.cy + KITE.hh + 4, 96, 16, 0.32);
    withOutline(cv, t => {
      sword(t, c - 150, c + 152, c + 152, c - 148);
      sword(t, c + 150, c + 152, c - 152, c - 148);
      kiteShield(t);
      crown(t, c, KITE.cy - KITE.hh + 10);
    }, { width: 10 });
    sheen(cv, KITE.cx - 70, KITE.cy - 82, 22, 14, 0.45);
    savePNG(path.join(OUT, 'challenge_50.png'), W, W, down2(cv, W, W));
  }
}
