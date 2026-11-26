# Lista de otrăvuri a feliei 3.Cl-2 (globul de Crăciun din atelierul Easy 3Draw; ADR 0285), 25.11.2026, alese de autor:
# motorul (cotele globului, căpăcelul, marginea, dungile, zigzagul, stelele, decupat sau în relief, discurile îmbinate,
# arcele fine) și atelierul (piesa din filă, numele, modelul și numărul lui, relieful, discurile, ce se arată).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: cotele
GC = 'const GLOB_CATE: Readonly<Record<string, readonly [number, number, number]>> = { dungi: [1, 5, 3], zigzag: [1, 3, 2], stele: [3, 8, 5] };'
o('M01', LG, GC, GC.replace('dungi: [1, 5, 3]', 'dungi: [1, 6, 3]'), 'glob', 'un glob primește și 6 dungi')
o('M02', LG, GC, GC.replace('zigzag: [1, 3, 2]', 'zigzag: [1, 3, 3]'), 'glob', 'zigzagul obișnuit are 3 benzi')
o('M03', LG, GC, GC.replace('stele: [3, 8, 5]', 'stele: [2, 8, 5]'), 'glob', 'un glob primește și 2 stele în jur')
o('M04', LG, 'const model = fel === "discuri" ? "fara" : d.model === "zigzag"', 'const model = d.model === "zigzag"', 'glob', 'discurile îmbinate își țin modelul')
o('M05', LG, 'inRelief = desen === "relief" && model !== "fara";', 'inRelief = desen === "relief";', 'glob', 'globul fără model e socotit în relief')
o('M06', LG, 'campMarginit(inRelief ? avert : mute, d.relief, 0.4, 3, 0.8,', 'campMarginit(avert, d.relief, 0.4, 3, 0.8,', 'glob', 'relieful din afara marginilor se spune și la globul decupat')
GM = 'const R = diam / 2, capL = Math.max(8, 0.26 * diam), capH = Math.max(4, 0.09 * diam), margine = Math.max(2.4, 0.08 * diam);'
o('M07', LG, GM, GM.replace('0.26 * diam', '0.3 * diam'), 'glob', 'căpăcelul, mai lat')
o('M08', LG, GM, GM.replace('0.09 * diam', '0.12 * diam'), 'glob', 'căpăcelul, mai înalt')
o('M09', LG, GM, GM.replace('0.08 * diam', '0.1 * diam'), 'glob', 'marginea din jurul modelului, mai lată')
o('M10', LG, GM, GM.replace('Math.max(4, ', 'Math.max(3, '), 'glob', 'căpăcelul unui glob mic, de 3 mm')
o('M11', LG, GM, GM.replace('Math.max(8, ', 'Math.max(6, '), 'glob', 'căpăcelul unui glob mic, lat de 7,8')
o('M12', LG, 'inRelief, fanta: grosime + 2 * (ef().joc + 0.1), avert };', 'inRelief, fanta: grosime + 2 * (ef().joc + 0.2), avert };', 'glob', 'fanta discurilor, mai largă cu 0,2')

