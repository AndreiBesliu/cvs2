# ADR 0301: Plafonul total al aplicației, 800 → 900 kB

**Starea:** acceptat pe 23.11.2026, de owner („ok, ridica plafonul total la 900 kB”, în sesiunea liniei frezelor, după
raportul unirii lui 16.A↑a, care spunea că după ea rămân 6,4 kB sub plafonul total și că felia următoare, 16.A↑b, nu mai
încape fără decizia lui). Scris pe ramura `wip/16.A-freze`, peste `2c3fd99b`. **Schimbă:** plafonul total din
`scripts/build-determinist.ts` (ADR 0253, care îl ridicase la 800 kB). Pornirea (115 kB, ADR 0252), ușa, `/admin`, contul
și cele doar online rămân.

## Problema

Pe ramura frezelor cu `main` `ebfb1f82` adus (A.8a, A.8b, 25.9↑), adică exact codul lotului care unește 16.A↑a, totalul
măsurat e 793,6 / 800 kB: rămân 6,4 kB. Pe ramuri sau în lucru stau încă felii care cresc totalul: restul liniei frezelor
(16.A↑b–g: alegerea în proiect, contul, calibrarea, bila și toroidala, profilul desenat, valorile pe material; ADR 0300
§11 dădea felia din cont ~2 kB, iar fereastra a crescut cu 9,0 kB), fereastra exportului (28.8↑a, PR-ul
`AndreiBesliu/cvs2#11`), utilizarea aplicației (A.8c), restul aranjamentelor (ADR 0250). Nu încap în 6,4 kB.

## Decizia

Plafonul total devine **900 kB**. Cu 793,6 kB azi rămân ~106 kB, pentru liniile în lucru și pentru feliile următoare. O
creștere următoare cere iar o decizie scrisă.

Costul e la prima instalare: cel mult ~106 kB în plus față de 793,6 kB, adică ~1,1 s pe o rețea de 750 kbit/s, o singură
dată. La o actualizare vin doar bucățile schimbate (ADR 0098).

Plafonul numără doar JavaScript-ul (ADR 0086); datele din precache și pachetele extensiilor stau în afara lui (ADR 0144).

**Pornirea nu se schimbă:** 109,4 kB, cu ușa 113,9, cu Atelierul ales 114,2 / 115. Rămân ~0,8 kB pentru tot ce trebuie
înaintea primei randări; o felie care atinge pornirea cere întâi loc (o bucată mutată la cerere) sau decizia owner-ului pe
plafonul ei (ADR 0252).

## Cifrele (măsurate, gzip 9, `node scripts/build-determinist.ts`)

| | La ADR 0253 (13.11) | Acum (`2c3fd99b`, 23.11) |
|---|---|---|
| Totalul JavaScript | 690,1 / 800 kB | **793,6 / 900 kB** |
| Pornirea (cu ușa / cu Atelierul) | 109,7 / 110 kB | 109,4 (113,9 / 114,2) / 115 kB |

## Ce am respins

- **Feliile ținute pe ramuri până se face loc:** n-ar ajunge pe adresa principală de test (ADR 0144).
- **Modulele aduse la prima folosire, acum** (ADR 0191, varianta 5b): o fereastră nefolosită n-ar merge offline. Rămâne
  pârghia pentru creșterea următoare, alături de Preact în locul lui React (~55 kB) și de workerul fără Workbox (~4 kB).
- **Plafonul scos de tot:** poarta ține pachetul la vedere (ADR 0096).

## Se redeschide dacă

- totalul trece de 900 kB (întâi ce se poate muta la cerere fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată);
- pornirea nu mai are loc pentru o felie care trebuie să stea înaintea primei randări (atunci, ADR-ul pornirii).
