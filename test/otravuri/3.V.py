# Lista de otrăvuri a feliei 3.V (degajările pe colțurile cu arce, ADR 0135), 05.11.2026, alese de autor: colțul (sensul
# rupturii, ruptura minimă, restul), Q (decalatele liniilor și ale arcelor, intersecțiile, piciorul pe segment, încrucișarea,
# pereții întregi), E (bisectoarea, tangenta arcului, regula egalității la T-bone, lungimea peretelui), pereții din V la d
# (ADR 0135 §4) și plasa din exportul lucrării (§5).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DG = 'src/cam/degajari.ts'
JB = 'src/cam/job.ts'

# Colțul (§1).
o('C01', DG, '  if (!(kDreapta ? cruce > 0 : cruce < 0)) return null;', '  if (!(kDreapta ? cruce < 0 : cruce > 0)) return null;', 'arce',
  'colțul cu arc e cel convex pentru K, nu cel concav')
o('C02', DG, '  if (!(cosJumatate > 0) || R / cosJumatate - R < REST_MINIM) return null;', '  if (!(cosJumatate > 0)) return null;', 'arce',
  'fără ruptura minimă: o joncțiune netedă e colț dacă decalatele pereților se taie mai departe')
o('C03', DG, '  if (!q || cel - R < REST_MINIM) return null;\n  const u', '  if (!q) return null;\n  const u', 'arce',
  'fără restul minim |QV| − R ≥ 0,01')
# Q (§2).
o('Q01', DG, '  const r = (s.bulge > 0) === laStanga ? raza - R : raza + R;', '  const r = (s.bulge > 0) === laStanga ? raza + R : raza - R;', 'arce',
  'arcul se decalează spre partea greșită (spre K)')
o('Q02', DG, '    const semn = laStanga ? 1 : -1;', '    const semn = laStanga ? -1 : 1;', 'arce', 'linia se decalează spre partea greșită (spre K)')
o('Q03', DG, '  const pIn = peretele(false), pOut = peretele(true);', '  const pIn = peretele(false).slice(0, 1), pOut = peretele(true).slice(0, 1);', 'arce',
  'doar segmentele din V, nu pereții întregi (piciorul pe un arc mai departe nu mai găsește Q)')
o('Q04', DG, '        if (!seIncruciseaza(x.dec, y.dec, z) || !piciorPeSegment(z, x.a, x.b, x.s) || !piciorPeSegment(z, y.a, y.b, y.s)) continue;',
  '        if (!piciorPeSegment(z, x.a, x.b, x.s) || !piciorPeSegment(z, y.a, y.b, y.s)) continue;', 'arce',
  'și o atingere a decalatelor (o joncțiune netedă) e un Q')
o('Q05', DG, '  return rel <= Math.abs(baleiaj) + 1e-9 || rel >= 2 * Math.PI - 1e-9;', '  return true;', 'arce',
  'piciorul pe arc nu se mai cere în baleiajul lui')
o('Q06', DG, '    return t >= -1e-9 && t <= 1 + 1e-9;', '    return true;', 'arce', 'piciorul pe linie nu se mai cere între capete')
o('Q07', DG, '  return [-b - rd, -b + rd].map((t) => ({ x: l.p.x + t * l.d.x, y: l.p.y + t * l.d.y }));',
  '  return [-b + rd].map((t) => ({ x: l.p.x + t * l.d.x, y: l.p.y + t * l.d.y }));', 'arce', 'dreapta și cercul: doar una dintre intersecții')
o('Q08', DG, '  return [{ x: mx - (h * dy) / d, y: my + (h * dx) / d }, { x: mx + (h * dy) / d, y: my - (h * dx) / d }];',
  '  return [{ x: mx - (h * dy) / d, y: my + (h * dx) / d }];', 'arce', 'două cercuri: doar una dintre intersecții')
o('Q09', DG, '        if (d < cel) { cel = d; q = z; }', '        if (d > cel || cel === Infinity) { cel = d; q = z; }', 'arce',
  'Q e intersecția cea mai depărtată de V, nu cea mai apropiată')
