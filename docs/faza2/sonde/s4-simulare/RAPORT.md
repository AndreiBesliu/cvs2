# Sonda s4: nucleul de simulare și oracolul

Sondă aruncabilă din Faza 2, tranșa 1. Codul din `cod/` e doar dovadă pentru decizie, nu cod de produs.
Data: 07.10.2026. Mașina: Ryzen 9 7950X (32 de fire), RTX 3060, Windows 11, Node 26.10, Edge 154.
Pe mașină rulau în paralel alte 9 sonde, deci timpii absoluți sunt umflați (vezi §4.8).

Marcaje: **[măsurat]** = am rulat; **[citit]** = documentație sau sursă, cu link; **[dedus]** = inferență.

---

## 1. Întrebarea

`BRIEF.md` §13 cere două lucruri:
- **un singur nucleu de simulare**, folosit și de ecran, și de teste;
- **un oracol mic**, scris altfel și fără cod comun cu nucleul.

`LECTII.md` §4.6 propune pentru nucleu o **hartă de înălțimi pe dale**:
- **harta de înălțimi** e o grilă în care fiecare celulă ține cât de jos a coborât scula deasupra ei;
- grila e împărțită în pătrate, numite **dale**, care se alocă doar unde se taie;
- rezoluția se leagă de **kerf**, adică lățimea tăieturii.

Sonda avea de decis:
1. **Unde rulează nucleul.** Variantele:
   - pe procesor, în JavaScript cu tablouri tipizate, în **workere** (fire de lucru paralele din browser);
   - în **WASM** din AssemblyScript (cod compilat, rulat în browser);
   - în **WebGPU compute** (calcul pe placa video);
   - un hibrid.
2. **Cum stau datele:** mărimea dalei, alocarea rară, rezoluția și formatul celulei.
3. **Dacă același nucleu dă exact același rezultat** în Node (teste) și în browser (ecran).
4. **Cum arată oracolul** și dacă prinde greșeli reale.

## 2. Pe scurt

**Recomandarea: nucleul rulează pe procesor, în TypeScript simplu, cu tablouri tipizate.**
- Câmpul e rar, pe dale de Float32, iar calculul rulează într-un grup de workere.
- Placa video doar **desenează** rezultatul.
- Nucleul calculează **exact pe fiecare celulă**, fără eșantionare de-a lungul mutării.

Ce a ieșit:
- **16 piese cu valoare pe hârtie: 0 celule greșite**, eroare maximă 1,2·10⁻⁷ mm [măsurat];
- **20 de piese comparate cu oracolul: nucleul n-a lăsat niciodată material pe care oracolul l-a tăiat**. A
  21-a piesă e o aproximare declarată, de cel mult 0,94 µm [măsurat];
- **același rezultat bit cu bit** în Node și în Edge, pe 1, 4, 8 sau 16 fire și la fiecare repetare
  [măsurat].

Timpii:
- **jobul 2D tipic** (194 208 mutări pe placa de 2440×1220): **0,62 s la celula de 0,25 mm** și **3,9 s la
  0,1 mm** pe un fir. La 0,1 mm coboară la **0,51 s pe 16 fire** [măsurat];
- **rastrul 3D de 5 M mutări** pe 300×300 mm la 0,1 mm: **42,9 s pe un fir**, **4,3 s pe 16 fire**
  [măsurat].

Alternativele:
- **WebGPU e de 57–130 de ori mai rapid decât un fir**: 631 ms pentru 5 M mutări [măsurat]. Dar nu e
  identic bit cu bit cu procesorul (diferență maximă 0,18 µm) și nu rulează în CI, care n-are placă video.
  Deci nu poate fi nucleul verificat de teste;
- **WASM nu aduce nimic**: 1,05–1,08× pe cod identic [măsurat].

## 3. Candidații

