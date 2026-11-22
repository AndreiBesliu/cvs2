# Otrava căutării în limba paginii (felia 3.Tp↑a, ADR 0281 §4), 21.11.2026: potrivirea pe numele de pe ecran se vede doar în
# cvs2, în engleză („bevel” găsește Bevel gear și Double bevel gear), deci are setul ei e2e, `test/e2e/trenulet.spec.ts`
# (proba în engleză); restul listei feliei e în `3.Tpa.py`, cu setul ei, mai scurt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


A = 'extensii/trenulet/sursa/planificator/atelier.ts'

o('L01', A, 'const din = cuvinte(tr(n));', 'const din = cuvinte(n);', 'e2e',
  'potrivirea pe numele românesc, nu pe cel de pe ecran: în engleză, „bevel” nu găsește nimic')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
