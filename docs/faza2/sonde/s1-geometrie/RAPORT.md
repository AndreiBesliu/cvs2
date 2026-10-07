# Sonda s1-geometrie: modelul de curbă și operațiile exacte

> Faza 2, tranșa 1. Cod aruncabil, scris doar ca dovadă pentru arhitectură. Codul sondei e copiat în `cod/`.
> Marcaje: **[măsurat]** = am rulat eu; **[citit]** = documentație sau sursă, cu link; **[dedus]** = concluzie trasă de mine.
> Data: 07.10.2026. Mașina: Ryzen 9 7950X, Node 26.10, Windows 11, încărcată de alte 9 sonde în paralel.

## 1. Întrebarea

Owner-ul cere (BRIEF §16.2) ca desenul să lucreze cu **vectori reali**: orice formă rămâne linie, arc sau curbă prin
transformare, conversie în cale, unire, boolean, offset, text în curbe și editare de noduri. Aproximarea e permisă
doar unde e inevitabilă matematic, cu puține curbe sub o toleranță declarată.

Sonda trebuia să decidă:
- **(a)** din ce **primitive** e făcută o cale (primitivă = tipul de segment al unui contur), inclusiv dacă intră arcul eliptic;
- **(b)** ce bibliotecă sau ce algoritm propriu face fiecare operație;
- **(c)** unde rămâne aproximare și cât de mare e, măsurat;
- **(d)** cum servește același nucleu și desenul, și offsetul de sculă din CAM, cu arce scrise ca G2/G3.

Termeni folosiți:
- **offset** = curba paralelă, aflată peste tot la distanța d de cea inițială (în afară sau înăuntru);
- **boolean** = unire, intersecție, diferență, excludere (XOR) între regiuni;
- **cubică Bézier** = curba din SVG/Illustrator, cu două puncte de control;
- **conică** = pătratică rațională; poate reprezenta exact un arc de cerc sau de elipsă (așa ține Skia arcele);
- **biarc** = două arce de cerc tangente, care înlocuiesc o bucată de curbă sub o toleranță;
- **G2/G3** = mișcare CNC în arc de cerc, în sens orar / antiorar.

## 2. Pe scurt

**Recomandarea:** calea are trei primitive, **linie, arc de cerc și cubică**, fără arc eliptic. Elipsa rămâne formă
parametrică cu matrice, deci exactă la orice transformare. **Booleanul** de desen se face cu **Skia PathOps** (build-ul
`pathkit-wasm`, BSD-3, 146 KB gzip), singurul candidat care păstrează în același timp arcele (ca conice exacte) și
cubicele: pe litera „B” ∪ cerc, ieșirea stă la 4,3·10⁻⁶ mm de intrări la 100 mm. **Offsetul** (desen și CAM) se face cu
algoritmul **cavalier_contours**, adus în proiect din portul TypeScript `cavalier-contours-js` (MIT/Apache, 63 KB gzip):
cercul rămâne 2 arce, dreptunghiul rotunjit rotit rămâne 4 linii + 4 arce, cu aria exactă la 10⁻¹⁵. Cubicele intră în
offset o singură dată ca **biarce**, sub toleranța declarată (28 de arce la 0,01 mm, 56 la 0,001 mm pentru o cubică în
„C”), iar rezultatul, doar linii și arce, devine direct G1/G2/G3: litera „B” de 100 mm cu freză Ø6,35 dă 131 de linii
G-code (119 arce) față de 467 de linii G1 aplatizate la aceeași toleranță. **Clipper, paper.js, maker.js, bezier-js și
flatten-js nu poartă geometria** (motivele măsurate sunt la §3). Robustețea și viteza: §4.8–4.9.

## 3. Candidații

