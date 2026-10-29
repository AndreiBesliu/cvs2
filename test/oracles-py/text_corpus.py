"""Corpusul independent al textului (ADR 0105), cu fontTools 4.67 (MIT): ce trebuie să iasă din cititorul de fonturi și din
așezarea literelor ale aplicației, scris din fonturile livrate (`public/fonturi/`) și din variantele lor, făcute aici.

Ce citește fontTools, nu aplicația:
- contururile glifelor: `Glyph.getCoordinates`, cu glifele compuse asamblate de fontTools (transformările, deplasarea
  scalată sau nu, componentele puse pe puncte), apoi pătraticele desfăcute cu `decomposeQuadraticSegment` (punctele de pe
  curbă subînțelese) și pornite din primul punct de pe curbă, ca în `Glyph.draw`;
- avansurile (`hmtx`), harta caracterelor (`getBestCmap`), urcarea și coborârea (`hhea`), înălțimea majusculei (`OS/2`);
- crenarea: perechile caracteristicii `kern` din `GPOS`, din obiectele tabelelor fontTools (formatul 1, perechi anume;
  formatul 2, clase), scrisă aici din specificație, nu din codul aplicației.

Regulile așezării (ADR 0105 §2) sunt scrise din nou, aici: înălțimea majusculei dă scara (u · h / majuscula), crenarea și
spațierea doar între două litere ale aceluiași rând, alinierea față de x = 0, rândurile coborând cu interlinie × înălțimea
rândului. Pătratica (p0, q, p2) devine cubica (p0 + 2/3 (q − p0), p2 + 2/3 (q − p2)).

Pe hârtie, verificate aici: „LEMN” de 20 mm are fiecare literă înaltă de exact 20 mm (de la 0 la 20); majuscula fiecărui
font e chiar vârful lui H; variantele au ce promit (loca lungă, componentele pe puncte, deplasarea scalată, 2 × 2, o glifă
compusă din alta compusă).

Rulare: `.tmp/venv-export2d/Scripts/python.exe -X utf8 test/oracles-py/text_corpus.py` (scrie `test/fixtures/text/`).
"""
import array
import json
import os
import sys

from fontTools.pens.basePen import decomposeQuadraticSegment
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import _l_o_c_a
from fontTools.ttLib.tables._g_l_y_f import GlyphComponent

RAD = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONTURI = os.path.join(RAD, 'public', 'fonturi')
DEST = os.path.join(RAD, 'test', 'fixtures', 'text')

ARGS_ARE_XY_VALUES = 0x0002
SCALED_COMPONENT_OFFSET = 0x0800


def contururi(font, nume):
    glyf = font['glyf']
    coord, capete, steaguri = glyf[nume].getCoordinates(glyf)
    rez, start = [], 0
    for capat in capete:
        rez.append([(coord[i][0], coord[i][1], bool(steaguri[i] & 1)) for i in range(start, capat + 1)])
        start = capat + 1
    return rez


def segmente(puncte):
    """Startul și segmentele conturului (în unitățile fontului): ('L', p) sau ('Q', q, p), ca în Glyph.draw."""
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


def crenare(font, a, b):
    """XAdvance al primei glife, din căutările de perechi ale caracteristicii `kern` (primul subtabel care potrivește)."""
    if 'GPOS' not in font:
        return 0
    t = font['GPOS'].table
    indici = sorted({i for fr in t.FeatureList.FeatureRecord if fr.FeatureTag == 'kern' for i in fr.Feature.LookupListIndex})
    total = 0
    for i in indici:
        lookup = t.LookupList.Lookup[i]
        if lookup.LookupType != 2:
            continue
        for st in lookup.SubTable:
            if a not in st.Coverage.glyphs:
                continue
            if st.Format == 1:
                pset = st.PairSet[st.Coverage.glyphs.index(a)]
                gasit = [r for r in pset.PairValueRecord if r.SecondGlyph == b]
                if not gasit:
                    continue
                v = gasit[0].Value1
            else:
                c1 = st.ClassDef1.classDefs.get(a, 0)
                c2 = st.ClassDef2.classDefs.get(b, 0)
                if c1 >= st.Class1Count or c2 >= st.Class2Count:
                    continue
                v = st.Class1Record[c1].Class2Record[c2].Value1
            total += getattr(v, 'XAdvance', 0) or 0 if v is not None else 0
            break
    return total


