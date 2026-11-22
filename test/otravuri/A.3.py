# Lista de otrăvuri a feliei A.3, partea fără decizie (Tichete: lista și conversația, erorile din sesiune spre Erori; ADR 0260
# §3), 21.11.2026, alese de autor: partea pură (titlul tichetului, numerele filtrului, starea pusă de „Răspunde și …”,
# erorile din sesiune, grupul adus în Erori) și paginile pe emulatoare (detaliul lipit sus cu răspunsul la vedere, alegerea
# care nu sare înapoi, ciornele, nimic trimis cât se recitește lista, starea pe versiunea întoarsă de răspuns, erorile din
# sesiune doar pentru cine vede fila Erori, un grup vechi adus singur, tichetul găsit de căutare, rândurile schițate).
# Răspunsurile rapide (ADR 0261, propus) își vor avea otrăvurile lor, la cod.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit. Setul „e2e” e pe
# emulatoare: rulează doar cu 4173 și porturile emulatoarelor libere, prin bucla din raportul feliei (build, apoi
# `firebase emulators:exec` cu Playwright prin `node`, câte o probă pe otravă, după GREP: fișierul probei și titlul ei).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


TV = 'src/admin/tichete/vedere.ts'
EV = 'src/admin/erori/vedere.ts'
TF = 'src/admin/tichete/FilaTichete.tsx'
ER = 'src/admin/erori/FilaErori.tsx'
TC = 'src/admin/tichete/tichete.css'
PA = 'src/admin/PaginaAdmin.tsx'
ST = 'src/admin/carcasa/stari.tsx'
CS = 'src/admin/admin.css'

# Partea pură (unitare).
o('U01', TV, ".find((r) => r !== '') ?? '';", "[0] ?? '';", 'tichete', 'titlul ia primul rând, chiar gol')
o('U02', TV, "r.replace(/\\s+/g, ' ').trim()", 'r.trim()', 'tichete', 'spațiile din titlu nu se strâng')
o('U03', TV, 'const litere = Array.from(rand);', "const litere = rand.split('');", 'tichete',
  'titlul numărat în unități UTF-16: un emoji contează dublu și se rupe la jumătate')
o('U04', TV, 'spatiu > taiat.length / 2 ? taiat.slice(0, spatiu) : taiat', 'taiat', 'tichete',
  'titlul lung tăiat în mijlocul unui cuvânt')
o('U05', TV, 'if (litere.length <= max) return rand;', 'if (litere.length < max) return rand;', 'tichete',
  'un titlu exact la plafon primește „…”')
o('U06', TV, 'return { toate: lista.length, ...numarePeStare(lista) };',
  'return { toate: lista.filter((x) => x.stare !== null).length, ...numarePeStare(lista) };', 'tichete',
  '„Toate” nu numără tichetele cu o stare necunoscută')
o('U07', TV, "return stare === 'rezolvat' ? 'deschis' : 'rezolvat';", "return 'rezolvat';", 'tichete',
  'un tichet rezolvat se „rezolvă” din nou în loc să se redeschidă')
o('U08', TV, '  if (stare === null) return null;\n', '', 'tichete', 'o stare necunoscută primește butonul „Răspunde și rezolvă”')
o('U09', TV, 'return amprente.filter((a) => citite.has(a)).map(', 'return amprente.map(', 'tichete',
  'o eroare încă necitită apare ca „nu mai e în jurnal”')
o('U10', EV, ' || (doarNerezolvate && adus.rezolvat)', '', 'vederi', 'un grup rezolvat, adus din tichet, apare la „Nerezolvate”')
o('U11', EV, 'lista.some((g) => g.id === adus.id) || ', '', 'vederi', 'grupul adus, deja citit, apare de două ori')

