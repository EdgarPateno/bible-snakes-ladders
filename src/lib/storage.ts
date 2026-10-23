import type { StateStorage } from 'zustand/middleware';

/** localStorage that never throws (private windows, blocked storage, previews). Falls back to memory. */
const memory = new Map<string, string>();
let warned = false;

/** Set by the app so a failed save can tell the player once (keeps this file free of UI imports). */
export const storageEvents: { onSaveFailed: (() => void) | null } = { onSaveFailed: null };

export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem(name, value) {
    memory.set(name, value);
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Storage blocked or full: keep the in-memory copy and say so once.
      if (!warned) {
        warned = true;
        storageEvents.onSaveFailed?.();
      }
    }
  },
  removeItem(name) {
    memory.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};
