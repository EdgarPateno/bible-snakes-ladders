import { describe, expect, it } from 'vitest';
import { upgradeBoard, upgradeQuestions } from './legacy';
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
});
