# Lista de otrăvuri a feliei 3.Cf-1 (alipirea la prinderi în vederea „Modelul” a atelierului Easy 3Draw; ADR 0284, partea
# D), 25.11.2026, alese de autor: motorul (transformările pieselor, piesa prinsă care urmează baza, lanțurile și cercurile,
# potrivirile, glisarea, locul de pe grilă al unei piese desprinse, cutia în lume, rotirea unei piese libere, prinderea
# rămasă după o schimbare în editor) și atelierul (legăturile din date, scena, punctele și numerele prinderilor, ținta,
# butoanele piesei prinse și ale celei libere, baza scoasă, „Înlocuiește în model”, modelul ținut).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: transformările
AP = 'return [q[0] + T.t[0], q[1] + T.t[1], q[2] + T.t[2]]; };'
o('M01', LG, AP, AP.replace('q[0] + T.t[0]', 'q[0] - T.t[0]'), 'alipire', 'mutarea pe x se scade')
o('M02', LG, AP, AP.replace('q[2] + T.t[2]', 'q[2]'), 'alipire', 'transformarea nu mai mută pe z')
CO = 'const compuneTransf = (A: Transf, B: Transf): Transf => ({ m: inmulteste(A.m, B.m), t: aplicaTransf(A, B.t) });'
o('M03', LG, CO, CO.replace('inmulteste(A.m, B.m)', 'inmulteste(B.m, A.m)'), 'alipire', 'compunerea înmulțește rotațiile invers')
o('M04', LG, CO, CO.replace('aplicaTransf(A, B.t)', 'aplicaTransf(B, A.t)'), 'alipire', 'compunerea mută invers')
SF = 'const SFERT = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;'
o('M05', LG, SF, SF.replace('[0, 1], [-1, 0], [0, -1]', '[0, -1], [-1, 0], [0, 1]'), 'alipire', 'sferturile de tură merg în sensul acelor')
TG = 'return { m: [c, -s, 0, s, c, 0, 0, 0, 1], t: [px - (c * u - s * v), py - (s * u + c * v), z * P.placa] };'
o('M06', LG, TG, TG.replace('m: [c, -s, 0, s, c, 0, 0, 0, 1]', 'm: [c, s, 0, -s, c, 0, 0, 0, 1]'), 'alipire', 'matricea de pe grilă e transpusă')
o('M07', LG, TG, TG.replace('px - (c * u - s * v)', 'px - (c * u + s * v)'), 'alipire', 'pivotul rotit, cu semnul greșit pe x')
o('M08', LG, TG, TG.replace('py - (s * u + c * v)', 'py - (c * v)'), 'alipire', 'pivotul rotit pierde partea de pe x')
o('M09', LG, TG, TG.replace('z * P.placa', 'z * P.pas'), 'alipire', 'z de pe grilă socotit în știfturi, nu în plăci')
RT = 'const [c, s] = SFERT[((Math.round(rot) % 4) + 4) % 4]!, [px, py] = pivotModel(a, x, y, rot), [u, v] = a.pivot;'
o('M10', LG, RT, RT.replace('SFERT[((Math.round(rot) % 4) + 4) % 4]!', 'SFERT[Math.abs(Math.round(rot)) % 4]!'), 'alipire', 'un sfert de tură înapoi e luat drept unul înainte')
TP = 'return { m: M.m, t: [M.t[0] + a.d[0] * g, M.t[1] + a.d[1] * g, M.t[2] + a.d[2] * g] };'
o('M11', LG, TP, TP.replace('M.t[2] + a.d[2] * g', 'M.t[2] - a.d[2] * g'), 'alipire', 'glisarea merge invers pe z')
o('M12', LG, TP, TP.replace('M.t[2] + a.d[2] * g', 'M.t[2] + g'), 'alipire', 'glisarea merge mereu în sus, nu de-a lungul prinderii')
TU = 'const u = Number.isFinite(+unghi) ? +unghi : 0, g = Number.isFinite(+alunec) ? +alunec : 0, M = montaj(a, b, u);'
o('M13', LG, TU, TU.replace('M = montaj(a, b, u)', 'M = montaj(a, b, 0)'), 'alipire', 'piesa prinsă nu se mai rotește în jurul prinderii')
o('M14', LG, TU, TU.replace('M = montaj(a, b, u)', 'M = montaj(a, b, -u)'), 'alipire', 'rotirea în jurul prinderii merge invers')
o('M15', LG, TU, TU.replace('g = Number.isFinite(+alunec) ? +alunec : 0', 'g = 0'), 'alipire', 'glisarea nu mai mută piesa')