# Paginile pe emulatoare (`conversatia.emulator.spec.ts`, `azi.emulator.spec.ts`).
o('E01', ST, 'el.style.maxHeight = `${Math.max(240, Math.floor(window.innerHeight - sus - lipit))}px`;', "el.style.maxHeight = '';", 'e2e',
  'detaliul doar cât ecranul (regula din CSS): înainte de prima derulare, butoanele răspunsului ies din ecran')
o('E16', CS, '  max-height: calc(100vh - 2 * var(--sp-3));\n  overflow-y: auto;\n', '', 'e2e',
  'detaliul Erorilor fără plafon (cum era în A.2): mai înalt decât ecranul, partea lui de jos iese din ecran')
o('E17', ER, '<section ref={catSpatiul} className="admin-erori-detaliu"', '<section className="admin-erori-detaliu"', 'e2e',
  'detaliul Erorilor doar cât ecranul: înainte de prima derulare, stă sub antet și iese din ecran')
o('E02', TF, '  if (lista?.ok && alesAcum !== ales) setAles(alesAcum);\n', '', 'e2e',
  'alegerea sare înapoi pe un tichet ascuns între timp de filtru')
o('E03', TF, 'useState<ReadonlyMap<string, string>>(() => new Map(CIORNE));', 'useState<ReadonlyMap<string, string>>(() => new Map());', 'e2e',
  'ciorna se pierde după un drum în fila Erori')
o('E04', TF, "text={ciorne.get(tichet.id) ?? ''}", "text={[...ciorne.values()][0] ?? ''}", 'e2e',
  'ciorna unui tichet apare la altul')
o('E05', TF, "const ocupat = lucru.faza === 'lucreaza' || recitire;", "const ocupat = lucru.faza === 'lucreaza';", 'e2e',
  'cât se recitește lista, răspunsul pleacă pe versiunea veche')
o('E06', TF, 'versiune: r.versiune, stare: apoi', 'versiune, stare: apoi', 'e2e',
  '„Răspunde și rezolvă” cere starea pe versiunea de dinaintea răspunsului (refuzată)')
o('E07', TF, "      scrie(x.id, '');\n", '', 'e2e', 'ciorna rămâne în câmp după ce răspunsul a plecat')
o('E08', TF, "const poateCiti = useVedeFila('erori');", 'const poateCiti = true;', 'e2e',
  'un rol fără fila Erori citește (și i se refuză) grupurile erorilor din sesiune')
o('E09', TF, "[a, d.exists() ? randDin(d.id, d.data()) : null] as const", '[a, randDin(d.id, d.data() ?? {})] as const', 'e2e',
  'o eroare care nu mai e în jurnal apare cu legătură, fără mesaj')
o('E10', ER, 'const randuri = cuTinta(citite, adus, filtru', 'const randuri = cuTinta(citite, null, filtru', 'e2e',
  'grupul vechi din tichet nu se aduce: fila Erori alege altul')
o('E11', PA, ' permisiuni={p.permisiuni} tinta={tintaTichete} />', ' permisiuni={p.permisiuni} />', 'e2e',
  'tichetul găsit de căutare nu vine ales')
o('E12', TF, "const poateRaspunde = owner || permisiuni.has('tichete.raspunde');",
  "const poateRaspunde = owner || permisiuni.has('tichete.raspunde') || permisiuni.has('tichete.citeste');", 'e2e',
  'un rol care doar citește primește câmpul răspunsului')
o('E13', TF, "<span className=\"tic-titlu\" data-tic=\"titlu\">{titluTichet(x.text) || t('admin.tic.fara-text')}</span>",
  "<span className=\"tic-titlu\" data-tic=\"titlu\">{x.text}</span>", 'e2e', 'rândul arată tot textul, nu titlul')
o('E14', TF, "{lista === null ? <SeIncarca text={t('admin.tic.se-incarca')} />", "{false ? <SeIncarca text={t('admin.tic.se-incarca')} />",
  'e2e', 'cât se citește lista, fără rândurile schițate (proba lor din A.1 trecea și fără citirea ținută)')
