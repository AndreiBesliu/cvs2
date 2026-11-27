# Lista de otrăvuri a feliei 16.A↑e-1 (freza toroidală: documentul v31, simularea, oracolul, refuzul lucrării; ADR 0303),
# 26.11.2026, aleasă de autor: silueta și linia înclinată din nucleu (minimul convex prin înjumătățire), refuzurile simulării
# (raza colțului, elicea), oracolul cu h pe hârtie, ușa v31 (forma, raza sub Ø / 2, migrarea v30 → v31), refuzul lucrării pe
# orice operație și rândul ferestrei exportului (o freză pe care copia ferestrei n-o poartă n-are rând). Se rulează cu
# `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o
# dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NU = 'src/sim/nucleu.ts'
PR = 'src/sim/program.ts'
OS = 'test/oracles/simulare.ts'
SD = 'src/model/schemaDocument.ts'
MG = 'src/model/migrari.ts'
FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'

# ── Nucleul simulării ──────────────────────────────────────────────────────────────────────────────────────────────
o('S01', NU, "  if (f.tip === 'toroidala') return { fel: 3, R, R2: R * R, k: 0, a: R - f.raza, rho: f.raza };",
  "  if (f.tip === 'toroidala') return { fel: 3, R, R2: R * R, k: 0, a: R - 2 * f.raza, rho: f.raza };", 'sim',
  'discul plat al toroidalei mai mic cu raza colțului')
o('S02', NU, "    if (d <= T.a) return 0;\n    const e = d - T.a, q = T.rho * T.rho - e * e;\n    return T.rho",
  "    const e = d - T.a, q = T.rho * T.rho - e * e;\n    return T.rho", 'sim', 'toroidala fără disc plat: fundul ei e rotund ca al bilei')
o('S03', NU, "    const e = d - T.a, q = T.rho * T.rho - e * e;\n    return T.rho - Math.sqrt(q > 0 ? q : 0);",
  "    const e = d, q = T.rho * T.rho - e * e;\n    return T.rho - Math.sqrt(q > 0 ? q : 0);", 'sim', 'sfertul de cerc pornit din axă, nu de la marginea discului')
o('S04', NU, "    return Math.min(T.R, T.a + Math.sqrt(q > 0 ? q : 0));", "    return Math.min(T.R, T.a);", 'sim',
  'raza tăiată la o adâncime mai mică decât raza colțului: doar discul plat (celulele de pe sfert, sărite)')
o('S05', NU, "  if (m === 0) return sa > 0 ? sa : sb < 0 ? sb : 0;", "  if (m === 0) return 0;", 'sim',
  'linia orizontală cu toroidala: minimul luat în afara bucății care acoperă celula')
o('S06', NU, "    if (deriv(mij) < 0) lo = mij; else hi = mij;", "    if (deriv(mij) < 0) hi = mij; else lo = mij;", 'sim',
  'înjumătățirea în sensul greșit: maximul derivatei, nu rădăcina ei')
o('S07', NU, "  if (deriv(sa) >= 0) return sa;", "  if (deriv(sa) >= 0) return sb;", 'sim', 'derivata pozitivă de la început: capătul greșit')
o('S08', NU, "const PASI_TOROIDALA = 64;", "const PASI_TOROIDALA = 3;", 'sim', 'înjumătățirea cu prea puțini pași: minimul greșit cu sute de microni')
o('S09', NU, "    return m + (e / Math.sqrt(q)) * (s / d);", "    return m + e / Math.sqrt(q);", 'sim',
  'derivata fără s / d: semnul ei greșit înaintea proiecției celulei')
o('S10', NU, "          zs = az + dz * tp + m * sv + H(T, Math.sqrt(sv * sv + perp2));",
  "          zs = az + dz * tp + m * sv + H(T, Math.sqrt(perp2));", 'sim', 'h socotit în proiecția celulei, nu în punctul minimului')
o('S11', PR, "  if (forma?.tip === 'toroidala' && !(Number.isFinite(forma.raza) && forma.raza > 0 && forma.raza < diametru / 2)) {",
  "  if (forma?.tip === 'toroidala' && !(Number.isFinite(forma.raza) && forma.raza > 0 && forma.raza <= diametru / 2)) {", 'sim',
  'raza colțului cât jumătatea diametrului primită de simulare')
