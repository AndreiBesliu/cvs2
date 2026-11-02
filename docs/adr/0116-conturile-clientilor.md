# ADR 0116: Conturile clienților și raportările lor

**Starea:** acceptat pe 01.11.2026, din sugestia owner-ului acceptată pe 31.10 („Ne trebuie sistem de feedback sau raportare
erori de catre userii clienti. Si trebuie sa facem si partea de accounts.”) și din răspunsurile lui la întrebările propunerii
din aceeași zi: „1,b. 2, conturile din editia intai sunt ale noastre, nu aveam clienti, deci doar al meu este relevant. 3, b
sa fie default, dar, vreau sa pot seta asta din admin. 4, a. 5, a. 6, configurabil din admin. 7, a.” Restul vine din
`PLAN.md` (§5.4, etapele 14–15; §8.2, deciziile 7, 12, 13, 15 și 22), din `BRIEF.md` (§4, §7, §16.1) și din raportul de admin
al Fazei 2 (`docs/faza2/admin/RAPORT.md`, tranșele P2 și P2+). **Schimbă:** `BRIEF.md` §4, „Proba închisă” (conturile nu mai
sunt doar invitate: înregistrarea e liberă, iar atelierele primesc planul din admin). **Completează:** ADR 0040 și 0049
(conturile personalului), ADR 0043 (raportorul de erori), ADR 0107 și 0111 (sugestiile personalului). §A3 schimbat de ADR
0120: butonul Cont deschide meniul contului, iar panoul se deschide din el („Contul meu…”, „Intră sau creează cont…”).

**Problema.** Azi, doar personalul are cont (în `/admin`), iar editorul merge fără cont. Proba închisă din `BRIEF.md` §4
(1–2 ateliere prietene, doar 2D, fără plată) cere conturi de client. Adminul „ca și acum” (`BRIEF.md` §16.1) are fila
Utilizatori și fila Tichete. Owner-ul vrea și un canal prin care clienții raportează probleme și idei.

## Decizia

### A. Contul

1. **Un cont de client** = contul Firebase Auth (același proiect ca personalul) plus documentul `conturi/{uid}`, scris doar
   de server: e-mailul (din Auth), numele afișat, data creării și a ultimei logări, planul ținut (`proba`, cu sfârșitul ei;
   `gratuit`; `dezactivat`) și ultimul drept de acces calculat (§B). Colecția `users` a ediției întâi rămâne închisă și
   neatinsă (§8.2, decizia 22).
2. **Înregistrarea e liberă** (owner, „1,b”): oricine își face cont, cu Google sau cu e-mail și parolă. Proba de 14 zile,
   fără card (`BRIEF.md` §4), pornește la prima logare cu adresa verificată; un cont cu parolă și adresa neconfirmată vede
   „Confirmă adresa”, cu retrimiterea. Atelierele probei închise își fac cont la fel, iar owner-ul le dă planul gratuit din
   admin (§E). Invitațiile pentru clienți nu mai sunt necesare.
3. **Logarea:** Google și e-mail cu parolă, un singur cont pe adresă (ADR 0049). În aplicație, butonul „Cont” din bară
   deschide panoul contului: logarea (și crearea contului, și parola uitată), apoi numele, planul cu zilele rămase și ieșirea.
   Exportul și ștergerea datelor vin în 14.D↑ (§D).
4. **Conturile ediției întâi** (owner, „2”): sunt ale echipei, fără clienți, deci nu se aduce nimic. Contează doar contul
   owner-ului, care rămâne al lui, pe același uid, și în ediția a doua. Celelalte se pot șterge la comutarea pe live (decizia
   owner-ului, atunci).
5. **Personalul are și el cont de client**, pe același uid; permisiunile lui rămân în `staff/{uid}` (ADR 0049).

### B. Dreptul de acces

6. **Se calculează doar pe server** (`BRIEF.md` §4): planul dă capabilitățile, dintr-un singur catalog în cod (ca
   permisiunile personalului, în `shared/`). Serverul scrie dreptul în `conturi/{uid}` și îl întoarce aplicației. Fără
   „custom claims”, care se schimbă abia la următoarea logare.
7. **Planurile de acum:**
   - `proba`: 14 zile de la prima logare cu adresa verificată; toate capabilitățile de azi;
   - `gratuit`: dat de owner (atelierele probei închise), fără termen;
   - `expirat`: proba trecută; exportul G-code și senderul se opresc;
   - `dezactivat`: dat de owner; la fel.

   Personalul are toate capabilitățile, fără termen. Nivelurile plătite vin cu facturarea (etapa 27; §8.2, decizia 23).
8. **Offline (PWA):** aplicația ține ultimul drept primit, cu data lui. Fără reconfirmare, merge **7 zile** (owner, „3, b”),
   cât **se setează din admin** (fila Setări, §E). După aceea, până la o nouă confirmare, se poartă ca un drept expirat.
