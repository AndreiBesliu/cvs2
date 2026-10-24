# CNC Vector Studio, ediția a doua (nume de lucru: `cncvs2`)

Aplicație web profesională de proiectare vectorială și CAM pentru CNC pe lemn, construită de la zero:
desen sau import de vectori → operații (decupare, buzunar, V-carve, gravare, incrustații) → simulare și
verificare → G-code pentru GRBL → trimis la mașină. Pragul minim e mixul ArtCAM (până la Premium 2018) +
DeskProto; peste el construim. Owner: Andrei.

**De ce de la zero:** în proiectul vechi progresul devenise prea greu, iar procesul de dezvoltare părea
haotic. Ținta nu e o aplicație mai simplă, ci una mai bună, făcută corect de la început.

## Stare (08.10.2026)

- **Faza 0: încheiată.** Concluziile sunt în `LECTII.md`. Rapoartele cu surse sunt în `docs/faza0/`, **doar local**:
  sunt ignorate de git, fiindcă repo-ul e public și ele descriu găuri ale aplicației vechi, încă live.
- **Faza 1 (interviul): încheiată pe 06.10.2026.** Toate deciziile sunt în `BRIEF.md`.
- **Faza 2: încheiată pe 07.10.2026.** **`PLAN.md` e aprobat** de owner. Modelul de planșe e **D**, ales pe 08.10 după
  prototip (ADR 0024, `BRIEF.md` §9).
  - `PLAN.md` e autoritatea pentru arhitectură (deciziile T1–T23), pentru ordinea etapelor și pentru regulile de proces
    (§5.1).
  - Dovezile sunt în `docs/faza2/`: sonde, verificări, propuneri (doar istoric), estimare, critici.
  - Deciziile de la aprobare sunt în `PLAN.md` §8.1 și în `BRIEF.md` (§4 proba închisă, §12 laserul).
- **Pasul 0: încheiat pe 07.10.2026** (`PLAN.md` §5.2), fără cod de produs:
  - `docs/PORTARE.md`: verdictele pentru candidații etapelor 1–3. Se aplică la pornirea etapei 1, dacă owner-ul nu
    obiectează; restul candidaților se judecă înaintea etapei lor;
  - `docs/adr/`: ADR 0001–0023, câte unul pe decizie (T1–T23). O decizie se schimbă doar printr-un ADR nou.
- **Etapa 1 e în lucru din 07.10**, pornită la cererea owner-ului („Continua si testez putin mai incolo”), fără alegerea
  A / D. Fișa și jurnalul feliilor sunt în `docs/etape/etapa-01.md`.
  - Gata: 1.1–1.6, 1.7a (documentul fără arbore), 1.7 (documentul v2, varianta D: piese și instanțe, migrarea
    v1 → v2, IndexedDB cu un singur scriitor, lista de vectori), 1.8 (pânza), 1.9a (placa 1, programele A și B), 1.9b–c
    (canalul, exportul din aplicație) și 1.10 (ieșirea din foaie: avertisment în bara de jos, confirmare la export,
    `BRIEF.md` §16.3).
  - 1.9 încheiată pe 08.10: exportul Firestore de pe proiectul de test e făcut (owner-ul, în bucket-ul
    `cncvectorstudio-test-backup`, `us-central1`), iar adresa principală de test servește aplicația nouă:
    `npm run build && node scripts/publica-test.ts` (doar hosting). `public/sw.js` oprește workerul aplicației vechi.
  - Rămâne placa 1, tăiată de owner.
