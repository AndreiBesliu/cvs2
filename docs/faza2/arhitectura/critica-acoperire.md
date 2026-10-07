# Critica planului: completitudinea

**Data:** 07.10.2026. **Ce e:** verificarea independentă a ciornei `PLAN.md`, pe o singură întrebare: acoperă tot ce
trebuie, explicit și într-o etapă? **Ce n-am făcut:** n-am modificat alt fișier, n-am rulat cod și nici git.

---

## Ce am verificat

Am citit `PLAN.md` complet (675 de linii), apoi l-am pus față în față cu:
1. **`ACOPERIRE-ARTCAM-DESKPROTO.md`:** am numărat rândurile v1 pe grupe și am căutat fiecare rând în tabelul de etape
   din `PLAN.md` §5.3 și în harta din `propunere-simplitate.md` §5.3. Apoi am verificat dacă modificările din `PLAN.md`
   §5.4 și deciziile implicite din §8 schimbă harta.
2. **`BRIEF.md`:**
   - §10: cele 8 funcții;
   - §16.1: adminul, cu `admin/RAPORT.md` §4.1 și §5.2 (P0–P4, cele 12 file);
   - §16.2: vectorii reali, toate cele 4 puncte;
   - §8: lista de lansare;
   - §4, §6, §7, §12, §13: deciziile și pașii de configurare;
   - §9 și §15, unde am dat peste contradicții.
3. **`LECTII.md`:** §2.2 (cele 7 clase), §2.3 (cele 8 cauze), §4 (cele 14 puncte).
4. **Martorii:** `propunere-corectitudine.md`, `propunere-valoare.md`, `estimare.md`, `sonde/s8-posturi/RAPORT.md`,
   `sonde/s1-geometrie/RAPORT.md`, `prototip-planse/RAPORT.md`, `s2-export-import/pachet-owner/CITESTE.md`.

---

## Verdictul

**Acoperirea formală e completă:**
- toate cele 65 de rânduri v1 apar în tabelul de etape al planului, fiecare cu etapa în care se închide, identic cu
  harta din `propunere-simplitate.md` §5.3;
- cele 8 funcții din §10 și tranșele P0–P4 au fiecare o etapă;
- punctele din §16.2 și din lista de lansare au fiecare un loc în plan.

**Planul nu e gata de aprobare așa cum e.** Am găsit **13 constatări importante și 12 minore, niciuna blocantă.** Cele mai
grave:
- trei decizii implicite scot bucăți din pragul v1 fără un răspuns explicit al owner-ului (1);
- unele decizii ale owner-ului lipsesc sau sunt contrazise: capabilitățile din ziua 1 (4), axa A (3), „fiecare post
  probat” (2), oracolul calibrat pe lemn (5);
- dovada descrisă (bancul vizual, unealta de otrăvuri) și registrul de acțiuni n-au etapă (9);
- lista pentru owner trece de 5 lucruri deschise din prima săptămână (11).

---

## Constatările, după gravitate

### Importante

**1. Pragul scade prin implicit, nu prin decizia owner-ului.**
- **Unde:** `PLAN.md` §8, deciziile 6, 7, 9 și 10 (liniile 625–629); regula de la linia 597 („dacă nu spui altfel, o
  aplic”); §0, linia 18 („v1 = cele 65 de rânduri”).
- **Problema:** cu implicitele aplicate, rândul A4 („Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF vectorial, DWG, WMF,
  DGK / PIC (S)”) se închide:
  - fără DGK / PIC, scoase din prag;
  - fără DWG, care rămâne doar mesaj;
  - fără EPS, dacă EPS-urile sunt sub ~10 % din fișierele owner-ului.

  Exportul AI (rândul A5, „EPS / AI de decis”) devine „nu”. Toate se aplică dacă owner-ul tace.
- **Dovada:**
  - `CLAUDE.md`: „Nimic nu iese din listă fără decizia owner-ului”; `ACOPERIRE`, linia 11;
  - `propunere-simplitate.md` §5.6: „Nimic nu iese din prag fără owner… DGK / PIC: … o decide owner-ul”; etapa 25:
    „Dacă owner-ul alege mesajul…”;
  - `estimare.md` §5, rândul 7.

  Planul face dintr-o alegere a owner-ului o regulă pe date (pragul de 10 %).
