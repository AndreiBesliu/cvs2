# ADR 0145: Plafonul pornirii, 115 → 120 kB

**Starea:** acceptat pe 24.11.2026, de owner („ok, ridica plafonul pornirii la 120 kB”, în sesiunea principală, după
raportul unirii a paisprezecea, care spunea că pornirea cu ușa și cu Atelierul e la 114,7 / 115 kB și că următoarea felie
care adaugă în pornire nu mai încape fără decizia lui). Scris pe ramura `unire-2411f`, peste `356db9bd`. **Schimbă:**
plafonul pornirii din `scripts/build-determinist.ts` (ADR 0252, care îl ridicase la 115 kB). Ușa (8 kB), bucata
aranjamentului ales (8 kB), totalul (900 kB, ADR 0301), `/admin`, contul și cele doar online rămân.

## Problema

Pe `main` `356db9bd` (după lotul al paisprezecelea: 3.Ts, A.11b–A.11e, 16.A↑b-1), pornirea măsurată e 109,9 kB; cu ușa
unui proiect salvat, 114,4; cu Atelierul ales, 114,7 / 115 kB. Rămân 0,3 kB.

De la ADR 0252 (13.11), pornirea a crescut cu 4,2 kB (105,7 → 109,9), câte puțin la aproape fiecare lot: 108,6 după
biblioteca extensiilor refăcută (23.11), 109,2 cu înregistrarea utilizării (sursa gestului și tamponul stau în pornire,
ADR 0262), 109,4 cu „Frezele mele”, 109,6 cu pașii dinaintea unei erori, 109,8 cu modurile pânzei pentru imaginile de pe
foaie, 109,9 cu documentul v27. O parte vine din ce trebuie înaintea primei randări, o parte din lista de preîncărcare:
fiecare bucată nouă la cerere, comună mai multor module, își pune numele în pornire (ADR 0100).

Pe ramuri sau la rând stau felii care ating pornirea: lista „Freza” pe rândurile exportului și în Tăierea (16.A↑b-2),
fereastra exportului (28.8↑, PR-ul `AndreiBesliu/cvs2#11`), aranjamentele următoare (ADR 0250), salvarea în cont. Cu
0,3 kB, fiecare s-ar opri la poartă și ar aștepta o decizie.

## Decizia

Plafonul pornirii devine **120 kB**. Sub el rămân toate trei măsurile porții: pornirea singură, pornirea cu ușa unui
proiect salvat și pornirea cu ușa și bucata aranjamentului ales. Cu 114,7 kB azi rămân ~5,3 kB. O creștere următoare cere
iar o decizie scrisă.

Costul e înaintea primei randări, la prima vizită: cel mult ~5,3 kB în plus, adică ~57 ms pe o rețea de 750 kbit/s. De la
a doua încărcare, pornirea vine din precache (ADR 0045), fără rețea.

**Regula feliilor nu se schimbă:** ce nu trebuie înaintea primei randări stă într-o bucată la cerere, iar o felie își
spune în raport cât adaugă în pornire. Locul nou e pentru ce chiar trebuie acolo, nu o invitație.

## Cifrele (măsurate, gzip 9, `node scripts/build-determinist.ts`)

| | La ADR 0252 (13.11) | Acum (`356db9bd`, 24.11) |
|---|---|---|
| Pornirea | 105,7 kB | 109,9 kB |
| Pornirea cu ușa | 109,7 / 110 kB | 114,4 / 115 kB |
| Pornirea cu ușa și cu Atelierul | — | **114,7 / 120 kB** |
| Totalul JavaScript | 690,1 / 700 kB | 806,1 / 900 kB |

## Ce am respins

- **Întâi loc, la fiecare felie** (o bucată mutată la cerere înainte de a adăuga ceva): ar opri liniile pe rând la
  poartă, cu câte o decizie pentru câteva zecimi de kB. Rămâne pârghia pentru creșterea următoare, alături de Preact în
  locul lui React (~55 kB, decizia owner-ului, ADR 0095).
- **Plafoane separate pentru ușă și pentru aranjament, peste pornire:** trei numere de ținut în minte în loc de unul;
  omul așteaptă suma lor.
- **Plafonul scos de tot:** poarta ține pornirea la vedere; fără ea, lista de preîncărcare crește pe nevăzute.

## Se redeschide dacă

- pornirea cu ușa și cu aranjamentul ales trece de 120 kB (întâi ce se poate muta la cerere, apoi decizia owner-ului);
- prima randare se simte mai lentă pe laptopul de atelier (măsurarea din etapa 4, punctul 8, e a owner-ului).
