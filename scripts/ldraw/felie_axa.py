"""Felia unei piese LDraw cu planul <axa> = c (X, Y sau Z), în mm: segmentele de intersecție în celelalte două coordonate,
desenate mărit într-un SVG; cu --text, contururile închise refăcute din segmente (numărul punctelor, cutia, aria cu semn,
centrul, raza medie față de centru) — de aici găurile (cercuri: centrul și raza) și profilul.
Folosire: python -I -B -X utf8 felie_axa.py <dosarul bibliotecii> <piesa> <ieșire.svg> --axa X --c 0 [--text]
Coordonatele desenate: pentru X, (Y, Z); pentru Y, (X, Z); pentru Z, (X, Y)."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plat  # noqa: E402
from felie import contururi, felie  # noqa: E402

args = sys.argv[1:]
dosar, piesa, iesire = args[0], args[1], args[2]
axa = args[args.index('--axa') + 1].upper() if '--axa' in args else 'Z'
c = float(args[args.index('--c') + 1]) if '--c' in args else 0.0
k = 'XYZ'.index(axa)
celelalte = [i for i in range(3) if i != k]
tri = plat.in_mm(plat.triunghiuri(dosar, piesa + '.dat'))
# coordonatele permutate: celelalte două întâi, axa feliei a treia (felie() taie pe a treia)
perm = [[(p[celelalte[0]], p[celelalte[1]], p[k]) for p in t] for t in tri]
seg = felie(perm, c)
if not seg:
    print(f'{piesa}: nicio intersecție la {axa} = {c}')
    sys.exit(0)
xs = [p[0] for s in seg for p in s]
ys = [p[1] for s in seg for p in s]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
S, M = 24, 30
W, H = (x1 - x0) * S + 2 * M, (y1 - y0) * S + 2 * M
X = lambda x: M + (x - x0) * S  # noqa: E731
Y = lambda y: M + (y1 - y) * S  # noqa: E731
linii = ''.join(f'<line x1="{X(a[0]):.1f}" y1="{Y(a[1]):.1f}" x2="{X(b[0]):.1f}" y2="{Y(b[1]):.1f}" stroke="#2a5bd7" stroke-width="1.4"/>'
                for a, b in seg)
grila = ''
for g in range(math.floor(x0), math.ceil(x1) + 1):
    grila += f'<line x1="{X(g)}" y1="{M}" x2="{X(g)}" y2="{H - M}" stroke="{"#ccc" if g % 4 == 0 else "#eee"}"/>'
for g in range(math.floor(y0), math.ceil(y1) + 1):
    grila += f'<line x1="{M}" y1="{Y(g)}" x2="{W - M}" y2="{Y(g)}" stroke="{"#ccc" if g % 4 == 0 else "#eee"}"/>'
nume = 'XYZ'
titlu = f'{piesa}, felia {axa} = {c} mm: orizontal {nume[celelalte[0]]}, vertical {nume[celelalte[1]]} (grila 1 mm, 4 mm mai închis)'
with open(iesire, 'w', encoding='utf-8') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H + 20:.0f}" style="background:#fff;font-family:sans-serif">'
            f'<text x="{M}" y="18" font-size="13">{titlu}</text><g transform="translate(0 20)">{grila}{linii}</g></svg>')
print(f'{piesa}: {len(seg)} segmente la {axa} = {c}; cutia {nume[celelalte[0]]} {x0:.3f}..{x1:.3f}, {nume[celelalte[1]]} {y0:.3f}..{y1:.3f}; scris {iesire}')
if '--json' in args:
    import json
    print('JSON ' + json.dumps([[list(a), list(b)] for a, b in seg]))
if '--text' in args:
    for i, b in enumerate(contururi(seg)):
        n = len(b)
        arie = sum(b[j][0] * b[(j + 1) % n][1] - b[(j + 1) % n][0] * b[j][1] for j in range(n)) / 2
        cx = sum(p[0] for p in b) / n
        cy = sum(p[1] for p in b) / n
        r = sum(math.dist(p, (cx, cy)) for p in b) / n
        bx = (min(p[0] for p in b), max(p[0] for p in b))
        by = (min(p[1] for p in b), max(p[1] for p in b))
        print(f'  contur {i}: {n} puncte, arie {arie:.3f}, centrul ({cx:.3f}, {cy:.3f}), raza medie {r:.3f}, '
              f'{nume[celelalte[0]]} {bx[0]:.3f}..{bx[1]:.3f}, {nume[celelalte[1]]} {by[0]:.3f}..{by[1]:.3f}')
