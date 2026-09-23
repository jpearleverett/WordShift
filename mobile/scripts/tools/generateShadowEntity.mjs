/**
 * Draws the entity that holds the house (assets/environment/entity_*.png).
 *
 * Three pieces, each a dark body plus a separate white RIM image that
 * HouseWorld tints per phase (a near-black silhouette over the near-black late
 * skies only reads by its backlit edge):
 *   entity_head      hood, face void, shoulders and the tops of both arms,
 *                    rising over the roof (1200x900)
 *   entity_arm       one forearm, stretched down the side of the house (200x1000)
 *   entity_hand      a left hand gripping the foundation corner; the right one
 *                    is the same image mirrored (720x600)
 *
 * Shapes are signed-distance fields (a polygon for the hood and shoulders,
 * tapered strokes for arms and fingers, an ellipse for the palm), so the edges
 * anti-alias cleanly and the rim follows the silhouette exactly. The joins are
 * sized in HouseWorld's dp (ENTITY_* constants there): the head's arm columns
 * end 119 px wide at x 1038..1158, the arm strip is 160 px wide at the top and
 * 120 px at the bottom, and the hand's wrist is 150 px wide at x 75..225.
 * Deterministic. Run from mobile/: node scripts/tools/generateShadowEntity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../../assets/environment');

// ── geometry helpers ──────────────────────────────────────────────────────
const cubic = (p0, p1, p2, p3, n = 24) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
};
/** A closed path from cubic segments [[p0,c1,c2,p1],[.., c1, c2, p2], ...]. */
const path_ = (start, segs) => {
  let pts = [start];
  let cur = start;
  for (const [c1, c2, end] of segs) {
    pts = pts.concat(cubic(cur, c1, c2, end).slice(1));
    cur = end;
  }
  return pts;
};
const mirrorX = (pts, cx) => pts.map(([x, y]) => [2 * cx - x, y]);

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return [Math.sqrt(qx * qx + qy * qy), t];
}
/** Signed distance to a closed polygon (negative inside). */
function polySdf(poly) {
  return (px, py) => {
    let d = Infinity, inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[j], [bx, by] = poly[i];
      const [s] = segDist(px, py, ax, ay, bx, by);
      if (s < d) d = s;
      if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
    }
    return inside ? -d : d;
  };
}
/** Tapered stroke along a polyline: radius r0 at the start, r1 at the end. */
function strokeSdf(pts, r0, r1) {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = lens[lens.length - 1];
  return (px, py) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [s, t] = segDist(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      const along = (lens[i - 1] + t * (lens[i] - lens[i - 1])) / total;
      const r = r0 + (r1 - r0) * Math.pow(along, 0.8);
      const d = s - r;
      if (d < best) best = d;
    }
    return best;
  };
}
const ellipseSdf = (cx, cy, rx, ry) => (px, py) => {
  const k = Math.hypot((px - cx) / rx, (py - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
};
const union = (...fs_) => (px, py) => {
  let d = Infinity;
  for (const f of fs_) { const v = f(px, py); if (v < d) d = v; }
  return d;
};

/** Deterministic ragged-edge noise: a few incommensurate sine layers. */
const ragged = (amp, scale = 1) => (px, py) =>
  amp * (Math.sin(px * 0.031 * scale + py * 0.017 * scale) * 0.5
    + Math.sin(px * 0.071 * scale - py * 0.043 * scale + 1.7) * 0.3
    + Math.sin(px * 0.013 * scale + py * 0.119 * scale + 4.1) * 0.2);
const roughen = (f, n) => (px, py) => f(px, py) + n(px, py);

// ── rendering ─────────────────────────────────────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/**
 * body(x,y) -> [r,g,b] shading; sdf -> coverage; rimMask(x,y) scales the rim
 * (0 where an edge is a cut the other piece continues, e.g. the arm columns).
 */
function render(name, w, h, sdf, body, rimMask = () => 1, bbox = null) {
  const bodyPng = new PNG({ width: w, height: h });
  const rimPng = new PNG({ width: w, height: h });
  const [x0, y0, x1, y1] = bbox ?? [0, 0, w, h];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
      const d = sdf(x + 0.5, y + 0.5);
      if (d > 26) continue;
      const cov = Math.max(0, Math.min(1, 0.5 - d / 1.2));
      if (cov > 0) {
        const [r, g, b] = body(x, y, d);
        bodyPng.data[i] = r; bodyPng.data[i + 1] = g; bodyPng.data[i + 2] = b;
        bodyPng.data[i + 3] = Math.round(cov * 255);
      }
      // Rim: a thin bright line just inside the edge plus a soft glow outside.
      let rim = 0;
      if (d <= 0) rim = Math.max(0, 1 - -d / 7) * 0.95;
      else rim = Math.pow(Math.max(0, 1 - d / 24), 2) * 0.55;
      rim *= rimMask(x, y);
      if (rim > 0.002) {
        rimPng.data[i] = 255; rimPng.data[i + 1] = 255; rimPng.data[i + 2] = 255;
        rimPng.data[i + 3] = Math.round(Math.min(1, rim) * 255);
      }
    }
  }
  fs.writeFileSync(path.join(OUT, `${name}.png`), PNG.sync.write(bodyPng));
  fs.writeFileSync(path.join(OUT, `${name}_rim.png`), PNG.sync.write(rimPng));
  console.log(`wrote ${name}.png + ${name}_rim.png`);
}

