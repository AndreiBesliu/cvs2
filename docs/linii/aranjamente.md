# Aranjamentele (ADR 0250, 0251)

<!-- Adusă din memoria sesiunii principale pe 23.11.2026 (mutarea în cloud). De aici înainte o ține la zi linia, pe ramura ei, odată cu feliile. -->

_CNCVS2, ADR 0250/0251: patru aranjamente la alegere; 28.1↑a–c unite în main; 28.1↑d (tăierea din butoane, Trimite la mașină) GATA 18.11 la c957303b, raportată, neunită; telefonul = doar încarcă și trimite (§7, 18.11)_

Linia aranjamentelor din [sesiunea principală](principala.md) (ADR 0250, feliile 28.1↑–28.7↑, etapa 28 „Cele două interfețe”).

**STAREA, 18.11 15:30: 28.1↑d GATA, raportată, neunită; 28.1↑a–28.1↑c UNITE în `main` (28.1↑c în `4cfe13d2`).**
- **28.1↑d (tăierea din butoane mari, „Trimite la mașină”):** `c957303b` pe `wip/28.1-aranjamente`, împins, cu `main`
  `e88dbc1e` adus (`a4d26178`); canalul servește `c957303bec4c`. Cod `f36b7ad1` (+ probele `a397c18f`, `7f483d0b`),
  documente `09978b7c`, §7 `866cf7c5`, cifrele pe unire `c957303b`. Câmpul `taierea` în `Aranjament`; `taiereButoane.ts`;
  acțiunea `export.trimite` (eticheta în mesajele EDITORULUI: proba registrului le cere acolo); `duInMasina` în App;
  ușile manualului 109. Porțile pe unire: unitare 9 554 / 0, e2e 536 / 538 (ancore:192, trenulet:231 din încărcare, 6 / 6
  singure), 730,2 / 800, pornirea cu ușa 111,1, cu Atelierul 111,4 / 115; otrăvuri 21 / 21 (`test/otravuri/28.1d.py`).
- **Rămâne pentru felia zoomului:** Lipire și Grilă cu nume pe pânză, zoomul de 64 px, gesturile (ideile turei a zecea).
- **Capcane văzute în 28.1↑d:** textul centrat într-un buton iese pe ambele părți, iar `scrollWidth` nu numără stânga →
  proba cere fiecare cuvânt în locul lui (Range pe cuvânt); unealta otrăvurilor lasă `dist/` construit CU ultima otravă
  (refă `vite build` înainte de canal sau de măsurători); filtrele e2e cu nume scurte („rol.spec”, „csp”…) pot prinde
  toată suita (verifică cu `--list`).
- **28.1↑c (Atelierul pe Proiectare, așezarea):** `1f7cbd41` pe `wip/28.1-aranjamente`, împins; cod `bf845ee6`, unirea cu
  `main` `b6aaa54` în `c1c02128` (fără conflicte), documente `1f7cbd41`. Porțile pe unire: unitare 9 476 (3 pe timp, trecute
  singure), e2e 92 / 92 în 12 spec-uri (NU suita întreagă), otrăvuri 16 / 16 cu unealta (`test/otravuri/28.1c.py`),
  pornirea 107,0 (ușa 111,0 / 115), totalul 716,8 / 800, Atelierul 0,30 kB (cu pornirea și ușa 111,3 / 115).
- **Ce a adus 28.1↑c:** `src/ui/aranjamentAtelier.ts` (datele, fără CSS: unit-testabile), `src/ui/atelier.ts` +
  `atelier.css` (bucata), `src/ui/incarcaAranjament.ts` (ARANJAMENTE_DISPONIBILE + `incarcaAranjament`; **un aranjament
  nou intră AICI**); App ține aranjamentul în stare (`alegeAranjament`, cu potrivirea foii); `main.tsx` așteaptă bucata;
  `.nume-unealta` în Editare (ascuns în Insule); poarta mărimii numără bucata Atelierului (plafon 8 kB). Capitole 38, pași 37.
