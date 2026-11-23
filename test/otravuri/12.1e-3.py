# Lista de otrăvuri a feliei 12.1↑e-3 („Împreună (secțiunea)” la pereții drepți, ADR 0179), 22.11.2026, alese de autor:
# tăietura exactă pe mutări (filtrul frezelor plate, raza, nivelul, arcele orare, capetele, cutia, bisecția), măsurarea
# potrivirii drepte (oglinda și grila dopului, rama decupatului, jocul și toleranța lui, interferența, așezarea, sprijinul,
# verdictele rândurilor, secțiunea), ce îi dă CAM-ul (D la gaură, g la gaură, decupat, sprijinul, treapta, marginea),
# dispecerul calculului și tabelul din vederea 3D. Din 23.11 (privirea pe secțiunea reală), și desenul secțiunii drepte
# (`src/app/sectiuneDesen.ts`: treptele, cleiul doar în locaș, dopul decupat, gaura prin foaie) și insula ținută în zona liberă.
# Țintele din ADR 0179 (felia 12.1↑e-3): jocul lateral greșit sau tolerat prea larg, dopul care iese din locaș trecut drept
# bun, dopul decupat întors sau cu rama lui, sprijinul greșit (pe fund, pe față, la gaură), secțiunea în alt loc, dopul în
# trepte măsurat ca unul drept, rândurile tabelului greșite; în desen: pereții drepți înclinați, cleiul urcat în spațiul
# dintre plăci sau lipsă în jocul lateral, lemn și contact sub gaura prin foaie, secțiunea ieșită de sub bara de jos.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TE = 'src/sim/taiereExacta.ts'
PD = 'src/sim/potrivireDreapta.ts'
DD = 'src/cam/dopDrept.ts'
CALC = 'src/jobs/calculCam.ts'
SEC = 'src/app/Sectiune3D.tsx'
DES = 'src/app/sectiuneDesen.ts'
V3D = 'src/app/Vedere3D.tsx'
CSS = 'src/app/vedere3d.css'

# ---- Tăietura exactă (src/sim/taiereExacta.ts) ----
o('T01', TE, "    if (g.scula.forma.tip !== 'plata') continue;\n", '', 'exacta', 'mutările frezei în V numărate ca pereți drepți')
o('T02', TE, '    const r = g.scula.diametru / 2, v = g.mutari,', '    const r = g.scula.diametru, v = g.mutari,', 'exacta', 'raza frezei cât diametrul')
o('T03', TE, '      if (az > z + 1e-6 || bz > z + 1e-6) continue;', '      if (az > z + 1e-6 && bz > z + 1e-6) continue;', 'exacta',
  'rampa care trece prin nivel numărată ca tăietură la el')
o('T04', TE, '      if (fel !== ARC_TRIG) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }\n', '', 'exacta', 'arcul orar luat ca trigonometric')
o('T05', TE, '  u -= Math.floor(u / DOI_PI) * DOI_PI;\n', '', 'exacta', 'unghiul nenormalizat: și sub începutul arcului e „pe arc”')
o('T06', TE, '  if (u <= m.s) return Math.abs(lung(dx, dy) - m.raza);', '  if (u <= m.s + Math.PI) return Math.abs(lung(dx, dy) - m.raza);', 'exacta',
  'arcul prelungit cu o jumătate de cerc')
o('T07', TE, '  return Math.min(lung(px - m.ax, py - m.ay), lung(px - m.bx, py - m.by));', '  return lung(px - m.ax, py - m.ay);', 'exacta',
  'în afara arcului, doar distanța la primul capăt')
o('T08', TE, '      if (laCutie(x, y, m.cutie) - m.r >= best) continue;', '      if (laCutie(x, y, m.cutie) >= best) continue;', 'exacta',
  'cutia fără raza frezei: o mutare mai apropiată sărită')
o('T09', TE, '  for (let k = 0; k < 40 && lung(x1 - x0, y1 - y0) > 1e-7; k++) {', '  for (let k = 0; k < 4 && lung(x1 - x0, y1 - y0) > 1e-7; k++) {', 'exacta',
  'bisecția oprită după 4 pași')

