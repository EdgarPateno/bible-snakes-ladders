import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AnswerOutcome, DiceNumber, GameState, LogEntry, Phase, Question, Settings } from '../types';
import { BOARD_SIZES } from '../types';
import { validateBoard } from '../logic/board';
import { emptyBags, pickQuestion } from '../logic/questionPicker';
import { buildMoveSteps } from '../logic/movement';
import { nextTurnIndex, shuffleOrder } from '../logic/turns';
import { safeStorage } from '../lib/storage';
import { randInt, uid } from '../lib/random';

interface GameActions {
  startGame: (settings: Settings) => void;
  /** Click on Roll Dice: picks the number; the die animates, then calls rollLanded. */
  beginRoll: () => void;
  rollLanded: (questions: Question[], exactFinish: boolean) => void;
  /** The asked question was deleted or replaced in Settings: ask another one (or let the roll count if none are left). */
  replaceMissingQuestion: (questions: Question[], exactFinish: boolean) => void;
  /** Record the result of the question. A correct (or skipped) answer prepares the move. */
  answer: (outcome: AnswerOutcome, given: string, byHost: boolean, exactFinish: boolean) => boolean;
  /** Close the feedback: start moving, or pass the turn after a wrong answer. */
  continueAfterFeedback: (extraTurnOnSix: boolean) => void;
  /** Called by the token animation when it has finished. */
  finishMove: (extraTurnOnSix: boolean) => void;
  endGame: () => void;
}

interface GameStore extends GameActions {
  game: GameState | null;
}

function currentPlayerId(g: GameState): string {
  return g.order[g.current];
}

function logEntry(g: GameState, patch: Partial<LogEntry>): LogEntry {
  const pid = currentPlayerId(g);
  const pos = g.positions[pid] ?? 0;
  return {
    id: uid('log'),
    turn: g.turn,
    playerId: pid,
    roll: g.roll ?? 0,
    outcome: g.feedback?.outcome ?? 'wrong',
    from: pos,
    landing: pos,
    to: pos,
    bounced: false,
    jump: null,
    extraTurn: false,
    won: false,
    ...patch,
  };
}

function passTurn(g: GameState, extraTurn: boolean): GameState {
  return {
    ...g,
    current: nextTurnIndex(g.current, g.order.length, extraTurn),
    phase: 'roll',
    roll: null,
    questionId: null,
    askedAt: null,
    feedback: null,
    pendingMove: null,
    turn: g.turn + 1,
  };
}

const PHASES: Phase[] = ['roll', 'rolling', 'question', 'feedback', 'moving', 'finished'];

