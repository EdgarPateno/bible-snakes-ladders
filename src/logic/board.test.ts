import { describe, expect, it } from 'vitest';
import { boardDims, cellToSquare, classicLayout, randomizeJumps, squareToCell, validateBoard } from './board';
import type { BoardConfig } from '../types';

const j = (id: string, from: number, to: number) => ({ id, from, to });

describe('boardDims', () => {
  it('uses 10x10, 8x8 and 10x5 grids', () => {
    expect(boardDims(100)).toEqual({ cols: 10, rows: 10 });
    expect(boardDims(64)).toEqual({ cols: 8, rows: 8 });
    expect(boardDims(50)).toEqual({ cols: 10, rows: 5 });
  });
});

describe('squareToCell (serpentine)', () => {
  it('puts 1 bottom-left and 100 top-left on a 10x10 board', () => {
    expect(squareToCell(1, 100)).toEqual({ row: 9, col: 0 });
    expect(squareToCell(10, 100)).toEqual({ row: 9, col: 9 });
    expect(squareToCell(11, 100)).toEqual({ row: 8, col: 9 });
    expect(squareToCell(20, 100)).toEqual({ row: 8, col: 0 });
    expect(squareToCell(100, 100)).toEqual({ row: 0, col: 0 });
  });
  it('ends top-left on 8x8 and top-right on 10x5', () => {
    expect(squareToCell(64, 64)).toEqual({ row: 0, col: 0 });
    expect(squareToCell(50, 50)).toEqual({ row: 0, col: 9 });
  });
  it('round-trips through cellToSquare', () => {
    for (const size of [50, 64, 100] as const) {
      for (let n = 1; n <= size; n++) {
        const { row, col } = squareToCell(n, size);
        expect(cellToSquare(row, col, size)).toBe(n);
      }
    }
  });
});

describe('validateBoard', () => {
  const base: BoardConfig = { size: 100, snakes: [j('s1', 40, 10)], ladders: [j('l1', 5, 30)] };

  it('accepts a valid board', () => {
    expect(validateBoard(base)).toEqual([]);
  });
  it('rejects a snake that goes up and a ladder that goes down', () => {
    const errs = validateBoard({ ...base, snakes: [j('s1', 10, 40)], ladders: [j('l1', 30, 5)] });
    expect(errs.map((e) => e.jumpId).sort()).toEqual(['l1', 's1']);
  });
  it('rejects jumps starting on square 1 or the final square', () => {
    const errs = validateBoard({ ...base, snakes: [j('s1', 100, 50)], ladders: [j('l1', 1, 20)] });
    expect(errs).toHaveLength(2);
  });
  it('rejects squares outside the board', () => {
    expect(validateBoard({ ...base, ladders: [j('l1', 5, 101)] })).toHaveLength(1);
    expect(validateBoard({ ...base, snakes: [j('s1', 40, 0)] })).toHaveLength(1);
    expect(validateBoard({ ...base, snakes: [j('s1', 40.5, 3)] })).toHaveLength(1);
  });
  it('rejects two jumps sharing a start square', () => {
    const errs = validateBoard({ ...base, ladders: [j('l1', 40, 60)] });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.some((e) => /already/i.test(e.message))).toBe(true);
  });
  it('rejects a jump that ends on another jump start (chains)', () => {
    const errs = validateBoard({ ...base, ladders: [j('l1', 5, 40)] });
    expect(errs.some((e) => e.jumpId === 'l1')).toBe(true);
  });
});

describe('layouts', () => {
  it('classic layouts are valid for every size', () => {
    for (const size of [50, 64, 100] as const) {
      expect(validateBoard(classicLayout(size))).toEqual([]);
    }
  });
  it('random layouts are valid', () => {
    for (let i = 0; i < 200; i++) {
      for (const size of [50, 64, 100] as const) {
        const b = randomizeJumps(size);
        expect(validateBoard(b)).toEqual([]);
        expect(b.snakes.length).toBeGreaterThan(0);
        expect(b.ladders.length).toBeGreaterThan(0);
      }
    }
  });
});
