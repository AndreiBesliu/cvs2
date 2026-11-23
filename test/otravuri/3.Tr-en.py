# Otrăvurile elicei de barcă în engleză (felia 3.Tr, ADR 0282), 23.11.2026: un text rămas în română fără diacritice („Capacul:”,
# „Cu capac”) nu e recunoscut de probele dicționarului (traducerea există, n-are litere românești) și se vede doar în cvs2, în
# engleză, deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care parcurge și elicea de barcă); restul
# listei feliei e în `3.Tr.py`, cu setul ei, mai scurt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "Capacul:": "Cap:",', ' "Capacul:": "Capacul:",', 'e2e', '„Capacul:”, rămas în română')
o('N02', T, ' "Cu capac": "With cap",', ' "Cu capac": "Cu capac",', 'e2e', '„Cu capac”, rămas în română')
o('N03', T, ' ", cu capac": ", with cap",', ' ", cu capac": ", cu capac",', 'e2e', '„cu capac” din numele piesei, rămas în română')
o('N04', A, 'const s = d.sens === "stanga" ? tr(", stânga") : "", c = d.capac === "da" ? tr(", cu capac") : "";',
  'const s = d.sens === "stanga" ? tr(", stânga") : "", c = d.capac === "da" ? ", cu capac" : "";', 'e2e', '„cu capac” din numele piesei, netrecut prin traducere')
o('N05', T, ' "Elice de barcă Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}{7}": "Boat propeller Ø{0} with {1} blades, pitch {2}{3}{4}{5}{6}{7}",',
  ' "Elice de barcă Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}{7}": "Boat propeller Ø{0} with {1} blades, pitch {2}{3}{4}{5}{7}{6}",', 'e2e',
  'numele în engleză, cu gaura și capacul schimbate între ele')
o('N06', T, 'The blades cover {4}% of the disc; the hub is Ø{5} × {6} mm.', 'The blades cover {4}% of the disc; the hub is Ø{6} × {5} mm.', 'e2e',
  'textul în engleză, cu diametrul și înălțimea butucului schimbate între ele')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
