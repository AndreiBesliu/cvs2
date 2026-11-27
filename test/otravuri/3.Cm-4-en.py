# Lista de otrăvuri a feliei 3.Cm-4 în engleză (claritatea editorului elicelor; ADR 0340), 27.11.2026, alese de autor:
# traducerile frazei sensului, ale rândurilor „Repede” și „Piese LEGO” și ale mesajului unui câmp adus în plajă. Le prinde
# proba în engleză din cvs2 (`trenulet.spec.ts`), care cere textele întregi și nicio română rămasă.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, 'if it turns clockwise, pick “Right”; otherwise, “Left”. The propeller sits on the axle with its bed side towards the motor', 'if it turns clockwise, pick “Left”; otherwise, “Right”. The propeller sits on the axle with its bed side towards the motor', 'e2e', 'elicea: sensurile întoarse în engleză')
o('N02', T, ' "Piese LEGO:": "LEGO parts:",', ' "Piese LEGO:": "",', 'e2e', '„Piese LEGO:” rămas în română')
o('N03', T, ' "5, 7, 9 și 12 știfturi": "5, 7, 9 and 12 studs",', ' "5, 7, 9 și 12 știfturi": "",', 'e2e', 'știfturile de la „Repede”, rămase în română')
o('N04', T, '"A propeller’s pitch is 0.3 to 1.5 × the diameter: made it {0}."', '"A propeller’s pitch is 0.3 to 1.5 × the diameter."', 'e2e', 'mesajul pasului fără valoarea făcută')
o('N05', T, ' "Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu {0}.": "A propeller’s pitch', ' "Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu {0}.": "", "x": "A propeller’s pitch', 'e2e', 'mesajul pasului rămas în română')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
