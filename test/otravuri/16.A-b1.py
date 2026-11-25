# Lista de otrăvuri a feliei 16.A↑b-1 (documentul v27 și valorile frezei în program; ADR 0300 §5), 24.11.2026, alese de
# autor: ușa (originea, valorile, tăișul; plafoanele), migrarea v26 → v27 (ciocnirea pe fiecare loc al frezei), valorile în
# program (turația la pornire și la schimbare, avansul și plonjarea pe fiecare loc: profilul, buzunarul, liniile paralele,
# frezele de rest, găurirea, V-carve-ul, fundul plat și restul lui, dopul în V), conflictul de turații pe același T și tăișul.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/model/document.ts'
SD = 'src/model/schemaDocument.ts'
MG = 'src/model/migrari.ts'
RF = 'src/cam/regimFreza.ts'
J = 'src/cam/job.ts'
VC = 'src/cam/vcarve.ts'
DV = 'src/cam/dopV.ts'

# Ușa și migrarea (unitare: oracolul v27, corpusul de aur).
o('U01', SD, "id: Id, rev: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(PLAFON.revFreza)),",
  "id: Id, rev: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(PLAFON.revFreza)),", 'doc', 'versiunea 0 a originii trece')
o('U02', SD, "turatie: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(PLAFON.regimFreza)),",
  "turatie: v.pipe(v.number(), v.minValue(1), v.maxValue(PLAFON.regimFreza)),", 'doc', 'o turație zecimală trece')
o('U03', SD, "    plonjare: pozitiv(PLAFON.regimFreza),\n", "    plonjare: v.optional(pozitiv(PLAFON.regimFreza)),\n", 'doc',
  'valorile fără plonjare trec')
o('U04', SD, "  tais: v.optional(pozitiv(PLAFON.adancimeOperatie)),\n", "  tais: v.optional(v.number()),\n", 'doc',
  'un tăiș negativ trece')
o('U05', SD, "  biblioteca: v.optional(v.looseObject({\n    id: Id,", "  biblioteca: v.optional(v.looseObject({\n    id: v.string(),", 'doc',
  'un id de origine cu spații trece')
o('U06', D, '  regimFreza: 100_000,', '  regimFreza: 1_000_000,', 'doc', 'turația de 100 001 trece')
o('U07', MG, "  lista('rest', op['rest']);\n", '', 'doc', 'un v26 cu valori pe o freză de rest urcă fără ciocnire')
o('U08', MG, "    if (ob(b)) scula('incrustatie.banda.freza', b['freza']);\n", '', 'doc',
  'un v26 cu tăișul pe freza benzii urcă fără ciocnire')
o('U09', MG, "  if (ob(fp)) { scula('fundPlat.scula', fp['scula']); lista('fundPlat.rest', fp['rest']); }",
  "  if (ob(fp)) { scula('fundPlat.scula', fp['scula']); }", 'doc', 'un v26 cu valori pe o freză de rest a fundului urcă fără ciocnire')
o('U10', MG, "        for (const camp of ['biblioteca', 'regim', 'tais']) {", "        for (const camp of ['biblioteca', 'regim']) {", 'doc',
  'un v26 cu tăișul pe freză urcă fără ciocnire')
o('U11', MG, "  return { ok: true, doc: { ...doc, schema: 27 } };", "  return { ok: true, doc: { ...doc } };", 'doc',
  'migrarea nu schimbă numărul')

# Valorile în program (unitare: `freze.program.test.ts`).
o('C01', RF, '  return r ? { turatie: r.turatie, avans: r.avans, avansPlonjare: r.plonjare, zSigur: baza.zSigur } : baza;',
  '  return baza;', 'cam', 'valorile frezei sunt ignorate')
o('C02', RF, 'avansPlonjare: r.plonjare, zSigur: baza.zSigur', 'avansPlonjare: r.avans, zSigur: baza.zSigur', 'cam',
  'plonjarea coboară cu avansul')
o('C03', J, "    miscari.push({ tip: 'schimba-scula', scula: curenta, turatie: regimFrezei(s, regim).turatie });",
  "    miscari.push({ tip: 'schimba-scula', scula: curenta, turatie: regim.turatie });", 'cam', 'schimbarea pornește axul cu turația lucrării')
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('C04', J, 'turatie: regimFrezei(initialaDoc ?? primaScula, regim).turatie, zSigur: regim.zSigur, miscari,', 'turatie: regimFrezei(primaScula, regim).turatie, zSigur: regim.zSigur, miscari,', 'cam',
  'antetul ia turația primei tăieturi, nu a primei freze montate (fundul plat)')
o('C05', J, "            diametru: fp.scula.diametru, pasLateral: fp.pasLateral, sens: t.sens, ...avansuri(fp.scula),",
  "            diametru: fp.scula.diametru, pasLateral: fp.pasLateral, sens: t.sens,", 'cam', 'fundul plat taie cu avansul V-ului')
