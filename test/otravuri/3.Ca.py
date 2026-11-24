# Lista de otrăvuri a feliei 3.Ca (conectorul perpendicular din atelierul Easy 3Draw; ADR 0284), 24.11.2026, alese de autor:
# motorul (pașii și marginile lor, felul și axa găurii, gaura în lung doar la capete, lamajul, cotele, orientarea plaselor,
# avertismentele) și atelierul (familia și desenul, forma implicită, formele gata, configuratorul, numele piesei, engleza).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul
o('U01', LG, 'gauri.length ? gauri.slice(0, 5) : ["xv", "ro"];\n    const e = ef(), s = P.pas, g = P.grinda_groasa, h = P.lamaj_h, n = lista.length',
  'gauri.length ? gauri.slice(0, 6) : ["xv", "ro"];\n    const e = ef(), s = P.pas, g = P.grinda_groasa, h = P.lamaj_h, n = lista.length', 'conector',
  'motorul lasă șase pași')
o('U02', LG, 'gauri.length ? gauri.slice(0, 5) : ["xv", "ro"];\n    const e = ef(), s = P.pas, g = P.grinda_groasa, h = P.lamaj_h, n = lista.length',
  'gauri.length ? gauri.slice(0, 5) : ["rv", "ro"];\n    const e = ef(), s = P.pas, g = P.grinda_groasa, h = P.lamaj_h, n = lista.length', 'conector',
  'forma implicită a motorului are știft în loc de ax')
o('U03', LG, 'let tip = c[0] === "x" || c[0] === "p" ? c[0] : "r";', 'let tip = c[0] === "x" || c[0] === "p" ? c[0] : "x";', 'conector',
  'un fel necunoscut devine gaură de ax')
o('U04', LG, 'const axa = c[1] === "o" || c[1] === "l" ? c[1] : "v";', 'const axa = c[1] === "o" || c[1] === "l" ? c[1] : "o";', 'conector',
  'o axă necunoscută devine „de-a latul”')
o('U05', LG, 'if (axa === "l" && !capat0 && !capat1 && tip !== "p") { lungLaMijloc = true; tip = "p"; }',
  'if (axa === "l" && !capat0 && !capat1 && tip !== "p") { lungLaMijloc = true; }', 'conector',
  'gaura în lung de la mijloc se taie totuși (prin vecini)')
o('U06', LG, 'if (lungLaMijloc) avert.push(', 'if (lungLaMijloc && n > 9) avert.push(', 'conector',
  'gaura în lung de la mijloc nu se mai spune')
o('U07', LG, 'else if (!cuGaura) avert.push(', 'else if (!cuGaura && n > 9) avert.push(', 'conector',
  'blocul fără nicio gaură nu se mai spune')
o('U08', LG, 'x0 = capat0 ? 0.1 : s * k - 0.01, x1 = capat1 ? s * n - 0.1 : s * (k + 1) + 0.01;',
  'x0 = capat0 ? 0 : s * k - 0.01, x1 = capat1 ? s * n - 0.1 : s * (k + 1) + 0.01;', 'conector',
  'capătul din stânga nu mai e tras: blocul e mai lung cu 0,1')
o('U09', LG, 'x0 = capat0 ? 0.1 : s * k - 0.01, x1 = capat1 ? s * n - 0.1 : s * (k + 1) + 0.01;',
  'x0 = capat0 ? 0.1 : s * k - 0.01, x1 = capat1 ? s * n : s * (k + 1) + 0.01;', 'conector',
  'capătul din dreapta nu mai e tras')
o('U10', LG, 'x0 = capat0 ? 0.1 : s * k - 0.01, x1 = capat1 ? s * n - 0.1 : s * (k + 1) + 0.01;',
  'x0 = capat0 ? 0.1 : s * k - 0.01, x1 = capat1 ? s * n - 0.1 : s * (k + 1) - 0.3;', 'conector',
  'pașii nu se mai ating: blocul iese în bucăți')
o('U11', LG, 'corp = inel(ext, cruce(ct[0], ct[1], e.axGauraD, e.axGauraLat), ct, w0, w1);',
  'corp = inel(ext, cerc(ct[0], ct[1], e.axGauraD / 2), ct, w0, w1);', 'conector',
  'gaura de ax iese rotundă')
o('U12', LG, 'corp = inel(ext, cerc(ct[0], ct[1], e.gauraD / 2), ct, jos ? a - 0.01 : a, sus ? b + 0.01 : b);',
  'corp = inel(ext, cerc(ct[0], ct[1], (e.gauraD + 0.5) / 2), ct, jos ? a - 0.01 : a, sus ? b + 0.01 : b);', 'conector',
  'gaura de știft e mai largă cu 0,5 decât cea din calibrare')
