# Lista de otrăvuri a feliei A.6 (Roadmap, Documentație și Setări după schițe; ADR 0260 §8–§9), 23.11.2026, alese de autor:
# partea pură (istoricul setărilor din audit: setările conturilor de la cât la cât, răspunsurile rapide adăugate, scoase,
# schimbate sau doar mutate, ordinea; cuprinsul documentului, secțiunea de acum, titlul ADR-ului despărțit, data stării) și
# paginile pe emulatoare (cuprinsul alături și deasupra, secțiunea de acum la derulare și la capătul paginii, clicul și al
# doilea clic, starea ADR-ului sub titlu; „Ce așteaptă de la tine” lipit alături de etape, semnele pistei în coloana lor,
# pista pe un rând doar cât are loc;
# istoricul fiecărei setări sub butonul ei, citit din nou după o salvare). Felia nu schimbă serverul, nici regulile.
# Unitarele se rulează cu `scripts/otravuri.py`, cele de pe emulatoare cu `scripts/otravuri-emulatoare.py` (docs/otravuri.md),
# dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


I = 'src/admin/setari/istoric.ts'
C = 'src/admin/documentatie/cuprins.ts'
FD = 'src/admin/documentatie/FilaDocumentatie.tsx'
CD = 'src/admin/documentatie/documentatie.css'
CR = 'src/admin/roadmap/roadmap.css'
IS = 'src/admin/setari/IstoricSetari.tsx'
FS = 'src/admin/setari/FilaSetari.tsx'
RR = 'src/admin/setari/RaspunsuriRapide.tsx'

# Partea pură (unitare): istoricul setărilor.
o('U01', I, '? SETARI_IMPLICITE : setariDin(inainte);', '? setariDin(dupa) : setariDin(inainte);', 'setari',
  'prima salvare nu pornește de la implicite: pare că n-a schimbat nimic')
o('U02', I, "[['zileOffline', 'offline'], ['zilePastrareTichete', 'tichete']]", "[['zilePastrareTichete', 'tichete'], ['zileOffline', 'offline']]", 'setari',
  'păstrarea tichetelor vine înaintea zilelor offline')
o('U03', I, 'CAMPURI.filter(([k]) => a[k] !== b[k])', 'CAMPURI.filter(() => true)', 'setari', 'și câmpurile neschimbate apar, „90 → 90”')
o('U04', I, "return s.length === 0 && (inainte === null || inainte === undefined) ? [{ fel: 'implicite' }] : s;", 'return s;', 'setari',
  'prima salvare a implicitelor nu spune nimic')
o('U05', I, "return s.length === 0 && (inainte === null || inainte === undefined) ? [{ fel: 'implicite' }] : s;",
  "return s.length === 0 && inainte === null ? [{ fel: 'implicite' }] : s;", 'setari', 'un rând de audit fără „inainte” deloc nu spune nimic')
o('U06', I, 'a.ro === b.ro && a.en === b.en', 'a.ro === b.ro', 'setari', 'un text în engleză schimbat nu e o schimbare')
o('U07', I, "v === undefined ? [{ fel: 'adaugat', eticheta: r.eticheta }]", "v === undefined ? [{ fel: 'schimbat', eticheta: r.eticheta }]", 'setari',
  'un răspuns nou apare „schimbat”')
o('U08', I, '.filter((r) => !noi.has(r.eticheta))', '.filter((r) => noi.has(r.eticheta))', 'setari', '„scos” numește răspunsurile rămase')
o('U09', I, "a.map((r) => r.eticheta).join('\\n') !== b.map((r) => r.eticheta).join('\\n')", 'true', 'setari',
  '„ordinea” apare și la o salvare fără mutare')
o('U10', I, '.sort((a, b) => t(b) - t(a));', '.sort((a, b) => t(a) - t(b));', 'setari', 'istoricul, cel mai vechi întâi')
o('U11', I, 'p.cand?.getTime() ?? -Infinity', 'p.cand?.getTime() ?? Infinity', 'setari', 'un rând fără dată urcă în capul istoricului')
o('U12', I, '    if (!descrie) return [];', "    if (!descrie) return [{ id, cand: null, cine: 'eu', schimbari: [] }];", 'setari',
  'o acțiune necunoscută (sau cu nume de proprietate) intră în istoric')
o('U13', I, 'rapideDin({ lista: x }).lista', 'rapideDin(x).lista', 'setari', 'listele din audit nu se citesc: niciun răspuns nu apare')

# Partea pură (unitare): cuprinsul și titlul.
o('U14', C, "(b.nivel === 2 || b.nivel === 3)", 'b.nivel >= 2', 'cuprins', 'și titlurile de nivel 4 intră în cuprins')
o('U15', C, "(b.nivel === 2 || b.nivel === 3)", 'b.nivel === 2', 'cuprins', 'titlurile de nivel 3 lipsesc din cuprins')
o('U16', C, '  if (laCapat && sus.length > 0) return sus.length - 1;\n', '', 'cuprins',
  'la capătul paginii, o secțiune scurtă de la urmă nu e niciodată cea de acum')
