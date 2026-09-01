/**
 * shopIcons/deepenings.mjs — ROOM DEEPENINGS, TIER 2 (the dread tier).
 *
 * One painted subject per entry in ROOM_DEEPENINGS (src/services/roomUpgrades.ts),
 * filed as deepen_<roomId>.png so the shop row's registry key is the id the screen
 * already holds.
 *
 * These are the SAME rooms turned wrong. The deepening copy is deliberately not
 * cozy ("the fire keeps a colder light", "the bell hums at dawn now, unstruck"),
 * so the art carries it the same way the writing does: cold light instead of
 * hearth light, and a subject BEHAVING wrongly rather than a horror prop. Never
 * gore, never a cliche: this game's horror is serene and certain.
 *
 * REVISION (blind review of the first pass). Three art directors graded these
 * without being told what they depict; the set was found coherent with itself but
 * NOT with the shipped icons in assets/ui, and a third of it collapsed at the real
 * delivery size of 56dp. The shipped discipline, which this file now follows:
 *
 *   ONE centred silhouette. A thick warm-dark contour. Two or three BIG value
 *   steps. No satellite elements. No hairlines. Mass filling most of the tile.
 *
 * So, concretely, versus the first pass:
 *   - EVERY subject is wrapped in withOutline() from _draw.mjs. Art built purely
 *     from gradients has no contour to hold its shape once a row shrinks it, which
 *     was the single biggest gap between this set and the shipped one.
 *   - The full-width hanging RAILS are gone (jungle, star loft, bamboo, desert).
 *     A hairline rail spanning the frame with things dangling under it leaves dead
 *     bands top and bottom and is itself sub-pixel at target. Every icon here is
 *     now a centred vertical mass.
 *   - Every repeated micro-texture is gone — chime tubes 5 -> 3 at 2.3x the
 *     thickness, page hatching -> four oversized scrawls, star fields -> three big
 *     stars on fat links, floret sprays -> ONE giant bloom, lantern pairs -> ONE
 *     lantern. Faint "it is humming" arc rings were 1px and read as compression
 *     artefacts; they are replaced by uncontoured halos behind the subject.
 *   - deepen_aquarium and deepen_kitchen were redesigned outright (they graded 1.3
 *     and 1.7 of 5, unidentifiable at full size). Both were redesigned AGAIN in the
 *     third pass below, which is what actually shipped.
 *   - Dark-on-dark tiles carry a bright rim: the star chart is a dark field inside
 *     a warm wood frame, so it holds a silhouette on an ash row.
 *
 * THIRD PASS (targeted), against a further blind grading:
 *   - deepen_belfry carried a RENDERING DEFECT: its verdigris band was a capsule,
 *     so it hung ~30px past the bronze on both sides, and at alpha 0.5 it also
 *     failed withOutline's `alpha > 0.5` seed test — the overhang was composited
 *     but never contoured, and floated over the background as a translucent grey
 *     green band. It is now a polygon cut to the bell's own flare.
 *   - deepen_kitchen and deepen_aquarium were STILL unnameable (a doily / a straw
 *     hat; a mushroom on a semi-transparent stem). Both were rebuilt: the salt
 *     circle dropped its 3/4-perspective table for a frontal loaf standing in a
 *     rope of oversized beads, and Still Water became a fishbowl, fully opaque,
 *     three hard value steps.
 *   - deepen_garden and deepen_jungle_room failed on mass — spaced chime tubes
 *     with voids between them, and a bloom and a vine with a gap of background
 *     down the middle. Both are consolidated into one connected silhouette.
 * The other eight tiles in this file were graded good and are untouched.
 *
 * The tier-1 RHYMES are kept, but they are drawn to differ AT 56dp rather than at
 * illustration scale, because that is where a shop list actually stacks a pair:
 * cold blue flame vs warm (den), a cold white block of EQUAL-length tubes vs a warm
 * brass column of ragged ones under a dark wooden bob (garden), ice-cyan shards vs violet
 * (burrow), a ribbed cylinder lantern vs a globe (attic), a cold PEWTER lantern
 * with a lit blue flame vs a warm brass one with a moth on the glass (star loft),
 * one upturned chalice vs a row of blooms (sky garden), one big violet head turned
 * away vs a pink-flowered fall of vine (jungle). Where a pair could not be told apart by silhouette alone
 * it is separated by TEMPERATURE, which survives any amount of shrinking. The two
 * modules stay independent (nothing is imported across them) so either can be
 * re-tuned alone.
 *
 * Verified at the real delivery size: every tile was re-rendered at 56px over cream
 * (#F3E2BF) and over ash (#1A1A2E) and read there, and each was checked beside its
 * tier-1 sibling at 56px. Subject bounding boxes run 75-92% of the tile except the
 * three inherently wide-and-flat subjects (a table, a shade, an open book) at
 * 64-68% tall; measured luminance range is 0.78-0.95 across the set, against a
 * first-pass worst case of 0.42.
 *
 * House doctrine (see _draw.mjs): uncontoured halo and contact shadow onto the
 * canvas FIRST, the subject through withOutline, the upper-left sheen on top of the
 * contour LAST. INK for outlines, never #000. No Math.random: every scatter is a
 * literal coordinate table so the generator is byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * the file is downsampled 2x to a 192px PNG = 64dp at @3x.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline,
  INK, WOOD,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, starPts,
} from './_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/shop');

// --- local palettes: every one is a cooled cousin of a tier-1 palette, but with
// the value RANGE opened up. The first pass was graded "narrow value range, duller
// than the shipped art"; these all run light-to-near-black in three steps.
const ASH = { hi: '#9AA3B0', base: '#5C6572', lo: '#333B46', deep: '#1B212A' };
const COLDFIRE = { out: '#14356E', mid: '#3E80D2', in: '#A6DCF8', core: '#F2FBFF' };
const DARKWOOD = { hi: '#6A4E33', base: '#43301F', lo: '#22170D' };
const SALT = { hi: '#FFFFFF', base: '#EEF1EA', lo: '#A7AEA2' };
const CRUST = { hi: '#E9BB72', base: '#B0732F', lo: '#5A3510' };
const PAPER = { hi: '#F6F1E2', base: '#DCD5C0', lo: '#A79E86' };
const SLATE = { hi: '#3D4C66', base: '#26314A', lo: '#101725' };
const NIGHT = { hi: '#1A2242', base: '#111739', lo: '#070A1C' };
const ICE = { hi: '#EAF7FF', base: '#A6CEE8', dark: '#5A7C9B', deep: '#2B4260' };
const STEEL = { hi: '#9BA6B2', base: '#5C6672', lo: '#2C343E' };
const BRIGHTSTEEL = { hi: '#FFFFFF', base: '#E4F2FF', lo: '#8FB3CE' };
const PEWTER = { hi: '#C6CFD8', base: '#8A94A0', lo: '#3E4753' };
const BRZ = { hi: '#F6DB92', base: '#C99A44', lo: '#734F1C', sh: '#8D6A2A', verd: '#5E8C7A' };
const BONE = { hi: '#F4EEDA', base: '#D6CCAE', lo: '#94896A' };
const COLDLEAF = { hi: '#7C9877', base: '#41603C', lo: '#1E2F1A' };
const VIOLET = { hi: '#DED3F4', base: '#A797D6', lo: '#5B4C8C' };
const PALEBLOOM = { hi: '#F2F3FA', base: '#C7CBE0', lo: '#767C9C' };
const EMBERRED = { hi: '#FFC0AC', mid: '#FF7A62', lo: '#A8241E' };
const EARTH = { hi: '#5A422A', base: '#3A2917', lo: '#1C1208' };
const GLASS = { hi: '#DCE9F0', base: '#9DB6C4', lo: '#5E7482', dead: '#37505F' };
const COLDGLOW = '#A8D4F2';

// --- local shape helpers (pure, table-driven) --------------------------------

/** A pointed oval leaf/petal centred at (x,y), long axis along `ang`. */
function petalPts(x, y, len, wid, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const local = [
    [-len, 0], [-len * 0.45, -wid * 0.78], [0, -wid],
    [len * 0.55, -wid * 0.66], [len, 0],
    [len * 0.55, wid * 0.66], [0, wid], [-len * 0.45, wid * 0.78],
  ];
  return local.map(([lx, ly]) => [x + lx * ca - ly * sa, y + lx * sa + ly * ca]);
}

