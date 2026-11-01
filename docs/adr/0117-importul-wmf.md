# ADR 0117: Importul WMF, cu cititor propriu

**Starea:** acceptat pe 01.11.2026, la felia 26.A↑ (adusă din etapa 26), după decizia owner-ului din 07.10 („WMF propriu”),
cu implicitele din „Întrebările pentru owner” (le aplic dacă nu spune altfel).
**Completează:** T18 (ADR 0018: câte o ușă pe format, spre același model), ușile SVG (ADR 0035–0037), DXF (ADR 0101), PDF
(ADR 0104) și EPS (ADR 0115). **Schimbă:** eticheta butonului („Importă SVG / DXF / PDF / AI / EPS / WMF…”), formatul după
nume și după antet (`formatImport`, `formatDupaAntet`: familia metafișierelor Windows) și refuzul de tip.

**Problema.** Din rândul de prag „Import 2D” mai rămăseseră WMF-ul și mesajul DWG. WMF-ul e metafișierul Windows pe 16 biți
(1990). În el vin clipartul vechi și exporturile din CorelDRAW, Office și AutoCAD (`WMFOUT`), iar ArtCAM îl citește ca
vectori. Sonda s12 a găsit două lucruri:
- biblioteca permisivă SheetJS `wmf` cade pe antetul placeable, pe care îl are aproape orice fișier de pe disc;
- libwmf și libUEMF sunt LGPL / GPL.

Coordonatele WMF sunt întregi pe 16 biți. Curbele Bézier lipsesc din format, deci un cerc desenat liber ajunge un poligon.
Elipsa, arcul, chord-ul, pie-ul și dreptunghiul rotunjit sunt însă înregistrări proprii, exacte.

## Decizia

1. **Ușa** (`src/io/formatImport.ts`):
   - `.wmf`, `.apm` și tipurile MIME ale metafișierului sunt formatul `wmf`;
   - un fișier fără extensie cunoscută își primește ușa după antet: cheia placeable (D7 CD C6 9A) sau antetul standard (tipul
     1 sau 2, 9 cuvinte);
   - `.emf` și antetul EMF (`EMR_HEADER` cu „ EMF”) ajung tot aici și sunt refuzate cu motivul lor (`emf`: EMF-ul a ieșit din
     prag, iar ArtCAM citește ca vectori doar WMF-ul);
   - fereastra de fișiere primește `.wmf`.
2. **Cititorul e propriu** (`src/io/wmf.ts`), scris din specificația publică [MS-WMF]. Citește antetul placeable (opțional) și
   cel standard, apoi înregistrările până la `META_EOF`. O înregistrare ruptă e refuzată cu poziția ei (`wmf`): mărimea sub
   3 cuvinte, o înregistrare care trece de fișier, parametri prea puțini, un număr de puncte care nu se potrivește cu
   mărimea, un cadru placeable gol sau `inch` = 0.
3. **Ce se desenează:**
   - **liniile:** `Polyline` (deschisă) și `MoveTo` / `LineTo`. Lanțul de `LineTo` din poziția curentă e o singură cale
     deschisă, până la alt `MoveTo` sau alt desen;
   - **contururile închise:** `Polygon`, `PolyPolygon` (o formă cu toate poligoanele ei, sub aceeași regulă de umplere),
     `Rectangle`, `RoundRect` (elipsa colțului cât (w, h), cel mult cât dreptunghiul), `Ellipse`, `Chord` și `Pie`;
   - **arcul** (`Arc`, deschis) merge de la raza prin punctul de start la raza prin cel de sfârșit. Sensul e al GDI-ului,
     măsurat pe toate cele patru combinații de axe:
     - trigonometric, cum se vede pe dispozitiv, și cu axa Y întoarsă de mapare, și cu ambele axe întoarse;
     - orar doar când maparea oglindește axa X singură.

     Capetele pe aceeași rază dau elipsa întreagă (la `Pie` fără raza dusă și întoarsă, la `Chord` fără coardă, ca la
     GDI). `Chord` închide arcul cu o coardă, `Pie` cu cele două raze;
   - colțurile inversate ale unui dreptunghi se ordonează. Un dreptunghi rotunjit cu o dimensiune a colțului nulă e un
     dreptunghi simplu (ca la GDI);
   - **cercul** (razele egale în mm) e din arce exacte (bulge). Elipsa și arcul ei se scriu în cubice sub
     `TOLERANTA_IMPORT`, la fel arcul peste latura documentului (arcul plat, ca la ușa SVG).
