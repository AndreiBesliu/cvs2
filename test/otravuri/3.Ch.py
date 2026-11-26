# Lista de otrăvuri a feliei 3.Ch (construcțiile cu nume din vederea „Modelul” a atelierului Easy 3Draw și lista lor de
# piese; ADR 0284, partea D), 26.11.2026, alese de autor: motorul (cheia unei piese, piesele unei construcții pe rânduri,
# timpul de printat și cum se scrie, numele și numerele construcțiilor) și atelierul (alegerea, construcția nouă, copia,
# ștergerea, numele scris de om, citirea din stocare, tabelul pieselor, debitul imprimantei, lista de printat).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


LG = 'extensii/trenulet/sursa/lego/lego.ts'
AT = 'extensii/trenulet/sursa/planificator/atelier.ts'
EN = 'extensii/trenulet/sursa/planificator/texte.en.json'

# --- motorul: cheia unei piese și piesele unei construcții
OR = 'Object.fromEntries(Object.keys(v).sort().map(k => [k, ordonat((v as Record<string, unknown>)[k])]))'
o('M01', LG, OR, OR.replace('Object.keys(v).sort()', 'Object.keys(v)'), 'constructii', 'cheia ține ordinea în care sunt scrise câmpurile')
o('M02', LG, OR, OR.replace('ordonat((v as Record<string, unknown>)[k])', '(v as Record<string, unknown>)[k]'), 'constructii', 'obiectele dinăuntru nu mai sunt ordonate')
o('M03', LG, 'const ordonat = (v: unknown): unknown => Array.isArray(v) ? v.map(ordonat)', 'const ordonat = (v: unknown): unknown => Array.isArray(v) ? [...v].sort().map(ordonat)', 'constructii', 'ordinea dintr-un șir nu mai contează')
o('M04', LG, '      if (r) r.bucati++; else randuri.set(k, { def: d, bucati: 1 });', '      if (r) { r.bucati++; r.def = d; } else randuri.set(k, { def: d, bucati: 1 });', 'constructii', 'rândul ține definiția ultimei apariții')
o('M05', LG, '      const k = cheieDef(d), r = randuri.get(k);', '      const k = JSON.stringify(d), r = randuri.get(k);', 'constructii', 'aceeași piesă, cu câmpurile în altă ordine, pe două rânduri')
o('M06', LG, '      if (r) r.bucati++; else randuri.set(k, { def: d, bucati: 1 });', '      if (r) r.bucati += 2; else randuri.set(k, { def: d, bucati: 1 });', 'constructii', 'o piesă care apare iar se numără de două ori')

# --- motorul: timpul de printat și cum se scrie
TP = '    if (!Number.isFinite(grame) || grame < 0 || !Number.isFinite(debit) || debit <= 0) return null;'
o('M07', LG, TP, TP.replace(' || debit <= 0', ''), 'constructii', 'un debit de 0 sau negativ dă un timp')
o('M08', LG, TP, TP.replace('!Number.isFinite(grame) || grame < 0 || ', ''), 'constructii', 'gramele negative sau nefinite dau un timp')
o('M09', LG, TP, TP.replace(' || !Number.isFinite(debit)', ''), 'constructii', 'un debit infinit sau NaN dă un timp')
o('M10', LG, '    return grame / 1.24e-3 / debit;', '    return grame / 1.25e-3 / debit;', 'constructii', 'densitatea PLA greșită (1,25)')
o('M11', LG, '    return grame / 1.24e-3 / debit;', '    return grame / 1.24e-3 * debit;', 'constructii', 'timpul crește cu debitul')
DP = '    if (s === null || !Number.isFinite(s) || s < 0) return "—";'
o('M12', LG, DP, DP.replace(' || s < 0', ''), 'constructii', 'un timp negativ se scrie')
o('M13', LG, '    if (s < 60) return "< 1 min";', '    if (s < 30) return "< 1 min";', 'constructii', 'sub un minut, de la 30 s se scrie „1 min”')
DM = '    const m = Math.round(s / 60), h = Math.floor(m / 60), r = m % 60;'
o('M14', LG, DM, DM.replace('Math.round(s / 60)', 'Math.floor(s / 60)'), 'constructii', 'minutele tăiate, nu rotunjite')
o('M15', LG, DM, DM.replace('h = Math.floor(m / 60)', 'h = Math.round(m / 60)'), 'constructii', 'orele rotunjite: 59 min devine o oră')
o('M16', LG, 'return "≈ " + (h ? (r ? tr`${h} h ${r} min` : tr`${h} h`) : tr`${m} min`);', 'return "≈ " + (h ? tr`${h} h ${r} min` : tr`${m} min`);', 'constructii', 'o oră fixă se scrie „1 h 0 min”')
o('M17', LG, 'return "≈ " + (h ? (r ? tr`${h} h ${r} min` : tr`${h} h`) : tr`${m} min`);', 'return (h ? (r ? tr`${h} h ${r} min` : tr`${h} h`) : tr`${m} min`);', 'constructii', 'timpul fără „≈”, deși e aproximativ')

