# Lista de otrăvuri a feliei 26.A↑ (importul WMF, ADR 0117), 01.11.2026, alese de autor: unitățile (antetul, modurile metrice,
# unitatea aleasă), axa Y, numărarea punctelor din PolyPolygon, maparea (fereastra, vizorul, mutările, scările, ISOTROPIC,
# SaveDC / RestoreDC), sensul arcelor, tabelul obiectelor (penița și pensula nule), lanțul de LineTo, ce se sare, numărat,
# ușa după antet și fluxul; plus trei de interfață, prin e2e (dialogul unității, fereastra de fișiere).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


WMF = 'src/io/wmf.ts'
COD = 'src/io/wmfCoduri.ts'
FMT = 'src/io/formatImport.ts'
CAL = 'src/ui/actiuniImportCalcul.ts'
PIE = 'src/io/piesa.ts'
DLG = 'src/ui/DialogImport.tsx'
CON = 'src/app/ImportConectat.tsx'
APP = 'src/app/App.tsx'

# ---- Unitățile și axa Y (cerute de sesiunea principală) ----
o('U01', WMF, 'const p = k ? 25.4 / k.inch : MM_PE_UNITATE_WMF[unitate];', 'const p = k ? 25.4 / 1440 : MM_PE_UNITATE_WMF[unitate];',
  'wmf', 'unitățile pe țol ale antetului ignorate (totul în twips)')
o('U02', WMF, "const unitate = o.unitate ?? 'px';", "const unitate = o.unitate ?? 'mm';", 'wmf', 'fără antet, implicit mm, nu 1/96 țol')
o('U03', COD, 'px: 25.4 / 96, twip', 'px: 25.4 / 72, twip', 'wmf', 'px-ul de 1/72 țol')
o('U04', WMF, 'const METRIC: Readonly<Record<number, number>> = { 2: 0.1, 3: 0.01,', 'const METRIC: Readonly<Record<number, number>> = { 2: 0.1, 3: 0.1,',
  'wmf', 'HIMETRIC citit ca LOMETRIC')
o('U05', WMF, '    return { x: dx * this.p, y: (this.inaltime - dy) * this.p };', '    return { x: dx * this.p, y: dy * this.p };',
  'wmf', 'axa Y neîntoarsă (desenul cu capul în jos)')
o('U06', WMF, '    return { x: dx * this.p, y: (this.inaltime - dy) * this.p };', '    return { x: dx * this.p, y: -dy * this.p };',
  'wmf', 'Y întors față de origine, nu față de marginea de jos a cadrului')
o('U07', WMF, '  const declarate = k !== null || (!r.nemetric && r.metric !== null);', '  const declarate = k !== null;',
  'wmf', 'un fișier metric fără antet cere unitatea în dialog')
o('U08', WMF, '      if (q === undefined) this.nemetric = true;', '      if (q === undefined) this.nemetric = false;', 'wmf', 'un desen nemetric lângă unul metric trece drept declarat')

# ---- PolyPolygon și poligoanele (cerute) ----
o('P01', WMF, '    for (let j = 1, o = 1 + k; j <= k; o += 2 * a.u(j), j++) {', '    for (let j = 1, o = 1 + k; j <= k; o += a.u(j), j++) {',
  'wmf', 'punctele poligonului următor numărate pe jumătate')
o('P02', WMF, '    for (let j = 1, o = 1 + k; j <= k; o += 2 * a.u(j), j++) {', '    for (let j = 1, o = k; j <= k; o += 2 * a.u(j), j++) {',
  'wmf', 'punctele încep cu un cuvânt mai devreme (numărul poligoanelor)')
o('P03', WMF, '    if (1 + k + 2 * total > a.n) throw new EroareWmf(a.poz);', '    if (1 + k + total > a.n) throw new EroareWmf(a.poz);',
  'wmf', 'un PolyPolygon cu prea puține puncte trece de verificare')
o('P04', WMF, '    if (k < 0 || 1 + 2 * k > a.n) throw new EroareWmf(a.poz);', '    if (k < 0) throw new EroareWmf(a.poz);',
  'wmf', 'un poligon care cere mai multe puncte decât are trece')
