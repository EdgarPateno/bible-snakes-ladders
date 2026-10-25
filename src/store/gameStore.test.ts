import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isUsableGame, useGame } from './gameStore';
import { useHistory } from './historyStore';
import { DEFAULT_SETTINGS } from '../data/defaults';
import type { Settings } from '../types';

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  players: DEFAULT_SETTINGS.players.slice(0, 2),
  board: { size: 100, snakes: [{ id: 's', from: 9, to: 2 }], ladders: [{ id: 'l', from: 4, to: 30 }] },
};

/** Force the next roll: randInt(1, 6) = 1 + floor(r * 6). */
function forceRoll(n: number) {
  vi.spyOn(Math, 'random').mockReturnValueOnce((n - 1) / 6 + 0.01);
}

function playTurn(roll: number, outcome: 'correct' | 'wrong', extraTurnOnSix = false) {
  const s = useGame.getState();
  forceRoll(roll);
  s.beginRoll();
  s.rollLanded(settings.questions, true);
  expect(useGame.getState().game!.phase).toBe('question');
  s.answer(outcome, 'x', false, true);
  s.continueAfterFeedback(extraTurnOnSix);
  if (useGame.getState().game!.phase === 'moving') s.finishMove(extraTurnOnSix);
}

describe('game flow', () => {
  beforeEach(() => {
    useHistory.getState().reset();
    useGame.getState().startGame(settings);
  });
  afterEach(() => vi.restoreAllMocks());

  it('never asks the same question twice in a game until all have been asked', () => {
    const seen = new Set<string>();
    for (let i = 0; i < settings.questions.length; i++) {
      playTurn((i % 3) + 1, 'wrong'); // only 1–3 are rolled, so those numbers run out and borrow
      const asked = useGame.getState().game!.asked!;
      const id = asked[asked.length - 1];
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(settings.questions.length);
  });

  it('a new game on the same device asks questions the earlier game did not', () => {
    for (let i = 0; i < 40; i++) playTurn((i % 6) + 1, 'wrong');
    const first = new Set(useGame.getState().game!.asked!);
    useGame.getState().startGame(settings);
    for (let i = 0; i < 40; i++) playTurn((i % 6) + 1, 'wrong');
    const second = useGame.getState().game!.asked!;
    expect(second.filter((id) => first.has(id))).toEqual([]);
    expect(useHistory.getState().asked).toHaveLength(80);
  });

  it('keeps a game saved before 2026-10-25 (per-number bags) playable without repeating its asked questions', () => {
    const g = useGame.getState().game!;
    const ones = settings.questions.filter((q) => q.diceNumber === 1).map((q) => q.id);
    const { asked: _asked, ...old } = g;
    useGame.setState({ game: { ...old, bags: { 1: ones.slice(0, 1) }, lastAsked: { 1: ones[1] } } });
    playTurn(1, 'wrong');
    // Only ones[0] was left in the old bag, so it is asked, and the other 15 count as already asked.
    const asked = useGame.getState().game!.asked!;
    expect(asked[asked.length - 1]).toBe(ones[0]);
    expect([...asked].sort()).toEqual([...ones].sort());
  });

  it('starts everyone off the board with the first player to roll', () => {
    const g = useGame.getState().game!;
    expect(g.phase).toBe('roll');
    expect(Object.values(g.positions)).toEqual([0, 0]);
    expect(g.order).toEqual(settings.players.map((p) => p.id));
  });

  it('moves on a correct answer and climbs a ladder', () => {
    playTurn(4, 'correct');
    const g = useGame.getState().game!;
    expect(g.positions[settings.players[0].id]).toBe(30);
    expect(g.log[0]).toMatchObject({ roll: 4, outcome: 'correct', landing: 4, to: 30, jump: 'ladder' });
    expect(g.current).toBe(1);
  });

  it('stays in place on a wrong answer and passes the turn', () => {
    playTurn(4, 'wrong');
    const g = useGame.getState().game!;
    expect(g.positions[settings.players[0].id]).toBe(0);
    expect(g.log[0]).toMatchObject({ outcome: 'wrong', from: 0, to: 0 });
    expect(g.current).toBe(1);
  });

  it('slides down a snake', () => {
    playTurn(6, 'correct'); // 0 → 6
    playTurn(1, 'wrong'); // player 2
    playTurn(3, 'correct'); // 6 → 9 → snake to 2
    expect(useGame.getState().game!.positions[settings.players[0].id]).toBe(2);
    expect(useGame.getState().game!.log[0].jump).toBe('snake');
  });

  it('gives an extra turn on a correct 6 only when the rule is on', () => {
    playTurn(6, 'correct', true);
    expect(useGame.getState().game!.current).toBe(0);
    playTurn(6, 'wrong', true);
    expect(useGame.getState().game!.current).toBe(1);
  });

  it('declares a winner on the final square', () => {
    const s = useGame.getState();
    useGame.setState({ game: { ...s.game!, positions: { ...s.game!.positions, [settings.players[0].id]: 97 } } });
    playTurn(3, 'correct');
    const g = useGame.getState().game!;
    expect(g.phase).toBe('finished');
    expect(g.winnerId).toBe(settings.players[0].id);
    expect(g.log[0].won).toBe(true);
  });

  it('bounces back when overshooting with exact finish on', () => {
    const s = useGame.getState();
    useGame.setState({ game: { ...s.game!, positions: { ...s.game!.positions, [settings.players[0].id]: 98 } } });
    playTurn(5, 'correct');
    const g = useGame.getState().game!;
    expect(g.positions[settings.players[0].id]).toBe(97);
    expect(g.log[0].bounced).toBe(true);
    expect(g.phase).toBe('roll');
  });
});

describe('saved game checks', () => {
  it('accepts a fresh game and rejects broken ones', () => {
    useGame.getState().startGame(settings);
    const g = useGame.getState().game!;
    expect(isUsableGame(g)).toBe(true);
    expect(isUsableGame(null)).toBe(false);
    expect(isUsableGame({ ...g, current: 7 })).toBe(false);
    expect(isUsableGame({ ...g, positions: {} })).toBe(false);
    expect(isUsableGame({ ...g, board: { size: 81, snakes: [], ladders: [] } })).toBe(false);
    expect(isUsableGame({ ...g, order: [g.order[0], g.order[0]] })).toBe(false);
  });

  it('asks a new question when the asked one was deleted', () => {
    useGame.getState().startGame(settings);
    const s = useGame.getState();
    s.beginRoll();
    s.rollLanded(settings.questions, true);
    const asked = useGame.getState().game!.questionId;
    const remaining = settings.questions.filter((q) => q.id !== asked);
    s.replaceMissingQuestion(remaining, true);
    const g = useGame.getState().game!;
    expect(g.phase).toBe('question');
    expect(g.questionId).not.toBe(asked);
    expect(remaining.some((q) => q.id === g.questionId)).toBe(true);
  });
});

describe('answer guards', () => {
  it('ignores a repeated result and lets the host accept a wrong answer once', () => {
    useGame.getState().startGame(settings);
    const s = useGame.getState();
    s.beginRoll();
    s.rollLanded(settings.questions, true);
    expect(s.answer('wrong', 'x', false, true)).toBe(true);
    expect(s.answer('wrong', 'x', false, true)).toBe(false);
    expect(s.answer('correct', 'x', true, true)).toBe(true);
    expect(s.answer('correct', 'x', true, true)).toBe(false);
    expect(useGame.getState().game!.pendingMove).not.toBeNull();
  });
  it('records when the question was asked, for the timer', () => {
    useGame.getState().startGame(settings);
    const s = useGame.getState();
    s.beginRoll();
    s.rollLanded(settings.questions, true);
    expect(typeof useGame.getState().game!.askedAt).toBe('number');
  });
});

describe('no questions at all', () => {
  it('lets the roll count, and a 6 still earns the extra turn', () => {
    useGame.getState().startGame(settings);
    const s = useGame.getState();
    forceRoll(6);
    s.beginRoll();
    s.rollLanded([], true);
    expect(useGame.getState().game!.feedback?.outcome).toBe('skipped');
    s.continueAfterFeedback(true);
    s.finishMove(true);
    const g = useGame.getState().game!;
    expect(g.positions[settings.players[0].id]).toBe(6);
    expect(g.current).toBe(0);
  });
});
