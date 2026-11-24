# Lista de otrăvuri a feliei 3.Xj (căutarea și categoriile în biblioteca extensiilor; ADR 0233), 24.11.2026, alese de autor:
# regula potrivirii (diacritice, majuscule, numele oriunde, descrierile la început de cuvânt, toate cuvintele, id-ul,
# ordinea), raftul ales și „în alte categorii”, rafturile prezente; categoriile în catalog (cititorul îngăduitor) și în
# lista bibliotecii (judecata strictă, Easy 3Draw); apoi, cap-coadă: filtrarea, „N din M”, nimic găsit, tastatura,
# pastilele, rafturile paginii, „Instalate”, telefonul și țintele.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SH = 'shared/biblioteca.ts'
SB = 'scripts/biblioteca.ts'
LB = 'extensii/biblioteca.json'
CA = 'src/extensii/cautare.ts'
BI = 'src/extensii/Biblioteca.tsx'
CS = 'src/extensii/extensii.css'
RO = 'src/i18n/carcasa.ro.ts'
EN = 'src/i18n/carcasa.en.ts'

# --- unitare: regula potrivirii ---
o('U01', CA, "s.normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase()", "s.toLowerCase()", 'cautare',
  'diacriticele despart: „imbinari” nu mai găsește „îmbinări”')
o('U02', CA, "s.normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase()", "s.normalize('NFD').replace(/\\p{M}/gu, '')", 'cautare',
  'majusculele despart: „ÎMBINĂRI” nu mai găsește nimic')
o('U03', CA, "if (nume.includes(c)) continue;", "if (nume.startsWith(c)) continue;", 'cautare',
  'în nume se caută doar la început: „draw” nu găsește „Easy 3Draw”')
o('U04', CA, "inTexte.some((x) => x.startsWith(c))", "inTexte.some((x) => x.includes(c))", 'cautare',
  'în descrieri se caută oriunde: „ifici” găsește „Planifici”')
o('U05', CA, "for (const c of cautate) {", "for (const c of cautate.slice(0, 1)) {", 'cautare',
  'doar primul cuvânt căutat contează')
o('U06', CA, "const nume = `${simplu(e.nume)} ${e.id}`;", "const nume = simplu(e.nume);", 'cautare',
  'id-ul extensiei nu se mai caută')
o('U07', CA, "vizibile: [...peRaft].sort((a, b) => b.p - a.p).map((x) => x.e),", "vizibile: peRaft.map((x) => x.e),", 'cautare',
  'potrivirile din nume nu mai stau primele')
o('U08', CA, "sort((a, b) => b.p - a.p)", "sort((a, b) => a.p - b.p)", 'cautare',
  'potrivirile din nume stau ultimele')
o('U09', CA, "const peRaft = gasite.filter((x) => categorie === null || x.e.categorii.includes(categorie));", "const peRaft = gasite;", 'cautare',
  'raftul ales nu filtrează')
o('U10', CA, "inAlteCategorii: cautate.length === 0 ? 0 : gasite.length - peRaft.length,", "inAlteCategorii: gasite.length - peRaft.length,", 'cautare',
  'fără text căutat, raftul ales tot spune „în alte categorii”')
o('U11', CA, "inAlteCategorii: cautate.length === 0 ? 0 : gasite.length - peRaft.length,", "inAlteCategorii: 0,", 'cautare',
  'ce găsește căutarea pe celelalte rafturi nu se numără')
o('U12', CA, "    .filter((c) => c.cate > 0);", ";", 'cautare',
  'rândul rafturilor le arată și pe cele goale')
o('U13', CA, "cate: elemente.filter((e) => e.categorii.includes(id)).length", "cate: elemente.length", 'cautare',
  'fiecare raft are numărul întregii liste')
o('U14', CA, "split(/[^\\p{L}\\p{N}]+/u)", "split(/\\s+/u)", 'cautare',
  'semnele nu despart cuvintele: „3D,LEGO” e un singur cuvânt')

