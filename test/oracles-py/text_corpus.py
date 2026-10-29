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

Rulare: `.tmp/venv-export2d/Scripts/python.exe -X utf8 test/oracles-py/text_corpus.py` (scrie `test/fixtures/text/`).
"""
import array
import json
import os
import struct
import sys

from fontTools import subset
from fontTools.cffLib import GlobalSubrsIndex, SubrsIndex
from fontTools.cffLib.CFFToCFF2 import convertCFFToCFF2
from fontTools.encodings.StandardEncoding import StandardEncoding
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.psCharStrings import T2CharString
from fontTools.pens.basePen import decomposeQuadraticSegment
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTCollection, TTFont, newTable
from fontTools.ttLib.tables import _l_o_c_a, otTables
from fontTools.ttLib.tables._c_m_a_p import CmapSubtable
from fontTools.ttLib.tables._f_v_a_r import Axis, NamedInstance
from fontTools.ttLib.tables._g_l_y_f import GlyphComponent
from fontTools.ttLib.tables._k_e_r_n import KernTable_format_0

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
    glife, lipsa = [], 0
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
        baza = -r * rand_mm
        for ch, g, x0 in litere:
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
                glife.append({'caracter': ch, 'rand': r, 'contururi': cs})
    return {'glife': glife, 'lipsa': lipsa}


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
             'implicita': i.coordinates['wght'] == 400.0} for i in TTFont(os.path.join(DEST, 'roboto-fvar.ttf'))['fvar'].instances],
    }
    for nume, date in (('crenari', crenari), ('glife', brute), ('asteptat', asteptat), ('structura', structura)):
        with open(os.path.join(DEST, f'{nume}.json'), 'w', encoding='utf-8', newline='\n') as out:
            json.dump(date, out, ensure_ascii=False, separators=(',', ':'))
            out.write('\n')
    print(len(asteptat), 'de cazuri,', len(brute), 'glife brute')


if __name__ == '__main__':
    main()
