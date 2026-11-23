# Lista de otrăvuri a feliei 11.3↑d (urechile la locuri alese, ADR 0211, varianta a), 21.11.2026, alese de autor: ușa
# documentului v26 (judecata locurilor pe documentul brut, ciocnirea v25 → v26, modurile), modelul (locurile pe nodurile
# operației la grupare, degrupare, tăiere, roluri; rolul salvat fără locuri), lucrarea (golul fiecărei urechi, flancul,
# refuzul, pornirea în cel mai lung gol, centrele față de pornire, zona în care bucla nu pornește, proiecția, punctele în
# lume, elementul fără locuri, modurile care vin, pornirea rotită, intrarea în afara zonelor, coloanele care stau pe loc,
# oglindirea pe direcția inversă, zonele rampei), modul pânzei (distanța, plafonul, conturul scurt, mutarea, locurile din
# document), scrierea ferestrei (modul și locurile la îmbinare, numărul arătat) și interfața (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SD = 'src/model/schemaDocument.ts'
UC = 'src/model/usaCurenta.ts'
MG = 'src/model/migrari.ts'
DOC = 'src/model/document.ts'
UL = 'src/model/urechiLocuri.ts'
UR = 'src/cam/urechi.ts'
JB = 'src/cam/job.ts'
AC = 'src/app/urechiAleseCalcul.ts'
VO = 'src/app/valoriOperatii.ts'

# Ușa documentului (unitare: proba v26, ușa aplicației pe hârtie).
o('D01', UC, '  const u = problemaUrechi(doc as Document);\n', '  const u = null;\n', 'doc', 'ușa nu mai judecă locurile urechilor')
o('D02', SD, "      if (urechi['mod'] !== 'alese') return", "      if (false) return", 'doc', 'locuri și fără modul „alese”')
o('D03', SD, '        if (!noduri.has(k)) return', '        if (false) return', 'doc', 'locuri pe un element care nu e al operației')
o('D04', SD, '        if (lista.length > PLAFON.urechi) return', '        if (lista.length > PLAFON.urechi + 1) return', 'doc', 'plafonul de 100 cu unu mai sus')
o('D05', SD, '          if (Math.abs(x) > PLAFON.translatie || Math.abs(y) > PLAFON.translatie) return', '          if (false) return', 'doc',
  'puncte peste ±10⁷')
o('D06', SD, " || !Number.isFinite(x) || !Number.isFinite(y)) return", " || !Number.isFinite(y)) return", 'doc', 'x nefinit primit')
o('D07', MG, "      for (const camp of ['mod', 'locuri']) {", "      for (const camp of ['mod']) {", 'doc', 'un v25 cu `locuri` în urechi nu e ciocnire')
o('D08', DOC, "export const MODURI_URECHI: readonly ModUrechi[] = ['egale', 'alese', 'lemn', 'lungi', 'scurte', 'mijloc'];",
  "export const MODURI_URECHI: readonly ModUrechi[] = ['egale', 'alese', 'lemn', 'lungi', 'scurte'];", 'doc', 'modul „mijloc” refuzat de ușă')
# Modelul (unitare: funcția și a doua plasă).
o('M01', UL, '    if (ale.has(n)) Object.defineProperty(', '    if (true) Object.defineProperty(', 'model', 'locurile nu se curăță pe nodurile noi')
o('M02', UL, '    const n = redenumite?.get(k) ?? k;', '    const n = k;', 'model', 'redenumirile nu mută locurile')
o('M03', UL, '    if (ale.has(n)) Object.defineProperty(locuri, n, { value: (vechi as Record<string, LocUreche[]>)[k], enumerable: true, writable: true, configurable: true });',
  '    if (ale.has(n)) (locuri as Record<string, LocUreche[]>)[n] = (vechi as Record<string, LocUreche[]>)[k] as LocUreche[];', 'model',
  'cheia „__proto__” atribuită, nu pusă: schimbă prototipul')
o('M04', UL, "  return mod === undefined || mod === 'alese' ? rest : { ...rest, mod };", '  return rest;', 'model', 'rolul salvat pierde și modurile-reguli')
o('M05', 'src/model/degrupare.ts', '[cuNoduri(o, noduri)]', '[{ ...o, noduri }]', 'model', 'degruparea lasă locurile celorlalte părți')
o('M06', 'src/model/grupare.ts', 'operatii.push(cuNoduri({ ...o, id: idLiber(o.id, idOperatii) }, o.noduri.map((n) => redenumite.get(n) ?? n), redenumite));',
  'operatii.push({ ...o, id: idLiber(o.id, idOperatii), noduri: o.noduri.map((n) => redenumite.get(n) ?? n) });', 'model',
  'gruparea nu redenumește locurile')
