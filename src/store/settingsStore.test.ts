import { describe, expect, it } from 'vitest';
import { useSettings } from './settingsStore';
import { safeStorage } from '../lib/storage';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { DEFAULT_SETTINGS } from '../data/defaults';

describe('saved settings from before 2026-10-25', () => {
  it('get the new built-in questions and hints once, keeping the host’s own question and edits', async () => {
    const old = DEFAULT_QUESTIONS.filter((q) => Number(q.id.split('-')[2]) <= 8).map(({ hint: _hint, ...q }) => q);
    old[0] = { ...old[0], question: 'Edited by host?' };
    const own = { id: 'q-own', diceNumber: 3, question: 'Host question?', acceptedAnswers: ['yes'] };
    const saved = { ...DEFAULT_SETTINGS, questions: [...old, own] };
    safeStorage.setItem('bsl:settings:v1', JSON.stringify({ state: saved, version: 1 }));

    await useSettings.persist.rehydrate();
    const { questions } = useSettings.getState();
    expect(questions).toHaveLength(DEFAULT_QUESTIONS.length + 1);
    expect(questions[0]).toMatchObject({ question: 'Edited by host?' });
    expect(questions[0].hint).toBeUndefined();
    expect(questions.filter((q) => q.hint)).toHaveLength(DEFAULT_QUESTIONS.length - 1);
    expect(questions.find((q) => q.id === 'q-own')).toMatchObject(own);
    expect(JSON.parse(safeStorage.getItem('bsl:settings:v1') as string).version).toBe(2);

    // A host who later deletes a new question does not get it back on the next load.
    useSettings.getState().deleteQuestion('ceb-6-16');
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().questions.some((q) => q.id === 'ceb-6-16')).toBe(false);
  });
});
