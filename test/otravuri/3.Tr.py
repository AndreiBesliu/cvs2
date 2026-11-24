# Lista de otrăvuri a feliei 3.Tr (elicea de barcă în atelierul Easy 3Draw, ADR 0282), 23.11.2026, alese de autor: cotele din
# parametri (`eliceBarcaCote`: implicitele, marginile plajei, butucul, grosimea la rădăcină, unghiul paletei, consola, cât din
# disc acoperă paletele), secțiunea ogivală (`sectiuneBarca`: fața plată, spatele, muchiile, punctele corzii), paleta
# (stațiile, rădăcina din butuc, conturul „ureche”, coarda cea mai mică la vârf, garda vârfului, limita de 85 % din pasul
# dintre palete, muchia de jos pe masă, înclinarea înapoi), butucul (cât paletele, cel puțin un știft), capacul rotunjit,
# plasa (capetele închise ca fâșie, sensul), avertismentele; atelierul (galeria, implicitele editorului, numele piesei,
# textul, „Repede”, alegerile, câmpurile cu plaja și rotunjirea lor, „Fă perechea”), pictograma și traducerea. Textele fără
# diacritice rămase în română se văd doar în cvs2, în engleză: lista lor e `3.Tr-en.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit; setul „e2e” e
# `test/e2e/trenulet.barca.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Lăsate afară, ca echivalente (cu motivul; cele rulate, cu rezultatul lor, în registrul `docs/otravuri.md`):
# - `c = Math.max(t, c * U / latime(sec) * 0.995)` fără `Math.max(t, …)`: cu cel mult 5 palete, pasul dintre ele la rădăcină
#   e cel puțin 0,85 · 2π · 3,6 / 5 = 3,85 mm, iar secțiunea cu coarda cât grosimea e lată de cel mult 3 · √2 pe butucul mare
#   (r 10,4, pasul 11,1) și de 1,76 · √2 pe cel de Ø8: coarda nu ajunge la grosime (garda rămâne, pentru o plajă mai largă);
# - aceeași linie fără `* 0.995`: lățimea coboară spre limită de deasupra, cu rația (grosimea pe cerc) / lățime, sub 0,2: după
#   40 de pași, depășirea e sub 1e-25 mm (nimic de măsurat);
# - `Math.ceil(… * 10 - 1e-9)` fără `- 1e-9`: contează doar când cea mai înaltă secțiune iese, din rotunjire, cu un fir peste
#   o zecime întreagă.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = '  const BARCA = { butucMin: 4, butucRap: 0.09, butucH: 8, tRap: 0.04, tMin: 1.6, tMax: 3, tVarf: 0.8, muchie: 0.6, plin: 0.6, radacina: 0.6, umplere: 0.85, statii: 28, perSuprafata: 12, capac: 1.2, inele: 6, pupaMax: 15 };'

