# ADR 0003 — Regula de umplere: `evenodd` peste tot (T3)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T3). **Intră în:** etapa 1; normalizarea la ușă din etapa 2.

**Problema.** Ecranul, clicul, scula și exportul trebuie să vadă aceeași regiune. O gaură orientată ca exteriorul e
gaură sub `evenodd` și plin sub `nonzero`.

**Decizia.**
- O singură regulă de umplere, **`evenodd`**, pentru ecran, clic, sculă și export.
- Fonturile și SVG-urile `nonzero` se normalizează o singură dată, la intrare, prin reuniune PathKit + R3 (ADR 0004).

**Dovada.**
- Cu `nonzero`, 757 din 4 000 de puncte de probă cad altfel; ecranul, nucleul și `isPointInPath` dau același răspuns
  [măsurat, s6 §4.6].
- Roboto v3 are contururi suprapuse pe 41 din 65 de caractere [măsurat, s3 §4].

**Ce impune.**
- O singură funcție „punct în regiune”, în `src/geom/`.
- Un test compară ecranul, nucleul și `isPointInPath` pe același set de puncte.
- Normalizarea intră la importul SVG (etapa 2) și la text (etapa 7).

**Se redeschide dacă:** proba de normalizare din etapa 7 pică.
