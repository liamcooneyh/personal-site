import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArtViewer } from './ArtViewer';
import { artSrc, describeArt, type Artwork } from '../data/content';

type RoomKind = 'painting' | 'sketch';

/** Each piece only needs its image once it's within a few steps of the one on view. */
const LOAD_AHEAD = 3;

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
 * A gallery wall: one piece in focus at a time, neighbours either side. It's a native
 * horizontal scroller that snaps each piece to the centre, so a swipe follows the finger
 * on phones and a trackpad works on laptops; the arrows and keyboard scroll it too.
 * Click the piece in focus to see it full-screen.
 */
export const GalleryRoom = ({ artworks, kind, label }: GalleryRoomProps) => {
  const [index, setIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const seen = useRef(new Set<number>());
  const indexRef = useRef(0);

  const count = artworks.length;

  /** Where an item's centre sits, measured from the wall's centre (in scroll pixels). */
  const offsetFromCentre = (wall: HTMLElement, item: Element) => {
    const wallBox = wall.getBoundingClientRect();
    const itemBox = item.getBoundingClientRect();
    return itemBox.left + itemBox.width / 2 - (wallBox.left + wallBox.width / 2);
  };

  const leftFor = (i: number) => {
    const wall = wallRef.current;
    const item = trackRef.current?.children[i];
    if (!wall || !item) return null;
    return wall.scrollLeft + offsetFromCentre(wall, item);
  };

  const go = (next: number) => {
    const target = Math.min(count - 1, Math.max(0, next));
    const left = leftFor(target);
    if (left === null) return;
    indexRef.current = target;
    setIndex(target);
    wallRef.current?.scrollTo({ left, behavior: 'smooth' });
  };

  // start with the first piece centred, and keep the current one centred if the wall resizes
  useLayoutEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const recentre = () => {
      const left = leftFor(indexRef.current);
      if (left !== null) wall.scrollLeft = left;
    };
    recentre();
    const observer = new ResizeObserver(recentre);
    observer.observe(wall);
    return () => observer.disconnect();
  }, []);

  // the piece nearest the centre is the one in focus
  useEffect(() => {
    const wall = wallRef.current;
    const track = trackRef.current;
    if (!wall || !track) return;
    // scroll events already arrive at most once per frame
    const onScroll = () => {
      let nearest = 0;
      let best = Infinity;
      Array.from(track.children).forEach((item, i) => {
        const distance = Math.abs(offsetFromCentre(wall, item));
        if (distance < best) {
          best = distance;
          nearest = i;
        }
      });
      indexRef.current = nearest;
      setIndex(nearest);
    };
    wall.addEventListener('scroll', onScroll, { passive: true });
    return () => wall.removeEventListener('scroll', onScroll);
  }, []);

  for (let i = index - LOAD_AHEAD; i <= index + LOAD_AHEAD; i += 1) {
    if (i >= 0 && i < count) seen.current.add(i);
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') go(indexRef.current + 1);
    else if (event.key === 'ArrowLeft') go(indexRef.current - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(count - 1);
    else return;
    event.preventDefault();
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
      >
        <ul ref={trackRef} className="room__track">
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
      </div>

      <div className="room__bar">
        {placard && (
          <p className="room__placard" aria-live="polite">
            <strong>{placard.title}</strong>
            <span>{placard.detail}</span>
          </p>
        )}
        <div className="room__controls">
          <button type="button" className="round" aria-label="Previous piece" disabled={index === 0} onClick={() => go(indexRef.current - 1)}>
            ←
          </button>
          <p className="room__count">
            {index + 1} of {count}
          </p>
          <button type="button" className="round" aria-label="Next piece" disabled={index === count - 1} onClick={() => go(indexRef.current + 1)}>
            →
          </button>
        </div>
      </div>

      <ArtViewer artworks={artworks} openIndex={openIndex} onChange={setOpenIndex} />
    </div>
  );
};
