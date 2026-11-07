# Lista de otrăvuri a feliei 10.3↑ (tăierea cu o linie dreaptă; ADR 0180), 06.11.2026, alese de autor: locurile de tăiere (partea
# față de linie, poziția de-a lungul ei, linia, arcul, cubica, nodurile pe linie, atingerile, latura pe linie), bucățile (nodurile
# noi, rescalarea pe același segment, locul trecerilor, arcul cercului), închiderea (perechile corzilor, sensul pieselor, partea),
# operațiile (latura frezei pe o bucată deschisă, rolul, baza fiecărei operații, buzunarul pe bucăți deschise), refuzurile, acțiunea
# și trei legături din panou (e2e).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


T = 'src/model/taiere.ts'
C = 'src/ui/actiuniDocumentCalcul.ts'
P = 'src/app/PanouTaiere.tsx'
E = 'src/app/Editare.tsx'

# Locurile de tăiere.
o('L01', T, "(L.axa === 'x' ? p.x : p.y) - L.v;", "(L.axa === 'x' ? p.y : p.x) - L.v;", 'taiere', 'partea față de linie, pe axa greșită')
o('L02', T, "(L.axa === 'x' ? p.y : p.x);", "(L.axa === 'x' ? p.x : p.y);", 'taiere', 'poziția de-a lungul liniei, pe axa greșită (corzile)')
o('L03', T, '[fa / (fa - fb)]', '[fb / (fb - fa)]', 'taiere', 'linia: parametrul de la celălalt capăt')
o('L04', T, 'Math.atan2(semn * h, d)', 'Math.atan2(semn * h, -d)', 'taiere', 'arcul: unghiul trecerii, oglindit')
o('L05', T, '      const t = rel / Math.abs(baleiaj);', '      const t = rel / baleiaj;', 'taiere', 'arcul orar: parametrul negativ, trecerea pierdută')
o('L06', T, 'if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;', 'if ((fm < 0) === (flo < 0)) hi = m; else { lo = m; flo = fm; }',
  'taiere', 'cubica: înjumătățirea pe partea greșită')
o('L07', T, 'radacini2(d0 - 2 * d1 + d2, 2 * (d1 - d0), d0)', 'radacini2(d0 - 2 * d1 + d2, 2 * (d1 - d0), d2)', 'taiere',
  'cubica: extremele greșite, deci bucăți nemonotone')
o('L08', T, '    if (inainte === 0 || dupa === 0 || inainte === dupa) continue;', '    if (inainte === 0 || dupa === 0) continue;', 'taiere',
  'o atingere într-un nod taie')
o('L09', T, "    if (lungime > 1) return 'pe-linie';", "    if (lungime > 2) return 'pe-linie';", 'taiere', 'latura pe linie, cu forma de ambele părți, nu se refuză')
o('L10', T, "      if ((peA && Math.hypot(q.x - a.x, q.y - a.y) <= eps(a)) || (peB && Math.hypot(q.x - b.x, q.y - b.y) <= eps(b))) continue;\n", '',
  'taiere', 'arcul: trecerea dintr-un nod pe linie, numărată de două ori')
# Bucățile.
o('B01', T, '    const t = urm && urm.k === x.k && urm.t > 0 ? x.t / urm.t : x.t;', '    const t = x.t;', 'taiere',
  'două treceri pe același segment: a doua fără rescalare')
o('B02', T, '    else { inserate++; locuri.push(x.k + inserate); }', '    else { locuri.push(x.k + inserate); inserate++; }', 'taiere',
  'locul trecerii, cu un nod mai devreme')
o('B03', T, '{ tip: \'A\', bulge: Math.tan((urm - x) / 4) }', '{ tip: \'A\', bulge: Math.tan((urm - x) / 2) }', 'taiere',
  'arcul cercului tăiat, cu baleiajul dublu')