# --- motorul: numele și numerele construcțiilor
CN = 'return typeof nume === "string" ? [...nume.replace(/\\s+/g, " ").trim()].slice(0, max).join("").trimEnd() : "";'
o('M18', LG, CN, CN.replace('.replace(/\\s+/g, " ")', ''), 'constructii', 'spațiile duble și tab-urile rămân în nume')
o('M19', LG, CN, CN.replace('.slice(0, max)', ''), 'constructii', 'numele nu mai e tăiat la 60 de caractere')
o('M20', LG, CN, CN.replace('.join("").trimEnd()', '.join("")'), 'constructii', 'tăietura lasă un spațiu la capăt')
o('M21', LG, CN, CN.replace('typeof nume === "string" ? ', 'nume ? String(nume) && ').replace(' : "";', ' || "";'), 'constructii', 'un număr se citește ca nume')
NL = '    const luat = new Set(existente.map(n => curataNume(n).toLocaleLowerCase())), curat = curataNume(dorit);'
o('M22', LG, NL, NL.replace('curataNume(n).toLocaleLowerCase()', 'curataNume(n)'), 'constructii', 'numele comparate cu majusculele lor: „șasiu” și „Șasiu” sunt două')
o('M23', LG, NL, NL.replace('curataNume(n).toLocaleLowerCase()', 'n.toLocaleLowerCase()'), 'constructii', 'numele luate nu mai sunt curățate: „ Șasiu ” nu mai e „Șasiu”')
o('M24', LG, "    const m = /^(?:(.*) )?(\\d+)$/.exec(curat), baza = m ? m[1] ?? \"\" : curat;", '    const m = null as RegExpExecArray | null, baza = curat;', 'constructii', '„Macara 2” luat dă „Macara 2 2”')
o('M25', LG, '    for (let n = m ? +m[2]! + 1 : 2; ; n++) {', '    for (let n = 2; ; n++) {', 'constructii', 'un nume cu număr pornește de la 2, nu de la numărul lui')
o('M26', LG, '      const cap = baza ? ` ${n}` : String(n), nume = curataNume(baza, NUME_MAX - cap.length) + cap;', '      const cap = baza ? ` ${n}` : String(n), nume = baza + cap;', 'constructii', 'numele cu numărul la capăt trece de 60 de caractere')
o('M27', LG, '    while (f.has(n)) n++;', '    while (f.has(n)) n += 2;', 'constructii', 'numărul liber sare peste unele golurile')
o('M28', LG, '    let n = 1;\n    while (f.has(n)) n++;', '    let n = Math.max(0, ...folosite) + 1;\n    while (f.has(n)) n++;', 'constructii', 'numărul liber e după cel mai mare, nu cel mai mic')