- **Etapa 2 e în lucru din 08.10** (fișa: `docs/etape/etapa-02.md`), pornită înaintea plăcii 1 la cuvântul owner-ului.
  Gata: 2.1 (gărzile offsetului), 2.2 (operațiile în document: schema v3, ADR 0025) și 2.3a (regiunea păstrată și
  invarianta 2, ADR 0026), 2.3b (sensul de tăiere, ADR 0027, documentul v4), 2.4 (urechile, ADR 0028, documentul v5)
  2.5a (rampa, ADR 0029, documentul v6), 2.5b (intrările și ieșirile, ADR 0030, documentul v7), 2.5c (intrările cu
  rampă, ADR 0031), 2.6 (degajările dog-bone / T-bone, ADR 0032, documentul v8), 2.7a (biarcele, ADR 0033), 2.7b
  (forma „cale”, ADR 0034, documentul v9) și 2.7c (ușa SVG și importul, ADR 0035). Felia 2.7 s-a împărțit în 2.7a–2.7d
  (fișa), încheiată cu 2.7d (regula `nonzero` la ușă, ADR 0036: aranjamentul exact, fără PathKit); apoi 2.8a (carcasa
  interfeței, prototipul B, ales de owner), 2.8b (fișierele lăsate pe planșă) și 2.8-0 (loc în pachetul de pornire).
  **2.3c (contururile deschise, ADR 0037, documentul v10) încheiată pe 16.10**, în sub-feliile 2.3c-0…6 (fișa: pe linie,
  pe stânga / dreapta, despărțirea foii marcată de om, ușa SVG cu liniile deschise, două recenzii, otrăvurile). Urmează
  2.8 (stratul WebGL2 și panoul de proprietăți): 2.8c (panoul editabil) și 2.8d (traseul pe pânză) gata pe 16.10; 2.8e
  (probele independente) gata pe 17.10: 2.8 încheiată, etapa 2 are toate feliile gata. **Fișa plăcii 2 (2.10) gata pe 16.10** (`docs/etape/placa-02.md`);
  rămâne tăierea ei, de owner, după placa 1.
