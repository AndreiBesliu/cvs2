# Otrăvurile vederii „Modelul” în engleză (felia 3.Tu, ADR 0283), 25.11.2026: rândul unei piese rotunde („axis 1, 1, 0”),
# rândul piesei alese („axis on stud 1, 1”) și textul vederii în engleză se văd doar în cvs2 (traducerile n-au litere
# românești, deci probele dicționarului nu le judecă), deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză,
# care pune roata de 24 în model); restul listei feliei e în `3.Tu.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "ax {0}, {1}, {2}": "axis {0}, {1}, {2}",', ' "ax {0}, {1}, {2}": "ax {0}, {1}, {2}",', 'e2e', 'rândul piesei rotunde, rămas în română (fără diacritice)')
o('N02', T, ' "axul pe știftul {0}, {1}": "axis on stud {0}, {1}",', ' "axul pe știftul {0}, {1}": "axul pe stiftul {0}, {1}",', 'e2e', 'rândul piesei alese, rămas în română (fără diacritice)')
o('N03', A, 'return a ? tr`ax ${a[0]}, ${a[1]}, ${x.z}`', 'return a ? `ax ${a[0]}, ${a[1]}, ${x.z}`', 'e2e', 'rândul piesei rotunde, netrecut prin traducere')
o('N04', T, 'sit with their axis in the middle of a stud: a new one goes on the axis of the chosen one, and a fan rotor goes into its duct.',
  'sit with their axle in the middle of a stud: a new one goes on the axle of the chosen one, and a fan rotor goes into its duct.', 'e2e', 'textul vederii, cu „axle” (piesa) în loc de „axis”')
o('N05', T, ' "ax {0}, {1}, {2}": "axis {0}, {1}, {2}",', ' "ax {0}, {1}, {2}": "axis {1}, {0}, {2}",', 'e2e', 'rândul piesei rotunde în engleză, cu x și y schimbate')
o('N06', T, ' "axul pe știftul {0}, {1}": "axis on stud {0}, {1}",', ' "axul pe știftul {0}, {1}": "axle on stud {0}, {1}",', 'e2e', 'rândul piesei alese, cu „axle” (piesa) în loc de „axis”')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
