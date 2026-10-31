# ADR 0115: Importul EPS și AI ≤ 8, cu cititor propriu, limitat

**Starea:** acceptat pe 31.10.2026, la felia 9.5↑ (adusă din etapa 9), după ADR 0104 (importul PDF și AI ≥ 9).
**Completează:** T18 (ADR 0018: câte o ușă pe format, spre același model), ușile SVG (ADR 0035–0037), DXF (ADR 0101) și PDF
(ADR 0104), după decizia owner-ului din 07.10: „EPS și AI ≤ 8 prin cititor propriu, limitat”. **Schimbă:** ADR 0104 §7
(refuzul `ai-vechi` dispare: PostScript-ul îl citește acum ușa EPS) și eticheta butonului („Importă SVG / DXF / PDF / AI /
EPS…”).

**Problema.** Rândul de prag „Import 2D” cere EPS-ul și AI-ul de dinainte de Illustrator 9 (PostScript, nu PDF). Până acum
erau refuzate cu sfatul de a le salva ca PDF. Un interpretor PostScript întreg (Ghostscript are 27 MB în wasm și e AGPL) nu
are loc în aplicație. Desenele de tăiat din EPS și AI vechi sunt însă, de obicei, căi scrise pas cu pas.

## Decizia

1. **Ușa se alege după antet** (`formatDupaAntet`, în `src/io/formatImport.ts`). PostScript-ul (`%!`, și după un ^D, sau
   antetul binar al unui EPS DOS, C5 D0 D3 C6) merge la ușa EPS; `%PDF-` în primii 1024 de octeți merge la ușa PDF. Așa,
   un `.ai` de la Illustrator 9 încolo e citit ca PDF, iar unul mai vechi ca PostScript. Un fișier fără extensie cunoscută
   (de exemplu `.ps`) își primește tot așa ușa. `.eps`, `.epsf`, `.epsi` și tipurile MIME PostScript sunt formatul `eps`.
   Fereastra de fișiere primește `.eps` și `application/postscript`.
2. **Cititorul e limitat: un program PostScript în linie dreaptă** (`src/io/eps.ts`). Ține stiva, aritmetica, relațiile,
   dicționarele (`def`, `begin` / `end`, `<< >>`, `load`, `where`), tablourile și șirurile, procedurile definite (executate
   la chemare, cu `bind` adevărat și `//nume`), matricele (`concat`, `translate`, `scale`, `rotate`, `setmatrix`,
   `currentmatrix`, `transform` și înrudiții) și starea grafică (`gsave` / `grestore`, `save` / `restore`).
   - **Refuzate, cu numele lor:** buclele și condițiile (`if`, `ifelse`, `for`, `repeat`, `loop`, `forall`, `exit`,
     `stopped` …, codul `control`), și când le cheamă o procedură; definite, dar nechemate (prologul cairo), nu încurcă.
     Tot `control`: codul scris la rulare (`cvx exec` pe un șir).
   - **Operatorii lipsă** (`arc`, `arcn`, `stringwidth`, `clippath`, `strokepath`, `eexec`, `rand` …) și numele nedefinite:
     codul `operator`, cu numele.
   - **Un fișier greșit** (sintaxa, stiva, tipurile, lipsa punctului curent, recursivitatea): codul `ps`, cu locul.
   - **Plafoanele:** 100 de niveluri de proceduri (și de acolade), 20 de milioane de operatori executați, un milion de
     elemente pe stivă sau într-un tablou, plus plafoanele comune ale importului (16 MB, vârfurile, normalizarea).
3. **Lexicul e propriu** (`src/io/psLexic.ts`): numerele (și cu bază, `16#FF`), numele executabile, literale și imediate,
   șirurile literale (cu escape-uri), hex și ASCII85, acoladele. Comentariile se sar, în afară de cele de structură de la
   început de rând (`%%…`, `%AI…`), pe care le primește interpretorul. Secțiunile sărite (un font cu `eexec`, prologul unui
   AI) se trec rând cu rând, fără să fie citite ca jetoane.
4. **Geometria:**
   - punctele trec exact prin matricea curentă, în spațiul implicit (punctul tipografic), apoi în mm (25,4 / 72);
   - originea PostScript e colțul foii, deci desenul stă unde e în fișier, ca la DXF (piesa cu `pozitie: 'fisier'`);
   - închiderile, praful, calea fără arie și normalizarea `nonzero` sunt regulile comune ușilor (`caleImport.ts`):
     `closepath` închide, umplerea închide (`inchise-de-umplere`), conturul tras rămâne deschis, afară de golul sub
     0,01 mm sau de întoarcerea exactă în start;
   - o cale umplută și trasă (`gsave fill grestore stroke`) e o singură formă: calea întoarsă de `grestore` e recunoscută
     după identitatea ei, iar schimbată după aceea devine alta;
   - `rectfill` și `rectstroke` nu ating calea curentă;
   - decupajele (`clip`, `eoclip`, `rectclip`) nu se aplică, ca la PDF: se numără.
