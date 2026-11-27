# Lista de otrăvuri a feliei 3.Ts (ventilatorul cu carcasă în atelierul Easy 3Draw, ADR 0282), 24.11.2026, alese de autor:
# cotele din parametri (`ventilatorCote`: implicitele, marginile plajei, jocul, butucul, stațiile paletei, coarda și grosimea,
# limita de 85 % din pasul dintre palete, butucul și inelul cât paletele, carcasa cât paletele + 4, locul găurilor pe grila
# axului), rotorul (paletele, sensul, butucul, inelul), carcasa (tubul, urechile, găurile cu lamaj în trei straturi, canalul de
# deasupra urechii, cercul cu laturile lui), avertismentele; atelierul (galeria, implicitele editorului, piesa, numele, textul,
# „Repede”, alegerile, câmpurile cu plaja și rotunjirea lor, „Fă ventilatorul”), pictograma și traducerea. Textele fără
# diacritice rămase în română se văd doar în cvs2, în engleză: lista lor e `3.Ts-en.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit; setul „e2e” e
# `test/e2e/trenulet.ventilator.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Lăsate afară, ca echivalente (cu motivul; cele rulate, cu rezultatul lor, în registrul `docs/otravuri.md`):
# - `c = Math.max(t, c * U / latime(sec) * 0.995)` fără `* 0.995` și `Math.ceil(… - 1e-9)` fără `- 1e-9`: aceleași motive ca la
#   elicea de barcă (3.Tr);
# - `arc(f + (taie ? ai : -1e-6), …)` cu `-1e-6` schimbat: orice prag sub o latură a cercului dă aceleași vârfuri;
# - în editor, `rotor = p.piesa !== "carcasa"` față de `=== "rotor"`: piesa e doar una dintre cele două;
# - în `defVentilator`, `tip` după celelalte chei (rulată ca E49, scăpată): ambele căi spre listă („Fă ventilatorul” și
#   editorul) trec prin aceeași funcție, deci cheile ies în aceeași ordine oricum ar fi ea.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = '  const VENT = { butucMin: 4, butucRap: 0.25, butucH: 8, tRad: 1.2, tVarf: 0.8, radacina: 0.6, plin: 0.25, umplere: 0.85, statii: 28, perete: 2, inelGros: 1.2, inelIn: 0.4, inelH: 2, peste: 4, rest: 0.8, sageata: 0.02 };'

