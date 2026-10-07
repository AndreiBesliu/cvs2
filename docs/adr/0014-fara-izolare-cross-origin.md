# ADR 0014 — Fără izolare cross-origin (T14)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T14). **Intră în:** etapa 1 (primul worker).

**Problema.** SharedArrayBuffer cere izolare cross-origin (COOP + COEP), iar izolarea strică login-ul Google.

**Decizia.**
- Fără izolare cross-origin. Datele spre workere se **transferă**.
- Nucleele lucrează peste o bandă cu decalaj: `(buffer, rândul de start, rânduri)`.
- Halo-ul se calculează din nucleu și se testează la margine.

**Dovada** [măsurat, s11]:
- COOP + COEP strică login-ul Google, și prin popup, și prin redirect;
- transferul costă × 1,10–1,23 la blur și × 0,97 la finisare.

**Ce am respins:** SharedArrayBuffer și izolarea cross-origin (`PLAN.md` §3.6).

**Se redeschide dacă:** o bibliotecă cu fire o cere. Atunci se folosește doar Document-Isolation-Policy, niciodată
COOP + COEP.
