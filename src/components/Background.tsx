import { useEffect, useRef, useState } from 'react';

/**
 * Ambient page backgrounds. Nothing here moves across the screen or reacts to the pointer:
 * marks only fade in and out where they sit, so it stays comfortable for motion-sensitive
 * viewers (it runs even with Reduce Motion on, at Liam's request).
 */
export type BackgroundMode = 'color' | 'dots' | 'speckles' | 'none';

const MODES: { id: BackgroundMode; label: string }[] = [
  { id: 'color', label: 'Slow color' },
  { id: 'dots', label: 'Dot grid' },
  { id: 'speckles', label: 'Ink splashes' },
  { id: 'none', label: 'None' },
];

const STORAGE_KEY = 'bg-mode';
const FPS = 30;

const readMode = (): BackgroundMode => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return MODES.some((m) => m.id === value) ? (value as BackgroundMode) : 'color';
  } catch {
    return 'color';
  }
};

const inkColour = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#000';

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, ink: readonly number[]) => void;

/** Ink splashes: a drop lands, the blot spreads with droplets flung out, sits, then fades. */
const makeSplashes = (w: number, h: number): Painter => {
  type Drop = { dx: number; dy: number; r: number };
  type Splash = { x: number; y: number; born: number; r: number; edge: number[]; drops: Drop[]; streaks: Drop[] };
  const make = (t: number): Splash => {
    const r = 10 + Math.random() * 26;
    const edge = Array.from({ length: 28 }, () => 0.75 + Math.random() * 0.45);
    const drops = Array.from({ length: 6 + Math.floor(Math.random() * 10) }, () => {
      const ang = Math.random() * Math.PI * 2;
      const dist = r * (1.6 + Math.random() * 3.2);
      return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, r: 1 + Math.random() * r * 0.18 };
    });
    const streaks = Array.from({ length: 2 + Math.floor(Math.random() * 4) }, () => {
      const ang = Math.random() * Math.PI * 2;
      const dist = r * (1.4 + Math.random() * 2);
      return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, r: 1.2 + Math.random() * 2 };
    });
    return { x: Math.random() * w, y: Math.random() * h, born: t, r, edge, drops, streaks };
  };
  const LIFE = 9;
  let splashes: Splash[] = [];
  let next = 0;
  const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  return (ctx, cw, ch, t, [r, g, b]) => {
    ctx.clearRect(0, 0, cw, ch);
    if (t >= next) {
      splashes.push(make(t));
      next = t + 0.7 + Math.random() * 0.9;
    }
    splashes = splashes.filter((sp) => t - sp.born < LIFE);
    for (const sp of splashes) {
      const age = t - sp.born;
      const grow = ease(age / 0.45);
      const fly = ease(age / 0.7);
      const fade = age < LIFE - 3 ? 1 : (LIFE - age) / 3;
      const alpha = 0.2 * fade;
      ctx.fillStyle = ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      // main blot with a ragged edge
      ctx.beginPath();
      sp.edge.forEach((e, i) => {
        const ang = (i / sp.edge.length) * Math.PI * 2;
        const rad = sp.r * grow * e;
        const px = sp.x + Math.cos(ang) * rad;
        const py = sp.y + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      // droplets flung outward
      for (const d of sp.drops) {
        ctx.beginPath();
        ctx.arc(sp.x + d.dx * fly, sp.y + d.dy * fly, d.r * Math.min(1, fly * 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
      // thin streaks pointing away from the centre
      ctx.lineCap = 'round';
      for (const st of sp.streaks) {
        ctx.lineWidth = st.r;
        ctx.beginPath();
        ctx.moveTo(sp.x + st.dx * 0.55 * fly, sp.y + st.dy * 0.55 * fly);
        ctx.lineTo(sp.x + st.dx * fly, sp.y + st.dy * fly);
        ctx.stroke();
      }
    }
  };
};

const PainterCanvas = ({ make }: { make: (w: number, h: number) => Painter }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let painter: Painter;
    let ink = hexToRgb(inkColour());
    const resize = () => {
      const scale = window.devicePixelRatio || 1;
      canvas.width = Math.round(window.innerWidth * scale);
      canvas.height = Math.round(window.innerHeight * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      painter = make(window.innerWidth, window.innerHeight);
    };
    resize();
    const start = performance.now();
    let last = 0;
    let frame = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 1000 / FPS) return;
      last = now;
      painter(ctx, window.innerWidth, window.innerHeight, (now - start) / 1000, ink);
    };
    frame = requestAnimationFrame(tick);
    const themeWatch = new MutationObserver(() => (ink = hexToRgb(inkColour())));
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => (ink = hexToRgb(inkColour()));
    media.addEventListener('change', onScheme);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      themeWatch.disconnect();
      media.removeEventListener('change', onScheme);
      window.removeEventListener('resize', resize);
    };
  }, [make]);

  return <canvas ref={ref} className="bg__canvas" aria-hidden="true" />;
};

