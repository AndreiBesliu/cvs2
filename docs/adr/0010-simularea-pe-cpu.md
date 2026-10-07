# ADR 0010 — Simularea: nucleu TypeScript pe CPU, același în Node și în browser (T10)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T10). **Intră în:** etapa 4.

**Problema.** Ecranul trebuie să arate exact ce verifică testele. Asta cere un singur nucleu, determinist, rulat la fel
în CI și în browser (`BRIEF.md`: un nucleu folosit de ecran și de teste, plus un oracol separat).

**Decizia.**
- Nucleu TypeScript pe CPU, cu:
  - câmp rar, pe dale mici;
  - dalele uniforme ținute ca un singur număr;
  - calcul exact pe celulă;
  - rânduri de dale intercalate pe bazinul de workere.
- Rezoluția implicită: 0,25 mm, cu 0,1 mm pe o fereastră.
- **Amprenta Node = browser e poartă în CI.**

**Dovada.** 0 celule greșite pe 16 piese calculate pe hârtie. Rezultatul e identic bit cu bit în Node și în Edge, de la 1
la 16 fire [măsurat, s4].

**Ce am respins:**
- calculul pe GPU (ADR 0011);
- WASM: 1,00–1,08× pe cod identic (`PLAN.md` §3.6).

**Ce impune:** `sim` importă doar `ir` și tipurile sculelor. Afișarea pe WebGL2 doar citește celulele.

**Se redeschide dacă:** — (planul nu dă o condiție).
