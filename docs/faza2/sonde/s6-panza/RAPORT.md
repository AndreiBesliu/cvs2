# Sonda s6-panza: cum desenează pânza

Faza 2, tranșa 1, 07.10.2026. Codul din `cod/` e **aruncabil**: există doar ca dovadă pentru decizie, nu e cod de
produs. Marcaje: **[măsurat]** = am rulat; **[citit]** = sursă sau documentație, cu trimitere; **[dedus]** = concluzie
din cele două.

Termeni, explicați o dată:
- **randare** = transformarea geometriei în pixeli pe ecran;
- **teselare** = înlocuirea unei curbe cu segmente drepte (sau triunghiuri), făcută o dată și apoi refolosită;
- **Canvas2D / Path2D** = desenul 2D al browserului. În Edge și Chrome îl face Skia, pe placa video (GPU);
- **WebGL2** = acces direct la GPU din pagină. **Instanțiere** = un program mic, desenat o dată pentru fiecare segment;
- **DPR** (devicePixelRatio) = câți pixeli fizici are un pixel CSS. Scalarea Windows de 125 % / 150 % dă 1,25 / 1,5;
- **mediana** = valoarea din mijloc; **p95** = valoarea sub care cad 95 % din cadre;
- **index spațial** (R-tree) = o structură care găsește repede formele dintr-o zonă, fără să le parcurgă pe toate;
- **regula de umplere** = cum se decide ce e „înăuntru": `nonzero` (după sensul de parcurgere al contururilor) sau
  `evenodd` (după paritate: o gaură e gaură oricum ar fi orientată);
- **linie-păr** (hairline) = linie de exact 1 pixel fizic, pe care Skia o desenează pe o cale rapidă.

## 1. Întrebarea

Ce arhitectură de randare are pânza, ca să îndeplinească BRIEF §16.2 și `LECTII.md` §4.7–4.9:
- vectori reali (linie, arc, cubică, text), clari la orice zoom;
- pan și zoom la 60 de cadre pe secundă (16,7 ms pe cadru), cu 10 000–50 000 de căi;
- trasee de sculă de 1–5 milioane de segmente și un strat de simulare (hartă de înălțime);
- hit-test exact (ce formă e sub cursor), cu **o singură regulă de umplere** pentru ecran, clic și sculă;
- mânere de selecție și Pointer Events, la DPR 1, 1,25 și 1,5.

Și ce bugete, în cifre, intră în plan.

## 2. Pe scurt

Recomand o **pânză hibridă, pe straturi**: jos un strat **WebGL2 propriu** pentru trasee și simulare, deasupra un
strat **Canvas2D cu Path2D** pentru vectori, iar deasupra lui un strat de interacțiune (mânere, previzualizări).
Canvas2D desenează curbele exact: la 1000 px/mm, marginea cercului de 50 mm a ieșit la 0,04–0,09 px de cercul
adevărat; PixiJS a ieșit la 11–29 px, exact cât prezice calculul pe hârtie din cele 92 de vârfuri ale lui
[măsurat]. Redesenul exact costă cât e vizibil (10 k forme: 22,6 ms; 50 k: 77–120 ms), așa că în timpul unui gest
pe scene mari stratul vectorial arată bitmapul ultimei randări exacte și se redesenează exact după gest. Așa,
stiva completă (50 k vectori, 5 M segmente, hartă de înălțime rescrisă la fiecare cadru) **n-a pierdut niciun cadru
la 60 Hz**, la DPR 1 și 1,5 [măsurat]. Liniile vectorilor trebuie să aibă **1 pixel fizic**: cu 1 pixel CSS la
DPR 1,25 și 1,5, Skia iese de pe calea rapidă și redesenul a costat de 6–13 ori mai mult (10 k: 330 ms în loc de 29 ms)
[măsurat]. Hit-test-ul și regula de umplere stau în nucleul geometric: flatbush + distanța exactă dau 0,012–0,047 ms
pe clic la 20–50 k forme, cu 0 greșeli față de oracolul analitic; regula **evenodd** a dat 0 diferențe între ecran,
nucleu și `isPointInPath` [măsurat].

## 3. Candidații

| Candidat | Licență | Ce face | Ce am măsurat (DPR 1, 50 k forme) | Verdict |
|---|---|---|---|---|
| **Canvas2D + Path2D** (din browser) | parte din browser, nimic de livrat | Skia rasterizează arcul și Bézier-ul ca atare, pe GPU, la orice transformare | abatere 0,04–0,09 px la 1000 px/mm; redesen exact 77–120 ms (10 k: 22,6 ms); cu bitmap în gest: 5,3–7,4 ms; linie 1 px CSS la DPR 1,25–1,5: de 6–13 ori mai lent | **DA**, stratul vectorial |
| **PixiJS v8.22** | MIT (dependențe: ISC, MIT, BSD-3) | scenă WebGL; teselează curbele o dată, în unitățile locale | 2,2 ms pe cadru; abatere 11–29 px la 1000 px/mm (cercul are 92 de vârfuri, arcul 44); teselat în µm: 0,17–0,28 px, dar 8,9 ms și 2,6 s construcție; fără regulă de umplere în WebGL | **NU**: aproximare ascunsă, ticker implicit (D1 din ediția întâi) |
| **CanvasKit 0.42** (Skia în WASM) | BSD-3-Clause | Skia compilat în WebAssembly, desen prin WebGL | abatere 0,04–0,5 px; 142–159 ms pe cadru (calculul căilor pe procesor); 7 MB de descărcat | **NU**: dublează Skia pe care browserul îl are deja, mai lent |
| **WebGL2 propriu**, segmente instanțiate | cod propriu | fiecare segment = un dreptunghi de lățime constantă pe ecran | 5 M segmente: 3,9 ms (LINE_STRIP: 2,1 ms); 1 M: 1,1 ms; hartă 4096×2048 + dală/cadru: 0,5 ms | **DA**, stratul de trasee și simulare |
| **Hibrid** (WebGL2 jos + Canvas2D sus) | — | cele două de mai sus, suprapuse | 50 k + 5 M + hartă: 9,4–10,5 ms; la 60 Hz real, 0 cadre pierdute la DPR 1 și 1,5 | **RECOMANDAT** |
| **flatbush 4.6.2** | ISC (+ flatqueue ISC) | index spațial static, construit o dată | 50 k: construcție 7,4 ms; clic 0,039–0,047 ms median | **DA**, implicit |
| **rbush 4.0.1** | MIT (+ quickselect ISC) | index spațial dinamic (inserții, ștergeri) | 50 k: construcție 19,9 ms; clic 0,11–0,13 ms | rezervă, dacă reconstruirea devine scumpă |
| opentype.js 2.0.0 | MIT | glife reale din Arial (doar corpus de test) | — | doar test aici; textul are sonda lui |
| playwright-core 1.63 | Apache-2.0 | condus browserul cu fereastră | — | doar test |

Licențele sunt citite din `package.json`-ul fiecărui pachet instalat [citit]. Fontul Arial e citit local, din
`C:/Windows/Fonts`, doar la test; nu e copiat în repo.

## 4. Măsurători

### 4.1 Metoda

- **Mașina** [măsurat]: Edge 154 (motor Chromium), cu fereastră, pe RTX 3060 prin ANGLE/Direct3D 11. WebGPU raportează
  `nvidia / ampere`. `chrome://gpu`: Canvas, WebGL și WebGPU „Hardware accelerated". Nu e SwiftShader, deci cifrele
  de GPU sunt valide. Chromium-ul Playwright nu pornește din sandbox-ul agentului, așa că am folosit Edge-ul
  instalat.
