# Lista de otrăvuri a feliei 28.8↑r (ADR 0292: începutul programului, la vedere în Rezultat), 26.11.2026, alese de autor:
# funcția pură (tăierea la prima mișcare de lucru, comentariile dialectului, plafonul, restul), calculul exportului (fișierele
# foii și ale dopurilor, foaia activă la „Toate foile”), starea ferestrei și blocul din Rezultat (desfăcut, focusabil, cu nume,
# derulat în locul lui).
# Se rulează cu `scripts/otravuri.py`, dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


IN = 'src/post/inceput.ts'
AC = 'src/ui/actiuniExportCalcul.ts'
AP = 'src/app/App.tsx'
DE = 'src/ui/DialogExport.tsx'
CS = 'src/app/stil.css'

# Funcția pură.
o('R01', IN, 'const TAIERE = /(?:^|[^A-Z0-9.])G0*[123](?![0-9.])/i;', 'const TAIERE = /(?:^|[^A-Z0-9.])G0*[123]/i;', 'inceput',
  'G17 și G21 trec drept tăieri')
o('R02', IN, '  if (comentariu === null) return linie;\n  const { deschidere, inchidere } = comentariu;',
  '  if (comentariu === null || linie !== \'\') return linie;\n  const { deschidere, inchidere } = comentariu;', 'inceput',
  'un comentariu cu „G1” trece drept tăiere')
o('R03', IN, "  if (inchidere === '') {", "  if (inchidere === 'x') {", 'inceput', 'apostroful NcStudio citit ca o pereche')
o('R04', IN, '    if (linii.length === maxim) break;', '    if (linii.length > maxim) break;', 'inceput', 'o linie peste plafon')
o('R05', IN, "    if (TAIERE.test(cod(l, comentariu))) return { linii, taiere: true, restul: toate.length - linii.length };",
  "    if (TAIERE.test(cod(l, comentariu))) return { linii, taiere: true, restul: toate.length };", 'inceput', 'restul greșit')
o('R06', IN, "  if (toate.at(-1) === '') toate.pop();", '', 'inceput', 'linia goală de la capăt numărată')
o('R07', IN, '    if (b < 0) return rez;', '    if (b < 0) return rez + linie.slice(a + deschidere.length);', 'inceput',
  'un comentariu neînchis nu mai ascunde restul rândului')
o('R08', IN, '    linii.push(l);\n', '    if (l !== \'\') linii.push(l);\n', 'inceput', 'o linie goală a programului lipsește din început')
# Calculul exportului.
o('R09', AC, '    ...numit, inceput: inceputuri([...numit.fisiere, ...numit.dopuri.flatMap((d) => d.fisiere)], p), avertismente:',
  '    ...numit, inceput: inceputuri([...numit.fisiere], p), avertismente:', 'inceput', 'dopurile fără început')
o('R10', AC, '      if (activa) aleActivei.push({ nume: intrare.nume, text: x.text });',
  '      aleActivei.push({ nume: intrare.nume, text: x.text });', 'inceput', 'cu „Toate foile”, începutul tuturor foilor')
o('R11', AC, '    ...numit, inceput: inceputuri([...numit.fisiere, ...numit.dopuri.flatMap((d) => d.fisiere)], p), avertismente:',
  '    ...numit, inceput: inceputuri([...rest.fisiere, ...rest.dopuri.flatMap((d) => d.fisiere)], p), avertismente:', 'inceput',
  'numele ales de om nu e și al începutului')
# Fereastra.
o('R12', AP, ' ...(r.inceput.length > 0 ? { inceput: r.inceput } : {}),', '', 'e2e', 'începutul nu ajunge în fereastră')
o('R13', DE, "        <details key={f.nume} data-inceput-fisier={f.nume} open={k === 0}>",
  "        <details key={f.nume} data-inceput-fisier={f.nume} open>", 'e2e', 'toate rândurile desfăcute')
o('R14', DE, "          <pre tabIndex={0} aria-label={t('export.rezultat.inceput.eticheta', { nume: f.nume })}>",
  "          <pre aria-label={t('export.rezultat.inceput.eticheta', { nume: f.nume })}>", 'e2e', 'liniile nu se derulează din tastatură')
o('R15', DE, "          <pre tabIndex={0} aria-label={t('export.rezultat.inceput.eticheta', { nume: f.nume })}>",
  "          <pre tabIndex={0}>", 'e2e', 'liniile fără nume accesibil')
o('R16', CS, '  max-height: 16lh;\n  margin: var(--sp-1) 0 0;\n  padding: var(--sp-2);\n  overflow: auto;',
  '  max-height: 16lh;\n  margin: var(--sp-1) 0 0;\n  padding: var(--sp-2);\n  overflow: visible;', 'e2e', 'liniile lungi ies din fereastră')
o('R17', DE, "{t(f.taiere ? 'export.rezultat.inceput.fisier' : 'export.rezultat.inceput.fara', { nume: f.nume, n: f.linii.length })}",
  "{t(f.taiere ? 'export.rezultat.inceput.fisier' : 'export.rezultat.inceput.fara', { nume: f.nume, n: f.linii.length + 1 })}", 'e2e',
  'rândul spune alt număr de linii')

SETURI = {
    'inceput': ['test/unit/export.inceput.test.ts'],
}
E2E = ['test/e2e/export.inceput.spec.ts', 'test/e2e/export.privire.spec.ts']
