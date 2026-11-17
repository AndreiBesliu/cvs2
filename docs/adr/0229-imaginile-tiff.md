# ADR 0229 — Imaginile TIFF

**Starea:** acceptat pe 17.11.2026, la „vreau să mergi înainte și testez la final” (owner-ul, în sesiunea liniei
trasării), cu recomandările de mai jos ca implicite; răspunde, cu varianta b, întrebării despre TIFF din ADR 0220 („un
cititor TIFF propriu …, într-o felie a lui”). Felia 25.6↑, fără mașină, în linia trasării (worktree-ul `trasare`, ramura
`wip/25.1-trasare`, cu `origin/main` adus, `6e62d40c`).
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

## Decizia

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
