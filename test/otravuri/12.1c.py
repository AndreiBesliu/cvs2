# Lista de otrăvuri a feliei 12.1↑c (banda îngustă din jurul dopului în V și decuparea lui, ADR 0172), 07.11.2026, alese de
# autor: valorile benzii (lățimea cea mai mică, e, marginea semifabricatului, placa, banda implicită, freza decupării), refuzurile,
# dopul (marginea, regiunea benzii, decuparea pe linie, punțile, golurile reuniunii, freza, placa exactă), ușa documentului v22
# (schema, ciocnirea), fereastra exportului (valorile pe rând, validarea, conflictul frezei, scrierea), citirea înapoi, scrierea
# îmbinată și panoul.
# Țintele din ADR 0172 §6: o decupare care taie peretele dopului (C04), una care lasă lemn dincolo de fundul plat (C05), punțile
# (C06, C07), fără gaura reuniunii (C08).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MOD = 'src/model/incrustatie.ts'
INC = 'src/cam/incrustatie.ts'
DOP = 'src/cam/dopV.ts'
MIG = 'src/model/migrari.ts'
SCH = 'src/model/schemaDocument.ts'
VAL = 'src/app/valoriOperatii.ts'
DLG = 'src/ui/DialogExport.tsx'
CON = 'src/app/ExportConectat.tsx'
PAN = 'src/app/PanouProprietati.tsx'
ROL = 'src/model/rolPersonal.ts'

# ---- Valorile benzii, pe hârtie (`valoriBanda`, un singur loc: panoul, fereastra și dopul) ----
o('B01', MOD, '=> 2 * H * t + Math.max(fund, decupare) + 2 * REZERVA_BANDA;', '=> H * t + Math.max(fund, decupare) + 2 * REZERVA_BANDA;', 'banda',
  'banda cea mai îngustă cu un singur perete')
o('B02', MOD, '=> 2 * H * t + Math.max(fund, decupare) + 2 * REZERVA_BANDA;', '=> 2 * H * t + fund + 2 * REZERVA_BANDA;', 'banda',
  'banda cea mai îngustă fără freza decupării')
o('B03', MOD, '=> 2 * H * t + Math.max(fund, decupare) + 2 * REZERVA_BANDA;', '=> 2 * H * t + Math.max(fund, decupare) + REZERVA_BANDA;', 'banda',
  'banda cea mai îngustă cu o singură rezervă')
o('B04', MOD, 'e: v.H * v.t + REZERVA_BANDA,', 'e: v.H * v.t,', 'banda', 'tăietura decupării fără rezervă (atinge peretele dopului)')
o('B05', MOD, 'margine: latime + v.contact + i.margine,', 'margine: latime + i.margine,', 'banda', 'semifabricatul fără șanțul de la față (S·t)')
o('B06', MOD, 'placaMinima: v.fata + b.punti.grosime,', 'placaMinima: v.fata,', 'banda', 'placa cea mai mică fără punți')
o('B07', MOD, '({ decupare: true, grosimePlaca: S + H + SUB_FATA_DOPULUI, punti: { ...PUNTI_BANDA } });',
  '({ decupare: true, grosimePlaca: S + H, punti: { ...PUNTI_BANDA } });', 'banda', 'placa implicită fără milimetrul punților')
o('B08', MOD, '({ decupare: true, grosimePlaca: S + H + SUB_FATA_DOPULUI, punti: { ...PUNTI_BANDA } });',
  '({ decupare: false, grosimePlaca: S + H + SUB_FATA_DOPULUI, punti: { ...PUNTI_BANDA } });', 'banda', 'banda implicită fără decupare')
o('B09', MOD, '  const freza = b.freza ?? fp.scula;', '  const freza = fp.scula;', 'banda', 'freza decupării aleasă, ignorată')
o('B10', MOD, 'b.decupare ? freza.diametru : fp.scula.diametru);', 'freza.diametru);', 'banda',
  'freza decupării lărgește banda și fără decupare')
o('B11', MOD, '  const latime = b.latime ?? minima;', '  const latime = minima;', 'banda', 'lățimea aleasă, ignorată')

# ---- Refuzurile benzii (`refuzIncrustatie`) ----
o('R01', INC, '    if (d.forma !== undefined) return', '    if (false) return', 'banda', 'freza decupării în V primită')
o('R02', INC, '    if (d.numar === op.scula.numar) return', '    if (false) return', 'banda', 'freza decupării cu numărul frezei în V primită')
o('R03', INC, '      if (s.numar === d.numar && s.diametru !== d.diametru) {', '      if (false) {', 'banda',
  'același T cu două diametre (fundul plat și decuparea) primit')
