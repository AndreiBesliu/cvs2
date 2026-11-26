# Relieful (18.1↑, ADR 0310–0329)

_cncvs2, relieful 2.5D / 3D, felia 18.1↑ adusă din etapa 18 („Relieful 1: nucleul, relieful din imagine, prelucrarea 3D
din relief”): ramura `wip/18.1-relief` (din `main`, 24.11), ADR-urile 0310–0329, canalul `relief`; PORNITĂ pe 24.11, la
cuvântul owner-ului; ADR 0310 ACCEPTAT pe 24.11 (1a–6a); felia 18.1↑a GATA și UNITĂ pe 24.11 (documentul v28); felia 18.1↑b
GATA pe 25.11, de unit_

Pornită pe 24.11.2026, la „ce urmeaza in roadmap si nu a fost atins deloc si putem incepe” și „ok, scrie brief-ul pentru
relief si pentru cote” ale owner-ului (în sesiunea principală). E primul lucru din blocul relief + 3D (etapele 18–24),
care ține 31 din cele 40 de rânduri v1 ale pragului încă nepornite.

## Ce închide etapa 18 (din `PLAN.md` §5.3)

Relief din imagine (gri → înălțime); alinierea pixelilor imaginii cu grila de calcul; litofania; combinarea reliefurilor
(adună, scade, păstrează înalt / jos, înlocuiește; Multiply între straturi); rezoluția de cel puțin 4000 × 4000;
straturile de relief (combinare, vizibilitate, ordine); relief ↔ imagine gri pe 16 biți. Degroșarea și finisarea 3D
pornesc aici, pe relief. Placa etapei: pana de gri, calota, litofania (o taie owner-ul, la capăt).

Rândurile sunt în `ACOPERIRE-ARTCAM-DESKPROTO.md`, secțiunea C (și D pentru degroșare și finisare). ArtCAM și DeskProto
sunt referință funcțională: fără cod, interfață, texte sau clipart copiate.

## Ce e deja hotărât (nu se redeschide fără ADR nou)

- **Reprezentarea** (`PLAN.md` §3, „Relieful”): straturi Float32 pe dale de 256 × 256, rare (o dală lipsă e o
  constantă); operațiile în bazinul de workere, pe benzi transferate; salvarea și undo-ul, Uint16 cu scară pe dală;
  relieful făcut din vectori rămâne o rețetă derivată. Modulul e `src/relief/`.
- **ADR 0010** (simularea pe CPU, câmpul pe dale), **ADR 0011** (fără calcul pe GPU în v1: placa video doar desenează),
  **ADR 0012** (CAM 3D doar pe câmpul conservativ, maximul modelului pe celulă, cu distanța la segment; drop-cutter-ul
  exact e oracolul), **ADR 0015** (workerele nu țin date între joburi).
- **Corectitudinea se demonstrează:** oracol independent (CL analitic pe plan, sferă, cilindru; creasta; volumul;
  `PLAN.md` §4, rândul „relieful și 3D-ul”), valori pe hârtie, otrăvuri. Invarianta 4 din `PLAN.md` intră odată cu
  primul relief tăiat.
- **Direcțiile de import:** `cam` importă `relief`; `relief` importă `geom` și tipurile din `model` (`PLAN.md` §3).

## De citit întâi

- `docs/faza2/sonde/s5-relief/RAPORT.md`: măsurătorile (reprezentarea, eroarea Uint16, câmpul conservativ față de
  eșantionarea în nod, timpii pe workere, bas-relieful) și codul sondei, în `cod/`.
- `docs/PORTARE.md`: candidații pentru etapele 18–20 (dilatarea gri, lema coardei, maximul glisant, transformata
  Danielsson) se judecă acum, înaintea etapei lor; verdictul se scrie acolo.
- Ce există și se refolosește: nucleul simulării (`src/sim/`: `camp.ts`, `nucleu.ts`, `banda.ts`; ADR 0047, 0057),
  vederea 3D (`src/app/Vedere3D.tsx`, relieful din benzi), bazinul CAM (`src/jobs/`, ADR 0109: un calcul greu nou e o
  cerere a protocolului, nu rulează pe firul principal), imaginile (`src/io/imagine.ts`, decodarea TIFF din
  `src/trasare/tiff.ts`, imaginile pe foaie din ADR 0272, cu octeții în IndexedDB), biblioteca de freze (bila și
  toroidala vin pe linia frezelor, `docs/linii/freze.md`).

