# Lista de otrăvuri a feliei 10.3↑h (opțiunile tăierii: linia la orice unghi, Păstrează, Prelungește capetele, cuțitul-formă
# șters; ADR 0181 §2, §3), 08.11.2026, alese de autor: partea din stânga a liniei, direcția exactă la 90°, normala liniei la
# unghi, arcul tăiat de o linie oarecare, partea păstrată la linie și la cuțitul închis, latura fețelor (sensul corzilor) și a
# bucăților deschise, a unui contur netăiat dincolo de capătul cuțitului, tangenta arcului și a cubicei la capăt, trecerea
# dincolo de margine (prin formele lipite), cuțitul șters; partea pură a uneltei (partea care pleacă, regiunile atinse,
# prelungirea arătată, direcția capătului) și nouă legături din interfață (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
C = 'src/app/cutitCalcul.ts'
U = 'src/app/UnealtaCutit.tsx'
P = 'src/app/PanouTaiere.tsx'
G = 'src/app/GrupuriTaiere.tsx'
S = 'src/app/optiuniTaiere.ts'

# Linia la orice unghi (§3).
o('I01', T, "const stangaLiniei = (L: Linie): 1 | -1 => (L.u.x * L.n.y - L.u.y * L.n.x > 0 ? 1 : -1);",
  "const stangaLiniei = (L: Linie): 1 | -1 => (L.u.x * L.n.y - L.u.y * L.n.x > 0 ? -1 : 1);", 'optiuni',
  'Păstrează stânga, la linie, ține dreapta')
o('I02', T, "  if (r === 90) return { x: 0, y: 1 };\n", '', 'optiuni', 'la 90°, direcția nu mai e exactă (linia nu mai taie la bit ca X)')
o('I03', T, "    const n = { x: -u.y, y: u.x };", "    const n = { x: u.y, y: -u.x };", 'optiuni',
  'normala liniei la unghi e cea din dreapta (părțile A și B se schimbă)')
o('I04', T, "      const unghi = Math.atan2(L.n.y * d + L.u.y * semn * h, L.n.x * d + L.u.x * semn * h);",
  "      const unghi = Math.atan2(L.n.y * d + L.u.y * semn * h, L.n.x * d);", 'optiuni',
  'arcul tăiat de o linie oblică (sau orizontală) își pierde un termen al locului')
# Păstrează (§2).
o('I05', T, "    const ramase = pePart.get(pastreaza === 'stanga' ? stangaLiniei(L) : -stangaLiniei(L)) as ElementNou[];",
  "    const ramase = pePart.get(stangaLiniei(L)) as ElementNou[];", 'optiuni', 'la linie, se păstrează mereu stânga')
o('I06', T, "    const ramase = pastreaza === 'ambele' ? doua : [doua[pastreaza === 'stanga' ? 0 : 1]];",
  "    const ramase = pastreaza === 'ambele' ? doua : [doua[pastreaza === 'stanga' ? 1 : 0]];", 'optiuni',
  'la cuțitul închis, stânga ține afara')
o('I07', T, "    const latura: Latura = drum.every((x) => !x.inapoi) ? 1 : drum.every((x) => x.inapoi) ? -1 : 0;",
  "    const latura: Latura = drum.every((x) => x.inapoi) ? 1 : drum.every((x) => !x.inapoi) ? -1 : 0;", 'optiuni',
  'latura fețelor din sensul corzilor, întoarsă')
o('I08', T, "  if (pana) xs.push(laturaRazei(K, pana, raze(c, pana.x.a)[1]));",
  "  if (pana) xs.push(laturaRazei(K, pana, raze(c, pana.x.a)[0]));", 'optiuni',
  'bucata deschisă se judecă la capătul ei de sosire pe direcția greșită (nehotărâtă: rămâne)')
o('I09', T, "    const dir = x.k === 0 && x.t === 0 ? r0 : { x: -r0.x, y: -r0.y };", "    const dir = r0;", 'optiuni',
  'un contur netăiat dincolo de capătul cuțitului e pus de partea greșită')
# Prelungește capetele (§2).
o('I10', T, "    const r = (capat === 0 ? -2 : 2) * Math.atan(g.s.bulge);", "    const r = (capat === 0 ? 2 : -2) * Math.atan(g.s.bulge);", 'optiuni',
  'tangenta arcului la capăt, rotită pe dos')
o('I11', T, "    const q = (capat === 0 ? [g.s.c1, g.s.c2, g.b] : [g.s.c2, g.s.c1, g.a]).find((x) => Math.hypot(x.x - P.x, x.y - P.y) > 1e-12);",
  "    const q = (capat === 0 ? [g.s.c1, g.s.c2, g.b] : [g.s.c1, g.s.c2, g.a]).find((x) => Math.hypot(x.x - P.x, x.y - P.y) > 1e-12);", 'optiuni',
  'tangenta cubicei la sfârșit, luată de la primul mâner')
