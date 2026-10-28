"""Corpusul independent al importului DXF (ADR 0101): DXF-uri scrise de ezdxf (alt program decât aplicația) și valorile lor pe
hârtie, scrise cu formule, nu din codul aplicației. Portat din sonda s2 (`docs/faza2/sonde/s2-export-import/cod/oracle/
gen_inputs.py`), doar partea DXF.

Folosire: `python test/oracles-py/dxf_import_corpus.py` (cu ezdxf 1.4.4, `test/oracles-py/requirements.txt`). Scrie
`test/fixtures/dxf/` (cele trei DXF-uri și `asteptat.json`); fișierele se comit, iar probele unitare le citesc
(`test/unit/dxf.corpus.test.ts`). ezdxf scrie data creării în antet, deci o rulare nouă schimbă octeții, nu geometria.
"""
import json
import os
import sys
from math import atan2, cos, hypot, pi, radians, sin, sqrt

import ezdxf

sys.stdout.reconfigure(encoding='utf-8')

AICI = os.path.dirname(os.path.abspath(__file__))
IESIRE = os.path.join(AICI, '..', 'fixtures', 'dxf')
os.makedirs(IESIRE, exist_ok=True)
ASTEPTAT = {}


# Verificarea încrucișată: valorile pe hârtie (formulele de aici) față de entitățile exacte pe care le dă ezdxf (blocurile,
# polilinii și matricile desfăcute de ezdxf, cu OCS-ul lor trecut în WCS). Nu `ezdxf.path`: acolo arcele sunt cubice
# aproximate. O formulă greșită oprește generatorul, înainte de orice fișier scris.
def wcs(e, p):
    q = e.ocs().to_wcs(p)
    return (q.x, q.y)


def primitive_ezdxf(entitati):
    """Primitivele WCS ale entităților: linii, cercuri, arce (cu mijlocul), elipse (cu puncte exacte), curbe (spline)."""
    rez = []
    for e in entitati:
        t = e.dxftype()
        if t == 'INSERT':
            for c in (list(e.multi_insert()) if e.mcount > 1 else [e]):
                rez += primitive_ezdxf(list(c.virtual_entities()))
        elif t in ('LWPOLYLINE', 'POLYLINE'):
            rez += primitive_ezdxf(list(e.virtual_entities()))
        elif t == 'LINE':
            rez.append({'tip': 'linie', 'a': (e.dxf.start.x, e.dxf.start.y), 'b': (e.dxf.end.x, e.dxf.end.y)})
        elif t == 'CIRCLE':
            rez.append({'tip': 'cerc', 'c': wcs(e, e.dxf.center), 'r': e.dxf.radius})
        elif t == 'ARC':
            c, r = e.dxf.center, e.dxf.radius
            a0, a1 = e.dxf.start_angle, e.dxf.end_angle
            m = radians(a0 + ((a1 - a0) % 360) / 2)
            ocs = lambda u: wcs(e, (c.x + r * cos(u), c.y + r * sin(u), c.z))
            rez.append({'tip': 'arc', 'c': wcs(e, c), 'r': r, 'p0': ocs(radians(a0)), 'p1': ocs(radians(a1)), 'mijloc': ocs(m)})
        elif t == 'ELLIPSE':
            ce = e.construction_tool()
            t0, t1 = e.dxf.start_param, e.dxf.end_param
            dt = (t1 - t0) % (2 * pi) or 2 * pi
            pts = [(v.x, v.y) for v in ce.vertices([t0 + dt * k / 64 for k in range(65)])]
            rez.append({'tip': 'elipsa', 'puncte': pts, 'inchisa': abs(dt - 2 * pi) < 1e-12})
        elif t == 'SPLINE':
            rez.append({'tip': 'curba', 'puncte': esantioane(e, 64)})
    return rez


def aproape(p, q, tol=1e-6):
    return hypot(p[0] - q[0], p[1] - q[1]) <= tol


