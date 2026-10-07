# Verificarea sondei s3-vcarve (v2-vcarve)

Faza 2, tranșa 1b. Verificare adversarială a recomandării din `RAPORT.md` (același dosar). Codul de verificare e
aruncabil și stă în `cod-verificare/`. Codul sondei (`cod/`) a fost folosit neschimbat.

**Marcaje:** [măsurat] = am rulat; [citit] = documentație sau sursă, cu trimitere; [dedus] = raționament, nemăsurat.

## 1. Ce verific

Sonda s3 recomandă:
- axa medială pentru V-carve din **diagrama Voronoi a unor puncte dese de pe contur**, cod propriu peste `delaunator`
  (ISC), cu pasul de eșantionare `h = 0,05 mm`;
  - **axa medială** = linia de mijloc a formei; pe ea, freza V coboară la `r / tan(θ/2)`, unde `r` e distanța până la
    contur și `θ` unghiul frezei;
- o **legalizare robustă obligatorie** după `delaunator`;
  - **legalizare** = întoarcerea muchiilor până când niciun punct nu cade în cercul circumscris al unui triunghi vecin
    (proprietatea Delaunay);
- **raza recalculată exact** în fiecare nod, nu luată de la algoritm;
- fundul plat cu a doua freză, pe niveluri;
- aceeași mașinărie pentru incrustația V (femelă / mascul).

Am testat afirmațiile decisive C1–C4 cerute și am adăugat C5 (incrustația) și C6 (oracolul sondei). Am căutat cazurile pe
care sonda nu le-a încercat: (a) un contur care aproape se atinge pe el însuși, (b) muchii comune, (c) trăsături foarte
subțiri, (d) scara mare, (e) forme doar din arce, (f) fonturi script, (g) unghiuri de freză și fund plat la limită,
(h) perechea de incrustație.

## 2. Pe scurt

**Verdict: păstrează candidatul (a), cu gărzi obligatorii.** Mașinăria e bună: raza recalculată exact chiar ține
săpătura sub buget, iar abaterea „peste ideal” a rămas ≤ 0,0017 mm la 60° pe toate intrările curate. Dar trei cifre din
raport nu țin în forma în care sunt scrise:

1. **`h = 0,05 mm` nu ajunge.** Cifrele-titlu ale sondei pentru plăcuța de 6 mm (8 222 de linii, 0,0131 mm) au fost
   obținute la **h = 0,02**, nu la 0,05. Cauza: `run.mjs:39` leagă `h` de grila oracolului (`h = 2·S.g`).
   - La h = 0,05, plăcuța iese cu **0,0163 mm sub ideal, peste bugetul de 0,014**. [măsurat, cu runner-ul și oracolul
     sondei]
   - Trăsăturile mai înguste de ~0,1 mm depășesc și ele: linii de 0,02–0,03 mm (0,015–0,017), text cu tulpina de
     0,2 mm (0,0147), fontul script Kunstler (0,0209). La h = 0,02, sub-ul intră în buget peste tot (Kunstler
     iese atunci cu 0,0019 peste, puțin peste 0,0017). [măsurat]
2. **Legalizarea „completă, pe treceri” nu scalează și se oprește tăcut.** Pe o firmă de 1200×400 mm (344 974 de
   eșantioane) atinge plafonul de 200 de treceri, durează 16–19 s și lasă 230 de muchii ne-Delaunay. Nu dă nicio eroare.
   - O legalizare clasică, **cu stivă**, face același lucru în **0,08 s**, cu 0 muchii ne-Delaunay. Timpul total al
     firmei scade de la ~24 s la **6,5 s**, cu ~0,46 GB de memorie. [măsurat]
3. **Muchiile „aproape comune” strică totul.** Exemplu: două jumătăți de cerc, una cu muchia exactă, cealaltă cu aceeași
   muchie importată ca polilinie, cu abateri de ~0,9 µm.
   - Clipper lasă 110 micro-găuri pe cusătură.
   - Cusătura rămâne netăiată: în centru, -6,93 mm pe hârtie, 0 simulat.
   - Nici două oracole independente nu cad de acord pe această intrare (0,17 mm). Intrarea trebuie „vindecată” înainte de
     V-carve. [măsurat]

