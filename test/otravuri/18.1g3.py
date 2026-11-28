# Lista de otrăvuri a feliei 18.1↑g-3 (simularea salvată ca strat; ADR 0322 §5.4), 28.11.2026, alese de autor: citirea
# simulării pe grila reliefului (`src/relief/dinSimulare.ts`: centrele celulelor, matricea, pixelul pe blocuri, fereastra, dz),
# cererea workerului reliefului (`src/jobs/calculRelief.ts`: dz din planul zero sau din compus), prinse de
# `relief.simulare.test.ts`; stratul nou (ascuns, „înlocuiește”; `src/model/straturiRelief.ts`, `src/app/reliefSimulare.ts`),
# prins de `relief.simulare.spec.ts`. Plus un martor. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DS = 'src/relief/dinSimulare.ts'
CR = 'src/jobs/calculRelief.ts'
SR = 'src/model/straturiRelief.ts'
AS = 'src/app/reliefSimulare.ts'

o('S00', DS, "/** Fereastra simulată: colțul stânga-jos, celula nucleului, blocul (pixelul = `bloc` × `bloc` celule), pixelii, rândul 0 jos. */",
  "/** Fereastra simulată: colțul stânga-jos, celula nucleului, blocul (pixelul = `bloc` × `bloc` celule), pixelii, rândul 0 jos.  */", 'unit',
  'martorul: un spațiu într-un comentariu (trebuie să scape)')
o('S01', DS, "(s.z[py * s.latime + px] ?? NaN) - dz : NaN;", "(s.z[py * s.latime + px] ?? NaN) + dz : NaN;", 'unit',
  'dz cu semnul greșit: stratul iese sub (sau peste) tăietură cu de două ori planul zero')
o('S02', DS, "      const x = (i + 0.5) * g.celula;", "      const x = i * g.celula;", 'unit',
  'colțul celulei în loc de centru: la un relief rotit, celula ia pixelul vecin')
o('S12', DS, "    const y = (j + 0.5) * g.celula;", "    const y = j * g.celula;", 'unit',
  'colțul celulei în loc de centru, pe y')
o('S03', DS, "py = Math.floor((m.b * x + m.d * y + m.f - s.y0) / pas);", "py = Math.floor((m.d * x + m.b * y + m.f - s.y0) / pas);", 'unit',
  'matricea aplicată pe dos: la un relief rotit, celulele iau pixelii oglindiți')
o('S04', DS, "  const out = new Float32Array(g.nx * g.ny), pas = s.celula * s.bloc;", "  const out = new Float32Array(g.nx * g.ny), pas = s.celula;", 'unit',
  'pixelul simulării pe blocuri luat cât o celulă: la blocul 2, celulele iau pixelii de la dublul distanței')
o('S05', DS, "px >= 0 && px < s.latime && py >= 0 && py < s.inaltime ?", "px >= 0 && py >= 0 && py < s.inaltime ?", 'unit',
  'fără marginea din dreapta a ferestrei: celula din afara ei ia pixelul din rândul de deasupra')
o('S06', DS, "  if (planZero !== undefined) return -planZero;", "  if (planZero !== undefined) return planZero;", 'unit',
  'planul zero cu semnul greșit')
o('S07', CR, "    dz = dzRelief(undefined, compus);", "    dz = dzRelief(undefined, []);", 'unit',
  'fără plan zero, vârful compusului nu mai e la fața plăcii (dz 0)')
o('S08', CR, "  if (c.planZero !== undefined) dz = dzRelief(c.planZero, []);", "  if (c.planZero !== undefined) dz = dzRelief(undefined, []);", 'unit',
  'planul zero dat de lucrare ignorat')
o('S09', SR, "mod: nou.mod ?? 'aduna', vizibil: nou.vizibil ?? true,", "mod: nou.mod ?? 'aduna', vizibil: true,", 'e2e',
  'stratul din simulare iese vizibil: schimbă pe loc ce se taie')
o('S10', AS, "  const nou = cuStratNou(f, { dale: s.amprenta, nume, mod: 'inlocuieste', vizibil: false });",
  "  const nou = cuStratNou(f, { dale: s.amprenta, nume, mod: 'aduna', vizibil: false });", 'e2e',
  'stratul din simulare „adună” în loc de „înlocuiește”: arătat, se adună peste model')
o('S11', AS, "  if (!p.ok) return { ok: false, fel: 'refuz', motiv: p.motiv };", "  if (!p.ok) return { ok: false, fel: 'eroare' };", 'e2e',
  'refuzul lucrării (nimic de tăiat) spus ca un defect, fără motiv')


# ---- Seturile ----
SETURI = {
    'unit': ['test/unit/relief.simulare.test.ts'],
    'e2e': [],
}
E2E = ['test/e2e/relief.simulare.spec.ts']