| Candidat | Licență | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| **cavalier-contours-js 0.1.1** (port TS al cavalier_contours 0.7.0, Rust) | MIT OR Apache-2.0 ✔ | offset exact pe linii+arce (deschis/închis, cu insule), boolean între **două** contururi simple | cerc: 2 arce, arie exactă la 10⁻¹⁶; rrect rotit: 4L+4A; offset deschis pe o parte exact (lungime = hârtie); **defect: unirea a două pătrate cu latură comună dă 2 contururi** | **offset: DA** (adus în proiect + testele noastre); boolean: nu (fără găuri, defectul de mai sus) |
| **Skia PathOps** (`canvaskit-wasm` 0.42 full; `pathkit-wasm` 1.0) | BSD-3-Clause ✔ | boolean și simplificare pe linii, pătratice, **conice**, cubice; offset doar prin „stroke” | păstrează arcele ca conice exacte (w = cos θ/2) și cubicele; float32: ~3·10⁻⁸ relativ; offsetul prin stroke dă **doar pătratice** (32–64 pe cerc), niciodată arce | **boolean: DA** (PathKit, 146 KB gzip); offset: nu |
| **@flatten-js/core 1.6.14** + polygon-offset 1.1.4 | MIT ✔ | boolean exact pe linii+arce, poligoane cu găuri | cercuri: exact; **„B” − cerc: excepție** („Unresolved boundary conflict”); polygon-offset 1.1.4 **aruncă la orice apel** cu core 1.6.14 | nu (rezervă pentru boolean pe L/A, de reprobat) |
| **makerjs 0.19.2** | Apache-2.0 ✔ | boolean și „outline” pe linii+arce | exact pe cercuri; fără XOR; offsetul unei glife de 2 440 mm: **5,8 s** | nu |
| **paper.js 0.12.18** + paperjs-offset 2.2.1 | MIT ✔ | boolean pe cubice; offset aproximativ | cercul = 4 cubice: **0,33 mm abatere la r = 1 220**; offset cerc r=50: 0,10–0,13 mm; rrect înăuntru: 36 de linii; **offset blocat > 20 s** pe un rrect de 2 440 mm | nu |
| **Clipper2** (`clipper2-ts` 2.0.1) + refit propriu | BSL-1.0 ✔ | boolean și offset pe poligoane (întregi, robust) | offset cerc: 498–4 908 de linii la 0,001 mm; refit înapoi la arce: 1 arc + 1–2 linii, **aproximativ** (≤ 0,001 mm), O(n²), 551 ms la r = 1 220 | nu ca purtător; poate rămâne pentru sarcini pur poligonale [dedus] |
| **bezier-js 6.1.4** | MIT ✔ | offset de cubică (`offset()`) | 4 cubice, abatere **0,033–0,044 mm**, fără control de toleranță | nu |
| **flo-bezier3 8.1.1** | MIT ✔ | intersecții Bézier robuste (double-double) | nu are offset general [citit: exporturile pachetului] | nu acum; util dacă vreodată scriem boolean propriu pe cubice |
| **kurbo / linesweeper** (Rust) | MIT/Apache | boolean și offset pe Bézier | **nu există build npm/WASM** [citit: registrul npm, 07.10] | cere toolchain Rust + wasm-bindgen (~1–2 zile de integrare) [dedus] |
| **Propriu: biarc fit** | — | cubică/elipsă → arce sub toleranță | toleranța ținută față de oracolul independent (ex.: 0,01 → 0,0099 mm) | **DA** (ușa de intrare în offset și CAM) |
| **Propriu: Tiller–Hanson cu subdivizare** | — | offset de cubică → cubice sub toleranță | 10–14 cubice la 0,01 mm, 42–48 la 0,001 mm | DA, doar dacă vrem offset de desen care rămâne cubic |
| **Propriu: transformări** | — | similitudini exacte, matrice pe formele parametrice | rotire 30°: 4L+4A, abatere 3,6·10⁻¹⁴ mm | **DA** |

Toate licențele de mai sus sunt acceptabile pentru un PWA comercial închis. Fontul Arial folosit la teste e doar local
(din Windows), nu e copiat în repo și nu se livrează.

## 4. Măsurători

### 4.1 Metoda și oracolul

- **Oracolul e cod separat** (`cod/oracol.mjs`): nu importă nimic din biblioteci și nici din codul propriu testat. Citește
  doar datele (linie, arc, cubică, pătratică, conică) și le evaluează cu formulele lui.
- **Valori pe hârtie:** aria și perimetrul cercului decalat (r ± d); aria dreptunghiului rotunjit decalat
  (A₀ + P₀·d + π·d² în afară; (W−2e)(H−2e) − (4−π)(r−e)² înăuntru); aria lentilei la două cercuri
  (2r²·acos(c/2r) − (c/2)·√(4r² − c²)); lungimea offsetului deschis, calculată de mână; distanța exactă la elipsă.
- **Abaterea se măsoară în ambele sensuri** (Hausdorff): fiecare punct al ieșirii față de curba adevărată, și fiecare
  punct al curbei adevărate față de ieșire, ca să prindă și bucățile lipsă.
- **Podeaua oracolului** e ~2·10⁻⁷ mm (săgeata propriei eșantionări); valorile mai mici înseamnă „exact”.
- **Oracolul a fost el însuși verificat.** Am găsit și reparat în el două defecte înainte de cifrele de mai jos: un
  segment aflat pe marginea grilei nu era indexat (raporta 0,005 mm pe arce exacte) și o depășire de stivă la 200 000
  de puncte. Distanța la elipsă: eroare 1,7·10⁻¹⁴ pe puncte construite la distanță cunoscută [măsurat].

### 4.2 T1: offsetul cercului

Cerc r = 50 (d = ±3), r = 1 220 (d = 3,175, raza unei freze de 6,35 mm), r = 0,5 (d = 0,01), r = 0,05 (d = −0,01).
Adevărul: un singur cerc de rază r + d.

