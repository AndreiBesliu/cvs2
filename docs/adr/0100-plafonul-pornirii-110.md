# ADR 0100: Plafonul pornirii, 100 → 110 kB

**Starea:** acceptat pe 28.10.2026, de owner („Ridică plafonul”, la întrebarea „Next slice: raise the startup cap, or make room
in it first?”), la felia 9.3↑. **Schimbă:** plafonul pornirii din `scripts/build-determinist.ts` (pornirea cu ușa ≤ 100 kB, ADR
0042; păstrat de ADR 0096). Ușa (8 kB), totalul (400 kB), `/admin` (200 kB), testul pas cu pas (12 kB) și mașina simulată (8 kB)
rămân.

**Problema.** După ADR 0099, pornirea cu ușa era 99,9 / 100 kB. Codul nou intră la cerere, dar fiecare bucată nouă la cerere,
comună mai multor module, își pune numele în lista de preîncărcare a lui Vite (`__vite__mapDeps`), care stă în bucata de pornire:
~0,1 kB pe bucată (47 de nume la 5.7↑). Cu 0,1 kB liberi, următoarea felie de felul ăsta trecea de plafon. Fără plafon nou,
rămâneau o felie care face loc (workerul fără Workbox, Preact: riscurile din ADR 0095) sau mutarea a ceva din pornire la cerere,
cu o randare care așteaptă după rețea.

**Ce costă pornirea, măsurat** (Edge, build-ul din `dist/` al feliei 5.7↑; prima randare = apariția titlului, prinsă de un
`MutationObserver`; mediana din 7 rulări; scripturile, doar locale: `.tmp/masoara-pornirea.ts`, `.tmp/masoara-pornirea-sw.ts`):

| | Procesorul ×1 | Procesorul ×4 |
|---|---|---|
| A doua pornire și următoarele (din worker, fără rețea) | 42 ms | 102 ms |
| Prima vizită (750 kbit/s, 150 ms latență) | — | 1 825 ms |

La prima vizită aproape tot e rețeaua: se transferă 99,4 kB (bucata de pornire și dicționarul limbii), iar după ultimul octet,
prima randare vine la 62 ms (procesorul ×4). Din worker, scripturile vin de pe disc, deja compilate (cache-ul de cod al lui V8).

## Decizia

Plafonul pornirii devine **110 kB**, tot cu ușa (pornirea plus ușa unui proiect salvat). Ce costă cei 10 kB în plus, folosiți
toți:

- **la prima vizită:** ~0,11 s pe 750 kbit/s (10 kB × 8 / 750 kbit/s), adică ~6 % din 1,8 s, o singură dată;
- **la fiecare pornire de după:** cel mult proporțional cu codul, deci sub ~10 ms din 102 ms cu procesorul ×4, mai puțin pe un
  procesor obișnuit.

Plafonul nu e o țintă. Codul nou merge în continuare la cerere, iar pornirea crește doar cu numele bucăților noi (~0,1 kB fiecare).
La ritmul ăsta, 10 kB țin cam 100 de bucăți noi.

## Cifrele (măsurate, gzip 9)

| | Înainte (5.7↑) | După (9.3↑) |
|---|---|---|
| Pornirea (cu ușa) | 96,4 (99,9) / 100 kB | 96,5 (100,0) / 110 kB |

Felia 9.3↑ (importul DXF, ADR 0101) a adus totul la cerere: pornirea crește doar cu numele bucății noi, comune dialogului și
ușii. Cu plafonul vechi, pornirea cu ușa (100,0) ar fi trecut de 100.

## Ce am respins

- **Să fac întâi loc** (workerul fără Workbox, ~4 kB; Preact în locul lui React, ~55 kB): riscurile lor sunt la ADR 0095.
  Owner-ul a ales plafonul.
- **Lista de preîncărcare scoasă** (`build.modulePreload: false`): ar scoate cele 47 de nume (~0,7 kB gzip), dar fiecare modul
  la cerere și-ar aduce apoi bucățile comune în cascadă, la prima deschidere.
- **Plafonul scos de tot:** poarta ține pornirea la vedere, iar o creștere mare cere din nou o decizie scrisă.

## Se redeschide dacă

- pornirea cu ușa trece de 110 kB (întâi ce se poate muta la cerere, apoi decizia owner-ului);
- prima vizită se simte lentă pe rețeaua unui atelier (măsurătoarea de aici se repetă acolo);
- o bucată nouă intră în pornire cu cod, nu doar cu numele ei.
