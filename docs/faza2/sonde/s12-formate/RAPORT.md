# Sonda s12: formatele de import rămase (EPS, AI vechi, DWG, WMF / EMF, DGK, PIC)

**Data:** 07.10.2026. **Faza 2, tranșa 1b.** Mai ales cercetare în documentație, plus un experiment mic pe EPS.
Codul din `cod/` e de probă, aruncabil. Nu e cod de produs.

**Marcaje:**
- **[măsurat]** = am rulat și am văzut cifra;
- **[citit]** = documentație, pagină oficială sau registru, cu link (lista e la §7);
- **[dedus]** = raționament, nerulat. Cifrele [dedus] sunt estimări, nu date.

**Termeni folosiți des:**
- **PostScript** = limbajul de programare al imprimantelor, de la Adobe. Un fișier PostScript e un program care
  desenează.
- **EPS** (Encapsulated PostScript) = un fișier PostScript cu o singură pagină și o casetă de încadrare
  (`%%BoundingBox`), făcut ca să fie inclus în alte documente.
- **Interpretor** = programul care execută PostScript. Cel de referință, gratuit, e **Ghostscript**.
- **Procset** = o bibliotecă de proceduri PostScript pusă de program la începutul fișierului. Desenul propriu-zis
  le apelează după nume scurte (de exemplu `mo`, `li`, `cv` în loc de `moveto`, `lineto`, `curveto`).
- **Corpul paginii** = partea de după procset-uri, unde stă desenul.
- **Profil de producător** = o tabelă mică, scrisă de noi, care spune ce înseamnă numele scurte dintr-un anumit
  program (Illustrator, CorelDRAW). E citită din procset-ul din fișier, nu ghicită.
- **AGPL / GPL** = licențe libere care obligă la publicarea codului nostru dacă le includem în aplicație (AGPL și
  când aplicația e folosită prin rețea). Inacceptabile în aplicația comercială închisă.
- **Hausdorff** = cea mai mare distanță de la un punct dintr-o mulțime la cel mai apropiat punct din cealaltă.
  O calculăm în ambele sensuri.
- **pt** = punctul PostScript, 1/72 țoli = 0,3528 mm.

---

## 1. Întrebarea

Rândul de prag v1 din `ACOPERIRE-ARTCAM-DESKPROTO.md` spune: „Import 2D: DXF, AI / EPS (S+D); SVG (D); PDF
vectorial, DWG, WMF, DGK / PIC (S)”. Sonda s2 a acoperit DXF, SVG, PDF și AI compatibil PDF. Pentru EPS, s2 a găsit
că trebuie un interpretor PostScript și a recomandat „fără import EPS în v1”.

Nimic nu iese din prag fără decizia owner-ului. Sonda asta îi dă owner-ului un tabel de decizie pentru formatele
rămase: **EPS, AI vechi (Illustrator 8 și mai vechi), DWG, WMF / EMF, DGK, PIC.** Pentru fiecare:
- ce e formatul și cine îl produce azi;
- ce cititoare există, cu ce licență și cât costă;
- opțiunile: (i) bibliotecă permisivă; (ii) licență comercială; (iii) conversie pe server; (iv) nesuportat, cu
  mesaj în aplicație;
- pentru EPS: poate un interpretor propriu, pentru o parte din PostScript, să citească EPS-urile din Illustrator și
  CorelDRAW?

## 2. Pe scurt

### Tabelul de decizie (recomandarea în față)

| Format | Recomandarea | Cost estimat | Ce pierdem dacă owner-ul alege varianta minimă (iv) |
|---|---|---|---|
| **EPS** | **v1, limitat:** interpretor propriu + profiluri pe producător (Illustrator acum, CorelDRAW după fișiere reale). Ce nu înțelege se refuză cu mesaj, niciodată pe tăcute. În paralel, owner-ul cere o ofertă Artifex (Ghostscript comercial) | 2–3 săptămâni de lucru [dedus]; poarta: ≥ 80 % din corpusul real al owner-ului | EPS-urile de la designeri și din băncile de clipart (formatul „EPS 10”). Estimare: 5–20 % din fișierele 2D primite [dedus] |
| **AI vechi (≤ 8)** | **v1, în același cititor.** Formatul are specificație publică Adobe | 2–3 zile peste EPS [dedus] | Fișiere foarte vechi și exporturile Corel „compatibil Illustrator 8”. Sub 2 % [dedus] |
| **DWG** | **Nu nativ în v1.** Mesaj „salvează ca DXF”, cu trimitere la un convertor gratuit. Decizia nativă se ia în v1.x, după cerere reală | 0 în v1. Nativ: ODA 7 500 $ primul an + 4 500 $/an, sau Aspose ~2 349 $ [citit] | Desene de la arhitecți și proiectanți de mobilier. 5–25 % [dedus] |
| **WMF** | **v1, cititor propriu** din specificația publică Microsoft. **EMF** intră „peste prag”, cu cost aproape zero | 3–5 zile pentru amândouă [dedus] | Clipart vechi și exporturi Corel / Office. Sub 1 % [dedus] |
| **DGK** | **Scos din prag.** Nu are specificație publică. Regula owner-ului interzice reverse engineering | 0 | Practic nimic în atelierele de lemn [dedus] |
| **PIC** | **Scos din prag**, din același motiv | 0 | Practic nimic [dedus] |

