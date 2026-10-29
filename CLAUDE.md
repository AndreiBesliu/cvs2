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
  **Manualul utilizatorului (ADR 0058)** gata pe 24.10: `docs/manual/ro.md` și `en.md`, generate în `manual/*.json` (în
  precache), deschise cu „?” sau F1 (după context). **Un buton, o acțiune sau o etichetă nouă cere capitolul ei în ambele
  limbi** (`%% acopera:`), altfel `test/unit/manual.test.ts` cade; o tastă nouă intră în capitolul scurtăturilor.
  **Selecția cu dreptunghi (ADR 0059)** gata pe 24.10: spre dreapta fereastra, spre stânga intersecția (conturul atins),
  Shift adaugă; gestul în modulul editării (`Editare.tsx`, captură înaintea pânzei), geometria în `src/geom/cadru.ts`.
  **Rigla pe marginea foii (ADR 0060)** gata pe 24.10: lungă cât foaia, mutată cu ea, și pe sub bare și panouri (cererea
  owner-ului); linia de cotă pentru formele care ies din foaie (`pozitiaRiglelor`, `cotePeste` în `src/canvas/gradatii.ts`).
  **Copierea în rețea și pe cerc (ADR 0061)** gata pe 24.10: `document.copiaza-in-retea`, un pas, piese independente; panoul
  din extensia barei (secțiunea Copiere), cu verdictul comun acțiunii (`motivCopiereRetea`); calculul pur în `src/model/retea.ts`.
  **Editarea nodurilor (ADR 0062)** gata pe 24.10: unealta Noduri (N), prin `document.forma` (nimic nou în pornire); mutarea cu
  lipirea, nodul nou exact pe linie, arc și cubică, scoaterea doar dintre linii; calculul pur în `src/model/noduri.ts`.
  **Unealta Pen și tipurile nodurilor (ADR 0063)** gata pe 24.10: Pen-ul (B) prin `document.deseneaza`; colț / curbă pe ambele
  părți / pe o parte, deduse din mânere (fără schemă nouă), schimbate din bara de sus în unealta Noduri; arcele nu primesc mâner.
  **Offsetul în desen (ADR 0064)** gata pe 25.10: panoul din extensia barei, motorul CAM (`offsetInchis`), adus la cerere;
  formele noi prin `document.deseneaza`, care primește și o listă (un pas). Pornirea neschimbată.
  **Înclinarea (ADR 0065)** gata pe 25.10: `fel: 'inclinare'` în `document.transforma`, exactă în geometrie (W⁻¹·H·W), arcele
  refuzate; panoul din secțiunea Oglindire; panourile extensiei = o singură stare (`panou`).
  **Copierea de-a lungul unei curbe (ADR 0066)** gata pe 25.10: felul `curba` al rețelei, curba = ultima formă aleasă (Shift +
  clic); locurile la distanțe egale pe lungime (`src/model/curba.ts`). Rândul „Transformare și copiere” e complet.
  **Booleanul (ADR 0067)** gata pe 25.10: Unește / Scade / Intersectează pe două forme închise, prin cavalier (`booleanContururi`
  în fațada `geom/offset.ts`); rezultatul le înlocuiește într-un pas (`document.deseneaza` cu `sterge` și `gauri`).
  **Orice nod își schimbă tipul (ADR 0068)** gata pe 25.10: arcele vecine devin cubice la cerere (sub 0,001 mm), unealta Noduri
  editează fiecare contur al pieselor compuse (`document.forma` cu `nodEditat`). Urmează testul pas cu pas al owner-ului.
  **Buzunarul (ADR 0069, adus din etapa 5)** gata pe 25.10, cât owner-ul face testul, pe un canal de previzualizare: documentul
  v11 (`tip: 'buzunar'`, `pasLateral` ≤ D / 2); inelele paralele cu conturul, dinăuntru în afară (`src/cam/buzunar.ts`); o
  singură freză. **Insulele (ADR 0073)** gata pe 25.10: buzunarele de aceeași adâncime de pe foaie sunt unul singur, citit
  par-impar, peste piese (`offsetRegiune` în fațada offsetului); cu altă adâncime, treaptă.
  **Oracolul documentului v11 e scris de sesiunea aplicației, nu independent**: de reluat. Ușa unui proiect salvat e
  despărțită (ADR 0070): la pornire doar `usaCurenta.ts`, migrările (`migrari.ts`) doar pentru un document vechi; pornirea cu
  ușa 98,6 / 100 kB (~1,4 kB liberi).
  **Testul pas cu pas, în aplicație (ADR 0072)** gata pe 25.10: butonul Test din extensie (în afara instanței live), pașii în
  `docs/tutorial/unelte-desen.md` (generați în `dist/tutorial/`), poza planșei compusă local, raportul HTML descărcat; totul în
  browser (IndexedDB `cncvs2-test`); bucata `TestPasCuPas` e doar online, cu plafonul ei (12 kB), în afara totalului (330 kB din 25.10, ADR 0075).
  **Tasta fiecărei unelte pe butonul ei** gata pe 25.10 (cererea owner-ului): litera în colțul dreapta-jos (`TASTA_UNELTEI`, din
  aceeași hartă ca scurtăturile).
  **Testul owner-ului făcut pe 25.10** (29 de pași bine, 2 nemarcați). **Remedierile din notele lui (ADR 0074)** gata pe 25.10:
  clicul alege conturul cel mai apropiat, apoi forma cea mai mică; colțurile offsetului din desen ca originalul (implicit) sau
  rotunjite (`src/geom/colturi.ts`); copierea pe curbă pe ea / la stânga / la dreapta; Pen: dublu clic închide, anularea în
  desen, Ctrl+Shift+Z redeschide; Alt și C unesc mânerele; cronologia roadmap-ului cu feliile aduse (↑N). **Coborârea în buzunar
  (ADR 0076, documentul v12)** gata pe 25.10: plonjare (implicit), rampă pe inel, zigzag sau elice, cu unghiul, lungimea și
  raza în fereastra exportului (`src/cam/coborare.ts`); elicea care nu încape coboară pe inel, cu avertisment. **Progresul
  etapelor viitoare în cronologie (ADR 0077)** gata pe 25.10: bara unei etape fără fișă se umple din rândurile de prag pe care
  le închide (coloana „Închide” × `ACOPERIRE`); un rând nou în prag schimbă cronologia la build. **Înclinarea formelor cu arce
  (ADR 0078)** gata pe 25.10: bifa „Arcele devin curbe” în panou, cercul devine elipsă, sub 0,001 mm după înclinare. **Emulatorul
  GRBL 1.1h (ADR 0079, felia 3.5a)** gata pe 25.10: fixtura senderului în `test/emulator/` (numără ce primește), 100 000 de
  linii fără pierderi, programele plăcilor 1 și 2 rejucate; owner-ul: etapa 3 continuă fără placă (chenarul Transformării, mai
  târziu). **Fluxul senderului
  (ADR 0080, felia 3.6a)** gata pe 26.10: `src/machine/` (`program.ts` încărcarea și refuzurile, `raspunsuri.ts` rapoartele pe N
  axe, `flux.ts` mașina de stare pură, `pas(stare, eveniment)`), probat pe emulator. **Panoul mașinii (ADR 0081, felia 3.6b)** gata pe 26.10:
  sesiunea (`src/machine/sesiune.ts`), portul Web Serial, mașina simulată doar pe test (`MasinaSimulata`, doar online), panoul în
  docul din dreapta (`vedere.masina`). **Jog-ul, zero-ul și palparea Z (ADR 0082, felia 3.7a)** gata pe 26.10, pe mașina simulată:
  procedurile pure (`src/machine/proceduri.ts`), zero-ul și palparea în WCS-ul programului, WCS-ul activ citit (`$G`), starea
  modală pusă la loc după palpare; placa simulată la Z −25. 3.7b (aceleași pe mașină) cere placa de contact a owner-ului.
  **Postul familiei GRBL (ADR 0083, felia 3.8a)** gata pe 26.10: contractele grblHAL și FluidNC (`src/post/contracte/`), inch cu
  5 zecimale, schimbarea sculei ca eveniment în IR (`schimba-scula`), cu 4 strategii și blocul de după `M6`, probată prin sender
  pe emulator. **Joburile cu mai multe freze (ADR 0084, felia 3.8b)** gata pe 26.10: freza pe fiecare rând al exportului (T, Ø),
  jobul CAM cu diametrul fiecărei tăieturi, ordinea programului grupată pe freză în clasă (`grupeazaPeScula`; lista documentului
  rămâne contractul), simularea peste schimbări (`apoi`), estimarea cu opririle senderului, fișierele separate numerotate.
  **Dicționarul codurilor controlerului (ADR 0085, felia 3.6c)** gata pe 26.10: `error:N` / `ALARM:N` explicate în panoul mașinii
  (un card sub stare: ce, unde, ce faci, butoanele), după tabelul familiei controlerului (`src/machine/coduri/`, numerele din
  sursele firmware-ului; familia din banner și `$I`); textele, date în precache (`coduri/*.json`, generate la build), nu JavaScript;
  deblocarea după o alarmă care pierde poziția cere confirmarea. **Un cod nou al unui controler = rând în tabel + text în ambele
  limbi** (proba numerelor din `test/unit/coduri.test.ts` se schimbă doar cu sursa citată).
  **Mesajele modulelor la cerere, ca date (ADR 0086, felia 3.K)** gata pe 26.10: textele editării, exportului, mașinii,
  importului, carcasei, traseului și simulării stau în `mesaje/<modul>.json` (generate din `src/i18n/<modul>.en.ts` / `.ro.ts`,
  în precache), nu în JavaScript; totalul 328,2 → 304,3 / 330 kB. **Un modul nou la cerere care folosește aceste texte exportă
  `mesaje = mesajeGata()` și se încarcă cu `.then(cuMesaje)`** (compilatorul cere exportul); `/admin` și testul pas cu pas
  rămân în cod (dicționarele de bază sunt date din 28.10, ADR 0095).
  **Găurirea (ADR 0087, documentul v13, adusă din etapa 5)** gata pe 26.10: `tip: 'gaurire'` pe cercuri (`src/cam/gaurire.ts`):
  cercul cât freza (± 0,02 mm) ciocănit în centru, cu `retragereCompleta` (ieșirea la al N-lea pas), cel până la 2·D în elice
  pe perete, restul refuzat; doar G0–G3, fără ciclurile fixe; în fereastra exportului doar pe rândurile numai cu cercuri.
  **Exportul 2D, DXF R2007 și SVG (ADR 0088, adus din etapa 9)** gata pe 26.10: „Exportă vectori” în extensia barei; scriitorii
  proprii în `src/io/` (`vectori.ts`, `dxfExport.ts`, `svgExport.ts`), la cerere; straturile = rolurile. **Oracolul independent
  e Python** (`test/oracles-py/export2d.py`, ezdxf 1.4.4, în CI în jobul `oracol-export2d` al nivelului rapid; local: `python -m venv .tmp/venv-export2d`, apoi
  `pip install -r test/oracles-py/requirements.txt`), pe corpusul din `scripts/export2d-corpus.ts`: un caz nou = descrierea în
  corpus + valorile pe hârtie în oracol. **PDF și EPS (ADR 0089)** gata pe 27.10: arcele din cubice sub 0,001 mm (`cubice.ts`),
  PDF 1.5 cu straturi OCG, EPS fără straturi; oracolul: PyMuPDF, un cititor direct al EPS-ului și Ghostscript (CI: `apt`; local:
  `.tmp/eps2pdf.cjs` cu `@jspawn/ghostscript-wasm` despachetat în `.tmp/gs-wasm`). DXF R12 doar dacă un program îl cere.
  **V-carve-ul (ADR 0090, documentul v14, adus din etapa 8)** gata pe 27.10: freza are o formă (`scula.forma`: `v` cu unghiul;
  lipsă = plată), aleasă pe rândul exportului; `tip: 'vcarve'` pe contururi închise, citite par-impar ca o regiune; axa medială în
  `src/cam/axaMediala.ts` (Delaunay pe eșantioane, `delaunator` + `robust-predicates`, raza recalculată exact), traseul în
  `src/cam/vcarve.ts`; probele: oracolul simulării cu conul V, față de suprafața ideală −min(D, d·cot(θ/2)) pe hârtie.
  **Fundul plat cu freza dreaptă (ADR 0091, documentul v15)** gata pe 27.10: `fundPlat: { scula, pasLateral }` pe V-carve;
  întâi freza dreaptă (buzunarul pe fiecare nivel, în {d ≥ L·tan(θ/2) + 0,002}), apoi V-ul, cu axa doar unde ea n-ajunge și inele
  dese (creasta 0,05) în colțuri; prima sculă a programului e prima montată. Probele: oracolul judecă programul tăiat la
  `T… M6`, pe sculă, cu suprafețele unite prin minim.
  **Gravarea pe linie cu freza în V și gravarea inteligentă (ADR 0092, documentul v16)** gata pe 27.10: vârful plat al frezei în
  V (`scula.forma.varf`, freza de gravare), în simulare (`src/sim/nucleu.ts`, conul trunchiat) și în CAM; freza în V doar pe linie
  sau în V-carve (pe o parte, într-un buzunar, la găurire, refuzată: teșirea e a etapei 16); direcția pe linie (`directie`: invers,
  cel mai scurt drum); gravarea inteligentă = V-carve-ul cu fundul plat și freza de gravare. Oracolul simulării n-are un V cu vârf:
  freza i se dă ca sculă de profil.
  **Frezele de rest (ADR 0093, documentul v17)** gata pe 27.10: `rest` pe buzunar și pe fundul plat; fiecare freză mai mică doar
  unde cea dinainte n-a ajuns (`src/cam/rest.ts`: inelele ei la peste R_a − R de zona centrului celei dinainte), pe aceleași treceri;
  fundul plat al V-carve-ului (gravarea inteligentă) cu mai multe freze drepte. Totalul 328,0 / 330 kB: strâmt.
  **Strategia paralelă a buzunarului (ADR 0094, documentul v18)** gata pe 27.10: `strategie: { fel: 'paralel', unghi }`; liniile
  în zigzag (`src/cam/paralel.ts`), apoi trecerea de profil pe margine; aceeași acoperire ca inelele. **Totalul 329,2 / 330 kB: o
  felie nouă cu cod în plus cere întâi loc în pachet** (owner-ul decide: plafonul sau mutarea unui modul la cerere).
  **Dicționarele de bază ca date (ADR 0095)** gata pe 28.10: `mesaje/ro.json` și `mesaje/en.json`, aduse de `incarcaLimba`
  înaintea primei randări (aceeași rezervă, același ecran „fără texte”), `/mesaje/**` fără cache pe Hosting. **Totalul 325,0 /
  330 kB, pornirea 96,2 (cu ușa 99,7: strâmt).** Pârghiile mai mari (workerul PWA fără Workbox ~4 kB, Preact ~55 kB) sunt
  decizii ale owner-ului.
  **Plafonul total 400 kB (ADR 0096, decizia owner-ului) și progresul instalării (ADR 0097)** gata pe 28.10: cât workerul nou
  se instalează, bara de jos arată „Se descarcă versiunea nouă: N %” (la prima vizită, „Pregătesc lucrul offline: N %”), apoi
  oferta; procentul vine din mărimile scrise în manifest (`marime`, cerute de poarta build-ului), adunate de pluginul
  `src/pwa/progres.ts`; fila ascultă înaintea lui `register()` (care stă la coadă cât instalarea găsită de navigare).
  **Totalul 326,1 / 400 kB, pornirea 96,3 (cu ușa 99,8 / 100: strâmt).**
  **Harta importurilor (ADR 0098)** gata pe 28.10: bucățile se importă după nume stabile (`build.chunkImportMap`), traduse de
  harta din `index.html`, deci o publicare redenumește doar bucățile schimbate (înainte: ~72 % din octeți la fiecare publicare).
  **Harta e un script inline: amprenta ei intră în CSP** (meta-ul, scris în `generateBundle`, și antetul scris de publicare din
  `dist/index.html`); orice alt script inline e refuzat. Versiunea stă în `<meta name="cncvs2-versiune">` (`shared/versiune.ts`),
  nu în JavaScript. Poarta: un build cu altă versiune schimbă doar `index.html` și `sw.js`.
  **Animația traseului (ADR 0099, adusă din etapa 5)** gata pe 28.10: „Animează” lângă timpul jobului; panoul (rulează / pauză,
  pașii, viteza, glisorul, citirile) și freza cu drumul parcurs pe pânză (`src/canvas/StratAnimatie.tsx`, montat de stratul
  traseului); timpul fiecărei mișcări din estimarea planificatorului pe liniile postului (`liniiMiscari`, suma = timpul din
  cip); modelul pur în `src/sim/animatie.ts`, playerul în `src/ui/actiuniAnimatie.ts`. **Pornirea cu ușa 99,9 / 100 kB:**
  fiecare bucată nouă la cerere, comună mai multor module, adaugă un nume în lista de preîncărcare din pornire.
  **Plafonul pornirii 110 kB (ADR 0100, decizia owner-ului) și importul DXF (ADR 0101, adus din etapa 9)** gata pe 28.10:
  „Importă SVG / DXF…” citește DXF-ul ASCII (`src/io/dxf.ts`, cititor propriu): unitățile din $INSUNITS (lipsă: mm, cu
  alegerea în dialog), entitățile cu OCS-ul (0, 0, ±1), blocurile (INSERT, MINSERT, stratul 0 moștenit), spline-urile în
  Bézier exact (forma polară, și periodice), bucățile deschise legate capăt la capăt pe același strat; desenul stă unde e în
  fișier (`pozitie: 'fisier'`), cu stratul ca nume. Verificările căii (plafonul, praful, linia fără arie) sunt comune ușilor,
  în `src/io/caleImport.ts`. **Corpusul DXF e Python** (`test/oracles-py/dxf_import_corpus.py`, ezdxf): un caz nou = entitatea
  în generator + valoarea pe hârtie, verificată acolo față de ezdxf, apoi `test/fixtures/dxf/` regenerat și comis. **Pornirea
  96,5 (cu ușa 100,0 / 110 kB), totalul 338,3 / 400.**
  **Scalarea pieselor cu arce plate (ADR 0102)** gata pe 28.10: arcul care ar trece de 10 m la mărire devine cubice (sub
  0,000001 mm), refuzul ușii se spune lângă mânere. **Degruparea (ADR 0103)** gata pe 28.10: o piesă-grup se desface în
  câte o piesă pe contur (butonul de lângă boolean, meniul de clic dreapta, Ctrl+Shift+G), cu G-code-ul neschimbat; comanda
  `degrupeaza` / `regrupeaza` e liniară. **Pornirea 97,1 (cu ușa 100,6 / 110 kB), totalul 341,0 / 400.**
  **Importul PDF și AI (ADR 0104)** gata pe 29.10: „Importă SVG / DXF / PDF / AI…” citește o pagină a unui PDF (și AI-ul
  de la Illustrator 9, care e PDF), aleasă din listă, cu un cititor propriu (`src/io/pdfObiecte.ts`, `src/io/pdf.ts`):
  desenul unde era pe pagină, straturile ca nume, textul și imaginile sărite, PostScript-ul și fișierele protejate refuzate.
  **Corpusul PDF e Python** (`test/oracles-py/pdf_import_corpus.py`, PyMuPDF): un caz nou = desenul în generator + valoarea
  pe hârtie, verificată acolo față de MuPDF, apoi `test/fixtures/pdf/` regenerat și comis. **Fișierele stau împreună** în
  bara de sus (importul, „Exportă vectori”, „Exportă G-code”; controlul `vectori` al aranjamentului, umplut de editare).
  **Pornirea 97,2 (cu ușa 100,7 / 110 kB), totalul 349,7 / 400.**
  **Textul (ADR 0105, felia 7.1↑, adusă din etapa 7)** gata pe 29.10: unealta Text (X), cititorul TrueType propriu
  (`src/text/`), înălțimea majusculei verificată pe H, blocul editabil pe rădăcina piesei (legat de contururi prin amprentă,
  nu o schemă nouă), Roboto și Droid Serif incluse (`public/fonturi/`, Apache 2.0, în precache). **Corpusul textului e
  Python** (`test/oracles-py/text_corpus.py`, fontTools): un caz nou = așezarea în generator, apoi `test/fixtures/text/`
  regenerat și comis. **Pornirea 97,4 (cu ușa 100,9 / 110 kB), totalul 358,6 / 400.**
  **Fonturile omului (ADR 0106, felia 7.2↑)** gata pe 29.10: „Fonturile mele” (încărcate: TTF, OTF / CFF, TTC, WOFF;
  ținute în browser, IndexedDB `cncvs2-fonturi`), fonturile sistemului (Local Font Access, cu permisiunea din clic) și Google
  Fonts (funcția `fonturiGoogle`, fără cheie: metadatele publice și CSS API v2; fișierul TTF îl descarcă browserul din
  `fonts.gstatic.com`, permis în CSP); cititorul: CFF (și CID), TTC, `cmap` 12 / 6 / simbol, `kern` vechi, Extension;
  **majuscula = vârful lui H** (nu `sCapHeight`). Blocul ține id-ul fontului (`f:` amprenta, `g:` Google, `s:` PostScript)
  și numele lui. Pe cele 566 de fețe ale mașinii, 557 identice cu fontTools (sonda locală, `.tmp/sonda_fonturi_sistem.py`).
  Urmează în etapa 7: textul pe curbă, instanțele fonturilor variabile, fonturile cu o singură linie. **Pornirea 97,4 (cu
  ușa 100,9 / 110 kB), totalul 370,5 / 400.**
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

