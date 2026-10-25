import { useDeferredValue, useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { inputClass } from '../ui/Field';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/toastStore';
import { DICE_NUMBERS, type DiceNumber, type Difficulty, type Question } from '../../types';
import { QuestionEditor } from './QuestionEditor';
import { QuestionsExportDialog, QuestionsImportDialog } from './ImportExportDialog';
import { DieBadge, SectionTitle, plural } from './shared';

type DiceFilter = 'all' | DiceNumber;
type DifficultyFilter = 'all' | 'none' | Difficulty;

interface EditorState {
  question: Question | null;
  dice: DiceNumber;
}

/** Lower-case and strip accents, so "Jesús" matches "jesus". Works for Cebuano and English alike. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase();
}

function haystack(q: Question): string {
  return fold([q.question, q.acceptedAnswers.join(' '), q.reference ?? '', q.explanation ?? '', q.hint ?? ''].join('\n'));
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'border-olive/50 bg-olive/10 text-olive-dark',
  medium: 'border-gilt/60 bg-gilt/15 text-walnut-dark',
  hard: 'border-oxblood/50 bg-oxblood/10 text-oxblood',
};

export function QuestionsTab() {
  const questions = useSettings((s) => s.questions);
  const duplicateQuestion = useSettings((s) => s.duplicateQuestion);
  const deleteQuestion = useSettings((s) => s.deleteQuestion);
  const resetQuestions = useSettings((s) => s.resetQuestions);

  const [search, setSearch] = useState('');
  const [diceFilter, setDiceFilter] = useState<DiceFilter>('all');
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>('all');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [dialog, setDialog] = useState<'import' | 'export' | null>(null);

  const deferredSearch = useDeferredValue(search);
  const term = fold(deferredSearch.trim());
  const filtering = term !== '' || diceFilter !== 'all' || diffFilter !== 'all';

  const groups = useMemo(() => {
    const totals = new Map<DiceNumber, number>(DICE_NUMBERS.map((n) => [n, 0]));
    const shown = new Map<DiceNumber, Question[]>(DICE_NUMBERS.map((n) => [n, []]));
    for (const q of questions) {
      totals.set(q.diceNumber, (totals.get(q.diceNumber) ?? 0) + 1);
      if (diceFilter !== 'all' && q.diceNumber !== diceFilter) continue;
      if (diffFilter === 'none' && q.difficulty) continue;
      if (diffFilter !== 'all' && diffFilter !== 'none' && q.difficulty !== diffFilter) continue;
      if (term && !haystack(q).includes(term)) continue;
      shown.get(q.diceNumber)?.push(q);
    }
    return DICE_NUMBERS.filter((n) => diceFilter === 'all' || n === diceFilter).map((n) => ({
      n,
      total: totals.get(n) ?? 0,
      items: shown.get(n) ?? [],
    }));
  }, [questions, term, diceFilter, diffFilter]);

  const shownCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const emptyGroups = DICE_NUMBERS.filter((n) => !questions.some((q) => q.diceNumber === n));

  return (
    <div className="flex flex-col gap-5">
      <div className="panel flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionTitle>Questions</SectionTitle>
            <p className="text-lg text-ink-soft">
              {plural(questions.length, 'question')}. When a player rolls a number, they get a question from that
              number’s group.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setEditor({ question: null, dice: diceFilter === 'all' ? 1 : diceFilter })}>
              + Add question
            </Button>
            <Button onClick={() => setDialog('import')}>Import…</Button>
            <Button onClick={() => setDialog('export')}>Export…</Button>
          </div>
        </div>

        {emptyGroups.length > 0 && (
          <p role="status" className="rounded-lg border-2 border-oxblood/50 bg-oxblood/10 px-4 py-2 text-lg font-semibold text-oxblood">
            ⚠ No questions for {emptyGroups.length === 1 ? 'roll' : 'rolls'} {emptyGroups.join(', ')}. Add at least one
            question to each number.
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="q-search" className="text-base font-semibold text-ink-soft">
              Search
            </label>
            <input
              id="q-search"
              type="search"
              value={search}
              autoComplete="off"
              placeholder="Question, answer, reference or explanation"
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="q-filter-dice" className="text-base font-semibold text-ink-soft">
              Dice number
            </label>
            <select
              id="q-filter-dice"
              value={String(diceFilter)}
              onChange={(e) => setDiceFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as DiceNumber))}
              className={inputClass}
            >
              <option value="all">All numbers</option>
              {DICE_NUMBERS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="q-filter-difficulty" className="text-base font-semibold text-ink-soft">
              Difficulty
            </label>
            <select
              id="q-filter-difficulty"
              value={diffFilter}
              onChange={(e) => setDiffFilter(e.target.value as DifficultyFilter)}
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="none">Not set</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        {filtering && (
          <div className="flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-base text-ink-soft">
              Showing {shownCount} of {plural(questions.length, 'question')}.
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('');
                setDiceFilter('all');
                setDiffFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.n} aria-labelledby={`q-group-${g.n}`} className="panel flex flex-col gap-3 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <DieBadge n={g.n} />
            <h3 id={`q-group-${g.n}`} className="label-caps text-2xl">
              Roll {g.n}
            </h3>
            <span
              className={`rounded-full border px-3 py-0.5 text-base font-semibold ${
                g.total === 0 ? 'border-oxblood/60 bg-oxblood/10 text-oxblood' : 'border-walnut/30 bg-white/60 text-ink-soft'
              }`}
            >
              {filtering && g.total > 0 ? `${g.items.length} of ${g.total}` : plural(g.total, 'question')}
            </span>
            <Button size="sm" className="ml-auto" onClick={() => setEditor({ question: null, dice: g.n })}>
              + Add to {g.n}
            </Button>
          </div>

          {g.total === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-oxblood/50 px-4 py-3 text-lg font-semibold text-oxblood">
              ⚠ No questions for a roll of {g.n} yet. Add one so this number has something to ask.
            </p>
          ) : g.items.length === 0 ? (
            <p className="text-lg text-ink-soft">No questions here match the search or filters.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              <li
                aria-hidden="true"
                className="hidden gap-4 border-b border-walnut/30 px-3 pb-1 text-sm font-semibold uppercase tracking-wide text-ink-faint lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7rem_auto]"
              >
                <span>Question</span>
                <span>Accepted answers</span>
                <span>Reference</span>
                <span>Difficulty</span>
                <span className="w-[16.5rem]">Actions</span>
              </li>
              {g.items.map((q) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  onEdit={() => setEditor({ question: q, dice: q.diceNumber })}
                  onDuplicate={() => {
                    duplicateQuestion(q.id);
                    toast({ tone: 'success', title: 'Question duplicated', body: 'The copy is right below the original.' });
                  }}
                  onDelete={() => setDeleting(q)}
                />
              ))}
            </ul>
          )}
        </section>
      ))}

      <div className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="min-w-0 text-lg text-ink-soft">Start over with the questions that came with the game.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          Reset to default questions
        </Button>
      </div>

      {editor && <QuestionEditor initial={editor.question} defaultDice={editor.dice} onClose={() => setEditor(null)} />}
      {dialog === 'import' && <QuestionsImportDialog onClose={() => setDialog(null)} />}
      {dialog === 'export' && <QuestionsExportDialog onClose={() => setDialog(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this question?"
        message={deleting ? `“${truncate(deleting.question, 120)}” will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete question"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteQuestion(deleting.id);
          setDeleting(null);
          toast({ tone: 'info', title: 'Question deleted' });
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset to default questions?"
        message={`This replaces all ${plural(questions.length, 'question')} with the default set. Export first if you want to keep yours.`}
        confirmLabel="Reset questions"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetQuestions();
          setConfirmReset(false);
          toast({ tone: 'success', title: 'Default questions restored' });
        }}
      />
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

interface RowProps {
  q: Question;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function QuestionRow({ q, onEdit, onDuplicate, onDelete }: RowProps) {
  const short = truncate(q.question, 40);
  return (
    <li className="grid gap-2 rounded-xl border border-walnut/25 bg-white/55 px-3 py-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7rem_auto] lg:items-start lg:gap-4">
      <div className="min-w-0">
        <span className="text-sm font-semibold uppercase tracking-wide text-ink-faint lg:sr-only">Question</span>
        <p className="whitespace-pre-line break-words text-xl leading-snug">{q.question}</p>
      </div>
      <div className="min-w-0">
        <span className="text-sm font-semibold uppercase tracking-wide text-ink-faint lg:sr-only">Accepted answers</span>
        <p className="break-words text-lg font-semibold text-olive-dark">{q.acceptedAnswers.join(' / ')}</p>
      </div>
      <div className="min-w-0">
        <span className="text-sm font-semibold uppercase tracking-wide text-ink-faint lg:sr-only">Reference</span>
        <p className="break-words text-lg text-ink-soft">{q.reference || '—'}</p>
      </div>
      <div className="min-w-0">
        <span className="text-sm font-semibold uppercase tracking-wide text-ink-faint lg:sr-only">Difficulty</span>
        <p>
          {q.difficulty ? (
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-base font-semibold ${DIFFICULTY_STYLE[q.difficulty]}`}>
              {DIFFICULTY_LABEL[q.difficulty]}
            </span>
          ) : (
            <span className="text-lg text-ink-faint">—</span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 lg:w-[16.5rem] lg:justify-end">
        <Button size="sm" onClick={onEdit} aria-label={`Edit question: ${short}`}>
          Edit
        </Button>
        <Button size="sm" onClick={onDuplicate} aria-label={`Duplicate question: ${short}`}>
          Duplicate
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} aria-label={`Delete question: ${short}`}>
          Delete
        </Button>
      </div>
    </li>
  );
}
