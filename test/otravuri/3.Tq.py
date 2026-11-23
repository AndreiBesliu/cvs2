# Lista de otrăvuri a feliei 3.Tq (elicea în atelierul Easy 3Draw, ADR 0282), 23.11.2026, alese de autor: cotele din parametri
# (`eliceCote`: implicitele, marginile plajei, unghiul paletei răsucite și al celei plate, consola), secțiunea (`sectiuneElice`:
# săgeata și sensul ei, grosimea, profilul de aripă cu muchia de atac și grosimea lui cea mai mică), paleta (`elice`: stațiile,
# rădăcina din butuc, formele, coarda cea mai mică la vârf, limita corzii pe secțiunea reală, muchia de jos pe masă, așezarea
# pe cilindru, paletele împărțite pe cerc, sensul), butucul (raza, înălțimea, cât cere paleta la rădăcină, gaura), conul (dacă,
# cât de înalt, așezat în butuc), avertismentele; atelierul (fila și galeria, implicitele editorului, numele piesei, textul
# elicei, „Ca LEGO” cu cotele și sensul fiecărei piese, alegerile, câmpurile cu plaja și rotunjirea lor, „Fă perechea”,
# redesenarea editorului cât omul scrie într-un câmp), pictograma și traducerea. Textele fără diacritice rămase în română se văd doar în cvs2, în engleză: lista lor e `3.Tq-en.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit; setul „e2e” e
# `test/e2e/trenulet.elice.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Lăsată afară, ca echivalentă (rulată pe 0d027c5: scăpată, 12 / 12):
# - `c = Math.max(t, c * U / lat * 0.995)` fără `Math.max(t, …)`: cu cel mult 8 palete pe butucul de r 3,6, pasul dintre palete e
#   cel puțin 0,85 · 2π · 3,6 / 8 = 2,40 mm, iar secțiunea cu coarda cât grosimea (1,2) e lată de cel mult 1,2 · √2 + săgeata =
#   1,75 mm: coarda nu ajunge niciodată la grosime (garda rămâne, pentru o plajă mai largă a paletelor).
# Două pe care le socotisem echivalente nu erau (X01, X02, mai jos): rulate, una era prinsă deja, iar cealaltă a cerut proba ei
# (garda radicalului ține plasa întreagă la 99 dintre diametrele din 0,1 în 0,1 mm).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = '  const ELICE = { butucR: 4, butucH: 8, tRad: 1.2, tVarf: 0.8, sageata: 0.04, radacina: 0.6, umplere: 0.85, statii: 28, perSuprafata: 12, con: 1.3 };'

# Cotele din parametri: `eliceCote` (unitare).
o('C01', E, 'const z = Math.round(Math.min(8, Math.max(2, nr(d.palete, 3))));', 'const z = Math.round(Math.min(8, Math.max(2, nr(d.palete, 4))));', 'elice',
  'elicea implicită cu 4 palete')
o('C02', E, 'const z = Math.round(Math.min(8, Math.max(2, nr(d.palete, 3))));', 'const z = Math.round(Math.min(9, Math.max(2, nr(d.palete, 3))));', 'elice',
  '9 palete (pe butucul Ø8 nu mai au loc)')
o('C03', E, 'const z = Math.round(Math.min(8, Math.max(2, nr(d.palete, 3))));', 'const z = Math.round(Math.min(8, Math.max(1, nr(d.palete, 3))));', 'elice',
  'o singură paletă (neechilibrată)')
o('C04', E, 'const z = Math.round(Math.min(8, Math.max(2, nr(d.palete, 3))));', 'const z = Math.floor(Math.min(8, Math.max(2, nr(d.palete, 3))));', 'elice',
  'paletele tăiate la întreg, nu rotunjite')
o('C05', E, 'const D = Math.min(200, Math.max(20, nr(d.diametru, 72))), R = D / 2;', 'const D = Math.min(200, Math.max(20, nr(d.diametru, 64))), R = D / 2;', 'elice',
  'diametrul implicit, 64')
o('C06', E, 'const D = Math.min(200, Math.max(20, nr(d.diametru, 72))), R = D / 2;', 'const D = Math.min(220, Math.max(20, nr(d.diametru, 72))), R = D / 2;', 'elice',
  'diametrul până la 220 (cât masa imprimantei)')
o('C07', E, 'const D = Math.min(200, Math.max(20, nr(d.diametru, 72))), R = D / 2;', 'const D = Math.min(200, Math.max(10, nr(d.diametru, 72))), R = D / 2;', 'elice',
  'diametrul de la 10 (palete de 1 mm pe butucul Ø8)')
o('C08', E, 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.7))), P = pd * D;', 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.8))), P = pd * D;', 'elice',
  'pasul implicit, 0,8')
o('C09', E, 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.7))), P = pd * D;', 'const pd = Math.min(2, Math.max(0.3, nr(d.pas, 0.7))), P = pd * D;', 'elice',
  'pasul până la 2')
