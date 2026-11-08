# Lista de otrăvuri a feliei 3.6k (piesele plate, setările avansate mai departe, ADR 0191), 08.11.2026, alese de autor: modelele
# rare (pașii, fazele, alternarea, Z-ul, densitatea, înclinarea liniilor), umplerea monotonă, cusătura (penalizarea colțurilor,
# golurile, spatele, cea mai apropiată, aleatoare, decalarea, golul), ștergerea (partea dinainte, drumul, viteza), călcarea
# (debitul, marginea, unghiul, straturile, concentricul, viteza), fusta (distanța, ordinea, începutul, scutul, lungimea minimă,
# câte una pe piesă, patul, prima pe strat), implicitele din profilele K1C, setările citite, subsolul; plus legăturile din
# „Avansat” (prin e2e, cu imprimanta falsă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ST = 'src/cam/feliere/straturi.ts'
LI = 'src/cam/feliere/linii.ts'
MO = 'src/cam/feliere/modele.ts'
GC = 'src/cam/feliere/gcode.ts'
PR = 'src/cam/feliere/profil.ts'
IX = 'src/cam/feliere/index.ts'
DD = 'src/app/DialogDinDesen.tsx'

# Modelele rare.
o('M01', ST, "case 'grid': return drepte(pol, [{ u, faza: 0.5 }, { u: u + 90, faza: 0.5 }], (2 * sp) / d, rol, w);",
  "case 'grid': return drepte(pol, [{ u, faza: 0.5 }, { u: u + 90, faza: 0.5 }], (2 * w) / d, rol, w);", 'feliere',
  'grila la lățimea liniei, nu la pasul ei (mai rară decât în OrcaSlicer)')
o('M02', ST, "new Set(['monotonic', 'monotonicline', 'rectilinear', 'line', 'honeycomb'])", "new Set(['monotonic', 'monotonicline', 'line', 'honeycomb'])",
  'feliere', 'umplerea dreptunghiulară nu se mai întoarce de la un strat la altul')
o('M03', ST, "case 'triangles': return drepte(pol, [{ u, faza: 0 }, { u: u + 60, faza: 0 }, { u: u + 120, faza: 0 }]",
  "case 'triangles': return drepte(pol, [{ u, faza: 0 }, { u: u + 60, faza: 0.5 }, { u: u + 120, faza: 0 }]", 'feliere',
  'triunghiurile nu se mai întâlnesc în noduri')
o('M04', ST, "case 'tri-hexagon': return drepte(pol, [{ u, faza: 0 }, { u: u + 60, faza: 0 }, { u: u + 120, faza: 0.5 }]",
  "case 'tri-hexagon': return drepte(pol, [{ u, faza: 0 }, { u: u + 60, faza: 0 }, { u: u + 120, faza: 0 }]", 'feliere',
  'tri-hexagonul devine triunghiuri (fără decalarea familiei a treia)')
o('M05', ST, "{ u: u + 60, faza: fr(-f) }", "{ u: u + 60, faza: fr(f) }", 'feliere', 'familiile cubicului se mută toate în același sens')
o('M06', ST, "new Set(['cubic', 'crosshatch', 'gyroid'])", "new Set(['cubic', 'crosshatch'])", 'feliere',
  'giroidul fără Z în cheia stratului: același șablon pe toate straturile')
o('M07', MO, 'const dA = Math.max(1e-6, d * 2.44);', 'const dA = Math.max(1e-6, d);', 'feliere', 'giroidul fără factorul densității (2,44)')
o('M08', MO, 'const distanta = sp / d, latura = distanta / (Math.sqrt(3) / 2), latime = 2 * distanta;',
  'const distanta = sp / d, latura = distanta / (Math.sqrt(3) / 2), latime = 2.2 * distanta;', 'feliere', 'fagurele cu hexagoane strâmbe')
o('M09', ST, "case 'concentric': return concentrice(pr, i, pr.adanc[i]! + sp / 2 - suprapunere * w, sp / d, rol, w);",
  "case 'concentric': return concentrice(pr, i, pr.adanc[i]! + sp / 2 - suprapunere * w, sp, rol, w);", 'feliere',
  'concentricul ignoră densitatea')
