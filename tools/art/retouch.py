"""Hand-requested retouches applied after processing (painting not yet updated in real life)."""
import cv2
import numpy as np
from PIL import Image


def darken_green_haze(path, box=(0.0, 0.2, 0.5, 0.7), strength=1.0):
    """a096: pull the light green haze around the left face and tongue to the dark green behind the head."""
    rgb = np.asarray(Image.open(path).convert('RGB'))
    h, w = rgb.shape[:2]
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hue, sat = hsv[..., 0], hsv[..., 1]
    green = ((hue >= 29) & (hue <= 100) & ((sat > 35) | (hsv[..., 2] > 90))).astype(np.float32)
    whites = ((hsv[..., 2] > 150) & (sat < 70)).astype(np.uint8)
    whites = cv2.morphologyEx(whites, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab_cc, stats, _ = cv2.connectedComponentsWithStats(whites)
    keep_whites = np.zeros_like(whites)
    for i in range(1, n):  # eye whites are compact blobs, haze is broad
        if 30 < stats[i, cv2.CC_STAT_AREA] < h * w * 0.004:
            keep_whites[lab_cc == i] = 1
    green[cv2.dilate(keep_whites, np.ones((9, 9), np.uint8)) > 0] = 0
    green = cv2.morphologyEx(green, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    L = lab[..., 0]
    gl = L[green > 0]
    target = lab[(green > 0) & (L < np.percentile(gl, 30))].reshape(-1, 3).mean(0)
    region = np.zeros((h, w), np.float32)
    x0, y0, x1, y1 = box
    region[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = 1
    region = cv2.GaussianBlur(region, (0, 0), w * 0.04)
    weight = cv2.GaussianBlur(green, (0, 0), 3) * region * strength
    blur = cv2.GaussianBlur(lab, (0, 0), w * 0.02)
    detail = lab - blur
    lifted = np.clip((blur[..., 0] - target[0]) / 25, 0, 1)  # only darken what is lighter than target
    w3 = (weight * lifted)[..., None]
    new = target + detail * 0.85
    out = lab * (1 - w3) + new * w3
    res = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    return Image.fromarray(res)


RETOUCH = {'a096': darken_green_haze}


def dehaze(path, omega=0.85, window_frac=0.03):
    """Dark-channel-prior dehaze: removes broad milky sheen over dark paintings."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255
    h, w = rgb.shape[:2]
    k = max(15, int(min(h, w) * window_frac) | 1)
    dark = cv2.erode(rgb.min(axis=2), np.ones((k, k), np.uint8))
    flat = dark.ravel()
    idx = np.argsort(flat)[-max(1, flat.size // 1000):]
    A = rgb.reshape(-1, 3)[idx].mean(0)
    t = 1 - omega * cv2.erode((rgb / A).min(axis=2), np.ones((k, k), np.uint8))
    t = cv2.GaussianBlur(t, (0, 0), k / 2)  # soften so edges don't halo
    t = np.clip(t, 0.35, 1)[..., None]
    out = (rgb - A) / t + A
    out = np.clip(out, 0, 1)
    # keep overall brightness close to the original so it doesn't go muddy
    out *= np.clip(rgb.mean() / max(out.mean(), 1e-3), 1, 1.3)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


RETOUCH['a159'] = dehaze
