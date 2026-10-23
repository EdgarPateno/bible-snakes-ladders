import type { BoardConfig, BoardSize, Jump } from '../types';
import { randInt, uid, type Rand } from '../lib/random';

export function boardDims(size: BoardSize): { cols: number; rows: number } {
  if (size === 64) return { cols: 8, rows: 8 };
  if (size === 50) return { cols: 10, rows: 5 };
  return { cols: 10, rows: 10 };
}

/** Serpentine layout: square 1 is bottom-left, rows alternate direction. Row 0 is the top row. */
export function squareToCell(n: number, size: BoardSize): { row: number; col: number } {
  const { cols, rows } = boardDims(size);
  const idx = n - 1;
  const fromBottom = Math.floor(idx / cols);
  const inRow = idx % cols;
  const col = fromBottom % 2 === 0 ? inRow : cols - 1 - inRow;
  return { row: rows - 1 - fromBottom, col };
}

export function cellToSquare(row: number, col: number, size: BoardSize): number {
  const { cols, rows } = boardDims(size);
  const fromBottom = rows - 1 - row;
  const inRow = fromBottom % 2 === 0 ? col : cols - 1 - col;
  return fromBottom * cols + inRow + 1;
}

/** Centre of a square in grid units (one square = 1×1), for the SVG overlay. */
export function squareCenter(n: number, size: BoardSize): { x: number; y: number } {
  const { row, col } = squareToCell(n, size);
  return { x: col + 0.5, y: row + 0.5 };
}

export interface BoardError {
  jumpId: string | null;
  message: string;
}

export function validateBoard(board: BoardConfig): BoardError[] {
  const errors: BoardError[] = [];
  const last = board.size;
  const all: { jump: Jump; kind: 'Snake' | 'Ladder' }[] = [
    ...board.snakes.map((jump) => ({ jump, kind: 'Snake' as const })),
    ...board.ladders.map((jump) => ({ jump, kind: 'Ladder' as const })),
  ];
  const starts = new Map<number, string>();

  for (const { jump, kind } of all) {
    const { id, from, to } = jump;
    const label = `${kind} ${from}→${to}`;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1 || from > last || to > last) {
      errors.push({ jumpId: id, message: `${label}: squares must be whole numbers from 1 to ${last}.` });
      continue;
    }
    if (kind === 'Snake' && from <= to) errors.push({ jumpId: id, message: `${label}: a snake must go down.` });
    if (kind === 'Ladder' && from >= to) errors.push({ jumpId: id, message: `${label}: a ladder must go up.` });
    if (from === 1 || from === last) {
      errors.push({ jumpId: id, message: `${label}: nothing can start on square 1 or square ${last}.` });
    }
    const other = starts.get(from);
    if (other) errors.push({ jumpId: id, message: `${label}: square ${from} already starts ${other}.` });
    else starts.set(from, label);
  }

  for (const { jump, kind } of all) {
    const target = starts.get(jump.to);
    if (target && jump.from !== jump.to) {
      errors.push({
        jumpId: jump.id,
        message: `${kind} ${jump.from}→${jump.to}: it ends where ${target} starts. Move one of them.`,
      });
    }
  }
  return errors;
}

const CLASSIC: Record<BoardSize, { snakes: [number, number][]; ladders: [number, number][] }> = {
  100: {
    ladders: [[2, 38], [4, 14], [9, 31], [21, 42], [28, 84], [51, 67], [71, 91], [80, 100]],
    // 70→8 was added for a harder game; its list position sets its curve (bending away from the 49 head) and colour.
    snakes: [[16, 6], [47, 26], [49, 11], [62, 19], [87, 24], [93, 73], [95, 64], [70, 8], [98, 78]],
  },
  64: {
    ladders: [[3, 22], [11, 26], [20, 39], [27, 46], [43, 58]],
    snakes: [[17, 4], [31, 14], [37, 23], [52, 33], [61, 40], [63, 45]],
  },
  50: {
    ladders: [[4, 14], [9, 27], [20, 38], [31, 46]],
    snakes: [[17, 7], [26, 12], [35, 22], [44, 29], [49, 34]],
  },
};

export function classicLayout(size: BoardSize): BoardConfig {
  const c = CLASSIC[size];
  return {
    size,
    snakes: c.snakes.map(([from, to], i) => ({ id: `snake-${size}-${i}`, from, to })),
    ladders: c.ladders.map(([from, to], i) => ({ id: `ladder-${size}-${i}`, from, to })),
  };
}

export function randomizeJumps(size: BoardSize, rand: Rand = Math.random): BoardConfig {
  const { cols } = boardDims(size);
  // Same number of snakes and ladders as the classic layout for this size.
  const ladderCount = CLASSIC[size].ladders.length;
  const snakeCount = CLASSIC[size].snakes.length;
  const starts = new Set<number>();
  const ends = new Set<number>();
  const snakes: Jump[] = [];
  const ladders: Jump[] = [];

  const place = (kind: 'snake' | 'ladder'): Jump | null => {
    for (let attempt = 0; attempt < 500; attempt++) {
      let from: number;
      let to: number;
      if (kind === 'ladder') {
        from = randInt(2, size - cols - 1, rand);
        to = randInt(from + cols - 2, Math.min(size, from + Math.floor(size / 2)), rand);
      } else {
        from = randInt(cols + 2, size - 1, rand);
        to = randInt(Math.max(1, from - Math.floor(size / 2)), from - cols + 2, rand);
      }
      if (to - from === 0 || Math.abs(to - from) < cols - 2) continue;
      if (starts.has(from) || ends.has(from) || starts.has(to)) continue;
      starts.add(from);
      ends.add(to);
      return { id: uid(kind), from, to };
    }
    return null;
  };

  for (let i = 0; i < Math.max(ladderCount, snakeCount); i++) {
    if (i < ladderCount) {
      const l = place('ladder');
      if (l) ladders.push(l);
    }
    if (i < snakeCount) {
      const s = place('snake');
      if (s) snakes.push(s);
    }
  }
  return { size, snakes, ladders };
}
