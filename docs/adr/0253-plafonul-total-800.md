# ADR 0253: Plafonul total al aplicației, 700 → 800 kB

**Starea:** acceptat pe 13.11.2026, de owner („Da, 115 ／ 800”, la „Ridic plafoanele la 115 kB pornirea și 800 kB
totalul?”), înaintea feliei 28.1↑, prima a aranjamentelor (ADR 0250). Scris în worktree-ul `aranjamente` (ramura
`wip/28.1-aranjamente`, din `main` `d62e6b8`). **Schimbă:** plafonul total din `scripts/build-determinist.ts` (ADR 0144,
care îl ridicase la 700 kB). Pornirea are decizia ei, luată odată cu asta (ADR 0252); ușa, `/admin`, contul și cele doar
online rămân.

## Problema

După unirea planșelor (`d62e6b8`), totalul măsurat e 690,1 / 700 kB: rămân ~10 kB. Linia aranjamentelor aduce, după
estimarea din ADR 0250 („Mărimea”), ~40 kB: Atelier ~6, Clasic ~15 (cu linia de comandă), Pas cu pas ~12, fereastra Mașina
~8. La asta se adaugă ideile acceptate pe 13.11 care intră în feliile 28.x (ADR 0250, secțiunile ideilor). Totalul ar
ajunge pe la ~730 kB.

## Decizia

Plafonul total devine **800 kB**. Cu linia aranjamentelor întreagă rămân ~70 kB, pentru ideile ei și pentru feliile
următoare ale celorlalte linii. O creștere următoare cere iar o decizie scrisă.

Costul e la prima instalare: cel mult ~110 kB în plus față de 690,1 kB, adică ~1,2 s pe o rețea de 750 kbit/s, o singură
dată. La o actualizare vin doar bucățile schimbate (ADR 0098).

Plafonul numără doar JavaScript-ul (ADR 0086); datele din precache și pachetele extensiilor stau în afara lui (ADR 0144).

## Cifrele (măsurate, gzip 9, `node scripts/build-determinist.ts`)

| | La ADR 0144 (09.11) | Acum (`d62e6b8`, 13.11) |
|---|---|---|
| Totalul JavaScript | 578,7 / 700 kB | **690,1 / 800 kB** |

## Ce am respins

- **Aranjamentele ținute pe ramură până se face loc:** feliile gata n-ar ajunge pe adresa principală de test (ADR 0144).
- **Modulele aduse la prima folosire, acum** (ADR 0191, varianta 5b): un aranjament nefolosit n-ar merge offline. Rămâne
  pârghia pentru creșterea următoare, alături de Preact în locul lui React (~55 kB) și de workerul fără Workbox (~4 kB).
- **Plafonul scos de tot:** poarta ține pachetul la vedere (ADR 0096).

## Se redeschide dacă

- totalul trece de 800 kB (întâi ce se poate muta la cerere fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată).
