# ADR 0006 — Biarcele proprii sunt singura ușă de aproximare (T6)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T6). **Intră în:** etapa 2 (importul SVG).

**Problema.** Offsetul exact, posturile și G-code-ul lucrează cu linii și arce. Cubicele trebuie aduse la arce o singură
dată, într-un singur loc, cu abaterea cunoscută.

**Decizia.**
- O cubică devine arce sub toleranță printr-un **fitter propriu de biarce**. E singura aproximare de pe drumul spre
  mașină.
- Bugetul de toleranță e pe etape și se probează pe rezultat: oracolul măsoară traseul final față de curba adevărată.

**Dovada.** Abaterea reală e 1,005–1,0076 × toleranța [măsurat, [s1-V](../faza2/sonde/s1-geometrie/VERIFICARE.md) §4.5 și C3]. Lanțul cubică → biarce →
offset → G2 / G3 are abaterea egală cu toleranța biarcelor.

**Ce impune** (`docs/PORTARE.md` §3.3):
- fitter-ul refuză o toleranță ≤ 0 sau NaN;
- la plafonul de adâncime iese un eșec explicit, nu o trunchiere tăcută;
- verificarea se face în ambele sensuri (Hausdorff);
- ținta internă e 0,99 × toleranța, ca abaterea reală să rămână sub cea declarată.

**Se redeschide dacă:** — (planul nu dă o condiție).
