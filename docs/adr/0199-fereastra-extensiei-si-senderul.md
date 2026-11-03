# ADR 0199: Fereastra extensiei și senderul prin `HostApi`

**Starea:** acceptat pe 03.11.2026 pentru felia 3.Xc, a liniei Trenuleț (worktree-ul `wip/trenulet`), după unirea lui 13.A↑
în ramură. Împlinește ADR 0128 §C. Continuă ADR 0127 (cadrul izolat, `HostApi`), 0132 (ferestrele aplicației, „o extensie își
adaugă fereastra”) și 0126 (primirea lucrărilor). Owner-ul:
- pe 02.11, „eu vreau ca softul plug-inului sa poata folosi senderul din cvs2”, apoi „Da, ca recomandat”: senderul doar prin
  `HostApi`. Extensia citește starea și încarcă programe (cu verificările lui „Fișier…”). Pornește și reia doar după
  confirmarea omului, într-o fereastră a lui cvs2. Pauza și oprirea merg direct. Conectarea, jog-ul, zero-ul, palparea,
  deblocarea, comenzile manuale și setările rămân în fereastra Mașina;
- pe 03.11, „Main + 3.Xc (senderul)”: `main` (cu 13.A↑) adus în ramură, apoi felia aceasta.

## Contextul

Până acum, o extensie deschisă lua locul pânzei (un „spațiu” în zona din mijloc), cât timp acțiunile documentului stăteau
oprite. 13.A↑ a făcut ferestrele aplicației (Proiectare, Mașina) o listă, cu file în meniul global. A lăsat loc pentru
fereastra unei extensii. Sesiunea senderului e a ferestrei Mașina (`PanouMasina.tsx`, ADR 0081), care se montează la prima
deschidere și rămâne montată. Planificatorul Trenuleț (ADR 0129) are „Trimite la cvs2”, care deschide cvs2 într-o filă
nouă. Din cadrul izolat, fila nu se poate deschide.

## Decizia

### A. Fereastra extensiei

- O extensie deschisă din meniul Extensii are fereastra ei. În meniul global apare o filă cu numele ei, după filele
  aranjamentului, apăsată cât e fereastra de acum, și **×** lângă ea. Dedesubt, extensia stă pe tot ecranul, ca fereastra
  Mașina: sub meniu, peste Proiectare, până la bara de jos.
- Trecerea la Proiectare sau la Mașina o ascunde. Cadrul rulează mai departe, cu tot ce are în pagină. **×**,
  `host.inchide()` sau scoaterea extensiei o închid: cadrul se oprește, fila pleacă, iar dacă fereastra extensiei era cea de
  acum, aplicația trece la Proiectare. O singură extensie e deschisă odată, ca până acum.
- Fereastra extensiei nu se ține în browser. La pornire nu e deschisă nicio extensie, deci aplicația pornește în fereastra
  ținută (Proiectare sau Mașina).
- Proiectarea acoperită urmează regulile din ADR 0132 §3, ca sub Mașina: e montată, inertă, fără tastele desenului. Bara de
  jos arată cipurile globale, iar o comandă a desenului aleasă din paletă întoarce întâi la Proiectare. Garda veche a
  spațiului, care oprea acțiunile documentului cât era deschis, a plecat. F1 deschide capitolul extensiilor.
- **Fila nu e în `aranjament.ferestre`.** Lista ține ferestrele aplicației și se verifică la încărcare. Fereastra unei
  extensii există doar cât e deschisă, așa că gazda extensiilor își pune fila într-un loc rezervat după filele listei
  (`#loc-fila-extensie`).

### B. Serviciul `masina` (permisiunea `masina`)

Permisiunea intră în catalog, cu textul arătat la instalare: „să folosească mașina: să încarce programe, să le pornească sau
să le reia după confirmarea ta, să pună pauză și să oprească lucrarea”. **Pe instanța live, serviciul e oprit,** ca primirea
(ADR 0126 §D). Pornește acolo după o placă tăiată așa pe test. Metodele (`host.masina.*`, peste `host.cere('masina.*')`):

- **`stare()`** și **`laStare(f)`:** legătura, faza senderului, indicatorul lucrării (felul, procentul, linia unei opriri,
  codul alarmei, din `src/machine/indicator.ts`) și programul încărcat (numele, amprenta, liniile). Nimic din poziție, jurnal,
  WCS sau setări. Starea vine la fiecare schimbare a ei, cât cadrul rulează. Fără fereastra Mașina deschisă vreodată, nu există
  sesiune: starea e „neconectată”.
