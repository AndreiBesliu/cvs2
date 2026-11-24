# Lista de otrăvuri a feliei 16.A↑h-3 (catalogul de freze și „Pune în frezele mele”; ADR 0302 §1), aleasă de autor:
# catalogul (mărimile, valorile de pornire, țolii), punerea în bibliotecă (cele care sunt deja, geometria, T-ul liber,
# numele liber, plafonul, câmpurile catalogului) și fereastra (strâns la început, filtrul, căutarea, rândul, fișa, „E deja”,
# grupul, nota, alegerea din bibliotecă după catalog).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


C = 'src/model/catalogFreze.ts'
D = 'src/model/dinCatalog.ts'
W = 'src/app/FrezeleMele.tsx'

o('C01', C, '(d <= 3.175 ? 20000 : d <= 6.35 ? 18000', '(d <= 3.175 ? 18000 : d <= 6.35 ? 18000', 'catalog', 'turația frezelor mici, ca a celor de Ø6')
o('C02', C, '(d <= 2 ? 0.02 : d <= 3.175 ? 0.03', '(d <= 2 ? 0.03 : d <= 3.175 ? 0.03', 'catalog', 'așchia frezelor sub Ø2, prea mare')
o('C03', C, 'plonjare: r50(avans / 3)', 'plonjare: r50(avans / 2)', 'catalog', 'plonjarea jumătate din avans')
o('C04', C, 'const pas = Math.min(Math.round((d / 2) * 10) / 10, 4);', 'const pas = Math.min(Math.round((d / 2) * 10) / 10, 6);', 'catalog',
  'pasul frezelor mari, peste 4 mm')
o('C05', C, "tais: 12, numar: 1, ...lucru(d, 1, 50) };", "tais: 12, numar: 1, ...lucru(d, 1, 40) };", 'catalog', 'planarea cu pasul lateral 40 %')
o('C06', C, "[6.35, '1/4\"'], ", '', 'catalog', '1/4" fără nota țolilor')
o('C07', C, ', [150, [12.7, 25.4]]', '', 'catalog', 'fără V-urile de 150°')
o('C08', C, '  ...[30, 45, 60].flatMap((u) => [0.2, 0.5].map((a) => gravare(u, a, 6))),\n', '', 'catalog', 'fără gravarea pe Ø6')
o('D01', D, '    if (rez.some((f) => aceeasiGeometrie(f, a))) { existente++; continue; }\n', '', 'catalog',
  'o freză care e deja se pune a doua oară')
o('D02', D, '(!areUnghi(a.fel) || egal(a.unghi, b.unghi))', 'true', 'e2e', 'un V de alt unghi, socotit același')
o('D03', D, '    while (luate.has(numar) && numar < MARGINI_FREZA.numar) numar++;\n', '', 'catalog', 'T-ul nu e primul liber')
o('D04', D, 'nume: numeLiber(a.nume, rez, rezervate)', 'nume: a.nume', 'catalog', 'un nume luat nu primește „(2)” (freza nu intră)')
o('D05', D, '    if (rez.length >= MARGINI_FREZA.freze) { plina = true; continue; }\n', '', 'catalog', 'plafonul nu se spune')
o('D06', D, '    const { id: _i, grupCatalog: _g, ...f } = a as Freza & { id?: unknown; grupCatalog?: unknown };',
  '    const f = a as Freza; const _i = 0; const _g = 0;', 'catalog', 'grupul catalogului intră în freza din bibliotecă')
o('W01', W, '  const [catalogDeschis, setCatalogDeschis] = useState(false);', '  const [catalogDeschis, setCatalogDeschis] = useState(true);', 'e2e',
  'catalogul deschis la început')
o('W02', W, "  const catalogVazut = catalog.filter((x) => (filtru === 'toate' || x.c.fel === filtru) &&",
  "  const catalogVazut = catalog.filter((x) => (true) &&", 'e2e', 'filtrul pe fel nu alege din catalog')
o('W03', W, "&& (q === '' || x.nume.toLocaleLowerCase(limba).includes(q)));\n  const dinCatalog", ");\n  const dinCatalog", 'e2e',
  'căutarea nu alege din catalog')
o('W04', W, "{(x.tol !== undefined ? `${x.tol} · ` : '') + t('freze.catalog.rand',", "{t('freze.catalog.rand',", 'e2e', 'rândul fără țoli')
o('W05', W, '            stare.freze.some((x) => aceeasiGeometrie(x, dinCatalog.c)))', '            undefined)', 'e2e',
  'fișa unei freze din catalog, ca a unei freze a omului (Editează)')
o('W06', W, '            stare.freze.some((x) => aceeasiGeometrie(x, dinCatalog.c)))', '            false)', 'e2e', '„E deja” nu se spune niciodată')
o('W07', W, "onClick={() => { puneDinCatalog(din); }}>", "onClick={() => { puneDinCatalog(catalogVazut); }}>", 'e2e',
  '„Pune toate” pune tot catalogul, nu grupul')
o('W08', W, "...(x.tol !== undefined ? { nota: x.tol } : {}) }))).then((r) => {", "}))).then((r) => {", 'e2e',
  'freza pusă pierde nota țolilor')
o('W09', W, '    setAleasaCatalog(null);\n    setPas(id === null', '    setPas(id === null', 'e2e',
  'o freză a bibliotecii aleasă după una din catalog arată tot fișa catalogului')

SETURI = {
    'catalog': ['test/unit/catalogFreze.test.ts', 'test/unit/frezeMele.test.ts'],
}
E2E = ['test/e2e/freze.spec.ts']
