import type { GameState, Rules } from '../../types';
import { Button } from '../ui/Button';
import { Dice } from './Dice';
import { describeMove } from './moveText';

interface SidebarProps {
  game: GameState;
  rules: Rules;
  onRoll: () => void;
  onLanded: () => void;
}

export function Sidebar({ game, rules, onRoll, onLanded }: SidebarProps) {
  const currentId = game.order[game.current];
  const current = game.players.find((p) => p.id === currentId)!;
  const ordered = game.order.map((id) => game.players.find((p) => p.id === id)!).filter(Boolean);
  const canRoll = game.phase === 'roll';
  const finished = game.phase === 'finished';

  return (
    <aside className="flex min-w-0 flex-col gap-4" aria-label="Game status">
      <section className="panel relative overflow-hidden p-4" aria-labelledby="turn-heading">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: current.color }} />
        <p className="label-caps text-sm text-ink-faint">Turn {game.turn}</p>
        <h2 id="turn-heading" className="mt-1 flex items-center gap-3 text-3xl font-bold leading-tight">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl shadow-md ring-4 ring-gilt/70"
            style={{ background: current.color }}
            aria-hidden="true"
          >
            {current.token}
          </span>
          <span className="min-w-0 break-words">{finished ? `${current.name} wins!` : `${current.name}’s turn`}</span>
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <Dice value={game.roll} rolling={game.phase === 'rolling'} onLanded={onLanded} size={84} />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Button variant="primary" size="lg" onClick={onRoll} disabled={!canRoll} aria-keyshortcuts="R" className="w-full">
              {game.phase === 'rolling' ? 'Rolling…' : 'Roll Dice'}
            </Button>
            <p className="text-sm text-ink-faint">
              {finished
                ? 'Game over.'
                : canRoll
                  ? 'Press R or click to roll.'
                  : game.phase === 'moving'
                    ? 'Moving…'
                    : game.phase === 'rolling'
                      ? ''
                      : 'Answer the question to move.'}
            </p>
          </div>
        </div>
      </section>

      <section className="panel p-4" aria-labelledby="players-heading">
        <h2 id="players-heading" className="label-caps text-xl text-oxblood">
          Players
        </h2>
        <ol className="mt-2 flex flex-col gap-2">
          {ordered.map((p) => {
            const pos = game.positions[p.id] ?? 0;
            const active = p.id === currentId;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${active ? 'bg-gilt/15 ring-1 ring-gilt' : ''}`}
                aria-current={active ? 'true' : undefined}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg shadow" style={{ background: p.color }} aria-hidden="true">
                  {p.token}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-lg font-semibold">{p.name}</span>
                    <span className="tabular shrink-0 text-base text-ink-soft">{pos === 0 ? 'Start' : `Square ${pos}`}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-walnut/15" aria-hidden="true">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(pos / game.board.size) * 100}%`, background: p.color }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="panel flex min-h-0 flex-1 flex-col p-4" aria-labelledby="log-heading">
        <h2 id="log-heading" className="label-caps text-xl text-oxblood">
          Move log
        </h2>
        {game.log.length === 0 ? (
          <p className="mt-2 text-base text-ink-faint">Moves appear here. {current.name} goes first.</p>
        ) : (
          <ol className="mt-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1 text-base lg:max-h-none" aria-live="polite">
            {game.log.slice(0, 60).map((e) => {
              const p = game.players.find((x) => x.id === e.playerId);
              return (
                <li key={e.id} className="flex gap-2 border-b border-walnut/10 pb-1.5 last:border-0">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p?.color }} aria-hidden="true" />
                  <span className="min-w-0">{describeMove(e, game.players)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {rules.extraTurnOnSix && <p className="px-1 text-sm text-ink-faint">Rolling a 6 and answering correctly earns an extra turn.</p>}
    </aside>
  );
}