| Bibliotecă | Entități | Eroare de arie (relativ) | Abatere maximă |
|---|---|---|---|
| cavalier | **2 arce** în toate cazurile | ≤ 1,7·10⁻¹⁶ | ≤ 2,7·10⁻⁷ mm (podeaua oracolului) |
| maker.js | 2 arce | ≤ 1,7·10⁻¹⁶ | ≤ 2,7·10⁻⁷ mm |
| paper.js + paperjs-offset | 8 cubice; **la r = 0,05: 8 linii** | −0,13 % … +0,20 %; **la r = 0,05: −13,6 %** | 0,10 / 0,13 / **0,27** mm (r = 50 / 50 / 1 220) |
| Skia (stroke, precision 100) | 4–64 de pătratice | 1,3·10⁻⁵ … 6,1 % (la r = 0,05) | 7,5·10⁻⁴ … 2,4·10⁻³ mm |
| Clipper2, aplatizare 0,001 mm | 16 … **4 908** de linii | −2,4·10⁻⁵ … −3,5 % (la r = 0,05) | ≤ 0,001 mm |
| Clipper2 + refit propriu | 1 arc + 1–2 linii | −2,2·10⁻⁶ | ≤ 0,001 mm (arc aproximativ, nu cel adevărat) |
| flatten polygon-offset | — | — | **excepție la fiecare apel** |

[măsurat] Precizia lui Skia la stroke crește cu `precision`: 1 → 0,17 mm (8 pătratice); 10 → 0,012 mm; 100 → 7,5·10⁻⁴ mm
(32); 1 000 → 4,7·10⁻⁵ mm (64). Arce nu apar niciodată.

### 4.3 T2: offsetul unui dreptunghi rotunjit rotit cu 30°

100 × 60 mm, raza colțului 8, rotit 30°. d = +3, −3 și −10 (la −10 colțurile devin ascuțite, fiindcă d > r).

| Bibliotecă | d = +3 | d = −3 | d = −10 (colțuri ascuțite) |
|---|---|---|---|
| cavalier | **4L + 4A**, arie exactă (10⁻¹⁶), abatere 6·10⁻¹⁴ | 4L + 4A, exact | **4L**, exact |
| maker.js | 4L + 4A, 1,9·10⁻⁸ mm | 4L + 4A, arie −7,9·10⁻⁶, 6,4·10⁻⁷ mm | 4L, 1,3·10⁻⁷ mm |
| paper.js | 4L + 9C, 0,11 mm | **36 de linii**, 0,040 mm | 4L, exact |
| Skia | 4L + 16 pătratice, 0,0024 mm | 4L + 16Q, 0,0011 mm | 4L, 5·10⁻⁶ mm |
| Clipper2 | 408 linii | 204 linii | 4L |

Intrarea însăși, construită prin rotire în modelul propriu, are 4L + 4A și abaterea 3,6·10⁻¹⁴ mm față de funcția de
distanță exactă a dreptunghiului rotunjit [măsurat]. Defectul D10 din ediția întâi (rotirea ascuțea colțurile) nu poate
apărea când primitiva e linie/arc cu transformare exactă.

### 4.4 T3: offsetul unui contur deschis, pe o singură parte (cazul CAM: gravare pe linie, lead)

Cale: linie 40 → arc r = 10 (90°) → linie 30 → linie spre un colț de 56,3°. Offset d = 2 pe fiecare parte.

- **cavalier:** pe dreapta 3L + 2A, lungimea **126,8707 = 126,8707 pe hârtie**; pe stânga 3L + 1A, 116,4811 față de
  116,4810 (rotunjirea mea de mână); fiecare punct stă la 2 mm de cale cu eroare ≤ 1,2·10⁻¹⁴ [măsurat].
- **paperjs-offset:** 3L + 3C, abatere 0,073 mm [măsurat].
- **Clipper2 și Skia** nu au offset pe o singură parte pentru contururi deschise: ambele închid un contur în jurul liniei
  [citit: Clipper2 `EndType`, Skia `StrokeOpts`].

### 4.5 T4: boolean între două cercuri și cazuri degenerate

Două cercuri r = 30 la 30 mm (adevărul: aria lentilei), apoi tangente la 0,001 mm (c = 59,999, lentila are
2,3·10⁻⁴ mm²), apoi separate la 0,001 mm.

