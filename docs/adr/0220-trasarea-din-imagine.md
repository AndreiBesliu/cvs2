# ADR 0220 — Trasarea din imagine: ușa imaginilor, conturul sub-pixel, curbele cu abaterea măsurată

**Starea:** acceptat pe 07.11.2026, cu toate recomandările („Da, 1a–8a”, la întrebările de la final), în linia trasării
(worktree-ul `trasare`, ramura `wip/25.1-trasare`); propus în aceeași zi. Felia 25.1↑, adusă din etapa 25, fără mașină:
**gata** pe 07.11 (alb-negru), pe ramură, neunită în `main` (decizia owner-ului), publicată pe canalul `trasare` al instanței
de test; 25.2↑–25.4↑ urmează.
Pornirea: sesiunea principală, după ce owner-ul a întrebat ce se mai poate face în paralel.
**Rândul din prag:** „Trasare din imagine (bitmap → vectori)” (S, v1, decis 06.10). **Placa etapei 25:** „logoul trasat”.
**Completează:** T18 (ADR 0018: câte o ușă pe format, spre același model), ușile SVG, DXF, PDF, EPS și WMF (ADR 0035, 0101,
0104, 0115, 0117), bazinul CAM (ADR 0109, 0015), plafonul total (ADR 0137). **Portarea** (`docs/PORTARE.md` §4, rândul
„Trasarea pe luminanță și potrivirea pe arce”, de judecat înaintea etapei 25): **rescris, cu vechiul ca martor** (§„Ce am
respins”).
**Schița:** <https://claude.ai/artifact/6qm1Kdx7By22tPAxSHtHKj> (șapte planșe: fereastra trasării ca machetă vie, drumul
unei imagini, lecțiile ediției întâi, ce fac alte programe, probele, feliile, întrebările cu formularul răspunsurilor, în
colecția `raspunsuri`).

## Problema

Omul aduce des imagini, nu vectori: logoul unui client (PNG, adesea cu fundal transparent, sau JPEG de pe internet, cu
artefacte), un desen scanat (creion sau tuș, cu umbre, la 300–600 dpi), o poză (o siluetă), o semnătură de gravat pe linie,
un logo în mai multe culori (de săpat pe culori sau de incrustat). ArtCAM le face vectori; cvs2 încă nu.

Ediția întâi a ajuns la o trasare „bună”, dar după 7 runde în 3 zile, pe aceeași plângere (`LECTII.md`, raportul 08):
- **D7:** toate fixturile erau opace, iar fișierul owner-ului avea litere albe pe fundal transparent. Imaginea era strivită
  la luminanță înaintea oricărei decizii, iar alfa era citit ca da / nu. Fișierul real a ajuns abia la runda a șasea;
- **D6:** o poză de telefon (72 728 de contururi) a înghețat fila 53 s: nimic nu cronometra o trasare;
- **D5:** nucleul biarcelor făcea dreptunghiurile cercuri (fixturile erau toate rotunde). **D4:** „curbele netede”
  înrăutățeau desenul de 7 ori, iar proba verifica doar că există comenzi `C`;
- **D15:** cadranul toleranței nu schimba nimic pe trasare;
- trasarea depindea de `marchingsquares` (AGPL-3.0, permis doar nemodificat, cu nota), deci codul nu se poate porta;
- eroarea măsurată: ≈ 0,65 px, la orice toleranță cerută.

## Ce am aflat (cercetarea din 07.11)

- **ArtCAM 2018** (referință funcțională, din documentația lui; fără cod, interfață sau texte copiate): imaginea stă în
  vederea 2D; întâi se reduc culorile (de la 2 la câte are imaginea), apoi „Bitmap to Vector” face, pentru culoarea aleasă
  (și cele legate de ea), fie vectori pe granița ei, fie pe linia ei mediană (cu toleranța în pixeli și alegerea între căi
  deschise și bucle închise). Petele se dau în pixeli, netezimea în procente; un glisor estompează imaginea sub vectori.
