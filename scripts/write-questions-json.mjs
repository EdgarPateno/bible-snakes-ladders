// Regenerates questions.json from src/data/defaultQuestions.ts. Run: npx vite-node scripts/write-questions-json.mjs
import { writeFileSync } from 'node:fs';
import { DEFAULT_QUESTIONS } from '../src/data/defaultQuestions.ts';
writeFileSync(new URL('../questions.json', import.meta.url), JSON.stringify({ version: 1, questions: DEFAULT_QUESTIONS }, null, 2) + '\n');
console.log(`Wrote ${DEFAULT_QUESTIONS.length} questions to questions.json`);