- **Etapa 3 e în lucru din 16.10** (fișa: `docs/etape/etapa-03.md`), după ce etapa 2 și-a terminat feliile fără agenți.
  Cu plăcile 1 și 2 netăiate, `PLAN.md` §4.6 (punctul 7) cere felii fără mașină: întâi observabilitatea (P0), apoi
  senderul, după prima placă tăiată. **3.1 (jurnalul de erori pe server, ADR 0039)** gata pe 16.10: funcțiile `cncvs2`
  (`functions/`, Node 24, codebase separat de cel vechi), `npm run test:emulator`, `npm run publica:functii` (doar pe test).
  **3.3 (personalul, fila Erori, Diagnoza; ADR 0040)** gata pe 16.10: pagina `/admin` pe instanța de test (login Google,
  rolul din `staff/{uid}`), regulile noi publicate, TTL de 90 de zile; `npm run publica:functii` duce funcțiile, regulile și
  indecșii. **3.4a (backup-ul zilnic și marcajele de rulare, ADR 0041)** gata pe 16.10: joburile programate pe test, prima
  rulare pe 17.10 la 03:00 / 05:00. **Loc în pachetul de pornire (ADR 0042)** gata pe 17.10: pornirea 99,1 → 92,3 / 100
  kB, ușa unui proiect salvat plafonată (8 kB). **3.2 (raportorul de erori din client, ADR 0043)** gata pe 18.10: erorile
  ajung în `errorLogs` (pe test: 200 cu token, 401 fără), App Check înregistrat pe test. **3.4b (publicarea pe live, ADR 0044)**: partea fără
  conturi gata pe 18.10 (amprenta `meta/deployment`, `node scripts/publica.ts --instanta test`, workflow-ul `publica`); pe test,
  workflow-ul publică din GitHub (WIF, mediul `test`); pentru live rămân scriptul și mediul `live` (înaintea lui 3.9). **PWA offline
  (ADR 0045, adusă din etapa 4)** gata pe 18.10: aplicația pornește fără rețea de la a doua încărcare, actualizarea e oferită.
  **Estimarea timpului jobului (ADR 0046, adusă din etapa 4)** gata pe 18.10: modelul planificatorului GRBL 1.1h pe G-code-ul
  exportat, profilul mașinii ca date (`src/ir/masina.ts`; `$$` lipit în dialog), rezumatul pe operație și pe sculă în dialogul
  exportului; oracolul independent în `test/oracles/timp.ts`; comparația cu cronometrul vine cu plăcile 2 și 3. Pe 19.10,
  timpul apare și lângă traseu, după fiecare calcul (tasta T), iar `$$`-ul lipit e comun traseului și exportului.
  **Simularea, nucleul CPU, felia 1 din 2 (ADR 0047, adusă din etapa 4)** gata pe 19.10: `src/sim/` (câmpul pe dale de
  16 × 16 în atlas, calculul exact pe celulă cu freza plată, bila și V-ul, trigonometria proprie), bazinul `src/jobs/`
  (rândurile de dale r mod N), oracolul independent `test/oracles/simulare.ts`; amprenta Node = Edge e poartă în e2e;
  harta adâncimilor, volumul și adâncimea în dialogul exportului. **Felia 2 (ADR 0057)** gata pe 24.10: vederea 3D (butonul
  „3D” din extensia barei; `src/app/Vedere3D.tsx`, la cerere), relieful din benzi (`reliefPentru`, blocul 1–16), simularea prin
  bucata calculului exportului (`programSimulare`, `simuleazaRelief`), fereastra de 0,1 mm la apropiere.
  **Documentația admin (ADR 0048)** gata pe 20.10: în `/admin`, fila Roadmap (etapele pe săptămâni, feliile, plăcile, ce
  așteaptă de la owner, cu starea dedusă la fiecare build din fișe) și fila Documentație (planul, fișele, ADR-urile),
  generate în `dist/documentatie/`, doar online; cititorul de markdown comun e `src/docs/` (îl refolosește documentația live).
  **Personalul (ADR 0049, adus din etapa 14)** gata pe 20.10: rolurile custom ca bife din catalogul de permisiuni
  (`shared/personal.ts`; `owner` fix, singurul care administrează), invitațiile pe e-mail, conturile create de owner cu link
  de parolă, fila Personal și fila Cont (un singur cont pe adresă, metodele legate). Treptele `support` / `admin` nu mai dau
  nimic; o permisiune nouă = cod + regulă + probă.
  **Riglele, ghidajele, lipirea și alinierea (ADR 0050, aduse din etapa 6)** gata pe 20.10: ghidajele pe foaie
  (`foaie.ghidaje`, fără schemă nouă), lipirea pură (`src/geom/lipire.ts`), alinierea (`src/geom/aliniere.ts`), totul la
  cerere după prima randare (`src/app/Editare.tsx`); pornirea 99,4 / 100 kB cu ușa (foarte strâmt). **Uneltele de desen
  prin tragere (ADR 0051)** gata pe 20.10, în același modul: dreptunghi, cerc, elipsă, linie, poligon, cu lipirea și
  tastele lor (V, R, O, E, L, P).
  **Transformările și bara de sus (ADR 0052)** gata pe 20.10: mânerele de scalare și rotire pe selecție (`document.transforma`,
  scalarea exactă a geometriei sau refuzul cu motiv; mânerele sunt doar desen, lovitura e geometrică), Alt inversează lipirea,
  uneltele, Lipire, Grilă și alinierea (sub-bară) în bara de sus, raza cercului. **Unealta Transformare, extensia barei și
  editarea formelor după plasare (ADR 0053)** gata pe 20.10: mânerele doar cu unealta Transformare (S); alinierea în extensia
  barei de sus (`#loc-extensie`), strânsă spre stânga la cerere; panoul editează dreptunghiul, cercul, poligonul și elipsa
  (`document.forma`, recunoscute din geometrie, `src/model/formeParametrice.ts`). Pornirea 99,8 / 100 kB cu ușa: ~0,2 kB rămași.
  **Oglindirea (ADR 0054)** gata pe 20.10: orizontal / vertical (Shift+H / Shift+V) din extensia barei, exactă, prin
  reflexia în matricea rădăcinii piesei (`document.transforma`); ce se taie e oglinda (probat pe programul de tăiere).
  **Lipirea mânerelor (ADR 0055)** gata pe 20.10: mânerul de scalare se lipește de ghidaje, foaie, forme și grilă, exact
  pe țintă, doar pe axele pe care le scalează (`transformareManerLipita`).
  **Roadmap-ul în engleză (ADR 0056)** gata pe 24.10: fișele rămân în română, traducerea stă în `docs/traduceri/roadmap.en.json`
  (cheia = amprenta textului român); build-ul scrie și `documentatie/roadmap.en.json`; antetul `/admin` are RO / EN. **Un rând nou
  în fișe (o felie, o cerere, un ADR) cere traducerea în același commit:** `npm run traduceri`, apoi `en` completat (proba din
  nivelul rapid cere zero lipsuri).
  Restul etapei cere o placă tăiată.