# ---- Măsurarea dreaptă (src/sim/potrivireDreapta.ts) ----
o('P01', PD, '  const h = p.hartie, oglindit = !h.decupat;', '  const h = p.hartie, oglindit = true;', 'dreapta', 'și dopul decupat oglindit')
o('P02', PD, '(oglindit ? [x1 + m - x, y - y0 + m] :', '(oglindit ? [x1 + m - x, y - y0] :', 'dreapta', 'contractul fără margine pe Y la jocul exact')
o('P03', PD, '    if (atinge) for (const q of celule) rez[q] = 1;', '    for (const q of celule) rez[q] = 1;', 'dreapta',
  'tot lemnul netăiat e al dopului: și rama semifabricatului, și miezurile golurilor')
o('P05', PD, '    const joc = -fD(q[0], q[1]);', '    const joc = fD(q[0], q[1]);', 'dreapta', 'jocul lateral cu semnul întors')
o('P06', PD, '    if (e > TOLERANTA_JOC && e > iesireJoc) {', '    if (e > 10 * TOLERANTA_JOC && e > iesireJoc) {', 'dreapta',
  'jocul lateral tolerat la 0,2 în loc de 0,02')
o('P07', PD, '      afara++;\n', '', 'dreapta', 'punctele dopului din afara locașului nenumărate')
o('P08', PD, '    if (oglindit) asezare = Math.min(asezare, F[k]! + M[k]!);', '    if (oglindit) asezare = Math.min(asezare, F[k]!);', 'dreapta',
  'dopul ridicat neașezat (h* fără fața lui)')
o('P09', PD, '    else if (lemn[k]) asezare = Math.min(asezare, F[k]!);', '    else asezare = Math.min(asezare, F[k]!);', 'dreapta',
  'dopul decupat așezat și pe fața plăcii din jur')
o('P10', PD, "  const sprijin = h.decupat || h.sprijin === 'fund' ? inaltimeDop - adancime : adancime - inaltimeDop;",
  '  const sprijin = inaltimeDop - adancime;', 'dreapta', 'pe față, sprijinul măsurat ca între plăci')
o('P11', PD, "  const sprijinHartie = h.decupat || h.sprijin === 'fund' ? h.H : h.g;", '  const sprijinHartie = h.H;', 'dreapta',
  'pe față, sprijinul pe hârtie e H în loc de g')
o('P12', PD, '    joc: rand(jocB.n > 0 && kJoc === null,', '    joc: rand(jocB.n > 0,', 'dreapta', '„Jocul lateral” mereu bun')
o('P13', PD, '    dop: rand(nDop > 0 && afara === 0,', '    dop: rand(nDop > 0,', 'dreapta', '„Dopul în locaș” mereu bun')
o('P14', PD, '    adancime: rand(Math.abs(adancime - h.D) <= TOLERANTA_POTRIVIRE,', '    adancime: rand(true,', 'dreapta', '„Adâncimea locașului” mereu bună')
o('P15', PD, '    inaltime: rand(Math.abs(inaltimeDop - h.h) <= TOLERANTA_POTRIVIRE,', '    inaltime: rand(true,', 'dreapta', '„Înălțimea dopului” mereu bună')
o('P16', PD, '    sprijin: rand(Math.abs(sprijin - sprijinHartie) <= TOLERANTA_POTRIVIRE,', '    sprijin: rand(true,', 'dreapta', 'sprijinul mereu bun')
o('P17', PD, ' : ny >> 1;', ' : 0;', 'dreapta', 'secțiunea pe marginea ferestrei, nu prin mijloc')
o('P18', PD, '    fataDop[i] = oglindit ? M[k]! - asezare : lemn[k] ? -asezare : Number.NaN;', '    fataDop[i] = oglindit ? M[k]! - asezare : -asezare;',
  'dreapta', 'dopul decupat desenat și în afara lui')
o('P19', PD, 'marcaj: rosu?.unde ? rosu.unde[0] : null,', 'marcaj: null,', 'dreapta', 'locul diferenței nemarcat pe secțiune')
o('P20', PD, '      M[j * nx + i] = -valoare(campDop, oglindit ? nx - 1 - i : i, j);', '      M[j * nx + i] = -valoare(campDop, i, j);', 'dreapta',
  'dopul ridicat neoglindit pe grilă')
