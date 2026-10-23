import { describe, expect, it } from 'vitest';
import { checkAnswer, levenshtein, normalizeAnswer } from './answerMatch';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

describe('normalizeAnswer', () => {
  it('lowercases, trims, strips punctuation and collapses spaces', () => {
    expect(normalizeAnswer('  Moses!! ')).toBe('moses');
    expect(normalizeAnswer("Noah's   Ark")).toBe('noahs ark');
    expect(normalizeAnswer('Jesus, of Nazareth.')).toBe('jesus of nazareth');
  });
  it('drops leading articles', () => {
    expect(normalizeAnswer('The Garden of Eden')).toBe('garden of eden');
    expect(normalizeAnswer('a dove')).toBe('dove');
    expect(normalizeAnswer('An angel')).toBe('angel');
  });
  it('drops leading Cebuano articles, also stacked', () => {
    expect(normalizeAnswer('Si Moises')).toBe('moises');
    expect(normalizeAnswer('Ang arka')).toBe('arka');
    expect(normalizeAnswer('ang mga Israelita')).toBe('israelita');
    expect(normalizeAnswer('Kang Abraham')).toBe('abraham');
  });
  it('keeps a lone article and articles inside the answer', () => {
    expect(normalizeAnswer('Si')).toBe('si');
    expect(normalizeAnswer('Anak sa Diyos')).toBe('anak sa diyos');
  });
  it('keeps articles that are part of a word', () => {
    expect(normalizeAnswer('Theophilus')).toBe('theophilus');
    expect(normalizeAnswer('Aaron')).toBe('aaron');
  });
  it('strips accents', () => {
    expect(normalizeAnswer('Élie')).toBe('elie');
  });
});

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('moses', 'moses')).toBe(0);
    expect(levenshtein('moses', 'mosess')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('checkAnswer', () => {
  const accepted = ['Moses', 'Prophet Moses'];

  it('accepts any accepted answer regardless of case and punctuation', () => {
    expect(checkAnswer('moses', accepted, false)).toBe(true);
    expect(checkAnswer('  PROPHET MOSES. ', accepted, false)).toBe(true);
    expect(checkAnswer('The Prophet Moses', accepted, false)).toBe(true);
  });
  it('rejects wrong or empty answers', () => {
    expect(checkAnswer('Aaron', accepted, false)).toBe(false);
    expect(checkAnswer('   ', accepted, false)).toBe(false);
    expect(checkAnswer('!!!', accepted, false)).toBe(false);
  });
  it('rejects typos when lenient matching is off', () => {
    expect(checkAnswer('Methusela', ['Methuselah'], false)).toBe(false);
  });
  it('allows 1 typo per word for 6-9 letters and 2 for 10+ when lenient', () => {
    expect(checkAnswer('Methusela', ['Methuselah'], true)).toBe(true);
    expect(checkAnswer('Zakarias', ['Zacarias'], true)).toBe(true);
    expect(checkAnswer('Nebuchadnezer', ['Nebuchadnezzar'], true)).toBe(true);
    expect(checkAnswer('Nebucadnezzar', ['Nebuchadnezzar'], true)).toBe(true);
    expect(checkAnswer('Nebcadnezer', ['Nebuchadnezzar'], true)).toBe(false);
    expect(checkAnswer('Pontius Pilat', ['Pontius Pilate'], true)).toBe(true);
  });
  it('requires an exact match for words of 5 letters or fewer even when lenient', () => {
    expect(checkAnswer('Ham', ['Ham'], true)).toBe(true);
    expect(checkAnswer('Hum', ['Ham'], true)).toBe(false);
    expect(checkAnswer('Mosis', ['Moses'], true)).toBe(false);
    expect(checkAnswer('Marta', ['Maria'], true)).toBe(false);
    expect(checkAnswer('pila', ['pula'], true)).toBe(false);
  });
  it('does not accept near-miss names that are different people', () => {
    expect(checkAnswer('langaw', ['bangaw'], true)).toBe(false);
    expect(checkAnswer('Haring Balaam', ['Balak', 'Haring Balak'], true)).toBe(false);
    expect(checkAnswer('Belshazzar', ['Beltesazar', 'Belteshazzar'], true)).toBe(false);
    expect(checkAnswer('Belsasar', ['Beltesazar', 'Belteshazzar'], true)).toBe(false);
  });
  it('matches hyphenated words typed without the hyphen', () => {
    expect(checkAnswer('kapatan', ['kap-atan'], false)).toBe(true);
  });
  it('accepts a reply that holds exactly the right number', () => {
    expect(checkAnswer('40 adlaw', ['40'], false)).toBe(true);
    expect(checkAnswer('3000 ka tawo', ['3000'], false)).toBe(true);
    expect(checkAnswer('3,000', ['3000'], false)).toBe(true);
    expect(checkAnswer('40 ka adlaw ug 40 ka gabii', ['40'], false)).toBe(true);
    expect(checkAnswer('40 o 50', ['40'], false)).toBe(false);
    expect(checkAnswer('9', ['99'], false)).toBe(false);
  });
  it('never fuzzes numbers', () => {
    expect(checkAnswer('9690', ['969'], true)).toBe(false);
    expect(checkAnswer('968', ['969'], true)).toBe(false);
  });
});

describe('built-in questions', () => {
  it('every accepted answer is answerable, with and without lenient matching', () => {
    for (const q of DEFAULT_QUESTIONS) {
      for (const a of q.acceptedAnswers) {
        expect(normalizeAnswer(a), `${q.id}: "${a}"`).not.toBe('');
        expect(checkAnswer(a, q.acceptedAnswers, false), `${q.id}: "${a}"`).toBe(true);
        expect(checkAnswer(a.toUpperCase() + '.', q.acceptedAnswers, true), `${q.id}: "${a}"`).toBe(true);
      }
    }
  });
});
