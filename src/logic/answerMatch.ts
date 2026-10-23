/**
 * Leading articles that never change the meaning of a typed answer:
 * English "the/a/an" and Cebuano "ang/si/sila/ni/kang/sa/mga" (also stacked, e.g. "ang mga").
 */
const LEADING_ARTICLES = /^(?:(?:the|a|an|ang|si|sila|ni|kang|sa|mga) )+(?=\S)/;

/** Lowercase, strip accents and punctuation, collapse spaces, drop leading articles. */
export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/(\d)[,.\s](?=\d{3}(?!\d))/g, '$1') // "3,000" / "3 000" → "3000"
    .replace(/['’‘`]/g, '')
    .replace(/(\p{L})-(?=\p{L})/gu, '$1') // "pag-ampo" → "pagampo", "kap-atan" → "kapatan"
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(LEADING_ARTICLES, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Typos allowed in one word of this length. Short words must be exact, because short names
 * differ by a single letter (Maria/Marta, pula/pila).
 */
export function allowedTypos(length: number): number {
  if (length <= 5) return 0;
  if (length <= 9) return 1;
  return 2;
}

/** One word typed with a small typo: same first letter, length within 1, edits within the allowance. */
function closeWord(given: string, expected: string): boolean {
  if (given === expected) return true;
  if (/\d/.test(given) || /\d/.test(expected)) return false;
  if (given[0] !== expected[0] || Math.abs(given.length - expected.length) > 1) return false;
  return levenshtein(given, expected) <= allowedTypos(expected.length);
}

/** Small words that carry no answer on their own (Cebuano and English). */
const STOPWORDS = new Set([
  'ang', 'sa', 'si', 'sila', 'ni', 'kang', 'nga', 'mga', 'ka', 'kay', 'na', 'pa', 'iyang', 'y', 'oo',
  'mao', 'siya', 'niya', 'iya', 'ilang', 'kini', 'kana', 'lang', 'ra', 'man', 'gyud', 'kaayo', 'didto', 'diha', 'sab', 'pud', 'usab',
  'the', 'a', 'an', 'of', 'to', 'in', 'is', 'was', 'it', 'yes',
]);

/** Words that join two guesses ("Noe o Moises"); only allowed when the answer itself uses them. */
const SEPARATORS = new Set(['o', 'or', 'kun', 'kon', 'ug', 'og', 'and']);
/** Words that flip the meaning ("dili pula"); only allowed when the answer itself uses them. */
const NEGATIONS = new Set(['dili', 'wala', 'ayaw', 'not', 'no', 'never']);

/** Number words and their values (Cebuano, Spanish-Cebuano, English). "napulog" is 10 + the next word. */
const NUMBER_VALUES: Record<string, number> = {
  usa: 1, duha: 2, tulo: 3, upat: 4, lima: 5, unom: 6, pito: 7, walo: 8, siyam: 9, napulo: 10, napulog: 10,
  kawhaan: 20, katloan: 30, kapatan: 40, kaliman: 50, kalimaan: 50, kanuman: 60, kaunoman: 60, kapitoan: 70,
  kawaloan: 80, kasiyaman: 90,
  uno: 1, dos: 2, tres: 3, kuwatro: 4, kwatro: 4, singko: 5, sais: 6, siyete: 7, otso: 8, nuwebe: 9, nuybe: 9, diyes: 10,
  onse: 11, dose: 12, trese: 13, katorse: 14, kinse: 15, baynte: 20, bente: 20, trenta: 30, kuwarenta: 40, kwarenta: 40,
  singkuwenta: 50, sesenta: 60, setenta: 70, otsenta: 80, nobenta: 90, nobentay: 90,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const HUNDREDS = new Set(['gatos', 'sientos', 'siyentos', 'hundred']);
const THOUSANDS = new Set(['libo', 'mil', 'thousand']);
/** Small words allowed inside a spelled number: "napulo ug duha", "upat ka gatos", "nobenta y nuwebe". */
const NUMBER_JOINERS = new Set(['ug', 'og', 'y', 'ka', 'and']);

/** Cebuano affixes a player may add or leave off around a root word. */
const PREFIXES = ['pagka', 'pagpaka', 'paka', 'pag', 'maka', 'naka', 'maga', 'naga', 'mag', 'nag', 'gina', 'ika', 'pa', 'ka', 'ma', 'na', 'gi', 'mi', 'ni', 'mo', 'ga', 'um'];
const SUFFIXES = ['hanon', 'anon', 'han', 'hon', 'non', 'ng', 'an', 'on', 'o'];
/** Verb prefixes that swap with each other on the same root (pag-ampo, nag-ampo, mag-ampo). */
const SWAP_PREFIXES = ['pagka', 'pag', 'nag', 'mag', 'maka', 'naka', 'maga', 'naga', 'gina'];

/** The words that matter in an answer. Falls back to all words if every word is a small one. */
export function keywords(normalized: string): string[] {
  const words = normalized.split(' ').filter(Boolean);
  const kept = words.filter((w) => !STOPWORDS.has(w));
  return kept.length ? kept : words;
}

const isDigits = (w: string) => /^\d+$/.test(w);
const isNumberToken = (w: string) => isDigits(w) || w in NUMBER_VALUES || HUNDREDS.has(w) || THOUSANDS.has(w);

/** With small typos allowed, "kuwarinta" reads as "kuwarenta". */
function asNumberToken(w: string, lenient: boolean): string {
  if (isNumberToken(w) || !lenient || w.length < 6) return w;
  return Object.keys(NUMBER_VALUES).find((n) => closeWord(w, n)) ?? w;
}

/**
 * Reads the numbers in a list of words, each run of number words as one value:
 * "napulo ug duha" → 12, "upat ka gatos ug kaliman" → 450, "40 ka adlaw ug 40 ka gabii" → 40, 40.
 * Returns the values and the indexes of the words that were part of a number.
 */
export function readNumbers(words: string[], lenient: boolean): { values: number[]; used: Set<number> } {
  const values: number[] = [];
  const used = new Set<number>();
  let total = 0;
  let current = 0;
  let inRun = false;
  let pending: number[] = [];
  const close = () => {
    if (inRun) values.push(total + current);
    total = 0;
    current = 0;
    inRun = false;
    pending = [];
  };
  words.forEach((raw, i) => {
    const w = asNumberToken(raw, lenient);
    if (isDigits(w) || w in NUMBER_VALUES) {
      current += isDigits(w) ? Number(w) : NUMBER_VALUES[w];
    } else if (HUNDREDS.has(w)) {
      current = (current || 1) * 100;
    } else if (THOUSANDS.has(w)) {
      total += (current || 1) * 1000;
      current = 0;
    } else if (inRun && NUMBER_JOINERS.has(w)) {
      pending.push(i);
      return;
    } else {
      close();
      return;
    }
    // A joiner only belongs to the number when another number word follows it.
    pending.forEach((p) => used.add(p));
    pending = [];
    used.add(i);
    inRun = true;
  });
  close();
  return { values, used };
}

/** True when `text` is made only of the given affixes, one after another (e.g. "pagkama" = pagka + ma). */
function isAffixChain(text: string, affixes: string[]): boolean {
  if (!text) return true;
  return affixes.some((a) => text.startsWith(a) && isAffixChain(text.slice(a.length), affixes));
}

function stripSwapPrefix(w: string): string {
  const p = SWAP_PREFIXES.find((x) => w.startsWith(x) && w.length - x.length >= 4);
  return p ? w.slice(p.length) : w;
}

/**
 * Same root: the longer word is the shorter one plus Cebuano prefixes and/or suffixes.
 * MAPAINUBSANON ⊂ PAGKAMAPAINUBSANON (pagka-), maayo ⊂ pagkamaayohon (pagka- … -hon), pula ⊂ pulang (-ng).
 * Bathsheba is not Sheba and Juana is not Juan, because "bath" and "a" are not affixes. A short root only
 * takes the -ng linker or a long suffix, so "Sans" is not "Sanson" and "Adanan" is not "Adan".
 */
function sameRoot(a: string, b: string): boolean {
  const ra = stripSwapPrefix(a);
  const rb = stripSwapPrefix(b);
  if ((ra !== a || rb !== b) && ra === rb) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length < 4) return false;
  for (let i = long.indexOf(short); i !== -1; i = long.indexOf(short, i + 1)) {
    const prefix = long.slice(0, i);
    const suffix = long.slice(i + short.length);
    const suffixOk = !suffix || suffix === 'ng' || short.length >= 6 || (short.length >= 5 && suffix.length >= 3);
    if (suffixOk && isAffixChain(prefix, PREFIXES) && isAffixChain(suffix, SUFFIXES)) return true;
  }
  return false;
}

/** A typed word hits a keyword: same word, same root (affixes added or left off), or a small typo when allowed. */
export function wordHits(given: string, keyword: string, lenient: boolean): boolean {
  if (given === keyword) return true;
  if (isNumberToken(given) || isNumberToken(keyword)) return false;
  return sameRoot(given, keyword) || (lenient && closeWord(given, keyword));
}

/**
 * How many words a reply may have beyond what it needs. Names must stand on their own ("Si Noe" yes,
 * "Noe Moises" no); other answers may carry one describing word ("dakong isda"); numbers may carry a
 * unit ("baynte ka pirasong silver"). Words repeated from the question never count as extra.
 */
function extraWordsAllowed(original: string, hasNumber: boolean): number {
  if (hasNumber) return 2;
  const t = original.trim();
  const isName = /^\p{Lu}/u.test(t) && t !== t.toUpperCase();
  return isName ? 0 : 1;
}

function hitsAnswer(given: string[], original: string, answer: string, lenient: boolean, questionWords: string[]): boolean {
  const answerSet = new Set(answer.split(' '));
  const answerNums = readNumbers(keywords(answer), lenient);
  const givenNums = readNumbers(given, lenient);
  // Numbers are compared by value: "napulo ug duha" = "napulog duha" = 12; "40 o 50" and "400" are not 40.
  const sameValues = (x: number[], y: number[]) => new Set(x).size === new Set(y).size && x.every((v) => y.includes(v));
  if ((answerNums.values.length || givenNums.values.length) && !sameValues(answerNums.values, givenNums.values)) return false;
  const words = given.filter((w, i) => !givenNums.used.has(i) && (!STOPWORDS.has(w) || SEPARATORS.has(w)));
  const answerWords = keywords(answer).filter((_, i) => !answerNums.used.has(i));
  // Negations and "or" between guesses only count when the answer itself uses them.
  if (words.some((w) => (NEGATIONS.has(w) || SEPARATORS.has(w)) && !answerSet.has(w))) return false;
  // Every keyword must be hit.
  if (!answerWords.every((k) => words.some((w) => wordHits(w, k, lenient)))) return false;
  const extras = words.filter(
    (w) => !answerWords.some((k) => wordHits(w, k, lenient)) && !questionWords.some((q) => wordHits(w, q, false)),
  ).length;
  return extras <= extraWordsAllowed(original, answerNums.values.length > 0);
}

/** A comma or slash between two real words means the player listed several guesses ("Maria, Marta"), not "Oo, si Noe". */
function isList(text: string): boolean {
  const parts = text.split(/(?<=\p{L})\s*[,/;]\s*(?=\p{L})/u);
  return parts.filter((p) => normalizeAnswer(p).split(' ').some((w) => w && !STOPWORDS.has(w))).length >= 2;
}

/**
 * Correct when the reply hits every keyword of one accepted answer. Case, accents, punctuation,
 * small words and Cebuano affixes don't matter; numbers are compared by value. Pass the question text
 * so words the player repeats from it ("Si Noe ang gisugo") don't count as extra words.
 */
export function checkAnswer(given: string, accepted: string[], lenient: boolean, questionText = ''): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  const givenWords = g.split(' ').filter((w) => !STOPWORDS.has(w) || SEPARATORS.has(w) || NUMBER_JOINERS.has(w));
  const questionWords = keywords(normalizeAnswer(questionText)).filter((w) => w.length >= 4);
  return accepted.some((original) => {
    const a = normalizeAnswer(original);
    if (!a) return false;
    if (g === a || g.replace(/ /g, '') === a.replace(/ /g, '')) return true;
    if (isList(given) && !isList(original)) return false;
    return hitsAnswer(givenWords.length ? givenWords : g.split(' '), original, a, lenient, questionWords);
  });
}