# --- motorul: potrivirile și glisarea
PS = 'const c = Math.max(-1, Math.min(1, -scalar(a.d, b.d)));'
o('M16', LG, PS, PS.replace('-scalar(a.d, b.d)', 'scalar(a.d, b.d)'), 'alipire', 'întâi prinderile care întorc piesa cel mai mult')
o('M17', LG, '      if (!sePrind(a.fel, b.fel)) return;\n', '', 'alipire', 'se oferă și prinderile care nu se potrivesc')
SO = 'return out.sort((x, y) => x[0] - y[0] || x[1] - y[1]).map(x => x[1]);'
o('M18', LG, SO, SO.replace('x[0] - y[0] || x[1] - y[1]', 'x[1] - y[1]'), 'alipire', 'potrivirile, doar în ordinea piesei')
o('M19', LG, SO, SO.replace('x[0] - y[0] || x[1] - y[1]', 'x[0] - y[0] || y[1] - x[1]'), 'alipire', 'la același unghi, ultima prindere e prima')
SG = 'const seGliseaza = (a: string, b: string): boolean => sePrind(a, b) && ![a, b].some(f => f === "stift" || f === "bila");'
o('M20', LG, SG, SG.replace('f === "stift" || f === "bila"', 'f === "stift"'), 'alipire', 'bila în cupă glisează')
o('M21', LG, SG, SG.replace('f === "stift" || f === "bila"', 'f === "bila"'), 'alipire', 'știftul în locaș glisează')
o('M22', LG, SG, SG.replace('sePrind(a, b) && ', ''), 'alipire', 'glisează și perechile care nu se prind')

# --- motorul: așezările modelului
# (M23, „o piesă prinsă de ea însăși nu mai e oprită”, a ieșit echivalentă: un cerc de o piesă îl oprește lanțul; condiția
# a plecat din cod, iar proba cere în continuare piesa pe locul ei)
RA = 'if (Number.isInteger(q.a) && Number.isInteger(q.b) && a && b && sePrind(a.fel, b.fel)) {'
o('M24', LG, RA, RA.replace(' && sePrind(a.fel, b.fel)', ''), 'alipire', 'legătura cu prinderi care nu se potrivesc e ținută')
RC = 'if (!cerc.has(i)) r = { T: compuneTransf(baza.T, transfPrins(a, b, q.unghi, q.alunec)), fel: "prins" };'
o('M25', LG, RC, RC.replace('compuneTransf(baza.T, transfPrins(a, b, q.unghi, q.alunec))', 'transfPrins(a, b, q.unghi, q.alunec)'), 'alipire', 'piesa prinsă nu urmează baza')
o('M26', LG, RC, RC.replace('compuneTransf(baza.T, transfPrins(a, b, q.unghi, q.alunec))', 'compuneTransf(transfPrins(a, b, q.unghi, q.alunec), baza.T)'), 'alipire', 'baza și legătura, compuse invers')
o('M27', LG, RC, RC.replace('transfPrins(a, b, q.unghi, q.alunec)', 'transfPrins(a, b, 0, q.alunec)'), 'alipire', 'unghiul legăturii nu ajunge la așezare')
o('M28', LG, RC, RC.replace('transfPrins(a, b, q.unghi, q.alunec)', 'transfPrins(a, b, q.unghi, 0)'), 'alipire', 'glisarea legăturii nu ajunge la așezare')
o('M29', LG, RC, RC.replace('if (!cerc.has(i)) r = {', 'r = {'), 'alipire', 'o piesă dintr-un cerc rămâne prinsă')
CE = 'if (k >= 0) { for (const x of lant.slice(k)) cerc.add(x); cerc.add(i); } else {'
o('M30', LG, CE, CE.replace('for (const x of lant.slice(k)) cerc.add(x); cerc.add(i);', 'cerc.add(i);'), 'alipire', 'dintr-un cerc, doar piesa care îl închide cade pe locul ei')
PL = 'const peLoc = (p: PiesaModel) => (transfBuna(p.liber) ? { T: p.liber, fel: "liber" as const } : { T: p.grila, fel: "grila" as const });'
o('M31', LG, PL, PL.replace('transfBuna(p.liber) ?', 'false ?'), 'alipire', 'locul liber al unei piese nu mai e ținut')
o('M32', LG, PL, PL.replace('{ T: p.liber, fel: "liber" as const }', '{ T: p.grila, fel: "liber" as const }'), 'alipire', 'piesa liberă e pusă pe locul ei de pe grilă')