o('P05', WMF, "      case POLYLINE: case POLYGON: return this.poligon(fn === POLYGON, a);", "      case POLYLINE: case POLYGON: return this.poligon(true, a);",
  'wmf', 'polilinia închisă ca un poligon')

# ---- Maparea ----
o('M01', WMF, '    if ((m.mod !== MM_ISOTROPIC && m.mod !== MM_ANISOTROPIC) || x === 0 || y === 0) return;', '    if (x === 0 || y === 0) return;',
  'wmf', 'extinderile schimbate și în modurile fixe')
o('M02', WMF, '    if ((m.mod !== MM_ISOTROPIC && m.mod !== MM_ANISOTROPIC) || x === 0 || y === 0) return;', '    if (m.mod !== MM_ISOTROPIC && m.mod !== MM_ANISOTROPIC) return;',
  'wmf', 'o extindere nulă primită (împărțirea la zero)')
o('M03', WMF, "  if (m.mod !== MM_ISOTROPIC) return m;", "  return m;", 'wmf', 'ISOTROPIC fără strângerea vizorului')
o('M04', WMF, "    const q = METRIC[v === MM_ISOTROPIC ? MM_LOMETRIC : v] as number;", "    const q = METRIC[v === MM_ISOTROPIC ? 3 : v] as number;",
  'wmf', 'ISOTROPIC pornește din HIMETRIC')
o('M05', WMF, '    this.mapare({ ...m, mod: v, we: { x: (d.x * this.p) / q, y: (d.y * this.p) / q }, ve: { x: d.x, y: -d.y } });',
  '    this.mapare({ ...m, mod: v, we: { x: (d.x * this.p) / q, y: (d.y * this.p) / q }, ve: { x: d.x, y: d.y } });',
  'wmf', 'modurile metrice cu Y în jos')
o('M06', WMF, '        return this.mapare({ ...m, wo: { x: m.wo.x + a.i(1), y: m.wo.y + a.i(0) } });', '        return this.mapare({ ...m, wo: { x: m.wo.x - a.i(1), y: m.wo.y - a.i(0) } });',
  'wmf', 'OffsetWindowOrg cu semnul întors')
o('M07', WMF, '    const nou = { x: Math.trunc((e.x * xNum) / xDen) || 1, y: Math.trunc((e.y * yNum) / yDen) || 1 };',
  '    const nou = { x: Math.trunc((e.x * xDen) / xNum) || 1, y: Math.trunc((e.y * yDen) / yNum) || 1 };', 'wmf', 'ScaleWindowExt cu fracția întoarsă')
o('M08', WMF, "      case SETVIEWPORTORG: return this.mapare({ ...this.s.m, vo: { x: a.i(1), y: a.i(0) } });",
  "      case SETVIEWPORTORG: return this.mapare({ ...this.s.m, vo: { x: a.i(0), y: a.i(1) } });", 'wmf', 'originea vizorului cu X și Y inversate')
o('M09', WMF, '        const pastrate = k < 0 ? this.salvate.length + k : k - 1;', '        const pastrate = k < 0 ? this.salvate.length + k : k;',
  'wmf', 'RestoreDC absolut cu o stare mai sus')
o('M10', WMF, '        this.s = this.salvate[pastrate] as Stare;', '        this.s = { ...this.s, m: (this.salvate[pastrate] as Stare).m };',
  'wmf', 'RestoreDC ține poziția curentă, penița și pensula de după SaveDC')
o('M11', WMF, '  const marime = k ? { x: k.l, y: k.h } : (primaFereastra(dv, a.inceput) ?? { x: 1, y: 1 });', '  const marime = k ? { x: k.l, y: k.h } : { x: 1, y: 1 };',
  'wmf', 'fără antet, vizorul nu urmează fereastra fișierului')
o('M12', WMF, '  const m: Mapare = { mod: MM_ANISOTROPIC, wo: k ? { x: k.x, y: k.y } : { x: 0, y: 0 },', '  const m: Mapare = { mod: MM_ANISOTROPIC, wo: { x: 0, y: 0 },',
  'wmf', 'fereastra playerului nu pornește din colțul cadrului')