5. **Illustrator ≤ 8** se recunoaște după `%%Creator` (versiunea sub 9, sau 88), după `%%AI8_CreatorVersion`, sau după
   comentariile formatului AI (`%AI3_` … `%AI8_`, scrise și de alte programe).
   - Prologul (procedurile Adobe, cu condiții) și setup-ul se sar; la fel paleta, modelele, gradientele și pensulele.
   - Operatorii corpului se citesc după nume: `m`, `l` / `L`, `c` / `C`, `v` / `V`, `y` / `Y`, `h` / `H` (închide),
     `f` / `F` (umple), `s` / `S` (trage), `b` / `B` (umple și trage), `n` / `N` (nepictate).
   - Calea compusă (`*u … *U`) se pictează o dată, cu regula `XR` (par-impar sau nonzero); decupajul `q … W … Q`.
   - Straturile (`Lb … LB`, numite de `Ln`, între `%AI5_BeginLayer` și `%AI5_EndLayer`) devin numele formelor; un strat
     ascuns (primul operand al lui `Lb`, 0) se sare, numărat (`ascunse`).
   - Textul (`To … TO`, cu calea lui de încadrare), rasterul (`XI`, cu datele în comentarii) și documentele plasate
     (`%%BeginDocument`) se sar, numărate. Un operator AI pe care cititorul nu-l folosește (culorile, stilurile) se sare,
     cu operanzii lui, ca operatorii necunoscuți la PDF.
   - **Un EPS de la Illustrator 9 încolo** e refuzat cu motivul lui (`ai-nou`): desenul lui trece prin procedurile Adobe,
     cu condiții și bucle. Salvat ca AI (compatibil PDF), îl citește ușa PDF.
6. **Ce se sare, numărat, ca la PDF:**
   - textul (`show` și ceilalți, `charpath`): după el, punctul curent nu se mai cunoaște (`moveto` îl reface);
   - imaginile (`image`, `imagemask`, `colorimage`, nivelurile 1 și 2), cu datele lor din fișier: hex (`readhexstring`),
     binare (`readstring`, sau fișierul fără filtru), ASCII85 până la `~>`, ASCIIHex până la `>`. Alte date din fișier
     (binare comprimate) nu se pot sări: refuz (`imagine`);
   - umbririle (`shfill`) și fonturile incluse (`%%BeginResource: font`, `%%BeginFont`).
   Desenul se încheie la `%%PageTrailer`, `%%Trailer`, `%%EOF` sau la primul `showpage`. Un document inclus într-un EPS
   (`%%BeginDocument`) se citește, iar sfârșitul și `showpage` din el nu încheie desenul.
7. **Raportul și dialogul.**
   - Raportul are 15 coduri (`src/io/epsCoduri.ts`), aceleași înțelesuri și texte ca la PDF, plus `sarit-incluse`.
   - Refuzurile sunt 6: `nu-e-ps`, `ai-nou`, `control`, `operator`, `imagine`, `ps`; cele cu operator îl numesc în
     fereastră (tăiat la 40 de caractere).
   - Ușa e în bucata calculului importului (la cerere), lângă ușile PDF și DXF. Straturile AI se numesc în dialog, ca la
     PDF.

## Cifrele (măsurate, gzip 9)

| | Înainte (5.8↑) | După (9.5↑) |
|---|---|---|
| Pornirea (cu ușa) | 97,6 (101,1) / 110 kB | 97,6 (101,1) / 110 kB |
| Totalul JavaScript | 414,8 / 450 kB | 425,0 / 450 kB |

## Probele

- **Corpusul independent** (`test/oracles-py/eps_import_corpus.py`): șapte fișiere scrise operator cu operator.
  - formele EPS (procedurile simple ale unui prolog, relativele, umplerile, decupajul, transformările, înclinarea, textul,
    imaginea cu datele ei, calea nepictată, „umplut și tras”, `rectstroke`, scara în mm);
  - prologul cairo, cu proceduri condiționale nechemate și Y în jos;
  - EPS-ul binar DOS;
  - AI 8, cu straturi, unul ascuns, toate perechile de operatori, două căi compuse (nonzero și par-impar), textul,
    rasterul și decupajul;
  - AI 3, cu `%%BeginProcSet`;
  - bucla `for` (refuzată) și textul singur (golul).
  Fiecare fișier trece prin Ghostscript, interpretorul adevărat (local, wasm; în CI, `gs` din `apt`). PDF-ul ieșit e citit cu
  PyMuPDF: fiecare subcale de pe hârtie e desenată, nicio subcale în plus. Generatorul e determinist: CI-ul îl rulează din
  nou și cere fișierele comise, octet cu octet (pe ramura feliei, rularea 41213957798: verde, pe Ghostscript-ul din `apt`).
  Ușa le citește sub 1e-6 mm, cu numerele căilor, straturile și raportul exact (`test/unit/eps.corpus.test.ts`).