# --- motorul: locul de pe grilă al unei piese desprinse
AP6 = 'const aproape = (u: number, v: number) => Math.abs(u - v) < 1e-6;'
o('M33', LG, AP6, AP6.replace('< 1e-6', '< 2'), 'alipire', 'o piesă la 1 mm pe lângă e socotită pe grilă')
o('M34', LG, AP6, AP6.replace('< 1e-6', '< 1e-12'), 'alipire', 'zgomotul de virgulă mobilă scoate piesa de pe grilă')
GX = 'const x = (T.t[0] + (c * u - s * v)) / P.pas - w / 2, y = (T.t[1] + (s * u + c * v)) / P.pas - d / 2, z = T.t[2] / P.placa;'
o('M35', LG, GX, GX.replace('(T.t[0] + (c * u - s * v))', '(T.t[0] + (c * u + s * v))'), 'alipire', 'locul regăsit, cu semnul greșit la rotire')
o('M36', LG, GX, GX.replace('/ P.pas - w / 2', '/ P.pas - d / 2'), 'alipire', 'locul regăsit pe x, cu adâncimea amprentei')
o('M37', LG, GX, GX.replace('z = T.t[2] / P.placa', 'z = T.t[2] / P.pas'), 'alipire', 'z regăsit în știfturi, nu în plăci')
GR = 'return aproape(x * P.pas, xi * P.pas) && aproape(y * P.pas, yi * P.pas) && aproape(z * P.placa, zi * P.placa) ? { x: xi + 0, y: yi + 0, z: zi + 0, rot } : null;'
o('M38', LG, GR, GR.replace('aproape(x * P.pas, xi * P.pas) && ', ''), 'alipire', 'o piesă între știfturi pe x e socotită pe grilă')
o('M39', LG, GR, GR.replace('aproape(y * P.pas, yi * P.pas) && ', ''), 'alipire', 'o piesă între știfturi pe y e socotită pe grilă')
o('M40', LG, GR, GR.replace(' && aproape(z * P.placa, zi * P.placa)', ''), 'alipire', 'o piesă între plăci e socotită pe grilă')
o('M41', LG, GR, GR.replace('z: zi + 0, rot }', 'z: zi + 0, rot: 0 }'), 'alipire', 'rotirea regăsită e mereu zero')
GS = '      if (![c, -s, 0, s, c, 0, 0, 0, 1].every((v, k) => aproape(T.m[k]!, v))) continue;\n'
o('M42', LG, GS, GS.replace('.every((v, k) =>', '.slice(0, 5).every((v, k) =>'), 'alipire', 'o transformare cu ultimul rând stricat (o oglindire) e socotită piesă dreaptă')

# --- motorul: cutia în lume și rotirea unei piese libere
CU = 'const q = aplicaTransf(T, [k & 1 ? dim[0]! : 0, k & 2 ? dim[1]! : 0, k & 4 ? dim[2]! : 0]);'
o('M43', LG, CU, CU.replace('k & 1 ? dim[0]! : 0', 'dim[0]!'), 'alipire', 'cutia în lume ia doar colțurile din dreapta')
o('M44', LG, CU, CU.replace('k & 4 ? dim[2]! : 0', '0'), 'alipire', 'cutia în lume uită înălțimea piesei')
CM = 'for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, q[i]!); hi[i] = Math.max(hi[i]!, q[i]!); }'
o('M45', LG, CM, CM.replace('hi[i] = Math.max(hi[i]!, q[i]!)', 'hi[i] = Math.min(hi[i]!, q[i]!)'), 'alipire', 'colțul de sus al cutiei e un minim')
RL = 'return compuneTransf({ m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [cx + cy, cy - cx, 0] }, T);'
o('M46', LG, RL, RL.replace('t: [cx + cy, cy - cx, 0]', 't: [cx - cy, cy + cx, 0]'), 'alipire', 'rotirea piesei libere, în jurul altui punct')
o('M47', LG, RL, RL.replace('{ m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [cx + cy, cy - cx, 0] }', '{ m: [0, 1, 0, -1, 0, 0, 0, 0, 1], t: [cx - cy, cy + cx, 0] }'), 'alipire', 'piesa liberă se rotește în sensul acelor')
o('M48', LG, RL, 'return compuneTransf(T, { m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [cx + cy, cy - cx, 0] });', 'alipire', 'rotirea piesei libere, compusă invers')
RM = 'const [lo, hi] = cutieTransf(T, dim), cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2;'
o('M49', LG, RM, RM.replace('cx = (lo[0] + hi[0]) / 2', 'cx = lo[0]'), 'alipire', 'piesa liberă se rotește în jurul marginii cutiei')