9. **Ce se oprește, prin convenție în aplicație** (`BRIEF.md` §4; se poate ocoli din client, cu bună știință): exportul
   G-code și senderul, pentru un cont logat fără capabilitatea lor. Cloud-ul și AI-ul se vor opri pe server, când vin. Fără
   cont, aplicația de pe test rămâne deschisă, ca azi (testele owner-ului).
10. **Poarta pe live** (§8.2, decizia 7: publicul vede „în curând” până la lansare) se reia la comutarea din 3.9: cu
    înregistrarea liberă, publicul și-ar putea face cont.

### C. Raportările (tichetele)

11. **„Raportează” în editor**, lângă „?”, pentru oricine e logat (client sau personal). Raportarea are:
    - felul: problemă, idee sau întrebare;
    - textul;
    - poza planșei, la cerere (ca la sugestia din editor, ADR 0111);
    - datele aplicației: versiunea, limba, browserul, planul;
    - amprentele erorilor din sesiune, din jurnalul local, fără conținutul lor.
12. **Proiectul se atașează doar cu bifa „Atașează proiectul”** (owner, „4, a”). Fișierul stă în Storage (cel mult 10 MB) și
    îl citesc doar autorul și personalul cu permisiunea.
13. **Fila Tichete din `/admin`:**
    - stările nou, deschis și rezolvat;
    - vârsta tichetului, roșie după 48 h fără răspuns;
    - răspunsul personalului;
    - două permisiuni noi în catalog, `tichete.citeste` și `tichete.raspunde`;
    - scrierile prin callable, cu audit, cel mult 10 raportări pe cont pe zi.
14. **Răspunsul ajunge în aplicație** (owner, „5, a”), în „Raportările mele”, cu un semn la un răspuns nou. Pe e-mail vine
    doar ca anunț, după ce domeniul are MX, SPF și DKIM (pasul owner-ului din `BRIEF.md` §7).
15. **Sugestiile personalului rămân cum sunt** (ADR 0107): ele sunt pentru planul owner-ului, tichetele sunt pentru sprijin.

### D. Datele personale

16. **Ce ținem:**
    - e-mailul, numele, metoda de logare, datele contului și planul;
    - tichetele, cu poza și proiectul atașat;
    - erorile, 90 de zile (§8.2, decizia 13).

    **Tichetele rezolvate se păstrează cât se setează din admin** (owner, „6”), implicit un an. Le șterge, cu atașamentele
    lor din Storage, un job zilnic cu marcaj de rulare (ADR 0041), nu TTL-ul: TTL-ul nu șterge fișierele din Storage și nu
    urmează o valoare schimbată din admin.
17. **Exportul și ștergerea datelor** le face omul, din panoul contului, iar owner-ul, din fila Utilizatori (14.D↑). Amândouă
    pornesc de la aceeași listă de colecții pe cont, iar o probă compară lista cu ce se scrie (raportul de admin). Cu
    ștergerea vine și registrul probei din ediția întâi (HMAC pe e-mail, `BRIEF.md` §4), ca o adresă ștearsă să nu primească
    o probă nouă.
18. **Nota de confidențialitate** e o pagină scurtă, în română și engleză, legată din panoul contului, la creare: ce ținem,
    de ce, cât timp, cum se șterge și cine răspunde de date. **Operatorul datelor și adresa de contact le dă owner-ul**
    (entitatea juridică nu există încă, `BRIEF.md` §7); până atunci, locurile lor rămân marcate, iar linkul aplicației nu se
    dă nimănui din afara echipei. Nota se verifică juridic înainte de lansare.

### E. Adminul (tranșa P2)

19. **Fila Utilizatori:**
    - lista, cu căutarea pe server după e-mail (14.D↑);
    - dosarul fiecărui cont: planul, ultima logare, tichetele, erorile (14.D↑);
    - planul gratuit, zilele de probă, dezactivarea și reactivarea (14.C↑b); exportul și ștergerea datelor (14.D↑);
    - două permisiuni noi, `conturi.citeste` și `conturi.administreaza`;
    - fiecare acțiune, cu audit.
20. **Fila Setări** (owner, „3” și „6”), doar a owner-ului, prin callable cu audit: zilele offline (implicit 7, între 1 și 60)
    și păstrarea tichetelor rezolvate (implicit 365 de zile, între 30 și 3 650). Locul setărilor e `setari/conturi`, citit de
    server; aplicația primește zilele offline odată cu dreptul.

### F. Ordinea feliilor (owner, „7, a”)

- **14.C↑:** contul în aplicație (§A, §B): butonul și panoul contului (doar online, în afara totalului), `conturi/{uid}`,
  proba de 14 zile, dreptul pe server, ținut offline, exportul și senderul oprite fără drept; nota, cu locurile operatorului
  marcate.
