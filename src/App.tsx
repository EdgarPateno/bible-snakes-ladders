import { useEffect } from 'react';
import { useUi } from './store/uiStore';
import { useGame } from './store/gameStore';
import { StartScreen } from './components/StartScreen';
import { GameScreen } from './components/game/GameScreen';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { Toasts } from './components/Toasts';

export default function App() {
  const screen = useUi((s) => s.screen);
  const closeSettings = useUi((s) => s.closeSettings);
  const go = useUi((s) => s.go);
  const hasGame = useGame((s) => !!s.game);

  // Never show an empty game screen.
  useEffect(() => {
    if (screen === 'game' && !hasGame) go('start');
  }, [screen, hasGame, go]);

  return (
    <>
      {screen === 'start' && <StartScreen />}
      {screen === 'game' && hasGame && <GameScreen />}
      {screen === 'settings' && <SettingsPanel onClose={closeSettings} />}
      <Toasts />
    </>
  );
}
