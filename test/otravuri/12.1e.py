# Lista de otrăvuri a feliei 12.1↑e (dopul în vederea 3D, ADR 0178), 19.11.2026, alese de autor: dopurile foii (o funcție, a
# exportului și a vederii: ordinea, supracursa exportului), simularea (dopul ales, semifabricatul, lista, motivul), drumul
# cererii (bazinul, calculul interfeței, lucrătorul) și vederea 3D (alegerea, camera, lista, simularea dopului, butoanele,
# starea, atributele pentru probe). La precizarea din 21.11 (titlul dopului), V10–V16: titlul numește incrustația ca bara
# de jos (`descriere`, mutată în `src/app/descriereElement.ts`), nu prin id-ul ei intern, apoi semifabricatul.
# Țintele din ADR 0178: alt dop decât cel ales, semifabricatul greșit, ordinea dopurilor schimbată, un dop refuzat care
# oprește foaia sau al cărui motiv se pierde, camera care nu încadrează dopul, butoanele care nu apar.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit, cu
# CNCVS2_E2E_RETEA=127.0.1 și configul local pe portul 4174 (`.tmp/pw.config.ts`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CALC = 'src/jobs/calculCam.ts'
BAZ = 'src/jobs/bazinCam.ts'
EXP = 'src/ui/actiuniExportCalcul.ts'
V3D = 'src/app/Vedere3D.tsx'
DES = 'src/app/descriereElement.ts'

# ---- Dopurile foii și simularea ----
o('D01', CALC, '  return { ok: true, dopuri: [...inV.dopuri, ...drepte.dopuri] };', '  return { ok: true, dopuri: [...drepte.dopuri, ...inV.dopuri] };',
  'dop3d', 'dopurile drepte înaintea celor în V (și în export)')
o('D02', CALC, '  const calculate = dopurileFoii(doc, p.supracursa ?? 0);', '  const calculate = dopurileFoii(doc, 0);', 'supracursa',
  'exportul nu mai dă dopurilor supracursa')
# D03 și D06 reorientate la 12.1↑e-2 (21.11): `calculeazaPotrivirea` (ADR 0179) caută dopul la fel; ancora ține acum și rândul
# care urmează în `calculeazaSimularea`. D07: lista dopurilor are acum și `inV` (din 22.11, `sectiune`, felia 12.1↑e-3).
SIM_DOP = "  const x = d.dopuri[dop];\n  if (!x) return { ok: false, motiv: `dopul ${dop + 1} nu mai e în document` };\n  const p = pregatesteProgram(x.program, 0);"
o('D03', CALC, SIM_DOP, SIM_DOP.replace('d.dopuri[dop]', 'd.dopuri[0]'), 'dop3d', 'vederea arată mereu primul dop')
o('D04', CALC, '  return { ok: true, foaie: { latime: s.latime, inaltime: s.inaltime, grosime: s.grosimeMinima }, simulare: p, ...cuDopuri };',
  '  return { ok: true, foaie: { latime: s.latime, inaltime: s.inaltime, grosime: s.grosimeMinima + 1 }, simulare: p, ...cuDopuri };', 'dop3d',
  'semifabricatul dopului mai gros')
o('D05', CALC, '    : { dopuri: [], motivDopuri: d.motiv };', '    : { dopuri: [] };', 'dop3d', 'motivul dopurilor refuzate se pierde')
o('D06', CALC, SIM_DOP, SIM_DOP.replace('motiv: `dopul ${dop + 1} nu mai e în document`', "motiv: 'dopul lipsește'"), 'dop3d',
  'refuzul dopului care lipsește, fără numărul lui')
# 23.11 (felia 12.1↑e-4): orice dop are acum potrivirea, deci lista dopurilor nu mai are `sectiune`; D07 urmează linia.
o('D07', CALC, '    ? { dopuri: d.dopuri.map((x) => ({ element: x.element, semifabricat: x.semifabricat })) }',
  '    ? { dopuri: d.dopuri.map((x) => ({ element: x.element, semifabricat: { ...x.semifabricat, latime: x.semifabricat.inaltime } })) }',
  'dop3d', 'lista dopurilor cu semifabricatul greșit')
o('D08', CALC, '      const r = calculeazaSimularea(c.document, c.dop);', '      const r = calculeazaSimularea(c.document);', 'dop3d',
  'lucrătorul ignoră dopul cerut')
o('D09', BAZ, "  return calculeaza({ fel: 'simulare', document, ...(dop !== undefined ? { dop } : {}) }, [], o) as Promise<RaspunsSimulare>;",
  "  return calculeaza({ fel: 'simulare', document }, [], o) as Promise<RaspunsSimulare>;", 'dop3d', 'bazinul pierde dopul cerut')
o('D10', EXP, '  const r = await simulareInBazin(doc, semnal ? { semnal } : {}, dop);', '  const r = await simulareInBazin(doc, semnal ? { semnal } : {});',
  'dop3d', 'calculul interfeței pierde dopul cerut')