- **14.C↑b:** fila Utilizatori minimă (lista, planul, zilele de probă, dezactivarea) și fila Setări.
- **15.B↑:** raportările (§C), cu jobul zilnic.
- **14.D↑:** fila Utilizatori completă (căutarea, dosarul), exportul și ștergerea datelor, cu proba lor, și registrul probei.
- **Mai târziu:** anunțul pe e-mail, după DNS; plăcile de conturi din Puls; facturarea, în etapa 27.

## Felia 14.C↑ (01.11.2026): contul în aplicație

- **Ce s-a construit:** callable-ul `cont` (`functions/src/conturi/actiuni.ts`: deschiderea, cu contul nou și proba lui,
  dreptul calculat la fiecare deschidere, numele afișat; auditul în tranzacție), regula `conturi/{uid}` (fiecare își citește
  documentul), catalogul planurilor și judecata dreptului (`shared/conturi.ts`), contul ținut de aplicație
  (`src/app/dreptCont.ts`, în `localStorage`, cheia `cncvs2.cont`), butonul **Cont** din extensia barei (lângă „?”) și panoul
  contului (`src/app/PanouCont.tsx`, pe `body`, ca fereastra fonturilor).
- **Exportul și senderul:** registrele aplicației primesc capabilitățile din contul ținut (până acum, `() => true`); un
  buton oprit spune „Planul contului tău nu include funcția asta (vezi Cont, în bară)”. La sender se oprește doar pornirea
  programului (butonul Start): jog-ul, zero-ul și oprirea rămân, ca omul să poată muta mașina din drum.
- **Firebase Auth într-un singur modul,** `src/cloud/contEditor.ts`, împărțit cu `/admin` (`conexiune.ts` îi reexportă
  funcțiile de cont): codul contului stă într-o singură bucată, `contEditor`. Altfel, bundlerul punea `firebase/auth` într-o
  bucată comună, numită după fișierul pachetului (`index.esm`), pe care poarta o refuză. Un grup Rolldown cu nume ar fi tras
  în el și dependențele (aplicația Firebase), deci raportorul de erori ar fi adus contul la prima eroare (41 kB, plafon 25).
- **Reconfirmarea de la pornire** se cere prin modulul panoului (`reconfirmaContul`), adus doar cu `import()`: un `import()`
  direct pe `contEditor` (importat static și de panou, și de `/admin`) scotea runtime-ul bundlerului din pornire, într-un al
  doilea script, pe care poarta pornirii îl refuză.
- **Mărimile:** pornirea 97,6 → 98,4 kB (cu ușa 101,9 / 110), totalul 432,1 → 433,1 / 450, `/admin` 196,0 → 196,9 / 200
  (contul Firebase intră în închiderea lui). Contul are o categorie nouă în poartă, doar online, în afara totalului: 26,0 /
  32 kB (`PanouCont` și `contEditor`, exact două bucăți).
- **Probele:**
  - pe hârtie: `test/unit/conturi.test.ts` (setările, planurile, dreptul, judecata offline, numele) și
    `test/unit/dreptCont.test.ts` (contul ținut, capabilitățile din el);
  - pe emulator: `functions/test/conturi.emulator.test.ts` (8 probe ale callable-ului) și două probe noi în
    `functions/test/reguli.emulator.test.ts` (citirea doar a documentului propriu, nicio scriere din client);
  - e2e: `test/e2e/cont.spec.ts` (panoul fără Firebase, nota, exportul oprit de un drept expirat, lăsat de o probă) și
    `test/e2e-emulator/cont.emulator.spec.ts` (contul nou cu parolă, confirmarea, proba pe server, numele, planul schimbat
    pe server ajuns în aplicație la pornire, ieșirea);
  - trei mutații țintite, toate prinse: expiratul cu exportul păstrat, dreptul care nu expiră offline, registrul exportului
    fără contul ținut.
- **Până la 14.C↑b** (fila Utilizatori minimă și fila Setări), planul gratuit, zilele de probă și setările se puneau din
  consola Firebase, pe `conturi/{uid}` și `setari/conturi`.

## Felia 14.C↑b (01.11.2026): fila Utilizatori minimă și fila Setări

- **Ce s-a construit:**
  - callable-ul `administreazaConturile` (`functions/src/conturi/admin.ts`), cu auditul în tranzacție (`conturi.gratuit`,
    `conturi.proba`, `conturi.dezactiveaza`, `conturi.reactiveaza`, `setari.conturi`). Face două lucruri:
    - schimbă planul unui cont, cu `conturi.administreaza`: gratuit, o probă de 1–365 de zile de azi, dezactivarea,
      reactivarea;
    - schimbă setările conturilor, doar owner-ul;
  - fila **Utilizatori** (`src/admin/utilizatori/`): cele mai noi 100 de conturi, cu planul de acum, numele, crearea, ultima
    logare și „Schimbă planul”;
  - fila **Setări** (`src/admin/setari/`): zilele offline și păstrarea tichetelor rezolvate, cu marginile și implicitele
    lor.
