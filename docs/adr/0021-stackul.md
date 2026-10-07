# ADR 0021 — Stack-ul (T21)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T21). **Intră în:** etapa 1 (scheletul).

**Problema.** Fiecare bibliotecă în plus aduce cod de întreținut și un loc în plus unde se poate ascunde starea. Testele
trebuie să ruleze pe ce ajunge la utilizator.

**Decizia.**
- TypeScript 7 strict; React 19, subțire peste acțiuni.
- Fără bibliotecă de stare, de rutare sau de CSS.
- Testele pe `node --test`. Vitest intră doar dacă fricțiunea e măsurată.
- Playwright pe Edge, pe `dist/`.
- Python doar în CI (cititorii independenți din `test/oracles-py/`).

**Dovada.**
- Toate sondele au rulat cu `node` simplu [citit, §7 al fiecărei sonde].
- Chromium-ul din Playwright nu pornește pe această mașină, Edge da [măsurat].

**Ce impune:** interfața ajunge la domeniu doar prin registrul de acțiuni (`PLAN.md` §3.2). O tehnologie intră doar când
o măsurătoare o cere (`PLAN.md` §3.1, principiul 7).

**Se redeschide dacă:** — (planul nu dă o condiție).
