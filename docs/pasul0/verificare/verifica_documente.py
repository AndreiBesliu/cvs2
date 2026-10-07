"""Verifică documentele pasului 0 față de surse, fără să le creadă pe cuvânt.

1. PORTARE.md: fiecare trimitere `fișier:a-b` la codul vechi există la d850c7b, iar funcțiile numite
   lângă ea se află chiar în acel interval de linii.
2. ADR-uri: fiecare număr din fiecare ADR apare în sursele din care ADR-ul spune că e scris
   (PLAN.md, LECTII.md, BRIEF.md, PORTARE.md, rapoartele Fazei 2). Un număr care nu apare nicăieri
   e un număr inventat.
3. Legăturile relative din ADR-uri și din PORTARE.md duc la fișiere care există.
"""
import io, os, re, subprocess, glob

REPO = os.environ.get('REPO_DOCS', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))
VECHI = os.environ.get('VECHI', r'C:\Users\besli\Desktop\MyWork\Apps\CNCVectorStudio')
COMMIT = 'd850c7b'

def git_show(path):
    r = subprocess.run(['git', '-C', VECHI, 'show', f'{COMMIT}:{path}'], capture_output=True)
    return r.stdout.decode('utf-8', 'replace') if r.returncode == 0 else None

portare = io.open(os.path.join(REPO, 'docs', 'PORTARE.md'), encoding='utf-8').read()

# ── 1. trimiterile la codul vechi ───────────────────────────────────────────────────────────────
print('1. Trimiterile din PORTARE.md la codul vechi (d850c7b):')
probleme = 0
for m in re.finditer(r'`((?:src|scripts|functions)/[\w./-]+?\.(?:ts|js))(?::(\d+)-(\d+))?`([^\n]*)', portare):
    cale, a, b, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    src = git_show(cale)
    if src is None:
        print(f'  ✗ {cale}: nu există la {COMMIT}'); probleme += 1; continue
    linii = src.split('\n')
    if not a:
        print(f'  ✓ {cale}: există ({len(linii) - (1 if linii[-1] == "" else 0)} linii)'); continue
    a, b = int(a), int(b)
    interval = '\n'.join(linii[a - 1:b])
    # funcțiile numite pe aceeași linie de text, după trimitere (în backticks, identificatori)
    nume = [n for n in re.findall(r'`([A-Za-z_]\w+)`', rest) if not n[0].isupper() or n.startswith('emit')]
    lipsa = [n for n in nume if not re.search(r'function\s+' + re.escape(n) + r'\b', interval)]
    if lipsa:
        print(f'  ✗ {cale}:{a}-{b}: lipsesc din interval: {", ".join(lipsa)}'); probleme += 1
    else:
        print(f'  ✓ {cale}:{a}-{b}' + (f' conține {", ".join(nume)}' if nume else ''))
# numărul de linii declarat: „(NNN de linii)” sau „(NNN)” imediat după o cale
for m in re.finditer(r'`((?:src|scripts|functions)/[\w./-]+?\.(?:ts|js))` \((\d+)(?: de linii)?[,)]', portare):
    cale, n = m.group(1), int(m.group(2))
    src = git_show(cale)
    real = src.count('\n') if src is not None else -1
    semn = '✓' if real == n else '✗'
    if real != n: probleme += 1
    print(f'  {semn} {cale}: declarat {n} de linii, real {real}')
print(f'  → {probleme} probleme')

# ── 2. numerele din ADR-uri ─────────────────────────────────────────────────────────────────────
surse = ''
for p in ['PLAN.md', 'LECTII.md', 'BRIEF.md', 'docs/PORTARE.md', 'CLAUDE.md']:
    surse += io.open(os.path.join(REPO, p), encoding='utf-8').read() + '\n'
for p in glob.glob(os.path.join(REPO, 'docs', 'faza2', '**', '*.md'), recursive=True):
    surse += io.open(p, encoding='utf-8').read() + '\n'

def forme(num):
    """Formele sub care un număr poate apărea în surse: 1,3 / 1.3; 2 440 / 2440."""
    f = {num, num.replace(',', '.'), num.replace('.', ','), num.replace('\u00a0', ' ')}
    f |= {x.replace(' ', '') for x in list(f)} | {x.replace(' ', '\u00a0') for x in list(f)}
    return f

print('\n2. Numerele din ADR-uri, căutate în surse:')
lipsuri = 0
for p in sorted(glob.glob(os.path.join(REPO, 'docs', 'adr', '0*.md'))):
    text = io.open(p, encoding='utf-8').read()
    corp = text.split('\n', 3)[3]          # fără titlu și fără linia de stare (numărul ADR-ului, data)
    corp = re.sub(r'\]\([^)]*\)', ']', corp)   # fără căile din legături
    corp = re.sub(r'ADR \d{4}', '', corp)
    nr = set(re.findall(r'(?<![\w.,])\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?(?:·10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)?', corp))
    nr = {n for n in nr if not re.fullmatch(r'[0-9]', n)}   # cifrele singure (1–9) apar oriunde
    absente = sorted(n for n in nr if not any(f in surse for f in forme(n)))
    nume = os.path.basename(p)
    if absente:
        lipsuri += len(absente)
        print(f'  ✗ {nume}: {", ".join(absente)}')
    else:
        print(f'  ✓ {nume}: {len(nr)} numere, toate în surse')
print(f'  → {lipsuri} numere fără sursă')

# ── 3. legăturile relative ──────────────────────────────────────────────────────────────────────
print('\n3. Legăturile relative:')
rupte = 0
for p in sorted(glob.glob(os.path.join(REPO, 'docs', 'adr', '*.md'))) + [os.path.join(REPO, 'docs', 'PORTARE.md')]:
    text = io.open(p, encoding='utf-8').read()
    for tinta in re.findall(r'\]\(([^)#\s]+)(?:#[^)]*)?\)', text):
        if tinta.startswith('http'):
            continue
        cale = os.path.normpath(os.path.join(os.path.dirname(p), tinta))
        if not os.path.exists(cale):
            rupte += 1
            print(f'  ✗ {os.path.basename(p)} → {tinta}')
print(f'  → {rupte} legături rupte')
