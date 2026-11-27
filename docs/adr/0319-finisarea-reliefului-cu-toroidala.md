# ADR 0319: Finisarea reliefului cu freza toroidală

**Starea:** acceptat pe 27.11.2026, la cuvântul owner-ului („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca
asteapta”, transmis liniei reliefului la 06:37), după răspunsul 4a din ADR 0303 („finisarea reliefului cu toroidala, a liniei
reliefului”), confirmat atunci. Felia 18.1↑e, linia reliefului.

**Continuă:** ADR 0312 (finisarea reliefului, documentul v29: freza plată, V-ul, bila), ADR 0303 (freza toroidală în document,
v31: forma `{ tip: 'toroidala', raza }`, 0 < raza < Ø / 2; simularea ei exactă), ADR 0310 §4 (CAM-ul 3D doar pe câmpul
conservativ), ADR 0315–0318 (rândul editabil al reliefului în fereastra exportului, freza din bibliotecă, desenele, „Dă-i T{n}”).

**Nu redeschide:** dalele Float32 de 256 × 256, calculul în workere, fără GPU, câmpul conservativ (ADR 0310, 0311). Degroșarea
rămâne cu freza plată (ADR 0313 §1).

## Contextul

Toroidala are discul plat de rază a = R − ρ și, în jurul lui, sfertul de cerc de rază ρ (raza colțului). Pe un relief, ea
stă între plată și bilă: pe pantele line, discul plat lasă fundul neted la linii mai rare decât bila (pe un plan, fără creastă
cât pasul lateral e cel mult 2a); pe pantele abrupte și în văile înguste, colțul rotunjit lucrează ca o bilă de rază ρ. Până
aici, lucrarea o refuza pe finisare (`motivFormaPeOperatie`), deși simularea o tăia exact din 16.A↑e-1 și 16.A↑e-2.

## Decizia

1. **Oracolul întâi** (`test/oracles/relief3d.ts`, 18.1↑e-0): toroidala intră în oracolul 3D independent, pe hârtie: urcarea
   la o rază (0 pe disc, ρ − √(ρ² − (r − a)²) dincolo); CL-ul exact pe triunghiurile modelului (fețele prin punctul de sprijin
   al tubului, muchiile prin bisecție pe derivată, nodurile prin urcare); CL-ul pe un plan, z0 + g · a + ρ · (√(1 + g²) − 1)
   (bila e a = 0, plata ρ = 0); CL-ul pe o semisferă, între sfera înscrisă și cea întreagă; creasta pe un plan,
   ρ − √(ρ² − ((s − 2a) / 2)²) peste 2a, 0 sub; simulatorul de material, cu silueta ei. Controalele negative (fără fețe, fără
   muchii, doar în noduri) ies din margini.
2. **CAM-ul e cel al finisării**, cu silueta toroidalei în câmpul conservativ (`urcare` în `src/cam/reliefFinisare.ts`):
   aceleași linii, aceleași treceri pe Z cel mult cât pasul, ultima pe model, aceeași podea. Lucrarea (`src/cam/job.ts`) o
   primește doar ca freză a finisării (`cale` = `scula`), cu raza colțului în IR (ca la canelură); pe degroșare și ca freză în
   plus rămâne refuzată, cu motivul.
3. **În Tăierea**, forma „toroidală” a finisării aduce câmpul **Raza colțului** (`fin-raza-colt`), judecat în (0, Ø / 2). Aleasă
   din altă formă, raza e cea de dinainte, dacă e bună pentru diametrul de acum, altfel min(1, Ø / 4) (`frezaFinisare`,
   `src/model/rol.ts`); numele frezei scrise de mână e „freza toroidala r{raza}”.
4. **În fereastra exportului**, rândul finisării poartă toroidala: forma, câmpul `relief-raza-colt` (grupul Freza), cu greșeala
   lui (aceeași frază ca la celelalte rânduri: „Raza colțului: scrie un număr peste 0 și sub jumătatea diametrului (… mm).”),
   desenul frezei cu capătul rotund și cota razei aprinsă, creasta pe plan după formula de mai sus, rândul din listă
   („toroidală r1,5”) și identitatea frezei în regula T (raza colțului face parte din ea). Exportă scrie forma: altă formă sau
   altă rază fac freza scrisă de mână, cu numele după formă; pe aceeași formă, un câmp necunoscut al ei rămâne; fără nicio
   schimbare, aceeași operație, la octet.
