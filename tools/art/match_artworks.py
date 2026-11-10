"""Group photos that show the same artwork, even at different zoom or angle (ORB + RANSAC)."""
import json, sys, itertools
from pathlib import Path
import cv2, numpy as np

big = Path(sys.argv[1]); out = Path(sys.argv[2])
ids = sorted(p.stem for p in big.glob('*.jpg'))
orb = cv2.ORB_create(nfeatures=900)
feats = {}
for i in ids:
    g = cv2.imread(str(big / f'{i}.jpg'), cv2.IMREAD_GRAYSCALE)
    s = 640 / max(g.shape)
    g = cv2.resize(g, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    g = cv2.createCLAHE(2.0, (8, 8)).apply(g)
    kp, des = orb.detectAndCompute(g, None)
    feats[i] = (kp, des)
bf = cv2.BFMatcher(cv2.NORM_HAMMING)
edges = []
for a, b in itertools.combinations(ids, 2):
    ka, da = feats[a]; kb, db = feats[b]
    if da is None or db is None or len(ka) < 30 or len(kb) < 30:
        continue
    pairs = bf.knnMatch(da, db, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 18:
        continue
    src = np.float32([ka[m.queryIdx].pt for m in good]); dst = np.float32([kb[m.trainIdx].pt for m in good])
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
    if H is None:
        continue
    inliers = int(mask.sum())
    if inliers >= 25:
        edges.append((a, b, inliers))
# union-find clusters
parent = {i: i for i in ids}
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]; x = parent[x]
    return x
for a, b, _ in edges:
    parent[find(a)] = find(b)
clusters = {}
for i in ids:
    clusters.setdefault(find(i), []).append(i)
multi = sorted((sorted(v) for v in clusters.values() if len(v) > 1), key=len, reverse=True)
json.dump({'edges': edges, 'clusters': multi}, open(out, 'w'), indent=1)
print(len(ids), 'photos ->', len(clusters), 'artworks;', len(multi), 'with more than one photo')
for c in multi: print(c)
