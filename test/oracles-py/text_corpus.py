"""Corpusul independent al textului (ADR 0105, ADR 0106), cu fontTools 4.67 (MIT): ce trebuie să iasă din cititorul de
fonturi și din așezarea literelor ale aplicației, scris din fonturile livrate (`public/fonturi/`), din fonturi libere de pe
mașina asta (Inter și Source Han Sans, OFL, subsetate aici) și din variantele lor, făcute aici.

Ce citește fontTools, nu aplicația:
- contururile glifelor: TrueType cu `Glyph.getCoordinates`, cu glifele compuse asamblate de fontTools (transformările,
  deplasarea scalată sau nu, componentele puse pe puncte), apoi pătraticele desfăcute cu `decomposeQuadraticSegment`
  (punctele de pe curbă subînțelese) și pornite din primul punct de pe curbă, ca în `Glyph.draw`; CFF din pen-ul lui
  fontTools (interpretorul lui Type 2, cu `seac` desfăcut de `DecomposingRecordingPen`);
- avansurile (`hmtx`), harta caracterelor (subtabelul ales în ordinea lui `getBestCmap`, plus simbolul Windows 3/0 cu
  zona U+F000), urcarea și coborârea (`hhea`), înălțimea majusculei (vârful lui H; fără H, `OS/2.sCapHeight`);
- crenarea: perechile caracteristicii `kern` din `GPOS` (formatul 1, perechi anume; formatul 2, clase; și prin căutările
  Extension), iar fără ele tabelul `kern` vechi (subtabelele orizontale de formatul 0, Microsoft și Apple), din obiectele
  tabelelor fontTools, scrisă aici din specificație, nu din codul aplicației.

Regulile așezării (ADR 0105 §2) sunt scrise din nou, aici: înălțimea majusculei dă scara (u · h / majuscula), crenarea și
spațierea doar între două litere ale aceluiași rând, alinierea față de x = 0, rândurile coborând cu interlinie × înălțimea
rândului. Pătratica (p0, q, p2) devine cubica (p0 + 2/3 (q − p0), p2 + 2/3 (q − p2)); cubicele CFF trec cum sunt.

Pe hârtie, verificate aici: „LEMN” de 20 mm are fiecare literă înaltă de exact 20 mm (de la 0 la 20); majuscula fiecărui
font e chiar vârful lui H; variantele au ce promit (loca lungă, componentele pe puncte, deplasarea scalată, 2 × 2, o glifă
compusă din alta compusă, perechile `kern` neordonate, subrutinele peste 1 240 și 33 900, CID-ul).

Textul pe curbă (ADR 0108), scris din nou aici (`pe_curba`): curba măsurată fără codul aplicației (liniile exact, arcele
din bulge, cu centrul și raza deduse aici, cubicele cu lungimea lui fontTools, `calcCubicArcLengthC`, pe 512 bucăți, și
bisecția pe parametru), locul fiecărei litere pe curbă în sistemul original al curbei (fără conturul inversat al aplicației),
regulile poziției, ale alinierii și ale întinderii din ADR, mișcarea rigidă a literei ca înmulțire complexă. Pe hârtie: cercul
R50 are 100π; pe linia de bază, vârful fiecărei litere de 10 mm stă la raza 60; dedesubt, pe partea cealaltă, la 48,5 cu
distanța 1,5; întins pe cerc, 8 litere stau la 45° una de alta; întins pe linia de 100 mm, textul pleacă din 0 și ajunge în 100.

Instanțele fonturilor variabile (ADR 0113, `variabile`): Roboto Flex (OFL, din fonturile Android Studio de pe mașina asta,
subsetat aici) și trei variante, la fiecare instanță numită și la locurile din `LOCURI_FLEX`, cu instancer-ul lui fontTools
(`instantiateVariableFont`, toate axele fixate, fontul ținut în memorie: coordonatele rămân nerotunjite): contururile,
crenarea (deltele dispozitivelor adunate de el), metricile, coordonatele normalizate; avansul din HVAR cu `VarStoreInstancer`
(fără HVAR, al instancer-ului, din punctele fantomă). Pe hârtie: la implicit, fontul neschimbat; `avar` pe opsz 30; Bold =
wght 0,5; regiunea intermediară dincolo de vârf; H mai lat cu grosimea; AV anulat la Thin; componentele puse pe puncte și cele
2 × 2 cu deplasarea scalată; punctul fantomă din stânga; HVAR față de punctele fantomă (cel mult 1 unitate). Variantele au ce
promit, citite din octeții lui `gvar` (`ce_are_gvar`): vârfurile comune, regiunile intermediare, punctele comune și proprii,
toate sau unele, deltele pe octet, pe cuvânt și zero, offseturile lungi.

Rulare: `.tmp/venv-export2d/Scripts/python.exe -X utf8 test/oracles-py/text_corpus.py` (scrie `test/fixtures/text/`).
"""
import array
import bisect
import cmath
import collections
import json
import math
import os
import struct
import sys

from fontTools import subset
from fontTools.cffLib import GlobalSubrsIndex, SubrsIndex
from fontTools.cffLib.CFFToCFF2 import convertCFFToCFF2
from fontTools.encodings.StandardEncoding import StandardEncoding
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.bezierTools import calcCubicArcLengthC, splitCubicAtTC
from fontTools.misc.psCharStrings import T2CharString
from fontTools.misc.roundTools import otRound
from fontTools.pens.basePen import decomposeQuadraticSegment
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTCollection, TTFont, newTable
from fontTools.ttLib.tables import _g_v_a_r, _l_o_c_a, otTables
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.ttLib.tables._f_v_a_r import Axis, NamedInstance
from fontTools.ttLib.tables._g_l_y_f import GlyphComponent
from fontTools.ttLib.tables._k_e_r_n import KernTable_format_0
from fontTools.varLib.instancer import AxisLimits, instantiateVariableFont
from fontTools.varLib.varStore import VarStoreInstancer

RAD = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONTURI = os.path.join(RAD, 'public', 'fonturi')
DEST = os.path.join(RAD, 'test', 'fixtures', 'text')
# Fonturile libere de pe mașina asta din care se fac subseturile (OFL-1.1): Inter, din JetBrains Runtime-ul lui Android
# Studio; Source Han Sans JP, instalat în Windows. Subseturile sunt comise: generatorul merge și fără ele (le refolosește).
INTER = 'C:/Program Files/Android/Android Studio/jbr/lib/fonts/Inter-Regular.otf'
SOURCE_HAN = 'C:/Windows/Fonts/SourceHanSansJP-Normal.otf'

ARGS_ARE_XY_VALUES = 0x0002
SCALED_COMPONENT_OFFSET = 0x0800
PREFERINTE_CMAP = [(3, 10), (0, 6), (0, 4), (3, 1), (0, 3), (0, 2), (0, 1), (0, 0), (3, 0)]


def deschide(cale):
    """Un font de rescris fără marca de timp (`head.modified` rămâne a sursei): fixturile ies la fel la fiecare rulare."""
    return TTFont(cale, recalcTimestamp=False)


def cale_fixtura(nume):
    return os.path.join(FONTURI if os.path.exists(os.path.join(FONTURI, nume)) else DEST, nume)


def alege_cmap(font):
    """Subtabelul în ordinea lui `getBestCmap`, apoi simbolul Windows; doar formatele pe care le citește aplicația."""
    tabele = {(t.platformID, t.platEncID): t for t in font['cmap'].tables if t.format in (4, 6, 12)}
    for p in PREFERINTE_CMAP:
        if p in tabele:
            return tabele[p].cmap, p == (3, 0)
    return None, False


def glifa(font, cod):
    cmap, simbol = alege_cmap(font)
    g = cmap.get(cod)
    if g is None and simbol and 0x20 <= cod <= 0xFF:
        g = cmap.get(0xF000 + cod)
    return g


def contururi(font, nume):
    """Punctele fiecărui contur (x, y, pe curbă): TrueType din `getCoordinates`, CFF din pen (2 puncte de control pe cubică)."""
    if 'glyf' in font:
        glyf = font['glyf']
        coord, capete, steaguri = glyf[nume].getCoordinates(glyf)
        rez, start = [], 0
        for capat in capete:
            rez.append([(coord[i][0], coord[i][1], bool(steaguri[i] & 1)) for i in range(start, capat + 1)])
            start = capat + 1
        return rez
    gs = font.getGlyphSet()
    pen = DecomposingRecordingPen(gs)
    gs[nume].draw(pen)
    rez, cur = [], None
    for op, args in pen.value:
        if op == 'moveTo':
            cur = [(args[0][0], args[0][1], True)]
            rez.append(cur)
        elif op == 'lineTo':
            cur.append((args[0][0], args[0][1], True))
        elif op == 'curveTo':
            a, b, c = args
            cur += [(a[0], a[1], False), (b[0], b[1], False), (c[0], c[1], True)]
        elif op in ('closePath', 'endPath'):
            cur = None
        else:
            raise ValueError(op)
    return rez


def segmente(puncte):
    """Startul și segmentele conturului TrueType (în unitățile fontului): ('L', p) sau ('Q', q, p), ca în Glyph.draw."""
    pe = [p[2] for p in puncte]
    if any(pe):
        k = pe.index(True)
        rot = puncte[k + 1:] + puncte[:k + 1]
        start = rot[-1][:2]
        rez, cur, buf = [], start, []
        for p in rot:
            if p[2]:
                if buf:
                    for q, capat in decomposeQuadraticSegment(buf + [p[:2]]):
                        rez.append(('Q', cur, q, capat))
                        cur = capat
                    buf = []
                elif p[:2] != cur:
                    rez.append(('L', cur, p[:2]))
                    cur = p[:2]
            else:
                buf.append(p[:2])
        return start, rez
    off = [p[:2] for p in puncte]
    start = ((off[-1][0] + off[0][0]) / 2, (off[-1][1] + off[0][1]) / 2)
    rez, cur = [], start
    for q, capat in decomposeQuadraticSegment(off + [start]):
        rez.append(('Q', cur, q, capat))
        cur = capat
    return start, rez


def segmente_cubice(puncte):
    """Startul și segmentele conturului CFF: ('L', p) sau ('C', c1, c2, p), fără cele de lungime zero, închis cu o linie."""
    start = puncte[0][:2]
    rez, cur, k = [], start, 1
    while k < len(puncte):
        p = puncte[k]
        if p[2]:
            if p[:2] != cur:
                rez.append(('L', cur, p[:2]))
            cur = p[:2]
            k += 1
        else:
            c1, c2, capat = puncte[k][:2], puncte[k + 1][:2], puncte[k + 2][:2]
            if not (c1 == cur and c2 == cur and capat == cur):
                rez.append(('C', cur, c1, c2, capat))
            cur = capat
            k += 3
    if cur != start:
        rez.append(('L', cur, start))
    return start, rez


def cautari_kern(font):
    """Subtabelele de perechi ale căutărilor caracteristicii `kern`, cu Extension desfăcut; None dacă nu sunt."""
    if 'GPOS' not in font:
        return None
    t = font['GPOS'].table
    if not t.FeatureList or not t.LookupList:
        return None
    indici = sorted({i for fr in t.FeatureList.FeatureRecord if fr.FeatureTag == 'kern' for i in fr.Feature.LookupListIndex})
    rez = []
    for i in indici:
        lk = t.LookupList.Lookup[i]
        if lk.LookupType == 2:
            sts = list(lk.SubTable)
        elif lk.LookupType == 9:
            sts = [st.ExtSubTable for st in lk.SubTable if st.Format == 1 and st.ExtensionLookupType == 2]
        else:
            continue
        if sts:
            rez.append(sts)
    return rez or None