# --- unitare: categoriile în catalog (cititorul îngăduitor) ---
o('H01', SH, "const stiute = (x as string[]).filter(esteCategorie);", "const stiute = x as CategorieBiblioteca[];", 'cautare',
  'o categorie pe care fila n-o știe ajunge pe ecran')
o('H02', SH, "  if (categorii && categorieSarita) sarite.push(`${id}: categorii`);\n", "", 'cautare',
  'o categorie neștiută cade pe tăcute, fără numele câmpului')
o('H03', SH, "if (!Array.isArray(x) || x.length > MAX_CATEGORII || !x.every((y) => typeof y === 'string')", "if (!Array.isArray(x) || !x.every((y) => typeof y === 'string')", 'cautare',
  'catalogul primește oricâte categorii pe o extensie')
o('H04', SH, "!x.every((y) => typeof y === 'string') || new Set(x).size !== x.length) return null;", "!x.every((y) => typeof y === 'string')) return null;", 'cautare',
  'catalogul primește aceeași categorie de două ori')
o('H05', SH, "...(categorii && categorii.length > 0 ? { categorii } : {}),", "...(categorii ? { categorii } : {}),", 'cautare',
  'un rând doar cu categorii neștiute rămâne cu o listă goală de categorii')
o('H06', SH, "x.length > MAX_CATEGORII || !x.every((y) => typeof y === 'string') || ", "x.length > MAX_CATEGORII || ", 'cautare',
  'un număr în lista categoriilor nu mai strică forma ei')
o('H07', SH, "export const CATEGORII_BIBLIOTECA = ['desen', 'cnc', 'imprimare', 'masina', 'modele'] as const;", "export const CATEGORII_BIBLIOTECA = ['modele', 'desen', 'cnc', 'imprimare', 'masina'] as const;", 'cautare',
  'rafturile, în altă ordine decât cea hotărâtă')

# --- unitare: categoriile în lista bibliotecii (judecata strictă) și în catalogul construit ---
o('B01', SB, "!c.every(esteCategorie) || ", "", 'constructie',
  'lista bibliotecii primește o categorie care nu există')
o('B02', SB, "c.length < 1 || ", "", 'constructie',
  'lista bibliotecii primește o listă goală de categorii')
o('B03', SB, "c.length > MAX_CATEGORII || ", "", 'constructie',
  'lista bibliotecii primește oricâte categorii')
o('B04', SB, " || new Set(c).size !== c.length) {", ") {", 'constructie',
  'lista bibliotecii primește aceeași categorie de două ori')
o('B05', SB, "      ...(x.categorii ? { categorii: x.categorii } : {}),\n", "", 'constructie',
  'catalogul construit nu poartă categoriile')
o('B06', SB, "      ...(categorii ? { categorii } : {}),\n", "", 'constructie',
  'cititorul listei aruncă categoriile')
o('B07', SB, "dintre: ${CATEGORII_BIBLIOTECA.join(', ')}", "dintre cele știute", 'constructie',
  'refuzul nu mai înșiră rafturile care există')
o('B08', LB, "      \"categorii\": [\n        \"modele\",\n        \"imprimare\",\n        \"cnc\"\n      ],\n", "", 'constructie',
  'Easy 3Draw nu stă pe niciun raft')
o('B09', LB, "        \"modele\",\n        \"imprimare\",", "        \"imprimare\",\n        \"modele\",", 'constructie',
  'raftul principal al lui Easy 3Draw e altul')

# --- e2e: filtrarea ---
o('E01', BI, "      {vizibile.map(cardul)}\n", "      {elemente.map(cardul)}\n", 'e2e',
  'câmpul căutării nu filtrează lista')
o('E02', BI, "[e.rand.descriere[limba], e.rand.despre?.[limba] ?? '', ", "[e.rand.despre?.[limba] ?? '', ", 'e2e',
  'descrierea din rând nu se caută')
