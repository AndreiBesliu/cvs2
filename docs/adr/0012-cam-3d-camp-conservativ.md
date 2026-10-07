# ADR 0012 — CAM 3D doar pe câmpul conservativ (T12)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T12). **Intră în:** etapa 18 (relieful), apoi etapa 20 (modelele 3D).

**Problema.** Eșantionarea modelului în noduri pierde vârfurile dintre noduri, iar freza sapă în model.

**Decizia.**
- CAM-ul 3D lucrează doar pe **câmpul conservativ**: maximul modelului pe celulă, plus distanța la segment.
- Eșantionarea în nod e doar pentru ecran.
- **Drop-cutter-ul exact pe triunghiuri e oracolul.**

**Dovada.** Eșantionarea în nod sapă până la 5 mm; câmpul conservativ: 0 scobituri [măsurat, s5 §4.1, §4.3].

**Ce am respins:** eșantionarea în nod pentru CAM.

**Ce impune:** degroșarea și finisarea primesc doar câmpul conservativ. Oracolul are drop-cutter-ul lui, fără importuri
din `src/`.

**Se redeschide dacă:** — (planul nu dă o condiție).