o('U13', LG, 'corp = inel(ext, cerc(ct[0], ct[1], e.gauraD / 2), ct, jos ? a - 0.01 : a, sus ? b + 0.01 : b);',
  'corp = inel(ext, cerc(ct[0], ct[1], (e.gauraD - 0.5) / 2), ct, jos ? a - 0.01 : a, sus ? b + 0.01 : b);', 'conector',
  'gaura de știft e mai strâmtă cu 0,5')
o('U14', LG, 'if (jos) corp.push(...inel(ext, cerc(ct[0], ct[1], e.lamajD / 2), ct, w0, a));',
  'if (jos) corp.push(...inel(ext, cerc(ct[0], ct[1], e.gauraD / 2), ct, w0, a));', 'conector',
  'fața de jos (sau capătul din stânga) n-are lamaj')
o('U15', LG, 'if (sus) corp.push(...inel(ext, cerc(ct[0], ct[1], e.lamajD / 2), ct, b, w1));',
  'if (sus) corp.push(...inel(ext, cerc(ct[0], ct[1], e.gauraD / 2), ct, b, w1));', 'conector',
  'fața de sus (sau capătul din dreapta) n-are lamaj')
o('U16', LG, 'a = jos ? w0 + h : w0, b = sus ? w1 - h : w1;', 'a = jos ? w0 + 2 * h : w0, b = sus ? w1 - h : w1;', 'conector',
  'lamajul de jos e de două ori mai adânc')
o('U17', LG, 'a = jos ? w0 + h : w0, b = sus ? w1 - h : w1;', 'a = jos ? w0 + h : w0, b = sus ? w1 - 2 * h : w1;', 'conector',
  'lamajul de sus e de două ori mai adânc')
o('U18', LG, 'const jos = !peLung || capat0, sus = !peLung || capat1,', 'const jos = true, sus = !peLung || capat1,', 'conector',
  'gaura în lung din dreapta are lamaj și spre vecin')
o('U19', LG, 'const jos = !peLung || capat0, sus = !peLung || capat1,', 'const jos = !peLung || capat0, sus = true,', 'conector',
  'gaura în lung din stânga are lamaj și spre vecin')
o('U20', LG, 'axe(corp, ([u, v, w]) => [u, w, v], true) : axe(corp, ([u, v, w]) => [w, u, v], false)',
  'axe(corp, ([u, v, w]) => [u, w, v], false) : axe(corp, ([u, v, w]) => [w, u, v], false)', 'conector',
  'pasul cu gaura de-a latul iese întors pe dos')
o('U21', LG, 'axe(corp, ([u, v, w]) => [u, w, v], true) : axe(corp, ([u, v, w]) => [w, u, v], false)',
  'axe(corp, ([u, v, w]) => [u, w, v], true) : axe(corp, ([u, v, w]) => [w, u, v], true)', 'conector',
  'pasul cu gaura în lung iese întors pe dos')
o('U22', LG, 'tri.push(...(axa === "v" ? corp : axa === "o" ? axe(corp, ([u, v, w]) => [u, w, v], true)',
  'tri.push(...(axa !== "l" ? corp : axa === "o" ? axe(corp, ([u, v, w]) => [u, w, v], true)', 'conector',
  'gaura de-a latul se face în sus')
o('U23', LG, 'ct: P2 = peLung ? [m, m] : [cx, m];', 'ct: P2 = peLung ? [m, m] : [cx, m + 0.5];', 'conector',
  'gaura nu e în mijlocul secțiunii (mutată cu 0,5)')
o('U24', LG, 'ct: P2 = peLung ? [m, m] : [cx, m];', 'ct: P2 = peLung ? [m + 0.5, m] : [cx, m];', 'conector',
  'gaura în lung nu e în mijlocul secțiunii')
o('U25', LG, 'const cx = s * k + s / 2, x0 = capat0 ? 0.1', 'const cx = s * k + s / 2 + 0.5, x0 = capat0 ? 0.1', 'conector',
  'gaura nu e în mijlocul pasului')
o('U26', LG, 'ext = peLung ? dreptunghi(0, 0, g, g) : dreptunghi(x0, 0, x1, g)', 'ext = peLung ? dreptunghi(0, 0, g, g) : dreptunghi(x0, 0, x1, P.grinda_lat)', 'conector',
  'blocul e lat cât grinda (7,2), nu cât grosimea ei')
o('U27', LG, 'const w0 = peLung ? x0 : 0, w1 = peLung ? x1 : g;', 'const w0 = peLung ? x0 : 0, w1 = peLung ? x1 : P.grinda_subtire;', 'conector',
  'blocul e gros cât grinda subțire')
o('U28', LG, 'ax, stiftTechnic, bucsa, conector, suport,', 'ax, stiftTechnic, bucsa, suport,', 'conector',
  'motorul nu mai știe piesa')

# --- atelierul: tabelele
o('T01', AT, '["bucsa", "Bucșă / conector"], ["conector", "Conector perpendicular"], ["clema", "Clemă"]', '["bucsa", "Bucșă / conector"], ["clema", "Clemă"]', 'tabele',
  'piesa nu e în nicio familie')
