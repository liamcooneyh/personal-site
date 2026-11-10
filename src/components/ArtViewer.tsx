import { useEffect, useRef } from 'react';
import { ZoomImage } from './ZoomImage';
import { artSrc, captionArt, describeArt, type Artwork } from '../data/content';

type ArtViewerProps = {
  artworks: Artwork[];
  openIndex: number | null;
  onChange: (index: number | null) => void;
};

/** Full-screen look at one piece, with zoom and previous/next. Shared by every art view. */
export const ArtViewer = ({ artworks, openIndex, onChange }: ArtViewerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = openIndex === null ? null : artworks[openIndex];
  const setOpenIndex = onChange;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  const step = (direction: 1 | -1) =>
    openIndex === null ? undefined : onChange((openIndex + direction + artworks.length) % artworks.length);

  return (
    <dialog
        ref={dialogRef}
        className="viewer"
        onClose={() => setOpenIndex(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpenIndex(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1);
          if (event.key === 'ArrowLeft') step(-1);
        }}
      >
        {open && (
          <div className="viewer__body">
            <ZoomImage className="viewer__image" src={artSrc(open, 'l')} alt={describeArt(open)} />
            <p className="viewer__tip">
              Click the {open.section === 'sketch' ? 'sketch' : 'painting'} to zoom in, move to look around
            </p>
            <div className="viewer__bar">
              <p className="viewer__caption">{open.title || open.kind || open.year ? captionArt(open) : describeArt(open)}</p>
              <div className="viewer__actions">
                <button type="button" className="round round--light" aria-label="Previous" onClick={() => step(-1)}>
                  ←
                </button>
                <button type="button" className="round round--light" aria-label="Next" onClick={() => step(1)}>
                  →
                </button>
                <button type="button" className="pill pill--light" onClick={() => setOpenIndex(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </dialog>
  );
};
