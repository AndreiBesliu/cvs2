# Lista de otrăvuri a feliei 12.1↑f (gaura incrustației cu pereți drepți, documentul v25, ADR 0175), 16.11.2026, alese de
# autor: ușa (migrarea v24 → v25: ciocnirea `locas` / `treapta`, sprijinul „umar” pe un v24, numărul; schema câmpurilor noi),
# lucrarea (locașul prin foaie, supracursa, ce e gaură), dopul (adâncimea din foaie, înălțimea pe față fără joc), refuzurile (pe
# fund la gaură, treapta, umărul, jocul de sub dop la gaură), scrierea (locașul), fereastra (locașul, adâncimea, sprijinul) și
# panoul (pe hârtie, Tăierea).
# Țintele din ADR 0175: gaura cu adâncimea operației, dopul gros cât operația, dopul ridicat pe fund la gaură, o treaptă tăiată
# fără felia ei.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MIG = 'src/model/migrari.ts'
SCH = 'src/model/schemaDocument.ts'
MOD = 'src/model/incrustatie.ts'
JOB = 'src/cam/job.ts'
DOP = 'src/cam/dopDrept.ts'
REF = 'src/cam/incrustatieDreapta.ts'
SCR = 'src/app/valoriOperatii.ts'
CON = 'src/app/ExportConectat.tsx'
DLG = 'src/ui/DialogExport.tsx'
PAN = 'src/app/PanouProprietati.tsx'

# ---- Ușa: migrarea v24 → v25 și schema ----
o('H01', MIG, "      for (const camp of ['locas', 'treapta']) {", '      for (const camp of [] as string[]) {', 'doc', 'fără ciocnirea `locas` / `treapta`')
o('H02', MIG, "      if ((inc as Brut)['sprijin'] === 'umar') return", "      if (false) return", 'doc', 'un v24 cu sprijinul „umar” primit')
o('H03', MIG, '  return { ok: true, doc: { ...doc, schema: 25 } };', '  return { ok: true, doc: { ...doc } };', 'doc', 'migrarea v24 → v25 fără numărul nou')
o('H04', SCH, "      locas: v.optional(v.picklist(['buzunar', 'gaura'])),", '      locas: v.optional(v.unknown()),', 'doc', 'locașul nejudecat de ușă')
o('H05', SCH, '      treapta: v.optional(v.looseObject({', '      treapta: v.optional(v.unknown()), _treapta: v.optional(v.looseObject({', 'doc',
  'treapta nejudecată de ușă')
o('H06', SCH, "      sprijin: v.picklist(['fund', 'fata', 'umar']),", "      sprijin: v.picklist(['fund', 'fata']),", 'doc', 'sprijinul „umar” refuzat de ușa v25')

# ---- Lucrarea: gaura prin foaie ----
o('H07', JOB, '  doc = cuGauriPrinFoaie(doc, supracursa);\n', '', 'gaura', 'gaura cu adâncimea operației')
o('H08', MOD, '  const adancime = foaie.stoc.grosime + supracursa;', '  const adancime = foaie.stoc.grosime;', 'gaura', 'gaura fără supracursa')
o('H09', MOD, "op.incrustatie?.fel === 'drept' && op.incrustatie.locas === 'gaura';", "op.incrustatie?.fel === 'drept' && op.incrustatie.locas === 'gaura' && false;",
  'gaura', 'nimic nu e gaură')

# ---- Dopul ----
# H10, H12 reorientate la 12.1↑f-2 (17.11): înălțimea fără treaptă e ramura `else`; dopul ia și treapta din valorile pe hârtie.
o('H10', MOD, '    inaltime = i.dop === \'ridicat\' && i.sprijin === \'fata\' ? D - (gaura ? 0 : i.joc) : D + i.fierastrau;',
  '    inaltime = i.dop === \'ridicat\' && i.sprijin === \'fata\' ? D - i.joc : D + i.fierastrau;', 'gaura', 'dopul pe față, la gaură, cu jocul de sub el')
o('H11', MOD, 'D = gaura && grosimeFoaie !== undefined ? grosimeFoaie : op.adancime;', 'D = op.adancime;', 'gaura', 'valorile pe hârtie din adâncimea operației')
o('H12', DOP, '    const { inaltime: h, grosime, treapta } = valoriIncrustatieDreapta(op, doc.foi[0]?.stoc.grosime)!;',
  '    const { inaltime: h, grosime, treapta } = valoriIncrustatieDreapta(op)!;', 'gaura', 'dopul fără grosimea foii')

# ---- Refuzurile ----
o('H13', REF, "  if (gaura && i.dop === 'ridicat' && i.sprijin === 'fund') {", '  if (false) {', 'gaura', 'dopul ridicat pe fund la o gaură, primit')
# H14, H15 retrase la 12.1↑f-2 (17.11): treapta și sprijinul pe umăr nu mai sunt refuzate (felia lor le aduce); țintele noi sunt
# în `12.1f-2.py` (T05–T14: sprijinul, umărul, jocurile; T13: sprijinul pe umăr fără treaptă).
# H16 reorientată la 12.1↑f-2 (17.11): jocul de sub dopul pe față se judecă doar fără treaptă.
o('H16', REF, "  if (!tr && i.dop === 'ridicat' && i.sprijin === 'fata' && !gaura) {", "  if (!tr && i.dop === 'ridicat' && i.sprijin === 'fata') {", 'gaura',
  'jocul de sub dop judecat și la gaură')

