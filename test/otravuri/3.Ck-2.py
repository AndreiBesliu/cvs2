# Lista de otrăvuri a feliei 3.Ck-2 (balamaua atelierului Easy 3Draw; ADR 0284, partea B), 26.11.2026, alese de autor:
# motorul (`balamaCote`: jumătatea, lățimea, lungimea, jocul și mesajele lor, axa, clemele; `balama`: placa, obrajii,
# bolțul, clemele cu gâtul, prinderile; `balamaMontaj`; așezarea în model) și atelierul (galeria, numele, editorul, piesa
# din editor, „Fă balamaua”, textul bolțului).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul: marginile și mesajele
o('M01', LG, 'piesa = d.piesa === "clema" ? "clema" : "bolt", e = ef(), s = P.pas;', 'piesa = d.piesa ? "clema" : "bolt", e = ef(), s = P.pas;', 'balama', 'orice jumătate cerută e cea cu clema')
o('M02', LG, 'latime = Number.isFinite(w) && w >= 1.5 ? 2 : 1;', 'latime = Number.isFinite(w) && w > 1.5 ? 2 : 1;', 'balama', 'lățimea 1,5 iese de 1')
o('M03', LG, 'if (Number.isFinite(w) && w !== 1 && w !== 2) avert.push', 'if (Number.isFinite(w) && w !== 1) avert.push', 'balama', 'lățimea 2 primește mesaj')
o('M04', LG, 'lungime = Number.isFinite(n) ? Math.min(4, Math.max(1, Math.round(n))) : 2;', 'lungime = Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 2;', 'balama', 'lungimea urcă până la 5')
o('M05', LG, 'lungime = Number.isFinite(n) ? Math.min(4, Math.max(1, Math.round(n))) : 2;', 'lungime = Number.isFinite(n) ? Math.min(4, Math.max(1, Math.round(n))) : 3;', 'balama', 'lungimea de pornire, 3')
o('M06', LG, 'if (Number.isFinite(n) && n !== lungime) avert.push', 'if (Number.isFinite(n) && n > 4) avert.push', 'balama', 'o lungime rotunjită (2,4) nu primește mesaj')
o('M07', LG, 'Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "clema"', 'Math.round(j * 10) / 10)) || 0 : 0;\n    if (piesa === "clema"', 'balama', 'jocul, din zecime în zecime')
o('M08', LG, 'Math.min(0.2, Math.max(-0.1, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "clema"', 'Math.min(0.3, Math.max(-0.1, Math.round(j * 20) / 20)) || 0 : 0;\n    if (piesa === "clema"', 'balama', 'jocul urcă până la 0,3')
o('M09', LG, 'if (piesa === "clema" && Number.isFinite(j) && (j < -0.1 - 1e-9', 'if (Number.isFinite(j) && (j < -0.1 - 1e-9', 'balama', 'bolțul primește mesajul jocului')
# --- motorul: cotele
o('M10', LG, 'ri = e.clemaD / 2 + joc, xa = s * lungime + BALAMA.capat;', 'ri = e.clemaD / 2 - joc, xa = s * lungime + BALAMA.capat;', 'balama', 'jocul strânge clema')
o('M11', LG, 'const ro = e.clemaD / 2 + P.clema_perete, ri', 'const ro = e.clemaD / 2 + joc + P.clema_perete, ri', 'balama', 'jocul îngroașă inelul (axa urcă)')
o('M12', LG, 'ri = e.clemaD / 2 + joc, xa = s * lungime + BALAMA.capat;', 'ri = P.clema_d / 2 + joc, xa = s * lungime + BALAMA.capat;', 'balama', 'clema nu urmează calibrarea barei')
o('M13', LG, 'const BALAMA = { capat: 4, obraz: 1,', 'const BALAMA = { capat: 3.5, obraz: 1,', 'balama', 'axa la 3,5 după placă (grila pierdută)')
o('M14', LG, 'return { piesa, latime, lungime, joc, ro, ri, rb: P.bara_d / 2, xa, zb: ro, falci, avert };', 'return { piesa, latime, lungime, joc, ro, ri, rb: P.bara_d / 2, xa, zb: ro + 0.2, falci, avert };', 'balama', 'axa ridicată (inelul nu atinge masa)')
o('M15', LG, 'peste: 0.6, falca: 1.9, liber: 2.3, gat: 0.3 };', 'peste: 0.6, falca: 2.2, liber: 2.3, gat: 0.3 };', 'balama', 'clema lată de 4,4 (0,1 mm de obraji)')
o('M16', LG, 'peste: 0.6, falca: 1.9, liber: 2.3, gat: 0.3 };', 'peste: 0.6, falca: 1.9, liber: 1.9, gat: 0.3 };', 'balama', 'locul liber cât clema (se freacă de obraji)')
# --- motorul: plasa
o('M17', LG, 'for (const [a, b] of zone) tri.push(...cutie(capat - 0.5, a, 0, q.xa + q.rb + B.obraz, b, q.zb + q.rb + B.peste));', 'for (const [a, b] of zone) tri.push(...cutie(capat - 0.5, a, 0, q.xa + q.rb, b, q.zb + q.rb + B.peste));', 'balama', 'obrajii se opresc la bolț')
o('M18', LG, 'for (const [a, b] of zone) tri.push(...cutie(capat - 0.5, a, 0, q.xa + q.rb + B.obraz, b, q.zb + q.rb + B.peste));', 'for (const [a, b] of zone) tri.push(...cutie(capat - 0.5, a, 0, q.xa + q.rb + B.obraz, b, q.zb + q.rb));', 'balama', 'obrajii se opresc la vârful bolțului')
o('M19', LG, '      for (const [a, b] of liber) { zone.push([y, a]); y = b; }\n', '', 'balama', 'un singur obraz, pe toată lățimea (bolțul înecat)')
o('M20', LG, 'tri.push(...peY(cerc(q.xa, q.zb, q.rb, N_CERC), j0 + 0.3, lat - 0.3));', 'tri.push(...peY(cerc(q.xa, q.zb, q.rb, 8), j0 + 0.3, lat - 0.3));', 'balama', 'bolțul colțuros')
o('M21', LG, 'tri.push(...peY(cerc(q.xa, q.zb, q.rb, N_CERC), j0 + 0.3, lat - 0.3));', 'tri.push(...peY(cerc(q.xa, q.zb, q.rb - 0.2, N_CERC), j0 + 0.3, lat - 0.3));', 'balama', 'bolțul subțire')
o('M22', LG, 'const inel = sectiuneC(q.ri, q.ro, P.clema_gura, Math.PI / 2, q.xa, q.zb)', 'const inel = sectiuneC(q.ri, q.ro, P.clema_gura, 0, q.xa, q.zb)', 'balama', 'gura clemei spre capăt, nu în sus')
o('M23', LG, 'const inel = sectiuneC(q.ri, q.ro, P.clema_gura, Math.PI / 2, q.xa, q.zb)', 'const inel = sectiuneC(q.ri, q.ro, 1.5, Math.PI / 2, q.xa, q.zb)', 'balama', 'gura mai îngustă decât cea din calibrare')
o('M24', LG, 'gat = dreptunghi(capat - 0.5, 0, q.xa - q.ri - B.gat, H);', 'gat = dreptunghi(capat - 0.5, 0, q.xa - q.ri + B.gat, H);', 'balama', 'gâtul intră în golul clemei')
o('M25', LG, '      tri.push(...peY(inel, y0, y1), ...peY(gat, y0, y1));', '      tri.push(...peY(inel, y0, y1));', 'balama', 'clema fără gât (desprinsă de placă)')
o('M26', LG, 'const placa = caramida({ celule: randCelule(n, w), placi: 1 }), tri', 'const placa = caramida({ celule: randCelule(w, n), placi: 1 }), tri', 'balama', 'placa întoarsă (lățimea pe x)')
# --- motorul: prinderile, montajul, așezarea
o('M27', LG, '{ fel: "bara", p: [q.xa, a, q.zb], d: PE_Y, lung: b - a }, { fel: "bara", p: [q.xa, b, q.zb], d: [0, -1, 0], lung: b - a }', '{ fel: "bara", p: [q.xa, a, q.zb], d: PE_Y, lung: b - a }', 'balama', 'bolțul declarat doar dintr-o parte')
o('M28', LG, '{ fel: "bara", p: [q.xa, a, q.zb], d: PE_Y, lung: b - a }, { fel: "bara"', '{ fel: "bara", p: [q.xa, a, q.zb + 0.5], d: PE_Y, lung: b - a }, { fel: "bara"', 'balama', 'bolțul declarat mai sus decât e')
o('M29', LG, '      prinderi.push(...prinGaura("clema", [q.xa, y0, q.zb], [q.xa, y1, q.zb]));\n', '', 'balama', 'clemele nedeclarate')
o('M30', LG, 'return { tri, avert: q.avert, prinderi };\n    }\n    const inel', 'return { tri, avert: q.avert, prinderi: placa.prinderi };\n    }\n    const inel', 'balama', 'bolțul nedeclarat')
o('M31', LG, 'const M = montaj(bara, gura, 180 - (Number.isFinite(+pliere) ? +pliere : 0)), dy', 'const M = montaj(bara, gura, 180 + (Number.isFinite(+pliere) ? +pliere : 0)), dy', 'balama', 'plierea în sens invers')
o('M32', LG, 'dy = BALAMA.liber - BALAMA.falca;', 'dy = 0;', 'balama', 'clema la capătul locului liber, nu la mijloc')
o('M33', LG, 'const placa = bal ? [bal.lungime, bal.latime] : ({', 'const placa = bal ? [bal.latime, bal.lungime] : ({', 'balama', 'în model, placa întoarsă')
o('M34', LG, 'cadru, turnanta, balama, grinda,', 'cadru, turnanta, grinda,', 'balama', 'motorul nu știe piesa')
o('M35', LG, 'clemaD: 2 * q.ri, jocRadial: q.ri - q.rb, axa:', 'clemaD: 2 * q.ri, jocRadial: 2 * q.ri - 2 * q.rb, axa:', 'balama', 'jocul de jur împrejur, pe diametru')