# ---- Arcele, elipsele, dreptunghiurile ----
o('R01', WMF, '    const orar = m.ve.x / m.we.x < 0 && m.ve.y / m.we.y > 0;', '    const orar = m.ve.x / m.we.x < 0;', 'wmf', 'orar și cu ambele axe întoarse')
o('R02', WMF, '    const orar = m.ve.x / m.we.x < 0 && m.ve.y / m.we.y > 0;', '    const orar = false;', 'wmf', 'trigonometric și cu X oglindit singur')
o('R03', WMF, '    const orar = m.ve.x / m.we.x < 0 && m.ve.y / m.we.y > 0;', '    const orar = m.ve.y / m.we.y < 0;', 'wmf', 'orar cu Y întoarsă (sensul văzut în fereastră)')
o('R04', WMF, '    const intreg = t1 === t0;', '    const intreg = false;', 'wmf', 'Pie cu capetele egale primește raza dusă și întoarsă')
o('R05', WMF, '    const unghi = (q: Punct): number => Math.atan2((q.y - e.c.y) / e.ry, (q.x - e.c.x) / e.rx);',
  '    const unghi = (q: Punct): number => Math.atan2(q.y - e.c.y, q.x - e.c.x);', 'wmf', 'unghiul razei polar, nu parametric (pe elipsă, alt punct)')
o('R06', WMF, '      const bucati = Math.abs(dt) > Math.PI ? 2 : 1;', '      const bucati = 1;', 'wmf', 'cercul întreg dintr-un singur arc (de lungime nulă)')
o('R07', WMF, '    if (!plat && Math.abs(rx - ry) <= TOLERANTA_IMPORT) {', '    if (!plat && Math.abs(rx - ry) < 0) {', 'wmf', 'cercurile scrise ca cubice')
o('R08', WMF, '    if (fn === PIE && !intreg) this.segment(sc, LINIE, e.c);', '', 'wmf', 'Pie fără raza spre centru (un Chord)')
o('R09', WMF, '    const rx = colt ? Math.min((Math.abs(a.i(1)) * k.x) / 2, e.rx) : 0;', '    const rx = colt ? (Math.abs(a.i(1)) * k.x) / 2 : 0;',
  'wmf', 'colțul dreptunghiului rotunjit mai lat decât dreptunghiul')
o('R10', WMF, '    const rotunjit = rx > 0 && ry > 0;', '    const rotunjit = rx > 0 || ry > 0;', 'wmf', 'RoundRect cu un colț nul rotunjit')
o('R11', WMF, '    const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);',
  '    const x0 = p1.x, x1 = p2.x, y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);', 'wmf', 'colțurile inversate pe X nu se ordonează')

# ---- Obiectele, liniile, ce se sare ----
o('B01', WMF, '    const k = this.libere.scoate();', '    const k: number | undefined = undefined;', 'wmf', 'obiectul nou la capătul tabelului, nu în locul cel mai mic liber')
o('B02', WMF, "      case CREATEPENINDIRECT: return this.obiect({ fel: 'penita', vede: (a.u(0) & 0x0f) !== 5 });",
  "      case CREATEPENINDIRECT: return this.obiect({ fel: 'penita', vede: true });", 'wmf', 'penița nulă se vede')
o('B03', WMF, "      case CREATEBRUSHINDIRECT: return this.obiect({ fel: 'pensula', vede: a.u(0) !== 1 });",
  "      case CREATEBRUSHINDIRECT: return this.obiect({ fel: 'pensula', vede: true });", 'wmf', 'pensula nulă umple')
o('B04', WMF, '    if (this.s.penita || (inchisa && this.s.pensula)) {', '    if (this.s.penita || this.s.pensula) {', 'wmf', 'o linie cu penița nulă se vede prin pensulă')
o('B05', WMF, '    return this.s.pensula && this.s.winding;', '    return this.s.winding;', 'wmf', 'o formă WINDING doar trasă se normalizează')
o('B06', WMF, '    if (!this.lant || this.lant.cur.x !== a.x || this.lant.cur.y !== a.y) {', '    if (true) {', 'wmf', 'fiecare LineTo e o cale')
o('B07', WMF, "        if (TEXT.has(fn)) this.n['sarit-text']++;", "        if (TEXT.has(fn)) return;", 'wmf', 'textul nu se numără')
o('B08', WMF, "        else if (RASTER.has(fn)) this.n['sarit-imagine']++;", "        else if (RASTER.has(fn)) this.n.necunoscute++;", 'wmf', 'imaginile numărate ca necunoscute')
o('B09', WMF, "        else if (!FARA_EFECT.has(fn)) this.n.necunoscute++;", '', 'wmf', 'înregistrările necunoscute nu se numără')
o('B10', WMF, "        else if (o?.fel === 'regiune') this.n.decupaje++;", '', 'wmf', 'regiunea aleasă nu e un decupaj')