**Cum ar arăta rândul v1 după decizie** (propunere):
„Import 2D: DXF, SVG, PDF vectorial, AI compatibil PDF (s2); AI ≤ 8 și EPS (interpretor propriu, limitat, cu
refuz explicit); WMF (+ EMF peste prag). DWG: mesaj și convertor extern în v1, nativ de decis în v1.x. DGK / PIC:
scoase (fără specificație publică).”

### Cifrele-cheie

1. **Un interpretor PostScript mic, al nostru (493 de linii, aruncabil), citește exact EPS-ul real din
   Illustrator CS6, dacă știe profilul producătorului [măsurat].**
   - 34 de căi pictate (14 umpleri, 20 de contururi) și 131 de curbe, la fel ca Ghostscript.
   - Abaterea față de Ghostscript: **0,0048 pt (0,0017 mm)**, în ambele sensuri. Asta e rotunjirea lui Ghostscript.
   - Cele 9 puncte calculate pe hârtie ies exact (la 1e-6 pt).
   - Profilul are 27 de definiții, pe 7 linii, citite din procset-ul din același fișier.
2. **Fără profil, sau executând tot procset-ul, nu merge [măsurat].**
   - Fără profil: 0 căi, oprit la prima procedură din corp (`pgsv`).
   - Cu procset-ul executat: oprit la 31,5 % din fișier, pe `filter` (filtre de date, fonturi CID).
   - Procset-urile Illustrator au ~7 900 de linii și folosesc **241 de operatori standard și 651 de nume
     proprii** (proceduri și variabile). Corpul paginii folosește doar **42 de nume**.
3. **Producătorii simpli merg direct, cu tot cu procset-ul lor [măsurat]:** EPS-ul nostru (s2), gnuplot și un
   PostScript simplu. Abaterea față de Ghostscript e sub 0,0072 pt.
4. **Oracolul a prins un defect real al interpretorului:** raportam 38 de căi fără niciun segment (doar `moveto`),
   pe care PostScript nu le pictează. Toate cele 4 otrăvuri puse intenționat au ieșit roșii.
5. **WMF pierde curbele [măsurat].** Același desen e în WMF un poligon cu 69 de vârfuri, pe coordonate întregi de
   16 biți (0,0212 mm pe unitate). În EMF e făcut din 4 curbe Bézier.
6. **Biblioteca WMF permisivă găsită (SheetJS `wmf`, Apache-2.0) nu citește un WMF obișnuit [măsurat]:** cade pe
   antetul „placeable”, iar fără el cade pe o înregistrare `ESCAPE`.
7. **DWG nu are cititor gratuit și permisiv [citit].**
   - Toate cititoarele gratuite sunt GPL: LibreDWG și construcțiile lui WASM.
   - **Capcană:** pachetul npm `dwg2dxf` declară licența ISC, dar e LibreDWG compilat, deci e tot GPL.
   - ODA pentru web cere nivelul Sustaining: **7 500 $ primul an, apoi 4 500 $/an**. Nivelul Commercial
     (3 000 $) e doar pentru desktop / mobil, sub 100 de copii pe an.
   - RealDWG: 8 000 $/an, doar pe desktop Windows, interzis pe server.
8. **DGK și PIC (formate Delcam) n-au specificație publică [citit].** Cu regula „fără reverse engineering”, nu se
   pot face.

## 3. Afirmațiile și verdictele

