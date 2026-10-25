import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { currentSettings, useSettings } from '../../store/settingsStore';
import { toast } from '../../store/toastStore';
import { parseSettingsJson, settingsToJson } from '../../logic/importExport';
import { CopyFallback, SectionTitle, TextSourceInput, dateStamp, exportFile, plural, useCopy } from './shared';

export function BackupTab() {
  const replaceAll = useSettings((s) => s.replaceAll);
  const { fallback, copy, clear } = useCopy();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseSettingsJson(text) : null), [text]);
  const incoming = parsed?.settings ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div className="panel flex flex-col gap-3 px-5 py-4">
        <SectionTitle>Export all settings</SectionTitle>
        <p className="text-lg text-ink-soft">
          One file with your players, questions, board and rules. Keep it as a backup, or load it on another computer.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() =>
              exportFile(
                `bible-snakes-ladders-settings-${dateStamp()}.json`,
                settingsToJson(currentSettings()),
                'application/json',
                'all settings',
              )
            }
          >
            Save backup file
          </Button>
          <Button onClick={() => copy(settingsToJson(currentSettings()), 'All settings as JSON', 'all settings')}>
            Copy backup
          </Button>
        </div>
        <CopyFallback state={fallback} onClose={clear} />
      </div>

      <div className="panel flex flex-col gap-4 px-5 py-4">
        <SectionTitle>Import all settings</SectionTitle>
        <p className="text-lg text-ink-soft">
          Loading a backup replaces <strong>everything</strong>: players, questions, board and rules.
        </p>
        <TextSourceInput
          idPrefix="backup"
          accept=".json,application/json"
          text={text}
          fileName={fileName}
          onChange={(t, f) => {
            setText(t);
            setFileName(f);
          }}
          pasteLabel="Or paste the backup JSON here"
        />

        {parsed && (
          <div aria-live="polite" className="rounded-xl border border-walnut/30 bg-white/60 px-4 py-3">
            {incoming ? (
              <p className="text-lg font-semibold text-olive-dark">
                Ready: {plural(incoming.players.length, 'player')}, {plural(incoming.questions.length, 'question')},{' '}
                {incoming.board.size}-square board with {plural(incoming.board.snakes.length, 'snake')} and{' '}
                {plural(incoming.board.ladders.length, 'ladder')}.
              </p>
            ) : (
              <>
                <p className="text-lg font-semibold text-oxblood">
                  This backup cannot be loaded ({plural(parsed.errors.length, 'problem')}):
                </p>
                <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-6 text-base text-oxblood">
                  {parsed.errors.map((e, i) => (
                    <li key={i} className="break-words">
                      {e.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" disabled={!incoming} onClick={() => setConfirmOpen(true)}>
            Replace all settings
          </Button>
          {text && (
            <Button
              variant="ghost"
              onClick={() => {
                setText('');
                setFileName(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <details className="panel px-5 py-4">
        <summary className="label-caps cursor-pointer text-xl">About the backup format</summary>
        <div className="mt-3 flex flex-col gap-2 text-lg text-ink-soft">
          <p>The backup is a JSON object with five keys:</p>
          <ul className="list-disc pl-6">
            <li>
              <code className="rounded bg-walnut/10 px-1">version</code> — always 1.
            </li>
            <li>
              <code className="rounded bg-walnut/10 px-1">players</code> — 2 to 8 items with{' '}
              <code className="rounded bg-walnut/10 px-1">id, name, color, token</code>.
            </li>
            <li>
              <code className="rounded bg-walnut/10 px-1">questions</code> — items with{' '}
              <code className="rounded bg-walnut/10 px-1">diceNumber</code> (1–6),{' '}
              <code className="rounded bg-walnut/10 px-1">question</code>,{' '}
              <code className="rounded bg-walnut/10 px-1">acceptedAnswers</code> (a list), and optional{' '}
              <code className="rounded bg-walnut/10 px-1">reference, difficulty, explanation, hint</code>.
            </li>
            <li>
              <code className="rounded bg-walnut/10 px-1">board</code> —{' '}
              <code className="rounded bg-walnut/10 px-1">size</code> (50, 64 or 100) plus{' '}
              <code className="rounded bg-walnut/10 px-1">snakes</code> and{' '}
              <code className="rounded bg-walnut/10 px-1">ladders</code>, each a list of{' '}
              <code className="rounded bg-walnut/10 px-1">{'{ from, to }'}</code>.
            </li>
            <li>
              <code className="rounded bg-walnut/10 px-1">rules</code> — the switches from the Rules tab; missing ones use
              the defaults.
            </li>
          </ul>
        </div>
      </details>

      <ConfirmDialog
        open={confirmOpen}
        title="Replace all settings?"
        message="Your current players, questions, board and rules will be replaced by the backup. Save a backup of the current settings first if you might want them back."
        confirmLabel="Replace everything"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          if (!incoming) return;
          replaceAll(incoming);
          setText('');
          setFileName(null);
          toast({
            tone: 'success',
            title: 'Settings loaded',
            body: `${plural(incoming.players.length, 'player')} and ${plural(incoming.questions.length, 'question')}.`,
          });
        }}
      />
    </div>
  );
}