# --- atelierul: construcțiile
o('A01', AT, '  const numeC = (c: Constructie) => c.nume || tr`Construcția ${c.nr}`;', '  const numeC = (c: Constructie) => c.nume || tr`Construcția ${constructii.indexOf(c) + 1}`;', 'e2e', 'numele implicit după locul din listă, nu după numărul construcției')
o('A02', AT, '    activa = c.id; model = c.model; alegeM(null); inlocuieste = null;', '    activa = c.id; model = c.model; inlocuieste = null;', 'e2e', 'piesa aleasă rămâne aleasă în altă construcție')
o('A03', AT, '    tineConstructia(); treciPe(c);\n  }', '    treciPe(c);\n  }', 'e2e', 'trecerea pe altă construcție pierde piesele puse în cea de dinainte')
CN2 = '    const c: Constructie = { id: idNou(), nume: "", nr: Lego.nrLiber(constructii.map(x => x.nr)), model: [] };'
o('A04', AT, CN2, CN2.replace('model: []', 'model: JSON.parse(JSON.stringify(model))'), 'e2e', 'construcția nouă are piesele celei de dinainte')
o('A05', AT, CN2, CN2.replace('Lego.nrLiber(constructii.map(x => x.nr))', 'constructii.length + 1'), 'e2e', 'construcția nouă ia numărul după câte sunt, nu cel mai mic liber')
o('A06', AT, '    $<HTMLInputElement>("#at-c-nume").focus();\n', '', 'e2e', 'după „Construcție nouă”, câmpul numelui nu e gata de scris')
DB = 'nume: a.nume ? Lego.numeLiber(constructii.map(numeC), a.nume) : ""'
o('A07', AT, DB, 'nume: a.nume', 'e2e', 'copia are același nume')
o('A08', AT, DB, 'nume: Lego.numeLiber(constructii.map(numeC), numeC(a))', 'e2e', 'copia unei construcții fără nume primește nume („Construcția 2 2”)')
o('A09', AT, 'model: JSON.parse(JSON.stringify(a.model)) };', 'model: a.model };', 'e2e', 'copia împarte piesele cu originalul')
o('A10', AT, '    constructii.splice(constructii.indexOf(a) + 1, 0, c); treciPe(c);', '    constructii.push(c); treciPe(c);', 'e2e', 'copia merge la capătul listei, nu după original')
o('A11', AT, '    if (constructii.length < 2) return;\n    const i = constructii.indexOf(tineConstructia());', '    const i = constructii.indexOf(tineConstructia());', 'e2e', 'se poate șterge și ultima construcție')
o('A12', AT, '    treciPe(constructii[Math.min(i, constructii.length - 1)]!);', '    treciPe(constructii[0]!);', 'e2e', 'după ștergere, alegerea sare pe prima construcție')
RN = '    a.nume = v ? Lego.numeLiber(constructii.filter(x => x !== a).map(numeC), v) : "";'
o('A13', AT, RN, '    a.nume = v;', 'e2e', 'un nume luat de altă construcție rămâne la fel')
o('A14', AT, RN, RN.replace('constructii.filter(x => x !== a).map(numeC)', 'constructii.map(numeC)'), 'e2e', 'numele scris din nou al aceleiași construcții primește „2”')
o('A15', AT, '    campNume.onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); campNume.blur(); } };\n', '', 'e2e', 'Enter nu mai scrie numele')
o('A16', AT, '`<option value="${esc(c.id)}" translate="no"${c === ac ? " selected" : ""}>${esc(numeC(c))}</option>`', '`<option value="${esc(c.id)}" translate="no"${c === ac ? " selected" : ""}>${numeC(c)}</option>`', 'e2e', 'numele scris de om intră în pagină ca HTML')
o('A17', AT, 'value="${esc(ac.nume)}"', 'value="${ac.nume}"', 'e2e', 'numele cu ghilimele strică câmpul')
o('A18', AT, ' id="at-c-sterge"${constructii.length < 2 ? " disabled" : ""}>', ' id="at-c-sterge">', 'e2e', '„Șterge” nu e oprit cu o singură construcție')
o('A19', AT, '    $("#at-c-sterge").onclick = () => { $("#at-c-confirma").hidden = false; };', '    $("#at-c-sterge").onclick = stergeConstructia;', 'e2e', 'ștergerea nu mai întreabă')

# --- atelierul: citirea și salvarea
o('A20', AT, '          id: typeof c!.id === "string" && c!.id && !constructii.some(x => x.id === c!.id) ? c!.id : idNou(),', '          id: typeof c!.id === "string" && c!.id ? c!.id : idNou(),', 'e2e', 'două construcții cu același id rămân așa')
o('A21', AT, '          nume: nume ? Lego.numeLiber(constructii.map(numeC), nume) : "",', '          nume,', 'e2e', 'două construcții citite cu același nume rămân așa')
NR = '          nr: Number.isInteger(nr) && (nr as number) >= 1 && !constructii.some(x => x.nr === nr) ? nr as number : Lego.nrLiber(constructii.map(x => x.nr)),'
o('A22', AT, NR, NR.replace(' && !constructii.some(x => x.nr === nr)', ''), 'e2e', 'două construcții citite cu același număr rămân așa')
o('A23', AT, NR, NR.replace('Number.isInteger(nr) && (nr as number) >= 1 && ', ''), 'e2e', 'un număr care nu e întreg pozitiv se citește')
o('A24', AT, '      const a = constructii.find(x => x.id === d.activa) ?? constructii[0]!;', '      const a = constructii[0]!;', 'e2e', 'construcția aleasă nu se mai ține la reîncărcare')
o('A25', AT, '      constructii = [{ id: idNou(), nume: "", nr: 1, model }]; activa = constructii[0]!.id;', '      constructii = [{ id: idNou(), nume: "", nr: 1, model: [] }]; activa = constructii[0]!.id;', 'e2e', 'un model salvat înainte se pierde la deschidere')
o('A26', AT, 'const stocate = Array.isArray(d.constructii) ? d.constructii.filter(c => c && typeof c === "object" && Array.isArray(c.model)) : [];', 'const stocate = Array.isArray(d.constructii) ? d.constructii.filter(c => c && typeof c === "object") : [];', 'e2e', 'o construcție fără piese citite se ia oricum (și strică pagina)')
o('A27', AT, '    const date = { setari, lista, stare, model, constructii, activa, imprimante };', '    const date = { setari, lista, stare, model, imprimante };', 'e2e', 'construcțiile nu se mai salvează')
o('A28', AT, '    tineConstructia();\n    const date = {', '    const date = {', 'e2e', 'construcția aleasă se salvează cu piesele de dinaintea ultimei schimbări')

