# Lista de otrăvuri a feliei 3.Cj-4 (șurubul melc din atelierul Easy 3Draw; ADR 0284), 25.11.2026, alese de autor:
# motorul (diametrele și marginile, razele, subțierea și grosimea spirei, jocul din calibrare, profilul și sensul spirei,
# pasul, plasa, gaura, prinderile, cotele și montajul date atelierului) și atelierul (familia și desenul, numele, starea,
# câmpurile și marginile lor, textele cu cotele și montajul, „Fă perechea”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: diametrele, lungimea și marginile ei
DI = 'const diam = numarCerut(d.diam) === 16 ? 16 : 8, c = numarCerut(d.lung), r = Math.round(Number.isFinite(c) ? c : 2), lung = Math.min(4, Math.max(1, r));'
o('A01', LG, DI, DI.replace('numarCerut(d.diam) === 16 ? 16 : 8', 'numarCerut(d.diam) !== 8 ? 16 : 8'), 'melc', 'orice alt diametru (și lipsa lui) dă melcul gros')
o('A02', LG, DI, DI.replace('numarCerut(d.diam) === 16 ? 16 : 8', '8'), 'melc', 'melcul gros nu se poate face')
o('A03', LG, DI, DI.replace('numarCerut(d.diam) === 16', 'd.diam === 16'), 'melc', 'diametrul scris ca text nu e primit')
o('A04', LG, DI, DI.replace('c : 2)', 'c : 3)'), 'melc', 'melcul implicit are 3 știfturi')
o('A05', LG, DI, DI.replace('Math.max(1, r)', 'Math.max(2, r)'), 'melc', 'melcul de un știft nu se poate face')
o('A06', LG, DI, DI.replace('Math.min(4,', 'Math.min(8,'), 'melc', 'melcul poate avea 8 știfturi')
o('A07', LG, DI, DI.replace('r = Math.round(', 'r = Math.floor('), 'melc', 'lungimea se taie, nu se rotunjește')
AV = 'if (lung !== r) avert.push(tr`Un șurub melc are între 1 și 4 știfturi lungime: l-am făcut de ${lung}.`);'
o('A08', LG, AV, AV.replace('if (lung !== r)', 'if (lung !== c)'), 'melc', 'o lungime cu zecimale (sau lipsa ei) e spusă ca ieșită din margini')
o('A09', LG, AV, AV.replace('if (lung !== r)', 'if (false)'), 'melc', 'lungimea adusă în margini nu mai e spusă')
o('A10', LG, AV, AV.replace('de ${lung}.', 'de ${r}.'), 'melc', 'avertismentul spune lungimea cerută, nu pe cea făcută')
RZ = 'const rw = diam / 2, sub = diam === 16 ? 0.05 : 0.1, rf = rw - 1.25;'
o('A11', LG, RZ, RZ.replace('rf = rw - 1.25', 'rf = rw - 1'), 'melc', 'fundul spirei e la 1 mm sub divizare (fără jocul de la fund)')
o('A12', LG, RZ, RZ.replace('sub = diam === 16 ? 0.05 : 0.1', 'sub = 0.1'), 'melc', 'melcul gros e subțiat cât cel subțire')
o('A13', LG, RZ, RZ.replace('sub = diam === 16 ? 0.05 : 0.1', 'sub = diam === 16 ? 0.05 : 0'), 'melc', 'spira melcului Ø8 nu mai e subțiată')
o('A14', LG, RZ, RZ.replace('rw = diam / 2', 'rw = diam / 2 + 0.5'), 'melc', 'raza de divizare e cu 0,5 mm mai mare')
CT = 'return { diam, lung, rw, ra: rw + 1, rf, Lz: zecime(P.pas * lung - 2 * P.joc_lateral), sub, t: Math.PI / 2 - 2 * (e.jocDinti + sub),'
o('A15', LG, CT, CT.replace('ra: rw + 1,', 'ra: rw + 1.25,'), 'melc', 'vârful spirei e cu 0,25 mm mai sus (intră în fundul roții)')
o('A16', LG, CT, CT.replace('Lz: zecime(P.pas * lung - 2 * P.joc_lateral)', 'Lz: P.pas * lung'), 'melc', 'melcul are lungimea fără jocul lateral')
o('A17', LG, CT, CT.replace('2 * (e.jocDinti + sub)', '2 * (0.15 + sub)'), 'melc', 'spira nu urmează jocul din calibrare')
o('A18', LG, CT, CT.replace('2 * (e.jocDinti + sub)', '2 * sub'), 'melc', 'spira n-are jocul dinților')
o('A19', LG, CT, CT.replace('2 * (e.jocDinti + sub)', '(e.jocDinti + sub)'), 'melc', 'spira e subțiată doar pe jumătate')
PE = 'perete: rf - Math.hypot(e.axGauraD / 2, e.axGauraLat / 2), avert };'
o('A20', LG, PE, PE.replace('Math.hypot(e.axGauraD / 2, e.axGauraLat / 2)', 'e.axGauraD / 2'), 'melc', 'peretele e măsurat la vârful brațului crucii, nu la colț')

