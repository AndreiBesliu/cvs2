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

**Se redeschide dacă:** apare un defect PathKit fără ocol. Atunci se trece la PathOps din CanvasKit (întreținut,
3,3 MB), fără alt cod.
