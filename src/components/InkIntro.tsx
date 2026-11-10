import { useEffect, useMemo, useState } from 'react';
import { sketchBurst, strokePath } from '../lib/burst';

const SEEN_KEY = 'ink-intro-seen';
const DRAW_MS = 1500;
const OPEN_MS = 900;
const HOLE_RADIUS = 78;

const shouldPlay = () => {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('intro')) return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) !== '1';
  } catch {
    return true;
  }
};

const rememberSeen = () => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // storage blocked: the intro just plays again next time
  }
};

type Phase = 'drawing' | 'opening' | 'done';

export const InkIntro = () => {
  const [phase, setPhase] = useState<Phase>(() => (shouldPlay() ? 'drawing' : 'done'));
  const strokes = useMemo(() => sketchBurst(HOLE_RADIUS), []);

  useEffect(() => {
    if (phase === 'done') return;
    document.documentElement.classList.add('intro-active');
    if (new URLSearchParams(window.location.search).get('intro') === 'hold') return;
    const toOpen = window.setTimeout(() => setPhase('opening'), DRAW_MS);
    const toDone = window.setTimeout(() => setPhase('done'), DRAW_MS + OPEN_MS);
    const skip = () => setPhase('done');
    window.addEventListener('keydown', skip, { once: true });
    return () => {
      window.clearTimeout(toOpen);
      window.clearTimeout(toDone);
      window.removeEventListener('keydown', skip);
    };
  }, [phase === 'done']);

  useEffect(() => {
    if (phase !== 'done') return;
    rememberSeen();
    document.documentElement.classList.remove('intro-active');
  }, [phase]);

  if (phase === 'done') return null;

  const size = HOLE_RADIUS * 13;

  return (
    <div
      className={`intro intro--${phase}`}
      style={{ ['--hole' as string]: `${HOLE_RADIUS}px`, ['--open-ms' as string]: `${OPEN_MS}ms` }}
      onClick={() => setPhase('done')}
      aria-hidden="true"
    >
      <svg className="intro__burst" viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width={size} height={size}>
        <defs>
          <mask id="intro-hole" maskUnits="userSpaceOnUse" x={-size / 2} y={-size / 2} width={size} height={size}>
            <rect x={-size / 2} y={-size / 2} width={size} height={size} fill="#fff" />
            <circle r={HOLE_RADIUS} fill="#000" />
          </mask>
        </defs>
        <g mask="url(#intro-hole)">
        {strokes.map((stroke, index) => (
          <path
            key={index}
            d={strokePath(stroke)}
            pathLength={1}
            strokeWidth={stroke.width}
            style={{ animationDelay: `${stroke.turn * (DRAW_MS - 380)}ms` }}
          />
        ))}
        </g>
      </svg>
      <p className="intro__skip">Click to skip</p>
    </div>
  );
};
