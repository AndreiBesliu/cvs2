# Lista de otrăvuri a feliei 12.1↑e-4 („Împreună (secțiunea)” la dopul în trepte, ADR 0179 §6), 23.11.2026, alese de autor:
# măsurarea potrivirii în trepte (oglinda, nivelurile citite pe locaș și pe dop, jocul pe fiecare nivel cu partea lui de dop,
# toleranța lui, dopul în locaș, reazemul flanșei pe umăr, medianele, așezarea, cleiul și spațiul de peste placă, verdictele
# rândurilor, secțiunea), ce îi dă CAM-ul (felul descriptorului, D la gaură, desenele flanșei și tijei, sprijinul, tija),
# dispecerul calculului, tabelul din vederea 3D, desenul secțiunii în trepte și insula ținută în zona liberă pe lățime.
# Țintele din ADR 0179 (felia 12.1↑e-4): jocul unui nivel măsurat cu partea greșită a dopului sau tolerat prea larg, dopul
# care iese din locaș trecut drept bun, flanșa căzută în deschidere trecută drept sprijinită, umărul, fundul, tija sau
# înălțimea luate una drept alta, cleiul de sub tijă (sau de deasupra umărului) greșit, mai ales la gaură, dopul decupat cu rama
# plăcii lui, secțiunea în alt loc, dopul în trepte măsurat ca unul drept, rândurile tabelului greșite, tăietura cu fierăstrăul
# în alt loc, insula sub panoul de proprietăți pe un ecran îngust.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), într-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PT = 'src/sim/potrivireTrepte.ts'
DD = 'src/cam/dopDrept.ts'
CALC = 'src/jobs/calculCam.ts'
SEC = 'src/app/Sectiune3D.tsx'
DES = 'src/app/sectiuneDesen.ts'
V3D = 'src/app/Vedere3D.tsx'
CSS = 'src/app/vedere3d.css'

# ---- Măsurarea (src/sim/potrivireTrepte.ts) ----
o('T01', PT, '  const g = grilePotrivire(locas, dop, p.cutie, p.margine, true, p.celula);',
  '  const g = grilePotrivire(locas, dop, p.cutie, p.margine, !p.hartie.decupat, p.celula);', 'trepte',
  'dopul decupat în trepte citit neîntors (ca dopul decupat cu pereți drepți)')
o('T02', PT, '  const zSus = h.d / 2, zJos = (h.d + h.D) / 2,', '  const zSus = h.d / 2, zJos = h.d / 2,', 'trepte',
  'deschiderea citită la nivelul de sus')
o('T03', PT, ' zFlansa = (h.tija + Math.min(h.h, p.taiata)) / 2;', ' zFlansa = h.tija / 2;', 'trepte', 'flanșa citită la nivelul tijei')
o('T04', PT, '    const joc = -fD(q[0], q[1]);', '    const joc = fD(q[0], q[1]);', 'trepte', 'jocul lateral cu semnul întors')
o('T05', PT, '    if (e > TOLERANTA_JOC && e > iesire)', '    if (e > 10 * TOLERANTA_JOC && e > iesire)', 'trepte',
  'jocul lateral tolerat la 0,2 în loc de 0,02')
o('T06', PT, '  const jocSus = jocNivel(g, zSus, fSus, gFlansa, h.c), jocJos = jocNivel(g, zJos, fJos, gTija, h.c);',
  '  const jocSus = jocNivel(g, zSus, fSus, gTija, h.c), jocJos = jocNivel(g, zJos, fJos, gFlansa, h.c);', 'trepte',
  'fiecare nivel al locașului măsurat cu partea cealaltă a dopului')
o('T07', PT, '    const l = fSus(q[0], q[1]);', '    const l = fJos(q[0], q[1]);', 'trepte',
  'flanșa judecată față de deschidere: iese mereu din locaș')
