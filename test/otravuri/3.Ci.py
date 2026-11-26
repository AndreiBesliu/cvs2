# Lista de otrăvuri a feliei 3.Ci (construcțiile gata ale atelierului Easy 3Draw: șasiul cu patru roți, cutia de
# angrenaje, brațul de macara, barca cu elice; ADR 0284, partea E), 26.11.2026, alese de autor: motorul
# (`constructieGata`: marginile și avertismentele, piesele și prinderile fiecărui șablon, dinții îmbucați, ridicarea pe
# masă, cotele) și atelierul (panoul „Construcții gata”, ce iese pe hârtie, construcția nouă, piesele completate ca în
# editor).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul: felurile, marginile, avertismentele
o('M01', LG, 'const SABLOANE = ["sasiu", "angrenaje", "macara", "barca"] as const;', 'const SABLOANE = ["sasiu", "macara", "angrenaje", "barca"] as const;', 'sabloane', 'felurile, în altă ordine')
o('M02', LG, '    if (!(SABLOANE as readonly string[]).includes(fel)) throw new Error(tr`Nu știu construcția „${fel}”.`);\n', '', 'sabloane', 'un fel necunoscut nu mai e refuzat (iese o barcă)')
o('M03', LG, '    if (Number.isFinite(c) && x !== c) avert.push(ce(x));', '    if (x !== c) avert.push(ce(x));', 'sabloane', 'valorile lipsă (implicitele) dau avertismente')
o('M04', LG, '    if (Number.isFinite(c) && x !== c) avert.push(ce(x));', '    if (Number.isFinite(c) && x !== r) avert.push(ce(x));', 'sabloane', 'un număr cu zecimale, rotunjit, nu mai e spus')
RS = 'ROTI_SASIU.reduce((a, b) => (Math.abs(b - ceruta) < Math.abs(a - ceruta) ? b : a))'
o('M05', LG, RS, 'ROTI_SASIU[2]', 'sabloane', 'roata cerută e mereu cea mare')
o('M06', LG, '      const minim = Math.ceil((roata + 1) / s - 1e-9) + 2;', '      const minim = Math.ceil((roata + 1) / s - 1e-9) + 1;', 'sabloane', 'șasiul prea scurt pentru roți (roțile se ating)')
# M07: la prima rulare (`d.raport !== undefined` scos) a scăpat, fiindcă era cod mort: un raport lipsă dădea deja 1 : 3;
# codul s-a simplificat (și un raport scris ca număr primește avertismentul), iar otrava s-a mutat pe el
o('M07', LG, '      if (!RAPOARTE[cheie]) { avert.push(tr("Raportul ales nu e printre cele știute: am făcut cutia de 1 : 3.")); cheie = "1:3"; }', '      if (!RAPOARTE[cheie]) { cheie = "1:3"; }', 'sabloane', 'raportul necunoscut, fără avertisment')
o('M37', LG, '      let cheie = d.raport === undefined ? "1:3" : String(d.raport).replace(/\\s+/g, "");', '      let cheie = d.raport === undefined ? "1:9" : String(d.raport).replace(/\\s+/g, "");', 'sabloane', 'fără raport, alt raport decât 1 : 3')
o('M38', LG, '      let cheie = d.raport === undefined ? "1:3" : String(d.raport).replace(/\\s+/g, "");', '      let cheie = d.raport === undefined ? "1:3" : String(d.raport);', 'sabloane', 'un raport scris cu spații nu se mai citește')

