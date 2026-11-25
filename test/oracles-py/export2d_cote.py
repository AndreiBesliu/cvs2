"""Oracolul independent al cotelor în exportul 2D (ADR 0330 §7, felia 10.4↑c-1): recitește `cote.dxf` (ezdxf), `cote.pdf`
(PyMuPDF), `cote.svg` (un cititor mic al căilor noastre) și `cote.eps` (direct și prin Ghostscript, `cote-eps.pdf`) și le compară
cu desenul cotelor pe hârtie.

Corpusul e descris în antetul lui `scripts/export2d-corpus.ts` (documentul cotelor); valorile de aici sunt scrise din descriere,
cu regulile desenului din ADR 0330 §4–§6 (golul extensiilor 1 mm, depășirea 2, săgețile pline de 2,5 mm cu baza de 2,5 / 3,
cifrele de 3,5 mm cu baza la 0,3 · 3,5 de linie, citibile, lățimea estimată a unei cifre 0,6 · 3,5 la locul ei pe rază), nu
din codul aplicației (nimic din `src/`). Cifrele sunt trăsăturile lui Relief SingleLine așezate de fontTools
(`text_corpus.aseaza`, cu o singură linie), rotite și mutate la baza cifrei.

În DXF totul e exact (1e-9): fiecare segment (linia, arcul cu bulge, cubica, triunghiul plin) e pe hârtie și invers, câte
unul. În PDF, SVG și EPS, fiecare punct desenat e pe un segment de pe hârtie și fiecare segment de pe hârtie e desenat, la
toleranța formatului (arcele din cubice sub 0,001 mm; SVG-ul are 6 zecimale).
"""
import math
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter

import ezdxf
import fitz
from ezdxf import recover

sys.path.insert(0, os.path.dirname(__file__))
from text_corpus import aseaza, deschide  # noqa: E402  (fontTools, fără nimic din aplicație)

RAD = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
K = 72 / 25.4
TOL = 1e-9
TOL_PDF = 0.001 + 1e-4
TOL_SVG = 0.001 + 1e-6
TOL_GS = 0.003

# Stilul implicit (ADR 0330 §6) și stratul corpusului.
H, GOL, DEP, CAP = 3.5, 1, 2, 2.5
W = CAP / 6
G = 0.3 * H
STRAT, CULOARE, GROSIME = 'DIM_1', (0xff, 0x88, 0x00), 0.25

probleme = []


def verifica(cond, mesaj):
    if not cond:
        probleme.append(mesaj)


def plus(p, v, k):
    return (p[0] + k * v[0], p[1] + k * v[1])


def unit(v):
    n = math.hypot(*v)
    return (v[0] / n, v[1] / n)


def sageata(f, v):
    """Săgeata plină din vârful f, cu baza la CAP spre v, lată de 2·W."""
    b = plus(f, v, CAP)
    n = (-v[1], v[0])
    return ('T', f, plus(b, n, W), plus(b, n, -W))


FONT = deschide(os.path.join(RAD, 'public', 'fonturi', 'relief-singleline.ttf'))


def cifre(text, p, unghi):
    """Trăsăturile cifrei `text`, așezate centrat cu baza în (0, 0), rotite cu `unghi` grade și mutate în `p`."""
    a = aseaza(FONT, {'continut': text, 'inaltime': H, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'centru'}, linie=True)
    verifica(a['lipsa'] == 0, f'fontul n-are toate semnele lui {text!r}')
    r = math.radians(unghi)
    c, s = math.cos(r), math.sin(r)
    t = lambda x, y: (p[0] + c * x - s * y, p[1] + s * x + c * y)
    seg = []
    for g in a['glife']:
        for k in g['contururi']:
            cur = t(*k['start'])
            for x in k['segmente']:
                if x[0] == 'L':
                    q = t(x[1], x[2])
                    seg.append(('L', cur, q))
                else:
                    c1, c2, q = t(x[1], x[2]), t(x[3], x[4]), t(x[5], x[6])
                    seg.append(('C', cur, c1, c2, q))
                cur = q
    return [x for x in seg if not (x[0] == 'L' and math.hypot(x[2][0] - x[1][0], x[2][1] - x[1][1]) <= 1e-12)]


