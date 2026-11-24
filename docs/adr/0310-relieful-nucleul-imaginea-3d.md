# ADR 0310: Relieful din imagine și prelucrarea 3D din relief: nucleul, straturile, litofania

**Starea:** acceptat pe 24.11.2026, cu toate recomandările (1a–6a, din formularul schiței, salvat la 12:55); propus în
aceeași zi, la pornirea liniei reliefului („ce urmeaza in roadmap si nu a fost atins deloc si putem
incepe” și „ok, scrie brief-ul pentru relief si pentru cote”, în sesiunea principală). Felia 18.1↑, adusă din etapa 18
(„Relieful 1: nucleul, relieful din imagine, prelucrarea 3D din relief”), linia „relief”: ramura `wip/18.1-relief`,
ADR-urile 0310–0329, canalul `relief`. Codul pornește cu felia 18.1↑a, cu oracolul scris întâi (5a). **Schița**, cu machetele și
întrebările: <https://claude.ai/artifact/Kbh5T2HAi3aMuYTQ59qz6h> (răspunsurile se salvează în pagină, în `raspunsuri/owner`).

**Rândurile pragului** (`ACOPERIRE-ARTCAM-DESKPROTO.md`): din C, „Relief din imagine”, „Alinierea pixelilor imaginii cu
grila de calcul”, „Litofanie”, „Combinarea reliefurilor”, „Rezoluție: cel puțin 4000 × 4000”, „Straturi de relief”,
„Relief ↔ imagine gri pe 16 biți”; din D, „Degroșare 3D” și „Finisare paralelă”, pornite pe relief (se închid pe STL, în
etapa 20). **Placa etapei:** pana de gri, calota, litofania.

**Continuă:** `PLAN.md` §3.4 („Relieful”: Float32 pe dale de 256 × 256, rare; operațiile în bazin, pe benzi
transferate; salvarea și undo-ul în Uint16 cu scară pe dală; relieful din vectori, rețetă derivată), ADR 0010 (simularea
pe CPU), 0011 (fără calcul pe GPU), 0012 (CAM 3D doar pe câmpul conservativ; drop-cutter-ul exact e oracolul), 0014 (fără
memorie partajată), 0015 (workere fără stare), 0047 și 0057 (nucleul simulării, vederea 3D), 0109 (calculul CAM în
workere), 0112 (rolul din panou), 0272 (imaginile pe foaie, octeții în afara documentului). Nimic de aici nu le
redeschide.

## Ce e azi

- **Relieful nu există:** niciun `src/relief/`, nicio formă `relief` în document (v27). Glosarul (`PLAN.md` §2) îl pune
  deja între elemente („contur, formă parametrică, relief, model 3D sau cotă”), iar `LECTII.md` §5 îl pune în piesă.
- **Câmpul de înălțimi există în simulare:** `src/sim/camp.ts` (dale de 16 × 16 într-un atlas, Float32), nucleul exact
  pe celulă pentru freza plată, bilă și V, benzile pe bazin, amprenta Node = Edge ca poartă (ADR 0047). Vederea 3D
  (ADR 0057) desenează un câmp de înălțimi dintr-o textură R32F; în codul ei, „relieful” e câmpul simulării
  (`ReliefSimulat`, `reliefPentru`), nu modelul de aici.
- **Freza bilă:** IR-ul și nucleul simulării o știu, oracolul simulării la fel; documentul nu (`SchemaScula`: doar plata
  și V-ul). Bila în document e în planul liniei frezelor (16.A↑e).
- **Imaginile:** ușa lor (`src/io/imagine.ts`: felul după semnătură, DPI-ul), decodarea în workerul trasării (browserul;
  TIFF-ul cu cititorul propriu, și pe 16 biți, ADR 0229), imaginile pe foaie (ADR 0272: octeții în IndexedDB
  `cncvs2-imagini`, după amprentă; foaia ține amprenta și așezarea).