- 28.10.2026: **conturile, întâi ale personalului, și sugestiile** („Vreau sa cream si sistemul de account pentru useri, inclusiv
  admini, scopul acum imediat este pentru admini, si, sa avem un sistem de feedback unde ei pot nota sugestii, iar eu sa pot decide
  ce sa implementam”): acum, pentru personal (conturile din `/admin` există, ADR 0040, 0049): sugestiile scrise de personal și
  decizia owner-ului pe fiecare; conturile clienților vin cu partea comercială (nivelurile, proba de 14 zile, Stripe). Planul și
  întrebările grupate, în raportul feliei 6.R↑.
- 28.10.2026: **notițele owner-ului, notate pentru după degrupare** („Notite:”, cu poza panoului ornamental din DXF):
  1. „Sistem de history pentru modificari, unde, daca vrem sa revenim la o stare, dar, vrem sa pastram unele modificari care sa
     se pastreze, ce dificultati ar implica?”: întrebare; răspunsul (dependențele, reaplicarea pe altă bază, conflictele,
     validarea, istoricul ca arbore, interfața, memoria) e în raportul feliei 6.R↑. Peste jurnal (ADR 0016), cu un ADR nou.
  2. „Buton de centrare un plansa, nu doar centrare orizontala si apoi verticala.”: „Centrează pe foaie” într-un clic, pe
     ambele axe; cu mai multe forme alese, ca un bloc (azi, alinierea mută fiecare formă).
  3. „Avem situatia unde degrupam niste vectori importati si duplicam si dupa aliniem. Ei se suprapun […] Ar trebui ca
     alinierea sa detecteze situatii de genul asta si sa creeze grupari automat si sa functioneze in paralel si cu sistemul de
     history unde poti pune exceptii la unele modificari cand dai restore.”: alinierea mai multor forme le suprapune;
     recomandarea asistentului: gruparea (Ctrl+G), alinierea selecției ca bloc la alegere, un avertisment imediat când
     contururile ajung să se atingă (exportul le refuză oricum, ADR 0026 §2); gruparea ghicită din suprapuneri, doar ca
     propunere vizibilă. Ordinea și forma le alege owner-ul.