- **Alte programe:** Vectric (imaginea color redusă la 16 culori, cu glisorul; pragul pe gri; legarea culorilor; alegerea
  din imagine; trasarea doar într-o zonă trasă cu mausul; colțurile, de la larg la strâns; filtrul de zgomot în pixeli;
  estomparea; previzualizarea), LightBurn (intervalul de luminozitate trasat, „ignoră sub” în pixeli de arie, netezimea de la
  doar linii la doar curbe, optimizarea, pragul local pentru schițe și scris de mână), Inkscape (potrace: petele, colțurile,
  optimizarea; scanări pe niveluri; linia mediană prin autotrace). **Numitorul comun:** sursa (pragul sau culorile), petele,
  colțurile și netezimea, toleranța, granița sau linia mediană, previzualizarea peste imaginea estompată.
- **Algoritmii, din lucrări publice:**
  - pragul: Otsu (1979); pragul local, pentru lumina inegală a unei scanări: Sauvola (2000);
  - curățarea: componentele conexe ale măștii; petele, ca la potrace (`turdsize`), Vectric și LightBurn;
  - conturul: marching squares cu interpolare liniară, deci muchia sub-pixel pe o margine netezită;
  - curbele: Selinger, „Potrace: a polygon-based tracing algorithm” (2003): poligonul optim, vârfurile ajustate, colțurile
    după un prag α (0 = poligon, peste 4/3 = fără colțuri, implicit 1), cubicele vecine unite sub o toleranță (0,2 px);
  - culorile: reducerea prin median cut sau k-means, într-un spațiu de culoare perceptual;
  - linia mediană: cvs2 are deja axa medială exactă a unei regiuni (`src/cam/axaMediala.ts`, V-carve-ul, ADR 0090), în locul
    subțierii Zhang–Suen din ediția întâi (acolo, curățarea cioturilor n-a scos nimic pe fixturi).
- **Licențele:** potrace e GPL (2 sau mai nou; există și o versiune comercială), autotrace GPL, `marchingsquares` AGPL-3.0
  [citit: registrul npm, 1.3.3]. `imagetracerjs` e Unlicense, dar n-are muchia sub-pixel și scrie curbe pătratice. `vtracer`
  e MIT, dar e Rust / WASM, prea mare pentru plafon. scikit-image e BSD-3 [citit: PyPI, 0.26.0]: doar ca oracol, nu în
  aplicație.
- **Decodarea în browser** [măsurat pe 07.11, Edge 157 fără fereastră, o sondă Playwright locală, pe mașina de lucru]:
  - `createImageBitmap` decodează PNG, JPEG, WebP, GIF și BMP; TIFF e refuzat;
  - orientarea EXIF a unei poze de telefon se aplică mereu (și cu `imageOrientation: 'none'`);
  - pixelii citiți prin canvas își pierd culoarea când sunt aproape transparenți (α = 2: 200, 100, 50 devine 255, 128, 0),
    iar alfa rămâne exactă. Deci culoarea contează doar unde pixelul e acoperit;
  - o imagine de 4000 × 3000 (12 Mpx): decodarea 22 ms (JPEG) și 41 ms (PNG), pixelii 20–23 ms (45,8 MB RGBA); în worker,
    37 + 20 ms, iar o trecere peste toți pixelii 13 ms; decodarea redusă la 2000 × 1500, cu calitatea „high”, 75–88 ms;
  - CSP-ul are deja `img-src blob:` (imaginea în fereastră) și `worker-src blob:`.
- **Mărimea** [măsurat, build curat la `36c75cb`]: totalul 506,0 / 550 kB, pornirea 101,4 (cu ușa 104,9) / 110; bucata
  importului are 34,7 kB pentru cinci uși (WMF: +3,9 kB la 700 de linii, deci ~5–6 kB gzip la 1 000 de linii). Alte linii
  așteaptă unirea cu ~13 kB.
- **Fișierul owner-ului din D7:** logoul ediției întâi (`cnc_vector_studio_first_logo_transparent.png`, 1288 × 325, RGBA, fără
  DPI), în repo-ul privat al ediției întâi. La 96 px / țol iese 340,8 × 86,0 mm.

## Decizia (cu răspunsurile owner-ului: toate recomandările)

