# ADR 0001 — Conturul are trei primitive: linie, arc de cerc, cubică (T1)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T1). **Intră în:** etapa 1 (documentul și geometria v0).

**Problema.** Proiectul promite vectori reali: cercul rămâne cerc prin orice operație (`BRIEF.md` §16.2). Un model de
curbă deschis, la care se adaugă tipuri de segment pe parcurs, a fost una dintre cauzele de fond din ediția întâi
(`LECTII.md` §2.2, clasa 7).

**Decizia.**
- Un contur are exact trei primitive: **linie, arc de cerc, cubică**.
- Nodurile poartă `bulge` = tan(baleiaj / 4).
- Pătraticele (din fonturi și din SVG `Q`) se ridică exact la cubice, la import.
- Orice `switch` pe tipul de segment e exhaustiv și verificat de compilator.

**Dovada.** Cercul decalat rămâne 2 arce. Rotirea păstrează colțurile rotunde, cu o abatere de 3,6·10⁻¹⁴ mm
[măsurat, [s1 §4](../faza2/sonde/s1-geometrie/RAPORT.md)].

**Ce am respins:** arcul eliptic ca al patrulea tip de segment (ADR 0002).

**Ce impune.**
- Tipurile stau în `src/geom/`, singura autoritate pentru geometrie (`PLAN.md` §3.2).
- O schimbare de schemă e o migrare pură, cu corpus de aur.
- Oracolul de geometrie măsoară distanța exactă la linie, arc, pătratică și cubică (`PLAN.md` §4.1).

**Se redeschide dacă:** — (planul nu dă o condiție).
