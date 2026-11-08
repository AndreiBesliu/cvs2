# Lista de otrăvuri a feliei 25.3↑ (linia mediană, ADR 0222), 08.11.2026, alese de autor: subțierea (Lü și Wang, cozile,
# marginea de pornire), coturile treptelor și ciotul de un pixel, cioturile, punțile dintre joncțiuni, curățarea brațelor,
# locul joncțiunii (cele mai mici pătrate), centrul și grosimea de-a curmezișul, capetele (centrul capătului rotund, din
# centrul dreptei), legarea brațelor și drumul căilor (deschise, prin perechi, buclele), punctele, plafonul, ieșirea
# (`deschisa`, ultimul vârf), calculul, ușa (căile pe linie, buclele în operația căilor deschise) și fereastra prin e2e.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ME = 'src/trasare/mediana.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
PI = 'src/io/piesa.ts'
FE = 'src/ui/FereastraTrasare.tsx'
DI = 'src/ui/DialogImport.tsx'
AP = 'src/app/App.tsx'

# ---- Subțierea ----
o('S01', ME, '        if (B < 3 || B > 6) continue;', '        if (B < 2 || B > 6) continue;', 'nuc', 'Zhang–Suen fără Lü și Wang: trăsătura la 45° dispare')
o('S02', ME, '        if (sub === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;', '        if (false) continue;', 'nuc',
  'fără condițiile direcționale: subțierea roade prea mult')
o('S03', ME, '          if (!(f & 2)) coada[1].push(q);', '', 'nuc', 'vecinii pixelului scos nu se mai încearcă la a doua sub-trecere')
o('S04', ME, '      if (plini < 8) { coada[0].push(p); coada[1].push(p); sucio[p] = 3; }', '      if (plini < 7) { coada[0].push(p); coada[1].push(p); sucio[p] = 3; }', 'nuc',
  'marginea de pornire fără pixelii cu un singur vecin de fundal')
o('S05', ME, '        sucio[p] = (sucio[p] ?? 0) & ~bit;', '        sucio[p] = 0;', 'nuc', 'pixelul încercat pierde și semnul celeilalte sub-treceri')

# ---- Coturile treptelor, ciotul de un pixel ----
o('C01', ME, '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }',
  '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { break; }', 'nuc', 'coturile treptelor rămân')
o('C02', ME, '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 5) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }',
  '      if (x8[k] && x8[(k + 2) % 8] && !x8[(k + 4) % 8] && !x8[(k + 6) % 8]) { s[p] = 0; break; }', 'nuc',
  'un cot scos și când are vecin pe diagonala opusă')
o('C03', ME, '        if (simplu(s, W, H, jonct)) s[jonct] = 0;', '', 'nuc', 'ciotul de un pixel rămas sub linie: o joncțiune falsă')
o('C04', ME, '  return nc === 1;\n}', '  return nc <= 1;\n}', 'nuc', 'un pixel cu numărul de conexiune 0 (în mijlocul unui bloc) e luat drept simplu')

# ---- Cioturile, punțile ----
o('P01', ME, '      if (lungime(l.pix, W) < MEDIANA.ciot * R(jonct) + 1) {', '      if (lungime(l.pix, W) < R(jonct) + 1) {', 'nuc',
  'cioturile până la o rază: furca unui capăt drept rămâne')
o('P02', ME, '      if (lungime(l.pix, W) < MEDIANA.ciot * R(jonct) + 1) {', '      if (false) {', 'nuc', 'niciun ciot tăiat')
o('P03', ME, "    if ((grad[l.a] ?? 0) >= 3 && (grad[l.b] ?? 0) >= 3 && lungime(l.pix, W) < R(l.a) + R(l.b)) {",
  "    if ((grad[l.a] ?? 0) >= 3 && (grad[l.b] ?? 0) >= 3 && lungime(l.pix, W) < 1.5) {", 'nuc',
  'doar pixelii-joncțiune vecini se unesc: un X la 60° rămâne două Y')
o('P04', ME, '    if (v) { v.x += x; v.y += y; v.n++; v.r = Math.max(v.r, R(p)); } else grupuri.set(g, { x, y, r: R(p), n: 1 });',
  '    if (v) { v.x += x; v.y += y; v.n++; } else grupuri.set(g, { x, y, r: R(p), n: 1 });', 'nuc', 'raza grupului, a primului pixel, nu cea mai mare')

