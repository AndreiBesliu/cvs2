# ADR 0262 — Utilizarea aplicației: interacțiunile oamenilor, fila Utilizare și pașii dinaintea unei erori

**Starea:** acceptat pe 23.11.2026, cu răspunsurile owner-ului în formularul schiței (pagina privată din raportul
liniei): 1 după nota lui (colectarea pornită pentru toți, fără întrebare), 2a, 3b, 4a, 5a, 6a, 7a, cu nota „toate astea vin
cu mentiunea ca defapta vreau sa pot configura eu din admin cat mai multe setari” (§8). Propus în aceeași zi. Cererea
owner-ului, exactă: „in admin, vreau sa vad mai multe statistici/date despre comportamentul
utilizatorilor, vreau sa vad ce unelte folosesc cel mai des si care este cel mai comun workflow. vreau sa pot deduce care
parte a aplicatiei este cea mai utila si care nu, si vreau sa folosim asta si la troubleshooting. practic vreau sa stiu
fiecare interactiune pe care o are userul cu aplicatia, mai putin parolele lor sau date sensibile etc.” **Intră în:** linia
adminului (feliile A.8a–A.11 de mai jos), adusă din etapa 28: `PLAN.md` §5.6 pune acolo fila Analiză („pâlnia, adopția din
id-urile acțiunilor, perioada aleasă”), iar §3.2 spune deja că analiza din admin e o vedere a registrului de acțiuni.
**Continuă:** ADR 0039 (jurnalul de erori, scris de server), 0043 (raportorul din client), 0116 (conturile, nota de
confidențialitate, §18), 0260 (adminul reproiectat). **Schimbă:** o colecție nouă (`utilizare`), un callable nou, un job de
noapte, două permisiuni noi, setările utilizării în fila Setări și fraza ei în nota de confidențialitate.

## Problema

Azi aflăm ce face un om în aplicație doar când ceva se strică: din jurnalul de erori (ADR 0039) și din raportările lui
(tichetele). Nu știm ce unelte se folosesc, pe ce drum ajung oamenii la G-code, unde se opresc, ce butoane apasă când nu
merg și ce parte a aplicației nu folosește nimeni. La o eroare, vedem stiva, dar nu și pașii dinaintea ei.

Aplicația are deja locul de unde se pot citi toate acestea: **registrul de acțiuni** (`src/ui/actiuni.ts`, `PLAN.md` §3.2),
singura ușă a interfeței spre domeniu. Vreo 105 acțiuni (desenul, transformările, rolurile, importul, exportul, vederea,
foile, extensiile) trec prin el, iar barele, tastele, paleta și meniurile ajung toate la aceeași funcție (`executa` din
`src/app/App.tsx`). Un eveniment pe acțiune spune ce a făcut omul, fără să citească nimic din desenul lui.

## Decizia

1. **Ce se înregistrează: interacțiunile cu aplicația, nu desenul.** Un eveniment are doar câmpurile din contract
   (`shared/utilizare.ts`, o listă albă, verificată în client și din nou pe server: un câmp necunoscut e refuzat):
   - **acțiunea** (id-ul din registru, `document.roteste`, `export.gcode`…), **de unde** (bara, tasta, paleta, meniul de clic
     dreapta, panoul) și **rezultatul** (făcută, sau refuzată cu codul motivului: „motiv.nimic-ales”);
   - **ferestrele** (Proiectare, Mașina, Imprimanta, o extensie), **unealta aleasă**, **dialogurile** deschise și închise
     (cu „a renunțat” sau „a mers până la capăt”);
   - **calculele lungi** (exportul, traseul, importul, simularea): durata și mărimi rotunjite în trepte (câte forme, câte
     foi, mărimea fișierului: „sub 1 MB”), fără valori;
   - **mașina și imprimanta**: legată, lucrare pornită, pusă pe pauză, oprită, terminată, alarmă cu codul ei; fără G-code,
     fără adrese;
   - **sesiunea**: versiunea, instanța, limba, aranjamentul, tema, ecranul în trepte, familia browserului, offline / online,
     planul contului; un id de sesiune nou la fiecare încărcare;
   - **clicurile fine** (întrebarea 3, b; felia A.8c): fiecare clic pe orice control, după numele lui din cod (`data-testid`,
     `data-camp`, `id`…, cu cifrele scoase: „piesa-#”), plus zona din aranjament; derularea și zoom-ul, adunate pe gest (o
     derulare continuă e un eveniment). Un nume care nu e în catalogul generat la build din sursă nu pleacă (un nume făcut din
     textul omului n-are cum să fie acolo). De ~10 ori mai multe evenimente; se pot opri din Setări.
