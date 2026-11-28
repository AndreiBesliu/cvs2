# ADR 0323: Relieful la 4000²: măsurătorile și ce redeschid

**Starea:** propus pe 28.11.2026, la cuvântul owner-ului („Porneste sesiunile, pune-le sa continue cu ce aveau la rand”,
transmis liniei reliefului de sesiunea principală). Felia **18.1↑h**, linia reliefului. Măsurătorile sunt fapte. Ce urmează din
ele (§4) atinge două rânduri „Se redeschide dacă” din ADR 0310, deci e decizia owner-ului; aici e recomandarea, iar codul nu
pornește înaintea răspunsului.

**Continuă:** ADR 0310 §8 (rândul 18.1↑h: rezoluția 4000², fluiditatea și memoria măsurate, plafonul, alinierea probată cu
bătăile), „Se redeschide dacă” (finisarea unui relief de 4000², cu bila Ø3 și pasul de 0,3 mm, peste 10 s pe calculatorul
owner-ului; memoria a 4 straturi de 4000² peste ~1 GB într-o filă), întrebarea 4 cu răspunsul 4a (plafonul 8192²); ADR 0011
(fără GPU în v1); ADR 0015 (workerele fără stare între joburi).

## Măsurătorile

Un relief sintetic de N × N celule de 0,1 mm (sinusuri, 0,5 … 5,5 mm), în Node 26, **într-un singur fir**, în containerul
liniei (4 nuclee, 16 GB), cu `scripts/masura-relief.ts`. Memoria e RSS-ul procesului după fiecare pas, deci se adună (la
capăt: relieful, dalele, compusul și calculul CAM, ca în workerul CAM).

| Pasul | 1000² (100 mm) | 2000² (200 mm) | 4000² (400 mm) |
|---|---:|---:|---:|
| stratul din grilă (dalele, harta) | 0,05 s | 0,26 s | 0,66 s |
| dalele citite înapoi | 0,01 s | 0,05 s | 0,07 s |
| compusul (un strat) | 0,01 s | 0,02 s | 0,07 s |
| desenul (redus, umbrit) | 0,04 s | 0,13 s | 0,27 s |
| PNG-ul pe 16 biți (ADR 0322) | 0,21 s | 0,63 s | 2,23 s |
| degroșarea (plată Ø6, pasul lateral 2,5) | 1,22 s | 6,07 s | 27,44 s |
| finisarea (bilă Ø3, pasul lateral 0,5) | 13,18 s | 38,62 s | 117,60 s |
| finisarea (bilă Ø3, pasul lateral 0,3) | | | 186,97 s, apoi refuzul |
| mișcările finisării | 389 198 | 1 577 185 | 6 351 155 |
| RSS-ul cel mai mare | 341 MB | 697 MB | 2 235 MB |

La 4000² cu pasul 0,3 (condiția din ADR 0310), finisarea **nu iese**: cotele liniilor (1 334 de linii) se calculează în 187 s,
apoi lucrarea o refuză, fiindcă programul ar avea peste 20 de milioane de puncte (`PUNCTE_FINISARE_MAXIM`, ~10,7 M pe trecere,
× 2 treceri). Plafonul se verifică abia după cote: numărul trecerilor vine din cea mai adâncă cotă. Plafonul ține memoria: la
pasul 0,5, 6,35 M de mișcări au dus procesul la 2,2 GB, deci 21 M ar trece de 5 GB, peste ce ține o filă.

**Unde se duce timpul finisării** (profilul pe 1000², `--cpu-prof`): 70 % în distanța de la segment la blocurile piramidei
(`distSegmentCutie`), 21 % în cota segmentului (`cotaSegment`), sub 2 % în pregătirea câmpului (`campPeCelula`, `piramida`).
Liniile sunt independente una de alta: cota unei linii nu depinde de alta.

**Memoria:** la o celulă de 0,1 mm, câmpul de calcul are celula 0,05 (`diviziune`, ADR 0310 §4), deci 8000² de celule, cu
piramida maximelor peste ele; asta, plus mișcările (6,35 M), duce procesul la 2,2 GB cu un singur strat.

**Ce merge fluid:** tot ce ține de relief până la CAM (stratul, citirea, compunerea, desenul, PNG-ul) stă sub 2,3 s la 4000²,
într-un fir.

## Ce depășește pragurile