# Cotele din parametri: `ventilatorCote` (unitare).
Z = 'const z = Math.round(Math.min(12, Math.max(3, nr(d.palete, 7))));'
o('C01', E, Z, Z.replace('nr(d.palete, 7)', 'nr(d.palete, 6)'), 'vent', 'ventilatorul implicit cu 6 palete')
o('C02', E, Z, Z.replace('Math.min(12,', 'Math.min(14,'), 'vent', '14 palete')
o('C03', E, Z, Z.replace('Math.max(3,', 'Math.max(2,'), 'vent', '2 palete')
o('C04', E, Z, Z.replace('Math.round(', 'Math.floor('), 'vent', 'paletele tăiate la întreg, nu rotunjite')
D = 'const D = Math.min(120, Math.max(24, nr(d.diametru, 40))), Ri = D / 2;'
o('C05', E, D, D.replace('nr(d.diametru, 40)', 'nr(d.diametru, 48)'), 'vent', 'diametrul implicit, 48')
o('C06', E, D, D.replace('Math.min(120,', 'Math.min(150,'), 'vent', 'diametrul până la 150')
o('C07', E, D, D.replace('Math.max(24,', 'Math.max(16,'), 'vent', 'diametrul de la 16')
J = 'const joc = Math.min(2, Math.max(0.3, nr(d.joc, 0.8))), Rt = Ri - joc;'
o('C08', E, J, J.replace('nr(d.joc, 0.8)', 'nr(d.joc, 0.5)'), 'vent', 'jocul implicit, 0,5')
o('C09', E, J, J.replace('Math.min(2,', 'Math.min(3,'), 'vent', 'jocul până la 3')
o('C10', E, J, J.replace('Math.max(0.3,', 'Math.max(0.1,'), 'vent', 'jocul de la 0,1 (paletele ating carcasa)')
o('C11', E, J, J.replace('Rt = Ri - joc;', 'Rt = Ri - joc / 2;'), 'vent', 'vârful la jumătate de joc de carcasă')
PD = 'const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.8))), pasM = pd * D;'
o('C12', E, PD, PD.replace('nr(d.pas, 0.8)', 'nr(d.pas, 0.7)'), 'vent', 'pasul implicit, 0,7')
o('C13', E, PD, PD.replace('Math.min(1.5,', 'Math.min(2,'), 'vent', 'pasul până la 2')
o('C14', E, PD, PD.replace('Math.max(0.3,', 'Math.max(0.2,'), 'vent', 'pasul de la 0,2')
o('C15', E, PD, PD.replace('pasM = pd * D;', 'pasM = pd * Ri;'), 'vent', 'pasul față de rază, nu față de diametru')
LU = 'const lat = Math.min(60, Math.max(15, nr(d.latime, 45))), urechi = +(d.urechi as number) === 4 ? 4 : 2;'
o('C16', E, LU, LU.replace('nr(d.latime, 45)', 'nr(d.latime, 40)'), 'vent', 'lățimea implicită, 40 %')
o('C17', E, LU, LU.replace('Math.min(60,', 'Math.min(80,'), 'vent', 'lățimea până la 80 %')
o('C18', E, LU, LU.replace('Math.max(15,', 'Math.max(10,'), 'vent', 'lățimea de la 10 %')
o('C19', E, LU, LU.replace('=== 4 ? 4 : 2;', '>= 3 ? 4 : 2;'), 'vent', '3 urechi devin 4')
o('C20', E, LU, LU.replace('=== 4 ? 4 : 2;', '=== 4 ? 4 : 3;'), 'vent', 'implicit 3 urechi')
RH = 'const rh = Math.max(VENT.butucMin, Math.round(VENT.butucRap * Rt * 10) / 10), cmax = lat / 100 * Rt;'
o('C21', E, RH, RH.replace('Math.round(VENT.butucRap * Rt * 10) / 10', 'VENT.butucRap * Rt'), 'vent', 'raza butucului, nerotunjită la zecime')
o('C22', E, RH, RH.replace('VENT.butucRap * Rt * 10', 'VENT.butucRap * Ri * 10'), 'vent', 'butucul din raza carcasei, nu a vârfului')
o('C23', E, RH, RH.replace('cmax = lat / 100 * Rt;', 'cmax = lat / 100 * Ri;'), 'vent', 'lățimea din raza carcasei, nu a vârfului')
o('C24', E, K, K.replace('butucRap: 0.25,', 'butucRap: 0.3,'), 'vent', 'butucul, 30 % din rază')
o('C25', E, K, K.replace('butucMin: 4,', 'butucMin: 3,'), 'vent', 'butucul de Ø6 (gaura de ax fără perete)')
B = 'const beta = (r: number) => Math.atan(pasM / (2 * Math.PI * r));\n    // secțiunile, de la 0,4 mm în butuc'
o('C26', E, B, B.replace('Math.atan(pasM / (2 * Math.PI * r))', 'Math.atan(pasM / (Math.PI * r))'), 'vent', 'unghiul paletei, de două ori pasul')
o('C27', E, 'const N = VENT.statii, r0 = rh - 0.4;', 'const N = VENT.statii, r0 = rh - 0.2;', 'vent', 'rădăcina paletei, doar 0,2 mm în butuc')
o('C28', E, K, K.replace('statii: 28,', 'statii: 24,'), 'vent', '25 de stații, nu 29')
X = 'const r = r0 + (Rb - r0) * i / N, x = Math.max(0, (r - rh) / (Rb - rh)), b = beta(r);'
o('C29', E, X, X.replace('(r - rh) / (Rb - rh)', '(r - r0) / (Rb - r0)'), 'vent', 'locul pe paletă, de la rădăcina din butuc')
G = 'const g = VENT.radacina + (1 - VENT.radacina) * Math.min(1, x / VENT.plin), t = VENT.tRad - (VENT.tRad - VENT.tVarf) * x;'
o('C30', E, G, G.replace('Math.min(1, x / VENT.plin)', 'x'), 'vent', 'coarda crește până la vârf, nu doar pe primul sfert')
o('C31', E, K, K.replace('radacina: 0.6,', 'radacina: 0.8,'), 'vent', 'rădăcina, 80 % din lățime')
o('C32', E, K, K.replace('plin: 0.25,', 'plin: 0.5,'), 'vent', 'toată lățimea abia la jumătatea paletei')
o('C33', E, K, K.replace('tVarf: 0.8,', 'tVarf: 1,'), 'vent', 'vârful gros de 1')
o('C34', E, K, K.replace('tRad: 1.2,', 'tRad: 1.6,'), 'vent', 'rădăcina groasă de 1,6')
o('C35', E, G, G.replace('t = VENT.tRad - (VENT.tRad - VENT.tVarf) * x;', 't = VENT.tRad;'), 'vent', 'grosimea, aceeași până la vârf')
o('C36', E, K, K.replace('umplere: 0.85,', 'umplere: 0.95,'), 'vent', 'paletele, până la 95 % din pasul dintre ele')
U = 'const U = VENT.umplere * 2 * Math.PI * r / z;\n        let c = Math.max(t, cmax * g)'
o('C37', E, U, U.replace('2 * Math.PI * r / z', '2 * Math.PI * Rb / z'), 'vent', 'limita din pasul de la vârf, nu de pe fiecare rază')
o('C38', E, 'for (let k = 0; k < 40 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }\n        const zmin = Math.min(...sec.map(p => p[1]));\n        hb = Math.max(hb,',
  'for (let k = 0; k < 0 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }\n        const zmin = Math.min(...sec.map(p => p[1]));\n        hb = Math.max(hb,', 'vent', 'fără limita de 85 %: paletele se ating lângă butuc')
