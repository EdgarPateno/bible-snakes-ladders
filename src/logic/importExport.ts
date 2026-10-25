import type { BoardConfig, DiceNumber, Difficulty, Jump, Player, Question, Rules, Settings } from '../types';
import { BOARD_SIZES } from '../types';
import { DEFAULT_RULES, DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, PLAYER_COLORS } from '../data/defaults';
import { classicLayout, validateBoard } from './board';
import { uid } from '../lib/random';
import { normalizeAnswer } from './answerMatch';

export interface ImportError {
  /** CSV line number (header = 1) or 1-based position in a JSON list. */
  row: number;
  message: string;
}

export interface QuestionsImport {
  questions: Question[];
  errors: ImportError[];
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const CSV_COLUMNS = ['id', 'diceNumber', 'question', 'acceptedAnswers', 'reference', 'difficulty', 'explanation', 'hint'] as const;

// ---------- CSV primitives ----------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Spreadsheets run cells that start with = + - @ as formulas; a leading apostrophe keeps them as text. */
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(raw: string): string {
  const value = FORMULA_START.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function uncell(value: string): string {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value;
}

// ---------- question normalizing ----------

function cleanString(v: unknown): string | undefined {
  if (typeof v !== 'string' && typeof v !== 'number') return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

function toAnswers(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split('|') : [];
  return list.map((a) => (typeof a === 'string' || typeof a === 'number' ? String(a).trim() : '')).filter(Boolean);
}

/** Turn loose input (from JSON or CSV) into a Question, or explain what is wrong. */
export function normalizeQuestion(raw: unknown): { question?: Question; error?: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Not a question object.' };
  const r = raw as Record<string, unknown>;
  const dice = Number(r.diceNumber);
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) return { error: 'diceNumber must be a whole number from 1 to 6.' };
  const text = cleanString(r.question)?.slice(0, 500);
  if (!text) return { error: 'The question text is empty.' };
  const acceptedAnswers = toAnswers(r.acceptedAnswers).slice(0, 30);
  if (acceptedAnswers.length === 0) return { error: 'Add at least one accepted answer.' };
  const blank = acceptedAnswers.find((a) => !normalizeAnswer(a));
  if (blank) return { error: `The answer "${blank}" has no letters or numbers, so nobody could type it.` };
  const difficultyRaw = cleanString(r.difficulty)?.toLowerCase();
  if (difficultyRaw && !DIFFICULTIES.includes(difficultyRaw as Difficulty)) {
    return { error: 'difficulty must be easy, medium or hard (or left empty).' };
  }
  const q: Question = {
    id: cleanString(r.id) ?? uid('q'),
    diceNumber: dice as DiceNumber,
    question: text,
    acceptedAnswers,
  };
  const reference = cleanString(r.reference);
  const explanation = cleanString(r.explanation);
  const hint = cleanString(r.hint)?.slice(0, 200);
  if (reference) q.reference = reference;
  if (difficultyRaw) q.difficulty = difficultyRaw as Difficulty;
  if (explanation) q.explanation = explanation;
  if (hint) q.hint = hint;
  return { question: q };
}

/** Give duplicate ids a fresh one so every question stays editable on its own. */
function dedupeIds(questions: Question[]): Question[] {
  const seen = new Set<string>();
  return questions.map((q) => {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      return q;
    }
    const id = uid('q');
    seen.add(id);
    return { ...q, id };
  });
}

// ---------- questions: CSV ----------

export function questionsToCsv(questions: Question[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const q of questions) {
    const values = [
      q.id,
      String(q.diceNumber),
      q.question,
      q.acceptedAnswers.join(' | '),
      q.reference ?? '',
      q.difficulty ?? '',
      q.explanation ?? '',
      q.hint ?? '',
    ];
    lines.push(values.map(csvCell).join(','));
  }
  return lines.join('\n') + '\n';
}

export function parseQuestionsCsv(text: string): QuestionsImport {
  const rows = parseCsv(text);
  if (rows.length === 0) return { questions: [], errors: [{ row: 1, message: 'The file is empty.' }] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const missing = ['diceNumber', 'question', 'acceptedAnswers'].filter((c) => col(c) === -1);
  if (missing.length) {
    return { questions: [], errors: [{ row: 1, message: `Missing column(s): ${missing.join(', ')}.` }] };
  }
  const questions: Question[] = [];
  const errors: ImportError[] = [];
  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    if (cells.every((c) => c.trim() === '')) return;
    const raw: Record<string, string> = {};
    for (const name of CSV_COLUMNS) {
      const idx = col(name);
      if (idx !== -1) raw[name] = uncell(cells[idx] ?? '');
    }
    const r = normalizeQuestion(raw);
    if (r.question) questions.push(r.question);
    else errors.push({ row: line, message: r.error ?? 'Invalid row.' });
  });
  return { questions: dedupeIds(questions), errors };
}

// ---------- questions: JSON ----------

export function questionsToJson(questions: Question[]): string {
  return JSON.stringify({ version: 1, questions }, null, 2) + '\n';
}

