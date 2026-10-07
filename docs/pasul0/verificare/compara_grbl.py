"""Compară textele erorilor și alarmelor GRBL din codul vechi cu CSV-urile oficiale din `gnea/grbl`.

CSV-urile sunt GPL-3.0, deci nu intră în repo: se descarcă într-un dosar temporar (vezi CITESTE.md).
"""
import csv, io, re, difflib, os, tempfile

P = os.environ.get('GRBL_CSV_DIR', tempfile.gettempdir())
VECHI = os.environ.get('VECHI', r'C:\Users\besli\Desktop\MyWork\Apps\CNCVectorStudio')
EN = os.path.join(VECHI, 'src', 'i18n', 'locales', 'en.ts')

def citeste_csv(nume):
    with io.open(os.path.join(P, nume), encoding='utf-8') as f:
        r = list(csv.reader(f))
    return {int(row[0]): row[2] for row in r[1:] if row and row[0].strip().isdigit()}

err = citeste_csv('grbl_err.csv')
alm = citeste_csv('grbl_alarm.csv')

src = io.open(EN, encoding='utf-8').read()
vechi = {}
for m in re.finditer(r"^\s*(err|alarm)(\d+): '((?:[^'\\]|\\.)*)',", src, re.M):
    vechi[(m.group(1), int(m.group(2)))] = m.group(3).replace("\\'", "'")

def norm(s):
    return re.sub(r'[^a-z0-9 ]+', ' ', s.lower()).split()

rez = []
for (tip, cod), text in sorted(vechi.items()):
    ref = (err if tip == 'err' else alm).get(cod)
    if ref is None:
        continue
    r = difflib.SequenceMatcher(None, norm(text), norm(ref)).ratio()
    rez.append((r, tip, cod, text, ref))

rez.sort(reverse=True)
n = len(rez)
prag = [0.9, 0.75, 0.5]
for p in prag:
    print(f'asemănare ≥ {p}: {sum(1 for x in rez if x[0] >= p)} din {n}')
print('--- cele mai apropiate 8 ---')
for r, tip, cod, text, ref in rez[:8]:
    print(f'{tip}{cod} ({r:.2f})\n  vechi: {text}\n  GRBL : {ref}')