# --- motorul: plasa (profilul, sensul, pasul, straturile, gaura, prinderile)
TG = 'const e = ef(), q = melcCote(d), pas = Math.PI, tg = Math.tan(20 * Math.PI / 180);'
o('B01', LG, TG, TG.replace('Math.tan(20 * Math.PI / 180)', 'Math.tan(14.5 * Math.PI / 180)'), 'melc', 'flancurile spirei au 14,5°, nu 20°')
o('B02', LG, TG, TG.replace('pas = Math.PI,', 'pas = 3.2,'), 'melc', 'spira are pasul de 3,2 mm, nu al roților')
UN = 'a1 = 2 * Math.PI * (q.t / 2 - tg) / pas, a2 = 2 * Math.PI * (q.t / 2 + 1.25 * tg) / pas;'
o('B03', LG, UN, UN.replace('(q.t / 2 - tg)', '(q.t / 2 - 1.25 * tg)'), 'melc', 'vârful spirei e mai îngust (flancul mai culcat sus)')
o('B04', LG, UN, UN.replace('(q.t / 2 + 1.25 * tg)', '(q.t / 2 + tg)'), 'melc', 'piciorul spirei e mai îngust (flancul mai abrupt jos)')
o('B05', LG, UN, UN.replace('(q.t / 2 - tg)', '(q.t - tg)'), 'melc', 'spira e de două ori mai groasă')
BU = 'bucata(-a1, a1, q.ra, q.ra, true); bucata(a1, a2, q.ra, q.rf); bucata(a2, 2 * Math.PI - a2, q.rf, q.rf); bucata(2 * Math.PI - a2, 2 * Math.PI - a1, q.rf, q.ra);'
o('B06', LG, BU, BU.replace('bucata(-a1, a1, q.ra, q.ra, true);', 'bucata(-a1, a1, q.ra, q.ra);'), 'melc', 'vârful spirei n-are punct la mijloc (cutia melcului gros iese mai mică)')
o('B07', LG, BU, BU.replace('bucata(a1, a2, q.ra, q.rf);', 'bucata(a1, a2, q.ra, q.ra);'), 'melc', 'un flanc al spirei e o treaptă, nu o pantă')
o('B08', LG, BU, BU.replace('bucata(a2, 2 * Math.PI - a2, q.rf, q.rf);', 'bucata(a2, 2 * Math.PI - a2, q.rw, q.rw);'), 'melc', 'golul dintre spire e umplut până la divizare')
ST = 'const strat = (z: number) => { const f = 2 * Math.PI * z / pas; straturi.push('
o('B09', LG, ST, ST.replace('const f = 2 * Math.PI * z / pas;', 'const f = -2 * Math.PI * z / pas;'), 'melc', 'spira urcă spre stânga')
o('B10', LG, ST, ST.replace('const f = 2 * Math.PI * z / pas;', 'const f = 2 * Math.PI * z / pas + Math.PI;'), 'melc', 'spira e mutată cu o jumătate de pas')
o('B11', LG, ST, ST.replace('const f = 2 * Math.PI * z / pas;', 'const f = 0;'), 'melc', 'spira nu urcă: un ax cu o aripă')
LA = 'const n = laturiFine(q.ra), pasU = 2 * Math.PI / n,'
o('B12', LG, LA, LA.replace('const n = laturiFine(q.ra),', 'const n = 12,'), 'melc', 'plasa are 12 straturi pe tură (colțuroasă)')
o('B13', LG, '    strat(q.Lz);\n', '', 'melc', 'lipsește stratul de la capăt (melcul iese mai scurt)')
PR = 'return { tri: prismaStraturi(straturi, [cruce(0, 0, e.axGauraD, e.axGauraLat)], true), avert: q.avert, prinderi: prinderiButuc("x", q.Lz) };'
o('B14', LG, PR, PR.replace('e.axGauraLat)], true)', 'e.axGauraLat)])'), 'melc', 'fețele se taie pe diagonala lungă (miezul iese mâncat)')
o('B15', LG, PR, PR.replace('[cruce(0, 0, e.axGauraD, e.axGauraLat)]', '[]'), 'melc', 'melcul n-are gaură')
o('B16', LG, PR, PR.replace('[cruce(0, 0, e.axGauraD, e.axGauraLat)]', '[cerc(0, 0, e.axGauraD / 2)]'), 'melc', 'gaura e rotundă, nu în cruce')
o('B17', LG, PR, PR.replace('prinderiButuc("x", q.Lz)', 'prinderiButuc("r", q.Lz)'), 'melc', 'prinderea e spusă gaură de știft')
o('B18', LG, PR, PR.replace('prinderiButuc("x", q.Lz)', '[]'), 'melc', 'melcul nu-și spune prinderile')
o('B19', LG, PR, PR.replace('prinderiButuc("x", q.Lz)', 'prinderiButuc("x", P.pas)'), 'melc', 'gaura e spusă de un știft, nu cât melcul')
o('B20', LG, 'if (elice) tri.push([p3(A.p[k]!, A.z), p3(A.p[k1]!, A.z), p3(B.p[k]!, B.z)], [p3(A.p[k1]!, A.z), p3(B.p[k1]!, B.z), p3(B.p[k]!, B.z)]);',
  'if (elice) tri.push([p3(A.p[k]!, A.z), p3(A.p[k1]!, A.z), p3(B.p[k]!, B.z)]);', 'melc', 'fețele elicei au doar jumătate din triunghiuri (plasa e deschisă)')

