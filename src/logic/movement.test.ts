import { describe, expect, it } from 'vitest';
import { buildMoveSteps, computeMove, resolveJump } from './movement';
import type { BoardConfig } from '../types';

const board: BoardConfig = {
  size: 100,
  snakes: [{ id: 's1', from: 40, to: 10 }],
  ladders: [{ id: 'l1', from: 5, to: 30 }],
};

describe('computeMove', () => {
  it('walks forward square by square', () => {
    expect(computeMove(0, 3, 100, true)).toEqual({ path: [1, 2, 3], landing: 3, bounced: false });
    expect(computeMove(20, 4, 100, true)).toEqual({ path: [21, 22, 23, 24], landing: 24, bounced: false });
  });
  it('lands exactly on the final square', () => {
    expect(computeMove(97, 3, 100, true)).toEqual({ path: [98, 99, 100], landing: 100, bounced: false });
  });
  it('bounces back on overshoot when an exact roll is required', () => {
    expect(computeMove(97, 5, 100, true)).toEqual({ path: [98, 99, 100, 99, 98], landing: 98, bounced: true });
    expect(computeMove(99, 6, 100, true)).toEqual({ path: [100, 99, 98, 97, 96, 95], landing: 95, bounced: true });
  });
  it('stops on the final square on overshoot when exact roll is off', () => {
    expect(computeMove(97, 5, 100, false)).toEqual({ path: [98, 99, 100], landing: 100, bounced: false });
  });
  it('works on smaller boards', () => {
    expect(computeMove(62, 4, 64, true).landing).toBe(62);
  });
});

describe('resolveJump', () => {
  it('climbs a ladder', () => {
    expect(resolveJump(5, board)).toEqual({ final: 30, jump: { kind: 'ladder', id: 'l1', from: 5, to: 30 } });
  });
  it('slides down a snake', () => {
    expect(resolveJump(40, board)).toEqual({ final: 10, jump: { kind: 'snake', id: 's1', from: 40, to: 10 } });
  });
  it('stays put on a plain square', () => {
    expect(resolveJump(7, board)).toEqual({ final: 7, jump: null });
  });
});

describe('buildMoveSteps', () => {
  it('combines a walk with a ladder climb', () => {
    const r = buildMoveSteps(2, 3, board, true);
    expect(r.final).toBe(30);
    expect(r.steps).toEqual([
      { kind: 'walk', square: 3 },
      { kind: 'walk', square: 4 },
      { kind: 'walk', square: 5 },
      { kind: 'ladder', jumpId: 'l1', from: 5, to: 30 },
    ]);
  });
  it('resolves a snake after a bounce', () => {
    const b: BoardConfig = { size: 100, snakes: [{ id: 's', from: 98, to: 20 }], ladders: [] };
    const r = buildMoveSteps(97, 5, b, true);
    expect(r.bounced).toBe(true);
    expect(r.landing).toBe(98);
    expect(r.final).toBe(20);
  });
});