| # | Afirmația | Verdict | Tip | Dovada |
|---|---|---|---|---|
| 1 | Importul EPS cere un interpretor PostScript (s2) | **CONFIRMAT** | — | Corpul paginii Illustrator apelează `pgsv`, `mo`, `cv`, definite în procset. Fără ele: 0 căi [măsurat] |
| 2 | Interpretorul trebuie să fie de clasa Ghostscript (AGPL sau licență Artifex), deci EPS nu intră în v1 (s2) | **INFIRMAT** | domeniu | Adevărat doar pentru executarea procset-urilor (oprire la 31,5 %). Corpul paginii e citit exact de un interpretor mic cu profil: 34/34 de pictări, 0,0048 pt, hârtia 9/9 [măsurat] |
| 3 | EPS-urile din Illustrator și CorelDRAW conțin procset-uri | **CONFIRMAT** pentru Illustrator; **NEDECIS** pentru CorelDRAW | — | Illustrator CS6: 6 procset-uri, ~7 900 de linii [măsurat]. Pentru CorelDRAW n-am găsit niciun fișier cu licență liberă |
| 4 | Rândul v1 se poate face integral fără reverse engineering | **INFIRMAT** | adevăr | DGK și PIC n-au specificație publică [citit] |
| 5 | Există un cititor WMF permisiv în JS, gata de folosit | **INFIRMAT** | domeniu | SheetJS `wmf` 1.0.2 (Apache-2.0) cade pe WMF-ul real [măsurat]. `rtf.js` (MIT) și `emf-converter` (Apache-2.0) n-au fost probate: NEDECIS |
| 6 | WMF păstrează curbele ca entități | **INFIRMAT** | adevăr | Cercul e un poligon de 69 de vârfuri pe int16; EMF-ul aceluiași desen are Bézier [măsurat] |
| 7 | DWG se poate citi în browser cu o bibliotecă permisivă și gratuită | **INFIRMAT** | adevăr | Gratuit = GPL (LibreDWG). Permisiv = comercial (ODA, Aspose) [citit] |
| 8 | Nivelul Commercial ODA (3 000 $) ajunge pentru o aplicație web | **INFIRMAT** | adevăr | Commercial e pentru aplicații desktop sau mobile, cu sub 100 de copii pe an. Web / SaaS cere Sustaining [citit] |
| 9 | RealDWG poate rula pe server sau în web | **INFIRMAT** | adevăr | RealDWG e doar pentru aplicații desktop Windows și nu are voie să ruleze pe server [citit] |
| 10 | AI ≤ 8 are specificație publică | **CONFIRMAT** | — | PRONOM fmt/420: fișierele AI sunt documente PostScript; specificația Adobe e referită acolo [citit] |

## 4. Cazurile noi și măsurătorile

### 4.1 Formatele, pe scurt [citit, cu excepțiile marcate]

**EPS.**
- Îl scriu CorelDRAW (cu previzualizare TIFF sau WMF, text ca text sau ca curbe, nivel PostScript la alegere),
  Illustrator, Inkscape și ArtCAM.
- Aspire și VCarve îl importă; documentația Vectric dă ca exemplu EPS-urile din CorelDRAW.
- Băncile de clipart vectorial livrează de obicei „EPS 10” plus AI [dedus]. „EPS 10” e EPS-ul de Illustrator 10,
  același fel ca proba măsurată aici.
- ArtCAM licenția pentru AI / EPS un cititor de la terți (Autodesk, forumul ArtCAM, citat indirect).

**AI vechi.**
- Până la Illustrator 8, AI era un document PostScript: un prolog, apoi un „script” cu operatori documentați
  (`m`, `l`, `c`, `f`, `S`, grupuri, straturi).
- Din Illustrator 9, AI e compatibil PDF; s2 îl citește cu pdf.js.
- CorelDRAW exportă AI cu o listă de compatibilitate care merge înapoi până la Illustrator 8.
- DeskProto citește AI și EPS doar „în formatul Illustrator 8”, după cercetarea Fazei 0 (`CERCETARE-DETALIATA.json`,
  din manualul DeskProto 8.1; nereverificat aici).

**DWG.**
- E formatul nativ AutoCAD, închis. Îl scriu și BricsCAD, ZWCAD, DraftSight [dedus].
- Vectric (VCarve Pro 12.5) îl importă, la fel ArtCAM 2018.

**WMF / EMF.**
- WMF e formatul de desen Windows pe 16 biți, din 1990. EMF e varianta pe 32 de biți, cu curbe Bézier.
- Specificațiile [MS-WMF], [MS-EMF] și [MS-EMF+] sunt publice, sub Microsoft Open Specification Promise (RFC 7903).
- ArtCAM 2018 citește WMF ca vectori și EMF doar ca imagine (`ACOPERIRE`, rândul „Scoase la reverificare”).

**DGK.**
- E formatul de geometrie Delcam / Autodesk: PowerShape, PowerMill, CopyCAD, ArtCAM. Conține wireframe, suprafețe
  și solide.