o('M10', MO, '  const dist = sp / d;\n', '  const dist = sp;\n', 'feliere', 'curbele (Hilbert, Arhimede, octograma) ignoră densitatea')
o('M11', MO, 'r = 1 + theta / (2 * Math.PI);', 'r = 1 + theta / Math.PI;', 'feliere', 'spirala lui Arhimede cu pasul dublu')
o('M12', MO, 'const ls = sp / d, osc = ls - sp, extra = 0.3 * sp;', 'const ls = sp / d, osc = 0, extra = 0.3 * sp;', 'feliere',
  'liniile oscilante, toate paralele')
o('M13', MO, 'if (d < 0.999) ls *= 1.08;', '', 'feliere', 'hașura în cruce fără pasul mărit cu 8 %')
o('M14', MO, 'const z = zIn + rep / 2 + tranzitie;', 'const z = rep / 2 + tranzitie;', 'feliere', 'hașura în cruce nu se mai schimbă cu Z')
# Umplerea monotonă.
o('N01', LI, 'const r = vecini.length === 1 ?', 'const r = vecini.length >= 1 ?', 'feliere',
  'regiunile monotone continuă și unde o linie are doi vecini (ordinea se strică)')
o('N02', LI, "if (pts.length > 0 && (!legaturi || Math.abs(x0 - capat) > legaturaMax))", "if (pts.length > 0 && Math.abs(x0 - capat) > legaturaMax)",
  'feliere', '„monotonic line” cu legături extrudate')
o('N03', LI, 'regiuni.sort((a, b) => a.k0 - b.k0 || a.linii[0]![0] - b.linii[0]![0]);', 'regiuni.sort((a, b) => b.k0 - a.k0 || a.linii[0]![0] - b.linii[0]![0]);',
  'feliere', 'regiunile monotone în ordinea inversă')
# Cusătura.
o('C01', ST, 'gauss(a, 0, 1, 3) + 1 / (2 + Math.exp(-a))', 'gauss(a, 0, 1, 3) + 1 / (2 + Math.exp(a))', 'feliere',
  'penalizarea colțurilor întoarsă: cusătura fuge de colțurile concave')
o('C02', ST, '(arie(p) >= 0 ? 1 : -1) * (gaura ? -1 : 1)', '(arie(p) >= 0 ? 1 : -1)', 'feliere', 'la un gol, colțurile se judecă invers')
o('C03', ST, "pen += Math.min(1, Math.max(0, (-ny + 1.2) * 0.5));", '', 'feliere', '„aliniată în spate” nu mai fuge de fața din față')
o('C04', ST, "if (i === 0 || dy > 1e-9 ||", "if (i === 0 || dy < -1e-9 ||", 'feliere', '„în spate” alege fața din față')
o('C05', ST, "+ 1 - gauss(Math.hypot(p[2 * i]! - x, p[2 * i + 1]! - y), 0, 1, 0.005)", '', 'feliere', '„cea mai apropiată” nu mai ține de duză')
o('C06', ST, 'p[1]! * 78.233 + z * 133.3333', 'p[1]! * 78.233', 'feliere', '„aleatoare” la fel pe fiecare strat')
o('C07', ST, 'const q = inainte(c.p, f.i, f.x, f.y, Math.max(c.w, f.d));', 'const q = inainte(c.p, f.i, f.x, f.y, c.w);', 'feliere',
  'cusăturile dinăuntru decalate doar cu lățimea liniei, nu cu adâncimea')
o('C08', ST, "if ((c.adancime ?? 0) === 0 || !decalate) return { ...c, p: pornesteDin(c.p, f.i, f.x, f.y) };",
  "if ((c.adancime ?? 0) === 0 || !decalate) return c;", 'feliere', 'pereții dinăuntru nu mai pornesc din proiecția cusăturii')
