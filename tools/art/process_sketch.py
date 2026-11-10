"""Turn a phone photo of a sketchbook page into a clean, consistent digital asset.

Steps: find the paper, flatten uneven lighting so paper goes pure white, drop notebook
dots/ruled lines and specks, keep only the main drawing (stray notes and doodles away from
it are removed), crop to it, pad onto a consistent 4:5 (or 5:4) white canvas, and save
  <id>-s.webp / <id>-l.webp  (clean raster, ink colour kept)
  <id>.svg                   (vector trace, for ink line work)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np
import potrace
from PIL import Image

WORK = 2000


def paper_mask(rgb: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    sat, val = hsv[..., 1].astype(np.float32), hsv[..., 2].astype(np.float32)
    bright = val > np.percentile(val, 55) * 0.72
    paper = (bright & (sat < 70)).astype(np.uint8)
    k = max(15, rgb.shape[1] // 40)
    paper = cv2.morphologyEx(paper, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(paper)
    if n <= 1:
        return np.ones(paper.shape, np.uint8)
    biggest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    paper = (labels == biggest).astype(np.uint8)
    contours, _ = cv2.findContours(paper, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(paper)
    cv2.drawContours(filled, contours, -1, 1, thickness=cv2.FILLED)
    return cv2.erode(filled, np.ones((9, 9), np.uint8))


def flatten(rgb: np.ndarray) -> np.ndarray:
    """Divide out the paper's lighting so blank paper becomes 1.0 everywhere.

    The paper brightness is estimated from the brightest pixels over a wide area, so a large
    solid patch of ink is never mistaken for paper (which would wash it out to grey).
    """
    h, w = rgb.shape[:2]
    small_w = 180
    small_h = max(1, int(h * small_w / w))
    out = np.empty(rgb.shape, np.float32)
    for c in range(3):
        channel = rgb[..., c]
        small = cv2.resize(channel, (small_w, small_h), interpolation=cv2.INTER_AREA)
        paper = cv2.dilate(small, np.ones((17, 17), np.uint8))
        paper = cv2.GaussianBlur(paper.astype(np.float32), (0, 0), 6)
        background = cv2.resize(paper, (w, h), interpolation=cv2.INTER_CUBIC)
        out[..., c] = channel.astype(np.float32) / np.maximum(background, 1)
    return np.clip(out, 0, 1.2)


def main_drawing(ink: np.ndarray) -> np.ndarray:
    h, w = ink.shape
    k = max(25, int(max(h, w) * 0.035))
    merged = cv2.dilate(ink, np.ones((k, k), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(merged)
    if n <= 1:
        return ink
    mass = np.array([ink[labels == i].sum() for i in range(n)], np.float64)
    mass[0] = 0
    edge = int(0.01 * max(h, w))
    for i in range(1, n):
        x, y, cw, ch = stats[i, :4]
        touches = x <= edge or y <= edge or x + cw >= w - edge or y + ch >= h - edge
        if touches and mass[i] < mass.max():
            mass[i] *= 0.2  # a drawing sliced by the photo edge is almost never the subject
        elif touches:
            mass[i] *= 0.6
    main = int(np.argmax(mass))
    keep = {main}
    mx, my, mw, mh = stats[main, :4]
    gap = 0.07 * max(h, w)
    for i in range(1, n):
        if i == main or mass[i] < 0.3 * mass[main]:
            continue
        x, y, cw, ch = stats[i, :4]
        dx = max(0, max(mx - (x + cw), x - (mx + mw)))
        dy = max(0, max(my - (y + ch), y - (my + mh)))
        if max(dx, dy) < gap:
            keep.add(i)
    region = np.isin(labels, list(keep)).astype(np.uint8)
    return ink & region


def to_svg(mask: np.ndarray) -> str:
    bitmap = potrace.Bitmap(~mask.astype(bool))
    paths = bitmap.trace(turdsize=6, alphamax=1.0, opticurve=True, opttolerance=0.25)
    parts = []
    for curve in paths:
        sx, sy = curve.start_point.x, curve.start_point.y
        d = [f'M{sx:.1f},{sy:.1f}']
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f'L{seg.c.x:.1f},{seg.c.y:.1f}L{seg.end_point.x:.1f},{seg.end_point.y:.1f}')
            else:
                d.append(f'C{seg.c1.x:.1f},{seg.c1.y:.1f} {seg.c2.x:.1f},{seg.c2.y:.1f} {seg.end_point.x:.1f},{seg.end_point.y:.1f}')
        d.append('Z')
        parts.append(''.join(d))
    h, w = mask.shape
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">'
            f'<path fill="currentColor" fill-rule="evenodd" d="{"".join(parts)}"/></svg>')


def pad_to_frame(img: np.ndarray, mask: np.ndarray, margin: float = 0.08):
    h, w = mask.shape
    ratio = 4 / 5 if h >= w else 5 / 4
    inner_w, inner_h = w * (1 + 2 * margin), h * (1 + 2 * margin)
    if inner_w / inner_h < ratio:
        inner_w = inner_h * ratio
    else:
        inner_h = inner_w / ratio
    W, H = int(inner_w), int(inner_h)
    ox, oy = (W - w) // 2, (H - h) // 2
    canvas = np.full((H, W, 3), 255, np.uint8)
    canvas[oy:oy + h, ox:ox + w] = img
    full_mask = np.zeros((H, W), np.uint8)
    full_mask[oy:oy + h, ox:ox + w] = mask
    return canvas, full_mask


def process_sketch(src: Path, out: Path, id_: str, ink_threshold: float = 0.3, vector: bool = True,
                   pencil: bool = False, region=None, colour: bool = False, contrast=None, ruled: bool = True, photo: bool = False, whiten_outside: bool = True, fixed_crop: bool = False, erase_edge_lines: bool = False, shade_left: float = 0.0) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    rgb = np.asarray(Image.open(src).convert('RGB'))
    scale = WORK / max(rgb.shape[:2])
    if scale < 1:
        rgb = cv2.resize(rgb, (int(rgb.shape[1] * scale), int(rgb.shape[0] * scale)), interpolation=cv2.INTER_AREA)
    paper = paper_mask(rgb)
    flat = flatten(rgb)
    strength = 1 - flat.min(axis=2)
    ink = ((strength > ink_threshold) & (paper == 1)).astype(np.uint8)
    keep = None
    if region:
        h0, w0 = ink.shape
        keep = np.zeros_like(ink)
        if isinstance(region[0], (list, tuple)):  # polygon of [x, y] fractions
            pts = np.array([[x * w0, y * h0] for x, y in region], np.int32)
            cv2.fillPoly(keep, [pts], 1)
        else:
            keep[int(region[1] * h0):int(region[3] * h0), int(region[0] * w0):int(region[2] * w0)] = 1
        ink &= keep

    # drop dots, specks and long faint ruled lines
    n, labels, stats, _ = cv2.connectedComponentsWithStats(ink)
    min_area = max(40, int(ink.size * 0.00002))
    small = np.isin(labels, np.where(stats[:, cv2.CC_STAT_AREA] < min_area)[0])
    ink[small] = 0
    line_len = rgb.shape[1] // 5
    lines = cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((1, line_len), np.uint8))
    # shorter ruled-line fragments: horizontal runs with blank paper just above and below
    runs = cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((1, rgb.shape[1] // 12), np.uint8))
    gap = 4
    above = np.zeros_like(ink); above[gap:] = ink[:-gap]
    below = np.zeros_like(ink); below[:-gap] = ink[gap:]
    lines = ((lines == 1) | ((runs == 1) & (above == 0) & (below == 0))).astype(np.uint8)
    if not ruled:
        lines[:] = 0
    # page edges / spine shadows: long straight vertical strokes near the photo border
    vbars = cv2.morphologyEx(ink, cv2.MORPH_OPEN, np.ones((max(40, rgb.shape[0] // 4), 1), np.uint8))
    nb, lb, sb, cb = cv2.connectedComponentsWithStats(vbars)
    edge_bars = np.zeros_like(ink)
    W0 = rgb.shape[1]
    for i in range(1, nb):
        # only genuine page edges: hugging the photo border, never strokes inside the drawing
        if cb[i][0] < W0 * 0.06 or cb[i][0] > W0 * 0.94:
            edge_bars[lb == i] = 1
    edge_bars = cv2.dilate(edge_bars, np.ones((5, 9), np.uint8))
    ink[edge_bars == 1] = 0
    # ruled lines crossing drawn areas get patched, not erased (erasing left white streaks)
    others = ((ink == 1) & (lines == 0)).astype(np.float32)
    density = cv2.blur(others, (31, 31))
    through_drawing = ((lines == 1) & (density > 0.18)).astype(np.uint8)
    lines = ((lines == 1) & (through_drawing == 0)).astype(np.uint8)
    ink[lines == 1] = 0

    drawing = main_drawing(ink)
    ys, xs = np.nonzero(drawing)
    if len(xs) == 0:
        raise RuntimeError('no drawing found')
    pad = int(0.02 * max(rgb.shape[:2]))
    x0, x1 = max(0, xs.min() - pad), min(rgb.shape[1], xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(rgb.shape[0], ys.max() + pad)

    soft = cv2.dilate(drawing, np.ones((5, 5), np.uint8)).astype(np.float32)
    soft = cv2.GaussianBlur(soft, (0, 0), 1.2)[..., None]
    lum = flat.mean(axis=2)
    lum = np.where(cv2.dilate(lines, np.ones((3, 3), np.uint8)) == 1, np.maximum(lum, 1.0), lum)
    lum = np.where(edge_bars == 1, np.maximum(lum, 1.0), lum)
    patch = cv2.dilate(through_drawing, np.ones((3, 3), np.uint8))
    if patch.any():
        lum8 = (np.clip(lum, 0, 1) * 255).astype(np.uint8)
        lum = cv2.inpaint(lum8, patch, 4, cv2.INPAINT_TELEA).astype(np.float32) / 255
    if pencil:
        tone = np.clip((lum - 0.22) / (0.9 - 0.22), 0, 1) ** 1.25
    else:
        lo, hi = contrast or (0.5, 0.86)
        t = np.clip((lum - lo) / (hi - lo), 0, 1)
        tone = t * t * (3 - 2 * t)  # ink: anything clearly darker than paper goes to solid black
    if colour:
        tint = np.clip(flat / np.maximum(lum[..., None], 1e-3), 0, 1.6)
        toned = np.clip(tone[..., None] * 1.0 + (1 - tone[..., None]) * (1 - (1 - np.clip(flat, 0, 1)) * 0) * 0, 0, 1)
        toned = np.clip(tone[..., None] + (1 - tone[..., None]) * np.clip(tint * 0.35, 0, 1), 0, 1)
    else:
        toned = np.repeat(tone[..., None], 3, axis=2)
    if photo:
        # keep every tone the artist put down: only even out the light and whiten the paper
        pad2 = int(0.015 * max(rgb.shape[:2]))
        x0, x1 = max(0, x0 - pad2), min(rgb.shape[1], x1 + pad2)
        y0, y1 = max(0, y0 - pad2), min(rgb.shape[0], y1 + pad2)
        if fixed_crop and region and not isinstance(region[0], (list, tuple)):
            hh, ww = rgb.shape[:2]
            x0, y0, x1, y1 = int(region[0] * ww), int(region[1] * hh), int(region[2] * ww), int(region[3] * hh)
        lum = np.clip(flat.mean(axis=2), 0, 1)
        box = lum[y0:y1, x0:x1]
        lo = float(np.percentile(box, 0.3))
        hi = 0.9
        tone = np.clip((lum - lo) / (hi - lo), 0, 1) ** 1.08
        page = cv2.erode(paper.astype(np.uint8), np.ones((15, 15), np.uint8)) if whiten_outside else np.ones_like(paper)
        tone = np.where(cv2.GaussianBlur(page.astype(np.float32), (0, 0), 4) > 0.5, tone, 1.0)
        if keep is not None:
            tone = np.where(cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 6) > 0.5, tone, 1.0)
        if colour:
            rgb_tone = np.clip((np.clip(flat, 0, 1.2) - lo) / (hi - lo), 0, 1)
            white = (tone >= 0.999)[..., None]
            clean = (255 * np.where(white, 1.0, rgb_tone)).astype(np.uint8)
        else:
            clean = (255 * np.repeat(tone[..., None], 3, axis=2)).astype(np.uint8)
    else:
        clean = (255 * (toned * soft + (1 - soft))).astype(np.uint8)
    crop = clean[y0:y1, x0:x1]
    if shade_left:
        # page curling into the spine casts a grey band; lift it to paper white, keep real ink
        crop = crop.copy()
        band = int(crop.shape[1] * shade_left)
        strip = crop[:, :band].astype(np.float32)
        lift = strip.mean(axis=2, keepdims=True) > 110
        crop[:, :band] = np.where(lift, 255, strip).astype(np.uint8)
    if erase_edge_lines:
        # straight vertical page-edge lines near the sides of the crop (not drawn strokes)
        crop = crop.copy()
        gray_c = crop.mean(axis=2)
        dark = (gray_c < 215).astype(np.uint8)
        tall = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((max(30, crop.shape[0] // 3), 1), np.uint8))
        side = np.zeros_like(tall)
        band = max(4, int(crop.shape[1] * 0.12))
        side[:, :band] = 1
        side[:, -band:] = 1
        kill = cv2.dilate(tall & side, np.ones((5, 7), np.uint8))
        # faint shadow strips beside those lines
        kill |= ((gray_c > 195) & (side == 1) & (cv2.dilate(kill, np.ones((1, 41), np.uint8)) == 1)).astype(np.uint8)
        crop[kill == 1] = 255
    framed, framed_mask = pad_to_frame(crop, drawing[y0:y1, x0:x1])

    im = Image.fromarray(framed)
    for suffix, size in (('s', 900), ('l', 1800)):
        c = im.copy()
        c.thumbnail((size, size), Image.LANCZOS)
        c.save(out / f'{id_}-{suffix}.webp', 'WEBP', quality=86, method=6)
    svg_bytes = 0
    if vector:
        vec_scale = 1400 / max(framed_mask.shape)
        small_mask = cv2.resize(framed_mask, (int(framed_mask.shape[1] * vec_scale), int(framed_mask.shape[0] * vec_scale)),
                                interpolation=cv2.INTER_AREA)
        svg = to_svg(small_mask > 0)
        (out / f'{id_}.svg').write_text(svg)
        svg_bytes = len(svg)
    return {'w': im.size[0], 'h': im.size[1], 'how': 'sketch', 'svgBytes': svg_bytes, 'threshold': ink_threshold}


if __name__ == '__main__':
    full, out, ids = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3].split(',')
    settings = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    for id_ in ids:
        opts = settings.get(id_, {})
        result = process_sketch(full / f'{id_}.jpg', out, id_, opts.get('threshold', 0.3), opts.get('vector', True),
                                opts.get('pencil', False), opts.get('region'), opts.get('colour', False), opts.get('contrast'), opts.get('ruled', True), opts.get('photo', False), opts.get('page', True), opts.get('fixed', False), opts.get('edgelines', False), opts.get('shade_left', 0.0))
        print(id_, json.dumps(result), flush=True)
