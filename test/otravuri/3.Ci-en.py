# Lista de otrăvuri a feliei 3.Ci în engleză (construcțiile gata ale atelierului Easy 3Draw; ADR 0284, partea E),
# 26.11.2026, alese de autor: textele panoului „Construcții gata” în engleză, în cvs2 (proba `trenulet.spec.ts`, pasul
# construcțiilor gata). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
LG = 'extensii/trenulet/sursa/lego/lego.ts'

o('N01', T, ' "Construcții gata": "Ready-made builds",', ' "Construcții gata": "Ready builds",', 'e2e', 'titlul panoului, altul')
o('N02', T, ' "Fă construcția": "Make the build",', ' "Fă construcția": "Make",', 'e2e', 'butonul spune doar „Make”')
o('N03', T, ' "Cutie de angrenaje": "Gearbox",', ' "Cutie de angrenaje": "Gear box",', 'e2e', 'felul cutiei, scris altfel')
o('N04', T, '"Between the axles: {0} mm; between the wheels on an axle: {1} mm."', '"Between the axles: {0} mm."', 'e2e', 'ce iese pe hârtie, fără distanța dintre roți')
o('N05', T, ' "„{0}” e în model.": "“{0}” is in the model.",', ' "„{0}” e în model.": "The build is in the model.",', 'e2e', 'mesajul nu spune construcția')
o('N06', LG, 'const zecimal = (x: number) => String(x).replace(".", Limba.zecimal);', 'const zecimal = (x: number) => String(x).replace(".", ",");', 'e2e', 'avertismentul roților, cu virgulă în engleză')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
