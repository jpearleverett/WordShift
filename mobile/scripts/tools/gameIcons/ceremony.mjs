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
 * never be outlined) and every bloom colour sits ABOVE cream parchment in all
 * three channels — the review sheet grades these on cream and on ash, and a
 * warm-white glow lightens both, where an amber one would lay a grey smudge on
 * the light ground.
 *
 * The three darken as a set, which is the family's ladder:
 *
 *   ceremony_curious.png  a standing brass lantern, LIT, two pale moths
 *                         CIRCLING it — one upper-right, heading in past the
 *                         cap's corner, one lower-left, climbing toward the
 *                         glass with a wingtip on the left rail — inside one
 *                         wide warm halo with an amber ring outside the glass.
 *                         Warm brass and amber glass, the widest bloom of the
 *                         three. "Lean in, as if listening."
 *   ceremony_deeper.png   a four-pane cottage window at night, its interior a
 *                         deep indigo, ONE candle stub on the sill with its flame
 *                         BENT to the right as if in a draught. Weathered wood
 *                         frame, a tighter bloom. Emptier, quieter, waiting.
 *                         The family's reference for composition: one outlined
 *                         object, glow kept close, no framing device.
 *   ceremony_shadows.png  a bare forked tree standing forward-left on a low
 *                         wide ellipse of mauve dusk ground, ONE hard INK
 *                         shadow wedge fanning from its foot across the
 *                         ground to the foundation of a SMALL indigo house
 *                         set two-thirds of the way back, one lit window;
 *                         a thin crimson horizon LINE along the ground's back
 *                         rim that ends behind the house, a rose afterglow
 *                         above it. Tree, ground, shadow and house are ONE
 *                         outlined silhouette; the shadow is a tone on the
 *                         ground inside it, never contoured. Mauve and wine,
 *                         the faintest bloom.
 *
 * SEVENTH PASS, after the arbiter's review of the sixth (row 2 passed again
 * and is untouched to the byte; rows 1 and 3 failed on SUBJECT legibility):
 *   - Row 1's dust-brown leaf-oval moths were read as a sprig of dead leaves
 *     on a stem: both lay on one diagonal through the lantern, their bodies
 *     and antennae lining up into the stem, and the upper one covered the
 *     flame. The moth is redrawn as a moth seen from above: per side a broad
 *     rounded-triangle forewing with a scalloped trailing edge over a small
 *     hindwing lobe (Catmull-Rom rounded, no points), a FAT fuzzy body clearly
 *     visible between the wings (dark warm brown, lighter belly), a round head
 *     and two thin CURVED antennae (9px core on a 21px ink underlay) sweeping
 *     away from the body. Wingspan ~1/5 of the frame. The wings are pale again
 *     — light parchment at the top edge grading to tan at the bottom — with
 *     the wing nearest the lantern a shade warmer and more amber, as if lit by
 *     it; the INK contour and the tan lower halves hold them on cream, the
 *     pale tops hold them on ash and against the brass. Placement: the upper
 *     moth sits OUTSIDE the lantern to the upper-right, heading left so its
 *     head touches only the cap's corner; the lower moth sits outside the
 *     glass to the lower-left, heading up-right with one wingtip on the left
 *     rail. Their body axes differ by ~90 degrees and neither crosses the
 *     glass, so the flame is fully unoccluded in a clean amber panel and no
 *     line runs moth-to-moth through the lantern. A fifth halo — an amber-
 *     white ring (#FFEEC6, above cream in every channel) at 0.34 just outside
 *     the glass — keeps the lantern reading LIT at 0.55 on the near-black.
 *     Lantern, glass, flame, bars, foot and the four wide halos untouched.
 *   - Row 3's shadow, the point of the emblem, was invisible at delivery size
 *     (a translucent purple on purple that averaged into the mound) and its
 *     thick crimson slab made the flat-topped mound read as a plinth with a
 *     near-tree-scale house on its edge. Rebuilt: the ground is a plain low
 *     wide ELLIPSE (840 x 352, ~0.8 x 0.34 of the frame) in a lighter mauve
 *     (#A088B4 top-lit to #6E5686); the crimson slab is gone, replaced by a
 *     26px crimson LINE (1/40 of the frame) along the back rim from the left
 *     shoulder to just behind the house, with a rose-white afterglow above it
 *     outside the contour; the trunk stands forward on the mauve with a small
 *     INK contact ellipse at its foot; and the cast shadow is ONE hard-edged
 *     INK wedge at 0.7 (>= 0.2 luminance under the ground on both grounds and
 *     under the 0.55 overlay), starting at the trunk's foot at trunk width and
 *     fanning across ~410px (0.4 of the frame, ~0.52 of it from the trunk's
 *     far edge) to ~258px tall (1/4 of the frame) where its far edge meets the
 *     house's foundation. The house shrinks to ~1/6 of the frame (160px to the
 *     peak, 108px walls), indigo walls under a darker roof whose horizon-side
 *     slope is caught in crimson, one 44px amber window with a warm glow
 *     outside the contour, its foot two-thirds of the way back toward the
 *     horizon. Tree drawing unchanged apart from a 26px downward shift.
 *
 * SIXTH PASS, after the arbiter's review of the fifth (row 2 passed again and
 * is untouched to the byte; rows 1 and 3 failed on VALUE, not on subject):
 *   - Row 1's halo was already right (lighter than cream in every channel;
 *     measured) and is untouched. The moths were the defect: a parchment wing
 *     (~#D5BA94, ~0.74 luminance) sat inside the 0.13 band of cream, so at
 *     48px on the light ground only the contour held them and they read as
 *     outlined cream blobs; and the lower moth hung off the left post as a
 *     detached particle. The wing is now a two-step dust-brown, top-lit
 *     (~#B48E62 at the lifted tip, ~0.55, grading to ~#8E6A44 at the root,
 *     ~0.42): every wing pixel sits >= 0.13 under cream and well over ash,
 *     and a step under the brass cap and the amber glass it lies on. Both
 *     moths are scaled up ~15% (a wing lobe is ~180px, > 1/6 of the frame),
 *     and the lower moth is moved up and right so its BODY sits on the left
 *     cage post and its near wing lies on the lit glass: the contour pass now
 *     fuses it into the lantern and the emblem is one silhouette at 48px. The
 *     lantern, glass, flame, bars, foot and halo are untouched to the pixel.
 *   - Row 3's trunk, cast shadow and house averaged into one dark clump at
 *     48px on both grounds: the shadow was a SOLID ink wedge fused to the
 *     trunk base, the house was a dark-indigo wall (0.20-0.28, inside the
 *     0.13 band of ash) tucked against the trunk, so 'distant' and 'long'
 *     were both lost. Three changes, all inside the shipped no-disc
 *     composition: (1) the cast shadow is a SEPARATE soft ground tone — deep
 *     indigo-black (#22162C) feathered in three layers to ~0.58, starting a
 *     clear ~15px (native) right of the roots and tapering to a point that
 *     just touches the house's foot, ~345px long (> 1/3 of the frame). It is
 *     laid on the opaque mound before the tree and house are painted, so the
 *     contour pass never sees it as an edge (a shadow is never outlined) and
 *     the house sits over its tip. The trunk gets its own small contact
 *     ellipse, clear of the shadow, so it grounds without merging. (2) The
 *     house is moved right and up onto the horizon band, its foot on the
 *     crimson, and shrunk to ~1/8 of the frame (124px across the gable) so it
 *     reads as far away; its walls are a lit mauve-grey (~#8C7A9A to
 *     ~#6B5A78, >= 0.40) under a darker roof, a full step over ash while the
 *     INK contour still holds it on cream; the one amber window is 44px
 *     (22px native), the spot of warm light that must survive 48px. (3) The
 *     ground is a flat-topped superellipse (n = 2.8) instead of an ellipse,
 *     so the crimson crest is a wide horizon band with room for a house on
 *     it, and the tree is shifted 30px left with its low-left limb trimmed
 *     (the crown no longer splits into a second mass at 48px), which is what
 *     gives the shadow its length. Bark, contour weight, afterglow, contact
 *     shadow and palette otherwise stay as the fifth pass left them.
 *
 * FIFTH PASS, after the arbiter's review of the fourth (rows 1 and 2 passed
 * and are untouched to the byte; row 3 failed on composition, not style):
 *   - Row 3 was three things on a rail: a tree, a hairline crimson stroke and
 *     a speck of a house at the right rim, the whole painted bbox shifted to
 *     x=52..459 so it read as clipped at 48px, and its cast shadow was a
 *     purple-on-purple tint nobody saw. It is rebuilt as ONE centred object.
 *     The mound is 744px wide (140..884) so the painted bbox is symmetric
 *     about the centre with a ~118px margin all round; the tree stands on its
 *     left half, the house INSIDE its right half. The crimson horizon is the
 *     mound's upper third (88px, 1/11.6 of the frame), a graded crimson-to-
 *     wine band that is part of the outlined silhouette, not a stroke. The
 *     cast shadow is now the subject's second form: a stylised tree-shadow
 *     (a fat trunk bar from behind the roots, three fingers fanning right to
 *     the horizon band, the house wall and the front rim; every stick >= 44px)
 *     drawn INSIDE the contour pass in INK at 0.85, a full step darker than
 *     the mauve mound on cream, on ash and under the 0.55 cinematic overlay.
 *     A true projection of the tree was tried first and rejected: squashed
 *     into 230px of ground it collapsed to a black lump at 48px. The house is
 *     222px wide (~1/5 of the frame) with the family's ink contour, a lit
 *     left roof slope and one 54px amber window. The tree has fewer, fatter
 *     sticks: three forked limbs and two low bending limbs, every tip >= 40px
 *     (>= 2px at 48px), tip gaps >= 100px, the trunk 144px at the base.
 *
 * FOURTH PASS, after the arbiter's review of the third (rows 1 and 3 failed,
 * row 2 passed and is untouched to the byte):
 *   - THE DARK AURA WAS NOT A COLOUR. Row 1's halo was already a warm white
 *     above cream in every channel, yet on the native file every soft-alpha
 *     pixel outside the body decoded darker than cream (measured: 87,285 of
 *     87,285, RGB ~ alpha x colour). The kit's canvas composites in
 *     PREMULTIPLIED colour and `savePNG` writes those values straight into a
 *     PNG, which is a STRAIGHT-alpha format, so a halo pixel at alpha 0.1 is
 *     stored as (26,24,21) and every viewer — the review sheet, RN's Image —
 *     composites a near-black smudge. Rows 1 and 3 now go through a local
 *     `down2Straight` that averages the 2x2 supersample the way `down2` does
 *     and then divides colour by alpha, so a glow decodes as the colour it was
 *     drawn in. Row 2 keeps the kit's `down2` (its bloom never leaves the
 *     opaque frame, so it has no soft pixel to correct) and stays byte-identical.
 *   - Row 1's halo is now four stacked flat discs, warm white to cream-white,
 *     widest and faintest at ~460px, densest at the flame (~0.5 cumulative).
 *     On ash it reads as the lantern's light; on cream it reads as nothing,
 *     which is correct. The moths were two pale ovals with a hairline body and
 *     collapsed at 48px into detached nuts, the upper one hovering a hair off
 *     the ring. They are rebuilt bigger (each wingspan ~1/3 of the frame),
 *     drawn as two swept forewing lobes on a FAT ink body with a lit flank,
 *     a round head and stub antennae; the wings are a dusty buff graded to
 *     tan (not cream, which vanished against the brass cap and the pale upper
 *     glass), each part on a grown INK underlay; and each moth's BODY now sits
 *     ON a cage bar over the glass edge — the upper one on the right bar just
 *     under the cap, the lower one on the left bar beside the candle — with its
 *     head turned to the flame, one wing lying on the lit glass and one spread
 *     out into the halo. Nothing detached, one contour. The flame is bigger and
 *     the wax stub smaller so the candle reads as one orange spear at 48px.
 *     The lantern's brass, glass, bars and foot are untouched to the pixel.
 *   - Row 3 was a scene in a medallion: a sky dome on a mound with a pollard of
 *     five fat capsules (a brown club at 48px), a shadow that stopped at the
 *     trunk, a 3% house. The dome is gone. The silhouette is now the TREE on a
 *     low ground mound (~76% of the frame wide) with the house on the mound's
 *     rim, all one `withOutline` pass: a tapered trunk 1/8 of the frame at the
 *     base, five main limbs (~1/16 of the frame at the root) that each FORK
 *     once into two thinner twigs, gaps between tips >= 100px so the crown
 *     stays open at 48px. The cast shadow is a feathered INK wedge laid on the
 *     real canvas after the contour, ~170px wide at the roots, ~45% of the
 *     frame long, tapering to the house's left foot, ~0.5 cumulative alpha —
 *     the subject's second half. The house is ~1/8 of the frame wide (dark
 *     indigo wall, lighter roof, chimney, one warm window 40px square) and
 *     stands where the shadow points; its roof breaks the mound's crest so it
 *     is anchored to the silhouette. The crimson horizon is the mound's own
 *     top 36px with a brighter core line, behind the trunk; the sky glow is
 *     three stacked pale ellipses (lavender-white to rose-white, all above
 *     cream in every channel) behind the crown, outside the contour.
 *
 * Values are pitched for both review grounds. Anything large is kept a full
 * step off ash (#352A31): the window frame is mid wood, not dark wood; the
 * tree's bark grades from a lit tan at the crown down to dark at the roots,
 * and the ground under the tree is a mauve-grey so the tree's own cast shadow
 * has something to be darker than. Only the INK contour (and a bloom lighter
 * than cream) ever touches the ground the emblem is delivered on.
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
/** The lantern's halo, outermost to innermost. Same rule: above cream. */
const HALO = ['#FFF4DC', '#FFF7E4', '#FFFAEC', '#FFFDF4'];
/** The dusk afterglow behind the tree: lavender-white out to rose-white at the
 *  horizon. Above cream in every channel, so on parchment it is nothing and on
 *  the near-black in-engine ground it is a pale evening sky. */
const AFTERGLOW = { high: '#F6EEFF', mid: '#FFF0EA', low: '#FFEDE4' };
const GLASS = { hi: '#FFE9A9', lo: '#EE8E24', heart: '#FFF3C8' };
const FIRE = { out: '#FF8A1E', mid: '#FFD25A', core: '#FFF8E0' };
const WAX = { hi: '#FCF2DC', lo: '#D8C199', drip: '#FFF8E8', shade: '#C9B08A' };
const NIGHT = { hi: '#2B2752', lo: '#0F0D1C', warm: '#E88A2A', warmer: '#FFC060' };
/** Moth wings: pale parchment at the top edge (~0.94 luminance) grading to
 *  tan (~0.65) at the bottom, so the lower half is a full step under cream
 *  and the top a full step over ash and the brass. The wing nearest the
 *  lantern uses the warm pair, a shade more amber, as if lit by the flame.
 *  The hindwing lobe is a step darker than the forewing it sits under. The
 *  body is a dark warm brown with a lighter belly, never black. */
const MOTH = {
  wingHi: '#FBF0D9', wingLo: '#C9A06C', warmHi: '#FFE9B4', warmLo: '#D89C56',
  hindHi: '#E8CFA2', hindLo: '#A8804E', hindWarmHi: '#F6D68F', hindWarmLo: '#BE8644',
  body: '#4E3220', belly: '#8A6238', head: '#3E2818',
};
/** The amber ring of the halo, just outside the glass: an amber-white that
 *  sits above cream (#F3E2BF) in every channel, so on the near-black ceremony
 *  ground it is the lantern's light and on parchment it is nothing. */
const AMBER_HALO = '#FFEEC6';
/** The crimson horizon: a LINE along the ground's back rim, with a brighter
 *  core, and the catch of it on the far house's roof. */
const DUSK = { line: '#C83E56', core: '#EA5E78', glow: '#FFE4DE' };
/** Ground: a mid dusk mauve, top-lit (~0.56 down to ~0.38 luminance; ash is
 *  ~0.18), light enough that a hard INK shadow at 0.7 sits >= 0.2 under it. */
const GROUND = { hi: '#A088B4', lo: '#6E5686' };
const BARK = { crownHi: '#B08A6C', hi: '#9C7458', lo: '#4E3226', rim: '#C49E7E' };
/** The far house: indigo walls (~0.34 at the eave to ~0.22 at the foot, a
 *  step under the mauve ground they stand on and inside the INK contour)
 *  under a darker roof, one warm window. */
const HOUSE = { wallHi: '#6A5AA4', wallLo: '#46387A', roofHi: '#4E3E6E', roofLo: '#2E2248', winHi: '#FFD36A', winLo: '#FFA030', winGlow: '#FFF2CE' };
/** The cast shadow's strength: INK at this alpha, hard-edged, on the ground. */
const SHADOW_ALPHA = 0.7;

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
/** A flatter bloom: full strength out to 40% of the radius, then a linear
 *  fall to zero at the rim, so it reads as one soft disc of light rather than
 *  a hot spot. Stacked, these are the lantern's halo. */
function halo(cv, cx, cy, rx, ry, color, alpha) {
  ellipse(cv, cx, cy, rx, ry, color, alpha, Math.round(rx * 0.6));
}
/**
 * The kit's `down2`, then un-premultiplied. The canvas composites in
 * premultiplied colour (blend() keeps colour * alpha) and a PNG stores STRAIGHT
 * alpha, so handing the averaged values to savePNG as-is turns every soft
 * pixel dark: a warm-white halo at alpha 0.1 is written as (26,24,21). This
 * averages the 2x2 block in premultiplied space (the correct way to downsample)
 * and divides the colour back out by the alpha before quantising.
 */
function down2Straight(cv, ow, oh) {
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const i = ((y * 2 + sy) * cv.w + x * 2 + sx) * 4;
      r += cv.px[i]; g += cv.px[i + 1]; b += cv.px[i + 2]; a += cv.px[i + 3];
    }
    const o = (y * ow + x) * 4;
    if (a > 0) {
      const q = v => Math.max(0, Math.min(255, Math.round((v / a) * 255)));
      out[o] = q(r); out[o + 1] = q(g); out[o + 2] = q(b);
    }
    out[o + 3] = Math.round(a * 63.75);
  }
  return out;
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
/** A tapered stick as a quad: a branch, a twig. */
function stick(x1, y1, x2, y2, w1, w2) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  return [
    [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2],
    [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2],
  ];
}
/** Half-width of an axis-aligned SUPERELLIPSE at scanline y (0 outside it).
 *  n = 2 is the plain ellipse; n = 2.8 keeps the same extents but flattens the
 *  crest, so the mound's top is a wide shelf a house can stand on. */
