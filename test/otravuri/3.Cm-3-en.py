# Lista de otrăvuri a feliei 3.Cm-3 în engleză (ventilatorul ca trusă; ADR 0340), 27.11.2026, alese de autor: eticheta bifei
# trusei, rămasă în română sau tradusă greșit. O prinde proba în engleză din cvs2 (`trenulet.spec.ts`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ': "And the kit: the beam under the duct, the axle, a half bush and the pins",', ': "",', 'e2e', 'eticheta bifei rămasă în română')
o('N02', T, ': "And the kit: the beam under the duct, the axle, a half bush and the pins",', ': "And the kit: the beam, the axle, a half bush and the pins",', 'e2e', 'eticheta fără „sub carcasă”')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
