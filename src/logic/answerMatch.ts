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

function numbersIn(s: string): string[] {
  return s.match(/\d+/g) ?? [];
}

export function checkAnswer(given: string, accepted: string[], lenient: boolean): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  const gWords = g.split(' ');
  const gNumbers = [...new Set(numbersIn(g))];
  return accepted.some((answer) => {
    const a = normalizeAnswer(answer);
    if (!a) return false;
    if (g === a || g.replace(/ /g, '') === a.replace(/ /g, '')) return true;
    // A number answer ("40") also matches a reply that holds exactly that number ("40 ka adlaw").
    if (/^\d+$/.test(a) && gNumbers.length === 1 && gNumbers[0] === a) return true;
    if (!lenient) return false;
    const aWords = a.split(' ');
    return aWords.length === gWords.length && aWords.every((w, i) => closeWord(gWords[i], w));
  });
}
