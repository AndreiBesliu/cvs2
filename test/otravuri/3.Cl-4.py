# Lista de otrăvuri a feliei 3.Cl-4 (brăduțul LEGO din atelierul Easy 3Draw; ADR 0285), 26.11.2026, alese de autor:
# motorul (etajul: diametrul, înălțimea, marginea, conul, locașul cu peretele și tubul lui, știfturile, prinderile;
# steaua de vârf: forma, umărul, cuiul, prinderea; brăduțul întreg) și atelierul (piesa din filă, numele, câmpurile pe
# piese, brăduțul întreg, „Fă brăduțul”, ce intră în piesă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: cotele
DM = 'diam = Number.isFinite(cerut) ? Math.min(10, Math.max(4, 2 * Math.round(cerut / 2))) : 8;'
o('M01', LG, DM, DM.replace('Math.min(10,', 'Math.min(12,'), 'brad', 'un etaj primește și 12 știfturi')
o('M02', LG, DM, DM.replace('Math.max(4,', 'Math.max(2,'), 'brad', 'un etaj primește și 2 știfturi')
o('M03', LG, DM, DM.replace('2 * Math.round(cerut / 2)', 'Math.round(cerut)'), 'brad', 'un etaj primește și un diametru impar')
o('M04', LG, DM, DM.replace(': 8;', ': 6;'), 'brad', 'etajul obișnuit are 6 știfturi')
o('M05', LG, 'if (et && Number.isFinite(cerut) && cerut !== diam) avert.push(', 'if (Number.isFinite(cerut) && cerut !== diam) avert.push(', 'brad', 'steaua spune ceva despre diametrul etajului')
o('M06', LG, 'campMarginit(et ? avert : mute, d.placi, 3, 9, 5,', 'campMarginit(et ? avert : mute, d.placi, 2, 9, 5,', 'brad', 'un etaj primește și 2 plăci')
o('M07', LG, 'campMarginit(et ? avert : mute, d.placi, 3, 9, 5,', 'campMarginit(et ? avert : mute, d.placi, 3, 12, 5,', 'brad', 'un etaj primește și 12 plăci')
o('M08', LG, 'campMarginit(et ? avert : mute, d.placi, 3, 9, 5,', 'campMarginit(avert, d.placi, 3, 9, 5,', 'brad', 'steaua spune ceva despre plăcile etajului')
o('M09', LG, 'l-am făcut de ${x}.`, true);\n    const margine = d.margine === "neteda"', 'l-am făcut de ${x}.`);\n    const margine = d.margine === "neteda"', 'brad', 'înălțimea etajului nu mai e în plăci întregi')
o('M10', LG, 'campMarginit(et ? mute : avert, d.marime, 16, 48, 28,', 'campMarginit(et ? mute : avert, d.marime, 16, 60, 28,', 'brad', 'steaua primește și 60 mm')
o('M11', LG, 'campMarginit(et ? mute : avert, d.marime, 16, 48, 28,', 'campMarginit(avert, d.marime, 16, 48, 28,', 'brad', 'etajul spune ceva despre mărimea stelei')
o('M12', LG, 'const R = diam * P.pas / 2 - P.joc_lateral, H = placi * P.placa, ad = Math.min(P.locas_h, H - 0.8);', 'const R = diam * P.pas / 2, H = placi * P.placa, ad = Math.min(P.locas_h, H - 0.8);', 'brad', 'etajul uită jocul lateral')
o('M13', LG, 'zc: Math.min(H - 0.6, ad + 1), zimti:', 'zc: Math.min(H - 0.6, ad + 2), zimti:', 'brad', 'marginea dreaptă a etajului, de 2 mm')
o('M14', LG, 'zimti: margine === "zimti" ? 2 * diam + 4 : 0,', 'zimti: margine === "zimti" ? 2 * diam : 0,', 'brad', 'etajul are mai puțini zimți')
o('M15', LG, 'gros: P.bara_d - 0.25, avert };', 'gros: P.bara_d, avert };', 'brad', 'steaua e mai groasă decât bara culcată')

