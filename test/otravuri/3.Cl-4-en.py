# Otrăvurile brăduțului LEGO, în engleză (felia 3.Cl-4, ADR 0285), 26.11.2026: cuvintele fără diacritice ale editorului
# („Etaj”, „Stea de vârf”… cu diacritice sunt prinse de proba de română; „Etaj”, „Marginea:”, „Steaua (mm)”, „un etaj” nu)
# se văd în engleză doar în cvs2, deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care trece prin fila
# „Crăciun”); restul listei feliei e în `3.Cl-4.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Etaj": "Tier",', ' "Etaj": "Etaj",', 'e2e', 'butonul „Etaj”, rămas în română')
o('N02', T, ' "Marginea:": "Edge:",', ' "Marginea:": "Marginea:",', 'e2e', 'rândul marginii, rămas în română')
o('N03', T, ' "Steaua (mm)": "Star (mm)",', ' "Steaua (mm)": "Steaua (mm)",', 'e2e', 'câmpul stelei, rămas în română')
o('N04', T, ' "Etaje în brăduț": "Tiers in the tree",', ' "Etaje în brăduț": "Tiers",', 'e2e', 'câmpul etajelor spune altceva')
o('N05', T, ' "{0} etaje": "{0} tiers",', ' "{0} etaje": "{0} etaje",', 'e2e', 'etajele din rândul brăduțului, rămase în română')
o('N06', T, ' "Brăduț LEGO": "LEGO Christmas tree",', ' "Brăduț LEGO": "LEGO tree",', 'e2e', 'titlul editorului și butonul din galerie spun altceva')
o('N07', T, '({1} studs across), the top and the star; built up, it is {2} mm tall.', '({2} studs across), the top and the star; built up, it is {1} mm tall.', 'e2e', 'rândul brăduțului scrie înălțimea în locul diametrelor')
o('N08', T, ' ", neted": ", smooth",', ' ", neted": ", neted",', 'e2e', 'marginea netedă din nume, rămasă în română')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
