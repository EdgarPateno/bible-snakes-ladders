import { useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '../ui/Button';
import { useGame } from '../../store/gameStore';
import { PlayersTab } from './PlayersTab';
import { QuestionsTab } from './QuestionsTab';
import { BoardTab } from './BoardTab';
import { RulesTab } from './RulesTab';
import { BackupTab } from './BackupTab';

type TabKey = 'players' | 'questions' | 'board' | 'rules' | 'backup';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'players', label: 'Players' },
  { key: 'questions', label: 'Questions' },
  { key: 'board', label: 'Board' },
  { key: 'rules', label: 'Rules' },
  { key: 'backup', label: 'Backup' },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<TabKey>('players');
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    players: null,
    questions: null,
    board: null,
    rules: null,
    backup: null,
  });
  const gameInProgress = useGame((s) => s.game !== null && s.game.phase !== 'finished');

  const select = (key: TabKey) => {
    setActive(key);
    tabRefs.current[key]?.focus();
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(TABS[next].key);
  };

  return (
    <div className="min-h-full w-full overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h1 className="label-caps text-4xl text-oxblood sm:text-5xl">Settings</h1>
            <p className="mt-1 text-lg text-ink-soft">Everything saves automatically.</p>
          </div>
          <Button variant="primary" size="lg" onClick={onClose}>
            Done
          </Button>
          {gameInProgress && (
            <p
              role="status"
              className="w-full rounded-lg border border-gilt/60 bg-gilt/10 px-4 py-2 text-lg text-ink"
            >
              A game is in progress. Changes to players and the board apply to the <strong>next</strong> game.
            </p>
          )}
        </header>

        <div
          role="tablist"
          aria-label="Settings sections"
          className="flex flex-wrap gap-2 border-b-2 border-walnut/30 pb-2"
        >
          {TABS.map((t, i) => {
            const selected = t.key === active;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[t.key] = el;
                }}
                id={`settings-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${t.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.key)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className={`label-caps rounded-xl border px-4 py-2 text-xl transition-colors sm:px-5 sm:text-2xl ${
                  selected
                    ? 'border-gilt bg-oxblood text-parchment-50 shadow-[0_2px_0_#3d1010]'
                    : 'border-walnut/30 bg-parchment-50/70 text-ink hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {TABS.map((t) => (
          <section
            key={t.key}
            id={`settings-panel-${t.key}`}
            role="tabpanel"
            aria-labelledby={`settings-tab-${t.key}`}
            hidden={t.key !== active}
            tabIndex={0}
            className="min-w-0 rounded-[14px]"
          >
            {t.key === active && <TabContent tab={t.key} />}
          </section>
        ))}
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: TabKey }) {
  switch (tab) {
    case 'players':
      return <PlayersTab />;
    case 'questions':
      return <QuestionsTab />;
    case 'board':
      return <BoardTab />;
    case 'rules':
      return <RulesTab />;
    case 'backup':
      return <BackupTab />;
  }
}
