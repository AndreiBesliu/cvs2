# ADR 0023 — CAM-ul lasă material implicit și are ieșirea mărginită (T23)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T23). **Intră în:** etapa 1.

**Problema.** Un CAM care greșește trebuie să greșească în partea sigură. Iar un program fără plafon poate crește fără
limită.

**Decizia.**
- La îndoială, CAM-ul lasă material, nu sapă.
- Bugetul de linii al programului se calculează înainte de generare (pre-flight).
- Plafoanele stau pe artefact (document și program), pentru toate ușile, nu pe o singură ușă.

**Dovada.** „Implicit se lasă material” a limitat paguba de fiecare dată în ediția întâi [citit, `LECTII.md` §4.5].

**Ce impune.**
- Poarta de invariante rulează pe orice program: niciodată mai adânc decât pasul pe trecere; scula nu intră în regiunea
  păstrată.
- Un plafon depășit refuză, cu mesaj; nu trunchiază.

**Se redeschide dacă:** — (planul nu dă o condiție).