const superHW = (cx, cy, rx, ry, n) => y => {
  const t = Math.abs((y - cy) / ry);
  return t >= 1 ? 0 : rx * Math.pow(1 - Math.pow(t, n), 1 / n);
};
/** A polygon between two scanlines whose sides follow a half-width function
 *  about the canvas centre. The mound and its crimson crest are two of these
 *  over ONE ellipse function, so the band can never poke past the mound. */
function bandPoly(y0, y1, hw, n = 44) {
  const right = [], left = [];
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    const w = Math.max(0, hw(y));
    right.push([c + w, y]);
    left.push([c - w, y]);
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
/** Closed Catmull-Rom spline through `pts`, `sub` samples per span: a hand-
 *  drawn rounded outline from a handful of control points. The moth's wings. */
function smoothClosed(pts, sub = 6) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}
/**
 * ONE moth seen from ABOVE (head at local -y, wings spread to +-x), rotated by
 * `ang` and scaled by `s`. Built for an 8x downscale: per side a broad
 * rounded-triangle FOREWING (root at the body, apex ~104*s out and a little
 * forward, a scalloped trailing edge) laid over a small HINDWING lobe; a FAT
 * fuzzy body bar clearly visible between the wing roots (dark warm brown with
 * a lighter belly stripe), a round head, and two thin CURVED antennae (9*s
 * core on a 21*s ink underlay) sweeping out and away. Wingspan ~208*s, about
 * 1/5 of the frame. No eye-spots, no veins. Every part lays a grown INK
 * underlay first so the moth keeps its shape where it lies over brass or the
 * halo. `warmSide` (+1 or -1) names the wing nearest the lantern, which takes
 * the amber pair. `mothPoint` exposes the transform for the sheen.
 */
