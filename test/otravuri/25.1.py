# Lista de otrăvuri a feliei 25.1↑ (trasarea din imagine, alb-negru, ADR 0220), 07.11.2026, alese de autor: cerneala (alfa,
# întunecimea, polaritatea marginii, Inversează), pragul (Otsu, mijlocul mediilor, pragul ales), curățarea (petele, golurile,
# marginea, vecinătățile), conturul (marching squares, punctul-șa, interpolarea, fundalul din afară), orientarea, poligonul
# (conul, discul startului, întoarcerea), teșiturile, colțurile și curbele (întoarcerea, mutarea doar în afară, unirea,
# măsurarea), marginile dure, plafoanele, scara și curățarea în mm, ușa (semnăturile, DPI-ul din PNG, JPEG, EXIF, BMP),
# căile în mm (Y, laturile, praful); plus cele de interfață prin e2e (oprirea la Escape și la o citire nouă, textele ferestrei).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TR = 'src/trasare/trasare.ts'
CT = 'src/jobs/calculTrasare.ts'
BZ = 'src/jobs/bazinTrasare.ts'
IM = 'src/io/imagine.ts'
FI = 'src/io/formatImport.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'
DI = 'src/ui/DialogImport.tsx'
IC = 'src/app/ImportConectat.tsx'

# ---- Cerneala (lecția D7) ----
o('C01', TR, '  const transparenta = sub >= n * 0.01;', '  const transparenta = sub >= n * 0.9;', 'nuc', 'transparența cerută pe 90% din imagine')
o('C02', TR, '      if (s >= vizibili * 0.02) { plin = a; break; }', '      if (s >= vizibili * 0.5) { plin = a; break; }', 'nuc',
  'nivelul plin al alfa la mediană, nu la percentila 98')
o('C03', TR, '    for (let p = 0; p < n; p++) f[p] = Math.min(1, (d[4 * p + 3] ?? 0) / plin);', '    for (let p = 0; p < n; p++) f[p] = Math.min(1, (d[4 * p + 3] ?? 0) / 255);',
  'nuc', 'alfa nenormalizat (un desen semitransparent iese pe jumătate)')
o('C04', TR, '      const a = (d[4 * p + 3] ?? 0) / 255, k = 255 * (1 - a);', '      const a = 1, k = 0;', 'nuc',
  'luminozitatea fără alfa (transparentul negru devine cerneală)')
o('C05', TR, '    if (s / (2 * (W + H)) > 0.5) for (let p = 0; p < n; p++) f[p] = 1 - (f[p] ?? 0);',
  '    if (s / (2 * (W + H)) > 1.5) for (let p = 0; p < n; p++) f[p] = 1 - (f[p] ?? 0);', 'nuc', 'marginea imaginii nu mai spune fundalul')
o('C06', TR, '  if (o.inverseaza) for (let p = 0; p < n; p++) f[p] = 1 - (f[p] ?? 0);', '  if (o.inverseaza) for (let p = 1; p < n; p++) f[p] = 1 - (f[p] ?? 0);',
  'nuc', 'Inversează sare primul pixel')
o('C07', TR, '  if (o.inverseaza) for (let p = 0; p < n; p++) f[p] = 1 - (f[p] ?? 0);', '', 'nuc', 'Inversează ignorat')

# ---- Pragul ----
o('P01', TR, '  return cel < 0 ? 0.5 : (m0b + m1b) / 510;', '  return cel < 0 ? 0.5 : (m0b + m1b) / 530;', 'nuc', 'pragul sub mijlocul mediilor')
o('P02', TR, '    const m0 = s0 / w0, m1 = (total - s0) / w1, v = w0 * w1 * (m0 - m1) * (m0 - m1);',
  '    const m0 = s0 / w0, m1 = (total - s0) / w1, v = w0 * (m0 - m1) * (m0 - m1);', 'nuc', 'varianța dintre clase fără w1')