# --- motorul: prinderea rămasă după o schimbare în editor
PR = 'if (n.fel !== veche.fel || scalar(n.d, veche.d) < 1 - 1e-9) return;'
o('M50', LG, PR, PR.replace('n.fel !== veche.fel || ', ''), 'alipire', 'o prindere de alt fel îi ține locul')
o('M51', LG, PR, PR.replace('scalar(n.d, veche.d) < 1 - 1e-9', 'Math.abs(scalar(n.d, veche.d)) < 1 - 1e-9'), 'alipire', 'gura de jos a găurii ține locul celei de sus')
PG = 'if (lat < 0.01 && Math.abs(lung) < cel) { cel = Math.abs(lung); gasit = j; }'
o('M52', LG, PG, PG.replace('lat < 0.01', 'lat < 1'), 'alipire', 'o prindere la 0,5 mm pe lângă e socotită aceeași')
o('M53', LG, PG, 'if (lat < 0.01) { gasit = j; }', 'alipire', 'dintre prinderile de pe aceeași axă, ultima, nu cea mai apropiată')
PD = 'const lat = Math.hypot(dp[0] - lung * veche.d[0], dp[1] - lung * veche.d[1], dp[2] - lung * veche.d[2]);'
o('M54', LG, PD, PD.replace('dp[2] - lung * veche.d[2]', 'dp[2]'), 'alipire', 'știftul coborât (cărămida devenită placă) nu mai e același')

# --- atelierul: așezările și legăturile din date
AS = 'if (c) piese.push({ id: m.id, grila: Lego.transfGrila(c, m.x, m.y, m.z, m.rot), prinderi: c.prinderi, prins: m.prins ?? null, liber: m.liber ?? null });'
o('A01', AT, AS, AS.replace('prins: m.prins ?? null', 'prins: null'), 'e2e', 'legăturile nu ajung la motor: nicio piesă nu e prinsă')
o('A02', AT, AS, AS.replace('liber: m.liber ?? null', 'liber: null'), 'e2e', 'locul liber nu ajunge la motor')
LP = 'if (g) { m.x = g.x; m.y = g.y; m.z = g.z; m.rot = g.rot; } else m.liber = { m: [...T.m], t: [T.t[0], T.t[1], T.t[2]] };'
o('A03', AT, LP, LP.replace('if (g) {', 'if (g && !g) {'), 'e2e', 'o piesă desprinsă rămâne liberă și când stă drept pe grilă')
o('A04', AT, LP, LP.replace('m.rot = g.rot;', 'm.rot = 0;'), 'e2e', 'piesa desprinsă pe grilă își pierde rotirea')
o('A05', AT, LP, LP.replace('m.z = g.z;', ''), 'e2e', 'piesa desprinsă pe grilă își ține z-ul vechi')
o('A06', AT, LP, LP.replace('t: [T.t[0], T.t[1], T.t[2]] }', 't: [T.t[0], T.t[1], 0] }'), 'e2e', 'piesa lăsată liberă cade la z 0')
o('A07', AT, '    delete m.prins; delete m.liber;\n    if (g) {', '    delete m.liber;\n    if (g) {', 'e2e', 'piesa desprinsă își ține legătura')
SC = 'if (a && a.fel === "prins") lasaPeLoc(x, a.T); else delete x.prins;'
o('A08', AT, SC, 'delete x.prins;', 'e2e', 'baza scoasă: piesele ei cad pe locul ținut, nu rămân unde erau')
o('A09', AT, '      if (!x.prins || x.prins.de !== id) continue;\n      const a = A.get(x.id);', '      if (!x.prins) continue;\n      const a = A.get(x.id);', 'e2e', 'o piesă scoasă desprinde toate piesele prinse, nu doar pe ale ei')

# --- atelierul: numele și numerele prinderilor, ținta
NF = 'fel === "capatAx" ? (cate === 1 ? tr("capăt de ax") : tr("capete de ax")) : NUME_PRINDERI[fel]!()[cate === 1 ? 0 : 1];'
o('A10', AT, NF, NF.replace('fel === "capatAx" ?', 'fel === "capatAxx" ?'), 'e2e', 'capătul unui ax e numit „ax”')
NR = 'const nrPrindere = (pr: readonly Prindere[], k: number) => pr.slice(0, k + 1).filter(p => p.fel === pr[k]!.fel).length;'
o('A11', AT, NR, NR.replace('pr.slice(0, k + 1).filter(p => p.fel === pr[k]!.fel).length', 'k + 1'), 'e2e', 'prinderile, numerotate toate la un loc, nu pe feluri')
o('A12', AT, NR, NR.replace('pr.slice(0, k + 1)', 'pr.slice(0, k)'), 'e2e', 'numărul prinderii începe de la zero')
TT = 'tintaM = tintaM && tintaM.id === alesM && tintaM.k === k ? null : alesM ? { id: alesM, k } : null;'
o('A13', AT, TT, TT.replace('tintaM && tintaM.id === alesM && tintaM.k === k ? null : ', ''), 'e2e', 'al doilea clic pe țintă nu o mai scoate')
AM = 'const alegeM = (id: string | null) => { if (id !== alesM) tintaM = null; alesM = id; };'
o('A14', AT, AM, AM.replace('if (id !== alesM) tintaM = null; ', ''), 'e2e', 'ținta rămâne după ce e aleasă altă piesă')
BM = ': tintaBuna() ? "Alipește în model" : "Pune în model";'
o('A15', AT, BM, ': "Pune în model";', 'e2e', 'butonul piesei nu spune că are o țintă')

