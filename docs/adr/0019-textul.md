# ADR 0019 — Textul: înălțimea textului e înălțimea majusculei (T19)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T19). **Intră în:** etapa 7.

**Problema.** „Text de 20 mm” trebuie să iasă 20 mm pe piesă. Mărimea fontului (em-ul) nu corespunde cu nimic măsurabil
pe lemn.

**Decizia.**
- „Înălțimea textului” = înălțimea majusculei, verificată pe conturul literei H.
- Glifele se normalizează (ADR 0003).
- Dacă GSUB eșuează, textul se compune literă cu literă.

**Dovada.** „20 mm” iese 20,000000 mm pe litera N [măsurat, s2].

**Ce impune:** placa etapei 7 măsoară „20 mm” = 20,00 mm, cu diacritice.

**Se redeschide dacă:** — (planul nu dă o condiție).