# --- motorul: modelul
o('M13', LG, 'const s = 2 * Ri / (2 * n + 1);\n      for (let i = 0; i < n; i++) {', 'const s = 2 * Ri / (2 * n);\n      for (let i = 0; i < n; i++) {', 'glob', 'dungile, mai înalte decât golurile dintre ele')
DU = 'const y0 = -Ri + (2 * i + 1) * s, y1 = y0 + s, x0 = Math.sqrt(Ri * Ri - y0 * y0), x1 = Math.sqrt(Ri * Ri - y1 * y1), b = Math.tan((Math.atan2(y1, x1) - Math.atan2(y0, x0)) / 4);'
o('M14', LG, DU, DU.replace('-Ri + (2 * i + 1) * s', '-Ri + 2 * i * s'), 'glob', 'dungile pornesc de la marginea cercului dinăuntru')
o('M15', LG, DU, DU.replace(') / 4);', ') / 8);'), 'glob', 'capetele dungilor, mai puțin bombate decât cercul')
o('M16', LG, 'out.push([[-x0, y0, 0], [x0, y0, b], [x1, y1, 0], [-x1, y1, b]]);', 'out.push([[-x0, y0, 0], [x0, y0, 0], [x1, y1, 0], [-x1, y1, 0]]);', 'glob', 'capetele dungilor, drepte')
ZG = 'const zona = 0.72 * Ri, pas = 2 * zona / n, A = 0.22 * pas, s = 0.28 * pas, p = Ri / 2, CV = glob.Cavalier;'
o('M17', LG, ZG, ZG.replace('0.72 * Ri', '0.8 * Ri'), 'glob', 'zigzagul, pe 80 % din rază')
o('M18', LG, ZG, ZG.replace('A = 0.22 * pas', 'A = 0.3 * pas'), 'glob', 'dinții zigzagului, mai înalți')
o('M19', LG, ZG, ZG.replace('s = 0.28 * pas', 's = 0.2 * pas'), 'glob', 'banda zigzagului, mai subțire')
o('M20', LG, ZG, ZG.replace('p = Ri / 2', 'p = Ri / 3'), 'glob', 'dinții zigzagului, mai deși')
o('M21', LG, 'const x = j * p / 2, y = yc + A * (j % 2 ? 1 : -1);', 'const x = j * p / 2, y = yc + A * (j % 2 ? -1 : 1);', 'glob', 'zigzagul, cu dinții pe dos')
o('M22', LG, 'const yc = -zona + (k + 0.5) * pas, sus: Vf[] = [], jos: Vf[] = [];', 'const yc = -zona + k * pas, sus: Vf[] = [], jos: Vf[] = [];', 'glob', 'benzile zigzagului, coborâte cu jumătate de pas')
o('M23', LG, '.boolean(CV.plineClosed([[Ri, 0, 1], [-Ri, 0, 1]]), "and").posPlines));', '.boolean(CV.plineClosed([[Ri + 3, 0, 1], [-Ri - 3, 0, 1]]), "and").posPlines));', 'glob', 'zigzagul trece de cercul dinăuntru')
ST = 'const rr = k % 2 ? 0.42 * r : r, a = u + Math.PI * k / 5;'
o('M24', LG, ST, ST.replace('0.42 * r', '0.5 * r'), 'glob', 'stelele globului, mai pline')
o('M25', LG, 'const rk = 0.2 * Ri;', 'const rk = 0.24 * Ri;', 'glob', 'stelele din jur, mai mari')
o('M26', LG, 'out.push(stea5(0, 0, 0.34 * Ri, Math.PI / 2));', 'out.push(stea5(0, 0, 0.4 * Ri, Math.PI / 2));', 'glob', 'steaua din mijloc, mai mare')
SJ = 'const u = Math.PI / 2 + 2 * Math.PI * j / n; out.push(stea5(0.66 * Ri * Math.cos(u), 0.66 * Ri * Math.sin(u), rk, u)); }'
o('M27', LG, SJ, SJ.replace('rk, u)); }', 'rk, Math.PI / 2)); }'), 'glob', 'stelele din jur, toate cu colțul în sus')
o('M28', LG, SJ, SJ.replace('0.66 * Ri * Math.cos(u), 0.66 * Ri * Math.sin(u)', '0.6 * Ri * Math.cos(u), 0.6 * Ri * Math.sin(u)'), 'glob', 'stelele din jur, mai aproape de mijloc')

# --- motorul: piesa
CP = 'dreptForma(-capL / 2, Math.sqrt(R * R - capL * capL / 4) - 0.6, capL / 2, R + capH)]'
o('M29', LG, CP, CP.replace('R + capH)]', 'R + capH + 1)]'), 'glob', 'căpăcelul, cu 1 mm mai înalt decât spun cotele')
o('M30', LG, 'if (q.agatatoare === "inel") { const c = inelAgatat(R + capH); forme.push(c.disc); gauri.push(c.gol); }\n    const baza = unesteForme(forme);', 'if (q.agatatoare === "inel") { const c = inelAgatat(R); forme.push(c.disc); gauri.push(c.gol); }\n    const baza = unesteForme(forme);', 'glob', 'inelul stă pe disc, sub căpăcel')
FA = 'A = baza.flatMap(u => scadeForma(u.ext, dreptForma(-s, -R - 1, s, 0.2))), B = scadeForma(disc, dreptForma(-s, -0.2, s, R + 1));'
o('M31', LG, FA, FA.replace('dreptForma(-s, -R - 1, s, 0.2)', 'dreptForma(-s, -R - 1, s, 0)'), 'glob', 'fanta de jos se oprește chiar la mijloc')
o('M32', LG, FA, FA.replace('dreptForma(-s, -0.2, s, R + 1)', 'dreptForma(-s, 0, s, R + 1)'), 'glob', 'fanta de sus se oprește chiar la mijloc')
o('M33', LG, FA, FA.replace('B = scadeForma(disc, ', 'B = scadeForma(baza[0]!.ext, '), 'glob', 'și al doilea disc are căpăcel și inel')
o('M34', LG, 'const alaturi = q.diam + CRACIUN.intrePlaci;', 'const alaturi = q.diam + 1;', 'glob', 'discurile, la 1 mm unul de altul')
o('M35', LG, 'if (!q.inRelief) return { tri: prismaUnite(baza, [...gauri, ...model], 0, h), avert: q.avert, prinderi: [] };', 'if (!q.inRelief) return { tri: prismaUnite(baza, gauri, 0, h), avert: q.avert, prinderi: [] };', 'glob', 'modelul decupat nu se mai decupează')
RL = '...model.flatMap(m => prismaGauri(m, [], h - 0.01, h + q.relief))]'
o('M36', LG, RL, RL.replace('h + q.relief', 'h + q.relief / 2'), 'glob', 'relieful, pe jumătate din înălțimea cerută')
o('M37', LG, RL, RL.replace('h - 0.01', 'h + 0.2'), 'glob', 'relieful plutește la 0,2 mm peste disc')
o('M38', LG, 'return { tri: [...prismaUnite(baza, gauri, 0, h), ...model.flatMap(', 'return { tri: [...prismaUnite(baza, [...gauri, ...model], 0, h), ...model.flatMap(', 'glob', 'în relief, discul rămâne decupat sub model')
o('M39', LG, 'schimb: q.inRelief ? q.grosime : 0 }; },', 'schimb: q.inRelief ? q.grosime + q.relief : 0 }; },', 'glob', 'filamentul s-ar schimba la vârful reliefului')
o('M40', LG, 'return unite.flatMap(u => { const ext = curataPoli(trig(aplatizeaza(u.ext, laturiFine)));', 'return unite.flatMap(u => { const ext = curataPoli(trig(aplatizeaza(u.ext)));', 'glob', 'discul iese din 48 de laturi')
o('M41', LG, 'n = Math.max(1, Math.ceil(Math.abs(th) / (2 * Math.PI / (laturi ? laturi(r) : N_CERC))));', 'n = Math.max(1, Math.ceil(Math.abs(th) / (2 * Math.PI / N_CERC)));', 'glob', 'arcele nu țin seama de cât de fine li se cer laturile')

