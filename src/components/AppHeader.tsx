import { useState } from 'react';
import { useUi } from '../store/uiStore';
import { useGame } from '../store/gameStore';
import { Button } from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

export function AppHeader() {
  const openSettings = useUi((s) => s.openSettings);
  const go = useUi((s) => s.go);
  const endGame = useGame((s) => s.endGame);
  const [confirmEnd, setConfirmEnd] = useState(false);

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 mb-4 border-b border-walnut/30 bg-[rgba(244,234,208,0.92)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 py-2 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))]">
        <button type="button" onClick={() => go('start')} className="mr-auto flex min-w-0 items-baseline gap-2 text-left" aria-label="Back to the start screen">
          <span className="font-display truncate text-2xl text-oxblood sm:text-3xl">Snakes &amp; Ladders</span>
          <span className="label-caps hidden text-base text-gilt sm:inline">Bible Edition</span>
        </button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(true)}>
          End game
        </Button>
        <Button size="sm" onClick={openSettings} aria-label="Settings">
          <span aria-hidden="true">⚙︎</span>
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
      <ConfirmDialog
        open={confirmEnd}
        title="End this game?"
        message="The board and move log will be cleared. Players, questions and rules stay as they are."
        confirmLabel="End game"
        danger
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          endGame();
          go('start');
        }}
      />
    </header>
  );
}