o('P03', TR, '(Math.max(1, Math.min(254, o.prag)) - 0.5) / 255', '(Math.max(1, Math.min(254, o.prag)) + 0.5) / 255', 'nuc',
  'pragul ales cu o jumătate de nivel prea sus')
o('P04', TR, "  const T = automat ? (sursa === 'alfa' ? 0.5 : pragAutomat(f))", '  const T = automat ? (pragAutomat(f))', 'nuc',
  'pe transparență, pragul din Otsu în loc de jumătatea acoperirii')

# ---- Curățarea ----
o('K01', TR, '    const sterse = arie.map((a) => a < petePx);', '    const sterse = arie.map((a) => a < petePx / 2);', 'nuc', 'petele șterse doar sub jumătatea pragului')
o('K02', TR, '    const umplute = arie.map((a, c) => a < gauriPx && !margine[c]);', '    const umplute = arie.map((a, c) => a < gauriPx);', 'nuc',
  'golul lipit de marginea imaginii, umplut')
o('K03', TR, '    const { et, arie } = componente(m, W, H, 1, true);', '    const { et, arie } = componente(m, W, H, 1, false);', 'nuc',
  'cerneala în 4-vecinătate la curățare (contrazice conturul)')
o('K04', TR, '    if (gauri > 0) for (let p = 0; p < m.length; p++) { const c = et[p] ?? -1; if (c >= 0 && umplute[c]) f[p] = 1; }',
  '    if (gauri > 0) for (let p = 0; p < m.length; p++) { const c = et[p] ?? -1; if (c >= 0 && umplute[c]) f[p] = 0.4; }', 'nuc', 'golurile umplute sub prag')
o('K05', TR, '{ f[p] = 0; m[p] = 0; }', '{ m[p] = 0; }', 'nuc', 'petele șterse doar din mască, nu din câmp')

# ---- Conturul ----
o('M01', TR, '    return orienteaza(a ?? 0, b ?? 0, g, -1);', '    return orienteaza(a ?? 0, b ?? 0, g, 1);', 'nuc', 'punctul-șa orientat invers')
o('M02', TR, '  const t = (a: number, b: number): number => { const r = (T - a) / (b - a);', '  const t = (a: number, b: number): number => { const r = 0.5 + 0 * (T - a) / (b - a);',
  'nuc', 'fără interpolare: conturul pe mijlocul laturilor')
o('M03', TR, '(i < 1 || j < 1 || i > W || j > H ? 0 :', '(i < 1 || j < 1 || i > W || j > H ? 1 :', 'nuc', 'în afara imaginii, cerneală')
o('M04', TR, '      if (pts.length >= 6) bucle.push(Float64Array.from(pts));', '      if (pts.length >= 10) bucle.push(Float64Array.from(pts));', 'nuc',
  'buclele de patru puncte (un pixel) pierdute')
o('M05', TR, "  const pozitive = Uint8Array.from(bucle, (b) => (arie(b) > 0 ? 1 : 0));", "  const pozitive = Uint8Array.from(bucle, (b) => (arie(b) < 0 ? 1 : 0));",
  'nuc', 'exterioarele și golurile inversate')

# ---- Poligonul ----
o('U01', TR, '    if (r <= eps && Number.isNaN(baza)) { cel = k; continue; }', '    if (r <= eps) { cel = k; continue; }', 'nuc',
  'discul startului acceptă și întoarcerea (acul sărit)')
o('U02', TR, '    if (proi < maxProi - eps) break;', '    if (proi < maxProi - 4 * eps) break;', 'nuc', 'întoarcerea îngăduită pe 4·eps')
o('U03', TR, '    const delta = Math.asin(Math.min(1, eps / r));', '    const delta = Math.asin(Math.min(1, (2 * eps) / r));', 'nuc', 'conul cât banda dublă')
o('U04', TR, '    if (valid) cel = k;', '    cel = k;', 'nuc', 'capătul laturii primit și în afara conului')

