# Lista de otrăvuri a feliei 3.Cj-3 (cadrul, fereastra, din atelierul Easy 3Draw; ADR 0284), 25.11.2026, alese de autor:
# motorul (marginile și implicitele, rama, golul, teșitura și puntea, pragul, stâlpii și buiandrugul, știfturile,
# prinderile, cotele date atelierului) și atelierul (familia și desenul, numele, câmpurile și marginile lor, mărimile
# uzuale, colțurile alese, textul cu golul și puntea).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: marginile și implicitele
LU = 'const n = intreg(d.lung, 2, 8, 4, x => tr`Un cadru are între 2 și 8 știfturi'
o('A01', LG, LU, LU.replace('2, 8, 4', '2, 8, 6'), 'cadru', 'cadrul implicit are 6 știfturi')
o('A02', LG, LU, LU.replace('2, 8, 4', '1, 8, 4'), 'cadru', 'cadrul poate avea un știft')
o('A03', LG, LU, LU.replace('2, 8, 4', '2, 16, 4'), 'cadru', 'cadrul poate avea 16 știfturi')
IN = 'const c = intreg(d.inalt, 2, 6, 3, x => tr`Un cadru are între 2 și 6 cărămizi înălțime'
o('A04', LG, IN, IN.replace('2, 6, 3', '2, 6, 2'), 'cadru', 'cadrul implicit are două cărămizi înălțime')
o('A05', LG, IN, IN.replace('2, 6, 3', '1, 6, 3'), 'cadru', 'cadrul poate avea o cărămidă înălțime (fără gol)')
o('A06', LG, IN, IN.replace('2, 6, 3', '2, 9, 3'), 'cadru', 'cadrul poate avea 9 cărămizi înălțime')
NT = 'const c = numarCerut(v), r = Math.round(Number.isFinite(c) ? c : implicit), x = Math.min(b, Math.max(a, r));\n      if (x !== r) avert.push(ce(x));'
o('A07', LG, NT, NT.replace('if (x !== r) avert.push(ce(x));', 'if (x !== c) avert.push(ce(x));'), 'cadru', 'un număr cu zecimale (sau lipsa lui) e spus ca ieșit din margini')
o('A08', LG, NT, NT.replace('if (x !== r) avert.push(ce(x));', ''), 'cadru', 'numerele aduse în margini nu mai sunt spuse')
o('A09', LG, NT, NT.replace('r = Math.round(', 'r = Math.floor('), 'cadru', 'numerele se taie, nu se rotunjesc')
RA = 'const rc = numarCerut(d.rama), rama = zecime(Math.min(4, Math.max(1.2, Number.isFinite(rc) ? rc : 1.6)));'
o('A10', LG, RA, RA.replace('rc : 1.6', 'rc : 2'), 'cadru', 'rama implicită are 2 mm')
o('A11', LG, RA, RA.replace('Math.max(1.2,', 'Math.max(0.6,'), 'cadru', 'rama poate avea 0,6 mm')
o('A12', LG, RA, RA.replace('Math.min(4,', 'Math.min(8,'), 'cadru', 'rama poate avea 8 mm (golul dispare la cadrul scurt)')
o('A13', LG, RA, RA.replace('rama = zecime(', 'rama = ('), 'cadru', 'rama nu se rotunjește la zecimi')
RV = 'if (Number.isFinite(rc) && (rc < 1.2 - 1e-9 || rc > 4 + 1e-9)) avert.push(tr`Rama unui cadru'
o('A14', LG, RV, 'if (false) avert.push(tr`Rama unui cadru', 'cadru', 'rama adusă în margini nu mai e spusă')
o('A15', LG, RV, 'if (Number.isFinite(rc) && rc !== rama) avert.push(tr`Rama unui cadru', 'cadru', 'rama rotunjită la zecimi e spusă ca ieșită din margini')
GE = 'const tesit = d.colturi === "tesite", Lx = P.pas * n - 2 * P.joc_lateral, H = 3 * P.placa * c, w = Lx - 2 * rama, h = H - 2 * P.placa;'
o('A16', LG, GE, GE.replace('d.colturi === "tesite"', 'd.colturi !== "drepte"'), 'cadru', 'orice alt cuvânt la colțuri dă colțuri teșite')
o('A17', LG, GE, GE.replace('w = Lx - 2 * rama', 'w = Lx - rama'), 'cadru', 'golul e socotit cu o singură ramă')
o('A18', LG, GE, GE.replace('h = H - 2 * P.placa', 'h = H - P.placa'), 'cadru', 'golul e socotit fără buiandrug')
o('A19', LG, GE, GE.replace('H = 3 * P.placa * c', 'H = 3 * P.placa * c + P.placa'), 'cadru', 'cadrul e mai înalt cu o placă')
TE = 'k: tesit ? Math.max(0, Math.min((w - P.pas) / 2, h - 2)) : 0, avert };'
o('A20', LG, TE, TE.replace('(w - P.pas) / 2', 'w / 2'), 'cadru', 'teșiturile se întâlnesc la mijloc (nu rămâne punte)')
o('A21', LG, TE, TE.replace('h - 2', 'h'), 'cadru', 'teșitura poate lua tot stâlpul')
o('A22', LG, TE, TE.replace('Math.max(0, Math.min(', 'Math.min(0, Math.min('), 'cadru', 'teșitura iese zero sau negativă')
o('A23', LG, TE, TE.replace('k: tesit ? ', 'k: !tesit ? '), 'cadru', 'colțurile, pe dos: cele drepte sunt teșite')
# --- motorul: corpul
PR = 'const prag = caramida({ celule: Array.from({ length: q.n }, (_, i): Celula => [i, 0]), placi: 1, stifturi: false });'
o('B01', LG, PR, PR.replace('placi: 1,', 'placi: 2,'), 'cadru', 'pragul are două plăci')
o('B02', LG, PR, PR.replace('stifturi: false', 'stifturi: true'), 'cadru', 'pragul are știfturi (în gol)')
o('B03', LG, PR, PR.replace('length: q.n }', 'length: q.n - 1 }'), 'cadru', 'pragul e mai scurt cu un știft')
o('B04', LG, PR, PR.replace("placi: 1, stifturi: false", "placi: 1, stifturi: false, fund: \"locasuri\""), 'cadru', 'pragul e plin, cu locașuri rotunde (nu o placă obișnuită)')
XX = 'const x0 = j0, x1 = s * q.n - j0, zj = P.placa, zs = q.H - P.placa, xa = j0 + q.rama, xb = s * q.n - j0 - q.rama;'
o('B05', LG, XX, XX.replace('zj = P.placa,', 'zj = P.placa + 1,'), 'cadru', 'golul începe la 1 mm peste prag')
o('B06', LG, XX, XX.replace('zs = q.H - P.placa,', 'zs = q.H - P.placa - 1,'), 'cadru', 'buiandrugul e mai gros cu 1 mm')
o('B07', LG, XX, XX.replace('xa = j0 + q.rama,', 'xa = j0 + q.rama + 0.5,'), 'cadru', 'stâlpul din stânga e mai gros cu 0,5 mm')
o('B08', LG, XX, XX.replace('xb = s * q.n - j0 - q.rama;', 'xb = s * q.n - j0 - q.rama + 0.5;'), 'cadru', 'stâlpul din dreapta e mai subțire cu 0,5 mm')
# (B09 de la prima rulare scotea o retragere de 0,01 mm a stâlpilor față de fețele pragului: echivalentă, fiindcă muchiile
# celor două corpuri nu coincid nici fără ea; retragerea a ieșit din cod, iar otrava e acum alta)
o('B09', LG, XX, XX.replace('x0 = j0,', 'x0 = j0 + 0.5,'), 'cadru', 'stâlpul din stânga nu ajunge la fața piesei')
o('B10', LG, XX, XX.replace('x1 = s * q.n - j0,', 'x1 = s * q.n - j0 + 0.5,'), 'cadru', 'cadrul iese din lungimea lui')
GO = 'const gol: Poli = q.k > 1e-9 ? [[xa, zj], [xb, zj], [xb, zs - q.k], [xb - q.k, zs], [xa + q.k, zs], [xa, zs - q.k]] : [[xa, zj], [xb, zj], [xb, zs], [xa, zs]];'
o('B11', LG, GO, GO.replace('[xb - q.k, zs], [xa + q.k, zs],', '[xb - q.k, zs], [xa, zs],').replace(', [xa, zs - q.k]] :', ']] :'), 'cadru', 'doar colțul din dreapta e teșit')
o('B12', LG, GO, GO.replace('q.k > 1e-9 ?', 'q.k > 1e9 ?'), 'cadru', 'golul e mereu dreptunghi')
o('B13', LG, GO, GO.replace('[xb, zs - q.k], [xb - q.k, zs], [xa + q.k, zs], [xa, zs - q.k]]', '[xb, zs - q.k / 2], [xb - q.k, zs], [xa + q.k, zs], [xa, zs - q.k / 2]]'), 'cadru', 'teșitura coboară doar pe jumătate (nu e la 45°)')
CO = 'tri.push(...axe(prismaGauri([[x0, zj - 0.3], [x1, zj - 0.3], [x1, q.H], [x0, q.H]], [gol], j0, s - j0), ([u, v, w]) => [u, w, v], true));'
o('B14', LG, CO, CO.replace('[[x0, zj - 0.3], [x1, zj - 0.3],', '[[x0, zj + 0.3], [x1, zj + 0.3],'), 'cadru', 'stâlpii nu ajung la prag (plutesc)')
o('B15', LG, CO, CO.replace('[x1, q.H], [x0, q.H]]', '[x1, q.H - 1], [x0, q.H - 1]]'), 'cadru', 'buiandrugul e mai jos cu 1 mm (știfturile plutesc)')
o('B16', LG, CO, CO.replace('[gol], j0, s - j0)', '[gol], j0, s / 2)'), 'cadru', 'stâlpii și buiandrugul au doar jumătate din adâncime')
o('B17', LG, CO, CO.replace('[gol], j0,', '[], j0,'), 'cadru', 'cadrul n-are gol')
o('B18', LG, CO, CO.replace('s - j0)', 's - j0 + 0.5)'), 'cadru', 'cadrul iese din adâncimea lui')
o('B22', LG, CO, CO.replace('[[x0, zj - 0.3], [x1, zj - 0.3],', '[[x0, zj - 1.5], [x1, zj - 1.5],'), 'cadru', 'stâlpii coboară prin capacul pragului, în locașuri')
SF = 'tri.push(...stifturi(Array.from({ length: q.n }, (_, k): P2 => [s * k + s / 2, s / 2]), q.H, e.stiftD));\n    // prinderile: locașurile pragului și știfturile de pe buiandrug'
o('B19', LG, SF, SF.replace('length: q.n }', 'length: q.n - 1 }'), 'cadru', 'lipsește ultimul știft')
o('B20', LG, SF, SF.replace('[s * k + s / 2, s / 2]', '[s * k + s / 2 + 1, s / 2]'), 'cadru', 'știfturile sunt mutate cu 1 mm')
o('B21', LG, SF, SF.replace('), q.H, e.stiftD));', '), q.H - 2, e.stiftD));'), 'cadru', 'știfturile sunt îngropate în buiandrug')
PD = 'const prinderi: Prindere[] = prag.prinderi.filter(c => c.fel === "locas");\n    for (let k = 0; k < q.n; k++) prinderi.push({ fel: "stift", p: [s * k + s / 2, s / 2, q.H], d: SUS, lung: P.stift_h });\n    return { tri, avert: q.avert, prinderi };\n  }'
o('C01', LG, PD, PD.replace('prag.prinderi.filter(c => c.fel === "locas")', '[]'), 'cadru', 'cadrul nu-și spune locașurile')
o('C02', LG, PD, PD.replace('k < q.n; k++', 'k < q.n - 1; k++'), 'cadru', 'cadrul nu-și spune ultimul știft')
o('C03', LG, PD, PD.replace('p: [s * k + s / 2, s / 2, q.H]', 'p: [s * k + s / 2, s / 2, 0]'), 'cadru', 'știfturile sunt declarate pe masă')
o('C04', LG, PD, PD.replace('d: SUS,', 'd: JOS,'), 'cadru', 'știfturile sunt declarate în jos')
o('C05', LG, PD, PD.replace('avert: q.avert,', 'avert: [],'), 'cadru', 'piesa nu mai spune ce a adus în margini')
CT = 'cadruCote: (d: CadruDef) => { const q = cadruCote(d); return { lung: q.n, inalt: q.c, rama: q.rama, colturi: q.tesit ? "tesite" : "drepte", golLat: q.w, golInalt: q.h, tesitura: q.k, punte: q.w - 2 * q.k, inaltime: q.H }; },'
o('D01', LG, CT, CT.replace('golLat: q.w,', 'golLat: q.Lx,'), 'cadru', 'atelierului i se dă lungimea piesei drept lățime a golului')
o('D02', LG, CT, CT.replace('golInalt: q.h,', 'golInalt: q.H,'), 'cadru', 'atelierului i se dă înălțimea piesei drept înălțime a golului')
o('D03', LG, CT, CT.replace('punte: q.w - 2 * q.k,', 'punte: q.w - q.k,'), 'cadru', 'puntea e socotită cu o singură teșitură')
o('D04', LG, CT, CT.replace('q.tesit ? "tesite" : "drepte"', '"drepte"'), 'cadru', 'atelierului i se spune mereu „colțuri drepte”')
o('D05', LG, CT, CT.replace('tesitura: q.k,', 'tesitura: 0,'), 'cadru', 'atelierului nu i se spune teșitura')
# --- atelierul: tabelele
o('T01', AT, '["arc", "Arc"], ["cadru", "Cadru / fereastră"],', '["arc", "Arc"],', 'tabele', 'cadrul nu e în nicio familie')
o('T02', AT, '    cadru: `<path d="M3 20.5v-13.5h18v13.5z"/><path d="M6.5 17.5v-7.5h11v7.5z"/><path d="M5 7v-2.2h3.2v2.2M10.4 7v-2.2h3.2v2.2M15.8 7v-2.2h3.2v2.2"/>`,\n', '', 'tabele', 'cadrul n-are desen')
o('T03', EN, ' "Colțuri teșite": "Chamfered corners",\n', '', 'tabele', 'un text al cadrului lipsește din dicționar')
# --- atelierul: editorul (probele din browser)
ST = 'cadru: { lung: 4, inalt: 3, rama: 1.6, colturi: "drepte" },'
o('E01', AT, ST, ST.replace('inalt: 3', 'inalt: 2'), 'e2e', 'cadrul se deschide cu două cărămizi înălțime')
o('E02', AT, ST, ST.replace('colturi: "drepte"', 'colturi: "tesite"'), 'e2e', 'cadrul se deschide cu colțurile teșite')
NU = 'return tr`Cadru 1×${q.lung}×${q.inalt}` + (q.rama === 1.6 ? "" : tr`, rama ${fmt(q.rama)} mm`) + (q.colturi === "tesite" ? tr(", colțuri teșite") : "");'
o('E03', AT, NU, NU.replace('1×${q.lung}×${q.inalt}', '1×${q.inalt}×${q.lung}'), 'e2e', 'numele scrie înălțimea în locul lungimii')
o('E04', AT, NU, NU.replace('q.rama === 1.6 ? ""', 'q.rama === 4 ? ""'), 'e2e', 'numele spune rama obișnuită și o tace pe cea groasă')
o('E05', AT, NU, NU.replace(' + (q.colturi === "tesite" ? tr(", colțuri teșite") : "")', ''), 'e2e', 'numele nu spune colțurile teșite')
o('E06', AT, 'camp("#at-cad-lung", 2, 8, v => { p.lung = v; });', 'camp("#at-cad-lung", 1, 8, v => { p.lung = v; });', 'e2e', 'câmpul primește lungimea 1')
o('E07', AT, 'camp("#at-cad-lung", 2, 8, v => { p.lung = v; });', 'camp("#at-cad-lung", 2, 9, v => { p.lung = v; });', 'e2e', 'câmpul primește lungimea 9')
o('E08', AT, 'camp("#at-cad-inalt", 2, 6, v => { p.inalt = v; });', 'camp("#at-cad-inalt", 1, 6, v => { p.inalt = v; });', 'e2e', 'câmpul primește înălțimea 1')
o('E09', AT, 'camp("#at-cad-inalt", 2, 6, v => { p.inalt = v; });', 'camp("#at-cad-inalt", 2, 7, v => { p.inalt = v; });', 'e2e', 'câmpul primește înălțimea 7')
o('E10', AT, 'camp("#at-cad-rama", 1.2, 4, v => { p.rama = v; });', 'camp("#at-cad-rama", 1, 4, v => { p.rama = v; });', 'e2e', 'câmpul primește rama 1,1')
o('E11', AT, 'camp("#at-cad-rama", 1.2, 4, v => { p.rama = v; });', 'camp("#at-cad-rama", 1.2, 5, v => { p.rama = v; });', 'e2e', 'câmpul primește rama 4,1')
o('E12', AT, 'camp("#at-cad-inalt", 2, 6, v => { p.inalt = v; });', 'camp("#at-cad-inalt", 2, 6, v => { p.lung = v; });', 'e2e', 'înălțimea scrisă schimbă lungimea')
RP = 'f = b && CADRE.find(a => a.join("x") === b.dataset.v); if (f) { p.lung = f[0]; p.inalt = f[1]; editor(); schimbat(); } };'
o('E13', AT, RP, RP.replace('p.lung = f[0]; p.inalt = f[1];', 'p.lung = f[1]; p.inalt = f[0];'), 'e2e', 'mărimea uzuală pune lungimea și înălțimea pe dos')
o('E14', AT, RP, RP.replace('p.lung = f[0]; p.inalt = f[1];', 'p.lung = f[0];'), 'e2e', 'mărimea uzuală nu schimbă înălțimea')
o('E15', AT, '$("#at-cad-colturi").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.colturi = b.dataset.v!; editor(); schimbat(); };',
  '$("#at-cad-colturi").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.colturi = "drepte"; editor(); schimbat(); };', 'e2e', 'colțurile teșite nu se pot alege')
