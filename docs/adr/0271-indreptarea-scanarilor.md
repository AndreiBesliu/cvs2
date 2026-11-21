# ADR 0271 — Îndreptarea scanărilor

**Starea:** acceptat pe 18.11.2026, la „Da, pornește” (owner-ul, în sesiunea liniei trasării, la întrebarea „Pornesc
felia următoare, îndreptarea scanărilor (25.4↑c, ADR 0271)?”), tot sub „vreau să mergi înainte și testez la final”:
recomandările de mai jos sunt implicite, iar întrebările rămân pentru încercarea de la final. Implementat pe 18–21.11
(mai jos). Felia 25.4↑c, fără mașină, în
linia trasării (worktree-ul `trasare`, ramura `wip/25.1-trasare`); numărul, din intervalul trasării (0270–0279).
**Completează:** ADR 0224 (scanările și pozele), ADR 0225 (foaia pozată oblic, îndreptată după colțuri), ADR 0229 și ADR
0270 (TIFF-ul și PDF-urile scanate).

## Problema

O foaie pusă strâmb pe geamul scanerului, sau trasă strâmb de alimentatorul de foi, iese rotită cu 0,5–3°. Liniile
orizontale ale unui desen tehnic devin oblice. După import, omul rotește vectorii de mână și ghicește unghiul. Foaia pozată
oblic (ADR 0225) se îndreaptă după colțurile ei, dar o scanare n-are colțuri de găsit: capacul alb al scanerului nu se
deosebește de hârtie, iar un PDF scanat e deja decupat la pagină.

## Ce am aflat (cercetarea din 18.11)

- **Programele de scanare** îndreaptă după conținut:
  - **Leptonica** (BSD, folosită de Tesseract și OCRmyPDF; `pixFindSkew`) însumează pixelii fiecărui rând la fiecare unghi
    încercat. Scorul e suma pătratelor diferențelor dintre rândurile vecine (Postl, brevetul US 4 723 297, 1988). Baleiajul
    acoperă ±7° (±5° în unele ediții), cu pasul de 1°, iar o căutare binară coboară apoi până la 0,01°. Încrederea e raportul
    dintre scorul cel mai mare și cel mai mic; sub 3, pagina nu se îndreaptă. Pe o pagină la 300 dpi, redusă de 4 ori,
    unghiul iese cam la 1/20 de grad.
  - **unpaper** apropie de conținut o „linie virtuală” de la fiecare margine și o rotește pe ±5°, cu pasul de 0,1°.
  - **ImageMagick** (`-deskew 40%`) folosește transformata Radon pe imaginea cu prag. Merge bine sub ~5°.
  - **Acrobat** („Enhance scans”) și aplicațiile de scanare de pe telefon îndreaptă singure.
- **Programele CNC** (ArtCAM / Carveco, Vectric, LightBurn, Inkscape) nu îndreaptă imaginea înainte de trasare: omul o
  rotește în alt program sau rotește vectorii după aceea.