- 28.10.2026: **degruparea vectorilor, cât mai devreme** („Si vreau cat mai devreme sa avem functie de ungroup vectors. Pe click
  dreapta, dar, si in meniu, langa booleans”): o piesă cu mai multe forme (un import SVG / DXF, o formă cu găuri) se desface în
  piese separate, din clic dreapta pe pânză și din butonul de lângă boolean. Vine imediat după reparația scalării (9.3↑b),
  înaintea reluării importului PDF (9.4↑). „Unirea și separarea vectorilor” fusese amânată pe 20.10 („As face ceva mai mic”).
- 28.10.2026: **importul PDF și AI acum** („4.”, din lista: calculul CAM în workere, animația 3D, găurile pe puncte, textul,
  importul PDF / AI, reordonarea de mână) și **butoanele de import și export, într-un spațiu al lor** („vreau ca toate
  butoanele care tin de import si export sa fie comasate intr-un spatiu dedicat si unificat. Ele isi au locul impreuna.”):
  importul (SVG, DXF, PDF, AI), „Exportă G-code” și „Exportă vectori” (până acum în extensia barei) stau împreună, separat
  de uneltele de desen; vin cu felia 9.4↑.
- 28.10.2026: **rolurile de tăiere, alese înaintea exportului, cu traseul la zi** („o sa vreau sa setam rolurile de taiere
  inainte sa intru la export g code si sa sefaca update si la toolpath”): operațiile (exterior, interior, pe linie, buzunar…)
  se aleg și din panoul de proprietăți, nu doar din fereastra exportului, iar traseul de pe pânză se recalculează singur.
  Schimbă ADR 0038 (panoul editează poziția, rotirea și foaia; operațiile rămân în dialogul exportului; recalculul automat
  abia cu bazinul din etapa 4): întâi calculul CAM în workere (etapa 4, „Calcul pe mai multe fire”), apoi rolurile în panou
  și traseul la zi, cu un ADR nou. De făcut după 9.4↑.
