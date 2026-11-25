# Lista de otrăvuri a feliei 16.A↑b-4 (nota „s-a schimbat în bibliotecă” pe rândurile ferestrei exportului; ADR 0300 §5),
# aleasă de autor: locurile frezelor unui rând, diferențele (numele, avansul, tăișul, vârful), starea originii (biblioteca
# necitită, ștearsă, la zi, recunoașterea), valorile noi (pe locul ales, doar el), fereastra („Pe toate”, numărătoarea, nota
# fundului și a frezei de rest, eticheta recunoașterii, nota ștergerii) și aplicația (biblioteca dată doar după citire).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


R = 'src/ui/exportRand.ts'
F = 'src/ui/FisaOperatie.tsx'
D = 'src/ui/DialogExport.tsx'
A = 'src/app/ExportConectat.tsx'

# Diferențele și starea originii.
o('M01', R, "  pune('nume', o?.nume ?? null, r.nume);\n", '', 'model', 'numele schimbat în bibliotecă nu se spune')
o('M02', R, "  pune('avans', o?.regim?.avans ?? null, r.regim?.avans ?? null);\n", '', 'model', 'avansul schimbat nu se spune')
o('M03', R, "  pune('tais', o?.tais ?? null, r.tais ?? null);\n", '', 'model', 'tăișul scos din bibliotecă nu se spune')
o('M04', R, "  pune('varf', loc.forma ? loc.forma.varf ?? 0 : null, s.forma ? s.forma.varf ?? 0 : null);\n", '', 'model', 'vârful nu se compară')
o('M05', R, '  if (biblioteca === null) return null;', '  if (biblioteca === null) return { fel: \'stearsa\' };', 'model',
  'biblioteca necitită spune „nu mai e în bibliotecă”')
o('M06', R, "    if (!f) return { fel: 'stearsa' };", "    if (!f) return { fel: 'la-zi' };", 'model', 'freza ștearsă trece drept la zi')
o('M07', R, "    return diferente.length === 0 ? { fel: 'la-zi' } : { fel: 'schimbata', freza: f, diferente };",
  "    return { fel: 'schimbata', freza: f, diferente };", 'model', 'o versiune nouă fără valori schimbate dă notă')
o('M08', R, 'Math.abs(x.scula.diametru - d) < 1e-9 && aceeasiForma(loc.forma, x.scula.forma)', 'Math.abs(x.scula.diametru - d) < 1e-9', 'model',
  'recunoașterea nu ține forma')
o('M09', R, "  if (fund) rez.push({ unde: 'fund', origine: p.origineFund, diametru: p.diametruSculaFund });\n", '', 'model',
  'fundul plat nu e un loc al rândului')
o('M10', R, "  if (unde === 'fund') return { diametruSculaFund: d, origineFund: origine };", "  if (unde === 'fund') return { origineFund: origine };", 'model',
  'valorile noi nu schimbă diametrul fundului')
o('M11', R, '(i === unde.k ? { ...r, diametru: d, origine } : r)', '({ ...r, diametru: d, origine })', 'model',
  'valorile noi pe o freză de rest le schimbă pe toate')

# Fereastra și aplicația.
o('W01', D, '        for (const l of locuriFreze(p)) if (l.origine?.biblioteca.id === f.id) r = { ...r, ...cuValorileNoi(r, l.unde, f, text) };',
  "        for (const l of locuriFreze(p)) if (l.origine?.biblioteca.id === f.id && l.unde === 'scula') r = { ...r, ...cuValorileNoi(r, l.unde, f, text) };",
  'e2e', '„Pe toate” schimbă doar freza operației')
o('W02', F, '  {peToate > 1 && (', '  {peToate > 2 && (', 'e2e', '„Pe toate” nu apare la două freze')
o('W03', F, "for (const l of locuriFreze(p)) if (l.origine?.biblioteca.id === id && stareOrigine(l, biblioteca)?.fel === 'schimbata') n++;",
  'for (const l of locuriFreze(p)) if (l.origine?.biblioteca.id === id) n++;', 'e2e', '„Pe toate” numără și frezele deja la zi')
o('W04', F, "recunoscuta !== undefined && !origine ?", 'false ?', 'e2e', 'freza scrisă de mână nu e recunoscută')
o('W05', F, "        {nota('fund', p.origineFund)}\n", '', 'e2e', 'fundul plat n-are notă')
o('W06', D, "{(stari[k]?.fel === 'schimbata' || stari[k]?.fel === 'stearsa') && (", '{false && (', 'e2e', 'frezele de rest n-au notă')
o('W07', F, "  if (stare?.fel === 'stearsa' && origine) {", '  if (false) {', 'e2e', 'freza ștearsă nu se spune')
# A01: practic echivalentă (fereastra exportului se montează din nou la fiecare deschidere, deci biblioteca e citită proaspăt).
o('A01', A, '  const bibliotecaToata = useMemo(() => (biblioteca.incarcata ? biblioteca.freze.filter((f) => areCam(f.fel)).map(oferita) : null), [biblioteca]);',
  '  const bibliotecaToata = useMemo(() => (biblioteca.incarcata ? biblioteca.freze.filter((f) => areCam(f.fel)).map(oferita) : null), [biblioteca.incarcata]);',
  'e2e', 'biblioteca dată ferestrei nu urmează schimbările ei')

SETURI = {'model': ['test/unit/exportFreze.nota.test.ts']}
E2E = ['test/e2e/exportFrezeNota.spec.ts', 'test/e2e/exportFreze.spec.ts']
