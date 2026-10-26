# ADR 0088: Exportul 2D cu vectori reali: DXF R2007 și SVG

**Starea:** acceptat pe 26.10.2026. Felia 9.1↑, adusă din etapa 9 în etapa 3, fără mașină, la alegerea owner-ului („cel care
se face mai repede”, între V-carve și exportul 2D). **Rândul din prag:** „Export 2D cu vectori reali: DXF, SVG, PDF (EPS da, AI
nu)…” (`ACOPERIRE-ARTCAM-DESKPROTO.md`, A; `BRIEF.md` §16.2). **Urmează:** `PLAN.md` T18 (DXF R2007 „exact”, straturile =
rolurile, SVG în mm) și sonda s2 (`docs/faza2/sonde/s2-export-import`, 108 / 108). **Schimbă:** alegerea bibliotecii din s2
pentru scrierea DXF (`@tarikjabiri/dxf`): scriitorul e al nostru (§3).

**Problema.** Owner-ul vrea foaia desenată aici deschisă editabil în programele lui (ArtCAM, Inkscape, Illustrator / Corel,
AutoCAD / LibreCAD) și la laser, cu cercul cerc și curba curbă, la scara exactă (`BRIEF.md` §16.2). Ediția întâi scria totul
pe stratul „0” și făcea din cerc un poligon.

## Decizia

**1. Ce se exportă.** Foaia de lucru, în mm, la 1:1, cu originea în colțul ei stânga-jos (ca în aplicație). Geometria vine
exactă din model (`conturElement`, matricea lumii), fără nicio aproximare:
- forma `cerc` (sub o asemănare: ușa refuză arcele sub o matrice neuniformă) → **CIRCLE** / `<circle>`, cu centrul și raza
  din matricea lumii (scara ei, oricare ar fi rotirea sau oglindirea);
- liniile și arcele vecine ale unui contur → o **LWPOLYLINE** cu bulge / `path` cu `L` și `A`; un contur închis numai din
  ele rămâne o singură polilinie închisă;
- cubicele vecine → o **SPLINE** de grad 3 cu nodurile triple (o Bézier în lanț scrisă exact: 3k + 1 puncte de control,
  nodurile 0 ×4, 1 ×3, …, k ×4) / `C`;
- un contur amestecat iese în bucăți legate cap la cap, pornind de la o schimbare de fel (nicio bucată nu trece peste vârful
  0 al unui contur închis);
- **Cu conturul foii** (bifa, oprită implicit) adaugă dreptunghiul foii.

**2. Straturile = rolurile** (`T18`): după prima operație a piesei care taie forma (ordinea documentului): EXTERIOR,
INTERIOR, PE_LINIE, PE_O_PARTE (stânga / dreapta pe o cale deschisă), BUZUNAR, GAURIRE, FARA_OPERATIE, plus FOAIE. Numele
sunt ASCII (orice program le citește la fel), fiecare cu culoarea lui (ACI în DXF, aceeași familie în SVG); se scriu doar
straturile folosite. În SVG, un strat e un grup Inkscape (`inkscape:groupmode="layer"`).

**3. DXF R2007 (AC1021), scris de noi.** Biblioteca aleasă de s2 nu se poate adăuga acum (instalarea locală n-are npm), iar
formatul e mic: secțiunile HEADER ($ACADVER, $INSUNITS = 4, $EXTMIN / $EXTMAX, $HANDSEED), CLASSES, TABLES (VPORT, LTYPE,
LAYER, STYLE, VIEW, UCS, APPID, DIMSTYLE, BLOCK_RECORD, cu handle-urile și proprietarii lor), BLOCKS (*Model_Space,
*Paper_Space), ENTITIES și OBJECTS (dicționarul rădăcină, ACAD_GROUP, ACAD_LAYOUT cu cele două layout-uri). Numerele se
scriu cu toate cifrele (cel mai scurt text care se citește înapoi identic), fără exponent. ezdxf îl citește cu **0 erori și
0 reparații** (`recover` și `audit`).

**4. SVG** în mm (`width` / `height` în mm, `viewBox` de aceeași mărime), cu axa Y întoarsă (y′ = H − y). Sensul arcului: după
întoarcere, un arc trigonometric al foii (bulge > 0) se vede tot trigonometric, adică în sensul unghiurilor negative ale SVG,
deci `sweep` = 0; `large-arc` = 1 peste 180°. Numerele, cu 6 zecimale (1 nm).