- 28.10.2026: **coborârea directă între treceri, la alegere, notată pentru mai târziu** („In fisierele de test am vazut ca z
  se duce la -4 apoi iar la 5. Vreau ca asta sa fie optional. Userul poate ar vrea sa nu se mai ridice freza si sa coboare
  direct la -8mm. Noteaza pentru viitor.”, la programul A al plăcii 1: gaura D30, Z −4 → 5 → −8). Acum, fără rampă, freza
  urcă la Z sigur între treceri; cu rampa (ADR 0029, oprită implicit până la placa 1), bucla se taie continuu, coborând pe
  rampă. Cererea e a treia alegere pe operație: coborârea verticală direct la trecerea următoare, fără ridicare (cere o freză
  cu tăiș în capăt, ca Ø6 a plăcii 1). Momentul îl alege asistentul; cel mai devreme odată cu rampa pornită implicit, după
  placa 1 (aceeași legătură între treceri), cu ADR-ul ei.
- 27.10.2026: **exportul EPS rămâne așa deocamdată** („nu stiu daca sunt fericit cu acest export eps. deocamdata este ok,
  vectorii au fost exportati ca vectori. dar, o sa mai lucram la gruparea lor, dar asta mai tarziu, cand vom face sistemul de
  nesting probabil”): deschis în Illustrator, formele ies vectori, dar căile de aceeași culoare (același rol) ajung unite într-un
  singur Compound Path, câte unul pe rol, într-un grup. Gruparea (pe piesă / formă, eventual straturile) se reia odată cu
  nesting-ul (rândul din prag, v2), nu acum (ADR 0089, „Se redeschide dacă”).
