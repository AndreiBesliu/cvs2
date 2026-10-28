"""Corpusul independent al importului PDF (ADR 0104): PDF-uri scrise de PyMuPDF / MuPDF (alt program decât aplicația), cu
conținutul paginilor scris aici operator cu operator, și valorile lor pe hârtie, în mm, cu Y în sus, față de colțul
stânga-jos al paginii vizibile (CropBox), cu rotirea paginii aplicată ca la afișare. Fiecare valoare e verificată în generator
față de ce citește MuPDF din fișierul scris (`page.get_drawings()`, iar la pagina rotită `page.rotation_matrix`).

Folosire: `python -X utf8 test/oracles-py/pdf_import_corpus.py` (PyMuPDF din `test/oracles-py/requirements.txt`). Scrie
`test/fixtures/pdf/` (PDF-urile și `asteptat.json`); fișierele se comit, iar probele unitare le citesc
(`test/unit/pdf.corpus.test.ts`). PyMuPDF scrie data și un ID în fișier, deci o rulare nouă schimbă octeții, nu geometria.
"""
import json
import os
import sys
import zlib
from math import hypot

import pymupdf

sys.stdout.reconfigure(encoding='utf-8')
AICI = os.path.dirname(os.path.abspath(__file__))
IESIRE = os.path.join(AICI, '..', 'fixtures', 'pdf')
os.makedirs(IESIRE, exist_ok=True)
ASTEPTAT = {}
K = 72 / 25.4  # pt pe mm


def pt(mm):
    """mm → pt, scris fără exponent, cu 12 zecimale."""
    s = f'{mm * K:.12f}'.rstrip('0').rstrip('.')
    return s if s not in ('', '-0') else '0'


def P(*mm):
    return ' '.join(pt(v) for v in mm)


def flux(doc, page, raw):
    """Adaugă un flux de conținut scris de mână la sfârșitul paginii (după ce au scris API-urile PyMuPDF)."""
    x = doc.get_new_xref()
    doc.update_object(x, '<< >>')
    doc.update_stream(x, raw)
    tip, val = doc.xref_get_key(page.xref, 'Contents')
    if tip == 'null':
        doc.xref_set_key(page.xref, 'Contents', f'{x} 0 R')
    elif tip == 'array':
        doc.xref_set_key(page.xref, 'Contents', val[:-1] + f' {x} 0 R]')
    else:
        doc.xref_set_key(page.xref, 'Contents', f'[{val} {x} 0 R]')


def caseta(doc, page, cheie):
    """Caseta paginii cum e SCRISĂ în fișier (PyMuPDF o rotunjește la ~5 zecimale; MuPDF o citește în float32)."""
    tip, val = doc.xref_get_key(page.xref, cheie)
    return [float(v) for v in val.strip('[] ').split()] if tip == 'array' else None


def pagina_mm(doc, page):
    """Pagina afișată din fișier: colțul CropBox-ului (intersectat cu MediaBox-ul) în mm, lățimea și înălțimea nerotite, rotirea."""
    m = caseta(doc, page, 'MediaBox')
    c = caseta(doc, page, 'CropBox') or m
    tip, u = doc.xref_get_key(page.xref, 'UserUnit')
    k = (float(u) if tip in ('int', 'real') else 1) / K
    x0, y0, x1, y1 = max(m[0], c[0]), max(m[1], c[1]), min(m[2], c[2]), min(m[3], c[3])
    tip, r = doc.xref_get_key(page.xref, 'Rotate')
    rot = int(r) % 360 if tip == 'int' else 0
    return {'colt': (x0 * k, y0 * k), 'L': (x1 - x0) * k, 'H': (y1 - y0) * k, 'rot': rot}


def afisata(pg):
    return [pg['H'], pg['L']] if pg['rot'] in (90, 270) else [pg['L'], pg['H']]


