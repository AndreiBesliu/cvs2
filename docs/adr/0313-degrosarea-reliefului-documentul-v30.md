# ADR 0313: Degroșarea reliefului în document (v30): operația `degrosare`, adaosul și rolul „Relief 3D”

**Starea:** propus pe 26.11.2026, în cadrul ADR 0310 (felia 18.1↑d-1, linia reliefului). Strategia și adaosul sunt cele din ADR
0310 §4 („trepte Z cu pasul pe trecere, freza plată, adaosul pentru finisare”), iar rolul e cel din §6 („Relief 3D”). Numărul
v30 l-a rezervat sesiunea principală pe 26.11. Alegerile din §8 au recomandarea aplicată și se confirmă de owner.

**Continuă:** ADR 0310 (§4, §6, §10), ADR 0312 (finisarea, v29), ADR 0024 (un câmp nou cu sens intră doar cu schemă nouă și
migrare), ADR 0133 (ordinea de mână).

## Decizia

### 1. Freza

Degroșarea se face doar cu o **freză plată**: adaosul se socotește cu freza plată mărită cu el (§3). Judecata stă într-un singur
loc, `motivFormaPeOperatie` (`src/model/formaFrezei.ts`, motivul `degrosare`). O bilă sau un V pe o degroșare sunt refuzate de
lucrare, cu forma în motiv. Documentul nu primește nicio formă nouă de freză.

### 2. Operația `degrosare` (documentul v30)

Un fel nou de operație, `tip: 'degrosare'`, doar pe elemente `relief`. Ușa refuză o degroșare pe un contur și o operație 2D pe un
relief, ca la finisare. Câmpurile comune au sensul de la finisare (ADR 0312 §2):
- `noduri` sunt reliefurile;
- `pasLateral` e cerut, în (0, 50] mm;
- `pas` e cât coboară cel mult o trecere;
- `adancime` e podeaua, ca un plan al modelului;
- `latura`, `sens` și ceilalți sunt fără efect; lucrarea refuză urechi, rampă, intrări, degajări și câmpurile altor feluri.

Câmpul nou `degrosare` e cerut pe o degroșare. Ușa îi judecă forma oriunde apare, iar lucrarea îl refuză pe alt fel:
- `adaos`: cât lemn rămâne deasupra modelului pentru finisare, în mm, în [0, 10];
- `unghi`: unghiul liniilor față de axa X a reliefului, în [0, 180); la 0° și 90° liniile trec prin centrele celulelor;
- `margine?: 'trece'` și `planZero?: number`, ca la finisare (lipsă = peretele rămâne, vârful compusului la față).

Câmpurile necunoscute se păstrează. Câmpul `finisare` pe o degroșare e refuzat de lucrare, la fel `degrosare` pe o finisare.

### 3. Adaosul și strategia (CAM-ul)

- **Adaosul** se măsoară așa: vârful frezei plate de rază R stă cel puțin la CL-ul frezei plate de rază R + a, plus a, cu podeaua
  ca plan al modelului. Cilindrul de rază R + a, coborât cu a, cuprinde cilindrul de rază R dilatat cu o sferă de rază a. Deci
  rămâne cel puțin a de lemn între freză și model în orice direcție:
  - orizontal pe un perete;
  - vertical pe un plan;
  - pe normală pe o pantă g: a · (1 + g) / √(1 + g²).
- **Strategia:** trepte Z cu pasul, pe liniile paralele ale finisării. CAM-ul e drumul finisării (`treceriRelief`, în
  `src/cam/reliefFinisare.ts`), cu cota fiecărui segment din câmpul conservativ dilatat cu discul de rază R + a, ridicată cu a.
  - Treapta k lucrează unde cota e sub fundul treptei de dinainte, la max(cota, −k · pas).
  - Pe trecerea ei, o bandă de pantă e urmată pe suprafața adaosului, nu lăsată ca treaptă de pas.
  - Ultima treaptă stă pe suprafața adaosului.
  - Zonele treptelor sunt una în alta, deci sub fiecare linie lemnul a fost scos până la fundul treptei de dinainte (niciodată
    mai adânc decât pasul).
  - Legăturile și coborârea sunt cele ale finisării. Între linii vecine, legătura e la adâncime, pe drumul care nu coboară sub
    cotă. Altfel, freza urcă la Z sigur, merge cu rapidă și coboară cu avansul de plonjare, într-un loc deja scos.