2. **Ce nu se înregistrează niciodată:** parolele și orice câmp al contului; textul scris (unealta Text, notele, raportările,
   care au drumul lor); geometria, conținutul documentului, numele fișierelor și ale proiectelor, G-code-ul; adresele
   mașinii și ale imprimantei, rețeaua WiFi; datele extensiilor; mișcarea mausului și tastele apăsate în afara registrului.
   O probă trece prin toate acțiunile registrului și cere ca evenimentul lor să aibă doar câmpurile contractului.
3. **Colectarea, pentru toți cei cu cont** (întrebarea 1, după nota owner-ului): pornită implicit pentru clienți, personal
   și instanța de test, fără întrebare la intrare și fără niciun rând sau buton în meniul contului; spusă doar în nota de
   confidențialitate (regulamentul). Evenimentele sunt legate de cont (uid-ul, ca jurnalul de erori), ca să le putem găsi la
   troubleshooting. Omul nu poate opri colectarea, dar poate cere **disocierea**, printr-un tichet: cine are dreptul o face
   din Utilizatori (felia A.11), iar loturile contului primesc un pseudonim aleator, la fel cele care vin după (serverul îl
   pune, nu clientul). Owner-ul o poate opri pentru toți din Setări (§8). Fără cont, nu pleacă nimic.
   - **De verificat juridic înaintea live-ului** (ca decizia 13 din `PLAN.md` §8.2): legate de un cont, evenimentele sunt date
     personale în sensul GDPR, chiar fără nume (pseudonime); temeiul (interesul legitim), dreptul de opoziție (art. 21) și
     regulile ePrivacy (Legea 506/2004) le judecă juristul. Pe live, colectarea pornește abia după ce nota de confidențialitate
     are operatorul și adresa de contact (ADR 0116 §18); comutatorul din Setări și disocierea sunt locul de unde se pornește
     dacă juristul cere altceva.
4. **Pașii dinaintea unei erori** (întrebarea 2, a): clientul ține în memorie ultimele 30 de evenimente (numărul, din
   Setări; 0 îi oprește), fără să le trimită singure. La o eroare, ele intră în raportul ei (ADR 0043), doar id-urile și
   rezultatele, pentru toți, ca jurnalul de erori, cu fraza în nota de confidențialitate. La o raportare, „Atașează pașii” e
   o bifă, ca proiectul.
5. **Unde stau și cât costă:** în Firestore, în aceeași bază, fără niciun serviciu din afară (Google Analytics ar trimite
   datele altcuiva, cu cookie-uri și cu CSP-ul lărgit, și n-ar cunoaște registrul):
   - clientul strânge evenimentele și le trimite **în loturi** (la 5 minute, la 200 de evenimente și la ascunderea paginii),
     prin callable-ul nou `utilizare`, cu App Check și plafoane pe cont, ca jurnalul de erori; offline, coada stă în
     IndexedDB (cel mult 2 000 de evenimente, cele mai vechi pleacă întâi) și pleacă la reconectare;
   - un lot e un document (`utilizare/{id}`), cu contul, sesiunea și evenimentele, șters singur după 90 de zile (TTL, ca
     `errorLogs`; zilele, din Setări, pentru loturile scrise de atunci); ștergerea unui cont (14.D↑, ADR 0116 §17) îi va
     șterge și loturile (după `uid`, pe indexul simplu);
   - **jobul de noapte** (`agregaUtilizarea`, cu marcajul lui de rulare, ADR 0041) adună loturile unei zile într-un document
     mic (`utilizareZi/{zi}`): de câte ori și câți oameni pe acțiune, de unde, refuzurile pe motiv, duratele pe trepte,
     secvențele cele mai dese, pâlnia; se păstrează 2 ani (întrebarea 4, a; din Setări). Adminul citește doar sumele zilelor, nu loturile;
   - socoteala, la 100 de oameni activi câte 4 ore pe zi: ~5 000 de scrieri pe zi, în cota gratuită a Firestore. Cu
     clicurile fine, loturile sunt mai pline, nu mai dese (plafonul de 200 de evenimente, apoi lotul pleacă mai devreme):
     ~10 000–15 000 de scrieri pe zi, tot în cotă.