- **Pânza**: 1281×721 px CSS, așezată la (37, 23) px ca într-un editor cu bare. Dimensiunea e aleasă impar ca să
  apară rotunjirile de la DPR fracționar.
- **Corpusul** (determinist, sămânța 7): placa de 2440×1220 mm cu conturul ei; cercuri de la 0,01 mm la 600 mm;
  arce deschise de 30–300°; dreptunghiuri rotunjite rotite la 30–90°; zigzaguri cu unghiuri de 30–90°; contururi
  din cubice; gogoși cu gaura orientată la fel sau invers; glife Arial reale; perechi de cercuri cu joc de 0,001 mm;
  pătrate cu muchie comună; segmente de 0,01 mm. La 50 k: 501 991 de segmente (166 251 linii, 42 647 arce, 293 093
  cubice). Separat, 10 forme-sondă cu răspuns analitic (cerc, cerc de 0,01 mm, arc, segment, parabolă, două cercuri
  la 0,001 mm, două pătrate cu muchie comună, dreptunghi rotunjit rotit la 37°).
- **Timpul unui cadru** = de la începutul desenului până când GPU-ul a terminat. Forțez sfârșitul cu o citire de
  1 pixel după fiecare cadru. **De ce:** fără ea, WebGL raporta 0,1 ms pentru 5 M segmente, fiindcă comenzile doar
  se puneau la coadă. Cu ea, 3,9 ms [măsurat]. Instrumentul mințea, iar martorul l-a prins.
- **Ritmul real la 60 Hz** (§4.4): aceeași scenă cu sincronizarea verticală pornită, fără citiri, și intervalul
  dintre cadre. Am verificat metoda cu martori: unul care sigur depășește bugetul trebuie să apară la ~33 ms, iar
  pânza goală la 16,7 ms.
- 120 de cadre măsurate după 20 de încălzire (sau 1,5 s); mediana și p95 peste cadre.

### 4.2 Fidelitatea la zoom: cât se abate marginea desenată de cercul adevărat

Metoda: un cerc plin de R = 50 mm, la 1000 px/mm (1 px = 1 µm), cu vederea pe margine la 37°, 90° și 0°, și cu
centrul lângă colțul plăcii (2390, 1170 mm), unde coordonatele sunt mari. Citesc pixelii și găsesc marginea la 50 %
acoperire, pe linii aproape perpendiculare pe ea. Abaterea = distanța până la centru minus R, în pixeli fizici.