o('T02', AT, '    conector: `<rect x="2.5" y="7" width="19" height="10" rx="1"/>', '    conectorVechi: `<rect x="2.5" y="7" width="19" height="10" rx="1"/>', 'tabele',
  'piesa n-are desenul ei')
o('T03', EN, ' "Pasul {0}:": "Step {0}:",\n', ' "Pasul {0}:": "",\n', 'tabele',
  'un text al configuratorului n-are traducere')

# --- atelierul: configuratorul și numele
o('E01', AT, '    conector: { gauri: ["xv", "ro"] },', '    conector: { gauri: ["rv", "ro"] },', 'e2e',
  'forma implicită din atelier are știft în loc de ax')
o('E02', AT, 'const lista = Array.isArray(g) && g.length ? g.slice(0, 5) : ["xv", "ro"];', 'const lista = Array.isArray(g) && g.length ? g.slice(0, 4) : ["xv", "ro"];', 'e2e',
  'atelierul taie conectorul la patru pași')
o('E03', AT, 'const axa = c[1] === "o" ? "o" : c[1] === "l" && (k === 0 || k === lista.length - 1) ? "l" : "v";',
  'const axa = c[1] === "o" ? "o" : c[1] === "l" ? "l" : "v";', 'e2e',
  'un pas ajuns la mijloc își ține gaura în lung')
o('E04', AT, '...(k === 0 || k === n - 1 ? [["l", "În lung"] as const] : [])', '...([["l", "În lung"] as const])', 'e2e',
  '„În lung” se poate alege și la mijloc')
o('E05', AT, 'c[1] === "o" ? tr("lateral") : c[1] === "l" ? tr("în lung")', 'c[1] === "l" ? tr("lateral") : c[1] === "o" ? tr("în lung")', 'e2e',
  'numele piesei încurcă axele')
o('E06', AT, 'c[0] === "x" ? tr("ax") : tr("știft", "pin")', 'c[0] === "x" ? tr("știft", "pin") : tr("ax")', 'e2e',
  'numele piesei încurcă știftul cu axul')
o('E07', AT, 'pune(Array.from({ length: m }, (_, k) => g[k] ?? "rv"));', 'pune(Array.from({ length: m }, (_, k) => g[k] ?? "xv"));', 'e2e',
  'un pas nou e o gaură de ax, nu de știft')
o('E08', AT, 'm[1] === "tip" ? (v === "p" ? "p" : v + (vechi[1] ?? "v")) : vechi[0] + v', 'm[1] === "tip" ? (v === "p" ? "p" : v + "v") : vechi[0] + v', 'e2e',
  'la schimbarea felului, axa se pierde')
o('E09', AT, 'm[1] === "tip" ? (v === "p" ? "p" : v + (vechi[1] ?? "v")) : vechi[0] + v', 'm[1] === "tip" ? (v === "p" ? "p" : v + (vechi[1] ?? "v")) : "r" + v', 'e2e',
  'la schimbarea axei, felul devine știft')
o('E10', AT, 'if (f) pune([...f[2]]); };', 'if (f) pune([...f[2]].reverse()); };', 'e2e',
  'formele gata vin întoarse')
o('E11', AT, '["colt", "Colț pe trei axe", ["xl", "rv", "ro"]]', '["colt", "Colț pe trei axe", ["xv", "rv", "ro"]]', 'e2e',
  'colțul pe trei axe n-are gaura în lung')
o('E12', AT, '["stifturi", "Două știfturi și ax", ["rv", "rv", "xo"]]', '["stifturi", "Două știfturi și ax", ["rv", "rv", "xv"]]', 'e2e',
  'la „Două știfturi și ax”, axul e în același plan cu știfturile')
o('E13', AT, 'gata = CONECTORI.find(([, , c]) => c.join() === g.join());', 'gata = CONECTORI.find(([, , c]) => c.length === g.length);', 'e2e',
  '„Repede” arată apăsată o formă gata și la una făcută de mână')
o('E14', AT, 'seg("at-co-lung", [1, 2, 3, 4, 5].map(', 'seg("at-co-lung", [1, 2, 3, 4].map(', 'e2e',
  'lungimea 5 nu se poate alege')
o('E15', AT, '${c[0] === "p" ? "" : seg("at-co-axa-" + k,', '${c[0] === "q" ? "" : seg("at-co-axa-" + k,', 'e2e',
  'un pas plin își arată axa')
o('E16', AT, 'return tr`Conector 1×${pasi.length}: ${pasi.join(", ")}`;', 'return tr`Conector 1×${pasi.length}`;', 'e2e',
  'numele piesei nu-și spune pașii (două forme diferite, același nume și același fișier)')

SETURI = {
    'conector': ['test/unit/trenulet.conector.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.conector.spec.ts']