4. **Transformarea e a GDI-ului:** punctul logic L (int16) ajunge pe dispozitiv în D = (L − WO) · VE / WE + VO.
   - **Ce o schimbă:** fereastra (`SetWindowOrg` / `SetWindowExt`), vizorul (`SetViewportOrg` / `SetViewportExt`), mutările
     (`OffsetWindowOrg` / `OffsetViewportOrg`) și scările (`ScaleWindowExt` / `ScaleViewportExt`).
   - **Modurile de mapare:** `MM_TEXT` (1 : 1), cele metrice (`LOMETRIC`, `HIMETRIC`, `LOENGLISH`, `HIENGLISH`, `TWIPS`: unitatea
     fizică, cu Y în sus), `ANISOTROPIC` și `ISOTROPIC` (vizorul se strânge pe axa cu scara mai mare, ca ambele axe să aibă
     aceeași scară).
   - Extinderile se schimbă doar în `ISOTROPIC` și `ANISOTROPIC`, iar cele nule se ignoră, ca la GDI.
   - **Starea salvată:** `SaveDC` / `RestoreDC` (relativ și absolut) țin maparea, penița, pensula, regula de umplere și
     poziția curentă (verificat în GDI).
5. **Unitățile și locul desenului:**
   - **cu antetul placeable (Aldus),** cadrul lui e o pagină. Playerul pune fereastra pe cadru și vizorul pe mărimea lui
     fizică, de (dreapta − stânga) / inch țoli. O unitate a dispozitivului e 25,4 / inch mm, exact. Desenul stă pe foaie unde
     e în cadru: colțul stânga-jos al cadrului e colțul foii, ca la PDF;
   - **fără antet,** fișierul nu-și spune mărimea. Unitatea se alege în dialog: implicit 1/96 țol (px, ca LibreOffice), sau
     1/1440 țol (twip), 0,01 mm, 0,1 mm, mm. Vizorul pornește cât fereastra pusă de fișier înaintea primului desen (o unitate
     logică a ei = o unitate aleasă). Fișierul n-are cadru, deci desenul vine în colțul foii, ca un SVG fără mărime. Dacă tot
     desenul e într-un mod metric, unitatea e a modului: declarată, fără alegere;
   - **axa Y:** dispozitivul are Y în jos, foaia în sus, deci se întoarce (un desen cu Y în sus prin mapare iese drept).
6. **Umplerea și obiectele:**
   - `SetPolyFillMode`: `ALTERNATE` înseamnă par-impar, `WINDING` înseamnă nonzero, normalizat ca la SVG (ADR 0036). Regula
     contează doar pentru o formă umplută;
   - **tabelul obiectelor e cel din GDI:** penițele, pensulele (și cele cu model), fonturile, paletele și regiunile iau
     locul cel mai mic liber. `SelectObject` și `DeleteObject` lucrează pe el;
   - o formă cu penița nulă (`PS_NULL`) și pensula nulă (`BS_NULL`) nu se vede, deci se sare, numărată (`nepictate`). Tot așa
     o linie cu penița nulă. Grosimea peniței nu contează.
7. **Ce se sare, numărat:**
   - textul (`TextOut`, `ExtTextOut`);
   - imaginile și operațiile raster (`BitBlt`, `StretchBlt`, `DIBBitBlt`, `DIBStretchBlt`, `StretchDIB`, `SetDIBToDev`,
     `PatBlt`);
   - alte desene: regiunile pictate, `FloodFill`, `SetPixel`;
   - decupajele (`IntersectClipRect`, `ExcludeClipRect`, `SelectClipRegion`, o regiune selectată), neaplicate, ca la PDF;
   - înregistrările necunoscute.

   Restul înregistrărilor de stare (culorile, ROP-ul, alinierea textului, paletele, escape-urile) nu schimbă căile.