# ---- Teșiturile ----
o('T01', TR, '    if (Math.hypot(X(ic) - x[0], Y(ic) - x[1]) > depasire) continue;', '', 'nuc', 'colțul strâns oricât de departe de contur')
o('T02', TR, '  const scurta = Math.max(3.5, 6 * eps);', '  const scurta = Math.max(1.5, 6 * eps);', 'nuc', 'teșiturile de 2–3,5 px nestrânse')
o('T03', TR, '    if (dev > Math.max(0.5, 1.5 * eps)) continue;', '    if (dev > Math.max(5, 1.5 * eps)) continue;', 'nuc',
  'colțul strâns și când bucla nu stă pe cele două drepte')
o('T04', TR, '    if (Math.abs(rotire) < (25 * Math.PI) / 180) continue;', '    if (Math.abs(rotire) < (5 * Math.PI) / 180) continue;', 'nuc',
  'colțul strâns și pe o rotire de 5°')

# ---- Colțurile și curbele ----
o('B01', TR, '    eColt.push(fix.has(V[k] ?? -1) || d > colt * 4 * eps || intoarcere);', '    eColt.push(fix.has(V[k] ?? -1) || d > colt * 4 * eps);', 'nuc',
  'întoarcerea (limba) nu e colț')
o('B02', TR, '    if (i && inafara && Math.hypot(i[0] - ox, i[1] - oy) <= raza) { vx[k] = i[0]; vy[k] = i[1]; }',
  '    if (i && Math.hypot(i[0] - ox, i[1] - oy) <= raza) { vx[k] = i[0]; vy[k] = i[1]; }', 'nuc', 'vârful mutat și spre coardă (acul scurtat)')
o('B03', TR, '    eColt.push(fix.has(V[k] ?? -1) || d > colt * 4 * eps || intoarcere);', '    eColt.push(fix.has(V[k] ?? -1) || d > colt * 8 * eps || intoarcere);', 'nuc',
  'pragul colțurilor dublu')
o('B04', TR, '    const alfa = dv > 1e-9 ? Math.max(0.55, Math.min(1, (4 * h) / (3 * dv))) : 0.75;', '    const alfa = 0.75;', 'nuc',
  'mânerele fixe, nu prin vârful buclei')
o('B05', TR, '      if (eroare > tau) break;', '      if (eroare > 3 * tau) break;', 'nuc', 'cubicele unite peste tau')
o('B06', TR, '      if (d > 0.05) d = Math.min(d, la(k - 1, px, py), la(k + 1, px, py));', '', 'nuc', 'abaterea fără bucățile vecine (supraestimată)')
o('B07', TR, '      ab = Math.max(ab, d);', '      ab = Math.max(ab, d / 2);', 'nuc', 'abaterea raportată pe jumătate')
o('B08', TR, '    const raza = Math.max(2 * eps, 0.75, Math.min(2.5, 0.08 * Math.min(lung(k + m - 1), lung(k))));', '    const raza = 0;', 'nuc',
  'vârfurile nemutate în încrucișarea laturilor')

# ---- Marginile dure ----
o('D01', TR, "  const margini = langa > 0 && nuante / langa < 0.15 ? 'dure' : 'netezite';", "  const margini = langa > 0 && nuante / langa < 0.015 ? 'dure' : 'netezite';",
  'nuc', 'marginile dure nerecunoscute')
o('D02', TR, '  const bucle = margini === \'dure\' ? contururi(f, W, H, T).map(netezeste) : contururi(f, W, H, T);', '  const bucle = contururi(f, W, H, T);', 'nuc',
  'treptele marginilor dure nenetezite')
o('D03', TR, '    for (let c = 0; c < 2; c++) r[2 * k + c] = (v(k - 2, c) + 2 * v(k - 1, c) + 3 * v(k, c) + 2 * v(k + 1, c) + v(k + 2, c)) / 9;',
  '    for (let c = 0; c < 2; c++) r[2 * k + c] = (v(k - 2, c) + 2 * v(k - 1, c) + 3 * v(k, c) + 2 * v(k + 1, c) + v(k + 2, c)) / 8;', 'nuc', 'media netezirii scalată')