o('R04', INC, '  if (b && b.latime < b.minima - 1e-9) {', '  if (false) {', 'banda', 'banda mai îngustă decât cea mai mică primită')
o('R05', INC, '  if (b?.decupare && b.placa < b.placaMinima - 1e-9) {', '  if (false) {', 'banda', 'placa sub fundul benzii plus punțile primită')
o('R06', INC, '  if (b?.decupare) {', '  if (b) {', 'banda', 'freza decupării judecată și fără decupare')
o('R07', INC, 'cea mai mică, de ${susLaMicron(b.minima)} mm', 'cea mai mică, de ${fix(b.minima)} mm', 'banda',
  'motivul cu lățimea rotunjită în jos (scrisă înapoi, refuzată iar)')

# ---- Dopul cu bandă (`cam/dopV.ts`) ----
o('C01', DOP, '    const m = banda ? banda.margine : inc.margine;', '    const m = inc.margine;', 'banda', 'semifabricatul benzii cu marginea feței coborâte')
o('C02', DOP, '      const larg = offsetFigura(exterioare(), banda.latime);', '      const larg = offsetFigura(exterioare(), banda.latime / 2);', 'banda',
  'banda săpată pe jumătate din lățime')
o('C03', DOP, '      regiune = [...contururiRegiuni(larg.regiuni), ...desen];', '      regiune = [...contururiRegiuni(larg.regiuni)];', 'banda',
  'banda fără desen: dopul săpat tot')
o('C04', DOP, '      const linie = offsetFigura(exterioare(), banda.e + d.diametru / 2);', '      const linie = offsetFigura(exterioare(), banda.e);', 'banda',
  'decuparea pe e, nu pe e + r: freza taie peretele dopului')
o('C05', DOP, '      const linie = offsetFigura(exterioare(), banda.e + d.diametru / 2);', '      const linie = offsetFigura(exterioare(), banda.e + d.diametru);', 'banda',
  'decuparea cu o rază mai departe: lemn păstrat dincolo de inelul măsurat')
o('C06', DOP, 'urechi: { numar: p.numar, latime: p.latime + d.diametru, grosime: p.grosime }, ...baza },', 'urechi: null, ...baza },', 'banda',
  'decuparea fără punți')
o('C07', DOP, 'latime: p.latime + d.diametru,', 'latime: p.latime,', 'banda', 'palierul punții fără freză (lemnul rămas mai scurt decât cel cerut)')
o('C08', DOP, '            ...(goluri.length > 0 ? [', '            ...(false ? [', 'banda', 'golurile reuniunii netăiate (lemnul de la față rămâne în dop)')
o('C09', DOP, '      monteaza(d);', '', 'banda', 'decuparea fără schimbarea frezei (cu freza în V)')
o('C10', DOP, '      semifabricat = { latime, inaltime, grosimeMinima: T, exacta: true };', '      semifabricat = { latime, inaltime, grosimeMinima: T };',
  'banda', 'placa dopului decupat arătată „cel puțin”')
o('C11', DOP, '      semifabricat = { latime, inaltime, grosimeMinima: T, exacta: true };',
  '      semifabricat = { latime, inaltime, grosimeMinima: val.grosimeMinima, exacta: true };', 'banda', 'placa exactă, dar cu grosimea feței coborâte')
o('C12', DOP, "tip: 'profil', latura: 'pe-linie', sens: op.sens, adancime: T, pas: op.pas,",
  "tip: 'profil', latura: 'pe-linie', sens: op.sens, adancime: T - 0.5, pas: op.pas,", 'banda', 'decuparea nu trece prin placă')
o('C13', DOP, '    if (banda?.decupare) {', '    if (banda) {', 'banda', 'decuparea și fără bifă')
o('C14', DOP, '      avertismente.push(`dopul ${t.idLume}: e decupat din placa groasă', '      void (`dopul ${t.idLume}: e decupat din placa groasă', 'e2e',
  'avertismentul punților lipsă')
o('C15', DOP, '      avertismente.push(`dopul ${t.idLume}: banda lasă marginile întregi', '      void (`dopul ${t.idLume}: banda lasă marginile întregi', 'e2e',
  'avertismentul tăieturii de mână lipsă')

