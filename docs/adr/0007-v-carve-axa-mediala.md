# ADR 0007 — V-carve: axa medială din Voronoi pe eșantioane, fără Clipper (T7)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T7). **Intră în:** etapa 8.

**Problema.** V-carve-ul cere axa medială a regiunii, cu raza exactă în fiecare punct. În ediția întâi, plăcuța de
6 mm avea 161 842 de linii.

**Decizia.**
- Axa medială se calculează din Voronoi pe eșantioane (delaunator), cu:
  - legalizare pe stivă, care aruncă eroare dacă nu converge;
  - pas adaptiv (h ≤ 0,02 mm pe trăsăturile fine);
  - raza recalculată exact;
  - vindecarea intrării, cu toleranța declarată (0,005 mm, raportată);
  - adâncimea de start la incrustații.
- Normalizarea regiunii folosește PathKit + R3 (ADR 0004), **fără Clipper**.

**Dovada** [s3, s3-V]:
- plăcuța de 6 mm iese în 8 222 de linii (citit);
- la h = 0,05 abaterea iese peste buget (0,0163 mm), iar la h = 0,02 intră în buget (măsurat);
- legalizarea pe stivă durează 0,08 s; cea pe treceri dura 16–19 s, cu ieșire tăcută (măsurat).

**Ce am respins:**
- Clipper în produs;
- martorii GPL în CI (voron8) și flo-mat ca nucleu. Ajung oracolul cu distanța exactă, un al doilea oracol prin
  eșantionare și controalele negative (`PLAN.md` §3.6).

**Se redeschide dacă:** pică corpusul cu muchii aproape comune. Atunci Clipper intră închis, doar în pregătirea
V-carve-ului.