def hartie_cote():
    """Fiecare cotă a corpusurilor, pe hârtie (mm ai foii, Y în sus): segmentele fără cifră, cifra (textul, mijlocul bazei,
    unghiul) și definiția ei ca DIMENSION (felul, steagurile, punctele de definiție după codul DXF, măsura, 50 și 40)."""
    c = {}
    s2 = math.sqrt(0.5)
    # h: orizontala (20, 20)–(120, 40), d = 15: linia la y = 30 + 15 = 45; extensiile de la golul de 1 mm până la 2 mm peste
    # linie; săgețile spre înăuntru; „100” centrat pe x = 70, cu baza la 45 + 0,3 · 3,5. Ca DIMENSION, rotită la 0°: punctele
    # măsurate (13, 14) și piciorul celui de-al doilea pe linia de cotă (10).
    c['h'] = {
        'seg': [('L', (20, 21), (20, 47)), ('L', (120, 41), (120, 47)), ('L', (20, 45), (120, 45)), sageata((20, 45), (1, 0)), sageata((120, 45), (-1, 0))],
        'text': ('100', (70, 45 + G), 0),
        'dim': {'tip': 0, 'steaguri': 32, 'p': {13: (20, 20), 14: (120, 40), 10: (120, 45)}, 50: 0, 'masura': 100},
    }
    # v: verticala (200, 20)–(210, 80), d = 20: linia la x = 205 − 20 = 185 (spre stânga); „60” citit de jos în sus (90°),
    # cu baza la 185 − 0,3 · 3,5, centrat pe y = 50. Ca DIMENSION, rotită la 90°.
    c['v'] = {
        'seg': [('L', (199, 20), (183, 20)), ('L', (209, 80), (183, 80)), ('L', (185, 20), (185, 80)), sageata((185, 20), (0, 1)), sageata((185, 80), (0, -1))],
        'text': ('60', (185 - G, 50), 90),
        'dim': {'tip': 0, 'steaguri': 32, 'p': {13: (200, 20), 14: (210, 80), 10: (185, 80)}, 50: 90, 'masura': 60},
    }
    # u: unghiul din (40, 120), laturile spre (60, 120) și (40, 140), arcul de rază 25 de la 0° la 90° (trigonometric);
    # extensiile de la 20 + 1 la 25 + 2 pe fiecare latură; săgețile din capetele arcului, cu baza pe coarda spre punctul de pe
    # arc aflat la 2,5 / 25 rad mai înăuntru; „90°” la mijlocul arcului (45°), tangent, citibil (−45°), cu baza la un gol în
    # afara arcului. Ca DIMENSION din trei puncte: vârful (15), punctele laturilor în sensul arcului (13 de unde pleacă, 14 unde
    # ajunge) și mijlocul arcului (10).
    v = (40, 120)
    dt = CAP / 25
    pe = lambda t: (v[0] + 25 * math.cos(t), v[1] + 25 * math.sin(t))
    p0, p1 = pe(0), pe(math.pi / 2)
    c['u'] = {
        'seg': [('A', v, 25, 0.0, math.pi / 2), ('L', (61, 120), (67, 120)), ('L', (40, 141), (40, 147)),
                sageata(p0, unit((pe(dt)[0] - p0[0], pe(dt)[1] - p0[1]))), sageata(p1, unit((pe(math.pi / 2 - dt)[0] - p1[0], pe(math.pi / 2 - dt)[1] - p1[1])))],
        'text': ('90°', plus(v, (s2, s2), 25 + G), -45),
        'dim': {'tip': 5, 'steaguri': 32, 'p': {15: v, 13: (60, 120), 14: (40, 140), 10: pe(math.pi / 4)}, 'masura': 90},
    }
    # d: diametrul cercului (240, 150), R20, cifra în afară la d = 8: lățimea estimată a lui „Ø40” e 3 · 0,6 · 3,5 = 6,3, deci
    # mijlocul cifrei la 20 + max(8, 1,05 + 3,15) = 28 de centru, iar linia de la −20 la max(20, 28 + 3,15) = 31,15; săgețile
    # în (260, 150) și (220, 150), spre centru. Ca DIMENSION: punctul de pe cerc (15), cel opus (10), cifra pusă de om (128),
    # iar lungimea liderului (40) e cât stă mijlocul cifrei dincolo de cerc: 8.
    c['d'] = {
        'seg': [('L', (220, 150), (271.15, 150)), sageata((260, 150), (-1, 0)), sageata((220, 150), (1, 0))],
        'text': ('Ø40', (268, 150 + G), 0),
        'dim': {'tip': 3, 'steaguri': 32 + 128, 'p': {15: (260, 150), 10: (220, 150)}, 40: 8, 'masura': 40},
    }
    # Corpusul al doilea (felia 10.4↑c-2) adaugă:
    # a: aliniata (130, 80)–(160, 120), lungă de 50, d = 10: direcția u = (0,6; 0,8), normala n = (−0,8; 0,6); linia la 10 pe
    # normală: (122, 86)–(152, 126); extensiile de la a + n (golul) la a + 12 n, la fel din b; „50” la mijlocul liniei
    # (137, 106) plus 0,3 · 3,5 pe normală, rotit cu unghiul direcției (atan2(0,8; 0,6) ≈ 53,13°).
    c['a'] = {
        'seg': [('L', (129.2, 80.6), (120.4, 87.2)), ('L', (159.2, 120.6), (150.4, 127.2)), ('L', (122, 86), (152, 126)),
                sageata((122, 86), (0.6, 0.8)), sageata((152, 126), (-0.6, -0.8))],
        'text': ('50', (137 - 0.8 * G, 106 + 0.6 * G), math.degrees(math.atan2(0.8, 0.6))),
        'dim': {'tip': 1, 'steaguri': 32, 'p': {13: (130, 80), 14: (160, 120), 10: (152, 126)}, 'masura': 50},
    }
    # r: raza cercului (110, 175) prin (125, 175), R15, cifra în afară la d = 6, linia „după loc”, deci din afară: „R15” e lată
    # de 6,3, deci mijlocul ei la 15 + max(6, 2,5 + 1,05 + 3,15) = 21,7 de centru, iar linia de la cerc (15) la 21,7 + 3,15;
    # săgeata cu vârful în (125, 175), cu baza spre afară. Ca DIMENSION: centrul (10), punctul de pe cerc (15), liderul 6,7.
    c['r'] = {
        'seg': [('L', (125, 175), (134.85, 175)), sageata((125, 175), (1, 0))],
        'text': ('R15', (131.7, 175 + G), 0),
        'dim': {'tip': 4, 'steaguri': 32 + 128, 'p': {10: (110, 175), 15: (125, 175)}, 40: 6.7, 'masura': 15},
    }
    # w: unghiul dintre două laturi, (245, 30)–(285, 30) și (250, 45)–(270, 65), cu textul „2x<>”: dreptele se întâlnesc în
    # (235, 30), unghiul e 45°, arcul de rază 30 de la 0° la 45°; laturile acoperă raza 30 (10…50 și 21,2…49,5 de vârf), deci
    # fără extensii; „2x45°” la mijlocul arcului (22,5°), citibil (−67,5°), în afara arcului. Ca DIMENSION din două linii:
    # prima linie, cea de unde pleacă arcul (13 → 14), a doua (15 → 10), mijlocul arcului (16).
    v = (235, 30)
    dt = CAP / 30
    pe = lambda t: (v[0] + 30 * math.cos(t), v[1] + 30 * math.sin(t))
    p0, p1 = pe(0), pe(math.pi / 4)
    dm = (math.cos(math.pi / 8), math.sin(math.pi / 8))
    c['w'] = {
        'seg': [('A', v, 30, 0.0, math.pi / 4), sageata(p0, unit((pe(dt)[0] - p0[0], pe(dt)[1] - p0[1]))), sageata(p1, unit((pe(math.pi / 4 - dt)[0] - p1[0], pe(math.pi / 4 - dt)[1] - p1[1])))],
        'text': ('2x45°', plus(v, dm, 30 + G), -67.5),
        'dim': {'tip': 2, 'steaguri': 32, 'p': {13: (245, 30), 14: (285, 30), 15: (250, 45), 10: (270, 65), 16: pe(math.pi / 8)}, 'masura': 45},
    }
    return c


COTE_1 = ['h', 'v', 'u', 'd']
COTE_2 = ['h', 'v', 'u', 'd', 'a', 'r', 'w']


def segmente_cota(x):
    """Segmentele cotei, cu cifra ca trăsături."""
    text, p, unghi = x['text']
    return x['seg'] + cifre(text, p, unghi)