1. **Finisarea:** pragul din ADR 0310 e 10 s, la pasul lateral 0,3. Aici, la 0,5 (mai rar), ia 118 s într-un fir; la 0,3,
   cotele singure iau 187 s, iar programul e refuzat de plafonul punctelor. Chiar împărțită pe 8 nuclee, rămâne peste 10 s.
2. **Memoria:** pragul e ~1 GB pentru 4 straturi; aici, un strat cu calculul CAM ia 2,2 GB.
3. **Refuzul vine târziu:** la 4000² cu pasul 0,3, omul așteaptă 3 minute ca să afle că programul nu se poate face.

## Întrebările owner-ului (recomandarea întâi)

1. **Finisarea, cum o aducem sub prag:**
   - **a) Întâi pe CPU, fără GPU (recomandat):** liniile finisării și ale degroșării împărțite pe workerele bazinului CAM (un
     worker pe nucleu, același program octet cu octet: liniile se lipesc în aceeași ordine), apoi distanța la blocurile
     piramidei făcută mai ieftin (70 % din timp). Măsurat din nou pe calculatorul tău; GPU-ul numai dacă tot nu ajunge.
   - b) GPU-ul acum (ADR 0011 redeschis, v1.x adus în v1).
   - c) Timpul lăsat cum e, cu bara de progres și anularea (azi, exportul unui relief mare doar așteaptă).
2. **Memoria:**
   - **a) Câmpul de calcul pe Float32 și pe dale, adus doar cât trebuie liniilor unui worker (recomandat, odată cu 1a):**
     fiecare worker ține doar banda lui de relief.
   - b) Dalele ținute pe Uint16 în memorie, decuantizate la cerere (varianta din ADR 0310), și pentru desen.
   - c) Plafonul coborât (de exemplu 4096²), cu refuzul spus.
3. **Măsurătoarea pe calculatorul tău:** `node --expose-gc scripts/masura-relief.ts` (4000² și pasul 0,3, condiția din ADR
   0310); îmi trimiți ce scrie. Ea decide pragul, nu containerul liniei.
4. **Plafonul 8192² (răspunsul 4a):** rămâne; la 8192², timpul și memoria ies de ~4 ori mai mari, deci un relief atât de mare
   cere 1a și 2a.
5. **Plafonul punctelor (20 de milioane) și refuzul de după cote:**
   - **a) Plafonul rămâne până la 2a, iar refuzul se spune înaintea cotelor, cât se poate (recomandat):** punctele unei treceri
     se pot număra înaintea cotelor (azi se adună linie cu linie, odată cu ele); peste plafon chiar cu o singură trecere, refuzul
     vine imediat; altfel, calculul și verdictul de azi, după cote. O felie mică, cu proba ei, fără nicio schimbare în programele
     care ies. Cu 2a (mișcările scrise pe bucăți, nu ținute toate), plafonul urcă.
   - b) Plafonul urcat acum (de exemplu 40 M), cu riscul ca fila să cadă din lipsă de memorie.
   - c) Plafonul și refuzul, cum sunt.

## Bătăile (alinierea): proba, felia 18.1↑h-2

Proba din ADR 0310 §5 („o imagine cu linii fine, finisată aliniat (fără bătăi) și nealiniat (bătăile măsurate)”) e
`test/unit/relief3d.batai.oracol.test.ts` și nu depinde de mărime. Relieful: dungi paralele cu liniile, o celulă de 0,5 mm
creastă și una vale (perioada P = 1 mm), bila Ø3; suprafața tăiată vine din simulatorul oracolului, nu din CAM.

- **Pe hârtie:** o linie la distanța φ de creastă se sprijină pe creastă, deci CL = −1 − (R − √(R² − φ²)); câmpul conservativ
  adaugă cel mult urcarea(P / 2) − urcarea(P / 2 − h) = 0,0206 mm (h = 1/16 mm), atinsă exact pe liniile de pe vale.
- **Aliniat** (0° și 90°, pașii de 1, 2 și 3 celule): fiecare linie trece printr-un centru (φ = 0 sau P / 2), CL-ul e cel de pe
  hârtie, iar media suprafeței pe o fereastră cât perioada comună (P, sau 3 · P la 3 celule) e aceeași peste tot, la 1e-9: fără
  bătăi.