- **Prototipul** (`.tmp/proto-0271.ts`, cu generatorul `.tmp/gen-0271.ts`) a desenat pagini sintetice cu acoperirea
  calculată exact și le-a rotit cu unghiuri știute: 0, 0,15, −0,4, 1, −2,3, 5 și −9°. Paginile: un desen tehnic (chenar,
  indicator, dreptunghiuri, cercuri, cote, text), o pagină de text, un logo cu un rând de text, o schiță cu mâna liberă,
  cercuri și zgomot. Variantele: gri, alb-negru (ca un G4) și text pe hârtie gri cu zgomot. Scorul lui Postl e calculat pe
  rânduri și pe coloane (liniile verticale ale desenelor contează), pe imaginea redusă la cel mult 2 Mpx.

  | Pagina | Eroarea cea mai mare | Încrederea | Timpul (Node) |
  |---|---|---|---|
  | desen tehnic, 1654 × 2339 (A4, 200 dpi), gri / alb-negru | 0,004° / 0,003° | 5,9–8,2 | ~50 ms |
  | desen tehnic, 2480 × 3508 (A4, 300 dpi), alb-negru | 0,007° | 6,1–8,1 | ~65 ms |
  | text, 1654 × 2339, gri / alb-negru | 0,009° / 0,010° | 1,9–2,1 | ~65 ms |
  | text cu zgomot, pe hârtie gri, 1240 × 1754 | 0,016° | 1,7–1,9 | ~45 ms |
  | logo cu un rând de text | 0,050° (la 1°) | 1,4–1,5 | ~50 ms |
  | schiță, cercuri, zgomot | nesigur la toate unghiurile | 1,0–1,14 | ~45–50 ms |

  - **Găsit pe drum, grila pixelilor:** la unghiul 0, centrele pixelilor cad toate la fel între coșurile proiecției, deci
    profilul e mai ascuțit decât la orice alt unghi. Pe textul cu zgomot rotit cu 0,15° ieșea 0,004°, iar pe logo, la fel.
    Remedierea: fiecare punct e mutat cu o fracțiune de pixel, după o secvență deterministă (R2). Erorile au coborât sub
    0,016°.
  - **Încrederea:** raportul lui Leptonica (scorul maxim pe cel minim) despărțea prost o schiță (până la 2,8) de un logo
    (3,4). Desparte mult mai bine raportul dintre vârf și cel mai bun scor aflat la peste 1° de el: desenele 5,9–8,2, textul
    1,7–2,1, logoul 1,4–1,5, iar schița, cercurile și zgomotul 1,0–1,14. Pragul ales e 1,25.
  - **Timpul:** cea mai mare parte e reducerea imaginii (~35 ms pe 8,7 Mpx). Rotirea biliniară a unei pagini de 8,7 Mpx
    durează 0,2 s. Pe pagina îndreptată, unghiul găsit apoi e 0,0003°.

## Decizia

1. **Unghiul, găsit singur** (`src/trasare/rotire.ts`, pur, în workerul trasării):
   - **Cerneala:** imaginea redusă la cel mult 2 Mpx prin media blocurilor; întunecimea, cu pragul Otsu și polaritatea din
     margine (ce domină marginea e hârtia).
   - **Căutarea:** scorul lui Postl, pe rânduri și pe coloane, cu punctele mutate cu o fracțiune de pixel. Întâi un baleiaj
     grosier pe ±10° (coșuri de 4 px, cel mult 20 000 de puncte, pasul cât jumătate de coș pe latura cea mai lungă). Apoi
     unul fin în jurul celui mai bun (coșuri de un pixel, cel mult 400 000 de puncte), apoi parabola.
   - **Nesigur:** când încrederea e sub 1,25 sau maximul cade la capătul intervalului.
   - **Când:** unghiul se caută la fiecare trasare a unei imagini opace (pentru sugestie), după foaie.
2. **„Îndreaptă scanarea”** e o bifă în grupul foii, numit acum „Îndreptarea”, lângă „Îndreaptă foaia”:
   - Implicit e oprită. Raportul o sugerează când găsește un unghi de cel puțin 0,1°, cât nu sugerează deja foaia
     (întrebarea 1).
   - Bifată, folosește unghiul găsit. Câmpul „Unghiul (°)” îl arată ca indiciu și primește unul scris de om: ±45°, pozitiv
     când desenul e rotit în sens invers acelor de ceasornic; gol înseamnă găsit singur.
   - Fără unghi găsit și fără unul scris, raportul spune să-l scrii.
3. **Rotirea:**
   - **Ordinea:** după îndreptarea foii, dacă e bifată și ea (un desen strâmb pe foaia îndreptată), și înaintea zonei.
   - **Pânza** crește cât să încapă toată imaginea, cu eșantionarea biliniară (întrebarea 2). Colțurile noi iau culoarea
     marginii imaginii (mediana ei, pe fiecare canal).
   - **Cu „Ignoră ce atinge marginea”,** marginea veche se prelungește în afară: ce o atingea o atinge și pe cea nouă.
   - **Scara** nu se schimbă: un pixel rotit ține cât unul al imaginii. Peste 16 Mpx, pânza se reduce, iar scara ține cont
     de reducere.
4. **Fereastra:**
   - Previzualizarea arată imaginea îndreptată, cu vectorii ei.
   - Zona e în pixelii imaginii îndreptate; o îndreptare schimbată (bifa sau unghiul) scoate zona, ca la foaie.
   - Raportul spune unghiul folosit și de unde vine (găsit sau scris).
