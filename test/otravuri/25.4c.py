# Lista de otrăvuri a feliei 25.4↑c (îndreptarea scanărilor, ADR 0271), 21.11.2026, alese de autor: unghiul (punctele
# mutate cu o fracțiune de pixel, polaritatea, ambele proiecții, scorul diferențelor, împărțirea liniară în coșuri, semnul,
# încrederea, capătul intervalului, parabola, coșurile fine, transparența, cerneala minimă), rotirea (pânza, sensul,
# fondul, marginea prelungită, reducerea, unghiul neglijabil, eșantionarea biliniară), calculul (scara pânzei reduse, a
# foii, sugestia foii, marginea, pragul sugestiei, unghiul scris tăiat și nenumeric, transparența, previzualizarea, sursa),
# ușa importului (raportul, cererea, implicitul) și fereastra (previzualizarea îndreptată, zona scoasă, minusul tipografic,
# mărimea din raport, sugestia, avertismentul, indiciul unghiului găsit).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RO = 'src/trasare/rotire.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
IM = 'src/io/imagine.ts'
FT = 'src/ui/FereastraTrasare.tsx'

# ── Unghiul ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('R01', RO, '      xs[k2] = (p % w) + ((k2 * 0.7548776662466927) % 1) - w / 2;\n      ys[k2] = Math.floor(p / w) + ((k2 * 0.5698402909980532) % 1) - h / 2;',
  '      xs[k2] = (p % w) + 0.5 - w / 2;\n      ys[k2] = Math.floor(p / w) + 0.5 - h / 2;', 'rot',
  'punctele pe centrele pixelilor: unghiul 0 câștigă din grilă')
o('R02', RO, '  const intunecata = margine / (2 * (w + h)) > 0.5;', '  const intunecata = margine < 0;', 'rot',
  'polaritatea din margine, ignorată')
o('R03', RO, '    s += dr * dr + dc * dc;', '    s += dr * dr;', 'rot', 'doar proiecția pe rânduri')
o('R04', RO, '    const dr = (R[i] ?? 0) - (R[i - 1] ?? 0), dc = (C[i] ?? 0) - (C[i - 1] ?? 0);',
  '    const dr = R[i] ?? 0, dc = C[i] ?? 0;', 'rot', 'energia profilului în locul diferențelor (Postl)')
o('R05', RO, '    R[r0] = (R[r0] ?? 0) + 1 - fr; R[r0 + 1] = (R[r0 + 1] ?? 0) + fr;\n    C[q0] = (C[q0] ?? 0) + 1 - fq; C[q0 + 1] = (C[q0 + 1] ?? 0) + fq;',
  '    R[r0] = (R[r0] ?? 0) + 1;\n    C[q0] = (C[q0] ?? 0) + 1;', 'rot', 'coșul cel mai apropiat, fără împărțirea liniară')
o('R06', RO, '    const r = x * sn + y * cs + o, q = x * cs - y * sn + o;', '    const r = -x * sn + y * cs + o, q = x * cs + y * sn + o;', 'rot',
  'unghiul cu semnul întors')
o('R07', RO, '  if (!(incredere >= INCREDERE_MINIMA)) return { unghi: null, incredere };',
  '  if (incredere < 0) return { unghi: null, incredere };', 'rot', 'încrederea nu se judecă')
# R08 (maximul la capătul baleiajului grosier, primit) a scăpat la prima rulare (`5ac7aefb`): verificarea de la sfârșit
# (|u| > UNGHI_CAUTAT) o acoperă, iar ea respingea degeaba un unghi chiar de sub 10°, când grila grosieră trecea de 10°.
# Echivalentă: codul ei a fost scos.
o('R09', RO, 'if (Math.abs(i - iBun) * dG >= DEPARTE)', 'if (i !== iBun)', 'rot', 'încrederea față de vecinii vârfului')
o('R10', RO, '    if (num < 0) u += (dF * 0.5 * (s0 - s2)) / num;', '    if (num < 0) u -= (dF * 0.5 * (s0 - s2)) / num;', 'rot',
  'parabola mută vârful în partea greșită')
o('R11', RO, '    const v = scor(c, (a0 + j * dF) * rad, 1, 1, RF, CF);', '    const v = scor(c, (a0 + j * dF) * rad, COS_GROSIER, 1, RG, CG);', 'rot',
  'baleiajul fin pe coșurile grosiere')
o('R12', RO, '  if (transparenti >= 0.01 * W * H) return null;', '  if (transparenti > W * H) return null;', 'rot',
  'o imagine cu transparență, citită ca hârtie')
