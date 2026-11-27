# Lista de otrăvuri a feliei 3.Cm-5 în engleză (grosimea paletelor la elicele mari; ADR 0340), 27.11.2026, alese de autor:
# traducerea frazei grosimii. O prinde proba în engleză din cvs2 (`trenulet.spec.ts`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, '"Above Ø80 the blade is thicker: {0} mm at the root, {1} at the tip."', '""', 'e2e', 'fraza grosimii rămasă în română')
o('N02', T, '"Above Ø80 the blade is thicker: {0} mm at the root, {1} at the tip."', '"Above Ø80 the blade is thicker: {1} mm at the root, {0} at the tip."', 'e2e', 'rădăcina și vârful întoarse')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