o('C39', E, 'let c = Math.max(t, cmax * g), sec = roteste(c);\n        for (let k = 0; k < 40', 'let c = Math.max(t, cmax), sec = roteste(c);\n        for (let k = 0; k < 40', 'vent', 'coarda fără rădăcina de 60 %')
o('C40', E, 'return { r, sec: sec.map(([s, h]): P2 => [s, h - zmin]) };\n      });\n      return { statii, hb };', 'return { r, sec: sec.map(([s, h]): P2 => [s, h - zmin + 0.2]) };\n      });\n      return { statii, hb };', 'vent', 'secțiunile ridicate cu 0,2 de pe masă')
o('C41', E, 'hb = Math.max(hb, Math.max(...sec.map(p => p[1])) - zmin);', 'hb = Math.max(hb, Math.max(...sec.map(p => p[1])));', 'vent', 'cea mai înaltă secțiune, fără să scadă jos-ul ei')
I = 'const inel = d.inel === "da", fara = sectiuni(Rt), cu = inel ? sectiuni(Rt - VENT.inelGros + VENT.inelIn) : fara;'
o('C42', E, I, I.replace('cu = inel ? sectiuni(Rt - VENT.inelGros + VENT.inelIn) : fara;', 'cu = fara;'), 'vent', 'cu inel, paletele trec de el până la vârf')
o('C43', E, K, K.replace('inelIn: 0.4,', 'inelIn: 0.2,'), 'vent', 'paletele intră în inel doar 0,2')
o('C44', E, K, K.replace('inelGros: 1.2,', 'inelGros: 1.6,'), 'vent', 'inelul gros de 1,6')
o('C45', E, K, K.replace('inelH: 2,', 'inelH: 1,'), 'vent', 'inelul de cel puțin 1 mm')
o('C46', E, 'const zecime = (h: number) => Math.ceil(h * 10 - 1e-9) / 10;', 'const zecime = (h: number) => Math.round(h * 10) / 10;', 'vent', 'înălțimile rotunjite, nu în sus (paletele ies din butuc și din inel)')
HC = 'const Hc = Math.max(VENT.butucH, Math.ceil(fara.hb - 1e-9) + VENT.peste);'
o('C47', E, HC, HC.replace('Math.ceil(fara.hb - 1e-9) + VENT.peste', 'Math.ceil(cu.hb - 1e-9) + VENT.peste'), 'vent', 'carcasa după rotorul cu inel (alta cu inel)')
o('C48', E, K, K.replace('peste: 4,', 'peste: 2,'), 'vent', 'carcasa doar cu 2 mm peste palete')
o('C49', E, HC, HC.replace('Math.max(VENT.butucH,', 'Math.max(6,'), 'vent', 'carcasa de cel puțin 6')
KK = 'const k = Math.ceil((Ri + VENT.rest + ef().lamajD / 2) / P.pas - 1e-9);'
o('C50', E, KK, KK.replace('Math.ceil(', 'Math.round('), 'vent', 'găurile urechilor la cel mai apropiat știft (lamajul intră în tub)')
o('C51', E, K, K.replace('rest: 0.8,', 'rest: 2,'), 'vent', 'găurile cu lamajul în afara tubului')
o('C52', E, KK, KK.replace('ef().lamajD / 2', 'ef().gauraD / 2'), 'vent', 'locul găurilor după gaură, nu după lamaj')
HR = 'Hh: Math.max(VENT.butucH, zecime(cu.hb)), Hinel: Math.max(VENT.inelH, zecime(cu.hb)), Hc, k,'
o('C53', E, HR, HR.replace('Hh: Math.max(VENT.butucH, zecime(cu.hb))', 'Hh: VENT.butucH'), 'vent', 'butucul de 8, oricât de înalte ar fi paletele')
o('C54', E, HR, HR.replace('Hinel: Math.max(VENT.inelH, zecime(cu.hb))', 'Hinel: Math.max(VENT.inelH, zecime(fara.hb))'), 'vent', 'inelul cât paletele fără inel')
o('C55', E, 'bRad: beta(rh), bVarf: beta(Rt), consola: 0.2 / Math.tan(beta(Rt)) };',
  'bRad: beta(rh - 0.4), bVarf: beta(Rt), consola: 0.2 / Math.tan(beta(Rt)) };', 'vent', 'unghiul de la butuc, la rădăcina din el')