o('I12', T, "    s += urm + DEPASIRE;", "    s += urm;", 'optiuni',
  'capătul se oprește chiar pe margine: nu mai trece în forma lipită')
o('I13', T, "    if (cerere.stergeCutitul === true) cutitSters = ids;\n", '', 'optiuni', 'cuțitul-formă nu se mai șterge')
# Partea pură a uneltei (cât tragi).
o('I14', C, "  const n = pastreaza === 'stanga' ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };",
  "  const n = pastreaza === 'stanga' ? { x: -u.y, y: u.x } : { x: u.y, y: -u.x };", 'unealta',
  'se estompează partea păstrată, nu cea care pleacă')
o('I15', C, "    if (pastreaza === 'dreapta') return [[...puncte]];", "    if (pastreaza === 'stanga') return [[...puncte]];", 'unealta',
  'la cuțitul închis, se estompează partea greșită')
o('I16', C, "    return n >= 2 || (inchis && n === 0 && inRegiuneAproximativa(puncte[0] as P, r));",
  "    return n >= 1 || (inchis && n === 0 && inRegiuneAproximativa(puncte[0] as P, r));", 'unealta',
  'o formă în care cuțitul doar intră pare atinsă (estompată)')
o('I17', C, "        s += urm + 1e-3;", "        s += urm;", 'unealta', 'prelungirea arătată se oprește pe margine')
o('I18', C, "    const q = (capat === 0 ? p[k] : p[n - 1 - k]) as P;", "    const q = p[k] as P;", 'unealta',
  'direcția capătului de sfârșit, luată de la început')
# Interfața (e2e).
o('H01', U, "      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, prelungeste: o.prelungeste, pastreaza: o.pastreaza, stergeCutitul: o.stergeCutitul }, s.signal).then((r) => {",
  "      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, prelungeste: o.prelungeste, stergeCutitul: o.stergeCutitul }, s.signal).then((r) => {", 'e2e',
  'unealta nu trimite „Păstrează”')
o('H02', U, "      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, prelungeste: o.prelungeste, pastreaza: o.pastreaza, stergeCutitul: o.stergeCutitul }, s.signal).then((r) => {",
  "      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, pastreaza: o.pastreaza, stergeCutitul: o.stergeCutitul }, s.signal).then((r) => {", 'e2e',
  'unealta nu trimite „Prelungește”')
o('H03', U, "      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, prelungeste: o.prelungeste, pastreaza: o.pastreaza, stergeCutitul: o.stergeCutitul }, s.signal).then((r) => {",
  "      calc.taieVectorii(laCerere, { cutit, alese, inchide: o.inchide, prelungeste: o.prelungeste, pastreaza: o.pastreaza }, s.signal).then((r) => {", 'e2e',
  'unealta nu trimite „Șterge cuțitul”')
o('H04', P, "      inchide, pastreaza: optiuni.pastreaza, prelungeste: cuCapete ? optiuni.prelungeste : 'nu', stergeCutitul: fel === 'forma' && optiuni.stergeCutitul,",
  "      inchide, pastreaza: optiuni.pastreaza, prelungeste: 'nu', stergeCutitul: fel === 'forma' && optiuni.stergeCutitul,", 'e2e',
  'panoul nu trimite „Prelungește”')
o('H05', P, "{ fel: 'unghi', x: ux, y: uy, unghi }", "{ fel: 'unghi', x: uy, y: ux, unghi }", 'e2e', 'linia la unghi din panou, cu X și Y schimbate')
o('H06', G, "parti[x === 'stanga' ? 0 : 1]", "parti[x === 'stanga' ? 1 : 0]", 'e2e', 'numele părților, întoarse (stânga se cheamă dreapta)')
o('H07', U, "      if (atinse.length > 0 && poligoane) sters = { poligoane, atinse };\n", '', 'e2e', 'partea care pleacă nu se mai estompează cât tragi')
o('H08', S, "  for (const f of ascultatori) f();\n", '', 'e2e', 'opțiunea schimbată nu se vede (nicio componentă nu se mai randează)')
o('H09', P, "stergeCutitul: fel === 'forma' && optiuni.stergeCutitul,", "stergeCutitul: false,", 'e2e', 'panoul nu trimite „și șterge-o după tăiere”')

SETURI = {
    'optiuni': ['test/unit/taiere.optiuni.test.ts', 'test/unit/taiere.optiuni.oracol.test.ts'],
    'unealta': ['test/unit/cutitCalcul.test.ts'],
}
E2E = ['test/e2e/cutit.spec.ts', 'test/e2e/taiere.spec.ts']
