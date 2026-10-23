# Snakes and Ladders – Bible Edition

A classic snakes-and-ladders board game for the browser where every roll has to be earned: when the die lands, the player answers a Bible question tied to that number. A correct answer moves the token; a wrong one keeps it in place.

The seed questions are written in Cebuano and taken from the book *Mga Leksiyon nga Imong Makat-onan Gikan sa Bibliya* (jw.org). There are 48 of them, 8 per dice number, easier on 1 and harder on 6. Every question lists its lesson number and Bible reference, and `research/questions-ceb-sources.md` quotes the lesson sentence that proves each answer.

Built with React 18, TypeScript, Vite, Tailwind CSS, Framer Motion and Zustand. No backend: everything is saved in the browser.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # static site in dist/
```

Node 18 or newer.

## How to play

1. **New Game** on the start screen. Players, board and rules come from **Settings**.
2. The highlighted player clicks **Roll Dice** (or presses **R**).
3. A question for the rolled number appears. Type the answer and press **Enter** or **Submit**.
4. Correct: the token walks forward, climbs ladders and slides down snakes. Wrong: the token stays, and the correct answer is shown if that rule is on.
5. The first player to reach the last square wins.

A host can judge spoken answers with **Mark correct / Mark wrong**, or **Accept anyway** after a typo. A game in progress survives a page refresh; **Continue Game** picks it up.

## Settings

Open **Settings** (gear icon) before or between games. Everything saves automatically.

| Tab | What you can change |
|---|---|
| Players | 2–8 players: name, color, token emoji, order; random turn order at start |
| Questions | Add, edit, duplicate, delete; search and filter; import/export JSON or CSV; reset to the defaults |
| Board | 50, 64 or 100 squares; edit snakes and ladders (validated live); randomize; classic layout |
| Rules | Exact roll to finish (overshoot bounces back), show correct answer, extra turn on a 6, sound, typo tolerance, host buttons, answer timer |
| Backup | Export or import all settings as one JSON file |

Changes to players and the board apply to the next game; a running game keeps the setup it started with.

### Answer checking

Answers are compared after lowercasing, trimming, removing accents and punctuation, and dropping leading articles (English *the/a/an*, Cebuano *ang/si/sila/ni/kang/sa/mga*). So "Si Moises", "moises" and "MOISES." all match "Moises".

With **Allow small typos** on, each word may be off by one letter (6–9 letters) or two (10+ letters), as long as its first letter is right. Words of 5 letters or fewer and numbers must match exactly, because short names often differ by one letter (Maria / Marta). A number answer such as `40` also matches a reply that contains exactly that number ("40 ka adlaw").

## Editing questions

Each dice number (1–6) has its own pool. A rolled number picks a random question from its pool, with no repeats until the pool is used up. If a number has no questions, one is borrowed from another number.

### JSON import format

`questions.json` in this folder is a complete example (the built-in questions).

```json
{
  "version": 1,
  "questions": [
    {
      "id": "ceb-1-01",
      "diceNumber": 1,
      "question": "Kinsa ang gisugo ni Jehova nga maghimo ug dakong arka?",
      "acceptedAnswers": ["Noe", "Noah"],
      "reference": "Leksiyon 5 · Genesis 6:1-22",
      "difficulty": "easy",
      "explanation": "Gisugo ni Jehova si Noe nga maghimo ug arka aron maluwas siya ug ang iyang pamilya sa Lunop."
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `diceNumber` | yes | 1–6 |
| `question` | yes | Text shown to the player |
| `acceptedAnswers` | yes | List of answers that count as correct. A single string with `\|` separators also works |
| `id` | no | Generated when missing. Importing with **Merge** overwrites questions with the same id |
| `reference` | no | Shown after answering |
| `difficulty` | no | `easy`, `medium` or `hard` |
| `explanation` | no | Shown after answering |

A plain list `[ {...}, {...} ]` is accepted too.

### CSV import format

First row is the header. Columns can be in any order; `diceNumber`, `question` and `acceptedAnswers` are required. Separate multiple answers with `|`.

```csv
id,diceNumber,question,acceptedAnswers,reference,difficulty,explanation
ceb-1-01,1,Kinsa ang gisugo ni Jehova nga maghimo ug dakong arka?,Noe | Noah,Leksiyon 5 · Genesis 6:1-22,easy,
```

Rows with problems are listed by line number in the import preview and skipped.

## Deploy

`npm run build` writes a static site to `dist/` with relative paths, so it works from any folder.

- **Netlify:** build command `npm run build`, publish directory `dist`.
- **Vercel:** framework preset "Vite", output directory `dist`.
- **GitHub Pages:** run `npm run build` and publish the `dist/` folder (for example with the `actions/deploy-pages` workflow or by pushing `dist/` to a `gh-pages` branch).

### claude.ai Artifact

`npm run build:artifact` produces `artifact/index.html`: one self-contained page (JS and CSS inlined) in the shape claude.ai Artifacts expect. Inside an Artifact, file exports use the Artifact `downloads` capability; everywhere else they are normal browser downloads. Every export also has a **Copy** button.

## Project layout

```
src/
  types.ts               data models
  data/                  default questions, players, rules
  logic/                 pure game logic + tests (board, movement, answers, questions, turns, import/export)
  store/                 Zustand stores (settings, game, toasts, screens) with localStorage persistence
  lib/                   safe storage, WebAudio sounds, file save/copy helpers
  components/game/       board, snakes and ladders SVG, tokens, dice, sidebar, question modal, winner screen
  components/settings/   settings tabs
  components/ui/         modal, confirm dialog, buttons, fields
scripts/                 artifact build + questions.json generator
questions.json           sample import file (same as the built-in questions)
```

The built-in questions live in `src/data/questions.ceb.json`. After changing them, run `npx vite-node scripts/write-questions-json.mjs` to refresh `questions.json` (a test checks they match).
