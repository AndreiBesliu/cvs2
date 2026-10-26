"""Oracolul independent al exportului 2D (ADR 0088): recitește `corpus.dxf` cu ezdxf și îl compară cu valorile pe hârtie.

Corpusul e descris în `scripts/export2d-corpus.ts`; valorile de aici sunt scrise din descriere, cu formule, nu din codul
aplicației (nimic din `src/`). Folosire: `python test/oracles-py/export2d.py <dosar>`; codul de ieșire 1 la orice abatere.
Cere ezdxf 1.4.4 (`test/oracles-py/requirements.txt`).
"""
import math
import sys
from collections import Counter

import ezdxf
from ezdxf import recover

# Consola Windows (cp1252) nu are ă, ț: ieșirea e UTF-8 oriunde.
sys.stdout.reconfigure(encoding='utf-8')

TOL = 1e-9
probleme = []


def verifica(cond, mesaj):
    if not cond:
        probleme.append(mesaj)


def aproape(a, b, tol=TOL):
    return abs(a - b) <= tol


def punct_aproape(p, q, tol=TOL):
    return aproape(p[0], q[0], tol) and aproape(p[1], q[1], tol)


def arie_polilinie(varfuri):
    """Aria cu semn a unei polilinii închise cu bulge: shoelace plus segmentul de cerc al fiecărui arc."""
    arie = 0.0
    n = len(varfuri)
    for i in range(n):
        x1, y1, b = varfuri[i]
        x2, y2, _ = varfuri[(i + 1) % n]
        arie += (x1 * y2 - x2 * y1) / 2
        if b != 0:
            teta = 4 * math.atan(b)
            coarda = math.hypot(x2 - x1, y2 - y1)
            r = coarda / (2 * math.sin(abs(teta) / 2))
            arie += (r * r / 2) * (teta - math.sin(teta))
    return arie


def mijloc_arc(x1, y1, x2, y2, b):
    """Punctul din mijlocul arcului cu bulge b: săgeata = b · coarda / 2, spre dreapta mersului dacă b > 0."""
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    s = b / 2  # săgeata raportată la coardă
    return (mx + s * dy, my - s * dx)


def rotit(x, y, unghi, tx, ty):
    c, s = math.cos(unghi), math.sin(unghi)
    return (c * x - s * y + tx, s * x + c * y + ty)


