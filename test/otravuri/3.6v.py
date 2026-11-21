# Lista de otrăvuri a feliei 3.6v (codurile imprimantei explicate, ADR 0195 §A), 21.11.2026, alese de autor: forma dicționarului
# citit din rețea (linkurile doar spre wiki-ul Creality, fără ghilimele; codul de pe ecran; gravitatea; cheile; familia, limba,
# schema, lista), căutarea (întâi cheia, apoi codul; zero = fără eroare; un număr necunoscut, ca atare), generatorul (gărzile,
# pagina, gravitatea din tabel), tabelul (lista, o pagină, pagina lui 2571, gravitatea lui 116, adresa wiki-ului), driverul
# (`repoPlrStatus`, dicționarul familiei), evenimentele (pana o dată, codul erorii), notificările (explicația în text, setarea
# pornită), precache-ul și fereastra, prin e2e (linkurile, fila nouă fără trimitător, lista codurilor, gravitatea, dicționarul
# cerut abia la prima eroare și o dată, banda și notificarea sistemului cu explicația, pana de curent în card și în bandă).
# Lăsate deoparte, echivalente pe ce se poate primi: `Object.hasOwn` la căutare (cheile sunt numere, deci nu ajung la prototip),
# `pana === 1` față de `pana !== 0` (imprimanta trimite 0 sau 1), garda formei în generator și la aducerea din rețea (fișierele
# generate o trec mereu; o probează proba formei).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SH = 'shared/coduriImprimanta.ts'
GE = 'scripts/coduriImprimanta.ts'
TB = 'src/machine/imprimanta/coduri/k1.ts'
CR = 'src/machine/imprimanta/creality.ts'
EV = 'src/machine/imprimanta/evenimente.ts'
NO = 'src/app/notificariImprimanta.ts'
PR = 'shared/precache.ts'
EI = 'src/app/EroareImprimanta.tsx'
CA = 'src/app/coduriImprimanta.ts'
VI = 'src/app/VestiriImprimanta.tsx'
PI = 'src/app/PanouImprimanta.tsx'

# Forma citită din rețea.
o('S01', SH, "typeof x === 'string' && x.startsWith(WIKI_CREALITY) && x.length <= 300", "typeof x === 'string' && x.length <= 300", 'cod',
  'un link spre alt site primit')
o('S02', SH, " && !/[\\s\"'<>\\\\]/.test(x);", ';', 'cod', 'un link cu ghilimele (un atribut strecurat) primit')
o('S03', SH, 'sir(x.cod) && /^[A-Z]{0,2}\\d{1,5}$/.test(x.cod) && ', 'sir(x.cod) && ', 'cod', 'un cod de pe ecran cu marcaj primit')
o('S04', SH, "typeof x.grava === 'boolean' && ", '', 'cod', 'o gravitate care nu e da sau nu primită')
o('S05', SH, '/^[1-9]\\d{0,5}$/.test(k) && esteIntrare(i)', 'esteIntrare(i)', 'cod', 'o cheie 0 sau cu litere primită')
o('S06', SH, ' || x.familie !== familie || x.limba !== limba', '', 'cod', 'dicționarul altei familii sau limbi primit')
o('S07', SH, 'x.schema !== 1 || ', '', 'cod', 'un fișier cu altă schemă primit')
o('S08', SH, ' || !linkWiki(x.lista)', '', 'cod', 'o listă a codurilor spre alt site primită')
o('S09', SH, 'sir(x.titlu) && sir(x.faci)', 'sir(x.titlu)', 'cod', 'o intrare fără „ce faci” primită')
# Căutarea.
o('C01', SH, 'const numere = [cheie, eroare]', 'const numere = [eroare, cheie]', 'cod', 'codul înaintea cheii')
o('C02', SH, '.filter((n): n is number => n !== null && n !== 0);', '.filter((n): n is number => n !== null);', 'cod',
  'zero luat drept eroare (cheia 0 ascunde codul)')
o('C03', SH, 'return primul === undefined ? null : { numar: primul, intrare: null };', 'return null;', 'cod', 'un număr necunoscut tăcut')
# Generatorul.
o('G01', GE, 'if (faraText.length > 0 || faraCheie.length > 0) {', 'if (faraCheie.length > 0) {', 'cod', 'o cheie fără text trecută')
o('G02', GE, 'if (faraText.length > 0 || faraCheie.length > 0) {', 'if (faraText.length > 0) {', 'cod', 'un text fără cheie trecut')
o('G03', GE, ", ...(c.wiki === undefined ? {} : { wiki: c.wiki }) }];", ' }];', 'cod', 'paginile Creality pierdute')
o('G04', GE, 'return [String(k), { cod: c.cod, grava: c.grava,', 'return [String(k), { cod: c.cod, grava: true,', 'cod', 'toate gravele')
# Tabelul.
o('T01', TB, "${WIKI}k1-flagship-series/k1-series-general-documents/error-code-summary`;", "${WIKI}k1-flagship-series/k1-series-general-documents/`;",
  'cod', 'lista codurilor spre pagina documentelor, nu spre rezumat')
o('T02', TB, "  2509: { cod: 'TE2509', grava: true, wiki: `${WIKI}k1-flagship-series/k1-series-general-documents/2509-error-trouble-shooting` },",
  "  2509: { cod: 'TE2509', grava: true },", 'cod', 'pagina lui 2509 pierdută')