# ---- Ușa documentului v22 ----
o('S01', SCH, '    decupare: v.boolean(),', '    decupare: v.optional(v.boolean()),', 'doc', 'banda fără decupare primită')
o('S02', SCH, '    grosimePlaca: pozitiv(PLAFON.adancimeOperatie),', '    grosimePlaca: pozitiv(PLAFON.latura),', 'doc', 'placa peste plafonul adâncimii primită')
o('S03', SCH, '    latime: v.optional(pozitiv(PLAFON.latura)),', '    latime: v.optional(v.number()),', 'doc', 'lățimea benzii negativă primită')
o('S04', SCH, '    punti: SchemaUrechi,', '    punti: v.unknown(),', 'doc', 'punțile oricum primite')
o('S05', SCH, '    freza: v.optional(SchemaScula),', '    freza: v.optional(v.unknown()),', 'doc', 'freza decupării oricum primită')
o('M01', MIG, "      if (typeof inc === 'object' && inc !== null && Object.hasOwn(inc, 'banda')) {", '      if (false) {', 'doc',
  'un v21 cu banda în incrustație, primit (ciocnirea)')
o('M02', MIG, '  return { ok: true, doc: { ...doc, schema: 22 } };', '  return { ok: true, doc: { ...doc, schema: 21 } };', 'doc', 'migrarea v21 → v22 fără număr')

# ---- Fereastra exportului ----
o('E01', DLG, 'latimeMinimaBanda(H, Math.tan((u * Math.PI) / 360), fund, decupare)', 'latimeMinimaBanda(H, Math.tan((u * Math.PI) / 180), fund, decupare)', 'e2e',
  'cea mai mică bandă din unghiul întreg al frezei')
o('E02', DLG, '    placaImplicita: S + H + SUB_FATA_DOPULUI, placaMinima:', '    placaImplicita: S + H, placaMinima:', 'e2e', 'placa implicită fără milimetru')
o('E03', DLG, 'placaMinima: gp === null ? null : S + H + gp,', 'placaMinima: gp === null ? null : S + H + 1,', 'e2e', 'placa cea mai mică cu punțile implicite')
o('E04', DLG, '&& (v?.minima == null || (citesteNumar(p.latimeBanda) ?? 0) >= v.minima - 1e-9));', '&& true);', 'e2e',
  'banda mai îngustă primită de fereastră')
o('E05', DLG, '&& (placaScrisa === null || v?.placaMinima == null || placaScrisa >= v.placaMinima - 1e-9));', '&& true);', 'e2e',
  'placa sub punți primită de fereastră')
o('E06', DLG, "p.jurDop !== 'banda' || Object.values(bandaBuna(p)).every(Boolean)),", "p.jurDop !== 'banda' || true),", 'e2e', 'Exportă pornit cu banda greșită')
o('E07', DLG, '    if (nb !== null && db !== null) adaugaFreza(nb, db, null);', '', 'e2e', 'freza decupării în afara verificării T-urilor')
o('E08', DLG, 'decupareBanda: banda?.decupare ?? true,', 'decupareBanda: banda?.decupare ?? false,', 'e2e', 'decuparea implicită scoasă')
o('E09', DLG, '? { joc, fierastrau, margine, jurDop: p.jurDop, ...(banda ? { banda } : {}) } : null;', '? { joc, fierastrau, margine, jurDop: p.jurDop } : null;', 'e2e',
  'fereastra nu scrie banda')
o('E10', DLG, "const placa = p.placaBanda.trim() === '' || !ok.placa ? v?.placaImplicita ?? null : citesteNumar(p.placaBanda);",
  "const placa = p.placaBanda.trim() === '' || !ok.placa ? 6 : citesteNumar(p.placaBanda);", 'e2e', 'placa goală scrisă altfel decât S + H + 1')
o('E11', DLG, "schimba(o.cheie, { jurDop: ev.target.value === 'banda' ? 'banda' : 'fata' });", "schimba(o.cheie, { jurDop: 'fata' });", 'e2e',
  'banda nu se poate alege')
o('E12', DLG, 'data-camp="banda-placa" disabled={doarCitire || !p.decupareBanda}', 'data-camp="banda-placa" disabled={doarCitire}', 'e2e',
  'placa pornită și fără decupare')
o('E13', DLG, "{t(p.jurDop === 'banda' ? 'export.banda.nota' : 'export.incrustatie.nota')}", "{t('export.incrustatie.nota')}", 'e2e',
  'nota feței coborâte și pe bandă')
o('E14', DLG, 'numarSculaBanda: text(banda?.freza?.numar ?? Math.min(MARGINI_OPERATIE.numarScula, tMaxim + 1)),',
  'numarSculaBanda: text(banda?.freza?.numar ?? (fund?.numar ?? 1) + 1),', 'e2e',
  'freza decupării, bifată, pornește de la fundul plat + 1 (pe canal, chiar T-ul V-ului: conflict pe loc)')