o('P21', PD, '  const campDop = campNou({ x0: oglindit ? x1 + m - gx0 - latime : gx0 - x0 + m,', '  const campDop = campNou({ x0: oglindit ? x1 + m - gx0 - latime : gx0 - x0,',
  'dreapta', 'grila dopului decupat fără margine')
o('P22', PD, '  const lemn = lemnDop(g, h.h / 2,', '  const lemn = lemnDop(g, h.h,', 'dreapta',
  'lemnul dopului citit la fundul punților: dopul decupat, legat prin ele de ramă, ia rama cu el')
o('P23', PD, '  for (const q of perete(g, (k) => F[k]! >= h.D / 2,', '  for (const q of perete(g, () => false,', 'dreapta',
  'niciun punct pe peretele locașului')
o('P24', PD, '(k) => M[k]! >= h.h / 2, (k) => lemn[k] === 1, fD)', '(k) => M[k]! >= h.h / 2, (k) => M[k]! < h.h / 2, fD)', 'dreapta',
  'marginea ramei și a miezurilor numărată ca perete al dopului')

# 23.11 (reparația miezurilor, înaintea feliei 12.1↑e-4): grilele, lemnul dopului și pereții exacți au ieșit în funcții comune
# (`grilePotrivire`, `lemnDop`, `perete`), iar lemnul dopului e doar ce atinge desenul lui (`dop` în descriptor): miezurile
# golurilor unui dop decupat cad. P01, P03, P05–P07, P09, P18, P22–P24 urmează codul nou; N01–N05 sunt ale reparației.
o('N01', PD, '      if (inDop[k] === 1) atinge = true;', '      if (inDop[k] === 1 || k >= 0) atinge = true;', 'dreapta',
  'orice bucată de lemn e a dopului: miezul golului socotit dop')
o('N02', PD, '      for (const kk of [i + 1 < nx ? k + 1 : -1, i > 0 ? k - 1 : -1, k + nx < n ? k + nx : -1, k - nx]) {',
  '      for (const kk of [i + 1 < nx ? k + 1 : -1, i > 0 ? k - 1 : -1]) {', 'dreapta', 'bucățile de lemn legate doar pe rânduri')
o('N03', PD, '      if (f(pa[0], pa[1]) < 0 && f(pb[0], pb[1]) >= 0) rez.push(', '      if (f(pb[0], pb[1]) >= 0) rez.push(', 'dreapta',
  'punctul de perete căutat și unde partea tăiată nu e tăiată exact')
o('N04', DD, ' margine: m, dop: desenDop(f.figura.dop),', ' margine: m, dop: [],', 'dreapta', 'potrivirea fără desenul dopului')
o('N05', DD, "  regiuni.flatMap((r) => [r.exterior, ...r.gauri])", "  regiuni.flatMap((r) => [r.exterior])", 'dreapta',
  'desenul dopului fără goluri: miezul golului îl atinge')

# ---- Ce îi dă CAM-ul (src/cam/dopDrept.ts) ----
# 23.11 (felia 12.1↑e-4): descriptorul dopului în trepte stă lângă cel drept, cu aceleași câmpuri; K01, K03, K05 și K07 se
# ancorează pe ce e doar al celui drept, K02 urmează indentarea, iar K04 (treapta fără descriptor drept) a plecat cu codul ei
# (alegerea felului e acum în lista lui 12.1↑e-4).
o('K01', DD, 'D: esteGaura(op) ? (doc.foi[0]?.stoc.grosime ?? op.adancime) : op.adancime, c: inc.jocLateral,', 'D: op.adancime, c: inc.jocLateral,', 'dreapta',
  'la gaură, D pe hârtie e adâncimea scrisă, nu grosimea foii')
o('K02', DD, '          g: esteGaura(op) ? 0 : inc.joc,', '          g: inc.joc,', 'dreapta', 'la gaură, jocul de sub dopul pe față e g, nu 0')
o('K03', DD, "'fata' as const : 'fund' as const, decupat: inc.dop === 'decupat',", "'fata' as const : 'fund' as const, decupat: false,", 'dreapta',
  'dopul decupat luat drept ridicat')