# --- motorul: etajul
o('E01', LG, 'const BRAD_LEGO = { varf: 9.2,', 'const BRAD_LEGO = { varf: 8.2,', 'brad', 'vârful etajului, mai îngust (știfturile ies din el)')
o('E02', LG, 'const Rz = R - Math.max(2, 0.12 * R), contur', 'const Rz = R - Math.max(2, 0.2 * R), contur', 'brad', 'zimții, mai adânci')
o('E03', LG, 'const Rz = R - Math.max(2, 0.12 * R), contur', 'const Rz = R - Math.max(3, 0.12 * R), contur', 'brad', 'zimții etajului mic, mai adânci')
o('E04', LG, 'const rr = k % 2 ? Rz : R, u = Math.PI / 2 + Math.PI * k / q.zimti;', 'const rr = k % 2 ? R : Rz, u = Math.PI / 2 + Math.PI * k / q.zimti;', 'brad', 'zimții, întorși (golul în sus)')
o('E05', LG, ': cerc(0, 0, R, laturiFine(R));\n    // sus, fiecare vârf', ': cerc(0, 0, R);\n    // sus, fiecare vârf', 'brad', 'etajul neted, din 48 de laturi')
o('E06', LG, 'const sus = contur.map(([x, y]): P2 => { const u = Math.atan2(y, x); return [Rt * Math.cos(u), Rt * Math.sin(u)]; });', 'const sus = contur.map(([x, y]): P2 => { const u = Math.atan2(y, x) + 0.2; return [Rt * Math.cos(u), Rt * Math.sin(u)]; });', 'brad', 'conul, răsucit')
o('E07', LG, 'cerc(0, 0, Math.hypot(s / 2, s / 2) + P.stift_d / 2 + e.joc), [0, 0], 0, ad + 0.01)', 'cerc(0, 0, Math.hypot(s / 2, s / 2) + P.stift_d / 2 + e.joc + 0.3), [0, 0], 0, ad + 0.01)', 'brad', 'peretele golului nu mai ține știfturile din afară')
o('E08', LG, 'cerc(0, 0, Math.hypot(s / 2, s / 2) + P.stift_d / 2 + e.joc), [0, 0], 0, ad + 0.01)', 'cerc(0, 0, Math.hypot(s / 2, s / 2) + P.stift_d / 2 - 0.2), [0, 0], 0, ad + 0.01)', 'brad', 'golul e prea strâmt: știfturile nu intră')
o('E09', LG, 'const ro = P.tub_contact - e.joc, colturi', 'const ro = P.tub_contact - e.joc - 0.3, colturi', 'brad', 'tubul din mijloc nu mai atinge știfturile')
o('E10', LG, 'const ro = P.tub_contact - e.joc, colturi', 'const ro = P.tub_contact + 0.2, colturi', 'brad', 'tubul din mijloc intră în știfturi')
o('E11', LG, '...tub(0, 0, ro, Math.min(ro - 0.8, P.stift_d / 2), 0, ad + 0.01),', '', 'brad', 'etajul n-are tub la mijloc')
o('E12', LG, '...prisma(contur, ad, zc + 0.01), ...trunchiForme(contur, sus, zc, H),', '...prisma(contur, ad + 0.5, zc + 0.01), ...trunchiForme(contur, sus, zc, H),', 'brad', 'tavanul locașului, mai sus (o gaură deasupra pereților)')
o('E13', LG, '...trunchiForme(contur, sus, zc, H), ...stifturi(colturi, H, e.stiftD),', '...trunchiForme(contur, sus, zc, H - 1), ...stifturi(colturi, H, e.stiftD),', 'brad', 'conul se termină sub știfturi')
o('E14', LG, '...trunchiForme(contur, sus, zc, H), ...stifturi(colturi, H, e.stiftD),', '...trunchiForme(contur, sus, zc, H),', 'brad', 'etajul n-are știfturi')
o('E15', LG, 'colturi: P2[] = [[-s / 2, -s / 2], [s / 2, -s / 2], [-s / 2, s / 2], [s / 2, s / 2]];', 'colturi: P2[] = [[-s / 2, -s / 2], [s / 2, -s / 2], [-s / 2, s / 2], [s, s]];', 'brad', 'un știft și locașul lui, mutate')
o('E16', LG, '...colturi.map(([x, y]): Prindere => ({ fel: "locas", p: [x, y, 0], d: JOS, lung: ad, orb: true }))', '...colturi.map(([x, y]): Prindere => ({ fel: "locas", p: [x, y, 0], d: JOS, lung: ad }))', 'brad', 'locașurile etajului nu-și spun fundul')
o('E17', LG, '({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h }))] };\n  }\n  /** Piesele unui brăduț', '({ fel: "stift", p: [x, y, H - 1], d: SUS, lung: P.stift_h }))] };\n  }\n  /** Piesele unui brăduț', 'brad', 'știfturile își spun locul mai jos')
o('E18', LG, 'tri.push([a3(A[i]!, z0), a3(A[j]!, z0), a3(B[j]!, z1)], [a3(A[i]!, z0), a3(B[j]!, z1), a3(B[i]!, z1)]); }\n    return tri;\n  }\n  type BradLegoDef', 'tri.push([a3(A[i]!, z0), a3(A[j]!, z0), a3(B[i]!, z1)], [a3(A[j]!, z0), a3(B[j]!, z1), a3(B[i]!, z1)]); }\n    return tri;\n  }\n  type BradLegoDef', 'brad', 'laturile conului, tăiate pe cealaltă diagonală')

