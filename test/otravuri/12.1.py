# Lista de otrăvuri a feliei 12.1↑ (incrustația în V, ADR 0170), 07.11.2026, alese de autor: adâncimea de start a V-carve-ului,
# dopul (oglinda, semifabricatul, originea, jocul și fierăstrăul, regiunea și fâșia pentru freza dreaptă), refuzurile, ușa
# documentului v20 (ciocnirea, schema), cheia grupării, rolul (jocul, fierăstrăul, fundul plat), fereastra exportului și
# panoul; plus cele de interfață prin e2e (rândul ferestrei, descărcarea dopului, numele lui, panoul, arborele).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


VC = 'src/cam/vcarve.ts'
INC = 'src/cam/incrustatie.ts'
MOD = 'src/model/incrustatie.ts'
JOB = 'src/cam/job.ts'
LUM = 'src/model/lume.ts'
MIG = 'src/model/migrari.ts'
SCH = 'src/model/schemaDocument.ts'
ROL = 'src/model/rol.ts'
CAL = 'src/jobs/calculCam.ts'
VAL = 'src/app/valoriOperatii.ts'
DLG = 'src/ui/DialogExport.tsx'
CON = 'src/app/ExportConectat.tsx'
APP = 'src/app/App.tsx'
PAN = 'src/app/PanouProprietati.tsx'
ARB = 'src/ui/NivelPiesa.tsx'

# ---- Adâncimea de start a V-carve-ului (ADR 0170 §3) ----
o('V01', VC, '  const S = p.adancimeStart ?? 0;', '  const S = 0;', 'inc', 'adâncimea de start ignorată (dopul săpat ca o cavitate)')
o('V02', VC, 'wP = (D - S) * tan, wD = a + wP;', 'wP = D * tan, wD = a + wP;', 'inc', 'peretele de la −D pus ca fără adâncime de start')
o('V03', VC, '-Math.min(D, S + (q[2] - a) * cot)', '-Math.min(D, S + 0.02 + (q[2] - a) * cot)', 'inc', 'adâncimea de start cu 0,02 mai jos')
o('V04', VC, '-Math.min(D, S + (q[2] - a) * cot)', '-Math.min(D, S - 0.02 + (q[2] - a) * cot)', 'inc', 'adâncimea de start cu 0,02 mai sus')
o('V05', VC, '  const adancimeMax = Math.min(D, S + (razaMax - a) * cot);', '  const adancimeMax = Math.min(D, (razaMax - a) * cot);',
  'inc', 'adâncimea cea mai mare a regiunii fără S (trecerile se opresc prea sus)')
o('V06', VC, '      const w = Math.max(0, nivel - S) * tan + MARJA_FUND;', '      const w = Math.max(0, nivel - S - 0.5) * tan + MARJA_FUND;',
  'inc', 'freza dreaptă prea aproape de pereți (fundul plat începe cu 0,5·t mai aproape)')
o('V07', VC, '  if (!(S >= 0 && S < p.adancime)) return', '  if (!(S >= 0)) return', 'inc', 'adâncimea de start cât D sau peste, primită')

# ---- Dopul: oglinda, semifabricatul, originea, jocurile, regiunea ----
o('P01', INC, '    const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };', '    const oglinda = { a: 1, b: 0, c: 0, d: -1, e: m - x0, f: y1 + m };',
  'inc', 'oglinda pe Y, nu pe X')
o('P02', INC, '    const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };', '    const oglinda = { a: 1, b: 0, c: 0, d: 1, e: m - x0, f: m - y0 };',
  'inc', 'dopul neoglindit')
o('P03', INC, '    const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 };', '    const oglinda = { a: -1, b: 0, c: 0, d: 1, e: x1 + m, f: m - y0 + 0.5 };',
  'inc', 'originea semifabricatului mutată cu 0,5 pe Y')
o('P04', INC, '    const latime = x1 - x0 + 2 * m, inaltime = y1 - y0 + 2 * m;', '    const latime = x1 - x0 + m, inaltime = y1 - y0 + 2 * m;',
  'inc', 'lățimea semifabricatului cu o singură margine')