6. **Fila Utilizare** (grupul Produs, după Sugestii; întrebarea 5, a), cu **„Utilizare: citește”** pentru sume și **„Utilizare: sesiuni”**
   pentru cronologia unui om (date despre o persoană, deci separată; întrebarea 5):
   - **perioada** (7, 30, 90 de zile; instanța) și **cifrele**: oameni activi, sesiuni, durata unei sesiuni, programe G-code
     exportate;
   - **uneltele**: acțiunile cele mai folosite (de câte ori, câți oameni), cu felul în care sunt pornite (bara, tasta,
     paleta): se vede și cine folosește scurtăturile;
   - **ce nu se folosește**: acțiunile registrului cu puțini oameni sau deloc în perioadă (catalogul acțiunilor e generat la
     build, cu etichetele lor, deci o acțiune nefolosită apare și ea);
   - **fluxurile**: secvențele de 3–4 acțiuni cele mai dese și drumul principal, ca pâlnie: deschiderea, desenul sau
     importul, rolul de tăiere, exportul, mașina, cu câți ajung la fiecare pas și unde se opresc;
   - **frecările**: acțiunile cele mai des refuzate, cu motivul (butoane apăsate când nu merg), și dialogurile închise fără
     rezultat;
   - **duratele**: exportul, traseul, importul (mediana și cele mai lente 5 %);
   - **cronologia unui om** (troubleshooting): din Utilizatori (contul ales, „Activitatea”), din Tichete (raportarea, cu
     sesiunea ei) și din Erori (eroarea, cu pașii dinaintea ei).
7. **Mărimea** (întrebarea 6, a): în pornire, doar înregistratorul (inelul de 30, coada, legătura cu `executa`), ~0,8 kB (cu
   ușa ~113,1 / 115); trimiterea vine la cerere, în bucata raportorului (aceeași conexiune). Fila Utilizare e o bucată a ei,
   adusă la deschidere, cu plafonul ei de 25 kB, în afara pachetului `/admin` de la intrare (127,5 / 200).
8. **Setările, din admin** (nota de la întrebarea 7): în fila Setări, secțiunea „Utilizarea aplicației”, doar a owner-ului,
   cu istoricul ei (ca celelalte setări, ADR 0260 §9), în `setari/utilizare`, scrisă prin callable-ul `utilizare` (pe
   versiunea văzută, cu auditul în tranzacție, ca răspunsurile rapide):
   - **colectarea**: pornită / oprită, pentru toți (oprită, serverul nu mai scrie nimic, iar clientul golește coada);
   - **clicurile fine**: pornite / oprite (A.8c);
   - **lotul**: la câte minute pleacă (1–60, implicit 5);
   - **păstrarea evenimentelor**: 7–365 de zile (implicit 90), pentru loturile scrise de la schimbare;
   - **păstrarea sumelor zilei**: 90–1 095 de zile (implicit 730; A.9);
   - **pașii dinaintea unei erori**: 0–100 (implicit 30; 0 îi oprește; A.11).

   Editorul nu citește Firestore: află setările din răspunsul fiecărui lot (și dintr-o cerere fără evenimente la începutul
   sesiunii, cât colectarea e oprită) și le ține în browser pentru sesiunea următoare.

## Feliile

