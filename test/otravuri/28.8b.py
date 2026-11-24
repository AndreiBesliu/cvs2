# Lista de otrăvuri a feliei 28.8↑b-1 (desenele întrebărilor din fereastra exportului, ADR 0290), 23.11.2026, alese de autor:
# trecerile și urechile desenate față de lucrare (pe hârtie), apoi fereastra: cota câmpului activ, colțul ales din desen, sensul
# (partea piesei), Z0 și supracursa, valorile duse din fereastră în desen, urechile după regulă, tokenurile temei și caseta
# explicației care își ține înălțimea (clicul nu fuge de sub cursor).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CALC = 'src/ui/exportDeseneCalcul.ts'
DES = 'src/ui/exportDesene.tsx'
DLG = 'src/ui/DialogExport.tsx'
CSS = 'src/app/stil.css'

# ---- Pe hârtie, față de lucrare ----
o('D01', CALC, '  const n = Math.max(1, Math.ceil(adancime / pas - 1e-9));', '  const n = Math.max(1, Math.ceil(adancime / pas));', 'desene',
  'trecerile fără toleranța de rotunjire (18 / 6,0000001 dă patru)')
o('D02', CALC, "  if (mod === 'egale') return Array.from({ length: n }, (_, k) => ((k + 0.5) * P) / n);",
  "  if (mod === 'egale') return Array.from({ length: n }, (_, k) => (k * P) / n);", 'desene', 'urechile egale din vârful 0, nu din mijlocul golului')
o('D03', CALC, 'for (let j = 0; j < rest; j++) { const i = Math.floor((j * k) / rest); cate[i] = (cate[i] ?? 0) + 1; }',
  'for (let j = 0; j < rest; j++) { const i = j % k; cate[i] = (cate[i] ?? 0) + 1; }', 'desene',
  'restul urechilor pe laturi vecine, nu răspândit (două pe un pătrat ar sta alături)')
o('D04', CALC, "  const cate = alese.map(() => (mod === 'mijloc' ? 1 : baza));", '  const cate = alese.map(() => baza);', 'desene',
  'la mijloc, numărul împărțit pe laturi în loc de câte una')
o('D05', CALC, "    .filter(([l]) => mod === 'mijloc' || (mod === 'lungi' ? l >= max * 0.99 : l <= min * 1.01));",
  "    .filter(([l]) => mod === 'mijloc' || (mod === 'lungi' ? l <= min * 1.01 : l >= max * 0.99));", 'desene', 'laturile lungi și scurte încurcate')

# ---- Fereastra (e2e) ----
o('E01', DES, "    <g className=\"cota\" data-cota={id} data-aprinsa={c.aprins.includes(id) ? '' : undefined}>",
  '    <g className="cota" data-cota={id}>', 'e2e', 'cota câmpului activ nu se aprinde')
o('E02', DES, "onClick={() => { onColt(k); }}>", "onClick={() => { void k; }}>", 'e2e', 'clicul pe un colț din desen nu-l alege')
o('E03', DES, "  const ext = fel === 'exterior', orar = ext ? urcare : !urcare;", "  const ext = fel === 'exterior', orar = urcare;", 'e2e',
  'gaura la urcare desenată orar (piesa ar ieși în stânga)')
o('E04', DLG, '  useLayoutEffect(() => { rezervaExplicatii(panou.current); });', '  useLayoutEffect(() => {});', 'e2e',
  'caseta explicației nu-și ține înălțimea: bifa fuge de sub cursor')
o('E05', CSS, '  box-sizing: border-box;\n  align-self: start;\n  margin: 0;\n  padding: var(--sp-2) var(--sp-3);', '  align-self: start;\n  margin: 0;\n  padding: var(--sp-2) var(--sp-3);', 'e2e',
  'înălțimea măsurată pe o copie mai lată (paddingul în afara lățimii)')
o('E06', DES, '      : centreUrechiDesen(mod as LocuriUrechiDesen, N, [w, h, w, h]);', '      : centreUrechiDesen(mod as LocuriUrechiDesen, N, [h, w, h, w]);', 'e2e',
  'urechile „pe laturile lungi” desenate pe cele scurte')
o('E07', DES, '    <Desen eticheta={t(\'export.desen.z0\')} data-z0={z0}>', '    <Desen eticheta={t(\'export.desen.z0\')} data-z0="sus">', 'e2e',
  'Z0 pe masă desenat tot pe fața de sus')
o('E08', DLG, 'supracursa={supracursaBuna ? supracursaCitita : null}', 'supracursa={null}', 'e2e', 'supracursa lipsă din desen')
o('E09', DLG, 'adancime={adancimeRand} pas={citesteNumar(p.pas)} grosime={grosimeFoaie}', 'adancime={adancimeRand} pas={adancimeRand} grosime={grosimeFoaie}', 'e2e',
  'desenul adâncimii cu pasul greșit (o singură trecere)')
o('E10', DES, '  const locuri = !urechi ? [] :', '  const locuri = false ? [] :', 'e2e', 'urechile desenate și fără bifă')
o('E11', CSS, '.dx-ilu .l { fill: var(--lemn);', '.dx-ilu .l { fill: var(--s-panou);', 'e2e', 'lemnul de culoarea panoului (nu se vede)')

SETURI = {
    'desene': ['test/unit/export.desene.test.ts'],
}
E2E = ['test/e2e/export.desene.spec.ts']
