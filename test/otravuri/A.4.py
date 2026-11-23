# Lista de otrăvuri a feliei A.4 (Sugestii ca tablă a deciziilor; ADR 0260 §4), 22.11.2026, alese de autor: partea pură
# (coloanele și ordinea lor, unde se mută un card, nota cerută, mutarea arătată cât e în drum, lista după răspuns, fără
# recitire) și pagina pe emulatoare (tragerea, fereastra notei, „Mută în…” din tastatură, focusul, mutarea ținută pe drum,
# refuzul care revine pe card, „Reîncarcă”, „Sugestie nouă” și poza din editor, rolul care doar citește). Felia nu schimbă
# serverul, nici regulile: n-are otrăvuri acolo.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit. Setul „e2e” e pe
# emulatoare: rulează doar cu 4173 și porturile emulatoarelor libere, prin bucla din raportul feliei (build, apoi
# `firebase emulators:exec` cu Playwright prin `node`, câte o probă pe otravă, după GREP: fișierul probei și titlul ei).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/admin/sugestii/date.ts'
TB = 'src/admin/sugestii/Tabla.tsx'
DT = 'src/admin/sugestii/Detaliu.tsx'
FS_ = 'src/admin/sugestii/FilaSugestii.tsx'
CS = 'src/admin/sugestii/sugestii.css'

# Partea pură (unitare).
o('U01', D, "['noua', 'acceptata', 'in-lucru', 'amanata', 'facuta']", "['noua', 'acceptata', 'amanata', 'in-lucru', 'facuta']", 'tabla',
  'coloanele în altă ordine decât schița')
o('U02', D, ".filter((x) => x !== s.stare)", '', 'tabla', '„Mută în…” oferă și coloana în care stă cardul')
o('U03', D, "[...COLOANE, 'respinsa' as const]", '[...COLOANE]', 'tabla', '„Mută în…” fără Respinsă')
o('U04', D, "stare === 'respinsa' || stare === 'amanata'", "stare === 'respinsa'", 'tabla', 'la Amânată, nota nu se mai cere')
o('U05', D, "notaCeruta(stare) && nota.trim() === ''", "notaCeruta(stare) && nota === ''", 'tabla', 'spațiile singure trec drept notă')
o('U06', D, "if (st !== 'noua') coloane[st]", 'coloane[st]', 'tabla',
  'în „Fără decizie”, un card mutat înapoi urcă după decizie, nu după cât e de nou')
o('U07', D, "  for (const st of STARI_SUGESTIE) if (st !== 'noua') coloane[st].sort((a, b) => decisa(b) - decisa(a) || 0);\n", '', 'tabla',
  'coloanele deciziilor după cele mai noi, nu după ultima decizie (un card mutat nu urcă)')
o('U08', D, '(s.stare === null ? necunoscute : coloane[s.stare])', "coloane[s.stare ?? 'noua']", 'tabla',
  'o stare necunoscută apare în „Fără decizie”')
o('U09', D, '{ ...s, stare: m.spre, decisaLa: m.la }', '{ ...s, stare: m.spre }', 'tabla',
  'cardul în drum nu urcă în capul coloanei noi')
o('U10', D, '  if (!r.schimbat) return lista;\n', '', 'tabla', 'un răspuns „nimic schimbat” rescrie totuși rândul')
o('U11', D, 'const nota = curataText(d.nota, NOTA_MAX) ?? d.nota;', 'const nota = d.nota;', 'tabla',
  'nota ținută local altfel decât pe server (spațiile, capetele de rând)')
o('U12', D, 's.id === d.id && s.versiune === d.versiune ? ', 's.id === d.id ? ', 'tabla',
  'un rând reîncărcat între timp e rescris cu decizia veche')
o('U13', D, ', decisaLa: acum, versiune: r.versiune }', ', decisaLa: acum }', 'tabla',
  'versiunea rămâne cea veche: a doua mutare a cardului e refuzată')
o('U14', D, 'lista.filter((s) => s.autor === doarAle)', 'lista.filter((s) => s.autor !== doarAle)', 'sugestii',
  '„Ale mele” arată sugestiile celorlalți')

