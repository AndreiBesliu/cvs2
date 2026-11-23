# Frezele (16.A↑, ADR 0300–0309)

_cncvs2, biblioteca de freze („Frezele mele”), felia 16.A↑ adusă din etapa 16: ramura `wip/16.A-freze` (din `main`
`c8b235ab`), ADR-urile 0300–0309, canalul `freze`; ADR 0300 ACCEPTAT pe 23.11 („Da, 1a–6a”);
16.A↑a și ADR 0301 (plafonul total 900 kB) UNITE în `main` (`b1797933`); urmează 16.A↑b_

Pornită pe 23.11.2026, în sesiunea cloud a liniei, la cererea owner-ului: „Vreau sa pot crea freze l sau profiluri de freze in
aplicatie si sa le salvez in cont”. Rândurile din prag: „Bibliotecă de freze cu geometrie reală (dreaptă, bilă, toroidală, V,
gravare, profil, formă desenată)” și „Freze de profil desenate de utilizator; roundover cu offset față de interior”.

## Starea

- **23.11, seara:** ADR 0300 propus (`docs/adr/0300-biblioteca-de-freze.md`), cu rândul în indexul ADR și titlul tradus.
  Schița: <https://claude.ai/artifact/HntiSsxBQyPFmZoA8B39EP> (machetele pe ambele teme, la birou și la 390 / 360 / 320 px;
  editorul frezei se poate încerca; răspunsurile se salvează în pagină, în `raspunsuri/owner`, doar de owner, verificat cu
  un vizitator obișnuit, refuzat). Fără cod de produs.
- **Întrebările** (recomandarea în față, toate „a”): 1 ce e „profilul de freză” (amândouă: forma desenată și valorile de
  lucru), 2 conflictul pe două calculatoare (îmbinarea pe câmpuri), 3 diametrul măsurat (CAM-ul taie cu el), 4 proiectul
  când freza se schimbă (copia cu originea ei, v27), 5 salvarea în cont și planul (cere un plan activ; altfel doar citire),
  6 ordinea feliilor (browserul, alegerea în proiect, apoi contul).
- **23.11, seara: ADR 0300 acceptat**, cu toate recomandările („Da, 1a–6a”). Pornită felia 16.A↑a.
- **23.11, 22:20: 16.A↑a gata pe ramură** (`1e330fd2` fereastra, plus probele și documentele): biblioteca în browser
  (IndexedDB `cncvs2-freze`), fereastra „Frezele mele” din meniul contului și din paletă, frezele de pornire, fișierul JSON /
  CSV, manualul. Unitare 23 noi, e2e 9 noi; suita unitară 9 907 / 9 919; otrăvuri 46 / 46. Pornirea +0,2 kB (legătura),
  totalul +9,0 kB (779,9 / 800).
- **23.11, 23:10: `main` adus de două ori** (`f73f3f37`: 3.Xh, 12.1↑e-3, 12.1↑e-4; `ebfb1f82`: A.8a, A.8b, 25.9↑).
  Completul de pe `d4dce8df` căzuse la rândurile meniului contului din proba tichetelor de pe emulatoare (reparat în
  `218eed21`). Pe ramura cu `ebfb1f82`: pornirea 109,4 kB (cu ușa 113,9, cu Atelierul 114,2 / 115), **totalul 793,6 /
  800 kB: mai rămân 6,4 kB** (felia singură, tot +9,0).
- **23.11, 22:55: plafonul total 900 kB** (ADR 0301, „ok, ridica plafonul total la 900 kB”), pe ramură peste `2c3fd99b`;
  16.A↑a o unește sesiunea principală, în lotul ei (`unire-2311k`), iar ADR 0301 după el. Pornirea rămâne 115 kB: cu
  Atelierul, 114,2 / 115, deci 16.A↑b nu trebuie să pună nimic înaintea primei randări.
