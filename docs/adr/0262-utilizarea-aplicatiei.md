# ADR 0262 — Utilizarea aplicației: interacțiunile oamenilor, fila Utilizare și pașii dinaintea unei erori

**Starea:** propus pe 23.11.2026, cu schița și formularul întrebărilor (pagina privată din raportul liniei); codul pornește
după răspunsuri. Cererea owner-ului, exactă: „in admin, vreau sa vad mai multe statistici/date despre comportamentul
utilizatorilor, vreau sa vad ce unelte folosesc cel mai des si care este cel mai comun workflow. vreau sa pot deduce care
parte a aplicatiei este cea mai utila si care nu, si vreau sa folosim asta si la troubleshooting. practic vreau sa stiu
fiecare interactiune pe care o are userul cu aplicatia, mai putin parolele lor sau date sensibile etc.” **Intră în:** linia
adminului (feliile A.8–A.11 de mai jos), adusă din etapa 28: `PLAN.md` §5.6 pune acolo fila Analiză („pâlnia, adopția din
id-urile acțiunilor, perioada aleasă”), iar §3.2 spune deja că analiza din admin e o vedere a registrului de acțiuni.
**Continuă:** ADR 0039 (jurnalul de erori, scris de server), 0043 (raportorul din client), 0116 (conturile, nota de
confidențialitate, §18), 0260 (adminul reproiectat). **Schimbă:** o colecție nouă (`utilizare`), un callable nou, un job de
noapte, două permisiuni noi, o întrebare nouă la intrarea în cont și fraza ei în nota de confidențialitate.

## Problema

Azi aflăm ce face un om în aplicație doar când ceva se strică: din jurnalul de erori (ADR 0039) și din raportările lui
(tichetele). Nu știm ce unelte se folosesc, pe ce drum ajung oamenii la G-code, unde se opresc, ce butoane apasă când nu
merg și ce parte a aplicației nu folosește nimeni. La o eroare, vedem stiva, dar nu și pașii dinaintea ei.

Aplicația are deja locul de unde se pot citi toate acestea: **registrul de acțiuni** (`src/ui/actiuni.ts`, `PLAN.md` §3.2),
singura ușă a interfeței spre domeniu. Vreo 105 acțiuni (desenul, transformările, rolurile, importul, exportul, vederea,
foile, extensiile) trec prin el, iar barele, tastele, paleta și meniurile ajung toate la aceeași funcție (`executa` din
`src/app/App.tsx`). Un eveniment pe acțiune spune ce a făcut omul, fără să citească nimic din desenul lui.

## Decizia propusă

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
     planul contului; un id de sesiune nou la fiecare încărcare.
2. **Ce nu se înregistrează niciodată:** parolele și orice câmp al contului; textul scris (unealta Text, notele, raportările,
   care au drumul lor); geometria, conținutul documentului, numele fișierelor și ale proiectelor, G-code-ul; adresele
   mașinii și ale imprimantei, rețeaua WiFi; datele extensiilor; mișcarea mausului și tastele apăsate în afara registrului.
   O probă trece prin toate acțiunile registrului și cere ca evenimentul lor să aibă doar câmpurile contractului.
3. **Acordul omului** (întrebarea 1): pentru clienți, o întrebare la prima intrare în cont („Ne ajuți să îmbunătățim
   aplicația? Trimitem ce unelte folosești, fără desenele tale”), cu înregistrarea oprită până la „Da” și schimbabilă oricând
   din meniul contului. Personalul și instanța de test: pornită, cu fraza ei în nota de confidențialitate. Fără cont, nu pleacă
   nimic. În UE, o analiză a utilizării cere de regulă acordul dinainte (de verificat juridic, ca decizia 13 din `PLAN.md`
   §8.2); pe live, abia după ce nota de confidențialitate are operatorul și adresa de contact (ADR 0116 §18).
4. **Pașii dinaintea unei erori** (întrebarea 2): clientul ține în memorie ultimele 30 de evenimente (fără să le trimită). La
   o eroare, ele intră în raportul ei (ADR 0043), doar id-urile și rezultatele, ca jurnalul de erori: fără acord, cu fraza în
   nota de confidențialitate. La o raportare, „Atașează pașii” e o bifă, ca proiectul.
5. **Unde stau și cât costă:** în Firestore, în aceeași bază, fără niciun serviciu din afară (Google Analytics ar trimite
   datele altcuiva, cu cookie-uri și cu CSP-ul lărgit, și n-ar cunoaște registrul):
   - clientul strânge evenimentele și le trimite **în loturi** (la 5 minute, la 200 de evenimente și la ascunderea paginii),
     prin callable-ul nou `utilizare`, cu App Check și plafoane pe cont, ca jurnalul de erori; offline, coada stă în
     IndexedDB (cel mult 2 000 de evenimente, cele mai vechi pleacă întâi) și pleacă la reconectare;
   - un lot e un document (`utilizare/{id}`), cu contul, sesiunea și evenimentele, șters singur după 90 de zile (TTL, ca
     `errorLogs`); ștergerea unui cont îi șterge și loturile (lista colecțiilor de la ștergere, ADR 0116);
   - **jobul de noapte** (`agregaUtilizarea`, cu marcajul lui de rulare, ADR 0041) adună loturile unei zile într-un document
     mic (`utilizareZi/{zi}`): de câte ori și câți oameni pe acțiune, de unde, refuzurile pe motiv, duratele pe trepte,
     secvențele cele mai dese, pâlnia; se păstrează 2 ani (întrebarea 4). Adminul citește doar sumele zilelor, nu loturile;
   - socoteala, la 100 de oameni activi câte 4 ore pe zi: ~5 000 de scrieri pe zi, în cota gratuită a Firestore.
