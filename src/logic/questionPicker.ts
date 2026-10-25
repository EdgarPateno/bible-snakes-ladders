import type { DiceNumber, Question } from '../types';
import { DICE_NUMBERS } from '../types';
import type { Rand } from '../lib/random';

export interface PickResult {
  question: Question | null;
  /** Ids asked so far this game, including this one. */
  asked: string[];
  /** True when the question came from another dice number (its same-difficulty partner, or a nearer band when the
   *  rolled band has nothing left that is unasked this game). */
  borrowed: boolean;
}

/** The rolled number first, then the other number of the same difficulty (1-2, 3-4, 5-6), then the nearest numbers. */
export function borrowOrder(dice: DiceNumber): DiceNumber[] {
  const partner = (dice % 2 === 1 ? dice + 1 : dice - 1) as DiceNumber;
  const rest = DICE_NUMBERS.filter((n) => n !== dice && n !== partner).sort((a, b) => Math.abs(a - dice) - Math.abs(b - dice) || a - b);
  return [dice, partner, ...rest];
}

/**
 * Pick a question for the rolled number that has not been asked this game, keeping its difficulty band
 * (1-2 easy, 3-4 medium, 5-6 hard): a question never asked on this device (`history`, oldest first) from the
 * rolled number, then from its partner, else the band's question asked longest ago. Only when the band has
 * nothing left this game does it borrow from the nearest other number. After every question has been asked
 * in this game, the game's list starts over, never with the question just asked.
 */
export function pickQuestion(
  dice: DiceNumber,
  questions: Question[],
  asked: string[],
  history: readonly string[] = [],
  rand: Rand = Math.random,
): PickResult {
  if (questions.length === 0) return { question: null, asked, borrowed: false };
  const used = new Set(asked);
  let fresh = questions.filter((q) => !used.has(q.id));
  let gameAsked = asked;
  if (fresh.length === 0) {
    const last = asked[asked.length - 1];
    fresh = questions.length > 1 ? questions.filter((q) => q.id !== last) : questions;
    gameAsked = [];
  }
  const seenAt = new Map(history.map((id, i) => [id, i]));
  // Same difficulty first: the rolled number and its partner (1-2, 3-4, 5-6), then the nearest other numbers.
  // Within a group: a question never asked on this device, else the one asked longest ago.
  const [own, partner, ...rest] = borrowOrder(dice);
  for (const group of [[own, partner], ...rest.map((n) => [n])]) {
    for (const n of group) {
      const unseen = fresh.filter((q) => q.diceNumber === n && !seenAt.has(q.id));
      if (unseen.length) {
        const question = unseen[Math.min(unseen.length - 1, Math.floor(rand() * unseen.length))];
        return { question, asked: [...gameAsked, question.id], borrowed: n !== dice };
      }
    }
    const seen = fresh.filter((q) => group.includes(q.diceNumber));
    if (seen.length) {
      const question = seen.reduce((oldest, q) => ((seenAt.get(q.id) ?? 0) < (seenAt.get(oldest.id) ?? 0) ? q : oldest));
      return { question, asked: [...gameAsked, question.id], borrowed: question.diceNumber !== dice };
    }
  }
  return { question: null, asked, borrowed: false };
}

/** Add an asked question to the device history (oldest first, each id once, newest last). */
export function recordAsked(history: readonly string[], id: string, cap = 5000): string[] {
  const next = history.filter((h) => h !== id);
  next.push(id);
  return next.length > cap ? next.slice(next.length - cap) : next;
}

/** Games saved before 2026-10-25 kept per-number bags of the ids still to ask; rebuild the asked list from them. */
export function askedFromBags(
  bags: Partial<Record<DiceNumber, string[]>> | undefined,
  lastAsked: Partial<Record<DiceNumber, string>> | undefined,
  questions: Question[],
): string[] {
  const asked = new Set(Object.values(lastAsked ?? {}).filter((id): id is string => typeof id === 'string'));
  for (const n of DICE_NUMBERS) {
    const left = bags?.[n];
    if (!Array.isArray(left) || left.length === 0) continue;
    for (const q of questions) if (q.diceNumber === n && !left.includes(q.id)) asked.add(q.id);
  }
  return [...asked];
}