# --- motorul: cotele și montajul date atelierului
EX = 'return { diam: q.diam, lung: q.lung, lungime: q.Lz, pas: Math.PI, spire: q.Lz / Math.PI, unghi: Math.atan(1 / q.diam) * 180 / Math.PI, varf: 2 * q.ra, fund: 2 * q.rf, perete: q.perete, subtiere: q.sub, grosime: q.t }; },'
o('C01', LG, EX, EX.replace('lungime: q.Lz,', 'lungime: P.pas * q.lung,'), 'melc', 'lungimea dată atelierului e fără jocul lateral')
o('C02', LG, EX, EX.replace('spire: q.Lz / Math.PI,', 'spire: q.Lz / 3.2,'), 'melc', 'spirele sunt numărate cu pasul de 3,2 mm')
o('C03', LG, EX, EX.replace('Math.atan(1 / q.diam)', 'Math.atan(1 / q.rw)'), 'melc', 'unghiul spirei e socotit pe rază, nu pe diametru')
o('C04', LG, EX, EX.replace('varf: 2 * q.ra,', 'varf: q.ra,'), 'melc', 'vârful e dat ca rază')
o('C05', LG, EX, EX.replace('fund: 2 * q.rf,', 'fund: 2 * q.rw,'), 'melc', 'fundul spirei e dat ca diametrul de divizare')
o('C06', LG, EX, EX.replace('grosime: q.t }', 'grosime: q.t / 2 }'), 'melc', 'grosimea spirei e dată pe jumătate')
o('C07', LG, EX, EX.replace('subtiere: q.sub,', 'subtiere: 2 * q.sub,'), 'melc', 'subțierea e dată pe amândouă flancurile')
MO = 'const q = melcCote(d), c = numarCerut(z), dinti = Math.round(Math.min(80, Math.max(8, Number.isFinite(c) ? c : 24))), distanta = q.rw + dinti / 2;'
o('C08', LG, MO, MO.replace('c : 24)', 'c : 16)'), 'melc', 'roata pereche implicită are 16 dinți')
o('C09', LG, MO, MO.replace('Math.max(8,', 'Math.max(3,'), 'melc', 'roata pereche poate avea 3 dinți')
o('C10', LG, MO, MO.replace('Math.min(80,', 'Math.min(200,'), 'melc', 'roata pereche poate avea 200 de dinți')
o('C11', LG, MO, MO.replace('dinti = Math.round(', 'dinti = Math.floor('), 'melc', 'dinții roții se taie, nu se rotunjesc')
o('C12', LG, MO, MO.replace('distanta = q.rw + dinti / 2', 'distanta = q.diam + dinti / 2'), 'melc', 'distanța dintre axe ia diametrul întreg al melcului')
o('C13', LG, MO, MO.replace('distanta = q.rw + dinti / 2', 'distanta = q.rw + dinti'), 'melc', 'distanța dintre axe ia diametrul întreg al roții')
GR = 'return { dinti, distanta, grila: distanta % P.pas === 0 ? "intreg" : distanta % (P.pas / 2) === 0 ? "jumatate" : "nu", raport: dinti };'
o('C14', LG, GR, GR.replace('distanta % P.pas === 0 ? "intreg"', 'distanta % (P.pas / 2) === 0 ? "intreg"'), 'melc', 'jumătatea de știft e spusă pe grilă')
o('C15', LG, GR, GR.replace('distanta % (P.pas / 2) === 0 ? "jumatate" : "nu"', '"jumatate"'), 'melc', 'orice distanță e spusă la jumătatea grilei')
o('C16', LG, GR, GR.replace('raport: dinti }', 'raport: distanta }'), 'melc', 'raportul e distanța, nu dinții roții')