- **`incarca(nume, date)`:** un program G-code, ca text sau octeți, cel mult 32 MB. Numele se curăță ca la descărcări, cu un
  tip din „Fișier…” (`.nc`, `.gcode`, `.ngc`, `.tap`, `.txt`). Se verifică exact ca un fișier adus cu „Fișier…”
  (`incarcaProgram`, sursa `fisier`, deci `M6` refuzat). Se refuză cât o lucrare e începută sau cât o confirmare așteaptă.
  Dacă fereastra Mașina n-a fost deschisă, se montează ascunsă și se așteaptă. Fereastra Mașina scrie lângă program „de la”
  extensie. Refuzul programului poartă codul și linia: `masina:program:<cod>[:<linia>]`.
- **`porneste()`** și **`reia()`:** întâi aceleași judecăți ca butonul (contul, legătura, programul, faza: `refuzStart` din
  flux, comun cu evenimentul `start`), apoi **o fereastră de confirmare a lui cvs2**, peste toată pagina, cu aplicația inertă
  (deci și cadrul). Fereastra spune:
  - ce extensie cere;
  - programul: numele, liniile, începutul amprentei;
  - la reluare, ce se reia;
  - prin WiFi, avertismentul căderii legăturii.

  „Pornește” sau „Reia” se poate apăsa abia după o secundă, focusul stă pe „Nu”, iar Escape e „Nu”. Confirmarea e legată de
  ce a văzut omul: dacă între timp s-a încărcat alt program sau reluarea s-a schimbat (din pauză în eroare), se refuză
  (`masina:schimbat`). O singură confirmare așteaptă odată (`masina:ocupat`). Una cerută de o extensie care se oprește se
  închide ca „Nu”. **Reluarea:**
  - din Hold, e eliberarea;
  - după o eroare, e reluarea de la prima linie netrimisă;
  - o barieră (M0, M1, M6) se continuă din fereastra Mașina, după pasul făcut la mașină (`masina:bariera`);
  - alarma cere deblocarea, tot acolo (`masina:alarma`).
- **`pauza()`** (doar cât rulează) și **`opreste()`** (repornirea controlerului, cât e conectat): direct, ca în indicator și
  în fereastră.
- **`trimite(lucrare)`:** o lucrare în forma protocolului „cvs2-lucrare” v1, cu aceleași limite și verificări (ADR 0126),
  în dialogul „Lucrare primită”. Originea e „extensia instalată «nume»”, după manifest, nu după ce scrie lucrarea. După
  „Primește”, fișierele stau în „Lucrarea primită” din fereastra Mașina, care se deschide. Răspunsul e mesajul `primit`
  (sau „renuntat”). O lucrare fără forma protocolului se refuză fără dialog (`masina:lucrare`).
- **Refuzurile:** `masina:permisiune`, `:live`, `:necunoscut`, `:fara-capabilitate`, `:neconectat`, `:fara-program`,
  `:faza`, `:in-lucru`, `:nume`, `:date`, `:prea-mare`, `:program:…`, `:renuntat`, `:schimbat`, `:ocupat`, `:alarma`,
  `:bariera`, `:nimic`, `:lucrare`, `:indisponibila`.

### C. Încărcătorul

Primește învelișurile `host.masina` (cu `laStare`, care dă imediat ultima stare cunoscută) și `host.descarcari.salveaza`
(promis în ADR 0129). Cvs2 trimite starea prin port (`{ tip: 'masina', stare }`), doar când se schimbă ce vede extensia.
Textul încărcătorului s-a schimbat, deci și amprenta lui din CSP (`shared/cadruExtensie.ts`, `firebase.json`), pe mecanismul
aprobat în ADR 0127. Politica CSP rămâne aceeași.

### D. Planificatorul: „Trimite la cvs2” din extensie

Intrarea planificatorului (`extensii/trenulet/intrare.ts`) îi dă paginii un `window.open` care, pentru `#primeste-lucrare`,
întoarce o fereastră imitată: un `MessagePort` (singura sursă pe care o primește un `MessageEvent` făcut în pagină), cu
`postMessage` și `closed` proprii. La „cauta” răspunde „gata”. Lucrarea pleacă prin `masina.trimite`, iar „primit” vine
înapoi ca mesaj de la fereastra imitată, de la originea adresei. Pagina v18 rămâne neschimbată. Fereastra imitată se pune doar
dacă `masina.stare` răspunde (permisiunea, în afara live). Altfel, pagina spune, ca până acum, că fila nu s-a putut deschide.
Manifestul cere `masina`, iar pachetul trece la 18.1.0.