def png_2x2():
    """Un PNG gri 2 × 2, scris de mână (semnătura, IHDR, IDAT cu zlib, IEND)."""
    def bucata(tip, date):
        return len(date).to_bytes(4, 'big') + tip + date + zlib.crc32(tip + date).to_bytes(4, 'big')
    ihdr = (2).to_bytes(4, 'big') + (2).to_bytes(4, 'big') + bytes([8, 0, 0, 0, 0])
    idat = zlib.compress(bytes([0, 10, 200, 0, 90, 250]))
    return b'\x89PNG\r\n\x1a\n' + bucata(b'IHDR', ihdr) + bucata(b'IDAT', idat) + bucata(b'IEND', b'')


# ── Verificarea încrucișată ─────────────────────────────────────────────────────────────────────────────────────────


def cai_mupdf(page, rotita=False):
    """Căile citite de MuPDF, în mm, Y în sus, față de colțul stânga-jos al paginii afișate."""
    rect = page.rect  # pagina afișată (CropBox, cu rotirea), în pt, Y în jos
    m = page.rotation_matrix if rotita else pymupdf.Identity
    rez = []
    for d in page.get_drawings():
        puncte = []
        for it in d['items']:
            if it[0] == 're':
                r = it[1]
                puncte.append(('re', [r.bl, r.br, r.tr, r.tl]))
            elif it[0] == 'qu':
                q = it[1]
                puncte.append(('qu', [q.ll, q.lr, q.ur, q.ul]))
            else:
                puncte.append((it[0], list(it[1:])))
        conv = []
        for tip, pts in puncte:
            conv.append((tip, [((p * m).x / K, (rect.height - (p * m).y) / K) for p in pts]))
        rez.append({'tip': d['type'], 'inchis': d.get('closePath'), 'impar': d.get('even_odd'), 'strat': d.get('layer') or None, 'items': conv})
    return rez


def aproape(p, q, tol=1e-4):
    """MuPDF lucrează în float32: coordonatele lui au erori de ordinul 1e-5 mm (valorile pe hârtie sunt exacte)."""
    return hypot(p[0] - q[0], p[1] - q[1]) <= tol


def gaseste_linie_franta(cai, puncte):
    """O cale MuPDF ale cărei segmente leagă exact punctele (liniile ei, în ordine)."""
    for c in cai:
        vf = []
        for tip, pts in c['items']:
            if tip == 'l':
                if not vf:
                    vf.append(pts[0])
                vf.append(pts[1])
            elif tip in ('re', 'qu'):
                vf = list(pts)
        if len(vf) >= len(puncte) and all(aproape(a, b) for a, b in zip(vf, puncte)):
            return True
    return False


def gaseste_bezier(cai, ctrl):
    return any(any(tip == 'c' and all(aproape(a, b) for a, b in zip(pts, ctrl)) for tip, pts in c['items']) for c in cai)


# ── in-forme.pdf: operatorii căii, umplerile, decupajul, transformările, ce se sare ─────────────────────────────────


