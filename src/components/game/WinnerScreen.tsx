import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { GameState } from '../../types';
import { standings } from '../../logic/turns';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { playSound } from '../../lib/sound';

interface WinnerScreenProps {
  game: GameState;
  sound: boolean;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

const PLACE = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

export function WinnerScreen({ game, sound, onPlayAgain, onNewGame }: WinnerScreenProps) {
  const open = game.phase === 'finished' && !!game.winnerId;
  const winner = game.players.find((p) => p.id === game.winnerId);

  useEffect(() => {
    if (!open) return;
    if (sound) playSound('win');
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#b8862b', '#d9ab4a', '#7a1f1f', winner?.color ?? '#1f6fb2', '#fbf6e9'];
    const end = Date.now() + 2200;
    let frame = 0;
    const tick = () => {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, zIndex: 70 });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, zIndex: 70 });
      if (Date.now() < end) frame = requestAnimationFrame(tick);
    };
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.45 }, colors, zIndex: 70 });
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, sound, winner?.color]);

  if (!winner) return null;
  const rows = standings(game.order, game.positions, game.winnerId);
  const turns = game.log.length;

  return (
    <Modal open={open} title={`${winner.name} wins`} width="max-w-xl">
      <div className="p-6 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full text-5xl shadow-lg ring-4 ring-gilt" style={{ background: winner.color }} aria-hidden="true">
          {winner.token}
        </div>
        <p className="label-caps mt-4 text-lg text-gilt">Well done, good and faithful player</p>
        <h2 className="font-display text-5xl text-oxblood">{winner.name} wins!</h2>
        <p className="mt-1 text-lg text-ink-soft">Reached square {game.board.size} after {turns} {turns === 1 ? 'move' : 'moves'}.</p>

        <h3 className="label-caps mt-6 text-left text-xl text-oxblood">Final standings</h3>
        <ol className="mt-2 flex flex-col gap-1.5 text-left">
          {rows.map((r) => {
            const p = game.players.find((x) => x.id === r.playerId)!;
            return (
              <li key={r.playerId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.place === 1 ? 'bg-gilt/15 ring-1 ring-gilt' : 'bg-white/50'}`}>
                <span className="label-caps w-10 text-lg text-ink-soft">{PLACE[r.place - 1]}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full text-lg" style={{ background: p.color }} aria-hidden="true">
                  {p.token}
                </span>
                <span className="flex-1 truncate text-lg font-semibold">{p.name}</span>
                <span className="tabular text-base text-ink-soft">{r.position === 0 ? 'Start' : `Square ${r.position}`}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" onClick={onPlayAgain} data-autofocus>
            Play Again
          </Button>
          <Button size="lg" onClick={onNewGame}>
            New Game
          </Button>
        </div>
      </div>
    </Modal>
  );
}
