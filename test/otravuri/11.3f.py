# Lista de otrăvuri a feliei 11.3↑f (urechile după reguli, pe laturi; ADR 0211, varianta c), 23.11.2026, alese de autor: laturile
# (arcul care le desparte, direcția, linia dus-întors, latura de peste vârful 0), latura pe care încape o ureche (regula și
# rezerva ei), regulile (lungi, scurte, toleranța de 1 %, mijloc), împărțirea numărului (restul răspândit, cât încap), centrele
# (poziția pe latură, peste vârful 0, ordinea), buclele unei tăieturi (fără laturi, mai puține, semnele, bucla rămasă la distanțe
# egale și refuzul ei), lucrarea (regula citită, refuzul, avertismentul, semnele, centrele puse pe drumul locurilor alese),
# scrierea ferestrei, raportul și interfața (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (în cloud: docs/lucru-in-cloud.md,
# „Otrăvurile”; e2e-ul, cu configul repo-ului, pe 4173).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


UL = 'src/cam/urechiLaturi.ts'
JB = 'src/cam/job.ts'
VO = 'src/app/valoriOperatii.ts'
RF = 'src/model/raportFoi.ts'
DE = 'src/ui/DialogExport.tsx'

# Laturile (unitare, pe hârtie).
o('A01', UL, '      curenta = null;\n      continue;', '      continue;', 'laturi', 'un arc nu mai desparte două linii din aceeași direcție')
o('A02', UL, 'if (curenta && Math.abs(curenta.ux * uy - curenta.uy * ux) <= TOL_DIRECTIE && curenta.ux * ux + curenta.uy * uy > 0) {',
  'if (curenta && curenta.ux * ux + curenta.uy * uy > 0) {', 'laturi', 'orice linie care nu se întoarce continuă latura')
o('A03', UL, 'if (curenta && Math.abs(curenta.ux * uy - curenta.uy * ux) <= TOL_DIRECTIE && curenta.ux * ux + curenta.uy * uy > 0) {',
  'if (curenta && Math.abs(curenta.ux * uy - curenta.uy * ux) <= TOL_DIRECTIE) {', 'laturi', 'linia dus-întors e o singură latură')
o('A04', UL, 'const TOL_DIRECTIE = 1e-3;', 'const TOL_DIRECTIE = 1e-5;', 'laturi', 'o frântură de 0,007° desparte latura')
o('A05', UL, "  if (c.inchis && prima && ultima && prima !== ultima && prima.s0 === 0 && ultima.capat === P\n", '  if (false\n', 'laturi',
  'latura de peste vârful 0 rămâne două')
o('A06', UL, 'prima !== ultima && prima.s0 === 0 && ultima.capat === P', 'prima !== ultima && ultima.capat === P', 'laturi',
  'se unește peste vârful 0 și când bucla pornește cu un arc')
o('A07', UL, 'prima !== ultima && prima.s0 === 0 && ultima.capat === P', 'prima !== ultima && prima.s0 === 0', 'laturi',
  'se unește peste vârful 0 și când bucla se termină cu un arc')
o('A08', UL, '    ultima.lungime += prima.lungime;\n    rulari.shift();', '    ultima.lungime += prima.lungime;', 'laturi',
  'latura de peste vârful 0 apare și la început')
o('A09', UL, '    ultima.lungime += prima.lungime;\n    rulari.shift();', '    rulari.shift();', 'laturi', 'latura de peste vârful 0 își pierde începutul')
# Latura pe care încape o ureche.
o('I01', UL, '  const bune = laturi.filter((l) => W * (1 + REZERVA) <= 0.9 * l.lungime);', '  const bune = laturi.filter((l) => W <= l.lungime);', 'laturi',
  'încape pe orice latură cât urechea (fără 0,9)')
