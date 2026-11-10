import { useEffect, useState, type PointerEvent } from 'react';

type ZoomImageProps = {
  src: string;
  alt: string;
  className?: string;
  scale?: number;
};

/** Click to zoom into a painting; move the pointer to pan; click again to zoom out. */
export const ZoomImage = ({ src, alt, className, scale = 2.6 }: ZoomImageProps) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  useEffect(() => setIsZoomed(false), [src]);

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
  };

  return (
    <div
      className={`zoom${isZoomed ? ' is-zoomed' : ''}${className ? ` ${className}` : ''}`}
      onPointerMove={follow}
      onPointerDown={follow}
      onClick={() => setIsZoomed((current) => !current)}
      role="button"
      tabIndex={0}
      aria-pressed={isZoomed}
      aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setIsZoomed((current) => !current);
        }
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{ transformOrigin: origin, transform: isZoomed ? `scale(${scale})` : undefined }}
      />
    </div>
  );
};
