import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { artSrc, captionArt, describeArt, type Artwork } from '../data/content';
import { rimBurst, type BurstStroke } from '../lib/burst';
import { ColorFlood, type FloodColor } from './ColorFlood';
import { ZoomImage } from './ZoomImage';

type DataLensProps = {
  artworks: Artwork[];
};

type Point = { x: number; y: number };
type Sample = { hex: string; r: number; g: number; b: number };

const LENS_COLUMNS = 44;
const DATA_COLUMNS = 14;
const RIM_BASE = 100;
const RIM_STROKES = rimBurst(RIM_BASE);

/** Lens size scales with the painting so it never swallows it. */
const lensRadius = (width: number, height: number) => Math.round(Math.min(60, Math.min(width, height) * 0.3));

type RimLayer = { path: Path2D; width: number };

/** Strokes grouped into a few width buckets so the rim is a handful of path draws per frame. */
const buildRim = (strokes: BurstStroke[]): RimLayer[] => {
  const buckets = new Map<number, Path2D>();
  for (const stroke of strokes) {
    const width = Math.round(stroke.width * 2) / 2;
    const path = buckets.get(width) ?? new Path2D();
    path.moveTo(stroke.x1, stroke.y1);
    path.quadraticCurveTo(stroke.cx, stroke.cy, stroke.x2, stroke.y2);
    buckets.set(width, path);
  }
  return [...buckets].map(([width, path]) => ({ width, path }));
};

let rimLayers: RimLayer[] | null = null;
const getRim = () => (rimLayers ??= buildRim(RIM_STROKES));

const toHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const buildGrid = (image: HTMLImageElement, columns: number) => {
  const rows = Math.max(1, Math.round((columns * image.naturalHeight) / image.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, columns, rows);
  return { canvas, context, columns, rows };
};

type Grid = NonNullable<ReturnType<typeof buildGrid>>;

const sampleAt = (grid: Grid, point: Point, width: number, height: number): Sample => {
  const column = Math.min(grid.columns - 1, Math.max(0, Math.floor((point.x / width) * grid.columns)));
  const row = Math.min(grid.rows - 1, Math.max(0, Math.floor((point.y / height) * grid.rows)));
  const [r = 0, g = 0, b = 0] = grid.context.getImageData(column, row, 1, 1).data;
  return { r, g, b, hex: `#${toHex(r)}${toHex(g)}${toHex(b)}` };
};

const drawGridLines = (
  context: CanvasRenderingContext2D,
  grid: Grid,
  width: number,
  height: number,
  alpha: number,
) => {
  const cellWidth = width / grid.columns;
  const cellHeight = height / grid.rows;
  context.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 1; column < grid.columns; column += 1) {
    context.moveTo(Math.round(column * cellWidth) + 0.5, 0);
    context.lineTo(Math.round(column * cellWidth) + 0.5, height);
  }
  for (let row = 1; row < grid.rows; row += 1) {
    context.moveTo(0, Math.round(row * cellHeight) + 0.5);
    context.lineTo(width, Math.round(row * cellHeight) + 0.5);
  }
  context.stroke();
};

const drawDataMode = (
  context: CanvasRenderingContext2D,
  grid: Grid,
  width: number,
  height: number,
  hover: { column: number; row: number } | null,
) => {
  context.imageSmoothingEnabled = false;
  context.drawImage(grid.canvas, 0, 0, width, height);
  drawGridLines(context, grid, width, height, 0.35);

  const cellWidth = width / grid.columns;
  const cellHeight = height / grid.rows;
  const fontSize = Math.max(6, Math.min(10, cellWidth / 6.4));
  context.font = `600 ${fontSize}px Archivo, sans-serif`;
  if ('fontStretch' in context) (context as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'condensed';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const pixels = grid.context.getImageData(0, 0, grid.columns, grid.rows).data;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const offset = (row * grid.columns + column) * 4;
      const r = pixels[offset] ?? 0;
      const g = pixels[offset + 1] ?? 0;
      const b = pixels[offset + 2] ?? 0;
      const isLight = r * 0.299 + g * 0.587 + b * 0.114 > 150;
      context.fillStyle = isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
      context.fillText(
        `${toHex(r)}${toHex(g)}${toHex(b)}`,
        column * cellWidth + cellWidth / 2,
        row * cellHeight + cellHeight / 2,
      );
    }
  }
  if (hover) {
    context.lineWidth = 3;
    context.strokeStyle = '#000';
    context.strokeRect(hover.column * cellWidth, hover.row * cellHeight, cellWidth, cellHeight);
    context.lineWidth = 1.5;
    context.strokeStyle = '#fff';
    context.strokeRect(hover.column * cellWidth + 1.5, hover.row * cellHeight + 1.5, cellWidth - 3, cellHeight - 3);
  }
};