o('E15', TF,
  "{x.raspunsuri.length > 0 ? <span>{t('admin.tic.raspunsuri', { n: x.raspunsuri.length })}</span> : null}\n          {eRosu(x, acum) ?",
  "{x.raspunsuri.length > 0 ? <span>{t('admin.tic.raspunsuri', { n: x.raspunsuri.length })}</span> : null}\n          {x.raspunsuri.length === 0 ?",
  'e2e', 'vârsta roșie pe orice tichet fără răspuns, și pe cele noi sau rezolvate')

# Răspunsurile rapide (ADR 0261, acceptat pe 21.11): contractul comun, serverul, regula, cele două file.
RR = 'shared/raspunsuriRapide.ts'
AC = 'functions/src/tichete/actiuni.ts'
FR = 'firestore.rules'
SR = 'src/admin/setari/RaspunsuriRapide.tsx'
o('R01', RR, 'x.length > RAPIDE_MAX) return null;', 'x.length > RAPIDE_MAX + 1) return null;', 'rapide', '13 răspunsuri trec')
o('R02', RR, '[...s].length > ETICHETA_RAPID_MAX ||', '[...s].length > ETICHETA_RAPID_MAX * 2 ||', 'rapide', 'eticheta de 80 de litere trece')
o('R03', RR, "s.normalize('NFD').replace(/\\p{M}/gu, '').toLocaleLowerCase('ro')", "s.toLocaleLowerCase('ro')", 'rapide',
  '„Sigur” și „ȘIGUR” nu mai sunt aceeași etichetă (pe buton s-ar confunda)')
o('R04', RR, "else if (vazute.has(cheieEticheta(e))) p.push('eticheta-dubla');", "else if (false) p.push('eticheta-dubla');", 'rapide',
  'două răspunsuri cu aceeași etichetă trec')
o('R05', RR, "    if (sir(r.en).trim() !== '' && curataTextTichet(r.en, TEXT_RAPID_MAX) === null) p.push('en-invalid');\n", '', 'rapide',
  'o engleză greșită (prea lungă, cu caractere de control) nu e spusă')
o('R06', RR, "const en = sir(r['en']).trim() === '' ? '' : curataTextTichet(r['en'], TEXT_RAPID_MAX);", "const en = sir(r['en']);", 'rapide',
  'engleza doar din spații rămâne (pare scrisă: o raportare în engleză primește spații)')
o('R07', RR, "versiune: typeof versiune === 'number' && Number.isSafeInteger(versiune) && versiune >= 1 ? versiune : 0,",
  "versiune: typeof versiune === 'number' ? versiune : 0,", 'rapide', 'o versiune stricată (2,5) se ia de bună')
o('R08', RR, 'a.every((x, k) => x.eticheta === b[k]?.eticheta && x.ro === b[k]?.ro && x.en === b[k]?.en)',
  'a.every((x) => b.some((y) => y.eticheta === x.eticheta && y.ro === x.ro && y.en === x.en))', 'rapide',
  'o listă doar reordonată pare neschimbată (mutarea nu se salvează)')
o('R09', RR, "return limba === 'en' && r.en !== '' ? r.en : r.ro;", "return limba === 'en' ? r.en : r.ro;", 'rapide',
  'o raportare în engleză primește un text gol unde owner-ul n-a scris engleza')
o('R10', TV, "const sus = inainte === '' || inainte.endsWith('\\n\\n') ? '' : inainte.endsWith('\\n') ? '\\n' : '\\n\\n';", "const sus = '';", 'tichete',
  'textul pus lipit de cel dinainte, fără rândul gol')
o('R11', TV, "const jos = dupa === '' || dupa.startsWith('\\n\\n') ? '' : dupa.startsWith('\\n') ? '\\n' : '\\n\\n';", "const jos = '';", 'tichete',
  'textul pus lipit de cel de după, fără rândul gol')