# ---- Citirea înapoi, scrierea îmbinată, panoul ----
o('W01', VAL, "  if (b.latime === undefined) delete vechi['latime'];", '', 'dialog', 'lățimea golită rămâne cea veche')
o('W02', VAL, "  if (!b.freza) delete vechi['freza'];", '', 'dialog', 'freza scoasă rămâne cea veche')
o('W03', VAL, "?? { numar: b.freza.numar, nume: 'freza dreapta', diametru: b.freza.diametru };", "?? { numar: b.freza.numar, nume: '', diametru: b.freza.diametru };",
  'dialog', 'freza nouă fără nume')
o('W04', VAL, '    const { forma: _forma, ...baza } = o?.freza ??', '    const { ...baza } = o?.freza ??', 'dialog', 'forma frezei în V rămasă pe freza decupării')
o('W05', VAL, 'punti: { ...(o?.punti ?? {}), ...b.punti },', 'punti: { ...b.punti },', 'dialog', 'punțile fără câmpurile necunoscute')
o('W06', VAL, "  if (!noua) delete vechi['banda'];", '', 'dialog', 'banda rămâne pe fața coborâtă')
o('W07', VAL, '  const banda = noua ? bandaScrisa(o?.fel === \'v\' ? o.banda : undefined, noua) : undefined;', '  const banda = noua ? bandaScrisa(undefined, noua) : undefined;',
  'dialog', 'banda scrisă fără cea din document (necunoscutele pierdute)')
o('N01', CON, '              ...(o.incrustatie.banda ? { banda: {', '              ...(false ? { banda: {', 'e2e', 'fereastra redeschisă fără banda din proiect')
o('N02', CON, '                ...(o.incrustatie.banda.latime !== undefined ? { latime: o.incrustatie.banda.latime } : {}),', '', 'e2e',
  'lățimea din proiect necitită')
o('N03', CON, 'punti: { numar: o.incrustatie.banda.punti.numar,', 'punti: { numar: 4,', 'e2e', 'numărul punților din proiect necitit')
o('N04', CON, '                ...(o.incrustatie.banda.freza ? { freza:', '                ...(false ? { freza:', 'e2e', 'freza decupării din proiect necitită')
o('N05', PAN, '&& o.fundPlat?.scula.diametru === primaInc.fundPlat?.scula.diametru) ? valoriBanda(primaInc) : null;',
  '&& o.fundPlat?.scula.diametru === primaInc.fundPlat?.scula.diametru) ? null : null;', 'e2e', 'banda lipsă din secțiunea pe hârtie')
o('N06', PAN, "{rand(t('prop.inc.semifabricat'), hartieBanda?.decupare", "{rand(t('prop.inc.semifabricat'), false", 'e2e',
  'placa dopului decupat arătată „cel puțin” în panou')
o('N07', PAN, "rand(t('prop.inc.jur'), t(o.incrustatie.jurDop === 'banda' ? 'prop.inc.jur.banda' : 'prop.inc.jur.fata'))",
  "rand(t('prop.inc.jur'), t('prop.inc.jur.fata'))", 'e2e', 'lemnul din jurul dopului arătat mereu „fața coborâtă”')

# ---- Rolurile personalizate (găsită la recitirea codului, după prima rulare) ----
o('L01', ROL, "    ...(inc?.fel === 'v' && inc.banda?.freza ? { incrustatie: { ...inc, banda: { ...inc.banda, freza: f(inc.banda.freza) } } } : {}),\n", '',
  'rol', 'freza decupării benzii în afara renumerotării rolurilor personalizate')

SETURI = {
    'banda': ['test/unit/incrustatie.banda.test.ts', 'test/unit/incrustatie.refuzuri.test.ts'],
    'banda2': ['test/unit/incrustatie.banda.test.ts', 'test/unit/incrustatie.refuzuri.test.ts', 'test/unit/incrustatie.potrivire.test.ts',
               'test/unit/incrustatie.banda.scriere.test.ts', 'test/unit/documente.aur.test.ts'],
    'doc': ['test/unit/document.v22.oracol.test.ts'],
    'doc2': ['test/unit/document.v22.oracol.test.ts', 'test/unit/documente.aur.test.ts', 'test/unit/document.oracol.test.ts'],
    'dialog': ['test/unit/incrustatie.banda.scriere.test.ts'],
    'dialog2': ['test/unit/incrustatie.banda.scriere.test.ts', 'test/unit/incrustatie.scriere.test.ts', 'test/unit/actiuni.test.ts'],
    'rol': ['test/unit/rolPersonal.test.ts'],
    'rol2': ['test/unit/rolPersonal.test.ts', 'test/unit/rol.test.ts', 'test/unit/incrustatie.rol.test.ts'],
}
E2E = ['test/e2e/incrustatieBanda.spec.ts']