# Cotele din parametri: `eliceBarcaCote` (unitare).
Z = 'const z = Math.round(Math.min(5, Math.max(3, nr(d.palete, 3))));'
o('C01', E, Z, Z.replace('nr(d.palete, 3)', 'nr(d.palete, 4)'), 'barca', 'elicea de barcă implicită cu 4 palete')
o('C02', E, Z, Z.replace('Math.min(5,', 'Math.min(6,'), 'barca', '6 palete')
o('C03', E, Z, Z.replace('Math.max(3,', 'Math.max(2,'), 'barca', '2 palete')
o('C04', E, Z, Z.replace('Math.round(', 'Math.floor('), 'barca', 'paletele tăiate la întreg, nu rotunjite')
D = 'const D = Math.min(120, Math.max(20, nr(d.diametru, 40))), R = D / 2;'
o('C05', E, D, D.replace('nr(d.diametru, 40)', 'nr(d.diametru, 48)'), 'barca', 'diametrul implicit, 48')
o('C06', E, D, D.replace('Math.min(120,', 'Math.min(150,'), 'barca', 'diametrul până la 150')
o('C07', E, D, D.replace('Math.max(20,', 'Math.max(10,'), 'barca', 'diametrul de la 10 (palete de 1 mm pe butucul Ø8)')
P = 'const pd = Math.min(1.6, Math.max(0.5, nr(d.pas, 1))), P = pd * D;'
o('C08', E, P, P.replace('nr(d.pas, 1)', 'nr(d.pas, 0.9)'), 'barca', 'pasul implicit, 0,9')
o('C09', E, P, P.replace('Math.min(1.6,', 'Math.min(2,'), 'barca', 'pasul până la 2')
o('C10', E, P, P.replace('Math.max(0.5,', 'Math.max(0.3,'), 'barca', 'pasul de la 0,3 (paleta culcată)')
o('C11', E, P, P.replace('P = pd * D;', 'P = pd * R;'), 'barca', 'pasul față de rază, nu față de diametru')
LI = 'const lat = Math.min(150, Math.max(40, nr(d.latime, 100))), inc = Math.min(40, Math.max(0, nr(d.inclinare, 20)));'
o('C12', E, LI, LI.replace('nr(d.latime, 100)', 'nr(d.latime, 85)'), 'barca', 'lățimea implicită, 85 %')
o('C13', E, LI, LI.replace('Math.min(150,', 'Math.min(200,'), 'barca', 'lățimea până la 200 %')
o('C14', E, LI, LI.replace('Math.max(40,', 'Math.max(20,'), 'barca', 'lățimea de la 20 %')
o('C15', E, LI, LI.replace('nr(d.inclinare, 20)', 'nr(d.inclinare, 15)'), 'barca', 'înclinarea implicită, 15°')
o('C16', E, LI, LI.replace('inc = Math.min(40,', 'inc = Math.min(60,'), 'barca', 'înclinarea până la 60°')
o('C17', E, LI, LI.replace('Math.max(0, nr(d.inclinare', 'Math.max(-10, nr(d.inclinare'), 'barca', 'înclinarea și înainte (negativă)')
RH = 'const rh = Math.max(BARCA.butucMin, Math.round(BARCA.butucRap * D * 10) / 10), r0 = rh - 0.4;'
o('C18', E, RH, RH.replace('Math.round(BARCA.butucRap * D * 10) / 10', 'BARCA.butucRap * D'), 'barca', 'raza butucului, nerotunjită la zecime')
o('C19', E, K, K.replace('butucRap: 0.09,', 'butucRap: 0.1,'), 'barca', 'butucul, 20 % din diametru')
o('C20', E, K, K.replace('butucMin: 4,', 'butucMin: 3,'), 'barca', 'butucul de Ø6 (gaura de ax nu mai are perete)')
o('C21', E, RH, RH.replace('r0 = rh - 0.4;', 'r0 = rh - 0.2;'), 'barca', 'rădăcina paletei, doar 0,2 mm în butuc')
o('C22', E, K, K.replace('tRap: 0.04,', 'tRap: 0.05,'), 'barca', 'rădăcina, groasă de 5 % din diametru')
o('C23', E, K, K.replace('tMin: 1.6,', 'tMin: 1.2,'), 'barca', 'rădăcina cea mai subțire, 1,2')
o('C24', E, K, K.replace('tMax: 3,', 'tMax: 4,'), 'barca', 'rădăcina cea mai groasă, 4')
B = 'const beta = (r: number) => Math.atan(P / (2 * Math.PI * r));'
o('C25', E, B, B.replace('(2 * Math.PI * r)', '(Math.PI * r)'), 'barca', 'unghiul paletei din pasul pe jumătate de tură')
CO = 'bRad: beta(rh), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)), acoperire: z * arie / (Math.PI * R * R) };'
o('C26', E, CO, CO.replace('consola: 0.2 /', 'consola: 0.3 /'), 'barca', 'consola, pe strat de 0,3')
o('C27', E, CO, CO.replace('bRad: beta(rh),', 'bRad: beta(r0),'), 'barca', 'unghiul de la butuc, luat la rădăcina din butuc')
o('C28', E, CO, CO.replace('bVarf: beta(R),', 'bVarf: beta(0.7 * R),'), 'barca', 'unghiul „de la vârf”, luat la 70 % din rază')
o('C29', E, CO, CO.replace('consola: 0.2 / Math.tan(beta(R))', 'consola: 0.2 / Math.tan(beta(rh))'), 'barca', 'consola, socotită la butuc')