# --- motorul: steaua de vârf
o('S01', LG, 'const rr = k % 2 ? 0.45 * R : R, u = Math.PI / 2 + Math.PI * k / 5; return [rr * Math.cos(u), rr * Math.sin(u), 0]; });\n      const unite', 'const rr = k % 2 ? 0.5 * R : R, u = Math.PI / 2 + Math.PI * k / 5; return [rr * Math.cos(u), rr * Math.sin(u), 0]; });\n      const unite', 'brad', 'steaua de vârf, mai plină')
o('S02', LG, 'const BRAD_LEGO = { varf: 9.2, umar: 5.2,', 'const BRAD_LEGO = { varf: 9.2, umar: 3.2,', 'brad', 'umărul stelei, cât cuiul (nu se mai oprește pe știft)')
o('S03', LG, 'umar: 5.2, cui: 6 };', 'umar: 5.2, cui: 4 };', 'brad', 'cuiul stelei, mai scurt')
o('S04', LG, 'dreptForma(-BRAD_LEGO.umar / 2, yt, BRAD_LEGO.umar / 2, -0.45 * R + 1)]);', 'dreptForma(-BRAD_LEGO.umar / 2, yt + 1, BRAD_LEGO.umar / 2, -0.45 * R + 1)]);', 'brad', 'umărul începe mai sus decât colțurile de jos')
o('S05', LG, 'const cui = axe(prisma(sectiuneBara(P.bara_d / 2), yt - BRAD_LEGO.cui, yt + 0.5),', 'const cui = axe(prisma(sectiuneBara(P.bara_d / 2 - 0.3), yt - BRAD_LEGO.cui, yt + 0.5),', 'brad', 'cuiul e mai subțire decât bara')
o('S06', LG, 'yt = -R * Math.cos(Math.PI / 5), zb = P.bara_d / 2 - 0.25;', 'yt = -R * Math.cos(Math.PI / 5), zb = P.bara_d / 2;', 'brad', 'prinderea cuiului, mai sus decât axul barei')
o('S07', LG, 'prinderi: [{ fel: "bara", p: [0, yt - BRAD_LEGO.cui, zb], d: PE_Y, lung: BRAD_LEGO.cui }] };', 'prinderi: [] };', 'brad', 'steaua nu-și spune cuiul')
o('S08', LG, '([a, b, t]): P3 => [a, t, b], true);', '([a, b, t]): P3 => [a, t, b], false);', 'brad', 'cuiul, cu fețele întoarse pe dos')