def liste_kern(font):
    """Subtabelele orizontale de formatul 0 ale tabelului `kern` vechi: (perechile, înlocuiește)."""
    if 'kern' not in font:
        return None
    rez = []
    for st in font['kern'].kernTables:
        if getattr(st, 'format', None) != 0 or not hasattr(st, 'kernTable'):
            continue
        if getattr(st, 'apple', False):
            if st.coverage & 0xE0:
                continue
            rez.append((st.kernTable, False))
        elif (st.coverage & 0x07) == 0x01:
            rez.append((st.kernTable, bool(st.coverage & 0x08)))
    return rez or None


def crenare(font, a, b):
    """XAdvance al primei glife din căutările `kern` ale lui GPOS (primul subtabel care potrivește); fără ele, `kern`."""
    cautari = cautari_kern(font)
    if cautari:
        total = 0
        for sts in cautari:
            for st in sts:
                if a not in st.Coverage.glyphs:
                    continue
                if st.Format == 1:
                    pset = st.PairSet[st.Coverage.glyphs.index(a)]
                    gasit = [r for r in pset.PairValueRecord if r.SecondGlyph == b]
                    if not gasit:
                        continue
                    v = gasit[0].Value1
                else:
                    c1 = st.ClassDef1.classDefs.get(a, 0) if st.ClassDef1 else 0
                    c2 = st.ClassDef2.classDefs.get(b, 0) if st.ClassDef2 else 0
                    if c1 >= st.Class1Count or c2 >= st.Class2Count:
                        continue
                    v = st.Class1Record[c1].Class2Record[c2].Value1
                total += (getattr(v, 'XAdvance', 0) or 0) if v is not None else 0
                break
        return total
    total = 0
    for tabel, inlocuieste in liste_kern(font) or []:
        if (a, b) in tabel:
            total = (0 if inlocuieste else total) + tabel[(a, b)]
    return total


def majuscula(font):
    """Vârful lui H (ce se taie); fără H, `sCapHeight` (OS/2 de la versiunea 2)."""
    h = glifa(font, ord('H'))
    if h is not None:
        pts = [p for c in contururi(font, h) for p in c]
        if pts and max(p[1] for p in pts) > 0:
            return max(p[1] for p in pts)
    return font['OS/2'].sCapHeight


def aseaza(font, p):
    cap = majuscula(font)
    h = p['inaltime']
    mm = lambda u: (u * h) / cap
    hhea = font['hhea']
    rand_mm = mm(hhea.ascent - hhea.descent + hhea.lineGap) * p['interlinie']
    hmtx = font['hmtx']
    cff = 'CFF ' in font
    glife, lipsa, randuri = [], 0, []
    for r, rand in enumerate(p['continut'].replace('\r', '').split('\n')):
        litere, x, ant = [], 0.0, None
        for ch in rand:
            if ord(ch) < 0x20 and ch != '\t':
                continue
            g = glifa(font, 0x20 if ch == '\t' else ord(ch))
            if g is None:
                lipsa += 1
                continue
            if ant is not None:
                x += mm(crenare(font, ant, g)) + p['spatiere']
            litere.append((ch, g, x))
            x += mm(hmtx[g][0])
            ant = g
        dx = 0 if p['aliniere'] == 'stanga' else (-x / 2 if p['aliniere'] == 'centru' else -x)
        randuri.append({'latime': x, 'caractere': len(litere), 'dx': dx})
        baza = -r * rand_mm
        for indice, (ch, g, x0) in enumerate(litere):
            def harta(q, x0=x0):
                return [x0 + dx + mm(q[0]), baza + mm(q[1])]
            cs = []
            for c in contururi(font, g):
                if len(c) < 2:
                    continue
                start, segs = segmente_cubice(c) if cff else segmente(c)
                if not segs:
                    continue
                out = []
                for s in segs:
                    if s[0] == 'L':
                        out.append(['L'] + harta(s[2]))
                    elif s[0] == 'C':
                        out.append(['C'] + harta(s[2]) + harta(s[3]) + harta(s[4]))
                    else:
                        _, p0, q, p2 = s
                        c1 = (p0[0] + 2 * (q[0] - p0[0]) / 3, p0[1] + 2 * (q[1] - p0[1]) / 3)
                        c2 = (p2[0] + 2 * (q[0] - p2[0]) / 3, p2[1] + 2 * (q[1] - p2[1]) / 3)
                        out.append(['C'] + harta(c1) + harta(c2) + harta(p2))
                cs.append({'start': harta(start), 'segmente': out})
            if cs:
                glife.append({'caracter': ch, 'rand': r, 'contururi': cs, '_x': x0 + dx, '_avans': mm(hmtx[g][0]), '_indice': indice})
    return {'glife': glife, 'lipsa': lipsa, '_randuri': randuri, '_metrici': {'rand': rand_mm, 'coborare': mm(hhea.descent)}}


def fara_interne(v):
    """Fixtura fără cheile de lucru (`_x`, `_randuri`…): doar ce compară testul."""
    if isinstance(v, dict):
        return {k: fara_interne(x) for k, x in v.items() if not k.startswith('_')}
    if isinstance(v, list):
        return [fara_interne(x) for x in v]
    return v


# Textul pe curbă (ADR 0108). Bucățile unei cubice în tabelul lungimilor.
BUCATI = 512
TOL_FT = 1e-12


class SegmentCurba:
    """Un segment al curbei, măsurat aici: lungimea și locul (punctul, unghiul tangentei în radiani) la distanța d."""

    def __init__(self, a, b, seg):
        self.a, self.b = complex(a['x'], a['y']), complex(b['x'], b['y'])
        self.tip = seg['tip']
        if self.tip == 'A' and abs(seg['bulge']) > 1e-12:
            # Bulge = tan(baleiaj / 4), pozitiv trigonometric; centrul, la stânga coardei cu c / (2 tan(baleiaj / 2)).
            baleiaj = 4 * math.atan(seg['bulge'])
            coarda = self.b - self.a
            c = abs(coarda)
            self.centru = (self.a + self.b) / 2 + coarda / c * 1j * (c / (2 * math.tan(baleiaj / 2)))
            self.raza = c / (2 * abs(math.sin(baleiaj / 2)))
            self.semn = 1 if baleiaj > 0 else -1
            self.alfa0 = cmath.phase(self.a - self.centru)
            self.lungime = self.raza * abs(baleiaj)
        elif self.tip == 'C':
            self.q = (self.a, complex(seg['c1']['x'], seg['c1']['y']), complex(seg['c2']['x'], seg['c2']['y']), self.b)
            self.bucati = list(splitCubicAtTC(*self.q, *[k / BUCATI for k in range(1, BUCATI)]))
            self.cumul = [0.0]
            for b in self.bucati:
                self.cumul.append(self.cumul[-1] + calcCubicArcLengthC(*b, tolerance=TOL_FT))
            self.lungime = self.cumul[-1]
        else:
            self.tip = 'L'
            self.lungime = abs(self.b - self.a)

    def la(self, d):
        if self.tip == 'L':
            u = (self.b - self.a) / self.lungime
            return self.a + u * d, cmath.phase(u)
        if self.tip == 'A':
            alfa = self.alfa0 + self.semn * d / self.raza
            return self.centru + self.raza * cmath.exp(1j * alfa), alfa + self.semn * math.pi / 2
        # Cubica: bucata din tabel, apoi bisecția pe parametrul ei, cu lungimea începutului bucății măsurată de fontTools.
        k = max(0, min(BUCATI - 1, bisect.bisect_right(self.cumul, d) - 1))
        lo, hi = 0.0, 1.0
        for _ in range(60):
            m = (lo + hi) / 2
            inceput = next(iter(splitCubicAtTC(*self.bucati[k], m)))
            if self.cumul[k] + calcCubicArcLengthC(*inceput, tolerance=TOL_FT) < d:
                lo = m
            else:
                hi = m
        t = (k + (lo + hi) / 2) / BUCATI
        p0, p1, p2, p3 = self.q
        u = 1 - t
        punct = u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3
        viteza = 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2)
        return punct, cmath.phase(viteza)


class CurbaOracol:
    """Curba textului, în sistemul ei original (cum a fost desenată): segmentele măsurate și locul la o distanță u."""

    def __init__(self, contur):
        v = contur['varfuri']
        self.inchis = contur['inchis']
        n = len(v) if self.inchis else len(v) - 1
        self.seg = [SegmentCurba(v[i]['p'], v[(i + 1) % len(v)]['p'], v[i]['s']) for i in range(n)]
        self.cumul = [0.0]
        for x in self.seg:
            self.cumul.append(self.cumul[-1] + x.lungime)
        self.L = self.cumul[-1]
        # Segmentele fără lungime nu dau nici locul, nici tangenta.
        self.pline = [i for i, x in enumerate(self.seg) if x.lungime > 0]

    def _pe(self, j, u):
        return self.seg[j].la(min(max(u - self.cumul[j], 0.0), self.seg[j].lungime))

    def pleaca(self, u):
        """Locul la u; într-un vârf, al segmentului care pleacă din el (mersul în sensul desenului)."""
        return self._pe(max([i for i in self.pline if self.cumul[i] <= u] or [self.pline[0]]), u)

    def ajunge(self, u):
        """Locul la u; într-un vârf, al segmentului care ajunge în el (mersul invers îl ia ca segment care pleacă)."""
        return self._pe(min([i for i in self.pline if self.cumul[i + 1] >= u] or [self.pline[-1]]), u)

    def trigonometric(self):
        """Închisă și desenată trigonometric: aria cu semn a poligonului eșantionat (doar semnul contează)."""
        if not self.inchis:
            return False
        pts = [x.la(x.lungime * k / 64)[0] for x in self.seg if x.lungime > 0 for k in range(64)]
        return sum((pts[i].conjugate() * pts[(i + 1) % len(pts)]).imag for i in range(len(pts))) > 0

    def loc(self, u, invers):
        """Locul la distanța u în sistemul original (dincolo de capete: închisă se reia, deschisă continuă pe tangentă);
        `invers`: textul merge spre începutul curbei, deci tangenta se întoarce."""
        if self.inchis:
            u %= self.L
            if invers and u == 0:
                u = self.L
            p, a = (self.ajunge if invers else self.pleaca)(u)
        elif u < 0:
            p, a = self.pleaca(0.0)
            p += cmath.exp(1j * a) * u
        elif u > self.L:
            p, a = self.ajunge(self.L)
            p += cmath.exp(1j * a) * (u - self.L)
        else:
            p, a = (self.ajunge if invers else self.pleaca)(u)
        return p, a + math.pi if invers else a