# Secțiunea ogivală: `sectiuneBarca` (unitare).
S = 'sus.push([x * c, 0]); jos.push([x * c, -(BARCA.muchie + (t - BARCA.muchie) * 4 * x * (1 - x))]);'
o('S01', E, S, S.replace('sus.push([x * c, 0]);', 'sus.push([x * c, 0.2 * 4 * x * (1 - x)]);'), 'barca', 'fața de sus, bombată (nu plată)')
o('S02', E, S, 'sus.push([x * c, BARCA.muchie + (t - BARCA.muchie) * 4 * x * (1 - x)]); jos.push([x * c, 0]);', 'barca', 'secțiunea întoarsă: fața plată jos, spatele sus')
o('S03', E, K, K.replace('muchie: 0.6,', 'muchie: 0.3,'), 'barca', 'muchiile de 0,3 (sub o linie de duză)')
o('S04', E, S, S.replace('* 4 * x * (1 - x))]);', '* 2 * x * (1 - x))]);'), 'barca', 'spatele, bombat pe jumătate (grosimea la mijloc, prea mică)')
o('S05', E, K, K.replace('perSuprafata: 12,', 'perSuprafata: 8,'), 'barca', 'secțiunea din 9 puncte pe față')
SX = 'const x = 0.5 - 0.5 * Math.cos(Math.PI * i / M);\n      sus.push([x * c, 0]);'
o('S06', E, SX, SX.replace('const x = 0.5 - 0.5 * Math.cos(Math.PI * i / M);', 'const x = i / M;'), 'barca', 'punctele corzii, la distanțe egale (nu pe cosinus)')
o('S07', E, S, S.replace('-(BARCA.muchie + (t - BARCA.muchie)', '-(BARCA.muchie + (t + BARCA.muchie)'), 'barca', 'grosimea la mijloc, cu două muchii în plus')

# Paleta: stațiile, conturul, limita, masa, înclinarea (unitare).
o('P01', E, K, K.replace('statii: 28,', 'statii: 20,'), 'barca', 'paleta din 20 de stații')
X = 'x = Math.max(0, (r - rh) / (R - rh)), b = beta(r);\n      const g = x <= BARCA.plin'
o('P02', E, X, X.replace('(r - rh) / (R - rh)', '(r - r0) / (R - r0)'), 'barca', 'locul pe paletă, socotit de la rădăcina din butuc')
o('P03', E, K, K.replace('plin: 0.6,', 'plin: 0.5,'), 'barca', 'coarda cea mai mare, la jumătatea paletei')
o('P04', E, K, K.replace('radacina: 0.6,', 'radacina: 0.8,'), 'barca', 'rădăcina lată de 80 %')
G1 = 'Math.sqrt(1 - (1 - BARCA.radacina ** 2) * ((BARCA.plin - x) / BARCA.plin) ** 2)'
o('P05', E, G1, 'BARCA.radacina + (1 - BARCA.radacina) * x / BARCA.plin', 'barca', 'conturul de la rădăcină, drept (nu eliptic)')
G2 = 'Math.sqrt(Math.max(0, 1 - ((x - BARCA.plin) / (1 - BARCA.plin)) ** 2));\n      const t = tRad'
o('P06', E, G2, G2.replace('Math.sqrt(Math.max(0, 1 - ((x - BARCA.plin) / (1 - BARCA.plin)) ** 2));', 'Math.max(0, 1 - ((x - BARCA.plin) / (1 - BARCA.plin)) ** 2);'), 'barca', 'conturul spre vârf, parabolic (nu eliptic)')
o('P07', E, G2, G2.replace('Math.sqrt(Math.max(0, 1 - ((x - BARCA.plin) / (1 - BARCA.plin)) ** 2));', 'Math.sqrt(1 - ((x - BARCA.plin) / (1 - BARCA.plin)) ** 2);'), 'barca', 'conturul spre vârf, fără garda radicalului')
TT = 'const t = tRad - (tRad - BARCA.tVarf) * x;\n      const roteste = (cc: number) => sectiuneBarca'
o('P08', E, TT, TT.replace('const t = tRad - (tRad - BARCA.tVarf) * x;', 'const t = tRad;'), 'barca', 'paleta la fel de groasă până la vârf')
o('P09', E, K, K.replace('tVarf: 0.8,', 'tVarf: 1,'), 'barca', 'vârful gros de 1')
o('P10', E, 'cmax = lat / 100 * R, N = BARCA.statii;', 'cmax = lat / 100 * D, N = BARCA.statii;', 'barca', 'lățimea, față de diametru')
CC = 'let c = Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), sec = roteste(c);\n      for (let k = 0; k < 40'
o('P11', E, CC, CC.replace('2.5 * t : t', '1.5 * t : t'), 'barca', 'vârful, strâns la 1,5 grosimi')
o('P12', E, CC, CC.replace('cmax * g)', 'cmax)'), 'barca', 'coarda fără contur (paleta dreaptă, cu rădăcina lată)')
o('P13', E, K, K.replace('umplere: 0.85,', 'umplere: 1,'), 'barca', 'paletele umplu tot pasul (se ating)')
U = 'const U = BARCA.umplere * 2 * Math.PI * r / z;'
o('P14', E, U, U.replace('/ z;', '/ (z - 1);'), 'barca', 'pasul dintre palete, ca la o paletă mai puțin')
o('P15', E, 'for (let k = 0; k < 40 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }\n      // punctul cel mai de jos', 'for (let k = 0; k < 0 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }\n      // punctul cel mai de jos', 'barca', 'coarda nu se mai strânge la limită')
o('P16', E, 'for (let k = 0; k < 40 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }\n      // punctul cel mai de jos', 'for (let k = 0; k < 1 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }\n      // punctul cel mai de jos', 'barca', 'coarda se strânge o singură dată (rămâne peste limită)')
ZM = 'const zmin = Math.min(...sec.map(p => p[1])), u = urca(r);\n      return { r, sec: sec.map(([s, h]): P2 => [s, u > 0 ? h - zmin + u : h - zmin]), rot:'
o('P17', E, ZM, ZM.replace('const zmin = Math.min(...sec.map(p => p[1])), u', 'const zmin = Math.min(...sec.map(p => p[1])) - 0.3, u'), 'barca', 'paleta la 0,3 mm deasupra mesei (în aer)')
RO = 'rot: inc * Math.PI / 180 * x * x, lat: latime(sec),'
o('P18', E, RO, RO.replace('* x * x,', '* x,'), 'barca', 'înclinarea, liniară pe paletă')
o('P19', E, RO, RO.replace('rot: inc *', 'rot: -inc *'), 'barca', 'paletele înclinate înainte')
o('P20', E, RO, RO.replace('rot: inc * Math.PI / 180 * x * x,', 'rot: 0,'), 'barca', 'fără înclinare')
o('P21', E, RO, RO.replace('Math.PI / 180', 'Math.PI / 200'), 'barca', 'înclinarea în grade centezimale')
RT = 'const roteste = (cc: number) => sectiuneBarca(cc, t).map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) - v * Math.sin(b), (u - cc / 2) * Math.sin(b) + v * Math.cos(b)]);'
o('P22', E, RT, RT.replace('(u - cc / 2) * Math.cos(b) - v * Math.sin(b)', '(u - cc / 2) * Math.cos(b) + v * Math.sin(b)'), 'barca', 'secțiunea forfecată, nu rotită')
o('P23', E, RT, RT.replace('(u - cc / 2) * Math.cos(b) - v', 'u * Math.cos(b) - v'), 'barca', 'secțiunea rotită în jurul muchiei, nu al mijlocului corzii (înclinarea se mută)')

