# Lista de otrăvuri a feliei 3.Tk (fulia în atelierul Easy 3Draw, ADR 0280), 19.11.2026, alese de autor: motorul (cotele
# LEGO 4185 ale canalelor în V, rotund și plat, marginile obezii, peretele de sub canal și creșterea lui, butucul, fața,
# găurile de știft pe cercurile grilei: câte, unde, când încap, fața întinsă sub bandă, diametrul cel mai mic, cureaua și
# fuliile care s-ar atinge) și atelierul (fața plină în nume, canalul schimbat cu obada lui, grila, „Ca LEGO Ø24”, perechea,
# textul curelei, fețele care încap, pragul găurilor de știft, canalul rotund, distanța, galeria).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.fulie.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'
K = 'margine: 0.4, perete: 0.5, butuc: 3.75, peretButuc: 1.2, disc: 2.4, sus: 0.5,'

# Motorul (unitare).
o('U01', E, 'v: [2.6, 1.0, 1.3] as const,', 'v: [2.6, 0.8, 1.3] as const,', 'fulie', 'canalul în V mai puțin adânc decât la 4185a')
o('U02', E, 'v: [2.6, 1.0, 1.3] as const,', 'v: [2.6, 1.0, 1.0] as const,', 'fulie', 'fundul canalului în V mai îngust decât la 4185a')
o('U03', E, 'rotund: 2.0,', 'rotund: 2.4,', 'fulie', 'canalul rotund mai lat decât la 4185b')
o('U04', E, 'plat: [4, 1.2] as const,', 'plat: [4, 0.8] as const,', 'fulie', 'marginile curelei mai joase')
o('U05', E, K, K.replace('margine: 0.4', 'margine: 0.2'), 'fulie', 'obada lasă mai puțin de 0,4 mm de o parte și de alta a canalului')
o('U06', E, K, K.replace('perete: 0.5', 'perete: 0.8'), 'fulie', 'peretele de sub canal mai gros decât la LEGO (banda sub r 10,5)')
o('U07', E, K, K.replace('butuc: 3.75', 'butuc: 3.0'), 'fulie', 'butucul sub r 3,75 la crucea cea mai mică')
o('U08', E, K, K.replace('peretButuc: 1.2', 'peretButuc: 0.8'), 'fulie', 'peretele butucului din jurul crucii mai subțire')
o('U09', E, K, K.replace('disc: 2.4', 'disc: 2.0'), 'fulie', 'fața mai subțire decât discul LEGO')
o('U10', E, K, K.replace('sus: 0.5', 'sus: 0.25'), 'fulie', 'butucul iese doar 0,25 mm peste obadă')
o('U11', E, 'for (let k = 1; P.pas * k + P.stift_technic_d / 2 + 0.1 <= rb + 1e-9; k++)',
  'for (let k = 1; P.pas * k + P.stift_technic_d / 2 + 0.3 <= rb + 1e-9; k++)', 'fulie', 'știftul cere 0,3 mm până la bandă (fulia LEGO nu mai are găuri)')
o('U12', E, 'if (P.pas * k - e.gauraD / 2 >= rh + 0.4 - 1e-9) out.push(k);', 'if (P.pas * k - e.gauraD / 2 >= rh + 2 - 1e-9) out.push(k);', 'fulie',
  'gaura de știft cerută prea departe de butuc')
o('U13', E, 'const a = (2 * j + 1) * Math.PI / (6 * k);', 'const a = 2 * j * Math.PI / (6 * k);', 'fulie', 'găurile de știft de la 0°, nu de la 30° ca la LEGO')
o('U14', E, 'for (let j = 0; j < 6 * k; j++)', 'for (let j = 0; j < 6; j++)', 'fulie', 'doar șase găuri pe fiecare cerc (12 la r 16)')
o('U15', E, 're = Math.max(re, P.pas * k + rg + 0.1);', 're = Math.max(re, P.pas * k);', 'fulie',
  'fața nu se mai întinde sub o gaură de știft largă (corpul se deschide)')
o('U16', E, 'const Dmin = Math.ceil(2 * (rh + adanc + perete(D) + 0.3) * 10 - 1e-6) / 10;',
  'const Dmin = Math.ceil(2 * (rh + adanc + perete(D)) * 10 - 1e-6) / 10;', 'fulie', 'diametrul cel mai mic fără cei 0,3 mm de față')
o('U17', E, 'perete = (d: number) => Math.max(K.perete, 0.02 * d);', 'perete = (d: number) => Math.max(K.perete, 0.01 * d);', 'fulie',
  'peretele de sub canal crește doar cu 0,01·D')
o('U18', E, 'return C > d ? 2 * Math.sqrt(C * C - d * d) + Math.PI * (r1 + r2) + 2 * d * Math.asin(d / C) : NaN;',
  'return C > d ? 2 * Math.sqrt(C * C - d * d) + Math.PI * (r1 + r2) + d * Math.asin(d / C) : NaN;', 'fulie', 'cureaua: arcul de diferență pe jumătate')
