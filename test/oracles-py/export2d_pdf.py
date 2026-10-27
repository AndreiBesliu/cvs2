"""Partea PDF / EPS a oracolului exportului 2D (ADR 0089): un PDF citit de PyMuPDF (cititor independent), comparat cu
formele corpusului pe hârtie (`scripts/export2d-corpus.ts`, descrierea din antet; valorile de aici, din formule).

PDF-ul și EPS-ul n-au arc: arcele și cercurile vin din cubice, deci verificarea e pe distanță: fiecare punct al fiecărei căi
(capetele liniilor, 17 puncte pe fiecare cubică) trebuie să cadă pe forma de pe hârtie, cel mult la toleranța dată; fiecare
vârf de pe hârtie trebuie să fie un capăt al căii; punctele de control ale cubicelor exacte (curba S, „D”-ul, ovalul) sunt
cele de pe hârtie. EPS-ul ajunge aici ca PDF, prin Ghostscript (interpretorul PostScript real), deci fără straturi: rolul
se citește din culoare.
"""
import math

import fitz

K = 72 / 25.4  # puncte pe mm
COS30, SIN30 = math.cos(math.pi / 6), math.sin(math.pi / 6)

CULORI = {
    'EXTERIOR': (0xd6, 0x27, 0x28), 'INTERIOR': (0x1f, 0x77, 0xb4), 'PE_LINIE': (0x2c, 0xa0, 0x2c), 'BUZUNAR': (0x94, 0x67, 0xbd),
    'GAURIRE': (0x17, 0xbe, 0xcf), 'FARA_OPERATIE': (0, 0, 0), 'FOAIE': (0x7f, 0x7f, 0x7f),
}
CATE = {'EXTERIOR': 4, 'INTERIOR': 2, 'PE_LINIE': 2, 'BUZUNAR': 1, 'GAURIRE': 1, 'FARA_OPERATIE': 2, 'FOAIE': 1}


def rot30(x, y):
    return (COS30 * x - SIN30 * y + 150, SIN30 * x + COS30 * y + 100)


def linie(p, q):
    return ('L', p, q)


def arc(c, r, u0, u1):
    """Arcul de centru c, rază r, între unghiurile u0 și u1 (u0 < u1, în sens trigonometric)."""
    return ('A', c, r, u0, u1)


def cubica(*p):
    return ('C', p)


def dreptunghi_rotunjit(w, h, r, transforma):
    """Conturul dreptunghiului w × h cu colțurile R (colțul stânga-jos în 0), după transformare (o asemănare)."""
    t = transforma
    prim = [
        linie(t(r, 0), t(w - r, 0)), linie(t(w, r), t(w, h - r)), linie(t(w - r, h), t(r, h)), linie(t(0, h - r), t(0, r)),
    ]
    for (cx, cy, u0) in [(w - r, r, -math.pi / 2), (w - r, h - r, 0), (r, h - r, math.pi / 2), (r, r, math.pi)]:
        # Arcul colțului, ca puncte pe hârtie: centrul și raza după transformare (o asemănare păstrează cercul).
        c = t(cx, cy)
        q = t(cx + r * math.cos(u0), cy + r * math.sin(u0))
        rr = math.hypot(q[0] - c[0], q[1] - c[1])
        a0 = math.atan2(q[1] - c[1], q[0] - c[0])
        q1 = t(cx + r * math.cos(u0 + math.pi / 2), cy + r * math.sin(u0 + math.pi / 2))
        a1 = math.atan2(q1[1] - c[1], q1[0] - c[0])
        prim.append(('A2', c, rr, a0, a1))
    varfuri = [t(*p) for p in [(r, 0), (w - r, 0), (w, r), (w, h - r), (w - r, h), (r, h), (0, h - r), (0, r)]]
    return prim, varfuri