o('K05', DD, "fel: 'drept' as const, cutie: { x0, y0, x1, y1 }, margine: m,", "fel: 'drept' as const, cutie: { x0, y0, x1, y1 }, margine: m + 1,",
  'dreapta', 'marginea contractului greșită')
o('K06', DD, "sprijin: inc.sprijin === 'fata' ? 'fata' as const : 'fund' as const,", "sprijin: 'fund' as const,", 'dreapta', 'sprijinul pe față pierdut')
o('K07', DD, "'fund' as const, decupat: inc.dop === 'decupat', gaura: esteGaura(op),", "'fund' as const, decupat: inc.dop === 'decupat', gaura: false,", 'dreapta',
  'gaura prin foaie nespusă desenului: lemn și contact sub ea')

# ---- Dispecerul calculului (src/jobs/calculCam.ts) ----
o('J01', CALC, "    potrivire: x.potrivire.fel === 'v' ? potrivireaV(", "    potrivire: x.potrivire.fel === 'drept' ? potrivireaV(", 'dreapta',
  'dopul drept măsurat ca unul în V')

# ---- Tabelul din vederea 3D (src/app/Sectiune3D.tsx) ----
# 23.11 (felia 12.1↑e-4): tabelul, titlul și desenul au și felul „trepte”; S01, S05, G01 și L02 urmează codul.
o('S01', SEC, "p.fel === 'drept' ? randuriDrepte(p) : randuriTrepte(p);", "p.fel === 'drept' ? [] : randuriTrepte(p);", 'e2e',
  'tabelul dopului drept gol')
o('S03', SEC, '      simulat: mm(peFund ? p.inaltime - p.adancime : p.adancime - p.inaltime),', '      simulat: mm(p.adancime - p.inaltime),', 'e2e',
  'între plăci cu semnul întors')
o('S04', SEC, "  const sprijin = h.decupat ? 'peste' : peFund ? 'intre' : 'sub';", "  const sprijin = peFund ? 'intre' : 'sub';", 'e2e',
  'dopul decupat „între plăci”, nu „peste placă”')
# 23.11: geometria desenului a trecut în `sectiuneDesen.ts` (pură, probată pe hârtie); S05 și S06 o urmează acolo.
o('S05', DES, "(p.fel === 'trepte' ? p.asezare : p.adancime)) / 2;", "(p.fel === 'trepte' ? p.asezare : p.inaltime)) / 2;", 'e2e',
  'tăietura cu fierăstrăul la fața plăcii')
o('S06', DES, "    taiere: { fel: decupat ? 'rindea' : 'fierastrau', y: f(-zTaiere) },", "    taiere: { fel: 'fierastrau', y: f(-zTaiere) },", 'e2e',
  'la dopul decupat, fierăstrăul în loc de rindea')
o('S07', SEC, "  const titlu = p.fel === 'drept' && p.hartie.decupat ? 'editare.3d.sectiune.titlu-decupat' : 'editare.3d.sectiune.titlu';",
  "  const titlu = 'editare.3d.sectiune.titlu';", 'e2e', 'dopul decupat „întors” în titlu')
o('S08', SEC, "      simulat: p.dop.afara === 0 ? t('editare.3d.sectiune.dop-tot', { n: p.dop.n }) : t('editare.3d.sectiune.dop-afara', { k: p.dop.afara, n: p.dop.n }),",
  "      simulat: t('editare.3d.sectiune.dop-afara', { k: p.dop.afara, n: p.dop.n }),", 'e2e', '„0 din N puncte ies” în loc de „toate cele N”')

# ---- Desenul secțiunii (src/app/sectiuneDesen.ts), din privirea pe secțiunea reală (23.11) ----
o('G01', DES, "c = s.celula, drept = p.fel !== 'v';", 'c = s.celula, drept = false;', 'desen', 'pereții drepți desenați prin centrele celulelor (înclinați)')
o('G02', DES, '    return Number.isFinite(d) ? Math.min(d, 0) : decupat ? 0 : Number.NaN;', '    return Number.isFinite(d) ? d : decupat ? 0 : Number.NaN;', 'desen',
  'cleiul urcat până la fața coborâtă a dopului, prin spațiul dintre plăci')
