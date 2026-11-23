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
| A.8b | Înregistratorul din client (registrul, ferestrele, unealta, dialogurile, sesiunea; inelul pașilor, coada), trimiterea în loturi, fraza din nota de confidențialitate. |
| A.8c | Clicurile fine (catalogul numelor din sursă), derularea și zoom-ul, calculele lungi, mașina și imprimanta. |
| A.9 | Jobul de noapte (sumele zilei) și fila Utilizare: perioada, cifrele, uneltele, ce nu se folosește, frecările, duratele. |
| A.10 | Fluxurile: secvențele cele mai dese și pâlnia drumului principal. |
| A.11 | Troubleshooting: pașii dinaintea unei erori (în raportul ei, în Erori), cronologia unui om (Utilizatori, Tichete) și disocierea unui cont. |

Estimarea: ~6 felii. A.7 (telefonul) vine după A.11 (întrebarea 7, a).

## Implementarea

- **A.8a** (23.11, `3.Ag` în fișa etapei 3): `shared/utilizare.ts` (lista albă: `evenimentDin`, `contextDin`, `lotDin`; setările:
  `setariUtilizareCerute`, `setariUtilizareDin`, `setariPublice`), callable-ul `utilizare` (`functions/src/utilizare/actiuni.ts`:
  acțiunile `lot` și `setari`), colecțiile `utilizare` (id-ul lotului: sesiunea și numărul) și `limiteUtilizare` (contorul pe cont
  și pe oră), fără regulă (le scrie doar serverul); TTL pe `expiraLa` al amândurora, iar `evenimente` și `context` neindexate;
  `setari/utilizare` citit doar de owner. În fila Setări, „Utilizarea aplicației” (`src/admin/setari/SetariUtilizarii.tsx`), cu
  istoricul din audit (`setari.utilizare`). Un lot nu e o acțiune a personalului: n-are rând de audit. Alegeri: colectarea oprită
  nu numără la plafon; o salvare a setărilor egală cu cele în vigoare (și implicitele, fără document) nu scrie nimic.

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