def dist_prim(p, prim):
    x, y = p
    if prim[0] == 'L':
        (ax, ay), (bx, by) = prim[1], prim[2]
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(x - ax - t * dx, y - ay - t * dy)
    if prim[0] in ('A', 'A2'):
        (cx, cy), r = prim[1], prim[2]
        u = math.atan2(y - cy, x - cx)
        if prim[0] == 'A':
            u0, u1 = prim[3], prim[4]
        else:
            # Sfertul dintre a0 și a1, pe drumul cel mai scurt (sensul lui nu contează pentru distanță).
            a0, a1 = prim[3], prim[4]
            d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
            u0, u1 = (a0, a0 + d) if d > 0 else (a0 + d, a0)
        rel = (u - u0) % (2 * math.pi)
        if rel <= (u1 - u0) + 1e-9:
            return abs(math.hypot(x - cx, y - cy) - r)
        capete = [(cx + r * math.cos(u0), cy + r * math.sin(u0)), (cx + r * math.cos(u1), cy + r * math.sin(u1))]
        return min(math.hypot(x - a, y - b) for a, b in capete)
    pts = prim[1]

    def d(t):
        u = 1 - t
        bx = u ** 3 * pts[0][0] + 3 * u * u * t * pts[1][0] + 3 * u * t * t * pts[2][0] + t ** 3 * pts[3][0]
        by = u ** 3 * pts[0][1] + 3 * u * u * t * pts[1][1] + 3 * u * t * t * pts[2][1] + t ** 3 * pts[3][1]
        return math.hypot(x - bx, y - by)

    # 200 de puncte, apoi secțiunea de aur în jurul celui mai apropiat (distanța e netedă acolo): sub 1e-9 mm.
    t0 = min(range(201), key=lambda i: d(i / 200)) / 200
    a, b = max(0.0, t0 - 1 / 200), min(1.0, t0 + 1 / 200)
    g = (math.sqrt(5) - 1) / 2
    for _ in range(60):
        c1, c2 = b - g * (b - a), a + g * (b - a)
        if d(c1) <= d(c2):
            b = c2
        else:
            a = c1
    return d((a + b) / 2)


def forme_pe_hartie():
    """Formele corpusului, pe straturi: (strat, primitive, vârfurile care trebuie să fie capete, cubicele exacte)."""
    drept, v_drept = dreptunghi_rotunjit(200, 100, 10, rot30)
    oglindit, v_ogl = dreptunghi_rotunjit(40, 20, 5, lambda x, y: (560 - x, y))
    k = 0.5522847498
    oval = [
        ((140, 300), (140, 300 + 20 * k), (100 + 40 * k, 320), (100, 320)),
        ((100, 320), (100 - 40 * k, 320), (60, 300 + 20 * k), (60, 300)),
        ((60, 300), (60, 300 - 20 * k), (100 - 40 * k, 280), (100, 280)),
        ((100, 280), (100 + 40 * k, 280), (140, 300 - 20 * k), (140, 300)),
    ]
    # Arcul lui D: coarda (200, 350) → (200, 300), bulge −0,5: θ = 4·atan 0,5, R = 25 / sin(θ / 2) = 31,25; centrul pe
    # mediatoare, la √(R² − 25²) = 18,75 de mijlocul (200, 325), de partea opusă arcului (arcul iese spre x > 200).
    rd = 25 / math.sin(2 * math.atan(0.5))
    cd = (200 - math.sqrt(rd * rd - 625), 325)
    ud = math.atan2(25, 200 - cd[0])
    cerc = lambda c, r: [arc(c, r, -math.pi, math.pi)]
    return [
        ('EXTERIOR', drept, v_drept, []),
        ('EXTERIOR', [cubica((260, 300), (290, 300), (290, 350), (260, 350))], [(260, 300), (260, 350)], [((260, 300), (290, 300), (290, 350), (260, 350))]),
        ('EXTERIOR', [linie((260, 350), (200, 350)), arc(cd, rd, -ud, ud), linie((200, 300), (260, 300))], [(260, 350), (200, 350), (200, 300), (260, 300)], []),
        ('EXTERIOR', cerc((580, 30), 5), [], []),
        ('INTERIOR', cerc((400, 250), 50), [], []),
        ('INTERIOR', cerc((300, 330), 25), [], []),
        ('PE_LINIE', [cubica((300, 50), (330, 110), (370, -10), (400, 50))], [(300, 50), (400, 50)], [((300, 50), (330, 110), (370, -10), (400, 50))]),
        # Semicercul de la (450, 50) la (500, 50), bulge 1 (trigonometric): trece pe dedesubt, prin (475, 25).
        ('PE_LINIE', [linie((400, 50), (450, 50)), arc((475, 50), 25, -math.pi, 0)], [(400, 50), (450, 50), (500, 50)], []),
        ('BUZUNAR', [cubica(*c) for c in oval], [(140, 300), (100, 320), (60, 300), (100, 280)], oval),
        ('GAURIRE', cerc((540, 380), 3), [], []),
        ('FARA_OPERATIE', cerc((10, 10), 0.01), [], []),
        ('FARA_OPERATIE', oglindit, v_ogl, []),
        ('FOAIE', [linie((0, 0), (600, 0)), linie((600, 0), (600, 400)), linie((600, 400), (0, 400)), linie((0, 400), (0, 0))], [(0, 0), (600, 0), (600, 400), (0, 400)], []),
    ]