def verifica_linii(prim, linii):
    for a, b in linii:
        assert any(k['tip'] == 'linie' and ((aproape(k['a'], a) and aproape(k['b'], b)) or (aproape(k['a'], b) and aproape(k['b'], a)))
                   for k in prim), ('linia', a, b)


def pe_cerc(pts, c, r):
    return all(abs(hypot(p[0] - c[0], p[1] - c[1]) - r) <= 1e-9 * max(1, r) for p in pts)


def verifica_cercuri(prim, cercuri):
    for c, r in cercuri:
        assert any((k['tip'] == 'cerc' and aproape(k['c'], c, 1e-9) and abs(k['r'] - r) <= 1e-9)
                   or (k['tip'] in ('curba', 'elipsa') and aproape(k['puncte'][0], k['puncte'][-1], 1e-9) and pe_cerc(k['puncte'], c, r))
                   for k in prim), ('cercul', c, r)


def verifica_arce(prim, arce):
    for a in arce:
        assert any(k['tip'] == 'arc' and aproape(k['c'], a['c'], 1e-9) and abs(k['r'] - a['r']) <= 1e-9 and aproape(k['p0'], a['p0'], 1e-9)
                   and aproape(k['p1'], a['p1'], 1e-9) and aproape(k['mijloc'], a['mijloc'], 1e-9) for k in prim), ('arcul', a)


def pe_elipsa(p, e, tol=1e-9):
    t = radians(e['rot_grade'])
    dx, dy = p[0] - e['c'][0], p[1] - e['c'][1]
    u, v = dx * cos(t) + dy * sin(t), -dx * sin(t) + dy * cos(t)
    return abs(sqrt((u / e['a']) ** 2 + (v / e['b']) ** 2) - 1) <= tol


def verifica_elipse(prim, elipse):
    for e in elipse:
        assert any(k['tip'] == 'elipsa' and k['inchisa'] and all(pe_elipsa(p, e) for p in k['puncte']) for k in prim), ('elipsa', e)


def verifica_arce_eliptice(prim, arce):
    for e in arce:
        # Mijlocul parametric (eșantionul 32 din 64): capetele singure nu spun pe care parte a elipsei merge arcul.
        assert any(k['tip'] == 'elipsa' and not k['inchisa'] and aproape(k['puncte'][0], e['p0'], 1e-9)
                   and aproape(k['puncte'][-1], e['p1'], 1e-9) and aproape(k['puncte'][32], e['mijloc'], 1e-9)
                   and all(pe_elipsa(p, e) for p in k['puncte']) for k in prim), ('arcul eliptic', e)


def mijloc_arc(c, r, a0, a1):
    """Mijlocul arcului trigonometric de la a0 la a1 (grade), în OCS +Z."""
    da = (a1 - a0) % 360
    m = radians(a0 + da / 2)
    return [c[0] + r * cos(m), c[1] + r * sin(m)]


def esantioane(e, n=200):
    """Punctele curbei SPLINE la n + 1 parametri egali pe domeniul ei, evaluate de ezdxf (alt cod decât aplicația)."""
    bs = e.construction_tool()
    u = list(bs.knots())
    p = bs.degree
    t0, t1 = u[p], u[len(u) - 1 - p]
    return [[q.x, q.y] for q in (bs.point(t0 + (t1 - t0) * k / n) for k in range(n + 1))]


def blocuri_comune(doc):
    blk = doc.blocks.new('BLK')  # cerc R10 + linie, pe stratul 0 (moștenește stratul INSERT-ului)
    blk.add_circle((0, 0), 10, dxfattribs={'layer': '0'})
    blk.add_line((0, 0), (10, 0), dxfattribs={'layer': '0'})
    outer = doc.blocks.new('OUTER')  # bloc imbricat
    outer.add_blockref('BLK', (10, 0), dxfattribs={'xscale': 0.5, 'yscale': 0.5})
    base = doc.blocks.new('BASE', base_point=(5, 5))  # punct de bază diferit de origine
    base.add_circle((5, 5), 3)