o('T08', PT, '    const r = fJos(q[0], q[1]);', '    const r = -fSus(q[0], q[1]);', 'trepte',
  'reazemul măsurat față de nivelul de sus, nu de deschidere')
o('T09', PT, '    reazem: rand(reazeme.length > 0 && nu === 0,', '    reazem: rand(reazeme.length > 0,', 'trepte',
  'flanșa căzută în deschidere trecută drept sprijinită')
o('T10', PT, '  const umar = mediana(umare), adancime = mediana(adanci),', '  const umar = mediana(adanci), adancime = mediana(umare),', 'trepte',
  'umărul și fundul luate unul drept altul')
o('T11', PT, '  for (let k = 0; k < n; k++) if (!h.decupat || lemnFlansa[k]) asezare', '  for (let k = 0; k < n; k++) if (true) asezare', 'trepte',
  'dopul decupat așezat și cu rama plăcii lui')
o('T12', PT, "  const clei = h.sprijin === 'umar' ? adancime - umar - tija : tija - (adancime - umar);",
  "  const clei = h.sprijin === 'umar' ? adancime - umar + tija : tija - (adancime - umar);", 'trepte', 'cleiul de sub tijă greșit')
o('T13', PT, "  const cleiHartie = h.sprijin === 'umar' && h.gaura ? 0 : h.g;", '  const cleiHartie = h.g;', 'trepte',
  'la gaură, sub tijă g pe hârtie, deși tija iese la nivel cu fața de jos')
o('T14', PT, "  const placi = h.sprijin === 'umar' ? inaltime - tija - umar : inaltime - adancime;",
  "  const placi = h.sprijin === 'umar' ? inaltime - tija : inaltime - adancime;", 'trepte', 'spațiul de peste placă fără umăr')
o('T15', PT, '    jocSus: rand(jocSus.joc.n > 0 && jocSus.unde === null,', '    jocSus: rand(jocSus.joc.n > 0,', 'trepte',
  'jocul lateral la flanșă niciodată roșu')
o('T16', PT, '    umar: z(Math.abs(umar - h.d) <= TOLERANTA_POTRIVIRE, kUmar),', '    umar: z(Math.abs(umar - h.d) <= 1, kUmar),', 'trepte',
  'umărul tolerat la 1 mm')
o('T17', PT, '  const j = rosu?.unde ? Math.min(ny - 1, Math.max(0, Math.floor((rosu.unde[1] - gy0) / c))) : ny >> 1;',
  '  const j = rosu?.unde ? Math.min(ny - 1, Math.max(0, Math.floor((rosu.unde[1] - gy0) / c))) : 0;', 'trepte',
  'secțiunea fără rând roșu la marginea semifabricatului, nu prin mijloc')
o('T18', PT, '    fataDop[i] = !h.decupat || lemnFlansa[k] ? M[k]! - asezare : Number.NaN;', '    fataDop[i] = M[k]! - asezare;', 'trepte',
  'secțiunea dopului decupat cu rama plăcii lui')
o('T19', PT, '    const k = j * nx + i;\n    placa[i] = -F[k]!;', '    const k = j * nx + i;\n    placa[i] = F[k]!;', 'trepte',
  'placa din secțiune cu semnul întors')

# ---- Ce îi dă CAM-ul (src/cam/dopDrept.ts) ----
o('K10', DD, '      potrivire: treapta && jos ? {', '      potrivire: false && jos ? {', 'trepte',
  'dopul în trepte își spune potrivirea dreaptă')
o('K11', DD, 'D: esteGaura(op) ? (doc.foi[0]?.stoc.grosime ?? op.adancime) : op.adancime, d: treapta.d,', 'D: op.adancime, d: treapta.d,', 'trepte',
  'la gaură, D pe hârtie e adâncimea scrisă, nu grosimea foii')
o('K12', DD, ' margine: m, flansa: desenDop(f.figura.dop),', ' margine: m, flansa: [],', 'trepte',
  'potrivirea fără desenul flanșei: niciun lemn al ei')