def puncte_pe_prim(prim):
    """Puncte pe o primitivă de pe hârtie (capetele și 7 puncte între), pentru acoperire: fiecare trebuie să fie pe cale."""
    if prim[0] == 'L':
        (ax, ay), (bx, by) = prim[1], prim[2]
        return [(ax + (bx - ax) * i / 8, ay + (by - ay) * i / 8) for i in range(9)]
    if prim[0] in ('A', 'A2'):
        (cx, cy), r = prim[1], prim[2]
        if prim[0] == 'A':
            u0, u1 = prim[3], prim[4]
        else:
            a0, a1 = prim[3], prim[4]
            d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
            u0, u1 = (a0, a0 + d) if d > 0 else (a0 + d, a0)
        return [(cx + r * math.cos(u0 + (u1 - u0) * i / 8), cy + r * math.sin(u0 + (u1 - u0) * i / 8)) for i in range(9)]
    q = prim[1]
    rez = []
    for i in range(9):
        t = i / 8
        u = 1 - t
        rez.append((u ** 3 * q[0][0] + 3 * u * u * t * q[1][0] + 3 * u * t * t * q[2][0] + t ** 3 * q[3][0],
                    u ** 3 * q[0][1] + 3 * u * u * t * q[1][1] + 3 * u * t * t * q[2][1] + t ** 3 * q[3][1]))
    return rez


def bucati_cale(dr, H):
    """Bucățile căii ca primitive (linii și cubice, în mm, Y în sus), ca distanța unui punct la cale să fie exactă."""
    mm = lambda q: (q.x / K, (H - q.y) / K)
    rez = []
    for it in dr['items']:
        if it[0] == 'l':
            rez.append(linie(mm(it[1]), mm(it[2])))
        elif it[0] == 'c':
            rez.append(cubica(*[mm(q) for q in it[1:5]]))
        elif it[0] == 'qu':
            c = [mm(it[1].ul), mm(it[1].ur), mm(it[1].lr), mm(it[1].ll)]
            rez += [linie(c[i], c[(i + 1) % 4]) for i in range(4)]
        elif it[0] == 're':
            r = it[1]
            c = [(r.x0 / K, (H - r.y0) / K), (r.x1 / K, (H - r.y0) / K), (r.x1 / K, (H - r.y1) / K), (r.x0 / K, (H - r.y1) / K)]
            rez += [linie(c[i], c[(i + 1) % 4]) for i in range(4)]
    return rez


