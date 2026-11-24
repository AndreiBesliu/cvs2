# Lista de otrăvuri a feliei 28.8↑f-1 (privirea pe fereastra exportului cu fontul lat; lista de pe telefon și densitatea mare;
# ADR 0290), 24.11.2026, alese de autor: rândul operației strâns pe telefon, nota ordinii pe bandă, fereastra mai lată decât
# ecranul, textul tăiat în listă și pe cartonașe, țintele densității mari.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă a ramurii, după commit; toate „e2e” (cer build-ul).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CSS = 'src/app/stil.css'

o('E01', CSS, "  .dx-lista > .dx-nav-op {\n    flex: 0 0 15rem;", "  .dx-lista > .dx-nav-op {\n    flex: 0 1 auto;", 'e2e',
  'pe telefon, rândul operației strâns de bandă (cum era)')
o('E02', CSS, "  .dx-lista .ordine-taierii .nota {\n    display: none;", "  .dx-lista .ordine-taierii .nota {\n    display: inline;", 'e2e',
  'pe telefon, nota ordinii pe bandă (cum era)')
o('E03', CSS, "width: min(70rem, calc(100vw - 2rem));\n  max-width: calc(100vw - 2rem);", "width: 70rem;\n  max-width: none;", 'e2e',
  'fereastra de 70 rem, oricât de îngust e ecranul')
o('E09', CSS, "    flex: 0 0 auto;\n    order: 1;", "    flex: 0 0 auto;\n    order: 0;", 'e2e', 'pe telefon, ordinea tăierii înaintea operațiilor')
o('E04', CSS, ".dx-nume {\n  font-size: var(--fs-3);\n  font-weight: 600;\n  overflow-wrap: anywhere;",
  ".dx-nume {\n  font-size: var(--fs-3);\n  font-weight: 600;\n  white-space: nowrap;\n  overflow: hidden;", 'e2e',
  'numele operației din listă tăiat, pe un rând')
o('E05', CSS, ".dx-card > span {\n  font-size: var(--fs-2);\n  font-weight: 600;",
  ".dx-card > span {\n  font-size: var(--fs-2);\n  white-space: nowrap;\n  overflow: hidden;\n  font-weight: 600;", 'e2e',
  'textul cartonașelor tăiat, pe un rând')
o('E06', CSS, ":root[data-densitate='mare'] .dialog-export input[type='text'],\n:root[data-densitate='mare'] .dialog-export select,",
  ":root[data-densitate='mare'] .dialog-export input[type='text']:not(*),\n:root[data-densitate='mare'] .dialog-export select:not(*),",
  'e2e', 'în densitatea mare, câmpurile de 32 px (cum era)')
o('E07', CSS, ":root[data-densitate='mare'] .dialog-export .dx-lista button {", ":root[data-densitate='mare'] .dialog-export .dx-lista button:not(*) {",
  'e2e', 'în densitatea mare, butoanele listei de 44 px (cum era)')
o('E08', CSS, ":root[data-densitate='mare'] .dialog-export label:has(> input[type='checkbox']),\n:root[data-densitate='mare'] .dialog-export label.alegere {",
  ":root[data-densitate='mare'] .dialog-export label:has(> input[type='checkbox']):not(*),\n:root[data-densitate='mare'] .dialog-export label.alegere:not(*) {",
  'e2e', 'în densitatea mare, bifele de 24 px (cum era)')

SETURI = {}
E2E = ['test/e2e/export.privire.spec.ts']
