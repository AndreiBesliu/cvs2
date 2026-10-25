# ADR 0075: Plafonul total al aplicației, 300 → 330 kB

**Starea:** acceptat pe 25.10.2026, de asistent, la felia 6.P↑ (ADR 0074), care a dus totalul la 302,1 kB. **Schimbă:** plafonul
total din `scripts/build-determinist.ts` (ADR 0042, ADR 0045 „Se redeschide dacă”). Pornirea (100 kB), `/admin` (200 kB),
ușa (8 kB) și testul pas cu pas (12 kB) rămân.

**Problema.** Totalul JS al aplicației (tot ce intră în precache, fără `/admin` și testul pas cu pas) era 297,5 / 300 kB după
insulele buzunarului (ADR 0073); remedierile din testul owner-ului (colțurile offsetului, ~2,4 kB gzip; poziția față de curbă;
Pen-ul) l-au dus la 302,1 kB. Codul nou nu dublează nimic (măsurat pe bucata offsetului: motorul cavalier, CAM-ul, colțurile).

## Decizia

Plafonul total devine **330 kB**. ADR 0045 spunea, la ~300 kB, „bucățile rare la cerere, în cache la prima folosire”: asta ar
scoate din precache importul SVG (23 kB), vederea 3D sau simularea, care n-ar mai merge offline până la prima folosire online.
Un atelier lucrează des fără internet, iar aplicația promite pornirea offline (BRIEF), deci totul rămâne în precache. Costul:
30 kB în plus la instalare, ~0,3 s pe o rețea de 750 kbit/s, o singură dată pe versiune.

## Se redeschide dacă

- totalul trece de 330 kB (atunci: întâi ce se poate scoate fără să piardă offline-ul, apoi decizia owner-ului între un plafon
  mai mare și bucățile rare la cerere);
- instalarea se simte pe o rețea lentă.