| # | Felia |
| --- | --- |
| A.8a | Contractul evenimentelor (lista albă) și setările (`shared/utilizare.ts`), callable-ul `utilizare` (lotul, plafoanele pe cont, setările owner-ului cu auditul), colecția cu TTL, regulile, secțiunea „Utilizarea aplicației” din Setări, cu istoricul. |
| A.8b | Înregistratorul din client (registrul, ferestrele, unealta, sesiunea; inelul pașilor, coada), trimiterea în loturi, fraza din nota de confidențialitate. |
| A.8c | Dialogurile, clicurile fine (catalogul numelor din sursă), derularea și zoom-ul. |
| A.8d | Calculele lungi (durata, mărimile în trepte), mașina și imprimanta. |
| A.9a | Jobul de noapte și sumele zilei (`utilizareZi`), cu permisiunea „Utilizare: citește” și regula lor. |
| A.9b | Fila Utilizare: perioada, cifrele, uneltele, ce nu se folosește, frecările, duratele. |
| A.10 | Fluxurile: secvențele cele mai dese și pâlnia drumului principal. |
| A.11a | Pașii dinaintea unei erori: în raportul ei (clientul, serverul) și în fila Erori. |
| A.11b | Bifa „Atașează pașii” la o raportare, cu pașii în fila Tichete. |
| A.11c | Cronologia unui om, cu „Utilizare: sesiuni”, din Utilizatori („Activitatea”). |
| A.11d | Sesiunea raportării în Tichete: raportarea ține sesiunea de utilizare, iar fila o deschide în cronologie. |
| A.11e | Disocierea unui cont (din Utilizatori, la cererea omului printr-un tichet), cu pseudonimul pus de server. |

Estimarea: ~8 felii (A.8c s-a despărțit în A.8c și A.8d pe 23.11, A.9 în A.9a și A.9b pe 24.11, A.11 în A.11a–A.11e pe 24.11). A.7 (telefonul) vine după A.11 (întrebarea 7, a).

## Implementarea

- **A.8a** (23.11, `3.Ag` în fișa etapei 3): `shared/utilizare.ts` (lista albă: `evenimentDin`, `contextDin`, `lotDin`; setările:
  `setariUtilizareCerute`, `setariUtilizareDin`, `setariPublice`), callable-ul `utilizare` (`functions/src/utilizare/actiuni.ts`:
  acțiunile `lot` și `setari`), colecțiile `utilizare` (id-ul lotului: sesiunea și numărul) și `limiteUtilizare` (contorul pe cont
  și pe oră), fără regulă (le scrie doar serverul); TTL pe `expiraLa` al amândurora, iar `evenimente` și `context` neindexate;
  `setari/utilizare` citit doar de owner. În fila Setări, „Utilizarea aplicației” (`src/admin/setari/SetariUtilizarii.tsx`), cu
  istoricul din audit (`setari.utilizare`). Un lot nu e o acțiune a personalului: n-are rând de audit. Alegeri: colectarea oprită
  nu numără la plafon; o salvare a setărilor egală cu cele în vigoare (și implicitele, fără document) nu scrie nimic.
- **A.8b** (23.11, `3.Ah`): în pornire stau doar sursa gestului (`src/app/utilizare.ts`: `sursaDin`, ascultătorii din faza de
  captură, înaintea celor ai editării, care pot opri propagarea) și un tampon de cel mult 500 de evenimente; registrul spune
  fiecare rulare (`observaRularile` în `src/ui/actiuni.ts`), aplicația ferestrele și refuzurile din bară și din taste, editarea
  unealta. Înregistratorul (`src/app/utilizareLot.ts`) vine într-o bucată a lui, adusă imediat după pornire, în precache.
  Trimiterea (`src/app/utilizareTrimitere.ts`, `trimiteUtilizarea` din `PanouCont.tsx`, `trimiteLotul` din `contEditor.ts`)
  trece prin bucata contului. Pornirea: +0,7 kB (cu ușa 113,7 / 115). Trei abateri de la propunere:
  - **coada din browser e în `localStorage`** (`cncvs2.utilizare.loturi`, cu contul fiecărui lot), nu în IndexedDB: se scrie
    sincron, deci un lot închis la ascunderea paginii nu se pierde la închiderea filei; plafonul rămâne 2 000 de evenimente;
  - **trimiterea o pune editarea** (`seteazaTrimiterea`), pe drumul ei de azi spre bucata contului: un import din pornire
    scotea o bucată nouă, comună cu ea; până vine editarea, loturile așteaptă, ca fără rețea;
  - **dialogurile** (deschise, gata, renunțate) trec în A.8c, cu clicurile fine: amândouă se prind din pagină, nu din registru.

  Un lot gol întreabă setările cât colectarea e oprită (o dată, la pornirea pompei, după 5 s); serverul nu-l scrie. Un lot al
  altui cont, rămas în același browser, se scoate fără să plece; un cont fără drept golește coada; fără token, coada așteaptă.