o('C10', E, 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.7))), P = pd * D;', 'const pd = Math.min(1.5, Math.max(0.2, nr(d.pas, 0.7))), P = pd * D;', 'elice',
  'pasul de la 0,2 (paleta culcată, consola de 3 mm pe strat)')
o('C11', E, 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.7))), P = pd * D;', 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.7))), P = pd * R;', 'elice',
  'pasul față de rază, nu față de diametru')
o('C12', E, 'const lat = Math.min(60, Math.max(15, nr(d.latime, 30)));', 'const lat = Math.min(60, Math.max(15, nr(d.latime, 35)));', 'elice', 'lățimea implicită, 35 %')
o('C13', E, 'const lat = Math.min(60, Math.max(15, nr(d.latime, 30)));', 'const lat = Math.min(70, Math.max(15, nr(d.latime, 30)));', 'elice', 'lățimea până la 70 %')
o('C14', E, 'const lat = Math.min(60, Math.max(15, nr(d.latime, 30)));', 'const lat = Math.min(60, Math.max(10, nr(d.latime, 30)));', 'elice', 'lățimea de la 10 %')
o('C15', E, 'const plata = d.paleta === "plata", b70 = Math.atan(P / (2 * Math.PI * 0.7 * R));',
  'const plata = d.paleta !== "plata", b70 = Math.atan(P / (2 * Math.PI * 0.7 * R));', 'elice', 'paleta plată și cea răsucită, pe dos')
o('C16', E, 'const plata = d.paleta === "plata", b70 = Math.atan(P / (2 * Math.PI * 0.7 * R));',
  'const plata = d.paleta === "plata", b70 = Math.atan(P / (2 * Math.PI * 0.75 * R));', 'elice', 'paleta plată, cu unghiul de la 75 % din rază')
o('C17', E, 'const beta = (r: number) => (plata ? b70 : Math.atan(P / (2 * Math.PI * r)));', 'const beta = (r: number) => (plata ? b70 : Math.atan(P / (Math.PI * r)));', 'elice',
  'unghiul paletei răsucite, cu pasul dublu')
o('C18', E, 'bRad: beta(ELICE.butucR), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)) };', 'bRad: beta(R), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)) };', 'elice',
  'unghiul de lângă butuc, cel de la vârf')
o('C19', E, 'bRad: beta(ELICE.butucR), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)) };', 'bRad: beta(ELICE.butucR), bVarf: beta(R), consola: 0.2 * Math.tan(beta(R)) };', 'elice',
  'consola la vârf, pe dos (0,2 · tan β)')
o('C20', E, 'bRad: beta(ELICE.butucR), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)) };', 'bRad: beta(ELICE.butucR), bVarf: beta(R), consola: 0.3 / Math.tan(beta(R)) };', 'elice',
  'consola pe strat de 0,3')

# Secțiunea: `sectiuneElice` (unitare).
o('S01', E, '        yc = 4 * ELICE.sageata * x * (1 - x) * c;', '        yc = -4 * ELICE.sageata * x * (1 - x) * c;', 'elice', 'placa bombată în jos (fața de aspirație pe dos)')
o('S02', E, K, K.replace('sageata: 0.04,', 'sageata: 0.08,'), 'elice', 'săgeata plăcii, 8 % din coardă')
o('S03', E, '        yc = 4 * ELICE.sageata * x * (1 - x) * c;\n        ht = t / 2;', '        yc = 4 * ELICE.sageata * x * (1 - x) * c;\n        ht = t / 4;', 'elice',
  'placa groasă cât o linie de duză (jumătate)')
o('S04', E, K, K.replace('tRad: 1.2,', 'tRad: 1.0,'), 'elice', 'grosimea la rădăcină, 1,0')
o('S05', E, K, K.replace('tVarf: 0.8,', 'tVarf: 0.6,'), 'elice', 'grosimea la vârf, 0,6 (sub două linii de duză)')
o('S06', E, '      if (profil === "aripa") {', '      if (profil !== "aripa") {', 'elice', 'placa și profilul de aripă, pe dos')
o('S07', E, 'const xa = 1 - x, m = 0.04, p = 0.4;', 'const xa = x, m = 0.04, p = 0.4;', 'elice', 'profilul de aripă cu muchia de atac în spate')
o('S08', E, 'const xa = 1 - x, m = 0.04, p = 0.4;', 'const xa = 1 - x, m = 0.02, p = 0.4;', 'elice', 'profilul de aripă cu săgeata de 2 %')
o('S09', E, 'const xa = 1 - x, m = 0.04, p = 0.4;', 'const xa = 1 - x, m = 0.04, p = 0.5;', 'elice', 'profilul de aripă cu săgeata la mijlocul corzii')
o('S10', E, 'ht = Math.max(5 * 0.12 * (0.2969', 'ht = Math.max(5 * 0.09 * (0.2969', 'elice', 'profilul de aripă gros de 9 %')
o('S11', E, '0.2843 * xa ** 3 - 0.1036 * xa ** 4) * c, t / 2);', '0.2843 * xa ** 3 - 0.1036 * xa ** 4) * c, t / 4);', 'elice',
  'profilul de aripă subțiat la muchii sub două linii de duză')
