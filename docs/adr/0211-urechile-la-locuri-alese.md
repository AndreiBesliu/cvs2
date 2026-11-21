# ADR 0211 — Urechile la locuri alese (etapa 11, varianta c din ADR 0210)

**Starea:** acceptat pe 19.11.2026, cu toate recomandările (1a–7a: „Da, toate recomandările”, la „Pornesc 11.3↑d cu toate
recomandările?”). Propus în aceeași zi, în linia planșelor (worktree-ul `plansele`, ramura `wip/11.1-plansele`, din `main`
`4b7539a`), la „Da, ADR și schița” (owner-ul, după 11.3↑c). Felia 11.3↑d (varianta a) pornește acum; vezi la capăt.
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
  Cifrele, pe hârtie, la începutul feliei 11.3↑e, iar proba de la 11.3↑c le numără.
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
