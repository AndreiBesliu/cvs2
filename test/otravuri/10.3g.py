# Lista de otrăvuri a feliei 10.3↑g (Foarfeca, Retează și Desparte; ADR 0181 §4, §5), 08.11.2026, alese de autor: deschiderea
# conturului închis, lipirea de nod, capătul și clicul departe, bucata scoasă (pe închis și pe deschis), capetele căii care nu
# sunt locuri comune, contururile aceleiași piese ca parteneri, ștergerea formei rămase goale, forma de sub clic neaflată printre
# cele alese, partea pură (selecția păstrată, bucata de sub maus peste capăt, marcajul fără dubluri, locurile pe ambele forme) și
# șase legături din interfață (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
C = 'src/app/cutitCalcul.ts'
U = 'src/app/UnealtaCutit.tsx'
E = 'src/app/Editare.tsx'

# Foarfeca.
o('G01', T, '    if (!w || tr.length < (w.inchis && !deschide ? 2 : 1)) {', '    if (!w || tr.length < (w.inchis ? 2 : 1)) {', 'foarfeca',
  'un contur închis cu un singur loc nu se deschide (cercul rămâne întreg)')
o('G02', T, '  const x: Trecere = nod >= 0 ? { k: cel.w.inchis ? nod % n : nod, t: 0 } : cel.x.t >= 1 ? { k: cel.x.k + 1, t: 0 } : cel.x;',
  '  const x: Trecere = cel.x.t >= 1 ? { k: cel.x.k + 1, t: 0 } : cel.x;', 'foarfeca', 'clicul lângă un nod nu se lipește de el')
o('G03', T, "  if (!lov.w.inchis && (lam(lov.x) <= 1e-12 || lam(lov.x) >= m - 1e-12)) return 'capat';\n", '', 'foarfeca',
  'capătul unei căi deschise nu se refuză')
o('G04', T, '      if (r.d <= tol && (!cel || r.d < cel.d)) cel = { el, e, w, x: { k, t: r.t }, d: r.d };',
  '      if (!cel || r.d < cel.d) cel = { el, e, w, x: { k, t: r.t }, d: r.d };', 'foarfeca', 'un clic departe de contur taie totuși')
# Retezatul.
o('G05', T, '      ramase = [(inPrima ? b1 : b0) as FormaCale];', '      ramase = [(inPrima ? b0 : b1) as FormaCale];', 'foarfeca',
  'pe un contur închis rămâne bucata de sub clic, nu cealaltă')
o('G06', T, '    const scoasa = inainte ? 1 : 0;', '    const scoasa = 0;', 'foarfeca', 'pe o cale deschisă pleacă mereu prima bucată')
o('G07', T, '  const ls = farDubluri(w, toate, (y) => y).filter((y) => w.inchis || (lam(y) > 1e-9 && lam(y) < m - 1e-9));',
  '  const ls = farDubluri(w, toate, (y) => y);', 'foarfeca', 'capetele căii deschise (un „T”) devin locuri comune')
o('G08', T, '    if (!alese.has(e.instanta) || e.idLume === idLume || !seAting(cutieElement(e), A.cutie)) continue;',
  "    if (!alese.has(e.instanta) || e.idLume.split('/')[0] === idLume.split('/')[0] || !seAting(cutieElement(e), A.cutie)) continue;",
  'foarfeca', 'celelalte contururi ale aceleiași piese nu mai sunt parteneri („#”-ul dintr-o piesă)')
o('G09', T, '  if (elemente.length === 0) return { sterge: true };\n', '', 'foarfeca', 'o formă rămasă fără contururi nu se șterge')
o('G10', T, "    alese.add(c.id);\n    taieUna = (inst, p) => (inst.id === c.id ? reteaza(doc, indexFoaie, alese, inst, p, c) : null);",
  "    taieUna = (inst, p) => (inst.id === c.id ? reteaza(doc, indexFoaie, alese, inst, p, c) : null);", 'foarfeca',
  'forma de sub clic, neaflată printre cele alese, nu se retează')
