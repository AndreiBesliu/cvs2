# Lista de otrăvuri a feliei 7.8↑ (încadrarea textului în casetă, ADR 0142), 03.11.2026: modurile (limitat: cel mult înălțimea
# cerută; scalat), măsura (lățimea și înălțimea, marginile afine), marginea de jos a căutării (aldinul), refuzul, cutia literei
# (aldină, verticală, pe curbă), blocul (curba, scalarea casetei, plafonul ei) și panoul (curba lăsată deoparte, blocul cu
# caseta și înălțimea care a încăput, câmpul oprit, textul ales, nota, Adaugă oprit). Alese de autor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit; setul
# „e2e”, cu harnașul local pe portul worktree-ului (4174).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ASE = 'src/text/asezare.ts'
CUR = 'src/text/peCurba.ts'
BLO = 'src/model/blocText.ts'
PAN = 'src/app/PanouText.tsx'

# ---- Încadrarea ----
o('C01', ASE, 'return x1 - x0 <= caseta.latime && y1 - y0 <= caseta.inaltime;', 'return x1 - x0 <= caseta.latime;', 'cas',
  'înălțimea casetei ignorată')
o('C02', ASE, 'y0 = Math.min(y0, c.minY + (e.minY - c.minY) * u);', 'y0 = Math.min(y0, c.minY);', 'cas',
  'marginea de jos luată de la prima măsurare (rândurile nu cresc)')
o('C03', ASE, 'let jos = Math.max(LIMITE_TEXT.inaltimeMinima, d / LIMITE_TEXT.aldinRaport), sus = sus0;',
  'let jos = LIMITE_TEXT.inaltimeMinima, sus = sus0;', 'cas', 'aldinul nu ridică marginea de jos a căutării')
# C04 (fără scurtătura „cea cerută încape: ea”) a scăpat: echivalentă în practică, fiindcă înjumătățirea, cu toate mijloacele
# încăpând, ajunge chiar la înălțimea cerută; scurtătura rămâne (o sută de așezări mai puțin), fără mutație.
o('C05', ASE, "const sus0 = caseta.fel === 'limita' ? Math.min(caseta.ceruta, LIMITE_TEXT.inaltimeMaxima) : LIMITE_TEXT.inaltimeMaxima;",
  'const sus0 = LIMITE_TEXT.inaltimeMaxima;', 'cas', 'limitat de casetă crește ca scalat')
o('C06', ASE, 'if (h !== null) return aseaza(font, { ...p, inaltime: h }, false);', 'if (h !== null) return aseaza(font, p, false);', 'cas',
  'înălțimea găsită nu se folosește')
o('C07', ASE, "return { ...r, raport: { ...r.raport, 'caseta-prea-mica': 1 } };", 'return r;', 'cas', 'caseta prea mică nu se spune')
o('C08', ASE, 'maxX: c.maxX + 2 * d + x0, maxY: c.maxY + 2 * d + baza', 'maxX: c.maxX + x0, maxY: c.maxY + baza', 'cas',
  'cutia literei aldine, a miezului')
o('C09', ASE, 'const cutie = { minX: c.cutie.minX + tx, minY: c.cutie.minY + ty, maxX: c.cutie.maxX + tx, maxY: c.cutie.maxY + ty };',
  'const cutie = c.cutie;', 'cas', 'cutia literei verticale rămâne în sistemul ei')
o('C10', CUR, 'return { ...g, cai, cutie: cai.map(cutieContur).reduce(uneste) };', 'return { ...g, cai };', 'cas',
  'pe curbă, cutia rămâne a rândului drept')

# ---- Blocul ----
o('B01', BLO, "v.check((b) => !(b.caseta && b.curba), 'textul în casetă nu stă pe o curbă'),", "v.check(() => true, 'textul în casetă nu stă pe o curbă'),",
  'cas', 'blocul în casetă primit pe o curbă')
o('B02', BLO, '? { ...b.caseta, latime: b.caseta.latime * s, inaltime: b.caseta.inaltime * s, ceruta: b.caseta.ceruta * s }',
  '? { ...b.caseta, latime: b.caseta.latime, inaltime: b.caseta.inaltime * s, ceruta: b.caseta.ceruta * s }', 'cas', 'lățimea casetei nu crește cu textul')
o('B03', BLO, 'if (caseta && !v.safeParse(SchemaCasetaText, caseta).success) return fara;', '', 'cas', 'caseta scalată peste plafon, păstrată')

# ---- Panoul (e2e) ----
o('P01', PAN, "const curbaActiva = drept || form.textVertical || form.caseta !== 'fara' ? null : curbaPosibila;",
  'const curbaActiva = drept || form.textVertical ? null : curbaPosibila;', 'e2e', 'textul în casetă pus pe curbă')
o('P02', PAN, '...(caseta ? { caseta } : {}),', '...({}),', 'e2e', 'blocul nu primește caseta')
o('P03', PAN, "{c === 'inaltime' && form.caseta === 'scala'\n", "{false\n", 'e2e', 'scalat la casetă, câmpul înălțimii rămâne de scris')
o('P04', PAN, '(q.caseta ? { ...q, inaltime: a.inaltime } : q)', '(q)', 'e2e', 'blocul ține înălțimea scrisă, nu pe cea care a încăput')
o('P05', PAN, "...(b.caseta?.fel === 'limita' ? { inaltime: textNumar(b.caseta.ceruta) } : {}),", '', 'e2e',
  'textul ales limitat arată înălțimea care a încăput, nu pe cea cerută')
o('P06', PAN, "p.caseta.fel === 'limita' && asezat.inaltime < p.caseta.ceruta ? 'editare.text.caseta.micsorat'", "false ? 'editare.text.caseta.micsorat'",
  'e2e', 'panoul nu spune că textul a fost micșorat')
o('P07', PAN, "asezat.raport['aldin-esuat'] === 0 && asezat.raport['caseta-prea-mica'] === 0\n", "asezat.raport['aldin-esuat'] === 0\n", 'e2e',
  'textul care nu încape se poate pune pe foaie')

SETURI = {
    'cas': ['test/unit/text.caseta.test.ts', 'test/unit/text.aldin.test.ts'],
    'cas2': ['test/unit/text.caseta.test.ts', 'test/unit/text.aldin.test.ts', 'test/unit/text.vertical.test.ts', 'test/unit/text.corpus.test.ts',
             'test/unit/text.linie.test.ts', 'test/unit/text.svg.test.ts', 'test/unit/text.piesa.test.ts', 'test/unit/text.actiune.test.ts',
             'test/unit/text.curba.test.ts'],
}
E2E = ['test/e2e/text.spec.ts']
