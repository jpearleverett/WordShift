#!/usr/bin/env python3
"""Paint framing-identical robedTalk.png frames.

Copies each animal's robed.png and opens a small mid-chant mouth in place.
Axolotl is skipped (scuba mask; talk === idle by design).

Re-run:  python3 scripts/tools/paintRobedTalk.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "assets" / "characters"

# cx, cy, rx, ry, kind
# kind: mammal (dark oval + tiny tongue) | beak (dark wedge) | snout (underside slit)
MOUTHS: dict[str, tuple[int, int, int, int, str]] = {
    "fox": (262, 208, 6, 3, "mammal"),
    "pangolin": (322, 180, 7, 3, "snout"),
    "owl": (310, 198, 7, 6, "beak"),
    "capybara": (246, 232, 9, 4, "mammal"),
    "fennec_fox": (252, 206, 6, 3, "mammal"),
    "red_panda": (234, 194, 7, 4, "mammal"),
    "sloth": (255, 216, 7, 3, "mammal"),
    "wombat": (258, 218, 6, 3, "mammal"),
    "rabbit": (252, 200, 6, 3, "mammal"),
    "tarsier": (256, 178, 5, 3, "mammal"),
    "aye_aye": (270, 178, 6, 3, "mammal"),
    "kakapo": (276, 164, 5, 4, "beak"),
}

INTERIOR = {
    "mammal": (28, 16, 20, 255),
    "beak": (42, 18, 22, 255),
    "snout": (32, 20, 16, 255),
}
TONGUE = (140, 62, 72, 255)
LIP = (48, 28, 28, 255)


def in_ellipse(x: int, y: int, cx: int, cy: int, rx: int, ry: int) -> bool:
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0


def paint(arr: np.ndarray, cx: int, cy: int, rx: int, ry: int, kind: str) -> np.ndarray:
    out = arr.copy()
    interior = np.array(INTERIOR[kind], dtype=np.uint8)
    h, w = arr.shape[:2]
    for y in range(max(0, cy - ry - 1), min(h, cy + ry + 2)):
        for x in range(max(0, cx - rx - 1), min(w, cx + rx + 2)):
            px = arr[y, x]
            if px[3] < 20:
                continue
            if not in_ellipse(x, y, cx, cy, rx, ry):
                continue
            lum = int(px[0]) + int(px[1]) + int(px[2])
            # Never punch a hole in the dark robe collar — only face / existing lip.
            if lum < 90 and not in_ellipse(x, y, cx, cy, max(2, rx - 2), max(1, ry - 1)):
                continue
            # Outer ring stays a darker lip so the opening reads as a mouth.
            on_rim = not in_ellipse(x, y, cx, cy, max(2, rx - 1), max(1, ry - 1))
            if on_rim:
                out[y, x] = LIP
            else:
                out[y, x] = interior
    if kind == "mammal" and 0 <= cy + 1 < h and 0 <= cx < w:
        if in_ellipse(cx, cy + 1, cx, cy, rx, ry):
            out[cy + 1, cx] = TONGUE
            if cx + 1 < w:
                out[cy + 1, cx + 1] = TONGUE
    if kind == "beak" and 0 <= cy < h and 0 <= cx < w:
        out[cy, cx] = TONGUE
    return out


def main() -> None:
    for name, (cx, cy, rx, ry, kind) in MOUTHS.items():
        src = ROOT / name / "robed.png"
        dest = ROOT / name / "robedTalk.png"
        arr = np.array(Image.open(src).convert("RGBA"))
        painted = paint(arr, cx, cy, rx, ry, kind)
        if np.array_equal(arr, painted):
            raise SystemExit(f"{name}: paint changed nothing — mouth coords miss the face")
        Image.fromarray(painted).save(dest, "PNG")
        print(f"wrote {dest.relative_to(ROOT.parent.parent)}")


if __name__ == "__main__":
    main()
