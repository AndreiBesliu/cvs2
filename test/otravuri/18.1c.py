# Lista de otrăvuri a feliei 18.1↑c (finisarea reliefului: documentul v29, freza bilă, CAM-ul pe câmpul conservativ; ADR 0310
# §4–§6, ADR 0312), 25.11.2026, alese de autor: ușa documentului (felul, câmpul `finisare`, bila, referințele, migrarea
# v28 → v29), bila în lucrare (`motivFormaPeOperatie`, frezele operației, poarta), nucleul finisării (câmpul pe 9 puncte și
# pe celula de calcul, modelul exact, piramida, urcarea frezei, peretele, trecerile pe Z, punctele de capăt, legătura, liniile)
# legarea în lucrare (Z-ul, scara, ordinea, scula în IR, „același T”, „prin foaie”, straturile ascunse) și rândul din fereastra
# exportului (ordinea automată și cu ranguri, rangul scris de Exportă, creasta pe plan, bila afară din lista bibliotecii). Se
# rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SD = 'src/model/schemaDocument.ts'
MG = 'src/model/migrari.ts'
FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'
RF = 'src/cam/reliefFinisare.ts'
RS = 'src/relief/resurse.ts'
PF = 'src/cam/prinFoaie.ts'

# ── Ușa documentului v29 ──────────────────────────────────────────────────────────────────────────────────────────
o('D01', SD, "  v.forward(v.check((o) => o.tip !== 'finisare' || o.finisare !== undefined, 'e cerut pe o finisare'), ['finisare']),\n", '', 'doc',
  'o finisare fără câmpul `finisare` trece de ușă')
o('D02', SD, "  v.forward(v.check((o) => o.tip !== 'finisare' || o.pasLateral !== undefined, 'e cerut pe o finisare'), ['pasLateral']),\n", '', 'doc',
  'o finisare fără pasul lateral trece de ușă')
o('D03', SD, '    unghi: v.pipe(v.number(), v.finite(), v.minValue(0), v.ltValue(180)),\n    nealiniat',
  '    unghi: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(180)),\n    nealiniat', 'doc', 'unghiul de 180° primit')
o('D04', SD, '    nealiniat: v.optional(v.literal(true)),', '    nealiniat: v.optional(v.boolean()),', 'doc', '`nealiniat: false` primit')
# D05 mutată la 18.1↑d (26.11): și degroșarea are planul zero; ancora ține și marginea finisării de dinainte.
o('D05', SD, "    margine: v.optional(v.literal('trece')),\n    planZero: v.optional(v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(PLAN_ZERO_MAXIM))),\n  })),\n  // ADR 0313",
  "    margine: v.optional(v.literal('trece')),\n    planZero: v.optional(v.pipe(v.number(), v.finite(), v.maxValue(PLAN_ZERO_MAXIM))),\n  })),\n  // ADR 0313", 'doc', 'planul zero negativ primit')
o('D06', SD, "    v.looseObject({ tip: v.literal('bila') }),\n", '', 'doc', 'bila refuzată de ușă')
o('D07', SD, "      const contur = o.noduri.find((n) => !reliefuri.has(n));", "      const contur = o.noduri.find((n) => !reliefuri.has(n) && !elemente.has(n));", 'doc',
  'o finisare pe un contur trece de ușă')
o('D08', MG, "      if (Object.hasOwn(o, 'finisare')) return { ok: false, motiv: `${unde} are câmpul „finisare”, pe care v29 îl folosește: nu e un document v28 valid` };\n",
  '', 'doc', 'un v28 cu câmpul `finisare` migrat pe tăcute')
o('D09', MG, "        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'bila') {", "        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'bilă') {", 'doc',
  'un v28 cu o freză bilă migrat pe tăcute')
o('D10', MG, "  28: v28v29,\n", '', 'doc', 'migrarea v28 → v29 lipsă')

# ── Bila în lucrare ──────────────────────────────────────────────────────────────────────────────────────────────
o('B01', FF, "  if (forma?.tip === 'bila') return 'bila';\n", '', 'bila', 'bila pe profil, buzunar, găurire, V-carve: nespusă')
o('B02', FF, "  if (inc?.fel === 'v' && inc.banda?.freza) rez.push({ cale: 'incrustatie.banda.freza', scula: inc.banda.freza });\n", '', 'bila',
  'freza decupării benzii uitată printre frezele operației')
o('B03', FF, "  (o.rest ?? []).forEach((r, k) => rez.push({ cale: `rest[${k}]`, scula: r.scula }));\n", '', 'bila', 'frezele de rest uitate')
# B04 mutată la 18.1↑d (26.11): refuzul stă acum înaintea felurilor, pentru orice operație care nu e finisare.
o('B04', JB, "      if (o.finisare !== undefined && o.tip !== 'finisare') return `${unde}: valorile finisării sunt doar ale unei finisări a reliefului`;\n", '', 'bila',
  'câmpul `finisare` pe un profil, nespus')
o('B05', FF, "  return forma === undefined ? 'plată' : forma.tip === 'bila' ? 'bilă' : 'în V';", "  return forma === undefined ? 'plată' : 'în V';", 'bila',
  'bila numită „în V” în motive')