1. **Ușa imaginilor** (`src/io/formatImport.ts`): `.png`, `.jpg` / `.jpeg` / `.jfif`, `.webp`, `.gif` (primul cadru), `.bmp`
   și tipurile lor MIME sunt formatul `imagine`; un fișier fără extensie cunoscută, după semnătură. TIFF e refuzat cu motivul
   lui (salvat ca PNG, merge), până la răspunsul 5. Fereastra de fișiere și lăsarea pe planșă le primesc. Plafonul
   fișierului rămâne 16 MB.
2. **Calculul e în workerul trasării** (`src/jobs/lucratorTrasare.ts`, după bazinul CAM, ADR 0109): cererea poartă fișierul
   (un `Blob`) și alegerile. Workerul decodează (peste 16 Mpx, redus la 16 Mpx, cu calitatea „high”, iar fereastra spune
   asta), citește pixelii (`OffscreenCanvas`) și trasează. Fără stare (ADR 0015): fiecare previzualizare e un calcul, oprit
   de o citire nouă, de Renunță, de Escape și de fișierul următor (semnalul citirii, `ContextImport.semnal`), cu workerul din
   mijlocul calculului.
   *Schimbat la cod (felia 25.1↑):* decizia pusese nucleul ca bucată la cerere a workerului CAM, dar workerele se construiesc
   IIFE (fără bucăți), deci l-ar fi crescut pe acela. Un worker al lui (6,7 kB gzip) nu atinge workerul CAM.
3. **Cerneala vine din RGBA, nu din luminanță** (lecția D7):
   - o imagine cu transparență: cerneala e acoperirea (alfa), cu pragul la 50 %. Fundalul transparent e fundal oricare ar
     fi culoarea desenului (litere albe, negre sau colorate);
   - o imagine opacă: cerneala e întunecimea, iar polaritatea vine din marginea imaginii (ce domină marginea e fundalul);
     „Inversează” o întoarce;
   - pragul automat: Otsu desparte două clase, iar pragul stă la mijlocul mediilor lor, adică la jumătatea acoperirii (muchia
     geometrică a unei margini netezite). Manual, un glisor de 1–254, cu histograma cernelii sub el (pe scară logaritmică,
     cu linia la prag, care urmează glisorul înaintea retrasării);
   - culorile (25.2↑) și pragul local (25.4↑) sunt alte surse ale cernelii, pe aceeași cale.
4. **Curățarea, pe mască:**
   - componentele conexe: cerneala în 8-vecinătate, fundalul în 4;
   - petele sub „Ignoră petele sub” se șterg din câmp, iar golurile sub „Umple golurile sub” se umplu (cele lipite de
     marginea imaginii rămân). Pragurile se dau în mm (diametrul cercului cu aceeași arie), cu echivalentul în pixeli
     alături; implicit 0,3 mm, dar cel puțin 2 × 2 px;
   - aceeași regulă de vecinătate decide punctele-șa ale conturului, deci contururile nu contrazic componentele.
5. **Conturul sub-pixel:** marching squares pe câmpul cernelii, la nivelul pragului, cu interpolarea liniară între centrele
   pixelilor. În afara imaginii e fundal, deci contururile se închid la margine. Ies inele închise: exterioarele într-un
   sens, golurile în celălalt.
6. **Curbele**, după Selinger (2003), scrise din lucrare, fără să citim codul potrace sau porturile lui:
   - pe fiecare inel, poligonul cu cele mai puține laturi care stă în banda toleranței, cu vârfurile ajustate;
   - colțurile se aleg după criteriul α. Între colțuri vin cubice, iar cubicele vecine se unesc cât abaterea rămâne sub
     toleranță;
   - ieșirea: linii și cubice (răspunsul 3), în mm, cu Y în sus.

   **Abaterea se măsoară, nu se presupune:** distanța cea mai mare dintre curba finală și conturul sub-pixel, arătată în
   fereastră în mm și px. „Netezimea” are trei trepte, ca în ediția întâi (Fidel / Echilibrat / Neted), și mută împreună pragul
   colțurilor și toleranța. Proba cere ieșiri diferite pe trepte diferite (lecția D15).
