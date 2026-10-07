# ADR 0022 — N axe din prima zi (T22)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T22). **Intră în:** etapa 1.

**Problema.** Axa A separată și, mai târziu, axa a 4-a trebuie să încapă fără să se rescrie IR-ul, postul și senderul
(`BRIEF.md` §12: „senderul și postul trebuie să știe de A”). Ediția întâi avea tipuri doar pentru XYZ (`LECTII.md`
§4.10).

**Decizia.**
- IR-ul, profilul mașinii, contractele și senderul au **lista de axe**.
- Pozițiile au cadru (`MachinePos` / `WorkPos`) și stare (`Known` / `Unknown`).
- **v1 folosește XYZ.** Simularea refuză explicit axa A până în v1.x.
- Contractele grblHAL și FluidNC poartă cuvântul și unitatea axei A. Le probează owner-ul, pe controlerul axei A.

**Ce impune:** parsarea rapoartelor de stare citește oricâte valori pe `MPos`, `WPos` și `WCO` (`docs/PORTARE.md`
§3.5). O poziție `Unknown` nu se folosește niciodată ca număr.

**Se redeschide dacă:** — (planul nu dă o condiție).
