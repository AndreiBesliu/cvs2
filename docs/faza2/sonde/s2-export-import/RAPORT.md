# Sonda s2: export și import cu vectori reali

**Data:** 07.10.2026. **Faza 2, tranșa 1.** Cod de probă, aruncabil. Nu e cod de produs.

**Marcaje:**
- **[măsurat]** = am rulat și am văzut cifra;
- **[citit]** = documentație sau cod-sursă, cu link;
- **[dedus]** = raționament, nerulat.

**Termeni folosiți des:**
- **Entitate** = un obiect dintr-un fișier CAD: linie, arc, cerc, elipsă, curbă.
- **Bézier** = curba folosită de Illustrator, Corel și Inkscape, cu 4 puncte de control.
- **DXF** = formatul de schimb al AutoCAD. Versiunile citite aici:
  - **R12** (din 1992): doar linii, arce, cercuri și polilinii;
  - **R2007** (cod intern AC1021): are și elipsă și SPLINE, iar textul e UTF-8.
- **SPLINE / NURBS** = curba generală din CAD. Un lanț de Bézier se scrie exact ca SPLINE.
- **Bulge** = felul în care o polilinie DXF ține un arc între două vârfuri: tangenta unui sfert din unghiul arcului.
- **Oracol** = un al doilea program, care nu are cod comun cu al nostru, și recitește fișierul.

---

## 1. Întrebarea

Owner-ul cere în `BRIEF.md` §16.2: desenul lucrează cu vectori reali și îi exportă ca vectori reali. Sonda trebuia să
decidă, cu probe:
- **Exportul:** în ce versiune de DXF scriem (R12 sau R2000+)? O curbă Bézier iese ca SPLINE sau ca polilinie cu
  arce? Cum ies SVG, PDF și EPS? Cum ajung straturile și scara în mm?
- **Importul:** se poate citi exact DXF R12–R2018 (inclusiv NURBS raționale, blocuri, $INSUNITS), SVG (transformări,
  unități, arce), PDF pe toate paginile, AI și EPS?
- **Textul:** ce înseamnă „text de 20 mm” și iese exact?
- **Bibliotecile:** care sunt bune și ce licență au?
- **Proba:** cum dovedim toate astea fără să ne credem pe cuvânt?

## 2. Pe scurt

1. **Exportul cu entități reale merge și e dovedit de cititori independenți: 108 din 108 verificări [măsurat].**
   - Cercul iese CIRCLE cu R50 exact.
   - Dreptunghiul rotunjit, rotit 30°, iese ca o singură polilinie cu 4 arce. Aria e 19 914,159265 mm², exact cât pe
     hârtie.
   - Elipsa iese ELLIPSE, iar curba S iese SPLINE cu punctele de control exacte.
   - Litera N din „CNC 20 mm” are **20,000000 mm** în DXF și SVG.
2. **DXF în două variante.**
   - **„Exact” (R2007), implicit.** Cercurile, arcele, elipsele și curbele rămân ce sunt.
   - **„Compatibil” (R12).** Are doar linii și arce. Elipsele și curbele devin arce sub o toleranță declarată:
     abaterea măsurată e cel mult **0,000965 mm** la toleranța de 0,001 mm.
   - Prețul variantei R12, pe desenul de referință: **866 de arce în loc de 248 de segmente Bézier**, iar fișierul are
     82 KB în loc de 44 KB [măsurat].
3. **PDF și EPS n-au arc.** Cercul Ø100 devine 7 curbe Bézier, cu abaterea de **0,00047 mm** [măsurat].
   - PDF-ul păstrează straturile, ca straturi PDF (OCG).
   - EPS-ul a fost citit de Ghostscript, un interpretor PostScript real, doar pentru test.
4. **Importul a trecut 65 din 65 de verificări [măsurat].** Cazurile grele:
   - cercul NURBS rațional iese **un cerc exact**;
   - blocul scalat neuniform face din cerc **o elipsă**, nu un cerc;
   - arcul cu extrudarea (0,0,−1) e oglindit corect;
   - DXF-ul în țoli iese ×25,4;
   - SVG-ul cu viewBox, unități, transformări și skew iese corect;
   - PDF-ul cu 3 pagini și transformări e citit pe toate paginile.