o('R12', TV, 'const dupa = text.slice(e);', 'const dupa = text.slice(s);', 'tichete', 'selecția nu se înlocuiește: textul ales rămâne după cel pus')
o('R13', TV, 'insereazaLaCursor(text, text.length, text.length, bucata).text.length <= max;', '(text + bucata).length <= max;', 'tichete',
  'plafonul uită rândul gol dinainte: butonul pornit pune un text care nu mai încape')

# Serverul (`functions/test/tichete.emulator.test.ts`) și regula (`functions/test/reguli.emulator.test.ts`), pe emulatoare.
o('F01', AC, "if (!(await drepturiIn(tx, db, uid)).owner) throw new HttpsError('permission-denied', 'doar owner-ul schimbă răspunsurile rapide');",
  "if (false) throw new HttpsError('permission-denied', 'doar owner-ul schimbă răspunsurile rapide');", 'server',
  'oricine logat (și un client) rescrie răspunsurile rapide')
o('F02', AC, "if (versiune !== vazuta) throw new HttpsError('failed-precondition',", "if (false) throw new HttpsError('failed-precondition',", 'server',
  'o salvare pe o versiune veche calcă lista salvată între timp')
o('F03', AC, '    if (aceleasiRapide(acolo?.lista ?? [], lista)) return { ok: true, schimbat: false, versiune };\n', '', 'server',
  'o listă neschimbată scrie din nou, cu un rând de audit fără nicio schimbare')
o('F04', AC, 'inainte: acolo ? acolo.lista : null, dupa: lista,', 'inainte: null, dupa: lista,', 'server', 'auditul uită lista dinainte')
o('F05', AC, "  const lista = listaRapideCeruta(d['lista']);", "  const lista = Array.isArray(d['lista']) ? d['lista'] as never : null;", 'server',
  'serverul nu mai curăță și nu mai judecă lista (doar că e o listă)')
o('F06', FR, "(id == 'raspunsuriRapide' && are('tichete.raspunde'))", "(id == 'raspunsuriRapide' && request.auth != null)", 'reguli',
  'oricine logat (un client, un rol doar cu citirea) citește răspunsurile rapide')

# Paginile pe emulatoare (`rapide.emulator.spec.ts`).
o('E18', TF, 'const bucata = textRapid(r, limba);', 'const bucata = textRapid(r, null);', 'e2e', 'o raportare în engleză primește textul în română')
o('E19', TF, 'insereazaLaCursor(text, el?.selectionStart ?? text.length, el?.selectionEnd ?? text.length, bucata);',
  'insereazaLaCursor(text, text.length, text.length, bucata);', 'e2e', 'textul intră mereu la capăt, nu la cursor')
o('E20', TF, '      camp.current?.focus();\n', '', 'e2e', 'după clic, câmpul nu mai primește focusul')
o('E21', TF, '{owner ? <LegaturaFila fila="setari"', '{true ? <LegaturaFila fila="setari"', 'e2e',
  'și un rol fără fila Setări primește legătura „Schimbă-le în Setări”')
o('E22', TF, '    if (!poateRaspunde) return undefined;\n    let viu = true;\n    getDoc(doc(con.db, CALE_RASPUNSURI_RAPIDE',
  '    let viu = true;\n    getDoc(doc(con.db, CALE_RASPUNSURI_RAPIDE', 'e2e',
  'un rol care doar citește tichetele cere și el răspunsurile rapide (refuzat de regulă)')
o('E23', SR, 'setLista(EXEMPLE_RAPIDE.map((r) => ({ ...r })));', 'setLista(EXEMPLE_RAPIDE.slice(0, 2).map((r) => ({ ...r })));', 'e2e',
  'exemplele schiței vin doar două')
o('E24', SR, 'disabled={ocupat || faraAppCheck || !buna || !schimbata}', 'disabled={ocupat || faraAppCheck || !schimbata}', 'e2e',
  '„Salvează” pornit cu o etichetă la fel cu alta')