# --- motorul: șasiul
o('M09', LG, '[s / 2 - j0, s * cj + s / 2 - j0, 0]), b: stift0 }));', '[s / 2 - j0, s / 2 - j0, 0]), b: stift0 }));', 'sabloane', 'ambele șine sub marginea din față (una în alta)')
o('M10', LG, '      for (const k of [0, lung - 2]) {', '      for (const k of [0, lung - 3]) {', 'sabloane', 'al doilea ax, în penultima gaură')
o('M11', LG, '      const nAx = lat + 5, iese =', '      const nAx = lat + 4, iese =', 'sabloane', 'axele cu un știft mai scurte: roata intră în bucșă')
o('M12', LG, 'alunec: iese - (s / 2 - 0.2) - j0 });', 'alunec: iese - (s / 2 - 0.2) + 1 });', 'sabloane', 'bucșa intră 1,1 mm în șină')
o('M13', LG, '      cote.ecartament = s * nAx - 0.2 - lat0;', '      cote.ecartament = s * nAx - 0.2;', 'sabloane', 'ecartamentul, fără lățimea roții')
o('M14', LG, '      cote.ampatament = s * (lung - 2);', '      cote.ampatament = s * (lung - 1);', 'sabloane', 'ampatamentul, cu un pas în plus')

# --- motorul: cutia de angrenaje
o('M15', LG, '"1:3": [[8, 24]],', '"1:3": [[8, 16]],', 'sabloane', 'roțile lui 1 : 3, altele (axele nu mai cad în găuri)')
o('M16', LG, '      const cate = Math.max(0, Math.ceil((R + P.stift_h + 0.4 - h) / H - 1e-9));', '      const cate = Math.max(0, Math.ceil((R + P.stift_h + 0.4 - h) / (2 * H) - 1e-9));', 'sabloane', 'pereții prea joși: roata mare intră în placă')
o('M17', LG, 'alunec: s + adanc + 0.3 + t * (gros + 0.5) })));', 'alunec: s + adanc - 0.5 + t * (gros + 0.5) })));', 'sabloane', 'roțile intră 0,5 mm în primul perete')
o('M18', LG, 'alunec: s + adanc + 0.3 + t * (gros + 0.5) })));', 'alunec: s + adanc + 0.3 + t * gros })));', 'sabloane', 'treptele lipite una de alta')
o('M19', LG, '        let delta = (0.5 - (f - Math.floor(f))) * 2 * Math.PI / z2;', '        let delta = (0 - (f - Math.floor(f))) * 2 * Math.PI / z2;', 'sabloane', 'dinte în fața dintelui (roțile una în alta)')
# M20: practic echivalentă pentru cele patru șabloane: rotirea pusă pe axul condus e 0 sau exact o jumătate de dinte (măsurat:
# 1 : 1, 23,5 dinți; celelalte, 0), iar o jumătate de dinte într-un sens sau în celălalt e același loc al dinților
o('M20', LG, 'semn = scalar(dir, v) < 0 ? -1 : 1;', 'semn = scalar(dir, v) < 0 ? 1 : -1;', 'sabloane', 'roata condusă, rotită în sensul greșit')
o('M21', LG, '        pa.unghi = ((pa.unghi + semn * delta * 180 / Math.PI) % 360 + 360) % 360;', '        pa.unghi = pa.unghi;', 'sabloane', 'dinții nu se mai îmbucă: axul condus nu se rotește')
o('M22', LG, '      cote.raport = trepte.reduce((r, [a, b]) => r * b / a, 1);', '      cote.raport = trepte.reduce((r, [a, b]) => r * a / b, 1);', 'sabloane', 'raportul, întors')
o('M23', LG, '      const lung = gauri[gauri.length - 1]! + 2, lat = 2 + trepte.length,', '      const lung = gauri[gauri.length - 1]! + 1, lat = 2 + trepte.length,', 'sabloane', 'pereții prea scurți: ultimul ax nu mai are gaură')
o('M24', LG, 'alunec: s - (s / 2 - 0.2) - j0 });', 'alunec: s - (s / 2 - 0.2) + 1 });', 'sabloane', 'bucșele cutiei intră în pereți')

