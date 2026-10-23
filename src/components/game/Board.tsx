import { memo, type ReactNode } from 'react';
import type { BoardConfig } from '../../types';
import { boardDims, cellToSquare } from '../../logic/board';
import { JumpsLayer } from './JumpsLayer';
import { SQUARE_LIGHT, SQUARE_WARM } from './palette';

interface BoardProps {
  board: BoardConfig;
  /** Tokens and other overlays, positioned in % of the grid. */
  children?: ReactNode;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}

/** `layer="tiles"` draws the coloured squares; `layer="numbers"` draws the numbers above the snakes and ladders. */
const Squares = memo(function Squares({ board, layer }: { board: BoardConfig; layer: 'tiles' | 'numbers' }) {
  const { cols, rows } = boardDims(board.size);
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const n = cellToSquare(row, col, board.size);
      const light = (row + col) % 2 === 0;
      const bg = light ? SQUARE_LIGHT : SQUARE_WARM[(row + Math.floor(col / 2)) % SQUARE_WARM.length];
      const isLast = n === board.size;
      if (layer === 'numbers') {
        cells.push(
          <div key={n} className="relative">
            <span
              className="absolute left-[7%] top-[4%] font-board font-semibold leading-none text-[#4a2e16]"
              style={{
                fontSize: `${(100 / cols) * 0.27}cqw`,
                textShadow: '0 0 2px #fff6dc, 0 0 3px #fff6dc, 0 0 5px rgba(255,246,220,0.9)',
              }}
            >
              {n}
            </span>
          </div>,
        );
        continue;
      }
      cells.push(
        <div
          key={n}
          className="relative overflow-hidden"
          style={{
            background: bg,
            boxShadow: 'inset 0 0 0 0.5px rgba(91,58,30,0.35), inset 0 -0.25cqw 0 rgba(0,0,0,0.06)',
          }}
        >
          {isLast && (
            <span className="absolute inset-0 grid place-items-center opacity-80" style={{ fontSize: `${(100 / cols) * 0.5}cqw` }}>
              👑
            </span>
          )}
          {n === 1 && (
            <span
              className="label-caps absolute bottom-[6%] left-0 right-0 text-center text-[#4a2e16]"
              style={{ fontSize: `${(100 / cols) * 0.17}cqw` }}
            >
              Start
            </span>
          )}
        </div>,
      );
    }
  }
  return (
    <div className={`absolute inset-0 grid ${layer === 'numbers' ? 'pointer-events-none' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {cells}
    </div>
  );
});

export function Board({ board, children, label, className = '', style }: BoardProps) {
  const { cols, rows } = boardDims(board.size);
  return (
    <div className={`board-frame rounded-[1.4%] p-[1.6%] ${className}`} style={style}>
      <div role="img" aria-label={label} className="board-grid relative w-full overflow-hidden rounded-[0.6%]" style={{ aspectRatio: `${cols} / ${rows}` }}>
        <Squares board={board} layer="tiles" />
        <JumpsLayer board={board} />
        <Squares board={board} layer="numbers" />
        {children}
      </div>
    </div>
  );
}