const TOP = hex('#2A1F38');
const LOW = hex('#140E1C');
const VOID = hex('#040205');
const shade = (y, h, extra = 0) => {
  const t = Math.min(1, Math.max(0, y / h + extra));
  return [lerp(TOP[0], LOW[0], t), lerp(TOP[1], LOW[1], t), lerp(TOP[2], LOW[2], t)];
};

// ── head, hood and shoulders (1200 x 900) ───────────────────────────────────
{
  const W = 1200, H = 900, C = 600;
  // Right half, from the hood tip clockwise down to the right arm, then back
  // along the (off-canvas) bottom. The left half is its mirror, except the
  // tip, which droops a little to the viewer's right.
  const segs = [
    [[C + 70, 60], [C + 175, 170], [C + 190, 320]],        // crown of the hood
    [[C + 200, 430], [C + 175, 500], [C + 160, 560]],      // hood falls to the collar
    [[C + 250, 590], [C + 380, 620], [C + 455, 680]],      // shoulder slope
    [[C + 520, 730], [C + 560, 790], [C + 558, 1000]],     // shoulder cap into the arm's outer edge
  ];
  const right = path_([C + 30, 26], segs);
  const left = mirrorX(path_([C + 30, 26], segs), C).reverse();
  const hood = roughen(polySdf([...right, [C - 558, 1000], ...left]), (x, y) => ragged(y > 560 ? 7 : 3)(x, y));
  // The face opening, darker than the cloth around it.
  const face = ellipseSdf(C + 4, 350, 96, 140);
  render('entity_head', W, H, hood, (x, y) => {
    const f = face(x + 0.5, y + 0.5);
    const base = shade(y, H * 1.1, -0.1);
    // A fold down the hood's crown and one down each shoulder, barely there.
    const fold = Math.exp(-Math.pow((x - C - 10) / 18, 2)) * Math.max(0, 1 - y / 260) * 0.35;
    const k = 1 - fold;
    const inFace = Math.max(0, Math.min(1, 0.5 - f / 14));
    return [0, 1, 2].map((c) => Math.round(lerp(base[c] * k, VOID[c], inFace)));
  },
  // No rim where the arms leave the canvas to join the arm strips.
  (x, y) => (y > H - 60 ? Math.max(0, (H - y) / 60) : 1));
}

// ── one forearm (200 x 1000), stretched down the house ──────────────────────
{
  const W = 200, H = 1000, C = 100;
  // A straight tapered column (160 px at the top, 120 at the wrist) with a
  // slight elbow bulge; it runs off both ends so neither end gets a rim.
  const pts = [];
  for (let y = -60; y <= H + 60; y += 10) pts.push([C, y]);
  const arm = (px, py) => {
    const t = Math.min(1, Math.max(0, py / H));
    const half = lerp(80, 60, t) + Math.exp(-Math.pow((t - 0.42) / 0.08, 2)) * 9;
    return Math.abs(px - C) - half + ragged(5, 1.6)(px, py);
  };
  void pts;
  render('entity_arm', W, H, arm, (x, y) => {
    const base = shade(y, H, 0.35);
    // Rounded: lighter down the middle of the limb, darker at its sides.
    const k = 1 - Math.pow(Math.abs(x - C) / 80, 2) * 0.25;
    return base.map((v) => Math.round(v * k));
  });
}

// ── the left hand, gripping the foundation corner (720 x 600) ───────────────
{
  const W = 720, H = 600;
  const wrist = strokeSdf([[150, -80], [150, 40], [158, 130]], 75, 80);
  const palm = ellipseSdf(195, 205, 125, 125);
  // Four long fingers over the foundation's face, each curling down to a claw;
  // a thumb wrapping the corner below them.
  const finger = (y, reach, drop, r0) => {
    const pts = cubic([240, y], [240 + reach * 0.45, y - 30], [240 + reach * 0.88, y - 6], [240 + reach, y + drop], 28);
    // Knuckles: a slight swelling of the finger at each joint, not a bead.
    const joints = [0.3, 0.62].map((t) => [pts[Math.round(t * 28)], r0 * (1 - Math.pow(t, 0.8)) * 1.22]);
    return union(strokeSdf(pts, r0, 1.2), ...joints.map(([[kx, ky], r]) => ellipseSdf(kx, ky, r, r)));
  };
  const hand = union(
    wrist, palm,
    finger(125, 370, 58, 34),
    finger(182, 420, 66, 36),
    finger(240, 400, 64, 34),
    finger(295, 320, 58, 30),
    strokeSdf(cubic([150, 250], [110, 340], [150, 410], [235, 440], 24), 38, 1.2),
  );
  // The same dark as the forearm's wrist, so the join behind the palm is
  // invisible; the fingers lift a little toward the tips.
  render('entity_hand', W, H, hand, (x) => {
    const t = Math.max(0, Math.min(1, (x - 240) / 420));
    return [0, 1, 2].map((c) => Math.round(lerp(LOW[c], TOP[c], t * 0.5)));
  },
  // The wrist runs off the top to meet the forearm: no rim along that cut.
  (x, y) => (y < 40 ? Math.max(0, y / 40) : 1));
}
