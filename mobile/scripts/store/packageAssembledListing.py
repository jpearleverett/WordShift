#!/usr/bin/env python3
"""Validate and atomically package the owner-approved eight-image assembly set."""
import hashlib
import json
from pathlib import Path
import zipfile
from PIL import Image

MOBILE = Path(__file__).resolve().parents[2]
ROOT = MOBILE / 'assets/Play_store/assembled-listing-2026-09'
OUT = MOBILE / 'store-output/assembled-listing-2026-09'
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'source/manifest.json').read_text())
assert manifest['status'] == 'assembled-images-complete', 'All eight images are required'
assert manifest['genuineGameplayCapture'] is False
assert manifest['nativeAndroidFidelityVerified'] is False
assert [scene['order'] for scene in manifest['scenes']] == list(range(1, 9))
records = {entry['file']: entry for entry in manifest['files']}
for filename, record in records.items():
    target = ROOT / filename
    assert hashlib.sha256(target.read_bytes()).hexdigest() == record['sha256'], f'Hash mismatch: {filename}'
    with Image.open(target) as image:
        assert list(image.size) == [record['width'], record['height']]
        if filename.startswith('export/phone/') or 'before-after' in filename:
            assert image.size == (1080, 1920) and image.mode == 'RGB'
        if 'feature-graphic' in filename:
            assert image.size == (1024, 500) and image.mode == 'RGB'
        if 'store-icon' in filename:
            assert image.size == (512, 512) and image.mode in ('RGB', 'RGBA')
        assert target.stat().st_size < 8_000_000, f'Export too large: {filename}'
for scene in manifest['scenes']:
    assert scene['promotionalCaptionArea']['fraction'] <= .2
    if scene['order'] in (2, 4):
        pit = scene['source']['geometry']['pit']
        assert pit['fullPathVisible'] and pit['clearancePx'] >= 68
assert all((ROOT / scene['file']).is_file() for scene in manifest['scenes'])

output = OUT / 'WordShift-Complete-Store-Images.zip'
temporary = output.with_suffix('.partial.zip')
scripts = ['assembledHouse.mjs', 'assembledPuzzle.mjs', 'assembledStorePrimitives.mjs', 'buildAssembledListing.mjs', 'packageAssembledListing.py']
with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(ROOT.rglob('*')):
        if file.is_file():
            archive.write(file, str(file.relative_to(ROOT)))
    for filename in scripts:
        archive.write(MOBILE / 'scripts/store' / filename, 'reproduce/' + filename)
    archive.write(OUT / 'WordShift-Store-Images-Review.html', 'WordShift-Store-Images-Review.html')
with zipfile.ZipFile(temporary) as archive:
    assert archive.testzip() is None, 'ZIP integrity failure'
    names = set(archive.namelist())
    assert sum(name.startswith('export/phone/') for name in names) == 8
    for filename, record in records.items():
        assert hashlib.sha256(archive.read(filename)).hexdigest() == record['sha256']
temporary.replace(output)
verification = {
    'status': 'passed', 'phoneImageCount': 8, 'phoneDimensions': [1080, 1920],
    'phoneColorMode': 'RGB', 'captionBandFraction': 1 / 6,
    'fullPitPath': True, 'pngSha256AndDimensionsChecked': len(records),
    'zip': output.name, 'bytes': output.stat().st_size,
    'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'method': 'Offline source-asset promotional reconstruction; not native screenshots.',
}
(OUT / 'verification.json').write_text(json.dumps(verification, indent=2) + '\n')
print(json.dumps(verification, indent=2))