o('C56', E, 'bRad: beta(rh), bVarf: beta(Rt), consola: 0.2 / Math.tan(beta(Rt)) };',
  'bRad: beta(rh), bVarf: beta(Rt), consola: 0.2 * Math.tan(beta(Rt)) };', 'vent', 'consola cu tangenta, nu cu cotangenta')

# Carcasa: `carcasaVentilator` (unitare).
o('K01', E, K, K.replace('perete: 2,', 'perete: 1.6,'), 'vent', 'peretele carcasei de 1,6')
o('K02', E, K, K.replace('sageata: 0.02 };', 'sageata: 0.2 };'), 'vent', 'cercurile cu laturi mai lungi (săgeata 0,2)')
o('K03', E, 'const laturiCerc = (R: number) => Math.max(N_CERC, 8 * Math.ceil(Math.PI / Math.acos(1 - VENT.sageata / R) / 8));',
  'const laturiCerc = (R: number) => Math.max(N_CERC, 6 * Math.ceil(Math.PI / Math.acos(1 - VENT.sageata / R) / 6));', 'vent', 'laturile cercului, multiplu de 6 (urechile nu mai cad pe vârfuri)')
CV = 'const e = ef(), R2 = q.Ri + VENT.perete, n = laturiCerc(R2), w = P.grinda_lat / 2, g = P.grinda_groasa, h = P.lamaj_h, rl = e.lamajD / 2;'
o('K04', E, CV, CV.replace('w = P.grinda_lat / 2,', 'w = P.grinda_lat / 2 + 0.4,'), 'vent', 'urechea mai lată decât grinda')
o('K05', E, CV, CV.replace('g = P.grinda_groasa,', 'g = P.grinda_groasa + 0.2,'), 'vent', 'urechea mai groasă decât grinda (știftul nu se prinde)')
o('K06', E, CV, CV.replace('h = P.lamaj_h,', 'h = P.lamaj_h / 2,'), 'vent', 'lamajul de 0,4')
o('K07', E, CV, CV.replace('rl = e.lamajD / 2;', 'rl = e.gauraD / 2;'), 'vent', 'canalul de deasupra urechii, cât gaura (gulerul știftului nu încape)')
XH = 'const xh = P.pas * q.k, xc = Math.sqrt(R2 * R2 - w * w), a0 = Math.asin(w / R2), u = q.urechi;'
o('K08', E, XH, XH.replace('const xh = P.pas * q.k,', 'const xh = P.pas * q.k + 0.5,'), 'vent', 'găurile urechilor în afara grilei axului')
o('K09', E, XH, XH.replace('xc = Math.sqrt(R2 * R2 - w * w)', 'xc = R2 + 0.5'), 'vent', 'urechea lipită de tub doar de la marginea lui (fantă între ele)')
TA = 'const taie = xh - rl < R2 - 1e-6, xi = (R2 * R2 - rl * rl + xh * xh) / (2 * xh), yi = taie ? Math.sqrt(R2 * R2 - xi * xi) : 0, ai = Math.atan2(yi, xi);'
o('K10', E, TA, TA.replace('const taie = xh - rl < R2 - 1e-6,', 'const taie = false,'), 'vent', 'fără canal deasupra urechii')
o('K11', E, 'if (taie) tub.push(rot(f, [xi, -yi]), ...inTub.map(([p]) => p as P2), rot(f, [xi, yi]));', 'if (taie) tub.push(rot(f, [xi, -yi]), rot(f, [xi, yi]));', 'vent', 'canalul tăiat drept, nu pe cercul lamajului')
o('K12', E, 'for (let s = 1; s < 12; s++) { const a = -Math.PI / 2 + Math.PI * s / 12; ext.push(rot(f, [xh + w * Math.cos(a), w * Math.sin(a)])); }',
  'for (let s = 1; s < 12; s++) { const a = -Math.PI / 2 + Math.PI * s / 12; ext.push(rot(f, [xh + 0.5 * w * Math.cos(a), w * Math.sin(a)])); }', 'vent', 'capătul urechii turtit (marginea găurii prea subțire)')