o('B04', T, '        if (inchide) bucatiInchise.push(b);', '        if (true) bucatiInchise.push(b);', 'taiere', 'se închide și fără bifă')
# Închiderea.
o('I01', T, '    for (let k = 0; k + 1 < ordine.length; k += 2) {', '    for (let k = 1; k + 1 < ordine.length; k += 2) {', 'taiere',
  'corzile, împerecheate 2–3, 4–5')
o('I02', T, '      intoarsa = (bucati[j] as Bucata).pana === alta;', '      intoarsa = false;', 'taiere', 'ciclul nu întoarce bucata care se termină în trecere')
o('I03', T, '      const parte: -1 | 1 = parteContur(L, bl) < 0 ? -1 : 1;', '      const parte: -1 | 1 = parteContur(L, bl) > 0 ? -1 : 1;', 'taiere',
  'părțile, întoarse')
# Operațiile.
o('O01', T, "(latura === 'exterior') === e.exteriorDreapta ? 'dreapta' : 'stanga';", "(latura === 'exterior') === e.exteriorDreapta ? 'stanga' : 'dreapta';",
  'taiere', 'bucata deschisă, tăiată pe partea cealaltă a frezei')
o('O02', T, '    const trig = w.inchis ? arieCuSemn(w) > 0 : null;', '    const trig = w.inchis ? arieCuSemn(w) < 0 : null;', 'taiere',
  'sensul formei, întors')
o('O03', T, '  if (rol !== null) {', "  if (rol === 'niciunul') {", 'taiere', 'rolul piesei nu se mai păstrează')
o('O04', T, "        const baza = p.operatii.find((o) => o.tip === x.tip && (o.tip !== 'profil' || o.latura === x.latura)) ?? (p.operatii[0] as Operatie);",
  '        const baza = p.operatii[0] as Operatie;', 'taiere', 'rolul: toate operațiile din prima (gaura cu adâncimea exteriorului)')
o('O05', T, "      } else if (e.fel === 'deschis' && o.tip !== 'profil') {\n        scoase++;\n        continue;\n      }", "      }", 'taiere',
  'buzunarul rămâne pe o bucată deschisă dintr-o cale deschisă')
o('O06', T, "        if (o.tip !== 'profil') { scoase++; continue; }", "        if (o.tip !== 'profil') { continue; }", 'taiere',
  'operațiile scoase nu se numără')
# Refuzurile și acțiunea.
o('R01', T, "    if ((folosiri.get(p.id) ?? 0) > 1) return { ok: false, motiv: 'impartita' };", "    if ((folosiri.get(p.id) ?? 0) > 2) return { ok: false, motiv: 'impartita' };",
  'taiere', 'o piesă pusă de două ori se taie')
o('R02', C, "  if (t.doc !== h.doc) return { ok: false, motiv: 'editare.taiere.motiv.veche' };\n", '', 'taiere', 'o tăiere calculată pe un desen vechi se aplică')
# Panoul (e2e).
o('U01', P, "    return localStorage.getItem(CHEIE_INCHIDE) !== '0';", '    return true;', 'e2e', '„Închide bucățile” nu se ține după reîncărcare')
o('U02', E, '      {panouTaiere && linieTaiere && !vedere3d ? (', '      {false && linieTaiere && !vedere3d ? (', 'e2e', 'linia nu se vede pe pânză')
o('U03', E, '                    centru={p.cutie ? { x: (p.cutie.minX + p.cutie.maxX) / 2, y: (p.cutie.minY + p.cutie.maxY) / 2 } : null}',
  '                    centru={null}', 'e2e', 'X nu pornește din mijlocul formelor alese')

SETURI = {
    'taiere': ['test/unit/taiere.test.ts', 'test/unit/taiere.oracol.test.ts'],
    'taiere2': ['test/unit/taiere.test.ts', 'test/unit/taiere.oracol.test.ts', 'test/unit/actiuni.calcul.test.ts', 'test/unit/actiuni.calcul.paritate.test.ts'],
}
E2E = ['test/e2e/taiere.spec.ts']
