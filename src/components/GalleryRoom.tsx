import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ArtViewer } from './ArtViewer';
import { artSrc, describeArt, type Artwork } from '../data/content';

type RoomKind = 'painting' | 'sketch';

/** Each piece only needs its image once it's within a few steps of the one on view. */
const LOAD_AHEAD = 3;
const SWIPE_PX = 40;

const placardFor = (artwork: Artwork, kind: RoomKind) => ({
  title: artwork.title ?? 'Untitled',
  detail: [artwork.kind ?? (kind === 'sketch' ? 'Sketchbook' : 'Painting'), artwork.year].filter(Boolean).join(', '),
});

type GalleryRoomProps = {
  artworks: Artwork[];
  kind: RoomKind;
  label: string;
};

/**
 * A gallery wall: one piece in focus at a time, neighbours either side, walk with the
 * arrows, a swipe, or the keyboard. Click the piece in the light to see it full-screen.
 */
export const GalleryRoom = ({ artworks, kind, label }: GalleryRoomProps) => {
  const [index, setIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [shift, setShift] = useState(0);
  const wallRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const seen = useRef(new Set<number>());
  const swipe = useRef<{ x: number; id: number } | null>(null);
  const didSwipe = useRef(false);

  const count = artworks.length;
  const go = (next: number) => setIndex(Math.min(count - 1, Math.max(0, next)));

  // centre the active piece on the wall
  useLayoutEffect(() => {
    const wall = wallRef.current;
    const track = trackRef.current;
    if (!wall || !track) return;
    const centre = () => {
      const item = track.children[index] as HTMLElement | undefined;
      if (!item) return;
      setShift(wall.clientWidth / 2 - (item.offsetLeft + item.offsetWidth / 2));
    };
    centre();
    const observer = new ResizeObserver(centre);
    observer.observe(wall);
    return () => observer.disconnect();
  }, [index]);

  for (let i = index - LOAD_AHEAD; i <= index + LOAD_AHEAD; i += 1) {
    if (i >= 0 && i < count) seen.current.add(i);
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(count - 1);
    else return;
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipe.current = { x: event.clientX, id: event.pointerId };
    didSwipe.current = false;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) < SWIPE_PX) return;
    didSwipe.current = true;
    go(index + (delta < 0 ? 1 : -1));
  };

  const active = artworks[index];
  const placard = active ? placardFor(active, kind) : null;

  return (
    <div className={`room room--${kind}`}>
      <div
        ref={wallRef}
        className="room__wall"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div className="room__light" aria-hidden="true" />
        <ul ref={trackRef} className="room__track" style={{ translate: `${shift}px 0` }}>
          {artworks.map((artwork, i) => {
            const isActive = i === index;
            return (
              <li
                key={artwork.id}
                className={`room__piece${isActive ? ' is-active' : ''}`}
                style={{ '--ratio': artwork.w / artwork.h } as CSSProperties}
                aria-hidden={Math.abs(i - index) > 1}
              >
                <button
                  type="button"
                  className="room__art"
                  tabIndex={isActive ? 0 : -1}
                  aria-label={isActive ? `See ${describeArt(artwork)} full-screen` : `Go to ${describeArt(artwork)}`}
                  onClick={() => {
                    if (didSwipe.current) return;
                    if (isActive) setOpenIndex(i);
                    else go(i);
                  }}
                >
                  {seen.current.has(i) && (
                    <img src={artSrc(artwork, 's')} alt="" draggable={false} decoding="async" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="room__floor" aria-hidden="true" />
      </div>

      <div className="room__bar">
        {placard && (
          <p className="room__placard" aria-live="polite">
            <strong>{placard.title}</strong>
            <span>{placard.detail}</span>
          </p>
        )}
        <p className="room__count">
          {index + 1} of {count}
        </p>
        <div className="room__controls">
          <button type="button" className="round" aria-label="Previous piece" disabled={index === 0} onClick={() => go(index - 1)}>
            ←
          </button>
          <button type="button" className="round" aria-label="Next piece" disabled={index === count - 1} onClick={() => go(index + 1)}>
            →
          </button>
        </div>
      </div>

      <ArtViewer artworks={artworks} openIndex={openIndex} onChange={setOpenIndex} />
    </div>
  );
};
