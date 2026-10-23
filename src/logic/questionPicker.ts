import type { DiceNumber, Question } from '../types';
import { shuffle, type Rand } from '../lib/random';

export type Bags = Record<DiceNumber, string[]>;

export function emptyBags(): Bags {
  return { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

export interface PickResult {
  question: Question | null;
  bags: Bags;
  lastAsked: Partial<Record<DiceNumber, string>>;
  /** True when the rolled number had no questions and one was borrowed from another number. */
  borrowed: boolean;
}

export function pickQuestion(
  dice: DiceNumber,
  questions: Question[],
  bags: Bags,
  lastAsked: Partial<Record<DiceNumber, string>>,
  rand: Rand = Math.random,
): PickResult {
  let pool = questions.filter((q) => q.diceNumber === dice);
  let borrowed = false;
  if (pool.length === 0) {
    pool = questions;
    borrowed = true;
  }
  if (pool.length === 0) return { question: null, bags, lastAsked, borrowed: false };

  const byId = new Map(pool.map((q) => [q.id, q]));
  let bag = (bags[dice] ?? []).filter((id) => byId.has(id));
  if (bag.length === 0) {
    bag = shuffle([...byId.keys()], rand);
    const last = lastAsked[dice];
    if (bag.length > 1 && bag[0] === last) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
  }
  const [id, ...rest] = bag;
  return {
    question: byId.get(id) ?? null,
    bags: { ...bags, [dice]: rest },
    lastAsked: { ...lastAsked, [dice]: id },
    borrowed,
  };
}