### E. Unde stă senderul

Sesiunea rămâne a ferestrei Mașina. Cât e montată, fereastra pune un înveliș pentru extensii (`masinaPentruExtensii`, un
semnal din `src/app/lucrare.ts`: în pornire stă doar semnalul). Învelișul citește sesiunea și numele programului de acum și
ține confirmarea în starea ferestrei. Gazda extensiilor (`src/extensii/masina.ts`, `cadru.ts`) judecă argumentele, apoi cere
prin înveliș. Partea pură (starea pentru extensie, pornirea, reluarea, pauza) e în `src/app/masinaExtensii.ts`.

## Ce am respins

- **Extensia în `aranjament.ferestre`, cu o acțiune „vedere.extensie” în registru:** paleta ar fi avut mereu o comandă
  pentru o fereastră care de cele mai multe ori nu există, iar verificarea aranjamentului ar fi cerut-o.
- **Pornirea fără confirmare, după o permisiune dată la instalare:** permisiunea spune ce poate cere extensia. Gestul care
  mișcă mașina rămâne al omului, pe ecranul lui cvs2, de fiecare dată (decizia din 02.11).
- **Continuarea după o barieră din extensie:** la M6 sau M0 omul face un pas la mașină (freza, zero-ul). Butonul rămâne
  lângă mașină, în fereastra Mașina.
- **Sesiunea mutată într-un modul comun cu gazda extensiilor:** senderul ar fi venit odată cu bucata extensiilor, iar o a
  doua cale spre sesiune ar fi ocolit fereastra Mașina (numele programului, refuzurile, confirmarea).
- **Starea prin cereri repetate (`masina.stare` la fiecare jumătate de secundă):** încărcătorul se schimba oricum (ADR
  0129). Starea trimisă la schimbare e mai puțină și mai proaspătă.
- **Sursele planificatorului schimbate pentru „Trimite la cvs2”:** fereastra imitată păstrează proba „octet cu octet v18”.
  Schimbarea surselor vine în 3.Tb.

## Limite

- Pe live, extensiile nu folosesc mașina până la o placă tăiată așa pe test.
- Confirmarea întârziată o secundă nu oprește un om grăbit. Oprește doar un clic pornit spre extensie, care ar fi căzut pe
  butonul apărut sub mouse.
- Extensia nu știe dacă omul a închis fereastra Mașina între timp: pentru ea, starea e cea a sesiunii, care rămâne a
  paginii.
- F1 cu focusul în cadru ajunge la extensie (cvs2 nu-l vede). Din afara cadrului deschide capitolul extensiilor.
- Planificatorul nu are încă butoane pentru pornire, pauză sau oprire. „Trimite la cvs2” duce lucrarea în „Lucrarea
  primită”, iar pornirea rămâne în fereastra Mașina. Butoanele planificatorului vin cu sursele lui schimbate (3.Tb).

## Probele

- unitare:
  - starea pentru extensie, pornirea (aceeași judecată ca fluxul), reluarea, pauza (`masina.extensii.test.ts`);
  - serviciul cu un înveliș imitat: permisiunea, live, argumentele, plafonul, așteptarea ferestrei, refuzurile
    (`extensii.masina.test.ts`);
  - fereastra imitată a planificatorului (`trenulet.adaptoare.test.ts`);
  - amprenta încărcătorului (`csp.extensii.test.ts`);
  - ușa F1 și controalele noi, numite în manual (`manual.test.ts`);
- e2e:
  - cu extensia de probă `extensii/proba-masina`: fereastra și fila, starea, încărcarea, confirmarea (întârzierea, focusul,
    Escape, refuzul unui alt program, extensia care se închide), pauza, reluarea, oprirea, lucrarea trimisă, live
    (`extensii.masina.spec.ts`);
  - planificatorul adevărat: „Trimite la cvs2”, cu ovalul de exemplu, până la „Lucrarea primită” (`trenulet.spec.ts`);
  - fereastra extensiei peste Proiectare (`extensii.spec.ts`);
- otrăvurile țintite: `test/otravuri/3.Xc.py`.
