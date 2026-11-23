"""Aduce din biblioteca oficială LDraw piesele date și tot ce folosesc (subpiese și primitive), în dosarul dat, cu aceeași
structură ca biblioteca (parts/, parts/s/, p/, p/48/, p/8/). Doar text; plafonul de 6 MB opresc totul.
Folosire: python -I -B -X utf8 aduce.py <dosar> <piesa> [<piesa> ...]   (piesa fără `.dat`)."""
import os
import sys
import time
import urllib.error
import urllib.request

BAZA = 'https://library.ldraw.org/library/official/'
PLAFON = 6 * 1024 * 1024
dosar = sys.argv[1]
radacini = sys.argv[2:]
total = 0
aduse = {}


def candidati(ref):
    r = ref.replace('\\', '/').lower()
    if r.startswith('s/'):
        return ['parts/' + r]
    if r.startswith('48/') or r.startswith('8/'):
        return ['p/' + r]
    return ['parts/' + r, 'p/' + r]


def ia(cale):
    global total
    loc = os.path.join(dosar, *cale.split('/'))
    if os.path.exists(loc):
        with open(loc, encoding='utf-8', errors='replace') as f:
            return f.read()
    cerere = urllib.request.Request(BAZA + cale, headers={'User-Agent': 'cvs2-cote/1.0'})
    # biblioteca limitează cererile (429): una la 0,6 s, iar la 429 așteaptă cât cere serverul (cel mult 6 încercări)
    for incercare in range(6):
        time.sleep(0.6)
        try:
            with urllib.request.urlopen(cerere, timeout=30) as r:
                if not (r.headers.get('Content-Type') or '').startswith('text/plain'):
                    raise SystemExit(f'{cale}: nu e text ({r.headers.get("Content-Type")})')
                date = r.read()
            break
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429 and incercare < 5:
                time.sleep(float(e.headers.get('Retry-After') or 15))
                continue
            raise
    total += len(date)
    if total > PLAFON:
        raise SystemExit(f'plafonul de {PLAFON} octeți depășit la {cale}')
    os.makedirs(os.path.dirname(loc), exist_ok=True)
    with open(loc, 'wb') as f:
        f.write(date)
    return date.decode('utf-8', errors='replace')


def aduce(ref):
    if ref.lower() in aduse:
        return aduse[ref.lower()]
    for cale in candidati(ref):
        text = ia(cale)
        if text is not None:
            aduse[ref.lower()] = cale
            for linie in text.splitlines():
                p = linie.split()
                if len(p) >= 15 and p[0] == '1':
                    aduce(' '.join(p[14:]))
            return cale
    aduse[ref.lower()] = None
    print(f'lipsă: {ref}')
    return None


for r in radacini:
    cale = aduce(r + '.dat')
    if cale is None:
        print(f'{r}: nu există în biblioteca oficială')
        continue
    with open(os.path.join(dosar, *cale.split('/')), encoding='utf-8', errors='replace') as f:
        antet = f.read().splitlines()
    titlu = antet[0][2:].strip() if antet else ''
    lic = next((l[2:].strip() for l in antet if l.startswith('0 !LICENSE')), '(fără linie de licență)')
    print(f'{r}: {titlu} | {lic}')
print(f'fișiere: {sum(1 for v in aduse.values() if v)}, octeți aduși acum: {total}')