Mai sunt patru lucruri:
- incrustația cere o **adâncime de start**, pe care codul sondei nu o are;
- **oracolul sondei are un defect** la capetele curbelor, pe contururi suprapuse;
- flo-mat cade din cauza **împărțirii arcelor**, nu din cauza formei;
- raportul de ~20× la numărul de linii se confirmă (21,2× la h = 0,05).

## 3. Afirmațiile și verdictele

| # | Afirmația | Verdict | Tip | Dovada |
|---|---|---|---|---|
| C1a | Sub ideal ≤ 0,014 mm la 60°, cu h = 0,05, „robust pe tot corpusul” | **INFIRMAT** | domeniu | La h = 0,05: plăcuța sondei 0,0163; text de 1,57 mm 0,0147; linii de 0,02 / 0,03 mm 0,0169 / 0,0151; Kunstler 0,0209; Vivaldi 0,0142. Ține pentru trăsături ≥ ~0,1 mm (literele de 20 mm: 0,0128–0,0133) și, la h = 0,02, pe toate cazurile curate (sub-ul). [măsurat] |
| C1b | Peste ideal ≤ ~0,0017 mm (60°) | **CONFIRMAT** | — | Maxim 0,0017 pe toate intrările curate, cu oracolul reparat. La alte unghiuri formula `0,001·cot(θ/2)` e aproape exactă: 30° 0,0035 (buget 0,0037), 120° 0,0008 (buget 0,0006, depășit cu 0,0002). Garda arcelor are toleranța fixă de 0,0005 în Z, nu scalată cu unghiul. [măsurat] |
| C1c | Raza recalculată exact = fără săpătură | **CONFIRMAT** | — | Controlul negativ „circ” (raza dată de algoritm) sapă 0,0033–0,033 mm (mediana 0,020) pe 37 din 44 de cazuri; cu raza recalculată, maximul e 0,0017. Garda pe coardă e totuși euristică (7 puncte pe coardă): n-am găsit un contraexemplu, dar nici n-am dovedit-o. [măsurat] |
| C1d | Legalizarea robustă e obligatorie | **CONFIRMAT** | — | Fără ea: firma 300×100 rămâne cu 0,4495 mm netăiat, firma 1200×400 cu 1,61 mm. Pe formele mici nu se vede nimic. [măsurat] |
| C2a | Plăcuța de 6 mm în ~0,5–1 s | **CONFIRMAT** | — | Mediana din 5, mașină încărcată: 0,63 s la h = 0,05 (axa 415 ms, traseul 154 ms, postul 61 ms) și 1,18 s la h = 0,02. [măsurat] |
| C2b | Scalarea e acceptabilă | **INFIRMAT** | mecanism | O trecere costă O(n) (63–134 ms la 345 k de eșantioane), dar **numărul de treceri nu e mărginit**: 96 pe firma 300×100, peste 200 pe 1200×400. La plafon, sonda iese tăcut. Cu legalizarea pe stivă, scalarea devine acceptabilă: 6,5 s și ~0,46 GB pentru 345 k de eșantioane. [măsurat] |
| C3a | flo-mat nu e de încredere ca nucleu | **CONFIRMAT** | — | Mecanismul e mai îngust decât în raport. Pe dreptunghiul rotunjit, cu arcele ca 3 cubice pe sfert, trece 3 din 8 poziții (4 excepții, o agățare). Cu **o cubică pe sfert**, trece 8 din 8. Cu pătratice de 15°, trece 3 din 8. Cade când un arc de cerc e împărțit în mai multe bucăți Bézier. Produsul va avea arce exacte (`BRIEF.md` §16.2), deci concluzia rămâne. [măsurat] |
| C3b | voron8 conține CGAL (GPL), deci doar unealtă de probă | **CONFIRMAT** | — | README-ul voron8, secțiunea License: învelișul e MIT, dar „CGAL itself is distributed under GPL/LGPL terms; the compiled wasm links CGAL's headers”. [citit] |
| C4 | Programul e de ~20× mai mic (8 222 față de 161 842 de linii) | **CONFIRMAT** | — | 7 648 de linii la h = 0,05 (21,2×), 8 222 la h = 0,02 (19,7×). Reperul vechi: același text pe 3 rânduri și același fișier Roboto, 60°, D 3, pas 0,5 (`DEVLOG.md:39008` și `scripts/test-vcarve-cost.ts:181-182` din ediția întâi) [citit]. Definiția înălțimii literei poate diferi puțin [dedus]. |
| C5 | Aceeași mașinărie dă incrustația (femela = V-carve-ul formei, masculul = V-carve-ul complementului) | **INFIRMAT** | mecanism | Masculul sondei n-are adâncime de start. Fața dopului iese exact S, iar locașul se îngustează sub suprafață, deci dopul nu intră [dedus]. Cu adâncimea de start adăugată (3 linii într-o copie), perechea se potrivește: jocul de pe linia de lipire variază cu 0,034 mm la h = 0,05 și cu 0,015 mm la h = 0,02. [măsurat] |
| C6 | Oracolul sondei ia în calcul „doar bucățile de curbă care sunt chiar granița” | **INFIRMAT** | domeniu | Testul de graniță e făcut la `t = (k+0,5)/N`. Ultima și prima jumătate de interval (până la ~0,005 mm) moștenesc starea vecinului. Pe contururile suprapuse, capătul unei curbe intrate în alt contur rămâne „graniță”. Pe Kunstler raporta **0,0045 peste** (fals); cu reparația dă 0,0015. Altfel e exact: față de oracolul meu independent, diferența e ≤ 0,00006 mm (0,0004 pe Roboto v3). [măsurat] |