# --- atelierul: scena și punctele
MX = 'mesh.applyMatrix4(new T.Matrix4().set(r[0]!, r[1]!, r[2]!, t[0], r[3]!, r[4]!, r[5]!, t[1], r[6]!, r[7]!, r[8]!, t[2], 0, 0, 0, 1));'
o('A16', AT, MX, MX.replace('r[3]!, r[4]!, r[5]!, t[1]', 'r[3]!, r[4]!, r[5]!, t[0]'), 'e2e', 'piesele, mutate pe y cu mutarea de pe x')
o('A17', AT, MX, MX.replace('r[0]!, r[1]!, r[2]!, t[0], r[3]!, r[4]!, r[5]!, t[1], r[6]!, r[7]!, r[8]!, t[2]', 'r[0]!, r[3]!, r[6]!, t[0], r[1]!, r[4]!, r[7]!, t[1], r[2]!, r[5]!, r[8]!, t[2]'), 'e2e', 'rotația din scenă e transpusă')
PU = 'const punct = v3.puncte && alesM ? rc.intersectObjects(v3.puncte.children, false)[0] : undefined;'
o('A18', AT, PU, PU.replace('v3.puncte && alesM ?', 'v3.puncte && !alesM ?'), 'e2e', 'punctele prinderilor nu se mai pot atinge')
SP = 'v3.geomPunct = new T.SphereGeometry(1.3, 14, 10); v3.geomContur = new T.SphereGeometry(1.7, 14, 10);'
o('A19', AT, SP, SP.replace('(1.3, 14, 10)', '(0.05, 14, 10)').replace('(1.7, 14, 10)', '(0.07, 14, 10)'), 'e2e', 'punctele sunt prea mici ca să fie atinse')
PQ = 'const q = Lego.aplicaTransf(a.T, p.p), eTinta = !!tinta && tinta.k === k;'
o('A20', AT, PQ, PQ.replace('Lego.aplicaTransf(a.T, p.p)', 'p.p'), 'e2e', 'punctele stau la locul din piesă, nu la cel din lume')
PK = 's.position.set(q[0], q[1], q[2]); s.renderOrder = ordine; s.userData.k = k;'
o('A21', AT, PK, PK.replace('s.userData.k = k;', 's.userData.k = 0;'), 'e2e', 'orice punct atins alege prima prindere')
o('A22', AT, PK, PK.replace('s.position.set(q[0], q[1], q[2]);', 's.position.set(q[0], q[1], q[2] + 30);'), 'e2e', 'punctele plutesc la 30 mm deasupra prinderilor')