o('K13', E, 'const f = 2 * Math.PI * j / u, c = rot(f, [xh, 0]), lam = cerc(c[0], c[1], rl);', 'const f = Math.PI * j / u, c = rot(f, [xh, 0]), lam = cerc(c[0], c[1], rl);', 'vent', 'urechile pe o jumătate de cerc')
GA = 'return [...prismaGauri(ext, gauri(e.lamajD), 0, h), ...prismaGauri(ext, gauri(e.gauraD), h - 0.01, g - h + 0.01),'
o('K14', E, GA, GA.replace('prismaGauri(ext, gauri(e.lamajD), 0, h)', 'prismaGauri(ext, gauri(e.gauraD), 0, h)'), 'vent', 'fără lamaj jos')
o('K15', E, GA, GA.replace('gauri(e.gauraD), h - 0.01', 'gauri(e.lamajD), h - 0.01'), 'vent', 'gaura cât lamajul (știftul nu ține)')
o('K16', E, '...prismaGauri(ext, gauri(e.lamajD), g - h, g), ...prismaGauri(tub, [gol], g - 0.01, q.Hc)];', '...prismaGauri(ext, gauri(e.gauraD), g - h, g), ...prismaGauri(tub, [gol], g - 0.01, q.Hc)];', 'vent', 'fără lamaj sus')
o('K17', E, '...prismaGauri(ext, gauri(e.lamajD), g - h, g), ...prismaGauri(tub, [gol], g - 0.01, q.Hc)];', '...prismaGauri(ext, gauri(e.lamajD), g - h, g), ...prismaGauri(tub, [gol], g - 0.01, q.Hc - 1)];', 'vent', 'carcasa cu 1 mm mai joasă decât spune')
o('K18', E, 'const gol = cerc(0, 0, q.Ri, n), gauri', 'const gol = cerc(0, 0, q.Ri + 0.2, n), gauri', 'vent', 'golul carcasei mai larg decât diametrul cerut')

# Rotorul și avertismentele: `ventilator` (unitare).
o('R01', E, 'if (dat(d.palete) && q.z !== +(d.palete as number)) avert.push(', 'if (false && dat(d.palete) && q.z !== +(d.palete as number)) avert.push(', 'vent', 'paletele din afara plajei, nespuse')
o('R02', E, 'if (dat(d.diametru) && q.D !== +(d.diametru as number)) avert.push(', 'if (false && dat(d.diametru) && q.D !== +(d.diametru as number)) avert.push(', 'vent', 'diametrul din afara plajei, nespus')
o('R03', E, 'return { tri: carcasaVentilator(q), avert, prinderi:', 'return { tri: carcasaVentilator(q), avert: [], prinderi:', 'vent', 'carcasa nu spune diametrul ieșit din plajă')
o('R04', E, 'const tri = paleteElice(q.statii, q.z, d.sens === "stanga" ? -1 : 1, true), butuc = butucElice(q.rh, q.Hh, d.gaura);', 'const tri = paleteElice(q.statii, q.z, 1, true), butuc = butucElice(q.rh, q.Hh, d.gaura);', 'vent', '„stânga” la fel ca „dreapta”')
o('R05', E, 'butuc = butucElice(q.rh, q.Hh, d.gaura);', 'butuc = butucElice(q.rh, q.Hh, "x");', 'vent', 'gaura rotorului, mereu pentru ax')
o('R06', E, 'tri.push(...prismaGauri(cerc(0, 0, q.Rt, n), [cerc(0, 0, q.Rt - VENT.inelGros, n)], 0, q.Hinel)); }', 'tri.push(...prismaGauri(cerc(0, 0, q.Rt, n), [cerc(0, 0, q.Rt - VENT.inelGros, n)], 0, q.Hh)); }', 'vent', 'inelul cât butucul')
o('R07', E, 'if (q.inel) { const n = laturiCerc(q.Rt);', 'if (q.inel) { const n = 24;', 'vent', 'inelul cu 24 de laturi (paletele ies din el printre colțuri)')
o('R08', E, 'senila, elice, eliceBarca, ventilator, roataPalete,', 'senila, elice, eliceBarca, roataPalete,', 'vent', 'ventilatorul nu e un tip al motorului')