# --- motorul: brăduțul întreg
EJ = 'etaje = Math.min((q.diam - 4) / 2 + 1, Math.max(1, Number.isFinite(cate) ? Math.round(cate) : 3));'
o('K01', LG, EJ, EJ.replace(': 3));', ': 2));'), 'brad', 'brăduțul obișnuit are două etaje')
o('K02', LG, EJ, EJ.replace('Math.min((q.diam - 4) / 2 + 1, ', 'Math.min(9, '), 'brad', 'etajele coboară sub 4 știfturi')
o('K03', LG, 'diam: q.diam - 2 * k, placi: q.placi, margine: q.margine }))', 'diam: q.diam - k, placi: q.placi, margine: q.margine }))', 'brad', 'etajele scad cu câte un știft')
o('K04', LG, '{ tip: "rotund", diam: 2, placi: 6, forma: "con", varf_d: 5.4, stifturi: "toate", gaura: "bara" },', '{ tip: "rotund", diam: 2, placi: 6, forma: "con", varf_d: 5.4, stifturi: "toate" },', 'brad', 'vârful n-are știftul gol: steaua n-are unde intra')
o('K05', LG, '{ tip: "rotund", diam: 2, placi: 3, forma: "cilindru", varf_d: 5.4, stifturi: "toate" },', '{ tip: "rotund", diam: 2, placi: 3, forma: "cilindru", varf_d: 5.4, stifturi: "niciunul" },', 'brad', 'trunchiul n-are știfturi: etajul n-are pe ce sta')
o('K06', LG, 'marime: bradLegoCote({ piesa: "stea", marime: d.marime }).marime },', 'marime: 28 },', 'brad', 'steaua brăduțului nu e cea aleasă')