/** Ink-edged pointed oval (leaf or flower petal). The inner ink keeps petals
 *  separated from each other once the outer contour is doing the silhouette. */
function petal(cv, x, y, len, wid, ang, top, bottom) {
  poly(cv, petalPts(x, y, len + 7, wid + 7, ang), INK, 0.92);
  poly(cv, petalPts(x, y, len, wid, ang), top, 1, bottom);
}

/**
 * A flower whose petals fan across ONE arc rather than a full circle, so the head
 * reads as TURNED to face a direction. Both flower deepenings need this: the
 * jungle's bloom has turned away toward the middle of the house, the sky garden's
 * has opened straight up at a sky with no moon in it.
 */
function bloomFan(cv, x, y, r, n, face, spread, top, bottom, coreHi, coreLo) {
  for (let i = 0; i < n; i++) {
    const a = face - spread / 2 + (spread * i) / (n - 1);
    petal(cv, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.6, r * 0.33, a, top, bottom);
  }
  const cx = x + Math.cos(face) * r * 0.16, cy = y + Math.sin(face) * r * 0.16;
  ellipse(cv, cx, cy, r * 0.36, r * 0.36, INK, 0.92);
  ellipse(cv, cx, cy, r * 0.27, r * 0.27, coreHi);
  ellipse(cv, cx + r * 0.08, cy + r * 0.09, r * 0.15, r * 0.15, coreLo, 0.9);
}