# ---- Brațele, locul joncțiunii ----
o('B01', ME, '      if (v) curataBrat(P, L, v.x, v.y, v.r);', '', 'nuc', 'brațele necurățate lângă joncțiune (X la 60°: 2,6 px)')
o('B02', ME, "  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) > 0 && Math.abs((L[k] ?? 0) - wa) <= Math.max(0.75, 0.2 * wa));",
  "  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) > 0 && Math.abs((L[k] ?? 0) - wa) <= Math.max(3, 0.6 * wa));", 'nuc',
  'brațul curățat cu o toleranță largă: punctele strâmbe rămân')
o('B03', ME, '      return !v || Math.hypot((q % W) + 0.5 - v.x, Math.floor(q / W) + 0.5 - v.y) >= v.r;', '      return true;', 'nuc',
  'pixelii din cercul joncțiunii rămân în brațe')
o('B04', ME, '    if (det > 0.05) {', '    if (false) {', 'nuc', 'joncțiunea în media pixelilor, nu în încrucișarea brațelor')
o('B05', ME, '      if (Math.hypot(lx - v.x, ly - v.y) <= v.r + 1) { x = lx; y = ly; }', '      { x = lx; y = ly; }', 'nuc',
  'punctul celor mai mici pătrate primit oricât de departe')
o('B06', ME, '        if ((cx - v.x) * dx + (cy - v.y) * dy < 0) { dx = -dx; dy = -dy; }', '', 'nuc',
  'direcția brațului fără sens: perechile se aleg la întâmplare')
o('B07', ME, '        if (k >= 3 && Math.hypot(x - (sel[0] ?? 0), y - (sel[1] ?? 0)) > Math.max(2, 1.5 * wa)) break;',
  '        if (k >= 3 && Math.hypot(x - (sel[0] ?? 0), y - (sel[1] ?? 0)) > Math.max(2, 8 * wa)) break;', 'nuc',
  'dreapta brațului din tot brațul (un arc dă o direcție greșită lângă joncțiune)')

# ---- Centrul, grosimea ----
o('M01', ME, '      const d = (a - b) / 2, w = a + b;', '      const d = (b - a) / 2, w = a + b;', 'nuc', 'centrul mutat în sens invers')
o('M02', ME, '      if (Math.abs(d) > Math.max(1, w / 3)) { L[i] = Number.NaN; continue; }', '', 'nuc',
  'mutarea primită oricât de mare (normala intrată în alt braț)')
o('M03', ME, '  for (let trecut = 0; trecut < 2; trecut++) {', '  for (let trecut = 0; trecut < 1; trecut++) {', 'nuc',
  'o singură trecere: tangenta din pixeli, nu din centre')
o('M04', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 0 } as const;', 'nuc', 'tangenta dintr-un singur punct (nicio direcție)')
o('M05', ME, '    if (c < T) return u - MEDIANA.pas + (MEDIANA.pas * (prev - T)) / Math.max(1e-12, prev - c);', '    if (c < T) return u;', 'nuc',
  'trecerea fără interpolare: grosimea crește cu un pas')
o('M06', ME, '  const fx = x - 0.5, fy = y - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;',
  '  const fx = x, fy = y, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;', 'nuc', 'câmpul biliniar decalat cu o jumătate de pixel')

# ---- Capetele ----
o('E01', ME, '      if (!cap) { retrage(P, L, f, W, H, T); return; }', '      if (!cap) return;', 'nuc', 'capetele rămân unde se oprește scheletul')
o('E02', ME, '  const avans = trecere(f, W, H, T, d.cx, d.cy, dx, dy) - wl / 2;', '  const avans = trecere(f, W, H, T, d.cx, d.cy, dx, dy);', 'nuc',
  'linia se termină în vârful trăsăturii (3b), nu în centrul capătului')
o('E03', ME, '  const avans = trecere(f, W, H, T, d.cx, d.cy, dx, dy) - wl / 2;\n  const cx = d.cx + dx * avans, cy = d.cy + dy * avans;',
  '  const avans = trecere(f, W, H, T, x0, y0, dx, dy) - wl / 2;\n  const cx = x0 + dx * avans, cy = y0 + dy * avans;', 'nuc',
  'mersul spre vârf din primul punct bun (strâmb cu 1 px la un capăt drept), nu din centrul dreptei')
