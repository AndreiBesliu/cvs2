# Lista de otrăvuri a feliei 25.4↑ (scanările și pozele, ADR 0224), 09.11.2026, alese de autor: lumina (fereastra locală,
# filtrul pe fereastră, închiderea, polinomul hârtiei, raportul cu pragul de jos, întinderea pe fondul închis), polaritatea
# (mediana din jur, zgomotul, semnul), nucleul (lumina, sugestia, „Ignoră ce atinge marginea”), culorile (marginea la fundal),
# calculul (zona ca decupaj, scara, tăierea zonei), ușa și fereastra prin e2e (lumina, marginea, zona: butonul, Shift, clicul,
# mutarea, întinderea, desenul la locul zonei, sugestia). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din
# worktree-ul feliei (în afara Drive-ului), după commit, cu CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LU = 'src/trasare/lumina.ts'
TR = 'src/trasare/trasare.ts'
CU = 'src/trasare/culori.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
IM = 'src/io/imagine.ts'
FE = 'src/ui/FereastraTrasare.tsx'

# ---- Lumina: fereastra, filtrul, fundalul local ----
o('L01', LU, '  return Math.max(15, 2 * Math.round(Math.min(W, H) / 24) + 1);', '  return Math.max(15, 2 * Math.round(Math.min(W, H) / 48) + 1);', 'nuc',
  'fereastra fundalului local pe jumătate')
o('L02', LU, '        G[i] = k === 0 ? x : max ? (x > g ? x : g) : (x < g ? x : g);', '        G[i] = max ? (x > g ? x : g) : (x < g ? x : g);', 'nuc',
  'extremele pe linii fără începutul blocurilor: fereastra se lungește spre stânga')
o('L03', LU, '        const qa = y * BENZI, qc = (y + w - 1) * BENZI, r = y * W + x0;', '        const qa = y * BENZI, qc = (y + w - 2) * BENZI, r = y * W + x0;', 'nuc',
  'fereastra pe coloane cu un pixel mai scurtă')
o('L04', LU, '  const w = 2 * h + 1, gol = max ? -Infinity : Infinity;', '  const w = 2 * h + 1, gol = 0;', 'nuc', 'bordura cu 0: la margini, minimul și maximul văd negru')
o('L05', LU, '  return filtruFereastra(a, W, H, h, !hartieDeschisa, a, t);', '  return filtruFereastra(a, W, H, h, hartieDeschisa, a, t);', 'nuc',
  'fundalul local e dilatarea, nu închiderea: treapta umbrei se mută')

# ---- Lumina: fundalul neted ----
o('L06', LU, '  for (let it = 0; it < 4; it++) {\n    const A = new Float64Array(n * n), b = new Float64Array(n);',
  '  for (let it = 0; it < 1; it++) {\n    const A = new Float64Array(n * n), b = new Float64Array(n);', 'nuc', 'o singură potrivire, pe clasa Otsu')
o('L07', LU, '  const aproape = (v: number, s: number): boolean => (hartieDeschisa ? v >= 0.85 * s : v <= 1.5 * s);',
  '  const aproape = (v: number, s: number): boolean => (hartieDeschisa ? v >= 0.5 * s : v <= 1.5 * s);', 'nuc', 'cerneala intră în potrivirea hârtiei')
o('L08', LU, ' t[6] = u * u * u; t[7] = u * u * v; t[8] = u * v * v; t[9] = v * v * v;', ' t[6] = 0; t[7] = 0; t[8] = 0; t[9] = 0;', 'nuc',
  'polinomul de gradul 2: o suprafață cubică nu încape')
o('L09', LU, 'const GRILA = 32;', 'const GRILA = 400;', 'nuc', 'grila evaluării prea rară: interpolarea se depărtează de polinom')
o('L10', LU, "  return { c, variatie: mx > 0 && mn <= mx ? (mx - mn) / mx : 0 };", "  return { c, variatie: mx > 0 && mn <= mx ? mx - mn : 0 };", 'nuc',
  'variația în luminozitate, nu ca parte din hârtia cea mai deschisă')

# ---- Lumina: raportul ----
o('L11', LU, '      const b = B[p] ?? 0, v = (b - (l[p] ?? 0)) / Math.max(jos, b);', '      const b = B[p] ?? 0, v = (b - (l[p] ?? 0)) / Math.max(0.02, b);', 'nuc',
  'fără pragul de jos: zgomotul mesei închise iese pete')
o('L12', LU, '    const jos = Math.max(0.02, 0.25 * percentila(B, 0.95,', '    const jos = Math.max(0.02, 0.6 * percentila(B, 0.95,', 'nuc',
  'pragul de jos prea sus: colțul întunecat al foii își pierde cerneala')