o('R13', RO, '  if (n < CERNEALA_MINIMA) return null;', '  if (n === 0) return null;', 'rot', 'prea puțină cerneală, primită')

# ── Rotirea ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('R14', RO, '  return { latime: Math.max(1, Math.round(W * c + H * s)), inaltime: Math.max(1, Math.round(W * s + H * c)) };',
  '  return { latime: W, inaltime: H };', 'rot', 'pânza nemărită (colțurile tăiate)')
o('R15', RO, '    let u = W / 2 + qx0 * c + qy * s - 0.5, v = H / 2 - qx0 * s + qy * c - 0.5;\n    for (let X = 0, q = 4 * Y * Wo; X < Wo; X++, q += 4, u += c, v -= s) {',
  '    let u = W / 2 + qx0 * c - qy * s - 0.5, v = H / 2 + qx0 * s + qy * c - 0.5;\n    for (let X = 0, q = 4 * Y * Wo; X < Wo; X++, q += 4, u += c, v += s) {',
  'rot', 'rotirea în sensul greșit')
o('R16', RO, '  const fond = culoareaMarginii(img), out = new Uint8ClampedArray(Wo * Ho * 4), rand = 4 * W;',
  '  const fond = [255, 255, 255, 255], out = new Uint8ClampedArray(Wo * Ho * 4), rand = 4 * W;', 'rot', 'colțurile albe, nu culoarea marginii')
o('R17', RO, '        if (!inauntru && !o.prelungeste) {', '        if (!inauntru) {', 'rot', 'marginea nu se prelungește')
o('R18', RO, '  if (Wo * Ho > o.maxPixeli) {', '  if (Wo * Ho < 0) {', 'rot', 'plafonul pixelilor, ignorat')
o('R19', RO, '  if (Math.abs(unghi) < UNGHI_NEGLIJABIL || W < 2 || H < 2) return { img, k: 1 };', '  if (W < 2 || H < 2) return { img, k: 1 };', 'rot',
  'un unghi neglijabil tot rotește (și estompează)')
o('R20', RO, '  const a = (unghi * Math.PI) / 180, c = Math.cos(a) / k, s = Math.sin(a) / k;', '  const a = (unghi * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);',
  'rot', 'pânza redusă, fără desenul redus (doar mijlocul)')
o('R21', RO, '      const wa = (1 - tx) * (1 - ty), wb = tx * (1 - ty), wc = (1 - tx) * ty, wd = tx * ty;',
  '      const wa = 1, wb = 0, wc = 0, wd = 0;', 'rot', 'pixelul din colț în locul eșantionării biliniare')

# ── Calculul ─────────────────────────────────────────────────────────────────────────────────────────────────────────
o('C01', CT, '  if (rt.k !== 1) { pxFisier /= rt.k; if (mmFoaie !== null) mmFoaie /= rt.k; }', '  if (rt.k !== 1) { if (mmFoaie !== null) mmFoaie /= rt.k; }',
  'calc', 'pânza redusă: pixelii fișierului neschimbați (DPI greșit)')
o('C02', CT, '  if (rt.k !== 1) { pxFisier /= rt.k; if (mmFoaie !== null) mmFoaie /= rt.k; }', '  if (rt.k !== 1) { pxFisier /= rt.k; }',
  'calc', 'pânza redusă: scara foii neschimbată')
o('C03', CT, 'sugestieFoaie: foaie?.sugestie === true,', 'sugestieFoaie: false,', 'calc', 'sugestia scanării și peste a foii')
o('C04', CT, '    prelungeste: c.optiuni.margine === true,', '    prelungeste: false,', 'calc', 'marginea nu se prelungește la „Ignoră ce atinge marginea”')
o('C05', CT, '  const sugestie = !cerere && g.unghi !== null && Math.abs(g.unghi) >= UNGHI_SUGESTIE && !o.sugestieFoaie;',
  '  const sugestie = !cerere && g.unghi !== null && !o.sugestieFoaie;', 'calc', 'sugestia și sub 0,1°')
o('C06', CT, 'Math.max(-UNGHI_MAXIM, Math.min(UNGHI_MAXIM, cerere.unghi))', 'cerere.unghi', 'calc', 'unghiul scris, netăiat la ±45°')
o('C07', CT, 'cerere && cerere.unghi !== null && Number.isFinite(cerere.unghi) ?', 'cerere && cerere.unghi !== null ?', 'calc',
  'un unghi scris care nu e număr, folosit')