o('S12', E, "      sus.push([u, yc + ht]); jos.push([u, yc - ht]);", "      sus.push([u, yc + ht]); jos.push([u, yc - 2 * ht]);", 'elice', 'fața de jos, la o grosime întreagă sub linia de mijloc')

# Paleta: `elice` (unitare).
o('P01', E, K, K.replace('statii: 28,', 'statii: 14,'), 'elice', 'jumătate din secțiuni (paleta răsucită, din fețe late)')
o('P02', E, 'cmax = q.lat / 100 * R, N = ELICE.statii, r0 = rh - 0.4;', 'cmax = q.lat / 100 * R, N = ELICE.statii, r0 = rh + 0.4;', 'elice',
  'rădăcina paletei la 0,4 mm de butuc (paletele, desprinse)')
o('P03', E, 'cmax = q.lat / 100 * R, N = ELICE.statii, r0 = rh - 0.4;', 'cmax = q.lat / 100 * D0, N = ELICE.statii, r0 = rh - 0.4;'.replace('D0', '2 * R'), 'elice',
  'lățimea, procent din diametru')
o('P04', E, 'const r = r0 + (R - r0) * i / N, x = Math.max(0, (r - rh) / (R - rh)), b = q.beta(r);',
  'const r = r0 + (R - r0) * i / N, x = Math.max(0, (r - rh) / R), b = q.beta(r);', 'elice', 'locul pe paletă, față de rază (vârful nu mai e la 100 %)')
o('P05', E, 'forma === "ingust" ? 1 - 0.5 * x :', 'forma === "ingust" ? 1 - 0.7 * x :', 'elice', 'îngustata, la 30 % la vârf')
o('P06', E, '(x <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.55) / 0.45) ** 2)));', '(x <= 0.45 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.55) / 0.45) ** 2)));', 'elice',
  'rotunjita începe la 45 % (un prag în coardă)')
o('P07', E, '(x <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.55) / 0.45) ** 2)));', '(x <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - (x - 0.55) / 0.45)));', 'elice',
  'rotunjita, parabolică în loc de eliptică')
o('P08', E, 'let g = forma === "drept" ? 1 :', 'let g = forma !== "drept" ? 1 :', 'elice', 'forma dreaptă, pe dos')
o('P09', E, K, K.replace('radacina: 0.6,', 'radacina: 0.8,'), 'elice', 'rădăcina, 80 % din coardă')
o('P10', E, 'g *= ELICE.radacina + (1 - ELICE.radacina) * Math.min(1, x / 0.25);', 'g *= ELICE.radacina + (1 - ELICE.radacina) * Math.min(1, x / 0.5);', 'elice',
  'rădăcina se lărgește pe jumătate din paletă')
o('P11', E, 'const t = ELICE.tRad - (ELICE.tRad - ELICE.tVarf) * x;', 'const t = ELICE.tRad - (ELICE.tRad - ELICE.tVarf) * x * x;', 'elice',
  'grosimea scade pătratic spre vârf')
o('P12', E, 'let c = Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), sec = roteste(c);', 'let c = Math.max(x >= 0.5 ? 1.5 * t : t, cmax * g), sec = roteste(c);', 'elice',
  'vârful rotunjitei, strâns la 1,5 grosimi')
o('P13', E, 'let c = Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), sec = roteste(c);', 'let c = Math.max(x >= 0.5 ? 2.5 * t : t, cmax), sec = roteste(c);', 'elice',
  'coarda fără formă (toate paletele drepte, cu rădăcina lată)')
o('P14', E, K, K.replace('umplere: 0.85,', 'umplere: 1.0,'), 'elice', 'paletele umplu tot pasul (se ating la butuc)')
o('P15', E, 'const U = ELICE.umplere * 2 * Math.PI * r / z,', 'const U = ELICE.umplere * 2 * Math.PI * r / (z - 1),', 'elice', 'pasul dintre palete, socotit cu o paletă mai puțin')
o('P16', E, '        if (lat <= U) break;\n        c = Math.max(t, c * U / lat * 0.995); sec = roteste(c);', '        if (c * Math.cos(b) <= U) break;\n        c = Math.max(t, c * U / lat * 0.995); sec = roteste(c);', 'elice',
  'limita corzii, doar pe coarda proiectată (fără grosimea secțiunii)')
o('P17', E, '      for (let k = 0; k < 8; k++) {\n        const lat = Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[0]));',
  '      for (let k = 0; k < 0; k++) {\n        const lat = Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[0]));', 'elice', 'coarda nelimitată (paletele late se întrepătrund)')
