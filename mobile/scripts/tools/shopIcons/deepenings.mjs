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
 * FOURTH PASS (edge collisions + two contour leaks), against measured numbers
 * rather than impressions. Every icon's border rows and columns were sampled for
 * non-zero alpha, and three tiles in this file were running off the canvas:
 * deepen_burrow (138px of the soil bed along the bottom row), deepen_aquarium
 * (62px, the bowl's foot) and deepen_kitchen (33px, the salt berm's near arc). An
 * icon whose art reaches its own edge loses BOTH its contour and its contact gap
 * there, so in a shop row it reads as sheared, or as sitting one step lower than
 * the tiles beside it. All three subjects were lifted and trimmed (never merely
 * scaled down: each still fills 70-85% of the box) so at least 4px of clear alpha
 * remains on all four sides. deepen_study's marginalia is now plotted in the
 * PAGE's own sheared coordinates instead of a screen-space grid, so it cannot run
 * off the cream onto the cover; deepen_office's lamp was redrawn against the
 * correctly-built one in upgrades.mjs and its halo was recoloured to a stop that
 * LIGHTENS cream; deepen_bamboo_attic was given the interior it lacked.
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
const BRIGHTSTEEL = { hi: '#FFFFFF', base: '#DCEAF6', lo: '#5E82A0' };
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
function saltBerm(cv, cx, cy, rx, ry, front, n = 72) {
  // Thickness breathes on a fixed 9-lobe sine, so the ridge heaps and thins the
  // way a poured line does. The earlier draft roughened it with discrete grains
  // instead, and discrete white circles are a string of pearls (or wool) long
  // before they are salt.
  const band = (dy, th, color, alpha = 1) => {
    for (let i = 0; i < n; i++) {
      const am = ((i + 0.5) / n) * Math.PI * 2;
      if ((Math.sin(am) >= 0) !== front) continue;
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const k = 1 + 0.26 * Math.sin(am * 9 + 0.6);
      capsule(cv, cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry + dy,
        cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry + dy, th * k, color, alpha);
    }
  };
  band(8, 36, SALT.lo);        // the berm's shaded foot
  band(-1, 27, SALT.base);     // its body
  band(-10, 14, SALT.hi);      // the lit crest
}

/** A tapered lens, fat in the middle: a knife cut in a crust, not a laid twig. */
function scorePts(x1, y1, x2, y2, w, n = 16) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, up = [], dn = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, hw = w * Math.sin(Math.PI * t);
    const px = x1 + dx * t, py = y1 + dy * t;
    up.push([px + nx * hw, py + ny * hw]);
    dn.push([px - nx * hw, py - ny * hw]);
  }
  return up.concat(dn.reverse());
}

/** A FAT chime tube, FLAT-ENDED. Thickness is the whole point (the first pass
 *  hung five thin ones that merged into a single grey slab at 56dp), and so are
 *  the ends: built from round-capped capsules the same tube is a lozenge, and a
 *  pale lozenge with a dark spot at the bottom is a test tube, which is exactly
 *  what a blind review called the previous chime. A cylinder is shaded ACROSS,
 *  not along, so the light and dark faces are vertical strips rather than the
 *  kit's usual top-to-bottom gradient. */