def forme():
    doc = pymupdf.open()
    page = doc.new_page(width=300 * K, height=200 * K)
    # Textul și imaginea, prin API-urile PyMuPDF (resursele lor: fontul, XObject-ul imagine).
    page.insert_text((200 * K, (200 - 80) * K), 'CNC', fontsize=24)
    page.insert_image(pymupdf.Rect(220 * K, (200 - 190) * K, 240 * K, (200 - 170) * K), stream=png_2x2())
    raw = '\n'.join([
        # (1) Dreptunghiul `re`, tras: închis, colțul (10, 10), 50 × 30.
        f'{P(10, 10, 50, 30)} re S',
        # (2) Polilinia deschisă, trasă.
        f'{P(80, 10)} m {P(100, 30)} l {P(120, 10)} l S',
        # (3) Triunghiul închis cu `h`, tras.
        f'{P(140, 10)} m {P(180, 10)} l {P(160, 40)} l h S',
        # (4) Bézier-ul cubic, deschis.
        f'{P(10, 60)} m {P(30, 90, 60, 30, 80, 60)} c S',
        # (5) `v`: primul punct de control e punctul curent.
        f'{P(100, 60)} m {P(120, 90, 140, 60)} v S',
        # (6) `y`: al doilea punct de control e capătul.
        f'{P(160, 60)} m {P(180, 90, 200, 60)} y S',
        # (7) Umplut fără `h`: închis de umplere (triunghiul 40 × 30, aria 600).
        f'{P(220, 10)} m {P(260, 10)} l {P(240, 40)} l f',
        # (8) Nonzero: două pătrate de 40 suprapuse pe 20 × 20, în același sens: reuniunea, aria 1600 + 1600 − 400 = 2800.
        f'{P(10, 110, 40, 40)} re {P(30, 130, 40, 40)} re f',
        # (9) Par-impar: pătratul de 60 cu golul de 30.
        f'{P(100, 110, 60, 60)} re {P(115, 125, 30, 30)} re f*',
        # (10) Decupajul (W n) nu e o formă; linia de sub el se importă întreagă.
        f'q {P(200, 110, 40, 40)} re W n {P(190, 120)} m {P(250, 120)} l S Q',
        # (11) Translația: linia de 20 mm din (250, 150).
        f'q 1 0 0 1 {P(250, 150)} cm 0 0 m {P(20)} 0 l S Q',
        # (12) Rotirea cu 90° și scara 2, în (280, 10): (x, y) → (280 − 2y, 10 + 2x); linia (0, 0)–(10, 0) → (280, 10)–(280, 30).
        f'q 0 2 -2 0 {P(280, 10)} cm 0 0 m {P(10)} 0 l S Q',
        # (13) Imaginea inline, cu „EI” în date (nelegat de spații): sărită întreagă.
        f'q {P(20)} 0 0 {P(20)} {P(270, 170)} cm BI /W 2 /H 2 /CS /G /BPC 8 ID AEIB EI Q',
        # (14) O cale nepictată (n, fără decupaj): nevăzută.
        f'{P(10, 190)} m {P(60, 190)} l n',
    ])
    flux(doc, page, raw.encode('ascii'))
    f = os.path.join(IESIRE, 'in-forme.pdf')
    doc.save(f, garbage=4, deflate=True, use_objstms=1)
    citit = pymupdf.open(f)
    a = {
        'pagina': afisata(pagina_mm(citit, citit[0])), 'pagini': 1, 'xref': 'flux',
        'linii_frante': [
            {'ce': 're', 'puncte': [[10, 10], [60, 10], [60, 40], [10, 40]], 'inchis': True},
            {'ce': 'polilinia', 'puncte': [[80, 10], [100, 30], [120, 10]], 'inchis': False},
            {'ce': 'triunghiul cu h', 'puncte': [[140, 10], [180, 10], [160, 40]], 'inchis': True},
            {'ce': 'linia sub decupaj', 'puncte': [[190, 120], [250, 120]], 'inchis': False},
            {'ce': 'translația', 'puncte': [[250, 150], [270, 150]], 'inchis': False},
            {'ce': 'rotirea și scara', 'puncte': [[280, 10], [280, 30]], 'inchis': False},
        ],
        'bezier': [
            {'ce': 'c', 'puncte': [[10, 60], [30, 90], [60, 30], [80, 60]]},
            {'ce': 'v', 'puncte': [[100, 60], [100, 60], [120, 90], [140, 60]]},
            {'ce': 'y', 'puncte': [[160, 60], [180, 90], [200, 60], [200, 60]]},
        ],
        'arii': [
            {'ce': 'umplut fără h', 'arie': 600, 'cutie': [220, 10, 260, 40]},
            {'ce': 'reuniunea nonzero', 'arie': 2800, 'cutie': [10, 110, 70, 170]},
            {'ce': 'par-impar, exteriorul', 'arie': 3600, 'cutie': [100, 110, 160, 170]},
            {'ce': 'par-impar, golul', 'arie': 900, 'cutie': [115, 125, 145, 155]},
        ],
        # 6 închise: dreptunghiul, triunghiul cu h, umplutul fără h, reuniunea, cele 2 par-impar; 7 deschise: polilinia,
        # cele 3 cubice, linia sub decupaj, translația, rotirea.
        'numar_cai': {'inchise': 6, 'deschise': 7},
        'raport': {'sarit-text': 1, 'sarit-imagine': 2, 'decupaje': 1, 'nepictate': 1, 'inchise-de-umplere': 1, 'nonzero-normalizate': 1},
    }
    # Verificarea față de MuPDF, din fișierul scris.
    d2 = pymupdf.open(f)
    cai = cai_mupdf(d2[0])
    for x in a['linii_frante']:
        assert gaseste_linie_franta(cai, x['puncte']), x
    for x in a['bezier']:
        assert gaseste_bezier(cai, x['puncte']), x
    # Tabelul xref e un flux, cu obiectele în fluxuri de obiecte (PDF 1.5): ușa trebuie să le citească pe amândouă.
    octeti = open(f, 'rb').read()
    assert b'/XRef' in octeti and b'/ObjStm' in octeti and b'\nxref' not in octeti
    # Ce se sare: textul (un bloc BT … ET), cele două imagini (XObject-ul și cea inline), calea nepictată.
    assert [w[4] for w in d2[0].get_text('words')] == ['CNC']
    assert len(d2[0].get_image_info()) == 2, d2[0].get_image_info()
    ASTEPTAT['in-forme.pdf'] = a