- **28.1↑d (la cuvântul owner-ului):** felul tăierii din butoane mari, − / + la adâncime și pas, cartela frezei, „Trimite
  la mașină” (acțiune nouă), Lipire / Grilă cu nume — tot din planșa „C · Întunecat” (`Atelier.dc.html` în canvas).
- **Capcane văzute în 28.1↑c:** un radio controlat care se bifează abia după o încărcare → în e2e `click()`, nu `check()`;
  extensia care se rupe pe rânduri la sosirea editării mută zona liberă după prima potrivire (App: refit o dată, doar în
  aranjamentele non-Insule); grila Atelierului: `:root` în față (specificitate peste `.aplicatie[data-dreapta]`).
- **Canalul:** <https://cncvectorstudio-test--aranjamente-1bzz1jj7.web.app> (versiunea `c1c021282741`, până pe 17.12).
- **18.11, HOTĂRÂT („1”): pe telefon nu mai lucrăm la desen** (ADR 0250 §7 schimbat, secțiunea „Schimbarea din 18.11”,
  scrisă cu documentele lui 28.1↑d). Ideea owner-ului: pe telefon userii doar încarcă modele gata făcute (salvate / urcate
  în cont) și le trimit la mașină. Ce merge azi pe telefon nu se strică (probele de 390 / 320 px), dar feliile 28.x nu mai
  aduc așezări de desen pentru telefon; planșele de telefon de pe canvas = referință, nu țintă. Fluxul telefonului
  („proiectele mele → Trimite la mașină”) e o felie a liniei Proiectelor (fără ADR), după proiectele în cont (azi: doar 20
  de versiuni locale, fără listă). Primirea lucrărilor (ADR 0126) e de la altă aplicație, nu din cont.
- **Unirea lui 28.1↑c (17.11 seara):** sesiunea principală a primit-o; o unește după incidentul de pe completul lui
  `main` (`trenulet.spec.ts:77`), cu toate porțile, emulatoarele incluse. `main` era atunci `ae5a13c4` (proba vitezei
  luminii `9361c831`, 10.3↑l, 25.3↑e). **Înainte de 28.1↑d: adu `main` cu unirea lui 28.1↑c.**
- **Unirea:** o face sesiunea principală („CNC Vector Studio 2”), cu porțile ei, fără altă întrebare („unește ce se
  poate”). Owner-ul a pornit linia acolo: „Poti sa adopti si sesiunea de design si sa o pornesti”. **Linia e coordonată
  de sesiunea principală:**
  - commit-uri doar pe ramură, nimic direct în `main`;
  - STOP după fiecare felie, cu raportul către ea (SendMessage, numele ei).
- **Felia următoare:** 28.1↑d (panoul Atelierului), apoi ideile pentru 28.1↑ (F6, zona „mesaj”, Shift+F10). Pornește la
  cuvântul owner-ului. **Rândurile meniului contului se caută și în `test/e2e-emulator`** (scăpat la 28.1↑b).
- **Ce a adus 28.1↑b:** `src/app/Aspectul.tsx` + `aspect.css` (la cerere, mesajele din `carcasa`); rândul `aspect` în
  `meniuCont.ts`; `vedere.aspect` în `actiuniVedere.ts` și în `ORIUNDE` (App); `alegereaDeAcum` și `TEME` în
  `alegereAranjament.ts`; F1 în fereastră → capitolul `aspect` (`usaDeAcum`). Numerele pe care le schimbă o felie nouă:
  capitolele manualului (37, `manual.spec`), ușile (108, `manual.test`), pașii testului din aplicație (36).
- **Convenția otrăvurilor:** lista în `test/otravuri/<felie>.py` + un rând în `docs/otravuri.md`, rulată cu
  `scripts/otravuri.py` (`verifica`, `lot`, `e2e`). 28.1↑a a avut-o doar în `.tmp` (nerecuperat).
