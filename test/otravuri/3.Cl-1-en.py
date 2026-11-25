# Otrăvurile decorațiunilor de Crăciun, în engleză (felia 3.Cl-1, ADR 0285), 25.11.2026: cuvintele fără diacritice ale
# editoarelor („Etaje”, „Inel”, „Contur”, „Clasic”, „Simplu”, „Gol”, „Stea”) se văd în engleză doar în cvs2, iar proba de
# română nu le recunoaște, deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care trece prin fila
# „Crăciun”); restul listei feliei e în `3.Cl-1.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "Brăduț": "Christmas tree",', ' "Brăduț": "Tree",', 'e2e', 'titlul editorului bradului, cu alt cuvânt')
o('N02', T, ' "Etaje": "Tiers",', ' "Etaje": "Etaje",', 'e2e', 'câmpul etajelor, rămas în română')
o('N03', T, ' "Inel": "Ring",', ' "Inel": "Inel",', 'e2e', 'agățătoarea „Inel”, rămasă în română')
o('N04', T, ' "Contur": "Outline",', ' "Contur": "Contur",', 'e2e', 'felul „Contur”, rămas în română')
o('N05', T, ' "Clasic": "Classic",', ' "Clasic": "Clasic",', 'e2e', 'fulgul „Clasic”, rămas în română')
o('N06', T, ' "Simplu": "Plain",', ' "Simplu": "Simplu",', 'e2e', 'fulgul „Simplu”, rămas în română')
o('N07', T, ' "Gol@miez": "Hollow",', ' "Gol@miez": "Empty",', 'e2e', 'miezul gol, numit ca un loc gol')
o('N08', A, '["gol", tr("Gol", "miez")]', '["gol", "Gol"]', 'e2e', 'miezul gol își pierde contextul: e tradus ca „gol” de altundeva')
o('N09', T, ' "Stea": "Star",', ' "Stea": "Stea",', 'e2e', 'steaua, rămasă în română')
o('N10', T, ' "De agățat": "Hanging",', ' "De agățat": "To hang",', 'e2e', 'bradul de agățat, cu alt text')
o('N11', T, ' "Alt fulg": "Another snowflake",', ' "Alt fulg": "Alt fulg",', 'e2e', 'butonul „Alt fulg”, rămas în română')
o('N12', T, ' "Marginea are {0} mm, iar mijlocul, {1} mm.": "The edge is {0} mm high and the centre, {1} mm.",', ' "Marginea are {0} mm, iar mijlocul, {1} mm.": "The edge is {1} mm high and the centre, {0} mm.",', 'e2e', 'marginea și mijlocul stelei în relief, schimbate între ele')
o('N13', T, ' "Fulg Ø{0}, fără ramuri": "Snowflake Ø{0}, no branches",', ' "Fulg Ø{0}, fără ramuri": "Snowflake Ø{0}",', 'e2e', 'numele fulgului fără ramuri nu spune că n-are')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