o('P18', E, '.map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) - v * Math.sin(b), (u - cc / 2) * Math.sin(b) + v * Math.cos(b)]);',
  '.map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) + v * Math.sin(b), (u - cc / 2) * Math.sin(b) + v * Math.cos(b)]);', 'elice', 'secțiunea forfecată, nu rotită (grosimea se strică)')
o('P19', E, 'return { r, sec: sec.map(([s, h]): P2 => [s, h - zmin]) };', 'return { r, sec: sec.map(([s, h]): P2 => [s, h]) };', 'elice',
  'secțiunile rămân centrate pe coardă (jumătate din paletă sub masă)')
o('P20', E, 'const zmin = Math.min(...sec.map(p => p[1]));', 'const zmin = Math.min(...sec.map(p => p[1])) - 0.3;', 'elice', 'paleta la 0,3 mm deasupra mesei (în aer)')
o('P21', E, 'const th = 2 * Math.PI * k / z;\n      const p3 = (r: number, [s, h]: P2): P3 => { const f = th + semn * s / r;',
  'const th = Math.PI * k / z;\n      const p3 = (r: number, [s, h]: P2): P3 => { const f = th + semn * s / r;', 'elice', 'paletele înghesuite pe jumătate de cerc')
o('P22', E, 'const p3 = (r: number, [s, h]: P2): P3 => { const f = th + semn * s / r;', 'const p3 = (r: number, [s, h]: P2): P3 => { const f = th + semn * s / (r + 1);', 'elice',
  'coarda așezată pe un cilindru mai mare cu 1 mm (unghiul paletei, altul)')
o('P23', E, 'const semn = d.sens === "stanga" ? -1 : 1,', 'const semn = d.sens === "stanga" ? 1 : -1,', 'elice', 'dreapta și stânga, pe dos')
o('P24', E, 'const semn = d.sens === "stanga" ? -1 : 1,', 'const semn = d.sens === "stanga" ? 1 : 1,', 'elice', 'stânga e tot dreapta (perechea, două elice la fel)')
o('P25', E, 'const forma = d.forma === "drept" || d.forma === "ingust" ? d.forma : "rot", profil = d.profil === "aripa" ? "aripa" : "placa";',
  'const forma = d.forma === "drept" || d.forma === "ingust" ? d.forma : "rot", profil = d.profil === "aripa" ? "placa" : "placa";', 'elice', 'profilul de aripă nu se face')
o('P26', E, 'const forma = d.forma === "drept" || d.forma === "ingust" ? d.forma : "rot", profil',
  'const forma = d.forma === "drept" ? d.forma : "rot", profil', 'elice', 'forma îngustată nu se face')

# Butucul, gaura și conul (unitare).
o('B01', E, K, K.replace('butucR: 4,', 'butucR: 5,'), 'elice', 'butucul Ø10 (nu ca la LEGO)')
o('B02', E, K, K.replace('butucH: 8,', 'butucH: 7,'), 'elice', 'butucul înalt de 7 (sub un știft)')
o('B03', E, 'const Hh = Math.max(ELICE.butucH, Math.ceil(hRad * 10) / 10);', 'const Hh = ELICE.butucH;', 'elice', 'butucul nu urcă odată cu rădăcina paletei')
o('B04', E, 'const hRad = Math.max(...statii.filter(st => st.r <= rh + 0.5)', 'const hRad = Math.max(...statii.filter(st => st.r <= rh + 5)', 'elice',
  'butucul, înalt cât paleta de la 5 mm de el')
o('B05', E, 'const hRad = Math.max(...statii.filter(st => st.r <= rh + 0.5)', 'const hRad = Math.max(...statii.filter(st => st.r <= rh - 0.5)', 'elice',
  'nicio secțiune la butuc (înălțimea lui, fără paletă)')
o('B06', E, 'const G = d.gaura === "b" ? { g: [cerc(0, 0, e.baraGauraD / 2)] }', 'const G = d.gaura === "b" ? { g: [cerc(0, 0, e.gauraD / 2)] }', 'elice',
  'gaura pentru bară, cât cea de știft')
o('B07', E, 'gauraRoata(cerc(0, 0, rh), d.gaura === "r" || d.gaura === "nu" ? d.gaura : "x");', 'gauraRoata(cerc(0, 0, rh), d.gaura === "nu" ? d.gaura : "x");', 'elice',
  'gaura rotundă devine gaură de ax')
o('B08', E, 'tri.push(...prismaGauri(cerc(0, 0, rh), G.g, 0, Hh));\n    if (d.con === "da") {', 'tri.push(...prismaGauri(cerc(0, 0, rh), G.g, 0.2, Hh));\n    if (d.con === "da") {', 'elice',
  'butucul la 0,2 mm deasupra mesei')
