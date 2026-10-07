# CNC Vector Studio, ediția a doua (nume de lucru: `cncvs2`)

Aplicație web profesională de proiectare vectorială și CAM pentru CNC pe lemn, construită de la zero:
desen sau import de vectori → operații (decupare, buzunar, V-carve, gravare, incrustații) → simulare și
verificare → G-code pentru GRBL → trimis la mașină. Pragul minim e mixul ArtCAM (până la Premium 2018) +
DeskProto; peste el construim. Owner: Andrei.

**De ce de la zero:** în proiectul vechi progresul devenise prea greu, iar procesul de dezvoltare părea
haotic. Ținta nu e o aplicație mai simplă, ci una mai bună, făcută corect de la început.

## Stare (07.10.2026)

- **Faza 0: încheiată.** Concluziile sunt în `LECTII.md`. Rapoartele cu surse sunt în `docs/faza0/`, **doar local**:
  sunt ignorate de git, fiindcă repo-ul e public și ele descriu găuri ale aplicației vechi, încă live.
- **Faza 1 (interviul): încheiată pe 06.10.2026.** Toate deciziile sunt în `BRIEF.md`.
- **Faza 2: încheiată pe 07.10.2026.** **`PLAN.md` e aprobat** de owner, fără modelul de planșe (A / D), pe care îl
  alege după prototip, **înainte de etapa 1**.
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
  - Gata: 1.1–1.6, 1.7a (documentul fără arbore), 1.8 (pânza), 1.9a (placa 1, programele A și B), 1.9b–c (canalul,
    exportul din aplicație) și 1.10 (ieșirea din foaie: avertisment în bara de jos, confirmare la export, `BRIEF.md`
    §16.3).
  - Owner-ul a încercat prototipul planșelor pe 07.10: notițele arată spre D, cuvântul lui e încă deschis (`BRIEF.md` §9).
  - Rămân:
    - 1.7, arborele variantei alese, ca migrare v1 → v2, după alegerea A / D;
    - 1.9, hosting pe adresa principală de test, după exportul Firestore confirmat de owner.
  - Până atunci, aplicația se încearcă pe canalul `etapa-01`: `npm run build && node scripts/publica-canal.ts etapa-01`.

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
- **Cârligul `.claude/hooks/fara-add-all.ts`** refuză `git add -A` / `--all` / `-u` / `.` și `git commit -a` în
  sesiunile deschise în `cncvs2`. O sesiune deschisă din `Apps` nu-l încarcă, deci acolo regula rămâne disciplină.
- **O singură sesiune scrie în repo** la un moment dat; celelalte lucrează în worktree-uri sau doar citesc.
- **DEVLOG-ul e scurt:** `Started` / `Completed`, cu promptul exact și modelul.

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
  - De la etapa 1, fiecare felie se publică acolo, după exportul Firestore confirmat de owner (`PLAN.md` §5.3).
  - Până atunci, adresa principală servește aplicația veche. Ce trebuie încercat mai devreme (de exemplu prototipul
    A / D) merge pe un canal de previzualizare (`firebase hosting:channel:deploy <canal> --project test`), care nu
    atinge adresa principală.
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
- **Planșele:** prototip cu variantele A și D în Faza 2, înainte de aprobarea planului.
- **Adăugate pe 07.10** (`BRIEF.md` §16):
  - **adminul intră în v1**, „ca și acum”; momentul îl alege asistentul în planul pe etape;
  - **desenul lucrează și exportă vectori reali**: cercul rămâne cerc prin orice operație, iar exportul scrie
    entități reale la scară exactă, probate cu un cititor independent. Pragul are acum v1 = 65 de rânduri.