def pe_hartie(ids=COTE_1):
    """Segmentele cotelor `ids`, pe hârtie, cu cifrele ca trăsături."""
    c = hartie_cote()
    return [s for i in ids for s in segmente_cota(c[i])]


# --- distanțe și eșantioane ------------------------------------------------------------------------------------------------

def bez(c, t):
    p0, p1, p2, p3 = c
    u = 1 - t
    return (u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1])


def d_seg(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy
    t = 0 if l2 == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def d_arc(p, c, r, a0, a1):
    u = math.atan2(p[1] - c[1], p[0] - c[0])
    while u < a0 - 1e-12:
        u += 2 * math.pi
    if u <= a1 + 1e-12:
        return abs(math.hypot(p[0] - c[0], p[1] - c[1]) - r)
    return min(math.hypot(p[0] - c[0] - r * math.cos(a), p[1] - c[1] - r * math.sin(a)) for a in (a0, a1))


def d_cub(p, c):
    n = 32
    best, bt = float('inf'), 0
    for i in range(n + 1):
        q = bez(c, i / n)
        d = math.hypot(p[0] - q[0], p[1] - q[1])
        if d < best:
            best, bt = d, i / n
    lo, hi = max(0, bt - 1 / n), min(1, bt + 1 / n)
    for _ in range(40):
        m1, m2 = lo + (hi - lo) / 3, hi - (hi - lo) / 3
        q1, q2 = bez(c, m1), bez(c, m2)
        if math.hypot(p[0] - q1[0], p[1] - q1[1]) < math.hypot(p[0] - q2[0], p[1] - q2[1]):
            hi = m2
        else:
            lo = m1
    q = bez(c, (lo + hi) / 2)
    return min(best, math.hypot(p[0] - q[0], p[1] - q[1]))


def distanta(p, s):
    if s[0] == 'L':
        return d_seg(p, s[1], s[2])
    if s[0] == 'A':
        return d_arc(p, s[1], s[2], s[3], s[4])
    if s[0] == 'C':
        return d_cub(p, s[1:])
    return min(d_seg(p, s[1], s[2]), d_seg(p, s[2], s[3]), d_seg(p, s[3], s[1]))


def esantioane(s, n=12):
    if s[0] == 'L':
        return [(s[1][0] + (s[2][0] - s[1][0]) * i / n, s[1][1] + (s[2][1] - s[1][1]) * i / n) for i in range(n + 1)]
    if s[0] == 'A':
        return [(s[1][0] + s[2] * math.cos(s[3] + (s[4] - s[3]) * i / n), s[1][1] + s[2] * math.sin(s[3] + (s[4] - s[3]) * i / n)) for i in range(n + 1)]
    if s[0] == 'C':
        return [bez(s[1:], i / n) for i in range(n + 1)]
    return [p for a, b in ((s[1], s[2]), (s[2], s[3]), (s[3], s[1])) for p in esantioane(('L', a, b), 4)]


def cutie(s, tol):
    pts = [q for q in s[1:] if isinstance(q, tuple)] if s[0] != 'A' else esantioane(s, 16)
    return (min(q[0] for q in pts) - tol, min(q[1] for q in pts) - tol, max(q[0] for q in pts) + tol, max(q[1] for q in pts) + tol)


def aproape_de(p, seg, tol):
    for s, b in seg:
        if b[0] <= p[0] <= b[2] and b[1] <= p[1] <= b[3] and distanta(p, s) <= tol:
            return True
    return False


def compara_desen(nume, desenat, tol, hartie=None):
    """`desenat`: segmentele citite din fișier (L, C, T), în mm. Fiecare punct desenat e pe hârtie, fiecare segment de pe
    hârtie e desenat; triunghiurile pline, câte unul pe fiecare săgeată de pe hârtie. Întoarce abaterea maximă. `hartie`:
    segmentele de pe hârtie (implicit, ale corpusului întâi, cu cifrele ca trăsături)."""
    hartie = pe_hartie() if hartie is None else hartie
    linii_h = [(s, cutie(s, tol)) for s in hartie if s[0] != 'T']
    linii_d = [(s, cutie(s, tol)) for s in desenat if s[0] != 'T']
    abatere = 0.0
    for s, _ in linii_d:
        for p in esantioane(s, 8):
            d = min((distanta(p, h) for h, b in linii_h if b[0] <= p[0] <= b[2] and b[1] <= p[1] <= b[3]), default=float('inf'))
            abatere = max(abatere, d)
            if d > tol:
                verifica(False, f'{nume}: punctul desenat {p} nu e pe hârtie ({d:.6f} mm)')
                break
    for s, _ in linii_h:
        if not all(aproape_de(p, linii_d, tol) for p in esantioane(s)):
            verifica(False, f'{nume}: segmentul de pe hârtie {s[0]} {s[1]}… nu e desenat')
    tri_h = [s for s in hartie if s[0] == 'T']
    tri_d = [s for s in desenat if s[0] == 'T']
    verifica(len(tri_d) == len(tri_h), f'{nume}: {len(tri_d)} triunghiuri pline, nu {len(tri_h)}')
    for t in tri_h:
        verifica(any(all(min(math.hypot(a[0] - b[0], a[1] - b[1]) for b in x[1:]) <= tol for a in t[1:]) for x in tri_d), f'{nume}: săgeata {t[1]} lipsește')
    return abatere


# --- DXF: exact -------------------------------------------------------------------------------------------------------------

def egale(a, b, tol=TOL):
    if a[0] != b[0]:
        return False
    if a[0] == 'T':
        return all(min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in b[1:]) <= tol for p in a[1:])
    if a[0] == 'A':
        return math.hypot(a[1][0] - b[1][0], a[1][1] - b[1][1]) <= tol and abs(a[2] - b[2]) <= tol and abs(a[3] - b[3]) <= tol and abs(a[4] - b[4]) <= tol
    pa, pb = a[1:], b[1:]
    la = lambda u, v: all(math.hypot(p[0] - q[0], p[1] - q[1]) <= tol for p, q in zip(u, v))
    return la(pa, pb) or la(pa, pb[::-1])


def arc_din_bulge(p, q, b):
    """Arcul unei polilinii între p și q cu bulge b (> 0: trigonometric), ca (centrul, raza, unghiul de start, de capăt)."""
    teta = 4 * math.atan(b)
    coarda = math.hypot(q[0] - p[0], q[1] - p[1])
    r = coarda / (2 * math.sin(abs(teta) / 2))
    m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    n = unit((-(q[1] - p[1]), q[0] - p[0]))
    h = r * math.cos(teta / 2) * (1 if b > 0 else -1)
    c = plus(m, n, h)
    a0 = math.atan2(p[1] - c[1], p[0] - c[0]) if b > 0 else math.atan2(q[1] - c[1], q[0] - c[0])
    return ('A', c, r, a0, a0 + abs(teta))