**5. Interfața.** „Exportă vectori” în extensia barei, cu panoul ei: formatul (**DXF (R2007)** implicit, SVG), bifa conturului
foii, Exportă (descarcă `cncvs2-foaia-1.dxf` / `.svg` și spune câte entități și straturi are; pe foaia goală: „Nimic de
exportat”, fără descărcare), Închide, Esc. Scriitorii vin la primul Exportă (bucata `exportVectori`, 3,9 kB gzip): pornirea nu
crește.

## Probele

- **Oracolul independent** (`test/oracles-py/export2d.py`, ezdxf 1.4.4, fără nimic din `src/`), pe corpusul din
  `scripts/export2d-corpus.ts`, cu valorile pe hârtie: 0 erori și 0 reparații; versiunea, unitățile, straturile și culorile;
  câte entități de fiecare fel pe fiecare strat; cercurile (inclusiv R0,01, unul sub scara 2,5 rotit 45°, unul în piesa
  oglindită, unul în instanța rotită 90°); dreptunghiul 200 × 100 R10 rotit 30° (8 vârfuri din rotirea celor pe hârtie,
  bulge tan 22,5°, aria 20 000 − (4 − π)·100); dreptunghiul oglindit (aceeași arie, cu semnul întors, arcele orare); curba S
  (punctele, nodurile, punctul de la t = 0,5 evaluat de ezdxf = (350, 50)) și semicercul ei prin (475, 25); ovalul din 4
  cubice (nodurile, punctele la 1, 2, 3 și 0,5); „D”-ul amestecat; foaia. Rulat în CI, la fiecare push (felia 2 a nivelului
  rapid).
- **Motorul SVG al browserului** (Edge, alt cititor independent), pe corpus: lungimile pe hârtie (perimetrul dreptunghiului
  rotunjit, linia + semicercul, „D”-ul, dreptunghiul oglindit), mijlocul arcelor (sensul după întoarcerea Y: (475, 375) și
  (212,5; 75)), cercurile și ovalul prin cutiile lor; ± 0,05 mm (browserul aproximează arcele cu Bézier pe float).
- **Testele unitare**: rolurile, bucățile conturului (închis, cubice, amestecat, deschis, gol), vectorii corpusului, numerele
  (fără exponent, „-0”), arcele SVG pe hârtie (raza, steagurile), structura DXF (secțiunile, handle-urile unice, proprietarii
  și legăturile existente, $HANDSEED, nodurile = punctele + 4), panoul (numele, entitățile, straturile, foaia goală).
- **e2e (Edge)**: panoul pe foaia goală (nimic, nicio descărcare), DXF implicit (polilinia închisă a dreptunghiului și cercul,
  cu straturile), SVG cu conturul foii, măsurat de browser, Esc.
- **Mutațiile**: în jurnalul feliei (`docs/etape/etapa-03.md`, 9.1↑).

## Limitele

- **PDF și EPS** (rândul din prag) vin într-o felie următoare: PDF-ul cu straturi (OCG) cere scriitorul lui (s2: `pdf-lib`, prea
  mare pentru plafonul total, deci tot unul al nostru), iar ambele scriu cercul din cubice (formatul n-are arc).
- **DXF R12 „compatibil”** (doar linii și arce, s2: scriitorul de ~80 de linii) intră doar dacă un program al owner-ului nu
  deschide R2007 (`PLAN.md` T18).
- O singură foaie (cea de lucru); textul ca text n-există încă în document.
- Proba în programele owner-ului (ArtCAM, Inkscape, Corel, LibreCAD) e a lui, la placa etapei; aici, ezdxf și browserul.

## Respinse

- **Biblioteca DXF din s2** (`@tarikjabiri/dxf`, MIT): nu se poate instala acum, iar s2 i-a găsit și un defect (codul 42 scris
  de două ori la SPLINE); scriitorul nostru are ~200 de linii, cu oracolul independent pe el.
- **Cubicele ca polilinii cu arce** (biarce) și în R2007: aproximare unde formatul are curba exactă.
- **Un strat pe operație** (după id): numele ar fi opace în alt program; rolul e ce caută omul la laser sau în CAM.

## Se redeschide dacă

- un program al owner-ului refuză fișierul sau îl deschide altfel (atunci R12 compatibil, sau reparația scriitorului);
- owner-ul cere straturile după operație, nu după rol, sau toate foile într-un fișier.