o('I02', UL, '  const bune = laturi.filter((l) => W * (1 + REZERVA) <= 0.9 * l.lungime);', '  const bune = laturi.filter((l) => W <= 0.9 * l.lungime);', 'laturi',
  'fără rezerva de rotunjire: la limita exactă, latura numără')
o('I03', UL, '  const bune = laturi.filter((l) => W * (1 + REZERVA) <= 0.9 * l.lungime);', '  const bune = laturi;', 'laturi', 'toate laturile numără, și teșiturile mici')
o('I04', UL, '  if (bune.length === 0 || !(W > 0)) return null;', '  if (!(W > 0)) return null;', 'laturi', 'fără laturi, tot după regulă')
# Regulile.
o('R01', UL, "    if (regula === 'lungi') {", "    if (regula !== 'lungi') {", 'laturi', '„lungi” și „scurte” schimbate între ele')
o('R02', UL, '      alese = bune.filter((l) => l.lungime >= max * (1 - TOL_EGALE));', '      alese = bune.filter((l) => l.lungime >= max);', 'laturi',
  '„lungi” fără toleranță (80 și 79,5 nu mai sunt egale)')
o('R03', UL, '      alese = bune.filter((l) => l.lungime <= min * (1 + TOL_EGALE));', '      alese = bune.filter((l) => l.lungime <= min);', 'laturi',
  '„scurte” fără toleranță (30 și 30,2 nu mai sunt egale)')
o('R04', UL, 'const TOL_EGALE = 0.01;', 'const TOL_EGALE = 0.02;', 'laturi', 'toleranța de 2 % (80 și 79 devin egale)')
o('R05', UL, "    cate = bune.map(() => 1);", "    cate = bune.map(() => Math.max(1, n));", 'laturi', '„mijloc” ține cont de număr')
o('R06', UL, "  if (regula === 'mijloc') {", "  if (regula === 'mijloc' && n === 0) {", 'laturi', '„mijloc” e ca „scurte”')
# Împărțirea numărului.
o('N01', UL, '      const i = Math.floor((j * k) / rest);', '      const i = j;', 'laturi', 'restul stă pe primele laturi, nu răspândit')
o('N02', UL, '    const k = alese.length, baza = Math.floor(n / k), rest = n - baza * k;', '    const k = alese.length, baza = Math.ceil(n / k), rest = n - baza * k;', 'laturi',
  'fiecare latură primește restul (mai multe decât numărul)')
o('N03', UL, '    cate = cate.map((m, i) => urechiCareIncap((alese[i] as LaturaBucla).lungime, W, m));\n', '', 'laturi', 'pe o latură se pun și câte nu încap')
o('N04', UL, '    for (let j = 0; j < rest; j++) {', '    for (let j = 0; j < 0; j++) {', 'laturi', 'restul se pierde')
# Centrele.
o('C01', UL, '      const s = l.s0 + ((j + 0.5) * l.lungime) / m;', '      const s = l.s0 + (j * l.lungime) / m;', 'laturi', 'urechile pornesc din capătul laturii')
o('C02', UL, '      const s = l.s0 + ((j + 0.5) * l.lungime) / m;', '      const s = ((j + 0.5) * l.lungime) / m;', 'laturi', 'toate laturile pornesc din vârful 0')
o('C03', UL, '      centre.push(s >= P ? s - P : s);', '      centre.push(s);', 'laturi', 'centrul de peste vârful 0 rămâne dincolo de P')
o('C04', UL, '  centre.sort((a, b) => a - b);\n', '', 'laturi', 'centrele nesortate')
o('C05', UL, "  return { cate: centre.length, cerute: regula === 'mijloc' ? centre.length : n, centre };",
  '  return { cate: centre.length, cerute: n, centre };', 'laturi', '„mijloc” cere numărul (și ar avertiza)')
