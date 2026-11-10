import { useState, type CSSProperties } from 'react';
import { ArtViewer } from './ArtViewer';
import { artSrc, describeArt, type Artwork } from '../data/content';

type ArtWallProps = {
  artworks: Artwork[];
};

/**
 * Justified rows: every piece keeps its real proportions (nothing cropped) and each row fills
 * the width. Each item grows in proportion to its aspect ratio, so a row shares one height.
 */
export const ArtWall = ({ artworks }: ArtWallProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="gallery">
        {artworks.map((artwork, index) => (
          <li
            key={artwork.id}
            className="gallery__item"
            style={{ '--ratio': artwork.w / artwork.h } as CSSProperties}
          >
            <button type="button" className="gallery__button" onClick={() => setOpenIndex(index)}>
              <img
                src={artSrc(artwork, 's')}
                alt={describeArt(artwork)}
                width={artwork.w}
                height={artwork.h}
                loading="lazy"
                decoding="async"
              />
            </button>
          </li>
        ))}
      </ul>
      <ArtViewer artworks={artworks} openIndex={openIndex} onChange={setOpenIndex} />
    </>
  );
};
