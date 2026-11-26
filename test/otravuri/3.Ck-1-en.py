# Lista de otrăvuri a feliei 3.Ck-1 în engleză (placa turnantă a atelierului Easy 3Draw; ADR 0284, partea B),
# 26.11.2026, alese de autor: textele editorului în engleză, în cvs2 (proba `trenulet.spec.ts`, pasul plăcii turnante).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "Placă turnantă": "Turntable",', ' "Placă turnantă": "Rotating plate",', 'e2e', 'numele piesei, altul')
o('N02', T, ' "Jocul pivotului (mm)": "Pivot clearance (mm)",', ' "Jocul pivotului (mm)": "Clearance (mm)",', 'e2e', 'câmpul jocului, fără pivot')
o('N03', T, '"The pivot is Ø{0} mm and the hole from the calibration Ø{1} mm: {2} mm all around."', '"The pivot is Ø{0} mm and the hole Ø{1} mm."', 'e2e', 'textul pivotului, fără jocul de jur împrejur')
o('N04', T, ' ", jocul {0}": ", clearance {0}",', ' ", jocul {0}": ", play {0}",', 'e2e', 'jocul din nume, alt cuvânt')
o('N05', T, ' "Fă placa turnantă": "Make the turntable",', ' "Fă placa turnantă": "Make",', 'e2e', 'butonul spune doar „Make”')
o('N06', T, ' "Partea de sus": "The top",', ' "Partea de sus": "Top part",', 'e2e', 'piesa de sus, altfel')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