# ── Nucleul finisării ────────────────────────────────────────────────────────────────────────────────────────────
o('C01', RF, '      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) m = Math.max(m, (c + v(i + di, j + dj)) / 2);\n', '', 'cam',
  'câmpul pe 9 puncte fără mijloacele laturilor')
o('C02', RF, '      for (const [k, l] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]] as const) m = Math.max(m, (v(k + 1, l) + v(k, l + 1)) / 2);\n', '', 'cam',
  'câmpul pe 9 puncte fără colțuri')
o('C03', RF, '      F[j * mx + i] = float32Sus(Math.max(P[a]!, P[a + 1]!, P[a + mx + 1]!, P[a + mx + 2]!));', '      F[j * mx + i] = float32Sus(P[a]!);', 'cam',
  'câmpul pe celula de calcul dintr-un singur colț (eșantionul în nod)')
o('C04', RF, '  return u + w <= 1 ? A + u * (B - A) + w * (C - A) : D + (1 - u) * (C - D) + (1 - w) * (B - D);',
  '  return u <= w ? A + u * (D - C) + w * (C - A) : D + (1 - u) * (C - D) + (1 - w) * (B - D);', 'cam', 'cealaltă diagonală a pătratelor')
o('C05', RF, '        if (x > u[k]!) u[k] = x;', '        if (x < u[k]! || u[k] === -Infinity) u[k] = x;', 'cam', 'piramida minimelor în loc de a maximelor')
o('C06', RF, "  if (f.fel === 'bila') return f.raza - Math.sqrt(Math.max(0, f.raza * f.raza - r * r));", "  if (f.fel === 'bila') return (r * r) / f.raza;", 'cam',
  'urcarea bilei mai mare decât sfera')
o('C07', RF, '  const v = f.varf / 2;', '  const v = 0;', 'cam', 'vârful plat al V-ului uitat')
# C08 mutată la 18.1↑d (26.11): cota se socotește cu freza cotei (a operației la finisare), în drumul comun.
o('C08', RF, "      m = Math.max(m, cotaSegment(p, so.cota, x0, y0, x1, y1, k === ip && o.margine === 'perete'));",
  '      m = Math.max(m, cotaSegment(p, so.cota, x0, y0, x1, y1, false));', 'cam', 'peretele (fața plăcii din jur) uitat')
o('C09', RF, '    const d = Math.min(dOut(ax, ay), dOut(bx, by));', '    const d = Math.max(dOut(ax, ay), dOut(bx, by));', 'cam',
  'distanța la perete din capătul mai depărtat')
o('C10', RF, 'fund = k === n ? -Infinity : -k * o.pas', 'fund = k === n ? -Infinity : -(k + 0.5) * o.pas', 'cam', 'o trecere coboară mai mult decât pasul')
o('C11', RF, '        const a = Math.max(0, i - 1), b = Math.min(N - 1, j + 1);', '        const a = i, b = j;', 'cam',
  'bucata fără punctul de capăt de fiecare parte')
o('C12', RF, '          if (zc > Math.min(unde.z, z0) + EPS) {', '          if (false) {', 'cam', 'legătura dintre linii în linie dreaptă, fără să urce')
o('C13', RF, '  const n = Math.max(1, Math.ceil((bmax - bmin) / o.pasLateral - 1e-9)), s = (bmax - bmin) / n;',
  '  const n = Math.max(1, Math.floor((bmax - bmin) / o.pasLateral)), s = (bmax - bmin) / n;', 'cam', 'liniile la un unghi, mai rare decât pasul cerut')
o('C14', RF, '    if (i >= 0 && j >= 0 && i < p.mx && j < p.my && F0.v[j * F0.w + i]! - urcare(f, 0) > m) { m = F0.v[j * F0.w + i]! - urcare(f, 0); arg = j * F0.w + i; }',
  '    if (i >= 0 && j >= 0 && i < p.mx && j < p.my && F0.v[j * F0.w + i]! + 0.2 > m) { m = F0.v[j * F0.w + i]! + 0.2; arg = j * F0.w + i; }', 'cam',
  'pornirea căutării peste maxim (prea prudentă: surplus)')
o('C15', RF, '    if (d <= R) { const v = F0.v[p.ultima]! - urcare(f, d); if (v > m) { m = v; arg = p.ultima; } }',
  '    { const v = F0.v[p.ultima]!; if (v > m) { m = v; arg = p.ultima; } }', 'cam', 'candidatul segmentului dinainte fără distanță (surplus)')

# ── Legarea în lucrare ───────────────────────────────────────────────────────────────────────────────────────────
o('J01', JB, "    const dz = fin.planZero !== undefined ? -fin.planZero : -(Number.isFinite(max) ? max : 0);",
  "    const dz = fin.planZero !== undefined ? -fin.planZero : (Number.isFinite(max) ? max : 0);", 'program', 'vârful compusului deasupra feței')