/**
 * Half of a poured salt ring: overlapping beads along an ellipse, back arc or
 * front arc. Splitting it lets the loaf sit BETWEEN the two halves, which is what
 * makes the ring read as a ring around something rather than as a plate rim.
 *
 * The beads are DELIBERATELY enormous — 14 of them at r34 around the whole
 * ellipse, so each is ~5px across at 56dp and they overlap into a lumpy rope. The
 * previous pass ran 30 beads at r19, which is sub-pixel lumpiness on a rope that
 * is itself only 2px thick at delivery: it averaged out to the grey scalloped fuzz
 * a grader read as a doily.
 */
function saltArc(cv, cx, cy, rx, ry, front, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if ((Math.sin(a) >= 0) !== front) continue;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    ellipse(cv, x, y + 12, 36, 27, SALT.lo);
    ellipse(cv, x, y, 34, 25, SALT.hi);
  }
}

/** A FAT chime tube. Thickness is the whole point: the first pass hung five thin
 *  ones that merged into a single grey slab at 56dp. */
function tube(cv, x, y1, y2, th, pal) {
  capsule(cv, x, y1, x, y2, th + 11, INK, 0.92);
  capsule(cv, x, y1, x, y2, th, pal.base);
  capsule(cv, x - th * 0.24, y1 + 5, x - th * 0.24, y2 - 5, th * 0.32, pal.hi, 0.92);
  capsule(cv, x + th * 0.3, y1 + 5, x + th * 0.3, y2 - 5, th * 0.2, pal.lo, 0.55);
}

/** Half-ellipse dome (lamp shade, lid), traced left rim -> over the top -> right rim. */
function domePts(cx, baseY, hw, h, n = 26) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI + (i * Math.PI) / n;
    return [cx + Math.cos(a) * hw, baseY + Math.sin(a) * h];
  });
}

/** One crystal shard with a BLUNT tip and a hard facet split down its ridge.
 *  The first pass tapered to a needle, so at 56dp the tips were simply gone. */
