import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameState, Question, Rules } from '../../types';
import { checkAnswer } from '../../logic/answerMatch';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/Field';
import { playSound } from '../../lib/sound';
import { toast } from '../../store/toastStore';
import { useGame } from '../../store/gameStore';

interface QuestionModalProps {
  game: GameState;
  question: Question | null;
  rules: Rules;
}

/** Pause before the game goes on by itself; a wrong answer waits longer so the room can read the right one. */
const AUTO_CONTINUE_MS = { correct: 2500, skipped: 2500, wrong: 5000, timeout: 5000 } as const;
const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

/** Mount with key={turn + question id} so every question starts with an empty answer and a full timer. */
export function QuestionModal({ game, question, rules }: QuestionModalProps) {
  const answer = useGame((s) => s.answer);
  const continueAfterFeedback = useGame((s) => s.continueAfterFeedback);
  const [given, setGiven] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const secondsLeft = () =>
    Math.max(0, rules.answerTimerSeconds - Math.floor((Date.now() - (game.askedAt ?? Date.now())) / 1000));
  // Re-render once a second while the timer runs; the time left is always computed from askedAt.
  const [tick, setTick] = useState(0);
  const remaining = secondsLeft();
  const open = game.phase === 'question' || game.phase === 'feedback';
  const asking = game.phase === 'question';
  const player = game.players.find((p) => p.id === game.order[game.current]);
  const feedback = game.feedback;

  const resolve = (outcome: 'correct' | 'wrong' | 'timeout', byHost: boolean, text = given) => {
    if (!answer(outcome, text.trim(), byHost, rules.exactRollToFinish)) return;
    if (rules.sound) playSound(outcome === 'correct' ? 'correct' : 'wrong');
    if (outcome === 'correct') toast({ tone: 'success', title: 'Correct! ✅', body: `${player?.name} moves ${game.roll}.` });
    else toast({ tone: 'error', title: outcome === 'timeout' ? 'Time’s up ❌' : 'Wrong ❌', body: `${player?.name} stays in place.` });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !given.trim()) return;
    resolve(checkAnswer(given, question.acceptedAnswers, rules.lenientMatching, question.question) ? 'correct' : 'wrong', false);
  };

  // Answer timer.
  useEffect(() => {
    if (!asking || rules.answerTimerSeconds <= 0) return;
    if (remaining <= 0) {
      resolve('timeout', false);
      return;
    }
    if (rules.sound && tick > 0 && remaining <= 5) playSound('tick');
    const t = setTimeout(() => setTick((n) => n + 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asking, tick, rules.answerTimerSeconds]);

  // After a short pause the game goes on by itself: a correct answer moves the token, a wrong one passes
  // the turn. "Move now" / "Next player" skip the wait; a host "Accept anyway" restarts it.
  const outcome = asking ? undefined : feedback?.outcome;
  useEffect(() => {
    if (!outcome) return;
    const t = setTimeout(() => continueAfterFeedback(rules.extraTurnOnSix), AUTO_CONTINUE_MS[outcome]);
    return () => clearTimeout(t);
  }, [outcome, continueAfterFeedback, rules.extraTurnOnSix]);

  if (!player) return null;
  const correct = feedback?.outcome === 'correct';
  const timerOn = rules.answerTimerSeconds > 0;

  return (
    <Modal
      open={open}
      title={asking ? `Question for ${player.name}` : 'Answer result'}
      width="max-w-3xl"
      focusKey={`${game.phase}:${feedback?.outcome ?? ''}`}
    >
      <div className="relative">
        <div className="flex items-center gap-3 border-b border-walnut/20 px-6 py-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl shadow" style={{ background: player.color }} aria-hidden="true">
            {player.token}
          </span>
          <div className="min-w-0 flex-1">
            <p className="label-caps text-sm text-ink-faint">Question for</p>
            <p className="truncate text-2xl font-bold">{player.name}</p>
          </div>
          <div className="text-right">
            <p className="label-caps text-sm text-ink-faint">Rolled</p>
            <p className="font-board text-4xl font-bold leading-none text-oxblood">{game.roll}</p>
          </div>
        </div>

        {timerOn && asking && (
          <div className="h-2 bg-walnut/10" role="timer" aria-label={`${remaining} seconds left`}>
            <motion.div
              className={`h-full ${remaining <= 5 ? 'bg-oxblood' : 'bg-gilt'}`}
              initial={false}
              animate={{ width: `${(remaining / rules.answerTimerSeconds) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        )}

        <div className="px-6 py-5">
          {question ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {question.difficulty && (
                  <span className="label-caps rounded-full bg-olive/15 px-2.5 py-0.5 text-olive-dark">{DIFFICULTY_LABEL[question.difficulty]}</span>
                )}
                {timerOn && asking && (
                  <span className={`tabular ml-auto font-semibold ${remaining <= 5 ? 'text-oxblood' : 'text-ink-soft'}`}>{remaining}s left</span>
                )}
              </div>
              <h2 className="mt-2 text-[clamp(1.6rem,3.2vw,2.6rem)] font-semibold leading-snug">{question.question}</h2>
              {asking && question.hint && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    aria-expanded={hintOpen}
                    aria-controls="question-hint"
                    onClick={() => {
                      setHintOpen((v) => !v);
                      document.getElementById('answer-input')?.focus();
                    }}
                  >
                    <span aria-hidden="true">💡</span> Hint
                  </Button>
                  <p id="question-hint" aria-live="polite" className="text-lg text-ink-soft">
                    {hintOpen && (
                      <>
                        From <strong className="text-ink">{question.hint}</strong>
                      </>
                    )}
                  </p>
                </div>
              )}
            </>
          ) : (
            <h2 className="text-2xl font-semibold">There are no questions set up yet, so this roll counts automatically.</h2>
          )}

          {asking && question && (
            <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
              <label htmlFor="answer-input" className="sr-only">
                Your answer
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="answer-input"
                  data-autofocus
                  autoComplete="off"
                  maxLength={120}
                  autoCapitalize="off"
                  spellCheck={false}
                  value={given}
                  onChange={(e) => setGiven(e.target.value)}
                  placeholder="Type your answer…"
                  className={`${inputClass} flex-1 text-2xl`}
                />
                <Button type="submit" variant="primary" size="lg" disabled={!given.trim()}>
                  Submit
                </Button>
              </div>
              {rules.hostOverride && (
                <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-walnut/25 pt-3">
                  <span className="label-caps mr-auto text-sm text-ink-faint">Host</span>
                  <Button size="sm" onClick={() => resolve('correct', true)}>
                    <span aria-hidden="true">✅</span> Mark correct
                  </Button>
                  <Button size="sm" onClick={() => resolve('wrong', true)}>
                    <span aria-hidden="true">❌</span> Mark wrong
                  </Button>
                </div>
              )}
            </form>
          )}

          {!asking && feedback && (
            <div className="mt-4 flex flex-col gap-3">
              {feedback.outcome !== 'skipped' && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-2xl font-bold ${
                    correct ? 'bg-olive/15 text-olive-dark' : 'bg-oxblood/10 text-oxblood'
                  }`}
                  role="status"
                >
                  <span aria-hidden="true">{correct ? '✅' : '❌'}</span>
                  <span>
                    {correct ? 'Correct!' : feedback.outcome === 'timeout' ? 'Time’s up!' : 'Wrong'}
                    {feedback.byHost && <span className="ml-2 text-base font-semibold opacity-70">(host decision)</span>}
                  </span>
                </motion.div>
              )}
              {feedback.given && <p className="text-lg text-ink-soft">Answer given: “{feedback.given}”</p>}
              {question && !correct && rules.showCorrectAnswer && (
                <p className="text-xl">
                  Correct answer: <strong>{question.acceptedAnswers[0]}</strong>
                </p>
              )}
              {question?.explanation && (correct || rules.showCorrectAnswer) && <p className="text-lg text-ink-soft">{question.explanation}</p>}
              {question?.reference && (correct || rules.showCorrectAnswer) && <p className="label-caps text-base text-gilt">{question.reference}</p>}
              <p className="text-lg">
                {correct || feedback.outcome === 'skipped'
                  ? `${player.name} moves ${game.roll} ${game.roll === 1 ? 'square' : 'squares'}.`
                  : `${player.name} stays in place.`}
              </p>
              <div className="flex flex-wrap justify-end gap-3">
                {!correct && rules.hostOverride && feedback.outcome !== 'skipped' && (
                  <Button onClick={() => resolve('correct', true, feedback.given)}>Accept anyway</Button>
                )}
                <Button variant="primary" size="lg" data-autofocus onClick={() => continueAfterFeedback(rules.extraTurnOnSix)}>
                  {correct || feedback.outcome === 'skipped' ? 'Move now' : 'Next player'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