def majuscula(font):
    cap = font['OS/2'].sCapHeight
    h = font.getBestCmap()[ord('H')]
    varf = max(p[1] for c in contururi(font, h) for p in c)
    assert abs(cap - varf) <= 2, (cap, varf)
    return cap


def aseaza(font, p):
    cap = majuscula(font)
    h = p['inaltime']
    mm = lambda u: (u * h) / cap
    hhea = font['hhea']
    rand_mm = mm(hhea.ascent - hhea.descent + hhea.lineGap) * p['interlinie']
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    glife, lipsa = [], 0
    for r, rand in enumerate(p['continut'].replace('\r', '').split('\n')):
        litere, x, ant = [], 0.0, None
        for ch in rand:
            if ord(ch) < 0x20 and ch != '\t':
                continue
            g = cmap.get(0x20 if ch == '\t' else ord(ch))
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
                start, segs = segmente(c)
                out = []
                for s in segs:
                    if s[0] == 'L':
                        out.append(['L'] + harta(s[2]))
                    else:
                        _, p0, q, p2 = s
                        c1 = (p0[0] + 2 * (q[0] - p0[0]) / 3, p0[1] + 2 * (q[1] - p0[1]) / 3)
                        c2 = (p2[0] + 2 * (q[0] - p2[0]) / 3, p2[1] + 2 * (q[1] - p2[1]) / 3)
                        out.append(['C'] + harta(c1) + harta(c2) + harta(p2))
                cs.append({'start': harta(start), 'segmente': out})
            if cs:
                glife.append({'caracter': ch, 'rand': r, 'contururi': cs})
    return {'glife': glife, 'lipsa': lipsa}


def cutie(glifa):
    xs, ys = [], []
    for c in glifa['contururi']:
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

    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
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

    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
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

    # Majuscula mincinoasă: sCapHeight departe de vârful lui H (refuzată de aplicație).
    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
    f['OS/2'].sCapHeight = 1300
    f.save(os.path.join(DEST, 'roboto-majuscula-gresita.ttf'))

    # Crenarea în care primul subtabel care potrivește câștigă: clasa 0 / 0 a subtabelului pe clase primește 777, deci o
    # pereche anume (din formatul 1, înaintea lui) care are și clase 0 / 0 trebuie să-și păstreze valoarea, nu să adune.
    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
    kern = f['GPOS'].table.LookupList.Lookup[0]
    clase = [st for st in kern.SubTable if st.Format == 2][0]
    clase.Class1Record[0].Class2Record[0].Value1.XAdvance = 777
    f.save(os.path.join(DEST, 'roboto-crenare.ttf'))
    g = TTFont(os.path.join(DEST, 'roboto-crenare.ttf'))
    assert crenare(g, 'quotedbl', 'A') == crenare(f, 'quotedbl', 'A') == -120

    # O glifă compusă care se conține pe sine (Ă = A + Ă): aplicația o sare și o numără, restul textului rămâne.
    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
    f.recalcBBoxes = False
    f['glyf']['Abreve'].components[1].glyphName = 'Abreve'
    f.save(os.path.join(DEST, 'roboto-ciclu.ttf'))

    # Un OpenType cu contururi CFF (Inter, OFL-1.1, din JetBrains Runtime-ul lui Android Studio): refuzat deocamdată.
    inter = 'C:/Program Files/Android/Android Studio/jbr/lib/fonts/Inter-Regular.otf'
    if os.path.exists(inter):
        from fontTools import subset
        opt = subset.Options()
        opt.name_IDs = ['*']
        s = subset.Subsetter(options=opt)
        s.populate(text='AB')
        f = TTFont(inter)
        s.subset(f)
        f.save(os.path.join(DEST, 'inter-cff.otf'))
    assert TTFont(os.path.join(DEST, 'inter-cff.otf')).sfntVersion == 'OTTO'


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
]