def segmente_dxf(entitati):
    """Segmentele entităților DXF ale cotelor (SOLID, LWPOLYLINE fără lățime, SPLINE Bézier), exact cum sunt scrise."""
    citite = []
    for e in entitati:
        if e.dxftype() == 'SOLID':
            v = [(e.dxf.vtx0.x, e.dxf.vtx0.y), (e.dxf.vtx1.x, e.dxf.vtx1.y), (e.dxf.vtx2.x, e.dxf.vtx2.y), (e.dxf.vtx3.x, e.dxf.vtx3.y)]
            verifica(v[3] == v[2], 'SOLID: al patrulea colț e al treilea (triunghi)')
            citite.append(('T', v[0], v[1], v[2]))
        elif e.dxftype() == 'LWPOLYLINE':
            v = [tuple(x) for x in e.get_points('xyb')]
            verifica(e.dxf.const_width == 0, 'cotele fără discuri: lățimea 0')
            perechi = list(zip(v, v[1:])) + ([(v[-1], v[0])] if e.closed else [])
            for a, b in perechi:
                if a[2] == 0:
                    citite.append(('L', a[:2], b[:2]))
                else:
                    citite.append(arc_din_bulge(a[:2], b[:2], a[2]))
        elif e.dxftype() == 'SPLINE':
            cp = [(p[0], p[1]) for p in e.control_points]
            verifica(e.dxf.degree == 3 and (len(cp) - 1) % 3 == 0, 'SPLINE: Bézier de grad 3 în lanț')
            citite += [('C', *cp[i:i + 4]) for i in range(0, len(cp) - 1, 3)]
        else:
            verifica(False, f'o entitate neașteptată în desenul cotelor: {e.dxftype()}')
    return citite


def una_la_una(nume, citite, hartie):
    """Fiecare segment de pe hârtie e citit exact o dată, și nimic în plus."""
    ramase = list(citite)
    for s in hartie:
        k = next((i for i, x in enumerate(ramase) if egale(s, x)), None)
        if k is None:
            verifica(False, f'{nume}: segmentul de pe hârtie {s[0]} {s[1]}… lipsește')
        else:
            ramase.pop(k)
    verifica(not ramase, f'{nume}: {len(ramase)} segmente în plus, primul {ramase[:1]}')


def verifica_dxf(cale):
    doc, auditor = recover.readfile(cale)
    verifica(not auditor.has_errors and len(auditor.fixes) == 0, f'DXF recover: {len(auditor.errors)} erori, {len(auditor.fixes)} reparații')
    audit = doc.audit()
    verifica(not audit.has_errors and len(audit.fixes) == 0, f'DXF audit: {len(audit.errors)} erori, {len(audit.fixes)} reparații')
    # Defpoints îl pune ezdxf la citire (nu e în fișier).
    verifica(sorted(l.dxf.name for l in doc.layers if l.dxf.name != 'Defpoints') == sorted(['0', 'FOAIE', STRAT]), f'straturile DXF: {[l.dxf.name for l in doc.layers]}')
    verifica('Defpoints' not in open(cale, encoding='ascii').read(), 'DXF: Defpoints scris în fișier')
    if doc.layers.has_entry(STRAT):
        l = doc.layers.get(STRAT)
        # Portocaliul #ff8800 are nuanța 32°, deci culoarea de bază cea mai apropiată e galbenul (2); exactă, în 420.
        verifica(l.dxf.color == 2, f'ACI-ul stratului: {l.dxf.color}')
        verifica(l.dxf.get('true_color') == (CULOARE[0] << 16) | (CULOARE[1] << 8) | CULOARE[2], f'culoarea exactă: {l.dxf.get("true_color")}')
    msp = list(doc.modelspace())
    tipuri = Counter(e.dxftype() for e in msp if e.dxf.layer == STRAT)
    verifica(set(tipuri) <= {'LWPOLYLINE', 'SPLINE', 'SOLID'}, f'entitățile cotelor: {dict(tipuri)}')
    citite = segmente_dxf([e for e in msp if e.dxf.layer == STRAT])
    hartie = pe_hartie()
    una_la_una('DXF', citite, hartie)
    return len(citite), len(hartie)


# --- PDF, EPS (prin Ghostscript sau direct) și SVG ----------------------------------------------------------------------

def din_desene(cai, H_pt, culoare_ok):
    """Segmentele căilor PyMuPDF (sau ale cititorului EPS) cu culoarea cotelor, în mm."""
    mm = lambda q: (q.x / K, (H_pt - q.y) / K)
    seg = []
    for dr in cai:
        plin = dr.get('type') == 'f'
        c = dr.get('fill') if plin else dr.get('color')
        if c is None or not culoare_ok(c):
            continue
        items = [(it[0], [mm(q) for q in it[1:]]) for it in dr['items']]
        if plin:
            pts = [items[0][1][0]] + [x[1][-1] for x in items]
            if math.hypot(pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]) <= 1e-6:
                pts.pop()
            verifica(len(pts) == 3, f'un capăt plin cu {len(pts)} colțuri')
            seg.append(('T', *pts[:3]))
            continue
        for k, q in items:
            seg.append(('L', *q) if k == 'l' else ('C', *q))
    return seg


def e_cota(c, tol=0.003):
    return all(abs(c[i] - CULOARE[i] / 255) <= tol for i in range(3))


# Textele (felia 10.4↑c-2): cifrele scrise cu Helvetica, una din cele 14 fonturi standard ale PDF-ului (fără font în fișier).
# Majuscula lui Helvetica e 718 / 1000 din mărimea fontului (AFM-ul lui Adobe, CapHeight), deci cifra de 3,5 mm se scrie la
# 3,5 / 0,718 mm; mijlocul bazei ei e mijlocul cifrei de pe hârtie (măsurat aici cu lățimile lui PyMuPDF, nu ale aplicației).
CAP_HELVETICA = 0.718
HELV = fitz.Font('helv')