- Format închis, fără specificație publică găsită. Îl folosesc sculeriile, nu atelierele de lemn [dedus].

**PIC.**
- În ArtCAM, `.pic` e „Duct Picture”: desenul 2D din sistemul Delcam DUCT, retras de mult. Carveco îl listează
  încă așa.
- Nu are specificație publică.
- Nu are legătură cu alte formate `.pic` (Lotus PIC, PC Paint, Apple PICT).

**Observație în afara pragului:** CDR (CorelDRAW nativ) e, foarte probabil, cel mai răspândit format în atelierele
de reclame din România [dedus]. Nu e în prag: nici ArtCAM, nici Vectric nu îl citesc ca vectori. CorelDRAW exportă
DXF, AI, EPS, PDF și SVG.

### 4.2 Cititoarele și licențele [citit]

| Format | Cititor | Licența | Costul | Rulează în browser? |
|---|---|---|---|---|
| EPS / AI ≤ 8 | Ghostscript (versiunea WASM din npm: 9.56, `gs.wasm` de 16,2 MB [măsurat]) | AGPL-3.0 sau comercial Artifex | Comercial: cost pe copie, cu minim trimestrial; sumele nu sunt publice | Da, tehnic (rulat aici în Node, EPS → PDF în ~0,2 s [măsurat]) |
| EPS / AI ≤ 8 | Interpretor propriu (PLRM, EPSF 3.0 și specificația AI sunt publice) | a noastră | timp de lucru | Da, într-un Worker |
| DWG | LibreDWG, `@mlightcad/libredwg-web` (WASM) | GPL-3.0 | gratuit | Da, dar GPL |
| DWG | `dwg2dxf` (npm) | declarat ISC, **de fapt LibreDWG → GPL** | — | **Capcană de licență** |
| DWG | ODA Drawings SDK + Drawings inWEB SDK (WASM, din oct. 2024) | comercial, abonament anual | Sustaining (web / SaaS): 7 500 $ primul an, 4 500 $/an. Commercial: 3 000 / 2 250 $, doar desktop / mobil sub 100 de copii pe an. Founding: 37 500 / 18 000 $, cu sursa | Da (WASM). Probă gratuită 60 de zile |
| DWG | Aspose.CAD for JavaScript via .NET | comercial | Developer OEM ~2 349 $, care permite SaaS și site-uri publice. Small Business ~783 $, fără distribuire la terți (prețuri ComponentSource) | Necunoscut: nici mărimea, nici performanța [dedus: runtime .NET în WASM, greu] |
| DWG | Autodesk RealDWG | comercial | 8 000 $/an, până la 10 000 de utilizatori | **Nu:** doar desktop Windows, interzis pe server |
| DWG | Autodesk APS Design Automation (AutoCAD în cloud) | serviciu | 2 Flex tokens pe oră de procesare; ~3 $/token [dedus din „7 tokens/zi ≈ 21 $”] | Nu: fișierul pleacă la Autodesk |
| WMF | SheetJS `wmf` 1.0.2 | Apache-2.0 | gratuit | Da, dar **cade pe fișierul real** [măsurat] |
| WMF / EMF | `rtf.js` (WMFJS / EMFJS → SVG), ultima versiune în 2022 | MIT | gratuit | Da. Neprobat |
| WMF / EMF | `emf-converter` (EMF / WMF → SVG), actualizat pe 06.10.2026 | Apache-2.0 | gratuit | Neprobat |
| WMF / EMF | libwmf, libUEMF | LGPL / GPL | — | Nu, din cauza licenței |
| DGK, PIC | — | — | — | Nu există specificație publică |

**Conversia pe server (opțiunea iii), pe scurt [dedus; nu e aviz juridic]:**
- **GPL** (LibreDWG) nu are clauză de rețea. Rularea pe serverul nostru, fără distribuirea programului, nu ne obligă
  să publicăm codul.
- **AGPL** (Ghostscript) are clauză de rețea pentru versiunile modificate. Artifex scrie însă explicit, pe pagina de licențe,
  că versiunea gratuită nu se poate folosi într-o aplicație sau un serviciu pe server fără publicarea întregului cod
  al aplicației, sub AGPL. Deci, pentru Artifex, conversia pe server cu versiunea gratuită nu e o opțiune.
- Imaginea de bază Google pe Ubuntu 22.04 conține deja Ghostscript 9.55 [citit]. Versiunea e veche și rulează
  fișiere străine: ar trebui izolată.
