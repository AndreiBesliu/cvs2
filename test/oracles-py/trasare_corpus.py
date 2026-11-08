"""Corpusul independent al trasării din imagine (ADR 0220): imagini scrise aici, pixel cu pixel, cu geometria cunoscută, și
valorile lor pe hârtie, în pixeli (x spre dreapta, y în jos, pixelul (0, 0) acoperă pătratul [0, 1]²).

Acoperirea fiecărui pixel e partea lui din formă, eșantionată 16 × 16 pe pixelii de lângă margine (regula nonzero, pe
scanlinii); marginile dure iau doar centrul pixelului. Formele de pe hârtie sunt inele închise (un cerc e un poligon cu 4096
de laturi, la 1e-5 px de cerc; litera vine din Roboto, cu conturul citit cu fontTools și aplatizat sub 0,002 px).

Al doilea martor (ADR 0220, răspunsul 7a) e scikit-image: pe imaginile fără hârtie (logoul owner-ului, discul cu pete),
`find_contours` la jumătatea acoperirii, pe imaginea bordată cu fundal, dă contururile cu care se compară trasarea.

Culorile (ADR 0221) au regiunile și joncțiunile lor (`culori.json`), iar liniile mediane (ADR 0222), trăsăturile cu centrul,
capetele și joncțiunile știute, cu `skeletonize` ca martor al topologiei (`mediana.json`).

Folosire: `python -I -X utf8 test/oracles-py/trasare_corpus.py [--verifica]` (numpy, scikit-image cu scipy, fontTools
din `test/oracles-py/requirements.txt`). Scrie imaginile, `asteptat.json`, `culori.json` și `mediana.json` în
`test/fixtures/trasare/`; se comit, iar probele unitare le citesc (`test/unit/trasare.corpus.test.ts`,
`trasare.culori.corpus.test.ts`, `trasare.mediana.corpus.test.ts`). `--verifica` (în CI) nu scrie nimic: refă totul în memorie și cere
aceiași pixeli și același `asteptat.json` ca fișierele comise (octeții PNG depind de versiunea lui zlib, pixelii nu).
"""
import json
import math
import os
import struct
import sys
import zlib

import numpy as np
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from skimage import measure, morphology

sys.stdout.reconfigure(encoding='utf-8')
AICI = os.path.dirname(os.path.abspath(__file__))
RADACINA = os.path.normpath(os.path.join(AICI, '..', '..'))
IESIRE = os.path.join(RADACINA, 'test', 'fixtures', 'trasare')
VERIFICA = '--verifica' in sys.argv
SS = 16

# ── PNG: scriitorul și cititorul (doar 8 biți, RGB sau RGBA, fără întrețesere) ─────────────────────────────────────────────


def png(latime, inaltime, pixeli, canale):
    """Octeții unui PNG: semnătura, IHDR, un singur IDAT (filtrul 0 pe fiecare rând, zlib 9), IEND."""
    def bucata(tip, date):
        return struct.pack('>I', len(date)) + tip + date + struct.pack('>I', zlib.crc32(tip + date) & 0xFFFFFFFF)
    tip_culoare = 6 if canale == 4 else 2
    ihdr = struct.pack('>IIBBBBB', latime, inaltime, 8, tip_culoare, 0, 0, 0)
    randuri = b''.join(b'\0' + pixeli[y * latime * canale:(y + 1) * latime * canale] for y in range(inaltime))
    return b'\x89PNG\r\n\x1a\n' + bucata(b'IHDR', ihdr) + bucata(b'IDAT', zlib.compress(randuri, 9)) + bucata(b'IEND', b'')


