# Lista de otrăvuri a feliei 18.1↑d-3 (pasul lateral aliniat, rotunjit în jos la celule întregi; ADR 0314), 26.11.2026, alese
# de autor: regula celulelor (`celuleAliniate`), refuzul celulei mai late decât freza și avertismentul rotunjirii. Fiecare
# trebuie prinsă de probele feliei, judecate pe oracolul 3D (creasta măsurată, distanța dintre liniile tăiate, citită din
# mișcări), în `reliefFinisare.test.ts` și `reliefDegrosare.test.ts`. Plus un martor, care nu schimbă nimic și trebuie să scape.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('R00', RF, "export function celuleAliniate(s: number, c: number): number {",
  "export function celuleAliniate(s: number, c: number): number {\n  void 0;", 'relief', 'martorul: o instrucțiune fără efect (trebuie să scape)')
o('R01', RF, "  return Math.max(1, Math.floor(s / c + 1e-9));", "  return Math.max(1, Math.round(s / c));", 'relief',
  'rotunjirea la cel mai apropiat număr de celule (cum era): 1,3 pe celula 0,5 dă 1,5, creasta peste cea cerută')
o('R02', RF, "  return Math.max(1, Math.floor(s / c + 1e-9));", "  return Math.max(1, Math.floor(s / c));", 'relief',
  'fără marja de virgulă mobilă: 0,3 / 0,1 dă două celule, nu trei')
o('R03', RF, "  return Math.max(1, Math.floor(s / c + 1e-9));", "  return Math.max(1, Math.ceil(s / c - 1e-9));", 'relief',
  'rotunjirea în sus: liniile mai rare decât cere omul')
o('R04', RF, "    if (l.aliniat && l.pas > 2 * R + EPS) {", "    if (false && l.aliniat && l.pas > 2 * R + EPS) {", 'relief',
  'fără refuzul celulei mai late decât freza: dungi netăiate între linii')
o('R05', RF, "    if (l.aliniat && l.pas > 2 * R + EPS) {", "    if (l.aliniat && l.pas > R + EPS) {", 'relief',
  'refuzul față de rază, nu de diametru: refuză și un pas bun (bila Ø3, o celulă de 2 mm)')
o('R06', RF, "    if (l.aliniat && l.pas > 2 * R + EPS) {", "    if (l.aliniat && !so.degrosare && l.pas > 2 * R + EPS) {", 'relief',
  'refuzul doar la finisare: degroșarea lasă dungile')
o('R07', RF, "      avertismente.push(l.pas > o.pasLateral", "      avertismente.push(l.pas < o.pasLateral", 'relief',
  'avertismentele inversate: „mărit” la o rotunjire în jos și invers')
o('R08', RF, "        : `pasul lateral, rotunjit în jos la ${k} ${k === 1 ? 'celulă' : 'celule'} ale reliefului: ${mm} mm`);",
  "        : `pasul lateral, rotunjit în jos la ${k + 1} ${k === 1 ? 'celulă' : 'celule'} ale reliefului: ${mm} mm`);", 'relief',
  'avertismentul spune alt număr de celule decât cele folosite')
o('R09', RF, "    if (ip === 0 && l.aliniat && Math.abs(l.pas - o.pasLateral) > 1e-9) {", "    if (ip === 0 && l.aliniat && Math.abs(l.pas - o.pasLateral) > 0.25) {",
  'relief', 'avertismentul tace când pasul s-a schimbat cu cel mult 0,25 mm (1,7 → 1,5)')
o('R10', RF, "    const k = celuleAliniate(o.pasLateral, c), s = k * c;", "    const k = celuleAliniate(o.pasLateral, c) + 1, s = k * c;", 'relief',
  'liniile cu o celulă mai rar decât regula')


# ---- Seturile ----
SETURI = {
    'relief': ['test/unit/reliefFinisare.test.ts', 'test/unit/reliefDegrosare.test.ts'],
}
