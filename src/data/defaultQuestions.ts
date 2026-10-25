import type { Question } from '../types';
import data from './questions.ceb.json';

/**
 * Built-in questions, in Cebuano: about 4 per lesson (413), dice 1–2 easy, 3–4 medium, 5–6 hard.
 * Source: "Mga Leksiyon nga Imong Makat-onan Gikan sa Bibliya" (jw.org/ceb). research/questions-ceb-sources.md
 * lists the lesson sentence that proves every answer.
 * Keep questions.json at the repo root in sync (a test checks it): npx vite-node scripts/write-questions-json.mjs
 */
export const DEFAULT_QUESTIONS: Question[] = (data as { questions: Question[] }).questions;
