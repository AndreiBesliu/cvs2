# Lista de otrăvuri a feliei 28.8↑l (tastatura și cititorul de ecran în fereastra exportului, ADR 0291; constatarea 13 a
# auditului), 26.11.2026, alese de autor: focusul pe titlul fișei adus de listă (și de „Du-mă la …” al unui refuz), focusul pe
# câmpul greșit la „Du-mă la …” al greșelilor, titlul grupului înaintea explicației, descrierile câmpurilor (explicația întreagă și
# greșelile), `aria-live` doar pe greșeli.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DE = 'src/ui/DialogExport.tsx'
FO = 'src/ui/FisaOperatie.tsx'
ER = 'src/ui/exportRand.ts'

# Focusul adus de listă.
o('L01', DE, "    if (cum === 'titlu') f.querySelector<HTMLElement>(':scope > h3')?.focus({ preventScroll: true });\n", '', 'e2e',
  'lista nu mai duce focusul pe titlul fișei')
o('L02', DE, "      du: (c) => { du(c, 'titlu'); },", '      du: (c) => { du(c); },', 'e2e', 'rândurile operațiilor nu mai duc focusul')
o('L03', DE, "onClick={() => { du('masina', 'titlu'); }}>", "onClick={() => { du('masina'); }}>", 'e2e', 'rândul mașinii nu mai duce focusul')
o('L04', FO, '      <h3 tabIndex={-1}>{o.descriere}</h3>', '      <h3>{o.descriere}</h3>', 'e2e',
  'titlul fișei unei operații nu poate primi focusul')
o('L05', DE, "onClick={() => { du(primaGresita, 'repara'); }}>", "onClick={() => { du(primaGresita, 'titlu'); }}>", 'e2e',
  '„Du-mă la …” al greșelilor duce focusul pe titlu, nu pe câmpul greșit')
# Ordinea grupului și aria-live.
o('L06', DE, "        <h4>{t(`export.grup.${id}` as CheieSimpla)}</h4>\n        <div className=\"dx-stanga\">",
  "        <div className=\"dx-stanga\">\n        <h4>{t(`export.grup.${id}` as CheieSimpla)}</h4>", 'e2e',
  'titlul grupului după desen și explicație, ca înainte')
o('L07', DE, "            data-deschisa={deschisa ? '' : undefined}>", "            data-deschisa={deschisa ? '' : undefined} aria-live=\"polite\">", 'e2e',
  'explicațiile se anunță iar la fiecare mutare a mausului')
o('L08', DE, '          <div className="dx-greseli" data-greseli aria-live="polite">', '          <div className="dx-greseli" data-greseli>', 'e2e',
  'greșelile nu se mai anunță singure')
# Descrierile câmpurilor.
o('L09', DE, '  useLayoutEffect(() => { rezervaExplicatii(panou.current); legaDescrierile(panou.current); });',
  '  useLayoutEffect(() => { rezervaExplicatii(panou.current); });', 'e2e', 'câmpurile fără descriere')
o('L10', ER, "    const ids = [...g.querySelectorAll<HTMLElement>('[data-descriere], [data-greseala]')]",
  "    const ids = [...g.querySelectorAll<HTMLElement>('[data-descriere]')]", 'e2e', 'greșelile grupului nu descriu câmpurile')
o('L11', DE, '          <span id={`${idGrup}-e`} data-descriere hidden>{explicatie}</span>',
  '          <span id={`${idGrup}-e`} data-descriere hidden>{textStrans(explicatie)}</span>', 'e2e',
  'descrierea e explicația prescurtată, ca pe ecran')
o('L12', ER, "  return `dx-d-${loc.replace(/[^A-Za-z0-9_-]/g, '_')}`;", "  return 'dx-d';", 'e2e',
  'același id la toate grupurile: câmpurile descrise de explicația altui grup')
# Telefonul culcat (640 × 360).
o('L13', 'src/app/stil.css', '  .dx-lista .dx-nume {\n    max-width: 100%;\n    overflow: hidden;\n    white-space: nowrap;',
  '  .dx-lista .dx-nume {\n    max-width: 100%;\n    overflow: hidden;', 'e2e', 'numele din bandă pe două rânduri: fișelor le rămâne sub o treime')

E2E = ['test/e2e/export.tastatura.spec.ts', 'test/e2e/export.hartie.spec.ts', 'test/e2e/export.privire.spec.ts']