o('E25', SR, "deFocus.current = `set-rapid-${nou}-${(d < 0) !== capat ? 'sus' : 'jos'}`;", "deFocus.current = `set-rapid-${nou}-${d < 0 ? 'sus' : 'jos'}`;", 'e2e',
  'urcat primul, focusul cade pe „↑” oprit și sare la „Adaugă”')
o('E26', SR, 'onClick={() => { salveaza(lista, versiune); }}', 'onClick={() => { salveaza(lista, versiune + 1); }}', 'e2e',
  'salvarea trimite altă versiune decât cea văzută (refuzată din prima)')
# Găsite de proba e2e pe 21.11: editorul (și formularul setărilor conturilor, din 14.C↑b) remontat la cerere, nu la citire;
# plafonul detaliului fără umplutură și bordură.
FS_ = 'src/admin/setari/FilaSetari.tsx'
o('E27', SR, '<EditorRapide key={citiri} initiale=', '<EditorRapide key={rev} initiale=', 'e2e',
  'după „Salvează”, editorul arată lista de dinainte (și „Ai schimbări nesalvate”)')
o('E28', FS_, '<Formular key={citiri} initiale=', '<Formular key={rev} initiale=', 'e2e',
  'după „Salvează”, formularul setărilor conturilor arată valorile de dinainte, până la reîncărcarea paginii')
o('E29', CS, '  box-sizing: border-box;\n  max-height: calc(100vh - 2 * var(--sp-3));', '  max-height: calc(100vh - 2 * var(--sp-3));', 'e2e',
  'plafonul detaliului fără umplutură și bordură: trece cu 34 px de spațiul de sub el')

SETURI = {
    'tichete': ['test/unit/admin.tichete.test.ts'],
    'vederi': ['test/unit/admin.vederi.test.ts'],
    'rapide': ['test/unit/raspunsuriRapide.test.ts'],
    # Câte un singur fișier de emulator pe set (ca în 15.B-a.py), rulat în `firebase emulators:exec --only firestore,storage`.
    'server': ['functions/test/tichete.emulator.test.ts'],
    'reguli': ['functions/test/reguli.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/conversatia.emulator.spec.ts', 'test/e2e-emulator/azi.emulator.spec.ts', 'test/e2e-emulator/erori.emulator.spec.ts',
       'test/e2e-emulator/rapide.emulator.spec.ts', 'test/e2e-emulator/utilizatori.emulator.spec.ts']
# Proba fiecărei otrăvi de emulatoare: fișierul și titlul ei (`--grep`), pentru bucla locală.
C = 'test/e2e-emulator/conversatia.emulator.spec.ts'
A = 'test/e2e-emulator/azi.emulator.spec.ts'
R = 'test/e2e-emulator/erori.emulator.spec.ts'
T1, T2, T3 = (C, 'Tichete: lista în stânga'), (C, 'un rol care răspunde'), (C, 'un rol care doar citește tichetele')
TA, TS, TE = (A, 'căutarea din antet'), (A, 'lista goală are semnul'), (R, 'Erori: lista în stânga')
P = 'test/e2e-emulator/rapide.emulator.spec.ts'
TR1, TR2 = (P, 'owner-ul: răspunsurile rapide'), (P, 'un rol care răspunde le folosește')
TU = ('test/e2e-emulator/utilizatori.emulator.spec.ts', 'setările: implicitele')
GREP = {
    'E01': T1, 'E02': T1, 'E03': T1, 'E04': T1, 'E05': T1, 'E06': T1, 'E07': T1, 'E08': T2, 'E09': T1, 'E10': T1, 'E11': TA,
    'E12': T3, 'E13': T1, 'E14': TS, 'E15': T1, 'E16': TE, 'E17': TE,
    'E18': TR1, 'E19': TR1, 'E20': TR1, 'E21': TR2, 'E22': TR2, 'E23': TR1, 'E24': TR1, 'E25': TR1, 'E26': TR1,
    'E27': TR1, 'E28': TU, 'E29': TE,
}