7. **Mărimea și locul:**
   - DPI-ul vine din fișier (`pHYs` la PNG, JFIF sau EXIF la JPEG, antetul BMP), altfel 96 px / țol, ca la un SVG (răspunsul 2);
   - fereastra arată lățimea și înălțimea în mm și primește lățimea dorită, cu proporțiile păstrate;
   - imaginea e o pagină: colțul ei stânga-jos e colțul foii, iar desenul stă unde e în imagine. Lăsată pe planșă, centrul
     desenului cade în punctul lăsat (felia 2.8b).
8. **Piesa:**
   - căile închise trec prin regulile comune ușilor (`caleImport.ts`: praful, plafonul căii, marginile documentului);
   - laturile (exterior / interior) vin din sensul fiecărui contur (§5), apoi aceeași piesă ca la SVG (`piesaDinImport`).
     *Schimbat la cod:* nu prin imbricare. Sensul spune același lucru, iar pe o poză de 12 Mpx cu 2 162 de contururi,
     imbricarea ținea firul principal 553 ms;
   - `document.importa` le adaugă într-un singur pas de anulare;
   - documentul rămâne v19: nicio schemă nouă.
9. **Plafoanele și timpul** (lecția D6):
   - imaginea are cel mult 16 Mpx după reducere;
   - după curățare, cel mult 20 000 de contururi și 500 000 de vârfuri pe import. Peste ele, refuzul spune ce să mărești
     („Pete sub” sau pragul);
   - termenul calculului e 30 s;
   - cât trasează, fereastra arată „Trasez…” peste previzualizarea veche, iar fila nu se blochează.
10. **Fereastra (schița, planșa 1):** e fereastra importului, lărgită pentru o imagine.
    - **În stânga:** sursa, pragul (automat sau glisorul cu histograma), Inversează, Netezimea, Ignoră petele sub, Umple
      golurile sub, lățimea (cu DPI-ul și de unde vine).
    - **În dreapta:** previzualizarea, cu imaginea estompată (glisorul), vectorii peste ea și mărirea (rotița, + / −).
    - **Dedesubt, raportul:** contururile pe laturi, abaterea maximă, pixelul în mm, mărimea imaginii și reducerea ei.
    - Importă, Renunță și Escape merg ca la celelalte uși.
11. **Probele, scrise întâi:**
    - **corpusul Python** (`test/oracles-py/trasare_corpus.py`): imaginile le scrie generatorul (PNG cu `zlib` și `struct`, fără
      Pillow), cu acoperirea exactă pe pixel (eșantionată 16 × 16), și au valorile pe hârtie:
      - cercul R40 px, cu centrul în afara grilei: opac pe alb, alb pe transparent, negru pe transparent, alb pe negru;
      - pătratul de 100 px cu gaura de 40, drept și rotit cu 17°, netezit și cu margini dure: colțurile la cel mult 0,5 px de
        cele pe hârtie, gaura ca interior;
      - o literă din Roboto (inclus, Apache 2.0), cu conturul exact citit cu fontTools;
      - discul cu pete de 1–3 px: câte contururi rămân după curățare, pe hârtie;
    - **judecata:** distanța în ambele sensuri (Hausdorff) dintre curbele trasate și forma pe hârtie, numărul contururilor și
      al golurilor (exact), colțurile. Țintele (de fixat pe corpus, înaintea codului): 0,4 px pe marginile netezite și 0,6 px
      pe cele dure (ediția întâi: ≈ 0,65 px);
    - **scikit-image** (răspunsul 7), ca al doilea martor pe imaginile fără hârtie (zgomotul, logoul): componentele, golurile
      și contururile `find_contours`;
    - **fișierul real întâi** (lecția D7): logoul owner-ului (răspunsul 8) și, dacă le trimite, un desen scanat și o poză;
    - **e2e:**
      - un PNG lăsat pe planșă → fereastra → Importă → piesa cu N căi;
      - Escape cu tasta reală (lecția D8);
      - pe o poză de 12 Mpx, fila răspunde cât trasează, iar o schimbare anulează calculul vechi;
    - **otrăvurile** la capăt (`test/otravuri/25.1.py`).
