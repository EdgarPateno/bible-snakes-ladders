import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { BoardConfig, MoveStep, PendingMove, Player } from '../../types';
import { boardDims, squareCenter } from '../../logic/board';
import { sampleCubic, snakeCurve, type Pt } from '../../logic/geometry';
import { playSound } from '../../lib/sound';

interface TokensLayerProps {
  board: BoardConfig;
  players: Player[];
  positions: Record<string, number>;
  currentId: string | null;
  /** Set while the current player's token is animating. */
  move: PendingMove | null;
  sound: boolean;
  onMoveDone: () => void;
}

/** Offsets (in squares) for k tokens sharing one square. */
function clusterOffsets(k: number): Pt[] {
  if (k <= 1) return [{ x: 0, y: 0 }];
  const s = 0.22;
  if (k === 2) return [{ x: -s, y: 0 }, { x: s, y: 0 }];
  if (k === 3) return [{ x: -s, y: s * 0.8 }, { x: s, y: s * 0.8 }, { x: 0, y: -s * 0.9 }];
  if (k === 4) return [{ x: -s, y: -s }, { x: s, y: -s }, { x: -s, y: s }, { x: s, y: s }];
  const out: Pt[] = [];
  for (let i = 0; i < k; i++) out.push({ x: ((i % 3) - 1) * s * 1.2, y: (Math.floor(i / 3) - 1) * s * 1.2 });
  return out;
}

function pct(p: Pt, cols: number, rows: number) {
  return { left: `${(p.x / cols) * 100}%`, top: `${(p.y / rows) * 100}%` };
}

function Token({ player, scale, active, cols }: { player: Player; scale: number; active: boolean; cols: number }) {
  const d = (100 / cols) * scale;
  return (
    <div
      className="grid place-items-center rounded-full"
      style={{
        width: `${d}cqw`,
        height: `${d}cqw`,
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${player.color} 55%, white), ${player.color} 60%, color-mix(in srgb, ${player.color} 70%, black))`,
        boxShadow: active
          ? `0 0 0 ${d * 0.06}cqw #fff8e1, 0 0 0 ${d * 0.13}cqw #b8862b, 0 ${d * 0.1}cqw ${d * 0.2}cqw rgba(30,15,5,0.55)`
          : `0 0 0 ${d * 0.06}cqw #fff8e1, 0 ${d * 0.08}cqw ${d * 0.16}cqw rgba(30,15,5,0.5)`,
        fontSize: `${d * 0.55}cqw`,
        lineHeight: 1,
      }}
      title={player.name}
    >
      <span aria-hidden="true">{player.token}</span>
    </div>
  );
}

export function TokensLayer({ board, players, positions, currentId, move, sound, onMoveDone }: TokensLayerProps) {
  const { cols, rows } = boardDims(board.size);
  const reduced = useReducedMotion();
  const doneRef = useRef(onMoveDone);
  doneRef.current = onMoveDone;

  // The step counter belongs to one move; a new move starts at step 0.
  const moveKey = move?.id ?? null;
  const [counter, setCounter] = useState<{ key: string | null; idx: number }>({ key: null, idx: 0 });
  const stepIdx = counter.key === moveKey ? counter.idx : 0;
  const advance = () => setCounter({ key: moveKey, idx: stepIdx + 1 });

  const snakeIndex = useMemo(() => new Map(board.snakes.map((s, i) => [s.id, i])), [board.snakes]);
  const step: MoveStep | undefined = move?.steps[stepIdx];

  useEffect(() => {
    if (!step || !sound) return;
    playSound(step.kind === 'walk' ? 'step' : step.kind);
  }, [step, sound]);

  // Group stationary tokens per square so they don't overlap.
  const groups = new Map<number, Player[]>();
  for (const p of players) {
    if (move && p.id === move.playerId) continue;
    const sq = Math.max(1, positions[p.id] ?? 0);
    groups.set(sq, [...(groups.get(sq) ?? []), p]);
  }

  const startOf = (pid: string) => Math.max(1, positions[pid] ?? 0);
  let movingTarget: { left: string | string[]; top: string | string[] } | null = null;
  let duration = 0;
  let ease: 'easeOut' | 'easeInOut' | 'linear' = 'easeOut';
  if (move && step) {
    const slow = reduced ? 0.25 : 1;
    if (step.kind === 'walk') {
      movingTarget = pct(squareCenter(step.square, board.size), cols, rows);
      duration = 0.3 * slow;
    } else if (step.kind === 'ladder') {
      const a = pct(squareCenter(step.from, board.size), cols, rows);
      const b = pct(squareCenter(step.to, board.size), cols, rows);
      movingTarget = { left: [a.left, b.left], top: [a.top, b.top] };
      duration = 1.0 * slow;
      ease = 'easeInOut';
    } else {
      const pts = sampleCubic(snakeCurve(step.from, step.to, board.size, snakeIndex.get(step.jumpId) ?? 0), 24).map((p) =>
        pct(p, cols, rows),
      );
      movingTarget = { left: pts.map((p) => p.left), top: pts.map((p) => p.top) };
      duration = 1.3 * slow;
      ease = 'linear';
    }
  }

  const movingPlayer = move ? players.find((p) => p.id === move.playerId) : undefined;

  return (
    <div className="pointer-events-none absolute inset-0">
      {[...groups.entries()].flatMap(([sq, group]) => {
        const c = squareCenter(sq, board.size);
        const offs = clusterOffsets(group.length);
        const scale = group.length === 1 ? 0.62 : group.length <= 4 ? 0.44 : 0.34;
        return group.map((p, i) => {
          const pos = pct({ x: c.x + offs[i].x, y: c.y + offs[i].y }, cols, rows);
          return (
            <motion.div
              key={p.id}
              className="absolute"
              style={{ translate: '-50% -50%', zIndex: p.id === currentId ? 3 : 2, opacity: (positions[p.id] ?? 0) === 0 ? 0.85 : 1 }}
              initial={false}
              animate={pos}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Token player={p} scale={scale} active={p.id === currentId} cols={cols} />
            </motion.div>
          );
        });
      })}
      {movingPlayer && move && (
        <motion.div
          key={`moving-${movingPlayer.id}`}
          className="absolute"
          style={{ translate: '-50% -50%', zIndex: 5 }}
          initial={pct(squareCenter(startOf(movingPlayer.id), board.size), cols, rows)}
          animate={movingTarget ?? undefined}
          transition={{ duration, ease }}
          onAnimationComplete={() => {
            if (!move) return;
            if (stepIdx + 1 >= move.steps.length) doneRef.current();
            else advance();
          }}
        >
          <motion.div
            key={stepIdx}
            initial={{ scale: 1, y: 0 }}
            animate={step?.kind === 'walk' && !reduced ? { scale: [1, 1.18, 1], y: ['0%', '-28%', '0%'] } : { scale: 1.08 }}
            transition={{ duration }}
          >
            <Token player={movingPlayer} scale={0.68} active cols={cols} />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
