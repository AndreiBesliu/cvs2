# Lista de otrăvuri a feliei 10.3↑b (cuțitul-formă și „Taie la intersecții”; ADR 0180 §3, §5, §6), 07.11.2026, alese de autor:
# locurile comune (rafinarea cu Newton, nodul la capăt, capetele suprapunerilor, îmbinările unei suprapuneri, capetele unei căi
# deschise), cuțitul (punctul de probă al bucății, regula „exact o bucată a cuțitului intră în regiune”, calea deschisă trecută de
# tot, cercul deschis într-un loc, sensul cu regiunea în stânga, corzile cu capăt liber, cuțitul încrucișat, capătul corzii,
# marginea dinăuntru, părțile cuțitului închis), intersecțiile (perechile, conturul închis cu un loc, piesa rămasă, plafonul) și
# trei legături din panou și din meniul de clic dreapta (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
P = 'src/app/PanouTaiere.tsx'
E = 'src/app/Editare.tsx'

# Locurile comune.
o('C01', T, '      const [s, t] = rafineaza(ga, gb, s0, t0);', '      const [s, t] = [s0, t0];', 'forma',
  'locul comun fără Newton: doar cât îl dă cavalier (cubicele, ca biarce)')
o('C02', T, '  if (t <= 0 || departe(P, g.a) <= eps(P)) return { k, t: 0 };', '  if (t <= 0) return { k, t: 0 };', 'forma',
  'un loc chiar în nod rămâne la t ≈ 0 (un nod dublu)')
o('C03', T, '    else for (const p of x.puncte) capete.push({ p, ka, kb });\n', '', 'forma',
  'suprapunerile se pierd: cuțitul pe latură nu se mai refuză')
o('C04', T, '    if (capete.some((d) => d !== c && departe(d.p, c.p) <= 1e-6)) continue;\n', '', 'forma',
  'îmbinarea a două bucăți ale aceleiași suprapuneri taie și ea')
o('C05', T, '    if (!c.inchis && q.t === 0 && (q.k === 0 || q.k === n - 1)) continue;\n', '', 'forma',
  'capătul unei căi deschise e luat drept loc de tăiere')
# Cuțitul.
o('K01', T, '      best = punctPe(g.a, g.b, g.s, (ta + tb) / 2);', '      best = punctPe(g.a, g.b, g.s, ta);', 'forma',
  'punctul de probă al bucății, la capătul ei (pe margine)')
o('K02', T, '      if (Number(inainte === true) + Number(dupa[i] === true) === 1) for (const l of g) taiat.add(l);',
  '      if (Number(inainte === true) + Number(dupa[i] === true) >= 1) for (const l of g) taiat.add(l);', 'forma',
  'o atingere dinăuntru (ambele bucăți ale cuțitului în regiune) taie')
o('K03', T, '  return x !== 0 && y !== 0 && x !== y;', '  return x !== 0 && y !== 0;', 'forma',
  'o cale deschisă doar atinsă de cuțit (de aceeași parte) se taie')
o('K04', T, "  const minim = (c: Contur): number => (c.inchis && !inchide ? 2 : 1);", "  const minim = (c: Contur): number => (c.inchis ? 2 : 1);",
  'forma', 'cu închidere, un contur închis cu un singur loc nu se mai taie (inelul nu se despică)')
o('K05', T, "    const varfuri: VarfDoc[] = u.length === 1\n", "    const varfuri: VarfDoc[] = u.length === 0\n", 'forma',
  'cercul deschis într-un singur loc: un arc de 360°, fără bulge')
o('K06', T, '      const invers = (arieCuSemn(c) > 0) !== (adancime(el) % 2 === 0);', '      const invers = arieCuSemn(c) < 0;', 'forma',
  'gaura, parcursă tot cu regiunea în dreapta')
o('K07', T, "        if (!de || !pana) return 'nu-trece';", '        if (!de || !pana) continue;', 'forma',
  'un cuțit care se oprește în formă nu se mai refuză')
