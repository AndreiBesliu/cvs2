# ADR 0122: Plafonul total al aplicației, 450 → 500 kB

**Starea:** acceptat pe 02.11.2026, de owner („Da, 500 kB”, la „Ridic plafonul total al pachetului la 500 kB?”), la felia
3.R. **Schimbă:** plafonul total din `scripts/build-determinist.ts` (ADR 0109, care îl ridicase la 450 kB). Celelalte
plafoane rămân, între ele pornirea (110 kB, ADR 0100), ușa (8 kB), `/admin` (200 kB) și contul (32 kB).

**Problema.** După felia 15.B↑a, totalul era 441,2 / 450 kB, deci rămâneau 8,8 kB. Din 30.10 (ADR 0109: 411,8 kB), totalul
a crescut cu 29,4 kB în trei zile de felii. Urmează trei linii de lucru, două dintre ele propuse pentru worktree-uri
paralele:

- contractele NcStudio, RichAuto, Syntec, Mach3 / Mach4 și pachetul de atelier (etapa 4, punctul 6), pe linia principală;
- restul textului (etapa 7): fonturile cu o singură linie, aldinul și cursivul sintetic, textul vertical, încadrarea în
  casetă;
- verificarea și repararea vectorilor (etapa 10): contururile deschise, duplicatele, intersecțiile, buclele, nodurile prea
  apropiate.

Fiecare ramură ar trece singură de poartă, dar, la ~3 kB pe felie cu cod (ritmul din ADR 0096), cele trei unite nu încap în
8,8 kB. Răspunsurile din ADR 0096 rămân adevărate: precache-ul se descarcă în fundal, cu progresul în bara de jos (ADR
0097); codul descărcat nu rulează până nu e folosit; ce se simte e pornirea, cu plafonul ei, pe care decizia de aici nu-l
atinge. Din ADR 0098, o actualizare aduce doar bucățile schimbate (plus `index.html` și `sw.js`).

## Decizia

Plafonul total devine **500 kB**. La ~3 kB pe felie, asta lasă loc pentru ~20 de felii. Costul e la prima instalare: cel
mult ~59 kB în plus față de azi, adică ~0,6 s pe o rețea de 750 kbit/s, o singură dată. La o actualizare, doar bucățile
schimbate.

Plafonul numără doar JavaScript-ul (ADR 0086). Datele din precache (mesajele, manualul, codurile controlerelor, fonturile
incluse) stau în afara lui.

## Cifrele (măsurate, gzip 9)

| | Înainte (15.B↑a) | După (3.R) |
|---|---|---|
| Totalul JavaScript | 441,2 / 450 kB | **441,2 / 500 kB** |
| Pornirea (cu ușa) | 98,5 (102,0) / 110 | 98,5 (102,0) / 110 |

Felia schimbă doar poarta, deci build-ul aplicației iese neschimbat.

## Ce am respins

- **Plafonul scos de tot:** poarta ține pachetul la vedere, iar o creștere mare cere din nou o decizie scrisă (ADR 0096).
- **Loc făcut în pachet înaintea fiecărei felii, ca la 3.K și 3.L:** textele sunt deja date (ADR 0086, 0095). Pârghiile mari
  rămase, workerul fără Workbox (~4 kB) și Preact în locul lui React (~55 kB), au riscul lor (ADR 0095) și rămân decizii ale
  owner-ului.
- **Cei 8,8 kB împărțiți între cele trei linii:** ~3 kB de linie, cât o singură felie cu cod, iar fiecare linie are mai
  multe felii.

## Se redeschide dacă

- totalul trece de 500 kB (întâi ce se poate scoate fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată);
- pornirea ajunge la plafonul ei. Asta e altă decizie: plafonul de aici nu ajută pornirea (ADR 0100).
