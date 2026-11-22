# ADR 0211 — Urechile la locuri alese (etapa 11, varianta c din ADR 0210)

**Starea:** acceptat pe 19.11.2026, cu toate recomandările (1a–7a: „Da, toate recomandările”, la „Pornesc 11.3↑d cu toate
recomandările?”); varianta a, implementată în felia 11.3↑d (21.11), varianta b, în lucru în felia 11.3↑e (22.11; vezi la capăt). Propus în aceeași zi, în linia planșelor
(worktree-ul `plansele`, ramura `wip/11.1-plansele`, din `main` `4b7539a`), la „Da, ADR și schița” (owner-ul, după 11.3↑c).
**Completează:** ADR 0028 (urechile: profilul Z(s), centrele la distanțe egale), ADR 0027 §4 (pornirea în vârful 0) și
ADR 0210 (feliile 11.7↑, 11.3↑b și 11.3↑c: urechile nu țin sub 2 × freza, distanța propusă, proba la export).
**Schița:** <https://claude.ai/artifact/XiHkAQJ5nJjxNVyGQzVG27> (variantele desenate, un mod al pânzei de încercat și formularul celor șapte întrebări; răspunsurile
stau în baza paginii, colecția `raspunsuri`).

## Problema

- Urechile stau acum la distanțe egale pe fiecare buclă, socotite de la vârful ei 0 (ADR 0028 §3: centrele la
  (k + ½)·P / n). Pe un dreptunghi cu două urechi, ies una sus și una jos.
- Omul nu le poate pune unde ține lemnul, adică spre marginea foii sau spre o fâșie lată, departe de vecini. Pe placa 11,
  la 5 mm, tăieturile vecine se unesc, iar urechile de sus și de jos ale rândurilor din mijloc nu mai țin de nimic: cad 9 +
  4 plăcuțe. 11.3↑b propune distanța la care țin, 11.3↑c o spune la export, dar o așezare strânsă rămâne fără soluție.
- Nici nu poate ocoli o latură unde urechea strică piesa: fața văzută, un arc fin, un colț.

## Ce am aflat (cercetarea din 19.11)

- **Referința funcțională (ArtCAM / Aspire):** urechile se pun pe operație („câte” sau „la ce distanță”), apoi se editează
  pe vector: un clic pe contur adaugă una, un clic pe ea o scoate, trasă se mută. Urechile stau pe vector, nu pe program.
  Urechile 3D (triunghiulare) de acolo nu intră aici.
- **Codul de acum:** `Operatie.urechi = { numar, latime, grosime }` (v5), pe operație. `geometrieUrechi`
  (`src/cam/urechi.ts`) pune centrele la (k + ½)·S, cu flancul ℓ = min(W / 2; 0,45·(S − W)), și refuză W > 0,9·S.
  Pornirea e în vârful 0 (ADR 0027 §4), la adâncime plină.
- **Proba de la 11.3↑c** (rasterul fundului foii, umplut din margine) știe deja, pe programul real, unde e lemn legat de
  foaie. Cu ea se pot alege și locurile „unde ține”.
- **Plăcuțele** sunt instanțe ale aceleiași piese: ce se ține pe piesă trece pe toate copiile, cu rotirea lor. Dar într-o
  rețea strânsă, copiile din colț și cele din mijloc au vecini diferiți, deci un loc ținut pe piesă nu e bun pentru toate.
  Locurile alese de om se țin pe piesă, iar cele „unde ține” se calculează pe instanță, la export.

## Decizia propusă (variantele pot sta împreună, pe felii; recomandarea întâi)

- **a) Alese cu mausul (recomandarea, prima felie).** În fereastra exportului, la „Urechi”, rândul operației primește
  „Locurile: la distanțe egale / alese pe desen”. „Alege pe desen…” pune pânza în modul urechilor operației:
  - un clic pe contur pune o ureche, pe cel mai apropiat punct al conturului;
  - un clic pe o ureche o scoate;
  - trasă, urechea se mută pe contur;
  - „Gata” se întoarce în fereastră, iar „Renunță” lasă locurile cum erau.

  Numărul devine câte ai pus pe fiecare contur. Urechile se văd pe contur ca semne mici, în modul lor și cu „Arată
  traseul”.
