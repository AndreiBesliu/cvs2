# Lista de otrăvuri a feliei 6.U↑ (alinierea ca bloc, ADR 0150), 02.11.2026, alese de autor: calculul pur (comutatorul
# ignorat, cutia unei singure forme în locul celei comune) și, prin e2e, interfața (comutatorul netrimis calculului, nețiut
# în browser, citit greșit la pornire, sfatul butoanelor).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree (în afara Drive-ului), după commit; cele „e2e” cer
# build-ul, deci, cu npm stricat pe mașină, trec prin bucla din raportul feliei (vite și Playwright prin `node`).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


AL = 'src/geom/aliniere.ts'
ED = 'src/app/Editare.tsx'

o('U01', AL, '  } else if (bloc) {', '  } else if (false) {', 'aliniere', 'comutatorul ignorat de calcul')
o('U02', AL, "const [d] = aliniaza([{ id: '', cutie: uniune(alese) }], fel, foaie);",
  "const [d] = aliniaza([{ id: '', cutie: alese[0]?.cutie ?? uniune(alese) }], fel, foaie);", 'aliniere', 'cutia primei forme în locul celei comune')
o('U03', ED, '{ minX: 0, minY: 0, maxX: foaie.stoc.latime, maxY: foaie.stoc.inaltime }, bloc);',
  '{ minX: 0, minY: 0, maxX: foaie.stoc.latime, maxY: foaie.stoc.inaltime });', 'e2e', 'editarea nu trimite comutatorul')
o('U04', ED, "scrieLocal(CHEIE_ALINIERE_BLOC, bloc ? '0' : '1');", '', 'e2e', 'comutatorul nu se ține în browser')
o('U05', ED, "useState(() => citeste(CHEIE_ALINIERE_BLOC) === '1');", 'useState(() => false);', 'e2e', 'comutatorul nu se citește la pornire')
o('U06', ED, "bloc && selectie.length > 1 ? ` ${t('editare.aliniaza.ca-bloc')}`", "false ? ` ${t('editare.aliniaza.ca-bloc')}`", 'e2e',
  'sfatul butoanelor nu spune „ca bloc”')


SETURI = {
    'aliniere': ['test/unit/lipire.test.ts'],
    'aliniere2': ['test/unit/lipire.test.ts', 'test/unit/manual.test.ts'],
}
E2E = ['test/e2e/selectie.spec.ts']