- **Corectura propusă:**
  - deciziile 6, 7, 9 și partea „AI” din 10 primesc eticheta „cer răspunsul tău explicit; fără el, rândul rămâne
    întreg”;
  - în §0 și la etapa 26, o frază: „cu recomandările mele, A4 se închide fără DWG nativ și fără DGK / PIC”;
  - pragul de 10 % devine o recomandare pe care owner-ul o confirmă, nu un declanșator.

**2. „Fiecare post probat pe un controler real” nu e acoperit.**
- **Unde:** §8 decizia 3 (linia 611); riscul 2 (linia 583); etapa 29 (linia 470); glosarul 18 (linia 106).
- **Problema:**
  - BRIEF §12 cere posturi pentru GRBL, grblHAL, FluidNC, NcStudio, Richauto / Syntec și Mach3 / Mach4, fiecare
    „probat pe un fișier real rulat pe acel controler”;
  - planul cere 3 ateliere („câte unul cu NcStudio, Richauto / Syntec, Mach3 / Mach4”), deci se probează cel mult unul
    din RichAuto / Syntec și unul din Mach3 / Mach4;
  - grblHAL și FluidNC nu apar nicăieri în plan, deși `s8` Anexa B le dă owner-ului, pe controlerul axei A (T0, T1, T2,
    T4);
  - etapa 29 închide posturile „dacă au venit rezultatele”, iar riscul 2 spune „postul neprobat poartă avertisment”. În
    același timp, §6 spune că atelierele pot amâna lansarea. Nu reiese ce se întâmplă la lansare cu un post neprobat.
- **Dovada:** `BRIEF.md` §12 (liniile 237–243) și §8 (linia 138, care cere doar NcStudio, Richauto / Syntec și Mach3);
  `s8` Anexa B, „Setul minim pe controler”, cu 7 rânduri: GRBL 1.1, grblHAL / FluidNC, NcStudio, RichAuto, Syntec, Mach3,
  Mach4.
- **Corectura propusă:**
  - o listă cu toate cele 7 contracte și cine le probează (owner-ul sau un atelier);
  - ateliere pentru 5 controlere, nu 3 (sau ateliere care au mai multe);
  - un pas de configurare: „controlerul axei A (grblHAL / FluidNC): T0, T1, T2, T4”;
  - o decizie explicită: ce posturi pot ieși la lansare doar „documentate”, cu avertisment (BRIEF §12 spune „niciunul”,
    BRIEF §8 e mai îngăduitor; planul trebuie să le împace);
  - fără „dacă au venit” în etapa 29.

**3. Axa A și „N axe din prima zi” lipsesc din arhitectură.**
- **Unde:** §3.2 (modelul documentului); glosarul 12 „montaj” (linia 100) și 20 „profilul mașinii”; T9; T20 (linia
  283). În tot planul nu apar „axa A”, „grblHAL”, „FluidNC” sau „rotativ”.
- **Problema:** axa a 4-a e v1.x, dar mai multe decizii cer pregătirea ei de acum:
  - BRIEF §12: „Senderul și postul trebuie să știe de A”;
  - LECTII §4.10: „N axe din prima zi” și tipurile `MachinePos` / `WorkPos`;
  - LECTII §4.2: „Montajele țin materialul, originea, orientarea, axa și știfturile”;
  - `ACOPERIRE`, „Ce înseamnă pentru arhitectură, din prima zi”: montajul cu fața, axa, originea, știfturile;
    posturile cu axele A / B.

  Montajul planului n-are axă și nici știfturi. T20 are doar tipurile Known / Unknown, fără cadru. Pe controlerul axei A
  al owner-ului, senderul primește un raport de stare cu 4 coordonate.
- **Dovada:** citatele de mai sus. `propunere-corectitudine.md` S11, felia 7 („tipurile pentru N axe”) s-a pierdut când
  s-a adoptat scheletul „simplitate”, care nu le are.
- **Corectura propusă:** o decizie T nouă sau un rând în T8, T9 și T20:
  - IR-ul, profilul mașinii și senderul au N axe din etapa 1 (v1 folosește doar XYZ);
  - montajul are câmpurile axă și știfturi, goale în v1;
  - coordonatele au cadru (`MachinePos` / `WorkPos`) pe lângă Known / Unknown;
  - proba: senderul pe emulator, cu un raport de stare cu 4 axe.

**4. Capabilitățile din ziua 1 nu sunt programate.**
- **Unde:** §3.1 principiul 6 (liniile 134–135); §3.2, registrul de acțiuni (linia 166); tabelul de etape (etapele 1 și
  14).
