# Lista de otrăvuri a feliei 7.9↑ (textul: mărimea în pt și inch, proporțiile literelor, crenarea oprită, mânerele; ADR
# 0138), 06.11.2026, alese de autor: așezarea (majuscula tăiată, raportul lățime / înălțime, harta literelor, cursivul,
# crenarea, avansurile, rândurile, coloanele și golurile textului vertical, celula goală, majuscula spusă), blocul (aldinul pe
# majuscula tăiată, scalarea neuniformă: lățimea, spațierea, cursivul, curba, caseta, mărimea), unitățile (pt ca mărimea
# fontului, punctul tipografic, inch înapoi, rotunjirea) și patru legături din panou (unitatea în bloc, valoarea exactă,
# crenarea textului ales, curba după majuscula tăiată).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AS = 'src/text/asezare.ts'
BT = 'src/model/blocText.ts'
MR = 'src/text/marime.ts'
PT = 'src/app/PanouText.tsx'

# Așezarea.
o('A01', AS, '  const majuscula = p.inaltime * sy;', '  const majuscula = p.inaltime;', 'text',
  'înălțimea literelor nu schimbă majuscula tăiată')
o('A02', AS, '  const miezX = sx === sy ? miez : miez * (sx / sy);', '  const miezX = sx === sy ? miez : miez * sx;', 'text',
  'pe orizontală, lățimea nu se mai împarte la înălțime')
o('A03', AS, '    ? (q: P): Punct => ({ x: ox + inMmX(q.x), y: oy + inMm(q.y) })', '    ? (q: P): Punct => ({ x: ox + inMm(q.x), y: oy + inMm(q.y) })',
  'text', 'contururile literelor drepte nu primesc lățimea')
o('A04', AS, '    : (q: P): Punct => ({ x: ox + inMmX(q.x) + panta * inMm(q.y), y: oy + inMm(q.y) }));',
  '    : (q: P): Punct => ({ x: ox + inMmX(q.x) + panta * inMmX(q.y), y: oy + inMm(q.y) }));', 'text',
  'cursivul înclină cu scara orizontală (unghiul se schimbă cu lățimea)')
o('A05', AS, '(p.crenare === false ? 0 : inMmX(font.crenare(anterioara, glifa)))', 'inMmX(font.crenare(anterioara, glifa))', 'text',
  'crenarea oprită e ignorată')
o('A06', AS, '(p.crenare === false ? 0 : inMmX(font.crenare(anterioara, glifa)))', '(p.crenare === false ? 0 : inMm(font.crenare(anterioara, glifa)))',
  'text', 'crenarea nu primește lățimea literelor')
o('A07', AS, 'p.spatiere;\n        const avans = inMmX(font.avans(glifa)) + 2 * d;', 'p.spatiere;\n        const avans = inMm(font.avans(glifa)) + 2 * d;',
  'text', 'avansurile rândurilor nu primesc lățimea')
o('A08', AS, '  const inaltimeRand = (linieFont * majuscula) / font.majuscula * p.interlinie;',
  '  const inaltimeRand = (linieFont * p.inaltime) / font.majuscula * p.interlinie;', 'text', 'rândurile nu urmează înălțimea literelor')
o('A09', AS, '  const distantaColoane = (linieFont * (p.inaltime * sx)) / font.majuscula * p.interlinie;',
  '  const distantaColoane = (linieFont * majuscula) / font.majuscula * p.interlinie;', 'text',
  'coloanele textului vertical urmează înălțimea literelor, nu lățimea')
o('A10', AS, '    const em = (font.unitsPerEm * majuscula) / font.majuscula;', '    const em = (font.unitsPerEm * p.inaltime) / font.majuscula;', 'text',
  'golul dintre literele unei coloane nu urmează înălțimea literelor')
o('A11', AS, '        const sus = c.cutie ? c.cutie.maxY : majuscula;', '        const sus = c.cutie ? c.cutie.maxY : p.inaltime;', 'text',
  'celula goală (spațiul) a textului vertical ține locul majusculei de 100 %')
o('A12', AS, '    linie: font.linie, inaltime: p.inaltime, majuscula,', '    linie: font.linie, inaltime: p.inaltime, majuscula: p.inaltime,', 'text',
  'așezarea spune majuscula de la 100 % (curba o folosește)')
