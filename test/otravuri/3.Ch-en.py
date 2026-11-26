# Otrăvurile construcțiilor, în engleză (felia 3.Ch, ADR 0284), 26.11.2026: numele implicit al unei construcții, butoanele,
# tabelul pieselor și nota timpului se văd în engleză doar în cvs2 (traducerile n-au litere românești, deci probele
# dicționarului nu le judecă), iar numele scris de om nu se traduce (`translate="no"`, în `limba.ts`); au setul lor e2e,
# `test/e2e/trenulet.spec.ts` (proba în engleză); restul listei feliei e în `3.Ch.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'extensii/trenulet/sursa/planificator/texte.en.json'
LB = 'extensii/trenulet/sursa/planificator/limba.ts'

o('N01', T, ' "Construcția {0}": "Build {0}",', ' "Construcția {0}": "Construction {0}",', 'e2e', 'numele implicit, alt cuvânt decât butoanele („Build”)')
o('N02', T, ' "Construcție nouă": "New build",', ' "Construcție nouă": "New",', 'e2e', 'butonul construcției noi spune doar „New”')
o('N03', T, ' "Dublează construcția": "Duplicate build",', ' "Dublează construcția": "Delete build",', 'e2e', '„Dublează” spune „Delete”')
o('N04', T, ' "Timp": "Time",', ' "Timp": "Timp",', 'e2e', 'capul coloanei timpului rămas în română (fără diacritice)')
o('N05', T, ' "Sigur?": "Sure?",', ' "Sigur?": "Sigur?",', 'e2e', 'întrebarea ștergerii rămasă în română (fără diacritice)')
o('N06', T, ' "Pune construcția în lista de printat": "Put the build in the print list",', ' "Pune construcția în lista de printat": "Put the model in the print list",', 'e2e', 'butonul spune „model”, nu „build”')
o('N07', T, 'below): it is approximate and leaves out heating up."', 'below): it is exact."', 'e2e', 'nota spune că timpul e exact')
NT = 'The time comes from the filament, at the printer’s average flow ({0} mm³/s,'
o('N08', T, NT, 'The time comes from the filament ({0} mm³/s,', 'e2e', 'nota nu mai spune de debitul imprimantei')
AO = "  const alOmului = (e: Element | null): boolean => !!e && !!e.closest('[translate=\"no\"]');"
o('N09', LB, AO, "  const alOmului = (e: Element | null): boolean => false;", 'e2e', 'numele scris de om se traduce („Roți” devine „Wheels”)')
o('N10', LB, "    if (n.parentElement && (FARA.has(n.parentElement.tagName) || alOmului(n.parentElement))) return;", "    if (n.parentElement && FARA.has(n.parentElement.tagName)) return;", 'e2e', 'textul unui element al omului se traduce')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
