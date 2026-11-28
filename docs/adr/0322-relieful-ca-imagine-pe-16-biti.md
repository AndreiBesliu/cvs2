# ADR 0322: Relieful ca imagine gri pe 16 biți, dus și întors

**Starea:** acceptat pe 28.11.2026, la cuvântul owner-ului („Porneste sesiunile, pune-le sa continue cu ce aveau la rand”,
transmis liniei reliefului de sesiunea principală, cu „mergi înainte cu recomandarea” la întrebările owner-ului). Felia
**18.1↑g**, linia reliefului. Alegerile owner-ului (§5) au recomandarea aplicată, cum sunt implementate.

**Continuă:** ADR 0310 §8 (rândul 18.1↑g: relief ↔ imagine gri pe 16 biți, PNG și TIFF, cu Z-ul scris în fișier, dus-întors
exact), §12 (fișierul pe 16 biți: PNG sau TIFF); ADR 0311 (grila, golurile, cuantizarea pe dale).

**Nu redeschide:** dalele și cuantizarea lor pe 16 biți cu scară pe dală (ADR 0311), calculul în workere. Documentul nu se
schimbă: rămâne **v32**.

## Contextul

Un relief făcut aici trebuie să poată pleca pe alt calculator (dalele stau în browser) și în alte programe, iar o hartă de
înălțimi făcută în altă parte (un scaner 3D, un program de sculptat) trebuie să poată intra fără să piardă din precizie. O
imagine pe 8 biți are doar 256 de trepte (la 5 mm, 0,02 mm pe treaptă); una pe 16 biți are 65 536 (la 5 mm, 0,08 µm). Browserul
decodează orice PNG pe 8 biți, deci un PNG pe 16 biți cere un cititor propriu.

## Decizia

1. **Exportul:** din secțiunea Relieful a panoului, **Exportă ca imagine pe 16 biți…** scrie compusul straturilor vizibile ca
   PNG gri pe 16 biți (`src/relief/png16.ts`): valoarea fiecărei celule e round((z − z_min) / (z_max − z_min) · 65 535), rândul
   de sus al imaginii e rândul de sus al reliefului, golul compusului (planul zero, ADR 0311 §7) e o valoare ca oricare.
   În fișier: un bloc `tEXt` cu cheia `cncvs2-relief` și JSON-ul `{ v: 1, zMin, zMax, celula }` (mm) și blocul `pHYs` cu
   pixelii pe metru (1000 / celula), ca un alt program să aibă scara.
2. **Importul:** un PNG pe 16 biți se citește în workerul reliefului cu cititorul propriu (tipurile de culoare 0, 2, 4, 6, pe
   8 și 16 biți; filtrele 0–4; fără întrețesere, care e refuzată cu motiv). Griul e valoarea împărțită la 65 535 (sau 255),
   luminanța la culoare. Cu blocul `cncvs2-relief`, fereastra „Relief din imagine” oferă **Z-ul din fișier** (implicit): Z =
   z_min + g · (z_max − z_min) și celula din fișier, deci relieful revine cum a plecat; fără bloc, sau cu alegerea de mână,
   înălțimea și baza din fereastră, ca la orice imagine.
3. **Dus-întors:** exportul unui relief importat din propriul fișier dă aceiași octeți (un punct fix), iar înălțimile importate
   diferă de cele exportate cu cel mult (z_max − z_min) / 131 070 (jumătate de treaptă), plus cuantizarea dalelor (ADR 0311).
4. **Funcțiile sunt pure** (scrierea și citirea PNG-ului, cu `CompressionStream` / `DecompressionStream`, deci aceleași în Node
   și în browser) și se probează pe hârtie: un fișier scris de cititorul probelor, independent (`node:zlib`), și invers.

## Mișcă mașina?

Indirect: un relief importat se taie. CAM-ul nu se schimbă; probele fixează că valorile citite sunt cele scrise, pe hârtie.

## Alegerile owner-ului (cu recomandarea aplicată)

1. **TIFF-ul pe 16 biți:** după PNG, într-o felie a lui (18.1↑g-2), peste cititorul TIFF al trasării (recomandat: PNG-ul e
   citit de orice program, iar o felie rămâne mică). Alternativa: amândouă acum.
2. **Ce se exportă:** compusul straturilor vizibile (recomandat: ce se taie). Alternativa: fiecare strat, câte un fișier.
3. **Z-ul din fișier, la import:** implicit, când fișierul îl are (recomandat). Alternativa: implicit înălțimea și baza din
   fereastră, ca la orice imagine.
4. **Simularea salvată ca strat** (din rândul 18.1↑g al ADR 0310): într-o felie a ei, după PNG (recomandat). Alternativa: acum.

## Implementarea 18.1↑g-2 (28.11): TIFF-ul ca relief

La alegerea 1 (recomandarea aplicată), peste cititorul TIFF al trasării (ADR 0229):

