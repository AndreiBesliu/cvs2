# Lista de otrăvuri a feliei 28.8↑s (constatarea 14 a auditului exportului, partea listei), 27.11.2026, alese de autor: rândul
# unei operații în lista ferestrei: numele piesei dat de om sau forma fără loc, apoi locul, pe rândul de dedesubt, mai mic; banda
# telefonului culcat doar cu numele; capul foii, cu „Toate foile”, nu înalță banda.
# Se rulează cu `scripts/otravuri.py`, dintr-o clonă a ramurii, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


RL = 'src/app/randListaExport.ts'
EC = 'src/app/ExportConectat.tsx'
DE = 'src/ui/DialogExport.tsx'
CS = 'src/app/stil.css'

# Funcția rândului.
o('S01', RL, "  const dat = piesa.nume !== undefined && piesa.nume.trim() !== '' ? piesa.nume : undefined;",
  "  const dat = piesa.nume !== undefined ? piesa.nume : undefined;", 'lista', 'un nume gol trece drept nume dat de om')
o('S02', RL, "  const baza = dat ?? (e ? forma(e) : piesa.id);", "  const baza = e ? forma(e) : (dat ?? piesa.id);", 'lista',
  'numele dat de om nu ia locul formei')
o('S03', RL, "  return { nume: noduri > 1 ? `${baza} (+${noduri - 1})` : baza, unde: e ? unde(e) : '' };",
  "  return { nume: noduri > 2 ? `${baza} (+${noduri - 1})` : baza, unde: e ? unde(e) : '' };", 'lista', 'rândul nu spune câte elemente mai are')
o('S04', RL, "  if (e.forma.tip === 'cerc') return t('export.lista.unde.centru', { x: nr(x), y: nr(y) });",
  "  if (e.forma.tip === 'cerc') return t('export.lista.unde', { x: nr(x), y: nr(y) });", 'lista', 'locul cercului fără „cu centrul”')
o('S05', RL, "  const n = e.forma.varfuri.length - (e.forma.inchis ? 0 : 1);", "  const n = e.forma.varfuri.length - 1;", 'lista',
  'segmentele unei căi închise numărate ca la una deschisă')
o('S06', RL, "  return t('export.lista.unde', { x: nr(c.minX), y: nr(c.minY) });", "  return t('export.lista.unde', { x: nr(x), y: nr(y) });", 'lista',
  'locul unei căi din mutarea matricei, nu din cutia ei')
o('S07', RL, "import { numarDescriere as nr } from './descriereElement.ts';",
  "const nr = (x: number): string => x.toFixed(2);", 'lista', 'numerele rândului cu punct în română')
# Rândurile ferestrei.
o('S08', EC, "      lista: randLista(e, piesa, o.noduri.length),\n", '', 'e2e', 'rândul fără nume și loc: lista arată numele întreg')
o('S09', EC, "      lista: randLista(e, piesa, o.noduri.length),", "      lista: randLista(e, { id: piesa.id }, o.noduri.length),", 'e2e',
  'numele piesei importate nu ajunge în rând')
o('S10', DE, "        <span className=\"dx-nume\">{o.lista?.nume ?? o.descriere}</span>", "        <span className=\"dx-nume\">{o.descriere}</span>", 'e2e',
  'lista arată numele întreg, cu locul')
o('S11', DE, "        {o.lista && o.lista.unde !== '' && <span className=\"dx-unde\">{o.lista.unde}</span>}\n", '', 'e2e', 'locul lipsește din rând')
o('S12', CS, "/* Locul pe foaie al operației, sub numele ei (constatarea 14 a auditului, felia 28.8↑s): mai mic, ca rândul de sub el. */\n.dx-unde {\n  font-size: var(--fs-1);",
  "/* Locul pe foaie al operației, sub numele ei (constatarea 14 a auditului, felia 28.8↑s): mai mic, ca rândul de sub el. */\n.dx-unde {\n  font-size: var(--fs-4);",
  'e2e', 'locul cu litera cât numele')
o('S13', CS, "  .dx-lista .dx-meta,\n  .dx-lista .dx-unde {\n    display: none;", "  .dx-lista .dx-meta {\n    display: none;", 'e2e',
  'pe telefonul culcat, banda arată și locul')
# Capul foii, cu „Toate foile”, pe bandă (proba refăcută în felie).
o('S14', CS, "  .dx-lista .dx-foaie-lista {\n    align-content: center;\n    padding: var(--sp-1) var(--sp-2);",
  "  .dx-lista .dx-foaie-lista {\n    align-content: center;\n    padding: 6rem var(--sp-2);", 'e2e', 'capul foii înalță banda pe telefon')

SETURI = {
    'lista': ['test/unit/export.randLista.test.ts'],
}
E2E = ['test/e2e/export.lista.spec.ts', 'test/e2e/export.toateFoile.spec.ts']