- **A.8c** (23.11, `3.Ai`): ce se prinde din pagină stă în bucata înregistratorului (`src/app/utilizareDom.ts`), nu în pornire:
  - **clicul** pe un control, din faza de captură, cu numele lui (`src/app/numeControl.ts`): primul atribut de nume
    (`data-actiune`, `data-unealta`, `data-testid`, `data-buton`, `data-camp`… până la `id` și `aria-labelledby`) cu o valoare
    din catalogul scos din sursă, și zona gestului;
  - **rotița**: zoom pe pânză (și pe straturile ei, `.panza-cutie`), derulare în rest; treptele unui gest, fără o pauză mai
    lungă de 600 ms între ele, se numără într-un singur eveniment;
  - **dialogurile** (tot ce are `role="dialog"`, văzute cu un `MutationObserver`): deschis, apoi „gata” dacă între timp a
    reușit o acțiune a registrului sau s-a apăsat butonul principal (`.principal`, `type="submit"`), altfel „renunțat”.

  Catalogul (`scripts/catalog-controale.ts` scrie `src/app/catalogControale.ts`: 565 de nume, ~3 kB gzip) are doar valorile
  scrise de mână ale atributelor de nume, de pe controale și ferestre, fără `src/admin/`. **Un atribut de nume nou, scris de
  mână pe un control, cere `node scripts/catalog-controale.ts --scrie`** (altfel cade `test/unit/utilizare.catalog.test.ts`, din
  poarta rapidă). Clicurile, derularea și zoom-ul urmează comutatorul „clicuri” din Setări; dialogurile intră mereu. Trei abateri:
  - **fără „cifrele scoase”** (§1): o valoare calculată (`data-testid={…}`, un nume de foaie, de font) nu pleacă deloc, nici cu
    cifrele înlocuite; pleacă doar numele scrise în sursă;
  - **un clic pe un buton al registrului sau pe o unealtă nu pleacă**: acțiunea și unealta lui se înregistrează deja, cu sursa;
    două evenimente pe un clic ar fi rupt și numărarea repetărilor (clic, acțiune, clic, acțiune);
  - **calculele lungi, mașina și imprimanta trec în A.8d**: vin pe drumurile lor (workerul CAM, senderul, driverul imprimantei),
    nu din pagină.
- **A.8d** (23.11, `3.Aj`): trei feluri noi în lista albă, fiecare cu câmpurile lui și doar acolo unde au sens:
  - **`calcul`**: calculele bazinului CAM (`export`, `traseu`, `simulare`, `potrivire`, `timp`, `verificare`, `reparare`,
    `taiere`, `panouri`, `conversie`, `legare`) și citirea importului (`import`); durata în trepte (`TREPTE_MS`: marginea de
    sus, de la 0,1 s la peste 5 minute), cum s-a încheiat (`ok`, `eroare`, `anulat`), formele documentului la calculele CAM și
    octeții și formatul fișierului la import, tot în trepte (`TREPTE_MARIME`); niciun nume și nicio valoare exactă;
  - **`masina`**: legată (cu felul legăturii: serial, rețea, simulată), lucrarea pornită, pusă pe pauză, reluată, oprită de
    program, anulată de om, terminată, întreruptă, codurile controlerului (eroarea și alarma cu numărul lor, blocarea) și
    deconectată; fără G-code, adrese sau poziții;
  - **`imprimanta`**: legată, lucrarea pornită aici, evenimentele imprimării (ADR 0194 §A: finalul, oprirea, pauzele, lipsa
    filamentului, eroarea cu cheia ei, pana de curent, legătura pierdută, primul strat) și deconectată; fără fișiere, adrese
    sau temperaturi.

  Bazinul spune fiecare calcul unui observator (`src/jobs/observatorCalcul.ts`; bazinul nu importă interfața), pus din
  pornire; un ascultător care aruncă și un document stricat nu schimbă calculul. Mașina și imprimanta se citesc din stările
  lor la rând, pure (`src/app/utilizareMasina.ts`, prin indicatorul lucrării; `src/app/utilizareImprimanta.ts`, prin
  evenimentele notificărilor, toate, oricare ar fi setările lor). Valorile vin brute; înregistratorul face treptele, lasă
  deoparte un cod din afara marginilor și trece evenimentul prin lista albă, ca serverul. Două alegeri: o lucrare a
  imprimantei găsită în curs la legare nu e „pornită” (a pornit-o altcineva, altundeva), iar o legătură pierdută care revine
  nu e o legare nouă.