o('E16', AT, 'seg("at-cad-colturi", [["drepte", "Colțuri drepte"], ["tesite", "Colțuri teșite"]], q.colturi)', 'seg("at-cad-colturi", [["drepte", "Colțuri drepte"], ["tesite", "Colțuri teșite"]], "drepte")', 'e2e',
  'colțurile alese nu se văd apăsate')
o('E17', AT, 'const gata = CADRE.find(([n, c]) => n === q.lung && c === q.inalt);', 'const gata = CADRE.find(([n]) => n === q.lung);', 'e2e', 'mărimea uzuală apăsată se alege doar după lungime')
o('E18', AT, 'const CADRE: readonly (readonly [number, number])[] = [[2, 2], [2, 3], [4, 3], [4, 5], [4, 6]];', 'const CADRE: readonly (readonly [number, number])[] = [[2, 2], [2, 3], [4, 3], [4, 5]];', 'e2e', 'lipsește o mărime uzuală (ușa 1 × 4 × 6)')
IF = 'tr`Golul are ${fmt(q.golLat)} × ${fmt(q.golInalt)} mm. Puntea de sus, de ${fmt(q.punte)} mm, se tipărește în aer.`'
o('E19', AT, IF, IF.replace('${fmt(q.golLat)} × ${fmt(q.golInalt)}', '${fmt(q.golInalt)} × ${fmt(q.golLat)}'), 'e2e', 'textul scrie golul pe dos')
o('E20', AT, IF, IF.replace('de ${fmt(q.punte)} mm', 'de ${fmt(q.golLat)} mm'), 'e2e', 'textul scrie lățimea golului drept punte')
o('E21', AT, '${q.tesitura > 0 ? " " + tr`Colțurile de sus sunt teșite cu ${fmt(q.tesitura)} mm.` : ""}', '', 'e2e', 'textul nu spune teșitura')
o('E22', AT, '${q.tesitura > 0 ? " " + tr`Colțurile de sus sunt teșite cu ${fmt(q.tesitura)} mm.` : ""}', '${q.colturi === "tesite" ? " " + tr`Colțurile de sus sunt teșite cu ${fmt(q.tesitura)} mm.` : ""}', 'e2e',
  'textul spune o teșitură de 0 mm la golul prea îngust')