# --- atelierul
o('A01', AT, '["ornament", "Ornament cu nume"], ["bradLego", "Brăduț LEGO"]]]', '["bradLego", "Brăduț LEGO"], ["ornament", "Ornament cu nume"]]]', 'e2e', 'brăduțul LEGO, înaintea ornamentului în galerie')
o('A02', AT, 'bradLego: { piesa: "etaj", diam: 8, placi: 5, margine: "zimti", marime: 28, etaje: 3 },', 'bradLego: { piesa: "etaj", diam: 8, placi: 5, margine: "zimti", marime: 28, etaje: 2 },', 'e2e', 'brăduțul de la început are două etaje')
o('A03', AT, 'if (q.piesa === "stea") return tr`Stea de vârf, ${fmt(q.marime)} mm`;', 'if (q.piesa === "stea") return tr`Stea de vârf, ${fmt(q.marime / 2)} mm`;', 'e2e', 'numele stelei spune jumătate din mărime')
o('A04', AT, '(q.placi === 5 ? "" : tr`, ${q.placi} plăci`)', '(q.placi === 3 ? "" : tr`, ${q.placi} plăci`)', 'e2e', 'numele tace la 3 plăci, nu la 5')
o('A05', AT, '(q.margine === "neteda" ? tr(", neted") : "");', '"";', 'e2e', 'numele nu spune marginea netedă')
o('A06', AT, 'p.piesa = q.piesa; delete p.etaje;', 'p.piesa = q.piesa;', 'e2e', 'câte etaje are brăduțul intră în piesă: etajul din editor nu mai e cel al brăduțului')
o('A07', AT, 'else { p.diam = q.diam; p.placi = q.placi; p.margine = q.margine; delete p.marime; }', 'else { p.diam = q.diam; p.placi = q.placi; p.margine = q.margine; }', 'e2e', 'mărimea stelei intră în etaj')
o('A08', AT, 'if (q.piesa === "stea") { p.marime = q.marime; delete p.diam; delete p.placi; delete p.margine; }', 'if (q.piesa === "stea") { p.marime = q.marime; delete p.placi; delete p.margine; }', 'e2e', 'diametrul etajului intră în stea')
o('A09', AT, 'const inalt = (3 + et.length * q.placi + 6) * 3.2 + 1.9 + q.marime / 2 * (1 + Math.cos(Math.PI / 5));', 'const inalt = (3 + et.length * q.placi + 6) * 3.2 + q.marime / 2 * (1 + Math.cos(Math.PI / 5));', 'e2e', 'înălțimea brăduțului uită știftul vârfului')
o('A10', AT, 'const inalt = (3 + et.length * q.placi + 6) * 3.2 + 1.9 + q.marime / 2 * (1 + Math.cos(Math.PI / 5));', 'const inalt = (3 + 3 * q.placi + 6) * 3.2 + 1.9 + q.marime / 2 * (1 + Math.cos(Math.PI / 5));', 'e2e', 'înălțimea brăduțului, mereu cu trei etaje')
o('A11', AT, '${et.length === 1 ? tr("un etaj") : tr`${et.length} etaje`} (de ${et.join(", ")} știfturi), vârful și steaua; clădit', '${tr`${et.length} etaje`} (de ${et.join(", ")} știfturi), vârful și steaua; clădit', 'e2e', '„1 etaje” în rândul brăduțului')
o('A12', AT, '${stea ? "" : `<div class="at-rand"><span class="mic">Diametrul (știfturi):</span>', '${`<div class="at-rand"><span class="mic">Diametrul (știfturi):</span>', 'e2e', 'diametrul și marginea se arată și la stea')
o('A13', AT, '${stea ? "" : `<label for="at-bl-placi">', '${`<label for="at-bl-placi">', 'e2e', 'plăcile și etajele se arată și la stea')
o('A14', AT, 'max="${(q.diam - 4) / 2 + 1}" step="1" value="${et.length}"></label>`}', 'max="4" step="1" value="${et.length}"></label>`}', 'e2e', 'câmpul etajelor are mereu marginea 4')
o('A15', AT, 'step="1" value="${et.length}"></label>`}', 'step="1" value="${p.etaje}"></label>`}', 'e2e', 'câmpul etajelor arată numărul ținut minte, nu cel care încape')
o('A16', AT, 'camp("#at-bl-placi", 3, 9,', 'camp("#at-bl-placi", 2, 9,', 'e2e', 'înălțimea primește și 2 plăci')
o('A17', AT, 'camp("#at-bl-etaje", 1, (q.diam - 4) / 2 + 1, v => { p.etaje = Math.round(v); });', 'camp("#at-bl-etaje", 1, (q.diam - 4) / 2 + 1, v => { p.etaje = 1; });', 'e2e', 'numărul de etaje scris se pierde')
o('A18', AT, 'camp("#at-bl-marime", 16, 48,', 'camp("#at-bl-marime", 16, 80,', 'e2e', 'steaua primește și 60')
o('A19', AT, 'alege("#at-bl-diam", v => { p.diam = +v; });', 'alege("#at-bl-diam", v => { p.placi = +v; });', 'e2e', 'diametrul ales schimbă înălțimea')
o('A20', AT, 'alege("#at-bl-margine", v => { p.margine = v; });', 'alege("#at-bl-margine", v => { p.piesa = v; });', 'e2e', 'marginea nu se schimbă')
o('A21', AT, 'for (const d of piese) pune(d as Def, n);', 'for (const d of piese) pune(d as Def, 1);', 'e2e', '„Fă brăduțul” pune mereu câte o bucată')
o('A22', AT, 'const n = bucatiCerute(), piese = Lego.bradLegoPiese(stare.bradLego),', 'const n = bucatiCerute(), piese = Lego.bradLegoPiese({}),', 'e2e', '„Fă brăduțul” face mereu brăduțul obișnuit')
o('A23', AT, '${stea ? tr`Steaua e groasă de ${fmt(q.gros, 2)} mm,', '${!stea ? tr`Steaua e groasă de ${fmt(q.gros, 2)} mm,', 'e2e', 'rândul stelei se arată la etaj')
o('A24', AT, 'tr`Steaua e groasă de ${fmt(q.gros, 2)} mm,', 'tr`Steaua e groasă de ${fmt(q.gros)} mm,', 'e2e', 'grosimea stelei, rotunjită la zecime')
o('A25', AT, '$("#at-bl-fa").onclick = adaugaBradLego;', '$("#at-bl-fa").onclick = adaugaVentilator;', 'e2e', '„Fă brăduțul” face altceva')

# --- textele
o('X01', EN, ' "Etaj de brăduț, {0} știfturi": "Tree tier, {0} studs",', ' "Etaj de brăduț, {0} știfturi": "Tree tier",', 'texte', 'traducerea numelui etajului pierde diametrul')
o('X02', AT, 'tr`Stea de vârf, ${fmt(q.marime)} mm`', 'tr`Stea de varf, ${fmt(q.marime)} mm`', 'texte', 'numele stelei, cu alt text decât cel tradus')
o('X03', LG, 'tr`Un etaj are între 3 și 9 plăci: l-am făcut de ${x}.`', 'tr`Un etaj are intre 3 și 9 plăci: l-am făcut de ${x}.`', 'texte', 'mesajul motorului, cu alt text decât cel tradus')

SETURI = {
    'brad': ['test/unit/trenulet.bradlego.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.bradlego.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
