# ADR 0137: Plafonul total al aplicației, 500 → 550 kB

**Starea:** acceptat pe 06.11.2026, de owner („Yes, 550 kB”, la „Raise the total bundle cap to 550 kB (new ADR), keeping
startup at 110 kB?”), la unirea liniei pluginului în `main`. **Schimbă:** plafonul total din `scripts/build-determinist.ts`
(ADR 0122, care îl ridicase la 500 kB). Celelalte plafoane rămân, între ele pornirea (110 kB, ADR 0100), ușa (8 kB),
`/admin` (200 kB), contul (32 kB) și cele doar online.

**Problema.** Unirea liniei pluginului (feliile 3.S, 3.Xa–3.Xe și 3.Ta–3.Tf, ADR 0126–0129 și 0160–0167) a dus totalul la
503,1 / 500 kB; pe `main`, înainte, era 483,8 kB (după 3.6f). Partea mare e gazda extensiilor, adusă la cerere: `cadru` (4,6
kB), `Extensii` (4,3 kB), `Instalare` (3,9 kB) și `DialogLucrare` (2,3 kB); restul vine din fereastra Mașina (confirmarea,
lucrarea primită de la o extensie) și din pornire (+1,0 kB). Gazda trebuie să meargă și fără rețea: o extensie instalată
(pachetul ei stă în IndexedDB, rulat într-un cadru izolat) folosește senderul și formele și offline, ca restul aplicației.

## Decizia

Plafonul total devine **550 kB**. Rămân 46,9 kB, deci loc pentru ~15 felii la ~3 kB pe felie cu cod (ritmul din ADR 0096).
Costul e la prima instalare: cel mult ~67 kB în plus față de 483,8 kB, adică ~0,7 s pe o rețea de 750 kbit/s, o singură
dată. La o actualizare vin doar bucățile schimbate (ADR 0098).

Plafonul numără doar JavaScript-ul (ADR 0086). Datele din precache (mesajele, manualul, codurile controlerelor, fonturile
incluse) stau în afara lui, la fel pachetele extensiilor, pe care omul le instalează singur.

## Cifrele (măsurate, gzip 9)

| | Înainte (`main`, după 3.6f) | După unirea pluginului |
|---|---|---|
| Totalul JavaScript | 483,8 / 500 kB | **503,1 / 550 kB** |
| Pornirea (cu ușa) | 100,4 (103,9) / 110 | 101,4 (104,9) / 110 |

## Ce am respins

- **Gazda extensiilor doar online** (în afara totalului, cu plafonul ei, ca a contului): o extensie instalată n-ar mai
  merge fără rețea, deși pachetul ei stă în browser.
- **Loc făcut întâi în altă parte:** pârghiile mari rămase, Preact în locul lui React (~55 kB) și workerul fără Workbox
  (~4 kB), au riscul lor și câte o felie a lor (ADR 0095, 0122).
- **Plafonul scos de tot:** poarta ține pachetul la vedere, iar o creștere mare cere din nou o decizie scrisă (ADR 0096).

## Se redeschide dacă

- totalul trece de 550 kB (întâi ce se poate scoate fără să piardă offline-ul, apoi decizia owner-ului);
- instalarea se simte pe o rețea lentă (progresul din bara de jos o arată);
- pornirea ajunge la plafonul ei. Asta e altă decizie: plafonul de aici nu ajută pornirea (ADR 0100).
