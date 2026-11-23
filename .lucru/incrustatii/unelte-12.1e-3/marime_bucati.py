"""Mărimea pe bucăți (gzip -9) a două build-uri, baza și felia, după numele fără hash: diferența totală pe JS și CSS și
bucățile care s-au schimbat."""
import gzip
import os
import re
import sys
from collections import defaultdict


def bucati(d):
    r = defaultdict(int)
    for f in os.listdir(d):
        m = re.match(r'^(.*)-[A-Za-z0-9_-]{8}\.(js|css)$', f)
        if not m:
            continue
        with open(os.path.join(d, f), 'rb') as h:
            r[(m.group(1), m.group(2))] += len(gzip.compress(h.read(), 9))
    return r


a, b = bucati(sys.argv[1]), bucati(sys.argv[2])
for ext in ('js', 'css'):
    total, randuri = 0, []
    for k in sorted(set(a) | set(b)):
        if k[1] != ext:
            continue
        d = b.get(k, 0) - a.get(k, 0)
        total += d
        if d:
            randuri.append((d, k[0], k in a, k in b))
    print(f'{ext}: {total:+d} B gzip-9')
    for d, nume, inA, inB in sorted(randuri, key=lambda x: -abs(x[0]))[:15]:
        print(f'  {nume}: {d:+d}' + ('' if inA and inB else (' (nouă)' if inB else ' (scoasă)')))
