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
    expect(checkAnswer('Methuzelah', ['Methuselah'], false)).toBe(false);
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
    expect(checkAnswer('40 ka adlaw', ['40'], false)).toBe(true);
    expect(checkAnswer('40 ka adlaw ug 40 ka gabii', ['40', '40 ka adlaw ug 40 ka gabii'], false)).toBe(true);
    expect(checkAnswer('40 o 50', ['40'], false)).toBe(false);
    expect(checkAnswer('9', ['99'], false)).toBe(false);
  });
  it('never fuzzes numbers', () => {
    expect(checkAnswer('9690', ['969'], true)).toBe(false);
    expect(checkAnswer('968', ['969'], true)).toBe(false);
  });
});

describe('keyword matching', () => {
  it('accepts the root of a word with a prefix or suffix, either way round', () => {
    expect(checkAnswer('MAPAINUBSANON', ['PAGKAMAPAINUBSANON'], false)).toBe(true);
    expect(checkAnswer('pagkamapainubsanon', ['mapainubsanon'], false)).toBe(true);
    expect(checkAnswer('Saulo', ['Saul'], false)).toBe(false); // short names only take -ng; list variants instead
    expect(checkAnswer('Saulo', ['Saul', 'Saulo'], false)).toBe(true);
    expect(checkAnswer('pulang pisi', ['pula'], false)).toBe(true);
  });
  it('accepts filler words around the answer, but a name must stand on its own', () => {
    expect(checkAnswer('Mao si Noe', ['Noe'], false)).toBe(true);
    expect(checkAnswer('Si Noe ang naghimo', ['Noe'], false)).toBe(false);
    expect(checkAnswer('dakong isda', ['isda'], false)).toBe(true);
    expect(checkAnswer('sa langob sa mga leyon', ['langob sa mga leyon'], false)).toBe(true);
  });
  it('needs every keyword of the answer', () => {
    expect(checkAnswer('langob', ['langob sa mga leyon'], false)).toBe(false);
    expect(checkAnswer('Juan nga Tigbawtismo', ['Juan nga Tigbawtismo'], false)).toBe(true);
  });
  it('does not stretch roots too far', () => {
    expect(checkAnswer('Ur', ['Uriah'], false)).toBe(false);
    expect(checkAnswer('Eva', ['Evangelio'], false)).toBe(false);
    expect(checkAnswer('pagka', ['pagkamapainubsanon'], false)).toBe(false);
    expect(checkAnswer('inubsanon', ['pagkamapainubsanon'], false)).toBe(true); // pagka + ma + pa
    expect(checkAnswer('sanon', ['pagkamapainubsanon'], false)).toBe(false);
  });
  it('rejects a list of guesses', () => {
    expect(checkAnswer('Noe Moises Abraham Jacob', ['Noe'], false)).toBe(false);
    expect(checkAnswer('Noe Moises', ['Noe'], false)).toBe(false);
    expect(checkAnswer('Noe o Moises', ['Noe'], true)).toBe(false);
    expect(checkAnswer('Ruth ug Naomi', ['Ruth', 'Rut'], true)).toBe(false);
    expect(checkAnswer('Maria o Marta', ['Maria'], true)).toBe(false);
    expect(checkAnswer('Maria, Marta', ['Maria'], true)).toBe(false);
    expect(checkAnswer('Maria/Marta', ['Maria'], true)).toBe(false);
    expect(checkAnswer('isda o balyena', ['isda'], true)).toBe(false);
  });
  it('rejects a negated answer', () => {
    expect(checkAnswer('dili pula', ['pula'], true)).toBe(false);
    expect(checkAnswer('wala mapainubsanon', ['PAGKAMAPAINUBSANON'], true)).toBe(false);
  });
  it('only treats real Cebuano affixes as the same root', () => {
    expect(checkAnswer('maayo', ['pagkamaayohon'], false)).toBe(true);
    expect(checkAnswer('painubsanon', ['PAGKAMAPAINUBSANON'], false)).toBe(true);
    expect(checkAnswer('haligi nga asin', ['haliging asin'], false)).toBe(true);
    expect(checkAnswer('Bathsheba', ['Sheba', 'Seba'], true)).toBe(false);
    expect(checkAnswer('Batseba', ['Sheba', 'Seba'], true)).toBe(false);
    expect(checkAnswer('Juana', ['Juan'], true)).toBe(false);
    expect(checkAnswer('basin', ['asin'], true)).toBe(false);
    expect(checkAnswer('Belte', ['Beltesazar'], true)).toBe(false);
    expect(checkAnswer('Joke', ['Jokebed'], true)).toBe(false);
    expect(checkAnswer('aria', ['Maria'], true)).toBe(false);
  });
  it('ignores hyphens and swapped verb prefixes', () => {
    expect(checkAnswer('nag-ampo', ['pag-ampo'], false)).toBe(true);
    expect(checkAnswer('ampo', ['pag-ampo'], false)).toBe(true);
    expect(checkAnswer('mapainubsanon', ['pagka-mapainubsanon'], false)).toBe(true);
    expect(checkAnswer('kalim-an', ['kaliman'], false)).toBe(true);
    expect(checkAnswer('Miriam', ['Mariam'], false)).toBe(false);
  });
  it('reads spelled-out numbers by value', () => {
    expect(checkAnswer('napulo ug duha', ['12'], false)).toBe(true);
    expect(checkAnswer('kasiyaman ug siyam', ['99'], false)).toBe(true);
    expect(checkAnswer('upat ka gatos ug kaliman', ['450'], false)).toBe(true);
    expect(checkAnswer('tulo ka libo', ['3000'], false)).toBe(true);
    expect(checkAnswer('nobenta y nuwebe', ['99'], false)).toBe(true);
    expect(checkAnswer('forty days', ['40'], false)).toBe(true);
    expect(checkAnswer('kuwarenta', ['40'], false)).toBe(true);
    expect(checkAnswer('kuwatro sientos', ['4'], false)).toBe(false);
    expect(checkAnswer('upat o lima', ['4'], false)).toBe(false);
    expect(checkAnswer('dili 40', ['40'], false)).toBe(false);
  });
  it('reads "usa ka" before a word as "a", not the number 1', () => {
    expect(checkAnswer('usa ka isda', ['isda'], false)).toBe(true);
    expect(checkAnswer('usa ka dakong isda', ['isda'], false)).toBe(true);
    expect(checkAnswer('usa ka libo', ['1000'], false)).toBe(true);
  });
  it('only joins number words by place value', () => {
    expect(checkAnswer('20 20', ['40'], false)).toBe(false);
    expect(checkAnswer('20 ug 20', ['40'], false)).toBe(false);
    expect(checkAnswer('upat (4)', ['4'], false)).toBe(true);
    expect(checkAnswer('dose (12)', ['12'], false)).toBe(true);
    expect(checkAnswer('kawhaan ug lima', ['25'], false)).toBe(true);
  });
  it('stays fast on a very long nonsense reply', () => {
    const t0 = Date.now();
    checkAnswer('paka'.repeat(25) + 'zbalangaw', ['balangaw'], true);
    checkAnswer('balangaw' + 'on'.repeat(32) + 'x', ['balangaw'], true);
    expect(Date.now() - t0).toBeLessThan(200);
  });
  it('does not count words repeated from the question as extra', () => {
    const q = 'Kinsa ang gisugo ni Jehova nga maghimo ug dakong arka?';
    expect(checkAnswer('Si Noe ang gisugo', ['Noe'], false, q)).toBe(true);
    expect(checkAnswer('Oo, si Noe', ['Noe'], false, q)).toBe(true);
    expect(checkAnswer('Noe Moises', ['Noe'], false, q)).toBe(false);
  });
  it('keeps short names from taking derivational endings', () => {
    expect(checkAnswer('Sans', ['Sanson', 'Samson'], true)).toBe(false);
    expect(checkAnswer('Jord', ['Jordan'], true)).toBe(false);
    expect(checkAnswer('Adanan', ['Adan'], true)).toBe(false);
  });
  it('lets spelled-out numbers carry a unit and a typo', () => {
    expect(checkAnswer('dose anyos', ['12', 'dose'], false)).toBe(true);
    expect(checkAnswer('baynte ka pirasong silver', ['20', 'baynte'], false)).toBe(true);
    expect(checkAnswer('kuwarinta', ['40', 'kuwarenta'], true)).toBe(true);
    expect(checkAnswer('kuwarinta', ['40', 'kuwarenta'], false)).toBe(false);
  });
  it('keeps numbers exact', () => {
    expect(checkAnswer('400 ka tawo', ['40'], false)).toBe(false);
    expect(checkAnswer('kap-atan', ['kapatan'], false)).toBe(true);
  });
  it('matches spelled-out numbers word for word in number questions', () => {
    const four = ['4', 'upat', 'kuwatro', 'upat ka tawo'];
    expect(checkAnswer('kuwatro sientos', four, true)).toBe(false);
    expect(checkAnswer('upat ka gatos', four, true)).toBe(false);
    expect(checkAnswer('Upat', four, true)).toBe(true);
    expect(checkAnswer('upat tawo', four, true)).toBe(true);
    expect(checkAnswer('4 ka tawo', four, true)).toBe(true);
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