- **Probele țintite** (`test/unit/eps.test.ts`, 20): lexicul, dreptunghiurile, „umplut și tras”, închiderea și relativele,
  matricele, punctul curent după text, fiecare buclă și condiție, operatorii lipsă și greșelile, plafonul operațiilor și al
  stivei, `bind` și `//nume`, imaginile în șase forme (și refuzul celei comprimate), fonturile, sfârșitul, documentul inclus,
  operatorii AI necunoscuți, documentul plasat, stratul ascuns, calea compusă, prologul unui AI 3 fără `%%BeginProlog`, un
  AI cu capetele de rând Mac (CR), antetul Illustrator nou și vechi, EPS-ul binar DOS și dus-întorsul cu exportul EPS al
  aplicației (ADR 0089).
- **Fluxul** (`test/unit/import.eps.test.ts`, 7): formatul, ușa după antet, previzualizarea și piesa unde e în fișier, un
  `.ai` PostScript față de unul PDF, fișierul fără extensie, refuzurile cu formatul, acțiunea.
- **E2e** (`test/e2e/import.spec.ts`, Edge): EPS-ul cu formele (mărimea, laturile, raportul, piesa în (10, 10)); AI 8 cu
  straturile și refuzurile în coadă (bucla, Illustrator nou, golul); refuzul vechi al unui AI PostScript a devenit golul
  ușii EPS.
- **Mutațiile** (`test/otravuri/9.5.py`): 62 / 62.
  - 59 pe probele unitare (lexicul, antetul, interpretorul, imaginile, operatorii AI, ușa după antet) și 3 prin e2e, pe
    portul 4175 (straturile AI în dialog, operatorul din refuz, `.eps` în fereastra de fișiere).
  - Una a trecut întâi: prologul AI executat (I01). Era echivalentă pe corpus, fiindcă `%%BeginProlog` și `%%BeginProcSet`
    erau deja secțiuni sărite; proba nouă e un AI 3 cu cod în prolog, în afara blocurilor de proceduri.
  - Șapte probe au fost scrise înaintea rundei, din listă: datele hex prea scurte, binarul după CR LF, ASCII85 cu „>”, calea
    schimbată între `gsave` și `grestore`, `shfill`, calea compusă nonzero cu golul în același sens, operatorul AI necunoscut
    chiar înaintea lui `Lb`.

## Ce am respins

- **Un interpretor întreg:** Ghostscript în wasm (27 MB, AGPL-3.0, se folosește doar ca oracol), sau unul scris de noi
  (luni de lucru, pentru fișiere pe care le salvează altfel orice program).
- **Doar condițiile:** ar cere și mediul unui interpretor (`where`, `known`, `languagelevel`, `status`, `product`), iar un
  prolog ar alege apoi ramurile după ce pretinde cititorul că știe. Refuzul spune clar ce lipsește.
- **Arcele** (`arc`, `arcn`, `arct`): în afara deciziei din 07.10 și rare în fișierele scrise de programe (Illustrator,
  cairo și exportul aplicației scriu cubice). Refuzate, cu numele.
- **Decupajele aplicate:** ca la PDF (ADR 0104).

## Limite și neprobat

- **EPS-urile din programe cu proceduri condiționale** (CorelDRAW, Qt, AutoCAD PSOUT, cairo cu text sau imagini) sunt
  refuzate, cu operatorul; salvate ca PDF sau SVG, se importă.
- **EPS-urile de la Illustrator 9 încolo** (cele mai multe EPS-uri de clipart) sunt refuzate (`ai-nou`).
- **`restore`** întoarce starea grafică, nu și definițiile făcute după `save`; în fișierele obișnuite nu schimbă desenul.
- **Fișierele reale ale atelierelor:** probate pe corpus și pe fișierele scrise de mână. Rămân fișierele owner-ului.

## Se redeschide dacă

- fișierele reale aduc des arce, condiții simple sau EPS-uri Illustrator noi (un ADR nou: arcele în cubice, mediul unui
  interpretor);
- un EPS real iese altfel decât în programul care l-a scris.
