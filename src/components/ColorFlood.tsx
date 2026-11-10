import { useEffect, useRef, useState } from 'react';

export type FloodColor = { r: number; g: number; b: number; hex: string };

type ColorFloodProps = {
  color: FloodColor;
  origin: { x: number; y: number };
  palette: FloodColor[];
  source: string;
  onPick: (color: FloodColor) => void;
  onClose: () => void;
};

const toHsl = ({ r, g, b }: FloodColor) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

const isLight = ({ r, g, b }: FloodColor) => r * 0.299 + g * 0.587 + b * 0.114 > 150;

/** Floods the whole screen with a colour picked from a painting, opening from where it was clicked. */
export const ColorFlood = ({ color, origin, palette, source, onPick, onClose }: ColorFloodProps) => {
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hsl = toHsl(color);
  const ink = isLight(color) ? '#000' : '#fff';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.classList.add('flood-open');
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('flood-open');
    };
  }, [onClose]);

  useEffect(() => setCopied(false), [color.hex]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(color.hex);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="flood"
      role="dialog"
      aria-modal="true"
      aria-label={`Colour ${color.hex}`}
      style={{
        background: color.hex,
        color: ink,
        ['--ox' as string]: `${origin.x}px`,
        ['--oy' as string]: `${origin.y}px`,
      }}
    >
      <div className="flood__body">
        <p className="flood__from">Picked from {source}</p>
        <p className="flood__hex">{color.hex}</p>
        <dl className="flood__values">
          <div>
            <dt>RGB</dt>
            <dd>
              {color.r}, {color.g}, {color.b}
            </dd>
          </div>
          <div>
            <dt>HSL</dt>
            <dd>
              {hsl.h}°, {hsl.s}%, {hsl.l}%
            </dd>
          </div>
        </dl>
        <div className="flood__palette" aria-label="Main colours in this painting">
          {palette.map((swatch) => (
            <button
              key={swatch.hex}
              type="button"
              className={`flood__swatch${swatch.hex === color.hex ? ' is-current' : ''}`}
              style={{ background: swatch.hex, borderColor: ink }}
              aria-label={`Show ${swatch.hex}`}
              onClick={() => onPick(swatch)}
            />
          ))}
        </div>
        <div className="flood__actions">
          <button type="button" className="flood__btn" style={{ borderColor: ink, color: ink }} onClick={copy}>
            {copied ? 'Copied' : 'Copy hex'}
          </button>
          <button
            ref={closeRef}
            type="button"
            className="flood__btn"
            style={{ borderColor: ink, color: ink }}
            onClick={onClose}
          >
            Back to the painting
          </button>
        </div>
      </div>
    </div>
  );
};