o('U17', C, 'if (y <= prag) k = i;', 'if (y < prag) k = i;', 'cuprins', 'un titlu ajuns exact la prag nu e încă secțiunea de acum')
o('U18', C, "const RE_TITLU_1 = /^ {0,3}#[ \\t]+(.*?)", "const RE_TITLU_1 = /^ {0,3}#[ \\t]*(.*?)", 'cuprins', '„#Lipit” e luat drept titlu')
o('U19', C, "rest: linii.slice(k + 1).join('\\n')", "rest: linii.slice(k).join('\\n')", 'cuprins', 'titlul rămâne și în rest: apare de două ori')
o('U20', C, "const k = linii.findIndex((l) => l.trim() !== '');", 'const k = 0;', 'cuprins', 'rândurile goale dinaintea titlului îl ascund')
o('U21', C, '(?:[ \\t]+#+)?[ \\t]*$/;', '[ \\t]*$/;', 'cuprins', 'diezii de închidere rămân în titlu')
o('U22', C, "const s = /^\\*\\*Starea:\\*\\*(.*)$/m.exec(text)?.[1] ?? '';", 'const s = text;', 'cuprins',
  'data stării se ia de oriunde din document, nu din rândul ei')
o('U23', C, "text.replace(/\\r\\n?/g, '\\n').split('\\n')", "text.split('\\n')", 'cuprins', 'un document cu CRLF nu-și găsește titlul')

# Pagina, pe emulatoare: Documentație.
o('E01', FD, '{intrari.length > 1 ? <Cuprins', '{intrari.length >= 0 ? <Cuprins', 'e2e', 'un document fără secțiuni are un cuprins gol')
o('E02', FD, "return d.stare === null ? { titlu: null, rest: text.text } : desparteTitlul(text.text);", 'return desparteTitlul(text.text);', 'e2e',
  'și un document care nu e ADR primește o insignă de stare')
o('E03', FD, "{t(`admin.doc.adr.${d.stare ?? 'altul'}`)}", "{t('admin.doc.adr.acceptat')}", 'e2e', 'un ADR propus apare „acceptat”')
o('E04', FD, '{data ? <span className="admin-slab">{data}</span> : null}', '{null}', 'e2e', 'ziua stării lipsește de sub titlu')
o('E05', FD, 'const PRAG_SECTIUNE = 96;', 'const PRAG_SECTIUNE = -1000;', 'e2e', 'secțiunea de acum nu se marchează la derulare')
o('E06', FD, 'globalThis.innerHeight + globalThis.scrollY >= radacina.scrollHeight - 2', 'false', 'e2e',
  'la capătul paginii, ultima secțiune scurtă nu se marchează')
o('E07', FD, "    globalThis.addEventListener('scroll', cere, { passive: true });\n", '', 'e2e', 'secțiunea de acum nu urmează derularea')
o('E08', FD, '    const masoara = (): void => {\n      cadru = 0;\n', '    const masoara = (): void => {\n', 'e2e',
  'după prima derulare, secțiunea de acum nu se mai schimbă')
o('E09', FD, "                  globalThis.document.getElementById(`md-${i.ancora}`)?.scrollIntoView({ block: 'start' });\n", '', 'e2e',
  'al doilea clic pe aceeași secțiune nu mai duce la ea')
o('E10', FD, "aria-current={k === activ ? 'location' : undefined}", "aria-current={k === activ + 1 ? 'location' : undefined}", 'e2e',
  'cuprinsul marchează secțiunea de după')
o('E11', CD, '@media (min-width: 1400px) {\n  .doc {', '@media (min-width: 1600px) {\n  .doc {', 'e2e', 'la 1 440 px, cuprinsul nu stă alături')
o('E12', CD, '    grid-row: 1;\n    position: sticky;', '    grid-row: 1;\n    position: static;', 'e2e', 'cuprinsul alăturat pleacă la derulare')
o('E13', CD, '  .doc-articol {\n    grid-column: 2;\n    grid-row: 1;', '  .doc-articol {\n    grid-row: 1;', 'e2e',
  'la 1 440 px, documentul trece în coloana listei, iar lista lângă el')

# Pagina, pe emulatoare: Roadmap.
o('E14', CR, '    grid-template-columns: 20rem minmax(0, 1fr);', '    grid-template-columns: minmax(0, 1fr);', 'e2e',
  'pe un ecran lat, lista stă deasupra etapelor, nu alături')
