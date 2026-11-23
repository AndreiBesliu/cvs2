"""Otrăvurile care erau bune la o revizie și sunt VOID în arborele de acum (docs/otravuri.md).

O felie care mută sau rescrie cod lasă fără țintă otrăvurile vechi ale acelui cod: ancora `vechi` nu mai apare exact o dată
în fișier. Unealta trece prin toate listele din `test/otravuri/` (citite din arbore, cu reorientările lor) și le arată doar
pe cele stricate între revizie și arbore: bune la BAZA, VOID acum. Cele VOID deja la bază (ale altor felii) nu apar.

Folosire, din rădăcina repo-ului (nu rulează nimic, doar citește):
  python3 -B -X utf8 scripts/otravuri-void-noi.py [BAZA]     # BAZA: implicit origin/main

Un VOID nou se mută pe codul nou (cu o notă în listă) sau se scoate împreună cu codul echivalent.
"""
import glob
import os
import runpy
import subprocess
import sys

BAZA = sys.argv[1] if len(sys.argv) > 1 else 'origin/main'
la_baza, acum = {}, {}


def text_acum(fis):
    if fis not in acum:
        try:
            with open(fis, encoding='utf-8') as f:
                acum[fis] = f.read()
        except FileNotFoundError:
            acum[fis] = None
    return acum[fis]


def text_la_baza(fis):
    if fis not in la_baza:
        r = subprocess.run(['git', 'show', f'{BAZA}:{fis}'], capture_output=True)
        la_baza[fis] = r.stdout.decode('utf-8') if r.returncode == 0 else None
    return la_baza[fis]


if subprocess.run(['git', 'rev-parse', '--verify', '--quiet', f'{BAZA}^{{commit}}'], capture_output=True).returncode != 0:
    raise SystemExit(f'revizia {BAZA} nu există')
noi = 0
for lista in sorted(glob.glob(os.path.join('test', 'otravuri', '*.py'))):
    try:
        otravuri = runpy.run_path(lista).get('O', [])
    except Exception as e:  # noqa: BLE001
        print(f'{lista}: nu se citește ({e})')
        continue
    for o in otravuri:
        b, a = text_la_baza(o['fis']), text_acum(o['fis'])
        if b is not None and b.count(o['vechi']) == 1 and (a is None or a.count(o['vechi']) != 1):
            noi += 1
            print(f"{lista}\t{o['id']}\t{o['fis']}\tacum apare de {0 if a is None else a.count(o['vechi'])} ori")
print(f'{noi} VOID noi față de {BAZA}')