o('D11', EXP, '  return { ok: true, foaie: r.foaie, date, dopuri: r.dopuri, ...(r.motivDopuri !== undefined ? { motivDopuri: r.motivDopuri } : {}) };',
  '  return { ok: true, foaie: r.foaie, date, dopuri: [], ...(r.motivDopuri !== undefined ? { motivDopuri: r.motivDopuri } : {}) };', 'dop3d',
  'interfața nu primește dopurile')
o('D12', EXP, '  return { ok: true, foaie: r.foaie, date, dopuri: r.dopuri, ...(r.motivDopuri !== undefined ? { motivDopuri: r.motivDopuri } : {}) };',
  '  return { ok: true, foaie: r.foaie, date, dopuri: r.dopuri };', 'dop3d', 'interfața nu primește motivul dopurilor')

# ---- Vederea 3D ----
o('V01', V3D, '    if (ce === alegere) return;', '    return;', 'e2e', 'alegerea nu schimbă nimic')
o('V02', V3D, '    setAlegere(ce);\n    cam.current = null;\n', '    setAlegere(ce);\n', 'e2e', 'camera nu încadrează dopul ales')
o('V03', V3D, '        setDopuri({ lista: p.dopuri, ...(p.motivDopuri !== undefined ? { motiv: p.motivDopuri } : {}) });',
  '        setDopuri({ lista: [], ...(p.motivDopuri !== undefined ? { motiv: p.motivDopuri } : {}) });', 'e2e', 'vederea nu ține lista dopurilor')
o('V04', V3D, '      calc.programSimulare(d, ctl.signal, ce === \'foaie\' ? undefined : ce).then(cuProgram,',
  '      calc.programSimulare(d, ctl.signal).then(cuProgram,', 'e2e', 'dopul ales se simulează ca foaia')
o('V05', V3D, '        {dopuri.lista.length > 0 || dop !== null ? (', '        {dop !== null ? (', 'e2e', 'butoanele nu apar cu dopuri pe foaie')
o('V06', V3D, '                aria-pressed={alegere === k}', '                aria-pressed={false}', 'e2e', 'dopul ales nu se arată apăsat')
o('V07', V3D, '                : dop !== null && s.program && s.placa ? t(\'editare.3d.gata-dop\', {', '                : false && s.program && s.placa ? t(\'editare.3d.gata-dop\', {',
  'e2e', 'starea spune „placa” la dop')
o('V08', V3D, "        data-alegere={dop === null ? 'foaie' : `dop-${dop}`}", "        data-alegere={'foaie'}", 'e2e', 'atributul alegerii, mereu foaia')
o('V09', V3D, "            <button type=\"button\" data-3d=\"incadreaza\" onClick={reincadreaza}>{t(dop === null ? 'editare.3d.incadreaza' : 'editare.3d.incadreaza-dop')}</button>",
  "            <button type=\"button\" data-3d=\"incadreaza\" onClick={reincadreaza}>{t('editare.3d.incadreaza')}</button>", 'e2e', '„Încadrează placa” la dop')

# ---- Titlul dopului (precizarea din 21.11) ----
o('V10', V3D, "    return e ? `${t('editare.3d.dopul.incrustatia', { descriere: descriere(e) })} ${semifabricat}` : semifabricat;",
  "    return e ? `${t('editare.3d.dopul.incrustatia', { descriere: d.element })} ${semifabricat}` : semifabricat;", 'e2e',
  'titlul numește incrustația prin id-ul ei intern')
o('V11', V3D, "    return e ? `${t('editare.3d.dopul.incrustatia', { descriere: descriere(e) })} ${semifabricat}` : semifabricat;",
  '    return semifabricat;', 'e2e', 'titlul fără incrustație')
o('V12', V3D, '    const e = lume?.get(d.element);', "    const e = lume?.get(d.element.split('/')[0] ?? '');", 'e2e',
  'elementul căutat după instanță, nu după id-ul lui în lume')
o('V13', V3D, '(dopuri.lista.length > 0 ? new Map(elementeFoaie(doc, 0)', '(false ? new Map(elementeFoaie(doc, 0)', 'e2e',
  'lumea foii nefăcută (titlul fără incrustație)')
o('V14', V3D, 'new Map(elementeFoaie(doc, 0).map(', 'new Map(elementeFoaie(doc, 1).map(', 'e2e', 'lumea altei foi')
o('V15', V3D, '      latime: nr(d.semifabricat.latime), inaltime: nr(d.semifabricat.inaltime), grosime: nr(d.semifabricat.grosimeMinima),',
  '      latime: nr(d.semifabricat.latime), inaltime: nr(d.semifabricat.inaltime), grosime: nr(d.semifabricat.inaltime),', 'e2e',
  'semifabricatul din titlu cu grosimea greșită')
o('V16', DES, 'const doua = (x: number): string => x.toFixed(2);', 'const doua = (x: number): string => x.toFixed(1);', 'e2e',
  'descrierea comună (bara de jos și titlul) cu altă precizie')

SETURI = {
    'dop3d': ['test/unit/incrustatie.dop3d.test.ts'],
    'supracursa': ['test/unit/incrustatieDreapta.punti.test.ts', 'test/unit/incrustatieDreapta.gaura.test.ts', 'test/unit/incrustatie.banda.test.ts'],
}
E2E = ['test/e2e/incrustatie3d.spec.ts']