- **Capcană e2e:** fiecare spec pune `test.use({ locale: 'ro-RO' })`; fără el, Edge pornește aplicația în engleză.
- **Ce a adus 28.1↑a:**
  - `src/ui/alegereAranjament.ts`;
  - `ARANJAMENTE` / `ARANJAMENTE_DISPONIBILE` în `aranjament.ts`: un aranjament nou intră acolo;
  - `data-aranjament` / `data-densitate` pe `<html>`;
  - `--tinta` 48 / 56 la densitatea mare.
- **Probele:** `test/unit/alegereAranjament.test.ts`, `test/e2e/aranjament.spec.ts`; otrăvurile în
  `.tmp/otravuri-281a.mjs` (worktree), 7 / 7.
- **Mărimea, față de `0e3725c`:** +0,5 pornirea, +0,4 totalul.
- **Capcană:** `vite preview` din e2e servește `dist/`, iar `build-determinist` construiește în altă parte. Înaintea
  e2e-ului, `vite build` pe codul de acum (prima rulare a căzut doar din cauza asta).

**STAREA, 13.11 seara: schițele sunt GATA** („Da, sunt gata”, `c248c55`; ADR 0250, „Schițele, încheiate pe 13.11”), cu
toate cele 76 de idei hotărâte. Codul mai așteaptă doar unirea planșelor în `main`: la 13.11, `wip/11.1-plansele` avea
11.5↑ gata și 46 de commit-uri neunite; o face sesiunea principală, la cuvântul owner-ului. **Cererea i-a fost trimisă
sesiunii principale („CNC Vector Studio 2”) pe 13.11, cu „Da, cere-i” al owner-ului;** ea răspunde cu commit-ul unirii.
În aceeași seară, unirea `fecce54` (planșele la `8e8c755`, peste `main` `7cc9800`) era în worktree-ul `unire`, cu porțile
în lucru (~45 min), iar pornirea cu ușa era estimată la ~109,8 / 110. Rețeaua `127.0.9` rămâne liberă pentru
`aranjamente`. Atenție: CI-ul complet de pe `main` era roșu din cauza benzii lui 3.6s (owner-ul a ales „Fix forward”,
`fix/3.6s-anunt`); worktree-ul pornește din `main`-ul cu planșele, cu roșul acela cunoscut.
- **Planșele, unite în `main` pe 13.11: `d62e6b8`.** Tot atunci, **worktree-ul `aranjamente` creat:**
  `C:\Users\besli\cncvs2-lucru\aranjamente`, ramura `wip/28.1-aranjamente` din `d62e6b8`, fără commit-uri încă. Are
  joncțiunile `node_modules` și `functions\node_modules`, iar `.tmp/pw.config.ts` are 4182 în trei locuri
  (`CNCVS2_E2E_RETEA=127.0.9`); `.tmp/pw.emulator.config.ts` și `.tmp/emu.ts` sunt copiate.
  - **Baza măsurată** (`node scripts/build-determinist.ts`, verde): pornirea 105,7, cu ușa 109,7 / 110 kB; totalul
    690,1 / 700; /admin 106,5 / 200.
  - **Plafoanele, ridicate pe 13.11** („Da, 115 ／ 800”): pornirea 115 kB (ADR 0252), totalul 800 kB (ADR 0253). Primul
    commit al liniei e `6c37075`, pe `wip/28.1-aranjamente`, împins; poarta are pornirea cu ușa 109,7 / 115 și totalul
    690,1 / 800. Sesiunea principală știe (mesaj); în `main` intră cu unirea liniei.
  - **Codul AȘTEAPTĂ cuvântul owner-ului:** la „Pornesc felia 28.1↑a…?”, a răspuns „Mai târziu” (13.11). Nu porni fără
    el.
  - **Următorul pas: 28.1↑ în felii mici:**
    - a: tipul `Aranjament` extins, alegerea citită înaintea primei randări, densitatea;
    - b: fereastra Aspectul;
    - c: Atelier pe Proiectare, ca bucată la cerere;
    - apoi ideile acceptate pentru 28.1↑.
  - După reparația lui 3.6s, adu `main` în ramură (banda acoperă Reia).