5. **Probele:**
   - **Fixturi independente:** pagini desenate și rotite de GDI+ (desen și text, PNG) și o pagină alb-negru rotită, scrisă
     de WIC ca G4, din `test/fixtures/trasare/rotire/genereaza.ps1`. Unghiul trebuie să iasă la cel mult 0,05°.
   - **Pagini sintetice:** cele ale prototipului, cu unghiurile pe hârtie, cu grila pixelilor și cu ±10°.
   - **Cazurile nesigure:** cercurile, schița, zgomotul, transparența.
   - **Rotirea:** pânza, fondul, marginea prelungită, reducerea.
   - **Calculul:** scara, zona, foaia și rotirea împreună, sugestia.
   - **E2e:** o scanare strâmbă, sugerată, îndreptată, cu mărimea adevărată a chenarului; unghiul scris; Importă.

## Ce am respins

- **Transformata Hough** (dreptele cele mai lungi): e mai lentă, iar pragul ei pe numărul de puncte cere reglaj pe fiecare
  fel de desen.
- **Histograma direcțiilor gradientului:** pe imaginile alb-negru (G4), o linie rotită puțin e o scară de trepte cu
  gradientul pe axe, deci unghiul ar ieși tras spre 0.
- **Îndreptarea pornită singură, fără bifă:** un desen înclinat intenționat (un logo, o semnătură) s-ar roti fără să ceri.
- **Pânza tăiată la mărimea veche:** pierde colțurile desenului.

## Ce impune

- `src/trasare/rotire.ts` (nou, pur): `gasesteUnghiul`, `rotesteImaginea`, `panzaRotita`.
- `src/jobs/calculTrasare.ts`: `CerereTrasare.rotire`, iar răspunsul primește `rotire` (unghiul găsit, cel aplicat,
  sugestia, previzualizarea).
- Ușa importului: alegerile (`AlegeriTrasare.rotire`), cererea, raportul.
- Fereastra: bifa, câmpul, raportul, previzualizarea.
- Textele (ro, en) și manualul.

**Se redeschide dacă:**
- o scanare reală a owner-ului iese cu un unghi greșit (o margine întunecată a scanerului care câștigă, un desen fără linii
  drepte);
- unghiurile de peste 10° se dovedesc dese (atunci baleiajul se lărgește).

## Întrebările (luate cu recomandarea, la „mergi înainte”)

1. **Îndreptarea scanării:**
   - **a)** oprită, cu sugestia raportului, ca la lumină și la foaie (luat);
   - b) pornită singură pe scanările TIFF și PDF, când unghiul e sigur.
2. **Colțurile pânzei rotite:**
   - **a)** pânza crește și nu se taie nimic (luat);
   - b) pânza rămâne cât imaginea, iar colțurile desenului se taie.

## Implementarea (18–21.11)

- **Nucleul** (`src/trasare/rotire.ts`, pur, în workerul trasării; din nucleul trasării ia doar pragul Otsu):
  - `gasesteUnghiul`: cerneala imaginii reduse (cel mult 2 Mpx, blocurile parcurse în ordinea memoriei). O imagine cu
    transparență, sau cu sub 64 de pixeli de cerneală, e nesigură, cu încrederea 0. Se folosesc cel mult 400 000 de
    puncte, luate la pas egal și mutate cu fracțiunea secvenței R2. Urmează baleiajul grosier: coșuri de 4 px, ~20 000 de
    puncte, pasul cât jumătate de coș pe latura cea mai lungă (între 0,05° și 0,5°). Încrederea e vârful împărțit la cel
    mai bun scor aflat la cel puțin 1° de el (pragul 1,25). Apoi baleiajul fin (coșuri de un pixel, pasul cât un sfert de
    pixel pe latura cea mai lungă, pe ±1,5 pași grosieri) și parabola.
  - `rotesteImaginea`: pânza `panzaRotita` (W cos + H sin pe H cos + W sin), redusă cu factorul k peste plafon, cu
    eșantionarea biliniară. În afara imaginii: mediana fiecărui canal pe margine, sau, cu `prelungeste`, pixelul de
    margine cel mai apropiat. Sub 0,005°, aceeași imagine.
