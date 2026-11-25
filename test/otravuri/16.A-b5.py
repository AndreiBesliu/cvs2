# Lista de otrăvuri a feliei 16.A↑b-5 (frezele în plus ale rândului din „Frezele mele”: fundul plat, frezele de rest, dopul
# drept, decuparea benzii; ADR 0300 §4), aleasă de autor: scrierea originii la Exportă (comună cu freza operației: numele,
# ștergerea la „scrisă de mână”, păstrarea fără câmp, tăișul care pleacă, fiecare freză în plus), frezele ferestrei pentru T
# (freza înlocuită, locul frezei de rest, turația, fundul plat), alegerea pe loc (pasul lateral, rândul frezei de rest), filtrul
# frezelor de rest, fereastra (diametrele schimbate de mână, originea trimisă la Exportă și citită din document, legarea
# rândurilor cu originea fundului) și aplicația (originile din document).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


R = 'src/ui/exportRand.ts'
V = 'src/app/valoriOperatii.ts'
F = 'src/ui/FisaOperatie.tsx'
D = 'src/ui/DialogExport.tsx'
A = 'src/app/ExportConectat.tsx'

# Scrierea originii (cuOrigine) pe frezele în plus.
o('S01', V, "f.origine, 'freza dreapta')", "undefined, 'freza dreapta')", 'model', 'fundul plat nu primește originea aleasă')
o('S02', V, 'r.origine, nume)', 'undefined, nume)', 'model', 'frezele de rest (și ale dopului) nu primesc originea')
o('S03', V, "b.freza.origine, 'freza dreapta')", "undefined, 'freza dreapta')", 'model', 'freza decupării benzii nu primește originea')
o('S04', V, '    return { ...fara, nume: numeMana };', '    return { ...x, nume: numeMana };', 'model',
  '„scrisă de mână” lasă originea pe freza în plus')
o('S05', V, '    if (!vechi?.biblioteca) return x;', '    if (!vechi?.biblioteca) return { ...x, nume: numeMana };', 'model',
  'scrisă de mână peste o freză scrisă de mână îi schimbă numele')
o('S06', V, "  if (origine.tais === undefined) delete c['tais'];", '', 'model', 'tăișul frezei de dinainte rămâne pe fundul plat')

# Frezele ferestrei (T-ul).
o('T01', R, 'if (fara && fara.cheie === cheie && acelasiLoc(fara.unde, unde)) return;', 'if (false) return;', 'model',
  'freza înlocuită ocupă încă T-ul')
o('T02', R, 'a.rest === b.rest && a.k === b.k', 'a.rest === b.rest', 'model', 'toate frezele de rest ale listei ies, nu doar cea înlocuită')
o('T03', R, 'turatie = origine?.regim?.turatie;', 'turatie = undefined as number | undefined;', 'model',
  'frezele în plus nu-și spun turația (identitatea)')
o('T04', R, "    if (fund) pune('fund', p.numarSculaFund, p.diametruSculaFund, p.origineFund);\n", '', 'model',
  'freza fundului plat nu se numără printre frezele ferestrei')

# Alegerea pe loc și filtrul frezelor de rest.
o('C01', R, 'pasLateralFund: pl, origineFund: origine', 'origineFund: origine', 'model', 'pasul lateral al frezei nu trece pe fund')
o('C02', R, '(i === unde.k ? { numar: n, diametru: d, pas: pl, origine } : r)', '({ numar: n, diametru: d, pas: pl, origine })', 'model',
  'alegerea pe o freză de rest le schimbă pe toate')
o('C03', R, 'f.scula.diametru < d0', 'f.scula.diametru <= d0', 'model', 'o freză de rest cât cea dinainte e oferită')

# Fereastra.
o('W01', D, "oferitePentruRest(drepte, k === 0 ? prima : lista[k - 1]?.diametru ?? '')", 'drepte', 'e2e',
  'frezele de rest primesc și freze mai mari')
o('W02', D, '{ ...x, diametru: ev.target.value, origine: null }', '{ ...x, diametru: ev.target.value }', 'e2e',
  'Ø-ul de rest schimbat de mână păstrează originea')
o('W03', F, 'diametruSculaFund: ev.target.value, origineFund: null', 'diametruSculaFund: ev.target.value', 'e2e',
  'Ø-ul fundului schimbat de mână păstrează originea')
o('W04', F, 'diametruSculaBanda: ev.target.value, origineBanda: null', 'diametruSculaBanda: ev.target.value', 'e2e',
  'Ø-ul decupării schimbat de mână păstrează originea')
o('W05', F, 'diametruSculaDop: ev.target.value, origineDop: null', 'diametruSculaDop: ev.target.value', 'e2e',
  'Ø-ul dopului schimbat de mână păstrează originea')
o('W06', D, ', origine: p.origineFund } : null;', ' } : null;', 'e2e', 'Exportă nu primește originea fundului')
o('W07', D, 'pasLateral: pasLateralDop, origine: p.origineDop }', 'pasLateral: pasLateralDop }', 'e2e', 'Exportă nu primește originea dopului')
o('W08', R, 'freza: { numar: fn, diametru: fd, origine: p.origineBanda }', 'freza: { numar: fn, diametru: fd }', 'e2e',
  'Exportă nu primește originea decupării benzii')
o('W09', D, 'origine: r.origine ?? null });', 'origine: null });', 'e2e', 'rândul nu citește originea frezelor de rest din document')
o('W10', D, 'origineFund: fund?.origine ?? null,', 'origineFund: null,', 'e2e', 'rândul nu citește originea fundului din document')
o('W11', D, 'origineDop: dop0?.origine ?? null,', 'origineDop: null,', 'e2e', 'rândul nu citește originea dopului din document')
o('W12', D, 'origineBanda: banda?.freza?.origine ?? null,', 'origineBanda: null,', 'e2e', 'rândul nu citește originea benzii din document')
o('W13', D, 'org(p.origineFund),', '', 'e2e', 'legarea V-carve-urilor nu ține originea fundului (lucrarea le desparte)')
o('W14', F, '  const drepte = frezeOferite ? frezeOferite(RAND_DREPT) : [];', '  const drepte = oferite;', 'e2e',
  'frezele în plus primesc frezele tăieturii rândului (în V la V-carve)')

# Aplicația.
o('A01', A, 'pasLateral: o.fundPlat.pasLateral, origine: origineDin(o.fundPlat.scula),', 'pasLateral: o.fundPlat.pasLateral, origine: null,', 'e2e',
  'aplicația nu dă rândului originea fundului din document')
o('A02', A, 'pasLateral: r.pasLateral, origine: origineDin(r.scula) });', 'pasLateral: r.pasLateral, origine: null });', 'e2e',
  'aplicația nu dă originea frezelor de rest (și ale dopului) din document')
o('A03', A, 'diametru: o.incrustatie.banda.freza.diametru, origine: origineDin(o.incrustatie.banda.freza) }',
  'diametru: o.incrustatie.banda.freza.diametru, origine: null }', 'e2e', 'aplicația nu dă originea decupării benzii din document')

SETURI = {'model': ['test/unit/exportFreze.rest.test.ts', 'test/unit/exportFreze.test.ts']}
E2E = ['test/e2e/exportFrezeRest.spec.ts']