# ── in-straturi.pdf: straturile (OCG, unul oprit), Form XObject-ul, paginile, CropBox-ul, rotirea ──────────────────


def straturi():
    src = pymupdf.open()
    sp = src.new_page(width=100, height=100)
    flux(src, sp, b'10 10 m 90 10 l 50 90 l h S')  # triunghiul, în pt, pe pagina sursă de 100 × 100 pt
    doc = pymupdf.open()
    # Pagina 1: straturile.
    p1 = doc.new_page(width=300 * K, height=200 * K)
    dec = doc.add_ocg('DECUPARE', on=True)
    grav = doc.add_ocg('GRAVARE', on=True)
    asc = doc.add_ocg('ASCUNS', on=False)
    # Fiecare strat, prin numele lui din /Resources /Properties: dreptunghiul (20, 20)–(120, 80) pe DECUPARE, linia pe
    # GRAVARE, iar pătratul (20, 140)–(60, 180) pe ASCUNS (oprit).
    # /Resources e un obiect indirect: /Properties se pune pe el.
    tip, val = doc.xref_get_key(p1.xref, 'Resources')
    res = int(val.split()[0]) if tip == 'xref' else p1.xref
    doc.xref_set_key(res, 'Properties', f'<</S1 {dec} 0 R/S2 {grav} 0 R/S3 {asc} 0 R>>')
    flux(doc, p1, '\n'.join([
        f'/OC /S1 BDC {P(20, 20, 100, 60)} re S EMC',
        f'/OC /S2 BDC {P(150, 50)} m {P(250, 50)} l S EMC',
        f'/OC /S3 BDC {P(20, 140, 40, 40)} re S EMC',
    ]).encode('ascii'))
    # Pagina 2: Form XObject-ul (pagina sursă pusă în dreptunghiul (100, 50)–(200, 150) mm, păstrând raportul).
    p2 = doc.new_page(width=300 * K, height=200 * K)
    p2.show_pdf_page(pymupdf.Rect(100 * K, (200 - 150) * K, 200 * K, (200 - 50) * K), src, 0)
    # Pagina 3: CropBox-ul și rotirea cu 90°.
    p3 = doc.new_page(width=300 * K, height=200 * K)
    flux(doc, p3, f'{P(50, 60)} m {P(150, 60)} l {P(150, 100)} l S'.encode('ascii'))
    p3.set_cropbox(pymupdf.Rect(20 * K, (200 - 180) * K, 280 * K, (200 - 10) * K))  # (20, 10)–(280, 180) mm, Y în sus
    p3.set_rotation(90)
    f = os.path.join(IESIRE, 'in-straturi.pdf')
    doc.save(f, garbage=3, deflate=True)
    # Pagina 2: PyMuPDF pune sursa într-un Form XObject (`fzFrm0`, cu matricea de încadrare) care cheamă pagina sursă
    # (`fullpage`, matricea ei). Matricile se citesc din fișierul scris: PyMuPDF le rotunjește (2.83465 în loc de 72 / 25,4),
    # iar fișierul e adevărul. Punctul (pt) trece întâi prin `fullpage`, apoi prin `fzFrm0`, apoi pt → mm.
    citit = pymupdf.open(f)
    forme_x = {nume: xr for xr, nume, *_ in citit[1].get_xobjects()}
    def matrice(xr):
        tip, val = citit.xref_get_key(xr, 'Matrix')
        return [float(v) for v in val.strip('[] ').split()] if tip == 'array' else [1, 0, 0, 1, 0, 0]
    m1, m2 = matrice(forme_x['fzFrm0']), matrice(forme_x['fullpage'])
    def prin(m, x, y):
        return m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]
    def pe_pagina(x, y):
        xx, yy = prin(m1, *prin(m2, x, y))
        return [xx / K, yy / K]
    tri = [pe_pagina(10, 10), pe_pagina(90, 10), pe_pagina(50, 90)]
    assert all(abs(a - b) < 1e-3 for p, q in zip(tri, [[110, 60], [190, 60], [150, 140]]) for a, b in zip(p, q)), tri
    # Pagina 3: în CropBox, (x, y) → (x − x0, y − y0) (casetele din fișier: ~(20, 10), lățimea ~260 mm); pagina vizibilă are
    # ~260 × 170 mm. Rotită cu 90° în sensul acelor (la afișare): (x, y) → (y, L − x), pagina ~170 × 260.
    g3 = pagina_mm(citit, citit[2])
    def rot(x, y):
        x, y = x - g3['colt'][0], y - g3['colt'][1]
        return [y, g3['L'] - x]
    pag3 = [rot(50, 60), rot(150, 60), rot(150, 100)]
    a1 = {
        'pagina': afisata(pagina_mm(citit, citit[0])), 'pagini': 3, 'xref': 'tabel', 'straturi': ['DECUPARE', 'GRAVARE'],
        'linii_frante': [
            {'ce': 'dreptunghiul pe DECUPARE', 'puncte': [[20, 20], [120, 20], [120, 80], [20, 80]], 'inchis': True, 'strat': 'DECUPARE'},
            {'ce': 'linia pe GRAVARE', 'puncte': [[150, 50], [250, 50]], 'inchis': False, 'strat': 'GRAVARE'},
        ],
        'numar_cai': {'inchise': 1, 'deschise': 1},
        'raport': {'ascunse': 1},
    }
    a2 = {
        'pagina': afisata(pagina_mm(citit, citit[1])), 'pagini': 3, 'pagina_aleasa': 2,
        'linii_frante': [{'ce': 'triunghiul din Form XObject', 'puncte': tri, 'inchis': True}],
        'numar_cai': {'inchise': 1, 'deschise': 0},
        'raport': {},
    }
    a3 = {
        'pagina': afisata(g3), 'pagini': 3, 'pagina_aleasa': 3,
        'linii_frante': [{'ce': 'polilinia pe pagina decupată și rotită', 'puncte': pag3, 'inchis': False}],
        'numar_cai': {'inchise': 0, 'deschise': 1},
        'raport': {},
    }
    d2 = pymupdf.open(f)
    c1 = cai_mupdf(d2[0])
    for x in a1['linii_frante']:
        assert gaseste_linie_franta(c1, x['puncte']), x
        assert any(c['strat'] == x['strat'] for c in c1), x
    # Stratul oprit nu se desenează (MuPDF îl sare, ca ușa): doar dreptunghiul și linia.
    assert len(c1) == 2 and not any(c['strat'] == 'ASCUNS' for c in c1), [c['strat'] for c in c1]
    octeti = open(f, 'rb').read()
    assert b'\nxref' in octeti and b'/XRef' not in octeti
    assert gaseste_linie_franta(cai_mupdf(d2[1]), tri), tri
    # Pagina afișată: 170 × 260 mm (MuPDF o dă în float32: ~1e-5 pt).
    assert all(abs(a - b) < 1e-3 for a, b in zip(tuple(d2[2].rect), (0, 0, 170 * K, 260 * K))), d2[2].rect
    assert gaseste_linie_franta(cai_mupdf(d2[2], rotita=True), pag3), pag3
    ASTEPTAT['in-straturi.pdf#1'] = a1
    ASTEPTAT['in-straturi.pdf#2'] = a2
    ASTEPTAT['in-straturi.pdf#3'] = a3


