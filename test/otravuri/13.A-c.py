# Lista de otrăvuri a feliei 13.A↑c (meniul pe telefon, ADR 0132 §10), 04.11.2026, alese de autor: rândul al doilea forțat,
# filele nedeschise doar cu iconița, indicatorul care ia restul rândului și își taie cuvântul. Toate sunt de aranjament, deci
# prin e2e (build-ul și Playwright prin `node`, pe portul din `.tmp/pw.config.ts`), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


STIL = 'src/app/stil.css'
MASINA = 'src/app/masina.css'

o('P01', STIL, "  .meniu-global::after {\n    content: '';", "  .meniu-global::after {\n    content: none;", 'e2e',
  'fără rândul gol: filele urcă lângă marcă, iar rândul al doilea nu mai e al lor')
o('P02', STIL, ".fila:not([aria-current='page']) > .eticheta {", ".fila:not([aria-current='page']) > .eticheta-otravita {", 'e2e',
  'filele nedeschise își arată tot numele pe telefon')
o('P03', MASINA, '  .indicator-cuvant {\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }',
  '  .indicator-cuvant {\n    text-overflow: ellipsis;\n  }', 'e2e', 'cuvântul unei stări lungi nu se mai taie: indicatorul iese peste file')
o('P04', MASINA, '  .loc-lucrare {\n    display: flex;\n    min-width: 0;\n  }', '  .loc-lucrare {\n    display: flex;\n  }', 'e2e',
  'locul indicatorului nu se mai strânge: indicatorul rămâne cât textul lui')
o('P05', STIL, '    order: 4;\n    flex: 1 1 0;', '    order: 4;\n    flex: none;', 'e2e',
  'indicatorul cât conținutul: pe un ecran îngust trece pe al treilea rând')

SETURI = {}
E2E = ['test/e2e/fereastra.spec.ts']