# --- motorul: brațul de macara
o('M25', LG, '{ de: stift, a: 0, b: 0, unghi: unghi + 90 });', '{ de: stift, a: 0, b: 0, unghi: 90 - unghi });', 'sabloane', 'brațul, în jos')
o('M26', LG, "      const unghi = intregSablon(d.unghi, 0, 80, 45, avert,", "      const unghi = intregSablon(d.unghi, 0, 90, 45, avert,", 'sabloane', 'brațul poate sta drept în sus')
o('M27', LG, '      const varf = perete(placa, stiftPlaca(placa, 1, 1), 2, inalt - 1, "galben");', '      const varf = perete(placa, stiftPlaca(placa, 1, 1), 2, inalt, "galben");', 'sabloane', 'stâlpul, cu o cărămidă în plus')
o('M28', LG, '      piese[ax]!.prins!.alunec = groasa + 0.3;', '      piese[ax]!.prins!.alunec = 0.3;', 'sabloane', 'fulia, în grindă')
o('M29', LG, '      cote.pivot = pivot; cote.raza = s * (brat - 1) * Math.cos(u);', '      cote.pivot = pivot; cote.raza = s * brat * Math.cos(u);', 'sabloane', 'raza, cu un pas în plus')

# --- motorul: barca
o('M30', LG, '      for (let i = 0; i < lung; i++) { const a = Math.max(0, i - (lung - 1 - t));', '      for (let i = 0; i < lung; i++) { const a = Math.max(0, i - (lung - t));', 'sabloane', 'prora, cu o coloană mai puțin ascuțită')
o('M31', LG, 'lat = Math.min(8, Math.max(4, 2 * Math.round((Number.isFinite(lc) ? lc : 6) / 2)));', 'lat = Math.min(8, Math.max(4, Math.round(Number.isFinite(lc) ? lc : 6)));', 'sabloane', 'o lățime impară (blocul motorului, alături de mijloc)')
o('M32', LG, 'a: stiftPlaca(placa, 0, jm + 1), b: 0, unghi: -90 });', 'a: stiftPlaca(placa, 0, jm + 1), b: 0, unghi: 90 });', 'sabloane', 'blocul motorului, întors: axul spre prora')
o('M33', LG, '      pune(elice, "galben", { de: ax, a: 0, b: 0 });', '      pune(elice, "galben", { de: ax, a: 0, b: 1 });', 'sabloane', 'elicea, cu spatele spre barcă')
o('M34', LG, 'butuc = corp(elice).dim[2]!, iese = butuc + 2;', 'butuc = corp(elice).dim[2]!, iese = butuc;', 'sabloane', 'elicea, lipită de pupă')

# --- motorul: ridicarea pe masă
o('M35', LG, '    if (jos < -1e-9) piese[0]!.z = Math.ceil(-jos / P.placa - 1e-9);', '    if (jos < -1e-9) piese[0]!.z = Math.floor(-jos / P.placa - 1e-9);', 'sabloane', 'baza, ridicată prea puțin: roțile sub masă')
JS = '    piese.forEach((p, i) => { const m = T[i]!.m, tz = T[i]!.t[2]; for (const t of corp(p.def).tri) for (const q of t) jos = Math.min(jos, m[6]! * q[0] + m[7]! * q[1] + m[8]! * q[2] + tz); });'
o('M36', LG, JS, '    piese.forEach((p, i) => { jos = Math.min(jos, cutieTransf(T[i]!, corp(p.def).dim)[0][2]); });', 'sabloane', 'ridicarea după cutii: o roată rotită ridică baza prea mult')