- **Lemnul rămas** (pe hârtie, în probe):
  - pe un fund plat, a;
  - pe un plan de pantă g, cu liniile de-a lungul pantei, între a · (1 + g) și a · (1 + g) + g · (R − √(R² − (s / 2)²));
  - cu liniile peste pantă, cel mult a · (1 + g) + g · s;
  - peste toate, surplusul câmpului: cel mult 2 · h · g.
  - Unde freza plată nu încape (o vale mai îngustă decât ea), lemnul rămâne, iar finisarea îl scoate în trecerile ei.

### 4. Ordinea

- **Automat** (`ordinePasi`, `src/model/finisare.ts`):
  - degroșările întâi, apoi finisările, apoi tăieturile;
  - aceeași freză vine pe toate degroșările, apoi alta pe toate finisările, deci puține schimbări;
  - placa e încă întreagă cât se lucrează relieful.
- **Cu ranguri** (ADR 0133): toți pașii se sortează stabil după rang. O operație a reliefului fără rang rămâne în față, una pe
  contur fără rang la capăt.
- **Finisarea pusă de mână înaintea degroșării aceluiași relief** e un **avertisment** al programului
  (`finisariInainteaDegrosarii`), nu un refuz și nici o bifă.
  - Programul rămâne bun, și e probat așa: degroșarea de după nu coboară sub model plus adaos și nu intră mai adânc decât pasul
    ei, pe lemnul lăsat de finisare.
  - Doar că finisarea scoate cu freza ei tot lemnul, iar degroșarea taie aproape doar aer.

### 5. Potrivirea cu finisarea aceluiași relief

Lucrarea refuză (`nepotrivireDegrosare`):
- un **plan zero** diferit de al finisării aceluiași relief: adaosul ar sta deasupra altui model, deci degroșarea ar putea tăia
  sub cel finisat;
- o degroșare care **trece de margine**, când finisarea păstrează **peretele**: degroșarea l-ar scoate.

Invers (degroșarea păstrează peretele, finisarea trece) e bine. Rolul „Relief 3D” le scrie mereu potrivite.

### 6. Rolul „Relief 3D” (secțiunea Tăierea)

- **Oferit** pe o piesă doar cu reliefuri, după „finisarea reliefului”. Pune două operații: întâi degroșarea, apoi finisarea (ca
  la rolul ei).
- **Implicitele degroșării:**
  - freza plată cu diametrul finisării, cu un număr T diferit de al bilei;
  - pasul lateral 40 % din freză;
  - adaosul 0,5 mm (`ADAOS_IMPLICIT`), liniile la 0°;
  - adâncimea și pasul finisării.
- **Valorile existente rămân:** din nou rolul, valorile ambelor operații rămân. Înapoi la „finisarea reliefului”, finisarea își
  păstrează valorile și id-ul.
- **Rol personalizat:** nu se salvează din „Relief 3D”, fiindcă cele două operații au freze și valori diferite.
- **Câmpurile degroșării în panou:** diametrul frezei plate, pasul lateral, adaosul și unghiul liniilor.
- **Câmpuri comune:** marginea și locul pe Z se scriu pe ambele operații.

### 7. Fereastra exportului

Degroșarea are rândul ei, doar de citit, la locul ei în ordinea tăierii, prin fișa finisării (`src/ui/FisaFinisare.tsx`, cu
`fel: 'degrosare'`):
- fișa arată freza, pasul lateral, adaosul (în locul crestei), liniile, marginea, înălțimea și adâncimea, cu nota că se schimbă
  din Tăierea;
- în „A mea” se mută ca oricare alt rând, iar Exportă îi scrie doar rangul;
- lista nu s-a schimbat: rândurile reliefului sunt aceleași rânduri ale ferestrei.

Rândul editabil (al finisării și al degroșării) e o felie a lui, la cuvântul owner-ului.