- **Persistența:** documentul întreg, ca JSON canonic, la fiecare schimbare, cu ultimele 20 de versiuni
  (`src/app/proiectLocal.ts`); anularea e jurnalul de comenzi (ADR 0016).
- **Sonda s5** (07.10): Float32 pe dale rare; Uint16 cu scară pe dală, cu eroarea de 0,15–0,46 µm; câmpul conservativ,
  cu 0 scobituri și un surplus de (1,5–2) · h · tan θ; drop-cutter-ul exact pe triunghiuri ca oracol; finisarea a
  2,67 M de puncte în 2,2 s pe 16 workere, combinarea la 4000² în 13–15 ms, pensula în 0,3–2,6 ms [măsurat, s5].
- **Mărimea:** pornirea 114,7 / 120 kB (cu ușa și cu Atelierul), totalul 806,1 / 900 kB.

## Decizia (acceptată cu 1a–6a)

### 1. Relieful e un element al piesei (întrebarea 1)

- **Forma nouă `relief`**, pe un nod `element`, în documentul v29: grila (nx × ny celule, celula pătrată, în mm) și
  straturile, de jos în sus. Numărul e rezervat reliefului, dar se fixează abia la commit-ul migrării, cu sesiunea
  principală (răspunsul ei din 24.11): dacă linia cotelor n-a luat v28 până atunci, relieful îl ia pe acela, ca să nu
  rămână o versiune lipsă; unirile cu schemă intră în `main` în ordinea numerelor.
- **Matricea nodului:** mutare, rotire, oglindire și scalare uniformă (aceasta schimbă celula). Scalarea pe o singură axă
  și înclinarea se refuză, cu motivul spus: celula rămâne pătrată.
- **Ca orice element:** stă în arborele piesei, lângă vectori (o ușă cu un panou sculptat și profilul ei), iar piesa se
  pune pe foi și de mai multe ori (șase uși cu același medalion: șase instanțe, aceleași dale).
- **Un strat:** `{ id, nume, mod, vizibil, dale }`, unde `dale` e amprenta hărții dalelor (§2). Modurile (rândul
  „Combinarea”): **adună, scade, păstrează înalt, păstrează jos, înlocuiește, înmulțește**. Compusul se face de jos în
  sus, doar din straturile vizibile. **Ce se vede e ce se taie:** un strat ascuns nu intră în compus, iar exportul spune
  câte sunt ascunse.
- **Celulele goale:** un strat poate avea celule fără valoare (în afara imaginii lui; din etapa 19, în afara vectorului din
  care a ieșit). Acolo nu atinge compusul. Înmulțirea folosește stratul ca factor fără unitate (o mască de estompare).
- **Valorile** sunt în mm față de planul zero al reliefului, pozitive sau negative. Unde stă relieful pe Z ține de
  operație (§6).
- **Mai multe reliefuri pe aceeași piesă** se pot pune. Unde se suprapun, la tăiere se combină prin „păstrează înalt”
  (lasă material, ADR 0023). „Relief din imagine” cu un relief ales întreabă: strat nou în el (implicit) sau relief
  separat.

### 2. Octeții: dalele, după amprentă, în afara documentului

- **Dala** are 256 × 256 celule (`PLAN.md` §3.4) și se salvează ca Uint16 cu decalaj și pas pe dală. Eroarea e cel mult
  (max − min) / 131 070, adică 0,46 µm pe o dală de 60 mm. Un cod e rezervat pentru „gol”. O dală cu aceeași valoare
  peste tot e doar un număr (sau „goală”), fără octeți. Cheia dalei e amprenta SHA-256 a conținutului ei.
- **Harta dalelor** unui strat (amprentele și constantele, rând cu rând) e tot o resursă, cu amprenta ei. Documentul ține
  doar amprenta hărții, pe strat: 64 de caractere, oricât de mare ar fi relieful. La 4000², harta are 16 × 16 dale,
  ~17 kB.
