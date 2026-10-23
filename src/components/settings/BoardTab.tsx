import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { inputClass } from '../ui/Field';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/toastStore';
import { boardDims, classicLayout, randomizeJumps, squareToCell, validateBoard } from '../../logic/board';
import { uid } from '../../lib/random';
import { BOARD_SIZES, type BoardConfig, type BoardSize, type Jump } from '../../types';
import { SectionTitle, plural } from './shared';

type Kind = 'snake' | 'ladder';

/** Inputs stay as text so a half-typed number is not lost. */
interface DraftJump {
  id: string;
  from: string;
  to: string;
}
interface Draft {
  size: BoardSize;
  snakes: DraftJump[];
  ladders: DraftJump[];
}

interface Problem {
  jumpId: string | null;
  message: string;
}

function toDraft(b: BoardConfig): Draft {
  const map = (j: Jump): DraftJump => ({ id: j.id, from: String(j.from), to: String(j.to) });
  return { size: b.size, snakes: b.snakes.map(map), ladders: b.ladders.map(map) };
}

function parseSquare(s: string): number | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/** Check the draft: blank or non-numeric fields first, then the game's own board rules. */
function checkDraft(d: Draft): { board: BoardConfig; problems: Problem[] } {
  const problems: Problem[] = [];
  const convert = (list: DraftJump[], label: string): Jump[] => {
    const out: Jump[] = [];
    list.forEach((j, i) => {
      const from = parseSquare(j.from);
      const to = parseSquare(j.to);
      if (from === null || to === null) {
        problems.push({ jumpId: j.id, message: `${label} ${i + 1}: enter both squares as whole numbers.` });
      } else out.push({ id: j.id, from, to });
    });
    return out;
  };
  const board: BoardConfig = { size: d.size, snakes: convert(d.snakes, 'Snake'), ladders: convert(d.ladders, 'Ladder') };
  problems.push(...validateBoard(board));
  return { board, problems };
}

/** A free spot for a new snake or ladder, one row long, so the user has a valid starting point to edit. */
function placeholder(kind: Kind, d: Draft): DraftJump {
  const { cols } = boardDims(d.size);
  const used = new Set<number>();
  for (const j of [...d.snakes, ...d.ladders]) {
    const f = parseSquare(j.from);
    const t = parseSquare(j.to);
    if (f !== null) used.add(f);
    if (t !== null) used.add(t);
  }
  if (kind === 'snake') {
    for (let from = d.size - 1; from > cols + 1; from--) {
      const to = from - cols;
      if (!used.has(from) && !used.has(to)) return { id: uid('snake'), from: String(from), to: String(to) };
    }
  } else {
    for (let from = 2; from + cols < d.size; from++) {
      const to = from + cols;
      if (!used.has(from) && !used.has(to)) return { id: uid('ladder'), from: String(from), to: String(to) };
    }
  }
  return { id: uid(kind), from: '', to: '' };
}

const SIZE_LABEL: Record<BoardSize, string> = { 50: '50 squares (10 × 5)', 64: '64 squares (8 × 8)', 100: '100 squares (10 × 10)' };