def inserari(msp):
    msp.add_blockref('BLK', (100, 300), dxfattribs={'xscale': 2, 'yscale': 2, 'rotation': 30, 'layer': 'BLOCURI'})
    msp.add_blockref('BLK', (200, 300), dxfattribs={'xscale': 2, 'yscale': 1, 'rotation': 30, 'layer': 'BLOCURI'})
    msp.add_blockref('BLK', (300, 300), dxfattribs={'xscale': -1, 'yscale': 1, 'layer': 'BLOCURI'})
    msp.add_blockref('OUTER', (400, 300), dxfattribs={'rotation': 90, 'layer': 'BLOCURI'})
    msp.add_blockref('BASE', (500, 300), dxfattribs={'layer': 'BLOCURI'})


INSERARI_ASTEPTAT = {
    # Cercul R10 scalat 2 → R20 la (100, 300); oglindit → R10 la (300, 300); imbricat: BLK pus în OUTER LA (10, 0), cu
    # conținutul ×0,5 (R5), apoi OUTER rotit 90° la (400, 300): (x, y) → (400 − y, 300 + x), deci centrul (400, 310); cu
    # punctul de bază (5, 5): cercul de la (5, 5) ajunge la (500, 300).
    'cercuri': [[[100, 300], 20], [[300, 300], 10], [[400, 310], 5], [[500, 300], 3]],
    # Scalarea neuniformă (2, 1), rotită 30°: elipsa 20 × 10.
    'elipse': [{'c': [200, 300], 'a': 20, 'b': 10, 'rot_grade': 30}],
    # Linia (0, 0)–(10, 0): ×2 rotită 30°; oglindită; imbricată: în OUTER (10, 0)..(15, 0), rotit 90° → (400, 310)..(400, 315).
    'linii': [[[100, 300], [100 + 20 * cos(radians(30)), 300 + 20 * sin(radians(30))]],
              [[300, 300], [290, 300]],
              [[400, 310], [400, 315]]],
}


