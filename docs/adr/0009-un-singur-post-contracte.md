# ADR 0009 — Un singur post, condus de contracte de dialect ca date (T9)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T9). **Intră în:** etapa 1 (GRBL); contractele în etapele 3–4.

**Problema.** Controlerele diferă în feluri care strică piesa: zecimale, arce, pauze, schimbarea sculei. În ediția
întâi, fiecare diferență era o ramură de cod.

**Decizia.** Un singur post, condus de **contracte de dialect ca date**, cu sursa și starea pe fiecare câmp:
- 3 zecimale în mm și 5 în inch, cu punctul zecimal scris mereu;
- I / J calculate din startul rotunjit;
- garda de coardă ≥ 10 rezoluții și de unghi ≥ 10⁻⁴ rad; arcele cu rază peste ~10⁴ mm ies ca G1;
- plafonul de 70 de octeți pe linie;
- 4 strategii de schimbare a sculei;
- antetul setează tot ce folosește programul, iar WCS-ul e scris explicit;
- găurirea e desfăcută în G0 / G1;
- **7 contracte în v1:** GRBL 1.1, grblHAL, FluidNC, NcStudio, RichAuto, Syntec, Mach3 / Mach4.

**Dovada** [s8, s1-V]:
- 200 000 de arce, 0 erori la regula de arc GRBL (măsurat);
- 6 diferențe între controlere care strică piesa (citit);
- regula GRBL respinge arcele și peste 0,5 mm abatere absolută (citit).

**Ce am respins:** ciclurile fixe G81 / G83. Găurirea desfăcută e identică pe toate controlerele; ciclurile pot veni în
v1.x (`PLAN.md` §3.6).

**Ce impune:** postul e singurul care scrie programul, inclusiv blocul de după `M6` (`docs/PORTARE.md` §3.4). Oracolul
G-code are propriul cititor și propria regulă de arc.

**Se redeschide dacă:** rezultatele din ateliere o cer.
