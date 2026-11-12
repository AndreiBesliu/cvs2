# Lista de otrăvuri a feliei 10.3↑f (unealta Cuțit: Linie, Pen, Liber, Formă; ADR 0181 §1), 08.11.2026, alese de autor:
# buclele libere (pornirea, ambele părți, adâncimea, latura, refuzul cuțitului încrucișat, numărarea, forma și locul lor),
# cuțitul din mai multe forme și scoaterea lui dintre ținte, netezirea mâinii libere și refuzul toleranței, partea pură a
# uneltei (țintele, calea, Pen-ul, plafonul locurilor) și cinci legături din interfață (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
C = 'src/app/cutitCalcul.ts'
U = 'src/app/UnealtaCutit.tsx'
D = 'src/app/desenCalcul.ts'

# Buclele libere.
o('F01', T, '  if (K.inchis && inchide && R.length > 0) {', '  if (false) {', 'cutit', 'un cuțit închis dinăuntrul plăcii nu mai taie')
o('F02', T, '  for (const parte of parti) {\n    const inParte', '  for (const parte of parti.slice(1)) {\n    const inParte', 'cutit',
  'bucla liberă lipsește din partea dinăuntru')
o('F03', T, 'inversLatura: adancime % 2 !== l.adancime % 2 });', 'inversLatura: false });', 'cutit',
  'pe o piesă fără rol, golul nou ia latura conturului exterior')
o('F04', T, '      const adancime = [...inParte, ...bucle].filter(', '      const adancime = [...inParte].filter(', 'cutit',
  'adâncimea buclei nu numără celelalte bucle (mijlocul literei)')
o('F05', T, "  if (libere.length > 0 && K.proprii.some(inR)) return 'cutit';\n", '', 'cutit',
  'un cuțit închis care se încrucișează în placă nu se refuză')
o('F06', T, '  if (locuri.length === 0 && libere.length === 0) return null;', '  if (locuri.length === 0) return null;', 'cutit',
  'fără niciun loc comun, buclele libere nu taie')
o('F07', T, '  return { noi, intregi, libere, taiate: Math.max(taiate, libere.length > 0 ? 1 : 0) };',
  '  return { noi, intregi, libere, taiate };', 'cutit', 'placa tăiată doar de bucle nu se numără')
o('F08', T, '        forma: ek ? ek.forma : {', '        forma: ek && false ? ek.forma : {', 'cutit',
  'bucla dintr-un cerc devine cale (cercul nu mai rămâne cerc)')
o('F09', T, '        matrice: ek ? compune(mi1, ek.matrice) : IDENTITATE,', '        matrice: ek ? ek.matrice : IDENTITATE,', 'cutit',
  'bucla rămâne în coordonatele foii, nu ale piesei (placa mutată din origine)')
# Cuțitul din forme și țintele lui.
o('F10', T, '    for (const id of ids) alese.delete(id);\n', '', 'cutit', 'formele-cuțit alese se taie și ele')
o('F11', T, '  for (const id of ids) {\n    const inst = doc.foi[indexFoaie]?.instante.find((i) => i.id === id);',
  '  for (const id of ids.slice(0, 1)) {\n    const inst = doc.foi[indexFoaie]?.instante.find((i) => i.id === id);', 'cutit',
  'din mai multe forme-cuțit, doar prima taie')
# Mâna liberă.
o('F12', T, '    if (v) f = { ...f, varfuri: v };\n', '', 'cutit', 'urma mâinii libere nu se netezește')
o('F13', T, "    if (!(c.netezire > 0) || !Number.isFinite(c.netezire)) return 'valoare';\n", '', 'cutit',
  'o toleranță a netezirii 0 sau NaN nu se refuză')
# Partea pură a uneltei.
o('F14', C, '  return ids.filter((id) => !k.has(id));', '  return [...ids];', 'unealta', 'cuțitul e printre formele de tăiat')
o('F15', C, '  const ids = selectie.length > 0 ? selectie : (doc.foi[indexFoaie]?.instante ?? []).map((i) => i.id);',
  '  const ids = selectie;', 'unealta', 'fără alegere, nu se taie nimic (răspunsul 2a pierdut)')
o('F16', C, '  if (v.length < 2 || !(lungimeUrma(v.map((x) => x.p)) >= minim)) return null;', '  if (v.length < 2) return null;', 'unealta',
  'un gest prea scurt taie')
o('F17', C, "    s: v.s.tip === 'C' ? { tip: 'C', c1: m(v.s.c1), c2: m(v.s.c2) }", "    s: v.s.tip === 'C' ? { tip: 'C', c1: v.s.c1, c2: v.s.c2 }", 'unealta',
  'mânerele Pen-ului rămân în originea căii')
o('F18', C, '          if (rez.length >= maxim) return rez;\n', '', 'unealta', 'locurile arătate trec de plafon')
# Interfața (e2e).
o('E01', U, "        if (cale) s.taie({ fel: 'cale', cale }, []);\n", '', 'e2e', 'Linia nu taie la ridicarea mausului')
o('E02', U, '      if (m.shift) {', '      if (m.shift && false) {', 'e2e', 'Shift + clic taie, în loc să adune forma în cuțit')
o('E03', U, "      {mod === 'pen' ? pen({ termina: (f) => { const c = caleDinPen(f); if (c) taie({ fel: 'cale', cale: c }, []); }, sfat }) : (",
  "      {mod === 'pen' ? pen({ termina: () => undefined, sfat }) : (", 'e2e', 'Pen-ul cuțitului termină fără să taie')
o('E04', D, " n: 'noduri', k: 'cutit', b: 'pen',", " n: 'noduri', b: 'pen',", 'e2e', 'tasta K nu alege Cuțitul')
o('E05', U, "  const locuri = useMemo(() => (urma && tinte ? locuriAproximative(urma.fel === 'linie' ? [urma.a, urma.b] : urma.puncte, tinte) : []), [urma, tinte]);",
  '  const locuri: Array<{ x: number; y: number }> = [];', 'e2e', 'locurile unde taie nu se mai arată cât tragi')
o('E06', U, '      calc.taieVectorii(laCerere, { cutit, alese, inchide }, s.signal).then((r) => {',
  '      calc.taieVectorii(laCerere, { cutit, alese, inchide: false }, s.signal).then((r) => {', 'e2e',
  'bifa „Închide bucățile” nu ajunge la tăiere (textul nu mai decupează placa)')

SETURI = {
    'cutit': ['test/unit/taiere.cutit.test.ts', 'test/unit/taiere.cutit.oracol.test.ts'],
    'cutit2': ['test/unit/taiere.cutit.test.ts', 'test/unit/taiere.cutit.oracol.test.ts', 'test/unit/taiere.forma.test.ts',
               'test/unit/taiere.forma.oracol.test.ts', 'test/unit/taiere.decupare.test.ts', 'test/unit/taiere.decupare.oracol.test.ts'],
    'unealta': ['test/unit/cutitCalcul.test.ts'],
    'unealta2': ['test/unit/cutitCalcul.test.ts', 'test/unit/manual.test.ts'],
}
E2E = ['test/e2e/cutit.spec.ts', 'test/e2e/taste-unelte.spec.ts']
