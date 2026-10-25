import { describe, expect, it } from 'vitest';
import { askedFromBags, borrowOrder, pickQuestion } from './questionPicker';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import type { DiceNumber, Question } from '../types';

const q = (id: string, diceNumber: DiceNumber): Question => ({ id, diceNumber, question: id, acceptedAnswers: ['x'] });
const questions = [q('a', 1), q('b', 1), q('c', 1), q('d', 2), q('e', 5)];

describe('pickQuestion', () => {
  it('never repeats a question until every question has been asked', () => {
    let asked: string[] = [];
    const seen: string[] = [];
    // Roll 1 every time: after a, b, c it borrows d (same difficulty), then e.
    for (let i = 0; i < questions.length; i++) {
      const r = pickQuestion(1, questions, asked);
      seen.push(r.question!.id);
      asked = r.asked;
    }
    expect(new Set(seen).size).toBe(questions.length);
    expect(seen.slice(3)).toEqual(['d', 'e']);
  });

  it('asks all 96 built-in questions once before any repeats, whatever is rolled', () => {
    let asked: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < DEFAULT_QUESTIONS.length; i++) {
      const dice = ((i * 5) % 6 + 1) as DiceNumber;
      const r = pickQuestion(dice, DEFAULT_QUESTIONS, asked);
      expect(seen.has(r.question!.id)).toBe(false);
      seen.add(r.question!.id);
      asked = r.asked;
    }
    expect(seen.size).toBe(DEFAULT_QUESTIONS.length);
  });

  it('borrows from the same difficulty first, then the nearest number', () => {
    expect(borrowOrder(1)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(borrowOrder(4)).toEqual([4, 3, 5, 2, 6, 1]);
    expect(borrowOrder(6)).toEqual([6, 5, 4, 3, 2, 1]);
    const r = pickQuestion(6, questions, []);
    expect(r.question!.id).toBe('e');
    expect(r.borrowed).toBe(true);
  });

  it('starts over only after all are asked, and not with the question just asked', () => {
    for (let i = 0; i < 20; i++) {
      const r = pickQuestion(1, questions, ['b', 'c', 'd', 'e', 'a']);
      expect(r.question!.id).not.toBe('a');
      expect(r.asked).toEqual([r.question!.id]);
    }
  });

  it('ignores asked ids that no longer exist and returns null with no questions', () => {
    expect(pickQuestion(1, questions, ['gone', 'a', 'b']).question!.id).toBe('c');
    expect(pickQuestion(3, [], []).question).toBeNull();
  });
});

describe('askedFromBags (games saved before 2026-10-25)', () => {
  it('counts every question missing from a started bag, plus the last asked ones', () => {
    expect(askedFromBags({ 1: ['b'] }, { 1: 'a', 5: 'e' }, questions).sort()).toEqual(['a', 'c', 'e']);
    expect(askedFromBags(undefined, undefined, questions)).toEqual([]);
  });
});
