# ADR 0104: Importul PDF și AI, și spațiul fișierelor

**Starea:** acceptat pe 29.10.2026, la felia 9.4↑ (adusă din etapa 9), după ADR 0101 (importul DXF). **Completează:** T18
(ADR 0018: câte o ușă pe format, spre același model), ușa SVG (ADR 0035, ADR 0036, ADR 0037 §11) și ușa DXF (ADR 0101).
**Schimbă:** dialogul importului (ADR 0101 §9: pagina, refuzurile noi, textul „Importă SVG / DXF / PDF / AI…”) și locul
exportului vectorilor (ADR 0088: din extensia barei în grupul fișierelor din bara de sus).

**Problema.** Rândul de prag „Import 2D” (v1, decis 07.10: DXF, SVG, PDF și AI compatibil PDF) avea SVG-ul și DXF-ul. PDF-ul
e formatul în care vin desenele din programele de grafică (Illustrator, Corel, Inkscape) și planșele din CAD, iar un AI de la
Illustrator 9 încolo e tot un PDF. Pe 28.10, owner-ul a cerut și ca „toate butoanele care tin de import si export sa fie
comasate intr-un spatiu dedicat si unificat”.

## Decizia

1. **Cititorul obiectelor e propriu** (`src/io/pdfObiecte.ts`): lexerul (numerele cu semnele repetate citite ca unul, ca în
   Adobe Reader; numele cu `#xx`; șirurile cu escape-uri și hex), tabelul xref clasic și ca flux (/W, /Index, predictorul
   PNG), lanțul /Prev, /XRefStm al fișierelor hibride și fluxurile de obiecte (/N, /First). pdf.js (din sonda s2) are
   ~300 kB și aduce randarea, de care importul n-are nevoie.
2. **Reconstruirea:** un xref care nu se poate citi (pozițiile mutate, tabelul rupt) se reface din fiecare `N G obj` din
   fișier, cel din urmă câștigând, cu trailerul din ultimul `trailer` (sau din xref-ul ca flux), și se spune în raport
   (`xref-reconstruit`). Un fișier din care nici așa nu iese catalogul e refuzat (`pdf`).
3. **Filtrele:** Flate prin `DecompressionStream` (zlib, apoi deflate brut; un flux trunchiat dă ce a ieșit, numărat în
   `fluxuri-stricate`), predictorii PNG și TIFF, ASCIIHex, ASCII85, LZW (cu EarlyChange) și RunLength. Dezarhivarea are un
   plafon: 128 MB într-un flux, 512 MB cu totul (`plafon`, detaliul `decodare`), ca o bombă de compresie să nu blocheze
   fila. Filtrele imaginilor (DCT, JPX, JBIG2, CCITT) nu se decodează: imaginile se sar.
4. **Harta paginii:** pagina afișată, adică CropBox-ul intersectat cu MediaBox-ul (moștenite din arborele paginilor), cu
   UserUnit și cu /Rotate (în sensul acelor: 90 duce (x, y) în (y, L − x)). Căile ies în mm, cu Y în sus, față de colțul
   stânga-jos al paginii afișate, deci desenul ajunge pe foaie unde era pe pagină (piesa importului cu `pagina`, ca la un SVG
   cu pagină). Arborele paginilor se parcurge cu paza ciclurilor, până la 10 000 de pagini.
