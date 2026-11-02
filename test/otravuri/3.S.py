# Sabotajele feliei 3.S, primirea lucrărilor de la alte aplicații (ADR 0126), 02.11.2026: fiecare apărare a protocolului
# (forma, limitele, fereastra care a deschis fila, verificarea ca un fișier străin, răspunsurile) și a legării în aplicație
# (oprirea pe live, ancora fără fereastră, dialogul modal, înlocuirea, panoul, alegerea fișierului) stricată o dată; proba
# care o apără trebuie să pice. Alese de autorul feliei: plasa autorului, nu runda independentă.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul în afara Drive-ului.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Lăsate afară, echivalente: încărcarea din panou cu `sursa: 'export'` sau fără amprentă (fișierele primite au trecut deja
# de verificarea cu `sursa: 'fisier'` și amprenta, pe aceiași octeți); paza `curenta !== c` din `raspundeLa` (o cerere
# înlocuită își pierde dialogul, care se remontează cu cheia nouă; rămâne doar fereastra verificării în curs).
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


PRI = 'src/app/primireLucrare.ts'
DIA = 'src/app/DialogLucrare.tsx'
APP = 'src/app/App.tsx'
PAN = 'src/app/PanouMasina.tsx'

E2E = ['test/e2e/primire.spec.ts']

SETURI = {
    'primire': ['test/unit/primireLucrare.test.ts'],
    'primire2': ['test/unit/primireLucrare.test.ts', 'test/unit/manual.test.ts'],
}

# ---- protocolul (unitar) ----
o('P01', PRI, 'if (!w.opener || ev.source !== w.opener) return;', 'if (!w.opener) return;', 'primire', 'lucrarea primită de la orice fereastră')
o('P02', PRI, 'if (!r.ok || vazute.has(r.lucrare.id)) return;', 'if (!r.ok) return;', 'primire', 'aceeași lucrare de două ori')
o('P03', PRI, "incarcaProgram(octeti, { sursa: 'fisier', sha256: f.sha256 })", "incarcaProgram(octeti, { sursa: 'export', sha256: f.sha256 })", 'primire', 'verificarea ca un export: M6 trece')
o('P04', PRI, "incarcaProgram(octeti, { sursa: 'fisier', sha256: f.sha256 })", "incarcaProgram(octeti, { sursa: 'fisier' })", 'primire', 'fără amprenta trimisă')
o('P05', PRI, "origine === 'null' ? '*' : origine", 'origine', 'primire', 'originea „null” primește ținta „null”')
o('P06', PRI, 'if (w.location.hash === ANCORA && w.opener)', 'if (w.opener)', 'primire', '„gata” și fără ancoră')
o('P07', PRI, "  w.addEventListener('hashchange', anunta);\n", '', 'primire', 'ancora pusă mai târziu nu mai anunță')
o('P08', PRI, "    w.removeEventListener('message', laMesaj);\n", '', 'primire', 'oprirea lasă ascultătorul mesajelor')
o('P09', PRI, r" && !/[\\/]/.test(n)", '', 'primire', 'numele cu cale trece')
o('P10', PRI, '|| nume.has(n))', '|| false)', 'primire', 'numele dublate trec')
o('P11', PRI, '/^[0-9a-f]{64}$/', '/^[0-9a-fA-F]{64}$/', 'primire', 'amprenta cu majuscule trece')
o('P12', PRI, 't.length > limite.octetiFisier', 't.length > limite.octetiFisier + 1', 'primire', 'un fișier peste limită trece')
o('P13', PRI, 'total > limite.octetiTotal', 'total >= limite.octetiTotal', 'primire', 'totalul chiar la limită refuzat')
o('P14', PRI, 'm.fisiere.length > limite.fisiere', 'm.fisiere.length >= limite.fisiere', 'primire', 'numărul maxim de fișiere refuzat')
o('P15', PRI, 'if (m.versiune !== VERSIUNE) return', 'if (m.versiune === undefined) return', 'primire', 'altă versiune trece')
o('P16', PRI, "m.titlu.slice(0, limite.titlu)", 'm.titlu', 'primire', 'titlul netăiat')
o('P17', PRI, 'g.fata === 1 || g.fata === 2', 'g.fata !== undefined', 'primire', 'fața null păstrată')
o('P18', PRI, "if (d.tip === 'cauta') { catre(ev.source, ev.origin)(gata()); return; }", "if (d.tip === 'cauta') { catre(ev.source, '*')(gata()); return; }", 'primire', '„gata” la „cauta” spre orice origine')
o('P19', PRI, "tip: 'primit', id, renuntat: true", "tip: 'primit', id, renuntat: false", 'primire', 'renunțarea nespusă')
o('P20', PRI, 'refuzate.push({ nume: f.nume, cod: rez.cod, linie: rez.linie })', 'refuzate.push({ nume: f.nume, cod: rez.cod, linie: null })', 'primire', 'refuzul fără linie')

# ---- legarea în aplicație (e2e) ----
o('E01', APP, "if (oprire || location.hash !== '#primeste-lucrare' || !window.opener) return;", "if (oprire || location.hash !== '#primeste-lucrare') return;", 'e2e', 'ancora fără fereastra care a deschis fila încarcă primirea')
o('E02', APP, "const primireActiva = config.ok && config.config.instanta !== 'live';", 'const primireActiva = config.ok;', 'e2e', 'primirea pornită și pe live')
o('E03', APP, ' || cerereLucrare !== null;', ';', 'e2e', 'aplicația nu e inertă sub dialogul primirii')
o('E04', DIA, '    if (curenta) curenta.raspunde(primit(curenta.lucrare.id, null));\n', '', 'e2e', 'lucrarea înlocuită rămâne fără răspuns')
o('E05', APP, ' setPanouri((s) => ({ ...s, masina: true }));', '', 'e2e', 'panoul mașinii nu se deschide după „Primește”')
o('E06', PAN, "x.cod === 'hash' ? t('masina.refuz.hash-primit') : textRefuz(x)", 'textRefuz(x)', 'e2e', 'amprenta greșită spune „exportă din nou”')
o('E07', PAN, 'const x = lucrarePrimita.acceptate[primitAles];', 'const x = lucrarePrimita.acceptate[0];', 'e2e', 'alegerea fișierului ignorată')
o('E08', DIA, "if (e.key !== 'Escape' || verific) return;", "if (e.key !== 'Esc' || verific) return;", 'e2e', 'Escape nu mai renunță')