export function BoardTab() {
  const board = useSettings((s) => s.board);
  const setBoard = useSettings((s) => s.setBoard);
  const [draft, setDraft] = useState<Draft>(() => toDraft(board));
  const lastSaved = useRef<BoardConfig>(board);
  const [pendingSize, setPendingSize] = useState<BoardSize | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Pick up changes made elsewhere (e.g. a backup import) without clobbering our own saves.
  useEffect(() => {
    if (board !== lastSaved.current) {
      lastSaved.current = board;
      setDraft(toDraft(board));
    }
  }, [board]);

  const { board: checked, problems } = useMemo(() => checkDraft(draft), [draft]);
  const valid = problems.length === 0;

  const commit = (next: Draft) => {
    setDraft(next);
    const result = checkDraft(next);
    if (result.problems.length === 0) {
      lastSaved.current = result.board;
      setBoard(result.board);
    }
  };

  const replaceWith = (b: BoardConfig) => {
    lastSaved.current = b;
    setBoard(b);
    setDraft(toDraft(b));
  };

  const problemsFor = (id: string) => problems.filter((p) => p.jumpId === id).map((p) => p.message);

  const updateJump = (kind: Kind, id: string, field: 'from' | 'to', value: string) => {
    const key = kind === 'snake' ? 'snakes' : 'ladders';
    commit({ ...draft, [key]: draft[key].map((j) => (j.id === id ? { ...j, [field]: value } : j)) });
  };
  const removeJump = (kind: Kind, id: string) => {
    const key = kind === 'snake' ? 'snakes' : 'ladders';
    commit({ ...draft, [key]: draft[key].filter((j) => j.id !== id) });
  };
  const addJump = (kind: Kind) => {
    const key = kind === 'snake' ? 'snakes' : 'ladders';
    const j = placeholder(kind, draft);
    commit({ ...draft, [key]: [...draft[key], j] });
    setTimeout(() => document.getElementById(`jump-${j.id}-from`)?.focus(), 0);
  };

  const chooseSize = (size: BoardSize) => {
    if (size === draft.size) return;
    if (draft.snakes.length + draft.ladders.length > 0) setPendingSize(size);
    else {
      replaceWith(classicLayout(size));
      toast({ tone: 'success', title: `Board set to ${size} squares` });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="panel flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionTitle>Board</SectionTitle>
            <p className="text-lg text-ink-soft">
              Snakes go down from their head; ladders go up from their bottom. Changes save as soon as the board is valid.
            </p>
          </div>
          <p
            role="status"
            className={`rounded-full border px-4 py-1 text-lg font-semibold ${
              valid ? 'border-olive/50 bg-olive/10 text-olive-dark' : 'border-oxblood/60 bg-oxblood/10 text-oxblood'
            }`}
          >
            {valid ? '✓ Saved' : `Not saved: fix ${plural(problems.length, 'problem')}`}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-semibold text-ink-soft">Board size</legend>
          <div className="flex flex-wrap gap-2">
            {BOARD_SIZES.map((size) => (
              <label
                key={size}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-lg font-semibold focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[#1f6fb2] ${
                  draft.size === size ? 'border-gilt bg-oxblood text-parchment-50' : 'border-walnut/40 bg-parchment-50 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="board-size"
                  id={`board-size-${size}`}
                  value={size}
                  checked={draft.size === size}
                  onChange={() => chooseSize(size)}
                  className="sr-only"
                />
                {SIZE_LABEL[size]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const b = randomizeJumps(draft.size);
              replaceWith(b);
              toast({
                tone: 'success',
                title: 'Snakes & ladders randomized',
                body: `${plural(b.snakes.length, 'snake')} and ${plural(b.ladders.length, 'ladder')}.`,
              });
            }}
          >
            🎲 Randomize snakes &amp; ladders
          </Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset to classic layout
          </Button>
        </div>

        {!valid && (
          <div role="alert" className="rounded-lg border-2 border-oxblood/50 bg-oxblood/10 px-4 py-3">
            <p className="text-lg font-semibold text-oxblood">The board was not saved. Fix these first:</p>
            <ul className="mt-1 list-disc pl-6 text-base text-oxblood">
              {problems.map((p, i) => (
                <li key={`${p.jumpId ?? 'board'}-${i}`} className="break-words">
                  {p.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,22rem)]">
        <JumpList
          kind="snake"
          items={draft.snakes}
          size={draft.size}
          problemsFor={problemsFor}
          onChange={updateJump}
          onRemove={removeJump}
          onAdd={() => addJump('snake')}
        />
        <JumpList
          kind="ladder"
          items={draft.ladders}
          size={draft.size}
          problemsFor={problemsFor}
          onChange={updateJump}
          onRemove={removeJump}
          onAdd={() => addJump('ladder')}
        />
        <MiniPreview board={checked} />
      </div>

      <ConfirmDialog
        open={pendingSize !== null}
        title={`Switch to ${pendingSize ?? ''} squares?`}
        message={`Your snakes and ladders will be replaced by the classic ${pendingSize ?? ''}-square layout.`}
        confirmLabel={`Switch to ${pendingSize ?? ''} squares`}
        danger
        onCancel={() => setPendingSize(null)}
        onConfirm={() => {
          if (pendingSize) {
            replaceWith(classicLayout(pendingSize));
            toast({ tone: 'success', title: `Board set to ${pendingSize} squares`, body: 'Classic layout loaded.' });
          }
          setPendingSize(null);
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Reset to the classic layout?"
        message={`Your snakes and ladders will be replaced by the classic ${draft.size}-square layout.`}
        confirmLabel="Reset layout"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          replaceWith(classicLayout(draft.size));
          setConfirmReset(false);
          toast({ tone: 'success', title: 'Classic layout restored' });
        }}
      />
    </div>
  );
}

interface JumpListProps {
  kind: Kind;
  items: DraftJump[];
  size: BoardSize;
  problemsFor: (id: string) => string[];
  onChange: (kind: Kind, id: string, field: 'from' | 'to', value: string) => void;
  onRemove: (kind: Kind, id: string) => void;
  onAdd: () => void;
}

function JumpList({ kind, items, size, problemsFor, onChange, onRemove, onAdd }: JumpListProps) {
  const isSnake = kind === 'snake';
  const title = isSnake ? 'Snakes' : 'Ladders';
  const fromLabel = isSnake ? 'Head' : 'Bottom';
  const toLabel = isSnake ? 'Tail' : 'Top';
  const headingId = `jumps-${kind}-heading`;

  return (
    <section aria-labelledby={headingId} className="panel flex min-w-0 flex-col gap-3 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="label-caps text-2xl">
          <span aria-hidden="true">{isSnake ? '🐍 ' : '🪜 '}</span>
          {title} <span className="tabular text-lg text-ink-soft">({items.length})</span>
        </h3>
        <Button size="sm" onClick={onAdd}>
          + Add {kind}
        </Button>
      </div>
      <p className="text-base text-ink-soft">
        {isSnake ? 'Head (higher square) → tail (lower square).' : 'Bottom (lower square) → top (higher square).'} Squares
        1–{size}.
      </p>
      {items.length === 0 ? (
        <p className="text-lg text-ink-soft">No {title.toLowerCase()} yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((j, i) => {
            const errs = problemsFor(j.id);
            const errId = `jump-${j.id}-errors`;
            const bad = errs.length > 0;
            const name = `${isSnake ? 'Snake' : 'Ladder'} ${i + 1}`;
            return (
              <li
                key={j.id}
                className={`rounded-xl border px-3 py-2 ${bad ? 'border-oxblood/60 bg-oxblood/5' : 'border-walnut/25 bg-white/55'}`}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex w-24 flex-col gap-0.5">
                    <label htmlFor={`jump-${j.id}-from`} className="text-sm font-semibold text-ink-soft">
                      {name} {fromLabel.toLowerCase()}
                    </label>
                    <input
                      id={`jump-${j.id}-from`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={size}
                      step={1}
                      value={j.from}
                      aria-invalid={bad}
                      aria-describedby={bad ? errId : undefined}
                      onChange={(e) => onChange(kind, j.id, 'from', e.target.value)}
                      className={`${inputClass} tabular`}
                    />
                  </div>
                  <span aria-hidden="true" className="pb-2 text-2xl text-ink-soft">
                    →
                  </span>
                  <div className="flex w-24 flex-col gap-0.5">
                    <label htmlFor={`jump-${j.id}-to`} className="text-sm font-semibold text-ink-soft">
                      {toLabel}
                    </label>
                    <input
                      id={`jump-${j.id}-to`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={size}
                      step={1}
                      value={j.to}
                      aria-invalid={bad}
                      aria-describedby={bad ? errId : undefined}
                      onChange={(e) => onChange(kind, j.id, 'to', e.target.value)}
                      className={`${inputClass} tabular`}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    className="mb-1 ml-auto"
                    onClick={() => onRemove(kind, j.id)}
                    aria-label={`Remove ${name.toLowerCase()} (${j.from || '?'} to ${j.to || '?'})`}
                  >
                    Remove
                  </Button>
                </div>
                {bad && (
                  <ul id={errId} className="mt-1 text-sm font-semibold text-oxblood">
                    {errs.map((m, k) => (
                      <li key={k} className="break-words">
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function MiniPreview({ board }: { board: BoardConfig }) {
  const { cols, rows } = boardDims(board.size);
  const heads = new Map<number, number>();
  const bottoms = new Map<number, number>();
  for (const s of board.snakes) if (s.from >= 1 && s.from <= board.size) heads.set(s.from, s.to);
  for (const l of board.ladders) if (l.from >= 1 && l.from <= board.size) bottoms.set(l.from, l.to);
  const squares = Array.from({ length: board.size }, (_, i) => i + 1);

  return (
    <section aria-labelledby="board-preview-heading" className="panel flex min-w-0 flex-col gap-3 px-4 py-4">
      <h3 id="board-preview-heading" className="label-caps text-2xl">
        Preview
      </h3>
      <div
        role="img"
        aria-label={`Board preview: ${board.size} squares, ${plural(board.snakes.length, 'snake')}, ${plural(
          board.ladders.length,
          'ladder',
        )}.`}
        className="grid w-full gap-[2px] rounded-lg border-2 border-walnut bg-walnut p-[2px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, auto)` }}
      >
        {squares.map((n) => {
          const { row, col } = squareToCell(n, board.size);
          const snakeTo = heads.get(n);
          const ladderTo = bottoms.get(n);
          const tone =
            snakeTo !== undefined
              ? 'bg-oxblood-light text-white font-bold'
              : ladderTo !== undefined
                ? 'bg-olive text-white font-bold'
                : (row + col) % 2 === 0
                  ? 'bg-parchment-50 text-ink-soft'
                  : 'bg-parchment-200 text-ink-soft';
          const tip =
            snakeTo !== undefined ? `Snake ${n} → ${snakeTo}` : ladderTo !== undefined ? `Ladder ${n} → ${ladderTo}` : `Square ${n}`;
          return (
            <span
              key={n}
              aria-hidden="true"
              title={tip}
              className={`tabular flex aspect-square items-center justify-center text-[0.7rem] leading-none sm:text-xs ${tone}`}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
            >
              {n}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-base">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-4 w-4 rounded-sm bg-oxblood-light" /> Snake head
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-4 w-4 rounded-sm bg-olive" /> Ladder bottom
        </span>
      </div>
    </section>
  );
}
