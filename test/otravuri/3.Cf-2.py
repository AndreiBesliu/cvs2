# Lista de otrăvuri a feliei 3.Cf-2 (orientarea de mână pe trei axe și jumătățile de pas în vederea „Modelul” a atelierului
# Easy 3Draw; ADR 0284, partea D), 26.11.2026, alese de autor: motorul (răsturnarea în jurul axelor X și Y, cu mijlocul pe
# loc și partea de jos la aceeași înălțime, rotirea unei piese rotunde în jurul axului ei, locul unei piese dintre știfturi,
# partea de sus a piesei) și atelierul (butoanele, comutatorul jumătăților, mutările cu o jumătate de pas, tastele, rândul
# piesei răsturnate, aspectul comutatorului).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
HD = 'extensii/trenulet/sursa/planificator/head.html'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: răsturnarea
IN = 'const INTORS = { x: [1, 0, 0, 0, 0, -1, 0, 1, 0], y: [0, 0, 1, 0, 1, 0, -1, 0, 0] } as const;'
o('M01', LG, IN, IN.replace('x: [1, 0, 0, 0, 0, -1, 0, 1, 0]', 'x: [1, 0, 0, 0, 0, 1, 0, -1, 0]'), 'intoarcere', 'în jurul lui X, vârful cade spre spate')
o('M02', LG, IN, IN.replace('y: [0, 0, 1, 0, 1, 0, -1, 0, 0]', 'y: [0, 0, -1, 0, 1, 0, 1, 0, 0]'), 'intoarcere', 'în jurul lui Y, vârful cade spre stânga')
AX = 'const R = INTORS[axa === "y" ? "y" : "x"], rc = roteste(R, c);'
o('M03', LG, AX, AX.replace('axa === "y" ? "y" : "x"', 'axa === "y" ? "x" : "y"'), 'intoarcere', 'axele răsturnării, schimbate între ele')
o('M04', LG, AX, AX.replace('axa === "y" ? "y" : "x"', 'axa === "x" ? "x" : "y"'), 'intoarcere', 'o axă necunoscută e luată drept Y')
o('M05', LG, AX, AX.replace('rc = roteste(R, c)', 'rc = c'), 'intoarcere', 'răsturnarea se face în jurul originii, nu al mijlocului piesei')
o('M06', LG, '    if (!transfBuna(T)) return T;\n', '', 'intoarcere', 'o transformare stricată nu mai rămâne cum e')
CE = 'c: P3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];'
o('M07', LG, CE, CE.replace('[(lo[0] + hi[0]) / 2,', '[lo[0],'), 'intoarcere', 'răsturnarea în jurul lui Y, prin marginea cutiei, nu prin mijloc')
o('M08', LG, CE, CE.replace('(lo[1] + hi[1]) / 2,', 'lo[1],'), 'intoarcere', 'răsturnarea în jurul lui X, prin marginea cutiei, nu prin mijloc')
o('M09', LG, CE, CE.replace('(lo[2] + hi[2]) / 2]', 'lo[2]]'), 'intoarcere', 'răsturnarea, prin fundul cutiei: mijlocul se mută')
JO = 'return { m: N.m, t: [N.t[0], N.t[1], N.t[2] + lo[2] - jos] };'
o('M10', LG, JO, JO.replace('N.t[2] + lo[2] - jos', 'N.t[2]'), 'intoarcere', 'partea de jos nu rămâne la înălțimea ei')
o('M11', LG, JO, JO.replace('N.t[2] + lo[2] - jos', 'N.t[2] + hi[2] - jos'), 'intoarcere', 'piesa răsturnată e pusă pe vechiul ei vârf')
o('M12', LG, JO, JO.replace('[N.t[0], N.t[1],', '[N.t[1], N.t[0],'), 'intoarcere', 'mutarea piesei răsturnate, cu x și y schimbate între ele')
CN = 'const N = compuneTransf({ m: [...R], t: [c[0] - rc[0], c[1] - rc[1], c[2] - rc[2]] }, T), jos = cutieTransf(N, dim)[0][2];'
o('M13', LG, CN, CN.replace('jos = cutieTransf(N, dim)[0][2]', 'jos = cutieTransf(N, dim)[1][2]'), 'intoarcere', 'vârful piesei răsturnate e pus la înălțimea părții de jos')
o('M14', LG, CN, 'const N = compuneTransf(T, { m: [...R], t: [c[0] - rc[0], c[1] - rc[1], c[2] - rc[2]] }), jos = cutieTransf(N, dim)[0][2];', 'intoarcere', 'răsturnarea, compusă invers (în sistemul piesei, nu al lumii)')
o('M15', LG, CN, CN.replace('c[1] - rc[1]', 'c[1] + rc[1]'), 'intoarcere', 'mijlocul piesei răsturnate, cu semnul greșit pe y')