# --- tabelele (unit)
o('T01', AT, '["cremaliera", "Cremalieră"], ["melc", "Șurub melc"],', '["cremaliera", "Cremalieră"],', 'tabele', 'melcul nu e în nicio familie')
o('T02', AT, '    melc: `<path d="M4.5 8h15v8h-15z"/><path d="M6.4 16l2.4-8M10.2 16l2.4-8M14 16l2.4-8M17.8 16l1.7-5.6M4.5 13.6L6.2 8"/><path d="M1.5 12h3M19.5 12h3"/>`,\n', '', 'tabele', 'melcul n-are desen')
o('T03', EN, ' "Ø16 (gros)": "Ø16 (thick)",\n', '', 'tabele', 'un text al melcului lipsește din dicționar')
o('T04', LG, 'rotita, cremaliera, cama, melc, roata,', 'rotita, cremaliera, cama, roata,', 'melc', 'motorul nu știe piesa')

# --- prinderile (unit, mostrele)
o('P01', LG, PR, PR.replace('prinderiButuc("x", q.Lz)', 'prinderiButuc("x", q.Lz).slice(0, 1)'), 'prinderi', 'gaura se spune doar la capătul de sus')
o('P02', LG, PR, PR.replace('prinderiButuc("x", q.Lz)', 'prinderiButuc("x", q.Lz + 2)'), 'prinderi', 'gaura e spusă mai lungă decât piesa (capătul ei e în aer)')

