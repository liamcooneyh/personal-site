import { useEffect, useMemo, useState } from 'react';
import strokes from '../data/lineup-strokes.json';
import { glideTo } from '../lib/glide';

const LINEUP = { src: '/landing/lineup.webp?v=eab305f0', w: strokes.w, h: strokes.h };
const DRAW_MS = 5200;
const PEN_WIDTH = 14;

type Stroke = { d: string; len: number };

/** Each stroke starts when the previous one ends, at a pace set by its length: one pen, moving. */
const useTimeline = (list: Stroke[]) =>
  useMemo(() => {
    // pace by length, give tiny strokes a floor, then scale so the whole drawing takes DRAW_MS
    const raw = list.map((s) => Math.max(s.len, 6));
    const scale = DRAW_MS / raw.reduce((sum, v) => sum + v, 0);
    let elapsed = 0;
    const items = list.map((s, i) => {
      const duration = (raw[i] ?? 6) * scale;
      const start = elapsed;
      elapsed += duration;
      return { ...s, start, duration };
    });
    return { items, end: elapsed };
  }, [list]);

/**
 * First screen: Liam's lineup drawing reveals itself stroke by stroke along his own pen lines
 * (the ink shown is the original drawing, uncovered through a mask), then holds still.
 * Timer-driven only; nothing follows the pointer.
 */
export const Landing = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const timeline = useTimeline(strokes.strokes as Stroke[]);

  // draw once the ink-burst intro has opened (or straight away if it isn't playing)
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('intro-active')) {
      setIsRevealed(true);
      return;
    }
    const observer = new MutationObserver(() => {
      if (!root.classList.contains('intro-active')) {
        setIsRevealed(true);
        observer.disconnect();
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const maskId = `pen-${drawCount}`;

  return (
    <section className={`landing${isRevealed ? ' is-revealed' : ''}`} aria-label="Intro">
      <svg
        key={drawCount}
        className="landing__lineup"
        viewBox={`0 0 ${LINEUP.w} ${LINEUP.h}`}
        role="img"
        aria-label="A row of seven faces drawn in pen by Liam"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={LINEUP.w} height={LINEUP.h}>
            <rect width={LINEUP.w} height={LINEUP.h} fill="#000" />
            <g className="landing__pen" fill="none" stroke="#fff" strokeWidth={PEN_WIDTH} strokeLinecap="round" strokeLinejoin="round">
              {timeline.items.map((s, index) => (
                <path
                  key={index}
                  d={s.d}
                  pathLength={1}
                  style={{ animationDelay: `${s.start}ms`, animationDuration: `${s.duration}ms` }}
                />
              ))}
            </g>
            {/* once the pen is done, let every last mark (filled mouths, dots) through */}
            <rect
              className="landing__settle"
              width={LINEUP.w}
              height={LINEUP.h}
              fill="#fff"
              style={{ animationDelay: `${timeline.end + 150}ms` }}
            />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <image href={LINEUP.src} width={LINEUP.w} height={LINEUP.h} />
        </g>
      </svg>
      <div className="landing__text">
        <p className="landing__name">Liam Cooney</p>
        <p className="landing__line">Data and GTM systems engineer in New York. I also paint and draw.</p>
      </div>
      <div className="landing__actions">
        <button type="button" className="pill landing__replay" onClick={() => setDrawCount((count) => count + 1)}>
          Replay
        </button>
        <a
          className="landing__scroll"
          href="#top"
          aria-label="Scroll to the rest of the site"
          onClick={(event) => {
            const target = document.getElementById('top');
            if (!target) return;
            event.preventDefault();
            glideTo(target);
            window.history.replaceState(null, '', '#top');
          }}
        >
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
};
