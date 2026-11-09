# Lista de otrăvuri a feliei 10.3↑j (îmbinarea pe tăieturile drepte; ADR 0181 §6), 09.11.2026, alese de autor: generatorul
# (dinții pe coardă, marginea, fiecare model, rotunjirile, razele valului și ale puzzle-ului, vârfurile lipite), cererea
# (închiderea, valorile, tăieturile care nu sunt drepte, niciun dinte), drumul (coardele de pe tăietură, marginea dinților,
# capetele coardelor), părțile (latura, ordinea, gruparea pe linie, cu joc), dreapta căii trase; partea pură a uneltei
# (coardele, dinții arătați, îmbinarea cerută) și legăturile din interfață, cu bara de sus la 1280 px (e2e); apoi fișierele lângă
# Imprimanta (aranjamentul pe ecranul lat și pe cel îngust, verificarea lui, fereastra, pragul) și bifa Cuțitului în bară.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


I = 'src/model/imbinare.ts'
T = 'src/model/taiere.ts'
C = 'src/app/cutitCalcul.ts'
S = 'src/app/optiuniTaiere.ts'
U = 'src/app/UnealtaCutit.tsx'
P = 'src/app/PanouTaiere.tsx'
G = 'src/app/GrupuriTaiere.tsx'
Y = 'src/app/stil.css'

# Generatorul.
o('G01', I, "Math.floor(l / pas - 1 + 1e-9)", "Math.floor(l / pas + 1e-9)", 'imbinare', 'un dinte în plus pe coardă (marginile sub o jumătate de pas)')
o('G02', I, "margine: (l - n * pas) / 2", "margine: (l - n * pas) / 3", 'imbinare', 'restul împărțit inegal la capete')
o('G03', I, "{ t: t + (3 * p) / 4, s: -h }", "{ t: t + (3 * p) / 4, s: -h / 2 }", 'imbinare', 'zigzagul coboară doar pe jumătate')
o('G04', I, "{ t: t + p / 2, s: h }, { t: t + p / 2, s: -h }", "{ t: t + p / 2 + p / 8, s: h }, { t: t + p / 2 + p / 8, s: -h }", 'imbinare',
  'dinții drepți, cu treapta mutată de la jumătatea pasului')
o('G05', I, "const h = H / 2, q = H / 12;", "const h = H / 2, q = -H / 12;", 'imbinare', 'coada de rândunică întoarsă (dintele mai îngust la vârf)')
o('G06', I, "const rho = (p * p / 16 + H * H / 4) / (2 * H);", "const rho = (p * p / 16 + H * H / 4) / H;", 'imbinare', 'raza valului dublată')
o('G07', I, "v = rho < r - 1e-9 ? 'imbinare-raza' :", "v = rho < -1 ? 'imbinare-raza' :", 'imbinare', 'valul cu raza sub cea a frezei e primit')
o('G08', I, "const R = H / 4, d = Math.sqrt(H * r);", "const R = H / 3, d = Math.sqrt(H * r);", 'imbinare', 'capul puzzle-ului, de rază înălțime / 3')
o('G09', I, " && R > d - r + 1e-9", "", 'imbinare', 'puzzle-ul fără cap mai lat decât gâtul e primit')
o('G10', I, "const bun = r > 0 && ", "const bun = ", 'imbinare', 'puzzle-ul cu raza 0 (fără gât) e primit')
o('G11', I, "{ t: A0.t, s: 0, b: bulge(A0, T1, F1, z > 0) },", "{ t: A0.t, s: 0, b: bulge(A0, T1, F1, z < 0) },", 'imbinare',
  'primul flanc al cocoașei, arcul pe dos')
o('G12', I, "    if ((tg[i] as number) + (tg[i + 1] as number) > Math.hypot(b.t - a.t, b.s - a.s) + 1e-9) return 'imbinare-raza';\n", '', 'imbinare',
  'rotunjirile care nu încap pe latura lor sunt primite')