def citeste_png(octeti):
    """(latime, inaltime, RGBA) dintr-un PNG cu 8 biți, RGB / RGBA / gri / gri cu alfa, fără întrețesere, cu filtrele 0–4."""
    assert octeti[:8] == b'\x89PNG\r\n\x1a\n', 'nu e PNG'
    i, idat, latime, inaltime, tip = 8, b'', 0, 0, 0
    while i < len(octeti):
        n = struct.unpack('>I', octeti[i:i + 4])[0]
        t = octeti[i + 4:i + 8]
        d = octeti[i + 8:i + 8 + n]
        if t == b'IHDR':
            latime, inaltime, adancime, tip, _, _, intretesere = struct.unpack('>IIBBBBB', d)
            assert adancime == 8 and intretesere == 0 and tip in (0, 2, 4, 6), (adancime, tip, intretesere)
        elif t == b'IDAT':
            idat += d
        i += 12 + n
    canale = {0: 1, 2: 3, 4: 2, 6: 4}[tip]
    brut = zlib.decompress(idat)
    pas = latime * canale
    rez = bytearray(inaltime * pas)
    prec = bytearray(pas)
    for y in range(inaltime):
        f = brut[y * (pas + 1)]
        r = bytearray(brut[y * (pas + 1) + 1:(y + 1) * (pas + 1)])
        for x in range(pas):
            a = r[x - canale] if x >= canale else 0
            b = prec[x]
            c = prec[x - canale] if x >= canale else 0
            if f == 1:
                r[x] = (r[x] + a) & 255
            elif f == 2:
                r[x] = (r[x] + b) & 255
            elif f == 3:
                r[x] = (r[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                r[x] = (r[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rez[y * pas:(y + 1) * pas] = r
        prec = r
    v = np.frombuffer(bytes(rez), dtype=np.uint8).reshape(inaltime, latime, canale)
    if canale == 1:
        v = np.concatenate([v, v, v, np.full_like(v, 255)], axis=2)
    elif canale == 2:
        v = np.concatenate([v[:, :, :1]] * 3 + [v[:, :, 1:]], axis=2)
    elif canale == 3:
        v = np.concatenate([v, np.full((inaltime, latime, 1), 255, np.uint8)], axis=2)
    return latime, inaltime, v

# ── Acoperirea: regula nonzero, pe scanlinii ──────────────────────────────────────────────────────────────────────────────


def acoperire(inele, latime, inaltime, dur=False):
    """Partea din fiecare pixel acoperită de inele (nonzero). Dur: doar centrul pixelului (0 sau 1)."""
    muchii = []
    for inel in inele:
        p = np.asarray(inel, dtype=np.float64)
        q = np.roll(p, -1, axis=0)
        muchii.append(np.concatenate([p, q], axis=1))
    m = np.concatenate(muchii)
    x0, y0, x1, y1 = m[:, 0], m[:, 1], m[:, 2], m[:, 3]
    k = 1 if dur else SS
    rez = np.zeros((inaltime, latime), dtype=np.float64)
    xs = (np.arange(latime * k, dtype=np.float64) + 0.5) / k
    for ry in range(inaltime * k):
        ys = (ry + 0.5) / k
        sus = (y0 <= ys) & (y1 > ys)
        jos = (y1 <= ys) & (y0 > ys)
        sel = sus | jos
        if not sel.any():
            continue
        t = (ys - y0[sel]) / (y1[sel] - y0[sel])
        xc = x0[sel] + t * (x1[sel] - x0[sel])
        semn = np.where(sus[sel], 1, -1)
        ordine = np.argsort(xc, kind='stable')
        xc, semn = xc[ordine], semn[ordine]
        cum = np.concatenate([[0], np.cumsum(semn)])
        inauntru = cum[np.searchsorted(xc, xs, side='right')] != 0
        rez[ry // k] += inauntru.reshape(latime, k).sum(axis=1)
    return rez / (k * k)

# ── Formele pe hârtie ─────────────────────────────────────────────────────────────────────────────────────────────────────


def cerc(cx, cy, r, n=4096, sens=1):
    return [(cx + r * math.cos(sens * 2 * math.pi * i / n), cy + r * math.sin(sens * 2 * math.pi * i / n)) for i in range(n)]


def roteste(inel, cx, cy, grade):
    c, s = math.cos(math.radians(grade)), math.sin(math.radians(grade))
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in inel]


def patrat(x, y, latura, invers=False):
    p = [(x, y), (x + latura, y), (x + latura, y + latura), (x, y + latura)]
    return p[::-1] if invers else p


class PenaInele(BasePen):
    """Conturul unei litere: inelele aplatizate (cuadratice sub 0,002 px), în pixeli, cu Y întors."""

    def __init__(self, glife, scara, ox, oy):
        super().__init__(glife)
        self.s, self.ox, self.oy = scara, ox, oy
        self.inele, self.cur = [], []

    def _p(self, pt):
        return (self.ox + pt[0] * self.s, self.oy - pt[1] * self.s)

    def _moveTo(self, pt):
        self.cur = [self._p(pt)]

    def _lineTo(self, pt):
        self.cur.append(self._p(pt))

    def _qCurveToOne(self, pt1, pt2):
        a, b, c = self.cur[-1], self._p(pt1), self._p(pt2)
        dev = math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1])
        n = max(2, math.ceil(math.sqrt(dev / (4 * 0.002))) + 1)
        for i in range(1, n + 1):
            t = i / n
            self.cur.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0],
                             (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]))

    def _curveToOne(self, pt1, pt2, pt3):
        raise ValueError('Roboto e TrueType: fără cubice')

    def _closePath(self):
        if len(self.cur) > 1 and math.hypot(self.cur[0][0] - self.cur[-1][0], self.cur[0][1] - self.cur[-1][1]) < 1e-9:
            self.cur.pop()
        self.inele.append(self.cur)
        self.cur = []

    _endPath = _closePath


def litera(car, majuscula_px, ox, oy):
    f = TTFont(os.path.join(RADACINA, 'public', 'fonturi', 'roboto.ttf'))
    glife = f.getGlyphSet()
    nume = f.getBestCmap()[ord(car)]
    h = f['OS/2'].sCapHeight
    pena = PenaInele(glife, majuscula_px / h, ox, oy)
    glife[nume].draw(pena)
    return pena.inele

# ── Imaginile ─────────────────────────────────────────────────────────────────────────────────────────────────────────────


def rgba(acop, cerneala, fundal=None):
    """RGBA: opac (cerneala amestecată cu fundalul după acoperire) sau transparent (culoarea cernelii, alfa = acoperirea)."""
    a = np.clip(np.round(acop * 255), 0, 255).astype(np.float64)
    h, w = acop.shape
    if fundal is None:
        rez = np.zeros((h, w, 4), dtype=np.uint8)
        rez[:, :, :3] = np.array(cerneala, dtype=np.uint8)
        rez[:, :, 3] = a.astype(np.uint8)
        return rez, 4
    c, f = np.array(cerneala, np.float64), np.array(fundal, np.float64)
    amestec = f[None, None, :] + (c - f)[None, None, :] * (a / 255)[:, :, None]
    return np.clip(np.round(amestec), 0, 255).astype(np.uint8), 3


def contururi_martor(alfa_sau_cerneala):
    """Martorul scikit-image: `find_contours` la 0,5 pe imaginea bordată cu fundal, în coordonatele corpusului."""
    bordat = np.pad(alfa_sau_cerneala, 1, constant_values=0.0)
    rez = []
    for c in measure.find_contours(bordat, 0.5):
        pts = [[round(float(col) - 0.5, 3), round(float(rand) - 0.5, 3)] for rand, col in c[::2]]
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts.pop()
        rez.append(pts)
    rez.sort(key=lambda p: (min(q[1] for q in p), min(q[0] for q in p)))
    return rez


def rotunjeste(inele):
    return [[[round(x, 6), round(y, 6)] for x, y in inel] for inel in inele]


IMPLICITE = {'sursa': 'auto', 'prag': None, 'inverseaza': False, 'netezime': 'echilibrat', 'petePx': 0, 'gauriPx': 0}
CAZURI = []


def caz(nume, latime, inaltime, inele, cerneala, fundal, asteptat, dur=False, optiuni=None, colturi=None, pete=None, hartie=None):
    """Un caz: imaginea din inele și, pe hârtie, inelele exacte (sau formele analitice date, ca cercurile)."""
    acop = acoperire(inele, latime, inaltime, dur)
    if pete:
        for x, y, w, h, v in pete:
            acop[y:y + h, x:x + w] = v
    pix, canale = rgba(acop, cerneala, fundal)
    intrare = {
        'nume': nume, 'fisier': f'{nume}.png', 'latime': latime, 'inaltime': inaltime,
        'optiuni': {**IMPLICITE, **(optiuni or {})}, 'asteptat': asteptat,
        'hartie': hartie or [{'fel': 'inel', 'puncte': p} for p in rotunjeste(inele)],
    }
    if colturi:
        intrare['colturi'] = [[round(x, 6), round(y, 6)] for x, y in colturi]
    CAZURI.append((intrare, latime, inaltime, pix, canale))


