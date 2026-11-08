# Lista de otrăvuri a feliei 25.3↑b (opțiunile liniei mediane, ADR 0223), 08.11.2026, alese de autor: capetele în vârf (și
# direcția lor, din porțiunea dreaptă), părțile late (miezul, deschiderea cu jumătatea de pixel, resturile alipite, pragul
# automat, semnalarea, retrasarea pe rest, capetele lipite de contur, laturile contururilor), buclele ca vectori închiși
# (încuibarea), ieșirea (`peLinie`, contururile pentru semnalare, numărătorile), calculul și ușa (pragul în mm, transferul,
# laturile), fereastra prin e2e. Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara
# Drive-ului), după commit, cu CNCVS2_E2E_RETEA=127.0.6 și configul local pe portul 4179 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


ME = 'src/trasare/mediana.ts'
PL = 'src/trasare/partiLate.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
IM = 'src/io/imagine.ts'
FE = 'src/ui/FereastraTrasare.tsx'

# ---- Capetele în vârf ----
o('V01', ME, '  if (varf) {', '  if (false) {', 'nuc', 'capetele rămân în centrul capătului')
o('V02', ME, '    while (j + 1 <= i1 && abatereDreptei(P.slice(2 * i0, 2 * (j + 2))) <= MEDIANA.drept) j++;', '    j = i1;', 'nuc',
  'direcția vârfului din dreapta celor 1,5 grosimi: talpa lui „t” iese oblic, în colț')

# ---- Părțile late ----
o('L01', PL, 'Math.sqrt(d2[p] ?? 0) - 0.5 >= R0)', 'Math.sqrt(d2[p] ?? 0) - 0.5 >= R0 / 2)', 'nuc', 'miezul cu raza pe jumătate: trăsăturile devin late')
o('L02', PL, '  const R = R0 + 0.5;', '  const R = R0;', 'nuc', 'deschiderea fără jumătatea de pixel: golul inelului gros la 0,77 px')
o('L03', PL, '  if (miez > 0) alipesteResturile(f, T, W, H, R, laMiez, lata, subtire);', '', 'nuc',
  'resturile (colțurile rotunjite, fâșia de pe margini) rămân: zeci de cioturi în jurul blocurilor')
o('L04', PL, '      if (dn > 2 * R0 + 1) departe = true;', '', 'nuc', 'orice bucată care atinge partea lată i se alipește: și trăsăturile lipite de ea')
o('L05', PL, '    if (!atinge || departe) continue;', '    if (departe) continue;', 'nuc', 'și bucățile care nu ating partea lată i se alipesc (un punct de lângă ea)')
o('L06', ME, '    const pragPx = om.pragLatPx ?? 2 * grosime;', '    const pragPx = om.pragLatPx ?? 3 * grosime;', 'nuc', 'pragul automat de trei ori grosimea')
o('L07', ME, "  if ((om.semnaleaza || om.late === 'contur') && grosime > 0) {", "  if (om.late === 'contur' && grosime > 0) {", 'nuc',
  'semnalarea nu caută părțile late')
o('L08', ME, '      L = linii(pl.subtire, T, W, H, varf);\n', '', 'nuc', 'liniile nu se retrasează pe rest: trec prin partea lată')
o('L09', ME, '      lipeste(L.cai, pl.laMiez, W, H, pl.R0, grosime);\n', '', 'nuc', 'capetele de lângă partea lată nu ajung pe conturul ei (o punte)')
o('L10', ME, '      if (!(d(x, y) <= R0 + w)) continue;', '      if (!(d(x, y) <= R0 + 0.5)) continue;', 'nuc',
  'capetele lipite căutate doar pe contur: niciunul, cum centrul capătului stă la o jumătate de grosime')
o('L11', ME, '    exterior[k] = arie(late[j] ?? new Float64Array(0)) > 0 ? 1 : 0;', '    exterior[k] = 0;', 'nuc', 'contururile părților late pe interior')
o('L12', ME, '    peLinie[k] = 0;\n    exterior[k] = arie(', '    exterior[k] = arie(', 'nuc', 'contururile părților late tăiate pe linie')

# ---- Buclele ca vectori închiși ----
o('B01', ME, '    exteriorBucla.set(c, n % 2 === 0 ? 1 : 0);', '    exteriorBucla.set(c, 1);', 'nuc', 'fără încuibare: bucla dinăuntru pe exterior')
o('B02', ME, '      if (e !== undefined) { peLinie[k] = 0; exterior[k] = e; }', '      if (e !== undefined) { exterior[k] = e; }', 'nuc',
  'buclele închise rămân tăiate pe linie')
o('B03', ME, "  const inchise = om.bucle === 'inchise' ? valide.filter((c) => c.inchisa) : [];", '  const inchise = valide.filter((c) => c.inchisa);', 'nuc',
  'buclele închise și fără opțiune')

