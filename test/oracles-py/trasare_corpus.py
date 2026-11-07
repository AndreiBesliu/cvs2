"""Corpusul independent al trasării din imagine (ADR 0220): imagini scrise aici, pixel cu pixel, cu geometria cunoscută, și
valorile lor pe hârtie, în pixeli (x spre dreapta, y în jos, pixelul (0, 0) acoperă pătratul [0, 1]²).

Acoperirea fiecărui pixel e partea lui din formă, eșantionată 16 × 16 pe pixelii de lângă margine (regula nonzero, pe
scanlinii); marginile dure iau doar centrul pixelului. Formele de pe hârtie sunt inele închise (un cerc e un poligon cu 4096
de laturi, la 1e-5 px de cerc; litera vine din Roboto, cu conturul citit cu fontTools și aplatizat sub 0,002 px).

Al doilea martor (ADR 0220, răspunsul 7a) e scikit-image: pe imaginile fără hârtie (logoul owner-ului, discul cu pete),
`find_contours` la jumătatea acoperirii, pe imaginea bordată cu fundal, dă contururile cu care se compară trasarea.

Folosire: `python -I -X utf8 test/oracles-py/trasare_corpus.py [--verifica]` (numpy, scikit-image, fontTools din
`test/oracles-py/requirements.txt`). Scrie imaginile și `asteptat.json` în `test/fixtures/trasare/`; se comit, iar probele
unitare le citesc (`test/unit/trasare.corpus.test.ts`). `--verifica` (în CI) nu scrie nimic: refă totul în memorie și cere
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
    if VERIFICA:
        with open(cale_json, encoding='utf-8') as fh:
            if fh.read() != text:
                diferente.append('asteptat.json: alt conținut')
        if diferente:
            raise SystemExit('Corpusul trasării nu e cel comis:\n  ' + '\n  '.join(diferente))
        print(f'Corpusul trasării: {len(asteptat["cazuri"])} cazuri, aceiași pixeli și același asteptat.json.')
    else:
        with open(cale_json, 'w', encoding='utf-8', newline='\n') as fh:
            fh.write(text)
        print(f'Corpusul trasării: {len(asteptat["cazuri"])} cazuri scrise în {IESIRE}.')


main()
