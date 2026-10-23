import { Component, type ReactNode } from 'react';
import { safeStorage } from '../lib/storage';

interface State {
  error: Error | null;
}

/** Last line of defence: if anything crashes while rendering, offer a way out instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('Snakes and Ladders crashed:', error);
  }

  private reset = (clearGameOnly: boolean) => {
    safeStorage.removeItem('bsl:game:v1');
    if (!clearGameOnly) safeStorage.removeItem('bsl:settings:v1');
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 py-10 pl-[max(16px,env(safe-area-inset-left,0px))] pr-[max(16px,env(safe-area-inset-right,0px))]">
        <h1 className="font-display text-4xl text-oxblood">Something went wrong</h1>
        <p className="text-lg text-ink-soft">
          The saved game or settings could not be loaded. Clear the saved game first; if that does not help, reset everything to the defaults.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-xl border border-gilt bg-oxblood px-4 py-2 text-lg font-semibold text-parchment-50" onClick={() => this.reset(true)}>
            Clear saved game
          </button>
          <button type="button" className="rounded-xl border border-oxblood/60 bg-parchment-50 px-4 py-2 text-lg font-semibold text-oxblood" onClick={() => this.reset(false)}>
            Reset all saved data
          </button>
        </div>
      </main>
    );
  }
}