def r2018():
    doc = ezdxf.new('R2018', setup=False)
    doc.header['$INSUNITS'] = 4
    for nume in ('TAIERE', 'GRAVARE', 'GRAVURĂ', 'BLOCURI'):
        doc.layers.add(nume)
    blocuri_comune(doc)
    msp = doc.modelspace()
    msp.add_line((0, 0), (100, 0), dxfattribs={'layer': 'GRAVURĂ'})
    msp.add_arc((50, 50), 20, 30, 120, dxfattribs={'layer': 'TAIERE'})
    msp.add_circle((200, 50), 25, dxfattribs={'layer': 'TAIERE'})
    msp.add_ellipse((300, 50), major_axis=(40 * cos(radians(30)), 40 * sin(radians(30)), 0), ratio=0.5, dxfattribs={'layer': 'TAIERE'})
    msp.add_ellipse((400, 50), major_axis=(30, 0, 0), ratio=0.5, start_param=0, end_param=pi / 2, dxfattribs={'layer': 'TAIERE'})
    # Dreptunghiul rotunjit 100 × 50, R5, ca LWPOLYLINE cu bulge.
    b = 0.41421356237309503
    pts = [(505, 0, 0, 0, 0), (595, 0, 0, 0, b), (600, 5, 0, 0, 0), (600, 45, 0, 0, b), (595, 50, 0, 0, 0), (505, 50, 0, 0, b),
           (500, 45, 0, 0, 0), (500, 5, 0, 0, b)]
    msp.add_lwpolyline(pts, format='xyseb', close=True, dxfattribs={'layer': 'GRAVARE'})
    # POLYLINE 2D (vechi) cu bulge: jumătate de disc R20, centrul (620, 0).
    pl = msp.add_polyline2d([(600, 0), (640, 0)], close=True, dxfattribs={'layer': 'GRAVARE'})
    pl.vertices[0].dxf.bulge = 0.0
    pl.vertices[1].dxf.bulge = 1.0
    # SPLINE cubică = un Bézier.
    bez = msp.add_open_spline([(0, 200), (50, 260), (100, 140), (150, 200)], degree=3, knots=[0, 0, 0, 0, 1, 1, 1, 1], dxfattribs={'layer': 'GRAVARE'})
    # SPLINE B-spline adevărat (noduri simple interioare): 6 puncte de control.
    bsp = msp.add_open_spline([(200, 150), (230, 220), (270, 130), (310, 230), (350, 140), (380, 200)], degree=3,
                              knots=[0, 0, 0, 0, 1, 2, 3, 3, 3, 3], dxfattribs={'layer': 'GRAVARE'})
    # SPLINE rațională (NURBS): cercul R25 la (500, 200), grad 2, 9 puncte de control, ponderi √2/2.
    w = sqrt(2) / 2
    cx, cy, r = 500, 200, 25
    cps = [(cx + r, cy), (cx + r, cy + r), (cx, cy + r), (cx - r, cy + r), (cx - r, cy), (cx - r, cy - r), (cx, cy - r), (cx + r, cy - r), (cx + r, cy)]
    msp.add_rational_spline(cps, [1, w, 1, w, 1, w, 1, w, 1], degree=2, knots=[0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4], dxfattribs={'layer': 'GRAVARE'})
    # ARC cu extrudarea (0, 0, −1): în OCS centrul (50, 100), R10, 0 → 90°, deci în WCS centrul (−50, 100), de la 180° la 90°
    # (în sens orar), prin (−50 − 10·cos 45°, 100 + 10·sin 45°).
    msp.add_arc((50, 100), 10, 0, 90, dxfattribs={'layer': 'TAIERE', 'extrusion': (0, 0, -1)})
    inserari(msp)
    msp.add_text('ABC', dxfattribs={'layer': 'GRAVARE', 'insert': (0, -50), 'height': 5})
    doc.saveas(os.path.join(IESIRE, 'in-R2018-mm.dxf'))
    m_ocs = mijloc_arc([50, 100], 10, 0, 90)
    a = {
        'mm_pe_unitate': 1.0,
        'straturi': ['TAIERE', 'GRAVARE', 'GRAVURĂ', 'BLOCURI'],
        'linii': [[[0, 0], [100, 0]]] + INSERARI_ASTEPTAT['linii'],
        'arce': [{'c': [50, 50], 'r': 20, 'p0': [50 + 20 * cos(radians(30)), 50 + 20 * sin(radians(30))],
                  'p1': [50 + 20 * cos(radians(120)), 50 + 20 * sin(radians(120))], 'mijloc': mijloc_arc([50, 50], 20, 30, 120)},
                 {'c': [-50, 100], 'r': 10, 'p0': [-60, 100], 'p1': [-50, 110], 'mijloc': [-m_ocs[0], m_ocs[1]],
                  'nota': 'OCS (0, 0, −1): oglindit'}],
        'cercuri': [[[200, 50], 25], [[500, 200], 25]] + INSERARI_ASTEPTAT['cercuri'],
        'elipse': [{'c': [300, 50], 'a': 40, 'b': 20, 'rot_grade': 30}] + INSERARI_ASTEPTAT['elipse'],
        'arce_eliptice': [{'c': [400, 50], 'a': 30, 'b': 15, 'rot_grade': 0, 'p0': [430, 50], 'p1': [400, 65],
                           'mijloc': [400 + 30 * cos(pi / 4), 50 + 15 * sin(pi / 4)]}],
        'arii': [{'ce': 'dreptunghiul rotunjit 100 × 50 R5', 'arie': 5000 - (4 - pi) * 25, 'cutie': [500, 0, 600, 50]},
                 {'ce': 'semidiscul R20 (POLYLINE vechi)', 'arie': pi * 400 / 2, 'cutie': [600, 0, 640, 20]}],
        'bezier': [[0, 200], [50, 260], [100, 140], [150, 200]],
        'bspline': {'puncte': [[200, 150], [230, 220], [270, 130], [310, 230], [350, 140], [380, 200]],
                    'noduri': [0, 0, 0, 0, 1, 2, 3, 3, 3, 3], 'grad': 3},
        'curbe': [{'ce': 'Bézier-ul', 'inchis': False, 'puncte': esantioane(bez)},
                  {'ce': 'B-spline-ul cu 6 puncte de control', 'inchis': False, 'puncte': esantioane(bsp)}],
        'sarite': {'TEXT': 1},
        # 10 închise: cercul, elipsa, dreptunghiul rotunjit, semidiscul, cercul NURBS, cele 3 cercuri BLK (unul e elipsa
        # scalării neuniforme), cercul din OUTER, cercul din BASE. 10 deschise: linia, arcul, arcul eliptic, Bézier-ul,
        # B-spline-ul, arcul OCS, cele 3 linii BLK, linia din OUTER. Niciun capăt comun pe același strat.
        'numar_cai': {'inchise': 10, 'deschise': 10},
    }
    cai = primitive_ezdxf(msp)
    verifica_linii(cai, a['linii'])
    verifica_cercuri(cai, a['cercuri'])
    verifica_arce(cai, a['arce'])
    verifica_elipse(cai, a['elipse'])
    verifica_arce_eliptice(cai, a['arce_eliptice'])
    ASTEPTAT['in-R2018-mm.dxf'] = a