# Glifele compuse, brute: punctele fiecărui contur (x, y, pe curbă), în unitățile fontului, cum le asamblează fontTools.
# Variantele își suprapun accentele peste literă, deci așezarea le normalizează: componentele se probează aici, înaintea ei.
BRUTE = [('test/fixtures/text/roboto-compuse.ttf', 'ĂÂÃÄÅ'), ('public/fonturi/roboto.ttf', 'ȘȚĂÂÎșțăâî'), ('public/fonturi/droid-serif.ttf', 'Șț')]


def main():
    os.makedirs(DEST, exist_ok=True)
    variante()
    asteptat = {}
    for nume, fisier, p in CAZURI:
        cale = os.path.join(FONTURI if os.path.exists(os.path.join(FONTURI, fisier)) else DEST, fisier)
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
    # Crenarea chiar lucrează în cazul ei: „AV” e mai strâns decât avansul lui A.
    f = TTFont(os.path.join(FONTURI, 'roboto.ttf'))
    assert crenare(f, 'A', 'V') < 0, crenare(f, 'A', 'V')
    fs = TTFont(os.path.join(FONTURI, 'droid-serif.ttf'))
    assert crenare(fs, 'A', 'V') < 0, crenare(fs, 'A', 'V')
    brute = {}
    for fisier, sir in BRUTE:
        font = TTFont(os.path.join(RAD, fisier))
        cmap = font.getBestCmap()
        for ch in sir:
            brute[f'{fisier}:{ch}'] = [[[x, y, 1 if pe else 0] for x, y, pe in c] for c in contururi(font, cmap[ord(ch)])]
    # Variantele chiar au ce promit: Ă e pusă pe puncte, iar Å e compusă din Ă (deci tot din puncte).
    assert brute['test/fixtures/text/roboto-compuse.ttf:Å'] != brute['public/fonturi/roboto.ttf:Ă']
    # Crenarea fiecărei perechi dintr-un set larg (literele, cifrele, semnele, diacriticele), nenulă, în ambele fonturi:
    # trece prin perechile anume (formatul 1, cu acoperirea pe liste sau pe intervale) și prin clase (formatul 2).
    SET = ''.join(chr(c) for c in range(0x21, 0x7f)) + 'ĂÂÎȘȚăâîșțÄÖÜäöüéèàçñ'
    crenari = {}
    for fisier in ('public/fonturi/roboto.ttf', 'public/fonturi/droid-serif.ttf', 'test/fixtures/text/roboto-crenare.ttf'):
        font = TTFont(os.path.join(RAD, fisier))
        cmap = font.getBestCmap()
        perechi = {}
        for a in SET:
            for b in SET:
                v = crenare(font, cmap[ord(a)], cmap[ord(b)])
                if v:
                    perechi[a + b] = v
        crenari[fisier] = {'set': SET, 'perechi': perechi}
        assert len(perechi) > 100, (fisier, len(perechi))
    with open(os.path.join(DEST, 'crenari.json'), 'w', encoding='utf-8', newline='\n') as out:
        json.dump(crenari, out, ensure_ascii=False, separators=(',', ':'))
        out.write('\n')
    with open(os.path.join(DEST, 'glife.json'), 'w', encoding='utf-8', newline='\n') as out:
        json.dump(brute, out, ensure_ascii=False, separators=(',', ':'))
        out.write('\n')
    with open(os.path.join(DEST, 'asteptat.json'), 'w', encoding='utf-8', newline='\n') as out:
        json.dump(asteptat, out, ensure_ascii=False, separators=(',', ':'))
        out.write('\n')
    print(len(asteptat), 'de cazuri')


if __name__ == '__main__':
    main()
