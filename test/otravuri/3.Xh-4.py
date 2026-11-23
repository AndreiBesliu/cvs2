# Lista de otrăvuri a feliei 3.Xh-4 (biblioteca extensiilor, refăcută: tastatura și fontul lat la birou; ADR 0231 §B.7),
# 23.11.2026, alese de autor: focusul la deschidere, săgețile între file (cu trecerea de la un capăt la celălalt) și între
# rândurile listei, ordinea lui Tab (fila aleasă, rândul arătat), panoul filei; capul paginii la birou, cu fontul lat.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


BI = 'src/extensii/Biblioteca.tsx'
CS = 'src/extensii/extensii.css'

o('K01', BI, "    [...(posibile ?? [])].find((x) => x.offsetParent !== null)?.focus();", "", 'e2e',
  'la deschidere, focusul nu intră în bibliotecă')
o('K02', BI, "'[data-extensii=\"inapoi-lista\"], [role=\"tab\"][aria-selected=\"true\"], [data-extensii=\"inchide-biblioteca\"]'", "'[data-extensii=\"inchide-biblioteca\"]'", 'e2e',
  'la deschidere, focusul stă pe ×, nu pe fila aleasă')
o('K03', BI, "    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;\n    e.preventDefault();\n    const f: Fila = fila === 'toate' ? 'instalate' : 'toate';\n    setFila(f);",
  "    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;\n    e.preventDefault();\n    const f: Fila = fila === 'toate' ? 'instalate' : 'toate';", 'e2e',
  'săgețile mută focusul între file, dar fila nu se schimbă')
o('K04', BI, "    radacina.current?.querySelector<HTMLButtonElement>(`[data-extensii=\"fila-${f}\"]`)?.focus();", "", 'e2e',
  'săgețile schimbă fila, dar focusul rămâne pe cea veche')
o('K05', BI, "aria-controls=\"bib-lista\" tabIndex={fila === 'instalate' ? 0 : -1}", "aria-controls=\"bib-lista\"", 'e2e',
  'amândouă filele sunt în ordinea lui Tab')
o('K06', BI, "    randurile[(i + (e.key === 'ArrowDown' ? 1 : randurile.length - 1)) % randurile.length]?.focus();", "    randurile[i + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();", 'e2e',
  'de la ultimul rând, săgeata nu trece la primul')
o('K07', BI, "    randurile[(i + (e.key === 'ArrowDown' ? 1 : randurile.length - 1)) % randurile.length]?.focus();", "    randurile[(i + (e.key === 'ArrowDown' ? 1 : randurile.length - 1)) % randurile.length]?.click();", 'e2e',
  'săgeata deschide pagina rândului, nu doar mută focusul')
o('K08', BI, "        tabIndex={aratat?.id === e.id ? 0 : -1} {...(aratat?.id === e.id", "        {...(aratat?.id === e.id", 'e2e',
  'toate rândurile listei sunt în ordinea lui Tab')
o('K09', BI, "role=\"tabpanel\" aria-labelledby={`bib-fila-${fila}`}", "role=\"tabpanel\" aria-labelledby=\"bib-fila-toate\"", 'e2e',
  'panoul listei poartă mereu numele filei „Toate”')
o('K11', CS, ".pagina-nume {\n  flex: 1;\n  min-width: 0;\n}", ".pagina-nume {\n  flex: none;\n}", 'e2e',
  'cu fontul lat, numele extensiei ajunge sub gesturile paginii')

SETURI = {}
E2E = ['test/e2e/biblioteca.spec.ts', 'test/e2e/extensii.tinte.spec.ts']