# --- atelierul: rândul și butoanele piesei alese
UN = 'unde = tr`prinsă de ${titluM(baza)} (${numePrindere(c.prinderi, q.b)} ↔ ${numePrindere(cb.prinderi, q.a)})` + (q.unghi ? tr` · rotită ${q.unghi}°` : "") + (q.alunec ? tr` · glisată ${fmt(q.alunec)} mm` : "");'
o('A23', AT, UN, UN.replace('(${numePrindere(c.prinderi, q.b)} ↔ ${numePrindere(cb.prinderi, q.a)})', '(${numePrindere(cb.prinderi, q.a)} ↔ ${numePrindere(c.prinderi, q.b)})'), 'e2e', 'rândul piesei prinse spune prinderile invers')
o('A24', AT, UN, UN.replace(' + (q.unghi ? tr` · rotită ${q.unghi}°` : "")', ''), 'e2e', 'rândul piesei prinse nu spune rotirea')
o('A25', AT, UN, UN.replace(' + (q.alunec ? tr` · glisată ${fmt(q.alunec)} mm` : "")', ''), 'e2e', 'rândul piesei prinse nu spune glisarea')
o('A26', AT, UN, UN.replace('${titluM(baza)}', '${titluM(m)}'), 'e2e', 'rândul piesei prinse numește piesa însăși, nu baza')
MB = '(Lego.potriviriPrindere(pa, c.prinderi).length > 1 ? `<button class="btn" type="button" data-m="pb">Altă prindere</button>` : "")'
o('A27', AT, MB, MB.replace('.length > 1 ?', '.length > 99 ?'), 'e2e', 'piesa prinsă nu-și mai poate schimba prinderea')
MG = '+ (Lego.seGliseaza(pa.fel, pb.fel) ? `<button class="btn" type="button" data-m="pg-">Glisează −</button>'
o('A28', AT, MG, MG.replace('(Lego.seGliseaza(pa.fel, pb.fel) ?', '(pa && pb ?'), 'e2e', 'și știftul în locaș are butoanele de glisare')
o('A29', AT, MG, MG.replace('(Lego.seGliseaza(pa.fel, pb.fel) ?', '(!pa ?'), 'e2e', 'axul nu are butoanele de glisare')
UL = 'const [lo] = Lego.cutieTransf(A.get(m.id)!.T, c.dim);'
o('A30', AT, UL, UL.replace('const [lo] =', 'const [, lo] ='), 'e2e', 'piesa liberă își spune colțul de sus al cutiei')
LM = 'return f === "prins" ? tr("prinsă") : f === "liber" ? tr("liberă") :'
o('A31', AT, LM, LM.replace('f === "prins" ? tr("prinsă") : f === "liber" ? tr("liberă") :', 'f === "prins" ? tr("liberă") : f === "liber" ? tr("prinsă") :'), 'e2e', 'în listă, „prinsă” și „liberă” sunt schimbate între ele')
o('A32', AT, LM, LM.replace('f === "liber" ? tr("liberă") :', ''), 'e2e', 'o piesă liberă e arătată în listă cu locul de pe grilă')
CH = 'aria-pressed="${!!tinta && tinta.k === k}" aria-label="${numePrindere(pr, k)}">${nrPrindere(pr, k)}</button>'
o('A33', AT, CH, CH.replace('${!!tinta && tinta.k === k}', 'false'), 'e2e', 'numărul prinderii-țintă nu e marcat')
o('A34', AT, CH, CH.replace('aria-label="${numePrindere(pr, k)}"', 'aria-label="${k}"'), 'e2e', 'numărul prinderii nu-și spune numele')
TI = '${tinta ? `<p class="mic" id="at-m-tinta">'
o('A35', AT, TI, TI.replace('${tinta ?', '${tinta && !tinta ?'), 'e2e', 'rândul țintei nu se mai arată')
FE = 'felM = m ? fel(m) : "grila", axM = m && felM === "grila" ? stiftAx(m) : null;'
o('A36', AT, FE, FE.replace('felM = m ? fel(m) : "grila"', 'felM = "grila"'), 'e2e', 'piesa aleasă e arătată mereu ca una de pe grilă')

# --- atelierul: dublarea
DU = 'if (felM === "grila" || !T) { delete copie.prins; delete copie.liber; copie.x = m.x + 1; } else lasaPeLoc(copie, { m: T.m, t: [T.t[0] + 8, T.t[1], T.t[2]] });'
o('A37', AT, DU, DU.replace('if (felM === "grila" || !T) {', 'if (felM || !T) {'), 'e2e', 'copia unei piese prinse stă lângă locul ținut, nu lângă piesă')
o('A38', AT, DU, DU.replace('T.t[0] + 8', 'T.t[0] + 16'), 'e2e', 'copia unei piese prinse stă cu doi știfturi mai la dreapta')
o('A39', AT, DU, DU.replace('lasaPeLoc(copie, { m: T.m, t: [T.t[0] + 8, T.t[1], T.t[2]] })', 'copie.x = m.x'), 'e2e', 'copia unei piese prinse rămâne prinsă, peste ea')

# --- atelierul: mutările piesei prinse
o('A40', AT, 'if (op === "pr" || op === "r") q.unghi = (q.unghi + 90) % 360;', 'if (op === "pr" || op === "r") q.unghi = (q.unghi + 180) % 360;', 'e2e', 'rotirea în jurul prinderii merge cu o jumătate de tură')
o('A41', AT, 'if (op === "pr" || op === "r") q.unghi = (q.unghi + 90) % 360;', 'if (op === "pr" || op === "r") q.unghi = q.unghi + 90;', 'e2e', 'unghiul legăturii trece de o tură')
o('A42', AT, 'if (op === "pr" || op === "r") q.unghi = (q.unghi + 90) % 360;', 'if (op === "pr") q.unghi = (q.unghi + 90) % 360;', 'e2e', 'tasta R nu rotește piesa prinsă')
AB = 'q.b = l[(l.indexOf(q.b) + 1) % l.length]!;'
o('A43', AT, AB, 'q.b = l[0]!;', 'e2e', '„Altă prindere” rămâne pe prima')
o('A44', AT, AB, 'q.b = l[(l.indexOf(q.b) + 2) % l.length]!;', 'e2e', '„Altă prindere” sare peste una')
GL = 'q.alunec = Math.max(-200, Math.min(200, q.alunec + (op === "pg+" ? 4 : -4)));'
o('A45', AT, GL, GL.replace('(op === "pg+" ? 4 : -4)', '(op === "pg+" ? -4 : 4)'), 'e2e', 'glisarea merge invers')
o('A46', AT, GL, GL.replace('(op === "pg+" ? 4 : -4)', '(op === "pg+" ? 8 : -8)'), 'e2e', 'glisarea merge câte 8 mm')
o('A47', AT, 'else if (op === "pd") lasaPeLoc(m, a.T);', 'else if (op === "pd") lasaPeLoc(m, { m: a.T.m, t: [0, 0, 0] });', 'e2e', 'piesa desprinsă sare în origine')
o('A48', AT, 'else if (op === "pd") lasaPeLoc(m, a.T);', 'else if (op === "pd") delete m.prins;', 'e2e', 'piesa desprinsă cade pe locul ținut')

