# Otrăvurile alipirii din vederea „Modelul”, în engleză (felia 3.Cf-1, ADR 0284), 25.11.2026: numele prinderilor, ținta,
# rândul piesei prinse și al celei libere, butoanele și mesajul se văd în engleză doar în cvs2 (traducerile n-au litere
# românești, deci probele dicționarului nu le judecă), deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în engleză,
# care alipește un ax în gaura roții de 24); restul listei feliei e în `3.Cf-1.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "prinsă": "attached",', ' "prinsă": "prinsa",', 'e2e', 'rândul din listă al piesei prinse, rămas în română (fără diacritice)')
o('N02', T, ' "liberă": "free",', ' "liberă": "libera",', 'e2e', 'rândul din listă al piesei libere, rămas în română (fără diacritice)')
o('N03', T, ' "Alipește în model": "Attach in the model",', ' "Alipește în model": "Put in the model",', 'e2e', 'butonul piesei, cu o țintă aleasă, spune tot „Put in the model”')
o('N04', T, ' "capăt de ax": "axle end",', ' "capăt de ax": "axle",', 'e2e', 'capătul axului, numit ca piesa')
o('N05', T, ' "capete de ax": "axle ends",', ' "capete de ax": "axles",', 'e2e', 'capetele axului, numite ca piesele')
o('N06', T, ' "prinsă de {0} ({1} ↔ {2})": "attached to {0} ({1} ↔ {2})",', ' "prinsă de {0} ({1} ↔ {2})": "attached to {0} ({2} ↔ {1})",', 'e2e', 'rândul piesei prinse în engleză, cu prinderile schimbate între ele')
o('N07', T, ' " · glisată {0} mm": " · slid {0} mm",', ' " · glisată {0} mm": " · glisata {0} mm",', 'e2e', 'glisarea, rămasă în română (fără diacritice)')
o('N08', T, ' "Desprinde": "Detach",', ' "Desprinde": "Desprinde",', 'e2e', 'butonul „Desprinde”, rămas în română')
o('N09', A, '<p class="mic" id="at-m-tinta">${tr`Ținta: ${numePrindere(pr, tinta.k)}.', '<p class="mic" id="at-m-tinta">${`Tinta: ${numePrindere(pr, tinta.k)}.', 'e2e', 'rândul țintei, netrecut prin traducere (fără diacritice)')
o('N10', T, 'has no connection for “{1}”: the piece sits on top, not attached.', 'has no connection for “{1}”: the piece sits on top.', 'e2e', 'mesajul piesei fără prindere potrivită nu spune că nu e alipită')
o('N11', T, ' "liberă, colțul cutiei la {0}, {1}, {2} mm": "free, box corner at {0}, {1}, {2} mm",', ' "liberă, colțul cutiei la {0}, {1}, {2} mm": "libera, coltul cutiei la {0}, {1}, {2} mm",', 'e2e', 'rândul piesei libere, rămas în română (fără diacritice)')
o('N12', T, 'the next piece attaches there and stays linked to it, so it follows when you move it.', 'the next piece attaches there.', 'e2e', 'textul vederii nu spune că piesa rămâne legată')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