o('E03', BI, "e.rand.despre?.[limba] ?? '', e.rand.autor ?? '', ", "e.rand.autor ?? '', ", 'e2e',
  'descrierea lungă nu se caută')
o('E04', BI, "e.rand.despre?.[limba] ?? '', e.rand.autor ?? '', ...", "e.rand.despre?.[limba] ?? '', ...", 'e2e',
  'autorul nu se caută')
o('E05', BI, "e.rand.autor ?? '', ...(e.rand.categorii ?? []).map(numeCategorie)] : [],", "e.rand.autor ?? ''] : [],", 'e2e',
  'numele rafturilor nu se caută')
o('E06', BI, "texte: e.rand ? [e.rand.descriere[limba], ", "texte: e.rand ? [e.rand.descriere.ro, ", 'e2e',
  'în engleză se caută tot în descrierea românească')
o('E07', BI, "...e, nume: numeleLui(e), categorii: e.rand?.categorii ?? [],", "...e, nume: e.rand?.nume ?? '', categorii: e.rand?.categorii ?? [],", 'e2e',
  'o extensie din afara bibliotecii nu se găsește după nume')
o('E08', BI, "{t('extensii.biblioteca.gasite', { n: vizibile.length, m: elemente.length })}", "{t('extensii.biblioteca.gasite', { n: elemente.length, m: elemente.length })}", 'e2e',
  '„N din M” spune mereu toată lista')
o('E09', BI, "        {filtrat && (\n          <span className=\"bib-gasite\"", "        {true && (\n          <span className=\"bib-gasite\"", 'e2e',
  '„N din M” stă și lângă lista nefiltrată')
o('E10', BI, "const aratat = alesul ?? (lipsa ? undefined : vizibile[0]);", "const aratat = alesul ?? (lipsa ? undefined : vizibile[0] ?? elemente[0]);", 'e2e',
  'lângă o listă goală, pagina arată altă extensie')
o('E11', BI, "const alesul = ales === null ? undefined : vizibile.find((e) => e.id === ales);", "const alesul = ales === null ? undefined : cautabile.find((e) => e.id === ales);", 'e2e',
  'pagina rămâne pe o extensie pe care căutarea a scos-o din listă')

# --- e2e: nimic găsit ---
o('N01', BI, ": t('extensii.biblioteca.nimic', { text: cautat.trim() })}", ": t('extensii.biblioteca.nimic', { text: '' })}", 'e2e',
  'starea „nimic” nu spune ce s-a căutat')
o('N02', BI, "onClick={() => { setCautat(''); peRaft(null, true); }}", "onClick={() => { peRaft(null, true); }}", 'e2e',
  '„Arată toate extensiile” lasă textul căutat')
o('N03', BI, "    if (inCamp) camp.current?.focus();\n", "", 'e2e',
  'după „Arată toate extensiile”, focusul nu ajunge în câmp')
o('N04', BI, "filtrat && elemente.length > 0 && <p className=\"bib-nota\" data-testid=\"pagina-nimic\">", "filtrat && elemente.length > 99 && <p className=\"bib-nota\" data-testid=\"pagina-nimic\">", 'e2e',
  'lângă o căutare fără rezultat, locul paginii e gol')
o('N05', BI, "catalog.fel !== 'incarca' && !(filtrat && elemente.length > 0) && (", "catalog.fel !== 'incarca' && (", 'e2e',
  'o căutare fără rezultat arată drumurile unei biblioteci goale')
o('N06', BI, "            {raft !== null && cuText\n", "            {raft === null && cuText\n", 'e2e',
  'starea „nimic” nu spune raftul în care s-a căutat')
o('N07', BI, "<button type=\"button\" data-extensii=\"in-toate-categoriile\" onClick={() => { peRaft(null, true); }}>", "<button type=\"button\" data-extensii=\"in-toate-categoriile\" onClick={() => { }}>", 'e2e',
  '„Caută în toate categoriile”, din starea „nimic”, nu face nimic')
