"""Trace a pen drawing into ordered centreline strokes for a "drawing itself" reveal.

usage: trace_strokes.py <drawing.webp> <out.json>

The site reveals the original ink through these strokes (as an SVG mask), so the line quality
stays exactly the artist's; the paths only decide the order and direction the pen moves.
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize

src, out = sys.argv[1], sys.argv[2]
gray = np.asarray(Image.open(src).convert('L'))
H, W = gray.shape
ink = (gray < 175).astype(np.uint8)
ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
skel = skeletonize(ink > 0)

NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
ys, xs = np.nonzero(skel)
pix = set(zip(ys.tolist(), xs.tolist()))
neigh = {p: [(p[0] + dy, p[1] + dx) for dy, dx in NB if (p[0] + dy, p[1] + dx) in pix] for p in pix}
nodes = {p for p, n in neigh.items() if len(n) != 2}

visited_edges = set()
paths = []


def walk(start, nxt):
    path = [start, nxt]
    prev, cur = start, nxt
    visited_edges.add(frozenset((start, nxt)))
    while cur not in nodes:
        options = [q for q in neigh[cur] if q != prev and frozenset((cur, q)) not in visited_edges]
        if not options:
            break
        prev, cur = cur, options[0]
        visited_edges.add(frozenset((prev, cur)))
        path.append(cur)
        if cur == start:
            break
    return path


for n in nodes:
    for q in neigh[n]:
        if frozenset((n, q)) not in visited_edges:
            paths.append(walk(n, q))
# closed loops with no junctions
for p in pix:
    for q in neigh[p]:
        if frozenset((p, q)) not in visited_edges:
            paths.append(walk(p, q))

strokes = []
for path in paths:
    if len(path) < 10:
        continue
    pts = np.array([[x, y] for y, x in path], np.float32).reshape(-1, 1, 2)
    simple = cv2.approxPolyDP(pts, 1.0, False).reshape(-1, 2)
    length = float(np.sum(np.linalg.norm(np.diff(pts.reshape(-1, 2), axis=0), axis=1)))
    strokes.append((simple, length))

# order like a pen: one person at a time, left to right. Each person is anchored at their face
# centre (x, in image pixels); strokes shared by neighbours (shoulders, overlapping outlines)
# are split where they cross from one person's side to the next.
PEOPLE = json.load(open(sys.argv[3]))['boundaries'] if len(sys.argv) > 3 else []


def boundary_x(line, y):
    pts = np.array(line, float)
    return float(np.interp(y, pts[:, 1], pts[:, 0]))


def owner(x, y):
    return sum(1 for line in PEOPLE if x > boundary_x(line, y))


CENTRES = [0] * (len(PEOPLE) + 1)
buckets = [[] for _ in CENTRES]
for s, length in strokes:
    ids = [owner(x, y) for x, y in s]
    start = 0
    for i in range(1, len(s) + 1):
        if i == len(s) or ids[i] != ids[start]:
            piece = s[max(0, start - 1):i]
            if len(piece) >= 2:
                plen = float(np.sum(np.linalg.norm(np.diff(piece, axis=0), axis=1)))
                if plen > 4:
                    buckets[ids[start]].append((piece, plen))
            start = i

order = []
for group in buckets:
    if not group:
        continue
    used = [False] * len(group)
    top = min(range(len(group)), key=lambda i: min(group[i][0][0][1], group[i][0][-1][1]))
    s0 = group[top][0]
    cur = (s0[0] if s0[0][1] <= s0[-1][1] else s0[-1]).astype(float)
    for _ in group:
        best, best_d, flip = -1, 1e18, False
        for i, (s, _) in enumerate(group):
            if used[i]:
                continue
            d0 = float(np.sum((s[0] - cur) ** 2)); d1 = float(np.sum((s[-1] - cur) ** 2))
            if d0 < best_d:
                best, best_d, flip = i, d0, False
            if d1 < best_d:
                best, best_d, flip = i, d1, True
        used[best] = True
        s, length = group[best]
        if flip:
            s = s[::-1]
        order.append({'d': 'M' + 'L'.join(f'{x:.0f} {y:.0f}' for x, y in s), 'len': round(length, 1)})
        cur = s[-1].astype(float)

json.dump({'w': W, 'h': H, 'strokes': order}, open(out, 'w'), separators=(',', ':'))
print(len(order), 'strokes', round(sum(s['len'] for s in order)), 'px of line')