### 8. Alegerile owner-ului (recomandarea aplicată)

1. **Strategia degroșării:**
   - *a (aplicată):* trepte Z pe liniile paralele ale finisării, cu banda de pantă urmată pe adaos (§3);
   - *b:* trepte Z curate, fără urmarea pantei: mai puține mișcări pe Z, dar până la un pas de lemn în plus pe pante, pentru
     finisare;
   - *c:* inele paralele cu conturul pe fiecare treaptă, ca la buzunar.
2. **Adaosul implicit:**
   - *a (aplicată):* 0,5 mm;
   - *b:* 0,3 mm;
   - *c:* 1 mm.
3. **Freza degroșării:**
   - *a (aplicată):* doar plată (ADR 0310 §4);
   - *b:* și bila (adaosul se socotește la fel, cu bila de rază R + a; probele s-ar întinde la ea).
4. **Finisarea înaintea degroșării, în „A mea”:**
   - *a (aplicată):* avertisment;
   - *b:* bifa, ca la exteriorul tăiat înaintea interiorului;
   - *c:* refuz.
5. **Finisarea după degroșare:**
   - *a (aplicată):* începe tot de la fața plăcii, în trecerile ei (sigur, cu treceri în aer acolo unde degroșarea a scos
     lemnul);
   - *b:* o felie următoare care socotește ce lasă degroșarea și sare trecerile din aer.

## Implementarea (18.1↑d-1)

- **Oracolul, scris întâi** (`test/oracles/relief3d.ts`, fără importuri din `src/`):
  - `clAdaos`, `adaosPePlan`, `judecaDegrosarea`;
  - simulatorul de material pe operații la rând (`materialSecventaO`, `ramasO`);
  - pentru freza plată, simulatorul e exact: intervalul segmentului la cel mult R de coloană, coloana la 1 µm înăuntrul
    marginii. Cu eșantioane, o coloană de pe marginea discului scăpa la o trecere și era prinsă la alta, cu toată adâncimea.
  - Probele pe hârtie: `relief3d.degrosare.oracol.test.ts`.
- **CAM-ul:** `degrosareRelief` (`src/cam/reliefFinisare.ts`), cu finisarea neschimbată, octet cu octet. Probele pe platou, pană,
  calotă, valuri, două reliefuri, podea și degroșare plus finisare (`reliefDegrosare.test.ts`).
- **Documentul:**
  - ușa (`schemaDocument.ts`) și migrarea v29 → v30 (`migrari.ts`), care schimbă doar numărul și refuză un v29 cu felul sau cu
    câmpul;
  - oracolul documentului (partea v30, `CAMPURI_NOI_O[30] = ['degrosare']`) și cazurile pe hârtie (11 valide, 20 refuzate,
    `document.v30.oracol.test.ts`);
  - corpusul de aur, cu degroșarea medalionului, T1 plată Ø6;
  - probele care țin versiunea curentă, mutate pe v30.
- **Lucrarea** (`src/cam/job.ts`): `programRelief`, ordinea, refuzurile, potrivirea, avertismentul. Degroșarea nu e o tăietură
  pe contur (`taieturiFoaie`) și nu e „cât foaia” (`catFoaia`). Probele: `degrosare.program.test.ts` (și originea în centru) și
  `export.hartie.test.ts`.
- **Interfața:**
  - rolul (`src/model/rol.ts`), `cuDegrosare`, câmpurile (`src/app/CampuriFinisare.tsx`);
  - rândul din fereastră și manualul;
  - e2e: `degrosare.spec.ts` și privirea (`export.privire.spec.ts`).

## Respinse

- **Adaosul pe verticală** (CL-ul frezei de rază R, plus a): pe pante și pe pereți ar lăsa mai puțin de a, iar pe un perete
  vertical nimic.
- **Degroșarea ca un câmp al finisării**: au freze, pași și ranguri diferite, deci ca la finisare, operația stă pe piesă.
- **Planul zero al degroșării luat din finisare** (fără câmp al ei): o degroșare fără finisare n-ar avea de unde să-l ia.
  Potrivirea se cere în lucrare, iar rolul le scrie egale.