- **b) Automat, unde ține.** „Locurile: unde ține”: la export, pe fiecare instanță, aplicația caută pe buclă locurile cu
  lemn legat de foaie dincolo de tăietură (proba de la 11.3↑c). Pune câte cere numărul, cât mai departe una de alta. Dacă
  nu găsește destule, le pune pe cele găsite; o piesă fără niciun loc rămâne în avertismentul de desprindere. Lângă
  avertisment apare și un buton, „Pune urechile unde țin”, care trece pe „unde ține” operațiile pieselor desprinse.
- **c) Reguli simple.** „Locurile: pe laturile lungi / pe laturile scurte / la mijlocul fiecărei laturi”. Sunt pentru
  plăcuțe și dreptunghiuri, previzibile și fără pânză. Pe o formă fără laturi drepte, urechile rămân la distanțe egale.

## Documentul (v26, prima versiune liberă la unire)

`Operatie.urechi` primește două câmpuri opționale:
- `mod`: `'egale'`, `'alese'`, `'lemn'`, `'lungi'`, `'scurte'` sau `'mijloc'`. Lipsa lui înseamnă `'egale'`, ca până acum.
- `locuri`: doar cu `mod: 'alese'`. Pe fiecare element al operației (id-ul lui în piesă), punctele alese, în coordonatele
  piesei, cel mult 100 pe element (`PLAFON.urechi`).

Un document fără `mod` (toate cele de azi) dă **același program, octet cu octet**: plăcile 1, 2 și 11 își păstrează
amprentele. Migrarea v25 → v26 nu schimbă nimic, fiindcă ambele câmpuri sunt opționale. Ușa primește doar puncte finite, în
plafonul foii, pe elemente ale operației. «Desprinde» și «Încă…» iau locurile cu piesa.

## CAM-ul

- **Proiecția:** fiecare punct ales trece pe cel mai apropiat punct al buclei (drumul centrului frezei, după offset).
  Centrele urechilor urmează apoi ordinea drumului.
- **Flancurile:** ℓ_k = min(W / 2; 0,45·(g_k − W)), unde g_k e golul cel mai mic dintre urechea k și vecinele ei pe buclă.
  La distanțe egale, asta e chiar formula de azi.
- **Refuzurile, cu locul spus:** două urechi prea apropiate (g < W / 0,9); o ureche pe o buclă mai scurtă decât ea.
- **Pornirea:** cu locuri alese sau calculate, bucla pornește din mijlocul celui mai lung gol dintre urechi, ca plonjarea să
  nu cadă pe o ureche. E o abatere de la ADR 0027 §4, doar pentru modurile noi; „egale” rămâne în vârful 0.
- **Unde ține (b):** părțile și rasterul de la 11.3↑c, plus candidatele pe buclă, la pasul celulei. Un loc e bun când
  palierul urechii, dus spre exterior cât freza, atinge lemn legat de marginea foii.

## Feliile propuse

- **11.3↑d** (a): v26, modul pânzei, semnele pe contur, CAM-ul cu locuri alese și pornirea, rândul ferestrei exportului.
  Estimat: ~+4 kB, la cerere, și ~+0,3 kB la pornire (semnele pe pânză).
- **11.3↑e** (b): „unde ține”, la export și din avertisment.
- **11.3↑f** (c): regulile simple.

## Proba (scrisă întâi)

- **Pe hârtie:** un dreptunghi 80 × 30 tăiat cu Ø3,175, cu urechile alese în (0, 15) și (80, 15), pe laturile scurte.
  Centrele pe drum ies în (−1,5875; 15) și (81,5875; 15), cu palierul de 6 mm pe verticală, iar pornirea e în mijlocul
  golului lung.
