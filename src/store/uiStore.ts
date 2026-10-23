import { create } from 'zustand';

export type Screen = 'start' | 'game' | 'settings';

interface UiState {
  screen: Screen;
  /** Where Settings returns to. */
  back: Screen;
  go: (s: Screen) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useUi = create<UiState>()((set, get) => ({
  screen: 'start',
  back: 'start',
  go: (screen) => set({ screen }),
  openSettings: () => set({ back: get().screen === 'settings' ? get().back : get().screen, screen: 'settings' }),
  closeSettings: () => set({ screen: get().back }),
}));
