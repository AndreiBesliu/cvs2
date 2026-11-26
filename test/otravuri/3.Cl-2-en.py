# Otrăvurile globului de Crăciun, în engleză (felia 3.Cl-2, ADR 0285), 25.11.2026: cuvintele fără diacritice ale editorului
# („Glob”, „Plat”, „Dungi”, „Zigzaguri”, „Stele”, „Decupat”) se văd în engleză doar în cvs2, iar proba de română nu le
# recunoaște, deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care trece prin fila „Crăciun”);
# restul listei feliei e în `3.Cl-2.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Glob": "Bauble",', ' "Glob": "Glob",', 'e2e', 'titlul editorului globului, rămas în română')
o('N02', T, ' "Plat": "Flat",', ' "Plat": "Plat",', 'e2e', 'felul „Plat”, rămas în română')
o('N03', T, ' "Dungi": "Stripes",', ' "Dungi": "Dungi",', 'e2e', 'modelul „Dungi”, rămas în română')
o('N04', T, ' "Stele": "Stars",', ' "Stele": "Stele",', 'e2e', 'modelul „Stele”, rămas în română')
o('N05', T, ' "Decupat": "Cut out",', ' "Decupat": "Decupat",', 'e2e', 'desenul „Decupat”, rămas în română')
o('N06', T, ' "Zigzaguri": "Zigzags",', ' "Zigzaguri": "Zigzaguri",', 'e2e', 'câmpul zigzagurilor, rămas în română')
o('N07', T, ' "Din două discuri": "Two discs",', ' "Din două discuri": "Din doua discuri",', 'e2e', 'felul „Din două discuri”, rămas în română (fără diacritice)')
o('N08', T, ' ", zigzag × {0}": ", zigzag × {0}",', ' ", zigzag × {0}": ", zigzag",', 'e2e', 'numele globului cu zigzag pierde numărul')
o('N09', T, '(after layer {1}, with 0.2 mm layers)', '(after layer {0}, with 0.2 mm layers)', 'e2e', 'rândul reliefului scrie înălțimea în locul stratului')
o('N10', T, ' ", din două discuri": ", two discs",', ' ", din două discuri": "",', 'e2e', 'numele globului din două discuri, fără traducere')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