- **Problema:**
  - BRIEF §4 cere: „Arhitectura are din ziua 1 un sistem de capabilități, verificat de fiecare funcție, ca împărțirea să
    nu ceară refactorizare”;
  - planul descrie câmpul „capabilitatea cerută” din registru, dar lista „din prima zi” de la principiul 6 nu-l conține;
  - scheletul adoptat pune „capabilitățile cerute de fiecare acțiune” abia în etapa 14 (`propunere-simplitate.md`,
    linia 875);
  - nici registrul de acțiuni n-are felie în etapa 1, deși LECTII §4.7 îl vrea „înaintea oricărei suprafețe”, iar etapa
    1 face deja pan, zoom, selecție și mutare.
- **Dovada:** `propunere-valoare.md` §3.4 (F5, punctul 3) și §3.8: „registrul de capabilități (date), chiar dacă toate
  sunt permise până la facturare”; `estimare.md`, articolele I6 (stratul de acțiuni, 2 felii) și I14 („sistemul de
  capabilități din ziua 1”).
- **Corectura propusă:** în principiul 6 și în etapa 1: registrul de acțiuni, cu capabilitatea declarată pe fiecare
  acțiune (toate permise până la facturare), plus un test care cere ca nicio acțiune să n-o aibă goală.

**5. Calibrarea pe lemn contrazice BRIEF §13.**
- **Unde:** §4.6, punctul 5 (liniile 385–386): „Constantele se folosesc doar la compararea plăcilor, niciodată în
  oracol.”
- **Problema:**
  - BRIEF §13 (decis 06.10) spune: „Oracolul e calibrat o dată pe lemn”; la fel LECTII §4.6 și §3.1;
  - toate trei propunerile au urmat BRIEF-ul: „simplitate” trece abaterile în biblioteca de scule (etapa 4); „valoare”
    §4.6 spune că „intră o singură dată în calibrarea oracolului pe lemn”;
  - planul schimbă decizia fără s-o spună. Ideea poate fi mai bună (oracolul rămâne pur geometric), dar schimbă o
    decizie a owner-ului.
- **Corectura propusă:** fie alinierea la BRIEF §13, fie schimbarea scrisă ca propunere, cu motivul ei și cu întrebarea
  în §8.

**6. Funcții care mișcă mașina fără placă de probă.**
- **Unde:** etapa 17 (linia 456: placa „textura, grila ghilotină; laserul, dacă ai”); decizia 19 (linia 638); pârghia
  de la linia 570.
- **Problema:** BRIEF §8 cere: „Fiecare funcție care mișcă mașina e probată pe placa de probă a etapei ei.”
  - Găurirea cu mai multe burghie (rândul B13) nu poate fi tăiată de owner: n-are bancă de burghie, iar scheletul o
    probează „pe simulare și pe octeții postului”.
  - Laserul (B14) cere un laser pe care owner-ul poate să nu-l aibă. Varianta „într-un atelier” n-are niciun pas de
    căutare.

  Planul nu spune că aceste rânduri nu vor îndeplini criteriul de lansare.
- **Corectura propusă:** în §8, o decizie: „găurirea multiplă (și laserul, dacă n-ai laser) se acceptă pe simulare și pe
  octeții postului, sau cauți un atelier”, plus pasul de configurare care îi corespunde.

**7. Inventarul adminului nu e trecut în plan.**
- **Unde:** §5.5 (liniile 505–514); tabelul din §5.3.
- **Problema:**
  - BRIEF §16.1 cere ca inventarul exact (ce face fiecare filă, ce intră în v1, ce se lasă) să „se treacă în plan”;
  - planul spune doar „Totalul e cele 12 file (fila AI vine cu AI-ul)”. Formularea e ambiguă:
    - cele 12 file din BRIEF includ AI și Crash-uri;
    - cele 12 din `admin` §5.2 sunt Puls, Utilizatori, Venituri, Analiză, CAM, Tichete, Erori, Diagnoză (nouă),
      Config, Audit, Admini și Operare cu publicarea;
  - abaterile de la „ca și acum” nu sunt spuse:
    - panoul de credite (decizia 12);
    - „un gest din editor”, din Config;
    - CAM-ul simplificat;
    - ghidurile din Operare, mutate din aplicație în repo;
    - partea de AI din Puls, Utilizatori și Config.
- **Corectura propusă:** un tabel cu 12 rânduri (fila, etapa, ce intră, ce se lasă), luat din `admin/RAPORT.md` §4.1 și
  §5.2.

