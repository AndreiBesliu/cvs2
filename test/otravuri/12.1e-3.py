# Lista de otrăvuri a feliei 12.1↑e-3 („Împreună (secțiunea)” la pereții drepți, ADR 0179), 22.11.2026, alese de autor:
# tăietura exactă pe mutări (filtrul frezelor plate, raza, nivelul, arcele orare, capetele, cutia, bisecția), măsurarea
# potrivirii drepte (oglinda și grila dopului, rama decupatului, jocul și toleranța lui, interferența, așezarea, sprijinul,
# verdictele rândurilor, secțiunea), ce îi dă CAM-ul (D la gaură, g la gaură, decupat, sprijinul, treapta, marginea),
# dispecerul calculului și tabelul din vederea 3D.
# Țintele din ADR 0179 (felia 12.1↑e-3): jocul lateral greșit sau tolerat prea larg, dopul care iese din locaș trecut drept
# bun, dopul decupat întors sau cu rama lui, sprijinul greșit (pe fund, pe față, la gaură), secțiunea în alt loc, dopul în
# trepte măsurat ca unul drept, rândurile tabelului greșite.
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
o('P01', PD, ', h = p.hartie, oglindit = !h.decupat;', ', h = p.hartie, oglindit = true;', 'dreapta', 'și dopul decupat oglindit')
o('P02', PD, '(oglindit ? [x1 + m - x, y - y0 + m] :', '(oglindit ? [x1 + m - x, y - y0] :', 'dreapta', 'contractul fără margine pe Y la jocul exact')
o('P03', PD, '  for (let i = 0; i < nx; i++) { pune(i); pune((ny - 1) * nx + i); }\n  for (let j = 0; j < ny; j++) { pune(j * nx); pune(j * nx + nx - 1); }\n', '',
  'dreapta', 'fără rama semifabricatului: lemnul ei numărat ca dop')
o('P05', PD, '          const joc = -fD(q[0], q[1]);', '          const joc = fD(q[0], q[1]);', 'dreapta', 'jocul lateral cu semnul întors')
o('P06', PD, '          if (e > TOLERANTA_JOC && e > iesireJoc) {', '          if (e > 10 * TOLERANTA_JOC && e > iesireJoc) {', 'dreapta',
  'jocul lateral tolerat la 0,2 în loc de 0,02')
o('P07', PD, '            afara++;\n', '', 'dreapta', 'punctele dopului din afara locașului nenumărate')
o('P08', PD, '    if (oglindit) asezare = Math.min(asezare, F[k]! + M[k]!);', '    if (oglindit) asezare = Math.min(asezare, F[k]!);', 'dreapta',
  'dopul ridicat neașezat (h* fără fața lui)')