# --- motorul: piesa rotundă care stă drept se rotește în jurul axului
PV = 'if (pivot && Math.abs(T.m[8]! - 1) < 1e-9) {'
o('M16', LG, PV, 'if (pivot) {', 'intoarcere', 'și o piesă răsturnată se rotește în jurul pivotului')
o('M17', LG, PV, 'if (pivot && Math.abs(T.m[8]! - 1) > 1e-9) {', 'intoarcere', 'pivotul e folosit doar la piesele răsturnate')
PP = 'const [px, py] = aplicaTransf(T, [pivot[0]!, pivot[1]!, 0]);'
o('M18', LG, PP, 'const [px, py] = [pivot[0]!, pivot[1]!];', 'intoarcere', 'pivotul nu e dus în lume')
PR = 'return compuneTransf({ m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [px + py, py - px, 0] }, T);'
o('M19', LG, PR, PR.replace('t: [px + py, py - px, 0]', 't: [px - py, py + px, 0]'), 'intoarcere', 'rotirea în jurul axului, în jurul altui punct')
o('M20', LG, PR, PR.replace('m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [px + py, py - px, 0]', 'm: [0, 1, 0, -1, 0, 0, 0, 0, 1], t: [px - py, py + px, 0]'), 'intoarcere', 'piesa rotundă se rotește în sensul acelor')

# --- motorul: locul unei piese care stă drept și partea de sus
OR = '      if (oriunde) return { x, y, z, rot };\n'
o('M21', LG, OR, '      if (oriunde) return { x, y, z, rot: 0 };\n', 'intoarcere', 'locul dintre știfturi își pierde rotirea')
o('M22', LG, OR, '      if (oriunde) return { x: y, y: x, z, rot };\n', 'intoarcere', 'locul dintre știfturi, cu x și y schimbate între ele')
o('M23', LG, 'const loculDrept = (a: Asezare, T: Transf) => grilaDinTransf(a, T, true);', 'const loculDrept = (a: Asezare, T: Transf) => grilaDinTransf(a, T, false);', 'intoarcere', 'o piesă dintre știfturi n-are loc')
SU = 'const sus = [T.m[2]!, T.m[5]!, T.m[8]!], k = sus.findIndex(v => Math.abs(Math.abs(v) - 1) < 1e-6);'
o('M24', LG, SU, SU.replace('[T.m[2]!, T.m[5]!, T.m[8]!]', '[T.m[6]!, T.m[7]!, T.m[8]!]'), 'intoarcere', 'partea de sus, citită din rândul matricei, nu din coloană')
o('M25', LG, SU, SU.replace('< 1e-6', '< 2'), 'intoarcere', 'orice piesă are partea de sus spre x')
o('M26', LG, '    if (k < 0) return null;\n', '', 'intoarcere', 'o piesă înclinată altfel nu mai dă null')
SR = 'return (sus[k]! > 0 ? ["x+", "y+", "sus"] as const : ["x-", "y-", "jos"] as const)[k]!;'
o('M27', LG, SR, SR.replace('sus[k]! > 0', 'sus[k]! < 0'), 'intoarcere', 'sensul părții de sus, întors')
o('M28', LG, SR, SR.replace('["x+", "y+", "sus"]', '["y+", "x+", "sus"]'), 'intoarcere', 'x și y ale părții de sus, schimbate între ele')
o('M29', LG, SR, SR.replace('["x-", "y-", "jos"]', '["x-", "y-", "sus"]'), 'intoarcere', 'o piesă cu fața în jos e spusă „în sus”')