## Prima livrare

**ADR 0310, propus**, cu schița (o pagină publicată, ca la celelalte linii) și întrebările pentru owner, cu recomandarea
în față. Fără cod de produs până la răspunsuri. De hotărât acolo, între altele: împărțirea în felii (nucleul și
persistența; relieful din imagine cu alinierea pixelilor; vederea; combinarea și straturile; litofania; 16 biți;
degroșarea și finisarea pe relief), unde stă relieful în document și unde stau octeții lui, cum arată în interfață
(unde se face, cum se vede lângă vectori), mărimea în pachet, ce se portează din sondă.

## De ținut minte

- **Schema documentului:** relieful a luat **v28** (forma `relief`, felia 18.1↑a); cotele erau tot pe v27, deci un câmp nou
  al lor ia v29. Un câmp nou al reliefului (bila, în 18.1↑c) cere iar numărul de la sesiunea principală.
- **Mărimea:** pornirea 114,7 / 120 kB (ADR 0145), totalul 806,1 / 900 kB (ADR 0301). Relieful vine la cerere, cu
  calculul în workere; în raportul fiecărei felii, cât adaugă în pornire și în total.
- **Liniile vecine:** frezele (`wip/16.A-freze`: fereastra exportului, Tăierea), exportul (`wip/28.8-export`:
  fereastra „Exportă G-code”), adminul. O operație 3D nouă atinge fereastra exportului: de vorbit cu sesiunea
  principală înaintea ei.
- **Definițiile pragului** („Pragul, definit”) stau într-o prezentare de pe calculatorul owner-ului, nu în repo: dacă
  un rând nu e destul de limpede din fișierul de acoperire, se cere owner-ului secțiunea.

## Starea

- **24.11:** linia pornită; ramura făcută din `main`; nicio felie începută.
- **24.11, după-amiaza: ADR 0310 propus** (`docs/adr/0310-relieful-nucleul-imaginea-3d.md`), cu rândul în indexul ADR și
  titlul tradus, plus verdictele portării pentru etapa 18 (`docs/PORTARE.md` §4.1). Schița:
  <https://claude.ai/artifact/Kbh5T2HAi3aMuYTQ59qz6h> (fereastra „Relief din imagine” și litofania, care se pot încerca
  pe imagini generate în pagină; planșa cu panoul și straturile; vederea 3D „Modelul / Tăiat”, cu crestele bilei;
  alinierea pixelilor; rândurile exportului; feliile; formularul). Răspunsurile se salvează în pagină, în
  `raspunsuri/owner`, doar de owner (un vizitator obișnuit e refuzat, verificat). Fără cod de produs.
- **Ce propune ADR 0310, pe scurt:** relieful e un element al piesei (forma `relief`, v29), cu straturi în șase moduri;
  dalele de 256² în Uint16 cu scară pe dală, după amprentă, în IndexedDB `cncvs2-relief`, iar documentul ține doar
  amprenta hărții dalelor fiecărui strat; o operație se încheie cu cuantizarea (ce vezi = ce se salvează = ce se taie);
  workerul reliefului și CAM-ul 3D în workerul CAM, fără stare, doar + − × ÷ √ min max; modelul exact = triunghiurile
  prin centrele celulelor; câmpul conservativ pe 9 puncte pe celulă, aliniat la pixeli; finisarea pe capsula segmentului;
  degroșarea în trepte; invarianta 4 cu primul relief tăiat; feliile 18.1↑a–i.
- **Întrebările** (recomandarea întâi, toate „a”): 1 unde stă relieful (element al piesei), 2 ordinea feliilor (întâi ce
  se taie), 3 freza bilă în document (o aduce relieful, în v29), 4 plafonul (8192²), 5 oracolul (scris de linie
  înaintea nucleului, fără agent), 6 materialul litofaniei de pe placă (o placă albă translucidă de 6 mm).
