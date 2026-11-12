# Lista de otrăvuri a feliei 10.3↑i (spațiul și suprapunerea dintre bucăți; ADR 0181 §2), 09.11.2026, alese de autor: cererea
# (închiderea, lățimea), linia mutată (partea, jumătatea, felul), bucata mâncată (cât trece de linie, gaura, insula), forma
# netăiată de linie, cuțitul-formă mutat (felul, figura, dispărută, ruptă, capetele prelungite, cuțitele de care e nevoie),
# trecerea de-a binelea, bucla cuprinsă, restul (verificat, o singură dată); partea pură a uneltei (fâșia arătată, spațiul cerut)
# și nouă legături din interfață (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
B = 'src/model/intreBucati.ts'
C = 'src/app/cutitCalcul.ts'
S = 'src/app/optiuniTaiere.ts'
U = 'src/app/UnealtaCutit.tsx'
P = 'src/app/PanouTaiere.tsx'
G = 'src/app/GrupuriTaiere.tsx'

# Cererea.
o('J01', T, "    if (!cerere.inchide) return { ok: false, motiv: 'spatiu-inchide' };\n", '', 'spatiu', 'spațiul fără închidere nu se mai refuză')
o('J02', T, "    if (!latimeBuna(intre.latime)) return { ok: false, motiv: 'valoare' };\n", '', 'spatiu', 'lățimea nu se mai verifică')
o('J03', B, "export const latimeBuna = (x: number): boolean => x >= LATIME_MINIMA && x <= LATIME_MAXIMA;",
  "export const latimeBuna = (x: number): boolean => x > LATIME_MINIMA && x <= LATIME_MAXIMA;", 'spatiu',
  'lățimea cea mai mică (0,01) e refuzată')
# Linia mutată.
o('J04', T, "    const g = partiLinie({ n: L.n, u: L.u, v: L.v + s * spre * d }, inst, p, true);",
  "    const g = partiLinie({ n: L.n, u: L.u, v: L.v - s * spre * d }, inst, p, true);", 'spatiu',
  'linia mutată spre partea greșită (spațiul devine suprapunere)')
o('J05', T, "  const d = intre.latime / 2, spre = intre.fel === 'spatiu' ? 1 : -1;",
  "  const d = intre.latime, spre = intre.fel === 'spatiu' ? 1 : -1;", 'spatiu', 'linia mutată cu toată lățimea, nu cu jumătate')
o('J06', T, "  const d = intre.latime / 2, spre = intre.fel === 'spatiu' ? 1 : -1;",
  "  const d = intre.latime / 2, spre = 1;", 'spatiu', 'suprapunerea taie ca spațiul')
# Bucata mâncată, la linie.
o('J07', T, "    if (spre > 0 && mancata(z.pePart.get(s) ?? [], mi, (c) => catTrece(L, c, s) > d + PESTE_CUTIT)) return 'spatiu';\n", '',
  'spatiu', 'la linie, spațiul care mănâncă o bucată nu se mai refuză')
o('J08', T, "  return s > 0 ? k.maxX - L.v : L.v - k.minX;", "  return s > 0 ? L.v - k.minX : k.maxX - L.v;", 'spatiu',
  'cât trece o bucată de linie, măsurat de partea cealaltă')
o('J09', T, "(c) => catTrece(L, c, s) > d + PESTE_CUTIT)", "(c) => catTrece(L, c, s) > d - PESTE_CUTIT)", 'spatiu',
  'fâșia de exact jumătate din spațiu nu mai e mâncată')
o('J10', T, "    return !c.inchis || !q || inchise.filter((x) => x !== c && inRegiune(q, [x])).length % 2 === 0;",
  "    return true;", 'spatiu', 'o gaură din fâșie se socotește bucată mâncată')
o('J11', T, "    return !c.inchis || !q || inchise.filter((x) => x !== c && inRegiune(q, [x])).length % 2 === 0;",
  "    return !c.inchis || !q || inchise.filter((x) => x !== c && inRegiune(q, [x])).length % 2 === 1;", 'spatiu',
  'insula din fâșie scapă, iar gaura e mâncată')
o('J12', T, "  if (z.taiate === 0) return null;\n", '', 'spatiu', 'o formă pe care linia n-o atinge e tăiată de cea mutată')
# Cuțitul-formă mutat.
o('J13', T, "    const m = (fel === 'spatiu' ? s : -s) === 1 ? M.st : M.dr;", "    const m = s === 1 ? M.st : M.dr;", 'spatiu',
  'suprapunerea folosește cuțitele spațiului')
o('J14', T, "    const r = offsetFigura(lucru, -d);", "    const r = offsetFigura(lucru, d);", 'spatiu',
  'cuțitul închis, mutat pe dos (înăuntru crește)')
