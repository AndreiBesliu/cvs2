# Lista de otrăvuri a feliei 11.4↑b («Din CSV…», ADR 0210 §4), 09.11.2026, alese de autor: codarea (BOM-ul, UTF-8 valid,
# Windows-1250), cititorul (ghilimelele dublate, ghilimelele doar la începutul celulei, CRLF, rândurile goale, plafoanele),
# separatorul găsit (scorul, tab-ul lipit), valorile (numele comparabil, potrivirea, coloana rămasă, numerotarea, spațiile,
# „Fă din textul ales câmpul”), literele (micșorarea în casetă), textul șablonului (pe rădăcină, grupat: id-urile libere,
# operațiile mutate, spațierile), calculul (primul rând pe plăcuța aleasă, piesa schimbată, plafonul, distanța, așezarea) și
# fereastra (separatorul, codarea, antetul, „potrivit singur”, distanța urcată la freză, butonul din panou, rezultatul).
# Fără otrăvuri care fac bucle fără capăt.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CS = 'src/io/csv.ts'
VC = 'src/model/valoriCsv.ts'
PT = 'src/text/placute.ts'
AC = 'src/ui/actiuniDocumentCalcul.ts'
DC = 'src/app/DialogCsv.tsx'
PP = 'src/app/PanouProprietati.tsx'

# Codarea și cititorul (unitare).
o('C01', CS, "  if (bom && codare !== 'windows-1250') return { text: new TextDecoder('utf-8').decode(octeti.subarray(3)), codare: 'utf-8' };",
  "  if (bom && codare !== 'windows-1250') return { text: new TextDecoder('utf-8').decode(octeti), codare: 'utf-8' };", 'csv', 'BOM-ul rămâne în text')
o('C02', CS, "    return { text: new TextDecoder('utf-8', { fatal: true }).decode(octeti), codare: 'utf-8' };",
  "    return { text: new TextDecoder('utf-8').decode(octeti), codare: 'utf-8' };", 'csv', 'Windows-1250 citit ca UTF-8 (diacriticele stricate)')
o('C03', CS, "        if (t[i + 1] === '\"') { celula += '\"'; i++; } else ghilimele = false;", "        ghilimele = false;", 'csv',
  'ghilimelele dublate închid celula')
o('C04', CS, "    if (c === '\"' && celula === '' && !inCeluleGhilimele) { ghilimele = true; inCeluleGhilimele = true; continue; }",
  "    if (c === '\"') { ghilimele = true; inCeluleGhilimele = true; continue; }", 'csv', 'ghilimelele din mijlocul celulei deschid citarea')
o('C05', CS, "      if (c === '\\r' && t[i + 1] === '\\n') i++;\n", '', 'csv', 'CRLF dă un rând gol în plus (sau o celulă stricată)')
o('C06', CS, "    if (rand.some((c) => c.trim() !== '')) {", '    if (true) {', 'csv', 'rândurile goale rămân în tabel')
o('C07', CS, "    if (randuri.length >= PLAFON_CSV.randuri) { taiat = true; return false; }", '    if (false) { taiat = true; return false; }', 'csv',
  'fără plafonul rândurilor')
o('C08', CS, "      if (rand.length > PLAFON_CSV.coloane) { rand = rand.slice(0, PLAFON_CSV.coloane); taiat = true; }", '', 'csv',
  'fără plafonul coloanelor')
o('C09', CS, "    const sc = moda >= 2 ? cate : 0;", '    const sc = cate;', 'csv', 'o singură coloană contează la separator')
o('C10', CS, "  const ordine: Separator[] = primul.includes('\\t') ? ['\\t', ';', ','] : [';', ',', '\\t'];",
  "  const ordine: Separator[] = [';', ',', '\\t'];", 'csv', 'celulele lipite (tab) nu au prioritate la egalitate')
# Valorile (unitare).
o('V01', VC, "  return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim().replace(/\\s+/g, ' ');",
  "  return s.toLowerCase().trim().replace(/\\s+/g, ' ');", 'csv', 'numele comparabil păstrează diacriticele')
o('V02', VC, "    if (k !== undefined && !folosite.has(k)) {", '    if (false) {', 'csv', 'câmpurile nu se potrivesc după nume')
o('V03', VC, "    while (k < coloane && folosite.has(k)) k++;", '    while (false) k++;', 'csv', 'coloana rămasă poate fi una folosită deja')
o('V04', VC, "  const abs = String(Math.abs(n)).padStart(cifre, '0');", "  const abs = String(Math.abs(n));", 'csv', 'numerotarea fără zerourile din față')
o('V05', VC, "  return n < 0 ? `-${abs}` : abs;", '  return abs;', 'csv', 'numerotarea pierde semnul')
o('V06', VC, "    Object.defineProperty(rez, c, { value: v.trim(), enumerable: true, writable: true, configurable: true });",
  "    Object.defineProperty(rez, c, { value: v, enumerable: true, writable: true, configurable: true });", 'csv', 'spațiile de la capete rămân în valori')
o('V07', VC, "  const n = nume.replace(/[{}]/g, '').trim();", '  const n = nume.trim();', 'csv', 'numele câmpului poate avea acolade')
o('V08', VC, "  if (n === '' || a === b) return null;", "  if (n === '') return null;", 'csv', 'o alegere goală face un câmp')
# Literele și textul șablonului (unitare).
o('T01', PT, "    if (t.bloc.caseta?.fel === 'limita') micsorat = Math.min(micsorat, asezat.inaltime / t.bloc.caseta.ceruta);\n", '', 'csv',
  'micșorarea în casetă nu se spune')