o('K08', T, "    if (K.proprii.some(inR)) return 'cutit';\n", '', 'forma', 'un cuțit încrucișat în formă nu se mai refuză')
o('K09', T, '        const capat = (vb[vb.length - 1] as VarfDoc).p;', '        const capat = (vb[0] as VarfDoc).p;', 'forma',
  'coarda pornește din începutul bucății, nu din capătul ei')
o('K10', T, '      if (x.arie < 0) intregi.push({ e: x.e, proba });', '      if (false) intregi.push({ e: x.e, proba });', 'forma',
  'marginea dinăuntru devine o formă a ei (plină), nu gaura regiunii')
o('K11', T, '    for (const x of [...noi, ...intregi]) (inauntru(x.proba) ? A : B).push(x.e);',
  '    for (const x of [...noi, ...intregi]) (inauntru(x.proba) ? B : A).push(x.e);', 'forma', 'părțile cuțitului închis, întoarse')
o('K12', T, '  return { contururi, inchis: contururi.every((c) => c.c.inchis), proprii,', '  return { contururi, inchis: false, proprii,', 'forma',
  'cuțitul închis lucrează ca unul deschis: fiecare față, o formă')
o('K13', T, "    alese.delete(c.id);\n", '', 'forma', 'cuțitul se taie și pe el')
o('K14', T, "      return { e: { forma, matrice: inElement ? prima.er.matrice : IDENTITATE, surse, fel: 'inchis', exteriorDreapta: null }, arie };",
  "      return { e: { forma, matrice: IDENTITATE, surse, fel: 'inchis', exteriorDreapta: null }, arie };", 'forma',
  'fața, în coordonatele elementului, dar fără matricea lui (mutată)')
# Intersecțiile.
o('X01', T, '    index.vizita(f.a.cutie, (j) => { if (j > i) altele.push(j); });', '    index.vizita(f.a.cutie, (j) => { if (j >= i) altele.push(j); });',
  'forma', 'un contur cercetat și cu el însuși (buclele lui)')
o('X02', T, '    if (!w || tr.length < (w.inchis ? 2 : 1)) {', '    if (!w || tr.length < 1) {', 'forma',
  'un contur închis cu un singur loc se deschide')
o('X03', T, '  if (rest.length > 0) parti.push({ elemente: rest });\n  return { parti, taiate };\n}\n',
  '  if (rest.length > 0) parti.unshift({ elemente: rest });\n  return { parti, taiate };\n}\n', 'forma',
  'piesa rămasă, înaintea bucăților')
o('X04', T, "    if (perechi > PLAFON_PERECHI) return 'prea-multe';", "    if (perechi > 0) return 'prea-multe';", 'forma',
  'plafonul perechilor, la prima pereche')
# Panoul și meniul de clic dreapta (e2e).
o('U01', P, '  const forma = selectie.length >= 2 ? (selectie[selectie.length - 1] ?? null) : null;', '  const forma = selectie[0] ?? null;', 'e2e',
  'cuțitul e prima formă aleasă, nu ultima')
o('U02', P, "  const intersectii = (): void => { ruleaza({ fel: 'intersectii' }, false); };", '  const intersectii = (): void => { taie(); };', 'e2e',
  '„Taie la intersecții” taie cu linia')
o('U03', E, "      { id: 'taie-intersectii', eticheta: numeScurt(t('editare.taiere.intersectii.taie')), activ: selectie.length > 0 && poate,",
  "      { id: 'taie-intersectii', eticheta: numeScurt(t('editare.taiere.intersectii.taie')), activ: false,", 'e2e',
  'rândul din meniul de clic dreapta, stins')

SETURI = {
    'forma': ['test/unit/taiere.forma.test.ts', 'test/unit/taiere.forma.oracol.test.ts'],
    'forma2': ['test/unit/taiere.forma.test.ts', 'test/unit/taiere.forma.oracol.test.ts', 'test/unit/taiere.test.ts',
               'test/unit/taiere.oracol.test.ts', 'test/unit/actiuni.calcul.test.ts', 'test/unit/actiuni.calcul.paritate.test.ts'],
}
E2E = ['test/e2e/taiere.spec.ts']
