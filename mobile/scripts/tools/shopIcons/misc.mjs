/**
 * shopIcons/misc.mjs — ROOM ATTUNEMENTS, TIER 3 (3 icons) + the shop's fallback
 * placeholder (1 icon).
 *
 * ATTUNEMENTS ARE LEVEL-KEYED, NOT ROOM-KEYED, ON PURPOSE. The shop sells the
 * same three levels (ATTUNEMENT_LEVEL_NAMES = Kindled / Humming / Attuned, costs
 * 150/200/250 in src/services/roomUpgrades.ts) for all 13 rooms, and 39 per-room
 * attunement pictures would be near-duplicates of the deepening art they sit
 * under. So there are exactly three, and their whole job is to read as ONE
 * ESCALATING SEQUENCE seen side by side in a shop list.
 *
 * WHY THE FIRST PASS FAILED, AND WHAT REPLACED IT. The first version drew one
 * stone hearth three times and escalated only the LIGHT (more grooves lit, a
 * hotter core). A blind review shrank all three to 56dp — the real delivery size
 * in a shop row — and returned the only verdict that matters: "positions 1, 2 and
 * 3 are three near-identical hearths differing mainly in rim metal and glow;
 * stacked in a list a player cannot tell them apart." Luminous escalation is
 * invisible once a tile is 56 pixels wide, because every soft glow averages to
 * the same warm blur. So the escalation is now STRUCTURAL — each level changes
 * the SILHOUETTE, which is the one thing that survives downsampling:
 *
 *   attune_1.png  Kindled   the bare stone ring + ONE tall flame rising out of it
 *                           -> a circle with a plume above it. Tall, asymmetric.
 *   attune_2.png  Humming   the same ring with TWO thick concentric bands, one
 *                           nested inside and one ringing it outside
 *                           -> a bullseye. Round, symmetrical, visibly wider.
 *   attune_3.png  Attuned   the ring lit gold, SIX thick sigil bars spiking past
 *                           its edge, a big hard-edged core
 *                           -> a spoked wheel. Round, symmetrical, spiky.
 *
 * The RING's GEOMETRY is identical in all three — same centre, same two radii,
 * drawn by the one `baseRing` below (level 3 swaps its stone for gold, nothing
 * else). That is the family signature, and it is what makes the three read as one
 * purchasable line rather than three unrelated objects. Everything the eye uses to
 * TELL them apart is large: a plume, a band, a spike.
 *
 * The other first-pass fault was value. Kindled graded "brown-on-grey ... 22% of
 * its ink sits at ash luminance ... a brown oval smudge with an orange speck".
 * The stone is now a light slate that is three full value steps off the ash row
 * background, the recess inside it is genuinely dark, and the flame is the
 * largest element in the tile rather than the smallest.
 *
 * FOURTH PASS, two targeted fixes:
 *   - attune_3's widest element was a #FFC24A halo, and #FFC24A is DARKER than the
 *     cream parchment of a light shop row in two channels of three. A glow that
 *     darkens the surface it lands on is not a glow: on cream the sunburst wore a
 *     grey-gold smudge the size of the tile. Both stops are now above cream in
 *     every channel, so they can only lift it (the same fix upgrades.mjs made to
 *     its lamp, and for the same reason).
 *   - attune_2 was precisely describable and still not nameable: "concentric gold
 *     and silver rings". The reason was structural, not decorative — the outer
 *     hoop FLOATED, with a band of bare background between it and the stone, so
 *     nothing in the tile held anything else and there was no object for the eye
 *     to land on. It now has thickness (the hoop is drawn a second time offset
 *     down, so its own edge shows beneath the band), seating (four stone brackets
 *     clamp it onto the disc, drawn OVER the metal) and material (the inner band
 *     casts onto the floor of the well; the middle is a domed rivet head, not a
 *     bloom). The RING's geometry is untouched, so the three still read as one
 *     escalating line, and the brackets stop well inside the hoop's outer edge so
 *     the silhouette stays the smooth bullseye that separates it from level 3.
 *
 * House doctrine (see _draw.mjs): contact shadow, top-lit bodies built with the
 * gradTo argument, one upper-left sheen, INK outlines and never #000. Every
 * subject is wrapped in `withOutline`, the thick warm-dark contour the shipped
 * icon set has and the first pass lacked; the contact shadow goes down BEFORE it
 * (a shadow must not be outlined) and the sheen AFTER it (the specular sits on
 * top of the contour). No Math.random: every coordinate is a literal, so the
 * generator is byte-reproducible.
 *
 * All coordinates are in the 384x384 supersample space (c = 192 is the centre);
 * each file is downsampled 2x to a 192px PNG = 64dp at @3x.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  canvas, savePNG, down2, W, contactShadow, sheen, withOutline, INK,
  ellipse, roundRect, poly, capsule, arcStroke, flameLobe, blend, hex,
} from './_draw.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../assets/ui/shop');

// --- local palettes ---------------------------------------------------------
/** Light slate, wide enough in range to give the three BIG value steps the
 *  shipped set uses. `hi` is 0.85 luminance, `deep` is 0.24 — a dark ash row and
 *  a cream parchment row both have something to bite on. */
