# Lista de otrăvuri a feliei 18.1↑d-1 (degroșarea reliefului: documentul v30, adaosul, lucrarea, rolul „Relief 3D”, rândul din
# fereastra exportului; ADR 0310 §4, §6, ADR 0313), 26.11.2026, alese de autor: ușa documentului (felul, câmpul `degrosare`,
# marginile lui, referințele, migrarea v29 → v30), nucleul degroșării (freza cotei de rază R + a, ridicarea cu a, refuzul
# adaosului, mesajul), lucrarea (ordinea, avertismentul, potrivirea cu finisarea, freza plată, câmpul pe alt fel, tăieturile pe
# contur, „cât foaia”, adaosul dus în CAM, resursele, același T), rolul (oferit, ordinea operațiilor, planul zero urmat, T-ul
# diferit, rolul personalizat, valorile îmbinate, finisarea de pornire) și interfața (câmpurile comune, fișa, rangul scris,
# rândul). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SD = 'src/model/schemaDocument.ts'
MG = 'src/model/migrari.ts'
RF = 'src/cam/reliefFinisare.ts'
JB = 'src/cam/job.ts'
FN = 'src/model/finisare.ts'
FF = 'src/model/formaFrezei.ts'
LU = 'src/model/lume.ts'
PF = 'src/cam/prinFoaie.ts'
RO = 'src/model/rol.ts'
RP = 'src/model/rolPersonal.ts'
CF = 'src/app/CampuriFinisare.tsx'
FI = 'src/ui/FisaFinisare.tsx'
EC = 'src/app/ExportConectat.tsx'

# ── Ușa documentului v30 ──────────────────────────────────────────────────────────────────────────────────────────
o('D01', SD, "  v.forward(v.check((o) => o.tip !== 'degrosare' || o.degrosare !== undefined, 'e cerut pe o degroșare'), ['degrosare']),\n", '', 'doc',
  'o degroșare fără câmpul `degrosare` trece de ușă')
o('D02', SD, "  v.forward(v.check((o) => o.tip !== 'degrosare' || o.pasLateral !== undefined, 'e cerut pe o degroșare'), ['pasLateral']),\n", '', 'doc',
  'o degroșare fără pasul lateral trece de ușă')
o('D03', SD, '    adaos: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(ADAOS_MAXIM)),', '    adaos: v.pipe(v.number(), v.finite(), v.maxValue(ADAOS_MAXIM)),', 'doc',
  'adaosul negativ primit')
o('D04', SD, '    adaos: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(ADAOS_MAXIM)),', '    adaos: v.pipe(v.number(), v.finite(), v.minValue(0)),', 'doc',
  'adaosul peste 10 mm primit')
o('D05', SD, "    adaos: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(ADAOS_MAXIM)),\n    unghi: v.pipe(v.number(), v.finite(), v.minValue(0), v.ltValue(180)),",
  "    adaos: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(ADAOS_MAXIM)),\n    unghi: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(180)),", 'doc',
  'unghiul de 180° primit pe degroșare')
o('D06', SD, "      if (contur !== undefined) return `${felul} ${o.id} din piesa ${p.id} referă ${contur}, care nu e un relief: ${felul} lucrează doar pe reliefuri`;\n",
  '', 'doc', 'o degroșare (și o finisare) pe un contur trece de ușă')
o('D07', SD, "    if (o.tip === 'finisare' || o.tip === 'degrosare') {", "    if (o.tip === 'finisare') {", 'doc',
  'o degroșare pe un relief e judecată ca o operație 2D')
o('D08', MG, "      if (o['tip'] === 'degrosare') return { ok: false, motiv: `${unde} e o degroșare, pe care v30 o aduce: nu e un document v29 valid` };\n", '', 'doc',
  'un v29 cu o degroșare migrat pe tăcute')
o('D09', MG, "      if (Object.hasOwn(o, 'degrosare')) return { ok: false, motiv: `${unde} are câmpul „degrosare”, pe care v30 îl folosește: nu e un document v29 valid` };\n",
  '', 'doc', 'un v29 cu câmpul `degrosare` migrat pe tăcute')