o('C06', J, "rest: fp.rest.map((r) => ({ diametru: r.scula.diametru, pasLateral: r.pasLateral, ...avansuri(r.scula) }))",
  "rest: fp.rest.map((r) => ({ diametru: r.scula.diametru, pasLateral: r.pasLateral }))", 'cam', 'restul fundului taie cu avansul V-ului')
o('C07', J, "        avans: rv.avans, avansPlonjare: rv.avansPlonjare, zSigur: regim.zSigur,",
  "        avans: regim.avans, avansPlonjare: regim.avansPlonjare, zSigur: regim.zSigur,", 'cam', 'V-ul taie cu avansul lucrării')
o('C08', J, "trigonometric: t.sens === 'urcare', ...regimFrezei(t.scula, regim),", "trigonometric: t.sens === 'urcare', ...regim,", 'cam',
  'găurirea taie cu regimul lucrării')
o('C09', J, "const tp = traseuParalel(contur, { ...regimFrezei(t.scula, regim), sens", "const tp = traseuParalel(contur, { ...regim, sens", 'cam',
  'liniile paralele taie cu regimul lucrării')
o('C10', J, "ordineInele(inele.radacini), { ...regimFrezei(t.scula, regim), sens", "ordineInele(inele.radacini), { ...regim, sens", 'cam',
  'inelele buzunarului taie cu regimul lucrării')
o('C11', J, "bucati: b.bucati })), regimFrezei(r.scula, regim));", "bucati: b.bucati })), regimFrezei(t.scula, regim));", 'cam',
  'freza de rest taie cu valorile frezei buzunarului')
o('C12', J, "    const tr = traseuProfil(treceri, regimFrezei(t.scula, regim), urechi,", "    const tr = traseuProfil(treceri, regim, urechi,", 'cam',
  'profilul taie cu regimul lucrării')
o('C13', J, "      if (ts !== tu) {\n", "      if (ts !== tu && false) {\n", 'cam', 'același T cu două turații trece')
o('C14', J, "  if (peste) return { ok: false, motiv: peste };\n  return { ok: true, program", "  return { ok: true, program", 'cam',
  'adâncimea peste tăiș trece')
o('C15', VC, "avans: f.avans ?? p.avans, avansPlonjare: f.avansPlonjare ?? p.avansPlonjare, sens: f.sens",
  "avans: p.avans, avansPlonjare: p.avansPlonjare, sens: f.sens", 'cam', 'fundul plat ignoră avansurile frezei lui')
o('C16', VC, "avans: r?.avans ?? p.avans, avansPlonjare: r?.avansPlonjare ?? p.avansPlonjare", "avans: p.avans, avansPlonjare: p.avansPlonjare", 'cam',
  'restul fundului ignoră avansurile frezei lui')
o('C17', RF, '    if (f?.tais === undefined || !(adancime > f.tais + 1e-9)) continue;', '    if (f?.tais === undefined || !(adancime >= f.tais)) continue;',
  'cam', 'adâncimea egală cu tăișul e refuzată')
o('C18', RF, "    if ((m.tip !== 'taiere' && m.tip !== 'arc') || m.la.Z === undefined) continue;",
  "    if (m.tip !== 'arc' || m.la.Z === undefined) continue;", 'cam', 'coborârile drepte nu se judecă la tăiș')
o('C19', RF, "    if (m.tip === 'schimba-scula') { n = m.scula.numar; continue; }", "    if (m.tip === 'schimba-scula') { continue; }", 'cam',
  'tăișul se judecă pe prima freză, oricare ar fi montată')
o('C20', DV, "      pas: op.pas, avans: rv.avans, avansPlonjare: rv.avansPlonjare, zSigur: regim.zSigur,",
  "      pas: op.pas, avans: regim.avans, avansPlonjare: regim.avansPlonjare, zSigur: regim.zSigur,", 'cam', 'pereții dopului taie cu regimul lucrării')
o('C21', DV, "          diametru: fp.scula.diametru, pasLateral: fp.pasLateral, sens: op.sens, ...avansuri(fp.scula),",
  "          diametru: fp.scula.diametru, pasLateral: fp.pasLateral, sens: op.sens,", 'cam', 'fundul dopului taie cu avansul V-ului')
o('C22', DV, "turatie: regimFrezei(montate.values().next().value ?? op.scula, regim).turatie", "turatie: regim.turatie", 'cam',
  'dopul pornește cu turația lucrării')
o('C23', DV, "    if (peste) return { ok: false, motiv: `${t.idLume}, dopul: ${peste}` };\n", '', 'cam',
  'tăișul nu se judecă pe dopul în V')

SETURI = {
    'doc': ['test/unit/document.v27.oracol.test.ts', 'test/unit/documente.aur.test.ts'],
    'cam': ['test/unit/freze.program.test.ts'],
}
