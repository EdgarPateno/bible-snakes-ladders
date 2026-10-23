import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/Field';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/toastStore';
import { uid } from '../../lib/random';
import { DICE_NUMBERS, type DiceNumber, type Difficulty, type Question } from '../../types';

interface QuestionEditorProps {
  /** null = a new question. */
  initial: Question | null;
  defaultDice?: DiceNumber;
  onClose: () => void;
}

type DifficultyChoice = Difficulty | 'none';

interface Errors {
  question?: string;
  answers?: string;
}

function splitAnswers(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const a = line.trim();
    if (a && !seen.has(a)) {
      seen.add(a);
      out.push(a);
    }
  }
  return out;
}

function validate(question: string, answers: string[]): Errors {
  const e: Errors = {};
  if (!question.trim()) e.question = 'Write the question.';
  if (answers.length === 0) e.answers = 'Add at least one accepted answer.';
  return e;
}

/** Add or edit one question. Mount it only while it is open, so its fields start fresh each time. */
export function QuestionEditor({ initial, defaultDice = 1, onClose }: QuestionEditorProps) {
  const upsertQuestion = useSettings((s) => s.upsertQuestion);
  const isNew = initial === null;
  const [dice, setDice] = useState<DiceNumber>(initial?.diceNumber ?? defaultDice);
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answersText, setAnswersText] = useState((initial?.acceptedAnswers ?? []).join('\n'));
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [difficulty, setDifficulty] = useState<DifficultyChoice>(initial?.difficulty ?? 'none');
  const [explanation, setExplanation] = useState(initial?.explanation ?? '');
  const [submitted, setSubmitted] = useState(false);

  const answers = splitAnswers(answersText);
  const errors = validate(question, answers);
  const shown: Errors = submitted ? errors : {};
  const title = isNew ? 'Add question' : 'Edit question';

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.question || errors.answers) {
      const firstBad = errors.question ? 'qe-question' : 'qe-answers';
      document.getElementById(firstBad)?.focus();
      return;
    }
    const q: Question = {
      id: initial?.id ?? uid('q'),
      diceNumber: dice,
      question: question.trim(),
      acceptedAnswers: answers,
    };
    if (reference.trim()) q.reference = reference.trim();
    if (difficulty !== 'none') q.difficulty = difficulty;
    if (explanation.trim()) q.explanation = explanation.trim();
    upsertQuestion(q);
    toast({ tone: 'success', title: isNew ? `Question added to ${dice}` : 'Question saved' });
    onClose();
  };

  return (
    <Modal open title={title} onClose={onClose} width="max-w-3xl">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="label-caps text-3xl text-oxblood">{title}</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-semibold text-ink-soft">Dice number (asked when this number is rolled)</legend>
          <div className="flex flex-wrap gap-2">
            {DICE_NUMBERS.map((n) => (
              <label
                key={n}
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border text-2xl font-semibold focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[#1f6fb2] ${
                  dice === n ? 'border-gilt bg-oxblood text-parchment-50' : 'border-walnut/40 bg-parchment-50 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="qe-dice"
                  id={`qe-dice-${n}`}
                  value={n}
                  checked={dice === n}
                  onChange={() => setDice(n)}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="qe-question" className="text-base font-semibold text-ink-soft">
            Question
          </label>
          <textarea
            id="qe-question"
            value={question}
            rows={3}
            data-autofocus
            aria-invalid={!!shown.question}
            aria-describedby={shown.question ? 'qe-question-error' : undefined}
            onChange={(e) => setQuestion(e.target.value)}
            className={`${inputClass} text-xl`}
          />
          {shown.question && (
            <span id="qe-question-error" className="text-sm font-semibold text-oxblood">
              {shown.question}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="qe-answers" className="text-base font-semibold text-ink-soft">
            Accepted answers — one per line
          </label>
          <textarea
            id="qe-answers"
            value={answersText}
            rows={3}
            aria-invalid={!!shown.answers}
            aria-describedby={shown.answers ? 'qe-answers-error' : 'qe-answers-hint'}
            onChange={(e) => setAnswersText(e.target.value)}
            className={`${inputClass} text-xl`}
          />
          {shown.answers ? (
            <span id="qe-answers-error" className="text-sm font-semibold text-oxblood">
              {shown.answers}
            </span>
          ) : (
            <span id="qe-answers-hint" className="text-sm text-ink-faint">
              Any line counts as correct. {answers.length > 0 && `${answers.length} accepted.`}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="qe-reference" className="text-base font-semibold text-ink-soft">
              Bible reference (optional)
            </label>
            <input
              id="qe-reference"
              type="text"
              value={reference}
              autoComplete="off"
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="qe-difficulty" className="text-base font-semibold text-ink-soft">
              Difficulty
            </label>
            <select
              id="qe-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyChoice)}
              className={inputClass}
            >
              <option value="none">None</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="qe-explanation" className="text-base font-semibold text-ink-soft">
            Explanation (optional, shown after answering)
          </label>
          <textarea
            id="qe-explanation"
            value={explanation}
            rows={3}
            onChange={(e) => setExplanation(e.target.value)}
            className={inputClass}
          />
        </div>

        {submitted && (errors.question || errors.answers) && (
          <p role="alert" className="text-base font-semibold text-oxblood">
            Fix the highlighted fields to save.
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {isNew ? 'Add question' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
