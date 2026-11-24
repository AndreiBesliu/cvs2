# Lista de otrăvuri a feliei 18.1↑a (relieful: nucleul, documentul v28, importul din imagine, desenul umbrit; ADR 0310, ADR
# 0311), 24.11.2026, alese de autor: nucleul (luminanța, orientarea, golul, netezirea care sare golurile, cuantizarea,
# constanta, codul golului, citirea, compunerea, grila citită, dalele lipsă), umbrirea (reducerea, panta, lumina), calculul
# workerului (scara din DPI, plafonul laturii, golul, straturile ascunse, decodarea exactă), ușa documentului (grila, celula,
# straturile, similitudinea, operațiile 2D pe relief, migrarea v27 → v28), integrarea cu uneltele vectorilor (scalarea,
# înclinarea, booleanul, tăierea), desenul (așezarea, plafonul desenelor), baza (curățarea) și interfața (alegerea ținută,
# imaginile pânzei). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


IM = 'src/relief/imagine.ts'
DA = 'src/relief/dala.ts'
CO = 'src/relief/compunere.ts'
ST = 'src/relief/strat.ts'
UM = 'src/relief/umbrire.ts'
CR = 'src/jobs/calculRelief.ts'
SD = 'src/model/schemaDocument.ts'
MG = 'src/model/migrari.ts'
TR = 'src/model/transformare.ts'
BO = 'src/model/boolean.ts'
TA = 'src/model/taiere.ts'
RD = 'src/app/reliefDesen.ts'
RC = 'src/app/reliefDesenCalcul.ts'
RS = 'src/app/reliefStocare.ts'
IC = 'src/app/ImportConectat.tsx'
LU = 'src/canvas/lucrator.ts'
AP = 'src/app/App.tsx'

# ── Nucleul ─────────────────────────────────────────────────────────────────────────────────────────────────────────
o('N01', IM, '(2126 * r + 7152 * g + 722 * b) / 2_550_000', '(2990 * r + 5870 * g + 1140 * b) / 2_550_000', 'nucleu', 'luminanța Rec. 601')
o('N02', IM, '    const rand = (ny - 1 - y) * nx;', '    const rand = y * nx;', 'nucleu', 'rândul de sus al imaginii pus jos (j = y)')
o('N03', IM, '      if ((rgba[p + 3] ?? 0) < 128) { out[rand + x] = NaN; continue; }', '      if ((rgba[p + 3] ?? 0) <= 128) { out[rand + x] = NaN; continue; }',
  'nucleu', 'alfa 128 făcut gol')
o('N04', IM, '        if (u !== u) continue;\n', '        if (u !== u) { sw += w[k] ?? 0; continue; }\n', 'nucleu', 'netezirea numără golurile (le umple cu 0)')
o('N05', IM, '    out[k] = v !== v ? NaN : o.albSus ? o.baza + v * o.inaltime : o.baza + (1 - v) * o.inaltime;',
  '    out[k] = v !== v ? NaN : o.albSus ? o.baza + v * o.inaltime : o.baza + v * o.inaltime;', 'nucleu', 'negru = sus ignorat')
o('N06', DA, 'Math.min(CODURI, Math.max(0, Math.round((v - m) / p)))', 'Math.min(CODURI, Math.max(0, Math.floor((v - m) / p)))', 'nucleu',
  'floor în locul lui round la cod')
o('N07', DA, '  if (goale === 0 && m === M) return { fel: \'constanta\', m };', '  if (m === M) return { fel: \'constanta\', m };', 'nucleu',
  'o dală cu goluri și o singură valoare, făcută constantă (golurile se pierd)')
o('N08', DA, '    coduri[k] = v !== v ? COD_GOL : p === 0', '    coduri[k] = v !== v ? 0 : p === 0', 'nucleu', 'golul codat 0')
o('N09', DA, '  const p = m === M ? 0 : (M - m) / CODURI;', '  const p = m === M ? 0 : (M - m) / 65_535;', 'nucleu', 'pasul pe 65 535 de coduri (golul încurcat)')
o('N10', CO, "      case 'jos': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x && x < (out[k] ?? 0)) out[k] = x; } break;",
  "      case 'jos': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x && x > (out[k] ?? 0)) out[k] = x; } break;", 'nucleu',
  '„păstrează jos” păstrează înalt')
