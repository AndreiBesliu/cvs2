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
- `pasLateral` (cerut pe finisare): distanța dintre liniile paralele, în mm; aliniată, lucrarea o rotunjește la celule întregi
  (ADR 0310 §5) și spune valoarea rotunjită;
- `pas`: cât coboară cel mult o trecere (invarianta: niciodată mai adânc decât pasul pe trecere); finisarea se face în treceri
  pe Z, ultima pe model;
- `adancime`: cel mai adânc loc sub fața plăcii la care ajunge freza (o podea: sub ea finisarea nu coboară);
- `latura`, `sens`, `urechi`, `rampa`, `intrari`, `colturi`: cerute de schemă, fără efect pe finisare (`pe-linie`, `urcare`,
  `null`); lucrarea refuză urechi, rampă, intrări sau degajări pe o finisare.

Câmpul nou `finisare`, cerut pe o finisare și refuzat de lucrare pe alt fel:

- `unghi`: unghiul liniilor față de axa X a reliefului, în grade, în [0, 180);
- `nealiniat?: true`: liniile nu urmează centrele celulelor (lipsă = aliniate; la un unghi care nu e 0 sau 90, lucrarea spune că
  pot apărea riduri, ADR 0310 §5);
- `margine?: 'trece'`: freza trece de marginea reliefului (lipsă = „peretele rămâne”: dincolo de dreptunghi, modelul e fața
  plăcii, ADR 0310 §4);
- `planZero?: number`: adâncimea planului zero al reliefului sub fața plăcii, în mm (lipsă = vârful compusului la fața plăcii,
  ADR 0310 §6).

Degroșarea (18.1↑d) va fi un al doilea fel, `degrosare`, cu un câmp al ei: nu intră aici.

### 3. Migrarea v28 → v29

Schimbă doar numărul. Un v28 care are deja o operație `finisare`, un câmp `finisare` sau o freză cu `{ tip: 'bila' }` nu e un
v28 valid: migrarea îl refuză (ciocnirea), ca să nu-l facă v29 pe tăcute.

### 4. Probele

Oracolul documentului primește v29: rândurile câmpurilor noi în `CAMPURI_NOI_O`, judecata în `problemeOperatieO`, frontierele
pe hârtie; corpusul de aur primește pasul v29 (o finisare cu bila pe relieful „Medalion”). Probele care țin versiunea curentă
trec pe 29.

## Respinse

- **Bila ca formă cu rază** (`{ tip: 'bila', raza }`): raza ar dubla diametrul și ar cere o regulă de potrivire; toroidala
  (16.A↑e) aduce raza, cu `raza < diametru / 2` strict.
- **Finisarea ca un câmp al reliefului** (pe element, nu operație): operațiile stau pe piesă, cu ordinea, freza și valorile
  lor, ca celelalte; relieful rămâne doar forma.
- **O finisare fără `pas`** (o singură trecere, cât de adânc ar fi relieful): ar călca invarianta pasului pe trecere.
