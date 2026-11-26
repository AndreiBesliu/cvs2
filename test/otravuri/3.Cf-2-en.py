# Otrăvurile orientării pe trei axe și ale jumătăților de pas, în engleză (felia 3.Cf-2, ADR 0284), 26.11.2026: butoanele,
# rândul piesei răsturnate și al celei dintre știfturi și textele vederii se văd în engleză doar în cvs2 (traducerile n-au
# litere românești, deci probele dicționarului nu le judecă), deci au setul lor e2e, `test/e2e/trenulet.spec.ts` (proba în
# engleză, care răstoarnă roata de 24 și o mută cu o jumătate de pas); restul listei feliei e în `3.Cf-2.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('N01', T, ' "Răstoarnă ↓": "Tip ↓",', ' "Răstoarnă ↓": "Rastoarna ↓",', 'e2e', 'butonul „Răstoarnă ↓”, rămas în română (fără diacritice)')
o('N02', T, ' "Răstoarnă →": "Tip →",', ' "Răstoarnă →": "Tip ↓",', 'e2e', 'cele două răsturnări au același nume')
o('N03', T, ' "Răstoarnă spre față": "Tip towards the front",', ' "Răstoarnă spre față": "Tip to the right",', 'e2e', 'numele butonului „Tip ↓” spune „to the right”')
o('N04', T, ' "Jumătăți de pas": "Half steps",', ' "Jumătăți de pas": "Jumatati de pas",', 'e2e', 'comutatorul, rămas în română (fără diacritice)')
o('N05', T, ' " · cu fața în jos": " · face down",', ' " · cu fața în jos": " · cu fata in jos",', 'e2e', 'piesa cu fața în jos, rămasă în română (fără diacritice)')
o('N06', T, ' " · cu partea de sus spre {0}": " · top side facing {0}",', ' " · cu partea de sus spre {0}": " · top side facing",', 'e2e', 'partea de sus își pierde direcția')
o('N07', T, ' " · între știfturi: x {0}, y {1}, z {2}": " · between studs: x {0}, y {1}, z {2}",', ' " · între știfturi: x {0}, y {1}, z {2}": " · between studs: x {1}, y {0}, z {2}",', 'e2e', 'locul dintre știfturi în engleză, cu x și y schimbate între ele')
o('N08', T, 'R rotates, X and Y tip the piece over, Delete removes.', 'R rotates, Delete removes.', 'e2e', 'rândul tastelor nu spune de X și Y')
o('N09', T, '“Half steps” moves by half a stud and half a plate, for Technic pieces.', '“Half steps” moves by half a stud, for Technic pieces.', 'e2e', 'textul vederii nu spune de jumătatea de placă')
o('N10', A, 'aria-label="${tr("Răstoarnă spre dreapta")}">Răstoarnă →</button>', 'aria-label="Rastoarna spre dreapta">Răstoarnă →</button>', 'e2e', 'numele butonului „Tip →”, netrecut prin traducere (fără diacritice)')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
