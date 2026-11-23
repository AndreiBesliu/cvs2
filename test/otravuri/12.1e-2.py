# Lista de otrăvuri a feliei 12.1↑e-2 („Împreună (secțiunea)”, ADR 0179), 21.11.2026, alese de autor: măsurarea potrivirii
# (oglinda și grilele, fereastra, benzile contractului, rasterizarea desenului, transformarea distanței, verdictele rândurilor,
# secțiunea, decuparea), ce îi dă CAM-ul (marginea, crestele, decuparea, desenul aplatizat), calculul din lucrător și vederea
# 3D (comutatorul, măsurarea dopului ales, tabelul, desenul secțiunii).
# Țintele din ADR 0179: dopul neoglindit sau mutat, benzile greșite, un rând roșu care trece drept bun, secțiunea în alt loc,
# comutatorul pornit unde nu are ce arăta.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SIM = 'src/sim/potrivire.ts'
DOPV = 'src/cam/dopV.ts'
CALC = 'src/jobs/calculCam.ts'
V3D = 'src/app/Vedere3D.tsx'
SEC = 'src/app/Sectiune3D.tsx'

BENZI = '  const pereteMin = 2 * c, pereteMax = h.S * h.t - 2 * c, fund = h.D * h.t + 2 * c, fata = h.H * h.t + 2 * c;'

# ---- Măsurarea (src/sim/potrivire.ts) ----
o('M01', SIM, 'md = -valoare(campDop, nx - 1 - i, j);', 'md = -valoare(campDop, i, j);', 'potrivire', 'dopul neoglindit pe grilă')
o('M02', SIM, '  const campDop = campNou({ x0: x1 + m - gx0 - latime,', '  const campDop = campNou({ x0: x1 + m - gx0,', 'potrivire',
  'grila dopului mutată cu lățimea ferestrei')
o('M03', SIM, '  const lat = Math.min(m, h.H * h.t + 1);', '  const lat = Math.min(m, h.H * h.t);', 'potrivire',
  'fereastra fără spațiul dintre plăci')
o('M04', SIM, '      if (joc < PRAG_CONTACT) inContact++;', '      if (joc < 0) inContact++;', 'potrivire', 'contactul cere jocul negativ')
o('M05', SIM, BENZI, BENZI.replace('pereteMax = h.S * h.t', 'pereteMax = h.D * h.t'), 'potrivire', 'pereții până la fund, nu până la S·t')
o('M06', SIM, BENZI, BENZI.replace('fund = h.D * h.t', 'fund = h.S * h.t'), 'potrivire', 'fundul de la S·t, cu peretele de sub dop')
o('M07', SIM, BENZI, BENZI.replace('fata = h.H * h.t + 2 * c', 'fata = 2 * c'), 'potrivire', 'între plăci și pe peretele dopului')
o('M08', SIM, '    for (let k = 0; k + 1 < treceri.length; k += 2) {', '    for (let k = 0; k + 1 < treceri.length; k += 1) {', 'potrivire',
  'desenul umplut între toate trecerile (golurile pline)')
o('M09', SIM, '      d[q] = r * r + f[v[k]!]!;', '      d[q] = Math.abs(r) + f[v[k]!]!;', 'potrivire', 'transformarea distanței fără pătrat')
o('M11', SIM, '  const subMin = h.g - h.creastaLocas - TOLERANTA_POTRIVIRE,', '  const subMin = h.g - TOLERANTA_POTRIVIRE,', 'potrivire',
  'jocul de sub dop fără creasta inelelor')
o('M12', SIM, '  const intreMin = h.H - h.creastaDop - TOLERANTA_POTRIVIRE,', '  const intreMin = h.H - TOLERANTA_POTRIVIRE,', 'potrivire',
  'spațiul dintre plăci fără creasta inelelor')
o('M13', SIM, '    intra: rand(Math.abs(asezare - h.S) <= TOLERANTA_POTRIVIRE, kOprire),', '    intra: rand(true, kOprire),', 'potrivire',
  '„Dopul intră” mereu bun')
o('M14', SIM, '    contact: rand(pereti > 0 && fractie >= CONTACT_MINIM,', '    contact: rand(true,', 'potrivire', '„Pereții în contact” mereu bun')
o('M15', SIM, '    sub: rand(kSub < 0, kSub),', '    sub: rand(true, kSub),', 'potrivire', '„Sub dop” mereu bun')
o('M16', SIM, '    intre: rand(bIntre.n > 0 && kIntre < 0,', '    intre: rand(true,', 'potrivire', '„Între plăci” mereu bun')
o('M17', SIM, ' : ny >> 1;', ' : 0;', 'potrivire', 'secțiunea pe marginea ferestrei, nu prin mijloc')
o('M18', SIM, 'marcaj: rosu?.unde ? rosu.unde[0] : null,', 'marcaj: null,', 'potrivire', 'locul diferenței nemarcat pe secțiune')
o('M19', SIM, '    fataDop[i] = lemn[k] ? M[k]! - asezare : Number.NaN;', '    fataDop[i] = lemn[k] ? M[k]! : Number.NaN;', 'potrivire',
  'dopul din secțiune neașezat (fără h*)')