o('D10', MG, "  29: v29v30,\n", '', 'doc', 'migrarea v29 → v30 lipsă')

# ── Nucleul degroșării ───────────────────────────────────────────────────────────────────────────────────────────
o('C01', RF, "    { cota: { fel: 'plata', raza: o.raza + o.adaos }, ridicare: o.adaos, degrosare: true },",
  "    { cota: { fel: 'plata', raza: o.raza + o.adaos }, ridicare: 0, degrosare: true },", 'cam', 'adaosul doar pe orizontală (fără ridicare)')
o('C02', RF, "    { cota: { fel: 'plata', raza: o.raza + o.adaos }, ridicare: o.adaos, degrosare: true },",
  "    { cota: { fel: 'plata', raza: o.raza }, ridicare: o.adaos, degrosare: true },", 'cam', 'adaosul doar pe verticală (freza cotei de rază R)')
o('C03', RF, '    return m + so.ridicare;', '    return m;', 'cam', 'ridicarea uitată în cota segmentului')
o('C04', RF, "  if (!(o.adaos >= 0 && o.adaos <= ADAOS_MAXIM)) return", "  if (!(o.adaos <= ADAOS_MAXIM)) return", 'cam', 'adaosul negativ primit de CAM')
o('C05', RF, "      ? 'relieful nu coboară sub fața plăcii mai mult decât adaosul: degroșarea n-are ce tăia'",
  "      ? 'relieful n-are nimic sub fața plăcii: finisarea n-are ce tăia'", 'cam', 'mesajul degroșării fără nimic de tăiat spune finisarea')

# ── Lucrarea ─────────────────────────────────────────────────────────────────────────────────────────────────────
o('J01', FN, """    ...degrosariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'degrosare', f })),
    ...finisariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'finisare', f })),""", """    ...finisariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'finisare', f })),
    ...degrosariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'degrosare', f })),""", 'program', 'finisarea înaintea degroșării în ordinea automată')
o('J02', FN, "    ...degrosariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'degrosare', f })),\n", '', 'program',
  'degroșarea lipsește din program')
o('J03', JB, "    avertismente.push(`${fi.piesa}/${fi.operatie.id}: finisarea vine înaintea degroșării", "    void (`${fi.piesa}/${fi.operatie.id}: finisarea vine înaintea degroșării", 'program',
  'finisarea înaintea degroșării, nespusă')
o('J04', JB, "  if (nepotrivire) return { ok: false, motiv: nepotrivire };\n", '', 'program', 'planul zero sau marginea nepotrivite cu finisarea, primite')
o('J05', FN, '      if (vd?.planZero !== vf?.planZero) {', '      if (false) {', 'program', 'alt plan zero decât finisarea aceluiași relief, primit')
o('J06', FN, "      if (vd?.margine === 'trece' && vf?.margine !== 'trece') {", '      if (false) {', 'program',
  'degroșarea care trece de margine scoate peretele finisării')
o('J07', FF, "  if (tip === 'degrosare') return forma === undefined ? null : 'degrosare';", "  if (tip === 'degrosare') return null;", 'program',
  'o bilă sau un V primite pe degroșare')
o('J08', JB, "      if (o.degrosare !== undefined && o.tip !== 'degrosare') return `${unde}: valorile degroșării sunt doar ale unei degroșări a reliefului`;\n", '', 'program',
  'câmpul `degrosare` pe alt fel, nespus')
o('J09', LU, "      if (o.tip === 'finisare' || o.tip === 'degrosare') continue;", "      if (o.tip === 'finisare') continue;", 'program',
  'degroșarea tratată ca o tăietură pe contur')
o('J10', PF, " && o.tip !== 'degrosare' && o.incrustatie === 'fara' &&", " && o.incrustatie === 'fara' &&", 'hartie',
  'degroșarea cât foaia primește supracursa, în lucrare și pe hârtie')
o('J11', JB, '    const r = degrosareRelief({ ...comune, raza: D / 2, adaos: o.degrosare?.adaos ?? 0 });', '    const r = degrosareRelief({ ...comune, raza: D / 2, adaos: 0 });', 'program',
  'adaosul documentului nu ajunge în CAM')