8. **Calea finală trece prin regulile comune ușilor** (`src/io/caleImport.ts`):
   - o polilinie sau un lanț de linii care se întoarce în start sub 0,01 mm se închide;
   - praful, căile fără arie și plafonul căii;
   - normalizarea nonzero, cu bugetul întregului fișier;
   - la sfârșit, marginile documentului și plafonul total.
9. **Raportul și dialogul:**
   - raportul are 16 coduri (`src/io/wmfCoduri.ts`), cu aceleași texte ca la PDF (și ca la SVG, pentru arce) unde înseamnă
     același lucru;
   - refuzurile sunt 3: `nu-e-wmf`, `emf` și `wmf`;
   - dialogul spune unitățile: din antet (unitățile pe țol), din modul metric, sau alese;
   - ușa e în bucata calculului importului, la cerere, lângă ușile DXF, PDF și EPS.

## Cifrele (măsurate, gzip 9)

| | Înainte (14.C↑) | După (26.A↑) |
|---|---|---|
| Pornirea (cu ușa) | 98,4 (101,9) / 110 kB | 98,4 (101,9) / 110 kB |
| Totalul JavaScript | 433,1 / 450 kB | 437,6 / 450 kB |

WMF-ul cere 4,4 kB, aproape tot la cerere:
- cititorul, în bucata calculului importului: +3,9 kB;
- dialogul: +0,3 kB;
- codurile: +0,2 kB;
- pornirea: +27 de octeți (eticheta butonului, `.wmf` în fereastra de fișiere, unitatea aleasă în contextul importului).

Prima măsurătoare a dat pornirea 98,5 (+50 de octeți). Fereastra de fișiere cere acum doar `.wmf`, fără tipurile MIME, pe
care tragerea pe pânză le recunoaște oricum. Unitatea WMF trece fără spread condițional.

## Probele

- **Corpusul independent** (`test/oracles-py/wmf_import_corpus.py`): fișiere WMF scrise înregistrare cu înregistrare
  (`struct`), cu valorile lor pe hârtie, în mm, cu Y în sus.
  - Fiecare fișier e redat de GDI, implementarea de referință a WMF-ului: `PlayMetaFile` pe imprimanta „Microsoft Print to
    PDF”, cu playerul de la §5. PDF-ul ieșit e citit cu PyMuPDF. Fiecare subcale desenată stă pe o cale de pe hârtie, iar
    fiecare cale de pe hârtie e acoperită de subcăile ei (un lanț de `LineTo` e desenat din bucăți).
  - Toleranța e 0,004 mm pe poligoane și linii: GDI lucrează pe 1/16 dintr-un pixel de 600 dpi.
  - Pe primitivele cu cadru (dreptunghiul, elipsa, arcul) toleranța e 0,09 mm, adică doi pixeli. În modul compatibil, GDI
    le pune pe pixeli întregi și le strânge cu un pixel la dreapta și jos (umplerea, și la stânga și sus). E un artefact al
    dispozitivului: pe un ecran de 96 dpi ar fi 0,26 mm.
  - GDI socotește modurile metrice din mărimea paginii în mm întregi (216 × 279 pentru 215,9 × 279,4), deci scările lui
    diferă de cele fizice cu până la 0,15 %. Oracolul desface această rotunjire pe căile desenate într-un mod metric;
    hârtia rămâne specificația.
  - Oracolul a găsit trei lucruri, trecute în cititor și pe hârtie:
    - arcul e orar cu axa X oglindită singură;
    - capătul unui arc pus exact pe o axă face un artefact al GDI-ului (o bucată minusculă desenată cu mânerele la
      ~0,4 mm), deci capetele din corpus stau în afara axelor;
    - fundalul opac al textului (implicit) e un dreptunghi plin la GDI. Ușa îl sare odată cu textul.
  - În CI (Linux, fără GDI) rulează doar regenerarea, care trebuie să dea fișierele comise.
  - Ușa citește corpusul sub 1e-6 mm. Fiecare cale citită urmează bucată cu bucată una de pe hârtie (linii; arce de cerc cu
    centrul și baleiajul lor; cubice pe elipsă, cu unghiul monoton), și invers, cu raportul exact
    (`test/unit/wmf.corpus.test.ts`).