o('U19', E, 'return { lungime: lungimeCurea(p.fund, q.fund, c), minim, atinge: !(c >= minim - 1e-9) };',
  'return { lungime: lungimeCurea(p.fund, q.fund, c), minim, atinge: !(c >= minim - 1) };', 'fulie', 'fuliile care se ating, nespuse cu 1 mm înainte')
o('U20', E, 'minim = Math.ceil((p.R + q.R + 0.5) * 10 - 1e-6) / 10;', 'minim = Math.ceil((p.R + q.R) * 10 - 1e-6) / 10;', 'fulie',
  'distanța cea mai mică fără jocul de 0,5 mm')
o('U21', E, 'if (fata === "stift" && !q.stift) {', 'if (false) {', 'fulie', 'găurile de știft cerute și unde nu încap, fără avertisment')
o('U22', E, 'const Wmin = Math.ceil((sus + 2 * K.margine) * 10 - 1e-6) / 10;', 'const Wmin = Math.ceil((sus + K.margine) * 10 - 1e-6) / 10;', 'fulie',
  'obada cea mai îngustă cu o singură margine')
o('U23', E, 'const sus = c === "plat" ? wc + 2 * K.plat[1] : wc,', 'const sus = c === "plat" ? wc + K.plat[1] : wc,', 'fulie',
  'canalul plat cu o singură teșitură în lățime')
o('U24', E, 'const a = q.sus / 2, b = q.c === "v" ? q.wc * FULIE.v[2] / FULIE.v[0] / 2 : q.wc / 2;',
  'const a = q.sus / 2, b = q.c === "v" ? q.wc * FULIE.v[2] / FULIE.v[0] / 2 : q.sus / 2;', 'fulie', 'canalul plat cu pereții drepți (fără teșitura de 45°)')
o('U25', E, 'const tp = Math.min(W, 6, Math.max(FULIE.disc, 0.3 * W));', 'const tp = Math.min(W, 6, Math.max(FULIE.disc, 0.5 * W));', 'fulie',
  'fața crește cu jumătate din lățime')

# Atelierul (e2e).
o('E01', A, 'if (((p.spite === "drepte" || p.spite === "y") && !f.spite) || (p.spite === "stift" && !f.stift)) p.spite = "disc";',
  'if ((p.spite === "drepte" || p.spite === "y") && !f.spite) p.spite = "disc";', 'e2e', 'numele pomenește găurile de știft și unde nu încap')
o('E02', A, 'd.spite === "disc" ? tr(", plină") : "";', '"";', 'e2e', 'fața plină nespusă în nume')
o('E03', A, 'p.lat = Math.max(p.lat, Lego.fulieFete(p).W);', 'p.lat = p.lat;', 'e2e', 'canalul plat fără obada lărgită (avertisment la fiecare schimbare)')
o('E04', A, 'alege("#at-fu-grila", v => { p.distanta = +v; });', 'alege("#at-fu-grila", v => { p.distanta = +v / 2; });', 'e2e',
  'butoanele grilei pun jumătate din distanță')
o('E05', A, 'Object.assign(p, { diam: 24, lat: 3.5, canal: "v", latCanal: 2.6, spite: "stift", gaura: "x" });',
  'Object.assign(p, { diam: 24, canal: "v", latCanal: 2.6, spite: "stift", gaura: "x" });', 'e2e', '„Ca LEGO Ø24” lasă lățimea cum era')
o('E06', A, 'a = normFulie({ ...d, diam: p.pereche });', 'a = normFulie({ ...d, diam: p.diam });', 'e2e', 'perechea, de același diametru')
o('E07', A, 'mm pe fundul canalelor, cu axele la ${fmt(p.distanta)} mm, ${textGrila(p.distanta)}.', 'mm pe fundul canalelor, cu axele la ${fmt(p.distanta)} mm, .',
  'e2e', 'textul curelei fără grilă')
o('E08', A, '...(f.stift ? [["stift", "Găuri de știft"]] as [string, string][] : []),', '...[["stift", "Găuri de știft"]] as [string, string][],', 'e2e',
  'găurile de știft oferite și unde nu încap')
o('E09', A, 'Lego.fulieMinimaFata(p, "stift")', 'Lego.fulieMinimaFata(p, "spite")', 'e2e', 'pragul găurilor de știft, de fapt al spițelor')
o('E10', A, 'p.latCanal = v === "rotund" ? 2 : v === "plat" ? 4 : 2.6;', 'p.latCanal = v === "rotund" ? 2.6 : v === "plat" ? 4 : 2.6;', 'e2e',
  'canalul rotund cu lățimea celui în V')
o('E11', A, 'camp("#at-fu-dist", 1, 1000, v => { p.distanta = v; });', 'camp("#at-fu-dist", 1, 1000, v => { p.distanta = v + 1; });', 'e2e',
  'distanța dintre axe citită greșit')
o('E12', A, '["roata", "Roată cu anvelopă"], ["fulie", "Fulie"],', '["roata", "Roată cu anvelopă"],', 'e2e', 'fulia lipsește din galerie')

SETURI = {
    'fulie': ['test/unit/trenulet.fulie.test.ts'],
}
E2E = ['test/e2e/trenulet.fulie.spec.ts']