- **Octet cu octet:** programul fără `mod` nu se schimbă (fișierele de aur ale plăcilor 1, 2 și 11).
- **Placa 11 la 5 mm:** cu „unde ține” cad doar plăcuțele fără nicio latură spre lemn, cele înconjurate de vecine.
  Cifrele, pe hârtie, la începutul feliei 11.3↑e, iar proba de la 11.3↑c le numără. **Pe hârtie (22.11):** rândurile la
  y = 180 / 145 / 110 / 75 / 40, coloanele la x = 10 / 95 / 180; pe foaia 1 (cinci rânduri pline) cad mijloacele rândurilor
  2–4 (numele 5, 8, 11), pe foaia 2 (trei rânduri pline și una la x = 10, y = 75) doar mijlocul rândului 2 (numele 20): sub
  mijlocul rândului 3 e lemn. Cu urechile la distanțe egale cădeau 9 + 4.
- **E2e:** modul pânzei (clicul pune, clicul scoate, tras mută, „Gata” și „Renunță”), semnele și exportul.

## Ce am respins

- **Locurile ca fracțiune din lungimea conturului:** s-ar muta la orice nod nou sau la o schimbare a vârfului 0.
- **Locurile alese ținute pe instanță:** plăcuțele n-ar mai fi o singură piesă, iar «Încă…» n-ar ști ce să copieze.
- **Strângerea tăcută a urechilor prea apropiate:** ADR 0028 cere ca nimic să nu se micșoreze pe ascuns.
- **Urechile 3D (triunghiulare):** în afara scopului; o felie a lor, dacă le cere cineva.

## Întrebările (recomandarea întâi)

1. **Ce vine întâi?** a) alese cu mausul, apoi „unde ține”, apoi regulile; b) „unde ține” întâi; c) regulile întâi.
2. **Unde se țin locurile alese?** a) pe piesă, în coordonatele ei: toate copiile le au, cu rotirea lor; b) pe fiecare
   instanță.
3. **Cum le alegi pe desen?** a) un mod al pânzei, deschis din rândul exportului („Alege pe desen…”, cu „Gata” și
   „Renunță”), ca editarea urechilor din ArtCAM; b) o previzualizare mică a piesei, în fereastra exportului; c) o unealtă
   nouă în bara de unelte.
4. **Unde se văd urechile?** a) pe pânză, pe contur, ca semne mici, în modul lor și cu „Arată traseul”; b) doar în modul
   lor.
5. **Plonjarea, când o ureche aleasă cade pe pornire?** a) bucla pornește din mijlocul celui mai lung gol dintre urechi
   (programele fără locuri alese rămân la fel); b) refuz, cu motivul.
6. **Două urechi alese prea aproape?** a) refuz la export, cu motivul și locul, iar modul pânzei nu le lasă să se apropie;
   b) se unesc într-una.
7. **„Unde ține” (b):** a) se calculează la fiecare export, pe vecinii de acum; b) se scrie o dată în document, ca locuri
   alese.

## Răspunsurile owner-ului (19.11)

„Da, toate recomandările”: 1a (alese cu mausul întâi, apoi „unde ține”, apoi regulile), 2a (pe piesă), 3a (un mod al
pânzei, deschis din rândul exportului), 4a (semnele pe contur, în modul lor și cu „Arată traseul”), 5a (pornirea în
mijlocul celui mai lung gol), 6a (refuz la export, iar modul pânzei nu le lasă să se apropie), 7a („unde ține”, la fiecare
export).

**Precizarea de la implementare (19.11):** punctele alese se țin în coordonatele **elementului** (ale formei lui, înaintea
matricei lui), nu ale rădăcinii piesei. Tot pe piesă sunt (2a): toate copiile le au, cu rotirea lor. Diferența: dacă forma
se mută în piesă, urechile ei se mută odată cu ea, în loc să rămână în urmă și să cadă pe alt punct al conturului.

## Implementarea feliei 11.3↑d (a, alese cu mausul; 19–21.11)