- **Pentru toate:** importul ar merge doar online (aplicația e PWA offline), iar fișierul clientului pleacă pe
  server. Se potrivește cu „cloud-ul blocat pe server” (BRIEF §4), ca funcție plătită.

### 4.3 Experimentul EPS [măsurat]

**Probele** (toate cu licență liberă, nicio descărcare din afara registrelor oficiale):
- **Illustrator CS6 (16.0):** `illuCS6_no_preview.eps`, din testele Pillow. Licența e MIT-CMU. Sursa e arhiva
  sdist de pe PyPI, cu sha256 verificat față de PyPI.
  - `illu10_*.eps` are corpul identic, deci nu e o probă independentă.
- **gnuplot 4.6:** `zero_bb.eps`.
- **Un PostScript simplu,** fără producător declarat: `reqd_showpage.eps`.
- **EPS-ul nostru din s2:** `corpus.eps`.
- **Photoshop:** `1.eps`, un EPS raster, ca să vedem ce se întâmplă.
- **Pentru CorelDRAW n-am găsit niciun EPS cu licență liberă.**

**Interpretorul (`cod/src/psmini.mjs`, 493 de linii, scris ca probă în sub o oră):**
- scannerul PostScript, stivele, dicționarele și procedurile;
- 310 nume de operatori, dintre care multe sunt cioturi: fonturile sunt goale, imaginile se sar, `filter` refuză;
- matricea CTM, căile și pictarea.

Are două moduri:
- **„full”:** execută tot fișierul;
- **„body”:** sare peste prolog, resurse și setup, după comentariile DSC (convenția Adobe de structurare a
  fișierelor PostScript), și execută doar corpul paginii, cu un profil de producător.

**Oracolul (fără cod comun cu interpretorul):**
1. **Ghostscript-WASM** (doar test, AGPL) execută EPS-ul real, cu procset-urile lui, și scrie un PDF.
2. **PyMuPDF** (doar test) citește căile din PDF.
3. Comparăm mulțimile de puncte în **ambele sensuri**, pe ancore (capetele segmentelor) și separat pe punctele de
   control ale curbelor.
   - Toleranța e 0,01 pt (0,0035 mm), fiindcă Ghostscript rotunjește coordonatele în PDF la ~0,005 pt.
4. **Valori pe hârtie, la 1e-6 pt:**
   - Illustrator: corpul face `1 -1 scale 0 -2447.39 translate`, deci (x, y) → (x; 2447,39 − y). Colțurile primului
     dreptunghi sunt (377,007; 29,44) și (25,5132; 373,85). Cercul are ancorele (378,425; 18,10), (388,345; 8,18)
     etc. Punctul de control (378,425; 12,62) dovedește că e curbă.
   - EPS-ul nostru: placa de 2440 × 1220 mm (în pt: × 72 / 25,4) și cercul R600, cu centrul (1220; 610) mm.
   - gnuplot: `50 50 translate 0.050 0.050 scale`, apoi `3896 3541 M -104 38 V` dă (244,8; 227,05) și
     (239,6; 228,95).

**Rezultatele:**

| Proba | Modul | Noi / Ghostscript (pictări) | Curbe | Hausdorff ancore / control (pt) | Hârtia |
|---|---|---|---|---|---|
| EPS-ul nostru (s2) | full | 19 / 19 | 62 | 0,0063 / 0,0072 | 6/6 |
| gnuplot 4.6 (procset cu 98 de nume proprii) | full | 174 / 174 | 0 | 0,000019 / — | 2/2 |
| PostScript simplu (19 nume proprii) | full | 331 / 331 | 0 | 0,00023 / — | — |
| **Illustrator CS6**, corp + profil AGM (27 de definiții) | body | **34 / 34** | **131** | **0,0048 / 0,0048** | **9/9** |
| Illustrator CS6, corp fără profil | body | 0 | — | oprit la `pgsv` (47 % din fișier) | — |
| Illustrator CS6, tot fișierul | full | 0 | — | oprit la 31,5 %, pe `filter` | — |
| Photoshop `1.eps` (raster) | full | 0 | — | oprit pe imaginea cu dicționar: nu are vectori | — |

**Defectul prins de oracol.** La prima rulare, gnuplot dădea 212 căi la noi și 174 la Ghostscript. Cele 38 în plus
erau căi doar cu `moveto`, pe care PostScript nu le pictează. L-am reparat; acum ies 174 / 174.

**Otrăvurile (controlul negativ).** Sunt defecte puse intenționat; toate 4 au ieșit roșii:

