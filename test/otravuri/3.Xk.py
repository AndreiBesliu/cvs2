# Lista de otrăvuri a feliei 3.Xk (proba repornirii cerute de extensie, cu ceasul paginii ținut de probă; ADR 0165), 24.11.2026,
# alese de autor: rărirea repornirilor (intervalul, temporizatorul prea devreme și prea târziu, cererile adunate, clipa ultimei
# reporniri), oprirea la închidere, cererea extensiei ignorată. Toate prin e2e: felia e doar a probei, iar regula are deja
# proba ei unitară (`extensii.repornire.test.ts`, cu ceas fals).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RP = 'src/extensii/repornire.ts'
EX = 'src/extensii/Extensii.tsx'

o('R01', RP, "export const INTERVAL_REPORNIRE_MS = 2000;", "export const INTERVAL_REPORNIRE_MS = 0;", 'e2e',
  'rărirea dispare: fiecare cerere repornește pe loc')
o('R02', RP, "temporizator = ceas.dupa(peste, acum);", "temporizator = ceas.dupa(peste / 2, acum);", 'e2e',
  'repornirea amânată vine prea devreme (la o secundă)')
o('R03', RP, "temporizator = ceas.dupa(peste, acum);", "temporizator = ceas.dupa(peste + 1, acum);", 'e2e',
  'repornirea amânată vine după cele 2 s, nu la ele')
o('R04', RP, "      if (amanata) return;\n", "", 'e2e',
  'cererile dese nu se mai adună: fiecare își pune repornirea ei')
o('R05', RP, "    ultima = ceas.acum();\n", "", 'e2e',
  'clipa ultimei reporniri nu se ține: nicio cerere nu se mai amână')
o('R06', RP, "      ceas.anuleaza(temporizator);\n", "", 'e2e',
  'închiderea nu oprește repornirea amânată')
o('R07', EX, "      repornire.opreste();\n", "", 'e2e',
  'gazda nu oprește repornirea amânată la închiderea extensiei')
o('R08', EX, "else if (e.tip === 'reporneste') repornire.cere();", "else if (e.tip === 'reporneste') { /* nimic */ }", 'e2e',
  'gazda ignoră repornirea cerută de extensie')

SETURI = {}
E2E = ['test/e2e/extensii.lucru.spec.ts']
