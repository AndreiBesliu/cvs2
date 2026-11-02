# Lista de otrăvuri a feliei 4.9↑ (fișa plăcii 4 și placa de regresie), 02.11.2026, alese de autor: geometria șanțurilor
# de calibrare (adâncimea fiecărei freze, raza canalului, sensul arcului, plonjarea). Fiecare trebuie prinsă de cotele
# prezise de oracolul simulării (setul „placa4”), nu de proba de aur, care cade la orice schimbare a programelor. Plus un
# martor, care nu schimbă nimic și trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PG = 'test/placi/placa-04/genereaza.ts'

o('Q00', PG, 'export const SANT_X = [20, 80] as const;', 'export const SANT_X = [20, 80] as const;\nconst NEFOLOSIT = 1;', 'placa4',
  'martorul: o constantă nefolosită (trebuie să scape)')
o('Q01', PG, 'plata: { y: 100, z: -3 }', 'plata: { y: 100, z: -2.8 }', 'placa4', 'șanțul plat la 2,8 mm (fișa spune 3,00 ±0,1)')
o('Q02', PG, 'export const CERC = { centru: { x: 140, y: 70 }, raza: 25, z: -1 } as const;',
  'export const CERC = { centru: { x: 140, y: 70 }, raza: 25.3, z: -1 } as const;', 'placa4', 'canalul pe raza 25,3 (Ø56,6 / Ø44,6)')
o('Q03', PG, "{ tip: 'arc', la: { X: c.x + r, Y: c.y }, centru: c, sens: 'trigonometric', avans: REGIM.avans },",
  "{ tip: 'arc', la: { X: c.x + r, Y: c.y }, centru: c, sens: 'orar', avans: REGIM.avans },", 'placa4', 'arcul în G2, nu în G3')
o('Q04', PG, 'export const PLONJARE = { x: 20, y: 15, z: -5 } as const;', 'export const PLONJARE = { x: 20, y: 15, z: -4.8 } as const;',
  'placa4', 'plonjarea la 4,8 mm')
o('Q05', PG, 'bila: { y: 80, z: -2 }', 'bila: { y: 80, z: -2.2 }', 'placa4', 'bila la 2,2 mm (lățimea 5,78: în toleranță; adâncimea, nu)')
o('Q06', PG, 'v90: { y: 60, z: -2 }', 'v90: { y: 60, z: -1.9 }', 'placa4', 'V90 la 1,9 mm (lățimea 3,8)')
o('Q07', PG, 'v60: { y: 40, z: -2 }', 'v60: { y: 40, z: -1.8 }', 'placa4', 'V60 la 1,8 mm (lățimea 2,08)')


# ---- Seturile ----
SETURI = {
    'placa4': ['test/unit/placa04.test.ts'],
    'placa42': ['test/unit/placa04.test.ts', 'test/unit/placa04.aur.test.ts'],
}
