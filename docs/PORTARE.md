# Portarea din ediția întâi

**Starea:** propunere din 07.10.2026, pentru candidații etapelor 1–3 (`PLAN.md` §5.2). **Decizi tu pe ea.** Dacă nu
obiectezi până pornește etapa 1, verdictele de aici se aplică. Oricare dintre ele se poate întoarce înaintea feliei lui.

**Pe scurt:**
- Din codul vechi trec, în etapele 2–3:
  - formulele urechilor;
  - politica de alegere a intrărilor;
  - regulile de protocol ale senderului, ca teste;
  - ajutoarele GRBL;
  - registrul probei, bit cu bit.
- Nimic nu trece fără probele de aici.
- **Etapa 1 nu depinde de nimic vechi.**

**Sursa:** proiectul vechi (`AndreiBesliu/CncVectorStudio`), la commitul `d850c7b`. L-am citit fără să-l ating. Toate
trimiterile `fișier:linii` de mai jos sunt la acest commit.

## 1. Cum am judecat

**Verdictele** (decizia din 06.10, `CLAUDE.md`):
- **portat aproape neschimbat:** codul trece, cu tipurile și numele de aici; comportamentul rămâne același, bit cu bit
  acolo unde contează;
- **adaptat:** trece miezul (formula, regula, ordinea), iar învelișul se scrie din nou, pe interfețele de aici;
- **rescris, cu vechiul ca martor:** codul se scrie de la zero; din vechi rămân cerințele, cazurile de test și martorii;
- **lăsat:** nu trece nimic, nici măcar ca martor.

**Criteriile:**
1. dovada veche: oracol, valori pe hârtie sau doar structură;
2. potrivirea cu modelul de aici:
   - contururi L / A / C;
   - IR pe N axe, în coordonatele documentului;
   - postul, singurul care scrie programul;
3. costul adaptării față de rescriere;
4. riscurile, inclusiv licențele.

**Regula:** nimic portat nu intră fără probele de aici: oracolul din `test/oracles/`, cu zero importuri din `src/`,
valorile pe hârtie și controlul negativ care trebuie să pice (`PLAN.md` §4.1). Testul vechi nu trece ca test; trec
cazurile lui și valorile lui de pe hârtie.

**Martorul** e de două feluri:
- **pozitiv:** ieșirile vechiului pe același corpus, acolo unde noul trebuie să dea exact la fel (de exemplu
  hash-urile registrului probei).
  - Se generează dintr-o copie a vechiului (`git archive d850c7b`), într-un dosar din afara ambelor repo-uri.
  - În repo intră doar fixturile, cu commitul, fișierul și comanda notate.
- **negativ:** o greșeală reală din istoria veche, refăcută ca otravă peste codul nou. Oracolul nou trebuie s-o prindă.

**Nu sunt candidați:**
- emitenții care scriau G-code ca text;
- store-urile;
- postul cu ramuri pe controler.

Ce știau ei despre controlere a ajuns deja în contractele sondei s8 și în `LECTII.md`.

## 2. Verdictele

| Candidatul | Etapa | Verdictul | Ce trece | Ce rămâne în urmă |
|---|---:|---|---|---|
| Urechile, ca profil Z(s) | 2 | **adaptat** | profilul (4 funcții pure, ~45 de linii) și cele 6 cazuri pe hârtie | emitentul pe polilinii; puntea subțiată de supracursă |
| Intrările și ieșirile, cu rampa | 2 | **adaptat** (alegerea) + **rescris** (verificarea) | ordinea candidaților, înjumătățirea razei, omisiunea scrisă în program; rampa cu intrarea rotită; corpusul de 594 de variante | discul verificat în puncte, pe inele aplatizate |
| Biarcele (cubică → arce) | 2 | **rescris, cu vechiul ca martor** | refuzurile (toleranța ≤ 0 sau NaN, curba dreaptă) | trunchierea tăcută; verificarea într-un singur sens |
| Bugetul de toleranță | 2 | **rescris** | un singur loc pentru cifre, refuzul lui 0, proba pe rezultat | drumurile gândite pentru Clipper și aplatizare |
| Fluxul GRBL și bariera `M6` / `M0` | 3 | **rescris, cu vechiul ca martor** | 11 reguli de protocol; scenariile testului, ca transcrieri; portul care își ține singur socoteala | clasa cu steaguri; numărarea în unități UTF-16; preambulul scris de sender |
| Ajutoarele GRBL (status, răspunsuri, override, jog, zero, `M6`) | 3 | **adaptat** | parsarea și comenzile, trecute pe N axe și pe WCS explicit | `sanitizeProgram` |
| Dicționarul de coduri GRBL | 3 | **adaptat** | numerele, remediile, gravitatea confirmării | textele: parafrazează documentația GRBL (GPL-3.0) |
| Registrul probei | 14 (cu o grijă la comutarea din 3) | **portat aproape neschimbat** | tot modulul, cu hash-ul identic bit cu bit | comentariul de antet, care contrazice codul |

