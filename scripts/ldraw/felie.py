"""Felia unei piese LDraw cu planul z = c (axa Z a piesei): segmentele de intersecție în XY, în mm, desenate mărit într-un
SVG; cu --text, contururile închise refăcute din segmente (numărul lor, centrul, raza medie, aria) — găurile discului.
Folosire: python -I -B -X utf8 felie.py <dosarul bibliotecii> <piesa> <ieșire.svg> [--z 0] [--text]"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plat  # noqa: E402


def felie(tri, c):
    seg = []
    for t in tri:
        s = [p[2] - c for p in t]
        if min(s) > 0 or max(s) < 0:
            continue
        pts = []
        for i in range(3):
            p, q, sp, sq = t[i], t[(i + 1) % 3], s[i], s[(i + 1) % 3]
            if sp == sq:
                continue
            if (sp <= 0 <= sq) or (sq <= 0 <= sp):
                w = sp / (sp - sq)
                pts.append((p[0] + (q[0] - p[0]) * w, p[1] + (q[1] - p[1]) * w))
        if len(pts) >= 2 and math.dist(pts[0], pts[1]) > 1e-9:
            seg.append((pts[0], pts[1]))
    return seg


def contururi(seg, tol=1e-4):
    cheie = lambda p: (round(p[0] / tol), round(p[1] / tol))  # noqa: E731
    vecini = {}
    for a, b in seg:
        vecini.setdefault(cheie(a), []).append(b)
        vecini.setdefault(cheie(b), []).append(a)
    folosit, rez = set(), []
    for a, b in seg:
        k = (cheie(a), cheie(b))
        if k in folosit or (k[1], k[0]) in folosit:
            continue
        bucla = [a, b]
        folosit.add(k)
        while True:
            ultim, pen = bucla[-1], bucla[-2]
            urm = None
            for v in vecini.get(cheie(ultim), []):
                kk = (cheie(ultim), cheie(v))
                if kk in folosit or (kk[1], kk[0]) in folosit or cheie(v) == cheie(pen):
                    continue
                urm = v
                break
            if urm is None:
                break
            folosit.add((cheie(ultim), cheie(urm)))
            if cheie(urm) == cheie(bucla[0]):
                break
            bucla.append(urm)
        rez.append(bucla)
    return rez


if __name__ == '__main__':
    dosar, piesa, iesire = sys.argv[1], sys.argv[2], sys.argv[3]
    arg = dict(zip(sys.argv[4::2], sys.argv[5::2]))
    c = float(arg.get('--z', '0'))
    tri = plat.in_mm(plat.triunghiuri(dosar, piesa + '.dat'))
    seg = felie(tri, c)
    R = max(math.hypot(*p) for s in seg for p in s)
    S = 20.0
    X = lambda x: 20 + (x + R) * S  # noqa: E731
    Y = lambda y: 40 + (R - y) * S  # noqa: E731
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{X(R) + 20:.0f}" height="{Y(-R) + 20:.0f}" style="background:#fff;font:13px sans-serif">',
           f'<text x="20" y="20">{piesa}: felia z = {c:g} mm (pătratele de 1 mm)</text>']
    for k in range(-int(R), int(R) + 1):
        out.append(f'<line x1="{X(k):.1f}" x2="{X(k):.1f}" y1="{Y(R):.1f}" y2="{Y(-R):.1f}" stroke="#eee"/>')
        out.append(f'<line y1="{Y(k):.1f}" y2="{Y(k):.1f}" x1="{X(-R):.1f}" x2="{X(R):.1f}" stroke="#eee"/>')
    for a, b in seg:
        out.append(f'<line x1="{X(a[0]):.1f}" y1="{Y(a[1]):.1f}" x2="{X(b[0]):.1f}" y2="{Y(b[1]):.1f}" stroke="#2a5bd7" stroke-width="1.5"/>')
    out.append('</svg>')
    open(iesire, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'{piesa}: felia z = {c:g}: {len(seg)} segmente, raza maximă {R:.3f}; scris {iesire}')
    if '--text' in sys.argv:
        for b in sorted(contururi(seg), key=lambda b: -len(b)):
            n = len(b)
            arie = 0.5 * sum(b[i][0] * b[(i + 1) % n][1] - b[(i + 1) % n][0] * b[i][1] for i in range(n))
            cx, cy = sum(p[0] for p in b) / n, sum(p[1] for p in b) / n
            rm = sum(math.dist(p, (cx, cy)) for p in b) / n
            print(f'  contur: {n} puncte, centrul ({cx:7.3f}, {cy:7.3f}) la r {math.hypot(cx, cy):6.3f}, raza medie {rm:6.3f}, '
                  f'aria {arie:8.3f}, unghiul {math.degrees(math.atan2(cy, cx)):7.2f}')
