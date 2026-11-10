import sys, json
from pathlib import Path
from PIL import Image, ImageOps

P = Path(sys.argv[1]); thumbs_index = Path(sys.argv[2]); current_ids = set(sys.argv[3].split(','))
rows = [l.rstrip('\n').split('\t') for l in open(P/'files.tsv')]
old = {}
for l in open(thumbs_index):
    k, f = l.strip().split('|', 1)
    old[f] = k.lstrip('n')

def dhash(im, size=12):
    g = im.convert('L').resize((size + 1, size), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for r in range(size):
        for c in range(size):
            bits = (bits << 1) | (px[r*(size+1)+c] > px[r*(size+1)+c+1])
    return bits

items = []
for id_, name, date in rows:
    im = ImageOps.exif_transpose(Image.open(P/'raw'/f'{id_}.jpg')).convert('RGB')
    w, h = im.size
    small = im.copy(); small.thumbnail((520, 520), Image.LANCZOS)
    small.save(P/'img'/f'{id_}.jpg', 'JPEG', quality=80)
    items.append({'id': id_, 'file': name, 'date': date.replace(':', '-', 2), 'w': w, 'h': h,
                  'hash': dhash(im), 'onSite': old.get(name, '') in current_ids})

# group near-duplicates (hamming distance)
groups, assigned = [], {}
for it in items:
    for g in groups:
        if bin(g['hash'] ^ it['hash']).count('1') <= 22:
            g['members'].append(it['id']); assigned[it['id']] = g['gid']; break
    else:
        gid = f"g{len(groups)+1:03d}"
        groups.append({'gid': gid, 'hash': it['hash'], 'members': [it['id']]})
        assigned[it['id']] = gid
for it in items:
    it['group'] = assigned[it['id']]; del it['hash']
json.dump({'items': items}, open(P/'data.json', 'w'))
dup = [g for g in groups if len(g['members']) > 1]
print(len(items), 'images', len(groups), 'groups', len(dup), 'dup groups')
print([g['members'] for g in dup][:40])