## 3. Candidații, pe rând

### 3.1 Urechile ca profil Z(s) (etapa 2)

**În vechi:**
- `src/export/gcode.ts:1985-2141`:
  - profilul: `profilUrechi`, `laUreche`, `zUreche`, `rupturiUreche`;
  - emitentul: `emitTabbedPolyline`.
- Testul: `scripts/test-urechi-profil.ts`.

**Dovada veche: bună.** 88 de verificări pe hârtie, 7 / 7 otrăvuri prinse.
- Perimetrul se calculează analitic din formă, nu se citește din program.
- Programul e citit cu un parser propriu.
- Palierele se numără ca zone, iar niciunul nu are voie să fie mai lung decât urechea.
- Controalele:
  - fixtura chiar are treceri sub vârful urechii;
  - totalul trecerii e perimetrul de pe hârtie.

**Potrivirea:**
- **Profilul se potrivește întocmai.** E deja o funcție de lungimea pe buclă, cu rupturi declarate:
  - palierul h = min(W; 0,9·S) / 2;
  - flancul ℓ = min(W / 2; 0,45·(S − 2h));
  - cel puțin 10 % din spațiul dintre urechi rămâne la adâncime plină;
  - poziția 0 e mereu la −d, deci intrarea nu cade pe o ureche.

  Asta e chiar modificatorul Z(s) din plan.
- **Emitentul nu se potrivește**:
  - scrie G-code ca text;
  - pe trecerile cu urechi aplatizează arcele în polilinii;
  - tratează pe rând fiecare combinație de rampă, lead și arce native (`LECTII.md` §2.2: ajutoarele nu se compun).

  Aici, urechile devin un modificator peste trecerea L / A din IR:
  - liniile și arcele se taie exact în punctele de ruptură;
  - un flanc pe arc devine elice (G2 / G3 cu Z);
  - cu rampa se compune ca în vechi: Z = cel mai puțin adânc dintre cele două.
- **Supracursa:** în vechi, vârful urechii se măsura de la adâncimea totală. La o tăiere prin material cu supracursă,
  puntea ieșea mai subțire cu toată supracursa. Aici se măsoară de la fundul materialului (placa 2 cere grosimea
  **2,0** ±0,2).

**Costul:** profilul trece în câteva minute. Rescris, ar trebui refăcute deciziile pe care hârtia le-a probat deja.
Emitentul trebuia oricum scris din nou, pe IR.

**Proba nouă:** oracolul citește G-code-ul cu tot cu arcele elicoidale. Pe fiecare trecere care traversează o ureche, el
măsoară față de hârtie lungimea palierului, a flancurilor și pe cea la adâncime plină. Cazurile sunt cele 6 vechi:
- dreptunghiul 300 × 200, cu 4 urechi de 8 mm;
- același dreptunghi, cu urechi de 6 mm;
- ușa cu colțurile R40;
- cercul de rază 100;
- raftul 600 × 100;
- dreptunghiul cu 8 urechi.

Se adaugă un caz nou: grosimea punții la o tăiere cu supracursă.

**Martorul negativ:** Z-ul binar pe vârfuri (forma de dinainte de 24.09) trebuie să înroșească oracolul.

### 3.2 Intrările și ieșirile, cu rampa (etapa 2)

**În vechi:**
- `src/export/gcode.ts:1700-1898`: `alegeLead`, `leadCurat`, `muscatura`, `regiunePastrata`, `emitLeadInOutLoop`;
- rampa: `gcode.ts:1586-1680` (`emitRampedClosedLoop`, `emitRampedContour`);
- testul: `scripts/test-lead-material-pastrat.ts`.

**Dovada veche: bună, dar eșantionată.** Sunt 594 de variante: 3 sensuri de tăiere × rampa pornită sau oprită × razele
1,5 / 3 / 6 mm. Formele: U, C, L, dreptunghiul, triunghiul și literele cu ochi O, B, D, A, 8.
- Materialul păstrat se calculează din poligonul original, par-impar.
- Mușcătura discului sculei trebuie să fie ≤ 0,02 mm.
- Controalele:
  - fără lead, aceeași măsură iese curată;
  - fiecare trecere are lead, sau programul spune „lead omis”;
  - unde e loc, lead-ul se găsește, nu se omite.

