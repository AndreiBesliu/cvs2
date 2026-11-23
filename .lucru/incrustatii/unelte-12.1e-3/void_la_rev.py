"""VOID-urile unei liste la o revizie dată (ancora `vechi` trebuie să apară exact o dată în fișier)."""
import runpy
import subprocess
import sys

R, LISTA, REV = sys.argv[1], sys.argv[2], sys.argv[3]
O = runpy.run_path(f'{R}/test/otravuri/{LISTA}').get('O', [])
cache = {}


def text(fis):
    if fis not in cache:
        r = subprocess.run(['git', '-C', R, 'show', f'{REV}:{fis}'], capture_output=True)
        cache[fis] = r.stdout.decode('utf-8') if r.returncode == 0 else None
    return cache[fis]


void = []
for o in O:
    oid, fis, vechi = o['id'], o['fis'], o['vechi']
    s = text(fis)
    if s is None or s.count(vechi) != 1:
        void.append(oid)
print(LISTA, REV, 'VOID:', ' '.join(void) if void else '-')
