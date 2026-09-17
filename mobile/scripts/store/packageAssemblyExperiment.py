#!/usr/bin/env python3
"""Package the explicitly assembled creative study, never genuine captures."""
from pathlib import Path
import hashlib
import json
import zipfile

MOBILE = Path(__file__).resolve().parents[2]
ROOT = MOBILE / 'assets/Play_store/assembly-experiment'
OUT = MOBILE / 'store-output/assembly-experiment'

def main():
    provenance = json.loads((ROOT / 'source/provenance.json').read_text())
    if provenance.get('status') != 'assembled-review-experiment':
        raise ValueError('Expected the assembled experiment provenance.')
    if not provenance.get('notLiveCapture') or not provenance.get('animation', {}).get('exported'):
        raise ValueError('Expected honestly labeled assembled images and completed preview video.')
    video = OUT / 'WordShift-Assembled-Preview.mp4'
    if hashlib.sha256(video.read_bytes()).hexdigest() != provenance['animation']['output']['sha256']:
        raise ValueError('Preview video differs from its recorded provenance.')
    required = [(ROOT / 'README.md', 'README.md'),
                (ROOT / 'source/provenance.json', 'source/provenance.json'),
                (ROOT / 'contact-sheet.png', 'WordShift-Assembly-Contact-Sheet.png'),
                (OUT / 'WordShift-Assembly-Review.html', 'WordShift-Assembly-Review.html'),
                (OUT / 'WordShift-Assembled-Preview.mp4', 'WordShift-Assembled-Preview.mp4')]
    required += [(p, f'images/{p.name}') for p in sorted((ROOT / 'images').glob('*.png'))]
    required += [(MOBILE / 'scripts/store' / name, f'source/{name}') for name in
                 ['assembledHouse.mjs', 'assembledPuzzle.mjs', 'buildAssemblyExperiment.mjs', 'packageAssemblyExperiment.py']]
    for file, _ in required:
        if not file.is_file():
            raise FileNotFoundError(file)
    target = OUT / 'WordShift-Assembly-Experiment.zip'
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for file, name in required:
            archive.write(file, name)
    with zipfile.ZipFile(target) as archive:
        bad = archive.testzip()
        if bad:
            raise ValueError(f'Corrupt package member: {bad}')
    print(json.dumps({'file': str(target), 'bytes': target.stat().st_size, 'entries': len(required)}))

if __name__ == '__main__':
    main()