5. **Bibliotecile.**
   - **`dxf-parser` aruncă ponderile NURBS:** cercul R25 ar ieși greșit cu **1,52 mm** [măsurat]. Îl respingem.
   - Folosim `dxf` (MIT) pentru citire, `@tarikjabiri/dxf` (MIT) pentru scrierea R2007, `pdf-lib` (MIT) pentru PDF,
     `pdfjs-dist` (Apache-2.0) pentru citirea PDF și `svgpath` + `opentype.js` (MIT).
   - Plus un scriitor R12 propriu, de ~80 de linii.
6. **Oracolul și-a făcut treaba.** A prins trei defecte reale în codul sondei: sensul arcelor în SVG, un steguleț
   care venea ca text din `svgpath` și arcele SVG de 180°, prost condiționate. A greșit el însuși o dată
   (svgelements, pe skew), iar arbitrul a fost formula pe hârtie.
   - Patru otrăviri puse intenționat au înroșit 6, 13, 11 și 4 verificări [măsurat].

## 3. Candidații

| Bibliotecă | Licența | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| Scriitor DXF R12 propriu (`write-dxf-r12.mjs`) | — | LINE, ARC, CIRCLE, POLYLINE cu bulge | ezdxf: 0 erori. Elipsa: abatere 0,000774 mm, curba S 0,000667 mm, glifele 0,000965 mm față de conturul din font | **Păstrat** pentru „DXF compatibil” |
| `@tarikjabiri/dxf` 2.9.0 | MIT | scrie DXF R2007 complet (tabele, obiecte, handle-uri) | ezdxf: 0 erori, 0 reparații. CIRCLE, ELLIPSE, SPLINE și LWPOLYLINE sunt exacte. Defect: la SPLINE scrie codul de grup 42 de două ori (al doilea trebuia să fie 44) [citit + măsurat]; ezdxf nu se plânge | **Ales** pentru „DXF exact”, cu versiunea fixată și un test pe codurile de grup. Dacă cedează în AutoCAD, îl bifurcăm (licența MIT o permite) |
| `dxf-writer` 1.18.4 | MIT | tot R2007 | instalat, neprobat în detaliu (timp) | Neales, n-aduce nimic în plus |
| `dxf-parser` 1.1.2 | MIT | citește DXF în JSON | **pierde ponderile SPLINE** (codul 41): cercul NURBS R25 ar ieși cu 1,5165 mm abatere [măsurat] | **Respins** |
| `dxf` 5.3.1 | MIT (dependențe: lodash, vecks, commander, tot MIT) | citește DXF în JSON | păstrează ponderile, extrudarea, blocurile și $INSUNITS [măsurat] | **Ales** pentru parsare. Semantica e a noastră: unități, OCS, blocuri, NURBS → Bézier |
| `svgpath` 2.6.0 | MIT | parsează căile SVG și le aplică transformări, cu arcele recalculate exact | exact. **Capcană:** după o oglindire, stegulețul de sens al arcului devine text, `'0'`, care în JS contează ca „adevărat” [citit, `lib/svgpath.js:108-110`, și măsurat: toate cercurile ieșeau concave] | **Ales**, cu `Number()` pe steguleț |
| `svg-pathdata` 9.0.0 | MIT | alternativă la `svgpath` | neprobat (timp) | Rezervă |
| `@xmldom/xmldom` 0.9.12 | MIT | DOMParser în Node | merge | Necesar doar dacă SVG-ul se citește într-un worker (worker-ul n-are DOMParser) [dedus] |
| `pdf-lib` 1.17.1 | MIT | scrie PDF; prin API-ul de nivel jos, și straturi OCG | punctele de control exacte la 6,8e-6 mm; straturile DECUPARE/GRAVARE văzute de PyMuPDF [măsurat] | **Ales** pentru PDF |
| `jspdf` 4.2.1 | MIT (dependențe opționale: dompurify MPL-2.0 sau Apache-2.0, html2canvas, canvg) | scrie PDF | coordonate la fel de exacte în versiunea asta [măsurat]; straturile nu le-am făcut aici. Ediția întâi a avut cu el diacriticele stricate | **Neales** pentru export vectorial |
| `pdfjs-dist` 6.4.299 | Apache-2.0 | citește PDF și AI compatibil PDF | toate paginile; transformările urmărite; **coordonatele vin ca Float32**: abatere max **8,7e-5 mm** pe placa de 2440 mm și 3,9e-6 mm față de PyMuPDF [măsurat] | **Ales** pentru import PDF/AI |
| `opentype.js` 2.0.0 | MIT | contururile literelor din fontul TTF/OTF | exact față de fontTools. **Capcană:** nu emite „închide calea” la glife; conturul se închide geometric [măsurat] | **Ales** |
| Liberation Sans (din `pdfjs-dist`) | OFL-1.1 | font de test | — | Bun de livrat ca font, dar nu vândut separat [citit] |
| EPS scris de noi (`write-pdf-eps.mjs`) | — | EPS cu moveto/lineto/curveto, fără procedurile Illustrator | Ghostscript îl citește; cercul are abaterea 0,00048 mm [măsurat] | **Fezabil** ca export |
| **Doar pentru test, nu se livrează:** ezdxf 1.4.4 (MIT), svgelements 1.9.6 (MIT), fontTools 4.66 (MIT), reportlab 5.0 (BSD), PyMuPDF 1.28 (AGPL-3.0), `@jspawn/ghostscript-wasm` 0.0.2 (AGPL-3.0) | | oracolul | svgelements **greșește** arcele sub skew: caseta pare transpusă [măsurat] | Oracole. AGPL e acceptabil numai pentru că nu ajung în aplicație |

