# Otrăvurile verificării din vederea „Modelul”, în engleză (felia 3.Cg, ADR 0284), 26.11.2026: semnele din listă, rândurile
# piesei alese, rezumatul și textul vederii se văd în engleză doar în cvs2 (traducerile n-au litere românești, deci probele
# dicționarului nu le judecă), deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză, care pune o roată
# deasupra alteia, pe un ax, și o coboară în ea); restul listei feliei e în `3.Cg.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'

o('N01', T, ' "plutește": "floats",', ' "plutește": "pluteste",', 'e2e', 'semnul „plutește”, rămas în română (fără diacritice)')
o('N02', T, ' "intră în alta": "goes into another",', ' "intră în alta": "floats",', 'e2e', 'cele două semne au același nume')
o('N03', T, ' "Prinsă de {0}.": "Held by {0}.",', ' "Prinsă de {0}.": "Goes into {0}.",', 'e2e', '„Prinsă de” spune „Goes into”')
o('N04', T, ' "Intră în {0}.": "Goes into {0}.",', ' "Intră în {0}.": "Held by {0}.",', 'e2e', '„Intră în” spune „Held by”')
o('N05', T, ' "Plutește: nu stă pe masă și nu e prinsă de nimic.": "Floats: it is not on the table and nothing holds it.",', ' "Plutește: nu stă pe masă și nu e prinsă de nimic.": "Floats: nothing holds it.",', 'e2e', 'rândul plutirii nu mai spune de masă')
o('N06', T, ' "Verificare: {0}.": "Check: {0}.",', ' "Verificare: {0}.": "Verificare: {0}.",', 'e2e', 'rezumatul, cu titlul rămas în română (fără diacritice)')
o('N07', T, ' "o piesă plutește": "one piece floats",', ' "o piesă plutește": "1 pieces float",', 'e2e', '„1 pieces float”')
o('N08', T, ' "{0} piese intră una în alta": "{0} pieces go into one another",', ' "{0} piese intră una în alta": "{0} pieces float",', 'e2e', 'rezumatul ciocnirilor spune „float”')
o('N09', T, ' "Verificare: nicio piesă nu plutește și niciuna nu intră în alta.": "Check: no piece floats and none goes into another.",', ' "Verificare: nicio piesă nu plutește și niciuna nu intră în alta.": "Check: no piece floats.",', 'e2e', 'rezumatul bun nu mai spune de ciocniri')
o('N10', T, ' "Toate piesele se țin între ele.": "All the pieces hold together.",', ' "Toate piesele se țin între ele.": "The model is in parts that do not hold together.",', 'e2e', '„toate se țin”, tradus pe dos')
o('N11', T, 'The model checks the pieces: it tells you which one floats (it is not on the table and nothing holds it) and which one goes into another. It is a warning: the piece stays where you put it.', 'The model checks the pieces: it tells you which one floats (it is not on the table and nothing holds it) and which one goes into another.', 'e2e', 'textul vederii nu mai spune că e doar un avertisment')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