| Otrava | Ce a văzut oracolul |
|---|---|
| `scale` ignorat, Illustrator | 243 / 408 ancore în afara toleranței; 4 puncte de hârtie greșite |
| Curba citită ca linie, Illustrator | lipsesc toate cele 262 de puncte de control; 1 punct de hârtie greșit |
| Curba citită ca linie, EPS-ul nostru | lipsesc toate cele 124 de puncte de control |
| `scale` ignorat, gnuplot | 348 / 348 de ancore în afara toleranței; 2 puncte de hârtie greșite |

**Inventarul operatorilor:** numele executabile din fișier, comparate cu cele 462 de chei standard din systemdict-ul
Ghostscript.

| Proba | Mărimea părții PostScript | Nume distincte | Operatori standard folosiți | Nume proprii ale producătorului (proceduri și variabile) | Nume în corpul paginii |
|---|---:|---:|---:|---:|---:|
| EPS-ul nostru | 6 355 B | 12 | 12 | 0 | — |
| PostScript simplu | 11 949 B | 48 | 29 | 19 | — |
| gnuplot | 26 359 B | 181 | 83 | 98 | — |
| **Illustrator CS6** | **204 501 B** | **892** | **241** | **651** | **42** |

**Ce arată:** procset-ul Illustrator cere practic un PostScript Level 2 complet: filtre, resurse, fonturi CID,
imagini. Corpul paginii e însă „plat”: o listă de `mo` / `li` / `cv` / `cp` / `f` / `@`, plus culoare și grosime de
linie.

**Duratele** (mediana din 5; mașina e împărțită cu alți agenți, deci sunt orientative):
- interpretorul nostru, pe corpul Illustrator: **10,2 ms**;
- Ghostscript-WASM, EPS → PDF: **212 ms**, după pornirea modulului.

**Estimarea pentru produs [dedus]:**
- **Nucleul:** stive, dicționare, salvare / restaurare, buget de pași și de memorie (un fișier străin poate face
  `{} loop`), Worker, mesaje de refuz. Cam 1 săptămână.
- **Profilurile:** Illustrator EPS 8 → CC și AI ≤ 8 după specificația publică, cam 1 săptămână. CorelDRAW,
  0,5–1 săptămână, **după ce avem fișiere reale**.
- **Acoperirea** nu se poate măsura fără corpus. Desenele din linii, curbe și umpleri ar trebui să treacă. Textul
  rămas text (nu convertit în curbe), imaginile și degradeurile se sar, cu avertisment.

### 4.4 WMF și EMF [măsurat]

Probele sunt `drawing.wmf` și `drawing.emf` din testele Pillow: același desen, în cele două formate. Le-am citit cu
un lister scris direct din [MS-WMF] / [MS-EMF] (`cod/oracle/wmf_list.py`).
- **WMF:**
  - are antet „placeable” cu 1 200 de unități pe țol, adică 0,0212 mm pe unitate;
  - coordonatele sunt întregi pe 16 biți;
  - **cercul e un `POLYGON` cu 69 de vârfuri.**
- **EMF:** același cerc e `BEGINPATH`, `MOVETOEX`, 4 × `POLYBEZIERTO`, `CLOSEFIGURE`, deci curbe Bézier.
- **SheetJS `wmf` 1.0.2:**
  - pe fișierul întreg: „Header: Type 52695 must be 1 or 2”. Nu știe antetul placeable, care apare în aproape orice
    WMF de clipart [dedus];
  - fără cei 22 de octeți ai antetului: „Unrecognized META_ESCAPE Type 0x17”.

**Consecința:** un cititor WMF propriu, din specificația publică, e mic și fără risc de licență.
- Arcele, elipsele și dreptunghiurile WMF intră exact în IR (`ARC`, `ELLIPSE`, `PIE`, `CHORD`, `ROUNDRECT`).
- Poligoanele rămân polilinii. Arcele se pot recupera cu potrivirea pe toleranță din nucleul geometric (s1 / s2).

## 5. Ce schimbă în arhitectură

1. **Importul rămâne „câte o ușă pe format, toate spre același IR”** (s2). Se adaugă două uși:
   - **PostScript (EPS și AI ≤ 8);**
   - **metafișier Windows (WMF și EMF).**
2. **Ușa PostScript.**
   - Nucleul de limbaj, cu căi și CTM, fără raster și fără fonturi.
   - Rulează **într-un Worker**, cu **buget de pași, de timp și de memorie**. Un EPS e un program străin, iar o buclă
     infinită nu are voie să blocheze aplicația.
   - Extrage partea PostScript din EPS-ul binar DOS (antet `C5D0D3C6`, cu previzualizare TIFF sau WMF).
   - Convertește pt → mm (× 25,4 / 72).
