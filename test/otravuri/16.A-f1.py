# Lista de otrăvuri a feliei 16.A↑f-1 (profilul desenat în simulare și în documentul v32; ADR 0304 §1, §2), 27.11.2026, aleasă
# de autor: nucleul (linia frântă: h, raza efectivă, pantele, minimul pe bucăți, punctul staționar, intervalele), validarea
# simulării (h nedescrescător, elicea), ușa (primul punct, r strict crescător, capătul la rază, plafonul punctelor, perechile),
# migrarea v31 → v32, regula formei și refuzul lucrării, oracolul documentului. Se rulează cu `scripts/otravuri.py`
# (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NU = 'src/sim/nucleu.ts'
PR = 'src/sim/program.ts'
SD = 'src/model/schemaDocument.ts'
MG = 'src/model/migrari.ts'
FF = 'src/model/formaFrezei.ts'
JB = 'src/cam/job.ts'
OD = 'test/oracles/document.ts'

# ── Nucleul ──────────────────────────────────────────────────────────────────────────────────────────────────────────
o('F01', NU, "    if (k > m && k > -m) stat = p > 0 ? (-m * p) / Math.sqrt(k * k - m * m) : 0;",
  "    if (k > m && k > -m) stat = p > 0 ? (m * p) / Math.sqrt(k * k - m * m) : 0;", 'm', 'punctul staționar cu semnul pantei întors')
o('F02', NU, "    for (let semn = 0; semn < 2; semn++) {", "    for (let semn = 0; semn < 1; semn++) {", 'm',
  'doar intervalul din fața proiecției (s ≥ 0) al fiecărei bucăți')
o('F03', NU, "    if (r12 < perp2) continue;", "    if (r12 < perp2 + 1) continue;", 'm', 'bucățile de lângă perpendiculară sărite')
o('F04', NU, "    return T.ph[n - 2]! + T.pp[n - 2]! * (d - pr[n - 2]!);", "    return T.ph[n - 1]!;", 'm',
  'ultima bucată a siluetei, la înălțimea ei cea mai mare (plonjarea, arcele)')
o('F05', NU, "      if (ph[i + 1]! >= adanc) return Math.min(T.R, T.pr[i]! + (adanc - ph[i]!) / T.pp[i]!);",
  "      if (ph[i + 1]! >= adanc) return Math.min(T.R, T.pr[i]!);", 'm', 'raza efectivă prea mică: celulele de la margine sărite')
o('F06', NU, "    for (let i = 0; i + 1 < n; i++) pp[i] = (ph[i + 1]! - ph[i]!) / (pr[i + 1]! - pr[i]!);",
  "    for (let i = 0; i + 1 < n; i++) pp[i] = (ph[i + 1]! - ph[i]!) / pr[i + 1]!;", 'm', 'panta bucății împărțită la r, nu la lățimea ei')
o('F07', NU, "    else stat = m > 0 ? -Infinity : m < 0 ? Infinity : 0;", "    else stat = 0;", 'm',
  'pe bucățile mai line decât mișcarea, minimul pus pe proiecție, nu la capătul care coboară')
o('F08', PR, "    if (!(h1 >= h0)) return `scula profil: h scade la punctul ${i}`;\n", '', 'm', 'simularea primește un profil cu h care scade')
o('F09', PR, "      if (z !== nz && (forma.tip === 'v' || forma.tip === 'profil') && !inAer) {",
  "      if (z !== nz && forma.tip === 'v' && !inAer) {", 'm', 'elicea cu profilul trimisă nucleului (care n-o știe)')
# ── Ușa și migrarea ──────────────────────────────────────────────────────────────────────────────────────────────────
o('F10', SD, "  if (P[0]![0] !== 0 || P[0]![1] !== 0 || Math.abs(P[P.length - 1]![0] - diametru / 2) > 1e-9) return false;",
  "  if (Math.abs(P[P.length - 1]![0] - diametru / 2) > 1e-9) return false;", 'd', 'ușa primește un profil care nu pleacă din (0, 0)')
o('F11', SD, "  for (let i = 1; i < P.length; i++) if (!(P[i]![0] > P[i - 1]![0] && P[i]![1] >= P[i - 1]![1])) return false;",
  "  for (let i = 1; i < P.length; i++) if (!(P[i]![0] >= P[i - 1]![0] && P[i]![1] >= P[i - 1]![1])) return false;", 'd',
  'ușa primește r egal la două puncte (o treaptă verticală)')
o('F12', SD, "  if (P[0]![0] !== 0 || P[0]![1] !== 0 || Math.abs(P[P.length - 1]![0] - diametru / 2) > 1e-9) return false;",
  "  if (P[0]![0] !== 0 || P[0]![1] !== 0 || Math.abs(P[P.length - 1]![0] - diametru / 2) > 0.2) return false;", 'd',
  'ușa primește un profil care se termină sub rază')
o('F13', SD, "v.minLength(2), v.maxLength(PLAFON.puncteProfil)),", "v.minLength(2), v.maxLength(1000)),", 'd', 'ușa primește peste 200 de puncte')
o('F14', SD, "v.array(v.strictTuple([intre0(PLAFON.diametruScula), intre0(PLAFON.adancimeOperatie)]))",
  "v.array(v.tuple([intre0(PLAFON.diametruScula), intre0(PLAFON.adancimeOperatie)]))", 'd',
  'ușa primește un punct cu trei numere (și îl taie pe tăcute)')
# F15 (ușa fără marginea de jos a lui h, „h ≥ 0”) a scăpat la prima rulare și e practic echivalentă: primul punct e (0, 0),
# iar h e nedescrescător (`profilBun`), deci un h negativ e refuzat oricum (cazul RD10 o arată). Scoasă din listă.
o('F16', MG, "        if (ob(s) && ob(s['forma']) && s['forma']['tip'] === 'profil') {", "        if (false) {", 'd',
  'migrarea face pe tăcute v32 dintr-un v31 cu un profil desenat')
# ── Regula și lucrarea ───────────────────────────────────────────────────────────────────────────────────────────────
o('F17', FF, "  if (forma?.tip === 'profil') return 'profil';\n", '', 'w', 'profilul trece de regula formei (ca o freză plată)')
o('F18', JB, "        if (scula.forma?.tip === 'profil') {", "        if (false) {", 'w', 'lucrarea taie cu un profil ca și cum ar fi o plată')
o('F19', FF, "forma.tip === 'profil' ? 'profilată' : 'în V';", "'în V';", 'w', 'motivele numesc profilul „în V”')
# ── Oracolul documentului ────────────────────────────────────────────────────────────────────────────────────────────
o('F20', OD, "  if (Q[0]![0] !== 0 || Q[0]![1] !== 0) rez.push(`.puncte[0] = ${arata(Q[0])} nu e [0, 0]`);\n", '', 'd',
  'oracolul primește un profil care nu pleacă din (0, 0)')
o('F21', OD, "  return Math.abs(r - jum) <= 1e-9 ? [] : [`.forma.puncte[${P.length - 1}] are r = ${r}, nu raza sculei (${jum})`];",
  "  return [];", 'd', 'oracolul nu mai judecă capătul profilului la rază')

SETURI = {
    'm': ['test/unit/simulare.profil.test.ts'],
    'd': ['test/unit/document.v32.oracol.test.ts', 'test/unit/profil.lucrare.test.ts'],
    'w': ['test/unit/profil.lucrare.test.ts', 'test/unit/canelura.rotunda.test.ts'],
}