# E (§3) și pereții.
o('E01', DG, '  if (!q || cel - R < REST_MINIM) return null;\n  const u = unitar(dOut.x - dIn.x, dOut.y - dIn.y);',
  '  if (!q || cel - R < REST_MINIM) return null;\n  const u = unitar(dOut.x + dIn.x, dOut.y + dIn.y);', 'arce', 'bisectoarea greșită la colțul cu arc')
o('E02', DG, '  const fi = (la === 0 ? -2 : 2) * Math.atan(s.bulge);', '  const fi = (la === 0 ? 2 : -2) * Math.atan(s.bulge);', 'arce',
  'tangenta arcului în capăt e coarda rotită în sensul greșit')
o('E03', DG, '    const Lin = lungimePerete(c, i, false), Lout = lungimePerete(c, i, true);\n    const d = Lout < Lin - EPS_LATURA ? dOut : dIn;',
  '    const Lin = lungimePerete(c, i, false), Lout = lungimePerete(c, i, true);\n    const d = Lout <= Lin + EPS_LATURA ? dOut : dIn;', 'arce',
  'la egalitate, crestătura pe normala peretelui de după V')
o('E04', DG, '    const Lin = lungimePerete(c, i, false), Lout = lungimePerete(c, i, true);',
  '    const Lin = lungimeSegment(prev.p, v.p, prev.s), Lout = lungimeSegment(v.p, next.p, v.s);', 'arce',
  'peretele T-bone-ului e doar segmentul din V (prima biarcă, primul arc)')
o('E05', DG, '  return Math.abs(baleiaj) * raza;', '  return coarda;', 'arce', 'lungimea arcului e coarda lui')
o('E06', DG, '  return tIn !== null && tOut !== null && Math.abs(cruce2(tIn, tOut)) <= NETED && scalar(tIn, tOut) > 0;',
  '  return tIn !== null && tOut !== null && scalar(tIn, tOut) > 0;', 'arce', 'orice joncțiune fără întoarcere e netedă (pereții trec de colțuri)')
o('E07', DG, '    if (j === i || !jonctiuneNeteda(c, j)) break;', '    break;', 'arce', 'peretele se oprește după primul segment')
# Pereții din V la d (§4).
o('P01', DG, '  const dinV = new Set(i >= 0 ? [...segmentePerete(element, i, true), ...segmentePerete(element, i, false)] : []);',
  '  const dinV = new Set(i >= 0 ? [i, (i - 1 + element.varfuri.length) % element.varfuri.length] : []);', 'arce',
  'la d se sar doar cele două segmente din V (regula de dinainte de ADR 0135 §4)')
# Plasa (§5), în exportul lucrării.
o('J01', JB, "        avertismente.push(`${t.idLume}: degajarea omisă la colțul (${c.v.x.toFixed(3)}, ${c.v.y.toFixed(3)}): freza nu ajunge în colț`);\n", '',
  'arce', 'plasa nu mai spune nimic')
o('J02', JB, '        if ((candidati[it] ?? []).some((x) => aici(x.d.v, c.v))) continue;\n', '', 'arce', 'plasa se spune și la colțurile candidate')
o('J03', JB, '        if (!bucle.some((b) => distantaLaContur(c.v, b) <= (2 * R) / c.cosJumatate)) continue;\n', '', 'arce',
  'plasa se spune și unde nicio buclă nu ajunge la colț')
o('J04', JB, '        if (!bucle.some((b) => distantaLaContur(c.v, b) <= (2 * R) / c.cosJumatate)) continue;',
  '        if (!bucle.some((b) => distantaLaContur(c.v, b) <= R)) continue;', 'arce', 'plasa cere bucla la R de colț, nu la 2R / cos(φ/2)')


SETURI = {
    'arce': [
        'test/unit/cam.degajari.arce.test.ts', 'test/unit/degajari.arce.oracol.test.ts', 'test/unit/degajari.arce.corpus.oracol.test.ts',
        'test/unit/cale.recenzie.test.ts', 'test/unit/cam.degajari.bucla.test.ts', 'test/unit/degajari.bucla.oracol.test.ts',
    ],
}