o('B09', E, 'tri.push(...prismaGauri(cerc(0, 0, rh), G.g, 0, Hh));\n    if (d.con === "da") {', 'tri.push(...prismaGauri(cerc(0, 0, rh), G.g, 0, Hh));\n    if (d.con !== "da") {', 'elice',
  'conul, pe dos (elicea implicită are con)')
o('B10', E, K, K.replace('con: 1.3 }', 'con: 1.0 }'), 'elice', 'conul înalt cât raza butucului')
o('B11', E, 'const n = N_CERC, z0 = Hh - 0.1, zv = Hh + ELICE.con * rh, con: Tri[] = [];', 'const n = N_CERC, z0 = Hh + 0.1, zv = Hh + ELICE.con * rh, con: Tri[] = [];', 'elice',
  'conul la 0,1 mm deasupra butucului (desprins)')
o('B12', E, 'const n = N_CERC, z0 = Hh - 0.1, zv = Hh + ELICE.con * rh, con: Tri[] = [];', 'const n = N_CERC, z0 = Hh - 0.1, zv = Hh + ELICE.con * rh * 2, con: Tri[] = [];', 'elice',
  'conul de două ori mai înalt')

# Două pe care le socotisem echivalente, rulate ca să se vadă (unitare).
o('X01', E, K, K.replace('perSuprafata: 12,', 'perSuprafata: 10,'), 'elice', 'secțiunea din 10 bucăți pe față, nu 12 (plasa mai rară pe coardă)')
o('X02', E, '(x <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.55) / 0.45) ** 2)));', '(x <= 0.55 ? 1 : Math.sqrt(1 - ((x - 0.55) / 0.45) ** 2));', 'elice',
  'rotunjita, fără garda radicalului (la vârf, un rest de rotunjire negativ ar da NaN)')

# Avertismentele (unitare).
o('V01', E, 'if (Number.isFinite(+(d.palete as number)) && q.z !== +(d.palete as number)) avert.push(', 'if (Number.isFinite(+(d.palete as number)) && q.z === +(d.palete as number)) avert.push(', 'elice',
  'paletele în afara plajei, nespuse (și spuse când sunt în plajă)')
o('V02', E, 'if (Number.isFinite(+(d.diametru as number)) && q.D !== +(d.diametru as number)) avert.push(', 'if (false) avert.push(', 'elice',
  'diametrul în afara plajei, nespus')
o('V03', E, 'avert.push(tr`O elice are între 2 și 8 palete: am făcut-o cu ${q.z}.`);', 'avert.push(tr`O elice are între 2 și 8 palete: am făcut-o cu ${d.palete}.`);', 'elice',
  'avertismentul spune paletele cerute, nu cele făcute')
o('V04', E, 'avert.push(tr`Diametrul unei elice e între 20 și 200 mm: am făcut-o de ${q.D} mm.`);', 'avert.push(tr`Diametrul unei elice e între 20 și 200 mm: am făcut-o de ${q.R} mm.`);', 'elice',
  'avertismentul spune raza')
o('V05', E, 'conicaDubla, senila, elice, dinCvs2 };', 'conicaDubla, senila, dinCvs2 };', 'elice', 'elicea scoasă din tipurile motorului')

# Atelierul (e2e).
o('E01', A, '    ["propulsie", "Elice", [["elice", "Elice"]]]', '    ["roti2", "Elice", [["elice", "Elice"]]]', 'e2e', 'fila Elice, cu altă cheie (familia `propulsie` lipsește)')
o('E02', A, 'elice: { palete: 3, diametru: 72, pas: 0.7, latime: 30, forma: "rot",', 'elice: { palete: 4, diametru: 72, pas: 0.7, latime: 30, forma: "rot",', 'e2e', 'editorul pornește cu 4 palete')
o('E03', A, 'elice: { palete: 3, diametru: 72, pas: 0.7, latime: 30, forma: "rot",', 'elice: { palete: 3, diametru: 72, pas: 0.7, latime: 35, forma: "rot",', 'e2e', 'editorul pornește cu lățimea 35 %')
o('E04', A, 'forma: "rot", paleta: "rasucita", profil: "placa", sens: "dreapta", gaura: "x", con: "nu" },',
  'forma: "drept", paleta: "rasucita", profil: "placa", sens: "dreapta", gaura: "x", con: "nu" },', 'e2e', 'editorul pornește cu paleta dreaptă')
o('E05', A, 'forma: "rot", paleta: "rasucita", profil: "placa", sens: "dreapta", gaura: "x", con: "nu" },',
  'forma: "rot", paleta: "rasucita", profil: "aripa", sens: "dreapta", gaura: "x", con: "nu" },', 'e2e', 'editorul pornește cu profilul de aripă')
