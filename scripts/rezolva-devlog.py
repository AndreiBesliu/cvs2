"""Rezolvă blocurile de conflict ale unui jurnal doar cu adăugări (DEVLOG.md): întâi partea lui HEAD, apoi cealaltă,
cu un rând gol între ele dacă partea lui HEAD nu se termină cu unul. Refuză blocurile cu bază (diff3) și marcajele
neîmperecheate. Folosire: python3 -X utf8 scripts/rezolva-devlog.py <fișier> (pe Windows, python)"""
import io
import re
import sys

cale = sys.argv[1]
t = io.open(cale, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in t else '\n'
BLOC = re.compile(r'^<<<<<<< [^\r\n]*\r?\n(.*?)^=======\r?\n(.*?)^>>>>>>> [^\r\n]*\r?\n', re.S | re.M)
n = 0


def inlocuieste(m):
    global n
    noi, lor = m.group(1), m.group(2)
    if '||||||| ' in noi:
        raise SystemExit('bloc cu bază (diff3): rezolvă de mână')
    n += 1
    sep = '' if noi.endswith(nl + nl) or noi == '' else nl
    return noi + sep + lor


rez = BLOC.sub(inlocuieste, t)
for marcaj in ('<<<<<<< ', '>>>>>>> ', '||||||| '):
    assert marcaj not in rez, f'marcaj rămas: {marcaj!r}'
assert not re.search(r'^=======\r?$', rez, re.M), 'separator rămas'
io.open(cale, 'w', encoding='utf-8', newline='').write(rez)
print(f'{cale}: {n} bloc(uri), ambele părți păstrate (întâi HEAD, apoi cealaltă), rândul de final: {nl!r}')