12. **Feliile:**
    - **25.1↑** trasarea alb-negru (punctele 1–11): ~6 h, cu ~+8 kB (nucleul ~5–6 kB în bucata workerului, fereastra ~2 kB);
      gata pe 07.11, cu +12,3 kB (secțiunea feliei);
    - **25.2↑** culorile: reducerea (2–16), pastilele cu procentul, alegerea și legarea culorilor, granița dintre două culori la
      amestecul lor de 50 % (aceeași pentru amândouă, fără goluri între ele), o piesă pe culoare (rolul din panou), ~4 h;
    - **25.3↑** linia mediană: axa medială a trăsăturilor (`axaMediala.ts`), fără cioturile scurte, ca linii deschise gravate
      pe linie, cu grosimea trăsăturii față de freză, ~4 h;
    - **25.4↑** scanările și pozele, dacă le vrei: pragul local, zona aleasă, „Ignoră ce atinge marginea”;
    - fișa plăcii 25: logoul trasat, săpat în V.

    Linia întreagă ține ~12–14 kB din plafonul total, comun cu celelalte linii (răspunsul 6).

## Felia 25.1↑: cum a ieșit și ce s-a măsurat

**Nucleul** (`src/trasare/trasare.ts`, scris din lucrări, fără cod străin):
- poligonul: un con al direcțiilor, strâns de discul fiecărui punct, în banda ε (lacom, nu optimul din Selinger: aceeași
  bandă, cu ceva mai multe laturi); startul, în mijlocul celei mai lungi laturi;
- vârfurile se mută în încrucișarea dreptelor laturilor vecine (cele mai mici pătrate, fără capete), doar în afară și cel
  mult cât o parte din laturi; teșiturile nuanțelor (o latură scurtă între două lungi, cu rotirea în ea) se strâng într-un
  colț, cel mult 0,9 px dincolo de contur (1,5 pe marginile dure);
- colțul: vârful e departe de coarda dintre mijloacele laturilor (față de α · 4ε), e un colț strâns sau o întoarcere (peste
  120°); altfel, o cubică între mijloace, cu mânerele potrivite prin vârful buclei; cubicele vecine se unesc cât abaterea
  rămâne sub τ; abaterea se măsoară pe fiecare punct al buclei, față de bucata lui și de vecinele ei;
- marginile dure (sub 15 % nuanțe lângă contur): bucla se netezește întâi (media 1, 2, 3, 2, 1), cu banda de cel puțin 0,4 px.

**Ce a găsit sonda pe o poză JPEG zgomotoasă** (abaterea raportată ajungea la 1,6 px; fiecare caz, pe conturul lui): un
punct întors în discul startului încheia latura și sărea un ac de un pixel; o limbă subțire (vârful ei, dincolo de capătul
coardei) nu era colț, iar cubica ajungea la trei sferturi din drum; mutarea vârfului spre coardă scurta un ac. Reparate, cu
proba pe zgomot: 1,52 / 1,56 / 1,65 → 0,56 / 0,61 / 0,63 px (Fidel / Echilibrat / Neted, 400 × 300); pe poza de 12 Mpx în
browser, 1,63 → 0,79 px (Echilibrat).

**Corpusul** (față de hârtie, în ambele sensuri; Echilibrat): cercurile 0,20 px; pătratul drept 0,09, rotit 0,04, cu margini
dure 0,17, colțurile la cel mult 0,10 / 0,04 / 0,18 px de un vârf; litera R 0,29 / 0,30 px (lângă colțuri 0,47 / 0,66: piciorul
literei are trăsături de 0,5 px); discul cu pete 0,13 px (față de martorul scikit-image 0,22). Țintele (0,4 px netezit, 0,6 px
dur) sunt atinse peste tot, în afara colțurilor ascuțite ale literei. Logoul owner-ului: 48 de contururi (40 + 8), 758 de
vârfuri, abaterea 0,58 px (0,153 mm la 96 px pe țol); față de martorul scikit-image, 0,96 / 0,58 px (colțurile strânse trec cu
cel mult 0,9 px de conturul rotunjit al martorului).

