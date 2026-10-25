# One-off (2026-10-25, second batch): merges questions written per lesson (JSON files given as arguments)
# into src/data/questions.ceb.json. Checks every proof verbatim against research/leksiyon-2026-10-25/B<N>.txt,
# drops exact duplicates, gives each a dice number by difficulty (easy 1-2, medium 3-4, hard 5-6, alternating),
# ids from ceb-<dice>-17 up, the lesson hint (number only when the title names the answer) and appends the
# proofs to research/questions-ceb-sources.md.
# Run from the repo root: python3 -I scripts/merge-leksiyon-questions-2026-10-25b.py new-0.json new-1.json ...
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'research' / 'leksiyon-2026-10-25'
DATA = ROOT / 'src' / 'data' / 'questions.ceb.json'
SOURCES = ROOT / 'research' / 'questions-ceb-sources.md'
BAND = {'easy': (1, 2), 'medium': (3, 4), 'hard': (5, 6)}

toc = {}
for line in (RAW / 'toc.txt').read_text().splitlines():
    n, title, url = line.split('|')
    toc[int(n)] = (title.strip(), url.strip())


def fold(text):
    return ' ' + ' '.join(re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', text.lower()).encode('ascii', 'ignore').decode()).split()) + ' '


def hint(n, answers):
    title = toc[n][0]
    gives_away = any(len(fold(a).strip()) > 2 and fold(a) in fold(title) for a in answers)
    return f'Leksiyon {n}' if gives_away else f'Leksiyon {n} — {title}'


data = json.loads(DATA.read_text())
current = [q for q in data['questions'] if int(q['id'].split('-')[2]) <= 16]
seen_text = {fold(q['question']) for q in current}
incoming = [q for f in sys.argv[1:] for q in json.loads(Path(f).read_text())]

problems, fresh, rows = [], [], []
counts = {d: 0 for d in range(1, 7)}
for q in incoming:
    n = int(q['lesson'])
    page = re.sub(r'\s+', ' ', (RAW / f'B{n}.txt').read_text())
    for part in q['proof'].split(' … '):
        if re.sub(r'\s+', ' ', part) not in page:
            problems.append(f'L{n} proof not verbatim: {part[:70]!r}')
    if q['difficulty'] not in BAND:
        problems.append(f'L{n} bad difficulty {q["difficulty"]!r}')
        continue
    key = fold(q['question'])
    if key in seen_text:
        problems.append(f'L{n} duplicate question: {q["question"][:70]!r}')
        continue
    seen_text.add(key)
    a, b = BAND[q['difficulty']]
    dice = a if counts[a] <= counts[b] else b
    counts[dice] += 1
    fresh.append((dice, n, q))

if problems:
    print('\n'.join(problems))
    sys.exit(1)

next_no = {d: 17 for d in range(1, 7)}
added = []
for dice, n, q in fresh:
    qid = f'ceb-{dice}-{next_no[dice]:02d}'
    next_no[dice] += 1
    added.append({'id': qid, 'diceNumber': dice, 'difficulty': q['difficulty'], 'question': q['question'].strip(),
                  'acceptedAnswers': q['acceptedAnswers'], 'reference': f'Leksiyon {n} · {q["bibleRef"].strip()}',
                  'hint': hint(n, q['acceptedAnswers']), 'explanation': q['explanation'].strip()})
    title, url = toc[n]
    rows.append(f'| {qid} | Leksiyon {n} — {title} | {url} | {q["proof"]} |')

merged = sorted(current + added, key=lambda q: (q['diceNumber'], int(q['id'].split('-')[2])))
DATA.write_text(json.dumps({'version': 1, 'questions': merged}, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'research' / 'questions-ceb.json').write_text(DATA.read_text())

src = SOURCES.read_text()
marker = '\n## Added 2026-10-25 (second batch)\n'
if marker in src:
    src = src[:src.index(marker)]
src = src.rstrip('\n') + '\n' + marker + '\nWritten per lesson from the saved lesson text in research/leksiyon-2026-10-25/ (all 103 lessons), about 4 questions per lesson in total.\n\n| id | Lesson | URL | Proof (verbatim) |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n'
SOURCES.write_text(src)
print(f'OK: {len(merged)} questions ({len(added)} new); per dice', {d: sum(1 for q in merged if q["diceNumber"] == d) for d in range(1, 7)})