## 4. Cazurile noi și măsurătorile

### Metoda și oracolele

- **Bancul.** Am copiat dosarul de lucru al sondei, cu `node_modules`, și am verificat cu `cmp` că `src/`, `oracle/`,
  `corpus.mjs` și `run.mjs` sunt identice cu `cod/` din repo.
  - Generatorul testat e codul sondei, cu h fixat la 0,05. Nu mai depinde de grila oracolului.
  - Variantele sunt în `cod-verificare/var/`, copii marcate `[v2]`: legalizarea instrumentată, legalizarea pe stivă,
    raza algoritmului și adâncimea de start.
- **Oracolul 1 = oracolul sondei** (`oracle/oracle.mjs` + `oracle/sim.mjs`).
  - Am citit sursa: **zero `import`**; distanța exactă pe curbele de intrare; înfășurătoarea analitică a conului pe
    textul G-code.
  - Garda arcelor din post folosește distanța generatorului (`run.mjs:48`), nu oracolul, deci nu există scurgere. [citit]
  - L-am **reparat** la capetele bucăților de graniță (`oracle/oracle-fix.mjs`, 5 linii marcate). Implicit folosesc
    varianta reparată; `ORACOL=probe` o folosește pe cea originală.
- **Oracolul 2** (`oracle2.mjs`), scris de mine, fără cod comun cu sonda sau cu bancul de verificare. Folosește altă metodă:
  - idealul vine din curbele exacte eșantionate la 0,5 µm, cu graniță și interior calculate pe polilinia densă;
  - tăietura vine din eșantionarea traseului G-code la 0,2 µm;
  - eroarea lui: ≤ cot(θ/2)·0,1 µm pe tăietură, sub 1e-5 mm pe ideal;
  - evaluează în ~300 de puncte pe caz: cele mai rele puncte de pe grilă, punctele pe hârtie și puncte aleatoare.
- **Concordanța** (`cross.mjs`, 6 cazuri): |abaterea 1 - abaterea 2| ≤ 0,00006 mm, cu 0,0004 pe Roboto v3. Excepția e
  muchia aproape comună (0,17 mm), discutată mai jos. [măsurat]
- **Controale negative**, fiecare trebuie să cadă:
  - **„circ”:** raza nodului = raza cercului circumscris, dată de algoritm. Sapă 0,0033–0,033 mm (mediana 0,020, de ~12
    ori bugetul) pe 37 din 44 de cazuri. Nu se vede pe cele 7 forme unde raza circumscrisă egalează distanța: cerc, inel,
    canal, stadion, fantă curbă, dreptunghi rotunjit și cercul tăiat cu muchie exactă.
  - **„nolegal”:** fără legalizare. Firma 300×100 rămâne cu 0,4495 mm netăiat, firma 1200×400 cu 1,506 mm (1,611 pe
    fereastra fină).
  - **Deplasare:** G-code mutat cu +0,02 mm pe X. Ambele oracole văd 0,033–0,036 mm peste.

Toate cifrele de mai jos sunt [măsurat], la **h = 0,05**, cu oracolul reparat, dacă nu scrie altfel. Formatul e
„sub / peste” în mm; bugetul la 60° e 0,0139 / 0,0017, iar cu fund plat sub-ul are încă 0,05.