o('P09', PD, '    else if (piesa(k)) asezare = Math.min(asezare, F[k]!);', '    else asezare = Math.min(asezare, F[k]!);', 'dreapta',
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
o('P18', PD, '    fataDop[i] = oglindit ? M[k]! - asezare : piesa(k) ? -asezare : Number.NaN;', '    fataDop[i] = oglindit ? M[k]! - asezare : -asezare;',
  'dreapta', 'dopul decupat desenat și în afara lui')
o('P19', PD, 'marcaj: rosu?.unde ? rosu.unde[0] : null,', 'marcaj: null,', 'dreapta', 'locul diferenței nemarcat pe secțiune')
o('P20', PD, '      M[j * nx + i] = -valoare(campDop, oglindit ? nx - 1 - i : i, j);', '      M[j * nx + i] = -valoare(campDop, i, j);', 'dreapta',
  'dopul ridicat neoglindit pe grilă')
o('P21', PD, '  const campDop = campNou({ x0: oglindit ? x1 + m - gx0 - latime : gx0 - x0 + m,', '  const campDop = campNou({ x0: oglindit ? x1 + m - gx0 - latime : gx0 - x0,',
  'dreapta', 'grila dopului decupat fără margine')
o('P22', PD, '  const netaiat = (k: number): boolean => M[k]! < h.h / 2;', '  const netaiat = (k: number): boolean => M[k]! < h.h;', 'dreapta',
  'punțile decupatului legate de ramă: dopul luat drept ramă')
o('P23', PD, '      const tk = F[k]! >= h.D / 2, tkk = F[kk]! >= h.D / 2;', '      const tk = F[k]! >= h.D / 2, tkk = tk;', 'dreapta',
  'niciun punct pe peretele locașului')
o('P24', PD, '        if (rama[lemn]) continue;\n', '', 'dreapta', 'marginea ramei numărată ca perete al dopului')

# ---- Ce îi dă CAM-ul (src/cam/dopDrept.ts) ----
o('K01', DD, '            D: esteGaura(op) ? (doc.foi[0]?.stoc.grosime ?? op.adancime) : op.adancime,', '            D: op.adancime,', 'dreapta',
  'la gaură, D pe hârtie e adâncimea scrisă, nu grosimea foii')
o('K02', DD, '            g: esteGaura(op) ? 0 : inc.joc,', '            g: inc.joc,', 'dreapta', 'la gaură, jocul de sub dopul pe față e g, nu 0')
o('K03', DD, "decupat: inc.dop === 'decupat',", 'decupat: false,', 'dreapta', 'dopul decupat luat drept ridicat')
o('K04', DD, '      ...(treapta ? {} : {', '      ...(false ? {} : {', 'dreapta', 'și dopul în trepte își spune potrivirea dreaptă')
o('K05', DD, "          fel: 'drept' as const, cutie: { x0, y0, x1, y1 }, margine: m,", "          fel: 'drept' as const, cutie: { x0, y0, x1, y1 }, margine: m + 1,",
  'dreapta', 'marginea contractului greșită')
o('K06', DD, "sprijin: inc.sprijin === 'fata' ? 'fata' as const : 'fund' as const,", "sprijin: 'fund' as const,", 'dreapta', 'sprijinul pe față pierdut')

# ---- Dispecerul calculului (src/jobs/calculCam.ts) ----
o('J01', CALC, "    potrivire: x.potrivire.fel === 'v' ? potrivireaV(", "    potrivire: x.potrivire.fel === 'drept' ? potrivireaV(", 'dreapta',
  'dopul drept măsurat ca unul în V')

# ---- Tabelul din vederea 3D (src/app/Sectiune3D.tsx) ----
o('S01', SEC, "  const randuri = p.fel === 'v' ? randuriV(p) : randuriDrepte(p);", "  const randuri = p.fel === 'v' ? randuriV(p) : [];", 'e2e',
  'tabelul dopului drept gol')
o('S03', SEC, '      simulat: mm(peFund ? p.inaltime - p.adancime : p.adancime - p.inaltime),', '      simulat: mm(p.adancime - p.inaltime),', 'e2e',
  'între plăci cu semnul întors')
o('S04', SEC, "  const sprijin = h.decupat ? 'peste' : peFund ? 'intre' : 'sub';", "  const sprijin = peFund ? 'intre' : 'sub';", 'e2e',
  'dopul decupat „între plăci”, nu „peste placă”')
o('S05', SEC, 'rindea ? 0 : Math.max(0, p.inaltime - p.adancime) / 2;', 'rindea ? 0 : 0;', 'e2e', 'tăietura cu fierăstrăul la fața plăcii')
o('S06', SEC, "  const rindea = p.fel === 'drept' && p.hartie.decupat;", '  const rindea = false;', 'e2e', 'la dopul decupat, fierăstrăul în loc de rindea')
o('S07', SEC, "  const titlu = p.fel === 'drept' && p.hartie.decupat ? 'editare.3d.sectiune.titlu-decupat' : 'editare.3d.sectiune.titlu';",
  "  const titlu = 'editare.3d.sectiune.titlu';", 'e2e', 'dopul decupat „întors” în titlu')
o('S08', SEC, "      simulat: p.dop.afara === 0 ? t('editare.3d.sectiune.dop-tot', { n: p.dop.n }) : t('editare.3d.sectiune.dop-afara', { k: p.dop.afara, n: p.dop.n }),",
  "      simulat: t('editare.3d.sectiune.dop-afara', { k: p.dop.afara, n: p.dop.n }),", 'e2e', '„0 din N puncte ies” în loc de „toate cele N”')

SETURI = {
    'exacta': ['test/unit/taiereExacta.test.ts'],
    'dreapta': ['test/unit/incrustatieDreapta.potrivire3d.test.ts'],
}
E2E = ['test/e2e/incrustatie3d.spec.ts']
