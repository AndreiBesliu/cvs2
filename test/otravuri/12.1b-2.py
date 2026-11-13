# Lista de otrăvuri a feliei 12.1↑b-2 (punțile dopului drept decupat alese în fereastră, documentul v24, ADR 0174), 13.11.2026,
# alese de autor: ușa (migrarea v23 → v24, ciocnirea pe orice fel, schema câmpului), dopul (punțile din incrustație: câte,
# palierul, grosimea, avertismentul; implicitele), scrierea la Exportă (implicitele nescrise, îmbinarea, câmpul plecat pe dopul
# ridicat), fereastra (judecata, motivul, ce se scrie, câmpurile doar la decupat, valorile din proiect) și panoul.
# Țintele din ADR 0174: punțile ignorate (cele de azi, fixe), ciocnirea lipsă, o comandă la un Exportă fără schimbare.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MIG = 'src/model/migrari.ts'
SCH = 'src/model/schemaDocument.ts'
MOD = 'src/model/incrustatie.ts'
DOP = 'src/cam/dopDrept.ts'
SCR = 'src/app/valoriOperatii.ts'
CON = 'src/app/ExportConectat.tsx'
DLG = 'src/ui/DialogExport.tsx'
PAN = 'src/app/PanouProprietati.tsx'

# ---- Ușa: migrarea v23 → v24 și schema câmpului ----
o('B01', MIG, "      if (typeof inc === 'object' && inc !== null && Object.hasOwn(inc, 'punti')) {", '      if (false) {', 'doc',
  'fără ciocnirea `punti` (un v23 cu punți trece, ca necunoscut)')
o('B02', MIG, "      if (typeof inc === 'object' && inc !== null && Object.hasOwn(inc, 'punti')) {",
  "      if (typeof inc === 'object' && inc !== null && Object.hasOwn(inc, 'punti') && (inc as Brut)['fel'] === 'drept') {", 'doc',
  'ciocnirea doar pe incrustația dreaptă (nu pe orice fel)')
o('B03', MIG, '  return { ok: true, doc: { ...doc, schema: 24 } };', '  return { ok: true, doc: { ...doc } };', 'doc',
  'migrarea v23 → v24 fără numărul nou')
o('B04', SCH, '      punti: v.optional(SchemaUrechi),\n    }),', '      punti: v.optional(v.unknown()),\n    }),', 'doc',
  'punțile nejudecate de ușă (orice valoare primită)')
o('B05', SCH, '      jurDop: v.picklist([\'fata\', \'banda\']),', "      jurDop: v.picklist(['fata', 'banda']),\n      punti: v.optional(SchemaUrechi),", 'doc',
  'punțile judecate și pe incrustația în V (acolo sunt un câmp necunoscut)')

# ---- Dopul: punțile din incrustație ----
o('B06', DOP, '      const punti = inc.punti ?? PUNTI_DOP_DREPT;', '      const punti = PUNTI_DOP_DREPT;', 'dop', 'punțile alese ignorate (cele fixe, de azi)')
o('B07', DOP, '      const palier = punti.latime + mica.scula.diametru;', '      const palier = PUNTI_DOP_DREPT.latime + mica.scula.diametru;', 'dop',
  'lățimea aleasă ignorată (palierul din cea implicită)')
o('B08', DOP, '      const pePunti = puntiPeBucle(lungimi, palier, punti.numar);', '      const pePunti = puntiPeBucle(lungimi, palier, PUNTI_DOP_DREPT.numar);',
  'dop', 'numărul ales ignorat')
o('B09', DOP, 'urechi: { numar: n, latime: palier, grosime: punti.grosime }', 'urechi: { numar: n, latime: palier, grosime: PUNTI_DOP_DREPT.grosime }', 'dop',
  'grosimea aleasă ignorată')
o('B10', DOP, 'e decupat cu ${punti.numar} punți pe buclă,', 'e decupat cu ${PUNTI_DOP_DREPT.numar} punți pe buclă,', 'dop',
  'avertismentul cu numărul implicit')
# B11 retrasă înainte de rulare: e chiar 12.1b P11 (palierul fără freză), reorientată pe codul acesta.
o('B12', MOD, 'export const PUNTI_DOP_DREPT: Urechi = { numar: 4, latime: 4, grosime: 1 };',
  'export const PUNTI_DOP_DREPT: Urechi = { numar: 3, latime: 4, grosime: 1 };', 'dop', 'implicitele schimbate (3 pe buclă)')

# ---- Scrierea la Exportă ----
o('B13', SCR, '  const punti = puntiNoi && (puntiVechi || !implicite(puntiNoi)) ? { ...(puntiVechi ?? {}), ...puntiNoi } : undefined;',
  '  const punti = puntiNoi ? { ...(puntiVechi ?? {}), ...puntiNoi } : undefined;', 'scriere', 'implicitele scrise mereu (o comandă fără schimbare)')