# Blocul și mânerele.
o('B01', BT, '  (b.proportii ? b.inaltime * (b.proportii.inaltime / 100) : b.inaltime);', '  (b.inaltime);', 'bloc',
  'aldinul se măsoară pe mărime, nu pe majuscula tăiată')
o('B02', BT, '  const latime = pr.latime * r;', '  const latime = pr.latime / r;', 'bloc', 'mânerele: lățimea literelor se schimbă invers')
o('B03', BT, 'spatiere: b.spatiere * (b.vertical ? ly : lx),', 'spatiere: b.spatiere * lx,', 'bloc',
  'mânerele: spațierea textului vertical crește cu lățimea')
o('B04', BT, 'Math.tan(b.cursiv * (Math.PI / 180)) * r)', 'Math.tan(b.cursiv * (Math.PI / 180)))', 'bloc', 'mânerele: cursivul își păstrează unghiul')
o('B05', BT, '  if (b.curba || (b.aldin ?? 0) > 0) return fara;', '  if ((b.aldin ?? 0) > 0) return fara;', 'bloc',
  'mânerele: un text pe curbă rămâne text')
o('B06', BT, '    : { ...b.caseta, latime: b.caseta.latime * lx, inaltime: b.caseta.inaltime * ly });',
  '    : { ...b.caseta, latime: b.caseta.latime * ly, inaltime: b.caseta.inaltime * lx });', 'bloc', 'mânerele: caseta scalată pe axele întoarse')
o('B07', BT, '    ...rest, inaltime: b.inaltime * ly,', '    ...rest, inaltime: b.inaltime * lx,', 'bloc', 'mânerele: mărimea crește cu lățimea')
o('B08', BT, 'b.aldin <= aldinMaxim(majusculaBloc(b))', 'b.aldin <= aldinMaxim(b.inaltime)', 'bloc', 'ușa blocului: aldinul pe mărime')
# Unitățile.
o('M01', MR, 'valoare * MM_PE_PUNCT * raport;', 'valoare * MM_PE_PUNCT;', 'text', 'pt e majuscula în puncte, nu mărimea fontului')
o('M02', MR, 'const MM_PE_PUNCT = MM_PE_INCH / 72;', 'const MM_PE_PUNCT = MM_PE_INCH / 72.27;', 'text', 'punctul TeX în locul celui tipografic')
o('M03', MR, '  return unitate === \'in\' ? mm / MM_PE_INCH : mm / (MM_PE_PUNCT * raport);',
  '  return unitate === \'in\' ? mm * MM_PE_INCH : mm / (MM_PE_PUNCT * raport);', 'text', 'din mm în inch, greșit')
o('M04', MR, "  const k = unitate === 'pt' ? 100 : 10_000;", "  const k = unitate === 'pt' ? 10 : 10_000;", 'text', 'punctele arătate la zecime')
# Panoul (e2e).
o('U01', PT, "...(f.unitate !== 'mm' ? { unitate: f.unitate } : {}), ", '', 'e2e', 'unitatea nu intră în bloc')
o('U02', PT, '    : exacta && exacta.text === f.inaltime && exacta.unitate === f.unitate ? exacta.mm : majusculaDinMarime(scrisa, f.unitate, raport ?? 1);',
  '    : majusculaDinMarime(scrisa, f.unitate, raport ?? 1);', 'e2e', 'mărimea arătată după o conversie se rotunjește în bloc')
o('U03', PT, 'crenare: b.crenare !== false,', 'crenare: true,', 'e2e', 'textul ales nu-și aduce crenarea oprită')
o('U04', PT, 'dreptul.majuscula, p.aliniere', 'p.inaltime, p.aliniere', 'e2e', 'pe curbă, panoul așază după mărime, nu după majuscula tăiată')

SETURI = {
    'text': ['test/unit/text.proportii.test.ts', 'test/unit/text.corpus.test.ts'],
    'text2': ['test/unit/text.proportii.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.caseta.test.ts', 'test/unit/text.aldin.test.ts',
              'test/unit/text.vertical.test.ts', 'test/unit/text.curba.test.ts', 'test/unit/text.piesa.test.ts'],
    'bloc': ['test/unit/text.proportii.test.ts', 'test/unit/text.piesa.test.ts'],
    'bloc2': ['test/unit/text.proportii.test.ts', 'test/unit/text.piesa.test.ts', 'test/unit/text.aldin.test.ts', 'test/unit/text.caseta.test.ts',
              'test/unit/transformare.test.ts'],
}
E2E = ['test/e2e/text.spec.ts']