def main(dosar):
    doc, auditor = recover.readfile(f'{dosar}/corpus.dxf')
    verifica(not auditor.has_errors and len(auditor.fixes) == 0, f'recover: {len(auditor.errors)} erori, {len(auditor.fixes)} reparații')
    audit = doc.audit()
    verifica(not audit.has_errors and len(audit.fixes) == 0, f'audit: {len(audit.errors)} erori, {len(audit.fixes)} reparații')
    verifica(doc.dxfversion == 'AC1021', f'versiunea {doc.dxfversion}')
    verifica(doc.header.get('$INSUNITS') == 4, f'$INSUNITS {doc.header.get("$INSUNITS")}')

    culori = {'EXTERIOR': 1, 'INTERIOR': 5, 'PE_LINIE': 3, 'BUZUNAR': 6, 'GAURIRE': 4, 'FARA_OPERATIE': 7, 'FOAIE': 8}
    for nume, culoare in culori.items():
        verifica(doc.layers.has_entry(nume), f'stratul {nume} lipsește')
        if doc.layers.has_entry(nume):
            verifica(doc.layers.get(nume).dxf.color == culoare, f'culoarea stratului {nume}')
    verifica(not doc.layers.has_entry('PE_O_PARTE'), 'stratul PE_O_PARTE nu e folosit, deci nu se scrie')

    msp = list(doc.modelspace())
    numarate = Counter((e.dxftype(), e.dxf.layer) for e in msp)
    asteptat = Counter({
        ('LWPOLYLINE', 'EXTERIOR'): 2, ('SPLINE', 'EXTERIOR'): 1, ('CIRCLE', 'EXTERIOR'): 1,
        ('CIRCLE', 'INTERIOR'): 2,
        ('SPLINE', 'PE_LINIE'): 1, ('LWPOLYLINE', 'PE_LINIE'): 1,
        ('SPLINE', 'BUZUNAR'): 1,
        ('CIRCLE', 'GAURIRE'): 1,
        ('CIRCLE', 'FARA_OPERATIE'): 1, ('LWPOLYLINE', 'FARA_OPERATIE'): 1,
        ('LWPOLYLINE', 'FOAIE'): 1,
    })
    verifica(numarate == asteptat, f'entitățile: {dict(numarate)}')

    # Cercurile: valorile exacte (centrul, raza), din descriere.
    cercuri = sorted(((e.dxf.layer, e.dxf.center.x, e.dxf.center.y, e.dxf.radius) for e in msp if e.dxftype() == 'CIRCLE'), key=lambda c: c[3])
    # `mare`: R10 sub scara 2,5 (rotirea nu schimbă raza) = R25.
    pe_hartie = sorted([('INTERIOR', 400, 250, 50), ('INTERIOR', 300, 330, 25), ('FARA_OPERATIE', 10, 10, 0.01), ('GAURIRE', 560 - 20, 380, 3), ('EXTERIOR', 580 - 0, 20 + 10, 5)], key=lambda c: c[3])
    verifica(len(cercuri) == len(pe_hartie), f'cercurile: {cercuri}')
    for c, h in zip(cercuri, pe_hartie):
        verifica(c[0] == h[0] and aproape(c[1], h[1]) and aproape(c[2], h[2]) and aproape(c[3], h[3]), f'cercul {c} față de {h}')

    polilinii = [e for e in msp if e.dxftype() == 'LWPOLYLINE']
    spline = [e for e in msp if e.dxftype() == 'SPLINE']

    # Dreptunghiul rotunjit 200 × 100 R10, rotit 30° și mutat în (150, 100): închis, 8 vârfuri, 4 arce de 90° în sens
    # trigonometric (bulge = tan 22,5°), aria 200·100 − (4 − π)·10², vârfurile din rotirea celor ale dreptunghiului.
    drept = [e for e in polilinii if e.dxf.layer == 'EXTERIOR' and e.closed]
    verifica(len(drept) == 1, 'dreptunghiul rotunjit: o polilinie închisă pe EXTERIOR')
    if drept:
        v = [tuple(p) for p in drept[0].get_points('xyb')]
        verifica(len(v) == 8, f'dreptunghiul: {len(v)} vârfuri')
        verifica(sorted(abs(b) for _, _, b in v if b != 0) == [math.tan(math.pi / 8)] * 4 or all(aproape(b, math.tan(math.pi / 8)) for _, _, b in v if b != 0), 'bulge-urile colțurilor')
        verifica(sum(1 for _, _, b in v if b != 0) == 4 and all(b > 0 for _, _, b in v if b != 0), 'patru arce, toate trigonometrice')
        verifica(aproape(arie_polilinie(v), 200 * 100 - (4 - math.pi) * 100, 1e-7), f'aria dreptunghiului {arie_polilinie(v)}')
        locale = [(10, 0), (190, 0), (200, 10), (200, 90), (190, 100), (10, 100), (0, 90), (0, 10)]
        asteptate = [rotit(x, y, math.pi / 6, 150, 100) for x, y in locale]
        for q in asteptate:
            verifica(any(punct_aproape((x, y), q, 1e-9) for x, y, _ in v), f'vârful {q} al dreptunghiului lipsește')

    # Dreptunghiul 40 × 20 R5 al piesei oglindite (x → 560 − x): aceeași arie, cu semnul întors (orar), bulge negativ.
    oglindit = [e for e in polilinii if e.dxf.layer == 'FARA_OPERATIE']
    if oglindit:
        v = [tuple(p) for p in oglindit[0].get_points('xyb')]
        verifica(oglindit[0].closed, 'dreptunghiul oglindit e închis')
        verifica(aproape(arie_polilinie(v), -(40 * 20 - (4 - math.pi) * 25), 1e-7), f'aria dreptunghiului oglindit {arie_polilinie(v)}')
        verifica(all(b < 0 for _, _, b in v if b != 0) and sum(1 for _, _, b in v if b != 0) == 4, 'arcele oglindite sunt orare')
        verifica(any(punct_aproape((x, y), (560 - 5, 0)) for x, y, _ in v), 'vârful (555, 0)')

    # Calea S: cubica exactă (puncte de control, nodurile unei Bézier), punctul de la t = 0,5 = (P0 + 3·C1 + 3·C2 + P1) / 8
    # = (350, 50), evaluat de ezdxf; apoi polilinia deschisă (400, 50) → (450, 50) → semicercul până la (500, 50), care trece
    # prin (475, 25).
    s = [e for e in spline if e.dxf.layer == 'PE_LINIE']
    if s:
        cp = [(p[0], p[1]) for p in s[0].control_points]
        verifica(cp == [(300, 50), (330, 110), (370, -10), (400, 50)], f'punctele curbei S: {cp}')
        verifica(list(s[0].knots) == [0, 0, 0, 0, 1, 1, 1, 1], f'nodurile curbei S: {list(s[0].knots)}')
        verifica(s[0].dxf.degree == 3, 'gradul 3')
        m = s[0].construction_tool().point(0.5)
        verifica(punct_aproape((m.x, m.y), (350, 50)), f'curba S la t = 0,5: {m}')
    p = [e for e in polilinii if e.dxf.layer == 'PE_LINIE']
    if p:
        v = [tuple(x) for x in p[0].get_points('xyb')]
        verifica(not p[0].closed, 'polilinia căii S e deschisă')
        verifica(v == [(400, 50, 0), (450, 50, 1), (500, 50, 0)], f'polilinia căii S: {v}')
        if len(v) == 3:
            verifica(punct_aproape(mijloc_arc(450, 50, 500, 50, v[1][2]), (475, 25)), 'semicercul trece prin (475, 25)')

    # Ovalul: 4 cubice într-o singură SPLINE (13 puncte, nodurile triple), închisă geometric, prin (100, 320), (60, 300),
    # (100, 280) la nodurile 1, 2, 3.
    o = [e for e in spline if e.dxf.layer == 'BUZUNAR']
    if o:
        cp = [(q[0], q[1]) for q in o[0].control_points]
        verifica(len(cp) == 13 and punct_aproape(cp[0], (140, 300)) and punct_aproape(cp[-1], (140, 300)), f'ovalul: {len(cp)} puncte')
        verifica(list(o[0].knots) == [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4], f'nodurile ovalului: {list(o[0].knots)}')
        unealta = o[0].construction_tool()
        for t, q in [(1, (100, 320)), (2, (60, 300)), (3, (100, 280))]:
            r = unealta.point(t)
            verifica(punct_aproape((r.x, r.y), q, 1e-9), f'ovalul la t = {t}: {r}')
        k = 0.5522847498
        mijloc = ((140 + 3 * 140 + 3 * (100 + 40 * k) + 100) / 8, (300 + 3 * (300 + 20 * k) + 3 * 320 + 320) / 8)
        r = unealta.point(0.5)
        verifica(punct_aproape((r.x, r.y), mijloc, 1e-9), f'ovalul la t = 0,5: {r} față de {mijloc}')

    # „D”: cubica de pe dreapta, apoi polilinia deschisă (260, 350) → (200, 350) → arcul orar cu bulge −0,5 → (200, 300) →
    # (260, 300): bucata cu cubica pornește de la schimbarea de fel.
    d = [e for e in spline if e.dxf.layer == 'EXTERIOR']
    if d:
        cp = [(q[0], q[1]) for q in d[0].control_points]
        verifica(cp == [(260, 300), (290, 300), (290, 350), (260, 350)], f'cubica lui D: {cp}')
    dp = [e for e in polilinii if e.dxf.layer == 'EXTERIOR' and not e.closed]
    if dp:
        v = [tuple(x) for x in dp[0].get_points('xyb')]
        verifica(v == [(260, 350, 0), (200, 350, -0.5), (200, 300, 0), (260, 300, 0)], f'polilinia lui D: {v}')

    # Foaia: 600 × 400, închisă.
    f = [e for e in polilinii if e.dxf.layer == 'FOAIE']
    if f:
        v = [tuple(x) for x in f[0].get_points('xyb')]
        verifica(f[0].closed and v == [(0, 0, 0), (600, 0, 0), (600, 400, 0), (0, 400, 0)], f'foaia: {v}')

    if probleme:
        print('EXPORTUL 2D: abateri față de hârtie:')
        for x in probleme:
            print('  -', x)
        sys.exit(1)
    print(f'exportul 2D: {len(msp)} entități, toate cât pe hârtie (ezdxf {ezdxf.__version__}: 0 erori, 0 reparații)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.tmp/export2d')