5. **Din „Frezele mele”**, toroidala se oferă pe finisare (cu raza ei), nu și pe degroșare (`frezePotrivite`); nota bibliotecii,
   „Ia valorile noi” și „Pune-o înapoi în bibliotecă” o poartă ca pe celelalte forme. Garda care o ținea afară de pe rândul
   reliefului (18.1↑d-5) a plecat.
6. **Documentul rămâne v31** (forma toroidalei e din ADR 0303); nimic pe server. Fără toroidală, programul, octet cu octet:
   plăcile, corpusul CAM și finisarea cu celelalte forme nu se schimbă.

## Probele

- Oracolul: `test/unit/relief3d.toroidala.oracol.test.ts` (urcarea, planul, semisfera cu controalele negative, creasta,
  materialul).
- CAM-ul judecat de oracol: `test/unit/reliefFinisare.toroidala.test.ts` (calota cu ρ 1 și 2,5, planul înclinat la CL-ul de pe
  hârtie, creasta) și `test/unit/reliefFinisare.toroidala.forme.test.ts` (calota cu ρ 0,25, pana cu freza trecând de margine,
  peretele de o celulă, valurile la un unghi nealiniat): fără scobituri, podeaua, pasul pe material, nicio rapidă în lemn.
  Ajutoarele comune ale probelor finisării stau în `test/unit/ajutor-relief-finisare.ts`.
- Lucrarea: `test/unit/finisare.program.test.ts` (calota din dale, finisată cu toroidala Ø4 r1, oracolul pe compusul din
  aceleași dale, toroidala în IR cu raza colțului; și suprafața: pe pantele sub 30°, vârful cel mult 0,06 mm peste CL-ul exact,
  deci o toroidală tăiată ca plată, care nu sapă, dar lasă lemn, cade), `toroidala.lucrare.test.ts` și
  `canelura.rotunda.test.ts` (regula formei: finisarea da, degroșarea nu).
- Modelul: `test/unit/finisare.toroidala.model.test.ts` (felul, creasta, freza scrisă de panou).
- Fereastra: `test/unit/export.relief.test.ts` (rândul, raza în (0, Ø / 2), citirea, ce scrie Exportă),
  `export.relief.biblioteca.test.ts` (aleasă din bibliotecă), `alegereFreza.test.ts` (oferită pe finisare, nu pe degroșare),
  `export.grupuri.test.ts` (câmpul în grupul Freza).
- Cap-coadă, în Edge: `test/e2e/relief.toroidala.spec.ts` (Tăierea, rândul din fereastră, creasta, greșeala, Exportă o scrie și
  o taie, fereastra redeschisă).
- Otrăvurile: `test/otravuri/18.1e.py`, 28 / 28 prinse. La prima rulare au scăpat patru, toate de partea sigură (o siluetă mai
  sus decât freza adevărată lasă lemn, nu sapă) sau atinse de o probă fără puncte: proba planului înclinat nu judeca nimic
  (pe o pantă constantă, linia e un singur segment, fără puncte în fereastră), acum judecă segmentele interpolate și cere
  puncte; proba programului a primit măsura suprafeței; două otrăvuri au fost rescrise (una echivalentă pe Ø4 r1, una de
  neatins).

## Completarea din 27.11: profilul desenat (documentul v32)

După unirea frezelor (16.A↑f-1, f-2; ADR 0304), freza unei operații poate fi și un profil desenat (`{ tip: 'profil', puncte }`),
pe care lucrarea îl refuză pe relief. Rândul reliefului din fereastra exportului l-ar fi citit ca plată, iar Exportă l-ar fi
scris înapoi așa. De aceea rândul reliefului îl au doar operațiile cu freza purtată de rând: `operatieCuRandRelief`
(`src/model/formaFrezei.ts`), cu `formaPeRand` (acum predicat de tip: plata, V-ul, bila, toroidala). Fără rând, Exportă lasă
operația neatinsă, iar lucrarea o refuză cu motivul ei, ca la rândurile operațiilor pe contur (`operatieCuRand`). Proba,
scrisă întâi: `test/unit/export.relief.test.ts` (regula și Exportă cu valorile unui rând); otrăvurile E29 și E30, prinse.

## Nedovedit fără mașină

Creasta reală (raza adevărată a colțului, bătaia frezei), suprafața tăiată față de model și timpul: le măsoară o placă a
reliefului cu toroidala, tăiată de owner (fișa plăcii 18 rămâne cu bila; o variantă cu toroidala, la cuvântul lui).