# --- atelierul: „Alt loc pe bază”
LB = 'const locuriBaza = (baza: readonly Prindere[], b: Prindere) => baza.map((p, k) => (Lego.sePrind(p.fel, b.fel) ? k : -1)).filter(k => k >= 0);'
o('A72', AT, LB, LB.replace('(Lego.sePrind(p.fel, b.fel) ? k : -1)', 'k'), 'e2e', 'locurile de pe bază cuprind și prinderile care nu se potrivesc')
AA = 'q.a = l[(l.indexOf(q.a) + 1) % l.length]!;'
o('A73', AT, AA, 'q.a = l[0]!;', 'e2e', '„Alt loc pe bază” duce mereu pe primul loc')
o('A74', AT, AA, 'q.a = l[(l.indexOf(q.a) + l.length - 1) % l.length]!;', 'e2e', '„Alt loc pe bază” merge înapoi')
MA = '(locuriBaza(cb.prinderi, pb).length > 1 ? `<button class="btn" type="button" data-m="pa">Alt loc pe bază</button>` : "")'
o('A75', AT, MA, MA.replace('.length > 1 ?', '.length > 99 ?'), 'e2e', 'piesa prinsă nu se mai poate muta pe alt loc al bazei')

# --- atelierul: mutările piesei libere
PA = '({ "x-": [-8, 0, 0], "x+": [8, 0, 0], "y-": [0, -8, 0], "y+": [0, 8, 0], "z-": [0, 0, -3.2], "z+": [0, 0, 3.2] } as Record<string, number[]>)[op];'
o('A49', AT, PA, PA.replace('"x+": [8, 0, 0]', '"x+": [4, 0, 0]'), 'e2e', 'piesa liberă se mută cu 4 mm pe x')
o('A50', AT, PA, PA.replace('"y+": [0, 8, 0]', '"y+": [0, -8, 0]'), 'e2e', 'piesa liberă merge invers pe y')
o('A51', AT, PA, PA.replace('"z-": [0, 0, -3.2]', '"z-": [0, 0, -8]'), 'e2e', 'piesa liberă coboară cu 8 mm, nu cu o placă')
o('A52', AT, PA, PA.replace('"x-": [-8, 0, 0]', '"x-": [0, -8, 0]'), 'e2e', 'săgeata spre stânga mută piesa liberă pe y')
o('A53', AT, 'else if (op === "r") lasaPeLoc(m, Lego.rotitLiber(a.T, c.dim));', 'else if (op === "r") lasaPeLoc(m, a.T);', 'e2e', 'piesa liberă nu se rotește')

# --- atelierul: „Înlocuiește în model”
IK = 'const ax = A.get(x.id), pa = a.prinderi[x.prins.a], k = pa ? Lego.prindereaRamasa(pa, b.prinderi) : -1;'
o('A54', AT, IK, IK.replace('k = pa ? Lego.prindereaRamasa(pa, b.prinderi) : -1', 'k = pa && b.prinderi[x.prins.a] ? x.prins.a : -1'), 'e2e', 'legătura ține numărul prinderii, nu locul ei')
o('A55', AT, '      if (k >= 0) x.prins.a = k;\n', '      if (k >= 0) continue;\n', 'e2e', 'numărul nou al prinderii rămase nu e ținut')
o('A56', AT, '      else if (ax && ax.fel === "prins") lasaPeLoc(x, ax.T);\n      else delete x.prins;', '      else delete x.prins;', 'e2e', 'baza schimbată: piesa fără prindere cade pe locul ținut')
IP = 'if (k >= 0) q.b = k; else lasaPeLoc(vechi, A.get(vechi.id)!.T);'
o('A57', AT, IP, 'lasaPeLoc(vechi, A.get(vechi.id)!.T);', 'e2e', 'piesa prinsă, schimbată în editor, se desprinde mereu')

