"""Corpusul independent al importului WMF (ADR 0117): fișiere WMF scrise aici, înregistrare cu înregistrare (`struct`), cu
geometria cunoscută, și valorile lor pe hârtie, în mm, cu Y în sus. Cu antetul placeable, valorile sunt față de colțul
stânga-jos al cadrului lui (playerul pune fereastra pe cadru și vizorul pe mărimea lui fizică: o unitate = 25,4 / inch mm);
fără antet, față de originea dispozitivului, cu unitatea aleasă (implicit 1/96 țol) și Y întors.

O cale pe hârtie e startul plus bucățile ei: ('L', capăt) linia, ('A', capăt, centru, baleiaj în grade) arcul de cerc și
('E', capăt, centru, rx, ry, t0, dt) arcul de elipsă (unghiurile parametrice în radiani, în sens trigonometric). O cale
închisă se încheie în start. Valorile se socotesc aici cu formula fiecărui caz (fereastra, vizorul, modul), nu cu ușa.

Verificarea: pe Windows, fiecare fișier e redat de GDI, implementarea de referință a WMF-ului (`PlayMetaFile` pe imprimanta
„Microsoft Print to PDF”, cu același player), iar PDF-ul ieșit e citit cu PyMuPDF: fiecare subcale desenată stă pe o cale de
pe hârtie, iar fiecare cale de pe hârtie e acoperită de subcăile ei (distanța punct–polilinie, pe eșantioane dese).
Toleranța e 0,004 mm pe poligoane și linii (GDI lucrează pe 1/16 dintr-un pixel de 600 dpi) și 0,09 mm (doi pixeli) pe
dreptunghiuri, elipse și arce: în modul compatibil, GDI le pune pe pixeli întregi și le strânge cu un pixel la dreapta și jos
(umplerea, cu încă unul la stânga și sus), deci centrul și capetele se mută cu până la doi pixeli. Desenele mai mici de 0,1 mm
(pixelii) nu se judecă. Fără GDI (în CI, pe Linux): `--fara-gdi`, doar fișierele, care trebuie să fie chiar cele comise.

Folosire: `python -X utf8 test/oracles-py/wmf_import_corpus.py [dosar] [--fara-gdi]` (implicit `test/fixtures/wmf`; PyMuPDF și
numpy din `test/oracles-py/requirements.txt`, doar pentru GDI). Scrie fișierele și `asteptat.json`; se comit, iar probele
unitare le citesc (`test/unit/wmf.corpus.test.ts`).
"""
import json
import math
import os
import struct
import sys
import tempfile

sys.stdout.reconfigure(encoding='utf-8')
AICI = os.path.dirname(os.path.abspath(__file__))
ARG = [a for a in sys.argv[1:] if not a.startswith('--')]
FARA_GDI = '--fara-gdi' in sys.argv
IESIRE = ARG[0] if ARG else os.path.join(AICI, '..', 'fixtures', 'wmf')
os.makedirs(IESIRE, exist_ok=True)
ASTEPTAT = {}
DPI = 600
TOL_EXACT = 0.004
TOL_CADRU = 0.09

# ── Scriitorul WMF ([MS-WMF]) ────────────────────────────────────────────────────────────────────────────────────────


def rec(fn, *cuvinte):
    """O înregistrare: mărimea în cuvinte (cu antetul de 3), funcția, parametrii pe 16 biți, în ordinea din fișier."""
    return struct.pack('<IH', 3 + len(cuvinte), fn) + b''.join(struct.pack('<H', w & 0xFFFF) for w in cuvinte)


