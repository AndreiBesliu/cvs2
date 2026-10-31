"""Corpusul independent al importului EPS și AI ≤ 8 (ADR 0115): fișiere PostScript scrise aici, operator cu operator, cu
geometria cunoscută, și valorile lor pe hârtie, în mm, cu Y în sus, față de originea PostScript (punctul (0, 0) al spațiului
implicit, 1 unitate = 1/72 țol): desenul stă unde e în fișier, ca la DXF.

Verificarea: fiecare fișier e trecut prin Ghostscript, interpretorul PostScript adevărat (în CI `gs`, din `apt`; local
`.tmp/eps2pdf.cjs`, cu `@jspawn/ghostscript-wasm`, ca la ADR 0089), iar PDF-ul ieșit e citit de PyMuPDF / MuPDF și comparat cu
valorile pe hârtie (`GS` din fiecare caz: subcăile pe care trebuie să le deseneze, nici una în plus). Un program care nu e
aplicația confirmă astfel că fișierul e PostScript valid și desenează ce scrie hârtia. Valorile pentru ușă (`ASTEPTAT`) sunt
aceleași numere, după regulile ușii (o umplere nonzero e redesenată, căile ascunse și nepictate se sar).

Folosire: `python -X utf8 test/oracles-py/eps_import_corpus.py [dosar]` (implicit `test/fixtures/eps`; PyMuPDF din
`test/oracles-py/requirements.txt`). Scrie fișierele și `asteptat.json`; se comit, iar probele unitare le citesc
(`test/unit/eps.corpus.test.ts`). Fișierele sunt deterministe: CI-ul le regenerează în `.tmp/` și le compară cu cele comise.
"""
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
from math import hypot

import pymupdf

sys.stdout.reconfigure(encoding='utf-8')
AICI = os.path.dirname(os.path.abspath(__file__))
IESIRE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AICI, '..', 'fixtures', 'eps')
os.makedirs(IESIRE, exist_ok=True)
LUCRU = tempfile.mkdtemp(prefix='eps-corpus-')
ASTEPTAT = {}
K = 72 / 25.4  # pt pe mm
# Ghostscript mută desenul cu până la ~0,002 mm (măsurat la ADR 0089); MuPDF citește în float32.
TOL_GS = 0.003


def pt(mm):
    """mm → pt, scris fără exponent, cu 12 zecimale."""
    s = f'{mm * K:.12f}'.rstrip('0').rstrip('.')
    return s if s not in ('', '-0') else '0'


def P(*mm):
    return ' '.join(pt(v) for v in mm)


def scrie(nume, text, binar=None):
    """Scrie fișierul (ASCII, LF) și întoarce calea lui; `binar` înlocuiește octeții (EPS-ul cu antet DOS)."""
    cale = os.path.join(IESIRE, nume)
    with open(cale, 'wb') as g:
        g.write(binar if binar is not None else text.encode('ascii'))
    return cale


# ── Ghostscript și MuPDF ─────────────────────────────────────────────────────────────────────────────────────────────


def ghostscript(intrare):
    """EPS / PS → PDF cu Ghostscript; întoarce calea PDF-ului (în dosarul de lucru, nu în corpus)."""
    iesire = os.path.join(LUCRU, os.path.basename(intrare) + '.pdf')
    argumente = ['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', '-dCompressPages=false',
                 f'-sOutputFile={iesire}', intrare]
    gs = shutil.which('gs')
    if gs:
        subprocess.run([gs, *argumente], check=True)
    else:
        local = os.path.normpath(os.path.join(AICI, '..', '..', '.tmp', 'eps2pdf.cjs'))
        if not os.path.exists(local):
            raise SystemExit('Ghostscript lipsește: în CI, `apt-get install ghostscript`; local, `.tmp/eps2pdf.cjs` (CLAUDE.md)')
        subprocess.run(['node', local, intrare, iesire], check=True)
    return iesire


def aproape(p, q, tol=TOL_GS):
    return hypot(p[0] - q[0], p[1] - q[1]) <= tol


def subcai_gs(pdf, cutie):
    """
    Subcăile trase sau umplute din PDF-ul lui Ghostscript, în mm, cu Y în sus, față de originea PostScript. Cu `-dEPSCrop`,
    un EPS își primește pagina cât cutia (BoundingBox), cu colțul ei în origine; un PostScript care nu e EPS (un AI) rămâne
    pe pagina implicită, nemutat. Fiecare subcale: startul, segmentele ('l', capăt) sau ('c', c1, c2, capăt), tipul
    desenului (trasă 's', umplută 'f', ambele 'fs') și regula de umplere.
    """
    d = pymupdf.open(pdf)
    assert d.page_count == 1, d.page_count
    p = d[0]
    W, H = p.rect.width, p.rect.height
    llx, lly, urx, ury = cutie
    dx, dy = (llx, lly) if abs(W - (urx - llx)) < 0.01 and abs(H - (ury - lly)) < 0.01 else (0, 0)

    def mm(q):
        return ((q.x + dx) / K, (H - q.y + dy) / K)

    rez = []
    for dr in p.get_drawings():
        sub = None
        for it in dr['items']:
            if it[0] in ('re', 'qu'):
                if it[0] == 're':
                    r = it[1]
                    colturi = [pymupdf.Point(r.x0, r.y1), pymupdf.Point(r.x1, r.y1), pymupdf.Point(r.x1, r.y0), pymupdf.Point(r.x0, r.y0)]
                else:
                    colturi = [it[1].ll, it[1].lr, it[1].ur, it[1].ul]
                rez.append({'tip': dr['type'], 'impar': dr.get('even_odd'), 'start': mm(colturi[0]),
                            'seg': [('l', mm(c)) for c in colturi[1:]] + [('l', mm(colturi[0]))]})
                sub = None
                continue
            a = mm(it[1])
            if sub is None or not aproape(sub['cur'], a, 1e-6):
                sub = {'tip': dr['type'], 'impar': dr.get('even_odd'), 'start': a, 'seg': [], 'cur': a}
                rez.append(sub)
            if it[0] == 'l':
                sub['seg'].append(('l', mm(it[2])))
            elif it[0] == 'c':
                sub['seg'].append(('c', mm(it[2]), mm(it[3]), mm(it[4])))
            else:
                raise AssertionError(f'{pdf}: segment neașteptat {it[0]}')
            sub['cur'] = sub['seg'][-1][-1]
    for s in rez:
        s.pop('cur', None)
    return rez


