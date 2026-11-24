# Lista de otrăvuri a feliei 16.A↑b-2 (freza din bibliotecă în secțiunea Tăierea; ADR 0300 §4), 24.11.2026, alese de
# autor: forma pe operație (V doar pe linie și în V-carve, V-carve-ul doar cu V), frezele oferite, copia din bibliotecă
# (originea, valorile, tăișul), pașii operațiilor, numărul T (identitatea cu turația, freza înlocuită care nu se numără, frezele
# de rest care se numără) și rândul din panou (lista, citirea bibliotecii, nota).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FF = 'src/model/formaFrezei.ts'
AF = 'src/model/alegereFreza.ts'
R = 'src/model/rol.ts'
P = 'src/app/PanouProprietati.tsx'

# Forma pe operație (unitare: `alegereFreza.test.ts`).
o('F01', FF, "  if (tip === 'vcarve') return v ? null : 'vcarve';", "  if (tip === 'vcarve') return null;", 'model', 'freza plată pe V-carve trece')
o('F02', FF, "  if (v && !(tip === 'profil' && latura === 'pe-linie')) return 'v-pe-linie';", "  if (v && tip === 'buzunar') return 'v-pe-linie';",
  'model', 'freza în V pe un profil pe exterior trece')

# Copia, frezele oferite, pașii (unitare).
o('A01', AF, '    biblioteca: { id: f.id, rev: f.rev },', '    biblioteca: { id: f.id, rev: 1 },', 'model', 'versiunea originii se pierde')
o('A02', AF, '    regim: { turatie: f.turatie, avans: f.avans, plonjare: f.plonjare },', '    regim: { turatie: f.turatie, avans: f.avans, plonjare: f.avans },',
  'model', 'plonjarea copiată din avans')
o('A03', AF, '    ...(f.tais !== undefined && Number.isFinite(f.tais) ? { tais: f.tais } : {}),\n', '', 'model', 'tăișul nu se copiază')
o('A04', AF, '    return operatii.every((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null);',
  '    return operatii.some((o) => motivFormaPeOperatie(o.tip, o.latura, forma) === null);', 'model', 'o freză bună pentru o singură operație se oferă')
o('A05', AF, '  if (operatii.length === 0) return [];\n', '', 'model', 'fără operații, toată biblioteca')
o('A06', AF, '  return id !== undefined && operatii.every((o) => o.scula.biblioteca?.id === id) ? id : null;',
  '  return id !== undefined ? id : null;', 'model', 'freza comună: doar a primei operații')
o('A07', AF, '  return numarPrintre(sculeProiect(doc, new Set(), (p) => alese.has(p.id)), s);',
  '  return numarPrintre(sculeProiect(doc, new Set(), () => false), s);', 'model', 'freza înlocuită se numără (T-ul ei pare ocupat)')
o('A08', AF, '  return numarPrintre(sculeProiect(doc, new Set(), (p) => alese.has(p.id)), s);', '  return s.numar;', 'model',
  'T-ul bibliotecii, chiar ocupat de altă freză')
o('A09', AF, '  const jos = Math.floor(x * 1000) / 1000;', '  const jos = Math.round(x * 1000) / 1000;', 'model', 'pasul lateral trece de rază la 50 %')
o('A10', AF, '    ...structuredClone(o), scula: structuredClone(scula), pas: f.pas,', '    ...structuredClone(o), scula: structuredClone(scula),', 'model',
  'pasul pe trecere al frezei nu se scrie')
o('A11', AF, "...(o.tip === 'buzunar' ? { pasLateral: pasLateralDin(f) } : {}),", 'pasLateral: pasLateralDin(f),', 'model',
  'pasul lateral și pe profil')
o('A12', AF, '  if (operatii.length === 0 || frezePotrivite([f], operatii).length === 0) return null;', '  if (operatii.length === 0) return null;',
  'model', 'o freză care nu se potrivește trece')
o('A13', AF, '  const gasite = doc.piese.filter((p) => piese.includes(p.id));', '  const gasite = doc.piese;', 'model', 'toate piesele primesc freza')

# Numărul T (unitare: alegerea și rolurile).
o('R01', R, '  return a.diametru === b.diametru && aceeasiForma(a.forma, b.forma) && a.regim?.turatie === b.regim?.turatie;',
  '  return a.diametru === b.diametru && aceeasiForma(a.forma, b.forma);', 'model', 'turația nu deosebește frezele (conflict la export)')
o('R02', R, '  if (luate.every((x) => x.numar !== s.numar || aceeasiFreza(x, s))) return s.numar;',
  '  if (luate.every((x) => x.numar !== s.numar)) return s.numar;', 'model', 'aceeași freză pe același număr primește alt număr')
o('R03', R, '      rez.push(...(o.rest ?? []).map((r) => r.scula));\n', '', 'model', 'frezele de rest nu se numără')

# Rândul din panou (Edge: `frezeTaiere.spec.ts`).
o('E01', P, "        {operatiiAlese.length > 0 && biblioteca.freze.length > 0 && rand(t('prop.freza'), (",
  "        {false && rand(t('prop.freza'), (", 'e2e', 'rândul nu apare')
o('E02', P, '    if (!b.stare().incarcata) void b.incarca();\n', '', 'e2e', 'panoul nu citește biblioteca după reîncărcare')
o('E03', P, '      {frezaAleasa && numarAles !== undefined && numarAles !== frezaAleasa.numar && (', '      {false && (', 'e2e', 'nota T-ului nu apare')
o('E04', P, '  const frezeOferite = frezePotrivite(biblioteca.freze, operatiiAlese);', '  const frezeOferite = biblioteca.freze;', 'e2e',
  'toată biblioteca, și frezele care nu merg')

SETURI = {
    'model': ['test/unit/alegereFreza.test.ts'],
    'model2': ['test/unit/alegereFreza.test.ts', 'test/unit/rol.test.ts', 'test/unit/rolPersonal.test.ts'],
}
E2E = ['test/e2e/frezeTaiere.spec.ts']