| Bibliotecă | Unire (c = 30) | Intersecție aproape tangentă | Pătrat ∪ pătrat cu latură comună | Detaliu de 0,01 mm pe placă de 2 440 mm |
|---|---|---|---|---|
| cavalier | 4 arce, eroare 10⁻¹⁶ | 8·10⁻⁸ relativ | **8L în 2 contururi** (latura comună nu dispare) | corect |
| flatten-js | 4 arce, exact | 8·10⁻⁸ | 6L / 1 contur | corect |
| maker.js | 4 arce, exact; XOR lipsă | 8·10⁻⁸ | 6L / 1 contur | corect |
| paper.js | 8 cubice, 0,0082 mm (cercul κ) | +1,07 % | 4L / 1 contur | corect |
| **Skia** | **8 arce** (conice recunoscute), 3·10⁻⁶ mm, 10⁻⁸ relativ | −0,16 % (3,8·10⁻⁷ mm² absolut) | 5L / 1 contur | corect |
| Clipper2 | 516 linii | **−73 %** | 6L / 1 contur | corect |

[măsurat] Conicele ieșite din Skia trec testul „e arc de cerc” (laturi egale și w = cos θ/2) la 10⁻⁵ relativ, deci se
întorc exact în arce. Unirea dă arcele tăiate la cadrane (8 în loc de 2); reunirea arcelor co-circulare vecine e un pas
propriu banal [dedus].

**Cubicele rămân cubice prin boolean** (litera „B” din Arial, cu pătraticele ridicate exact la cubice, ∪ și − un cerc):

| Bibliotecă | 100 mm | 2 440 mm | Entități ieșite |
|---|---|---|---|
| **Skia** | abatere față de intrări **4,3·10⁻⁶ mm** | **8,3·10⁻⁵ mm** (3·10⁻⁸ relativ, adică float32) | 9L + 6A + 9C + 5Q: cubicele rămân cubice, unele reduse **exact** la pătratice |
| paper.js | 6,0·10⁻³ mm | **0,146 mm** | 9L + 20C: cercul e aproximat cu cubice |
| flatten-js | 9,8·10⁻⁵ mm (biarcele de la intrare) | 2,4·10⁻³ mm | 172 de arce; **diferența aruncă excepție** la ambele scări |

### 4.6 T5: transformări

- **Rotire 30°** a dreptunghiului rotunjit, în modelul propriu: rămân 4L + 4A, abaterea 3,6·10⁻¹⁴ mm [măsurat].
- **Scalare neuniformă 2 × 1** a unui cerc (devine elipsă 2r × r). Toleranța e măsurată cu distanța exactă la elipsă:

| Reprezentare | r = 50, ≤ 0,01 mm | r = 50, ≤ 0,001 mm | r = 1 220, ≤ 0,01 mm | r = 1 220, ≤ 0,001 mm |
|---|---|---|---|---|
| 4 conice (exact) | 3,4·10⁻¹⁴ mm | idem | 9,4·10⁻¹³ mm | idem |
| cubice | **8** (4,1·10⁻⁴ mm) | **8** | **8** (0,0100 mm) | **16** (1,6·10⁻⁴ mm) |
| biarce proprii | 64 | 120 | 192 | 384 |

- **Cercul ca 4 cubice** (reprezentarea paper.js): 0,0136 mm la r = 50 și **0,33 mm la r = 1 220** [măsurat]. Un model
  doar cu cubice nu poate ține promisiunea „cercul rămâne cerc” pe o placă de 2 440 mm.

### 4.7 T6: offsetul unei cubice (aproximarea inevitabilă)

Două cubice de 100 mm: una în „C”, una în „S” (cu inflexiune). d = ±3, sub raza minimă de curbură. Adevărul: punctele
p(t) + d·n(t), plus condiția ca fiecare punct al ieșirii să stea la exact |d| de cubică.

| Metodă | „C”, tol 0,01 | „C”, tol 0,001 | „S”, tol 0,01 | „S”, tol 0,001 |
|---|---|---|---|---|
| bezier-js `offset()` | 4 cubice, **0,036 mm** ✗ | — | 4 cubice, **0,044 mm** ✗ | — |
| paperjs-offset (cale deschisă) | 0,20–2,8 mm ✗ | — | 0,23–3,1 mm ✗ | — |
| Tiller–Hanson propriu (cubice) | **14** (0,0066 mm) | **48** (7,9·10⁻⁴) | **10** (0,0084) | **42** (9,0·10⁻⁴) |
| biarce proprii + offset exact cavalier (arce) | **28** (0,0058) | **56** (6,6·10⁻⁴) | **32** (0,0039) | **64** (4,7·10⁻⁴) |

[dedus] Offsetul e 1-Lipschitz în distanța Hausdorff: dacă biarcele stau la ε de cubică, offsetul lor exact stă la ε de
offsetul adevărat. Măsurătorile confirmă: abaterea de după offset e chiar abaterea biarcelor.

### 4.8 T7: robustețe pe un corpus de 508 cazuri