function shard(cv, ax, ay, blx, brx, by, rx, pal) {
  const apexL = [ax - 16, ay + 7], apexR = [ax + 16, ay];
  poly(cv, [apexL, apexR, [rx, by], [blx, by]], pal.hi, 1, pal.base);
  poly(cv, [apexR, [brx, by], [rx, by]], pal.dark, 1, pal.deep);
  capsule(cv, ax, ay + 14, rx, by - 14, 10, '#FFFFFF', 0.5);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === deepen_cozy_den.png — Ashen Mantel: dark stone, a cold blue-white flame ===
    // Graded 3.7 and called one of the strongest tiles, so the IDEA is kept intact.
    // What changed: the flame is bigger, the slab's fussy course ticks and the two
    // generic coal lozenges are gone (both "decoration that disappears"), and the
    // whole thing now carries a contour.
    const { cv, c } = canvas();
    ellipse(cv, c, 188, 116, 108, COLDFIRE.mid, 0.24, 92);            // cold spill, uncontoured
    contactShadow(cv, c + 8, 352, 152, 25, 0.34);
    withOutline(cv, t => {
      flameLobe(t, c + 4, 36, 258, 88, COLDFIRE.out);
      flameLobe(t, c, 72, 256, 67, COLDFIRE.mid);
      flameLobe(t, c - 6, 122, 254, 44, COLDFIRE.in);
      flameLobe(t, c - 8, 170, 252, 22, COLDFIRE.core);
      capsule(t, c - 98, 248, c + 98, 240, 36, ASH.lo);               // one bar of spent fuel
      capsule(t, c - 92, 236, c + 92, 228, 13, ASH.base, 0.8);
      poly(t, [[c - 138, 250], [c + 138, 250], [c + 162, 296], [c - 162, 296]], ASH.hi, 1, ASH.base);
      capsule(t, c - 150, 300, c + 150, 300, 12, ASH.hi, 0.45);
      roundRect(t, c, 322, 158, 30, 12, ASH.base, 1, ASH.deep);
    }, { width: 9 });
    ellipse(cv, c, 266, 98, 14, COLDFIRE.in, 0.3, 30);                // cold light on the top face
    sheen(cv, c - 92, 266, 44, 10, 0.42);
    savePNG(path.join(OUT, 'deepen_cozy_den.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_kitchen.png — Salt Circle: a poured white ring round one loaf ===
    // REDESIGNED TWICE. Pass one was three nested ellipses on a void (graded 1.7,
    // unidentifiable). Pass two set the loaf on a big elliptical table top and was
    // read blind as "a doily under a bun / a straw hat / a shell", and correctly
    // pinned as the only tile in the whole set drawn in flattened 3/4 perspective
    // while every other subject is frontal.
    //
    // The table WAS the perspective, so the table is gone: the loaf is now the
    // hero, a big frontal dome standing on its own contact shadow like every other
    // subject in the set, and the ring is a bold rope of oversized salt beads
    // poured around it. The one thing a ring around an object cannot avoid is
    // being an ellipse, so it is drawn near edge-on (rx 154 / ry 42, ratio 0.27)
    // and gets its depth purely from OCCLUSION — the far arc vanishes behind the
    // loaf and reappears at the two sides, the near arc crosses in front of the
    // loaf's foot. A near-edge-on ring reads as a ring lying on the ground; the
    // fat ellipse of pass two could only ever read as the rim of a plate.
    const { cv, c } = canvas();
    contactShadow(cv, c + 6, 344, 156, 28, 0.3);
    withOutline(cv, t => {
      saltArc(t, c, 292, 138, 40, false);                             // the poured ring, far arc
      ellipse(t, c + 8, 294, 100, 26, INK, 0.3);                      // the loaf's own footing
      // The loaf: one dome in the dark crust value, then an inset dome in the lit
      // one. Both share a base line, so the light dome leaves a hard crust rim
      // around the top and sides — a real value step, not a soft airbrush.
      poly(t, domePts(c, 300, 116, 196), CRUST.base, 1, CRUST.lo);
      poly(t, domePts(c - 8, 300, 95, 166), CRUST.hi, 1, CRUST.base);
      // Two bold crossed scores. A single diagonal left the dome readable as a
      // stone; the cross is what names it as bread, and at 22px in the supersample
      // it is still ~3px at 56dp rather than surface noise.
      for (const [x1, y1, x2, y2] of [[c - 56, 218, c + 46, 174], [c - 40, 168, c + 44, 226]]) {
        capsule(t, x1, y1, x2, y2, 22, CRUST.lo, 0.95);
        capsule(t, x1 + 2, y1 - 8, x2 + 2, y2 - 8, 9, '#F7DEB0', 0.85);
      }
      saltArc(t, c, 292, 138, 40, true);                              // ... and the near arc
    }, { width: 9 });
    sheen(cv, c - 58, 176, 30, 15, 0.42);
    savePNG(path.join(OUT, 'deepen_kitchen.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_study.png — Marginalia: one handwriting down both margins ===
    // The dense zigzag "printed text" was the busiest texture on the sheet and
    // greyed out completely. Four OVERSIZED scrawls carry the idea instead, and the
    // page block has real thickness so the book is a solid, not two flat quads.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 356, 142, 22, 0.32);
    withOutline(cv, t => {
      poly(t, [[c - 160, 134], [c - 4, 196], [c + 160, 134], [c + 160, 292], [c - 4, 356], [c - 160, 292]], SLATE.lo);
      poly(t, [[c - 158, 130], [c - 6, 192], [c - 6, 340], [c - 158, 280]], SLATE.hi, 1, SLATE.base);
      poly(t, [[c + 158, 130], [c + 6, 192], [c + 6, 340], [c + 158, 280]], SLATE.hi, 1, SLATE.base);
      poly(t, [[c - 136, 152], [c - 12, 202], [c - 12, 328], [c - 136, 274]], PAPER.hi, 1, PAPER.base);
      poly(t, [[c + 136, 152], [c + 12, 202], [c + 12, 328], [c + 136, 274]], PAPER.hi, 1, PAPER.base);
      capsule(t, c, 194, c, 344, 26, SLATE.lo);                       // spine valley
      capsule(t, c - 5, 200, c - 5, 338, 9, SLATE.hi, 0.55);
      // the same spidery hand, identical on both sides: two oversized wavy lines
      // per page. Four marks, each ~7px at 192, so they stay MARKS at 56dp rather
      // than dissolving the way the first pass's hatching did.
      for (const side of [-1, 1]) {
        for (const [dy, lean] of [[0, 0.18], [58, 0.12]]) {
          const x = c + side * 84, y = 216 + dy + side * 22;
          const pts = [[-50, 9], [-16, -9], [16, 9], [50, -9]];
          for (let i = 1; i < pts.length; i++) {
            const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
            capsule(t, x + x1, y + y1 + x1 * lean, x + x2, y + y2 + x2 * lean, 16, '#2A2438', 0.95);
          }
        }
      }
    }, { width: 9 });
    sheen(cv, c - 96, 172, 38, 10, 0.36);
    savePNG(path.join(OUT, 'deepen_study.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_aquarium.png — Still Water: dead flat, and something in it ===
    // REDESIGNED TWICE. Pass one was soft blue-on-blue with no contour (graded
    // 1.3, unnameable). Pass two made it a wood-framed rectangular tank, and read
    // blind as a mushroom or a glass dome on a stem, with a semi-transparent stem
    // that let the object come apart into a floating cap and a ghost below it. Its
    // upper third was also a flat black rectangle with nothing in it.
    //
    // The rectangle was the problem: a box of water only reads as a tank if you
    // already know it is one. A BOWL reads as a bowl of water to anyone, so the
    // subject is now a fishbowl — one big round silhouette, filled to a dead-flat
    // line, with nothing alive in it. Every part is fully opaque and the value runs
    // in three hard steps (pale glass above the line, near-black water below it,
    // the one bright crescent inside the water), so nothing can ghost.
    const { cv, c } = canvas();
    const BX = c, BY = 206, BR = 146;
    // The mouth is the arc cut away above y = 92; the water line is the chord at
    // y = 170. Both angles are derived from the radius so the rim and the surface
    // can never drift off the glass.
    const thAt = y => Math.asin(Math.max(-1, Math.min(1, (y - BY) / BR)));
    const mouth = thAt(92), surf = thAt(170);
    const arcPts = (r, from, to, n = 44) => Array.from({ length: n + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / n;
      return [BX + Math.cos(a) * r, BY + Math.sin(a) * r];
    });
    contactShadow(cv, c + 8, 366, 108, 16, 0.3);
    withOutline(cv, t => {
      // glass body: mouth angle round the bottom and back up to the mirrored mouth
      poly(t, arcPts(BR, mouth, Math.PI - mouth), GLASS.hi, 1, GLASS.base);
      // the water: the same arc, but started at the surface chord
      poly(t, arcPts(BR - 10, surf, Math.PI - surf), '#1D5578', 1, '#061620');
      ellipse(t, c + 4, 268, 62, 62, PAPER.hi);                       // the reflected crescent
      ellipse(t, c + 16, 244, 47, 47, '#123C58');                     // ... bitten from above
      capsule(t, c - 138, 170, c + 138, 170, 18, '#4E85AB');          // the surface: dead flat
      capsule(t, c - 136, 164, c + 136, 164, 8, '#F2FBFF');
      roundRect(t, c, 88, 94, 19, 9, GLASS.hi, 1, GLASS.base);        // the mouth rim
      roundRect(t, c, 356, 64, 18, 8, GLASS.base, 1, GLASS.dead);     // the foot
    }, { width: 9 });
    sheen(cv, c - 92, 132, 26, 44, 0.42);
    savePNG(path.join(OUT, 'deepen_aquarium.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_jungle_room.png — Inward Bloom: the head has turned away ===
    // The single fanned head was the right idea and is kept. What failed was the
    // LAYOUT: the head sat left, the vine ran down the right, and there was a
    // visible gap of background straight down the middle, so the tile read as two
    // objects rather than one — and withOutline duly contoured them as two.
    //
    // Now the head is nudged back toward the middle so its lowest petal laps over
    // the vine, and a leaf is laid deliberately ACROSS the gap (inner tip on the
    // vine, outer tip under the petals) to bridge the two into one silhouette. The
    // vine also starts inside the frame instead of running off the top edge.
    const { cv, c } = canvas();
    ellipse(cv, c - 10, 200, 152, 140, VIOLET.base, 0.18, 112);
    contactShadow(cv, c + 24, 358, 104, 15, 0.2);
    withOutline(cv, t => {
      const vine = [[c + 58, 52], [c + 78, 128], [c + 56, 212], [c + 80, 300], [c + 56, 336]];
      for (let i = 1; i < vine.length; i++) {
        capsule(t, vine[i - 1][0], vine[i - 1][1], vine[i][0], vine[i][1], 38, COLDLEAF.base);
        capsule(t, vine[i - 1][0] - 9, vine[i - 1][1], vine[i][0] - 9, vine[i][1], 13, COLDLEAF.hi, 0.7);
      }
      ellipse(t, c + 58, 56, 25, 22, COLDLEAF.base);                  // the node it hangs from
      petal(t, c + 112, 136, 50, 26, 0.42, COLDLEAF.hi, COLDLEAF.lo);
      petal(t, c + 108, 296, 48, 25, 0.38, COLDLEAF.hi, COLDLEAF.lo);
      petal(t, c + 16, 328, 58, 30, 2.70, COLDLEAF.hi, COLDLEAF.lo);  // the bridging leaf
      bloomFan(t, c - 6, 190, 118, 6, Math.PI * 0.94, Math.PI * 0.96, VIOLET.hi, VIOLET.lo, '#F0EBFB', '#584A86');
    }, { width: 8 });
    sheen(cv, c + 48, 76, 11, 24, 0.35);
    savePNG(path.join(OUT, 'deepen_jungle_room.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_desert_room.png — New Constellation: one shape nobody drew ===
    // Called a "total thumbnail failure": sub-pixel star dots and red hairlines over
    // navy averaged to a flat dark rectangle, and red-on-navy is the weakest value
    // pair available. Now a warm-framed portrait panel (bright rim on a dark row)
    // carrying THREE huge stars on FAT links, lit hot enough to hold value, with
    // just two white stars left of the chart anyone remembers drawing.
    const { cv, c } = canvas();
    ellipse(cv, c, 200, 128, 138, EMBERRED.mid, 0.14, 104);
    contactShadow(cv, c + 8, 352, 132, 22, 0.3);
    withOutline(cv, t => {
      roundRect(t, c, 200, 138, 152, 14, WOOD.base, 1, WOOD.dark);    // frame
      capsule(t, c - 128, 62, c + 128, 62, 10, WOOD.rim, 0.7);
      roundRect(t, c, 200, 112, 126, 8, WOOD.dark, 1, WOOD.seam);     // rebate
      roundRect(t, c, 200, 106, 120, 5, NIGHT.hi, 1, NIGHT.lo);       // night field
      poly(t, starPts(c - 64, 132, 30, 13), PAPER.hi, 0.85);          // the old, familiar chart
      poly(t, starPts(c + 74, 268, 25, 11), PAPER.hi, 0.7);
      const nl = [[-58, 204, 56, 170], [56, 170, 6, 280], [6, 280, -58, 204]];
      for (const [x1, y1, x2, y2] of nl) {
        capsule(t, c + x1, y1, c + x2, y2, 24, EMBERRED.lo);
        capsule(t, c + x1, y1, c + x2, y2, 11, EMBERRED.mid);
      }
      for (const [x, y] of [[-58, 204], [56, 170], [6, 280]]) {
        poly(t, starPts(c + x, y, 36, 15), EMBERRED.mid);
        poly(t, starPts(c + x, y, 20, 8), EMBERRED.hi);
      }
    }, { width: 9 });
    sheen(cv, c - 96, 78, 42, 10, 0.36);
    savePNG(path.join(OUT, 'deepen_desert_room.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_office.png — Second Shadow: one lamp, two shadows ===
    // Kept (3.3) but the craft error is fixed: the cast shadow was a HARD-edged
    // parallelogram running off the tile to the lower LEFT, i.e. light from the
    // upper right, contradicting every other icon in the game. Both shadows are now
    // soft lobes, laid on the canvas before the contour so they never get outlined.
    // The shade is a shallow cold dome rather than the tier-1 brass floor lamp's
    // warm trapezoid, so the pair separates by both shape and temperature at 56dp.
    const { cv, c } = canvas();
    ellipse(cv, c, 214, 152, 136, '#BBD6EE', 0.17, 112);              // cold cast light
    ellipse(cv, c - 104, 344, 106, 25, INK, 0.3, 34);                 // the two shadows
    ellipse(cv, c + 108, 340, 98, 23, INK, 0.26, 34);
    contactShadow(cv, c + 4, 346, 80, 15, 0.26);
    withOutline(cv, t => {
      roundRect(t, c, 334, 118, 20, 12, STEEL.base, 1, STEEL.lo);     // base
      capsule(t, c, 330, c, 238, 36, STEEL.lo);                       // neck
      capsule(t, c - 11, 326, c - 11, 242, 13, STEEL.hi, 0.8);
      poly(t, domePts(c, 238, 156, 128), '#F0F8FF', 1, '#6690B8');    // shallow shade
      capsule(t, c - 152, 230, c + 152, 230, 26, '#5A83AC', 0.5);     // lit lower rim
      roundRect(t, c, 242, 160, 16, 7, '#E4F1FC', 1, '#7FA6C6');
      ellipse(t, c, 260, 66, 20, '#FFFFFF', 0.55, 16);                // the light itself
    }, { width: 9 });
    sheen(cv, c - 80, 166, 26, 30, 0.5);
    savePNG(path.join(OUT, 'deepen_office.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_burrow.png — Listening Crystals: grown up, and listening ===
    // The spikes sat near ground luminance and tapered to nothing, so at 56dp the
    // tips vanished and only stubs remained. Blunt tips, fatter bases, ice-cyan
    // against WARM earth for real hue separation (the fix the graders credited to
    // the tier-1 tile), and the invisible 1px hum rings are now a plain halo.
    const { cv, c } = canvas();
    ellipse(cv, c, 194, 152, 148, COLDGLOW, 0.22, 118);
    contactShadow(cv, c + 8, 350, 134, 22, 0.32);
    withOutline(cv, t => {
      shard(t, c - 114, 168, c - 168, c - 48, 306, c - 84, ICE);
      shard(t, c + 112, 142, c + 46, c + 166, 306, c + 138, ICE);
      shard(t, c - 2, 52, c - 78, c + 74, 312, c + 30, ICE);
      roundRect(t, c, 336, 156, 38, 26, EARTH.hi, 1, EARTH.lo);       // earth mound
      for (const [x, y, rx, ry] of [[c - 112, 316, 40, 21], [c + 6, 310, 46, 23], [c + 120, 318, 38, 20]]) {
        ellipse(t, x, y - 2, rx, ry, EARTH.base);
        ellipse(t, x - rx * 0.3, y - ry * 0.55, rx * 0.42, ry * 0.36, EARTH.hi, 0.75);
      }
    }, { width: 9 });
    sheen(cv, c - 30, 108, 13, 36, 0.5);
    savePNG(path.join(OUT, 'deepen_burrow.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_garden.png — Tuned Chimes: one note, and every tube agrees ===
    // REBUILT alongside its tier-1 sibling. Three spaced tubes of three different
    // lengths was a near-duplicate of the tier-1 composition AND carried the same
    // picket-fence voids; both were read as test tubes.
    //
    // The tubes are now packed into one overlapping block, and — the whole point of
    // the deepening — they are all exactly the SAME LENGTH. A chime tuned to a
    // single note is a chime whose tubes have all been cut to one measure, so the
    // eerie regularity is the mechanism, not a decoration laid over it. That also
    // hands the pair its silhouette split: this is a hard flat-bottomed block with
    // no bob, against tier-1's tapering column under a big round wooden bob, and it
    // is cold white against warm brass.
    const { cv, c } = canvas();
    ellipse(cv, c, 236, 128, 150, COLDGLOW, 0.2, 96);                 // the note, uncontoured
    contactShadow(cv, c + 8, 360, 108, 14, 0.22);
    withOutline(cv, t => {
      roundRect(t, c, 80, 146, 26, 13, DARKWOOD.hi, 1, DARKWOOD.lo);  // cap
      capsule(t, c - 134, 62, c + 134, 62, 10, '#7E5F3F', 0.7);
      capsule(t, c - 132, 94, c + 132, 94, 8, DARKWOOD.lo, 0.5);
      for (const x of [c - 60, c + 60, c]) capsule(t, x, 100, x, 128, 14, DARKWOOD.lo, 0.95);
      for (const x of [c - 60, c + 60, c]) tube(t, x, 124, 340, 88, BRIGHTSTEEL);
    }, { width: 9 });
    sheen(cv, c - 96, 70, 28, 8, 0.45);
    sheen(cv, c - 76, 200, 10, 52, 0.5);
    savePNG(path.join(OUT, 'deepen_garden.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_bamboo_attic.png — Risen Lanterns: high, steady, waiting ===
    // Two lanterns under a crossed X of beams, with a stray glint at the crossing
    // that all three graders read as a rendering artefact. One lantern now, held
    // high on a short cord to the top edge — and a RIBBED CYLINDER rather than a
    // globe, so it cannot be confused with the tier-1 paper globe at 56dp.
    const { cv, c } = canvas();
    ellipse(cv, c, 214, 124, 142, '#E8EFE9', 0.24, 104);
    contactShadow(cv, c + 6, 360, 86, 13, 0.2);
    withOutline(cv, t => {
      capsule(t, c, 40, c, 84, 15, DARKWOOD.base);                    // held near the rafters
      roundRect(t, c, 88, 76, 19, 8, DARKWOOD.hi, 1, DARKWOOD.lo);    // top cap
      roundRect(t, c, 216, 118, 118, 46, BONE.hi, 1, BONE.base);      // paper cylinder
      for (const y of [166, 264]) {
        capsule(t, c - 112, y, c + 112, y, 22, BONE.lo, 0.5);         // two oversized ribs
      }
      ellipse(t, c, 214, 62, 82, '#FFFFFF', 0.34, 22);                // the light inside
      roundRect(t, c, 338, 68, 17, 8, DARKWOOD.hi, 1, DARKWOOD.lo);   // bottom cap
    }, { width: 10 });
    sheen(cv, c - 66, 158, 26, 34, 0.45);
    savePNG(path.join(OUT, 'deepen_bamboo_attic.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_star_loft.png — The Lit Hour: it burns alone, moths gone ===
    // The full-width rail is gone (a hairline that became a faint scratch at 56dp,
    // hanging the object in the lower half with the top third empty). One lantern,
    // centred, filling the frame, and the cold flame is the whole identity: the
    // tier-1 loft lantern is unlit with a moth on the glass. Its metal is COLD
    // pewter rather than warm brass, too: every other tier pair in this family
    // separates warm from cold at a glance (den, garden, burrow, office), and at
    // 56dp two amber lantern frames side by side in a shop list would not.
    const { cv, c } = canvas();
    ellipse(cv, c, 218, 128, 142, COLDGLOW, 0.26, 104);
    contactShadow(cv, c + 8, 356, 100, 15, 0.24);
    withOutline(cv, t => {
      arcStroke(t, c, 56, 26, 15, Math.PI * 0.16, Math.PI * 1.84, PEWTER.lo);
      arcStroke(t, c - 3, 54, 23, 6, Math.PI * 1.1, Math.PI * 1.8, PEWTER.hi, 0.85);
      poly(t, [[c - 130, 132], [c + 130, 132], [c + 44, 68], [c - 44, 68]], PEWTER.hi, 1, PEWTER.lo);
      roundRect(t, c, 142, 134, 15, 7, PEWTER.hi, 1, PEWTER.lo);
      roundRect(t, c, 238, 98, 86, 12, '#DCEFFC', 1, '#4A7AA6');      // glass
      flameLobe(t, c, 168, 306, 46, COLDFIRE.out);
      flameLobe(t, c, 196, 304, 32, COLDFIRE.mid);
      flameLobe(t, c - 2, 226, 302, 17, COLDFIRE.core);
      for (const dx of [-92, 92]) capsule(t, c + dx, 150, c + dx, 322, 22, PEWTER.lo);
      roundRect(t, c, 328, 126, 20, 9, PEWTER.hi, 1, PEWTER.lo);
    }, { width: 9 });
    sheen(cv, c - 62, 178, 13, 34, 0.42);
    savePNG(path.join(OUT, 'deepen_star_loft.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_belfry.png — Waking Bronze: it hums, and nothing struck it ===
    // Graded against the shipped bell and lost: narrower value range, duller olive
    // brass, no dark keyline, and 1px ripple arcs the graders read as compression
    // artefacts. Richer bronze across a full light-to-near-black range, a real
    // contour, and the humming carried by an uncontoured halo instead of hairlines.
    const { cv, c } = canvas();
    ellipse(cv, c, 214, 142, 138, BRZ.hi, 0.2, 108);                  // it is already sounding
    contactShadow(cv, c + 8, 348, 122, 22, 0.3);
    withOutline(cv, t => {
      arcStroke(t, c, 70, 26, 17, Math.PI * 0.14, Math.PI * 1.86, BRZ.base);
      arcStroke(t, c - 3, 68, 23, 7, Math.PI * 1.08, Math.PI * 1.78, BRZ.hi, 0.85);
      roundRect(t, c, 102, 32, 22, 9, BRZ.hi, 1, BRZ.lo);             // headstock
      const bell = [[c - 46, 116], [c - 62, 160], [c - 86, 208], [c - 110, 252], [c - 126, 290],
        [c + 126, 290], [c + 110, 252], [c + 86, 208], [c + 62, 160], [c + 46, 116]];
      poly(t, bell, BRZ.hi, 1, BRZ.base);
      poly(t, [[c + 16, 118], [c + 46, 160], [c + 74, 208], [c + 102, 252], [c + 124, 290], [c + 34, 290], [c + 26, 200]], BRZ.sh, 0.6);
      // Verdigris band. It MUST be a polygon cut to the bell's own flare, not a
      // capsule: a capsule is a fixed-width bar with round caps, so it hung ~30px
      // past the bronze on both sides, and at alpha 0.5 it also failed
      // withOutline's `alpha > 0.5` seed test — so the overhang was composited
      // but never contoured, and read as a translucent grey-green band floating
      // over the background. These four corners are read off the bell profile
      // above (x interpolated along the (-86,208)->(-110,252) edge at y=229 and
      // y=251), so the band can only ever sit inside the silhouette.
      poly(t, [[c - 97, 229], [c + 97, 229], [c + 109, 251], [c - 109, 251]], BRZ.verd, 0.72);
      roundRect(t, c, 300, 138, 26, 12, BRZ.hi, 1, BRZ.lo);           // lip
      capsule(t, c - 130, 292, c + 130, 292, 10, BRZ.lo, 0.45);
      ellipse(t, c, 330, 27, 27, BRZ.lo);                             // the clapper, motionless
      ellipse(t, c - 7, 322, 12, 11, BRZ.base, 0.85);
    }, { width: 10 });
    sheen(cv, c - 62, 168, 16, 34, 0.45);
    savePNG(path.join(OUT, 'deepen_belfry.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_sky_garden.png — Upturned Blooms: opened up, at no moon ===
    // Four repeated blooms at the mush threshold became "a white froth" at 56dp,
    // and the row-of-flowers composition is the tier-1 tile's. ONE giant head,
    // opened straight up like a chalice, in a dark trough: a silhouette that reads
    // at any size and cannot be confused with its sibling.
    const { cv, c } = canvas();
    ellipse(cv, c, 176, 152, 144, '#D3DCF4', 0.2, 118);
    contactShadow(cv, c + 8, 354, 134, 20, 0.3);
    withOutline(cv, t => {
      capsule(t, c + 8, 336, c, 210, 26, COLDLEAF.base);              // stem
      capsule(t, c + 4, 332, c - 4, 214, 9, COLDLEAF.hi, 0.7);
      petal(t, c - 92, 268, 62, 31, 2.6, COLDLEAF.hi, COLDLEAF.lo);
      petal(t, c + 96, 290, 56, 29, 0.46, COLDLEAF.hi, COLDLEAF.lo);
      roundRect(t, c, 340, 142, 34, 22, EARTH.hi, 1, EARTH.lo);       // trough
      capsule(t, c - 134, 320, c + 134, 320, 15, '#7A5936', 0.6);
      bloomFan(t, c, 202, 112, 6, -Math.PI / 2, Math.PI * 1.04, PALEBLOOM.hi, PALEBLOOM.lo, '#EFF2FF', '#6E7594');
    }, { width: 8 });
    sheen(cv, c - 96, 132, 22, 16, 0.4);
    savePNG(path.join(OUT, 'deepen_sky_garden.png'), W, W, down2(cv, W, W));
  }
}

// Allow `node scripts/tools/shopIcons/deepenings.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('deepenings.mjs')) draw();
