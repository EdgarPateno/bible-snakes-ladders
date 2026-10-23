import type { BoardSize } from '../types';
import { squareCenter } from './board';

export interface Pt {
  x: number;
  y: number;
}

export interface Cubic {
  p0: Pt;
  p1: Pt;
  p2: Pt;
  p3: Pt;
}

/** The curve a snake is drawn on, head (from) to tail (to), in grid units. Shared by the SVG and the slide animation. */
export function snakeCurve(from: number, to: number, size: BoardSize, index: number): Cubic {
  const p0 = squareCenter(from, size);
  const p3 = squareCenter(to, size);
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const amp = Math.min(1.2, len * 0.24) * (index % 2 === 0 ? 1 : -1);
  return {
    p0,
    p1: { x: p0.x + dx * 0.33 + nx * amp, y: p0.y + dy * 0.33 + ny * amp },
    p2: { x: p0.x + dx * 0.66 - nx * amp, y: p0.y + dy * 0.66 - ny * amp },
    p3,
  };
}

export function cubicPoint(c: Cubic, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c.p0.x + b * c.p1.x + d * c.p2.x + e * c.p3.x,
    y: a * c.p0.y + b * c.p1.y + d * c.p2.y + e * c.p3.y,
  };
}

export function sampleCubic(c: Cubic, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => cubicPoint(c, i / n));
}
