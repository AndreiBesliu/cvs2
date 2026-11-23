"""Banda cilindrică a unei elice LDraw, desfăcută, în ASCII: pe orizontală unghiul (s = r·θ, mm), pe verticală axa (mm),
pentru punctele suprafeței dintre r − 0,3 și r + 0,3. Arată forma secțiunii fiecărei palete (dreaptă, curbă, cu inel).
Folosire: python -I -B -X utf8 elice_desfasurata.py <dosarul bibliotecii> <piesa> <r> [<unghiul de la, °> <unghiul până la, °>]"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plat  # noqa: E402
from elice_masura import esantion  # noqa: E402

dosar, piesa, r = sys.argv[1], sys.argv[2], float(sys.argv[3])
a0 = float(sys.argv[4]) if len(sys.argv) > 4 else -180.0
a1 = float(sys.argv[5]) if len(sys.argv) > 5 else 180.0
tri = plat.in_mm(plat.triunghiuri(dosar, piesa + '.dat'))
cut = [(min(p[i] for t in tri for p in t), max(p[i] for t in tri for p in t)) for i in range(3)]
c0 = [(lo + hi) / 2 for lo, hi in cut]
P = []
for p in esantion(tri, random.Random(1)):
    a, b, h = p[0] - c0[0], p[1] - c0[1], p[2]
    rr = math.hypot(a, b)
    if abs(rr - r) < 0.3:
        th = math.degrees(math.atan2(b, a))
        if a0 <= th <= a1:
            P.append((r * math.radians(th), h))
W, H = 110, 26
s0, s1 = r * math.radians(a0), r * math.radians(a1)
h0, h1 = cut[2]
grila = [[' '] * W for _ in range(H)]
for s, h in P:
    x = int((s - s0) / (s1 - s0) * (W - 1))
    y = int((h1 - h) / (h1 - h0) * (H - 1))
    grila[y][x] = '#'
print(f'{piesa}, r = {r}: s de la {s0:.1f} la {s1:.1f} mm ({(s1 - s0) / (W - 1):.2f} mm / coloană), '
      f'axa de la {h1:.2f} (sus) la {h0:.2f} (jos) ({(h1 - h0) / (H - 1):.2f} mm / rând)')
for rand in grila:
    print('|' + ''.join(rand) + '|')
