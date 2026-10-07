# ADR 0008 — Un singur IR al traseului, în coordonatele documentului (T8)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T8). **Intră în:** etapa 1.

**Problema.** În ediția întâi, originea din dreapta oglindea tot programul, iar defectul a stat ascuns 104 zile
(`LECTII.md` §2.1). Fiecare emitent își făcea singur transformarea.

**Decizia.**
- CAM-ul produce **un singur IR** al traseului, în coordonatele documentului.
- **Postul aplică matricea montajului** (originea, fața, axele).

**Ce impune.**
- `cam` nu știe de origine și nici de controler.
- `post` importă doar `ir` și contractele (`PLAN.md` §3.3).
- Invarianta „cadrul”: coordonatele programului = documentul × matricea montajului, verificat pe hârtie pe cele 4 colțuri
  de origine. Placa 1 o taie cu originea în stânga-jos și în dreapta-sus.

**Se redeschide dacă:** — (planul nu dă o condiție).