const drawLens = (
  context: CanvasRenderingContext2D,
  grid: Grid,
  point: Point,
  width: number,
  height: number,
) => {
  const radius = lensRadius(width, height);
  context.save();
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.clip();
  context.imageSmoothingEnabled = false;
  context.drawImage(grid.canvas, 0, 0, width, height);
  drawGridLines(context, grid, width, height, 0.28);

  const cellWidth = width / grid.columns;
  const cellHeight = height / grid.rows;
  const column = Math.floor(point.x / cellWidth);
  const row = Math.floor(point.y / cellHeight);
  context.strokeStyle = '#fff';
  context.lineWidth = 2;
  context.strokeRect(column * cellWidth, row * cellHeight, cellWidth, cellHeight);
  context.restore();

  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.lineWidth = 2;
  context.strokeStyle = '#fff';
  context.stroke();

  // ink-burst rim, after the sketch the site's intro is built on; clipped so the lens stays clear
  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.arc(point.x, point.y, radius, 0, Math.PI * 2, true);
  context.clip('evenodd');
  context.lineCap = 'round';
  context.translate(point.x, point.y);
  const scale = radius / RIM_BASE;
  context.scale(scale, scale);
  const rim = getRim();
  context.strokeStyle = 'rgba(255,255,255,0.4)';
  for (const layer of rim) {
    context.lineWidth = (layer.width * 0.8 + 1.2) / scale;
    context.stroke(layer.path);
  }
  context.strokeStyle = '#000';
  for (const layer of rim) {
    context.lineWidth = (layer.width * 0.8) / scale;
    context.stroke(layer.path);
  }
  context.restore();
};

const readoutPosition = (lens: Point, frame: HTMLDivElement | null) => {
  const width = frame?.clientWidth ?? 0;
  const height = frame?.clientHeight ?? 0;
  const radius = lensRadius(width, height);
  const below = lens.y + radius + 14;
  const top = below + 44 > height ? Math.max(8, lens.y - radius - 58) : below;
  const left = Math.min(Math.max(lens.x, 96), Math.max(96, width - 96));
  return { left, top };
};

/** The most common colours in a painting, from its data grid (bucketed so near-duplicates merge). */
const paletteOf = (grid: Grid, size = 10): FloodColor[] => {
  const pixels = grid.context.getImageData(0, 0, grid.columns, grid.rows).data;
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, size)
    .map(({ r, g, b, n }) => {
      const [rr, gg, bb] = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
      return { r: rr, g: gg, b: bb, hex: `#${toHex(rr)}${toHex(gg)}${toHex(bb)}` };
    });
};