o('M07', 'src/model/taiere.ts', '        return cuNoduri({ ...structuredClone(baza), id: x.id, tip: x.tip, latura: x.latura }, [...x.noduri]);',
  '        return { ...structuredClone(baza), id: x.id, tip: x.tip, latura: x.latura, noduri: [...x.noduri] };', 'model',
  'tăierea unei piese cu rol lasă locurile vechi')
o('M08', 'src/model/taiere.ts', '    ops.push(cuNoduri({ ...o, id }, o.noduri));', '    ops.push({ ...o, id });', 'model',
  'tăierea unei piese fără rol lasă locurile vechi')
o('M09', 'src/model/rol.ts', '  const ops = g.map((x): Operatie => cuNoduri({',
  '  const ops = g.map((x): Operatie => ((op: Operatie, n: string[]): Operatie => ({ ...op, noduri: n }))({', 'model',
  'rolul schimbat dă tuturor operațiilor locurile primei')
o('M10', 'src/model/rolPersonal.ts', '  return { ...structuredClone(v), urechi: structuredClone(urechiDeSablon(v.urechi)), id: ID_MODEL, noduri: [ID_MODEL], tip, latura };',
  '  return { ...structuredClone(v), id: ID_MODEL, noduri: [ID_MODEL], tip, latura };', 'model', 'rolul salvat ține locurile piesei')
o('M11', 'src/model/rolPersonal.ts', '  const x = { ...o, urechi: urechiDeSablon(o.urechi) };', '  const x = o;', 'model',
  'piesa cu urechi alese nu-și mai recunoaște rolul')
o('M12', 'src/model/rolPersonal.ts', '    return { ...structuredClone(v), urechi: structuredClone(urechiDeSablon(v.urechi)), id: x.id,',
  '    return { ...structuredClone(v), id: x.id,', 'model', 'un rol din stocare dă locurile lui pieselor')
o('M13', 'src/model/raportFoi.ts', "urechi: o.urechi ? (o.urechi.mod === 'alese' ? numarUrechiAlese(o) : o.urechi.mod === 'mijloc' ? 0 : o.urechi.numar) : 0,",
  "urechi: o.urechi ? (o.urechi.mod === 'mijloc' ? 0 : o.urechi.numar) : 0,", 'model', 'raportul numără urechile pe buclă și la locuri alese')
# Lucrarea (unitare, pe hârtie și pe programul întreg).
o('C01', UR, '  return centre.map((_, k) => Math.min(pas[k] as number, pas[(k - 1 + n) % n] as number));', '  return centre.map((_, k) => pas[k] as number);',
  'cam', 'golul doar spre urechea de după')
o('C02', UR, '  return goluri(P, centre).findIndex((g) => W > 0.9 * g);', '  return goluri(P, centre).findIndex((g) => W > g);', 'cam',
  'refuzul abia sub W, nu sub W / 0,9')
o('C03', UR, '  const flancuri = g.map((x) => Math.min(W / 2, 0.45 * (x - W)));', '  const flancuri = g.map(() => Math.min(W / 2, 0.45 * (Math.min(...g) - W)));',
  'cam', 'același flanc pe toate (din golul cel mai mic al buclei)')
o('C04', UR, '    if (!rez || x.d < rez.d) rez', '    if (!rez || x.d <= rez.d) rez', 'cam', 'la egalitate, poziția cea mai mare')
o('C05', UR, '    if (g > g0) { g0 = g; k0 = k; }', '    if (g >= g0) { g0 = g; k0 = k; }', 'cam', 'la egalitate, ultimul gol')
o('C06', UR, '  return s >= P ? s - P : s;', '  return s;', 'cam', 'pornirea peste lungimea buclei')
o('C07', UR, '  return centre.map((c) => { const x = c - s; return x - Math.floor(x / P) * P; }).sort((a, b) => a - b);',
  '  return centre.map((c) => { const x = c - s; return x - Math.floor(x / P) * P; });', 'cam', 'centrele față de pornire, nesortate')
