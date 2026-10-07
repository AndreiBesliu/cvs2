# ADR 0002 — Elipsa e un cerc sub o matrice neuniformă; aproximarea e declarată (T2)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T2). **Intră în:** etapa 2 (importul SVG), apoi etapele 6 și 9.

**Problema.** Elipsele vin din desen și din SVG (elemente și arce eliptice în căi). Un tip de segment în plus ar înmulți
cazurile din fiecare operație. O aproximare tăcută ar încălca promisiunea vectorilor reali.

**Decizia.**
- Elipsa e un cerc sub o matrice neuniformă, deci rămâne exactă, iar în DXF iese ca ELLIPSE.
- **Aproximarea e declarată.** Ies cubice (sau biarce, pentru CAM) sub toleranța proiectului de **0,001 mm**, cu numărul
  bucăților raportat, în patru cazuri:
  - „convertește în cale” pe o elipsă;
  - booleanul și offsetul pe forme sub matrice neuniformă;
  - offsetul unei cubice;
  - un arc eliptic din mijlocul unei căi SVG.
- La export, bucățile aproximate ies SPLINE, nu ELLIPSE.
- PDF și EPS n-au arce, deci acolo și cercul iese din cubice. E o limită a formatului.

**Dovada.** O elipsă cere 8 cubice până la r = 50 mm și 16 până la r = 1 220 mm [măsurat, [s1 §4.6](../faza2/sonde/s1-geometrie/RAPORT.md)].

**Ce am respins:** arcul eliptic ca al patrulea tip de segment (`PLAN.md` §3.6).

**Ce impune:** forma parametrică elipsă = cerc + matrice. Fiecare operație care aproximează raportează câte bucăți a
produs și la ce toleranță.

**Se redeschide dacă:** — (planul nu dă o condiție).