o('J15', T, "    if (!r.ok) return d > 0 && r.motiv.startsWith('scula nu încape') ? null : 'spatiu-cutit';",
  "    if (!r.ok) return 'spatiu-cutit';", 'spatiu', 'cuțitul închis strâns până dispare e refuzat, nu gol')
o('J16', T, "        if (!r.ok || r.bucati.length !== 1) return 'spatiu-cutit';", "        if (!r.ok) return 'spatiu-cutit';", 'spatiu',
  'offsetul rupt în două bucăți e primit')
o('J17', T, "  const cs = m.contururi.map((c) => (c.inchis ? c : prelungit(c, 'forma', t)));", "  const cs = m.contururi;", 'spatiu',
  'capetele cuțitului mutat nu se mai prelungesc (cel care iese pe sub un unghi mic se oprește înăuntru)')
o('J18', T, "  const trebuie = new Set(laturiPastrate.map((s) => (intre.fel === 'spatiu' ? s : -s)));",
  "  const trebuie = new Set([1, -1]);", 'spatiu', 'se mută cuțitul și pentru partea care nu se păstrează')
# Bucata mâncată, la cuțitul-formă.
o('J19', T, "      for (const x of intalniri(A, k).puncte) if (deOParteSiDeAlta(raze(k.c, x.b), raze(c, x.a))) return true;",
  "      if (intalniri(A, k).puncte.length > 0) return true;", 'spatiu',
  'o atingere a cuțitului mutat (pe o latură) trece drept trecere')
o('J20', T, "  return c.inchis && kw.some((k) => {", "  return false && kw.some((k) => {", 'spatiu',
  'o parte care se strânge, dar rămâne (insula din „O”), se socotește mâncată')
o('J21', T, "    const rest = g.rest.filter((x) => laturaPunctelor(K, x.proba) === s).map((x) => x.e);",
  "    const rest: ElementNou[] = [];", 'spatiu', 'restul cuțitului deschis (o insulă din fâșie) nu se mai verifică')
o('J22', T, "    for (const y of x.rest) rest.set(y.e.surse[0]?.nod ?? `#${rest.size}`, y.e);",
  "    for (const y of x.rest) rest.set(`#${rest.size}`, y.e);", 'spatiu', 'restul păstrat de ambele părți intră de două ori')
# Partea pură a uneltei.
o('K01', C, "  const h = latime / 2;\n  const normala", "  const h = latime;\n  const normala", 'unealta', 'fâșia arătată, cu toată lățimea de fiecare parte')
o('K02', C, "    const n = l > 1e-9 ? { x: s.x / l, y: s.y / l } : ((n1 ?? n0) as P);",
  "    const n = l > 1e-9 ? { x: s.x / l, y: s.y / l } : ((n0 ?? n1) as P);", 'unealta',
  'la o întoarcere pe loc, fâșia ia normala laturii de dinainte')
o('K03', S, "  return o.inchide && o.intre !== 'nimic' ? { fel: o.intre, latime: o.latime } : undefined;",
  "  return o.intre !== 'nimic' ? { fel: o.intre, latime: o.latime } : undefined;", 'unealta', 'spațiul cerut și fără închidere')
# Interfața (e2e).
o('H01', U, "...(intreCerut ? { intre: intreCerut } : {}) };", "};", 'e2e', 'unealta nu trimite spațiul')
o('H02', P, "      ...(intre ? { intre } : {}),\n", '', 'e2e', 'panoul nu trimite spațiul')
o('H03', G, "checked={o.intre === x} disabled={!o.inchide}", "checked={o.intre === x}", 'e2e', '„Între bucăți” nu se stinge fără închidere')
o('H04', G, "          if (v !== null && latimeBuna(v)) schimbaOptiuniTaiere({ latime: v });\n", '', 'e2e', 'lățimea scrisă nu ajunge în opțiuni')
o('H05', P, "  const fasie = intre ? { fasie: intre.latime } : {};", "  const fasie = {};", 'e2e', 'fâșia nu se arată în jurul liniei din panou')
o('H06', U, "    const fasie = latimeFasie > 0 ? fasieAproximativa(cale, latimeFasie) : null;", "    const fasie = null;", 'e2e',
  'fâșia nu se arată cât tragi')
o('H07', U, "  if (cuOptiuni && intre) activeOptiuni.push(", "  if (false && intre) activeOptiuni.push(", 'e2e', 'sfatul nu spune spațiul')
o('H08', U, "        const b = capatConstrans('linie', a0, q, m);", "        const b = capatConstrans('linie', a0, q, { ...m, shift: false });", 'e2e',
  'Shift nu mai ține Linia cuțitului la pași de 15°')

SETURI = {
    'spatiu': ['test/unit/taiere.spatiu.test.ts', 'test/unit/taiere.spatiu.oracol.test.ts'],
    'unealta': ['test/unit/cutitCalcul.test.ts'],
}
E2E = ['test/e2e/cutit.spec.ts', 'test/e2e/taiere.spec.ts']
