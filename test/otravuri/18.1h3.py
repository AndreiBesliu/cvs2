# Lista de otrăvuri a feliei 18.1↑h-3 (plafonul punctelor finisării, spus înaintea cotelor; ADR 0323, 5a), 28.11.2026, alese de
# autor: numărul punctelor de pe trecere, alegerea punctului, marginea de jos a trecerilor și verdictul de după cote
# (`src/cam/reliefFinisare.ts`), prinse de `reliefFinisare.puncte.test.ts`. Plus un martor.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RF = 'src/cam/reliefFinisare.ts'

o('H00', RF, "  /** Linia `k` a reliefului `ip`, în lume, în ordinea parcurgerii (zigzag: liniile impare, invers). */",
  "  /** Linia `k` a reliefului `ip`, în lume, în ordinea parcurgerii (zigzag: liniile impare, invers).  */", 'puncte',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('H01', RF, "    if (sus < -EPS && puncte * Math.ceil(-sus / o.pas - 1e-6) > PUNCTE_FINISARE_MAXIM) {", "    if (false) {", 'puncte',
  'refuzul timpuriu scos: verdictul vine iar după cote (minute la 4000²)')
o('H02', RF, "    if (sus < -EPS && puncte * Math.ceil(-sus / o.pas - 1e-6) > PUNCTE_FINISARE_MAXIM) {",
  "    if (sus < -EPS && puncte * (Math.ceil(-sus / o.pas - 1e-6) + 1) > PUNCTE_FINISARE_MAXIM) {", 'puncte',
  'marginea de jos cu o trecere în plus: refuză un program care încape în plafon')
o('H03', RF, "          if (d < bd) { bd = d; bk = k; bq = q; }", "          if (bk < 0) { bd = d; bk = k; bq = q; }", 'puncte',
  'punctul ales e primul de pe prima linie (lângă perete), nu cel de lângă cea mai joasă celulă: marginea nu mai ajunge')
o('H04', RF, "          if (d < cd) { cd = d; cx = (i + 0.5) * p.r.celula; cy = (j + 0.5) * p.r.celula; }",
  "          if (cd === Infinity) { cd = d; cx = (i + 0.5) * p.r.celula; cy = (j + 0.5) * p.r.celula; }", 'puncte',
  'prima celulă cea mai joasă, nu cea din mijlocul lor: pe fundul plat, lângă pantă, marginea de jos nu mai e strânsă')
o('H05', RF, "  if (puncte * n > PUNCTE_FINISARE_MAXIM) return { ok: false, motiv:", "  if (false) return { ok: false, motiv:", 'puncte',
  'verdictul de după cote scos: acolo unde marginea de jos nu ajunge, programul trece de plafon')
o('H06', RF, "    for (const pts of l.linii) puncte += pts.length / 2;", "    for (const pts of l.linii) puncte += 1;", 'puncte',
  'punctele numărate pe linie, nu pe punct: plafonul nu mai prinde nimic')


# ---- Seturile ----
SETURI = {
    'puncte': ['test/unit/reliefFinisare.puncte.test.ts'],
}
E2E = []