# --- atelierul: butoanele și comutatorul
BU = 'if (m && felM !== "prins") mutari += `<button class="btn" type="button" data-m="tx"'
o('A01', AT, BU, BU.replace('felM !== "prins"', 'felM === "grila"'), 'e2e', 'o piesă răsturnată nu mai are răsturnările și jumătățile')
o('A02', AT, BU, BU.replace('m && felM !== "prins"', 'm'), 'e2e', 'și o piesă prinsă primește răsturnările')
BX = 'data-m="tx" aria-label="${tr("Răstoarnă spre față")}">Răstoarnă ↓</button><button class="btn" type="button" data-m="ty" aria-label="${tr("Răstoarnă spre dreapta")}">Răstoarnă →</button>'
o('A03', AT, BX, BX.replace('data-m="tx"', 'data-m="t_"').replace('data-m="ty"', 'data-m="tx"').replace('data-m="t_"', 'data-m="ty"'), 'e2e', 'butoanele răsturnării, schimbate între ele')
o('A04', AT, BX, BX.replace('tr("Răstoarnă spre față")', 'tr("Răstoarnă spre dreapta")'), 'e2e', 'numele butonului „Răstoarnă ↓” spune „spre dreapta”')
BF = '<button class="btn" type="button" data-m="fin" aria-pressed="${pasFin}">Jumătăți de pas</button>`;'
o('A05', AT, BF, BF.replace('aria-pressed="${pasFin}"', 'aria-pressed="false"'), 'e2e', 'comutatorul nu se arată ales')
o('A06', AT, BF, '`;', 'e2e', 'comutatorul jumătăților lipsește')
FI = 'if (op === "fin") { pasFin = !pasFin; editorModel(); return; }'
o('A07', AT, FI, FI.replace('pasFin = !pasFin;', 'pasFin = true;'), 'e2e', 'jumătățile nu se mai pot opri')
o('A08', AT, FI, FI.replace(' editorModel();', ''), 'e2e', 'comutatorul nu se redesenează după clic')
o('A09', AT, '  let pasFin = false;\n', '  let pasFin = true;\n', 'e2e', 'jumătățile sunt alese de la început')

# --- atelierul: mutările
KK = 'const k = fin ? 0.5 : 1;'
o('A10', AT, KK, 'const k = fin ? 0.25 : 1;', 'e2e', 'jumătatea de pas e un sfert')
o('A11', AT, KK, 'const k = 1;', 'e2e', 'jumătățile mută cu un pas întreg')
CO = 'if (a && c && (a.fel === "liber" || op === "tx" || op === "ty" || (fin && op !== "r"))) {'
o('A12', AT, CO, CO.replace(' || op === "tx" || op === "ty"', ''), 'e2e', 'o piesă de pe grilă nu se răstoarnă')
o('A13', AT, CO, CO.replace('(fin && op !== "r")', 'fin'), 'e2e', 'cu jumătățile alese, o piesă de pe grilă se rotește în jurul mijlocului cutiei')
o('A14', AT, CO, CO.replace(' || (fin && op !== "r")', ''), 'e2e', 'o piesă de pe grilă nu se mută cu o jumătate de pas')
PA = 'if (pas) lasaPeLoc(m, { m: a.T.m, t: [a.T.t[0] + pas[0]! * k, a.T.t[1] + pas[1]! * k, a.T.t[2] + pas[2]! * k] });'
o('A15', AT, PA, PA.replace('pas[0]! * k', 'pas[0]!'), 'e2e', 'pe x, jumătatea de pas e un pas întreg')
o('A16', AT, PA, PA.replace('pas[1]! * k', 'pas[1]!'), 'e2e', 'pe y, jumătatea de pas e un pas întreg')
o('A17', AT, PA, PA.replace('pas[2]! * k', 'pas[2]!'), 'e2e', 'pe z, jumătatea de placă e o placă')
TX = 'else if (op === "tx" || op === "ty") lasaPeLoc(m, Lego.intorsLiber(a.T, c.dim, op === "tx" ? "x" : "y"));'
o('A18', AT, TX, TX.replace('op === "tx" ? "x" : "y"', 'op === "tx" ? "y" : "x"'), 'e2e', 'butoanele răstoarnă în jurul celeilalte axe')
o('A19', AT, TX, TX.replace('lasaPeLoc(m, Lego.intorsLiber(a.T, c.dim, op === "tx" ? "x" : "y"))', 'm.liber = Lego.intorsLiber(a.T, c.dim, op === "tx" ? "x" : "y")'), 'e2e', 'a patra răsturnare nu pune piesa la loc pe grilă')
RO = 'else if (op === "r") lasaPeLoc(m, Lego.rotitLiber(a.T, c.dim, c.ax ? c.pivot : null));'
o('A20', AT, RO, RO.replace('c.ax ? c.pivot : null', 'null'), 'e2e', 'o camă dintre știfturi se rotește în jurul cutiei, nu al axului')

