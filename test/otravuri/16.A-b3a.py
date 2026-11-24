# Lista de otrăvuri a feliei 16.A↑b-3a (freza din „Frezele mele” pe rândurile ferestrei exportului; ADR 0300 §4), aleasă de autor:
# regula T a rândului (al bibliotecii, al frezei identice, cel mai mic liber; turația, forma), scrierea originii la Exportă
# (numele, ștergerea la „scrisă de mână”, păstrarea fără câmp, tăișul și valorile care pleacă), fereastra (diametrul și unghiul
# schimbate de mână, pasul, frezele ferestrei fără rândul ales, originea trimisă la Exportă și citită din document) și aplicația
# (frezele potrivite tăieturii rândului).
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

o('R01', R, '  if (peNumar.every((a) => aceeasiFrezaRand(a, f))) return f.numar;', '  if (peNumar.length === 0) return f.numar;', 'model',
  'T-ul al unei freze identice nu mai e al frezei alese')
o('R02', R, '  if (identica) return identica.numar;\n', '', 'model', 'fără T-ul frezei identice')
o('R03', R, '(a.turatie === undefined || b.turatie === undefined || a.turatie === b.turatie)', 'true', 'model', 'turația nu contează')
o('R04', R, '  return formaEgala && egal(a.diametru, b.diametru)', '  return egal(a.diametru, b.diametru)', 'model', 'forma nu contează')
o('S01', V, '      ...x, nume: r.nume, biblioteca:', '      ...x, biblioteca:', 'model', 'numele frezei din bibliotecă nu se scrie')
o('S02', V, '      return { ...fara, nume: s.forma ?', '      return { ...x, nume: s.forma ?', 'model', '„scrisă de mână” lasă originea în document')
o('S03', V, '    if (s.origine === null) {', '    if (!s.origine) {', 'model', 'un apelant fără câmpul `origine` șterge originea')
o('S04', V, "  if (s.origine.tais === undefined) delete c['tais'];\n", '', 'model', 'tăișul frezei de dinainte rămâne')
o('W01', F, '{ diametruScula: ev.target.value, origineScula: null }', '{ diametruScula: ev.target.value }', 'e2e',
  'diametrul schimbat de mână păstrează originea')
o('W02', F, '{ unghiV: ev.target.value, origineScula: null }', '{ unghiV: ev.target.value }', 'e2e', 'unghiul schimbat de mână păstrează originea')
o('W03', D, '      pas: text(f.pas), ', '      ', 'e2e', 'pasul frezei nu trece pe rând')
o('W04', D, '      if (o.cheie !== fara) {', '      if (o.cheie !== fara || true) {', 'e2e', 'freza veche a rândului ocupă T-ul')
o('W05', D, '      origine: p.origineScula,\n', '', 'e2e', 'Exportă nu primește originea rândului')
o('W06', D, 'origineScula: o.valori.scula?.origine ?? null,', 'origineScula: null,', 'e2e', 'rândul nu citește originea din document')
o('A01', A, '            origine: origineDin(o.scula),', '            origine: null,', 'e2e', 'aplicația nu dă rândului originea din document')
o('A02', A, 'frezePotrivite(biblioteca.freze, [{ tip: r.tip, latura: r.latura }])', "frezePotrivite(biblioteca.freze, [{ tip: 'profil', latura: 'exterior' }])",
  'e2e', 'frezele oferite nu urmează tăietura rândului')

SETURI = {'model': ['test/unit/exportFreze.test.ts']}
E2E = ['test/e2e/exportFreze.spec.ts']