# --- atelierul: panoul, ce iese pe hârtie, construcția nouă
o('A01', AT, '{ fel: "sasiu", deschis: false, valori: {', '{ fel: "sasiu", deschis: true, valori: {', 'e2e', 'panoul, desfăcut la deschidere')
o('A02', AT, 'def: defCurenta(p.def.tip, { ...(STARE0 as unknown as Record<string, object>)[p.def.tip], ...p.def })', 'def: p.def', 'e2e', 'piesele nu mai sunt completate ca în editor (o roată din editor stă pe alt rând)')
o('A03', AT, '{ de: ids[p.prins.de]!, a: p.prins.a,', '{ de: ids[0]!, a: p.prins.a,', 'e2e', 'toate piesele, legate de bază (legăturile stricate)')
o('A04', AT, 'nume: Lego.numeLiber(constructii.map(numeC), g.nume), nr:', 'nume: g.nume, nr:', 'e2e', 'a doua construcție de același fel, cu același nume')
o('A05', AT, '    constructii.push(c); treciPe(c);\n    toast(', '    constructii.push(c); dupaModel();\n    toast(', 'e2e', 'construcția nouă nu e aleasă')
o('A06', AT, 'tr`Între axe: ${fmt(c.ampatament!)} mm; între roțile de pe un ax: ${fmt(c.ecartament!)} mm.`', 'tr`Între axe: ${fmt(c.ecartament!)} mm; între roțile de pe un ax: ${fmt(c.ampatament!)} mm.`', 'e2e', 'cotele șasiului, inversate')
o('A07', AT, '(c.raport === 1 ? tr(', '(c.raport === 0 ? tr(', 'e2e', 'la 1 : 1, „de 1 ori mai încet”')
o('A08', AT, '(${c.trepte === 1 ? tr("o treaptă") : tr("două trepte")})', '(${c.trepte === 2 ? tr("o treaptă") : tr("două trepte")})', 'e2e', 'treptele, numărate greșit')
o('A09', AT, 'vârful brațului, la ${fmt(c.varf!)} mm înălțime și ${fmt(c.raza!)} mm în față.`', 'vârful brațului, la ${fmt(c.raza!)} mm înălțime și ${fmt(c.varf!)} mm în față.`', 'e2e', 'înălțimea și raza vârfului, inversate')
o('A10', AT, '    const piese = n % 100 === 0 || n % 100 >= 20 ? tr`${n} de piese` : tr`${n} piese`;', '    const piese = tr`${n - 1} piese`;', 'e2e', 'câte piese, una mai puțin (baza nenumărată)')
o('A11', AT, '${g.avert.map(a => `<p class="avert" data-avert-gata>${a}</p>`).join("")}', '', 'e2e', 'avertismentul motorului nu se mai arată')
o('A12', AT, 'Math.min(c[3], Math.max(c[2], v))', 'v', 'e2e', 'un număr în afara marginilor rămâne cum l-a scris omul')
o('A13', AT, '    if (detVechi) gata.deschis = detVechi.open;\n', '', 'e2e', 'starea panoului, din `toggle`: o alegere imediat după deschidere îl strânge')
o('A14', AT, 'gata.deschis = detGata.open; if (gata.deschis) $("#at-cg-info").innerHTML = infoGata(); };', 'gata.deschis = detGata.open; };', 'e2e', 'desfăcut, panoul nu spune ce iese')
o('A15', AT, 'gata.fel = (ev.target as HTMLSelectElement).value; editorModel(); $("#at-cg-fel").focus(); };', 'gata.fel = (ev.target as HTMLSelectElement).value; $("#at-cg-info").innerHTML = infoGata(); };', 'e2e', 'alt fel nu-și schimbă câmpurile')
o('A16', AT, 'gata.fel = (ev.target as HTMLSelectElement).value; editorModel(); $("#at-cg-fel").focus(); };', 'gata.fel = (ev.target as HTMLSelectElement).value; editorModel(); };', 'e2e', 'după alt fel, focusul pleacă din listă')
o('A17', AT, '      $("#at-cg-info").innerHTML = infoGata();\n    };', '    };', 'e2e', 'un câmp schimbat nu schimbă ce iese pe hârtie')
o('A18', AT, '${t || `Ø${fmt(+k)}`}', '${t || `Ø${k}`}', 'e2e', 'diametrele roților, cu punct în română')
o('A19', AT, '    const blocGata = `<details class="model-gata" id="at-cg"${gata.deschis ? " open" : ""}>', '    const blocGata = `<details class="model-gata" id="at-cg">', 'e2e', 'panoul se strânge după fiecare schimbare din model')
o('A20', AT, '    toast(tr`„${numeC(c)}” e în model.`);', '    toast(tr("Construcția e în model."));', 'e2e', 'mesajul nu spune construcția')


SETURI = {
    'sabloane': ['test/unit/trenulet.sabloane.test.ts'],
}
E2E = ['test/e2e/trenulet.sabloane.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
