# A doua listă a feliei 3.Xi-1 (ADR 0232 §A.4): fereastra refuzului unui pachet de la o adresă, probată de
# `extensii.spec.ts` (restul feliei e în `3.Xi-1.py`, pe `extensii.stari.spec.ts`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


IN = 'src/extensii/Instalare.tsx'

o('I06', IN, "onClick={() => { setPas({ fel: 'adresa' }); }}", "onClick={renunta}", 'e2e',
  '„Altă adresă…” doar închide fereastra')
o('I11', IN, "<p className=\"confirmare-sursa\" data-testid=\"extensii-refuz-sursa\">{deLaAdresa ? adresa : cerere.fisier.name}</p>", "", 'e2e',
  'refuzul unui pachet de la o adresă nu mai spune adresa')

SETURI = {}
E2E = ['test/e2e/extensii.spec.ts']