**8. Observabilitatea „din prima zi” vine abia în etapa 3.**
- **Unde:** §3.4 (linia 252, „observabilitatea din prima zi”), față de tabelul de etape (P0 în etapa 3) și de §5.5
  (linia 506).
- **Problema:**
  - planul se contrazice singur;
  - `admin/RAPORT.md` §5.2 pune P0 (jurnalul de erori, Diagnoza minimă) la „primul deploy pe test (etapa 0–1)”, iar
    instanța de test se publică încă din etapa 1;
  - în etapele 1–2, owner-ul taie plăcile 1 și 2 din aplicația de pe test, dar erorile din browserul lui nu ajung
    nicăieri pe server;
  - LECTII §4.11 cere „observabilitate din ziua 1”.
- **Corectura propusă:** fie un P0 minim (`errorLogs`, `logClientError`, fila Erori) în etapa 1, odată cu primul deploy
  pe test, fie §3.4 rescris „din etapa 3”, cu motivul.

**9. Ce n-are etapă: bancul vizual, unealta de otrăvuri, învelișul interfeței. Plus 254 de felii față de 311.**
- **Unde:** §4.3 (liniile 341–350); §4.5 (366–372); §0 (linia 49); §5.1 (409–410); §5.4 (479–486).
- **Problema:**
  - **Bancul vizual și scriptul de otrăvuri** sunt descrise, dar nicio etapă nu le construiește, nici în scheletul
    „simplitate”. LECTII §4.12 cere bancul „din prima zi”. `propunere-corectitudine.md` îl pune în S4, iar
    `estimare.md` îl numără (articolul I18, 3 felii).
  - **Mărimea:** estimatorul numără **311 felii** pentru același v1 (`estimare.md` §0 și §4.10), scheletul **254**. O
    parte din diferență sunt articole care n-au loc în nicio etapă:
    - I6, stratul de acțiuni (2 felii);
    - I18, bancul și otrăvurile (3);
    - I19, învelișul interfeței: panouri, proprietăți, proiecte, setări, temă (5), în afară de câmpul numeric unic din
      etapa 1.
  - **Comparația cu P50 nu ține:** „254 de felii … se potrivește cu P50” compară lucruri diferite. P50 = 33,2 săptămâni
    e calculat pe 311 felii (340 cu împrăștierea), la ~10,75 felii pe săptămână. Planul are 254 de felii, câte 8–9 pe
    săptămână. Unitățile diferă, deci și „~1 felie de rezervă pe etapă” e nesigur.
  - **§5.4 adaugă implicit 4 felii,** iar §0 rămâne la 254:
    - EPS +1 în etapa 9, care ajunge la 10 felii;
    - copiile în cloud +3 în etapa 15, care ajunge la 11 felii.

    Ambele etape trec de regula „~8–9 felii” de la §5.1. Pentru copiile în cloud, scheletul estimase +4–6 felii
    (`propunere-simplitate.md` §8, întrebarea 7), nu +3.
- **Corectura propusă:**
  - bancul vizual și unealta de otrăvuri într-o felie din etapele 1–4;
  - registrul de acțiuni în etapa 1 (constatarea 4);
  - învelișul interfeței împărțit pe etape;
  - o frază care împacă 254 cu 311: ce articole ale estimatorului lipsesc din etape și de ce;
  - totalul și etapele 9 și 15 actualizate după §5.4.

**10. T2 declară prea puțin despre aproximare (BRIEF §16.2, punctele 1 și 3).**
- **Unde:** T2 (linia 265): „Doar un arc eliptic aflat în mijlocul unei căi SVG devine cubice…”; §0, linia 34–35
  („cercul rămâne cerc prin orice operație”).
- **Problema:**
  - „doar” nu e adevărat. `s1` §5, punctul 2: „„Convertește în cale” și scalarea neuniformă a unei căi libere cu arce
    dau cubice sub toleranța declarată”. `propunere-valoare.md` §3.7, punctul 2, adaugă booleanul și offsetul pe elipse;
  - BRIEF §16.2 numește exact aceste operații („scalare neuniformă”, „conversie în cale”) și cere ca aproximarea
    inevitabilă să fie „mică și declarată”;
  - efectul la export (SPLINE în loc de ELLIPSE) e notat în `estimare.md` §5, punctul 2, ca informație pentru owner,
    dar n-a ajuns în plan;
  - BRIEF §16.2 cere și ca înțelegerea cerinței să fie „de confirmat în planul din Faza 2”. Planul n-o confirmă
    explicit.