o('B14', SCR, '  const punti = puntiNoi && (puntiVechi || !implicite(puntiNoi)) ? { ...(puntiVechi ?? {}), ...puntiNoi } : undefined;',
  '  const punti = puntiNoi && !implicite(puntiNoi) ? { ...(puntiVechi ?? {}), ...puntiNoi } : undefined;', 'scriere',
  'punțile scrise pleacă la întoarcerea pe implicite')
o('B15', SCR, '  const punti = puntiNoi && (puntiVechi || !implicite(puntiNoi)) ? { ...(puntiVechi ?? {}), ...puntiNoi } : undefined;',
  '  const punti = puntiNoi && (puntiVechi || !implicite(puntiNoi)) ? { ...puntiNoi } : undefined;', 'scriere', 'fără îmbinare (câmpul necunoscut pierdut)')
o('B16', SCR, '  const { frezeDop: _vechi, punti: puntiVechi, ...fara } = vechi ?? {};',
  '  const { frezeDop: _vechi, ...fara } = vechi ?? {};\n  const puntiVechi = vechi?.punti;', 'scriere', 'punțile vechi rămân pe dopul ridicat')
o('B17', SCR, ' && p.grosime === PUNTI_DOP_DREPT.grosime;', ';', 'scriere', 'grosimea nu contează la „implicite”')
o('B18', SCR, 'p.numar === PUNTI_DOP_DREPT.numar && ', '', 'scriere', 'numărul nu contează la „implicite”')

# ---- Fereastra și panoul ----
o('B19', CON, '              ...(o.incrustatie.punti ? { punti: { numar: o.incrustatie.punti.numar, latime: o.incrustatie.punti.latime, grosime: o.incrustatie.punti.grosime } } : {}),\n',
  '', 'e2e', 'fereastra nu primește punțile din proiect')
o('B20', DLG, "    puntiDop: p !== undefined && (p.tip !== 'buzunar' || !p.incrustatieDreapta || p.dopInc !== 'decupat' || puntiBune(p)),",
  "    puntiDop: true,", 'e2e', 'punțile dopului nejudecate în fereastră')
o('B21', DLG, "    ...(puntiDopBune ? [] : [t('motiv.punti-dop-invalide', { n: MARGINI_OPERATIE.urechi })]),\n", '', 'e2e', 'fără motivul punților')
o('B22', DLG, "        if (p.dopInc === 'decupat') {\n          const numar = citesteNumar(p.numarPunti)", "        if (false) {\n          const numar = citesteNumar(p.numarPunti)",
  'e2e', 'Exportă nu scrie punțile alese')
o('B23', DLG, "                      {p.dopInc === 'decupat' && (<>\n                      <label title={t('export.banda.punti.numar.titlu')}>",
  "                      {(<>\n                      <label title={t('export.banda.punti.numar.titlu')}>", 'e2e', 'punțile arătate și pe dopul ridicat')
o('B24', DLG, '    const puntiRand = banda?.punti ?? dr?.punti ?? PUNTI_DOP_DREPT;', '    const puntiRand = banda?.punti ?? PUNTI_DOP_DREPT;', 'e2e',
  'rândul nu citește punțile dopului din proiect')
o('B25', DLG, 'value={p.grosimePunti} data-camp="dop-punti-grosime"', 'value={p.latimePunti} data-camp="dop-punti-grosime"', 'e2e',
  'câmpul grosimii arată lățimea')
o('B26', PAN, "                {incDreapta.dop === 'decupat' && ((p) => rand(", "                {false && ((p) => rand(", 'e2e', 'panoul fără punțile dopului')
o('B27', PAN, '(incDreapta.punti ?? PUNTI_DOP_DREPT)}', '(PUNTI_DOP_DREPT)}', 'e2e', 'panoul arată implicitele, nu punțile din proiect')

SETURI = {
    'doc': ['test/unit/document.v24.oracol.test.ts'],
    'doc2': ['test/unit/document.v24.oracol.test.ts', 'test/unit/document.v23.oracol.test.ts', 'test/unit/document.v22.oracol.test.ts',
             'test/unit/model.test.ts', 'test/unit/document.oracol.test.ts'],
    'dop': ['test/unit/incrustatieDreapta.punti.test.ts'],
    'dop2': ['test/unit/incrustatieDreapta.punti.test.ts', 'test/unit/incrustatieDreapta.dop.test.ts', 'test/unit/incrustatieDreapta.potrivire.test.ts'],
    'scriere': ['test/unit/incrustatieDreapta.scriere.test.ts'],
    'scriere2': ['test/unit/incrustatieDreapta.scriere.test.ts', 'test/unit/incrustatie.scriere.test.ts', 'test/unit/incrustatie.banda.scriere.test.ts'],
}
E2E = ['test/e2e/incrustatieDreapta.spec.ts']