o('G13', I, "b: Math.tan((cot[i] as number) / 4) },", "b: Math.tan(-(cot[i] as number) / 4) },", 'imbinare', 'rotunjirile colțurilor, pe dos')
o('G14', I, "    return !u || x.b !== 0 || Math.hypot(u.t - x.t, u.s - x.s) > 1e-9;", "    return true;", 'imbinare',
  'vârfurile lipite (laturile de lungime zero) rămân în drum')
o('G15', I, "const tg = cot.map((u) => r * Math.tan(Math.abs(u) / 2));", "const tg = cot.map((u) => r * Math.tan(Math.abs(u) / 4));", 'imbinare',
  'rotunjirea pornește prea aproape de colț (arcul nu mai e tangent cu raza dată)')
# Cererea.
o('M01', T, "    if (!cerere.inchide) return { ok: false, motiv: 'imbinare-inchide' };\n", '', 'imbinare', 'îmbinarea fără închidere nu se mai refuză')
o('M02', T, "    if (!imbinareBuna(imbinare)) return { ok: false, motiv: 'valoare' };\n", '', 'imbinare', 'valorile îmbinării nu se mai verifică')
o('M03', T, "if (c.fel === 'forma' || c.fel === 'forme' || (c.fel === 'cale'", "if (c.fel === 'forme' || (c.fel === 'cale'", 'imbinare',
  'cuțitul-formă din panou primește îmbinarea')
o('M04', T, " || (c.fel === 'cale' && c.netezire !== undefined)) return { ok: false, motiv: 'imbinare-dreapta' };",
  ") return { ok: false, motiv: 'imbinare-dreapta' };", 'imbinare', 'mâna liberă primește îmbinarea')
o('M05', T, "  if (imbinare && dinti === 0) return { ok: false, motiv: 'imbinare' };\n", '', 'imbinare',
  'o tăietură în care nu încape niciun dinte se face dreaptă, fără refuz')
# Drumul.
o('M06', T, "    if (a <= de || b >= pana) continue;\n", '', 'imbinare', 'și coardele care nu stau toate pe calea trasă primesc dinți')
o('M07', T, "    if (d === 'imbinare-raza') return d;", "    if (d === 'imbinare-raza') continue;", 'imbinare',
  'modelul care nu iese cu raza dată lasă coarda dreaptă')
o('M08', T, "intalniri(D, C).puncte.length > 0) return 'imbinare-margine';", "intalniri(D, C).puncte.length > 1e9) return 'imbinare-margine';",
  'imbinare', 'dinții care ating o gaură sau o latură nu se mai refuză')
o('M09', T, "const dinti0 = d.slice(1, -1).map(", "const dinti0 = d.map(", 'imbinare', 'capetele coardelor (pe marginea formei) intră în drum')
# Părțile.
o('M10', T, "(x.latura === -1 ? drp : st)", "(x.latura === 1 ? drp : st)", 'imbinare', 'fețele puse de partea greșită a liniei')
o('M11', T, "grupat === -1 ? [st, drp] : [drp, st]", "grupat === -1 ? [drp, st] : [st, drp]", 'imbinare', 'partea B întâi (ordinea părților)')
o('M12', T, "const dr: Dreapta = { A: { x: L.n.x * L.v, y: L.n.y * L.v }, u: L.u };",
  "const dr: Dreapta = { A: { x: L.n.x * L.v, y: L.n.y * L.v }, u: { x: -L.u.x, y: -L.u.y } };", 'imbinare',
  'drumul liniei, în sens invers (latura părții A se întoarce)')
o('M13', T, "taieCuImbinare(inst, p, dr, imbinare, pastreaza, intre, stangaLiniei(L), numara)",
  "taieCuImbinare(inst, p, dr, imbinare, pastreaza, intre, null, numara)", 'imbinare', 'linia din panou nu mai grupează fețele pe laturi')
o('M14', T, " || Math.abs((v.p.x - A.x) * u.y - (v.p.y - A.y) * u.x) > eps(v.p)) return null;", ") return null;", 'imbinare',
  'o cale frântă trece drept dreaptă (de la primul la ultimul punct)')
