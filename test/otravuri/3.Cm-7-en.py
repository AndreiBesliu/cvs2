# Lista de otrăvuri a feliei 3.Cm-7 în engleză (duza Kort; ADR 0340), 27.11.2026, alese de autor: numele duzei, textul ei și
# butonul „Fă elicea cu duza”. Le prinde proba în engleză din cvs2 (`trenulet.spec.ts`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Duză Kort Ø{0} × {1}, cu {2} urechi": "Kort nozzle Ø{0} × {1}, with {2} lugs",', ' "Duză Kort Ø{0} × {1}, cu {2} urechi": "",', 'e2e', 'numele duzei rămas în română')
o('N02', T, '{2} mm long, with the rounded mouth on the boat side, on the bed; prints without supports.', '{2} mm long, with the rounded mouth on the boat side, on the bed.', 'e2e', 'textul fără tipărire')
o('N03', T, ' "Fă elicea cu duza": "Make the propeller with the nozzle",', ' "Fă elicea cu duza": "",', 'e2e', 'butonul rămas în română')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