o('E23', AT, '${q.punte > 40 ? " " + tr("Peste 40 mm, puntea se poate lăsa la tipărire:', '${q.punte > 60 ? " " + tr("Peste 40 mm, puntea se poate lăsa la tipărire:', 'e2e', 'puntea prea lungă nu mai e spusă la 55,8 mm')
o('E24', AT, '${q.punte > 40 ? " " + tr("Peste 40 mm, puntea se poate lăsa la tipărire:', '${q.punte > 20 ? " " + tr("Peste 40 mm, puntea se poate lăsa la tipărire:', 'e2e', 'puntea de 28,6 mm e spusă prea lungă')
o('E25', AT, '<input id="at-cad-rama" type="number" min="1.2" max="4" step="0.1" value="${q.rama}">', '<input id="at-cad-rama" type="number" min="1.2" max="4" step="0.1" value="${p.rama}">', 'e2e',
  'câmpul ramei arată zecimalele scrise, nu rotunjirea')
o('E26', AT, '<input id="at-cad-inalt" type="number" min="2" max="6" step="1" value="${q.inalt}">', '<input id="at-cad-inalt" type="number" min="2" max="6" step="1" value="${q.lung}">', 'e2e', 'câmpul înălțimii arată lungimea')

SETURI = {
    'cadru': ['test/unit/trenulet.cadru.test.ts'],
    'tabele': ['test/unit/trenulet.familii.test.ts', 'test/unit/trenulet.pictograme.test.ts', 'test/unit/trenulet.engleza.test.ts', 'test/unit/trenulet.tipuri.test.ts'],
}
E2E = ['test/e2e/trenulet.cadru.spec.ts']