**Timpul** [măsurat pe 07.11, Edge 157 fără fereastră, pe mașina de lucru]: o poză de 4000 × 3000 cu zgomot (5 946 de
contururi): trasarea ~6,7 s în worker, cu fila vie; la sosire, cel mai lung cadru 183 ms (înainte, un gol de 518 ms: imbricarea,
praful pe cutia exactă), apoi 67 ms (verificarea lui Importă, comună ușilor) și ~150 ms desenul vectorilor. În e2e, o poză de
3000 × 2000: 2,9–4,4 s de trasare, cel mai lung gol 17 ms. O imagine de 17 Mpx se reduce la 4850 × 3298, cu scara fișierului.

**Mărimea** [măsurat la `1738160` + proba P04, build determinist]: totalul 531,8 / 550 kB (`main` la `8003cb2`: 519,5, deci
+12,3), pornirea 101,6 / 110 (105,2 cu ușa); workerul trasării 7,0 kB gzip (al lui, în precache), bucata ușilor 36,7 kB
(+2,0), fereastra și histograma ~3 kB. Estimarea din decizie era ~8 kB: workerul separat și fereastra au ieșit mai mari.

**Probele:** corpusul (10 cazuri, în ambele sensuri, cu martorul scikit-image și în CI), 20 de probe țintite ale nucleului,
9 ale ușii (semnăturile, DPI-ul, scara, căile în mm, refuzurile), 6 e2e (logoul ca în Node, D7, coada de imagini, 17 Mpx,
Escape, poza mare cu anularea) plus cele 23 ale importului; suita unitară întreagă verde. **Otrăvurile**
(`test/otravuri/25.1.py`, alese de autor): 69; la prima rulare 58 prinse, 9 scăpate și una VOID. Cele scăpate au primit
probe țintite (nivelul plin al alfa, transparentul pus pe alb, Otsu pe hârtie, golul lipit de margine, bucla prin șa pe
hârtie, marginea dură cu nuanțe, colțurile strânse de cel puțin 25°, banda pe zgomot, pragul de 50 % pe transparență); una
era echivalentă (oprirea dublă la închidere, scoasă: demontarea dialogului o face). Pe codul final, 69 / 69.

**Limitele cunoscute:** pe un rezultat de mii de contururi, sosirea ține un cadru de ~0,2 s, iar mutarea sau mărirea
previzualizării redesenează tot stratul vectorilor; o imagine mare se decodează întreagă o dată în worker și o dată pentru
previzualizare (4 octeți pe pixel: o poză de 40 Mpx ține ~160 MB de fiecare parte cât se citește); Neted rotunjește, din
decizie, colțurile cu brațele scurte (până la ~α · ε = 1,26 px); acele zgomotului rămân în bandă (le șterge curățarea, nu
netezimea).

## Ce am respins

- **O bibliotecă de trasare:** potrace și autotrace (GPL), `marchingsquares` (AGPL), `imagetracerjs` (fără muchia sub-pixel,
  curbe pătratice), `vtracer` (WASM prea mare), OpenCV.js (megaocteți).
- **Codul vechi, portat:** are AGPL în el, strivește imaginea la luminanță (D7) și scrie linii și arce prin nucleul biarcelor
  (D5). Trec doar cazurile, lecțiile și martorul: logoul owner-ului și eroarea de ≈ 0,65 px, de bătut.
- **Calculul pe firul principal** (D6) și **un worker ținut viu cu imaginea în el:** ADR 0015 (aceeași cifră, cod în plus).
- **Netezirea oarbă** (D4) și **un cadran de toleranță fără efect** (D15).
- **Stratul bitmap pe foaie, ca ArtCAM, acum:** cere imaginea în document (schema, IndexedDB, salvarea, exportul). Vine cu
  rândul lui din prag („Straturi bitmap ca suprafață de desen”, etapa 22), peste același nucleu.

## Ce impune

- Butonul importului și fereastra de fișiere primesc imaginile. Fiecare control nou are capitolul lui în manual, în ambele
  limbi (`%% acopera:`), iar textele noi stau în `src/i18n/import.*.ts` (ADR 0086).