o('P05', MOD, '  const S = op.adancime - i.joc, H = i.fierastrau,', '  const S = op.adancime, H = i.fierastrau,', 'inc', 'jocul pentru clei neaplicat')
o('P06', INC, 'adancime: val.S + val.H, adancimeStart: val.S,', 'adancime: val.S + val.H / 2, adancimeStart: val.S,', 'inc', 'dopul săpat doar cu H/2 sub S')
o('P07', INC, 'adancime: val.S + val.H, adancimeStart: val.S,', 'adancime: val.S + val.H, adancimeStart: 0,', 'inc', 'dopul fără adâncimea de start')
o('P08', INC, 'conturDreptunghi(-e, -e, latime + 2 * e, inaltime + 2 * e)', 'conturDreptunghi(0, 0, latime, inaltime)',
  'inc', 'regiunea cât semifabricatul: peretele V de pe margine cade în lemn (o ramă)')
o('P09', INC, 'fp.scula.diametru + 2 * w - m + TRECERE_FUND);', '2 * w - m + TRECERE_FUND);', 'e2e',
  'regiunea lărgită fără freza dreaptă: Ø6 nu mai trece pe lângă dop, fâșia o curăță V-ul (creasta între plăci)')
o('P10', MOD, 'grosimeMinima: S + H + SUB_FATA_DOPULUI };', 'grosimeMinima: S + H };', 'e2e', 'grosimea semifabricatului fără milimetrul de sub față')
o('P11', CAL, "    const ed = await exporta(d.program, { foaie: semifabricat, origine: p.origine, z0: 'sus' }, contract, {",
  "    const ed = await exporta(d.program, { foaie: semifabricat, origine: p.origine, z0: 'jos' }, contract, {", 'inc', 'Z0 al dopului pe fața de jos')
o('P12', CAL, '  return m ? `${m[1]}-dop-${k + 1}${m[2]}` : `dop-${k + 1}-${nume}`;', '  return m ? `${m[1]}${m[2]}` : `dop-${k + 1}-${nume}`;',
  'e2e', 'fișierul dopului cu numele foii (descărcarea o suprascrie)')

# ---- Refuzurile (ADR 0170 §4) ----
o('R01', INC, '  if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) {', '  if (!(i.joc >= 0)) {', 'inc', 'jocul sub 0,1 primit')
o('R02', INC, '  if (!(i.joc < op.adancime)) return', '  if (!(i.joc <= op.adancime)) return', 'inc', 'jocul cât adâncimea primit')
o('R03', INC, '  if (pana > con + 1e-9) {', '  if (pana > con + 1) {', 'inc', 'dopul săpat peste con primit')
o('R04', INC, '  if (f.varf !== undefined && f.varf > 0) {', '  if (f.varf !== undefined && f.varf > 1) {', 'inc', 'freza cu vârf plat primită')
o('R05', INC, "  if (i.jurDop === 'banda') return", "  if (i.jurDop === 'bandă') return", 'inc', 'banda (12.1↑c) primită')
o('R06', INC, '  if (!op.fundPlat) {', '  if (false) {', 'inc', 'dopul fără freza dreaptă primit')
o('R07', INC, "  if (op.tip !== 'vcarve') return", "  if (op.tip === 'buzunar') return", 'inc', 'incrustația pe un profil primită')
o('R08', JOB, '    const r = op ? refuzIncrustatie(op, t.idLume) : null;', '    const r = null;', 'inc',
  'lucrarea nu judecă incrustația înaintea traseului (locașul se taie, dopul cade)')

# ---- Gruparea și ușa documentului ----
o('G01', LUM, '    fundPlat: o.fundPlat ?? null, incrustatie: o.incrustatie ?? null,', '    fundPlat: o.fundPlat ?? null,', 'inc',
  'cheia V-carve-ului fără incrustație: o incrustație se unește cu un V-carve obișnuit')
o('G02', JOB, 'fundPlat: operatieDe(u)?.fundPlat, incrustatie: operatieDe(u)?.incrustatie })}', 'fundPlat: operatieDe(u)?.fundPlat })}', 'inc',
  'gruparea lucrării fără incrustație')
o('D01', MIG, "      if (typeof o === 'object' && o !== null && Object.hasOwn(o, 'incrustatie')) {", '      if (false) {', 'doc',
  'ciocnirea v19 → v20 nedetectată (o incrustație veche luată drept nouă)')
o('D02', SCH, "    jurDop: v.picklist(['fata', 'banda']),", '    jurDop: v.string(),', 'doc', 'orice text ca lemnul din jurul dopului')
o('D03', SCH, '    margine: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(PLAFON.latura)),',
  '    margine: v.pipe(v.number(), v.finite(), v.maxValue(PLAFON.latura)),', 'doc', 'marginea negativă primită')