Apoi urmează worktree-ul `aranjamente`, cu 28.1↑ întâi. O schimbare de design trece întâi pe canvas, apoi în ADR.

- **Cererea, 09.11:** owner-ul a văzut patru direcții de interfață pe canvas și a zis „imi plac toate, si vreau sa fie la
  dispozitia userilor”. Canvas-ul: <https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2> (tip Design; rândurile A–D + rândul
  „Alegerea aranjamentului”: fereastra Aspectul, prima pornire pe calculator și pe telefon).
- **Acceptat pe 10.11** cu 1a, 2b, 3a, 4a (provizoriu), 5a: fontul sistemului; 2b „pe `main`” (schimbat pe 11.11 în
  worktree, mai jos); Pas cu pas e asistentul din prag; alegerea la prima pornire; Atelier întâi.

**Why:** la 2b owner-ul a spus „pot aparea si alte diferente, si deci propun sa facem asta dupa ce mai dezvoltam
design-urile inca putin”.

**How to apply:**
- nu porni codul liniei până nu spune owner-ul că schițele sunt gata și până nu se unesc planșele;
- **11.11, tura a doua de schițe:** toate cele 12 ecrane din 09.11 trecute pe fontul sistemului; în Insule, Importă și
  Exportă vectori ca iconițe, plus Exportă G-code plin, după file, iar căutarea ca iconiță (estimat ~1 216 px la 1280);
  ecrane noi: Atelier pe tabletă (1180×820) și pe telefon (Proiectarea), Pas cu pas pe telefon (pasul 2). Pagina
  canvas-ului salvează singură versiuni (reformatează `canvas.json`): citește-l din nou înainte de orice publicare a lui;
- **11.11, tura a treia:** meniul contului cu „Aspectul…” lângă Manual (Insule); tabla „Tema și butoanele mari” (se
  joacă în Play: aranjament × temă × butoane mari); Atelier „Trimite la mașină” pe tabletă (lista de dinainte de pornire,
  „Doar încarcă în Mașina”, Pornește după toate bifele); meniul de clic dreapta al Clasicului; Pas cu pas cu proiectul gol.
  Idei noi, încă neaprobate: plăcile recente ca preseturi, Shift + F10 pentru meniul de clic dreapta, tutorialul
  utilizatorilor ca intrare în proiectul gol;
- **13.11, tura a patra:** fereastra Imprimanta în Insule (temperaturile doar citite, placa cu piesa anulată, pauza din
  fișier, fișierele, „Din desen…”); Mașina în alarmă în Atelier (ALARM:1, textul din `coduri/texte.ro.ts`, pașii numerotați,
  cifrele nesigure); pasul 5 din Pas cu pas fără mașină legată (alegerea controlerului, NcStudio → 3 fișiere descărcate,
  fișa lucrării); panourile Proiect și Vectori ale Clasicului (straturile după rol, ascunse / blocate doar pe ecran).
  **13.11, „Da, ca Mașina”** (`ec7d7cb`): și Imprimanta urmează aranjamentul, aceleași module; 28.6↑ cuprinde ambele
  ferestre; pe canvas, Imprimanta e desenată în toate patru (13.11: Clasic cu meniul ferestrei „Imprimanta”, Atelier cu
  cifre mari, Pas cu pas ca 3 pași Fișierul / Verificarea / Pornirea, cu bifele „Patul e gol” și filamentul);