**Oracolul**: pentru randatoarele care teselează, abaterea prezisă pe hârtie vine din numărul de vârfuri (PixiJS
pune 4·⌈2,3·√(2R)⌉ = 92 de vârfuri pe cercul de 50 mm [citit: `pixi.js@8.22.0`,
`lib/scene/graphics/shared/buildCommands/buildCircle.mjs`]). Diferența măsurat − prezis („rezidual") arată și cât de
bună e metoda.

| Randator | 37° | 90° | 0°, lângă colțul plăcii | Prezis pe hârtie | Rezidual max |
|---|---:|---:|---:|---:|---:|
| Canvas2D (Path2D, arc nativ) | 0,040 px | 0,088 px | 0,087 px | 0 | 0,09 px |
| CanvasKit | 0,042 px | 0,500 px | 0,087 px | 0 | 0,5 px |
| PixiJS `circle()` (92 de vârfuri) | 29,26 px | 17,90 px | 11,07 px | 29,15 / 17,77 / 11,00 | 0,22 px |
| PixiJS `arc()` (44 de vârfuri) | 127,5 px | 41,6 px | 24,4 px | 127,4 / 41,7 / 24,5 | 0,23 px |
| PixiJS în µm (2912 vârfuri) | 0,17 px | 0,22 px | 0,28 px | 0,03 | 0,30 px |
| WebGL2, aplatizat la 0,01 mm | 9,96 px | 10,00 px | 6,05 px | 9,85 / 9,88 / 5,86 | 0,21 px |
| WebGL2, aplatizat la 0,001 mm | 1,12 px | 1,20 px | 1,20 px | 1,00 | 0,21 px |

Toate [măsurat]. La DPR 1,25 și 1,5, Canvas2D a dat 0,039 și 0,043 px, iar PixiJS 36,4 și 44,2 px (prezis 36,4 și
43,7) [măsurat]. La 10 000 px/mm, lângă colțul plăcii, Canvas2D și CanvasKit dau 0,62 px, iar PixiJS în µm 2,2 px:
aici se vede precizia numerelor pe 32 de biți (float32) din GPU [măsurat]. Concluzia [dedus]: zoomul maxim util e
1000 px/mm; peste el, coordonatele trebuie trimise relativ la o origine apropiată.

### 4.3 Cadre: timpul până la terminarea pe GPU

| Ce (DPR 1, pan, dacă nu scrie altfel) | Median ms | p95 ms | Construcție |
|---|---:|---:|---:|
| martor: pânză goală (doar citirea de 1 pixel) | 0,7 | 0,9 | — |
| Canvas2D, redesen exact, 10 k forme | 22,6 | 24,9 | 1,3 s (un Path2D) |
| Canvas2D, redesen exact, 50 k, un singur Path2D | 118,6 | 128,7 | **36,7 s** |
| același, fără citire (interval între cadre) | 121,5 | 140,1 | 35,6 s |
| Canvas2D, 50 k pe 512 găleți spațiale, pan (totul vizibil) | 77–100 | 86–106 | 0,12–0,14 s |
| același, zoom de la placă întreagă la 64× | 16,0 | 94,5 | 0,14 s |
| Canvas2D, bitmap de interacțiune (50 k), pan / zoom | 5,3–7,4 / 5,5–6,9 | 6,2–8,9 | redesen exact 142–198 ms |
| PixiJS, 10 k / 50 k pan / 50 k zoom | 1,0 / 2,2 / 0,8 | 1,6 / 2,7 / 1,7 | 0,13 / 0,24 / 0,25 s |
| PixiJS teselat în µm, 50 k | 8,9 | 9,3 | 2,6 s |
| CanvasKit, 10 k / 50 k pan / 50 k zoom | 27,6 / 142–159 / 43,9 | 30,1 / 171–199 / 139,8 | 0,16–0,43 s |
| WebGL2 instanțiat, 1 M / 5 M pan / 5 M zoom | 1,1 / 3,9 / 3,8 | 4,0 / 4,3 / 4,3 | 0,09 / 0,32 s |
| WebGL2, 5 M ca LINE_STRIP (linie de 1 px) | 2,1 | 2,6 | 0,31 s |
| WebGL2, doar harta de înălțime 4096×2048 + o dală de 256×256 pe cadru | 0,5 | 0,8 | urcare 5–15 ms |
| Hibrid, Canvas2D redesenat exact la fiecare cadru: 10 k + 1 M + hartă | 36,7 | 46,4 | — |
| Hibrid, cu bitmap: 50 k + 5 M + hartă, pan / zoom | 9,4–10,5 / 9,4–10,3 | 10,4–12,6 | — |

**DPR 1,25 și 1,5** [măsurat]:

| Ce | DPR 1,25 | DPR 1,5 |
|---|---:|---:|
| Canvas2D 10 k, linie 1 px CSS (1,25 / 1,5 px fizici) | 330 ms | 373 ms |
| Canvas2D 10 k, linie 1 px fizic | 29,2 ms | 28,6 ms |
| Canvas2D 50 k pe găleți, linie 1 px CSS | 716 ms | 798 ms |
| Canvas2D 50 k pe găleți, linie 1 px fizic | 124 ms | 143 ms |
| CanvasKit 50 k, linie-păr | 163 ms | 180 ms |
| PixiJS 50 k | 2,1 ms | 2,8 ms |
| WebGL2 5 M segmente | 4,2 ms | 4,9 ms |
| Bitmap de interacțiune (ImageBitmap), 50 k | 8,4 ms | 12,2 ms |
| Hibrid cu bitmap, 50 k + 5 M + hartă | 13,5–16,6 ms | 19,8–22,3 ms |

Ultimele două rânduri sunt **pesimiste**: citirea forțată a unui pixel dintr-o pânză Canvas2D poate muta pânza pe
procesor, iar hibridul plătește două citiri pe cadru [dedus]. De aceea, la DPR 1,5 contează proba din §4.4, nu
acest 19,8–22,3 ms.

### 4.4 Ritmul real la 60 Hz (sincronizarea verticală pornită)

| DPR | Ce | Interval median ms | p95 | max |
|---|---|---:|---:|---:|
| 1 | martor pozitiv: Canvas2D 10 k, redesen exact la fiecare cadru | 33,2 | 33,4 | 33,6 |
| 1 | martor negativ: pânză goală | 16,7 | 16,8 | 16,8 |
| 1 | **hibrid: 50 k din bitmap + 5 M + hartă cu dală/cadru, pan / zoom** | **16,7 / 16,7** | **16,8 / 16,8** | 16,8 / 16,9 |
| 1,5 | martor pozitiv: Canvas2D 10 k | 16,8 | 33,4 | 33,5 |
| 1,5 | martor negativ: pânză goală | 16,7 | 16,7 | 16,8 |
| 1,5 | **hibrid, pan / zoom** | **16,7 / 16,7** | **16,8 / 16,8** | 16,8 / 16,8 |
| 1,5 | martor pozitiv GPU: 5 M segmente × 8 desene (35,2 ms pe GPU, măsurat cu citire) | 33,3 | 50 | 166,7 |

[măsurat] Ambii martori pozitivi apar ca cadre pierdute (33 ms), cel de procesor și cel de GPU, deci metoda vede
depășirea. Hibridul a ținut toate cele 120 de cadre la 16,7–16,9 ms, pe pan și pe zoom, la DPR 1 și 1,5.

### 4.5 Hit-test pe 20 k și 50 k forme (Node 26, același motor V8 ca browserul)

Metoda: clic = cea mai apropiată formă în 5 px de ecran, convertiți în mm la zoomul curent. Indexul dă candidații,
apoi distanța exactă la linie, arc și cubică (cubica: eșantionare + secțiune de aur). La egalitate sub 1e-9 mm
câștigă forma de deasupra. 2000 de clicuri pe zoom, jumătate lângă un contur.

**Oracolul**, fără cod comun cu nucleul (`oracle.mjs`): distanțe analitice pentru cerc, arc (unghiul față de
bisectoare), segment, parabolă (Cardano pe ecuația de gradul 3) și dreptunghi rotunjit rotit (funcție de
distanță cu semn). Oracolul e verificat întâi pe valori de hârtie: parabola y = x² față de (0, 1) dă √3/2;
segmentul (0,0)–(3,4) față de (3,0) dă 12/5; rădăcinile lui (t−1)(t−2)(t−3) dau 1, 2, 3 [măsurat].

| Forme | Zoom | Candidați median | flatbush ms med / p95 / max | rbush ms med | scanare liniară ms med | Diferențe |
|---:|---|---:|---|---:|---:|---:|
| 20 010 | placă întreagă (toleranță 8,3 mm) | 57 | 0,017 / 0,032 / 0,24 | 0,040 | 0,154 | 0 |
| 20 010 | 40 px/mm (toleranță 0,125 mm) | 44 | 0,012 / 0,020 / 0,21 | 0,028 | 0,144 | 0 |
| 50 010 | placă întreagă | 142 | 0,047 / 0,089 / 0,47 | 0,130 | 0,608 | 0 |
| 50 010 | 40 px/mm | 112 | 0,042 / 0,069 / 0,37 | 0,119 | 0,695 | 0 |

[măsurat] Pe 6000 de interogări lângă formele-sondă: **0 forme greșite**, eroare maximă a distanței
5,7·10⁻¹³ mm. În jocul de 0,001 mm dintre două cercuri, un punct la 0,0002 mm de cel din stânga îl alege pe cel din
stânga. Testul de interior (regula de umplere), față de funcția analitică: 0 greșeli din 20 000, pe ambele reguli.

### 4.6 O singură regulă de umplere: ecran = nucleu = `isPointInPath`

Metoda: umplu forme-capcană cu Canvas2D (pe GPU) și citesc pixelii. Pe aceleași puncte întreb și nucleul
(numărul de înfășurare, din încrucișări exacte cu linii, arce și cubice) și `isPointInPath` al browserului. Exclud
punctele la mai puțin de 1,5 px fizici de contur. Formele: gogoașă cu gaura orientată la fel, gogoașă cu gaura
inversă, pentagramă, două cercuri suprapuse într-o singură cale, glifele „B8O@".

[măsurat] La DPR 1, 1,25 și 1,5, pe ambele reguli, cu 5 418–5 625 de puncte pe rulare: **0 diferențe** ecran≠nucleu,
ecran≠`isPointInPath`, nucleu≠`isPointInPath`.

Unde regulile diferă (nucleu, aceleași puncte pentru ambele reguli) [măsurat]:

| Formă | Puncte | Diferă |
|---|---:|---:|
| 27 de glife Arial (B8O@, Ag&%, „stejar nuc", 0–9) | 108 000 | 0 |
| gogoașă, gaura orientată la fel | 4 000 | 757 |
| gogoașă, gaura orientată invers | 4 000 | 0 |
| pentagramă | 4 000 | 381 |
| două cercuri suprapuse într-o cale | 4 000 | 823 |

**Defect găsit pe drum** [măsurat]: opentype.js 2.0 nu emite închiderea (`Z`) pentru glifele TrueType. Ecranul le
umplea oricum, fiindcă `fill()` închide implicit orice contur, dar nucleul le vedea deschise: 1 119 diferențe din
5 428. Reparat în importator (conturul unei glife e închis prin definiție). Lecția intră în model: „închis" e un
fapt explicit al conturului, nu ceva dedus de randator.

### 4.7 Clic real: mouse → Pointer Events → hit-test, la DPR fracționar

Metoda: Playwright mișcă mouse-ul real la 120 de ținte calculate de oracol, în coordonate de pagină; pagina
transformă `clientX/Y` în mm și face hit-test pe 20 k forme.

| DPR | Pânza, rotunjire naivă | Pânza, `devicePixelContentBoxSize` | Corecte | Eroare de coordonată max | Eveniment → rezultat |
|---|---|---|---:|---:|---|
| 1 | 1281×721 | 1281×721 | 120 / 120 | 0,00006 px CSS | med 0,1 ms, max 0,6 ms |
| 1,25 | 1601×901 | **1602×901** | 120 / 120 | 0,00017 px CSS | med 0,1 ms, max 0,9 ms |
| 1,5 | 1922×1082 | **1921×1081** | 118 / 118 | 0,00017 px CSS | med 0,1 ms, max 1,0 ms |

[măsurat] La DPR 1,5, două ținte au căzut în afara ferestrei (ecranul are 1920 px) și au fost excluse. Rotunjirea
naivă greșește dimensiunea pânzei cu un pixel la DPR fracționar, în ambele sensuri. Asta ar însemna o imagine
reeșantionată, deci ușor încețoșată [dedus].

### 4.8 Planul B: vectori pe WebGL, cu polilinii refăcute pe treaptă de zoom

Dacă bitmapul din timpul gestului nu-i place owner-ului, vectorii pot trece pe WebGL ca polilinii aplatizate la
0,25 px. Cât costă aplatizarea pe procesor, pentru toată scena de 50 k [măsurat]:

| Zoom | Toleranță | Segmente | Timp | Memorie |
|---:|---:|---:|---:|---:|
| 0,5 px/mm (placă întreagă) | 0,5 mm | 0,87 M | 59 ms | 6,6 MB |
| 4 px/mm | 0,0625 mm | 1,89 M | 79 ms | 14,4 MB |
| 32 px/mm | 0,0078 mm | 4,72 M | 142 ms | 36 MB |
| 1000 px/mm | 0,00025 mm | 24,8 M | 623 ms | 189 MB |

La zoom mare se aplatizează doar ce e vizibil, deci mult mai puțin [dedus]. GPU-ul desenează 5 M segmente în ~4 ms
(§4.3). Planul B e fezabil, dar cere cod propriu pentru netezirea marginilor, colțuri, umplere cu regulă (prin
stencil) și text.

### 4.9 Zgomot

Pe mașină rulau în paralel 9 alți agenți. Aceleași configurații, în rulări diferite: Canvas2D 50 k pe găleți
77–100 ms, CanvasKit 50 k 142–159 ms, hibridul cu bitmap 9,4–10,5 ms, PixiJS 50 k 2,0–2,2 ms [măsurat]. Deci
±15–25 % între rulări. Ordinea candidaților și concluziile nu se schimbă. Comanda din §7 reface cifrele-cheie într-un
minut și jumătate, pe o mașină liberă.

## 5. Ce schimbă în arhitectură

1. **Pânza = trei straturi suprapuse, fiecare cu proprietarul lui:**
   - `gpu` (WebGL2): placa, harta de înălțime a simulării, traseele;
   - `vectori` (Canvas2D): formele documentului, exacte;
   - `interacțiune` (Canvas2D, în coordonate de ecran): mânere, dreptunghiul de selecție, previzualizarea uneltei,
     acroșaj, rigle.

   Fiecare strat se redesenează doar când i se schimbă intrarea. Un singur planificator de pictură la cerere, fără
   ticker (lecția D1 din ediția întâi).
2. **Vectorii nu se aplatizează pentru ecran.** Fiecare formă devine un Path2D construit direct din modelul de curbă
   (`lineTo`, `arc`, `bezierCurveTo`), păstrat în cache după `rev`-ul formei. Path2D-urile se grupează în găleți
   spațiale (~512 pe placă). **Interzis un singur Path2D pentru toată scena:** construcția lui crește pătratic
   (50 k: 36,7 s, față de 0,12–0,16 s pe găleți) [măsurat].
3. **Linia vectorului = 1 pixel fizic**: `lineWidth = 1 / (zoom · DPR)`. Linia de 1 px CSS e de 6–13 ori mai scumpă la
   DPR 1,25 și 1,5 [măsurat]. Explicația probabilă: peste 1 px fizic, Skia construiește conturul liniei în loc să
   folosească linia-păr [dedus]. Se scrie ca regulă, cu un test de performanță care o păzește.
4. **Două trepte de randare pentru vectori:**
   - când ce e vizibil încape în buget (de exemplu, zoom pe o piesă), redesen exact la fiecare cadru;
   - peste buget (scenă mare, văzută toată), în timpul gestului se arată bitmapul ultimei randări exacte (un
     `ImageBitmap`), mutat sau scalat; redesenul exact vine la ~100 ms după gest.

   Pragul se calibrează în felia verticală, din segmentele vizibile. Ca ordin de mărime: ~10 k forme vizibile.
5. **Traseele:** WebGL2, din IR-ul traseului aplatizat cu toleranță declarată. 0,001 mm dă 1,1–1,2 px abatere la
   1000 px/mm [măsurat]. Segmente instanțiate când contează lățimea și culoarea per segment, LINE_STRIP pentru
   previzualizarea densă. Coordonatele pe GPU sunt float32 relative la originea unei dale, ca să nu tremure la zoom
   adânc. Memorie: 12 B pe punct (5 M = 60 MB) [măsurat].
6. **Simularea:** hartă de înălțime float32 pe GPU, umbrită în shader și actualizată pe dale (`texSubImage2D`):
   0,5 ms pe cadru la 4096×2048 [măsurat]. La rezoluția legată de kerf (0,1 mm pe 2440 mm = 24 400 de texeli) harta
   trebuie împărțită pe texturi, fiindcă GPU-ul acceptă cel mult 16 384 pe latură [măsurat `MAX_TEXTURE_SIZE`,
   restul dedus].
7. **Hit-test-ul și regula de umplere stau în nucleul geometric, nu în randator.** Sunt funcții pure, testate fără
   ecran. Indexul: flatbush, reconstruit la fiecare comandă comisă (7,4 ms la 50 k). Dacă reconstruirea devine
   scumpă, rbush, cu inserții incrementale. Toleranța de clic se ține în pixeli de ecran (5 px) și se convertește în
   mm.
8. **Regula de umplere: `evenodd`, decisă o dată.** Nucleul o implementează, ecranul desenează cu
   `fill(path, 'evenodd')`, iar CAM-ul folosește aceeași funcție. Motivul: în DXF și SVG importate, orientarea
   contururilor e arbitrară. Cu `nonzero`, o gaură orientată la fel ca exteriorul s-ar umple (757 din 4 000 de puncte
   diferă) [măsurat]. Pe 27 de glife Arial, regulile nu diferă deloc [măsurat]. „Închis" e un câmp explicit al
   conturului (§4.6).
9. **Pixelii și coordonatele:**
   - dimensiunea pânzei vine din `ResizeObserver` cu `device-pixel-content-box`, nu din rotunjirea naivă;
   - o singură funcție vedere (lume ↔ ecran) e folosită și de randare, și de pointer;
   - Pointer Events cu `setPointerCapture`, cu coordonate fracționare păstrate.
10. **Zoomul maxim: 1000 px/mm** (1 px = 1 µm). Peste el, float32 din Skia și GPU începe să se vadă (0,6 px la
    10 000 px/mm lângă colțul plăcii) [măsurat].
11. **Bugetele pentru plan** (pe RTX 3060; mașinile slabe sunt la §6):

    | Ce | Buget | Măsurat |
    |---|---|---|
    | Cadru în gest (pan/zoom), 50 k vectori + 5 M segmente + hartă, DPR 1–1,5 | 0 cadre pierdute la 60 Hz | 0 din 120 |
    | Redesen exact după gest, 10 k forme vizibile | ≤ 33 ms | 22,6–29 ms |
    | Redesen exact după gest, 50 k vizibile | ≤ 250 ms, fără să blocheze inputul | 77–198 ms |
    | Clic (hit-test), 50 k forme | p95 ≤ 1 ms | 0,07–0,09 ms |
    | Abaterea desenului față de curba exactă, până la 1000 px/mm | ≤ 0,5 px | 0,04–0,5 px |
    | Aplatizarea traseelor | ≤ 1 px la zoomul afișat | 1,2 px la 0,001 mm și 1000 px/mm |
    | Memorie GPU, trasee | 12 B pe punct | 60 MB la 5 M |

12. **Nu intră în pachet:** PixiJS și CanvasKit. **WebGPU** există pe mașină, dar nu e necesar pentru randare:
    WebGL2 ține 5 M segmente în ~4 ms. Rămâne opțiune pentru simularea pe GPU [dedus].
13. **Interfața randatorului:** uneltele produc o previzualizare și, la final, o comandă (`LECTII.md` §4.7–4.8). Nu
    știu dacă dedesubt e Canvas2D sau WebGL. Planul B (§4.8) se poate adăuga ca alt motor al stratului `vectori`,
    fără să atingă uneltele sau modelul [dedus].

## 6. Riscuri și ce a rămas neprobat

- **Mașinile slabe.** Totul e măsurat pe RTX 3060. iGPU-ul AMD de pe aceeași mașină și laptopurile atelierelor n-au
  fost măsurate. Asta e cea mai mare necunoscută pentru „60 de cadre".
- **Redesenul exact la 50 k forme vizibile (77–200 ms) blochează firul principal** dacă rulează acolo. Mutarea lui
  într-un worker (OffscreenCanvas) sau pe felii e neprobată.
- **Bitmapul din timpul zoomului e neclar până la redesen.** E o alegere de experiență a utilizatorului, de judecat
  de owner în felia verticală. Planul B există, cu costul lui (§4.8).
- **Metoda de măsură a stratului Canvas2D.** Citirea forțată a unui pixel poate muta pânza pe procesor. La vectori
  n-a contat (121,5 ms fără citire, 118,6 ms cu citire), la bitmap da: 0,1 ms fără citire, dar fără presiune
  inversă, și 11–12 ms cu citire. Decizia pe DPR 1,5 se sprijină pe ritmul real la 60 Hz (§4.4), care are martori.
- **Browserul:** Edge 154, nu Chrome stabil și nici Chromium-ul Playwright (nu pornește din sandbox-ul agentului).
  Motorul e același [dedus]. Firefox și Safari nu sunt ținta (BRIEF §3).
- **Textul editabil** (așezare, kerning, fonturi single-line) nu e probat aici, doar glifele ca vectori. Fonturile cu
  contururi suprapuse (unele OTF și fonturile variabile) ar ieși cu găuri sub `evenodd`. Atunci, la conversia text →
  curbe trebuie unite contururile glifei. Neprobat.
- **Arcele din trasee** sunt aplatizate pentru GPU. Cu toleranța 0,01 mm, la 1000 px/mm se văd colțuri de 10 px
  [măsurat]. Toleranța trebuie legată de zoomul afișat.
- **Cifrele absolute sunt umflate** de cei 9 agenți care rulau în paralel (±15–25 % între rulări).
- **Hit-test-ul** e măsurat în Node, nu în pagină. Clicul real în pagină, cap la cap, a rămas sub 1 ms [măsurat].
- **Instrumentul a greșit de trei ori pe drum, și fiecare greșeală a fost prinsă și reparată:**
  - WebGL fără citire raporta 0,1 ms;
  - scorul clicului avea o linie comentată din greșeală și raporta eroare 0 indiferent de date;
  - la DPR 1,25, PixiJS își redimensiona singur pânza, iar detecția muchiei găsea 0 puncte.

  Cifrele din raport sunt cele de după reparații.

## 7. Cum se reproduce

Cifrele-cheie (oracolul și hit-test-ul, cadrele la DPR 1, fidelitatea, regula de umplere, clicul, ritmul real la
60 Hz cu martori), în ~1,5 minute:

```
cd C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s6-panza
node hit-node.mjs --n 20000 --q 2000 --json hit-quick.json && node run.mjs --quick && node run.mjs --vsync --out rezultate-vsync.json
```

Dacă dosarul de lucru a dispărut, se reface din repo, în afara Drive-ului:

```
xcopy /E /I C:\Users\besli\Desktop\MyWork\Apps\cncvs2\docs\faza2\sonde\s6-panza\cod %TEMP%\s6-panza && cd /d %TEMP%\s6-panza && set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 && npm ci && node hit-node.mjs --n 20000 --q 2000 && node run.mjs --quick && node run.mjs --vsync --out rezultate-vsync.json
```

Celelalte rulări: `node run.mjs --full` (~5,5 min, tot planul, 3 DPR), `node run.mjs --dpr` (grosimea liniei și
clicul, ~3 min), `node run.mjs --bmp` (bitmapul ca ImageBitmap), `node hit-node.mjs --n 50000`,
`node flat-node.mjs`, `node glife-reguli.mjs`. `node tabel.mjs <rezultate.json>` generează tabelele din anexă.
Browserul implicit: `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; altul se dă prin variabila
`S6_CHROME`. Portul e 5176, doar pe 127.0.0.1.

## Anexă: tabelele generate din fișierele de rezultate

Generate cu `tabel.mjs` din `cod/rezultate-*.json`, nu transcrise de mână. Rândurile Canvas2D și CanvasKit de la DPR
1,25 și 1,5 din rularea completă lipsesc: au durat peste 450 ms pe cadru (linie de 1 px CSS, §4.3) și n-au trecut
de încălzire. Le-a înlocuit rularea țintită B. Tot din rularea completă lipsește clicul: scorul lui avea o linie
comentată din greșeală (§6), iar rularea B l-a refăcut cu scorul reparat. Coloana „Forme" include cele 10
forme-sondă.

###### A. Rularea completă (07.10, Edge 154, RTX 3060)

##### Cadre (timp până la terminarea pe GPU)

| DPR | Randator | Forme | Segmente traseu | Hartă înălțime | Mișcare | Cadru median ms | Cadru p95 ms | Cadre > 16,7 ms | Construcție ms | Notă |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---|
| 1,00 | martor: pânză goală (doar sincronizarea) | 0 | 0 | nu | pan | 0,7 | 0,9 | 0 / 120 | 0 |  |
| 1,00 | Canvas2D, un Path2D mare | 10010 | 0 | nu | pan | 22,6 | 24,9 | 99 / 120 | 1328 |  |
| 1,00 | Canvas2D, un Path2D mare | 50010 | 0 | nu | pan | 118,6 | 128,7 | 57 / 57 | 36666 |  |
| 1,00 | Canvas2D, un Path2D mare | 50010 | 0 | nu | pan | 121,5 | 140,1 | — / 54 | 35576 | fără sincronizare: interval rAF 121,5 ms |
| 1,00 | Canvas2D, un Path2D mare | 10010 | 0 | nu | zoom | 10,9 | 22,1 | 32 / 120 | 1422 |  |
| 1,00 | Canvas2D, Path2D pe 512 găleți + culling | 50010 | 0 | nu | pan | 99,8 | 106,1 | 71 / 71 | 139 |  |
| 1,00 | Canvas2D, Path2D pe 512 găleți + culling | 50010 | 0 | nu | zoom | 16,0 | 94,5 | 59 / 120 | 142 |  |
| 1,00 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 6,6 | 7,9 | 0 / 120 | 134 | redesen exact 198 ms |
| 1,00 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | zoom | 5,5 | 6,6 | 0 / 120 | 110 | redesen exact 169 ms |
| 1,00 | PixiJS v8 (mm) | 10010 | 0 | nu | pan | 1,0 | 1,6 | 0 / 120 | 134 |  |
| 1,00 | PixiJS v8 (mm) | 50010 | 0 | nu | pan | 2,2 | 2,7 | 0 / 120 | 238 |  |
| 1,00 | PixiJS v8 (mm) | 50010 | 0 | nu | zoom | 0,8 | 1,7 | 0 / 120 | 248 |  |
| 1,00 | PixiJS v8 (µm, teselare fină) | 50010 | 0 | nu | pan | 8,9 | 9,3 | 0 / 120 | 2623 |  |
| 1,00 | CanvasKit (Skia WASM) | 10010 | 0 | nu | pan | 27,6 | 30,1 | 120 / 120 | 163 |  |
| 1,00 | CanvasKit (Skia WASM) | 50010 | 0 | nu | pan | 158,9 | 198,6 | 38 / 38 | 408 |  |
| 1,00 | CanvasKit (Skia WASM) | 50010 | 0 | nu | zoom | 43,9 | 139,8 | 95 / 95 | 396 |  |
| 1,00 | WebGL2, segmente instanțiate | 0 | 1 M | nu | pan | 1,1 | 4,0 | 0 / 120 | 85 |  |
| 1,00 | WebGL2, segmente instanțiate | 0 | 5 M | nu | pan | 3,9 | 4,3 | 0 / 120 | 315 |  |
| 1,00 | WebGL2, segmente instanțiate | 0 | 5 M | nu | zoom | 3,8 | 4,3 | 0 / 120 | 320 |  |
| 1,00 | WebGL2, segmente instanțiate | 0 | 5 M | nu | pan | 0,1 | 0,3 | — / 120 | 329 | fără sincronizare: interval rAF 0,1 ms |
| 1,00 | WebGL2, LINE_STRIP | 0 | 5 M | nu | pan | 2,1 | 2,6 | 0 / 120 | 314 |  |
| 1,00 | WebGL2: doar harta de înălțime | 0 | 0 | da (+dală/cadru) | pan | 0,5 | 0,8 | 0 / 120 | 168 | urcare hartă 15 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 10010 | 1 M | da (+dală/cadru) | pan | 36,7 | 46,4 | 120 / 120 | 258 | urcare hartă 7 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 120,5 | 153,3 | 54 / 54 | 619 | urcare hartă 6 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 9,6 | 10,4 | 1 / 120 | 705 | vectori din bitmap; urcare hartă 7 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | zoom | 9,4 | 10,5 | 1 / 120 | 716 | vectori din bitmap; urcare hartă 6 ms |
| 1,25 | PixiJS v8 (mm) | 50010 | 0 | nu | pan | 2,1 | 2,6 | 0 / 120 | 309 |  |
| 1,25 | WebGL2, segmente instanțiate | 0 | 5 M | nu | pan | 4,2 | 4,6 | 0 / 120 | 413 |  |
| 1,25 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 13,5 | 14,9 | 3 / 120 | 647 | vectori din bitmap; urcare hartă 5 ms |
| 1,50 | PixiJS v8 (mm) | 50010 | 0 | nu | pan | 2,8 | 3,4 | 0 / 120 | 315 |  |
| 1,50 | WebGL2, segmente instanțiate | 0 | 5 M | nu | pan | 4,9 | 6,0 | 0 / 120 | 392 |  |
| 1,50 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 22,1 | 32,8 | 117 / 120 | 611 | vectori din bitmap; urcare hartă 10 ms |

##### Fidelitatea la zoom (cerc plin R = 50 mm)

| DPR | Randator | Zoom px/mm | Centru mm | Unghi | Puncte de muchie | Vârfuri poligon | Abatere max px | Prezis pe hârtie px | Rezidual px |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| 1,00 | c2d | 1000 | 150, 150 | 37° | 361 | exact | 0,040 | 0,000 | 0,040 |
| 1,00 | c2d | 1000 | 150, 150 | 90° | 641 | exact | 0,088 | 0,000 | 0,088 |
| 1,00 | c2d | 1000 | 2390, 1170 | 0° | 361 | exact | 0,087 | 0,000 | 0,087 |
| 1,00 | pixi | 1000 | 150, 150 | 37° | 361 | 92 | 29,264 | 29,149 | 0,137 |
| 1,00 | pixi | 1000 | 150, 150 | 90° | 641 | 92 | 17,898 | 17,765 | 0,215 |
| 1,00 | pixi | 1000 | 2390, 1170 | 0° | 361 | 92 | 11,065 | 11,002 | 0,214 |
| 1,00 | pixiarc | 1000 | 150, 150 | 37° | 361 | 44 | 127,512 | 127,394 | 0,142 |
| 1,00 | pixiarc | 1000 | 150, 150 | 90° | 641 | 44 | 41,594 | 41,674 | 0,233 |
| 1,00 | pixiarc | 1000 | 2390, 1170 | 0° | 361 | 44 | 24,371 | 24,451 | 0,222 |
| 1,00 | pixium | 1000 | 150, 150 | 37° | 361 | 2912 | 0,167 | 0,029 | 0,150 |
| 1,00 | pixium | 1000 | 150, 150 | 90° | 641 | 2912 | 0,219 | 0,029 | 0,219 |
| 1,00 | pixium | 1000 | 2390, 1170 | 0° | 361 | 2912 | 0,281 | 0,029 | 0,296 |
| 1,00 | ck | 1000 | 150, 150 | 37° | 361 | exact | 0,042 | 0,000 | 0,042 |
| 1,00 | ck | 1000 | 150, 150 | 90° | 641 | exact | 0,500 | 0,000 | 0,500 |
| 1,00 | ck | 1000 | 2390, 1170 | 0° | 361 | exact | 0,087 | 0,000 | 0,087 |
| 1,00 | gl01 | 1000 | 150, 150 | 37° | 361 | 158 | 9,964 | 9,848 | 0,134 |
| 1,00 | gl01 | 1000 | 150, 150 | 90° | 641 | 158 | 9,996 | 9,884 | 0,113 |
| 1,00 | gl01 | 1000 | 2390, 1170 | 0° | 361 | 158 | 6,051 | 5,863 | 0,213 |
| 1,00 | gl001 | 1000 | 150, 150 | 37° | 361 | 497 | 1,124 | 0,999 | 0,143 |
| 1,00 | gl001 | 1000 | 150, 150 | 90° | 641 | 497 | 1,198 | 0,999 | 0,211 |
| 1,00 | gl001 | 1000 | 2390, 1170 | 0° | 361 | 497 | 1,203 | 0,999 | 0,209 |
| 1,00 | c2d | 10000 | 2390, 1170 | 37° | 361 | exact | 0,624 | 0,000 | 0,624 |
| 1,00 | ck | 10000 | 2390, 1170 | 37° | 361 | exact | 0,621 | 0,000 | 0,621 |
| 1,00 | pixium | 10000 | 2390, 1170 | 37° | 361 | 2912 | 2,209 | 0,291 | 2,125 |
| 1,25 | c2d | 1000 | 150, 150 | 37° | 451 | exact | 0,039 | 0,000 | 0,039 |
| 1,50 | c2d | 1000 | 150, 150 | 37° | 541 | exact | 0,043 | 0,000 | 0,043 |
| 1,50 | pixi | 1000 | 150, 150 | 37° | 541 | 92 | 43,504 | 43,723 | 0,486 |

##### Regula de umplere: ecran vs nucleu vs isPointInPath

| DPR | Regula | Puncte | ecran≠nucleu | ecran≠isPointInPath | nucleu≠isPointInPath | pline: gogoașă aceeași orientare | gogoașă opuse | pentagramă | două cercuri | glife |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1,00 | nonzero | 5428 | 0 | 0 | 0 | 564/709 | 407/707 | 207/696 | 594/698 | 1119/2618 |
| 1,00 | evenodd | 5418 | 0 | 0 | 0 | 396/694 | 443/704 | 146/697 | 420/701 | 1093/2622 |
| 1,25 | nonzero | 5536 | 0 | 0 | 0 | 571/717 | 411/716 | 214/709 | 604/709 | 1157/2685 |
| 1,25 | evenodd | 5539 | 0 | 0 | 0 | 406/708 | 448/714 | 150/706 | 425/712 | 1127/2699 |
| 1,50 | nonzero | 5625 | 0 | 0 | 0 | 575/723 | 416/722 | 220/719 | 611/720 | 1180/2741 |
| 1,50 | evenodd | 5615 | 0 | 0 | 0 | 408/712 | 449/718 | 155/715 | 428/718 | 1156/2752 |

##### Clic real (mouse -> Pointer Events -> hit-test)

| DPR | Pânza: dimensiune naivă | Pânza: device-pixel-content-box | Ținte | În afara ferestrei | Nelivrate | Corecte | Greșite | Eroare coordonată max (px CSS) | Hit-test ms med / p95 / max | Eveniment→rezultat ms med / p95 / max |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|

##### Mașina

- Browser: Edge 154.0.4258.62; chrome://gpu: Canvas: Hardware accelerated; Compositing: Hardware accelerated; Rasterization: Hardware accelerated; Video Decode: Hardware accelerated; WebGL: Hardware accelerated; WebGPU: Hardware accelerated
- DPR 1: WebGL ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); WebGPU {"vendor":"nvidia","architecture":"ampere","device":"","description":""}
- DPR 1.25: WebGL ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); WebGPU {"vendor":"nvidia","architecture":"ampere","device":"","description":""}
- DPR 1.5: WebGL ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); WebGPU {"vendor":"nvidia","architecture":"ampere","device":"","description":""}
- Durata totală: 320.121 s

###### B. Rularea țintită pe DPR (grosimea liniei, bitmap, clic reparat)

##### Cadre (timp până la terminarea pe GPU)

| DPR | Randator | Forme | Segmente traseu | Hartă înălțime | Mișcare | Cadru median ms | Cadru p95 ms | Cadre > 16,7 ms | Construcție ms | Notă |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---|
| 1,00 | Canvas2D, Path2D pe 512 găleți + culling | 50010 | 0 | nu | pan | 79,3 | 93,4 | 111 / 111 | 130 |  |
| 1,00 | Canvas2D, Path2D pe 512 găleți + culling, linie 1 px fizic | 50010 | 0 | nu | pan | 79,3 | 93,0 | 112 / 112 | 124 |  |
| 1,00 | CanvasKit (Skia WASM), linie 1 px fizic | 50010 | 0 | nu | pan | 147,2 | 180,0 | 58 / 58 | 460 |  |
| 1,00 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 7,4 | 8,9 | 1 / 120 | 142 | redesen exact 162 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 10,3 | 11,5 | 1 / 120 | 640 | vectori din bitmap; urcare hartă 6 ms |
| 1,25 | Canvas2D, un Path2D mare, linie 1 px CSS | 10010 | 0 | nu | pan | 330,0 | 359,5 | 27 / 27 | 1320 |  |
| 1,25 | Canvas2D, un Path2D mare, linie 1 px fizic | 10010 | 0 | nu | pan | 29,2 | 38,3 | 120 / 120 | 1365 |  |
| 1,25 | Canvas2D, Path2D pe 512 găleți + culling, linie 1 px CSS | 50010 | 0 | nu | pan | 715,7 | 729,5 | 13 / 13 | 162 |  |
| 1,25 | Canvas2D, Path2D pe 512 găleți + culling, linie 1 px fizic | 50010 | 0 | nu | pan | 124,2 | 131,9 | 74 / 74 | 162 |  |
| 1,25 | CanvasKit (Skia WASM), linie 1 px fizic | 50010 | 0 | nu | pan | 162,8 | 206,1 | 54 / 54 | 448 |  |
| 1,25 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 10,8 | 13,1 | 0 / 120 | 158 | redesen exact 420 ms |
| 1,25 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 16,6 | 18,5 | 49 / 120 | 758 | vectori din bitmap; urcare hartă 9 ms |
| 1,50 | Canvas2D, un Path2D mare, linie 1 px CSS | 10010 | 0 | nu | pan | 372,8 | 402,9 | 25 / 25 | 1340 |  |
| 1,50 | Canvas2D, un Path2D mare, linie 1 px fizic | 10010 | 0 | nu | pan | 28,6 | 36,6 | 120 / 120 | 1319 |  |
| 1,50 | Canvas2D, Path2D pe 512 găleți + culling, linie 1 px CSS | 50010 | 0 | nu | pan | 798,0 | 827,8 | 12 / 12 | 150 |  |
| 1,50 | Canvas2D, Path2D pe 512 găleți + culling, linie 1 px fizic | 50010 | 0 | nu | pan | 143,4 | 150,4 | 63 / 63 | 163 |  |
| 1,50 | CanvasKit (Skia WASM), linie 1 px fizic | 50010 | 0 | nu | pan | 180,4 | 187,0 | 51 / 51 | 488 |  |
| 1,50 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 17,2 | 20,2 | 85 / 120 | 157 | redesen exact 669 ms |
| 1,50 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 22,3 | 24,7 | 120 / 120 | 753 | vectori din bitmap; urcare hartă 8 ms |

##### Fidelitatea la zoom (cerc plin R = 50 mm)

| DPR | Randator | Zoom px/mm | Centru mm | Unghi | Puncte de muchie | Vârfuri poligon | Abatere max px | Prezis pe hârtie px | Rezidual px |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|
| 1,00 | pixi | 1000 | 150, 150 | 37° | 361 | 92 | 29,264 | 29,149 | 0,137 |
| 1,25 | pixi | 1000 | 150, 150 | 37° | 451 | 92 | 36,383 | 36,436 | 0,307 |
| 1,50 | pixi | 1000 | 150, 150 | 37° | 541 | 92 | 44,204 | 43,723 | 0,486 |

##### Regula de umplere: ecran vs nucleu vs isPointInPath

| DPR | Regula | Puncte | ecran≠nucleu | ecran≠isPointInPath | nucleu≠isPointInPath | pline: gogoașă aceeași orientare | gogoașă opuse | pentagramă | două cercuri | glife |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|

##### Clic real (mouse -> Pointer Events -> hit-test)

| DPR | Pânza: dimensiune naivă | Pânza: device-pixel-content-box | Ținte | În afara ferestrei | Nelivrate | Corecte | Greșite | Eroare coordonată max (px CSS) | Hit-test ms med / p95 / max | Eveniment→rezultat ms med / p95 / max |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| 1,00 | 1281×721 | 1281×721 | 120 | 0 | 0 | 120 | 0 | 0,000062 | 0,00 / 0,10 / 0,30 | 0,10 / 0,20 / 0,60 |
| 1,25 | 1601×901 | 1602×901 | 120 | 0 | 0 | 120 | 0 | 0,000173 | 0,00 / 0,10 / 0,20 | 0,10 / 0,20 / 0,90 |
| 1,50 | 1922×1082 | 1921×1081 | 120 | 2 | 0 | 118 | 0 | 0,000173 | 0,00 / 0,10 / 0,30 | 0,10 / 0,20 / 1,00 |


###### C. Bitmap ținut ca ImageBitmap (rezident pe GPU)

##### Cadre (timp până la terminarea pe GPU)

| DPR | Randator | Forme | Segmente traseu | Hartă înălțime | Mișcare | Cadru median ms | Cadru p95 ms | Cadre > 16,7 ms | Construcție ms | Notă |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---|
| 1,00 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 6,0 | 6,8 | 0 / 120 | 130 | redesen exact 12 ms |
| 1,00 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | zoom | 6,9 | 8,3 | 0 / 120 | 125 | redesen exact 11 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 10,5 | 12,6 | 2 / 120 | 615 | vectori din bitmap; urcare hartă 7 ms |
| 1,00 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | zoom | 10,3 | 11,3 | 1 / 120 | 692 | vectori din bitmap; urcare hartă 8 ms |
| 1,25 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 8,4 | 9,6 | 0 / 120 | 148 | redesen exact 11 ms |
| 1,25 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | zoom | 9,1 | 10,2 | 0 / 120 | 123 | redesen exact 18 ms |
| 1,25 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 14,2 | 15,5 | 3 / 120 | 606 | vectori din bitmap; urcare hartă 7 ms |
| 1,25 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | zoom | 14,6 | 16,2 | 4 / 120 | 723 | vectori din bitmap; urcare hartă 7 ms |
| 1,50 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | pan | 12,2 | 16,7 | 6 / 120 | 122 | redesen exact 11 ms |
| 1,50 | Canvas2D, bitmap de interacțiune | 50010 | 0 | nu | zoom | 12,9 | 14,7 | 1 / 120 | 119 | redesen exact 11 ms |
| 1,50 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | pan | 19,8 | 22,2 | 120 / 120 | 744 | vectori din bitmap; urcare hartă 6 ms |
| 1,50 | Hibrid: WebGL2 jos + Canvas2D sus | 50010 | 5 M | da (+dală/cadru) | zoom | 19,2 | 21,1 | 118 / 120 | 729 | vectori din bitmap; urcare hartă 7 ms |

#### D. Ritmul real la 60 Hz (sincronizarea verticală pornită, fără citiri)

| DPR | Configurație | Rol | Interval rAF median ms | p95 | max | Cadre |
|---|---|---|---:|---:|---:|---:|
| 1 | Canvas2D 10 k, linie 1 px fizic, redesen exact la fiecare cadru | martor pozitiv (CPU/Skia, ~23–29 ms de lucru) | 33,2 | 33,4 | 33,6 | 120 |
| 1 | pânză goală | martor negativ (pânză goală) | 16,7 | 16,8 | 16,8 | 120 |
| 1 | hibrid, pan | stiva completă: 50 k vectori din bitmap + 5 M segmente + hartă cu dală/cadru | 16,7 | 16,8 | 16,8 | 120 |
| 1 | hibrid, zoom | stiva completă: 50 k vectori din bitmap + 5 M segmente + hartă cu dală/cadru | 16,7 | 16,8 | 16,9 | 120 |
| 1,5 | Canvas2D 10 k, linie 1 px fizic, redesen exact la fiecare cadru | martor pozitiv (CPU/Skia, ~23–29 ms de lucru) | 16,8 | 33,4 | 33,5 | 120 |
| 1,5 | pânză goală | martor negativ (pânză goală) | 16,7 | 16,7 | 16,8 | 120 |
| 1,5 | hibrid, pan | stiva completă: 50 k vectori din bitmap + 5 M segmente + hartă cu dală/cadru | 16,7 | 16,8 | 16,8 | 120 |
| 1,5 | hibrid, zoom | stiva completă: 50 k vectori din bitmap + 5 M segmente + hartă cu dală/cadru | 16,7 | 16,8 | 16,8 | 120 |
| 1,5 | WebGL2 5 M segmente × 8 desene | același martor GPU, cu sincronizare (cadru 35.2 ms) | 33,3 | 50 | 50,1 | 120 |
| 1,5 | WebGL2 5 M segmente × 8 desene | martor pozitiv GPU, văzut prin ritmul real | 33,3 | 50 | 166,7 | 120 |

#### E. Hit-test, aplatizare, reguli de umplere (Node)

| Forme | Zoom (toleranța de 5 px) | Candidați median / p95 | flatbush ms med / p95 / max | rbush ms med / p95 / max | scanare liniară ms med / p95 | Diferențe rbush≠flatbush / index≠scanare |
|---:|---|---|---|---|---|---|
| 20010 | placa intreaga (0,6 px/mm), 8,333 mm | 57 / 77 | 0,0166 / 0,0324 / 0,237 | 0,0403 / 0,0697 / 0,630 | 0,154 / 0,214 | 0 / 0 |
| 20010 | 4 px/mm, 1,250 mm | 45 / 63 | 0,0155 / 0,0265 / 0,549 | 0,0385 / 0,0652 / 0,263 | 0,160 / 0,211 | 0 / 0 |
| 20010 | 40 px/mm, 0,125 mm | 44 / 61 | 0,0121 / 0,0204 / 0,207 | 0,0276 / 0,0472 / 0,375 | 0,144 / 0,194 | 0 / 0 |
| 50010 | placa intreaga (0,6 px/mm), 8,333 mm | 142 / 195 | 0,0470 / 0,0885 / 0,470 | 0,1301 / 0,2180 / 1,872 | 0,608 / 1,383 | 0 / 0 |
| 50010 | 4 px/mm, 1,250 mm | 115 / 163 | 0,0389 / 0,0688 / 0,423 | 0,1110 / 0,1790 / 0,661 | 0,596 / 0,869 | 0 / 0 |
| 50010 | 40 px/mm, 0,125 mm | 112 / 158 | 0,0416 / 0,0685 / 0,373 | 0,1185 / 0,1899 / 0,647 | 0,695 / 0,935 | 0 / 0 |

| Forme | Segmente (linii / arce / cubice) | Construcție flatbush ms | Construcție rbush ms | Oracol analitic: interogări / formă greșită / eroare max mm | Interior vs SDF analitic (evenodd, nonzero) |
|---:|---|---:|---:|---|---|
| 20010 | 199865 (66607 / 17088 / 116170) | 3,0 | 7,2 | 6000 / 0 / 5.7e-13 | 0/20000, 0/20000 greșite |
| 50010 | 501991 (166251 / 42647 / 293093) | 7,4 | 19,9 | 6000 / 0 / 5.7e-13 | 0/20000, 0/20000 greșite |

| Zoom px/mm | Toleranța (0,25 px) mm | Segmente pentru toată scena de 50 k | Timp CPU ms (mediana a 5) | Memorie xy float32 MB |
|---:|---:|---:|---:|---:|
| 0,5 | 0,5 | 868039 | 59,1 | 6,6 |
| 4,0 | 0,0625 | 1885443 | 78,8 | 14,4 |
| 32,0 | 0,00781 | 4715898 | 142,0 | 36,0 |
| 250,0 | 0,001 | 12578148 | 290,4 | 96,0 |
| 1000,0 | 0,00025 | 24820429 | 623,0 | 189,4 |

| Formă | Puncte | Pline nonzero | Pline evenodd | Puncte unde regulile diferă |
|---|---:|---:|---:|---:|
| glifa | 108000 | 45515 | 45515 | 0 |
| gogoasa-aceeasi-orientare | 4000 | 3116 | 2359 | 757 |
| gogoasa-orientari-opuse | 4000 | 2361 | 2361 | 0 |
| pentagrama | 4000 | 1281 | 900 | 381 |
| doua-cercuri-suprapuse | 4000 | 3366 | 2543 | 823 |