o('L13', LU, '  const s = p995 > 1.01 ? p995 - 1 : 1;', '  const s = 1;', 'nuc', 'creta neîntinsă după percentila 99,5')

# ---- Polaritatea ----
o('L14', LU, '  return deschise > inchise;', '  return deschise < inchise;', 'nuc', 'polaritatea întoarsă')
o('L15', LU, '  const prag = Math.max(5, 3 * 1.4826 * mad);', '  const prag = 0;', 'nuc', 'și zgomotul hârtiei se numără')
o('L16', LU, '  const k = Math.max(3, Math.round(Math.min(w, h) / 24)), dev = new Int16Array(w * h), hist = new Int32Array(256);',
  '  const k = 1, dev = new Int16Array(w * h), hist = new Int32Array(256);', 'nuc', 'mediana pe 3 × 3: pe trăsăturile groase, cerneala e majoritatea')
o('L17', LU, '      const tinta = (n + 1) >> 1;', '      const tinta = n;', 'nuc', 'maximul ferestrei în locul medianei')
o('L18', LU, '  const hartieDeschisa = cernealaDeschisa(l, W, H) === inverseaza;', '  const hartieDeschisa = !inverseaza;', 'nuc',
  'polaritatea nu se caută: creta e luată drept hârtie')

# ---- Nucleul ----
o('T01', TR, "    if (hi && lumina !== 'uniforma') {", '    if (false) {', 'nuc2', 'lumina aleasă nu se aplică')
o('T02', TR, "  const inegala = sursa === 'lum' && lumina === 'uniforma' ? variatieHartie(f, W, H, T) : null;",
  '  const inegala = variatieHartie(f, W, H, T);', 'nuc2', 'sugestia și la luminile de poză')
o('T03', TR, '      if (margine && atinge[c] === true) { laMargine++; return true; }\n', '', 'nuc2', '„Ignoră ce atinge marginea” nu șterge nimic')
o('T04', TR, '    if (pete + laMargine > 0) for (let p = 0;', '    if (pete > 0) for (let p = 0;', 'nuc2', 'bucățile lipite de margine numărate, dar neșterse')
o('T05', TR, '  if (petePx <= 0 && gauriPx <= 0 && !margine) return { pete, gauri, margine: laMargine };',
  '  if (petePx <= 0 && gauriPx <= 0) return { pete, gauri, margine: laMargine };', 'nuc2', 'fără pete de șters, marginea nu se curăță')
o('T06', TR, '      const prag0 = 1 - pragAutomat(f, hi);', '      const prag0 = 0.5;', 'nuc2', 'prima potrivire a fundalului neted, pe un prag fix')
o('T07', TR, '      if (hi) { f[p] = l / 255;', '      if (hi) { f[p] = 1 - l / 255;', 'nuc2', 'luminilor de poză li se dă întunecimea, nu luminozitatea')

# ---- Culorile ----
o('C01', CU, '    if (o.margine === true && laFundal >= 0) {', '    if (false) {', 'cul', 'pe culori, marginea nu se curăță')
o('C02', CU, '    const laFundal = fundal >= 0 ? prima[fundal] ?? fundal : transparenta ? T : -1;', '    const laFundal = T;', 'cul',
  'bucata lipită de margine trece la transparent, nu la fundalul imaginii opace')

# ---- Calculul: zona ----
o('Z01', CT, '  if (zona) img = decupeaza(img, zona);', '', 'usa', 'zona nu se decupează')
o('Z02', CT, '  const mmPePx = c.latimeMm !== null ? c.latimeMm / img.latime :', '  const mmPePx = c.latimeMm !== null ? c.latimeMm / intreg.latime :', 'usa',
  'lățimea scrisă luată ca a imaginii întregi')
o('Z03', CT, '  const pxFisier = (redusDin?.latime ?? intreg.latime) / intreg.latime;', '  const pxFisier = 1;', 'e2e',
  'scara din DPI uită reducerea imaginii (17 Mpx)')
o('Z04', CT, '  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;', '  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };', 'usa',
  'o zonă din afara imaginii nu devine „toată imaginea”')
o('Z05', CT, '    const a = ((z.y + y) * img.latime + z.x) * 4, o = y * z.w * 4;', '    const a = (z.y + y) * img.latime * 4, o = y * z.w * 4;', 'usa',
  'decupajul ia rândurile zonei din stânga imaginii')
o('Z06', CT, ', ...(c.optiuni.margine === true ? { margine: true } : {}) });', ' });', 'usa', 'pe culori, marginea nu ajunge la nucleu')
o('Z07', CT, '  const intreg = { latime: img.latime, inaltime: img.inaltime };', '  const intreg = { latime: img.latime, inaltime: img.latime };', 'usa',
  'imaginea întreagă cu înălțimea greșită')