o('N11', CO, '    if (!s.vizibil) continue;\n', '', 'nucleu', 'stratul ascuns intră în compus')
o('N12', CO, "      case 'scade': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x) out[k] = (out[k] ?? 0) - x; } break;",
  "      case 'scade': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x) out[k] = x - (out[k] ?? 0); } break;", 'nucleu',
  '„scade” cu operanzii inversați')
o('N13', ST, '      if (d) dale.push(d);\n      else lipsa.push(e);', '      if (d) dale.push(d);\n      else dale.push({ fel: \'gol\' });', 'nucleu',
  'o dală lipsă din bază inventată goală')

# ── Umbrirea ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('U01', UM, 'const LX = -0.5, LY = 0.5, LZ = Math.SQRT1_2;', 'const LX = 0.5, LY = 0.5, LZ = Math.SQRT1_2;', 'umbrire', 'lumina din dreapta-sus')
o('U02', UM, '      out[bj * mx + bi] = n === 0 ? NaN : s / n;', '      out[bj * mx + bi] = n === 0 ? NaN : s / (k * k);', 'umbrire',
  'reducerea numără golurile (media pe tot blocul)')
o('U03', UM, '  if (!fa && !fb) return (b - a) / (2 * celula);', '  if (!fa && !fb) return (b - a) / 2;', 'umbrire', 'panta fără celulă')
o('U04', UM, '      rgba[p + 3] = 255;\n', '', 'umbrire', 'relieful transparent')

# ── Calculul workerului ─────────────────────────────────────────────────────────────────────────────────────────────
o('C01', CR, "  const c = 'latimeMm' in scara ? scara.latimeMm / nx : 25.4 / scara.dpi;", "  const c = 'latimeMm' in scara ? scara.latimeMm / nx : scara.dpi / 25.4;",
  'calc', 'celula din DPI inversată')
o('C02', CR, '  if (nx > LATURA_MAXIMA || ny > LATURA_MAXIMA) return', '  if (nx > LATURA_MAXIMA + 1 || ny > LATURA_MAXIMA + 1) return', 'calc',
  'o imagine de 8193 de pixeli, primită')
o('C03', CR, "  if (intervalZ(citit) === null) return { ok: false, cod: 'gol' };\n", '', 'calc', 'o imagine toată transparentă, primită')
o('C04', CR, '    if (!s.vizibil) continue;\n', '', 'calc', 'desenul pune și straturile ascunse')
o('C05', CR, '  const px = pixeliExacti(bmp) ?? pixeliPrinPanza(bmp);', '  const px = pixeliPrinPanza(bmp);', 'e2e',
  'decodarea prin pânza 2D (alfa premultiplicat: pixelii semitransparenți rotunjiți)')

# ── Ușa documentului și migrarea ────────────────────────────────────────────────────────────────────────────────────
o('D01', SD, 'const latRelief = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(LATURA_RELIEF_MAXIMA));',
  'const latRelief = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(LATURA_RELIEF_MAXIMA + 1));', 'doc', 'latura 8193, primită')
o('D02', SD, "  v.check((f) => new Set(f.straturi.map((s) => s.id)).size === f.straturi.length, 'două straturi ale reliefului au același id'),\n",
  '', 'doc', 'două straturi cu același id, primite')
o('D03', SD, "    if (x.nod.tip === 'element' && x.nod.forma.tip === 'relief' && !esteSimilitudine(m)) {",
  "    if (x.nod.tip === 'element' && x.nod.forma.tip === 'relief' && false) {", 'doc', 'relieful sub o scalare neuniformă, primit')
o('D04', SD, '    if (relief !== undefined) return `operația ${o.id} din piesa ${p.id} referă relieful ${relief}: operațiile 2D taie doar contururi`;\n',
  '', 'doc', 'o operație 2D pe un relief, primită')
o('D05', SD, 'mod: v.picklist(MODURI_RELIEF), vizibil: v.boolean(), dale: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/)),',
  'mod: v.picklist(MODURI_RELIEF), vizibil: v.boolean(), dale: v.pipe(v.string(), v.regex(/^[0-9a-fA-F]{64}$/)),', 'doc', 'amprenta cu majuscule, primită')
o('D06', SD, "  v.check((f) => f.nx * f.celula <= PLAFON.latura && f.ny * f.celula <= PLAFON.latura, `relieful trece de ${PLAFON.latura} mm pe o latură`),\n",
  '', 'doc', 'un relief de peste 10 m, primit')