def main():
    # 1–4: cercul R40 cu centrul în afara grilei, în toate polaritățile (lecția D7).
    c = cerc(64.37, 61.71, 40)
    hc = [{'fel': 'cerc', 'cx': 64.37, 'cy': 61.71, 'r': 40}]
    caz('cerc-opac-alb', 130, 125, [c], (32, 32, 32), (255, 255, 255), {'exterioare': 1, 'goluri': 0, 'toleranta': 0.4}, hartie=hc)
    caz('cerc-alb-transparent', 130, 125, [c], (255, 255, 255), None, {'exterioare': 1, 'goluri': 0, 'toleranta': 0.4}, hartie=hc)
    caz('cerc-negru-transparent', 130, 125, [c], (0, 0, 0), None, {'exterioare': 1, 'goluri': 0, 'toleranta': 0.4}, hartie=hc)
    caz('cerc-alb-pe-negru', 130, 125, [c], (255, 255, 255), (0, 0, 0), {'exterioare': 1, 'goluri': 0, 'toleranta': 0.4}, hartie=hc)
    # 5–7: pătratul de 100 cu gaura de 40, drept și rotit cu 17° (netezit și cu margini dure): colțurile.
    ext, gol = patrat(20.5, 18.25, 100), patrat(50.5, 48.25, 40, invers=True)
    colturi = ext + gol
    caz('patrat-gaura-drept', 145, 140, [ext, gol], (20, 20, 20), (250, 250, 250),
        {'exterioare': 1, 'goluri': 1, 'toleranta': 0.4}, colturi=colturi)
    cx, cy = 70.5, 68.25
    rext, rgol = roteste(ext, cx, cy, 17), roteste(gol, cx, cy, 17)
    caz('patrat-gaura-rotit', 145, 140, [rext, rgol], (20, 20, 20), (250, 250, 250),
        {'exterioare': 1, 'goluri': 1, 'toleranta': 0.4}, colturi=rext + rgol)
    caz('patrat-gaura-dur', 145, 140, [rext, rgol], (20, 20, 20), (250, 250, 250),
        {'exterioare': 1, 'goluri': 1, 'toleranta': 0.6}, dur=True, colturi=rext + rgol)
    # 8: litera R din Roboto (inclus în cvs2), cu majuscula de 150 px: colțuri, curbe și un gol.
    r_inele = litera('R', 150, 16.3, 166.6)
    r_lat = math.ceil(max(x for inel in r_inele for x, _ in inel) + 16)
    caz('litera-R', r_lat, 184, r_inele, (25, 25, 25), (255, 255, 255), {'exterioare': 1, 'goluri': 1, 'toleranta': 0.4})
    # 9: discul cu un gol mare, pete de 1–2 px afară și găuri de 1 px în cerneală: după curățare (9 px²), discul și golul.
    disc = [cerc(50.2, 49.7, 30), cerc(56.0, 44.0, 8, sens=-1)]
    pete = [(5, 6, 1, 1, 1.0), (12, 90, 2, 1, 1.0), (90, 10, 2, 2, 1.0), (88, 88, 1, 2, 1.0), (3, 50, 2, 2, 1.0),
            (95, 52, 1, 1, 1.0), (40, 3, 2, 2, 1.0), (60, 95, 1, 1, 1.0),
            (35, 60, 1, 1, 0.0), (45, 70, 1, 1, 0.0), (62, 62, 1, 1, 0.0)]
    caz('disc-pete', 100, 100, disc, (30, 30, 30), (245, 245, 240),
        {'exterioare': 1, 'goluri': 1, 'toleranta': 0.4}, optiuni={'petePx': 9, 'gauriPx': 9}, pete=pete,
        hartie=[{'fel': 'cerc', 'cx': 50.2, 'cy': 49.7, 'r': 30}, {'fel': 'cerc', 'cx': 56.0, 'cy': 44.0, 'r': 8}])

    os.makedirs(IESIRE, exist_ok=True)
    asteptat = {'schema': 1, 'cazuri': []}
    diferente = []
    for intrare, latime, inaltime, pix, canale in CAZURI:
        octeti = png(latime, inaltime, pix.tobytes(), canale)
        cale = os.path.join(IESIRE, intrare['fisier'])
        # Martorul pe același câmp ca trasarea: alfa sau întunecimea (aici imaginile opace au cerneala închisă, afară de una).
        _, _, v = citeste_png(octeti)
        cerneala = v[:, :, 3] / 255.0 if canale == 4 else 1.0 - v[:, :, :3].astype(np.float64).mean(axis=2) / 255.0
        if intrare['nume'] == 'cerc-alb-pe-negru':
            cerneala = 1.0 - cerneala
        if intrare['nume'] == 'disc-pete':
            # Curățarea martorului e a lui scikit-image (cerneala în 8-vecinătate, golurile în 4), cu aceleași praguri:
            # o pată sub 9 px² dispare, un gol sub 9 px² se umple; câmpul păstrează acoperirea în rest.
            masca = cerneala >= 0.5
            curata = morphology.remove_small_objects(masca, max_size=intrare['optiuni']['petePx'] - 1, connectivity=2)
            curata = morphology.remove_small_holes(curata, max_size=intrare['optiuni']['gauriPx'] - 1, connectivity=1)
            camp = np.where(curata & ~masca, 1.0, np.where(~curata & masca, 0.0, cerneala))
            intrare['martor'] = {'contururi': contururi_martor(camp)}
        asteptat['cazuri'].append(intrare)
        if VERIFICA:
            if not os.path.exists(cale):
                diferente.append(f'{intrare["fisier"]}: lipsește')
            else:
                with open(cale, 'rb') as fh:
                    _, _, comis = citeste_png(fh.read())
                if not np.array_equal(comis, v):
                    diferente.append(f'{intrare["fisier"]}: alți pixeli')
        else:
            with open(cale, 'wb') as fh:
                fh.write(octeti)
    # 10: logoul owner-ului din ediția întâi (răspunsul 8a), neschimbat: litere albe pe fundal transparent (lecția D7).
    with open(os.path.join(IESIRE, 'logo-cvs.png'), 'rb') as fh:
        latime, inaltime, v = citeste_png(fh.read())
    asteptat['cazuri'].append({
        'nume': 'logo-cvs', 'fisier': 'logo-cvs.png', 'latime': latime, 'inaltime': inaltime, 'optiuni': IMPLICITE,
        'hartie': None, 'asteptat': {'toleranta': 0.6}, 'martor': {'contururi': contururi_martor(v[:, :, 3] / 255.0)},
    })
    text = json.dumps(asteptat, ensure_ascii=False, separators=(',', ':')) + '\n'
    cale_json = os.path.join(IESIRE, 'asteptat.json')
    culori = culori_cazuri(diferente)
    text_culori = json.dumps(culori, ensure_ascii=False, separators=(',', ':')) + '\n'
    cale_culori = os.path.join(IESIRE, 'culori.json')
    mediane = mediana_cazuri(diferente)
    text_mediane = json.dumps(mediane, ensure_ascii=False, separators=(',', ':')) + '\n'
    cale_mediane = os.path.join(IESIRE, 'mediana.json')
    fisiere = ((cale_json, text, 'asteptat.json'), (cale_culori, text_culori, 'culori.json'), (cale_mediane, text_mediane, 'mediana.json'))
    if VERIFICA:
        for cale, t, nume in fisiere:
            with open(cale, encoding='utf-8') as fh:
                if fh.read() != t:
                    diferente.append(f'{nume}: alt conținut')
        if diferente:
            raise SystemExit('Corpusul trasării nu e cel comis:\n  ' + '\n  '.join(diferente))
        print(f'Corpusul trasării: {len(asteptat["cazuri"])} cazuri, {len(culori["cazuri"])} pe culori și {len(mediane["cazuri"])} '
              'de linii mediane, aceiași pixeli și aceleași fișiere de așteptări.')
    else:
        for cale, t, _ in fisiere:
            with open(cale, 'w', encoding='utf-8', newline='\n') as fh:
                fh.write(t)
        print(f'Corpusul trasării: {len(asteptat["cazuri"])} cazuri, {len(culori["cazuri"])} pe culori și {len(mediane["cazuri"])} '
              f'de linii mediane scrise în {IESIRE}.')