# Buclele unei tăieturi.
o('B01', UL, '  if (rez.every((r) => r === null)) return null;\n', '', 'laturi', 'fără nicio latură, tot pe drumul locurilor alese')
o('B02', UL, '      if (r.cate < r.cerute) putine.push({ j, k: r.cate, n: r.cerute });', '      if (r.cate > r.cerute) putine.push({ j, k: r.cate, n: r.cerute });', 'laturi',
  'mai puține urechi, pe tăcute')
o('B03', UL, '      for (const s of r.centre) semne.push({ j, s });\n', '', 'laturi', 'fără semnele urechilor puse după regulă')
o('B04', UL, "    if (typeof g === 'string') return `bucla ${j + 1}, fără laturi drepte: ${g}`;", "    if (typeof g === 'string') { centre.push([]); continue; }", 'laturi',
  'bucla pe care nu încap urechile rămâne fără ele, pe tăcute')
o('B05', UL, '    centre.push([...g.centre]);', '    centre.push([]);', 'laturi', 'bucla fără laturi rămâne fără urechi')
o('B06', UL, "    if (typeof g === 'string') return `bucla ${j + 1}, fără laturi drepte: ${g}`;", "    if (typeof g === 'string') return `bucla ${j}, fără laturi drepte: ${g}`;", 'laturi',
  'refuzul numește altă buclă')
# Lucrarea (unitare).
o('J01', JB, "    const regula = t.urechi !== null && (mod === 'lungi' || mod === 'scurte' || mod === 'mijloc') ? mod : undefined;",
  "    const regula = t.urechi !== null && (mod === 'lungi' || mod === 'scurte') ? mod : undefined;", 'laturi', '„mijloc” se taie ca „egale”')
o('J02', JB, "      if (typeof r === 'string') return { ok: false, motiv: `${t.idLume}: ${r}` };\n      if (r) {", '      if (r && typeof r !== \'string\') {', 'laturi',
  'refuzul buclei fără laturi, înghițit')
o('J03', JB, "        if (regula !== 'mijloc') for (const x of r.putine) putineLaturi[regula].push({ id: t.idLume, j: x.j, bucle: bucle.length, k: x.k, n: x.n });\n", '', 'laturi',
  'fără avertismentul urechilor mai puține')
o('J04', JB, '          const q = punctLa(bucle[x.j] as Contur, x.s)?.p;\n          if (q) puncteLemn.push(q);', '          const q = punctLa(bucle[x.j] as Contur, x.s)?.p;\n          void q;',
  'laturi', 'traseul fără semnele urechilor puse după regulă')
o('J05', JB, '        centreAlese = r.centre;\n', '', 'laturi', 'centrele regulii nu ajung în lucrare')
o('J06', JB, "  for (const regula of ['lungi', 'scurte'] as const) {", "  for (const regula of ['lungi'] as const) {", 'laturi', 'avertismentul laturilor scurte, pierdut')
o('J07', JB, "bucle: bucle.length, k: x.k, n: x.n });\n        for (const x of r.semne) {", "bucle: 1, k: x.k, n: x.n });\n        for (const x of r.semne) {", 'laturi',
  'avertismentul nu spune bucla')
o('J08', JB, '  return `urechile pe laturile ${regula}: ${cate} mai puține urechi', '  return `urechile pe laturile lungi: ${cate} mai puține urechi', 'laturi',
  'avertismentul spune mereu „lungi”')
# Scrierea ferestrei și raportul (unitare).
o('V01', VO, "  if (dialog.mod === undefined && o.mod !== undefined && o.mod !== 'egale') delete imbinate['mod'];",
  "  if (dialog.mod === undefined && (o.mod === 'alese' || o.mod === 'lemn')) delete imbinate['mod'];", 'ui', 'înapoi la distanțe egale, regula rămâne')