o('T03', TB, '2571-error-troubleshooting`', '2121-error-trouble-shooting`', 'cod', '2571 spre pagina lui 2121, ca în Creality Print')
o('T04', TB, "  116: { cod: 'TR0116', grava: false },", "  116: { cod: 'TR0116', grava: true },", 'cod', 'filamentul terminat, ca o eroare gravă')
o('T05', TB, "const WIKI = 'https://wiki.creality.com/en/';", "const WIKI = 'http://wiki.creality.com/en/';", 'cod', 'wiki-ul pe http')
# Driverul.
o('D01', CR, '  if (pana !== null) stare.reluareDupaPana = pana === 1;\n', '', 'cod', 'pana de curent necitită')
o('D02', CR, "  coduri: 'creality-k1',\n", '  coduri: null,\n', 'cod', 'K1 fără dicționar')
# Evenimentele.
o('E01', EV, "  if (b.reluareDupaPana === true && a.reluareDupaPana !== true) r.push(ev('pana'));\n", '', 'cod', 'pana de curent neanunțată')
o('E02', EV, "if (b.reluareDupaPana === true && a.reluareDupaPana !== true) r.push", "if (b.reluareDupaPana === true) r.push", 'cod',
  'pana anunțată la fiecare clipă')
o('E03', EV, "r.push(ev('eroare', { cheie: b.cheieEroare ?? b.eroare, cod: b.eroare }));", "r.push(ev('eroare', { cheie: b.cheieEroare ?? b.eroare }));",
  'cod', 'eroarea fără cod (căutarea doar după cheie)')
# Notificările.
o('N01', NO, "  if (e.fel === 'eroare' && explicatie !== null) {", '  if (false) {', 'cod', 'notificarea erorii fără explicație')
o('N02', NO, 'eroare: true, pana: true, pierduta: true,', 'eroare: true, pana: false, pierduta: true,', 'cod', 'pana de curent oprită implicit')
o('N03', NO, "      corp: t('imprimanta.notif.eroare.explicata', { titlu: explicatie.titlu, faci: explicatie.faci }),",
  '      corp: explicatie.titlu,', 'cod', 'notificarea fără ce faci')
# Precache-ul.
o('R01', PR, '(?:[a-z0-9]+(?:-[a-z0-9]+)*\\.)?(?:ro|en)\\.json$/', '(?:[a-z0-9]+(?:-[a-z0-9]+)*\\.)?[a-z]+\\.json$/', 'cod',
  'orice limbă în precache')
o('R02', PR, '(?:[a-z0-9]+(?:-[a-z0-9]+)*\\.)?(?:ro|en)\\.json$/', '(?:ro|en)\\.json$/', 'cod', 'dicționarul imprimantei în afara precache-ului')
# Fereastra, prin e2e.
o('U01', EI, '<a href={i.wiki} target="_blank" rel="noopener noreferrer" data-imprimanta="eroare-wiki">',
  '<a href={i.wiki} target="_blank" rel="noopener" data-imprimanta="eroare-wiki">', 'e2e', 'pagina Creality primește adresa cvs2')
o('U02', EI, '<a href={i.wiki} target="_blank" rel="noopener noreferrer" data-imprimanta="eroare-wiki">',
  '<a href={i.wiki} rel="noopener noreferrer" data-imprimanta="eroare-wiki">', 'e2e', 'pagina Creality peste cvs2, nu într-o filă nouă')
o('U03', EI, '<a href={coduri.lista} target="_blank" rel="noopener noreferrer" data-imprimanta="eroare-lista">{t(\'imprimanta.eroare.lista\')}</a>', '',
  'e2e', 'un cod necunoscut fără lista codurilor')
o('U04', EI, "data-grava={i.grava ? 'da' : 'nu'}", 'data-grava="da"', 'e2e', 'toate erorile arătate grave')
o('U05', EI, '{pana === true && (', '{false && (', 'e2e', 'pana de curent lipsă din card')
o('U06', PI, 'useCoduriImprimanta(st.driver.coduri, i.eroare !== null)', 'useCoduriImprimanta(st.driver.coduri, true)', 'e2e',
  'dicționarul cerut la legare, fără nicio eroare')
o('U07', VI, 'useCoduriImprimanta(familie, i.eroare !== null)', 'useCoduriImprimanta(familie, true)', 'e2e',
  'vestirile cer dicționarul fără nicio eroare')
o('U08', VI, 'durata, explicatie(anunt.e));', 'durata, null);', 'e2e', 'banda fără explicație')
o('U09', VI, 'void intrareCuTermen(familie, limba(), e.cod, e.cheie, TERMEN_EXPLICATIE_MS).then(trimite);', 'trimite(null);', 'e2e',
  'notificarea sistemului fără explicație')
o('U10', VI, "      if (x.e.fel === 'pana' && clipa.reluareDupaPana !== true) return null;\n", '', 'e2e', 'banda penei rămasă după răspuns')
o('U11', CA, '  if (!p) {\n    p = fetch(', '  if (true) {\n    p = fetch(', 'e2e', 'dicționarul adus la fiecare cerere')
o('U12', CA, 'aduCoduriImprimanta(familie, limba).then((x) => { if (viu) setD(x); }', "aduCoduriImprimanta(familie, 'en').then((x) => { if (viu) setD(x); }",
  'e2e', 'dicționarul în altă limbă decât fereastra')

SETURI = {
    'cod': ['test/unit/imprimanta.coduri.test.ts', 'test/unit/imprimanta.notificari.test.ts', 'test/unit/imprimanta.creality.test.ts',
            'test/unit/precache.test.ts'],
}
# Doar proba e2e a feliei (linia ei la commit-ul probat), ca fiecare otravă să nu ruleze tot fișierul.
E2E = ['test/e2e/imprimanta.spec.ts:1476']