**Corpusul** (seed 12345, generat de `cod/robustete.mjs`):
- 150 de booleene între poligoane aleatoare din linii și arce (5–24 de vârfuri, la 1, 10, 100 și 2 440 mm);
- 150 de booleene între o glifă reală din Arial (B, g, 8, &, ®, cu găuri și contururi imbricate) și un cerc, un
  dreptunghi rotunjit rotit sau un poligon aleator;
- 150 de offseturi (glife, poligoane, dreptunghiuri rotunjite), în afară și înăuntru, la aceleași scări;
- 58 de cazuri degenerate: cercuri tangente la ±10⁻⁹…10⁻³ mm, cercuri identice, concentrice, laturi comune întregi și
  parțiale, arce comune, un cerc de 0,01 mm pe muchia unei plăci de 2 440 mm, o fantă de 0,01 mm, o glifă cu ea însăși,
  glife mutate la (2 440, 1 220), offseturi de 0,001 mm, un cerc mic care trebuie să dispară.

**Oracolul:** pe o grilă de 40 × 40 de puncte (plus puncte-țintă la detaliile mici), predicatul exact se calculează din
intrări (în A, în B, distanța la frontieră), iar ieșirea bibliotecii se clasifică independent. Punctele aflate într-o
bandă îngustă lângă frontieră se ignoră: max(2·10⁻⁴ × diagonala, 0,003 mm), adică cel puțin toleranța celei mai
grosiere biblioteci. Un singur punct clasificat greșit = „topologie greșită”. Fiecare bibliotecă rulează într-un
worker, cu termen de 20 s; un apel care nu se termină = „blocaj”.

| Bibliotecă | Cazuri suportate | Corecte | Excepții | Blocaje | Topologie greșită | Unde greșește |
|---|---|---|---|---|---|---|
| **Skia PathOps** | 508 | **507** | 0 | 0 | 1 (0,2 %) | offsetul prin stroke al unui cerc r = 0,05 cu d = −0,06 (trebuia să dispară) |
| **cavalier** | 353 | **353** | 0 | 0 | **0** | — ; nesuportat: booleenele cu glife (155), fiindcă booleanul lui cere contururi fără găuri |
| Clipper2 (0,001 mm) | 508 | 507 | 0 | 0 | 1 | un offset de 0,001 mm, sub propria toleranță de aplatizare |
| paper.js + paperjs-offset | 508 | 484 | 0 | **1** | 23 (4,5 %) | toate la offset: 24 din 150 (16 %) |
| flatten-js | 346 | 324 | **15** | 0 | 7 | booleene cu glife: 22 din 150 (14,7 %) |
| maker.js | 387 | 356 | 0 | 0 | **31 (8 %)** | 25 din 112 offseturi, 2 booleene, 4 degenerate |

Toate cifrele de mai sus sunt [măsurat], din `rezultate-robustete.json`.

**Controalele negative** (biblioteci sabotate intenționat, care trebuie prinse):
- „întoarce A neschimbat”: prins în 466 din 508 cazuri; restul de 42 sunt cazuri în care rezultatul corect chiar e A;
- „pierde ultimul contur”: prins în 121 din 353;
- „offset cu d × 1,02”: prins în 76 din 150. O eroare de 2 % din d iese din bandă doar la d mari.

Deci oracolul de clasificare prinde topologia și abaterile mai mari decât banda. Exactitatea fină o măsoară T1–T6.
**Limita oracolului:** unirea a două pătrate cu latură comună, întoarsă de cavalier ca 2 contururi lipite (T4), trece de
el, fiindcă mulțimea de puncte e aceeași. Pentru CAM contează însă: s-ar tăia și latura comună. E nevoie și de un oracol
de structură (număr de contururi, fără laturi comune) [dedus].

### 4.9 T8: viteză relativă pe un document de 1 000 de forme

Document: 25 de rânduri × 40 de forme (dreptunghiuri rotunjite 30 × 20, r = 4, rotite 0 / 0,2 / 0,4 rad, alternate cu
cercuri r = 10), fiecare formă suprapusă peste vecina ei. Operații: 1 000 de offseturi de +3 mm și 975 de reuniuni
(pliere pe fiecare rând). Mediana a 5 repetări, în același proces [măsurat].

| Bibliotecă | 1 000 de offseturi | 975 de reuniuni | Entități după offset | Aria totală a reuniunilor (mm²) |
|---|---|---|---|---|
| **cavalier** | **8 ms** (× 1) | **39 ms** (× 1) | 5 000 (linii + arce) | 420 182,333 |
| **Skia** | 39 ms (× 4,8) | 166 ms (× 4,3) | 22 000 (pătratice) | 420 181,972 |
| Clipper2, 0,01 mm | 36 ms (× 4,4) | 284 ms (× 7,3) | 124 000 de linii | 420 019,195 |
| Clipper2, 0,001 mm | 107 ms (× 13) | 932 ms (× 24) | 372 000 de linii | 420 165,096 |
| flatten-js | eroare la fiecare offset | 524 ms (× 13,5) | — | 420 182,333 |
| paper.js | 560 ms (× 69) | 1 314 ms (× 34) | 8 122 de cubice | 420 210,457 |
| maker.js | 2 067 ms (× 254) | 2 015 ms (× 52) | 5 000 | 420 182,333 |