- **Corectura propusă:** T2 cu toate cazurile, cu toleranța și cu efectul la export; în §0, excepția declarată; o frază
  care confirmă (sau corectează) înțelegerea din BRIEF §16.2.

**11. Lista owner-ului trece de 5 din prima săptămână.**
- **Unde:** §8 (linia 597: „cel mult 5 lucruri deschise odată”); riscul 9 (linia 590).
- **Problema:** la aprobare și în etapa 1 sunt deschise cel puțin 9 lucruri:
  - lotul 1 (5);
  - toleranța (decizia 18, termen: etapa 1);
  - verdictul pe `PORTARE.md` (§5.2, linia 428);
  - doi pași de configurare cu termen în etapa 1 (liniile 649–650).

  În etapa 3 se adaugă deciziile 13 și 14 și pașii etapei 3 (cheia reCAPTCHA, mediul `live`, WIF, exportul pe live,
  placa de contact). Riscul 9 („lista ta trece de 5”) e declanșat chiar de plan. BRIEF §7 cere și o stare pe fiecare
  rând, iar tabelele din §8 n-au o astfel de coloană.
- **Corectura propusă:** lista eșalonată: lotul 1 ține doar ce blochează etapa 1 (toleranța, materialul, exportul
  Firestore pe test, căutarea atelierelor), iar restul primește termene mai târzii; o coloană „stare”.

**12. Riscul principal din BRIEF §15 lipsește, iar beta-ul nu e printre pârghii.**
- **Unde:** §7 (riscurile 1–10); §6 (pârghiile, liniile 564–571).
- **Problema:**
  - BRIEF §15: „Drumul lung fără utilizatori externi e riscul principal… Dacă estimarea iese prea lungă, owner-ul poate
    reconsidera beta-ul sau v1.”;
  - planul arată P50 = 33 și P90 = 64 de săptămâni, dar nu trece riscul în tabel și nu pune beta-ul printre pârghii;
  - scheletul avea informația: „cel mai devreme punct cu o buclă 2D completă pentru un străin e sfârșitul etapei 13”
    (`propunere-simplitate.md` §6). Estimatorul cere ca beta-ul să fie pus în față la recalibrare (`estimare.md` §8.4).
- **Corectura propusă:** riscul trecut în §7, cu semnalul și cu reacția; în §6, pârghia „beta pentru ateliere după
  etapa 13 (săptămâna 14)”, cu costul ei și fără recomandare.

**13. Registrul de defecte și datorii, cu gravitate, nu e definit.**
- **Unde:** §5.1; §4.6, punctul 4 (linia 384); rândul T1 (linia 449, „coada de defecte”).
- **Problema:**
  - LECTII §2.3, cauza 3, și regula „Registrul are gravitate. Un defect confirmat care atinge mașina sau banii trece
    înaintea oricărei restanțe noi”;
  - LECTII §4.13: „registrul de restanțe e structurat (nu proză) și vede ramurile”;
  - BRIEF §6: „registrul rămâne o listă de datorii”.

  Planul are doar „defectul de gravitate „mașină”” venit de pe placă. Nu spune unde stau defectele găsite în afara
  plăcii, ce gravități există (banii, datele) și nici că registrul e structurat.
- **Corectura propusă:** un paragraf în §5.1:
  - registrul e un fișier structurat, generat;
  - gravitățile: mașină, bani, date, restul;
  - regula de prioritate între ele;
  - „un verdict se dă doar cu probă, inclusiv o respingere”.

### Minore

**14. §5.4, punctul 3, nu e o schimbare.** Oracolul G-code din `s4` e deja în etapa 1 a scheletului
(`propunere-simplitate.md`, etapa 1, felia 7: „invarianta pasului; totul în CI”). **Corectura:** punctul scos sau
reformulat.

**15. Etapele listei de lansare.** Linia 474 spune „etapele 3, 9, 27, 28 și 30”. Posturile se închid însă în etapele
12 și 29 (§5.5 și tabelul). **Corectura:** „3, 9, 12, 27, 28, 29 și 30, plus punctele continue”.

**16. D3 și D4 se închid prea devreme.** „Degroșare 3D” și „Finisare paralelă” sunt în grupa D („Prelucrare 3D a
modelelor”), dar se închid în etapa 18, pe relief. STL-ul vine abia în etapa 20, iar BRIEF §1 cere „inclusiv degroșarea
și finisarea 3D din STL”. **Corectura:** „18 → 20”, ca la celelalte rânduri cu mai multe etape.

