# Lista de otrăvuri a feliei 18.1↑h-6 (finisarea în plan, cote pe loturi și mișcări; ADR 0323, planul liniilor pe workere),
# 28.11.2026, alese de autor: banda unui lot (raza cotei, marginile, rândul în sistemul reliefului), paritatea zigzagului într-un
# lot și banda punctului ales pentru marginea de jos a trecerilor (`src/cam/reliefFinisare.ts`), prinse de
# `reliefFinisare.loturi.test.ts` (loturile lipite = o bucată) și `reliefFinisare.puncte.test.ts`. Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('M00', RF, "/** Ce ține de geometria unui relief, fără câmp: destul pentru linii și pentru benzi (felia 18.1↑h-6). */",
  "/** Ce ține de geometria unui relief, fără câmp: destul pentru linii și pentru benzi (felia 18.1↑h-6).  */", 'loturi',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('M01', RF, "  const c = cota ?? cotaPe(pregatiteInJur(plan.geom, plan.so.cota.raza, xy), plan.o, plan.so);",
  "  const c = cota ?? cotaPe(pregatiteInJur(plan.geom, plan.o.freza.raza, xy), plan.o, plan.so);", 'loturi',
  'banda lotului după raza frezei, nu a cotei: la degroșare, cota e a frezei plate de rază R + adaos (greșeala găsită la scriere)')
o('M02', RF, "    let j0 = Math.max(0, Math.floor((lo - R) / g.h) - 1), j1 = Math.min(g.my, Math.ceil((hi + R) / g.h) + 1);",
  "    let j0 = Math.max(0, Math.floor(lo / g.h) - 1), j1 = Math.min(g.my, Math.ceil((hi + R) / g.h) + 1);", 'loturi',
  'banda fără raza frezei sub punctele lotului')
o('M03', RF, "    let j0 = Math.max(0, Math.floor((lo - R) / g.h) - 1), j1 = Math.min(g.my, Math.ceil((hi + R) / g.h) + 1);",
  "    let j0 = Math.max(0, Math.floor((lo - R) / g.h) - 1), j1 = Math.min(g.my, Math.ceil(hi / g.h) + 1);", 'loturi',
  'banda fără raza frezei deasupra punctelor lotului')
o('M04', RF, "        const v = c * (x[i]! - e) + d * (y[i]! - f);", "        const v = c * (x[i]! - e) + d * (y[i]! + f);", 'loturi',
  'rândul punctului în sistemul reliefului, cu mutarea pe dos: banda unui relief mutat e în altă parte')
o('M05', RF, "  const xy = ls.slice(k0, k1).map((pts, q) => inLume(g, k0 + q, pts));", "  const xy = ls.slice(k0, k1).map((pts, q) => inLume(g, q, pts));", 'loturi',
  'zigzagul unui lot numărat de la începutul lotului: un lot care începe pe o linie impară o parcurge pe dos')
o('M06', RF, "      const cota = cotaPe(pregatiteInJur(geom, so.cota.raza, [vec]), o, so);", "      const cota = cotaPe(pregatiteInJur(geom, 0, [vec]), o, so);", 'loturi',
  'banda punctului ales, fără raza frezei: vârful lui iese prea jos, deci marginea de jos a trecerilor refuză un program bun')


# ---- Seturile ----
SETURI = {
    'loturi': ['test/unit/reliefFinisare.loturi.test.ts', 'test/unit/reliefFinisare.puncte.test.ts'],
}
E2E = []
