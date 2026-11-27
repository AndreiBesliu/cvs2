# Lista de otrăvuri a feliei 3.Cm-4 (claritatea editorului elicelor; ADR 0340; auditul elicelor, constatarea 5), 27.11.2026,
# alese de autor: motorul (`campElice`: implicitul, marginea, mesajul cu zecimala limbii; textele fiecărui câmp, în cote și în
# piesă; urechile carcasei; sensul rotorului, pe care stă fraza din editor) și atelierul (câmpul adus în plajă, cu mesajul sub
# câmpuri; câmpul golit; mesajul scos de o alegere și de altă piesă; fraza sensului la toate trei; „Repede” la elice, cu
# „Piese LEGO” alături).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul: cititorul unui câmp
o('C01', LG, '    if (x !== n) avert.push(ce(String(x).replace(".", Limba.zecimal)));', '    if (x !== n && n > b) avert.push(ce(String(x).replace(".", Limba.zecimal)));', 'claritate', 'doar marginea de sus se spune')
o('C02', LG, '    if (v === null || v === undefined || v === "" || !Number.isFinite(+(v as number))) return implicit;', '    if (v === null || v === undefined || !Number.isFinite(+(v as number))) return implicit;', 'claritate', 'un câmp gol e 0: adus la margine și spus')
o('C03', LG, '    if (x !== n) avert.push(ce(String(x).replace(".", Limba.zecimal)));', '    if (x !== n) avert.push(ce(String(x)));', 'claritate', 'valoarea făcută, cu punct în română')
o('C04', LG, 'palete: am făcut-o cu ${x}.`, Math.round);\n    const D = campElice(avert, d.diametru, 20, 200,', 'palete: am făcut-o cu ${x}.`);\n    const D = campElice(avert, d.diametru, 20, 200,', 'elice', 'paletele elicei nu se mai rotunjesc (3,4 rămâne 3,4)')
# --- motorul: câmpurile fiecărei elice
o('C05', LG, '    const pd = campElice(avert, d.pas, 0.3, 1.5, 0.7,', '    const pd = campElice(avert, d.pas, 0.3, 1.6, 0.7,', 'claritate', 'pasul elicei până la 1,6')
o('C06', LG, '    const lat = campElice(avert, d.latime, 15, 60, 30,', '    const lat = campElice([], d.latime, 15, 60, 30,', 'claritate', 'lățimea elicei, strânsă în tăcere')
o('C07', LG, '    const inc = campElice(avert, d.inclinare, 0, 40, 20,', '    const inc = campElice([], d.inclinare, 0, 40, 20,', 'claritate', 'înclinarea înapoi, strânsă în tăcere')
o('C08', LG, '    const pupa = campElice(avert, d.pupa, 0, BARCA.pupaMax, 0,', '    const pupa = campElice([], d.pupa, 0, BARCA.pupaMax, 0,', 'claritate', 'înclinarea spre pupa, strânsă în tăcere')
o('C09', LG, '    const joc = campElice(avert, d.joc, 0.3, 2, 0.8,', '    const joc = campElice([], d.joc, 0.3, 2, 0.8,', 'claritate', 'jocul ventilatorului, strâns în tăcere')
o('C10', LG, '    const lat = campElice(avert, d.latime, 15, 60, 45,', '    const lat = campElice(avert, d.latime, 15, 60, 30,', 'claritate', 'implicitul lățimii ventilatorului, al elicei (30)')
o('C11', LG, ' && urechi !== +(d.urechi as number)) avert.push(tr("Carcasa unui ventilator are 2 sau 4 urechi: am făcut-o cu 2."));', ') avert.push(tr("Carcasa unui ventilator are 2 sau 4 urechi: am făcut-o cu 2."));', 'claritate', 'urechile spuse și la 2 sau 4')
o('C12', LG, '    if (d.urechi !== null && d.urechi !== undefined && d.urechi !== "" && Number.isFinite(+(d.urechi as number)) && urechi', '    if (d.urechi !== null && d.urechi !== undefined && urechi', 'claritate', 'urechile „x” spuse')
# --- motorul: textele ajung în piesă și în API
o('C13', LG, '    const q = eliceCote(d), avert = [...q.avert], { z, R } = q, rh = ELICE.butucR;', '    const q = eliceCote(d), avert: string[] = [], { z, R } = q, rh = ELICE.butucR;', 'claritate', 'piesa elicei nu mai spune nimic')
o('C14', LG, '    const q = eliceBarcaCote(d), avert = [...q.avert], { rh, Hh } = q;', '    const q = eliceBarcaCote(d), avert: string[] = [], { rh, Hh } = q;', 'claritate', 'piesa elicei de barcă nu mai spune nimic')
o('C15', LG, '    const q = ventilatorCote(d), avert = [...q.avert];', '    const q = ventilatorCote(d), avert: string[] = [];', 'claritate', 'ventilatorul nu mai spune nimic')
o('C16', LG, 'bRad: q.bRad, bVarf: q.bVarf, consola: q.consola, avert: q.avert }; },\n    // elicea de barcă', 'bRad: q.bRad, bVarf: q.bVarf, consola: q.consola }; },\n    // elicea de barcă', 'claritate', 'cotele elicei fără texte (editorul n-are ce spune)')
# --- motorul: sensul rotorului, pe care stă fraza din editor
o('C17', LG, '    const tri = paleteElice(q.statii, q.z, d.sens === "stanga" ? -1 : 1, true), butuc = butucElice(q.rh, q.Hh, d.gaura);', '    const tri = paleteElice(q.statii, q.z, d.sens === "stanga" ? 1 : -1, true), butuc = butucElice(q.rh, q.Hh, d.gaura);', 'claritate', 'rotorul „dreapta” întors (fraza ar minți)')