- **Baza** e IndexedDB `cncvs2-relief`, cu dalele și hărțile, ca `cncvs2-imagini` (ADR 0272).
  - Versiunile documentului și pașii de anulare împart dalele. O schimbare care atinge 3 dale scrie 3 dale și o hartă,
    iar comanda ei din jurnal ține două amprente (~200 B).
  - Curățarea se face ca la imagini: la pornire, în fila care scrie, pentru ce nu mai folosește nicio versiune păstrată și
    a fost pus de cel puțin o zi.
- **O operație se încheie cu cuantizarea.** Relieful din memorie e mereu cel decuantizat din dalele salvate. Deci ce vezi
  e ce se salvează și ce se taie, iar programul depinde doar de document și de dale: aceiași octeți și după redeschidere.
- **Pe alt calculator:** până la fișierul proiectului (`.cvs2`, linia lui, cu resursele în zip) și la copiile în cloud, un
  relief pleacă prin „Exportă imaginea gri (16 biți)” și se întoarce exact (§7, felia g).

### 3. Calculul: în workere, fără stare, determinist

- **Workerul reliefului** (`src/jobs/lucratorRelief.ts`, construit ca al trasării, adus la cerere) face decodarea imaginii,
  imaginea → relief, litofania, netezirea, compunerea și cuantizarea. Lucrează pe benzi de rânduri de dale, transferate
  (ADR 0014), fără nimic ținut între joburi (ADR 0015). Primește dalele Uint16 (sursa adevărului) și întoarce tot dale
  Uint16.
- **CAM-ul 3D** stă în workerul CAM (`src/cam/relief*.ts`, cereri ale protocolului, ADR 0109). Primește compusul (dalele
  Uint16), face câmpul conservativ și traseele, dă IR-ul. Programul unei foi cu relief trece prin `programFoii`, ca restul.
- **Pe firul principal** stau doar dalele decuantizate ale reliefurilor arătate (o memorie după amprentă, cu plafon) și
  urcarea lor pe placa video, pentru desen.
- **Fără GPU pentru calcul** (ADR 0011). În nucleele reliefului și ale CAM-ului 3D se folosesc doar + − × ÷ √ min max și
  `src/sim/unghi.ts` (ADR 0047 §6). Amprenta Node = Edge, pe dale și pe programe, e poartă în e2e.
- **Decodarea imaginilor** o face browserul, în worker, fără conversie de culoare (`colorSpaceConversion: 'none'`,
  `premultiplyAlpha: 'none'`). PNG-ul și BMP-ul ies exact; JPEG-ul, cum îl decodează Chromium (aceiași pixeli în Edge și în
  Chrome). În Node, probele pornesc de la pixeli. PNG-ul pe 16 biți îl citește un decodor propriu (inflate prin
  `DecompressionStream`), iar TIFF-ul pe 16 biți, cititorul din ADR 0229.

### 4. Modelul exact și CAM-ul pe câmpul conservativ (ADR 0012)

- **Suprafața reliefului** e făcută din triunghiurile prin centrele celulelor, două pe pătrat, cu diagonala fixă. Între
  centrele de pe margine și marginea dreptunghiului, valoarea e a celulei de margine. Același model servește CAM-ul,
  oracolul, vederea 3D și, în etapa 24, exportul STL.
- **Câmpul conservativ** e maximul modelului pe celula de calcul. Pe o grilă aliniată cu a reliefului (aceeași celulă sau
  o diviziune a ei: ½, ¼), maximul triunghiurilor pe o celulă cade într-unul din 9 puncte (centrul, mijloacele laturilor,
  colțurile). Deci câmpul e exact și ieftin, rotunjit în sus la Float32.
- **Marginea reliefului**, o opțiune a operației:
  - „peretele rămâne” (implicit): dincolo de dreptunghi, modelul e fața plăcii, deci freza nu taie în afară;
  - „freza trece de margine”: dincolo nu e nimic, iar freza iese cu raza ei.