- **Permisiunile:** două, noi în catalog:
  - `conturi.citeste` dă lista;
  - `conturi.administreaza` dă planul și, odată cu el, lista (planul se schimbă pe ce se vede).

  Setările nu sunt în catalog: le schimbă doar owner-ul, ca decizia pe sugestii.
- **Regulile:**
  - `conturi/{uid}` se citește și se listează cu oricare din cele două permisiuni;
  - `setari/conturi` o citește doar owner-ul;
  - nimic nu se scrie din client.
- **Planul văzut:** cererea trimite planul ținut și sfârșitul probei, cum le-a văzut fila. Serverul refuză o schimbare făcută
  pe un plan schimbat între timp (de alt om din personal). Dreptul se calculează din nou, ca la deschidere, și se scrie odată
  cu planul; aplicația îl primește la reconfirmarea următoare.
- **Dezactivarea și reactivarea:**
  - dezactivarea ține planul de dinainte (`planInainte`), iar reactivarea îl pune la loc; o probă trecută rămâne expirată;
  - gratuitul și o probă nouă scot și ele contul din dezactivare;
  - personalul rămâne personal, oricare ar fi planul ținut.
- **`/admin` pe Firestore Lite:** adminul face doar citiri o dată (`getDoc`, `getDocs`, numărătoarea): fără ascultători,
  fără scrieri, fără cache offline. Așa că trece pe `firebase/firestore/lite`, care merge prin REST, cu App Check.
  - `/admin` scade de la 200,5 kB (cu filele noi; plafonul e 200) la 102,8 kB.
  - Numărătoarea nerezolvatelor din Diagnoză devine `getCount`.
  - Un ascultător în timp real (de exemplu pentru tichete) ar cere înapoi Firestore-ul întreg: se cântărește atunci.
- **Pornirea neschimbată:** `shared/conturi.ts` e în pachetul de pornire, așa că tot ce importă adminul din el ajungea acolo,
  ca export pentru bucata adminului: +0,3 kB la prima măsurătoare. De aceea, partea serverului și a adminului (documentele,
  setările, planul ținut și cel efectiv, schimbările) stă acum în `shared/conturiPlan.ts`.
  - Pornirea rămâne 98,4 kB (cu ușa 101,9 / 110), totalul 433,1 / 450.
- **Probele:**
  - pe hârtie: `test/unit/conturiPlan.test.ts` (setările cerute, schimbarea cerută, planul după fiecare schimbare, planul
    văzut), `test/unit/admin.utilizatori.test.ts` (rândurile, planul arătat), filele vizibile și catalogul din reguli;
  - pe emulator: `functions/test/conturiAdmin.emulator.test.ts` (8 probe ale callable-ului) și patru probe ale regulilor
    (lista, permisiunea scoasă, setările, nicio scriere din client);
  - e2e pe emulatoare: `test/e2e-emulator/utilizatori.emulator.spec.ts` (owner-ul cu planurile și planul văzut vechi,
    setările, rolul care doar citește);
  - mutații țintite, toate prinse (raportul feliei, în `DEVLOG.md`).
- **Rămân pentru 14.D↑:** căutarea pe server după e-mail, dosarul contului, exportul și ștergerea datelor.

## Ce am respins

- **Invitațiile pentru clienți:** owner-ul a ales înregistrarea liberă, iar planul se dă din admin.
- **Dreptul de acces în „custom claims”:** s-ar schimba abia la următoarea logare, pe când documentul se vede imediat.
- **Tichetele în colecția sugestiilor:** au alt public (clienții, nu personalul) și altă viață (sprijin, nu planul).
- **Atașamentele în documentul tichetului:** în ediția întâi stăteau sub limita de 1 MiB a documentului.
- **Răspunsul doar pe e-mail:** domeniul n-are încă MX, SPF și DKIM, iar în ediția întâi un declanșator de e-mail a tăcut
  două zile fără ca cineva să afle.
- **TTL-ul pentru tichetele rezolvate:** nu șterge atașamentele din Storage și nu urmează păstrarea setată din admin.

## Limite

- Exportul blocat prin convenție se poate ocoli din client (`BRIEF.md` §4), cu bună știință.
- Până la registrul probei (14.D↑), o adresă nouă înseamnă o probă nouă.
- Fără nota completă (operatorul și contactul), aplicația nu se arată nimănui din afara echipei.

## Se redeschide dacă

- la comutarea pe live (3.9), owner-ul alege poarta: înregistrarea deschisă tuturor sau „în curând” pentru public;
- owner-ul vrea răspunsul pe e-mail înaintea celui din aplicație.