def segmente(start, seg, inchis):
    """Segmentele unei subcăi ca (tip, de la, controale, până la); închisă: fără segmentele de lungime nulă de la capăt."""
    out, cur = [], start
    for s in seg:
        out.append((s[0], cur, s[1:-1], s[-1]))
        cur = s[-1]
    if inchis:
        while out and out[-1][0] == 'l' and aproape(out[-1][1], out[-1][3], 1e-6):
            out.pop()
        if out and not aproape(out[-1][3], start):
            out.append(('l', out[-1][3], (), start))
    return out


def inversate(segs):
    return [(t, b, tuple(reversed(c)), a) for t, a, c, b in reversed(segs)]


def la_fel(a, b):
    return len(a) == len(b) and all(x[0] == y[0] and aproape(x[1], y[1]) and aproape(x[3], y[3])
                                    and all(aproape(p, q) for p, q in zip(x[2], y[2])) for x, y in zip(a, b))


def potrivite(gs, asteptata):
    """O subcale Ghostscript e cea de pe hârtie: deschisă, aceleași segmente în ordine; închisă, la fel până la startul și
    sensul ei (`re` din PDF își alege colțul și sensul)."""
    start, seg, inchis = asteptata
    a = segmente(start, seg, inchis)
    g = segmente(gs['start'], gs['seg'], inchis)
    if not inchis:
        return la_fel(g, a)
    for cand in (g, inversate(g)):
        for k in range(len(cand)):
            if la_fel(cand[k:] + cand[:k], a):
                return True
    return False


def verifica_gs(cale, cutie, asteptate, text=None, imagini=None):
    """Trece fișierul prin Ghostscript și cere ca subcăile lui să fie exact cele de pe hârtie (fiecare găsită, niciuna în
    plus; o subcale umplută și trasă apare de două ori, ca două desene, și se potrivește aceleiași)."""
    pdf = ghostscript(cale)
    gs = subcai_gs(pdf, cutie)
    folosite = set()
    for k, x in enumerate(asteptate):
        gasite = [i for i, s in enumerate(gs) if potrivite(s, x)]
        assert gasite, f'{os.path.basename(cale)}: Ghostscript nu desenează subcalea {k + 1} de pe hârtie {x[0]}'
        folosite.update(gasite)
    rest = [s for i, s in enumerate(gs) if i not in folosite]
    assert not rest, f'{os.path.basename(cale)}: Ghostscript desenează {len(rest)} subcăi care nu sunt pe hârtie: {rest[:2]}'
    pagina = pymupdf.open(pdf)[0]
    if text is not None:
        assert [w[4] for w in pagina.get_text('words')] == text, pagina.get_text('words')
    if imagini is not None:
        assert len(pagina.get_image_info()) == imagini, pagina.get_image_info()
    return len(gs)


def L(*puncte, inchis=False):
    """O subcale doar din linii, prin puncte (mm); închisă: fără primul punct repetat."""
    return (puncte[0], [('l', q) for q in puncte[1:]], inchis)