o('N08', BI, "className=\"bib-alte\" data-extensii=\"in-toate-categoriile\" onClick={() => { peRaft(null, true); }}>", "className=\"bib-alte\" data-extensii=\"in-toate-categoriile\" onClick={() => { }}>", 'e2e',
  '„Caută în toate categoriile”, de sub rânduri, nu face nimic')
o('N09', BI, "      {vizibile.length > 0 && inAlteCategorii > 0 && (\n", "      {vizibile.length > 0 && inAlteCategorii > 99 && (\n", 'e2e',
  'cu rezultate pe raftul ales, cele de pe alte rafturi nu se mai spun')
o('N10', BI, "          {inAlteCategorii > 0 && (\n            <button type=\"button\" data-extensii=\"in-toate-categoriile\"", "          {inAlteCategorii > 99 && (\n            <button type=\"button\" data-extensii=\"in-toate-categoriile\"", 'e2e',
  'starea „nimic” nu oferă celelalte rafturi')

# --- e2e: tastatura ---
o('T01', BI, "if (e.key === '/' && !e.ctrlKey", "if (e.key === '\\\\' && !e.ctrlKey", 'e2e',
  '„/” nu duce în câmpul căutării')
o('T02', BI, " && !e.altKey && !(e.target instanceof HTMLInputElement)) {", " && !e.altKey) {", 'e2e',
  '„/” nu se mai poate scrie în câmp')
o('T03', BI, "    if (e.key === 'Escape' && cautat !== '') {\n", "    if (e.key === 'Escape' && cautat === '\\u0000') {\n", 'e2e',
  'Escape, cu text în câmp, închide fereastra')
o('T04', BI, "      e.stopPropagation();\n      setCautat('');", "      setCautat('');", 'e2e',
  'Escape golește câmpul și închide și fereastra')
o('T05', BI, "    } else if (e.key === 'ArrowDown') {\n      const primul", "    } else if (e.key === 'PageDown') {\n      const primul", 'e2e',
  '↓ din câmp nu trece în listă')
o('T06', BI, "      e.preventDefault();\n      setAles(vizibile[0].id);", "      e.preventDefault();", 'e2e',
  'Enter în câmp nu alege primul rezultat')
o('T07', BI, "if (c && !c.disabled && c.offsetParent !== null) { e.preventDefault(); c.focus(); c.select(); }", "if (c && !c.disabled && c.offsetParent !== null) { c.focus(); c.select(); }", 'e2e',
  '„/” ajunge și scris în câmp')

# --- e2e: pastilele rafturilor ---
o('R01', BI, "const { vizibile, inAlteCategorii } = cauta(cautabile, cautat, raft);", "const { vizibile, inAlteCategorii } = cauta(cautabile, cautat, null);", 'e2e',
  'un raft ales nu filtrează lista')
o('R02', BI, "data-categorie=\"\" aria-pressed={raft === null}", "data-categorie=\"\" aria-pressed={true}", 'e2e',
  '„Toate” rămâne apăsată și cu un raft ales')
o('R03', BI, "data-categorie={r.id} aria-pressed={raft === r.id}", "data-categorie={r.id} aria-pressed={false}", 'e2e',
  'raftul ales nu se vede apăsat')
o('R04', BI, "<span className=\"bib-cate\">{elemente.length}</span>", "<span className=\"bib-cate\">{vizibile.length}</span>", 'e2e',
  'numărul lui „Toate” sare cu filtrul')
o('R05', BI, "const rafturi = categoriiPrezente(cautabile);", "const rafturi = categoriiPrezente(cauta(cautabile, cautat, null).vizibile);", 'e2e',
  'numerele rafturilor sar la fiecare literă')
o('R06', BI, "const raft = categorie !== null && rafturi.some((r) => r.id === categorie) ? categorie : null;", "const raft = categorie;", 'e2e',
  'un raft care lipsește în fila nouă rămâne ales, cu lista goală')