# --- atelierul: „Alipește în model” și locul de lângă o piesă prinsă sau liberă
PM = 'if (j !== undefined) m.prins = { de: sel.id, a: tinta.k, b: j, unghi: 0, alunec: 0 };'
o('A58', AT, PM, PM.replace('a: tinta.k', 'a: 0'), 'e2e', 'piesa se alipește mereu pe prima prindere a bazei')
o('A59', AT, PM, PM.replace('b: j,', 'b: 0,'), 'e2e', 'piesa se alipește mereu cu prima ei prindere')
o('A60', AT, PM, PM.replace('unghi: 0,', 'unghi: 90,'), 'e2e', 'piesa alipită vine rotită')
PJ = 'const j = Lego.potriviriPrindere(tinta.p, b.prinderi)[0];'
o('A61', AT, PJ, PJ.replace(')[0];', ')[1];'), 'e2e', 'piesa se alipește cu a doua prindere potrivită')
o('A62', AT, 'else toast(tr`${numeDef(curent.def)} nu are nicio prindere pentru ${numeFelM(tinta.p.fel)}: piesa stă deasupra, nealipită.`);', '', 'e2e', 'fără prindere potrivită, piesa se pune fără niciun mesaj')
o('A63', AT, '      model.push(m); alegeM(m.id);\n', '      model.push(m);\n', 'e2e', 'piesa nouă nu e aleasă (ținta rămâne)')
ZS = 'm.z = Math.max(-60, Math.min(200, Math.ceil(hi[2] / 3.2 - 1e-6)));'
o('A64', AT, ZS, ZS.replace('Math.ceil(hi[2] / 3.2 - 1e-6)', 'Math.floor(hi[2] / 3.2)'), 'e2e', 'piesa pusă lângă una liberă intră în ea, cu o placă mai jos')
XS = '[m.x, m.y] = b ? Lego.langaPivot(b, 0, [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]) : [Math.round(lo[0] / 8), Math.round(lo[1] / 8)];'
o('A65', AT, XS, XS.replace('[(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]', '[lo[0], lo[1]]'), 'e2e', 'piesa pusă lângă una liberă stă după colțul cutiei, nu după mijloc')
o('A66', AT, 'if (as && a && as.fel !== "grila") {', 'if (as && a && as.fel === "nimic") {', 'e2e', 'piesa pusă lângă una liberă stă după locul ei ținut')

# --- atelierul: tastele și modelul ținut
o('A67', AT, '{ ev.preventDefault(); scoateM(alesM); dupaModel(); }', '{ ev.preventDefault(); model = model.filter(x => x.id !== alesM); alegeM(null); dupaModel(); }', 'e2e', 'tasta Delete scoate baza fără să lase piesele ei pe loc')
IN = 'm.prins = { de: q.de, a: q.a!, b: q.b!, unghi: Number.isFinite(q.unghi) ? ((q.unghi! % 360) + 360) % 360 : 0,'
o('A68', AT, IN, IN.replace('a: q.a!, b: q.b!', 'a: q.b!, b: q.a!'), 'e2e', 'legătura ținută e citită cu prinderile schimbate între ele')
o('A69', AT, IN, IN.replace('((q.unghi! % 360) + 360) % 360', 'q.unghi!'), 'e2e', 'unghiul ținut nu e adus într-o tură')
o('A70', AT, IN, IN.replace('Number.isFinite(q.unghi) ? ((q.unghi! % 360) + 360) % 360 : 0', '0'), 'e2e', 'unghiul ținut se pierde la redeschidere')
IV = 'if (q && typeof q === "object" && typeof q.de === "string" && Number.isInteger(q.a) && q.a! >= 0 && Number.isInteger(q.b) && q.b! >= 0)'
o('A71', AT, IV, 'if (q && !q)', 'e2e', 'legăturile ținute nu se mai citesc')

# --- textele
T1 = 'Prinderile ei. Alege una, apoi pune piesa următoare: se alipește acolo.'
o('T01', AT, T1, T1.replace('se alipește acolo', 'se prinde acolo'), 'texte', 'textul prinderilor, schimbat fără traducerea lui')
o('T02', EN, ' "Altă prindere": "Other connection",', ' "Altă prindere": "",', 'texte', '„Altă prindere”, fără traducere')
o('T03', EN, ' "liberă, colțul cutiei la {0}, {1}, {2} mm": "free, box corner at {0}, {1}, {2} mm",', ' "liberă, colțul cutiei la {0}, {1}, {2} mm": "free, box corner at {0}, {1} mm",', 'texte', 'traducerea pierde o valoare')
o('T04', AT, 'tr`prinsă de ${titluM(baza)} (', 'tr`prinsă la ${titluM(baza)} (', 'texte', 'rândul piesei prinse, cu alt text decât cel tradus')

SETURI = {
    'alipire': ['test/unit/trenulet.alipire.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.alipire.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
