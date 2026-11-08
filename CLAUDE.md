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
  cu ușa aplicației în `test/unit/document.v20.oracol.test.ts` (din 07.11, cu incrustația din v20). **Un câmp nou al
  documentului (v21) intră acolo, ca rangul și incrustația:** rândul lui în `CAMPURI_NOI_O` (ciocnirea migrării), judecata în
  `problemeOperatieO`, frontierele pe hârtie, iar probele care țin versiunea curentă se mută pe ea (`schema: 20` în probe;
  oracolele CAM primesc versiunea nouă cum o primesc pe v20, de exemplu `test/oracles/regiune.ts`). **Și în corpusul de aur
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
  documentului: o probă le caută după cheie (`tr[data-operatie="e2/e2"]`), nu după loc. **Pornirea 100,0 (cu ușa 103,5 /
  110 kB), totalul 455,3 / 500, /admin 105,4 / 200; după unirea cu 13.A↑b, pornirea 100,2 (cu ușa 103,7 / 110 kB), totalul
  455,4 / 500.**
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
  `src/model/incrustatie.ts`;** oracolul potrivirii e `test/oracles/incrustatie.ts`, fără importuri din `src/`. Urmează
  12.1↑b (pereții drepți, ADR 0171 propus, cu șase întrebări pentru owner), apoi 12.1↑c–f.
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
  vede și ce pornește aplicația Creality. **Felia următoare a liniei: 3.6j, piesele plate** (ADR 0191 acceptat pe 07.11: „vreau
  sa le faci pe toate cele care pot functiona ca optiuni diferite si pot fi disponibile in soft”, deci toate variantele care pot
  sta împreună devin opțiuni, pe feliile 3.6j–3.6m): desenul feliat direct în cvs2 pentru
  K1C, cu valorile din profilele K1C ale OrcaSlicer și **doar comenzile pe care OrcaSlicer le scrie deja pentru K1C**
  (`START_PRINT` / `END_PRINT`: nivelarea și linia de curățare rămân ale imprimantei); „Din desen…” în fereastra Imprimanta;
  codul în `src/machine/imprimanta/feliere/`, încărcat la cerere, fără importuri din nucleu spre el (direcția owner-ului din
  07.11: conectarea și pregătirea fișierelor ca module, după propunerile de acum).
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
