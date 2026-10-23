import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/toastStore';
import { MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS, PLAYER_TOKENS } from '../../data/defaults';
import type { Player } from '../../types';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/Field';
import { Toggle } from '../ui/Toggle';
import { SectionTitle } from './shared';

const COLOR_NAMES: Record<string, string> = {
  '#c0392b': 'Red',
  '#1f6fb2': 'Blue',
  '#2e8b57': 'Green',
  '#d68910': 'Amber',
  '#7d3c98': 'Purple',
  '#17a2a2': 'Teal',
  '#d6336c': 'Pink',
  '#5d6d7e': 'Slate',
};

const TOKEN_NAMES: Record<string, string> = {
  '🕊️': 'Dove',
  '🦁': 'Lion',
  '🐑': 'Sheep',
  '🐟': 'Fish',
  '⭐': 'Star',
  '🍇': 'Grapes',
  '🌿': 'Branch',
  '🔥': 'Fire',
  '🐫': 'Camel',
  '👑': 'Crown',
  '📜': 'Scroll',
  '⛵': 'Boat',
};

const NAME_MAX = 24;

/** The native colour input only accepts #rrggbb. */
function toHex6(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [r, g, b] = color.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '#7a1f1f';
}

export function PlayersTab() {
  const players = useSettings((s) => s.players);
  const addPlayer = useSettings((s) => s.addPlayer);
  const randomize = useSettings((s) => s.rules.randomizeTurnOrder);
  const setRules = useSettings((s) => s.setRules);
  const atMax = players.length >= MAX_PLAYERS;

  return (
    <div className="flex flex-col gap-5">
      <div className="panel flex flex-col gap-2 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <SectionTitle>Players</SectionTitle>
            <p className="text-lg text-ink-soft">
              {players.length} of {MAX_PLAYERS} players. A game needs at least {MIN_PLAYERS}.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              addPlayer();
              toast({ tone: 'success', title: 'Player added', body: 'Give them a name below.' });
            }}
            disabled={atMax}
            aria-describedby={atMax ? 'players-max-note' : undefined}
          >
            + Add player
          </Button>
        </div>
        {atMax && (
          <p id="players-max-note" className="text-base text-ink-soft">
            The game holds up to {MAX_PLAYERS} players. Remove one to add another.
          </p>
        )}
        <Toggle
          id="rule-randomize-turn-order"
          label="Randomize turn order at game start"
          description="Off: players take turns in the order listed below."
          checked={randomize}
          onChange={(v) => setRules({ randomizeTurnOrder: v })}
        />
      </div>

      <ol className="flex flex-col gap-4" aria-label="Players in turn order">
        {players.map((p, i) => (
          <PlayerCard key={p.id} player={p} index={i} count={players.length} />
        ))}
      </ol>
    </div>
  );
}

function PlayerCard({ player, index, count }: { player: Player; index: number; count: number }) {
  const updatePlayer = useSettings((s) => s.updatePlayer);
  const removePlayer = useSettings((s) => s.removePlayer);
  const movePlayer = useSettings((s) => s.movePlayer);
  const id = player.id;
  const nameId = `player-name-${id}`;
  const nameError = player.name.trim() === '' ? 'Give this player a name.' : null;
  const displayName = player.name.trim() || `Player ${index + 1}`;
  const colorHex = toHex6(player.color);
  const isPreset = PLAYER_COLORS.includes(player.color.toLowerCase());

  return (
    <li className="panel flex flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-end gap-3">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 text-3xl shadow"
          style={{ borderColor: player.color, backgroundColor: `${colorHex}33` }}
        >
          {player.token}
        </span>
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <label htmlFor={nameId} className="text-base font-semibold text-ink-soft">
            Player {index + 1} name
          </label>
          <input
            id={nameId}
            type="text"
            value={player.name}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? `${nameId}-error` : undefined}
            onChange={(e) => updatePlayer(id, { name: e.target.value })}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              updatePlayer(id, { name: trimmed || `Player ${index + 1}` });
            }}
            className={`${inputClass} text-xl`}
          />
          {nameError && (
            <span id={`${nameId}-error`} className="text-sm font-semibold text-oxblood">
              {nameError}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => movePlayer(id, -1)}
            disabled={index === 0}
            aria-label={`Move ${displayName} up`}
          >
            ↑ Up
          </Button>
          <Button
            size="sm"
            onClick={() => movePlayer(id, 1)}
            disabled={index === count - 1}
            aria-label={`Move ${displayName} down`}
          >
            ↓ Down
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              removePlayer(id);
              toast({ tone: 'info', title: `Removed ${displayName}` });
            }}
            disabled={count <= MIN_PLAYERS}
            aria-label={`Remove ${displayName}`}
            title={count <= MIN_PLAYERS ? `A game needs at least ${MIN_PLAYERS} players` : undefined}
          >
            Remove
          </Button>
        </div>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1 text-base font-semibold text-ink-soft">Color for {displayName}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PLAYER_COLORS.map((c) => {
            const selected = player.color.toLowerCase() === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={selected}
                aria-label={COLOR_NAMES[c] ?? c}
                title={COLOR_NAMES[c] ?? c}
                onClick={() => updatePlayer(id, { color: c })}
                className={`h-10 w-10 rounded-full border-2 transition-transform ${
                  selected ? 'scale-110 border-ink ring-2 ring-gilt ring-offset-2 ring-offset-parchment-50' : 'border-white/70'
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
          <label
            htmlFor={`player-color-${id}`}
            className={`ml-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-base ${
              isPreset ? 'border-walnut/30' : 'border-ink ring-2 ring-gilt'
            }`}
          >
            <input
              id={`player-color-${id}`}
              type="color"
              value={colorHex}
              onChange={(e) => updatePlayer(id, { color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            Custom
          </label>
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1 text-base font-semibold text-ink-soft">Token for {displayName}</legend>
        <div className="flex flex-wrap gap-2">
          {PLAYER_TOKENS.map((t) => {
            const selected = player.token === t;
            const label = TOKEN_NAMES[t] ?? t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={selected}
                aria-label={label}
                title={label}
                onClick={() => updatePlayer(id, { token: t })}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition-colors ${
                  selected ? 'border-oxblood bg-oxblood/10 ring-2 ring-gilt' : 'border-walnut/30 bg-parchment-50 hover:bg-white'
                }`}
              >
                <span aria-hidden="true">{t}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </li>
  );
}