# Cât din disc acoperă paletele (unitare).
o('A01', E, 'arie += (la + B.lat) / 2 * (B.r - ra);', 'arie += B.lat * (B.r - ra);', 'barca', 'aria, cu dreptunghiuri (nu trapeze)')
o('A02', E, 'if (B.r <= rh) continue;', 'if (B.r <= r0) continue;', 'barca', 'aria numără și stațiile din butuc')
o('A03', E, 'la = A.r >= rh ? A.lat : A.lat + (B.lat - A.lat) * (rh - A.r) / (B.r - A.r);', 'la = A.lat;', 'barca', 'lățimea la butuc, luată din stația dinăuntrul lui')
o('A04', E, CO, CO.replace('acoperire: z * arie / (Math.PI * R * R)', 'acoperire: z * arie / (Math.PI * (R * R - rh * rh))'), 'barca', 'acoperirea, față de inelul dintre butuc și vârf')
o('A05', E, CO, CO.replace('acoperire: z * arie /', 'acoperire: arie /'), 'barca', 'acoperirea unei singure palete')

# Butucul și capacul (unitare).
HH = 'const Hh = Math.max(BARCA.butucH, Math.ceil(Math.max(...statii.map(st => st.h)) * 10 - 1e-9) / 10);'
o('H01', E, HH, HH.replace('statii.map(st => st.h)', 'statii.filter(st => st.r <= rh + 0.5).map(st => st.h)'), 'barca', 'butucul, cât paleta doar la rădăcină (paletele trec de el)')
o('H02', E, K, K.replace('butucH: 8,', 'butucH: 6,'), 'barca', 'butucul cel mai scund, 6 (sub un știft)')
o('H03', E, HH, HH.replace('Math.ceil(', 'Math.round('), 'barca', 'butucul, rotunjit la zecime (poate ieși sub paletă)')
BU = 'tri.push(...butucElice(rh, Hh, d.gaura));\n    if (d.capac === "da") {'
o('H04', E, BU, BU.replace('butucElice(rh, Hh, d.gaura)', 'butucElice(rh, Hh - 1, d.gaura)'), 'barca', 'butucul cu 1 mm mai scund')
o('H05', E, BU, BU.replace('butucElice(rh, Hh, d.gaura)', 'butucElice(rh - 0.5, Hh, d.gaura)'), 'barca', 'butucul mai subțire cu 1 mm (rădăcina paletelor iese din el)')
o('H06', E, BU, BU.replace('d.capac === "da"', 'd.capac !== "da"'), 'barca', 'capacul, pe dos (elicea implicită are capac)')
o('H07', E, BU, BU.replace('butucElice(rh, Hh, d.gaura)', 'butucElice(rh, Hh, "x")'), 'barca', 'gaura, mereu de ax')
o('K01', E, K, K.replace('capac: 1.2,', 'capac: 1,'), 'barca', 'capacul, înalt cât raza butucului')
o('K02', E, K, K.replace('inele: 6,', 'inele: 4,'), 'barca', 'capacul din 4 inele')
ZC = 'z0 = Hh - 0.1, hc = Hh + BARCA.capac * rh - z0, cap: Tri[] = [];'
o('K03', E, ZC, ZC.replace('z0 = Hh - 0.1,', 'z0 = Hh + 0.1,'), 'barca', 'capacul, la 0,1 mm deasupra butucului (desprins)')
PT = 'return [rh * Math.cos(f) * Math.cos(a), rh * Math.cos(f) * Math.sin(a), z0 + hc * Math.sin(f)]; };'
o('K04', E, PT, 'return [rh * (1 - k / K) * Math.cos(a), rh * (1 - k / K) * Math.sin(a), z0 + hc * k / K]; };', 'barca', 'capacul conic, nu rotunjit')
o('K05', E, '        cap.push([pt(i, 0), [0, 0, z0], pt(i + 1, 0)]);\n', '', 'barca', 'capacul fără fund (corp deschis)')
o('K06', E, 'const varf: P3 = [0, 0, z0 + hc];', 'const varf: P3 = [0, 0, z0 + hc + 1];', 'barca', 'vârful capacului, cu 1 mm mai sus')
o('K07', E, 'const a = (2 * Math.PI * (i % n)) / n, f = (Math.PI / 2) * k / K;', 'const a = (2 * Math.PI * (i % n)) / n, f = (Math.PI / 3) * k / K;', 'barca', 'capacul, doar până la 60° (vârf ascuțit, alt profil)')

