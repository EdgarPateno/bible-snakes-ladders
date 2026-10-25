import type { BoardConfig, Question } from '../types';
import { classicLayout } from '../logic/board';
import { DEFAULT_QUESTIONS } from './defaultQuestions';

/**
 * Earlier built-in versions, so saved settings that still hold an untouched old default get the new one.
 * Anything a host edited no longer matches these exactly and is left alone.
 */
const OLD_CLASSIC_100_SNAKES = [[16, 6], [47, 26], [49, 11], [62, 19], [87, 24], [93, 73], [95, 75], [98, 78]];

/** Answer lists as earlier published versions shipped them, per question id. */
const OLD_ANSWERS: Record<string, string[][]> = {
  'ceb-6-01': [['Beltesazar', 'Beltsasar', 'Belteshazzar']],
  'ceb-1-06': [['langob sa mga leyon', 'langob sa leyon', 'langob sa gutom nga mga leyon', 'lungib sa mga leyon', 'langob', 'leyon', 'mga leyon']],
  'ceb-2-04': [['tanom', 'tanom nga nagkalayo', 'kahoykahoy', 'sapinit']],
  'ceb-2-07': [['Juan', 'Juan nga Tigbawtismo', 'Juan Bautista', 'Juan Bawtista', 'John']],
  'ceb-6-07': [['Sheba', 'Seba', 'rayna sa Sheba', 'reyna sa Sheba']],
};

const pairs = (jumps: { from: number; to: number }[]) => jumps.map((j) => `${j.from}>${j.to}`).sort().join(',');

export function upgradeBoard(board: BoardConfig): BoardConfig {
  const current = classicLayout(100);
  const oldSnakes = OLD_CLASSIC_100_SNAKES.map(([from, to]) => ({ from, to }));
  const untouchedOldClassic =
    board.size === 100 && pairs(board.snakes) === pairs(oldSnakes) && pairs(board.ladders) === pairs(current.ladders);
  return untouchedOldClassic ? current : board;
}

export function upgradeQuestions(questions: Question[]): Question[] {
  const defaults = new Map(DEFAULT_QUESTIONS.map((q) => [q.id, q]));
  return questions.map((q) => {
    const fresh = defaults.get(q.id);
    const saved = JSON.stringify(q.acceptedAnswers);
    const untouched = !!fresh && q.question === fresh.question && (OLD_ANSWERS[q.id] ?? []).some((old) => JSON.stringify(old) === saved);
    return untouched ? fresh : q;
  });
}

const builtInIds = (from: number, to: number) =>
  new Set([1, 2, 3, 4, 5, 6].flatMap((dice) => Array.from({ length: to - from + 1 }, (_, i) => `ceb-${dice}-${String(from + i).padStart(2, '0')}`)));

/** Built-in questions added on 2026-10-25 (ceb-1-09 … ceb-6-16), together with a lesson hint on every built-in question. */
const ADDED_2026_10_25 = builtInIds(9, 16);
/** Highest question number per dice in the second 2026-10-25 batch. */
const LAST_IN_BATCH_B: Record<number, number> = { 1: 68, 2: 68, 3: 74, 4: 73, 5: 65, 6: 65 };
/** Second batch, 2026-10-25: about 4 questions per lesson (ceb-<dice>-17 and up, see LAST_IN_BATCH_B). */
const ADDED_2026_10_25_B = new Set(DEFAULT_QUESTIONS.filter((q) => {
  const [, dice, no] = q.id.split('-');
  return Number(no) >= 17 && Number(no) <= (LAST_IN_BATCH_B[Number(dice)] ?? 0);
}).map((q) => q.id));

/**
 * One-time upgrade of saved settings. Only for a list that still holds original built-in questions:
 * a built-in whose text is unchanged gets its lesson hint, and the given new built-in questions are added.
 * A list of the host's own questions is left alone.
 */
function addBuiltIns(questions: unknown, added: Set<string>): unknown {
  if (!Array.isArray(questions)) return questions;
  const defaults = new Map(DEFAULT_QUESTIONS.map((q) => [q.id, q]));
  const ids = new Set(questions.map((q) => (q && typeof q === 'object' ? (q as { id?: unknown }).id : undefined)));
  const original = builtInIds(1, 8);
  if (![...ids].some((id) => typeof id === 'string' && original.has(id))) return questions;
  const withHints = questions.map((q) => {
    const fresh = q && typeof q === 'object' ? defaults.get((q as Question).id) : undefined;
    return fresh && (q as Question).question === fresh.question && (q as Question).hint === undefined ? { ...(q as Question), hint: fresh.hint } : q;
  });
  return [...withHints, ...DEFAULT_QUESTIONS.filter((q) => added.has(q.id) && !ids.has(q.id))];
}

/** Settings saved before the first 2026-10-25 release: add ceb-<dice>-09 … 16 and hints. */
export const addQuestionsOf20261025 = (questions: unknown) => addBuiltIns(questions, ADDED_2026_10_25);
/** Settings saved before the second 2026-10-25 release: add the per-lesson batch. */
export const addQuestionsOf20261025b = (questions: unknown) => addBuiltIns(questions, ADDED_2026_10_25_B);