- **Finisarea paralelă:** liniile stau la un unghi ales față de relief, cu punctele CL la pasul celulei. Fiecare punct ia
  maximul pe capsula segmentului său (lema coardei, pe segment: varianta „celulă + segment” din s5 §4.1). Așa nu apare
  nicio scobitură între puncte. Merge cu freza plată, bilă sau V, fiecare cu ridicarea ei.
- **Degroșarea:** trepte Z cu pasul pe trecere, freza plată, adaosul pentru finisare. Pe fiecare nivel, liniile paralele
  trec doar unde CL-ul frezei, plus adaosul, e sub nivel. CL-ul frezei plate vine din dilatarea cu discul, prin maximul
  glisant. Coborârea și legăturile sunt ca la buzunar (ADR 0076).
- **Invarianta 4** (`PLAN.md` §4.2) intră cu primul relief tăiat: nicio scobitură față de modelul exact (pe segmente, cu
  16 sub-eșantioane) și creasta măsurată cel mult cât cea cerută.

### 5. Alinierea pixelilor (rândul „Alinierea…”)

- **Implicit, o celulă a reliefului e un pixel al imaginii**, fără resamplare; lățimea scrisă dă celula.
- **Liniile finisării la 0° și 90°** trec prin centrele celulelor, iar pasul lateral e un număr întreg de celule. Pasul se
  scrie în mm și se rotunjește la cel mai apropiat multiplu; valoarea rotunjită se spune lângă câmp.
- **Cu un unghi oarecare** sau cu „Nealiniat”, aplicația spune că pot apărea riduri (moiré).
- **Opțiune:** resamplarea la o celulă aleasă. O imagine mare se reduce pe medie, una mică se mărește biliniar.
- **Proba:** o imagine cu linii fine, finisată aliniat (fără bătăi) și nealiniat (bătăile măsurate).

### 6. Unde stă relieful pe Z și ce se taie (operațiile)

- **Pe Z,** implicit, vârful compusului stă la fața plăcii. Opțiunea e planul zero la o adâncime aleasă; ce ar ieși
  deasupra feței se taie la față, cu un avertisment.
- **Rolul „Relief 3D”** intră în secțiunea Tăierea (ADR 0112): degroșare și finisare, cu valorile implicite.
- **În fereastra exportului,** fiecare are rândul ei:
  - degroșarea: freza plată, pasul pe trecere, adaosul;
  - finisarea: freza, pasul lateral (în celule și în mm), unghiul, creasta pe plan, timpul.
- **Fereastra exportului o reface linia exportului** (`wip/28.8-export`). Rândurile reliefului se pun acolo după ea,
  vorbit întâi cu sesiunea principală.

### 7. Interfața (macheta e în schiță)

- **De unde pornește:** din „Importă…”, singurul loc al fișierelor (decizia din 28.10). Fereastra unei imagini are sus
  alegerea **Vectori** (trasarea de azi), **Relief**, **Litofanie** sau **Doar imaginea** (ADR 0272). Mai pornește din
  rândul unei imagini de pe foaie („Relief din imagine…”) și din paletă (`relief.din-imagine`). Imaginea se poate păstra pe
  foaie, sub relief.
- **Fereastra „Relief din imagine”**, cu setările în stânga și previzualizarea în dreapta:
  - **Sursa:** luminanța sau un canal (R, G, B).
  - **Sensul:** „Alb = sus” (implicit) sau „Negru = sus”.
  - **Înălțimea,** în mm, cu baza (planul zero).
  - **Mărimea:** lățimea în mm, cu celula = pixelul (aliniat), sau o celulă aleasă (resamplarea).
  - **Netezirea:** σ în celule; 0 = fără.
  - **Previzualizarea:** relieful umbrit, o secțiune pe o linie trasă și histograma.
  - **Piciorul:** Renunță; Importă (relief nou); „Ca strat al reliefului ales”.
- **Pe planșă,** relieful se vede umbrit (lumina din stânga-sus), sub vectori, cu chenarul elementului. Se alege, se mută
  și se rotește ca orice formă. Comutatorul „Culorile înălțimii” (o hartă în culori) stă în Vedere. Desenul e pe stratul
  WebGL2, cu dalele urcate doar la schimbare.