- **Calculul** (`src/jobs/calculTrasare.ts`): după foaie, `rotirea` caută unghiul; pe o imagine cu transparență, fără
  cerere, `rotire` e null.
  - Unghiul aplicat e cel scris (tăiat la ±45°; unul care nu e număr lasă unghiul găsit) sau cel găsit.
  - Sugestia apare fără cerere, de la 0,1°, doar dacă foaia nu e sugerată. Previzualizarea e redusă sub 1 Mpx.
  - Pe pânza redusă (factorul k), pixelii fișierului pe pixel și scara foii se împart la k, deci DPI-ul și mărimea în mm
    rămân.
- **Ușa importului:** `AlegeriTrasare.rotire` (`{ indreapta, unghi }`, implicit oprită), cererea, `RaportImagine.rotire`.
  `UNGHI_SCRIS_MAXIM` (45) stă în ușă, egal cu `UNGHI_MAXIM` al nucleului (o probă le ține egale): ușa nu importă
  nucleul.
- **Fereastra:**
  - Grupul se numește „Îndreptarea” (fostul „Foaia pozată”) și primește „Îndreaptă scanarea”, cu „Unghiul (°)”: indiciul
    e unghiul găsit, minusul tipografic și virgula se citesc, ±45°.
  - Bifa și unghiul scot zona. Sub vectori stă imaginea îndreptată.
  - Raportul spune unghiul („Scanarea, îndreptată cu 1,70° (unghiul găsit singur).”), avertismentul când nu e niciun
    unghi și sugestia. Rândul „Imaginea:” spune mărimea din fișier, nu pânza rotită.
- **Mărimea:** totalul 741,6 / 800 kB pe arborele unit cu `main` `a64adf63` (acolo, 739,4: felia +2,2), pornirea 107,2 / 115 și ușa 111,2, neschimbate.
- **Probele:**
  - **16 unitare** (`trasare.rotire.test.ts` și `import.rotire.test.ts`, câte 8):
    - fixturile GDI+: desenul +1,7° și −6,5°, textul −3,2°, G4-ul −0,6°, nerotitul;
    - paginile sintetice: desenul de la 0 la ±9°, alb-negru, textul, liniile verticale singure, grila pixelilor, pagina
      inversată;
    - cazurile nesigure;
    - rotirea: discul dus unde trebuie, și pe pânza redusă; fondul, marginea prelungită;
    - calculul: chenarul cu laturile pe axe, sugestia, unghiul scris, zona, DPI-ul pe pânza redusă, marginea ștearsă,
      foaia cu scanarea, cererea din alegeri.
  - **2 e2e** (`trasare-rotire.spec.ts`), pe o scanare desenată și rotită de browser: sugestia, mărimea chenarului înainte
    și după, zona scoasă, imaginea îndreptată sub vectori, unghiul scris cu minusul tipografic, Importă; pe cercuri,
    avertismentul și unghiul scris.
  - **Pe arborele unit cu `main`:** unitare 9 668 (9 658 trecute, 8 sărite; o probă DXF cu ceas, de 11,5 s sub
    încărcare, care singură trece în 0,6 s), e2e 52 / 52 (specurile trasării și importul).
- **Otrăvurile** (`test/otravuri/25.4c.py`): 44, fiecare pe proba ei (36 unitare, 8 prin e2e). La prima rulare (`5ac7aefb`), 36 / 37 unitare: R08 (maximul la capătul baleiajului grosier, primit) a scăpat, fiindcă verificarea de la sfârșit (|u| > 10°) o acoperă; mai mult, ea respingea degeaba un unghi de sub 10° când grila grosieră trecea de 10°. Echivalentă: codul ei a fost scos (`0346cd18`). Pe codul final, 36 / 36 unitare (`0346cd18`) și 8 / 8 prin e2e (`645208c6`), deci 44 / 44.
- **Publicat** pe canalul `trasare` (<https://cncvectorstudio-test--trasare-icw58h57.web.app>), amprenta `645208c691d8`.
  Privit pe canal (în engleză): o scanare strâmbă desenată în pagină (un desen tehnic rotit cu 1,7°, pe hârtie crem) a
  primit sugestia „The scan looks turned by 1.7°”; bifată, „Scan straightened by 1.70° (angle found automatically).”,
  desenul de 260,17 × 180,82 mm (chenarul adevărat: 260,1 × 180,7), imaginea îndreptată cu laturile pe axe și colțurile
  noi în culoarea hârtiei; −2,5° scris o rotește în sensul cerut; nicio eroare în consolă.
