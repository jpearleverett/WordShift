#!/usr/bin/env python3
"""Package the verified campaign, preserving raw inputs and reproducible layouts."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

parser = argparse.ArgumentParser()
parser.add_argument("--partial", action="store_true", help="Create a clearly labelled review package with finished artwork, copy, and pending-capture layout sources.")
parser.add_argument("--without-video", action="store_true", help="Allow an explicitly image-only checkpoint package.")
parser.add_argument("--output", type=Path, help="Optional ZIP destination.")
args = parser.parse_args()
mobile = Path(__file__).resolve().parents[2]
source = mobile / "assets" / "Play_store" / "launch-2026-09-v2"
destination = args.output or mobile / "store-output" / ("WordShift-Play-Store-Refresh-Review.zip" if args.partial else "WordShift-Play-Store-Refresh-Images.zip" if args.without_video else "WordShift-Play-Store-Refresh.zip")
manifest = json.loads((source / "manifest.json").read_text())
listing = json.loads((source / "copy" / "listing-en-US.json").read_text())
if not args.partial:
    assert manifest["status"] == "image-assets-complete", "Export all images first, or use --partial for an explicitly unfinished review package."
    assert len(list((source / "upload" / "phone").glob("*.png"))) == 8, "Exactly eight default phone images are required."
for asset in manifest["assets"]:
    file = source / asset["file"]
    assert file.is_file(), f"Missing export: {file}"
    assert hashlib.sha256(file.read_bytes()).hexdigest() == asset["sha256"], f"Export changed since manifest generation: {file}"
if not args.partial:
    assert (source / "raw" / "provenance.json").is_file(), "Record actual screenshot capture provenance first."
    assert (source / "variants" / f'{listing["opener_challenger"]["slug"]}.png').is_file(), "Supply the separately packaged opener challenger."
    assert json.loads((source / "source" / "layouts" / "opener-crops.json").read_text()).get("reviewed") is True, "Visually review the genuine before/after crops before packaging."
assert (source / "variants" / "store-icon-challenger-512.png").is_file(), "Supply the separately packaged icon challenger."
video = source / "upload" / "video" / "wordshift-trailer-30s.mp4"
if not args.without_video and not args.partial:
    assert video.is_file(), "The complete campaign requires the 30-second trailer."
    video_entry = next((a for a in manifest["assets"] if a["file"] == "upload/video/wordshift-trailer-30s.mp4"), None)
    assert video_entry, "Re-run buildRefresh.mjs after rendering the trailer to checksum it."
    assert video_entry["width"] == 1080 and video_entry["height"] == 1920, "Trailer must be 1080×1920."
    assert 29.9 <= video_entry["duration_seconds"] <= 30.1, "Trailer must be 30 seconds."

# Standalone preview duplicates every image as base64 and is delivered separately.
# The relative preview in this ZIP opens against the same upload images.
excluded_names = {"preview-standalone.html", ".DS_Store"}
files = [p for p in sorted(source.rglob("*")) if p.is_file() and p.name not in excluded_names and p.suffix != ".zip" and not any(part in {"tmp", "temp", "frames"} for part in p.relative_to(source).parts)]
destination.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
    if args.partial:
        entry = ZipInfo("WordShift-Play-Store-Refresh/REVIEW-PACKAGE-STATUS.txt", (2026, 9, 17, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        phone_count = sum(asset["file"].startswith("upload/phone/") for asset in manifest["assets"])
        missing = "\n".join(manifest.get("missing_sources", [])) or "See the capture and trailer review records."
        archive.writestr(entry, f"PARTIAL REVIEW PACKAGE\n\nFinished: feature graphic, retained icon, icon challenger, listing copy, and production layout/edit sources.\nCurrent phone exports: {phone_count}/8. Production trailer present: {video.is_file()}.\n\nPending inputs/review:\n{missing}\n\nSigned Android comparison and publication are not established by this export. This is a review bundle, not a completed store submission. See manifest.json for exact files and source status.\n")
    for file in files:
        entry = ZipInfo("WordShift-Play-Store-Refresh/" + file.relative_to(source).as_posix(), (2026, 9, 17, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, file.read_bytes(), compresslevel=6)
    for name in ("buildRefresh.mjs", "packageRefresh.py", "captureFixtures.mjs", "captureRefresh.mjs", "buildTrailer.mjs", "refreshStore.mjs"):
        file = mobile / "scripts" / "store" / name
        if not file.is_file():
            assert args.partial, f"Missing production script: {name}"
            continue
        entry = ZipInfo("WordShift-Play-Store-Refresh/source/export-tools/" + name, (2026, 9, 17, 0, 0, 0))
        entry.compress_type = ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, file.read_bytes(), compresslevel=6)
    entry = ZipInfo("WordShift-Play-Store-Refresh/source/export-tools/REPRODUCE.txt", (2026, 9, 17, 0, 0, 0))
    entry.compress_type = ZIP_DEFLATED
    entry.external_attr = 0o100644 << 16
    archive.writestr(entry, "These tools run inside the WordShift repository, not as a standalone application.\n\nRestore this campaign under mobile/assets/Play_store/launch-2026-09-v2 and the tools under mobile/scripts/store/. Use the feature/play-store-refresh branch, with its package lock, npm dependencies, bundled Epunda Slab/Figtree fonts, existing WordShift wordmark and previous campaign controls. From mobile/, run npm ci and follow the campaign README.\n\nRaw screenshots and video remain authentic captures. The before/after crop configuration requires visual review before the alternate opener can be exported or packaged.\n")
with ZipFile(destination) as archive:
    assert archive.testzip() is None, "ZIP integrity verification failed."
    print(json.dumps({"file": str(destination), "status": "partial-review" if args.partial else "image-only" if args.without_video else "complete-production-package", "files": len(archive.infolist()), "bytes": destination.stat().st_size, "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(), "integrity": "verified", "includes_video": video.is_file()}, indent=2))
