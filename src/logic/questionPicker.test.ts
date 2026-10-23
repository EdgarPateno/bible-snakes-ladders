import { describe, expect, it } from 'vitest';
import { emptyBags, pickQuestion } from './questionPicker';
import type { DiceNumber, Question } from '../types';

const q = (id: string, diceNumber: DiceNumber): Question => ({ id, diceNumber, question: id, acceptedAnswers: ['x'] });
const questions = [q('a', 1), q('b', 1), q('c', 1), q('d', 2)];
const seq = (vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };

describe('pickQuestion', () => {
  it('does not repeat until the pool is exhausted', () => {
    let bags = emptyBags();
    let last: Partial<Record<DiceNumber, string>> = {};
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = pickQuestion(1, questions, bags, last, Math.random);
      expect(r.question).not.toBeNull();
      seen.push(r.question!.id);
      bags = r.bags;
      last = r.lastAsked;
    }
    expect(seen.sort()).toEqual(['a', 'b', 'c']);
  });
  it('reshuffles after exhaustion without repeating the last question first', () => {
    let bags = emptyBags();
    let last: Partial<Record<DiceNumber, string>> = {};
    for (let round = 0; round < 50; round++) {
      const r = pickQuestion(1, questions, bags, last, Math.random);
      if (last[1]) expect(r.question!.id).not.toBe(last[1]);
      bags = r.bags;
      last = r.lastAsked;
    }
  });
  it('borrows from other pools when a number has no questions', () => {
    const r = pickQuestion(5, questions, emptyBags(), {}, seq([0]));
    expect(r.question).not.toBeNull();
    expect(r.borrowed).toBe(true);
  });
  it('returns null when there are no questions at all', () => {
    expect(pickQuestion(3, [], emptyBags(), {}, Math.random).question).toBeNull();
  });
  it('ignores ids in the bag that no longer exist', () => {
    const bags = { ...emptyBags(), 1: ['gone', 'a'] };
    const r = pickQuestion(1, questions, bags, {}, seq([0]));
    expect(['a', 'b', 'c']).toContain(r.question!.id);
  });
});