# Atelierul (e2e, pe pagina de sine stătătoare).
o('E01', A, '["eliceBarca", "Elice de barcă"], ["ventilator", "Ventilator cu carcasă"], ["roataPalete"', '["eliceBarca", "Elice de barcă"], ["roataPalete"', 'e2e', 'ventilatorul lipsește din galerie')
o('E02', A, '["eliceBarca", "Elice de barcă"], ["ventilator", "Ventilator cu carcasă"], ["roataPalete"', '["ventilator", "Ventilator cu carcasă"], ["eliceBarca", "Elice de barcă"], ["roataPalete"', 'e2e', 'ventilatorul înaintea elicei de barcă')
S = '    ventilator: { piesa: "rotor", palete: 7, diametru: 40, joc: 0.8, pas: 0.8, latime: 45, sens: "dreapta", gaura: "x", inel: "nu", urechi: 2 },'
o('E03', A, S, S.replace('piesa: "rotor"', 'piesa: "carcasa"'), 'e2e', 'editorul pornește pe carcasă')
o('E04', A, S, S.replace('palete: 7,', 'palete: 5,'), 'e2e', 'editorul pornește cu 5 palete')
o('E05', A, S, S.replace('joc: 0.8,', 'joc: 1,'), 'e2e', 'editorul pornește cu jocul 1')
o('E06', A, S, S.replace('inel: "nu"', 'inel: "da"'), 'e2e', 'editorul pornește cu inel')
o('E07', A, S, S.replace('urechi: 2 }', 'urechi: 4 }'), 'e2e', 'editorul pornește cu 4 urechi')
NC = 'if (d.piesa === "carcasa") return tr`Carcasă de ventilator Ø${fmt(d.diametru ?? 40, 1)} × ${fmt(Lego.ventilatorCote(d).Hc, 1)}, cu ${+(d.urechi ?? 2) === 4 ? 4 : 2} urechi`;'
o('E08', A, NC, NC.replace('${fmt(Lego.ventilatorCote(d).Hc, 1)}', '${fmt(Lego.ventilatorCote({}).Hc, 1)}'), 'e2e', 'numele carcasei, cu înălțimea celei implicite')
o('E09', A, NC, NC.replace('${+(d.urechi ?? 2) === 4 ? 4 : 2} urechi', '2 urechi'), 'e2e', 'numele carcasei spune mereu 2 urechi')
NJ = 'const j = (d.joc ?? 0.8) !== 0.8 ? tr`, jocul ${fmt(d.joc ?? 0.8, 1)} mm` : "", l = (d.latime ?? 45) !== 45 ? tr`, lățimea ${d.latime} %` : "";'
o('E10', A, NJ, NJ.replace('const j = (d.joc ?? 0.8) !== 0.8 ?', 'const j = false ?'), 'e2e', 'jocul nu intră în nume')
o('E11', A, NJ, NJ.replace('l = (d.latime ?? 45) !== 45 ?', 'l = false ?'), 'e2e', 'lățimea nu intră în nume')
o('E12', A, 'const s = d.sens === "stanga" ? tr(", stânga") : "", i = d.inel === "da" ? tr(", cu inel") : "";', 'const s = d.sens === "stanga" ? tr(", stânga") : "", i = "";', 'e2e', 'inelul nu intră în nume')
o('E13', A, 'return tr`Rotor de ventilator Ø${fmt(d.diametru ?? 40, 1)} cu ${d.palete ?? 7} palete, pasul ${fmt(d.pas ?? 0.8, 2)}${j}${l}${s}${g}${i}`;',
  'return tr`Rotor de ventilator Ø${fmt(d.diametru ?? 40, 1)} cu ${d.palete ?? 7} palete, pasul ${fmt(d.pas ?? 0.8, 2)}${j}${l}${s}${i}${g}`;', 'e2e', 'în nume, inelul înaintea găurii')