# ---- Ieșirea ----
o('O01', ME, '    ...(peLinie.includes(0) ? { peLinie } : {}),', '    peLinie,', 'nuc', '`peLinie` și când totul e pe linie')
o('O02', ME, '  if (!parti) return { ok: true, cai, raport: raport(tipuri.length, abatere) };', '  if (true) return { ok: true, cai, raport: raport(tipuri.length, abatere) };', 'nuc',
  'contururile părților late nu ies pentru semnalare')
o('O03', ME, '    parti = { numar: late.filter((b) => arie(b) > 0).length,', '    parti = { numar: late.length,', 'nuc',
  'golurile părților late numărate ca părți')
o('O04', ME, 'arie: pl.arieLata / Math.max(1, pl.arieCerneala), pragPx };', 'arie: pl.arieLata, pragPx };', 'nuc', 'aria părților late în pixeli, nu ca parte din cerneală')
# O05 (laturile contururilor semnalate): niciun cititor (fereastra le umple par-impar); calculul scos din cod, cu otrava.

# ---- Calculul și ușa ----
o('U01', CT, 'pragLatPx: m.pragLatMm !== null && m.pragLatMm > 0 ? m.pragLatMm / mmPePx : null }', 'pragLatPx: m.pragLatMm !== null && m.pragLatMm > 0 ? m.pragLatMm : null }', 'usa',
  'pragul scris în mm luat drept px')
o('U02', CT, '    const late = r.late ? [r.late.inceput, r.late.tip, r.late.xy, r.late.exterior] : [];', '    const late: Uint8Array[] = [];', 'usa',
  'contururile părților late copiate, nu transferate')
o('U03', CA, "c.deschisa[k] === 1 || c.peLinie?.[k] !== 0 ? 'pe-linie' :", "true ? 'pe-linie' :", 'usa', 'contururile și buclele închise tăiate pe linie')
o('U04', CA, '      mediane: { grosimePx: grosime, bucle, jonctiuni, puncte, ...(parti ? { parti } : {}) },', '      mediane: { grosimePx: grosime, bucle, jonctiuni, puncte },', 'usa',
  'raportul fără părțile late')
o('U05', CA, ", ...(r.fel === 'mediane' && r.late ? { late: r.late } : {}) };", ' };', 'usa', 'previzualizarea fără contururile părților late')

# ---- Fereastra (e2e) ----
o('F01', CA, "{ rezultat: 'mediane', mediane: a.mediane }", "{ rezultat: 'mediane' }", 'e2e', 'opțiunile nu ajung la worker')
o('F02', IM, 'pragLatMm: null, semnaleaza: true, bucle', 'pragLatMm: null, semnaleaza: false, bucle', 'e2e', 'semnalarea oprită implicit')
o('F03', FE, "        {!peCulori && alegeri.rezultat === 'mediane' && (\n          <OptiuniMediane", "        {false && (\n          <OptiuniMediane", 'e2e',
  'grupul opțiunilor lipsește')
o('F04', FE, "      g.fill(caleLate, 'evenodd');", '', 'e2e', 'părțile late nu se colorează')
o('F05', FE, '              {mediane?.parti && (', '              {false && (', 'e2e', 'raportul nu numără părțile late')
o('F06', FE, '      if (a.mediane.pragLatMm !== null && pragLat !== null && pragLat > 0 && pragLat !== a.mediane.pragLatMm) s.mediane = { ...a.mediane, pragLatMm: pragLat };', '', 'e2e',
  'pragul scris nu se trimite')
o('F07', FE, "onSchimba({ ...om, late: e.target.value === 'contur' ? 'contur' : 'mediane' });", 'onSchimba({ ...om });', 'e2e', '„Părțile late” nu se schimbă')
o('F08', FE, "onSchimba({ ...om, bucle: e.target.value === 'inchise' ? 'inchise' : 'linie' });", 'onSchimba({ ...om });', 'e2e', '„Buclele” nu se schimbă')
o('F09', FE, "onSchimba({ ...om, capete: e.target.value === 'varf' ? 'varf' : 'centru' });", 'onSchimba({ ...om });', 'e2e', '„Capetele” nu se schimbă')
o('F10', FE, '            onSchimba({ ...om, pragLatMm: e.target.checked ? null : v });', '            onSchimba({ ...om });', 'e2e', '„Automat” nu se debifează')

SETURI = {
    'nuc': ['test/unit/trasare.mediana.test.ts', 'test/unit/trasare.mediana.corpus.test.ts'],
    'nuc2': ['test/unit/trasare.mediana.test.ts', 'test/unit/import.imagine.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts', 'test/unit/import.actiuni.test.ts'],
}
E2E = ['test/e2e/trasare-mediana.spec.ts']