# --- atelierul: piesele construcției, debitul, lista de printat
o('A30', AT, 'const randC = Lego.pieseConstructie(model.map(x => x.def)).map(r => ({ ...r, g: grameDef(r.def) * r.bucati }));', 'const randC = Lego.pieseConstructie(model.map(x => x.def)).map(r => ({ ...r, g: grameDef(r.def) }));', 'e2e', 'filamentul unui rând e al unei singure bucăți')
o('A31', AT, '<tfoot><tr data-g="${gC}" data-s="${timpC(gC)}"><th>Total</th><td class="num centru" data-bucati>${model.length}</td>', '<tfoot><tr data-g="${gC}" data-s="${timpC(gC)}"><th>Total</th><td class="num centru" data-bucati>${randC.length}</td>', 'e2e', 'totalul numără rândurile, nu bucățile')
o('A32', AT, 'const gC = randC.reduce((t, r) => t + r.g, 0), timpC = (g: number) => Lego.timpPrint(g, setari.debit);', 'const gC = randC.reduce((t, r) => t + r.g, 0), timpC = (g: number) => Lego.timpPrint(g, 6);', 'e2e', 'timpul nu urmează debitul imprimantei')
o('A33', AT, '    const k = Lego.cheieDef(def), gasit = lista.find(x => Lego.cheieDef(x.def) === k);', '    const k = JSON.stringify(def), gasit = lista.find(x => JSON.stringify(x.def) === k);', 'e2e', 'în lista de printat, aceeași piesă scrisă altfel stă pe două rânduri')
o('A34', AT, '    for (const r of Lego.pieseConstructie(model.map(m => m.def))) pune(r.def, r.bucati);', '    for (const r of Lego.pieseConstructie(model.map(m => m.def))) pune(r.def, 1);', 'e2e', 'în lista de printat intră câte o bucată din fiecare piesă')
o('A35', AT, '} din „${numeC(tineConstructia())}” în lista de printat.`);', '} din model în lista de printat.`);', 'e2e', 'mesajul nu mai spune construcția')
o('A36', AT, '    else if (k === "debit") { setari.debit = debitBun(v); el.value = setari.debit; }\n', '', 'e2e', 'debitul scris nu mai e pus în margini')
o('A37', AT, '  function debitBun(v: number) { return Math.min(50, Math.max(1, Math.round(v))); }', '  function debitBun(v: number) { return Math.min(500, Math.max(0, Math.round(v))); }', 'e2e', 'debitul poate fi 0 sau peste 50')
o('A38', AT, '    salveaza(); if (vedere === "model") { editorModel(); arataModel(true); }', '    salveaza(); if (vedere === "model") { arataModel(true); }', 'e2e', 'tabelul pieselor nu urmează o schimbare a imprimantei')
o('A39', AT, 'pat_distanta: 4, debit: 5, culoare', 'pat_distanta: 4, debit: 8, culoare', 'e2e', 'debitul implicit, altul decât cel spus')
o('A40', AT, '<span><b>Timp</b> ${Lego.durataPrint(Lego.timpPrint(g, setari.debit))}</span>', '', 'e2e', 'cotele vederii nu mai spun timpul')
o('A41', AT, '      ${pieseC}`;', '`;', 'e2e', 'tabelul pieselor nu mai e pus în pagină')

# --- textele
o('T01', AT, '<button class="btn" type="button" id="at-c-noua">Construcție nouă</button>', '<button class="btn" type="button" id="at-c-noua">O construcție nouă</button>', 'texte', 'butonul, cu alt text decât cel tradus')
o('T02', EN, ' "Construcția {0}": "Build {0}",', ' "Construcția {0}": "Build",', 'texte', 'numele implicit în engleză își pierde numărul')

SETURI = {
    'constructii': ['test/unit/trenulet.constructii.test.ts'],
    'texte': ['test/unit/trenulet.engleza.test.ts'],
}
E2E = ['test/e2e/trenulet.constructii.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md)
E2E_BUILD = False
for x in O:
    assert x['vechi'] != x['nou'], x['id']
