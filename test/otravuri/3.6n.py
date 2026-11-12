# Lista de otrăvuri a feliei 3.6n (grosimea verticală sub pereții treptelor, ADR 0191), 08.11.2026, alese de autor: banda bt
# și cheia ei, implicitul și alegerile, subsolul, uneltele (deschiderea, regularizarea „toată”, bucățile mici, filtrul și lățirea
# regiunilor înguste), plinul unui strat amestecat (marginea pereților, ce rămâne rar, partea plină, internul, memoria, rezerva),
# călcarea plinului peste inel, plus dialogul (prin e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FE = 'src/cam/feliere/fel.ts'
PR = 'src/cam/feliere/profil.ts'
GC = 'src/cam/feliere/gcode.ts'
TR = 'src/cam/feliere/trepte.ts'
ST = 'src/cam/feliere/straturi.ts'
CA = 'src/cam/feliere/campuri.ts'
DD = 'src/app/DialogDinDesen.tsx'

# Banda bt și cheia.
o('N01', FE, 'banda(Math.min(k + sus - 1, n))', 'banda(Math.min(k + sus, n))', 'trepte', 'raza plinului de sus cu un strat prea lungă')
o('N02', FE, "const bt = s.grosimeVerticala === 'ensure_all' && b1 >= 0 && bs >= 0 ?", 'const bt = b1 >= 0 && bs >= 0 ?', 'trepte',
  'inelul și la celelalte moduri')
o('N03', FE, 'bt: nr(x[8]) ?? b,', 'bt: b,', 'trepte', 'cheia citită fără bt')
o('N04', FE, "${bt !== b ? `:${bt}` : ''}", '', 'trepte', 'cheia scrisă fără bt')
# Implicitul, alegerile, subsolul.
o('P01', PR, "jos: c.jos, grosimeVerticala: 'ensure_all',", "jos: c.jos, grosimeVerticala: 'ensure_moderate',", 'trepte', 'implicitul altul decât al profilelor K1C')
o('P02', PR, 'tipFusta: FUSTE, grosimeVerticala: GROSIMI_VERTICALE,', 'tipFusta: FUSTE,', 'trepte', 'alegerea din browser ignorată')
o('G01', GC, '    `; ensure_vertical_shell_thickness = ${s.grosimeVerticala}`,\n', '', 'trepte', 'subsolul fără grosimea verticală')
# Uneltele.
o('T01', TR, 'const r1 = 0.325 * ms, r2 = 0.6 * ms, r3 = 0.2 * ms;', 'const r1 = 0.325 * ms, r2 = 0.6 * ms, r3 = 0;', 'trepte', 'plinul nelărgit cu r3')
o('T02', TR, '  const e1 = laDistantaFigura(S, r1);', '  const e1 = laDistantaFigura(S, r1 / 10);', 'trepte', 'deschiderea „toată” prea mică')
o('T03', TR, '    if (a >= 8 * ms) return true;', '    if (a >= 0) return true;', 'trepte', 'bucățile mici păstrate')
o('T04', TR, '    return gz !== undefined && a >= 0.95 * gz.a;', '    return false;', 'trepte', 'o bucată mică scoasă și când acoperă internul')
o('T05', TR, "mod === 'none' ? 0.5 : mod === 'ensure_critical_only' ? 0.2 : 0", "mod === 'none' ? 0.2 : mod === 'ensure_critical_only' ? 0.5 : 0", 'trepte',
  'filtrele „fără” și „doar critic” schimbate între ele')
o('T06', TR, "const m = (mod === 'none' ? 1 : 3) * wP;", 'const m = 3 * wP;', 'trepte', 'lățirea „fără” cu 3 linii')
o('T07', TR, '    if (e.length === 0) inguste.push(g);', '    inguste.push(g);', 'trepte', 'toate regiunile lățite, și cele late')
o('T08', TR, 'const f = faraRar ? 1 :', 'const f = false ? 1 :', 'trepte', 'fără umplere rară, filtrul de o linie uitat')
o('T09', TR, '  const adaos = combina([{ c: contururiRegiuni(lat), compl: true }, { c: I, compl: true }]);', '  const adaos = contururiRegiuni(lat);', 'trepte',
  'lățirea iese din intern')
o('T10', TR, '  const d = laDistantaFigura(contururiRegiuni(e), -(m + 1e-3));', '  const d = laDistantaFigura(contururiRegiuni(e), -(m + 0.05));', 'trepte',
  'deschiderea lărgită la loc prea mult')
# Plinul unui strat amestecat.
o('S01', ST, '    return d + (s.pereti > 1 ? s.wInterior : s.wExterior) / 2;', '    return d;', 'trepte', 'marginea pereților la mijlocul ultimului')
o('S02', ST, "rez = typeof F === 'string' ? F : combina([{ c: R(bs), compl: true }, { c: F, compl: true }]);", "rez = typeof F === 'string' ? F : R(bs);", 'trepte',
  'rarul nescăzut de pereții benzii de sus (fără inel)')
o('S03', ST, 'const plin = b1 >= 0 && (bs !== b1 || t.bt !== b), cuS', 'const plin = b1 >= 0 && bs !== b1, cuS', 'trepte', 'fața treptei fără inelul plin')
o('S04', ST, ', cuS = plin && bs >= 0;', ', cuS = false;', 'trepte', 'plinul nelucrat (drumul de la 3.6l)')
o('S05', ST, "return typeof S === 'string' ? S : [{ c: R(b1), compl: true }, { c: S }]; }", "return typeof S === 'string' ? S : [{ c: R(bs), compl: true }, { c: S }]; }",
  'trepte', 'ce scoate filtrul îngust nu redevine rar')
o('S06', ST, "      return typeof S === 'string' ? S0 : S;", '      return S0;', 'trepte', 'plinul neregularizat')
o('S07', ST, '      if (t.bt === t.b) return R(t.bs);', '      if (true) return R(t.bs);', 'trepte', 'călcarea plinului fără inel')
o('S08', ST, "      const I = t.b1 !== b ? combina([{ c: A, compl: true }, { c: R(t.b1), compl: true }]) : A;", '      const I = A;', 'trepte',
  'plinul și peste fața treptei')
o('S09', ST, 'const k = `${b}|${i}|${t.b1}|${t.bs}|${t.bt}`;', 'const k = `${b}|${i}|${t.b1}|${t.bs}`;', 'trepte',
  'memoria plinului fără bt (straturile cu și fără inel amestecate)')
# Dialogul (prin e2e).
o('E01', DD, '(tr.bs !== tr.b1 || tr.bt !== tr.b)', 'tr.bs !== tr.b1', 'e2e', 'stratul cu inel nu-și spune plinul')
o('E02', CA, "    { k: 'grosimeVerticala', unitate: '', pas: 1, optiuni: GROSIMI_VERTICALE },\n", '', 'e2e', 'setarea lipsește din „Avansat”')

SETURI = {
    'trepte': ['test/unit/imprimanta.feliere.trepte.test.ts'],
    'trepte2': ['test/unit/imprimanta.feliere.trepte.test.ts', 'test/unit/imprimanta.feliere.test.ts', 'test/unit/imprimanta.feliere.recenzie.test.ts',
                'test/unit/imprimanta.feliere.modele.test.ts'],
}
E2E = ['test/e2e/imprimanta.spec.ts']