1. **Citirea exactă:** `decodeazaTiffExact` (`src/trasare/tiff.ts`) dă RGBA-ul întreg (după orientare), cu fiecare eșantion
   la v · 255 / (2^biți − 1), fără rotunjire și fără reducere; alb-e-zero, paleta (pe 16 biți), CMYK și alfa asociat sunt
   socotite tot fără rotunjire. `marimeTiff` dă mărimea din antet, după orientare, fără decodare. Decodarea pe 8 biți a
   trasării rămâne aceeași (probele ei, neschimbate); întoarcerea după orientare e acum comună celor două.
2. **În workerul reliefului:** un fișier cu semnătura TIFF merge la cititorul exact (browserul nu decodează TIFF, deci până
   acum „Relief din imagine” îl refuza cu „browserul nu decodează formatul”). Prima pagină (miniaturile nu sunt pagini); peste
   8192 pe o latură, „prea mare”, spus din antet; ce nu știe cititorul (JPEG în TIFF, virgula mobilă …) e refuzul `tiff`, cu
   numele lui, iar un fișier stricat, `tiff-stricat`. Un TIFF pe 16 biți e `fisier.adancime: 16` (nota ferestrei); celula
   vine din DPI-ul fișierului, ca la orice imagine.
3. **Z-ul din fișier rămâne al PNG-ului:** exportul scrie PNG, deci un TIFF nu are blocul aplicației; înălțimea și baza vin
   din fereastră.

**Mărimea:** cititorul intră în workerul reliefului (workerele se construiesc IIFE, fără bucăți la cerere): totalul +6,0 kB
(959,4 / 1 000), pornirea +0.

**Alegerile owner-ului (cu recomandarea aplicată):**

5. **Exportul:** rămâne PNG (recomandat: orice program citește un PNG pe 16 biți). Alternativa: și TIFF (scriitorul din
   `src/io/tiffScrie.ts` ar trebui adus lângă relief).
6. **Pagina unui TIFF cu mai multe:** prima (recomandat: o hartă de înălțimi are una). Alternativa: alegerea paginii în
   fereastra reliefului, ca la vectori.
7. **Unde se decodează:** în workerul reliefului, +6,0 kB (recomandat: aceeași cale ca PNG-ul, fără pixelii trecuți între
   workere). Alternativa: workerul trasării decodează și dă pixelii reliefului (~+1 kB, dar pixelii, Float64 RGBA, de două ori
   în memorie pe drum).

## Implementarea 18.1↑g-3 (28.11): simularea salvată ca strat

La alegerea 4 (recomandarea aplicată):

1. **Din panou:** în secțiunea Relieful, **Strat din simulare** simulează programul foii active (ca vederea 3D, „Tăiat”:
   `programSimulare`, apoi `simuleazaRelief`) pe fereastra reliefului: cutia lui pe foaie, tăiată la foaie, la celula lui pe foaie
   (cel puțin 0,05 mm), cu colțul ferestrei în colțul cutiei, deci la un relief drept centrele pixelilor cad pe centrele celulelor.
2. **Pe grila reliefului:** în workerul reliefului (cererea `din-simulare`), fiecare celulă ia pixelul simulării în care cade
   centrul ei, dus pe foaie prin matricea reliefului (`valoriDinSimulare`, `src/relief/dinSimulare.ts`, pur); în afara ferestrei,
   gol. Z-ul e al reliefului: z = z_simulat − dz, cu dz ca la lucrare (−planZero al finisării sau al degroșării care taie relieful;
   fără, −vârful compusului straturilor vizibile; `dzRelief`). Simularea pe blocuri (un relief prea mare) dă cel mai jos punct pe
   bloc, deci stratul nu iese niciodată peste tăietură.
3. **Stratul:** nou, deasupra, **ascuns**, **„înlocuiește”**, numit „Tăietura simulată” (în limba de atunci): ce se taie nu se
   schimbă; arătat, relieful arată ce rămâne după tăiere. Fără operații pe foaie, lucrarea refuză (nimic de tăiat), iar refuzul
   se spune. Un relief schimbat cât se simula nu e suprascris („apasă din nou”).

**Mărimea:** pornirea +0, totalul +1,9 kB (961,3 / 1 000).

**Alegerile owner-ului (cu recomandarea aplicată):**

8. **Unde merge tăietura:** un strat nou, ascuns, al reliefului ales (recomandat: lângă model, comparată cu ochiul). Alternativa:
   o piesă-relief nouă, lângă cea tăiată.
9. **Modul stratului:** „înlocuiește” (recomandat: arătat, e chiar tăietura). Alternativa: „adună”, cu diferența tăietură − model
   (arată doar ce a rămas).
10. **De unde se pornește:** din panou, pe relieful ales (recomandat: panoul știe care relief). Alternativa: din vederea 3D,
    „Tăiat”, cu alegerea reliefului acolo.
11. **Rezoluția:** celula reliefului, pe centrele celulelor (recomandat). Alternativa: fereastra fină de 0,1 mm a vederii 3D,
    redusă apoi pe grila reliefului.