### Corpusul sondei, refăcut la h = 0,05

Toate formele intră în buget, **cu o excepție: plăcuța**.

| Forma | Sub / peste | Linii |
|---|---|---:|
| Literele Roboto v2 / v3 / Garamond | 0,0132 / 0,0130 / 0,0133, peste ≤ 0,0016 | — |
| Inima | 0,0110 / 0,0017 | — |
| Inelul | 0,0063 / 0,0005 | — |
| Firma 300×100 cu fund plat | 0,0540 / 0,0016 | — |
| Canalul 2440 | 0,0494 / 0 | — |
| **Plăcuța de 6 mm** | **0,0163** / 0,0015 | 7 648 |

Pe plăcuță, runner-ul și oracolul **sondei** dau:

| h | Sub ideal | Linii |
|---:|---:|---:|
| 0,05 | 0,0163 | 7 648 |
| 0,04 | 0,0135 | 7 787 |
| 0,02 | 0,0131 | **8 222** |

Rândul de la h = 0,02 reproduce exact cifrele din raportul s3.

### (a) Contur care aproape se atinge pe el însuși

Formele: un „C” (inel 10/6) cu fanta radială de 0,01 și de 0,001 mm, un „C” pătrat cu fanta de 0,01 mm și o variantă cu
freza de 90° și fund plat. Fanta a fost evaluată și pe o fereastră cu grila de 0,001 mm.

| Caz | Sub | Peste | Tăiat în afara regiunii | Tăiat în fantă |
|---|---:|---:|---:|---:|
| C rotund, fanta 0,01 | 0,0121 | 0,0015 | 0,0010 | 0 |
| C rotund, fanta 0,001 | 0,0120 | 0,0014 | 0,0010 | 0 |
| C pătrat, fanta 0,01 | 0,0063 | 0,0009 | 0 | 0 |
| 90°, fund plat D = 1,5 | 0,0511 | 0,0005 | 0,0003 | 0 |

- „Tăiat în fantă” e măsurat strict pe celulele fantei, pe o grilă de 0,0005 mm (0,00025 la fanta de 0,001), cu
  `dbg_fanta.mjs`. Controlul „circ” taie acolo 0,012–0,021 mm.
- Cei 0,0003–0,0010 tăiați în afara regiunii sunt la marginea găurii interioare, nu în fantă. Vin din aplatizarea
  arcului concav, explicată deja în raportul s3.
- Valorile pe hârtie ies: pe axă -3,4641 față de -3,4588 (rotund) și -3,4641 (pătrat); în centrul fantei 0 față de 0; la
  0,3 mm de peretele fantei -0,5196 față de -0,5196.
- **Supraviețuiește.** Controlul „circ” sapă însă 0,021 mm chiar în peretele fantei. Recalcularea razei e cea care
  protejează fanta.

### (b) Muchii comune

- **Două dreptunghiuri cu muchia exact comună:** Clipper le unește.
  - Pe muchia comună: -5,1962 pe hârtie, -5,1962 simulat; abaterea e 0,0001.
  - Semantica „se unesc” e o decizie, nu un fapt: oracolul o împarte cu generatorul, deci n-o poate verifica.
- **Cerc tăiat în două de o cubică S, muchia exact comună:** 0,0009 / 0. Centrul: -6,9282 pe hârtie, -6,9273 simulat.
- **Același cerc, dar a doua jumătate are curba S ca polilinie** (120 de coarde, săgeata ~0,9 µm; săgeata = depărtarea
  maximă dintre coardă și curbă):
  - Clipper produce **110 micro-găuri** (arii de 1,8·10⁻⁷ – 6,3·10⁻⁶ mm²);
  - generatorul lasă cusătura netăiată: centrul 0 față de -6,93 pe hârtie;
  - față de oracolul exact: **sub 3,478 / peste 0,123 / tăiat afară 0,058**;
  - față de propria geometrie normalizată: sub 0,122 / peste 0,0009, deci nu sapă, dar lasă material;
  - cele două oracole diferă între ele cu 0,17 mm.
  - Concluzia: sub ~1 µm, intrarea e ambiguă, iar aplatizarea de 0,5 µm o decide la întâmplare.

### (c) Trăsături foarte subțiri

Liniile (dreptunghiuri) au lungimea de 3,0137 mm (eșantioane decalate) și de 3 mm (eșantioane aliniate). Rezultatele
sunt la h = 0,05; la h = 0,02, sub-ul intră în buget pe toate.

