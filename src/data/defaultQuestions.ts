import type { Question } from '../types';
import data from './questions.ceb.json';

/**
 * Built-in questions, in Cebuano: 8 per dice number, easier on low numbers and harder on high ones.
 * Source: "Mga Leksiyon nga Imong Makat-onan Gikan sa Bibliya" (jw.org/ceb). research/questions-ceb-sources.md
 * lists the lesson sentence that proves every answer.
 * Keep questions.json at the repo root in sync (a test checks it): npx vite-node scripts/write-questions-json.mjs
 */
export const DEFAULT_QUESTIONS: Question[] = (data as { questions: Question[] }).questions;
