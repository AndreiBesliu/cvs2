# Lista de otrăvuri a feliei 7.5↑ (aldinul și cursivul sintetic, ADR 0123), 02.11.2026: așezarea (cursivul, miezul aldinului,
# avansul, mutarea literei, rândurile, coborârea, memoria literelor îngroșate, literele refuzate), fațada offsetului
# (`offsetFigura`), blocul textului (marginile, raportul față de înălțime, scalarea), previzualizarea (arcele) și panoul
# (valorile propuse, refuzurile, blocul încărcat). Alese de autor. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md),
# din worktree-ul feliei (în afara Drive-ului), după commit. Setul „e2e” (panoul) a rulat cu un harnaș local pe portul
# worktree-ului (4174): unealta cere `npm`, stricat în Git Bash pe mașina asta.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ASE = 'src/text/asezare.ts'
OFF = 'src/geom/offset.ts'
BLC = 'src/model/blocText.ts'
CAL = 'src/app/caleText.ts'
PAN = 'src/app/PanouText.tsx'

# ---- Cursivul ----
o('C01', ASE, 'Math.tan((p.cursiv ?? 0) * (Math.PI / 180))', 'Math.tan((p.cursiv ?? 0) * (Math.PI / 360))', 'text', 'unghiul cursivului înjumătățit')
o('C02', ASE, 'x: ox + inMm(q.x) + panta * inMm(q.y), y: oy', 'x: ox + inMm(q.x) - panta * inMm(q.y), y: oy', 'text', 'cursivul înclină pe partea cealaltă')
o('C03', ASE, 'x: ox + inMm(q.x) + panta * inMm(q.y), y: oy', 'x: ox + inMm(q.x) + panta * (oy + inMm(q.y)), y: oy', 'text',
  'înclinarea față de linia de bază a primului rând (rândurile de jos se mută)')
o('C04', ASE, 'const harta = panta === 0', 'const harta = panta !== 0', 'text', 'cursivul nu se mai aplică')

# ---- Aldinul: miezul, avansul, mutarea, rândurile ----
o('A01', ASE, 'const miez = p.inaltime - 2 * d;', 'const miez = p.inaltime - d;', 'text', 'miezul scade doar cu d: H iese de h + d')
o('A02', ASE, 'const miez = p.inaltime - 2 * d;', 'const miez = p.inaltime;', 'text', 'fără miez: H iese de h + 2d')
o('A03', ASE, 'const avans = inMm(font.avans(glifa)) + 2 * d;', 'const avans = inMm(font.avans(glifa)) + d;', 'text', 'avansul crește doar cu d (literele se apropie)')
o('A04', ASE, 'const mx = x0 + d, my = baza + d;', 'const mx = x0, my = baza + d;', 'text', 'litera nu se mută la dreapta cu d')
o('A05', ASE, 'const mx = x0 + d, my = baza + d;', 'const mx = x0 + d, my = baza;', 'text', 'litera nu urcă cu d (baza sub linie)')
o('A06', ASE, '* p.inaltime) / font.majuscula * p.interlinie;', '* miez) / font.majuscula * p.interlinie;', 'text', 'rândurile la distanța miezului')
o('A07', ASE, 'coborare: inMm(font.coborare) } };', 'coborare: (font.coborare * p.inaltime) / font.majuscula } };', 'text',
  'coborârea înălțimii cerute, nu a miezului')
o('A08', ASE, 'const ox = d > 0 ? 0 : x0, oy = d > 0 ? 0 : baza;', 'const ox = x0, oy = baza;', 'text', 'litera îngroșată desenată pe loc și mutată încă o dată')
o('A09', ASE, 'const cheie = `${d}|${JSON.stringify(cai)}`;', 'const cheie = JSON.stringify(cai);', 'text', 'memoria nu ține cont de îngroșare')
o('A10', ASE, "        raport['aldin-esuat']++;\n", '', 'text', 'litera refuzată nu se numără')
o('A11', ASE, 'if (d === 0) {', 'if (d < 0.5) {', 'text', 'aldinul sub 0,5 mm nu se aplică')
o('A12', ASE, 'const r = offsetFigura(contururi, d);', 'const r = offsetFigura(contururi, -d);', 'text', 'aldinul subțiază literele')

# ---- Fațada: offsetFigura ----
o('F01', OFF, 'return adancime % 2 === 0 ? c : inverseaza(c);', 'return c;', 'figura', 'golurile nu se întorc: toate contururile trigonometrice')
o('F02', OFF, 'curate.push(inSensTrigonometric(r.contur));', 'curate.push(r.contur);', 'figura', 'sensul contururilor rămâne cum vine')
o('F03', OFF, 'const adancime = curate.filter((alt, j) => j !== i && inRegiune(p, [alt])).length;',
  'const adancime = curate.filter((alt, j) => j !== i && inRegiune(p, [alt])).length > 0 ? 1 : 0;', 'figura', 'insula din gol citită ca gol')
