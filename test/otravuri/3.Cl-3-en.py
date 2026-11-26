# Otrăvurile ornamentului cu nume, în engleză (felia 3.Cl-3, ADR 0285), 25.11.2026: cuvintele fără diacritice ale
# editorului („Ornament cu nume”, „Numele”, „Scrisul:”, „, decupat”) se văd în engleză doar în cvs2, iar proba de română
# nu le recunoaște, deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care trece prin fila „Crăciun”);
# restul listei feliei e în `3.Cl-3.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Ornament cu nume": "Name ornament",', ' "Ornament cu nume": "Ornament cu nume",', 'e2e', 'titlul editorului și butonul din galerie, rămase în română')
o('N02', T, ' "Numele": "Name",', ' "Numele": "Numele",', 'e2e', 'câmpul numelui, rămas în română')
o('N03', T, ' "Scrisul:": "Lettering:",', ' "Scrisul:": "Scrisul:",', 'e2e', 'rândul scrisului, rămas în română')
o('N04', T, ' ", decupat": ", cut out",', ' ", decupat": ", decupat",', 'e2e', 'numele piesei decupate, rămas în română')
o('N05', T, ' ", de {0} mm": ", {0} mm wide",', ' ", de {0} mm": ", de {0} mm",', 'e2e', 'mărimea din numele inimii, rămasă în română')
o('N06', T, ' "Literele au {0} mm, cu linia de {1} mm.": "The letters are {0} mm high, with a {1} mm line.",', ' "Literele au {0} mm, cu linia de {1} mm.": "The letters are {1} mm high, with a {0} mm line.",', 'e2e', 'rândul literelor scrie linia în locul majusculei')
o('N07', T, ' "Sunt adânci de {0} mm.": "They are {0} mm deep.",', ' "Sunt adânci de {0} mm.": "They are {0} mm high.",', 'e2e', 'rândul scrisului adâncit spune altceva')
o('N08', T, ' "Lungimea (mm)": "Length (mm)",', ' "Lungimea (mm)": "Lungimea (mm)",', 'e2e', 'câmpul lungimii, rămas în română')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