- **A.9a** (24.11, `3.Ak`): sumele unei zile sunt pure și comune jobului și filei (`shared/utilizareZi.ts`, `SumatorZi`), pe
  două segmente, clienții și personalul (din `personal` al lotului): acțiunile (de câte ori, cu repetările, câte reușite, de
  unde, motivele refuzurilor, câți oameni), uneltele, ferestrele, dialogurile (deschise, gata, renunțate), clicurile,
  derularea și zoom-ul, calculele (cum s-au încheiat, câte pe fiecare treaptă a duratei), mașina și imprimanta (cu codurile),
  sesiunile (câte, cu durata lor în zi în trepte, de la 1 minut la peste 8 ore). Jobul `agregaUtilizarea` (02:30, cu
  marcajul, `functions/src/utilizare/agregare.ts`) adună ieri și alaltăieri (o noapte căzută se acoperă la următoarea), după
  ora primirii lotului, în fusul României (zilele de 23 și 25 de ore incluse), pe pagini de 500, și scrie din nou întreg
  `utilizareZi/{zi}` (o rulare repetată dă aceleași sume), cu ștergerea singură după `zileSume` (TTL) și cu `segmente`
  neindexate. Regula: sumele le citește „Utilizare: citește” (permisiunea nouă din catalog), loturile tot nimeni. Două
  abateri:
  - **oamenii distincți se țin într-o schiță HyperLogLog**, nu ca listă de conturi: sumele se păstrează 2 ani fără cont
    (§5), iar oamenii unei perioade se unesc pe zile (maximul pe registru). Numărul e aproape exact pe numerele mici
    (numărarea liniară) și aproximativ pe cele mari: ~3 % pentru oamenii zilei (1 024 de registre), ~13 % pentru oamenii
    unei acțiuni (64), deci fila îl arată cu „≈”;
  - **„Utilizare: sesiuni”** (cronologia unui om) vine cu A.11, unde e folosită; aici, doar citirea sumelor.
- **A.9b** (24.11, `3.Al`): fila **Utilizare** din `/admin`, în grupul Produs (după Sugestii), cu „Utilizare: citește”.
  Citește doar sumele zilelor (`utilizareZi`, o singură cerere pe perioadă: `zi` în [prima zi, azi)), niciodată loturile:
  perioada (7, 30 sau 90 de zile, ziua de azi neîncheiată lăsată afară) și cine (clienții, personalul, toți). Arată cifrele
  (oamenii activi, aproximativ; sesiunile; programele G-code exportate, din calculele de export reușite; acțiunile
  refuzate), cele mai folosite acțiuni (de câte ori, câți oameni, cu partea pornită din taste și din paletă), ce nu se
  folosește (acțiunile registrului și uneltele, cei mai puțini oameni întâi, și cele pe care nu le-a folosit nimeni),
  frecările (refuzurile pe acțiune și motiv; dialogurile închise fără rezultat) și duratele calculelor (mediana și cele mai
  lente 5 %, ca trepte; erorile). Partea pură e `src/admin/utilizare/date.ts` (o zi fără formă se sare). Numele vin din
  **catalogul acțiunilor, generat la build** (`scripts/catalogActiuni.ts`, în `documentatie/actiuni.json`, adus ca restul
  documentației): acțiunile celor cinci registre și uneltele, cu numele scurt din manual în ambele limbi; o etichetă care nu
  e un text simplu oprește build-ul. Motivul unui refuz se arată în cuvinte când e o cheie a mesajelor de bază; ale
  editorului rămân chei (mesajele lui nu vin în `/admin`), ca și numele dialogurilor. Fila vine într-o bucată a ei, la
  deschidere, doar online (`FilaUtilizare`, plafonul ei de 25 kB în poarta mărimii, exact o bucată). Fără bibliotecă de
  grafice: barele sunt CSS. Fără reguli, permisiuni, indexuri sau funcții noi.