- **Panoul Proprietăți** (relief ales), secțiunea **Relieful:**
  - mărimea (L × Î, celula, numărul de celule) și Z-ul (min, max);
  - straturile: ochiul, numele, modul, ordinea prin tragere, „Strat nou din imagine…”, ștergerea;
  - „Exportă imaginea gri (16 biți)…”.
- **Vederea 3D** primește comutatorul „Modelul / Tăiat”: modelul din dale (fără simulare) sau placa tăiată, ca azi.

### 8. Feliile (întrebarea 2: ordinea)

Fiecare felie se termină cu ceva ce owner-ul poate încerca pe canalul `relief` și are ADR-ul ei (0311 și după), unde e
nevoie de mai mult decât scrie aici.

| Felia | Ce aduce | Ce încerci |
|---|---|---|
| 18.1↑a | Nucleul (`src/relief/`: dalele, cuantizarea, harta, compunerea), baza `cncvs2-relief`, documentul v29 (forma `relief`, oracolul documentului, corpusul de aur), relieful din imagine pe 8 biți prin „Importă…”, desenul umbrit pe planșă, secțiunea din panou | o fotografie sau un logo, făcut relief, pe planșă |
| 18.1↑b | Modelul în vederea 3D („Modelul / Tăiat”), desenat din dale, cu urcarea doar a dalelor schimbate | relieful rotit în 3D |
| 18.1↑c | Finisarea paralelă (bilă, plată, V; unghiul; aliniată), oracolul reliefului, invarianta 4 în poartă, simularea arată rezultatul | pana de gri și calota, simulate; tăiate doar cu finisarea, pe material moale |
| 18.1↑d | Degroșarea în trepte Z, cu adaosul; rolul „Relief 3D” | pana de gri și calota, degroșate și finisate |
| 18.1↑e | Straturile și combinarea (cele șase moduri, vizibilitatea, ordinea), relieful din imagine ca strat nou, anularea pe dale | două imagini combinate |
| 18.1↑f | Litofania (grosimea minimă și maximă, lumina liniară sau după material, rama, din față sau din spate, previzualizarea cu lumina din spate) | litofania, simulată |
| 18.1↑g | Relief ↔ imagine gri pe 16 biți (PNG și TIFF, cu Z-ul scris în fișier, dus-întors exact); simularea salvată ca strat | relieful mutat pe alt calculator |
| 18.1↑h | Rezoluția 4000²: fluiditatea și memoria măsurate, plafonul (întrebarea 4), alinierea probată cu bătăile | un relief de 4000 × 4000 |
| 18.1↑i | Fișa plăcii 18 (`docs/etape/placa-18.md`): pana de gri, calota, litofania, cu cotele pe hârtie, prezise de oracol | placa, tăiată de owner |

### 9. Mărimea

- **Pornirea:** cel mult +0,6 kB pe toată linia: forma `relief` în validatorul ușii, acțiunile și verificarea „documentul
  are relief?”, care aduce desenul la cerere. Judecata straturilor vine la cerere, ca a plăcuțelor (ADR 0210 §4).
  Rămân ~5,3 kB sub plafonul de 120.
- **Totalul:** ~35–50 kB pe toată linia: workerul reliefului (~12 kB), fereastra și panoul (~10), desenul 2D și 3D (~6),
  CAM-ul 3D în workerul CAM (~8), PNG-ul pe 16 biți (~4), litofania (~2). Fiecare felie spune în raport cât adaugă.

### 10. Probele

- **Oracolul reliefului** (`test/oracles/relief.ts`, cu zero importuri din `src/`; întrebarea 5), din s5 și din hârtie:
  - drop-cutter-ul exact pe triunghiuri (vârfuri, muchii, fețe, marginea discului);
  - CL-ul analitic pe plan, sferă și cilindru;
  - creasta, cu simulatorul independent (s5 §4.2);
  - cuantizarea: eroarea pe dală, pe hârtie;
  - compunerea, celulă cu celulă, pe hârtie.