5. **Conținutul:** fluxul de conținut (și un tablou de fluxuri) e interpretat cu starea grafică (q / Q, cm), construcția căilor
   (m, l, c, v, y, h, re) și pictarea (S, s, f, F, f*, B, B*, b, b*, n). Liniile și cubicele trec exact prin matrice; PDF-ul
   n-are arce, deci un cerc vine ca cubicele programului care l-a scris. Umplerea `nonzero` se normalizează ca la SVG (ADR 0036),
   par-impar și conturul tras rămân cum sunt; închiderea formelor umplute și a capetelor apropiate, praful, bucla și calea fără
   arie sunt regulile comune ușilor (`incheieSubcalea`, `normalizeazaForma`, `preaDeparte` în `src/io/caleImport.ts`).
   - **se sar, numărate:** textul (BT … ET), imaginile (Do pe o imagine; BI … ID … EI: fără filtru, lungimea din mărime, cu
     filtru, până la un `EI` între albe), umbririle (sh) și căile nepictate (`n` fără decupaj);
   - **decupajele** (W, W*) nu se aplică: ce decupează se importă întreg, iar calea decupajului intră doar dacă e și pictată;
   - **Form XObject-urile** se desfac cu matricea lor, cel mult 16 niveluri; unul care se cheamă pe sine se oprește acolo
     (`forme-adanci`);
   - **straturile** (Optional Content): configurația implicită (/D: BaseState, ON, OFF), marcajele `/OC … BDC … EMC` și /OC
     pe XObject-uri, inclusiv OCMD-urile (/OCGs cu /P AnyOn, AllOn, AnyOff, AllOff). Ce e pe un strat oprit se sare
     (`ascunse`); numele stratului vizibil devine numele formei, ca la DXF.
6. **Raportul** are 17 coduri (`src/io/pdfCoduri.ts`), în ambele limbi: căile deschise importate, cele fără arie, prea mari
   sau sub 0,01 mm, textul, imaginile, umbririle, decupajele, căile nepictate, formele de pe straturi oprite, închiderile, cele
   două numărători nonzero, formele prea adânci, fluxurile stricate și reconstruirea.
7. **Dialogul** e același, cu ușa PDF în bucata calculului importului (la cerere):
   - formatul după nume (`.pdf`, `.ai`), apoi după tipul MIME (`application/pdf`, `application/illustrator`); fereastra de
     fișiere le cere și pe ele, iar butonul devine „Importă SVG / DXF / PDF / AI…”;
   - **pagina:** se citește prima; la mai multe, lista **Pagina** alege alta, și după un refuz: o copertă doar cu text n-are
     nimic de importat, iar refuzul ei spune câte pagini are fișierul. Cât se recitește, ce era pe ecran rămâne (și focusul
     pe listă), iar „Importă” așteaptă;
   - straturile căilor importate se numesc în dialog (primele 8, fiecare tăiat la 60 de caractere; piesa păstrează numele
     întreg, până la plafonul numelor);
   - **refuzurile noi:** `nu-e-pdf`, `ai-vechi` (PostScript: un AI de dinainte de Illustrator 9, sau un EPS), `criptat`
     (parolă sau doar restricțiile proprietarului: conținutul e criptat), `pdf`, `pagina`; o pagină goală a unui `.ai` spune
     de ce (Illustrator fără „Create PDF Compatible File” scrie pe pagină doar o notă);
   - o eroare a cititorului (un defect, în jurnal) nu mai spune „nu e un SVG” la un DXF sau PDF.
8. **Spațiul fișierelor:** importul, „Exportă vectori” (până acum în extensia barei) și „Exportă G-code” stau împreună, în
   grupul `fisier` de la capătul barei de sus, departe de uneltele de desen. Exportul vectorilor e un loc nou al aranjamentului
   (controlul `vectori`), umplut de modulul editării, ca uneltele (ADR 0052), cu iconița și sfatul vecinilor; panoul lui se
   deschide sub buton. Bara urcă peste extensia lipită dedesubt cât un sfat sau panoul ei coboară peste ea (sfaturile barei
   de sus stăteau sub extensie de la ADR 0053), iar sfatul unui buton cu panoul deschis nu se mai arată.

## Cifrele (măsurate, gzip 9)

| | Înainte (6.R↑) | După (9.4↑) |
|---|---|---|
| Pornirea (cu ușa) | 97,1 (100,6) / 110 kB | 97,2 (100,7) / 110 kB |
| Totalul JavaScript | 341,0 / 400 kB | 349,7 / 400 kB |

## Probele

