# Lista de otrăvuri a feliei 28.8↑f-3 (fișa operației ca componentă de sine stătătoare, ADR 0290), 24.11.2026, alese de autor:
# legătura dintre fereastră și fișă (contextul) și fișa însăși: totalul, schimbarea, conflictul frezelor, grosimea foii la gaură,
# supracursa în desen, frezele de rest, fișa randată pentru alt rând.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; toate „e2e” (cer build-ul).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DLG = 'src/ui/DialogExport.tsx'
FIS = 'src/ui/FisaOperatie.tsx'

o('E01', DLG, "dupaCheie, param, total: ordine.length, doarCitire,", "dupaCheie, param, total: operatii.length + 1, doarCitire,", 'e2e',
  'totalul din „locul N din M”, altul decât al ordinii')
o('E02', DLG, "doarCitire, schimba, randBun,", "doarCitire, schimba: () => undefined, randBun,", 'e2e', 'fișa nu mai schimbă nimic')
o('E03', DLG, "greseliRand, conflict, treceri,", "greseliRand, conflict: undefined, treceri,", 'e2e', 'conflictul frezelor nu ajunge în fișă')
o('E04', DLG, "    grosimeFoaie, supracursaCitita, cuSupracursa,", "    grosimeFoaie: undefined, supracursaCitita, cuSupracursa,", 'e2e',
  'fișa fără grosimea foii (gaura incrustației)')
o('E05', DLG, "supracursaCitita, cuSupracursa, onAlegeUrechi,", "supracursaCitita, cuSupracursa: false, onAlegeUrechi,", 'e2e',
  'desenul adâncimii fără supracursă')
o('E06', FIS, "  const p = o ? param[o.cheie] : undefined;", "  const p = o ? param[[...dupaCheie.keys()][0] ?? o.cheie] : undefined;", 'e2e',
  'fiecare fișă arată rândul primei operații')
o('E07', FIS, "{frezeRest(o.cheie, p, 'buzunar', doarCitire)}", "{null}", 'e2e', 'frezele de rest ale buzunarului lipsesc din fișă')

SETURI = {}
E2E = ['test/e2e/export.fisa.spec.ts', 'test/e2e/export.desene.spec.ts', 'test/e2e/export.spec.ts', 'test/e2e/incrustatieDreapta.spec.ts']