- **13.11, tura a cincea:**
  - paleta Ctrl K, aceeași în toate patru: categoriile, scurtătura, motivul pentru rândul dezactivat, cipul „nou în
    paletă”. Acțiunile marcate așa sunt azi doar butoane;
  - tabla Proiectele, idee nouă: mai multe proiecte, fișierul `.cvs2` ca document și lista versiunilor. Azi există
    doar cele 20 de versiuni din IndexedDB, fără listă;
  - tabla Stările: 8 stări × 4 aranjamente, cu textele din `mesaje.ro.ts` și `cont.offline` din `carcasa.ro.ts`.
    Butoanele „Scrie aici”, „Salvează ca fișier…” și „Ce fac?” sunt idei noi;
- **13.11, tura a șasea** (rândul comun):
  - Extensiile, cu Easy 3Draw. În Insule rămâne ce e azi: piesa de puzzle, meniul și fila după Imprimanta. Clasic:
    meniul Extensii, extensia ca filă de document, comanda „extensie”/„ext”. Atelier: fila mare „Extensii”, rânduri
    de 56 px. Pas cu pas: cardul „Unelte din extensii” în pasul 1, extensia ca ocol cu „Înapoi la pasul 1”, instalarea
    din meniul contului. Pentru cod: tipul Aranjament primește locul butonului și al filelor extensiilor;
  - Simularea ca vedere a proiectului, idee nouă. Azi e doar harta adâncimilor din dialogul exportului
    (`PrevizualizareSimulare.tsx`, după descărcare). Insule: Vederile Desenul / Traseul / Simularea. Clasic: filă de
    document + Trasee › Simularea / „simulare”. Atelier: pe toată fila. Pas cu pas: pasul 4. **Vederea 3D (ADR
    0057, butonul „3D”) și Animează (ADR 0099) există azi** (corectat în tura a șaptea: comentariul din
    `PrevizualizareSimulare.tsx` e vechi). Noi sunt doar locul unic și cronologia pe operații;
  - Cele patru la 1024 × 768, cu regulile de strângere, de exemplu Proiectul în filă pe margine (Insule), file
    verticale + „» încă 9” (Clasic), proprietățile în bara de jos (Atelier), numele doar pentru pasul de acum și cel
    următor (Pas cu pas). Lățimile sunt ESTIMATE: proba la 1024 cu fontul lat, ca la 1280;
- **13.11, tura a șaptea, „vreau sa faci toate schitele pana le termini pe toate”: SCHIȚELE SUNT COMPLETE** (v56).
  - **Rândul F de pe canvas:** Importă cu trasarea, Planșele (ADR 0210, de pe ramură), Opțiunile uneltei (Cuțitul),
    Meniul de context, Contul și ajutorul, Ghidul (turul de trei opriri; Pas cu pas n-are tur), Telefon și tabletă
    (Clasic pe telefon → Insule).
  - **Tabla „Harta schițelor”** (x 10640, y 7100) ține tabelul ecran × aranjament și **16 idei cu recomandarea**:
    13 „da” (în 28.x) și 3 „separat” (simularea unică, proiectele multiple, clipboardul).
  - **Ideile, ACCEPTATE pe 13.11 („Da la toate”, `c85cc18`):** felia fiecăreia stă în ADR 0250, „Completarea din
    13.11: ideile din schițe”. „Salvează ca fișier…” vine cu fișierul `.cvs2`, iar „Scrie aici” cu o felie a
    depozitului (1.7). Cele 3 linii separate n-au încă ADR: le pornește owner-ul.
  - **Ce mai așteaptă:** cuvântul owner-ului că schițele sunt gata (n-a fost spus explicit) și unirea planșelor. Abia
    apoi se face worktree-ul.
- **13.11, tura a opta** („Încă o tură”, după „Da la toate”; v58, `c3bc2cf`):
  - **Tablele noi:** Conectarea mașinii, Proiectul gol (A/B/C), Textul (X), Tastatura și focusul (zonele în ordinea
    lui F6, ca idee).
  - **Ideile 17–27, ACCEPTATE pe 13.11** („Da la toate”, `ba876c0`): felia fiecăreia stă în ADR 0250, „Ideile
    turei a opta”. Editarea textului pe loc e linie separată, încă fără ADR. Toate cele 27 de idei sunt acum hotărâte.
  - **Meniurile Clasicului sunt Fișier, Editare, Vedere, Vectori, Trasee, Mașina, Extensii, Ajutor** (ca pe tabla
    Clasic; fără „Ferestre”). Tablele turelor 6–7 aveau altă listă; acum sunt aliniate.