const SLATE = { hi: '#EFE9D8', up: '#CFC5AE', mid: '#9E9480', lo: '#6C6455', deep: '#443E34' };
/** The recess inside the ring: the dark step every bright core is read against.
 *  It is a per-level colour, not one constant, and that is a FIX rather than a
 *  flourish. A single cold navy well (#2A2430) belonged to neither palette: at
 *  Kindled it showed as two cold crescents either side of the flame and at
 *  Attuned as cold wedges between the sigil bars, and a blind review named the
 *  same artefact in both tiles — "a dark shape that has no read and does not
 *  follow the disc's circular form ... an unremoved dark backing layer showing
 *  through". The well is now cut from its own ring's material (warm stone-dark
 *  under the flame, deep gold inside the gold ring), so whatever the subject
 *  leaves uncovered reads as the shadowed interior of the ring it is cut into.
 *  Humming keeps the original navy: its well is almost entirely covered by the
 *  inner band and the core, it graded clean, and it is the family's cold note. */
const RECESS = { stone: '#332618', hum: '#2A2430', gold: '#5E3305' };
const GOLD = { hi: '#FFD469', up: '#FFE9A8', mid: '#F0A81E', lo: '#A96406', deep: '#6E3D06' };
/** Kindled's flame is deliberately AMBER, not the red-orange a flame usually
 *  wants to be: it ties level 1's light to the gold of levels 2 and 3, and it
 *  keeps the tile clear of the red hearth flames the room-upgrade family already
 *  owns (the shop lists attunements and upgrades in the same section, and side by
 *  side at 56dp two orange flames are one icon). Four steps, widely spaced, so the
 *  flame still has value structure once it is 15px tall. */
const FIRE = { out: '#9C4A04', mid: '#E08610', in: '#FFC03A', core: '#FFF3D2' };
const KRAFT = { hi: '#E0B57E', base: '#BE8B50', lo: '#7E5A2C', crease: '#5E3F1C' };
const TWINE = { hi: '#F3E6C4', base: '#D8C296', lo: '#A98F5F' };

// --- the ring's fixed geometry (byte-identical in all three attunements) -----
const RING = { cx: W, cy: W + 4, rOut: 107, rIn: 69 };

// ---------------------------------------------------------------------------
// Local primitive: an anti-aliased ring stroke shaded by distance to the circle.
//
// _draw.mjs has arcStroke, but arcStroke lays a round cap at each end; chaining
// or closing it for a FULL ring double-blends at the seam and beads a visible
// lump into any stroke drawn below full alpha. This walks the implicit circle
// instead, so one uniform pass gives a clean closed ring at any alpha.
// ---------------------------------------------------------------------------
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
 * A thick metal band on radius `r`: flat body, a lit arc across the top and a
 * shade arc across the bottom. Three flat value steps rather than an airbrushed
 * gradient, because a gradient across a 24px-wide band averages to one tone the
 * moment the tile is downsampled.
 */
