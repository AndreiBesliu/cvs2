# Lista de otrăvuri a feliei 12.1↑b (incrustația cu pereți drepți, ADR 0171), 07.11.2026, alese de autor: razele colțurilor
# (închiderea, jocul, vârfurile și unghiurile dopului, frezele care dau razele), figura (închiderea, deschiderea, jocul aplicat de
# două ori, refuzul părții înguste), dopul (oglinda, decuparea, regiunea, punțile, freza cea mai mică, grosimea exactă), înălțimea
# dopului, refuzurile, ușa documentului v21 (schema, ciocnirea), rolul, scrierea înapoi, fereastra exportului, panoul și arborele.
# Țintele din ADR 0171 §6: raza fără c (D01), jocul aplicat de două ori (F02), oglinda (P01, P02), înălțimea dopului cu H în loc
# de g (D04), fără închidere (F01).
# Prima rulare (`40376e2`): 49 prinse, 3 scăpate (F05, P06, P07), fiecare cu proba ei; P06 a arătat și un defect: punțile de
# 4 mm pe traseu erau refuzate de lucrare cu orice freză peste Ø4 (palierul e acum lățimea plus freza: P11). L05: frezele
# dopului în renumerotarea rolurilor personalizate, găsită la recitirea codului.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# La 12.1↑c (ADR 0172): seturile documentului sunt pe v22 (proba v21 a devenit document.v22.oracol.test.ts); E16, implicitul
# frezei dopului (primul T liber), adăugată cu repararea lui; P06 și P11 pe codul punților pe bucle (câte încap pe fiecare).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MOD = 'src/model/incrustatie.ts'
GEO = 'src/cam/incrustatieDreapta.ts'
DOP = 'src/cam/dopDrept.ts'
JOB = 'src/cam/job.ts'
CAL = 'src/jobs/calculCam.ts'
MIG = 'src/model/migrari.ts'
SCH = 'src/model/schemaDocument.ts'
ROL = 'src/model/rol.ts'
VAL = 'src/app/valoriOperatii.ts'
DLG = 'src/ui/DialogExport.tsx'
CON = 'src/app/ExportConectat.tsx'
PAN = 'src/app/PanouProprietati.tsx'
ARB = 'src/ui/NivelPiesa.tsx'

# ---- Razele colțurilor, pe hârtie (`valoriIncrustatieDreapta`, un singur loc: panoul și lucrarea) ----
o('D01', MOD, '  const c = i.jocLateral, rho = Math.max(0, rDop - c);', '  const c = i.jocLateral, rho = Math.max(0, rDop);', 'drept',
  'raza închiderii fără jocul lateral (unghiurile locașului cu r, nu r − c)')
o('D02', MOD, 'varfDop: Math.max(0, rLocas - c),', 'varfDop: rLocas,', 'e2e', 'vârfurile dopului arătate fără joc')
o('D03', MOD, 'unghiDop: rho + c,', 'unghiDop: rho,', 'e2e', 'unghiurile dopului arătate fără joc')
o('D04', MOD, "  const inaltime = i.dop === 'ridicat' && i.sprijin === 'fata' ? op.adancime - i.joc : op.adancime + i.fierastrau;",
  "  const inaltime = i.dop === 'ridicat' && i.sprijin === 'fata' ? op.adancime - i.fierastrau : op.adancime + i.fierastrau;", 'drept',
  'înălțimea dopului sprijinit pe față cu H în loc de g')
o('D05', MOD, '  const locas = [{ scula: op.scula }, ...(op.rest ?? [])];', '  const locas = [{ scula: op.scula }];', 'drept',
  'raza locașului fără frezele de rest')
o('D06', MOD, '  const rLocas = raza(locas), rDop = i.frezeDop && i.frezeDop.length > 0 ? raza(i.frezeDop) : rLocas;',
  '  const rLocas = raza(locas), rDop = rLocas;', 'drept', 'raza dopului fără frezele lui (închiderea cu raza locașului)')
o('D07', MOD, "    grosime: i.dop === 'decupat' ? inaltime : inaltime + SUB_FATA_DOPULUI,", '    grosime: inaltime + SUB_FATA_DOPULUI,', 'e2e',
  'placa dopului decupat cu 1 mm mai groasă (tăietura nu mai trece prin ea)')

# ---- Figura: închiderea, deschiderea, jocul, partea îngustă ----
o('F01', GEO, '  const { rLocas, rDop, rho, c } = raze;', '  const { rLocas, rDop, c } = raze;\n  const rho = 0;', 'drept',
  'fără închidere: unghiurile locașului ascuțite, ale dopului cu c (freza dopului lasă lemn în ele)')
