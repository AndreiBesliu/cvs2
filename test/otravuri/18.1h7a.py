# Lista de otrăvuri a feliei 18.1↑h-7a (loturile ca cereri de sine stătătoare și finisarea din cote date; ADR 0323), 28.11.2026,
# alese de autor: decalajul rândurilor de relief ale unei benzi (în modelul exact și în câmpul pe 9 puncte), rândurile tăiate
# pentru un lot, banda dată câmpului în worker, granița ultimului lot și verificarea cotelor date (`src/cam/reliefFinisare.ts`),
# prinse de `reliefFinisare.cereri.test.ts`. Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('N00', RF, "/** Cotele unui lot (`CerereCote`), linie cu linie: ce face un worker al cotelor. */",
  "/** Cotele unui lot (`CerereCote`), linie cu linie: ce face un worker al cotelor.  */", 'cereri',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('N01', RF, """  // Cu `zj0`, `z` ține rândurile de la el încolo (o bandă): rândul global, minus începutul ei.
  const v = (i: number, j: number): number => z[(Math.min(ny - 1, Math.max(0, j)) - zj0) * nx + Math.min(nx - 1, Math.max(0, i))]!;""",
  """  // Cu `zj0`, `z` ține rândurile de la el încolo (o bandă): rândul global, minus începutul ei.
  const v = (i: number, j: number): number => z[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))]!;""", 'cereri',
  'modelul exact citește banda cu rândul global, fără începutul ei')
o('N02', RF, """  const F = new Float64Array(nx * (j1 - j0));
  const v = (i: number, j: number): number => z[(Math.min(ny - 1, Math.max(0, j)) - zj0) * nx + Math.min(nx - 1, Math.max(0, i))]!;""",
  """  const F = new Float64Array(nx * (j1 - j0));
  const v = (i: number, j: number): number => z[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))]!;""", 'cereri',
  'câmpul pe 9 puncte (q = 1) citește banda cu rândul global')
o('N03', RF, "        const r0 = Math.max(0, Math.floor(b.j0 / f) - 1), r1 = Math.min(g.r.ny, Math.ceil(b.j1 / f) + 2);",
  "        const r0 = Math.max(0, Math.floor(b.j0 / f)), r1 = Math.min(g.r.ny, Math.ceil(b.j1 / f) + 2);", 'cereri',
  'lotul primește un rând de relief prea puțin sub bandă')
o('N04', RF, "        const r0 = Math.max(0, Math.floor(b.j0 / f) - 1), r1 = Math.min(g.r.ny, Math.ceil(b.j1 / f) + 2);",
  "        const r0 = Math.max(0, Math.floor(b.j0 / f) - 1), r1 = Math.min(g.r.ny, Math.ceil(b.j1 / f));", 'cereri',
  'lotul primește rânduri de relief prea puține deasupra benzii')
o('N05', RF, "  const pregatite = c.reliefuri.map((r, q) => pregateste(r, c.benzi[q]));", "  const pregatite = c.reliefuri.map((r) => pregateste(r));", 'cereri',
  'workerul face câmpul pe tot relieful din rândurile benzii')
o('N06', RF, "    granite.push(ls.length);", "    granite.push(ls.length - 1);", 'cereri', 'ultimul lot pierde ultima linie')
o('N07', RF, "  if (date && date.length === linii.length && linii.every((l, q) => date[q]!.length === l.n)) {",
  "  if (date && date.length === linii.length) {", 'cereri', 'cotele date, luate fără să se verifice punctele fiecărei linii')


# ---- Seturile ----
SETURI = {
    'cereri': ['test/unit/reliefFinisare.cereri.test.ts'],
}
E2E = []
