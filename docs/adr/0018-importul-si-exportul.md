# ADR 0018 — Importul și exportul: câte o ușă pe format, toate spre același model (T18)

**Starea:** acceptat pe 07.10.2026, odată cu `PLAN.md` (§3.5, rândul T18). **Intră în:** etapa 2 (SVG); etapa 9 (DXF, PDF); etapele 25–26.

**Problema.** Fișierele vin din ArtCAM, AutoCAD, Aspire / VCarve, Inkscape / Illustrator și CorelDRAW, iar exportul
trebuie să scrie entități reale, la scară exactă (`BRIEF.md` §16.2).

**Decizia.** Câte o ușă pe format, toate spre același model.
- **Exportul DXF R2007 „exact”:** CIRCLE, ARC, ELLIPSE, LWPOLYLINE cu bulge, SPLINE; straturile sunt rolurile.
- **SVG** în mm; **PDF** cu straturi; **EPS** (implicit da).
- Scriitorul **R12** e gata (~80 de linii). Intră doar dacă un program al owner-ului nu deschide R2007.
- **Laserul:** export vectorial pentru LightBurn / RDWorks (laserul owner-ului are controler Ruida):
  - straturi pe culori de putere și viteză;
  - feliile pe Z.

  G-code-ul de laser pentru GRBL e în v1.x.
- **Importul** (decis pe 07.10):
  - DXF, SVG, PDF și AI compatibil PDF;
  - EPS și AI ≤ 8, prin cititor propriu, limitat;
  - WMF, prin cititor propriu;
  - DWG doar ca mesaj;
  - DGK și PIC scoase din prag;
  - fără export AI.

**Dovada.** Export 108 / 108 și import 65 / 65, recitite de programe independente [măsurat, s2].

**Ce am respins:**
- a doua presetare DXF (R12), ca implicit;
- instanțele exportate ca BLOCK / INSERT: exportul desfăcut e exact (`PLAN.md` §3.6).

**Se redeschide dacă:** pachetul de probă al owner-ului, deschis în programele lui, o cere (`PLAN.md` §8.3).
