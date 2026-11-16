# Lista de otrăvuri a feliei 25.3↑d (punctele pierdute de linia mediană, ADR 0222 §5), 16.11.2026, alese de autor: pasul pe
# bucățile de cerneală (8-vecinătatea, axa principală, lungimea între centrele pixelilor, grosimea plafonată de cercul înscris
# și toleranța lui), punctele (căile scoase), dreapta pusă unei bucăți lungi fără cale (capetele în centrele capetelor) și
# legarea căilor de bucăți. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara
# Drive-ului), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ME = 'src/trasare/mediana.ts'

o('D01', ME, '  return { cai, latimi, jonctiuni: locuri.size, puncte: bucati(m, W, H, cai, latimi, varf) };',
  '  return { cai, latimi, jonctiuni: locuri.size, puncte: 0 };', 'nuc', 'fără pasul pe bucăți: punctele pierdute, liniuțele rămân')
o('D02', ME, '    const scurta = b - a < g + 0.5;', '    const scurta = b - a + 1 < g + 0.5;', 'nuc',
  'lungimea din pixeli, nu dintre centrele lor: discul mic pixelat 3 × 2 iese liniuță')
o('D03', ME, '    const g = Math.min(d - c + 1, 2 * raza(m, W, H, centru) + 1);', '    const g = d - c + 1;', 'nuc',
  'grosimea fără cercul înscris: un „o” sau un „+” mic iese punct')
o('D04', ME, '    const g = Math.min(d - c + 1, 2 * raza(m, W, H, centru) + 1);', '    const g = Math.min(d - c + 1, 2 * raza(m, W, H, centru));', 'nuc',
  'cercul înscris fără toleranța diagonalei: discul neted de 7 px iese liniuță')
o('D05', ME, '    if (scurta) for (const i of aici) scoase.add(i);\n', '', 'nuc',
  'punctul își păstrează liniuța; cu capetele în vârf, bucata scurtă are și liniuța, și dreapta axei')
o('D06', ME, '    } else if (scurta || aici.length === 0) {', '    } else if (scurta) {', 'nuc', 'bucata lungă ștearsă de subțiere rămâne fără linie')
o('D11', ME, '    } else if (scurta || aici.length === 0) {', '    } else if (aici.length === 0) {', 'nuc',
  'cu capetele în vârf, bucata scurtă rămâne fără linie (punctul lui „i” pierdut)')
o('D07', ME, '      const r = varf ? 0 : g / 2, i0 = a - 0.5 + r, i1 = b + 0.5 - r, X = cx + 0.5, Y = cy + 0.5;',
  '      const r = varf ? 0 : g / 2, i0 = a + r, i1 = b - r, X = cx + 0.5, Y = cy + 0.5;', 'nuc',
  'dreapta pusă bucății, între centrele pixelilor de la capete, nu între marginile lor')
o('D12', ME, '      const r = varf ? 0 : g / 2, i0 = a - 0.5 + r, i1 = b + 0.5 - r, X = cx + 0.5, Y = cy + 0.5;',
  '      const r = g / 2, i0 = a - 0.5 + r, i1 = b + 0.5 - r, X = cx + 0.5, Y = cy + 0.5;', 'nuc',
  'cu capetele în vârf, dreapta axei tot între centrele capetelor')
o('D08', ME, '    const t = 0.5 * Math.atan2(2 * (sxy / n - cx * cy), sxx / n - cx * cx - (syy / n - cy * cy)), ux = Math.cos(t), uy = Math.sin(t);',
  '    const t = 0, ux = Math.cos(t), uy = Math.sin(t);', 'nuc', 'axa mereu orizontală: o trăsătură scurtă oblică iese punct')
o('D09', ME, '      for (let k = 0; k < 8; k++) {\n        const xx = x + (DX[k] ?? 0), yy = y + (DY[k] ?? 0), q = yy * W + xx;',
  '      for (let k = 0; k < 8; k += 2) {\n        const xx = x + (DX[k] ?? 0), yy = y + (DY[k] ?? 0), q = yy * W + xx;', 'nuc',
  'bucățile pe 4-vecinătate: o linie oblică subțire se rupe în puncte')
o('D10', ME, '    for (let k = -1; k < 8; k++) {', '    for (let k = -1; k < 0; k++) {', 'nuc',
  'calea legată doar de pixelul de sub primul ei punct (fără vecini)')

SETURI = {
    'nuc': ['test/unit/trasare.mediana.test.ts', 'test/unit/trasare.mediane.culori.test.ts'],
}
E2E = []
