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
| mișcările finisării | 389 198 | 1 577 185 | 6 351 155 |
| RSS-ul cel mai mare | 341 MB | 697 MB | 2 235 MB |

**Unde se duce timpul finisării** (profilul pe 1000², `--cpu-prof`): 70 % în distanța de la segment la blocurile piramidei
(`distSegmentCutie`), 21 % în cota segmentului (`cotaSegment`), sub 2 % în pregătirea câmpului (`campPeCelula`, `piramida`).
Liniile sunt independente una de alta: cota unei linii nu depinde de alta.

**Memoria:** la o celulă de 0,1 mm, câmpul de calcul are celula 0,05 (`diviziune`, ADR 0310 §4), deci 8000² de celule, cu
piramida maximelor peste ele; asta, plus mișcările (6,35 M), duce procesul la 2,2 GB cu un singur strat.

**Ce merge fluid:** tot ce ține de relief până la CAM (stratul, citirea, compunerea, desenul, PNG-ul) stă sub 2,3 s la 4000²,
într-un fir.

## Ce depășește pragurile

1. **Finisarea:** pragul din ADR 0310 e 10 s, la pasul lateral 0,3. Aici, la 0,5 (mai rar), ia 118 s într-un fir; la 0,3,
   măsurătoarea e în §„Completarea” de mai jos. Chiar împărțită pe 8 nuclee, rămâne peste 10 s.
2. **Memoria:** pragul e ~1 GB pentru 4 straturi; aici, un strat cu calculul CAM ia 2,2 GB.

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

## Bătăile (alinierea)

Proba „o imagine cu linii fine, finisată aliniat (fără bătăi) și nealiniat (bătăile măsurate)” (ADR 0310 §5) e o felie a ei,
18.1↑h-2, după răspunsuri: se face pe oracolul 3D (creasta măsurată pe linii fine aliniate cu celula și pe cele nealiniate) și nu
depinde de mărime.