o('K13', DD, ' tija: desenDop(jos.dop),', ' tija: [],', 'trepte', 'potrivirea fără desenul tijei: niciun lemn al ei')
o('K14', DD, "sprijin: inc.sprijin === 'fund' ? 'fund' as const : 'umar' as const,", "sprijin: 'umar' as const,", 'trepte',
  'sprijinul pe fund pierdut')
o('K15', DD, 'c: inc.jocLateral, tija: treapta.tija,', 'c: inc.jocLateral, tija: treapta.tija + 0.1,', 'trepte',
  'tija pe hârtie alta decât a programului')

# ---- Dispecerul calculului (src/jobs/calculCam.ts) ----
o('J10', CALC, "      : x.potrivire.fel === 'drept' ? potrivireaDreapta(", "      : x.potrivire.fel !== 'v' ? potrivireaDreapta(", 'trepte',
  'dopul în trepte măsurat ca unul drept')

# ---- Tabelul din vederea 3D (src/app/Sectiune3D.tsx) ----
o('S10', SEC, "p.fel === 'drept' ? randuriDrepte(p) : randuriTrepte(p);", "p.fel === 'drept' ? randuriDrepte(p) : [];", 'e2e',
  'tabelul dopului în trepte gol')
o('S11', SEC, "simulat: p.reazem.nu === 0 ? t('editare.3d.sectiune.reazem-tot'", "simulat: p.reazem.nu !== 0 ? t('editare.3d.sectiune.reazem-tot'", 'e2e',
  'reazemul spus întors')
o('S12', SEC, "eticheta: t('editare.3d.sectiune.tija'), hartie: mm(h.tija),", "eticheta: t('editare.3d.sectiune.tija'), hartie: mm(h.h),", 'e2e',
  'tija pe hârtie cu înălțimea dopului')
o('S13', SEC, "      id: peUmar ? 'sub-tija' : 'peste-umar',", "      id: peUmar ? 'peste-umar' : 'sub-tija',", 'e2e',
  'cleiul de sub tijă și cel de deasupra umărului luate unul drept altul')
o('S14', SEC, '      simulat: mm(peUmar ? p.inaltime - p.tija - p.umar : p.inaltime - p.adancime),', '      simulat: mm(p.inaltime - p.adancime),', 'e2e',
  'spațiul dintre plăci al dopului pe umăr socotit ca pe fund')

# ---- Desenul secțiunii (src/app/sectiuneDesen.ts) ----
o('G20', DES, "(p.fel === 'trepte' ? p.asezare : p.adancime)) / 2;", "(p.fel === 'trepte' ? 0 : p.adancime)) / 2;", 'desen',
  'tăietura cu fierăstrăul a dopului în trepte la jumătatea lui, nu a spațiului dintre plăci')
o('G21', DES, "c = s.celula, drept = p.fel !== 'v';", "c = s.celula, drept = p.fel === 'drept';", 'desen',
  'pereții dopului în trepte desenați prin centrele celulelor (înclinați)')

# ---- Insula în zona liberă, pe lățime (src/app/Vedere3D.tsx, src/app/vedere3d.css) ----
o('L10', V3D, " ['--zona-latime' as string]: `${Math.max(160, zona.w - 16)}px`,", '', 'e2e',
  'insula cu secțiunea intră sub panoul de proprietăți pe un ecran îngust')
o('L11', CSS, '  max-width: min(48rem, calc(100% - 16px), var(--zona-latime, 100%));', '  max-width: min(48rem, calc(100% - 16px));', 'e2e',
  'insula cu secțiunea, mai lată decât zona liberă')

SETURI = {
    'trepte': ['test/unit/incrustatieDreapta.potrivireTrepte3d.test.ts'],
    'desen': ['test/unit/sectiune.desen.test.ts'],
}
E2E = ['test/e2e/incrustatie3d.spec.ts']
