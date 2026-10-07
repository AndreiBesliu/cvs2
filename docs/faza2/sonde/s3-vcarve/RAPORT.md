# Sonda s3-vcarve: V-carve pe axa medială

Faza 2, tranșa 1. Cod aruncabil, scris doar ca dovadă pentru decizia de arhitectură. Sursele sunt în `cod/`.

**Marcaje:** [măsurat] = am rulat; [citit] = documentație sau sursă, cu trimitere; [dedus] = raționament, nemăsurat.

## 1. Întrebarea

Cum calculăm **axa medială**, ca V-carve-ul să fie un traseu cu Z variabil, nu o stivă de inele?
- **Axa medială** e linia de mijloc a unei forme: locul centrelor cercurilor care ating conturul în două
  sau mai multe puncte. Pe ea, adâncimea frezei V e `z = -r / tan(θ/2)`, unde `r` e raza cercului și `θ`
  unghiul frezei.

Sonda trebuia să decidă:
1. ce algoritm folosim (licență, precizie, robustețe, timp);
2. dacă aceeași mașinărie poate da fundul plat cu a doua freză, incrustația (mascul / femelă) și gravarea
   „inteligentă” (smart engrave);
3. cât scade programul față de ediția întâi. Acolo, plăcuța de 6 mm avea 161 842 de linii (`LECTII.md` §4.5).

## 2. Pe scurt

- **Recomandarea:** axa medială din **diagrama Voronoi a unor puncte dese de pe contur**, cod propriu peste
  `delaunator` (ISC).
  - **Voronoi:** împărțirea planului după cel mai apropiat punct. Muchiile ei dintre puncte de pe părți
    diferite ale conturului aproximează axa.
  - E singurul candidat cu licență permisivă care a trecut **toate** cazurile de robustețe.
  - Are o condiție: după `delaunator` facem o legalizare completă cu predicate robuste. Altfel, pe liniile de
    bază ale textului, rămân triunghiuri greșite. Pe firmă, asta a lăsat un loc cu 0,49 mm netăiat. [măsurat]
- **Plăcuța de 6 mm** (3 rânduri, Roboto, freză 60°) iese în **7 274–8 222 de linii, față de 161 842**, adică de
  ~20 de ori mai puține. [măsurat]
  - Are 1,2 m de tăiere, ~1,5 min la 800 mm/min. În ediția întâi erau ~64 min [citit, `OWNER_VERIFY.md` din
    ediția întâi].
  - Tot calculul (axă + traseu + G-code) durează ~0,5–1 s, față de 20–42 s înainte, pe firul principal.
    [măsurat, pe mașina încărcată; vechiul: citit]
- **Precizia, față de un oracol independent** (suprafața ideală calculată prin forță brută din conturul exact):
  - abaterea maximă **sub ideal: 0,013 mm**, RMS 0,0025 mm;
  - **peste ideal (săpat prea adânc): cel mult 0,0016 mm**;
  - toate valorile pe hârtie ies la cel mult 0,005 mm. [măsurat]
- **Fundul plat cu freza dreaptă** merge pe aceeași axă: firma 300×100, canalul de 2440 mm, masculul de
  incrustație.
  - Abaterea maximă e 0,054 mm, numai în colțurile fundului plat. Acolo, toleranța de creastă e aleasă
    0,05 mm. [măsurat]
- **Ceilalți candidați:**
  - **flo-mat** (MIT): mai rapid, dar **pe dreptunghiul cu colțuri rotunjite aruncă excepție în 4 poziții din
    8 și se agață într-una**. [măsurat]
  - **voron8**: exact, dar e CGAL (GPL), deci doar unealtă de probă.
  - **Grila de distanțe**: crește cu aria / pas², deci nu încape în browser la piese mari.

## 3. Candidații

