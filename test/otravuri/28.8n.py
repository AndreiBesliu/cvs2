# Lista de otrăvuri a feliei 28.8↑n (numele fișierului, ADR 0291 §5), 25.11.2026, alese de autor: regula numelor (propunerea
# din numele foii, verificarea, baza înlocuită), legătura ei cu exportul (o foaie, toate foile, Mașina) și câmpul ferestrei
# (cererea, verificarea, „Du-mă la”, RichAuto, Rezultatul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; cele „e2e” cer build-ul.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NF = 'src/post/numeFisier.ts'
CALC = 'src/ui/actiuniExportCalcul.ts'
DLG = 'src/ui/DialogExport.tsx'
APP = 'src/app/App.tsx'

# Regula numelor (proba unitară).
o('U01', NF, "  const slug = (numeFoaie ?? '').normalize", "  const slug = ('').normalize", 'nume', 'propunerea nu mai pornește din numele foii')
o('U02', NF, ".normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')", ".normalize('NFC')", 'nume', 'propunerea păstrează diacriticele')
o('U03', NF, "  if (REZERVATE.test(nume)) return 'rezervat';\n", "", 'nume', 'numele rezervate de Windows trec')
o('U04', NF, "  if (nume !== nume.trim() || nume.startsWith('.') || nume.endsWith('.')) return 'margini';\n", "", 'nume',
  'spațiile și punctele de la margini trec')
o('U05', NF, "rest === '' || rest.startsWith('-') || rest.startsWith('.') ? `${baza}${rest}` : nume",
  "`${baza}${rest}`", 'nume', 'baza înlocuită și într-un nume care doar începe la fel')
o('U06', NF, "  if ([...nume].length > LUNGIME_NUME) return 'lung';\n", "", 'nume', 'un nume prea lung trece')
o('U07', CALC, "...cuNumele(rest, p), avertismente", "...rest, avertismente", 'nume', 'exportul unei foi ignoră numele ales')
o('U08', CALC, "nume: cuBaza(numeInArhiva(x.nume, prim.k + 1, g.length, p.origine, contract.numeScurt), p.origine, p.numeFisier)",
  "nume: numeInArhiva(x.nume, prim.k + 1, g.length, p.origine, contract.numeScurt)", 'nume', 'numele din arhiva foilor rămân cele de azi')
o('U09', CALC, "masina: fisiere.map((f) => ({ ...f, nume: cuBaza(f.nume, p.origine, p.numeFisier) }))", "masina: fisiere", 'nume',
  'programul foii active, dus în Mașina, păstrează numele de azi')

# Câmpul ferestrei (e2e).
o('E01', DLG, "...(!numeScurt && numeFisier !== bazaFisier(origine) ? { numeFisier } : {}),", "", 'e2e', 'numele ales nu pleacă în cerere')
o('E02', DLG, "    && supracursaBuna && numeBun;", "    && supracursaBuna;", 'e2e', 'un nume greșit nu oprește exportul')
o('E03', DLG, "!supracursaBuna ? 'foaia' : !numeBun ? 'masina' : ordine", "!supracursaBuna ? 'foaia' : ordine", 'e2e',
  '„Du-mă la” nu duce la numele greșit')
o('E04', DLG, "aria-invalid={!numeBun} disabled={numeScurt}", "aria-invalid={!numeBun} disabled={false}", 'e2e',
  'pe RichAuto, câmpul rămâne deschis')
o('E05', DLG, "const numeFisier = numeAles ?? propunereNume(numeFoaie, origine);", "const numeFisier = numeAles ?? propunereNume(undefined, origine);",
  'e2e', 'fereastra nu ia numele foii')
o('E06', APP, " : fisiere[0] ? { nume: fisiere[0].nume } : {}),", " : {}),", 'e2e', 'Rezultatul nu spune numele fișierului')
o('E07', DLG, "data-nav=\"masina\" aria-current={curent === 'masina'} data-gresit={numeBun ? undefined : ''}",
  "data-nav=\"masina\" aria-current={curent === 'masina'}", 'e2e', 'fără punctul greșelii pe „Mașina și fișierul”')

SETURI = {
    'nume': ['test/unit/export.numeFisier.test.ts', 'test/unit/export.foi.test.ts'],
}
E2E = ['test/e2e/export.nume.spec.ts']