# --- atelierul: tastele
TA = 'r: "r", R: "r", x: "tx", X: "tx", y: "ty", Y: "ty" }[ev.key];'
o('A21', AT, TA, TA.replace('x: "tx", X: "tx", y: "ty", Y: "ty"', 'x: "ty", X: "ty", y: "tx", Y: "tx"'), 'e2e', 'tastele X și Y, schimbate între ele')
o('A22', AT, TA, TA.replace(' X: "tx",', ''), 'e2e', 'X cu Shift nu răstoarnă')
o('A23', AT, TA, TA.replace(', Y: "ty"', ''), 'e2e', 'Y cu Shift nu răstoarnă')
MO = 'if (ev.ctrlKey || ev.altKey || ev.metaKey) return;'
o('A24', AT, '    ' + MO + '\n', '', 'e2e', 'Ctrl + X răstoarnă piesa')
o('A25', AT, MO, 'if (ev.altKey || ev.metaKey) return;', 'e2e', 'tastele cu Ctrl sunt luate de model')
o('A26', AT, MO, 'if (ev.ctrlKey || ev.metaKey) return;', 'e2e', 'tastele cu Alt sunt luate de model')
o('A27', AT, MO, 'if (ev.ctrlKey || ev.altKey) return;', 'e2e', 'tastele cu Meta sunt luate de model')
SH = 'if (k) { ev.preventDefault(); mutaM(k, pasFin || ev.shiftKey); return; }'
o('A28', AT, SH, SH.replace('pasFin || ev.shiftKey', 'pasFin'), 'e2e', 'Shift nu mai dă jumătatea de pas')
o('A29', AT, SH, SH.replace('pasFin || ev.shiftKey', 'ev.shiftKey'), 'e2e', 'săgețile nu țin seama de comutator')

# --- atelierul: rândul piesei libere
DR = 'if (drept) unde += tr` · între știfturi: x ${fmt(drept.x, 2)}, y ${fmt(drept.y, 2)}, z ${fmt(drept.z, 2)}` + (drept.rot ? tr` · rotită ${drept.rot * 90}°` : "");'
o('A30', AT, DR, DR.replace('x ${fmt(drept.x, 2)}, y ${fmt(drept.y, 2)}', 'x ${fmt(drept.y, 2)}, y ${fmt(drept.x, 2)}'), 'e2e', 'locul dintre știfturi, cu x și y schimbate între ele')
o('A31', AT, DR, DR.replace(' + (drept.rot ? tr` · rotită ${drept.rot * 90}°` : "")', ''), 'e2e', 'rotirea unei piese dintre știfturi nu se mai spune')
o('A32', AT, DR, DR.replace('z ${fmt(drept.z, 2)}', 'z ${fmt(drept.z * 3.2, 2)}'), 'e2e', 'z-ul locului dintre știfturi, în mm, nu în plăci')
JS = '      else if (sus === "jos") unde += tr(" · cu fața în jos");\n'
o('A33', AT, JS, '', 'e2e', 'o piesă cu fața în jos nu o mai spune')
SP = 'const SPRE: Record<string, string> = { "x+": "X →", "x-": "← X", "y+": "Y ↑", "y-": "↓ Y" };'
o('A34', AT, SP, SP.replace('"y+": "Y ↑", "y-": "↓ Y"', '"y+": "↓ Y", "y-": "Y ↑"'), 'e2e', 'partea de sus, spusă invers pe y')
o('A35', AT, SP, SP.replace('"x+": "X →", "x-": "← X"', '"x+": "← X", "x-": "X →"'), 'e2e', 'partea de sus, spusă invers pe x')
LD = 'const drept = Lego.loculDrept(c, A.get(m.id)!.T), sus = Lego.susTransf(A.get(m.id)!.T);'
o('A36', AT, LD, LD.replace('Lego.loculDrept(c, A.get(m.id)!.T)', 'null'), 'e2e', 'o piesă dintre știfturi nu-și mai spune locul')

# --- aspectul comutatorului
o('A37', HD, '.mutari .btn[aria-pressed="true"] { background: var(--text); color: var(--panou); border-color: var(--text); }\n', '', 'e2e', 'comutatorul ales arată ca unul neales')
o('A38', HD, '.mutari .btn[data-m="fin"] { grid-column: span 2; }', '.mutari .btn[data-m="fin"] { grid-column: span 1; }', 'e2e', 'comutatorul ține o singură coloană')

# --- textele
o('T01', AT, 'aria-pressed="${pasFin}">Jumătăți de pas</button>', 'aria-pressed="${pasFin}">Jumătăți de pași</button>', 'texte', 'numele comutatorului, schimbat fără traducerea lui')
o('T02', EN, ' "Jumătăți de pas": "Half steps",', ' "Jumătăți de pas": "",', 'texte', '„Jumătăți de pas”, fără traducere')
o('T03', EN, ' " · între știfturi: x {0}, y {1}, z {2}": " · between studs: x {0}, y {1}, z {2}",', ' " · între știfturi: x {0}, y {1}, z {2}": " · between studs: x {0}, y {1}",', 'texte', 'traducerea pierde o valoare')
o('T04', AT, 'unde += tr(" · cu fața în jos");', 'unde += tr(" · cu fața la pământ");', 'texte', 'rândul piesei cu fața în jos, cu alt text decât cel tradus')

SETURI = {
    'intoarcere': ['test/unit/trenulet.intoarcere.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.intoarcere.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