- **Sonda locală pe clipartul Office:** 1 280 de WMF-uri reale de pe mașină, toate placeable. Nu intră în repo: sunt ale
  Microsoft. Pe 128 dintre ele (unul din zece):
  - ușa le citește pe toate, cu 5 636 de căi;
  - redate de GDI cu același player, fiecare subcale GDI de peste 0,1 mm stă pe o cale a ușii, la cel mult 0,081 mm;
  - fiecare cale a ușii de peste 0,1 mm e desenată de GDI;
  - 8 căi de 0,03–0,08 mm, din 4 fișiere, sunt sub pragul sondei (la GDI, pixeli).
- **Probele țintite** (`test/unit/wmf.test.ts`, 15), **fluxul** (`test/unit/import.wmf.test.ts`, 6) și **e2e**
  (`test/e2e/import.spec.ts`, 2 noi: fișierul cu antet și cel fără, cu unitatea aleasă, EMF-ul și fișierul rupt).
- **Mutațiile** (`test/otravuri/26.A.py`): 59 / 59.
  - 56 pe probele unitare: unitățile, axa Y, numărarea punctelor din PolyPolygon, maparea, sensul arcelor, tabelul
    obiectelor, ce se sare, ușa după antet.
  - 5 au scăpat întâi și au primit probe: formele nevăzute cu numărul punctelor greșit (două), ISOTROPIC fără extinderi,
    cadrul decalat fără fereastra fișierului (și în corpus, cu GDI), o înregistrare fără parametri de 2 cuvinte.
  - 3 de interfață, prin e2e pe portul 4177: unitatea aleasă în dialog, rândul unităților, `.wmf` în fereastra de fișiere.

## Ce am respins

- **O bibliotecă:**
  - SheetJS `wmf` cade pe antetul placeable;
  - libwmf și libUEMF sunt LGPL / GPL;
  - `rtf.js` și `emf-converter` sunt neprobate și mai mari decât cititorul.
- **EMF-ul:** scos din prag de owner (ArtCAM îl citește doar ca imagine), deci refuzat cu motiv.
- **Strângerea cu un pixel a GDI-ului:** depinde de rezoluția dispozitivului. Desenul e cel din coordonatele logice, cum îl
  citesc LibreOffice și Inkscape.
- **Regiunile ca contururi:** sunt rare în desene, iar conturul lor e de obicei desenat separat.

## Limite și neprobat

- **Ce depinde de dispozitiv la GDI:**
  - un fișier placeable care își pune singur vizorul;
  - `ISOTROPIC` fără vizorul fișierului;
  - un mod metric urmat de `ANISOTROPIC` cu doar fereastra.

  Aici, dispozitivul e cadrul (§5), iar GDI-ul probează doar cazurile în care el nu contează.
- **Ignorate:** `SetLayout` (oglindirea de la dreapta la stânga), ROP-urile care nu desenează (`R2_NOP`) și EMF-ul inclus în
  escape-urile Office.
- **Curbele aproximate de programe ca poligoane** rămân poligoane, pe vârfurile lor întregi.
- **Fișierele reale ale atelierelor:** probate pe corpus și pe clipartul Office. Rămân fișierele owner-ului.

## Întrebările pentru owner (cu implicitul în față)

1. **Unitatea unui WMF fără antet:** implicit 1/96 țol (px), ca LibreOffice, iar omul o schimbă în dialog. Alternativa: mm,
   ca la un DXF fără unități.
2. **Un WMF real din programele tale** (CorelDRAW, ArtCAM, AutoCAD), pentru proba pe fișierele atelierului.

## Se redeschide dacă

- un WMF real iese altfel decât în programul care l-a scris;
- fișierele reale aduc des cercuri scrise ca poligoane (recunoașterea arcelor pe toleranță, cu un ADR nou);
- EMF-ul intră în prag.