o('F04', OFF, 'if (!r.ok || d < 0) return r;', 'if (!r.ok) return r;', 'figura', 'garda bucății pierdute judecă și offsetul spre interior')
o('F05', OFF, '  if (Math.abs(distanta) < DISTANTA_MINIMA) return { ok: false, motiv: `distanța ${distanta} mm e sub rezoluția declarată (${REZOLUTIE} mm)` };\n  try {\n    const curate',
  '  try {\n    const curate', 'figura', 'distanța sub rezoluție trece')

# ---- Blocul ----
o('B01', BLC, 'numar(LIMITE_TEXT.aldinMinim, LIMITE_TEXT.inaltimeMaxima * LIMITE_TEXT.aldinRaport)', 'numar(0, LIMITE_TEXT.inaltimeMaxima * LIMITE_TEXT.aldinRaport)',
  'text', 'o îngroșare sub rezoluție trece de ușa blocului')
o('B02', BLC, 'b.aldin === undefined || b.aldin <= aldinMaxim(b.inaltime)', 'b.aldin === undefined || b.aldin <= 1e9', 'text', 'raportul față de înălțime nu se judecă')
o('B03', BLC, 'inaltime * LIMITE_TEXT.aldinRaport + 1e-9', 'inaltime * LIMITE_TEXT.aldinRaport + 0.05', 'text', 'toleranța raportului, prea largă')
o('B04', BLC, 'aldinMinim: 0.01, aldinRaport: 0.2, cursiv: 45,', 'aldinMinim: 0.01, aldinRaport: 0.25, cursiv: 45,', 'text', 'o pătrime din înălțime')
o('B05', BLC, 'aldinMinim: 0.01, aldinRaport: 0.2, cursiv: 45,', 'aldinMinim: 0.01, aldinRaport: 0.2, cursiv: 60,', 'text', 'cursivul până la 60°')
o('B06', BLC, 'const aldin = b.aldin === undefined ? undefined : b.aldin * s;', 'const aldin = b.aldin;', 'text', 'scalarea nu crește îngroșarea')
o('B07', BLC, '(aldin < LIMITE_TEXT.aldinMinim || aldin > aldinMaxim(inaltime))) return fara;', '(aldin > aldinMaxim(inaltime))) return fara;', 'text',
  'după scalare, o îngroșare sub rezoluție rămâne în bloc')
o('B08', BLC, '...(aldin !== undefined ? { aldin } : {}), ...(curba', '...(curba', 'text', 'blocul scalat își păstrează îngroșarea veche')

# ---- Previzualizarea ----
o('V01', CAL, '${b > 0 ? 0 : 1}', '${b > 0 ? 1 : 0}', 'text', 'arcele desenate pe partea cealaltă')
o('V02', CAL, 'Math.abs(b) > 1 ? 1 : 0', 'Math.abs(b) >= 1 ? 1 : 0', 'text', 'semicercul desenat ca arc mare')
o('V03', CAL, '(1 + b * b)) / (4 * Math.abs(b))', '(1 + b * b)) / (2 * Math.abs(b))', 'text', 'raza dublă')

# ---- Panoul (e2e) ----
o('P01', PAN, 'Math.round(h * 3) / 100', 'Math.round(h * 5) / 100', 'e2e', 'aldinul propune 5 % din înălțime')
o('P02', PAN, '(aldin < LIMITE_TEXT.aldinMinim || aldin > aldinMaxim(inaltime))', '(aldin < LIMITE_TEXT.aldinMinim)', 'e2e',
  'o îngroșare peste o cincime din înălțime trece din panou')
o('P03', PAN, 'Math.abs(cursiv) > LIMITE_TEXT.cursiv) return', 'Math.abs(cursiv) > 90) return', 'e2e', 'o înclinare de 50° trece din panou')
o('P04', PAN, 'aldin: !!b.aldin, ', 'aldin: false, ', 'e2e', 'textul ales nu-și aduce aldinul în panou')
o('P05', PAN, '...(aldin > 0 ? { aldin } : {}), ', '', 'e2e', 'blocul nu ține aldinul')
o('P06', PAN, "aldin: false, grosime: '', cursiv: false, unghi: '12',", "aldin: false, grosime: '', cursiv: false, unghi: '15',", 'e2e', 'cursivul propune 15°')

SETURI = {
    'text': ['test/unit/text.aldin.test.ts', 'test/unit/text.corpus.test.ts'],
    'text2': ['test/unit/text.aldin.test.ts', 'test/unit/text.corpus.test.ts', 'test/unit/text.piesa.test.ts', 'test/unit/text.actiune.test.ts',
              'test/unit/text.curba.test.ts', 'test/unit/geom.offset.figura.test.ts'],
    'figura': ['test/unit/geom.offset.figura.test.ts'],
    'figura2': ['test/unit/geom.offset.figura.test.ts', 'test/unit/text.aldin.test.ts', 'test/unit/geom.offset.regiune.test.ts'],
}
E2E = ['test/e2e/text.spec.ts']