o('R07', BI, "  useEffect(() => { if (categorie !== raft) setCategorie(raft); }, [categorie, raft]);\n", "", 'e2e',
  'raftul părăsit revine singur la întoarcerea în filă')
o('R08', BI, "      {rafturi.length > 0 && (\n", "      {elemente.length > 0 && (\n", 'e2e',
  'fără catalog, „Instalate” are un rând de categorii gol')
o('R09', BI, "role=\"group\" aria-label={t('extensii.biblioteca.categorii')} data-testid=\"biblioteca-categorii\"", "data-testid=\"biblioteca-categorii\"", 'e2e',
  'rândul rafturilor n-are nume pentru cititorul de ecran')

# --- e2e: rafturile de pe pagina extensiei ---
o('P01', BI, "data-categorie={c} onClick={() => { onCategorie(c); }}>", "data-categorie={c} onClick={() => { }}>", 'e2e',
  'un raft de pe pagină nu alege nimic')
o('P02', BI, "              {rand.categorii.map((c) => (", "              {[...rand.categorii].reverse().map((c) => (", 'e2e',
  'pe pagină, raftul principal nu mai e primul')
o('P03', BI, "                    if (ingust()) setAles(null);\n", "", 'e2e',
  'pe telefon, raftul ales de pe pagină nu întoarce lista')

# --- e2e: așezarea și țintele ---
o('A01', CS, "  .bib-filtre {\n    flex-direction: column;\n    align-items: stretch;\n    gap: var(--sp-2);\n  }\n", "", 'e2e',
  'pe telefon, bara căutării rămâne pe un rând și iese din ecran')
o('A02', CS, "  .dialog-biblioteca .bib-file [role='tab'],\n  .dialog-biblioteca .bib-categorii button,\n", "  .dialog-biblioteca .bib-file [role='tab'],\n", 'e2e',
  'la atingere, pastilele rămân sub 44 px')
o('A03', CS, ":root[data-densitate='mare'] .dialog-biblioteca .bib-categorii button,\n", "", 'e2e',
  'la densitatea mare, pastilele rămân sub 48 px')
o('A04', CS, "  .dialog-biblioteca .bib-categorii button,\n  .dialog-biblioteca .bib-eticheta,\n", "  .dialog-biblioteca .bib-categorii button,\n", 'e2e',
  'la atingere, rafturile de pe pagină rămân sub 44 px')
o('A05', CS, ".dialog .bib-camp {\n  flex: 1;\n  min-width: 0;\n  min-height: var(--tinta);", ".dialog .bib-camp {\n  flex: 1;\n  min-width: 0;\n  min-height: 28px;", 'e2e',
  'câmpul căutării e sub ținta de atingere')
o('A06', CS, "  .dialog-biblioteca[data-ales] .bib-file,\n  .dialog-biblioteca[data-ales] .bib-filtre {", "  .dialog-biblioteca[data-ales] .bib-file {", 'e2e',
  'pe telefon, bara căutării rămâne deasupra paginii extensiei')

# --- e2e: textele ---
o('X01', RO, "'extensii.biblioteca.cauta': 'Caută o extensie',", "'extensii.biblioteca.cauta': 'Caută',", 'e2e',
  'câmpul nu spune ce caută')
o('X02', EN, "'extensii.categorie.modele': 'Toys and models',", "'extensii.categorie.modele': 'Jucării și modele',", 'e2e',
  'un raft netradus în engleză')
o('X03', RO, "'extensii.biblioteca.gasite': '{n} din {m}',", "'extensii.biblioteca.gasite': '{m} din {n}',", 'e2e',
  '„N din M”, întors')

SETURI = {
    'cautare': ['test/unit/extensii.cautare.test.ts'],
    'constructie': ['test/unit/biblioteca.constructie.test.ts'],
}
E2E = ['test/e2e/extensii.cautare.spec.ts', 'test/e2e/extensii.tinte.spec.ts']