3. **Profilurile de producător sunt date, nu cod.** Un profil e un preambul PostScript ales după `%%Creator` și după
   numele procset-urilor. Fiecare profil vine cu fișierele lui de probă în corpusul oracolului.
4. **Niciodată import parțial pe tăcute.**
   - Un operator necunoscut sau o eroare duc la refuz, cu mesajul „salvează ca PDF sau SVG din programul tău”.
     Gratuit, Inkscape poate face conversia [dedus].
   - Textul și imaginile sărite se raportează cu numărul lor.
   - Un EPS raster (Photoshop) primește mesajul „nu conține vectori”.
5. **Oracolul din CI** (verificarea automată la fiecare commit) e cel din s2, extins: Ghostscript-WASM + PyMuPDF,
   doar în jobul de test, cu otrăvurile de aici. Fără Ghostscript în aplicație.
6. **DWG are un loc rezervat în v1, nu și cod.** Ușa există doar ca mesaj, cu trimitere la DXF și la un convertor
   gratuit (ODA File Converter [dedus]).
   - Dacă v1.x aduce DWG nativ, el stă în spatele unei capabilități (BRIEF §4). Pe server, pentru LibreDWG sau
     APS; în client, pentru ODA sau Aspose în WASM.
7. **DGK și PIC nu primesc ușă.** Motivul (fără specificație publică) se scrie în `ACOPERIRE`, la „Scoase la
   reverificare”, după decizia owner-ului.

## 6. Riscuri și ce a rămas neprobat

- **Un singur EPS Illustrator real** (CS6), cu un desen simplu: căi, umpleri, contururi, un decupaj.
  - Netestate: degradeuri, modele, text cu fonturi, imagini plasate, grupuri de decupaj, transparență aplatizată,
    alte versiuni (EPS 8, CC 2020+).
  - Profilul AGM acoperă cele 42 de nume din corpul acestui fișier. **Alte fișiere vor cere alte nume.**
- **Niciun EPS sau AI CorelDRAW.** Acoperirea pentru Corel e o estimare. Fără fișiere de la owner, profilul Corel
  nu se poate scrie.
- **Ponderile „cât blochează” sunt estimări fără date.** Corpusul real al owner-ului le-ar înlocui cu cifre:
  fișierele primite de ateliere în ultimele luni.
- **Ghostscript ca arbitru** are precizia lui: 0,005–0,007 pt. De aceea toleranța e 0,01 pt, iar hârtia e
  verificată separat, la 1e-6.
  - Procset-ul AGM aliniază coordonatele la grila dispozitivului când e activ `setstrokeadjust`. Noi nu le aliniem,
    și e corect pentru CAM.
- **Interpretorul de probă are cioturi:** `save` / `restore` țin doar starea grafică, nu și memoria; fonturile sunt
  goale; `arct` / `arcto` sunt aproximate. E o probă, nu o bază de pornire.
- **Licențe și prețuri:**
  - prețurile ODA vin de pe pagina ODA; contractul de membru nu l-am citit;
  - prețurile Aspose sunt de la revânzătorul ComponentSource;
  - RealDWG, de la TechSoft3D;
  - Artifex nu publică prețuri;
  - interpretările GPL / AGPL pentru server sunt raționament, nu aviz juridic.
- **Neprobate:** `rtf.js` și `emf-converter` (au nevoie de DOM sau n-am avut timp), ODA inWEB (cere cont),
  Aspose (cere licență de probă).
- **Neverificat de mine:** fraza „AI și EPS în formatul Illustrator 8” pentru DeskProto vine din Faza 0. Pagina de
  comparație DeskProto spune doar „2D file import (dxf, eps, ai, svg)”, în toate edițiile.
- **Fișierele de probă nu sunt în repo.** EPS-ul Illustrator are 412 KB, peste limita de 300 KB, iar licența
  imaginilor de test ține de Pillow. Se iau din sdist-ul Pillow (vezi §7).

## 7. Cum se reproduce

```
cd C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s12-formate
npm run masoara
```

Durează ~30 s. Afișează:
- cele 4 cazuri, cu pictările, curbele, Hausdorff și hârtia;
- cele 3 opriri așteptate;
- cele 4 otrăvuri, toate ROȘU;
- inventarul operatorilor;
- duratele;
- WMF / EMF.

Ieșirea e nenulă dacă un caz e roșu sau dacă o otravă nu e văzută.

