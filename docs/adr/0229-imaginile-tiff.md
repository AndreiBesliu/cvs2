# ADR 0229 — Imaginile TIFF

**Starea:** acceptat pe 17.11.2026, la „vreau să mergi înainte și testez la final” (owner-ul, în sesiunea liniei
trasării), cu recomandările de mai jos ca implicite, și implementat (felia 25.6↑, 17–18.11; mai jos); răspunde, cu
varianta b, întrebării despre TIFF din ADR 0220 („un cititor TIFF propriu …, într-o felie a lui”). Fără mașină, în linia
trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`).
**Completează:** ADR 0220 (trasarea din imagine: ușa imaginilor, workerul, scara din DPI).

## Problema

Ușa imaginilor refuză TIFF-ul („salvează imaginea ca PNG”): browserele nu-l decodează. Dar TIFF e formatul scanerelor
(mai ales la alb-negru, unde G4 e aproape regula), al faxurilor, al programelor de CAD, GIS și tipografie; ArtCAM /
Carveco, Vectric, LightBurn și Inkscape îl deschid. Un desen scanat ajunge des ca TIFF.

## Ce am aflat (cercetarea din 17.11)

- **Formatul:** TIFF 6.0 (Adobe, 1992): un antet (`II*\0` sau `MM\0*`), directoare de etichete (IFD) înlănțuite, câte
  unul pe pagină; imaginea în benzi (strips) sau plăci (tiles), comprimate fiecare. Compresiile din fișierele reale:
  fără (1), CCITT „Modified Huffman” (2), CCITT T.4 / G3 (3), CCITT T.6 / G4 (4), LZW (5), JPEG (6 vechi, 7 nou), Deflate
  (8 și 32946), PackBits (32773); rar: JPEG 2000, LZMA, ZSTD, WebP.
- **Ce scriu codoarele Windows** (GDI+ și WIC, încercate pe 17.11): fără, LZW, CCITT RLE / G3 / G4, Zip (Deflate, doar
  WIC); scanerele alb-negru dau G4, cele color LZW sau JPEG; GIS-ul și tipografia, plăci, Deflate, predictorul 2.
- **Browserele nu decodează TIFF** (`createImageBitmap` îl refuză), deci un cititor propriu, pur, în workerul trasării.
  Deflate-ul îl face platforma (`DecompressionStream`, în browser și în Node), restul e cod propriu (LZW, PackBits, CCITT).
  O bibliotecă MIT (UTIF.js) ar fi permisă, dar cere o descărcare; cititorul propriu ține ~1 000 de rânduri.

## Decizia (cu recomandările, la „mergi înainte”)

1. **Cititorul TIFF** (`src/trasare/tiff.ts`, pur, în workerul trasării; CCITT în `src/trasare/ccitt.ts`, refolosibil):
   antetul clasic (II și MM); benzile și plăcile; ordinea planară 1 și 2; compresiile 1, 2, 3 (1D și 2D), 4, 5, 8, 32946
   și 32773; predictorul orizontal (2); interpretările alb-e-zero (0), negru-e-zero (1), RGB (2), paleta (3) și CMYK (5,
   convertit simplu); 1, 2, 4, 8 și 16 biți pe eșantion; alfa (ExtraSamples, asociat sau nu); FillOrder 2; orientarea
   (eticheta 274).
2. **Refuzate, cu numele lor** (fereastra spune ce compresie sau ce fel are fișierul, apoi „salvează-l ca PNG”): JPEG în
   TIFF (6, 7), JPEG 2000, LZMA, ZSTD, WebP, BigTIFF, eșantioanele în virgulă mobilă, YCbCr fără JPEG, CIELab.
3. **Mărimea:** decodarea reduce din mers, rând cu rând (media blocurilor, ca previzualizarea foii), sub plafonul de azi
   (16 Mpx): o scanare A4 la 600 dpi (35 Mpx la 1 bit) nu se desface întreagă în RGBA (140 MB). Raportul spune reducerea,
   ca la celelalte imagini.
4. **Scara:** DPI-ul din XResolution / ResolutionUnit (țol sau cm), citit de ușă (`dpiImagine`), ca la PNG, JPEG și BMP.
5. **Paginile** (un fax, o scanare pe mai multe foi): fereastra spune câte sunt și o alege, ca la PDF (implicit 1).
6. **Probele:** fișiere scrise de codoarele Windows (WIC și GDI+), cu pixelii lor citiți tot de WIC (un decodor
   independent), plus fișiere scrise de mână în probe (MM, plăci, planar, predictorul, 2 / 4 / 16 biți, alb-e-zero, CMYK,
   alfa, orientarea) cu valorile socotite pe hârtie; codurile CCITT, verificate pe tabelele din T.4.
7. **Mărimea pachetului:** cititorul stă în bucata workerului trasării (nu la pornire): ~+6–9 kB din total.

## Implementarea (17–18.11)

**Ce s-a schimbat față de propunere:**

1. **Previzualizarea:** fereastra desenează vectorii peste imaginea decodată de browser din octeți; un TIFF nu are una,
   deci vectorii stăteau pe alb. Workerul trimite acum pagina decodată, redusă sub 1 Mpx (`poza`, în răspuns și în
   raportul imaginii), folosită și la Colțurile foii pozate oblic.
2. **Reducerea** e pe blocuri întregi de k × k (k = ⌈√(pixeli / plafon)⌉), nu la exact 16 Mpx ca la `createImageBitmap`:
   o scanare A4 la 600 dpi (4960 × 7016) iese 2480 × 3508. Media blocurilor face din alb-negru trepte de gri, pe care
   pragul le taie la jumătate.
3. **Miniaturile** (NewSubfileType cu bitul 0, sau SubfileType 2) nu sunt pagini; o pagină peste ultima dă ultima
   pagină. Un lanț de IFD-uri stricat după prima pagină se oprește acolo (paginile citite rămân).
4. **Date CCITT stricate:** un rând căruia îi lipsesc datele la capăt rămâne alb; un cod necunoscut sau o deplasare în
   afara rândului refuză imaginea („stricat”, cu bitul la care s-a oprit). Un P cu b1 la capătul referinței închide
   rândul (trei santinele).
5. **LZW-ul vechi** (dinainte de TIFF 6.0, cu codurile de la bitul cel mai puțin semnificativ) e refuzat cu numele lui.

**Măsurat** [17–18.11, Node 26 și Edge fără fereastră]:
- 16 fișiere scrise de codoarele Windows (WIC și GDI+: G4, G3, PackBits, LZW pe gri, RGB și paletă de 4 biți, Zip pe
  RGBA și pe gri de 16 biți, necomprimat, două pagini G4, un desen lat de 2600 px pentru trecerile lungi): exact pixelii
  citiți de WIC (la 16 biți, cel mult 1); WIC și GDI+ scriu „Rle” ca PackBits (32773), nu ca CCITT (2);
- fișiere scrise de mână, cu valorile pe hârtie: MM pe 8 și 16 biți, 2 și 4 biți, alb-e-zero, FillOrder 2 (și pe G4),
  plăci de 16 × 16 tăiate la margine, ordinea planară 2, predictorul pe 8 / 16 biți și pe RGB, CMYK, alfa asociat și
  neasociat, paleta, cele opt orientări, PackBits și LZW din exemplele specificației, CCITT MH / T.4 1D / T.4 2D / T.6
  pe codurile din T.4, o miniatură, refuzurile;
- timpul, pe o scanare A4 la 600 dpi (35 Mpx, alb-negru, scrisă de WIC): G4 0,7–1,1 s, LZW 1,0–1,1 s, redusă la 2480 ×
  3508; pe 4000 × 3000 la 1 bit, necomprimat, ~1 s;
- probele: 11 ale cititorului (`test/unit/trasare.tiff.test.ts`), una a ușii (și una schimbată: TIFF-ul nu mai e refuzat
  la semnătură), una e2e (două pagini, alegerea paginii, scanarea sub vectori, Importă, JPEG refuzat); pe arborele unit
  cu `main` (`ddfc3c00`): suita unitară 9 502 (9 494 trecute, 8 sărite, 0 căzute), e2e-urile trasării, importului și
  tutorialul 52 / 52 (gruparea DXF a căzut o dată din timp, cât era mașina încărcată, și a trecut singură);
- otrăvurile (`test/otravuri/25.6.py`, alese de autor): 41 / 41, fiecare pe proba ei (30 unitare ale cititorului, 8 ale
  ușii, 4 prin e2e); la prima rulare (`9a6d6b56`), 36 / 38: C10 (fără a treia santinelă a referinței CCITT) a cerut o
  probă pe date stricate, iar T02 (LZW, KwKwK) era echivalent, deci ramura a ieșit (`8dfa3190`); U07, U08 și W04 păzesc
  previzualizarea, adăugată după;
- mărimea: totalul 722,1 / 800 kB pe arborele unit (+5,4 kB, în bucata workerului), pornirea 106,6 / 115 (cu ușa 110,6),
  neschimbate.

## Ce am respins

- **O bibliotecă** (UTIF.js, libtiff compilat): o descărcare, pentru un format cu specificația publică și scurtă.
- **Decodarea prin pânza browserului:** browserele nu știu TIFF.
- **Toate paginile, ca piese separate:** rar cerut; pagina aleasă ajunge, iar o altă pagină e încă un import.

## Ce impune

- Ușa (`src/io/imagine.ts`): TIFF-ul nu mai e refuzat la semnătură; DPI-ul și numărul paginilor, din etichete.
- Calculul (`src/jobs/calculTrasare.ts`): un TIFF se decodează cu cititorul propriu, nu cu `createImageBitmap`; cererea
  are pagina; răspunsul, câte pagini sunt.
- Fereastra importului: alegerea paginii și la imagini; textele refuzurilor noi, în ambele limbi; manualul.

**Se redeschide dacă:** un TIFF real al owner-ului nu se citește (JPEG în TIFF devine atunci felia următoare); decodarea
unei scanări A4 la 600 dpi trece de 10 s.

## Întrebările (luate cu recomandarea, la „mergi înainte”)

Opțiunile de mai sus vin toate; întrebările sunt doar despre ce se exclude. Owner-ul le poate întoarce la încercare.

1. **Paginile:** **a)** pagina aleasă în fereastră, implicit 1 (luat); b) doar prima.
2. **JPEG în TIFF:** **a)** refuzat acum, cu numele lui, și felie a lui după un fișier real (luat); b) acum, fără un codor
   independent pentru probe.