| Lățimea | Sub, h = 0,05 | Sub, h = 0,02 |
|---|---:|---:|
| 0,02 | **0,0169** (tot V-ul de 0,0173, la capătul liniei) | 0 |
| 0,03 | **0,0148–0,0151** | 0,0010 |
| 0,05 | 0–0,0005 | — |
| 0,08 | 0,0077–0,0081 | — |
| 0,1 și 0,2 | 0 | — |
| arc subțire 0,05 / 0,2 | 0,0118 / 0,0097 | — |
| Roboto „Mill&8” cu tulpina de 0,2 mm (majuscula de 1,57 mm) | **0,0147** | 0,0135 |

Peste ≤ 0,0013 peste tot.

### (d) Scara: firma de 1200×400 mm

Firma are 2 rânduri Roboto de 50 mm (60 de caractere cu spații, 54 fără) și o ramă de 15 mm.
- Intrarea: 23 580 de segmente; **344 974 de eșantioane**; 627 546 de triunghiuri.
- `delaunator`: 2,6–2,8 s, cu 12 946 de muchii ne-Delaunay la ieșire.

**Legalizarea sondei:**
- **200 de treceri** (plafonul), 58 831 de întoarceri;
- ultimele treceri încă întorc 236–239 de muchii;
- **230 de muchii ne-Delaunay rămase**;
- 15,9–18,7 s, iar totalul ajunge la 23,5–26,5 s; RSS maxim 0,46–0,54 GB.
- Pe bucăți:
  - doar rama: 200 de treceri, rămân 201 muchii proaste;
  - doar textul: 200 de treceri, cu ultimele treceri întorcând câte o muchie;
  - firma 300×100: 96 de treceri, apoi converge;
  - plăcuța: 2 treceri.
- Toate triunghiurile au orientarea corectă. Nu e un ciclu, ci o propagare lentă de-a lungul rândurilor de puncte
  coliniare.

**Legalizarea cu stivă** (Lawson; reverifică doar cele 4 muchii exterioare ale fiecărei întoarceri, cu aceleași predicate
robuste):
- 0,07–0,08 s, cu 0 muchii ne-Delaunay;
- totalul: **6,5–7,0 s**, RSS 0,46–0,48 GB.

**Calitatea** (grila de 0,25 mm plus ferestre de 0,01 mm):
- sub 0,0139 / peste 0,0017 / tăiat afară 0,0009;
- 33 370 de linii, 8 130 de arce, 72 m de tăiere;
- G-code-ul e **identic** (același SHA-1) cu trecerile și cu stiva: cele 230 de muchii rămase n-au atins axa aici, dar
  nimic nu garantează asta în general.

### (e) Forme doar din arce

Toate în buget. Arcul axei iese ca G2/G3.

| Forma | Sub / peste | Pe hârtie / simulat |
|---|---|---|
| Sector de inel 20/26 | 0,0135 / 0,0015 | axa: -5,1962 / -5,1929 |
| Stadion 30×6 | 0,0016 / 0 | -5,1962 / -5,1958 |
| Fantă curbă R20, lățime 6 | 0,0133 / 0,0014 | axa: -5,1928 |
| Sector cu fund plat D 3 | 0,0502 / 0,0010 | fundul: -3 / -2,9975 |

### (f) Fonturi script din Windows

Fonturile au fost citite local, din `C:\Windows\Fonts`. Nu sunt redistribuibile și nu intră în repo.

| Font | Contururi suprapuse? | Sub / peste, h = 0,05 | h = 0,02 | h = 0,01 |
|---|---|---|---|---|
| Segoe Script „Lemn & Atelier”, 12 mm | da (nonzero 423,121 mm² față de par-impar 417,335) | 0,0128 / 0,0016 | — | — |
| Vivaldi „Andrei Gq”, 15 mm | nu; curbe strânse | **0,0142** / 0,0015 | 0,0139 / 0,0016 | 0,0136 / 0,0015 |
| Kunstler „Manole”, 15 mm | da, plus linii de păr | **0,0209** / 0,0015 | 0,0135 / 0,0019 | 0,0130 / 0,0014 |

- Cu oracolul original al sondei, Kunstler arăta peste = **0,0045**. Forța brută (0,00799) și geometria Clipper
  (0,00798) arată că oracolul punea graniță la 0,00177 mm: capătul unei curbe intrate în alt contur. Vezi C6.