- **Documentul v26** (`src/model/document.ts`, `migrari.ts`, `schemaDocument.ts`): `urechi.mod` și `urechi.locuri`, ca mai sus.
  Ușa judecă locurile pe documentul brut (`problemaUrechi`, ca literele plăcuțelor), cu calea câmpului în motiv: doar cu
  „alese”, pe elemente ale operației, cel mult 100 pe element, x și y finite. **Precizare:** „în plafonul foii” înseamnă
  ±`PLAFON.translatie` (10⁷ mm), ca vârfurile căilor. Cheile rămân date (un element „__proto__” își păstrează locurile).
  Oracolul documentului la v26 (`CAMPURI_NOI_O[26]`, `document.v26.oracol.test.ts`) și corpusul de aur la v26 (urechile
  capacului, la trei locuri alese).
- **Locurile urmează nodurile** (`src/model/urechiLocuri.ts`, `cuNoduri`): gruparea (cu redenumirile), degruparea, piesa coaptă
  a plăcuței («Desprinde»), repararea, tăierea și rolurile trec pe aici, deci o cheie nu rămâne pe un element plecat (ușa ar
  refuza documentul la redeschidere). **Precizare:** un rol salvat (ADR 0114) nu ia locurile alese, care sunt ale unei piese:
  „alese” devine implicitul, iar o piesă cu urechi alese își recunoaște rolul. Schimbarea rolului ia urechile primei
  operații (ADR 0112 §4), cu locurile doar pe elementele fiecărei operații noi.
- **Lucrarea** (`src/cam/urechi.ts`, `job.ts`): proiecția, flancurile și refuzurile, ca la „CAM-ul”; pornirea (5a); cu intrări,
  p₀ se alege în afara zonelor urechilor, iar coloanele punților stau pe loc; direcția inversă oglindește urechile; un
  element fără niciun loc ales n-are urechi. Modurile „lemn” și regulile se refuză la export până la feliile lor. Programele
  fără mod rămân octet cu octet (plăcile de aur 1, 2 și 11).
- **Fereastra exportului**: sub urechile rândului, „Locurile: la distanțe egale / alese pe desen”; cu „alese”, „Câte, pe
  buclă” se oprește, iar „Alege pe desen…” pune pânza în modul urechilor. **Precizare:** fereastra stă ascunsă (nu închisă), cu
  tot ce era scris în ea, iar acțiunile documentului rămân oprite; „Gata” (Enter) scrie locurile într-un pas, prin aceeași ușă
  ca Exportă (`document.aplica-operatii`), „Renunță” (Escape) le lasă cum erau. La Exportă, „la distanțe egale” scoate modul
  și locurile; numărul arătat al urechilor alese nu intră în document.
- **Modul pânzei** (`src/app/ModUrechi.tsx`, la cerere; partea pură în `urechiAleseCalcul.ts`): conturul operației pe fiecare
  copie de pe foaie, semnele urechilor, clicul, tragerea, banda. **Precizare:** distanța dintre urechi se măsoară aici pe
  conturul desenat (în lume), nu pe drumul frezei; lucrarea o judecă din nou pe drum, la export, cu locul.
- **Semnele cu „Arată traseul”** (4a), panoul („alese pe desen: N × W mm”) și raportul foilor (câte sunt alese).
- **Probele:** oracolul documentului la v26 și corpusul de aur; `urechiLocuri.test.ts` (a doua plasă: gruparea, degruparea,
  plăcuța, rolurile, tăierea, raportul, toate prin ușă); `urechi.alese.test.ts` (exemplul de pe hârtie: palierele la
  x = −1,5875 și 81,5875, de la y = 12 la 18, pornirea la mijlocul laturilor lungi; rampa, intrările, direcția inversă,
  refuzurile); `urechiAleseCalcul.test.ts`, `urechi.dialog.test.ts`; e2e `urechi-alese.spec.ts` (pe trei plăcuțe la 9 mm,
  urechile mutate pe laturile scurte țin: exportul nu mai are piese desprinse). Otrăvurile `test/otravuri/11.3d.py`: 46 / 48 la capăt (43 unitare, 3 prin e2e): C15, C16 și C17 scăpaseră la prima rulare și au primit probe țintite; M07 și M08 (la tăiere) sunt echivalente, fiindcă bucata tăiată își păstrează id-ul formei din care vine.

## Implementarea feliei 11.3↑e (b, unde ține; 22.11)

