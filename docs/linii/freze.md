# Frezele (16.A↑, ADR 0300–0309)

_cncvs2, biblioteca de freze („Frezele mele”), felia 16.A↑ adusă din etapa 16: ramura `wip/16.A-freze` (din `main`
`c8b235ab`), ADR-urile 0300–0309, canalul `freze`; ADR 0300 PROPUS pe 23.11, cu schița și șase întrebări; codul pornește
doar după răspunsurile owner-ului_

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
- **Urmează**, la răspunsuri: 16.A↑a (biblioteca în browser, fereastra, fișierul), apoi b (alegerea în proiect, v27), c
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

- **Intervalul ADR se verifică pe toate ramurile, nu doar în `main`.** Brief-ul a dat întâi 0290–0299, luate cu o oră înainte
  de linia exportului (`wip/28.8-export`, ADR 0290 propus pe ramura ei); `main` a corectat la 0300–0309. Înaintea unui ADR
  nou: `git fetch origin`, apoi `git ls-tree --name-only origin/<ramura> docs/adr/` pe fiecare `origin/wip/*`.
- **Fereastra exportului se desenează din nou pe altă linie** (ADR 0290, `wip/28.8-export`): felia 16.A↑b pune alegerea din
  bibliotecă în secțiunea „Freza” a fișei, dacă fereastra nouă e unită întâi; altfel pe rândul de azi.
- **`node scripts/traduceri.ts --help` scrie fișierul** (nu cunoaște `--help`): adaugă textele noi cu `en` gol. Verificarea e
  `--verifica`.

Legat: [sesiunea principală](principala.md), [lecțiile comune](lectii.md), [„Toate opțiunile”](lectii.md#feedback-toate-optiunile),
[„UI convențional”](lectii.md#feedback-ui-conventional).