# Pagina pe emulatoare (`sugestii.emulator.spec.ts`).
o('E01', TB, "      e.preventDefault();\n      e.dataTransfer.dropEffect = 'move';", "      e.dataTransfer.dropEffect = 'move';", 'e2e',
  'coloanele nu primesc cardul tras')
o('E02', FS_, '    if (notaCeruta(spre)) setCereNota({ id: s.id, spre, dinMeniu });\n    else decide(', '    decide(', 'e2e',
  'mutarea în Respinsă sau Amânată pleacă fără notă')
o('E03', DT, 'disabled={lipsesteNota(spre, nota)} data-sug="muta-cu-nota"', "disabled={nota === ''} data-sug=\"muta-cu-nota\"", 'e2e',
  'fereastra notei primește doar spații')
o('E04', DT, 'const [nota, setNota] = useState(s.nota);\n  const trimite = (e: FormEvent): void => {\n    e.preventDefault();\n    if (lipsesteNota(spre, nota)) return;',
  "const [nota, setNota] = useState('');\n  const trimite = (e: FormEvent): void => {\n    e.preventDefault();\n    if (lipsesteNota(spre, nota)) return;", 'e2e',
  'fereastra notei pornește goală, nu de la nota cardului')
o('E05', DT, ' || versiune === null || lipsesteNota(stare, nota)} data-sug="salveaza-decizia"', ' || versiune === null} data-sug="salveaza-decizia"', 'e2e',
  'decizia din detaliu pleacă la Respinsă fără notă')
o('E06', FS_, '      setLista((l) => (l?.ok ? { ok: true, valoare: dupaDecizie(l.valoare, d, r, new Date()) } : l));\n', '', 'e2e',
  'după răspuns, cardul se întoarce în coloana veche (lista nu ține decizia)')
o('E07', FS_, '      setLista((l) => (l?.ok ? { ok: true, valoare: dupaDecizie(l.valoare, d, r, new Date()) } : l));\n',
  '      setRev((n) => n + 1);\n', 'e2e', 'fiecare mutare recitește lista întreagă (până la 300 de citiri)')
o('E08', FS_, 'const d: DecizieTrimisa = { id: s.id, versiune, stare, nota };', 'const d: DecizieTrimisa = { id: s.id, versiune: 1, stare, nota };', 'e2e',
  'mutarea trimite altă versiune decât cea văzută')
o('E09', FS_, "      setLucru({ faza: 'eroare', motiv: motivDin(e), loc: s.id });", "      setLucru({ faza: 'eroare', motiv: motivDin(e), loc: 'nou' });", 'e2e',
  'motivul unei mutări refuzate nu apare pe card')
o('E10', FS_, 'tabla={tabla(cuMutarea(aratate, mutare))}', 'tabla={tabla(aratate)}', 'e2e',
  'cât cererea e în drum, cardul stă în coloana veche')
o('E11', TB, "    if (spre === 'respinsa') setRespinse(true);\n", '', 'e2e',
  'un card trimis în Respinse dispare sub banda strânsă')
# E12 (regula `pointer-events: none` de pe butonul oprit al benzii) a ieșit cu regula ei, pe 23.11: în Edge, un buton oprit
# primește evenimentele tragerii și le lasă să urce (măsurat: `dragenter`, `dragover`, `drop` pe BUTTON), deci cardul cade în
# bandă și fără ea. Proba lasă acum cardul chiar peste buton.
o('E13', TB, "e.key === 'ArrowDown' ? (i + 1) % n", "e.key === 'ArrowDown' ? Math.min(i + 1, n - 1)", 'e2e',
  'în meniu, săgeata în jos nu trece de la ultimul rând la primul')
o('E14', TB, "      setDeschis(false);\n      buton.current?.focus();", '      setDeschis(false);', 'e2e',
  'Esc închide meniul, dar focusul se pierde')
o('E15', TB, "    loc.current?.querySelector<HTMLButtonElement>('[role=\"menuitem\"]')?.focus();\n", '', 'e2e',
  'meniul deschis din tastatură nu ia focusul')
o('E16', TB, '    buton.current?.focus();\n    focusGata();', '    focusGata();', 'e2e',
  'după o mutare din tastatură (și după detaliu), focusul nu mai e pe card')
