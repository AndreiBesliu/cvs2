# Lista de otrăvuri a feliei 11.3↑e (urechile „unde ține”, ADR 0211, varianta b), 22.11.2026, alese de autor: fundul foii
# (umplerea din margine), locul bun (marginea foii, partea de care ține urechea pe dinafară și pe dinăuntru, sensul, arcele,
# lemnul cerut), centrele bune (palierul), alegerea (cât încap, golul cel mai mare, pornirea din mijlocul seriei), locurile
# egale (și fără ele, cu intrări), lucrarea (refuzurile, prima trecere fără urechi, avertismentul, centrele, semnele), cele
# două treceri (exportul, traseul, vederea 3D), operația piesei desprinse și butonul, scrierea ferestrei și interfața (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (în cloud: docs/lucru-in-cloud.md,
# „Otrăvurile”; e2e-ul, cu configul repo-ului, pe 4173).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DS = 'src/sim/desprinse.ts'
UL = 'src/cam/urechiLemn.ts'
JB = 'src/cam/job.ts'
CC = 'src/jobs/calculCam.ts'
PU = 'src/cam/partiUrechi.ts'
EC = 'src/ui/actiuniExportCalcul.ts'
VO = 'src/app/valoriOperatii.ts'
DE = 'src/ui/DialogExport.tsx'

# Fundul foii (unitare: placa 11 la 5 mm, proba pe G-code).
o('F01', DS, '    if (i > 0) pune(k - 1);\n', '', 'lemn', 'umplerea din margine nu trece spre stânga')
o('F02', DS, '    if (s[k] === LEMN) { s[k] = LEGAT; coada[capat++] = k; }', '    if (s[k] !== LEGAT) { s[k] = LEGAT; coada[capat++] = k; }', 'lemn',
  'umplerea trece și prin tăieturi')
o('F03', DS, '    if (i < nx - 1) pune(k + 1);\n', '', 'lemn', 'umplerea din margine nu trece spre dreapta')
# Locul bun (unitare: fundul de hârtie, arcele).
o('L01', UL, '  if (!(i >= 0 && i < f.nx && j >= 0 && j < f.ny)) return FUND_TAIAT;', '  if (!(i >= 0 && i < f.nx && j >= 0 && j < f.ny)) return FUND_LEGAT;',
  'lemn', 'în afara foii e lemn legat')
o('L02', UL, "  const semn = (sens === 'urcare' ? 1 : -1) * (latura === 'exterior' ? 1 : -1);", "  const semn = latura === 'exterior' ? 1 : -1;", 'lemn',
  'sensul nu mai spune partea deșeului')
o('L03', UL, "  const semn = (sens === 'urcare' ? 1 : -1) * (latura === 'exterior' ? 1 : -1);", "  const semn = sens === 'urcare' ? 1 : -1;", 'lemn',
  'pe dinăuntru, urechea ține tot spre deșeu (miezul)')
o('L04', UL, '(v: number): boolean => v !== FUND_TAIAT;', '(v: number): boolean => v === FUND_LEGAT;', 'lemn', 'pe dinăuntru, piesa trebuie legată de foaie')
o('L05', UL, '(v: number): boolean => v === FUND_LEGAT :', '(v: number): boolean => v !== FUND_TAIAT :', 'lemn', 'pe dinafară ține și lemnul nelegat')
o('L06', UL, '      tx = -Math.sin(w) * sg;\n      ty = Math.cos(w) * sg;', '      tx = -Math.sin(w);\n      ty = Math.cos(w);', 'lemn',
  'pe un arc în sensul acelor, normala întoarsă')
o('L07', UL, '    if (cere(fundSub(fund, px - semn * ty * departe, py + semn * tx * departe))) bune[i] = 1;',
  '    if (cere(fundSub(fund, px - semn * ty * departe / 2, py + semn * tx * departe / 2))) bune[i] = 1;', 'lemn', 'palierul dus doar cât raza')
# Centrele bune și alegerea (unitare: pe hârtie).
o('C01', UL, '    if ((pre[b + 1] as number) - (pre[a] as number) === 2 * w + 1) rez[i] = 1;', '    if ((pre[b + 1] as number) - (pre[a] as number) > 0) rez[i] = 1;',
  'lemn', 'un centru e bun cu o singură mostră bună în palier')