def r2000_toli():
    doc = ezdxf.new('R2000', setup=False)
    doc.header['$INSUNITS'] = 1  # țoli
    doc.header['$MEASUREMENT'] = 0
    msp = doc.modelspace()
    msp.add_line((0, 0), (1, 0))
    msp.add_circle((2, 0), 0.5)
    msp.add_arc((4, 0), 1, 0, 90)
    doc.saveas(os.path.join(IESIRE, 'in-R2000-toli.dxf'))
    ASTEPTAT['in-R2000-toli.dxf'] = {
        'mm_pe_unitate': 25.4, 'linii': [[[0, 0], [25.4, 0]]], 'cercuri': [[[50.8, 0], 12.7]],
        'arce': [{'c': [101.6, 0], 'r': 25.4, 'p0': [127.0, 0], 'p1': [101.6, 25.4], 'mijloc': [101.6 + 25.4 * cos(pi / 4), 25.4 * sin(pi / 4)]}],
        'numar_cai': {'inchise': 1, 'deschise': 2},
    }
    # În unitățile fișierului (țoli), înainte de mm.
    cai = primitive_ezdxf(msp)
    verifica_linii(cai, [[[0, 0], [1, 0]]])
    verifica_cercuri(cai, [[[2, 0], 0.5]])
    verifica_arce(cai, [{'c': [4, 0], 'r': 1, 'p0': [5, 0], 'p1': [4, 1], 'mijloc': mijloc_arc([4, 0], 1, 0, 90)}])