o('F02', GEO, '  const dop = offset(taiat.regiuni, -c);', '  const dop = offset(taiat.regiuni, -2 * c);', 'drept', 'jocul aplicat de două ori')
o('F03', GEO, '  const dop = offset(taiat.regiuni, -c);', '  const dop = offset(locas.regiuni, -c);', 'drept',
  'dopul din figura închisă, nu din conturul tăiat (vârfuri ascuțite în vârfurile rotunjite ale locașului)')
o('F04', GEO, '  const taiat = offset(ingust.regiuni, rLocas);', '  const taiat = offset(ingust.regiuni, rLocas + 0.05);', 'drept',
  'conturul tăiat redeschis prea larg (dopul cu 0,05 mai mare)')
o('F05', GEO, '    if (!are) return', '    if (false) return', 'drept', 'partea mai îngustă decât freza primită (dispare din locaș)')

# ---- Refuzurile (ADR 0171 §4) ----
o('R01', GEO, "  if (op.tip !== 'buzunar') return", "  if (op.tip === 'profil') return", 'drept', 'incrustația dreaptă pe un V-carve primită')
o('R02', GEO, '  const v = (i.frezeDop ?? []).find((f) => f.scula.forma !== undefined);', '  const v = (i.frezeDop ?? []).find((f) => f.scula.forma === null);',
  'drept', 'o freză în V la dop primită')
o('R03', GEO, '  if (raze && !(i.jocLateral < raze.rLocas)) {', '  if (raze && !(i.jocLateral <= raze.rLocas)) {', 'drept', 'jocul lateral cât raza frezei primit')
o('R04', GEO, '    if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) {', '    if (!(i.joc >= 0)) {', 'drept', 'jocul de sub dop sub 0,1 primit (pe față)')
o('R05', GEO, '    if (!(i.joc < op.adancime)) return', '    if (!(i.joc <= op.adancime)) return', 'drept', 'jocul de sub dop cât adâncimea primit (pe față)')
o('R06', DOP, '      if (m < mica.scula.diametru) {', '      if (m < 0) {', 'drept', 'marginea dopului decupat sub freza lui primită')

# ---- Dopul: oglinda, decuparea, regiunea, punțile, freza, grosimea exactă ----
o('P01', DOP, '      const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };', '      const oglinda = { a: 1, b: 0, c: 0, d: 1, e: m - x0, f: m - y0 };',
  'drept', 'dopul ridicat neoglindit')
o('P02', DOP, '      const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };', '      const oglinda = { a: 1, b: 0, c: 0, d: -1, e: m - x0, f: y1 + m };',
  'drept', 'dopul ridicat oglindit pe Y, nu pe X')
o('P03', DOP, '      const muta = { a: 1, b: 0, c: 0, d: 1, e: m - x0, f: m - y0 };', '      const muta = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };',
  'drept', 'dopul decupat oglindit (intră în locaș fără întoarcere)')
o('P04', DOP, '      const contururi = contururiRegiuni(f.figura.dop).map((c) => transformaContur(c, oglinda));',
  '      const contururi = contururiRegiuni(f.figura.taiat).map((c) => transformaContur(c, oglinda));', 'drept', 'dopul cât locașul (fără joc)')
o('P05', DOP, '      const e = Math.max(DINCOLO_DE_MARGINE, lata + TRECERE - m);', '      const e = DINCOLO_DE_MARGINE;', 'e2e',
  'regiunea feței nelărgită pentru freză (freza nu trece pe lângă dop)')
# P06 și P11, reorientate la 12.1↑b-2 (ADR 0174, `9185658`): punțile vin din incrustație (`punti`), nu din constanta `PUNTI`.
o('P06', DOP, 'urechi: { numar: n, latime: palier, grosime: punti.grosime }, ...baza,', 'urechi: null, ...baza,',
  'drept', 'dopul decupat fără punți (cade din placă)')
o('P07', DOP, '      const mica = [...freze].sort((a, b) => a.scula.diametru - b.scula.diametru)[0]!;', '      const mica = freze[0]!;', 'drept',
  'dopul decupat cu prima freză, nu cu cea mai mică (unghiurile lui rotunjite prea larg)')