def pe_curba(asez, curba, inaltime, aliniere):
    """Literele textului așezat drept, duse pe curbă (ADR 0108). Întoarce glifele mutate și, pentru probele pe hârtie, harta
    fiecărei litere (un punct al literei → punctul lui pe foaie)."""
    c = CurbaOracol(curba['contur'])
    # Sensul: o curbă închisă desenată trigonometric se parcurge invers (textul în afara ei); „partea cealaltă” schimbă sensul.
    invers = c.trigonometric() != curba['invers']
    randuri, metrici = asez['_randuri'], asez['_metrici']
    n = len(randuri)
    dy = {
        'baza': 0.0,
        'deasupra': (n - 1) * metrici['rand'] - metrici['coborare'],
        'centru': -(inaltime - (n - 1) * metrici['rand']) / 2,
        'dedesubt': -inaltime,
    }[curba['pozitie']] + curba['distanta']
    semn = -1 if invers else 1
    glife, harti = [], []
    for g in asez['glife']:
        r = randuri[g['rand']]
        if curba['intinsa'] and r['caractere'] > 0:
            # Întins: spațiul dintre caractere crește cât rândul să acopere curba (închisă: și după ultimul).
            goluri = r['caractere'] if c.inchis else r['caractere'] - 1
            extra = (c.L - r['latime']) / goluri if goluri > 0 else 0.0
            pe_rand = g['_x'] - r['dx'] + g['_indice'] * extra + g['_avans'] / 2
            if c.inchis:
                # Aliniate față de ancoră: literele, de la începutul primei la sfârșitul ultimei (fără golul de după ea).
                vizibil = c.L - extra
                fata_de_ancora = (0 if aliniere == 'stanga' else -vizibil / 2 if aliniere == 'centru' else -vizibil) + pe_rand
                u = curba['s'] + semn * fata_de_ancora
            else:
                u = c.L - pe_rand if invers else pe_rand
        else:
            u = curba['s'] + semn * (g['_x'] + g['_avans'] / 2)
        p, unghi = c.loc(u, invers)
        rot = cmath.exp(1j * unghi)
        xc = g['_x'] + g['_avans'] / 2
        baza = -g['rand'] * metrici['rand']
        if curba['orientare'] == 'rotita':
            def harta(q, p=p, rot=rot, xc=xc):
                z = p + rot * complex(q[0] - xc, q[1] + dy)
                return [z.real, z.imag]
        else:
            def harta(q, p=p, rot=rot, xc=xc, baza=baza):
                z = p + rot * 1j * (baza + dy) + complex(q[0] - xc, q[1] - baza)
                return [z.real, z.imag]
        cs = []
        for k in g['contururi']:
            segs = []
            for sg in k['segmente']:
                if sg[0] == 'L':
                    segs.append(['L'] + harta(sg[1:3]))
                else:
                    segs.append(['C'] + harta(sg[1:3]) + harta(sg[3:5]) + harta(sg[5:7]))
            cs.append({'start': harta(k['start']), 'segmente': segs})
        glife.append({'caracter': g['caracter'], 'rand': g['rand'], 'contururi': cs})
        harti.append((g, harta))
    return glife, harti, c


def cerc(r):
    """Cercul de rază r în origine, ca în aplicație: două semicercuri trigonometrice, din (r, 0)."""
    return {'inchis': True, 'varfuri': [{'p': {'x': r, 'y': 0}, 's': {'tip': 'A', 'bulge': 1}}, {'p': {'x': -r, 'y': 0}, 's': {'tip': 'A', 'bulge': 1}}]}


def linii(inchis, *pts):
    return {'inchis': inchis, 'varfuri': [{'p': {'x': x, 'y': y}, 's': {'tip': 'L'}} for x, y in pts]}


def cubice(inchis, *bucati):
    """Vârfurile (x, y) cu cubica spre următorul: (x, y, c1x, c1y, c2x, c2y); ultimul vârf al unei deschise, (x, y)."""
    v = []
    for b in bucati:
        s = {'tip': 'C', 'c1': {'x': b[2], 'y': b[3]}, 'c2': {'x': b[4], 'y': b[5]}} if len(b) == 6 else {'tip': 'L'}
        v.append({'p': {'x': b[0], 'y': b[1]}, 's': s})
    return {'inchis': inchis, 'varfuri': v}