def texte_pdf(pagina, Hpt):
    """Textele paginii, din PyMuPDF: textul, mijlocul bazei (mm, Y în sus), unghiul (grade), majuscula (mm), fontul, culoarea."""
    rez = []
    for b in pagina.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            dx, dy = l['dir']
            for sp in l['spans']:
                if not sp['text'].strip():
                    continue
                # Lățimea din metricile Helvetica ale lui PyMuPDF (`Font('helv')`; `get_text_length` greșește un text care
                # începe cu un semn din afara ASCII, de exemplu „Ø40”: ia „Ø”-ul de 222 / 1000, nu 778).
                lung = HELV.text_length(sp['text'], fontsize=sp['size'])
                o = sp['origin']
                cx, cy = o[0] + dx * lung / 2, o[1] + dy * lung / 2
                rez.append({'text': sp['text'], 'p': (cx / K, (Hpt - cy) / K), 'unghi': math.degrees(math.atan2(-dy, dx)),
                            'cap': sp['size'] * CAP_HELVETICA / K, 'font': sp['font'], 'culoare': sp['color']})
    return rez


def compara_texte(nume, citite, tol):
    """Cifrele corpusului al doilea, scrise ca text: fiecare, o dată, cu mijlocul bazei, unghiul și majuscula de pe hârtie."""
    c = hartie_cote()
    asteptate = [c[i]['text'] for i in COTE_2]
    verifica(len(citite) == len(asteptate), f'{nume}: {len(citite)} texte, nu {len(asteptate)}: {[t["text"] for t in citite]}')
    for text, p, unghi in asteptate:
        x = next((t for t in citite if t['text'] == text), None)
        if x is None:
            verifica(False, f'{nume}: textul {text!r} lipsește')
            continue
        d = math.hypot(x['p'][0] - p[0], x['p'][1] - p[1])
        verifica(d <= tol, f'{nume}: {text!r} la {x["p"]}, nu la {p} ({d:.6f} mm)')
        du = (x['unghi'] - unghi + 180) % 360 - 180
        verifica(abs(du) <= 1e-3, f'{nume}: {text!r} rotit cu {x["unghi"]}°, nu {unghi}°')
        verifica(abs(x['cap'] - H) <= 1e-3, f'{nume}: majuscula lui {text!r} {x["cap"]} mm, nu {H}')


def hartie_fara_cifre(ids=COTE_2):
    c = hartie_cote()
    return [s for i in ids for s in c[i]['seg']]


def verifica_pdf(cale, hartie=None, pline=8, texte=False):
    doc = fitz.open(cale)
    pagina = doc[0]
    Hpt = pagina.rect.height
    verifica(abs(pagina.rect.width / K - 300) <= 0.005 and abs(Hpt / K - 200) <= 0.005, f'PDF: pagina {pagina.rect.width / K} × {Hpt / K} mm')
    ocg = doc.get_ocgs()
    verifica(sorted(o['name'] for o in ocg.values()) == ['DIM_1', 'FOAIE'], f'PDF: straturile {[o["name"] for o in ocg.values()]}')
    cai = pagina.get_drawings()
    ale_cotelor = [d for d in cai if d.get('layer') == STRAT]
    verifica(all(e_cota(d.get('color') or d.get('fill')) for d in ale_cotelor), 'PDF: culoarea cotelor')
    linii = [d for d in ale_cotelor if d.get('color') is not None]
    verifica(linii and all(abs(d['width'] - GROSIME * K) <= 1e-3 for d in linii), f'PDF: grosimea liniilor {sorted({round(d["width"] / K, 4) for d in linii})} mm')
    pline_d = [d for d in ale_cotelor if d.get('type') == 'f']
    verifica(len(pline_d) == pline, f'PDF: {len(pline_d)} capete pline, nu {pline}')
    t = texte_pdf(pagina, Hpt)
    if texte:
        compara_texte('PDF', t, 1e-3)
        verifica(all(x['font'] == 'Helvetica' and x['culoare'] == 0xff8800 for x in t), f'PDF: fontul și culoarea textelor {[(x["font"], hex(x["culoare"])) for x in t]}')
        verifica('/BaseFont /Helvetica' in open(cale, encoding='ascii').read() and '/FontFile' not in open(cale, encoding='ascii').read(), 'PDF: Helvetica, fără font în fișier')
    else:
        verifica(not t, f'PDF: texte neașteptate {[x["text"] for x in t]}')
    return compara_desen('PDF', din_desene(ale_cotelor, Hpt, e_cota), TOL_PDF, hartie)


def verifica_gs(cale, hartie=None, texte=False):
    doc = fitz.open(cale)
    pagina = doc[0]
    cai = pagina.get_drawings()
    t = texte_pdf(pagina, pagina.rect.height)
    if texte:
        # Ghostscript pune un font cu aceleași lățimi ca Helvetica (Nimbus Sans) și scrie pozițiile mai scurt: 0,01 mm.
        compara_texte('EPS prin Ghostscript', t, 0.01)
    else:
        verifica(not t, f'EPS prin Ghostscript: texte neașteptate {[x["text"] for x in t]}')
    return compara_desen('EPS prin Ghostscript', din_desene(cai, pagina.rect.height, e_cota), TOL_GS, hartie)


# Textul în EPS (felia 10.4↑c-2): Helvetica recodată în ISOLatin1 (°, ±, ×, Ø), definită o dată în prolog, apoi fiecare cifră
# pe un rând: mutarea la mijlocul bazei, rotirea, fontul cât majuscula / 0,718, apoi textul mutat înapoi cu jumătate din
# lățimea lui, pe care o măsoară interpretorul (`stringwidth`), deci centrat fără lățimi scrise în fișier.
PROLOG_EPS = re.compile(r'/Helvetica findfont dup length dict begin\n\{1 index /FID ne \{def\} \{pop pop\} ifelse\} forall\n'
                        r'/Encoding ISOLatin1Encoding def\ncurrentdict end\n/Helvetica-L1 exch definefont pop\n')
TEXT_EPS = re.compile(r'^gsave (\S+) (\S+) translate (\S+) rotate /Helvetica-L1 findfont (\S+) scalefont setfont 0 0 moveto '
                      r'\(((?:[^()\\]|\\[()\\]|\\[0-7]{3})*)\) dup stringwidth pop -2 div 0 rmoveto show grestore\n', re.M)


def sir_ps(s):
    """Un șir PostScript (doar ASCII, cu \\ooo pentru octeții ISOLatin1), ca text."""
    return re.sub(r'\\([0-7]{3})|\\([()\\])', lambda m: chr(int(m[1], 8)) if m[1] else m[2], s)