| Candidat | Licență | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| **JS cu tablouri tipizate** (Float32Array), dale rare, workere | cod propriu, fără dependențe | Nucleul: Z minim pe celulă, formule închise pe celulă | 2D: 0,62 s (0,25 mm), 3,9 s (0,1 mm) pe un fir, 0,51 s pe 16 fire. 3D 5 M: 42,9 s pe un fir, 4,3 s pe 16. Identic bit cu bit în Node, în Edge și la orice împărțire pe fire | **ales ca nucleu** |
| **WASM din AssemblyScript** 0.28.20 | Apache-2.0 [citit](https://github.com/AssemblyScript/assemblyscript/blob/main/LICENSE) | Același nucleu de bilă, compilat `-O3` | 1,05× și 1,08× în două rulări; 0 celule diferite | **respins**: niciun câștig; încă un limbaj și un compilator |
| **WebGPU compute** (WGSL, `atomicMin` pe întregi) | API de browser, fără bibliotecă | Fiecare fir GPU calculează o celulă dintr-o mutare și păstrează minimul | 1 M mutări: 53–163 ms (6,9–7,2 s pe un fir CPU, aceeași pagină). 5 M: 631 ms (35,8 s pe CPU, 57×). 89,6–98,8 % celule identice bit, diferență max 0,18 µm | **nu ca nucleu**; accelerator opțional mai târziu |
| **Hibrid** | — | Procesorul calculează adevărul; placa video desenează | — | **ales** |
| **Oracolul** (JS, zero importuri) | cod propriu | Citește textul G-code-ului, grilă densă Float64, eșantionare brută la cell/8 | 0,01–3 s pe piesă; ~27 s tot corpusul. A găsit un defect real din prima rulare (§4.2) | **ales ca judecător** |
| opentype.js 2.0.0 (doar teste) | MIT [citit](https://github.com/opentypejs/opentype.js/blob/master/LICENSE) | Citește conturul literelor dintr-un font | Folosit la piesa „litere-Bg” | ok pentru teste |
| playwright-core 1.63.0 (doar teste) | Apache-2.0 [citit](https://github.com/microsoft/playwright/blob/main/LICENSE) | Pornește Edge cu fereastră | — | ok pentru teste |

Nimic din ce ar ajunge în aplicație nu are licență GPL, AGPL sau LGPL: nucleul nu are dependențe.

## 4. Măsurători

### 4.1 Cum lucrează nucleul (ca să se înțeleagă cifrele)

- **Celula ține Z-ul minim** atins de suprafața sculei deasupra centrului ei. „Cea mai adâncă tăietură
  câștigă”, deci ordinea mutărilor nu contează. Am demonstrat asta în §4.5.
- **Scula e o siluetă h(r)**: înălțimea muchiei tăietoare deasupra vârfului, la raza r. Plata are h = 0, bila
  are un sfert de cerc, iar V-ul o dreaptă. O freză de profil are o linie frântă oarecare.
- **Pe fiecare celulă, nucleul rezolvă exact „cât de jos ajunge scula aici în timpul acestei mutări”:**
  - linie 3D cu plată, bilă sau V: formulă închisă. E minimul unei funcții convexe pe intervalul în care
    scula acoperă celula;
  - linie sau arc la Z constant, cu orice h(r): distanța exactă de la celulă la linie sau la arc;
  - elice cu plată: interval exact de unghiuri pe cerc.
- **Ce e aproximat, declarat:**
  - elicea cu bilă, V sau profil: coarde cu săgeata ≤ cell/20;
  - freza de profil pe rampă: ștampile la pas de cell/4.
- **Determinismul:**
  - liniile și arcele la Z constant folosesc pe celulă doar + − × ÷ √ min max. Aceste operații sunt exacte
    după IEEE (standardul pentru numere cu virgulă), atât în V8, cât și în WASM;
  - **excepție:** elicea plată exactă folosește `acos` și `atan2` pe celulă. În V8 au dat același rezultat
    în Node și în Edge, iar jobul 2D are 384 de găuri elicoidale. Rămâne totuși un risc între versiuni (§6).
- **Dala** din sondă are 64×64 celule Float32 (16 KB). Se alocă la prima celulă tăiată sub fața plăcii.
  Mărimea recomandată pentru produs e mai mică (§4.6).

### 4.2 Corectitudinea: hârtie și oracol [măsurat]

**Metoda.** Am folosit trei surse de adevăr, fără cod comun:
1. **Nucleul** primește IR-ul: mutările ca numere, cu arcele native.
2. **Oracolul** primește **textul G-code-ului** și are parserul lui:
   - G0/G1/G2/G3;
   - I/J sau R, inclusiv R negativ pentru arc peste 180°;
   - G90/G91, G20/G21 și comentarii.

   Eșantionează fiecare mutare la pas de cell/8 și aplică scula pe o grilă densă Float64. Are formulele lui:
   bila prin `cos(asin(r/R))`, V-ul prin `cos/sin`.
3. **Valoarea pe hârtie**: o formulă închisă pe piesă, scrisă în test și evaluată pe **fiecare** celulă.

**Proprietatea folosită la compararea cu oracolul.** Oracolul eșantionează, deci nu poate găsi un punct mai
adânc decât minimul exact. Rezultă două reguli:
- nucleul **mai sus** decât oracolul cu peste 10 nm înseamnă că nucleul a lăsat material, deci e o **greșeală
  de nucleu**;
- nucleul mai jos decât oracolul e permis doar cât marja de eșantionare (panta × pas / 2).

**Corpusul.** Celula e 0,05 mm, dacă nu scrie altfel.

| Piesa | Valoarea pe hârtie | Rezultat nucleu |
|---|---|---|
| Șanț plat Ø6, z = −3 | lățime 6, adâncime −3 exact | 0 celule greșite din 960 000. Lățime 120 × 0,05 = **6,000 mm**, adâncime **−3** exact |
| Șanț cu bilă Ø6, z = −2 | secțiunea e un cerc de rază 3, cu centrul la z = +1 | Cerc ajustat pe 114 puncte: **R = 3,00000**, centru z = **1,00000**. Eroare max 6·10⁻⁸ mm |
| Șanț V 90° | pereți cu pante ±1, adică unghi drept | Pante **−1,00000 / 1,00000**, unghi **90,0000°** |
| Șanț V 60° | pante ±1,73205 | Pante **±1,73205**, unghi **60,0000°** |
| Arc G3 de la 30° la 120°, r 25; același arc ca G2 scris cu R | lățime radială 6 | 0 celule greșite din 2,56 M. G2 cu R e **identic bit cu bit** cu G3 |
| Cerc complet G3 (I/J); arc de 270° cu R negativ | inel între 12 și 18 mm | 0 celule greșite |
| Plonjare cu plată; plonjare cu bilă | gaură de rază 3 la −5; emisferă | 0 celule greșite |
| Rampă cu plată (0 → −3 pe 30 mm) | pe celulă, minimul liniar pe intervalul acoperit | 0 celule greșite, eroare 1,2·10⁻⁷ |
| Sculă de profil h(r): fund 4 mm, pereți la 45° | lățime 4 jos, 8 sus | 0 celule greșite |
| Trăsătură de **0,01 mm**: V60 la z = −0,01, celula 0,002 | z = −0,01 + 1,732·d | Eroare 1,5·10⁻¹⁰ mm. Cea mai adâncă celulă e la −0,00827, fiindcă niciun centru de celulă nu cade pe traseu |
| Placa **2440×1220** la 0,25 mm: linie de 2430 mm + arc cu r 1000 | lățime 6 la capete și la mijloc | 0 celule greșite din 148 724 verificate în 5 ferestre; 254 de dale din 11 781 |
| Linie + arc tangent + linie | fără cocoașă la joncțiuni | 0 celule greșite |
| Două șanțuri la 6,001 mm (creastă de 0,001 mm) | creasta nu conține niciun centru de celulă | 0 celule greșite |
| Șanț dublat (dus-întors) | identic cu un singur șanț | **identic bit cu bit** |
| Litere reale „Bg” (Arial, 2 191 de mutări, V60 la −0,5) | doar oracolul | 0 celule mai sus. 686 de celule mai jos cu ≤ 5,1 µm, în marja oracolului (1,732 × 0,003125 = 5,4 µm) |
| Rampe cu bilă și cu V, elice cu plată | doar oracolul | 0 celule mai sus. Diferențe ≤ 3,1 µm, în marja de eșantionare |

**Totalul:**
- pe hârtie: **0 celule greșite în 16 piese**;
- față de oracol: **0 celule în care nucleul lasă material tăiat de oracol, în 20 de piese**.

Singura abatere e **declarată**: freza de profil pe rampă, făcută cu ștampile. Acolo nucleul e mai sus cu
cel mult 0,94 µm, pe 35 437 de celule, și e lent: 357 ms pentru o rampă de 30 mm.

Lățimea radială pe arc a ieșit între 6,000 și 6,013 mm. Diferența de 0,013 vine din pasul de măsură, de
0,0125 mm, nu din nucleu: nucleul are 0 celule greșite pe hârtie.

**Oracolul a prins un defect real, din prima rulare.** Elicea era aproximată prin coarde, iar coardele stau
*în interiorul* arcului, cu săgeata de 2,5 µm. Peretele frezei plate e vertical. Așa că celulele aflate la
mai puțin de 2,5 µm în afara peretelui rămâneau netăiate:
- **13 341 de celule** erau mai sus decât oracolul;
- **49 dintre ele cu peste 0,1 mm**, cel mult **1,98 mm**.

Reparația: o elice exactă pe celulă, pentru freza plată. După ea, **0 celule** [măsurat].

Acesta e exact genul de defect care în ediția întâi se vedea doar cu ochii owner-ului (`docs/faza0/05` §2,
rândul 4).

### 4.3 Dinții verificărilor: otrăvuri [măsurat]

Am injectat pe rând în nucleu șapte greșeli plauzibile. Corpusul curat pică o singură verificare: abaterea
declarată de mai sus. Orice verificare picată în plus înseamnă că otrava a fost prinsă.

| Otrava | Verificări picate |
|---|---|
| testul de baleiaj al arcului cu „sau” în loc de „și” | 4 |
| V-ul cu `tan` în loc de `1/tan` | 4 |
| rampa plată ia capătul greșit al intervalului | 3 |
| bila cu `R² − d` în loc de `R² − d²` | 3 |
| centrul celulei la `i` în loc de `i + 0,5` | 28 |
| intervalul pe rând fără deplasarea `+ax` (un bug real, făcut și reparat în timpul sondei) | 4 |
| elicea plată ia capătul greșit | 2 |

Toate cele 7 otrăvuri au fost prinse.

### 4.4 Debit [măsurat]

Valorile sunt mediana a 5 repetări pe un fir și a 3 repetări pe mai multe fire.

**Jobul 2D** e sintetic, dar are forma unui job real:
- 24 de piese decupate în 4 treceri, cu colțuri G3;
- 384 de găuri frezate elicoidal;
- 12 buzunare cu inele din linii și arce;
- 12 zone de V-carve, cu 185 760 de mutări scurte și Z variabil.

**Rastrul 3D:**
- bilă Ø3, pas lateral 0,15 mm, mutări de 0,12 mm;
- relief între 0,7 și 7,3 mm adâncime;
- 2 001 linii, adică 5 004 500 de mutări.

| Job | Celula | 1 fir, Node | 1 fir, Edge | Mai multe fire, Node (1 / 4 / 8 / 16) |
|---|---|---|---|---|
| 2D, 194 208 mutări, placa întreagă | 0,25 mm | **620 ms** (313 k mutări/s) | 663–761 ms | — |
| 2D, același job | 0,1 mm | **3 941 ms** (49 k mutări/s) | 3 456 ms | 4 306 / 1 213 / 678 / **508 ms** (8,5×) |
| 3D, 1 M mutări (400 de linii) | 0,1 mm | **8 466 ms** (118 k mutări/s) | 6 900–7 274 ms | — |
| 3D, 5 M mutări (complet) | 0,1 mm | **42 901 ms** (117 k mutări/s), o rulare | 35 761 ms | 41 739 / 12 014 / 6 892 / **4 276 ms** (9,8×) |
| 3D, 1 M mutări, **WebGPU** | 0,1 mm | — | **53–163 ms**, plus 28–34 ms citirea grilei | — |
| 3D, 5 M mutări, **WebGPU** | 0,1 mm | — | **631 ms** (628–637), plus 28 ms citirea grilei | — |

**Debitul pe celulă la rastrul 3D** [dedus din geometrie]:
- o mutare acoperă ~743 de celule (πR² + 2RL = 7,43 mm² la 0,1 mm), deci 5 M mutări vizitează ~3,7·10⁹
  celule;
- pe un fir CPU, asta înseamnă **~87 M celule/s**;
- pe GPU: 1 225 de fire pe mutare, adică **~23·10⁹ fire/s**, din care ~14·10⁹ celule utile/s.

**Două optimizări care n-au schimbat nimic din rezultat.** Amprenta a rămas `2aa0c5b086544eed`, iar corpusul
a rămas verde [măsurat]:
- **raza efectivă:** un V la −0,5 mm taie doar pe o rază de 0,29 mm, nu pe toată raza sculei. Literele au
  coborât de la 393 ms la 8,5 ms;
- **sărirea celulei deja mai adânci decât vârful mutării:** rastrul 3D a crescut de la 89 k la 171 k
  mutări/s, pe același subset.

**JS față de WASM.** Același cod de bilă, pe grilă densă, cu rulările alternate:
- pe 500 199 de mutări: JS **2 892 ms**, WASM **2 758 ms**, raport **1,05**;
- pe 250 099 de mutări: JS 1 426 ms, WASM 1 319 ms, raport 1,08;
- în ambele: **0 celule diferite** [măsurat].

### 4.5 Determinism [măsurat]

**Amprenta** e un rezumat de 64 de biți (FNV-1a) al tuturor dalelor alocate. Două câmpuri cu aceeași
amprentă au, practic, aceleași celule.

| Ce s-a comparat | Rezultat |
|---|---|
| Node 26.10 vs Edge 154, job 2D la 0,25 mm | `a589e7d3091176b8` în ambele: **identic** (3 rulări în Edge) |
| Node vs Edge, job 2D la 0,1 mm (301 M celule) | `b00917a30715ff44` în ambele: **identic** |
| Node vs Edge, rastru 3D de 1 M mutări la 0,1 mm | `2aa0c5b086544eed` în ambele: **identic** |
| 1, 4, 8, 16 fire (rânduri de dale intercalate) | 2D: `b00917a30715ff44`, 3D 5 M: `337e209a07a0b6bb`. **Identic** la orice N |
| 5 repetări ale fiecărei măsurători | identic: scriptul se oprește la prima diferență |
| JS vs WASM | 0 celule diferite |
| Înainte și după cele două optimizări | identic |
| **GPU vs CPU**, cuantizat la 10 nm | 1 M: **98,8 %** celule identice. 5 M: **89,6 %**. Restul diferă cu **≤ 0,18 µm**. Același număr de celule tăiate (9 180 351) |
| Chromium 1228 (buildul Playwright) | **nemăsurat**: nu a pornit în mediul sondei (`spawn UNKNOWN`). Edge e tot Chromium cu V8 |

Concluzia [dedus]: procesorul poate fi nucleul comun pentru ecran și teste. Placa video nu poate, decât dacă
testele acceptă o toleranță și rulează pe o mașină cu placă video.

### 4.6 Memoria pe placa întreagă [măsurat]

Placa de 2440×1220 mm, densă, cu Float32:
- la **0,25 mm**: 48,2 M celule = **184 MB**;
- la **0,1 mm**: 301 M celule = **1 150 MB**, ceea ce nu încape realist într-o filă de browser.

Jobul 2D taie 19,2 % din suprafață.

Tabelul arată memoria cu dale rare, după mărimea dalei. **Dala uniformă** are toate celulele egale, de
exemplu fundul unui buzunar sau o decupare completă. Ea se poate ține ca un singur număr. **u16** înseamnă
un întreg pe 2 octeți, relativ la fața plăcii.

| Mărimea dalei | 0,25 mm: Float32 | 0,25 mm: + uniforme comprimate | 0,25 mm: u16 + uniforme | 0,1 mm: Float32 | 0,1 mm: + uniforme comprimate | 0,1 mm: u16 + uniforme |
|---|---|---|---|---|---|---|
| 16×16 | 53 MB | 36 MB | 18 MB | 271 MB | **112 MB** | **56 MB** |
| 32×32 | 74 MB | 58 MB | 29 MB | 324 MB | 193 MB | 96 MB |
| 64×64 (cea din sondă) | 116 MB | 101 MB | 50 MB | 430 MB | 329 MB | 165 MB |
| 128×128 | 150 MB | 140 MB | 70 MB | 617 MB | 525 MB | 262 MB |

Rastrul 3D pe 300×300 la 0,1 mm ocupă **36 MB** (2 304 dale, toate alocate).

**Viteza cu dale mai mici nu e măsurată.** Bucla schimbă dala mai des, deci e probabil puțin mai lentă
[dedus].

### 4.7 Placa video [măsurat]

- **Edge 154, cu fereastră:**
  - WebGL raportează `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)`;
  - adaptorul WebGPU e `vendor: nvidia, architecture: ampere`, cu `maxStorageBufferBindingSize` de 2 GB.
- **Placa e reală, nu SwiftShader** (redarea în software), deci cifrele GPU sunt valide pentru această
  mașină.
- **Nucleul GPU** folosește aceeași formulă de bilă, în f32 (numere cu virgulă pe 32 de biți):
  - Z-ul se ține ca întreg, în unități de 10 nm;
  - `atomicMin` (minim atomic, sigur când mai multe fire scriu în aceeași celulă) păstrează valoarea cea mai
    mică.
- **Lansarea:** câte 65 535 de mutări pe apel și câte 8 apeluri pe trimitere. Așa nu se atinge limita de 2 s
  a Windows pentru o comandă GPU (TDR).
- **Prima rulare a costat 255 ms** în loc de 55 ms: compilarea și încălzirea. O rulare întreagă a dat
  108–167 ms, probabil pentru că placa era folosită și de alte sonde [dedus].

### 4.8 Zgomotul

- În timpul măsurătorilor rulau alte 9 sonde. Timpii absoluți sunt umflați și variabili:
  - jobul 2D la 0,1 mm a dat între 3,3 și 4,4 s;
  - subsetul 3D a dat între 6,8 și 8,7 s.
- Comparațiile relative au fost făcute în aceeași rulare: JS cu WASM alternat, GPU cu CPU în aceeași pagină.
- Scalarea pe fire e cea mai afectată, fiindcă firele erau împărțite cu celelalte sonde. Pe o mașină liberă,
  16 fire ar trebui să dea mai mult decât 8,5–9,8× [dedus].
- Comanda din §7 reface totul pe o mașină liberă.

## 5. Ce schimbă în arhitectură (decizii pentru plan)

1. **Nucleul de simulare e un modul TypeScript fără dependențe**, cu tablouri tipizate.
   - Rulează identic în Node (teste) și în browser (ecran, în workere).
   - Ecranul și testele citesc **același** câmp, cum cere `BRIEF.md` §13.
2. **Regula de determinism:**
   - în bucla pe celulă doar + − × ÷ √ min max;
   - trigonometria e permisă o dată pe mutare;
   - elicea plată se rescrie fără `acos/atan2` pe celulă, prin compararea cosinusurilor;
   - plasa e **un test care compară amprenta din Node cu cea din browser** pe corpus, nu un regex pe sursă.
3. **Reprezentarea:**
   - câmp de înălțimi rar, cu valoarea = Z minim; „cea mai adâncă tăietură câștigă”, deci ordinea mutărilor
     nu contează;
   - **dale mici, de 16×16 sau 32×32, într-un atlas**: un singur buffer cu locuri pentru dale și un tabel de
     index, nu câte un obiect pe dală;
   - **dalele uniforme se țin ca un singur număr.**
   - Mărimea exactă se fixează după o măsurătoare de viteză în nucleul real.
4. **Calcul exact pe celulă, nu ștampile de-a lungul traseului**, pentru toate cazurile frecvente:
   - plată, bilă și V pe segment 3D;
   - orice h(r) la Z constant, pe linie și pe arc;
   - elicea plată.

   Ce rămâne de făcut în produs:
   - **profilul pe rampă**, ca sumă de trunchiuri de con: fiecare bucată a profilului e formula V,
     deplasată. Ștampilele din sondă sunt lente și dau ~1 µm;
   - **elicea cu bilă, V sau profil**, exactă sau cu coarde deplasate în afară. Coardele interioare lasă
     material, cum a arătat §4.2.
5. **IR-ul traseului are arcele native** (centru și sens) și **z0/z1** pe fiecare mutare (`LECTII.md` §4.4).
   Nucleul le folosește direct. Un arc nu se sparge în segmente înainte de simulare.
6. **Paralelismul:**
   - un grup de workere, fiecare cu **rândurile de dale intercalate**: rândul r merge la firul r mod N;
     rezultatul nu depinde de N (§4.5);
   - mutările se trimit fiecărui worker doar pentru banda lui, ca tablouri transferate, nu prin
     `SharedArrayBuffer`. Memoria partajată cere izolare cross-origin, adică antetele COOP/COEP, care se bat
     cap în cap cu ferestrele de login și de plată [dedus].
7. **Rezoluția:**
   - **implicit 0,25 mm pe placa întreagă**: 0,6 s pe un fir;
   - **0,1 mm la cerere sau pe o fereastră**. O fereastră e un al doilea câmp, cu celula lui, peste zona fină
     (litere mici, V-carve);
   - regula propusă: **celula ≤ kerf minim / 4**. Un șanț mai îngust decât o celulă poate dispărea complet.
     V60 la −0,01 mm are kerful de 0,0115 mm [măsurat la celula 0,002; dedus pentru 0,1].
8. **Memoria la 0,1 mm pe placa întreagă:**
   - cu dale de 16 și uniformele comprimate, scade de la 1 150 MB la **112 MB** în Float32 sau **56 MB** în
     u16 [măsurat];
   - **u16** înseamnă pași de 1–2 µm. E mult sub toleranța lemnului, dar se pierde egalitatea „la precizia
     Float32” din testele pe hârtie. Se decide în plan.
9. **Placa video desenează câmpul**, încărcând doar dalele modificate. **Calculul pe GPU nu intră în v1.**
   - E candidat în v1.x, ca accelerator al previzualizării 3D mari.
   - Atunci vine cu o probă automată față de nucleul CPU (toleranță 1 µm), pe o mașină cu placă video.
   - Rezultatul final afișat rămâne cel al nucleului CPU.
10. **WASM nu se folosește** pentru simulare. Un câștig de 1,05–1,08× nu plătește încă un limbaj și un
    compilator.
11. **Oracolul:**
    - stă într-un folder separat, cu **zero importuri** (plasă: o regulă de lint care interzice importul din
      `src`);
    - citește **textul G-code-ului** produs de post, cu tot dialectul;
    - judecă brut, cu o marjă scrisă (panta × pas / 2);
    - verifică pe fiecare celulă regula „nucleul nu e niciodată mai sus decât oracolul cu peste 10 nm”;
    - rulează în CI pe corpusul de referință: ~27 s pentru 22 de piese, aici;
    - fontul pentru piesa cu litere trebuie să fie unul liber (OFL), din npm. Arial s-a folosit doar local.
12. **Corpusul cu valori pe hârtie și campania de otrăvuri** devin suite din ziua 1. O metrică nouă intră doar
    după ce o otravă o înroșește.
13. **Calibrarea pe lemn** (`BRIEF.md` §13) se face o dată, pe o placă de probă. Șanțurile din corpus (plat,
    bilă, V90, V60, arc, plonjare) sunt candidatele naturale pentru cotele de pe placă.

## 6. Riscuri și ce a rămas neprobat

- **Scalarea cu Web Workers în browser nu e măsurată.** Am măsurat-o în Node, cu `worker_threads`, pe același
  V8. Browserul adaugă costul transferului și limita de memorie a filei [dedus].
- **`acos/atan2` pe celulă**, la elicea plată, au dat același rezultat în Node 26 și Edge 154. Un browser cu
  altă implementare de `Math` ar putea diferi pe ultimul bit (§5.2).
- **Rastrul 3D e sintetic.** Z-ul urmează direct o funcție de relief, nu un drop-cutter real, adică
  calculul care coboară scula pe model până la contact.
- **Timpul crește cu aria sculei.** S-a măsurat cu bilă de Ø3; o bilă de Ø6 costă ~3,5× pe mutare
  [dedus].
- **Rămân aproximate** elicea cu bilă, V sau profil și profilul pe rampă (§5.4). N-am măsurat coardele la
  bilă și la V față de oracol.
- **Arcele în alte plane (G18/G19)** nu sunt suportate nici de nucleu, nici de oracol.
- **Axa a 4-a** (câmp cilindric r(x, θ)) **nu e probată**. E v1.x în `BRIEF.md` §2.
- **Câmpul de înălțimi nu poate reprezenta subtăieri.** Coada de rândunică și o freză cu umăr invers nu se
  pot simula.
- **Oracolul e scris tot în JavaScript.**
  - Convențiile comune (sensul G2/G3, centrul celulei) pot greși la fel în amândouă. Plasa e valoarea pe
    hârtie, care nu depinde de niciunul.
  - Un oracol în Python ar fi mai independent, dar aduce încă o unealtă în CI.
- **Cifrele GPU vin de pe o singură mașină** (RTX 3060). Nu sunt măsurate placa integrată AMD și mașina
  owner-ului.
- **Plasa (meshul) pentru desen** nu e probată aici. Redarea câmpului ține de sondele de pânză și de relief.
- **Viteza cu dale de 16 sau 32 și atlasul** nu sunt măsurate (§4.6).
- **Timpii sunt măsurați pe o mașină încărcată** (§4.8).

## 7. Cum se reproduce

Din spațiul de lucru al sondei (are deja `node_modules`):

```
cd C:\Users\besli\AppData\Local\Temp\claude\C--Users-besli-Desktop-MyWork-Apps\50bc5be4-b484-49e8-970f-991b3583b938\scratchpad\sonde\s4-simulare
node masoara.mjs
```

Din copia din repo: `cd docs\faza2\sonde\s4-simulare\cod`, apoi `npm install`, apoi `node masoara.mjs`.

Comanda rulează pe rând:
1. corpusul (nucleu vs hârtie vs oracol). Verdictul așteptat e `1 verificări picate`, adică abaterea
   declarată de la profil-rampa;
2. debitul în Node, varianta scurtă: 3 repetări, subset 3D de 1 M mutări, 1 și 8 fire;
3. JS față de WASM. WASM-ul se compilează automat, dacă lipsește;
4. Edge cu fereastră: aceeași amprentă ca în Node, plus WebGPU.

La final scrie `DETERMINISM Node = Edge: … IDENTIC`.

Pe mașina asta, încărcată, a durat **146 s**. Fără browser: `node masoara.mjs --fara-browser`.

Rulările complete, mai lungi:
- `node bench/bench-node.mjs`: 5 repetări, 5 M mutări, 1/4/8/16 fire;
- `node web/run-browser.mjs msedge`;
- `node bench/memorie.mjs`;
- `node test/poisons.mjs`.

Rezultatele brute sunt în `cod/rezultate/`.