# Plasa, sensul, avertismentele, tipul (unitare).
PA = 'const tri = paleteElice(q.statii, q.z, d.sens === "stanga" ? -1 : 1, true);\n    tri.push(...butucElice(rh, Hh, d.gaura));'
o('M01', E, PA, PA.replace(', true);', ', false);'), 'barca', 'capetele paletei, cu tăierea urechilor (fața plată le strică)')
o('M02', E, PA, PA.replace('? -1 : 1', '? 1 : -1'), 'barca', 'sensul, pe dos')
o('M03', E, PA, PA.replace('q.z,', 'q.z - 1,'), 'barca', 'o paletă lipsă (neechilibrată)')
FA = 'Array.from({ length: n / 2 - 1 }, (_, j): [number, number, number][] => [[j, j + 1, n - 2 - j], [j, n - 2 - j, n - 1 - j]]).flat()'
o('M04', E, FA, FA.replace('length: n / 2 - 1 }', 'length: n / 2 - 2 }'), 'barca', 'fâșia capătului, cu un pătrat lipsă (corp deschis)')
o('M05', E, 'const f = st.rot ? th + semn * (s / st.r + st.rot) : th + semn * s / st.r;', 'const f = st.rot ? th + semn * s / st.r + st.rot : th + semn * s / st.r;', 'barca',
  'înclinarea nu urmează sensul (stânga nu mai e oglinda dreptei)')
o('V01', E, 'if (Number.isFinite(+(d.palete as number)) && q.z !== +(d.palete as number)) avert.push(tr`O elice de barcă are',
  'if (Number.isFinite(+(d.palete as number)) && q.z === +(d.palete as number)) avert.push(tr`O elice de barcă are', 'barca', 'paletele în afara plajei, nespuse (și spuse când sunt în plajă)')
o('V02', E, 'if (Number.isFinite(+(d.diametru as number)) && q.D !== +(d.diametru as number)) avert.push(tr`Diametrul unei elice de barcă',
  'if (false) avert.push(tr`Diametrul unei elice de barcă', 'barca', 'diametrul în afara plajei, nespus')
o('V03', E, 'avert.push(tr`O elice de barcă are între 3 și 5 palete: am făcut-o cu ${q.z}.`);', 'avert.push(tr`O elice de barcă are între 3 și 5 palete: am făcut-o cu ${d.palete}.`);', 'barca',
  'avertismentul spune paletele cerute, nu cele făcute')