o('C08', UR, '    return Math.min(x, P - x) < g.h', '    return x < g.h', 'cam', 'zona nu trece peste vârful 0')
o('C09', UR, '    const l = g.flancuri[k] as number;', '    const l = g.l;', 'cam', 'profilul ia flancul cel mai mic pe toate urechile')
o('C10', JB, '  const lista = l && Object.hasOwn(l, t.nod) ? (l[t.nod] ?? []) : [];', '  const lista = l && Object.hasOwn(l, t.nod) ? [] : [];', 'cam',
  'punctele alese nu ajung la lucrare')
o('C11', JB, "    if (t.urechi && !(alese && alese.length === 0) && !(lemnAici && lemn === 'fara')) {", "    if (t.urechi && !(lemnAici && lemn === 'fara')) {", 'cam', 'elementul fără locuri e judecat ca unul cu urechi')
# C12 (modurile care vin se taie ca „egale”) a ieșit în 11.3↑f: refuzul „felie următoare” a plecat, toate modurile se taie.
o('C13', JB, '        return incepeLa(c, s);', '        return acum[j] ?? c;', 'cam', 'bucla nu pornește în cel mai lung gol')
o('C14', JB, "          if (fixe && gu && typeof gu !== 'string' && inZonaUrechii(gu, s, lungimeBucla(c))) return false;\n", '', 'cam',
  'intrarea poate porni în zona unei urechi')
o('C15', UR, '(alese ? 0 : s) + c - g.h + R', 's + c - g.h + R', 'cam', 'coloanele urechilor alese se mută cu pornirea intrării')
o('C16', JB, '        if (urechi?.bucle) urechi = ', '        if (false) urechi = ', 'cam', 'direcția inversă nu oglindește urechile alese')
o('C17', UR, '  return g.centre.map((c, k) => [c - g.h - (g.flancuri[k] as number), c + g.h + (g.flancuri[k] as number)] as const);',
  '  return g.centre.map((c) => [c - g.h - g.l, c + g.h + g.l] as const);', 'cam', 'zonele rampei din flancul cel mai mic')
# Modul pânzei (unitare).
o('A01', AC, '    return Math.min(d, k.lungime - d) < min - 1e-9;', '    return false;', 'ui', 'urechile se pot pune oricât de aproape')
o('A02', AC, "  if (lista.length >= PLAFON.urechi) return { ok: false, motiv: 'plafon' };\n", '', 'ui', 'peste 100 de urechi pe un element')
o('A03', AC, "  if (k.lungime < distantaMinima(latime)) return { ok: false, motiv: 'scurt' };\n", '', 'ui', 'o ureche pe un contur prea scurt')
o('A04', AC, "  if (preaAproape(k, lista, x.s, latime, index)) return", "  if (preaAproape(k, lista, x.s, latime, -1)) return", 'ui',
  'mutarea se ciocnește cu urechea însăși')
o('A05', AC, '  for (const n of o?.noduri ?? []) {', '  for (const n of Object.keys(l ?? {})) {', 'ui', 'locurile din document și pe chei străine')
o('A06', VO, "  if (dialog.mod !== 'alese') delete imbinate['locuri'];\n  if (dialog.mod === undefined && o.mod !== undefined && o.mod !== 'egale') delete imbinate['mod'];\n", '', 'ui', 'înapoi la distanțe egale, modul și locurile rămân')
o('A07', VO, '  const { alese: _alese, ...dialog } = v;\n  void _alese;\n', '  const dialog = v;\n', 'ui', 'numărul arătat intră în document')
# Interfața (e2e).
o('E01', 'src/app/ExportConectat.tsx', "alese: numarUrechiAlese(o) }", 'alese: 0 }', 'e2e', 'fereastra arată mereu 0 urechi alese')
o('E02', 'src/ui/DialogExport.tsx', 'data-camp="urechi-numar" disabled={doarCitire || faraNumar(p.modUrechi)}', 'data-camp="urechi-numar" disabled={doarCitire}',
  'e2e', 'numărul rămâne de scris cu „alese pe desen”')
o('E03', 'src/app/ModUrechi.tsx', '      if (!g.mutata) {', '      if (false) {', 'e2e', 'un clic pe ureche n-o scoate')

SETURI = {
    'doc': ['test/unit/document.v26.oracol.test.ts'],
    'model': ['test/unit/urechiLocuri.test.ts'],
    'cam': ['test/unit/urechi.alese.test.ts'],
    'ui': ['test/unit/urechiAleseCalcul.test.ts', 'test/unit/urechi.dialog.test.ts'],
}
E2E = ['test/e2e/urechi-alese.spec.ts']