o('E04', ME, "  const bun = (k: number): boolean => k >= n || ((L[k] ?? 0) >= MEDIANA.capat * wm && (L[k] ?? 0) <= Math.max(1.2 * wm, wm + 0.75));",
  "  const bun = (k: number): boolean => k >= n || (L[k] ?? 0) >= MEDIANA.capat * wm;", 'nuc', 'punctele prea late (normala strâmbă) luate drept bune')
o('E05', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.3, vecini: 2 } as const;', 'nuc', 'punctele rotunjimii capătului luate drept bune')
o('E06', ME, '  if (dx * (x0 - (P[2 * i1] ?? 0)) + dy * (y0 - (P[2 * i1 + 1] ?? 0)) < 0) { dx = -dx; dy = -dy; }', '', 'nuc',
  'direcția capătului fără sens: mersul spre vârf poate porni înapoi')

# ---- Legarea brațelor, căile ----
o('L01', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 0, capat: 0.9, vecini: 2 } as const;', 'nuc', 'niciun braț legat: bara T-ului în două')
o('L02', ME, 'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 30, capat: 0.9, vecini: 2 } as const;',
  'export const MEDIANA = { pas: 0.25, ciot: 1.5, cotitura: 70, capat: 0.9, vecini: 2 } as const;', 'nuc', 'brațele Y-ului legate (cotitura de 60°)')
o('L03', ME, '        if (cot <= MEDIANA.cotitura || lista.length === 2) cand.push({ i, j, c: cot });', '        if (cot <= MEDIANA.cotitura) cand.push({ i, j, c: cot });', 'nuc',
  'o joncțiune cu două brațe care cotesc nu mai e o trecere')
o('L04', ME, '    cand.sort((p, q) => p.c - q.c || p.i - q.i || p.j - q.j);', '    cand.sort((p, q) => q.c - p.c || p.i - q.i || p.j - q.j);', 'nuc',
  'perechile cele mai strâmbe întâi')
o('L05', ME, "  for (const [e] of muchii.entries()) if (!folosita[e]) mergi(e, 'a', true);", "  for (const [e] of muchii.entries()) if (!folosita[e]) mergi(e, 'a', false);", 'nuc',
  'un 8 (bucla prin încrucișare) ies o cale deschisă')
o('L06', ME, '      if (start) P.push(start[0], start[1]);', '', 'nuc', 'calea nu pornește din joncțiune')
o('L07', ME, '      if (!inchisa) { const fin = loc(mu[alt]); if (fin) P.push(fin[0], fin[1]); }', '', 'nuc', 'calea nu ajunge în joncțiune')

# ---- Punctele, plafonul, ieșirea ----
o('X01', ME, '    if (!a && !b && lungimeXY(P) < 0.5) { puncte++; continue; }', '    if (!a && !b && lungimeXY(P) < 0) { puncte++; continue; }', 'nuc',
  'un disc retras la un punct dă o cale de lungime zero')
o('X02', ME, '  for (const p of schelet) if (grad[p] === 0) puncte++;', '', 'nuc', 'pixelul izolat nu se numără')
o('X03', ME, "  if (valide.length > PLAFON_TRASARE.contururi) return { ok: false, cod: 'prea-multe', raport: raport(0, 0) };", '', 'nuc', 'fără plafon')
o('X04', ME, '      deschisa[k] = 1;', '', 'nuc', 'căile deschise ies închise')
o('X05', ME, '      bucati = [...r.bucati, { tip: 0, x: r.sfarsit[0], y: r.sfarsit[1], c1x: 0, c1y: 0, c2x: 0, c2y: 0, de: 0, la: 0 }];',
  '      bucati = r.bucati;', 'nuc', 'calea deschisă fără ultimul vârf (capătul pierdut)')

# ---- Calculul, ușa ----
o('U01', CT, "  if (c.rezultat === 'mediane') {", '  if (false) {', 'usa', 'cererea liniilor mediane dă contururi')
o('U02', CT, '      transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior, r.cai.deschisa]),',
  '      transfer: deTransferat([r.cai.inceput, r.cai.tip, r.cai.xy, r.cai.exterior]),', 'usa', '`deschisa` copiat, nu transferat')
