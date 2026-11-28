# Lista de otrăvuri a feliei 18.1↑h-5 (câmpul conservativ și cota pe o bandă de rânduri; ADR 0323, 2a), 28.11.2026, alese de
# autor: rândurile benzii în câmp (nodurile pe două rânduri, câmpul pe 9 puncte la q = 1) și în cota segmentului (capetele,
# indiciul, cutia frunzei), în `src/cam/reliefFinisare.ts`, prinse de `reliefFinisare.banda.test.ts` (bandă = tot relieful,
# bit cu bit). Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('L00', RF, "    // Pe bandă, rândul local e cel global minus începutul benzii (cel de pe tot relieful, cu j0 = 0).",
  "    // Pe bandă, rândul local e cel global minus începutul benzii (cel de pe tot relieful, cu j0 = 0). ", 'banda',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('L01', RF, "    const i = Math.floor(x / h), j = Math.floor(y / h) - p.j0;", "    const i = Math.floor(x / h), j = Math.floor(y / h);", 'banda',
  'celula de sub capăt, luată cu rândul global pe bandă')
o('L02', RF, "    const i = p.ultima % F0.w, j = (p.ultima - i) / F0.w + p.j0;", "    const i = p.ultima % F0.w, j = (p.ultima - i) / F0.w;", 'banda',
  'indiciul de la segmentul dinainte, cu cutia pe rândul local')
o('L03', RF, "    const x0 = i * s, y0 = (p.j0 + j * k) * h, x1", "    const x0 = i * s, y0 = (j * k) * h, x1", 'banda',
  'cutia unei frunze pe bandă, fără începutul benzii')
o('L04', RF, "  for (let i = 0; i <= mx; i++) jos[i] = cotaModel(z, nx, ny, c, i * h, j0 * h);",
  "  for (let i = 0; i <= mx; i++) jos[i] = cotaModel(z, nx, ny, c, i * h, 0 * h);", 'banda',
  'nodurile primului rând al benzii, luate de pe primul rând al reliefului')
o('L05', RF, "    const t = jos; jos = sus; sus = t;", "", 'banda', 'nodurile nu se mută la rândul următor: tot câmpul din primele două rânduri')
o('L06', RF, "      F[(j - j0) * nx + i] = m;", "      F[j * nx + i] = m;", 'banda', 'câmpul pe 9 puncte (q = 1), scris pe rândul global în tabloul benzii')


# ---- Seturile ----
SETURI = {
    'banda': ['test/unit/reliefFinisare.banda.test.ts'],
}
E2E = []
