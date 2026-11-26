# Lista de otrăvuri a feliei 28.8↑q („Toate foile” cu operațiile fiecărei foi, ADR 0291, 7a; constatarea 18 a auditului),
# 26.11.2026, alese de autor: grupele foilor (piesa la prima ei foaie, comunele, foaia goală), rândurile celorlalte foi aduse
# la alegere, cu ce a scris omul păstrat, Exportă care scrie toate piesele, grosimea pe rând, ordinea pe foi (rangurile,
# numerele, mutările doar în foaie, riscurile cu numele foii), greșelile doar pe rândurile văzute, Rezultatul pe foi, banda de
# pe telefon.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


GF = 'src/model/foiExport.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
OE = 'src/ui/ordineExport.ts'
CA = 'src/ui/actiuniExportCalcul.ts'
CSS = 'src/app/stil.css'

# Grupele foilor.
o('Q01', GF, '      if (j === undefined) {', '      if (true) {', 'grupe', 'o piesă comună își are rândurile pe fiecare foaie')
o('Q02', GF, 'goala: vazute.size === 0,', 'goala: proprii.length === 0,', 'grupe', 'copia legată a unei foi e spusă goală')
# Rândurile celorlalte foi, în fereastra conectată.
o('Q03', EC, '    const deScris = c.toateFoile\n', '    const deScris = false\n', 'e2e',
  'Exportă scrie doar piesele foii active: o schimbare pe altă foaie se pierde')
o('Q04', EC, 'operatii: c.piese.reduce((n, id) => n + cuRand(id), 0)', 'operatii: 0', 'e2e', 'foaia cu piese comune nu le spune')
o('Q05', EC, '      ...(grosime !== undefined ? { grosime } : {}),\n', '', 'e2e',
  'rândul altei foi se socotește pe hârtie cu grosimea foii active')
# Fereastra: setul văzut, rândurile aduse la alegere.
o('Q06', DE, '  const operatii = dateToate?.operatii ?? operatiiFoaie;', '  const operatii = toateFoile?.().operatii ?? operatiiFoaie;', 'e2e',
  'și cu „Foaia activă”, rândurile tuturor foilor')
o('Q07', DE, '    setParam((v) => ({ ...dinDocument(alte.filter((o) => !(o.cheie in v))), ...v }));',
  '    setParam((v) => ({ ...v, ...dinDocument(alte) }));', 'e2e', 'trecerea la „Toate foile” șterge ce a scris omul')
o('Q08', DE, '  const randuri = operatii.map((o) => randBun(param[o.cheie]));',
  '  const randuri = Object.keys(param).map((k) => randBun(param[k]));', 'e2e', 'o greșeală pe altă foaie oprește și foaia activă')
o('Q09', DE, '    if (da === toate) return;\n    // Rezultatul de până acum e al celeilalte alegeri.\n    schimbat();\n',
  '    if (da === toate) return;\n', 'e2e', 'rezultatul „Toate foile” rămâne și cu „Foaia activă”')
# Ordinea pe foi.
o('Q10', OE, '  return foi.flatMap((f) => ordineDinRanguri(f, ranguri, inFata) ?? [...f]);',
  '  return ordineDinRanguri(foi.flat(), ranguri, inFata);', 'ordine', 'rangurile amestecă foile')
o('Q11', DE, '    const g = inGrupa.get(cheie) ?? { i: loc, n: ordine.length };', '    const g = { i: loc, n: ordine.length };', 'e2e',
  'numerele și săgețile pe ordinea întreagă, nu pe foaie')
o('Q12', DE, '    if (dateToate && (a === undefined || b === undefined || foaieDe.get(a) !== foaieDe.get(b))) return;\n', '', 'e2e',
  'un rând tras pe altă foaie trece pe ea')
o('Q13', DE, "    ...r, ...(dateToate ? { foaie: dateToate.foi[k]?.nume ?? '' } : {}),", '    ...r,', 'e2e', 'riscul ordinii fără numele foii')
# Rezultatul pe foi.
o('Q14', DE, 'open={f.activa === true}', 'open', 'e2e', 'toate rezumatele deschise')
o('Q15', CA, '    const activa = g.some((j) => facute[j] === activ);', '    const activa = g[0] === 0;', 'foi', 'prima foaie spusă activă')
o('Q16', CA, 'secunde: prim.r.rezumat.ok ? prim.r.rezumat.total.secunde : null, rezumat: prim.r.rezumat,',
  'secunde: prim.r.rezumat.ok ? prim.r.rezumat.total.secunde : null, rezumat: activ.r.rezumat,', 'foi', 'fiecare foaie cu rezumatul foii active')
# Telefonul.
o('Q17', CSS, '  .dx-lista .dx-foaie-lista .nota {\n    display: none;\n  }\n', '', 'e2e',
  'pe bandă, nota foii crește banda listei')

SETURI = {
    'grupe': ['test/unit/export.grupeFoi.test.ts'],
    'ordine': ['test/unit/ordineExport.test.ts'],
    'foi': ['test/unit/export.foi.test.ts'],
}
E2E = ['test/e2e/export.toateFoile.spec.ts', 'test/e2e/export-foi.spec.ts']