o('E06', A, 'const pl = d.paleta === "plata" ? tr(", plată") : "", s = d.sens === "stanga" ? tr(", stânga") : "",',
  'const pl = d.paleta === "plata" ? tr(", plată") : "", s = d.sens === "dreapta" ? tr(", stânga") : "",', 'e2e', 'numele: „stânga” la elicea pe dreapta')
o('E07', A, 'const pl = d.paleta === "plata" ? tr(", plată") : "", s = d.sens === "stanga" ? tr(", stânga") : "",',
  'const pl = "", s = d.sens === "stanga" ? tr(", stânga") : "",', 'e2e', 'numele nu spune paleta plată')
o('E08', A, 'const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "b" ? tr(", pentru bară") : d.gaura === "nu" ? tr(", fără gaură") : "";\n      const pl',
  'const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";\n      const pl', 'e2e', 'numele nu spune gaura pentru bară')
o('E09', A, 'return tr`Elice Ø${fmt(d.diametru ?? 72, 1)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 0.7, 2)}${pl}${s}${g}${c}`;',
  'return tr`Elice Ø${fmt(d.diametru ?? 72, 0)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 0.7, 2)}${pl}${s}${g}${c}`;', 'e2e', 'numele: diametrul fără zecimală')
o('E10', A, 'return tr`Elice Ø${fmt(d.diametru ?? 72, 1)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 0.7, 2)}${pl}${s}${g}${c}`;',
  'return tr`Elice Ø${fmt(d.diametru ?? 72, 1)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 0.7, 1)}${pl}${s}${g}${c}`;', 'e2e', 'numele: pasul cu o zecimală')
o('E11', A, 'c = d.con === "da" ? tr(", cu con") : "";\n      return tr`Elice', 'c = "";\n      return tr`Elice', 'e2e', 'numele nu spune conul')
o('E12', A, 'const c = Lego.eliceCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 0);', 'const c = Lego.eliceCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 1);', 'e2e',
  'textul elicei: unghiurile cu zecimală')
o('E13', A, 'const paleta = c.plata ? tr`Paleta plată, la ${g(c.bVarf)}° de la butuc la vârf, ca la LEGO.`', 'const paleta = !c.plata ? tr`Paleta plată, la ${g(c.bVarf)}° de la butuc la vârf, ca la LEGO.`', 'e2e',
  'textul elicei: plata și răsucita, pe dos')
o('E14', A, 'tr`Paleta răsucită: ${g(c.bRad)}° lângă butuc, ${g(c.bVarf)}° la vârf.`;', 'tr`Paleta răsucită: ${g(c.bVarf)}° lângă butuc, ${g(c.bRad)}° la vârf.`;', 'e2e',
  'textul elicei: unghiurile de la butuc și de la vârf, inversate')
o('E15', A, 'return tr`Pasul ${fmt(c.P, 0)} mm (${fmt(c.pd, 2)} × diametrul). ${paleta} Se tipărește fără suport: la vârf, un strat iese cu ${fmt(c.consola, 1)} mm',
  'return tr`Pasul ${fmt(c.D, 0)} mm (${fmt(c.pd, 2)} × diametrul). ${paleta} Se tipărește fără suport: la vârf, un strat iese cu ${fmt(c.consola, 1)} mm', 'e2e',
  'textul elicei: diametrul în locul pasului')
o('E16', A, 'un strat iese cu ${fmt(c.consola, 1)} mm peste cel de dedesubt.`;', 'un strat iese cu ${fmt(c.consola, 0)} mm peste cel de dedesubt.`;', 'e2e',
  'textul elicei: consola la milimetru (0,9 devine 1)')