**Regulile de proces din plan, pe scurt** (detaliile: `PLAN.md` §4–§5):
- **Feliile:** felia = ~½ zi activă, cu commit și cu proba scrisă înaintea funcției. Feliile se aleg doar din etapa
  curentă; fișa etapei se scrie în `docs/etape/etapa-NN.md`.
- **Depășirea:** la peste 1,5 × bugetul, felia se parchează pe o ramură WIP, întrebarea intră în lista grupată pentru
  owner, iar lucrul continuă cu o felie independentă. Oprire completă doar pentru o felie care mișcă mașina, sau la a
  doua depășire din aceeași etapă.
- **Placa de probă** închide etapa. Live doar după placă și cu confirmarea owner-ului. Recalibrarea vine după etapa 3,
  apoi la fiecare etapă.
- **Începutul fiecărei sesiuni:** starea lui `main` și a ultimei rulări de noapte din CI. Nicio rulare de noapte în
  26 h = roșu. Un CI roșu pe `main` e incidentul numărul unu.
  - Comenzile: `gh run list --workflow rapid.yml --branch main --limit 1` și
    `gh run list --workflow complet.yml --limit 1`.
  - Local, tot nivelul rapid: `npm run rapid`. E2e-ul în Edge: `npm run build && npm run e2e`.
  - Funcțiile, regulile și pagina `/admin` pe emulatoare: `npm run test:emulator` (Java ≥ 21: pe mașina asta, JBR-ul din
    Android Studio, ales de script; în CI, în nivelul complet).
  - Bancul vizual (2.9, `PLAN.md` §4.5): `npm run build && npm run banc` scrie `dist/banc/` (poza, cifra, martorul);
    publicat odată cu aplicația, la `/banc/` pe instanța de test. Otrăvurile: `scripts/otravuri.py`, `docs/otravuri.md`.
- **Cârligul `.claude/hooks/fara-add-all.ts`** refuză `git add -A` / `--all` / `-u` / `.` și `git commit -a` în
  sesiunile deschise în `cncvs2`. O sesiune deschisă din `Apps` nu-l încarcă, deci acolo regula rămâne disciplină.
- **O singură sesiune scrie în repo** la un moment dat; celelalte lucrează în worktree-uri sau doar citesc.
- **DEVLOG-ul e scurt:** `Started` / `Completed`, cu promptul exact și modelul.
- **Fișele și ADR-urile alimentează roadmap-ul și documentația din `/admin`** (ADR 0048), generate la fiecare build. Tabelele
  lor se țin în forma citită de poartă: „Feliile” (`| # | Felia | …`), „Jurnalul feliilor” (`| # | Started | Completed |
  Treceri | Nota |`, câte un rând pe felie, cu `Completed` la final), „Ce îi trebuie owner-ului” (`| Ce | Pentru | Termen |`),
  indexul ADR (un rând pe fiecare fișier); rândurile încep și se termină cu `|`, fără rânduri goale în tabel. O placă tăiată
  primește în fișa ei `**Tăiată:** zz.ll.aaaa`. Un tabel care nu se mai poate citi oprește build-ul, cu fișierul și motivul.

## Surse

- Prompt-ul de pornire, exact: `docs/PROMPT-START.md`.
- Deciziile de arhitectură: `docs/adr/`, citite înainte de a redeschide orice decizie. Portarea din codul vechi:
  `docs/PORTARE.md`.
- Planul: `C:\Users\besli\Desktop\MyWork\Apps\PlanNou-CNC\Plan-CNC-Studio-2.pdf`, aceleași date structurat în
  `CERCETARE-DETALIATA.json` (secțiunile `old`, `spec`, `ref`, `arch`). Se citesc de acolo, nu se
  copiază aici. LECTII.md le verifică, nu le ia de bune.
- Proiectul vechi, **referință, nu șablon**: `C:\Users\besli\Desktop\MyWork\Apps\CNCVectorStudio`, GitHub
  `AndreiBesliu/CncVectorStudio`. Algoritmii verificați acolo (G-code, offset, V-carve, inlay, import, sender,
  simulare) se pot porta după ce owner-ul a văzut ce și de ce. Arhitectura nu se copiază.