# ── Culorile (ADR 0221): regiuni care pavează imaginea, fiecare cu culoarea ei ─────────────────────────────────────────────
#
# Fiecare regiune e o listă de inele (regula nonzero); regiunile nu se suprapun, deci în fiecare pixel acoperirile lor se
# adună la cel mult 1. Culoarea pixelului e media culorilor după aria fiecăreia (în sRGB, cum amestecă un rasterizator), plus
# fundalul: alb (opac) sau transparent (alfa = suma acoperirilor). Pe hârtie: inelele fiecărei regiuni (cercurile, cu 1024
# de laturi, la 2e-4 px de cerc) și joncțiunile, unde se întâlnesc trei culori (sau două și fundalul).

ALBASTRU, INCHIS, DESCHIS, ALB = (7, 96, 156), (53, 60, 69), (141, 150, 163), (255, 255, 255)


def sector(cx, cy, r, de, la, n):
    """Sectorul de disc dintre unghiurile de și la (grade, în sensul lui y în jos): centrul și arcul, cu n laturi pe cerc."""
    pasi = max(2, math.ceil(n * (la - de) / 360))
    return [(cx, cy)] + [(cx + r * math.cos(math.radians(de + (la - de) * i / pasi)), cy + r * math.sin(math.radians(de + (la - de) * i / pasi)))
                         for i in range(pasi + 1)]