o('V04', E, 'conicaDubla, senila, elice, eliceBarca, ventilator, dinCvs2 };', 'conicaDubla, senila, elice, ventilator, dinCvs2 };', 'barca', 'elicea de barcă scoasă din tipurile motorului')

# Atelierul (e2e).
F = '    ["propulsie", "Elice", [["elice", "Elice"], ["eliceBarca", "Elice de barcă"], ["ventilator", "Ventilator cu carcasă"]]]'
o('E01', A, F, F.replace(', ["eliceBarca", "Elice de barcă"]', ''), 'e2e', 'elicea de barcă lipsește din galeria filei Elice')
o('E02', A, F, F.replace('[["elice", "Elice"], ["eliceBarca", "Elice de barcă"],', '[["eliceBarca", "Elice de barcă"], ["elice", "Elice"],'), 'e2e', 'elicea de barcă, prima în galerie')
ST = '    eliceBarca: { palete: 3, diametru: 40, pas: 1, latime: 100, inclinare: 20, pupa: 0, sens: "dreapta", gaura: "x", capac: "nu" },'
o('E03', A, ST, ST.replace('palete: 3,', 'palete: 4,'), 'e2e', 'editorul pornește cu 4 palete')
o('E04', A, ST, ST.replace('diametru: 40,', 'diametru: 48,'), 'e2e', 'editorul pornește cu Ø48')
o('E05', A, ST, ST.replace('pas: 1,', 'pas: 0.9,'), 'e2e', 'editorul pornește cu pasul 0,9')
o('E06', A, ST, ST.replace('latime: 100,', 'latime: 90,'), 'e2e', 'editorul pornește cu lățimea 90 %')
o('E07', A, ST, ST.replace('inclinare: 20,', 'inclinare: 15,'), 'e2e', 'editorul pornește cu înclinarea 15°')
o('E08', A, ST, ST.replace('sens: "dreapta",', 'sens: "stanga",'), 'e2e', 'editorul pornește pe stânga')
o('E09', A, ST, ST.replace('gaura: "x",', 'gaura: "r",'), 'e2e', 'editorul pornește cu gaura rotundă')
o('E10', A, ST, ST.replace('capac: "nu" }', 'capac: "da" }'), 'e2e', 'editorul pornește cu capac')
NL = 'const l = (d.latime ?? 100) !== 100 ? tr`, lățimea ${d.latime} %` : "", i = (d.inclinare ?? 20) !== 20 ? tr`, înclinarea ${d.inclinare}°` : "";'
o('E11', A, NL, NL.replace('(d.latime ?? 100) !== 100', '(d.latime ?? 100) !== 85'), 'e2e', 'numele spune lățimea obișnuită')
o('E12', A, NL, NL.replace('(d.inclinare ?? 20) !== 20', '(d.inclinare ?? 20) !== 0'), 'e2e', 'numele spune înclinarea obișnuită (și o tace pe cea de 0°)')
o('E13', A, NL, NL.replace('tr`, lățimea ${d.latime} %`', 'tr`, lățimea ${d.inclinare} %`'), 'e2e', 'numele spune înclinarea în locul lățimii')
NS = 'const s = d.sens === "stanga" ? tr(", stânga") : "", c = d.capac === "da" ? tr(", cu capac") : "";'
o('E14', A, NS, NS.replace('d.sens === "stanga"', 'd.sens !== "stanga"'), 'e2e', 'numele spune „stânga” la elicea pe dreapta')
o('E15', A, NS, NS.replace('d.capac === "da"', 'd.capac !== "da"'), 'e2e', 'numele spune „cu capac” la cea fără')
NN = 'return tr`Elice de barcă Ø${fmt(d.diametru ?? 40, 1)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 1, 2)}${l}${i}${pu}${s}${g}${c}`;'
o('E16', A, NN, NN.replace('fmt(d.diametru ?? 40, 1)', 'fmt(d.diametru ?? 40, 0)'), 'e2e', 'numele, cu diametrul la milimetru')
o('E17', A, NN, NN.replace('fmt(d.pas ?? 1, 2)', 'fmt(d.pas ?? 1, 1)'), 'e2e', 'numele, cu pasul la zecime')
o('E18', A, NN, NN.replace('${l}${i}${pu}${s}${g}${c}', '${l}${i}${pu}${s}${c}${g}'), 'e2e', 'numele, cu capacul înaintea găurii')
o('E19', A, NN, NN.replace('${l}${i}${pu}${s}${g}${c}', '${i}${l}${pu}${s}${g}${c}'), 'e2e', 'numele, cu înclinarea înaintea lățimii')
TX = '\n    return tr`Pasul ${fmt(c.P, 0)} mm (${fmt(c.pd, 2)} × diametrul): paleta stă la ${g(c.bRad)}° lângă butuc și la ${g(c.bVarf)}° la vârf. Paletele acoperă ${fmt(c.acoperire * 100, 0)} % din disc; butucul e de Ø${fmt(2 * c.rh, 1)} × ${fmt(c.Hh, 1)} mm.'
o('E20', A, TX, TX.replace('${fmt(c.P, 0)} mm', '${fmt(c.P, 1)} mm'), 'e2e', 'textul: pasul cu zecimi')
o('E21', A, TX, TX.replace('${g(c.bRad)}° lângă butuc și la ${g(c.bVarf)}°', '${g(c.bVarf)}° lângă butuc și la ${g(c.bRad)}°'), 'e2e', 'textul: unghiurile, pe dos')
o('E22', A, TX, TX.replace('fmt(c.acoperire * 100, 0)', 'fmt(c.acoperire * 100, 1)'), 'e2e', 'textul: acoperirea cu zecimi')
o('E23', A, TX, TX.replace('Ø${fmt(2 * c.rh, 1)}', 'Ø${fmt(c.rh, 1)}'), 'e2e', 'textul: raza butucului, spusă ca diametru')
o('E24', A, TX, TX.replace('× ${fmt(c.Hh, 1)} mm.', '× ${fmt(c.Hh, 0)} mm.'), 'e2e', 'textul: butucul la milimetru')
o('E25', A, 'cu partea dinspre barcă pe masă: la vârf, un strat iese cu ${fmt(c.consola, 1)} mm peste cel de dedesubt.`;',
  'cu partea dinspre barcă pe masă: la vârf, un strat iese cu ${fmt(c.consola, 0)} mm peste cel de dedesubt.`;', 'e2e', 'textul: consola la milimetru')