def desene_eps_cote(cale, hartie=None, texte=False):
    """Căile EPS-ului nostru, citite direct din text (subsetul pe care îl scriem, cu `fill` și `setlinewidth`); cu `texte`,
    și cifrele scrise cu Helvetica (rândurile lor se scot înaintea căilor)."""
    text = open(cale, encoding='ascii').read()
    box = [float(x) for x in text.split('%%HiResBoundingBox:')[1].split('\n')[0].split()]
    Hpt = box[3] - box[1]
    verifica(f'% Stratul {STRAT}' in text, 'EPS: comentariul stratului cotelor')
    citite = []
    if texte:
        verifica(len(PROLOG_EPS.findall(text)) == 1, 'EPS: Helvetica recodată ISOLatin1, o dată, în prolog')
        verifica('%%DocumentNeededResources: font Helvetica' in text, 'EPS: fontul cerut în antet')
        for m in TEXT_EPS.finditer(text):
            x, y, a, marime = (float(m[k]) for k in range(1, 5))
            # Lățimea, ca la PDF, din PyMuPDF (Helvetica): mijlocul bazei e chiar (x, y), cu `stringwidth` scăzut pe jumătate.
            citite.append({'text': sir_ps(m[5]), 'p': (x, y), 'unghi': a, 'cap': marime * CAP_HELVETICA})
        text = TEXT_EPS.sub('', PROLOG_EPS.sub('', text))
        compara_texte('EPS', citite, 1e-6)
    else:
        verifica('findfont' not in text and not re.search(r'\bshow\b', text), 'EPS: text neașteptat')
    stiva, culoare, items, cai, scara, curent, start, latimi = [], None, [], [], 1.0, None, None, []
    pt = lambda x, y: fitz.Point(x * scara - box[0], Hpt - (y * scara - box[1]))
    for tok in ' '.join(l for l in text.split('\n') if not l.startswith('%')).split():
        try:
            stiva.append(float(tok))
            continue
        except ValueError:
            pass
        if tok == 'scale':
            sy, sx = stiva.pop(), stiva.pop()
            scara = sx
        elif tok == 'setrgbcolor':
            b, g, r = stiva.pop(), stiva.pop(), stiva.pop()
            culoare = (r, g, b)
        elif tok == 'setlinewidth':
            latimi.append((culoare, stiva.pop()))
        elif tok in ('setlinecap', 'setlinejoin'):
            stiva.pop()
        elif tok == 'moveto':
            y, x = stiva.pop(), stiva.pop()
            curent = start = pt(x, y)
        elif tok == 'lineto':
            y, x = stiva.pop(), stiva.pop()
            q = pt(x, y)
            items.append(('l', curent, q))
            curent = q
        elif tok == 'curveto':
            v = [stiva.pop() for _ in range(6)][::-1]
            q = [pt(v[0], v[1]), pt(v[2], v[3]), pt(v[4], v[5])]
            items.append(('c', curent, *q))
            curent = q[2]
        elif tok == 'closepath':
            if abs(curent.x - start.x) > 1e-9 or abs(curent.y - start.y) > 1e-9:
                items.append(('l', curent, start))
        elif tok in ('stroke', 'fill'):
            cai.append({'type': 'f' if tok == 'fill' else 's', 'color': None if tok == 'fill' else culoare, 'fill': culoare if tok == 'fill' else None, 'items': items})
            items = []
        elif tok in ('gsave', 'grestore', 'showpage', 'newpath'):
            pass
        else:
            raise ValueError(f'cuvânt PostScript neașteptat: {tok}')
    verifica(any(e_cota(c) and abs(w - GROSIME) <= 1e-9 for c, w in latimi if c), f'EPS: grosimea cotelor {latimi}')
    return compara_desen('EPS', din_desene(cai, Hpt, e_cota), TOL_PDF, hartie)


def verifica_svg(cale, hartie=None, texte=False):
    """Grupul stratului cotelor (strat Inkscape, culoarea, grosimea) și căile lui: M, L, C, A, Z absolute, cu Y în jos; cu
    `texte`, și cifrele ca `<text>` (Helvetica, centrate pe mijlocul bazei, rotite în jurul lui)."""
    rad = ET.parse(cale).getroot()
    ns = '{http://www.w3.org/2000/svg}'
    inalt = float(rad.get('viewBox').split()[3])
    grup = next((g for g in rad.iter(f'{ns}g') if g.get('id') == STRAT), None)
    verifica(grup is not None, 'SVG: grupul DIM_1 lipsește')
    if grup is None:
        return float('nan')
    verifica(grup.get('{http://www.inkscape.org/namespaces/inkscape}groupmode') == 'layer', 'SVG: grupul e strat Inkscape')
    verifica(grup.get('stroke') == '#ff8800' and grup.get('stroke-width') == '0.25' and grup.get('fill') == 'none', f'SVG: {grup.attrib}')
    seg = []
    for p in grup.iter(f'{ns}path'):
        plin = p.get('fill') == '#ff8800' and p.get('stroke') == 'none'
        tok = re.findall(r'[MLCAZ]|-?\d+(?:\.\d+)?', p.get('d'))
        i, cur, start, pts, bucati = 0, None, None, [], []
        num = lambda k: [float(x) for x in tok[i + 1:i + 1 + k]]
        y = lambda v: inalt - v
        while i < len(tok):
            c = tok[i]
            if c == 'M':
                x0, y0 = num(2)
                cur = start = (x0, y(y0))
                pts.append(cur)
                i += 3
            elif c == 'L':
                x0, y0 = num(2)
                q = (x0, y(y0))
                bucati.append(('L', cur, q))
                pts.append(q)
                cur = q
                i += 3
            elif c == 'C':
                v = num(6)
                q = [(v[0], y(v[1])), (v[2], y(v[3])), (v[4], y(v[5]))]
                bucati.append(('C', cur, *q))
                cur = q[2]
                i += 7
            elif c == 'A':
                r, _, _, mare, sweep, x0, y0 = num(7)
                q = (x0, y(y0))
                # Cu Y întors, sweep 0 (invers acelor la vedere) e trigonometric în foaie.
                bulge = math.tan((2 * math.pi - 2 * math.asin(min(1, math.hypot(q[0] - cur[0], q[1] - cur[1]) / (2 * r))) if mare else 2 * math.asin(min(1, math.hypot(q[0] - cur[0], q[1] - cur[1]) / (2 * r)))) / 4)
                bucati.append(arc_din_bulge(cur, q, bulge if sweep == 0 else -bulge))
                cur = q
                i += 8
            else:  # Z
                if start and math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-9:
                    bucati.append(('L', cur, start))
                i += 1
        if plin:
            if math.hypot(pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]) <= 1e-6:
                pts.pop()
            seg.append(('T', *pts[:3]))
        else:
            seg += bucati
    citite = []
    for t in grup.iter(f'{ns}text'):
        x, y, marime = float(t.get('x')), float(t.get('y')), float(t.get('font-size'))
        verifica(t.get('text-anchor') == 'middle' and t.get('fill') == '#ff8800' and t.get('stroke') == 'none', f'SVG: textul {t.attrib}')
        verifica(t.get('font-family', '').startswith('Helvetica'), f'SVG: fontul {t.get("font-family")}')
        unghi = 0.0
        if t.get('transform'):
            # Cu Y în jos, rotirea trigonometrică a foii e cea negativă a SVG-ului, în jurul mijlocului bazei.
            m = re.fullmatch(r'rotate\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)', t.get('transform'))
            verifica(m is not None and float(m[2]) == x and float(m[3]) == y, f'SVG: rotirea {t.get("transform")}')
            unghi = -float(m[1]) if m else float('nan')
        citite.append({'text': t.text, 'p': (x, inalt - y), 'unghi': unghi, 'cap': marime * CAP_HELVETICA})
    if texte:
        compara_texte('SVG', citite, TOL_SVG)
    else:
        verifica(not citite, f'SVG: texte neașteptate {[x["text"] for x in citite]}')
    return compara_desen('SVG', seg, TOL_SVG, hartie)


