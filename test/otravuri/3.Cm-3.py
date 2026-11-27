# Lista de otrăvuri a feliei 3.Cm-3 (ventilatorul ca trusă; ADR 0340; auditul elicelor, constatarea 3), 27.11.2026, alese
# de autor: motorul (`ventilatorTrusa`: găurile grinzii, bucșa, axul, unde stă rotorul) și atelierul (rândul grinzii din
# „Se prinde cu”, doar la carcasă; butonul lui; bifa trusei, ținută de editor; „Fă ventilatorul” cu grinda, axul, bucșa și
# știfturile; mesajul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul
TR = '    return { gauri: 2 * q.k + 1, ax: Math.ceil((P.grinda_groasa + bucsa + q.Hh) / P.pas - 1e-9), bucsa, jos: bucsa, sus: bucsa + q.Hh };'
o('K01', LG, TR, TR.replace('gauri: 2 * q.k + 1', 'gauri: 2 * q.k'), 'trusa', 'grinda cu o gaură mai puțin (capetele nu mai cad pe urechi)')
o('K02', LG, TR, TR.replace('gauri: 2 * q.k + 1', 'gauri: 2 * q.k + 3'), 'trusa', 'grinda cu două găuri în plus')
o('K03', LG, TR, TR.replace('ax: Math.ceil(', 'ax: Math.round('), 'trusa', 'axul rotunjit, nu în sus (nu trece prin butuc)')
o('K04', LG, TR, TR.replace('(P.grinda_groasa + bucsa + q.Hh)', '(P.grinda_groasa + q.Hh)'), 'trusa', 'axul fără bucșă')
o('K05', LG, TR, TR.replace('(P.grinda_groasa + bucsa + q.Hh)', '(P.grinda_subtire + bucsa + q.Hh)'), 'trusa', 'axul socotit pe grinda subțire')
o('K06', LG, TR, TR.replace('jos: bucsa,', 'jos: 0,'), 'trusa', 'rotorul direct pe grindă (se freacă)')
o('K07', LG, TR, TR.replace('sus: bucsa + q.Hh', 'sus: q.Hh'), 'trusa', 'vârful butucului fără bucșă')
o('K08', LG, '    const q = ventilatorCote(d), bucsa = P.pas / 2 - 0.2;', '    const q = ventilatorCote(d), bucsa = P.pas - 0.2;', 'trusa', 'o bucșă întreagă în loc de jumătate')
# --- atelierul: rândul din „Se prinde cu”
o('A01', AT, '    if (tip === "ventilator" && stare.ventilator.piesa === "carcasa") {', '    if (tip === "ventilator" && stare.ventilator.piesa !== "carcasa") {', 'e2e', 'rândul grinzii la rotor, nu la carcasă')
o('A02', AT, 'html += `<div data-rand="trusa"><span>${tr`Pe o grindă de ${t.gauri},', 'html += `<div data-rand="trusa"><span>${tr`Pe o grindă de ${t.gauri - 1},', 'e2e', 'textul spune o gaură mai puțin')
o('A03', AT, '<button class="btn" type="button" data-prinde-grinda-ventilator>Pune grinda în listă</button>', '<button class="btn" type="button" data-prinde-grinda>Pune grinda în listă</button>', 'e2e', 'butonul pune grinda perechii de rotițe')
o('A04', AT, '      else if (t.closest("[data-prinde-grinda-ventilator]")) adaugaGrindaVentilator();', '', 'e2e', 'butonul nu face nimic')
o('A05', AT, '    const def = grindaVentilator(Lego.ventilatorTrusa(stare.ventilator).gauri), n = bucatiCerute();', '    const def = grindaVentilator(Lego.ventilatorTrusa(stare.ventilator).gauri - 2), n = bucatiCerute();', 'e2e', 'butonul pune o grindă mai scurtă')
o('A06', AT, 'Array.from({ length: gauri }, (_, i): [number, number, string] => [i, 0, "r"]), groasa: true });', 'Array.from({ length: gauri }, (_, i): [number, number, string] => [i, 0, "r"]), groasa: false });', 'e2e', 'grinda subțire')
# --- bifa trusei și „Fă ventilatorul”
o('A07', AT, '<input type="checkbox" id="at-ve-trusa" ${trusaVentilator ? "checked" : ""}>', '<input type="checkbox" id="at-ve-trusa" ${false ? "checked" : ""}>', 'e2e', 'bifa nu rămâne după o redesenare')
o('A08', AT, '      $("#at-ve-trusa").onchange = ev => { trusaVentilator = (ev.target as HTMLInputElement).checked; };', '', 'e2e', 'bifa nu ajunge la „Fă ventilatorul”')
o('A09', AT, '  let trusaVentilator = false;', '  let trusaVentilator = true;', 'e2e', 'bifa pornește bifată')
o('A10', AT, '      pune(grindaVentilator(t.gauri), n);', '', 'e2e', 'trusa fără grindă')
o('A11', AT, '      pune(defCurenta("ax", { lung: t.ax }), n);', '      pune(defCurenta("ax", { lung: t.ax + 1 }), n);', 'e2e', 'axul cu un pas mai lung')
o('A12', AT, '      pune(defCurenta("bucsa", { lung: 0.5, gaura: "x" }), n);', '      pune(defCurenta("bucsa", { lung: 1, gaura: "x" }), n);', 'e2e', 'o bucșă întreagă')
o('A13', AT, '      pune(defCurenta("stiftTechnic", { fanta: true, lung: 2, capat: "stift" }), 2 * n);', '      pune(defCurenta("stiftTechnic", { fanta: true, lung: 2, capat: "stift" }), n);', 'e2e', 'un singur știft')
o('A14', AT, '      pune(defCurenta("stiftTechnic", { fanta: true, lung: 2, capat: "stift" }), 2 * n);', '      pune(defCurenta("stiftTechnic", { fanta: true, lung: 3, capat: "stift" }), 2 * n);', 'e2e', 'știfturile de 3, nu de 2')
o('A15', AT, 'toast(tr`${n} × ventilatorul (rotorul și carcasa), cu grinda de ${t.gauri}, axul de ${t.ax},', 'toast(tr`${n} × ventilatorul (rotorul și carcasa), cu grinda de ${t.gauri}, axul de ${t.gauri},', 'e2e', 'mesajul spune găurile în locul axului')

SETURI = {
    'trusa': ['test/unit/trenulet.trusa.test.ts'],
}
E2E = ['test/e2e/trenulet.ventilator.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
