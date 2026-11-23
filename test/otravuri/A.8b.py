# Lista de otrăvuri a feliei A.8b (înregistratorul utilizării în editor și trimiterea în loturi; ADR 0262 §1, §3–§5, §8),
# 23.11.2026, alese de autor: înregistratorul (repetările numărate, inelul pașilor, lotul doar cu colectarea pornită și un
# cont, lotul plin, plafonul cozii din browser, scoaterea, setările aflate, contextul în trepte), pompa (o trimitere odată,
# ceasul lotului, întrebarea setărilor, „stins”), partea din pornire (sursa gestului, tamponul), registrul care spune
# rulările, trimiterea cozii (contul lotului, refuzurile, colectarea oprită în răspuns), serverul (lotul gol) și cap-coadă,
# pe emulatoare (registrul, ferestrele, refuzul din bară, unealta, lotul la ascunderea paginii, trimiterea prin editare).
# Unitarele se rulează cu `scripts/otravuri.py`; setul `server` tot cu el, în `firebase emulators:exec`; cele de pe
# emulatoare cu `scripts/otravuri-emulatoare.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


L = 'src/app/utilizareLot.ts'
P = 'src/app/utilizare.ts'
T = 'src/app/utilizareTrimitere.ts'
A = 'src/ui/actiuni.ts'
AU = 'functions/src/utilizare/actiuni.ts'
M = 'src/app/main.tsx'
AP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
PC = 'src/app/PanouCont.tsx'

# Înregistratorul (unitare).
o('V01', L, 'acum - u.cand <= PAUZA_REPETARE_MS', 'acum - u.ev.t <= PAUZA_REPETARE_MS', 'inreg',
  'pauza repetărilor se numără de la prima, nu de la ultima: un clic ținut des se rupe în bucăți')
o('V02', L, "u.ev.id === ev.id && u.ev.de === ev.de && u.ev.rez === ev.rez", "u.ev.id === ev.id && u.ev.rez === ev.rez", 'inreg',
  'aceeași acțiune din altă sursă (tasta după bară) se numără în aceeași')
o('V03', L, '  function inchideLotul(): void {\n    ultima = null;\n', '  function inchideLotul(): void {\n', 'inreg',
  'o repetare după închiderea lotului se numără în lotul plecat: se pierde')
o('V04', L, '    if (setari.pasiEroare > 0) inel = [...inel, ev].slice(-setari.pasiEroare);', '    inel = [...inel, ev].slice(-30);', 'inreg',
  'inelul pașilor nu ascultă de setări')
o('V05', L, '    if (!setari.colectare || !d.cont()) return;', '    if (!setari.colectare) return;', 'inreg',
  'evenimentele de dinaintea intrării în cont intră în lotul contului')
o('V06', L, '    if (!setari.colectare || !d.cont()) return;', '    if (!d.cont()) return;', 'inreg',
  'colectarea oprită din Setări nu oprește lotul')
o('V07', L, 'while (n > EVENIMENTE_IN_ASTEPTARE && toate.length > 1)', 'while (n > 10 * EVENIMENTE_IN_ASTEPTARE && toate.length > 1)', 'inreg',
  'coada din browser crește fără plafon')
o('V08', L, '    if (lot.length >= EVENIMENTE_PE_LOT) {', '    if (lot.length > EVENIMENTE_PE_LOT) {', 'inreg',
  'lotul plin trece de 200 de evenimente (serverul l-ar refuza)')
o('V09', L, "pune(ev.fel === 'actiune' && !rezultatBun(ev.rez) ? { ...ev, rez: 'motiv.altul' } : ev);", 'pune(ev);', 'inreg',
  'un motiv din afara listei albe pleacă așa cum e (cu ce text are)')
o('V10', L, "    else if (idBun(ev.id)) pune(", '    else pune(', 'inreg', 'un id din afara listei albe intră')
o('V11', L, '      if (!s.colectare) {\n        lot = [];\n        puneCoada([]);\n      }', '      if (!s.colectare) {\n        lot = [];\n      }', 'inreg',
  'colectarea oprită lasă coada din browser să plece')
o('V12', L, "filter((x) => x.lot.sesiune !== sesiune || x.lot.nr !== n)", 'filter((x) => x.lot.sesiune !== sesiune)', 'inreg',
  'un lot trimis scoate toată sesiunea lui din coadă')
o('V13', L, 'nr: ++nr, acum: d.ceas(), context: d.context()', 'nr: ++nr, acum: 0, context: d.context()', 'inreg',
  'ceasul lotului e 0: serverul aruncă toate evenimentele (vin „după” trimitere)')
o('V14', L, "tema: m.tema === 'intunecata' || (m.tema !== 'luminoasa' && m.intunecat) ? 'inchisa' : 'deschisa',", "tema: m.intunecat ? 'inchisa' : 'deschisa',", 'inreg',
  'tema aleasă de om e ignorată: contează doar cea a sistemului')
o('V15', L, "ecran: m.latime < 600 ? 'telefon'", "ecran: m.latime <= 600 ? 'telefon'", 'inreg', 'o fereastră de 600 px e „telefon”')
o('V16', L, "browser: ua.includes('Edg/') ? 'edge' : ", 'browser: ', 'inreg', 'Edge e numărat drept Chrome')
o('V17', L, '    if (stins || inLucru || !d.cont() || d.ins.loturi().length === 0) return;', '    if (stins || !d.cont() || d.ins.loturi().length === 0) return;', 'inreg',
  'pompa pornește o trimitere nouă cât una e încă pe drum')