o('D07', MG, "      if (n['tip'] === 'element' && ob(f) && f['tip'] === 'relief') {", "      if (n['tip'] === 'element' && ob(f) && f['tip'] === 'reliefuri') {",
  'doc', 'un v27 cu relief, migrat în loc de refuzat')

# ── Integrarea cu uneltele vectorilor ───────────────────────────────────────────────────────────────────────────────
o('T01', TR, "      if (!u) return 'relief-neuniform';\n", '', 'integ', 'relieful scalat neuniform (celula nu mai e pătrată)')
o('T02', TR, "  if (f.tip === 'relief') return 'relief-neuniform';", "  if (f.tip === 'relief') return f;", 'integ', 'relieful înclinat, primit neschimbat')
o('T03', TR, '      const celula = f.celula * Math.abs(sx);', '      const celula = f.celula;', 'integ', 'scalarea uniformă nu schimbă celula')
o('T04', BO, "    if (!esteContur(e0)) return 'relief';", "    if (!esteContur(e0)) return 'compusa';", 'integ', 'booleanul pe relief, cu alt motiv')
o('T05', TA, "  if (areRelief(doc, indexFoaie, cerere.alese)) return { ok: false, motiv: 'relief' };\n", '', 'integ', 'tăierea pe un relief')

# ── Desenul și baza ─────────────────────────────────────────────────────────────────────────────────────────────────
o('R01', RD, '  const teta = oglindita ? Math.atan2(-m.b, -m.a) : Math.atan2(m.b, m.a);', '  const teta = Math.atan2(m.b, m.a);', 'desen',
  'oglindit: rotirea nu ține seama de oglindă')
o('R02', RD, 's = Math.hypot(m.a, m.b), oglindita = m.a * m.d - m.b * m.c < 0;', 's = Math.hypot(m.a, m.b), oglindita = m.a * m.d - m.b * m.c > 0;',
  'desen', 'oglindirea întoarsă')
o('R03', RC, '    if (!folosite.has(k)) m.delete(k);', '    m.delete(k);', 'desen', 'plafonul scoate și desenele de pe foaie')
o('S01', RS, '    if (h.la < pana && !folosite.has(h.amprenta)) sterseH.push(h.amprenta);', '    if (!folosite.has(h.amprenta)) sterseH.push(h.amprenta);', 'stoc',
  'o hartă nouă (sub o zi) ștearsă')
o('S02', RS, '  for (const d of dale) if (d.la < pana && !cerute.has(d.amprenta)) sterseD.push(d.amprenta);',
  '  for (const d of dale) if (d.la < pana) sterseD.push(d.amprenta);', 'stoc', 'dalele unei hărți folosite, șterse')
o('S03', RS, '  if (n.forma.tip === \'relief\') for (const st of n.forma.straturi) s.add(st.dale);',
  '  if (n.forma.tip === \'relief\') for (const st of n.forma.straturi.slice(0, 1)) s.add(st.dale);', 'stoc', 'doar primul strat e folosit')

# ── Interfața ───────────────────────────────────────────────────────────────────────────────────────────────────────
o('E01', IC, '    rezultatTinut = r;\n', '', 'e2e', 'alegerea Relief, uitată la fișierul următor')
o('E02', LU, '    const date = im.octeti ?? im.pixeli;', '    const date = im.octeti;', 'e2e', 'pânza nu decodează pixelii reliefului')
o('E03', AP, '    () => (areReliefuri && imaginiRelief.length > 0 ? [...imaginiFoii, ...imaginiRelief] : imaginiFoii),',
  '    () => imaginiFoii,', 'e2e', 'reliefurile nu ajung la pânză')

SETURI = {
    'nucleu': ['test/unit/relief.nucleu.test.ts'],
    'umbrire': ['test/unit/relief.umbrire.test.ts'],
    'calc': ['test/unit/relief.calcul.test.ts'],
    'doc': ['test/unit/document.v28.oracol.test.ts'],
    'integ': ['test/unit/relief.integrare.test.ts'],
    'desen': ['test/unit/relief.desen.test.ts'],
    'stoc': ['test/unit/relief.stocare.test.ts'],
}
E2E = ['test/e2e/relief.spec.ts']