## 4. Măsurători

### Metoda

1. **Modelul.** JS-ul construiește desenul din 4 tipuri de segmente: linie, arc de cerc, arc de elipsă și Bézier cubic.
   - Transformările sunt exacte: arcul rămâne arc la rotire și scalare uniformă și devine arc de elipsă la scalare
     neuniformă.
2. **Exportul.** Scriitorii produc DXF R12, DXF R2007, SVG, PDF (`pdf-lib` și `jspdf`) și EPS.
3. **Oracolul de export.** Programe din Python, fără cod comun cu JS-ul, recitesc fișierele:
   - **ezdxf**, cu „recover” și „audit”, adică verificarea structurii DXF;
   - **svgelements** pentru SVG;
   - **PyMuPDF** pentru PDF;
   - **Ghostscript** pentru EPS: EPS → PDF, apoi PyMuPDF.

   Valorile se compară cu cele scrise de mână în `oracle/paper.py`, din formule:
   - aria dreptunghiului rotunjit = 200·100 − (4 − π)·10²;
   - caseta lui rotită 30°;
   - punctul B(0,3) = (205; 75,12) al curbei S, cu y = 60 ± 10√3;
   - caseta elipsei.

   Literele se compară cu conturul citit de **fontTools** din același fișier `.ttf`, nu cu `opentype.js`.
4. **Intrările pentru import** sunt făcute de alte programe:
   - **ezdxf** scrie trei DXF: R2018 în mm, R2000 în țoli și R12. Conțin un cerc NURBS rațional, blocuri imbricate cu
     scalare neuniformă, rotire și oglindire, un arc cu extrudarea (0,0,−1), o polilinie veche cu bulge și o
     SPLINE cu noduri simple;
   - **reportlab** scrie un PDF cu 3 pagini și transformări;
   - SVG-urile sunt scrise de mână, cu valorile pe hârtie lângă ele (`oracle/gen_inputs.py`).

   Cititorii JS produc modelul. Python îl compară cu valorile pe hartie, cu ezdxf (pentru B-spline) și cu PyMuPDF
   (pentru PDF).
5. **Drumul dus-întors:** propriile exporturi sunt recitite de cititorii noștri și comparate tot cu hârtia.
6. **Corpusul** sparge coincidențele. Are:
   - un cerc R0,01 și unul R600, pe o placă de 2440 × 1220;
   - arce de 30°, 45°, 60°, 90°, 120° în sens orar și 359°;
   - un pătrat cu gaură;
   - cercuri tangente, linii suprapuse și o linie la 0,001 mm de un cerc;
   - un arc oglindit;
   - un cerc scalat (1,5; 1) și rotit, care trebuie să devină elipsă.