# Partea pură a uneltei.
o('G11', C, '  return selectie.flatMap((id) => (plecate.has(id) ? [] : inlocuite.get(id) ?? [id]));',
  '  return selectie.flatMap((id) => (plecate.has(id) ? [] : [id]));', 'unealta', 'forma aleasă tăiată nu e înlocuită de bucățile ei')
o('G12', C, '    return { i, de: inainte ?? (l[l.length - 1] as number), pana: dupa ?? (l[0] as number), tot: false };',
  '    return { i, de: inainte ?? 0, pana: dupa ?? (l[0] as number), tot: false };', 'unealta',
  'bucata dinaintea primului loc nu mai vine peste capăt')
o('G13', C, '    for (let j = 1; j < n; j++) { const sj = f.s[j] as number; if (sj < pana) rez.push(f.puncte[j] as P); }',
  '    for (let j = 0; j < n; j++) { const sj = f.s[j] as number; if (sj < pana) rez.push(f.puncte[j] as P); }', 'unealta',
  'marcajul peste capăt are vârful 0 de două ori')
o('G14', C, '          (rez[j] as number[]).push((b.s[q] as number) + u * Math.hypot(sx, sy));\n', '', 'unealta',
  'locurile comune se scriu doar pe primul contur al perechii')
# Interfața (e2e).
o('H01', U, '        s.taie({ fel: s.mod, id, punct: { x, y }, toleranta: TOLERANTA_CLIC_PX / scara }, []);\n', '', 'e2e',
  'clicul foarfecii și al retezatului nu taie')
o('H02', U, '        setMarcaj(b ? subPolilinie(r.forme[b.i] as ConturAproximat, b.de, b.pana) : null);', '        setMarcaj(null);', 'e2e',
  'bucata de sub maus nu se mai arată')
o('H03', U, '        const v = onTaie({ doc: laCerere, degrupate: r.degrupate, ids: selectieDupa(alegerea, r.degrupate, r.sterse), sterse: r.sterse });',
  '        const v = onTaie({ doc: laCerere, degrupate: r.degrupate, ids: r.ids, sterse: r.sterse });', 'e2e',
  'după tăiere sunt alese bucățile noi (selecția nu mai rămâne)')
o('H04', E, '            aria-label={t(\'editare.noduri.desparte\')} data-editare="nod-desparte" onClick={desparteLaNod}>',
  '            aria-label={t(\'editare.noduri.desparte\')} data-editare="nod-desparte" onClick={() => undefined}>', 'e2e', 'Desparte nu face nimic')
o('H05', U, "        const text = cutit.fel === 'reteaza'", "        const text = cutit.fel === 'cale'", 'e2e', 'retezatul spune mesajul tăierii obișnuite')
o('H06', T, "    taieUna = (inst, p) => (inst.id === c.id ? foarfeca(inst, p, c) : null);",
  "    taieUna = (inst, p) => (inst.id === c.id ? reteaza(doc, indexFoaie, alese, inst, p, { ...c, fel: 'reteaza' }) : null);", 'e2e',
  'foarfeca retează în loc să despartă')

SETURI = {
    'foarfeca': ['test/unit/taiere.foarfeca.test.ts', 'test/unit/taiere.foarfeca.oracol.test.ts'],
    'foarfeca2': ['test/unit/taiere.foarfeca.test.ts', 'test/unit/taiere.foarfeca.oracol.test.ts', 'test/unit/taiere.forma.test.ts',
                  'test/unit/taiere.forma.oracol.test.ts', 'test/unit/taiere.cutit.test.ts'],
    'unealta': ['test/unit/cutitCalcul.test.ts'],
    'unealta2': ['test/unit/cutitCalcul.test.ts', 'test/unit/manual.test.ts'],
}
E2E = ['test/e2e/cutit.spec.ts']