def cutie_pt(l, h, x0=0, y0=0):
    """Cutia EPS în pt întregi, cu colțul jos în (x0, y0) mm (aceleași numere și la %%HiResBoundingBox)."""
    return (round(x0 * K), round(y0 * K), int(-(-(x0 + l) * K // 1)), int(-(-(y0 + h) * K // 1)))


def antet_eps(titlu, cutie, extra=''):
    c = ' '.join(str(v) for v in cutie)
    return (f'%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: corpusul EPS al cncvs2 (eps_import_corpus.py)\n%%Title: {titlu}\n'
            f'%%BoundingBox: {c}\n%%HiResBoundingBox: {c}\n%%LanguageLevel: 2\n%%Pages: 1\n{extra}%%EndComments\n')


# ── forme.eps: operatorii căii, umplerile, decupajul, transformările, procedurile simple, ce se sare ───────────────────


def forme():
    cutie = cutie_pt(300, 200)
    text = antet_eps('forme', cutie) + '\n'.join([
        '%%BeginProlog',
        # Procedurile simple ale unui prolog (aliasuri și `re` din operatorii stivei, `cm` cu un tablou): ușa le execută.
        '/m { moveto } bind def',
        '/l { lineto } bind def',
        '/c { curveto } bind def',
        '/h { closepath } bind def',
        '/S { stroke } bind def',
        '/f { fill } bind def',
        '/re { exch dup neg 3 1 roll 5 3 roll moveto 0 rlineto 0 exch rlineto 0 rlineto closepath } bind def',
        '/cm { 6 array astore concat } bind def',
        '%%EndProlog',
        '%%Page: 1 1',
        'gsave',
        '0 setgray 1 setlinewidth 0 setlinecap 0 setlinejoin [] 0 setdash',
        # (1) `re`, tras: închis, colțul (10, 10), 50 × 30.
        f'newpath {P(10, 10, 50, 30)} re S',
        # (2) Polilinia deschisă, trasă.
        f'newpath {P(80, 10)} m {P(100, 30)} l {P(120, 10)} l S',
        # (3) Triunghiul închis cu `closepath`, tras.
        f'newpath {P(140, 10)} m {P(180, 10)} l {P(160, 40)} l h S',
        # (4) Cubica deschisă.
        f'newpath {P(10, 60)} m {P(30, 90, 60, 30, 80, 60)} c S',
        # (5) Relativele: `rmoveto` din (100, 50), apoi două `rlineto`; `rcurveto` din (160, 60), cu controalele față de start.
        f'newpath {P(100, 50)} moveto 0 {P(10)} rmoveto {P(20, 30)} rlineto {P(20, -30)} rlineto stroke',
        f'newpath {P(160, 60)} moveto {P(20, 30, 40, 30, 40, 0)} rcurveto stroke',
        # (6) Umplut fără `closepath`: închis de umplere (triunghiul 40 × 30, aria 600).
        f'newpath {P(220, 10)} m {P(260, 10)} l {P(240, 40)} l f',
        # (7) Nonzero: două pătrate de 40 suprapuse pe 20 × 20, în același sens: reuniunea, aria 1600 + 1600 − 400 = 2800.
        f'newpath {P(10, 110, 40, 40)} re {P(30, 130, 40, 40)} re fill',
        # (8) Par-impar: pătratul de 60 cu golul de 30.
        f'newpath {P(100, 110, 60, 60)} re {P(115, 125, 30, 30)} re eofill',
        # (9) Decupajul (`clip newpath`) nu e o formă; linia de sub el se importă întreagă.
        f'gsave newpath {P(200, 110, 40, 40)} re clip newpath {P(190, 120)} m {P(250, 120)} l S grestore',
        # (10) Translația: linia de 20 mm din (250, 150).
        f'gsave {P(250, 150)} translate newpath 0 0 m {P(20)} 0 l S grestore',
        # (11) Rotirea cu 90° și scara 2, în (280, 10): (x, y) → (280 − 2y, 10 + 2x); linia (0, 0)–(10, 0) → (280, 10)–(280, 30).
        f'gsave {P(280, 10)} translate 90 rotate 2 2 scale newpath 0 0 m {P(10)} 0 l S grestore',
        # (12) Înclinarea prin `cm` (`concat`): (x, y) → (x + y/2 + 200, y + 175); (0, 0), (20, 0), (20, 10) → (200, 175),
        # (220, 175), (225, 185).
        f'gsave 1 0 0.5 1 {P(200, 175)} cm newpath 0 0 m {P(20)} 0 l {P(20, 10)} l S grestore',
        # (13) Textul: sărit (calea lui are doar un `moveto`, deci nimic nepictat).
        f'/Helvetica findfont 24 scalefont setfont newpath {P(200, 80)} moveto (CNC) show',
        # (14) Imaginea, cu datele hex după operator (citite de procedură din fișier): sărită întreagă.
        f'gsave {P(220, 170)} translate {P(20, 20)} scale 2 2 8 [2 0 0 -2 0 2] {{currentfile 4 string readhexstring pop}} bind image',
        '0A1BFF00',
        'grestore',
        # (15) O cale nepictată (`newpath` după segmente): nevăzută.
        f'newpath {P(10, 190)} m {P(60, 190)} l newpath',
        # (16) Umplut și tras (`gsave fill grestore stroke`): o singură formă, pătratul de 20 din (270, 60).
        f'newpath {P(270, 60, 20, 20)} re gsave fill grestore stroke',
        # (17) `rectstroke`: pătratul de 20 din (240, 60), închis.
        f'{P(240, 60, 20, 20)} rectstroke',
        # (18) Scara în mm (72 / 25,4): triunghiul (210, 130), (240, 130), (225, 150), scris în mm, închis.
        'gsave 72 25.4 div dup scale newpath 210 130 moveto 240 130 lineto 225 150 lineto closepath stroke grestore',
        'grestore',
        'showpage',
        '%%Trailer',
        '%%EOF',
        '',
    ])
    cale = scrie('forme.eps', text)
    gs = [
        L((10, 10), (60, 10), (60, 40), (10, 40), inchis=True),
        L((80, 10), (100, 30), (120, 10)),
        L((140, 10), (180, 10), (160, 40), inchis=True),
        ((10, 60), [('c', (30, 90), (60, 30), (80, 60))], False),
        L((100, 60), (120, 90), (140, 60)),
        ((160, 60), [('c', (180, 90), (200, 90), (200, 60))], False),
        L((220, 10), (260, 10), (240, 40), inchis=True),
        L((10, 110), (50, 110), (50, 150), (10, 150), inchis=True),
        L((30, 130), (70, 130), (70, 170), (30, 170), inchis=True),
        L((100, 110), (160, 110), (160, 170), (100, 170), inchis=True),
        L((115, 125), (145, 125), (145, 155), (115, 155), inchis=True),
        L((190, 120), (250, 120)),
        L((250, 150), (270, 150)),
        L((280, 10), (280, 30)),
        L((200, 175), (220, 175), (225, 185)),
        L((270, 60), (290, 60), (290, 80), (270, 80), inchis=True),
        L((240, 60), (260, 60), (260, 80), (240, 80), inchis=True),
        L((210, 130), (240, 130), (225, 150), inchis=True),
    ]
    n = verifica_gs(cale, cutie, gs, text=['CNC'], imagini=1)
    ASTEPTAT['forme.eps'] = {
        'linii_frante': [
            {'ce': 're', 'puncte': [[10, 10], [60, 10], [60, 40], [10, 40]], 'inchis': True},
            {'ce': 'polilinia', 'puncte': [[80, 10], [100, 30], [120, 10]], 'inchis': False},
            {'ce': 'triunghiul cu closepath', 'puncte': [[140, 10], [180, 10], [160, 40]], 'inchis': True},
            {'ce': 'rmoveto și rlineto', 'puncte': [[100, 60], [120, 90], [140, 60]], 'inchis': False},
            {'ce': 'linia sub decupaj', 'puncte': [[190, 120], [250, 120]], 'inchis': False},
            {'ce': 'translația', 'puncte': [[250, 150], [270, 150]], 'inchis': False},
            {'ce': 'rotirea și scara', 'puncte': [[280, 10], [280, 30]], 'inchis': False},
            {'ce': 'înclinarea prin cm', 'puncte': [[200, 175], [220, 175], [225, 185]], 'inchis': False},
            {'ce': 'umplut și tras, o dată', 'puncte': [[270, 60], [290, 60], [290, 80], [270, 80]], 'inchis': True},
            {'ce': 'rectstroke', 'puncte': [[240, 60], [260, 60], [260, 80], [240, 80]], 'inchis': True},
            {'ce': 'scara în mm', 'puncte': [[210, 130], [240, 130], [225, 150]], 'inchis': True},
        ],
        'bezier': [
            {'ce': 'curveto', 'puncte': [[10, 60], [30, 90], [60, 30], [80, 60]]},
            {'ce': 'rcurveto', 'puncte': [[160, 60], [180, 90], [200, 90], [200, 60]]},
        ],
        'arii': [
            {'ce': 'umplut fără closepath', 'arie': 600, 'cutie': [220, 10, 260, 40]},
            {'ce': 'reuniunea nonzero', 'arie': 2800, 'cutie': [10, 110, 70, 170]},
            {'ce': 'par-impar, exteriorul', 'arie': 3600, 'cutie': [100, 110, 160, 170]},
            {'ce': 'par-impar, golul', 'arie': 900, 'cutie': [115, 125, 145, 155]},
        ],
        # 9 închise: re, triunghiul, umplutul fără closepath, reuniunea, cele 2 par-impar, umplutul și trasul, rectstroke,
        # triunghiul în mm; 8 deschise: polilinia, cubica, relativele (2), linia sub decupaj, translația, rotirea, înclinarea.
        'numar_cai': {'inchise': 9, 'deschise': 8},
        'raport': {'sarit-text': 1, 'sarit-imagine': 1, 'decupaje': 1, 'nepictate': 1, 'inchise-de-umplere': 1, 'nonzero-normalizate': 1},
        'illustrator': False,
    }
    return n


# ── cairo.eps: prologul unui program (cairo, Inkscape), cu proceduri condiționale definite, dar nechemate ────────────


def stil_cairo():
    cutie = cutie_pt(200, 100)
    H = pt(100)

    def Pd(x, y):
        """Coordonatele cairo: Y în jos, față de colțul de sus al paginii de 100 mm."""
        return f'{pt(x)} {pt(100 - y)}'

    text = antet_eps('cairo', cutie) + '\n'.join([
        '%%BeginProlog',
        '50 dict begin',
        '/q { gsave } bind def',
        '/Q { grestore } bind def',
        '/cm { 6 array astore concat } bind def',
        '/w { setlinewidth } bind def',
        '/J { setlinecap } bind def',
        '/j { setlinejoin } bind def',
        '/M { setmiterlimit } bind def',
        '/d { setdash } bind def',
        '/m { moveto } bind def',
        '/l { lineto } bind def',
        '/c { curveto } bind def',
        '/h { closepath } bind def',
        '/re { exch dup neg 3 1 roll 5 3 roll moveto 0 rlineto 0 exch rlineto 0 rlineto closepath } bind def',
        '/S { stroke } bind def',
        '/f { fill } bind def',
        '/f* { eofill } bind def',
        '/n { newpath } bind def',
        '/W { clip } bind def',
        '/W* { eoclip } bind def',
        '/g { setgray } bind def',
        '/rg { setrgbcolor } bind def',
        # Proceduri cu condiții și bucle, definite, dar nechemate de pagină (cum are prologul cairo): definirea nu le execută.
        '/marime_pagina { /setpagedevice where { pop 2 array astore 1 dict dup /PageSize 4 -1 roll put setpagedevice }',
        '  { pop pop } ifelse } def',
        '/TJ { { dup type /stringtype eq { show } { -0.001 mul 0 rmoveto } ifelse } forall } bind def',
        '%%EndProlog',
        '%%BeginSetup',
        '%%EndSetup',
        '%%Page: 1 1',
        '%%BeginPageSetup',
        f'%%PageBoundingBox: {" ".join(str(v) for v in cutie)}',
        '%%EndPageSetup',
        f'q 0 0 {cutie[2]} {cutie[3]} rectclip q',
        f'1 0 0 -1 0 {H} cm',
        '0 g 1 w 0 J 0 j [] 0.0 d 10 M',
        # (A) Conturul cu o cubică, închis cu h, umplut: (10, 10) → (50, 10), cubica prin (60, 10), (60, 40) până în (50, 40),
        # apoi (10, 40).
        f'{Pd(10, 10)} m {Pd(50, 10)} l {Pd(60, 10)} {Pd(60, 40)} {Pd(50, 40)} c {Pd(10, 40)} l h f',
        # (B) `re` în coordonatele cu Y în jos: colțul (80, 60) și 30 × 30 în jos, adică (80, 40) … (110, 10) pe hârtie.
        f'{Pd(80, 40)} {pt(30)} {pt(30)} re f',
        # (C) Polilinia deschisă, trasă.
        f'{Pd(120, 10)} m {Pd(140, 40)} l {Pd(160, 10)} l S',
        # (D) Par-impar: dreptunghiul 40 × 30 cu golul de 20 × 10, în același sens.
        f'{Pd(140, 40)} {pt(40)} {pt(30)} re {Pd(150, 30)} {pt(20)} {pt(10)} re f*',
        'Q Q',
        'showpage',
        '%%Trailer',
        'end',
        '%%EOF',
        '',
    ])
    cale = scrie('cairo.eps', text)
    gs = [
        ((10, 10), [('l', (50, 10)), ('c', (60, 10), (60, 40), (50, 40)), ('l', (10, 40))], True),
        L((80, 40), (110, 40), (110, 10), (80, 10), inchis=True),
        L((120, 10), (140, 40), (160, 10)),
        L((140, 40), (180, 40), (180, 10), (140, 10), inchis=True),
        L((150, 30), (170, 30), (170, 20), (150, 20), inchis=True),
    ]
    n = verifica_gs(cale, cutie, gs)
    ASTEPTAT['cairo.eps'] = {
        'linii_frante': [
            {'ce': 're cu Y în jos', 'puncte': [[80, 40], [110, 40], [110, 10], [80, 10]], 'inchis': True},
            {'ce': 'polilinia', 'puncte': [[120, 10], [140, 40], [160, 10]], 'inchis': False},
        ],
        'bezier': [{'ce': 'cubica conturului', 'puncte': [[50, 10], [60, 10], [60, 40], [50, 40]]}],
        'arii': [
            {'ce': 'par-impar, exteriorul', 'arie': 1200, 'cutie': [140, 10, 180, 40]},
            {'ce': 'par-impar, golul', 'arie': 200, 'cutie': [150, 20, 170, 30]},
        ],
        'numar_cai': {'inchise': 4, 'deschise': 1},
        # Decupajul paginii (`rectclip`), pus de cairo pe fiecare pagină.
        'raport': {'decupaje': 1},
        'illustrator': False,
    }
    return n


# ── binar.eps: antetul binar DOS (cu previzualizarea TIFF), în stilul exportului EPS al aplicației ────────────────────


def binar():
    cutie = (0, 0, 284, 284)
    ps = (antet_eps('binar', cutie) + '\n'.join([
        'gsave',
        f'{K!r} {K!r} scale',
        '0.1 setlinewidth 1 setlinecap 1 setlinejoin',
        '% Stratul EXTERIOR',
        '0.839216 0.152941 0.156863 setrgbcolor',
        'newpath', '10 10 moveto', '90 10 lineto', '90 60 lineto', '10 60 lineto', 'closepath', 'stroke',
        '% Stratul PE_LINIE',
        '0.172549 0.627451 0.172549 setrgbcolor',
        'newpath', '20 70 moveto', '30 70 40 90 50 90 curveto', 'stroke',
        'grestore',
        'showpage',
        '%%EOF',
        '',
    ])).encode('ascii')
    # Antetul DOS (30 de octeți): semnătura C5 D0 D3 C6, apoi poziția și lungimea PostScript-ului, ale WMF-ului (lipsă) și
    # ale TIFF-ului, și suma de control (FFFF: nefolosită). Previzualizarea e un TIFF mic, doar ca octeți de sărit.
    tiff = b'II*\x00\x08\x00\x00\x00' + bytes(range(56))
    poz = 30 + len(tiff)
    antet = b'\xc5\xd0\xd3\xc6' + struct.pack('<IIIIIIH', poz, len(ps), 0, 0, 30, len(tiff), 0xFFFF)
    cale = scrie('binar.eps', '', antet + tiff + ps)
    gs = [
        L((10, 10), (90, 10), (90, 60), (10, 60), inchis=True),
        ((20, 70), [('c', (30, 70), (40, 90), (50, 90))], False),
    ]
    n = verifica_gs(cale, cutie, gs)
    ASTEPTAT['binar.eps'] = {
        'linii_frante': [{'ce': 'dreptunghiul, în mm prin scale', 'puncte': [[10, 10], [90, 10], [90, 60], [10, 60]], 'inchis': True}],
        'bezier': [{'ce': 'cubica', 'puncte': [[20, 70], [30, 70], [40, 90], [50, 90]]}],
        'numar_cai': {'inchise': 1, 'deschise': 1},
        'raport': {},
        'illustrator': False,
    }
    return n


# ── ai8.ai: Illustrator 8 (operatorii AI, straturile, calea compusă, textul și rasterul sărite) ──────────────────────

# Procedurile operatorilor AI, pentru Ghostscript (un AI ≤ 8 e PostScript cu procedurile lui în prolog). Ușa nu le execută:
# într-un fișier Illustrator sare prologul și setup-ul și citește operatorii după nume. Au condiții și bucle, ca ale lui
# Illustrator: executate de ușă, ar fi refuzate.
PROCSET_AI = '''/Proba_AI 80 dict def
Proba_AI begin
/_vis true def /_eo false def /_comp false def /_fel 0 def
/_umple { _eo { eofill } { fill } ifelse } def
/_picteaza { _vis not { pop newpath } {
  dup 1 eq { pop _umple } { dup 2 eq { pop stroke } { 3 eq { gsave _umple grestore stroke } { newpath } ifelse } ifelse } ifelse
  } ifelse } def
/_op { { closepath } if _comp { /_fel exch def } { _picteaza } ifelse } def
/m { moveto } def /l { lineto } def /L { lineto } def /c { curveto } def /C { curveto } def
/v { currentpoint 6 2 roll curveto } def /V { currentpoint 6 2 roll curveto } def
/y { 2 copy curveto } def /Y { 2 copy curveto } def
/h { closepath } def /H { closepath } def
/f { 1 true _op } def /F { 1 false _op } def /s { 2 true _op } def /S { 2 false _op } def
/b { 3 true _op } def /B { 3 false _op } def /n { 0 false _op } def /N { 0 true _op } def
/*u { /_comp true def /_fel 0 def } def /*U { /_comp false def _fel _picteaza } def
/u { } def /U { } def /q { gsave } def /Q { grestore } def /W { clip } def
/Lb { 11 { pop } repeat 1 eq /_vis exch def } def /Ln { pop } def /LB { /_vis true def } def
/A { pop } def /O { pop } def /R { pop } def /D { pop } def /XR { 1 eq /_eo exch def } def
/k { setcmykcolor } def /K { 4 { pop } repeat } def /g { setgray } def /G { pop } def
/Xa { setrgbcolor } def /XA { 3 { pop } repeat } def
/w { setlinewidth } def /j { setlinejoin } def /J { setlinecap } def /M { setmiterlimit } def /d { setdash } def
/i { setflat } def /Ar { pop } def
/To { pop } def /TO { } def /Tp { 7 { pop } repeat } def /TP { } def /Tr { pop } def /Tf { pop pop } def
/Tx { pop } def /TX { pop } def /XI { 13 { pop } repeat } def
/annotatepage { } def
end'''


def ai8():
    cutie = (0, 0, 567, 567)
    corp = '\n'.join([
        # Stratul TĂIERE, vizibil.
        '%AI5_BeginLayer',
        '1 1 1 1 0 0 0 79 128 255 0 50 Lb',
        '(TAIERE) Ln',
        '0 A', 'u', '0 O', '0 0 0 1 k', '0 R', '0 0 0 1 K', '0 XR', '0 J 0 j 1 w 4 M []0 d', '%AI3_Note:', '0 D',
        # (a) Pătratul închis cu L și f, cu punctul de start repetat: (20, 20) … (60, 60).
        f'{P(20, 20)} m', f'{P(60, 20)} L', f'{P(60, 60)} L', f'{P(20, 60)} L', f'{P(20, 20)} L', 'f',
        # (b) Calea compusă (*u … *U): pătratul de 60 și golul de 30, în sensuri opuse, umplută nonzero o singură dată.
        '*u',
        f'{P(100, 20)} m', f'{P(160, 20)} L', f'{P(160, 80)} L', f'{P(100, 80)} L', f'{P(100, 20)} L', 'f',
        '1 D',
        f'{P(115, 35)} m', f'{P(115, 65)} L', f'{P(145, 65)} L', f'{P(145, 35)} L', f'{P(115, 35)} L', 'f',
        '*U',
        '0 D',
        # (c) Curbele c, C, v, V, y, Y, într-o cale deschisă, trasă.
        f'{P(10, 100)} m', f'{P(20, 120, 40, 120, 50, 100)} c', f'{P(60, 80, 70, 80, 80, 100)} C',
        f'{P(90, 120, 100, 100)} v', f'{P(110, 80, 120, 100)} V', f'{P(130, 120, 140, 100)} y', f'{P(150, 80, 160, 100)} Y',
        'S',
        'U',
        # (d) F: triunghiul fără închidere, închis de umplere.
        f'{P(170, 20)} m', f'{P(195, 20)} L', f'{P(182.5, 45)} L', 'F',
        # (e) b: dreptunghiul închis, umplut și tras; B: triunghiul deschis, umplut și tras (închis de umplere).
        f'{P(170, 60)} m', f'{P(195, 60)} L', f'{P(195, 80)} L', f'{P(170, 80)} L', 'b',
        f'{P(10, 130)} m', f'{P(40, 130)} L', f'{P(25, 150)} L', 'B',
        # (f) Par-impar (1 XR), cale compusă cu două pătrate în același sens: golul.
        '1 XR',
        '*u',
        f'{P(60, 130)} m', f'{P(100, 130)} L', f'{P(100, 170)} L', f'{P(60, 170)} L', f'{P(60, 130)} L', 'f',
        f'{P(70, 140)} m', f'{P(90, 140)} L', f'{P(90, 160)} L', f'{P(70, 160)} L', f'{P(70, 140)} L', 'f',
        '*U',
        '0 XR',
        'LB',
        '%AI5_EndLayer--',
        # Stratul GRAVARE, vizibil.
        '%AI5_BeginLayer',
        '1 1 1 1 0 0 1 255 79 79 0 50 Lb',
        '(GRAVARE) Ln',
        '0 A', 'u',
        # (g) Polilinia deschisă, S.
        f'{P(110, 135)} m', f'{P(130, 155)} L', f'{P(150, 135)} L', 'S',
        # (h) s: triunghiul închis și tras.
        f'{P(160, 130)} m', f'{P(190, 130)} L', f'{P(175, 160)} L', 's',
        # (i) h, apoi S; H, apoi S: închise.
        f'{P(110, 170)} m', f'{P(130, 170)} L', f'{P(120, 185)} L', 'h', 'S',
        f'{P(140, 170)} m', f'{P(160, 170)} L', f'{P(150, 185)} L', 'H', 'S',
        # (j) n și N: nepictate.
        f'{P(170, 170)} m', f'{P(195, 170)} L', 'n',
        f'{P(170, 180)} m', f'{P(195, 180)} L', f'{P(180, 190)} L', 'N',
        # (k) Textul (sărit), cu calea lui de încadrare între Tp și TP: nu e o formă.
        '1 To',
        f'1 0 0 1 {P(10, 175)} 0 Tp',
        f'{P(10, 175)} m', f'{P(40, 175)} L', f'{P(40, 185)} L', f'{P(10, 185)} L', f'{P(10, 175)} L', 'n',
        'TP',
        '0 Tr', '0 O', '0 0 0 1 k', '/_Helvetica 12 Tf',
        '(CNC) Tx',
        r'(\r) TX',
        'TO',
        # (l) Rasterul (sărit), cu datele în comentarii.
        '%AI5_BeginRaster',
        f'[1 0 0 1 {P(60, 180)}] 0 0 2 2 2 2 8 1 0 0 0 0 XI',
        '%0A1BFF00',
        '%AI5_EndRaster',
        # (m) Decupajul: q … W n … Q; linia de sub el se importă întreagă.
        'q',
        f'{P(10, 190)} m', f'{P(50, 190)} L', f'{P(50, 198)} L', f'{P(10, 198)} L', f'{P(10, 190)} L', 'h', 'W', 'n',
        f'{P(5, 194)} m', f'{P(60, 194)} L', 'S',
        'Q',
        'U',
        'LB',
        '%AI5_EndLayer--',
        # Stratul ASCUNS, oprit (primul operand al lui Lb e 0): forma lui se sare.
        '%AI5_BeginLayer',
        '0 1 1 1 0 0 2 79 255 79 0 50 Lb',
        '(ASCUNS) Ln',
        f'{P(100, 185)} m', f'{P(110, 185)} L', f'{P(110, 195)} L', f'{P(100, 195)} L', f'{P(100, 185)} L', 'f',
        'LB',
        '%AI5_EndLayer--',
    ])
    text = '\n'.join([
        '%!PS-Adobe-3.0',
        '%%Creator: Adobe Illustrator(R) 8.0',
        '%%AI8_CreatorVersion: 8.0.1',
        '%%For: (corpus) (cncvs2)',
        '%%Title: (ai8.ai)',
        f'%%BoundingBox: {" ".join(str(v) for v in cutie)}',
        f'%%HiResBoundingBox: {" ".join(str(v) for v in cutie)}',
        '%AI5_FileFormat 4.0',
        '%AI3_ColorUsage: Color',
        '%AI5_ArtSize: 612 792',
        '%AI5_RulerUnits: 2',
        '%AI5_NumLayers: 3',
        '%%EndComments',
        '%%BeginProlog',
        '%%BeginResource: procset Proba_AI 8.0 0',
        PROCSET_AI,
        '%%EndResource',
        '%%EndProlog',
        '%%BeginSetup',
        'Proba_AI begin',
        '%AI5_Begin_NonPrinting',
        '%AI5_End_NonPrinting--',
        '%%EndSetup',
        corp,
        '%%PageTrailer',
        'gsave annotatepage grestore showpage',
        '%%Trailer',
        'end',
        '%%EOF',
        '',
    ])
    cale = scrie('ai8.ai', text)
    pc = [(10, 100), (20, 120), (40, 120), (50, 100), (60, 80), (70, 80), (80, 100), (80, 100), (90, 120), (100, 100),
          (100, 100), (110, 80), (120, 100), (130, 120), (140, 100), (140, 100), (150, 80), (160, 100), (160, 100)]
    curbe = [pc[3 * k:3 * k + 4] for k in range(6)]
    gs = [
        L((20, 20), (60, 20), (60, 60), (20, 60), inchis=True),
        L((100, 20), (160, 20), (160, 80), (100, 80), inchis=True),
        L((115, 35), (115, 65), (145, 65), (145, 35), inchis=True),
        ((10, 100), [('c', *x[1:]) for x in curbe], False),
        L((170, 20), (195, 20), (182.5, 45), inchis=True),
        L((170, 60), (195, 60), (195, 80), (170, 80), inchis=True),
        L((10, 130), (40, 130), (25, 150), inchis=True),
        L((60, 130), (100, 130), (100, 170), (60, 170), inchis=True),
        L((70, 140), (90, 140), (90, 160), (70, 160), inchis=True),
        L((110, 135), (130, 155), (150, 135)),
        L((160, 130), (190, 130), (175, 160), inchis=True),
        L((110, 170), (130, 170), (120, 185), inchis=True),
        L((140, 170), (160, 170), (150, 185), inchis=True),
        L((5, 194), (60, 194)),
    ]
    n = verifica_gs(cale, cutie, gs, text=[], imagini=0)
    ASTEPTAT['ai8.ai'] = {
        'straturi': ['TAIERE', 'GRAVARE'],
        'linii_frante': [
            {'ce': 'pătratul cu L și f', 'puncte': [[20, 20], [60, 20], [60, 60], [20, 60]], 'inchis': True, 'strat': 'TAIERE'},
            {'ce': 'calea compusă, exteriorul', 'puncte': [[100, 20], [160, 20], [160, 80], [100, 80]], 'inchis': True, 'strat': 'TAIERE'},
            {'ce': 'calea compusă, golul', 'puncte': [[115, 35], [115, 65], [145, 65], [145, 35]], 'inchis': True, 'strat': 'TAIERE'},
            {'ce': 'F, închis de umplere', 'puncte': [[170, 20], [195, 20], [182.5, 45]], 'inchis': True, 'strat': 'TAIERE'},
            {'ce': 'b', 'puncte': [[170, 60], [195, 60], [195, 80], [170, 80]], 'inchis': True, 'strat': 'TAIERE'},
            {'ce': 'B, închis de umplere', 'puncte': [[10, 130], [40, 130], [25, 150]], 'inchis': True, 'strat': 'TAIERE'},
            {'ce': 'polilinia S', 'puncte': [[110, 135], [130, 155], [150, 135]], 'inchis': False, 'strat': 'GRAVARE'},
            {'ce': 's', 'puncte': [[160, 130], [190, 130], [175, 160]], 'inchis': True, 'strat': 'GRAVARE'},
            {'ce': 'h, apoi S', 'puncte': [[110, 170], [130, 170], [120, 185]], 'inchis': True, 'strat': 'GRAVARE'},
            {'ce': 'H, apoi S', 'puncte': [[140, 170], [160, 170], [150, 185]], 'inchis': True, 'strat': 'GRAVARE'},
            {'ce': 'linia sub decupaj', 'puncte': [[5, 194], [60, 194]], 'inchis': False, 'strat': 'GRAVARE'},
        ],
        'bezier': [{'ce': op, 'puncte': [list(q) for q in x]} for op, x in zip(['c', 'C', 'v', 'V', 'y', 'Y'], curbe)],
        'arii': [
            {'ce': 'par-impar, exteriorul', 'arie': 1600, 'cutie': [60, 130, 100, 170]},
            {'ce': 'par-impar, golul', 'arie': 400, 'cutie': [70, 140, 90, 160]},
        ],
        # 11 închise: pătratul, cele 2 ale căii compuse, F, b, B, cele 2 par-impar, s, h, H; 3 deschise: curbele, polilinia,
        # linia sub decupaj.
        'numar_cai': {'inchise': 11, 'deschise': 3},
        'raport': {'sarit-text': 1, 'sarit-imagine': 1, 'decupaje': 1, 'nepictate': 2, 'ascunse': 1, 'inchise-de-umplere': 2},
        'illustrator': True,
    }
    return n


# ── ai3.ai: Illustrator 3 (antetul EPSF-1.2, procedurile în %%BeginProcSet, fără %%BeginProlog, fără straturi) ─────────


def ai3():
    cutie = (0, 0, 284, 284)
    text = '\n'.join([
        '%!PS-Adobe-2.0 EPSF-1.2',
        '%%Creator:Adobe Illustrator(TM) 3.2',
        '%%For: (corpus) (cncvs2)',
        '%%Title: (ai3.ai)',
        '%%DocumentProcSets: Proba_AI 3.2 0',
        f'%%BoundingBox:{" ".join(str(v) for v in cutie)}',
        '%%TemplateBox:142 142 142 142',
        '%%EndComments',
        '%%BeginProcSet: Proba_AI 3.2 0',
        PROCSET_AI,
        '%%EndProcSet',
        '%%EndProlog',
        '%%BeginSetup',
        'Proba_AI begin',
        'n',
        '%%EndSetup',
        'u',
        '0 g 0 G 1 w 0 J 0 j 4 M []0 d',
        # Pătratul (10, 10) … (90, 90), închis cu f; cubica în colț (C), deschisă, trasă.
        f'{P(10, 10)} m', f'{P(90, 10)} L', f'{P(90, 90)} L', f'{P(10, 90)} L', f'{P(10, 10)} L', 'f',
        f'{P(30, 30)} m', f'{P(50, 70, 70, 70, 70, 30)} C', 'S',
        'U',
        '%%Trailer',
        'end',
        '%%EOF',
        '',
    ])
    cale = scrie('ai3.ai', text)
    gs = [
        L((10, 10), (90, 10), (90, 90), (10, 90), inchis=True),
        ((30, 30), [('c', (50, 70), (70, 70), (70, 30))], False),
    ]
    n = verifica_gs(cale, cutie, gs)
    ASTEPTAT['ai3.ai'] = {
        'linii_frante': [{'ce': 'pătratul cu f', 'puncte': [[10, 10], [90, 10], [90, 90], [10, 90]], 'inchis': True}],
        'bezier': [{'ce': 'C', 'puncte': [[30, 30], [50, 70], [70, 70], [70, 30]]}],
        'numar_cai': {'inchise': 1, 'deschise': 1},
        'raport': {},
        'illustrator': True,
    }
    return n


# ── Refuzurile și golul: bucla (PostScript valid, dar cere un interpretor adevărat), doar text ────────────────────────


def refuzuri():
    cutie = cutie_pt(100, 50)
    # Cinci linii verticale din bucla `for`: Ghostscript le desenează, ușa refuză bucla, cu numele operatorului.
    text = antet_eps('bucla', cutie) + '\n'.join([
        'newpath',
        f'0 1 4 {{ {pt(10)} mul {pt(10)} add {pt(10)} moveto 0 {pt(30)} rlineto }} for',
        'stroke',
        'showpage',
        '%%EOF',
        '',
    ])
    cale = scrie('bucla.eps', text)
    n = verifica_gs(cale, cutie, [L((10 + 10 * k, 10), (10 + 10 * k, 40)) for k in range(5)])
    ASTEPTAT['bucla.eps'] = {'refuz': 'control', 'detaliu': 'for'}
    # Doar text: nicio cale (golul), cu textul numărat.
    text = antet_eps('text', cutie) + '\n'.join([
        f'/Helvetica findfont 12 scalefont setfont {P(10, 20)} moveto (Doar text) show',
        'showpage',
        '%%EOF',
        '',
    ])
    cale = scrie('text.eps', text)
    verifica_gs(cale, cutie, [], text=['Doar', 'text'])
    ASTEPTAT['text.eps'] = {'refuz': 'gol', 'raport': {'sarit-text': 1}}
    return n


if __name__ == '__main__':
    numarate = {
        'forme.eps': forme(), 'cairo.eps': stil_cairo(), 'binar.eps': binar(), 'ai8.ai': ai8(), 'ai3.ai': ai3(),
        'bucla.eps': refuzuri(),
    }
    for f, n in numarate.items():
        print(f, '— Ghostscript:', n, 'subcăi, toate cele de pe hârtie')
    with open(os.path.join(IESIRE, 'asteptat.json'), 'w', encoding='utf-8', newline='\n') as g:
        json.dump(ASTEPTAT, g, indent=1, ensure_ascii=False)
        g.write('\n')
    shutil.rmtree(LUCRU, ignore_errors=True)
    print('scris', len(ASTEPTAT), 'seturi de valori pe hârtie')
