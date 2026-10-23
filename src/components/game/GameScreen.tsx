import { useEffect, useMemo } from 'react';
import { useGame } from '../../store/gameStore';
import { currentSettings, useSettings } from '../../store/settingsStore';
import { useUi } from '../../store/uiStore';
import { boardDims } from '../../logic/board';
import { playSound } from '../../lib/sound';
import { Board } from './Board';
import { TokensLayer } from './TokensLayer';
import { Sidebar } from './Sidebar';
import { QuestionModal } from './QuestionModal';
import { WinnerScreen } from './WinnerScreen';
import { AppHeader } from '../AppHeader';

export function GameScreen() {
  const game = useGame((s) => s.game);
  const beginRoll = useGame((s) => s.beginRoll);
  const rollLanded = useGame((s) => s.rollLanded);
  const finishMove = useGame((s) => s.finishMove);
  const startGame = useGame((s) => s.startGame);
  const endGame = useGame((s) => s.endGame);
  const rules = useSettings((s) => s.rules);
  const questions = useSettings((s) => s.questions);
  const go = useUi((s) => s.go);

  const roll = () => {
    if (useGame.getState().game?.phase !== 'roll') return;
    if (rules.sound) playSound('dice');
    beginRoll();
  };

  // R rolls the die when nothing else has focus-worthy work.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'r' && e.key !== 'R') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      roll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const question = useMemo(() => questions.find((q) => q.id === game?.questionId) ?? null, [questions, game?.questionId]);

  // The question being asked was deleted in Settings (e.g. after a refresh): ask another one instead of locking up.
  const replaceMissingQuestion = useGame((s) => s.replaceMissingQuestion);
  const missing = game?.phase === 'question' && !question;
  useEffect(() => {
    if (missing) replaceMissingQuestion(questions, rules.exactRollToFinish);
  }, [missing, questions, replaceMissingQuestion, rules]);

  if (!game) return null;
  const { cols, rows } = boardDims(game.board.size);
  const currentId = game.order[game.current];
  const summary = `Board with ${game.board.size} squares, ${game.board.ladders.length} ladders and ${game.board.snakes.length} snakes. ${game.players
    .map((p) => `${p.name} is ${game.positions[p.id] ? `on square ${game.positions[p.id]}` : 'at the start'}`)
    .join('. ')}.`;

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 px-[max(16px,env(safe-area-inset-left,0px))] pb-6 pr-[max(16px,env(safe-area-inset-right,0px))] lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 justify-center">
          <Board
            board={game.board}
            label={summary}
            className="w-full"
            style={{ maxWidth: `calc((100dvh - 6.5rem) * ${cols / rows})` }}
          >
            <TokensLayer
              board={game.board}
              players={game.players}
              positions={game.positions}
              currentId={currentId}
              move={game.phase === 'moving' ? game.pendingMove : null}
              sound={rules.sound}
              onMoveDone={() => finishMove(rules.extraTurnOnSix)}
            />
          </Board>
        </div>
        <div className="w-full shrink-0 lg:w-[360px] xl:w-[400px]">
          <Sidebar game={game} rules={rules} onRoll={roll} onLanded={() => rollLanded(questions, rules.exactRollToFinish)} />
        </div>
      </main>
      <QuestionModal key={`${game.turn}:${game.questionId}`} game={game} question={question} rules={rules} />
      <WinnerScreen
        game={game}
        sound={rules.sound}
        onPlayAgain={() => startGame(currentSettings())}
        onNewGame={() => {
          endGame();
          go('start');
        }}
      />
    </div>
  );
}