# ---- Ușa ----
o('A01', CA, '    intreg: { latimePx: r.intreg.latime, inaltimePx: r.intreg.inaltime }, zona: r.zona,', '    intreg: { latimePx: t.latime, inaltimePx: t.inaltime }, zona: r.zona,', 'usa',
  'raportul ferestrei ia zona drept imaginea întreagă')
o('A02', CA, "        ...(a.lumina !== 'uniforma' ? { lumina: a.lumina } : {}), ...(a.margine ? { margine: true } : {}),",
  "        ...(a.margine ? { margine: true } : {}),", 'e2e', 'lumina aleasă nu ajunge la worker')
o('A03', CA, "        ...(a.lumina !== 'uniforma' ? { lumina: a.lumina } : {}), ...(a.margine ? { margine: true } : {}),",
  "        ...(a.lumina !== 'uniforma' ? { lumina: a.lumina } : {}),", 'e2e', 'marginea aleasă nu ajunge la worker')
o('A04', CA, ', dpi: dpiImagine(f.octeti), ...(a.zona ? { zona: a.zona } : {}),', ', dpi: dpiImagine(f.octeti),', 'e2e', 'zona nu ajunge la worker')

# ---- Fereastra (e2e) ----
o('F01', FE, '    g.translate(zx, zy);\n', '', 'e2e', 'vectorii zonei desenați în colțul imaginii, nu la locul ei')
o('F02', FE, "        {!peCulori && (raport ? raport.sursa === 'lum' : alegeri.sursa === 'lum') && (", '        {!peCulori && (', 'e2e',
  'Lumina și pe transparență')
o('F03', FE, '              onClick={() => { setModZona(!modZona); }}>', '              onClick={() => { setModZona(false); }}>', 'e2e', 'butonul Zona nu se apasă')
o('F04', FE, '            if (modZona || e.shiftKey) {', '            if (modZona) {', 'e2e', 'Shift nu desenează zona')
o('F05', FE, '            if (z && z.w >= 4 && z.h >= 4) onSchimba({ zona: rotunjita(z) });', '            if (z) onSchimba({ zona: rotunjita(z) });', 'e2e',
  'un clic face o zonă goală')
o('F06', FE, '              onClick={() => { setZonaCiorna(null); onSchimba({ zona: null }); }}>', '              onClick={() => { setZonaCiorna(null); }}>', 'e2e',
  '„Toată imaginea” nu scoate zona')
o('F07', FE, '              {raport.sursa === \'lum\' && raport.lumina === \'uniforma\' && raport.inegala !== null && raport.inegala > SUGESTIE_INEGALA && (',
  '              {raport.sursa === \'lum\' && raport.lumina === \'uniforma\' && raport.inegala !== null && raport.inegala > 0.99 && (', 'e2e', 'sugestia nu apare')
o('F08', FE, "onChange={(e) => { onSchimba({ margine: e.target.checked }); }} />", "onChange={() => { onSchimba({}); }} />", 'e2e', 'bifa marginii nu se trimite')
o('F09', FE, "  return d === 'n' || d === 's' || d === 'e' || d === 'v' || d === 'ne' || d === 'nv' || d === 'se' || d === 'sv' ? d : 'muta';",
  "  return d === 'n' || d === 's' || d === 'e' || d === 'v' || d === 'ne' || d === 'nv' || d === 'se' || d === 'sv' ? d : 'noua';", 'e2e',
  'tragerea din interiorul zonei face o zonă nouă, nu o mută')
o('F10', FE, "  const xa = d.mod.endsWith('v') ? x : z.x, xb = d.mod.endsWith('e') ? x : z.x + z.w;", '  const xa = z.x, xb = z.x + z.w;', 'e2e',
  'laturile din stânga și din dreapta nu întind zona')
o('F11', IM, "  culori: CULORI_IMPLICITE, mediane: MEDIANE_IMPLICITE, lumina: 'uniforma', margine: false, zona: null,",
  "  culori: CULORI_IMPLICITE, mediane: MEDIANE_IMPLICITE, lumina: 'neuniforma', margine: false, zona: null,", 'e2e', 'lumina implicită „Neuniformă”')

SETURI = {
    'nuc': ['test/unit/trasare.lumina.test.ts'],
    'nuc2': ['test/unit/trasare.lumina.test.ts', 'test/unit/trasare.test.ts', 'test/unit/import.imagine.test.ts'],
    'cul': ['test/unit/trasare.lumina.test.ts', 'test/unit/trasare.culori.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
}
E2E = ['test/e2e/trasare-scanari.spec.ts', 'test/e2e/trasare.spec.ts']