**Limita:** discul se verifică din 0,2 în 0,2 mm, față de inele aplatizate. De aici vine pragul de 0,02 mm.

**Potrivirea:**
- **Politica de alegere trece.** Ordinea candidaților:
  1. pornirea, cu latura veche;
  2. pornirea, cu cealaltă latură;
  3. mijloacele celor mai lungi 12 segmente, pe ambele laturi;
  4. toate de mai sus, cu raza înjumătățită (cel puțin 0,5 mm).

  Dacă nu încape niciunul, lead-ul se omite, cu comentariu în program. Pe L / A, „mijlocul segmentului” poate fi și
  mijlocul unui arc, cu tangenta lui.
- **Verificarea se rescrie exact.**
  - Regiunea păstrată e obiect de prim rang (`PLAN.md` §2, termenul 15).
  - Discul sculei se judecă prin distanța exactă de la arcul lead-ului la marginea regiunii (arc–linie, arc–arc) și prin
    poziția arcului față de regiune, nu prin puncte.
  - Pragul devine toleranța declarată, nu 0,02 mm.
- **Rampa trece ca politică:**
  - lungimea ei e Lr = min(max(0,1; lungimea cerută); perimetrul / 2);
  - coboară pe Lr, apoi urmează o tură plină, care trece din nou peste rampă;
  - intrarea se rotește cu Lr la fiecare trecere;
  - pe arce, rampa e elice.

  `emitRampedContour` făcea deja asta pe arce native. Aici rampa devine modificator Z(s), ca urechile.

**Costul:** politica e mică și probată. Verificarea exactă trebuie oricum scrisă în `geom` (o cere invarianta 2), deci
rescrierea ei nu costă nimic în plus.

**Proba nouă:** invarianta 2 (niciun punct al sculei în regiunea păstrată), pe toate mișcările, nu doar pe lead.
Corpusul vechi devine fixturi. Literele intră ca fișiere SVG, fără font, fiindcă textul vine abia în etapa 7.

**Martorul negativ:** latura ghicită din centroidul vârfurilor (`geometrieLeadCentroid`, forma de dinainte de 24.09)
trebuie prinsă. În vechi, ea mușca:
- 2,83–3,00 mm pe U, C, L și pe dreptunghi;
- 4,18 mm pe triunghi;
- 3,2–3,6 mm pe literele cu ochi.

### 3.3 Biarcele și bugetul de toleranță (etapa 2)

`PLAN.md` nu le numește în etapa 2, dar importul SVG le cere: o cubică intră în offsetul cavalier doar ca biarce (T6).
Le trec în fișa etapei 2.

**În vechi:**
- `src/canvas/biarc.ts` (271 de linii: `biarcFitCubic`, `biarcFitQuad`, `arcFitPolyline`);
- `src/geometry/tolerance.ts` (323 de linii);
- testele: `scripts/test-arcfit.ts`, `scripts/test-tolerance.ts`.

**Dovada veche: medie.**
- Fitter-ul e testat, cu defectul D9 reparat.
- Abaterea se verifică într-un singur sens, de la curbă spre arce, în 24 de puncte.
- Bugetul are suma exactă și refuză 0.

**Potrivirea, la biarce:**
- Sonda s1 a scris deja un fitter în modelul de aici (`bulge`). L-a măsurat față de un oracol independent: abaterea
  reală ajunge la 1,0076 × toleranța [s1-V, C3]. Pornim de la el.
- Din vechi trec trei lucruri:
  - refuzul toleranței ≤ 0 sau NaN; altfel, recursivitatea ajunge la 4 096 de arce pe o singură cubică (măsurat în
    vechi);
  - curba dreaptă iese imediat ca linie;
  - cazul tangentelor egale.
- **Nu trece trunchierea tăcută** la adâncimea 12. Aici iese un eșec explicit (T5: niciun traseu tăcut).
- Verificarea devine în ambele sensuri (Hausdorff).
- **Pentru felie:** fitter-ul să țintească 0,99 × toleranța, ca abaterea reală să rămână sub cea declarată.

**Potrivirea, la buget:**
- Drumurile vechi (`lower` / `flatten` / `clip` / `refit`) descriu un nucleu cu Clipper și aplatizare. Aici nucleul nu
  mai are niciuna dintre ele.