### (g) Unghiuri de freză și fund plat la limită

**„R&8”, 20 mm, la patru unghiuri:**

| Unghiul | Sub | Peste | Bugetul (sub / peste) |
|---:|---:|---:|---|
| 30° | 0,0276 | 0,0035 | 0,0299 / 0,0037 |
| 60° | 0,0128 | 0,0016 | 0,0139 / 0,0017 |
| 90° | 0,0074 | 0,0009 | 0,0080 / 0,0010 |
| 120° | 0,0045 | 0,0008 | 0,0046 / 0,0006 |

**Dreptunghi 12×6 cu freza dreaptă:**
- D la limită, în 4 variante: max·1,002, max - 0,5 µm, max - 0,01 și max - 0,3, la fiecare dintre cele 4 unghiuri.
- Toate valorile pe hârtie ies exact, la 4 zecimale.
- Sub ≤ 0,0497 (creasta fundului plat), peste ≤ 0,0002.
- Felia plată de 0,5 µm nu strică nimic.

**Cercul r 2,5 cu D = max - 0,01:** centrul -4,3201 pe hârtie, -4,3181 simulat.

### (h) Perechea de incrustație

Codul sondei nu poate face un mascul care intră în locaș, pentru că nu are adâncime de start. Am adăugat-o într-o copie,
cu 3 linii (`var/vcarve-var.mjs`, parametrul `S0`): `z = -min(D, S0 + r·cot)`.

**Configurația:**
- forma: „B”, Roboto v2, 20 mm, freză de 60°;
- femela: fund plat Df = 3;
- masculul: Ds = 1,5 (adâncimea de start), Fm = 2,5;
- dopul se întoarce și se coboară cu t.

**Proba e fizică, fără oracol.** Ambele suprafețe vin din simularea textului G-code. Jocul vertical pe pereții V ar
trebui să fie constant, egal cu Ds - t (valoarea pe hârtie).

| h | t (jocul pe hârtie) | Jocul min / mediu / max pe linia de lipire | Masculul pe peretele V |
|---|---|---|---|
| 0,05 | 1,5 (0) | **-0,0329** / -0,0021 / 0,0010, pe 238 628 de celule | 0,0329, la talia lui „B” |
| 0,05 | 1,4 (0,1) | 0,0671 / 0,0979 / 0,1010 | — |
| 0,02 | 1,4 (0,1) | 0,0859 / — / — | 0,0134 |
| 0,01 | 1,4 (0,1) | 0,0860 / — / — | 0,0061 |

- Femela iese cu 0,0122 / 0,0014.
- Masculul, față de idealul cu adâncime de start, iese cu 0,0517 / 0,0013. Valoarea de 0,05 e creasta fundului plat, în
  afara liniei de lipire.

## 5. Ce schimbă în arhitectură

1. **Algoritmul rămâne candidatul (a): Voronoi pe eșantioane, peste `delaunator`, cu raza recalculată exact.**
   - Raza recalculată e cea care face lucrurile corecte (C1c), deci rămâne invariant de cod, cu un test care o
     otrăvește. Testul e controlul „circ”: dacă trece, plasa e oarbă.
2. **Pasul nu mai e o constantă de 0,05.**
   - Pragul: `h ≤ 0,02` pentru trăsături sub ~0,5 mm (text sub ~10 mm, fonturi script, linii fine).
   - Mai bine: un `h` adaptiv, de ~0,4 × lățimea locală, sau rafinare unde axa iese din eșantioane prea rare.
   - Costul: de ~2,3× mai multe eșantioane. Pe plăcuță, timpul trece de la 0,6 la 1,2 s.
   - Bugetul de toleranță primește explicit termenul de eșantionare.
3. **Legalizarea se face pe stivă, nu pe treceri complete, și se verifică.**
   - După ea, un test robust trebuie să numere zero muchii ne-Delaunay.
   - Orice plafon trebuie să arunce eroare, nu să iasă tăcut.
   - Alternativa e un triangulator cu predicate exacte.
4. **Normalizarea regiunii primește „vindecarea” intrării, cu o toleranță declarată** (de exemplu 0,005–0,01 mm):
   - închide fantele și golurile sub toleranță;
   - scoate micro-găurile;
   - lipește muchiile aproape comune;
   - îi spune utilizatorului ce a reparat.
   - Semantica „forme care se ating în aceeași operație” (unire sau separare) e o decizie de produs, pentru owner.