const FORE = [[12, -34], [46, -56], [82, -62], [106, -50], [100, -20], [86, 4], [66, 2], [48, 18], [26, 22], [12, 12]];
const HIND = [[14, 22], [46, 20], [80, 34], [76, 62], [46, 74], [14, 58]];
const wingPts = (pts, sgn) => smoothClosed(pts.map(([x, y]) => [x * sgn, y]), 6);
function mothPoint(mx, my, ang, s, [lx, ly]) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  return [mx + (lx * ca - ly * sa) * s, my + (lx * sa + ly * ca) * s];
}
/** Antenna: a quadratic from the head out to the tip, as 4 capsule segments. */
function antennaPts(sgn) {
  const a = [sgn * 5, -58], m = [sgn * 26, -96], b = [sgn * 50, -104], out = [];
  for (let i = 0; i <= 4; i++) {
    const u = i / 4;
    out.push([(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * m[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * m[1] + u * u * b[1]]);
  }
  return out;
}
function moth(t, mx, my, ang, s, warmSide) {
  const P = p => mothPoint(mx, my, ang, s, p);
  const G = 11 * s;
  const fore = { [-1]: wingPts(FORE, -1).map(P), [1]: wingPts(FORE, 1).map(P) };
  const hind = { [-1]: wingPts(HIND, -1).map(P), [1]: wingPts(HIND, 1).map(P) };
  for (const sgn of [-1, 1]) {                            // ink underlays first
    poly(t, grow(hind[sgn], G), INK, 0.95);
    poly(t, grow(fore[sgn], G), INK, 0.95);
    for (const [[x1, y1], [x2, y2]] of antennaPts(sgn).slice(1).map((p, i) => [antennaPts(sgn)[i], p]).map(([a, b]) => [P(a), P(b)]))
      capsule(t, x1, y1, x2, y2, 21 * s, INK, 0.95);
  }
  const [b0x, b0y] = P([0, -40]), [b1x, b1y] = P([0, 56]);
  capsule(t, b0x, b0y, b1x, b1y, 54 * s, INK, 0.95);
  const [hx, hy] = P([0, -52]);
  ellipse(t, hx, hy, 27 * s, 26 * s, INK, 0.95, 2);
  for (const sgn of [-1, 1]) {                            // hindwing, then forewing over it
    const warm = sgn === warmSide;
    poly(t, hind[sgn], warm ? MOTH.hindWarmHi : MOTH.hindHi, 1, warm ? MOTH.hindWarmLo : MOTH.hindLo);
    poly(t, fore[sgn], warm ? MOTH.warmHi : MOTH.wingHi, 1, warm ? MOTH.warmLo : MOTH.wingLo);
  }
  capsule(t, b0x, b0y, b1x, b1y, 38 * s, MOTH.body, 1);   // the fat fuzzy body between the wings
  const [f0x, f0y] = P([-5, -30]), [f1x, f1y] = P([-5, 46]);
  capsule(t, f0x, f0y, f1x, f1y, 11 * s, MOTH.belly, 0.85);
  const [t0x, t0y] = P([0, -18]);
  ellipse(t, t0x, t0y, 22 * s, 16 * s, MOTH.belly, 0.45, 8);   // thorax fuzz
  ellipse(t, hx, hy, 18 * s, 17 * s, MOTH.head, 1, 2);
  for (const sgn of [-1, 1]) {                            // the curved antennae
    const pts = antennaPts(sgn).map(P);
    for (let i = 1; i < pts.length; i++) capsule(t, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 9 * s, MOTH.body, 1);
  }
}

export function draw() {
  fs.mkdirSync(OUT, { recursive: true });

  { // === ceremony_curious.png — the lit lantern and its two moths ===========
    // A standing hand lantern: ring, finial, peaked brass cap, amber glass with
    // a candle flame, two dark corner bars, a brass foot. The two moths CIRCLE
    // it: the upper one outside the lantern to the upper-right, heading left
    // with its head at the cap's corner; the lower one outside the glass to
    // the lower-left, heading up-right with one wingtip on the left rail. Both
    // touch the lantern, so the outline pass draws one contour round all
    // three; neither crosses the glass, so the flame is unoccluded. The halo
    // is four stacked flat discs of warm white plus an amber-white ring just
    // outside the glass, the lantern's light they have come to.
    const cv = C(S, S);
    halo(cv, c, 545, 460, 460, HALO[0], 0.12);
    halo(cv, c, 548, 360, 360, HALO[1], 0.14);
    halo(cv, c, 552, 260, 260, HALO[2], 0.18);
    halo(cv, c, 548, 318, 352, AMBER_HALO, 0.34);
    bloom(cv, c, 560, 170, 200, HALO[3], 0.24);
    shadow(cv, c + 22, 890, 250, 34, 0.32);
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
      // a short wax stub and one tall flame: three tongues on one spear
      roundRect(t, c, 712, 24, 40, 8, WAX.hi, 1, WAX.lo);
      capsule(t, c, 668, c, 652, 8, INK, 0.9);
      flameLobe(t, c, 372, 672, 70, FIRE.out);
      flameLobe(t, c, 446, 670, 46, FIRE.mid);
      flameLobe(t, c, 530, 668, 22, FIRE.core);
      // corner bars, with a brass edge catching the light
      for (const dx of [-150, 150]) {
        capsule(t, c + dx, 316, c + dx, 770, 26, INK, 0.95);
        capsule(t, c + dx - 6, 322, c + dx - 6, 764, 7, BRASS.hi, 0.6);
      }
      // rail, foot, base plate
      roundRect(t, c, 776, 176, 16, 6, BRASS.hi, 1, BRASS.lo);
      roundRect(t, c, 812, 120, 22, 8, BRASS.lo, 1, '#6E4A1E');
      roundRect(t, c, 848, 170, 20, 8, BRASS.hi, 1, BRASS.lo);
      // the two moths circling the light: upper-right, heading left so the
      // head touches only the cap's corner (its lower wing is the lit one);
      // lower-left, heading up-right, one wingtip on the left rail (its
      // right wing is the lit one). Body axes ~90 degrees apart.
      moth(t, 764, 300, -1.95, 1.05, -1);
      moth(t, 262, 634, 0.6, 1.0, 1);
    }, { width: RING_W });
    sheen(cv, c - 100, 268, 40, 12, 0.4);
    sheen(cv, c - 92, 380, 22, 60, 0.45);
    { // one sheen on the canvas-upper-left wing of each moth
      const [ax, ay] = mothPoint(764, 300, -1.95, 1.05, [-70, -34]);
      sheen(cv, ax, ay, 16, 10, 0.45);
      const [bx, by] = mothPoint(262, 634, 0.6, 1.0, [-70, -34]);
      sheen(cv, bx, by, 16, 10, 0.45);
    }
    savePNG(path.join(OUT, 'ceremony_curious.png'), 512, 512, down2Straight(cv, 512, 512));
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

  { // === ceremony_shadows.png — a dead tree throwing a long shadow ==========
    // ONE grounded silhouette, centred: a low wide ELLIPSE of mauve dusk
    // ground (840 x 352: x 92..932, y 548..900, centre 724) with the tree
    // standing forward on its left half and a SMALL house two-thirds of the
    // way back on its right. A thin crimson LINE runs along the ground's back
    // rim from the left shoulder to just behind the house, never a slab. The
    // cast shadow is the subject's second element: ONE hard-edged INK wedge
    // at 0.7 laid on the ground from the trunk's foot, at trunk width,
    // fanning right across the ground to ~1/4 of the frame tall where its far
    // edge meets the house's foundation. It is painted on the opaque ground
    // before the tree and house, so the contour pass never sees it as an
    // edge — a shadow is never outlined. The tree is a tapered trunk (144px
    // at the base) with three limbs that each fork once and one low limb;
    // every stick is >= 40px wide at its tip (>= 2px at 48px) and every tip
    // gap >= 100px. The afterglow behind the crown and the rose glow above
    // the horizon are drawn first, outside the contour, in stops above cream;
    // the window's warm glow is laid over the contour last.
    const cv = C(S, S);
    const GX = 512, GY = 724, GRX = 420, GRY = 176;
    const GROUND_HW = superHW(GX, GY, GRX, GRY, 2);       // a plain ellipse
    const DY = 26;                                         // the tree's shift down onto the ground
    /** The tree's sticks (x1, y1, x2, y2, rootWidth, tipWidth): three main
     *  limbs that each fork once, one low limb that bends once. */
    const LIMBS = [
      [316, 512, 210, 350, 80, 52], [354, 482, 368, 270, 82, 54], [388, 516, 518, 350, 78, 52],
      [402, 606, 542, 546, 66, 44],
    ].map(([x1, y1, x2, y2, w1, w2]) => [x1, y1 + DY, x2, y2 + DY, w1, w2]);
    const TWIGS = [
      [210, 350, 144, 268, 52, 40], [210, 350, 226, 214, 52, 40],
      [368, 270, 320, 168, 54, 40], [368, 270, 440, 174, 54, 40],
      [518, 350, 582, 244, 52, 40], [518, 350, 626, 336, 52, 40],
      [542, 546, 622, 500, 44, 40],
    ].map(([x1, y1, x2, y2, w1, w2]) => [x1, y1 + DY, x2, y2 + DY, w1, w2]);
    halo(cv, 370, 430 + DY, 380, 330, AFTERGLOW.high, 0.12);
    halo(cv, 380, 490 + DY, 290, 250, AFTERGLOW.mid, 0.14);
    halo(cv, 512, 556, 400, 96, DUSK.glow, 0.32);                       // the rose horizon glow
    bloom(cv, 512, 470, 380, 150, AFTERGLOW.low, 0.16);
    shadow(cv, c + 18, 908, 380, 26, 0.3);
    withOutline(cv, t => {
      // -- the ground: one low wide ellipse, top-lit --
      poly(t, bandPoly(GY - GRY, GY + GRY, GROUND_HW, 60), GROUND.hi, 1, GROUND.lo);
      // -- the crimson horizon LINE along the back rim (26px = 1/40 frame),
      //    from the left shoulder to just behind the house, a brighter core --
      const rim = th => [GX + (GRX - 16) * Math.cos(th), GY - (GRY - 16) * Math.sin(th)];
      const HZ = [];
      for (let i = 0; i <= 24; i++) HZ.push(rim((150 - (150 - 49) * (i / 24)) * Math.PI / 180));
      for (let i = 1; i < HZ.length; i++) capsule(t, HZ[i - 1][0], HZ[i - 1][1], HZ[i][0], HZ[i][1], 26, DUSK.line, 1);
      for (let i = 1; i < HZ.length; i++) capsule(t, HZ[i - 1][0], HZ[i - 1][1], HZ[i][0], HZ[i][1], 10, DUSK.core, 0.8);
      // -- the trunk's own small contact ellipse at its foot --
      ellipse(t, 342, 762 + DY, 92, 16, INK, 0.38, 30);
      // -- the cast shadow: ONE hard INK wedge from the trunk's foot, fanning
      //    right to the house's foundation, clamped to the ground's rim --
      const WEDGE_X0 = 380, WEDGE_X1 = 790;
      const wedgeTop = x => 746 + ((x - WEDGE_X0) / (WEDGE_X1 - WEDGE_X0)) * (598 - 746);
      const wedgeBot = x => 830 + ((x - WEDGE_X0) / (WEDGE_X1 - WEDGE_X0)) * (850 - 830);
      const top = [], bot = [];
      for (let i = 0; i <= 20; i++) {
        const x = WEDGE_X0 + ((WEDGE_X1 - WEDGE_X0) * i) / 20;
        const hh = Math.max(0, GRY * Math.sqrt(Math.max(0, 1 - ((x - GX) / GRX) ** 2)) - 4);
        top.push([x, Math.max(GY - hh, wedgeTop(x))]);
        bot.push([x, Math.min(GY + hh, wedgeBot(x))]);
      }
      poly(t, top.concat(bot.reverse()), INK, SHADOW_ALPHA);
      // -- the far house, ~1/6 of the frame, foot two-thirds of the way back --
      const WALL = [[792, 622], [900, 622], [900, 690], [792, 690]];
      const GABLE = [[778, 626], [914, 626], [846, 530]];
      const CHIM = [[878, 560], [900, 560], [900, 606], [878, 606]];
      poly(t, grow(CHIM, 10), INK, 0.95);
      poly(t, grow(WALL, 12), INK, 0.95);
      poly(t, grow(GABLE, 12), INK, 0.95);
      poly(t, CHIM, HOUSE.roofHi, 1, HOUSE.roofLo);
      poly(t, WALL, HOUSE.wallHi, 1, HOUSE.wallLo);
      poly(t, GABLE, HOUSE.roofHi, 1, HOUSE.roofLo);
      capsule(t, 784, 620, 846, 536, 12, DUSK.line, 0.9);                  // the horizon-side slope caught in crimson
      roundRect(t, 846, 660, 26, 26, 5, INK, 0.95);
      roundRect(t, 846, 660, 22, 22, 4, HOUSE.winHi, 1, HOUSE.winLo);      // the one lit window (44px)
      // -- the bare tree: a tapered trunk, three forked limbs, one low limb --
      const TRUNK = [[270, 762], [300, 620], [310, 470], [396, 470], [406, 620], [414, 762]].map(([x, y]) => [x, y + DY]);
      const ROOT_L = [[246, 764], [300, 690], [322, 764]].map(([x, y]) => [x, y + DY]);
      const ROOT_R = [[366, 764], [394, 690], [436, 764]].map(([x, y]) => [x, y + DY]);
      const limb = (x1, y1, x2, y2, w1, w2, hi) => {
        capsule(t, x2, y2, x2, y2, w2, hi, 1);                             // rounded tip
        capsule(t, x1, y1, x1, y1, w1, BARK.lo, 1);                        // rounded root
        poly(t, stick(x1, y1, x2, y2, w1, w2), hi, 1, BARK.lo);
      };
      for (const [x1, y1, x2, y2, w1, w2] of TWIGS) limb(x1, y1, x2, y2, w1, w2, BARK.crownHi);
      for (const [x1, y1, x2, y2, w1, w2] of LIMBS) limb(x1, y1, x2, y2, w1, w2, BARK.hi);
      poly(t, TRUNK, BARK.hi, 1, BARK.lo);
      poly(t, ROOT_L, BARK.lo, 1);
      poly(t, ROOT_R, BARK.lo, 1);
      capsule(t, 322, 486 + DY, 294, 750 + DY, 18, BARK.rim, 0.6);         // lit left flank
      capsule(t, 386, 490 + DY, 398, 750 + DY, 16, INK, 0.45);              // shaded right flank
    }, { width: RING_W });
    sheen(cv, 326, 520 + DY, 12, 40, 0.4);
    bloom(cv, 846, 660, 56, 56, HOUSE.winGlow, 0.42);                     // the window's glow, over the contour
    savePNG(path.join(OUT, 'ceremony_shadows.png'), 512, 512, down2Straight(cv, 512, 512));
  }
}

// Allow `node scripts/tools/gameIcons/ceremony.mjs` for a solo render.
if (process.argv[1] && process.argv[1].endsWith('ceremony.mjs')) draw();
