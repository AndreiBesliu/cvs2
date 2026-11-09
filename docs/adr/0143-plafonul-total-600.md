# ADR 0143: Plafonul total al aplicației, 550 → 600 kB

**Starea:** acceptat pe 07.11.2026, de owner („Yes, 600 kB”, la „Raise the total bundle cap to 600 kB (new ADR), startup
staying at 110 kB?”), după unirea raportărilor și a imprimantei în `main`. **Schimbă:** plafonul total din
`scripts/build-determinist.ts` (ADR 0137, care îl ridicase la 550 kB). **Schimbat de:** ADR 0144 (700 kB, din 09.11, după
unirea trasării și a lui 6.V↑d). Celelalte plafoane rămân, între ele pornirea (110 kB,
ADR 0100), ușa (8 kB), `/admin` (200 kB), contul (32 kB) și cele doar online.

**Problema.** Pe 07.11, după unirea bibliotecii extensiilor (3.Xg), a raportărilor complete (15.B↑b) și a primelor felii ale
imprimantei (3.6g–3.6i), totalul e 535,0 / 550 kB, deci rămân 15,0 kB. Liniile paralele au, gata pe ramurile lor, felii care
trec împreună de ei. Mai jos, ce adaugă fiecare față de `main`-ul din care a plecat, măsurat de linie pe ramura ei; suma e
aproximativă, fiindcă o bucată comună mai multor linii se numără o singură dată:

| Linia (ramura) | Feliile gata, neunite | Totalul în plus |
|---|---|---|
| Trasarea din imagine (`wip/25.1-trasare`) | 25.1↑ (alb-negru), 25.2↑ (culorile) | ~25,6 kB |
| Imprimanta (`wip/3.6g-imprimanta`) | 3.6j (piesele plate) | 14,7 kB |
| Incrustațiile (`wip/12.1-incrustatii`) | 12.1↑b (pereții drepți), începutul lui 12.1↑c | ~8,6 kB |
| Planșele (`wip/11.1-plansele`) | 11.1↑, 11.1↑b | ~6,0 kB |
| Tăierea vectorilor (`wip/10.3-taiere-conversie`) | 10.3↑c, 10.3↑d | 5,5 kB |

Împreună, ~60 kB: cu toate unite, totalul ar fi ~595 kB. Fiecare linie are și felii următoare.

## Decizia

Plafonul total devine **600 kB**. Cu ce e gata acum pe ramuri, rămân ~5 kB: plafonul nou ține liniile de azi, nu și feliile
lor de mai departe, deci o creștere următoare cere iar o decizie scrisă (sau una dintre pârghiile de mai jos). Costul e la
prima instalare: cel mult ~65 kB în plus față de 535,0 kB, adică ~0,7 s pe o rețea de 750 kbit/s, o singură dată. La o
actualizare vin doar bucățile schimbate (ADR 0098).

Plafonul numără doar JavaScript-ul (ADR 0086). Datele din precache (mesajele, manualul, codurile controlerelor, fonturile
incluse) stau în afara lui, la fel pachetele extensiilor (biblioteca le servește lângă aplicație, ADR 0230).

## Cifrele (măsurate, gzip 9)

| | La ADR 0137 (06.11) | Acum (`main`, 07.11) |
|---|---|---|
| Totalul JavaScript | 503,1 / 550 kB | **535,0 / 600 kB** |
| Pornirea (cu ușa) | 101,4 (104,9) / 110 | 101,7 (105,3) / 110 |

## Ce am respins

- **Liniile ținute pe ramuri până se face loc:** feliile gata (încercate de owner pe canale) n-ar ajunge pe adresa principală,
  iar ramurile s-ar depărta de `main` (conflictele cresc cu fiecare zi).
- **Modulele aduse la prima folosire, acum** (ADR 0191, varianta 5b): o bucată încă nefolosită n-ar fi offline; cere felia
  ei, cu regula offline-ului scrisă întâi. Rămâne pârghia pentru creșterea următoare, alături de Preact în locul lui React
  (~55 kB) și de workerul fără Workbox (~4 kB) (ADR 0095, 0122).
- **Plafonul scos de tot:** poarta ține pachetul la vedere, iar o creștere mare cere din nou o decizie scrisă (ADR 0096).

## Se redeschide dacă

- totalul trece de 600 kB (întâi ce se poate muta la cerere fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată);
- pornirea ajunge la plafonul ei. Asta e altă decizie: plafonul de aici nu ajută pornirea (ADR 0100).
