"""Mărimea unei felii, pe bucăți: diferența gzip -9 dintre două build-uri (`dist/assets` al bazei și al feliei).

Bucățile se potrivesc după numele fără amprentă. Tipărește diferența totală pe JavaScript și pe CSS și bucățile care s-au
schimbat cel mai mult. Poarta mărimii rămâne `scripts/build-determinist.ts`; aici se vede doar unde a crescut felia.

Folosire (baza se construiește într-o clonă, de exemplu a lui origin/main; `dist/assets` al ei se copiază deoparte):
  python3 -B -X utf8 scripts/marime-bucati.py <assets-ul bazei> <assets-ul feliei>
"""
import gzip
import os
import re
import sys
from collections import defaultdict


def bucati(dosar):
    r = defaultdict(int)
    for f in os.listdir(dosar):
        m = re.match(r'^(.*)-[A-Za-z0-9_-]{8}\.(js|css)$', f)
        if not m:
            continue
        with open(os.path.join(dosar, f), 'rb') as h:
            r[(m.group(1), m.group(2))] += len(gzip.compress(h.read(), 9))
    return r


if len(sys.argv) != 3:
    raise SystemExit(__doc__)
baza, felia = bucati(sys.argv[1]), bucati(sys.argv[2])
for ext in ('js', 'css'):
    total, randuri = 0, []
    for k in sorted(set(baza) | set(felia)):
        if k[1] != ext:
            continue
        d = felia.get(k, 0) - baza.get(k, 0)
        total += d
        if d:
            randuri.append((d, k[0], k in baza, k in felia))
    print(f'{ext}: {total:+d} B gzip-9')
    for d, nume, in_baza, in_felie in sorted(randuri, key=lambda x: -abs(x[0]))[:15]:
        print(f'  {nume}: {d:+d}' + ('' if in_baza and in_felie else (' (nouă)' if in_felie else ' (scoasă)')))
