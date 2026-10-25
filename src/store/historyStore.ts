import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '../lib/storage';
import { recordAsked } from '../logic/questionPicker';

interface HistoryState {
  /** Question ids asked on this device across games, oldest first. Unseen questions are asked before these. */
  asked: string[];
  record: (id: string) => void;
  reset: () => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set, get) => ({
      asked: [],
      record: (id) => set({ asked: recordAsked(get().asked, id) }),
      reset: () => set({ asked: [] }),
    }),
    {
      name: 'bsl:history:v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ asked: s.asked }),
      merge: (persisted, current) => {
        const asked = (persisted as { asked?: unknown } | null)?.asked;
        return { ...current, asked: Array.isArray(asked) ? asked.filter((id): id is string => typeof id === 'string') : [] };
      },
    },
  ),
);
