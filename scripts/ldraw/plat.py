"""Cititorul LDraw al cotelor: aplatizează o piesă (subpiesele și primitivele, cu transformările lor) în triunghiuri, în mm
(1 LDU = 0,4 mm), apoi dă cutia și profilul radial în jurul unei axe (raza minimă și maximă pe felii de-a lungul axei,
din intersecția exactă a triunghiurilor cu planul feliei).
Folosire: python -I -B -X utf8 plat.py <dosarul bibliotecii> <piesa> [--axa X|Y|Z] [--pas 0.25] [--centru a,b]"""
import math
import os
import sys

LDU = 0.4


def gaseste(dosar, ref):
    r = ref.replace('\\', '/').lower()
    for c in (['parts/' + r] if r.startswith('s/') else ['p/' + r] if r.startswith(('48/', '8/')) else ['parts/' + r, 'p/' + r]):
        loc = os.path.join(dosar, *c.split('/'))
        if os.path.exists(loc):
            return loc
    raise SystemExit(f'lipsește din dosar: {ref}')


def inmulteste(m, n):
    # m, n: (a,b,c,d,e,f,g,h,i,x,y,z) = matricea 3x3 pe rânduri și translația
    a = [[m[0], m[1], m[2]], [m[3], m[4], m[5]], [m[6], m[7], m[8]]]
    b = [[n[0], n[1], n[2]], [n[3], n[4], n[5]], [n[6], n[7], n[8]]]
    r = [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    t = [sum(a[i][k] * n[9 + k] for k in range(3)) + m[9 + i] for i in range(3)]
    return (r[0][0], r[0][1], r[0][2], r[1][0], r[1][1], r[1][2], r[2][0], r[2][1], r[2][2], t[0], t[1], t[2])


def aplica(m, p):
    return (m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[9], m[3] * p[0] + m[4] * p[1] + m[5] * p[2] + m[10],
            m[6] * p[0] + m[7] * p[1] + m[8] * p[2] + m[11])


IDENT = (1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0)


def triunghiuri(dosar, ref, m=IDENT, cache=None, adanc=0):
    if adanc > 40:
        raise SystemExit('prea adânc: ' + ref)
    cache = {} if cache is None else cache
    loc = gaseste(dosar, ref)
    if loc not in cache:
        with open(loc, encoding='utf-8', errors='replace') as f:
            cache[loc] = f.read().splitlines()
    out = []
    for linie in cache[loc]:
        p = linie.split()
        if not p:
            continue
        if p[0] == '1' and len(p) >= 15:
            x, y, z, a, b, c, d, e, f_, g, h, i = map(float, p[2:14])
            sub = inmulteste(m, (a, b, c, d, e, f_, g, h, i, x, y, z))
            out.extend(triunghiuri(dosar, ' '.join(p[14:]), sub, cache, adanc + 1))
        elif p[0] == '3' and len(p) >= 11:
            v = [aplica(m, tuple(map(float, p[2 + 3 * k:5 + 3 * k]))) for k in range(3)]
            out.append(v)
        elif p[0] == '4' and len(p) >= 14:
            v = [aplica(m, tuple(map(float, p[2 + 3 * k:5 + 3 * k]))) for k in range(4)]
            out.append([v[0], v[1], v[2]])
            out.append([v[0], v[2], v[3]])
    return out


def in_mm(tri):
    return [[(p[0] * LDU, p[1] * LDU, p[2] * LDU) for p in t] for t in tri]


def cutie(tri):
    pts = [p for t in tri for p in t]
    return [(min(p[k] for p in pts), max(p[k] for p in pts)) for k in range(3)]


def profil(tri, axa, pas, centru=(0.0, 0.0)):
    """Pe felii perpendiculare pe axă: raza minimă și maximă a punctelor de intersecție ale triunghiurilor cu planul."""
    k = 'XYZ'.index(axa)
    u, v = [j for j in range(3) if j != k]
    lo, hi = cutie(tri)[k]
    rez = []
    n = int(math.floor((hi - lo) / pas))
    for s in range(n + 1):
        h = lo + s * pas + pas * 0.5 if s < n else hi - 1e-6
        rmin, rmax = math.inf, -math.inf
        for t in tri:
            a = [p[k] - h for p in t]
            if min(a) > 0 or max(a) < 0:
                continue
            pts = []
            for i in range(3):
                p, q = t[i], t[(i + 1) % 3]
                ap, aq = a[i], a[(i + 1) % 3]
                if (ap <= 0 <= aq or aq <= 0 <= ap) and ap != aq:
                    w = ap / (ap - aq)
                    pts.append((p[u] + (q[u] - p[u]) * w, p[v] + (q[v] - p[v]) * w))
            for x, y in pts:
                r = math.hypot(x - centru[0], y - centru[1])
                rmin, rmax = min(rmin, r), max(rmax, r)
        rez.append((h, rmin, rmax))
    return rez


if __name__ == '__main__':
    dosar, piesa = sys.argv[1], sys.argv[2]
    arg = dict(zip(sys.argv[3::2], sys.argv[4::2]))
    tri = in_mm(triunghiuri(dosar, piesa + '.dat'))
    cb = cutie(tri)
    print(f'{piesa}: {len(tri)} triunghiuri; cutia (mm): ' + ', '.join(f'{"XYZ"[k]} {cb[k][0]:.3f}..{cb[k][1]:.3f}' for k in range(3)))
    if '--axa' in arg:
        c = tuple(map(float, arg.get('--centru', '0,0').split(',')))
        for h, rmin, rmax in profil(tri, arg['--axa'], float(arg.get('--pas', '0.25')), c):
            print(f'  {arg["--axa"]} {h:8.3f}  rmin {rmin:8.3f}  rmax {rmax:8.3f}')