# ---- Antetul și refuzurile ----
o('H01', WMF, '  if (dv.byteLength >= 44 && dv.getUint32(0, true) === 1 && dv.getUint32(40, true) === SEMNATURA_EMF) return { ok: false, cod: \'emf\' };', '',
  'wmf', 'EMF-ul refuzat ca „nu e WMF”, fără motivul lui')
o('H02', WMF, '    if (inch === 0 || l === r || t === b) return 0;', '    if (l === r || t === b) return 0;', 'wmf', 'inch = 0 trece (împărțirea la zero)')
o('H03', WMF, '      if (marime < 3 || p + 2 * marime > dv.byteLength) throw new EroareWmf(p);', '      if (p + 2 * marime > dv.byteLength) throw new EroareWmf(p);',
  'wmf', 'o înregistrare de mărime nulă (bucla pe loc) sau 1–2 cuvinte trece')
o('H04', WMF, '  if ((tip !== 1 && tip !== 2) || marime !== 9) return cadru ? p : \'nu\';', '  if (tip !== 1 && tip !== 2) return cadru ? p : \'nu\';',
  'wmf', 'antetul standard cu altă mărime trece')

# ---- Ușa după antet și fluxul ----
o('F01', FMT, "  if (b[0] === 0xd7 && b[1] === 0xcd && b[2] === 0xc6 && b[3] === 0x9a) return 'wmf';\n", '', 'wmf', 'cheia placeable nu e recunoscută după antet')
o('F02', FMT, "  if ((b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0) return 'wmf';\n", '', 'wmf', 'antetul standard nu e recunoscut după antet')
o('F03', FMT, r"  if (/\.(wmf|apm|emf)$/i.test(nume)) return 'wmf';", r"  if (/\.wmf$/i.test(nume)) return 'wmf';", 'wmf', '.apm și .emf refuzate ca alt tip')
o('F04', CAL, '  const c = comune(f, r.cai, r.cadru);', '  const c = comune(f, r.cai, null);', 'wmf', 'piesa WMF pusă în colțul foii, nu unde e în cadru')
o('F05', PIE, r"replace(/\.(svg|dxf|pdf|ai|eps[fi]?|wmf|apm|emf)$/i, '')", r"replace(/\.(svg|dxf|pdf|ai|eps[fi]?)$/i, '')", 'wmf', 'numele piesei păstrează .wmf')
o('F06', CAL, "  if (format === 'wmf') return previzualizareWmf(f, o.unitateWmf);", "  if (format === 'wmf') return previzualizareWmf(f);",
  'wmf', 'unitatea aleasă nu ajunge la ușă')

# ---- Interfața (e2e) ----
o('E01', CON, '      onUnitateWmf={(u) => { recitesteCu({ unitateWmf: u }); }}', '      onUnitateWmf={(u) => { recitesteCu({ unitate: u === \'mm\' ? \'mm\' : \'cm\' }); }}',
  'e2e', 'alegerea unității WMF schimbă unitatea DXF')
o('E02', DLG, "            {ok.format === 'wmf' && (ok.unitati.sursa === 'aleasa' ? (", "            {ok.format === 'wmf' && (ok.unitati.sursa === 'antet' ? (",
  'e2e', 'alegerea unității arătată la un fișier cu antet, unitățile lui ascunse')
o('E03', APP, 'application/postscript,.wmf" multiple', 'application/postscript" multiple', 'e2e', '.wmf lipsește din fereastra de fișiere')


# ---- Seturile ----
def u(*nume):
    return ['test/unit/%s.test.ts' % n for n in nume]


SETURI = {
    'wmf': u('wmf', 'wmf.corpus', 'import.wmf'),
    'wmf2': u('wmf', 'wmf.corpus', 'import.wmf', 'import.eps', 'import.pdf', 'import.dxf', 'manual'),
}
E2E = ['test/e2e/import.spec.ts']
