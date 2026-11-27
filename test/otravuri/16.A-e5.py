# Lista de otrăvuri a feliei 16.A↑e-5 (buzunarul cu bila și cu toroidala; ADR 0303 §4), 27.11.2026, aleasă de autor: regula
# formei pe buzunar (fără rest, fără incrustație cu pereți drepți), refuzurile lucrării, creasta pe hârtie (silueta, între inele,
# cel mult), creasta pe plan a reliefului, lista din Tăierea, regula rândului din fereastră, rândul „pe hârtie”, oracolul
# buzunarului (silueta rotundă, refuzul, judecata fundului) și, în fereastră, lista formei pe buzunar. Se rulează cu
# `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (setul `e2e` cere `.tmp/pw.config.ts` în clonă).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'
CR = 'src/model/creasta.ts'
FN = 'src/model/finisare.ts'
AF = 'src/model/alegereFreza.ts'
ER = 'src/ui/exportRand.ts'
HE = 'src/app/hartieExport.ts'
OB = 'test/oracles/buzunar.ts'
FO = 'src/ui/FisaOperatie.tsx'

# ── Regula și lucrarea ───────────────────────────────────────────────────────────────────────────────────────────────
o('E01', FF, "  if (rotunda && tip === 'buzunar') {", "  if (false) {", 'm', 'buzunarul refuză iar bila și toroidala')
o('E02', FF, "    if ((o?.rest?.length ?? 0) > 0) return 'rotunda-rest';\n", '', 'm',
  'o freză rotundă primită pe un buzunar cu freze de rest (geometria lor e a frezei plate)')
o('E03', FF, "    if (o?.incrustatie?.fel === 'drept') return 'rotunda-incrustatie';\n", '', 'm',
  'o freză rotundă primită pe o incrustație cu pereți drepți')
o('E04', JB, "      if (rotunda(o.scula) && motivRotunda === 'rotunda-rest') {", "      if (false) {", 'm',
  'lucrarea taie buzunarul cu bila și cu frezele de rest (lanțul de rest presupune freza plată)')
o('E05', JB, "        if (scula.forma?.tip === 'toroidala' && !(cale === 'scula' && motivRotunda === null)) {",
  "        if (scula.forma?.tip === 'toroidala' && !(cale === 'scula')) {", 'm',
  'toroidala primită ca freză a operației oriunde (profilul pe o parte, găurirea)')
# ── Creasta pe hârtie ────────────────────────────────────────────────────────────────────────────────────────────────
o('E06', CR, "    return r <= a ? 0 : rho - Math.sqrt(Math.max(0, rho * rho - (r - a) * (r - a)));",
  "    return rho - Math.sqrt(Math.max(0, rho * rho - r * r));", 'm', 'silueta toroidalei fără discul plat (ca o bilă de rază ρ)')
o('E07', CR, "  return { intreInele: inaltimeFreza(s, pasLateral / 2), maxima: inaltimeFreza(s, pasLateral) };",
  "  return { intreInele: inaltimeFreza(s, pasLateral / 2), maxima: inaltimeFreza(s, pasLateral / 2) };", 'm',
  'creasta cea mai mare spusă ca cea dintre inele (colțurile inelelor și mijlocul uitate)')
o('E08', CR, "  if (!(pasLateral > 0 && pasLateral <= s.diametru / 2)) return null;",
  "  if (!(pasLateral > 0 && pasLateral <= s.diametru)) return null;", 'm', 'creasta spusă și pentru un pas peste rază')
o('E09', FN, "  return inaltimeFreza(s, pasLateral / 2);", "  return inaltimeFreza(s, pasLateral);", 'm',
  'creasta pe plan a reliefului socotită la pasul întreg')
# ── Listele și fereastra ─────────────────────────────────────────────────────────────────────────────────────────────
o('E10', AF, "    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma, o) === null && (!cuRand(o) || formaPeRand(forma)));",
  "    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null && (!cuRand(o) || formaPeRand(forma)));", 'm',
  'Tăierea oferă bila pe un buzunar cu freze de rest (lucrarea ar refuza abia la export)')
o('E11', ER, "  return p.tip === 'buzunar' && p.rest.length === 0 && !p.incrustatieDreapta;",
  "  return p.tip === 'buzunar';", 'm', 'fereastra lasă bila pe un buzunar cu freze de rest')
o('E12', HE, "    const rotunda = f?.tip === 'bila' || f?.tip === 'toroidala';", "    const rotunda = true;", 'm',
  'creasta spusă și pentru freza plată')
# ── Oracolul buzunarului ─────────────────────────────────────────────────────────────────────────────────────────────
o('E13', OB, "  if (s.forma?.tip === 'bila') so = { tip: 'bila', diametru: D };\n", '', 'o',
  'oracolul judecă bila ca o freză plată (trecerile și fundul fără siluetă)')
o('E14', OB, "  if (rotunda(op.scula.forma) && (op.rest ?? []).length > 0) rez.push(`${b.id}: frezele de rest după o freză ${op.scula.forma?.tip === 'bila' ? 'bilă' : 'toroidală'}`);\n",
  '', 'o', 'oracolul nu mai prezice refuzul frezelor de rest după o bilă')
o('E15', OB, "          if (dq <= R) creasta = Math.max(creasta, ps.h(dq));", "          if (dq <= s) creasta = Math.max(creasta, ps.h(dq));", 'o',
  'oracolul măsoară creasta doar pe punctele deja la cel mult s (judecata nu mai poate cădea)')
o('E16', OB, "  if (rotunda && creasta > creastaLimita + TOL.rotunjire) raport(", "  if (false) raport(", 'o',
  'oracolul nu mai judecă fundul')
# ── Fereastra (e2e) ──────────────────────────────────────────────────────────────────────────────────────────────────
o('E17', FO, "  const peLinieRotunda = (p.tip === 'profil' && p.latura === 'pe-linie') || p.tip === 'buzunar';",
  "  const peLinieRotunda = p.tip === 'profil' && p.latura === 'pe-linie';", 'e2e', 'bila și toroidala lipsesc din lista formei pe buzunar')

SETURI = {
    'm': ['test/unit/buzunar.rotunda.test.ts', 'test/unit/alegereFreza.test.ts', 'test/unit/canelura.rotunda.test.ts',
          'test/unit/toroidala.lucrare.test.ts', 'test/unit/finisare.bila.test.ts'],
    'o': ['test/unit/buzunar.oracol.test.ts'],
}

E2E = ['test/e2e/export.rotunda.spec.ts']