const SHIFT_MS = 45000;
const PAUSE_KEY = 'bg-paused';

const washColours = () => {
  const root = getComputedStyle(document.documentElement);
  return [1, 2, 3, 4, 5].map((i) => root.getPropertyValue(`--wash-${i}`).trim()).filter(Boolean);
};

/**
 * One full-page colour field that slowly cross-fades through the palette of the painting in the
 * hero. Nothing changes position; only the tint changes, over ~45 seconds per step.
 */
const SlowColor = ({ isPaused }: { isPaused: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    let step = 0;
    const apply = () => {
      const colours = washColours();
      if (colours.length === 0) return;
      field.style.setProperty('--tint-a', colours[step % colours.length] ?? '#888');
      field.style.setProperty('--tint-b', colours[(step + 2) % colours.length] ?? '#888');
      field.style.color = colours[(step + 2) % colours.length] ?? '#888';
      field.style.backgroundColor = '';
      step += 1;
    };
    // first colour appears instantly; only later steps cross-fade
    field.style.transition = 'none';
    apply();
    void field.offsetWidth;
    field.style.transition = '';
    if (isPaused) {
      // freeze exactly where it is
      const now = getComputedStyle(field);
      field.style.transition = 'none';
      field.style.backgroundColor = now.backgroundColor;
      field.style.color = now.color;
      return;
    }
    const timer = window.setInterval(apply, SHIFT_MS);
    const onVisibility = () => {
      if (!document.hidden) apply();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isPaused]);

  return <div ref={ref} className="bg__color" />;
};

export const Background = () => {
  const [mode, setMode] = useState<BackgroundMode>(readMode);
  const [isPaused, setIsPaused] = useState(() => {
    try {
      return window.localStorage.getItem(PAUSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const togglePause = () => {
    setIsPaused((current) => {
      try {
        window.localStorage.setItem(PAUSE_KEY, current ? '0' : '1');
      } catch {
        // storage blocked
      }
      return !current;
    });
  };

  const choose = (next: BackgroundMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  };

  return (
    <>
      <div className="bg" aria-hidden="true">
        {mode === 'color' && <SlowColor isPaused={isPaused} />}
        {mode === 'dots' && <div className="bg__dots" />}
        {mode === 'speckles' && <PainterCanvas make={makeSplashes} />}
      </div>
      {mode === 'color' && (
        <button
          type="button"
          className="bg-pause"
          onClick={togglePause}
          aria-pressed={isPaused}
          aria-label={isPaused ? 'Play background colour' : 'Pause background colour'}
          title={isPaused ? 'Play background' : 'Pause background'}
        >
          {isPaused ? (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
          )}
        </button>
      )}
      {/* temporary: lets Liam compare backgrounds in dev only; remove once one is chosen */}
      {import.meta.env.DEV && (
      <div className="bg-switch" role="group" aria-label="Background (preview)">
        <span className="bg-switch__label">Background</span>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="bg-switch__btn"
            aria-pressed={mode === m.id}
            onClick={() => choose(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      )}
    </>
  );
};