o('M15', T, "if ((k + 1 < c.varfuri.length && v.s.tip !== 'L') || Math.abs(", "if (Math.abs(", 'imbinare',
  'o cale cu arce, cu capetele pe o dreaptă, trece drept dreaptă')
o('M16', T, "for (const s of grupat === -1 ? [1, -1] : [-1, 1])", "for (const s of grupat === -1 ? [-1, 1] : [1, -1])", 'imbinare',
  'cu joc, partea B întâi')
o('M17', T, "if (grupat !== null && !rest.has(cheie)) toate.push(y.e);", "if (grupat !== null) toate.push(y.e);", 'imbinare',
  'cu suprapunere, restul păstrat de ambele părți intră de două ori în aceeași parte')
# Partea pură a uneltei.
o('K01', C, "if ((t[i] as number) > de && (t[i + 1] as number) < pana) rez.push(", "if (true) rez.push(", 'unealta',
  'coardele arătate, și cele care trec de capetele cuțitului')
o('K02', C, "  const n = { x: -u.y, y: u.x };\n  const la = (t: number, s: number): P =>", "  const n = { x: u.y, y: -u.x };\n  const la = (t: number, s: number): P =>",
  'unealta', 'dinții arătați, oglindiți față de linie')
o('K03', C, "for (let k = 1; k < 12; k++)", "for (let k = 1; k < 6; k++)", 'unealta', 'arcele dinților arătate doar pe jumătate')
o('K04', C, "const h = r * Math.cos(Math.abs(th) / 2) * Math.sign(v.b);", "const h = r * Math.cos(Math.abs(th) / 2) * -Math.sign(v.b);", 'unealta',
  'centrul arcului arătat, de partea greșită')
o('K05', C, "    if (d === null || typeof d === 'string') continue;", "    if (d === null) continue;", 'unealta',
  'modelul care nu iese (raza) e arătat ca drum')
o('K06', S, "return o.inchide && dreapta && o.imbinare !== 'dreapta' ?", "return o.inchide && o.imbinare !== 'dreapta' ?", 'unealta',
  'îmbinarea cerută și pe o tăietură care nu e dreaptă')
o('K07', C, "    t.sort((x, y) => x - y);\n", '', 'unealta', 'trecerile neordonate (coardele inelului, greșite)')
# Interfața (e2e).
o('H01', U, "        ...(imCerut ? { imbinare: imCerut } : {}) };", "        };", 'e2e', 'unealta nu trimite îmbinarea')
o('H02', P, "      ...(im ? { imbinare: im } : {}),\n", '', 'e2e', 'panoul nu trimite îmbinarea')
o('H03', G, "value={o.imbinare} disabled={faraImbinare}", "value={o.imbinare} disabled={false}", 'e2e', 'alegerea modelului nu se mai stinge')
o('H04', G, "const faraImbinare = !o.inchide || !drept;", "const faraImbinare = !o.inchide;", 'e2e', 'îmbinarea nu se stinge pe tăieturile care nu sunt drepte')
o('H05', P, "const drept = fel === 'x' || fel === 'y' || fel === 'unghi' || fel === 'ghidaj';", "const drept = true;", 'e2e',
  'în panou, ultima formă aleasă trece drept tăietură dreaptă')
o('H06', P, "const desprel = im ? { dinti } : intre ? { fasie: intre.latime } : {};", "const desprel = intre ? { fasie: intre.latime } : {};", 'e2e',
  'dinții nu se arată în jurul liniei din panou')
o('H07', U, "      dinti = dintiAproximativi(A, u, corziAproximative(A, u, 0, l, deTaiat.regiuni), imb);\n", '', 'e2e', 'dinții nu se arată cât tragi')
o('H08', U, "const fasie = latimeFasie > 0 && !imb ? fasieAproximativa(cale, latimeFasie) : null;",
  "const fasie = latimeFasie > 0 ? fasieAproximativa(cale, latimeFasie) : null;", 'e2e', 'cu îmbinare, fâșia se arată și ea')
