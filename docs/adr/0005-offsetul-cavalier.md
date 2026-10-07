# ADR 0005 — Offsetul: cavalier_contours, cu gărzi, fără Rust (T5)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T5). **Intră în:** etapa 1 (geometria v0); gărzile în etapa 2; reparațiile în etapa 9.

**Problema.** Offsetul e baza profilului, buzunarului și incrustației. Trebuie să păstreze arcele exact și să nu dea
niciodată un traseu greșit fără să spună.

**Decizia.**
- **cavalier_contours**: portul TypeScript, adus în repo.
- Reparațiile din Rust 0.8 / 0.9 se portează în etapa 9.
- Testul „paralele” se repară (unghiul normalizat).
- **Gărzile**, din etapa 2:
  - curățarea intrării;
  - validarea structurală a ieșirii;
  - rezoluția declarată: 0,01 mm.
- Orice eșec iese explicit, niciodată ca traseu tăcut.
- **Fără toolchain Rust.**

**Dovada** [măsurat, [s1-V](../faza2/sonde/s1-geometrie/VERIFICARE.md)]:
- exact pe litere și pe forme CAD: 48 / 48 de buzunare, cu abaterea egală cu toleranța biarcelor;
- pe polilinii dense cade în 47 din 240 de cazuri. De aici gărzile și criteriul din etapa 9.

**Ce am respins:** WASM compilat de noi (Rust, emsdk, AssemblyScript). Pe cod identic, WASM a adus doar 1,00–1,08×
(`PLAN.md` §3.6).

**Ce impune:** cubicele intră în offset doar ca biarce (ADR 0006). Suita densă rulează în nivelul de noapte.

**Se redeschide dacă:** criteriul din etapa 9 pică pe suita densă (eșecuri explicite peste 1 % sau orice eșec tăcut).
Atunci întrebarea merge la owner: Rust 0.9 compilat în WASM.
