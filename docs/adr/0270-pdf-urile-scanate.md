# ADR 0270 — PDF-urile scanate

**Starea:** acceptat pe 18.11.2026, la „vreau să mergi înainte și testez la final” (owner-ul, în sesiunea liniei
trasării), cu recomandările de mai jos ca implicite, și implementat în aceeași zi. Felia 25.7↑, fără mașină, în linia
trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`). Numărul: intervalul liniei (0220–0229) s-a terminat;
sesiunea principală a dat trasării 0270–0279 (CLAUDE.md, 18.11).
**Completează:** ADR 0104 (ușa PDF), ADR 0220 (trasarea din imagine), ADR 0229 (TIFF: cititorul și decodorul CCITT).

## Problema

Un desen scanat ajunge des ca PDF: scanerele de birou și aplicațiile de telefon scriu PDF-uri cu o imagine pe pagină
(JPEG la color și gri, CCITT G4 la alb-negru). Ușa PDF citește doar vectorii paginii și sare imaginile, deci o pagină
scanată e refuzată ca goală („nimic de importat”); omul trebuie să scoată imaginea cu alt program.

## Ce am aflat (cercetarea din 18.11)

- **Cum scriu PDF-ul scanerele:** o imagine XObject pe pagină, cât pagina, cu `/DCTDecode` (JPEG) sau `/CCITTFaxDecode`
  (`/K -1`, G4); mai rar `/FlateDecode` (eșantioane brute, uneori cu predictorul PNG), `/JBIG2Decode` (alb-negru, mai
  mic decât G4) sau `/JPXDecode` (JPEG 2000). Unele au și un strat de text OCR, invizibil (ușa îl sare deja).
- **Ce au deja aplicația și linia trasării:** cititorul PDF propriu (filtrele Flate, LZW, RunLength, ASCIIHex, ASCII85, cu
  predictorii), cititorul TIFF și decodorul CCITT (ADR 0229), decodarea JPEG a browserului în workerul trasării.
- **Alte programe:** Inkscape și Illustrator importă imaginea PDF-ului ca imagine, apoi o trasezi separat; ArtCAM / Vectric
  nu deschid PDF-uri scanate (doar ca imagine exportată).

## Decizia

1. **Imaginea paginii:** cea mai mare imagine XObject vizibilă de pe pagină (după aria așezată); imaginile inline (`BI … EI`,
   mici, rar în scanări) rămân sărite. Nu se decodează nimic până nu e cerută.
2. **Filtrele:** `DCTDecode` (JPEG: octeții trec ca fișier JPEG, îl decodează browserul în worker), `CCITTFaxDecode` (fluxul,
   împachetat într-un TIFF cu compresia 3 sau 4: îl citește cititorul TIFF), `FlateDecode`, `LZWDecode`, `RunLengthDecode`,
   `ASCIIHexDecode`, `ASCII85Decode` (cu predictorii; eșantioanele, într-un TIFF necomprimat). Refuzate cu numele:
   `JBIG2Decode`, `JPXDecode`.
3. **Culorile:** DeviceGray, DeviceRGB, DeviceCMYK, CalGray, CalRGB, ICCBased (după `/N`), Indexed (paleta, în RGB);
   `/ImageMask` (cerneala = desen); `/Decode [1 0]` la o singură componentă (inversată); `/SMask` ignorat (opac).
   Refuzate: Separation, DeviceN, Lab.
4. **Scara și orientarea:** imaginea e pagina (ca la orice imagine trasată); DPI-ul vine din așezarea ei pe pagină (pixelii
   pe lățimea așezată), deci desenul are mărimea de pe hârtie; orientarea din matricea așezării (cele opt cazuri; o așezare
   strâmbă ia cazul cel mai apropiat).
5. **Fereastra:** o pagină fără vectori, dar cu o imagine, se trasează singură (panoul trasării, cu alegerea paginii PDF-ului);
   o pagină cu vectori și cu o imagine arată vectorii, cu un buton „Trasează imaginea paginii” (și înapoi, „Vectorii
   paginii”).
6. **Probele:** fluxul G4 al unei fixturi WIC (ADR 0229), pus într-un PDF scris de mână: exact pixelii lui WIC; un JPEG
   scris de WIC, trecut întreg; Flate, Indexed, ImageMask, Decode și orientările, cu valorile pe hârtie; refuzurile;
   e2e: o pagină scanată G4 și una JPEG, trasate, cu Importă.

## Ce am respins

- **Toate imaginile paginii, lipite:** o scanare are una; un PDF compus (un logo și o poză) cere alegerea imaginii, mai târziu.
- **JBIG2 și JPEG 2000 acum:** două decodoare mari, rare la scanerele obișnuite; refuzul le spune numele.
- **Vectorii și imaginea laolaltă, într-un singur import:** omul alege una; cealaltă e încă un import.

## Ce impune

- Ușa PDF (`src/io/pdf.ts`): imaginile paginii numărate și așezate; extragerea celei mai mari, la cerere, ca fișier JPEG sau
  TIFF (`src/io/tiffScrie.ts`, scriitorul minim); rezultatul spune câte imagini are pagina.
- Ușa importului (`src/ui/actiuniImportCalcul.ts`): o pagină fără vectori, cu imagine, merge la trasare; alegerea „imaginea
  paginii”; DPI-ul din așezare și orientarea în cerere.
- Calculul: orientarea din cerere, aplicată după decodare; imaginea întoarsă, redusă, pentru previzualizarea ferestrei (ca
  la TIFF: fereastra nu citește PDF-ul).

**Se redeschide dacă:** un PDF scanat real al owner-ului e JBIG2 sau JPEG 2000 (atunci felia lor); o pagină are mai multe
imagini de trasat.

## Întrebările (luate cu recomandarea, la „mergi înainte”)

1. **O pagină cu vectori și cu imagine:** **a)** vectorii, cu butonul „Trasează imaginea paginii” (luat); b) întrebarea, la
   deschidere.
2. **Mai multe imagini pe pagină:** **a)** cea mai mare (luat); b) toate, lipite într-una.

## Implementarea (18.11)

- **Ușa PDF** (`src/io/pdf.ts`): interpretarea ține minte fiecare imagine XObject vizibilă, cu harta pătratului unitate în
  mm-ii paginii afișate (CTM-ul, formele, rotirea paginii); una pe un strat oprit e ascunsă și nu se numără (`/OC` se
  judecă acum și pe imagini, nu doar pe forme). `citestePdf` spune `imagini`, și în refuzurile de după interpretare.
  `imagineaPaginiiPdf` interpretează pagina din nou, ia imaginea cu aria așezată cea mai mare și o scoate ca fișier:
  - **DCT:** octeții JPEG-ului, fără segmentele APP1 Exif. Un cititor PDF nu aplică orientarea Exif (o spune așezarea),
    dar browserul ar aplica-o la decodare: o poză de telefon pusă neschimbată în PDF, cu pagina rotită după Exif (cum
    face img2pdf), s-ar fi întors de două ori.
  - **CCITT:** fluxul, într-un TIFF de o pagină (`src/io/tiffScrie.ts`, scriitorul minim): K < 0, compresia 4; K = 0,
    compresia 3 (T.4 1D; EOL-urile, opționale), sau 2 cu `EncodedByteAlign` și fără EOL; K > 0, compresia 3 cu rândurile
    2D (T4Options). Photometric 0 dacă BlackIs1 e la fel cu Decode-ul inversat, altfel 1: cerneala rămâne cerneală, la gri
    și la mască. Refuzate cu numele: G4 pe octeți, G3 2D pe octeți fără EOL, `/Columns` diferit de `/Width`.
  - **Celelalte filtre** (cu predictorii, deja desfăcuți de cititorul obiectelor): eșantioanele, într-un TIFF necomprimat
    (pe 16 biți, MM, ca în PDF). Gri și masca: Photometric 1, sau 0 cu Decode inversat; RGB 2; CMYK 5; Indexed 3, cu
    ColorMap-ul paletei (baza gri, RGB sau CMYK; după hival, negru); ICCBased după `/N`, apoi după `/Alternate`. Datele
    scurte (un flux tăiat) se completează cu hârtia; cele lungi se taie.
  - **Refuzurile:** `nesprijinit` (JBIG2Decode, JPXDecode; ColorSpace Separation, DeviceN, Lab, Pattern; DCT cu mască sau
    paletă; CCITT în altă culoare decât gri; BitsPerComponent altul decât 1, 2, 4, 8, 16), `stricat` (mărimea, paleta, un
    filtru de imagine care nu e ultimul; `decodeazaImagine` din `pdfObiecte.ts` se oprește la el), `fara-imagine`.
  - **Orientarea** (1–8, ca eticheta TIFF): cu u orizontal, rândul 0 e sus dacă d > 0 și coloana 0 la stânga dacă a > 0;
    cu u vertical, rândul 0 e la dreapta dacă c > 0 și coloana 0 sus dacă b < 0. Mărimea afișată vine din lungimile
    laturilor (întoarse la 5–8), iar DPI-ul, din pixelii lățimii afișate.
- **Calculul** (`src/jobs/calculTrasare.ts`): `orientare` în cerere, aplicată după decodare cu `orienteaza` (a cititorului
  TIFF); mărimea din fișier (`redusDin`) se întoarce și ea la 5–8, deci scara rămâne a așezării și după reducerea de peste
  16 Mpx; imaginea întoarsă, redusă, ajunge în răspuns ca `poza` (fereastra încearcă octeții PDF-ului, nu-i poate decoda și
  arată poza, ca la TIFF).
- **Ușa importului** (`src/ui/actiuniImportCalcul.ts`): `previzualizarePdf(f, pagina, { imagine, trasare, semnal })`. Cu
  imagini și fără vectori („gol”), sau cu imaginea cerută, fișierul imaginii trece prin ușa imaginilor
  (`previzualizareImagine`, cu `{ dpi, orientare }` în cerere); paginile din raport sunt ale PDF-ului; un refuz al
  cititorului TIFF devine al imaginii paginii (`pdf-imagine`, `pdf-imagine-stricata`); `vectoriPdf` spune dacă pagina
  are vectori (citiți sau refuzați, de exemplu prea departe) la care să se întoarcă.
- **Dialogul:** „Trasează imaginea paginii” (`data-buton="trasare-pdf"`) sub un rezultat PDF cu imagini, citit sau refuzat;
  „Vectorii paginii” (`vectori-pdf`) sub imaginea cerută, dacă pagina are vectori. Alegerea (`AlegeriImport.imaginePdf`)
  rămâne la recitire (o alegere a trasării, altă pagină). Scara spune „din fișier”: DPI-ul vine din PDF.
- **Mărimea:** totalul 725,6 / 800 kB (+3,5), pornirea 106,7 / 115 (+0,1), cu ușa 110,7; pe arborele unit cu `main`
  (`8425a2c1`), 729,8 / 800, pornirea 107,0 / 115, cu ușa 111,0.
- **Probele:** 10 unitare (`test/unit/import.pdf.scanat.test.ts`): fluxurile G4 și G3 ale fixturilor WIC, cu exact pixelii
  lui WIC; JPEG-ul scris de WIC (`wic-color.jpg`, din `genereaza.ps1`), trecut întreg, și cu un Exif adăugat, scos; CCITT 1D
  pe octeți și 2D, scrise de mână; Flate cu predictorul, Decode, Indexed, ImageMask, 16 biți, RGB, CMYK, ICCBased, datele
  scurte, cu valorile pe hârtie; cele opt orientări, `/Rotate`, o formă cu matricea ei, stratul oprit; ușa (pagina scanată
  trasată singură, poza rotită comparată pixel cu pixel, vectorii și imaginea, a doua pagină, vectorii prea departe,
  refuzurile); calculul cu reducere și rotire. E2e (`trasare.spec.ts`): o scanare G4, cu contururile ca în Node la 72 dpi,
  importată; una JPEG, importată; vectori și o imagine rotită, cu comutarea și o alegere a trasării între ele; JBIG2,
  refuzat cu numele.
- **Otrăvurile** (`test/otravuri/25.7.py`): 39 / 39, fiecare pe proba ei (33 unitare, 6 prin e2e). La prima rulare,
  37 / 39: P10 (G3 1D pe octeți citit ca T.4) a scăpat dintr-o coincidență a probei: pe 8 px, umplerea și codul rândului
  următor fac albul 29 (`00000010`), care umple un rând alb la fel de bine (al doilea rând are acum negru); P24 (decodarea
  obișnuită trece de un filtru de imagine) n-avea probă (un flux de conținut cu DCTDecode e acum un flux stricat, numărat).
- **Publicat** pe canalul `trasare` (<https://cncvectorstudio-test--trasare-icw58h57.web.app>, până pe 18.12), amprenta
  `283c53ff12af`; pe canal, o pagină cu imaginea așezată rotită și o linie: întâi vectorii, apoi imaginea, 160 × 240 px,
  72 px pe țol, cum stă pe pagină.