o('C09', GC, 'const gol = this.s.golCusatura;', 'const gol = 0.04;', 'feliere', 'golul cusăturii ales nu se mai folosește')
# Ștergerea.
o('W01', GC, 'inainte = L * s.retragereInainte;', 'inainte = L * 0.5;', 'feliere', 'ștergerea retrage înainte jumătate, nu cât e ales')
o('W02', GC, 'if (maxim - rest > 1e-9) inTimp = rest; else { inTimp = maxim; inainte += rest - maxim; }', 'inTimp = rest;', 'feliere',
  'pe drum se retrage mai mult decât încape la viteza retragerii')
o('W03', GC, 'else { const r: number[] = []; for (let i = pts.length - 4; i >= 0; i -= 2) r.push(pts[i]!, pts[i + 1]!); this.sterge = r; }',
  'else this.sterge = pts.slice(2);', 'feliere', 'după o linie, ștergerea merge înainte (în afara liniei), nu înapoi pe ea')
o('W04', GC, 'if (c.inchisa) this.sterge = pts.slice(2);', 'if (c.inchisa) this.sterge = pts.slice(4);', 'feliere',
  'după o buclă, ștergerea sare peste al doilea punct')
o('W05', GC, '    this.vUltim = v;\n', '', 'feliere', 'ștergerea după rol, la 10 mm/s în loc de viteza ultimei linii')
o('W06', GC, 's.vStergere * s.vDeplasare', 's.vDeplasare', 'feliere', 'viteza fixă a ștergerii, toată viteza deplasării')
# Călcarea.
o('I01', GC, 'const k = ((c.mm3 ?? sectiune(c.w, h)) / ARIE_FILAMENT) * this.s.debit;', 'const k = (sectiune(c.w, h) / ARIE_FILAMENT) * this.s.debit;',
  'feliere', 'călcarea cu debitul unei linii întregi')
o('I02', ST, 'const inset = s.margineCalcare > 0 ? s.margineCalcare : 0.5 * K1C.duza;', 'const inset = s.margineCalcare;', 'feliere',
  'călcarea până pe muchie (fără jumătatea de duză)')
o('I03', ST, 'const ua = u + s.unghiCalcare;', 'const ua = u;', 'feliere', 'călcarea pe direcția feței, fără unghiul ei')
o('I04', ST, "s.calcare === 'plin' && tip !== 'rar'", "s.calcare === 'plin' && tip !== 'rar' && tip !== 'prim'", 'feliere',
  '„toate straturile pline” sare peste primul')
o('I05', ST, 'const r = regiuniLa(inset + j * s.pasCalcare);', 'const r = regiuniLa(inset + j * 2 * s.pasCalcare);', 'feliere',
  'călcarea concentrică la pasul dublu')
o('I06', GC, "if (r === 'calcare') return { v: s.vCalcare, a: prim ? s.aPrim : s.aSus };", "if (r === 'calcare') return { v: s.vSus, a: prim ? s.aPrim : s.aSus };",
  'feliere', 'călcarea cu viteza suprafeței de sus')
# Fusta.
o('S01', ST, 'const r = laDistanta([hc], -(s.distantaFusta - sp / 2 + k * sp));', 'const r = laDistanta([hc], -(s.distantaFusta + k * sp));',
  'feliere', 'fusta cu o jumătate de linie mai departe')
o('S02', ST, '    bucle.reverse();\n', '', 'feliere', 'fusta de la bucla dinăuntru spre afară')
o('S03', ST, 'const tinta = (s.unghiFusta * Math.PI) / 180;', 'const tinta = 0;', 'feliere', 'începutul fustei, mereu la dreapta')
o('S04', GC, '(prim || !s.oBuclaDupa ? fusta : fusta.slice(-1))', '(prim || !s.oBuclaDupa ? fusta : fusta.slice(0, 1))', 'feliere',
  'după primul strat, bucla de afară în loc de cea dinăuntru (în fișier)')
o('S05', IX, '(k === 1 || !s.oBuclaDupa ? caiFusta : caiFusta.slice(-1))', '(k === 1 || !s.oBuclaDupa ? caiFusta : caiFusta.slice(0, 1))', 'feliere',
  'după primul strat, bucla de afară (în previzualizare)')