- **Răspunsul sesiunii principale (24.11, 12:52):** (1) v29 rămâne rezervat, dar numărul se fixează la commit-ul
  migrării: îi scriu chiar înainte; dacă cotele n-au luat v28 până atunci, relieful îl ia pe acela (fără versiuni lipsă;
  unirile cu schemă intră în ordinea numerelor). (2) Bila o aduce relieful, dacă owner-ul răspunde „a” la întrebarea 3,
  cu forma câmpului stabilită cu linia frezelor (sesiunea `session_01QcxiUZGaEoi6ADRcuJvDGp`): propunerea,
  `scula.forma = { tip: 'bila' }`, e în ADR 0310 §13 și i-a fost trimisă. **Linia frezelor, de acord (24.11, 12:53)**,
  cu precizările trecute în §13: toroidala `{ tip: 'toroidala', raza }` cu raza < Ø / 2 strict; locurile care presupun
  azi că orice formă e V; funcția comună `motivFormaPeOperatie` în `src/model/formaFrezei.ts`, scrisă de cine ajunge
  întâi în `main`; „Bilă” în bibliotecă după relief; bila în oracolul documentului și în corpusul de aur.
  (3) Rândurile degroșării și finisării în fereastra exportului: după ce fereastra refăcută (28.8, PR-ul #11) e în
  `main`; îi scriu întâi sesiunii principale. ADR-ul propus îl ia în `main` la cererea mea (doar documente) sau cu
  prima felie.
- **De ținut minte:** în codul vederii 3D, „relieful” (`ReliefSimulat`, `reliefPentru`) e câmpul simulării, nu modelul
  de aici; numele noi din `src/relief/` trebuie să nu se încurce cu ele. Codul vechi (ediția întâi) nu e în container:
  verdictele portării se sprijină pe `LECTII.md` §3.2 și pe s5.
- **24.11, 12:55: ADR 0310 acceptat**, cu toate recomandările (formularul schiței: 1a, 2a, 3a, 4a, 5a, 6a; fără note):
  relieful e element al piesei, pe planșa Proiectare; întâi ce se taie (a, b, c, d, apoi e–i); bila o aduce relieful, în
  aceeași versiune cu forma `relief`; plafonul 8192 × 8192 celule; oracolul îl scrie linia, înaintea nucleului, fără
  agent; litofania de pe placă pe o placă albă translucidă de 6 mm (grosimea 0,8–3,0 mm, bila Ø1,5–Ø3). Anunțate
  sesiunea principală și linia frezelor. Pornită felia 18.1↑a.
- **24.11, după-amiaza: felia 18.1↑a gata** (ADR 0310, „Implementarea (18.1↑a)”): oracolul întâi, nucleul `src/relief/`,
  documentul **v28** (nu v29: cotele erau pe v27; anunțată sesiunea principală), workerul reliefului (pixelii exacți printr-o
  textură WebGL2), baza `cncvs2-relief`, alegerea Vectori / Relief în fereastra unei imagini, fereastra reliefului, desenul
  umbrit pe planșă (prin stratul imaginilor al pânzei, adus la cerere), secțiunea Relieful din panou, manualul. Pornirea
  +0,5 kB (cu ușa +0,9), totalul +12,7 kB. Otrăvurile 43 / 43. Bila rămâne pentru 18.1↑c (§13, precizarea din 24.11).
- **24.11, seara: 18.1↑a unită în `main`** (lotul 27, `893e45bb`, unirea în `c5b79526`, din `feb7bee1`).
- **25.11, dimineața: felia 18.1↑b gata** (ADR 0310, „Implementarea (18.1↑b)”), pornită la cuvântul owner-ului transmis de
  sesiunea principală (după resetarea limitei săptămânale): modelul reliefului în vederea 3D, comutatorul „Modelul / Tăiat”;
  cererea `model` a workerului (dalele cerute, compuse și reduse), cheile dalelor și încărcarea doar a celor schimbate, texturile
  pe dale, relieful în golul lui din placă (stencil), cu vârful la fața plăcii. Plus cazul reliefului în lipirea cotelor.
  Pornirea +0, totalul +3,9 kB (884,8 / 900).
- **De ținut minte:** o felie care schimbă ce arată vederea 3D trece și prin `vedere3d.spec.ts` și `incrustatie3d.spec.ts`
  (shaderul e comun); `vedere` din `Vedere3D.tsx` e ținută și în `acum` (ascultătorii montați o dată o citesc de acolo).
- **25.11: 18.1↑c pornită** (finisarea paralelă pe relief; ADR 0310 §4–§6, §13), la mesajul sesiunii principale („Poți aduce
  `main` și porni 18.1↑c”; v29 e al reliefului, fără să-l împartă). Forma bilei, trimisă liniei frezelor: `{ tip: 'bila' }`.
  Planul, pe bucăți (fiecare cu commit, proba înaintea funcției):
  - **c-0, oracolul 3D** (`test/oracles/relief3d.ts`, zero importuri din `src/`): triunghiurile modelului exact (§4), drop-cutter-ul
    exact pe ele (vârfuri, muchii, fețe, muchia discului; bila, plata, V-ul), CL-ul pe hârtie pe plan, sferă și cilindru,
    simulatorul crestei; controalele negative (eșantionul în nod, fără muchii, fără fețe) trebuie să pice.
  - **c-1, documentul v29**: `scula.forma = { tip: 'bila' }` și operația de relief (finisarea: freza, pasul lateral în celule,
    unghiul, aliniată, pasul pe trecere, marginea); migrarea, ușa, oracolul documentului, corpusul de aur; `motivFormaPeOperatie`.
  - **c-2, CAM-ul finisării** în workerul CAM (`src/cam/relief*.ts`): câmpul conservativ (maximul pe 9 puncte pe celulă), CL-ul
    pe capsula segmentului, liniile la unghi, trecerile pe Z (niciodată mai adânc decât pasul), marginea; IR-ul; invarianta 4
    judecată de oracol pe tot ce iese.
  - **c-3, interfața**: rândurile finisării în fereastra exportului (vorbit întâi cu sesiunea principală), alegerea din Tăierea;
    simularea arată rezultatul („Tăiat”), manualul.
- **25.11, la prânz: felia 18.1↑c gata** (ADR 0310, „Implementarea (18.1↑c)”, și ADR 0312): oracolul 3D întâi, documentul
  **v29** (operația `finisare`, bila), CAM-ul finisării pe câmpul conservativ, lucrarea cu dalele din browser, rolul
  „finisarea reliefului” în Tăierea. La cererea sesiunii principale („nu fără rând”, după auditul ferestrei exportului),
  finisarea are în fereastră un rând doar de citit, la locul ei în ordinea tăierii (ADR 0312 §7): automat întâi, înaintea
  exteriorului piesei; în „A mea”, unde o pune omul, iar fără rang rămâne în față. Rândul editabil vine într-o felie a lui,
  după 16.A↑b-5 și 28.8↑h, la cuvântul sesiunii principale. La cererea liniei frezelor, bila are CAM în bibliotecă
  (`FELURI_CU_CAM`, `sculaDinFreza`). Pornirea +0,2 kB, totalul +10,9 kB (902,7 / 1 000, cu `main` adus). La cererea sesiunii principale, după 16.A↑b-4:
  bila stă afară din lista bibliotecii a ferestrei (`frezePeRanduri`), iar finisarea e probată și cu XY0 în centrul foii (28.8↑o). Porțile pe
  `ff146fe1` (cu `main` `65eecdc6`), verzi. La mesajul din 18:22, adus și 16.A↑b-6 (`origin/unire-2511w`, `1d3882d9`): copia
  de readus în bibliotecă știe doar forma în V, iar rândurile n-au bile, deci bila nu se poate readuce ca plată (paza, a
  compilatorului, în `exportFreze.bila.test.ts`).
- **25.11, seara: 18.1↑c unită în `main`** (`f7ca20b6`, din `40c745f5`; PR-ul `AndreiBesliu/cvs2#39`; `main` `e5c217b2`), peste
  16.A↑b-6, 10.4↑c-2 și 16.A↑b-7; completul unirii 45672724822, verde. Documentul e v29 în `main`; un câmp nou ia v30, numărul
  îl dă sesiunea principală. Linia n-are felie în lucru: **18.1↑d (degroșarea, apoi fișa plăcii reliefului) și rândul
  editabil al finisării pornesc doar la cuvântul owner-ului.**
- **De ținut minte, din 18.1↑c:**
  - regula „cât foaia” (supracursa cu bifa „prin foaie”) stă într-un singur loc, `catFoaia` (`src/cam/prinFoaie.ts`, din
    28.8↑h), citită și de lucrare, și de desenele ferestrei; finisarea e înăuntru (`o.tip !== 'finisare'`). Un fel nou de
    operație pe relief care nu trebuie dus prin foaie se adaugă acolo, nu într-o condiție a lucrării. Proba:
    `finisare.program.test.ts` („bifa „prin foaie” nu atinge finisarea…”), care prinde otrava J05;
  - verdictul „Exportă G-code” și „Toate foile” numără și o foaie doar cu finisare (`areFinisare`, `ordinePasi`): un cod nou
    care întreabă „are foaia ce tăia?” nu se uită doar la `taieturiFoaie`;
  - relieful importat stă în colțul foii, deci o freză mai lată decât o jumătate de celulă iese din foaie: exportul cere
    confirmarea, iar o probă e2e o bifează;
  - pe telefon panoul de proprietăți nu se arată (ADR 0250 §7): o probă care pune rolul o face la lățimea de calculator și
    abia apoi trece la 390 px;
  - otrăvurile au găsit patru feluri de probe slabe, întărite: oracolul n-avea V-ul cu vârf plat (un V cu vârf era judecat ca
    unul ascuțit, deci prea îngăduitor); câmpul pe 9 puncte și diagonala se văd doar cu liniile nealiniate, la un unghi (pe
    cele aliniate, fiecare segment trece prin celulele vecine); un traseu ridicat peste lemn nu mai taie, deci surplusul
    măsurat doar pe mutările de tăiere nu-l vede (ce rămâne se măsoară cu fața plăcii unde bila n-a trecut); podeaua se
    probează doar pe un relief mai adânc decât ea.
- **26.11: felia 18.1↑d-1 (degroșarea reliefului, documentul v30, ADR 0313)**, pornită la cuvântul owner-ului („ok, porneste
  10.4↑d si 18.1↑d”, prin sesiunea principală), cu `main` `ca38f215` adus. Oracolul întâi: CL-ul cu adaosul (freza plată de
  rază R + a, plus a), judecata degroșării, simulatorul de material pe operații la rând. Apoi CAM-ul (drumul finisării, cu
  cota din câmpul dilatat), documentul **v30** (`degrosare`, câmpul `degrosare`), lucrarea (ordinea, potrivirea cu finisarea,
  avertismentul finisării puse înaintea degroșării), rolul „Relief 3D” și rândul doar de citit din fereastra exportului.
  Felia s-a împărțit: d-1 (degroșarea) și d-2 (fișa plăcii reliefului).
- **De ținut minte, din 18.1↑d-1:**
  - **Schema:** documentul e v30 (degroșarea); un câmp nou ia v31, numărul îl dă sesiunea principală.
  - **Simulatorul de material** e exact pentru freza plată (intervalul segmentului la cel mult R de coloană, coloana la 1 µm
    înăuntrul marginii). Cu eșantioane, o coloană de pe marginea discului scăpa la o trecere și era prinsă la alta, cu toată
    adâncimea: o alarmă falsă de „mai adânc decât pasul”, doar la freza plată (la bilă, marginea e sus).
  - **Pașii programului:** `PasProgram` are trei feluri (`degrosare`, `finisare`, `taietura`); un cod care alege între ele
    întreabă `p.fel === 'taietura'`, nu `p.fel === 'finisare'`.
  - **`catFoaia`** lasă și degroșarea cum e scrisă; proba în `export.hartie.test.ts`. Opt otrăvuri vechi (12.1f-4, 28.8h,
    18.1c) au fost mutate pe codul nou: `scripts/otravuri-void-noi.py` le arată.
  - **Același plan zero și aceeași margine:** lucrarea refuză o degroșare cu alt plan zero decât finisarea aceluiași relief,
    și una care trece de margine când finisarea păstrează peretele; panoul le scrie pe amândouă deodată.
  - **Probele de lângă:** o probă care cere un refuz al migrării cere și motivul lui (altfel ușa versiunii noi, după migrare,
    îl refuză oricum, cu alt motiv, și otrava trece); `hartiFinisare` are proba ei (ce dale ajung în worker).
- **26.11, 03:30: 18.1↑d-1 gata pe ramură**: otrăvurile 39 / 39 (și opt vechi, mutate), pornirea +0,1 kB, totalul +1,8 kB;
  porțile în CI, pe commit-ul raportat. Urmează 18.1↑d-2 (fișa plăcii reliefului, `docs/etape/placa-18.md`).
  - **Coborârea:** o mutare de tăiere care coboară are viteza pe Z cel mult avansul de plonjare (`avansSpre` în
    `treceriRelief`, `coborariRepeziO` în oracol). Găsită pe G-code-ul plăcii: oracolul judeca adâncimea pe material, nu și
    viteza cu care freza intră în el. Pe G-code, oracolul scade rotunjirea coordonatelor (0,001 mm) din coborâre: pe segmente
    de 0,125 mm, la prag, rotunjirea singură trecea cu ~2 % peste.
  - **Lemnul rămas, cu `ramasO`:** numără doar coloanele tăiate (sub `fata`). O probă care cere „nimic uitat” (o fâșie
    netăiată) îi dă `fata = Infinity`. Așa a scăpat fâșia de lângă pereții paraleli cu liniile degroșării.
- **26.11, 04:10: 18.1↑d-2 gata pe ramură**: fișa plăcii reliefului (`docs/etape/placa-18.md`), generatorul și fișierele de
  aur în `test/placi/placa-18/`, cotele prezise de oracolul simulării (`placa18.test.ts`, pe exportul proaspăt), otrăvurile
  10 / 10. Tăierea e a owner-ului.
- **De ținut minte, din 18.1↑d-2:**
  - **Vârful compusului e la fața plăcii:** pe o grilă, vârful e al celulei celei mai înalte (aici 7,999, nu 8), deci fundul e
    la −zmax; cotele se socotesc din zmax, nu din înălțimea pe hârtie.
  - **Bila cu peretele păstrat nu atinge fața din jur:** la capetele liniilor, pe perete rămâne cel mult o celulă de calcul
    (0,0625); pe pereții paraleli cu liniile, linia de lângă perete rotunjește muchia de sus.
  - **Modelul unei probe pe placă** e cel triangulat prin centrele celulelor (`triunghiuriModel` + `clExact`), nu funcția pe
    hârtie: lângă trepte, funcția sare, triangularea nu.
- **26.11, 21:00: 18.1↑d-3 gata pe ramură** (la cuvântul owner-ului, transmis de sesiunea principală la 20:16): pasul lateral
  aliniat se rotunjește în jos la celule întregi (ADR 0314), cu refuzul celulei mai late decât freza; otrăvurile 10 / 10, placa
  18 neschimbată. Urmează 18.1↑d-4 (rândul editabil al finisării și al degroșării în fereastra exportului).
- **26.11, 21:15: 18.1↑d-4 gata pe ramură**: rândul editabil al finisării și al degroșării în fereastra exportului (ADR 0315),
  otrăvurile 14 / 14 unitare prinse (cele e2e, în lucru), totalul +3,2 kB, pornirea neschimbată. Rămân, la cuvântul owner-ului: freza din „Frezele mele” pe rândurile
  reliefului (cu bila), desenele grupurilor, „Dă-i T{n}” pe freza reliefului.
- **De ținut minte, din 18.1↑d-4:**
  - **Fișa reliefului are starea ei în fereastră** (`paramRelief`, `src/ui/exportRelief.ts`), separată de rândurile celorlalte
    operații (`Rand`): un câmp nou al ei intră în `RandRelief`, `campuriReliefGresite`, `valoriRelief`, `GRUP_CAMP` (cu prefixul
    `relief-`) și în `operatieReliefDinDialog`, cu proba „fără schimbare, la octet”.
  - **`npm ci` într-o clonă cu `node_modules` legat de repo** golește `node_modules` din repo (`tsc: not found`).