### Rezultate [măsurat]

**Exportul: 108/108 verificări.** Abaterile maxime:

| Ce | DXF R2007 | DXF R12 | SVG | PDF | EPS (prin Ghostscript) |
|---|---|---|---|---|---|
| Cerc Ø100 | CIRCLE R50, exact | CIRCLE R50, exact | `circle` R50, exact | 7 Bézier, 0,00047 mm | 7 Bézier, 0,00048 mm |
| Dreptunghi R10 rotit 30° | 1 LWPOLYLINE, 4 bulge = tan 22,5°; aria 19 914,159265 | 1 POLYLINE, la fel | 4 linii + 4 arce A; centrele colțurilor exacte la 1e-6 | 4 linii + 8 Bézier | la fel |
| Elipsă 120 × 60, rotită 20° | ELLIPSE, exact | 112 arce, 0,000774 mm | 4 arce A, centrul la 2e-7 | 7 Bézier, 0,00054 mm | 0,00053 mm |
| Curba S | SPLINE grad 3, exactă | 64 de arce, 0,000667 mm | o comandă C, exactă | 1 Bézier, 6,8e-6 mm | 2,2e-4 mm (rotunjirea Ghostscript) |
| Litera N | **20,000000 mm** | 20,000000 | 20,000000 | 20,000006 | 20,000028 |
| Toate glifele, față de fontTools | caseta identică la 1e-6 | abatere 0,000965 mm | identică | 0,000002 mm | 0,0002 mm |
| Straturi | DECUPARE + GRAVARE, nimic pe „0” | la fel | grupuri-strat Inkscape | OCG | nu există în EPS |

Mai mult, din corpus:
- toate cercurile (R0,01 … R600), cele 7 arce (cu sensul și capetele corecte, inclusiv cel oglindit) și liniile
  suprapuse ies exact, în ambele DXF;
- aria pătratului cu gaură e 7 172,566612;
- cercul scalat neuniform iese **ELLIPSE 75 × 50 la 30°** în R2007 și 112 arce cu abaterea de 0,0009 mm în R12.

**Costul variantei R12** (desenul de referință; R2007 exact are 248 de segmente Bézier și 44 KB):

| Toleranța R12 | Arce din curbe | Vârfuri | Mărimea |
|---|---:|---:|---:|
| 0,001 mm | 866 | 918 | 82 KB |
| 0,005 mm | 556 | 608 | 54 KB |
| 0,01 mm | 504 | 556 | 50 KB |
| 0,05 mm | 456 | 508 | 46 KB |

**Câte Bézier cere un cerc în PDF/EPS:**

| Raza | La 0,001 mm | La 0,01 mm |
|---|---:|---:|
| R10 | 5 | 4 |
| R50 | 7 | 5 |
| R600 | 10 | 7 |
| R1220 | 11 | 8 |

Cu 4 sferturi clasice, cum scriu majoritatea programelor, R1220 ar avea **0,33 mm** abatere [dedus din eroarea
relativă 2,7e-4 a sfertului].

**Importul: 65/65 verificări.**

| Caz | Rezultat |
|---|---|
| Cerc NURBS rațional R25, grad 2, cu ponderi √2/2 | **un cerc exact**: 4 conice recunoscute ca arce, apoi unite |
| SPLINE cu noduri simple (6 puncte de control) | 3 Bézier, abatere **5,7e-12 mm** față de evaluarea ezdxf |
| SPLINE-Bézier | cubica exactă; B(0,3) = (45; 215,12) |
| Bloc ×2, rotit 30° / ×(2;1) / oglindit / imbricat / cu punct de bază | R20 / **elipsă 20 × 10 la 30°** / R10 / R5 la (400; 310) / R3 la (500; 300), toate exacte |
| ARC cu extrudarea (0,0,−1) | oglindit corect: centrul (−50; 100), capetele (−60; 100) și (−50; 110) |
| $INSUNITS = 1 (țoli) | linia de 1″ = 25,4 mm; cercul R0,5″ = 12,7 mm |
| DXF R12 fără unități | presupus mm **și avertizat** |
| Strat cu diacritice („GRAVURĂ”, R2018) | păstrat |
| TEXT în DXF | raportat ca sărit, nu sărit pe tăcute |
| SVG cu viewBox 2000 pe 200 mm, în țoli și în px | scara corectă (×0,1; ×0,254; ×25,4/96) |
| SVG cu rotate, scale(2,1) imbricat, ellipse rotită, matrix oglindit, `c`/`s` relative | toate exacte; cercul scalat devine elipsă |
| SVG cu skewX(30) pe cerc | o elipsă; caseta și un punct = formula pe hârtie (svgelements greșește aici) |
| PDF cu 3 pagini, `cm` rotit 30° | toate paginile; colțurile corecte la 1e-4 mm |
| Dus-întors R2007 / R12 / SVG / PDF | cercul revine cerc, elipsa revine elipsă, curba S revine o Bézier, N = 20 mm |