o('P08', DOP, "...(inc.dop === 'decupat' ? { exacta: true } : {}) },", '},', 'e2e', 'placa dopului decupat arătată „cel puțin”, nu exactă')
o('P09', CAL, '  const calculate = { dopuri: [...inV.dopuri, ...drepte.dopuri] };', '  const calculate = { dopuri: [...inV.dopuri] };', 'drept',
  'dopul cu pereți drepți nu iese din export')
o('P11', DOP, '      const palier = punti.latime + mica.scula.diametru;', '      const palier = punti.latime;', 'drept',
  'palierul punților fără freză (lucrarea refuză dopul decupat cu freza Ø6)')
o('P10', JOB, "        const ale = taieturi.filter((u) => u.tip === 'buzunar' && cheieDreapta(u) === cheie);", '        const ale = [t];', 'drept',
  'locașul fără celelalte contururi ale regiunii (golul inelului tăiat)')

# ---- Ușa documentului v21 ----
o('S01', SCH, '      jocLateral: pozitiv(PLAFON.adancimeOperatie),', '      jocLateral: v.number(),', 'doc', 'jocul lateral zero sau negativ primit')
o('S02', SCH, "      dop: v.picklist(['ridicat', 'decupat']),", '      dop: v.string(),', 'doc', 'orice text ca felul dopului')
o('S03', SCH, "      sprijin: v.picklist(['fund', 'fata']),", '      sprijin: v.string(),', 'doc', 'orice text ca sprijinul')
o('S04', SCH, '      frezeDop: v.optional(SchemaRest),', '      frezeDop: v.optional(v.unknown()),', 'doc', 'frezele dopului fără contract')
o('S05', MIG, '      const camp = CAMPURI_INCRUSTATIE_V21.find((c) => Object.hasOwn(inc, c));', '      const camp = undefined;', 'doc',
  'ciocnirea v20 → v21 nedetectată (un câmp nou luat drept necunoscut)')

# ---- Rolul ----
o('L01', ROL, "    'incrustatie-drept': inchise && forme.length <= PLAFON.noduriOperatie,", "    'incrustatie-drept': false,", 'rol', 'rolul neoferit')
o('L02', ROL, "  const i = vechi?.fel === 'drept' ? structuredClone(vechi) : structuredClone(INCRUSTATIE_DREAPTA_IMPLICITA);",
  '  const i = structuredClone(INCRUSTATIE_DREAPTA_IMPLICITA);', 'rol', 'valorile de dinainte pierdute la rolul ales din nou')
o('L03', ROL, '  return { ...i, joc: Math.min(i.joc, Math.max(JOC_INCRUSTATIE_MINIM, Math.floor((adancime / 2) * 1000) / 1000)) };', '  return i;', 'rol',
  'jocul de sub dop nestrâns la jumătatea adâncimii')
o('L04', ROL, "      if (o.incrustatie?.fel === 'drept') rez.push(...(o.incrustatie.frezeDop ?? []).map((r) => r.scula));", '', 'rol',
  'frezele dopului în afara numerotării (o freză nouă le ia numărul)')

o('L05', 'src/model/rolPersonal.ts', "    ...(inc?.fel === 'drept' && inc.frezeDop ? { incrustatie: { ...inc, frezeDop: inc.frezeDop.map((r) => ({ ...r, scula: f(r.scula) })) } } : {}),",
  '', 'rol', 'frezele dopului nerenumerotate de un rol personalizat (al doilea T1 cu alt diametru)')

# ---- Scrierea înapoi, fereastra exportului, panoul, arborele ----
o('E01', VAL, "  const vechi = o?.fel === 'drept' ? o : undefined;", '  const vechi = undefined;', 'dialog', 'un câmp necunoscut al incrustației pierdut la Exportă')
o('E02', VAL, 'incrustatie: _inc, incrustatieDreapta: _incDreapta, ...rest', 'incrustatie: _inc, ...rest', 'dialog',
  'cheia rândului (`incrustatieDreapta`) scrisă în document')
o('E03', VAL, '...(strategie ? { strategie } : {}), ...(incrustatie ? { incrustatie } : {}),', '...(strategie ? { strategie } : {}),', 'e2e',
  'Exportă scoate incrustația dreaptă din proiect')
o('E04', CON, "            incrustatieDreapta: o.incrustatie?.fel === 'drept' ? {", "            incrustatieDreapta: o.incrustatie?.fel === 'nimic' ? {", 'e2e',
  'rândul ferestrei nu primește incrustația dreaptă din document')
o('E05', DLG, "      incrustatieDreapta: inchise && o.valori.tip === 'buzunar' && dr != null,", '      incrustatieDreapta: false,', 'e2e',
  'rândul nu-și pornește rolul din document')