o('S12', PR, "      if (z !== nz && forma.tip !== 'plata' && !inAer) {", "      if (z !== nz && forma.tip !== 'plata' && forma.tip !== 'toroidala' && !inAer) {",
  'sim', 'elicea cu toroidala trece de program (nucleul n-o știe)')

# ── Oracolul simulării (judecătorul: o greșeală a lui cade pe nucleul corect) ───────────────────────────────────────
o('S13', OS, "      return { raza: R, h: (r) => (r <= a ? 0 : rho * (1 - Math.cos(Math.asin(Math.min(1, (r - a) / rho))))) };",
  "      return { raza: R, h: (r) => (r <= a ? 0 : rho * (1 - Math.cos(Math.asin(Math.min(1, r / R))))) };", 'sim',
  'oracolul: sfertul de cerc al toroidalei scris ca bila')
o('S14', OS, "  if (s.tip === 'toroidala' && !(s.raza > 0 && s.raza < s.diametru / 2)) {", "  if (s.tip === 'toroidala' && !(s.raza > 0)) {", 'sim',
  'oracolul primește raza colțului peste jumătatea diametrului')

# ── Ușa documentului v31 ──────────────────────────────────────────────────────────────────────────────────────────
o('D01', SD, "    v.looseObject({ tip: v.literal('toroidala'), raza: pozitiv(PLAFON.diametruScula) }),\n", '', 'doc', 'toroidala refuzată de ușă')
o('D02', SD, "v.forward(v.check((s) => s.forma?.tip !== 'toroidala' || s.forma.raza < s.diametru / 2,",
  "v.forward(v.check((s) => s.forma?.tip !== 'toroidala' || s.forma.raza <= s.diametru / 2,", 'doc',
  'raza colțului cât jumătatea diametrului primită (a doua scriere a bilei)')
o('D03', MG, "        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'toroidala') {", "        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'toroidală') {",
  'doc', 'un v30 cu o freză toroidală migrat pe tăcute la v31')
o('D04', MG, "      for (const [cale, s] of frezeOperatieBrute(o)) {\n        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'toroidala') {",
  "      for (const [cale, s] of frezeOperatieBrute(o).slice(0, 1)) {\n        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'toroidala') {",
  'doc', 'migrarea judecă doar freza operației: o toroidală de rest într-un v30 trece')

# ── Lucrarea și fereastra exportului ─────────────────────────────────────────────────────────────────────────────────
o('L01', FF, "  if (forma?.tip === 'toroidala') return 'toroidala';\n", '', 'toro', 'toroidala „merge” pe operații ca o plată')
o('L02', FF, "forma.tip === 'toroidala' ? 'toroidală' : 'în V'", "'în V'", 'toro', 'motivele numesc toroidala „în V”')
o('L03', JB, "        if (scula.forma?.tip === 'toroidala') return", "        if (scula.forma?.tip === 'toroidala' && cale === 'scula') return", 'toro',
  'o toroidală de rest, a fundului plat sau a dopului se taie pe tăcute ca o plată')
o('L04', JB, "      for (const { cale, scula } of frezeleOperatiei(o)) {\n        if (scula.forma?.tip === 'toroidala') return",
  "      for (const { cale, scula } of frezeleOperatiei(o).filter(() => o.tip !== 'profil')) {\n        if (scula.forma?.tip === 'toroidala') return",
  'toro', 'profilul cu toroidala se taie pe tăcute ca o plată')
o('L05', FF, "  return forma === undefined || forma.tip === 'v';", "  return forma?.tip !== 'bila';", 'toro',
  'fereastra exportului face rând toroidalei: Exportă ar scrie o plată în locul ei')
o('L06', FF, "  return o.tip !== 'finisare' && o.tip !== 'degrosare' && frezeleOperatiei(o).every((f) => formaPeRand(f.scula.forma));",
  "  return o.tip !== 'finisare' && o.tip !== 'degrosare' && formaPeRand(o.scula.forma);", 'toro',
  'rândul ferestrei judecă doar freza operației: o toroidală de rest ajunge pe rând')

SETURI = {
    'sim': ['test/unit/simulare.toroidala.test.ts'],
    'sim2': ['test/unit/simulare.toroidala.test.ts', 'test/unit/simulare.scule.test.ts'],
    'doc': ['test/unit/document.v31.oracol.test.ts'],
    'toro': ['test/unit/toroidala.lucrare.test.ts'],
}

E2E = []