6. **Fila Utilizare** (grupul Produs, după Sugestii), cu **„Utilizare: citește”** pentru sume și **„Utilizare: sesiuni”**
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
7. **Mărimea** (întrebarea 6): în pornire, doar înregistratorul (inelul de 30, coada, legătura cu `executa`), ~0,8 kB (cu
   ușa ~113,1 / 115); trimiterea vine la cerere, în bucata raportorului (aceeași conexiune). Fila Utilizare e o bucată a ei,
   adusă la deschidere, cu plafonul ei de 25 kB, în afara pachetului `/admin` de la intrare (127,5 / 200).

## Feliile

| # | Felia |
| --- | --- |
| A.8 | Contractul evenimentelor (lista albă), înregistratorul din client, acordul (întrebarea și meniul contului), loturile prin callable-ul `utilizare`, colecția cu TTL, regulile, ștergerea cu contul. |
| A.9 | Jobul de noapte (sumele zilei) și fila Utilizare: perioada, cifrele, uneltele, ce nu se folosește, frecările, duratele. |
| A.10 | Fluxurile: secvențele cele mai dese și pâlnia drumului principal. |
| A.11 | Troubleshooting: pașii dinaintea unei erori (în raportul ei, în Erori) și cronologia unui om (Utilizatori, Tichete). |

Estimarea: ~4–5 felii (A.8 cere cât două: clientul, serverul, regulile, acordul). A.7 (telefonul) rămâne a liniei, în
ordinea aleasă de owner (întrebarea 7).

## Probele

- Lista albă: fiecare acțiune a registrului, rulată, dă un eveniment doar cu câmpurile contractului; un câmp în plus e
  refuzat și în client, și pe server (probe de emulatoare).
- Acordul: fără „Da”, nicio cerere spre `utilizare` (proba numără cererile); cu „Da”, lotul pleacă; oprit din meniu, nu mai
  pleacă nimic, iar coada se golește.
- Regulile: din client nu se citește și nu se scrie nimic în `utilizare`; `utilizareZi` doar cu „Utilizare: citește”;
  cronologia unui om doar cu „Utilizare: sesiuni”.
- Jobul: sumele unei zile, pe hârtie, dintr-un set de loturi scris de probă (acțiunile, oamenii distincți, secvențele,
  pâlnia, duratele).
- Fila: cifrele, uneltele, ce nu se folosește și pâlnia, pe emulatoare, cu un rol cu și fără permisiuni.

## Se redeschide dacă

- juristul cere altceva decât acordul la intrare și fraza pentru pașii erorilor;
- volumul trece de cota gratuită (atunci: loturi mai rare sau sume în timp real, pe bucăți);
- owner-ul vrea și fiecare clic pe orice control (întrebarea 3, varianta b).

## Întrebările

Recomandarea e prima la fiecare.

1. **Acordul clienților:** a) întrebați la prima intrare în cont, oprit până la „Da”, schimbabil din meniul contului;
   personalul și instanța de test, pornit; b) pornit pentru toți, cu „Oprește” în meniul contului; c) doar personalul și
   instanța de test, clienții niciodată.
2. **Pașii dinaintea unei erori:** a) ultimele 30 de evenimente intră în raportul erorii, pentru toți, ca jurnalul de erori;
   b) doar la cei care au spus „Da”; c) deloc la erori, doar la raportări, cu bifa.
3. **Cât de fin:** a) acțiunile registrului, ferestrele, unealta, dialogurile, calculele lungi; b) în plus, fiecare clic pe
   orice control (după id-ul lui), derularea și zoom-ul (de ~10 ori mai multe evenimente); c) doar acțiunile registrului.
4. **Cât se păstrează:** a) evenimentele 90 de zile, sumele pe zi 2 ani; b) evenimentele 30 de zile; c) un an.
5. **Cine vede:** a) sumele cu „Utilizare: citește”, cronologia unui om cu „Utilizare: sesiuni”; b) o singură permisiune.
6. **Mărimea:** a) fila Utilizare, bucată separată, adusă la deschidere, cu plafonul ei de 25 kB; pornirea, ~0,8 kB în plus;
   b) în `/admin`, cu ținta liniei ridicată de la +25 la +45 kB.
7. **Ordinea:** a) A.8–A.11 acum, apoi A.7 (telefonul); b) întâi A.7, apoi A.8–A.11.