# --- DIMENSION (felia 10.4↑c-2) ---------------------------------------------------------------------------------------------

# Codul DXF al fiecărui punct de definiție, cu numele lui la ezdxf.
PUNCTE_DIM = {10: 'defpoint', 13: 'defpoint2', 14: 'defpoint3', 15: 'defpoint4', 16: 'defpoint5'}
# Stilul CNCVS2, din setările corpusului (cele implicite, cu virgula): cifra de 3,5 mm deasupra liniei (DIMTAD 1), aliniată
# cu ea (DIMTIH, DIMTOH 0), golul ei 0,3 · 3,5; săgețile de 2,5 mm, pline (fără bare, DIMTSZ 0); extensiile de la 1 mm, cu
# 2 mm peste linie; zecimalele 2, virgula (44), zerourile de la coadă tăiate (DIMZIN 8); unghiurile în grade zecimale, cu 2
# zecimale; mm, fără scară (DIMLUNIT 2, DIMLFAC 1).
STIL_DIM = {'dimtxt': H, 'dimasz': CAP, 'dimexo': GOL, 'dimexe': DEP, 'dimgap': G, 'dimtad': 1, 'dimtih': 0, 'dimtoh': 0,
            'dimtsz': 0, 'dimdec': 2, 'dimdsep': 44, 'dimzin': 8, 'dimaunit': 0, 'dimadec': 2, 'dimlunit': 2, 'dimlfac': 1}