# --- atelierul
o('A01', AT, '["brad", "Brăduț"], ["glob", "Glob"], ["ornament"', '["glob", "Glob"], ["brad", "Brăduț"], ["ornament"', 'e2e', 'globul, înaintea brăduțului în galerie')
o('A02', AT, 'glob: { diam: 60, grosime: 3, fel: "plat", model: "dungi", desen: "decupat", relief: 0.8, cate: 3, agatatoare: "inel" },', 'glob: { diam: 60, grosime: 3, fel: "plat", model: "dungi", desen: "decupat", relief: 0.8, cate: 4, agatatoare: "inel" },', 'e2e', 'globul implicit, cu patru dungi')
NM = 'const model = q.fel === "discuri" ? tr(", din două discuri") : q.model === "fara" ? tr(", fără model")'
o('A03', AT, NM, NM.replace('tr(", fără model")', '""'), 'e2e', 'numele nu spune că globul n-are model')
o('A04', AT, NM, NM.replace('tr(", din două discuri")', '""'), 'e2e', 'numele nu spune că globul e din două discuri')
N2 = ': (q.model === "zigzag" ? tr`, zigzag × ${q.cate}` : q.model === "stele" ? tr`, stele × ${q.cate}` : tr`, dungi × ${q.cate}`) + (q.schimb ? tr`, în relief de ${fmt(q.relief)}` : "");'
o('A05', AT, N2, N2.replace('q.model === "stele" ? tr`, stele × ${q.cate}`', 'q.model === "stele" ? tr`, dungi × ${q.cate}`'), 'e2e', 'numele scrie „dungi” la stele')
o('A06', AT, N2, N2.replace('(q.schimb ? tr`, în relief de ${fmt(q.relief)}` : "")', '""'), 'e2e', 'numele nu spune relieful')
o('A07', AT, 'return tr`Glob Ø${fmt(q.diam)}` + model + (q.grosime === 3 ? "" :', 'return tr`Glob Ø${fmt(q.diam)}` + model + (q.grosime === 2 ? "" :', 'e2e', 'numele tace la grosimea de 2, nu la cea de 3')
o('A08', AT, 'if (q.model !== "fara") { p.cate = q.cate; p.desen = q.desen; } else { delete p.cate; delete p.desen; }', 'if (q.model !== "fara") { p.cate = q.cate; p.desen = q.desen; } else { delete p.desen; }', 'e2e', 'două globuri fără model, cu alt număr de dungi ținut minte, sunt piese diferite')
AL = 'if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };\n      camp("#at-gl-diam", 30, 120, v => { p.diam = v; });'
o('A09', AT, AL, AL.replace('f(b.dataset.v!); editor();', 'f(b.dataset.v!); p.cate = Lego.globCote(p).cate; editor();'), 'e2e', 'numărul ținut minte se pierde la schimbarea modelului')
o('A10', AT, 'const cate = q.model === "zigzag" ? tr("Zigzaguri") : q.model === "stele" ? tr("Stele în jur") : tr("Dungi");', 'const cate = q.model === "zigzag" ? tr("Zigzaguri") : tr("Dungi");', 'e2e', 'câmpul stelelor se numește „Dungi”')
o('A11', AT, '${plat && cuModel ? `<div class="at-rand"><span class="mic">Desenul:</span>', '${plat ? `<div class="at-rand"><span class="mic">Desenul:</span>', 'e2e', '„Desenul” apare și la globul fără model')
o('A12', AT, '${q.schimb ? `<label for="at-gl-relief">', '${cuModel ? `<label for="at-gl-relief">', 'e2e', 'relieful apare și la globul decupat')
o('A13', AT, '${plat ? `<div class="at-rand"><span class="mic">Modelul:</span>', '${true ? `<div class="at-rand"><span class="mic">Modelul:</span>', 'e2e', 'modelul e oferit și discurilor îmbinate')
o('A14', AT, '(după stratul ${Math.round(q.schimb / 0.2)}, la straturi de 0,2 mm): de acolo în sus se tipărește doar modelul.', '(după stratul ${Math.round(q.schimb / 0.3)}, la straturi de 0,2 mm): de acolo în sus se tipărește doar modelul.', 'e2e', 'stratul schimbului, socotit la 0,3 mm')
o('A15', AT, ': cuModel ? tr`Căpăcelul are ${fmt(q.capac)} mm, iar marginea din jurul modelului, ${fmt(q.margine)} mm.` : tr`Căpăcelul are ${fmt(q.capac)} mm.`;', ': tr`Căpăcelul are ${fmt(q.capac)} mm, iar marginea din jurul modelului, ${fmt(q.margine)} mm.`;', 'e2e', 'rândul globului fără model vorbește de marginea modelului')
o('A16', AT, 'Fantele au ${fmt(q.fanta, 2)} mm: grosimea discului', 'Fantele au ${fmt(q.grosime, 2)} mm: grosimea discului', 'e2e', 'rândul discurilor scrie grosimea în loc de fantă')
o('A17', AT, 'camp("#at-gl-diam", 30, 120, v => { p.diam = v; });', 'camp("#at-gl-diam", 10, 300, v => { p.diam = v; });', 'e2e', 'diametrul globului primește și 20 și 200')
o('A18', AT, 'if (cuModel) camp("#at-gl-cate", CATE_GLOB[q.model]![0], CATE_GLOB[q.model]![1], v => { p.cate = Math.round(v); });', 'if (cuModel) camp("#at-gl-cate", 0, 99, v => { p.cate = Math.round(v); });', 'e2e', 'numărul primește și ce trece de marginile modelului')
o('A19', AT, 'camp("#at-gl-relief", 0.4, 3, v => { p.relief = v; });', 'camp("#at-gl-relief", 0, 9, v => { p.relief = v; });', 'e2e', 'relieful primește și 5 și 0,1')
o('A20', AT, 'const CATE_GLOB: Readonly<Record<string, readonly [number, number]>> = { dungi: [1, 5], zigzag: [1, 3], stele: [3, 8] };', 'const CATE_GLOB: Readonly<Record<string, readonly [number, number]>> = { dungi: [1, 5], zigzag: [1, 3], stele: [1, 8] };', 'e2e', 'câmpul stelelor pornește de la 1')
o('A21', AT, 'alege("#at-gl-ag", v => { p.agatatoare = v; });', 'alege("#at-gl-ag", v => { p.fel = v; });', 'e2e', 'agățătoarea globului nu se schimbă')
o('A22', AT, 'if (q.schimb) p.relief = q.relief; else delete p.relief;', 'p.relief = q.relief;', 'e2e', 'relieful ținut minte intră și în globul decupat')

# --- textele
o('T01', EN, ' "Glob Ø{0}": "Bauble Ø{0}",', ' "Glob Ø{0}": "Bauble",', 'texte', 'traducerea numelui globului pierde diametrul')
o('T02', AT, '(q.schimb ? tr`, în relief de ${fmt(q.relief)}` : "")', '(q.schimb ? tr`, in relief de ${fmt(q.relief)}` : "")', 'texte', 'relieful din nume, cu alt text decât cel tradus')
o('T03', LG, 'tr`Un glob are între 1 și 5 dungi: am făcut ${x}.`', 'tr`Un glob are intre 1 și 5 dungi: am făcut ${x}.`', 'texte', 'mesajul motorului, cu alt text decât cel tradus')

SETURI = {
    'glob': ['test/unit/trenulet.glob.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.glob.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