- Cererea și răspunsul trasării stau în `src/jobs/calculTrasare.ts`, bazinul în `bazinTrasare.ts` (cu clasele lui de
  anulare, ca să nu împartă o bucată cu bazinul CAM). Nucleul stă în `src/trasare/`, fără niciun import din aplicație
  (regula `trasare-izolat`, cu capcana ei); bazinul îl poate importa (`bazinul-fara-interfata`).
- Mărimea pixelului și abaterea se arată în fereastră; nu se scriu în document.
- Plafonul total e comun cu liniile paralele (ADR 0137): fiecare felie își spune kB-ii în raport.

**Se redeschide dacă:** un fișier real al owner-ului iese mai rău decât în ediția întâi sau decât în ArtCAM; abaterea măsurată
trece de țintă; o poză reală trece de termen fără refuz; totalul trece de 550 kB; sosirea unei poze reale ține fila peste
~0,3 s sau previzualizarea ei se mișcă greu; o poză mare de telefon umple memoria unui telefon la citire.

## Întrebările (recomandarea întâi)

**Răspunsurile (07.11):** „Da, 1a–8a”: toate recomandările, deci și descărcarea lui scikit-image (7a) și logoul în corpusul
public (8a).

**Interfața**
1. **Unde stă trasarea?**
   - **a)** în „Importă…”: o imagine aleasă sau lăsată pe planșă deschide fereastra trasării (un singur loc pentru fișiere,
     cum ai cerut pe 28.10);
   - b) un buton separat, „Trasează o imagine…”, lângă import, ca la Vectric și ArtCAM;
   - c) ca la ArtCAM: imaginea pusă întâi pe foaie, ca strat, apoi trasată de acolo (cu rândul „Straturi bitmap”, mai târziu).
2. **Mărimea unei imagini fără DPI:**
   - **a)** 96 px / țol, ca un SVG, cu lățimea scrisă în fereastră (logoul tău: 340,8 × 86,0 mm, apoi lățimea dorită);
   - b) încadrată în foaie, cât mai mare;
   - c) fereastra cere lățimea de fiecare dată.

**Ce și în ce ordine**
3. **Curbele trasate:**
   - **a)** linii și cubice: puține noduri, editabile cu Noduri; CAM-ul le face biarce la export, ca la orice import;
   - b) linii și arce, ca în ediția întâi (G2 / G3 direct, dar arcele n-au mânere);
   - c) alegerea în fereastră.
4. **Ordinea feliilor:**
   - **a)** 25.1↑ alb-negru → 25.2↑ culorile → 25.3↑ linia mediană (→ 25.4↑ scanările, dacă le vrei);
   - b) culorile înaintea alb-negrului;
   - c) linia mediană întâi (semnături, gravură).
5. **Formatele în plus:**
   - **a)** nu acum: TIFF refuzat cu motivul lui, iar imaginile dintr-un PDF rămân sărite;
   - b) un cititor TIFF propriu (necomprimat, LZW, PackBits, Deflate și CCITT G4, al scanerelor alb-negru), într-o felie a lui;
   - c) și imaginea dintr-un PDF scanat, trasată.

**Pachetul și probele**
6. **Locul în pachet:**
   - **a)** în precache, în totalul de 550 kB (~8 kB acum, ~12–14 kB cu toată linia): merge și fără internet, ca restul;
   - b) doar online, cu plafonul ei, ca testul pas cu pas;
   - c) plafonul total ridicat acum, cu un ADR nou.
7. **Al doilea martor al probei:**
   - **a)** scikit-image (BSD-3), instalat în venv-ul oracolelor și în CI (~65 MB cu scipy și Pillow, estimat), lângă
     valorile pe hârtie;
   - b) doar numpy (deja instalat) și valorile pe hârtie.
8. **Fișierele tale:**
   - **a)** logoul tău din ediția întâi intră în corpusul public al lui cvs2 (e marca aplicației), plus 1–3 imagini pe care le
     trasezi de obicei (un desen scanat, o poză, un logo de client), dacă vrei;
   - b) logoul rămâne doar local: proba lui rulează doar pe mașina asta.
