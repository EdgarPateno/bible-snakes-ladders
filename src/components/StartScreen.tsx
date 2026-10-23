import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../store/gameStore';
import { currentSettings, useSettings } from '../store/settingsStore';
import { useUi } from '../store/uiStore';
import { Board } from './game/Board';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { validateBoard } from '../logic/board';

export function StartScreen() {
  const game = useGame((s) => s.game);
  const startGame = useGame((s) => s.startGame);
  const players = useSettings((s) => s.players);
  const board = useSettings((s) => s.board);
  const questionCount = useSettings((s) => s.questions.length);
  const go = useUi((s) => s.go);
  const openSettings = useUi((s) => s.openSettings);
  const [confirmNew, setConfirmNew] = useState(false);

  const canContinue = !!game && game.phase !== 'finished';
  const boardOk = validateBoard(board).length === 0;

  const begin = () => {
    startGame(currentSettings());
    go('game');
  };

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center gap-10 py-10 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))] lg:flex-row lg:gap-16">
      <motion.section
        className="flex w-full max-w-md flex-col gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <header>
          <p className="label-caps text-lg tracking-[0.2em] text-gilt">Bible Edition</p>
          <h1 className="font-display text-[clamp(3rem,8vw,5.5rem)] leading-[0.9] text-oxblood">
            Snakes
            <br />
            &amp; Ladders
          </h1>
          <p className="mt-4 max-w-sm text-xl text-ink-soft">Roll the die, answer the Bible question for that number, and climb toward the crown.</p>
        </header>

        <div className="flex flex-col gap-3">
          {canContinue && (
            <Button variant="primary" size="lg" onClick={() => go('game')} data-autofocus>
              Continue Game
            </Button>
          )}
          <Button
            variant={canContinue ? 'secondary' : 'primary'}
            size="lg"
            onClick={() => (canContinue ? setConfirmNew(true) : begin())}
            disabled={!boardOk}
          >
            New Game
          </Button>
          <Button size="lg" variant="ghost" onClick={openSettings} className="border-walnut/30">
            <span aria-hidden="true">⚙︎</span> Settings
          </Button>
          {!boardOk && <p className="text-base font-semibold text-oxblood">The board has errors. Fix them in Settings → Board.</p>}
        </div>

        <div className="panel p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="label-caps text-lg text-oxblood">Players</h2>
            <button type="button" onClick={openSettings} className="text-base text-ink-soft underline decoration-walnut/40 underline-offset-2 hover:text-oxblood">
              Edit
            </button>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-full bg-white/60 py-1 pl-1 pr-3 text-lg shadow-sm ring-1 ring-walnut/15">
                <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: p.color }} aria-hidden="true">
                  {p.token}
                </span>
                {p.name}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-base text-ink-faint">
            {board.size} squares · {board.ladders.length} ladders · {board.snakes.length} snakes · {questionCount} questions
          </p>
        </div>
      </motion.section>

      <motion.div
        className="w-full max-w-[560px]"
        initial={{ opacity: 0, rotate: -2, scale: 0.96 }}
        animate={{ opacity: 1, rotate: -1.5, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        aria-hidden="true"
      >
        <Board board={board} label="Board preview" />
      </motion.div>

      <ConfirmDialog
        open={confirmNew}
        title="Start a new game?"
        message="The game in progress will be lost."
        confirmLabel="Start new game"
        danger
        onCancel={() => setConfirmNew(false)}
        onConfirm={() => {
          setConfirmNew(false);
          begin();
        }}
      />
    </main>
  );
}