o('E06', DLG, "                          : v === 'incrustatie-drept' ? { ...fara, tip: 'buzunar', incrustatieDreapta: true }",
  "                          : v === 'incrustatie-drept' ? { ...fara, tip: 'buzunar' }", 'e2e', 'rolul ales în fereastră rămâne un buzunar obișnuit')
o('E07', DLG, "...(coborare ? { coborare } : {}), rest, ...strategie, incrustatieDreapta,", '...(coborare ? { coborare } : {}), rest, ...strategie,', 'e2e',
  'fereastra nu scrie incrustația dreaptă')
o('E08', DLG, "                      {p.dopInc === 'ridicat' && (", '                      {(', 'e2e', 'sprijinul arătat și la dopul decupat')
o('E09', DLG, "{t(p.dopInc === 'decupat' ? 'export.incrustatie-drept.peste' : 'export.incrustatie.fierastrau')}", "{t('export.incrustatie.fierastrau')}",
  'e2e', 'spațiul de deasupra al dopului decupat numit „pentru fierăstrău”')
o('E10', DLG, '    if (nd !== null && dd !== null) adaugaFreza(nd, dd, null);', '', 'e2e', 'freza dopului în afara verificării T-urilor')
o('E11', DLG, '          frezeDop = [{ numar, diametru, pasLateral: pasLateralDop }, ...restDop];', '', 'e2e', 'freza dopului bifată, dar nescrisă')
o('E12', DLG, "{t(d.exacta ? 'export.gata.dop-decupat' : 'export.gata.dop', {", "{t('export.gata.dop', {", 'e2e',
  'placa dopului decupat arătată „cel puțin”')
o('E13', PAN, '          {hartieDreapta && incDreapta && (', '          {false && (', 'e2e', 'secțiunea pe hârtie a pereților drepți lipsă')
o('E14', PAN, "t(o.incrustatie?.fel === 'drept' ? 'export.latura.incrustatie-drept' : 'export.latura.buzunar')", "t('export.latura.buzunar')", 'e2e',
  'operația numită buzunar în panou')
o('E15', ARB, "              {o.tip === 'buzunar' && o.incrustatie?.fel === 'drept' && t('arbore.buzunar.incrustatie', { joc: n(o.incrustatie.jocLateral) })}",
  '', 'e2e', 'arborele nu spune incrustația dreaptă')
# Adăugată la 12.1↑c (răspunsul „Da, repară-l”): implicitul frezei dopului, ca la freza decupării benzii.
o('E16', DLG, 'numarSculaDop: text(dop0?.numar ?? Math.min(MARGINI_OPERATIE.numarScula, tMaxim + 1)),',
  'numarSculaDop: text(dop0?.numar ?? (o.valori.scula?.numar ?? 1) + 1),', 'e2e',
  'freza dopului, bifată, pornește de la T-ul locașului + 1 (lângă o incrustație în V, chiar T-ul V-ului: conflict pe loc)')

SETURI = {
    'drept': ['test/unit/incrustatieDreapta.potrivire.test.ts', 'test/unit/incrustatieDreapta.refuzuri.test.ts', 'test/unit/incrustatieDreapta.dop.test.ts'],
    'drept2': ['test/unit/incrustatieDreapta.potrivire.test.ts', 'test/unit/incrustatieDreapta.refuzuri.test.ts', 'test/unit/incrustatieDreapta.dop.test.ts',
               'test/unit/incrustatieDreapta.rol.test.ts',
               'test/unit/incrustatieDreapta.scriere.test.ts', 'test/unit/documente.aur.test.ts', 'test/unit/buzunar.test.ts'],
    'doc': ['test/unit/document.v22.oracol.test.ts'],
    'doc2': ['test/unit/document.v22.oracol.test.ts', 'test/unit/documente.aur.test.ts', 'test/unit/document.oracol.test.ts'],
    'rol': ['test/unit/incrustatieDreapta.rol.test.ts', 'test/unit/rol.test.ts', 'test/unit/rolPersonal.test.ts'],
    'rol2': ['test/unit/incrustatieDreapta.rol.test.ts', 'test/unit/rol.test.ts', 'test/unit/rolPersonal.test.ts', 'test/unit/actiuni.test.ts'],
    'dialog': ['test/unit/incrustatieDreapta.scriere.test.ts'],
    'dialog2': ['test/unit/incrustatieDreapta.scriere.test.ts', 'test/unit/actiuni.test.ts'],
}
E2E = ['test/e2e/incrustatieDreapta.spec.ts']
