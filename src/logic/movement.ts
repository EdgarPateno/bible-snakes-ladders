import type { BoardConfig, MoveStep } from '../types';

export interface MoveResult {
  path: number[];
  landing: number;
  bounced: boolean;
}

/** Walk `roll` squares from `pos` (0 = off the board). */
export function computeMove(pos: number, roll: number, size: number, exactFinish: boolean): MoveResult {
  const path: number[] = [];
  let cur = pos;
  let dir = 1;
  let bounced = false;
  for (let i = 0; i < roll; i++) {
    if (cur === size) {
      if (!exactFinish) break;
      dir = -1;
      bounced = true;
    }
    cur += dir;
    path.push(cur);
  }
  return { path, landing: cur, bounced };
}

export interface JumpHit {
  kind: 'snake' | 'ladder';
  id: string;
  from: number;
  to: number;
}

export function resolveJump(square: number, board: BoardConfig): { final: number; jump: JumpHit | null } {
  const ladder = board.ladders.find((l) => l.from === square);
  if (ladder) return { final: ladder.to, jump: { kind: 'ladder', id: ladder.id, from: ladder.from, to: ladder.to } };
  const snake = board.snakes.find((s) => s.from === square);
  if (snake) return { final: snake.to, jump: { kind: 'snake', id: snake.id, from: snake.from, to: snake.to } };
  return { final: square, jump: null };
}

export function buildMoveSteps(pos: number, roll: number, board: BoardConfig, exactFinish: boolean) {
  const move = computeMove(pos, roll, board.size, exactFinish);
  const steps: MoveStep[] = move.path.map((square) => ({ kind: 'walk', square }));
  const { final, jump } = resolveJump(move.landing, board);
  if (jump) steps.push({ kind: jump.kind, jumpId: jump.id, from: jump.from, to: jump.to });
  return { steps, final, landing: move.landing, bounced: move.bounced, jump };
}
