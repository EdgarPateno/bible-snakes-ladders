import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/toastStore';
import { parseQuestionsCsv, parseQuestionsJson, questionsToCsv, questionsToJson } from '../../logic/importExport';
import { CopyFallback, TextSourceInput, dateStamp, detectFormat, exportFile, plural, useCopy } from './shared';

/** Save or copy the question bank as JSON or CSV. */
export function QuestionsExportDialog({ onClose }: { onClose: () => void }) {
  const questions = useSettings((s) => s.questions);
  const { fallback, copy, clear } = useCopy();
  const what = plural(questions.length, 'question');
  const stamp = dateStamp();

  return (
    <Modal open title="Export questions" onClose={onClose} width="max-w-2xl">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="label-caps text-3xl text-oxblood">Export questions</h2>
        <p className="text-lg text-ink-soft">
          Save all {what} to a file to keep a copy or edit them in a spreadsheet. JSON keeps everything exactly; CSV
          opens in Excel or Google Sheets (answers are separated by “ | ”).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="primary"
            onClick={() => exportFile(`bible-questions-${stamp}.json`, questionsToJson(questions), 'application/json', what)}
          >
            Save JSON file
          </Button>
          <Button
            variant="primary"
            onClick={() => exportFile(`bible-questions-${stamp}.csv`, questionsToCsv(questions), 'text/csv', what)}
          >
            Save CSV file
          </Button>
          <Button onClick={() => copy(questionsToJson(questions), 'Questions as JSON', `${what} as JSON`)}>Copy JSON</Button>
          <Button onClick={() => copy(questionsToCsv(questions), 'Questions as CSV', `${what} as CSV`)}>Copy CSV</Button>
        </div>
        <CopyFallback state={fallback} onClose={clear} />
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

type Mode = 'merge' | 'replace';

/** Load questions from a file or pasted text, preview them, then merge or replace. */
export function QuestionsImportDialog({ onClose }: { onClose: () => void }) {
  const current = useSettings((s) => s.questions.length);
  const importQuestions = useSettings((s) => s.importQuestions);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    const format = detectFormat(text, fileName);
    return { format, ...(format === 'json' ? parseQuestionsJson(text) : parseQuestionsCsv(text)) };
  }, [text, fileName]);

  const ready = result?.questions.length ?? 0;
  const problems = result?.errors.length ?? 0;
  const rowWord = result?.format === 'csv' ? 'Line' : 'Item';

  const doImport = () => {
    if (!result || ready === 0) return;
    importQuestions(result.questions, mode);
    toast({
      tone: 'success',
      title: `Imported ${plural(ready, 'question')}`,
      body: mode === 'replace' ? 'The old questions were replaced.' : 'Merged with your existing questions.',
    });
    onClose();
  };

  return (
    <>
      <Modal open title="Import questions" onClose={onClose} width="max-w-3xl">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <h2 className="label-caps text-3xl text-oxblood">Import questions</h2>
          <p className="text-lg text-ink-soft">
            Use a JSON or CSV file exported from this game, or paste its text. CSV needs the columns{' '}
            <code className="rounded bg-walnut/10 px-1 text-base">diceNumber, question, acceptedAnswers</code> (optional:{' '}
            <code className="rounded bg-walnut/10 px-1 text-base">id, reference, difficulty, explanation, hint</code>). Separate
            several answers with “|”.
          </p>

          <TextSourceInput
            idPrefix="qi"
            accept=".json,.csv,application/json,text/csv"
            text={text}
            fileName={fileName}
            onChange={(t, f) => {
              setText(t);
              setFileName(f);
            }}
            pasteLabel="Or paste JSON or CSV here"
          />

          {result && (
            <div aria-live="polite" className="rounded-xl border border-walnut/30 bg-white/60 px-4 py-3">
              <p className="text-lg font-semibold">
                <span className={ready ? 'text-olive-dark' : 'text-oxblood'}>{plural(ready, 'question')} ready</span>
                {', '}
                <span className={problems ? 'text-oxblood' : 'text-ink-soft'}>
                  {plural(problems, 'row')} with problems
                </span>
                <span className="font-normal text-ink-soft"> (read as {result.format.toUpperCase()})</span>
              </p>
              {problems > 0 && (
                <ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-6 text-base text-oxblood">
                  {result.errors.map((e, i) => (
                    <li key={`${e.row}-${i}`} className="break-words">
                      {e.row > 0 ? `${rowWord} ${e.row}: ` : ''}
                      {e.message}
                    </li>
                  ))}
                </ul>
              )}
              {problems > 0 && ready > 0 && (
                <p className="mt-2 text-base text-ink-soft">Rows with problems are skipped.</p>
              )}
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-base font-semibold text-ink-soft">How to import</legend>
            <label className="flex cursor-pointer items-start gap-3 text-lg">
              <input
                type="radio"
                id="qi-mode-merge"
                name="qi-mode"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
                className="mt-1.5 h-5 w-5 accent-oxblood"
              />
              <span>
                <strong>Merge</strong> — keep your {plural(current, 'question')}; add the new ones and update any with the
                same id.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-lg">
              <input
                type="radio"
                id="qi-mode-replace"
                name="qi-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="mt-1.5 h-5 w-5 accent-oxblood"
              />
              <span>
                <strong>Replace</strong> — delete all {plural(current, 'current question')} and use only the imported ones.
              </span>
            </label>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={ready === 0}
              onClick={() => (mode === 'replace' ? setConfirmReplace(true) : doImport())}
            >
              {ready > 0 ? `Import ${plural(ready, 'question')}` : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmReplace}
        title="Replace all questions?"
        message={`This deletes all ${plural(current, 'current question')} and keeps only the ${plural(ready, 'imported question')}.`}
        confirmLabel={`Replace with ${plural(ready, 'question')}`}
        danger
        onCancel={() => setConfirmReplace(false)}
        onConfirm={() => {
          setConfirmReplace(false);
          doImport();
        }}
      />
    </>
  );
}
