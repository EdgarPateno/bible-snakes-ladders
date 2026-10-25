# One-off (2026-10-25, review fixes for the per-lesson batch): rewords questions that gave away another
# question's answer or read badly, fixes answer lists the matcher got wrong, and drops weak or repeated
# questions (their rows are removed from research/questions-ceb-sources.md too).
# Run once from the repo root: python3 -I scripts/fix-questions-2026-10-25c.py
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'src' / 'data' / 'questions.ceb.json'
SOURCES = ROOT / 'research' / 'questions-ceb-sources.md'

REWORD = {
    # gave away another question's answer
    'ceb-1-07': 'Unsay ngalan sa unang babaye nga gihimo ni Jehova ingong asawa ni Adan?',
    'ceb-2-40': 'Kinsa ang daotang asawa ni Haring Ahab nga nagplano nga patyon ang tag-iya sa ubasan?',
    'ceb-3-31': 'Unsay gisugo ni Moises nga dad-on sa mga mirebelde ngadto sa tabernakulo?',
    'ceb-1-08': 'Kinsa ang gibisita sa usa ka anghel ug giingnan nga manganak siyag lalaki nga nganlan ug Jesus?',
    'ceb-4-64': 'Kinsa ang igsoong babaye nga nagdalidali sa pagsugat kang Jesus dihang miabot siya sa Betania human mamatay ang iyang igsoon?',
    'ceb-6-12': 'Sulod sa pila ka adlaw nahuman pagtukod pag-usab ang mga paril ug ganghaan sa Jerusalem?',
    'ceb-3-52': 'Unsang katungdanan sa Juda ang gihatag sa hari sa Persia sa tawo nga nagtukod pag-usab sa mga paril sa Jerusalem?',
    'ceb-1-50': 'Kinsa ang Israelinhong sulugoon sa hari sa Persia nga nangayo nga paadtoon siya sa Jerusalem aron tukoron pag-usab ang mga paril?',
    'ceb-5-57': 'Sa unsang bulana, petsa 14, saulogon sa mga Hudiyo kada tuig ang paghinumdom sa ilang pagkagawas sa Ehipto?',
    'ceb-6-26': 'Pila ka adlaw ang gihulat sa mga Israelinhon ayha nakigsulti si Jehova kanila gikan sa bukid?',
    'ceb-4-56': 'Samag unsa ang espiritu sa Diyos nga nanaog kang Jesus human sa iyang bawtismo?',
    # wording
    'ceb-2-58': 'Dihang gipakaon ni Jesus ang libolibo ka tawo, pila ka gagmayng isda ang naa uban sa mga tinapay?',
    'ceb-4-62': 'Pila ka basket ang napuno sa sobrang pagkaon human nabusog ang 5,000 ka lalaki?',
    'ceb-4-23': 'Pila ka anak nga lalaki si Jacob?',
    'ceb-6-64': 'Kinsa ang gobernador nga mihusay kang Pablo ug miingon: “Sa Cesar ka moadto”?',
    'ceb-5-39': 'Asang lugara nagmartsa ang katawhan ni Jehosapat gikan sa Jerusalem aron makiggubat?',
    'ceb-4-18': 'Asa gidapit ni Cain si Abel ayha niya kini gipatay?',
    'ceb-1-68': 'Unsay gisaad ni Jehova nga iyang pahiran gikan sa mata sa mga tawo?',
    'ceb-6-55': 'Kinsa ang amahan sa ikaduhang apostol nga ginganlag Santiago?',
}
ANSWERS = {
    'ceb-1-34': ['iyang bugtong anak nga babaye', 'anak nga babaye', 'daughter'],  # "iyang anak" let "anak nga lalaki" through
    'ceb-3-18': ['mamatay', 'mamatay sila', 'mangamatay', 'mangamatay sila', 'kamatayon', 'die', 'death'],
    'ceb-3-30': ['usa ka tuig', 'usa ra ka tuig', '1 ka tuig', '1', 'usa', 'uno', 'one'],
}
DROP = {
    'ceb-3-20',  # answer "bukid" accepted any mountain ("Bukid sa Sinai")
    'ceb-1-17', 'ceb-3-17',  # "which animal was the example": any animal fits
    'ceb-2-60', 'ceb-3-55',  # "Paskuwa" again (kept: ceb-3-10, ceb-2-44)
}

data = json.loads(DATA.read_text())
ids = {q['id'] for q in data['questions']}
missing = (set(REWORD) | set(ANSWERS) | DROP) - ids
assert not missing, missing
out = []
for q in data['questions']:
    if q['id'] in DROP:
        continue
    if q['id'] in REWORD:
        q['question'] = REWORD[q['id']]
    if q['id'] in ANSWERS:
        q['acceptedAnswers'] = ANSWERS[q['id']]
    # "apostoles" is plural; one person is an "apostol".
    q['question'] = q['question'].replace('Kinsa ang apostoles nga', 'Kinsa ang apostol nga')
    out.append(q)
data['questions'] = out
DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'research' / 'questions-ceb.json').write_text(DATA.read_text())

lines = SOURCES.read_text().splitlines()
kept = [l for l in lines if not any(l.startswith(f'| {d} |') for d in DROP)]
SOURCES.write_text('\n'.join(kept) + '\n')
print(f'OK: {len(out)} questions, dropped {len(DROP)}, reworded {len(REWORD)}, answers fixed {len(ANSWERS)}')