- Trei implementări exacte scrise independent (cavalier, flatten-js, maker.js) dau aceeași arie la 9 cifre. Nu e un
  oracol, dar e o verificare încrucișată. Skia e la 8,6·10⁻⁷ relativ (float32), paper.js +28 mm² (cercurile din cubice),
  Clipper −17 și −163 mm² (aplatizarea).
- Pe tot corpusul T7, timpul operațiilor a fost: cavalier 330 ms, Skia 173 ms, flatten-js 1,2 s, Clipper 2,0 s,
  paper.js 24,8 s (din care 20 s un blocaj), maker.js 86,7 s.

### 4.10 (d) De la desen la G2/G3: același nucleu

Litera din Arial, 100 mm înălțime → biarce la 0,002 mm → offset exact cavalier cu raza 3,175 mm → G-code cu G2/G3
(emitent minimal) → **recitit de un cititor de G-code independent**, care expandează arcele și verifică raza la ambele
capete, cum face GRBL.

| Glifă | Pătratice la intrare | Arce după biarc | Linii G-code (G1 + G2/G3) | Aplatizat la 0,002 mm | Aplatizat la 0,01 mm | Eroare de rază max. | Abaterea traseului față de raza sculei |
|---|---|---|---|---|---|---|---|
| B | 24 | 139 | **131** (12 + 119) | 467 | 248 | 9,0·10⁻⁵ mm | 0,0019 mm |
| 8 | 33 | 256 | **229** (3 + 226) | 815 | 429 | 1,1·10⁻⁴ mm | 0,0019 mm |
| & | 31 | 216 | **193** (8 + 185) | 740 | 377 | 9,0·10⁻⁵ mm | 0,0020 mm |
| ® | 38 | 231 | **218** (16 + 202) | 867 | 438 | 8,9·10⁻⁵ mm | 0,0020 mm |