o('G03', DES, '    return Number.isFinite(d) ? Math.min(d, 0) : decupat ? 0 : Number.NaN;', '    return Number.isFinite(d) ? Math.min(d, 0) : Number.NaN;', 'desen',
  'la dopul decupat, jocul lateral fără clei')
o('G04', DES, '    return Number.isFinite(d) ? Math.min(d, 0) : decupat ? 0 : Number.NaN;', '    return Number.isFinite(d) ? Math.min(d, 0) : 0;', 'desen',
  'și la dopul ridicat, locașul fără lemn deasupra e desenat clei')
o('G05', DES, '  const zJos = gaura ? -p.hartie.D : -(p.hartie.D + SUB_FUND),', '  const zJos = -(p.hartie.D + SUB_FUND),', 'desen', 'lemn desenat sub gaura prin foaie')
o('G06', DES, ' && dop(i) - placa(i) < CONTACT && !prin(i))', ' && dop(i) - placa(i) < CONTACT)', 'desen', 'contact pe un fund care nu e, sub gaură')
o('G07', DES, '  const prin = (i: number): boolean => gaura && placa(i) <= -p.hartie.D + FATA;', '  const prin = (i: number): boolean => gaura;', 'desen',
  'la gaură, nici treapta rămasă în ea n-are contact')
o('G08', DES, '  const clei = rulari(n, (i) => inLocas(i) && sus(i) - placa(i) >= CONTACT)', '  const clei = rulari(n, (i) => inLocas(i) && sus(i) - placa(i) > 0)', 'desen',
  'jocul de sub pragul contactului desenat clei')
o('G09', DES, ' && dop(i) - placa(i) < CONTACT && !prin(i))', ' && dop(i) - placa(i) < 2 * CONTACT && !prin(i))', 'desen', 'contactul până la 0,1 mm')
o('G10', DES, '  const inLocas = (i: number): boolean => placa(i) < -FATA;', '  const inLocas = (_i: number): boolean => true;', 'desen',
  'cleiul și contactul și pe fața plăcii, în afara locașului')
o('G11', DES, '      else if (ultim && ultim[1] === zi) ultim[0] = s.x0 + (i + 1) * c;\n      else rez.push([s.x0 + i * c, zi], [s.x0 + (i + 1) * c, zi]);',
  '      else rez.push([s.x0 + i * c, zi], [s.x0 + (i + 0.5) * c, zi]);', 'desen', 'treptele de o jumătate de celulă (pereții iar înclinați)')
o('G12', DES, '    marcaj: s.marcaj !== null ? f(s.marcaj) : null,', '    marcaj: null,', 'desen', 'locul diferenței nedesenat')

# ---- Legăturile desenului în vedere (e2e) ----
o('L01', SEC, '      {g.clei ? <path data-strat="clei" d={g.clei} className="sectiune-clei" /> : null}\n', '', 'e2e', 'cleiul nedesenat')
o('L02', V3D, '          ...(impreuna ? { maxHeight: Math.max(160, zona.h - 16) } : {}),\n', '', 'e2e',
  'insula cu secțiunea trece de zona liberă, sub bara de jos')
o('L03', CSS, '  min-height: 0;\n  overflow-y: auto;\n', '  min-height: 0;\n', 'e2e', 'secțiunea nu se derulează: nota rămâne în afara insulei')
o('L04', CSS, '.stare-3d.cu-sectiune > * {\n  flex-shrink: 0;\n}\n', '', 'e2e', 'alegerea și cipurile se strivesc în loc să rămână pe loc')

SETURI = {
    'exacta': ['test/unit/taiereExacta.test.ts'],
    # 23.11: și grilele mici ale uneltelor comune (N02 și N03 scăpaseră pe corpus).
    'dreapta': ['test/unit/incrustatieDreapta.potrivire3d.test.ts', 'test/unit/potrivireDreapta.grila.test.ts'],
    'desen': ['test/unit/sectiune.desen.test.ts'],
}
E2E = ['test/e2e/incrustatie3d.spec.ts']