def culori_cazuri(diferente):
    """Cazurile pe culori: imaginile (scrise sau verificate) și așteptările lor, ca dicționar."""
    cazuri = []

    def caz_c(nume, latime, inaltime, regiuni, fundal, asteptat, jonctiuni):
        acops = [acoperire(inele, latime, inaltime) for _, inele, _ in regiuni]
        tot = np.sum(acops, axis=0)
        assert tot.max() <= 1 + 1e-9, (nume, tot.max())
        amestec = np.zeros((inaltime, latime, 3), dtype=np.float64)
        for (cul, _, _), a in zip(regiuni, acops):
            amestec += a[:, :, None] * np.array(cul, np.float64)[None, None, :]
        if fundal is None:
            alfa = np.clip(np.round(tot * 255), 0, 255)
            cul = np.where(tot[:, :, None] > 0, amestec / np.maximum(tot, 1e-12)[:, :, None], 0)
            pix = np.zeros((inaltime, latime, 4), dtype=np.uint8)
            pix[:, :, :3] = np.clip(np.round(cul), 0, 255).astype(np.uint8)
            pix[:, :, 3] = alfa.astype(np.uint8)
            canale = 4
        else:
            amestec += (1 - tot)[:, :, None] * np.array(fundal, np.float64)[None, None, :]
            pix = np.clip(np.round(amestec), 0, 255).astype(np.uint8)
            canale = 3
        octeti = png(latime, inaltime, pix.tobytes(), canale)
        cale = os.path.join(IESIRE, f'{nume}.png')
        _, _, v = citeste_png(octeti)
        if VERIFICA:
            if not os.path.exists(cale):
                diferente.append(f'{nume}.png: lipsește')
            else:
                with open(cale, 'rb') as fh:
                    _, _, comis = citeste_png(fh.read())
                if not np.array_equal(comis, v):
                    diferente.append(f'{nume}.png: alți pixeli')
        else:
            with open(cale, 'wb') as fh:
                fh.write(octeti)
        cazuri.append({
            'nume': nume, 'fisier': f'{nume}.png', 'latime': latime, 'inaltime': inaltime, 'asteptat': asteptat,
            'regiuni': [{'culoare': '#%02x%02x%02x' % cul, 'inele': rotunjeste(hartie), 'aria': round(float(aria), 4)}
                        for (cul, _, hartie), aria in zip(regiuni, [a.sum() for a in acops])],
            'jonctiuni': [[round(x, 6), round(y, 6)] for x, y in jonctiuni],
        })

    # 1: un disc R40 în trei sectoare (razele la 10°, 130° și 250°), pe transparent: joncțiunea în centru și trei pe margine.
    cx, cy, r = 64.37, 61.71, 40
    unghiuri = [10, 130, 250, 370]
    regiuni = []
    for cul, de, la in zip((ALBASTRU, INCHIS, DESCHIS), unghiuri, unghiuri[1:]):
        regiuni.append((cul, [sector(cx, cy, r, de, la, 4096)], [sector(cx, cy, r, de, la, 1024)]))
    pe_margine = [(cx + r * math.cos(math.radians(u)), cy + r * math.sin(math.radians(u))) for u in unghiuri[:3]]
    caz_c('culori-sectoare', 130, 125, regiuni, None, {'culori': 3, 'toleranta': 0.4}, [(cx, cy)] + pe_margine)

    # 2: pătratul închis cu un inel albastru, iar în inel un disc închis cu un punct deschis, pe alb (opac): albul e fundalul.
    sx, sy, cx, cy = 20.5, 18.25, 70.5, 68.25
    regiuni = [
        (INCHIS, [patrat(sx, sy, 100), cerc(cx, cy, 28, 4096, -1)], [patrat(sx, sy, 100), cerc(cx, cy, 28, 1024, -1)]),
        (ALBASTRU, [cerc(cx, cy, 28, 4096), cerc(cx, cy, 15, 4096, -1)], [cerc(cx, cy, 28, 1024), cerc(cx, cy, 15, 1024, -1)]),
        (INCHIS, [cerc(cx, cy, 15, 4096), cerc(cx, cy, 6, 4096, -1)], [cerc(cx, cy, 15, 1024), cerc(cx, cy, 6, 1024, -1)]),
        (DESCHIS, [cerc(cx, cy, 6, 4096)], [cerc(cx, cy, 6, 1024)]),
    ]
    caz_c('culori-inel', 141, 137, regiuni, ALB, {'culori': 4, 'fundal': '#ffffff', 'toleranta': 0.4}, [])

    # 3: tabla de șah cu blocuri de 30 px (albastru și deschis), cu punctul de întâlnire în afara grilei: celula-șa.
    x0, y0, m = 15.3, 15.7, 30
    def bloc(i, j):
        return patrat(x0 + i * m, y0 + j * m, m)
    regiuni = [(ALBASTRU, [bloc(0, 0)], [bloc(0, 0)]), (DESCHIS, [bloc(1, 0)], [bloc(1, 0)]),
               (DESCHIS, [bloc(0, 1)], [bloc(0, 1)]), (ALBASTRU, [bloc(1, 1)], [bloc(1, 1)])]
    caz_c('culori-sah', 91, 91, regiuni, None, {'culori': 2, 'toleranta': 0.4, 'sa': True},
          [(x0 + m, y0 + m), (x0 + m, y0), (x0 + 2 * m, y0 + m), (x0 + m, y0 + 2 * m), (x0, y0 + m)])

    # 4: logoul owner-ului, pe culori: fără hârtie; reuniunea culorilor trebuie să fie trasarea alb-negru a aceleiași imagini,
    # iar paleta automată, cele trei culori pe care le numește un om: griul (cu umbrirea lui), albastrul și portocaliul
    # liniilor punctate (1 % din pixelii plini, subțiri, cu margini transparente). Fiecare familie se ia din pixelii plini,
    # după reguli simple pe canale; mediana ei e culoarea de pe hârtie.
    with open(os.path.join(IESIRE, 'logo-cvs.png'), 'rb') as fh:
        latime, inaltime, v = citeste_png(fh.read())
    p = v.reshape(-1, 4).astype(int)
    p = p[p[:, 3] >= 250]
    r, g, b = p[:, 0], p[:, 1], p[:, 2]
    familii = {
        'gri': (np.abs(r - g) < 20) & (np.abs(g - b) < 30) & (r < 130),
        'albastru': (b > r + 60) & (b > g + 20),
        'portocaliu': (r > 190) & (g > 90) & (g < 190) & (b < 110),
    }
    paleta = {}
    for nume, m in familii.items():
        assert m.sum() >= 300, (nume, int(m.sum()))
        paleta[nume] = '#' + ''.join('%02x' % int(round(c)) for c in np.median(p[m][:, :3], axis=0))
    cazuri.append({'nume': 'logo-cvs-culori', 'fisier': 'logo-cvs.png', 'latime': latime, 'inaltime': inaltime,
                   'asteptat': {'culori': 3, 'toleranta': 0.6, 'paleta': paleta}, 'regiuni': None, 'jonctiuni': []})
    return {'schema': 1, 'cazuri': cazuri}

# ── Liniile mediane (ADR 0222): trăsături cu centrul știut ─────────────────────────────────────────────────────────────────
#
# O trăsătură e o linie frântă cu grosimea w: punctele la cel mult w / 2 de ea (capete și îmbinări rotunde, ca urma unui pix
# sau a unei freze), sau, cu capete drepte, dreptunghiul ei. Pe imagine: reuniunea capsulelor segmentelor (dreptunghiul cu
# două semicercuri de 64 de laturi, la 3e-4 · w / 2 de cerc), toate în același sens, deci regula nonzero le unește. Pe
# hârtie: liniile (centrul), capetele (unde se oprește o freză cât trăsătura: centrul capătului rotund, ori la w / 2 de un
# capăt drept), joncțiunile (cu numărul brațelor), colțurile liniei (lângă ele axa medială taie colțul, cu până la
# 0,17 · w / 2: ADR 0222) și câte căi trebuie să iasă: brațele din prelungire ale unei joncțiuni (sub 30° de cotitură) se
# leagă într-o cale, deci un T dă două căi, un X tot două, un Y trei. Toleranțele judecății (`asteptat`): linia, în afara
# zonelor nodurilor (cât w în jurul capetelor, joncțiunilor și colțurilor), la 0,4 px de hârtie în ambele sensuri; capetele
# libere la 0,4 px, joncțiunile la 0,45 px (măsurat la scrierea nucleului: 0,34, 0,28 și 0,32 px, pe semnătură), toate sub
# jumătatea de grosime a ADR-ului. În zonele nodurilor, linia stă la cel mult `zona` (implicit o jumătate de grosime); la
# colțurile L-ului și ale „n”-ului drept, 0,5 px: colțul se reface în încrucișarea brațelor (măsurat 0,12 și 0,10 px; înainte,
# în colțul drept, zigzaguri de 1,7 px, pe care jumătatea de grosime nu le vedea).
#
# Martorul e scikit-image cu scipy: `skeletonize` pe cerneala la jumătate, cu capetele scoase de ⌈w⌉ ori (cioturile mai
# scurte dispar, brațele adevărate se scurtează cu atât) și joncțiunile ale căror cercuri înscrise se suprapun unite (razele
# din `distance_transform_edt`), dă tot atâtea capete și joncțiuni ca hârtia (capetele lui, retrase cu ~w), iar
# `euler_number`, aceleași goluri; pixelii lui stau la cel mult 1 px de linie în afara zonelor nodurilor. Altfel generatorul
# se oprește: hârtia și imaginea nu spun același lucru.

