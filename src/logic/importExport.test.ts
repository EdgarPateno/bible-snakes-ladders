import { describe, expect, it } from 'vitest';
import { parseCsv, parseQuestionsCsv, parseQuestionsJson, parseSettingsJson, questionsToCsv, questionsToJson, sanitizeSettings } from './importExport';
import { DEFAULT_SETTINGS } from '../data/defaults';
import sample from '../../questions.json';

describe('CSV', () => {
  it('parses quoted fields, commas and newlines', () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n"multi\nline",z')).toEqual([
      ['a', 'b'], ['x, y', 'say "hi"'], ['multi\nline', 'z'],
    ]);
  });
  it('round-trips questions through CSV', () => {
    const qs = DEFAULT_SETTINGS.questions.slice(0, 6);
    const back = parseQuestionsCsv(questionsToCsv(qs));
    expect(back.errors).toEqual([]);
    expect(back.questions).toEqual(qs);
  });
  it('reports bad rows with row numbers', () => {
    const csv = 'diceNumber,question,acceptedAnswers\n9,Who?,Moses\n2,,Aaron\n3,Who led?,Moses';
    const r = parseQuestionsCsv(csv);
    expect(r.questions).toHaveLength(1);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3]);
  });
});

describe('JSON', () => {
  it('round-trips questions through JSON', () => {
    const qs = DEFAULT_SETTINGS.questions;
    const r = parseQuestionsJson(questionsToJson(qs));
    expect(r.errors).toEqual([]);
    expect(r.questions).toEqual(qs);
  });
  it('accepts a bare array and fills missing ids', () => {
    const r = parseQuestionsJson(JSON.stringify([{ diceNumber: 1, question: 'Q?', acceptedAnswers: ['A'] }]));
    expect(r.errors).toEqual([]);
    expect(r.questions[0].id).toMatch(/.+/);
  });
  it('accepts acceptedAnswers as a pipe-separated string', () => {
    const r = parseQuestionsJson(JSON.stringify([{ diceNumber: 1, question: 'Q?', acceptedAnswers: 'A | B' }]));
    expect(r.questions[0].acceptedAnswers).toEqual(['A', 'B']);
  });
  it('rejects invalid JSON with a readable message', () => {
    const r = parseQuestionsJson('{nope');
    expect(r.questions).toEqual([]);
    expect(r.errors[0].message).toMatch(/JSON/);
  });
  it('the sample questions.json matches the built-in defaults', () => {
    const r = parseQuestionsJson(JSON.stringify(sample));
    expect(r.errors).toEqual([]);
    expect(r.questions).toEqual(DEFAULT_SETTINGS.questions);
  });
});

describe('parseSettingsJson', () => {
  it('round-trips the default settings', () => {
    const r = parseSettingsJson(JSON.stringify(DEFAULT_SETTINGS));
    expect(r.errors).toEqual([]);
    expect(r.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('rejects a board that fails validation', () => {
    const bad = { ...DEFAULT_SETTINGS, board: { size: 100, snakes: [{ id: 's', from: 10, to: 50 }], ladders: [] } };
    const r = parseSettingsJson(JSON.stringify(bad));
    expect(r.settings).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it('rejects fewer than 2 players', () => {
    const bad = { ...DEFAULT_SETTINGS, players: DEFAULT_SETTINGS.players.slice(0, 1) };
    expect(parseSettingsJson(JSON.stringify(bad)).settings).toBeNull();
  });
});

describe('player import safety', () => {
  it('gives duplicate player ids a fresh id and rejects non-hex colours', () => {
    const bad = {
      ...DEFAULT_SETTINGS,
      players: [
        { id: 'p1', name: 'A', color: 'red;background:url(http://x)', token: '⭐' },
        { id: 'p1', name: 'B', color: '#123abc', token: '🐑' },
      ],
    };
    const r = parseSettingsJson(JSON.stringify(bad));
    expect(r.errors).toEqual([]);
    const [a, b] = r.settings!.players;
    expect(a.id).not.toBe(b.id);
    expect(a.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(b.color).toBe('#123abc');
  });
});

describe('sanitizeSettings', () => {
  it('repairs each broken part on its own', () => {
    const s = sanitizeSettings({ players: 'nope', questions: DEFAULT_SETTINGS.questions.slice(0, 2), board: { size: 81 }, rules: { sound: false, answerTimerSeconds: 'x' } });
    expect(s.players).toEqual(DEFAULT_SETTINGS.players);
    expect(s.questions).toHaveLength(2);
    expect(s.board.size).toBe(100);
    expect(s.rules.sound).toBe(false);
    expect(s.rules.answerTimerSeconds).toBe(0);
  });
  it('survives garbage', () => {
    expect(() => sanitizeSettings(null)).not.toThrow();
    expect(() => sanitizeSettings({ board: { size: 100, snakes: 'x' } })).not.toThrow();
  });
});

describe('CSV safety', () => {
  it('keeps formula-looking cells as text and restores them on import', () => {
    const qs = [{ id: 'f', diceNumber: 1 as const, question: '=HYPERLINK("x")', acceptedAnswers: ['+1'] }];
    const csv = questionsToCsv(qs);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(parseQuestionsCsv(csv).questions).toEqual(qs);
  });
  it('rejects an answer with no letters or numbers', () => {
    const r = parseQuestionsJson(JSON.stringify([{ diceNumber: 1, question: 'Q?', acceptedAnswers: ['?'] }]));
    expect(r.questions).toEqual([]);
    expect(r.errors[0].message).toMatch(/nobody could type it/);
  });
});