# --- atelierul (e2e)
o('E01', AT, '    melc: { diam: 8, lung: 2, pereche: 24 },', '    melc: { diam: 8, lung: 2, pereche: 16 },', 'e2e', 'roata pereche de la pornire are 16 dinți')
o('E02', AT, '    melc: { diam: 8, lung: 2, pereche: 24 },', '    melc: { diam: 16, lung: 2, pereche: 24 },', 'e2e', 'melcul de la pornire e cel gros')
NU = 'if (d.tip === "melc") { const q = Lego.melcCote(d); return tr`Șurub melc Ø${q.diam}, lung ${q.lung}`; }'
o('E03', AT, NU, NU.replace('Ø${q.diam}, lung ${q.lung}', 'Ø${q.diam}, lung ${fmt(q.lungime)}'), 'e2e', 'numele scrie lungimea în mm')
o('E04', AT, NU, NU.replace('Ø${q.diam}, lung ${q.lung}', 'Ø${q.varf}, lung ${q.lung}'), 'e2e', 'numele scrie diametrul de la vârf')
DC = 'if (t === "melc") { const q = Lego.melcCote(p); p.diam = q.diam; p.lung = q.lung; delete p.pereche; }'
o('E05', AT, DC, DC.replace(' delete p.pereche;', ''), 'e2e', 'roata pereche rămâne în piesă (aceeași piesă, cu altă roată, nu se mai adună)')
ED = 'const p = stare.melc, q = Lego.melcCote(p), m = Lego.melcMontaj(p, p.pereche), pasi = m.distanta / 8;'
o('E06', AT, ED, ED.replace('Lego.melcMontaj(p, p.pereche)', 'Lego.melcMontaj(p, 24)'), 'e2e', 'montajul scris e mereu al roții de 24')
o('E07', AT, ED, ED.replace('pasi = m.distanta / 8', 'pasi = m.distanta / 4'), 'e2e', 'știfturile din montaj sunt numărate la 4 mm')
UD = 'const unde = m.grila === "intreg" ? (pasi === 1 ? tr("pe grila de știfturi, la un știft") : tr`pe grila de știfturi, la ${pasi} știfturi`)'
o('E08', AT, UD, UD.replace('(pasi === 1 ? tr("pe grila de știfturi, la un știft") : tr`pe grila de știfturi, la ${pasi} știfturi`)', 'tr`pe grila de știfturi, la ${pasi} știfturi`'), 'e2e', 'montajul scrie „la 1 știfturi”')
UJ = ': m.grila === "jumatate" ? tr`la jumătatea grilei, la ${fmt(pasi)} știfturi` : tr("în afara grilei de știfturi (pe grilă cad roțile cu dinții din 8 în 8)");'
o('E09', AT, UJ, UJ.replace('m.grila === "jumatate"', 'm.grila !== "intreg"'), 'e2e', 'roata din afara grilei e spusă la jumătatea ei')
o('E10', AT, UJ, UJ.replace('m.grila === "jumatate"', 'm.grila === "nu"'), 'e2e', 'jumătatea grilei și afara ei sunt spuse pe dos')
SB = 'const subtire = q.perete < 0.8 ? " " + tr`Între colțurile găurii de ax și fundul spirei rămân doar ${fmt(q.perete, 2)} mm: piesa o ține spira. Pentru sarcină, alege Ø16.` : "";'
o('E11', AT, SB, SB.replace('q.perete < 0.8', 'q.perete < 0.05'), 'e2e', 'peretele subțire al melcului Ø8 nu mai e spus')
o('E12', AT, SB, SB.replace('q.perete < 0.8', 'q.perete < 8'), 'e2e', 'peretele e spus subțire și la melcul gros')
o('E13', AT, SB, SB.replace('${fmt(q.perete, 2)} mm', '${fmt(q.perete)} mm'), 'e2e', 'peretele e scris cu o zecimală (0,1 mm)')
SG = '${seg("at-mlc-diam", [["8", "Ø8 (ca LEGO)"], ["16", "Ø16 (gros)"]], String(q.diam))}'
o('E14', AT, SG, SG.replace('String(q.diam)', '"8"'), 'e2e', 'diametrul ales nu se vede apăsat')
o('E15', AT, SG, SG.replace('[["8", "Ø8 (ca LEGO)"], ["16", "Ø16 (gros)"]]', '[["8", "Ø8 (ca LEGO)"]]'), 'e2e', 'melcul gros nu se poate alege')
o('E16', AT, '<input id="at-mlc-lung" type="number" min="1" max="4" step="1" value="${q.lung}">', '<input id="at-mlc-lung" type="number" min="1" max="4" step="1" value="${q.diam}">', 'e2e', 'câmpul lungimii arată diametrul')
o('E17', AT, '<input id="at-mlc-pereche" type="number" min="8" max="80" step="1" value="${m.dinti}">', '<input id="at-mlc-pereche" type="number" min="8" max="80" step="1" value="${q.lung}">', 'e2e', 'câmpul roții pereche arată lungimea')
IN = 'tr`Are Ø${fmt(q.varf)} la vârf, Ø${fmt(q.fund)} la fundul spirei și ${fmt(q.lungime)} mm lungime: ${fmt(q.spire)} spire, cu pasul de ${fmt(q.pas, 2)} mm.`'
o('E18', AT, IN, IN.replace('Ø${fmt(q.varf)} la vârf, Ø${fmt(q.fund)} la fundul', 'Ø${fmt(q.fund)} la vârf, Ø${fmt(q.varf)} la fundul'), 'e2e', 'textul scrie vârful și fundul pe dos')
o('E19', AT, IN, IN.replace('${fmt(q.lungime)} mm lungime', '${fmt(q.lung)} mm lungime'), 'e2e', 'textul scrie știfturile drept milimetri')
o('E20', AT, IN, IN.replace('${fmt(q.spire)} spire', '${Math.round(q.spire)} spire'), 'e2e', 'spirele sunt scrise fără zecimală (2,5 devine 2)')
o('E21', AT, IN, IN.replace('${fmt(q.pas, 2)} mm', '${fmt(q.pas)} mm'), 'e2e', 'pasul e scris cu o zecimală')
MT = 'tr`Axul roții de ${m.dinti} stă la ${fmt(m.distanta)} mm de axul melcului, în cruce cu el: ${unde}. La o tură a melcului, roata înaintează cu un dinte: raportul e ${m.dinti} : 1.`'
o('E22', AT, MT, MT.replace('stă la ${fmt(m.distanta)} mm', 'stă la ${fmt(m.dinti / 2)} mm'), 'e2e', 'distanța scrisă e doar raza roții')
o('E23', AT, MT, MT.replace('raportul e ${m.dinti} : 1', 'raportul e ${q.lung} : 1'), 'e2e', 'raportul scris e lungimea melcului')
DM = '$("#at-mlc-diam").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.diam = +b.dataset.v!; editor(); schimbat(); };'
o('E24', AT, DM, DM.replace('p.diam = +b.dataset.v!;', 'p.diam = 8;'), 'e2e', 'diametrul ales nu ajunge în piesă')
o('E25', AT, DM, DM.replace(' editor(); schimbat(); };', ' schimbat(); };'), 'e2e', 'după diametru, editorul nu se redesenează (textele rămân vechi)')
LN = '$("#at-mlc-lung").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 1 && v <= 4) { p.lung = Math.round(v); schimbat(); } editor(); };'
o('E26', AT, LN, LN.replace('v >= 1 && v <= 4', 'v >= 0 && v <= 4'), 'e2e', 'câmpul primește lungimea 0')
o('E27', AT, LN, LN.replace('v >= 1 && v <= 4', 'v >= 1 && v <= 5'), 'e2e', 'câmpul primește lungimea 5')
o('E28', AT, LN, LN.replace('v >= 1 && v <= 4', 'v >= 2 && v <= 4'), 'e2e', 'câmpul nu primește lungimea 1')
o('E29', AT, LN, LN.replace('v >= 1 && v <= 4', 'v >= 1 && v <= 3'), 'e2e', 'câmpul nu primește lungimea 4')
PC = '$("#at-mlc-pereche").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 8 && v <= 80) p.pereche = Math.round(v); editor(); };'
o('E30', AT, PC, PC.replace('v >= 8 && v <= 80', 'v >= 7 && v <= 80'), 'e2e', 'câmpul primește roata de 7 dinți (scrisă 8 de motor: nu se vede refuzul)')
o('E31', AT, PC, PC.replace('v >= 8 && v <= 80', 'v >= 8 && v <= 81'), 'e2e', 'câmpul primește roata de 81 de dinți')
o('E32', AT, PC, PC.replace('v >= 8 && v <= 80', 'v >= 9 && v <= 80'), 'e2e', 'câmpul nu primește roata de 8 dinți')
o('E33', AT, PC, PC.replace('v >= 8 && v <= 80', 'v >= 8 && v <= 79'), 'e2e', 'câmpul nu primește roata de 80 de dinți')
o('E34', AT, PC, PC.replace('p.pereche = Math.round(v); editor(); };', 'p.pereche = Math.round(v); };'), 'e2e', 'după roata pereche, montajul scris rămâne cel vechi')
o('E35', AT, '$("#at-mlc-fa-pereche").onclick = adaugaPerecheMelc;', '$("#at-mlc-fa-pereche").onclick = adaugaPerecheCremaliera;', 'e2e', '„Fă perechea” a melcului o face pe a cremalierei')
PM = 'const d = defCurenta(), n = bucatiCerute(), m = Lego.melcMontaj(d, stare.melc.pereche), roata: Def = { tip: "rotita", dinti: m.dinti, fel: "drepti", grosime: 3.8, gaura: "x" };'
o('E36', AT, PM, PM.replace('Lego.melcMontaj(d, stare.melc.pereche)', 'Lego.melcMontaj(d, 24)'), 'e2e', 'perechea vine mereu cu roata de 24')
o('E37', AT, PM, PM.replace('grosime: 3.8, gaura: "x" }', 'grosime: 7.8, gaura: "x" }'), 'e2e', 'roata perechii e altă piesă decât cea din editorul roților (nu se adună)')
PP = 'pune(d, n); pune(roata, n);\n    salveaza(); randeazaLista();\n    toast(tr`${n} × melcul Ø${d.diam}'
o('E38', AT, PP, PP.replace('pune(d, n); pune(roata, n);', 'pune(d, n);'), 'e2e', 'perechea pune doar melcul')
o('E39', AT, PP, PP.replace('pune(d, n); pune(roata, n);', 'pune(roata, n); pune(d, n);'), 'e2e', 'perechea pune întâi roata')
TO = 'toast(tr`${n} × melcul Ø${d.diam} și roata de ${m.dinti} în listă (axele la ${fmt(m.distanta)} mm, în cruce).`);'
o('E40', AT, TO, TO.replace('axele la ${fmt(m.distanta)} mm', 'axele la ${fmt(m.dinti)} mm'), 'e2e', 'mesajul perechii scrie dinții drept distanță')

SETURI = {
    'melc': ['test/unit/trenulet.melc.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
    'prinderi': ['test/unit/trenulet.prinderi.test.ts'],
}
E2E = ['test/e2e/trenulet.melc.spec.ts']