- **Controalele negative din plan** trebuie să pice: eșantionul în nod; drop-cutter-ul fără testul pe muchii sau pe fețe;
  halo-ul cu un rând mai mic.
- **Invarianta 4** judecă orice program cu relief, din orice probă.
- **Determinismul:** dalele și programele, aceleași în Node și în Edge, pe 1 și pe N fire.
- **Otrăvurile** fiecărei felii, în `test/otravuri/`, cu registrul la zi.
- **Placa 18:**
  - pana de gri: o rampă liniară, de la 0 la 10 mm pe 100 mm, cu cotele la 25, 50 și 75 mm;
  - calota: o sferă cu înălțimea și raza pe hârtie;
  - litofania: pătrate de gri, cu grosimile lor pe hârtie.

### 11. Ce se portează (din sondă și din ediția întâi)

- **Din s5**, rescris pe interfețele de aici, cu s5 ca martor:
  - `rise` (ridicarea frezei), tabelul deplasamentelor cu capsula, CL-ul pe rând cu oprirea timpurie și maximul pe
    fereastră, rotunjirea în sus la Float32 (`lib/hf.mjs`, `lib/geom.mjs`) → `src/cam/`;
  - drop-cutter-ul exact pe triunghiuri și formulele CL (`lib/mesh.mjs`, `oracole-hf.mjs`) și simulatorul crestei
    (§4.2) → oracolul.
- **Din ediția întâi** (`docs/PORTARE.md` §4):
  - dilatarea gri cu lema coardei și maximul glisant: **rescrise, cu s5 ca martor.** s5 a refăcut și a măsurat aceleași
    idei, iar varianta veche („nod + maxim pe vecini”) sapă 5 mm pe un perete subțire (s5 §4.1);
  - transformata Danielsson nu trebuie în etapa 18 (o cere estomparea, etapa 19): se judecă atunci.
- **Limita verdictului:** codul vechi nu e în containerul liniei, deci verdictul se sprijină pe `LECTII.md` §3.2 și pe
  s5. E scris și în `docs/PORTARE.md` §4.1; owner-ul poate obiecta.

### 12. Ce rămâne la alegerea omului (opțiuni, nu întrebări)

Variantele care pot sta împreună intră ca opțiuni, cu recomandarea ca implicit:
- sensul gri → înălțime (alb sau negru sus) și sursa (luminanța, R, G, B);
- celula: aliniată (pixelul) sau aleasă, prin resamplare;
- netezirea;
- desenul 2D: umbrit sau „Culorile înălțimii”;
- vederea 3D: modelul sau tăiat;
- marginea reliefului: peretele rămâne sau freza trece;
- Z-ul: vârful la față sau planul zero la o adâncime;
- finisarea: freza, unghiul, aliniat sau nealiniat;
- litofania: lumina liniară sau după material, din față sau din spate, rama;
- fișierul pe 16 biți: PNG sau TIFF.

### 13. Freza bilă în document (răspunsul la întrebarea 3: „a”)

Sesiunea principală e de acord (24.11) ca bila să intre odată cu forma `relief`, cu forma câmpului stabilită împreună cu
linia frezelor, a cărei e modelul frezei (`src/model/freza.ts`, `sculaDinFreza`). Propunerea trimisă liniei frezelor:

- **În document:** `scula.forma = { tip: 'bila' }`, fără alte câmpuri. Raza bilei e `diametru / 2`; restul frezei
  (`numar`, `nume`, `diametru`, `biblioteca`, `regim`, `tais`) rămâne ca în v27. `forma` devine o variantă după `tip`:
  lipsă = plată, `'v'` ca azi, `'bila'` nou. Mai târziu, toroidala, tot pe linia frezelor:
  `{ tip: 'toroidala', raza }`, cu 0 < raza < diametru / 2 (raza = diametru / 2 ar fi bila).
- **Migrarea:** schimbă doar numărul. Un document mai vechi nu poate avea `tip: 'bila'` (ușa lui îl refuză), deci nu
  există ciocnire de căutat.