# ── in-rotiri.pdf: rotirile 180° și 270°, UserUnit ──────────────────────────────────────────────────────────────────


def rotiri():
    doc = pymupdf.open()
    linie = f'{P(50, 60)} m {P(150, 60)} l {P(150, 100)} l S'.encode('ascii')
    for unghi in (180, 270):
        p = doc.new_page(width=300 * K, height=200 * K)
        flux(doc, p, linie)
        p.set_rotation(unghi)
    # Pagina 3: UserUnit 2 (o unitate a paginii = 2 / 72 inch): pagina de 150 × 100 unități are 300 × 200 mm, iar linia din
    # (25, 30) unități ajunge în (50, 60) mm. MuPDF nu aplică UserUnit (pagina lui rămâne 150 × 100 unități): valorile de
    # aici sunt doar pe hârtie.
    p3 = doc.new_page(width=150 * K, height=100 * K)
    flux(doc, p3, f'{P(25, 30)} m {P(75, 30)} l {P(75, 50)} l S'.encode('ascii'))
    doc.xref_set_key(p3.xref, 'UserUnit', '2')
    f = os.path.join(IESIRE, 'in-rotiri.pdf')
    doc.save(f, garbage=3, deflate=True)
    # Afișată, pagina de ~300 × 200 rotită cu 180°: (x, y) → (L − x, H − y); cu 270° (sens invers acelor): (x, y) →
    # (H − y, x), pagina ~200 × 300 (L, H din MediaBox-ul scris).
    d2 = pymupdf.open(f)
    g1, g2, g3 = (pagina_mm(d2, d2[i]) for i in range(3))
    pag180 = [[g1['L'] - x, g1['H'] - y] for x, y in ((50, 60), (150, 60), (150, 100))]
    pag270 = [[g2['H'] - y, x] for x, y in ((50, 60), (150, 60), (150, 100))]
    assert gaseste_linie_franta(cai_mupdf(d2[0], rotita=True), pag180), pag180
    assert gaseste_linie_franta(cai_mupdf(d2[1], rotita=True), pag270), pag270
    assert all(abs(a - b) < 1e-3 for a, b in zip(tuple(d2[1].rect), (0, 0, 200 * K, 300 * K))), d2[1].rect
    ASTEPTAT['in-rotiri.pdf#1'] = {'pagina': afisata(g1), 'pagini': 3, 'pagina_aleasa': 1, 'raport': {},
                                   'linii_frante': [{'ce': 'polilinia rotită cu 180°', 'puncte': pag180, 'inchis': False}],
                                   'numar_cai': {'inchise': 0, 'deschise': 1}}
    ASTEPTAT['in-rotiri.pdf#2'] = {'pagina': afisata(g2), 'pagini': 3, 'pagina_aleasa': 2, 'raport': {},
                                   'linii_frante': [{'ce': 'polilinia rotită cu 270°', 'puncte': pag270, 'inchis': False}],
                                   'numar_cai': {'inchise': 0, 'deschise': 1}}
    ASTEPTAT['in-rotiri.pdf#3'] = {'pagina': afisata(g3), 'pagini': 3, 'pagina_aleasa': 3, 'raport': {},
                                   'linii_frante': [{'ce': 'polilinia cu UserUnit 2', 'puncte': [[50, 60], [150, 60], [150, 100]], 'inchis': False}],
                                   'numar_cai': {'inchise': 0, 'deschise': 1}}