o('U01', RF, "o.urechi.mod === 'mijloc' ? 0 : o.urechi.numar) : 0,", 'o.urechi.numar) : 0,', 'ui', 'raportul numără urechile de la mijlocul laturilor pe buclă')
o('U02', RF, "    ...(o.urechi?.mod === 'mijloc' ? { urechiLa: 'mijloc' as const } : {}),\n", '', 'ui', 'raportul nu spune „la mijlocul laturilor”')
# Interfața (e2e).
o('E01', DE, "const faraNumar = (mod: ModLocuriUrechi | 'egale'): boolean => mod === 'alese' || mod === 'mijloc';",
  "const faraNumar = (mod: ModLocuriUrechi | 'egale'): boolean => mod === 'alese';", 'e2e', 'numărul rămâne de scris la mijlocul laturilor')
o('E02', DE, "                        {(['lungi', 'scurte', 'mijloc'] as const).map((regula) => (", "                        {(['lungi', 'scurte'] as const).map((regula) => (", 'e2e',
  'fereastra n-are „la mijlocul laturilor”')
o('E03', DE, "{(p.modUrechi === 'lungi' || p.modUrechi === 'scurte') && <span className=\"nota\" data-nota=\"urechi-laturi\">",
  "{p.modUrechi === 'lungi' && <span className=\"nota\" data-nota=\"urechi-laturi\">", 'e2e', 'nota regulii lipsește la laturile scurte')
o('E04', DE, "{p.modUrechi === 'mijloc' && <span className=\"nota\" data-nota=\"urechi-mijloc\">", "{false && <span className=\"nota\" data-nota=\"urechi-mijloc\">", 'e2e',
  'nota de la mijlocul laturilor lipsește')
o('E05', DE, "onChange={() => { schimba(o.cheie, { modUrechi: regula }); }} />", "onChange={() => { schimba(o.cheie, { modUrechi: 'lungi' }); }} />", 'e2e',
  'orice regulă alege „pe laturile lungi”')
o('E06', 'src/app/ExportConectat.tsx', "o.urechi.mod !== undefined && o.urechi.mod !== 'egale' ? { mod: o.urechi.mod } : {}),", "o.urechi.mod === 'lemn' ? { mod: o.urechi.mod } : {}),", 'e2e',
  'fereastra redeschisă nu arată regula din document')
o('E07', 'src/app/PanouProprietati.tsx', "t(o.urechi.mod === undefined || o.urechi.mod === 'egale' ? 'prop.urechi.valoare' : `prop.urechi.${o.urechi.mod}`, {",
  "t(o.urechi.mod === undefined || o.urechi.mod === 'egale' || o.urechi.mod === 'mijloc' ? 'prop.urechi.valoare' : `prop.urechi.${o.urechi.mod}`, {", 'e2e',
  'panoul nu spune „la mijlocul laturilor”')
o('E08', 'src/app/DialogRaportFoi.tsx', "  if (o.urechiLa === 'mijloc') parti.push(t('export.raport.op.urechi.mijloc'));\n  else if (o.urechi > 0)", '  if (o.urechi > 0)', 'e2e',
  'raportul nu spune regula')
o('E09', JB, "        if (regula !== 'mijloc') for (const x of r.putine) putineLaturi[regula].push({ id: t.idLume, j: x.j, bucle: bucle.length, k: x.k, n: x.n });\n        for (const x of r.semne) {\n          const q = punctLa(bucle[x.j] as Contur, x.s)?.p;\n          if (q) puncteLemn.push(q);",
  "        if (regula !== 'mijloc') for (const x of r.putine) putineLaturi[regula].push({ id: t.idLume, j: x.j, bucle: bucle.length, k: x.k, n: x.n });\n        for (const x of r.semne) {\n          const q = punctLa(bucle[x.j] as Contur, x.s)?.p;\n          if (q && false) puncteLemn.push(q);",
  'e2e', 'cu „Arată traseul”, urechile puse după regulă nu se văd')

SETURI = {
    'laturi': ['test/unit/urechi.laturi.test.ts'],
    'ui': ['test/unit/urechi.dialog.test.ts', 'test/unit/urechiLocuri.test.ts'],
}
E2E = ['test/e2e/urechi-laturi.spec.ts']