**17. „Nesting aliniat”, din rândul B13** („Tăieri ghilotină (grilă de tăieturi drepte, nesting aliniat)”), n-are
răspuns în plan. **Corectura:** o frază: e așezarea pe rânduri din etapa 11, sau intră în decizia owner-ului.

**18. „Rămân neatinse”, din BRIEF §7.** Planul numește doar 2 din 6: extensiile Stripe și Trigger Email (linia 498).
Lipsesc domeniul, App Check (configurarea de pe live), conturile de Auth și Secret Manager. **Corectura:** lista
completă, în §5.5 și în riscul 7.

**19. DNS-ul pentru e-mail.** Are termen etapa 15 (linia 654). BRIEF §7 îl pune însă între pașii „din prima săptămână,
altfel blochează lansarea”. **Corectura:** pornit în săptămâna 1; etapa 15 rămâne termenul-limită.

**20. Pașii de configurare nu acoperă ce cer plăcile.** Lista (linia 650) are doar „șubler”. Plăcile din schelet cer:
- șubler de adâncime;
- lere de rază și de joc (plăcile 2, 5, 12, 16);
- comparator (placa 13);
- cântar (placa 19);
- un palpator pentru colțul XY (placa 13); lista are doar „placa de contact pentru Z”;
- o freză reală pentru roundover (placa 16).

**Corectura:** lista din `propunere-simplitate.md` §5.0, completată.

**21. BRIEF §9: „planul se aprobă cu modelul de planșe ales”.** Planul mută alegerea „înainte de etapa 11” (linia 607)
fără să spună că e o abatere. **Corectura:** o frază în lotul 1, cu argumentul din `propunere-valoare.md` §3.7, punctul
8 (etapele 1–10 nu depind de alegere).

**22. Clasele 5 și 7 din LECTII §2.2 nu sunt numite.** Răspunsul există implicit: arborele și relațiile scrise la actul
omului; modelul L / A / C închis de la început. Lipsesc însă mecanismele scrise:
- `switch`-ul exhaustiv, verificat de compilator (`s1` §5, punctul 1);
- perechea incrustației ca relație declarată (doar în schelet, etapa 12);
- autoritatea unică între profilul mașinii și `$$`, exemplu chiar din clasa 1.

**Corectura:** câte o frază în §3.1 sau la T1.

**23. LECTII §4.13 și cauzele 5 și 8 sunt acoperite doar în parte.** Lipsesc:
- cifrele din documente generate sau asertate;
- comentariile care spun ce *este* codul, nu istoria lui;
- un document pe subsistem;
- lecțiile transformate în unelte, de exemplu cârligul împotriva `git add -A` (`estimare.md`, articolul I1);
- regula pentru sesiunile paralele;
- Drive-ul, scos din riscuri față de schelet.

**Corectura:** un paragraf „Cunoașterea” în §5.1.

**24. §9, punctul 4.** „Etapa 1 pornește după lotul 1” contrazice termenele lotului 1 (etapele 2, 9 și 11).
**Corectura:** „după răspunsurile care blochează etapa 1”.

**25. EMF.** `ACOPERIRE` („Scoase la reverificare”) l-a scos din rândul de import. Planul îl tratează însă ca parte din
prag: decizia 8 și pârghia „WMF / EMF ca mesaj”. **Corectura:** EMF scris separat de WMF, ca „peste prag”.

---

## Ce am verificat și e corect

### Cele 65 de rânduri
- **Numărătoarea din `ACOPERIRE`:** A 11, B 14, C 24, D 10, E 0, F 6, G 0, adică 65.
- **Tabelul de etape:** fiecare rând apare o singură dată în §5.3, cu aceeași etapă ca în harta din
  `propunere-simplitate.md` §5.3. Asta ține și pentru rândurile care trec prin mai multe etape: A4 → 26, B7 → 8,
  B14 → 24, F2 → 16, F3 → 13. Niciun rând v1.x sau v2 nu se închide în v1.
- **Modificările din §5.4** nu mută niciun rând. Ele schimbă capacitatea etapelor (constatarea 9), iar deciziile din §8
  schimbă conținutul lui A4 și A5 (constatarea 1).