o('S06', ST, 'k <= s.fusta || (s.lungimeMinimaFusta > 0 && filament < s.lungimeMinimaFusta && k <= 100)', 'k <= s.fusta', 'feliere',
  'lungimea minimă a fustei ignorată')
o('S07', ST, "s.tipFusta === 'combinata' ? [piese.flatMap((p) => p.contur)] : piese.map((p) => p.contur)", '[piese.flatMap((p) => p.contur)]', 'feliere',
  'fusta câte una pe piesă devine una comună')
o('S08', IX, '  caiFusta.forEach(intinde);\n', '', 'feliere', 'fusta nu intră în verificarea patului')
o('S09', GC, 'if (fusta.length > 0 && (s.scut || k <= s.inaltimeFusta)) {', 'if (false) {', 'feliere', 'fusta lipsește din fișier')
o('S10', IX, 'caiFusta.length > 0 && (s.scut || k <= s.inaltimeFusta)', 'caiFusta.length > 0', 'feliere', 'fusta pe toate straturile, fără scut')
# Implicitele și setările.
o('P01', PR, "suprapunereRar: 0.15, modelRar: 'crosshatch'", "suprapunereRar: 0.15, modelRar: 'grid'", 'feliere', '0,12 cu grila, nu cu hașura în cruce a profilului')
o('P02', PR, "suprapunereRar: 0.3, modelRar: 'grid', cusaturiDecalate: true, debitCalcare: 0.1, vCalcare: 30, unghiCalcare: 90 },\n  { id: '0.24'",
  "suprapunereRar: 0.3, modelRar: 'grid', cusaturiDecalate: false, debitCalcare: 0.1, vCalcare: 30, unghiCalcare: 90 },\n  { id: '0.24'", 'feliere',
  '0,20 fără cusăturile decalate ale profilului')
o('P03', PR, 'if (typeof v === \'string\' && ALEGERI[k]!.includes(v)) rez[k] = v;', "if (typeof v === 'string') rez[k] = v;", 'feliere',
  'o alegere necunoscută (din browser) trece')
o('P04', PR, "for (const k of BIFE) { const v = s[k]; if (typeof v === 'boolean') rez[k] = v; }", "for (const k of BIFE) { const v = s[k]; if (v !== undefined) rez[k] = v; }",
  'feliere', 'o bifă care nu e da/nu (din browser) trece')
o('P05', GC, "({ nu: 'no ironing', sus: 'top', ultima: 'topmost', plin: 'solid' } as const)", "({ nu: 'no ironing', sus: 'top', ultima: 'top', plin: 'solid' } as const)",
  'feliere', 'subsolul spune „top” pentru „doar cea mai de sus”')

# Legăturile din „Avansat” (prin e2e).
o('E01', DD, '                    if (c.optiuni) {', '                    if (false) {', 'e2e', 'listele din „Avansat” nu se mai arată')
o('E02', DD, '                    if (c.bifa) {', '                    if (false) {', 'e2e', 'bifele din „Avansat” nu se mai arată')
o('E03', DD, "t('imprimanta.felie.fel.rar', { model: t(`imprimanta.felie.o.${s.modelRar}`) })", "t('imprimanta.felie.fel.rar', { model: t('imprimanta.felie.o.grid') })",
  'e2e', 'stratul rar spune mereu „Grilă”')
o('E04', DD, "'rar', 'brim', 'calcare', 'fusta'] as const).map((r) => (", "'rar', 'brim'] as const).map((r) => (", 'e2e',
  'legenda fără călcare și fustă')
o('E05', DD, "calcare: '--imp-rol-calcare', fusta: '--imp-rol-fusta',", "calcare: '--imp-rol-calcare', fusta: '--imp-rol-brim',", 'e2e',
  'fusta desenată în culoarea brim-ului')

SETURI = {
    'feliere': ['test/unit/imprimanta.feliere.modele.test.ts', 'test/unit/imprimanta.feliere.test.ts', 'test/unit/imprimanta.feliere.recenzie.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
