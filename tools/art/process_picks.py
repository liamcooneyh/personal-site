"""Straighten, crop and colour-correct photos of paintings.

usage: process_picks.py <files.tsv> <art_dir> <ids,comma,separated> <out_dir> <review_dir> [corners.json]

For each id: find the canvas quadrilateral, perspective-warp it flat, white-balance and
expose it using the (usually white) wall around it as a neutral reference, and save
WebP files with no metadata. A review JPEG with the detected outline is written too.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

SRGB = '/System/Library/ColorSync/Profiles/sRGB Profile.icc'


def load_upright(path: Path) -> np.ndarray:
    if path.suffix == '.jpg' and path.parent.name == 'full':
        return np.asarray(Image.open(path).convert('RGB')).copy()
    with tempfile.TemporaryDirectory() as tmp:
        jpg = Path(tmp) / 'x.jpg'
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '95', '-Z', '3000',
                        '-m', SRGB, str(path), '--out', str(jpg)], check=True, capture_output=True)
        im = ImageOps.exif_transpose(Image.open(jpg)).convert('RGB')
        return np.asarray(im).copy()


def order_corners(pts: np.ndarray) -> np.ndarray:
    pts = pts.reshape(4, 2).astype(np.float32)
    s, d = pts.sum(1), np.diff(pts, axis=1).ravel()
    return np.array([pts[np.argmin(s)], pts[np.argmin(d)], pts[np.argmax(s)], pts[np.argmax(d)]], np.float32)


def is_squarish(approx: np.ndarray) -> bool:
    """Reject lopsided quads: opposite sides of a photographed canvas stay similar."""
    tl, tr, br, bl = order_corners(approx)
    top, bottom = np.linalg.norm(tr - tl), np.linalg.norm(br - bl)
    left, right = np.linalg.norm(bl - tl), np.linalg.norm(br - tr)
    return min(top, bottom) / max(top, bottom) > 0.72 and min(left, right) / max(left, right) > 0.72


def find_canvas(rgb: np.ndarray):
    h, w = rgb.shape[:2]
    scale = 900 / max(h, w)
    small = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    sh, sw = small.shape[:2]
    area = sh * sw
    gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)
    best, best_score = None, 0.0
    for lo, hi in ((30, 90), (50, 150), (80, 200)):
        edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), lo, hi)
        edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            hull = cv2.convexHull(c)
            a = cv2.contourArea(hull)
            if a < 0.18 * area or a > 0.97 * area:
                continue
            peri = cv2.arcLength(hull, True)
            for eps in (0.02, 0.03, 0.045):
                approx = cv2.approxPolyDP(hull, eps * peri, True)
                if len(approx) == 4 and cv2.isContourConvex(approx) and is_squarish(approx):
                    rect_fill = a / (cv2.minAreaRect(hull)[1][0] * cv2.minAreaRect(hull)[1][1] + 1e-6)
                    score = a * rect_fill
                    if score > best_score:
                        best, best_score = approx, score
                    break
    if best is None:
        return None
    return order_corners(best) / scale


def find_canvas_grabcut(rgb: np.ndarray):
    """Fallback: separate the painting from wall/floor with GrabCut, then fit a quad."""
    h, w = rgb.shape[:2]
    scale = 600 / max(h, w)
    small = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    sh, sw = small.shape[:2]
    mask = np.zeros((sh, sw), np.uint8)
    rect = (int(sw * 0.06), int(sh * 0.06), int(sw * 0.88), int(sh * 0.88))
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    contours, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    biggest = max(contours, key=cv2.contourArea)
    if cv2.contourArea(biggest) < 0.15 * sh * sw:
        return None
    hull = cv2.convexHull(biggest)
    peri = cv2.arcLength(hull, True)
    for eps in (0.02, 0.035, 0.05, 0.08):
        approx = cv2.approxPolyDP(hull, eps * peri, True)
        if len(approx) == 4 and is_squarish(approx):
            return order_corners(approx) / scale
    box = cv2.boxPoints(cv2.minAreaRect(hull))
    return order_corners(box) / scale


def warp(rgb: np.ndarray, quad: np.ndarray) -> np.ndarray:
    tl, tr, br, bl = quad
    width = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    height = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    inset = 0.012  # trim the canvas edge / frame shadow
    dst = np.array([[0, 0], [width, 0], [width, height], [0, height]], np.float32)
    m = cv2.getPerspectiveTransform(quad, dst)
    flat = cv2.warpPerspective(rgb, m, (width, height), flags=cv2.INTER_CUBIC)
    dx, dy = int(width * inset), int(height * inset)
    return flat[dy:height - dy, dx:width - dx]


def edge_angle(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0])))


def straight_crop(rgb: np.ndarray, quad: np.ndarray):
    """Crop to the largest upright rectangle inside the detected canvas, never warping it.

    A tiny rotation is applied only when the top and bottom edges agree on the same tilt,
    so a painting that was photographed straight stays exactly as it was.
    """
    tl, tr, br, bl = quad
    top, bottom = edge_angle(tl, tr), edge_angle(bl, br)
    angle = (top + bottom) / 2 if abs(top - bottom) < 1.2 and abs(top + bottom) / 2 < 4 else 0.0
    h, w = rgb.shape[:2]
    if abs(angle) > 0.25:
        m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        rgb = cv2.warpAffine(rgb, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        quad = cv2.transform(quad.reshape(-1, 1, 2), m).reshape(4, 2)
        tl, tr, br, bl = quad
    x0, x1 = max(tl[0], bl[0]), min(tr[0], br[0])
    y0, y1 = max(tl[1], tr[1]), min(bl[1], br[1])
    inset_x, inset_y = (x1 - x0) * 0.012, (y1 - y0) * 0.012
    x0, x1 = int(max(0, x0 + inset_x)), int(min(w, x1 - inset_x))
    y0, y1 = int(max(0, y0 + inset_y)), int(min(h, y1 - inset_y))
    return rgb[y0:y1, x0:x1], angle


def neutral_reference(rgb: np.ndarray, quad: np.ndarray):
    h, w = rgb.shape[:2]
    mask = np.ones((h, w), np.uint8)
    grown = quad.copy()
    centre = grown.mean(0)
    grown = centre + (grown - centre) * 1.06
    cv2.fillConvexPoly(mask, grown.astype(np.int32), 0)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat, val = hsv[..., 1] / 255.0, hsv[..., 2] / 255.0
    ref = (mask == 1) & (sat < 0.22) & (val > 0.3)
    if ref.sum() < 0.015 * h * w:
        return None
    return rgb[ref].reshape(-1, 3).astype(np.float64)


def correct_colour(flat: np.ndarray, ref) -> np.ndarray:
    """Keep the paint's real saturation: fix colour cast, set a true black and white point,
    never push exposure up much (that is what greyed paintings out)."""
    img = flat.astype(np.float64)
    if ref is not None:
        means = np.percentile(ref, 60, axis=0)
        gains = np.clip(means.mean() / means, 0.88, 1.15)
        img *= 1 + (gains - 1) * 0.6
    lum = img.mean(2)
    if lum.mean() < 85:  # only lift genuinely dark photos, and only a little
        img *= min(1.18, 95 / (lum.mean() + 1e-6))
        lum = img.mean(2)
    lo, hi = np.percentile(lum, 0.4), np.percentile(lum, 99.6)
    lo = min(lo, 40.0)
    hi = max(hi, 200.0)
    img = (img - lo) * (252 / (hi - lo))
    # vibrance: lift saturation most where it is lowest, so skin and greys stay natural
    img = np.clip(img, 0, 255)
    hsv = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    sat = hsv[..., 1] / 255
    hsv[..., 1] = np.clip(sat * (1 + 0.22 * (1 - sat)), 0, 1) * 255
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)


def reduce_glare(rgb: np.ndarray, strength: float = 0.85) -> np.ndarray:
    """Pull down sheen that is brighter and greyer than the paint around it."""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, A, B = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128
    k = max(31, (min(rgb.shape[:2]) // 12) | 1)
    small = cv2.resize(L, None, fx=0.25, fy=0.25, interpolation=cv2.INTER_AREA)
    base = cv2.resize(cv2.medianBlur(small.astype(np.uint8), max(5, (k // 4) | 1)).astype(np.float32),
                      (L.shape[1], L.shape[0]), interpolation=cv2.INTER_CUBIC)
    chroma = np.hypot(A, B)
    excess = np.clip(L - base - 8, 0, None)
    greyness = np.clip(1 - chroma / 40, 0, 1)
    mask = cv2.GaussianBlur(excess * (0.4 + 0.6 * greyness), (0, 0), 6)
    lab[..., 0] = L - mask * strength
    boost = 1 + np.clip(mask / 60, 0, 0.6)
    lab[..., 1] = 128 + A * boost
    lab[..., 2] = 128 + B * boost
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)



def process_one(src: Path, out: Path, id_: str, corners=None, review: Path | None = None, glare: bool = False) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    rgb = load_upright(src)
    h, w = rgb.shape[:2]
    if corners:
        quad = order_corners(np.array(corners, np.float32) * np.array([w, h], np.float32))
        how = 'manual'
    else:
        quad = find_canvas(rgb)
        how = 'auto'
        if quad is None:
            quad = find_canvas_grabcut(rgb)
            how = 'grabcut'
    if quad is None:
        m = 0.06
        quad = np.array([[w * m, h * m], [w * (1 - m), h * m], [w * (1 - m), h * (1 - m)], [w * m, h * (1 - m)]], np.float32)
        how = 'fallback'
    if how == 'manual':
        flat = warp(rgb, quad)  # corners placed by hand: trust them, including perspective
    else:
        flat, _ = straight_crop(rgb, quad)
    fixed = correct_colour(flat, neutral_reference(rgb, quad))
    if glare:
        fixed = reduce_glare(fixed)
    im = Image.fromarray(fixed)
    for suffix, size in (('s', 900), ('l', 1800)):
        c = im.copy()
        c.thumbnail((size, size), Image.LANCZOS)
        c.save(out / f'{id_}-{suffix}.webp', 'WEBP', quality=82, method=6)
    if review is not None:
        review.mkdir(parents=True, exist_ok=True)
        preview = rgb.copy()
        cv2.polylines(preview, [quad.astype(np.int32)], True, (255, 0, 255), max(4, w // 250))
        pv = Image.fromarray(preview)
        pv.thumbnail((700, 700))
        pv.save(review / f'{id_}-detect.jpg', quality=75)
    return {'w': im.size[0], 'h': im.size[1], 'how': how,
            'corners': (quad / np.array([w, h], np.float32)).round(4).tolist()}


if __name__ == '__main__':
    files_tsv, art_dir, ids_arg, out_dir, review_dir = sys.argv[1:6]
    manual = json.loads(Path(sys.argv[6]).read_text()) if len(sys.argv) > 6 and Path(sys.argv[6]).exists() else {}
    names = {row.split('\t')[0]: row.split('\t')[1] for row in Path(files_tsv).read_text().splitlines()}
    results = {}
    for id_ in filter(None, ids_arg.split(',')):
        results[id_] = process_one(Path(art_dir) / names[id_], Path(out_dir), id_, manual.get(id_), Path(review_dir))
        print(id_, results[id_]['how'], flush=True)
    Path(review_dir, 'results.json').write_text(json.dumps(results, indent=1))
