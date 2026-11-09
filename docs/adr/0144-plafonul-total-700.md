# ADR 0144: Plafonul total al aplicației, 600 → 700 kB

**Starea:** acceptat pe 09.11.2026, de owner („Yes, 700 kB”, la „Raise the total bundle limit to 700 kB?”), după
verificarea a ce se mai poate uni în `main`. **Schimbă:** plafonul total din `scripts/build-determinist.ts` (ADR 0143, care
îl ridicase la 600 kB). Celelalte plafoane rămân, între ele pornirea (110 kB, ADR 0100), ușa (8 kB), `/admin` (200 kB),
contul (32 kB) și cele doar online.

**Problema.** Pe 09.11, după unirea trasării din imagine (25.1↑–25.3↑b) și a lui 6.V↑d, totalul e 578,7 / 600 kB, deci
rămân 21,3 kB. Fiecare linie paralelă rămasă trece singură de ei. Mai jos, măsurat pe unirile de probă peste `main`
(`3797e17`), în clona din afara Drive-ului (build-ul determinist, gzip 9); la planșe, care au conflicte de cod cu `main`,
vârful ramurii față de baza ei:

| Linia (ramura) | Feliile gata, neunite | Totalul cu ea unită | În plus |
|---|---|---|---|
| Tăierea vectorilor (`wip/10.3-taiere-conversie`, `21492d3`) | 10.3↑f–10.3↑i | 600,1 kB | +21,4 kB |
| Planșele (`wip/11.1-plansele`, `4b63c9e`) | 11.1↑–11.4↑b | ~603,9 kB | +25,2 kB |
| Imprimanta (`wip/3.6g-imprimanta`, `d57d617`) | 3.6j–3.6o | 617,2 kB | +38,5 kB |

Tăierea și imprimanta împreună au dat 638,5 kB (măsurat), deci bucățile lor se adună; cu toate trei, ~663,8 kB. Trasarea a
pornit 25.4↑, iar fiecare linie are felii următoare.

## Decizia

Plafonul total devine **700 kB**. Cu cele trei linii unite rămân ~36 kB: plafonul ține liniile de azi și câteva felii de
mai departe, nu pe toate, deci o creștere următoare cere iar o decizie scrisă (sau una dintre pârghiile de mai jos). Costul
e la prima instalare: cel mult ~85 kB în plus față de 578,7 kB, adică ~0,9 s pe o rețea de 750 kbit/s, o singură dată. La o
actualizare vin doar bucățile schimbate (ADR 0098).

Plafonul numără doar JavaScript-ul (ADR 0086). Datele din precache (mesajele, manualul, codurile controlerelor, fonturile
incluse) stau în afara lui, la fel pachetele extensiilor (ADR 0230).

**Pornirea nu se schimbă.** Planșele cresc și pornirea: cu ușa, 109,9 / 110 kB pe ramura lor, ~110,1 cu `main`-ul de acum
(+4,5 kB pe calea ușii). Plafonul de aici nu le ajută; pornirea e altă decizie (ADR 0100), iar întâi linia își micșorează
calea ușii.

## Cifrele (măsurate, gzip 9)

| | La ADR 0143 (07.11) | Acum (`main`, 09.11) |
|---|---|---|
| Totalul JavaScript | 535,0 / 600 kB | **578,7 / 700 kB** |
| Pornirea (cu ușa) | 101,7 (105,3) / 110 | 101,9 (105,6) / 110 |

## Ce am respins

- **Liniile ținute pe ramuri până se face loc:** feliile gata n-ar ajunge pe adresa principală de test, iar ramurile s-ar
  depărta de `main`.
- **Tăierea micșorată cu 0,1 kB, ca să intre sub 600:** fragil; următoarea unire ar lovi iar plafonul.
- **Modulele aduse la prima folosire, acum** (ADR 0191, varianta 5b): o bucată încă nefolosită n-ar fi offline; cere felia
  ei, cu regula offline-ului scrisă întâi. Rămâne pârghia pentru creșterea următoare, alături de Preact în locul lui React
  (~55 kB) și de workerul fără Workbox (~4 kB) (ADR 0095, 0122).
- **Plafonul scos de tot:** poarta ține pachetul la vedere, iar o creștere mare cere din nou o decizie scrisă (ADR 0096).

## Se redeschide dacă

- totalul trece de 700 kB (întâi ce se poate muta la cerere fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată);
- pornirea ajunge la plafonul ei. Asta e altă decizie: plafonul de aici nu ajută pornirea (ADR 0100).
