# Lista de otrăvuri a feliei 3.Cn (ventilatorul în „Modelul”; ADR 0341), 28.11.2026, alese de autor: motorul (șablonul
# `constructieGata('ventilator')`: lista șabloanelor, grinda, știfturile, urechea pe care stă carcasa, axul, bucșa,
# rotorul, valorile duse în margini, mesajele) și atelierul (felul în panou, câmpurile, textul, „Fă-l în model” cu
# valorile editorului și trecerea în „Modelul”).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'

# --- motorul
o('V01', LG, 'const SABLOANE = ["sasiu", "angrenaje", "macara", "barca", "ventilator"] as const;', 'const SABLOANE = ["sasiu", "angrenaje", "macara", "barca"] as const;', 'sabloane', 'ventilatorul lipsește din șabloane')
o('V02', LG, '      pune(stiftDef, "negru", { de: grinda, a: sus(2 * k), b: 1 });\n', '', 'sabloane', 'un singur știft (urechea de pe +x, neprinsă)')
o('V03', LG, '      pune(stiftDef, "negru", { de: grinda, a: sus(2 * k), b: 1 });', '      pune(stiftDef, "negru", { de: grinda, a: sus(2 * k - 1), b: 1 });', 'sabloane', 'al doilea știft în penultima gaură, sub carcasă')
o('V04', LG, '&& Math.abs(c.p[1] - cax[1]!) < 1e-6 && c.p[0] < cax[0]! - 1e-6);', '&& Math.abs(c.p[1] - cax[1]!) < 1e-6 && c.p[0] > cax[0]! + 1e-6);', 'sabloane', 'carcasa pe urechea de pe +x (axul ei în afara grinzii)')
o('V05', LG, '      const ax = pune({ tip: "ax", lung: t.ax } as DefPiesa, "negru", { de: grinda, a: prindere(grinda, "gauraStift", [s * k, 0, 0], JOS), b: 0 });', '      const ax = pune({ tip: "ax", lung: t.ax } as DefPiesa, "negru", { de: grinda, a: prindere(grinda, "gauraStift", [s * (k - 1), 0, 0], JOS), b: 0 });', 'sabloane', 'axul în altă gaură (rotorul în afara tubului)')
o('V06', LG, '      pune(bucsaDef, "rosu", { de: ax, a: 1, b: gura(bucsaDef), alunec: varf - (g + t.bucsa) });', '      pune(bucsaDef, "rosu", { de: ax, a: 1, b: gura(bucsaDef), alunec: varf - g });', 'sabloane', 'bucșa intră în grindă')
o('V07', LG, '      pune(rotorDef, "albastru", { de: ax, a: 1, b: gura(rotorDef), alunec: varf - (g + t.jos + q.Hh) });', '      pune(rotorDef, "albastru", { de: ax, a: 1, b: gura(rotorDef), alunec: varf - (g + q.Hh) });', 'sabloane', 'rotorul pe grindă, peste bucșă')
o('V08', LG, '      const grinda = pune({ tip: "grinda", celule: Array.from({ length: t.gauri }, (_, i) => [i, 0, "r"]), groasa: true } as DefPiesa, "gri");', '      const grinda = pune({ tip: "grinda", celule: Array.from({ length: t.gauri - 1 }, (_, i) => [i, 0, "r"]), groasa: true } as DefPiesa, "gri");', 'sabloane', 'grinda cu o gaură mai puțin')
o('V09', LG, '      const comune = { palete: q.z, diametru: q.D, joc: q.joc, pas: q.pd, latime: q.lat };', '      const comune = { palete: q.z, diametru: d.diametru ?? q.D, joc: q.joc, pas: q.pd, latime: q.lat };', 'sabloane', 'diametrul nedus în margini (Ø200)')
o('V10', LG, '      avert.push(...q.avert);\n', '', 'sabloane', 'avertismentele cotelor pierdute')
o('V11', LG, '      const gaura = d.gaura === "r" ? "r" : "x";', '      const gaura = "x";', 'sabloane', 'gaura rotundă a editorului pierdută')
o('V12', LG, '      if (d.gaura !== undefined && d.gaura !== "x" && d.gaura !== "r") avert.push(tr("Pe ax, rotorul are nevoie de o gaură de ax: i-am pus-o."));\n', '', 'sabloane', 'gaura schimbată în tăcere')
o('V13', LG, 'sens: d.sens === "stanga" ? "stanga" : "dreapta", gaura,', 'sens: "dreapta", gaura,', 'sabloane', 'sensul editorului pierdut')
o('V14', LG, '...comune, urechi: q.urechi } as DefPiesa;', '...comune, urechi: 2 } as DefPiesa;', 'sabloane', 'urechile editorului pierdute')
o('V15', LG, 'gaura, inel: q.inel ? "da" : "nu" } as DefPiesa;', 'gaura, inel: "nu" } as DefPiesa;', 'sabloane', 'inelul editorului pierdut')
o('V16', LG, '      nume = tr("Ventilator");', '      nume = tr("Ventilatorul");', 'sabloane', 'alt nume')
# --- atelierul
o('A01', AT, '    ventilator: [["diametru", "Diametrul în carcasă (mm)", 24, 120], ["palete", "Palete", 3, 12], ["urechi", "Urechile", [["2", "Două"], ["4", "Patru"]]]],\n', '    ventilator: [],\n', 'e2e', 'panoul fără câmpurile ventilatorului')
o('A02', AT, ', ["barca", "Barcă cu elice"], ["ventilator", "Ventilator"]]', ', ["barca", "Barcă cu elice"]]', 'e2e', 'ventilatorul lipsește din listă')
o('A03', AT, '      : g.fel === "ventilator" ? tr`Grinda are ${c.gauri} găuri, axul ${c.axul} știfturi; rotorul stă pe ax, în mijlocul carcasei.`\n', '', 'e2e', 'textul bărcii la ventilator')
o('A04', AT, '    faConstructiaGata();\n    alegeVedere("model");', '    faConstructiaGata();', 'e2e', '„Fă-l în model” rămâne în editorul piesei')
o('A05', AT, '["diametru", "palete", "joc", "pas", "latime", "sens", "gaura", "inel", "urechi"].filter(', '["palete", "joc", "pas", "latime", "sens", "gaura", "inel", "urechi"].filter(', 'e2e', 'diametrul editorului pierdut')
o('A06', AT, '["diametru", "palete", "joc", "pas", "latime", "sens", "gaura", "inel", "urechi"].filter(', '["diametru", "palete", "joc", "pas", "latime", "sens", "gaura", "inel"].filter(', 'e2e', 'urechile editorului pierdute')
o('A07', AT, '      $("#at-ve-model").onclick = faVentilatorInModel;\n', '', 'e2e', 'butonul nu face nimic')
o('A08', AT, '    gata.fel = "ventilator";\n', '', 'e2e', '„Fă-l în model” face șasiul')

SETURI = {
    'sabloane': ['test/unit/trenulet.sabloane.ventilator.test.ts', 'test/unit/trenulet.sabloane.test.ts'],
}
E2E = ['test/e2e/trenulet.sabloane.spec.ts']
# pagina se face din surse în spec: build-ul aplicației nu o schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
