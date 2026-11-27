# Lista de otrăvuri a feliei 3.Cm-2 în engleză (tipărirea elicelor spusă cinstit; ADR 0340), 27.11.2026, alese de autor:
# traducerile paragrafului tipăririi și ale textelor schimbate (subiectul fiecărei piese, cele patru feluri, marginea,
# descrierile). Le prinde proba în engleză din cvs2 (`trenulet.spec.ts`), care cere textele întregi și nicio română rămasă.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Se tipărește cu partea dinspre barcă pe masă,": "Prints boat side down on the bed,",', ' "Se tipărește cu partea dinspre barcă pe masă,": "Prints,",', 'e2e', 'elicea de barcă, fără partea de pe masă')
o('N02', T, ' "Rotorul se tipărește": "The rotor prints",', ' "Rotorul se tipărește": "",', 'e2e', 'subiectul rotorului rămas în română')
o('N03', T, 'a layer overhangs the one below by up to {1} mm.",', 'a layer overhangs the one below by up to {0} mm.",', 'e2e', 'în „aspru”, subiectul în locul treptei')
o('N04', T, '"The first layer touches the bed on only {0}% of the blade disc: add a brim in your slicer."', '"The first layer touches the bed on only {0}% of the blade disc."', 'e2e', 'marginea nu se mai cere')
o('N05', T, '"{0} with supports under the blades (your slicer adds them): their bottom edge lifts off the bed."', '"{0} without supports: their bottom edge lifts off the bed."', 'e2e', 'înclinată spre pupa, „fără suport”')
o('N06', T, ' "Pasul {0} mm ({1} × diametrul).": "Pitch {0} mm ({1} × diameter).",', ' "Pasul {0} mm ({1} × diametrul).": "",', 'e2e', 'pasul elicei rămas în română')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