**Otrăvurile** au verificat că oracolul vede defectele:

| Otrava | Verificări roșii |
|---|---:|
| Raza × 1,0001 | 6 |
| „20 mm” = corpul em (defectul vechi) | 13 |
| Totul pe stratul „0” (defectul vechi) | 11 |
| R12 la 0,01 mm în loc de 0,001 | 4 |

**Textul** [măsurat + citit]:
- Liberation Sans are unitsPerEm 2048 și capHeight 1409, cifră care se potrivește cu conturul literei H.
- Pentru „20 mm = înălțimea majusculei”, corpul em e 20 · 2048 / 1409 = **29,0703 mm**.
- Defectul vechi („20 mm” = em) ar da aici litere de **13,76 mm**.
- Literele rotunde depășesc puțin linia: C are 20,58 mm. Așa se desenează orice font, nu e o eroare.

**Fișierul vechi:** am refăcut forma scrisă de exportorul vechi (AC1009 cu LWPOLYLINE și $INSUNITS).
- ezdxf îl **respinge** cu o eroare de structură: „missing AcDbPolyline subclass” [măsurat].
- LWPOLYLINE nu există în R12, iar $INSUNITS apare abia în R2000 [citit, ezdxf `sections/headervars.py`].

### Zgomotul

Toate cifrele de geometrie sunt deterministe: aceleași la fiecare rulare, deci fără mediană. Duratele sunt doar
orientative, pe mașina împărțită cu alți 9 agenți:
- exportul desenului de referință în toate formatele: 60–110 ms;
- importul celor 12 fișiere: ~110 ms;
- oracolul: ~40 s.

## 5. Ce schimbă în arhitectură

1. **Un singur model geometric, adică un IR** (reprezentarea internă comună). Toate ușile îl folosesc: desen, import,
   export, CAM.
   - Tipurile: linie, arc de cerc, arc de elipsă, Bézier cubic. Pătraticele se ridică exact la cubice.
   - Transformarea e exactă, prin descompunerea matricei: arcul rămâne arc sub similitudine și devine arc de elipsă
     altfel.
   - Un cerc e un arc de 360° și se scrie CIRCLE.
   - Arcele consecutive de pe același cerc sau aceeași elipsă se unesc la import.
2. **Exportul DXF are două preseturi.**
   - **„DXF exact” (R2007), implicit:**
     - CIRCLE, ARC, ELLIPSE;
     - LWPOLYLINE cu bulge pentru conturi din linii și arce;
     - SPLINE pentru conturi cu curbe: grad 3, noduri prinse, multiplicitate 3 la îmbinări, deci lanțul exact de
       Bézier;
     - un contur = o entitate, fără steguleț „closed”;
     - $INSUNITS = 4 și $MEASUREMENT = 1.
   - **„DXF compatibil” (R12):**
     - doar LINE, ARC, CIRCLE și POLYLINE cu bulge;
     - curbele devin biarce, sub o toleranță afișată în dialog (implicit 0,001 mm);
     - fără unități, fiindcă R12 nu le are [citit].
   - **Straturile = rolurile.** Nimic nu se scrie pe stratul „0”.
   - Ce preset e implicit pentru ArtCAM decide testul owner-ului (pachetul de mai jos).