- **13.11, tura a noua** („Încă o tură”; v61):
  - **Tablele noi:** Acțiunile pe forme (extensia barei), Traseul și animația, Mesajele și confirmările, În engleză.
    Numele englezești ale pașilor (Drawing, Cutting, Checking, Simulation, Machine) sunt propuse.
  - **Ideile 28–38, ACCEPTATE pe 13.11** („Da la toate”, `2225a54`), toate în feliile 28.x (ADR 0250, „Ideile
    turei a noua”). Între ele: zona „mesaj” în tipul Aranjament, cu „Anulează” lângă mesaj, și proba fiecărei bare în
    ambele limbi. **Toate cele 38 de idei sunt hotărâte.**
  - Generatorul tablelor: `gen/lot1–7.mjs`, `harta.mjs`, `index.mjs`, `verifica.mjs` (echilibrul etichetelor), în
    scratchpad-ul sesiunii.
- **13.11, tura a zecea** („Încă o tură”; v63): Transformarea și ancora, Nodurile și Pen-ul, Navigarea și ajutoarele,
  Fonturile. **Ideile 39–50 sunt ACCEPTATE pe 13.11** („Da la toate”, `67ac610`): 11 au felia lor în ADR 0250, „Ideile
  turei a zecea”; proba fontului cu textul omului e linie separată, fără ADR. **Toate cele 50 de idei sunt hotărâte.**
  - **Ce lipsește azi și nu trebuie dat drept „azi”:** câmpul de rotire din bara Transformării (rotirea se face din
    mâner), butoanele − / + de pe pânză (zoomul e cu rotița; bara de jos are „Zoom N %” și „Arată toată foaia”) și
    „Descarcă” în Google Fonts (există doar „Folosește”).
  - Rândul F e reașezat fără goluri, iar Harta stă ultima (x 28880).
- **13.11, adminul** („vreau sa faci design si pentru admin”; v65): rândul G (y 10200), 11 table ale lui `/admin`, un singur
  design, nu patru aranjamente: Azi (filă nouă), Erori, Tichete, Sugestii, Utilizatori, Personal, Diagnoză, Roadmap,
  Documentație, Setări și Contul meu, Telefon. Bara laterală e grupată (Probleme, Produs, Clienți, Echipa). Generatorul:
  `gen/admin.mjs`.
  - **Ideile 51–62 sunt ACCEPTATE** („Da la toate”): ADR 0260, linia adminului, cu nota ei: [Adminul reproiectat (ADR 0260)](admin.md).
- **13.11, tura a unsprezecea** („Încă o tură”; v68):
  - **Tablele noi:** Exportă vectori…, Verifică vectorii, Tăierea și rolurile mele, „Din desen…” al imprimantei (rândul
    F, înaintea Hărții, care stă la x 34960, h 3700). Pe rândul G, Admin · Intrarea.
  - **Ideile 63–76 sunt ACCEPTATE** („Da la toate”, `5f56a20`). 63–75 au felia lor în ADR 0250, „Ideile turei a
    unsprezecea”, iar 76 e în ADR 0260, A.1. **Toate cele 76 de idei sunt hotărâte.**
  - Rolurile, după `export.latura.*`: Exterior, Interior, Pe linie, Buzunar, V-carve, Găurire, incrustație în V,
    incrustație cu pereți drepți; Fără rol.
  - **Pagina canvas-ului salvează singură versiuni între publicări** (v60 și v67), iar indexul publicat de mine scrie
    peste ele. Dacă owner-ul a mutat table, pozițiile lui se pierd: spune-i.
  - Verificat în cod: Funcțiile = `logClientError` 401; păstrarea tichetelor are implicitul 365 de zile
    (`SETARI_IMPLICITE`), iar zilele offline 7; azi adminul are o singură regulă sub 640 px; azi se deschide pe Erori.
  - Tablele de pe rândul F le face un generator din scratchpad-ul sesiunii (`gen/sablon.mjs`), care se pierde cu ea.
    O tablă nouă se poate scrie și de mână, pe același tipar.