export function parseQuestionsJson(text: string): QuestionsImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { questions: [], errors: [{ row: 0, message: 'This is not valid JSON. Check for a missing comma or quote.' }] };
  }
  const list = Array.isArray(data) ? data : (data as { questions?: unknown })?.questions;
  if (!Array.isArray(list)) {
    return { questions: [], errors: [{ row: 0, message: 'Expected a list of questions, or an object with a "questions" list.' }] };
  }
  const questions: Question[] = [];
  const errors: ImportError[] = [];
  list.forEach((raw, i) => {
    const r = normalizeQuestion(raw);
    if (r.question) questions.push(r.question);
    else errors.push({ row: i + 1, message: r.error ?? 'Invalid question.' });
  });
  return { questions: dedupeIds(questions), errors };
}

// ---------- full settings ----------

export function settingsToJson(settings: Settings): string {
  return JSON.stringify(settings, null, 2) + '\n';
}

function parsePlayers(v: unknown, errors: ImportError[]): Player[] {
  if (!Array.isArray(v)) {
    errors.push({ row: 0, message: 'players must be a list.' });
    return [];
  }
  const players: Player[] = [];
  const ids = new Set<string>();
  v.forEach((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = cleanString(r.name)?.slice(0, 40);
    if (!name) {
      errors.push({ row: i + 1, message: `Player ${i + 1} has no name.` });
      return;
    }
    // Every player needs their own id, or two tokens would share one position.
    let id = cleanString(r.id) ?? uid('p');
    if (ids.has(id)) id = uid('p');
    ids.add(id);
    const color = cleanString(r.color);
    const token = cleanString(r.token);
    players.push({
      id,
      name,
      // Only plain hex colours: the value ends up inside an inline CSS gradient.
      color: color && /^#[0-9a-f]{6}$/i.test(color) ? color : PLAYER_COLORS[i % PLAYER_COLORS.length],
      token: token && token.length <= 12 ? token : '⭐',
    });
  });
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    errors.push({ row: 0, message: `A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players.` });
  }
  return players;
}

function parseJumps(v: unknown, seen: Set<string>): Jump[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 60).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    let id = cleanString(r.id) ?? uid('j');
    if (seen.has(id)) id = uid('j');
    seen.add(id);
    return { id, from: Number(r.from), to: Number(r.to) };
  });
}

function parseBoard(v: unknown, errors: ImportError[]): BoardConfig | null {
  const b = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const size = Number(b.size);
  if (!BOARD_SIZES.includes(size as BoardConfig['size'])) {
    errors.push({ row: 0, message: 'Board size must be 50, 64 or 100.' });
    return null;
  }
  const seen = new Set<string>();
  const board: BoardConfig = { size: size as BoardConfig['size'], snakes: parseJumps(b.snakes, seen), ladders: parseJumps(b.ladders, seen) };
  const problems = validateBoard(board);
  errors.push(...problems.map((e) => ({ row: 0, message: e.message })));
  return problems.length ? null : board;
}

function parseRules(v: unknown): Rules {
  const r = (v ?? {}) as Record<string, unknown>;
  const out: Rules = { ...DEFAULT_RULES };
  for (const key of Object.keys(DEFAULT_RULES) as (keyof Rules)[]) {
    const val = r[key];
    if (key === 'answerTimerSeconds') {
      const n = Number(val);
      if (Number.isFinite(n) && n >= 0) out.answerTimerSeconds = Math.min(300, Math.round(n));
    } else if (typeof val === 'boolean') {
      out[key] = val;
    }
  }
  return out;
}

export function parseSettingsJson(text: string): { settings: Settings | null; errors: ImportError[] } {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { settings: null, errors: [{ row: 0, message: 'This is not valid JSON. Check for a missing comma or quote.' }] };
  }
  if (!data || typeof data !== 'object') return { settings: null, errors: [{ row: 0, message: 'Expected a settings object.' }] };
  const errors: ImportError[] = [];
  const players = parsePlayers(data.players, errors);
  const q = parseQuestionsJson(JSON.stringify(data.questions ?? []));
  errors.push(...q.errors.map((e) => ({ ...e, message: `Question ${e.row}: ${e.message}` })));

  const board = parseBoard(data.board, errors);
  if (errors.length || !board) return { settings: null, errors };
  return { settings: { version: 1, players, questions: q.questions, board, rules: parseRules(data.rules) }, errors: [] };
}

/**
 * Repair settings read back from storage: each part (players, questions, board, rules) is checked on its own
 * and falls back to the default when it is broken, so one bad value never blanks the app.
 */
export function sanitizeSettings(raw: unknown): Settings {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const playerErrors: ImportError[] = [];
  const players = parsePlayers(d.players, playerErrors);
  const questions = Array.isArray(d.questions) ? parseQuestionsJson(JSON.stringify(d.questions)).questions : DEFAULT_SETTINGS.questions;
  const board = parseBoard(d.board, []) ?? classicLayout(100);
  return {
    version: 1,
    players: playerErrors.length ? DEFAULT_SETTINGS.players : players,
    questions,
    board,
    rules: parseRules(d.rules),
  };
}