- Aproximările de aici sunt:
  - biarcele;
  - rotunjirea postului (0,0005 mm, la 3 zecimale);
  - mai târziu, pasul V-carve-ului (T7).
- Trec trei idei:
  - un singur loc pentru cifre;
  - refuzul lui 0;
  - proba pe rezultat: oracolul măsoară traseul final față de curba adevărată.
- Implicitul vechi, 0,02 mm, nu trece. Aici toleranța proiectului e 0,001 mm (T2).

**Proba nouă:** oracolul de geometrie (distanța exactă la cubică, Hausdorff în ambele sensuri). Controlul negativ:
toleranța × 1,01.

**Martorul pozitiv** (doar informativ): numărul de arce al vechiului, pe același corpus. Arată dacă noul e mai risipitor.

`arcFitPolyline` (polilinie → arce) nu e cerut în etapa 2. Se judecă înaintea etapei 9 (importul cu polilinii dense) sau
a etapei 10 (conversia în arce).

### 3.4 Fluxul GRBL și bariera `M6` / `M0` (etapa 3)

**În vechi:**
- `src/machine/sender.ts` (398 de linii, clasa `GrblSender`);
- `src/machine/grbl.ts` (393);
- `src/machine/resume.ts` (354);
- testul: `scripts/test-machine.ts` (505).

**Dovada veche: amestecată.**
- O piesă reală, tăiată pe mașina ta.
- Din 23.09, portul fals își ține singur socoteala octeților. Înainte, plasa ferestrei era oarbă prin construcție:
  număra cu aceeași sumă pe care o otrăvea.
- Bariera: 42 de verificări pe programul real din export și 9 / 9 otrăvuri prinse, dar nimic pe fier.
- Reluarea: 51 de verificări, însă oracolul de echivalență era chiar `applyLine`, adică funcția testată.

**Potrivirea:** slabă pentru clasă, bună pentru reguli.
- Clasa ține starea în steaguri (`streaming`, `paused`, `bariera`, `lostResumePoint`), iar `streaming` a avut două
  înțelesuri (`LECTII.md` §2.2). T20 cere procedurile ca mașini de stare pure și emulatorul ca fixtură.
- Mai sunt trei nepotriviri:
  - vechiul numără unități UTF-16, nu octeți;
  - o linie de cel puțin 128 de caractere oprește fluxul pentru totdeauna, fără mesaj;
  - preambulul de după barieră e scris de sender, deși programul îl scrie doar postul.

**Trec 11 reguli, fiecare cu testul ei:**
1. **Octeții.** O linie costă numărul ei de **octeți** + 1. În buffer stau cel mult 128 de octeți neconfirmați. Liniile
   de peste 70 de octeți se refuză la încărcare.
2. **Răspunsurile.** `ok` și `error:N` se potrivesc în ordine. Răspunsul unei comenzi manuale se leagă de comanda care
   l-a cerut.
3. **Eroarea în flux.** `error:N` înseamnă hold și flux suspendat, nu terminat. Reluarea continuă de la prima linie
   netrimisă.
4. **Bufferul pierdut.** ALARM, Ctrl-X și bannerul de repornire golesc bufferul. După ele, punctul de reluare e pierdut,
   iar reluarea se refuză.
5. **Sfârșitul lucrării.** Lucrarea se declară terminată doar după ce hold-ul e eliberat. Altfel ar putea fi raportată
   gata cu scula în piesă.
6. **Bariera.**
   - `M6`, `M0` și `M1` nu pleacă niciodată la controler.
   - Fluxul se oprește în fața lor și așteaptă confirmarea a tot ce a plecat: bufferul gol, mașina `Idle`.
   - La schimbarea de sculă se trimite `M5`.
   - `M0`, urmat de `T5 M6` și de `M3 S…`, înseamnă o singură oprire.
7. **Citirile.** Citirile `$` (de exemplu `$#`) pleacă doar când nicio comandă manuală nu mai așteaptă răspuns **și**
   ultimul raport e `Idle`. Un `ok` singur dovedește doar că linia a fost parsată. Un `Idle` singur poate veni cu linii
   încă neparsate în buffer.
8. **Hold-ul.** `Hold:0` (oprit de tot) diferă de `Hold:1` (încă frânează).
9. **Timpul real.** Octeții de timp real (`?`, `!`, `~`, override-urile, `0x85`) ocolesc bufferul și nu schimbă
   socoteala.