o('J02', JB, '      nx: r.forma.nx, ny: r.forma.ny, celula: r.forma.celula * s, z,', '      nx: r.forma.nx, ny: r.forma.ny, celula: r.forma.celula, z,', 'program',
  'celula nescalată de matrice')
o('J03', JB, "  ...(s.forma?.tip === 'bila' ? { forma: { tip: 'bila' as const } } : {}),\n", '', 'program', 'bila pierdută în IR (simulată plată)')
o('J04', JB, "    ...finisari.map((f) => ({ idLume: f.reliefuri[0]?.idLume ?? `${f.instanta}/${f.operatie.id}`, scule: [f.operatie.scula] })),\n", '', 'program',
  'frezele finisărilor lipsă din „același T”')
# Mutată pe `catFoaia` (28.8↑h, 25.11: regula „cât foaia” comună lucrării și ferestrei); aceeași greșeală.
# J05 mutată pe codul din 18.1↑d (26.11): `catFoaia` lasă și degroșarea reliefului cum e scrisă (`o.tip !== 'degrosare'`); aceeași greșeală.
o('J05', PF, "o.tip !== 'vcarve' && o.tip !== 'finisare' && o.tip !== 'degrosare' && o.incrustatie === 'fara'", "o.tip !== 'vcarve' && o.tip !== 'degrosare' && o.incrustatie === 'fara'", 'program',
  '„prin foaie” mută podeaua finisării sub placă')
o('J06', RS, '    if (!s.vizibil) continue;\n', '', 'program', 'un strat ascuns intră în compusul tăiat')

# ── Ordinea și rândul din fereastra exportului (ADR 0312 §7), creasta pe plan ────────────────────────────────────────
FN = 'src/model/finisare.ts'
OE = 'src/ui/ordineExport.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
# O01 mutată la 18.1↑d (26.11): locul fără rang e −∞ pentru orice pas al reliefului (degroșarea și finisarea).
o('O01', FN, "rangPas(p) ?? (p.fel === 'taietura' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY)", 'rangPas(p) ?? Number.POSITIVE_INFINITY',
  'program', 'o finisare fără rang ajunge după tăierea de contur')
o('O02', FN, """    ...finisariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'finisare', f })),
    ...grupeazaPeScula(taieturiFoaie(doc, indexFoaie)).map((t): PasProgram => ({ fel: 'taietura', t })),""", """    ...grupeazaPeScula(taieturiFoaie(doc, indexFoaie)).map((t): PasProgram => ({ fel: 'taietura', t })),
    ...finisariFoaie(doc, indexFoaie).map((f): PasProgram => ({ fel: 'finisare', f })),""", 'program', 'finisarea după tăieturi în ordinea automată')
o('O03', JB, "    if (p.fel === 'taietura') inainte++;\n    else finisariLa", "    inainte++;\n    if (p.fel === 'finisare') finisariLa", 'program',
  'finisarea pusă cu un loc mai târziu în program')
o('O04', JB, """  const refuzFinisare = faFinisari(taieturi.length);
  if (refuzFinisare !== null) return { ok: false, motiv: refuzFinisare };
""", '', 'program', 'finisarea pusă la capăt lipsește din program')
o('O05', OE, '(inFata.has(c) ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY)', 'Number.POSITIVE_INFINITY', 'ordine',
  'fereastra pune finisarea fără rang la capăt (lucrarea, în față)')
o('O06', FN, 'return pasLateral <= v ? 0 : (pasLateral - v) / 2 / Math.tan((s.forma.unghi * Math.PI) / 360);',
  'return pasLateral <= v ? 0 : (pasLateral - v) / 2 / Math.tan((s.forma.unghi * Math.PI) / 180);', 'program', 'creasta V-ului cu unghiul întreg, nu cu jumătatea')
o('O07', EC, """          const r = loc?.get(cheie);
          return r !== undefined ? { ...fara, rang: r } : fara;
        }""", """          return o;
        }""", 'e2e', 'Exportă nu scrie rangul finisării în „A mea”')
o('O08', DE, "    if (fin) return randFinisare(fin, loc);\n", '', 'e2e', 'rândul finisării lipsește din listă')

# ── Bila în lista bibliotecii a ferestrei (cu 16.A↑b-4, la cererea sesiunii principale din 25.11) ───────────────────
AF = 'src/model/alegereFreza.ts'
o('O09', AF, "  return lista.filter((f) => areCam(f.fel) && randuri.some((o) => motivFormaPeOperatie(o.tip, o.latura, sculaDinFreza(f).forma) === null));",
  "  return lista.filter((f) => areCam(f.fel));", 'biblioteca', 'bila în lista bibliotecii: o plată scrisă de mână „recunoscută” ca bila')

SETURI = {
    'doc': ['test/unit/document.v29.oracol.test.ts'],
    'bila': ['test/unit/finisare.bila.test.ts'],
    'cam': ['test/unit/reliefFinisare.test.ts'],
    'program': ['test/unit/finisare.program.test.ts'],
    'ordine': ['test/unit/ordineExport.test.ts'],
    'biblioteca': ['test/unit/exportFreze.bila.test.ts'],
}

E2E = ['test/e2e/finisare.spec.ts']