- Pragul: `ACOPERIRE-ARTCAM-DESKPROTO.md`. Se ține la zi: Stare (de făcut / în lucru / făcut) + Commit pe
  fiecare rând. **Nimic nu iese din listă fără decizia owner-ului.** ArtCAM și DeskProto sunt referință
  funcțională: fără cod, interfață, texte sau clipart copiate, fără reverse engineering. Carveco se ignoră.

## Reguli de lucru

- **Corectitudinea se demonstrează.** Tot ce mișcă mașina (CAM, G-code, sender) se verifică cu oracole fizice
  (simularea tăierii) și cu valori calculate pe hârtie. Invariante fixe: niciodată mai adânc decât pasul pe
  trecere; freza nu intră greșit în piesă. În 3D: creasta măsurată și suprafața rezultată față de model, în
  toleranță. Mutații (otrăvuri) țintite, pe modulele critice, în fundal. Restul: teste normale + bancul vizual.
- **Felii care se termină cu ceva ce owner-ul poate încerca**, fiecare cu commit. La final: ce merge, cum
  testează, ce a rămas deschis.
- **Owner-ul testează pe instanța de test, după un link, nu din fișiere locale** (cererea lui din 07.10).
  - Proiectul Firebase e `cncvectorstudio-test`, cu adresa principală <https://cncvectorstudio-test.firebaseapp.com/>.
  - Din 08.10, fiecare felie se publică acolo: `npm run build && node scripts/publica-test.ts`. Un canal de
    previzualizare (`node scripts/publica-canal.ts <canal>`) rămâne pentru ce nu trebuie să ajungă pe adresa principală.
  - Funcțiile aplicației vechi rulează încă pe proiectul de test (deploy-ul a fost doar de hosting); lista lor de șters i
    se arată owner-ului în etapa 3 (`PLAN.md` §5.3).
- **Workflow-uri multi-agent doar cu acordul owner-ului**, cu durata și costul în tokeni spuse înainte.
- **Estimări din durate măsurate.** O felie care depășește estimarea cu peste 50 % → stop și întreabă.
- **Pauze curate.** La „pauză”: stop imediat, totul comis (branch WIP dacă nu e gata).
- **Întrebările se strâng și se pun grupat**, cu recomandarea în față. Ce decide owner-ul se scrie aici sau
  în brief.
- **Repo-ul stă în `MyWork\Apps\cncvs2`, adică în Google Drive.** E decizia owner-ului din 05.10.2026, deși
  prompt-ul de pornire cerea altfel. Drive-ul a mai readus fișiere vechi peste munca nouă, așa că git e
  sursa de adevăr:
  - commit des și push pe GitHub după fiecare felie, de îndată ce există remote;
  - un fișier care pare readus la o versiune veche se verifică întâi cu `git status` / `git diff`, înaintea
    oricărei alte acțiuni.
- **Din prima zi:** en + ro prin `t()`, cu paritate verificată de compilator; ErrorBoundary; secretele NU se
  lipesc în chat (owner-ul le pune în `.env.local` sau în Secret Manager); niciodată `git add -A` (stage
  explicit, apoi `git status` + `git show --stat`); deploy pe test liber, pe live doar cu confirmarea
  owner-ului; CI verde mereu.

## Decizii luate

- 16.10.2026: **traseul pe pânză și panoul de proprietăți (ADR 0038, felia 2.8)**: „ok” la implicitul recomandat. Traseul
  ultimului program, pe WebGL2, **la cerere** („Arată traseul”, tasta T; stins cu cip când documentul se schimbă; recalculul
  automat abia cu bazinul din etapa 4); stratul **deasupra** vectorilor, foaia rămâne în worker până la etapa 4; panoul
  editează **poziția, rotirea și foaia**, operațiile rămân în dialogul exportului.
- 05.10.2026: repo-ul stă în `C:\Users\besli\Desktop\MyWork\Apps\cncvs2`. A fost mutat din `C:\dev\cncvs2` la
  cererea owner-ului, ca să lucrăm din `Apps`. Git local, ramura `main`.