# ── Fișierele „reale”: salvarea incrementală, xref-ul cu offseturi greșite, criptarea ───────────────────────────────


def reale():
    # (1) Salvarea incrementală: fluxul de conținut al paginii e înlocuit într-o secțiune nouă, legată prin /Prev. Versiunea
    # veche (linia de jos) stă încă în fișier; ușa trebuie să citească versiunea nouă (linia de sus), din xref-ul cel nou.
    f = os.path.join(IESIRE, 'incremental.pdf')
    doc = pymupdf.open()
    p = doc.new_page(width=300 * K, height=200 * K)
    flux(doc, p, f'{P(10, 10)} m {P(60, 10)} l S'.encode('ascii'))
    doc.save(f, garbage=3, deflate=True)
    doc = pymupdf.open(f)
    tip, val = doc.xref_get_key(doc[0].xref, 'Contents')
    xr = int(val.split()[0]) if tip == 'xref' else int(val.strip('[]').split()[0])
    doc.update_stream(xr, f'{P(10, 30)} m {P(60, 30)} l S'.encode('ascii'))
    doc.save(f, incremental=True, encryption=pymupdf.PDF_ENCRYPT_KEEP)
    octeti = open(f, 'rb').read()
    assert octeti.count(b'startxref') == 2 and b'/Prev' in octeti
    assert gaseste_linie_franta(cai_mupdf(pymupdf.open(f)[0]), [[10, 30], [60, 30]])
    assert not gaseste_linie_franta(cai_mupdf(pymupdf.open(f)[0]), [[10, 10], [60, 10]])
    citit = pymupdf.open(f)
    ASTEPTAT['incremental.pdf'] = {'pagina': afisata(pagina_mm(citit, citit[0])), 'pagini': 1, 'raport': {},
                                   'linii_frante': [{'ce': 'linia din secțiunea nouă', 'puncte': [[10, 30], [60, 30]], 'inchis': False}],
                                   'numar_cai': {'inchise': 0, 'deschise': 1}}
    # (2) Offseturile greșite: un comentariu de 8 octeți pus după antet mută toate obiectele, iar tabelul xref (neschimbat)
    # trimite acum cu 8 octeți prea devreme. MuPDF repară fișierul; ușa îl reconstruiește din „N G obj”.
    sursa = pymupdf.open()
    p = sursa.new_page(width=300 * K, height=200 * K)
    flux(sursa, p, f'{P(20, 20)} m {P(120, 20)} l {P(120, 80)} l h S'.encode('ascii'))
    curat = sursa.tobytes(garbage=3, deflate=True)
    rand = curat.index(b'\n') + 1
    stricat = curat[:rand] + b'% mutat\n' + curat[rand:]
    assert len(b'% mutat\n') == 8
    f = os.path.join(IESIRE, 'xref-stricat.pdf')
    open(f, 'wb').write(stricat)
    assert gaseste_linie_franta(cai_mupdf(pymupdf.open(f)[0]), [[20, 20], [120, 20], [120, 80]])
    citit = pymupdf.open(f)
    ASTEPTAT['xref-stricat.pdf'] = {'pagina': afisata(pagina_mm(citit, citit[0])), 'pagini': 1, 'raport': {'xref-reconstruit': 1},
                                    'linii_frante': [{'ce': 'triunghiul, după reconstruire', 'puncte': [[20, 20], [120, 20], [120, 80]], 'inchis': True}],
                                    'numar_cai': {'inchise': 1, 'deschise': 0}}
    # (3) Criptat (AES-256, cu parola de deschidere goală): refuzat, cu motivul lui.
    f = os.path.join(IESIRE, 'criptat.pdf')
    sursa.save(f, encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw='proprietar', user_pw='')
    assert b'/Encrypt' in open(f, 'rb').read()
    ASTEPTAT['criptat.pdf'] = {'refuz': 'criptat'}


if __name__ == '__main__':
    forme()
    straturi()
    rotiri()
    reale()
    for f in ('in-forme.pdf', 'in-straturi.pdf', 'in-rotiri.pdf', 'incremental.pdf', 'xref-stricat.pdf', 'criptat.pdf'):
        d = pymupdf.open(os.path.join(IESIRE, f))
        print(f, 'pagini:', d.page_count, 'versiune:', d.metadata.get('format'), 'xref:', d.xref_length())
    with open(os.path.join(IESIRE, 'asteptat.json'), 'w', encoding='utf-8', newline='\n') as g:
        json.dump(ASTEPTAT, g, indent=1, ensure_ascii=False)
        g.write('\n')
    print('scris', len(ASTEPTAT), 'seturi de valori pe hârtie')
