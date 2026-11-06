# Sabotajele feliei 3.Tb, Planificatorul Trenuleț adaptat pentru cvs2 (ADR 0161), 03.11.2026: fiecare apărare a gazdei
# (`window.cvs2`, înghețată, cu senderul doar când e deschis), a surselor fără atribute `style` (marcajul, șabloanele,
# `setAttribute`), a ieșirilor motoarelor (G-code-ul, piesele LEGO, prin `referinte.js --compara` în poartă) și a legării în
# pagină (textul circuitelor, confirmarea ștergerii, culorile prin CSSOM, clasele din foaie, three.js necerut în cvs2,
# secțiunea „Pe mașină, prin cvs2”, pagina fără cvs2), stricată o dată; proba care o apără trebuie să pice. Alese de autorul
# feliei: plasa autorului, nu runda independentă.
#
# Lăsate afară:
# - `void MASINA.stare().then(...)` din `initMasina`: `laStare` dă oricum, pe loc, ultima stare cunoscută (încărcătorul);
# - rezumatul din capul secțiunii (`#rez-masina`): doar o repetare a stării, fără apărare;
# - forma pluralului din `textLinii` („3204 linii” / „20 de linii”): proba primește ambele forme.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


INT = 'extensii/trenulet/intrare.ts'
APP = 'extensii/trenulet/sursa/planificator/app.js'
ATE = 'extensii/trenulet/sursa/planificator/atelier.js'
CAP = 'extensii/trenulet/sursa/planificator/head.html'
COR = 'extensii/trenulet/sursa/planificator/body.html'
GC = 'extensii/trenulet/sursa/planificator/gcode.js'
LEGO = 'extensii/trenulet/sursa/lego/lego.js'

E2E = ['test/e2e/trenulet.spec.ts']

SETURI = {
    'adaptoare': ['test/unit/trenulet.adaptoare.test.ts'],
    'constructie': ['test/unit/trenulet.test.ts'],
    'referinte': ['test/unit/trenulet.referinte.test.ts'],
}

# ---- gazda (unitar) ----
o('G01', INT, "Object.freeze({ gazda: 'cvs2', masina: cuMasina ? host.masina : null })", "({ gazda: 'cvs2', masina: cuMasina ? host.masina : null })", 'adaptoare', 'window.cvs2 neînghețată')
o('G02', INT, "masina: cuMasina ? host.masina : null", "masina: host.masina", 'adaptoare', 'senderul dat paginii și fără permisiune')
o('G03', INT, "configurable: false, writable: false", "configurable: true, writable: true", 'adaptoare', 'window.cvs2 se poate înlocui din pagină')

# ---- sursele fără atribute style (unitar) ----
o('C01', COR, '<div id="circ-lista" class="coloana"></div>', '<div id="circ-lista" class="coloana" style="gap:8px"></div>', 'constructie', 'un atribut style în marcaj')
o('C02', ATE, '`<button type="button" data-fundal="${c}" data-c="${c}"', '`<button type="button" style="background: ${c}" data-c="${c}"', 'constructie', 'un atribut style într-un șablon')
o('C03', APP, '  $("#det-masina").hidden = false;\n', '  $("#det-masina").setAttribute("style", ""); $("#det-masina").hidden = false;\n', 'constructie', 'un atribut style pus din script')

# ---- ieșirile motoarelor (unitar, referinte.js --compara) ----
o('R01', GC, '    const t = v.toFixed(zec);\n', '    const t = v.toFixed(zec + 1);\n', 'referinte', 'G-code-ul cu o zecimală în plus')
o('R02', LEGO, '  const N_CERC = 48;\n', '  const N_CERC = 47;\n', 'referinte', 'cercurile pieselor LEGO cu alt număr de laturi')

# ---- legarea în pagină (e2e) ----
o('E01', INT, '  gazdaPeste(host, cuMasina);\n', '', 'e2e', 'pagina nu știe că e în cvs2')
o('E02', APP, '  $("#circ-unde").textContent = window.cvs2\n', '  $("#circ-unde").textContent = false\n', 'e2e', 'în cvs2, textul sincronizării de pe claude.ai')
o('E03', APP, '<button class="btn${conf ? " pericol" : ""}" type="button" data-sterge-c="${c.id}">', '<button class="btn" type="button" data-sterge-c="${c.id}">', 'e2e', 'confirmarea ștergerii fără culoarea ei')
o('E04', APP, '  $("#e-cvs2").disabled = !ok; $("#e-gcode").disabled = !ok;\n  randeazaMasina();\n}', '  $("#e-cvs2").disabled = !ok; $("#e-gcode").disabled = !ok;\n}', 'e2e', 'lista fișierelor nu urmează exportul')
o('E05', APP, '  $("#m-pauza").disabled = z || !(i && i.fel === "ruleaza");\n', '  $("#m-pauza").disabled = z;\n', 'e2e', 'pauza activă și când nu rulează')
o('E06', APP, '  renuntat: "Ai ales să nu pornești.",\n', '  renuntat: "Renunțat.",\n', 'e2e', 'refuzul „renuntat” cu alt text')
o('E07', APP, '  $("#masina-raspuns").textContent = "";\n  randeazaMasina();\n  try { await f(); }', '  randeazaMasina();\n  try { await f(); }', 'e2e', 'un refuz vechi rămâne sub butoane')
o('E08', APP, 'function initMasina() {\n  if (!MASINA) return;\n', 'function initMasina() {\n', 'e2e', 'secțiunea mașinii și fără cvs2')
o('E09', APP, '  $("#cvs2-fila").hidden = true; $("#cvs2-primirea").hidden = true; $("#cvs2-in-cvs2").hidden = false;\n', '', 'e2e', 'în cvs2, textele despre fila nouă și protocol')
o('E10', APP, 'ruleaza: "rulează",', 'ruleaza: "merge",', 'e2e', 'starea „rulează” cu alt cuvânt')
o('E11', APP, '  $("#m-reia").onclick = () => { void cereMasina(() => MASINA.reia()); };\n', '  $("#m-reia").onclick = () => { void cereMasina(() => MASINA.porneste()); };\n', 'e2e', 'Reia cere pornirea')
o('E12', APP, '  MASINA.laStare(s => { stareMasina = s; randeazaMasina(); });\n', '  MASINA.laStare(() => {});\n', 'e2e', 'starea mașinii nu urmează schimbările')
o('E13', ATE, '    fundaluri($("#at-culori"));\n', '', 'e2e', 'mostrele atelierului fără culoare')
o('E14', ATE, '    fundaluri(e);\n    if (m) {', '    if (m) {', 'e2e', 'mostrele modelului fără culoare')
o('E15', ATE, '    if (window.cvs2) {\n      $("#at-vedere-lipsa").textContent', '    if (false) {\n      $("#at-vedere-lipsa").textContent', 'e2e', 'în cvs2, three.js cerut de pe cdnjs')
o('E16', CAP, '.coloana { display: flex; flex-direction: column; gap: 8px; }', '.coloana { gap: 8px; }', 'e2e', 'lista circuitelor fără coloană')
o('E17', CAP, '.btn.pericol { color: var(--pericol); border-color: var(--pericol); }', '.btn.pericol { border-color: var(--pericol); }', 'e2e', 'confirmarea ștergerii fără culoarea textului')
o('E18', CAP, '.at-rand.intre { justify-content: space-between; }\n', '', 'e2e', 'capetele rândului lipite')
