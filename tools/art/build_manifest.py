"""Turn the art picker's choices into the site's art manifest.

Reads  source-images/art-selection.json  (what to show, titles, hero flags)
       source-images/art-crops.json      (size of each cleaned-up image)
       source-images/processed/*.webp    (straightened, colour-corrected images)
Writes public/art/<id>-{s,l}.webp and src/data/art.json, and removes art files that are no
longer picked.

usage: python3 tools/art/build_manifest.py
"""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'source-images'
PUBLIC_ART = ROOT / 'public' / 'art'
MANIFEST = ROOT / 'src' / 'data' / 'art.json'
PICKER_DATA = Path(__file__).with_name('photo-dates.json')


def main() -> None:
    selection = json.loads((SOURCE / 'art-selection.json').read_text())
    crops = json.loads((SOURCE / 'art-crops.json').read_text())
    dates = json.loads(PICKER_DATA.read_text()) if PICKER_DATA.exists() else {}

    pieces = []
    for id_, pick in selection.get('picks', {}).items():
        crop = crops.get(id_)
        if not crop:
            raise SystemExit(f'{id_} has no cleaned-up image yet. Open the picker and let it finish.')
        year = str(pick.get('year') or '').strip() or (dates.get(id_, '')[:4] if dates.get(id_, '')[:4].isdigit() else '')
        pieces.append({
            'id': id_,
            'w': crop['w'],
            'h': crop['h'],
            'title': (pick.get('title') or '').strip() or None,
            'year': year or None,
            'kind': pick.get('kind') or None,
            'hero': bool(pick.get('hero')),
            'heroOrder': pick.get('heroOrder'),
            'section': pick.get('section') or ('sketch' if pick.get('kind') == 'Ink / sketch' else 'painting'),
            'sortKey': year,
            'photoDate': dates.get(id_, ''),
        })

    pieces.sort(key=lambda p: (p['sortKey'], p['photoDate']), reverse=True)

    PUBLIC_ART.mkdir(parents=True, exist_ok=True)
    keep = set()
    for piece in pieces:
        for size in ('s', 'l'):
            name = f"{piece['id']}-{size}.webp"
            shutil.copy2(SOURCE / 'processed' / name, PUBLIC_ART / name)
            keep.add(name)
    for stale in PUBLIC_ART.glob('*.webp'):
        if stale.name not in keep:
            stale.unlink()

    for piece in pieces:
        del piece['sortKey'], piece['photoDate']
        digest = hashlib.sha1((PUBLIC_ART / f"{piece['id']}-l.webp").read_bytes()).hexdigest()
        piece['v'] = digest[:8]  # cache-buster: changes whenever the image is reprocessed
    MANIFEST.write_text(json.dumps(pieces, indent=2) + '\n')
    heroes = sum(p['hero'] for p in pieces)
    print(f'{len(pieces)} pieces ({heroes} hero) written to {MANIFEST.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
