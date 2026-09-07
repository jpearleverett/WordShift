"""Package the finished launch assets without requiring an external ZIP utility."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

mobile = Path(__file__).resolve().parents[2]
source = mobile / "assets" / "Play_store" / "launch-2026-09"
destination = source.parent / "WordShift-Play-Store-Launch.zip"
assert len(list((source / "upload").rglob("*.png"))) == 10, "Build all ten upload assets first"

with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(source.rglob("*")):
        if not file.is_file():
            continue
        info = ZipInfo("WordShift-Play-Store/" + file.relative_to(source).as_posix(), (2026, 9, 7, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, file.read_bytes(), compresslevel=6)

with ZipFile(destination) as archive:
    assert archive.testzip() is None, "ZIP integrity check failed"
    print(f"{destination}: {len(archive.infolist())} files, {destination.stat().st_size:,} bytes; integrity verified")