- **În IR și în simulare:** aceeași formă (`FormaScula` are deja `{ tip: 'bila' }`); nucleul simulării și oracolul ei o
  știu (ADR 0047), elicea cu bila rămâne refuzată (finisarea n-are elice).
- **Unde e voie, în felia reliefului:** doar pe operațiile de relief (finisarea). Profilul, buzunarul, găurirea și V-carve-ul
  o refuză cu motiv, ca pe V în locurile lui (ADR 0092 §3), până la felia bilei a liniei frezelor (16.A↑e), care o duce și
  acolo, cu simularea și oracolul ei.
- **În bibliotecă:** felul „bilă” (`FELURI_FREZA`, `sculaDinFreza` → `{ tip: 'bila' }`), al liniei frezelor; până atunci,
  bila se alege pe rândul exportului, ca freza în V la început.

**Răspunsul liniei frezelor (24.11, de acord), cu precizările ei:**

- **O singură scriere pe freză.** Lipsa formei rămâne plata (fără `{ tip: 'plata' }` în document), deci documentele de azi
  rămân octet cu octet. Toroidala (16.A↑e) va fi `{ tip: 'toroidala', raza }`, cu raza finită și 0 < raza < Ø / 2
  strict; raza = Ø / 2 se scrie doar ca bilă, fiindcă recunoașterea frezei din bibliotecă și unirea operațiilor compară
  forma. Bila nu primește `raza`.
- **Locurile care presupun azi că orice formă e V**, de trecut pe variantă odată cu bila (compilatorul le arată pe cele
  care citesc `unghi`, dar nu și mesajele): forma din document → IR (`src/cam/job.ts`, `src/cam/dopV.ts`); motivul „T… e
  plată” pentru orice formă care nu e V (`src/cam/job.ts`, `src/cam/incrustatie.ts`), care trebuie să numească forma;
  `src/model/rol.ts`, `src/model/raportFoi.ts`, `src/app/PanouProprietati.tsx`.
- **Ce formă primește fiecare operație stă într-o singură funcție pură din model:** `src/model/formaFrezei.ts`, cu
  `motivFormaPeOperatie(tip, latura, forma)` (motivul sau null), folosită de lucrare, de secțiunea Tăierea și de rândul
  exportului. Cine ajunge întâi în `main` o scrie: relieful, cu V-ul de azi plus bila pe finisarea reliefului; sau linia
  frezelor (16.A↑b-2), cu V-ul de azi, iar relieful adaugă bila. 16.A↑e doar lărgește tabelul.
- **Biblioteca:** după ce relieful e în `main`, linia frezelor poate pune „Bilă” în bibliotecă fără să aștepte 16.A↑e
  (ADR 0300 §2: un fel apare când CAM-ul îl poate tăia), oferită doar operațiilor care o primesc. `biblioteca`, `regim` și
  `tais` merg pe bilă ca pe orice freză (`src/cam/regimFreza.ts`). Pasul lateral din bibliotecă e un procent din diametru;
  dacă finisarea lucrează cu creasta, conversia e a reliefului: h = R − √(R² − (s/2)²), fără câmp nou.
- **Oracolul documentului și corpusul de aur:** bila acceptată de la v29 și refuzată înainte, în `problemeOperatieO`, cu
  frontiera pe hârtie; în `ADAUGIRI`, o bilă pe o operație de relief.

## Întrebările (recomandarea întâi; răspunsurile owner-ului: 1a, 2a, 3a, 4a, 5a, 6a)

1. **Unde stă relieful.**
   - **a) Element al piesei, pe planșa Proiectare, lângă vectori,** cu straturile lui (recomandat). Piesa cu relief se
     pune de mai multe ori și pe foi, cu vectorii ei; așa cer glosarul și `LECTII.md`.
   - b) Un strat al foii: un singur relief compus pe foaie, ca modelul din ArtCAM. E cunoscut celor care vin din ArtCAM,
     dar nu se pune de mai multe ori și nu stă în piesă.
   - c) O fereastră separată „Relief” în meniul global, cu planșa ei; relieful se duce apoi în proiect.
