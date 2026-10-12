# ADR 0004 — Booleanul: PathKit 1.0, înghețat, cu re-ancorarea R3 după fiecare operație (T4)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T4). **Intră în:** etapa 2 (fațada minimă), etapa 6 (editorul).

**Problema.** Reuniunea, diferența și intersecția trebuie să lucreze pe L / A / C și să lase cercul cerc.

**Decizia.**
- **PathKit 1.0** (Skia PathOps, BSD-3), adus în repo și înghețat, în spatele fațadei `boolean(a, b, op)`.
- **Re-ancorarea R3 se face după fiecare operație:**
  - fiecare segment ieșit (linie, arc, conică) se potrivește prin 3 puncte pe primitiva-sursă;
  - vârfurile sunt intersecțiile exacte.

**Dovada** [măsurat, [s1-V §4.6](../faza2/sonde/s1-geometrie/VERIFICARE.md)]:
- o operație: ≤ 1,3·10⁻⁴ mm la 2 440 mm;
- 100 de operații fără R3: 5,1·10⁻⁴ mm, cu centre de arc greșite cu până la 0,57 mm;
- cu R3 după fiecare operație: 3,3·10⁻¹³ mm.

**Ce am respins:**
- re-ancorarea doar pe centru și rază, infirmată de verificare (rămâneau 1–31 de arce nepotrivite);
- `flatten-js`, care aruncă excepție la diferență [s1];
- Clipper în produs (ADR 0007).

**Ce impune:** nimeni nu cheamă PathKit direct, doar prin fațadă. Oracolul de structură (număr de contururi, fără laturi
comune) și controlul „reuniune care pierde găurile” intră odată cu fațada.

**Măsurat în felia 2.7d (12.10.2026, ADR 0036)**, la normalizarea `nonzero`: PathKit + R3 extins la cubice a dat 18 rulări
din 271 cu geometrie greșită, tăcut (detalii de 0,5–3 µm pierdute la scara foii: eps-ul R3 e 2e-6 × mărimea, adică
5,4e-3 mm pe o foaie întreagă) și a refuzat textul real; ca veto, PathKit contrazicea fals 35 de contururi dintr-o supă de
glife. Pentru ușă, decizia s-a mutat în ADR 0036. Pentru booleanul editorului (etapa 6), ADR-ul se reevaluează atunci,
cu aceste cifre: același aranjament exact, cu alt predicat, poate da reuniunea, diferența și intersecția fără PathKit.

**Se redeschide dacă:** apare un defect PathKit fără ocol. Atunci se trece la PathOps din CanvasKit (întreținut,
3,3 MB), fără alt cod.