- 06.10.2026: remote-ul e **`AndreiBesliu/cvs2`, public**, ales de owner. Se aplică două reguli:
  - `docs/faza0/` nu intră niciodată în repo; a fost scos și din istorie înainte de primul push;
  - înainte de orice push se verifică să nu plece nimic care descrie găuri ale aplicației vechi încă live, și
    niciun secret.
- 06.10.2026: **portarea din codul vechi se evaluează abia după interviu și după planul aprobat**, față de
  arhitectura nouă, nu înainte. Evaluarea se scrie în `docs/PORTARE.md`, iar owner-ul decide pe ea. Fiecare
  candidat (lista de pornire e `LECTII.md` §3.2) primește un verdict:
  - **portat aproape neschimbat;**
  - **adaptat la interfețele noi;**
  - **rescris, cu vechiul ca referință și ca martor;**
  - **lăsat.**

  Verdictul se sprijină pe patru lucruri:
  1. ce dovadă de calitate are în vechi (oracol, valori pe hârtie sau doar structură);
  2. cât se potrivește cu modelul de date, IR-ul și straturile noi;
  3. cât costă adaptarea față de rescriere;
  4. riscurile, inclusiv licențele (de exemplu `marchingsquares` e AGPL-3.0, cu excepție condiționată).

  Regula: nimic portat nu intră fără probele noi ale proiectului (oracol, martor). Ce trece în codul nou e
  re-probat acolo, nu crezut pe cuvânt.

- 13.10.2026: **săgețile de sens doar unde contează** („Sagetile de directie ar trebui sa apara totusi doar cand sunt
  relevante. In principiu cand se selecteaza partea pe care se face frezarea. Cand se face pe.linie este irelevant”):
  săgeata apare doar pe o cale deschisă tăiată pe o parte (stânga / dreapta), nu pe linie (ADR 0037 §12).
- 13.10.2026: **interfața: B e șablonul modern** („ai dreptate, B arata cel mai bine”); se integrează în 2.8a (cu arborele
  proiectului din A și coordonatele în bara de jos, la recomandare). **Mai târziu: un al doilea șablon, clasic** (aproape
  de ArtCAM ca organizare, fără interfață copiată, sau de CNCVS 1), **și interfața personalizabilă** (utilizatorul așază
  uneltele și salvează aranjamentul). „Nu lasa asta sa incurce planul […] decizi tu cand este cel mai bine”: momentul îl
  alege asistentul; 2.8a pregătește doar terenul (bara și panourile din date, după id-urile din registrul de acțiuni).
- 13.10.2026: **contururile deschise (ADR 0037, felia 2.3c)**: „ok” la cele cinci recomandări, cu o schimbare („dar,
  taietura care desparte foaia ar trebui pusa intentionat de utilizator, nu automat”). Stânga / dreapta = partea frezei,
  în sensul desenului; liniile importate primesc o gravură de min(1 mm, grosimea / 2); formele umplute fără Z se închid
  la import, ca în browser; o tăietură pe linie prin foaie într-o piesă dă avertisment; **despărțirea foii o marchează
  utilizatorul** (`despartire: true`, tăiată la urmă), aplicația n-o ghicește; una nemarcată, prin foaie, care atinge
  marginea foii e refuzată la export („ok” la recomandare, 13.10). Tot atunci: 2.3c-3 acum, fără recenzie; recenzia și
  2.3c-4–6 după resetarea săptămânală (17.10), din cauza bugetului comun cu celelalte proiecte.
- 13.10.2026: **carcasa interfeței vine mai devreme** („da, pornește prototipurile”, la recomandarea dată la întrebarea
  owner-ului dacă UI-ul se poate face înainte de etapa 3 fără să mute planul): trei prototipuri independente ale carcasei
  (aranjamentul, tema, componentele), fiecare aplicația reală pe un canal de test, din care owner-ul alege; varianta aleasă
  intră ca felia 2.8a, înaintea panoului de proprietăți (2.8). Uneltele de desen rămân în etapa 6, interfața pentru
  începători în 27–33.
- 10.10.2026: **rampa rămâne oprită implicit** pe formele noi până la placa 1 („Ok” la recomandarea din raportul feliei
  2.5b); pornirea ei din fabrică (ca în ediția întâi) se reia după placă.