2. **Ordinea feliilor.**
   - **a) Întâi ce se poate tăia:** a, b, c, d, apoi e, f, g, h și fișa plăcii (recomandat). Pana de gri și calota se pot
     tăia după d.
   - b) Întâi tot relieful (straturile, 16 biți, 4000²), CAM-ul la urmă.
   - c) Litofania întâi: a, b, c, f, apoi restul.
3. **Freza bilă în document.**
   - **a) O aduce linia reliefului, în v29** (`{ tip: 'bila' }` pe freza unei operații de relief, aleasă pe rândul
     exportului), cu simularea și oracolul care o știu deja; linia frezelor o primește în bibliotecă la felia ei, 16.A↑e
     (recomandat).
   - b) Relieful așteaptă bila de la linia frezelor și finisează până atunci cu freza plată și cu V-ul; calota iese mai
     aspră.
4. **Cât de mare poate fi un relief.**
   - **a) 8192 × 8192 celule** (64 M: ~256 MB în memorie pe strat, ~128 MB salvat), cu fluiditatea probată la 4000², cât
     cere pragul (recomandat). Peste plafon, refuzul spune de ce.
   - b) 4096 × 4096, exact pragul: o placă de 600 mm la 0,1 mm nu mai încape.
   - c) 16384 × 16384: o placă de 1,6 m la 0,1 mm; pe un laptop de 8 GB, un singur strat ocupă 1 GB.
5. **Oracolul reliefului.**
   - **a) Îl scriu eu, înaintea nucleului,** din s5 și din hârtie, într-un commit separat, fără importuri din `src/`, fără
     cost în plus (recomandat).
   - b) Îl scrie un agent într-o clonă fără `src/relief/` și `src/cam/`, ca oracolul simulării (ADR 0047). Independența e
     mai tare; costul, ~0,3–0,5 M tokeni, ~1 oră.
6. **Litofania de pe placă: materialul.**
   - **a) O placă albă translucidă** (Corian, acril opal, PVC expandat alb) de 6 mm, cu grosimea rămasă 0,8–3,0 mm și
     freza bilă Ø1,5–Ø3 (recomandat).
   - b) Lemn subțire, deschis la culoare (tei, paltin, furnir lipit), cu grosimea rămasă 0,6–2 mm.
   - c) Altul (scrie-l).

   Valorile implicite ale ferestrei pornesc de la răspuns; celelalte rămân de ales.

## Respinse

- **Relieful ca strat al foii** (întrebarea 1, b): nu se pune de mai multe ori și se desparte de vectorii piesei.
- **Calculul pe GPU** (ADR 0011) și **eșantionarea în nod pentru CAM** (ADR 0012).
- **Dalele ținute în workere între joburi** (ADR 0015).
- **Relieful în document**, ca base64: documentul se scrie întreg la fiecare schimbare, cu 20 de versiuni.
- **Un strat întreg ca o singură resursă:** o pensulă ar rescrie zeci de MB; dalele după amprentă rescriu doar ce ating.
- **Half-float pentru înălțimi:** 7,8–15,6 µm de eroare [măsurat, s5 §3].
- **WASM:** JS ține pasul pe aceste nuclee [măsurat, s5 §5.7].

## Se redeschide dacă

- finisarea unui relief obișnuit (4000², freza bilă Ø3, pasul de 0,3 mm) trece de 10 s pe calculatorul owner-ului, măsurat
  (atunci GPU-ul în v1.x, ca la ADR 0011);
- memoria unui relief de 4000² cu 4 straturi trece de ~1 GB într-o filă, sau un laptop de 8 GB nu-l poate edita (atunci
  dalele ținute pe Uint16 în memorie și decuantizate la cerere);
- placa 18 arată riduri pe relieful aliniat (atunci alinierea se reface, cu proba ei).