**Refacerea din `cod/`** (într-un dosar în afara Drive-ului):
1. `npm ci`, apoi `cd testonly && npm ci`.
2. `C:/Python313/python.exe -m venv .venv`. Verifică întâi că există `.venv/Scripts/python.exe`. Apoi
   `.venv/Scripts/python.exe -m pip install -r requirements-test.txt` (PyMuPDF 1.28.0, doar test, AGPL).
3. **Probele EPS / WMF:**
   - descarcă `pillow-12.3.0.tar.gz` de pe PyPI (sha256
     `3b8182a766685eaa002637e28b4ec8d6b18819a0c71f579bf0dbaa5830297cce`);
   - dezarhivează în `samples/` doar `Tests/images/eps`, `drawing.wmf` și `drawing.emf`.
4. **EPS-ul nostru:** copiază `out/corpus.eps` din sonda s2 în `samples/own/`.
5. **Lista systemdict a lui Ghostscript:** `node testonly/gs2pdf.cjs --systemdict out/gs-systemdict.txt`.
6. **Otrăvurile, separat:** `POISON=no-scale|cv-as-li node src/run.mjs <eps> body ai-agm out/x.json`, apoi
   `.venv/Scripts/python.exe oracle/compare.py out/x.json <pdf-gs> 0 0 ai-cs6`.

**Surse citite:**
- Pragul și cercetarea: `ACOPERIRE-ARTCAM-DESKPROTO.md`; `PlanNou-CNC/CERCETARE-DETALIATA.json` (rândul „Import 2D”);
  sonda s2, `docs/faza2/sonde/s2-export-import/RAPORT.md`.
- ArtCAM 2018 (Autodesk):
  [deschidere ca model nou](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-EA8D704E-5CC2-4C1D-B976-09FA72CE4623.htm),
  [biblioteca de vectori](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-A3B80487-91B5-4A6F-86CA-191995DE5AB5.htm),
  [straturi din .dxf / .dgk](https://help.autodesk.com/cloudhelp/2018/ENU/ARTC-ReferenceHelp/files/GUID-E1FE771F-21C8-443E-B431-DDCF5C00BD95.htm).
- Vectric, [tipuri de fișiere](https://docs.vectric.com/docs/V12.5/VCarvePro/ENU/Help/form/file-types/index.html);
  DeskProto, [tabelul edițiilor](https://www.deskproto.com/products/comptable.php).
- CorelDRAW: [AI](https://product.corel.com/help/CorelDRAW/540111130/Main/EN/Documentation/CorelDRAW-Adobe-Illustrator-AI.html),
  [EPS](https://product.corel.com/help/CorelDRAW/540238885/Main/EN/Documentation/CorelDRAW-Encapsulated-PostScript-EPS.html),
  [forumul Corel despre exportul AI](https://community.coreldraw.com/talk/coreldraw-graphics-suite-2025/f/coreldraw-graphics-suite-2025-for-mac/68205/coreldraw-export-to-adobe-illustrator-is-badly-broken).
- AI ≤ 8 ca PostScript: [PRONOM fmt/420](https://www.nationalarchives.gov.uk/PRONOM/fmt/420).
- WMF / EMF publice: [RFC 7903](https://www.rfc-editor.org/rfc/rfc7903).
- ODA: [prețuri](https://www.opendesign.com/pricing.md),
  [nivelurile de membru](https://www.opendesign.com/faq/question/how-can-i-join-open-design-alliance-and-use-your-sdks.md),
  [Drawings inWEB SDK](https://www.opendesign.com/blog/2024/october/drawings-inweb-sdk-oda.md).
- Aspose.CAD, prețuri prin [ComponentSource](https://www.componentsource.com/product/aspose-cad-for-javascript-via-net/prices).
- RealDWG: [TechSoft3D](https://www.techsoft3d.com/oem/realdwg).
- Ghostscript: [licențiere Artifex](https://artifex.com/licensing).
- Autodesk Flex / APS: [rata Flex](https://www.autodesk.com/buying/flex/flex-rate-sheet).
- Imaginile de bază Google: [system packages](https://docs.cloud.google.com/appengine/docs/standard/reference/system-packages).
- DGK: [fileinfo](https://fileinfo.com/extension/dgk); PIC (DUCT): [filext](https://filext.com/de/dateiendung/PIC).
- Registrul npm (`npm view`): `wmf`, `rtf.js`, `emf-converter`, `@mlightcad/libredwg-web`, `dwg2dxf`,
  `@jspawn/ghostscript-wasm`.
- Specificații publice Adobe (nedescărcate aici): PostScript Language Reference Manual, ed. 3; EPSF 3.0 (Technical
  Note 5002); Adobe Illustrator File Format Specification (referită de PRONOM).