function tube(cv, x, y1, y2, th, pal) {
  const cy = (y1 + y2) / 2, hh = (y2 - y1) / 2, hw = th / 2, rad = th * 0.2;
  roundRect(cv, x, cy, hw + 6, hh + 6, rad + 6, INK, 0.92);
  roundRect(cv, x, cy, hw, hh, rad, pal.base);
  roundRect(cv, x - hw * 0.36, cy, hw * 0.3, hh - 6, hw * 0.28, pal.hi, 0.95);
  roundRect(cv, x + hw * 0.52, cy, hw * 0.26, hh - 6, hw * 0.24, pal.lo, 0.7);
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

  { // === deepen_kitchen.png — Salt Circle: a poured ring round one loaf ===
    // REDESIGNED THREE TIMES, and the third is a fix for two SEPARATE ambiguities
    // a blind review found compounding each other: "a brown egg-shaped stone with
    // a carved X resting on white wool". Both are addressed head on.
    //
    //   The loaf was an EGG. It is now a boule: 252 wide by 150 tall, so it is
    //   plainly wider than it is high, and the two scores are tapered LENS cuts
    //   (fat in the middle, closed at both ends) with their pale crumb lit on the
    //   LOWER-RIGHT wall. The old scores were even-width capsules highlighted
    //   along their top, which is how a raised twig is lit, not how an incision is.
    //
    //   The salt was WOOL. It was a chain of 34px beads, and big soft white
    //   circles are wool or cloud before they are ever salt. It is now a poured
    //   BERM: one continuous low ridge with a shaded foot, a body and a lit crest,
    //   roughened by six grains a third of the old size. Poured salt is a line
    //   with a ridge, not a necklace.
    //
    // The ring still gets its depth purely from OCCLUSION — the far arc passes
    // behind the loaf, the near arc crosses in front of its foot — and it is drawn
    // near edge-on (rx 146 / ry 48) so it reads as lying on the floor.
    const { cv, c } = canvas();
    // FOURTH PASS: the NEAR arc's shaded foot band sat 8px below the ellipse and
    // carried an 18px half-thickness, which put it on the bottom row of the canvas
    // (33px of it) with the contour clipped off. The whole ring is lifted 16px and
    // laid flatter still (ry 48 -> 42), which also seats it more convincingly on
    // the floor; the loaf moves with it so the occlusion reads exactly as before.
    contactShadow(cv, c + 6, 334, 158, 24, 0.3);
    withOutline(cv, t => {
      saltBerm(t, c, 284, 146, 42, false);                            // far arc
      ellipse(t, c + 8, 280, 104, 24, INK, 0.28);                     // the loaf's footing
      // The loaf: the dark crust value first, then an inset dome in the lit one.
      // Both share a base line, so the light dome leaves a hard crust rim around
      // the top and sides — a real value step, not a soft airbrush.
      poly(t, domePts(c, 284, 126, 150), CRUST.base, 1, CRUST.lo);
      poly(t, domePts(c - 6, 284, 106, 126), CRUST.hi, 1, CRUST.base);
      for (const [x1, y1, x2, y2] of [[c - 74, 230, c + 52, 184], [c - 46, 178, c + 60, 242]]) {
        poly(t, scorePts(x1, y1, x2, y2, 17), CRUST.lo);              // the cut
        poly(t, scorePts(x1 + 5, y1 + 8, x2 + 5, y2 + 8, 8), '#F7DFB2', 0.9); // lit crumb
      }
      ellipse(t, c - 34, 198, 46, 20, '#F3D9A6', 0.35, 22);           // a dusting of flour
      saltBerm(t, c, 284, 146, 42, true);                             // ... and the near arc
    }, { width: 9 });
    sheen(cv, c - 62, 190, 28, 14, 0.4);
    savePNG(path.join(OUT, 'deepen_kitchen.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_study.png — Marginalia: one handwriting down both margins ===
    // The dense zigzag "printed text" was the busiest texture on the sheet and
    // greyed out completely. Four OVERSIZED scrawls carry the idea instead, and the
    // page block has real thickness so the book is a solid, not two flat quads.
    const { cv, c } = canvas();
    contactShadow(cv, c + 8, 352, 140, 20, 0.32);
    withOutline(cv, t => {
      poly(t, [[c - 160, 134], [c - 4, 196], [c + 160, 134], [c + 160, 292], [c - 4, 356], [c - 160, 292]], SLATE.lo);
      poly(t, [[c - 158, 130], [c - 6, 192], [c - 6, 340], [c - 158, 280]], SLATE.hi, 1, SLATE.base);
      poly(t, [[c + 158, 130], [c + 6, 192], [c + 6, 340], [c + 158, 280]], SLATE.hi, 1, SLATE.base);
      poly(t, [[c - 136, 152], [c - 12, 202], [c - 12, 328], [c - 136, 274]], PAPER.hi, 1, PAPER.base);
      poly(t, [[c + 136, 152], [c + 12, 202], [c + 12, 328], [c + 136, 274]], PAPER.hi, 1, PAPER.base);
      capsule(t, c, 194, c, 344, 26, SLATE.lo);                       // spine valley
      capsule(t, c - 5, 200, c - 5, 338, 9, SLATE.hi, 0.55);
      // The same spidery hand on both pages, two oversized wavy lines each — but
      // plotted in the PAGE's own coordinates rather than on a screen-space grid.
      // The pages are sheared quads, and the old screen-space placement did not
      // follow them: the lower-right scrawl ran off the cream, across the navy
      // cover and into the book's outer contour (which is what read blind as a
      // stray dark notch on the right cover's lower edge), and the left page's top
      // scrawl overhung its fore-edge. `pagePt` maps u = 0 at the spine to u = 1 at
      // the fore-edge and v = 0 at the head to v = 1 at the foot of whichever page,
      // landing exactly on the PAPER quads drawn above, so every mark is CLIPPED TO
      // ITS PAGE by construction. The u/v insets below leave a margin on all four
      // sides wider than the stroke's own half-thickness.
      const pagePt = (side, u, v) => {
        const yTop = 202 - 50 * u, yBot = 328 - 54 * u;
        return [c + side * (12 + 124 * u), yTop + v * (yBot - yTop)];
      };
      for (const side of [-1, 1]) {
        for (const v0 of [0.31, 0.66]) {
          const wave = [[0.17, -0.09], [0.40, 0.09], [0.63, -0.09], [0.85, 0.09]];
          for (let i = 1; i < wave.length; i++) {
            const [ua, va] = wave[i - 1], [ub, vb] = wave[i];
            const [x1, y1] = pagePt(side, ua, v0 + va);
            const [x2, y2] = pagePt(side, ub, v0 + vb);
            capsule(t, x1, y1, x2, y2, 16, '#2A2438', 0.95);
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
    //
    // FOURTH PASS: the foot ran 62px along the bottom ROW of the canvas — its
    // roundRect ended at y 374 of 384 and the 9px contour pushed the rest past the
    // edge, so the bowl had no contour and no contact gap underneath it and sat a
    // step low against its neighbours. The bowl is lifted and taken in a little
    // (radius 146 -> 138, centre 206 -> 194); every dependent coordinate below is
    // derived from BY/BR or moved with them, so the mouth, the water line and the
    // crescent cannot drift off the glass.
    const { cv, c } = canvas();
    const BX = c, BY = 194, BR = 138;
    // The mouth is the arc cut away above y = 92; the water line is the chord at
    // y = 170. Both angles are derived from the radius so the rim and the surface
    // can never drift off the glass.
    const thAt = y => Math.asin(Math.max(-1, Math.min(1, (y - BY) / BR)));
    const mouth = thAt(82), surf = thAt(158);
    const arcPts = (r, from, to, n = 44) => Array.from({ length: n + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / n;
      return [BX + Math.cos(a) * r, BY + Math.sin(a) * r];
    });
    contactShadow(cv, c + 8, 346, 100, 13, 0.3);
    withOutline(cv, t => {
      // glass body: mouth angle round the bottom and back up to the mirrored mouth
      poly(t, arcPts(BR, mouth, Math.PI - mouth), GLASS.hi, 1, GLASS.base);
      // the water: the same arc, but started at the surface chord
      poly(t, arcPts(BR - 10, surf, Math.PI - surf), '#1D5578', 1, '#061620');
      ellipse(t, c + 4, 254, 58, 58, PAPER.hi);                       // the reflected crescent
      ellipse(t, c + 15, 232, 44, 44, '#123C58');                     // ... bitten from above
      capsule(t, c - 130, 158, c + 130, 158, 17, '#4E85AB');          // the surface: dead flat
      capsule(t, c - 128, 152, c + 128, 152, 8, '#F2FBFF');
      roundRect(t, c, 80, 88, 18, 9, GLASS.hi, 1, GLASS.base);        // the mouth rim
      roundRect(t, c, 334, 60, 16, 8, GLASS.base, 1, GLASS.dead);     // the foot
    }, { width: 9 });
    sheen(cv, c - 88, 124, 25, 42, 0.42);
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

  { // === deepen_office.png — Second Shadow: the SHADOWS are the subject ===
    // REDESIGNED. The previous draft made the lamp the mass and the shadows two
    // soft uncontoured smudges under it; blind graders read the object as "a
    // mushroom OR a glass cloche", and noted that the set already owns an
    // unambiguous lamp one tier down, so as a lamp this tile was both unclear and
    // redundant. The deepening is not a lamp. It is that there are TWO shadows.
    //
    // So the lamp is small, cold and plainly a lamp (a trapezoid shade on a post
    // and a foot, the shape its tier-1 sibling made legible), and the pair of cast
    // shadows carries the mass: two flattened, hard-edged repetitions of that same
    // silhouette, splayed from the one foot at different angles and different
    // lengths, so the eye recognises the shape twice and gets the discrepancy for
    // free. They are drawn INSIDE the contour because they are the subject.
    //
    // They are also deliberately MID value, not near-black. A shadow drawn dark
    // enough to be "correct" disappears on an ash row, and this tile has to work
    // on both; these read as shadows through their SHAPE and their attachment to
    // the foot, which no background can take away.
    //
    // FOURTH PASS — the base was broken and all three blind reviewers named it.
    // The two fans were thrown from origins 18px apart and both were 40-52px WIDE
    // at u = 0, so their blunt starting ends met the pole as two mismatched
    // quadrilaterals in a bow-tie that never closed: the left one's contour ran
    // straight through the foot, the right one's top edge crossed over it, and the
    // separate dark overlap pool sat below the foot outside any silhouette as a
    // free-floating wedge. A reviewer put it plainly — upgrades.mjs already draws
    // a correct lamp (one clean elliptical foot) and the two could not ship side
    // by side.
    //
    // So the lamp is now built to that same anatomy — trapezoid shade, straight
    // post, ONE elliptical foot with its own shaded underside — and the foot is
    // drawn LAST, over both fans. The fans are thrown from a single origin at the
    // centre of that foot and start NARROW, so their blunt ends are hidden beneath
    // it and each shadow simply emerges from under the lamp. There is no joint to
    // get wrong, and no free element outside the silhouette.
    //
    // What makes the tile its own thing is unchanged: the two cast shadows are the
    // subject, they disagree (different angle, different length, different spread),
    // and they stay MID value so they survive an ash row — they read as shadows
    // through their shape and their attachment to the foot, not through darkness.
    const { cv, c } = canvas();
    // ONE cast shadow: a long fan lying on the floor, widening away from the foot
    // and rounded off at its far end. A projected lamp OUTLINE was tried first and
    // read as an axe head; the fan is the shape every reader already knows as a
    // cast shadow, and two of them from one foot is the whole beat. `v` is
    // squashed to 0.55 because the floor recedes.
    const fan = (ox, oy, deg, L, w0, w1) => {
      const a = (deg * Math.PI) / 180;
      const dx = Math.cos(a), dy = Math.sin(a) * 0.62;
      const px = -Math.sin(a), py = Math.cos(a) * 0.55;
      const P = (u, v) => [ox + dx * u + px * v, oy + dy * u + py * v];
      const up = [], dn = [];
      for (let i = 0; i <= 22; i++) {
        const u = i / 22;
        let hw = w0 + (w1 - w0) * Math.pow(u, 0.8);
        if (u > 0.93) hw *= Math.sqrt(Math.max(0, 1 - ((u - 0.93) / 0.07) ** 2));
        up.push(P(u * L, hw)); dn.push(P(u * L, -hw));
      }
      return dn.concat(up.reverse());
    };
    // The lamp stands a little left of centre so the longer right-hand shadow has
    // room to run without touching the frame.
    const LX = c - 8, FOOTY = 300;
    // A glow LIGHTENS. The previous stop was #BBD6EE, which is darker than the
    // cream parchment of a light shop row, so the widest element in the tile laid a
    // grey haze around the lamp instead of cast light. This one sits above cream in
    // every channel and still reads cold.
    ellipse(cv, LX, 176, 146, 126, '#FAFCFF', 0.30, 104);            // cold cast light
    ellipse(cv, LX, 140, 96, 80, '#FFFFFF', 0.26, 62);
    contactShadow(cv, LX + 4, 316, 60, 12, 0.24);
    withOutline(cv, t => {
      // Two shadows, and they do NOT agree: one short and narrow, one long and
      // broad, at unrelated angles. Both are thrown from the SAME point — the
      // centre of the foot — and both start narrow, so the foot drawn below covers
      // their roots and each fan only appears once it is clear of the lamp. Flat
      // fills, no lit rim: a lit edge would make them objects.
      // Near-mirrored fans read as a stand rather than as two shadows, so these
      // disagree on every axis at once: one short, steep and narrow at a lighter
      // value, one long, shallow and broad at a darker one.
      for (const [deg, L, w0, w1, fill] of [
        [140, 126, 14, 36, '#787C90'],
        [14, 165, 18, 58, '#565A6D'],
      ]) {
        poly(t, fan(LX, FOOTY, deg, L, w0, w1), fill);
      }
      // the lamp: cold, compact, and the same anatomy as its tier-1 sibling
      poly(t, [[LX - 40, 84], [LX + 40, 84], [LX + 86, 158], [LX - 86, 158]],
        '#F2F8FF', 1, '#7FA6C6');                                     // shade
      capsule(t, LX - 82, 156, LX + 82, 156, 16, '#5A83AC', 0.55);    // lit lower rim
      capsule(t, LX - 40, 88, LX + 40, 88, 12, '#FFFFFF', 0.6);       // lit top rim
      capsule(t, LX, FOOTY, LX, 156, 22, STEEL.base);                 // post
      capsule(t, LX - 7, 294, LX - 7, 162, 8, STEEL.hi, 0.7);
      ellipse(t, LX, 250, 24, 12, STEEL.lo, 0.8);                     // collar
      ellipse(t, LX, FOOTY, 76, 23, STEEL.hi);                        // ONE foot, drawn last
      ellipse(t, LX, FOOTY + 7, 63, 15, STEEL.lo, 0.85);              // ... and its underside
    }, { width: 9 });
    sheen(cv, LX - 50, 104, 20, 12, 0.5);
    savePNG(path.join(OUT, 'deepen_office.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_burrow.png — Listening Crystals: grown up, and listening ===
    // The spikes sat near ground luminance and tapered to nothing, so at 56dp the
    // tips vanished and only stubs remained. Blunt tips, fatter bases, ice-cyan
    // against WARM earth for real hue separation (the fix the graders credited to
    // the tier-1 tile), and the invisible 1px hum rings are now a plain halo.
    const { cv, c } = canvas();
    // FOURTH PASS: the earth mound was the worst edge collision in the whole set —
    // 138px of it lay on the canvas's bottom ROW, so the bed had no contour and no
    // contact gap along its entire width and the tile read as cut off. The mound,
    // its clods and the contact shadow are all lifted; the shards are untouched
    // (they graded well) and simply stand a little deeper in the bed.
    ellipse(cv, c, 188, 152, 144, COLDGLOW, 0.22, 118);
    contactShadow(cv, c + 8, 340, 132, 20, 0.32);
    withOutline(cv, t => {
      shard(t, c - 114, 168, c - 168, c - 48, 306, c - 84, ICE);
      shard(t, c + 112, 142, c + 46, c + 166, 306, c + 138, ICE);
      shard(t, c - 2, 52, c - 78, c + 74, 312, c + 30, ICE);
      roundRect(t, c, 320, 150, 34, 24, EARTH.hi, 1, EARTH.lo);       // earth mound
      for (const [x, y, rx, ry] of [[c - 108, 300, 38, 20], [c + 6, 294, 44, 22], [c + 114, 302, 36, 19]]) {
        ellipse(t, x, y - 2, rx, ry, EARTH.base);
        ellipse(t, x - rx * 0.3, y - ry * 0.55, rx * 0.42, ry * 0.36, EARTH.hi, 0.75);
      }
    }, { width: 9 });
    sheen(cv, c - 30, 108, 13, 36, 0.5);
    savePNG(path.join(OUT, 'deepen_burrow.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_garden.png — Tuned Chimes: a whole chime, every tube one length ==
    // REDESIGNED. The previous draft was a bar with three equal tubes hanging off
    // it, cropped at the bottom edge, and blind graders could not name it: "three
    // rounded white slats hanging from a dark rod — a scroll, a blind, a chime or
    // ice". It also shared its entire construction with its tier-1 sibling, so it
    // read as an unfinished copy of that tile rather than its own object.
    //
    // The room rhymes in this set are deliberate, but a rhyme cannot cost a tile
    // its name, so this one is drawn as a COMPLETE wind chime instead of a
    // fragment of one: the hanging ring at the top, the suspension disc, the tube
    // block, the striker and the wind sail below it. Those last three are what
    // nobody mistakes for a blind, and the whole object now sits inside the frame
    // with the sail clear of the bottom edge.
    //
    // The deepening itself is still the mechanism, not a decoration laid over it:
    // every tube is cut to EXACTLY the same length, because a chime that has
    // settled on one note is a chime whose tubes have all been cut to one measure.
    // Against tier-1 (warm brass, ragged lengths, a bar and a ball) this is cold
    // white, flat-bottomed and disc-topped.
    const { cv, c } = canvas();
    ellipse(cv, c, 236, 128, 146, COLDGLOW, 0.2, 96);                 // the note, uncontoured
    contactShadow(cv, c + 8, 366, 66, 10, 0.2);
    withOutline(cv, t => {
      capsule(t, c, 26, c, 96, 13, DARKWOOD.base);                    // it hangs
      capsule(t, c - 4, 32, c - 4, 88, 5, '#8A6742', 0.6);
      ellipse(t, c, 106, 84, 20, DARKWOOD.lo);                        // suspension disc
      ellipse(t, c, 97, 84, 20, DARKWOOD.hi);
      ellipse(t, c - 28, 92, 27, 7, '#8A6742', 0.6);
      // A REAL GAP of open cord between the disc and the tube tops. `tube` lays an
      // ink keyline as a ROUND-CAPPED capsule, so a fat tube's contour reaches
      // th/2 + 5 above its own top: the first version of this composition put the
      // tube tops at the disc's rim, the two contours merged, and the whole thing
      // read as a lantern or a birdcage rather than as something hanging.
      for (const x of [c - 64, c, c + 64])
        capsule(t, x, 114, x, 196, 11, DARKWOOD.lo, 0.95);
      // The tube block: three tubes, just touching, all ending on the SAME line —
      // a chime settled on one note is a chime cut to one measure.
      for (const x of [c - 64, c + 64, c]) {
        tube(t, x, 190, 300, 62, BRIGHTSTEEL);
        ellipse(t, x, 297, 29, 10, STEEL.lo);                         // the open mouth
        ellipse(t, x, 295, 21, 6, '#20262E');
      }
      // striker and wind sail, hanging in front of the tubes on the centre cord
      ellipse(t, c, 302, 36, 31, DARKWOOD.lo);
      ellipse(t, c - 2, 298, 31, 27, DARKWOOD.hi);
      poly(t, [[c, 322], [c + 30, 338], [c, 370], [c - 30, 338]],
        DARKWOOD.hi, 1, DARKWOOD.lo);
    }, { width: 9 });
    sheen(cv, c - 50, 90, 22, 7, 0.42);
    sheen(cv, c - 82, 224, 9, 40, 0.5);
    savePNG(path.join(OUT, 'deepen_garden.png'), W, W, down2(cv, W, W));
  }

  { // === deepen_bamboo_attic.png — Risen Lanterns: high, steady, waiting ===
    // Two lanterns under a crossed X of beams, with a stray glint at the crossing
    // that all three graders read as a rendering artefact. One lantern now, held
    // high on a short cord to the top edge — and a RIBBED CYLINDER rather than a
    // globe, so it cannot be confused with the tier-1 paper globe at 56dp.
    //
    // FOURTH PASS. Two of three blind reviewers could still not name it: "a banded
    // cream cylinder", "almost no interior information, 36 distinct colours against
    // a 100-160 norm, reads as a blank form". Everything inside the silhouette was
    // one flat BONE gradient, two straight rib capsules and a soft white blob, and
    // a straight band across a cylinder is exactly what flattens it back into a
    // rectangle. The subject is right — risen paper lanterns held steady against
    // dark rafters — so this pass gives it the interior it never had:
    //
    //   ROUNDNESS. The paper turns under at both sides (two dark strips) and lifts
    //   down the middle (one pale one), and every rib now SAGS across the belly
    //   instead of running straight, which is the one cue that makes a rectangle a
    //   cylinder seen side-on. Each rib is drawn twice, a shadow band with a lit
    //   edge riding above it, so the ribs have depth of their own.
    //   A CAP, top and bottom, each seated on a dark collar ring where the paper is
    //   gathered onto the wood, so the paper is fixed to something.
    //   A GLOW THROUGH THE PAPER. Not a highlight on it: a broad soft bleed with a
    //   small hard-edged flame silhouette inside, which is what a lit paper lantern
    //   actually looks like from outside. It stays COLD (the tier-1 sibling owns
    //   the warm globe), so the pair still separates on temperature at 56dp.
    const { cv, c } = canvas();
    // A bowed band across the belly of the cylinder. `bow` is what stops a rib
    // reading as a strip of tape laid over a flat card.
    const rib = (y, th, hw, bow) => {
      const n = 14, up = [], dn = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = c - hw + 2 * hw * u, s = y + bow * Math.sin(Math.PI * u);
        up.push([x, s - th / 2]); dn.push([x, s + th / 2]);
      }
      return up.concat(dn.reverse());
    };
    ellipse(cv, c, 212, 132, 146, '#F2F7FF', 0.28, 106);              // cold paper glow
    contactShadow(cv, c + 6, 358, 88, 12, 0.2);
    withOutline(cv, t => {
      // A THIN cord with a knot at the cap. The thick stub the previous draft hung
      // it from read as a spout, and a squat body under a wide cap reads as a
      // barrel, so the paper is taller than it is wide and both caps are visibly
      // narrower than it.
      capsule(t, c, 30, c, 80, 11, DARKWOOD.base);                    // held near the rafters
      ellipse(t, c, 76, 16, 11, DARKWOOD.hi);                         // the knot
      roundRect(t, c, 86, 70, 18, 8, DARKWOOD.hi, 1, DARKWOOD.lo);    // top cap
      roundRect(t, c, 216, 124, 128, 46, BONE.hi, 1, BONE.base);      // paper cylinder
      // the paper turns away at both edges and catches the light down the middle
      roundRect(t, c - 101, 216, 23, 120, 23, '#9C9174', 0.6);
      roundRect(t, c + 103, 216, 21, 120, 21, '#7C7255', 0.55);
      roundRect(t, c - 8, 216, 46, 122, 24, '#FFFFFF', 0.26);
      // The flame, seen THROUGH the paper. The bleed is kept under the core rather
      // than over it: a broad wash at full strength swallows the silhouette, and
      // the silhouette is the whole point — it is what says LANTERN rather than
      // banded cylinder.
      ellipse(t, c - 4, 230, 46, 84, '#E2F2FF', 0.7, 26);
      flameLobe(t, c - 4, 162, 282, 30, '#FBFEFF', 1);
      flameLobe(t, c - 5, 192, 276, 15, '#FFFFFF', 1);
      // four sagging ribs, each a shadow band with a lit edge riding above it
      for (const y of [150, 202, 254, 302]) {
        poly(t, rib(y, 15, 116, 11), '#6E6551', 0.5);
        poly(t, rib(y - 8, 6, 116, 11), '#FFFDF2', 0.55);
      }
      // the collars where the paper is gathered onto the wood
      poly(t, rib(108, 13, 112, 9), DARKWOOD.lo, 0.55);
      poly(t, rib(328, 13, 112, 9), DARKWOOD.lo, 0.6);
      roundRect(t, c, 340, 66, 16, 8, DARKWOOD.hi, 1, DARKWOOD.lo);   // bottom cap
    }, { width: 10 });
    sheen(cv, c - 74, 152, 24, 36, 0.45);
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