- Eroarea de rază vine din rotunjirea la 4 zecimale. GRBL respinge un arc (error:33) doar peste 0,005 mm **și** peste
  0,1 % din rază [citit: `grbl/gcode.c`, https://github.com/gnea/grbl/blob/master/grbl/gcode.c].
- Abaterea traseului (≤ 0,002 mm) e chiar toleranța biarcelor: singura aproximare de pe drum.

### 4.11 Mărimea în pachet

[măsurat, gzip -9]: cavalier 63 KB (neminificat); Skia **PathKit 146 KB** (CanvasKit complet: 3,3 MB);
flatten-js 60 KB; maker.js 77 KB; paper-core 69 KB + paperjs-offset 11 KB; clipper2-ts 33 KB; bezier-js 8 KB;
opentype.js 66 KB. În `canvaskit-wasm` 0.42 booleanul se cheamă cu `Path.MakeFromOp` (merge și în build-ul implicit,
și în `full`); metoda de pe obiect `makeCombined` nu e expusă [măsurat]. Pentru boolean ajunge PathKit.

### 4.12 Zgomotul

Mașina rula alte 9 sonde. Timpii absoluți sunt umflați și variază între rulări: în rularea rapidă, cavalier a făcut
1 000 de offseturi în 15 ms în loc de 8, iar raportul maker.js a fost × 146 în loc de × 254. **Ordinea bibliotecilor nu
s-a schimbat.** Valorile de exactitate (arii, abateri, numere de entități, rezultatele corpusului) nu depind de
încărcare și s-au reprodus identic.

## 5. Ce schimbă în arhitectură

Decizii propuse pentru plan:

1. **(a) Primitivele căii: linie, arc de cerc, cubică.** Un `switch` exhaustiv pe trei cazuri, verificat de compilator.
   - **Forma de stocare propusă:** conturul e o listă de noduri. Fiecare nod are punctul lui și segmentul spre nodul
     următor: linie (nimic în plus), arc (bulge = tan(baleiaj/4)) sau cubică (două puncte de control). Plus `closed`.
   - De ce: nodurile sunt comune segmentelor vecine, deci golurile sunt imposibile prin construcție. Bulge-ul e chiar
     câmpul de arc din DXF (LWPOLYLINE) și din cavalier. Centrul și raza se derivă, nu se stochează (lecția din ediția
     întâi). Un cerc = 2 noduri cu bulge 1. Arcele peste 180° se împart în două [dedus].
2. **Arcul eliptic nu intră în cale.**
   - Elipsa (și arcul de elipsă, dacă e nevoie) e **formă parametrică cu matrice de plasare**, deci exactă la orice
     transformare afină. Se exportă exact ca ELLIPSE în DXF și ca elipsă/arc „A” în SVG.
   - PDF-ul nu are arce deloc, doar cubice [citit: ISO 32000-1 §8.5.2, operatorii de construcție a căii], deci acolo
     orice cerc devine cubice oricum.
   - „Convertește în cale” și scalarea neuniformă a unei căi libere cu arce dau **cubice sub toleranța declarată**:
     8 pe elipsă pentru 0,001 mm până la r = 50 mm, 16 până la r = 1 220 mm [măsurat, T5].
   - De ce nu ca primitivă: fiecare primitivă în plus înmulțește perechile de intersecție și cazurile din fiecare
     operație (D2 din ediția întâi: 12 module orbe la arc). Iar CNC-ul n-are mișcare eliptică.
3. **Pătraticele** (fonturi TrueType, SVG `Q`) se ridică **exact** la cubice la ușa de intrare. Nu e aproximare. Conicele
   există doar în adaptorul Skia: arc → conică exact la intrare, conică → arc exact la ieșire.
4. **(b) Booleanul: Skia PathOps, build-ul `pathkit-wasm`** (BSD-3, 146 KB gzip), în workerul de geometrie, în spatele
   unei fațade proprii `boolean(a, b, op)`.
   - Adaptorul face: arce → conice; conice → arce (testul „laturi egale și w = cos θ/2”); pătratice → cubice. Probat.
   - Tot adaptorul ar trebui să reunească arcele co-circulare vecine și să mute intrarea în coordonate locale (centrul
     casetei) înainte de float32. Neprobat [dedus].
   - Regula de umplere (nonzero sau par-impar, defectul D11 din ediția întâi) se decide o dată și se trimite la Skia ca
     `FillType`.
   - Dovada: 507/508 în corpus, 300/300 de booleene; „B” ∪ cerc stă la 4,3·10⁻⁶ mm de intrări la 100 mm.
   - Ce rămâne de verificat în plan: `makeSimplified` (curățarea căilor auto-intersectate din importuri), neprobat aici.
5. **(b) Offsetul: algoritmul cavalier_contours**, adus în repo din `cavalier-contours-js` (MIT/Apache permite;
   ~7 400 de linii JS compilat).
   - Se aduc și cele 232 de teste ale portului [citit: README], peste care vin oracolele noastre.
   - Ușa de intrare: cubicele devin biarce sub toleranța proiectului, cu fitter propriu (ex.: 0,002 mm). Ieșirea:
     doar linii și arce.
   - Formele cu găuri se decalează cu `Shape` (insulele incluse): 150/150 în corpus.
   - Îmbinările ies doar rotunde. Pentru „miter” (colț ascuțit) și „bevel” (teșit) trebuie o post-procesare proprie:
     neprobată, estimată la 1–2 zile [dedus].
   - Booleanul cavalier **nu** se folosește: nu știe găuri și lasă latura comună (T4).
6. **(c) Bugetul de toleranță rămâne pe etape**, ca în ediția întâi, dar fiecare cotă se probează pe rezultat:
   - biarcele (ex.: 0,002 mm);
   - rotunjirea G-code (4 zecimale dau o eroare de rază ≤ 1,1·10⁻⁴ mm);
   - float32 din Skia (~3·10⁻⁸ relativ, adică 8·10⁻⁵ mm la 2 440 mm).
7. **(d) CAM: offsetul cu raza sculei e același offset (punctul 5).**
   - Liniile și arcele intră în IR-ul traseului ca mișcări linie/arc. Postul scrie G2/G3 cu I/J.
   - Un controler fără arce primește arcele aplatizate de post, nu de nucleu.
   - Buzunarul = offseturi repetate pe `Shape`. V-carve-ul pe axa medială e subiectul altei sonde.
8. **Offsetul unei forme cubice, în desen:** implicit tot punctul 5, deci arce (28–64 pe cubică). Dacă owner-ul vrea ca
   offsetul să rămână cubic pentru editare, varianta proprie Tiller–Hanson dă 10–14 cubice la 0,01 mm [măsurat, T6].
9. **Transformările sunt cod propriu.**
   - Mutarea, rotirea, scalarea uniformă și oglindirea sunt exacte pe linii, arce și cubice.
   - Formele parametrice (cerc, dreptunghi rotunjit, elipsă, text) își păstrează parametrii și matricea. Conturul tăiat
     e derivat la cerere.
10. **Respinse ca purtători de geometrie:**
    - Clipper2: pune mii de linii în loc de un arc; refitul e aproximativ și lent;
    - paper.js: cercul greșit cu 0,33 mm la 2 440 mm; 16 % din offseturi greșite, plus un blocaj;
    - maker.js: × 50–250 mai lent; 8 % greșite;
    - flatten-js: 14,7 % din booleenele cu glife greșite; pachetul de offset nu mai merge;
    - bezier-js: offset cu 0,04 mm abatere, fără control;
    - CanvasKit complet: 3,3 MB, când PathKit ajunge.

    Clipper2 poate rămâne la margine, doar pentru sarcini pur poligonale [dedus].
11. **Oracolul sondei devine biblioteca de oracole a geometriei.** Are:
    - evaluare proprie, fără cod comun cu biblioteca testată;
    - Hausdorff în ambele sensuri;
    - clasificarea punctelor cu bandă;
    - controale negative;
    - valori pe hârtie.

    Lipsește un **oracol de structură**: număr de contururi și fără laturi comune (vezi T4).
12. **Pachetul de geometrie** cântărește ~210 KB gzip (cavalier 63 + PathKit 146), plus codul propriu. WASM-ul se
    încarcă în workerul de geometrie, nu pe firul principal [dedus].

## 6. Riscuri și ce a rămas neprobat

- **cavalier-contours-js e tânăr:** v0.1.1, publicat acum 2 luni, un singur autor [citit: npm]. Defectul cu latura comună
  arată că portul poate avea și alte cazuri-limită. Remediul: îl aducem în repo și îl testăm noi. Istoria lungă o are
  originalul Rust (v0.7.0).
- **Rotunjirile float32 din Skia se pot aduna** prin booleene repetate (fiecare operație re-rotunjește). Neprobat.
  Remediu propus, tot neprobat: arcele ieșite se re-ancorează pe cercurile-sursă exacte, care se cunosc.
- **Skia și cavalier au rulat doar în Node.** În browser (worker, încărcarea WASM-ului, memorie, costul transferului)
  nu au fost probate. PathKit e publicat de echipa Skia de la Google din 2018, ultima versiune (1.0.0) în aprilie 2025
  [citit: npm, https://github.com/google/skia/tree/main/modules/pathkit]; ritmul de întreținere de acum înainte nu se
  poate ști.
- **Fișierele reale nu au fost încercate:** DXF/SVG cu mii de segmente, căi auto-intersectate, arce eliptice din SVG.
  Corpusul e sintetic, plus 5 glife dintr-un singur font.
- **Neprobate:** îmbinările miter/teșite, semantica tragerii unui nod pe arc (păstrează bulge-ul sau raza?) și
  reunirea arcelor co-circulare.
- **Fitter-ul de biarce al sondei e simplu** (bisecție la t = 0,5). Numărul de arce poate scădea cu o împărțire mai
  bună; nu am măsurat cât.
- **Rezoluția oracolului de clasificare e banda** (≥ 0,003 mm). Erorile mai mici le prind doar T1–T6. Erorile de
  structură (contururi lipite) nu le prinde deloc.
- **kurbo și linesweeper** n-au fost evaluate: nu au build npm/WASM. Ar cere toolchain Rust (estimat 1–2 zile).
- **G-code-ul nu a rulat pe mașină**, doar prin cititorul independent.
- **Timpii sunt zgomotoși** (mașină încărcată); se repetă cu comanda de la §7 pe o mașină liberă.
- **Numere GPU:** nu se aplică; sonda nu randează.

## 7. Cum se reproduce

Din spațiul de lucru al sondei (are deja `node_modules`):

```
cd C:\Users\besli\AppData\Local\Temp\claude\C--Users-besli-Desktop-MyWork-Apps\50bc5be4-b484-49e8-970f-991b3583b938\scratchpad\sonde\s1-geometrie
node masoara.mjs --rapid
```

- Durează ~63 s pe mașina încărcată. Rulează T1–T6 complet, T7 pe fiecare al 5-lea caz (102) și T8 cu 3 repetări.
- `node masoara.mjs` rulează tot: T7 pe cele 508 cazuri, T8 cu 5 repetări, în ~4 min.
- `node gcode-demo.mjs` dă tabelul de la §4.10; `node cubice-raman-cubice.mjs` dă tabelul „cubicele rămân cubice” de la §4.5.

Din copia din repo: **nu** se instalează în repo (stă în Google Drive). Se copiază `cod/` într-un dosar din afara
Drive-ului și se instalează acolo (~30 MB, din registrul npm oficial):

```
xcopy /E /I docs\faza2\sonde\s1-geometrie\cod %TEMP%\s1-geometrie
cd /d %TEMP%\s1-geometrie
npm ci
node masoara.mjs --rapid
```

`node robustete-cu-controale.mjs` reface T7 complet împreună cu controalele negative (~3 min).

Fontul de test e Arial din Windows (`C:\Windows\Fonts\arial.ttf`); altul se dă cu variabila `FONT_TTF`. Rezultatele se
scriu în `rezultate.json`.