- **24.11, noaptea: 16.A↑a și ADR 0301 unite în `main`** (`b1797933`, a noua unire din cloud, de sesiunea principală, în
  lotul `unire-2311k`; PR-ul #12 închis ca unit). Completul liniei, verde pe `218eed21` și pe `2c3fd99b`. Ramura adusă la
  `main`; următoarea felie, 16.A↑b (alegerea în proiect, documentul v27), la cuvântul owner-ului.
- **Feliile**, în ordine: 16.A↑a (biblioteca în browser, fereastra, fișierul), apoi b (alegerea în proiect, v27), c
  (contul), d (calibrarea), e (bila și toroidala), f (profilul desenat), g (valorile pe material).

## Ce am găsit în cod (23.11)

- **Copia frezei** stă pe fiecare operație (`scula: { numar, nume, diametru, forma? }`, `SchemaScula`), și la fundul plat,
  la frezele de rest, la dop și la bandă: o singură schemă le acoperă pe toate. Tabelul `scule[]` din `PLAN.md` §3.2 nu există.
- **Valorile de lucru sunt fixe:** `REGIM_IMPLICIT` (`src/cam/job.ts`: 18 000 rot/min, 1 000 și 300 mm/min, Z sigur 5),
  pentru orice freză; fereastra exportului îl spune într-o notă (`export.regim`). Câmpul `regim` din v27 trebuie să lase
  programele fără el octet cu octet.
- **Formele:** CAM-ul, plata și V-ul (cu vârf); IR-ul și nucleul simulării, și bila (elicea cu bila, încă refuzată); oracolul
  simulării, și profilul ca puncte (r, h). Toroidala nu e nicăieri.
- **Contul:** nicio dată a omului nu stă încă pe server; biblioteca ar fi prima. Callable-urile cer App Check, deci
  sincronizarea se încearcă doar pe adresa principală de test, după unire și publicarea serverului.
- **Mărimea:** rândul din meniul contului stă în bucata editării (`Editare.tsx` importă `meniuCont.ts`), nu în pornire;
  textele, ca date (ADR 0086). Bucata contului e la 29,6 / 32 kB: sincronizarea trebuie să rămână mică (~2 kB).

## Capcane

- **Edge-ul din container pornește în engleză** (`navigator.languages` e `en-US`): fiecare spec își pune româna cu
  `test.use({ locale: 'ro-RO' })`, altfel textele românești nu se găsesc.
- **Un `import` din `src/io/csv.ts` scoate o bucată comună** (`csv-*.js`, 0,65 kB, împărțită cu fereastra «Din CSV…»): numele
  ei intră în harta importurilor din pornire. Măsurat: pornirea +0,2 kB cu toată legătura ferestrei.
- **Rândurile meniului contului se numără și pe emulatoare** (`test/e2e-emulator/tichete.emulator.spec.ts`, cu contul
  deschis): un rând nou intră și acolo, nu doar în `cont.spec.ts`. Completul de pe `d4dce8df` a căzut aici.
- **Otrăvurile e2e care scot un `if` dintr-un `if … else if` lasă codul fără sintaxă** (build eșuat, NEVALIDĂ): se
  schimbă condiția, nu se scoate rândul.

- **Intervalul ADR se verifică pe toate ramurile, nu doar în `main`.** Brief-ul a dat întâi 0290–0299, luate cu o oră înainte
  de linia exportului (`wip/28.8-export`, ADR 0290 propus pe ramura ei); `main` a corectat la 0300–0309. Înaintea unui ADR
  nou: `git fetch origin`, apoi `git ls-tree --name-only origin/<ramura> docs/adr/` pe fiecare `origin/wip/*`.
- **Fereastra exportului se desenează din nou pe altă linie** (ADR 0290, `wip/28.8-export`): felia 16.A↑b pune alegerea din
  bibliotecă în secțiunea „Freza” a fișei, dacă fereastra nouă e unită întâi; altfel pe rândul de azi.
- **`node scripts/traduceri.ts --help` scrie fișierul** (nu cunoaște `--help`): adaugă textele noi cu `en` gol. Verificarea e
  `--verifica`.

Legat: [sesiunea principală](principala.md), [lecțiile comune](lectii.md), [„Toate opțiunile”](lectii.md#feedback-toate-optiunile),
[„UI convențional”](lectii.md#feedback-ui-conventional).
