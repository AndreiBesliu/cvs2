# Lista de otrăvuri a feliei 25.3↑c (liniile mediane pe culori, ADR 0227), 14.11.2026, alese de autor: pragul părților late
# din grosimea desenului întreg, legarea peste alte culori (cârligul din nucleu, față în față, aproape, doar pe desen, peste
# altă culoare, bucla închisă la loc), mutarea căilor din cutia culorii în imagine, piesele (fără căi, nu; punctele și
# legăturile numărate), contururile părților late, calculul și ușa (cererea, legarea implicită, grosimea în raport, căile
# deschise ale previzualizării, numărul liniilor) și fereastra prin e2e (Rezultatul și opțiunile pe culori, bifa legării,
# grosimea în pastile, legăturile în raport, grosimea desenului ascunsă, refuzul cu doar puncte). Se rulează cu
# `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


MC = 'src/trasare/medianeCulori.ts'
ME = 'src/trasare/mediana.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'
DI = 'src/ui/DialogImport.tsx'

# ---- Pragul părților late ----
o('P01', MC, '  const prag = om.pragLatPx ?? (grosime > 0 ? 2 * grosime : null);', '  const prag = om.pragLatPx;', 'nuc',
  'pragul din grosimea fiecărei culori: o culoare plină nu e lată față de ea însăși')
o('P02', MC, '  const grosime = mediana(linii.flatMap((x) => x.L.latimi));', '  const grosime = Math.max(0, ...linii.map((x) => mediana(x.L.latimi)));',
  'nuc', 'grosimea desenului, cea mai mare dintre culori (a culorii pline)')

# ---- Legarea ----
o('L01', ME, '  cu.leaga?.(L.cai, grosime);\n', '', 'nuc', 'nucleul nu cheamă legarea')
o('L02', MC, '      L, ...(om.leaga ? { leaga:', '      L, ...(false ? { leaga:', 'nuc', 'bifa legării ignorată')
o('L03', MC, '      if (!(d >= 1 && d <= dMax) || A.dx * vx + A.dy * vy < cos * d || -(B.dx * vx + B.dy * vy) < cos * d) continue;',
  '      if (!(d >= 1 && d <= dMax)) continue;', 'nuc', 'capetele legate și când nu sunt față în față')
o('L04', MC, '  const cos = Math.cos((LEGARE.unghi * Math.PI) / 180), dMax = LEGARE.grosimi * w;',
  '  const cos = Math.cos((LEGARE.unghi * Math.PI) / 180), dMax = 10 * LEGARE.grosimi * w;', 'nuc', 'legate oricât de departe')
o('L05', MC, '        if (e < 0) pe = false; else if (e !== k) alta = true;', '        if (e >= 0 && e !== k) alta = true;', 'nuc',
  'drumul legăturii poate trece pe hârtie')
o('L06', MC, '        if (e < 0) pe = false; else if (e !== k) alta = true;', '        if (e < 0) pe = false; else alta = true;', 'nuc',
  'legate și peste propria culoare (o pată lată)')
o('L07', MC, '      if (urm < 0 || vazut[urm >> 1]) { noi.push({ P, inchisa: urm >= 0 }); return; }',
  '      if (urm < 0 || vazut[urm >> 1]) { noi.push({ P, inchisa: false }); return; }', 'nuc', 'o buclă legată la loc rămâne deschisă')

# ---- Căile, piesele, raportul ----
o('C01', MC, '(i % 2 ? oy : ox)', '(i % 2 ? ox : oy)', 'nuc', 'căile mutate din cutie cu x și y schimbate')
o('C02', MC, '    for (let i = 0; i < (c.tip[v] ? 6 : 2); i++)', '    for (let i = 0; i < 2; i++)', 'nuc', 'mânerele curbelor rămân în cutia culorii')
o('C03', MC, '    if (n === 0) continue;\n', '', 'nuc', 'o piesă goală pentru culoarea doar cu puncte')
o('C04', MC, 'puncte += r.raport.puncte;', 'puncte += 0;', 'nuc', 'punctele nenumărate')
o('C05', MC, 'grosime: r.raport.grosime, legaturi: leg });', 'grosime: r.raport.grosime, legaturi: 0 });', 'nuc', 'legăturile piesei pierdute')
o('C06', MC, "etichete: et, ...(cauta ? { late: uneste(late) } : {}) };", 'etichete: et };', 'nuc', 'fără contururile părților late')

# ---- Calculul și ușa ----
o('J01', CT, "    const rm = c.rezultat === 'mediane' ? traseazaCuloriMediane(", "    const rm = false ? traseazaCuloriMediane(", 'usa',
  'pe culori, Rezultatul ignorat')
o('J02', CT, 'leaga: m?.leaga !== false', 'leaga: false', 'usa', 'legarea nu ajunge la calcul')
o('A01', CA, '...(p.grosime !== undefined ? { grosimePx: p.grosime } : {})', '...{}', 'usa', 'grosimea fiecărei culori pierdută în ușă')
o('A02', CA, '      if (deschisa) deschisa[k + j] = c.deschisa?.[j] ?? 0;', '      if (deschisa) deschisa[k + j] = 0;', 'usa',
  'previzualizarea închide căile deschise')
o('A03', CA, '    deschise: piese.reduce((s, p) => s + p.deschise, 0),', '    deschise: 0,', 'e2e', 'liniile nenumărate în fereastra importului')
o('A04', CA, "    ...(peCulori ? { culori: a.culori } : {}), ...(a.rezultat === 'mediane' ? { rezultat: 'mediane', mediane: a.mediane } : {}),",
  "    ...(peCulori ? { culori: a.culori } : a.rezultat === 'mediane' ? { rezultat: 'mediane', mediane: a.mediane } : {}),", 'e2e',
  'cererea pe culori fără Rezultat')

# ---- Fereastra (e2e) ----
o('F01', FE, '          <OptiuniMediane om={om} peCulori={peCulori}', '          <OptiuniMediane om={om} peCulori={false}', 'e2e',
  'bifa legării lipsește pe culori')
o('F02', FE, 'onChange={(e) => { onSchimba({ ...om, leaga: e.target.checked }); }}', 'onChange={() => { onSchimba({ ...om }); }}', 'e2e',
  'bifa legării nu schimbă nimic')
o('F03', FE, 'gr = legata ? null : grosime(k);', 'gr = null;', 'e2e', 'pastilele fără grosime')
o('F04', FE, '              {peCulori && om.leaga && mediane?.legaturi !== undefined && <p data-testid="trasare-legaturi">',
  '              {false && mediane?.legaturi !== undefined && <p data-testid="trasare-legaturi">', 'e2e', 'legăturile nenumărate în raport')
o('F05', FE, '              {!peCulori && mediane && mediane.grosimePx > 0 && <RaportGrosime',
  '              {mediane && mediane.grosimePx > 0 && <RaportGrosime', 'e2e', 'pe culori, și grosimea desenului întreg')
o('F06', DI, "t(puncte > 0 ? 'import.imagine.gol-mediane' : culori ? 'import.imagine.gol-culori' : 'import.imagine.gol')",
  "t(culori ? 'import.imagine.gol-culori' : puncte > 0 ? 'import.imagine.gol-mediane' : 'import.imagine.gol')", 'e2e',
  'pe culori, doar puncte: „nicio culoare bifată”')

SETURI = {
    'nuc': ['test/unit/trasare.mediane.culori.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
}
E2E = ['test/e2e/trasare-culori.spec.ts', 'test/e2e/trasare-mediana.spec.ts']