o('E17', FS_, "    setLucru((l) => (l.faza === 'eroare' ? { faza: 'liber' } : l));\n  };", '  };', 'e2e',
  '„Reîncarcă” lasă pe card motivul vechi')
o('E18', FS_, "            setLucru((l) => (l.faza === 'eroare' && l.loc === id ? { faza: 'liber' } : l));\n", '', 'e2e',
  'motivul refuzului din detaliu rămâne pe card după închidere')
o('E19', FS_, '  useEffect(() => { if (pozaNoua) setNoua(true); }, [pozaNoua]);\n', '', 'e2e',
  'poza din editor stă ascunsă sub „Sugestie nouă”')
o('E20', FS_, '                setNoua(false);\n                butonNoua.current?.focus();', '                butonNoua.current?.focus();', 'e2e',
  'după trimitere, formularul nou rămâne deschis')
o('E21', FS_, '                setNoua(false);\n                butonNoua.current?.focus();', '                setNoua(false);', 'e2e',
  'după trimitere, focusul se pierde')
o('E22', TB, 'const mutabil = owner && s.versiune !== null;', 'const mutabil = s.versiune !== null;', 'e2e',
  'un rol care doar citește trage carduri și are „Mută în…”')
o('E23', TB, "{notaCeruta(x) ? '…' : ''}", "{''}", 'e2e', 'meniul nu spune unde urmează o fereastră (nota)')
o('E24', DT, '<button type="button" data-sug="renunta-nota" onClick={() => { d.current?.close(); }}>',
  '<button type="button" data-sug="renunta-nota" onClick={() => { d.current?.close(); muta(nota); }}>', 'e2e',
  '„Renunță” mută totuși cardul')
o('E25', DT, '    if (!el.open) el.showModal();', '    if (!el.open) el.show();', 'e2e',
  'ferestrele nu mai sunt modale: Esc nu le închide, pagina din spate rămâne vie')
o('E26', FS_, 'const aratate = aleLui(toate, aleMele ? eu : null);', 'const aratate = aleLui(toate, null);', 'e2e',
  '„Ale mele” nu filtrează')
# Găsite de bancul vizual pe 22.11: o adresă lungă ieșea din card (și lățea pagina la 760 px); mesajele de deasupra tablei o
# împingeau în jos la fiecare mutare, sub cursorul care trage.
o('E27', CS, '.sug-card {\n  position: relative;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  min-width: 0;\n',
  '.sug-card {\n  position: relative;\n  display: grid;\n', 'e2e', 'o adresă lungă iese din card și lățește pagina')
o('E28', FS_, "faza: 'gata', id: s.id, discret: true,", "faza: 'gata', id: s.id, discret: false,", 'e2e',
  'mesajul unei mutări se pune deasupra tablei: tabla sare sub cursor')

SETURI = {
    'tabla': ['test/unit/sugestii.tabla.test.ts'],
    'sugestii': ['test/unit/sugestii.test.ts'],
}
E2E = ['test/e2e-emulator/sugestii.emulator.spec.ts']
# Proba fiecărei otrăvi de emulatoare: fișierul și titlul ei (`--grep`), pentru bucla locală.
S = 'test/e2e-emulator/sugestii.emulator.spec.ts'
T1, T2 = (S, 'omul scrie și își editează sugestia'), (S, 'decizia pe o sugestie schimbată între timp')
# Titlurile, fără paranteze: `--grep` e o expresie regulată, iar „(ADR 0111)” ar fi un grup (nicio probă potrivită).
T3, T4, T5 = (S, 'tabla: tragerea, nota cerută'), (S, 'tabla: o mutare refuzată'), (S, 'face poza planșei')
GREP = {
    'E01': T3, 'E02': T3, 'E03': T3, 'E04': T3, 'E05': T2, 'E06': T3, 'E07': T3, 'E08': T3, 'E09': T4, 'E10': T3,
    'E11': T3, 'E13': T3, 'E14': T3, 'E15': T3, 'E16': T3, 'E17': T4, 'E18': T2, 'E19': T5, 'E20': T1,
    'E21': T1, 'E22': T2, 'E23': T3, 'E24': T3, 'E25': T1, 'E26': T1, 'E27': T3, 'E28': T3,
}