def rec_octeti(fn, date):
    if len(date) % 2:
        date += b'\0'
    return struct.pack('<IH', 3 + len(date) // 2, fn) + date


def wmf(recs, cadru=None, inch=1440, obiecte=16):
    """Antetul standard (și cel placeable, cu suma de control, dacă e cadrul) plus înregistrările și `META_EOF`."""
    corp = b''.join(recs) + struct.pack('<IH', 3, 0)
    maxrec = max([len(r) // 2 for r in recs] + [3])
    antet = struct.pack('<HHHIHIH', 1, 9, 0x300, (18 + len(corp)) // 2, obiecte, maxrec, 0)
    if cadru is None:
        return antet + corp
    l, t, r, b = cadru
    p = struct.pack('<IHhhhhHI', 0x9AC6CDD7, 0, l, t, r, b, inch, 0)
    suma = 0
    for k in range(0, 20, 2):
        suma ^= struct.unpack('<H', p[k:k + 2])[0]
    return p + struct.pack('<H', suma) + antet + corp


# Înregistrările, cu argumentele în ordinea GDI (fișierul le ține invers).
def SetMapMode(m): return rec(0x0103, m)
def SetBkMode(m): return rec(0x0102, m)
def SetPolyFillMode(m): return rec(0x0106, m)
def SetWindowOrg(x, y): return rec(0x020B, y, x)
def SetWindowExt(x, y): return rec(0x020C, y, x)
def SetViewportOrg(x, y): return rec(0x020D, y, x)
def SetViewportExt(x, y): return rec(0x020E, y, x)
def OffsetWindowOrg(x, y): return rec(0x020F, y, x)
def ScaleWindowExt(xn, xd, yn, yd): return rec(0x0410, yd, yn, xd, xn)
def SaveDC(): return rec(0x001E)
def RestoreDC(n=-1): return rec(0x0127, n)
def MoveTo(x, y): return rec(0x0214, y, x)
def LineTo(x, y): return rec(0x0213, y, x)
def Rectangle(l, t, r, b): return rec(0x041B, b, r, t, l)
def RoundRect(l, t, r, b, w, h): return rec(0x061C, h, w, b, r, t, l)
def Ellipse(l, t, r, b): return rec(0x0418, b, r, t, l)
def Arc(l, t, r, b, xs, ys, xe, ye): return rec(0x0817, ye, xe, ys, xs, b, r, t, l)
def Chord(l, t, r, b, xs, ys, xe, ye): return rec(0x0830, ye, xe, ys, xs, b, r, t, l)
def Pie(l, t, r, b, xs, ys, xe, ye): return rec(0x081A, ye, xe, ys, xs, b, r, t, l)
def Polygon(*p): return rec(0x0324, len(p), *[c for q in p for c in q])
def Polyline(*p): return rec(0x0325, len(p), *[c for q in p for c in q])
def PolyPolygon(*pp): return rec(0x0538, len(pp), *[len(p) for p in pp], *[c for p in pp for q in p for c in q])
def SelectObject(i): return rec(0x012D, i)
def DeleteObject(i): return rec(0x01F0, i)
def IntersectClipRect(l, t, r, b): return rec(0x0416, b, r, t, l)
def SetPixel(x, y): return rec(0x041F, 0, 0, y, x)
def CreatePen(stil=0): return rec_octeti(0x02FA, struct.pack('<HhhI', stil, 0, 0, 0))
def CreateBrush(stil=0): return rec_octeti(0x02FC, struct.pack('<HIH', stil, 0x808080, 0))


def CreateFont():
    """`CreateFontIndirect`: o înălțime, Arial; doar ocupă un loc în tabelul obiectelor."""
    return rec_octeti(0x02FB, struct.pack('<hhhhhBBBBBBBB', -200, 0, 0, 0, 400, 0, 0, 0, 0, 0, 0, 0, 0) + b'Arial\0\0\0')


def TextOut(x, y, s):
    b = s.encode('ascii')
    return rec_octeti(0x0521, struct.pack('<h', len(b)) + b + (b'\0' if len(b) % 2 else b'') + struct.pack('<hh', y, x))


def StretchDIB(x, y, l, h):
    """O imagine de 2 × 2 pixeli (24 de biți), întinsă pe (x, y, l, h)."""
    dib = struct.pack('<IiiHHIIiiII', 40, 2, 2, 1, 24, 0, 16, 0, 0, 0, 0) + bytes(range(16))
    return rec_octeti(0x0F43, struct.pack('<IHhhhhhhhh', 0x00CC0020, 0, 2, 2, 0, 0, h, l, y, x) + dib)


PS_NULL, BS_NULL, ALTERNATE, WINDING = 5, 1, 1, 2

# ── Hârtia ───────────────────────────────────────────────────────────────────────────────────────────────────────────


def r10(v):
    """Rotunjit la 1e-10 mm: aceleași cifre pe orice platformă (cos și sin pot diferi pe ultimul bit)."""
    v = round(v, 10)
    return 0.0 if v == 0 else v


def pp(q):
    return [r10(q[0]), r10(q[1])]


def cale(ce, start, piese, inchis, tol='exact'):
    """O cale pe hârtie; închisă: ultima bucată se întoarce în start (se adaugă linia, dacă lipsește)."""
    piese = list(piese)
    if inchis and math.hypot(piese[-1][1][0] - start[0], piese[-1][1][1] - start[1]) > 1e-9:
        piese.append(('L', start))
    return {'ce': ce, 'inchis': inchis, 'start': start, 'piese': piese, 'tol': tol}


def frante(ce, puncte, inchis):
    """O linie frântă prin puncte (mm); închisă: fără primul punct repetat."""
    return cale(ce, puncte[0], [('L', q) for q in puncte[1:]], inchis)


def pe_elipsa(c, rx, ry, t):
    return (c[0] + rx * math.cos(t), c[1] + ry * math.sin(t))


def cerc(ce, c, r):
    """Cercul întreg, din punctul cel mai din dreapta, în sens trigonometric (cum îl scrie GDI)."""
    s = (c[0] + r, c[1])
    return cale(ce, s, [('A', (c[0] - r, c[1]), c, 180), ('A', s, c, 180)], True, 'cadru')


def elipsa(ce, c, rx, ry):
    s = (c[0] + rx, c[1])
    return cale(ce, s, [('E', s, c, rx, ry, 0.0, 2 * math.pi)], True, 'cadru')


def unghi(c, rx, ry, q):
    """Unghiul parametric al razei din centru spre q (ca la GDI: unde raza taie elipsa)."""
    return math.atan2((q[1] - c[1]) / ry, (q[0] - c[0]) / rx)


def arc_hartie(c, rx, ry, qs, qe, invers=False):
    """Arcul de la raza prin qs la raza prin qe, în sens trigonometric (`invers`: orar, cum îl desenează GDI când maparea
    oglindește axa X): (t0, dt, start, capăt), cu dt negativ în sens orar."""
    t0, t1 = unghi(c, rx, ry, qs), unghi(c, rx, ry, qe)
    if invers:
        dt = t1 - t0 if t1 < t0 else t1 - t0 - 2 * math.pi
    else:
        dt = t1 - t0 if t1 > t0 else t1 - t0 + 2 * math.pi
    return t0, dt, pe_elipsa(c, rx, ry, t0), pe_elipsa(c, rx, ry, t0 + dt)


def bucata_arc(c, rx, ry, t0, dt, capat):
    """Bucata de arc: de cerc (razele egale), cu baleiajul în grade, sau de elipsă."""
    if abs(rx - ry) < 1e-9:
        return ('A', capat, c, math.degrees(dt))
    return ('E', capat, c, rx, ry, t0, dt)


def dreptunghi_rotunjit(ce, x0, y0, x1, y1, rx, ry):
    """Ca la GDI: din dreapta-sus, în sens trigonometric; colțurile, sferturi de elipsă de raze (rx, ry)."""
    s = math.pi / 2
    start = (x1, y1 - ry)
    piese = [
        bucata_arc((x1 - rx, y1 - ry), rx, ry, 0, s, (x1 - rx, y1)), ('L', (x0 + rx, y1)),
        bucata_arc((x0 + rx, y1 - ry), rx, ry, s, s, (x0, y1 - ry)), ('L', (x0, y0 + ry)),
        bucata_arc((x0 + rx, y0 + ry), rx, ry, 2 * s, s, (x0 + rx, y0)), ('L', (x1 - rx, y0)),
        bucata_arc((x1 - rx, y0 + ry), rx, ry, 3 * s, s, (x1, y0 + ry)),
    ]
    return cale(ce, start, piese, True, 'cadru')


def dreptunghi(ce, x0, y0, x1, y1):
    """Ca la GDI: dreapta-sus, stânga-sus, stânga-jos, dreapta-jos."""
    return cale(ce, (x1, y1), [('L', (x0, y1)), ('L', (x0, y0)), ('L', (x1, y0))], True, 'cadru')


def metric(c, origine):
    """O cale desenată într-un mod metric, cu originea lui pe dispozitivul GDI (în pixeli): vezi `verifica_gdi`."""
    c['metric'] = origine
    return c


def json_cale(c):
    out = []
    for b in c['piese']:
        if b[0] == 'L':
            out.append({'L': pp(b[1])})
        elif b[0] == 'A':
            out.append({'A': pp(b[1]), 'c': pp(b[2]), 'dt': r10(b[3])})
        else:
            out.append({'E': pp(b[1]), 'c': pp(b[2]), 'rx': r10(b[3]), 'ry': r10(b[4]), 't0': r10(b[5]), 'dt': r10(b[6])})
    return {'ce': c['ce'], 'inchis': c['inchis'], 'start': pp(c['start']), 'piese': out}


def scrie(nume, date):
    with open(os.path.join(IESIRE, nume), 'wb') as g:
        g.write(date)
    return date


# ── GDI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────


def gdi_reda(date, pdf, player):
    """Redă WMF-ul pe „Microsoft Print to PDF”. `player`: (WO, WE, VO, VE) puse înainte, în MM_ANISOTROPIC."""
    import ctypes
    from ctypes import wintypes
    gdi = ctypes.WinDLL('gdi32', use_last_error=True)
    gdi.CreateDCW.restype = wintypes.HDC
    gdi.CreateDCW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.LPCWSTR, ctypes.c_void_p]
    gdi.SetMetaFileBitsEx.restype = wintypes.HANDLE
    gdi.SetMetaFileBitsEx.argtypes = [wintypes.UINT, ctypes.c_char_p]
    gdi.PlayMetaFile.argtypes = [wintypes.HDC, wintypes.HANDLE]
    gdi.DeleteMetaFile.argtypes = [wintypes.HANDLE]
    gdi.GetDeviceCaps.argtypes = [wintypes.HDC, ctypes.c_int]
    gdi.SetMapMode.argtypes = [wintypes.HDC, ctypes.c_int]
    for f in ('SetWindowOrgEx', 'SetWindowExtEx', 'SetViewportOrgEx', 'SetViewportExtEx'):
        getattr(gdi, f).argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_void_p]

    class DOCINFOW(ctypes.Structure):
        _fields_ = [('cbSize', ctypes.c_int), ('lpszDocName', wintypes.LPCWSTR), ('lpszOutput', wintypes.LPCWSTR),
                    ('lpszDatatype', wintypes.LPCWSTR), ('fwType', wintypes.DWORD)]

    gdi.StartDocW.argtypes = [wintypes.HDC, ctypes.POINTER(DOCINFOW)]
    for f in ('StartPage', 'EndPage', 'EndDoc', 'DeleteDC'):
        getattr(gdi, f).argtypes = [wintypes.HDC]
    hdc = gdi.CreateDCW('WINSPOOL', 'Microsoft Print to PDF', None, None)
    if not hdc:
        raise SystemExit('Imprimanta „Microsoft Print to PDF” lipsește: rulează cu --fara-gdi')
    assert gdi.GetDeviceCaps(hdc, 88) == DPI and gdi.GetDeviceCaps(hdc, 112) == 0 and gdi.GetDeviceCaps(hdc, 113) == 0
    if os.path.exists(pdf):
        os.remove(pdf)
    di = DOCINFOW(ctypes.sizeof(DOCINFOW), os.path.basename(pdf), pdf, None, 0)
    assert gdi.StartDocW(hdc, ctypes.byref(di)) > 0, ctypes.get_last_error()
    gdi.StartPage(hdc)
    corp = date[22:] if date[:4] == b'\xd7\xcd\xc6\x9a' else date
    hmf = gdi.SetMetaFileBitsEx(len(corp), corp)
    assert hmf
    (wox, woy), (wex, wey), (vox, voy), (vex, vey) = player
    gdi.SetMapMode(hdc, 8)
    gdi.SetWindowOrgEx(hdc, wox, woy, None)
    gdi.SetWindowExtEx(hdc, wex, wey, None)
    gdi.SetViewportOrgEx(hdc, vox, voy, None)
    gdi.SetViewportExtEx(hdc, vex, vey, None)
    assert gdi.PlayMetaFile(hdc, hmf)
    gdi.DeleteMetaFile(hmf)
    gdi.EndPage(hdc)
    gdi.EndDoc(hdc)
    marime = tuple(gdi.GetDeviceCaps(hdc, i) for i in (4, 6, 8, 10))  # HORZSIZE, VERTSIZE (mm întregi), HORZRES, VERTRES
    gdi.DeleteDC(hdc)
    return pdf, marime


def polilinie_hartie(c):
    """O cale pe hârtie ca polilinie fină: liniile exact, arcele cu coarda la cel mult 1e-4 mm de curbă."""
    import numpy as np
    pts = [c['start']]
    cur = c['start']
    for b in c['piese']:
        if b[0] == 'L':
            pts.append(b[1])
        elif b[0] == 'A':
            cx, cy = b[2]
            r = math.hypot(cur[0] - cx, cur[1] - cy)
            a0 = math.atan2(cur[1] - cy, cur[0] - cx)
            dt = math.radians(b[3])
            n = max(8, int(abs(dt) / math.sqrt(8e-4 / r)) + 1)
            pts += [(cx + r * math.cos(a0 + dt * k / n), cy + r * math.sin(a0 + dt * k / n)) for k in range(1, n)] + [b[1]]
        else:
            _, _, ce, rx, ry, t0, dt = b
            n = max(8, int(abs(dt) / math.sqrt(8e-4 / max(rx, ry))) + 1)
            pts += [pe_elipsa(ce, rx, ry, t0 + dt * k / n) for k in range(1, n)] + [b[1]]
        cur = b[1]
    return np.array(pts, dtype=float)


def subcai_gdi(pdf):
    """Subcăile desenate de GDI (trase sau umplute), în pixelii de 600 dpi, ca polilinii fine (cubicele în 256 de bucăți);
    cele mai mici de 0,1 mm (pixelii) se lasă deoparte."""
    import numpy as np
    import pymupdf
    d = pymupdf.open(pdf)
    p = d[0]
    k = DPI / 72
    rez = []
    for dr in p.get_drawings():
        inchis = 'f' in (dr['type'] or '') or bool(dr.get('closePath'))
        sub = None
        subcai = []
        for it in dr['items']:
            if it[0] in ('re', 'qu'):
                if it[0] == 're':
                    r = it[1]
                    colt = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
                else:
                    q = it[1]
                    colt = [(q.ul.x, q.ul.y), (q.ur.x, q.ur.y), (q.lr.x, q.lr.y), (q.ll.x, q.ll.y)]
                subcai.append(colt + [colt[0]])
                sub = None
                continue
            a = (it[1].x, it[1].y)
            if sub is None or math.hypot(sub[-1][0] - a[0], sub[-1][1] - a[1]) > 1e-6:
                sub = [a]
                subcai.append(sub)
            if it[0] == 'l':
                sub.append((it[2].x, it[2].y))
            elif it[0] == 'c':
                p0, p1, p2, p3 = [(q.x, q.y) for q in it[1:5]]
                for j in range(1, 257):
                    t = j / 256
                    u = 1 - t
                    sub.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                                u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
            else:
                raise AssertionError(f'{pdf}: segment neașteptat {it[0]}')
        for s in subcai:
            if inchis and math.hypot(s[-1][0] - s[0][0], s[-1][1] - s[0][1]) > 1e-6:
                s = s + [s[0]]
            arr = np.array(s, dtype=float) * k
            if np.hypot(*(arr.max(axis=0) - arr.min(axis=0))) * 25.4 / DPI >= 0.1:
                rez.append(arr)
    return rez, [w[4] for w in p.get_text('words')], len(p.get_image_info())


def desime(q, pas=0.05):
    """Punctele unei polilinii, cu cel mult `pas` mm între ele: de unde se măsoară distanța la cealaltă cale."""
    import numpy as np
    out = [q[:1]]
    for a, b in zip(q[:-1], q[1:]):
        n = max(1, int(math.hypot(*(b - a)) / pas) + 1)
        out.append(a + (b - a) * (np.arange(1, n + 1)[:, None] / n))
    return np.concatenate(out)


def departe(pts, q):
    """Distanța fiecărui punct din `pts` la polilinia `q` (la segmentele ei), în bucăți."""
    import numpy as np
    a, b = q[:-1], q[1:]
    ab = b - a
    l2 = (ab ** 2).sum(1)
    l2[l2 == 0] = 1e-30
    out = np.empty(len(pts))
    for i in range(0, len(pts), 256):
        p = pts[i:i + 256]
        ap = p[:, None, :] - a[None, :, :]
        t = np.clip((ap * ab[None]).sum(2) / l2[None], 0, 1)
        d = p[:, None, :] - (a[None] + t[..., None] * ab[None])
        out[i:i + 256] = np.hypot(d[..., 0], d[..., 1]).min(1)
    return out


def verifica_gdi(nume, date, cai, player, mm, text=None, imagini=0):
    """GDI-ul desenează exact căile de pe hârtie: fiecare subcale desenată stă pe o cale de pe hârtie (o cale poate fi
    desenată din mai multe bucăți: un lanț de LineTo, umplerea și conturul), iar fiecare cale de pe hârtie e acoperită de
    subcăile ei. `mm`: din pixelii GDI în mm-ii hârtiei (fără cadru, din originea pusă de playerul GDI).

    Modurile metrice: GDI le socotește din mărimea paginii în mm ÎNTREGI (HORZSIZE, VERTSIZE: 216 × 279 pentru 215,9 ×
    279,4), deci pe dispozitiv scările lor diferă de cele fizice cu până la 0,15 %. O cale desenată într-un mod metric
    (`metric`: originea modului pe dispozitiv, în pixeli) se compară după ce se desface rotunjirea dispozitivului; hârtia
    rămâne specificația (0,01 mm pe unitate la HIMETRIC)."""
    if FARA_GDI:
        return
    import numpy as np
    pdf, (hs, vs, hr, vr) = gdi_reda(date, os.path.join(tempfile.gettempdir(), f'wmf-corpus-{nume}.pdf'), player)
    gdi_px, cuvinte, imag = subcai_gdi(pdf)
    f = np.array([hr * 25.4 / (hs * DPI), vr * 25.4 / (vs * DPI)])

    def in_mm(g, origine):
        if origine is not None:
            g = np.array(origine, dtype=float) + (g - np.array(origine, dtype=float)) / f
        x, y = mm(g[:, 0], g[:, 1])
        return np.column_stack([x, y])

    variante = {origine: [in_mm(g, origine) for g in gdi_px] for origine in {c.get('metric') for c in cai}}
    hartie = [polilinie_hartie(c) for c in cai]
    tol = [TOL_EXACT if c['tol'] == 'exact' else TOL_CADRU for c in cai]
    ale = [[] for _ in cai]
    for i in range(len(gdi_px)):
        bune = []
        for k, h in enumerate(hartie):
            g = variante[cai[k].get('metric')][i]
            if (g.min(axis=0) < h.min(axis=0) - tol[k] - 1e-9).any() or (g.max(axis=0) > h.max(axis=0) + tol[k] + 1e-9).any():
                continue
            if departe(desime(g), h).max() <= tol[k]:
                bune.append(k)
        if not bune:
            d, k = min((departe(desime(variante[c.get('metric')][i]), h).max(), k) for k, (c, h) in enumerate(zip(cai, hartie)))
            g = variante[cai[k].get('metric')][i]
            raise AssertionError(f'{nume}: GDI desenează o subcale care nu e pe hârtie (cea mai apropiată: „{cai[k]["ce"]}”, la {d:.4f} mm), {g[:3].tolist()}')
        for k in bune:
            ale[k].append(variante[cai[k].get('metric')][i])
    for k, c in enumerate(cai):
        assert ale[k], f'{nume}: GDI nu desenează „{c["ce"]}”'
        puncte = desime(hartie[k])
        d = np.min([departe(puncte, g) for g in ale[k]], axis=0).max()
        assert d <= tol[k], f'{nume}: GDI nu desenează „{c["ce"]}” întreagă (un punct al ei e la {d:.4f} mm)'
    if text is not None:
        assert cuvinte == text, cuvinte
    assert imag == imagini, imag
    print(f'{nume}: GDI desenează {len(gdi_px)} subcăi, toate pe hârtie, și toate cele {len(cai)} căi')


def caz(nume, date, cai, raport, unitati, cadru, player=None, mm=None, text=None, imagini=0, gdi=None):
    """Un fișier: scris, redat de GDI (`gdi`: ce trage GDI, dacă diferă de ce importă ușa, ca la o formă nonzero, pe care GDI
    o trage cu subcăile ei, iar ușa o importă ca marginea zonei pline), apoi valorile lui în `asteptat.json`."""
    scrie(nume, date)
    if player is not None:
        verifica_gdi(nume, date, gdi if gdi is not None else cai, player, mm, text, imagini)
    ASTEPTAT[nume] = {'cai': [json_cale(c) for c in cai], 'raport': raport, 'unitati': unitati,
                      'cadru': [r10(cadru[0]), r10(cadru[1])] if cadru else None}


def placeable(inch, l, t, r, b):
    """Playerul unui fișier cu antet (§5) și trecerea din pixelii GDI în mm: cadrul în colțul paginii, la 600 dpi."""
    w, h = r - l, b - t
    assert (w * DPI) % inch == 0 and (h * DPI) % inch == 0, 'vizorul playerului GDI trebuie să fie întreg'
    vx, vy = w * DPI // inch, h * DPI // inch
    return ((l, t), (w, h), (0, 0), (vx, vy)), (lambda x, y: (x * 25.4 / DPI, (vy - y) * 25.4 / DPI))


# ── forme.wmf: dreptunghiul, polilinia, poligonul, lanțul de LineTo, cercul, elipsa, dreptunghiurile rotunjite, ────────
#    PolyPolygon par-impar și nonzero, textul, imaginea, decupajul, obiectele nule, SaveDC / RestoreDC


def forme():
    inch, W, H = 1440, 11520, 8640  # 8 × 6 țoli
    s = 25.4 / inch

    def mm(x, y):
        return (x * s, (H - y) * s)

    recs = [
        SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(W, H),
        IntersectClipRect(0, 0, W, H),
        Rectangle(720, 720, 3600, 2160),
        Polyline((4320, 720), (5040, 1440), (5760, 720)),
        Polygon((6480, 720), (7920, 720), (7200, 1800)),
        MoveTo(8640, 720), LineTo(10080, 720), LineTo(10080, 1800), LineTo(8640, 1800), LineTo(8640, 720),
        Ellipse(720, 2880, 2160, 4320),
        Ellipse(2880, 2880, 5760, 4320),
        RoundRect(6480, 2880, 9360, 4320, 1440, 720),
        RoundRect(9720, 2880, 11160, 4320, 720, 720),
        PolyPolygon([(720, 5040), (2880, 5040), (2880, 7200), (720, 7200)], [(1440, 5760), (2160, 5760), (2160, 6480), (1440, 6480)]),
        SetPolyFillMode(WINDING),
        PolyPolygon([(3600, 5040), (5040, 5040), (5040, 6480), (3600, 6480)], [(4320, 5760), (5760, 5760), (5760, 7200), (4320, 7200)]),
        SetPolyFillMode(ALTERNATE),
        # Textul, cu fundalul transparent (altfel GDI îi umple și cutia, cu culoarea fundalului).
        SetBkMode(1), TextOut(6480, 7920, 'CNC'),
        StretchDIB(9360, 7200, 720, 720),
        # Obiectele nule: penița 0, pensula 1 → poligonul nu se vede; pensula plină 2 → poligonul doar umplut se vede.
        CreatePen(PS_NULL), CreateBrush(BS_NULL), SelectObject(0), SelectObject(1),
        Polygon((6480, 5040), (7920, 5040), (7200, 5760)),
        CreateBrush(0), SelectObject(2),
        Polygon((8640, 5040), (10080, 5040), (9360, 5760)),
        CreatePen(0), SelectObject(3),
        # SaveDC / RestoreDC: fereastra mutată cu 720 (desenul la dreapta cu 12,7 mm), apoi pusă la loc.
        SaveDC(), SetWindowOrg(-720, 0), Polyline((7200, 7560), (8640, 7560)), RestoreDC(-1),
        Polyline((7200, 8280), (8640, 8280)),
        DeleteObject(0), DeleteObject(1), DeleteObject(2), DeleteObject(3),
    ]
    date = wmf(recs, (0, 0, W, H), inch)
    m = lambda *q: mm(*q)  # noqa: E731
    x0, y0 = m(6480, 4320)
    x1, y1 = m(9360, 2880)
    xr0, yr0 = m(9720, 4320)
    xr1, yr1 = m(11160, 2880)
    cai = [
        dreptunghi('Rectangle', *m(720, 2160), *m(3600, 720)),
        frante('Polyline', [m(4320, 720), m(5040, 1440), m(5760, 720)], False),
        frante('Polygon', [m(6480, 720), m(7920, 720), m(7200, 1800)], True),
        frante('lanțul de LineTo, întors exact în start', [m(8640, 720), m(10080, 720), m(10080, 1800), m(8640, 1800)], True),
        cerc('Ellipse rotundă', m(1440, 3600), 720 * s),
        elipsa('Ellipse', m(4320, 3600), 1440 * s, 720 * s),
        dreptunghi_rotunjit('RoundRect cu colțurile eliptice', x0, y0, x1, y1, 720 * s, 360 * s),
        dreptunghi_rotunjit('RoundRect cu colțurile rotunde', xr0, yr0, xr1, yr1, 360 * s, 360 * s),
        frante('PolyPolygon par-impar, exteriorul', [m(720, 5040), m(2880, 5040), m(2880, 7200), m(720, 7200)], True),
        frante('PolyPolygon par-impar, golul', [m(1440, 5760), m(2160, 5760), m(2160, 6480), m(1440, 6480)], True),
        frante('PolyPolygon nonzero, reuniunea', [m(3600, 5040), m(5040, 5040), m(5040, 5760), m(5760, 5760), m(5760, 7200),
                                                    m(4320, 7200), m(4320, 6480), m(3600, 6480)], True),
        frante('Polygon doar umplut (penița nulă)', [m(8640, 5040), m(10080, 5040), m(9360, 5760)], True),
        frante('Polyline cu fereastra mutată (SaveDC)', [m(7920, 7560), m(9360, 7560)], False),
        frante('Polyline după RestoreDC', [m(7200, 8280), m(8640, 8280)], False),
    ]
    # GDI trage forma nonzero cu cele două pătrate ale ei (doar umplerea e reuniunea).
    gdi = [c for c in cai if c['ce'] != 'PolyPolygon nonzero, reuniunea'] + [
        frante('PolyPolygon nonzero, primul pătrat', [m(3600, 5040), m(5040, 5040), m(5040, 6480), m(3600, 6480)], True),
        frante('PolyPolygon nonzero, al doilea pătrat', [m(4320, 5760), m(5760, 5760), m(5760, 7200), m(4320, 7200)], True),
    ]
    player, pix = placeable(inch, 0, 0, W, H)
    raport = {'deschise': 3, 'sarit-text': 1, 'sarit-imagine': 1, 'decupaje': 1, 'nepictate': 1, 'nonzero-normalizate': 1, 'arce-eliptice': 5}
    caz('forme.wmf', date, cai, raport, {'sursa': 'antet', 'inch': inch}, (W * s, H * s), player, pix, text=['CNC'], imagini=1, gdi=gdi)


# ── arce.wmf: Arc, Chord, Pie, pe cerc și pe elipsă, cu Y în jos, cu Y întors de fereastră și cu X oglindit ─────────────


def arce():
    inch, W, H = 1000, 8000, 6000  # 8 × 6 țoli
    s = 25.4 / inch

    def mm(x, y):
        return (x * s, (H - y) * s)

    cai = []

    def arc(fel, l, t, r, b, qs, qe, m, ce, invers=False):
        """Calea pe hârtie a unui Arc / Chord / Pie, din cutia și razele lui (în coordonatele logice, prin `m`); `invers`:
        maparea oglindește axa X, deci GDI îl desenează orar."""
        a, z = m(l, t), m(r, b)
        c = ((a[0] + z[0]) / 2, (a[1] + z[1]) / 2)
        rx, ry = abs(z[0] - a[0]) / 2, abs(z[1] - a[1]) / 2
        t0, dt, st, ca = arc_hartie(c, rx, ry, m(*qs), m(*qe), invers)
        intreg = abs(dt) == 2 * math.pi
        if intreg:
            ca = st
        if abs(rx - ry) < 1e-9 and abs(dt) > math.pi:
            piese = [bucata_arc(c, rx, ry, t0, dt / 2, pe_elipsa(c, rx, ry, t0 + dt / 2)), bucata_arc(c, rx, ry, t0 + dt / 2, dt / 2, ca)]
        else:
            piese = [bucata_arc(c, rx, ry, t0, dt, ca)]
        if fel == 'pie' and not intreg:
            piese.append(('L', c))
        # Un arc întreg (capetele pe aceeași rază) se întoarce în start: e închis.
        cai.append(cale(ce, st, piese, fel != 'arc' or intreg, 'cadru'))

    # Capetele arcelor nu stau pe axe: acolo GDI taie arcul într-o bucată minusculă, pe care o desenează cu mânerele la
    # ~0,4 mm (un artefact al lui, măsurat la 180°), iar oracolul ar judeca artefactul, nu sensul.
    recs = [SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(W, H)]
    # (1) Arcul de cerc de la 45° la 172° (127°), cu Y în jos.
    recs.append(Arc(500, 500, 2500, 2500, 2500, 500, 0, 1300))
    arc('arc', 500, 500, 2500, 2500, (2500, 500), (0, 1300), mm, 'Arc 45° → 172°')
    # (2) Arcul de peste 180° (de la −76° la 153°, 229°): două jumătăți.
    recs.append(Arc(3000, 500, 5000, 2500, 4500, 3500, 3000, 1000))
    arc('arc', 3000, 500, 5000, 2500, (4500, 3500), (3000, 1000), mm, 'Arc de peste 180°')
    # (3) Arcul de elipsă de la 45° (parametric) la 225°.
    recs.append(Arc(5500, 500, 7500, 1500, 7500, 500, 5500, 1500))
    arc('arc', 5500, 500, 7500, 1500, (7500, 500), (5500, 1500), mm, 'Arc de elipsă')
    # (4) Capetele pe aceeași rază (nu pe axe): cercul întreg, din punctul razei.
    recs.append(Arc(5500, 2000, 7500, 4000, 7600, 2100, 7600, 2100))
    arc('arc', 5500, 2000, 7500, 4000, (7600, 2100), (7600, 2100), mm, 'Arc cu capetele egale: cercul întreg')
    # (5) Chord pe elipsă, de la 45° la 135° (parametric), închis cu coarda.
    recs.append(Chord(500, 3000, 3500, 4500, 3500, 3000, 500, 3000))
    arc('chord', 500, 3000, 3500, 4500, (3500, 3000), (500, 3000), mm, 'Chord pe elipsă')
    # (6) Pie pe cerc, de la atan(1/4) la 90° + atan(1/4), închis cu cele două raze.
    recs.append(Pie(4000, 3000, 5000, 4000, 5500, 3250, 4250, 2500))
    arc('pie', 4000, 3000, 5000, 4000, (5500, 3250), (4250, 2500), mm, 'Pie pe cerc')
    # (7) Y întors de fereastră (Y în sus, originea jos): arcul de la 45° la 191° se vede tot trigonometric.
    recs += [SaveDC(), SetWindowOrg(0, H), SetWindowExt(W, -H), Arc(500, 300, 1500, 1300, 1600, 1400, 0, 600), RestoreDC(-1)]
    arc('arc', 500, 300, 1500, 1300, (1600, 1400), (0, 600), lambda x, y: (x * s, y * s), 'Arc cu Y întors')
    # (8) Doar X oglindit de fereastră: raza de start, scrisă spre stânga-sus, se vede spre dreapta-sus (45°), cea de
    # sfârșit spre stânga (169°). GDI desenează arcul ORAR, cum se vede: e singura combinație de axe care schimbă sensul.
    recs += [SaveDC(), SetWindowOrg(W, 0), SetWindowExt(-W, H), Arc(5000, 4800, 6000, 5800, 4800, 4600, 6500, 5100), RestoreDC(-1)]
    arc('arc', 5000, 4800, 6000, 5800, (4800, 4600), (6500, 5100), lambda x, y: ((W - x) * s, (H - y) * s), 'Arc cu X oglindit', True)
    # (9) Ambele axe întoarse (o rotire cu 180°): tot trigonometric, de la 135° la 11° (văzute).
    recs += [SaveDC(), SetWindowOrg(W, H), SetWindowExt(-W, -H), Arc(1000, 300, 2000, 1300, 2100, 1400, 500, 1000), RestoreDC(-1)]
    arc('arc', 1000, 300, 2000, 1300, (2100, 1400), (500, 1000), lambda x, y: ((W - x) * s, y * s), 'Arc cu ambele axe întoarse')
    date = wmf(recs, (0, 0, W, H), inch)
    player, pix = placeable(inch, 0, 0, W, H)
    raport = {'deschise': 6, 'arce-eliptice': 2}
    caz('arce.wmf', date, cai, raport, {'sursa': 'antet', 'inch': inch}, (W * s, H * s), player, pix)


# ── mapare.wmf: fereastra față de cadru, vizorul fișierului, mutările și scările, ISOTROPIC, HIMETRIC, MM_TEXT ─────────


def mapare():
    inch, W, H = 600, 4800, 3600  # o unitate = un pixel de 600 dpi: vizorul fișierului e în aceleași unități la GDI
    s = 25.4 / inch

    def dev(x, y):
        """Din unitățile dispozitivului (cadrul are 4800 × 3600) în mm, cu Y întors."""
        return (x * s, (H - y) * s)

    cai = []
    recs = [SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(2400, 1800)]
    # (1) Fereastra de 2400 × 1800 pe cadrul de 4800 × 3600: scara 2.
    recs.append(Rectangle(100, 100, 600, 400))
    cai.append(dreptunghi('Rectangle la scara 2', *dev(200, 800), *dev(1200, 200)))
    # (2) Originea vizorului, a fișierului: + (2400, 0) pe dispozitiv.
    recs += [SaveDC(), SetViewportOrg(2400, 0), Polyline((0, 100), (500, 100), (500, 400)), RestoreDC(-1)]
    cai.append(frante('Polyline cu SetViewportOrg', [dev(2400, 200), dev(3400, 200), dev(3400, 800)], False))
    # (3) Extinderea vizorului, a fișierului (2400 × 3600): scara 1 pe X, 2 pe Y.
    recs += [SaveDC(), SetViewportExt(2400, 3600), Rectangle(2000, 100, 2400, 300), RestoreDC(-1)]
    cai.append(dreptunghi('Rectangle cu SetViewportExt', *dev(2000, 600), *dev(2400, 200)))
    # (4) OffsetWindowOrg(−100, −50): desenul la dreapta cu 200 și în jos cu 100 (scara 2).
    recs += [OffsetWindowOrg(-100, -50), Polygon((100, 500), (400, 500), (250, 700)), OffsetWindowOrg(100, 50)]
    cai.append(frante('Polygon cu OffsetWindowOrg', [dev(400, 1100), dev(1000, 1100), dev(700, 1500)], True))
    # (5) ScaleWindowExt(1/2, 1/2): fereastra 1200 × 900, scara 4.
    recs += [SaveDC(), ScaleWindowExt(1, 2, 1, 2), Polyline((700, 100), (800, 100), (800, 150)), RestoreDC(-1)]
    cai.append(frante('Polyline cu ScaleWindowExt', [dev(2800, 400), dev(3200, 400), dev(3200, 600)], False))
    # (6) ISOTROPIC, cu fereastra 1000 × 1000 și vizorul 2000 × 1000: vizorul se strânge la 1000 × 1000 (scara 1).
    recs += [SaveDC(), SetMapMode(7), SetWindowExt(1000, 1000), SetViewportExt(2000, 1000), Ellipse(3000, 2000, 3600, 2600),
             Rectangle(3700, 2000, 4300, 2300), RestoreDC(-1)]
    cai.append(cerc('Ellipse în ISOTROPIC', dev(3300, 2300), 300 * s))
    cai.append(dreptunghi('Rectangle în ISOTROPIC', *dev(3700, 2300), *dev(4300, 2000)))
    # (7) HIMETRIC: 0,01 mm, Y în sus, din originea cadrului (fereastra și vizorul cu originea 0).
    recs += [SaveDC(), SetMapMode(3), Rectangle(1000, -9000, 5000, -11000), Polyline((6000, -9000), (9000, -12000)), RestoreDC(-1)]
    cai.append(metric(dreptunghi('Rectangle în HIMETRIC', 10, H * s - 110, 50, H * s - 90), (0, 0)))
    cai.append(metric(frante('Polyline în HIMETRIC', [(60, H * s - 90), (90, H * s - 120)], False), (0, 0)))
    # (8) MM_TEXT: o unitate logică = una a dispozitivului.
    recs += [SaveDC(), SetMapMode(1), Polyline((200, 3000), (1000, 3400), (1800, 3000)), RestoreDC(-1)]
    cai.append(frante('Polyline în MM_TEXT', [dev(200, 3000), dev(1000, 3400), dev(1800, 3000)], False))
    date = wmf(recs, (0, 0, W, H), inch)
    player, pix = placeable(inch, 0, 0, W, H)
    raport = {'deschise': 4}
    caz('mapare.wmf', date, cai, raport, {'sursa': 'antet', 'inch': inch}, (W * s, H * s), player, pix)


# ── fin.wmf: o unitate = 0,001 mm; închiderea la ușă, praful, poligonul degenerat ───────────────────────────────────────


def fin():
    inch, W, H = 25400, 25400, 25400  # 25,4 × 25,4 mm
    s = 25.4 / inch

    def mm(x, y):
        return (x * s, (H - y) * s)

    recs = [
        SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(W, H),
        # Capătul la 0,005 mm de start: închisă la ușă.
        Polyline((1000, 1000), (20000, 1000), (20000, 20000), (1000, 20000), (1005, 1000)),
        # Un triunghi de 0,005 mm: praf.
        Polygon((22000, 22000), (22005, 22000), (22000, 22005)),
        # Toate punctele egale: degenerat.
        Polygon((23000, 23000), (23000, 23000), (23000, 23000)),
    ]
    date = wmf(recs, (0, 0, W, H), inch)
    cai = [frante('Polyline închisă la ușă', [mm(1000, 1000), mm(20000, 1000), mm(20000, 20000), mm(1000, 20000), mm(1005, 1000)], True)]
    player, pix = placeable(inch, 0, 0, W, H)
    raport = {'inchise-la-usa': 1, 'sub-rezolutie': 1, 'degenerate': 1}
    caz('fin.wmf', date, cai, raport, {'sursa': 'antet', 'inch': inch}, (W * s, H * s), player, pix)


# ── fara-antet.wmf: fără antet placeable, ANISOTROPIC cu fereastra; unitatea aleasă (implicit 1/96 țol) ───────────────


def fara_antet():
    p = 25.4 / 96

    def mm(x, y):
        return (x * p, -y * p)

    recs = [SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(800, 600), Rectangle(40, 40, 400, 240), Ellipse(440, 40, 640, 240),
            Polyline((40, 300), (400, 560), (760, 300))]
    date = wmf(recs)
    cai = [
        dreptunghi('Rectangle', *mm(40, 240), *mm(400, 40)),
        cerc('Ellipse rotundă', mm(540, 140), 100 * p),
        frante('Polyline', [mm(40, 300), mm(400, 560), mm(760, 300)], False),
    ]
    # Playerul GDI: vizorul cât fereastra fișierului (800 × 600), la 600 / 96 = 6,25 pixeli pe unitate.
    player = ((0, 0), (800, 600), (50, 50), (5000, 3750))
    raport = {'unitati-nedeclarate': 1, 'deschise': 1}
    caz('fara-antet.wmf', date, cai, raport, {'sursa': 'aleasa', 'unitate': 'px'}, None, player,
        lambda x, y: ((x - 50) * 25.4 / DPI, -(y - 50) * 25.4 / DPI))


# ── himetric.wmf: fără antet, în MM_HIMETRIC: unitatea e a modului (0,01 mm, Y în sus) ────────────────────────────────


def himetric():
    recs = [SetMapMode(3), Rectangle(1000, -1000, 5000, -3000), Ellipse(6000, -1000, 8000, -3000), RoundRect(1000, -4000, 5000, -6000, 1000, 1000)]
    date = wmf(recs)
    cai = [
        metric(dreptunghi('Rectangle', 10, -30, 50, -10), (100, 100)),
        metric(cerc('Ellipse rotundă', (70, -20), 10), (100, 100)),
        metric(dreptunghi_rotunjit('RoundRect', 10, -60, 50, -40, 5, 5), (100, 100)),
    ]
    player = ((0, 0), (1, 1), (100, 100), (1, 1))
    raport = {}
    caz('himetric.wmf', date, cai, raport, {'sursa': 'mapare', 'mm': 0.01}, None, player,
        lambda x, y: ((x - 100) * 25.4 / DPI, -(y - 100) * 25.4 / DPI))


# ── obiecte.wmf: tabelul obiectelor GDI (locul cel mai mic liber), penița și pensula nule, pixelul ─────────────────────


def obiecte():
    inch, W, H = 1000, 6000, 4000
    s = 25.4 / inch

    def mm(x, y):
        return (x * s, (H - y) * s)

    recs = [
        SetMapMode(8), SetWindowOrg(0, 0), SetWindowExt(W, H),
        CreatePen(PS_NULL),  # 0
        CreateBrush(BS_NULL),  # 1
        CreateBrush(0),  # 2
        CreateFont(),  # 3
        DeleteObject(1),
        CreatePen(0),  # locul 1 (cel mai mic liber), nu 4
        SelectObject(0), SelectObject(2),
        Polygon((500, 500), (2000, 500), (1250, 1500)),  # doar umplut: se vede
        DeleteObject(2),
        CreateBrush(BS_NULL),  # locul 2
        SelectObject(2),
        Polygon((2500, 500), (4000, 500), (3250, 1500)),  # penița și pensula nule: nu se vede
        Polyline((500, 2000), (2000, 2000)),  # penița nulă: nu se vede
        SelectObject(1),  # penița plină, din locul 1
        Polygon((4500, 500), (5500, 500), (5000, 1500)),  # doar trasă: se vede
        Polyline((500, 2500), (2000, 2500), (2000, 3500)),
        SetPixel(3000, 3000),
    ]
    date = wmf(recs, (0, 0, W, H), inch)
    cai = [
        frante('Polygon doar umplut', [mm(500, 500), mm(2000, 500), mm(1250, 1500)], True),
        frante('Polygon doar tras, cu penița din locul 1', [mm(4500, 500), mm(5500, 500), mm(5000, 1500)], True),
        frante('Polyline', [mm(500, 2500), mm(2000, 2500), mm(2000, 3500)], False),
    ]
    player, pix = placeable(inch, 0, 0, W, H)
    raport = {'deschise': 1, 'nepictate': 2, 'sarit-altele': 1}
    caz('obiecte.wmf', date, cai, raport, {'sursa': 'antet', 'inch': inch}, (W * s, H * s), player, pix)


# ── Refuzurile: doar text (golul), un EMF, o înregistrare ruptă ─────────────────────────────────────────────────────────


def refuzuri():
    scrie('text.wmf', wmf([SetMapMode(8), SetWindowExt(2000, 1000), TextOut(100, 100, 'CNC')], (0, 0, 2000, 1000), 1000))
    ASTEPTAT['text.wmf'] = {'refuz': 'gol', 'raport': {'sarit-text': 1}}
    # Un EMF: `EMR_HEADER` (88 de octeți, „ EMF” la octetul 40), apoi `EMR_EOF`.
    emf = struct.pack('<II4i4iIIIIHHIII2i2i', 1, 88, 0, 0, 100, 100, 0, 0, 2540, 2540, 0x464D4520, 0x10000, 108, 2, 1, 0, 0, 0, 0,
                      1920, 1080, 508, 286)
    emf += struct.pack('<IIIII', 14, 20, 0, 16, 20)
    scrie('desen.emf', emf)
    ASTEPTAT['desen.emf'] = {'refuz': 'emf'}
    # Prima înregistrare (la octetul 40, după cele două antete) spune 1 000 de cuvinte, dar fișierul se termină înainte.
    rupt = wmf([SetMapMode(8), Rectangle(0, 0, 100, 100)], (0, 0, 1000, 1000), 1000)
    rupt = rupt[:40] + struct.pack('<I', 1000) + rupt[44:]
    scrie('rupt.wmf', rupt)
    ASTEPTAT['rupt.wmf'] = {'refuz': 'wmf', 'detaliu': '40'}


forme()
arce()
mapare()
fin()
fara_antet()
himetric()
obiecte()
refuzuri()

with open(os.path.join(IESIRE, 'asteptat.json'), 'w', encoding='utf-8', newline='\n') as g:
    json.dump(ASTEPTAT, g, ensure_ascii=False, indent=1, sort_keys=True)
    g.write('\n')
print(f'{len(ASTEPTAT)} fișiere în {IESIRE}' + (' (fără GDI)' if FARA_GDI else ', toate redate de GDI ca pe hârtie'))