L1 = '    "6041": { palete: 3, diametru: 27.4, pas: 0.93, latime: 60, forma: "drept", paleta: "plata", sens: "stanga", gaura: "x" },'
L2 = '    "92842": { palete: 3, diametru: 43.1, pas: 0.59, latime: 29, forma: "drept", paleta: "plata", sens: "dreapta", gaura: "r" },'
L3 = '    "15790": { palete: 3, diametru: 73.9, pas: 0.59, latime: 25, forma: "drept", paleta: "plata", sens: "dreapta", gaura: "r" },'
o('L01', A, L1, L1.replace('diametru: 27.4', 'diametru: 30.2'), 'e2e', '„Ca LEGO 6041” cu diametrul măsurat față de centrul cutiei (30,2)')
o('L02', A, L1, L1.replace('sens: "stanga"', 'sens: "dreapta"'), 'e2e', '„Ca LEGO 6041” pe dreapta (piesa LEGO e pe stânga)')
o('L03', A, L1, L1.replace(' sens: "stanga",', ''), 'e2e', '„Ca LEGO 6041” fără sens (rămâne cel de dinainte)')
o('L04', A, L1, L1.replace('pas: 0.93', 'pas: 0.9'), 'e2e', '„Ca LEGO 6041” cu pasul 0,9')
o('L05', A, L1, L1.replace('latime: 60', 'latime: 55'), 'e2e', '„Ca LEGO 6041” cu lățimea 55 %')
o('L06', A, L1, L1.replace('gaura: "x"', 'gaura: "r"'), 'e2e', '„Ca LEGO 6041” cu gaură rotundă (piesa are gaură de ax)')
o('L07', A, L2, L2.replace('diametru: 43.1', 'diametru: 48.5'), 'e2e', '„Ca LEGO 92842” cu diametrul măsurat față de centrul cutiei (48,5)')
o('L08', A, L2, L2.replace('pas: 0.59', 'pas: 0.55'), 'e2e', '„Ca LEGO 92842” cu pasul 0,55')
o('L09', A, L2, L2.replace('latime: 29', 'latime: 25'), 'e2e', '„Ca LEGO 92842” cu lățimea 25 %')
o('L10', A, L2, L2.replace(' sens: "dreapta",', ''), 'e2e', '„Ca LEGO 92842” fără sens (după 6041, rămâne pe stânga)')
o('L11', A, L2, L2.replace('gaura: "r"', 'gaura: "x"'), 'e2e', '„Ca LEGO 92842” cu gaură de ax')
o('L12', A, L3, L3.replace('diametru: 73.9', 'diametru: 83.3'), 'e2e', '„Ca LEGO 15790” cu diametrul măsurat față de centrul cutiei (83,3)')
o('L13', A, L3, L3.replace('pas: 0.59', 'pas: 0.55'), 'e2e', '„Ca LEGO 15790” cu pasul 0,55 (14°, nu 15°)')
o('L14', A, L3, L3.replace('latime: 25', 'latime: 29'), 'e2e', '„Ca LEGO 15790” cu lățimea 29 %')
o('L15', A, L3, L3.replace('forma: "drept"', 'forma: "rot"'), 'e2e', '„Ca LEGO 15790” cu paleta rotunjită')
o('L16', A, L3, L3.replace('paleta: "plata"', 'paleta: "rasucita"'), 'e2e', '„Ca LEGO 15790” cu paleta răsucită')
o('L17', A, L3, L3.replace('palete: 3,', 'palete: 4,'), 'e2e', '„Ca LEGO 15790” cu 4 palete')
o('L18', A, 'Object.entries(ELICE_LEGO[k]!).every(([c, v]) => (p as Record<string, unknown>)[c] === v)) ?? "";',
  'Object.entries(ELICE_LEGO[k]!).some(([c, v]) => (p as Record<string, unknown>)[c] === v)) ?? "";', 'e2e', '„Ca LEGO” rămâne apăsat după o schimbare')
o('L19', A, 'alege("#at-el-repede", v => { Object.assign(p, ELICE_LEGO[v]); });', 'alege("#at-el-repede", v => { Object.assign(p, ELICE_LEGO["15790"]); });', 'e2e',
  'orice „Ca LEGO” pune 15790')