- **A.10** (24.11, `3.Am`): **fluxurile**, scrise de același job în sumele zilei (`fluxuri` din `shared/utilizareZi.ts`), pe
  fiecare segment:
  - **secvențele**: acțiunile reușite ale unei sesiuni, în ordinea timpului (și peste loturi), cu repetările la rând lipite;
    selecția și navigarea (`selectie.*`, `vedere.*`, afară de traseu, mașină, imprimantă și freze) nu sunt pași ai lucrului.
    Ferestrele de 3 și 4 acțiuni se numără de câte ori apar și în câte sesiuni (o buclă numără sesiunea o dată); pe zi se
    păstrează cele 150 din cele mai multe sesiuni, pe fiecare lungime (documentul zilei rămâne mic). Fila le arată pe cele
    din cele mai multe sesiuni ale perioadei, cu numele din catalog;
  - **pâlnia drumului principal**: deschiderea, desenul sau importul (`document.adauga-*`, `deseneaza`, `importa`, `text`),
    rolul (`document.rol`, `aplica-operatii`), exportul (calculul `export` reușit, nu butonul, care doar deschide
    fereastra), lucrarea pornită pe mașină. **Abaterea față de o pâlnie în ordine:** o sesiune ajunge până la pasul cel mai
    departe pe care l-a făcut, oricare ar fi ordinea, deci una care deschide un proiect salvat și exportă trece și de desen
    și de rol (făcute în altă zi); altfel, cine lucrează pe proiecte vechi ar părea oprit la deschidere. Pe pas: sesiunile și
    oamenii (schița, ca oamenii zilei). Fila arată pâlnia ca bare și, la fiecare pas, câte sesiuni se opresc acolo.

  Tot aici, cifra care lipsea din A.9b: **durata unei sesiuni** (mediana, ca treaptă). Barele filei stau pe o grilă comună
  (subgrid), ca lungimile să se poată compara între rânduri. Fără reguli, permisiuni, indexuri sau funcții noi (jobul își
  schimbă doar sumele; la unire se publică odată cu A.9a).
- **A.11a** (24.11, `3.An`): **pașii dinaintea unei erori**. Partea din pornire a raportorului (`raportorPornire.ts`) ia, în
  clipa în care eroarea intră în coadă, o copie a inelului înregistratorului (`pasiAcum` din `src/app/utilizare.ts`, pe care
  înregistratorul îl dă la `preiaUtilizarea`), nu la trimitere: ce face omul între eroare și trimitere nu intră. Bucata
  raportorului face din fiecare eveniment un pas (`pasDin`, `shared/pasiEroare.ts`): felul, id-ul (la derulare și zoom,
  zona), rezultatul (la mașină și imprimantă, codul) și cât înainte de eroare; fără pași, raportul n-are câmpul. Serverul
  (`logClientError`) îi verifică pas cu pas (`pasiDin`, `shared/pasiEroareVerificare.ts`, după contractul utilizării; ultimii
  100) și aruncă ce nu e un pas, nu raportul; îi scrie în `ultima` a grupului și în apariție. Fila Erori îi arată sub detaliu,
  cel mai vechi primul, cu numele acțiunilor și ale uneltelor din catalog și cu rezultatul doar când nu e „ok”. Verificarea
  stă în modulul ei, ca bucata raportorului să nu aducă tot contractul utilizării (18,5 / 25 kB la prima eroare). Fraza în
  nota de confidențialitate. Pornirea crește cu ~0,2 kB (copia inelului, captura).
- **A.11b** (24.11, `3.Ao`): **pașii atașați la o raportare**. Fereastra raportării (`Raportari.tsx`) ia pașii la deschidere
  (`pasiAcum`, apoi `pasDin`: ce spune bifa e ce pleacă) și îi trimite doar cu bifa **Atașează ultimii pași din aplicație**
  (nebifată implicit; fără pași, oprită), numărați în „Ce mai pleacă”. Callable-ul `tichete` îi verifică pas cu pas
  (`pasiDin`), ca la raportul unei erori, îi scrie în tichet (`pasi`, doar când sunt) și pune în audit doar câți. Fila Tichete
  îi arată în raportare, cu numele din catalog; lista pașilor e o componentă comună cu fila Erori (`src/admin/pasi/Pasi.tsx`).
  Manualul spune bifa, în ambele limbi.