def puncte_cale(dr, H):
    """Capetele și punctele de pe cubice ale unei căi PyMuPDF, în mm, cu Y în sus; plus cubicele (puncte de control, mm)."""
    mm = lambda q: (q.x / K, (H - q.y) / K)
    capete, puncte, cubice = [], [], []
    for it in dr['items']:
        if it[0] == 'l':
            a, b = mm(it[1]), mm(it[2])
            capete += [a, b]
            puncte += [a, b]
        elif it[0] == 'c':
            p = [mm(q) for q in it[1:5]]
            capete += [p[0], p[3]]
            cubice.append(tuple(p))
            for i in range(17):
                t = i / 16
                u = 1 - t
                puncte.append((u ** 3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t ** 3 * p[3][0],
                               u ** 3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t ** 3 * p[3][1]))
        elif it[0] == 're':
            r = it[1]
            for q in [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]:
                capete.append((q[0] / K, (H - q[1]) / K))
                puncte.append(capete[-1])
        elif it[0] == 'qu':
            for q in [it[1].ul, it[1].ur, it[1].lr, it[1].ll]:
                capete.append(mm(q))
                puncte.append(capete[-1])
    return capete, puncte, cubice


def strat_din_culoare(culoare):
    best, nume = 1.0, None
    for s, c in CULORI.items():
        d = max(abs(culoare[i] - c[i] / 255) for i in range(3))
        if d < best:
            best, nume = d, s
    return nume if best <= 0.003 else None


def desene_eps(cale):
    """Căile EPS-ului nostru, citite direct din text (un cititor mic, doar pentru subsetul pe care îl scriem: `scale`,
    `setrgbcolor`, `moveto`, `lineto`, `curveto`, `closepath`, `stroke`), puse în forma căilor PyMuPDF (puncte, Y în jos),
    ca să treacă prin aceeași verificare. Întoarce lățimea, înălțimea (din %%HiResBoundingBox, în puncte) și căile."""
    text = open(cale, encoding='ascii').read()
    box = [float(x) for x in text.split('%%HiResBoundingBox:')[1].split('\n')[0].split()]
    W, H = box[2] - box[0], box[3] - box[1]
    stiva, culoare, cale_curenta, cai, scara, curent = [], None, [], [], 1.0, None
    pt = lambda x, y: fitz.Point(x * scara - box[0], H - (y * scara - box[1]))
    for tok in ' '.join(l for l in text.split('\n') if not l.startswith('%')).split():
        try:
            stiva.append(float(tok))
            continue
        except ValueError:
            pass
        if tok == 'scale':
            sy, sx = stiva.pop(), stiva.pop()
            assert sx == sy, 'scară neuniformă'
            scara = sx
        elif tok == 'setrgbcolor':
            b, g, r = stiva.pop(), stiva.pop(), stiva.pop()
            culoare = (r, g, b)
        elif tok == 'setlinewidth':
            stiva.pop()
        elif tok in ('setlinecap', 'setlinejoin'):
            stiva.pop()
        elif tok == 'moveto':
            y, x = stiva.pop(), stiva.pop()
            curent = start = pt(x, y)
        elif tok == 'lineto':
            y, x = stiva.pop(), stiva.pop()
            q = pt(x, y)
            cale_curenta.append(('l', curent, q))
            curent = q
        elif tok == 'curveto':
            v = [stiva.pop() for _ in range(6)][::-1]
            q = [pt(v[0], v[1]), pt(v[2], v[3]), pt(v[4], v[5])]
            cale_curenta.append(('c', curent, *q))
            curent = q[2]
        elif tok == 'closepath':
            if abs(curent.x - start.x) > 1e-9 or abs(curent.y - start.y) > 1e-9:
                cale_curenta.append(('l', curent, start))
        elif tok == 'stroke':
            cai.append({'color': culoare, 'items': cale_curenta, 'layer': None})
            cale_curenta = []
        elif tok in ('gsave', 'grestore', 'showpage', 'newpath'):
            pass
        else:
            raise ValueError(f'cuvânt PostScript neașteptat: {tok}')
        assert not (tok == 'stroke' and stiva), 'stiva nu e goală la stroke'
    return W, H, cai


