"""Extract a 5-colour palette from each painting for the background wash.

Picks the most prominent colours that are reasonably saturated and distinct from each other,
so the wash reads as that painting's colours rather than its browns and greys.
usage: python tools/art/palettes.py   (writes src/data/palettes.json)
"""
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
art = json.loads((ROOT / 'src/data/art.json').read_text())
out = {}
for piece in art:
    if piece['section'] != 'painting':
        continue
    im = Image.open(ROOT / 'public/art' / f"{piece['id']}-s.webp").convert('RGB')
    im.thumbnail((160, 160))
    px = np.asarray(im).reshape(-1, 3).astype(np.float32)
    k = 10
    _, labels, centres = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 1), 3, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.ravel(), minlength=k)
    hsv = cv2.cvtColor(centres.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV).reshape(-1, 3)
    sat, val = hsv[:, 1] / 255, hsv[:, 2] / 255
    score = counts / counts.sum() * (0.25 + sat) * (0.3 + np.clip(val, 0, 0.85))
    chosen = []
    for i in np.argsort(-score):
        c = centres[i]
        if val[i] < 0.18:
            continue
        if all(np.linalg.norm(c - centres[j]) > 55 for j in chosen):
            chosen.append(i)
        if len(chosen) == 5:
            break
    while len(chosen) < 5:
        chosen.append(chosen[len(chosen) % max(1, len(chosen))])
    out[piece['id']] = ['#%02x%02x%02x' % tuple(int(v) for v in centres[i]) for i in chosen]
(ROOT / 'src/data/palettes.json').write_text(json.dumps(out, indent=1))
print(len(out), 'palettes', out.get('a051'), out.get('a022'))