o('C02', UL, '  const centre = centreBune(bune, Math.floor(W / 2 / pas + 1e-9));', '  const centre = centreBune(bune, 0);', 'lemn', 'palierul nu contează')
o('C03', UL, '  while (k >= 1 && porniri(k, golMinim).length === 0) k--;', '  if (k >= 1 && porniri(k, golMinim).length === 0) k--;', 'lemn',
  'numărul scade cel mult o dată')
o('C04', UL, '  let lo = golMinim, hi = Math.floor(m / k);', '  let lo = golMinim, hi = golMinim;', 'lemn', 'golul nu se mărește (nu cât mai departe)')
o('C05', UL, '    start = (ceaStart + Math.floor((cea - 1) / 2)) % m;', '    start = ceaStart % m;', 'lemn', 'pornirea la începutul seriei, nu la mijloc')
o('C06', UL, '    x = urm[x + lo] as number;', '    x = x + lo;', 'lemn', 'centrul următor nu caută unul bun')
o('C07', UL, "    if (egale.every((s) => centre[Math.round(s / pas) % m] === 1)) return { cate: n, centre: egale, egale: true };",
  "    return { cate: n, centre: egale, egale: true };", 'lemn', 'locurile egale, chiar dacă nu țin')
o('C08', UL, '  if (cuEgale && W * (1 + REZERVA) <= 0.9 * (P / n)) {', '  if (W * (1 + REZERVA) <= 0.9 * (P / n)) {', 'lemn',
  'locurile egale și cu intrări')
o('C09', UL, '  while (0.9 * gol * pas < W * (1 + REZERVA)) gol++;', '  while (0.9 * gol * pas < W * 0.5) gol++;', 'lemn',
  'golul minim sub W / 0,9 (încă două pot ieși prea aproape)')
# Lucrarea (unitare).
o('J01', JB, '      if (latura !== \'exterior\' && latura !== \'interior\') {\n        const dece', '      if (false) {\n        const dece', 'lemn',
  'pe linie nu se refuză')
o('J02', JB, '      if (lemn === undefined) {\n        return { ok: false, motiv: `${t.idLume}: urechile „unde ține” se socotesc',
  '      if (false) {\n        return { ok: false, motiv: `${t.idLume}: urechile „unde ține” se socotesc', 'lemn', 'fără fundul foii, la distanțe egale')
o('J03', JB, " && !(lemnAici && lemn === 'fara')) {", ') {', 'lemn', 'prima trecere taie cu urechi')
o('J04', JB, '        if (r.cate < u.numar) putine.push(', '        if (false) putine.push(', 'lemn', 'mai puține urechi, pe tăcute')
o('J05', JB, '      if (!rez.every((r) => r.egale)) centreAlese = rez.map((r) => [...r.centre]);', '      centreAlese = rez.map((r) => [...r.centre]);', 'lemn',
  'cu toate locurile egale, tot ca alese (alt program)')
o('J06', JB, '      const rez = bucle.map((c) => urechiLemnBucla(c, t.sens, parte, fund, D, u.latime, u.numar, fund.celula, !t.intrari));',
  '      const rez = bucle.map((c) => urechiLemnBucla(c, t.sens, parte, fund, D, u.latime, u.numar, fund.celula, true));', 'lemn',
  'locurile egale și cu intrări (le-ar număra de la pornirea intrării)')
o('J07', JB, '          const q = punctLa(bucle[j] as Contur, s)?.p;\n          if (q) puncteLemn.push(q);', '          const q = punctLa(bucle[j] as Contur, s)?.p;\n          void q;', 'lemn',
  'traseul fără semnele urechilor')
