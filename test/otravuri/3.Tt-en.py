# Otrăvurile înclinării spre pupa în engleză (felia 3.Tt, ADR 0282), 24.11.2026: numele, eticheta și textul elicei de barcă
# în engleză se văd doar în cvs2 (traducerile n-au litere românești, deci probele dicționarului nu le judecă), deci au setul lor
# e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care parcurge și elicea de barcă); restul listei feliei e în `3.Tt.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' ", spre pupa {0}°": ", rake {0}°",', ' ", spre pupa {0}°": ", spre pupa {0}°",', 'e2e', '„spre pupa” din numele piesei, rămas în română')
o('N02', T, ' "Înclinarea spre pupa (°)": "Rake aft (°)",', ' "Înclinarea spre pupa (°)": "Inclinarea spre pupa (°)",', 'e2e', 'eticheta câmpului, rămasă în română (fără diacritice)')
o('N03', A, 'const pu = (d.pupa ?? 0) > 0 ? tr`, spre pupa ${d.pupa}°` : "";', 'const pu = (d.pupa ?? 0) > 0 ? `, spre pupa ${d.pupa}°` : "";', 'e2e', '„spre pupa” din numele piesei, netrecut prin traducere')
o('N04', T, 'Raked aft by {0}°: the bottom edge of the blade lifts off the bed, up to {1} mm at the tip.', 'Raked aft by {1}°: the bottom edge of the blade lifts off the bed, up to {0} mm at the tip.', 'e2e',
  'textul în engleză, cu unghiul și cât urcă vârful schimbate între ele')
o('N05', T, ' "Elice de barcă Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}{7}{8}": "Boat propeller Ø{0} with {1} blades, pitch {2}{3}{4}{5}{6}{7}{8}",',
  ' "Elice de barcă Ø{0} cu {1} palete, pasul {2}{3}{4}{5}{6}{7}{8}": "Boat propeller Ø{0} with {1} blades, pitch {2}{3}{4}{8}{6}{7}{5}",', 'e2e',
  'numele în engleză, cu înclinarea spre pupa și capacul schimbate între ele')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md; felia 3.Cm-1)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