def capsula(a, b, r, n=64):
    """Inelul capsulei segmentului ab (raza r), cu unghiul descrescător: același sens pentru toate, deci se unesc."""
    ax, ay = a
    bx, by = b
    lung = math.hypot(bx - ax, by - ay)
    if lung < 1e-12:
        return [(ax + r * math.cos(-math.pi * i / n), ay + r * math.sin(-math.pi * i / n)) for i in range(2 * n)]
    ux, uy = (bx - ax) / lung, (by - ay) / lung
    tn = math.atan2(ux, -uy)
    inel = [(bx + r * math.cos(tn - math.pi * i / n), by + r * math.sin(tn - math.pi * i / n)) for i in range(n + 1)]
    inel += [(ax + r * math.cos(tn - math.pi * (1 + i / n)), ay + r * math.sin(tn - math.pi * (1 + i / n))) for i in range(n + 1)]
    return inel


def dreptunghi_prelungit(a, b, r):
    """Dreptunghiul segmentului ab, de lățime 2r, prelungit cu r la ambele capete (îmbinarea în colț a două segmente se umple
    pătrat, ca la un font), în sensul capsulelor."""
    ax, ay = a
    bx, by = b
    lung = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / lung, (by - ay) / lung
    return dreptunghi((ax - r * ux, ay - r * uy), (bx + r * ux, by + r * uy), r)


def dreptunghi(a, b, r):
    """Trăsătura cu capete drepte: dreptunghiul segmentului ab, de lățime 2r, în sensul capsulelor."""
    ax, ay = a
    bx, by = b
    lung = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / lung, (by - ay) / lung
    nx, ny = -uy, ux
    return [(bx + r * nx, by + r * ny), (bx - r * nx, by - r * ny), (ax - r * nx, ay - r * ny), (ax + r * nx, ay + r * ny)]


def segmente(linii):
    seg = []
    for puncte, inchisa in linii:
        n = len(puncte)
        for k in range(n if inchisa else n - 1):
            seg.append((*puncte[k], *puncte[(k + 1) % n]))
    return np.asarray(seg, np.float64)


def la_linii(pts, linii):
    """Distanța fiecărui punct până la liniile de pe hârtie."""
    s = segmente(linii)
    ax, ay, bx, by = s[:, 0], s[:, 1], s[:, 2], s[:, 3]
    dx, dy = bx - ax, by - ay
    l2 = np.maximum(dx * dx + dy * dy, 1e-24)
    pts = np.asarray(pts, np.float64).reshape(-1, 2)
    rez = np.empty(len(pts))
    for i0 in range(0, len(pts), 256):
        p = pts[i0:i0 + 256]
        u = np.clip(((p[:, 0:1] - ax) * dx + (p[:, 1:2] - ay) * dy) / l2, 0, 1)
        rez[i0:i0 + 256] = np.hypot(ax + u * dx - p[:, 0:1], ay + u * dy - p[:, 1:2]).min(axis=1)
    return rez


# Pozițiile celor 8 vecini, în cerc (E, NE, N, NV, V, SV, S, SE); pozițiile pare sunt cele ortogonale.
INEL8 = [(0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1)]


def grupuri_vecini(s, y, x):
    """Câte grupuri 8-conexe formează vecinii pixelului (pe inelul lui): 1 la un capăt, 2 pe linie, cel puțin 3 la joncțiune."""
    v = [bool(s[y + dy, x + dx]) for dy, dx in INEL8]
    par = list(range(8))

    def rad(a):
        while par[a] != a:
            a = par[a]
        return a
    for k in range(8):
        if v[k] and v[(k + 1) % 8]:
            par[rad(k)] = rad((k + 1) % 8)
        if k % 2 == 0 and v[k] and v[(k + 2) % 8]:
            par[rad(k)] = rad((k + 2) % 8)
    return len({rad(k) for k in range(8) if v[k]})


def martor_mediana(acop, w):
    """Martorul scikit-image: capetele, joncțiunile (după cioturi și unire), golurile și pixelii scheletului."""
    from scipy import ndimage
    masca = acop >= 0.5
    sch = np.pad(morphology.skeletonize(masca), 1)
    dist = np.pad(ndimage.distance_transform_edt(masca), 1)
    h, l = sch.shape

    def capete_din(s):
        return [(y, x) for y, x in zip(*np.nonzero(s)) if grupuri_vecini(s, y, x) <= 1]
    # Cioturile mai scurte decât w: capetele scoase de k ori (fără creșterea la loc a lui Gonzalez și Woods, care aducea înapoi
    # și furca de la un capăt drept).
    k = int(math.ceil(w))
    s = sch.copy()
    for _ in range(k):
        for y, x in capete_din(s):
            s[y, x] = False
    capete = capete_din(s)
    jonctiuni = [(y, x) for y, x in zip(*np.nonzero(s)) if grupuri_vecini(s, y, x) >= 3]
    par = list(range(len(jonctiuni)))

    def rad(a):
        while par[a] != a:
            a = par[a]
        return a
    for i, (ya, xa) in enumerate(jonctiuni):
        for j in range(i):
            yb, xb = jonctiuni[j]
            if math.hypot(ya - yb, xa - xb) < dist[ya, xa] + dist[yb, xb]:
                par[rad(i)] = rad(j)
    grupe = {}
    for i, (y, x) in enumerate(jonctiuni):
        grupe.setdefault(rad(i), []).append((x - 1 + 0.5, y - 1 + 0.5))
    centre = [(float(np.mean([p[0] for p in g])), float(np.mean([p[1] for p in g]))) for g in grupe.values()]
    componente = int(measure.label(masca, connectivity=2).max())
    goluri = componente - int(measure.euler_number(masca, connectivity=2))
    pixeli = [(x - 1 + 0.5, y - 1 + 0.5) for y, x in zip(*np.nonzero(s))]
    return {'capete': [(x - 1 + 0.5, y - 1 + 0.5) for y, x in capete], 'jonctiuni': centre, 'goluri': goluri, 'pixeli': pixeli}


def unghi_cotitura(a, b):
    """Cotitura dintre două brațe care pleacă din același punct (direcțiile lor): 0° când se continuă drept."""
    c = (a[0] * b[0] + a[1] * b[1]) / (math.hypot(*a) * math.hypot(*b))
    return 180 - math.degrees(math.acos(max(-1.0, min(1.0, c))))


