# Lista de otrăvuri a feliei 18.1↑h-8 (bazinul cotelor; ADR 0323, planul liniilor pe workere), 28.11.2026, alese de autor:
# ordinea loturilor la lipire, cotele date programului, pragul, anularea în timpul bazinului, câte loturi face planul
# (`src/jobs/bazinCam.ts`, `src/cam/job.ts`, `src/jobs/calculCam.ts`), prinse de `bazinCote.test.ts`. Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


BZ = 'src/jobs/bazinCam.ts'
JB = 'src/cam/job.ts'
CC = 'src/jobs/calculCam.ts'

o('P00', BZ, "/** Tablourile unei cereri de cote, de transferat (punctele liniilor și rândurile de relief). */",
  "/** Tablourile unei cereri de cote, de transferat (punctele liniilor și rândurile de relief).  */", 'bazin',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('P01', BZ, "      cote.set(cheie, z.flat());", "      cote.set(cheie, z.reverse().flat());", 'bazin',
  'loturile lipite pe dos: cotele nu mai sunt ale liniilor lor')
o('P02', JB, "  const cu = cote ? { cote } : {};", "  const cu = {};", 'bazin',
  'programul ignoră cotele date (le socotește singur): bazinul lucrează degeaba')
o('P03', BZ, "    return puncteRelief(document) >= (o.pragCote ?? PRAG_COTE);", "    return puncteRelief(document) < (o.pragCote ?? PRAG_COTE);", 'bazin',
  'pragul pe dos: bazinul lucrează pe reliefurile mici și nu pe cele mari')
o('P04', BZ, "    if (e instanceof CalculAnulat) throw e;", "", 'bazin',
  'o anulare în timpul bazinului e luată drept o cădere (echivalentă: pasul următor verifică semnalul și se oprește tot, cu `CalculAnulat`)')
o('P05', CC, "  return { loturi: planuriRelief(doc, reliefuri).map(({ cheie, plan }) => ({ cheie, cereri: loturiCote(plan, fire) })) };",
  "  return { loturi: planuriRelief(doc, reliefuri).map(({ cheie, plan }) => ({ cheie, cereri: loturiCote(plan, 1) })) };", 'bazin',
  'planul face un singur lot, oricâte workere ar fi')


# ---- Seturile ----
SETURI = {
    'bazin': ['test/unit/bazinCote.test.ts'],
}
E2E = []