- **Nealiniat** (pașii ceruți 0,9 și 0,95): CL-ul fiecărei linii e tot cel de pe hârtie, dar faza alunecă de la o linie la alta,
  deci media suprafeței pe o perioadă urcă și coboară cu 0,06 mm, cu perioada de pe hârtie, s · P / |s − P · rotunjit(s / P)|
  (8,33 mm la 0,8929, 16,7 mm la 0,9434), la 3 %.
- **Otrăvurile** (`test/otravuri/18.1h2.py`): 5 / 5 prinse (liniile aliniate mutate cu o zecime de celulă, pasul care sare o
  celulă, „Nealiniat” ignorat, liniile nealiniate mai rare decât pasul spus, urcarea bilei prea mică), martorul scapă.

## Ce urmează, cu recomandarea aplicată

La cuvântul owner-ului transmis de sesiunea principală („mergi înainte cu recomandarea” la întrebările lui, pe 28.11), linia
merge pe 1a, 2a și 5a, fără GPU (ADR 0011 rămâne), în felii mici, fiecare cu proba întâi și cu programul octet cu octet:
ADR 0310 §4 punea deja bazinul de workere la 4000² („Fluiditatea la 4000² (bazinul, maximul glisant pe linii aliniate) e a
feliei 18.1↑h”), deci liniile pe workere nu redeschid nimic. Ordinea: refuzul punctelor înaintea cotelor (5a); liniile pe
workerele bazinului CAM; distanța la blocurile piramidei mai ieftină; câmpul pe benzi (2a). Măsurătoarea pe calculatorul
owner-ului (3) rămâne a lui: ea spune dacă, după ele, pragul de 10 s e trecut (atunci, abia atunci, GPU-ul, cu ADR-ul lui).

## Implementarea 5a (felia 18.1↑h-3)

În `treceriRelief` (`src/cam/reliefFinisare.ts`), liniile fiecărui relief, verificările lor și numărul punctelor de pe trecere se
fac înaintea oricărei cote, deci refuzul „pe trecere” vine fără calcul. Pentru refuzul punctelor × trecerilor, numărul trecerilor
are o margine de jos din vârful unui singur punct al traseului: pe fiecare relief, punctul de linie cel mai apropiat de celula
cea mai joasă (dintre celulele la fel de joase, cea din mijlocul lor, ca pe un fund plat bila să stea pe fund, nu lângă pantă),
socotit cu aceleași segmente, în aceeași ordine. Cea mai adâncă cotă e cel mult vârful lui, deci marginea nu trece niciodată de
numărul adevărat (cu toleranța 1e-6, mai largă decât a numărului, 1e-9); peste plafon chiar cu ea, refuzul vine acum, cu același
motiv; altfel, verdictul rămâne după cote. Indiciul piramidei (celula maximului de la segmentul dinainte) se pune la loc după
punctul ales, deci calculul de după pornește ca înainte: programele care ies sunt aceleași, octet cu octet.

- **Măsurat:** la 4000² cu pasul 0,3, refuzul vine în 2,9 s (pregătirea câmpului și liniile), nu în 187 s.
- **Proba:** `test/unit/reliefFinisare.puncte.test.ts` (o groapă cu fund plat într-un platou ondulat, 204 800 de puncte pe trecere):
  97 de treceri ies, 98 și 200 sunt refuzate fără cote (sub un sfert din timpul programului întreg), iar cu un ac în care bila nu
  intră (cea mai joasă celulă) refuzul vine după cote, același. **Otrăvurile:** `test/otravuri/18.1h3.py`, 6 / 6.

## Implementarea 1a, întâi distanța mai ieftină (felia 18.1↑h-4)

În `cotaSegment`, tăierea blocurilor piramidei folosește o margine de jos a distanței, ieftină: de la mijlocul segmentului la
cutie, minus jumătatea lungimii lui (orice punct al segmentului e la cel mult atât de mijloc), minus o rezervă de 1e-9 mm pentru
rotunjiri; distanța exactă (`distSegmentCutie`) se socotește doar pe frunze, unde dă valoarea. Copiii stau în cutia părintelui,
deci marginea lui le e și lor margine (o tăiere înaintea distanței lor). Un bloc tăiat are toate frunzele cel mult cât marginea,
deci maximul e cel al parcurgerii tuturor celulelor.

- **Proba:** `test/unit/reliefFinisare.cota.test.ts`: cota = forța brută peste toate celulele, la `===`, pe reliefuri la
  întâmplare (aspre, cu goluri, cu platouri egale), segmente scurte, lungi, degenerate și pe lângă relief, toate frezele; și pe
  liniile unei finisări, segment după segment. Programele, octet cu octet: aurul plăcii 18 și probele finisării și degroșării
  (94 / 94); pe reliefuri de 600², amprenta rezultatului la fel cu a codului de dinainte. **Otrăvurile:** `18.1h4.py`, 7 / 7.