def r12():
    doc = ezdxf.new('R12', setup=False)
    for nume in ('TAIERE', 'BLOCURI'):
        doc.layers.add(nume)
    blk = doc.blocks.new('BLK')
    blk.add_circle((0, 0), 10, dxfattribs={'layer': '0'})
    blk.add_line((0, 0), (10, 0), dxfattribs={'layer': '0'})
    msp = doc.modelspace()
    msp.add_line((0, 0), (100, 0), dxfattribs={'layer': 'TAIERE'})
    msp.add_arc((50, 50), 20, 30, 120, dxfattribs={'layer': 'TAIERE'})
    msp.add_circle((200, 50), 25, dxfattribs={'layer': 'TAIERE'})
    pl = msp.add_polyline2d([(600, 0), (640, 0)], close=True, dxfattribs={'layer': 'TAIERE'})
    pl.vertices[1].dxf.bulge = 1.0
    msp.add_blockref('BLK', (100, 300), dxfattribs={'xscale': 2, 'yscale': 2, 'rotation': 30, 'layer': 'BLOCURI'})
    msp.add_blockref('BLK', (200, 300), dxfattribs={'xscale': 2, 'yscale': 1, 'rotation': 30, 'layer': 'BLOCURI'})
    doc.saveas(os.path.join(IESIRE, 'in-R12.dxf'))
    a = {
        # R12 fără $INSUNITS: mm, cu avertismentul.
        'mm_pe_unitate': 1.0, 'fara_unitati': True, 'straturi': ['TAIERE', 'BLOCURI'],
        'linii': [[[0, 0], [100, 0]], INSERARI_ASTEPTAT['linii'][0]],
        'arce': [{'c': [50, 50], 'r': 20, 'p0': [50 + 20 * cos(radians(30)), 50 + 20 * sin(radians(30))],
                  'p1': [50 + 20 * cos(radians(120)), 50 + 20 * sin(radians(120))], 'mijloc': mijloc_arc([50, 50], 20, 30, 120)}],
        'cercuri': [[[200, 50], 25], [[100, 300], 20]],
        'elipse': [INSERARI_ASTEPTAT['elipse'][0]],
        'arii': [{'ce': 'semidiscul R20 (POLYLINE R12)', 'arie': pi * 400 / 2, 'cutie': [600, 0, 640, 20]}],
        # 4 închise: cercul, semidiscul, cercul BLK ×2, elipsa BLK (2, 1); 4 deschise: linia, arcul, cele 2 linii BLK.
        'numar_cai': {'inchise': 4, 'deschise': 4},
    }
    cai = primitive_ezdxf(msp)
    verifica_linii(cai, a['linii'])
    verifica_cercuri(cai, a['cercuri'])
    verifica_arce(cai, a['arce'])
    verifica_elipse(cai, a['elipse'])
    ASTEPTAT['in-R12.dxf'] = a


