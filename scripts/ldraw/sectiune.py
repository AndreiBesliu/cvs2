"""Secțiunea unei piese LDraw printr-un semiplan care conține axa Z, la unul sau mai multe unghiuri: segmentele de
intersecție ale triunghiurilor, în coordonatele (r, z), în mm. Scrie un SVG mărit (o culoare pe unghi) și, cu --text,
segmentele.
Folosire: python -I -B -X utf8 sectiune.py <dosarul bibliotecii> <piesa> <ieșire.svg> [--unghiuri 0,22.5,45] [--text]"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plat  # noqa: E402


def sectiune(tri, unghi):
    a = math.radians(unghi)
    d = (math.cos(a), math.sin(a))
    n = (-math.sin(a), math.cos(a))
    seg = []
    for t in tri:
        s = [p[0] * n[0] + p[1] * n[1] for p in t]
        if min(s) > 0 or max(s) < 0:
            continue
        pts = []
        for i in range(3):
            p, q, sp, sq = t[i], t[(i + 1) % 3], s[i], s[(i + 1) % 3]
            if sp == sq:
                continue
            if (sp <= 0 <= sq) or (sq <= 0 <= sp):
                w = sp / (sp - sq)
                x, y, z = (p[k] + (q[k] - p[k]) * w for k in range(3))
                pts.append((x * d[0] + y * d[1], z))
        if len(pts) >= 2:
            (r1, z1), (r2, z2) = pts[0], pts[1]
            if r1 > -1e-9 and r2 > -1e-9 and (abs(r1 - r2) > 1e-9 or abs(z1 - z2) > 1e-9):
                seg.append((r1, z1, r2, z2))
    return seg


if __name__ == '__main__':
    dosar, piesa, iesire = sys.argv[1], sys.argv[2], sys.argv[3]
    arg = dict(zip(sys.argv[4::2], sys.argv[5::2]))
    unghiuri = [float(u) for u in arg.get('--unghiuri', '0').split(',')]
    tri = plat.in_mm(plat.triunghiuri(dosar, piesa + '.dat'))
    cb = plat.cutie(tri)
    rmax = max(math.hypot(p[0], p[1]) for t in tri for p in t)
    z0, z1 = cb[2]
    S = 40.0  # px / mm
    X = lambda r: 40 + r * S  # noqa: E731
    Y = lambda z: 40 + (z1 - z) * S  # noqa: E731
    culori = ['#2a5bd7', '#d2691e', '#2e8b57', '#9932cc', '#b22222', '#008b8b']
    w, h = X(rmax) + 40, Y(z0) + 60
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" style="background:#fff;font:13px sans-serif">']
    r = 0.0
    while r <= rmax + 1e-9:
        out.append(f'<line x1="{X(r):.1f}" x2="{X(r):.1f}" y1="30" y2="{Y(z0) + 10:.1f}" stroke="{"#ccc" if abs(r - round(r)) < 1e-9 else "#eee"}"/>')
        if abs(r - round(r)) < 1e-9:
            out.append(f'<text x="{X(r) - 4:.1f}" y="{Y(z0) + 28:.1f}">{r:.0f}</text>')
        r += 0.5
    z = math.floor(z0)
    while z <= z1 + 1e-9:
        out.append(f'<line x1="40" x2="{X(rmax):.1f}" y1="{Y(z):.1f}" y2="{Y(z):.1f}" stroke="#ddd"/><text x="4" y="{Y(z) + 4:.1f}">{z:.0f}</text>')
        z += 1
    leg = []
    for k, u in enumerate(unghiuri):
        c = culori[k % len(culori)]
        seg = sectiune(tri, u)
        for r1, za, r2, zb in seg:
            out.append(f'<line x1="{X(r1):.1f}" y1="{Y(za):.1f}" x2="{X(r2):.1f}" y2="{Y(zb):.1f}" stroke="{c}" stroke-width="2"/>')
        leg.append(f'<tspan fill="{c}">{u:g}°</tspan>')
        if '--text' in sys.argv:
            print(f'unghiul {u:g}: {len(seg)} segmente')
            for r1, za, r2, zb in sorted(seg, key=lambda s: (round(min(s[1], s[3]), 3), round(min(s[0], s[2]), 3))):
                print(f'  r {r1:7.3f} z {za:7.3f}  ->  r {r2:7.3f} z {zb:7.3f}')
    out.append(f'<text x="40" y="20">{piesa}: secțiunea r–z (orizontal r, vertical z, mm), unghiurile: {" ".join(leg)}</text></svg>')
    open(iesire, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'{piesa}: rmax {rmax:.3f}, z {z0:.3f}..{z1:.3f}; scris {iesire}')