def verifica_dim(cale, ca_text):
    """Corpusul al doilea cu cotele ca DIMENSION: fiecare cotă e o entitate DIMENSION pe stratul cotelor, cu felul, punctele
    de definiție, măsura, textul și locul lui de pe hârtie, stilul CNCVS2, și blocul ei anonim cu desenul de pe hârtie
    (exact); cifra, ca trăsături, sau (`ca_text`) ca MTEXT."""
    nume = 'DIMENSION' + (' cu cifrele ca text' if ca_text else '')
    doc, auditor = recover.readfile(cale)
    verifica(not auditor.has_errors and len(auditor.fixes) == 0, f'{nume}: recover, {len(auditor.errors)} erori, {len(auditor.fixes)} reparații')
    audit = doc.audit()
    verifica(not audit.has_errors and len(audit.fixes) == 0, f'{nume}: audit, {len(audit.errors)} erori, {len(audit.fixes)} reparații {[str(f) for f in audit.fixes][:3]}')
    verifica(sorted(l.dxf.name for l in doc.layers if l.dxf.name != 'Defpoints') == sorted(['0', 'FOAIE', STRAT]), f'{nume}: straturile {[l.dxf.name for l in doc.layers]}')
    verifica(doc.dimstyles.has_entry('CNCVS2'), f'{nume}: stilul CNCVS2 lipsește')
    if doc.dimstyles.has_entry('CNCVS2'):
        st = doc.dimstyles.get('CNCVS2')
        for k, v in STIL_DIM.items():
            verifica(abs(st.dxf.get(k, float('nan')) - v) <= 1e-9, f'{nume}: {k} = {st.dxf.get(k)}, nu {v}')
    msp = list(doc.modelspace())
    dims = [e for e in msp if e.dxftype() == 'DIMENSION']
    verifica(not [e for e in msp if e.dxf.layer == STRAT and e.dxftype() != 'DIMENSION'], f'{nume}: alte entități pe stratul cotelor')
    verifica(len(dims) == len(COTE_2), f'{nume}: {len(dims)} DIMENSION, nu {len(COTE_2)}')
    c = hartie_cote()
    blocuri = set()
    for i, e in zip(COTE_2, dims):
        x = c[i]
        d, (text, p, unghi) = x['dim'], x['text']
        r = math.radians(unghi)
        verifica(e.dxf.layer == STRAT and e.dxf.dimstyle == 'CNCVS2', f'{nume} {i}: stratul {e.dxf.layer}, stilul {e.dxf.dimstyle}')
        verifica(e.dxf.dimtype == d['tip'] + d['steaguri'], f'{nume} {i}: felul {e.dxf.dimtype}, nu {d["tip"] + d["steaguri"]}')
        for cod, q in d['p'].items():
            v = e.dxf.get(PUNCTE_DIM[cod])
            verifica(v is not None and math.hypot(v.x - q[0], v.y - q[1]) <= TOL and v.z == 0, f'{nume} {i}: punctul {cod} {v}, nu {q}')
        for cod in set(PUNCTE_DIM) - set(d['p']):
            verifica(not e.dxf.hasattr(PUNCTE_DIM[cod]) or e.dxf.get(PUNCTE_DIM[cod]).isclose((0, 0, 0)), f'{nume} {i}: punctul {cod} în plus')
        verifica(abs(e.dxf.get('angle', 0) - d.get(50, 0)) <= TOL and e.dxf.hasattr('angle') == (50 in d), f'{nume} {i}: unghiul 50 {e.dxf.get("angle")}')
        verifica(abs(e.dxf.get('leader_length', 0) - d.get(40, 0)) <= TOL and e.dxf.hasattr('leader_length') == (40 in d), f'{nume} {i}: liderul {e.dxf.get("leader_length")}')
        # Măsura: ezdxf o calculează din punctele de definiție; aliniata (felul 1) o măsoară ezdxf după unghiul 50, pe care
        # DXF-ul nu-l dă felului 1, deci aici e distanța dintre 13 și 14, ca în referința DXF.
        m = math.hypot(e.dxf.defpoint3.x - e.dxf.defpoint2.x, e.dxf.defpoint3.y - e.dxf.defpoint2.y) if d['tip'] == 1 else e.get_measurement()
        verifica(abs(m - d['masura']) <= 1e-9, f'{nume} {i}: măsura {m}, nu {d["masura"]}')
        reala = math.radians(d['masura']) if d['tip'] in (2, 5) else d['masura']
        verifica(abs(e.dxf.get('actual_measurement', float('nan')) - reala) <= 1e-9, f'{nume} {i}: măsura scrisă {e.dxf.get("actual_measurement")}')
        verifica(e.dxf.text == text, f'{nume} {i}: textul {e.dxf.text!r}, nu {text!r}')
        verifica(e.dxf.attachment_point == 5, f'{nume} {i}: textul agățat de {e.dxf.attachment_point}')
        mijloc = plus(p, (-math.sin(r), math.cos(r)), H / 2)
        tm = e.dxf.text_midpoint
        verifica(math.hypot(tm.x - mijloc[0], tm.y - mijloc[1]) <= TOL, f'{nume} {i}: mijlocul textului {tm}, nu {mijloc}')
        bloc = e.get_geometry_block()
        verifica(bloc is not None and e.dxf.geometry.startswith('*D') and e.dxf.geometry not in blocuri, f'{nume} {i}: blocul {e.dxf.geometry}')
        blocuri.add(e.dxf.geometry)
        if bloc is None:
            continue
        verifica(bloc.block.dxf.flags & 1 == 1, f'{nume} {i}: blocul nu e anonim')
        ent = list(bloc)
        verifica(all(z.dxf.layer == STRAT for z in ent), f'{nume} {i}: desenul în afara stratului cotelor')
        texte = [z for z in ent if z.dxftype() == 'MTEXT']
        una_la_una(f'{nume} {i}', segmente_dxf([z for z in ent if z.dxftype() != 'MTEXT']), x['seg'] + ([] if ca_text else cifre(text, p, unghi)))
        if not ca_text:
            verifica(not texte, f'{nume} {i}: MTEXT cu cifrele ca trăsături')
            continue
        verifica(len(texte) == 1, f'{nume} {i}: {len(texte)} MTEXT')
        for t in texte:
            ins, dr = t.dxf.insert, t.dxf.text_direction
            verifica(math.hypot(ins.x - mijloc[0], ins.y - mijloc[1]) <= TOL and t.dxf.attachment_point == 5, f'{nume} {i}: MTEXT în {ins}, agățat de {t.dxf.attachment_point}')
            verifica(abs(t.dxf.char_height - H) <= TOL, f'{nume} {i}: MTEXT înalt de {t.dxf.char_height}')
            verifica(math.hypot(dr.x - math.cos(r), dr.y - math.sin(r)) <= TOL, f'{nume} {i}: MTEXT pe direcția {dr}')
            verifica(t.plain_text() == text, f'{nume} {i}: MTEXT {t.plain_text()!r}, nu {text!r}')
    return len(dims)


def main(dosar):
    n_dxf, n_h = verifica_dxf(f'{dosar}/cote.dxf')
    ab_pdf = verifica_pdf(f'{dosar}/cote.pdf')
    ab_svg = verifica_svg(f'{dosar}/cote.svg')
    ab_eps = desene_eps_cote(f'{dosar}/cote.eps')
    if os.path.exists(f'{dosar}/cote-eps.pdf'):
        ab_gs = verifica_gs(f'{dosar}/cote-eps.pdf')
    else:
        verifica(False, 'cote-eps.pdf lipsește: EPS-ul cotelor n-a trecut prin Ghostscript')
        ab_gs = float('nan')
    # Corpusul al doilea (felia 10.4↑c-2): toate felurile, ca DIMENSION (cu cifrele ca trăsături, apoi ca text), și cifrele ca
    # text în SVG, PDF și EPS (direct și prin Ghostscript).
    n_dim = verifica_dim(f'{dosar}/cote-dim.dxf', False)
    verifica_dim(f'{dosar}/cote-text.dxf', True)
    h2 = hartie_fara_cifre()
    pline2 = sum(1 for x in h2 if x[0] == 'T')
    ab2 = [verifica_pdf(f'{dosar}/cote-text.pdf', h2, pline2, True), verifica_svg(f'{dosar}/cote-text.svg', h2, True),
           desene_eps_cote(f'{dosar}/cote-text.eps', h2, True)]
    if os.path.exists(f'{dosar}/cote-text-eps.pdf'):
        ab2.append(verifica_gs(f'{dosar}/cote-text-eps.pdf', h2, True))
    else:
        verifica(False, 'cote-text-eps.pdf lipsește: EPS-ul cu textul n-a trecut prin Ghostscript')
    if probleme:
        print('COTELE ÎN EXPORTUL 2D: abateri față de hârtie:')
        for x in probleme[:40]:
            print('  -', x)
        if len(probleme) > 40:
            print(f'  … și încă {len(probleme) - 40}')
        sys.exit(1)
    print(f'cotele în exportul 2D: DXF {n_dxf} segmente, exact cele {n_h} de pe hârtie (ezdxf {ezdxf.__version__}: 0 erori, 0 reparații); '
          f'abaterea max: PDF {ab_pdf:.6f} mm, SVG {ab_svg:.6f} mm, EPS {ab_eps:.6f} mm, prin Ghostscript {ab_gs:.6f} mm; '
          f'{n_dim} cote ca DIMENSION (felul, punctele, măsura, textul, stilul CNCVS2, blocul exact), cu cifrele ca trăsături și ca '
          f'MTEXT; cifrele ca text în PDF, SVG, EPS și prin Ghostscript, liniile la cel mult {max(ab2):.6f} mm')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1] if len(sys.argv) > 1 else '.tmp/export2d')