def verifica_pdf(cale, cu_straturi, tol, verifica, desene=None):
    """Întoarce abaterea maximă măsurată (mm) și câte căi a citit. Cu `desene` (lățimea, înălțimea, căile), nu mai
    deschide fișierul: căile vin de la alt cititor (`desene_eps`)."""
    if desene is None:
        doc = fitz.open(cale)
        verifica(doc.page_count == 1, f'{cale}: {doc.page_count} pagini')
        pagina = doc[0]
        W, H = pagina.rect.width, pagina.rect.height
        if cu_straturi:
            verifica(doc.metadata.get('format') == 'PDF 1.5', f'{cale}: {doc.metadata.get("format")}')
            ocg = doc.get_ocgs()
            verifica(sorted(o['name'] for o in ocg.values()) == sorted(CATE), f'{cale}: straturile {sorted(o["name"] for o in ocg.values())}')
            verifica(all(o['on'] for o in ocg.values()), f'{cale}: un strat ascuns')
        cai = pagina.get_drawings()
    else:
        W, H, cai = desene
    verifica(abs(W / K - 600) <= 0.005 and abs(H / K - 400) <= 0.005, f'{cale}: pagina {W / K} × {H / K} mm')
    pe_strat = {}
    for dr in cai:
        s = dr.get('layer') if cu_straturi else strat_din_culoare(dr['color'])
        verifica(s in CATE, f'{cale}: o cale fără strat cunoscut ({dr.get("layer")}, {dr["color"]})')
        verifica(dr['color'] is not None and strat_din_culoare(dr['color']) == s, f'{cale}: culoarea căii pe {s}')
        pe_strat.setdefault(s, []).append(dr)
    verifica({s: len(x) for s, x in pe_strat.items()} == CATE, f'{cale}: căile pe straturi {({s: len(x) for s, x in pe_strat.items()})}')

    abatere = 0.0
    folosite = set()
    for strat, prim, varfuri, exacte in forme_pe_hartie():
        # Calea care se potrivește formei: pe stratul ei, cu toate punctele pe formă și cu vârfurile ei ca capete.
        potrivita = None
        for i, dr in enumerate(pe_strat.get(strat, [])):
            if (strat, i) in folosite:
                continue
            capete, puncte, cubice = puncte_cale(dr, H)
            d = max(min(dist_prim(q, p) for p in prim) for q in puncte) if puncte else float('inf')
            if d > tol:
                continue
            if any(min(math.hypot(q[0] - a, q[1] - b) for a, b in capete) > tol for q in varfuri):
                continue
            # Acoperirea: fiecare bucată de pe hârtie e pe cale (o bucată lipsă, un colț nedesenat, n-ar trece altfel).
            bucati = bucati_cale(dr, H)
            if any(min(dist_prim(q, b) for b in bucati) > tol for p in prim for q in puncte_pe_prim(p)):
                continue
            potrivita = (i, d, cubice, capete)
            break
        if potrivita is None:
            verifica(False, f'{cale}: nicio cale pe {strat} nu e forma {varfuri[:2] or prim[0][:2]}')
            continue
        i, d, cubice, capete = potrivita
        folosite.add((strat, i))
        abatere = max(abatere, d)
        for c in exacte:
            verifica(any(all(math.hypot(a[0] - b[0], a[1] - b[1]) <= tol for a, b in zip(c, x)) for x in cubice), f'{cale}: cubica exactă {c[0]}…{c[3]} pe {strat}')
        if prim[0][0] == 'A' and len(prim) == 1:
            # Un cerc: puține cubice (s2: R50 din 7), nu sute.
            r = prim[0][2]
            verifica(len(cubice) <= (8 if r >= 1 else 4), f'{cale}: cercul R{r} din {len(cubice)} cubice')
            verifica(all(abs(math.hypot(q[0] - prim[0][1][0], q[1] - prim[0][1][1]) - r) <= tol for q in capete), f'{cale}: capetele cercului R{r} pe cerc')
    return abatere, len(cai)
