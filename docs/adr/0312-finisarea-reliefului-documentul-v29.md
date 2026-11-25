# ADR 0312: Finisarea reliefului în document (v29): operația `finisare` și freza bilă

**Starea:** acceptat pe 25.11.2026, în cadrul ADR 0310 (felia 18.1↑c, linia reliefului): e forma în document a ce ADR 0310 a
hotărât în §4–§6 și §13 (răspunsurile owner-ului 2a și 3a), fără o decizie nouă de produs. Numărul v29 l-a dat sesiunea
principală pe 25.11 („v29 e al tău”); forma bilei e cea stabilită cu linia frezelor pe 24.11 (ADR 0310 §13), reconfirmată pe
25.11.

**Continuă:** ADR 0310 (relieful, §4 modelul exact și câmpul conservativ, §5 alinierea, §6 Z-ul și operațiile, §13 bila),
ADR 0024 (un câmp nou cu sens intră doar cu schemă nouă și migrare), ADR 0090 și 0092 (forma frezei), ADR 0300 §5 (valorile
frezei, v27).

## Decizia

### 1. Freza bilă

`scula.forma` devine o variantă după `tip`: lipsă = plata (ca până acum, octet cu octet), `{ tip: 'v', unghi, varf? }` ca azi
și, nou, `{ tip: 'bila' }`, fără alte câmpuri (raza e `diametru / 2`). Ușa o primește pe orice freză; unde se poate folosi o
judecă lucrarea, printr-un singur loc (`motivFormaPeOperatie`, `src/model/formaFrezei.ts`): doar pe finisarea reliefului.
Profilul, buzunarul, găurirea, V-carve-ul, fundul plat, frezele de rest și ale dopului o refuză cu motivul lor, până la felia
bilei a liniei frezelor (16.A↑e).

### 2. Operația `finisare`

Un fel nou de operație, `tip: 'finisare'`, doar pe elemente `relief` (ușa refuză o finisare pe un contur, cum refuză o
operație 2D pe un relief). Câmpurile comune rămân, cu sensul lor pe relief:

- `noduri`: reliefurile piesei pe care le finisează (unul sau mai multe; unde se suprapun, „păstrează înalt”, ADR 0310 §1);
- `scula`: plata, V-ul sau bila;
- `pasLateral` (cerut de ușă pe o finisare): distanța dintre liniile paralele, în mm, în (0, 50] ca pe buzunar; aliniată,
  lucrarea o rotunjește la celule întregi (ADR 0310 §5) și spune valoarea rotunjită;
- `pas`: cât coboară cel mult o trecere (invarianta: niciodată mai adânc decât pasul pe trecere); finisarea se face în treceri
  pe Z, ultima pe model;
- `adancime`: cel mai adânc loc sub fața plăcii la care ajunge freza (o podea: sub ea finisarea nu coboară);
- `latura`, `sens`, `urechi`, `rampa`, `intrari`, `colturi`: cerute de schemă, fără efect pe finisare (aplicația scrie
  `pe-linie`, `urcare`, `null`); ușa nu le leagă de felul operației, iar lucrarea refuză urechi, rampă, intrări sau degajări
  pe o finisare. La fel câmpurile celorlalte feluri (`coborare`, `fundPlat`, `rest`, `strategie`, `incrustatie`…): ușa le
  judecă forma, lucrarea le refuză pe o finisare.

Câmpul nou `finisare`, cerut de ușă pe o finisare; ușa îi judecă forma oriunde apare, iar lucrarea îl refuză pe alt fel:

- `unghi`: unghiul liniilor față de axa X a reliefului, în grade, în [0, 180);
- `nealiniat?: true`: liniile nu urmează centrele celulelor (lipsă = aliniate; la un unghi care nu e 0 sau 90, lucrarea spune că
  pot apărea riduri, ADR 0310 §5);
- `margine?: 'trece'`: freza trece de marginea reliefului (lipsă = „peretele rămâne”: dincolo de dreptunghi, modelul e fața
  plăcii, ADR 0310 §4);
- `planZero?: number`: adâncimea planului zero al reliefului sub fața plăcii, în mm, în [0, 1 000] (lipsă = vârful compusului
  la fața plăcii, ADR 0310 §6).

Câmpurile necunoscute ale lui `finisare` și ale bilei se păstrează, ca peste tot. Ușa refuză o finisare care referă un element
care nu e relief și o operație de alt fel care referă un relief (categoria `relief`, ca în v28).

Degroșarea (18.1↑d) va fi un al doilea fel, `degrosare`, cu un câmp al ei: nu intră aici.

### 3. Migrarea v28 → v29

Schimbă doar numărul. Un v28 care are deja o operație `finisare`, un câmp `finisare` sau o freză cu `{ tip: 'bila' }` nu e un
v28 valid: migrarea îl refuză, ca să nu-l facă v29 pe tăcute (schema curentă l-ar primi). Pe hârtie, felul și bila le
refuză chiar contractul v28 (un fel necunoscut, o formă care nu e V), iar câmpul `finisare`, necunoscut la v28, e ciocnirea.

### 4. Probele

Oracolul documentului primește v29: rândurile câmpurilor noi în `CAMPURI_NOI_O`, judecata în `problemeOperatieO`, frontierele
pe hârtie; corpusul de aur primește pasul v29 (o finisare cu bila pe relieful „Medalion”). Probele care țin versiunea curentă
trec pe 29.

### 5–6. (în ADR 0310)

Nucleul finisării (câmpul conservativ, liniile, trecerile pe Z, marginea) e hotărât în ADR 0310 §4–§6, cu implementarea în
„Implementarea (18.1↑c)” de acolo; aici stă doar forma lui în document și în fereastră.