# ---- Scrierea ----
# H17, H18, H20, H25 reorientate la 12.1↑f-2 (17.11): scrierea scoate și treapta veche; Exportă scrie și treapta; la gaură, cu
# treaptă, sprijinul trece pe umăr; jocul g arătat e `jocFolosit`.
o('H17', SCR, '  const { frezeDop: _vechi, punti: puntiVechi, locas: _locas, treapta: treaptaVeche, ...fara } = vechi ?? {};\n  void _locas;\n',
  '  const { frezeDop: _vechi, punti: puntiVechi, treapta: treaptaVeche, ...fara } = vechi ?? {};\n', 'scriere', 'gaura veche rămasă pe un buzunar')

# ---- Fereastra și panoul ----
o('H18', DLG, "          ...(prinFoaie ? { locas: 'gaura' as const } : {}), ...(treapta ? { treapta } : {}),\n", "          ...(treapta ? { treapta } : {}),\n", 'e2e',
  'Exportă nu scrie gaura')
o('H19', DLG, '                  <td><input type="text" inputMode="decimal" value={grosimeFoaie !== undefined ? text(grosimeFoaie) : p.adancime} data-camp="adancime" disabled\n',
  '                  <td><input type="text" inputMode="decimal" value={grosimeFoaie !== undefined ? text(grosimeFoaie) : p.adancime} data-camp="adancime"\n',
  'e2e', 'adâncimea gaurii editabilă')
o('H20', DLG, "                            schimba(o.cheie, { locasInc, ...(locasInc === 'gaura' && p.sprijinInc === 'fund' ? { sprijinInc: p.treaptaInc === 'fara' ? 'fata' : 'umar' } : {}) });",
  '                            schimba(o.cheie, { locasInc });', 'e2e', 'gaura lasă sprijinul pe fund')
o('H21', DLG, "                          {p.locasInc !== 'gaura' && <option value=\"fund\">{t('export.incrustatie-drept.sprijin.fund')}</option>}",
  "                          <option value=\"fund\">{t('export.incrustatie-drept.sprijin.fund')}</option>", 'e2e', '„pe fund” oferit la gaură')
o('H22', DLG, "locasInc: dr?.locas === 'gaura' ? 'gaura' : 'buzunar',", "locasInc: 'buzunar',", 'e2e', 'rândul nu citește gaura din proiect')
o('H23', CON, '      {...(doc.foi[0] ? { grosimeFoaie: doc.foi[0].stoc.grosime } : {})}\n', '', 'e2e', 'fereastra fără grosimea foii')
o('H24', CON, "              ...(o.incrustatie.locas === 'gaura' ? { locas: 'gaura' as const } : {}),\n", '', 'e2e', 'fereastra nu primește gaura din proiect')
o('H25', DLG, "const jocFolosit = (p: RandSprijin): boolean => p.locasInc !== 'gaura' && (p.treaptaInc !== 'fara' || sprijinitPeFata(p));",
  "const jocFolosit = (p: RandSprijin): boolean => (p.treaptaInc !== 'fara' || sprijinitPeFata(p));", 'e2e',
  'jocul de sub dop arătat la gaură')
o('H26', PAN, "                {incDreapta.locas === 'gaura' && rand(t('prop.inc.locas'), t('prop.inc.locas.gaura'))}\n", '', 'e2e', 'panoul fără gaură, pe hârtie')
o('H27', PAN, "            {operatiiAlese.length > 0 && (foaie && operatiiAlese.every(esteGaura)", "            {operatiiAlese.length > 0 && (false && operatiiAlese.every(esteGaura)",
  'e2e', 'Tăierea fără adâncimea prin foaie')

SETURI = {
    'doc': ['test/unit/document.v25.oracol.test.ts'],
    'doc2': ['test/unit/document.v25.oracol.test.ts', 'test/unit/document.v24.oracol.test.ts', 'test/unit/document.v23.oracol.test.ts', 'test/unit/model.test.ts'],
    'gaura': ['test/unit/incrustatieDreapta.gaura.test.ts'],
    'gaura2': ['test/unit/incrustatieDreapta.gaura.test.ts', 'test/unit/incrustatieDreapta.dop.test.ts', 'test/unit/incrustatieDreapta.potrivire.test.ts',
               'test/unit/incrustatieDreapta.punti.test.ts'],
    'scriere': ['test/unit/incrustatieDreapta.scriere.test.ts'],
    'scriere2': ['test/unit/incrustatieDreapta.scriere.test.ts', 'test/unit/incrustatie.scriere.test.ts'],
}
E2E = ['test/e2e/incrustatieDreapta.spec.ts']