K = 0.5522847498307936 * 30
# Pe curbă: (numele, fontul, parametrii textului, curba, poziția pe ea, toleranța în mm; pe cubice, cele două cuadraturi
# diferite se abat cu ~5e-12 mm).
P_LEMN = {'continut': 'LEMN', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'centru'}
S_CUBICA = cubice(False, (0, 0, 30, 40, 70, -40), (100, 0))
CAZURI_CURBA = [
    ('cerc-baza', 'public/fonturi/roboto.ttf', P_LEMN, cerc(50), {'s': 25 * math.pi, 'pozitie': 'baza'}, 1e-9),
    ('cerc-dedesubt-invers', 'public/fonturi/roboto.ttf', {**P_LEMN, 'aliniere': 'stanga'}, cerc(50),
     {'s': 25 * math.pi, 'pozitie': 'dedesubt', 'distanta': 1.5, 'invers': True}, 1e-9),
    ('cerc-intinsa', 'public/fonturi/droid-serif.ttf', {'continut': 'ABCDEFGH', 'inaltime': 8, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'},
     cerc(50), {'s': 0, 'pozitie': 'baza', 'intinsa': True}, 1e-9),
    ('cerc-intinsa-h', 'public/fonturi/droid-serif.ttf', {'continut': 'HHHHHHHH', 'inaltime': 8, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'centru'},
     cerc(50), {'s': 25 * math.pi, 'pozitie': 'baza', 'intinsa': True}, 1e-9),
    ('cerc-randuri-intinse', 'public/fonturi/roboto.ttf', {'continut': 'Linia 1\nA doua linie', 'inaltime': 6, 'spatiere': 0.2, 'interlinie': 1.2, 'aliniere': 'centru'},
     cerc(40), {'s': 10, 'pozitie': 'centru', 'intinsa': True}, 1e-9),
    ('linie-intinsa', 'public/fonturi/roboto.ttf', {**P_LEMN, 'aliniere': 'stanga'}, linii(False, (0, 0), (100, 0)), {'s': 30, 'pozitie': 'baza', 'intinsa': True}, 1e-9),
    ('linie-colt-deasupra', 'public/fonturi/roboto.ttf', {'continut': 'Linia 1\nA doua', 'inaltime': 6, 'spatiere': 0, 'interlinie': 1.2, 'aliniere': 'stanga'},
     linii(False, (0, 0), (40, 0), (40, 0), (70, 20)), {'s': 5, 'pozitie': 'deasupra', 'distanta': 0.8}, 1e-9),
    ('linie-dincolo-de-capete', 'public/fonturi/roboto.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'centru'},
     linii(False, (0, 0), (30, 10)), {'s': 5, 'pozitie': 'baza'}, 1e-9),
    ('arc-verticala', 'test/fixtures/text/inter-subset.otf', {'continut': 'HAMBURG', 'inaltime': 8, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'centru'},
     {'inchis': False, 'varfuri': [{'p': {'x': -40, 'y': 0}, 's': {'tip': 'A', 'bulge': -0.5}}, {'p': {'x': 40, 'y': 0}, 's': {'tip': 'L'}}]},
     {'s': 47, 'pozitie': 'centru', 'orientare': 'verticala'}, 1e-9),
    ('cerc-verticala-randuri', 'public/fonturi/roboto.ttf', {'continut': 'Sus' + chr(10) + 'Jos', 'inaltime': 6, 'spatiere': 0, 'interlinie': 1.3, 'aliniere': 'centru'},
     cerc(40), {'s': 20, 'pozitie': 'dedesubt', 'orientare': 'verticala'}, 1e-9),
    ('dreptunghi-colturi', 'public/fonturi/droid-serif.ttf', {'continut': 'Ușă de stejar', 'inaltime': 7, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'},
     linii(True, (0, 0), (60, 0), (60, 30), (0, 30)), {'s': 50, 'pozitie': 'baza'}, 1e-9),
    ('cubica-baza', 'public/fonturi/roboto.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 5, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'},
     S_CUBICA, {'s': 10, 'pozitie': 'baza', 'distanta': -0.5}, 1e-9),
    ('cubica-intinsa-invers', 'public/fonturi/roboto.ttf', {**P_LEMN, 'inaltime': 12}, S_CUBICA,
     {'s': 0, 'pozitie': 'dedesubt', 'invers': True, 'intinsa': True}, 1e-9),
    ('cubica-invers-deasupra', 'test/fixtures/text/inter-subset.otf', {'continut': 'hamburgefontsiv 0123', 'inaltime': 4, 'spatiere': 0.1, 'interlinie': 1, 'aliniere': 'dreapta'},
     S_CUBICA, {'s': 60, 'pozitie': 'deasupra', 'distanta': 0.3, 'invers': True}, 1e-9),
    ('cerc-intinsa-invers-dreapta', 'public/fonturi/roboto.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 5, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'dreapta'},
     cerc(30), {'s': 30, 'pozitie': 'centru', 'invers': True, 'intinsa': True}, 1e-9),
    ('inchis-cubice-orar', 'test/fixtures/text/inter-subset.otf', {'continut': 'HAMBURGEFONTSIV', 'inaltime': 6, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'},
     cubice(True, (0, 30, K, 30, 30, K), (30, 0, 30, -K, K, -30), (0, -30, -K, -30, -30, -K), (-30, 0, -30, K, -K, 30)),
     {'s': 20, 'pozitie': 'centru'}, 1e-9),
]


def cazuri_pe_curba():
    """Fixtura textului pe curbă, cu probele pe hârtie verificate aici."""
    rez = {}
    for nume, fisier, p, contur, poz, tol in CAZURI_CURBA:
        font = TTFont(os.path.join(RAD, fisier))
        asez = aseaza(font, p)
        curba = {'contur': contur, 'distanta': 0, 'invers': False, 'orientare': 'rotita', 'intinsa': False, **poz}
        glife, harti, c = pe_curba(asez, curba, p['inaltime'], p['aliniere'])
        rez[nume] = {'font': fisier, 'parametri': p, 'curba': curba, 'tol': tol, 'glife': glife, '_harti': harti, '_curba': c}
    return rez


def probe_pe_hartie(rez):
    aproape = lambda a, b, eps=1e-9: abs(a - b) <= eps
    # Cercul R50: 100π; pe linia de bază, mijlocul liniei de bază a fiecărei litere pe cerc, vârful (10 mm) la raza 60,
    # deasupra centrului (ancora sus), citite de la stânga la dreapta.
    c = rez['cerc-baza']
    assert aproape(c['_curba'].L, 100 * math.pi, 1e-12), c['_curba'].L
    xs = []
    for g, h in c['_harti']:
        xc = g['_x'] + g['_avans'] / 2
        jos, sus = complex(*h([xc, 0])), complex(*h([xc, 10]))
        assert aproape(abs(jos), 50) and aproape(abs(sus), 60) and jos.imag > 0, (g['caracter'], abs(jos), abs(sus))
        xs.append(jos.real)
    assert xs == sorted(xs) and [g['caracter'] for g, _ in c['_harti']] == list('LEMN')
    # Dedesubt, pe partea cealaltă (mersul trigonometric, „sus”-ul spre centru), cu distanța 1,5: vârful la 48,5, baza la 58,5.
    for g, h in rez['cerc-dedesubt-invers']['_harti']:
        xc = g['_x'] + g['_avans'] / 2
        assert aproape(abs(complex(*h([xc, 10]))), 48.5) and aproape(abs(complex(*h([xc, 0]))), 58.5), g['caracter']
    # Întins pe cerc, golurile dintre litere sunt egale (și cel de după ultima); 8 litere la fel (H) stau deci la 45° una de
    # alta, în sensul acelor (textul se citește în afara cercului), iar textul centrat pe ancora de sus are sus golul mijlociu.
    unghiuri = [math.degrees(cmath.phase(complex(*h([g['_x'] + g['_avans'] / 2, 0])))) for g, h in rez['cerc-intinsa-h']['_harti']]
    assert aproape((unghiuri[3] + unghiuri[4]) / 2, 90), unghiuri
    for a, b in zip(unghiuri, unghiuri[1:]):
        assert aproape((a - b) % 360, 45), (a, b)
    # Întins pe linia de 100 mm: textul pleacă din 0 și ajunge exact în 100.
    hs = rez['linie-intinsa']['_harti']
    g0, h0 = hs[0]
    gn, hn = hs[-1]
    assert aproape(h0([g0['_x'], 0])[0], 0) and aproape(hn([gn['_x'] + gn['_avans'], 0])[0], 100), (h0([g0['_x'], 0]), hn([gn['_x'] + gn['_avans'], 0]))
    # Dincolo de capete, pe tangentă: prima literă înaintea începutului liniei, ultima după capătul ei.
    hs = rez['linie-dincolo-de-capete']['_harti']
    assert hs[0][1]([hs[0][0]['_x'], 0])[0] < 0 and hs[-1][1]([hs[-1][0]['_x'], 0])[0] > 30


def cutie(glifa_asezata):
    xs, ys = [], []
    for c in glifa_asezata['contururi']:
        xs.append(c['start'][0])
        ys.append(c['start'][1])
        for s in c['segmente']:
            xs += s[1::2]
            ys += s[2::2]
    return min(xs), min(ys), max(xs), max(ys)


def variante():
    """Variantele lui Roboto care exercită ce fonturile livrate n-au: loca lungă, componentele mai rare."""
    # fontTools alege singur loca scurtă cât încape (umple glifele impare): forma lungă se cere la scriere.
    original = _l_o_c_a.table__l_o_c_a.compile

    def loca_lunga(self, font):
        v = array.array('I', self.locations)
        if sys.byteorder != 'big':
            v.byteswap()
        font['head'].indexToLocFormat = 1
        return v.tobytes()

    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    # Tabelele necitite se copiază neatinse la scriere: citite, se compilează din nou.
    for tabel in ('head', 'loca', 'glyf'):
        f[tabel]
    cale = os.path.join(DEST, 'roboto-loca-lunga.ttf')
    _l_o_c_a.table__l_o_c_a.compile = loca_lunga
    try:
        f.save(cale)
    finally:
        _l_o_c_a.table__l_o_c_a.compile = original
    assert TTFont(cale)['head'].indexToLocFormat == 1

    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    glyf = f['glyf']
    # Ă: căciula pusă pe puncte (punctul 0 al ei peste punctul 0 al lui A), nu deplasată.
    breve = glyf['Abreve'].components[1]
    del breve.x, breve.y
    breve.firstPt, breve.secondPt = 0, 0
    breve.flags &= ~ARGS_ARE_XY_VALUES
    # Â: accentul scalat cu 0,75, cu deplasarea scalată (felul Apple).
    circ = glyf['Acircumflex'].components[1]
    circ.transform = [[0.75, 0], [0, 0.75]]
    circ.flags |= SCALED_COMPONENT_OFFSET
    # Ã: tilda prin 2 × 2, deplasarea nescalată (felul Microsoft).
    glyf['Atilde'].components[1].transform = [[0.9, 0.2], [-0.1, 1.1]]
    # Ä: scara pe X și Y.
    glyf['Adieresis'].components[1].transform = [[1.25, 0], [0, 0.75]]
    # Å: o glifă compusă din alta compusă (Ă de mai sus), deplasată.
    c = GlyphComponent()
    c.glyphName, c.x, c.y, c.flags = 'Abreve', 40, -30, ARGS_ARE_XY_VALUES
    glyf['Aring'].components = [c]
    cale = os.path.join(DEST, 'roboto-compuse.ttf')
    f.save(cale)
    g = TTFont(cale)['glyf']
    assert hasattr(g['Abreve'].components[1], 'firstPt') and g['Acircumflex'].components[1].flags & SCALED_COMPONENT_OFFSET
    assert g['Aring'].components[0].glyphName == 'Abreve'

    # Majuscula mincinoasă: sCapHeight departe de vârful lui H; din 7.2↑ (ADR 0106) contează H, nu sCapHeight.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    f['OS/2'].sCapHeight = 1300
    f.save(os.path.join(DEST, 'roboto-majuscula-gresita.ttf'))

    # Crenarea în care primul subtabel care potrivește câștigă: clasa 0 / 0 a subtabelului pe clase primește 777, deci o
    # pereche anume (din formatul 1, înaintea lui) care are și clase 0 / 0 trebuie să-și păstreze valoarea, nu să adune.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    kern = f['GPOS'].table.LookupList.Lookup[0]
    clase = [st for st in kern.SubTable if st.Format == 2][0]
    clase.Class1Record[0].Class2Record[0].Value1.XAdvance = 777
    f.save(os.path.join(DEST, 'roboto-crenare.ttf'))
    g = TTFont(os.path.join(DEST, 'roboto-crenare.ttf'))
    assert crenare(g, 'quotedbl', 'A') == crenare(f, 'quotedbl', 'A') == -120

    # O glifă compusă care se conține pe sine (Ă = A + Ă): aplicația o sare și o numără, restul textului rămâne.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    f.recalcBBoxes = False
    f['glyf']['Abreve'].components[1].glyphName = 'Abreve'
    f.save(os.path.join(DEST, 'roboto-ciclu.ttf'))


SET_CRENARE = ''.join(chr(c) for c in range(0x21, 0x7f)) + 'ĂÂÎȘȚăâîșțÄÖÜäöüéèàçñ'


def perechi_roboto():
    """Perechile cu crenare nenulă ale lui Roboto (din GPOS), pe numele glifelor, pentru variantele cu tabelul `kern`."""
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    rez = {}
    for a in SET_CRENARE:
        for b in SET_CRENARE:
            ga, gb = glifa(f, ord(a)), glifa(f, ord(b))
            v = crenare(f, ga, gb)
            if v:
                rez[(ga, gb)] = v
    return rez


def variante_72():
    """Variantele feliei 7.2↑ (ADR 0106): ce au fonturile reale și fonturile livrate nu."""
    # Tabelul `kern` vechi (Microsoft), fără GPOS: perechile lui Roboto, scrise ordonate după glifa din DREAPTA (ca Elephant,
    # din fonturile Windows), plus subtabelele sărite (vertical, „cross-stream”, „minimum”, cu perechi pe care nimeni nu le
    # acoperă după ele) și unul „override” (AV = −999).
    perechi = perechi_roboto()
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    del f['GPOS']
    k = newTable('kern')
    k.version = 0
    k.kernTables = []
    for acoperire, valori in ((0x01, perechi), (0x00, {('A', 'V'): 500}), (0x05, {('A', 'V'): 400, ('T', 'o'): 300}), (0x03, {('W', 'a'): 200}),
                              (0x09, {('A', 'V'): -999})):
        st = KernTable_format_0()
        st.version, st.format, st.coverage, st.tupleIndex = 0, 0, acoperire, 0
        st.kernTable = dict(valori)
        k.kernTables.append(st)
    f['kern'] = k
    cale = os.path.join(DEST, 'roboto-kern-ms.ttf')
    f.save(cale)
    # Perechile primului subtabel, reordonate pe loc după glifa din dreapta (fontTools le scrie ordonate).
    date = bytearray(open(cale, 'rb').read())
    n = struct.unpack('>H', date[12:14])[0]
    for k_ in range(n):
        r = 12 + 16 * k_
        if bytes(date[r:r + 4]) == b'kern':
            pos = struct.unpack('>L', date[r + 8:r + 12])[0]
            break
    st0 = pos + 4
    nperechi = struct.unpack('>H', date[st0 + 6:st0 + 8])[0]
    p0 = st0 + 14
    inreg = [date[p0 + 6 * i:p0 + 6 * i + 6] for i in range(nperechi)]
    inreg.sort(key=lambda b: (b[2:4], b[0:2]))
    date[p0:p0 + 6 * nperechi] = b''.join(inreg)
    open(cale, 'wb').write(bytes(date))
    g = TTFont(cale)
    assert 'GPOS' not in g and crenare(g, 'A', 'V') == -999 and crenare(g, 'T', 'o') == perechi[('T', 'o')]
    chei = [struct.unpack('>HH', bytes(x[0:4])) for x in inreg]
    assert chei != sorted(chei), 'perechile trebuie să fie neordonate'
    # Aceeași, cu lungimea primului subtabel scrisă prea mică (14, cât antetul: ca o lungime pe 16 biți ruptă la un tabel
    # mare): după formatul 0 se merge pe numărul perechilor. fontTools, cu mai multe subtabele, crede lungimea: crenarea
    # așteptată e a fontului de mai sus (același conținut), nu citită din fișierul ăsta.
    date[st0 + 2:st0 + 4] = struct.pack('>H', 14)
    open(os.path.join(DEST, 'roboto-kern-lungime.ttf'), 'wb').write(bytes(date))

    # Tabelul `kern` lângă crenarea din GPOS (AV = 500 în `kern`): câștigă GPOS, ca la HarfBuzz.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    k = newTable('kern')
    k.version = 0
    st = KernTable_format_0()
    st.version, st.format, st.coverage, st.tupleIndex = 0, 0, 0x01, 0
    st.kernTable = {('A', 'V'): 500, ('T', 'o'): 500}
    k.kernTables = [st]
    f['kern'] = k
    f.save(os.path.join(DEST, 'roboto-kern-si-gpos.ttf'))
    g = TTFont(os.path.join(DEST, 'roboto-kern-si-gpos.ttf'))
    assert crenare(g, 'A', 'V') == perechi[('A', 'V')] != 500

    # Tabelul `kern` Apple (versiunea 1.0): un subtabel orizontal și unul vertical (sărit).
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    del f['GPOS']
    k = newTable('kern')
    k.version = 1.0
    k.kernTables = []
    for acoperire, valori in ((0x00, perechi), (0x80, {('A', 'V'): 500})):
        st = KernTable_format_0(apple=True)
        st.format, st.coverage, st.tupleIndex = 0, acoperire, 0
        st.kernTable = dict(valori)
        k.kernTables.append(st)
    f['kern'] = k
    cale = os.path.join(DEST, 'roboto-kern-apple.ttf')
    f.save(cale)
    g = TTFont(cale)
    assert g['kern'].version == 1.0 and crenare(g, 'A', 'V') == perechi[('A', 'V')]

    # Căutările de crenare ca Extension (tipul 9), ca în 81 de fonturi Windows.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    for lk in f['GPOS'].table.LookupList.Lookup:
        if lk.LookupType == 2:
            ext = []
            for st in lk.SubTable:
                e = otTables.ExtensionPos()
                e.Format, e.ExtensionLookupType, e.ExtSubTable = 1, 2, st
                ext.append(e)
            lk.LookupType, lk.SubTable, lk.SubTableCount = 9, ext, len(ext)
    cale = os.path.join(DEST, 'roboto-gpos-ext.ttf')
    f.save(cale)
    assert all(lk.LookupType == 9 for lk in TTFont(cale)['GPOS'].table.LookupList.Lookup)

    # `cmap` 12 (Windows 3/10) peste un 3/1 care minte la „A” (dă glifa lui B): câștigă 3/10, ca la fontTools.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    bun = dict(f.getBestCmap())
    t12 = CmapSubtable.newSubtable(12)
    t12.platformID, t12.platEncID, t12.language, t12.cmap = 3, 10, 0, dict(bun)
    t4 = CmapSubtable.newSubtable(4)
    t4.platformID, t4.platEncID, t4.language, t4.cmap = 3, 1, 0, dict(bun)
    t4.cmap[ord('A')] = bun[ord('B')]
    f['cmap'].tables = [t4, t12]
    f.save(os.path.join(DEST, 'roboto-cmap12.ttf'))
    # `cmap` 6 (Unicode 0/3): un singur interval, U+0020–U+007E.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    t6 = CmapSubtable.newSubtable(6)
    t6.platformID, t6.platEncID, t6.language = 0, 3, 0
    t6.cmap = {c: bun.get(c, '.notdef') for c in range(0x20, 0x7f)}
    # După el, un simbol Windows (3/0, mai jos în ordine): octeții de după intervalul formatului 6 nu sunt zero.
    t30 = CmapSubtable.newSubtable(4)
    t30.platformID, t30.platEncID, t30.language, t30.cmap = 3, 0, 0, {0xF041: bun[ord('B')]}
    f['cmap'].tables = [t6, t30]
    f.save(os.path.join(DEST, 'roboto-cmap6.ttf'))
    assert TTFont(os.path.join(DEST, 'roboto-cmap6.ttf'))['cmap'].tables[0].format == 6
    # Un font simbol (Windows 3/0, ca Wingdings): glifele la U+F020–U+F0FF; „H” le caută acolo.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    ts = CmapSubtable.newSubtable(4)
    ts.platformID, ts.platEncID, ts.language = 3, 0, 0
    ts.cmap = {0xF000 + c: bun[c] for c in range(0x20, 0x100) if c in bun}
    f['cmap'].tables = [ts]
    f.save(os.path.join(DEST, 'roboto-simbol.ttf'))

    # Fără H (scos din `cmap`): majuscula vine din `sCapHeight` (1400); fără nici ea, fontul e refuzat (proba scoate OS/2).
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    for t in f['cmap'].tables:
        t.cmap.pop(ord('H'), None)
    f['OS/2'].sCapHeight = 1400
    f.save(os.path.join(DEST, 'roboto-fara-h.ttf'))
    assert glifa(TTFont(os.path.join(DEST, 'roboto-fara-h.ttf')), ord('H')) is None

    # O colecție TTC: Roboto și Droid Serif.
    col = TTCollection()
    col.fonts = [deschide(os.path.join(FONTURI, 'roboto.ttf')), deschide(os.path.join(FONTURI, 'droid-serif.ttf'))]
    col.save(os.path.join(DEST, 'roboto-droid.ttc'))
    # WOFF (1.0): aceleași tabele, comprimate cu zlib.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    f.flavor = 'woff'
    f.save(os.path.join(DEST, 'roboto.woff'))
    # Un font variabil (doar `fvar`): instanțele numite, cu și fără nume PostScript.
    f = deschide(os.path.join(FONTURI, 'roboto.ttf'))
    fvar = newTable('fvar')
    a = Axis()
    a.axisTag, a.minValue, a.defaultValue, a.maxValue, a.flags = 'wght', 100.0, 400.0, 900.0, 0
    a.axisNameID = f['name'].addName('Weight')
    fvar.axes = [a]
    fvar.instances = []
    for stil, w, ps in (('Regular', 400.0, 'Roboto-Regular'), ('Bold', 700.0, 'Roboto-Bold'), ('Thin', 100.0, None), ('Book', 400.0, 'Roboto-Book')):
        i = NamedInstance()
        i.subfamilyNameID = f['name'].addName(stil)
        i.coordinates = {'wght': w}
        i.postscriptNameID = f['name'].addName(ps) if ps else 0xFFFF
        fvar.instances.append(i)
    f['fvar'] = fvar
    f.save(os.path.join(DEST, 'roboto-fvar.ttf'))

    # Subseturile fonturilor libere (OFL), făcute o dată (refolosite dacă fonturile sursă lipsesc).
    def subseteaza(sursa, text, dest):
        if not os.path.exists(sursa):
            assert os.path.exists(dest), dest
            return
        opt = subset.Options()
        opt.name_IDs = ['*']
        opt.notdef_outline = True
        s = subset.Subsetter(options=opt)
        s.populate(text=text)
        f = deschide(sursa)
        s.subset(f)
        f.save(dest)
    subseteaza(INTER, 'HAMBURGEFONTSIV hamburgefontsiv ĂÂÎȘȚăâîșț 0123456789 AVATAR To Wa .,!?', os.path.join(DEST, 'inter-subset.otf'))
    subseteaza(SOURCE_HAN, 'Hあ日本語AVa', os.path.join(DEST, 'source-han-subset.otf'))
    # FDSelect în formatul 3 (intervale), nu 0 (câte un octet pe glifă, cât alege fontTools pentru un subset mic). Și fără
    # numele rezervat „Source” (OFL 1.1, clauza 3: un subset e o versiune modificată): familia devine „CNCVS Proba CID”;
    # drepturile (ID 0), marca (ID 7) și licența (ID 13, 14) rămân.
    f = deschide(os.path.join(DEST, 'source-han-subset.otf'))
    f['CFF '].cff.topDictIndex[0].FDSelect.format = 3
    redenumeste = lambda t: t.replace('Source Han Sans JP', 'CNCVS Proba CID').replace('SourceHanSansJP', 'CNCVSProbaCID').replace('Source Han Sans', 'CNCVS Proba')
    for r in f['name'].names:
        if r.nameID not in (0, 7, 13, 14):
            r.string = redenumeste(r.toUnicode())
    cff = f['CFF '].cff
    cff.fontNames = [redenumeste(n) for n in cff.fontNames]
    td0 = cff.topDictIndex[0]
    for camp in ('FullName', 'FamilyName'):
        if hasattr(td0, camp):
            setattr(td0, camp, redenumeste(getattr(td0, camp)))
    for fd in td0.FDArray:
        if hasattr(fd, 'FontName'):
            fd.FontName = redenumeste(fd.FontName)
    f.save(os.path.join(DEST, 'source-han-subset.otf'))
    g = TTFont(os.path.join(DEST, 'source-han-subset.otf'))
    td = g['CFF '].cff.topDictIndex[0]
    assert hasattr(td, 'ROS') and len(td.FDArray) > 1, 'Source Han trebuie să rămână CID, cu mai multe FD'
    assert g.reader['CFF '][td.rawDict['FDSelect']] == 3, 'FDSelect trebuie să fie în formatul 3'
    assert all('Source' not in r.toUnicode() for r in g['name'].names if r.nameID not in (0, 7, 13, 14)), 'numele rezervat a rămas'
    assert 'Source' not in g['CFF '].cff.fontNames[0]
    td = TTFont(os.path.join(DEST, 'inter-subset.otf'))['CFF '].cff.topDictIndex[0]
    assert len(td.Private.Subrs) > 0, 'Inter trebuie să-și păstreze subrutinele locale'
    # CFF2 (OpenType variabil cu contururi PostScript): refuzat.
    f = deschide(os.path.join(DEST, 'inter-subset.otf'))
    convertCFFToCFF2(f)
    f.save(os.path.join(DEST, 'inter-cff2.otf'))
    assert 'CFF2' in TTFont(os.path.join(DEST, 'inter-cff2.otf'))
    cff_sintetic(os.path.join(DEST, 'cff-sintetic.otf'))


def cff_sintetic(cale):
    """Un CFF scris de mână, cu ce n-are Inter: `seac`, cele patru flex-uri, toate cubicele scurte, sugestiile cu mască pe doi
    octeți, `dotsection`, lățimile, subrutinele cu decalajul 1 131 (1 300 locale) și 32 768 (34 000 globale), puncte izolate."""
    ordine = ['.notdef', 'space', 'A', 'H', 'acute', 'Aacute', 'C', 'F', 'S', 'R', 'P']
    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(ordine)
    fb.setupCharacterMap({0x20: 'space', 0x41: 'A', 0x48: 'H', 0xB4: 'acute', 0xC1: 'Aacute', 0x43: 'C', 0x46: 'F', 0x53: 'S', 0x52: 'R', 0x50: 'P'})
    fb.setupCFF('CncvsSintetic-Regular', {'FullName': 'CNCVS Sintetic'}, {n: T2CharString(program=['endchar']) for n in ordine}, {})
    cff = fb.font['CFF '].cff
    td = cff.topDictIndex[0]
    priv = td.Private
    globale = GlobalSubrsIndex()
    for _ in range(34000):
        globale.append(T2CharString(program=[], private=priv, globalSubrs=globale))
    cff.GlobalSubrs = globale
    locale = SubrsIndex(private=priv, globalSubrs=globale)
    for _ in range(1300):
        locale.append(T2CharString(program=[], private=priv, globalSubrs=globale))
    # Subrutina 0 (nechemată): 70 000 de `return`, ca indexul subrutinelor locale să aibă offseturi pe 3 octeți.
    locale[0] = T2CharString(program=['return'] * 70000, private=priv, globalSubrs=globale)
    priv.Subrs = locale
    cs = lambda prog: T2CharString(program=prog, private=priv, globalSubrs=globale)
    # Subrutinele care desenează: locala 1250 (−1131 = 119) cheamă locala 1251 (120); globala 33000 (−32768 = 232).
    locale[1250] = cs([100, 0, 'rlineto', 120, 'callsubr', 'return'])
    locale[1251] = cs([0, 100, 'rlineto', 'return'])
    globale[33000] = cs([-100, 0, 'rlineto', 'return'])
    programe = {
        'space': [250, 'endchar'],
        # A: lățimea în fața lui rmoveto (3 operanzi).
        'A': [100, 0, 0, 'rmoveto', 300, 700, 'rlineto', 300, -700, 'rlineto', -120, 0, 'rlineto', -60, 160, 'rlineto', -240, 0, 'rlineto', -60, -160, 'rlineto', 'endchar'],
        'acute': [250, 750, 'rmoveto', 120, 150, 'rlineto', 60, -30, 'rlineto', -140, -120, 'rlineto', 'endchar'],
        # H: vlineto alternativ, 11 operanzi, lățimea în fața lui rmoveto.
        'H': [600, 50, 0, 'rmoveto', 700, 100, -300, 300, 300, 100, -700, -100, 300, -300, -300, 'vlineto', 'endchar'],
        # Á = seac(A, acute), cu lățimea (5 operanzi): accentul deplasat cu (20, 30).
        'Aacute': [500, 20, 30, StandardEncoding.index('A'), StandardEncoding.index('acute'), 'endchar'],
        'C': [100, 100, 'rmoveto',
              10, 50, 30, 20, 40, 60, 20, -10, 30, 'hhcurveto',
              50, 30, 20, 40, 'hhcurveto',
              5, 40, 20, 30, 50, 30, -10, 20, 40, 'vvcurveto',
              40, 20, 30, 50, 'vvcurveto',
              40, 30, 30, 40, 10, 'hvcurveto',
              -40, -30, -30, -40, -50, -30, -30, -40, -5, 'vhcurveto',
              30, 20, 10, 30, 'hvcurveto',
              -20, -10, -30, -20, -40, -10, -30, -40, 'rcurveline',
              -10, -20, -20, -10, -30, -20, -20, -30, -10, -40, 'rlinecurve',
              -30, 10, -20, 20, -10, 30, -20, -10, -30, -20, -40, -10, 'rrcurveto',
              -60, 20, -40, 'hlineto', 'endchar'],
        'F': [100, 200, 'rmoveto',
              50, 50, 30, 50, 50, 50, 50, 'hflex',
              30, 10, 30, 10, 30, 0, 30, -10, 30, -10, 30, 0, 50, 'flex',
              'ignore',
              40, 10, 40, 20, 40, 40, 40, -25, 40, 'hflex1',
              30, 5, 30, 5, 30, 0, 30, -5, 30, -10, 40, 'flex1',
              5, 30, 5, 30, 0, 30, -5, 30, -10, 30, 40, 'flex1',
              -700, 'hlineto', 'endchar'],
        # Sugestiile: lățimea + 2 tulpini, 3 tulpini, 4 subînțelese la hintmask: 9 tulpini, deci măștile au 2 octeți.
        'S': [500, 0, 50, 100, 50, 'hstemhm', 10, 20, 30, 20, 50, 20, 'vstemhm',
              100, 20, 150, 20, 200, 20, 250, 20, 'hintmask', b'\xff\x80',
              0, 0, 'rmoveto', 400, 0, 'rlineto', 'cntrmask', b'\x0f\x80', 0, 400, 'rlineto',
              'hintmask', b'\x00\x80', -400, 0, 'rlineto', 'endchar'],
        'R': [0, 0, 'rmoveto', 119, 'callsubr', 232, 'callgsubr', 'endchar'],
        # Un contur de un punct (două mutări la rând), o linie de lungime zero.
        'P': [100, 100, 'rmoveto', 200, 200, 'rmoveto', 0, 0, 'rlineto', 100, 0, 'rlineto', 0, 100, 'rlineto', 'endchar'],
        '.notdef': ['endchar'],
    }
    for nume, prog in programe.items():
        td.CharStrings[nume] = cs(prog)
    fb.setupHorizontalMetrics({n: (600, 0) for n in ordine})
    fb.setupMaxp()
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({'familyName': 'CNCVS Sintetic', 'styleName': 'Regular'})
    fb.setupOS2(sCapHeight=700, sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    # Fără marca de timp: același font la fiecare generare.
    fb.font.recalcTimestamp = False
    fb.font['head'].created = fb.font['head'].modified = 3_700_000_000
    fb.save(cale)
    g = TTFont(cale)
    cff = g['CFF '].cff
    assert len(cff.GlobalSubrs) == 34000 and len(cff.topDictIndex[0].Private.Subrs) == 1300
    # Indexul subrutinelor locale chiar are offseturi pe 3 octeți (octetul offSize, după numărul lor).
    date = open(cale, 'rb').read()
    td = cff.topDictIndex[0]
    poz_cff = g.reader.tables['CFF '].offset
    poz_subr = poz_cff + td.rawDict['Private'][1] + td.Private.rawDict['Subrs']
    assert struct.unpack('>H', date[poz_subr:poz_subr + 2])[0] == 1300 and date[poz_subr + 2] == 3, date[poz_subr:poz_subr + 3]
    # Pe hârtie: R = trei laturi ale unui pătrat de 100 (subrutinele, prin decalajele lor); Á = A + accentul la (20, 30).
    assert contururi(g, 'R') == [[(0, 0, True), (100, 0, True), (100, 100, True), (0, 100, True)]], contururi(g, 'R')
    accent = [(x + 20, y + 30, pe) for x, y, pe in contururi(g, 'acute')[0]]
    assert contururi(g, 'Aacute') == contururi(g, 'A') + [accent]
    assert majuscula(g) == 700


# 7.4↑ (ADR 0113): instanțele fonturilor variabile. Fontul liber al corpusului e Roboto Flex (OFL 1.1, fără nume rezervat:
# subsetul își păstrează numele), din fonturile cu care Android Studio previzualizează machetele: 13 axe, 20 de instanțe
# numite (fără nume PostScript), `avar` (opsz nu e liniară), `gvar` (regiuni intermediare, puncte rare), `HVAR`, `MVAR` și
# crenarea variabilă (dispozitivele din GPOS, magazinul din GDEF). Subsetul e comis: generatorul merge și fără sursă.
ROBOTO_FLEX = 'C:/Program Files/Android/Android Studio/plugins/design-tools/resources/layoutlib/data/fonts/RobotoFlex-Regular.ttf'
TEXT_FLEX = 'HAMBURGEFONTSIVLW aeostvw ĂÂÎȘȚăâîșț 0.,'
FLEX = os.path.join(DEST, 'roboto-flex-subset.ttf')
FLEX_FANTOMA = os.path.join(DEST, 'roboto-flex-fantoma.ttf')
FLEX_COMPUSE = os.path.join(DEST, 'roboto-flex-compuse.ttf')


def subset_pe_loc(f, text):
    """Subsetul unui font deschis, pe loc: glifele textului (și componentele lor), toate numele, variațiile păstrate, fără
    GSUB (aplicația nu-l citește; la Roboto Flex are și variațiile caracteristicilor)."""
    opt = subset.Options()
    opt.name_IDs = ['*']
    opt.notdef_outline = True
    opt.drop_tables += ['GSUB']
    s = subset.Subsetter(options=opt)
    s.populate(text=text)
    s.subset(f)
    return f


def ce_are_gvar(cale):
    """Ce folosește `gvar` din fișier, citit aici din octeți (nu de fontTools): offseturile lungi, vârfurile comune și cele din
    antetul tuplului, regiunile intermediare, punctele comune ale glifei și cele proprii tuplului, toate punctele sau doar
    unele (IUP), deltele pe octet, pe cuvânt și șirurile de zero. Fiecare tuplu se citește până la capătul lui exact."""
    date = open(cale, 'rb').read()
    f = TTFont(cale)
    gl = f['glyf']
    p0 = f.reader.tables['gvar'].offset
    u16 = lambda p: struct.unpack('>H', date[p:p + 2])[0]
    u32 = lambda p: struct.unpack('>I', date[p:p + 4])[0]
    axe, comune, nglife, steag, inceput = u16(p0 + 4), u16(p0 + 6), u16(p0 + 12), u16(p0 + 14), u32(p0 + 16)
    lung = steag & 1
    loc = lambda g: p0 + inceput + (u32(p0 + 20 + 4 * g) if lung else 2 * u16(p0 + 20 + 2 * g))
    n = collections.Counter({'lungi': lung, 'tupluri-comune': comune})

    def puncte(p):
        c = date[p]
        p += 1
        if c & 0x80:
            c = ((c & 0x7F) << 8) | date[p]
            p += 1
        if c == 0:
            n['toate-punctele'] += 1
            return p, None
        n['puncte-rare'] += 1
        citite = 0
        while citite < c:
            h = date[p]
            p += 1
            k = (h & 0x7F) + 1
            n['puncte-pe-cuvant' if h & 0x80 else 'puncte-pe-octet'] += 1
            p += k * (2 if h & 0x80 else 1)
            citite += k
        return p, c

    for g, nume in enumerate(f.getGlyphOrder()):
        a, b = loc(g), loc(g + 1)
        if a == b:
            continue
        glifa_ = gl[nume]
        total = (len(glifa_.components) if glifa_.isComposite() else len(glifa_.coordinates) if glifa_.numberOfContours > 0 else 0) + 4
        cnt, doff = u16(a), u16(a + 2)
        h, tupluri = a + 4, []
        for _ in range(cnt & 0x0FFF):
            marime, idx = u16(h), u16(h + 2)
            h += 4
            n['varf-in-antet' if idx & 0x8000 else 'varf-comun'] += 1
            h += 2 * axe if idx & 0x8000 else 0
            if idx & 0x4000:
                n['intermediar'] += 1
                h += 4 * axe
            tupluri.append((marime, idx))
        d, comun = a + doff, None
        if cnt & 0x8000:
            n['puncte-comune'] += 1
            d, comun = puncte(d)
        for marime, idx in tupluri:
            q, pc = d, comun
            if idx & 0x2000:
                n['puncte-proprii'] += 1
                q, pc = puncte(q)
            k = total if pc is None else pc
            for _ in range(2):
                citite = 0
                while citite < k:
                    hh = date[q]
                    q += 1
                    r = (hh & 0x3F) + 1
                    fel = {0x80: 'delte-zero', 0x40: 'delte-cuvant', 0xC0: 'delte-lungi', 0: 'delte-octet'}[hh & 0xC0]
                    n[fel] += 1
                    q += r * {'delte-zero': 0, 'delte-cuvant': 2, 'delte-lungi': 4, 'delte-octet': 1}[fel]
                    citite += r
            assert q == d + marime, (nume, q, d + marime)
            d += marime
        assert d <= b, (nume, d, b)
    return n


def variante_74():
    """Fontul variabil al corpusului și variantele lui, fiecare cu ce promite numele ei."""
    if os.path.exists(ROBOTO_FLEX):
        subset_pe_loc(deschide(ROBOTO_FLEX), TEXT_FLEX).save(FLEX)
    assert os.path.exists(FLEX), FLEX
    f = TTFont(FLEX)
    assert len(f['fvar'].axes) == 13 and len(f['fvar'].instances) == 20
    assert all(i.postscriptNameID == 0xFFFF for i in f['fvar'].instances)
    # avar schimbă opsz (pe wght e identitatea): prima pereche netrivială, folosită și de proba de pe hârtie.
    assert f['avar'].segments['opsz'][0.16925048828125] == 0.49200439453125, f['avar'].segments['opsz']
    assert f['HVAR'].table.AdvWidthMap is not None and 'MVAR' in f
    kern = [st for i in cautari_kern_indici(f) for st in f['GPOS'].table.LookupList.Lookup[i].SubTable]
    assert kern and all(st.ValueFormat1 & 0x40 for st in kern), 'crenarea are dispozitivele variațiilor'
    # Componentele lui Roboto Flex sunt deplasate (x, y), iar deltele lor mută accentele de la o instanță la alta.
    gl, gv = f['glyf'], f['gvar']
    assert any(tv.coordinates[k] not in (None, (0, 0)) for nume in f.getGlyphOrder() if gl[nume].isComposite()
               for tv in gv.variations.get(nume, []) for k in range(len(gl[nume].components)))
    are = ce_are_gvar(FLEX)
    for cheie in ('tupluri-comune', 'varf-comun', 'intermediar', 'puncte-comune', 'puncte-proprii', 'toate-punctele',
                  'puncte-rare', 'delte-zero', 'delte-cuvant', 'delte-octet'):
        assert are[cheie] > 0, (cheie, are)
    assert are['lungi'] == 0

    # Fără HVAR (avansul din punctele fantomă) și fără H în `cmap` (majuscula din sCapHeight, variat de `cpht` din MVAR). Și A
    # cu punctul fantomă din stânga mutat (+25 la wght maxim, fără cel din dreapta): avansul lui scade cu delta lui.
    f = subset_pe_loc(deschide(FLEX), 'HAVTo')
    del f['HVAR']
    for t in f['cmap'].tables:
        t.cmap.pop(ord('H'), None)
    n_a = glifa(f, ord('A'))
    f['gvar'].variations[n_a].append(TupleVariation({'wght': (0.0, 1.0, 1.0)}, [None] * len(f['glyf'][n_a].coordinates) + [(25, 0), None, None, None]))
    f.save(FLEX_FANTOMA)
    g = TTFont(FLEX_FANTOMA)
    assert 'HVAR' not in g and glifa(g, ord('H')) is None and 'cpht' in [r.ValueTag for r in g['MVAR'].table.ValueRecord]
    # Pe hârtie, la Bold (factorul tuplului nou, 0,5): punctul din stânga vine cu 12,5 spre dreapta, deci avansul lui A scade
    # cu 12,5 (12 sau 13, după rotunjirea celor două avansuri) față de același font fără tuplu.
    b, _ = instanta(FLEX_FANTOMA, {'wght': 700})
    fara = TTFont(FLEX_FANTOMA)
    fara['gvar'].variations[n_a].pop()
    fara = instantiateVariableFont(fara, {a.axisTag: 700 if a.axisTag == 'wght' else a.defaultValue for a in fara['fvar'].axes})
    assert fara['hmtx'][n_a][0] - b['hmtx'][n_a][0] in (12, 13), (fara['hmtx'][n_a][0], b['hmtx'][n_a][0])

    # Componentele, la instanțe, altfel decât în Roboto Flex: căciula lui Ă pusă pe puncte (punctul ei cel mai de jos peste
    # vârful lui A), cu delte mari scrise pe ea, care nu contează (o componentă pusă pe puncte urmează punctele variate); a lui
    # Â prin 2 × 2, cu deplasarea scalată (felul Apple) și delte noi pe deplasare: (+25, −15) la wght maxim, (+12, +34) într-o
    # regiune intermediară a lui opsz (deltele ei vechi devin zero, ca proba de pe hârtie să le vadă doar pe cele noi). Și
    # `gvar` cu offseturile lungi.
    f = subset_pe_loc(deschide(FLEX), 'AĂÂ')
    gl, gv = f['glyf'], f['gvar']
    n_a, n_abreve, n_acirc = glifa(f, ord('A')), glifa(f, 0x102), glifa(f, 0xC2)
    c, c2 = gl[n_abreve].components[1], gl[n_acirc].components[1]
    assert gl[n_abreve].components[0].glyphName == gl[n_acirc].components[0].glyphName == n_a and hasattr(c, 'x') and hasattr(c2, 'x')
    n_breve, n_circ = c.glyphName, c2.glyphName
    a = gl[n_a].getCoordinates(gl)[0]
    breve = gl[n_breve].getCoordinates(gl)[0]
    varf = max(range(len(a)), key=lambda k: (a[k][1], -k))
    jos = min(range(len(breve)), key=lambda k: (breve[k][1], k))
    del c.x, c.y
    c.firstPt, c.secondPt = varf, jos
    gv.variations[n_abreve].append(TupleVariation({'wght': (0.0, 1.0, 1.0)}, [None, (400, 600), None, None, None, None]))
    c2.transform = [[0.9, 0.15], [0.0, 0.85]]
    c2.flags |= SCALED_COMPONENT_OFFSET
    deplasare = (c2.x, c2.y)
    for tv in gv.variations[n_acirc]:
        if tv.coordinates[1] is not None:
            tv.coordinates[1] = (0, 0)
    gv.variations[n_acirc] += [TupleVariation({'wght': (0.0, 1.0, 1.0)}, [None, (25, -15), None, None, None, None]),
                               TupleVariation({'opsz': (0.0, 0.5, 1.0)}, [None, (12, 34), None, None, None, None])]
    original = _g_v_a_r.table__g_v_a_r.compileOffsets_

    def offseturi_lungi(offsets):
        v = array.array('I', offsets)
        if sys.byteorder != 'big':
            v.byteswap()
        return v.tobytes(), 1
    _g_v_a_r.table__g_v_a_r.compileOffsets_ = staticmethod(offseturi_lungi)
    try:
        f.save(FLEX_COMPUSE)
    finally:
        _g_v_a_r.table__g_v_a_r.compileOffsets_ = original
    assert ce_are_gvar(FLEX_COMPUSE)['lungi'] == 1
    # Pe hârtie, la Bold (wght 700 = 0,5 normalizat): căciula lui Ă stă cu punctul ei de jos exact pe vârful lui A (ambele
    # variate), deltele ei nu contează; a lui Â s-a mutat cu (12,5; −7,5) înaintea transformării (opsz e implicit: regiunea
    # intermediară nu contează).
    b, norm = instanta(FLEX_COMPUSE, {'wght': 700})
    assert norm['wght'] == 0.5
    # Numele glifelor fără nume (`post` 3) se fac din nou la citire: componentele se iau din fontul citit.
    gb = b['glyf']
    n_abreve, n_acirc = glifa(b, 0x102), glifa(b, 0xC2)
    n_a, n_breve, n_circ = glifa(b, ord('A')), gb[n_abreve].components[1].glyphName, gb[n_acirc].components[1].glyphName
    ab, brb = gb[n_a].getCoordinates(gb)[0], gb[n_breve].getCoordinates(gb)[0]
    tot = gb[n_abreve].getCoordinates(gb)[0]
    mx, my = ab[varf][0] - brb[jos][0], ab[varf][1] - brb[jos][1]
    assert (mx, my) != (0, 0) and all(tot[len(ab) + k] == (x + mx, y + my) for k, (x, y) in enumerate(brb))
    tot = gb[n_acirc].getCoordinates(gb)[0]
    circ = gb[n_circ].getCoordinates(gb)[0]
    # Transformarea e scrisă în fișier ca F2Dot14 (0,9 devine 14 746 / 16 384).
    q = lambda v: otRound(v * 16384) / 16384
    for k, (x, y) in enumerate(circ):
        px, py = x + deplasare[0] + 12.5, y + deplasare[1] - 7.5
        px, py = px * q(0.9) + py * q(0.0), px * q(0.15) + py * q(0.85)
        assert abs(tot[len(ab) + k][0] - px) < 1e-9 and abs(tot[len(ab) + k][1] - py) < 1e-9, (k, tot[len(ab) + k], (px, py))


def cautari_kern_indici(font):
    t = font['GPOS'].table
    return sorted({i for fr in t.FeatureList.FeatureRecord if fr.FeatureTag == 'kern' for i in fr.Feature.LookupListIndex})


def instanta(cale, coordonate):
    """Instanța fontului la coordonatele date (în unitățile axelor; o axă lipsă: valoarea implicită), făcută de instancer-ul
    lui fontTools, cu toate axele fixate: un font static, ținut în memorie (nesalvat: coordonatele rămân în virgulă mobilă,
    fără rotunjirea scrierii), plus coordonatele normalizate (cu `avar`, apoi la F2Dot14)."""
    f = TTFont(cale)
    axe = {a.axisTag: coordonate.get(a.axisTag, a.defaultValue) for a in f['fvar'].axes}
    norm = AxisLimits(axe).limitAxesAndPopulateDefaults(f).normalize(f)
    return instantiateVariableFont(f, axe), {k: tuple(v)[1] for k, v in norm.items()}


def avans_hvar(f, nume, norm):
    """Avansul din HVAR (cum îl ia aplicația, când fontul îl are): cel implicit plus delta magazinului, rotunjit ca fontTools."""
    hvar = f['HVAR'].table
    idx = hvar.AdvWidthMap.mapping[nume] if hvar.AdvWidthMap else f.getGlyphID(nume)
    return otRound(f['hmtx'][nume][0] + VarStoreInstancer(hvar.VarStore, f['fvar'].axes, norm)[idx])


def unice(text):
    return ''.join(dict.fromkeys(ch for ch in text if ch != ' '))


def date_instanta(inst, avans, text, glife, perechi):
    """Ce se compară la o instanță: metricile, avansul fiecărui caracter (`avans`, după numele glifei), crenarea perechilor
    nenule dintr-un set (și setul) și contururile brute."""
    caractere = [ch for ch in unice(text) if glifa(inst, ord(ch)) is not None]
    set_crenare = ''.join(ch for ch in unice(perechi) if glifa(inst, ord(ch)) is not None)
    hhea = inst['hhea']
    return {
        'metrici': {'urcare': hhea.ascent, 'coborare': hhea.descent, 'spatiuRanduri': hhea.lineGap, 'majuscula': majuscula(inst)},
        'avansuri': {ch: avans(glifa(inst, ord(ch))) for ch in caractere},
        'setCrenare': set_crenare,
        'crenari': {a + b: v for a in set_crenare for b in set_crenare if (v := crenare(inst, glifa(inst, ord(a)), glifa(inst, ord(b))))},
        'glife': {ch: [[[x, y, 1 if pe else 0] for x, y, pe in c] for c in contururi(inst, glifa(inst, ord(ch)))] for ch in unice(glife)
                  if glifa(inst, ord(ch)) is not None},
    }


# Locurile probate pe Roboto Flex, pe lângă instanțele numite: colțurile axelor (fiecare singură, apoi toate odată), `avar`
# (opsz între punctele hărții), un amestec cu regiunile intermediare pornite; lipsă = valoarea implicită.
LOCURI_FLEX = [
    ('implicit', {}),
    ('wght-min', {'wght': 100}), ('wght-max', {'wght': 1000}),
    ('wdth-min', {'wdth': 25}), ('wdth-max', {'wdth': 151}),
    ('opsz-min', {'opsz': 8}), ('opsz-max', {'opsz': 144}),
    ('colt-min', 'min'), ('colt-max', 'max'),
    ('avar-opsz', {'opsz': 30}), ('avar-opsz-wght', {'opsz': 36, 'wght': 650}),
    ('amestec', {'wght': 650, 'wdth': 80, 'opsz': 30, 'GRAD': -50, 'XTRA': 400, 'YTUC': 600, 'YOPQ': 100, 'slnt': -4}),
    # Regiunile intermediare ale subsetului, opsz (0, 1, 1) × wght (0; 0,5; 1), dincolo de vârful lor pe wght (850 = 0,75).
    ('intermediar', {'opsz': 72, 'wght': 850}),
]
# Locurile cu toate contururile (celelalte: H, Ă, ș), și crenarea pe tot setul (celelalte: perechile mici).
LOCURI_TOATE = ('colt-min', 'colt-max', 'avar-opsz-wght', 'amestec', 'intermediar')
CRENARE_MICA = 'AVTWLoa.,'


def variabile():
    """Fixtura instanțelor (ADR 0113): pentru fiecare font variabil al corpusului, axele și instanțele numite (din `fvar`), apoi
    fiecare loc probat (o instanță numită, după indicele ei, sau coordonatele), cu ce dă instancer-ul lui fontTools: contururile,
    crenarea, metricile. Avansul: din HVAR, cu `VarStoreInstancer`, când fontul îl are (ca aplicația, HarfBuzz și FreeType); fără
    el, al instancer-ului, din punctele fantomă. Probele pe hârtie: la implicit, fontul neschimbat; `avar` pe opsz; wght 700 =
    0,5; avansul din HVAR față de cel din punctele fantomă: cel mult 1 unitate (rotunjirile fontului), numărate."""
    rez = {}
    diferente = collections.Counter()
    for cale, locuri, toate in ((FLEX, None, LOCURI_TOATE), (FLEX_FANTOMA, ('Bold', 'colt-max', 'amestec'), ('Bold', 'colt-max', 'amestec')),
                                (FLEX_COMPUSE, ('Bold', 'wdth-min', 'amestec'), ('Bold', 'wdth-min', 'amestec'))):
        f = TTFont(cale)
        fv, nm = f['fvar'], f['name']
        implicite = {a.axisTag: a.defaultValue for a in fv.axes}
        intrare = {
            'axe': [{'tag': a.axisTag, 'min': a.minValue, 'implicit': a.defaultValue, 'max': a.maxValue} for a in fv.axes],
            'instante': [{'stil': nm.getDebugName(i.subfamilyNameID), 'postscript': None if i.postscriptNameID == 0xFFFF else nm.getDebugName(i.postscriptNameID),
                          'implicita': dict(i.coordinates) == implicite, 'coordonate': dict(i.coordinates)} for i in fv.instances],
            'locuri': [],
        }
        lista = [(nm.getDebugName(i.subfamilyNameID), k, dict(i.coordinates)) for k, i in enumerate(fv.instances)]
        lista += [(nume, None, {a.axisTag: (a.minValue if c == 'min' else a.maxValue) for a in fv.axes} if isinstance(c, str) else c)
                  for nume, c in LOCURI_FLEX]
        for nume, k, coord in lista:
            if locuri is not None and nume not in locuri:
                continue
            inst, norm = instanta(cale, coord)
            tot = nume in toate
            hvar = 'HVAR' in f
            # Numele glifelor sunt aceleași în instanță (același `post`, aceeași ordine).
            avans = (lambda g, norm=norm: avans_hvar(f, g, norm)) if hvar else (lambda g, inst=inst: inst['hmtx'][g][0])
            loc = {'nume': nume, 'instanta': k, 'coordonate': None if k is not None else coord,
                   'normalizate': [norm[a.axisTag] for a in fv.axes],
                   **date_instanta(inst, avans, TEXT_FLEX, TEXT_FLEX if tot else 'HĂș', TEXT_FLEX if tot else CRENARE_MICA)}
            if hvar:
                for g in f.getGlyphOrder():
                    d = avans_hvar(f, g, norm) - inst['hmtx'][g][0]
                    assert abs(d) <= 1, (cale, nume, g, d)
                    diferente[d] += 1
            if nume == 'implicit':
                for g in f.getGlyphOrder():
                    assert contururi(inst, g) == contururi(f, g) and inst['hmtx'][g] == f['hmtx'][g], g
            intrare['locuri'].append(loc)
        rez[os.path.relpath(cale, RAD).replace(os.sep, '/')] = intrare
    # Pe hârtie: avar duce opsz 30 (normalizat liniar 16/130) pe segmentul (0, 0)–(0,16925; 0,49200), apoi la F2Dot14; fără
    # avar ar fi fost altă valoare. Bold: wght 700 e la jumătatea dintre 400 și 1000. Grosimea crește avansul lui H.
    locuri = {x['nume']: x for x in rez['test/fixtures/text/roboto-flex-subset.ttf']['locuri']}
    axe = [a['tag'] for a in rez['test/fixtures/text/roboto-flex-subset.ttf']['axe']]
    v = 16 / 130
    pe_harta = otRound(0.49200439453125 * v / 0.16925048828125 * 16384) / 16384
    assert locuri['avar-opsz']['normalizate'][axe.index('opsz')] == pe_harta != otRound(v * 16384) / 16384
    assert locuri['Bold']['normalizate'][axe.index('wght')] == 0.5
    # Dincolo de vârful regiunii intermediare: wght 850 = 0,75 (factorul ei pe wght, 0,5), opsz peste implicit.
    assert locuri['intermediar']['normalizate'][axe.index('wght')] == 0.75 and locuri['intermediar']['normalizate'][axe.index('opsz')] > 0
    h = [locuri[n]['avansuri']['H'] for n in ('Thin', 'Regular', 'Bold', 'ExtraBlack')]
    assert h == sorted(h) and len(set(h)) == 4, h
    # Crenarea variază: „AV” are −87 la Regular, iar la Thin delta lui (+87) o anulează, deci perechea dispare; „To” se strânge.
    assert locuri['Regular']['crenari']['AV'] == -87 and 'AV' not in locuri['Thin']['crenari']
    assert locuri['Thin']['crenari']['To'] != locuri['Regular']['crenari']['To']
    print('avansul din HVAR minus cel din punctele fantomă (glife × locuri):', dict(sorted(diferente.items())))
    return rez


CAZURI = [
    ('LEMN', 'roboto.ttf', {'continut': 'LEMN', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('diacritice', 'roboto.ttf', {'continut': 'ȘȚĂÂÎ șțăâî', 'inaltime': 12, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('crenare', 'roboto.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('spatiere', 'roboto.ttf', {'continut': 'Hamburgefonstiv 0123!?', 'inaltime': 7.5, 'spatiere': 0.3, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('randuri-centru', 'roboto.ttf', {'continut': 'Linia 1\nA doua linie', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1.2, 'aliniere': 'centru'}),
    ('randuri-dreapta', 'roboto.ttf', {'continut': 'dreapta\nRÂND\n\nultim', 'inaltime': 5, 'spatiere': -0.2, 'interlinie': 0.8, 'aliniere': 'dreapta'}),
    ('lipsa', 'roboto.ttf', {'continut': 'A€☃B', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('serif', 'droid-serif.ttf', {'continut': 'Ușă de stejar', 'inaltime': 15, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('serif-crenare', 'droid-serif.ttf', {'continut': 'AVA Ty', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'centru'}),
    ('loca-lunga', 'roboto-loca-lunga.ttf', {'continut': 'LEMN', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    # 7.2↑ (ADR 0106): CFF (Inter, cu subrutine și sugestii; cel scris de mână), crenarea din `kern` și prin Extension, `cmap`.
    ('cff-inter', 'inter-subset.otf', {'continut': 'HAMBURGEFONTSIV\nhamburgefontsiv 0123', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1.1, 'aliniere': 'stanga'}),
    ('cff-inter-crenare', 'inter-subset.otf', {'continut': 'AVATAR To Wa', 'inaltime': 12, 'spatiere': 0.2, 'interlinie': 1, 'aliniere': 'centru'}),
    ('cff-inter-diacritice', 'inter-subset.otf', {'continut': 'ĂÂÎȘȚ ăâîșț', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'dreapta'}),
    ('cff-sintetic', 'cff-sintetic.otf', {'continut': 'HÁR', 'inaltime': 35, 'spatiere': 1, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('kern-ms', 'roboto-kern-ms.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('kern-apple', 'roboto-kern-apple.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('gpos-extension', 'roboto-gpos-ext.ttf', {'continut': 'AVATAR To Wa', 'inaltime': 20, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('cmap12', 'roboto-cmap12.ttf', {'continut': 'ABBA', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('cmap6', 'roboto-cmap6.ttf', {'continut': 'Ana ă', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
    ('simbol', 'roboto-simbol.ttf', {'continut': 'HAMBURG', 'inaltime': 10, 'spatiere': 0, 'interlinie': 1, 'aliniere': 'stanga'}),
]

# Glifele, brute: punctele fiecărui contur (x, y, pe curbă), în unitățile fontului, cum le dă fontTools. Variantele își
# suprapun accentele peste literă, deci așezarea le normalizează: componentele se probează aici, înaintea ei; la fel
# glifele CJK (trăsăturile se suprapun) și cele scrise de mână (o glifă de probă nu e o literă).
BRUTE = [
    ('test/fixtures/text/roboto-compuse.ttf', 'ĂÂÃÄÅ'), ('public/fonturi/roboto.ttf', 'ȘȚĂÂÎșțăâî'), ('public/fonturi/droid-serif.ttf', 'Șț'),
    ('test/fixtures/text/inter-subset.otf', 'HAMBURGEFONTSIVhamburgefontsivĂÂÎȘȚăâîșț0123456789'),
    ('test/fixtures/text/source-han-subset.otf', 'Hあ日本語AVa'),
    ('test/fixtures/text/cff-sintetic.otf', 'AHÁCFSRP\u00b4'),
]


def main():
    os.makedirs(DEST, exist_ok=True)
    variante()
    variante_72()
    variante_74()
    asteptat = {}
    for nume, fisier, p in CAZURI:
        cale = cale_fixtura(fisier)
        font = TTFont(cale)
        rez = aseaza(font, p)
        asteptat[nume] = {'font': os.path.relpath(cale, RAD).replace('\\', '/'), 'parametri': p, 'majuscula': majuscula(font), **rez}
    # Pe hârtie: „LEMN” de 20 mm, fiecare literă de la 0 la 20 (ADR 0019, criteriul din cercetare).
    for g in asteptat['LEMN']['glife']:
        x0, y0, x1, y1 = cutie(g)
        assert abs(y0) < 1e-9 and abs(y1 - 20) < 1e-9, (g['caracter'], y0, y1)
    assert [g['caracter'] for g in asteptat['LEMN']['glife']] == list('LEMN')
    assert asteptat['lipsa']['lipsa'] == 1, asteptat['lipsa']['lipsa']
    assert asteptat['diacritice']['lipsa'] == 0
    # Pe hârtie, în fontul scris de mână: H de 35 mm (majuscula 700), deci 0,05 mm pe unitate; R e un pătrat deschis.
    h = asteptat['cff-sintetic']['glife'][0]
    assert h['caracter'] == 'H' and cutie(h) == (2.5, 0.0, 27.5, 35.0), cutie(h)
    # `cmap` 12 câștigă peste 3/1 („A” rămâne A); `cmap` 6 n-are ă; fontul simbol găsește „H” la U+F048.
    assert glifa(TTFont(os.path.join(DEST, 'roboto-cmap12.ttf')), ord('A')) == 'A'
    assert asteptat['cmap6']['lipsa'] == 1 and asteptat['simbol']['lipsa'] == 0
    # Crenarea chiar lucrează în cazul ei: „AV” e mai strâns decât avansul lui A.
    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
    assert crenare(f, 'A', 'V') < 0, crenare(f, 'A', 'V')
    fs = TTFont(os.path.join(FONTURI, 'droid-serif.ttf'))
    assert crenare(fs, 'A', 'V') < 0, crenare(fs, 'A', 'V')
    brute = {}
    for fisier, sir in BRUTE:
        font = TTFont(os.path.join(RAD, fisier))
        for ch in sir:
            brute[f'{fisier}:{ch}'] = [[[x, y, 1 if pe else 0] for x, y, pe in c] for c in contururi(font, glifa(font, ord(ch)))]
    # Variantele chiar au ce promit: Ă e pusă pe puncte, iar Å e compusă din Ă (deci tot din puncte).
    assert brute['test/fixtures/text/roboto-compuse.ttf:Å'] != brute['public/fonturi/roboto.ttf:Ă']
    # Crenarea fiecărei perechi dintr-un set larg (literele, cifrele, semnele, diacriticele), nenulă, în fiecare font:
    # trece prin perechile anume (formatul 1, cu acoperirea pe liste sau pe intervale), prin clase (formatul 2), prin
    # Extension și prin tabelul `kern` vechi (Microsoft, neordonat, cu override; Apple).
    crenari = {}
    for fisier in ('public/fonturi/roboto.ttf', 'public/fonturi/droid-serif.ttf', 'test/fixtures/text/roboto-crenare.ttf',
                   'test/fixtures/text/roboto-kern-ms.ttf', 'test/fixtures/text/roboto-kern-apple.ttf',
                   'test/fixtures/text/roboto-gpos-ext.ttf', 'test/fixtures/text/inter-subset.otf', 'test/fixtures/text/roboto-kern-si-gpos.ttf'):
        font = TTFont(os.path.join(RAD, fisier))
        sir = ''.join(ch for ch in SET_CRENARE if glifa(font, ord(ch)) is not None)
        perechi = {}
        for a in sir:
            for b in sir:
                v = crenare(font, glifa(font, ord(a)), glifa(font, ord(b)))
                if v:
                    perechi[a + b] = v
        crenari[fisier] = {'set': sir, 'perechi': perechi}
        assert len(perechi) > 100, (fisier, len(perechi))
    assert crenari['test/fixtures/text/roboto-kern-ms.ttf']['perechi']['AV'] == -999
    # Lungimea ruptă: aceeași crenare ca fontul întreg (vezi `variante_72`).
    crenari['test/fixtures/text/roboto-kern-lungime.ttf'] = crenari['test/fixtures/text/roboto-kern-ms.ttf']
    # Structura: fețele colecției și instanțele fontului variabil, cum le citește fontTools.
    col = TTCollection(os.path.join(DEST, 'roboto-droid.ttc'))
    structura = {
        'test/fixtures/text/roboto-droid.ttc': [
            {'familie': f['name'].getDebugName(1), 'complet': f['name'].getDebugName(4), 'postscript': f['name'].getDebugName(6),
             'majuscula': majuscula(f)} for f in col.fonts],
        'test/fixtures/text/roboto-fvar.ttf': [
            {'stil': TTFont(os.path.join(DEST, 'roboto-fvar.ttf'))['name'].getDebugName(i.subfamilyNameID),
             'postscript': TTFont(os.path.join(DEST, 'roboto-fvar.ttf'))['name'].getDebugName(i.postscriptNameID) if i.postscriptNameID != 0xFFFF else None,
             'implicita': i.coordinates['wght'] == 400.0, 'coordonate': dict(i.coordinates)} for i in TTFont(os.path.join(DEST, 'roboto-fvar.ttf'))['fvar'].instances],
    }
    curba = cazuri_pe_curba()
    probe_pe_hartie(curba)
    asteptat = fara_interne(asteptat)
    for nume, date in (('crenari', crenari), ('glife', brute), ('asteptat', asteptat), ('structura', structura), ('pe-curba', fara_interne(curba)),
                       ('variabile', variabile())):
        with open(os.path.join(DEST, f'{nume}.json'), 'w', encoding='utf-8', newline='\n') as out:
            json.dump(date, out, ensure_ascii=False, separators=(',', ':'))
            out.write('\n')
    print(len(asteptat), 'de cazuri,', len(curba), 'pe curbă,', len(brute), 'glife brute')


if __name__ == '__main__':
    main()