# ---- Plafoanele ----
o('L01', TR, '  if (bucle.length > PLAFON_TRASARE.contururi) {', '  if (bucle.length > 10 * PLAFON_TRASARE.contururi) {', 'nuc', 'plafonul contururilor de 10 ori')

# ---- Scara și curățarea în mm ----
o('S01', CT, '  const latimeMm = c.latimeMm ?? (latimeFisier / (c.dpi ?? DPI_PRESUPUS)) * 25.4;', '  const latimeMm = c.latimeMm ?? (latimeFisier / (c.dpi ?? DPI_PRESUPUS)) * 25;',
  'usa', 'țolul de 25 mm')
o('S02', CT, "  const scara = c.latimeMm !== null ? 'latime' : c.dpi !== null ? 'fisier' : 'presupus';", "  const scara = c.latimeMm !== null ? 'latime' : c.dpi !== null ? 'presupus' : 'fisier';",
  'usa', 'de unde vine scara, inversat')
o('S03', CT, '  const dpi = (latimeFisier / latimeMm) * 25.4;', '  const dpi = (img.latime / latimeMm) * 25.4;', 'e2e', 'DPI-ul imaginii reduse, nu al fișierului')
o('S04', CT, '  return Math.max(4, (Math.PI * (dMm / 2) ** 2) / (mmPePx * mmPePx));', '  return Math.max(4, (Math.PI * (dMm / 2) ** 2) / mmPePx);', 'usa',
  'aria pragului împărțită la pixel, nu la pătratul lui')
o('S05', CT, '  const mmPePx = latimeMm / img.latime;', '  const mmPePx = latimeMm / (redusDin?.latime ?? img.latime);', 'e2e', 'pixelul imaginii reduse socotit ca al fișierului')

# ---- Ușa ----
o('I01', IM, "        if (tip === 'pHYs' && n >= 9) return b[i + 16] === 1 ? plauzibil(v.getUint32(i + 8) * 0.0254) : null;",
  "        if (tip === 'pHYs' && n >= 9) return plauzibil(v.getUint32(i + 8) * 0.0254);", 'usa', 'pHYs fără unitate citit ca px pe metru')
o('I02', IM, "        if (tip === 'IDAT' || tip === 'IEND') return null;", "        if (tip === 'IEND') return null;", 'usa', 'pHYs căutat și după IDAT')
o('I03', IM, '      if (u === 2) return plauzibil(x * 2.54);', '      if (u === 2) return plauzibil(x);', 'usa', 'JFIF pe cm citit ca pe țol')
o('I04', IM, '  return unitate === 3 ? plauzibil(rez * 2.54) : unitate === 2 ? plauzibil(rez) : null;', '  return unitate === 3 ? plauzibil(rez * 2.5) : unitate === 2 ? plauzibil(rez) : null;',
  'usa', 'EXIF pe cm cu 2,5')
o('I05', IM, '  const le = v.getUint8(t) === 0x49;', '  const le = true;', 'usa', 'EXIF big-endian citit little-endian')
o('I06', IM, '      if (v.getUint32(14, true) < 40) return null;', '', 'usa', 'BMP cu antetul vechi citit ca BITMAPINFOHEADER')
o('I07', IM, 'Number.isFinite(dpi) && dpi >= 10 && dpi <= 10_000 ? dpi : null', 'Number.isFinite(dpi) && dpi > 0 ? dpi : null', 'usa', 'DPI-urile neplauzibile primite')
o('I08', IM, "(s(0, 'MM') && b[2] === 0 && b[3] === 42)", "(s(0, 'MM') && b[2] === 42)", 'usa', 'TIFF big-endian nerecunoscut')
o('I09', IM, "  if (s(0, 'RIFF') && s(8, 'WEBP')) return 'webp';", "  if (s(0, 'RIFF')) return 'webp';", 'usa', 'orice RIFF luat drept WebP')
o('I10', FI, 'tiff?)$/i', 'tif)$/i', 'usa', '.tiff nerecunoscut după nume (refuzul TIFF își pierde motivul)')

