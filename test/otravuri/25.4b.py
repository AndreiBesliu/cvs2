# Lista de otrăvuri a feliei 25.4↑b (lumina pe culori, ADR 0226), 13.11.2026, alese de autor: culorile luminate (polaritatea,
# fiecare canal, fundalul neted sau local, balansul de alb, nivelul tablei, pragul de jos al fundalului, alfa), trasarea pe
# culori (lumina doar pe imaginile opace, variația hârtiei, raportul), calculul și ușa (lumina în cerere, raportul imaginii)
# și fereastra prin e2e (Lumina pe culori, sfatul ei, sugestia, transparența). Se rulează cu `scripts/otravuri.py`
# (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu CNCVS2_E2E_RETEA=127.0.6 și configul local
# pe portul 4179.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CU = 'src/trasare/culori.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'

# ---- Culorile luminate ----
o('C01', CU, '  const f = luminozitatea(img), deschisa = !cernealaDeschisa(f, W, H), h = new Float64Array(256);',
  '  const f = luminozitatea(img), deschisa = true, h = new Float64Array(256);', 'nuc', 'tabla luată drept hârtie deschisă')
o('C02', CU, '    for (let p = 0, q = k; p < n; p++, q += 4) { const v = d[q] ?? 0, i = Math.round(v); f[p] = v / 255; h[i] = (h[i] ?? 0) + 1; }',
  '    for (let p = 0, q = 0; p < n; p++, q += 4) { const v = d[q] ?? 0, i = Math.round(v); f[p] = v / 255; h[i] = (h[i] ?? 0) + 1; }', 'nuc',
  'fundalul fiecărui canal luat din roșu')
o('C03', CU, '    let tinta = 255;', '    let tinta = 230;', 'nuc', 'albul hârtiei sub 255: fără balansul de alb')
o('C04', CU, '    if (!deschisa) { let m = 0; for (let p = 0; p < n; p++) m += B[p] ?? 0; tinta = (255 * m) / n; }\n', '', 'nuc',
  'pe tablă, fundalul adus la 255 (creta se taie)')
o('C05', CU, '    for (let p = 0, q = k; p < n; p++, q += 4) o[q] = (tinta * (f[p] ?? 0)) / Math.max(0.02, B[p] ?? 0);',
  '    for (let p = 0, q = k; p < n; p++, q += 4) o[q] = (tinta * (f[p] ?? 0)) / Math.max(0.5, B[p] ?? 0);', 'nuc',
  'pragul de jos al fundalului prea sus: tabla nu se mai îndreaptă')
o('C06', CU, '  for (let q = 3; q < 4 * n; q += 4) o[q] = d[q] ?? 255;', '  for (let q = 3; q < 4 * n; q += 4) o[q] = 255;', 'nuc', 'alfa pierdut')
o('C07', CU, "    const B = lumina === 'neuniforma' ? fundalNeted(", "    const B = lumina !== 'neuniforma' ? fundalNeted(", 'nuc',
  'Neuniformă și Cu umbre schimbate între ele')
o('C08', CU, "  const lumina: Lumina = !transparenta && o.lumina !== undefined ? o.lumina : 'uniforma';",
  "  const lumina: Lumina = o.lumina ?? 'uniforma';", 'nuc', 'lumina și pe transparență')
o('C09', CU, "  const inegala = !transparenta && lumina === 'uniforma' ? variatiaHartiei(intrare) : null;", '  const inegala = null;', 'nuc',
  'fără variația hârtiei: fără sugestie')
o('C10', CU, '  for (let p = 0; p < f.length; p++) f[p] = 1 - (f[p] ?? 0);\n', '', 'nuc', 'variația pe luminozitate, nu pe cerneală')
o('C11', CU, '      lumina, inegala,\n', "      lumina: 'uniforma', inegala,\n", 'nuc', 'raportul nu spune lumina folosită')

# ---- Calculul și ușa ----
o('J01', CT, "      ...(c.optiuni.lumina !== undefined && c.optiuni.lumina !== 'uniforma' ? { lumina: c.optiuni.lumina } : {}),\n", '', 'usa',
  'lumina nu ajunge la culori')
o('A01', CA, '    lumina: r.raport.lumina, inegala: r.raport.inegala,',
  "    lumina: r.fel === 'culori' ? 'uniforma' : r.raport.lumina, inegala: r.raport.inegala,", 'usa', 'raportul imaginii pe culori fără lumină')

# ---- Fereastra (e2e) ----
o('F01', FE, '        {peCulori && !raport?.transparenta && panouLumina}', '        {false && panouLumina}', 'e2e', 'Lumina lipsește pe culori')
o('F02', FE, '        {t(peCulori ? `import.trasare.lumina.sfat-culori.${alegeri.lumina}` : `import.trasare.lumina.sfat.${alegeri.lumina}`)}',
  '        {t(`import.trasare.lumina.sfat.${alegeri.lumina}`)}', 'e2e', 'pe culori, sfatul alb-negrului')
o('F03', FE, "              {raport.sursa !== 'alfa' && raport.lumina === 'uniforma' && raport.inegala !== null",
  "              {raport.sursa === 'lum' && raport.lumina === 'uniforma' && raport.inegala !== null", 'e2e', 'sugestia lipsește pe culori')
o('F04', FE, '        {peCulori && !raport?.transparenta && panouLumina}', '        {peCulori && panouLumina}', 'e2e', 'Lumina și pe transparență')

SETURI = {
    'nuc': ['test/unit/trasare.culori.lumina.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
}
E2E = ['test/e2e/trasare-scanari.spec.ts']
