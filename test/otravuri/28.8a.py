# Lista de otrăvuri a feliei 28.8↑a (fereastra exportului pe listă și fișă, ADR 0290), 23.11.2026, alese de autor: grupurile
# fiecărui fel de operație și grupul fiecărui câmp (`exportGrupuri.ts`), apoi fereastra: lista care aduce fișa sus și o
# urmărește la derulare, explicația câmpului activ, trecerile egale, greșelile în grupul câmpului (cu punctul din listă și
# „du-mă acolo”), ce nu se aplică (despărțirea pe contururi închise), eroarea exportului jos și Rezultatul adus o singură dată.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


GR = 'src/ui/exportGrupuri.ts'
DLG = 'src/ui/DialogExport.tsx'

# ---- Grupurile (pe hârtie) ----
o('G01', GR, "  if (f.tip === 'profil') return f.deschis ? comune : [...comune, 'rampa', 'intrari', 'colturi', 'urechi'];",
  "  if (f.tip === 'profil') return [...comune, 'rampa', 'intrari', 'colturi', 'urechi'];", 'grupuri',
  'pe o cale deschisă apar rampa, intrările, colțurile și urechile')
o('G02', GR, "  if (f.tip === 'gaurire') return [...comune, 'gaurire'];", "  if (f.tip === 'gaurire') return comune;", 'grupuri',
  'găurirea fără grupul ei')
o('G03', GR, "...(f.inele ? ['coborare' as const] : [])", "'coborare' as const", 'grupuri',
  'buzunarul pe linii paralele cu grupul coborârii')
o('G04', GR, "...(f.incrustatie && f.banda ? ['banda' as const] : [])", "...(f.banda ? ['banda' as const] : [])", 'grupuri',
  'banda fără incrustație')
o('G05', GR, "  'inc-treapta': ['treapta'], 'inc-treapta-adancime': ['treapta'], 'inc-treapta-latime': ['treapta'],",
  "  'inc-treapta': ['treapta'], 'inc-treapta-adancime': ['treapta'],", 'grupuri', 'un câmp al ferestrei fără grup')
o('G06', GR, "  scula: 'freza', vcarve: 'freza',", "  scula: 'freza', vcarve: 'taietura',", 'grupuri',
  '„V-carve-ul cere o freză în V” spus la tăietură, departe de câmpul de reparat')
o('G07', GR, "if (!v[k] && !out.includes(g)) out.push(g);", "if (!v[k]) out.push(g);", 'grupuri', 'grupurile greșite repetate')
o('G08', GR, "Array<[keyof VerdictRand, GrupExport]>).filter(([k]) => !v[k]);", "Array<[keyof VerdictRand, GrupExport]>).filter(([k]) => v[k]);",
  'grupuri', 'verdictele bune luate drept greșite')

# ---- Fereastra (e2e) ----
o('E01', DLG, '    p.scrollTop += f.getBoundingClientRect().top - p.getBoundingClientRect().top;\n', '', 'e2e',
  'clicul din listă nu aduce fișa sus')
o('E02', DLG, '    if (gasit !== null && gasit !== curent) setCurent(gasit);', '    if (false) setCurent(gasit);', 'e2e',
  'derularea nu mută marcajul din listă')
o('E03', DLG, "    if (text !== '' && (activ?.loc !== loc || activ.text !== text)) setActiv({ loc, text });",
  "    if (false) setActiv({ loc, text });", 'e2e', 'explicația câmpului activ nu apare')
o('E04', DLG, "    for (const [k, g] of verdicteGresite(randBun(p))) pune(motivVerdict(k, p), k === 'rest' && p.tip === 'vcarve' ? 'fund' : g);",
  "    for (const [k, g] of verdicteGresite(randBun(p))) void [k, g];", 'e2e', 'greșelile nu se spun în grupul câmpului')
o('E05', DLG, "  const primaGresita: string | null = !supracursaBuna ? 'foaia' : ordine.find((k) => greseliRand(k).length > 0) ?? null;",
  "  const primaGresita: string | null = null;", 'e2e', 'fără „du-mă acolo”')
o('E06', DLG, "data-gresit={gresit ? '' : undefined}", 'data-gresit={undefined}', 'e2e', 'fără punctul roșu în listă')
o('E07', DLG, '    const n = Math.max(1, Math.ceil(a / s - 1e-9));', '    const n = Math.max(1, Math.floor(a / s));', 'e2e',
  'trecerile numărate în jos (10 cu pasul 4: două treceri de 5, mai adânci decât pasul)')
o('E08', DLG, "    if (cuRezultat && !cuRezultatInainte.current) du('rezultatul');\n    cuRezultatInainte.current = cuRezultat;\n  }, [cuRezultat]);",
  "    if (stare?.ok) du('rezultatul');\n    cuRezultatInainte.current = cuRezultat;\n  }, [stare]);", 'e2e',
  'Rezultatul adus la fiecare schimbare a stării (și când sosește simularea)')
o('E09', DLG, "                    {/* Despărțirea foii (ADR 0037 §8): doar pe un rând cu căi deschise; o marchează omul, aplicația n-o ghicește. */}\n                    {deschis && (",
  "                    {/* Despărțirea foii (ADR 0037 §8): doar pe un rând cu căi deschise; o marchează omul, aplicația n-o ghicește. */}\n                    {true && (",
  'e2e', 'despărțirea apare și pe contururi închise')
o('E10', DLG, "          {stare && !stare.ok && !cere && <p role=\"status\" className=\"avertisment\" data-testid=\"export-stare\">",
  "          {false && stare && !stare.ok && !cere && <p role=\"status\" className=\"avertisment\" data-testid=\"export-stare\">", 'e2e',
  'refuzul exportului nu se mai spune')

SETURI = {
    'grupuri': ['test/unit/export.grupuri.test.ts'],
}
E2E = ['test/e2e/export.fisa.spec.ts', 'test/e2e/otravuri-23c.spec.ts', 'test/e2e/gaurire.spec.ts', 'test/e2e/supracursa.spec.ts']