### Cele 8 funcții din BRIEF §10
Toate au etapă:
- găurirea în pași: etapa 5;
- lista de tăiere: 11;
- senzorul de lungime, colțul XY, override-ul cu jurnalul, planarea: 13;
- fișa de lucru: 15;
- ghidul la prima pornire: 28.

### Adminul
- **Tranșele:** P0 și P1 în etapa 3, P2 în 14, P2+ în 15, P3 în 27, P4 în 28, ca în `admin/RAPORT.md` §5.2. Excepția e
  momentul lui P0 (constatarea 8).
- **Întrebările:** cele patru din `admin` §5.4 sunt deciziile 12–15.
- **Mecanismele:** App Check același pe test și pe live, rolul din `staff/{uid}`, scrierile prin callable, cu audit
  (§3.4).

### Vectorii reali (BRIEF §16.2)

| Punctul | Unde răspunde planul | Stare |
|---|---|---|
| 1. geometria rămâne exactă prin orice operație | T1, T2, T4 (cu R3), T5, T6; etapele 2, 6, 7, 10, 22 | parțial (constatarea 10) |
| 2. exportul scrie entități reale, la scară, cu straturi, deschise în alte programe | T18; etapa 9; decizia 2 cu `CITESTE.md` (ArtCAM, Aspire, AutoCAD / LibreCAD, Inkscape, Illustrator / Corel); decizia 10 pentru EPS / AI | da |
| 3. aproximarea e mică și declarată | T5 (0,01 mm), T6, T7 (0,005 mm, raportat), decizia 16 | parțial (T2) |
| 4. proba: cititor independent + owner-ul | §4.1 (ezdxf, PyMuPDF, fontTools); placa 9 | da |

### Lista de lansare (BRIEF §8)

| Punctul | Unde |
|---|---|
| toate rândurile și cele 8 funcții | etapa 30; §5.4, punctul 4 (Stare + Commit la închiderea fiecărui rând) |
| commit pe fiecare rând | §5.4, punctul 4 |
| fiecare funcție de mașină probată pe placa ei | §4.6 și coloana „Placa probează” (excepțiile: constatarea 6) |
| posturile probate pe controlere reale | rundele din săptămânile 4, 9 și 18; etapele 12 și 29 (constatarea 2) |
| un străin taie fără ajutor | etapa 30; pasul de configurare din etapa 29 |
| plata | etapa 27 (în modul de test), riscul 8, porțile externe |
| partea legală | etapa 27 și pasul de configurare |
| backup, jurnal de erori de server, en + ro | etapa 3 (P0, P1); paritatea en / ro în CI; AI-ul nu e în v1 |
| adminul complet și exersabil pe test | etapa 28 (P4) |
| exportul vectorial probat | etapa 9 |

### Deciziile owner-ului (BRIEF §4, §6, §7, §12, §13)

| Decizia | Unde în plan | Stare |
|---|---|---|
| niveluri cu abonament; conținutul lor, decis înainte de facturare | `shared/`; decizia 21 (etapa 20) | da |
| proba de 14 zile fără card | etapa 14 | da |
| capabilitățile din ziua 1 | glosarul 28, §3.2 | nu are etapă (constatarea 4) |
| exportul și senderul blocate prin convenție; cloud-ul pe server; dreptul de acces doar pe server | glosarul 28, §3.4 | da |
| Stripe în modul de test, cu aceleași produse | §3.4; etapa 27 (detaliul e în schelet) | da |
| feliile alese din etapă; ținta scrisă în plan | §5.1, §5.3 | da |
| „gata”: oracol și hârtie la commit, placă la sfârșitul etapei; până la placă, totul pe test | §4, §4.6, §5.1 | da |
| publicarea: pe test oricând, pe live la sfârșitul etapei, cu confirmare | §5.1, coloana „Live” | da |
| proiectele Firebase refolosite; codul vechi șters la primul deploy | §3.4, §5.5 | da |
| exportul Firestore înaintea primului deploy pe fiecare proiect | pașii de configurare: test în etapa 1, live în etapa 3 | da |
| lista funcțiilor de șters, arătată înainte | §5.5; pasul din etapa 1 | da |
| regiunile mixte | §3.4 (un tabel unic în cod) și marcajul pe declanșatoare | da |
| ce rămâne neatins | §5.5 | parțial (constatarea 18) |
| lista owner-ului cu cel mult 5 lucruri | §8 | contrazisă (constatarea 11) |
| posturi pentru toate controlerele, fiecare probat | decizia 3, etapa 29 | parțial (constatarea 2) |
| senderul și postul știu de axa A | — | lipsește (constatarea 3) |
| un nucleu de simulare și un oracol separat | T10, §4.1 | da |
| oracolul calibrat o dată pe lemn | §4.6, punctul 5 | contrazis (constatarea 5) |