### 7. Ordinea și rândul din fereastra exportului

Cererea sesiunii principale din 25.11 („nu fără rând”, după auditul ferestrei, ADR 0291): o operație pe care programul o taie
se vede în fereastră din prima zi, altfel omul numără N operații, iar mașina face N + 1.

- **Ordinea programului** (`ordinePasi`, `src/model/finisare.ts`): în ordinea automată, finisările vin întâi, cât placa e
  încă întreagă, deci înaintea exteriorului prin foaie al piesei (piesa nu se desprinde cu relieful neterminat). Degroșarea
  (18.1↑d) va veni înaintea finisării. Cu ranguri (ADR 0133), toți pașii se sortează stabil după rang. O tăietură fără rang
  merge la capăt, ca până acum, iar **o finisare fără rang rămâne în față, la locul ei automat**: nu ajunge pe tăcute după
  tăierea de contur. Tăieturile rămân exact în ordinea lui `ordineTaieturi` (lucrarea le indexează), iar finisările se fac
  între ele, la locul lor.
- **Rândul**, doar de citit, la locul lui în listă: în „A mea” se mută ca oricare altul, cu regula bifei pentru exteriorul
  tăiat înaintea unei operații dinăuntru (finisarea e un rând pe linie al piesei ei, iar punctul ei pentru `cuprinse` e
  centrul primului relief). Exportă îi scrie rangul ca celorlalte (în „Automată” îl scoate) și nimic altceva.
- **Fișa** (`src/ui/FisaFinisare.tsx`, o componentă a ei, ca fișa operațiilor să rămână a liniilor frezelor și exportului):
  freza (T, Ø, forma), pasul lateral, creasta pe plan pe hârtie (`creastaPePlan`: bila R − √(R² − (s/2)²), V-ul
  (s − v) / 2 / tan(θ/2), plata 0), liniile, marginea, înălțimea, adâncimea cea mai mare și pasul pe trecere, cu nota că se
  schimbă din secțiunea Tăierea. Fără câmpuri: rândul editabil (freza din bibliotecă, pasul în celule și mm, unghiul, creasta,
  timpul) vine într-o felie a lui, după 16.A↑b-5 și 28.8↑h.
- **Rezultatul** o cuprinde: rândul ei în timpul pe operații (eticheta programului poartă cheia ei), freza ei între scule și în
  judecata „același T” a ferestrei (bila de același diametru e altă freză), adâncimea și simularea.
- **Biblioteca** (cererea liniei frezelor): bila are acum CAM (`FELURI_CU_CAM`), iar `sculaDinFreza` îi dă `{ tip: 'bila' }`;
  `motivFormaPeOperatie` o lasă doar pe finisare.

## Implementarea (18.1↑c)

- **Ușa** (`src/model/schemaDocument.ts`): `scula.forma` e o variantă după `tip` (`v`, `bila`); felul `finisare`; câmpul
  `finisare` (unghiul în [0, 180), `nealiniat` doar `true`, `margine` doar `'trece'`, `planZero` în [0, 1 000]); pe o finisare,
  `finisare` și `pasLateral` cerute (cu calea câmpului în motiv); o finisare referă doar reliefuri, o operație de alt fel
  niciun relief (`problemaOperatii`).
- **Migrarea** v28 → v29 (`src/model/migrari.ts`): doar numărul; un v28 cu o operație `finisare`, cu câmpul `finisare` sau cu
  o bilă pe oricare dintre frezele operației (scula, frezele de rest, fundul plat și frezele lui, frezele dopului, freza
  benzii) e refuzat.
- **Oracolul documentului** (partea v29 de la capătul lui `test/oracles/document.ts`, scrisă înaintea ușii): `CAMPURI_NOI_O[29]
  = ['finisare']`, felul și bila acceptate de la v29, `problemeFinisareO` (categoria `finisare`), referințele în
  `problemeReliefO`; cazurile pe hârtie la capătul lui `test/oracles/document.cazuri.ts` (12 valide, 21 refuzate); proba
  `test/unit/document.v29.oracol.test.ts` (oracolul, ușa aplicației, ușa documentului curent). Corpusul de aur: pasul v29 (o
  finisare cu bila T9 pe medalion).
- **Bila în lucrare** (`src/model/formaFrezei.ts`): `motivFormaPeOperatie` dă `bila` în afara finisării; `frezeleOperatiei`
  numește toate frezele unei operații, cu calea lor, iar lucrarea refuză o bilă pe oricare dintre ele, cu forma și calea în
  motiv (`felFrezei`: „plată”, „în V”, „bilă”, și în motivele vechi care spuneau „plată” sau „în V” oricărei forme). Bila trece
  în IR (simularea o taie cu capătul ei).
- **Fereastra exportului** (§7): rândul doar de citit al finisării, în listă și în fișă, cu ordinea și rangul; o freză bilă
  pe alt fel n-are rând (Exportă o scrie înapoi neschimbată, iar lucrarea o refuză).

## Respinse

- **Bila ca formă cu rază** (`{ tip: 'bila', raza }`): raza ar dubla diametrul și ar cere o regulă de potrivire; toroidala
  (16.A↑e) aduce raza, cu `raza < diametru / 2` strict.
- **Finisarea ca un câmp al reliefului** (pe element, nu operație): operațiile stau pe piesă, cu ordinea, freza și valorile
  lor, ca celelalte; relieful rămâne doar forma.
- **O finisare fără `pas`** (o singură trecere, cât de adânc ar fi relieful): ar călca invarianta pasului pe trecere.
