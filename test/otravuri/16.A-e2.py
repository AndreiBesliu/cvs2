# Lista de otrăvuri a feliei 16.A↑e-2 (elicea cu bila și cu toroidala în nucleul simulării; ADR 0303 §2), 27.11.2026, aleasă
# de autor: dispecerul elicei, forma (bila ca toroidala cu a = 0, ρ = R), citirea urcării de la capăt, fereastra ultimei ture,
# bucățile de cerc (lobii), latura de dinaintea trecerii, capătul bucății, pragul G = |m| (înjumătățirea), secțiunea de aur,
# formula lui G, unghiul candidatului, marginea de jos și refuzul V-ului în program. Se rulează cu `scripts/otravuri.py`
# (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier;
# altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NU = 'src/sim/nucleu.ts'
PR = 'src/sim/program.ts'

# ── Dispecerul și forma ─────────────────────────────────────────────────────────────────────────────────────────────
o('E01', NU, "    else if (T.fel === 1 || T.fel === 3) eliceaRotunda(F, T, ax, ay, az, bz, cx, cy, trig, S);",
  "    else if (T.fel === 1 || T.fel === 3) eliceaPlata(F, T, ax, ay, az, bz, cx, cy, trig, S);", 'el',
  'elicea rotundă tăiată ca una plată: fundul cât tot diametrul')
o('E02', NU, "  const va = T.fel === 1 ? 0 : T.a, rc = T.fel === 1 ? T.R : T.rho, rc2 = rc * rc;",
  "  const va = T.fel === 1 ? 0 : T.a, rc = T.fel === 1 ? T.R / 2 : T.rho, rc2 = rc * rc;", 'el',
  'bila cu raza colțului pe jumătate: G greșit, minimul în alt loc')
o('E03', NU, "          if (urca) { v = S - v; v = v - DOI_PI * Math.floor(v / DOI_PI); }", "", 'el',
  'urcarea citită de la capăt fără unghiul celulei întors: celula judecată la alt loc pe elice')
o('E04', NU, "  const dir = trig ? 1 : -1, urca = bz > az;", "  const dir = 1, urca = bz > az;", 'el',
  'elicea orar parcursă trigonometric')
# ── Fereastra și lobii ────────────────────────────────────────────────────────────────────────────────────────────────
o('E05', NU, "  const U0 = S > DOI_PI ? S - DOI_PI : 0;", "  const U0 = S / 2;", 'el',
  'fereastra doar pe a doua jumătate a elicei: celulele atinse doar la început, sărite')
o('E06', NU, "kmax = Math.floor((S + al - v) / DOI_PI);", "kmax = kmin;", 'el',
  'doar primul lob al ferestrei: trecerea de la capătul turei, pierdută')
o('E07', NU, "            if (pb <= 0) {\n              const z = z0 + m * (c + pb) + H(T, dPsi(pb));",
  "            if (pb <= 0) {\n              const z = z0 + m * (c + pa) + H(T, dPsi(pa));", 'el',
  'latura de dinaintea trecerii judecată la începutul ei, nu la capăt (cel mai jos)')
o('E08', NU, "            const pL = pa > 0 ? pa : 0;", "            const pL = 0;", 'el',
  'latura de după trecere pornită de la trecere și când fereastra o taie mai târziu')
# ── Latura de după trecere: capătul, pragul, secțiunea de aur ────────────────────────────────────────────────────────
o('E09', NU, "            if (zR < zs) zs = zR;\n", "", 'el',
  'capătul bucății uitat: în miez, celula cea mai joasă e la capătul turei, departe de trecere')
o('E10', NU, "      if (G(mij) < mm) lo = mij; else hi = mij;", "      if (G(mij) < mm) hi = mij; else lo = mij;", 'el',
  'înjumătățirea pragului în sensul greșit')
o('E11', NU, "                if (g1 <= g2) { lo = x1;", "                if (g1 >= g2) { lo = x1;", 'el',
  'secțiunea de aur caută minimul lui G, nu maximul: pragul nu mai e găsit în miez')
o('E12', NU, "              if ((g1 >= g2 ? g1 : g2) >= mm) d1 = prag(dL, dS);", "", 'el',
  'G sub |m| la capete: minimul local din miez sărit')
o('E13', NU, "    return w > 0 ? (h1 * Math.sqrt(w)) / (2 * d) : 0;", "    return w > 0 ? (h1 * Math.sqrt(w)) / d : 0;", 'el',
  'G de două ori mai mare: punctul staționar mutat')
o('E14', NU, "    if (d <= va) return 0;\n    const e = d - va, q = rc2 - e * e;\n    return q > 0 ? e / Math.sqrt(q) : Infinity;",
  "    if (d <= va) return Infinity;\n    const e = d - va, q = rc2 - e * e;\n    return q > 0 ? e / Math.sqrt(q) : Infinity;", 'el',
  'discul plat al toroidalei văzut ca perete: pragul pus la începutul laturii')
o('E15', NU, "  const z0 = urca ? bz : az, dz = urca ? az - bz : bz - az, m = dz / S, mm = -m, zCapat = z0 + dz;",
  "  const z0 = urca ? bz : az, dz = urca ? az - bz : bz - az, m = dz / S, mm = m, zCapat = z0 + dz;", 'el',
  'pragul cu panta cu semn: G ≥ m mereu, minimul pus la trecere')
o('E16', NU, "              const ps = d1 === dL ? pL : acosD((A - d1 * d1) / B);", "              const ps = pL;", 'el',
  'candidatul de la prag judecat cu Z-ul trecerii (unghiul lui pierdut)')
o('E17', NU, "        if (zCapat + H(T, dmin) >= cur) continue;", "        if (z0 + H(T, dmin) >= cur) continue;", 'el',
  'marginea de jos cu Z-ul startului: a doua tură nu mai coboară celulele tăiate de prima')
# ── Programul ────────────────────────────────────────────────────────────────────────────────────────────────────────
o('E18', PR, "      if (z !== nz && forma.tip === 'v' && !inAer) {", "      if (false && z !== nz && forma.tip === 'v' && !inAer) {", 'pr',
  'elicea cu V-ul trece de program (nucleul ar arunca la mijlocul jobului)')
o('E19', PR, "      if (z !== nz && forma.tip === 'v' && !inAer) {", "      if (z !== nz && forma.tip !== 'plata' && !inAer) {", 'pr',
  'elicea cu bila și cu toroidala refuzată mai departe')

SETURI = {
    'el': ['test/unit/simulare.elice.test.ts'],
    'pr': ['test/unit/simulare.elice.test.ts', 'test/unit/simulare.program.test.ts'],
}

E2E = []