o('E15', CR, '  .rm-owner {\n    position: sticky;', '  .rm-owner {\n    position: static;', 'e2e', 'lista alăturată pleacă la derulare')
o('E16', CR, '  .rm-owner-lista {\n    overflow: auto;', '  .rm-owner-lista {\n    overflow: visible;', 'e2e', 'lista lungă iese din panoul ei')
o('E17', CR, '    max-height: calc(100vh - 2 * var(--sp-3));\n', '', 'e2e', 'panoul listei e mai înalt decât ecranul')
o('E18', CR, '@container (max-width: 68.5rem) {', '@container (max-width: 20rem) {', 'e2e', 'semnele pistei înguste intră în coloana vecină')
o('E19', CR, '  .rm-pista {\n    column-gap: 1px;\n  }\n\n', '', 'e2e', 'la 990 px, „↑13” nu mai încape în coloana lui')
o('E20', CR, '    flex-wrap: wrap;\n    justify-content: center;\n    align-content: center;', '    justify-content: center;\n    align-content: center;', 'e2e',
  'semnele unei etape rămân pe un rând, peste coloana vecină')
o('E21', CR, '  .rm-cifre {\n    grid-column: 1 / -1;\n  }\n', '', 'e2e', 'cifrele ocupă coloana listei și o mută lângă etape')
o('E31', CR, '@container (min-width: 42rem) {', '@container (min-width: 30rem) {', 'e2e',
  'la 940 px, toate etapele pe un rând, iar semnele lor intră în coloana vecină')

# Pagina, pe emulatoare: Setări.
o('E22', IS, "where('tinta', '==', tinta)", "where('rol', '==', 'owner')", 'e2e', 'istoricul unei setări le arată pe toate (și conturile)')
o('E23', IS, '  }, [con, eu, tinta, rev]);', '  }, [con, eu, tinta]);', 'e2e', 'după o salvare, istoricul nu se citește din nou')
o('E24', IS, "{t(`admin.azi.cine.${p.cine}`)}", "{t('admin.azi.cine.eu')}", 'e2e', 'schimbările altcuiva apar ca ale tale')
o('E25', IS, ".join('; ')", ".join(', ')", 'e2e', 'schimbările aceleiași salvări se lipesc cu virgulă')
o('E26', IS, '{ inainte: s.inainte, dupa: s.dupa }', '{ inainte: s.dupa, dupa: s.inainte }', 'e2e', 'setările, de la cât la cât, pe dos')
o('E27', IS, '{ziScurta(p.cand, limba)}', '{ziScurta(null, limba)}', 'e2e', 'ziua schimbării lipsește')
o('E28', IS, ": pasi.valoare.length === 0 ? <p className=\"admin-slab\" data-ist=\"gol\">", ": pasi.valoare.length < 0 ? <p className=\"admin-slab\" data-ist=\"gol\">", 'e2e',
  'fără nicio schimbare, istoricul e o listă goală, fără vorbă')
o('E29', FS, 'tinta={`${CALE_SETARI.colectie}/${CALE_SETARI.id}`}', 'tinta="setari/raspunsuriRapide"', 'e2e',
  'sub setările conturilor stă istoricul răspunsurilor rapide')
o('E30', RR, 'rev={rev} limba={limba} nume="rapide"', 'rev={0} limba={limba} nume="rapide"', 'e2e',
  'după salvarea răspunsurilor rapide, istoricul lor nu se citește din nou')

SETURI = {
    'setari': ['test/unit/admin.setari.istoric.test.ts'],
    'cuprins': ['test/unit/admin.documentatie.cuprins.test.ts'],
}
E2E = ['test/e2e-emulator/documentatie.emulator.spec.ts', 'test/e2e-emulator/utilizatori.emulator.spec.ts', 'test/e2e-emulator/rapide.emulator.spec.ts']
# Proba fiecărei otrăvi de emulatoare: fișierul și titlul ei (`--grep`, o expresie regulată: fără paranteze).
SD, SU, SR = E2E
D1, R1 = (SD, 'cuprinsul alături, cu secțiunea de acum'), (SD, 'alături de etape și la vedere la derulare')
S1, S2, S3 = (SU, 'istoricul setărilor'), (SU, 'setările: implicitele până la prima salvare'), (SR, 'owner-ul: răspunsurile rapide scrise în Setări')
GREP = {
    'E01': D1, 'E02': D1, 'E03': D1, 'E04': D1, 'E05': D1, 'E06': D1, 'E07': D1, 'E08': D1, 'E09': D1, 'E10': D1, 'E11': D1, 'E12': D1,
    'E13': D1,
    'E14': R1, 'E15': R1, 'E16': R1, 'E17': R1, 'E18': R1, 'E19': R1, 'E20': R1, 'E21': R1, 'E31': R1,
    'E22': S1, 'E23': S1, 'E24': S1, 'E25': S1, 'E26': S1, 'E27': S1, 'E28': S2, 'E29': S1, 'E30': S3,
}