o('C08', CT, '  if (!cerere && g.unghi === null && g.incredere === 0) return { img, k: 1, rotire: null };\n', '', 'calc',
  'o imagine cu transparență primește raportul rotirii')
o('C09', CT, 'rotire: { ...baza, previzualizare: r.img === img ? null : reduceImaginea(r.img) } };', 'rotire: { ...baza, previzualizare: null } };',
  'calc', 'fără imaginea îndreptată pentru fereastră')
o('C10', CT, '  const aplicat = cerere ? scris ?? g.unghi : null;', '  const aplicat = cerere ? g.unghi : null;', 'calc', 'unghiul scris, ignorat')
o('C11', CT, "  const sursa = aplicat === null ? null : scris !== null ? 'scris' : 'gasit';", "  const sursa = aplicat === null ? null : 'gasit';", 'calc',
  'sursa unghiului, mereu „găsit”')
o('C12', RO, 'export const UNGHI_SUGESTIE = 0.1;', 'export const UNGHI_SUGESTIE = 0;', 'calc', 'pragul sugestiei, zero')

# ── Ușa importului ───────────────────────────────────────────────────────────────────────────────────────────────────
o('D01', CA, ' foaie: r.foaie, rotire: r.rotire, transparenta', ' foaie: r.foaie, rotire: null, transparenta', 'calc', 'raportul imaginii fără rotire')
o('D02', CA, '    ...(a.rotire.indreapta ? { rotire: { unghi: a.rotire.unghi } } : {}),', '    ...(a.rotire.indreapta ? { rotire: { unghi: null } } : {}),',
  'calc', 'unghiul scris nu ajunge la calcul')
o('D03', CA, '    ...(a.rotire.indreapta ? { rotire: { unghi: a.rotire.unghi } } : {}),', '    ...{ rotire: { unghi: a.rotire.unghi } },', 'calc',
  'îndreptarea cerută și nebifată')
o('D04', IM, 'export const ROTIRE_IMPLICITA: AlegeriRotire = { indreapta: false, unghi: null };',
  'export const ROTIRE_IMPLICITA: AlegeriRotire = { indreapta: true, unghi: null };', 'calc', 'îndreptarea pornită implicit')

# ── Fereastra (e2e) ──────────────────────────────────────────────────────────────────────────────────────────────────
o('F01', FT, '  const baza = peColturi ? poza : rotireImg ?? (indreptata ? foaieImg : poza);', '  const baza = peColturi ? poza : indreptata ? foaieImg : poza;',
  'e2e', 'sub vectori, scanarea rotită, nu cea îndreptată')
o('F02', FT, '                onSchimba({ rotire: { ...alegeri.rotire, indreapta: e.target.checked }, zona: null });',
  '                onSchimba({ rotire: { ...alegeri.rotire, indreapta: e.target.checked } });', 'e2e', 'bifa nu scoate zona')
o('F03', FT, "      const textUnghi = ciorna.unghi.trim().replace('−', '-').replace(',', '.');", "      const textUnghi = ciorna.unghi.trim().replace(',', '.');",
  'e2e', 'minusul tipografic nu se citește')
o('F04', FT, '        s.rotire = { ...a.rotire, unghi };\n        s.zona = null;', '        s.rotire = { ...a.rotire, unghi };', 'e2e',
  'un unghi scris nu scoate zona')
o('F05', FT, '  const decodata = rotire?.previzualizare ? rotire.inainte : {', '  const decodata = {', 'e2e',
  'raportul spune pânza rotită ca imagine')
o('F06', FT, '              {rotire && rotire.sugestie && rotire.gasit !== null && (', '              {rotire && rotire.gasit !== null && (', 'e2e',
  'sugestia rămâne și cu îndreptarea bifată')
o('F07', FT, '              {rotire?.ceruta && rotire.aplicat === null && <p', '              {rotire?.ceruta && rotire.gasit === null && <p', 'e2e',
  'avertismentul rămâne și cu unghiul scris')
o('F08', FT, "placeholder={rotire?.gasit !== null && rotire?.gasit !== undefined ? nr(rotire.gasit, 2) : ''}", "placeholder=''", 'e2e',
  'câmpul fără unghiul găsit ca indiciu')

SETURI = {
    'rot': ['test/unit/trasare.rotire.test.ts'],
    'calc': ['test/unit/import.rotire.test.ts'],
    'rot2': ['test/unit/trasare.rotire.test.ts', 'test/unit/import.rotire.test.ts', 'test/unit/import.imagine.test.ts', 'test/unit/trasare.foaia.test.ts'],
}
E2E = ['test/e2e/trasare-rotire.spec.ts']
