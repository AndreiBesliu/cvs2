# CNC Vector Studio, ediția a doua (nume de lucru: `cncvs2`)

Aplicație web profesională de proiectare vectorială și CAM pentru CNC pe lemn, construită de la zero:
desen sau import de vectori → operații (decupare, buzunar, V-carve, gravare, incrustații) → simulare și
verificare → G-code pentru GRBL → trimis la mașină. Pragul minim e mixul ArtCAM (până la Premium 2018) +
DeskProto; peste el construim. Owner: Andrei.

**De ce de la zero:** în proiectul vechi progresul devenise prea greu, iar procesul de dezvoltare părea
haotic. Ținta nu e o aplicație mai simplă, ci una mai bună, făcută corect de la început.

## Stare (06.10.2026)

- **Faza 0: încheiată.** Concluziile sunt în `LECTII.md`. Citește-l înainte de orice decizie de arhitectură sau
  de proces. Rapoartele cu surse (module, planșe, cronologie, verificări) sunt în `docs/faza0/`, **doar local**:
  sunt ignorate de git, fiindcă repo-ul e public și ele descriu găuri ale aplicației vechi, încă live.
- **Faza 1 (interviul): încheiată pe 06.10.2026.** Toate deciziile sunt în `BRIEF.md`. Citește-l împreună cu
  `LECTII.md` înainte de Faza 2.
- **Urmează Faza 2: arhitectura, în plan mode.** **Fără cod până la aprobarea planului.** Faza 2 conține:
  - prototipul clicabil al planșelor, cu variantele A și D pe 8 scenarii, încercat de owner înainte de aprobare;
  - sondele pentru alegerile riscante;
  - estimarea pe etape săptămânale, din durate măsurate.
- **După planul aprobat: evaluarea portării** (decizia owner-ului din 06.10.2026). Owner-ul primește un răspuns
  la întrebarea „ce din codul vechi se poate integra eficient și bine în codul nou”. Detaliile sunt la
  „Decizii luate”.

## Surse

- Prompt-ul de pornire, exact: `docs/PROMPT-START.md`.
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