o('E26', A, 'const c = Lego.eliceBarcaCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 0);', 'const c = Lego.eliceBarcaCote({}), g = (x: number) => fmt(x * 180 / Math.PI, 0);', 'e2e',
  'textul, mereu al elicei implicite')
o('E27', A, '<h2>Elice de barcă</h2>', '<h2>Elice</h2>', 'e2e', 'titlul editorului, al elicei')
RP = 'seg("at-eb-repede", [["24", "Ø24"], ["32", "Ø32"], ["40", "Ø40"], ["56", "Ø56"]], String(p.diametru))'
o('E28', A, RP, RP.replace('["32", "Ø32"]', '["36", "Ø36"]'), 'e2e', '„Repede” cu Ø36 (în afara grilei de știfturi)')
o('E29', A, RP, RP.replace('String(p.diametru))', '"")'), 'e2e', '„Repede” nu arată diametrul de acum')
o('E30', A, 'alege("#at-eb-repede", v => { p.diametru = +v; });', 'alege("#at-eb-repede", v => { p.diametru = +v + 1; });', 'e2e', '„Repede” pune diametrul cu 1 mm mai mare')
o('E31', A, 'alege("#at-eb-sens", v => { p.sens = v; });', 'alege("#at-eb-sens", () => {});', 'e2e', 'sensul nu ajunge în piesă')
o('E32', A, 'alege("#at-eb-gaura", v => { p.gaura = v; });', 'alege("#at-eb-gaura", () => {});', 'e2e', 'gaura nu ajunge în piesă')
o('E33', A, 'alege("#at-eb-capac", v => { p.capac = v; });', 'alege("#at-eb-capac", () => {});', 'e2e', 'capacul nu ajunge în piesă')
o('E34', A, 'camp("#at-eb-palete", 0, 3, 5, v => { p.palete = v; });', 'camp("#at-eb-palete", 0, 3, 6, v => { p.palete = v; });', 'e2e', 'câmpul paletelor primește 6')
o('E35', A, 'camp("#at-eb-palete", 0, 3, 5, v => { p.palete = v; });', 'camp("#at-eb-palete", 0, 2, 5, v => { p.palete = v; });', 'e2e', 'câmpul paletelor primește 2')
o('E36', A, 'camp("#at-eb-palete", 0, 3, 5, v => { p.palete = v; });', 'camp("#at-eb-palete", 1, 3, 5, v => { p.palete = v; });', 'e2e', 'paletele cu zecimi')
o('E37', A, 'camp("#at-eb-diam", 1, 20, 120, v => { p.diametru = v; });', 'camp("#at-eb-diam", 0, 20, 120, v => { p.diametru = v; });', 'e2e', 'diametrul la milimetru')
o('E38', A, 'camp("#at-eb-diam", 1, 20, 120, v => { p.diametru = v; });', 'camp("#at-eb-diam", 1, 20, 121, v => { p.diametru = v; });', 'e2e', 'diametrul peste 120')
o('E39', A, 'camp("#at-eb-diam", 1, 20, 120, v => { p.diametru = v; });', 'camp("#at-eb-diam", 1, 19, 120, v => { p.diametru = v; });', 'e2e', 'diametrul sub 20')
o('E40', A, 'camp("#at-eb-pas", 2, 0.5, 1.6, v => { p.pas = v; });', 'camp("#at-eb-pas", 1, 0.5, 1.6, v => { p.pas = v; });', 'e2e', 'pasul la zecime')
o('E41', A, 'camp("#at-eb-pas", 2, 0.5, 1.6, v => { p.pas = v; });', 'camp("#at-eb-pas", 2, 0.5, 1.7, v => { p.pas = v; });', 'e2e', 'pasul peste 1,6')
o('E42', A, 'camp("#at-eb-pas", 2, 0.5, 1.6, v => { p.pas = v; });', 'camp("#at-eb-pas", 2, 0.4, 1.6, v => { p.pas = v; });', 'e2e', 'pasul sub 0,5')
o('E43', A, 'camp("#at-eb-lat", 0, 40, 150, v => { p.latime = v; });', 'camp("#at-eb-lat", 1, 40, 150, v => { p.latime = v; });', 'e2e', 'lățimea cu zecimi')
o('E44', A, 'camp("#at-eb-lat", 0, 40, 150, v => { p.latime = v; });', 'camp("#at-eb-lat", 0, 40, 151, v => { p.latime = v; });', 'e2e', 'lățimea peste 150 %')
o('E45', A, 'camp("#at-eb-lat", 0, 40, 150, v => { p.latime = v; });', 'camp("#at-eb-lat", 0, 39, 150, v => { p.latime = v; });', 'e2e', 'lățimea sub 40 %')
o('E46', A, 'camp("#at-eb-inc", 0, 0, 40, v => { p.inclinare = v; });', 'camp("#at-eb-inc", 1, 0, 40, v => { p.inclinare = v; });', 'e2e', 'înclinarea cu zecimi')
o('E47', A, 'camp("#at-eb-inc", 0, 0, 40, v => { p.inclinare = v; });', 'camp("#at-eb-inc", 0, 0, 41, v => { p.inclinare = v; });', 'e2e', 'înclinarea peste 40°')
o('E48', A, 'camp("#at-eb-inc", 0, 0, 40, v => { p.inclinare = v; });', 'camp("#at-eb-inc", 0, -1, 40, v => { p.inclinare = v; });', 'e2e', 'înclinarea sub 0°')
o('E49', A, 'camp("#at-eb-lat", 0, 40, 150, v => { p.latime = v; });', 'camp("#at-eb-lat", 0, 40, 150, v => { p.inclinare = v; });', 'e2e', 'câmpul lățimii schimbă înclinarea')
o('E50', A, '$("#at-eb-pereche").onclick = adaugaPerecheElice;', '$("#at-eb-pereche").onclick = adaugaInLista;', 'e2e', '„Fă perechea” pune o singură elice')
o('E51', A, 'value="${p.inclinare}"></label>', 'value="${p.latime}"></label>', 'e2e', 'câmpul înclinării arată lățimea')
GB = 'const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "b" ? tr(", pentru bară") : d.gaura === "nu" ? tr(", fără gaură") : "";\n      const l = (d.latime'
o('E52', A, GB, GB.replace('d.gaura === "b" ? tr(", pentru bară")', 'd.gaura === "b" ? tr(", gaură rotundă")'), 'e2e', 'numele spune „gaură rotundă” la cea pentru bară')

# Pictograma și traducerea (unitare).
o('G01', A, '    eliceBarca: `<circle cx="12" cy="12" r="2.2"/><path d="M10.4 10.3C6 9', '    eliceBarca2: `<circle cx="12" cy="12" r="2.2"/><path d="M10.4 10.3C6 9', 'pictograme', 'elicea de barcă fără pictogramă')
o('T01', T, ' "Elice de barcă": "Boat propeller",', ' "Elice de barcă": "",', 'engleza', 'numele elicei de barcă, netradus')

SETURI = {
    'barca': ['test/unit/trenulet.barca.test.ts'],
    'pictograme': ['test/unit/trenulet.pictograme.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.barca.spec.ts']

for x in O:
    assert x['vechi'] != x['nou'], x['id']