# --- atelierul: câmpul adus în plajă
o('A01', AT, '      plaja = x === v ? null : { tip: stare.tip, text: cote({ [cheie]: v }).avert.join(" ") };', '      plaja = null;', 'e2e', 'fără mesaj sub câmpuri')
o('A02', AT, '      p[cheie] = x; editor(); schimbat();', '      if (x === v) p[cheie] = x; editor(); schimbat();', 'e2e', 'valoarea din afara plajei ignorată, ca înainte')
o('A03', AT, '      if (s.trim() === "" || !Number.isFinite(+s)) { editor(); return; }\n', '', 'e2e', 'un câmp golit e 0: adus la margine')
o('A04', AT, '      plaja = x === v ? null : { tip: stare.tip, text: cote({ [cheie]: v }).avert.join(" ") };', '      plaja = x === v ? plaja : { tip: stare.tip, text: cote({ [cheie]: v }).avert.join(" ") };', 'e2e', 'o valoare din plajă nu scoate mesajul')
o('A05', AT, '    if (plaja && plaja.tip !== t) plaja = null;\n', '', 'e2e', 'mesajul rămâne după altă piesă')
o('A06', AT, '; if (!b) return; plaja = null; f2(b.dataset.v!); editor(); schimbat(); }; };\n      alege("#at-el-grila"', '; if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };\n      alege("#at-el-grila"', 'e2e', 'la elice, o alegere nu scoate mesajul')
o('A07', AT, '; if (!b) return; plaja = null; f2(b.dataset.v!); editor(); schimbat(); }; };\n      alege("#at-ve-piesa"', '; if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };\n      alege("#at-ve-piesa"', 'e2e', 'la ventilator, o alegere nu scoate mesajul')
o('A08', AT, '      const cote = (d: Record<string, unknown>) => Lego.eliceBarcaCote(d);', '      const cote = (d: Record<string, unknown>) => Lego.eliceCote(d);', 'e2e', 'elicea de barcă spune textul elicei')
o('A09', AT, '      campElice("#at-el-pas", p, "pas", 2, 0.3, 1.5, cote);', '      campElice("#at-el-pas", p, "pas", 2, 0.3, 1.6, cote);', 'e2e', 'pasul elicei până la 1,6 în editor')
o('A10', AT, '      campElice("#at-ve-joc", p, "joc", 1, 0.3, 2, cote);', '      campElice("#at-ve-joc", p, "joc", 0, 0.3, 2, cote);', 'e2e', 'jocul la întreg (2,1 → 2: fără mesaj)')
o('A11', AT, '      campElice("#at-eb-pupa", p, "pupa", 0, 0, 15, cote);', '      campElice("#at-eb-pupa", p, "pupa", 0, 0, 16, cote);', 'e2e', 'înclinarea spre pupa până la 16 în editor')
# --- atelierul: fraza sensului
o('A12', AT, 'privește axul dinspre el: dacă se învârte în sensul acelor de ceasornic, alege „Dreapta”; invers, „Stânga”.', 'privește axul dinspre el: dacă se învârte în sensul acelor de ceasornic, alege „Stânga”; invers, „Dreapta”.', 'e2e', 'elicea: sensurile întoarse')
o('A13', AT, 'privește axul din spatele bărcii: dacă se învârte în sensul acelor de ceasornic, alege „Dreapta”', 'privește axul din fața bărcii: dacă se învârte în sensul acelor de ceasornic, alege „Dreapta”', 'e2e', 'elicea de barcă: privită din față')
o('A14', AT, 'Rotorul stă pe ax cu partea de pe masă spre acea parte.</p>', 'Rotorul stă pe ax cu partea de pe masă în partea cealaltă.</p>', 'e2e', 'rotorul: partea de pe masă întoarsă')
# --- atelierul: „Repede” la elice
o('A15', AT, '[["40", "Ø40"], ["56", "Ø56"], ["72", "Ø72"], ["96", "Ø96"]], String(p.diametru))', '[["40", "Ø40"], ["56", "Ø56"], ["72", "Ø72"], ["88", "Ø96"]], String(p.diametru))', 'e2e', 'Ø96 pune 88')
o('A16', AT, '      alege("#at-el-grila", v => { p.diametru = +v; });\n', '', 'e2e', '„Repede” la elice nu face nimic')
o('A17', AT, '["96", "Ø96"]], String(p.diametru))}<span class="mic">', '["96", "Ø96"]], "")}<span class="mic">', 'e2e', 'diametrul de pe grilă nu se vede apăsat')
o('A18', AT, '<span class="mic">Piese LEGO:</span>', '<span class="mic">Repede:</span>', 'e2e', 'două rânduri „Repede”')

SETURI = {
    'claritate': ['test/unit/trenulet.claritate.test.ts'],
    'elice': ['test/unit/trenulet.elice.test.ts'],
}
E2E = ['test/e2e/trenulet.elice.spec.ts', 'test/e2e/trenulet.barca.spec.ts', 'test/e2e/trenulet.ventilator.spec.ts', 'test/e2e/trenulet.pupa.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
