import { describe, expect, it } from 'vitest';
import { LAST_IN_BATCH_B, addQuestionsOf20261025, upgradeBoard, upgradeQuestions } from './legacy';
import type { Question } from '../types';
import { classicLayout } from '../logic/board';
import { DEFAULT_QUESTIONS } from './defaultQuestions';

describe('upgrading saved settings', () => {
  it('replaces an untouched old classic board with the current one', () => {
    const old = {
      size: 100 as const,
      ladders: classicLayout(100).ladders,
      snakes: [[16, 6], [47, 26], [49, 11], [62, 19], [87, 24], [93, 73], [95, 75], [98, 78]].map(([from, to], i) => ({ id: `s${i}`, from, to })),
    };
    expect(upgradeBoard(old).snakes).toHaveLength(classicLayout(100).snakes.length);
  });
  it('keeps a board the host edited', () => {
    const edited = { ...classicLayout(100), snakes: [{ id: 'x', from: 50, to: 10 }] };
    expect(upgradeBoard(edited)).toBe(edited);
  });
  it('updates untouched old answer lists and keeps edited ones', () => {
    const fresh = DEFAULT_QUESTIONS.find((q) => q.id === 'ceb-6-01')!;
    const old = { ...fresh, acceptedAnswers: ['Beltesazar', 'Beltsasar', 'Belteshazzar'] };
    const edited = { ...fresh, id: 'ceb-1-06', acceptedAnswers: ['langob'] };
    const [a, b] = upgradeQuestions([old, edited]);
    expect(a.acceptedAnswers).not.toContain('Beltsasar');
    expect(b).toBe(edited);
  });

  it('adds the 2026-10-25 questions and hints to a saved built-in list once', () => {
    const before = DEFAULT_QUESTIONS.filter((q) => Number(q.id.split('-')[2]) <= 8).map(({ hint: _hint, ...q }) => q);
    const edited = { ...before[0], question: 'My own wording?' };
    const custom: Question = { id: 'q-own', diceNumber: 2, question: 'Mine?', acceptedAnswers: ['yes'] };
    const out = addQuestionsOf20261025([edited, ...before.slice(1), custom]) as Question[];
    expect(out).toHaveLength(DEFAULT_QUESTIONS.filter((q) => Number(q.id.split('-')[2]) <= 16).length + 1);
    expect(out[0]).toBe(edited);
    expect(out[1].hint).toBe(DEFAULT_QUESTIONS.find((q) => q.id === before[1].id)!.hint);
    expect(out.find((q) => q.id === 'q-own')).toBe(custom);
    expect(out.filter((q) => q.id === 'ceb-6-16')).toHaveLength(1);
  });
  it('leaves a list of only the host’s own questions alone', () => {
    const own = [{ id: 'q-1', diceNumber: 1, question: 'Who?', acceptedAnswers: ['me'] }];
    expect(addQuestionsOf20261025(own)).toBe(own);
    expect(addQuestionsOf20261025('garbage')).toBe('garbage');
  });
  it('the per-lesson batch bounds cover exactly the built-in ids from 17 up (update them with the next batch)', () => {
    for (const q of DEFAULT_QUESTIONS) {
      const [, dice, no] = q.id.split('-').map(Number);
      if (no >= 17) expect(no, q.id).toBeLessThanOrEqual(LAST_IN_BATCH_B[dice]);
    }
    for (const dice of [1, 2, 3, 4, 5, 6]) {
      expect(DEFAULT_QUESTIONS.some((q) => q.id === `ceb-${dice}-${LAST_IN_BATCH_B[dice]}`)).toBe(true);
    }
  });
  it('upgrades the old "Aaron | Aron" list and the reworded question texts, keeping host edits', () => {
    const fresh = DEFAULT_QUESTIONS.find((q) => q.id === 'ceb-3-12')!;
    const oldAaron = { ...fresh, acceptedAnswers: ['Aaron', 'Aron'] };
    const eve = DEFAULT_QUESTIONS.find((q) => q.id === 'ceb-1-07')!;
    const oldEve = { ...eve, question: 'Unsay ngalan sa asawa ni Adan nga gihimo gikan sa iyang gusok?' };
    const hostEve = { ...oldEve, acceptedAnswers: ['Eva'] };
    const [a, b, c] = upgradeQuestions([oldAaron, oldEve, hostEve]);
    expect(a.acceptedAnswers).toEqual(['Aaron']);
    expect(b.question).toBe(eve.question);
    expect(c).toBe(hostEve);
  });
});