o('T02', PT, "  const { amprenta: _a, spatieri: _s, ...rest } = bloc;\n  const blocNou = { ...rest, continut, ...(bloc.caseta ? { inaltime: asezat.inaltime } : {}) };",
  "  const { amprenta: _a, ...rest } = bloc;\n  const blocNou = { ...rest, continut, ...(bloc.caseta ? { inaltime: asezat.inaltime } : {}) };", 'csv',
  'textul nou păstrează spațierile literelor alese ale celui vechi')
o('T03', PT, "    for (let k = 2; folosite.has(n); k++) n = `${id}_${k}`;", '    for (let k = 2; false; k++) n = `${id}_${k}`;', 'csv',
  'literele textului grupat se ciocnesc cu id-urile ramei')
o('T04', PT, "    const noduri = [...o.noduri.filter((x) => !vechi.has(x)), ...(mutate[o.id] ?? [])];",
  "    const noduri = [...o.noduri, ...(mutate[o.id] ?? [])];", 'csv', 'operațiile taie și literele vechi (care nu mai sunt)')
o('T05', PT, "    return noduri.length > 0 ? [{ ...o, noduri }] : [];", '    return [{ ...o, noduri }];', 'csv', 'o operație fără nimic de tăiat rămâne')
# Calculul (unitare).
o('A01', AC, "    if (p !== c.piesa) return { ok: false, motiv: 'motiv.placute' };\n    if ((folosiriPieselor(doc).get(p.id) ?? 0) + rest.length > INCA_MAXIM)",
  "    if ((folosiriPieselor(doc).get(p.id) ?? 0) + rest.length > INCA_MAXIM)", 'csv', 'plăcuțele făcute pe o piesă schimbată trec')
o('A02', AC, "    if ((folosiriPieselor(doc).get(p.id) ?? 0) + rest.length > INCA_MAXIM) return { ok: false, motiv: 'motiv.inca-total' };\n", '', 'csv',
  'fără plafonul instanțelor piesei')
o('A03', AC, "    const comenzi: Comanda[] = [{ tip: 'inlocuieste-instanta', foaie: foaie.id, vechi: inst, nou: cuValorile(inst, primul.campuri, primul.texte) }];\n    const { campuri: _campuri",
  "    const comenzi: Comanda[] = [];\n    const { campuri: _campuri", 'csv', 'primul rând nu ajunge pe plăcuța aleasă')
o('A04', AC, "    comenzi.push(...comenziAsezare(intermediar, foaie.id, plan));\n", '', 'csv', 'plăcuțele nu se așază (rămân una peste alta)')
o('A05', AC, "    if (vechi !== c.piesa || c.nou.id !== vechi.id) return { ok: false, motiv: 'motiv.placute' };", "    if (c.nou.id !== vechi.id) return { ok: false, motiv: 'motiv.placute' };",
  'csv', 'textul șablonului făcut pe o piesă schimbată trece')
# Fereastra (e2e).
o('E01', DC, "  const sep = separator ?? (text ? separatorGasit(text) : ';');", "  const sep = separator ?? ';';", 'e2e', 'separatorul nu se mai găsește singur')
o('E02', DC, "  const decodat = useMemo(() => (sursa?.octeti ? decodeazaCsv(sursa.octeti, codare ?? undefined) : null), [sursa, codare]);",
  "  const decodat = useMemo(() => (sursa?.octeti ? decodeazaCsv(sursa.octeti, codare ?? 'utf-8') : null), [sursa, codare]);", 'e2e',
  'codarea nu se mai găsește singură (Windows-1250 citit ca UTF-8)')
o('E03', DC, "  const capul = antet && tabel ? tabel.randuri[0] ?? null : null;", '  const capul = null;', 'e2e', 'antetul nu dă numele coloanelor')
o('E04', DC, "              {potrivit && <span className=\"csv-nota\">{t('csv.camp.potrivit')}</span>}\n", '', 'e2e', 'potrivirea nu se spune')
o('E05', DC, "    return { ...o, distantaX: Math.max(o.distantaX, d), distantaY: Math.max(o.distantaY, d) };", '    return o;', 'e2e',
  'distanța nu urcă la freză (planul refuzat)')
o('E06', DC, "      const rez = onCerere({ fel: 'sablon', instanta: instanta.id, piesa, nou: r.piesa, texte: (nou, valori) => m.textePlacutei(nou, valori, f.font) });",
  "      const rez = onCerere({ fel: 'sablon', instanta: instanta.id, piesa, nou: piesa, texte: (nou, valori) => m.textePlacutei(nou, valori, f.font) });", 'e2e',
  '„Fă din textul ales câmpul” nu schimbă textul piesei')
o('E07', PP, "          {blocuriPiesei(piesa).length > 0 && onPlacuta && (", '          {false && (', 'e2e', 'panoul n-are «Din CSV…»')
o('E08', PP, "          {rezultatCsv?.cheie === cheie && <p className=\"prop-nota-piesa\" role=\"status\" data-testid=\"placuta-csv\">{rezultatCsv.mesaj}</p>}\n", '', 'e2e',
  'rezultatul nu se arată în panou')

SETURI = {
    'csv': ['test/unit/csv.test.ts', 'test/unit/placute.csv.test.ts'],
    'csv2': ['test/unit/csv.test.ts', 'test/unit/placute.csv.test.ts', 'test/unit/placute.test.ts', 'test/unit/document.v23.oracol.test.ts'],
}
E2E = ['test/e2e/placute-csv.spec.ts']