10. **Emulatorul.** Emulatorul numără ce **primește**, nu ce îi spune senderul (principiul portului din 23.09).
11. **WCS-ul.** E câmp obligatoriu. Când nu se știe, senderul refuză, nu presupune `G54`.

**Ce se schimbă la barieră:** pentru programele noastre, blocul de după `M6` îl scrie **postul**, care știe starea
modală exactă. Blocul face, în ordine:
1. urcă la Z sigur;
2. pornește axul, cu pauza lui;
3. merge în XY;
4. coboară cu avans;
5. re-afirmă G90, G21, WCS-ul și F.

Senderul doar se oprește, permite jog, palpare și zero, apoi continuă. Ordinea preambulului vechi (`resume.ts`) devine
specificația acestui bloc. Reconstruirea stării din textul programului rămâne pentru pornirea de la linia N (etapa 13)
și pentru programele străine. Până atunci, un program străin cu `M6` se refuză, cu mesaj.

**Proba nouă:** emulatorul GRBL din etapa 3. Scenariile testului vechi devin transcrieri:
- fereastra nu trece niciodată de 128;
- liniile scurte, unde o greșeală de un octet se adună;
- eroarea în flux;
- reluarea, inclusiv cu eroarea pe ultima linie și cu linii încă în buffer;
- alarma, repornirea, și repornirea după o eroare;
- interblocările și bariera.

Li se adaugă cele 100 000 de linii fără pierderi și linia de 80 de caractere refuzată, din fișa plăcii 3.

**Martorii negativi:**
- numărarea fără `+1`;
- numărarea în UTF-16, pe un comentariu cu diacritice;
- linia de 128 de caractere;
- `streaming` folosit cu ambele înțelesuri.

### 3.5 Ajutoarele GRBL și dicționarul de coduri (etapa 3)

**În vechi:**
- `src/machine/grbl.ts`: `classifyLine`, `parseStatusReport`, `tipBariera`, `sculaDinLinie`, `planOverride` cu
  `OVERRIDE_BYTES`, `jogVector`, `zeroCommand`, `planResume`;
- dicționarul: `src/machine/grblCodes.ts` (330 de linii), cu textele în `src/i18n/locales/`.

**Verdictul: adaptat.**
- **Funcțiile** sunt pure, mici și testate. Trec cu două schimbări:
  - pozițiile au N axe, cu cadru și cu stare (T22), deci `MPos`, `WPos` și `WCO` se citesc cu oricâte valori;
  - zero-ul scrie explicit WCS-ul.
- **`sanitizeProgram` nu trece:** senderul trimite exact octeții exportați, iar GRBL își scoate singur comentariile.
- **Din dicționar trec:**
  - numerele, inclusiv faptul că `error:18` și `error:19` nu există;
  - remediile, legate de butoane;
  - gravitatea confirmării.

  Toate trei sunt ale noastre.
- **Textele nu trec.** Cel puțin unul (`err1`) parafrazează aproape cuvânt cu cuvânt CSV-ul din `gnea/grbl`, care e
  GPL-3.0. Se scriu din nou, în cuvintele noastre, în en și ro.
- Contractele grblHAL și FluidNC își aduc propriile coduri.

### 3.6 Registrul probei (etapa 14, cu o grijă la comutarea din etapa 3)

**În vechi:**
- `functions/trialLedger.js` (589 de linii: funcții pure, plus operațiile cu baza injectată);
- testul: `scripts/test-trial-ledger.ts` (728 de linii, pe un Firestore în memorie).

**Dovada veche: bună pe modulul pur.** Calea reală cerea App Check, deci n-a putut fi exersată pe instanța de test.
Aici, tokenul de debug există pe test (etapa 3), așa că se poate.

**De ce aproape neschimbat:** pe live, colecția `trialLedger` ține deja chei calculate cu `normalizeEmail` și
`TRIAL_LEDGER_KEY`. HMAC-ul nu se poate inversa, deci intrările vechi nu se pot migra. Ele rămân valabile doar dacă noul
cod dă **același hash, bit cu bit**:
- aceleași liste de furnizori;
- aceleași reguli: la Gmail se scot punctele și sufixul `+…`, la furnizorii din listă doar sufixul, iar restul adreselor
  rămân neatinse.

Orice schimbare a canonizării ar reacorda proba tuturor celor din registru. Ar fi o decizie de produs, nu o curățenie.

**Ce trece:** tot modulul, în TypeScript, cu aceleași reguli:
- retenția de 24 de luni, calendaristică;
- intrarea expirată e tratată ca absentă la citire;
- bonusul de înscriere are eșec închis;
- registrul nu blochează niciodată crearea sau ștergerea contului.

