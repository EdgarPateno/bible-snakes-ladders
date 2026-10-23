import { create } from 'zustand';
import { uid } from '../lib/random';

export type ToastTone = 'success' | 'error' | 'info';
export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>, ms?: number) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t, ms = 2600) => {
    const id = uid('toast');
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (t: Omit<Toast, 'id'>, ms?: number) => useToasts.getState().push(t, ms);