3. **SVG.**
   - 1 unitate = 1 mm (width/height în mm + viewBox).
   - Y se întoarce în coordonate, nu printr-un transform pe rădăcină.
   - Straturile sunt grupuri-strat Inkscape.
   - Cercul e `circle`.
   - **Nicio comandă A peste 90°.** La 180°, centrul se recalculează dintr-o rădăcină aproape zero, iar rotunjirea la
     1e-6 l-a mutat cu 0,0016 mm [măsurat].
4. **PDF** prin `pdf-lib`, cu straturi OCG. Arcele devin Bézier, cu numărul ales după toleranță, nu fix 4. **EPS**
   are scriitor propriu, cu Bézier și fără straturi.
   - **AI nu e format de export.** Illustrator deschide PDF, SVG și EPS.
5. **Importul are câte o ușă pe format, toate spre același IR.**
   - **DXF:** pachetul `dxf`, plus semantica noastră:
     - unitățile; R12 fără unități înseamnă mm și un avertisment;
     - OCS, adică sistemul de coordonate al entității: extrudarea −Z oglindește;
     - blocurile imbricate;
     - NURBS → Bézier prin inserare de noduri, iar conica rațională → arc exact când e arc de cerc;
     - avertismente pentru ce se sare.
   - **SVG:** DOMParser (sau xmldom într-un worker) și `svgpath`.
   - **PDF și AI compatibil PDF:** `pdf.js`, toate paginile, câte un strat pe pagină.
     - Căile de decupaj și cele nepictate nu devin forme.
     - Precizia Float32 se declară: sub 1e-4 mm pe placa de 2440 mm.
6. **EPS la import nu intră în v1.** Cere un interpretor PostScript. Ghostscript e AGPL sau licență comercială
   Artifex, deci nu se poate livra în aplicația închisă [citit].
   - Recomand ca aplicația să spună „salvează ca PDF sau SVG”.
   - Owner-ul poate decide altfel; de exemplu, cumpărarea licenței.
7. **Textul:** „înălțimea textului” = înălțimea majusculei. Corpul em se deduce din ea.
   - capHeight se ia din font și trebuie să se potrivească cu conturul lui H. Altfel aplicația refuză sau întreabă.
   - Proba se face pe litera N, care e dreaptă sus și jos.
8. **Poarta de CI** (verificarea automată la fiecare commit) rulează oracolul Python pe corpus.
   - Uneltele sunt ezdxf, svgelements, PyMuPDF, fontTools și Ghostscript-WASM, doar în jobul de test.
   - Patru otrăvuri arată că poarta vede defectele.
   - Pachetul pentru owner se deschide la placa etapei, cum cere `BRIEF.md` §16.2.4.
9. **Biarcele și conversia arc → Bézier țin de nucleul geometric**, cu toleranța ca parametru. Le folosesc și
   G-code-ul (G2/G3), și exportul R12, și PDF-ul.

## 6. Riscuri și ce a rămas neprobat

- **Programele owner-ului n-au rulat aici.** Pe mașina asta nu există ArtCAM, Aspire/VCarve, AutoCAD, Illustrator,
  CorelDRAW sau Inkscape. Singurul lor oracol e pachetul `pachet-owner/`. Întrebările deschise:
  - Citește ArtCAM SPLINE din R2007? Pentru ArtCAM n-am găsit documentație publică, produsul e retras [dedus].
  - Unește Vectric arcele din R12 într-un vector închis?
  - Illustrator folosește, după versiunea 25.1, biblioteca Autodesk, care e strictă [citit, forumul Adobe].
  - CorelDRAW transformă SPLINE în curbe doar peste R12 [citit, forumul Corel].
- **AutoCAD e mai strict decât ezdxf.** Fișierul R2007 a trecut doar de ezdxf audit.
- **Inkscape, citit în cod:**
  - SPLINE e citită doar cubică sau pătratică, **fără ponderi**;
  - unitățile vin din $MEASUREMENT, nu din $INSUNITS;
  - oficial cere R13 sau mai nou [citit, `dxf_input.py`].

  Forma noastră de SPLINE trece prin algoritmul lui fără inserări, dar n-am rulat Inkscape.