o('J12', FN, '  for (const f of [...degrosariFoaie(doc, indexFoaie), ...finisariFoaie(doc, indexFoaie)]) for (const r of f.reliefuri)',
  '  for (const f of finisariFoaie(doc, indexFoaie)) for (const r of f.reliefuri)', 'program', 'dalele unui relief doar degroșat nu ajung în worker')
o('J13', JB, '  const finisari = [...degrosariFoaie(doc, 0), ...finisariFoaie(doc, 0)];', '  const finisari = finisariFoaie(doc, 0);', 'program',
  'freza degroșării lipsește din judecata „același T”')

# ── Rolul „Relief 3D” ────────────────────────────────────────────────────────────────────────────────────────────
o('R01', RO, "['finisare', 'relief3d'] : [];", "['finisare'] : [];", 'rol', 'rolul „Relief 3D” nu e oferit')
# R02 (operațiile rolului în ordinea greșită, în `grupeRol`) a fost scoasă: echivalentă. Recunoașterea (`impartire`) sortează
# împărțirea, iar operațiile rolului „Relief 3D” le face `operatiiRelief3d`, nu grupele (proba ordinii: `rol.degrosare.test.ts`).
o('R03', RO, "  if (vf?.planZero !== undefined) valori['planZero'] = vf.planZero;\n", '', 'rol', 'planul zero al degroșării nu urmează finisarea')
o('R04', RO, '  const luate = [...sculeProiect(doc, new Set([p.id])), fin.scula];', '  const luate = [...sculeProiect(doc, new Set([p.id]))];', 'rol',
  'freza plată ia numărul bilei finisării')
o('R05', RP, "    if (baza === 'relief3d') return { ok: false, motiv: 'invalid' };\n", '', 'rol', 'rolul personalizat din „Relief 3D” refuzat cu alt motiv')
o('R06', FN, "    if (x === null) delete d[k];\n    else d[k] = x;", '    d[k] = x;', 'rol', '`null` nu scoate câmpul degroșării')
o('R07', RO, "  const finPiesei = rol === 'finisare' ? p.operatii.find((o) => o.tip === 'finisare') : undefined;", '  const finPiesei = undefined;', 'rol',
  'înapoi la finisare, finisarea își pierde valorile și id-ul')
o('R08', RO, "incrustatie: incVechi, finisare: finVechi, degrosare: _deg, ...necunoscute", "incrustatie: incVechi, finisare: finVechi, ...necunoscute", 'rol',
  'câmpul degroșării trece în finisarea făcută din ea')

# ── Interfața și fereastra exportului (e2e) ──────────────────────────────────────────────────────────────────────
o('E01', CF, "  const scrieAmbele = (v: Pick<SchimbareFinisare, 'margine' | 'planZero'>): RezultatActiune => scrie((o) => cuDegrosare(cuFinisare(o, v), v));",
  "  const scrieAmbele = (v: Pick<SchimbareFinisare, 'margine' | 'planZero'>): RezultatActiune => scrie((o) => cuFinisare(o, v));", 'e2e',
  'planul zero scris doar pe finisare (degroșarea refuzată)')
o('E02', FI, "            {deg\n              ? rand(", "            {false\n              ? rand(", 'e2e', 'fișa degroșării arată creasta, nu adaosul')
o('E03', EC, "        if (o.tip === 'finisare' || o.tip === 'degrosare') {", "        if (o.tip === 'finisare') {", 'e2e',
  'Exportă nu scrie rangul degroșării în „A mea”')
o('E04', EC, "    const peRelief = (o: Operatie): boolean => o.tip === 'finisare' || o.tip === 'degrosare';",
  "    const peRelief = (o: Operatie): boolean => o.tip === 'finisare';", 'e2e', 'rândul degroșării lipsește din fereastră')

SETURI = {
    'doc': ['test/unit/document.v30.oracol.test.ts'],
    'cam': ['test/unit/reliefDegrosare.test.ts'],
    'program': ['test/unit/degrosare.program.test.ts'],
    'hartie': ['test/unit/export.hartie.test.ts'],
    'rol': ['test/unit/rol.degrosare.test.ts'],
}

E2E = ['test/e2e/degrosare.spec.ts']
