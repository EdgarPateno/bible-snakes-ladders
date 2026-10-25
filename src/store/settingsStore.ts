import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { BoardConfig, Player, Question, Rules, Settings } from '../types';
import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, PLAYER_TOKENS } from '../data/defaults';
import { sanitizeSettings } from '../logic/importExport';
import { addQuestionsOf20261025, addQuestionsOf20261025b, upgradeBoard, upgradeQuestions } from '../data/legacy';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { safeStorage } from '../lib/storage';
import { uid } from '../lib/random';

interface SettingsActions {
  addPlayer: () => void;
  updatePlayer: (id: string, patch: Partial<Omit<Player, 'id'>>) => void;
  removePlayer: (id: string) => void;
  movePlayer: (id: string, delta: -1 | 1) => void;
  upsertQuestion: (q: Question) => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => void;
  /** mode "replace" swaps the whole list; "merge" adds new ids and overwrites matching ids. */
  importQuestions: (qs: Question[], mode: 'replace' | 'merge') => void;
  resetQuestions: () => void;
  setBoard: (board: BoardConfig) => void;
  setRules: (patch: Partial<Rules>) => void;
  replaceAll: (s: Settings) => void;
}

export type SettingsState = Settings & SettingsActions;

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      addPlayer: () => {
        const { players } = get();
        if (players.length >= MAX_PLAYERS) return;
        const usedColors = new Set(players.map((p) => p.color));
        const usedTokens = new Set(players.map((p) => p.token));
        set({
          players: [
            ...players,
            {
              id: uid('p'),
              name: `Player ${players.length + 1}`,
              color: PLAYER_COLORS.find((c) => !usedColors.has(c)) ?? PLAYER_COLORS[0],
              token: PLAYER_TOKENS.find((t) => !usedTokens.has(t)) ?? '⭐',
            },
          ],
        });
      },
      updatePlayer: (id, patch) => set({ players: get().players.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),
      removePlayer: (id) => {
        const { players } = get();
        if (players.length <= MIN_PLAYERS) return;
        set({ players: players.filter((p) => p.id !== id) });
      },
      movePlayer: (id, delta) => {
        const players = get().players.slice();
        const i = players.findIndex((p) => p.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= players.length) return;
        [players[i], players[j]] = [players[j], players[i]];
        set({ players });
      },

      upsertQuestion: (q) => {
        const { questions } = get();
        const exists = questions.some((x) => x.id === q.id);
        set({ questions: exists ? questions.map((x) => (x.id === q.id ? q : x)) : [...questions, q] });
      },
      deleteQuestion: (id) => set({ questions: get().questions.filter((q) => q.id !== id) }),
      duplicateQuestion: (id) => {
        const { questions } = get();
        const i = questions.findIndex((q) => q.id === id);
        if (i < 0) return;
        const copy = { ...questions[i], id: uid('q'), acceptedAnswers: [...questions[i].acceptedAnswers] };
        set({ questions: [...questions.slice(0, i + 1), copy, ...questions.slice(i + 1)] });
      },
      importQuestions: (qs, mode) => {
        if (mode === 'replace') return set({ questions: qs });
        const byId = new Map(get().questions.map((q) => [q.id, q]));
        for (const q of qs) byId.set(q.id, q);
        set({ questions: [...byId.values()] });
      },
      resetQuestions: () => set({ questions: DEFAULT_QUESTIONS }),

      setBoard: (board) => set({ board }),
      setRules: (patch) => set({ rules: { ...get().rules, ...patch } }),
      replaceAll: (s) => set({ players: s.players, questions: s.questions, board: s.board, rules: s.rules }),
    }),
    {
      name: 'bsl:settings:v1',
      // 2 (2026-10-25): 48 more built-in questions and a lesson hint on each built-in question.
      // 3 (2026-10-25): about 4 built-in questions per lesson.
      version: 3,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ version: 1, players: s.players, questions: s.questions, board: s.board, rules: s.rules }),
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        let questions = (persisted as { questions?: unknown }).questions;
        if (version < 2) questions = addQuestionsOf20261025(questions);
        if (version < 3) questions = addQuestionsOf20261025b(questions);
        return { ...persisted, questions };
      },
      merge: (persisted, current) => {
        if (!persisted) return current;
        const s = sanitizeSettings(persisted);
        // Untouched old defaults (board, answer lists) get the current built-in version.
        return { ...current, players: s.players, questions: upgradeQuestions(s.questions), board: upgradeBoard(s.board), rules: s.rules };
      },
    },
  ),
);

export function currentSettings(): Settings {
  const s = useSettings.getState();
  return { version: 1, players: s.players, questions: s.questions, board: s.board, rules: s.rules };
}