def r2018_atelier():
    """Ce vine din atelier: contururi din bucăți (linii și arce), capete în T, straturi oprite, spațiul hârtiei, OCS-ul
    oglindit pe polilinie, elipsă și bloc, blocul în matrice (MINSERT), o polilinie 3D, o spline închisă periodică și
    entitățile pe care importul le sare."""
    doc = ezdxf.new('R2018', setup=False)
    doc.header['$INSUNITS'] = 4
    for nume in ('TAIERE', 'GRAVARE', 'BLOCURI'):
        doc.layers.add(nume)
    doc.layers.add('OPRIT').off()
    doc.layers.add('INGHETAT').freeze()
    blk = doc.blocks.new('BLK')
    blk.add_circle((0, 0), 10, dxfattribs={'layer': '0'})
    blk.add_line((0, 0), (10, 0), dxfattribs={'layer': '0'})
    blk2 = doc.blocks.new('ARC90')
    blk2.add_arc((0, 0), 10, 0, 90, dxfattribs={'layer': '0'})
    msp = doc.modelspace()
    t = {'layer': 'TAIERE'}
    # (1) Dreptunghiul 60 × 40 din 4 linii, scrise în altă ordine și în sensuri amestecate: un contur închis.
    msp.add_line((60, -60), (60, -100), dxfattribs=t)
    msp.add_line((0, -60), (0, -100), dxfattribs=t)
    msp.add_line((0, -100), (60, -100), dxfattribs=t)
    msp.add_line((0, -60), (60, -60), dxfattribs=t)
    # (2) Canalul: două linii și două semicercuri R10 (centrele (100, −90) și (140, −90)): un contur închis.
    msp.add_line((100, -100), (140, -100), dxfattribs=t)
    msp.add_arc((140, -90), 10, -90, 90, dxfattribs=t)
    msp.add_line((140, -80), (100, -80), dxfattribs=t)
    msp.add_arc((100, -90), 10, 90, 270, dxfattribs=t)
    # (3) Trei linii cu un capăt comun în (200, −100): acolo nu se leagă (trei capete).
    msp.add_line((180, -100), (200, -100), dxfattribs=t)
    msp.add_line((200, -100), (220, -100), dxfattribs=t)
    msp.add_line((200, -100), (200, -80), dxfattribs=t)
    # (4) LWPOLYLINE fără steagul de închidere, cu ultimul punct peste primul: triunghiul, închis.
    msp.add_lwpolyline([(300, -100), (340, -100), (340, -60), (300, -100)], dxfattribs=t)
    # (5) Ascunse: un cerc pe un strat oprit, o linie pe un strat înghețat, un cerc invizibil (60 = 1).
    msp.add_circle((400, -80), 10, dxfattribs={'layer': 'OPRIT'})
    msp.add_line((380, -100), (420, -100), dxfattribs={'layer': 'INGHETAT'})
    msp.add_circle((440, -80), 5, dxfattribs={'layer': 'TAIERE', 'invisible': 1})
    # (6) O linie în spațiul hârtiei (67 = 1): nu e desenul.
    doc.layout('Layout1').add_line((0, 0), (10, 10), dxfattribs=t)
    # (7) OCS (0, 0, −1) pe LWPOLYLINE (semicercul cu bulge 1, oglindit) și pe ELLIPSE (sfertul, parcurs invers).
    msp.add_lwpolyline([(10, -150, 0, 0, 1), (30, -150, 0, 0, 0)], format='xyseb', dxfattribs={'layer': 'TAIERE', 'extrusion': (0, 0, -1)})
    msp.add_ellipse((500, 50), major_axis=(30, 0, 0), ratio=0.5, start_param=0, end_param=pi / 2, dxfattribs={'layer': 'TAIERE', 'extrusion': (0, 0, -1)})
    # (8) MINSERT: BLK în 3 coloane × 2 rânduri, rotit 90°, în (0, −300), coloanele la 50, rândurile la 30. Celula (c, r) e în
    # (0, −300) + R(90°)·(50c, 30r) = (−30r, −300 + 50c).
    msp.add_blockref('BLK', (0, -300), dxfattribs={'layer': 'BLOCURI', 'rotation': 90, 'column_count': 3, 'row_count': 2,
                                                   'column_spacing': 50, 'row_spacing': 30})
    celule = [(-30 * rr, -300 + 50 * cc) for rr in range(2) for cc in range(3)]
    # (9) INSERT cu extrudarea (0, 0, −1), în OCS (100, −200): în WCS (−100, −200), blocul oglindit.
    msp.add_blockref('BLK', (100, -200), dxfattribs={'layer': 'BLOCURI', 'extrusion': (0, 0, -1)})
    # (10) POLYLINE 3D cu Z variabil: proiectată pe XY.
    msp.add_polyline3d([(500, -100, 0), (540, -100, 10), (540, -60, 20)], dxfattribs=t)
    # (11) SPLINE închisă periodică (noduri uniforme, neprinse): grad 3, 4 puncte de control (plus primele 3, repetate).
    per = msp.add_spline(dxfattribs={'layer': 'GRAVARE'})
    per.set_closed([(600, -100, 0), (640, -100, 0), (640, -60, 0), (600, -60, 0)], degree=3)
    # (12) Un arc într-un bloc cu scalarea (2, 1): arc eliptic, de la (720, −100) la (700, −90).
    msp.add_blockref('ARC90', (700, -100), dxfattribs={'layer': 'BLOCURI', 'xscale': 2, 'yscale': 1})
    # (13) Sărite: hașura, punctul, textul multi-linie, fața 3D.
    h = msp.add_hatch(dxfattribs=t)
    h.paths.add_polyline_path([(800, -100), (820, -100), (820, -80)], is_closed=True)
    msp.add_point((800, -50), dxfattribs=t)
    msp.add_mtext('CNC', dxfattribs={'layer': 'TAIERE', 'insert': (800, -30)})
    msp.add_3dface([(900, -100, 0), (920, -100, 0), (920, -80, 5)], dxfattribs=t)
    doc.saveas(os.path.join(IESIRE, 'in-R2018-atelier.dxf'))
    a = {
        'mm_pe_unitate': 1.0,
        'straturi': ['TAIERE', 'GRAVARE', 'BLOCURI'],
        'contururi': [
            {'ce': 'dreptunghiul din 4 linii', 'arie': 2400, 'cutie': [0, -100, 60, -60], 'segmente': 4},
            {'ce': 'canalul din 2 linii și 2 arce', 'arie': 800 + 100 * pi, 'cutie': [90, -100, 150, -80], 'segmente': 4},
            {'ce': 'triunghiul din polilinia neînchisă', 'arie': 800, 'cutie': [300, -100, 340, -60], 'segmente': 3},
        ],
        'linii': [[[180, -100], [200, -100]], [[200, -100], [220, -100]], [[200, -100], [200, -80]],
                  [[-100, -200], [-110, -200]]] + [[[x, y], [x, y + 10]] for x, y in celule],
        'arce': [{'c': [-20, -150], 'r': 10, 'p0': [-10, -150], 'p1': [-30, -150], 'mijloc': [-20, -160],
                  'nota': 'LWPOLYLINE în OCS (0, 0, −1): semicercul cu bulge 1, oglindit'}],
        'cercuri': [[[x, y], 10] for x, y in celule] + [[[-100, -200], 10]],
        'arce_eliptice': [{'c': [500, 50], 'a': 30, 'b': 15, 'rot_grade': 0, 'p0': [530, 50], 'p1': [500, 35],
                           'mijloc': [500 + 30 * cos(pi / 4), 50 - 15 * sin(pi / 4)], 'nota': 'ELLIPSE în OCS (0, 0, −1): parcursă invers'},
                          {'c': [700, -100], 'a': 20, 'b': 10, 'rot_grade': 0, 'p0': [720, -100], 'p1': [700, -90],
                           'mijloc': [700 + 20 * cos(pi / 4), -100 + 10 * sin(pi / 4)], 'nota': 'ARC într-un bloc scalat (2, 1)'}],
        'linii_frante': [{'puncte': [[500, -100], [540, -100], [540, -60]], 'inchis': False, 'nota': 'POLYLINE 3D, proiectată'}],
        'curbe': [{'ce': 'spline-ul închis periodic', 'inchis': True, 'puncte': esantioane(per)}],
        'ascunse': 3,
        'hartie': 1,
        'proiectate': 1,
        'unite': 8,
        'sarite': {'HATCH': 1, 'POINT': 1, 'MTEXT': 1, '3DFACE': 1},
        # 11 închise: dreptunghiul, canalul, triunghiul, 6 cercuri MINSERT, cercul INSERT-ului oglindit, spline-ul periodic.
        # 14 deschise: cele 3 linii în T, semicercul OCS, sfertul de elipsă OCS, 6 linii MINSERT, linia INSERT-ului
        # oglindit, polilinia 3D, arcul eliptic din bloc.
        'numar_cai': {'inchise': 11, 'deschise': 14},
    }
    cai = primitive_ezdxf(msp)
    verifica_linii(cai, a['linii'])
    verifica_cercuri(cai, a['cercuri'])
    verifica_arce(cai, a['arce'])
    verifica_arce_eliptice(cai, a['arce_eliptice'])
    # Celulele MINSERT, din ezdxf.
    ins = [e for e in msp if e.dxftype() == 'INSERT' and e.mcount > 1][0]
    assert [aproape((c.dxf.insert.x, c.dxf.insert.y), q) for c, q in zip(ins.multi_insert(), celule)] == [True] * 6
    # Spline-ul periodic e închis (capetele domeniului în același punct).
    assert aproape(a['curbe'][0]['puncte'][0], a['curbe'][0]['puncte'][-1], 1e-9)
    ASTEPTAT['in-R2018-atelier.dxf'] = a


if __name__ == '__main__':
    r2018()
    r2000_toli()
    r12()
    r2018_atelier()
    for f in ('in-R2018-mm.dxf', 'in-R2000-toli.dxf', 'in-R12.dxf', 'in-R2018-atelier.dxf'):
        d = ezdxf.readfile(os.path.join(IESIRE, f))
        a = d.audit()
        print(f, d.dxfversion, 'erori la audit:', len(a.errors))
    with open(os.path.join(IESIRE, 'asteptat.json'), 'w', encoding='utf-8') as g:
        json.dump(ASTEPTAT, g, indent=1, ensure_ascii=False)
        g.write('\n')
    print('scris', len(ASTEPTAT), 'seturi de valori pe hârtie')