| Candidat | Licență | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| **(a) Voronoi pe puncte de contur** (`delaunator` 5.1.0 + `robust-predicates` 3.0.3; `d3-delaunay` 6.0.4 îl învelește) | ISC; Unlicense | Eșantionez conturul normalizat la pasul `h`. Fac triangularea Delaunay, iar centrele cercurilor circumscrise sunt vârfurile Voronoi. Păstrez muchiile dintre puncte care nu sunt vecine pe contur și au ambele capete în interior. Leg colțurile convexe. | Pe toate cele 16 forme: abaterea sub ideal ≤ 0,014 mm (≤ 0,054 cu fund plat), peste ideal ≤ 0,0017 mm. Robust pe tot corpusul, după legalizarea robustă. Plăcuța: 0,77 s. | **Ales** |
| **(d) flo-mat** 4.1.5 (+ `flo-*`, `big-float-ts`, `double-double`) | MIT | Axa medială direct pe curbe Bezier (linii, pătratice, cubice), cu regula nonzero. Arcele intră ca cubice. | Cel mai precis pe litere (0,013 mm) și cel mai rapid (plăcuța: 0,30–0,57 s). **Robustețe: 16/21 de cazuri. Pe dreptunghiul rotunjit: 4 excepții (`threeProngInfo` nedefinit) și o agățare peste 8–15 s.** Ediția pentru Node are un import stricat; merge doar pachetul `browser/`. | **Respins ca nucleu.** Se poate păstra ca martor în teste, fiindcă nu are cod comun cu (a). |
| **(c) voron8** 3.4.2 (CGAL `Segment_Delaunay_graph_2`, compilat WASM) | Învelișul e MIT, dar **binarul conține CGAL SDG2: GPL-3.0+ sau licență comercială** [citit: README voron8, „License”; [CGAL](https://www.cgal.org/license.html)] | Voronoi exact pe segmente. Curbele intră aplatizate. Am tăiat „perii” de la vârfurile false ale aplatizării. | Aceleași abateri față de oracol ca (a) și (d), la ±0,004 mm. **Lent: plăcuța 18,5 s, literele 0,6–2,1 s.** Robust pe tot corpusul. | **Doar unealtă de probă**, niciodată în aplicația livrată |
| **(b) Câmp de distanțe pe grilă + creastă** (cod propriu: EDT exact Felzenszwalb, cu indexul punctului cel mai apropiat) | — | Rasterizez forma. Distanța la contur se calculează pe celule, iar axa sunt celulele unde punctul de contur cel mai apropiat sare. | Steaua: 0,049 / 0,026 / 0,0079 mm la grila de 0,04 / 0,02 / 0,01 mm (3,7 M celule în 0,54 s). Creasta are 1–2 celule lățime și **n-am înlănțuit-o**, deci a ieșit ca nor de plonjări (1,2 M de linii). | **Respins pentru traseu.** Costul crește cu aria / g²: firma la 0,01 mm ar avea 300 M celule (~4 GB) [dedus]. |
| **Boost.Polygon Voronoi** | BSL-1.0 (permisivă) [citit: [boost.org](https://www.boost.org/doc/libs/release/libs/polygon/doc/voronoi_main.htm)] | Voronoi exact pe puncte și segmente, în coordonate întregi | Nu există build npm/WASM. **Cere emscripten**, pe care nu-l avem. | Rezervă exactă și permisivă. Estimare: 1–2 zile pentru build, legături și tăierea perilor (ca la voron8) [dedus] |
| OpenVoronoi | LGPL-2.1 [citit: [github](https://github.com/aewallin/openvoronoi)] | Voronoi pe segmente și arce, în C++ | — | LGPL într-un bundle de browser e o problemă; nu se folosește |
| CGAL direct / `straight-skeleton` 3.0.0 / `@matthewjacobson/str8` | GPL (ambele pachete npm învelesc `Straight_skeleton_2` din CGAL) [citit: README-urile lor] | Scheletul drept | — | GPL. Scheletul drept nu e axa medială: la vârfurile reflexe sapă prea adânc [dedus] |

**Biblioteci de probă** (nu intră în produs): `opentype.js` 2.0.0 (MIT), `clipper-lib` 6.4.2 (BSL-1.0, folosit
la normalizare și offset), fonturile Roboto v2 și v3 (Apache-2.0 / OFL-1.1) și EB Garamond (OFL-1.1).

## 4. Măsurători

### Metoda

1. **Normalizarea regiunii.**
   - Ce: conturul exact (linii, arce, Bezier pătratice și cubice) se aplatizează la 0,5 µm, apoi se unește
     cu Clipper după regula de umplere a formei (nonzero sau par-impar).
   - De ce: fontul Roboto v3 (cel actual din Google Fonts) are **contururi suprapuse în majoritatea
     glifelor**; pe 41 de caractere din 65, nonzero ≠ par-impar. [măsurat] Fără uniune, suprapunerile devin
     găuri.
2. **Axa medială**, din unul dintre candidați: un graf de noduri.
3. **Generatorul** (comun tuturor candidaților):
   - **Raza `r` se recalculează exact** în fiecare nod, ca distanță la contur. Raza dată de algoritm nu e
     folosită niciodată.
   - Ramurile terminale redundante se taie. O ramură e redundantă când discurile ei stau, până la 0,004 mm, în
     discul nodului de ramificație.
   - Lanțurile se simplifică (Douglas-Peucker pe XY + r, 0,004 mm).
   - O gardă verifică fiecare coardă: `r` interpolat ≤ distanța exactă.
   - `z = -min(D, r/tan(θ/2))`, cu puncte inserate la trecerea prin `D` și prin fiecare nivel de trecere.
4. **Fundul plat.** Zona plată e `F = {d ≥ D·tan(θ/2)}`.
   - Freza dreaptă (R = 1,5875 mm, pas 40 %) buzunărește regiunea `F_k` a fiecărui nivel.
   - Freza V taie:
     - axa, oprită unde freza dreaptă acoperă;
     - conturul lui `F` la `-D`;
     - inele în colțurile unde freza dreaptă nu ajunge, adică `Q = F − deschiderea lui F cu R`, la pasul
       `2·0,05·tan(θ/2)`, pentru o creastă ≤ 0,05 mm.
5. **Postul:** potrivire de arce G2/G3, cu XY circular și Z liniar pe unghi, la toleranța de 0,003 mm.
   - Fiecare arc e respins dacă vârful frezei ar coborî sub suprafața ideală.
6. **Simularea** (`cod/oracle/sim.mjs`, zero importuri din generator):
   - citește **textul G-code**;
   - calculează **analitic** înfășurătoarea conului (sau a cilindrului) măturat pe fiecare segment, în centrul
     fiecărei celule. E exactă pentru G1; arcele se împart în coarde cu săgeata ≤ 2·10⁻⁵ mm.
7. **Oracolul** (`cod/oracle/oracle.mjs`, zero importuri din generator):
   - Suprafața ideală e `z = -min(D, d/tan(θ/2))`.
   - `d` e distanța **exactă** la curbele de intrare: linia prin proiecție, arcul prin unghi, Bezier-ul pătratic
     prin rădăcinile ecuației de gradul trei, cubicul prin 64 de eșantioane + Newton.
   - Contează doar bucățile de curbă care sunt chiar granița regiunii (la contururile suprapuse se testează
     interiorul de o parte și de alta).
   - Interiorul se calculează prin intersecții exacte cu orizontala, după regula nonzero sau par-impar.
8. **Ancora oracolului:** valorile pe hârtie. Toate ies exact (diferență < 10⁻⁶) din oracol, înainte de orice
   traseu. [măsurat]

### Corpusul

- dreptunghi 12×6 (90°);
- cerc r 2,5 (60°);
- triunghi echilateral 10 (90°);
- stea cu 5 vârfuri de 30°;
- inel 10/6;
- dreptunghi rotunjit cu fund plat;
- inimă din cubice, cu gaură din arce;
- litere Roboto v2 „B8gR&” și Roboto v3 „ABRg” (suprapuse), plus EB Garamond „Qg&”;
- dinte de 0,01 mm;
- perete de 0,01 mm între două pătrate;
- firma 300×100 cu „MESTERUL / MANOLE 1920” (19 caractere);
- plăcuța de 3 rânduri la 6 mm (textul din reperul vechi);
- masculul unei incrustații („B” oglindit într-un dreptunghi);
- canal 2440×8 la y = 1200.

Pasul pe adâncime e 1 mm peste tot.

### Valori pe hârtie, simulate din G-code [măsurat]

| Formă | Punct | Pe hârtie | Simulat, (a) / (d) |
|---|---|---:|---:|
| dreptunghi 12×6, 90° | creasta, (H/2)/tan 45° | −3,0000 | −3,0000 / −3,0000 |
| dreptunghi 12×6 | colț convex | 0 | 0 / 0 |
| cerc r 2,5, 60° | centru, r/tan 30° | −4,3301 | −4,3255 / −4,3293 |
| triunghi echilateral 10, 90° | incentru (raza înscrisă) | −2,8868 | −2,8868 / −2,8868 |
| stea 30° | centru, ri/tan 30° | −5,7684 | −5,7684 / −5,7684 |
| stea 30° | vârf | 0 | 0 / 0 |
| inel 10/6, 90° | pe axă | −2,0000 | −1,9957 / −1,9963 |
| dinte 0,01 | mijlocul dintelui | −0,0050 | −0,0050 / −0,0050 |
| perete 0,01 | peretele rămâne | 0 | 0 / 0 |
| dreptunghi rotunjit, D 3 | fund plat | −3,0000 | −3,0000 (a) |
| canal 2440×8, D 3 | fund / perete d=1 / colț | −3 / −1,7321 / 0 | −3 / −1,7313 / 0 |

### Abaterile față de oracol, pe toată grila [măsurat]

- „Sub” = material rămas; „peste” = săpat prea adânc.
- Grila: 0,005–0,04 mm, după piesă.

| Piesă | Cand. | Sub max | Peste max | RMS | Linii G-code (G2/G3) |
|---|---|---:|---:|---:|---:|
| plăcuța 6 mm, 3 rânduri | (a) | 0,0131 | 0,0016 | 0,0025 | **8 222** (952) |
| plăcuța 6 mm, 3 rânduri | (d) | 0,0135 | 0,0016 | 0,0025 | **7 274** (1 237) |
| plăcuța 6 mm, 3 rânduri | (c) | 0,0136 | 0,0016 | 0,0026 | 8 341 (941) |
| plăcuța 6 mm, **ediția întâi** | inele | — | — | — | **161 842** [citit] |
| litere Roboto v2, 20 mm | (a) / (d) / (c) | 0,014 / 0,013 / 0,014 | 0,0016 | 0,003 | 2 342–2 474 |
| litere Roboto v3 suprapuse | (a) / (d) / (c) | 0,013 | 0,0016 | 0,0025 | 1 563–1 620 |
| EB Garamond | (a) / (d) / (c) | 0,014 / 0,018 / 0,014 | 0,0017 | 0,0035 | 1 803–1 894 |
| inimă (cubice + gaură) | (a) / (d) / (c) | 0,011 / 0,010 / 0,014 | 0,0017 | 0,003 | 455–588 |
| dreptunghi rotunjit, fund plat | (a) / (c); (d) aruncă | 0,0061 | 0 | 0,0005 | 1 156–1 224 |
| inel 10/6 | (d) | 0,0059 | 0,0002 | 0,0034 | **19** (6 arce) |
| firma 300×100, fund plat | (a) / (d) / (c) | 0,054 | 0,0016 | 0,0077 | 14 004–14 051 |
| mascul incrustație, fund plat | (a) / (d) / (c) | 0,054 | 0,0015 | 0,0127 | 4 650–4 666 |
| canal 2440×8, fund plat | (a) / (d) / (c) | 0,048–0,049 | 0 | 0,0006 | 583 |

- Nicio mișcare rapidă (G0) prin material, pe niciun program. [măsurat]
- Celulele tăiate în afara regiunii sunt toate sub 0,0017 mm adâncime. [măsurat]

### De unde vin abaterile (bugetul de toleranță)

- **Sub ideal: ≤ (0,004 + 0,004)·cot(θ/2), adică 0,014 mm la 60°.** Vine din simplificare și din tăierea
  ramurilor. [dedus; măsurat 0,0136 pe litere]
  - Cu fund plat: + creasta din colțuri, ≤ 0,05 mm. Aleasă ca parametru. [măsurat 0,054]
  - Candidatul (a) mai are un termen: pasul de eșantionare. Pe litere, abaterea maximă scade așa:

    | Pasul `h` | Abaterea maximă |
    |---:|---:|
    | 0,2 mm | 0,060 mm |
    | 0,1 mm | 0,024 mm |
    | 0,05 mm | 0,013 mm |
    | 0,02 mm | 0,014 mm (limitată de buget) |

    La steaua cu laturi drepte, eroarea e deja zero la 0,2 mm. [măsurat]
  - Deci **`h = 0,05 mm` ajunge**: eroarea de eșantionare cade sub buget.
  - Raza e recalculată exact, deci eșantionarea nu poate săpa. Ea doar mută axa, iar asta lasă material.
    [dedus]
- **Peste ideal: ≤ (0,0005 aplatizare + 0,0005 gardă)·cot(θ/2), adică ~0,0017 mm.** [dedus; măsurat 0,0016]
  - Coardele aplatizării cad de partea regiunii la contururile concave.
  - O aplatizare conservatoare (coarde mutate pe partea materialului) aduce acest termen la zero. [dedus]

### Timpul

**Zgomot:** alți 9 agenți rulau în paralel, deci cifrele absolute sunt umflate. Comparațiile din aceeași
rulare sunt valabile. Valorile sunt mediane din 5 repetări în `masoara`.

| Piesă | (d) flo-mat | (a) Voronoi | (c) voron8 |
|---|---:|---:|---:|
| plăcuța 6 mm | 0,30–0,57 s | 0,77 s | 18,5 s |
| litere 20 mm | 0,06–0,12 s | 0,15–0,21 s | 0,6–2,1 s |

- Generarea traseului + postul, pe plăcuță: 0,15–0,30 s.
- Pe firma cu fund plat: 2,8–3,8 s. Timpul e dominat de cele ~30 de offseturi Clipper pe toată firma, pentru
  inelele din colțuri. Se poate reduce făcând offset doar lângă `Q`. [măsurat; reducerea: dedus]
- Legalizarea robustă din (a) a întors 1 101 muchii pe plăcuță și 1 413 pe firmă. Pe firmă a ridicat timpul
  axei de la 0,43 la 1,1–1,7 s.
  - Se reduce cu o coadă de muchii, nu cu treceri complete. [măsurat; reducerea: dedus]

### Oracolul a prins trei defecte în timpul sondei [măsurat]

Fiecare defect a ieșit întâi ca cifră, apoi a fost reparat. Asta arată că plasa mușcă.

| Defectul | Cum s-a văzut | După reparație |
|---|---|---|
| Z tăiat la `-D` și la nivelul trecerii doar în vârfuri, fără puncte inserate la trecerea prin nivel | triunghiul: 0,39 mm netăiat; steaua: 0,57 mm | 0,0001 mm |
| Tăierea ramurilor redundante aduna eroarea din tăiere în tăiere | inima: 0,032 mm, peste bugetul de 0,014 mm | 0,011 mm |
| Triunghiuri ne-Delaunay lăsate de `delaunator` (mai jos) | firma: 0,49 mm netăiat într-un colț | 0,054 mm (creasta aleasă) |

### Alte constatări [măsurat]

- **`delaunator` 5.1.0 lasă triunghiuri ne-Delaunay** când stiva lui fixă de legalizare (512 intrări) se umple.
  - Codul sursă: `if (i < EDGE_STACK.length)`, în `index.js:385` [citit].
  - Se întâmplă pe rânduri lungi de puncte coliniare, cum sunt liniile de bază ale textului.
  - Efectul: o ramură a axei deviată de bisectoare, cu 0,49 mm netăiat într-un colț al lui „M” de pe firmă.
  - Reparația (treceri de legalizare cu `incircle` robust) a adus locul la 0,054 mm.
- **`opentype.js` 2.0.0 aruncă la EB Garamond**, în shaping-ul GSUB (lookup de tip 6, format 2).
  - Am așezat textul glif cu glif, cu kerning, ca rezervă.
  - Importul de text din produs trebuie să prindă eroarea.
- **Arcele:**
  - Inelul (axa e un cerc) iese în 19 linii, cu 6 arce G2/G3, la Z constant.
  - Plăcuța are 952–1 237 de arce.
  - Arcele intră pe axă doar unde axa e chiar circulară. Între o linie și un arc, axa e o parabolă și rămâne
    G1.

## 5. Ce schimbă în arhitectură

1. **Un singur modul „axa medială → traseu”.** Lanțul: regiune normalizată → graf de axă cu raza exactă în
   noduri → consumatori. Consumatorii sunt:
   - **V-carve**, cu `z = -min(D, r/tan(θ/2))`;
   - **fundul plat**;
   - **incrustația**:
     - femela = V-carve-ul formei;
     - masculul = V-carve-ul regiunii complementare. L-am probat: dreptunghi minus forma oglindită, cu limita
       = înălțimea dopului;
   - **smart engrave**, adică axa trunchiată unde `r` depășește raza frezei de gravare, cu freza V doar spre
     colțuri. Neprobat aici. [dedus]
2. **Algoritmul axei: candidatul (a)**, cu `h = 0,05 mm` și cu legalizarea robustă obligatorie după
   `delaunator`. O alternativă e un triangulator cu predicate exacte.
   - flo-mat rămâne **martor în teste**, ca a doua părere fără cod comun.
   - voron8 (GPL) poate fi martor exact doar în CI, niciodată în bundle.
3. **Raza nu se ia niciodată de la algoritmul axei.** Generatorul o recalculează exact.
   - Asta dă „nicio săpătură” prin construcție, cu o gardă pe fiecare coardă și pe fiecare arc.
   - Aceeași funcție de distanță o citesc și pre-flight-ul, și simularea.
4. **Regiunea se normalizează înainte de orice operație:** uniune după regula de umplere, cu nonzero la text.
   - Contururile suprapuse din fonturile moderne o cer.
   - Pe intrare se folosește aceeași funcție ca la desen (legătura cu sonda de vectori reali, `BRIEF.md` §16.2).
5. **Bugetul de toleranță e explicit și alocat pe etape.**
   - Valori: aplatizare 0,0005, simplificare 0,004, tăierea ramurilor 0,004, arce 0,003, creastă la fund plat
     0,05 mm (parametru).
   - Ce garantează: sub ideal ≤ 0,014 mm la 60°, plus creasta; peste ideal ~0, cu aplatizare conservatoare.
6. **Fundul plat pe niveluri.** Întâi freza dreaptă buzunărește `F_k = {d ≥ L_k·tan(θ/2)}` pe fiecare nivel
   `L_k`. Apoi vin trecerile frezei V.
   - Ordinea și tăierea la nivel garantează că nicio trecere nu scoate mai mult decât pasul pe adâncime.
     Motivul: învelitoarea conurilor se mută cu cel mult un pas între treceri. [dedus]
   - Asta trebuie pus sub poarta universală a invariantelor (`LECTII.md` §4.6).
7. **IR-ul poartă arce cu Z liniar.**
   - Potrivirea de arce stă în generator, unde regiunea e cunoscută, ca garda să poată respinge un arc care
     sapă.
   - Postul doar serializează.
8. **Oracolul de referință** reia tiparul din sondă:
   - distanța exactă pe curbele de intrare;
   - învelitoarea analitică a sculei, celulă cu celulă;
   - citirea textului G-code, cu zero importuri din generator.
9. **CAM-ul rulează în worker, cu anulare** (`LECTII.md` §4.9). Firma cu fund plat ia secunde, iar o planșă
   întreagă ia mai mult.
10. **Costul se poate prezice înainte de generare**, din lungimea axei și a inelelor, ca pre-flight. N-a mai
    rămas nevoie de predictorii empirici din ediția întâi. [dedus]

## 6. Riscuri și ce a rămas neprobat

- **Nimic n-a fost tăiat în lemn** și niciun fișier n-a rulat pe un controler. Proba fizică e placa etapei.
- **flo-mat:** n-am căutat cauza erorilor. Un fork reparat ar putea deveni nucleul mai precis pe curbe, dar asta
  cere timp pe un cod complex (aritmetică double-double, rădăcini certificate).
- **Candidatul (a):**
  - Legalizarea completă e O(n) pe trecere. Pe 100 000 de puncte trebuie rescrisă cu coadă.
  - Detaliile sub pasul `h` trec testele de aici (dintele și peretele de 0,01 mm), fiindcă colțurile sunt
    puncte de eșantion.
  - N-am probat un contur care aproape se atinge pe el însuși (un „C” cu fanta de 0,01 mm) și nici muchii
    perfect comune între două forme. Normalizarea decide acolo.
- **Fundul plat:**
  - Creasta din colțuri (0,05 mm) e un compromis cost / precizie, de arătat utilizatorului.
  - Prima trecere a frezei drepte pe un nivel taie cu toată lățimea. Avansul adaptat n-a fost tratat.
- **Neprobate:**
  - smart engrave (doar descris);
  - potrivirea mascul–femelă (așezarea dopului);
  - frezele V cu vârf teșit (au un platou mic la vârf);
  - limita de lungime a tăișului;
  - frezele desenate.
- **Legătura dintre trasee e lacomă:** pe plăcuță sunt 372 de ridicări. O ordonare pe arborele axei ar mai
  scădea G0-urile. [dedus]
- **Timpii sunt zgomotoși** (9 agenți în paralel). Nu s-a folosit GPU, deci nu există cifre GPU.
- **Fontul de reper (Roboto v2)** e copiat din ediția întâi (`public/Roboto-Regular.ttf`, Apache-2.0) în
  dosarul de lucru, nu în repo.

## 7. Cum se reproduce

Durează ~65 s pe mașina încărcată. Rulează formele simple, plăcuța, fundul plat, voron8 pe litere și
robustețea flo-mat.

```text
cwd:   C:\Users\besli\AppData\Local\Temp\claude\C--Users-besli-Desktop-MyWork-Apps\50bc5be4-b484-49e8-970f-991b3583b938\scratchpad\sonde\s3-vcarve
cmd:   node masoara.mjs
```

Dosarul de lucru are deja `node_modules` și `fonts/Roboto-Regular-v2.ttf`.

Din `cod/`, pe altă mașină:
1. `npm ci`
2. copiază `CNCVectorStudio\public\Roboto-Regular.ttf` în `fonts\Roboto-Regular-v2.ttf`
3. `node masoara.mjs`

Raportul complet, cu grila fină (0,01 mm pe plăcuță, durează ~3–4 min):

```text
node run.mjs --cands=voronoi,flomat,voron8 --reps=1 --out=rezultate.json
```