- **A.11c** (24.11, `3.Ap`): **cronologia unui om**. Permisiunea nouă **„Utilizare: sesiuni”** (date despre o persoană, deci
  separată de sume). Regulile rămân închise pe `utilizare`: cronologia trece prin callable-ul `utilizare` (acțiunea
  `cronologie`), care cere permisiunea, aduce loturile contului cele mai noi întâi, câte `PAGINA_CRONOLOGIE` (20), cu clipa
  ultimului lot drept cursor (indexul compus `uid` + `primit`), trece evenimentele încă o dată prin lista albă (un lot scris
  altfel nu scapă ce nu e în ea) și scrie fiecare citire în audit (`utilizare.cronologie`, cine, al cui, câte loturi). În
  Utilizatori, contul ales are **Activitatea**, doar cu permisiunea: nimic nu se citește până la clic (citirea costă și se
  auditează), apoi sesiunile, cele mai noi întâi (`src/admin/utilizatori/activitate.ts`), fiecare deschisă la cerere, cu
  pașii ei (clipa față de pornirea paginii, numele din catalog, felul, rezultatul) și „Mai vechi”. Descrierea unui pas e
  comună Erori, Tichete și Activității (`DescrierePas`).

## Probele

- Lista albă: fiecare acțiune a registrului, rulată, dă un eveniment doar cu câmpurile contractului; un câmp în plus e
  refuzat și în client, și pe server (probe de emulatoare).
- Colectarea: cu un cont, lotul pleacă; fără cont, nicio cerere spre `utilizare` (proba numără cererile); oprită din Setări,
  serverul nu scrie nimic, iar clientul nu mai trimite evenimente și își golește coada.
- Setările: doar owner-ul le scrie, pe versiunea văzută, cu auditul; marginile fiecăreia refuzate pe server; istoricul lor în
  fila Setări.
- Regulile: din client nu se citește și nu se scrie nimic în `utilizare`; `utilizareZi` doar cu „Utilizare: citește”;
  cronologia unui om doar cu „Utilizare: sesiuni”.
- Jobul: sumele unei zile, pe hârtie, dintr-un set de loturi scris de probă (acțiunile, oamenii distincți, secvențele,
  pâlnia, duratele).
- Fila: cifrele, uneltele, ce nu se folosește și pâlnia, pe emulatoare, cu un rol cu și fără permisiuni.

## Se redeschide dacă

- juristul cere acordul dinainte sau oprirea colectării la cererea omului (atunci, comutatorul din Setări și disocierea sunt
  punctul de pornire);
- volumul trece de cota gratuită (atunci: loturi mai rare sau sume în timp real, pe bucăți);
- disocierea nu ajunge (de exemplu, omul cere să nu fie colectat deloc).

## Răspunsurile owner-ului (23.11.2026)

Formularul schiței, cu recomandarea prima la fiecare:

1. **Acordul clienților:** a ales „c”, cu nota care o înlocuiește: „Nu luam date personale prin acest sistem, doar colectam
   date de lucru pentru statistica. pentru troubleshooting doar se atribuie datele respective contului de user si el poate
   alege sa aleaga doar disocierea, dar nu si colectarea. dar, default este pornit totul. daca userul vrea disociere trebuie
   sa faca ticket. nu vreau sectiune sau buton dedicat in meniu contului. asta scrie doar in regulament” (§3).
2. **Pașii dinaintea unei erori:** a) ultimele 30 de evenimente în raportul erorii, pentru toți (§4).
3. **Cât de fin:** b) și fiecare clic pe orice control, derularea și zoom-ul (§1, A.8c).
4. **Cât se păstrează:** a) evenimentele 90 de zile, sumele pe zi 2 ani (§5, §8).
5. **Cine vede:** a) „Utilizare: citește” pentru sume, „Utilizare: sesiuni” pentru cronologia unui om (§6).
6. **Mărimea:** a) fila Utilizare, bucată separată, cu plafonul ei de 25 kB; pornirea, ~0,8 kB în plus (§7).
7. **Ordinea:** a) A.8–A.11 acum, apoi A.7, cu nota „toate astea vin cu mentiunea ca defapta vreau sa pot configura eu din
   admin cat mai multe setari” (§8).
