import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import process_picks as pp
import retouch
from PIL import Image
proj = Path(__file__).resolve().parents[2] / 'source-images'
full = Path(__file__).parent / 'picker' / 'full'
review = Path(__file__).parent / 'proc2'
sel = json.loads((proj / 'art-selection.json').read_text())['picks']
crops = json.loads((proj / 'art-crops.json').read_text()) if (proj / 'art-crops.json').exists() else {}
only = set(sys.argv[1].split(',')) if len(sys.argv) > 1 and sys.argv[1] else None
GLARE = {'a159', 'a119', 'a157', 'a026', 'a131', 'a162', 'a163', 'a140', 'a115', 'a111'}
for id_, pick in sel.items():
    if pick.get('section') != 'painting' or (only and id_ not in only):
        continue
    manual = crops.get(id_, {}).get('corners') if crops.get(id_, {}).get('how') == 'manual' else None
    crops[id_] = pp.process_one(full / f'{id_}.jpg', proj / 'processed', id_, manual, review, glare=id_ in GLARE)
    if id_ in retouch.RETOUCH:
        fixed = retouch.RETOUCH[id_](proj / 'processed' / f'{id_}-l.webp')
        fixed.save(proj / 'processed' / f'{id_}-l.webp', 'WEBP', quality=82, method=6)
        small = fixed.copy(); small.thumbnail((900, 900))
        small.save(proj / 'processed' / f'{id_}-s.webp', 'WEBP', quality=82, method=6)
    print(id_, crops[id_]['how'], crops[id_]['w'], crops[id_]['h'], flush=True)
(proj / 'art-crops.json').write_text(json.dumps(crops, indent=1))
