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
  precache), deschise din meniul contului (rândul „Manualul”, ADR 0120) sau cu F1 (după context). **Un buton, o acțiune sau o etichetă nouă cere capitolul ei în ambele
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
  **Oracolul independent al buzunarului (felia 5.1↑b)** gata pe 31.10: `test/oracles/buzunar.ts`, scris de o sesiune nouă doar
  din ADR-uri, judecă G-code-ul exportat (pasul pe trecere, peretele și insulele, acoperirea și pasul lateral, sensul,
  coborârea, frezele de rest, liniile paralele), pe corpusul CAM și pe cazurile pe hârtie din `test/oracles/buzunar.cazuri.ts`
  (un caz nou = documentul și valorile lui pe hârtie, acolo). **Partea de ușă a documentului v11–v18 (felia 5.1↑c)** gata pe
  01.11, rescrisă de o sesiune independentă doar din ADR-uri: secțiunea „Documentul v11–v18” de la finalul lui
  `test/oracles/document.ts` (peste partea v1–v10), cazurile pe hârtie la finalul lui `test/oracles/document.cazuri.ts`, proba
  cu ușa aplicației în `test/unit/document.v22.oracol.test.ts` (din 08.11, cu incrustațiile din v20–v22) și, pentru v23 (literele
  plăcuțelor, 11.4↑, în `main` din 13.11), în `test/unit/document.v23.oracol.test.ts`. **Un câmp nou al documentului
  (v31; v30 e al degroșării reliefului, 18.1↑d, încă pe ramură; v29, cu finisarea reliefului și freza bilă, ADR 0312, e în `main` din 25.11; v28, cu forma `relief`, ADR
  0310, din 24.11; v27, cu `biblioteca`, `regim` și `tais` pe frezele
  operațiilor, ADR 0300) intră acolo, ca rangul și incrustația:** rândul
  lui în `CAMPURI_NOI_O` (ciocnirea migrării), judecata în `problemeOperatieO`, frontierele pe hârtie, iar probele care țin
  versiunea curentă se mută pe ea (`schema: 23` în probe; oracolele CAM primesc versiunea nouă cum le primesc pe v21 și v22,
  de exemplu `test/oracles/regiune.ts`). **Și în corpusul de aur
  (ADR 0121):** adăugirea versiunii în `scripts/corpus-documente-reteta.ts` (`ADAUGIRI`), rândul ei în `ISTORIE`
  (`scripts/corpus-documente.ts`, iar versiunea dinainte primește ultimul ei commit), apoi `node scripts/corpus-documente.ts
  --istorie` și `node scripts/corpus-documente.ts` (ieșirile așteptate), cu diferența lor citită în commit. Ușa curentă refuză
  singură o versiune neîntreagă (ADR 0070 §2; divergența găsită de oracol, reparată în aceeași felie). Ușa unui proiect salvat e
  despărțită (ADR 0070): la pornire doar `usaCurenta.ts`, migrările (`migrari.ts`) doar pentru un document vechi; pornirea cu
  ușa 98,6 / 100 kB (~1,4 kB liberi).
  **Testul pas cu pas, în aplicație (ADR 0072)** gata pe 25.10: butonul Test din extensie (în afara instanței live; din 31.10,
  la cererea owner-ului, fără buton: se deschide la adresa cu `?test`), pașii în
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
  **Pornirea 97,4 (cu ușa 100,9 / 110 kB), totalul 370,5 / 400.**
  **Textul pe curbă și proba fonturilor (ADR 0108, felia 7.3↑)** gata pe 29.10: cu unealta Text, un clic lângă conturul
  unei forme pune ancora pe el și textul urmează curba (literele întregi, rotite sau verticale; deasupra, pe linia de bază,
  centrat, dedesubt, la o distanță; partea cealaltă; întins pe toată curba); curba stă în blocul textului, în sistemul
  piesei (`src/text/peCurba.ts`, `parcurgere` și `pozitiePeCurba` în `src/model/curba.ts`). **Corpusul pe curbă e Python**
  (`pe_curba` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/pe-curba.json`): un caz nou = rândul în
  `CAZURI_CURBA`, apoi fixtura regenerată și comisă. Fereastra fonturilor („Adaugă fonturi…”) are textul de probă: contururile
  aplicației pentru fonturile omului și ale sistemului, fețele de afișare Google înainte de descărcare (CSS API v2 din
  browser, `fonts.googleapis.com` / `fonts.gstatic.com` în CSP). Urmează în etapa 7: fonturile cu o singură linie (instanțele
  fonturilor variabile, gata în 7.4↑). **Pornirea 97,4 (cu ușa 100,9 / 110 kB), totalul 374,4 / 400.**
  **Calculul CAM în bazinul de workere (ADR 0109, felia 4.A↑, adusă din etapa 4)** gata pe 30.10.
  - **Ce s-a mutat în worker:** exportul (CAM-ul, postul, SHA-256, rezumatul, mutările simulării), „Arată traseul”, timpul
    din cip și programul vederii 3D se calculează în workerul CAM (`src/jobs/lucratorCam.ts`, bazinul `src/jobs/bazinCam.ts`,
    codul în `src/jobs/calculCam.ts` și `rezumat.ts`). Pe firul principal, pânza nu mai îngheață.
  - **Workerul:** câte unul pe calcul, oprit la capăt. Un document schimbat anulează calculul traseului.
  - **Programul IR** vine împachetat și transferat (`src/jobs/impachetare.ts`).
  - **Același G-code, octet cu octet:** corpusul `test/unit/ajutor-corpus-cam.ts`, plăcile, Edge față de Node.
  - **În Node (testele),** același calcul în proces, prin `structuredClone`. La build, ramura aceea dispare
    (`__CNCVS2_CONSTRUIT__`), iar poarta cere CAM-ul doar în worker.
  - **Un calcul greu nou** intră în `src/jobs/calculCam.ts`, ca cerere a protocolului (`protocolCam.ts`), nu pe firul
    principal.
  - **Edge și Node** diferă pe ultimul bit al funcțiilor matematice. Dublele CAM-ului diferă cu cel mult 4,65e-7 mm, sub
    rotunjirea G-code-ului.
  - **Plafonul total e 450 kB** (decizia owner-ului; 500 kB din 02.11, ADR 0122): workerul are copia lui de cavalier și
    de geometrie.
  - **Pornirea 97,3 (cu ușa 100,8 / 110 kB), totalul 411,8 / 450.**
  **Centrarea pe foaie (ADR 0110, felia 6.S↑)** gata pe 30.10, din notița 2 a owner-ului din 28.10: „Centrează pe foaie” în
  secțiunea Aliniere (`centru-foaie` în `src/geom/aliniere.ts`): centrul cutiei comune a selecției în centrul foii, pe ambele
  axe, toate formele cu aceeași deplasare (un bloc). Notițele 1 și 3 rămân la owner (istoricul cu excepții, alinierea ca bloc
  pentru celelalte feluri, gruparea).
  **Rolul de tăiere din panou și traseul la zi (ADR 0112, felia 5.8↑, adusă din etapa 5)** gata pe 31.10, din cererea owner-ului
  din 28.10: în panoul de proprietăți, secțiunea **Tăierea** (rolul, adâncimea, pasul), pentru oricâte forme alese; rolul e al
  piesei întregi (`document.rol`, calculul pur în `src/model/rol.ts`): pe o literă cu goluri, exteriorul taie conturul pe afară
  și golurile pe dinăuntru, V-carve-ul și buzunarul o singură operație; lista oferă doar ce se potrivește tuturor formelor
  alese; freza în V doar pe linie și în V-carve (V60 sau plată, cu același diametru). **Cât e arătat, traseul se calculează din
  nou singur** după fiecare schimbare (300 ms fără altă schimbare), deci probele care schimbă documentul cu traseul arătat
  așteaptă calculul nou, nu cipul „vechi”. Imbricarea are o singură judecată (`src/geom/imbricare.ts`, candidații de la
  apelant). Din 5.8↑b, V-carve-urile unei piese cu aceleași valori sunt o singură regiune, oricâte
  operații (schimbă ADR 0090). Din 5.8↑c, rolul V-carve pune adâncimea cel mult cât conul frezei (`inaltimeConV`). **Pornirea 97,6 (cu ușa 101,1 / 110 kB), totalul 414,8 / 450 (după unirea cu sugestia din editor).**
  **Importul EPS și AI ≤ 8 (ADR 0115, felia 9.5↑, adusă din etapa 9)** gata pe 31.10, după decizia din 07.10 („cititor propriu,
  limitat”): „Importă SVG / DXF / PDF / AI / EPS…” citește EPS-ul (și binarul DOS) și AI-ul de dinainte de Illustrator 9; ușa
  se alege după antet (`formatDupaAntet`: PostScript față de `%PDF-`; un `.ai` de la Illustrator 9 e PDF). Cititorul
  (`src/io/eps.ts`, lexicul în `src/io/psLexic.ts`) execută un program PostScript în linie dreaptă (procedurile definite, cu
  `bind`; matricele, `gsave`, căile, pictarea); **buclele și condițiile se refuză cu operatorul** (`control`), la fel
  operatorii lipsă (`operator`, de exemplu `arc`) și EPS-urile de la Illustrator 9 (`ai-nou`). Un AI ≤ 8 se citește după
  nume: prologul și setup-ul sărite, operatorii AI, calea compusă, straturile ca nume. Desenul stă unde e în fișier (ca la
  DXF); textul, imaginile (cu datele lor) și umbririle se sar, numărate. **Corpusul EPS e Python**
  (`test/oracles-py/eps_import_corpus.py`): un caz nou = desenul în generator + valoarea pe hârtie; fiecare fișier trece prin
  Ghostscript (local `.tmp/eps2pdf.cjs`, în CI `gs`) și PyMuPDF; apoi `test/fixtures/eps/` regenerat și comis (CI-ul îl
  regenerează și cere aceiași octeți). **Pornirea 97,6 (cu ușa 101,1 / 110 kB), totalul 425,5 / 450 (după unirea cu 5.8↑b–c).**
  **Instanțele fonturilor variabile (ADR 0113, felia 7.4↑, adusă din etapa 7)** gata pe 31.10, într-o subsesiune (worktree-ul
  `wip/7.4-fonturi-variabile`): cititorul aplică instanța cerută (`src/text/variatii.ts`: coordonatele normalizate ca fontTools,
  `gvar` cu IUP, avansul din `HVAR` sau din punctele fantomă, crenarea din dispozitivele GPOS, `cpht`), iar CFF2 se citește
  (`blend`, `vsindex`; refuzat doar `avar` 2). Instanțele numite sunt fețe separate: `f:<amprenta>[.<fața>]@<indicele din
  fvar>` în Fonturile mele (o intrare pe instanță), iar fața sistemului se citește la instanța ei. **Corpusul instanțelor e
  Python** (`variabile` în `test/oracles-py/text_corpus.py`, cu instancer-ul lui fontTools pe Roboto Flex și Noto Sans CJK,
  OFL, din fonturile Android Studio, plus variantele lor): un loc nou = rândul în `LOCURI_FLEX` (sau al fontului), apoi
  `test/fixtures/text/variabile.json` regenerat și comis. **Pornirea 97,6 (cu ușa 101,1 / 110 kB), totalul 429,3 / 450 după unirea cu 5.8↑b–c, 5.1↑b și 9.5↑; pe ramură, 418,5** (pe
  `main`, baza era 97,6 / 101,1 / 414,8, cu 14.B↑b unit).
  **Rolurile personalizate (ADR 0114, felia 15.A↑, adusă din etapa 15)** gata pe 01.11, din cererea owner-ului din 31.10,
  cu alegerile recomandate: „Salvează ca rol…” în secțiunea Tăierea păstrează rolul de bază și toate valorile operației
  (operația-model, prin `operatieInMargini`), în browser, pentru toate proiectele (`localStorage`, `cncvs2.roluri`, `v: 1`;
  stocarea în `src/app/roluriMele.ts`, calculul pur în `src/model/rolPersonal.ts`); în lista Rolului, grupul „Rolurile
  mele”, aplicat prin `document.rol` (contextul `rolNou` primește și un rol personalizat), cu numărul T păstrat cât e liber
  (`numereFreze` în `src/model/rol.ts`); recunoașterea ignoră numerele frezelor. **Un câmp nou al operației intră singur în
  rol; unul care ține de o formă anume (ca `despartire`) se scoate în `model()` și în aplicare** (`src/model/rolPersonal.ts`).
  **Pornirea 97,6 (cu ușa 101,1 / 110 kB), totalul 432,1 / 450.**
  **Biblioteca de freze (ADR 0300, felia 16.A↑a, adusă din etapa 16)** gata pe 23.11, în sesiunea cloud a liniei (ramura
  `wip/16.A-freze`), unită în `main` pe 24.11 (`02a5864a`), din cererea owner-ului din 23.11: fereastra **Frezele mele**
  (rândul „Frezele mele…” din meniul contului și `vedere.freze` în paletă, din orice fereastră; `src/app/FrezeleMele.tsx`,
  la cerere, cu modulul de mesaje `freze`): lista pe feluri, cu căutarea; editorul, cu silueta la scară și refuzurile pe
  câmp; duplicarea, ștergerea, frezele de pornire; exportul JSON și importul JSON sau CSV (`src/io/frezeFisier.ts`).
  Frezele (plată, în V, de gravare) stau în browser (IndexedDB `cncvs2-freze`, `src/app/frezeMele.ts`); modelul pur e
  `src/model/freza.ts`, cu marginile ușii documentului (`sculaDinFreza` dă copia care trece de schema operației).
  **Documentul și serverul nu s-au schimbat:** alegerea frezei în proiect (documentul v27) vine în 16.A↑b, salvarea în
  cont în 16.A↑c, apoi calibrarea, bila și toroidala, profilul desenat, valorile pe material. **Un rând nou în meniul
  contului se numără și în proba tichetelor de pe emulatoare** (`test/e2e-emulator/tichete.emulator.spec.ts`), nu doar în
  `cont.spec.ts`. **Pornirea 109,4 kB (cu ușa 113,9 / 115; cu Atelierul 114,2), totalul 793,6 / 900.**
  **Plafonul total 900 kB (ADR 0301, decizia owner-ului din 23.11, „ok, ridica plafonul total la 900 kB”):** cu 16.A↑a,
  totalul era 793,6 / 800, iar feliile următoare (frezele, fereastra exportului, utilizarea, aranjamentele) nu mai
  încăpeau în 6,4 kB. **Pornirea rămâne 115 kB:** cu ușa și cu Atelierul e la 114,2, deci o felie care atinge pornirea
  cere întâi loc (o bucată mutată la cerere) sau decizia owner-ului pe plafonul ei (ADR 0252).
  **Documentul v27 și valorile frezei în program (ADR 0300 §5, felia 16.A↑b-1)** gata pe 24.11, unită în `main` pe
  24.11 (`32b33a42`): pe orice freză a unei operații (scula, frezele de rest, fundul plat și frezele lui de rest,
  frezele dopului, freza benzii), trei câmpuri opționale: `biblioteca` (`{ id, rev }`), `regim` (`{ turatie, avans,
  plonjare }`) și `tais`; migrarea v26 → v27 schimbă doar numărul, iar un v26 care are deja câmpurile pe o freză e o
  ciocnire. În program (`src/cam/regimFreza.ts`): turația, avansul și plonjarea frezei pe fiecare loc (profilul,
  buzunarul, liniile paralele, frezele de rest, găurirea, V-ul, fundul plat, dopurile), turația primei freze montate
  și a celei noi la schimbare. **Fără valori, programul de azi, octet cu octet;** același T cu două turații și o
  adâncime peste tăiș se refuză. Fără interfață încă: urmează 16.A↑b-2 (lista „Freza” pe rândurile exportului și în
  Tăierea) și 16.A↑b-3 (nota schimbării din bibliotecă). **Un câmp nou al documentului ia v31 (v28 e relieful, ADR 0310; v29, finisarea lui, ADR 0312; v30, degroșarea lui, 18.1↑d, încă pe ramură). O probă e2e care
  citește documentul salvat cere versiunea curentă:** `placute.spec.ts` a căzut în completul liniei cu `schema: 26`.
  **Biblioteca de freze în cont (ADR 0300 §3, §7, felia 16.A↑c)** gata pe 24.11, unită în `main` pe 24.11
  (`6b74074d`), la „b, pornește 16.A↑c” al owner-ului: callable-ul `freze` (`functions/src/freze/`, contractul în
  `shared/freze.ts`); frezele omului stau pe server în `conturi/{uid}/freze/{id}`, ca text JSON neatins, fiecare cu
  versiunea ei, cu contorul în `conturi/{uid}/sincron/freze` (**fără nicio regulă: închise clientului**; totul trece
  prin callable). **Capabilitatea nouă `cloud`** (proba, planul gratuit, personalul): fără ea, `lista` merge, iar
  `scrie` și `sterge` se refuză. În browser, biblioteca contului (`cont:<uid>`) se îmbină pe câmpuri față de ultima
  versiune comună (`src/model/frezeSincron.ts`, pură; trecerea în `src/app/frezeSincronizare.ts`: la deschiderea
  ferestrei, la 2 s după o schimbare, la revenirea rețelei, cu „Sincronizează”); o ciocnire pe același câmp aduce banda
  cu „Păstrează-o pe a mea”, „pe cea din cont”, „amândouă”; la prima deschidere cu contul, „Adaugi cele N freze din
  acest browser în cont?”. **Cererile pleacă prin bucata contului (`cheamaFrezele`).** Documentul rămâne v27. Felia:
  pornirea +0, totalul +4,4 kB, contul 30,1 → 30,3 / 32. **Feliile următoare, renumerotate:** 16.A↑b-2 (freza din
  bibliotecă în secțiunea Tăierea, în lucru), 16.A↑b-3 (rândurile exportului, după fereastra exportului refăcută,
  `AndreiBesliu/cvs2#11`), 16.A↑b-4 (nota „s-a schimbat în bibliotecă”).
  **Freza din bibliotecă în secțiunea Tăierea (ADR 0300 §4, felia 16.A↑b-2) și frezele standard, puse singure (§3,
  felia 16.A↑a-2)** gata pe 24.11, unite în `main` pe 24.11 (`33fadb06`). **b-2:** rândul „Freza” din Tăierea, cât
  biblioteca are freze, doar cu cele care merg pe toate formele alese; aleasă, freza trece pe operațiile lor prin
  `document.aplica-operatii`, într-un pas, cu originea ei (`biblioteca: { id, rev }`) și valorile de lucru; numărul T
  e al bibliotecii cât e liber, altfel al unei freze identice, altfel cel mai mic liber, cu nota care o spune.
  **Identitatea frezei montate ține și turația** (`aceeasiFreza`, `src/model/rol.ts`). Judecata formei pe operație
  stă o singură dată, în `src/model/formaFrezei.ts` (`motivFormaPeOperatie`), comună cu linia reliefului. **a-2:**
  setul de pornire are id-uri fixe; biblioteca fără cont îl primește o dată, la prima citire, iar golită nu se mai
  umple singură; un cont îl primește la prima sincronizare doar dacă n-a avut niciodată freze. În Atelier, rândul
  „Freza” nu apare. **De acum, orice probă e2e care deschide panoul vede rândul „Freza” în Tăierea; o probă care
  cere biblioteca goală folosește `bibliotecaGoala` din `test/e2e/ajutor-freze.ts`.** **ADR 0302, acceptat de owner
  cu „Da, 1a–5a”:** catalogul de freze al nostru și biblioteca arătată ca listă, cu configuratorul la cerere
  (feliile 16.A↑h-1…4); fișierul ArtCAM `FREZE.tdb` nu se citește și nu se copiază. Documentul rămâne v27; nimic pe
  server. Feliile: totalul +2,2 kB, pornirea neschimbată.
  **Fereastra „Frezele mele” ca listă (ADR 0302 §3, felia 16.A↑h-1) și grupurile omului (§4, felia 16.A↑h-2)** gata
  pe 24.11, unite în `main` pe 24.11 (`db43ed08`). **h-1:** fișa frezei alese, doar de citit, cu „Editează”,
  „Duplică”, „Șterge…”; editorul se deschide la „Editează” și la „Freză nouă”; comutatorul „Listă / Configurator” e
  ținut în browser (`cncvs2.freze.vedere`). **h-2:** câmpul `grup` pe freză (cel mult 40 de caractere), în JSON, în
  CSV și în cont, fără schemă nouă (sincronizarea îmbină orice câmp); lista arată întâi grupurile omului, apoi
  felurile; „✎” redenumește un grup cu toate frezele lui, într-o scriere. Feliile: totalul +1,9 kB.
  **Catalogul de freze (ADR 0302 §1, felia 16.A↑h-3) și felurile noi (§2, felia 16.A↑h-4)** gata pe 24.11, unite în
  `main` pe 24.11 (`9fd71053`). **h-3:** catalogul nostru în „Frezele mele”, cu „Pune în frezele mele” pentru una, un
  grup sau tot; punerea stă în `src/model/dinCatalog.ts`, fără datele catalogului (depozitul e comun panoului Tăierea).
  **h-4:** bila, toroidala, conica cu vârf rotund și burghiul, în bibliotecă și în catalog, cu câmpul `raza`, capătul
  pe hârtie și silueta (`src/model/profilFreza.ts`); **în proiect ajung deocamdată doar felurile cu CAM**
  (`FELURI_CU_CAM`: plata, V-ul, gravarea), restul sunt „în curând în proiect”. Frezele stau în cont ca text JSON,
  fără judecata felului: un client vechi ține un fel necunoscut neatins. Urmează 16.A↑h-5 (profilurile parametrice,
  ADR 0302 §7). Feliile: totalul +2,8 kB.
  **Profilurile parametrice (ADR 0302 §1, §7, felia 16.A↑h-5) și freza din bibliotecă pe rândurile exportului (ADR
  0300 §4, felia 16.A↑b-3)** gata pe 24.11, unite în `main` pe 24.11 (`4aee5405`, `fdde5947`). **h-5:** rotunjirea,
  ogee-ul, ogee-ul roman (câmpul nou `treapta`) și panoul ridicat, în „Frezele mele” și în catalog (149 de freze), cu
  marginile lor, capătul pe hârtie și silueta; canelura e o bilă, nu un fel separat; toate „în curând în proiect”.
  **b-3** (peste fereastra exportului refăcută, la „Pe #11, acum” al owner-ului): lista „Din frezele mele”, prima în
  grupul Freza al fișei unei operații, cu frezele care merg pe tăietura rândului; aleasă, rândul primește T-ul (regula
  rolurilor, printre frezele ferestrei, `numarPentruRand`), Ø-ul, forma, pasul și, la buzunar, pasul lateral; Exportă
  scrie numele, originea, valorile de lucru și tăișul, iar „Scrisă de mână” (un Ø sau o formă schimbate de mână) le
  scoate. Biblioteca proiectului e comună cu Tăierea (`src/app/bibliotecaProiect.ts`). Documentul rămâne v27; nimic
  pe server. Feliile: pornirea +0, totalul +2,6 kB (860,1 / 900).
  **Frezele în plus ale rândului din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-5)** gata pe 25.11, unită în `main`
  pe 25.11 (`03e64d33`): lista „Din frezele mele” și pe freza fundului plat, pe fiecare freză de rest (doar cele mai
  mici decât freza dinainte), pe prima freză a dopului drept și pe freza decupării benzii, doar cu frezele plate.
  Aleasă, freza primește T-ul (regula rolurilor, printre toate frezele ferestrei, fără cea înlocuită:
  `frezeRanduri`), Ø-ul, pasul lateral și originea (`cuFrezaAleasa`); un Ø schimbat de mână o scoate doar pe freza
  aceea. Exportă scrie originea cu regula frezei operației (`cuOrigine`, comună), iar legarea rândurilor ține și
  originea frezelor în plus. Frezele de rest stau într-un tabel cu capul coloanelor, cu „Adaugă” ca buton
  (constatarea 9 a auditului exportului). Lista e o componentă comună (`ListaBiblioteca`, în
  `src/ui/FisaOperatie.tsx`). Documentul nu se schimbă (e v28, din relief); nimic pe server. Felia: pornirea +0,
  totalul +1,0 kB.
  **Nota „s-a schimbat în bibliotecă” pe rândurile exportului (ADR 0300 §5, felia 16.A↑b-4)** gata pe 25.11, unită
  în `main` pe 25.11 (`9f18522e`): pe fiecare freză a unui rând, copia din proiect e comparată cu „Frezele mele”
  (`stareOrigine`, `diferenteFreza`, în `src/ui/exportRand.ts`). Schimbată acolo: nota spune ce diferă (numele,
  diametrul, forma, valorile de lucru, tăișul), cu „Ia valorile noi” pe rând și „Pe toate (N)” (`cuValorileNoi`);
  T-ul și pașii rămân ai rândului. Ștearsă: „nu mai e în bibliotecă”. Scrisă de mână, dar la fel cu una din
  bibliotecă: „Scrisă de mână (ca „…”)”, fără scriere. Nota e `NotaBiblioteca` (`src/ui/FisaOperatie.tsx`), iar
  biblioteca întreagă ajunge în fereastră doar după citire (`bibliotecaToata`, în `src/app/ExportConectat.tsx`).
  **Un fel nou de freză cu CAM intră și în lista aceea: dacă fereastra nu-i poate purta forma, rămâne afară** (bila
  reliefului, 18.1↑c). Documentul rămâne v28; nimic pe server. Felia: pornirea +0, totalul +1,6 kB.
  **„Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia 16.A↑b-6)** gata pe 25.11, unită în `main` pe 25.11
  (`1d3882d9`), la „ok, porneste 10.4↑c-2 si 16.A↑b-6” al owner-ului: pe nota unei freze șterse din bibliotecă,
  butonul o pune la loc din copia de pe rând, cu id-ul ei de dinainte și un nume liber (`frezaDinCopie`,
  `cuFrezaReadusa`, în `src/model/freza.ts`; `puneInapoi`, în `src/app/frezeMele.ts`); în cont reînvie peste semnul
  ștergerii, prin sincronizarea de azi (`trimiteSchimbarea`, prin bucata contului), iar fără `cloud` rămâne în
  browser. Rândurile cu aceeași copie o iau (`cuFrezaPusaInapoi`, în `src/ui/exportRand.ts`). Cu id-ul deja în
  bibliotecă (pusă la loc între timp, în altă filă), nimic nu se suprascrie: biblioteca se citește din nou, iar nota
  se reface. Nimic nou pe server; documentul rămâne v28. Felia: pornirea +0, totalul +1,6 kB.
  **Escape închide „Frezele mele” oriunde ar fi focusul (felia 16.A↑b-7)** gata pe 25.11, unită în `main` pe 25.11
  (`581da353`), după două probe instabile ale frezelor: Escape se asculta doar pe fereastră și se pierdea când
  butonul apăsat pleca din pagină sau se oprea sub focus, ori după un clic pe un text. Acum se ascultă pe
  `document` cât fereastra e deschisă, pe urcare, cu `defaultPrevented` (un strat de deasupra, ca manualul, își ține
  tasta), și închide stratul de sus care se vede, citit din pagină în clipa apăsării. **O fereastră nouă își ascultă
  Escape pe `document`, nu pe ea însăși, iar proba ei apasă Escape după ce butonul apăsat a plecat sau s-a oprit**
  (aceeași scăpare e încă în „Așază pe foi”, Setări, raportul foilor, lucrarea primită, Aspectul și fereastra
  extensiilor: o felie comună, la cuvântul owner-ului). Cu ea, linia frezelor n-are felie pornită: urmează, la
  cuvântul owner-ului, 16.A↑d (calibrarea, după placa 4), e (bila și toroidala, cu relieful), f (profilul desenat),
  g (valorile pe material). Felia: pornirea +0, totalul +0,1 kB.
  **Plafonul pornirii 120 kB (ADR 0145, decizia owner-ului din 24.11, „ok, ridica plafonul pornirii la 120 kB”):** după
  lotul al paisprezecelea, pornirea era 109,9 kB, cu ușa 114,4 și cu Atelierul 114,7 / 115, iar feliile următoare ale
  frezelor, exportului și aranjamentelor nu mai încăpeau în 0,3 kB. Poarta judecă tot trei măsuri sub același plafon
  (pornirea, cu ușa, cu ușa și cu aranjamentul ales); acum rămân ~5,3 kB. **Ce nu trebuie înaintea primei randări stă
  tot la cerere, iar o felie își spune în raport cât adaugă în pornire.** Totalul rămâne 900 kB.
  **Plafoanele: totalul 1 000 kB, pornirea 125 kB (ADR 0146, decizia owner-ului din 25.11, „ok, ridica plafonul total la 1000 kB si pornirea la 125 kB”):**
  după a treizecea unire, totalul era 880,9 / 900 kB și pornirea cu ușa și cu Atelierul 116,4 / 120, iar frezele,
  relieful și cotele lucrau toate în același rest (19,1 kB și 3,6 kB). Acum rămân 119,1 kB în total și 8,6 kB în
  pornire. **Regulile feliilor rămân:** ce nu trebuie înaintea primei randări stă la cerere, un calcul greu stă în
  workerul lui, iar felia își spune în raport cât adaugă la total și la pornire. O creștere următoare cere iar decizia
  scrisă; pârghiile mari (Preact, modulele în afara precache-ului) rămân ale owner-ului.
  **Conturile clienților: contul în aplicație (ADR 0116, felia 14.C↑, adusă din etapa 14)** gata pe 01.11, din sugestia
  owner-ului acceptată pe 31.10 și răspunsurile lui: butonul **Cont** (din 01.11 lângă butonul temei, sus în dreapta: controlul
  `cont` al aranjamentului), panoul contului (doar online,
  `src/app/PanouCont.tsx`), callable-ul `cont` (`conturi/{uid}`, proba de 14 zile la prima logare cu adresa confirmată,
  dreptul calculat pe server), contul ținut de aplicație (`src/app/dreptCont.ts`, 7 zile offline din `setari/conturi`),
  registrele cu capabilitățile din el (exportul G-code și pornirea senderului se opresc fără drept). **`firebase/auth` doar
  în `src/cloud/contEditor.ts`** (și `/admin` îl ia de acolo): altfel bundlerul face o bucată comună cu numele pachetului,
  iar un `import()` direct pe el scoate runtime-ul din pornire (reconfirmarea trece prin modulul panoului). Contul are
  categoria lui în poartă (doar online, plafon 32 kB). **Pornirea 98,4 (cu ușa 101,9 / 110 kB), totalul 433,1 / 450,
  /admin 196,9 / 200.**
  **Fila Utilizatori minimă și fila Setări (ADR 0116, felia 14.C↑b)** gata pe 01.11:
  - callable-ul `administreazaConturile` (planul unui cont: gratuit, o probă de N zile, dezactivarea, reactivarea, pe planul
    văzut; setările, doar owner-ul; auditul în tranzacție);
  - permisiunile `conturi.citeste` și `conturi.administreaza`;
  - regula care dă lista conturilor și `setari/conturi` doar owner-ului.

  **`/admin` e pe Firestore Lite** (`firebase/firestore/lite`: doar citiri o dată, fără ascultători): 102,8 / 200 kB. Un
  ascultător în timp real ar cere înapoi Firestore-ul întreg. **Ce folosesc doar serverul și `/admin` din conturi stă în
  `shared/conturiPlan.ts`**, nu în `shared/conturi.ts`: acela e în pachetul de pornire, iar ce importă adminul din el ar
  ajunge în pornire. **Pornirea 98,4 (cu ușa 101,9 / 110 kB), totalul 433,1 / 450.**
  **Importul WMF (ADR 0117, felia 26.A↑, adusă din etapa 26)** gata pe 01.11, într-o subsesiune (worktree-ul
  `wip/26.A-import-wmf`), după decizia din 07.10 („WMF propriu”): „Importă SVG / DXF / PDF / AI / EPS / WMF…” citește
  metafișierul Windows cu un cititor propriu (`src/io/wmf.ts`, codurile în `src/io/wmfCoduri.ts`), la cerere. Ușa se alege
  după nume (`.wmf`, `.apm`) și după antet; EMF-ul ajunge tot acolo și e refuzat cu motiv. Transformarea e a GDI-ului
  (fereastra, vizorul, modurile de mapare, SaveDC / RestoreDC), cu un player: antetul placeable e o pagină (25,4 / inch mm
  pe unitate, desenul unde e în cadru); fără antet, unitatea se alege în dialog (implicit 1/96 țol, ca LibreOffice) și
  desenul vine în colțul foii. **Arcul e trigonometric pe dispozitiv, afară de axa X oglindită singură (orar)**: măsurat
  în GDI, nu dedus. **Corpusul WMF e Python** (`test/oracles-py/wmf_import_corpus.py`, `struct`): fiecare fișier e redat
  de GDI pe „Microsoft Print to PDF” (doar pe Windows) și recitit cu PyMuPDF față de hârtie; un caz nou = înregistrările în
  generator + valorile pe hârtie, apoi `test/fixtures/wmf/` regenerat și comis (CI-ul îl regenerează fără GDI, `--fara-gdi`,
  și cere aceiași octeți). **Pornirea 98,4 (cu ușa 102,0 / 110 kB), totalul 437,5 / 450, /admin 102,8 / 200, după unirea cu
  14.C↑b și 5.1↑c.**
  **Senderul prin WiFi (ADR 0119, felia 3.6d)** gata pe 01.11:
  - **Conectează (WiFi)** din panoul mașinii: un WebSocket spre controlerul din rețeaua locală (FluidNC, grblHAL, podul ESP3D),
    peste același flux (`src/machine/websocket.ts`, transportul `retea`);
  - adresa, doar un IP local sau un nume `.local`, se judecă înainte de conectare: browserul (Chrome și Edge 147, cu
    permisiunea rețelei locale) ar bloca restul;
  - avertismentul căderii legăturii, înaintea primei porniri.

  **CSP-ul are schema `ws:` în `connect-src`** (acordul owner-ului), fără `wss:`. **Proba cap-coadă are emulatorul GRBL în
  spatele unui server WebSocket minimal** (`test/e2e/controlerWebSocket.ts`, fără dependențe: npm lipsește). Butonul
  **Cont** stă de pe 01.11 lângă butonul temei (controlul `cont` al aranjamentului).
  **Raportările clienților (ADR 0116 §C, felia 15.B↑a, adusă din etapa 15)** gata pe 02.11:
  - în meniul contului, cu contul deschis: **Raportează o problemă…** (felul, textul, poza planșei la bifă, datele aplicației
    și amprentele erorilor din sesiune) și **Raportările mele** (răspunsurile echipei; un răspuns nou pune un punct pe butonul
    Cont);
  - callable-ul `tichete` (cel mult 10 raportări pe cont pe zi, auditul în tranzacție) și fila **Tichete** din `/admin`
    (`tichete.citeste`, `tichete.raspunde`).

  **Editorul nu citește Firestore:** raportările trec prin callable. **Contractul pozei stă în `shared/poza.ts`, iar al
  tichetelor intră în editor prin `contEditor.ts`:** altfel bundlerul scoate o bucată nouă (contractul sugestiilor), iar
  bucata contului își pierde numele (o ia de la ultimul ei modul). **Cheia amprentei unei erori stă în `shared/amprenta.ts`**
  (contractul erorilor e în pornire). 15.B↑b (proiectul atașat și jobul de păstrare) e notată pentru mai târziu (decizia
  owner-ului din 02.11). **Pornirea 98,5 (cu ușa 102,0 / 110 kB), totalul 441,2 / 450, /admin 105,4 / 200, contul 28,8 / 32.**
  **Proiectul atașat și păstrarea tichetelor (ADR 0116 §12, §16, §18, felia 15.B↑b)** gata pe 07.11, în worktree-ul
  `raportari` (ramura `wip/15.B-raportari`), **unită în `main` pe 07.11** („Da, transmite”; rândul unirii, mai jos):
  - bifa **Atașează proiectul** în raportare (cel mult 10 MB; JSON-ul canonic, gzip, base64, prin callable-ul `tichete`);
    fișierul stă în Storage (`tichete/{id}/proiect.json.gz`), iar fila **Tichete** îl descarcă prin aceeași acțiune
    (`proiect`), verificat pe amprentă;
  - jobul **`pastrareTichete`** (04:00) șterge tichetele cu `rezolvatLa` mai vechi decât `zilePastrareTichete`, cu poza și
    proiectul, și fișierele rămase fără tichet; fraza păstrării în nota de confidențialitate.

  **Din client nu se citește și nu se scrie nimic în Storage** (`storage.rules` refuză tot); un fișier nou al serverului trece
  prin `functions/src/fisiere.ts`, iar o cale nouă sub `tichete/` intră în `idDinCaleProiect`, altfel jobul o numără
  necunoscută și n-o atinge. **Emulatorul Storage (9195) șterge `<temp>/firebase/storage/blobs` la oprire:**
  `scripts/test-emulator.ts` îi dă un dosar temporar al rulării; **el ignoră și precondiția `ifGenerationMatch`**. **Bucata
  contului nu importă `shared/poza.ts`** (bundlerul l-ar scoate într-o bucată nouă, `poza`, prinsă de build-ul determinist).
  Ținta de publicare `stocare` (regulile Storage) e în `TINTE_SERVER`. După unirea lui `main` (`1bf99c5`) în ramură:
  **pornirea 101,5 (cu ușa 105,1 / 110 kB), totalul 519,5 / 550, /admin 106,5 / 200, contul 29,6 / 32** (față de un build
  curat al lui `1bf99c5`: 101,5, 519,5, 105,4, 28,8).
  **Corpusul de aur al documentului (ADR 0121, felia 4.1↑, punctul 1 al etapei 4)** gata pe 02.11: același proiect de probă,
  salvat de aplicația fiecărei versiuni a schemei, v1 → v18 (commit-ul ei, în `ISTORIE`). Fiecare versiune deschide salvarea
  celei dinainte, cu migrarea ei, și adaugă ce a adus ea, de la grupul din v2 la strategia paralelă din v18. Intrările stau
  înghețate în `test/fixtures/documente/intrari/` (sha256 în `corpus.json`), ieșirile ușii de azi în `asteptat/`, iar
  documentele deschise atunci de fiecare versiune din salvarea celei dinainte în `istorie/`: migrările de azi le dau pe toate
  17 octet cu octet (nicio migrare scrisă nu s-a schimbat). Proba e `test/unit/documente.aur.test.ts`. Rețeta: `scripts/corpus-documente-reteta.ts`. Unealta: `scripts/corpus-documente.ts`
  (`--istorie` scoate sursele fiecărei versiuni cu `git cat-file --batch`, fără worktree și fără `tar`).
  **Plafonul total 500 kB (ADR 0122, felia 3.R, decizia owner-ului)** gata pe 02.11: la 441,2 / 450 kB, cele trei linii de
  lucru care urmau (contractele controlerelor și pachetul de atelier, restul textului, verificarea vectorilor) nu încăpeau în
  cei 8,8 kB rămași. Celelalte plafoane rămân. **Pornirea 98,5 (cu ușa 102,0 / 110 kB), totalul 441,2 / 500.**
  **Contractele atelierelor (ADR 0125, felia 4.6↑a, punctul 6 al etapei 4)** gata pe 02.11: NcStudio, RichAuto, Syntec, Mach3
  și Mach4, ca date (`src/post/contracte/`), după sonda s8, toate „documentate”. Contractul are câmpuri pentru ce lipsește sau
  diferă: comentariul, pauza, WCS-ul și inch pot fi `null`; `inceput`; șabloanele `scula.schimbare` / `pornire` / `compensare`;
  `rapidaSeparata`; `setari` (scrise în antet, arătate în fereastră); `senderAplicatie`; `numeScurt`. **Exportul atelierelor
  doar se descarcă:** în panoul mașinii ajunge doar familia GRBL. **Un contract nou intră în
  `test/unit/post.contracte.ateliere.test.ts`:** programul lui pe hârtie, codurile documentate ale controlerului (pe hârtie,
  cu sursa), iar cititorul dialectelor (`test/unit/ajutor-dialecte.ts`) îl compară pe corpusul CAM cu GRBL 1.1. Urmează 4.6↑b
  (pachetul de atelier, T0–T7). **Pornirea 98,4 (cu ușa 101,9 / 110 kB), totalul 448,9 / 500.**
  **Pachetul de atelier (ADR 0131, felia 4.6↑b)** gata pe 02.11: fișierele de probă T0–T7 ale celor opt controlere (setul
  din s8, Anexa B), scrise de postul aplicației, cu fișa fiecăruia (setările, ce se măsoară, valorile pe hârtie, amprentele
  SHA-256) și o arhivă, în `test/ateliere/` (`node test/ateliere/genereaza.ts`; `--verifica`). Pentru GRBL 1.1, e setul
  plăcii 3. **Un pachet trimis rămâne exact cel din repo:** o schimbare a postului care atinge un fișier de probă cade în
  `test/unit/ateliere.aur.test.ts` și cere un pachet nou, cu amprente noi (iar o probă din atelier făcută pe pachetul vechi
  rămâne a lui). Aplicația nu s-a schimbat.
  **Fișa plăcii 4 și placa de regresie (felia 4.9↑, punctul 9 al etapei 4)** gata pe 02.11: `docs/etape/placa-04.md`, cu
  șanțurile de calibrare din s4 (plată, bilă, V90, V60, arcul, plonjarea), câte un fișier pe freză în
  `test/placi/placa-04/`; fiecare cotă e prezisă de oracolul simulării (`test/unit/placa04.test.ts`). Placa de regresie e
  definită în aceeași fișă, din fișierele de aur ale plăcilor 1–4. Cu ea, etapa 4 n-are puncte fără mașină rămase: 8
  (laptopul de atelier) și plăcile cer owner-ul.
  **Gruparea (ADR 0130, felia 6.T↑, adusă din etapa 6)** gata pe 02.11, într-o sesiune paralelă (worktree-ul
  `wip/6.T-grupare`), la cererea owner-ului („vreau sa deschidem un worktree care sa faca si functia de group care sa stea
  langa ungroup”): **Grupează** (lângă Degrupează, meniul de clic dreapta, Ctrl+G) face din cel puțin două forme o piesă, cu un
  grup nou pe rădăcină, la bit în lume, cu operațiile înșirate (G-code-ul același cât formele stau una după alta). Gruparea e
  comanda `regrupeaza` a degrupării, cu `locuri` (indicii părților): inversa le pune exact unde erau. **Valorile care unesc
  V-carve-urile unei piese stau o singură dată, în `valoriVcarve` (`src/model/lume.ts`)**: lucrarea și gruparea le citesc de
  acolo. Două texte cu același V-carve se grupează (decizia owner-ului): grupul le sapă ca o singură regiune, deci se refuză
  doar când regiunile lor se ating sau se suprapun. **Pornirea 99,1 (cu ușa 102,6 / 110 kB), totalul 450,7 / 500, /admin 105,4 / 200, după unirea cu 4.6↑b și 4.9↑.**
  **Meniul global și fereastra Mașina (ADR 0132, felia 13.A↑, adusă din etapa 13)** gata pe 02.11, în worktree-ul
  `sender-ecran`: un rând sus, în toate ferestrele (zona `meniu`: marca, filele din `aranjament.ferestre`, locul indicatorului
  lucrării, căutarea, limba, tema, contul); bara de desen doar în Proiectare; Mașina pe tot ecranul, pe coloane, montată la
  prima deschidere și ținută montată. **Proiectarea acoperită rămâne montată și inertă:** o tastă nouă a desenului trece prin
  `ORIUNDE` (carcasa) și prin `activ` (modulul editării), altfel atinge desenul pe care omul nu-l vede. Indicatorul, pur, e
  `src/machine/indicator.ts`; lucrarea pornită e `cuPunctDeReluare` din flux (`beforeunload`, „Reîncarcă după lucrare”, prin
  semnalul `lucrarePornita` din pornire). **Pe ramură, pornirea 99,1 (cu ușa 102,6 / 110 kB), totalul 450,8 / 500.**
  Din 13.A↑b (03.11), bucata ferestrei Mașina vine în fundal după pornire, ca dialogurile (lista de preîncărcare, ADR
  0100): o bucată nouă la cerere fără locul ei în listă lasă prima deschidere goală. Și adusă, o componentă `lazy` suspendă
  la prima randare, iar React ține mesajul de încărcare ~300 ms: fereastra venită se montează direct (`FereastraMasina` din
  `App.tsx`). **Pornirea 100,0 (cu ușa 103,5 / 110 kB), totalul 453,2 / 500.**
  Din 13.A↑c (04.11), pe telefon (ADR 0132 §10): rândul al doilea al meniului e mereu al filelor și al indicatorului (un
  `::after` cât tot rândul îl începe); fila deschisă cu numele, celelalte doar cu iconița (deci **orice filă, și a unei
  extensii, are o iconiță**); indicatorul ia restul rândului, iar cuvântul unei stări lungi se taie cu „…”. **Un aranjament
  pe rânduri care trebuie să încapă se probează și cu un font lat** (`--font` pe Verdana; pe Linux, `system-ui` e lat), la 390,
  360 și 320 px. În CI, o probă e2e căzută își lasă urma și captura (`trace` / `screenshot` doar cu `CI`), iar rularea de
  noapte pune contextul paginii în jurnal și păstrează `test-results/` o săptămână: o cădere doar pe Linux se citește de acolo.
  **Butonul Admin, doar pentru personal (ADR 0132 §11, felia 14.C↑d)** gata pe 24.11, în sesiunea principală, la
  cererea owner-ului („si vreau in meniu un buton pentru admin, care apare daca esti logat ca admin”), unită în `main`
  pe 24.11 (`7584747a`): grupul `personal` al meniului (controlul `admin` al aranjamentului, locul `#loc-admin`, umplut
  de modulul editării), între file și indicatorul lucrării, la mijloc; apare doar cu planul `personal` din dreptul
  contului ținut și e un link spre `/admin`, în altă filă. **Nu dă niciun drept:** `/admin` cere tot logarea și rolul
  ei. Sub 40 rem nu se arată (meniul rămâne pe două rânduri). Cu 11.1↑c: pornirea +0,1 kB, totalul +0,8 kB.
  **Alinierea ca bloc (ADR 0150, felia 6.U↑, adusă din etapa 6)** gata pe 02.11, în aceeași sesiune paralelă (ramura
  `wip/6.U-aliniere`), după „3, ok” al owner-ului: comutatorul **Ca bloc** din secțiunea Aliniere face ca cele șase alinieri
  să mute cutia comună a formelor alese față de foaie, cu aceeași deplasare (așezarea dintre ele rămâne, nu se suprapun);
  oprit implicit, ținut în browser (`cncvs2.aliniere-bloc`). Avertismentul la contururile care se ating rămâne verificării
  vectorilor (etapa 10, ADR 0124). **Pe ramură, pornirea 99,1 (cu ușa 102,6 / 110 kB), totalul 450,9 / 500; după
  unirea cu 13.A↑ și cu refuzul spus de pe Ctrl+G, pornirea 99,9 (cu ușa 103,4 / 110 kB), totalul 453,1 / 500, /admin
  105,5 / 200.**
  **Ordinea de mână a operațiilor (ADR 0133, felia 5.9↑, adusă din etapa 5)** gata pe 03.11, după „continua” la schița cu
  patru recomandări: documentul v19 (`rang` pe operație, un întreg în [0, 100 000]; fără rang, ordinea automată de azi,
  octet cu octet). Ordinea programului e `ordineTaieturi` (`src/model/lume.ts`): cea automată, sortată stabil după rang. În
  fereastra exportului, **Ordinea tăierii** (Automată / A mea): rândurile în ordinea tăierii, mânerul și săgețile, „cu N” la
  V-carve-urile legate, iar exteriorul tăiat înaintea unei operații de pe piesă sau din interiorul ei cere bifa; Exportă
  scrie rangurile 0 … n−1 (în Automată, le scoate). **O comandă care înlocuiește operațiile unei piese le dă locul prin
  `cuRangulPiesei` (`src/model/ordine.ts`); rolul personalizat nu ține rangul.** Rândurile ferestrei nu mai stau în ordinea
  documentului: o probă le caută după cheie (`tr[data-operatie="e2/e2"]`; din fereastra refăcută, ADR 0290,
  `[data-fisa="op"][data-operatie="e2/e2"]`), nu după loc. **Pornirea 100,0 (cu ușa 103,5 /
  110 kB), totalul 455,3 / 500, /admin 105,4 / 200; după unirea cu 13.A↑b, pornirea 100,2 (cu ușa 103,7 / 110 kB), totalul
  455,4 / 500.**
  **Fereastra „Exportă G-code”, refăcută (ADR 0290, feliile 28.8↑a–g, aduse din etapa 28)** gata pe 24.11, în sesiunea
  cloud a liniei (ramura `wip/28.8-export`), unită în `main` pe 24.11 (`c4ca5ec2`), din cererea owner-ului din 23.11
  („nu imi place deloc fereastra asta […] vreau ca ficare setare sa fie insotita de o ilustratie sugestiva”): în
  stânga, lista (foaia și originea, mașina și fișierul, operațiile în ordinea tăierii, Rezultatul); în dreapta, fișa
  celei alese, cu câmpurile pe grupuri, după întrebarea la care răspund. Fiecare grup are explicația câmpului activ la
  vedere, greșeala lui lângă cauză („Du-mă la …”) și desenul întrebării, făcut din valorile omului, cu cota câmpului
  activ aprinsă; alegerile sunt cartonașe cu poze; Rezultatul vine pe grupuri (de văzut, fișierele, rezumatul,
  simularea); Esc și un clic în afară închid fereastra. **Nu schimbă ce face fereastra:** aceleași câmpuri, aceleași
  valori, același program, octet cu octet; documentul rămâne v27. Fișa unei operații e `src/ui/FisaOperatie.tsx` (cu
  `ContextFisa`: ce îi trebuie nou intră acolo, nu ca import din fereastră), tipurile și ajutoarele rândului sunt în
  `src/ui/exportRand.ts`, iar foaia, mașina, lista și Rezultatul în `src/ui/DialogExport.tsx`. **Un câmp nou al
  ferestrei își cere grupul în `GRUP_CAMP` (`src/ui/exportGrupuri.ts`; altfel cade `export.grupuri.test.ts`),
  explicația (`….titlu`, în ambele limbi) și locul în proba privirii (`export.privire.spec.ts`: fontul lat, telefonul,
  densitatea mare); ce spune un desen nou se socotește în `src/ui/exportDeseneCalcul.ts` și se compară cu lucrarea în
  `export.desene.test.ts`.** **Selectorii probelor s-au schimbat:** o operație e `[data-fisa="op"][data-operatie="…"]`
  (în listă, `[data-nav-op="…"]` și `[data-nav="…"]`), o alegere e un cartonaș (`alege(loc, camp, v)` și `aleasa(loc,
  camp)` din `test/e2e/ajutor-export.ts`), iar ce nu se aplică nu apare (`toHaveCount(0)`), nu e oprit. Celelalte
  capcane sunt în `docs/linii/export.md`. Fișa e gata de luat de Clasic (28.2↑) și de Pas cu pas (28.4↑), fără copiere.
  Felia: pornirea +0, totalul +16,3 kB (856,8 / 900).
  **Numele fișierului în fereastra exportului (ADR 0291, felia 28.8↑n)** gata pe 25.11, unită în `main` pe 25.11
  (`1eda6f0b`), prima felie de după auditul ferestrei: în „Mașina și fișierul”, după Unități, câmpul „Numele
  fișierului”, propus din numele scris al foii (fără diacritice, cu liniuțe), altfel `cncvs2-` și colțul; fișierele
  pe freză, ale dopurilor, arhiva foilor și numele din ea îl iau în față (`cuBaza`, după calcul, pe firul principal:
  programul, aceiași octeți). **Regula numelui stă în `src/post/numeFisier.ts`:** un nume gol, prea lung, cu
  caractere oprite, cu margini rele sau rezervat de Windows oprește exportul, cu „Du-mă la …”; pe RichAuto, numele
  scurt al controlerului, cu câmpul oprit. Felia: pornirea +0,1 kB, totalul +1,0 kB.
  **Centrul foii ca origine XY0 (ADR 0291 §6, felia 28.8↑o)** gata pe 25.11, unită în `main` pe 25.11 (`3fd3bf49`):
  a cincea alegere a originii, lângă colțuri (`OrigineXY`, `ORIGINI`, în `src/ir/montaj.ts`): o translație cu
  jumătatea foii pe fiecare axă, cu Z0 ca la colțuri. Antetul scrie „(origine centru, …)”, citit de sender
  (`src/machine/program.ts`); panoul Mașina spune „Originea XY a programului: centrul foii.”, raportul foilor la fel;
  numele propus e `cncvs2-centru`, iar dopul își ia numele după el. **Mișcă mașina:** colțurile ies octet cu octet
  ca înainte, iar proba centrului e `test/unit/montaj.centru.oracol.test.ts` (pe hârtie; corpusul CAM, rând cu rând
  față de colț; poarta și oracolul buzunarului, care citesc acum și centrul; senderul; emulatorul GRBL). **O origine
  nouă intră în `ORIGINI` (în montaj, `src/ir/montaj.ts`, și în lista ferestrei, `src/ui/exportRand.ts`), în antetul
  citit de sender, în oracolele porții și buzunarului (`test/oracles/poarta.ts`, `buzunar.ts`: citesc originea pe
  hârtie) și în proba aceea.** Proba pe mașină rămâne a owner-ului.
  Felia: pornirea +0, totalul +0,2 kB (890,3 / 1 000).
  **Fereastra exportului „pe hârtie” (ADR 0291 §1, feliile 28.8↑h și 28.8↑h-2)** gata pe 25.11, unită în `main` pe
  25.11 (`7d74ade2`): desenele și notele fișei unei operații vin din funcțiile lucrării, socotite de aplicație
  (`hartieRand`, `src/app/hartieExport.ts`; fișa le primește prin `ContextFisa.hartie`): adâncimea tăiată
  (`adancimeTaiata`, `src/cam/prinFoaie.ts`), trecerile (`adancimiTreceri`, `src/cam/treceri.ts`), felul găuririi și
  pașii ciocănirii (`src/cam/gaurireFel.ts`). **Regula „cât foaia” stă o singură dată, în `catFoaia`** (V-carve-ul,
  incrustațiile și finisarea reliefului rămân afară): lucrarea (`cuTaieturiPrinFoaie`) și desenele o citesc de
  acolo, deci un fel nou de operație își spune locul în ea, cu proba în lucrare și pe hârtie. Găurirea pe elice are
  desenul ei, fără câmpul ieșirii; un cerc pe care freza nu-l poate găuri e o greșeală în grupul Freza, iar Exportă
  e oprit înainte de clic (`gauriBune`). „Du-mă la …” aduce în vedere grupul primei greșeli și pune focusul pe câmpul
  greșit. **O probă care cere „greșeala se vede” o cere întreagă în panou, pe dreptunghiuri, nu `toBeInViewport()`**
  (trecea cu 4 px). Programul, octet cu octet. Rămân în fereastră, cu proba lor: urechile de pe schiță, pasul
  lateral și coborârea, V-carve-ul și incrustațiile (28.8↑m). Felia:
  pornirea +0, totalul +1,7 kB (909,1 / 1 000).
  **Viteza ferestrei exportului (ADR 0291 §1, felia 28.8↑i)** gata pe 25.11, unită în `main` pe 26.11 (`953205a8`):
  peste 12 operații (`PRAG_FISE`, `src/ui/DialogExport.tsx`), se randează doar fișele din jurul panoului, cea
  curentă cu vecinele ei și cea cu focusul; celelalte își țin locul (`[data-fisa="op"][data-gol]`, cu titlul și
  înălțimea măsurată), iar „Du-mă la …” randează întâi fișa, apoi derulează. Rândurile listei sunt `memo`
  (`RandListaOp`, cu acțiunile printr-un obiect stabil). Pe 150 de operații, măsurat de linie: deschiderea 9,7 s →
  ~0,5 s, o tastă 96 → ~10 ms. **O probă care lucrează într-o fișă departe o aduce întâi** (clic în listă, „Du-mă
  la …” sau derulând), iar una care numără fișele randate le caută după `:has([data-grup])` sau `:not([data-gol])`.
  **O probă de timp măsoară în pagină și ia cea mai bună încercare** (`export.viteza.spec.ts`): `expect` din
  Playwright întreabă pagina în trepte (0, 100, 350, 850 ms…), deci un timp citit așa sare pe treptele lui.
  **Fără `content-visibility` pe rânduri pe care se dă clic:** departe de vedere au înălțimea 0, iar clicul cade
  alături. Programul, octet cu octet. Urmează 28.8↑j (greșelile pe înțeles), apoi k, l. Felia: pornirea +0,
  totalul +0,3 kB (909,4 / 1 000).
  **Aldinul și cursivul sintetic (ADR 0123, felia 7.5↑, adusă din etapa 7)** gata pe 02.11, în worktree-ul `wip/7.5-text`:
  bifele **Aldin** și **Cursiv** din panoul textului, pentru orice font. Cursivul înclină fiecare literă față de linia ei de
  bază, exact; aldinul așază literele la înălțimea miezului (h − 2d), le îngroașă cu d prin fațada offsetului
  (`offsetFigura`: o figură par-impar, în ambele sensuri, prin `Shape` din cavalier) și le mută cu (d, d), deci H rămâne de
  h. Literele îngroșate sunt linii și arce (cubicele ca biarce sub 0,001 mm), ținute în memorie după cheia lor exactă.
  **Corpusul aldinului e Python** (`aldin` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/aldin.json`): oracolul
  nu construiește litera, ci clasifică punctele unei grile în jurul ei (în miez sau la cel mult d de el); un caz nou = rândul
  în `CAZURI_ALDIN`, apoi fixtura regenerată și comisă. **Pornirea 98,6 (cu ușa 102,2 / 110 kB), totalul 444,6 / 500.**
  **Fonturile cu o singură linie (ADR 0140, felia 7.6↑, adusă din etapa 7)** gata pe 02.11, în același worktree: cititorul
  recunoaște singur un font de gravură (`Font.linie`: contururile fără arie ale literelor drepte, `src/text/linie.ts`) și îi
  citește trăsăturile după convenția fontului (dus-întors, păstrată deschisă sau buclă; TrueType și CFF); trăsăturile se
  așază ca linii deschise (capetele cu regulile ușilor importului), fără normalizare și fără aldin, iar piesa e gravată pe
  linie la adâncimea liniilor importate. **Relief SingleLine** (OFL 1.1, din `isdat-type/Relief-SingleLine`, subset) e
  inclus. **Corpusul liniilor simple e Python** (`linie` în `test/oracles-py/text_corpus.py`, `test/fixtures/text/linie.json`,
  cu variantele lui Relief: dus-întors, cu bucle, CFF): un caz nou = rândul în `CAZURI_LINIE`, apoi fixtura regenerată și
  comisă. **Fonturile SVG (ADR 0140 §7, felia 7.6↑b)** gata pe 02.11: `src/text/fontSvg.ts` le citește prin aceeași ușă
  (`felFisier` dă `'svg'`, o singură față), cu garda entităților din `src/io/entitatiXml.ts` (comună cu importul SVG; luată
  din `svg.ts`, ar trage în bucata textului toată ușa SVG) și parserul căilor importului; tipurile fontului stau în
  `src/text/tipFont.ts` (fără ciclu între cele două cititoare). Corpusul lor e tot Python (`fonturi_svg`, `svg.json`; fontul
  SVG al lui Relief și două fonturi de probă scrise în generator: `SVG_TRASATURI`, `SVG_PLIN`). **Pornirea 98,6 (cu ușa
  102,2 / 110 kB), totalul 447,2 / 500.**
  **Textul vertical (ADR 0141, felia 7.7↑)** gata pe 03.11: `vertical: true` în bloc (nu pe o curbă); `aseazaText` are două
  ramuri (rânduri, coloane) peste desenul comun al unei litere (`contururiLitera`); coloanele stivuiesc literele după cutia
  exactă (`cutieContur`; la aldin, cutia miezului cu 2d în plus), la golul max(0, em − majuscula) + spațierea. Corpusul lui e
  tot Python (`fonturi_verticale`, `vertical.json`; aldinul vertical în `aldin.json`): un caz nou = rândul în
  `CAZURI_VERTICAL`, apoi fixtura regenerată și comisă. **Pornirea 98,6 (cu ușa 102,2 / 110 kB), totalul 447,8 / 500.**
  **Încadrarea în casetă (ADR 0142, felia 7.8↑)** gata pe 03.11: `caseta` în bloc (`limita`, cu `ceruta`, și `scala`;
  `inaltime` e cea desenată), nu pe o curbă; `aseazaText` caută înălțimea pe marginile afine ale cutiilor din două așezări de
  măsurare (`aseaza(…, masurare)`, fără offsetul aldinului), apoi așază o dată; fiecare literă are `cutie`, textul are
  `inaltime`. Corpusul: `fonturi_caseta`, `caseta.json` (oracolul caută prin înjumătățire pe așezări întregi); aldinul în
  casetă, în `aldin.json`. Din definiția pragului textului (`PlanNou-CNC/Plan-CNC-Studio-2.html`) mai rămân mărimea în
  puncte sau inch, scalarea textului în lățime și în înălțime (%) și spațierea manuală între literele alese. **Pornirea 98,6 (cu ușa 102,2 / 110 kB), totalul 449,0 / 500.**
  **Verificarea vectorilor, detectarea și panoul (ADR 0124, felia 10.1↑, adusă din etapa 10)** gata pe 02.11, în worktree-ul
  `wip/10.1-vectori`: **Verifică vectorii**, în extensia barei, găsește pe foaie (sau pe instanțele alese) duplicatele,
  intersecțiile dintre forme, autointersecțiile (cu bucla mai mică și procentul ei), nodurile prea apropiate și căile
  deschise, cu un cerc pe pânză în locul fiecăreia (roșu în aceeași formă, verde între forme). Calculul pur e
  `src/model/verificare.ts`, în workerul CAM (cererea `verificare`, prin `actiuniExportCalcul.ts`); panoul vine la cerere
  (`src/app/PanouVerificare.tsx`). **O ratare sau o alarmă falsă găsită pe un desen real intră în
  `test/unit/verificare.test.ts`, cu valoarea ei pe hârtie.** **Pornirea 98,5 (cu ușa 102,0 / 110 kB), totalul
  454,7 / 500.** După unirea în main (04.11), cu linia textului: **pornirea 100,3 (cu ușa 103,9 / 110 kB), totalul
  468,9 / 500, /admin 105,3 / 200.**
  **Reparațiile verificării (ADR 0124 §10–§16, felia 10.2↑)** gata pe 04.11, în același worktree, după formularul
  owner-ului (1c, 2a, 3a, 4a, 5a, 6b, 7b, 8a; „check vectors trebuie să-l ajute să găsească erori mai mult decât să i le
  repare”): Scoate toate copiile (un singur buton), Închide (golul sub „Închide sub”, 1 mm), bucla scoasă sub pragul
  buclei mici sau despărțită peste el, nodurile prea apropiate din aceeași formă unite; intersecțiile doar se arată, iar o
  piesă pusă de mai multe ori nu se repară. Ce se poate repara și reparația însăși sunt ale workerului CAM
  (`src/model/reparare.ts`, cererile `verificare` și `reparare`), pe documentul de la clic; acțiunea `document.repara` le
  aplică într-un pas, doar dacă documentul e încă același. **Bucla se taie exact, în coordonatele elementului, cu
  parametrii celor două drumuri prin încrucișare (`adaugaNod`): restul vârfurilor rămân la bit; o reparație nouă păstrează
  regula și se probează la fel, cu documentul de după trecut prin ușă.**
  **Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑, adusă din etapa 10)** gata pe 06.11, în worktree-ul `taiere` (ramura
  `wip/10.3-taiere-conversie`), după răspunsurile owner-ului (1a–6a): **Taie** (foarfeca, în extensia barei, după boolean)
  împarte formele alese cu linia verticală X, orizontală Y sau un ghidaj al foii: fiecare formă prin care trece linia devine
  două forme, ce e de o parte și ce e de cealaltă, alese; „Închide bucățile” e la alegere (ținută în browser,
  `cncvs2.taiere-inchide`): un inel dă două „U”-uri, iar fără bifă un cerc tăiat prin centru dă două semicercuri, câte un arc.
  Calculul pur e `src/model/taiere.ts`, în workerul CAM (cererea `taiere`, prin `taieVectorii` din `actiuniExportCalcul.ts`);
  acțiunea `document.taie` aplică comanda `degrupeaza` (o instanță înlocuită de părțile ei) doar dacă documentul e încă cel de
  la clic; panoul vine la cerere (`src/app/PanouTaiere.tsx`), cu linia punctată pe pânză. **Locurile de tăiere se calculează
  direct pe segmente (linia, arcul, cubica pe bucăți monotone), bucățile se taie exact cu `adaugaNod`, restul vârfurilor
  rămân la bit, iar rolul piesei (`rolPiesei`, `grupeRol`) se păstrează pe părți.** Oracolul independent e
  `test/oracles/taiere.ts` (corpusul din sămânță, `taiere.oracol.test.ts`): o tăiere care strică acoperirea, partea sau aria
  cade acolo. **Între 40 și 75 rem, extensia barei trece pe două rânduri când nu mai încape** (la 1024 px are ~1 120 px; pe
  `main`, „3D” ieșea deja din fereastră); telefonul a rămas cum era. **Pornirea 101,4 (cu ușa 104,9 / 110 kB), totalul
  504,5 → 511,3 / 550 kB** (workerul CAM +4,5 kB, panoul 1,9 kB).
  **Cuțitul-formă și „Taie la intersecții” (ADR 0180, felia 10.3↑b)** gata pe 07.11: ultima formă aleasă (Shift + clic) e
  cuțitul și rămâne neschimbată; locurile comune vin din cavalier (`intersectiiIntre`), rafinate cu Newton pe segmentele
  adevărate (`rafineaza` și `treceri`, exportate din `reparare.ts`). **Un contur închis se taie doar unde exact una dintre
  bucățile cuțitului de lângă loc intră în regiunea piesei** (o trecere sau capătul cuțitului care intră; o atingere nu); o cale
  deschisă, unde cuțitul o trece de tot. Cu închidere, corzile sunt bucățile cuțitului din regiune, iar fețele merg pe bucăți
  (cu regiunea în stânga) și pe corzi; **o față cu aria negativă e marginea dinăuntru a unei regiuni și merge cu ea**. Cuțitul
  închis lasă două părți (înăuntru, în afară), cel deschis face din fiecare față o formă; refuzurile noi: `nu-trece`, `cutit`
  (doar cu închidere), `pe-linie` și pentru cuțit, `prea-multe`. „Taie la intersecții” (panoul și meniul de clic dreapta) taie
  fiecare contur ales în locurile lui comune cu celelalte, nu și în buclele lui. Oracolul are `judecaCutitul` și
  `judecaIntersectiile` (`taiere.forma.oracol.test.ts`); generatorii corpusurilor stau în `test/unit/ajutor-taiere.ts`.
  **Decuparea la ultima formă aleasă (felia 10.3↑c)** gata pe 07.11: granița (închisă, refuzul `granita`) rămâne; fiecare formă
  aleasă e împărțită ca de un cuțit închis (`impartireCuForma`, aceeași cu a tăierii; `laturi` dă înăuntru și în afară) și
  păstrează partea aleasă. O formă fără nimic acolo pleacă, iar una care trece granița se taie, se șterge sau rămâne întreagă.
  **Rezultatul tăierii are acum `sterse`**: acțiunea `document.taie` pune întâi ștergerile (`comenziStergere`), apoi degruparea,
  într-un singur `lot`. Oracolul are `judecaDecuparea` (`taiere.decupare.oracol.test.ts`).
  **Conversia (felia 10.3↑d)** gata pe 07.11: `src/model/conversie.ts` (`converteste`, pură, în workerul CAM, cererea
  `conversie`), panoul Convertește (`src/app/PanouConversie.tsx`, lângă Taie) și acțiunea `document.converteste` (un lot de
  `inlocuieste-piesa`). **Arce:** biarcele din ADR 0033, toleranța împărțită la scara elementului (un element întins
  neuniform se sare); șirurile de linii pe un cerc devin arce prin primul, mijlocul și ultimul vârf, fără colțuri (peste 30°)
  și fără arce peste 180°. **În cerc:** Kåsa pe vârfuri la o formă doar din linii (prin noduri), abaterea radială doar cât
  forma ocolește centrul o dată, altfel Hausdorff. **În dreptunghi:** aria minimă pe învelitoare, unghiul în (−45°, 45°], raza
  colțului din colțurile lipsă; un cerc nu e dreptunghi, o fantă da. Elementul își păstrează id-ul și operațiile (găurirea
  refuză dreptunghiul). Oracolul are `judecaConversia`, `hausdorff`, `cutieForma`, `cerculFormei`, `dreptunghiulFormei`
  (`conversie.oracol.test.ts`).
  **Netezirea (felia 10.3↑e)** gata pe 07.11: `src/model/netezire.ts` (`netezesteCale`, cererea `netezire` a conversiei,
  cu „Păstrează”), blocul Netezește din panoul Convertește. Șirurile de linii scurte devin cubice Schneider, fiecare
  verificată cu Hausdorff; **colțurile: peste 60° pe 4 × toleranța** (la Arce, 30°), nejudecate la mai puțin de atât de
  capătul unui șir; un șir drept rămâne linii; vârful 0 al căii închise rămâne; totul în lume, mânerele duse înapoi cu
  inversa. Hausdorff-ul comun: `src/model/abatereContur.ts`. Oracolul are `judecaNetezirea`
  (`conversie.netezire.oracol.test.ts`), cu margini inferioare ieftine în `distantaLaForme` (de 7–10 ori mai repede).
  **Unealta Cuțit (ADR 0181, felia 10.3↑f)** gata pe 08.11: K, după Noduri; felurile Linie, Pen, Liber și Formă (un text sau
  altă formă existentă e cuțitul). Modelul: cuțitul `cale` (tras, nu intră în document, netezit la mâna liberă) și `forme`
  (instanțele, par-impar) în `src/model/taiere.ts`; **buclele libere** (un cuțit închis tot înăuntrul unei forme intră în ambele
  părți, cu latura întoarsă după adâncime pe o piesă fără rol) valorează și pentru cuțitul-formă din panou. Unealta:
  `src/app/UnealtaCutit.tsx` (adusă în bucata tăierii, bara prin portal, gestul prin intermediarul `gestCutit` din editare),
  partea pură în `src/app/cutitCalcul.ts` (țintele 2a, urma, locurile aproximative), bifa comună în `optiuniTaiere.ts`.
  Oracolul: `judecaCutitul` cu `tolCutit` (mâna liberă), corpusurile în `taiere.cutit.oracol.test.ts`.
  **Foarfeca, Retează și Desparte (felia 10.3↑g)** gata pe 08.11: cuțitele `foarfeca` și `reteaza` (instanța, punctul,
  toleranța) în `taiere.ts`; foarfeca deschide un contur închis (`taieLaLocuri` cu `deschide`) sau desparte unul deschis în
  forme; retezatul scoate bucata dintre locurile comune ale conturului lovit (`locuriPeContur`), iar restul **stă în piesă**.
  **Selecția rămâne** după orice tăiere a cuțitului (`selectieDupa`). Desparte, în unealta Noduri, folosește foarfeca. Oracolul:
  `judecaFoarfeca`, `judecaRetezarea` (`taiere.foarfeca.oracol.test.ts`).
  **Opțiunile tăierii (felia 10.3↑h)** gata pe 08.11: linia `{ fel: 'unghi', x, y, unghi }` (linia de tăiere are normala și
  direcția ei: `Linie = { n, u, v }`; verticala și orizontala, la bit ca înainte); în cerere `pastreaza` (stânga / dreapta
  direcției; la cuțitul închis, înăuntru / în afară; la cel deschis, latura fețelor din sensul corzilor), `prelungeste` (pe
  tangentă, până ies din regiunile țintelor sau dincolo de toate) și `stergeCutitul`. Opțiunile, o singură setare în browser
  (`optiuniTaiere.ts`, cu `useSyncExternalStore`), cu grupurile comune în `GrupuriTaiere.tsx`; în bara Cuțitului, într-un panou
  sub butonul „Opțiunile tăierii” (bara de sus n-are loc de ele pe rând); `useInFereastra` stă acum în `inFereastra.ts`.
  Oracolul: `judecaLinia`, `judecaPastrareaConvex` (`taiere.optiuni.oracol.test.ts`).
  **Spațiul și suprapunerea (felia 10.3↑i)** gata pe 09.11: `intre = { fel, latime }` în cerere (doar cu închidere; limitele
  în `intreBucati.ts`, comune cu interfața): fiecare parte se taie cu cuțitul mutat cu w / 2 (linia: paralela; calea:
  `offsetDeschis`, o bucată, capetele prelungite cât au rămas într-un contur tăiat; cel închis: `offsetFigura`), doar formele
  tăiate de cuțitul nemutat; `spatiu` când o bucată de partea păstrată nu trece de cuțitul mutat (`mancata`; găurile scapă),
  `spatiu-cutit` când cuțitul nu se poate muta. `partiLinie` e scos din `taieInstanta`, `grupare` și `pastrate` din
  `taieCuForma`. Oracolul: `judecaSpatiul`, `judecaConvexMutat` și `mancatRaster` (o rețea care găsește singură bucățile
  mâncate), în `taiere.spatiu.oracol.test.ts`.
  **Îmbinarea (felia 10.3↑j)** gata pe 09.11: `imbinare = { model, pas, inaltime, raza }` în cerere (doar cu închidere, doar
  pe tăieturile drepte: linia din panou și calea trasă din două puncte); modelele în `src/model/imbinare.ts` (pur, comun
  workerului și previzualizării): dinții întregi la mijlocul fiecărei coarde, ⌊l / pas − 1⌋, cu cel puțin o jumătate de pas la
  capete, colțurile rotunjite cu raza (valul și puzzle-ul, arce tangente), fiecare drum simetric față de mijlocul coardei.
  Drumul (`drumCuImbinare`) se taie ca un cuțit-formă deschis, cu spațiul de la 10.3↑i drept joc; la linia din panou, fețele
  se grupează pe laturi (`grupat`). Refuzurile: `imbinare`, `imbinare-raza`, `imbinare-margine`, `imbinare-dreapta`,
  `imbinare-inchide`. Oracolul: `judecaImbinarea` (`taiere.imbinare.oracol.test.ts`). **Bara Cuțitului nu mai are „Închide
  bucățile”** (e în opțiunile lui), iar sub 95rem butoanele barei de sus doar cu iconiță au 8 px de fiecare parte: cu Cuțitul
  în bara uneltelor, bara Transformării trecea de 1280 px cu grila și fontul lat (proba în `ancore.spec.ts`; a Cuțitului, la
  fiecare fel, în `cutit.spec.ts`).
  **Tăierea în panouri (felia 10.3↑k)** gata pe 13.11, pe `wip/10.3k-panouri` (făcută din `main`), neunită: grila în
  `src/model/grilaPanouri.ts` (pur, comun workerului și previzualizării), tăierea în `src/model/panouri.ts` (în worker, pe foaia
  activă, ca restul tăierii: `indexFoaie`; linie cu linie, cu `desparte` în `taie`: o formă cu contururi de ambele părți ale
  unei linii care nu le trece se desparte), gruparea panourilor pe firul principal (`src/model/grupuriPanouri.ts`, din
  `document.taie`: gruparea citește blocurile de text cu valibot, deci în worker ar aduce ~4,5 kB). Rezultatul tăierii are
  `grupuri` (panourile de grupat) și `panouri` (câte sunt); alegerea de după, din comanda tăierii (`ids`). Oracolul:
  `judecaPanourile` (`taiere.panouri.oracol.test.ts`).
  **Panourile pe foi (felia 10.3↑l)** gata pe 17.11, pe `wip/10.3l-panouri-foi` (din `main` `021dcc6`, cu `4b52fc3` unit),
  neunită: mărimea implicită a panoului, locul pe foaie și cel mai mare panou în `src/model/panouriPeFoaie.ts` (pur, pe firul
  principal; blocul citește marginile ținute ale așezării, `optiuniTinute`, și freza exterioară, `distantaMinima`); „Așază pe
  foi…” din bloc deschide dialogul pe alegere (`onAseaza`, din `Editare` prin `PanouTaiere`). În `taie`, `opriri` (doar de la
  panouri, cu îmbinare): coarda se împarte în punctele liniilor celeilalte axe, cu dinții pe fiecare bucată (reparația refuzului
  `pe-linie` al dinților drepți pe grila egală).
  **Piesele puse de mai multe ori la tăiere și la conversie (felia 10.3↑m)** gata pe 17.11, pe `wip/10.3m-surori` (din vârful
  lui 10.3↑l, cu `main` `9361c83` unit; unirea ei aduce și 10.3↑l), neunită: calculul (`actiuniExportCalcul.ts`) întreabă doar
  la refuzul `impartita` (`cereAlegerea` din `src/ui/intrebareSurori.ts`: alegerea ținută, `cncvs2.taiere-surori`, sau banda
  `IntrebareSurori.tsx` din `Editare`) și reia: «Desprinde și taie» pe documentul desprins (prin `documentDesprins` din calculul
  acțiunilor, ca modulele pieselor legate să rămână în bucata lor), «Taie piesa» cu `surori: 'piesa'`; comenzile, în
  `src/model/taiereSurori.ts` (desprinderea doar a celor schimbate, bucățile pe toate foile), cine are surori și `CUTITE_PIESA`
  în `src/model/surori.ts` (ușor: importat de calcul, nu din `taiere.ts`). Reparațiile și degruparea refuză în continuare o
  piesă pusă de mai multe ori.
  **Numărul panoului gravat pe el (felia 10.3↑n)** gata pe 21.11, pe `wip/10.3n-numere` (din `main` `4b7539a7`), neunită:
  workerul dă `perPanou` (bucățile fiecărui panou, `panouri.ts`); blocul panourilor (bifa și înălțimea în `optiuniTaiere.ts`:
  `cncvs2.taiere-numere`, `cncvs2.taiere-inaltime-numar`) cheamă la cerere `src/app/numerePanouri.ts` (fontul
  `relief-singleline`, cifrele prin `text/calcul.ts`, freza foii, adâncimea liniilor deschise), care caută locul cu `locNumar`
  din `src/model/numarPanou.ts` (pur); înălțimea și verificarea ei stau în `src/model/inaltimeNumar.ts` (ușor: luate din
  `numarPanou.ts`, aduceau locul cifrelor în bucata panoului Taie). Acțiunea `document.taie` pune numerele
  (`TaiereCalculata.numere`) cu id-uri noi în grupurile panourilor, în același pas.
  **Legarea căilor (felia 10.3↑o, ADR 0182)** gata pe 22.11, pe `wip/10.3o-legare` (din vârful lui 10.3↑n, cu `main` `40487c43`
  unit), unită în `main` pe 23.11 (`ab7dc43d`): legarea în worker (`src/model/legareCai.ts`, cererea `legare`, cu harta, felul operațiilor și schimbările
  pieselor din `reparare.ts`), aplicată prin `document.repara`; acțiunea ușoară `document.leaga-caile` (Ctrl+J, paleta) cheamă
  `legaCaile` din context, dat de `Editare` prin `onLegare`; butonul și săgeata opțiunilor (`PanouLegare.tsx`) în secțiunea
  booleanului; în Verificare, „Leagă” și „Leagă toate căile”. Opțiunile, în `src/model/legareOptiuni.ts` (ușor: depozitul
  `src/app/optiuniLegare.ts`, cheia `cncvs2.legare`, îl ia de aici, nu din `legareCai.ts`); textele, în `src/app/textLegare.ts`
  (comun cu Verificarea, fără ciclu prin `Editare`). Feliile următoare: 10.3↑p (unealta Noduri), 10.3↑q (felurile legăturii),
  10.3↑r (legarea la import).
  **Foaia activă și lista cu foile (ADR 0210, felia 11.1↑, adusă din etapa 11)** gata pe 07.11, în worktree-ul `plansele`
  (ramura `wip/11.1-plansele`), după „Da, toate”: foaia activă e a ferestrei (o vedere ținută în browser, `cncvs2.foaia`, fără
  revizie și fără anulare); pânza, uneltele, panoul, verificarea, reparația, tăierea, traseul, timpul, vederea 3D și exportul
  lucrează pe ea. Lista arată foile (piesele doar sub cea activă), cu „+ Foaie nouă” și meniul foii (⋯ sau clic dreapta, la
  cerere, `MeniuFoaie.tsx`); PgUp / PgDn trec între foi (cu Ctrl, ale browserului); mutarea pe altă foaie, din meniul de clic
  dreapta al pânzei sau trăgând rândul. **Foaia activă se dă explicit (`ContextDocument.foaie`; `indexFoaie` în editare și în
  workerul CAM, la verificare, reparare și tăiere, pe documentul întreg); CAM-ul care doar citește primește documentul văzut
  din foaie (`doarFoaia`), deci programul unei foi e octet cu octet al documentului doar cu ea.** Comenzile noi ale jurnalului
  au inversa exactă și se aplică din `jurnalFoi.ts`, înregistrat odată cu calculul acțiunilor (nu stă în pornire). **`material`
  nu intră în schemă:** în documentele de până la el era un câmp necunoscut al foii, cu orice valoare (oracolul îl generează
  așa); aplicația îl citește doar când e text și scrie doar text; comanda etichetei ține valoarea veche exactă. **Pornirea
  101,5 → 103,7 (cu ușa 107,2 / 110 kB), totalul 519,5 → 524,7 / 550.**
  **Toate foile pe pânză (ADR 0210 §1, felia 11.1↑b)** gata pe 07.11: foile stau una lângă alta, în ordinea listei, la
  100 mm (`locuriFoi`), cea activă vie, celelalte estompate, needitabile, cu numele deasupra; dublu-clic pe una o face
  activă (vederea se mută cu originea: pânza nu sare); comutatorul „Toate foile pe pânză” (`vedere.toate-foile`, ținut în
  browser, `cncvs2.toate-foile`), pornit, le încadrează pe toate. **Originea rămâne a foii active** (riglele, ghidajele,
  uneltele, traseul neschimbate); foile vecine merg la workerul pânzei într-un mesaj al lor (`CerereFoi`), doar când se
  schimbă. **Pornirea 104,3 (cu ușa 107,8 / 110 kB), totalul 525,5 / 550.**
  **Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c)** gata pe 24.11, în sesiunea principală, la cererea owner-ului
  („vreau ca plansele sa aiba controalele din meniu si sub ele, si sa apara doar la hover sau cand sunt selectate”),
  unită în `main` pe 24.11 (`7584747a`): sub fiecare foaie de pe pânză, la stânga, rândul cu cele șapte comenzi ale
  meniului „⋯”, ca iconițe, prin același registru (`ActiuniFoi`; un refuz e stins, cu motivul în sfat; ștergerea unei
  foi cu piese întreabă în rând). Rândul foii active se vede mereu; al unei vecine, doar cu mausul pe ea, pe fâșia de
  sub ea sau pe rând. Partea pură e `src/ui/controaleFoiCalcul.ts`, iar componenta `ControaleFoi` stă în bucata
  meniului foii (`src/ui/MeniuFoaie.tsx`, la cerere). **Rândul foii active acoperă o fâșie de vreo 215 × 34 px sub
  colțul din stânga-jos al foii: un gest nu poate începe pe ea** (o probă e2e care trage de sub foaie, la stânga,
  pornește din altă parte: `cutit.spec.ts:421` a căzut așa în primul complet). Nu se arată într-un proiect doar de
  citit, sub fereastra Mașina sau Imprimanta și cât ține un mod al pânzei.
  **Rândul nu trece de foaia lui (ADR 0210 §1, felia 11.1↑d)** gata pe 24.11, în sesiunea principală, la „si trebuie
  sa reparam si asta” al owner-ului (trei capturi: cu pânza micșorată, rândul era mai lat decât foaia și două rânduri
  se suprapuneau), unită în `main` pe 24.11 (`001b6325`): rândul e întreg doar cât încape sub foaia lui; mai îngust,
  se strânge într-un buton, **⋯** („Arată comenzile foii”), care îl desface peste ce e alături (mausul plecat, Escape
  sau o comandă îl strâng la loc); sub lățimea unui buton nu se mai arată. Regulile, pure, sunt `latimeRand`,
  `felRand` și `stangaInPanza` (`src/ui/controaleFoiCalcul.ts`); mărimea butonului se măsoară (la densitatea mare are
  48 px, deci rândul întreg are 354 px, nu 214). **Rândul e frate al pânzei, nu copil: îi dă el pânzei rotița, cu locul
  cursorului** (altfel zoom-ul se oprea cu cursorul pe rând); orice strat nou pus peste pânză face la fel.
  **Piesele puse de mai multe ori (ADR 0210 §2, felia 11.2↑)** gata pe 08.11: «Încă…» și «+1» adaugă instanțe ale aceleiași
  piese (`planCopii` în `src/model/pieseLegate.ts`: rândurile după ea, distanța din freză, foaia următoare goală, foile noi),
  «Desprinde» îi dă instanței o copie a piesei (ultima păstrează piesa), „Duplică foaia cu aceleași piese” face instanțe noi
  ale acelorași piese. **Editarea unei piese puse de mai multe ori o schimbă pentru toate** (refuzurile vechi au ieșit din
  transformări, noduri, forma din panou și text; două instanțe alese care ar schimba-o diferit se refuză, `piesa-impartita`);
  degruparea, reparațiile și tăierea vectorilor rămân refuzate, cu „Desprinde-o întâi”. Gruparea cu surori întreabă („Doar
  aceasta” / „În toate cele N”, ținută în `cncvs2.grupare-surori`); banda violet stă jos, la mijlocul zonei libere (sus,
  riglele urmează foaia), întrebarea sus, sub bare. `idNou` și `copieArbore` stau în `src/model/copii.ts`. **Pornirea 104,9
  (cu ușa 108,5 / 110 kB), totalul 544,4 / 600.**
  **„Așază pe foi” (ADR 0210 §3, felia 11.3↑)** gata pe 08.11: fereastra `DialogAsezare.tsx` (la cerere) și
  `planAsezare` / `comenziAsezare` în `src/model/asezare.ts` (din colț, rând cu rând, ocolind piesele rămase cu freza lor,
  vărsarea pe foaia următoare goală și pe foi noi, piesele prea mari pe loc; rotirea „90” ia varianta culcată doar când e
  strict mai bună). Distanța minimă e freza profilului exterior: scrisă mai jos, refuz; unde omul n-a scris (deschiderea
  ferestrei, „Mută și așază la capăt” din meniu), urcă singură. Alegerile se țin în `cncvs2.asezare`
  (`src/app/asezareTinuta.ts`: `src/ui` nu importă modelul, regula `interfata-prin-actiuni`). Scrierea ferestrei trece pe
  lângă garda „dialog deschis” (`ruleaza(registru, …)`), ca exportul. **Pornirea 105,3 (cu ușa 108,9 / 110 kB: rămân
  1,1 kB), totalul 548,7 / 600.**
  **Plăcuțele, nucleul (ADR 0210 §4, §7, felia 11.4↑)** gata pe 08.11: documentul **v23** (`Instanta.texte`: textul, literele
  și operațiile fiecărei plăcuțe; `lume.ts` le pune în locul literelor șablonului); judecata lor în `judecataTexte.ts`, adusă
  doar pentru un document cu plăcuțe, și rulată de ușă **pe documentul brut** (`problemaTexte`, `usaCurenta.ts`), nu în
  validator: `v.record` sare cheile `__proto__` / `constructor` / `prototype`, care sunt date (ADR 0024 §9). Acțiunile cer
  același verdict prin `motivDupa` (refuzul plăcuțelor e `motiv.placute`). Literele din font în `src/text/placute.ts`,
  operațiile lor fără font în `src/io/placuteOperatii.ts`, șablonul și coacerea în `src/model/placute.ts`. Valorile din
  panou trec prin acțiunea textului (cererea `placuta`; nicio acțiune nouă la pornire); editarea textului șablonului le
  reface pe toate; rolul, scalarea, «Desprinde», gruparea și degruparea le țin. Oracolul v23 (agentul, din ADR-uri) e în
  `test/oracles/document.ts`. **Pornirea 106,0 (cu ușa 109,9 / 110 kB: rămâne sub 0,1 kB), totalul 563,0 / 600.** Rămâne
  pentru 11.4↑b: «Din CSV…», editarea textului unui șablon grupat, lista plăcuțelor micșorate de casetă.
  **«Din CSV…» (ADR 0210 §4, felia 11.4↑b)** gata pe 09.11, după unirea lui `main` (ancorele, 12.1↑c-2: `3cdb96a`):
  fereastra `DialogCsv.tsx` (din panou, adusă la cerere), cititorul `src/io/csv.ts` (codarea, separatorul găsit,
  ghilimelele), valorile `src/model/valoriCsv.ts` (potrivirea după `numeComparabil`, numerotarea, `cuCamp`), textul
  șablonului schimbat și pe un șablon grupat (`sablonCuContinut`), fonturile piesei o dată (`fonturiPiesei`); acțiunea
  textului are cererile `sablon` și `placute` (un pas, așezat cu `planAsezare`). **Pornirea neschimbată (cu ușa 109,9 /
  110), totalul 571,7 / 600.** Rămâne 11.4↑c: textul care iese din plăcuță fără casetă (roșu, avertismentul sau
  confirmarea la export) și editarea cu unealta Text a unui șablon grupat.
  **Textul care iese din plăcuță și unealta Text pe un șablon cu ramă (ADR 0210 §4, felia 11.4↑c)** gata pe 09.11, după
  unirea lui `main` (trasarea, 6.V↑d și reparația ei: `bb13a6e`, `dbf2cbf`): plăcuța e conturul închis cel mai mare al
  piesei, din afara textelor (`src/model/placuteIesire.ts`, adus de aplicație doar când documentul are plăcuțe, cu
  avertismentele printr-un cârlig, `inregistreazaPlacute`); roșu în listă, bara de jos, panoul; în «Din CSV…», avertismentul
  sau și confirmarea la export (`cncvs2.placute.iesire`, în browser; bifa exportului legată de lista văzută). Unealta Text
  alege textul grupat la clic (`src/app/texteGrupate.ts`), «Aplică» trece prin `sablonCuAsezat` și cererea `editat` cu
  `grup`. **Motivele planșelor stau în mesajele editorului** (calculul acțiunilor le cere la evaluare): un motiv nou al
  planșelor, dat doar de calcul, intră acolo, nu în dicționarul de bază. **Pornirea cu ușa 109,9 / 110 (rămân ~0,1 kB),
  totalul felia 607,2; cu 25.4↑ adusă din `main` la capăt, 611,0 / 700 (ADR 0144).**
  **„Toate foile” la export (ADR 0210 §5, felia 11.5↑)** gata pe 13.11, după două pauze cerute de owner și unirea lui
  `main` (tăierea 10.3↑f–j, imprimanta 3.6j–3.6r: `3aaf5dc`; codul venit trimite `indexFoaie` workerului CAM, iar desenul
  ferestrei Imprimanta e al foii active). De la două foi, fereastra exportului întreabă „Foaia activă / Toate foile (N)”;
  `calculeazaToateFoile` (`actiuniExportCalcul.ts`) cere fiecare foaie ca un document doar cu ea (`doarFoaia`), deci
  programul ei e cel exportat singur; foile identice (`src/post/foi.ts`: fișierele cu programele egale fără comentarii, o
  copie legată diferind doar în id-ul instanței) ies o dată, cu `-x<N>`; arhiva stocată, cu aceiași octeți
  (`src/io/scrieZip.ts`, CRC-32 comun în `src/io/crc32.ts`); nume scurte: `CNCVS2.ZIP`, `F<k>X<N>/`. Mașina, simularea și
  rezumatul rămân ale foii active. **Încă 11 motive date doar de calcul (ale lui `main`: gruparea, degruparea, textul,
  rolul, foaia, importul) au trecut în mesajele editorului**: pornirea cu ușa 110,1 → 109,6 / 110, totalul 686,2 / 700.
  **Raportul foilor și lista de tăiere (ADR 0210 §6, felia 11.6↑)** gata pe 13.11: fereastra `src/app/DialogRaportFoi.tsx`
  (din export, cu colțul și Z0 de acolo, și din paletă, `export.raport`), calculul pur `src/model/raportFoi.ts` (mărimea =
  cutia contururilor tăiate de un profil exterior prin toată grosimea, fără despărțire, în axele piesei; altfel a desenului,
  marcată; foile identice după o semnătură fără id-uri și fără numele frezei), CSV-ul `src/app/raportCsv.ts` (BOM, `;` cu
  virgula zecimală sau `,`; trei tabele). Tipărirea: fereastra e un portal sub `body`, iar `@media print` din `stil.css`
  scoate restul (cu `!important` la lățime: la tipar, `vw` e al paginii). `scrieSvg` primește grosimea liniilor (implicit
  0,1 mm). Ferestrele care importă modelul stau în `src/app` (regula `interfata-prin-actiuni`). **Pornirea cu ușa 109,7 /
  110 (rămân ~0,3 kB), totalul 690,5 / 700.**
  **Fișa plăcii 11 (ADR 0210, felia 11.7↑)** pregătită pe 17.11, fără mașină: `docs/etape/placa-11.md`, generatorul și
  fișierele de aur în `test/placi/placa-11/` (documentul pe drumul ferestrei «Din CSV…», exportul „Toate foile”). Cotele pe
  hârtie, pe exportul proaspăt, în `test/unit/placa11.test.ts`, cu proba urechilor (rasterul fundului foii la 0,1 mm, umplut
  din margine; controlul, fără urechi); octeții, în `placa11.aur.test.ts`. **Urechile nu țin sub 2 × freza:** la distanța
  implicită de 5, cu Ø3,175, ramele vecine scot tot lemnul dintre piese, iar urechile (la un sfert și la trei sferturi din
  drum) nu stau față în față, deci piesele din mijloc cad. Placa folosește 10, pe foi de 300 × 220.
  **Avertismentul urechilor (felia 11.3↑b, varianta a)** gata pe 17.11: cu urechi pe un profil exterior, distanța propusă e
  2 × freza + 3 mm, rotunjită în sus (`src/model/distantaPiese.ts`, folosit de așezare și de copii). «Așază pe foi» pornește
  de la ea, cu nota; sub ea, avertismentul (nu refuzul); «Din CSV…», «Încă…», «+1» și „Mută și așază” urcă singure la ea.
  Doar piesele care se așază sunt judecate.
  **Proba urechilor la export (felia 11.3↑c, varianta b)** gata pe 18.11: `src/sim/desprinse.ts` (nucleul simulării, doar pe
  mutările care ajung la fund; lemnul rămas, umplut din marginea foii) și `src/cam/partiUrechi.ts` (părțile: contururile
  tăiate prin foaie de un profil exterior cu urechi), legate în `src/jobs/calculCam.ts` (câmpul `desprinse` al exportului).
  Textul îl face firul principal, cu `t` (`avertismentDesprinse`; mesajele exportului cerute la nevoie): printre avertismente,
  pe fiecare foaie, nu un refuz.
  **Urechile la locuri alese (felia 11.3↑d, ADR 0211, varianta a; documentul v26)** gata pe 21.11: `urechi.mod` și
  `urechi.locuri` (punctele formei, pe elementele operației; ușa le judecă pe documentul brut, `problemaUrechi`); orice cod
  care schimbă nodurile unei operații trece prin `cuNoduri` (`src/model/urechiLocuri.ts`), iar un rol salvat nu ia locurile;
  lucrarea le proiectează pe drumul frezei, cu flancul din golul fiecărei urechi și bucla pornită în cel mai lung gol
  (`src/cam/urechi.ts`, `job.ts`); fereastra exportului are „Locurile”, iar „Alege pe desen…” ascunde fereastra (nu o
  închide) și pune pânza în modul urechilor (`src/app/ModUrechi.tsx`, la cerere; „Gata” prin `document.aplica-operatii`).
  **Urechile „unde ține” (felia 11.3↑e, ADR 0211, varianta b; documentul tot v26)** gata pe 23.11, pe
  `wip/11.1-plansele`, unită în `main` pe 23.11 (`d3ffcbf3`): cu o operație „unde ține”,
  programul foii se face în două treceri (`programFoii`, `src/jobs/calculCam.ts`; exportul, traseul și vederea 3D trec pe
  aici): întâi cu ea tăiată fără urechi, apoi fundul foii (`fundFoii`, `src/sim/desprinse.ts`), apoi programul cu urechile
  puse unde palierul, dus cât freza spre partea de care ține, cade pe lemn legat (pe dinafară) sau pe piesă (pe dinăuntru),
  câte cere numărul, cât mai departe una de alta (`src/cam/urechiLemn.ts`). `programDinDocument` fără fund refuză „lemn” (nu
  taie pe tăcute fără urechi); cu toate locurile egale bune și fără intrări, programul modului „egale”, octet cu octet. Lângă
  avertismentul pieselor desprinse, „Pune urechile unde țin” trece rândurile lor din fereastră. **Un calcul nou care cere
  programul foii îl ia din `programFoii`** (potrivirea dopului, ADR 0179, trece și ea pe acolo). Pornirea 107,9 kB (cu ușa
  112,3 / 115), totalul 763,1 / 800.
  **Urechile după reguli, pe laturi (felia 11.3↑f, ADR 0211, varianta c; documentul tot v26)** gata pe 23.11, pe
  `wip/11.1-plansele`, unită în `main` pe 23.11 (`f4601938`): „pe laturile lungi”, „pe laturile scurte” și „la mijlocul laturilor”
  (`src/cam/urechiLaturi.ts`, pur). Laturile sunt bucățile drepte ale drumului frezei pe care încape o ureche; numărul de
  pe buclă se împarte pe laturile regulii, iar centrele intră pe drumul locurilor alese (`centrePeLaturi`, în `job.ts`).
  Fără laturi drepte, programul modului „egale”, octet cu octet. Lucrarea nu mai are niciun mod refuzat ca „felie
  următoare”. Pe plăcuțele în rânduri și coloane, urechile de la mijlocul laturilor cad față în față cu ale vecinelor și
  le țin una de alta (placa 11 la 5 mm: nu se mai desprinde niciuna). Pornirea 107,9 kB (cu ușa 112,3 / 115), totalul
  763,9 / 800.
  **Degajările aceleiași bucle (ADR 0134, felia 3.U, rămasă din etapa 2)** gata pe 04.11: §5 din ADR 0032 are două condiții
  noi, după cele de până acum: d, pereții piesei (discul de pe drum nu trece de un perete care nu vine din V, iar la sub
  1 mm de el punctul discului cel mai apropiat nu e în K) și e, degajările aceleiași bucle (doi candidați la sub D + 1,
  dintre care unul taie în K spre celălalt, se omit amândoi). Proba e pe marginea discului, nu în mijlocul golului: așa,
  o aripioară subțire din desen nu mai oprește degajarea unui colț vecin (otrava P05 a arătat alarma falsă). Până acum,
  o limbă de material dintr-o gaură sau degetele unei îmbinări tăiate pe
  exterior se puteau desprinde la bază, fără avertisment. Logica e în `src/cam/degajari.ts` (`departeDePereti`,
  `materialIntre`), legată în `job.ts`; oracolul are d și e (K al elementului, perechea căutată numeric), cu cazurile în
  `CAZURI_DEG_0134` (separat de `CAZURI_DEG`, ale cărui amprente sunt fixate). Colțurile cu arce rămân felia următoare.
  **Pornirea 100,3 (cu ușa 103,9 / 110 kB), totalul 469,4 / 500.** După unirea lui 10.2↑ (04.11), cu 3.U: **pornirea 100,4
  (cu ușa 103,9 / 110 kB), totalul 475,0 / 500, /admin 105,3 / 200.**
  **Degajările pe colțurile cu arce (ADR 0135, felia 3.V, ultima rămasă din etapa 2)** gata pe 05.11: un colț cu o latură
  curbă (un „D” tăiat ca gaură, un umăr rotund, o lentilă, un import cu arce sau cubice) se degajează ca unul dintre linii.
  Q e încrucișarea curbelor decalate ale celor doi **pereți** din V (piciorul pe orice segment al peretelui, deci și pe o
  biarcă mai depărtată a unei cubice), E vine din tangentele din V, iar peretele (la T-bone și la condiția d din ADR 0134)
  merge pe contur până la prima rupere a tangentei. O joncțiune netedă nu e colț: ruptura cere restul minim și aici. Unde
  decalarea mănâncă colțul, plasa spune „freza nu ajunge în colț”. Logica e în `src/cam/degajari.ts` (`coltCuArc`,
  `segmentePerete`); oracolul are colțurile cu arce (Q prin Newton pe distanțele la pereți, sosirea pe arc doar de pe
  buclă), cu cazurile pe hârtie în `CAZURI_DEG_0135` și corpusul din sămânță `corpusDegajariArce`; pe hârtie, cât intră
  o degajare într-un perete-arc se măsoară radial (`CercHartie`). **Pornirea 100,4 (cu ușa 103,9 / 110 kB), totalul
  476,0 / 500, /admin 105,3 / 200.**
  **Conectarea prin WiFi, mai ușoară (ADR 0136, felia 3.6f)** gata pe 06.11, cu răspunsurile owner-ului: „Conectează (WiFi)”
  arată conexiunile ținute în browser, fiecare cu rețeaua ei (prin rețeaua atelierului, după nume, cu ultimul IP ca rezervă;
  direct, prin rețeaua proprie a podului; o adresă scrisă de mână), din care omul alege, fără conectare singură; „Caută
  mașina” (numele știute, deodată) și, la clic, „Caută în toată rețeaua” (/24, întâi portul 8282, apoi 81, câte 32 de gazde); pașii unui eșec;
  asistentul podului ESP3D (rețelele văzute de pod, parolele trimise doar lui, podul găsit la `esp3d.local`). Logica pură e
  `src/machine/conexiuni.ts`, probele `src/machine/sonde.ts`, ecranele `src/app/ConectareWifi.tsx`. **Unui controler i se
  trimite la probă doar `?`** (timpul real n-are `ok`): orice altceva ar strica numărătoarea altui sender legat la el.
  **Chrome întârzie fiecare WebSocket nou al paginii cu 1–5 s după multe încercări fără răspuns** (pe proces, 2–4 minute):
  timpul unei deschideri are loc și pentru întârziere (9 s la căutare, 10 s la legare). **O
  scriere în pod cere răspunsul „ok”**, nu doar starea: o valoare goală (sau `json`) e o citire. Proba cap-coadă are podul
  fals în `test/e2e/controlerWebSocket.ts` (`pod`), cu `esp3d.local` rezolvat de browser la 127.0.0.1 și podul pe 8282 (spec-ul
  merge pe rând). **Pornirea 100,4 (cu ușa 103,9 / 110 kB), totalul 483,8 / 500, /admin 105,3 / 200.**
  **Linia pluginului unită în `main` pe 06.11** (feliile 3.S, 3.Xa–3.Xe și 3.Ta–3.Tf, ADR 0126–0129 și 0160–0167, făcute în
  worktree-ul `trenulet`): gazda extensiilor, Planificatorul Trenuleț ca extensie, numit acum **Easy 3Draw**, primirea
  lucrărilor, senderul și formele prin `HostApi`. **Plafonul total 550 kB (ADR 0137, decizia owner-ului).** **Pornirea 101,4
  (cu ușa 104,9 / 110 kB), totalul 503,1 / 550, /admin 105,4 / 200.**
  **Mărimea în pt și inch, proporțiile literelor, crenarea (ADR 0138, felia 7.9↑, adusă din etapa 7)** gata pe 06.11, cu
  recomandările („Yes, 1a–5a”): lângă mărime, unitatea (mm și in măsoară majuscula; pt e mărimea fontului, iar panoul spune
  majusculele care rezultă; conversiile în `src/text/marime.ts`); **Lățimea literelor** și **Înălțimea literelor** (%),
  factorii hărții literelor din `aseazaText`, înaintea cursivului (spațierea și aldinul rămân în mm; rândurile urmează
  majuscula tăiată, coloanele textului vertical lățimea); **Crenarea fontului** pornită sau oprită. Blocul ține `unitate`,
  `proportii` și `crenare: false` (fără schemă nouă); fără ele, textul se așază bit cu bit ca înainte. Mânerele: o scalare
  neuniformă păstrează un text drept fără aldin (`blocScalat`, prin lățimea literelor); pe o curbă, vectori; aldin, refuzat
  (arce). **Un text scris în pt sau inch se arată rotunjit, cu valoarea exactă ținută lângă textul din câmp** (un „Aplică”
  fără nicio schimbare n-o rotunjește). **Corpusul proporțiilor e Python** (`CAZURI_PROPORTII` în
  `test/oracles-py/text_corpus.py`, `test/fixtures/text/proportii.json`): un caz nou = rândul acolo, apoi fixtura regenerată
  și comisă. **Pornirea 101,4 (cu ușa 104,9 / 110 kB), totalul 504,5 / 550, /admin 105,4 / 200.**
  **„Pornit” abia după pagina extensiei (ADR 0139, felia 3.Xf)** gata pe 06.11, reparația CI-ului complet căzut pe `main`:
  încărcătorul cadrului așteaptă `Spatiu.deschide` (poate întoarce o promisiune; intrarea planificatorului o întoarce,
  pachetul 18.7.1), iar starea ferestrei e a ferestrei de acum din prima randare (o altă extensie, aceeași redeschisă, o
  repornire: „se pornește”, nu „pornit” al celei de dinainte). **O extensie cu pagina pusă asincron își întoarce promisiunea
  din `deschide`; o probă care lucrează în cadru după „pornit” nu mai are nevoie de altă așteptare.** Amprenta nouă a
  încărcătorului în CSP. **Pornirea 101,4 (cu ușa 104,9 / 110 kB), totalul 504,6 / 550, /admin 105,4 / 200.**
  **Spațierea literelor alese (ADR 0138 §5, felia 7.9↑b)** gata pe 07.11, cu răspunsurile 4a și 5a: sub câmpul textului,
  rândul **Între literele alese** (câmpul în mm, − / +, Alt + ← / → în text, cu 0,1 mm; „Fără spațieri (N)”). Blocul ține
  `spatieri` (indicele pe puncte de cod, în textul fără `\r`, și mm-ul), adunate la spațierea textului doar între două litere
  vecine așezate ale aceluiași rând sau coloane; ajutoarele pure ale panoului (alegerea, valoarea comună, schimbarea, editarea
  textului) stau în `src/text/spatieri.ts`. **Corpusul lor e Python** (`CAZURI_SPATIERI` în
  `test/oracles-py/text_corpus.py`, în `proportii.json`, cu mutarea fiecărei litere pe hârtie în `DEPLASARI_SPATIERI`): un caz
  nou = rândul acolo, apoi fixtura regenerată și comisă. Rândul de prag al textului e făcut. **Pornirea 101,4 (cu ușa 104,9 /
  110 kB), totalul 506,0 / 550, /admin 105,4 / 200.**
  **Incrustația în V (ADR 0170, felia 12.1↑, adusă din etapa 12)** gata pe 07.11, în worktree-ul `incrustatii`, cu
  răspunsurile owner-ului (1a; la 2 și 3, ambele opțiuni, alese la export; 4a+b; 5a; 6a+b): rolul „incrustație în V” (panoul
  și fereastra exportului) face din V-carve-ul formei locașul, iar dopul se calculează din desen la fiecare export
  (`src/cam/incrustatie.ts`: oglinda pe X, semifabricatul cu marginea, fața coborâtă la S + H cu freza dreaptă, pereții cu V
  de la adâncimea de start S), într-un fișier al lui (`…-dop-N`). Jocurile (cu „Același spațiu”), fierăstrăul și marginea se
  aleg la export; panoul are secțiunea „Pe hârtie” (cât intră dopul, contactul, jocurile). **Documentul v20:** `incrustatie`
  (`fel`, `joc`, `fierastrau`, `margine`, `jurDop`) pe operația V-carve; migrarea v19 → v20 schimbă doar numărul; oracolul
  documentului și corpusul de aur la v20. **Valorile pe hârtie ale incrustației stau într-un singur loc,
  `src/model/incrustatie.ts`;** oracolul potrivirii e `test/oracles/incrustatie.ts`, fără importuri din `src/`. 12.1↑b
  și 12.1↑c: mai jos, unite pe 08.11.
  **Liniile incrustațiilor (12.1↑) și a tăierii vectorilor (10.3↑, 10.3↑b) unite în `main` pe 07.11** („Yes, merge both”):
  **pornirea 101,5 (cu ușa 105,1 / 110 kB), totalul 519,5 / 550, /admin 105,4 / 200.**
  **Imprimanta 3D prin WiFi (ADR 0190, felia 3.6g)** gata pe 07.11, cu răspunsurile owner-ului („1a–4a”), în worktree-ul
  `imprimanta` (`wip/3.6g-imprimanta`): fila **Imprimanta**, a treia a meniului global, leagă o imprimantă Creality din familia
  K1 (a owner-ului: o K1C) pe protocolul ei din fabrică: WebSocket-ul de pe 9999, **fără subprotocol** (Chrome refuză o legătură
  care cere un subprotocol neîntors de server), cadre text JSON, `ok` la fiecare bătaie a inimii (altfel imprimanta închide),
  starea pe bucăți. Imprimantele ținute (`cncvs2.imprimanta.retea`, `v: 1`), adresa scrisă, căutarea pe 9999; starea,
  temperaturile (doar citite), codul de la imprimantă; Pauză / Reia / Oprește (cu confirmare); fișierele din imprimantă, pornite
  cu bifa „Patul e gol”; jurnalul cadrelor. **O imprimantă nu e un flux GRBL:** fișierul stă în ea, deci modulele ei stau lângă
  sender (`src/machine/imprimanta/`), iar adresa locală, permisiunea și planificatorul căutării, comune, în
  `src/machine/reteaLocala.ts` (reexportate de `websocket.ts` și `conexiuni.ts`: altfel fereastra trage transportul senderului
  într-o bucată comună de 4 kB). **Singură, fereastra trimite doar citiri și `ok`**; după `opGcodeFile`, K1 închide legătura
  (așteptat: se reface după 0,3 s); o legătură căzută se reface singură, iar **o reîncercare nu judecă permisiunea rețelei
  locale** (browserul aplicației o spune refuzată și spre loopback). Proba cap-coadă are imprimanta falsă în
  `test/e2e/imprimantaFalsa.ts` (9999, pe rețeaua de loopback a probei); ghidul owner-ului: `docs/masina/imprimanta-k1c.md`.
  **Mărimea feliei: pornirea +0,2 kB, totalul +8,1 kB** (bucata ferestrei 7,5 kB, `reteaLocala` 1,0 kB).
  **Trimiterea unui `.gcode` la imprimantă (ADR 0190 §C.7, §D, felia 3.6h)** gata pe 07.11, pe aceeași ramură: **Trimite un
  fișier…**, sub lista fișierelor, verifică întâi fișierul pe calculator (`src/machine/imprimanta/gcode3d.ts`: antetul lui
  OrcaSlicer / Creality Print, PrusaSlicer sau Cura, temperaturile, miniatura, întinderea mișcărilor cu G90 / G91 / G92 / G28 și
  arce, față de patul modelului), cu **Trimite oricum** după un avertisment; apoi `POST /upload/<nume>` pe 80, multipart doar cu
  `file`, `no-cors` (`urcare.ts`), căutat după nume în lista de pe 9999. **Un fișier din imprimantă nu se înlocuiește:** un
  nume pe care lista îl are primește „-2”, „-3”… (verificarea după nume spune ceva doar pentru un nume nou). **CSP-ul are `http:`
  în `connect-src`** (răspunsul 3a); `wss:` trecea deja (după CSP3, `ws:` și `https:` îl acoperă), iar martorul refuzat al
  probei CSP e o cerere `data:`. Proba e2e mută cererea de pe 80 pe portul imprimantei false (`page.route`); aplicația rămâne
  pe 80. **Mărimea feliei: totalul +3,3 kB, ~1,3 kB peste ținta liniei, acceptată de owner pe 07.11 („Da, accept”). Cu
  `main` (`8003cb2`) unit în ramură: pornirea 101,7 (cu ușa 105,3 / 110 kB), totalul 530,8 / 550, /admin 105,4 / 200.**
  **Proba pe imprimanta owner-ului (felia 3.6i), pasul 1** pe 07.11: fereastra s-a legat de pe canal, din browserul lui, la o
  **K1C 2025** (firmware V1.0.0.26, în `DWIN sw ver`), la 192.168.1.10: **9999 primește pagina de pe altă origine**. Imprimanta
  n-are bătăi ale inimii (doar bucăți de stare, la ~3 s), iar **lista fișierelor vine ca text** (`retGcodeFileInfo.fileInfo`,
  `director:nume:mărime:…;`), nu ca `retGcodeFileInfo2`: acum se citesc amândouă, cu mărimea (pe care trimiterea o verifică).
  Transcrierea, anonimizată: `test/fixtures/imprimanta/k1c-2025.json`; imprimanta falsă are `fel: 'k1c-2025'`. **Pasul 2:**
  la o pornire de pe ecran, imprimanta și-a refăcut WiFi-ul cu alt IP, iar legătura veche a murit fără să se închidă: acum
  **paza de tăcere** (`TIMP_TACERE_MS`, 20 s) o pierde și o reface, iar **căutarea după nume** (`cautaInRetea` cu `nume`) o
  găsește la noua adresă; o imprimantă cu același nume la altă adresă ia locul intrării vechi din listă. Jurnalul are și
  evenimentele legăturii (`open`, `closed`, `failed`, `silence`, `search`, `found`). Imprimanta trimite tuturor celor legați: cvs2
  vede și ce pornește aplicația Creality. **Piesele plate (ADR 0191, felia 3.6j)** gata pe 07.11, fără imprimantă (ADR-ul
  acceptat cu „vreau sa le faci pe toate cele care pot functiona ca optiuni diferite si pot fi disponibile in soft”: toate
  variantele care pot sta împreună devin opțiuni, pe feliile 3.6j–3.6m): **Din desen…** feliază în cvs2 piesele foii (toate,
  selecția sau una), ridicate la o înălțime, pentru K1C, cu valorile profilelor OrcaSlicer (5 calități, 11 materiale K1),
  „Simplu” și „Avansat”, straturile văzute de sus, **Salvează .gcode** și **Trimite la imprimantă** (prin 3.6h). Fișierul are
  **doar comenzile pe care OrcaSlicer le scrie deja pentru K1C** (`START_PRINT` / `END_PRINT`: nivelarea și linia de curățare
  rămân ale imprimantei). **Codul stă în `src/cam/feliere/`, nu în `src/machine/`:** regula importurilor
  `masina-fara-post-si-document` ține transportul fără document. Adus la primul clic, fără importuri din nucleu spre el (gata
  de mutat într-un modul, direcția owner-ului din 07.11). **Totalul: 550,8 / 600** cu `main` adus în ramură (+15,9 kB cu
  recenzia; plafonul 600, ADR 0143). Modulele (5b) rămân pentru 3.6m (ADR 0191 §G).
  **3.6k gata pe 08.11** (modelele, cusătura, ștergerea, călcarea, fusta, cu implicitele profilelor K1C; codul nou în
  `src/cam/feliere/linii.ts` și `modele.ts`); totalul 558,4 / 600.
  **3.6l gata pe 08.11** (piesa „după CNC”, treptele în motor, înălțimea fiecărei piese în proiect: câmpul opțional
  `inaltimeImprimanta` al piesei, în tip și în schemă, scris prin `comandaInaltimi`; codul nou în `fel.ts`, `trepte.ts`,
  `dupaCnc.ts`); totalul 566,2 / 600, pornirea 102,0.
  **3.6n gata pe 08.11** (grosimea verticală, `ensure_vertical_shell_thickness`: plinul sub pereții treptelor, cu toate
  valorile OrcaSlicer; uneltele în `trepte.ts`); totalul 567,3 / 600.
  **3.6o gata pe 09.11** (ADR 0192, acceptat cu 1a–3a, la „vreau sa pot conecta orice fel de imprimanta”): un contract comun
  al driverelor (`driver.ts`: starea, comenzile ca pași, capabilitățile; `drivere.ts`, azi `creality-k1`), sesiunea și
  imprimantele ținute peste driver; comenzile din timpul imprimării (lumina, ventilatoarele prin `M106` scris doar de driver,
  viteza, debitul, țintele cu Preîncălzește și Răcește, homing-ul) și răcirea singură (singura comandă fără clic). Un driver
  nou (Moonraker, Marlin pe USB…) = un `DriverText` nou, nu o fereastră nouă. Totalul 573,1 / 600 kB (+5,8: bucata ferestrei, la cerere; ținta din ADR era +4).
  **3.6p gata pe 09.11** (ADR 0193, acceptat cu 1a–4a, grupul 2: „imprimarea văzută din cvs2”): pauza la un strat, aleasă în
  „Din desen…” (`punePauze` / `cuPauze` în `src/cam/feliere/gcode.ts`; `PAUSE` din profilul K1C, înaintea primei piese a
  stratului; nota doar ASCII), ținută în browser pentru aceleași piese (`src/app/pauzeDesen.ts`), spusă la trimitere și la
  pornire (`gcode3d.ts` găsește pauzele oricărui fișier). Totalul 574,9 / 600 kB.
  **3.6q gata pe 09.11** (placa și stratul viu): driverul K1 citește piesele, poziția și filamentul; `harta.ts` (straturile
  unui fișier, pe bucăți), `stratViu.ts` (stratul din filament: K1C amestecă două numărători), fișierele trimise ținute în
  IndexedDB (`src/app/fisiereImprimanta.ts`), placa (`src/app/PlacaImprimanta.tsx`). Totalul 579,7 / 600 kB.
  **3.6r gata pe 09.11** (anularea unei piese): `anuleazaPiesa` în driver (K1: `EXCLUDE_OBJECT NAME=` în `gcodeCmd`, doar
  un nume din lista imprimantei) și în sesiune (retrimisă la 3 s, confirmată din `excluded_objects`; 6 s, iar pentru
  piesa de acum 2 minute); Anulează… pe placă. Totalul 581,1 / 600 kB. Grupul 2 e gata și unit în `main` (09.11); proba
  pe K1C (ghidul, pașii 5–8) rămâne la owner.
  **Grupul 3 propus pe 11.11** (ADR 0194, feliile 3.6s–3.6u): notificările și semnul de pe butonul Imprimanta, istoricul
  imprimărilor cu costul și estimarea care învață, filmele timelapse; doar citiri. Schița cu formularul:
  <https://claude.ai/artifact/VdM6u5SLVa83jh4czpyTfQ>. Acceptat pe 11.11 („Da, recomandările”: 1a, 2a).
  **3.6s gata pe 13.11** (notificările și semnul din bară): `evenimente.ts` (pur), `VestiriImprimanta.tsx` (banda în
  meniul global, semnul în `#loc-semn-imprimanta`), `notificariImprimanta.ts` (setările `cvs2.imprimanta.notificari`),
  `titluFila.ts` (titlul filei din părți, folosit și de `IndicatorLucrare`); carcasa: locul semnului în fila Imprimanta,
  montarea cu bifa „leagă la deschidere”. Totalul 657,5 / 700, pornirea cu ușa 106,1 / 110.
  **Reparată pe 13.11** (CI-ul complet roșu: banda pauzei acoperea Reia pe Linux): banda stă în meniul global, pe rândul
  `#loc-anunt-imprimanta` din `App.tsx` (gol, ascuns), nu mai plutește deasupra paginii; orice aranjament nou ține locul.
  **3.6t gata pe 14.11** (istoricul, costul, estimarea care învață): `istoricImprimari.ts` (pur), `IstoricImprimanta.tsx`
  (cardul, înregistrarea), magazia `imprimari` în `cvs2-imprimanta` (versiunea 2), `DIN_DESEN` (ce pune „Din desen…” lângă
  fișier), driverul cu `historyList`. Totalul 713,0 / 800 (+4,8 față de `main`, peste ținta ADR-ului, sub plafon).
  **3.6u gata pe 18.11** (filmele timelapse): `elapseVideoList` în driver (`filme`, `adresaFilm`), `filmePe` (pur), coloana Filmul
  a cardului Istoricul (filă nouă, fără trimitător); istoricul și filmele, cerute din nou la deschiderea ferestrei (`vizibila`).
  Totalul 732,7 / 800 (+0,5). Grupul 3 încheiat; proba pe K1C: ghidul, pașii 9–11.
  **Grupul 4 acceptat pe 21.11** (ADR 0195, „Da, recomandările”: 1a, 2a; schița: <https://claude.ai/artifact/BwK8f4t9vrsQ98JeENHKdC>). **3.6v gata pe 22.11, unită în `main` pe 23.11 (`75dc1f9a`)**
  (codurile explicate): dicționarul familiei K1, 126 de chei, în `coduri/creality-k1.<limba>.json` (precache, plafonul 8 kB),
  căutat după `key`, apoi după `errcode`; cardul „De la imprimantă” (`EroareImprimanta.tsx`), banda și notificarea cu
  explicația; pana de curent (`repoPlrStatus`), eveniment nou; la recenzia proprie, trei reparații (linkurile cât textul,
  dicționarul cerut din nou după o cerere căzută, cheia 0). Totalul 745,6 / 800 (+1,5). Urmează 3.6w
  (camera WebRTC), la cuvântul owner-ului.
  **Starea lucrării e necunoscută până vine codul stării (felia 3.Au)** gata pe 25.11, unită în `main` pe 25.11
  (`307d4f9a`), scrisă de sesiunea principală după un complet căzut la proba utilizării imprimantei: starea vine pe
  bucăți, iar una doar cu progresul, sosită la legare înaintea stării întregi, făcea imprimanta „liberă” și lucrarea
  ei, găsită în curs, „pornită” de aici. Acum `stareLucrare` (`src/machine/imprimanta/creality.ts`) spune
  „necunoscută” cât nu are codul stării; pornirea unui fișier, homing-ul și răcirea singură cer oricum o stare
  știută. **Imprimanta falsă are `bucataIntaiMs`** (`test/e2e/imprimantaFalsa.ts`): întâi o bucată doar cu progresul,
  apoi starea întreagă, la fiecare legare. **O probă care depinde de ordinea în care sosesc cadrele imprimantei
  forțează ordinea rea, nu o așteaptă de la ceas.**
  **Biblioteca extensiilor (ADR 0230, felia 3.Xg)** gata pe 07.11, în worktree-ul `biblioteca`, cu recomandările („Da,
  1a–7a”), **unită în `main` pe 07.11** („Da, unește”): Easy 3Draw se instalează și se actualizează dintr-o listă servită
  lângă aplicație. **La fiecare build,
  `scripts/biblioteca.ts` construiește din repo pachetele din `extensii/biblioteca.json` și catalogul lor, în `dist/extensii/`**
  (`catalog.json` și `<id>-<versiune>-<amprentă>.zip`, în afara precache-ului și a plafonului). În meniul Extensii, secțiunea
  Biblioteca: Instalează (fereastra, apoi Deschide), Actualizează la … (dintr-un clic; fereastra doar când versiunea nouă cere
  ceva în plus), Instalată; catalogul se cere la deschiderea meniului, nu la pornire; linkul `#biblioteca=<id>`; un pachet din
  fișier sau de la o adresă vine „din afara bibliotecii”. Amprenta SHA-256 din catalog se verifică înaintea cititorului de
  pachete, iar un defect al publicării ajunge în jurnal. **O schimbare a unei extensii din bibliotecă cere o versiune nouă în
  `extensie.json`, apoi `node scripts/biblioteca.ts --scrie`** (proba `biblioteca.constructie.test.ts` cade până atunci).
  **Pornirea 101,5 (cu ușa 105,1 / 110 kB), totalul 523,0 / 550, /admin 105,4 / 200.**
  **Biblioteca extensiilor, refăcută (ADR 0231, felia 3.Xh)** gata pe 23.11, în sesiunea cloud a liniei, unită în `main`
  pe 23.11 (`2d1e482c`), cu răspunsurile owner-ului („Da, 1a–4a”): fereastra „Biblioteca extensiilor” (din meniul
  Extensii și din paletă: lista „Toate” / „Instalate” și pagina extensiei, cu capturile, „Ce poate face” și „Ce e nou”),
  semnul extensiei în pachet (`pictograma` în `extensie.json`, un SVG de cel mult 8 kB) și în catalog, o singură
  fereastră de confirmare, tastatura. **O schimbare a unei extensii din bibliotecă cere acum și rândul ei de „ce e nou”,
  primul din `noutati`, în `extensii/biblioteca.json`** (`{ "versiune", "ro", "en" }`, cel mult 240 de caractere), apoi
  `node scripts/biblioteca.ts --scrie` (refuză fără rând). **Două linii care schimbă aceeași extensie iau, fiecare,
  versiunea următoare:** cea unită a doua își ia alta la aducerea lui `main` (Easy 3Draw e 18.33.0, din 3.Tu, linia atelierului; următoarea,
  18.34.0). **O probă nu ține scrisă o versiune a unei extensii din bibliotecă:** catalogul poartă doar ultimele cinci
  rânduri de „ce e nou” (`MAX_NOUTATI`), deci proba își ia rândul din `extensii/biblioteca.json`.
  Capturile unei extensii se refac cu `node scripts/capturi-biblioteca.ts [dosar]` și se comit. **Un prefix nou de acțiuni
  cere grupul lui în `src/ui/Paleta.tsx`** (paleta nu arăta deloc acțiunile `extensii`). Pornirea 108,6 kB (cu ușa
  113,1 / 115), totalul 778,6 / 800.
  **Extensiile, stările de lângă drumul bun (ADR 0232, felia 3.Xi)** gata pe 24.11, în sesiunea cloud a liniei
  (aceeași ramură, PR-ul `AndreiBesliu/cvs2#17`), unită în `main` pe 24.11 (`f12308de`), după auditul cerut de owner și răspunsurile lui („am raspuns”: 1a–5a):
  o extensie care nu pornește are starea ei, cu trei ieșiri; o versiune nouă redeschide extensia deschisă; reîncărcarea
  o redeschide (`cncvs2.extensie-deschisa`); fără internet, biblioteca trece pe „Instalate”; captura mărită; un `.zip` de
  extensie lăsat pe planșă; „Deschide <nume>” în paletă; punctul de pe butonul Extensii (`cncvs2.extensii-noi`, fără
  nicio cerere la pornire). **O permisiune nouă a extensiilor își cere locul în `ORDINE_SENSIBILITATE`
  (`src/extensii/pachet.ts`).** **Paleta și gazda extensiilor vorbesc prin evenimentul `cncvs2-extensii`; nu se importă
  una pe alta** (ar lega bucățile și ar atinge pornirea). Un rând de „ce e nou” poate primi `"data": "an-lună-zi"`.
  Pachetele nu s-au schimbat de felie (Easy 3Draw era 18.22.0; din 3.Tt e 18.23.0; următoarea, 18.24.0). Cu `main` (`f536a4c`) adus: pornirea
  109,9 kB (plafonul 120; cu ușa 114,4, cu Atelierul 114,7), totalul 809,9 / 900; felia: pornirea +0, totalul +3,8 kB.
  **Căutarea și categoriile în biblioteca extensiilor (ADR 0233, felia 3.Xj)** gata pe 24.11, în sesiunea cloud a
  liniei (la „ok, porneste cautarea si categoriile” al owner-ului), unită în `main` pe 24.11 (`049c5dda`). **ADR 0233,
  acceptat de owner cu „da, 1a–5a”** (cele cinci întrebări: rafturile, unde stă Easy 3Draw, la vedere și cu o singură
  extensie, cel mult trei rafturi pe extensie, cât de îngăduitoare e căutarea): rămâne ce e implementat. Sub capul
  ferestrei bibliotecii, o bară cu câmpul „Caută o extensie” (oriunde în nume, la început de cuvânt în descrieri, autor
  și numele rafturilor; fără diacritice; toate cuvintele; regula, pură, în `src/extensii/cautare.ts`) și cu pastilele
  rafturilor prezente în listă, cu numărul lor; starea „nimic găsit”; „/” duce în câmp; pagina extensiei își spune
  rafturile. **Rafturile sunt ale aplicației (`CATEGORII_BIBLIOTECA`, `shared/biblioteca.ts`: Desen și forme, CNC și
  trasee, Imprimare 3D, Mașina, Jucării și modele): unul nou intră acolo, cu numele lui în ambele limbi
  (`extensii.categorie.<id>`). Pe ce rafturi stă o extensie o spune lista bibliotecii (`"categorii"` în
  `extensii/biblioteca.json`, 1–3, primul fiind cel principal), nu pachetul: o schimbare a lor nu cere o versiune nouă
  (Easy 3Draw rămâne 18.23.0), iar o probă cere fiecărei extensii din listă cel puțin un raft.** Catalogul le poartă ca
  dată de prezentare, citită cu îngăduință. Căutarea și raftul ales țin de fereastra deschisă: nu se țin minte și nu
  pleacă nicăieri. Felia: pornirea +0, totalul +1,3 kB (în `main`: pornirea 110,2 / 120 kB, totalul 831,8 / 900).
  **O probă care dă clic, în cadrul extensiei, pe ceva ce îi reface cadrul pe loc (`host.reporneste()`) folosește
  `clicCareRefaceCadrul` (`test/e2e/ajutor-extensii.ts`), cum cea care îl închide folosește `clicCareInchideCadrul`:**
  clicul nu se mai întoarce când cadrul dispare sub el. **O probă care judecă o regulă de timp a gazdei (rărirea
  repornirilor, un termen) ține ea ceasul paginii** (`page.clock`: `install` înaintea lui `goto`, `pauseAt`, `runFor` cu
  granița exactă; felia 3.Xk, doar probe).
  **Construcțiile din Easy 3Draw (ADR 0284, feliile 3.Ca–3.Cj)**, în sesiunea cloud a liniei bibliotecii (aceeași
  ramură), la cererea owner-ului din 24.11 („vreau sa adaugi mai multe tipuri de piese pentru fiecare categoire […]
  compatibile intre ele nu doar una cate una ci si ca constructii complexe”). ADR 0284, acceptat de owner cu 1a–4a:
  întâi piesele care leagă în 3D și mecanismele (conectorii, cremaliera, melcul), apoi punctele de prindere („Se prinde
  cu”), Modelul ca asamblare (orientarea pe trei axe, alipirea, verificarea ca avertisment), construcțiile cu nume și
  cele gata făcute; cărămizile de clădit și roata cu palete, pe parcurs. **3.Ca (conectorul perpendicular)** gata pe
  24.11, unită în `main` pe 25.11 (`11877a3e`): tipul `conector`, în fila Legături: un bloc de 1–5 pași, cu găuri de știft sau de ax pe trei axe
  (în sus, de-a latul și, la capete, în lung); Easy 3Draw 18.24.0. **3.Cb (conectorul în unghi, axul cu opritor,
  știftul cu bucșă)** gata pe 24.11, unită în `main` odată cu ea: tipul `conectorUnghi`, un butuc cu 1–4 brațe, fiecare cu manșonul lui de
  ax sau de știft, la cel puțin 90° unul de altul (formele gata au unghiurile conectorilor LEGO numerotați); axul are
  bifa „Cu opritor la un capăt”, iar știftul, capătul scurt „Bucșă”; Easy 3Draw 18.25.0. **3.Cc (cremaliera)** gata pe
  24.11, unită în `main` pe 25.11 (`9815527f`): tipul `cremaliera`, în fila Roți, cu dinții roților de aici, pe știfturi sau cu găuri de știft,
  înaltă după roata pereche (axul roții cade pe grilă), cu „Fă perechea”; Easy 3Draw 18.26.0; melcul a trecut în
  3.Cj. **3.Cd (arcul)** gata pe 25.11, unită în `main` odată cu ea: tipul `arc`, în fila Cărămizi, o cărămidă 1 × n cu boltă dedesubt și
  știfturi pe toată lungimea; Easy 3Draw 18.27.0; balamaua și placa turnantă au trecut în 3.Ck. **3.Ce (punctele de
  prindere și „Se prinde cu”)** gata pe 25.11, unită în `main` pe 25.11 (`38ff9391`): fiecare piesă își spune prinderile odată cu plasa
  (`construieste(def).prinderi`: felul, locul, direcția, lungimea; unsprezece feluri, de la știft și locaș la bilă și
  cupă), `Lego.montaj` duce o prindere peste perechea ei (baza alipirii din Model), iar configuratorul are, sub
  butoanele piesei, panoul „Se prinde cu”: ce are piesa și piesele atelierului care se potrivesc, cu axul și știftul
  deschise de lungimea bună; Easy 3Draw 18.28.0. **3.Cj-1 (cama)** gata pe 25.11, unită în `main` pe 25.11 (`e90edd2e`): tipul `cama`, în fila Roți,
  un disc pe ax care face din rotire un du-te-vino, în trei forme (excentric, pară, melc), cu diametrul de bază, cursa,
  grosimea și gaura la alegere; Easy 3Draw 18.29.0. **3.Cj-2 (roata cu palete)** gata pe 25.11, unită în `main` odată cu ea: tipul
  `roataPalete`, în fila Elice, o roată de apă sau de vânt pe butucul roților, cu diametrul, numărul paletelor, lățimea,
  palete drepte sau curbate, cu disc sau fără; butucul crește cu paletele, iar pe o roată mică încap mai puține (motorul
  o spune, editorul le ține în margine); Easy 3Draw 18.30.0. **3.Cj-3 (cadrul)** gata pe 25.11, unită în `main` pe 25.11 (`36559b49`): tipul `cadru`,
  în fila Cărămizi, o cărămidă 1 × n cu un gol prin ea (fereastră, ușă, portal), cu prag, stâlpi groși cât rama și
  știfturi sus; lungimea, înălțimea, rama și colțurile de sus ale golului (drepte sau teșite, care scurtează puntea
  tipărită în aer); Easy 3Draw 18.31.0. **3.Cj-4 (șurubul melc)** gata pe 25.11, unită în `main` odată cu ea: tipul `melc`, în fila Roți,
  un șurub pe ax care întoarce orice roată dreaptă de aici cu un dinte la fiecare tură, cu axele în cruce; diametrul de
  divizare 8 mm (ca LEGO) sau 16 mm (gros), lungimea 1–4 știfturi; spira, subțiată cât îi mănâncă înclinarea din joc
  (măsurat pe plase: jocul rămâne cel dintre două roți); „Fă perechea” pune și roata lui; Easy 3Draw 18.32.0.
  Cu ea, 3.Cj e încheiată. **O piesă nouă a motorului
  își spune prinderile
  (compilatorul o cere: `prinderi` e câmp obligatoriu al tipului `Corp`) și își pune mostra, cu numerele de pe hârtie, în
  `test/unit/trenulet.prinderi.test.ts`, unde fiecare prindere declarată e întrebată pe plasă.** **O piesă care se prinde cu alta își probează prinderea pe plasele amândurora, cu martori**
  (proba cremalierei: `patrundere`, în `test/unit/trenulet.cremaliera.test.ts`). **Motorul
  face o piesă din corpuri închise care se suprapun puțin: două dintre ele nu-și împart nicio muchie** (altfel STL-ul
  iese cu muchii fără pereche la cine îl citește); proba unitară o cere cu `muchiiFaraPereche`
  (`test/unit/ajutor-plasa-lego.ts`, ajutoarele comune ale probelor pe plase). **O piesă nouă a atelierului atinge și probele
  vechi care numără** (filele, galeriile, căutarea, starea unei liste vechi, versiunea): lista lor e în
  `docs/linii/atelier.md`. Doar pachetul extensiei se schimbă: pornirea și totalul aplicației, neatinse. **Din 24.11
  seara, linia ține și lucrul elicelor** (predat la cererea owner-ului). **3.Tu (piesele rotunde pe același ax în
  „Modelul”; ADR 0283, acceptat de owner pe 25.11 cu 1a, 2a, 3a)** gata pe 25.11, unită în `main` pe 25.11
  (`f5cf10c8`): în vederea „Modelul”, o
  piesă rotundă (roțile, elicele, rotorul și carcasa ventilatorului, cama, melcul, roata cu palete) stă cu axul în
  mijlocul unui știft și se rotește în jurul lui; o piesă nouă intră cu pivotul cât mai aproape de al celei alese (două
  rotunde, pe același ax); rotorul și carcasa în care încape stau la același Z; rândul unei piese rotunde spune știftul
  axului; Easy 3Draw 18.33.0 (următoarea, 18.34.0). **Așezarea în model e a motorului (`asezareModel`, `pivotModel`,
  `langaPivot`): o piesă rotundă nouă intră în `ROTUNDE` (`lego.ts`) și, cu amprenta și locul axului pe hârtie, în
  tabelul probei `test/unit/trenulet.model.test.ts`; una care nu e rotundă, în `DREPTE` (proba cere fiecărui tip o
  mostră).** **3.Cf-1 (alipirea la prinderi în „Modelul”; ADR 0284, partea D, cu răspunsurile owner-ului din 25.11:
  întâi alipirea, prinderea aleasă din puncte în vederea 3D, „Da, piesa alipită urmează baza”)** gata pe 25.11,
  unită în `main` pe 25.11 (`02ac0715`): piesa aleasă din model își arată prinderile (puncte în vedere, numere în editor); una aleasă e ținta, iar
  „Alipește în model” pune piesa următoare pe ea și o leagă de bază (o urmează când baza e mutată sau rotită, în
  lanț); piesa prinsă are „Altă prindere”, „Alt loc pe bază”, „Rotește ↻”, „Glisează” (pe o tijă) și „Desprinde”;
  desprinsă, e pe grilă dacă stă drept pe ea, altfel liberă; Easy 3Draw 18.34.0 (următoarea, 18.35.0). **Așezările
  pieselor din model le socotește motorul (`rezolvaModel`): felul unei piese (pe grilă, prinsă, liberă) se întreabă
  acolo, nu după câmpurile ei; locul de pe grilă rămâne în date ca loc de rezervă. Listele de otrăvuri ale pluginului
  pun `E2E_BUILD = False`.** **3.Cl-1 (decorațiunile de Crăciun: fulgul, steaua și brăduțul; ADR 0285, acceptat de
  owner pe 25.11 cu „Mergem cu recomandarile”)** gata pe 25.11, unită în `main` pe 26.11 (`41b1fb6f`): fila nouă
  „Crăciun” a atelierului, cu trei
  piese plate, tipărite culcate, fără suport: fulgul de zăpadă (șase gata făcuți și „Alt fulg”), steaua (plină,
  contur sau în relief) și brăduțul (de agățat sau în picioare, din două plăci cu fante); agățătoarea e inelul (pe
  un vârf ascuțit, pe o tijă) sau gaura de lângă vârf; Easy 3Draw 18.35.0 (următoarea, 18.36.0). **O piesă plată nouă
  se face din forme unite (`unesteForme`, în motor), nu din corpuri suprapuse, iar proba ei e modelul de pe hârtie,
  întrebat punct cu punct (`caPeHartie`, în `test/unit/trenulet.craciun.test.ts`). O filă nouă a atelierului atinge
  probele vechi care numără filele, pictogramele și căutarea (lista, în `docs/linii/atelier.md`).** **3.Cl-2
  (globul; ADR 0285)** gata pe 25.11, pe ramură: a patra piesă a filei „Crăciun”, un disc cu căpăcel și inel, cu
  dungi, zigzag sau stele, decupate ori în relief (pentru două culori: editorul spune la ce înălțime se schimbă
  filamentul), sau din două discuri îmbinate în cruce; Easy 3Draw 18.36.0 (următoarea, 18.37.0). **Arcele mari ale
  unei decorațiuni se fac din laturi fine (`aplatizeaza(…, laturiFine)`): cu cele 48 de laturi obișnuite, un disc
  mare iese colțuros. Uneltele „de pe hârtie” ale probelor decorațiunilor stau în `test/unit/ajutor-craciun.ts`.**
  Urmează 3.Cl-3 (ornamentul cu nume), 3.Cl-4 (brăduțul LEGO), apoi 3.Cf-2 (orientarea de mână pe trei axe,
  pozițiile la jumătate de pas).
  **Cotele pe desen: modelul și proba G-code-ului (ADR 0330, felia 10.4↑a-1, adusă din etapa 10)** gata pe 24.11, în
  sesiunea cloud a liniei (ramura `wip/10.4-cote`), unită în `main` pe 24.11 (`f25249cf`), fără interfață încă. ADR
  0330, acceptat de owner cu 1a–6a și cu nota lui: toate setările cotelor stau într-o fereastră nouă, „Setări”, nu în
  Proiectare. **O cotă stă pe foaie, lângă ghidaje (`foaie.cote`), fără schemă nouă: documentul rămâne v27.** Modelul
  pur e `src/model/cote.ts` (punctul ancorelor citit din lume: vârf, mijloc, centru, cadran, cutie; dezlegarea când
  forma lipsește sau are alte noduri; valoarea fiecărui fel); judecata ușii vine la cerere (`judecataCote.ts`, ca a
  plăcuțelor: pornirea o aduce doar pentru un document cu cote); comanda jurnalului e `inlocuieste-cote`. **Cotele nu
  ajung niciodată în program:** regula de import `cam-fara-cote` (cu capcana ei) și proba
  `test/unit/cote.neatinse.test.ts` (pe tot corpusul CAM și pe placa 11, cu nouă cote de fiecare fel pe fiecare foaie:
  exportul, traseul, verificarea vectorilor și raportul foilor ies identic ca fără cote). Felia: pornirea +0,1 kB,
  totalul +1,5 kB.
  **Unealta Cote pe pânză (ADR 0330 §3, §5, §6, felia 10.4↑a-2)** gata pe 24.11, unită în `main` pe 24.11
  (`f3283b33`): butonul Cote stă în extensia barei, după Convertește (printre unelte, bara de sus cu Transformarea
  ieșea din 1280 px cu fontul lat); cotele se pun cu lipirea pe punctele formelor, prin acțiunea `foaie.cote`;
  „Duplică foaia” copiază și cotele. Bucata cotelor vine la cerere (totalul +9,5 kB, pornirea +0,1).
  **Fereastra Setări, cu secțiunea Cotele (ADR 0330 §6, felia 10.4↑a-3)** gata pe 24.11, unită în `main` pe 24.11
  (`08e2e50d`): `src/app/Setari.tsx`, la cerere, deschisă din meniul contului (rândul „Setări…”, după „Aspectul…”), din
  paletă (`vedere.setari`), cu Ctrl+, și din ⚙ al uneltei Cote. **O secțiune nouă de setări se adaugă în
  `SECTIUNI_SETARI`.** Rândul nou din meniul contului e numărat și în `cont.spec.ts`, `tutorial.spec.ts` și
  `tichete.emulator.spec.ts`. Id-urile feliilor primesc după cratimă doar cifre (`RE_ID` din `scripts/documentatie.ts`):
  „a-3”, nu „a-3a”. Urmează 10.4↑a-4 (panoul cotei, lista, „Arată cotele”), la cuvântul owner-ului. Felia: pornirea
  +0,2 kB, totalul +6,9 kB.
  **Panoul cotei, lista și „Arată cotele” (ADR 0330 §5, felia 10.4↑a-4); raza, diametrul, unghiul și inch în fracții
  (§4, §6, felia 10.4↑b)** gata pe 24.11, unite în `main` pe 24.11 (`1eea83dd`), la „continuă cu 10.4↑a-4” și
  „10.4↑b” ale owner-ului, spuse în sesiunea liniei. **a-4:** unealta Cote publică cota aleasă și rândurile foii
  active într-un depozit mic, fără model (`src/ui/coteVedere.ts`); panoul cotei (`src/app/PanouCota.tsx`: felul,
  valoarea exactă cu Copiază, legătura cu Dezleagă, textul cu `<>`, distanța liniei, Șterge); lista „Cote (N)” sub
  piesele foii active (`src/ui/ListaCote.tsx`, la cerere), cu ochiul care le ascunde de pe pânză
  (`cncvs2.cote-ascunse`); „Arată cotele” (`vedere.cote`); cu „Toate foile pe pânză”, cotele foilor vecine se văd
  estompate (sau ascunse, din Setări). **b:** Rază, Diametru și Unghi în bara uneltei, și în Automată (cercul dă
  diametrul, arcul raza, două laturi unghiul); desenul pur e `src/model/desenCota.ts`; inch în fracții, unghiul în
  grade zecimale sau în grade-minute-secunde, prefixele razei și diametrului; în Setări › Cotele, grupul „Raza,
  diametrul, unghiul”. Raza pe o linie, elipsă sau curbă e refuzată, cu motivul. Documentul rămâne v28 (cotele stau
  pe foaie); nimic pe server. Feliile: pornirea +0,3 kB (111,2; cu ușa 116,1, cu Atelierul 116,5 / 120), totalul
  +7,4 kB (880,9 / 900).
  **Cotele în exportul vectorilor (ADR 0330 §6, §7, felia 10.4↑c-1)** gata pe 25.11, unită în `main` pe 25.11
  (`f2f6fc57`), la „vreau sa pornesti si celelalte sub-sesiuni” al owner-ului: în „Exportă vectori”, pe o foaie cu
  cote, bifa **„Cu cotele (N)”** (implicitul ei, numele stratului, culoarea și grosimea: Setări › Cotele ›
  Exportul). Cu ea, cotele intră în DXF, SVG, PDF și EPS, pe stratul lor. Entitățile cotelor sunt pure
  (`src/io/coteExport.ts`): liniile, arcul unghiului exact, săgeata plină ca triunghi umplut (SOLID în DXF), punctul
  ca disc, cifrele ca trăsăturile lui Relief SingleLine. **`src/io` nu importă textul** (regula
  `io-doar-model-geom`): cifrele le așază apelantul (`cifreDinFont`, `src/text/cifreCote.ts`) și le dă entităților.
  Fără cote sau fără bifă, fișierele ies octet cu octet ca înainte. SVG-ul rămâne cât foaia (o cotă din afara ei iese
  din pagină); PDF-ul, EPS-ul și DXF-ul se lărgesc. **Oracolul cotelor e Python**
  (`test/oracles-py/export2d_cote.py`, pas în jobul `oracol-export2d`; corpusul cotelor, tot din
  `scripts/export2d-corpus.ts`): valorile lui sunt scrise din descrierea corpusului și din regulile desenului (ADR
  0330 §4–§6), nu din codul aplicației, deci o cotă nouă în corpus își cere valorile pe hârtie acolo. Documentul
  rămâne v28; nimic pe server. Felia: pornirea +0,1 kB, totalul +3,3 kB (888,1 / 1 000).
  **Cotele ca DIMENSION în DXF și cifrele ca text (ADR 0330 §7, §10, felia 10.4↑c-2)** gata pe 25.11, unită în
  `main` pe 25.11 (`66b6b335`), la „ok, porneste 10.4↑c-2 si 16.A↑b-6” al owner-ului: în Setări › Cotele ›
  Exportul, **Cotele în DXF** (Cote (DIMENSION), implicit, sau Linii și cifre) și **Cifrele** (Trăsături, implicit,
  sau Text). În DXF, fiecare cotă e o entitate DIMENSION (felul, punctele de definiție, măsura, textul scris, stilul
  `CNCVS2`), cu desenul ei într-un bloc anonim `*Dn`; cifrele ca text sunt MTEXT în DXF, `<text>` în SVG și
  Helvetica în PDF și EPS, fără font în fișier. Textul cotei e cifra noastră, scrisă în cotă (alegerea owner-ului,
  cu recomandarea aplicată). Cu „Linii și cifre” și „Trăsături”, fișierele ies octet cu octet ca în c-1. Oracolul
  Python are corpusul al doilea (toate felurile) și unul ASCII. **10.4↑d (lanțul și linia de bază, „Cotează
  selecția”, „Fă desen din cotă”, cotele în raportul foilor), pornită pe 25.11**, la „ok, porneste 10.4↑d si
  18.1↑d” al owner-ului. Felia: pornirea +0, totalul +3,0 kB.
  **Relieful din imagine, pe planșă (ADR 0310, ADR 0311, felia 18.1↑a, adusă din etapa 18; documentul v28)** gata pe
  24.11, în sesiunea cloud a liniei (ramura `wip/18.1-relief`), unită în `main` pe 24.11 (`c5b79526`). ADR 0310,
  acceptat de owner cu „1a–6a”. Din „Importă…”, o imagine (PNG, JPEG, WebP, GIF, BMP) se face **relief** cu alegerea
  Vectori / Relief din capul ferestrei: sursa (luminanța sau un canal), sensul, înălțimea și baza, lățimea (o celulă =
  un pixel), netezirea. „Importă” pune piesa, cu un element de forma `relief`; pe planșă relieful se vede umbrit, sub
  vectori, iar panoul are secțiunea Relieful. **Nu se taie încă** (degroșarea și finisarea vin în 18.1↑c, cu freza
  bilă în document, în v29, stabilită cu linia frezelor). Nucleul e `src/relief/` (grila, dalele de 256 × 256 în
  Uint16 cu scară pe dală, harta, compunerea; doar + − × ÷ √ min max, deci amprenta Node = browser), calculat în
  workerul reliefului (`src/jobs/lucratorRelief.ts`, `calculRelief.ts`); dalele stau în browser (IndexedDB
  `cncvs2-relief`, după amprentă), iar documentul ține doar amprenta hărții fiecărui strat. Oracolul independent:
  `test/oracles/relief.ts`, cu cazurile pe hârtie în `relief.cazuri.ts`. **`src/relief` importă doar geometria și
  modelul** (regula `relief-doar-model-geom`). **Uneltele vectorilor refuză un element-relief cu motivul lor; cine
  citește conturul unui element ia `chenarElement` pentru relief** (cotele, lipirea). **În codul vederii 3D,
  „relieful” (`ReliefSimulat`, `reliefPentru`) e câmpul simulării, nu modelul de aici.** Felia: pornirea +0,5 kB (cu
  ușa +0,9), totalul +12,7 kB.
  **Modelul reliefului în vederea 3D (ADR 0310 §4, §7, felia 18.1↑b)** gata pe 25.11, unită în `main` pe 25.11
  (`ef883ac1`), la „vreau sa pornesti si celelalte sub-sesiuni” al owner-ului: pe o foaie cu reliefuri, vederea 3D are
  comutatorul **Modelul / Tăiat** și pornește pe model, fără simulare; fiecare relief stă în golul lui din placă, cu
  vârful la fața plăcii. Compusul se face dală cu dală în workerul reliefului (`src/relief/model.ts`, `dalaModel`,
  cererea `model`), redus cu k ca desenul de pe planșă (cel mult 4096 pe latură: un relief de 8192² se desenează la
  k = 4); cheile dalelor și încărcarea sunt în `src/app/modelRelief.ts`: o mutare, o rotire sau o oglindire nu
  încarcă nimic, iar un relief schimbat urcă doar dalele cu altă cheie. „Tăiat” simulează placa abia când e ales.
  **Nu se taie încă** (18.1↑c). Documentul rămâne v28; nimic pe server. Felia: pornirea +0, totalul +3,9 kB
  (884,8 / 1 000); nicio bucată nouă.
  **Finisarea reliefului (ADR 0310 §4–§6, §13, ADR 0312, felia 18.1↑c; documentul v29)** gata pe 25.11, unită în
  `main` pe 25.11 (`f7ca20b6`). **Documentul v29:** operația `tip: 'finisare'`, doar pe elemente `relief` (cu
  `pasLateral` și câmpul `finisare`: `unghi`, `nealiniat`, `margine`, `planZero`), și freza `{ tip: 'bila' }`;
  migrarea v28 → v29 schimbă doar numărul și refuză un v28 care le are deja. **Bila taie deocamdată doar finisarea
  reliefului** (`motivFormaPeOperatie`, `src/model/formaFrezei.ts`): profilul, buzunarul și celelalte o refuză, până
  la felia bilei a liniei frezelor (16.A↑e). CAM-ul e `src/cam/reliefFinisare.ts` (câmpul conservativ, liniile
  aliniate cu celulele sau la un unghi, trecerile pe Z cel mult cât pasul, ultima pe model; peretele rămâne, dacă
  marginea nu e „trece”), cu dalele din browser compuse în workerul CAM; valorile pe hârtie (creasta pe plan,
  ordinea pașilor), în `src/model/finisare.ts`. În Tăierea, rolul „finisarea reliefului”. În fereastra exportului,
  rândul finisării e doar de citit (`src/ui/FisaFinisare.tsx`), la locul lui în ordinea tăierii: automat, întâi,
  înaintea oricărei tăieturi a foii (`ordinePasi`); în „A mea” se mută, iar fără rang rămâne în față; Exportă îi
  scrie rangul. **Un fel nou de operație care nu trebuie dus prin foaie intră în `catFoaia`** (`src/cam/prinFoaie.ts`). **Oracolul 3D e
  independent** (`test/oracles/relief3d.ts`: freza coborâtă exact pe modelul exact, cu bila, plata și V-ul;
  simulatorul crestei și al materialului): o strategie nouă pe relief se judecă acolo, pe invariantele „nicio
  scobitură în model” și „niciodată mai adânc decât pasul pe trecere”. **Lista bibliotecii dată ferestrei exportului
  ține doar frezele rândurilor (fără bile)**, cu o pază a compilatorului (`exportFreze.bila.test.ts`). Nedovedit
  fără mașină: creasta reală, suprafața față de model, timpul. **18.1↑d (degroșarea, apoi fișa plăcii reliefului),
  pornită pe 25.11**, la „ok, porneste 10.4↑d si 18.1↑d” al owner-ului, cu v30 luat de ea (operația `degrosare`, ADR 0313, propus de linie); rândul editabil al
  finisării rămâne la cuvântul lui. Nimic pe server. Felia: pornirea +0,2 kB, totalul +10,8 kB (907,4 / 1 000).
  **Raportările (15.B↑b) și imprimanta (3.6g, 3.6h, 3.6i pașii 1–2; ADR 0191 acceptat, codul 3.6j încă pe ramură) unite în
  `main` pe 07.11**, peste biblioteca extensiilor (`b501571`, `6e61bee`, apoi `e9cf6ee` cu DEVLOG-ul bibliotecii): **pornirea
  101,7 (cu ușa 105,3 / 110 kB), totalul 535,0 / 550, /admin 106,5 / 200, contul 29,6 / 32.** **Pe test (și pe live), serverul
  se publică înaintea site-ului** (funcțiile, regulile Firestore și Storage, indecșii; `scripts/publica.ts` o face singur):
  un site nou peste un `tichete` vechi pierde tăcut proiectul atașat. Regulile Storage (ținta `stocare`) le înlocuiesc pe
  ale aplicației vechi pe bucket-ul de test.
  **Plafonul total 600 kB (ADR 0143, decizia owner-ului din 07.11):** liniile paralele aveau gata pe ramuri încă ~60 kB
  (trasarea, piesele plate, incrustațiile, planșele, tăierea), deci cu toate unite rămân ~5 kB; o creștere următoare cere
  iar decizia scrisă (sau modulele aduse la prima folosire, ADR 0191 5b). Pornirea rămâne 110 kB. **Pornirea 101,7 (cu ușa
  105,3 / 110 kB), totalul 535,0 / 600, /admin 106,5 / 200, contul 29,6 / 32.**
  **Plafonul total 700 kB (ADR 0144, decizia owner-ului din 09.11, „Yes, 700 kB”):** după unirea trasării și a lui 6.V↑d,
  totalul era 578,7 / 600, iar tăierea (+21,4), planșele (+25,2) și imprimanta (+38,5), gata pe ramuri, treceau fiecare
  singură de plafon (măsurat pe unirile de probă peste `3797e17`); cu toate trei, ~663,8, deci rămân ~36 kB. O creștere
  următoare cere iar decizia scrisă (sau modulele aduse la prima folosire). **Pornirea rămâne 110 kB:** planșele o ating (cu
  ușa ~110,1 cu `main`-ul de acum), deci linia își micșorează întâi calea ușii (sau altă decizie, ADR 0100).
  **Tăierea (10.3↑f–10.3↑j, la `1a81540`) și imprimanta (3.6j–3.6r, la `80a1f86`) unite în `main` pe 09.11, seara**,
  înaintea pauzei („putem aduce in main ce progres s-a facut, si sa luam pauza dupa”; `0fa7e6d`, `1eb4722`; conflicte doar
  în documente). **Tăierea a intrat cu reparația provizorie a barei** („Închide bucățile” în panoul opțiunilor Cuțitului):
  aranjamentul ales de owner („Ok la toate” pe schița din 09.11: Importă, Exportă vectorii și Exportă G-code în bara de sus a
  aplicației, după file, doar în Proiectare, sub 1200 px rămân în bara de desen; bifa înapoi în bara Cuțitului) e pe ramura
  liniei (`314d5fe`), încă cu `editare.spec.ts:463` căzută (căutarea, limba, tema și contul trec pe al doilea rând la 1280
  px). **Imprimanta a intrat înaintea probei plăcii pe K1C** (condiția owner-ului, ridicată de el: „Yes, merge it now”);
  proba rămâne în coada lui, pe adresa principală de test. **Planșele nu încă:** conflicte de cod cu ambele (`Editare.tsx`;
  `App.tsx`, `schemaDocument.ts`), iar cu imprimanta pornirea cu ușa ar fi ~110,2 / 110. **Pornirea 102,2 (cu ușa 105,9 /
  110 kB), totalul 654,4 / 700, /admin 106,5 / 200, contul 29,6 / 32.**
  **Trasarea din imagine, alb-negru (ADR 0220, felia 25.1↑, adusă din etapa 25)** gata pe 07.11, în worktree-ul `trasare`
  (ramura `wip/25.1-trasare`, canalul `trasare`; **unită în `main` pe 09.11**, mai jos), cu toate recomandările („Da,
  1a–8a”): o imagine (PNG, JPEG, WebP, GIF, BMP; TIFF refuzat cu motivul lui) aleasă în „Importă…” sau lăsată pe planșă deschide fereastra trasării (sursa,
  pragul cu histograma, Inversează, Netezimea, petele și golurile în mm, lățimea cu DPI-ul sau 96 px pe țol; previzualizarea;
  abaterea măsurată), iar desenul intră ca o piesă, cu laturile din sensul contururilor. **Nucleul, `src/trasare/trasare.ts`,
  e cod propriu, fără niciun import din aplicație** (regula `trasare-izolat`; potrace e GPL, `marchingsquares` AGPL), și
  rulează **în workerul lui** (`src/jobs/lucratorTrasare.ts`: workerele se construiesc IIFE, deci o bucată la cerere a
  workerului CAM nu se poate). **O citire a importului are semnalul ei** (`ContextImport.semnal`): o citire nouă, fișierul
  următor și demontarea dialogului (Renunță, Escape) opresc trasarea, cu workerul. **Proba nucleului e corpusul Python**
  (`test/oracles-py/trasare_corpus.py`, cu acoperirea exactă, valorile pe hârtie și martorul scikit-image, verificat și în CI)
  plus o probă pe o margine zgomotoasă (acele de un pixel: 0,56–0,63 px).
  **Trasarea pe culori (ADR 0221, felia 25.2↑)** gata pe 07.11, în același worktree (canalul `trasare`), cu toate
  recomandările („Da, 1a–5a”): sursa „Culorile”, numărul automat sau 2–16, pastilele cu legarea prin tragere, granițele
  comune (netezite o dată pentru amândouă culorile), o piesă pe culoare, aliniate, într-un pas. **Nucleul,
  `src/trasare/culori.ts`, tot fără importuri din aplicație;** reducerea e în OKLab cu luminozitatea pe jumătate, pe pixelii
  plini fără amestecurile de margine, cu multe clase unite după distanță (testul vechi de „pixel plin” pierdea liniile
  subțiri ale logoului). **Piesele aduse împreună trec prin `ImportPregatit.impreuna`;** legăturile, prin
  `src/trasare/legaturi.ts` (nucleul și pastilele).
  **Linia mediană (ADR 0222, felia 25.3↑)** gata pe 08.11, tot acolo (canalul `trasare`), cu toate recomandările
  („Da, 1a–5a”): „Rezultatul: Linii mediane” la sursele alb-negru. **Nucleul, `src/trasare/mediana.ts`, tot fără importuri
  din aplicație;** partea comună cu contururile (cerneala, pragul, curățarea, marginile) e `campul`, în `trasare.ts`.
  **Zhang–Suen are nevoie de îndreptarea lui Lü și Wang** (fără ea, o trăsătură la 45° dispare). **Căile deschise au
  `CaiTrasate.deschisa`;** buclele tăiate pe linie intră în operația căilor deschise (`piesaDinImport`).
  **Corectată pe 08.11 după logoul owner-ului, privit mărit (probele, cu îmbinări rotunde, trecuseră): o dreaptă (brațul unei
  joncțiuni, latura unui colț) se trage doar pe porțiunea dreaptă (0,5 px); curățarea de lângă o joncțiune merge doar cât
  intră normala în celelalte brațe, (w/2)/tan(θ/2).**
  **Opțiunile liniei mediane (ADR 0223, felia 25.3↑b)** gata pe 08.11, tot acolo, cu toate recomandările („Da, 1a–3a”): sub
  „Rezultatul: Linii mediane”, capetele, părțile late (linii mediane sau contururi, cu pragul), „Arată părțile late” și
  buclele. **Părțile late sunt deschiderea morfologică a cernelii (`src/trasare/partiLate.ts`): miezul, apoi ce e la cel mult
  R0 + 0,5 px de el; bucățile rămase care ating partea lată și stau toate la cel mult 2·R0 + 1 de miez îi aparțin** (altfel,
  zeci de cioturi în jurul unui bloc). **`CaiTrasate.peLinie` (lipsă: toate pe linie) dă latura căilor mediane închise.**
  **Cu `main` unit pe 08.11 (`8dde2d2`, cu incrustațiile) și 25.3↑b: pornirea 101,9 / 110 kB, totalul 574,8 / 600.**
  **Linia trasării (25.1↑–25.3↑b) unită în `main` pe 09.11** („Yes, merge trasarea”; `e277836`; conflicte doar în
  documente). **Pornirea 101,9 (cu ușa 105,5 / 110 kB), totalul 577,2 / 600, /admin 106,5 / 200, contul 29,6 / 32.**
  **Scanările și pozele (ADR 0224, felia 25.4↑) gata pe 09.11, unite în `main` tot pe 09.11** („putem uni si trasarea din
  imagine.”; `0ebbd99`; pornirea 101,9, cu ușa 105,6 / 110 kB; totalul 582,5 / 700), **cu toate recomandările („Da,
  1a–2a”): Lumina
  („Uniformă” implicit, „Neuniformă”: polinomul hârtiei, „Cu umbre”: închiderea morfologică), Zona (un decupaj în calcul,
  `CerereTrasare.zona`; răspunsul are imaginea întreagă și zona), „Ignoră ce atinge marginea”. Nucleul luminii stă în
  `src/trasare/lumina.ts`; la luminile de poză, polaritatea vine din mediana din jur, nu din margine (marginea întoarce
  foaia pozată pe masă), iar prima regulă (închiderea și deschiderea) mergea doar pe desene dese.** Probele luminii
  numără doar greșelile clare (acoperirea sub 0,4 sau peste 0,6): pe trăsături subțiri, pragul automat cade la ~0,47.
  **25.5↑ (foaia pozată oblic, ADR 0225) gata pe 13.11, cu toate recomandările („Da la 1-3a”), pe ramura
  `wip/25.1-trasare`, unită în `main` pe 13.11 (`07df71f`, „Yes, merge it”):** „Îndreaptă foaia” (oprită implicit, sugerată de raport), colțurile
  găsite singure (`src/trasare/foaia.ts`; geometria lor, fără importuri, în `src/trasare/colturi.ts`, ca fereastra s-o
  folosească fără nucleu), formatul (A4 implicit) cu mărimea adevărată, `CerereTrasare.foaie` (îndreptarea înaintea zonei;
  zona e în pixelii foii îndreptate), butonul Colțurile cu mânerele. Proporțiile din poză au un interval: pe poza înclinată
  doar înainte, focala nu se poate afla, deci sunt „nesigure”. **25.4↑b (lumina pe culori, ADR 0226) gata pe 13.11, cu
  toate recomandările („Da la 1-2a”), pe aceeași ramură, neunită, pe canalul `trasare`:** Lumina și pe Culorile (imaginile
  opace), înaintea numărului culorilor; `culoriLuminate` (`src/trasare/culori.ts`: fiecare canal raportat la fundalul lui
  din `lumina.ts`; stă în culori fiindcă pragul Otsu pe canal e în `trasare.ts`, pe care `lumina.ts` nu-l poate importa);
  pe hârtie, balansul de alb (culorile adevărate), pe tablă, nivelul ei mediu. **25.3↑c (liniile mediane pe culori, ADR
  0227) gata pe 16.11, cu toate recomandările („Da la 1-2a”), pe aceeași ramură, pe canalul `trasare`:**
  `src/trasare/medianeCulori.ts` (după etichetele culorilor, fără plasă: masca fiecărei culori bifate ca alfa, decupată la
  cutia ei; întâi liniile tuturor culorilor, din lățimile lor grosimea desenului întreg și pragul automat al părților late;
  apoi „Leagă peste alte culori”, pe liniile în pixeli, prin cârligul `cu.leaga` al lui `traseazaMediana`, înaintea
  curbelor), unită în `main` pe 16.11 (`380c053`). **25.3↑d (punctele pierdute, corectura ADR 0222) gata pe 16.11:** după
  linii, un pas pe bucățile de cerneală (`bucati` în `mediana.ts`): una mai scurtă decât grosimea ei e un punct, cu căile
  scoase; una mai lungă fără cale primește dreapta axei; cu capetele în vârf, dreapta de la un vârf la celălalt;
  unită în `main` pe 17.11 (`dd21a8a`). **25.3↑e (rezultatul pe fiecare culoare, ADR 0228) gata pe 17.11, cu toate
  recomandările („Da, 1a–2a”), pe aceeași ramură, pe canalul `trasare`:** `traseazaCulori` cu `peLinii` (contururile
  doar ale culorilor rămase pe contururi; fără ele, doar etichetele), chemat o singură dată de `traseazaCuloriMediane`
  (liniile doar ale culorilor alese; legarea și peste contururi); în pastilă, sub „Se trasează”, lista „Rezultatul
  culorii” (`AlegeriCulori.rezultate`, ștearsă la un număr nou); unită în `main` pe 17.11 (`a3e81f6d`). **25.6↑
  (imaginile TIFF, ADR 0229) gata pe 18.11, la „mergi înainte și testez la final”, pe aceeași ramură, pe canalul
  `trasare`:** cititorul propriu `src/trasare/tiff.ts` (cu `ccitt.ts`), în workerul trasării (`decodeazaTiff`, pagina
  aleasă, DPI-ul paginii, reducerea pe blocuri, `poza` pentru previzualizare); ușa nu-l mai refuză la semnătură;
  refuzurile `tiff` (cu numele) și `tiff-stricat`; fixturile WIC / GDI+ în `test/fixtures/trasare/tiff`
  (`genereaza.ps1`). **25.7↑ (PDF-urile scanate, ADR 0270; 0270–0279 sunt ale trasării) gata pe 18.11, tot la „mergi
  înainte”, pe aceeași ramură, pe canalul `trasare`:** ușa PDF ține minte imaginile vizibile (`citestePdf` → `imagini`),
  iar `imagineaPaginiiPdf` o scoate pe cea mai mare ca fișier (JPEG-ul fără Exif, sau un TIFF scris de
  `src/io/tiffScrie.ts`: CCITT-ul împachetat, eșantioanele brute), cu orientarea (1–8) și DPI-ul așezării; calculul aplică
  `orientare` și dă `poza`; ușa importului trasează singură o pagină fără vectori, iar una cu vectori la cerere
  (`AlegeriImport.imaginePdf`; „Trasează imaginea paginii” / „Vectorii paginii”); refuzurile `pdf-imagine` (cu numele) și
  `pdf-imagine-stricata`; canalul, amprenta `283c53ff12af`.
  **25.4↑c (îndreptarea scanărilor, ADR 0271) gata pe 21.11, pe aceeași ramură, pe canalul `trasare`:**
  `src/trasare/rotire.ts` (pur, în workerul trasării): `gasesteUnghiul` (scorul lui Postl pe rânduri și coloane, punctele
  mutate cu o fracțiune de pixel, ±10°, încrederea din vârf) și `rotesteImaginea` (pânza mărită, fondul din margine,
  marginea prelungită, reducerea cu k); calculul, după foaie și înaintea zonei (`CerereTrasare.rotire`, `RotireTrasata`,
  scara împărțită la k); ușa (`AlegeriTrasare.rotire`, `UNGHI_SCRIS_MAXIM`); fereastra (grupul „Îndreptarea”, „Îndreaptă
  scanarea”, „Unghiul (°)”, sugestia, avertismentul); fixturile GDI+ în `test/fixtures/trasare/rotire`
  (`genereaza.ps1`); canalul, amprenta `645208c691d8`.
  **Totalul ramurii, cu `main` adus (`9d1eac56`): 741,6 / 800 kB** (`main` `a64adf63`: 739,4), pornirea 107,2 / 115
  (cu ușa 111,2). **ADR 0272 (imaginile pe foaie, straturile bitmap; feliile 25.8↑a–b) propus pe 21.11,** cu schița
  (<https://claude.ai/artifact/Ctc63ZdA6ipkLPA8uGCJyb>, formularul în `raspunsuri/owner`), acceptat în aceeași zi („Da,
  1a–3a”). **25.8↑a (imaginile pe foaie) gata pe 23.11, în sesiunea cloud a liniei, unită în `main` pe 23.11
  (`473f2e20`):** o imagine rămâne pe foaie, sub desen, estompată, nici tăiată, nici exportată („Păstrează imaginea pe
  foaie” și „Doar imaginea” în fereastra trasării; „Imaginile foii” în panoul Proprietăți, cu nimic selectat); octeții
  stau în browser (IndexedDB `cncvs2-imagini`, după amprentă), iar foaia ține doar așezarea (`Foaie.imagini`, fără schemă
  nouă: documentul rămâne v26). **25.8↑b („Calibrează” și „Trasează…” din imaginea de pe foaie) gata pe 24.11, pe aceeași
  ramură, la „pornește 25.8↑b”, unită în `main` pe 24.11 (`f7f4510f`):** butoanele din rândul imaginii pornesc un mod al pânzei (`src/app/ModImagine.tsx`, la
  cerere; partea pură în `modImagineCalcul.ts`), cu banda lui: calibrarea din două puncte și distanța adevărată (scalarea în
  jurul primului punct), ori zona de trasat (sau toată imaginea); fereastra trasării deschisă de acolo are scara imaginii
  (`latimeIntreaga`), fără Mărime și fără îndreptări, iar „Importă” pune vectorii exact peste ea (`ImportPregatit.peImagine`);
  raportul foilor spune numele imaginilor. **Cât ține un mod al pânzei, editorul e oprit (`Editare.activ`): cadrul
  selecției, textul, Pen-ul și mânerele ascultă pe `window` la captură, deci un mod nou al pânzei trece și el prin `activ`,
  altfel ele îi iau clicurile.** Pornirea 109,8 kB (cu ușa 114,3 / 115; cu Atelierul 114,6), totalul 804,7 / 900.
  **25.9↑ (fereastra trasării, refăcută, ADR 0273) gata pe 23.11, unită în `main` pe 23.11 (`4fe2d2ad`), cu răspunsurile
  1a–3a și, la nota owner-ului, celelalte variante ca opțiuni:** fereastra cât ecranul, fără derularea ei (setările se derulează singure,
  previzualizarea crește, piciorul fix); grupurile Imaginea, Trasarea, Curățarea, Mărimea, cu rezumatul pe titlu, ținute în
  browser (`cncvs2.trasare.fereastra`; „Simplu” ascunde Imaginea și Curățarea); mărimea desenului (lățimea sau înălțimea
  cutiei vectorilor, legate), dusă de fereastră în lățimea imaginii după fiecare trasare (sau doar scara; sau lățimea
  imaginii, ca înainte), deci ușa și cererea neschimbate; raportul scurt, sugestiile ca butoane, „Detalii”; „Desenul” cu
  virgula în română, la toate formatele. Partea pură în `src/ui/fereastraTrasareCalcul.ts`. **O probă e2e care lucrează cu
  un câmp din Imaginea sau Curățarea deschide întâi grupurile** (`grupuriDeschise` din `test/e2e/ajutor-trasare.ts`), iar
  rândurile raportului de sub „Detalii” se așteaptă atașate, nu vizibile. Următorul ADR al liniei e 0274.
  **Sub plafonul de 600 kB mai încap ~23 kB**, măsurat pe unirile de probă din 09.11: tăierea +19,4, planșele +18,9 (cu
  ușa +4,4 kB: 109,9 / 110), imprimanta +32,6, 6.V↑d +1,5; trasarea și imprimanta împreună au dat 609,8 / 600, iar poarta
  mărimii a căzut. A doua unire mare cere întâi decizia owner-ului pe plafon (sau modulele aduse la prima folosire, ADR 0191
  5b): luată tot pe 09.11, 700 kB (ADR 0144, mai sus).
  **Incrustația cu pereți drepți (ADR 0171, felia 12.1↑b) și banda dopului în V (ADR 0172, felia 12.1↑c), unite în `main` pe
  08.11** („Da, așa”; `9692385`, fără conflicte): **documentul v22.** v21 aduce `incrustatie` cu `fel: 'drept'` pe buzunar
  (`jocLateral`, `dop` ridicat sau decupat, `sprijin`, `frezeDop`), v22 aduce `banda` pe incrustația în V cu `jurDop: 'banda'`
  (lățimea, decuparea prin placă, grosimea plăcii, freza decupării, punțile); migrările v20 → v21 și v21 → v22 schimbă doar
  numărul și refuză un document care are deja, ca necunoscute, câmpurile noi. Valorile pe hârtie (`valoriIncrustatieDreapta`,
  `valoriBanda`) stau tot în `src/model/incrustatie.ts`; lucrarea, în `src/cam/incrustatieDreapta.ts`, `dopDrept.ts` și
  `dopV.ts`. Oracolul potrivirii, cu banda și decuparea, rămâne `test/oracles/incrustatie.ts`; al pereților drepți e
  `test/oracles/incrustatieDreapta.ts` (cazurile pe hârtie în `incrustatieDreapta.cazuri.ts`). **O freză în plus a dopului
  drept sau a decupării, bifată, pornește de la primul T liber.** **Punțile pe buclele mici:** pe fiecare buclă, câte încap din
  cele cerute (`urechiCareIncap` din `src/cam/urechi.ts`, aceeași regulă ca a lucrării; `puntiPeBucle` din
  `src/cam/incrustatie.ts`), cu avertisment; refuzul doar dacă nu încape niciuna. **Pornirea 101,8 (cu ușa 105,5 / 110 kB),
  totalul 544,0 / 600.** **Felia 12.1↑c-2, unită tot pe 08.11** („Da, unește”; `079d225`): lemnul din jurul dopului în V se
  alege și din panou (Tăierea, `inc-jur`), cu valorile benzii pe hârtie înaintea exportului; arborele spune „cu banda
  îngustă”; în fereastra exportului, două incrustații în V ale aceleiași piese, cu valori diferite, nu mai stau pe un rând
  (`incrustatieVRand`); banda merge de ~2,6 ori mai repede, ca orice V-carve cu fund plat, cu aceiași octeți
  (`indexContururi` în `src/cam/axaMediala.ts`, `traversariArc` și `distantaLaArcCerc` în `src/geom/distanta.ts`; proba
  `test/unit/axaMediala.index.test.ts`). Pe linie rămâne punctul 4, punțile dopului drept alese în fereastră: un câmp nou,
  deci v24, după v23 a planșelor. **Pornirea 101,8 (cu ușa 105,5 / 110 kB), totalul 544,3 / 600, /admin 106,5 / 200, contul
  29,6 / 32.**
  **Felia 12.1↑d (fundul doar cu freza V, ADR 0173), unită pe 13.11** („Da, unește”; `0f4c22c`): fără freză dreaptă în
  coloana Fund plat, pe o incrustație, fundul îl scoate V-ul, prin inelele regiunii decalate (`fundV` în
  `src/cam/vcarve.ts`; creasta cel mult g/2 în locaș, H/2 pe fața dopului și pe fundul benzii; peste 400 de inele, refuzul),
  cu crestele în `valoriIncrustatie`; banda merge și fără freza fundului, iar decuparea fără freza ei se refuză. Documentul
  rămâne v22. Pe linie rămân punctul 4 și 12.1↑f (gaura și treptele), după v23 a planșelor; 12.1↑e (dopul în 3D și
  potrivirea simulată) doar la cuvântul owner-ului. **Totalul cu felia 658,0 / 700 kB, pornirea cu ușa 106,1 / 110.**
  **Ancora și tastele transformării (ADR 0240, feliile 6.V↑, 6.V↑b, 6.V↑c, aduse din etapa 6)** gata pe 08.11, în
  worktree-ul `ancore` (ramura `wip/6.V-ancore`), **unite în `main` tot pe 08.11** („Da, unește”; `0c81ccf`), cu
  recomandările („Ok la toate”, 1a–4a): la mânere, **Shift =
  proporțional pe orice mâner, Ctrl = liber pe orice mâner, Alt = față de ancoră**, combinate (Shift câștigă peste Ctrl),
  citite și la apăsarea tastei cu mausul pe loc; la desen, Shift pătrat / cerc / 15°, Ctrl face cercul elipsă, Alt din centru.
  **Alt nu mai inversează lipirea la mânere și la desen** (acolo, butonul Lipire și Shift+L); o inversează încă la mutare,
  ghidaje, ancoră, Noduri și Pen. Ancora: selectorul 3 × 3 (`cncvs2.ancora`, ținut în browser, nu în proiect: documentul nu se
  schimbă) sau ținta trasă pe pânză; rotirea, Alt, oglindirea și înclinarea în jurul ei. **Scalarea pe o axă nu mai refuză
  arcele:** cercul devine elipsa generatorului, arcele căilor devin curbe sub 0,001 mm, colțurile rotunjite urmează lista din
  bara Transformării (`cncvs2.colturi`), textul aldin devine vectori.
  Pe ramură, pornirea neschimbată și totalul +2,1 kB. Pe canalul `ancore` al instanței de test:
  <https://cncvectorstudio-test--ancore-vy17zado.web.app> (până pe 08.12). **După unire, cu incrustațiile: pornirea 101,8 (cu
  ușa 105,4 / 110 kB), totalul 546,4 / 600, /admin 106,5 / 200, contul 29,6 / 32.**
  **6.V↑d, opțiunile („Da, 6.V↑d acum”)**, gata pe 08.11 pe aceeași ramură, **unită în `main` pe 09.11** („Da, unește”;
  `e481e55`): „Ce ține fix Alt” (`cncvs2.alt-fix`:
  ancora sau centrul cutiei, și la rotire), „De unde pornește cercul” (`cncvs2.cerc-mod`: din centru sau din colț, ca elipsa
  cu Shift), poligonul întins cu Ctrl, **rândul tastelor în bara de jos** (locul `loc-taste` din `App.tsx`, umplut de
  editor), **X / Y ale ancorei în panoul de proprietăți** (starea `ancoraPanou`, împărțită de editor și panou), iar **o formă
  rotită oblic, scalată pe o axă, trece prin geometrie** (ca înclinarea), fără refuz. Pe ramură, totalul +1,5 kB; testul din
  aplicație are acum 35 de pași („Opțiunile desenului” e pasul 6, „Opțiunile transformării” 14). **După unire, cu trasarea:
  pornirea 101,9 (cu ușa 105,6 / 110 kB), totalul 578,8 / 600, /admin 106,5 / 200, contul 29,6 / 32; sub plafon mai încap
  ~21 kB.** **Bara de sus trebuie să încapă la 1280 px și cu un font lat** (Verdana aici, DejaVu Sans pe Linux, unde
  `system-ui` e lat): proba ei e în `ancore.spec.ts` (Transformarea și cercul, în română și în engleză). Pe 09.11, CI-ul
  complet a căzut pe `main` exact aici (capătul barei la 1300 px pe Linux, 1245 pe Windows), reparat cu textele mai scurte
  ale listei colțurilor (`4246279`). O opțiune nouă în bara de sus se probează cu fontul lat, nu doar pe Windows.
  **Primirea lucrărilor de la alte aplicații (ADR 0126, felia 3.S, prima a liniei Trenuleț)** gata pe 02.11, în worktree-ul
  `wip/trenulet`: butonul „Trimite la cvs2” al Planificatorului Trenuleț deschide aplicația la `#primeste-lucrare` și vorbește
  protocolul „cvs2-lucrare” v1. **În pornire stă doar verificarea ancorei și a lui `window.opener`, în afara live;** ascultarea
  și dialogul (`src/app/primireLucrare.ts`, `src/app/DialogLucrare.tsx`) vin la cerere. Doar fereastra care a deschis fila,
  confirmarea omului într-un dialog modal, fiecare fișier verificat ca unul adus cu „Fișier…” (`M6` refuzat, amprenta
  trimisă); lista „Lucrarea primită” din panoul mașinii e separată de `ultimulExport` și stă doar în memorie. **Hosting-ul
  rămâne fără COOP** (ar tăia `window.opener`). Pe live, primirea pornește după o placă trimisă așa pe test.
  **Pornirea 98,7 (cu ușa 102,2 / 110 kB), totalul 451,9 / 500.**
  **Gazda extensiilor (ADR 0127, felia 3.Xa, linia Trenuleț)** gata pe 02.11, în worktree-ul `wip/trenulet`: extensiile se
  instalează (din `.zip`, de la o adresă HTTPS, prin linkul `#instaleaza=`), nu fac parte din aplicație. **Codul unei
  extensii rulează doar în cadrul ei izolat** (iframe cu `sandbox="allow-scripts"` și `srcdoc`, fără originea aplicației),
  cu `HostApi` v1 prin `MessagePort`. **CSP-ul are `blob:` și amprenta încărcătorului (`shared/cadruExtensie.ts`) în
  `script-src` și `https:` în `connect-src`** (acordul owner-ului): o schimbare a textului încărcătorului cere amprenta nouă
  (`test/unit/csp.extensii.test.ts`). Butonul Extensii stă lângă marcă; spațiul extensiei ia locul pânzei, iar acțiunile
  documentului nu rulează cât e deschis. **cvs2 nu importă din `extensii/` decât `extensii/api.ts`** (regula
  `cvs2-fara-extensii`), iar o extensie nu importă din cvs2 (`extensia-doar-api`). O extensie se împachetează cu `node
  scripts/impacheteaza-extensie.ts <dosar>` (tipurile se șterg cu `stripTypeScriptTypes` din Node: TypeScript 7 n-are API de
  transpilare). **Pornirea 98,9 (cu ușa 102,4 / 110 kB), totalul 460,6 / 500.**
  **Stocarea extensiilor și permisiunile (ADR 0128, felia 3.Xb)** gata pe 03.11: permisiunea `stocare` (catalogul din
  `src/extensii/pachet.ts`, arătat la instalare), `host.stocare` peste `host.cere`, în IndexedDB (`cncvs2-extensii` v2,
  `date` și `marimi`): doar JSON sau octeți, 4 MB o valoare, 16 MB și 1 000 de chei pe extensie; scoaterea șterge datele.
  **Senderul în `HostApi` vine după unirea lui 13.A↑ în `main`** („Întâi 13.A în main”), ca felia 3.Xc: extensia devine o
  fereastră a aranjamentului (ADR 0132), iar „Lucrarea primită” trece în fereastra Mașina.
  **Planificatorul Trenuleț ca extensie (ADR 0129, felia 3.Ta)** gata pe 03.11: sursele v18 stau în
  `extensii/trenulet/sursa/`, neschimbate, cu testele lor de referință (`node extensii/trenulet/sursa/teste/referinte.js
  --compara`, 0 diferențe). **De acum, planificatorul se schimbă în repo, nu în `Apps/Trenulet/`.** `node
  scripts/construieste-trenulet.ts` face ce făcea `build.py`, fără Python: pagina de sine stătătoare (octet cu octet ca v18)
  și pachetul `.tmp/extensii/trenulet-<versiune>.zip`. Intrarea (`extensii/trenulet/intrare.ts`) îi dă paginii, prin
  `HostApi`, `window.claude` (`db`, `downloads`), `localStorage`, atributele `style` prin CSSOM și scripturile clasice.
  Permisiunea nouă `descarcari` (`descarcari.salveaza`): cvs2 descarcă din pagina lui, doar tipurile din lista albă, cel
  mult 64 MB. Încărcătorul și CSP-ul nu s-au schimbat. „Trimite la cvs2” și previzualizarea 3D nu merg încă din extensie.
  **Pornirea 98,9 (cu ușa 102,4 / 110 kB), totalul 462,6 / 500.**
  **Fereastra extensiei și senderul prin `HostApi` (ADR 0160, felia 3.Xc)** gata pe 03.11, după `main` (cu
  13.A↑) adus în ramură: o extensie deschisă are fereastra ei, cu fila după cele ale aranjamentului (`#loc-fila-extensie`,
  pusă de gazdă, nu în `aranjament.ferestre`) și ×; Proiectarea acoperită urmează ADR 0132 §3. **Permisiunea `masina`,
  oprită pe live:** `host.masina` dă starea la fiecare schimbare, `incarca` (verificările lui „Fișier…”), `porneste` și `reia`
  după confirmarea omului (`ConfirmareMasina`, butonul activ după o secundă), `pauza` și `opreste` direct, `trimite` prin
  dialogul primirii. **Logica senderului pentru extensii stă în `src/app/masinaExtensii.ts` (`invelisMasina`), fără React;**
  fereastra Mașina doar o leagă și o pune în semnalul `masinaPentruExtensii` (`src/app/lucrare.ts`). Pornirea judecă
  `refuzStart` din flux, ca evenimentul `start`. Încărcătorul are `host.masina` și `host.descarcari`, deci amprenta nouă în
  CSP. „Trimite la cvs2” merge din planificator, printr-o fereastră imitată în `intrare.ts` (pachetul 18.1.0).
  **Pornirea 100,6 (cu ușa 104,1 / 110 kB), totalul 471,6 / 500.**
  **Planificatorul adaptat pentru cvs2 (ADR 0161, felia 3.Tb)** gata pe 03.11: intrarea pune `window.cvs2` (cu senderul doar
  când e deschis extensiei), iar sursele rămân aceleași pentru claude.ai, copia de pe calculator și extensie. **Sursele
  planificatorului n-au atribute `style`** (o probă le oprește): clasele din `head.html` țin locul lor, culorile din date
  (`data-fundal`) se pun prin CSSOM, iar adaptorul care copia atributele a plecat. În exportul CNC, „Pe mașină, prin cvs2”
  folosește `host.masina`. **`referinte.js --compara` e în poarta unitară** (`trenulet.referinte.test.ts`, ~30 s): o
  schimbare a motoarelor (G-code, LEGO, CNC) cere referințe noi, explicate. Pagina de sine stătătoare nu mai e v18 octet cu
  octet (dovada aceea rămâne pe `754319b`). Pachetul 18.2.0. Cifrele aplicației nu se schimbă (sursele sunt doar în pachet).
  **Sursele planificatorului în TypeScript (ADR 0162, felia 3.Tc)** gata pe 04.11: cele șase surse sunt `.ts`, scripturi
  clasice (nu module), cu proiectul lor de tipuri (`extensii/trenulet/sursa/tsconfig.json`, aceleași reguli stricte), pe care
  rădăcina îl exclude, iar `npm run typecheck` și `trenulet.tipuri.test.ts` îl verifică. **Construcția și `teste/incarca.js`
  șterg tipurile (`stripTypeScriptTypes`):** în pagină și în pachet ajunge JavaScript. `globale.d.ts` declară Cavalier,
  earcut, three.js (doar tipuri), `window.claude` și `window.cvs2`. Un nume global nou al unei surse se întoarce ca `var` din
  funcția ei închisă. Unde codul presupune o valoare, stă un `!`; o gardă adevărată schimbă codul și cere proba ei.
  `build.py` a plecat din repo.
  **three.js în pachetul extensiei (ADR 0163, felia 3.Td)** gata pe 04.11: `vendor/three.min.js` e r128 de pe cdnjs, octet
  cu octet (amprenta SRI fixată în `trenulet.test.ts`), cu `three.LICENSE`; în pachet stă ca `js/three.js` (și
  `licente/three.txt`), dar nu în pagina de sine stătătoare. `window.cvs2.three()` îl aduce din pachet la prima intrare în
  3D, ca script clasic din `blob:`: în cvs2, atelierul are vederea 3D. CSP-ul nu s-a schimbat. O versiune nouă de three.js
  cere acordul owner-ului pentru descărcare și amprenta nouă în probă. Pachetul 18.3.0.
  **Pluginul ca parte din cvs2 (ADR 0164, felia 3.Xd)** gata pe 04.11: cadrul primește și `color-scheme` (tema aleasă în
  cvs2) și fonturile (`JETOANE_TEMA`, 16); planificatorul pune `data-gazda="cvs2"` și `data-theme` și își leagă de ele
  suprafețele, textul, marginile, roșul, inelul de focus și fonturile (masa, lemnul, cărămizile, verdele și butoanele
  principale rămân ale lui). Permisiunea `cont`: `host.cont` (conectat, numele, planul de la zi; fără adresă, uid sau
  parolă), în context, schimbat pe loc (`src/extensii/cont.ts`). `host.nesalvat` și `host.laInchidere`: × (și altă
  extensie, o versiune nouă) cere întâi salvările extensiei, cel mult 5 s, și întreabă doar ce rămâne nesalvat;
  reîncărcarea, prin `beforeunload`. În planificator, o salvare amânată nouă trece prin `window.cvs2.amana`. Încărcătorul
  are amprentă nouă (politica CSP neschimbată). Pachetul 18.4.0.
  **Planificatorul în engleză (ADR 0165, felia 3.Te)** gata pe 04.11: `planificator/limba.ts` (primul script) dă limba lui
  cvs2 și `tr`; româna rămâne în cod, engleza vine din `planificator/texte.en.json` (doar în pachet, adus doar în engleză):
  `tr` pentru textele cu valori și cele din afara paginii (README-uri, mesajele motoarelor; context pentru cuvintele cu două
  sensuri, `tr("placă", "pat")`), iar textele fixe se traduc pe pagină (`Limba.urmareste`), doar ca noduri de text întregi:
  un cuvânt lipit de o valoare trece prin `tr`. Un text nou cere cheia lui: `node scripts/texte-trenulet.ts`, apoi
  traducerea; `trenulet.engleza.test.ts` cade până atunci (și la un text lipit de valori fără `tr`). La o limbă nouă, pagina își
  salvează lucrul și cere `host.reporneste()` (nou; cel mult o dată la 2 s, cererile dese adunate). G-code-ul, numele de
  fișiere și antetele STL rămân în română. Pachetul 18.5.0.
  **Formele între cvs2 și extensii (ADR 0166, felia 3.Xe)** gata pe 05.11: permisiunea nouă `forme`. Din desen spre
  extensie, doar ce trimite omul: acțiunea `extensii.trimite-selectia` („Trimite la <extensie>”, în bara selecției și în
  paletă, arătată doar cât e deschisă o extensie care primește forme); contururile vin din `src/extensii/formeSelectie.ts`
  (în mm ai foii, arcele la cel mult 0,02 mm, plafoanele 10 000 / 200 000), la `host.forme.laPrimire`. Din extensie spre
  desen, `host.forme.propune(nume, date)` (SVG / DXF, serviciul `src/extensii/forme.ts`): fereastra Importă, pe Proiectare,
  cu „Propus de <extensie>”; nimic fără „Importă”. În planificator: fila „Din cvs2” a atelierului (`dinCvs2` în motorul
  LEGO: găurile după cum stau contururile unele în altele) și „În desenul cvs2” la plăcile exportului. Încărcătorul, cu
  amprentă nouă. Pachetul 18.6.0.
  **Numele pluginului: Easy 3Draw (ADR 0167, felia 3.Tf)** gata pe 05.11: numele afișat (manifestul, 18.7.0, și
  planificatorul: titlul, antetele README-urilor, sfatul filei „Din cvs2”, `de_la.aplicatie`), același în ambele limbi, în
  `PASTRATE`. Id-ul rămâne `trenulet` (de el țin rândul instalat și datele: 18.7.0 peste 18.6.0 îi ia locul, cu circuitele),
  la fel numele tehnice (pachetul, dosarul, scripturile) și antetul G-code-ului (amprentele v18). Verificarea românei rămase
  nu mai scutește „Trenuleț”.
  **Înălțimile pieselor LEGO, la zecimi, în profilul imprimantei (ADR 0168, felia 3.Tg)** gata pe 08.11, în `main`, cu
  implicitele alese de owner („Defaults 1.9 / 2.1”): înălțimea știftului (1,9 mm) și adâncimea locașului de sub piesele pline
  (2,1 mm, cu bifa „Urmează știftul (+ 0,2)”), cu − / + la 0,1 mm, în fiecare imprimantă, lângă variantele de la calibrare
  (Setări și fila Calibrare); cinci plăci de calibrare 2 × 2 cu știfturi de 1,7–2,1 mm. **Regulile înălțimilor stau doar în
  `Lego.inaltimi(profil)`** (zecimile, marginile, legătura, implicitul pentru ce nu e număr): atelierul citește profilul prin
  ea și îi dă motorului rezultatul, iar `trenulet.inaltimi.test.ts` ține implicitele atelierului egale cu ale motorului.
  **Referințele v18 rulează cu înălțimile lui v18 fixate** (`V18` în `referinte.js`), deci apără restul geometriei; o
  schimbare a înălțimilor implicite nu le atinge. Pachetul 18.8.0, din bibliotecă. Cifrele aplicației nu se schimbă.
  **Documentația admin (ADR 0048)** gata pe 20.10: în `/admin`, fila Roadmap (etapele pe săptămâni, feliile, plăcile, ce
  așteaptă de la owner, cu starea dedusă la fiecare build din fișe) și fila Documentație (planul, fișele, ADR-urile),
  generate în `dist/documentatie/`, doar online; cititorul de markdown comun e `src/docs/` (îl refolosește documentația live).
  **Personalul (ADR 0049, adus din etapa 14)** gata pe 20.10: rolurile custom ca bife din catalogul de permisiuni
  (`shared/personal.ts`; `owner` fix, singurul care administrează), invitațiile pe e-mail, conturile create de owner cu link
  de parolă, fila Personal și fila Cont (un singur cont pe adresă, metodele legate). Treptele `support` / `admin` nu mai dau
  nimic; o permisiune nouă = cod + regulă + probă.
  **Sugestiile personalului (ADR 0107, felia 14.B↑, adusă din etapa 14)** gata pe 29.10: fila Sugestii din `/admin`;
  „Sugestii: scrie” (omul scrie o sugestie, își vede sugestiile și decizia, le editează cât n-au decizie) și „Sugestii: citește
  toate”; decizia e doar a owner-ului (acceptată, amânată, respinsă, în lucru, făcută, cu o notă), prin callable-ul `sugestii`
  (auditul în tranzacție, pe versiunea văzută, cel mult 20 pe om pe zi); regulile dau doar citirea, fără index compus.
  **Sugestia din editor (ADR 0111, felia 14.B↑b)** gata pe 30.10: din 02.11, rândul „Trimite o sugestie…” din meniul contului
  (ADR 0120; doar în afara live, fără `?test`),
  deschide fila Sugestii (`/admin#sugestii`) întâi, în clic, apoi lasă în browser poza planșei, micșorată ca JPEG sub 400 kB
  (`src/app/SugestieDinEditor.ts`, `src/app/pozaSugestiei.ts`: IndexedDB și un canal BroadcastChannel; editorul nu încarcă
  Firebase); fila o atașează sugestiei noi, iar serverul o ține în `sugestii/{id}/poze/plansa` (doar `get`, de cine poate
  citi sugestia). Bucățile ei sunt doar online (`DOAR_ONLINE`), cu plafonul lor de 8 kB, în afara totalului.
  **Utilizarea aplicației (ADR 0262, feliile A.8a și A.8b ale liniei adminului)** gata pe 23.11, în sesiunea cloud a
  liniei, unită în `main` pe 23.11 (`5325b8fe`): editorul înregistrează acțiunile registrului (cu sursa gestului și
  rezultatul), ferestrele și unealta și le trimite în loturi, doar cu contul deschis, prin callable-ul `utilizare`
  (`functions/src/utilizare/`); colectarea e pornită pentru toți cei cu cont și e spusă în nota de confidențialitate;
  setările (`setari/utilizare`) le schimbă doar owner-ul, din fila Setări. **Un fel nou de eveniment intră întâi în lista
  albă din `shared/utilizare.ts`:** serverul reface evenimentul doar din câmpurile felului lui și aruncă restul, numărat.
  **În pornire stau doar sursa gestului și tamponul** (`src/app/utilizare.ts`); înregistratorul (`src/app/utilizareLot.ts`)
  are bucata lui, iar trimiterea o pune editarea, prin bucata contului: **un `import('./PanouCont.tsx')` din pornire scoate
  o bucată nouă, comună.** Tipurile comune stau în `utilizareTipuri.ts` (regula `fara-cicluri` numără și importurile doar
  de tipuri). **Legate de cont, evenimentele sunt date personale (GDPR): de verificat juridic înaintea live-ului** (ADR
  0262 §3). **Pornirea 109,2 kB (cu ușa 113,7 / 115; cu Atelierul 114,0), totalul 784,6 / 800, `/admin` 130,3 / 200,
  contul 30,0 / 32.**
  **A.8c și A.8d (dialogurile, clicurile fine, derularea și zoom-ul; calculele lungi, mașina și imprimanta)** gata pe
  23.11, unite în `main` pe 24.11 (`80d3eb70`): clicul pe un control pleacă doar cu numele lui din cod (`numeControl.ts`),
  iar numele sunt strânse în `src/app/catalogControale.ts`; un nume făcut din textul omului (al unei foi, al unui font) nu
  pleacă niciodată. **Un atribut de nume nou, scris de mână pe un control al editorului, cere `node
  scripts/catalog-controale.ts --scrie`** (altfel cade `test/unit/utilizare.catalog.test.ts`, din poarta rapidă); la o
  ciocnire în fișierul generat, se scrie din nou, nu se rezolvă de mână. La unirea a două linii care au pus controale,
  catalogul se scrie din nou pe ramura de unire. Totul se prinde din pagină, în bucata înregistratorului
  (`src/app/utilizareDom.ts`), nu în pornire. Felurile `calcul` (durata și mărimea în trepte, prin
  `src/jobs/observatorCalcul.ts`), `masina` și `imprimanta` pleacă fără nume, adrese, G-code sau valori exacte. **Utilizarea
  nu schimbă niciodată un calcul:** un document stricat sau un ascultător care aruncă îl lasă cum era. **Evenimentele
  mașinii se scot din două stări văzute la rând (la redesenare, nu la fiecare pas al fluxului):** o lucrare scurtă,
  ajunsă la capăt între două redesenări, e spusă tot „pornită”, întâi (`src/app/utilizareMasina.ts`; reparația din
  24.11, după completul de noapte căzut pe emulatoare). Urmează A.9
  (sumele zilei, jobul de noapte și fila Utilizare), A.10, A.11, apoi A.7. **Pornirea 109,4 kB (cu ușa 113,9 / 115; cu
  Atelierul 114,2), totalul 799,6 / 900, `/admin` 131,3 / 200, contul 30,0 / 32.**
  **A.9a și A.9b (sumele zilei, jobul de noapte și fila Utilizare)** gata pe 24.11, unite în `main` pe 24.11 (`95dddbe0`):
  jobul `agregaUtilizarea` (02:30, ora României, cu marcajul lui, judecat de Diagnoza și de Azi) adună ieri și
  alaltăieri în `utilizareZi/{zi}`, fără conturi: oamenii distincți stau într-o schiță HyperLogLog, deci sunt
  aproximativi („≈”). Permisiunea „Utilizare: citește” dă citirea sumelor; loturile nu le citește nimeni. Fila
  **Utilizare** din `/admin` (grupul Produs, după Sugestii; bucata `FilaUtilizare`, doar online, cu plafonul ei de 25 kB)
  arată, pe 7, 30 sau 90 de zile și pe clienți, personal sau toți: oamenii activi, sesiunile, programele exportate,
  refuzurile; cele mai folosite acțiuni; ce nu se folosește (din catalogul acțiunilor generat la build,
  `documentatie/actiuni.json`); frecările; duratele calculelor. **Probele filelor Azi și Personal numără joburile și
  permisiunile (4 și 12), iar probele barei numără filele:** un job, o permisiune sau o filă nouă a adminului le
  schimbă. **`/admin` 133,2 / 200 kB; pornirea și totalul, neschimbate (109,4; 799,6 / 900).**
  **A.10 și A.11a (fluxurile; pașii dinaintea unei erori)** gata pe 24.11, unite în `main` pe 24.11 (`7f6f4069`): jobul
  de noapte scrie și fluxurile zilei (`fluxuri`, în `shared/utilizareZi.ts`): secvențele de 3 și 4 acțiuni reușite la
  rând și pâlnia drumului principal (deschiderea, desenul sau importul, rolul, exportul G-code, lucrarea pe mașină);
  fila Utilizare le arată, cu durata unei sesiuni. Raportul unei erori poartă ultimii pași ai omului dinaintea ei
  (implicit 30, din Setări; 0 îi oprește), fără nimic din desen, iar fila Erori îi arată. **Pașii se iau în clipa
  erorii** (`pasiAcum`, din `src/app/utilizare.ts`, dat raportorului în `main.tsx`), nu la trimitere. **Verificarea lor stă în
  `shared/pasiEroareVerificare.ts`** (serverul și adminul), nu în `shared/pasiEroare.ts`: altfel bucata raportorului
  aduce tot contractul utilizării. **Un fel nou de eveniment cere rândul lui și în `FELURI_PAS`** (compilatorul o
  spune). **Pornirea 109,6 kB (cu ușa 114,1 / 115; cu Atelierul 114,4: mai sunt 0,6 kB), totalul 800,1 / 900,
  `/admin` 135,0 / 200.**
  **A.11b–A.11e (pașii la raportare, cronologia unui om, sesiunea raportării, disocierea)** gata pe 24.11, unite în
  `main` pe 24.11 (`8ccb66e8`): în „Raportează o problemă…”, bifa **Atașează ultimii pași din aplicație** (nebifată
  implicit; pașii se iau la deschiderea ferestrei), arătați în fila Tichete; permisiunea nouă **„Utilizare: sesiuni”**
  dă **Activitatea** unui cont (fila Utilizatori, doar la „Arată activitatea”) și **Sesiunea raportării** (fila
  Tichete): citirea trece prin server (funcția `utilizare`), care cere permisiunea, trece evenimentele încă o dată prin
  lista albă și scrie fiecare citire în audit; **Desparte utilizarea de cont…** (cine administrează conturile, la
  cererea omului, printr-un tichet) pune un pseudonim aleator pe tot ce s-a strâns și pe ce vine, iar legătura cont →
  pseudonim stă doar pe server (`utilizareDisociate`, fără regulă, deci închisă oricui; nu se desface din aplicație).
  A.11 e încheiată. **Catalogul are 13 permisiuni** (proba matricei rolurilor le numără). **`/admin` 137,9 / 200,
  contul 30,1 / 32; pornirea, neschimbată de aceste felii.**
  **A.7 (adminul pe telefon, ADR 0260 §7)** gata pe 24.11, unită în `main` pe 24.11 (`458befb9`): sub 640 px, `/admin`
  are jos o bară cu Azi, Erori și Tichete (doar cele pe care rolul le vede, cu numerele lor) și „Mai mult”, iar restul
  filelor stau într-un sertar (☰ din antet sau „Mai mult”; îl închide o filă aleasă sau Escape); un tichet se citește
  și primește răspuns pe telefon, iar proiectul atașat se descarcă doar de pe calculator. Nimic pe server. **Cu ea,
  linia adminului e încheiată** (ADR 0260: A.1–A.7; ADR 0262: A.8–A.11); o felie nouă pornește la cuvântul owner-ului.
  **`/admin` 138,2 / 200.**
  **3.At (fila Setări din `/admin`: mesajul salvării după citirea de după)** gata pe 24.11, scrisă de sesiunea
  principală (linia adminului fiind încheiată), unită în `main` pe 24.11 (`cadac6c3`): după „Salvează”, cele trei
  formulare ale Setărilor (conturile, utilizarea aplicației, răspunsurile rapide) arată mesajul abia când sosește
  citirea de după, din care formularul se umple din nou; până atunci rămân ocupate. **Un formular al adminului care se
  umple din nou din citirea de după salvare își ține mesajul până la ea (`useMesajDupaCitire`,
  `src/admin/setari/dupaCitire.ts`), iar o probă care scrie într-un formular după o salvare așteaptă întâi mesajul.**
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
  **Aranjamentele, feliile 28.1↑a–28.1↑d (ADR 0250 §1–§7),** în worktree-ul `aranjamente` (ramura
  `wip/28.1-aranjamente`): 28.1↑a (alegerea și densitatea), 28.1↑b (fereastra Aspectul) și 28.1↑c (Atelierul pe
  Proiectare, adus la cerere) unite în `main`; 28.1↑d (tăierea din butoane mari, „Trimite la mașină”) gata pe 18.11,
  neunită.
  - Cheia e `cncvs2.aranjament`, ca JSON `{ v: 1, aranjament, densitate }`, citită în `src/ui/alegereAranjament.ts`;
    `main.tsx` pune `data-aranjament` și `data-densitate` pe `<html>`, lângă temă.
  - **Un aranjament nou intră în `src/ui/incarcaAranjament.ts`** (încărcătorul lui; datele într-un modul fără CSS, ca
    `aranjamentAtelier.ts`, bucata cu CSS-ul ca `atelier.ts`); o alegere ținută a unuia care lipsește dă Insule, fără
    s-o șteargă. App ține aranjamentul în stare (`alegeAranjament`), fereastra Aspectul îl schimbă pe loc.
  - Fereastra Aspectul (`src/app/Aspectul.tsx`, la cerere): din meniul contului (rândul `aspect`) și din paletă
    (`vedere.aspect`, în `ORIUNDE`).
  - Densitatea mare: `--tinta` 48 px, 56 la atingere. Numele uneltelor (`.nume-unealta`) sunt ascunse în Insule.
  - **Pe telefon nu mai lucrăm la desen** (ADR 0250 §7, schimbat pe 18.11): ce merge azi nu se strică; fluxul
    telefonului, „proiectele mele → Trimite la mașină”, vine cu linia Proiectelor, după proiectele în cont.
  - Felul tăierii din panou e în datele aranjamentului (`taierea`: `lista` sau `butoane`); calculul butoanelor stă în
    `src/app/taiereButoane.ts`. „Trimite la mașină” e acțiunea `export.trimite` (registrul exportului): App deschide
    fereastra exportului cu butonul ei și duce programul în Mașina (`duInMasina`, ca „Deschide în Mașina”).
  - Rolurile din butoane: trei pe rând doar unde încap și cu fontul lat; sub 16,25rem de grilă, câte două, iar
    incrustațiile și rolurile omului pe tot rândul (`atelier.css`; completul roșu pe `0905a07a`). **O grilă de butoane
    cu nume se probează și cu fontul lat** (Verdana aici; pe Linux, `system-ui` e lat).
  - După 28.1↑d, pe unirea cu `main` `e88dbc1e` (28.1↑c unită, 10.3↑m, 11.3↑b, 12.1↑f-2, 25.6↑, A.1): pornirea 107,1 kB
    (cu ușa 111,1 / 115), totalul 730,2 / 800 (creșterea vine din `main`); bucata Atelierului 0,31 kB, cu pornirea și
    ușa 111,4 / 115. Felia singură, față de baza ei: pornirea +0,1, totalul +1,1.
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
  - **O felie a rapidului are 15 minute** (din 24.11; înainte 10): împărțirea fișierelor pe felii se mută la fiecare
    fișier de test nou. Oracolul rampelor, care ținea singur peste 6 minute, e împărțit din 24.11 în șase fișiere
    (`intrari-rampa.corpus.<n>.oracol.test.ts`, prin `test/unit/ajutor-intrari-rampa-corpus.ts`); la fel, în câte
    patru, proba căilor netede din multe cubice (`cale.recenzie.cubice.<n>.test.ts`) și echivalența porții de dinainte
    de ADR 0032 (`degajari.poarta.<n>.oracol.test.ts`). **O probă pe corpus care trece de un minut se împarte la fel,
    pe părți ale corpusului, cu `test/unit/ajutor-parti.ts`: câte un fișier pe parte, pragurile pe părți (suma lor cel
    puțin cât pragul întreg) și proba care păzește împărțirea. O listă de otrăvuri care numea fișierul întreg primește
    și fișierele părților.** Un rapid
    „cancelled” pe o singură felie, la limită, e împărțirea, nu un test agățat: se citește jurnalul feliei (ultimul
    fișier tipărit e cel dinaintea celui lent). Înaintea unirii se citesc și rapidul, și completul ramurii de unire.
  - Local, tot nivelul rapid: `npm run rapid`. E2e-ul în Edge: `npm run build && npm run e2e`.
  - Funcțiile, regulile și pagina `/admin` pe emulatoare: `npm run test:emulator` (Java ≥ 21: pe mașina asta, JBR-ul din
    Android Studio, ales de script; în CI, în nivelul complet).
  - Sugestiile personalului acceptate de owner: `node scripts/sugestii.ts` (cele de făcut și cele în lucru, cu nota lui;
    `--toate` pentru restul; ADR 0107 §7). O sugestie acceptată intră în propunerile de felii, în lista grupată pentru owner.
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

- 26.11.2026, noaptea (a patruzeci și treia unire din cloud): **viteza ferestrei „Exportă G-code” (28.8↑i), unită în
  `main`** (sesiunea principală, ramura `unire-2611b`, din `554b72cb`). Linia exportului, ramura `wip/28.8-export`,
  `8c309846`, PR-ul `AndreiBesliu/cvs2#49` (ADR 0291 §1, răspunsul 1a al owner-ului; constatarea 4 a auditului),
  unită în `953205a8`: peste 12 operații, fereastra randează doar fișele din jurul panoului, pe cea curentă cu
  vecinele ei și pe cea cu focusul; restul își țin locul, cu titlul și înălțimea măsurată, deci lista, derularea și
  „Du-mă la …” le găsesc; rândurile listei nu se mai randează la fiecare tastă. Până la 12 operații, fereastra
  rămâne cum era. Măsurat de linie, pe 150 de operații: deschiderea 9,7 s → ~0,5 s (următoarele ~0,15 s), o tastă
  96 ms → ~10 ms, fișele randate 150 → 3, nodurile 37 800 → 2 667. **Programul, documentul și serverul nu se
  schimbă** (documentul rămâne v29). Otrăvurile 10 / 10. **Drumul până în `main`:** primul complet al liniei a
  căzut la proba de viteză (1 159 ms la pragul de 1 s): timpul era citit pe treptele de așteptare ale lui `expect`
  din Playwright; linia a mutat judecata pe numărători (fișele randate, nodurile) și pe timpul măsurat în pagină,
  cu cea mai bună încercare, și a găsit apoi, sub suprasarcină, un defect adevărat: `content-visibility` pe
  rândurile listei le dădea înălțimea 0 departe de vedere, deci un clic pe un rând de departe cădea pe listă (4 din
  64 de rulări); scos, cu proba lui. Completul liniei, verde de două ori pe `8c309846` (45704990640, 45705182587).
  După commit-ul verificat de linie, `main` primise 3.Cl-1 (extensia și probele ei), deci arborele unirii nu era al
  niciunui commit verificat și și-a făcut completul lui. Unirea, fără nicio ciocnire. Porțile unirii, în CI, pe
  `953205a8` (completul 45714218828, verde la prima trecere, 60 min): unit 10 617 / 0 (12 sărite, pe Linux), e2e
  903 / 903, funcțiile pe emulatoare 136 / 136, paginile 60 / 60; rapidul, verde pe `953205a8`; pornirea 111,4 kB
  (plafonul 125; cu ușa 116,5, cu Atelierul 116,9), **totalul 909,4 / 1 000 kB** (+0,3), `/admin` 138,3 / 200,
  contul 30,2 / 32. **Lotul 39 (decorațiunile de Crăciun) e pe test din 26.11, 01:43** (`554b72cb`; completul pe
  `main` 45712796123, verde; proba de fum, bună); 28.8↑i pleacă acum (lotul 40). **Schema:** linia reliefului a
  luat v30 pentru degroșare (operația `degrosare`, ADR 0313, propus de ea), deci **un câmp nou pe altă linie ia
  v31**. La linii, raportate gata, pentru lotul următor: atelierul (3.Cl-2, globul de Crăciun, Easy 3Draw 18.36.0,
  `AndreiBesliu/cvs2#53`) și cotele (10.4↑d-1: lanțul, linia de bază, „Cotează selecția”, `AndreiBesliu/cvs2#52`);
  în lucru: exportul (28.8↑j, greșelile pe înțeles; apoi k, l), relieful (18.1↑d), cotele (10.4↑d-2, d-3),
  atelierul (3.Cl-3, ornamentul cu nume). **La owner:** de tipărit decorațiunile, rândul
  editabil al finisării, Escape în cele șase ferestre, feliile frezelor (16.A↑d–g), cele două alegeri cu
  recomandarea aplicată, de încercat „Modelul” din Easy 3Draw, proba pe mașină a centrului foii, cele patru
  întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor, verificarea
  juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la
  atingere.
- 26.11.2026, noaptea (a patruzeci și doua unire din cloud): **decorațiunile de Crăciun din atelierul Easy 3Draw:
  fulgul, steaua și brăduțul (3.Cl-1), unite în `main`** (sesiunea principală, ramura `unire-2611a`, din
  `ca38f215`). Linia atelierului, ramura `wip/3.Xh-biblioteca-ui`, `42775bb0`, PR-ul `AndreiBesliu/cvs2#50` (ADR
  0285, acceptat de owner pe 25.11, în sesiunea liniei: „Mergem cu recomandarile”, 1a–4a; la cererea lui din sesiunea
  principală, „Vreau ca sesiunea care lucreaza la plugin, sa faca si decoratiuni de craciun pentru imprimanta”),
  unită în `41b1fb6f`: fila nouă „Crăciun” a atelierului, cu trei piese plate, tipărite culcate, fără suport: fulgul
  de zăpadă (șase brațe, cu perechi de ramuri; șase gata făcuți și „Alt fulg”), steaua (5–8 colțuri; plină, contur
  sau în relief) și brăduțul (de agățat sau în picioare, din două plăci cu fante, tipărite alături); agățătoarea e
  inelul sau gaura de 2,5 mm de lângă vârf, iar unde gaura nu încape, piesa primește inelul, cu un mesaj. **Easy
  3Draw 18.35.0** (536,8 kB); otrăvurile 119 / 119 și 13 / 13. Găsite de probe și reparate în felie: gâtul dintre
  inel și brațul fulgului ieșea sub linia de 1,2 mm; gaura de agățat a unui brad mic își găsea loc deasupra
  trunchiului, deci bradul ar fi atârnat cu vârful în jos. Doar pachetul extensiei se schimbă; nimic pe server;
  documentul rămâne v29. Ramura avea `main` `a4d86d53`, iar de atunci `main` a primit doar documente, deci
  **arborele unirii are exact codul lui `05e2dffb`** (`git diff` gol în afara fișierelor `.md`), pe care a rulat
  completul liniei, și a intrat pe porțile lui, fără alt complet: completul 45700790804, verde la prima trecere
  (57 min): unit 10 617 / 0 (12 sărite, pe Linux), e2e 898 / 898, funcțiile pe emulatoare 136 / 136, paginile
  60 / 60; rapidul, verde pe `05e2dffb` și pe `42775bb0`; aplicația, neschimbată de felie: pornirea 111,4 kB
  (plafonul 125; cu ușa 116,5, cu Atelierul 116,9), totalul 909,1 / 1 000 kB, `/admin` 138,3 / 200, contul
  30,2 / 32. Ciocnirea, doar în DEVLOG. Pe test e `c9911c14` (lotul 38, din 25.11, 23:28: tot ce era în `main`
  până acum); 3.Cl-1 pleacă acum (lotul 39). La linii, în lucru: atelierul (3.Cl-2, globul și relieful pe două
  înălțimi; apoi 3.Cl-3, 3.Cl-4), exportul (28.8↑i, viteza ferestrei: proba de viteză refăcută pe numărători, cu
  două complete în lucru), relieful (18.1↑d, oracolul degroșării), cotele (10.4↑d). **La owner:** de tipărit
  decorațiunile, rândul editabil al finisării, Escape în cele șase ferestre, feliile frezelor (16.A↑d–g), cele
  două alegeri cu recomandarea aplicată, de încercat „Modelul” din Easy 3Draw, proba pe mașină a centrului foii,
  cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la
  320 px la atingere.
- 25.11.2026, noaptea: **10.4↑d și 18.1↑d, pornite** („ok, porneste 10.4↑d si 18.1↑d”, în sesiunea principală, la
  23:37, după publicarea lotului 38, la lista cu ce aștepta de la owner). Sesiunea principală le-a scris celor două
  linii pe 26.11, la 00:08. **10.4↑d** (linia cotelor; ADR 0330): lanțul și linia de bază, „Cotează selecția”, „Fă
  desen din cotă”, cotele în raportul foilor: ultima felie a cotelor. Cotele stau tot pe foaie, fără schemă nouă;
  „cotele nu ajung niciodată în program” rămâne, iar „Fă desen din cotă” e un pas vizibil al omului, într-un pas de
  anulare. **18.1↑d** (linia reliefului; ADR 0310): degroșarea reliefului, apoi fișa plăcii reliefului. Mișcă
  mașina, deci oracolul întâi (`test/oracles/relief3d.ts`): nicio scobitură în model, cu adaosul lăsat finisării;
  niciodată mai adânc decât pasul pe trecere; materialul rămas finisării. Felul nou își spune locul în `catFoaia` și
  în ordinea tăierii (degroșarea înaintea finisării aceluiași relief). **Documentul: v30 e ținut pentru
  degroșare**, dacă cere un câmp sau un fel nou de operație; linia spune de îndată dacă îl folosește. **Rândul
  editabil al finisării din fereastra exportului nu e pornit** de acest cuvânt: rămâne la owner. Amândouă: proba
  întâi, creșterea de mărime spusă în raport, un singur commit raportat, cu porțile verzi; unirea, la raport. Linia
  exportului lucrează în aceeași fereastră (28.8↑i), deci cine raportează al doilea aduce `main` întâi. O alegere
  care e a owner-ului (de pildă strategia degroșării și adaosul implicit) se pune grupat, cu recomandarea în față,
  iar linia merge înainte cu recomandarea. **Rămân la owner:** rândul editabil al finisării, Escape în cele șase
  ferestre, feliile frezelor (16.A↑d–g), cele două alegeri cu recomandarea aplicată, de încercat „Modelul” din Easy
  3Draw (acum și alipirea), proba pe mașină a centrului foii, cele patru întrebări din auditul elicelor, pachetul
  Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației
  înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, seara (a patruzeci și una unire din cloud): **alipirea la prinderi în vederea „Modelul” a atelierului
  Easy 3Draw (3.Cf-1), unită în `main`** (sesiunea principală, ramura `unire-2511ac`, din `5649067c`). Linia
  atelierului, ramura `wip/3.Xh-biblioteca-ui`, `6b093a98`, PR-ul `AndreiBesliu/cvs2#46` (ADR 0284, partea D, cu
  răspunsurile owner-ului din sesiunea liniei: întâi alipirea la prinderi; prinderea aleasă din puncte, în vederea
  3D, cu lista alături; piesa alipită urmează baza), unită în `02ac0715`: piesa aleasă din model își arată
  prinderile; una aleasă e ținta, iar „Alipește în model” pune piesa următoare pe ea și o leagă de bază, pe care o
  urmează la mutare și la rotire, în lanț; piesa prinsă are „Altă prindere”, „Alt loc pe bază”, „Rotește ↻”,
  „Glisează” (pe o tijă) și „Desprinde”. **Easy 3Draw 18.34.0** (524,4 kB); otrăvurile 132 / 132 și 13 / 13. 3.Cf
  s-a împărțit: 3.Cf-2 (orientarea de mână pe trei axe, pozițiile la jumătate de pas) rămâne, după decorațiunile de
  Crăciun. Doar pachetul extensiei se schimbă (și o opțiune a uneltei de otrăvuri, `E2E_BUILD = False`, pentru
  listele pluginului); nimic pe server; documentul rămâne v29. Ramura avea `main` `88771f12`; de atunci `main`
  primise finisarea reliefului și 28.8↑h (cod al aplicației), deci unirea și-a făcut completul ei. Ciocnirile, doar
  în DEVLOG și în indexul liniilor (rândul atelierului, al liniei). Porțile unirii, în CI, pe `02ac0715` (completul
  45683411511, verde la prima trecere, 57 min): unit 10 596 / 0 (12 sărite, pe Linux), e2e 890 / 890, funcțiile pe
  emulatoare 136 / 136, paginile 60 / 60; rapidul, verde pe `02ac0715`; completul liniei, verde pe `6b093a98`
  (45673012503); aplicația, neschimbată de felie: pornirea 111,4 kB (plafonul 125; cu ușa 116,5, cu Atelierul
  116,9), totalul 909,1 / 1 000 kB, `/admin` 138,3 / 200, contul 30,2 / 32. Pe test e `75bcf3fb` (lotul 36); lotul 37
  (`5649067c`: Escape în „Frezele mele”, finisarea reliefului, fereastra exportului „pe hârtie”) e în drum, cu
  completul pe `main` pornit la 21:24; 3.Cf-1 pleacă după el. La linii, în lucru: atelierul (3.Cl-1, fulgul, steaua
  și brăduțul, în fila „Crăciun”; 18.35.0), exportul (28.8↑i, viteza ferestrei). **La owner:** 18.1↑d și rândul
  editabil al finisării, 10.4↑d, Escape în cele șase ferestre, feliile frezelor (16.A↑d–g), cele două alegeri cu
  recomandarea aplicată, de încercat „Modelul” din Easy 3Draw (acum și alipirea), proba pe mașină a centrului foii,
  cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la
  320 px la atingere.
- 25.11.2026, seara (a patruzecea unire din cloud): **fereastra exportului „pe hârtie” (28.8↑h, cu reparația
  28.8↑h-2), unită în `main`** (sesiunea principală, ramura `unire-2511ab`, din `e5c217b2`). Linia exportului, ramura
  `wip/28.8-export`, `985261ca`, PR-ul `AndreiBesliu/cvs2#44` (ADR 0291 §1, răspunsul 1a al owner-ului;
  constatările 1–3 ale auditului), unită în `7d74ade2`: desenele și notele fișei unei operații vin acum din
  funcțiile lucrării, socotite de aplicație (`src/app/hartieExport.ts`), nu din valorile scrise: cu supracursa prin
  foaie, 18 mm cu pasul 6 se desenează ca 4 treceri de 4,575 până la 18,3, ca în program; găurirea pe elice are
  desenul ei, fără câmpul ieșirii; un cerc pe care freza nu-l poate găuri e o greșeală lângă freză, cu freza minimă
  care merge, iar Exportă e oprit înainte de clic. **Programul rămâne octet cu octet** (aurul plăcilor și al
  atelierelor, corpusul CAM): regulile s-au mutat, cu aceleași calcule (`adancimiTreceri` în `src/cam/treceri.ts`,
  găurirea în `src/cam/gaurireFel.ts`, „cât foaia” în `catFoaia`). Otrăvurile 21 / 21, apoi 6 / 6 și una nouă pentru
  regula unită. **Drumul până în `main`:** raportată la 16:00 (`2ecd0054`); unirea de probă peste 16.A↑b-4 a căzut la
  proba ei nouă, de fiecare dată: „Du-mă la …” aducea doar capul fișei sus, iar cu „Scrisă de mână (ca „…”)” în
  listă greșeala ieșea din panou (măsurat în browser). Linia a reparat la cauză (28.8↑h-2: butonul aduce în vedere
  grupul primei greșeli și pune focusul pe câmpul greșit; proba, pe dreptunghiuri, la șase mărimi de fereastră).
  Raportată din nou la 19:44; peste finisarea reliefului, o ciocnire în CAM: regula „cât foaia” din
  `src/cam/prinFoaie.ts`, schimbată de amândouă liniile. Rezolvată de linia exportului într-un singur loc
  (`catFoaia`, cu finisarea înăuntru), cu proba scrisă întâi, în lucrare și pe hârtie, citită și de linia
  reliefului. Ramura avea unirea reliefului (`b35e2f75`), deci **arborele unirii are exact codul lui `985261ca`**
  (`git diff` gol în afara fișierelor `.md`) și a intrat pe porțile lui, fără alt complet: completul 45672890113,
  verde (unit 10 581 / 0, 12 sărite pe Linux; e2e 883 / 883; funcțiile pe emulatoare 136 / 136; paginile 60 / 60);
  rapidul, verde pe `985261ca`; pornirea 111,4 kB (plafonul 125; cu ușa 116,5, cu Atelierul 116,9), **totalul
  909,1 / 1 000 kB** (+1,7), `/admin` 138,3 / 200, contul 30,2 / 32. Documentul rămâne v29; nimic pe server. Pe test
  e `75bcf3fb` (lotul 36); 16.A↑b-7, finisarea reliefului și felia aceasta pleacă acum, într-o singură publicare
  (lotul 37). **Tot azi, în sesiunea liniei atelierului, owner-ul a acceptat ADR 0285 (decorațiunile de Crăciun din
  Easy 3Draw): „Mergem cu recomandarile”** (1a–4a): întâi fulgul, steaua și brăduțul (3.Cl-1), apoi globul și
  relieful pe două înălțimi (3.Cl-2), ornamentul cu nume, cu font dintr-o singură linie (3.Cl-3), brăduțul LEGO
  (3.Cl-4); o filă nouă, „Crăciun”; ornamentele sunt de sine stătătoare, de agățat. La linii: exportul (28.8↑i,
  viteza ferestrei), atelierul (3.Cf-1, alipirea la prinderi, raportată: își face completul unirii; apoi 3.Cl-1).
  **La owner:** 18.1↑d și rândul editabil al finisării, Escape în cele șase ferestre, 10.4↑d, feliile frezelor
  (16.A↑d–g), cele două alegeri cu recomandarea aplicată, de încercat „Modelul” din Easy 3Draw, proba pe mașină a
  centrului foii, cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea
  sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în
  `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, seara (a treizeci și noua unire din cloud): **finisarea reliefului (18.1↑c), unită în `main`, cu
  documentul v29** (sesiunea principală, ramura `unire-2511x`, peste `88771f12`). Linia reliefului, ramura
  `wip/18.1-relief`, `40c745f5`, PR-ul `AndreiBesliu/cvs2#39` (ADR 0310 §4–§6, §13; ADR 0312, forma în document),
  unită în `f7ca20b6`: o piesă-relief primește în Tăierea rolul „finisarea reliefului”; programul o taie cu freza
  bilă (sau cu plata, ori cu V-ul), pe linii paralele, în treceri pe Z cel mult cât pasul, ultima pe model, fără nicio
  scobitură în model (calculul pe câmpul conservativ, în workerul CAM). În fereastra exportului, finisarea are
  rândul ei, doar de citit, la locul ei în ordinea tăierii (în ordinea automată, întâi, înaintea oricărei tăieturi a foii), cu
  creasta pe plan calculată; vederea 3D arată „Tăiat” după finisare. **Mișcă mașina**, deci oracolul a fost scris
  întâi (`test/oracles/relief3d.ts`: freza coborâtă exact pe modelul exact, creasta, materialul rămas); otrăvurile
  45 / 45. **Documentul trece pe v29** (operația `finisare`, cu câmpul ei, și freza `{ tip: 'bila' }`; migrarea
  schimbă doar numărul): **un câmp nou ia de acum v30**, iar numărul îl dă sesiunea principală, la cerere. Nimic pe
  server. **Drumul până în `main`:** raportată întâi la 15:11, peste `2aaee0b4`; neunită atunci, fiindcă peste
  16.A↑b-4 o bilă din bibliotecă ar fi arătat în fereastra exportului ca o freză plată (lista dată notei bibliotecii
  îi pierdea forma). Linia a adus `main`, a ținut bilele afară din lista aceea (rândurile ferestrei n-au bile; o pază
  a compilatorului o ține și la „Pune-o înapoi în bibliotecă”) și a probat finisarea cu originea în centrul foii.
  Unirea, peste lotul cu 16.A↑b-6 și 10.4↑c-2, fără nicio ciocnire; apoi `main` adus cu 16.A↑b-7 (`b35e2f75`) și
  completul repornit, ca rularea să acopere exact ce intră. Porțile unirii, în CI, pe `b35e2f75` (completul
  45672724822, verde, 56 min): unit 10 577 / 0 (12 sărite, pe Linux), e2e 873 / 873, funcțiile pe emulatoare
  136 / 136, paginile 60 / 60; rapidul, verde pe `b35e2f75`; completul liniei, verde pe `dec06156` (45654203469);
  pornirea 111,4 kB (plafonul 125; cu ușa 116,5, cu Atelierul 116,8), **totalul 907,4 / 1 000 kB** (+10,8), `/admin`
  138,3 / 200, contul 30,2 / 32. Pe test e `75bcf3fb` (lotul 36, din 20:54); 16.A↑b-7 și finisarea pleacă împreună
  cu 28.8↑h, într-o singură publicare. **Nedovedit fără mașină:** creasta reală (raza adevărată a bilei, bătaia,
  încovoierea), suprafața tăiată față de model, timpul; placa de probă a reliefului are fișa ei după degroșare.
  La linii, în lucru: exportul (28.8↑h, la porți peste unirea aceasta: regula „cât foaia” din `src/cam/prinFoaie.ts`
  devine una singură, `catFoaia`, cu finisarea înăuntru, citită și de linia reliefului), atelierul (3.Cf, apoi
  decorațiunile de Crăciun). **La owner, pentru relief:** 18.1↑d (degroșarea) și rândul editabil al finisării în
  fereastra exportului, la cuvântul lui. **Tot la owner:** Escape în cele șase ferestre, 10.4↑d, feliile frezelor
  (16.A↑d–g), cele două alegeri cu recomandarea aplicată, de încercat „Modelul” din Easy 3Draw, proba pe mașină a
  centrului foii, cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea
  sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în
  `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, seara (a treizeci și opta unire din cloud): **Escape închide „Frezele mele” oriunde ar fi focusul
  (16.A↑b-7), unită în `main`** (sesiunea principală, ramura `unire-2511z`, din `75bcf3fb`). Linia frezelor, ramura
  `wip/16.A-freze-b7`, `0b015682` (codul lui `c95b1576`), PR-ul `AndreiBesliu/cvs2#47`, la cererea sesiunii
  principale, după semnalarea liniei exportului: două probe ale frezelor (`exportFrezeNota.spec.ts`, în `main` din
  17:00, și `exportFrezeInapoi.spec.ts`) cădeau din când în când (4 din 50 la linia exportului, 2 din 50 la linia
  frezelor), deci un complet pe `main` putea cădea la întâmplare. Unită în `581da353`. **Cauza era în fereastră, nu
  în probă:** Escape se asculta doar pe fereastră, iar butonul apăsat pleacă din pagină („Salvează” în „Listă”, „Da,
  șterge”) sau se oprește sub focus („Salvează” în „Configurator”); la fel, un clic pe un text al ferestrei; tasta
  cădea pe `body`. În plus, o stare rămasă în urmă (întrebarea unei freze deja șterse) o oprea și cu focusul
  înăuntru. Acum Escape se ascultă pe `document` cât fereastra e deschisă, ca la fereastra exportului, și închide
  stratul de sus care se vede; manualul și paleta de deasupra își păstrează tasta. Probele, scrise întâi, apasă
  Escape exact în clipa plecării butonului; cele două spec-uri: 50 / 50 după. Otrăvurile 6 / 7 (una, practic
  echivalentă azi). Nimic pe server; documentul rămâne v28. Ramura avea deja `main`: **arborele unirii are exact
  codul lui `c95b1576`** (`git diff` gol în afara fișierelor `.md`) și a intrat pe porțile lui, fără alt complet:
  completul 45662118218, verde (unit 10 529 / 0, 12 sărite pe Linux; e2e 865 / 865; funcțiile pe emulatoare
  136 / 136; paginile 60 / 60); rapidul, verde pe `c95b1576`; pornirea 111,2 kB (plafonul 125; cu ușa 116,2, cu
  Atelierul 116,5), **totalul 896,6 / 1 000 kB** (+0,1), `/admin` 138,3 / 200, contul 30,3 / 32. Pe test e `6741c0be`
  (lotul 35); lotul 36 (`75bcf3fb`) e în drum, iar 16.A↑b-7 pleacă după el. **Același tipar (Escape ascultat doar pe
  fereastră) e în alte șase ferestre** („Așază pe foi”, Setări, raportul foilor, lucrarea primită, Aspectul,
  fereastra extensiilor): o reparație comună e o felie separată, la cuvântul owner-ului. Unirea reliefului
  (`unire-2511x`, 18.1↑c) primește `main` cu 16.A↑b-7 și își reface completul; linia exportului își pune reparația
  lui 28.8↑h peste ea. **La owner:** Escape în cele șase ferestre, 10.4↑d, feliile frezelor (16.A↑d–g), cele două
  alegeri pe care liniile au mers cu recomandarea (freza pusă la loc între timp; textul cotei DIMENSION), de
  încercat „Modelul” din Easy 3Draw, proba pe mașină a centrului foii, cele patru întrebări din auditul elicelor,
  pachetul Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor, verificarea juridică (GDPR) a utilizării
  aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, seara (a treizeci și șaptea unire din cloud): **„Pune-o înapoi în bibliotecă”, din fereastra
  exportului (16.A↑b-6), și cotele ca DIMENSION în DXF, cu cifrele ca text (10.4↑c-2), unite în `main`**, în lot
  (sesiunea principală, ramura `unire-2511w`, din `6741c0be`); amândouă pornite la „ok, porneste 10.4↑c-2 si
  16.A↑b-6” al owner-ului. **16.A↑b-6** (linia frezelor, ramura `wip/16.A-freze-b6`, `f53ad4ff`, PR-ul
  `AndreiBesliu/cvs2#42`; ADR 0300 §5), unită în `1d3882d9`: pe nota unei freze șterse din „Frezele mele”, butonul o
  pune la loc din copia de pe rând (numele, T-ul, diametrul, forma, valorile de lucru, tăișul, pașii rândului), cu
  id-ul ei de dinainte; în cont reînvie prin sincronizarea de azi, iar fără capabilitatea `cloud` rămâne în browser.
  Nimic nou pe server: callable-ul `freze` primea deja scrierea peste semnul ștergerii. Otrăvurile 17 / 17 și, pe
  emulatoare, 3 / 3. **O alegere a owner-ului, cu recomandarea liniei aplicată:** dacă freza a fost pusă la loc
  între timp, în altă filă, butonul nu suprascrie nimic; biblioteca se citește din nou, iar nota se reface;
  alternativele: suprascrie freza din bibliotecă cu copia proiectului, sau pune una nouă, „(2)”. **10.4↑c-2** (linia
  cotelor, ramura `wip/10.4-cote`, `fd21591f`, PR-ul `AndreiBesliu/cvs2#43`; ADR 0330 §7, §10), unită în `66b6b335`:
  în Setări › Cotele › Exportul, „Cotele în DXF” (entități DIMENSION, implicit, sau linii și cifre, ca în c-1) și
  „Cifrele” (trăsături, implicit, sau text: MTEXT în DXF, `<text>` în SVG, Helvetica în PDF și EPS, fără font în
  fișier); cu felul de dinainte, fișierele ies octet cu octet ca în c-1; oracolul Python recitește fiecare DIMENSION
  și blocul ei; otrăvurile 53 / 53. **A doua alegere a owner-ului, tot cu recomandarea aplicată:** textul unei cote
  DIMENSION e cifra noastră, scrisă în cotă, deci arată la fel în orice program; alternativa: programul CAD măsoară
  singur. Documentul rămâne v28; nimic pe server. Ramurile aveau `main` `65eecdc6`; de atunci `main` primise doar
  3.Tu (pachetul extensiei), deci lotul și-a făcut completul lui. Ciocnirea, doar în DEVLOG. Porțile lotului, în CI,
  pe `66b6b335` (completul 45653662494, verde la prima trecere, 75 min): unit 10 529 / 0 (12 sărite, pe Linux), e2e
  863 / 863, funcțiile pe emulatoare 136 / 136, paginile 60 / 60; rapidul, verde pe `66b6b335`; completele
  liniilor, verzi (`f53ad4ff`: 45640803121; `fd21591f`: 45640765994); pornirea 111,2 kB (plafonul 125; cu ușa
  116,2, cu Atelierul 116,5), **totalul 896,5 / 1 000 kB**, `/admin` 138,3 / 200, contul 30,3 / 32. Pe test e
  `6741c0be` (lotul 35, din 19:39): tot ce era în `main` până acum; lotul acesta pleacă după unire (lotul 36).
  **Două probe ale frezelor sunt instabile**
  (`exportFrezeNota.spec.ts`, în `main` din 17:00, și `exportFrezeInapoi.spec.ts`: 4 căderi din 50, măsurate de
  linia exportului): în „Frezele mele”, Escape era ascultat doar pe fereastră și se pierdea când butonul apăsat se
  oprea sau dispărea sub focus; linia frezelor a reparat-o la cauză (16.A↑b-7, la porți). **Linia frezelor și linia
  cotelor n-au altă felie pornită.** La cuvântul owner-ului: 16.A↑d (calibrarea, după placa 4), e (bila și
  toroidala, cu relieful), f (profilul desenat), g (valorile pe material); 10.4↑d (lanțul și linia de bază,
  „Cotează selecția”, „Fă desen din cotă”, cotele în raportul foilor: ultima felie a cotelor). La linii, în lucru:
  relieful (18.1↑c, pe `unire-2511x`, cu completul unirii pornit), exportul (28.8↑h, reparația lui „Du-mă la …”, la
  porți), frezele (16.A↑b-7, la porți), atelierul (3.Cf, apoi decorațiunile de Crăciun). **La owner:** cele două
  alegeri de mai sus, 10.4↑d, feliile frezelor, Escape în celelalte șase ferestre cu același tipar (o felie mică,
  comună), de încercat „Modelul” din Easy 3Draw, proba pe mașină a centrului foii, cele patru întrebări din auditul
  elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor, verificarea juridică (GDPR) a
  utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, seara: **decorațiuni de Crăciun pentru imprimantă, pe lista liniei atelierului Easy 3Draw** („Vreau ca
  sesiunea care lucreaza la plugin, sa faca si decoratiuni de craciun pentru imprimanta. Pune-i asra pe lista”, în
  sesiunea principală). Sesiunea principală i-a scris liniei la 19:18: o felie nouă, după 3.Cf (în lucru), dacă
  owner-ul nu-i spune altă ordine în sesiunea ei; Crăciunul e aproape, deci nu rămâne după 3.Cg–3.Ci fără să fie
  întrebat. Linia pornește cu propunerea: un ADR scurt (0285, următorul liber din intervalul ei) și întrebările
  grupate, cu recomandarea în față: ce piese vin întâi (glob, fulg, stea, brăduț, ornament cu nume), unde stau în
  atelier, dacă se leagă de restul pieselor sau sunt de sine stătătoare, dacă textul intră din prima. Cerute din
  prima: tipărirea fără suport, agățătoarea, mărimile spuse în editor, probele pe plase ca la celelalte piese. Doar
  pachetul extensiei; nimic în aplicație, nimic pe server.
- 25.11.2026, seara (a treizeci și șasea unire din cloud): **piesele rotunde pe același ax în vederea „Modelul” a
  atelierului Easy 3Draw (3.Tu), unite în `main`** (sesiunea principală, ramura `unire-2511v`, din `65eecdc6`). Linia
  atelierului, ramura `wip/3.Xh-biblioteca-ui`, `70942c03`, PR-ul `AndreiBesliu/cvs2#45` (ADR 0283, acceptat de owner
  pe 25.11, în sesiunea liniei: „1a, 2a, 3a la 3.Tu, pornește”; propus pe 24.11 de linia elicelor, după observația
  lui că o carcasă și un rotor de același diametru nu se pot așeza centrat), unită în `f5cf10c8`: în „Modelul”, o
  piesă rotundă (roțile, elicele, rotorul și carcasa ventilatorului, cama, șurubul melc, roata cu palete, pinionul
  șenilei) stă cu axul în mijlocul unui știft și se rotește în jurul lui (1a); o piesă nouă, pusă cu alta aleasă,
  intră cu pivotul cât mai aproape de al ei, deci două rotunde stau pe același ax (2a); rotorul și carcasa în care
  încape stau la aceeași înălțime (3a). Așezarea e acum a motorului, ca funcții pure. **Easy 3Draw 18.33.0**
  (516,3 kB); otrăvurile 111 / 111 și 6 / 6. Doar pachetul extensiei se schimbă; nimic pe server; documentul rămâne
  v28. Ramura avea `main` `1fbb8ad9`; de atunci `main` primise 16.A↑b-4 și 3.Au (cod al aplicației, pe care ramura
  nu-l avea), deci unirea și-a făcut completul ei. Ciocnirile, doar în DEVLOG și în indexul liniilor (rândul
  atelierului, al liniei; al frezelor, din `main`). Porțile unirii, în CI, pe `f5cf10c8` (completul 45641768117,
  verde la prima trecere, 68 min): unit 10 513 / 0 (12 sărite, pe Linux), e2e 859 / 859, funcțiile pe emulatoare
  136 / 136, paginile 59 / 59; rapidul, verde pe `f5cf10c8`; completul liniei, verde pe `70942c03` (45627875691);
  pornirea 111,2 kB (plafonul 125; cu ușa 116,2, cu Atelierul 116,5), **totalul 891,8 / 1 000 kB**, `/admin`
  138,3 / 200. Pe test e `2aaee0b4` (lotul 33); lotul 34 (`65eecdc6`) e în drum: completul lui pe `main` e verde
  (45641891693), iar publicarea a pornit abia la a patra cerere (GitHub a răspuns la primele trei cu erori de server,
  500 și 502). 3.Tu pleacă cu lotul 35. La linii, în lucru: atelierul (3.Cf, pornită de owner în
  sesiunea liniei, cu răspunsurile lui la întrebările de proiectare: întâi alipirea la prinderi; prinderea se alege
  din puncte, în vederea 3D, cu lista alături; piesa alipită urmează baza, deci rămân legate; Easy 3Draw 18.34.0),
  frezele
  (16.A↑b-6), exportul (28.8↑h, reparația lui „Du-mă la …”), cotele (10.4↑c-2), relieful (18.1↑c, aducerea lui
  `main`). **La owner:** de încercat „Modelul” (carcasa și rotorul, o roată peste alta), proba pe mașină a centrului
  foii, cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB, arhivarea sesiunii elicelor,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la
  320 px la atingere.
- 25.11.2026, după-amiaza (a treizeci și cincea unire din cloud): **nota „s-a schimbat în bibliotecă” pe rândurile
  exportului (16.A↑b-4) și starea lucrării imprimantei, necunoscută până vine codul stării (3.Au), unite în `main`**,
  în lot (sesiunea principală, ramura `unire-2511t`, din `1fbb8ad9`). **16.A↑b-4** (linia frezelor, ramura
  `wip/16.A-freze-b4`, `48f27fcf`, PR-ul `AndreiBesliu/cvs2#37`; ADR 0300 §5; la „continua cu 16.A↑b-4” al
  owner-ului, spus în sesiunea liniei), unită în `9f18522e`: pe fiecare freză a unui rând din fereastra exportului,
  copia din proiect e comparată cu „Frezele mele”: schimbată acolo (cu ce diferă), cu „Ia valorile noi” pe rând și
  „Pe toate (N)”, T-ul și pașii rămânând ai rândului; ștearsă, „nu mai e în bibliotecă”; scrisă de mână, dar la fel
  cu una din bibliotecă, „Scrisă de mână (ca „…”)”. Otrăvurile 18 / 19 (una, practic echivalentă). Ramura avea `main`
  `2aaee0b4`; între raport și unire intrase 28.8↑o (centrul foii ca origine), care atinsese aceleași fișiere ale
  ferestrei: s-au unit singure, fără ciocnire, dar arborele nu mai era cel verificat de linie, deci unirea și-a făcut
  completul ei. **Primul complet al unirii (45613398666, pe `9f18522e`) a căzut la o singură probă, fără legătură
  cu felia:** utilizarea imprimantei de pe emulatoare (A.8d) a primit un „pornită” în plus, deși imprimanta era
  găsită imprimând (restul, verde: unit 10 503 / 0, e2e 854 / 854, funcțiile 136 / 136, paginile 58 din 59). Cauza, la
  rădăcină: starea imprimantei vine pe bucăți, iar la legare o bucată doar cu progresul putea ajunge înaintea stării
  întregi; `stareLucrare` spunea atunci „liberă”, deși nu știa nimic despre lucrare, iar lucrarea găsită în curs
  părea pornită de aici. Nu e doar proba: se poate întâmpla și pe K1C. **3.Au** (`307d4f9a`, scrisă de sesiunea
  principală, linia imprimantei neavând felie în lucru): fără codul stării, starea lucrării e „necunoscută”, orice
  altceva ar fi sosit; probele au fost scrise întâi (tabelul stării, cadrele driverului, lanțul până la evenimentele
  utilizării, cu martor), iar proba de pe emulatoare forțează acum ordinea rea la fiecare rulare (`bucataIntaiMs` în
  imprimanta falsă): fără reparație cade de 3 ori din 3, cu ea trece de 5 ori din 5; otrăvurile 7 / 7. Documentul
  rămâne v28; nimic pe server. Porțile lotului, în CI, pe `307d4f9a` (completul 45626620796, verde, 73 min): unit
  10 505 / 0 (12 sărite, pe Linux), e2e 854 / 854, funcțiile pe emulatoare 136 / 136, paginile 59 / 59; rapidul,
  verde pe vârful ramurii; completul liniei frezelor, verde pe `6d270a5e` (45603736389: același cod ca `48f27fcf`);
  pornirea 111,2 kB (plafonul 125; cu ușa 116,2, cu Atelierul 116,5), **totalul 891,8 / 1 000 kB**, `/admin`
  138,3 / 200, contul 30,3 / 32. Pe test e `2aaee0b4` (lotul 33, din 14:24); centrul foii (28.8↑o) și lotul acesta
  pleacă acum, într-o singură publicare (lotul 34). **Relieful (18.1↑c, finisarea, cu v29) a raportat, dar nu e
  unit:** peste `main`-ul cu 16.A↑b-4, o bilă
  din bibliotecă ar arăta în fereastra exportului ca o freză plată de același diametru (lista dată notei bibliotecii
  îi pierde forma); linia aduce `main`, rezolvă cu proba întâi și raportează din nou, cu un caz al finisării din
  centrul foii. **Și 28.8↑h (desenele ferestrei exportului, socotite cu funcțiile lucrării; `2ecd0054`) a raportat,
  dar nu e unită:** peste 16.A↑b-4 (unirea de probă `unire-2511u`, completul 45629718056), proba ei nouă cade de
  fiecare dată: „Du-mă la …” aduce doar capul fișei sus, iar cu „Scrisă de mână (ca „…”)” în listă rândul frezei se
  rupe pe două și greșeala iese din panou (măsurat: panoul 71–596 px, greșeala 651–696); pe ramura liniei trecea la
  limită, cu vreo 4 px. Linia repară la cauză, cu proba întâi, și raportează din nou. La linii, în lucru: frezele
  (16.A↑b-6, „Pune-o înapoi în bibliotecă”, scrisă, cu porțile verzi pe ramura ei), exportul (28.8↑h, reparația),
  cotele (10.4↑c-2), relieful (18.1↑c, aducerea lui `main`), atelierul (3.Tu). **La owner:** proba
  pe mașină a centrului foii, cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB,
  arhivarea sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește
  în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, după-amiaza (a treizeci și patra unire din cloud): **centrul foii ca origine XY0 (28.8↑o), unit în
  `main`** (sesiunea principală, ramura `unire-2511s`, din `2a46e973`). Linia exportului, ramura `wip/28.8-export`,
  `cd1859f0`, PR-ul `AndreiBesliu/cvs2#38` (ADR 0291 §6, răspunsul 6a al owner-ului), unită în `3fd3bf49`: în
  fereastra exportului, „centrul foii” e a cincea origine XY0, aleasă din listă sau din punctul din mijlocul
  desenului; montajul e o translație cu jumătatea foii pe fiecare axă (`src/ir/montaj.ts`), antetul scrie „origine
  centru”, senderul îl citește, panoul Mașina și raportul foilor o spun, iar numele propus e `cncvs2-centru`.
  **Mișcă mașina**, deci e probată pe oracole și pe emulator: colțurile ies octet cu octet ca înainte; pe corpusul
  CAM, X / Y din centru = X / Y din colț + deplasarea, rând cu rând; poarta și oracolul buzunarului dau aceleași
  verdicte, cu martori; programul trece prin emulatorul GRBL; otrăvurile 13 / 13. **Proba pe mașină rămâne a
  owner-ului** (zero-ul în mijlocul foii, întâi în aer); pe live ajunge doar cu confirmarea lui, ca tot restul.
  Documentul rămâne v28; nimic pe server. Unirea, fără nicio ciocnire; ramura avea `main` `2aaee0b4`, iar de atunci
  `main` a primit doar documente, deci **arborele unirii are exact codul lui `cd1859f0`** (`git diff` gol în afara
  fișierelor `.md`) și a intrat pe porțile lui, fără alt complet: completul 45603551874, verde (unit 10 499 / 0,
  12 sărite pe Linux; e2e 851 / 851; funcțiile pe emulatoare 136 / 136; paginile 59 / 59); rapidul, verde pe
  `cd1859f0`; pornirea 111,2 kB (plafonul 125; cu ușa 116,2, cu Atelierul 116,5), **totalul 890,3 / 1 000 kB**
  (+0,2), `/admin` 138,3 / 200. Pe test e `dad1a711` (lotul 32); lotul 33 (`2aaee0b4`) e în drum, iar 28.8↑o pleacă
  cu lotul 34. **Tot azi, în sesiunea liniei atelierului, owner-ul a răspuns la cele trei întrebări ale lui 3.Tu
  și a pornit-o: „1a, 2a, 3a la 3.Tu, pornește”** (piesele rotunde pe același ax în vederea „Modelul”, ADR 0283;
  Easy 3Draw 18.33.0). La linii, în lucru: exportul (28.8↑h, desenele ferestrei), frezele (16.A↑b-4 de raportat,
  apoi 16.A↑b-6), cotele (10.4↑c-2), relieful (18.1↑c, cu v29), atelierul (3.Tu). **La owner:** proba pe mașină a
  centrului foii, cele patru întrebări din auditul elicelor, pachetul Easy 3Draw trecut de 0,5 MB (pragul din ADR
  0284), arhivarea sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine
  unește în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, după-amiaza: **10.4↑c-2 și 16.A↑b-6, pornite** („ok, porneste 10.4↑c-2 si 16.A↑b-6”, în sesiunea
  principală, la raportul unirii a treizeci și treia, care le punea la cuvântul owner-ului). Sesiunea principală
  le-a scris celor două linii la 14:16. **10.4↑c-2** (linia cotelor; ADR 0330 §10): cotele ca entități DIMENSION în
  DXF și cifrele ca text, peste c-1; cu felul de azi ales (linii și trăsături), fișierele rămân octet cu octet;
  oracolul Python al cotelor primește DIMENSION-ul pe hârtie. **16.A↑b-6** (linia frezelor; ADR 0300 §5): „Pune-o
  înapoi în bibliotecă”, adică scrierea unei freze în bibliotecă din fereastra exportului, cu contul; vine după
  16.A↑b-4 (nota „s-a schimbat în bibliotecă”, gata pe ramura ei, de raportat întâi) și, dacă se poate, fără nimic
  nou pe server. Amândouă: documentul rămâne v28 (un câmp nou ar cere întâi numărul, de la sesiunea principală; v29
  e al reliefului), proba întâi, creșterea de mărime spusă în raport, un singur commit raportat, cu porțile verzi;
  unirea, la raport. O alegere care e a owner-ului se pune grupat, cu recomandarea în față, iar linia merge înainte
  cu recomandarea.
- 25.11.2026, după-amiaza (a treizeci și treia unire din cloud): **frezele în plus ale rândului din „Frezele mele”
  (16.A↑b-5), cadrul și șurubul melc din atelierul Easy 3Draw (3.Cj-3, 3.Cj-4) și numele fișierului în fereastra
  exportului (28.8↑n), unite în `main`**, în lot (sesiunea principală, ramura `unire-2511q`, din `f8be3b4d`).
  **16.A↑b-5** (linia frezelor, ramura `wip/16.A-freze`, `b7660e94`, PR-ul `AndreiBesliu/cvs2#31`; ADR 0300 §4;
  pornită la „vreau sa pornesti si celelalte sub-sesiuni” al owner-ului), unită în `03e64d33`: lista „Din frezele
  mele” și pe frezele în plus ale unui rând din fereastra exportului: fundul plat, fiecare freză de rest (doar cele
  mai mici decât freza dinainte), prima freză a dopului drept și freza decupării benzii, doar cu frezele plate;
  aleasă, freza își ia T-ul (regula rolurilor, printre toate frezele ferestrei), Ø-ul, pasul lateral și originea, pe
  care Exportă o scrie; frezele de rest stau într-un tabel cu capul coloanelor (constatarea 9 a auditului
  exportului); otrăvurile 33 / 33, iar ale lui 16.A↑b-3, mutate pe codul nou, 10 / 10. **3.Cj-3 și 3.Cj-4** (linia
  atelierului, ramura `wip/3.Xh-biblioteca-ui`, `b099c457`, PR-ul `AndreiBesliu/cvs2#33`; ADR 0284), unite în
  `36559b49`: tipul `cadru`, în fila Cărămizi (o cărămidă 1 × n cu un gol prin ea: fereastră, ușă, portal; Easy
  3Draw 18.31.0; otrăvurile 84 / 84), și tipul `melc`, în fila Roți (un șurub pe ax care întoarce orice roată
  dreaptă de aici, cu axele în cruce; **Easy 3Draw 18.32.0**; otrăvurile 102 / 102); cu ele, 3.Cj e încheiată.
  **28.8↑n** (linia exportului, ramura `wip/28.8-export`, `7996e77c`, PR-ul `AndreiBesliu/cvs2#38`; ADR 0291,
  răspunsul 5a al owner-ului), unită în `1eda6f0b`: în „Mașina și fișierul”, câmpul „Numele fișierului”, propus din
  numele foii și de schimbat înaintea exportului; fișierele pe freză, ale dopurilor și arhiva foilor îl iau în față;
  un nume gol, prea lung, cu caractere oprite sau rezervat de Windows oprește exportul, cu „Du-mă la …”; programul,
  aceiași octeți; otrăvurile 16 / 16. Documentul rămâne v28; nimic pe server. Lotul fusese pregătit întâi pe
  `unire-2511o` (atelierul și exportul); cotele au intrat între timp în `main`, iar frezele au raportat, deci a fost
  refăcut peste `f8be3b4d`, cu toate trei. Ciocnirea, doar `src/app/catalogControale.ts`, scris din nou (652 de
  nume); `DialogExport.tsx`, `exportRand.ts`, `exportGrupuri.ts` și `ExportConectat.tsx`, atinse și de freze, și de
  export, s-au unit singure. Cu lotul au intrat și documentele îndreptate ale liniei cotelor (`5273cb0b`, doar text).
  Porțile lotului, în CI, pe `1eda6f0b` (completul 45594256202, verde la prima trecere, 54 min): unit 10 494 / 0
  (12 sărite, pe Linux), e2e 849 / 849, funcțiile pe emulatoare 136 / 136, paginile 59 / 59; rapidul, verde pe
  `9ccded2b` (lotul, cu documentele cotelor); completele liniilor, verzi (`b7660e94`: 45581826591; `b099c457`:
  45588129048; `7996e77c`: 45588329433); pornirea 111,2 kB (plafonul 125; cu ușa 116,2, cu Atelierul 116,5),
  **totalul 890,1 / 1 000 kB**, `/admin` 138,3 / 200; pachetul Easy 3Draw, 514,4 kB. Pe test e `dad1a711` (lotul 32,
  din 12:31); cotele (10.4↑c-1) și lotul acesta pleacă acum, într-o singură publicare (lotul 33). La linii: frezele
  (16.A↑b-4, nota „s-a schimbat în bibliotecă”, gata pe ramura ei: aduce `main` și raportează), exportul (28.8↑o,
  centrul foii ca origine XY0, gata pe ramură, cu completul în lucru: mișcă mașina, deci proba pe mașină rămâne a
  owner-ului; **28.8↑h poate porni**, cu 16.A↑b-5 în `main`), relieful (18.1↑c, cu v29), atelierul (fără felie: 3.Tu
  și 3.Cf–3.Ci așteaptă răspunsurile owner-ului). **La owner:** 10.4↑c-2 (cotele ca DIMENSION, cifrele ca text),
  16.A↑b-6 („Pune-o înapoi în bibliotecă”, din fereastra exportului), cele patru întrebări din auditul elicelor și
  cele trei ale lui 3.Tu, pachetul Easy 3Draw trecut de 0,5 MB (pragul din ADR 0284), arhivarea sesiunii elicelor,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la
  320 px la atingere.
- 25.11.2026, la prânz (a treizeci și doua unire din cloud): **cotele în exportul vectorilor (10.4↑c-1), unite în
  `main`** (sesiunea principală, ramura `unire-2511p`, din `19f0b386`). Linia cotelor, ramura `wip/10.4-cote`,
  `d8e69780`, PR-ul `AndreiBesliu/cvs2#32` (ADR 0330 §6, §7; pornită la „vreau sa pornesti si celelalte sub-sesiuni”
  al owner-ului), unită în `f2f6fc57`: în „Exportă vectori”, pe o foaie cu cote, bifa „Cu cotele (N)” (oprită
  implicit, după Setări › Cotele › Exportul); cu ea, cotele intră în DXF, SVG, PDF și EPS, pe stratul lor (numele,
  culoarea și grosimea, din Setări): liniile, arcul unghiului exact, săgețile pline ca triunghiuri umplute (SOLID în
  DXF), punctele ca discuri, cifrele ca trăsăturile lui Relief SingleLine. Fără cote sau fără bifă, fișierele ies
  octet cu octet ca înainte. Felia c s-a împărțit: c-2 (DIMENSION în DXF și cifrele ca text) vine la cuvântul
  owner-ului. Oracolul independent e Python (`test/oracles-py/export2d_cote.py`, pas nou în jobul `oracol-export2d`
  al rapidului: în DXF, cele 181 de segmente de pe hârtie, exact; PDF, SVG și EPS, în toleranță); otrăvurile 41 / 44
  (trei unitare, practic echivalente). Documentul rămâne v28; nimic pe server. Ciocnirea, doar în DEVLOG (ambele
  părți păstrate). `main` adusese peste ramură doar documente și rândul lui ADR 0291 din traducerile roadmap-ului,
  deci **arborele unirii are codul lui `d8e69780`** (`git diff` arată, în afara fișierelor `.md`, doar
  `docs/traduceri/roadmap.en.json`, verificat local: 1 118 texte, niciunul fără traducere; tipurile, regulile de
  import, catalogul controalelor și probele documentelor, verzi) și a intrat pe porțile lui, fără alt complet:
  completul 45584185001, verde (unit 10 469 / 0, 12 sărite pe Linux; e2e 836 / 836; funcțiile pe emulatoare
  136 / 136; paginile 59 / 59); rapidul, verde pe `d8e69780`; pornirea 111,2 kB (plafonul 125; cu ușa 116,1, cu
  Atelierul 116,5), **totalul 888,1 / 1 000 kB** (+3,3), `/admin` 138,3 / 200. Pe test e `d1a96fc4` (lotul 31);
  lotul 32 (`dad1a711`, relieful în vederea 3D) e în drum: completul lui pe `main` rula la unire. Cotele pleacă spre
  test cu lotul următor, pregătit pe `unire-2511o`: atelierul Easy 3Draw (3.Cj-3, cadrul, și 3.Cj-4, șurubul melc,
  18.32.0) și 28.8↑n (numele fișierului în fereastra exportului), care își refac porțile peste `main`-ul acesta. La
  linii, în lucru: frezele (16.A↑b-5), relieful (18.1↑c, cu v29), exportul (28.8↑o), atelierul. **La owner:**
  10.4↑c-2 (DIMENSION și cifrele ca text), cele patru întrebări din auditul elicelor și cele trei ale lui 3.Tu,
  arhivarea sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește
  în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, înainte de prânz: **fereastra exportului după audit, ADR 0291 acceptat** (owner-ul, în sesiunea liniei
  exportului, la cele nouă întrebări ale auditului: „1a, 2a, 3a, 4a, 5a, 6a, 7a, 8a, 9a”). ADR-ul (scris de linie, `5966da75`,
  PR-ul `AndreiBesliu/cvs2#36`, doar documente), unit în `b826abe9`. **Ce a hotărât:**
  1. ordinea: 28.8↑h (desenele și notele ferestrei, socotite de stratul de acțiuni cu funcțiile lucrării: repară cele
     două desene care nu spun ce taie programul), apoi 28.8↑i (viteza: doar fișa văzută randată), apoi j–l, **toate
     după ce 16.A↑b-5 e în `main`** (linia frezelor lucrează în aceeași fișă);
  2. conflictul T la o freză schimbată: butonul „Dă-i T{n}”, cu regula de azi (`numarPentruRand`);
  3. avansul, turația și plonjarea pe „Scrisă de mână” (trei câmpuri în grupul Freza, scrise în `regim`, fără schemă
     nouă); Z-ul sigur și parcarea, în „Mașina și fișierul” (28.8↑p, a liniei exportului, cu linia frezelor anunțată);
  4. avertismentul vitezei maxime, doar față de `$$`-ul lipit; până atunci, o notă;
  5. numele fișierului, în „Mașina și fișierul”, de schimbat înaintea exportului (28.8↑n);
  6. centrul foii ca a cincea origine XY0 (28.8↑o: atinge montajul, antetul citit de sender și ghidul zeroului, deci
     mișcă mașina și se probează pe oracole și pe emulator; colțurile de azi rămân octet cu octet);
  7. „Toate foile” cu operațiile fiecărei foi (28.8↑q, după i);
  8. „Trimite la mașină” în Atelier ca un pas scurt, cu „Arată tot” (a liniei aranjamentelor; fereastra îi dă
     bucățile în 28.8↑m);
  9. adaosul lateral, trecerea de finisare pe profil și punctul de start: o felie de CAM după placa 2, cu document
     nou (v30 sau numărul liber de atunci; v29 e al reliefului), pe linia pe care o alege sesiunea principală.

  28.8↑n și 28.8↑o nu ating fișa operației, deci linia le poate lucra cât frezele sunt în b-5 (întâi n). Programul de
  azi rămâne octet cu octet la toate feliile. Constatarea 9 (frezele de rest fără etichete) e a liniei frezelor;
  constatarea 14 (numele elementelor cu punct zecimal în română, `src/app/descriereElement.ts`) e a sesiunii
  principale. **Sesiunea exportului nu se mai arhivează acum:** linia are din nou felii.
- 25.11.2026, înainte de prânz (a treizeci și una unire din cloud): **relieful: modelul în vederea 3D (18.1↑b), unit
  în `main`** (sesiunea principală, ramura `unire-2511l`, din `43cf59af`). Linia reliefului, ramura `wip/18.1-relief`,
  `04e7cd2f` (codul lui `3214f4da`, plus documente), PR-ul `AndreiBesliu/cvs2#30` (ADR 0310 §4, §7; pornită la „vreau
  sa pornesti si celelalte sub-sesiuni” al owner-ului), unită în `ef883ac1`: pe o foaie cu reliefuri, vederea 3D are
  comutatorul „Modelul / Tăiat” și pornește pe model, fără simulare; fiecare relief stă în golul lui din placă, cu
  vârful la fața plăcii; compusul se calculează dală cu dală în workerul reliefului, redus ca desenul de pe planșă;
  vederea urmează documentul (o mutare nu încarcă nimic, un relief schimbat urcă doar dalele schimbate); stările:
  se încarcă, gata, straturile lipsă din browser. În felie e și cazul reliefului în proba lipirii cotelor, cerut de
  linia cotelor. Documentul rămâne v28; nimic pe server; otrăvurile 22 / 22. Unirea, fără nicio ciocnire; `main`
  adusese peste ramură doar documente, deci **arborele unirii are exact codul lui `3214f4da`** (`git diff` gol în
  afara fișierelor `.md`) și a intrat pe porțile lui, fără alt complet: completul 45572436393, verde (unit
  10 452 / 0, 12 sărite pe Linux; e2e 833 / 833; funcțiile pe emulatoare 136 / 136; paginile 59 / 59); rapidul,
  verde pe `3214f4da` și pe `04e7cd2f`; pornirea 111,1 kB (plafonul 125; cu ușa 116,1, cu Atelierul 116,4), **totalul
  884,8 / 1 000 kB** (+3,9), `/admin` 138,3 / 200. Pe test e `d1a96fc4` (lotul 31, din 10:44); lotul acesta pleacă
  acum, cu plafoanele noi. Auditurile cerute de owner sunt amândouă în `main` (`docs/linii/audit-elice.md`,
  `docs/linii/audit-export.md`). La linii, în lucru: frezele (16.A↑b-5), cotele (10.4↑c), atelierul (restul lui 3.Cj),
  relieful (18.1↑c, după ce stabilește cu frezele bila în document, v29). **La owner:** feliile din cele două audituri
  (întrebările lor; reparația desenelor exportului, 28.8↑h, recomandată după 16.A↑b-5), cele trei întrebări ale lui
  3.Tu, arhivarea sesiunii elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine
  unește în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, dimineața: **auditul complet al ferestrei exportului și al elicelor, înaintea arhivării sesiunilor lor**
  (owner-ul, în sesiunea principală, la „pot arhiva sesiunile exportului si elicelor?” și la răspunsul că da:
  „vreau sa le intrebi ce pot imbunatati in zona in care au lucrat? dar, defapt, pune-le sa faca un audit complet in acest sens”). Sesiunea principală le-a scris celor două sesiuni (10:19): fiecare
  își auditează zona pe `main` de acum (`caddd661`), cu aplicația construită parcursă cu Playwright, nu doar cu codul
  citit: **exportul**, fereastra „Exportă G-code” (ADR 0290: claritatea, stările de lângă drumul bun, tastatura,
  viteza, ce lipsește față de prag, sănătatea codului, cât e de gata fișa pentru Clasic și Pas cu pas); **elicele**,
  fila „Elice” a atelierului Easy 3Draw (ADR 0282: dacă piesele ies bune de tipărit și se prind cum spun, claritatea
  editorului, ce lipsește ca funcție, plasele, probele, cum stau în „Se prinde cu”). **Doar audit:** fără cod de
  produs (linia frezelor lucrează în fișa operației, iar a atelierului în sursele extensiei), fără agenți sau
  workflow-uri; o greșeală care atinge programul scris sau o piesă stricată se spune imediat, nu la raport. Predau
  `docs/linii/audit-export.md` și `docs/linii/audit-elice.md` (constatările, cele mai importante întâi, cu dovada și
  costul; feliile propuse; întrebările grupate, cu recomandarea în față), plus raportul scurt pentru owner, în
  sesiunea lor; documentele le unește sesiunea principală. **Nicio felie nu pornește din audit fără cuvântul
  owner-ului;** sesiunile se arhivează după ce rapoartele sunt în `main`.
- 25.11.2026, dimineața: **plafoanele: totalul 1 000 kB, pornirea 125 kB** („ok, ridica plafonul total la 1000 kB si pornirea la 125 kB”, în sesiunea
  principală, după raportul unirii a treizecea, care recomanda aceste valori: frezele, relieful și cotele, repornite
  în aceeași dimineață, lucrau toate în același rest, 19,1 kB din total și 3,6 kB din pornire, iar felia trecută a
  reliefului ceruse singură 12,7 kB). ADR 0146 (scris de sesiunea principală, pe `unire-2511g`, peste `d1a96fc4`);
  constantele porții din `scripts/build-determinist.ts`. Sub plafonul pornirii stau, ca până acum, toate trei
  măsurile (pornirea, cu ușa, cu ușa și cu aranjamentul ales): acum rămân 8,6 kB; în total, 119,1 kB. Costul, la
  750 kbit/s: cel mult ~1,3 s în plus la prima instalare, în fundal, și ~92 ms înaintea primei randări, la prima
  vizită. **Regulile feliilor nu se schimbă** (la cerere ce nu trebuie la prima randare, workerul pentru calculul greu,
  creșterea spusă în raport). Ușa (8 kB), `/admin` (200 kB) și contul (32 kB) rămân. O creștere următoare cere iar
  decizia scrisă. Liniile în lucru (frezele, relieful, cotele, atelierul) au fost anunțate.
- 25.11.2026, dimineața (a treizecea unire din cloud): **atelierul Easy 3Draw: cama (3.Cj-1) și roata cu palete
  (3.Cj-2), unite în `main`** (sesiunea principală, ramura `unire-2511f`, din `341b3472`). Linia atelierului, ramura
  `wip/3.Xh-biblioteca-ui`, `ae490539`, PR-ul `AndreiBesliu/cvs2#29` (ADR 0284), unite în `e90edd2e`: **3.Cj-1**,
  tipul `cama`, în fila Roți: un disc pe ax care face din rotire un du-te-vino, în trei forme (excentric, pară, melc)
  (Easy 3Draw 18.29.0; otrăvurile 59 / 59); **3.Cj-2**, tipul `roataPalete`, în fila Elice: butucul roților, paletele
  drepte sau curbate până la diametrul cerut, discul la alegere (**Easy 3Draw 18.30.0**; otrăvurile 101 / 101, 97 la
  prima rulare). Proba roții, scrisă întâi, numără paletele pe plasă și a găsit paleta curbată ocolind butucul roților
  mici (8 în loc de 4): reparat de linie. Doar pachetul extensiei se schimbă; nimic pe server; documentul rămâne v28.
  Ciocnirea, doar rândul liniei din indexul liniilor (al ei, pentru atelier; ale lui `main`, pentru freze, relief și
  cote). **Arborele unirii are exact codul lui `ae490539`** (`git diff` gol în afara fișierelor `.md`), deci lotul a
  intrat pe porțile lui, fără alt complet: completul 45539424272, verde (unit 10 445 / 0, 12 sărite pe Linux; e2e
  830 / 830; funcțiile pe emulatoare 136 / 136; paginile 59 / 59), rapidul 45539418314, verde; aplicația,
  neschimbată: pornirea 111,1 kB (plafonul 120; cu ușa 116,1, cu Atelierul 116,4), totalul 880,9 / 900 kB, `/admin`
  138,3 / 200; pachetul Easy 3Draw, 508,4 kB. Pe test e `f2678300` (lotul 30); lotul acesta pleacă acum. La linii, în
  lucru: atelierul (restul lui 3.Cj: cadrul, apoi melcul; 3.Tu, la răspunsurile owner-ului), frezele (16.A↑b-5),
  relieful (18.1↑b), cotele (10.4↑c). **La owner:** plafoanele (totalul, 19,1 kB; pornirea, 3,6 kB; trei linii
  lucrează în același rest), cele trei întrebări ale lui 3.Tu, arhivarea sesiunilor exportului și elicelor,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la
  320 px la atingere.
- 25.11.2026, dimineața: **liniile, repornite după resetarea limitei săptămânale** (owner-ul, în sesiunea
  principală: „am resetat limita saptamanale. azi este miercuri.” și „vreau sa pornesti si celelalte sub-sesiuni”). Sesiunea principală le-a scris celor patru sesiuni de linie
  care aveau de lucru (09:32): **atelierul** (ultima tură se oprise cu eroare: reia 3.Cj-1, cama, și 3.Cj-2, roata cu
  palete), **frezele** (16.A↑b-5, apoi b-4), **relieful** (18.1↑b, modelul reliefului în vederea 3D) și **cotele**
  (10.4↑c, exportul cotelor). Relieful și cotele își așteptau felia „la cuvântul owner-ului”: mesajul lui de azi e
  acel cuvânt. 3.Tu rămâne la răspunsurile lui la cele trei întrebări. Nepornite, fiindcă n-au sesiune în cloud sau
  n-au nimic de făcut: exportul și elicele (încheiate, de arhivat), sesiunea designului („Variante design CVS2”, pe
  calculatorul owner-ului, cu întrebarea ei despre felia zoomului). **Mărimea:** trei linii lucrează acum în același
  rest (totalul, 19,1 kB din 900; pornirea cu ușa și cu Atelierul, 3,6 kB din 120): fiecare își spune în raport cât
  adaugă, unirea merge în ordinea rapoartelor, iar o felie care nu mai încape se oprește și scrie sesiunii principale;
  plafoanele rămân decizia owner-ului (recomandarea: totalul 1 000 kB, pornirea 125 kB). **Lotul 30 (3.Ce) e pe test
  din 25.11, 06:03** (`f2678300`; completul pe `main` 45536382490, verde: unit 10 431 / 0, 12 sărite pe Linux; e2e
  824 / 824; funcțiile pe emulatoare 136 / 136; paginile 59 / 59; proba de fum, bună): pe test e tot ce e în `main`.
- 25.11.2026, spre dimineață (a douăzeci și noua unire din cloud): **atelierul Easy 3Draw: punctele de prindere și
  „Se prinde cu” (3.Ce), unite în `main`** (sesiunea principală, ramura `unire-2511d`, din `188c2bb6`). Linia
  atelierului, ramura `wip/3.Xh-biblioteca-ui`, `980f239c`, PR-ul `AndreiBesliu/cvs2#28` (ADR 0284), unită în
  `38ff9391`: fiecare piesă a motorului își spune prinderile odată cu plasa (unsprezece feluri, de la știft și locaș
  la bilă și cupă; `prinderi` e câmp obligatoriu al tipului `Corp`), `Lego.montaj` duce o prindere peste perechea ei
  (baza alipirii din Model, felia 3.Cg), iar configuratorul are, sub butoanele piesei, panoul „Se prinde cu”: ce are
  piesa și piesele atelierului care se potrivesc, cu axul și știftul deschise de lungimea bună. **Easy 3Draw
  18.28.0**; otrăvurile 144 / 144. Doar pachetul extensiei se schimbă; nimic pe server; documentul rămâne v28. Unirea
  s-a făcut fără nicio ciocnire, iar **arborele ei are exact codul lui `980f239c`** (`git diff` gol în afara
  fișierelor `.md`), deci lotul a intrat pe porțile lui, fără alt complet: completul 45528368086, verde (unit
  10 431 / 0, 12 sărite pe Linux; e2e 824 / 824; funcțiile pe emulatoare 136 / 136; paginile 59 / 59), rapidul
  45528368429, verde; aplicația, neschimbată: pornirea 111,1 kB (plafonul 120; cu ușa 116,1, cu Atelierul 116,4),
  totalul 880,9 / 900 kB, `/admin` 138,3 / 200, contul 30,3 / 32; pachetul Easy 3Draw, 501,6 kB. **Lotul 29
  (cremaliera și arcul) e pe test din 25.11, 03:47** (`a95af70e`; completul pe `main` 45518951805, verde; proba de
  fum, bună); lotul acesta pleacă acum. La linii: atelierul (3.Cj-1, cama, și 3.Cj-2, roata cu palete, gata sau în
  lucru la linie, neîmpinse; 3.Tu, la răspunsurile owner-ului), frezele (16.A↑b-5, apoi b-4); la cuvântul owner-ului:
  cotele (10.4↑c, exportul), relieful (18.1↑b). **La owner:** plafoanele (totalul, 19,1 kB; pornirea, 3,6 kB), cele
  trei întrebări ale lui 3.Tu, arhivarea sesiunilor exportului și elicelor, verificarea juridică (GDPR) a utilizării
  aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la atingere.
- 25.11.2026, noaptea (a douăzeci și opta unire din cloud): **atelierul Easy 3Draw: cremaliera (3.Cc) și arcul (3.Cd),
  unite în `main`** (sesiunea principală, ramura `unire-2511b`, din `ac0d130e`). Linia atelierului, ramura
  `wip/3.Xh-biblioteca-ui`, `d0490719`, PR-ul `AndreiBesliu/cvs2#24` (ADR 0284), unite în `9815527f`: **3.Cc**, tipul
  `cremaliera`, în fila Roți, cu dinții roților de aici, pe știfturi sau cu găuri de știft, înaltă după roata
  pereche, cu „Fă perechea” (Easy 3Draw 18.26.0; otrăvurile 72 / 72); **3.Cd**, tipul `arc`, în fila Cărămizi, o
  cărămidă 1 × n cu boltă dedesubt și știfturi pe toată lungimea (**Easy 3Draw 18.27.0**; otrăvurile 58 / 58). Față
  de ADR 0284, scris în el: melcul a trecut în 3.Cj, iar balamaua și placa turnantă într-o felie nouă, 3.Ck. Cu ele,
  o probă a bibliotecii reparată (doar proba): `extensii.descoperire.spec.ts` căuta pe nume rândul de „ce e nou” al
  lui 18.21.0, ieșit din catalog la a cincea versiune de după el; de aceea primul complet al liniei (pe `e8c9fd15`)
  căzuse la o probă din 817. Doar pachetul extensiei se schimbă; nimic pe server; documentul rămâne v28. Ciocnirea,
  doar rândul liniei din indexul liniilor. **Arborele unirii are exact codul lui `d0490719`** (`git diff` gol în
  afara fișierelor `.md`), deci lotul a intrat pe porțile lui, fără alt complet: completul 45509529789, verde (unit
  10 428 / 0, 12 sărite pe Linux; e2e 817 / 817; funcțiile pe emulatoare 136 / 136; paginile 59 / 59), rapidul,
  verde; aplicația, neschimbată: pornirea 111,1 kB (plafonul 120; cu ușa 116,1, cu Atelierul 116,4), totalul
  880,9 / 900 kB, `/admin` 138,3 / 200, contul 30,3 / 32; pachetul Easy 3Draw, 491,3 kB. **Tot ce era în `main`
  înaintea lotului e pe test din 25.11, 01:37** (`694f0ff1`; proba de fum, bună); lotul acesta pleacă acum. La
  linii: atelierul (3.Ce, punctele de prindere și „Se prinde cu”, în lucru; 3.Tu, la răspunsurile owner-ului),
  frezele (16.A↑b-5, apoi b-4); la cuvântul owner-ului: cotele (10.4↑c, exportul), relieful (18.1↑b). **La owner:**
  plafoanele (totalul, 19,1 kB; pornirea, 3,6 kB), cele trei întrebări ale lui 3.Tu, arhivarea sesiunilor exportului
  și elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”,
  meniul de sus la 320 px la atingere.
- 25.11.2026, după miezul nopții (a douăzeci și șaptea unire din cloud): **atelierul Easy 3Draw: conectorul perpendicular (3.Ca) și
  conectorul în unghi, axul cu opritor, știftul cu bucșă (3.Cb), unite în `main`**, în lot (sesiunea principală,
  ramura `unire-2411ad`). Linia atelierului (sesiunea extensiilor), ramura `wip/3.Xh-biblioteca-ui`, `7157ecc5`,
  PR-ul `AndreiBesliu/cvs2#24` (ADR 0284, acceptat de owner cu 1a–4a, în sesiunea liniei), unite în `11877a3e`:
  în fila Legături, tipul `conector` (un bloc de 1–5 pași, cu găuri de știft sau de ax pe trei axe) și tipul
  `conectorUnghi` (un butuc cu 1–4 brațe, la cel puțin 90° unul de altul); axul cu opritor la un capăt; știftul cu
  capătul „Bucșă”; toate se tipăresc culcate, fără suport. **Easy 3Draw 18.25.0** (3.Ca fusese 18.24.0), cu
  rândurile de „ce e nou”; otrăvurile 47 / 47 și 76 / 76. Doar pachetul extensiei se schimbă: pornirea și totalul
  aplicației, neatinse; nimic pe server; documentul rămâne v28. Ciocnirea, doar rândul liniei din indexul liniilor
  (păstrat al ei). Lotul fusese pregătit peste `893e45bb`; după ce cotele au intrat în `main` (`393a59f5`), `main` a
  fost adus în ramura lotului (fără ciocniri), iar completul, repornit. Porțile lotului, în CI, pe `f08a47af`
  (completul 45492795451, verde la prima trecere, 53 min): unit 10 412 / 0 (12 sărite, pe Linux), e2e 810 / 810,
  funcțiile pe emulatoare 136 / 136, paginile 59 / 59; rapidul, verde pe `f08a47af`; completul liniei, verde pe
  `7157ecc5` (45490190749); și completul dinaintea cotelor, pe `11877a3e`, verde. Mărimea aplicației, cu cotele, din
  porțile lotului: pornirea 111,1 kB (plafonul 120; cu ușa 116,1, cu Atelierul 116,4: mai sunt 3,6 kB), totalul
  880,9 / 900 kB (mai sunt 19,1 kB), `/admin` 138,3 / 200, contul 30,3 / 32; pachetul Easy 3Draw, 485,4 kB.
  **Loturile 23–27 sunt pe test din 24.11, 23:42** (`893e45bb`; completul pe `main` 45484077948, verde; proba de fum,
  bună); cotele a-4 și b și lotul acesta pleacă acum, într-o singură publicare. La linii: atelierul (3.Cc,
  cremaliera, 18.26.0, gata pe ramură; 3.Cd, arcul, în lucru; 3.Tu, la răspunsurile owner-ului), frezele (16.A↑b-5,
  apoi b-4); la cuvântul owner-ului: cotele (10.4↑c, exportul), relieful (18.1↑b). **La owner:** plafoanele
  (totalul, 19,1 kB; pornirea, 3,6 kB), cele trei întrebări ale lui 3.Tu, arhivarea sesiunilor exportului și
  elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul
  de sus la 320 px la atingere.
- 24.11.2026, noaptea (a douăzeci și șasea unire din cloud): **cotele: panoul cotei cu lista (10.4↑a-4) și raza,
  diametrul, unghiul, inch în fracții (10.4↑b), unite în `main`** (sesiunea principală, ramura `unire-2411ae`, din
  `893e45bb`). Linia cotelor, ramura `wip/10.4-cote`, `98575aff`, PR-ul `AndreiBesliu/cvs2#21` (ADR 0330 §4–§6; la
  „continuă cu 10.4↑a-4” și „10.4↑b” ale owner-ului, în sesiunea liniei), unite în `1eea83dd`: panoul cotei, lista
  „Cote (N)” cu ochiul, „Arată cotele”, cotele foilor vecine estompate; Rază, Diametru și Unghi, și în Automată;
  inch în fracții și unghiul în grade-minute-secunde; otrăvurile 25 / 25 și 49 / 49 (cinci, prinse după probele
  noi). Documentul rămâne v28; nimic pe server. Linia își adusese `main` de după relief (`893e45bb`) și rezolvase
  ciocnirile (DEVLOG, fișa etapei 3, catalogul controalelor, scris din nou: 646 de nume); **arborele unirii e chiar
  al lui `98575aff`** (`git diff` gol), deci a intrat singură, pe porțile lui, fără alt complet: completul
  45482827371, verde (unit 10 379 / 0, 12 sărite pe Linux; e2e 800 / 800; funcțiile pe emulatoare 136 / 136;
  paginile 59 / 59), rapidul, verde; pornirea 111,2 kB (plafonul 120; cu ușa 116,1, **cu Atelierul 116,5: mai sunt
  3,5 kB**), **totalul 880,9 / 900 kB (mai sunt 19,1 kB)**, `/admin` 138,3 / 200. Publicarea loturilor 23–27
  (`893e45bb`) era în drum la unire (completul pe `main` rula); cotele pleacă spre test cu lotul următor, al
  atelierului Easy 3Draw (3.Ca și 3.Cb, unite pe `unire-2411ad`, care își reface porțile peste `main`-ul acesta).
  **La owner:** plafoanele (totalul, 19,1 kB; pornirea, 3,5 kB: frezele b-5, relieful 18.1↑b și exportul cotelor
  nu mai încap toate), cele trei întrebări ale lui 3.Tu, arhivarea sesiunilor exportului și elicelor, verificarea
  juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la
  atingere.
- 24.11.2026, noaptea (a douăzeci și cincea unire din cloud): **relieful din imagine, pe planșă (18.1↑a), unit în
  `main`, cu documentul v28**, singur în lotul lui (sesiunea principală, ramura `unire-2411ac`, peste lotul 26).
  Linia reliefului, ramura `wip/18.1-relief`, `feb7bee1`, PR-ul `AndreiBesliu/cvs2#25` (ADR 0310, acceptat de owner
  cu „1a–6a”, în schița liniei; ADR 0311, contractul nucleului), unită în `c5b79526`: din „Importă…”, o imagine se
  face relief (sursa, sensul, înălțimea și baza, lățimea, netezirea); piesa are un element de forma `relief`, văzut
  umbrit pe planșă, sub vectori, cu secțiunea Relieful în panou; dalele stau în browser, iar documentul ține doar
  amprenta hărții lor. Nu se taie încă: degroșarea și finisarea vin în 18.1↑c. Oracolul a fost scris înaintea
  nucleului; otrăvurile 43 / 43. **Documentul trece pe v28: un câmp nou ia de acum v29**, iar numărul îl dă sesiunea
  principală, la cerere. Linia își adusese `main` de trei ori și rezolvase ea ciocnirile de cod (`App.tsx`,
  `src/model/cote.ts`, `src/model/formaFrezei.ts`); la unire au rămas doar jurnalul feliilor, registrul otrăvurilor
  și catalogul controalelor (scris din nou, 641 de nume). Nimic pe server. Porțile lotului, în CI, pe `c5b79526`
  (completul 45472363389, verde la prima trecere, 56 min): unit 10 369 / 0 (12 sărite, pe Linux), e2e 791 / 791,
  funcțiile pe emulatoare 136 / 136, paginile 59 / 59; rapidul, verde pe `c5b79526`; completul liniei, verde pe
  `feb7bee1` (45463407432); pornirea 110,9 kB (plafonul 120; cu ușa 115,9, cu Atelierul 116,2: mai sunt 3,8 kB),
  **totalul 873,5 / 900 kB (mai sunt 26,5 kB)**, `/admin` 138,3 / 200, contul 30,3 / 32. Loturile 25 și 26 intraseră
  în `main` cu o jumătate de oră înainte (`52a0aaa1`); pe test e lotul 22 (`62569bb2`), iar loturile 23–27 pleacă
  acum într-o singură publicare. La linii: cotele (10.4↑a-4 și 10.4↑b: raza, diametrul, unghiul, inch în fracții;
  +4,2 kB; aduc `main` de după relief), frezele (16.A↑b-5, apoi b-4), atelierul Easy 3Draw (3.Ca, conectorul
  perpendicular, cu porțile în lucru; 3.Tu la răspunsurile owner-ului), relieful (18.1↑b). **La owner:** plafonul
  total (cu cotele rămân ~22 kB) și al pornirii (3,8 kB), cele trei întrebări ale lui 3.Tu, arhivarea sesiunilor
  exportului și elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în
  `main`”, meniul de sus la 320 px la atingere.
- 24.11.2026, seara (a douăzeci și patra unire din cloud): **frezele: profilurile parametrice (16.A↑h-5) și freza din
  bibliotecă pe rândurile exportului (16.A↑b-3), unite în `main`**, în lot (sesiunea principală, ramura `unire-2411ab`,
  peste lotul 25, cu care a intrat în aceeași împingere). **16.A↑h-5** (linia frezelor, ramura `wip/16.A-freze`,
  `2fe701d3`, PR-ul `AndreiBesliu/cvs2#22`; ADR 0302 §1, §7; la „continua cu 16.A↑h-5” al owner-ului), unită în
  `4aee5405`: rotunjirea, ogee-ul, ogee-ul roman și panoul ridicat, în „Frezele mele” și în catalog (149 de freze),
  „în curând în proiect”; otrăvurile 29 / 29. **16.A↑b-3** (ramura `wip/16.A-freze-b3`, `6041109d`, PR-ul
  `AndreiBesliu/cvs2#26`; ADR 0300 §4; la „continua cu 16.A↑b-3” și „Pe #11, acum” ale owner-ului, în sesiunea
  liniei), unită în `fdde5947`: lista „Din frezele mele” în grupul Freza al fișei unei operații din fereastra
  exportului, cu T-ul, Ø-ul, forma și pașii frezei alese și cu originea ei scrisă de Exportă; otrăvurile 16 / 16.
  Documentul rămâne v27; nimic pe server. Ciocnirile: registrul otrăvurilor și catalogul controalelor (scris din nou,
  640 de nume). Porțile, în CI, pe `fdde5947` (completul 45466400696, verde la prima trecere, 50 min; cuprinde și
  codul lotului 25): unit 10 307 / 0 (12 sărite, pe Linux), e2e 788 / 788, funcțiile pe emulatoare 136 / 136, paginile
  59 / 59; rapidul, verde pe `fdde5947`, cu feliile sub 10 minute; completele liniei, verzi (`2fe701d3`: 45455123768;
  `6041109d`: 45455611401); pornirea 110,4 kB (plafonul 120; cu ușa 115,1, cu Atelierul 115,4), **totalul
  860,1 / 900 kB (mai sunt 39,9 kB)**, `/admin` 138,3 / 200, contul 30,3 / 32. Urmează lotul 27, relieful singur
  (18.1↑a, `feb7bee1`, cu documentul v28; unit pe `unire-2411ac`, completul în lucru): cu el, totalul ajunge la
  ~873 / 900. Apoi, o singură publicare pentru loturile 23–27. La linii: frezele (16.A↑b-5: fundul plat, frezele de
  rest, dopul și banda; 16.A↑b-4), cotele (10.4↑a-4), atelierul Easy 3Draw (ADR 0340 propus, cu 3.Tu). **La owner:**
  plafonul total (după relief rămân ~27 kB), cele trei întrebări ale lui 3.Tu, arhivarea sesiunilor exportului și
  elicelor, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul
  de sus la 320 px la atingere.
- 24.11.2026, seara: **o linie nouă, atelierul Easy 3Draw: piese și configuratoare, care ia și lucrul elicelor**. Două
  cereri ale owner-ului, scrise în sesiunile liniilor. În sesiunea liniei bibliotecii („sesiunea extensiilor”): „ok,
  vreau sa adaugi mai multe tipuri de piese pentru fiecare categoire, sau sa imbunatatesti piesele si configuratoarele
  care exista deja. vreau ca userii sa poata crea cat mai multe piese, care sa fie si compatibile intre ele nu doar una
  cate una ci si ca constructii complexe”. În sesiunea liniei elicelor: „vreau sa predai ce mai ai in lucru si tot ce
  este nevoie pentru asta sesiunii principale, ca aceasta sa mute si lucrul eliciilor in sesiunea extensiilor”. Deci:
  - linia atelierului o lucrează sesiunea extensiilor, pe ramura ei (`wip/3.Xh-biblioteca-ui`, canalul `biblioteca`);
    nota liniei, `docs/linii/atelier.md`. **Numerele, îndreptate în aceeași seară:** ADR-ul liniei e **0284**
    („Construcțiile din Easy 3Draw: piese noi pe familii, punctele de prindere și Modelul ca asamblare”), propus și
    acceptat de owner în sesiunea liniei, cu 1a–4a, înainte ca linia să fi citit numerele date de sesiunea principală
    (0340–0349, feliile de la 3.Tv); feliile lui sunt **3.Ca–3.Cj**. Rămân așa: 0284 e în intervalul pluginului
    (0280–0289, acum întreg al liniei), literele erau libere, iar o redenumire după acceptare n-ar aduce nimic.
    0340–0349 rămâne al liniei, pentru ADR-urile de după 0289. Prima felie, 3.Ca (conectorul perpendicular, Easy
    3Draw 18.24.0), e gata pe ramură, cu porțile în lucru;
  - **linia elicelor e predată** (`05bdc8ec`, doar documente: `docs/linii/elice.md`, „Predarea”): n-are nimic în
    lucru; cele patru elice sunt în `main` (3.Tq–3.Tt, Easy 3Draw 18.23.0). **3.Tu (piesele rotunde pe același ax în
    vederea „Modelul”; ADR 0283, rezervat) trece la linia atelierului**, cu analiza, cifrele și schița din notă. Cele
    trei întrebări ale ei rămân la owner (axul pieselor rotunde în mijlocul unui știft; „Pune în model” pe același ax;
    rotorul în carcasa lui; recomandările: 1a, 2a, 3a);
  - sesiunea liniei elicelor se poate arhiva după ce nota ei e în `main` (cu lotul 25); în coada owner-ului rămâne
    tipărirea celor patru elice.
- 24.11.2026, seara (a douăzeci și treia unire din cloud): **11.1↑d (rândul comenzilor foii nu trece de foaia lui),
  reparația unei probe instabile a extensiilor și o cursă reparată în fila Setări din `/admin` (3.At), unite în
  `main`**, în lot (sesiunea principală, ramura `unire-2411aa`,
  peste lotul 24). **11.1↑d** (scrisă de sesiunea principală, pe `wip/11.1d-rand-foaie`, `bff5fbcc`, la cererea
  owner-ului din 24.11, cu trei capturi: „si trebuie sa reparam si asta”; ADR 0210, „Felia 11.1↑d”), unită în
  `001b6325`: cu pânza micșorată, rândul de șapte butoane era mai lat decât foaia lui, ieșea peste foaia vecină, iar
  două rânduri se suprapuneau; acum rândul e întreg doar cât încape, se strânge în „⋯” când foaia e mai îngustă pe
  ecran și nu se mai arată sub lățimea unui buton; găsit de probă și reparat: cu cursorul pe rând, rotița nu micșora
  pânza. Otrăvurile 22 / 22 (18 la prima rulare; patru prinse după întărirea probei). **Proba instabilă**
  (`b08898b1`, în `13d9bcad`; doar probe): completul de pe `main` al loturilor 19–21 a căzut la
  `extensii.spec.ts:135`, unde clicul pe „Închide” din cadrul extensiei, dat imediat după ce cadrul apare, nu a ajuns
  la buton. Local nu s-a reprodus (150 din 150), deci a fost provocată: o probă nouă înghite primul clic, o dată;
  ajutorul vechi cade, cel nou (`clicCareInchideCadrul`, care repetă clicul cât cadrul e încă acolo) trece; 168 / 168
  pe fișierele extensiilor, iar otrava (gazda ignoră `host.inchide()`) e prinsă de toate cele trei probe care îl
  folosesc. **3.At** (`cadac6c3`, scrisă de sesiunea principală, linia adminului fiind încheiată): primul complet al
  lotului (pe `001b6325`) a căzut la o singură probă de pe emulatoare, fără legătură cu lotul, „setările utilizării”
  („lot = 61”: butonul Salvează, activ în loc de oprit). Cauza, o cursă adevărată: după „Salvează”, mesajul apărea la
  răspunsul salvării, iar formularul se umplea din nou la citirea de după, peste ce se scrisese între ele. Acum cele
  trei formulare ale filei Setări țin mesajul până la citire (`useMesajDupaCitire`, `src/admin/setari/dupaCitire.ts`);
  două probe noi (citirea întârziată anume, care cădea înaintea reparației; citirea căzută); otrăvurile 5 / 5 din prima, pe emulatoare.
  Documentul rămâne v27; nimic pe server. Ciocnirile, doar în DEVLOG și în lecțiile din `docs/linii/principala.md`.
  Porțile lotului, în CI: primul complet (pe `001b6325`), roșu doar la proba de mai sus (unit 10 300 / 0, e2e
  785 / 785, funcțiile 136 / 136, paginile 56 din 57); cu 3.At, codul lotului a trecut în completul lotului 26, care
  îl cuprinde (45466400696, pe `fdde5947`: cifrele, în decizia unirii a douăzeci și patra); rapidul, verde pe
  `e533068a`. Completul propriu al lotului, pe `cadac6c3` (45465767883), a stat 40 de minute la coadă și a ieșit și
  el verde, cu câteva minute înaintea unirii (unit 10 300 / 0, e2e 785 / 785, funcțiile 136 / 136, paginile 59 / 59). Felia
  rândului foii: totalul +0,7 kB (857,5 / 900), pornirea neschimbată. Loturile 19–22 sunt pe test din 20:32
  (`62569bb2`; proba de fum, bună).
- 24.11.2026, seara (a douăzeci și doua unire din cloud): **fereastra „Exportă G-code”, refăcută (28.8↑a–g), și proba
  repornirii extensiei (3.Xk) unite în `main`**, în lot (sesiunea principală, ramura `unire-2411y`, peste lotul 23), la
  „da, uneste fereastra exportului cand e verde si sa imi spui cand pot sa o arhivez” al owner-ului (în sesiunea
  principală) și la „ok, cand e verde fa unirea”, spus de el în sesiunile celor două linii. **28.8↑a–g** (linia
  exportului, ramura `wip/28.8-export`, `4ee623d3`, cu nota liniei din `ef8a6dd6`; PR-ul `AndreiBesliu/cvs2#11`; ADR
  0290, acceptat de owner cu „1a, 2a, 3a, 4a”), unite în `c4ca5ec2`: lista operațiilor și fișa celei alese, cu
  câmpurile pe grupuri, după întrebarea la care răspund; explicația câmpului activ la vedere și greșeala în grupul
  ei; desenul fiecărei întrebări, din valorile omului, cu cota câmpului activ aprinsă; alegerile ca cartonașe cu poze;
  Rezultatul pe grupuri; Esc și un clic în afară închid fereastra (28.8↑g, cerută de owner după ce a încercat-o pe
  canal: „e ok”). **Nu schimbă ce face fereastra:** aceleași câmpuri, aceleași valori, același program, octet cu octet.
  Otrăvurile, pe felii, toate prinse, afară de una echivalentă (28.8↑g, E03). **3.Xk** (linia bibliotecii, ramura
  `wip/3.Xh-biblioteca-ui`, `23d9a1b1`, PR-ul `AndreiBesliu/cvs2#24`), unită în `373699e6`: doar probe (proba
  repornirii cerute de extensie ține ea ceasul paginii; otrăvurile 8 / 8). **ADR 0233 (rafturile bibliotecii),
  acceptat de owner cu „da, 1a–5a”:** rămâne ce e implementat. Documentul rămâne v27; nimic pe server. Ciocnirile:
  DEVLOG, traducerile roadmap-ului (ambele părți, după cheie) și catalogul controalelor (scris din nou). Porțile
  lotului, în CI, pe `8b218d47` (completul, verde la prima trecere, 60 min): unit 10 297 / 0 (12 sărite, pe Linux), e2e
  781 / 781, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; rapidul, verde pe `8b218d47`; completele liniilor,
  verzi (`4ee623d3`; `23d9a1b1`); pornirea 110,4 kB (plafonul 120; cu ușa 115,1, cu Atelierul 115,4), **totalul
  856,8 / 900 kB (mai sunt 43,2 kB)**, `/admin` 138,2 / 200, contul 30,3 / 32. Lotul 23 a intrat în `main` cu câteva
  minute înainte (`9bbb1d58`); pe test e tot `29ef7e44`, iar completul lotului 22 pe `main` rula la unire. Urmează
  lotul 25: reparația probei extensiilor de la `extensii.spec.ts:135` și 11.1↑d (rândul comenzilor foii nu trece de
  foaia lui, cerută de owner cu trei capturi: „si trebuie sa reparam si asta”); completul lui rula la unire. Apoi, o
  singură publicare pentru loturile 23–25. La linii: frezele (16.A↑h-5; 16.A↑b-3, lista „Din frezele mele” pe
  rândurile exportului, făcută peste fereastra nouă, la „Pe #11, acum” al owner-ului, `AndreiBesliu/cvs2#26`), cotele
  (10.4↑a-4), relieful (18.1↑a, v28, singur în lotul lui), elicele (3.Tu, la răspunsurile owner-ului).
  **La owner:** sesiunea liniei exportului se poate arhiva (din ADR 0290 nu rămâne nimic; ramura ei de pe `origin` intră
  în lista de șters); cele trei întrebări ale liniei elicelor despre vederea „Modelul” din Easy 3Draw (unde stă axul
  pieselor rotunde: owner-ul a văzut că o carcasă și un rotor de același diametru nu se pot așeza centrat); plafonul
  total (mai sunt 43 kB; relieful cere ~13); verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului;
  „cine unește în `main`”; meniul de sus la 320 px la atingere.
- 24.11.2026, seara (a douăzeci și una unire din cloud): **fereastra Setări a cotelor (10.4↑a-3), catalogul de freze
  și felurile noi (16.A↑h-3, 16.A↑h-4) și împărțirea celor două teste grele din rapid, unite în `main`**, în lot
  (sesiunea principală, ramura `unire-2411x`, din `62569bb2`). **Împărțirea testelor** (`49ce2793`, scrisă de sesiunea
  principală la „ok, imparte si cele doua teste grele ramase”; decizia de mai jos): doar probe. **10.4↑a-3** (linia
  cotelor, ramura `wip/10.4-cote`, `9209756f`, PR-ul `AndreiBesliu/cvs2#21`; ADR 0330 §6, după nota owner-ului la
  acceptarea ADR-ului: setările cotelor, într-o fereastră „Setări”), unită în `08e2e50d`: fereastra Setări, cu secțiunea
  Cotele, din meniul contului, din paletă, cu Ctrl+, și din unealta Cote; otrăvurile 37 / 37. **16.A↑h-3 și 16.A↑h-4**
  (linia frezelor, ramura `wip/16.A-freze`, `88b048aa`, PR-ul `AndreiBesliu/cvs2#22`; ADR 0302 §1, §2), unite în
  `9fd71053`: catalogul de freze al nostru (119 freze, cu felurile noi), cu „Pune în frezele mele”; bila, toroidala,
  conica cu vârf rotund și burghiul în bibliotecă, deocamdată fără CAM („în curând în proiect”); otrăvurile 23 / 23 și
  23 / 24 (una, practic echivalentă). Linia frezelor merge mai departe cu 16.A↑h-5 (profilurile), la „continua cu
  16.A↑h-5” al owner-ului: s-a unit commit-ul raportat. Documentul rămâne v27; nimic pe server. Ciocnirile: DEVLOG,
  registrul otrăvurilor și catalogul controalelor (scris din nou, 634 de nume). Porțile lotului, în CI, pe `9fd71053`
  (completul, verde la prima trecere, 70 min cu așteptarea la coadă): unit 10 285 / 0 (12 sărite, pe Linux), e2e 750 / 750, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; rapidul, verde pe `9fd71053`, cu feliile între 4 și 7 minute; completele liniilor, verzi (`aa47863d`; `5bdea116`);
  pornirea 110,4 kB (plafonul 120), totalul 840,5 / 900 kB, `/admin` 138,2 / 200, contul 30,3 / 32. Loturile 19–22 (`62569bb2`) erau în drum spre test: publicarea loturilor 19–21 căzuse la o probă instabilă a extensiilor (`extensii.spec.ts:135`, clicul pe „Închide” din cadru, pierdut; reparată pe ramură, intră cu lotul următor), iar completul lotului 22 pe `main` rula la unire. **ADR 0233 (rafturile bibliotecii), acceptat de owner cu „da, 1a–5a”**, în sesiunea liniei
  bibliotecii: rămâne ce e implementat. În lucru, pe ramuri: biblioteca (3.Xk, doar probe: repornirea extensiei, cu
  ceasul paginii ținut de probă; porțile în lucru), relieful (18.1↑a, v28: își reface porțile peste `main`; intră
  singur în lotul lui), frezele (16.A↑h-5). **Gata pe ramură, la cuvântul owner-ului:** fereastra exportului
  (`AndreiBesliu/cvs2#11`: toate feliile ADR 0290 și 28.8↑g, închiderea cu Esc și cu un clic în afară, cerută de owner
  după ce a încercat-o pe canal; cu `main` `7312d685` adus, totalul e 846,8 / 900 kB). **La owner:** unirea ferestrei
  exportului, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul
  de sus la 320 px la atingere.
- 24.11.2026, seara: **și cele două teste grele rămase în rapid, împărțite** („ok, imparte si cele doua teste grele
  ramase”, în sesiunea principală, după cifrele rapidului cu oracolul rampelor împărțit: felia cea mai lungă ținea tot
  9 min 20 s). **„Căile netede din multe cubice se taie…”** (`cale.recenzie.test.ts`, 24 de cazuri într-un test: 184 s
  în container, 258 s în CI) stă acum în `cale.recenzie.cubice.<1…4>.test.ts`, câte șase cazuri: 43–47 s pe parte.
  **„Poarta de acum și cea de dinainte de ADR 0032 dau aceleași încălcări…”** (`degajari.octeti.oracol.test.ts`, 461
  de programe într-un test: 125 s în container, 195 s în CI) stă în `degajari.poarta.<1…4>.oracol.test.ts`: 30–36 s
  pe parte, cu pragurile întregului (300 de programe, 100 cu încălcări) cerute pe părți (sumele: 301, 102). Judecata
  fiecărui caz e neschimbată, mutată în `ajutor-cale-recenzie.ts` și `ajutor-degajari-poarta.ts`; împărțirea și paza ei
  sunt comune, în `test/unit/ajutor-parti.ts`, folosit acum și de oracolul rampelor. Mutații de control, de mână, 7
  (9 rulări), toate prinse: o parte fără fișier și numărul părților greșit (la cubice), o parte fără fișier și un minim
  slăbit (la poartă), împărțirea comună greșită (prinsă de toate cele trei paze), încălcările nenumărate, raza greșită
  în judecata cubicelor. Listele de otrăvuri care numeau `cale.recenzie` (2.3c-b, 2.8, 3.V) au primit și fișierele
  părților. Limita unei felii a rapidului rămâne 15 minute.
- 24.11.2026, seara (a douăzecea unire din cloud): **3.Xj (căutarea și categoriile în biblioteca extensiilor) și
  oracolul rampelor împărțit, unite în `main`**, în lot (sesiunea principală, ramura `unire-2411v`, din `7312d685`).
  **Oracolul rampelor** (`b491853b`, scris de sesiunea principală la „ok, imparte oracolul rampelor in mai multe
  fisiere”; decizia de mai jos), unit în `b2a56e23`: doar probe. **3.Xj** (linia bibliotecii, ramura
  `wip/3.Xh-biblioteca-ui`, `c11a1c7f`, PR-ul `AndreiBesliu/cvs2#24`; ADR 0233; la „ok, porneste cautarea si
  categoriile” al owner-ului, în sesiunea liniei; unirea, la ordinul în vigoare „unește ce se poate”), unită în
  `049c5dda`: rafturile bibliotecii (lista lor e a aplicației; pe ce rafturi stă o extensie o spune lista bibliotecii,
  nu pachetul), „Caută o extensie”, pastilele rafturilor, starea „nimic găsit”, tastatura; pachetele, neschimbate
  (Easy 3Draw 18.23.0); otrăvurile 78 / 78. Documentul rămâne v27; nimic pe server. Ciocnirile: DEVLOG, indexul
  liniilor și catalogul controalelor (scris din nou, 629 de nume). Porțile lotului, în CI, pe `049c5dda` (completul, verde la
  prima trecere, 53 min): unit 10 258 / 0 (12 sărite, pe Linux), e2e 741 / 741, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; rapidul, verde pe `049c5dda`, cu feliile între 3 și 9 minute; completul liniei,
  verde pe `51ca1a5`; pornirea 110,2 kB (plafonul 120), totalul 831,8 / 900 kB, `/admin` 138,2 / 200, contul 30,3 / 32. Înainte, loturile al șaptesprezecelea și al optsprezecelea au ajuns pe test
  (`29ef7e44`, 24.11, 17:50), cu proba de fum bună; loturile 19–21 (`7312d685`) erau în drum: completul lor pe `main`
  rula la unire. **Rapidul după împărțirea oracolului:** felia cea mai lungă ține tot 9 min 20 s, din cauza altor
  teste grele dintr-un singur test („căile netede din multe cubice…”, 4 min 18 s în CI; „poarta de acum și cea de
  dinainte de ADR 0032…”, 3 min 15 s), deci limita de 15 minute rămâne; împărțirea lor, la cuvântul owner-ului. Urmează, de
  la linia bibliotecii, o felie doar de probe: „două cereri imediat după” repornirea unei extensii, fără timp (acordul
  sesiunii principale: ține de CI-ul verde). În lucru, pe ramuri: relieful (18.1↑a, v28: își aduce `main` și își
  reface porțile, apoi intră singur în lotul lui), frezele (16.A↑h-3), exportul (`AndreiBesliu/cvs2#11`, la cuvântul
  owner-ului). **La owner:** cele cinci întrebări din ADR 0233, fereastra exportului, verificarea juridică (GDPR) a
  utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la atingere.
- 24.11.2026, seara (a nouăsprezecea unire din cloud): **frezele (16.A↑b-2, 16.A↑a-2, 16.A↑h-1, 16.A↑h-2) și
  unealta Cote (10.4↑a-2) unite în `main`**, în lot, cu o probă instabilă reparată înainte (sesiunea principală,
  ramura `unire-2411s`, peste `29ef7e44`). **16.A↑b-2 și 16.A↑a-2** (linia frezelor, ramura `wip/16.A-freze`,
  `d0fa2dde`, PR-ul `AndreiBesliu/cvs2#22`; la „continua cu 16.A↑b-2” și la precizarea owner-ului din sesiunea liniei,
  „sa ai in vedere ca biblioteca de freze trebuie sa fie populata cu freze default standard”), unite în `33fadb06`:
  rândul „Freza” din secțiunea Tăierea, cu frezele bibliotecii care merg pe formele alese (freza aleasă trece pe
  operații într-un pas, cu originea, valorile de lucru și numărul T); setul de pornire, cu id-uri fixe, pus o dată în
  biblioteca fără cont și, la prima sincronizare, într-un cont care n-a avut niciodată freze; otrăvurile 22 / 22 și
  15 / 16 (una, practic echivalentă). **ADR 0302, acceptat de owner cu „Da, 1a–5a”** (în sesiunea liniei): catalogul
  de freze („lista completă, ca în ArtCAM”, cerută de owner) e unul al nostru, iar biblioteca se arată ca listă;
  fișierul ArtCAM `FREZE.tdb`, atașat de owner, nu se citește și nu se copiază (format binar nedocumentat, cu
  conținutul ArtCAM și al unor producători; regula din „Surse”). **16.A↑h-1 și 16.A↑h-2** (aceeași linie,
  `ea2b8111`), unite în `db43ed08`: fereastra „Frezele mele” ca listă, cu fișa frezei și editorul la cerere;
  grupurile omului (câmpul `grup`, fără schemă nouă), cu redenumirea unui grup într-o scriere; otrăvurile 16 / 16 și
  23 / 24 (una echivalentă; alta a găsit focusul pierdut după redenumire, reparat). **10.4↑a-2** (linia cotelor,
  ramura `wip/10.4-cote`, `1500e4b3`, PR-ul `AndreiBesliu/cvs2#21`), unită în `f3283b33`: unealta Cote pe pânză, în
  extensia barei, după Convertește; cotele puse cu lipirea pe punctele formelor; „Duplică foaia” copiază și cotele;
  otrăvurile 35 / 35. Documentul rămâne v27; nimic pe server. **Proba instabilă:** completul lotului 19 singur
  (`33fadb06`) și cel al lotului 17 de pe `main` (`647cebb1`) au căzut, amândouă, la `extensii.lucru.spec.ts:222`:
  clicul pe „Repornește” din cadrul unei extensii nu se mai întorcea, fiindcă reface cadrul pe loc (aceeași cursă ca
  la „Închide”, 23.11). Reprodusă în container (8 din 120, pe zece lucrători) și reparată în `29ef7e44`, doar în probe
  (`clicCareRefaceCadrul`, `test/e2e/ajutor-extensii.ts`): 118 / 120, fără niciun clic neîntors; otrava (gazda ignoră
  `host.reporneste()`) e prinsă. De aceea loturile 19, 20 și 21 au intrat împreună, cu un singur complet, peste
  reparație. Ciocnirile: DEVLOG, indexul ADR, registrul otrăvurilor, fișa etapei 3, catalogul controalelor (scris din
  nou, 624 de nume) și numărul ușilor manualului (117). Porțile lotului, în CI, pe `db43ed08` (completul, verde la
  prima trecere, 53 min): unit 10 240 / 0 (12 sărite, pe Linux), e2e 725 / 725, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; rapidul, verde pe `db43ed08`; completele liniilor, verzi (`e46cc944`, `46da7102`,
  `1500e4b3`); pornirea 110,2 kB (plafonul 120), totalul 830,5 / 900 kB (mai sunt 69,5), `/admin` 138,2 / 200, contul 30,3 / 32. Pe test era lotul al șaisprezecelea (`fdce5f1b`); al șaptesprezecelea și al optsprezecelea, cu proba reparată
  (`29ef7e44`), erau în drum: completul lor pe `main` rula la unire. Pe ramuri, în lucru: frezele (16.A↑h-3, catalogul), biblioteca (3.Xj), relieful (18.1↑a),
  cotele (10.4↑a-3, la cuvântul owner-ului). **Gata pe ramură, la cuvântul owner-ului:** fereastra exportului
  (`AndreiBesliu/cvs2#11`: toate feliile ADR 0290, canalul `export`; linia recomandă unirea înaintea lui 16.A↑b-3).
  **La owner:** fereastra exportului, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine
  unește în `main`”, meniul de sus la 320 px la atingere, oracolul rampelor de 6 minute (împărțit în mai multe fișiere
  sau mutat în complet).
- 24.11.2026, seara: **oracolul rampelor, împărțit în șase fișiere** („ok, imparte oracolul rampelor in mai multe
  fisiere”, în sesiunea principală, la întrebarea de după incidentul rapidului: împărțit sau mutat în nivelul complet).
  `intrari-rampa.corpus.oracol.test.ts` (un singur test, 6 min 19 s) a devenit `intrari-rampa.corpus.<1…6>.oracol.test.ts`,
  câte unul pe parte a corpusului (cazul k merge în partea (k mod 6) + 1), cu judecata fiecărui caz neschimbată, mutată
  în `test/unit/ajutor-intrari-rampa-corpus.ts`. Măsurat: 338 de cazuri, 30–63 s pe parte, 2 min 11 s toate, în
  paralel, în container; nicio încălcare, aceleași numărători (199 de programe, 1 554 de treceri cu rampa pe intrare,
  1 513 punți judecate). Pragurile testului întreg se cer acum pe părți, fiecare cu partea ei din prag (rotunjită în
  sus), deci suma nu coboară sub cele de dinainte; partea 1 cere și exact șase fișiere și acoperirea corpusului întreg,
  fiecare caz o dată (patru otrăvuri, toate prinse: o parte fără fișier, împărțirea greșită, minimele slăbite, numărul
  părților greșit). Rămâne în nivelul rapid. Limita unei felii a rapidului rămâne 15 minute, ca pază.
- 24.11.2026, după-amiaza (a optsprezecea unire din cloud): **11.1↑c (comenzile foii pe pânză) și 14.C↑d (butonul
  Admin, doar pentru personal) unite în `main`** (sesiunea principală, ramura `unire-2411n`, din `64a63b48`). Amândouă,
  cerute de owner în sesiunea principală, pe 24.11 („ok, cand sunt verzi frezele fa unirea, pana atunci vreau sa faci
  ceva simplu. vreau ca plansele sa aiba controalele din meniu si sub ele, si sa apara doar la hover sau cand sunt
  selectate”; „si vreau in meniu un buton pentru admin, care apare daca esti logat ca admin”), și scrise aici, pe
  ramura `wip/11.1c-controale-foi` (`9a8aa992`), unită în `7584747a`. **11.1↑c** (ADR 0210 §1): sub fiecare foaie de pe
  pânză, rândul cu cele șapte comenzi ale meniului ei, ca iconițe; al foii active mereu, al unei vecine doar cu mausul
  pe ea; același registru ca meniul; ștergerea unei foi cu piese întreabă în rând. **14.C↑d** (ADR 0132 §11): butonul
  Admin la mijlocul meniului global, doar cu planul `personal`, un link spre `/admin` în altă filă; nu se arată pe
  telefon și nu dă niciun drept. Documentul și serverul, neschimbate. Otrăvurile 41 / 41 (39 la prima rulare; două
  prinse după întărirea probei). **Găsit de primul complet al ramurii:** proba Cuțitului la Liber (`cutit.spec.ts:421`)
  își pornea urma exact pe rândul foii active; un gest nu poate începe pe rând, deci proba pornește acum de deasupra
  plăcii. Varianta de rezervă, la cuvântul owner-ului: și rândul foii active doar cu mausul pe ea. Ciocnirile unirii:
  DEVLOG, fișa etapei 3 și catalogul controalelor (scris din nou, 622 de nume). Porțile, în CI, pe `7584747a`
  (completul, verde la prima trecere, 66 min pe un runner lent): unit 10 190 / 0 (12 sărite, pe Linux), e2e 707 / 707, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; rapidul, verde și pe `a1723e7d`, cu `main`
  (`647cebb1`) adus; pornirea 110,1 kB (plafonul 120), totalul 816,8 / 900 kB, `/admin` 138,2 / 200, contul 30,3 / 32. Înainte, lotul al șaisprezecelea a ajuns pe test (`fdce5f1b`, 24.11, 15:35), cu
  serverul: funcția `freze` creată, indexurile și regulile publicate; lotul al șaptesprezecelea, cu limita rapidului
  (`647cebb1`), era în drum: completul lui pe `main` rula la unire. Pe ramuri, în lucru: frezele (16.A↑b-2 și 16.A↑a-2,
  `AndreiBesliu/cvs2#22`; ADR 0302 propus, la owner), biblioteca (3.Xj), relieful (18.1↑a), cotele (10.4↑a-2, la
  „continuă” al owner-ului), exportul (`#11`, la cuvântul owner-ului). **La owner:** fereastra exportului, verificarea
  juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, meniul de sus la 320 px la
  atingere (butoanele se suprapun: ce pleacă de pe rând).
- 24.11.2026, după-amiaza (a șaptesprezecea unire din cloud): **reparația căderii de noapte, 10.4↑a-1 (cotele:
  modelul și proba G-code-ului) și 3.Tt (elicea de barcă înclinată spre pupa) unite în `main`**, în lot (sesiunea
  principală, ramura `unire-2411m`, din `fdce5f1b`). **Incidentul:** completul de noapte programat a ieșit roșu pe
  `main` (`4ef990f5`, rularea 45380945393), la o singură probă de pe emulatoare,
  `utilizare.emulator.spec.ts:233` (A.8d): din evenimentele mașinii lipsea „pornita”. Cauza, la rădăcină:
  `evenimenteMasina` compară două stări ale sesiunii văzute la rând, iar starea se vede la redesenare, nu la fiecare pas
  al fluxului; programul de probă, de câteva linii pe mașina simulată, a ajuns de la „pregătit” la „terminat” între două
  redesenări. Nu e doar proba: o lucrare scurtă era numărată terminată fără să fi pornit, deci lipsea din pasul al
  patrulea al drumului principal. Reparația (`bae574a8`, scrisă de sesiunea principală, linia adminului fiind
  încheiată): de la „legată” sau „gata”, o pauză, o oprire cerută de program, capătul sau întreruperea spun întâi
  pornirea; proba unitară reproduce căderea, iar patru otrăvuri noi (A.8d, M08–M11) sunt prinse. Completele pornite de
  mână pe același cod (`e3a9e512`, loturile 10–15) trecuseră proba. **10.4↑a-1** (linia cotelor, ramura
  `wip/10.4-cote`, `47be5f42`, PR-ul `AndreiBesliu/cvs2#21`; ADR 0330, acceptat de owner cu 1a–6a și cu nota lui:
  setările cotelor, într-o fereastră „Setări”), unită în `f25249cf`: cota ca element al foii (`foaie.cote`, fără schemă
  nouă), modelul pur, judecata ușii adusă la cerere, comanda `inlocuieste-cote`, regula de import `cam-fara-cote` și
  proba G-code-ului neatins, scrisă prima; fără interfață încă; otrăvurile 30 / 30. A intrat devreme, la cererea
  sesiunii principale, ca linia reliefului să aducă `main` înaintea migrării ei la v28. **3.Tt** (linia elicelor,
  ramura `wip/3.Tq-elice`, `ba09a10b`, PR-ul `AndreiBesliu/cvs2#19`; ADR 0282, „Implementarea (3.Tt)”; la „pornește
  înclinarea spre pupa ca opțiune” și „cand e verde fa unirea” ale owner-ului, în sesiunea liniei), unită în
  `d57ca962`: câmpul „Înclinarea spre pupa (°)”, 0–15°, implicit 0, în editorul elicei de barcă; vârful urcă cu
  (R − rh) · tan θ, butucul crește până la el; elicea se tipărește cu suportul programului de feliere; fără
  înclinare, elicea iese identică la octet cu 18.22.0; pachetul 18.23.0; otrăvurile 35 / 35 și 5 / 5. Cu lotul a
  intrat și nota liniei bibliotecii (`e0922fc3`, doar documente, PR-ul `#23`). Ciocnirile, doar în DEVLOG și într-un
  rând din registrul otrăvurilor. Nimic pe server. Porțile lotului, în CI, pe `d57ca962` (completul, verde la prima trecere, 52 min cu așteptarea la coadă):
  unit 10 186 / 0 (12 sărite, pe Linux), e2e 697 / 697, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; completele liniilor, verzi (`47be5f42`; `ba09a10b`); pornirea 110,0 kB (plafonul 120; cu ușa 114,6, cu Atelierul 114,9, măsurate de linia cotelor), totalul 815,9 / 900 kB, `/admin` 138,2 / 200, contul 30,3 / 32. Lotul al șaisprezecelea
  (`fdce5f1b`) era încă în drum spre test: completul lui pe `main` rula la unire. Pe ramuri, în lucru: frezele (16.A↑b-2, `AndreiBesliu/cvs2#22`), cotele (10.4↑a-2), relieful (18.1↑a),
  exportul (`#11`, la cuvântul owner-ului). În sesiunea principală, gata pe ramură, cu canalul `foi`: 11.1↑c
  (comenzile foii pe pânză) și 14.C↑d (butonul Admin). **La owner:** fereastra exportului, verificarea juridică (GDPR)
  a utilizării aplicației înaintea live-ului, „cine unește în `main`”.
- 24.11.2026, după-amiaza (a șaisprezecea unire din cloud): **16.A↑c (biblioteca de freze în cont) și 3.Xi
  (extensiile, stările de lângă drumul bun) unite în `main`**, în lot (sesiunea principală, ramura `unire-2411k`, din
  `4ef990f5`), la „ok, cand sunt verzi frezele fa unirea” al owner-ului (în sesiunea principală) și la „ok, cand e
  verde fa unirea”, spus în sesiunea liniei bibliotecii, care a scris întâi aici. **16.A↑c** (linia frezelor, ramura
  `wip/16.A-freze`, `9943b23f`, PR-ul `AndreiBesliu/cvs2#20`; ADR 0300 §3, §7; la „b, pornește 16.A↑c”), unită în
  `6b74074d`: frezele omului se țin în cont, prin callable-ul nou `freze` (`conturi/{uid}/freze`, închise clientului);
  capabilitatea nouă `cloud`; îmbinarea pe câmpuri față de ultima versiune comună, banda conflictului, „Adaugi cele N
  freze din acest browser în cont?” la prima deschidere cu contul; documentul rămâne v27; otrăvurile 47 / 47. Linia a
  mers mai departe pe ramură (16.A↑b-2, vârful `0ffb2599`): s-a unit commit-ul raportat. **3.Xi** (linia bibliotecii,
  ramura `wip/3.Xh-biblioteca-ui`, `0f043f31`, PR-ul `AndreiBesliu/cvs2#17`; ADR 0232, acceptat de owner cu 1a–5a, în
  sesiunea liniei), unită în `f12308de`: starea unei extensii care nu pornește, redeschiderea după o versiune nouă și
  după reîncărcare, filele „Din bibliotecă” și „Instalate”, captura mărită, un `.zip` de extensie lăsat pe planșă,
  „Deschide <nume>” în paletă, punctul de pe butonul Extensii; pachetele, neschimbate (Easy 3Draw 18.22.0); otrăvurile
  55 / 56, 41 / 43 și 60 / 60. Ciocnirile lotului, doar în DEVLOG, în fișa etapei 3 și în catalogul controalelor (scris
  din nou). **La publicare merge și serverul:** funcția nouă `freze` (callable, `europe-central2`, App Check),
  `firestore.indexes.json` (scutirea câmpului `json`), `cont` și `administreazaConturile` cu capabilitatea `cloud`;
  regulile nu se schimbă. Porțile lotului, în CI, verzi la prima trecere pe `f12308de` (completul, 50 min 24 s): unit
  10 162 / 0 (12 sărite, pe Linux), e2e 694 / 694, funcțiile pe emulatoare 136 / 136, paginile 57 / 57; completele
  liniilor, verzi (`a70f1ea2`; `da00b854`); pornirea 109,9 kB (plafonul 120; cu ușa 114,4, cu Atelierul 114,7), totalul
  814,3 / 900 kB, `/admin` 138,2 / 200, contul 30,3 / 32. Înainte, lotul al cincisprezecelea a ajuns pe test
  (`e3a9e512`, 24.11, 13:54). **Liniile noi, acceptate de owner în sesiunile lor:** relieful, ADR 0310 (1a–6a);
  cotele, ADR 0330 (1a–6a). **Schema, schimbată față de decizia de la prânz:** v28 e a reliefului (forma `relief`,
  felia 18.1↑a); cotele nu cer schemă (stau pe foaie, `foaie.cote`, ca ghidajele și imaginile); următorul număr liber
  e v29, dat de sesiunea principală la cerere. Urmează, pe ramura de unire `unire-2411l`: 3.Tt (elicele, înclinarea
  spre pupa, Easy 3Draw 18.23.0, `AndreiBesliu/cvs2#19`). În lucru în sesiunea principală, la cererea owner-ului din
  24.11 („vreau ca plansele sa aiba controalele din meniu si sub ele, si sa apara doar la hover sau cand sunt
  selectate”; „si vreau in meniu un buton pentru admin, care apare daca esti logat ca admin”): feliile 11.1↑c și
  14.C↑d, pe `wip/11.1c-controale-foi`, cu canalul `foi`. **La owner:** fereastra exportului (`#11`), verificarea
  juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”.
- 24.11.2026, după-amiaza (a cincisprezecea unire din cloud): **A.7 (adminul pe telefon) unită în `main`** (sesiunea
  principală, ramura `unire-2411h`, din `41233474`), la „ok, cand e verde fa unirea” al owner-ului. Linia adminului,
  ramura `wip/A.1-admin`, `c08a24bc`, PR-ul `AndreiBesliu/cvs2#13` (ADR 0260 §7; `3.As` în fișa etapei 3), unită în
  `458befb9`: sub 640 px, `/admin` are jos o bară cu Azi, Erori și Tichete (doar cele pe care rolul le vede, cu numerele
  lor) și „Mai mult”, iar restul filelor stau într-un sertar, deschis de ☰ sau de „Mai mult”; un tichet se citește și
  primește răspuns pe telefon, iar proiectul atașat se descarcă doar de pe calculator; nimic nu iese din ecran în
  dreapta, iar bara de jos nu acoperă capătul paginii; otrăvurile 9 / 9, toate pe emulatoare. **Cu ea, linia adminului
  e încheiată** (ADR 0260: A.1–A.7; ADR 0262: A.8–A.11). Nimic pe server; nimic în pornire. Ramura avea `main`
  (`f536a4cc`, cu plafonul pornirii); nicio ciocnire, iar codul unirii e chiar al lui `c08a24bc` (`git diff` gol în
  afara fișierelor `.md`). Față de `b064e954`, cu completul verde, `c08a24bc` adaugă doar constanta plafonului din
  `scripts/build-determinist.ts` și documente, cu rapidul verde pe el. Porțile, în CI, verzi pe `b064e954` (completul,
  48 min 2 s): unit 10 111 / 0 (12 sărite, pe Linux), e2e 655 / 655, funcțiile pe emulatoare 126 / 126, paginile
  55 / 55; pornirea 109,9 kB (plafonul 120; cu ușa 114,4, cu Atelierul 114,7), totalul 806,1 / 900 kB, `/admin`
  138,2 / 200. Înainte, lotul al paisprezecelea a ajuns pe test (`356db9bd`, 24.11, 12:26), cu serverul. Pe ramuri, în
  lucru: frezele (16.A↑c-1 și 16.A↑c-2, biblioteca de freze în cont), exportul (`AndreiBesliu/cvs2#11`, la cuvântul
  owner-ului); pornite pe 24.11, cu brief-urile date: relieful (18.1↑) și cotele (10.4↑). Propus, la owner: ADR 0232
  (`#17`). **La owner:** fereastra exportului, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului,
  „cine unește în `main`”.
- 24.11.2026, la prânz: **două linii noi, relieful și cotele** (la „ce urmeaza in roadmap si nu a fost atins deloc si
  putem incepe” și, după lista cu recomandarea, „ok, scrie brief-ul pentru relief si pentru cote”, în sesiunea
  principală). **Relieful** (felia 18.1↑, adusă din etapa 18: nucleul reliefului, relieful din imagine, prelucrarea 3D
  din relief): ramura `wip/18.1-relief`, ADR-urile 0310–0329, canalul `relief`, nota `docs/linii/relief.md`. E primul
  lucru din blocul relief + 3D (etapele 18–24), care ține 31 din cele 40 de rânduri v1 ale pragului încă nepornite; se
  sprijină pe ce e deja hotărât (straturi Float32 pe dale de 256 × 256, calculul în workere, fără GPU în v1, CAM 3D doar
  pe câmpul conservativ: `PLAN.md` §3, ADR 0010–0012, 0015) și pe sonda `docs/faza2/sonde/s5-relief`. **Cotele** (felia
  10.4↑, rândul „Cote” din prag, etapa 10): ramura `wip/10.4-cote`, ADR-urile 0330–0339, canalul `cote`, nota
  `docs/linii/cote.md`. Amândouă pornesc cu ADR-ul propus, schița și întrebările, apoi codul, la răspunsuri. **Schema
  documentului:** e v27; rezervate, v28 pentru cote și v29 pentru relief (numărul îl dă sesiunea principală, la cerere).
  Brief-urile, date owner-ului ca fișiere, de lipit în câte o sesiune cloud nouă, pe ramura ei. Celelalte neatinse, în
  ordinea în care pot porni: 3D din modele (etapa 20, după nucleul reliefului), textura din freză, ghilotina și
  burghiele multiple (etapa 17), transformarea traseelor (etapa 10, după fereastra exportului), canelurile, teșirea și
  Raised Round (etapa 16, după 16.A↑b), facturarea (etapa 27, după deciziile owner-ului pe niveluri); și patru linii
  hotărâte pe 13.11, nepornite: proiectele multiple cu fișierul `.cvs2`, clipboardul, simularea ca vedere unică,
  editarea textului pe loc.
- 24.11.2026, la prânz: **plafonul pornirii 120 kB** („ok, ridica plafonul pornirii la 120 kB”, în sesiunea principală,
  după raportul unirii a paisprezecea: pornirea cu ușa și cu Atelierul era la 114,7 / 115 kB, cu 0,3 kB rămași). ADR
  0145 (scris de sesiunea principală, pe `unire-2411f`); constanta porții din `scripts/build-determinist.ts`. Sub
  plafon stau, ca până acum, toate trei măsurile: pornirea, pornirea cu ușa și pornirea cu ușa și bucata aranjamentului
  ales; acum rămân ~5,3 kB. **Regula feliilor nu se schimbă:** ce nu trebuie înaintea primei randări stă într-o bucată
  la cerere, iar felia își spune în raport cât adaugă în pornire. Totalul (900 kB, ADR 0301), ușa (8 kB), `/admin` și
  contul rămân. O creștere următoare cere iar decizia scrisă.
- 24.11.2026, la prânz (a paisprezecea unire din cloud): **3.Ts (ventilatorul cu carcasă), A.11b–A.11e (utilizarea
  aplicației: pașii la raportare, cronologia unui om, sesiunea raportării, disocierea) și 16.A↑b-1 (documentul v27 și
  valorile frezei în program) unite în `main`**, în lot (sesiunea principală, ramura `unire-2411e`, din `fafb95e7`).
  **3.Ts** (linia elicelor, ramura `wip/3.Tq-elice`, `3218781c`, PR-ul `AndreiBesliu/cvs2#15`; ADR 0282, „Implementarea
  (3.Ts)”; la „continua” al owner-ului, în sesiunea liniei), unită în `e14e553a`: a treia piesă a filei „Elice” din
  atelierul Easy 3Draw, cu două piese: rotorul (3–12 palete răsucite, cu pas constant, cu un inel la alegere) și carcasa
  (tubul tipărit în picioare, cu 2 sau 4 urechi groase cât o grindă, cu găurile pe grila axului); „Repede” pe grila de
  știfturi și „Fă ventilatorul”; privirea pe randare a găsit peretele carcasei peste marginea găurii de deasupra
  urechii, reparat cu un canal prin perete; pachetul 18.22.0; otrăvurile 134 / 134 și 9 / 9. **A.11b–A.11e** (linia
  adminului, ramura `wip/A.1-admin`, `c3f80a74`, PR-ul `AndreiBesliu/cvs2#13`; ADR 0262; `3.Ao`–`3.Ar` în fișa etapei
  3), unite în `8ccb66e8`: bifa „Atașează ultimii pași din aplicație” la raportare, arătați în fila Tichete;
  permisiunea nouă „Utilizare: sesiuni”, cu Activitatea unui cont (fila Utilizatori) și Sesiunea raportării (fila
  Tichete), citite prin server, cu auditul fiecărei citiri; „Desparte utilizarea de cont…”, cu pseudonimul ținut doar
  pe server; otrăvurile 10 / 10, 19 / 19, 11 / 11 și 12 / 12. A.11 e încheiată. **16.A↑b-1** (linia frezelor, ramura
  `wip/16.A-freze`, `112c32f6`, PR-ul `AndreiBesliu/cvs2#16`; ADR 0300 §5; la „continua” al owner-ului), unită în
  `32b33a42`: **documentul v27** (`biblioteca`, `regim` și `tais` pe orice freză a unei operații; migrarea doar cu
  numărul), oracolul documentului și corpusul de aur la v27, iar în program turația, avansul și plonjarea fiecărei freze
  (fără valori, programul de azi, octet cu octet); fără interfață încă (vine în 16.A↑b-2); otrăvurile 34 / 34. **Un
  câmp nou al documentului ia de acum v28.** Completul liniei căzuse întâi la `placute.spec.ts` (cerea documentul salvat
  la v26), reparat în `112c32f6`. Ciocnirile lotului: DEVLOG, un rând de tabel în fișa etapei 3 și catalogul
  controalelor, scris din nou pe ramura de unire (trasarea și adminul îl atinseseră). Adminul împinsese A.7 peste
  commit-ul raportat: s-a unit commit-ul, nu vârful; vârfurile elicelor și frezelor aduceau doar `main`. **La publicare
  merge și serverul:** funcțiile `utilizare` și `tichete`, regulile Firestore (colecția pseudonimelor rămâne închisă) și
  două indexuri compuse pe `utilizare`. Porțile lotului, în CI, verzi la prima trecere pe `32b33a42` (completul,
  48 min 55 s): unit 10 111 / 0 (12 sărite, pe Linux), e2e 655 / 655, funcțiile pe emulatoare 126 / 126, paginile
  53 / 53; completele liniilor, verzi (`3218781c`; `eaa0a356`, cu codul lui `c3f80a74`; `112c32f6`); **pornirea
  109,9 kB (plafonul 115; cu ușa 114,4, cu Atelierul 114,7: mai sunt 0,3 kB)**, totalul 806,1 / 900 kB, `/admin`
  137,9 / 200, contul 30,1 / 32. Lotul al treisprezecelea (`fafb95e7`, 25.8↑b) era încă în drum spre test: completul
  lui pe `main` rula la unire. Urmează, la raport: A.7 (adminul pe telefon, pe ramură), 16.A↑b-2. Neunită, la cuvântul
  owner-ului: fereastra exportului (`AndreiBesliu/cvs2#11`). Propus, la owner: ADR 0232 (auditul UI/UX al extensiilor,
  `#17`). **La owner:** plafonul pornirii (mai sunt 0,3 kB: următoarea felie care adaugă în pornire nu mai încape),
  fereastra exportului, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”.
- 24.11.2026, înainte de prânz (a treisprezecea unire din cloud): **25.8↑b („Calibrează” și „Trasează…” din imaginea
  de pe foaie) unită în `main`** (sesiunea principală, ramura `unire-2411d`, din `df9ae539`). Linia trasării, ramura
  `wip/25.1-trasare`, `ed6014c5`, PR-ul `AndreiBesliu/cvs2#14` (ADR 0272 §6, §7, §10; pornită de owner în sesiunea
  liniei, la „pornește 25.8↑b”), unită în `f7f4510f`. În rândul imaginii din „Imaginile foii”: **Calibrează** (clic pe
  cele două capete ale unei lungimi cunoscute, apoi distanța adevărată: imaginea se scalează uniform, în jurul primului
  capăt, într-un pas de anulare) și **Trasează…** (zona trasă peste imagine sau toată imaginea; fereastra trasării se
  deschide la scara imaginii, iar „Importă” pune vectorii exact peste ea, la locul și rotirea ei); raportul foilor spune
  numele imaginilor fiecărei foi. Cât ține un mod al pânzei, editorul e oprit (`Editare.activ`), și în modul urechilor
  alese. Documentul rămâne v26; nimic pe server; otrăvurile 46 / 46. Ramura avea `main` (`df9ae539`); nicio ciocnire,
  iar codul unirii e chiar al lui `01474f96` (`git diff` gol în afara fișierelor `.md`), pe care au trecut porțile
  liniei. Porțile, în CI, verzi pe `01474f96` (completul, 51 min 40 s): unit 10 066 / 0 (12 sărite, pe Linux), e2e
  649 / 649, funcțiile pe emulatoare 122 / 122, paginile 51 / 51; **pornirea 109,8 kB (plafonul 115; cu ușa 114,3, cu
  Atelierul 114,6: mai sunt 0,4 kB)**, totalul 804,7 / 900 kB, `/admin` 135,0 / 200. Înainte, lotul al doisprezecelea a
  ajuns pe test (`df9ae539`, 24.11, 09:41), cu serverul. **Lotul următor, pregătit:** 3.Ts (elicele: ventilatorul cu
  carcasă, Easy 3Draw 18.22.0; `AndreiBesliu/cvs2#15`, completul verde pe `3218781c`), A.11b–A.11e (adminul, `#13`,
  completul în lucru) și 16.A↑b-1 (frezele: documentul v27, `#16`; completul pe `f5f1177b` a căzut pe o probă a
  plăcuțelor care cerea documentul salvat la v26, reparată de linie în `112c32f6`, cu completul reluat). Unirea lor de
  probă, locală, cu trasarea: ciocniri doar în DEVLOG, în fișa etapei 3 și în catalogul controalelor (scris din nou);
  tipurile, importurile și traducerile trec; pornirea 109,9 kB (cu ușa 114,4, **cu Atelierul 114,7 / 115**), totalul
  806,1 / 900, `/admin` 137,9 / 200. Neunită, la cuvântul owner-ului: fereastra exportului (`#11`). Propus, la owner:
  ADR 0232 (auditul UI/UX al extensiilor, linia bibliotecii, `#17`). **La owner:** plafonul pornirii (după lotul
  următor rămân 0,3 kB), fereastra exportului, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului,
  „cine unește în `main`”.
- 24.11.2026, dimineața (a douăsprezecea unire din cloud): **A.10 și A.11a (utilizarea aplicației: fluxurile și pașii
  dinaintea unei erori) unite în `main`** (sesiunea principală, ramura `unire-2411c`, din `883a8caa`). Linia adminului,
  ramura `wip/A.1-admin`, `0580f504`, PR-ul `AndreiBesliu/cvs2#13` (ADR 0262; `3.Am` și `3.An` în fișa etapei 3), unite
  în `7f6f4069`. **A.10:** jobul de noapte scrie și fluxurile zilei: secvențele (3 și 4 acțiuni reușite la rând, pe
  sesiune; cele mai dese 150 pe zi) și drumul principal ca pâlnie (deschiderea, desenul sau importul, rolul, exportul
  G-code reușit, lucrarea pe mașină; fiecare sesiune, până la pasul cel mai departe); în fila Utilizare, secțiunea
  Fluxurile și durata unei sesiuni (mediana); otrăvurile 23 / 23. **A.11a:** raportul unei erori poartă ultimii pași ai
  omului dinaintea ei (implicit 30, din Setări; 0 îi oprește): felul, id-ul, rezultatul și cât înainte, fără nimic din
  desen; pașii se iau în clipa erorii; serverul îi verifică pas cu pas și aruncă ce nu e un pas, nu raportul; fila Erori
  îi arată sub eroarea aleasă; nota de confidențialitate o spune, în ambele limbi; A.11 s-a despărțit în A.11a–A.11d;
  otrăvurile 29 / 29. Ramura mersese mai departe (A.11b, A.11c), deci sesiunea principală a întrebat linia ce commit
  unește, iar linia l-a scris în PR. Față de `82ec5424`, cu completul verde, `0580f504` adaugă doar traducerile
  roadmap-ului, otrăvurile și documente (rapidul verde pe el); codul unirii e chiar al lui `0580f504` (`git diff` gol în
  afara fișierelor `.md`). Ramura avea `main` `89962b4d` (până la `883a8caa`, doar documente); nicio ciocnire. **La
  publicare merge și serverul:** funcțiile `logClientError` (primește pașii) și `agregaUtilizarea` (scrie fluxurile);
  fără reguli, permisiuni sau indexuri noi. Porțile, în CI, verzi pe `82ec5424` (completul, 42 min 8 s): unit
  10 054 / 0 (12 sărite, pe Linux), e2e 646 / 646, funcțiile pe emulatoare 122 / 122, paginile 51 / 51; **pornirea
  109,6 kB (plafonul 115; cu ușa 114,1, cu Atelierul 114,4: mai sunt 0,6 kB)**, totalul 800,1 / 900 kB, `/admin`
  135,0 / 200. Înainte, lotul al unsprezecelea a ajuns pe test (`883a8caa`, 24.11, 07:14), cu serverul. Pe ramura liniei,
  în lucru: A.11b (bifa „Atașează ultimii pași” la raportare; completul pe `cd00283b`), A.11c (cronologia unui om), apoi
  A.11d și A.7. Neunită, la cuvântul owner-ului: fereastra exportului (`AndreiBesliu/cvs2#11`). **La owner:** fereastra
  exportului, verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”, plafonul
  pornirii (mai sunt 0,6 kB).
- 24.11.2026, dimineața (a unsprezecea unire din cloud): **A.9a și A.9b (utilizarea aplicației: sumele zilei, jobul de
  noapte și fila Utilizare) unite în `main`** (sesiunea principală, ramura `unire-2411b`, din `89962b4d`). Linia
  adminului, ramura `wip/A.1-admin`, `dbb0306a`, PR-ul `AndreiBesliu/cvs2#13` (ADR 0262; `3.Ak` și `3.Al` în fișa etapei
  3), unite în `95dddbe0`. **A.9a:** jobul `agregaUtilizarea` (02:30, ora României, cu marcajul lui) adună ieri și
  alaltăieri în `utilizareZi/{zi}`: acțiunile, uneltele, ferestrele, dialogurile, clicurile, calculele, mașina și
  imprimanta, sesiunile, cu clienții deosebit de personal; fără conturi în sume (oamenii distincți, într-o schiță
  HyperLogLog, deci aproximativi), așa că sumele se pot ține 2 ani; permisiunea nouă „Utilizare: citește”; otrăvurile
  27 / 27. **A.9b:** fila Utilizare din `/admin` (grupul Produs, după Sugestii): perioada (7, 30 sau 90 de zile) și cine
  (clienții, personalul, toți); oamenii activi, sesiunile, programele exportate, refuzurile; cele mai folosite acțiuni;
  ce nu se folosește; frecările; duratele calculelor; citește doar sumele zilelor, niciodată loturile; otrăvurile
  26 / 26. Ramura avea `main` (`89962b4d`); nicio ciocnire, iar codul unirii e chiar al lui `6b79c317` (`git diff` gol în
  afara fișierelor `.md`), pe care au trecut porțile liniei. **La publicare merge și serverul:** funcția nouă
  `agregaUtilizarea`, regulile Firestore (`utilizareZi`, citite cu „Utilizare: citește”) și indexurile (TTL pe
  `utilizareZi`); funcția `utilizare`, neschimbată. Porțile, în CI, verzi pe `6b79c317` (completul, 52 min 37 s): unit
  10 045 / 0 (12 sărite, pe Linux), e2e 646 / 646, funcțiile pe emulatoare 120 / 120, paginile 50 / 50; pornirea
  109,4 kB (plafonul 115; cu ușa 113,9, cu Atelierul 114,2), totalul 799,6 / 900 kB (neschimbat), `/admin` 133,2 / 200,
  fila Utilizare 3,8 / 25 (doar online). Înainte, lotul al zecelea a ajuns pe test (`89962b4d`, 24.11, 04:59), cu
  serverul. Pe ramura liniei, în lucru: A.10 (fluxurile în fila Utilizare), apoi A.11 și A.7. Neunită, la cuvântul
  owner-ului: fereastra exportului (28.8↑a–b-3, `AndreiBesliu/cvs2#11`). **La owner:** fereastra exportului,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”.
- 24.11.2026, spre dimineață (a zecea unire din cloud): **A.8c și A.8d (utilizarea aplicației: dialogurile, clicurile
  fine, calculele, mașina și imprimanta) unite în `main`** (sesiunea principală, ramura `unire-2411a`, din `b1797933`).
  Linia adminului, ramura `wip/A.1-admin`, `fbbc8934`, PR-ul `AndreiBesliu/cvs2#13` (ADR 0262; `3.Ai` și `3.Aj` în fișa
  etapei 3), unite în `80d3eb70`. **A.8c:** clicul pe un control pleacă după numele lui din cod (catalogul
  `src/app/catalogControale.ts`, strâns de `scripts/catalog-controale.ts`); un clic pe un buton al registrului sau pe o
  unealtă nu pleacă a doua oară; rotița e zoom pe pânză și derulare în rest, cu treptele unui gest într-un eveniment;
  dialogurile: deschis, apoi „gata” sau „renunțat”; clicurile, derularea și zoom-ul se opresc din Setări. **A.8d:**
  felurile `calcul` (calculele bazinului CAM și citirea importului, cu durata și mărimea în trepte), `masina` (legarea,
  lucrarea, codurile controlerului) și `imprimanta` (legarea, lucrarea, evenimentele), fără nume, adrese, G-code sau
  valori exacte; nota de confidențialitate le spune, în ambele limbi. Otrăvurile 32 / 33 (E11, rotița prinsă la bubbling,
  echivalentă azi) și 36 / 36. **Regula ei, pentru toate liniile:** un atribut de nume nou, scris de mână pe un control,
  cere `node scripts/catalog-controale.ts --scrie`; la unirea a două linii cu controale noi, catalogul se scrie din nou
  pe ramura de unire. Ramura avea `main` (`b1797933`); nicio ciocnire, iar codul unirii e chiar al lui `ba1b4b0c` (`git
  diff` gol în afara fișierelor `.md`), pe care au trecut porțile liniei. **La publicare merge și serverul:** funcția
  `utilizare`, cu felurile noi ale contractului; fără reguli sau indexuri noi. Porțile, în CI, verzi pe `ba1b4b0c`
  (completul, 61 min 29 s): unit 10 031 / 0 (12 sărite, pe Linux), e2e 646 / 646, funcțiile pe emulatoare 117 / 117,
  paginile 48 / 48; pornirea 109,4 kB (plafonul 115; cu ușa 113,9, cu Atelierul 114,2), totalul 799,6 / 900 kB, `/admin`
  131,3 / 200. Înainte, lotul al nouălea a ajuns pe test (`b1797933`, 24.11, 02:07). Pe aceeași ramură a liniei, cu
  completul verde pe `c549a600`, dar neraportate încă: A.9a (sumele zilei, jobul de noapte `agregaUtilizarea`, permisiunea
  „Utilizare: citește”) și începutul lui A.9b; vin în lotul următor, cu funcția, regulile și indexurile lor. Neunită, la
  cuvântul owner-ului: fereastra exportului (28.8↑a–b-2, `AndreiBesliu/cvs2#11`). **La owner:** fereastra exportului,
  verificarea juridică (GDPR) a utilizării aplicației înaintea live-ului, „cine unește în `main`”.
- 24.11.2026, noaptea (a noua unire din cloud): **16.A↑a (biblioteca de freze) unită în `main`, cu plafonul total
  de 900 kB** (sesiunea principală, ramura `unire-2311k`, din `ebfb1f82`). **16.A↑a** (linia frezelor, ramura
  `wip/16.A-freze`, `218eed21`, PR-ul `AndreiBesliu/cvs2#12`; ADR 0300, acceptat de owner cu „Da, 1a–6a”, în sesiunea
  liniei), unită în `02a5864a`: fereastra „Frezele mele” (din meniul contului și din paletă), cu lista pe feluri,
  editorul cu silueta la scară, frezele de pornire și fișierul JSON / CSV; frezele (plată, în V, de gravare) stau în
  browser; documentul și serverul, neschimbate (alegerea în proiect, cu documentul v27, vine în 16.A↑b; contul, în
  16.A↑c); otrăvurile 46 / 46; felia: pornirea +0,2 kB, totalul +9,0 kB. Owner-ul îi ceruse liniei unirea („ok, cand e
  verde fa unirea”); linia a scris întâi aici, felia era deja în lot, deci unirea a rămas a sesiunii principale.
  **Plafonul total 900 kB** (ADR 0301, scris de linia frezelor pe ramura ei, `30d5ba17`, unit în lot în `813fa675`):
  decizia owner-ului, „ok, ridica plafonul total la 900 kB”, spusă în sesiunea liniei după raportul mărimii
  (793,6 / 800 cu 16.A↑a). **Pornirea rămâne 115 kB** (cu ușa și cu Atelierul, 114,2: mai sunt 0,8 kB). Ciocnirile, două
  rânduri de tabel (fișa etapei 3, registrul otrăvurilor), ambele părți păstrate. Porțile lotului, în CI, verzi la prima
  trecere: completul pe `02a5864a` (49 min 44 s): unit 10 018 / 0 (12 sărite, pe Linux), e2e 646 / 646, funcțiile pe
  emulatoare 115 / 115, paginile 45 / 45; rapidul pe vârful `cfd584a1`, care schimbă față de `02a5864a` doar constanta
  plafonului din `scripts/build-determinist.ts` și documente; pornirea 109,4 kB (cu ușa 113,9), **totalul 793,6 / 900
  kB**, `/admin` 130,3 / 200. Nimic pe server. Înainte, lotul al optulea a ajuns pe test (`ebfb1f82`, 24.11, 01:04), cu
  serverul: funcția `utilizare` creată, regulile și indexurile publicate. Gata pe ramuri, neunite: 28.8↑a (fereastra
  exportului, `AndreiBesliu/cvs2#11`: unirea la cuvântul owner-ului, după ce o încearcă pe canalul `export`) și A.8c
  (adminul; porțile verzi, fără raport încă). **La owner:** fereastra exportului, verificarea juridică (GDPR) a utilizării
  aplicației înaintea live-ului, „cine unește în `main`”.
- 23.11.2026, spre miezul nopții (a opta unire din cloud): **A.8a cu A.8b (utilizarea aplicației) și 25.9↑ (fereastra
  trasării, refăcută) unite în `main`**, în lot (sesiunea principală, ramura `unire-2311j`, din `f73f3f37`). **A.8a și
  A.8b** (linia adminului, ramura `wip/A.1-admin`, `55d26b81`, PR-ul `AndreiBesliu/cvs2#8`; ADR 0262, acceptat de owner
  pe 23.11, în sesiunea liniei, din formularul schiței; `3.Ag` și `3.Ah` în fișa etapei 3), unite în `5325b8fe`:
  editorul înregistrează ce folosesc oamenii (acțiunile registrului, cu sursa gestului și rezultatul, ferestrele,
  unealta) și trimite loturi, doar cu contul deschis, prin callable-ul nou `utilizare`; serverul reface fiecare eveniment
  din lista albă (`shared/utilizare.ts`), primește cel mult 120 de loturi pe cont și pe oră și le șterge singur după
  zilele din setări; setările le schimbă doar owner-ul, din fila Setări („Utilizarea aplicației”); colectarea, pornită
  pentru toți cei cu cont, e spusă în nota de confidențialitate (răspunsul owner-ului la ADR). Otrăvurile 48 / 48 și
  40 / 40. **La publicare merge și serverul:** funcția `utilizare`, regulile Firestore, indexurile (TTL pe `utilizare` și
  `limiteUtilizare`). **Înaintea live-ului:** legate de cont, evenimentele sunt date personale (GDPR), de verificat
  juridic (ADR 0262 §3). **25.9↑** (linia trasării, ramura `wip/25.1-trasare`, `2acad1d0`, apoi vârful `8c0eded9`, cu
  `main` adus și doar documente în plus; PR-ul `AndreiBesliu/cvs2#10`; ADR 0273, acceptat cu 1a–3a și cu celelalte
  variante ca opțiuni), unită în `4fe2d2ad`: fereastra trasării cât ecranul, fără derularea ei, cu previzualizarea care
  crește și butoanele mereu la vedere; grupurile Imaginea, Trasarea, Curățarea, Mărimea, cu rezumatul pe titlu; mărimea
  desenului scrisă direct (lățimea sau înălțimea vectorilor); raportul scurt, cu sugestiile ca butoane; otrăvurile
  24 / 24; felia +2,6 kB. Ciocnirea, doar în dicționarul traducerilor roadmap-ului (ambele părți păstrate, în ordinea
  cheilor). Porțile lotului, în CI, verzi la prima trecere pe `4fe2d2ad` (completul, 62 min 49 s): unit 9 995 / 0
  (12 sărite, pe Linux), e2e 637 / 637, funcțiile pe emulatoare 115 / 115, paginile 45 / 45; pornirea 109,2 kB (plafonul
  115; **cu ușa 113,7, cu Atelierul 114,0: mai e 1 kB**), **totalul 784,6 / 800 kB (mai sunt 15,4 kB)**, `/admin`
  130,3 / 200, contul 30,0 / 32. Înainte, lotul al șaptelea a ajuns pe test (`f73f3f37`, 23:54). Urmează, la raport:
  16.A↑a (frezele, `AndreiBesliu/cvs2#12`), 28.8↑a (fereastra exportului, `AndreiBesliu/cvs2#11`), A.8c. **De hotărât de
  owner: plafoanele** (pornirea și totalul) și „cine unește în `main`”.
- 23.11.2026, noaptea (a șaptea unire din cloud): **3.Xh (biblioteca extensiilor, refăcută) și 12.1↑e-3 cu 12.1↑e-4
  (pereții drepți și treptele în „Împreună (secțiunea)”) unite în `main`**, în lot (sesiunea principală, ramura
  `unire-2311i`, din `870e8759`). **3.Xh** (linia bibliotecii, ramura `wip/3.Xh-biblioteca-ui`, `611a3c5f`, PR-ul
  `AndreiBesliu/cvs2#4`; ADR 0231, acceptat cu „Da, 1a–4a”; la „ok, uneste-l” al owner-ului, spus în sesiunea liniei,
  care a scris întâi aici și a lăsat unirea lotului), unită în `2d1e482c`: fereastra „Biblioteca extensiilor” (lista și
  pagina extensiei, cu capturile, „Ce poate face” și „Ce e nou”), semnul extensiei (cărămida lui Easy 3Draw), o singură
  fereastră de confirmare, „Scoate” cu întrebare, tastatura, biblioteca în paleta de comenzi; Easy 3Draw 18.21.0;
  marginile din ADR 0230 și CSP-ul, neschimbate; otrăvurile 152 / 152; felia: pornirea +0,1 kB, totalul +3,7 kB.
  **Regulile ei, de acum:** o versiune nouă a unei extensii din bibliotecă își scrie rândul de „ce e nou” (primul din
  `noutati`, în `extensii/biblioteca.json`), altfel `biblioteca.ts --scrie` refuză; două linii pe aceeași extensie iau
  versiuni diferite (următoarea e 18.22.0); un prefix nou de acțiuni cere grupul lui în paletă. **La owner:** fondul
  semnului lui Easy 3Draw e gri-albăstrui, nu cremul din schiță (cremul se pierdea pe fila aleasă); rândul de „ce e nou”
  al lui 18.20.0 (elicea de barcă) e scris de linia bibliotecii, din fișa lui 3.Tr, și se poate schimba. **12.1↑e-3 și
  12.1↑e-4** (linia incrustațiilor, ramura `wip/12.1-incrustatii`, `0b676694`, PR-ul `AndreiBesliu/cvs2#7`; ADR 0179; la
  „12.1↑e-3, pereții drepți” și „12.1↑e-4, treptele” ale owner-ului), unite în `03460cab`: „Împreună (secțiunea)” din
  vederea 3D merge pe orice dop ales: în V, cu pereți drepți (ridicat, întors, sau decupat, neîntors) și în trepte, cu
  tabelul fiecăruia (5 rânduri la pereții drepți, 10 la trepte); jocul lateral, măsurat exact pe mutările nucleului
  (`src/sim/taiereExacta.ts`: grila de 0,1 mm nu vede un joc de o celulă); lemnul dopului e doar ce atinge desenul lui
  (miezul golului unui „O” decupat nu mai e socotit dop); la 1024 px, insula vederii 3D are lățimea zonei libere.
  Documentul rămâne v26; otrăvurile 67 / 67 și 35 / 35. Lotul s-a unit fără nicio ciocnire. Nimic pe server. Porțile
  lotului, în CI, verzi la prima trecere pe `03460cab`: unit 9 960 / 0 (12 sărite, pe Linux), e2e 628 / 628, funcțiile pe
  emulatoare 104 / 104, paginile 41 / 41 (completul, 61 min 45 s); pornirea 108,6 kB (plafonul 115; cu ușa 113,1, cu
  Atelierul 113,4), **totalul 778,6 / 800 kB (mai sunt 21,4 kB)**, `/admin` 127,5 / 200. Urmează, la raport: A.8a și
  A.8b (adminul, utilizarea aplicației, ADR 0262: atinge serverul) și 25.9↑ (fereastra trasării, refăcută, ADR 0273),
  raportate gata; în lucru: frezele (16.A↑a), fereastra exportului (28.8↑, propunerea). **De hotărât de owner înaintea
  lor: plafonul total** (feliile gata și cele în lucru nu mai încap toate în 21,4 kB).
- 23.11.2026, seara (a șasea unire din cloud): **A.6 (Roadmap, Documentație și Setări) unită în `main`; linia frezelor,
  pornită** (sesiunea principală, ramura `unire-2311h`, din `c8b235ab`). **A.6** (linia adminului, ramura
  `wip/A.1-admin`, `df098dad`, PR-ul `AndreiBesliu/cvs2#8`; ADR 0260 §8–§9; `3.Af` în fișa etapei 3; pornită la
  „porneste” al owner-ului), unită în `4497d639`: în Roadmap, „Ce așteaptă de la tine” rămâne la vedere lângă etape, iar
  pista cronologiei stă pe un rând doar cât are loc; în Documentație, cuprinsul documentului și, sub titlul unui ADR,
  starea lui; în Setări, istoricul fiecărei setări, din audit; fără reguli, permisiuni, indexuri sau funcții noi;
  `/admin` 125,6 → 127,5 / 200 kB; otrăvurile 54 / 54 (31 pe emulatoare). Ciocnirea, doar în DEVLOG. **Lotul fusese
  pregătit cu 11.3↑f** (`unire-2311f`, `66e88c92`, din `d6fd5d68`); 11.3↑f a unit-o sesiunea planșelor (decizia de mai
  jos), după ce ne-am scris: **sesiunile cloud își pot trimite mesaje** (`send_message`), deci o linie căreia owner-ul îi
  cere unirea îi scrie întâi sesiunii principale. A.6, pusă peste `c8b235ab`, are exact codul lui `66e88c92` (`git diff`
  gol în afara fișierelor `.md`), pe care au trecut porțile: unit 9 885 / 0 (12 sărite, pe Linux), e2e 609 / 609,
  funcțiile pe emulatoare 104 / 104, paginile 41 / 41; pornirea 108,5 kB (plafonul 115; cu ușa 113,0, cu Atelierul
  113,3), totalul 770,9 / 800 kB, `/admin` 127,5 / 200. Nimic pe server. **Linia frezelor** (la „Vreau sa pot crea freze
  l sau profiluri de freze in aplicatie si sa le salvez in cont” și „Da-mi un prompt pentru o sesiune dedicata
  frezelor.” ale owner-ului): felia 16.A↑ (biblioteca de freze, adusă din etapa 16), ramura `wip/16.A-freze` (din
  `c8b235ab`), ADR-urile 0300–0309 (0290–0299 sunt ale liniei exportului, `wip/28.8-export`, pornită de owner în aceeași
  zi), canalul `freze`; întâi ADR 0300 propus și schița cu întrebările (ce e un „profil de
  freză”, ce ține o freză, contul și lucrul offline, proiectele când freza se schimbă), apoi codul, la răspunsuri;
  promptul, dat owner-ului ca fișier. Urmează, la raport: 12.1↑e-3 și 12.1↑e-4 (incrustațiile), biblioteca extensiilor
  (3.Xh). La cuvântul owner-ului: A.7 și ADR 0262 (utilizarea aplicației, propus), 25.8↑b, 3.Ts. La owner: răspunsul la
  „cine unește în `main`” (recomandarea: doar sesiunea principală).
- 23.11.2026, seara (a cincea unire din cloud): **11.3↑f (urechile după reguli, pe laturi) unită în `main`**, la „ok,
  cand se poate fa unirea” al owner-ului, în sesiunea liniei planșelor (ramura `unire-2311g`, din `d6fd5d68`). Ramura
  `wip/11.1-plansele`, `527a95f3`, PR-ul `AndreiBesliu/cvs2#9` (ADR 0211, varianta c), unită în `f4601938`: în fereastra
  exportului, „Locurile” urechilor au și „pe laturile lungi”, „pe laturile scurte” și „la mijlocul laturilor”; laturile
  sunt bucățile drepte ale drumului frezei pe care încape o ureche, numărul de pe buclă se împarte pe laturile regulii,
  iar „la mijlocul laturilor” pune câte una pe fiecare; fără laturi drepte, programul modului „egale”, octet cu octet.
  Pe plăcuțele în rânduri, urechile de la mijlocul laturilor cad față în față cu ale vecinelor (placa 11 la 5 mm: nu se
  mai desprinde niciuna). Documentul rămâne v26; cu ea, ADR 0211 are toate cele trei variante; otrăvurile 54 / 54.
  **Ordinea cu lotul sesiunii principale:** unirea a fost pregătită întâi peste `unire-2311d` (`2ee60a88`, pe
  `unire-2311e`), cât îi rulau porțile; lotul a intrat în `main` refăcut, fără 3.Tr (unită între timp de linia elicelor),
  deci unirea a fost refăcută peste `d6fd5d68`, cu același cod (`git diff` gol în afara fișierelor `.md`), pe care au
  trecut porțile. Ciocnirea, doar în DEVLOG. Nimic pe server. Porțile, în CI, pe `2ee60a88` (același cod), verzi la
  prima trecere: unit 9 878 / 0 (12 sărite, pe Linux), e2e 609 / 609, funcțiile pe emulatoare 104 / 104, paginile
  38 / 38 (completul, 47 de minute); pornirea 108,5 kB (plafonul 115; cu ușa 113,0, cu Atelierul 113,3), totalul
  770,8 / 800 kB (+0,8), `/admin` 125,6 / 200. Linia planșelor n-are felie în lucru: tăierea plăcii 11 e a owner-ului,
  11.5↑b vine după etapa 13.
- 23.11.2026, seara (a patra unire din cloud): **25.8↑a (imaginile pe foaie) și A.5 (Utilizatori și Personal) unite în
  `main`**, în lot, cu reparația unei probe instabile a extensiilor (ramura `unire-2311e`, din `6f85243f`). **25.8↑a**
  (linia trasării, ramura `wip/25.1-trasare`, `2e8caa3e`, PR-ul `AndreiBesliu/cvs2#6`; ADR 0272), unită în `473f2e20`: o
  imagine rămâne pe foaie, sub desen, estompată, ca ajutor de desen, nici tăiată, nici exportată; „Păstrează imaginea pe
  foaie” și „Doar imaginea” în fereastra trasării, „Imaginile foii” în panou (miniatura, ochiul, lacătul, opacitatea,
  coșul); o imagine desfăcută se mută, se scalează și se rotește; octeții stau în browser, documentul rămâne v26;
  otrăvurile 43 / 43; totalul +7,0 kB, pornirea +0,5. **A.5** (linia adminului, ramura `wip/A.1-admin`, `fe026f9f`,
  PR-ul `AndreiBesliu/cvs2#8`; ADR 0260 §5–§6; `3.Ae` în fișa etapei 3), unită în `1b46c955`: Utilizatori cu tabelul
  conturilor, filtrele pe plan, căutarea, contul ales alături și istoricul planului; Personal cu felul intrării,
  invitațiile în aceeași listă și matricea rol × permisiune; fără reguli, permisiuni, indexuri sau funcții noi;
  otrăvurile 61 / 61. Ciocnirea, doar în DEVLOG. **Două sesiuni au scris în `main`:** lotul fusese pregătit pe
  `unire-2311d` (din `c010e3d1`) cu trei felii, între ele 3.Tr; cât îi rulau porțile, sesiunea liniei elicelor a unit ea
  3.Tr (`d262e57a`, decizia de mai jos), la cuvântul owner-ului. Push-ul lotului a fost refuzat (nu mai era
  fast-forward), deci nimic nu s-a pierdut: lotul a fost refăcut peste `6f85243f`, fără 3.Tr, iar codul lui e identic cu
  al lui `675d40ce`, pe care au trecut porțile (`git diff` gol în afara fișierelor `.md`). **Proba instabilă:** completul
  unirii a căzut întâi la `extensii.lucru.spec.ts:110` (clicul pe „Închide” din cadrul extensiei nu s-a mai întors, deși
  fereastra se închisese), ca pe ramura trasării mai devreme și ca pe 18.11 la `extensii.spec.ts:43`; reluat, a trecut.
  Reprodusă în container (3 din 200, pe zece lucrători) și reparată în `8287d66e` (doar probe): `clicCareInchideCadrul`
  (`test/e2e/ajutor-extensii.ts`) așteaptă cadrul scos, nu întoarcerea clicului; cu el, 400 / 400, din care în 5 clicul
  chiar nu s-a întors; otrava (gazda ignoră `host.inchide()`) e prinsă de ambele probe. Nimic pe server. Porțile, în CI,
  pe `675d40ce` (același cod): unit 9 855 / 0 (12 sărite, pe Linux), e2e 608 / 608, funcțiile pe emulatoare 104 / 104,
  paginile 38 / 38; pornirea 108,5 kB (plafonul 115; **cu ușa 113,0, cu Atelierul 113,3: mai sunt sub 2 kB**), totalul
  770,0 / 800 kB, `/admin` 125,6 / 200. Completul a ținut 60 min 46 s: peste vechea limită de 60, sub cea nouă de 90.
  Urmează, la raport: 11.3↑f (planșele, `AndreiBesliu/cvs2#9`, gata de unit), A.6 (adminul), 12.1↑e-3 și 12.1↑e-4
  (incrustațiile), biblioteca (3.Xh-1…3 gata pe ramură, PR-ul încă ciornă). La cuvântul owner-ului: 25.8↑b, 3.Ts.
- 23.11.2026, după-amiaza (a treia unire din cloud): **linia elicelor (reparația probelor atelierului și 3.Tr, elicea de
  barcă) unită în `main`**, la „deocamdata putem face unirea” al owner-ului, în sesiunea liniei (ramura `unire-2311d`, din
  `c010e3d1`). Ramura `wip/3.Tq-elice`, `8b1255b8`, PR-ul `AndreiBesliu/cvs2#5`, unită în `d262e57a`:
  - **reparația probelor atelierului** (`baa00ad4`, la „ia reparația probelor atelierului”; doar probe): spec-urile
    atelierului Easy 3Draw intră în 3D prin `test/e2e/ajutor-atelier.ts` (`threeDinPachet`, three.js din `vendor/`, nu de pe
    cdnjs; `intraIn3D`, care așteaptă pânza previzualizării): o scriere căzută peste redesenarea de după sosirea lui three.js
    se pierdea (5 din 101 la sosirea întârziată anume, 0 din 101 cu așteptarea). **O probă nouă a atelierului intră în 3D cu
    `intraIn3D`, nu cu un clic pe `[data-mod="3d"]`;**
  - **3.Tr** (la „pornește 3.Tr”; ADR 0282, „Implementarea (3.Tr)”): elicea de barcă, a doua piesă a filei „Elice”: 3–5
    palete late (conturul „ureche”), pasul constant, înclinate înapoi pe cerc, secțiunea ogivală, butucul cât paletele,
    capacul rotunjit, „Repede” pe grila de știfturi și „Fă perechea”; tipărită fără suport, cu partea dinspre barcă pe masă.
    Hotărâte la implementare, cu motivul în ADR: înclinarea pe cerc, nu spre pupa (aceea ar cere suport); fără „Ca LEGO”
    (singura elice LEGO de apă, a motorului de barcă, nu stă pe un ax LEGO); butucul crește cu elicea. Paletele și butucul
    celor două elice, din aceleași funcții (`paleteElice`, `butucElice`); elicea din 3.Tq, aceeași la octet (3 456 de
    combinații). Pachetul 18.20.0; otrăvurile 141 / 141 și 6 / 6.

  Ramura avea `main` adus (`c010e3d1`, ciocnirea doar în DEVLOG, rezolvată cu `rezolva-devlog.py`) și n-are `.lucru/`:
  arborele unirii e chiar al lui `8b1255b8` (`git diff` gol), deci porțile lui sunt ale unirii. Nimic pe server. Porțile, în
  CI, verzi pe `8b1255b8`: unit 9 825 / 0 (12 sărite, pe Linux), e2e 604 / 604, funcțiile pe emulatoare 104 / 104, paginile
  36 / 36; pornirea 107,9 kB (plafonul 115; cu ușa 112,3), totalul 763,1 / 800 kB, `/admin` 124,1 / 200; Easy 3Draw 18.20.0,
  460,6 kB. Publicarea pe test, la sesiunea principală (sau la cuvântul owner-ului). Urmează, la cuvântul owner-ului: 3.Ts
  (ventilatorul cu carcasă) și, dacă o vrea, înclinarea spre pupa ca opțiune (cu suport); deschise, gata de unit de
  sesiunea principală: 25.8↑a (`AndreiBesliu/cvs2#6`), A.5 (`#8`), 11.3↑f (`#9`).
- 23.11.2026, după-amiaza (a doua unire din cloud): **11.3↑e (urechile „unde ține”) și A.4 (Sugestii ca tablă) unite
  în `main`**, în lot (ramura `unire-2311c`, din `feecf82a`). **11.3↑e** (linia planșelor, ramura `wip/11.1-plansele`,
  `83b690a5`, PR-ul `AndreiBesliu/cvs2#2`; ADR 0211, varianta b), unită în `d3ffcbf3`: în fereastra exportului,
  „Locurile” urechilor au și „unde ține”: la fiecare export, aplicația taie întâi programul cu acele operații fără urechi,
  se uită la fundul foii (lemnul legat de marginea ei) și pune urechile unde palierul cade pe lemn legat, câte cere
  numărul, cât mai departe una de alta; cu lemn de jur împrejur ies cele de la distanțe egale, octet cu octet; lângă
  avertismentul pieselor desprinse, „Pune urechile unde țin”; documentul rămâne v26; otrăvurile 42 / 42. Linia a găsit
  că potrivirea dopului (12.1↑e-2) refuza o foaie cu urechi „unde ține” și a reparat-o: **un calcul nou care cere
  programul foii îl ia din `programFoii`** (`src/jobs/calculCam.ts`). **A.4** (linia adminului, ramura `wip/A.1-admin`,
  `20fb65de`, PR-ul `AndreiBesliu/cvs2#3`; ADR 0260 §4; `3.Ad` în fișa etapei 3), unită în `ddaa7ead`: fila Sugestii din
  `/admin` e o tablă, cu o coloană pe decizie și Respinsele strânse dedesubt; owner-ul trage un card în altă coloană sau
  îl mută din meniul „⋯”, iar la Respinsă și Amânată o fereastră cere nota; fără reguli, permisiuni, indexuri sau funcții
  noi; `/admin` 121,2 → 124,1 / 200 kB; otrăvurile 41 / 41 (27 pe emulatoare, cu `scripts/otravuri-emulatoare.py`, intrat
  în repo). Ambele ramuri aveau `main` adus și `.lucru/` scos. Ciocnirea, doar în DEVLOG (ambele părți păstrate). Nimic
  pe server. Porțile lotului, în CI, verzi la prima trecere pe `ddaa7ead` (și pe commit-urile liniilor): unit 9 813 / 0
  (12 sărite, pe Linux), e2e 599 / 599, funcțiile pe emulatoare 104 / 104, paginile 36 / 36; pornirea 107,9 kB (plafonul
  115; cu ușa 112,3), totalul 763,1 / 800 kB, `/admin` 124,1 / 200. Urmează, la raportul liniilor: 25.8↑a (trasarea:
  imaginile pe foaie, `AndreiBesliu/cvs2#6`) și reparația probelor atelierului Easy 3Draw (linia elicelor, la „ia
  reparația probelor atelierului” al owner-ului, `AndreiBesliu/cvs2#5`); 12.1↑e-3, în lucru; biblioteca (3.Xh), cu ADR
  0231 propus și întrebările la owner. La cuvântul owner-ului: 11.3↑f (regulile urechilor), A.5–A.7.
- 23.11.2026, după-amiaza: **3.Tq (elicele) unită în `main`, prima unire din cloud; linia bibliotecii, pornită**
  (sesiunea principală din cloud, ramura `unire-2311b`, din `8f122eb6`). **3.Tq** (linia elicelor, pilotul lucrului în
  cloud; ramura `wip/3.Tq-elice`, `40c13d6a`, PR-ul `AndreiBesliu/cvs2#1`; ADR 0282, acceptat cu 1a, 2a, 3a), unită în
  `0ae9c6c1`: fila „Elice” a atelierului Easy 3Draw, cu elicea din parametri, tipărită fără suport, cu prinderea LEGO,
  „Ca LEGO” (6041, 92842, 15790, cu cotele măsurate față de axa piesei și cu sensul ei) și „Fă perechea”; pachetul
  18.19.0; otrăvurile 138 / 138 și 4 / 4. Verificate înaintea unirii: versiunea și amprenta din
  `extensii/biblioteca.json`, nota liniei, lipsa `.lucru/`. Ramura avea deja `main`: nicio ciocnire, iar arborele unirii
  e cel al commit-ului raportat. Nimic pe server. Porțile, în CI, verzi la prima trecere pe `0ae9c6c1` (și pe
  `40c13d6a`, la linie): unit 9 795 / 0 (12 sărite, pe Linux), e2e 598 / 598, funcțiile pe emulatoare 104 / 104,
  paginile 34 / 34; pornirea 107,8 kB (plafonul 115; cu ușa 112,2), totalul 760,9 / 800 kB, `/admin` 121,2 / 200.
  **Pilotul sesiunii principale în cloud:** din container merg `gh run`, `gh workflow run`, `gh api` (PR-urile) și
  push-urile. Adresa de test era oprită de rețeaua mediului (403 de la proxy): gazda `cncvectorstudio-test.web.app` a
  intrat în mediul „CNC VS 2”, cu aprobarea owner-ului. Completul unirii a ținut 59 min 54 s din cele 60 permise (pasul
  rapid, 35 de minute pe un runner lent): limita lui e acum 90 de minute. **Linia bibliotecii** (la „poti sa pornesti
  un branch in care sa modificam libraria de plugin-uri? vreau ceva mai frumos si cu un UI/UX mai bun si atragator” al
  owner-ului): felia 3.Xh, ramura `wip/3.Xh-biblioteca-ui` (din `8f122eb6`), ADR-urile 0231–0239, canalul `biblioteca`;
  întâi capturile interfeței de azi, ADR 0231 propus și schița cu întrebările, apoi codul, la răspunsuri. Brief-ul îl
  lipește owner-ul într-o sesiune cloud nouă: pornirea unei sesiuni din container a fost refuzată de clasificatorul de
  permisiuni. Urmează: liniile în lucru în cloud (A.4, 12.1↑e-3, 11.3↑e, 25.8↑a), unite la raport; 3.Tr (elicea de
  barcă) și 3.Ts (ventilatorul cu carcasă), la cuvântul owner-ului.
- 23.11.2026, la prânz: **mutarea întregii producții în cloud** (la „ca sa fie clar, eu vreau sa mutam toata productia
  proiectului cvs2 in cloud, vreau sa dezvoltam toata aplicatia de acolo, cu toate worktrees si asa mai departe” și „În
  repo, docs/linii” ale owner-ului): ramura `wip/lucru-cloud-2` (`ec745716`), unită în `7c5adbf8`. Uneltele sesiunii
  principale în cloud: `.github/workflows/canal.yml` (canalele de previzualizare din GitHub Actions, cu WIF, în mediul
  `test`, doar pentru o ramură cu rapidul verde), `scripts/cloud/ci-si-publica.sh` (CI-ul și publicarea unui commit din
  `main`, de reluat în container), `run-name` în `publica.yml`; `docs/lucru-in-cloud.md` v3 (sesiunea principală în
  cloud, PR-ul liniei gata, canalele, ce rămâne pe calculatorul owner-ului). Notele liniilor în `docs/linii/` (18 note
  aduse din memoria sesiunii principale, `lectii.md`, indexul și `principala.md`), după ecranul repo-ului public.
  Publicarea pe test și pe live mergea deja din GitHub (`publica.yml`: serverul și hosting-ul). Urmează: liniile în
  lucru și sesiunea principală, mutate în cloud.
- 23.11.2026, dimineața (a treia unire, 10:30): **lotul de după pauză unit în `main`** (worktree-ul `unire`, ramura
  `unire-2311`, din `308b4cb7`). **12.1↑e-2** (incrustațiile: dopul întors în locașul simulat, ADR 0179), din
  `082435b4`, nu din vârful `wip/12.1-incrustatii` (WIP 12.1↑e-3), unită în `3fc56052`. **10.3↑o** (legarea căilor, ADR
  0182; `wip/10.3o-legare`, `27439b08`), unită în `ab7dc43d`: ciocnirile din `src/jobs/calculCam.ts` (tipul răspunsului)
  și `src/ui/actiuniExportCalcul.ts` (importul), rezolvate cu ambele părți (potrivirea din 12.1↑e-2, legarea din
  10.3↑o). **3.6v** (codurile imprimantei explicate, ADR 0195; `wip/3.6g-imprimanta`, `19e22f32`), unită în `75dc1f9a`.
  Nimic pe server: nicio funcție, nicio regulă. Porțile unirii, pe `75dc1f9a`: unit 9 786 / 0 (8 sărite), e2e 592 / 592,
  funcțiile pe emulatoare 104 / 104, paginile 34 / 34; pornirea 107,9 kB (plafonul 115), totalul 760,9 / 800 kB.
  Urmează: pilotul în cloud (elicele, 3.Tq), apoi liniile în lucru mutate în cloud (12.1↑e-3, 25.8↑a, 11.3↑e, A.4).
- 23.11.2026, dimineața, a doua unire: **corectura pregătirii cloud unită în `main`** (ramura `wip/lucru-cloud`,
  `383120f5`, unită în `301413f8`). După documentația mediilor cloud (citită pe 23.11), `scripts/cloud/pregatire.sh` nu
  mai iese cu eroare (o eroare ar opri pornirea sesiunii; ce lipsește se spune la „LIPSESC”), pune Node 26 în locul lui
  22, primul în PATH-ul imaginii, și ia Java 21 din imagine. `docs/lucru-in-cloud.md`: porțile întregi în CI (rapidul la
  push, completul pornit pe ramură), comenzile lungi în prim-plan (containerul se suspendă când stă), `npm ci` la
  pornire dacă lipsesc `node_modules`. Probele care citesc documentele, 57 / 57; `bash -n` pe script. Urmează
  linia-pilot în cloud, elicele (3.Tq), pe `wip/3.Tq-elice`.
- 23.11.2026, dimineața: **3.Tp↑b (pictogramele) unită în `main`, cu uneltele lucrului în cloud** (worktree-ul `unire`,
  ramura `unire-2211c`). **3.Tp↑b** (linia `galeria`, ramura `wip/3.Tp-galeria-pe-file`, `e641c18d` din `57457061`; ADR
  0281): un desen mic, doar linii, de culoarea textului, pe fiecare buton al galeriilor atelierului Easy 3Draw
  (`PICTOGRAME`, lângă `FAMILII`: o piesă nouă își pune desenul pe un rând, iar o probă unitară i-l cere); pachetul
  18.18.0; otrăvurile 18 / 18. Porțile unirii, pe `e641c18d`: unit 9 752 / 0, e2e 585 / 585, funcțiile pe emulatoare 104
  / 104, paginile 33 / 34 la prima trecere: `utilizatori.emulator.spec.ts:101` a așteptat 30 s rezultatul funcției, cu
  procesorul la 85 %; reluată singură, 3 / 3 (funcțiile, 104 / 104). **Lucrul în cloud** (`b8cdc05e`, la „neata! Putem
  sa mutam tot acest proiect in sesiune cloud? Vreau sa se faca in continuare sync pe folderul local, dar sesiunea sa
  lucreze in cloud pe repo din Github” și „Da, începe” ale owner-ului): `scripts/cloud/pregatire.sh` (mediul cloud, ca
  CI-ul), `docs/lucru-in-cloud.md` (o linie = o sesiune pe ramura ei: porțile ca în CI, otrăvurile într-o clonă, unirea
  și publicarea), `scripts/rezolva-devlog.py`, `scripts/ldraw/`; unitarele ramurii, 9 748 / 0 (8 sărite), cu tipurile,
  regulile de import și licențele. Urmează: mediul cloud (owner-ul) și linia-pilot, elicele (3.Tq).
- 22.11.2026, seara: **11.3↑d (urechile la locurile alese) și A.3 (Tichete) unite în `main`**, în lot (worktree-ul
  `unire`, ramura `unire-2211b`). **11.3↑d** (linia planșelor, ramura `wip/11.1-plansele`, `44046e5d` din `76d5b0b3`;
  ADR 0211, varianta a, la „Da, toate recomandările” ale owner-ului): urechile se aleg pe desen, într-un mod al pânzei
  deschis din rândul exportului („Alege pe desen…”), iar lucrarea le taie la locurile alese; documentul trece pe v26
  (`urechi.mod`, `urechi.locuri`), deci o felie care mai urcă schema ia v27; otrăvurile 46 / 48 (două echivalente, la
  tăiere). **A.3** (linia adminului, ramura `wip/A.1-admin`, `528ee187` din `3ab5b1b3`; ADR 0260 §3 și ADR 0261,
  acceptat cu „Da, toate recomandările”): Tichete ca o conversație (lista și firul, cu legătura spre erori) și
  răspunsurile rapide (scrise în Setări, alese în câmpul răspunsului); `/admin` 113,7 → 121,2 / 200 kB; otrăvurile 59 /
  59. La publicare, pe lângă Hosting: regulile Firestore (citirea `setari/raspunsuriRapide` pentru cine răspunde la
  tichete) și funcția `tichete` (acțiunea `raspunsuriRapide`); celelalte funcții, indexurile și regulile Storage,
  neschimbate. Porțile lotului: verzi pe `528ee187` la prima trecere: unit 9 748 / 0 (8 sărite), e2e 581 / 581,
  emulatoarele 104 / 104 și 34 / 34; pornirea 107,7 / 115 (cu ușa 112,1), totalul 751,6 / 800, `/admin` 121,2 / 200.
- 22.11.2026, după-amiaza: **25.4↑c (îndreptarea scanărilor) unită în `main`, în lot cu ADR 0282 propus (elicele)**
  (worktree-ul `unire`, ramura `unire-2211`). **25.4↑c** (linia trasării, ramura `wip/25.1-trasare`, `9071e62f` din
  `78a44def`; ADR 0271): bifa „Îndreaptă scanarea”, în grupul „Îndreptarea”: unghiul unei scanări strâmbe găsit din
  cerneală (scorul lui Postl pe rânduri și pe coloane, până la 10° în fiecare parte, cu încrederea vârfului), imaginea
  rotită înapoi pe o pânză mărită, cu fondul din mediana marginii; unghiul se poate scrie de mână (cel mult 45°);
  otrăvurile 44 / 44. Pe aceeași ramură, ADR 0272 propus (imaginile pe foaie). La porțile lotului a căzut proba căutării
  din manual: presupunea că „ROTESTE” nu găsește importul, iar textul nou al trasării pomenește, corect, rotirea;
  exemplul negativ e acum contul (`bdc23ef6`). **ADR 0282 propus** (`52df1977`, din `df573f80` pe ramura
  `wip/3.Tq-elice`, în worktree-ul `rotite`; la „Vreau ca pluginul sa faca si elice, pentru imprimanta, si sa fie si
  configurabile elicele si compatibile cu lego” al owner-ului): o piesă „Elice” din parametri (2–8 palete, diametrul în
  știfturi, pasul, lățimea, forma, profilul, sensul și perechea, prinderea ca la rotițe, conul), tipărită fără suport,
  cu muchia de jos a paletelor pe masă; apoi elicea de barcă și ventilatorul cu carcasă; trei întrebări (unde stau, ce
  vine întâi, cotele din LDraw) în schița <https://claude.ai/artifact/CNQtNLBfAXxrMqQ3L4RebT>; codul (3.Tq), la
  răspunsuri. Ciocnirile, doar în DEVLOG și în indexul ADR (rândurile 0271 și 0272 din ramură, 0280 și 0281 din `main`).
  Porțile lotului: complete pe `9071e62f`: unit 9 674 / 0 (8 sărite), e2e 579 / 580 (căzută, determinist, proba căutării
  din manual: reparată în `bdc23ef6`, apoi `manual.spec.ts` 5 / 5), emulatoarele 101 / 101 și 29 / 29; rapide pe
  `52df1977`, cu propunerea (doar documente): unit 9 674 / 0, build-ul determinist; pornirea 107,2 / 115 (cu ușa 111,2),
  totalul 744,1 / 800.
- 21.11.2026, noaptea: **3.Tp↑a unită în `main`** (`ffae623a`, din `900a501a`; linia `galeria`, ramura
  `wip/3.Tp-galeria-pe-file`, la „da si vreau sa pornesti si restul worktrees” al owner-ului; ADR 0281 §4): câmpul
  „Caută o piesă” la capătul rândului de file ale atelierului Easy 3Draw (pe telefon, pe un rând al lui): la fiecare
  literă, piesele găsite din toate familiile, în ordinea filelor; fiecare cuvânt căutat începe un cuvânt din numele de
  pe ecran (în limba paginii), fără diacritice și fără majuscule; alegerea deschide piesa cu fila ei; Enter alege prima,
  Escape, × sau o filă întorc galeria familiei; nimic în date. Pachetul 18.17.0 (3.To luase 18.16.0; ramura a adus
  `main` `4667898a`). Otrăvurile 21 / 21 (F03 echivalentă, scoasă cu codul ei; G03 prinsă după întărirea probei).
  Porțile liniei verzi pe `bb52ac5e` (e2e 577 / 577, emulatoarele 101 / 101 și 29 / 29); ciocnirea cu lotul de seară,
  doar în DEVLOG. Porțile unirii, pe `ffae623a`: unit 9 658 / 0 (8 sărite), e2e 578 / 578, emulatoarele 101 / 101 și 29
  / 29, toate la prima trecere; pornirea 107,2 / 115 (cu ușa 111,2), totalul 741,9 / 800. Urmează, la cuvântul
  owner-ului: 3.Tp↑b (pictogramele).
- 21.11.2026, seara: **12.1↑e (titlul dopului) și 10.3↑n unite în `main`**, în lot peste 3.To (worktree-ul `unire`,
  ramura `unire-2111b`). **Titlul dopului** (linia incrustațiilor, ramura `wip/12.1-incrustatii`, `3d7e6214` din
  `f9c45042`; la „porneste-o si pe asta” și „Titlul dopului” ale owner-ului): butonul „Dopul N” numește incrustația ca
  bara de jos, nu prin id-ul intern („e1/e1”; ADR 0178, precizarea din 21.11); otrăvurile 7 / 7, canalul verificat.
  **10.3↑n** (linia tăierii, ramura `wip/10.3n-numere`, `fa8e7abe` din `2fce5b91`; ADR 0181): numărul fiecărui panou
  gravat pe el, opțional, oprit implicit (bifa „Gravează numărul fiecărui panou” și înălțimea cifrelor, ținute; fontul
  `relief-singleline`, locul cel mai apropiat de colțul din stânga-jos, în același pas de anulare cu tăierea);
  otrăvurile 15 / 15, totalul +2,3 kB (pornirea neschimbată). Pe aceeași ramură, **ADR 0182 acceptat** (legarea căilor:
  „Leagă căile”, în Verificare și în unealta Noduri; feliile 10.3↑o–10.3↑r, codul la cuvântul owner-ului). Ciocnirile,
  doar în DEVLOG (ambele părți păstrate). Porțile lotului, pe `fa8e7abe`: unit 9 658 / 0 (8 sărite), e2e 574 / 574,
  emulatoarele 101 / 101 și 29 / 29, toate la prima trecere; pornirea 107,2 / 115 (cu ușa 111,2), totalul 741,9 / 800.
  Urmează, la cuvântul owner-ului: codul lui ADR 0182 (10.3↑o), 3.Tp↑a (căutarea, 18.17.0), 12.1↑e-2.
- 21.11.2026: **3.To unită în `main`** (la „da si vreau sa pornesti si restul worktrees” al owner-ului): șenila în
  atelierul Easy 3Draw, direct în fila Roți (`86116b20`, exact `7040401d`; ADR 0280, pachetul 18.16.0). Zala ca LEGO
  57518 (38,4 × 17,2, pasul de 12): bolțul, clema cu strângerea din calibrare, limba și crestătura cu 0,15 mm pe parte,
  pereții canalului (găsiți la privirea peste LDraw: discul pinionului trece printre ei, deci șenila nu alunecă
  lateral), obrajii până la 8,4, găurile de știft la alegere. Pinionul ca 57519 (10) și 42529 (14), de la 6 la 40 de
  dinți (vârful, la pinioanele mici, sub placa zalei). Montajul pe două pinioane, cu axele în știfturi: zalele, jocul,
  distanța la care stă întinsă, pinioanele care s-ar atinge; „Fă șenila” pune zalele și pinioanele în listă. Recenzia
  proprie (Workflow-ul cu agenți, cerut de ultracode, refuzat a treia oară de clasificator): șenila întinsă pe
  pinioanele de 6, 10 și 14 nu atinge nimic (cu control negativ), două zale se îndoaie liber spre pinion până la 60°,
  secțiunile peste 57518 și 57519 din LDraw coincid, intrările ciudate trec; a găsit montajul socotit pe arcele cercului
  bolțurilor (curea pe R), cu 1,6…2,6 mm prea lung (10 cu 10 la 8 știfturi: 2 mm de joc și întinsă la 65, nu 4 și 66; la
  9 știfturi, 23 de zale în loc de 22), scăpat fiindcă proba lui era autoconsistentă: reparat pe coarde (cureaua pe r =
  z · 12 / 2π, la câțiva µm de media pe faze a înfășurătoarei convexe a bolțurilor), cu proba ancorată pe hârtie și pe
  înfășurătoare. Probele: unit 7, e2e 3, e2e-ul pluginului 35 / 35; otrăvurile 36 / 36 (3.Tp U03 mutată pe rândul Roți,
  prinsă). Porțile: rapide și lente verzi pe `a14a9a00`, la prima trecere (unit 9 651 / 0, e2e 573 / 573, emulatoarele
  101 / 101 și 29 / 29; pornirea 107,2 / 115, totalul 739,4 / 800). Rămase, la cuvântul owner-ului: lanțul dintr-o
  bucată, întinzătorul.
- 20.11.2026: **3.Tp și 12.1↑e unite în `main`**, în lot (worktree-ul `unire`, ramura `unire-2011b`). **3.Tp** (la „Da,
  pornește 3.Tp” și „prefer sa o pui intr-un worktree separat” ale owner-ului; linia `galeria`, ramura
  `wip/3.Tp-galeria-pe-file`): piesele atelierului Easy 3Draw pe file (`ae548a42`, exact `7feac1c2`; ADR 0281, acceptat
  cu 1b, 2a, 3a; pachetul 18.15.0). Trei familii ca file (Cărămizi, cu cele Technic; Legături; Roți), piesele familiei
  dedesubt, ultima piesă ținută minte pe fiecare filă, „Calibrare” și „Din cvs2” deoparte; o singură tabelă tip →
  familie; nimic mutat în date (o listă salvată cu 18.14.0 se deschide la fel). Porțile liniei pe `f63bc14e` (unit 9 640
  / 0, e2e 568 / 568, emulatoarele 101 / 101 și 29 / 29), otrăvurile 29 / 29. **12.1↑e** (linia incrustațiilor, ramura
  `wip/12.1-incrustatii`): dopul în vederea 3D (`b3c3970f`, din `c576138a`; ADR 0178): „Foaia / Dopul N”, dopul ales
  simulat pe semifabricatul lui; porțile liniei pe `2491fdc` (unit 9 631 / 0, e2e 562 / 562), otrăvurile 21 / 21;
  ciocnirea, doar în DEVLOG (ambele părți păstrate). Porțile lotului, pe `b3c3970f`: rapide și lente verzi (unit 9 644 /
  0, e2e 570 / 570, emulatoarele 101 / 101 și 29 / 29; totalul 739,4 / 800, pornirea cu ușa 111,2 / 115). Urmează, la
  cuvântul owner-ului: 3.To (șenila, direct în fila Roți), 3.Tp↑a (căutarea), 3.Tp↑b (pictogramele), 12.1↑e-2.
- 20.11.2026: **3.Tn unită în `main`** (la „neata! continua” al owner-ului, după „Nu acum” de seara trecută): conicele
  duble în atelierul Easy 3Draw (`55d3949e`, exact `b7ed3591`; ADR 0280, pachetul 18.14.0). Roata dreaptă de la rotițe,
  lată de 8·m, cu dinții teșiți la 45° spre ambele fețe, ca LEGO 32270 / 32269 (din LDraw): banda de mijloc (±2·m) e
  rotița; spre fețe, dintele se micșorează spre vârful conului (la r_p + 2·m de mijloc) și se subțiază liniar până la
  0,3·m pe flanc; piciorul la r_p − 2·m, discul cu 0,2 mm mai mic. Montajul: pe axe paralele ca rotițele; la 90°, planul
  de mijloc al fiecăreia la r_p(perechii) + 2·m de axul ei (8 mm față de o pereche de 12). Recenzia proprie (jocul
  perechilor la 90°, prin bisecție, la marginile calibrării) a găsit 12 cu 28 și 12 cu 36 pătrunse la jocul 0,05 cu
  subțierea de 0,1·m: cu 0,3·m, perechile LEGO au tot jocul (la 0,05 și 0,15), toate cele de la 12 dinți au joc, iar o
  roată de sub 12 dinți cu una de peste 2,5 ori mai mare e spusă în montaj (`strans`; 8 cu 24 se pătrunde). Gaura
  roților, într-o funcție comună (`gauraRoata`, rotițele identice la octet); otrăvurile 3.Th ale găurii, mutate pe ea.
  Otrăvurile 31 / 31 (E09 după întărirea probei e2e). Porțile: rapide și lente pe `b50ec0de` (unit 9 635 / 0, e2e 563 /
  563, emulatoarele 101 / 101 și 29 / 29; totalul 738,8 / 800), apoi e2e-ul pachetului 51 / 51 după îndreptarea unui
  comentariu (`10a0a34d`). Pe drum, la cererea owner-ului, **ADR 0281 propus**: piesele atelierului pe file (Cărămizi,
  Technic, Legături, Roți), cu schița <https://claude.ai/artifact/G32UWgWyP73uk26yMF3U26>; urmează 3.Tp (filele) sau
  3.To (șenila), la răspunsurile owner-ului.
- 19.11.2026: **3.Tm unită în `main`** (la „Da, pornește 3.Tm” al owner-ului): roata coroană în atelierul Easy 3Draw
  (`733bf5c2`, exact `c11cec4d`; ADR 0280, pachetul 18.13.0). Dinții pe fața de sus, tăiați chiar de pinionul ales
  (rotița îngroșată cu jocul, baleiată prin gol): un punct al secțiunii pinionului cade pe cilindrul fiecărei raze la
  s = r·asin(y / r) − r·φ·z1 / z2 (cu aproximarea din plan, jocul scădea la 0,17 mm la 24 / 24), iar prelungirea
  capului (jocul de la fund) taie doar sub capul real. Montajul ca la LEGO 3650 (din LDraw): planul de divizare la 4·m
  de fața de jos, deci axul pinionului la m·(4 + z1 / 2), adică 8 / 12 / 16 mm la pinioanele de 8 / 16 / 24. Perechea
  montată nu se pătrunde (pe roțile întregi, la jocurile 0,05 … 0,25 și la module ≠ 1) și e prinsă, cu jocul de 2·joc.
  Otrăvurile 40 / 41: U02 prinsă de proba nouă „plasa e înfășurătoarea”, U08 (baleiajul scurt) practic echivalentă;
  3.Tl E01, ambiguă după numele coroanei, redirecționată. Porțile: rapide pe `a27927b3` (unit 9 627 / 0, după
  reînregistrarea amprentei lui 18.13.0), lente pe `925762a7` (e2e 560 / 560, emulatoarele 101 / 101 și 29 / 29);
  totalul 738,8 / 800. Workflow-ul de recenzie, refuzat iar de clasificator: recenzia proprie. Urmează 3.Tn (conicele
  duble), la cuvântul owner-ului.
- 19.11.2026: **3.Tl unită în `main`** (la „Da, pornește 3.Tl” al owner-ului): roata conică în atelierul Easy 3Draw
  (`bd7351a4`, exact `21213162`; ADR 0280, pachetul 18.12.0). Perechea la 90°, cu axele în vârful comun; profilul Tredgold,
  proiectat din vârf, cu straturile spre vârf (`prismaStraturi`, harta punctelor pe strat). Planul de divizare e la 2·m de
  fața din spate, deci vârful la m·(2 + z2 / 2): la LEGO 87407, 12 mm de gulerul din spate (dedus din LDraw, unde dinții sunt
  stilizați), pe grila de jumătate de pas la perechile de 12, 20, 28, 36 … de dinți. Perechea montată nu se pătrunde pe roțile
  întregi și e prinsă (0,2 mm în plus n-o atinge, 0,9 mm da). Otrăvurile 25 / 25 din prima. Porțile, din prima, pe
  `e171418a` (codul unirii; apoi doar documentele): unit 9 626 / 0, e2e 557 / 557, emulatoarele 101 / 101 și 29 / 29.
  Totalul 738,8 / 800. Proiectul de tipuri al planificatorului (`trenulet.tipuri.test.ts`, `exactOptionalPropertyTypes`) e
  mai strict decât `tsc` al aplicației. Urmează 3.Tm (roata coroană), la cuvântul owner-ului.
- 19.11.2026: **3.Tk unită în `main`** (la „Da, pornește 3.Tk” al owner-ului): fulia în atelierul Easy 3Draw (`9f1202c7`,
  exact `2b92fa19`; ADR 0280, pachetul 18.11.0), cu cotele fuliei LEGO 4185 din LDraw (4185a, canalul în V; 4185b,
  canalul rotund), fața cu găurile de știft pe cercurile grilei și cureaua spre a doua fulie. Butucul și fața roților sunt
  acum funcții comune (`butucRoata`, `fataRoata`), cu ieșirile roții neschimbate pe 1 351 de combinații. Otrăvurile 37 / 37
  din prima; 3.Th E06, rămasă VOID de la 3.Tj, mutată. Porțile, din prima, pe arborele unirii (`f971aec8` plus documentele):
  unit 9 620 / 0, e2e 555 / 555, emulatoarele 101 / 101 și 29 / 29. Totalul 738,8 / 800, pornirea cu ușa 111,2 / 115.
  Urmează 3.Tl (roata conică), la cuvântul owner-ului.
- 19.11.2026: **12.1↑f-3, 12.1↑f-4 și 3.Tj unite în `main`** (la „unește ce se poate”): supracursa în fereastra
  exportului și, la alegere, pe tăieturile cât foaia (`70bc8169`, exact `2861e718`; ADR 0176 și 0177, acceptate de owner
  în sesiunea liniei). Linia se oprise în mijlocul aducerii lui `main`; ciocnirile, doar în listele de proprietăți din
  `DialogExport.tsx` și `ExportConectat.tsx` (`trimite`, din 28.1↑d, lângă `supracursa` și `prinFoaie`) și în DEVLOG,
  rezolvate la unire. Roata cu anvelopă în atelierul Easy 3Draw (`70cacc32`, exact `0ad10b6c`; ADR 0280, acceptat „Da,
  fără TPU” (1a, 2b, 3a) și implementat la 3.Tj, pachetul 18.10.0; cotele LEGO măsurate în fișierele LDraw, ținute în
  afara repo-ului). Secțiunea mărită a jantei peste profilul fin al nervurii LEGO a găsit, înaintea unirii, teșitura
  canalului intrată 0,46 mm în nervură: reparată, cu proba pe punctele măsurate. Proba e2e a rotițelor, rămasă la
  „șapte numere” în pasul de calibrare, adusă la zi. Porțile pe unire: unit 9 612 / 0, e2e 551 / 552 (S06 din
  `otravuri-28.spec.ts`, stratul traseului neapărut în 5 s sub încărcare: trece singură și 9 / 9 repetată cu trei
  lucrători), emulatoarele 101 / 101 și 29 / 29. Totalul 738,9 / 800, pornirea cu ușa 111,2 / 115, `/admin` 113,7 / 200.
  Urmează 3.Tk (fulia), la cuvântul owner-ului. Necomis în worktree-uri: adminul (cu ADR 0261 propus) și trasarea.
- 18.11.2026: **28.1↑d, 3.Th, 11.3↑c și 3.6u unite în `main`** (la „unește ce se poate”, după rapoartele liniilor):
  tăierea din butoane mari în Atelier și „Trimite la mașină” (`a88502ab`, exact `c957303b`; ADR 0250, cu §7 schimbat de
  owner în aceeași zi: pe telefon nu mai lucrăm la desen); rotițele dințate în atelierul Easy 3Draw (`7d9f6888`, exact
  `6e7dda2e`; ADR 0169, acceptat cu recomandările și implementat, pachetul 18.9.1; privirea pe roata reală a găsit,
  înaintea unirii, peretele găurii la roțile mici: 0,036 mm la roata de 8 cu gaură de ax și STL-ul deschis la modulul
  0,5, ambele reparate, cu probe și otrăvuri); proba urechilor la export (`5b5f7401`, exact `35be1a64`; ADR 0210,
  varianta b); filmele timelapse ale imprimantei (`d71817ab`, exact `427e187e`; ADR 0194 §C, care încheie grupul 3).
  Ciocnirile, doar în DEVLOG, fișa etapei 3 și registrul otrăvurilor (după cheie). Porțile pe unire, toate la prima
  rulare: unit 9 589 / 0, e2e 545 / 545, emulatoarele 101 / 101 și 29 / 29. Totalul 738,4 / 800, pornirea cu ușa 111,2 /
  115 (cu Atelierul 111,5), `/admin` 113,7 / 200. În lucru la linii: 12.1↑f-3 (incrustațiile), de unit la raport.
- 18.11.2026: **25.7↑ și A.2 unite în `main`** (la „unește ce se poate”, după rapoartele liniilor): PDF-urile scanate
  (`9bf53378`, exact `87192e03`; ADR 0270, primul din intervalul 0270–0279 al trasării) și Erorile cu Diagnoza adminului
  (`ce5bd472`, exact `86e3b36e`; ADR 0260, felia 3.Ab). La unirea lui A.2, jurnalul a păstrat un titlu gol al lui A.1,
  scos în `1bb885ff`. Porțile pe unire, toate la prima rulare: unit 9 564 / 0, e2e 528 / 528, emulatoarele 101 / 101 și
  29 / 29. Totalul 732,2 / 800, pornirea cu ușa 111,0 / 115, `/admin` 113,7 / 200. Propus, neunit: 3.Th (rotițele
  dințate în atelierul Easy 3Draw, ADR 0169) pe `wip/3.Th-rotite`, cu întrebările la owner. În lucru la linii: 3.6u și
  felia incrustațiilor.
- 18.11.2026: **12.1↑f-2, 25.6↑ și A.1 unite în `main`** (la „unește ce se poate”, după rapoartele liniilor): treptele
  incrustației cu pereți drepți (`89083cba`, exact `aa9f3257`; ADR 0175 §3–§6), imaginile TIFF (`fd63de8e`, exact
  `ba2ecaff`; ADR 0229, care încheie intervalul 0220–0229 al trasării) și carcasa adminului, cu fila Azi (`5147f448`,
  exact `531ecfb4`; ADR 0260, prima felie a liniei, `3.Aa` în fișă). Ciocnirile de tabel din registrul otrăvurilor și
  din fișa etapei 3 (rânduri vecine adăugate pe ambele părți) s-au rezolvat după cheia din prima coloană, iar un rând
  schimbat doar de o parte s-a luat de acolo (28.1b, din main). Porțile pe unire, toate la prima rulare: unit 9 548 / 0,
  e2e 527 / 527, emulatoarele 101 / 101 și 26 / 26. Totalul 729,1 / 800, pornirea cu ușa 111,0 / 115, `/admin` 112,2 /
  200. Înainte, `c302d73a` a ajuns pe test după o reluare a completului: `extensii.spec.ts:43` (clicul pe „Închide” din
  cadrul extensiei nu s-a mai întors, deși fereastra se închisese), de urmărit. În lucru la linii: 3.6u.
- 18.11.2026: **10.3↑m, 11.3↑b și 28.1↑c unite în `main`, cu două probe instabile reparate** (la „unește ce se poate”,
  după rapoartele liniilor; liniile oprite peste noapte, repornite la „neata! poti sa repornesti toate worktrees”):
  piesele puse de mai multe ori, la tăiere și conversie (`3ef10357`, exact `7ae0d5a`; ADR 0180), avertismentul
  urechilor, 2 × freza + 3 (`2bfbb4a6`, exact `65f404b`), și Atelierul, al doilea aranjament (`4cfe13d2`, exact
  `1f7cbd41`; ADR 0250). Probele: `trenulet.spec.ts:77` (clicul pe lista de piese dat cât foaia exportului încă se
  așază; a căzut în completul de pe `9361c831`) așteaptă acum „Timp de lucru” (`104adc41`), iar `pwa.spec.ts:432`
  citește bara și textul deodată (`1a4e59f0`); fiecare prinde o otravă. Porțile pe unire: unit 9 507 / 0, e2e 524 / 524,
  emulatoarele 101 / 101, iar partea lor Playwright 20 / 21 la fiecare din trei rulări, de fiecare dată altă probă
  (/admin fără cont, fereastra contului, fila Diagnoza): bucăți încărcate la cerere care n-au venit în 5 s, cu
  procesorul ocupat de porțile a patru linii; niciuna pe o cale atinsă de unire, iar cele două dintâi trec 4 / 4
  singure; poarta rămâne completul de pe GitHub. Totalul 721,2 / 800, pornirea cu ușa 111,0 / 115. ADR-urile 0270–0279
  sunt ale trasării (PDF-urile scanate, îndreptarea scanărilor). În lucru la linii: 3.6u, 25.6↑, A.1 și felia
  incrustațiilor.
- 17.11.2026: **10.3↑l și 25.3↑e unite în `main`, după reparația probei de viteză a luminii** (la „unește ce se poate”,
  după rapoartele liniilor): panourile pe foi (`eb237a77`, exact `e17a3521`: mărimea implicită care încape pe foaie,
  avertismentul, „Cât încape pe foaie”, „Așază pe foi…”, plus dinții drepți ai lui 10.3↑k pe grila egală) și rezultatul
  pe fiecare culoare (`a3e81f6d`, exact `19b0faf3`: ADR 0228 cu 1a–2a, lista „Rezultatul culorii” în pastilă). Înainte,
  completul de pe `71d488a7` (3.6t) căzuse la `trasare.culori.lumina.test.ts:132`: 1 504 ms la pragul de 1,5 s, cu
  corecția de 0,6–0,7 s local și 0,9–1,5 s în CI (fișierele de probe în paralel, pe 4 procesoare); reluat, a trecut, iar
  `b6aaa548` e pe test. Pragul e acum cel de redeschidere din ADR 0226 (2 s), cu cea mai bună din cel mult 3 rulări
  (`9361c831`, probat cu două otrăvuri). Porțile pe unire: unit 9 490 / 0, e2e 507 / 507, emulatoarele 101 / 101 și 21 /
  21 la reluare (la prima, callable-ul `sugestii` a stat 300 s: lucrătorul funcțiilor n-a pornit în 30 s, cu procesorul
  la 97 %, iar emulatorul lasă atunci cererea fără răspuns; nu e a unirii). Totalul 716,7 / 800, pornirea cu ușa 110,6 /
  115. 10.3↑m (`wip/10.3m-surori`) și 3.6u sunt în lucru la linii.
- 17.11.2026: **felia 3.6t a imprimantei unită în `main`** (din grupul 3 aprobat, „Da, grupul 3”; unită la „unește ce se
  poate”): istoricul imprimărilor (`18d9be07`, exact `02c29f2`), +4,8 kB, peste ținta de ~3,5 din ADR 0194, în plafonul de
  800. Porțile pe unire: unit 9 463 / 0, e2e 504 / 504 (o reluare: `extensii.masina.spec.ts:84`, senderul prin extensie,
  „pierdut” în loc de „pregatit”, la procesorul 27 %; fișierul singur, 4 / 4; nu e a feliei), emulatoarele verzi. Totalul
  715,6 / 800, pornirea cu ușa 110,6 / 115. Urmează 3.6u (filmele timelapse).
- 17.11.2026: **28.1↑b și probele instabile, unite în `main`** (la „unește ce se poate” și „ok, ia-le la rand”): fereastra
  Aspectul (`cf0550b`; rândul „Aspectul…” în meniul contului, după Manual; manualul cu 37 de capitole, ușile 108, testul din
  aplicație cu 36 de pași); probele care cădeau sub încărcare, fiecare reprodusă întâi și reparată la cauză (`912fece`:
  sonda GRBL, salvarea amânată a trenulețului, scriptul de început al probei trenulețului doar în pagina de sus, fontul SVG
  cu `test.slow()`, `FUNCTIONS_DISCOVERY_TIMEOUT=30` în unealta emulatoarelor); după porțile de unire (`34da53e`), proba
  tichetelor de pe emulatoare știe rândul nou din meniul contului, iar pornirea extensiei se așteaptă până la 20 s. Totalul
  710,8 / 800, pornirea cu ușa 110,6 / 115.
- 17.11.2026: **12.1↑f și 11.7↑ unite în `main`** (la „unește ce se poate”): gaura prin foaie a incrustațiilor, documentul
  v25, cu câmpurile treptei refuzate cu motiv până la 12.1↑f-2 (`d2ef229`; supracursa nu e încă în fereastră, deci gaura
  merge exact la grosimea foii); fișa plăcii 11, pregătită fără mașină (`b4d5641`, doar probe și documente; distanța 10,
  fiindcă la 5 urechile nu țin), cu tăierea plăcii la owner. Un câmp nou al documentului ia de acum v26. Totalul 709,5 /
  800, pornirea cu ușa 110,3 / 115.
- 17.11.2026: **felia 25.3↑d a trasării unită în `main`** (pornită la „Yes, all three”, unită la „unește ce se poate”):
  punctele pierdute de linia mediană (un disc mic centrat pe un colț de pixel dispărea fără să fie numărat) sunt numărate și
  păstrate (`dd21a8a`, arborele lui `366baf9`). Porțile pe unire: unit 9 421 / 0, e2e 494 / 494, emulatoarele verzi la a
  doua rulare (prima: limita de 10 s a emulatorului de funcții, sub încărcare); totalul 708,7 / 800, pornirea cu ușa 110,3 /
  115.
- 16.11.2026: **felia 10.3↑k a tăierii unită în `main`** (la „unește ce se poate”, după raportul liniei): tăierea în
  panouri, pe foaia activă (`c577549`, arborele lui `fc3a785`, cu `main` `5ab3941` adus în ramură). Porțile pe unire: unit 9
  414 / 0, e2e 494 / 494, emulatoarele verzi; totalul 708,2 / 800, pornirea cu ușa 110,3 / 115.
- 16.11.2026: **a doua rundă din 16.11, unită la „unește ce se poate”:** trasarea 25.3↑c (liniile mediane pe culori, ADR
  0227; `380c053`), prima felie a aranjamentelor, 28.1↑a (alegerea aranjamentului și densitatea, citite înaintea primei
  randări, ADR 0250 §4–§5; `8ea3057`), și planșele 11.6↑ (raportul foilor și lista de tăiere; `7d19a73`). Pornirea cu ușa
  110,3 / 115, totalul 703,4 / 800. Apoi, la „Start the three recommended slices: plate sheet 11, 25.3↑d and 28.1↑b?”,
  owner-ul: „Yes, all three”: fișa plăcii 11 (pregătită fără mașină; tăierea, a owner-ului), 25.3↑d (punctele pierdute de
  linia mediană) și 28.1↑b (fereastra Aspectul).
- 16.11.2026: **unirile de după pauză** („poti sa continui si sa pornesti si worktrees care s-au oprit, sau poti sa unesti
  ce se poate”, în sesiunea principală; apoi „Poti sa adopti si sesiunea de design si sa o pornesti”): liniile reluate, iar
  sesiunea designului coordonată ca o linie (commit-urile doar pe `wip/28.1-aranjamente`, unirea a sesiunii principale).
  Unite, fiecare felie gata pe linia ei: 12.1↑b-2 (punțile dopului drept, documentul v24, ADR 0174; exact `9a73aa6`),
  trasarea 25.4↑b (lumina pe culori, ADR 0226; exact `94bf287`) și reparația probei instabile `imprimanta.spec.ts:966`
  (`ead04c2`, doar probe), care făcuse roșu completul de noapte din 16.11. Feliile următoare, cu „unește ce se poate”, se
  unesc când linia raportează gata, fără altă întrebare.
- 13.11.2026: **felia 25.5↑ a trasării unită în `main`, cu plafoanele 115 / 800 înaintea ei** („Yes, merge it”, la „Merge
  trasarea 25.5↑ (straightening an angled sheet) into main?”, în sesiunea principală): unită exact la `1ca446b` (`07df71f`);
  ADR 0226 (propus) rămâne pe ramură. Plafoanele din ADR 0252–0253 („Da, 115 ／ 800”, în sesiunea designului; „Yes, 800 kB”,
  în sesiunea principală) au intrat în `main` înaintea liniei aranjamentelor, prin commit-ul lor (`6c37075`, unit în
  `70844ce`): trasarea și tăierea 10.3↑k treceau împreună de 700. Totalul 695,8 / 800, pornirea cu ușa 109,7 / 115.
- 13.11.2026: **banda vestirilor imprimantei (3.6s) reparată înainte, nu scoasă din `main`** („Fix forward”, la „Fix 3.6s
  forward, or revert it from main?”, în sesiunea principală): CI-ul complet pe `50f2595` a picat pe Linux
  (`imprimanta.spec.ts:108`: banda „pauză”, fixă, sus, la mijloc, acoperea butonul Reia; pe Windows trecea). Reparația
  liniei (`231e347`, ramura `fix/3.6s-anunt`, din `main`, fără 3.6t): banda stă într-un rând al meniului global și nu mai
  acoperă nimic, cu proba de lovire pe controale cât banda pauzei e la vedere (pica la 1024 px pe Windows înaintea
  reparației). Unită prin `2daddcc`, după porți.
- 13.11.2026: **plafoanele: pornirea 115 kB, totalul 800 kB** („Da, 115 ／ 800”, la „Ridic plafoanele la 115 kB pornirea și
  800 kB totalul?”, în linia aranjamentelor, înaintea feliei 28.1↑). După unirea planșelor, pornirea cu ușa era
  109,7 / 110 și totalul 690,1 / 700. 28.1↑ cere ~1–1,5 kB în pornire, iar linia ~40 kB. ADR 0252 și 0253, scrise pe ramura
  `wip/28.1-aranjamente` (worktree-ul `aranjamente`, din `d62e6b8`); ajung în `main` odată cu unirea liniei.
- 13.11.2026: **planșele (11.1↑–11.5↑) unite în `main`** („Da, cere-i”, în sesiunea designului, la „Îi cer sesiunii
  principale să unească planșele în main?”; verificat în transcrierea ei), exact la `8e8c755` (11.5↑ gata), prin unirea
  `fecce54`: mai multe foi, piesele legate, așezarea pe foi, plăcuțele și «Din CSV…», „Toate foile” la export. Documentul e
  v23 (literele plăcuțelor), deci un câmp nou de acum ia v24. Pornirea cu ușa 109,7 / 110, totalul 690,0 / 700. Codul
  aranjamentelor (ADR 0250) pornește din acest `main`, în worktree-ul `aranjamente`. Lucrul necomis al liniei (raportul
  foilor) rămâne în worktree-ul ei.
- 13.11.2026: **felia 12.1↑d a incrustațiilor unită în `main`** („Da, unește”, în sesiunea incrustațiilor, la „Unim felia
  12.1↑d în main?”; verificat în transcrierea ei): fundul doar cu freza V (ADR 0173), fără câmp nou (documentul rămâne v22,
  v23 rămâne a planșelor). Unită cât CI-ul complet de pe `main` era roșu din cauza lui 3.6s (banda „pauză” acoperea butonul
  Reia pe Linux): felia nu atinge imprimanta, deci nu ascunde nimic acolo.
- 13.11.2026: **schițele aranjamentelor sunt gata** („Da, sunt gata”, la „Declari schițele gata, ca să pornim codul
  aranjamentelor după planșe?”, după 11 ture și cele 76 de idei hotărâte):
  - canvas-ul e referința feliilor 28.1↑–28.7↑ (ADR 0250, „Schițele, încheiate pe 13.11”), iar o schimbare de design trece
    întâi pe canvas, apoi în ADR;
  - codul mai așteaptă doar unirea planșelor în `main` (`wip/11.1-plansele`, 11.5↑ gata, 46 de commit-uri neunite la
    13.11 seara), apoi pornește în worktree-ul `aranjamente`, cu 28.1↑ întâi.
- 13.11.2026: **ideile 63–76 din tura a unsprezecea a schițelor, acceptate cu recomandarea** („Da la toate”, la „Accepți
  recomandările la ideile noi 63–76?”, după tablele Exportă vectori…, Verifică vectorii, Tăierea și rolurile mele, „Din
  desen…” al imprimantei și Admin · Intrarea): 13 intră în feliile 28.x (ADR 0250, „Ideile turei a unsprezecea”), iar
  intrarea și stările goale ale adminului intră în ADR 0260, felia A.1.
- 13.11.2026: **felia 3.6s a imprimantei unită în `main`, înaintea planșelor** („Merge 3.6s now”, la „Merge planșele and
  3.6s together once planșele reports done?”, în sesiunea principală): unită exact la `e489f34` (notificările și semnul din
  bară, ADR 0194 §A); ramura merge mai departe cu 3.6t. Neîncercată încă pe K1C (canalul `imprimanta` o servește). Planșele
  aduc `main` cu ea: un conflict de importuri în `App.tsx`, iar pornirea cu ușa urcă cu ~0,2 kB (planșele 109,6 / 110
  înainte).
- 13.11.2026: **pagina `/admin` reproiectată, ADR 0260 acceptat** („vreau sa faci design si pentru admin”, apoi „Da la
  toate”, la „Accepți recomandările la ideile adminului 51–62?”, după cele 11 table ale rândului G de pe canvas):
  - o linie a ei, cu feliile A.1–A.7, pornită la cuvântul owner-ului, nu în feliile aranjamentelor;
  - bara laterală grupată, fila Azi prima, insigna TEST / LIVE, căutarea din antet, filele după schițe, adminul pe telefon;
  - permisiunile, regulile și Firestore Lite rămân; ADR-urile liniei sunt 0260–0269.
- 13.11.2026: **ideile 39–50 din tura a zecea a schițelor, acceptate cu recomandarea** („Da la toate”, la „Accepți
  recomandările la ideile noi 39–50?”, după tablele Transformarea și ancora, Nodurile și Pen-ul, Navigarea și ajutoarele de
  desen, Fonturile): 11 intră în feliile 28.x (ADR 0250, „Ideile turei a zecea”). Între ele, rotirea scrisă și butoanele
  − / + de zoom, care azi nu există. Textul de probă al fontului, luat din textul omului, devine linie separată.
- 13.11.2026: **ideile 28–38 din tura a noua a schițelor, acceptate cu recomandarea** („Da la toate”, la „Accepți
  recomandările la ideile noi 28–38?”, după tablele Acțiunile pe forme, Traseul și animația, Mesajele și confirmările, În
  engleză): toate intră în feliile 28.x (ADR 0250, „Ideile turei a noua”). Între ele, o zonă „mesaj” în tipul `Aranjament`,
  în care scriu toate uneltele, cu „Anulează” lângă mesaj, și proba fiecărei bare în ambele limbi, cu fontul lat.
- 13.11.2026: **ideile 17–27 din tura a opta a schițelor, acceptate cu recomandarea** („Da la toate”, la „Accepți
  recomandările la ideile noi 17–27?”, după tablele Conectarea mașinii, Proiectul gol, Textul și Tastatura): 10 intră în
  feliile 28.x (ADR 0250, „Ideile turei a opta”), între ele F6 prin zonele aranjamentului, cu ordinea în tipul
  `Aranjament`; editarea textului pe loc, cu dublu clic, devine linie separată.
- 13.11.2026: **cele 16 idei din schițele aranjamentelor, acceptate cu recomandarea** („Da la toate”, la „Accepți
  recomandările la cele 16 idei de pe Harta schițelor?”, după tura care a acoperit toate ecranele în cele patru aranjamente):
  - 13 intră în feliile 28.x. Lista și felia fiecăreia stau în ADR 0250, „Completarea din 13.11: ideile din schițe”.
  - Trei devin linii ale lor, fiecare cu ADR-ul ei: simularea ca vedere unică, proiectele multiple cu fișierul `.cvs2`,
    clipboardul.
  - Două butoane din stări au nevoie de altceva întâi: „Salvează ca fișier…” vine cu fișierul `.cvs2`, iar „Scrie aici”
    cere o felie a depozitului cu un singur scriitor.
- 13.11.2026: **fereastra Imprimanta urmează aranjamentul, ca Mașina** („Da, ca Mașina”, la „Fereastra Imprimanta urmează și
  ea aranjamentul, ca Mașina?”, după schița ei în Insule): se schimbă doar așezarea, cu aceleași module
  (`src/machine/imprimanta/`). ADR 0250 §6 completat; felia 28.6↑ cuprinde ambele ferestre.
- 11.11.2026: **codul aranjamentelor într-un worktree, după planșe** („Worktree după planșe”, la „Unde scriem codul
  aranjamentelor?”, după recomandarea sesiunii principale: în checkout-ul comun, două sesiuni care scriu se pot ciocni).
  Înlocuiește 2b din ADR 0250 („pe `main`”). Worktree-ul `aranjamente` (`wip/28.1-aranjamente`,
  `C:\Users\besli\cncvs2-lucru\aranjamente`, e2e pe 4182 și `127.0.9`, ADR-urile 0250–0259, canalul `aranjamente`) se face
  din `main` după unirea planșelor; până atunci, schițele continuă pe canvas.
- 11.11.2026: **designul sesiunii „Variante design CVS2” e direcția** („o sa mergem pe design-ul creat acolo”, la întrebarea
  despre suprapunerea aranjamentelor, ADR 0250–0251, cu mutarea fișierelor din linia tăierii): mutarea lui Importă, Exportă
  vectorii și Exportă G-code lângă fila Imprimanta (decizia din 09.11, „Ok la toate”) nu se mai unește; rămâne pe ramura
  tăierii (`4988fd6`, `314d5fe`), ca referință, iar locul butoanelor îl stabilesc aranjamentele. În `main` rămâne, până
  atunci, reparația provizorie a barei (bifa în panoul opțiunilor Cuțitului).
- 10.11.2026: **linia de comandă a Clasicului, ADR 0251 acceptat** („Da, 1a–3a”, după schițele ei de pe canvas): numele
  comenzilor în română și în engleză, oricare ar fi limba aplicației; „/” aduce cursorul în linie; Enter pe linia goală doar
  aduce ultima comandă, al doilea Enter o aplică. Tot de atunci, pe canvas: meniurile Clasicului (din 58 de rânduri, 23
  sunt azi doar butoane și intră întâi în registru, în 28.2↑) și pașii 1 și 3 ai lui Pas cu pas.
- 10.11.2026: **ADR 0250 acceptat** („1a, 2 b e mai bine, pentru ca pot aparea si alte diferente, si deci propun sa facem
  asta dupa ce mai dezvoltam design-urile inca putin, 3 a, 4 a, dar poate il schimbam mai tarziu, 5, a”): fontul
  sistemului în toate aranjamentele; **linia se lucrează pe `main`, fără worktree, după unirile care așteaptă și după încă o
  tură de schițe pe canvas**; Pas cu pas e asistentul pentru începători din prag; alegerea la prima pornire, provizoriu;
  ordinea feliilor din tabel (Atelier întâi). Locul lui Importă, Exportă vectorii și Exportă G-code îl stabilesc
  aranjamentele (decizia din 11.11).
- 09.11.2026: **tăierea și imprimanta unite în `main` înaintea pauzei** („putem aduce in main ce progres s-a facut, si sa
  luam pauza dupa”): tăierea la `1a81540` („Yes, merge 1a81540”, la „Merge tăierea now at its earlier commit, with the stopgap
  bar fix you didn't pick?”: versiunea finală, cu fișierele lângă Imprimanta, încă pică în e2e), imprimanta cu tot ce e gata
  („Yes, merge it now”, deși proba plăcii pe K1C nu e făcută). Planșele, aprobate și ele („Yes, merge it now”), rămân pe
  ramură: conflicte de cod cu amândouă și pornirea peste 110 kB alături de imprimantă.
- 09.11.2026: **fișierele lângă Imprimanta** („Exports g-code, import si export trebuie sa fie in topbarul de langa
  imprimanta”, apoi „Ok la toate” pe schița liniei tăierii): Importă, Exportă vectorii și Exportă G-code în bara de sus a
  aplicației, după file, cu o linie subțire; ca azi (iconițe, G-code plin cu numele); doar în Proiectare; sub 1200 px rămân în
  bara de desen; „Închide bucățile” înapoi în bara Cuțitului.
- 09.11.2026: **toate cele patru direcții de interfață, la alegerea omului** („imi plac toate, si vreau sa fie la
  dispozitia userilor”, după schițele de pe canvas, <https://claude.ai/artifact/VuzcaEYQsLoTvRBxpnSak2>): Insule (azi),
  Clasic, Atelier și Pas cu pas devin aranjamente ale aceluiași registru, alese de om. ADR 0250 propus (feliile
  28.1↑–28.7↑, din etapa 28 „Cele două interfețe”), cu cinci întrebări; codul vine după răspunsuri.
- 09.11.2026: **25.4↑ (scanările și pozele) unită în `main`** („putem uni si trasarea din imagine.”): fără conflicte, cu
  totalul 582,5 / 700 kB; worktree-ul `trasare` rămâne (linia continuă, la cuvântul owner-ului).
- 09.11.2026: **worktree-ul `ancore` scos** („Yes, remove it”, la „Remove the finished ancore worktree and archive its
  session?”): linia ancorelor (ADR 0240) e încheiată și unită (`0c81ccf`, `e481e55`, `df19f8c`). Joncțiunile `node_modules`
  și `functions\node_modules` scoase întâi (poarta cu legăturile), apoi `git worktree remove`; `.git/worktrees/ancore`
  rămăsese ReadOnly (cu `logs/` și `refs/`), curățat; ramura locală ștearsă cu `-d`; sesiunea arhivată. Pe `origin`,
  `wip/6.V-ancore` intră în lista de șters a owner-ului (acum 18). Rămân cinci worktree-uri: `imprimanta`, `incrustatii`,
  `plansele`, `taiere`, `trasare`.
- 09.11.2026: **plafonul total 700 kB** („Yes, 700 kB”, la „Raise the total bundle limit to 700 kB?”, după „ce se mai poate
  uni?”): pe `main`, totalul era 578,7 / 600, iar fiecare linie rămasă trecea singură de plafon (tăierea 600,1, planșele
  ~603,9, imprimanta 617,2). ADR 0144; pornirea rămâne 110 kB. Tăierea se poate uni (la cuvântul owner-ului); imprimanta
  așteaptă proba plăcii pe K1C; planșele aduc `main` și își micșorează calea ușii.
- 09.11.2026: **6.V↑d unită în `main`** („Da, unește”, în sesiunea ancorelor, după raportul ei: „Dacă e bine, spune
  „unește”. Ramura o unește în `main` sesiunea principală.”): linia ancorelor (ADR 0240) e întreagă în `main`; conflicte doar
  în documente, păstrate ambele părți.
- 09.11.2026: **linia trasării din imagine (25.1↑–25.3↑b) unită în `main`** („Yes, merge trasarea”, la „Merge trasarea
  into main now?”, după „vezi ce mai este gata de unit cu main”): singura linie gata care încape sub plafon. Tăierea și
  planșele aduc întâi `main` în ramură (conflicte de cod cu ancorele), imprimanta așteaptă proba plăcii pe K1C (condiția
  owner-ului), 6.V↑d e încă în lucru; toate la un loc ar trece de 600 kB (~650).
- 08.11.2026: **linia ancorelor (6.V↑, 6.V↑b, 6.V↑c) unită în `main`** („Da, unește”, în sesiunea liniei, după raportul ei:
  „Dacă e bine, spune „unește”; ramura o unește în `main` sesiunea principală”): conflicte doar în documente, păstrate ambele
  părți. 6.V↑d (opțiunile) rămâne pe linie, după decizia owner-ului pe plafon.
- 08.11.2026: **felia 12.1↑c-2 unită în `main`** („Da, unește”, în sesiunea incrustațiilor, la „Unim felia 12.1↑c-2 în
  main?”): punctele 3, 5 și 6 din lista de după prima unire (lemnul din jurul dopului din panou, arborele și rândurile
  legate, viteza benzii). Documentul rămâne v22; punctul 4 (punțile dopului drept alese în fereastră) rămâne pe linie, cu
  v24, după v23 a planșelor.
- 08.11.2026: **opțiunile liniei mediane, cu toate recomandările** („Da, 1a–3a”, la cele trei întrebări din ADR 0223, în
  sesiunea liniei trasării): sub „Rezultatul: Linii mediane”, vizibile doar atunci, un grup de patru (capetele în centru sau
  în vârf, părțile late linii mediane sau contururi, „Arată părțile late”, buclele pe linie sau vectori închiși); pragul
  automat al părților late e de două ori grosimea obișnuită a trăsăturilor (în mm în fereastră); „Arată părțile late” e
  pornită implicit.
- 08.11.2026: **incrustațiile (12.1↑b, 12.1↑c) unite în `main`, înaintea planșelor** („Da, așa”, în sesiunea planșelor, la
  „întâi unești incrustațiile în `main` (prin sesiunea principală), apoi aduc `main` în ramura mea și iau v23 peste ele”):
  documentul v22 în `main`; **v23 e a planșelor** (11.4↑, literele plăcuțelor), deci un câmp nou pe altă linie (de exemplu
  punțile dopului drept alese în fereastră, pe linia incrustațiilor) ia versiunea de după. Worktree-ul `incrustatii` rămâne,
  cu 3–6 din lista dinaintea unirii („1 si 2 acum 3-6 dupa”).
- 08.11.2026: **ancora și tastele transformării: răspunsurile la ADR 0240** („Ok la toate”, la „Accepți recomandările la cele
  4 întrebări din ADR 0240?”, în sesiunea liniei): ancora e a selecției de acum (unul din cele 9 puncte ale cutiei, ales în
  bara Transformării și ținut în browser, sau trasă de mână), nu se ține în proiect, deci documentul rămâne v20; la mânere și
  la desen, Alt e „față de ancoră” / „din centru”, iar lipirea urmează acolo butonul Lipire, comutat și cu Shift+L (Alt rămâne
  „lipirea invers” la mutare, ghidaje, ancoră, Noduri și Pen); cu Shift și Ctrl ținute împreună câștigă Shift; feliile 6.V↑,
  6.V↑b și 6.V↑c acum, 6.V↑d (opțiunile) după decizia owner-ului pe plafon, când se unesc liniile.
- 08.11.2026: **o linie nouă, în worktree: ancorele vectorilor și modificatorii transformării** („vreau un worktree care sa se
  ocupe de origin/anchor points pentru vectori. si o sa vreau ca unealta transform sa tina cont de ele ba mai mult vreau
  hotkeys care sa influenteze unealta. […] SHIFT si sa pastrez proportia orice ar fi si pe CTRL sa ignor proportia orice ar
  fi, si pe ALT, chiar si in combinatie cu celelalte, vreau sa imi pastreze centrul formei. Aceste hotkeys trebuie sa
  functioneze asa si cand creez formele”): felia 6.V↑, `wip/6.V-ancore`, `C:\Users\besli\cncvs2-lucru\ancore`, e2e pe 4181 și
  `127.0.8`, ADR-urile 0240–0249, canalul `ancore`; întâi ADR-ul și schița, cu întrebările (între ele, unde se mută
  inversarea lipirii, ținută azi de Alt).
- 08.11.2026: **înălțimile pieselor LEGO, editabile la zecimi, în profilul imprimantei** („plugin-ul 3d care face piesele de
  lego are o problema, stifturile pe care le face si gaurile de sub piesa sunt prea mici, raza este ok, dar inaltimea este
  putin prea mica. pare ca are nevoie de o zecime de milimetru pentru stifturi”, apoi „vreau sa pot edita eu inaltimile la
  zecimi de milimetri sa pot salva ca profil pentru tot plugin-ul”, iar la întrebarea implicitelor „Defaults 1.9 / 2.1”):
  ADR 0168, felia 3.Tg, în `main` (linia pluginului nu mai are worktree). Știftul 1,9 mm și locașul 2,1 mm sunt implicitele
  oricărei imprimante noi; fiecare imprimantă își ține înălțimile ei.
- 08.11.2026: **worktree-urile terminate și unite în `main`, scoase** („dupa ce verifici care worktree a terminat si a fost
  integrat in maine, vreau sa inchizi tu acel worktree si sa il arhivezi”): `biblioteca` (3.Xg), `raportari` (15.B↑b) și
  `trenulet` (linia pluginului, unită pe 06.11), fiecare cu ramura întreagă în `main`, curat și împins. Joncțiunile
  `node_modules` și `functions\node_modules` scoase întâi (`cmd /c rmdir`, cu poarta care caută legături), apoi `git worktree
  remove`; ramurile locale șterse cu `-d`; sesiunile arhivate (a lui `trenulet` era deja). Pe `origin`, `wip/3.Xg-biblioteca`
  și `wip/15.B-raportari` intră în lista de șters a owner-ului (acum 17). Rămân cinci worktree-uri, cu felii încă neunite:
  `imprimanta`, `incrustatii`, `plansele`, `taiere`, `trasare`.
- 08.11.2026: **linia mediană, cu toate recomandările** („Da, 1a–5a”, la cele cinci întrebări din ADR 0222, în sesiunea liniei
  trasării): rezultatul „Linii mediane” în fereastra trasării (sursele alb-negru), scheletul pe pixeli cu centrul la
  marginile de 50 % (nu axa medială a V-carve-ului, ~12 kB); o linie se termină în centrul capătului rotund; o pată plină dă
  scheletul ei; buclele se taie pe linie. Bugetul era deja hotărât (ADR 0143, 600 kB). Alternativele care pot sta împreună
  (capetele în vârf, părțile late rămase contururi și semnalarea lor, buclele ca vectori închiși) vin ca opțiuni în 25.3↑b.
- 07.11.2026: **trasarea pe culori, cu toate recomandările** („Da, 1a–5a”, la cele cinci întrebări din ADR 0221, în sesiunea
  liniei trasării): numărul culorilor e automat (cele distincte, 2–16), cu glisorul pentru alt număr; o culoare se leagă de
  alta trăgându-i pastila peste a ei (ca în ArtCAM), cu „Dezleagă” pe pastilă; pe o imagine opacă, culoarea care domină
  marginea e fundalul, nebifată; „Importă” face o piesă pe culoare, toate aliniate, cu rolul ales din panou pe fiecare;
  culoarea stă doar în numele piesei (documentul nu se schimbă).
- 07.11.2026: **plafonul total 600 kB** („Yes, 600 kB”, la „Raise the total bundle cap to 600 kB (new ADR), startup staying
  at 110 kB?”): după unirea raportărilor și a imprimantei, totalul era 535,0 / 550 kB, iar liniile paralele aveau gata pe
  ramuri încă ~60 kB. ADR 0143; pornirea rămâne 110 kB.
- 07.11.2026: **raportările (15.B↑b) și imprimanta (3.6g–3.6i), unite în `main`**, după biblioteca extensiilor (unită de
  sesiunea ei): 15.B↑b la „Da, transmite” (în sesiunea liniei, la „Să-i transmit sesiunii principale să unească 15.B↑b în
  `main` și să publice serverul pe test?”); imprimanta la „as vrea totusi, sa trimitem pe main, ce s-a facut deja si am vazut
  ca functioneaza bine. daca se va modifica ceva de aici incolo se va face update si pe main ulterior” (în sesiunea liniei;
  3.6j și următoarele vin mai târziu, tot prin unire). Apoi, aici, „verifica din nou”. **Când mai multe sesiuni unesc în
  `main` în aceeași zi, publicările pe test merg în ordinea commit-urilor, una câte una:** o publicare a unui commit mai vechi,
  venită după una mai nouă, întoarce serverul. Pe 07.11, push-ul celor două uniri a așteptat publicarea bibliotecii și
  DEVLOG-ul ei.
- 07.11.2026: **biblioteca extensiilor (3.Xg) unită în `main`** („Da, unește”, la „Unim `wip/3.Xg-biblioteca` în `main`?”):
  fără conflicte (`main` era deja în ramură), commit-ul de unire `58e73c0`. Easy 3Draw și biblioteca ajung pe live odată cu
  următoarea publicare a aplicației pe live (6a din ADR 0230); până atunci, doar pe test.
- 07.11.2026: **biblioteca extensiilor: răspunsurile la ADR 0230** („Da, 1a–7a”, după „Vreau ca plugin-ul nostru sa fie
  disponibil printr-o librarie. Fa asta intr-un worktree”): biblioteca stă lângă aplicație, construită din repo la fiecare build
  (`/extensii/catalog.json` și pachetele, cu amprenta SHA-256 verificată înaintea citirii); „Instalează” prin fereastra de azi,
  „Actualizează” dintr-un clic (fereastra doar când versiunea nouă cere ceva în plus); o versiune nouă se vede la deschiderea
  meniului Extensii, fără nicio cerere la pornire; fișierul și adresa rămân, cu „din afara bibliotecii”, plus linkul
  `#biblioteca=<id>`; Easy 3Draw ajunge pe live odată cu aplicația; secțiunea Biblioteca stă în meniul Extensii. Linia lucrează
  în worktree-ul `biblioteca` (`wip/3.Xg-biblioteca`, `C:\Users\besli\cncvs2-lucru\biblioteca`, e2e pe 4180 și `127.0.7`,
  ADR-urile 0230–0239, canalul `biblioteca`).
- 07.11.2026: **trasarea din imagine, cu toate recomandările** („Da, 1a–8a”, la cele opt întrebări din ADR 0220, în sesiunea
  liniei trasării): trasarea stă în „Importă…” (o imagine aleasă sau lăsată pe planșă deschide fereastra trasării); o imagine
  fără DPI primește 96 px / țol, cu lățimea scrisă în fereastră; curbele ies linii și cubice; ordinea: 25.1↑ alb-negru, 25.2↑
  culorile, 25.3↑ linia mediană (25.4↑ scanările, doar la cerere); TIFF refuzat acum, iar imaginile din PDF rămân sărite; codul
  în precache, în totalul de 550 kB; scikit-image (BSD-3) e al doilea martor al probei, în venv-ul oracolelor și în CI
  (descărcarea permisă); logoul din ediția întâi intră în corpusul public, plus imaginile pe care owner-ul le trimite.
- 07.11.2026: **mărimea lui 3.6h acceptată** („Da, accept”, la „Accepți cei 3,3 kB în plus pentru 3.6h?”): trimiterea unui `.gcode`
  la imprimantă adaugă 3,3 kB, peste cei ~2 kB rămași din ținta liniei imprimantei (ADR 0190 §G); cu `main` din 07.11 unit
  în ramură, totalul e 530,8 / 550. Unirea ramurii `wip/3.6g-imprimanta` în `main` rămâne a sesiunii principale, la cuvântul
  owner-ului.
- 07.11.2026: **planșele: toate variantele rămân opțiuni pentru utilizator, cu recomandarea ca implicit** (ADR 0210, în
  linia `plansele`). La ADR-ul propus, owner-ul a întrebat „ma intreb cate dintre raspunsuri/optiuni pot coexista ca optiuni
  pentru utilizator”; la răspuns (șapte din opt, plafonul nefiind o opțiune a utilizatorului) și la „Le fac pe toate opțiuni,
  cu recomandarea ca implicit?”: „Da, toate”. Deci: comutatorul „Toate foile” / „Doar foaia activă” (implicit toate);
  exportul foii active și „Toate foile” (arhiva, foile identice ×N), iar programul unic cu oprire între foi după etapa 13;
  ambele moduri ale lui „Așază pe foi”; câmpurile `{nume}` și „Fă din textul ales câmpul”; modurile casetei și, pentru un
  text care tot iese, avertismentul sau confirmarea; gruparea cu surori întreabă, cu „Ține minte” și cu rândurile din meniu;
  CSV-ul listei cu `;` sau `,`; „Mută și așază la capăt”, „Duplică foaia” separat sau legat, mărimea tăiată sau a desenului.
  **Plafonul total 550 → 600 kB** (8a), luat din același „Da, toate” (răspunsul spunea că opțiunile îl cer); l-a scris
  ADR 0143, în `main`, cu pornirea tot la 110 kB. Rămân reguli: distanța dintre piese cel puțin cât freza
  și un singur marcaj al câmpurilor. Codul pornește cu felia 11.1↑ (foaia activă și lista cu foile).
- 07.11.2026: **liniile incrustațiilor și a tăierii vectorilor, unite în `main`** („Yes, merge both”, la „Merge the finished
  inlays and vectors branches into main?”): 12.1↑ (documentul v20; 12.1↑b doar ca ADR propus) și 10.3↑–10.3↑b. Linia
  imprimantei (3.6g, gata pe ramura ei, fără proba pe imprimanta reală, care nu răspunde) rămâne pe ramură. Tot atunci, la
  „ce altceva putem face in paralel?”, owner-ul a pornit două linii noi, în worktree-uri, amândouă întâi cu un ADR propus și
  întrebările: planșele (etapa 11: mai multe foi, Multi-Plate, lista de tăiere; `wip/11.1-plansele`,
  `C:\Users\besli\cncvs2-lucru\plansele`, e2e pe 4178 și `127.0.5`, ADR-urile 0210–0219, canalul `plansele`) și trasarea din
  imagine (etapa 25; `wip/25.1-trasare`, `C:\Users\besli\cncvs2-lucru\trasare`, 4179, `127.0.6`, ADR-urile 0220–0229, canalul
  `trasare`). Restul raportărilor (15.B↑b: `raportari`, 4177, `127.0.4`, ADR-urile 0200–0209) e propus, nepornit. **Suita
  emulatoarelor ține porturi fixe (9095, 8085, 5005) și 4173, oricare ar fi worktree-ul:** înainte de ea, `netstat -ano`, iar
  la o ciocnire se așteaptă cealaltă sesiune (pe 07.11, porțile unirii au căzut întâi doar din cauza asta).
- 07.11.2026: **imprimanta 3D prin WiFi, răspunsurile la ADR 0190** (formularul schiței: „1a”, „2a”, „3a”, „4a”): fereastra
  Imprimanta, a treia filă a meniului global; întâi 3.6g (conectarea, starea, pauza și oprirea, fișierele din imprimantă), apoi
  3.6h (trimiterea unui `.gcode`); **`http:` în `connect-src`, pentru 3.6h** (acordul owner-ului, ca la `ws:`: un `http://`
  spre o gazdă publică rămâne blocat ca conținut mixt); camera, într-o felie a ei, după 3.6h. Nota lui la 1: „Vreau sa pot pune
  panourile mai multor masini unul langa altul, eventual si pe monitoare diferite. Dar asta poate veni mai tarziu.” (o felie a
  ei, mai târziu). Imprimanta lui: o K1C (2024), la 192.168.1.12; verificarea de pe calculatorul lui, doar cu citiri, permisă
  (pe 07.11, imprimanta n-a răspuns: oprită sau într-o rețea despărțită de cablu).
- 06.11.2026: **tăierea și conversia vectorilor: răspunsurile la ADR 0180** (formularul schiței: 1a, 2a, 3a, 4a, 5a, 6a,
  cu notele „vreau optiunea ca taierea sa nu inchida forma/vectorul. vreau si o unealta care daca tai de exemplu un cerc pe
  jumate, operatia creeaza doua arce de cerc egale cu jumate din cerc, independente una de alta.” și „aici va trebui sa testam
  si sa ajustam pe viitor, pentru cand avem situatiile concrete”): întâi tăierea, apoi decuparea, conversia și netezirea;
  linia dreaptă împarte fiecare formă aleasă în două forme, decuparea lasă forma cu ce rămâne, „Taie la intersecții” face din
  fiecare bucată o formă; bucățile își păstrează rolul (o bucată deschisă, tăiată pe aceeași parte a frezei; buzunarul,
  V-carve-ul și găurirea pleacă de pe ea); la cerc și dreptunghi, „doar dacă e” și „cu mărimea dată”; cercul din poligon trece
  prin noduri; „Arce” face arce și din liniile scurte. „Închide bucățile” e la alegere (bifa ținută în browser): fără ea, un
  cerc tăiat prin centru dă două forme separate, câte un arc de 180°. Linia lucrează în worktree-ul `taiere` (ADR 0180–0189),
  în feliile 10.3↑–10.3↑e.
- 06.11.2026: **textul, restul pragului, pe linia principală** („Ok, o sa le raspund, aici poti sa continui”, cât liniile
  paralele își așteaptă răspunsurile): feliile 7.9↑ și 7.9↑b, cu ADR 0138 (cercetarea, schița, cinci întrebări), acceptat cu
  recomandările („Yes, 1a–5a”): pt e mărimea fontului, mm și inch rămân majuscula; lățimea și înălțimea literelor în procente;
  mânerele păstrează un text drept fără aldin; spațierea literelor alese, din panou, în mm. Documentul rămâne v19 (schema nouă
  e a incrustațiilor).
- 06.11.2026: **două linii paralele, în worktree-uri** („vreau sa deschidem worktrees pentru alte etape sau felii”, apoi
  „Inlays, stage 12 (Recommended),Vector trim/convert, stage 10”): incrustațiile (felia 12.1↑, `wip/12.1-incrustatii`,
  `C:\Users\besli\cncvs2-lucru\incrustatii`, e2e pe 4174 și pe rețeaua de loopback `127.0.1`, ADR-urile 0170–0179,
  canalul `incrustatii`), singura linie care schimbă acum schema documentului (v20), și tăierea și conversia vectorilor
  (felia 10.3↑, `wip/10.3-taiere-conversie`, `C:\Users\besli\cncvs2-lucru\taiere`, 4175, `127.0.2`, ADR-urile
  0180–0189, canalul `taiere`), fără schemă nouă. Linia principală continuă de la ADR 0138. **Un worktree își scrie portul
  e2e în trei locuri din `.tmp/pw.config.ts`** (comanda, `webServer.url`, `use.baseURL`; `playwright.config.ts` rămâne pe
  4173) **și rulează e2e-ul cu `CNCVS2_E2E_RETEA`** (podul fals de pe 8282, pe rețeaua lui de loopback).
- 06.11.2026: **plafonul total 550 kB** („Yes, 550 kB”, la „Raise the total bundle cap to 550 kB (new ADR), keeping startup
  at 110 kB?”): după unirea liniei pluginului, totalul era 503,1 / 500 kB; gazda extensiilor (~15 kB) trebuie să meargă și
  offline, deci rămâne în precache. ADR 0137; pornirea rămâne 110 kB.
- 06.11.2026: **linia pluginului (Trenuleț, acum „Easy 3Draw”) unită în `main`** („Yes, merge it”, la „Merge wip/trenulet
  (43 commits, with the plugin's sources) into main and push it to the public repo?”, după încheierea liniei pe 05.11: „Aici nu
  mai facem nimic, am terminat si vom face unirea cu main”): feliile 3.S, 3.Xa–3.Xe și 3.Ta–3.Tf (ADR 0126–0129, 0160–0167)
  intră în `main`, iar sursele pluginului (`extensii/trenulet/sursa/`, ~1,1 MB) și three.js r128 (`vendor/three.min.js`, MIT,
  cu licența) devin publice în repo. Ce a rămas din linie (salvarea în cont, senderul K1C, știfturile LEGO pe o formă liberă,
  semnul din bară) devine felii noi, pornite din `main`.
- 05.11.2026: **conectarea prin WiFi: răspunsurile la ADR 0136** („1. c”, „2. a”, „3. b”, „4. trebuie sa pot alege la care
  retea sa ma conectez”): în felia 3.6f intră și căutarea în toată rețeaua, doar la clic; parola rețelei atelierului se scrie
  în aplicație, merge doar spre pod și nu se ține nicăieri (regula din ghidul podului s-a schimbat odată cu ea); numele
  mașinii în rețea rămâne `esp3d`; în locul butonului „Conectează la COSTEL”, lista conexiunilor ținute, fiecare cu rețeaua
  ei (prin rețeaua atelierului sau direct, prin rețeaua podului), din care omul alege, fără conectare singură.
- 05.11.2026: **conectarea prin WiFi, mult mai ușoară, și roadmap-ul la zi** („da, continua, da, vreau sa te asiguri ca avem
  roadmap actualizat”, apoi „si defapt, vreau sa imbunatatim la senderul wifi, vreau sa fie mult mai usor sa conectezi o masina
  prin wifi”): felia următoare e 3.6f, cu ADR 0136 propus (cercetarea, schița, patru întrebări); codul vine după răspunsuri.
  Roadmap-ul: feliile și stările lor se potrivesc cu istoria; coada owner-ului are acum și decizia liniei plugin-ului (gata pe
  `wip/trenulet`, neunită, deci nevăzută în roadmap) și ștergerea celor 14 ramuri vechi de pe `origin`.
- 05.11.2026: **worktree-ul `vectori` scos** după unirea lui 10.2↑ („Yes, clean up”): ramura locală ștearsă, sesiunea etapei
  10 arhivată; rămâne doar worktree-ul `trenulet`. Pe origin rămân ramurile vechi (ștergerea lor e la owner).
- 04.11.2026: **meniul pe telefon, varianta B** (13.A↑c, ADR 0132 §10). La verificarea cerută („vreau sa verifici progresul
  actual al aplicatiei si sa te asiguri ca totul a fost facut bine”), rularea de noapte era roșie de două nopți; la reparația
  propusă, „vreau sa vad un exemplu mai concret inainte sa aprob”, apoi, după comparația cu capturi din aplicație (acum,
  varianta A cu numele filelor tăiate, varianta B cu iconițele), „Yes, B”: fila deschisă cu numele, celelalte doar cu
  iconița, iar indicatorul pe rândul lor.
- 04.11.2026: **curățenia worktree-urilor** („vreau sa verifici ce worktrees pot fi unite si sterse/arhivate”, apoi „Da”):
  linia textului (7.5↑–7.8↑) și 10.1↑ unite în main; worktree-urile `text` și `sugestii` scoase, cu ramurile lor; ramurile
  depășite (feliile lor s-au terminat în main prin alte commit-uri) șterse după o copie în `Apps\cncvs2-arhiva\` (bundle-uri
  în Drive, în afara repo-ului, cu `CITESTE.md`), unde stă și copia privată a lui `wip/trenulet`. Rămân worktree-urile
  `trenulet` (linia activă) și `vectori` (10.2↑ așteaptă formularul owner-ului).
- 03.11.2026: **imprimanta 3D a owner-ului e o Creality K1C, folosită din cvs2 prin WiFi** („Am o imprimanta 3d pe care vreau
  sa o folosim din cvs2 prin wifi. Las imaginea asta pentru mai tarziu.”), cu o captură din aplicația Creality: imprimanta
  „K1C-8578”, în timpul unei imprimări. E răspunsul la întrebarea 4 din ADR 0119: firmware-ul Creality, pe Klipper. Ce expune
  în rețea (Moonraker sau doar protocolul aplicației Creality) se cercetează la pornirea feliei; „mai târziu”, deci nicio felie
  acum. Captura stă doar local, în `docs/faza0/imprimanta-3d/` (ignorat de git).
- 02.11.2026: **Trenuleț în cvs2: extensiile se instalează, rulează izolate și folosesc senderul prin `HostApi`** (sesiunea
  dedicată, worktree-ul `wip/trenulet`; întrebările din handoff-urile din `Apps/Trenulet/cvs2/`):
  - „nu vreau sa fie prezent in softul vanilla, vreau sa fie instalat din link. sau dintr-un zip. pentru asta avem nevoie de
    un sistem de plugin-uri. interfata lui cvs2 va ramane tot timpul cea vanilla si pentru utilizarea plugin-ului, trebuie
    accesat plugin-ul printr-un buton discret sau dintr-un meniu de plugin-uri pus aici” (lângă marcă): planificatorul nu
    intră în aplicație. Codul lui stă în repo (`extensii/trenulet/`), dar se construiește separat, ca un `.zip`, în afara
    pachetului și a plafonului de 500 kB. Meniul Extensii stă mereu lângă marcă, discret, iar spațiul unei extensii ia locul
    pânzei (schița, „la fel”);
  - „cum recomanzi tu”: instalarea de la orice adresă HTTPS a unui `.zip`, descărcată direct (`connect-src https:`), plus
    linkul `<adresa cvs2>#instaleaza=<adresa pachetului>`;
  - „eu vreau ca softul plug-inului sa poata folosi senderul din cvs2”, apoi „Da, ca recomandat”: extensia rulează într-un
    cadru izolat (iframe cu sandbox, fără originea aplicației: nu vede proiectele, contul sau portul) și vorbește cu cvs2
    doar prin `HostApi`. CSP-ul primește `blob:` și amprenta scriptului cadrului în `script-src`; cadrul are un CSP propriu,
    fără rețea. Senderul prin `HostApi`: citește starea, încarcă programe (verificările lui „Fișier…”), pornește și reia doar
    după confirmarea omului într-o fereastră a lui cvs2, pune pauză și oprește direct; conectarea, jog-ul, zero-ul,
    palparea, deblocarea, comenzile manuale și setările controlerului rămân în panoul mașinii;
  - la restul, recomandările (fără obiecție): întâi primirea (3.S, ADR 0126), apoi gazda extensiilor (3.Xa) și senderul în
    `HostApi` (3.Xb); dialogul primirii modal, la sosire; pe live după o placă trimisă așa pe test; panoul mașinii se
    deschide singur după „Primește”; lucrarea primită stă doar în memorie; ieșirea CNC a planificatorului prin planșe cvs2;
    contractele atelierelor luate din cvs2; Manifold (cu `'wasm-unsafe-eval'`, cerut atunci); pagina de pe claude.ai
    rămâne, construită din repo. Repo-ul e public: sursele planificatorului se reconfirmă înaintea primului push care le aduce.
- 02.11.2026: **gruparea, răspunsurile owner-ului** la cele patru întrebări din raportul feliei 6.T↑ (ADR 0130):
  1. „1 e ok.”: grupurile în grupuri rămân permise (un nivel pe grupare, Degrupează desface doar acel nivel);
  2. „2, in principiu vreau flexibilitate si optiuni, dar cu quality of life ridicat. inteleg ca nu totul trebuie implementat
     acum, pentru ca nu indeplinim toate toate situatiile.”: piesa cu mai multe instanțe rămâne refuzată acum; când nivelul
     doi devine vizibil (etapa 11), gruparea ei vine cu opțiuni, fără pași în plus în cazul obișnuit. Principiul se aplică și
     altor alegeri de felul ăsta;
  3. „3, ok”: alinierea unei selecții ca bloc, fără grupare, și avertismentul la contururile care se ating, într-o felie
     următoare, după unirea grupării;
  4. „4, v-carve oricum nu s-a aplica intre litere si doar in interiorul unei singure litere”: V-carve-urile cu aceleași
     valori din forme diferite se grupează (o singură regiune par-impar, suprafața săpată în marginile V-carve-ului, probată
     pe oracolul simulării); refuzul rămâne doar când regiunile lor se ating sau se suprapun.
- 02.11.2026: **meniul global și fereastra Mașina pe tot ecranul** (ADR 0132, felia 13.A↑, în worktree-ul `sender-ecran`).
  Cererea: „vreau inca un worktree care sa faca panoul sender-ului mai mare, el trebuie sa fie fullscreen, sub meniu. Atentie,
  meniul global, el va fi diferit de cel cu uneltele de desen. ca la cvs1 acest meniu va aparea doar in fereastra de
  desing/desen/project”; la schița cu nouă întrebări, „Da, cu recomandările”:
  - un rând sus, în toate ferestrele: marca, filele ferestrelor (o listă în aranjament, ca o extensie, de exemplu gazda din
    Trenuleț, să-și adauge fila), indicatorul lucrării, căutarea, limba, tema și contul; fără meniuri Fișier / Editare acum
    (vin cu șablonul clasic, decizia din 13.10);
  - ferestrele se numesc „Proiectare” și „Mașina” (en: Design, Machine), ca în CVS1; aplicația se redeschide în fereastra în
    care a rămas;
  - bara de desen, cu extensia ei, rămâne neschimbată, doar în Proiectare; importul și exportul rămân în ea; panoul Mașina iese
    din docul din dreapta; în plus, „Deschide în Mașina” în fereastra exportului (încarcă, nu pornește);
  - jobul continuă cât desenezi; indicatorul (verde rulează, portocaliu pauză sau oprit la M6, roșu alarmă) se vede de oriunde,
    cu Pauză / Reia alături; un clic pe el deschide Mașina; Oprește rămâne doar în fereastră; procentul, în titlul filei;
  - cu o lucrare pornită: confirmarea browserului la închiderea paginii și „Reîncarcă după lucrare”;
  - Escape închide doar ce e deschis; nu schimbă fereastra și nu atinge mașina;
  - Mașina pe trei coloane de la 80 rem, două până la 48 rem, una pe telefon, în ordinea urgenței;
  - mai târziu, în etapa 13: previzualizarea traseului cu freza în timp real și override-urile, în coloana lucrării.
- 02.11.2026: **fonturile cu o singură linie: cititorul pentru fonturile „stick” ale omului și Relief SingleLine inclus**
  („Da, 1 + 2 cu Relief”, la recomandarea din sesiunea etapei 7: „1. cititorul pentru fonturile tale stick (TTF / OTF
  dus-întors și fonturile SVG), fără descărcări; 2. un font liber inclus, descărcat o singură dată, cu licența lângă el”).
  Relief SingleLine CAD (OFL 1.1) e descărcat din `isdat-type/Relief-SingleLine` și inclus; fonturile SVG vin în 7.6↑b.
  Tot atunci, **ADR-urile 0140–0142 sunt ale liniei textului** („0140–0142”, la „ce numere folosesc?”; 0124–0132 erau deja
  împărțite între linii): 0140 fonturile cu o singură linie (ADR 0140, felia 7.6↑), 0141 textul vertical, 0142 caseta.
- 02.11.2026: **plafonul total 500 kB** („Da, 500 kB”, la „Ridic plafonul total al pachetului la 500 kB?”), după propunerea
  a două worktree-uri paralele lângă etapa 4: restul textului (etapa 7) și verificarea și repararea vectorilor (etapa 10). La
  441,2 / 450 kB, cele trei linii nu încăpeau în 8,8 kB. ADR 0122, felia 3.R; pornirea rămâne 110 kB. Worktree-urile pornesc
  doar dintr-un mesaj scris în aplicația desktop (sub Remote Control, pornirea e refuzată); dacă pornesc, primesc ADR-urile
  0123 și 0124, iar linia principală continuă de la 0125. Apoi „vreau sa deschidem worktrees pentru urmatoarele etape” și
  „porneste worktrees”: etapa 7 (textul) a pornit în `C:\Users\besli\cncvs2-lucru\text` (`wip/7.5-text`, portul e2e 4174);
  etapa 10 (verificarea vectorilor, 4175, ADR 0124) și Trenuleț (4176, ADR 0126–0129) așteaptă un mesaj din desktop.
- 02.11.2026: **restul raportărilor, notat pentru mai târziu; roadmap-ul, reluat de unde a rămas** („noteaza-le pentru mai
  tarziu, acum vreau sa luam roadmap-ul de unde a ramas”, la întrebarea despre 15.B↑b, după felia 15.B↑a):
  - **așteaptă:** 15.B↑b (proiectul atașat la raportare, în Storage, cel mult 10 MB, cu bifa; jobul zilnic care șterge
    tichetele rezolvate după `zilePastrareTichete`, cu atașamentele și marcajul de rulare; fraza păstrării în nota de
    confidențialitate), apoi 14.D↑ (fila Utilizatori completă, exportul și ștergerea datelor, registrul probei), în ordinea
    din ADR 0116 §F. Testul raportărilor pe instanța de test rămâne și el pentru atunci;
  - **roadmap-ul:** etapa 3 mai are doar felii cu mașina sau cu o placă tăiată (3.5b, 3.6e, 3.7b, 3.9), deci lucrul continuă
    cu etapa 4, „următoarea” din roadmap, pe punctele ei rămase, în ordinea din `PLAN.md` §5.3: 1 (migrările pure, cu corpus
    de aur), 6 (contractele NcStudio, RichAuto, Syntec, Mach3 / Mach4 și pachetul de atelier), 9 (fișa plăcii 4 și placa de
    regresie). Punctul 8 (măsurarea pe un laptop de atelier) cere laptopul owner-ului.
- 02.11.2026: **meniul contului** (ADR 0120, felia 14.C↑c). La captura ferestrei contului rămase pe „Opening the account…”,
  owner-ul a cerut „ar trebui sa fie un meniu mai conventional pentru account area.” și „si trebuie sa pui acolo si manualul si
  sugestiile”; la schiță, „Da, fă-l”. Butonul Cont deschide un meniu (contul, manualul, sugestia, ieșirea), cu capul din contul
  ținut, fără server; „?” și Sugestie au ieșit din extensia barei, iar F1 a rămas.
- 01.11.2026: **senderul prin WiFi, imediat după felia 14.C↑b, și imprimantele 3D mai târziu** („O sa vreau imediat dupa
  felia asta sa facem senderul sa se poata conecta pri wifi la masina. Si am de gand sa folosim asta si pentru imprimante
  3D”).
  - Felia vine înaintea raportărilor (15.B↑), cu un ADR nou.
  - Constrângerile cunoscute: din browser se ajunge la mașină doar prin WebSocket (FluidNC, grblHAL pe ESP32, ESP3D), nu
    prin Telnet. Aplicația e pe HTTPS, iar un `ws://` din rețeaua locală e conținut mixt, blocat de browser: calea (accesul
    la rețeaua locală din Chrome, un ajutor local sau altceva) o cercetează felia.
  - Transportul se desparte de fluxul senderului, ca imprimantele 3D (Marlin pe serial, Klipper sau OctoPrint prin API web)
    să intre pe același drum.
  - Controlerul mașinii owner-ului e o întrebare pentru pornirea feliei.
  - **Felia 3.6d gata pe 01.11**, cu implicitele („Da”: programele pe flux, tableta într-o felie separată) și cu schema `ws:`
    în CSP („si da, la ultima intrebare”). **Controlerul: „Pod ESP3D”** (01.11): ESP3D 3.0.2 pe un ESP32, legat la GRBL
    1.1h-ul de azi (nu 3.1: alt socket de date). Imaginea o compilează workflow-ul `pod-esp3d` (pornit de mână, 3.Q), iar
    pașii owner-ului sunt în `docs/masina/pod-esp3d.md`, cu decizia în ADR 0119 („Podul ESP3D”). Rămân imprimantele.
  - **ADR 0119, propus pe 01.11** („Da, WiFi”), cu cercetarea (Chrome și Edge 147 scutesc de blocare un `ws://` spre un IP privat sau un nume `.local`, după permisiunea rețelei locale), feliile 3.6d (fără mașină) și 3.6e (pe mașină) și patru întrebări: controlerul cu WiFi, programele lungi, tableta, imprimantele.
- 01.11.2026: **conturile clienților** (răspunsurile la ADR 0116: „1,b. 2, conturile din editia intai sunt ale noastre, nu
  aveam clienti, deci doar al meu este relevant. 3, b sa fie default, dar, vreau sa pot seta asta din admin. 4, a. 5, a. 6,
  configurabil din admin. 7, a.”): înregistrarea liberă (proba de 14 zile, fără card; atelierele probei închise primesc
  planul gratuit din admin); conturile ediției întâi sunt ale echipei (contează doar al owner-ului); 7 zile offline,
  setabile din admin; proiectul la o raportare doar cu bifa; răspunsul în aplicație; păstrarea tichetelor rezolvate,
  setabilă din admin; ordinea: conturile, raportările, fila Utilizatori completă. Rămân la owner operatorul datelor și
  adresa de contact pentru nota de confidențialitate: fără ele, aplicația nu se arată nimănui din afara echipei.
- 29.10.2026: **plafonul total 450 kB** („1”, la alegerea dintre plafonul nou, cavalier mutat doar în worker și amânare):
  workerul CAM (felia 4.A↑, ADR 0109) are copia lui de cavalier și de geometrie, pe care firul principal le ține pentru desen
  și import; totalul ar fi trecut de 400 kB (410,8 măsurat). Plafonul trece de la 400 la 450 kB, cu ADR nou, iar felia merge
  cum e scrisă; pornirea rămâne 110 kB.
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