o('D04', SCH, '    fierastrau: pozitiv(PLAFON.adancimeOperatie),', '    fierastrau: v.number(),', 'doc', 'fierăstrăul zero sau negativ primit')

# ---- Rolul (ADR 0170 §5) ----
o('L01', ROL, '  const joc = Math.min(i.joc, Math.max(JOC_INCRUSTATIE_MINIM, Math.floor((adancime / 2) * 1000) / 1000));', '  const joc = i.joc;',
  'rol', 'jocul nestrâns pe un locaș mai puțin adânc decât dublul lui')
o('L02', ROL, '  return { ...i, joc, fierastrau: loc > 0 ? Math.min(i.fierastrau, loc) : i.fierastrau };', '  return { ...i, joc, fierastrau: i.fierastrau };',
  'rol', 'fierăstrăul nestrâns la ce lasă conul')
o('L03', ROL, "  const fundPlat = rol !== 'incrustatie' ? undefined : fundVechi ?? {", "  const fundPlat = rol !== 'incrustatie' ? undefined : {",
  'rol', 'fundul plat de dinainte ignorat la rolul ales din nou')

# ---- Fereastra exportului, panoul, arborele (e2e) ----
o('E01', CON, "            incrustatie: o.incrustatie?.fel === 'v'\n", "            incrustatie: null && o.incrustatie?.fel === 'v'\n", 'e2e', 'rândul ferestrei nu primește incrustația din document')
o('E02', APP, '        for (const d of dopuri) descarca(d.octeti, d.nume);', '', 'e2e', 'fișierul dopului nedescărcat')
o('E03', VAL, '      ...(incrustatie ? { incrustatie } : {}),', '', 'e2e', 'Exportă scoate incrustația din proiect')
o('E04', VAL, "v.incrustatie ? { ...(o.incrustatie?.fel === 'v' ? o.incrustatie : {}), ...v.incrustatie, fel: 'v' as const } : undefined;",
  "v.incrustatie ? { ...v.incrustatie, fel: 'v' as const } : undefined;", 'dialog', 'un câmp necunoscut al incrustației pierdut la Exportă')
o('E05', DLG, '      const joc = citesteNumar(p.jocInc), fierastrau = p.acelasiSpatiu ? joc : citesteNumar(p.fierastrauInc),',
  '      const joc = citesteNumar(p.jocInc), fierastrau = citesteNumar(p.fierastrauInc),', 'e2e', '„Același spațiu” bifat nu scrie jocul ca fierăstrău')
o('E06', DLG, "v === 'incrustatie' ? { ...fara, tip: 'vcarve', incrustatie: true, fundPlat: true }", "v === 'incrustatie' ? { ...fara, tip: 'vcarve', incrustatie: true }",
  'e2e', 'incrustația aleasă în fereastră fără fundul plat')
o('E07', PAN, '(o.incrustatie ? { ...o, incrustatie: { ...o.incrustatie, ...v } } : o)', '(o)', 'e2e', 'panoul nu scrie jocurile')
o('E08', ARB, "              {o.tip === 'vcarve' && o.incrustatie?.fel === 'v' && t('arbore.vcarve.incrustatie', { joc: n(o.incrustatie.joc) })}", '', 'e2e',
  'arborele nu spune incrustația')

SETURI = {
    'inc': ['test/unit/incrustatie.potrivire.test.ts', 'test/unit/vcarve.start.test.ts', 'test/unit/incrustatie.refuzuri.test.ts'],
    'inc2': ['test/unit/incrustatie.potrivire.test.ts', 'test/unit/vcarve.start.test.ts', 'test/unit/vcarve.test.ts', 'test/unit/vcarve.fund.test.ts',
             'test/unit/incrustatie.rol.test.ts', 'test/unit/documente.aur.test.ts'],
    'doc': ['test/unit/document.v21.oracol.test.ts'],
    'doc2': ['test/unit/document.v21.oracol.test.ts', 'test/unit/documente.aur.test.ts', 'test/unit/document.oracol.test.ts'],
    'rol': ['test/unit/incrustatie.rol.test.ts', 'test/unit/rol.test.ts'],
    'rol2': ['test/unit/incrustatie.rol.test.ts', 'test/unit/rol.test.ts', 'test/unit/actiuni.test.ts'],
    'dialog': ['test/unit/actiuni.test.ts', 'test/unit/incrustatie.scriere.test.ts'],
    'dialog2': ['test/unit/actiuni.test.ts', 'test/unit/incrustatie.potrivire.test.ts'],
}
E2E = ['test/e2e/incrustatie.spec.ts']