5. **Incrustația are nevoie de adâncimea de start în generator.**
   - Poarta ei e jocul pe linia de lipire, calculat din cele două suprafețe simulate. Nu cere un oracol separat.
   - Jocul minim recomandat e ≥ 0,05 mm la h = 0,05, sau ≥ 0,02 la h = 0,02.
6. **Oracolul de referință păstrează tiparul sondei, cu trei schimbări:**
   - capetele bucăților de graniță se testează explicit (reparația din `oracle-fix.mjs`);
   - un al doilea oracol, prin eșantionare densă, rulează pe un set mic în CI;
   - controalele negative (raza algoritmului, deplasarea cu 0,02 mm) rulează la fiecare schimbare a modulului.
7. **Garda arcelor din post** primește o toleranță în Z scalată cu unghiul, sau bugetul „peste” se scrie ca
   0,0005 + 0,0005·cot(θ/2).
8. **CAM-ul rulează în worker** (rămâne din raportul s3). Pe 345 k de eșantioane, Node a folosit ~0,46 GB, iar în
   browser poate fi mai mult. Planul trebuie să prevadă felierea pe regiuni independente la piese mari.

## 6. Riscuri și ce a rămas neprobat

- **Nimic tăiat în lemn**, niciun controler. Toate cifrele vin din simulare, față de oracole.
- **Garda de săpătură pe coardă** verifică 7 puncte pe coardă. N-am găsit un contraexemplu: fanta de 0,001 mm a avut
  ≤ 0,0010 tăiat în fantă, iar cele 110 micro-găuri, față de propria geometrie, ≤ 0,0006. Dar nici n-am dovedit-o.
- **Timpii sunt pe o mașină încărcată** (4 agenți în paralel), în Node, nu în worker-ul din Edge. Memoria e RSS-ul
  procesului Node.
- **Firma de 1200×400 a fost evaluată pe o grilă de 0,25 mm**, plus două ferestre de 0,01 mm. Nu am făcut grilă fină
  completă.
  - Fundul plat pe firma mare (offseturile Clipper) n-a fost măsurat; sonda a dat 2,8 s pe firma de 300×100.
- **Kunstler la h = 0,02 dă 0,0019 peste**, puțin peste 0,0017. Nu am investigat.
- **Oracolul 2** verifică doar ~300 de puncte pe caz, nu toată grila.
- **Semantica muchiilor comune** (unire) și toleranța de vindecare sunt decizii neluate.
- **Incrustația:** am probat doar „B”, cu un singur set Ds / Df / Fm. Nu am probat dopul cu trăsături mai subțiri decât
  2·Ds·tan(θ/2).
- **Fonturile Windows** sunt folosite doar local; reproducerea grupei (f) pe altă mașină le cere.

## 7. Cum se reproduce

Durează ~2,5 min pe mașina încărcată. Rulează (a), (b), plăcuța la h = 0,05 și 0,02, (c), Kunstler cu ambele oracole,
firma de 1200×400 cu ambele legalizări, incrustația și flo-mat.

```text
cwd:   C:\Users\besli\AppData\Local\Temp\claude\C--Users-besli-Desktop-MyWork-Apps\50bc5be4-b484-49e8-970f-991b3583b938\scratchpad\sonde\v2-vcarve
cmd:   node masoara-v2.mjs
```

Din repo, pe altă mașină:
1. Copiază `../cod/` (`src/`, `oracle/`, `corpus.mjs`, `run.mjs`) într-un dosar.
2. Peste el, copiază `cod-verificare/`, cu subdosarele `var/` și `oracle/oracle-fix.mjs`.
3. Rulează `npm ci`.
   - `package.json` și lock-ul sunt cele ale sondei.
4. Copiază `CNCVectorStudio\public\Roboto-Regular.ttf` în `fonts\Roboto-Regular-v2.ttf`.
5. Rulează `node masoara-v2.mjs`.

Rulări complete:
- `node verif.mjs --grp=a,b,c,e,f,g --variants=probe,circ`: cazurile noi;
- `node verif.mjs --corpus=1 --variants=probe,circ,nolegal --gscale=2`: corpusul sondei la h = 0,05;
- `node cross.mjs`: concordanța cu oracolul 2;
- `node dbg_legal.mjs`: convergența legalizării.