### LECTII §2.2: cele 7 clase de arhitectură

| Clasa | Răspunsul planului |
|---|---|
| 1. un fapt, mai multe autorități | §3.1 principiul 2, §3.2, §3.3 (clasa e numită explicit) |
| 2. textul G-code ca interfață | T8, §3.4, glosarul 16 |
| 3. fără strat de acțiuni | registrul de acțiuni (§3.2, §3.3), dar fără etapă (constatarea 4) |
| 4. logica pusă unde nu se putea testa | §3.3 („niciun test nu citește textul surselor”), uneltele ca mașini de stare, CAM-ul în bazin |
| 5. relații deduse, nu declarate | implicit (arborele; instanța trimite la piesă); nenumită (constatarea 22) |
| 6. model de date incomplet | modelul din §3.2: operații, montaje, resurse după hash, scule ca instantaneu, matrici |
| 7. migrări de reprezentare neterminate | implicit (T1: modelul L / A / C închis de la început); nenumită (constatarea 22) |

### LECTII §2.3: cele 8 cauze de proces

| Cauza | Răspunsul planului |
|---|---|
| 1. fără țintă și fără „gata” | ținta pe etapă și placa (§5.1, §5.3) |
| 2. viteză fără plasă, apoi plasă fără încredere | dovada înaintea funcției (§3.1, principiul 3); otrăvuri alese de altcineva (§4.3); fără recenzii pe fiecare felie (§4.7); CI cu buget pe niveluri (§4.4) |
| 3. verdict fără probă, registru fără gravitate | parțial: „verificarea câștigă” (§1); gravitatea există doar pentru „mașină” (constatarea 13) |
| 4. producția ca mediu de test, owner-ul singurul oracol | live doar după placă; instanța de test; bancul vizual, fără etapă (constatarea 9); riscul 9 |
| 5. contextul pierdut între sesiuni | ADR-uri, `CLAUDE.md`, DEVLOG scurt, riscul 10; parțial (constatarea 23) |
| 6. mașina și lemnul lipsă din buclă | plăcile săptămânale (§4.6) |
| 7. infrastructura înaintea nevoii | §3.1 principiul 6; adminul în tranșe; facturarea în etapa 27. De justificat: copiile în cloud, implicite în etapa 15, cu live-ul deschis doar personalului, deși scheletul le refuza (`propunere-simplitate.md` §5.6) |
| 8. frecarea mediului | `.gitattributes`; repo public cu minute de CI nelimitate; commit-urile doar cu `.md` nu pornesc CI-ul. Parțial: Drive-ul și cârligele lipsesc (constatarea 23) |

### LECTII §4: cele 14 puncte

| Punctul | Unde | Stare |
|---|---|---|
| 1. glosarul și prototipul înaintea schemei | §2, prototipul planșelor, §5.6 | da |
| 2. un document cu un singur arbore | §3.2 | da, dar montajul n-are axă și știfturi (3) |
| 3. modelul de curbă închis din prima zi | T1–T3, T5 | da, fără `switch` exhaustiv (22) |
| 4. IR-ul traseului | T8, §3.4 | da |
| 5. motorul CAM | T7, T12, regiunea păstrată, evenimentele în IR | da; „implicit se lasă material” și bugetul de linii nu sunt scrise în plan (plafoanele sunt în schelet) |
| 6. două motoare de simulare | T10, §4.1, §4.2 | da, cu excepția calibrării (5) |
| 7. strat de acțiuni | §3.2, §3.3 | da, dar fără etapă (4) |
| 8. pânza doar desenează | T13, §3.2 | da; Pointer Events nu sunt pomenite |
| 9. calculul greu în worker, cu anulare | §3.4, `src/jobs/` | da |
| 10. mașina | T9, T20 | parțial: fără N axe și fără `MachinePos` / `WorkPos` (3) |
| 11. cloud-ul | §3.4 | da, cu regiunea mixtă decisă de owner; observabilitatea abia în etapa 3 (8) |
| 12. testele | §4.1–§4.4, §3.3 | da, dar bancul vizual n-are etapă (9) |
| 13. cunoașterea | ADR-uri, DEVLOG scurt | parțial (13, 23) |
| 14. fierul în buclă | §4.6 | da |