- **Măsurat** (4000², un fir): degroșarea 27,4 → 12,6 s; finisarea la pasul 0,5, 117,6 → 43,5 s (aceleași 6 351 155 de mișcări);
  la pasul 0,3, într-o singură trecere (pasul pe trecere 6, sub plafonul punctelor), 69,4 s, cu 10,6 M de mișcări și 3,1 GB.
  Pe 600²: bila de 2,8 ori mai repede, liniile la 30° de 3,5 ori, V-ul de 3,8 ori.
- **Ce rămâne pentru prag (10 s):** liniile pe workere (aproape liniar cu nucleele: liniile sunt independente) și memoria (2a),
  unde mișcările unei finisări la 0,3, ținute toate, cer singure peste 2 GB.

## Implementarea 2a, întâi banda (felia 18.1↑h-5)

`campPeCelula` (și `campConservativ`, la q = 1) socotește doar rândurile de calcul [j0, j1) ale unei benzi, iar nodurile grilei
de calcul stau pe două rânduri, nu într-un tablou cu toate, (mx + 1)(my + 1): un nod e cota modelului în colțul lui, deci aceeași
pe bandă ca pe tot relieful. `pregateste(r, { j0, j1 })` ține câmpul și piramida doar pentru bandă; `cotaSegment` socotește
cutiile frunzelor cu rândul global (începutul benzii plus cel local, întregi, apoi înmulțite), deci, cât banda cuprinde tot ce e
în raza frezei de segment, cota e aceeași, bit cu bit. Fără bandă, totul e ca înainte: programele, octet cu octet.

- **Proba:** `test/unit/reliefFinisare.banda.test.ts`: câmpul pe bandă = rândurile lui din câmpul întreg (`Object.is`), la toate
  diviziunile (q = 1 … 16), și la margini; cota pe bandă = cota pe tot relieful, cu peretele și fără, pe segmente la întâmplare,
  toate frezele; memoria câmpului, cât banda. **Otrăvurile:** `18.1h5.py`, 6 / 6.
- **Măsurat** (4000², un fir): vârful memoriei la degroșare, 1 728 → 1 245 MB (tabloul nodurilor, ~0,5 GB, nu mai e ținut);
  timpii, neschimbați. La finisare, vârful (2,2 GB la pasul 0,5) e dat acum de mișcările ținute toate (~150 de octeți pe
  mișcare, ca obiecte IR), nu de câmp.
- **Ce urmează:** liniile pe workere (fiecare cu banda lui de relief, deci memoria câmpului împărțită la numărul lor) și o
  întrebare nouă (6, mai jos), pentru mișcări.

## Întrebarea 6: mișcările finisării, ținute compact (recomandarea întâi)

La 4000² cu pasul 0,3, finisarea are 10,6 M de mișcări; ca obiecte IR (`Miscare`, cu `la` al ei) cer ~1,6 GB, peste câmp. Plafonul
punctelor (20 M) le ține sub ce cade o filă.

- **a) Mișcările reliefului ținute în tablouri (X, Y, Z, felul), până la post, cu un ADR al IR-ului (recomandat):** ~32 de octeți
  pe mișcare, deci de ~5 ori mai puțin; programul scris, același, octet cu octet; plafonul punctelor urcă după ea.
- b) Plafonul rămâne 20 M, iar mișcările, obiecte (azi).

## Planul liniilor pe workere (feliile 18.1↑h-6 … 18.1↑h-8)

Tiparul e al bazinului simulării (ADR 0047 §4, `src/jobs/bazin.ts`): N workere fără stare (cel mult 8, după nuclee), oprite la
capătul jobului; în Node, loturile rulează pe rând, prin aceeași funcție. Cotele se calculează înaintea programului, care rămâne
sincron (exportul, traseul, simularea, potrivirea îl construiesc la fel).

- **18.1↑h-6 (pur):** finisarea și degroșarea în trei părți: **planul** (liniile, refuzurile, avertismentele, marginea de jos a
  trecerilor, fără câmpul întreg), **cotele unui lot de linii** (cu câmpul doar pe banda de rânduri de care are nevoie lotul, pe
  fiecare relief) și **mișcările** (din cote). Proba: loturile lipite dau cotele dintr-o bucată, bit cu bit, oricum ar fi
  împărțite liniile; programele, octet cu octet.