# ---- Căile în mm ----
o('A01', CA, '  const P = (x: number, y: number): Punct => ({ x: x * mmPePx, y: (inaltimePx - y) * mmPePx });', '  const P = (x: number, y: number): Punct => ({ x: x * mmPePx, y: y * mmPePx });',
  'usa', 'desenul întors pe verticală')
o('A02', CA, "    laturi.push(c.exterior[k] === 1 ? 'exterior' : 'interior');", "    laturi.push('exterior');", 'usa', 'golurile tăiate pe exterior')
o('A03', CA, '    const varfuriPeste = Math.hypot(x1 - x0, y1 - y0) * mmPePx >= REZOLUTIE;', '    const varfuriPeste = true;', 'usa', 'praful nu se mai judecă')
o('A04', CA, '    if (varfuri.length < 2 || (!varfuriPeste && praf(varfuri))) { sub++; continue; }', '    if (varfuri.length < 2 || !varfuriPeste) { sub++; continue; }', 'usa',
  'praful judecat doar pe vârfuri (bucla cu mânerele lungi sărită)')
o('A05', CA, "    if (b - a > PLAFON.varfuriCale) { mari++; continue; }", "    if (b - a > 2 * PLAFON.varfuriCale) { mari++; continue; }", 'usa', 'plafonul unei căi dublat')
o('A06', CA, "  if (felImagine(f.octeti) === 'tiff' || (/\\.tiff?$/i.test(f.nume) && !felImagine(f.octeti))) return { ok: false, cod: 'tiff', format: 'imagine' };",
  "  if (felImagine(f.octeti) === 'tiff') return { ok: false, cod: 'tiff', format: 'imagine' };", 'usa', 'un .tif fără semnătură nu mai e refuzat ca TIFF')

# ---- Interfața (e2e) ----
o('E01', IC, '    cerere.current++;\n    opresteCitirea();\n    onInchide();', '    cerere.current++;\n    onInchide();', 'e2e',
  'Renunță / Escape nu opresc trasarea (workerul merge mai departe)')
o('E02', IC, '    opresteCitirea();\n    const ac = new AbortController();', '    const ac = new AbortController();', 'e2e',
  'o citire nouă nu o oprește pe cea veche')
o('E03', BZ, "    semnal?.addEventListener('abort', anuleaza);", '', 'e2e', 'bazinul nu ascultă oprirea')
o('E04', FE, "              {stare !== 'citire' && stare.ok && <p data-testid=\"trasare-abatere\">", '              {raport && <p data-testid="trasare-abatere">', 'e2e',
  'abaterea arătată și la un refuz')
o('E05', FE, "  const aleasa = raport ? t(raport.sursa === 'alfa' ? 'import.trasare.aleasa.alfa' : 'import.trasare.aleasa.lum') : '';",
  "  const aleasa = raport ? t(raport.sursa === 'lum' ? 'import.trasare.aleasa.alfa' : 'import.trasare.aleasa.lum') : '';", 'e2e', 'sursa aleasă spusă invers')
o('E06', DI, "{t(ok.format === 'imagine' ? 'import.cai-trasate' : 'import.cai',", "{t('import.cai',", 'e2e', 'contururile trasate spuse „din imbricare”')

SETURI = {
    'nuc': ['test/unit/trasare.test.ts', 'test/unit/trasare.corpus.test.ts'],
    'nuc2': ['test/unit/trasare.test.ts', 'test/unit/trasare.corpus.test.ts', 'test/unit/import.imagine.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
    'usa2': ['test/unit/import.imagine.test.ts', 'test/unit/trasare.test.ts', 'test/unit/import.actiuni.test.ts'],
}
E2E = ['test/e2e/trasare.spec.ts']