o('F01', A, 'alege("#at-el-forma", v => { p.forma = v; });', 'alege("#at-el-forma", v => { p.forma = "rot"; });', 'e2e', 'forma: alegerea nu schimbă nimic')
o('F02', A, 'alege("#at-el-paleta", v => { p.paleta = v; });', 'alege("#at-el-paleta", v => { p.paleta = "rasucita"; });', 'e2e', 'paleta: plata nu se poate alege')
o('F03', A, 'alege("#at-el-profil", v => { p.profil = v; });', 'alege("#at-el-profil", v => { p.profil = "placa"; });', 'e2e', 'profilul: aripa nu se poate alege')
o('F04', A, 'alege("#at-el-sens", v => { p.sens = v; });', 'alege("#at-el-sens", v => { p.sens = "dreapta"; });', 'e2e', 'sensul: stânga nu se poate alege')
o('F05', A, 'alege("#at-el-gaura", v => { p.gaura = v; });', 'alege("#at-el-gaura", v => { p.gaura = v === "b" ? "r" : v; });', 'e2e', 'gaura: bara devine rotundă')
o('F06', A, 'alege("#at-el-con", v => { p.con = v; });', 'alege("#at-el-con", v => { p.con = "nu"; });', 'e2e', 'conul nu se poate alege')
o('F07', A, 'camp("#at-el-palete", 0, 2, 8, v => { p.palete = v; });', 'camp("#at-el-palete", 0, 2, 9, v => { p.palete = v; });', 'e2e', 'câmpul paletelor primește 9')
o('F08', A, 'camp("#at-el-palete", 0, 2, 8, v => { p.palete = v; });', 'camp("#at-el-palete", 0, 1, 8, v => { p.palete = v; });', 'e2e', 'câmpul paletelor primește 1')
o('F09', A, 'camp("#at-el-palete", 0, 2, 8, v => { p.palete = v; });', 'camp("#at-el-palete", 1, 2, 8, v => { p.palete = v; });', 'e2e', 'paletele cu zecimală (4,4 palete)')
o('F10', A, 'camp("#at-el-diam", 1, 20, 200, v => { p.diametru = v; });', 'camp("#at-el-diam", 1, 20, 201, v => { p.diametru = v; });', 'e2e', 'câmpul diametrului primește 200,1')
o('F11', A, 'camp("#at-el-diam", 1, 20, 200, v => { p.diametru = v; });', 'camp("#at-el-diam", 1, 19, 200, v => { p.diametru = v; });', 'e2e', 'câmpul diametrului primește 19,9')
o('F12', A, 'camp("#at-el-diam", 1, 20, 200, v => { p.diametru = v; });', 'camp("#at-el-diam", 0, 20, 200, v => { p.diametru = v; });', 'e2e', 'diametrul rotunjit la milimetru')
o('F13', A, 'camp("#at-el-pas", 2, 0.3, 1.5, v => { p.pas = v; });', 'camp("#at-el-pas", 2, 0.3, 1.6, v => { p.pas = v; });', 'e2e', 'câmpul pasului primește 1,51')
o('F14', A, 'camp("#at-el-pas", 2, 0.3, 1.5, v => { p.pas = v; });', 'camp("#at-el-pas", 2, 0.2, 1.5, v => { p.pas = v; });', 'e2e', 'câmpul pasului primește 0,29')
o('F15', A, 'camp("#at-el-pas", 2, 0.3, 1.5, v => { p.pas = v; });', 'camp("#at-el-pas", 3, 0.3, 1.5, v => { p.pas = v; });', 'e2e', 'pasul la miime (1,204)')
o('F16', A, 'camp("#at-el-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-el-lat", 0, 15, 61, v => { p.latime = v; });', 'e2e', 'câmpul lățimii primește 61')
o('F17', A, 'camp("#at-el-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-el-lat", 0, 14, 60, v => { p.latime = v; });', 'e2e', 'câmpul lățimii primește 14')
o('F18', A, 'camp("#at-el-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-el-lat", 1, 15, 60, v => { p.latime = v; });', 'e2e', 'lățimea cu zecimală (44,6)')
o('F19', A, 'camp("#at-el-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-el-lat", 0, 15, 60, v => { p.pas = 0.7; });', 'e2e', 'câmpul lățimii nu ajunge în piesă')
o('R01', A, '    pune({ ...d, sens: "stanga" }, n);\n    salveaza(); randeazaLista();\n    toast(tr`${n} × perechea de elice',
  '    pune({ ...d, sens: "dreapta" }, n);\n    salveaza(); randeazaLista();\n    toast(tr`${n} × perechea de elice', 'e2e', '„Fă perechea” pune două elice pe dreapta')
o('R02', A, '    pune({ ...d, sens: "dreapta" }, n);\n    pune({ ...d, sens: "stanga" }, n);', '    pune({ ...d }, n);\n    pune({ ...d, sens: "stanga" }, n);', 'e2e',
  '„Fă perechea” din elicea pe stânga pune două pe stânga')
o('R03', A, '    pune({ ...d, sens: "dreapta" }, n);\n    pune({ ...d, sens: "stanga" }, n);', '    pune({ ...d, sens: "dreapta" }, n);\n    pune({ ...d, sens: "stanga" }, 1);', 'e2e',
  '„Fă perechea” pune o singură elice pe stânga, oricâte bucăți sunt cerute')
o('R04', A, '$("#at-el-pereche").onclick = adaugaPerecheElice;', '$("#at-el-pereche").onclick = adaugaInLista;', 'e2e', '„Fă perechea” doar adaugă elicea din editor')

# Redesenarea editorului cât omul scrie într-un câmp (e2e): fără luarea câmpului întâi, piesa are 4 palete și editorul 3.
# Lăsată afară, ca echivalentă (rulată pe a6e044d: scăpată, 6 / 6): luarea câmpului mutată după `const t = stare.tip` (un câmp
# nu schimbă piesa aleasă, iar marcajul se face oricum după).
o('D01', A, '    if (activ instanceof HTMLElement && e.contains(activ)) activ.blur();\n', '', 'e2e',
  'redesenarea editorului nu ia întâi câmpul în care scrie omul (piesa și editorul spun lucruri diferite)')

# Pictograma și traducerea (unitare).
o('G01', A, '    elice: `<circle cx="12" cy="12" r="2.2"/><path d="M10.7 10.2C7.8', '    elice2: `<circle cx="12" cy="12" r="2.2"/><path d="M10.7 10.2C7.8', 'pictograme', 'elicea fără pictogramă')
o('T01', T, ' "Elice": "Propeller",', ' "Elice": "",', 'engleza', 'numele elicei, netradus')

SETURI = {
    'elice': ['test/unit/trenulet.elice.test.ts'],
    'pictograme': ['test/unit/trenulet.pictograme.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.elice.spec.ts']

for x in O:
    assert x['vechi'] != x['nou'], x['id']