- **Corpusul independent** (`test/oracles-py/pdf_import_corpus.py`, PyMuPDF 1.26.3 / MuPDF): șase PDF-uri, zece seturi:
  - formele (dreptunghiul, polilinia, triunghiul închis cu `h`, linia de sub un decupaj, translația, cubicele, arii pe
    umpleri nonzero și par-impar), cu xref ca flux și fluxuri de obiecte;
  - straturile (pagina 1 cu un strat oprit, scrisă de mână cu `/OC … BDC`), Form XObject-ul cu matricea lui, pagina decupată
    și rotită;
  - rotirile (180°, 270°, UserUnit 2);
  - fișierul cu o actualizare incrementală, cel cu xref-ul mutat cu 8 octeți (reconstruit) și cel criptat AES-256 cu parola
    de deschidere goală (doar restricțiile proprietarului: refuzat).
  Valorile pe hârtie sunt verificate în generator față de ce citește MuPDF din fișier (casetele paginilor citite din
  fișierul scris, nu din API: PyMuPDF le rotunjește). Ușa le citește sub 1e-6 mm, cu numerele căilor, straturile și raportul
  exact (restul codurilor, 0) (`test/unit/pdf.corpus.test.ts`).
- **Probele țintite** (`test/unit/pdf.obiecte.test.ts`, 12): lexerul, filtrele cu vectorii lor (ASCII85 din Python, LZW din
  specificație), predictorii pe hârtie, Flate trunchiat și bomba sub plafon, xref ca flux cu predictor și flux de obiecte
  scrise de mână, ciclurile, OCMD-urile, imaginea inline, refuzurile, tabloul de fluxuri cu unul stricat, /Length greșit,
  decupajul pictat.
- **Fluxul** (`test/unit/import.pdf.test.ts`, 5): formatul, previzualizarea pe pagini, straturile ca nume, desenul unde era
  pe pagină, refuzurile cu formatul și cu paginile, acțiunea cu pagina din context.
- **E2e** (`test/e2e/import.spec.ts`, Edge): PDF-ul cu trei pagini (mărimea, straturile, raportul, pagina aleasă, locul și
  numele salvate în proiect); refuzurile (protejat, PostScript, AI fără conținut PDF), coperta goală cu pagina a doua și
  focusul păstrat, un AI care e PDF; numele lung al unui strat (tăiat în dialog, întreg în piesă); grupul fișierelor la
  1280 px (ordinea, bara întreagă, panoul peste extensie și cu mausul plecat, sfatul).
- **Mutațiile:** 28 / 28 (17 pe probele unitare, 11 pe e2e, controlul verde înainte și după); una a trecut întâi: decupajul pictat (`W … S`) nenumărat, fiindcă probele aveau doar `W n`: probă nouă.

## Ce am respins

- **pdf.js:** ~300 kB, randarea și un worker, pentru ce citește importul (obiectele și operatorii căilor).
- **Toate paginile deodată** (câte o piesă pe pagină): un PDF de planșe are adesea coperta, cotele și legenda pe pagini
  proprii; omul alege pagina.
- **Decupajele aplicate:** ar cere intersecția exactă a fiecărei forme cu calea decupajului; în desenele de tăiat, decupajul
  e de obicei o mască a paginii.
- **Decriptarea fișierelor doar cu restricțiile proprietarului:** se poate (parola goală), dar ar ocoli restricția pusă de
  autor; refuzul spune ce e de făcut.

## Limite și neprobat

- **EPS și AI de dinainte de Illustrator 9** (PostScript): refuzate cu motiv; cititorul propriu limitat din decizia din
  07.10 rămâne de făcut, ca WMF-ul și mesajul DWG.
- **Textul, imaginile, umbririle** nu se importă: textul se transformă în contururi în programul care l-a scris.
- **Cercul din PDF e o cale din cubice** (PDF-ul n-are arce), deci găurirea (ADR 0087) nu-l ia, ca pe cel importat din SVG
  sau DXF.
- **PDF-urile reale ale atelierelor:** probate pe corpusul MuPDF și pe fișierele scrise de mână. Rămân fișierele owner-ului.

## Se redeschide dacă

- un PDF real iese altfel decât în Acrobat sau în programul care l-a scris;
- fișierele cu restricții ale proprietarului sunt dese în ateliere (decriptarea cu parola goală, cu un ADR nou);
- decupajele trebuie aplicate (o formă tăiată de mască).