- **Ce n-am implementat sau probat la DXF:**
  - SPLINE periodice (închise, cum le scrie AutoCAD) și cele doar cu puncte de trecere;
  - entitățile 3D, HATCH, TEXT, MTEXT, DIMENSION;
  - INSERT cu rânduri și coloane;
  - DXF binar;
  - straturi cu diacritice în R12 (pagina de cod);
  - fișiere mari (performanța nu e măsurată).
- **Ce n-am probat la SVG:** `use`, `text`, stiluri CSS, `clipPath`, `svg` imbricat, procente și preserveAspectRatio
  neuniform (tratat, dar netestat).
- **Ce n-am probat la PDF și AI:**
  - textul din PDF nu se convertește;
  - un fișier AI real (nu pot genera unul fără Illustrator);
  - AI-ul vechi, PostScript (până la v8), nu e suportat.
- **Textul:** am probat un singur font, TrueType. N-am probat fonturi OTF/CFF, fonturi fără OS/2 capHeight sau
  fonturi single-line.
- **Biarcele:** eroarea e măsurată în ambele sensuri, dar pe curbe netede. Vârfurile ascuțite (cuspizi) și curbele
  foarte strânse sunt netestate.
- **Ce n-a intrat în sonda asta:** offset, boolean și editarea de noduri. Ele țin de nucleul geometric (sonda s1).
- **`@tarikjabiri/dxf` e întreținut de un singur om.** Plasa: versiune fixată, test pe codurile de grup, bifurcare
  dacă e nevoie.

## 7. Cum se reproduce

```
cd C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s2-export-import
npm run masoara
```

- Durează ~50 s.
- Afișează EXPORT 108/108, IMPORT 65/65, abaterile, tabelul R12, cubicele pe cerc, pierderea Float32 și duratele.
- Ieșirea e nenulă la orice verificare roșie.

**Refacerea din `cod/`:**
1. `npm ci`.
2. `python -m venv .venv`.
3. `.venv/Scripts/pip install -r requirements-test.txt`.
4. `cd testonly && npm ci`.

**Otrăvurile:** `POISON=raza|em|strat0|toleranta node src/export-all.mjs`, apoi
`.venv/Scripts/python oracle/check_export.py`.

**Pachetul pentru owner:** `pachet-owner/`, cu 5 fișiere și lista `CITESTE.md`.

**Surse citite:**
- [Inkscape `dxf_input.py`](https://gitlab.com/inkscape/extensions/-/blob/master/dxf_input.py) și
  [`dxf_input.inx`](https://gitlab.com/inkscape/extensions/-/blob/master/dxf_input.inx);
- [CorelDRAW: DWG/DXF](https://product.corel.com/help/CorelDRAW/Documentation-Windows/CorelDRAW-en/CorelDRAW-AutoCAD-Drawing-Database-DWG-and-AutoCAD-Drawing-Interchange-Format-DXF.html);
- [Vectric: tipuri de fișiere](https://docs.vectric.com/docs/V12.5/VCarvePro/ENU/Help/form/file-types) și
  [importul de vectori](https://docs.vectric.com/docs/V10.0/Aspire/ENU/Help/form/import-vectors);
- [Adobe: DXF/DWG după 25.1](https://community.adobe.com/t5/illustrator-discussions/any-illustrator-v25-0-1-later-won-t-open-cad-drawings-dwg-dxf-getting-error-2067-while-opening/td-p/11584761);
- [Corel, forum: SPLINE în R12](https://community.coreldraw.com/talk/coreldraw_community/f/community-site-general-questions/65007/can-coreldraw-convert-splines-to-arcs-in-preparation-to-export-as-dxf-for-laser-cutting-xyz-format);
- [WoodWeb: curbe din CAD spre CNC](https://woodweb.com/knowledge_base/Exporting_CADDrawn_Curves_to_CNC_Software.html);
- [ezdxf `headervars.py`](https://github.com/mozman/ezdxf/blob/master/src/ezdxf/sections/headervars.py);
- [svgpath](https://github.com/fontello/svgpath/blob/master/lib/svgpath.js);
- [SVG F.6.5](https://www.w3.org/TR/SVG11/implnote.html#ArcConversionEndpointToCenter);
- Piegl și Tiller, *The NURBS Book*, algoritmul A5.6 (descompunerea în Bézier).