- 25.10.2026: **testul pas cu pas devine, mai târziu, tutorialul utilizatorilor în aplicația live** („Ma gandesc sa folosim acest
  test/tutorial si pe viitor, in aplicatia live, exact ca un turorial. Ceva care sa ajute userii sa lucreze cu aplicatia. Asa ca,
  nu trebuie sa pierdem codul asta. Va fi repurposed”): codul ADR 0072 (panoul, pașii ca document, poza, raportul) rămâne și nu
  se șterge la nicio curățenie; refolosirea lui pe live are felia ei (pașii și în engleză, alt conținut, bugetul și precache-ul
  decise atunci). Tot atunci: testul se face pe adresa principală de test (publicată cu buzunarul, blocarea owner-ului și testul).
- 25.10.2026: **owner-ul e fix în /admin** („in admin, contul meu nu ar trebui sa poata fi removed. nu din admin. si nici rolul nu
  ar trebui sa poata fi schimbat”, ADR 0071): nu se scoate și nu-și schimbă rolul de acolo, oricine ar cere-o; rolul `owner` se dă
  doar din consolă (alegerea asistentului, ca un owner dat din `/admin` să nu rămână fără cale de întoarcere).
- 25.10.2026: **testul owner-ului devine un tutorial în aplicație, cu snapshot-ul planșei** („vreau ca testarea asta sa fie ca
  un tutorial direct in app. vreau si un buton cu care sa pot face snapshot la plansa. aceasta imagine se ataseaza automat la
  raportul pe care ti-l voi da la final. deci nu ar trebui sa fie incarcata in server. dar, termina ce task ai inceput acum”):
  după buzunar; pozele rămân în browser și intră în raportul final, descărcat, nimic pe server. Tot atunci, notat: **fiecare
  unealtă își arată tasta de scurtătură** în colțul dreapta-jos al butonului, lângă iconiță, fără s-o încurce. Și, **după test,
  cronologia roadmap-ului** („dupa test, sa actualizezi si zona asta din roadmap”, captura „Timeline, by week” din `/admin`):
  etapele 4, 5, 6 și 14 își arată feliile aduse înainte (acum stau doar în fișa etapei 3).
- 25.10.2026: **booleanul intră în uneltele de desen, înaintea testului owner-ului** („Da”, la întrebare): întâi copierea de-a
  lungul unei curbe (ADR 0066), apoi booleanul (unire, scădere, intersecție), apoi un **test pas cu pas pe care owner-ul îl urmează**
  pe instanța de test și spune ce merge și ce nu (cererea lui din aceeași zi: „dupa ce terminam cu uneltele de desen”).
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