- **18.1↑h-7 (loturile ca cereri de sine stătătoare) și 18.1↑h-8 (bazinul):** workerul CAM face planul și împarte liniile în loturi; fiecare lot pleacă la un worker al cotelor cu
  banda lui de relief (tablouri transferate), iar cotele se întorc tot transferate. Un calcul de relief mare are deci N workere,
  nu unul (o completare a ADR 0109, „un worker pe calcul”). Pentru liniile la 0° și 90°, banda unui lot e îngustă (memoria
  câmpului se împarte la N); la un unghi oarecare, un lot de linii întregi are nevoie de aproape tot relieful, deci acolo
  loturile se fac pe bucăți de linie, nu pe linii întregi.

## Implementarea 18.1↑h-6 (planul, cotele pe loturi, mișcările)

`treceriRelief` e acum `planTreceri` (verificările, liniile, avertismentele, numărul punctelor și marginea de jos a trecerilor,
cu câmpul doar pe benzile din jurul punctului ales), `coteLot` (cotele liniilor [k0, k1) ale unui relief: cu `cota` dată, pe
câmpul întreg; fără, pe benzile de care are nevoie lotul, pe fiecare relief, după **raza cotei**, care la degroșare e a frezei
plate de rază R + adaos) și `miscariTreceri` (din cote, cu legăturile dintre linii pe câmpul întreg). Finisarea dintr-o bucată
le înșiră pe câmpul întreg, ca înainte: programele, octet cu octet (amprentele rezultatului pe reliefurile de 600², aurul plăcii
18, probele finisării și degroșării, 106 / 106).

- **Proba:** `test/unit/reliefFinisare.loturi.test.ts`: loturile lipite = cotele dintr-o bucată, bit cu bit, pe un relief și pe
  două (al doilea rotit și mutat), la 0°, 90°, 30° și nealiniat, cu toate frezele, peretele și marginea trecută; degroșarea cu
  adaosul 0, 0,5 și 2; împărțiri la întâmplare și câte o linie pe lot. Plus, în `reliefFinisare.puncte.test.ts`, un șanț în V
  (bila nu ajunge la fund): marginea de jos rămâne strânsă, deci 97 de treceri ies.
- **Găsit la scriere:** banda lotului după raza frezei, nu a cotei (la degroșare, cu adaos, cotele ieșeau prea jos pe marginea
  benzii); reparat înaintea primului commit și pus ca otrava M01. **Otrăvurile:** `18.1h6.py`, 6 / 6.

## Implementarea 18.1↑h-7 (loturile ca cereri de sine stătătoare)

`loturiCote(plan, k)` împarte liniile fiecărui relief în cel mult k loturi cu cam aceleași puncte și face din fiecare o cerere
de sine stătătoare (`CerereCote`): punctele liniilor, în lume și în ordinea parcurgerii; pe fiecare relief, doar rândurile de
relief de care au nevoie nodurile benzii lui (tăiate din tablou, cu decalajul lor, `ReliefCam.zRand0`) și banda însăși; freza
cotei, ridicarea, podeaua, marginea. `cotePuncte(cerere)` e ce face un worker: cotele lotului. `ParametriFinisare.cote` (și la
degroșare) primește cotele tuturor liniilor, în ordinea planului, și le folosește doar dacă sunt ale planului (același număr de
linii și de puncte); altfel le socotește din nou. Modelul exact și câmpul citesc o bandă cu rândul global minus începutul ei.

- **Proba:** `test/unit/reliefFinisare.cereri.test.ts`: finisarea (un relief și două, rotite; patru unghiuri; toate frezele) și
  degroșarea (adaosul 0, 0,5, 2) din cotele a 1, 2, 3 și 7 loturi, trecute prin `structuredClone`, = cele de azi, octet cu octet;
  și la celula de 0,05 mm (câmpul pe 9 puncte); cotele date chiar se folosesc (altele dau alt program), iar cele care nu sunt ale
  planului se socotesc din nou; la 0°, rândurile trimise unui lot sunt cât banda lui (sub 90 din 400); workerul nu citește
  niciodată în afara rândurilor primite (o citire urmărită, pe fiecare index). **Otrăvurile:** `18.1h7.py`, 7 / 7.

