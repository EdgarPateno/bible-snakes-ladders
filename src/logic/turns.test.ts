import { describe, expect, it } from 'vitest';
import { nextTurnIndex, shuffleOrder, standings } from './turns';

describe('nextTurnIndex', () => {
  it('passes to the next player and wraps', () => {
    expect(nextTurnIndex(0, 3, false)).toBe(1);
    expect(nextTurnIndex(2, 3, false)).toBe(0);
  });
  it('keeps the same player on an extra turn', () => {
    expect(nextTurnIndex(1, 3, true)).toBe(1);
  });
});

describe('shuffleOrder', () => {
  it('keeps every id exactly once', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(shuffleOrder(ids, Math.random).sort()).toEqual(ids);
  });
});

describe('standings', () => {
  it('puts the winner first, then the rest by position', () => {
    const r = standings(['a', 'b', 'c'], { a: 40, b: 100, c: 60 }, 'b');
    expect(r.map((s) => s.playerId)).toEqual(['b', 'c', 'a']);
    expect(r.map((s) => s.place)).toEqual([1, 2, 3]);
  });
  it('shares a place on equal positions', () => {
    const r = standings(['a', 'b', 'c'], { a: 40, b: 100, c: 40 }, 'b');
    expect(r.map((s) => s.place)).toEqual([1, 2, 2]);
  });
});