o('U03', CA, "      cai.push({ varfuri, inchis: c.deschisa[k] !== 1 });", "      cai.push({ varfuri, inchis: true });", 'usa', 'liniile deschise ajung închise')
o('U04', CA, "      laturi.push('pe-linie');\n      continue;", "      laturi.push('exterior');\n      continue;", 'usa', 'liniile mediane tăiate pe exterior')
o('U05', PI, "    { id: 'deschise', latura: 'pe-linie', ale: (k: number) => !caleInchisa(p.cai[k] ?? {}) || p.laturi[k] === 'pe-linie' },",
  "    { id: 'deschise', latura: 'pe-linie', ale: (k: number) => !caleInchisa(p.cai[k] ?? {}) },", 'usa', 'bucla pe linie rămâne fără operație')
o('U06', CA, "    deschise: cai.filter((c, k) => !caleInchisa(c) || laturi[k] === 'pe-linie').length,",
  "    deschise: cai.filter((c) => !caleInchisa(c)).length,", 'usa', 'buclele pe linie nu se numără')
o('U07', CA, "    return { ...baza, sursa: r.raport.sursa, prag: r.raport.prag, histograma: r.raport.histograma, mediane: { grosimePx: grosime, bucle, jonctiuni, puncte } };",
  "    return { ...baza, sursa: r.raport.sursa, prag: r.raport.prag, histograma: r.raport.histograma };", 'usa', 'raportul fără grosime și puncte')

# ---- Fereastra, dialogul (e2e) ----
o('F01', CA, "      ...(peCulori ? { culori: a.culori } : a.rezultat === 'mediane' ? { rezultat: 'mediane' } : {}),",
  "      ...(peCulori ? { culori: a.culori } : {}),", 'e2e', '„Linii mediane” nu ajunge la worker')
o('F02', FE, "  const fel = freza === undefined ? null : Math.abs(freza - grosimeMm) <= Math.max(0.05, 0.1 * grosimeMm) ? 'potrivita' : freza > grosimeMm ? 'lata' : 'ingusta';",
  "  const fel = freza === undefined ? null : Math.abs(freza - grosimeMm) <= Math.max(0.05, 0.1 * grosimeMm) ? 'potrivita' : freza > grosimeMm ? 'ingusta' : 'lata';", 'e2e',
  'freza lată spusă îngustă')
o('F03', AP, '          {...(frezaImport === undefined ? {} : { freza: frezaImport })}\n', '', 'e2e', 'freza foii nu ajunge la fereastră')
o('F04', DI, "            {ok.deschise > 0 && (ok.format === 'imagine' && ok.trasare.mediane ? (", "            {ok.deschise > 0 && (false ? (", 'e2e',
  'dialogul spune „căi deschise” și nota grosimii liniei din fișier')
o('F05', FE, '      g.globalAlpha = 0.3;\n      g.lineWidth = mediane.grosimePx;', '      g.globalAlpha = 0;\n      g.lineWidth = mediane.grosimePx;', 'e2e',
  'banda grosimii nu se vede')
o('F06', DI, "  if (cod === 'gol' && format === 'imagine') return t(culori ? 'import.imagine.gol-culori' : puncte > 0 ? 'import.imagine.gol-mediane' : 'import.imagine.gol');",
  "  if (cod === 'gol' && format === 'imagine') return t(culori ? 'import.imagine.gol-culori' : 'import.imagine.gol');", 'e2e',
  'un disc plin, refuzat cu textul pragului')
o('F07', FE, "              {mediane && mediane.puncte > 0 && <p data-testid=\"trasare-puncte\">{t('import.trasare.puncte', { n: mediane.puncte })}</p>}", '', 'e2e',
  'punctele nu se spun')
o('F08', FE, "        {!peCulori && (\n          <label>\n            {t('import.trasare.rezultat')}", "        {false && (\n          <label>\n            {t('import.trasare.rezultat')}", 'e2e',
  '„Rezultatul” lipsește')

SETURI = {
    'nuc': ['test/unit/trasare.mediana.test.ts', 'test/unit/trasare.mediana.corpus.test.ts'],
    'nuc2': ['test/unit/trasare.mediana.test.ts', 'test/unit/trasare.mediana.corpus.test.ts', 'test/unit/import.imagine.test.ts', 'test/unit/trasare.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts'],
    'usa2': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts', 'test/unit/trasare.mediana.test.ts'],
}
E2E = ['test/e2e/trasare-mediana.spec.ts']
