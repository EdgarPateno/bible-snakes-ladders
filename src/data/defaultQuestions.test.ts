import { describe, expect, it } from 'vitest';
import { DEFAULT_QUESTIONS } from './defaultQuestions';
import { checkAnswer } from '../logic/answerMatch';
import { DICE_NUMBERS } from '../types';

const byId = new Map(DEFAULT_QUESTIONS.map((q) => [q.id, q]));
const accepts = (id: string, typed: string) => {
  const q = byId.get(id)!;
  return checkAnswer(typed, q.acceptedAnswers, true, q.question);
};

describe('built-in questions', () => {
  it('has 16 per dice number, unique ids, and a lesson hint on every question', () => {
    for (const n of DICE_NUMBERS) expect(DEFAULT_QUESTIONS.filter((q) => q.diceNumber === n)).toHaveLength(16);
    expect(byId.size).toBe(DEFAULT_QUESTIONS.length);
    for (const q of DEFAULT_QUESTIONS) {
      expect(q.hint).toMatch(/^Leksiyon \d+ — \S/);
      expect(q.reference?.startsWith(q.hint!.split(' — ')[0] + ' ')).toBe(true);
    }
  });

  it('accepts what players would type for the new questions', () => {
    const typed: [string, string][] = [
      ['ceb-1-09', 'bitin'], ['ceb-1-10', 'si Abel'], ['ceb-1-11', 'haring saul'], ['ceb-1-12', 'Pedro'],
      ['ceb-1-13', 'pilato'], ['ceb-1-14', 'judas iskariote'], ['ceb-1-15', 'paraiso'], ['ceb-1-16', 'mga anghel'],
      ['ceb-2-09', 'dugo'], ['ceb-2-10', 'bulawang baka'], ['ceb-2-11', 'Samuel'], ['ceb-2-12', 'karnero'],
      ['ceb-2-13', 'ang adlaw'], ['ceb-2-14', 'mangingisda'], ['ceb-2-15', 'Amahan'], ['ceb-2-16', 'bulawan'],
      ['ceb-3-09', 'benjamin'], ['ceb-3-10', 'paskuwa'], ['ceb-3-11', 'bukid sa sinai'], ['ceb-3-12', 'aaron'],
      ['ceb-3-13', 'caleb'], ['ceb-3-14', 'ikatulo'], ['ceb-3-14', '3'], ['ceb-3-15', 'alpa'], ['ceb-3-16', 'eliseo'],
      ['ceb-4-09', 'otso'], ['ceb-4-09', '8'], ['ceb-4-10', 'kamelyo'], ['ceb-4-11', 'mga bato'], ['ceb-4-12', 'nag-ampo'],
      ['ceb-4-12', 'miampo'], ['ceb-4-13', 'mga langgam'], ['ceb-4-14', 'getsemane'], ['ceb-4-15', 'tuo'],
      ['ceb-4-16', 'olibo'], ['ceb-4-16', 'bukid sa mga olibo'],
      ['ceb-5-09', 'gosen'], ['ceb-5-10', 'kore'], ['ceb-5-11', '120'], ['ceb-5-12', 'jael'], ['ceb-5-13', 'mepiboset'],
      ['ceb-5-14', 'natan'], ['ceb-5-15', 'zarepta'], ['ceb-5-16', 'nabot'],
      ['ceb-6-09', '185,000'], ['ceb-6-09', '185000'], ['ceb-6-10', 'ebed-melek'], ['ceb-6-11', 'belsazar'],
      ['ceb-6-12', '52'], ['ceb-6-13', 'siloam'], ['ceb-6-14', 'emmaus'], ['ceb-6-15', 'gamaliel'], ['ceb-6-16', 'patmos'],
    ];
    for (const [id, answer] of typed) expect(accepts(id, answer), `${id} ← ${answer}`).toBe(true);
  });

  it('rejects wrong answers to the new questions', () => {
    const wrong: [string, string][] = [
      ['ceb-1-09', 'isda'], ['ceb-1-10', 'Cain'], ['ceb-1-11', 'David'], ['ceb-2-10', 'karnero'], ['ceb-3-14', '2'],
      ['ceb-4-09', '16'], ['ceb-4-15', 'wala'], ['ceb-5-11', '110'], ['ceb-6-09', '185'], ['ceb-6-12', '40'],
    ];
    for (const [id, answer] of wrong) expect(accepts(id, answer), `${id} ← ${answer}`).toBe(false);
  });
});
