# Otrăvurile ventilatorului în engleză (felia 3.Ts, ADR 0282), 24.11.2026: un text rămas în română fără diacritice („Rotorul”,
# „Carcasa”, „Inelul:”, „Cu inel”, „Două”) nu e recunoscut de probele dicționarului (traducerea există, n-are litere
# românești) și se vede doar în cvs2, în engleză, deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care
# parcurge și ventilatorul); restul listei feliei e în `3.Ts.py`, cu setul ei, mai scurt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "Rotorul": "The rotor",', ' "Rotorul": "Rotorul",', 'e2e', '„Rotorul”, rămas în română')
o('N02', T, ' "Carcasa": "The duct",', ' "Carcasa": "Carcasa",', 'e2e', '„Carcasa”, rămas în română')
o('N03', T, ' "Inelul:": "Ring:",', ' "Inelul:": "Inelul:",', 'e2e', '„Inelul:”, rămas în română')
o('N04', T, ' "Cu inel": "With ring",', ' "Cu inel": "Cu inel",', 'e2e', '„Cu inel”, rămas în română')
o('N05', T, ' ", cu inel": ", with ring",', ' ", cu inel": ", cu inel",', 'e2e', '„cu inel” din numele piesei, rămas în română')
o('N06', T, ' "Două": "Two",', ' "Două": "Doua",', 'e2e', '„Două” (fără diacritice), rămas în română')
o('N07', A, 'const s = d.sens === "stanga" ? tr(", stânga") : "", i = d.inel === "da" ? tr(", cu inel") : "";',
  'const s = d.sens === "stanga" ? tr(", stânga") : "", i = d.inel === "da" ? ", cu inel" : "";', 'e2e', '„cu inel” din numele piesei, netrecut prin traducere')
o('N08', T, ' "Rotor de ventilator Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}{7}": "Fan rotor Ø{0} with {1} blades, pitch {2}{3}{4}{5}{6}{7}",',
  ' "Rotor de ventilator Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}{7}": "Fan rotor Ø{0} with {1} blades, pitch {2}{3}{4}{5}{7}{6}",', 'e2e',
  'numele în engleză, cu gaura și inelul schimbate între ele')
o('N09', T, 'The duct: Ø{9} inside, Ø{10} outside, {11} mm tall;', 'The duct: Ø{10} inside, Ø{9} outside, {11} mm tall;', 'e2e',
  'textul în engleză, cu diametrele carcasei schimbate între ele')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md; felia 3.Cm-1)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