**Ce nu trece:** comentariul de antet. Spune „doar trim + lowercase”, deși codul canonizează pe furnizor. Se rescrie
după ce face codul.

**La comutarea din etapa 3:** funcțiile vechi se șterg la primul deploy nou, inclusiv curățarea programată a
registrului. Pe lista comutării intră patru puncte:
1. secretul `TRIAL_LEDGER_KEY` **rămâne** în Secret Manager; fără el, intrările vechi nu mai înseamnă nimic;
2. colecția `trialLedger` rămâne neatinsă (exportul Firestore de dinainte o acoperă și el);
3. se citește de pe live, doar în citire, cel mai vechi `expiresAt`. El e termenul până la care curățarea trebuie să
   ruleze din nou. Proba există din iunie 2026, iar registrul păstrează data reală de început, și pentru probele de
   dinaintea lui. Deci termenul nu cade înainte de ~iunie 2028;
4. curățarea revine în etapa 14, odată cu proba.

**Proba nouă:**
- **martorul pozitiv:** hash-urile vechiului, pe o listă fixă de adrese, cu o cheie de test, păstrate ca fixtură.
  Noul trebuie să dea exact aceleași hash-uri.
- **otrăvurile:**
  - canonizarea schimbată;
  - retenția mai scurtă cu o lună;
  - intrarea expirată tratată ca validă.

**Restul rândului din `LECTII.md` §3.2:** grația la plata eșuată se judecă înaintea etapei 14, iar creditele înaintea
etapei 27.

## 4. Ceilalți candidați din `LECTII.md` §3.2

Verdictele lor se scriu înaintea etapei fiecăruia. Ce se vede de acum:

| Candidatul | Etapa | Ce se vede de acum |
|---|---:|---|
| Aplatizorul (pasul din săgeată, planeitatea Bézier) | 4 | nucleul nu aplatizează (arcele rămân arce până în post); îl cer simularea și oracolele |
| `arcFitPolyline` | 9 / 10 | importul cu polilinii dense și conversia în arce |
| Modelul incrustației și poziția decupării `e*` | 12 | oracolul pe 10–12 forme trece ca fixtură; **neprobat pe lemn** |
| Planarea blatului | 13 | oracol de acoperire, cu un control care pică; nimic pe fier |
| Reluarea de la linia N (`resume.ts`) | 13 | trece ordinea preambulului; oracolul vechi era autoconsistent, deci se rescrie |
| Grația la plata eșuată, ancorată pe începutul perioadei | 14 | trece regula; vechiul o testa doar pe client |
| Modelul de freză `BitProfile` (186 de siluete) | 4 / 16 | formele de bază intră în simulare (etapa 4), frezele desenate în etapa 16 |
| Dilatarea gri, lema coardei, maximul glisant | 18 / 20 | relieful și 3D-ul |
| Transformata de distanță Danielsson | 18–19 | relieful |
| Trasarea pe luminanță și potrivirea pe arce | 25 | **licența:** `marchingsquares` e AGPL-3.0, cu o excepție condiționată |
| Creditele pe egalitate exactă | 27 | depind de ce credite rămân (`PLAN.md` §8.2: fără credite de export) |
| Oferta în bani întregi | v1.x | oferta automată e în v1.x (`BRIEF.md` §2) |
| Formatul `.tdb` | — | **de întrebat înaintea etapei 5** (mai jos) |

**`.tdb`:** cititorul vechi a fost obținut prin reverse engineering, pe un format nedocumentat. Situația e aceeași ca la
DGK și PIC, scoase din prag pe 07.10. **Recomandarea mea, ca implicit:**
- formatul e **lăsat** în produs;
- biblioteca ta (409 intrări) trece o singură dată: aplicația veche, care o citește deja, o exportă în CSV, iar
  aplicația nouă citește doar CSV-ul.

Întrebarea intră în coada ta înaintea etapei 5.

## 5. Ce schimbă asta în plan

- **Fișa etapei 2:**
  - biarcele și bugetul de toleranță intră explicit (§3.3);
  - urechile se măsoară de la fundul materialului (§3.1).
- **Fișa etapei 3:**
  - blocul de după `M6` îl scrie postul (§3.4);
  - textele codurilor GRBL se scriu din nou (§3.5);
  - comutarea primește cele patru puncte ale registrului probei (§3.6).
- **Etapa 1** pornește fără nimic portat.
