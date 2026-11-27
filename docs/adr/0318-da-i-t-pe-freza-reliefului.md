# ADR 0318: „Dă-i T{n}” pe freza reliefului

**Starea:** acceptat pe 27.11.2026, la cuvântul owner-ului („zi-le sesiunilor sa continue cu recomandarile, acolo unde inca
asteapta”, transmis liniei reliefului la 06:37), pentru a treia dintre feliile lăsate la el în ADR 0315. Felia 18.1↑d-7, linia
reliefului.

**Continuă:** ADR 0291 §2a (felia 28.8↑j: „Dă-i T{n}” lângă „T{n} are două freze”, numărul nou după regula rolurilor, roșii doar
câmpurile frezelor cu numărul ciocnit), ADR 0315 (rândul editabil al reliefului, unde conflictul se spunea fără buton).

## Decizia

1. **Freza unei operații a reliefului are locul ei între frezele ferestrei** (`FrezaT.loc`: cheia rândului și locul `scula`),
   deci „Dă-i T{n}” îi caută numărul nou ca la celelalte freze (`numarDupaConflict`: al unei freze identice, cât pe numărul ei
   stau doar freze identice; altfel cel mai mic liber), printre toate frezele ferestrei.
2. **Butonul stă lângă greșeală, în grupul Freza al fișei reliefului**, pe fiecare rând al reliefului cu freza pe numărul ciocnit;
   apăsat, scrie numărul pe rând (originea din bibliotecă rămâne: alt T n-o scoate, ADR 0316 §5). Conflictul se socotește din nou.
3. **Câmpurile frezei reliefului (T-ul și diametrul) se înroșesc** cât freza e pe numărul ciocnit, ca la celelalte rânduri.
4. Programul, documentul (v31) și serverul nu se schimbă; Exportă scrie numărul nou ca pe orice T schimbat de mână.

## Probele

- `test/e2e/relief.export.spec.ts` („Dă-i T{n}” pe freza reliefului): finisarea pusă pe T-ul degroșării, conflictul în grupul
  frezei al ambelor fișe, câmpurile înroșite, Exportă oprit; butonul dă cel mai mic număr liber, conflictul pleacă, Exportă scrie
  numărul nou, iar fereastra redeschisă îl arată.
- Otrăvurile: `test/otravuri/18.1d-7.py`.