o('H09', U, "  if (im) {\n    activeOptiuni.push(t('editare.cutit.activ.imbinare', {", "  if (im && im.pas < 0) {\n    activeOptiuni.push(t('editare.cutit.activ.imbinare', {",
  'e2e', 'sfatul nu spune îmbinarea')
o('H10', G, "bun={(v) => marimeImbinareBuna(v, x === 'raza')}", "bun={(v) => marimeImbinareBuna(v)}", 'e2e', 'raza 0 se arată greșită')
o('H11', S, "raza: nr(m['raza'], IMBINARE_IMPLICITA.raza, true),", "raza: nr(m['raza'], IMBINARE_IMPLICITA.raza),", 'e2e',
  'raza 0, citită din browser, devine cea implicită')
o('H12', S, "(zero ? x >= 0 : x > 0) && x <= IMBINARE_MAXIMA", "x >= 0 && x <= IMBINARE_MAXIMA", 'e2e', 'pasul 0 e primit')
o('H14', U, "imCerut = imbinareDin(o, mod === 'linie')", "imCerut = imbinareDin(o, true)", 'e2e', 'la Liber, unealta trimite îmbinarea')

# Fișierele lângă Imprimanta și bifa Cuțitului înapoi în bară (schița din 09.11, „Ok la toate”). H13 (bucățile lăsate deschise,
# spuse în sfat) și H15 (butoanele de 38 px) au plecat odată cu codul lor.
A = 'src/ui/aranjament.ts'
L = 'src/ui/useEcranLat.ts'
X = 'src/app/App.tsx'
o('B01', A, "        id: 'fisier', fereastra: 'proiectare', ingust: 'sus',", "        id: 'fisier', fereastra: 'proiectare',", 'aranjament',
  'pe ecranul îngust, fișierele rămân în meniu')
o('B02', A, "  if (lat) return a.zone[zona];\n  return [", "  return a.zone[zona];\n  return [", 'aranjament', 'grupurile nu se mută niciodată')
o('B03', A, "      if (g.ingust !== undefined && (!cunoscut(ZONE, g.ingust) || g.ingust === z)) probleme.add(", "      if (false) probleme.add(",
  'aranjament', 'zona îngustă greșită (necunoscută sau a lui) nu se mai verifică')
o('B04', A, "      if (g.fereastra !== undefined && !a.ferestre.includes(g.fereastra)) probleme.add(", "      if (false) probleme.add(",
  'aranjament', 'fereastra unui grup, lipsă din aranjament, nu se mai verifică')
o('B05', A, "  for (const lat of [true, false]) for (const z of ZONE) {", "  for (const lat of [true]) for (const z of ZONE) {", 'aranjament',
  'dublurile de pe ecranul îngust nu se mai caută')
o('B06', X, "    if (g.fereastra !== undefined && g.fereastra !== fereastra) return null;\n", '', 'e2e', 'fișierele se văd și pe Mașina')
o('B07', L, "const LAT = '(min-width: 75.0625rem)';", "const LAT = '(min-width: 64rem)';", 'e2e', 'la 1024 px, fișierele urcă în meniu (pragul greșit)')
o('B08', U, "data-cutit=\"inchide\" onChange={(e) => { schimbaOptiuniTaiere({ inchide: e.target.checked }); }}",
  "data-cutit=\"inchide\" onChange={() => { schimbaOptiuniTaiere({}); }}", 'e2e',
  '„Închide bucățile” din bara Cuțitului nu mai schimbă opțiunile (debifată, închiderea rămâne pornită)')

SETURI = {
    'imbinare': ['test/unit/imbinare.test.ts', 'test/unit/taiere.imbinare.test.ts', 'test/unit/taiere.imbinare.oracol.test.ts'],
    'unealta': ['test/unit/cutitCalcul.test.ts'],
    'aranjament': ['test/unit/aranjament.test.ts'],
}
E2E = ['test/e2e/cutit.spec.ts', 'test/e2e/taiere.spec.ts', 'test/e2e/ancore.spec.ts', 'test/e2e/bara-fisiere.spec.ts']