o('E14', A, 'if (piesa === "carcasa") { delete p.sens; delete p.gaura; delete p.inel; } else delete p.urechi;', 'if (piesa === "carcasa") { delete p.gaura; delete p.inel; } else delete p.urechi;', 'e2e', 'carcasa ține sensul rotorului (aceeași carcasă, pe două linii)')
TX = 'const c = Lego.ventilatorCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 0), stf = cuDe(c.k) ? tr`${c.k} de știfturi` : tr`${c.k} știfturi`;'
o('E15', A, TX, TX.replace('stf = cuDe(c.k) ?', 'stf = true ?'), 'e2e', '„3 de știfturi”')
o('E16', A, 'const inel = p.inel === "da" ? tr` Inelul, gros de 1,2 mm, e înalt de ${fmt(c.Hinel, 1)} mm.` : "";', 'const inel = "";', 'e2e', 'textul nu spune inelul')
o('E17', A, 'Ø${fmt(c.D, 1)} în interior, Ø${fmt(c.D + 4, 1)} în afară,', 'Ø${fmt(c.D, 1)} în interior, Ø${fmt(c.D + 2, 1)} în afară,', 'e2e', 'textul spune peretele de 1')
o('E18', A, 'găurile urechilor, la ${8 * c.k} mm de ax (${stf}).', 'găurile urechilor, la ${8 * c.k + 8} mm de ax (${stf}).', 'e2e', 'textul pune găurile cu un știft mai departe')
o('E19', A, 'paletele până la Ø${fmt(2 * c.Rt, 1)} (${fmt(c.joc, 1)} mm de carcasă), pe un butuc de Ø${fmt(2 * c.rh, 1)}', 'paletele până la Ø${fmt(c.D, 1)} (${fmt(c.joc, 1)} mm de carcasă), pe un butuc de Ø${fmt(2 * c.rh, 1)}', 'e2e', 'textul pune vârful la diametrul carcasei')
o('E20', A, 'seg("at-ve-repede", [["24", "Ø24"], ["32", "Ø32"], ["40", "Ø40"], ["48", "Ø48"]], String(p.diametru))', 'seg("at-ve-repede", [["24", "Ø24"], ["32", "Ø32"], ["40", "Ø40"], ["56", "Ø48"]], String(p.diametru))', 'e2e', '„Ø48” face Ø56')
o('E21', A, '${rotor ? `<div class="at-rand"><span class="mic">Sensul:</span>${seg("at-ve-sens"', '${true ? `<div class="at-rand"><span class="mic">Sensul:</span>${seg("at-ve-sens"', 'e2e', 'carcasa arată sensul, gaura și inelul, fără urechi')
o('E22', A, 'const p = JSON.parse(JSON.stringify({ ...stare.ventilator, piesa }));', 'const p = JSON.parse(JSON.stringify({ piesa, ...stare.ventilator }));', 'e2e', '„Fă ventilatorul” pune piesa din editor de două ori')
o('E23', A, 'alege("#at-ve-piesa", v => { p.piesa = v; });', 'alege("#at-ve-piesa", () => {});', 'e2e', 'piesa nu se schimbă')
o('E24', A, 'alege("#at-ve-repede", v => { p.diametru = +v; });', 'alege("#at-ve-repede", () => {});', 'e2e', '„Repede” nu schimbă diametrul')
o('E25', A, 'alege("#at-ve-sens", v => { p.sens = v; });', 'alege("#at-ve-sens", () => {});', 'e2e', 'sensul nu ajunge în piesă')
o('E26', A, 'alege("#at-ve-gaura", v => { p.gaura = v; });', 'alege("#at-ve-gaura", () => {});', 'e2e', 'gaura nu ajunge în piesă')
o('E27', A, 'alege("#at-ve-inel", v => { p.inel = v; });', 'alege("#at-ve-inel", () => {});', 'e2e', 'inelul nu ajunge în piesă')
o('E28', A, 'alege("#at-ve-urechi", v => { p.urechi = +v; });', 'alege("#at-ve-urechi", () => {});', 'e2e', 'urechile nu ajung în piesă')
o('E29', A, 'camp("#at-ve-palete", 0, 3, 12, v => { p.palete = v; });', 'camp("#at-ve-palete", 0, 3, 13, v => { p.palete = v; });', 'e2e', 'câmpul paletelor primește 13')
o('E30', A, 'camp("#at-ve-palete", 0, 3, 12, v => { p.palete = v; });', 'camp("#at-ve-palete", 0, 2, 12, v => { p.palete = v; });', 'e2e', 'câmpul paletelor primește 2')
o('E31', A, 'camp("#at-ve-palete", 0, 3, 12, v => { p.palete = v; });', 'camp("#at-ve-palete", 1, 3, 12, v => { p.palete = v; });', 'e2e', 'paletele cu zecimi')
o('E32', A, 'camp("#at-ve-diam", 1, 24, 120, v => { p.diametru = v; });', 'camp("#at-ve-diam", 0, 24, 120, v => { p.diametru = v; });', 'e2e', 'diametrul la milimetru')
o('E33', A, 'camp("#at-ve-diam", 1, 24, 120, v => { p.diametru = v; });', 'camp("#at-ve-diam", 1, 24, 121, v => { p.diametru = v; });', 'e2e', 'diametrul peste 120')
o('E34', A, 'camp("#at-ve-diam", 1, 24, 120, v => { p.diametru = v; });', 'camp("#at-ve-diam", 1, 23, 120, v => { p.diametru = v; });', 'e2e', 'diametrul sub 24')
o('E35', A, 'camp("#at-ve-joc", 1, 0.3, 2, v => { p.joc = v; });', 'camp("#at-ve-joc", 2, 0.3, 2, v => { p.joc = v; });', 'e2e', 'jocul la sutime')
o('E36', A, 'camp("#at-ve-joc", 1, 0.3, 2, v => { p.joc = v; });', 'camp("#at-ve-joc", 1, 0.3, 2.5, v => { p.joc = v; });', 'e2e', 'jocul peste 2')
o('E37', A, 'camp("#at-ve-joc", 1, 0.3, 2, v => { p.joc = v; });', 'camp("#at-ve-joc", 1, 0.2, 2, v => { p.joc = v; });', 'e2e', 'jocul sub 0,3')
o('E38', A, 'camp("#at-ve-pas", 2, 0.3, 1.5, v => { p.pas = v; });', 'camp("#at-ve-pas", 1, 0.3, 1.5, v => { p.pas = v; });', 'e2e', 'pasul la zecime')
o('E39', A, 'camp("#at-ve-pas", 2, 0.3, 1.5, v => { p.pas = v; });', 'camp("#at-ve-pas", 2, 0.3, 1.6, v => { p.pas = v; });', 'e2e', 'pasul peste 1,5')
o('E40', A, 'camp("#at-ve-pas", 2, 0.3, 1.5, v => { p.pas = v; });', 'camp("#at-ve-pas", 2, 0.2, 1.5, v => { p.pas = v; });', 'e2e', 'pasul sub 0,3')
o('E41', A, 'camp("#at-ve-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-ve-lat", 1, 15, 60, v => { p.latime = v; });', 'e2e', 'lățimea cu zecimi')
o('E42', A, 'camp("#at-ve-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-ve-lat", 0, 15, 61, v => { p.latime = v; });', 'e2e', 'lățimea peste 60 %')
o('E43', A, 'camp("#at-ve-lat", 0, 15, 60, v => { p.latime = v; });', 'camp("#at-ve-lat", 0, 14, 60, v => { p.latime = v; });', 'e2e', 'lățimea sub 15 %')
o('E44', A, 'camp("#at-ve-joc", 1, 0.3, 2, v => { p.joc = v; });', 'camp("#at-ve-joc", 1, 0.3, 2, v => { p.pas = v; });', 'e2e', 'câmpul jocului schimbă pasul')
o('E45', A, 'value="${p.joc}"></label>', 'value="${p.pas}"></label>', 'e2e', 'câmpul jocului arată pasul')
o('E46', A, '$("#at-ve-fa").onclick = adaugaVentilator;', '$("#at-ve-fa").onclick = adaugaInLista;', 'e2e', '„Fă ventilatorul” pune doar piesa din editor')
o('E47', A, 'pune(defVentilator("carcasa"), n);', 'pune({ ...defVentilator("carcasa"), urechi: 2 }, n);', 'e2e', '„Fă ventilatorul” pune carcasa cu 2 urechi')
o('E48', A, 'pune(defVentilator("rotor"), n);', 'pune({ ...defVentilator("rotor"), inel: "nu" }, n);', 'e2e', '„Fă ventilatorul” pune rotorul fără inel')
GB = 'const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "b" ? tr(", pentru bară") : d.gaura === "nu" ? tr(", fără gaură") : "";\n      const j = (d.joc'
o('E50', A, GB, GB.replace('d.gaura === "b" ? tr(", pentru bară")', 'd.gaura === "b" ? tr(", gaură rotundă")'), 'e2e', 'numele spune „gaură rotundă” la cea pentru bară')

# Pictograma și traducerea (unitare).
o('G01', A, '    ventilator: `<circle cx="12" cy="12" r="10"/>', '    ventilator2: `<circle cx="12" cy="12" r="10"/>', 'pictograme', 'ventilatorul fără pictogramă')
o('G02', A, '    ventilator: `<circle cx="12" cy="12" r="10"/>', '    ventilator: `<circle cx="12" cy="12" r="12"/>', 'pictograme', 'pictograma iese din pătrat')
o('T01', T, ' "Ventilator cu carcasă": "Ducted fan",', ' "Ventilator cu carcasă": "",', 'engleza', 'numele ventilatorului, netradus')

SETURI = {
    'vent': ['test/unit/trenulet.ventilator.test.ts'],
    'pictograme': ['test/unit/trenulet.pictograme.test.ts'],
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.ventilator.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md; felia 3.Cm-1)
E2E_BUILD = False

for x in O:
    assert x['vechi'] != x['nou'], x['id']
