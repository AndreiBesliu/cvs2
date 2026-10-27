# ADR 0089: Exportul 2D în PDF și EPS

**Starea:** acceptat pe 27.10.2026. Felia 9.2↑, adusă din etapa 9 în etapa 3, fără mașină, la „continua” al owner-ului, după
DXF și SVG (ADR 0088). **Rândul din prag:** „Export 2D cu vectori reali: DXF, SVG, PDF (EPS da, AI nu)…”
(`ACOPERIRE-ARTCAM-DESKPROTO.md`, A). **Urmează:** `PLAN.md` T2 (aproximarea declarată), T18 (PDF cu straturi, EPS implicit da)
și sonda s2 (cercul Ø100 din 7 cubice, 0,00047 mm). **Schimbă:** alegerea bibliotecii PDF din s2 (`pdf-lib`): scriitorul e al
nostru (§3).

**Problema.** Corel și Illustrator deschid bine PDF-ul și EPS-ul (exportul AI e respins, `PLAN.md` §8.1), iar laserul
owner-ului primește des PDF. ADR 0088 a scris DXF și SVG; rândul cerea și PDF, cu straturi, și EPS.

## Decizia

**1. Aceleași vectori** (`vectoriFoaie`, ADR 0088 §1–2): foaia în mm, aceleași entități, aceleași straturi (rolurile), aceleași
culori. **Cutia** e foaia, lărgită exact cât iese o formă din ea (cu extremele arcelor și ale cubicelor, `cutieElement`):
pagina PDF, cutiile EPS și, de acum, întinderea DXF-ului ($EXTMIN / $EXTMAX).

**2. Arcele, din cubice** (`cubice.ts`): PDF-ul și EPS-ul n-au arc. Un arc de unghi φ se împarte în n bucăți egale (cel mult 90°),
fiecare scrisă cu cubica standard (capetele pe cerc, brațul k = 4/3 · tan(φ / 4n) · r), cu n cel mai mic pentru care abaterea
radială, **măsurată pe cubică** (32 de puncte), e sub 0,9 × 0,001 mm (toleranța `PLAN.md` T2). Cercul R50 iese din 7 cubice
(0,00047 mm, ca în s2), R0,01 din 4, R2440 din mai multe. Liniile și cubicele rămân exacte. Comenzile comune ambelor formate
(mută, linie, cubică, închide) le dă `drumuri.ts`.

**3. PDF 1.5, scris de noi** (`pdfExport.ts`): o pagină, conținutul în mm prin matricea `cm` (72 / 25,4 cu toate cifrele), câte un
**strat PDF (OCG)** pe rol, vizibil, cu numele lui (căile între `/OC /OCn BDC` și `EMC`), culoarea și grosimea de 0,1 mm. Numai
ASCII, necomprimat: offseturile din xref sunt lungimile textului. `pdf-lib` (s2) n-ar fi încăput în plafonul total (330 kB),
iar instalarea locală n-are npm.

**4. EPS** (`epsExport.ts`): EPSF-3.0, nivelul 2, `%%BoundingBox` întreg (în jos / în sus) și `%%HiResBoundingBox` exactă, conținutul
în mm (`scale`), numai ASCII. EPS-ul n-are straturi: rolul rămâne în culoare și într-un comentariu (`% Stratul …`).

**5. Panoul** (ADR 0088 §5): formatele DXF (R2007, implicit), SVG, PDF, EPS; la PDF și EPS, o notă spune că arcele ies din curbe,
la cel mult 0,001 mm (la EPS, și că n-are straturi). Bucata adusă la cerere crește cu scriitorii (vezi jurnalul feliei).

## Probele

- **Oracolul independent** (`test/oracles-py/export2d.py` + `export2d_pdf.py`, nimic din `src/`), pe același corpus (ADR 0088):
  - PDF-ul citit de **PyMuPDF 1.26.3**: versiunea, o pagină de 600 × 400 mm, cele 7 straturi OCG vizibile, fiecare cale pe
    stratul ei, cu culoarea lui, câte căi pe strat; fiecare punct al fiecărei căi (capetele, 17 puncte pe cubică) pe forma de
    pe hârtie (dreptunghiul rotunjit rotit 30°, „D”-ul cu arcul R31,25 din (181,25; 325), semicercul prin (475, 25), cercurile,
    dreptunghiul oglindit, foaia), la cel mult 0,0011 mm; fiecare vârf de pe hârtie un capăt al căii; cubicele exacte (curba S,
    „D”, ovalul) cu punctele lor; cercul R50 din cel mult 8 cubice;
  - EPS-ul, de două ori: citit **direct** de un cititor Python mic, separat (doar subsetul pe care îl scriem), la aceeași
    toleranță, și trecut prin **Ghostscript** (interpretorul PostScript real; în CI din pachetele Ubuntu, local din
    `@jspawn/ghostscript-wasm`, doar pentru test, AGPL), care dovedește că e PostScript valid ce desenează formele: Ghostscript
    mută desenul cu până la ~0,002 mm (543 → 542,99907; măsurat), deci acolo toleranța e 0,003 mm;
  - rulat în CI, la fiecare push, într-un job separat al nivelului rapid (`oracol-export2d`): în felia 2, după unitarele ei,
    instalarea Ghostscript ducea felia la limita de 10 minute.
- **Testele unitare**: numărul de cubice (minim, sub toleranță, R0,01 … R2440), arcul cu bulge (capetele exacte, partea după
  semn, sensul orar), drumurile (cercul din (cx + r, cy), închiderea), PDF-ul (ASCII, offseturile xref, startxref, /Length,
  straturile, pagina, scara), EPS-ul (cutiile, căile, culorile), cutia lărgită de o formă ieșită din foaie.
- **e2e (Edge)**: din panou, PDF-ul (straturile, pagina 300 × 200 mm) și EPS-ul (cutia), cu nota și starea.
- **Mutațiile**: în jurnalul feliei (`docs/etape/etapa-03.md`, 9.2↑).

## Limitele

- Cercurile și arcele din PDF / EPS sunt cubice (formatele n-au altceva), sub 0,001 mm; în DXF și SVG rămân exacte.
- EPS-ul n-are straturi; Illustrator / Corel le refac din culori, la nevoie.
- Proba în programele owner-ului (Corel, Illustrator, LightBurn / RDWorks) e a lui, la placa etapei.

## Respinse

- **`pdf-lib`** (s2): prea mare pentru plafonul total, de neinstalat acum; PDF-ul nostru are ~50 de linii.
- **Cercul din 4 cubice** (ca mulți exportatori): 0,027 % din rază, adică 0,0135 mm la R50, peste toleranța proiectului.
- **Polilinii fine în loc de cubice**: sute de segmente pentru un cerc, exact ce `BRIEF.md` §16.2 respinge.

## Se redeschide dacă

- un program al owner-ului citește greșit straturile PDF sau EPS-ul;
- e nevoie de text ca text sau de mai multe foi într-un singur PDF;
- **gruparea în EPS** (27.10, testul owner-ului în Illustrator: vectorii ies vectori, dar căile de același rol, deci de aceeași
  culoare, ajung unite într-un Compound Path, câte unul pe rol, într-un grup): owner-ul o vrea lucrată mai târziu, probabil
  odată cu nesting-ul („deocamdata este ok”); atunci, gruparea pe piesă / formă și, eventual, straturile.
