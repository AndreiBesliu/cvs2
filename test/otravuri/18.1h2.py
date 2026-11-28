# Lista de otrăvuri a feliei 18.1↑h-2 (proba bătăilor; ADR 0310 §5, rândul 18.1↑h), 28.11.2026, alese de autor: așezarea
# liniilor finisării (`src/cam/reliefFinisare.ts`: centrele pe liniile aliniate, pasul în celule, liniile nealiniate la pasul
# uniform) și urcarea bilei, prinse de `relief3d.batai.oracol.test.ts` (CL-ul fiecărei linii pe hârtie, bătăile). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('B00', RF, "/** O linie a finisării: punctele ei, în sistemul reliefului (x, y alternate). */",
  "/** O linie a finisării: punctele ei, în sistemul reliefului (x, y alternate).  */", 'batai', 'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('B01', RF, "      for (let i = a; i <= b; i++) out.push((i + 0.5) * d);", "      for (let i = a; i <= b; i++) out.push((i + 0.6) * d);", 'batai',
  'liniile aliniate mutate cu o zecime de celulă: nu mai trec prin centre')
o('B02', RF, "    for (let q = 0; q < lat.length; q += k) alese.push(lat[q]!);",
  "    for (let q = 0; q < lat.length; q += q % 7 === 6 ? k + 1 : k) alese.push(lat[q]!);", 'batai',
  'pasul liniilor aliniate sare din când în când o celulă: faza se schimbă, deci apar bătăi')
o('B03', RF, "  const aliniat = !o.nealiniat && (o.unghi === 0 || o.unghi === 90);", "  const aliniat = o.unghi === 0 || o.unghi === 90;", 'batai',
  '„Nealiniat” ignorat la 0° și 90°: liniile trec tot prin centre')
o('B04', RF, "    const b = bmin + (k + 0.5) * s, px = b * vx, py = b * vy;", "    const b = bmin + (k + 0.5) * s * 1.02, px = b * vx, py = b * vy;", 'batai',
  'liniile nealiniate mai rare decât pasul spus (cu 2 %): bătăile au altă perioadă')
o('B05', RF, "  if (f.fel === 'bila') return f.raza - Math.sqrt(Math.max(0, f.raza * f.raza - r * r));",
  "  if (f.fel === 'bila') return f.raza - Math.sqrt(Math.max(0, f.raza * f.raza - 0.8 * r * r));", 'batai',
  'urcarea bilei prea mică: linia de pe vale coboară sub CL-ul de pe hârtie')


# ---- Seturile ----
SETURI = {
    'batai': ['test/unit/relief3d.batai.oracol.test.ts'],
}
E2E = []