# J08 („unde ține” refuzat ca o felie următoare) a ieșit în 11.3↑f: refuzul „felie următoare” a plecat, toate modurile se taie.
# Cele două treceri (unitare).
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('T01', CC, '  if (!cuUrechiLemn(doc)) return programDinDocument(doc, regim, supracursa, prinFoaie, undefined, reliefuri);', '  return programDinDocument(doc, regim, supracursa, prinFoaie, undefined, reliefuri);', 'lemn',
  'o singură trecere (refuzul fără fund)')
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('T02', CC, '  return programDinDocument(doc, regim, supracursa, prinFoaie, fund, reliefuri);', "  return programDinDocument(doc, regim, supracursa, prinFoaie, 'fara', reliefuri);", 'lemn',
  'a doua trecere tot fără urechi')
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('T03', CC, '    const job = programFoii(doc, REGIM_IMPLICIT, 0, false, reliefuri);', '    const job = programDinDocument(doc, REGIM_IMPLICIT, 0, false, undefined, reliefuri);', 'lemn',
  'vederea 3D fără cele două treceri')
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('T04', CC, '  const r = programFoii(doc, REGIM_IMPLICIT, 0, false, reliefuri);\n  return r.ok ? { ok: true, program: impacheteaza(r.program)', '  const r = programDinDocument(doc, REGIM_IMPLICIT, 0, false, undefined, reliefuri);\n  return r.ok ? { ok: true, program: impacheteaza(r.program)', 'e2e',
  'traseul fără cele două treceri')
# Potrivirea dopului în V (ADR 0179, venită din main la unirea din 23.11) ia locașul din programul foii.
# Mutată pe codul din 18.1↑c (25.11: argumentul `reliefuri`, ordinea cu finisările, bila); aceeași greșeală.
o('T05', CC, '  const job = programFoii(doc, REGIM_IMPLICIT, 0, false, reliefuri);\n  if (!job.ok) return { ok: false, motiv: job.motiv };\n  const locas', '  const job = programDinDocument(doc, REGIM_IMPLICIT, 0, false, undefined, reliefuri);\n  if (!job.ok) return { ok: false, motiv: job.motiv };\n  const locas', 'lemn',
  'potrivirea dopului fără cele două treceri')
# Piesa desprinsă și butonul (unitare).
o('B01', PU, 'operatie: `${t.piesa}/${t.operatie}`', 'operatie: t.operatie', 'lemn', 'operația fără piesă (rândul nu se găsește)')
o('B02', EC, "    if (o?.urechi && o.urechi.mod !== 'lemn' && !rez.includes(d.operatie)) rez.push(d.operatie);",
  '    if (o?.urechi && !rez.includes(d.operatie)) rez.push(d.operatie);', 'lemn', 'și operațiile deja „unde ține”')
o('B03', EC, "    if (o?.urechi && o.urechi.mod !== 'lemn' && !rez.includes(d.operatie)) rez.push(d.operatie);",
  "    if (o?.urechi && o.urechi.mod !== 'lemn') rez.push(d.operatie);", 'lemn', 'o operație de două ori')
# Scrierea ferestrei (unitare).
o('V01', VO, "  if (dialog.mod !== 'alese') delete imbinate['locuri'];\n", '', 'ui', 'din „alese” în „unde ține”, locurile rămân')
o('V02', VO, "o.mod !== undefined && o.mod !== 'egale') delete imbinate['mod'];", "o.mod === 'alese') delete imbinate['mod'];", 'ui', 'înapoi la distanțe egale, „lemn” rămâne')
# Interfața (e2e).
o('E01', DE, "...(p.modUrechi !== 'egale' ? { mod: p.modUrechi } : {}) } : null;", "...(p.modUrechi === 'alese' ? { mod: p.modUrechi } : {}) } : null;", 'e2e', 'fereastra nu scrie „unde ține”')
o('E02', DE, "modUrechi: o.valori.urechi?.mod ?? 'egale',", "modUrechi: o.valori.urechi?.mod === 'alese' ? 'alese' : 'egale',", 'e2e', 'fereastra redeschisă arată „la distanțe egale”')
o('E03', 'src/app/App.tsx', "          ...(r.undeTine ? { undeTine: r.undeTine } : {}),\n", '', 'e2e', 'fără butonul „Pune urechile unde țin”')
o('E04', 'src/app/App.tsx', 'lemn={traseu.urechiLemn}', 'lemn={undefined}', 'e2e', 'traseul fără semnele urechilor „unde ține”')
o('E05', DE, "        if (r) nou[k] = { ...r, modUrechi: 'lemn' };", "        if (r) nou[k] = { ...r };", 'e2e', 'butonul nu trece rândul')

SETURI = {
    'lemn': ['test/unit/urechi.lemn.test.ts'],
    'ui': ['test/unit/urechi.dialog.test.ts'],
}
E2E = ['test/e2e/urechi-lemn.spec.ts']
