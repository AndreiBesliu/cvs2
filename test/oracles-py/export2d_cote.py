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


def pe_hartie():
    """Segmentele cotelor corpusului, pe hârtie (mm ai foii, Y în sus)."""
    s = []
    # h: orizontala (20, 20)–(120, 40), d = 15: linia la y = 30 + 15 = 45; extensiile de la golul de 1 mm până la 2 mm peste
    # linie; săgețile spre înăuntru; „100” centrat pe x = 70, cu baza la 45 + 0,3 · 3,5.
    s += [('L', (20, 21), (20, 47)), ('L', (120, 41), (120, 47)), ('L', (20, 45), (120, 45))]
    s += [sageata((20, 45), (1, 0)), sageata((120, 45), (-1, 0))]
    s += cifre('100', (70, 45 + G), 0)
    # v: verticala (200, 20)–(210, 80), d = 20: linia la x = 205 − 20 = 185 (spre stânga); „60” citit de jos în sus (90°),
    # cu baza la 185 − 0,3 · 3,5, centrat pe y = 50.
    s += [('L', (199, 20), (183, 20)), ('L', (209, 80), (183, 80)), ('L', (185, 20), (185, 80))]
    s += [sageata((185, 20), (0, 1)), sageata((185, 80), (0, -1))]
    s += cifre('60', (185 - G, 50), 90)
    # u: unghiul din (40, 120), laturile spre (60, 120) și (40, 140), arcul de rază 25 de la 0° la 90° (trigonometric);
    # extensiile de la 20 + 1 la 25 + 2 pe fiecare latură; săgețile din capetele arcului, cu baza pe coarda spre punctul de pe
    # arc aflat la 2,5 / 25 rad mai înăuntru; „90°” la mijlocul arcului (45°), tangent, citibil (−45°), cu baza la un gol în
    # afara arcului.
    v = (40, 120)
    s += [('A', v, 25, 0.0, math.pi / 2), ('L', (61, 120), (67, 120)), ('L', (40, 141), (40, 147))]
    dt = CAP / 25
    pe = lambda t: (v[0] + 25 * math.cos(t), v[1] + 25 * math.sin(t))
    p0, p1 = pe(0), pe(math.pi / 2)
    s += [sageata(p0, unit((pe(dt)[0] - p0[0], pe(dt)[1] - p0[1]))), sageata(p1, unit((pe(math.pi / 2 - dt)[0] - p1[0], pe(math.pi / 2 - dt)[1] - p1[1])))]
    s += cifre('90°', plus(v, (math.sqrt(0.5), math.sqrt(0.5)), 25 + G), -45)
    # d: diametrul cercului (240, 150), R20, cifra în afară la d = 8: lățimea estimată a lui „Ø40” e 3 · 0,6 · 3,5 = 6,3, deci
    # mijlocul cifrei la 20 + max(8, 1,05 + 3,15) = 28 de centru, iar linia de la −20 la max(20, 28 + 3,15) = 31,15; săgețile
    # în (260, 150) și (220, 150), spre centru.
    s += [('L', (220, 150), (271.15, 150)), sageata((260, 150), (-1, 0)), sageata((220, 150), (1, 0))]
    s += cifre('Ø40', (268, 150 + G), 0)
    return s


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


def compara_desen(nume, desenat, tol):
    """`desenat`: segmentele citite din fișier (L, C, T), în mm. Fiecare punct desenat e pe hârtie, fiecare segment de pe
    hârtie e desenat; triunghiurile pline, câte unul pe fiecare săgeată de pe hârtie. Întoarce abaterea maximă."""
    hartie = pe_hartie()
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
    citite = []
    for e in msp:
        if e.dxf.layer != STRAT:
            continue
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
        else:
            cp = [(p[0], p[1]) for p in e.control_points]
            verifica(e.dxf.degree == 3 and (len(cp) - 1) % 3 == 0, 'SPLINE: Bézier de grad 3 în lanț')
            citite += [('C', *cp[i:i + 4]) for i in range(0, len(cp) - 1, 3)]
    hartie = pe_hartie()
    ramase = list(citite)
    for s in hartie:
        k = next((i for i, x in enumerate(ramase) if egale(s, x)), None)
        if k is None:
            verifica(False, f'DXF: segmentul de pe hârtie {s[0]} {s[1]}… lipsește')
        else:
            ramase.pop(k)
    verifica(not ramase, f'DXF: {len(ramase)} segmente în plus, primul {ramase[:1]}')
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


def verifica_pdf(cale):
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
    pline = [d for d in ale_cotelor if d.get('type') == 'f']
    verifica(len(pline) == 8, f'PDF: {len(pline)} capete pline')
    return compara_desen('PDF', din_desene(ale_cotelor, Hpt, e_cota), TOL_PDF)


def verifica_gs(cale):
    doc = fitz.open(cale)
    pagina = doc[0]
    cai = pagina.get_drawings()
    return compara_desen('EPS prin Ghostscript', din_desene(cai, pagina.rect.height, e_cota), TOL_GS)


def desene_eps_cote(cale):
    """Căile EPS-ului nostru, citite direct din text (subsetul pe care îl scriem, cu `fill` și `setlinewidth`)."""
    text = open(cale, encoding='ascii').read()
    box = [float(x) for x in text.split('%%HiResBoundingBox:')[1].split('\n')[0].split()]
    Hpt = box[3] - box[1]
    verifica(f'% Stratul {STRAT}' in text, 'EPS: comentariul stratului cotelor')
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
    return compara_desen('EPS', din_desene(cai, Hpt, e_cota), TOL_PDF)


def verifica_svg(cale):
    """Grupul stratului cotelor (strat Inkscape, culoarea, grosimea) și căile lui: M, L, C, A, Z absolute, cu Y în jos."""
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
    return compara_desen('SVG', seg, TOL_SVG)


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
    if probleme:
        print('COTELE ÎN EXPORTUL 2D: abateri față de hârtie:')
        for x in probleme[:40]:
            print('  -', x)
        if len(probleme) > 40:
            print(f'  … și încă {len(probleme) - 40}')
        sys.exit(1)
    print(f'cotele în exportul 2D: DXF {n_dxf} segmente, exact cele {n_h} de pe hârtie (ezdxf {ezdxf.__version__}: 0 erori, 0 reparații); '
          f'abaterea max: PDF {ab_pdf:.6f} mm, SVG {ab_svg:.6f} mm, EPS {ab_eps:.6f} mm, prin Ghostscript {ab_gs:.6f} mm')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1] if len(sys.argv) > 1 else '.tmp/export2d')