function metalBand(cv, r, th, pal) {
  ringStroke(cv, RING.cx, RING.cy, r, th, pal.lo, 1);
  ringStroke(cv, RING.cx, RING.cy, r, th * 0.74, pal.mid, 1);
  arcStroke(cv, RING.cx, RING.cy, r, th * 0.42, -Math.PI + 0.34, -0.34, pal.hi, 1);
  arcStroke(cv, RING.cx, RING.cy, r, th * 0.30, 0.42, Math.PI - 0.42, pal.deep, 0.55);
}

/**
 * The shared ring: a top-lit stone annulus with a dark recess punched through it.
 * `pal` swaps the stone for gold at Attuned; the GEOMETRY never changes, which is
 * what holds the three tiles together as one family.
 */
function baseRing(cv, pal, recess) {
  roundRect(cv, RING.cx, RING.cy, RING.rOut, RING.rOut, RING.rOut, pal.hi, 1, pal.lo);
  // inner bevel keyline, a few px in from the rim — the shipped gem and trophy
  // both carry one, and it is what stops a flat disc reading as a sticker.
  ringStroke(cv, RING.cx, RING.cy, RING.rOut - 9, 9, pal.deep, 0.42);
  // the recess: a hard rim shadow, then the well itself, both in the ring's own
  // dark rather than a shared navy (see RECESS above)
  ellipse(cv, RING.cx, RING.cy, RING.rIn + 7, RING.rIn + 7, INK, 0.9, 3);
  ellipse(cv, RING.cx, RING.cy, RING.rIn, RING.rIn, recess, 1, 3);
  // light from above falls on the FAR (lower) inner wall of a well
  arcStroke(cv, RING.cx, RING.cy, RING.rIn + 4, 10, 0.40, Math.PI - 0.40, pal.up, 0.5);
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === attune_1.png — KINDLED ===============================================
    // Bare stone, one flame. The flame is deliberately the largest thing in the
    // tile and rises well clear of the ring, so the silhouette is a circle with a
    // plume — nothing else in the family has an asymmetric top.
    const { cv } = canvas();
    contactShadow(cv, RING.cx + 5, RING.cy + 122, 108, 20, 0.32);
    ellipse(cv, RING.cx, RING.cy - 26, 118, 132, '#FF8A2A', 0.14, 30);   // heat spill
    withOutline(cv, t => {
      baseRing(t, SLATE, RECESS.stone);
      // ember bed at the bottom of the well: wide, so the well still reads as a
      // well on either side of the flame rather than being swallowed by it
      ellipse(t, RING.cx, RING.cy + 42, 60, 19, '#5E1E05', 1, 4);
      ellipse(t, RING.cx, RING.cy + 40, 52, 14, FIRE.out, 1, 4);
      ellipse(t, RING.cx, RING.cy + 39, 32, 8, FIRE.in, 1, 4);
      // a dark lobe under the flame so it keeps a keyline where it crosses stone
      flameLobe(t, RING.cx + 3, 20, RING.cy + 50, 58, INK, 0.92);
      flameLobe(t, RING.cx + 3, 32, RING.cy + 46, 52, FIRE.out);
      flameLobe(t, RING.cx + 1, 62, RING.cy + 44, 39, FIRE.mid);
      flameLobe(t, RING.cx - 2, 106, RING.cy + 42, 25, FIRE.in);
      flameLobe(t, RING.cx - 3, 152, RING.cy + 40, 12, FIRE.core);
    }, { width: 10 });
    sheen(cv, RING.cx - 62, RING.cy - 62, 34, 20, 0.5);
    sheen(cv, RING.cx - 14, 96, 11, 26, 0.34);
    savePNG(path.join(OUT, 'attune_1.png'), W, W, down2(cv, W, W));
  }

  { // === attune_2.png — HUMMING ===============================================
    // The ring answers itself: two thick concentric bands, one nested in the well
    // and one ringing the stone. Symmetrical, and visibly wider than Kindled
    // (290px across against 214) so the two differ in MASS as well as in shape.
    const { cv } = canvas();
    contactShadow(cv, RING.cx + 5, RING.cy + 150, 118, 20, 0.32);
    ellipse(cv, RING.cx, RING.cy, 168, 168, '#FFF3D2', 0.26, 34);
    withOutline(cv, t => {
      baseRing(t, SLATE, RECESS.hum);
      // The hoop's own EDGE: the same ring laid down once more, offset, so the band
      // has a thickness to stand on instead of being a circle painted on the tile.
      ringStroke(t, RING.cx, RING.cy + 9, 133, 24, GOLD.deep, 1);
      metalBand(t, 133, 24, GOLD);            // the outer hoop
      // Four brackets clamp the hoop onto the stone, drawn OVER the metal so they
      // read as holding it down. Without them the hoop floated clear of the disc
      // with bare background between the two, and a floating ring is a diagram.
      // They stop short of the hoop's outer edge, so the silhouette stays round,
      // and they only span the GAP the hoop floats over — from the stone's rim to
      // the middle of the band. A clip that ran all the way in toward the core
      // would be a spoke, and a spoked wheel is the silhouette level 3 owns.
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        const ux = Math.cos(a), uy = Math.sin(a);
        const x1 = RING.cx + ux * 100, y1 = RING.cy + uy * 100;
        const x2 = RING.cx + ux * 137, y2 = RING.cy + uy * 137;
        capsule(t, x1, y1, x2, y2, 40, INK, 0.92);
        capsule(t, x1, y1, x2, y2, 30, SLATE.up, 1);
        capsule(t, x1 - 5, y1 - 5, x2 - 5, y2 - 5, 10, SLATE.hi, 0.8);
      }
      // the inner band casts onto the floor of the well, which is what puts it
      // DOWN IN the ring rather than flat on top of it
      ringStroke(t, RING.cx + 4, RING.cy + 10, 51, 19, INK, 0.42);
      metalBand(t, 51, 19, GOLD);             // the inner band, down in the well
      // the middle is a domed rivet head: ringed, top-lit, hard-edged
      ellipse(t, RING.cx, RING.cy + 3, 33, 33, INK, 0.92, 3);
      ellipse(t, RING.cx, RING.cy, 30, 30, GOLD.lo, 1, 3);
      ellipse(t, RING.cx, RING.cy - 2, 23, 23, GOLD.hi, 1, 3);
      ellipse(t, RING.cx - 3, RING.cy - 5, 12, 12, '#FFF6DC', 1, 3);
    }, { width: 10 });
    sheen(cv, RING.cx - 92, RING.cy - 92, 26, 16, 0.5);
    sheen(cv, RING.cx - 60, RING.cy - 58, 22, 14, 0.4);
    savePNG(path.join(OUT, 'attune_2.png'), W, W, down2(cv, W, W));
  }

  { // === attune_3.png — ATTUNED ===============================================
    // The ring itself is gold now, and six THICK sigil bars drive out through it
    // and past the rim. That gives the only spiked silhouette in the family, so
    // even at 56dp it can never be confused with the smooth bullseye above it.
    const { cv } = canvas();
    contactShadow(cv, RING.cx + 5, RING.cy + 150, 118, 20, 0.32);
    // A glow LIGHTENS (see the header). Both stops sit above cream in every
    // channel; the tighter one keeps the light gathered on the core.
    ellipse(cv, RING.cx, RING.cy, 176, 176, '#FFF3D2', 0.30, 34);
    ellipse(cv, RING.cx, RING.cy, 120, 120, '#FFFBEC', 0.30, 26);
    // the six bars, as tapered wedges from just outside the core to past the rim
    const BARS = 6;
    const bar = (k, rA, rB, wA, wB) => {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / BARS;
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      return [
        [RING.cx + ux * rA - nx * wA, RING.cy + uy * rA - ny * wA],
        [RING.cx + ux * rA + nx * wA, RING.cy + uy * rA + ny * wA],
        [RING.cx + ux * rB + nx * wB, RING.cy + uy * rB + ny * wB],
        [RING.cx + ux * rB - nx * wB, RING.cy + uy * rB - ny * wB],
      ];
    };
    withOutline(cv, t => {
      baseRing(t, GOLD, RECESS.gold);
      for (let k = 0; k < BARS; k++) {
        poly(t, bar(k, 46, 152, 24, 9), INK, 1);
        poly(t, bar(k, 48, 146, 18, 5), '#FFF3D2', 1, GOLD.hi);
      }
      // the core: hard-edged, ringed, NOT an airbrushed bloom (the first pass
      // blew this out to a white blob that graded "a gold coin with a hole")
      ellipse(t, RING.cx, RING.cy, 55, 55, INK, 1, 3);
      ellipse(t, RING.cx, RING.cy, 48, 48, GOLD.mid, 1, 3);
      ellipse(t, RING.cx, RING.cy - 2, 38, 38, GOLD.hi, 1, 3);
      ellipse(t, RING.cx - 3, RING.cy - 4, 24, 24, '#FFF6DC', 1, 3);
    }, { width: 10 });
    sheen(cv, RING.cx - 30, RING.cy - 30, 13, 9, 0.55);
    sheen(cv, RING.cx - 66, RING.cy - 66, 24, 15, 0.4);
    savePNG(path.join(OUT, 'attune_3.png'), W, W, down2(cv, W, W));
  }

  { // === shop_placeholder.png — a plain brown-paper parcel, tied ==============
    // Drawn for any id the registry does not map, so a cosmetic added later can
    // never render a hole in the shop list. Deliberately the least interesting
    // object in the set: it should read as "something, unopened", nothing more.
    // This one graded well blind and is otherwise unchanged; the only edit is the
    // mandatory contour, which replaces the hand-drawn INK underlay it carried.
    const { cv, c } = canvas();
    const bx = c, by = c + 12, hw = 134, hh = 112;
    contactShadow(cv, bx + 6, by + hh + 18, 124, 24, 0.34);
    withOutline(cv, t => {
      roundRect(t, bx, by, hw, hh, 16, KRAFT.hi, 1, KRAFT.lo);
      // paper creases + a folded corner, from a literal table (no Math.random)
      const CREASES = [
        [-106, -76, -36, -90], [36, -68, 106, -82], [-98, 54, -32, 68],
        [42, 64, 108, 50], [-60, -22, -20, -36], [58, 10, 110, 22],
      ];
      for (const [x1, y1, x2, y2] of CREASES) {
        capsule(t, bx + x1, by + y1, bx + x2, by + y2, 4, KRAFT.crease, 0.18);
      }
      roundRect(t, bx + hw - 36, by - hh + 32, 36, 32, 8, KRAFT.base, 0.8, KRAFT.lo);  // fold
      // twine: a band each way, laid dark-first so each reads as a rounded cord
      const cord = (x1, y1, x2, y2) => {
        capsule(t, x1, y1, x2, y2, 26, TWINE.lo, 0.95);
        capsule(t, x1, y1, x2, y2, 18, TWINE.hi, 1);
        capsule(t, x1, y1, x2, y2, 7, TWINE.base, 0.45);
      };
      cord(bx - 18, by - hh - 6, bx - 18, by + hh + 6);
      cord(bx - hw - 6, by - 28, bx + hw + 6, by - 28);
      // the tie: a wrap over the crossing plus two short cut ends. Deliberately
      // NOT a bow — ring loops read as spectacles at 56dp and filled loops read
      // as lumps, and neither is worth the noise on the set's dullest object.
      const kx = bx - 18, ky = by - 28;
      for (const [ex, ey] of [[-64, 52], [58, 56]]) {
        capsule(t, kx, ky + 4, kx + ex, ky + ey, 24, INK, 0.9);
        capsule(t, kx, ky + 2, kx + ex, ky + ey - 2, 16, TWINE.hi, 1);
        capsule(t, kx, ky + 2, kx + ex, ky + ey - 2, 6, TWINE.base, 0.4);
      }
      roundRect(t, kx, ky, 34, 30, 12, INK, 0.9);                          // wrap
      roundRect(t, kx, ky - 3, 27, 23, 9, TWINE.hi, 1, TWINE.lo);
      capsule(t, kx - 14, ky - 16, kx - 14, ky + 14, 5, TWINE.lo, 0.5);
      capsule(t, kx + 14, ky - 16, kx + 14, ky + 14, 5, TWINE.lo, 0.5);
    }, { width: 10 });
    sheen(cv, bx - 32, by - 40, 9, 5, 0.4);
    sheen(cv, bx - 80, by - 78, 46, 20, 0.3);
    savePNG(path.join(OUT, 'shop_placeholder.png'), W, W, down2(cv, W, W));
  }
}