/** A saved game must be internally consistent before it is resumed; anything else is dropped. */
export function isUsableGame(g: unknown): g is GameState {
  if (!g || typeof g !== 'object') return false;
  const x = g as GameState;
  if (!Array.isArray(x.players) || x.players.length < 2 || !Array.isArray(x.order)) return false;
  const ids = new Set(x.players.map((p) => p?.id));
  if (ids.size !== x.players.length || new Set(x.order).size !== x.players.length || x.order.length !== x.players.length || !x.order.every((id) => ids.has(id))) return false;
  if (!x.board || !BOARD_SIZES.includes(x.board.size) || !Array.isArray(x.board.snakes) || !Array.isArray(x.board.ladders)) return false;
  if (validateBoard(x.board).length) return false;
  if (!x.positions || x.order.some((id) => !Number.isInteger(x.positions[id]) || x.positions[id] < 0 || x.positions[id] > x.board.size)) return false;
  if (!Number.isInteger(x.current) || x.current < 0 || x.current >= x.order.length) return false;
  if (!PHASES.includes(x.phase) || !Array.isArray(x.log) || !x.bags || typeof x.bags !== 'object') return false;
  return true;
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      game: null,

      startGame: (settings) => {
        const ids = settings.players.map((p) => p.id);
        const order = settings.rules.randomizeTurnOrder ? shuffleOrder(ids) : ids;
        set({
          game: {
            id: uid('game'),
            players: settings.players.map((p) => ({ ...p })),
            board: JSON.parse(JSON.stringify(settings.board)),
            order,
            positions: Object.fromEntries(ids.map((id) => [id, 0])),
            current: 0,
            phase: 'roll',
            roll: null,
            questionId: null,
            askedAt: null,
            feedback: null,
            pendingMove: null,
            bags: emptyBags(),
            lastAsked: {},
            log: [],
            winnerId: null,
            turn: 1,
            startedAt: Date.now(),
          },
        });
      },

      beginRoll: () => {
        const g = get().game;
        if (!g || g.phase !== 'roll') return;
        set({ game: { ...g, phase: 'rolling', roll: randInt(1, 6) } });
      },

      rollLanded: (questions, exactFinish) => {
        const g = get().game;
        if (!g || g.phase !== 'rolling' || !g.roll) return;
        const pick = pickQuestion(g.roll as DiceNumber, questions, g.bags, g.lastAsked);
        if (!pick.question) {
          // No questions at all: let the roll count so the game can still be played.
          set({ game: { ...g, phase: 'question', questionId: null } });
          get().answer('skipped', '', false, exactFinish);
          return;
        }
        set({
          game: { ...g, phase: 'question', questionId: pick.question.id, askedAt: Date.now(), bags: pick.bags, lastAsked: pick.lastAsked },
        });
      },

      replaceMissingQuestion: (questions, exactFinish) => {
        const g = get().game;
        if (!g || g.phase !== 'question' || !g.roll) return;
        if (g.questionId && questions.some((q) => q.id === g.questionId)) return;
        set({ game: { ...g, phase: 'rolling' } });
        get().rollLanded(questions, exactFinish);
      },

      answer: (outcome, given, byHost, exactFinish) => {
        const g = get().game;
        if (!g || (g.phase !== 'question' && g.phase !== 'feedback') || !g.roll) return false;
        // A result can only be changed in one direction: a wrong answer the host accepts. Ignore repeats.
        if (g.phase === 'feedback' && !(outcome === 'correct' && g.feedback?.outcome !== 'correct')) return false;
        const moves = outcome === 'correct' || outcome === 'skipped';
        const pid = currentPlayerId(g);
        const pendingMove = moves
          ? (() => {
              const m = buildMoveSteps(g.positions[pid] ?? 0, g.roll, g.board, exactFinish);
              return { id: uid('move'), playerId: pid, steps: m.steps, final: m.final };
            })()
          : null;
        set({ game: { ...g, phase: 'feedback', feedback: { outcome, given, byHost }, pendingMove } });
        return true;
      },

      continueAfterFeedback: (extraTurnOnSix) => {
        const g = get().game;
        if (!g || g.phase !== 'feedback' || !g.feedback) return;
        if (g.pendingMove && g.pendingMove.steps.length > 0) {
          set({ game: { ...g, phase: 'moving' } });
          return;
        }
        if (g.pendingMove) {
          // A correct answer with nothing to walk (cannot happen with rolls 1-6, kept for safety).
          get().finishMove(extraTurnOnSix);
          return;
        }
        set({ game: passTurn({ ...g, log: [logEntry(g, {}), ...g.log] }, false) });
      },

      finishMove: (extraTurnOnSix) => {
        const g = get().game;
        if (!g || !g.pendingMove) return;
        const pid = g.pendingMove.playerId;
        const from = g.positions[pid] ?? 0;
        const final = g.pendingMove.final;
        const steps = g.pendingMove.steps;
        const jumpStep = steps.find((s) => s.kind !== 'walk');
        const walks = steps.filter((s): s is { kind: 'walk'; square: number } => s.kind === 'walk');
        const landing = walks.length ? walks[walks.length - 1].square : from;
        const bounced = walks.some((s, i) => i > 0 && s.square < walks[i - 1].square);
        const won = final === g.board.size;
        const extraTurn = !won && extraTurnOnSix && g.roll === 6 && g.feedback?.outcome === 'correct';
        const entry = logEntry(g, {
          from,
          landing,
          to: final,
          bounced,
          jump: jumpStep ? (jumpStep.kind as 'snake' | 'ladder') : null,
          extraTurn,
          won,
        });
        const moved: GameState = { ...g, positions: { ...g.positions, [pid]: final }, log: [entry, ...g.log] };
        if (won) {
          set({ game: { ...moved, phase: 'finished', winnerId: pid, pendingMove: null } });
          return;
        }
        set({ game: passTurn(moved, extraTurn) });
      },

      endGame: () => set({ game: null }),
    }),
    {
      name: 'bsl:game:v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ game: s.game }),
      merge: (persisted, current) => {
        const g = (persisted as { game?: GameState | null })?.game ?? null;
        if (!isUsableGame(g)) return { ...current, game: null };
        // A refresh in the middle of an animation resumes at a safe point. A roll in flight keeps its number.
        if (g.phase === 'rolling' && !g.roll) return { ...current, game: { ...g, phase: 'roll' } };
        if (g.phase === 'moving' && g.pendingMove) return { ...current, game: { ...g, phase: 'feedback' } };
        return { ...current, game: g };
      },
    },
  ),
);

export function activePlayerId(g: GameState): string {
  return currentPlayerId(g);
}