o('M20', SIM, '      lemn[k] = md >= p.taiata - PRAG_CONTACT ? 0 : 1;', '      lemn[k] = 1;', 'potrivire',
  'tăietura decupării și punțile, numărate ca lemn al dopului')

# ---- Ce îi dă CAM-ul (src/cam/dopV.ts) ----
o('C01', DOPV, 'desen: contururi.map(poligon), margine: m,', 'desen: contururi.map(poligon), margine: m + 1,', 'potrivire',
  'marginea oglinzii greșită')
o('C02', DOPV, '          creastaLocas: fp ? 0 : val.creastaLocas, creastaDop: fp ? 0 : val.creastaDop,',
  '          creastaLocas: val.creastaLocas, creastaDop: val.creastaDop,', 'potrivire', 'crestele inelelor și cu freză dreaptă')
o('C03', DOPV, '        taiata: banda?.decupare ? banda.placa - banda.punti.grosime : Number.POSITIVE_INFINITY,',
  '        taiata: banda?.decupare ? banda.placa : Number.POSITIVE_INFINITY,', 'potrivire', 'punțile decupării, lemn al dopului')
o('C04', DOPV, '        rez.push(centru.x + raza * Math.cos(u), centru.y + raza * Math.sin(u));', '        rez.push(centru.x, centru.y);', 'potrivire',
  'arcele desenului aplatizate prin centru')
o('C05', DOPV, 'desen: contururi.map(poligon),', 'desen: [],', 'potrivire', 'potrivirea fără desen')

# ---- Calculul din lucrător (src/jobs/calculCam.ts) ----
o('J01', CALC, 'inV: x.potrivire !== undefined', 'inV: true', 'dop3d', 'și dopul drept „în V” (comutatorul pornit la el)')
# J02, la prima rulare (`pregatesteProgram(job.program, 1)`, „fața plăcii mutată”), a scăpat ca mutant echivalent: `sus`
# doar desparte mișcările în aer de cele în lemn, iar cele dintre 0 și 1 mm nu taie sub fața plăcii. Mutată pe refuzul dopului
# drept, pe care nu-l proba nimic: proba lui e acum în `incrustatie.potrivire3d.test.ts` (refuzurile calculului).
o('J02', CALC, '  if (!x.potrivire) return { ok: false, motiv:', '  if (false) return { ok: false, motiv:', 'potrivire',
  'dopul drept măsurat ca unul în V, fără refuz')
o('J03', CALC, 'grosimeDop: x.semifabricat.grosimeMinima })', 'grosimeDop: x.semifabricat.grosimeMinima + 1 })', 'potrivire',
  'grosimea dopului din secțiune greșită')

# ---- Vederea 3D (src/app/Vedere3D.tsx, src/app/Sectiune3D.tsx) ----
o('U01', V3D, '  const poateImpreuna = dopAles?.inV === true;', '  const poateImpreuna = false;', 'e2e', 'comutatorul niciodată pornit')
o('U02', V3D, '  const poateImpreuna = dopAles?.inV === true;', '  const poateImpreuna = dopAles !== null;', 'e2e',
  'comutatorul pornit și la dopul drept')
o('U03', V3D, '    if (ce === alegere) return;\n    opresteImpreuna();\n', '    if (ce === alegere) return;\n', 'e2e',
  'altă alegere lasă „Împreună” apăsat')
o('U04', V3D, '      calc.potrivireSimulata(d, k, ctl.signal)', '      calc.potrivireSimulata(d, k + 1, ctl.signal)', 'e2e', 'se măsoară alt dop decât cel ales')
o('U06', SEC, 'hartie: mm(h.S), simulat: mm(p.asezare)', 'hartie: mm(h.D), simulat: mm(p.asezare)', 'e2e', '„Dopul intră” pe hârtie cu D în loc de S')
o('U07', SEC, '`${Math.round(p.contact.fractie * 100)} %`', '`${Math.round(p.contact.fractie)} %`', 'e2e', 'contactul ca fracție, nu în procente')
o('U08', SEC, "className={r.r.ok ? undefined : 'diferit'}", 'className="diferit"', 'e2e', 'toate rândurile roșii')
o('U09', SEC, '      <path data-strat="dop" d={dop} className="sectiune-dop" />\n', '', 'e2e', 'secțiunea fără dop')
o('U10', SEC, '{ n, y: p.sectiune.y.toFixed(2) }', '{ n, y: p.sectiune.x0.toFixed(2) }', 'e2e', 'titlul secțiunii cu X în loc de Y')
o('U11', SEC, '  const contact = rulari(n, (i) => inLocas(i) && s.dop[i]! - s.placa[i]! < CONTACT);', '  const contact = rulari(n, () => false);', 'e2e',
  'pereții în contact nedesenați')
o('U12', V3D, "  const titluImpreuna = alegere === 'foaie' ? t('editare.3d.impreuna.alege')", "  const titluImpreuna = alegere === 'foaie' ? t('editare.3d.impreuna.doarV')",
  'e2e', 'pe foaie, motivul dopului drept')

SETURI = {
    'potrivire': ['test/unit/incrustatie.potrivire3d.test.ts'],
    'dop3d': ['test/unit/incrustatie.dop3d.test.ts'],
}
E2E = ['test/e2e/incrustatie3d.spec.ts']
