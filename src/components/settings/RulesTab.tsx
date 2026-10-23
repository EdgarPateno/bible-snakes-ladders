import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/Field';
import { Toggle } from '../ui/Toggle';
import { useSettings } from '../../store/settingsStore';
import { SectionTitle } from './shared';

const TIMER_MIN = 5;
const TIMER_MAX = 300;
const QUICK_PICKS = [15, 30, 60];

export function RulesTab() {
  const rules = useSettings((s) => s.rules);
  const setRules = useSettings((s) => s.setRules);

  return (
    <div className="flex flex-col gap-5">
      <div className="panel px-5 py-4">
        <SectionTitle>Rules</SectionTitle>
        <div className="divide-y divide-walnut/20">
          <Toggle
            id="rule-exact-finish"
            label="Exact roll needed to finish — overshooting bounces back"
            description="Off: any roll that reaches the last square wins."
            checked={rules.exactRollToFinish}
            onChange={(v) => setRules({ exactRollToFinish: v })}
          />
          <Toggle
            id="rule-show-answer"
            label="Show the correct answer after a wrong answer"
            checked={rules.showCorrectAnswer}
            onChange={(v) => setRules({ showCorrectAnswer: v })}
          />
          <Toggle
            id="rule-extra-six"
            label="Extra turn on a 6"
            description="Only after a correct answer."
            checked={rules.extraTurnOnSix}
            onChange={(v) => setRules({ extraTurnOnSix: v })}
          />
          <Toggle
            id="rule-sound"
            label="Sound effects"
            checked={rules.sound}
            onChange={(v) => setRules({ sound: v })}
          />
          <Toggle
            id="rule-lenient"
            label="Allow small typos"
            description="Accept one wrong letter in words of 6–9 letters and two in longer words, as long as the first letter is right. Words of 5 letters or fewer and numbers must be exact. Capitals, accents and punctuation are always ignored."
            checked={rules.lenientMatching}
            onChange={(v) => setRules({ lenientMatching: v })}
          />
          <Toggle
            id="rule-host-override"
            label="Show host Mark correct / Mark wrong buttons"
            description="Lets the host decide when a spoken or unusual answer should count."
            checked={rules.hostOverride}
            onChange={(v) => setRules({ hostOverride: v })}
          />
        </div>
      </div>
      <TimerSetting seconds={rules.answerTimerSeconds} onChange={(s) => setRules({ answerTimerSeconds: s })} />
    </div>
  );
}

function TimerSetting({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const on = seconds > 0;
  const [text, setText] = useState(String(on ? seconds : 30));

  // Follow outside changes (quick picks, backup import).
  useEffect(() => {
    if (seconds > 0) setText(String(seconds));
  }, [seconds]);

  const n = /^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN;
  const error =
    on && !(Number.isInteger(n) && n >= TIMER_MIN && n <= TIMER_MAX)
      ? `Enter a whole number from ${TIMER_MIN} to ${TIMER_MAX}. The timer stays at ${seconds} seconds until then.`
      : null;

  const onText = (value: string) => {
    setText(value);
    const v = /^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN;
    if (Number.isInteger(v) && v >= TIMER_MIN && v <= TIMER_MAX) onChange(v);
  };

  return (
    <div className="panel flex flex-col gap-3 px-5 py-4">
      <h3 className="label-caps text-2xl">Answer timer</h3>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Answer timer</legend>
        <label className="flex cursor-pointer items-center gap-3 text-lg">
          <input
            type="radio"
            id="timer-off"
            name="timer-mode"
            checked={!on}
            onChange={() => onChange(0)}
            className="h-5 w-5 accent-oxblood"
          />
          Off — players can take as long as they need
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-lg">
          <input
            type="radio"
            id="timer-on"
            name="timer-mode"
            checked={on}
            onChange={() => {
              const v = Number.isInteger(n) && n >= TIMER_MIN && n <= TIMER_MAX ? n : 30;
              setText(String(v));
              onChange(v);
            }}
            className="h-5 w-5 accent-oxblood"
          />
          Time limit per question
        </label>
      </fieldset>

      {on && (
        <div className="flex flex-wrap items-end gap-3 pl-8">
          <div className="flex w-36 flex-col gap-1">
            <label htmlFor="timer-seconds" className="text-base font-semibold text-ink-soft">
              Seconds
            </label>
            <input
              id="timer-seconds"
              type="number"
              inputMode="numeric"
              min={TIMER_MIN}
              max={TIMER_MAX}
              step={1}
              value={text}
              aria-invalid={!!error}
              aria-describedby={error ? 'timer-seconds-error' : 'timer-seconds-hint'}
              onChange={(e) => onText(e.target.value)}
              className={`${inputClass} tabular`}
            />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick picks">
            {QUICK_PICKS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={seconds === s ? 'primary' : 'secondary'}
                aria-pressed={seconds === s}
                onClick={() => {
                  setText(String(s));
                  onChange(s);
                }}
              >
                {s} s
              </Button>
            ))}
          </div>
          {error ? (
            <p id="timer-seconds-error" className="w-full text-sm font-semibold text-oxblood">
              {error}
            </p>
          ) : (
            <p id="timer-seconds-hint" className="w-full text-sm text-ink-faint">
              {TIMER_MIN}–{TIMER_MAX} seconds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
