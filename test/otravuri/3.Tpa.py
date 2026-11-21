# Lista de otrăvuri a feliei 3.Tp↑a (căutarea peste toate filele atelierului Easy 3Draw, ADR 0281 §4), 21.11.2026, alese de
# autor: potrivirea (diacriticele, majusculele, începutul de cuvânt, fiecare cuvânt, textul fără litere, ordinea filelor),
# galeria rezultatelor (arătată și peste model sau peste o filă proprie, făcută din nou doar la alt text, întoarsă la familie
# după golire, mesajul fără potrivire, numele ei), golirea la o filă (și a câmpului), Escape, Enter (doar cu o căutare),
# telefonul (câmpul pe un rând al lui) și traducerea. Potrivirea pe numele din limba paginii se probează doar în cvs2, în
# engleză: otrava ei e în `3.Tpa-en.py`, cu setul ei e2e (`trenulet.spec.ts`).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; setul „e2e” e
# `test/e2e/trenulet.cautare.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


A = 'extensii/trenulet/sursa/planificator/atelier.ts'
H = 'extensii/trenulet/sursa/planificator/head.html'
T = 'extensii/trenulet/sursa/planificator/texte.en.json'
K = 'const cuvinte = (s: string) => s.normalize("NFD").replace(/\\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);'

# Potrivirea.
o('C01', A, K, K.replace('.replace(/\\p{M}/gu, "")', ''), 'e2e', 'diacriticele rămân: „caramida” nu găsește Cărămidă')
o('C02', A, K, K.replace('.toLowerCase()', ''), 'e2e', 'majusculele contează: „CARAMIDA” nu găsește nimic')
o('C03', A, 'cautate.every(c => din.some(w => w.startsWith(c)))', 'cautate.every(c => din.some(w => w.includes(c)))', 'e2e',
  'potrivirea și în mijlocul cuvântului: „nic” găsește Technic și conicele')
o('C04', A, 'cautate.every(c => din.some(w => w.startsWith(c)))', 'cautate.some(c => din.some(w => w.startsWith(c)))', 'e2e',
  'un singur cuvânt căutat ajunge: „roata con” găsește toate roțile și conicele')
o('C05', A, 'return cautate.length > 0 && cautate.every(', 'return cautate.every(', 'e2e', 'un text fără litere găsește toate piesele')
o('C06', A, 'return FAMILII.flatMap(([, , piese]) => piese).filter(([, n]) => {',
  'return [...FAMILII].reverse().flatMap(([, , piese]) => piese).filter(([, n]) => {', 'e2e', 'rezultatele în altă ordine decât a filelor')

# Galeria rezultatelor.
o('G01', A, '      g.hidden = false;\n      if (g.dataset.cautare !== q) {', '      if (g.dataset.cautare !== q) {', 'e2e',
  'peste model și peste „Calibrare”, rezultatele rămân ascunse')
o('G02', A, 'if (g.dataset.cautare !== q) {', 'if (true) {', 'e2e', 'rezultatele făcute din nou la fiecare alegere: focusul de pe buton se pierde')
o('G03', A, 'g.dataset.cautare = q; delete g.dataset.familie;', 'g.dataset.cautare = q;', 'e2e',
  'după golire, galeria familiei de dinainte nu se face din nou: rămân rezultatele')
o('G04', A, '        delete g.dataset.cautare;\n', '', 'e2e', 'același text, căutat din nou după golire, arată galeria familiei rămase')
o('G05', A, 'g.firstElementChild!.textContent = tr`Nicio piesă nu se potrivește cu „${q}”.`;', 'g.firstElementChild!.textContent = "";', 'e2e',
  'fără potrivire, galeria goală, fără mesaj')
o('G06', A, 'g.setAttribute("aria-label", "Piesele găsite");', 'g.setAttribute("aria-label", fam ? fam[1] : "");', 'e2e',
  'rezultatele numite ca familia piesei de acum')

# Câmpul: fila, Escape, Enter.
o('F01', A, 'inlocuieste = null; golesteCautarea(); alegeTip(ultima.get(', 'inlocuieste = null; alegeTip(ultima.get(', 'e2e',
  'o filă aleasă nu golește căutarea: galeria rămâne cu rezultatele')
o('F02', A, 'function golesteCautarea() { cautare = ""; $<HTMLInputElement>("#at-cauta").value = ""; }', 'function golesteCautarea() { cautare = ""; }',
  'e2e', 'o filă golește căutarea, dar textul rămâne în câmp')
o('F03', A, 'if (ev.key === "Escape" && campCautare.value) {', 'if (ev.key === "Esc" && campCautare.value) {', 'e2e',
  'Escape nu golește câmpul (doar cât îl golește browserul singur)')
o('F04', A, 'const prima = ev.key === "Enter" && cautare.trim() ?', 'const prima = ev.key === "Intro" && cautare.trim() ?', 'e2e',
  'Enter nu alege prima piesă găsită')
o('F05', A, 'const prima = ev.key === "Enter" && cautare.trim() ?', 'const prima = ev.key === "Enter" ?', 'e2e',
  'Enter fără căutare alege prima piesă a familiei')

# Telefonul.
o('P01', H, '@media (max-width: 520px) { .at-cauta { flex: 1 1 100%; margin-left: 0; } }', '', 'e2e',
  'pe telefon, câmpul nu ia tot rândul (îngust, la dreapta)')

# Traducerea (unitare).
o('T01', T, '"Caută o piesă": "Find a piece",', '"Caută o piesă": "",', 'engleza', 'câmpul căutării, netradus')
o('T02', T, '"Nicio piesă nu se potrivește cu „{0}”.": "No piece matches “{0}”.",', '"Nicio piesă nu se potrivește cu „{0}”.": "",', 'engleza',
  'mesajul fără potrivire, netradus')
o('T03', T, '"Piesele găsite": "Pieces found",', '"Piesele găsite": "",', 'engleza', 'numele galeriei rezultatelor, netradus')

SETURI = {
    'engleza': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.cautare.spec.ts']
for x in O:
    assert x['vechi'] != x['nou'], x['id']