- **Documentul rămâne v26:** modul „lemn” era deja în ușă; nicio migrare. Fereastra exportului îl scrie ca pe celelalte
  („Locurile: … / unde ține”); înapoi la distanțe egale, modul pleacă, iar locurile alese pleacă la orice alt mod.
- **Două treceri** (`src/jobs/calculCam.ts`, `programFoii`): întâi programul cu operațiile „unde ține” tăiate fără urechi,
  apoi fundul foii la capătul lui (`fundFoii`, scos din proba de la 11.3↑c, `src/sim/desprinse.ts`: mutările care ajung la
  fața de jos, apoi umplerea din margine, prin lemn), apoi programul cu urechile. Exportul, traseul și vederea 3D trec pe aici,
  deci arată aceleași urechi. Fără nicio operație „unde ține”, `programDinDocument`, neschimbat. **Precizare:** lucrarea fără
  fundul foii refuză „unde ține” (nu taie pe tăcute fără urechi); supracursa și bifa „prin foaie” nu mută fundul.
- **Locul bun** (`src/cam/urechiLemn.ts`): pe fiecare buclă, mostre la pasul celulei fundului (0,25 mm pe o foaie mică, 1 mm
  pe o placă întreagă); o mostră e bună când punctul buclei, dus cât freza (D) spre partea de care ține urechea, cade pe lemnul
  ei; un centru e bun când toate mostrele palierului lui (±W / 2) sunt bune. **Precizare:** pe un profil pe dinăuntru, urechea
  ține miezul de piesă, deci partea ei e a piesei (lemn, legat sau nu: piesa ține de foaie prin urechile ei); pe dinafară,
  deșeul, iar lemnul trebuie legat de marginea foii. Pe linie și pe o cale deschisă, refuz cu motivul.
- **Câte și unde:** întâi cât mai multe, până la număr, cu cel puțin W / 0,9 între centre (cu o rezervă de rotunjire, ca
  refuzul locurilor alese să nu le prindă), apoi cel mai mare gol minim; între așezările cu același gol, prima cea mai lungă
  serie de porniri bune, de la mijlocul ei. **Precizare:** dacă toate cele n locuri de la distanțe egale sunt bune (și
  tăietura n-are intrări, care ar număra urechile de la pornirea lor), urechile modului „egale”, octet cu octet: cu lemn de
  jur împrejur, „unde ține” nu schimbă nimic (placa 11 la 10 mm dă programele plăcii). Altfel, urechile trec prin lucrarea
  celor alese: pornirea în golul cel mai lung, intrările în afara urechilor.
- **Mai puține decât numărul:** un avertisment al lucrării, cu primele cinci bucle („3 bucle au mai puține urechi … : a/r: 0
  din 2; …”); o piesă fără nicio ureche apare și în proba urechilor, desprinsă.
- **Butonul** „Pune urechile unde țin”, lângă avertismente: piesele desprinse își spun operația (`piesă/operație`), iar exportul
  dă rândurile care nu sunt încă „unde ține”. **Precizare:** butonul trece rândurile ferestrei (nu documentul), într-o singură
  schimbare, cu nota „… exportă din nou”: exportul următor le scrie, ca orice valoare a ferestrei.
- **Semnele:** traseul dă centrele urechilor „unde ține”, pe drumul frezei; cu „Arată traseul”, inele mici (cele alese sunt
  puncte pline, pe contur). Panoul: „unde ține: N × W mm pe buclă”.
- **Probele:** `urechi.lemn.test.ts` (placa 11 la 5 mm: 3 + 1 plăcuțe desprinse, cele de pe hârtie, și aceleași prin proba pe
  G-code; la 10 mm, programele plăcii, octet cu octet; alegerea și fundul pe hârtie; refuzurile; butonul), `urechi.dialog.test.ts`
  (modul în fereastră), e2e `urechi-lemn.spec.ts` (trei dreptunghiuri la 9 mm: butonul din avertisment, exportul fără piese
  desprinse, palierele celui din mijloc pe laturile scurte, șase semne pe traseu). Otrăvurile `test/otravuri/11.3e.py`: 39, de rulat (felia e în lucru).