- **11.11, decizia owner-ului: „o sa mergem pe design-ul creat acolo”** (designul acestei linii). Mutarea lui Importă /
  Exportă vectorii / Exportă G-code lângă fila Imprimanta (09.11, linia tăierii) NU se mai unește; locul lor îl stabilesc
  aranjamentele. Schița acelei mutări, cu măsurători la 1280 / 1024 / 390 / 320 px și fontul lat:
  <https://claude.ai/artifact/94AHZeAD9KvEmZsBt6MQW6> (referință). În `main` rămâne bifa „Închide bucățile” în panoul
  Cuțitului, provizoriu;
- **bara de sus se probează la 1280 px cu fontul lat** (`test/e2e/ancore.spec.ts`, Verdana / DejaVu Sans; CI-ul a căzut pe
  asta pe 09.11): fiecare aranjament o păstrează sau o înlocuiește cu proba lui;
- **checkout-ul principal e comun cu sesiunea principală** (unirile): înainte de un commit acolo, `git status` fără
  fișierele ei necomise;
- **11.11, „Worktree după planșe”** (înlocuiește 2b, `5e4caa2`): codul (28.x) în worktree-ul `aranjamente`,
  `C:\Users\besli\cncvs2-lucru\aranjamente`, ramura `wip/28.1-aranjamente`, e2e pe 4182 și `127.0.9`, făcut din `main`
  DUPĂ unirea planșelor; unirea înapoi o face sesiunea principală, la cuvântul owner-ului;
- meniurile Clasicului (harta pe canvas, 10.11): din 58 de rânduri, 24 sunt azi acțiuni ale registrului, 23 sunt doar
  butoane sau panouri ale barei de desen ori ale ferestrei Mașina (unelte, aliniere, oglindire, offset, boolean,
  verificare, export vectori, 3D, comenzile mașinii), 4 vin din meniul contului, 7 sunt noi (proiect nou / deschide /
  recente, selectează tot, Aspectul, scurtăturile, despre); deci 28.2↑ începe cu mutarea celor 23 în registru;
- linia de comandă a Clasicului: ADR 0251 acceptat 10.11 („Da, 1a–3a”): numele RO + EN, „/” aduce cursorul, Enter pe linia
  goală doar aduce ultima comandă; prototipul ei merge în Play pe canvas (B · Linia de comandă);
- totalul era 654,4 / 700 kB la acceptare (la fel pe 11.11, pornirea cu ușa 105,9 / 110); cu planșele și linia ~713, deci
  decizie pe plafon la prima felie care trece; planșele se unesc primele (conflicte în ~12 fișiere, pornirea aproape de 110).

- **16.11: sesiunea „Variante design CVS2” (`local_dac011f6-ed6e-48c7-93ce-549a2c8bcee3`) ADOPTATĂ de sesiunea principală** („Poti sa adopti si sesiunea de design si sa o pornesti”): nu e în familia legată (n-a pornit-o sesiunea principală), dar e coordonată ca o linie. Pornită pe 28.1↑ (28.1↑a întâi) în worktree-ul `aranjamente` (4182, `127.0.9`); commit-urile DOAR pe `wip/28.1-aranjamente`, nimic direct în `main`; unirea, a sesiunii principale (cu „unește ce se poate” al owner-ului). E în modul „prompting”: mesajele altor sesiuni pot aștepta acolo aprobarea owner-ului (primul mesaj din 16.11 n-a ajuns în 20 s; al doilea, pus în coadă).
