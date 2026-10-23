import { memo } from 'react';
import type { BoardConfig } from '../../types';
import { squareCenter } from '../../logic/board';
import { sampleCubic, snakeCurve } from '../../logic/geometry';
import { SNAKE_COLORS } from './palette';

const SEGMENTS = 28;

function Ladder({ from, to, size }: { from: number; to: number; size: BoardConfig['size'] }) {
  const a = squareCenter(from, size);
  const b = squareCenter(to, size);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy * 0.2;
  const ny = ux * 0.2;
  // Extend the rails a little past each centre so the feet and top sit inside the squares.
  const ax = a.x - ux * 0.18;
  const ay = a.y - uy * 0.18;
  const bx = b.x + ux * 0.18;
  const by = b.y + uy * 0.18;
  const rungs = Math.max(2, Math.floor((len + 0.36) / 0.34));
  const rungLines = Array.from({ length: rungs }, (_, i) => {
    const t = (i + 0.5) / rungs;
    const cx = ax + (bx - ax) * t;
    const cy = ay + (by - ay) * t;
    return { x1: cx + nx, y1: cy + ny, x2: cx - nx, y2: cy - ny };
  });
  const rails = [
    { x1: ax + nx, y1: ay + ny, x2: bx + nx, y2: by + ny },
    { x1: ax - nx, y1: ay - ny, x2: bx - nx, y2: by - ny },
  ];
  return (
    <g>
      <g transform="translate(0.06 0.08)" stroke="rgba(40,20,5,0.28)" strokeLinecap="round">
        {rails.map((r, i) => (
          <line key={i} {...r} strokeWidth={0.11} />
        ))}
      </g>
      {rungLines.map((r, i) => (
        <line key={i} {...r} stroke="#7a4b22" strokeWidth={0.075} strokeLinecap="round" />
      ))}
      {rails.map((r, i) => (
        <g key={i} strokeLinecap="round">
          <line {...r} stroke="#5b3a1e" strokeWidth={0.12} />
          <line {...r} stroke="#b07a3e" strokeWidth={0.07} />
          <line {...r} stroke="#d9a866" strokeWidth={0.025} transform="translate(-0.015 -0.015)" />
        </g>
      ))}
    </g>
  );
}

function Snake({ from, to, size, index }: { from: number; to: number; size: BoardConfig['size']; index: number }) {
  const colors = SNAKE_COLORS[index % SNAKE_COLORS.length];
  const pts = sampleCubic(snakeCurve(from, to, size, index), SEGMENTS);
  const width = (i: number) => 0.34 - (0.22 * i) / SEGMENTS;
  const head = pts[0];
  const next = pts[2];
  const angle = (Math.atan2(head.y - next.y, head.x - next.x) * 180) / Math.PI;
  const segs = pts.slice(0, -1).map((p, i) => ({ p, q: pts[i + 1], w: width(i) }));
  return (
    <g>
      <g transform="translate(0.06 0.08)">
        {segs.map(({ p, q, w }, i) => (
          <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="rgba(40,20,5,0.25)" strokeWidth={w} strokeLinecap="round" />
        ))}
      </g>
      {segs.map(({ p, q, w }, i) => (
        <line key={`o${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#24170b" strokeWidth={w + 0.05} strokeLinecap="round" />
      ))}
      {segs.map(({ p, q, w }, i) => (
        <line
          key={`b${i}`}
          x1={p.x}
          y1={p.y}
          x2={q.x}
          y2={q.y}
          stroke={i % 3 === 1 ? colors.stripe : colors.body}
          strokeWidth={w}
          strokeLinecap="round"
        />
      ))}
      {segs
        .filter((_, i) => i % 3 === 2)
        .map(({ p, w }, i) => (
          <circle key={`d${i}`} cx={p.x} cy={p.y} r={w * 0.18} fill={colors.belly} opacity={0.8} />
        ))}
      <g transform={`translate(${head.x} ${head.y}) rotate(${angle})`}>
        <path d="M0.24 0 L0.42 0 M0.42 0 L0.5 -0.05 M0.42 0 L0.5 0.05" stroke="#c0392b" strokeWidth={0.035} strokeLinecap="round" fill="none" />
        <ellipse cx={0} cy={0} rx={0.3} ry={0.24} fill={colors.body} stroke="#24170b" strokeWidth={0.04} />
        <ellipse cx={-0.05} cy={0} rx={0.14} ry={0.1} fill={colors.stripe} opacity={0.5} />
        {[-0.1, 0.1].map((y) => (
          <g key={y}>
            <circle cx={0.1} cy={y} r={0.065} fill="#fffdf2" stroke="#24170b" strokeWidth={0.015} />
            <circle cx={0.12} cy={y} r={0.032} fill="#111" />
          </g>
        ))}
      </g>
    </g>
  );
}

/** Snakes and ladders drawn from the board config, in grid units (one square = 1). */
export const JumpsLayer = memo(function JumpsLayer({ board }: { board: BoardConfig }) {
  const cols = board.size === 64 ? 8 : 10;
  const rows = board.size === 64 ? 8 : board.size === 50 ? 5 : 10;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${cols} ${rows}`} aria-hidden="true">
      {board.ladders.map((l) => (
        <Ladder key={l.id} from={l.from} to={l.to} size={board.size} />
      ))}
      {board.snakes.map((s, i) => (
        <Snake key={s.id} from={s.from} to={s.to} size={board.size} index={i} />
      ))}
    </svg>
  );
});
