"""Otrăvurile tuturor listelor care erau bune la bază (ancora exact o dată) și sunt VOID acum: doar ce s-a stricat între bază
și arborele de acum. Listele se citesc din arbore (cu reorientările lor)."""
import glob
import os
import runpy
import subprocess
import sys

R, BAZA = sys.argv[1], sys.argv[2]
cache_acum, cache_baza = {}, {}


def acum(fis):
    if fis not in cache_acum:
        try:
            cache_acum[fis] = open(f'{R}/{fis}', encoding='utf-8').read()
        except FileNotFoundError:
            cache_acum[fis] = None
    return cache_acum[fis]


def baza(fis):
    if fis not in cache_baza:
        r = subprocess.run(['git', '-C', R, 'show', f'{BAZA}:{fis}'], capture_output=True)
        cache_baza[fis] = r.stdout.decode('utf-8') if r.returncode == 0 else None
    return cache_baza[fis]


for lista in sorted(glob.glob(os.path.join(R, 'test', 'otravuri', '*.py'))):
    nume = os.path.basename(lista)
    try:
        O = runpy.run_path(lista).get('O', [])
    except Exception as e:  # noqa: BLE001
        print(nume, 'NU SE CITEȘTE', e)
        continue
    for o in O:
        b, a = baza(o['fis']), acum(o['fis'])
        if b is not None and b.count(o['vechi']) == 1 and (a is None or a.count(o['vechi']) != 1):
            print(nume, o['id'], o['fis'], 'acum', 0 if a is None else a.count(o['vechi']))
print('gata')
