# Lista de otrăvuri a feliei 3.Ck-2 în engleză (balamaua atelierului Easy 3Draw; ADR 0284, partea B), 26.11.2026, alese
# de autor: textele editorului în engleză, în cvs2 (proba limbii din `trenulet.spec.ts`, pasul balamalei).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Balama": "Hinge",', ' "Balama": "Joint",', 'e2e', 'numele piesei, altul')
o('N02', T, ' "Balama {0}×{1}, ": "Hinge {0}×{1}, ",', ' "Balama {0}×{1}, ": "Hinge {1}×{0}, ",', 'e2e', 'numele, cu lungimea întâi')
o('N03', T, ' "Cu clema": "With the clip",', ' "Cu clema": "Clip",', 'e2e', 'butonul jumătății, altfel')
o('N04', T, ' "cu clema": "with the clip",', ' "cu clema": "with clip",', 'e2e', 'jumătatea din nume, altfel')
o('N05', T, ' "Jocul clemei (mm)": "Clip clearance (mm)",', ' "Jocul clemei (mm)": "Clearance (mm)",', 'e2e', 'câmpul jocului, fără clemă')
o('N06', T, '"The pin is Ø{0} mm and the clip from the calibration Ø{1} mm: {2} mm all around."', '"The pin is Ø{0} mm and the clip Ø{1} mm."', 'e2e', 'textul bolțului, fără jocul de jur împrejur')
o('N07', T, ' "Se pliază de la 110° în jos până la 130° în sus.": "It folds from 110° down to 130° up.",', ' "Se pliază de la 110° în jos până la 130° în sus.": "It folds.",', 'e2e', 'plierea, fără unghiuri')
o('N08', T, ' "Fă balamaua": "Make the hinge",', ' "Fă balamaua": "Make",', 'e2e', 'butonul spune doar „Make”')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
