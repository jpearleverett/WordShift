#!/usr/bin/env python3
"""Paint framing-identical robedTalk.png frames.

Each mouth is sized and placed from the official idle→talk reference,
anchored to that animal's ROBED nose/beak (idle and robe faces do not
share a mouth origin). Cult tones: dark cavity, muted tongue, dim teeth.

Axolotl is skipped (scuba mask; talk === idle by design).

Re-run:  python3 scripts/tools/paintRobedTalk.py
Then:    node scripts/tools/sanitizePng.mjs assets/characters/*/robedTalk.png
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "assets" / "characters"

# cx, cy, rx, ry, kind
# kind: mammal | toothy | beak | snout
# Measured against official talk.png mouths, placed on the ROBED face
# relative to that animal's nose/beak (not the cozy-costume mouth origin).
MOUTHS: dict[str, tuple[int, int, int, int, str]] = {
    # lime-forward on the white snout, sized to the official D-opening
    "fox": (310, 226, 18, 12, "mammal"),
    # cyan — open at the snout TIP, not the cheek
    "pangolin": (368, 182, 20, 13, "snout"),
    # yellow — replace the beak, not a hole under it
    "owl": (308, 198, 12, 12, "beak"),
    # just under the black nose, talk-sized
    "capybara": (256, 228, 20, 16, "toothy"),
    # lower on the muzzle than the closed dash, talk-wide
    "fennec_fox": (250, 252, 22, 18, "toothy"),
    "red_panda": (268, 216, 14, 10, "mammal"),
    # lower on the cream face, half-face wide
    "sloth": (268, 222, 22, 14, "toothy"),
    "wombat": (250, 234, 18, 12, "toothy"),
    # centered under the nose, not the chin
    "rabbit": (250, 228, 16, 11, "mammal"),
    "tarsier": (256, 180, 9, 8, "mammal"),
    "aye_aye": (272, 186, 10, 9, "mammal"),
    # below the beak tip (the official talk opening), not on the keratin
    "kakapo": (278, 188, 12, 11, "beak"),
}

CAVITY = np.array([20, 8, 12, 255], dtype=np.uint8)
TONGUE = np.array([128, 52, 60, 255], dtype=np.uint8)
TONGUE_LO = np.array([96, 36, 44, 255], dtype=np.uint8)
TEETH = np.array([188, 172, 156, 255], dtype=np.uint8)
LIP = np.array([46, 26, 28, 255], dtype=np.uint8)


def in_ellipse(x: int, y: int, cx: int, cy: int, rx: int, ry: int) -> bool:
    return ((x - cx) / max(rx, 1)) ** 2 + ((y - cy) / max(ry, 1)) ** 2 <= 1.0


def paint(arr: np.ndarray, cx: int, cy: int, rx: int, ry: int, kind: str) -> np.ndarray:
    out = arr.copy()
    h, w = arr.shape[:2]
    y0, y1 = max(0, cy - ry - 2), min(h, cy + ry + 3)
    x0, x1 = max(0, cx - rx - 2), min(w, cx + rx + 3)
    painted = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if arr[y, x, 3] < 20:
                continue
            if not in_ellipse(x, y, cx, cy, rx, ry):
                continue
            dest_lum = int(arr[y, x, 0]) + int(arr[y, x, 1]) + int(arr[y, x, 2])
            # Allow punching the opening through face AND a little chin, but
            # never spray cavity across a dark robe collar far from center.
            inner = in_ellipse(x, y, cx, cy, max(1, rx - 2), max(1, ry - 2))
            if dest_lum < 55 and not inner:
                continue
            if not in_ellipse(x, y, cx, cy, max(1, rx - 1), max(1, ry - 1)):
                out[y, x] = LIP
            else:
                # Lower third of the opening is tongue.
                local = (y - (cy - ry)) / max(2 * ry, 1)
                if local > 0.55:
                    out[y, x] = TONGUE if local < 0.82 else TONGUE_LO
                else:
                    out[y, x] = CAVITY
            painted += 1

    if kind == "toothy":
        # A short row of dim teeth along the upper inner lip.
        ty = cy - max(2, ry // 2)
        half = max(3, rx - 3)
        for x in range(cx - half, cx + half + 1):
            if 0 <= ty < h and 0 <= x < w and in_ellipse(x, ty, cx, cy, rx, ry):
                if (x - cx + half) % 3 != 2:
                    out[ty, x] = TEETH
                    if ty + 1 < h and in_ellipse(x, ty + 1, cx, cy, rx, ry):
                        out[ty + 1, x] = TEETH

    if painted < 30:
        raise SystemExit(f"painted only {painted} px at ({cx},{cy}) r={rx}x{ry} — miss")
    return out


def main() -> None:
    for name, (cx, cy, rx, ry, kind) in MOUTHS.items():
        src = ROOT / name / "robed.png"
        dest = ROOT / name / "robedTalk.png"
        arr = np.array(Image.open(src).convert("RGBA"))
        painted = paint(arr, cx, cy, rx, ry, kind)
        Image.fromarray(painted).save(dest, "PNG")
        n = int(np.any(painted != arr, axis=2).sum())
        print(f"wrote {dest.relative_to(ROOT.parent.parent)}  ({n} px)")


if __name__ == "__main__":
    main()