export const DataLens = ({ artworks }: DataLensProps) => {
  const [index, setIndex] = useState(0);
  const [isDataMode, setIsDataMode] = useState(false);
  const [isLensOn, setIsLensOn] = useState(true);
  const [hoverCell, setHoverCell] = useState<{ column: number; row: number; x: number; y: number; sample: Sample } | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const zoomDialogRef = useRef<HTMLDialogElement>(null);
  const [flood, setFlood] = useState<{ color: FloodColor; origin: Point; palette: FloodColor[] } | null>(null);
  const [lens, setLens] = useState<Point | null>(null);
  const [sample, setSample] = useState<Sample | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const gridsRef = useRef<{ lens: Grid; data: Grid } | null>(null);
  const hasSweptRef = useRef(false);
  const sweepFrameRef = useRef<number | null>(null);

  const artwork = artworks[index % artworks.length];

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const grids = gridsRef.current;
    if (!canvas || !frame || !grids) return;
    const { clientWidth: width, clientHeight: height } = frame;
    const scale = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * scale)) canvas.width = Math.round(width * scale);
    if (canvas.height !== Math.round(height * scale)) canvas.height = Math.round(height * scale);
    // pin the CSS size to the buffer so a stale size can never stretch the lens into an oval
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    if (isDataMode) {
      drawDataMode(context, grids.data, width, height, hoverCell);
      return;
    }
    if (lens && isLensOn) drawLens(context, grids.lens, lens, width, height);
  }, [isDataMode, lens, isLensOn, hoverCell]);

  const placeLens = useCallback((point: Point) => {
    const frame = frameRef.current;
    const grids = gridsRef.current;
    if (!frame || !grids) return;
    const { clientWidth: width, clientHeight: height } = frame;
    setLens(point);
    setSample(sampleAt(grids.lens, point, width, height));
  }, []);

  const runIntroSweep = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || hasSweptRef.current) return;
    hasSweptRef.current = true;
    const { clientWidth: width, clientHeight: height } = frame;
    const rest = { x: width * 0.58, y: height * 0.36 };
    if (prefersReducedMotion()) {
      placeLens(rest);
      return;
    }
    const start = performance.now();
    const duration = 1700;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      placeLens({
        x: width * (0.12 + eased * 0.46),
        y: height * (0.78 - eased * 0.42) + Math.sin(eased * Math.PI) * height * -0.08,
      });
      if (progress < 1) sweepFrameRef.current = requestAnimationFrame(step);
    };
    sweepFrameRef.current = requestAnimationFrame(step);
  }, [placeLens]);

  const handleImageLoad = () => {
    const image = imageRef.current;
    if (!image) return;
    const lensGrid = buildGrid(image, LENS_COLUMNS);
    const dataGrid = buildGrid(image, DATA_COLUMNS);
    if (!lensGrid || !dataGrid) return;
    gridsRef.current = { lens: lensGrid, data: dataGrid };
    if (!hasSweptRef.current) {
      runIntroSweep();
      return;
    }
    const frame = frameRef.current;
    if (frame) {
      const { clientWidth: width, clientHeight: height } = frame;
      placeLens({ x: width * 0.58, y: height * 0.36 });
    }
  };

  const stopSweep = () => {
    if (sweepFrameRef.current !== null) cancelAnimationFrame(sweepFrameRef.current);
    sweepFrameRef.current = null;
  };

  const cellAt = (event: PointerEvent<HTMLDivElement>) => {
    const frame = event.currentTarget;
    const grids = gridsRef.current;
    if (!grids) return null;
    const bounds = frame.getBoundingClientRect();
    const x = event.clientX - bounds.left - frame.clientLeft;
    const y = event.clientY - bounds.top - frame.clientTop;
    const grid = grids.data;
    const column = Math.min(grid.columns - 1, Math.max(0, Math.floor((x / frame.clientWidth) * grid.columns)));
    const row = Math.min(grid.rows - 1, Math.max(0, Math.floor((y / frame.clientHeight) * grid.rows)));
    const [r = 0, g = 0, b = 0] = grid.context.getImageData(column, row, 1, 1).data;
    const cellWidth = frame.clientWidth / grid.columns;
    const cellHeight = frame.clientHeight / grid.rows;
    return {
      column,
      row,
      x: (column + 0.5) * cellWidth,
      y: (row + 1) * cellHeight,
      sample: { r, g, b, hex: `#${toHex(r)}${toHex(g)}${toHex(b)}` },
    };
  };

  const lastPointerRef = useRef<string>('mouse');

  const openLensFlood = (clientX: number, clientY: number) => {
    const grids = gridsRef.current;
    if (!grids || !sample) return;
    setFlood({ color: sample, origin: { x: clientX, y: clientY }, palette: paletteOf(grids.data) });
  };

  const openFlood = (event: PointerEvent<HTMLDivElement>) => {
    const cell = cellAt(event);
    const grids = gridsRef.current;
    if (!cell || !grids) return;
    setFlood({ color: cell.sample, origin: { x: event.clientX, y: event.clientY }, palette: paletteOf(grids.data) });
  };

  const handlePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (isDataMode) {
      setHoverCell(cellAt(event));
      return;
    }
    if (!isLensOn) return;
    lastPointerRef.current = event.pointerType;
    if (event.pointerType === 'touch' && event.type === 'pointermove' && event.buttons === 0) return;
    stopSweep();
    const frame = event.currentTarget;
    const bounds = frame.getBoundingClientRect();
    placeLens({ x: event.clientX - bounds.left - frame.clientLeft, y: event.clientY - bounds.top - frame.clientTop });
  };

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const frame = frameRef.current;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => redraw());
    if (frame && observer) observer.observe(frame);
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      stopSweep();
    };
  }, [redraw]);

  if (!artwork) return null;

  const step = (direction: 1 | -1) => {
    stopSweep();
    setHoverCell(null);
    setIndex((current) => (current + direction + artworks.length) % artworks.length);
  };

  return (
    <figure className="lens">
      <div className="lens__stage">
      <div
        ref={frameRef}
        className={`lens__frame${isDataMode ? ' is-data' : ''}${isLensOn ? '' : ' is-off'}`}
        style={{
          aspectRatio: `${artwork.w} / ${artwork.h}`,
          width: `min(calc(100% - 20px), calc((min(100svh, 980px) - 225px) * ${(artwork.w / artwork.h).toFixed(4)}))`,
        }}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={(event) => {
          setHoverCell(null);
          if (event.pointerType === 'mouse' && sweepFrameRef.current === null) setLens(null);
        }}
        onClick={(event) => {
          if (isDataMode) {
            openFlood(event as unknown as PointerEvent<HTMLDivElement>);
            return;
          }
          // on touch a tap moves the lens; the readout pill opens the colour instead
          if (isLensOn && lastPointerRef.current !== 'touch') openLensFlood(event.clientX, event.clientY);
        }}
      >
        <img
          ref={imageRef}
          key={artwork.id}
          className="lens__image"
          src={artSrc(artwork, 'l')}
          alt={describeArt(artwork)}
          onLoad={handleImageLoad}
          draggable={false}
        />
        <canvas ref={canvasRef} className="lens__canvas" aria-hidden="true" />
        {sample && lens && isLensOn && !isDataMode && (
          <button
            type="button"
            className="lens__readout lens__readout--button"
            style={readoutPosition(lens, frameRef.current)}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              openLensFlood(event.clientX, event.clientY);
            }}
            aria-label={`Fill the page with ${sample.hex}`}
          >
            <span className="lens__chip" style={{ background: sample.hex }} />
            <span className="lens__hex">{sample.hex}</span>
            <span className="lens__rgb">
              R {sample.r} G {sample.g} B {sample.b}
            </span>
          </button>
        )}
        {isDataMode && hoverCell && (
          <div className="lens__readout" style={readoutPosition({ x: hoverCell.x, y: hoverCell.y - 60 }, frameRef.current)} aria-hidden="true">
            <span className="lens__chip" style={{ background: hoverCell.sample.hex }} />
            <span className="lens__hex">{hoverCell.sample.hex}</span>
            <span className="lens__rgb">Click to fill the page</span>
          </div>
        )}
      </div>
      </div>

      {flood && (
        <ColorFlood
          color={flood.color}
          origin={flood.origin}
          palette={flood.palette}
          source={artwork.title || artwork.kind || artwork.year ? captionArt(artwork) : 'this painting'}
          onPick={(color) => setFlood((current) => (current ? { ...current, color } : current))}
          onClose={() => setFlood(null)}
        />
      )}

      {isZoomOpen && (
        <dialog
          ref={(node) => {
            zoomDialogRef.current = node;
            if (node && !node.open) node.showModal();
          }}
          className="viewer"
          onClose={() => setIsZoomOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsZoomOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') step(1);
            if (event.key === 'ArrowLeft') step(-1);
          }}
        >
          <div className="viewer__body">
            <ZoomImage className="viewer__image" src={artSrc(artwork, 'l')} alt={describeArt(artwork)} />
            <p className="viewer__tip">Click the painting to zoom in, move to look around</p>
            <div className="viewer__bar">
              <p className="viewer__caption">{captionArt(artwork)}</p>
              <div className="viewer__actions">
                <button type="button" className="round round--light" aria-label="Previous painting" onClick={() => step(-1)}>
                  ←
                </button>
                <button type="button" className="round round--light" aria-label="Next painting" onClick={() => step(1)}>
                  →
                </button>
                <button type="button" className="pill pill--light" onClick={() => setIsZoomOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      <figcaption className="lens__bar">
        <span className="lens__caption">
          {artwork.title || artwork.kind || artwork.year ? captionArt(artwork) : `Painting ${index + 1} of ${artworks.length}`}
        </span>
        <span className="lens__actions">
          <button
            type="button"
            className="pill pill--light lens__toggle"
            aria-pressed={isLensOn}
            onClick={() => {
              stopSweep();
              setIsLensOn((current) => !current);
            }}
          >
            {isLensOn ? 'Lens off' : 'Lens on'}
          </button>
          <button
            type="button"
            className="pill pill--light lens__datamode"
            aria-pressed={isDataMode}
            onClick={() => {
              setHoverCell(null);
              setIsDataMode((current) => !current);
            }}
          >
            {isDataMode ? 'Back to paint' : 'See it all as data'}
          </button>
          <button type="button" className="pill pill--light" onClick={() => setIsZoomOpen(true)}>
            Zoom
          </button>
          <button type="button" className="round round--sm" aria-label="Previous painting" onClick={() => step(-1)}>
            ←
          </button>
          <button type="button" className="round round--sm" aria-label="Next painting" onClick={() => step(1)}>
            →
          </button>
        </span>
      </figcaption>
    </figure>
  );
};
