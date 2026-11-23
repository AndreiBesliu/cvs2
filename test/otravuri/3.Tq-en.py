# Otrăvurile elicei în engleză (felia 3.Tq, ADR 0282), 23.11.2026: un text rămas în română fără diacritice („Ca LEGO 6041”) nu e
# recunoscut de probele dicționarului (traducerea există, n-are litere românești) și se vede doar în cvs2, în engleză, deci au
# setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care parcurge acum și fila Elice); restul listei feliei e în
# `3.Tq.py`, cu setul ei, mai scurt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "Ca LEGO 6041": "Like LEGO 6041",', ' "Ca LEGO 6041": "Ca LEGO 6041",', 'e2e', '„Ca LEGO 6041”, rămas în română')
o('N02', T, ' "Elice Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}": "Propeller Ø{0} with {1} blades, pitch {2}{3}{4}{5}{6}",',
  ' "Elice Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}": "Elice Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}",', 'e2e', 'numele elicei, rămas în română')
o('N03', T, ' ", stânga": ", left-hand",', ' ", stânga": ", right-hand",', 'e2e', '„stânga” tradus „right-hand” (sensul, pe dos în engleză)')
o('N04', A, 'const pl = d.paleta === "plata" ? tr(", plată") : "", s = d.sens === "stanga" ? tr(", stânga") : "",',
  'const pl = d.paleta === "plata" ? ", plată" : "", s = d.sens === "stanga" ? tr(", stânga") : "",', 'e2e', '„plată” din numele elicei, netrecut prin traducere')
o('N05', A, '<h2>Elice</h2>\n        <p class="mic">Elice pentru motoarele LEGO', '<h2>Elice </h2>\n        <p class="mic">Elice pentru motoarele LEGO', 'e2e',
  'titlul editorului, lipit de un spațiu (nodul de text nu mai e cheia „Elice”)')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