- 10.10.2026: **desenul rămâne în etapa 6** („Planul neschimbat”, din trei variante: reordonarea etapei 2 cu panoul de
  proprietăți și importul SVG întâi; un desen minim adus acum; planul neschimbat). Feliile etapei 2 merg în ordinea din
  fișă: 2.5 intrările, 2.6 dog-bone, 2.7 importul SVG, 2.8 panoul de proprietăți.
- 09.10.2026: **sensul de tăiere: urcare implicit, pe fiecare operație** („ok” la recomandare), iar **placa 1 se
  regenerează** cu el (cu M3, urcare = materialul păstrat în dreapta: gaura rămâne în G3, insula trece în G2; cotele
  rămân). Contractul: ADR 0027 (documentul v4).
- 08.10.2026: **planșele: D** („D, ok la toate”), cu cele trei alegeri din prototip. Contractul documentului v2 e în ADR
  0024; un câmp nou cu sens intră doar cu schemă nouă și migrare.
- 07.10.2026: **`PLAN.md` aprobat** (fără A / D, de ales înainte de etapa 1).
  - **Proba închisă** după etapa 14: 1–2 ateliere prietene, doar 2D, conturi invitate, fără plată. Lansarea publică
    rămâne la v1 complet.
  - **Importul:** DGK / PIC scoase din prag; DWG doar mesaj în v1; EPS și AI ≤ 8 prin cititor propriu, limitat; WMF
    propriu. **Exportul AI: nu.**
  - **Fără placă:** găurirea multiplă se acceptă pe simulare și pe octeții postului.
  - **Laserul** owner-ului e Ruida (CO2), deci rândul de laser din v1 e un export vectorial pentru LightBurn / RDWorks,
    fără cod Ruida propriu. G-code-ul de laser GRBL trece în v1.x.

## Deciziile interviului (06.10.2026), pe scurt

Detaliile sunt în `BRIEF.md`; dacă ceva de aici o contrazice, `BRIEF.md` câștigă.

- **Produsul**
  - Pentru **ateliere de producție**.
  - **v1 = tot pragul marcat v1**: 64 de rânduri după triaj (65 din 07.10), plus 8 funcții.
  - Se lansează abia la **v1 complet**, fără beta.
- **Ritmul**
  - Asistentul alege feliile din planul aprobat, iar owner-ul aprobă la sfârșitul fiecărei **etape de ~1
    săptămână**.
  - Fiecare etapă se încheie cu o **placă de probă** tăiată de owner.
  - Pe live se publică la sfârșitul etapei, cu confirmarea owner-ului.
- **Platforma și limbile:** **PWA web**, care pornește offline; en + ro.
- **Comercial**
  - Mai multe niveluri, toate cu abonament. Ce conține fiecare se decide înainte de codul de facturare.
  - Probă de 14 zile fără card.
  - Exportul se blochează prin convenție în client; cloud-ul și AI-ul se blochează pe server.
  - Stripe: aceleași produse ca în ediția întâi. Contul live e blocat pe CAEN.
- **Infrastructura**
  - Aceleași proiecte Firebase (`cncvectorstudio` / `cncvectorstudio-test`), cu codul vechi șters la primul
    deploy nou. Înainte de deploy se face un export Firestore.
  - Domeniul și numele rămân: `cncvectorstudio.com`, CNC Vector Studio.
- **Mașinile**
  - Familia GRBL, cu sender, plus posturi probate pentru NcStudio, Richauto/Syntec și Mach3.
  - Axa A separată; axa a 4-a e în v1.x.
- **Simularea:** un nucleu folosit de ecran și de teste, plus un oracol separat.
- **Planșele:** prototip cu variantele A și D în Faza 2; owner-ul a ales **D** pe 08.10 (ADR 0024).
- **Adăugate pe 07.10** (`BRIEF.md` §16):
  - **adminul intră în v1**, „ca și acum”; momentul îl alege asistentul în planul pe etape;
  - **desenul lucrează și exportă vectori reali**: cercul rămâne cerc prin orice operație, iar exportul scrie
    entități reale la scară exactă, probate cu un cititor independent. Pragul are acum v1 = 65 de rânduri.