o('V18', L, "      if (r === 'stins') stins = true;", '', 'inreg', 'după un refuz, pompa trimite mai departe în aceeași sesiune')
o('V19', L, '      if (!d.ins.setari().colectare && d.cont()) d.ins.intreabaSetarile();\n', '', 'inreg',
  'cu colectarea oprită, editorul nu mai află niciodată că a pornit din nou')
o('V20', L, '      impinge();\n      ceas();\n    }, d.ins.setari().lotMinute * 60_000);', '      impinge();\n    }, d.ins.setari().lotMinute * 60_000);', 'inreg',
  'ceasul lotului bate o singură dată')

# Partea din pornire și registrul (unitare).
o('V21', P, "  if (tasta && !e.closest('input, textarea, select, [contenteditable=\"true\"]')) return 'tasta';", "  if (tasta) return 'tasta';", 'inreg',
  'Enter într-un câmp al panoului e numărat ca scurtătură')
o('V22', P, "  if (e.closest('.meniu-context, .meniu-cont, .meniu-foaie, [role=\"menu\"]')) return 'meniu';\n", '', 'inreg',
  'meniul de clic dreapta nu e o sursă: acțiunile lui apar „altceva”')
o('V23', P, '  for (const e of tampon.splice(0)) f(e);\n', '', 'inreg', 'evenimentele de dinaintea înregistratorului se pierd')
o('V24', A, '  const s = stare(r, id, ctx);\n  observator?.(id, s);\n  if (!s.ok) return s;', '  const s = stare(r, id, ctx);\n  if (!s.ok) return s;\n  observator?.(id, s);', 'inreg',
  'registrul nu spune refuzurile')

# Trimiterea cozii (unitare).
o('V25', T, '      ins.scoate(lot.sesiune, lot.nr);\n      continue;\n    }\n    try {', '      continue;\n    }\n    try {', 'inreg',
  'loturile altui cont rămân în coadă la nesfârșit')
o('V26', T, "      if (c === 'functions/invalid-argument') {", "      if (c === 'functions/x') {", 'inreg', 'un lot refuzat ca greșit oprește coada la nesfârșit')
o('V27', T, "      if (c === 'functions/permission-denied') {\n        ins.golesteTot();", "      if (c === 'functions/permission-denied') {", 'inreg',
  'un cont care nu mai e deschis își lasă coada în browser')
o('V28', T, "      if (c === 'functions/unauthenticated') return 'stins';", "      if (c === 'functions/unauthenticated') {\n        ins.golesteTot();\n        return 'stins';\n      }", 'inreg',
  'un token lipsă (trecător) aruncă loturile')
o('V29', T, "      if (!r.setari.colectare) return 'gata';\n", '', 'inreg', 'cu colectarea oprită în răspuns, restul cozii pleacă oricum')
o('V30', T, "  if (!d.uid) return 'stins';", "  if (!d.uid) {\n    ins.golesteTot();\n    return 'stins';\n  }", 'inreg',
  'nimeni logat în browser: coada se aruncă, deși contul ei poate reveni')

# Serverul (`functions/test/utilizare.emulator.test.ts`), pe emulator.
o('F01', AU, ' || (l.evenimente.length === 0 && aruncate === 0)', '', 'server', 'întrebarea editorului (un lot gol) se scrie și se numără')
o('F02', AU, '(l.evenimente.length === 0 && aruncate === 0)', 'l.evenimente.length === 0', 'server',
  'un lot doar cu evenimente aruncate nu se scrie: un client stricat nu se mai vede')

# Cap-coadă, pe emulatoare.
o('E01', M, "  observaRularile((id, r) => { utilizarea.actiune(id, r.ok ? 'ok' : r.motiv); });\n", '', 'e2e', 'acțiunile registrului nu se înregistrează')
o('E02', AP, '    if (f !== fereastraRef.current) utilizarea.fereastra(f);\n', '', 'e2e', 'ferestrele nu se înregistrează')
o('E03', AP, '      utilizarea.actiune(id, s.motiv);\n      refuzEditare', '      refuzEditare', 'e2e', 'refuzurile din bară și din taste nu se înregistrează')
o('E04', ED, '    else utilizarea.unealta(unealta);', '    else void unealta;', 'e2e', 'unealta aleasă nu se înregistrează')
o('E05', ED, "    seteazaTrimiterea((c, ins) => import('./PanouCont.tsx').then((m) => m.trimiteUtilizarea(c, ins)));\n", '', 'e2e',
  'editarea nu pune trimiterea: nimic nu pleacă')
o('E06', L, '    ins.inchideLotul();\n    p.impinge();\n  });', '    p.impinge();\n  });', 'e2e', 'la ascunderea paginii, lotul de acum nu se închide')
o('E07', PC, '    uid: u?.uid ?? null,', '    uid: null,', 'e2e', 'trimiterea nu vede contul deschis')
o('E08', P, "  w.addEventListener('keydown', marcheaza(true), true);", "  w.addEventListener('keydown', marcheaza(true), false);", 'e2e',
  'tasta se prinde după ascultătorii aplicației: acțiunea ei ia sursa gestului de dinainte')

SETURI = {
    'inreg': ['test/unit/utilizare.inregistrator.test.ts'],
    # Un singur fișier de emulator, rulat în `firebase emulators:exec`.
    'server': ['functions/test/utilizare.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/utilizare.emulator.spec.ts']
U1 = (E2E[0], 'lotul unui client')
GREP = {k: U1 for k in ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08']}
