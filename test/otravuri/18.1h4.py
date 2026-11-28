# Lista de otrăvuri a feliei 18.1↑h-4 (cota segmentului mai ieftină și exactă; ADR 0323, 1a), 28.11.2026, alese de autor:
# marginea de jos a distanței pe blocuri, distanța exactă pe frunze, marginea copiilor și tăierea după rază
# (`cotaSegment`, `src/cam/reliefFinisare.ts`), prinse de `reliefFinisare.cota.test.ts` (forța brută, bit cu bit). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('K00', RF, "      // Frunza: valoarea, cu distanța exactă.", "      // Frunza: valoarea, cu distanța exactă. ", 'cota', 'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('K01', RF, "    const jos = Math.sqrt(ex * ex + ey * ey) - lh - 1e-9;", "    const jos = Math.sqrt(ex * ex + ey * ey) + lh - 1e-9;", 'cota',
  'jumătatea segmentului adunată, nu scăzută: marginea trece de distanța adevărată și taie frunze bune')
o('K02', RF, "    const jos = Math.sqrt(ex * ex + ey * ey) - lh - 1e-9;", "    const jos = Math.sqrt(ex * ex + ey * ey) - 1e-9;", 'cota',
  'jumătatea segmentului uitată: pe segmentele lungi, marginea e de la mijloc, deci taie frunzele de lângă capete')
o('K03', RF, "  const mx = (ax + bx) / 2, my = (ay + by) / 2, lh = Math.hypot(bx - ax, by - ay) / 2;",
  "  const mx = ax, my = ay, lh = Math.hypot(bx - ax, by - ay) / 2;", 'cota', 'marginea măsurată din capătul segmentului, nu din mijloc')
o('K04', RF, "      const v = F - urcare(f, d);", "      const v = F - uj;", 'cota', 'frunza ia valoarea din marginea de jos, nu din distanța exactă: cota iese prea sus')
o('K05', RF, "    for (let q = 0; q < n; q++) stiva.push(l - 1, copiiI[q]!, copiiJ[q]!, copiiF[q]! - u);",
  "    for (let q = 0; q < n; q++) stiva.push(l - 1, copiiI[q]!, copiiJ[q]!, copiiF[q]! - 2 * u);", 'cota',
  'marginea copiilor, cu urcarea de două ori: prea jos, taie copii buni')
o('K06', RF, "      if (fv - u <= m) continue;", "      if (fv - 2 * u <= m) continue;", 'cota', 'copiii tăiați cu urcarea de două ori, la pornire')
o('K07', RF, "    if (jos > R || F - uj <= m) continue;", "    if (jos > 0.9 * R || F - uj <= m) continue;", 'cota',
  'raza tăiată la 90 %: celulele de la marginea frezei nu mai contează')


# ---- Seturile ----
SETURI = {
    'cota': ['test/unit/reliefFinisare.cota.test.ts'],
}
E2E = []