def mediana_cazuri(diferente):
    """Cazurile liniei mediane: imaginile (scrise sau verificate) și hârtia lor, ca dicționar."""
    cazuri = []

    def caz_m(nume, latime, inaltime, linii, w, capete, jonctiuni, cai, inchise=0, goluri=0, colturi=(), cerneala=(25, 25, 25),
              fundal=(255, 255, 255), drepte=False, toleranta=0.4, capat=0.4, jonctiune=0.45, zona=None):
        if drepte:
            inele = [dreptunghi(p[0], p[1], w / 2) for p, _ in linii]
        else:
            inele = []
            for linie in linii:
                puncte, inchisa = linie[0], linie[1]
                forma = dreptunghi_prelungit if len(linie) > 2 and linie[2] == 'drept' else capsula
                n = len(puncte)
                inele += [forma(puncte[k], puncte[(k + 1) % n], w / 2) for k in range(n if inchisa else n - 1)]
            linii = [(linie[0], linie[1]) for linie in linii]
        acop = acoperire(inele, latime, inaltime)
        pix, canale = rgba(acop, cerneala, fundal)
        octeti = png(latime, inaltime, pix.tobytes(), canale)
        cale = os.path.join(IESIRE, f'{nume}.png')
        _, _, v = citeste_png(octeti)
        # Martorul, pe aceeași cerneală pe care o vede trasarea (alfa sau întunecimea, cu cerneala închisă).
        cer = v[:, :, 3] / 255.0 if canale == 4 else 1.0 - v[:, :, :3].astype(np.float64).mean(axis=2) / 255.0
        if fundal is not None and sum(fundal) < sum(cerneala):
            cer = 1.0 - cer
        m = martor_mediana(cer, w)
        # Linia de pe hârtie (pentru capete drepte: între capete, nu până în marginea dreptunghiului).
        hartie = [(p, inchisa) for p, inchisa in linii]
        if drepte:
            hartie = []
            for p, _ in linii:
                (ax, ay), (bx, by) = p
                lung = math.hypot(bx - ax, by - ay)
                ux, uy = (bx - ax) / lung, (by - ay) / lung
                hartie.append(([(ax + ux * w / 2, ay + uy * w / 2), (bx - ux * w / 2, by - uy * w / 2)], False))
        noduri = list(capete) + [j for j, _ in jonctiuni] + list(colturi)
        departe = [p for p in m['pixeli'] if all(math.hypot(p[0] - q[0], p[1] - q[1]) > w for q in noduri)]
        abatere = float(la_linii(departe, hartie).max()) if departe else 0.0
        assert len(m['capete']) == len(capete), (nume, 'capete', len(m['capete']), len(capete))
        assert len(m['jonctiuni']) == len(jonctiuni), (nume, 'jonctiuni', m['jonctiuni'], jonctiuni)
        assert m['goluri'] == goluri, (nume, 'goluri', m['goluri'], goluri)
        assert abatere <= 1.0, (nume, 'abaterea martorului', abatere)
        for q in capete:
            assert min(math.hypot(q[0] - c[0], q[1] - c[1]) for c in m['capete']) <= 2 * w + 2, (nume, 'capătul', q)
        for q, _ in jonctiuni:
            assert min(math.hypot(q[0] - c[0], q[1] - c[1]) for c in m['jonctiuni']) <= w, (nume, 'joncțiunea', q)
        if VERIFICA:
            if not os.path.exists(cale):
                diferente.append(f'{nume}.png: lipsește')
            else:
                with open(cale, 'rb') as fh:
                    _, _, comis = citeste_png(fh.read())
                if not np.array_equal(comis, v):
                    diferente.append(f'{nume}.png: alți pixeli')
        else:
            with open(cale, 'wb') as fh:
                fh.write(octeti)
        cazuri.append({
            'nume': nume, 'fisier': f'{nume}.png', 'latime': latime, 'inaltime': inaltime, 'optiuni': IMPLICITE, 'grosime': w,
            'linii': [{'puncte': [[round(x, 6), round(y, 6)] for x, y in p], 'inchisa': inchisa} for p, inchisa in hartie],
            'capete': [[round(x, 6), round(y, 6)] for x, y in capete],
            'jonctiuni': [{'p': [round(j[0], 6), round(j[1], 6)], 'brate': g} for j, g in jonctiuni],
            'colturi': [[round(x, 6), round(y, 6)] for x, y in colturi],
            'asteptat': {'cai': cai, 'inchise': inchise, 'goluri': goluri, 'toleranta': toleranta, 'capat': capat, 'jonctiune': jonctiune,
                         'zona': round(w / 2, 6) if zona is None else zona},
            'martor': {'capete': len(m['capete']), 'jonctiuni': len(m['jonctiuni']), 'goluri': m['goluri'], 'abatere': round(abatere, 3)},
        })

    def arc(cx, cy, r, de, la, n):
        return [(cx + r * math.cos(de + (la - de) * k / n), cy + r * math.sin(de + (la - de) * k / n)) for k in range(n + 1)]

    def brat(c, lung, grade):
        return (c[0] + lung * math.cos(math.radians(grade)), c[1] + lung * math.sin(math.radians(grade)))

    # 1–3: dreapta orizontală și la 17°, la trei grosimi; capetele rotunde: linia se oprește în centrul lor.
    for w in (3, 6, 10):
        a, b = (10.3, 15.2), (70.3, 15.2)
        caz_m(f'mediana-dreapta-0-w{w}', 80, 30, [([a, b], False)], w, [a, b], [], 1)
        a, b = (10.3, 10.2), (69.7, 28.4)
        caz_m(f'mediana-dreapta-17-w{w}', 80, 40, [([a, b], False)], w, [a, b], [], 1)
    # 4: la 45°, unde subțierea pe pixeli e cea mai grea (trepte); pe transparent.
    a, b = (8.4, 8.1), (52.6, 52.3)
    caz_m('mediana-dreapta-45-w4', 61, 61, [([a, b], False)], 4, [a, b], [], 1, fundal=None, cerneala=(0, 0, 0))
    # 5: cu capete drepte (o literă tipărită, un marker): capătul liniei e la w / 2 de margine, unde se oprește freza.
    a, b = (12.6, 20.3), (68.1, 31.9)
    u = ((b[0] - a[0]) / math.hypot(b[0] - a[0], b[1] - a[1]), (b[1] - a[1]) / math.hypot(b[0] - a[0], b[1] - a[1]))
    caz_m('mediana-drepte-w8', 82, 52, [([a, b], False)], 8, [(a[0] + 4 * u[0], a[1] + 4 * u[1]), (b[0] - 4 * u[0], b[1] - 4 * u[1])],
          [], 1, drepte=True)
    # 6: un semicerc de rază 25.
    p = arc(40.3, 15.6, 25, 0, math.pi, 256)
    caz_m('mediana-arc-w5', 80, 50, [(p, False)], 5, [p[0], p[-1]], [], 1)
    # 7–8: T: bara (o singură cale, brațele ei se continuă) și piciorul.
    for w in (4, 8):
        caz_m(f'mediana-T-w{w}', 80, 60, [([(10.3, 15.2), (70.3, 15.2)], False), ([(40.3, 15.2), (40.3, 52.7)], False)], w,
              [(10.3, 15.2), (70.3, 15.2), (40.3, 52.7)], [((40.3, 15.2), 3)], 2)
    # 9: plusul (90°) și 10–11: X-ul la 60°, la două grosimi: o joncțiune cu patru brațe, două căi.
    caz_m('mediana-plus-w5', 72, 72, [([(10.2, 35.3), (60.8, 35.3)], False), ([(35.5, 10.1), (35.5, 60.6)], False)], 5,
          [(10.2, 35.3), (60.8, 35.3), (35.5, 10.1), (35.5, 60.6)], [((35.5, 35.3), 4)], 2)
    c = (36.4, 35.7)
    for w in (4, 8):
        caz_m(f'mediana-X60-w{w}', 72, 72, [([brat(c, 26, 200), brat(c, 26, 20)], False), ([brat(c, 26, 260), brat(c, 26, 80)], False)],
              w, [brat(c, 26, g) for g in (20, 80, 200, 260)], [(c, 4)], 2)
    # 12: Y-ul (trei brațe la 120°: niciunul nu continuă altul, deci trei căi); pe transparent, cerneală albă.
    c = (36.2, 38.4)
    caz_m('mediana-Y-w5', 72, 72, [([c, brat(c, 24, g)], False) for g in (-90, 30, 150)], 5, [brat(c, 24, g) for g in (-90, 30, 150)],
          [(c, 3)], 3, fundal=None, cerneala=(255, 255, 255))
    # 13–14: L-ul, o cale cu un colț (axa medială taie colțul cu 0,17 · w / 2).
    for w in (4, 8):
        caz_m(f'mediana-L-w{w}', 70, 70, [([(12.3, 10.2), (12.3, 55.6), (58.4, 55.6)], False)], w, [(12.3, 10.2), (58.4, 55.6)], [], 1,
              colturi=[(12.3, 55.6)], zona=0.5)
    # 15–16: inelul, o buclă închisă tăiată pe linie (un gol); 17: pe negru, cerneală albă.
    p = arc(40.3, 39.7, 28, 0, 2 * math.pi, 256)[:-1]
    caz_m('mediana-inel-w3', 80, 80, [(p, True)], 3, [], [], 1, inchise=1, goluri=1)
    caz_m('mediana-inel-w8', 80, 80, [(p, True)], 8, [], [], 1, inchise=1, goluri=1, cerneala=(250, 250, 250), fundal=(10, 10, 10))
    # 18–19: un S (sinusoida, raza de curbură de cel puțin 9,6 px).
    p = [(10 + k * 0.5, 30 + 15 * math.sin(k * 0.5 / 12)) for k in range(161)]
    for w in (4, 7):
        caz_m(f'mediana-S-w{w}', 100, 60, [(p, False)], w, [p[0], p[-1]], [], 1)
    # 20: K: bara (două brațe în prelungire, o cale) și cele două diagonale din același punct: trei căi.
    j = (15.4, 35.0)
    caz_m('mediana-K-w5', 62, 70, [([(15.4, 8.2), (15.4, 61.8)], False), ([j, (50.3, 8.6)], False), ([j, (50.3, 61.4)], False)], 5,
          [(15.4, 8.2), (15.4, 61.8), (50.3, 8.6), (50.3, 61.4)], [(j, 4)], 3)
    # 21: o trăsătură groasă (16 px): capetele la 8 px de vârfuri.
    a, b = (14.2, 20.4), (60.7, 26.9)
    caz_m('mediana-gros-w16', 76, 48, [([a, b], False)], 16, [a, b], [], 1)
    # 22: semnătura: o trohoidă cu două bucle (x = x0 + 5t − 15 sin t, y = y0 − 16 cos t), care se încrucișează de două ori la
    # 79°: o singură cale, cu două joncțiuni de câte patru brațe și două goluri; raza de curbură e peste 6 px peste tot.
    A, B, C, x0, y0 = 5.0, 15.0, 16.0, 32.4, 27.3
    t0, t1, n = -math.pi + 0.3, 3 * math.pi - 0.3, 900
    ts = [t0 + (t1 - t0) * k / n for k in range(n + 1)]
    p = [(x0 + A * t - B * math.sin(t), y0 - C * math.cos(t)) for t in ts]
    raze = [((A - B * math.cos(t)) ** 2 + (C * math.sin(t)) ** 2) ** 1.5 / abs((A - B * math.cos(t)) * C * math.cos(t) - C * math.sin(t) * B * math.sin(t))
            for t in ts]
    assert min(raze) > 6, min(raze)
    tx = 2.27886  # sin(t) / t = A / B: încrucișarea buclei din jurul lui 0 (și a celei din jurul lui 2π)
    for _ in range(50):
        tx -= (A * tx - B * math.sin(tx)) / (A - B * math.cos(tx))
    cruci = [(x0 + A * (2 * math.pi * k), y0 - C * math.cos(tx)) for k in (0, 1)]
    caz_m('mediana-semnatura-w3.5', 96, 50, [(p, False)], 3.5, [p[0], p[-1]], [(cruci[0], 4), (cruci[1], 4)], 1, goluri=2)
    # 23–24: un „n” cu colțuri drepte și capete drepte (ca litera unui font; logoul a arătat zigzaguri în colțuri), la două
    # grosimi: o cale, cu două colțuri; capetele la w / 2 de capetele drepte.
    for w in (6, 10):
        n_ = [(20.3, 70.4), (20.3, 22.6), (62.7, 22.6), (62.7, 70.4)]
        caz_m(f'mediana-n-drept-w{w}', 84, 84, [(n_, False, 'drept')], w, [n_[0], n_[-1]], [], 1, colturi=n_[1:3], zona=0.5)
    return {'schema': 1, 'cazuri': cazuri}


main()