# --- atelierul
o('A01', AT, ' ["balama", "Balama"],', '', 'e2e', 'piesa lipsește din galerie')
o('A02', AT, '    balama: { piesa: "bolt", latime: 1, lungime: 2, joc: 0 },', '    balama: { piesa: "clema", latime: 1, lungime: 2, joc: 0 },', 'e2e', 'jumătatea de pornire, cu clema')
o('A03', AT, '    balama: { piesa: "bolt", latime: 1, lungime: 2, joc: 0 },', '    balama: { piesa: "bolt", latime: 2, lungime: 2, joc: 0 },', 'e2e', 'lățimea de pornire, 2')
o('A04', AT, '(q.piesa === "clema" ? tr("cu clema") : tr("cu bolțul"))', '(q.piesa === "clema" ? tr("cu bolțul") : tr("cu clema"))', 'e2e', 'numele jumătăților, întoarse')
o('A05', AT, 'tr`Balama ${q.latime}×${q.lungime}, `', 'tr`Balama ${q.lungime}×${q.latime}, `', 'e2e', 'numele cu lungimea întâi')
o('A06', AT, '+ (q.piesa === "clema" && q.joc ? tr`, jocul ${fmt(q.joc, 2)}` : "");\n    }\n    if (d.tip === "rotund")', '+ (q.joc ? tr`, jocul ${fmt(q.joc, 2)}` : "");\n    }\n    if (d.tip === "rotund")', 'e2e', 'bolțul își spune jocul')
o('A07', AT, 'if (q.piesa === "clema" && q.joc) p.joc = q.joc; else delete p.joc; }', 'if (q.joc) p.joc = q.joc; else delete p.joc; }', 'e2e', 'bolțul își ține jocul (alt rând în listă)')
o('A08', AT, '    pune(defCurenta("balama", { ...stare.balama, piesa: "clema" }), n);\n', '', 'e2e', '„Fă balamaua” pune doar bolțul')
o('A09', AT, '    pune(defCurenta("balama", { ...stare.balama, piesa: "clema" }), n);', '    pune(defCurenta("balama", { ...stare.balama, piesa: "bolt" }), n);', 'e2e', '„Fă balamaua” pune două bolțuri')
o('A10', AT, '        ${cuClema ? `<div class="at-campuri"><label for="at-bm-joc">', '        ${true ? `<div class="at-campuri"><label for="at-bm-joc">', 'e2e', 'câmpul jocului și la bolț')
o('A11', AT, 'if (cuClema) $("#at-bm-joc").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 20) / 20 || 0;', 'if (cuClema) $("#at-bm-joc").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 10) / 10 || 0;', 'e2e', 'jocul din editor, din zecime în zecime')
o('A12', AT, 'if (v >= -0.1 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };\n      $("#at-bm-fa")', 'if (v >= -0.2 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };\n      $("#at-bm-fa")', 'e2e', 'un joc sub margine e primit')
o('A13', AT, 'if (v >= -0.1 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };\n      $("#at-bm-fa")', 'if (v >= -0.1 && v <= 0.3) { p.joc = v; schimbat(); } editor(); };\n      $("#at-bm-fa")', 'e2e', 'un joc peste margine e primit')
o('A14', AT, '      alege("#at-bm-latime", v => { p.latime = +v; });', '      alege("#at-bm-latime", v => { p.latime = 1; });', 'e2e', 'lățimea nu se schimbă')
o('A15', AT, '      alege("#at-bm-lungime", v => { p.lungime = +v; });', '      alege("#at-bm-lungime", v => { p.lungime = 2; });', 'e2e', 'lungimea nu se schimbă')
o('A16', AT, '      alege("#at-bm-piesa", v => { p.piesa = v; });', '      alege("#at-bm-piesa", v => { p.piesa = "bolt"; });', 'e2e', 'jumătatea nu se schimbă')
o('A17', AT, '    return (q.joc ? tr`Bolțul are Ø', '    return (false ? tr`Bolțul are Ø', 'e2e', 'cu un joc ales, textul spune tot „clema din calibrare”')
o('A18', AT, '    balama: `<path d="M2 18h8v-3.5H2zM14 18h8v-3.5h-8z"/>', '    balama_: `<path d="M2 18h8v-3.5H2zM14 18h8v-3.5h-8z"/>', 'pictograme', 'fără pictogramă')
o('A19', AT, 'toast(tr`${n} × balamaua (jumătatea cu bolțul și cea cu clema) în listă.`);', 'toast(tr`${n} × balamaua în listă.`);', 'e2e', 'mesajul nu spune jumătățile')
o('A20', AT, '      $("#at-bm-fa").onclick = adaugaBalama;', '', 'e2e', '„Fă balamaua” nu face nimic')

SETURI = {
    'balama': ['test/unit/trenulet.balama.test.ts', 'test/unit/trenulet.prinderi.test.ts', 'test/unit/trenulet.model.test.ts'],
    # fiecare piesă din FAMILII are desenul ei: proba unitară a pictogramelor (galeria arată altfel desenul generic)
    'pictograme': ['test/unit/trenulet.pictograme.test.ts'],
}
E2E = ['test/e2e/trenulet.balama.spec.ts', 'test/e2e/trenulet.pictograme.spec.ts', 'test/e2e/trenulet.file.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
