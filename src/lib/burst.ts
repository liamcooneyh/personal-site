/**
 * Geometry for the "ink burst" motif from one of Liam's sketches: a dense, nearly solid ring
 * of short pen strokes packed against a clean round hole, with longer strokes fanning out
 * from it in a loose swirl. Every stroke grazes the circle without entering it.
 */
export type BurstStroke = {
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
  width: number;
  /** Position around the circle, 0..1, used to draw the strokes in a hand-like sweep. */
  turn: number;
};

type LayerOptions = {
  count: number;
  /** Strokes graze the circle at radius * (1 + drift * random^crowding). */
  drift: number;
  crowding: number;
  /** Reach on each side of the grazing point, as multiples of radius. */
  reach: [number, number];
  width: [number, number];
  /** Share of strokes that flick much further out. */
  flicks: number;
  /** How far strokes extend behind their grazing point, relative to forward reach. */
  tail: [number, number];
};

type BurstOptions = {
  radius: number;
  seed: number;
  /** Mean tilt away from the tangent, in radians; a consistent sign gives the swirl. */
  swirl: number;
  layers: LayerOptions[];
};

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

export const makeBurst = ({ radius, seed, swirl, layers }: BurstOptions): BurstStroke[] => {
  const random = seededRandom(seed);
  const between = (min: number, max: number) => min + random() * (max - min);

  const strokes = layers.flatMap((layer) =>
    Array.from({ length: layer.count }, () => {
      const turn = random();
      const angle = turn * Math.PI * 2;
      const distance = radius * (1 + layer.drift * Math.pow(random(), layer.crowding));
      const px = Math.cos(angle) * distance;
      const py = Math.sin(angle) * distance;
      const direction = angle + Math.PI / 2 + swirl + between(-0.3, 0.3);
      const dx = Math.cos(direction);
      const dy = Math.sin(direction);
      const flick = random() < layer.flicks ? between(1.4, 1.9) : 1;
      const back = radius * between(layer.reach[0], layer.reach[1]) * between(layer.tail[0], layer.tail[1]);
      const forward = radius * between(layer.reach[0], layer.reach[1]) * flick;
      const bend = radius * between(-0.1, 0.1) * (forward / radius);
      return {
        x1: px - dx * back,
        y1: py - dy * back,
        cx: px + dx * (forward - back) * 0.25 + Math.cos(angle) * bend,
        cy: py + dy * (forward - back) * 0.25 + Math.sin(angle) * bend,
        x2: px + dx * forward,
        y2: py + dy * forward,
        width: between(layer.width[0], layer.width[1]),
        turn,
      };
    }),
  );

  return strokes.sort((a, b) => a.turn - b.turn);
};

/** The burst as drawn on the paper: a packed ring plus a fan of longer strokes. */
export const sketchBurst = (radius: number, seed = 1101) =>
  makeBurst({
    radius,
    seed,
    swirl: -0.1,
    layers: [
      { count: 300, drift: 0.75, crowding: 2.2, reach: [0.25, 0.95], width: [1.6, 3.2], flicks: 0, tail: [0.3, 0.9] },
      { count: 95, drift: 0.9, crowding: 1.4, reach: [0.9, 2.4], width: [1.2, 2.2], flicks: 0.2, tail: [0.55, 1.05] },
    ],
  });

/** A lighter version for small sizes such as the lens rim. */
export const rimBurst = (radius: number, seed = 1101) =>
  makeBurst({
    radius,
    seed,
    swirl: -0.1,
    layers: [
      { count: 150, drift: 0.32, crowding: 2.2, reach: [0.12, 0.42], width: [1, 2], flicks: 0, tail: [0.3, 0.9] },
      { count: 36, drift: 0.4, crowding: 1.4, reach: [0.3, 0.75], width: [0.8, 1.4], flicks: 0.25, tail: [0.55, 1.05] },
    ],
  });

export const strokePath = (stroke: BurstStroke, ox = 0, oy = 0) =>
  `M${(stroke.x1 + ox).toFixed(1)} ${(stroke.y1 + oy).toFixed(1)} Q${(stroke.cx + ox).toFixed(1)} ${(stroke.cy + oy).toFixed(1)} ${(stroke.x2 + ox).toFixed(1)} ${(stroke.y2 + oy).toFixed(1)}`;
