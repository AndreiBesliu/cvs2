# Verificarea v3: pânza hibridă pe hardware slab (iGPU, procesor încetinit, worker)

Faza 2, tranșa 1b, 07.10.2026. Verifică recomandarea sondei s6 (`RAPORT.md`, în același dosar) pe o placă video
integrată și cu procesorul încetinit. Codul din `cod-verificare/` e **aruncabil**: există doar ca dovadă. Marcaje:
**[măsurat]** = am rulat; **[citit]** = sursă, cu trimitere; **[dedus]** = concluzie din cele două.

Termeni noi (cei explicați în s6 nu se repetă):
- **iGPU** = placa video integrată în procesor. Aici: AMD Radeon „Raphael” din Ryzen 9 7950X, cu 2 unități de calcul
  RDNA2 și memorie comună cu procesorul. Ține locul laptopurilor din ateliere;
- **procesul GPU** = procesul separat al browserului care vorbește cu placa video. Acolo rasterizează Skia desenul
  Canvas2D accelerat, nu în pagină;
- **raster software** = Skia desenează pe procesor, într-o imagine din memorie. Îl cere
  `getContext('2d', { willReadFrequently: true })`;
- **citire** = `getImageData` pe 1 pixel, metoda s6 de a aștepta terminarea desenului;
- **sarcină lungă** = peste 50 ms de lucru continuu pe firul principal. Între timp pagina nu răspunde;
- **Event Timing** = măsurătoarea browserului pentru un clic: cât a așteptat până a fost tratat și când a apărut pe
  ecran cadrul următor („durata până la pictură”);
- **worker** = un fir de execuție separat al paginii. **OffscreenCanvas** = o pânză pe care se desenează din worker;
- **felii** = redesenul exact împărțit în bucăți mici, câte una pe cadru, într-un tampon din spate, afișat abia la
  final;
- **LINE_STRIP** = traseul desenat de placa video ca linie continuă de 1 pixel, fără un dreptunghi pe fiecare segment;
- **LUID** = identificatorul local al unui adaptor video în Windows.

## 1. Ce verific

s6 recomandă pânza hibridă: WebGL2 propriu pentru trasee și harta de înălțime, Canvas2D cu Path2D pentru vectori
(cu bitmapul ultimei randări exacte în timpul gestului și redesen exact după), plus un strat de interacțiune. Totul a
fost măsurat doar pe RTX 3060. Întrebarea: ține pe hardware de atelier?

Afirmațiile decisive:
- **C1** hibridul ține 60 de cadre/s (0 cadre pierdute la 60 Hz) cu 50 k vectori + 5 M segmente de traseu + hartă
  rescrisă la fiecare cadru, la DPR 1 și 1,5;
- **C2** redesenul exact: 10 k forme vizibile ≤ 33 ms; 50 k ≤ 250 ms;
- **C3** Canvas2D desenează curbele exact (≤ 0,09 px la 1000 px/mm); linia vectorilor trebuie să aibă 1 pixel fizic;
- **R** (riscul din s6 §6): redesenul exact de 50 k blochează firul principal, iar mutarea lui într-un worker e
  neprobată.

Pe aceeași mașină, fără nicio setare Windows: RTX 3060 ca referință, iGPU-ul AMD ca înlocuitor de laptop, procesorul
încetinit de 4× și 6× prin CDP.

## 2. Pe scurt

**Verdict: hibridul rămâne, dar nu în forma din s6.** Trei lucruri se schimbă.

1. **Redesenul exact al vectorilor se face într-un worker, pe o pânză SOFTWARE, și se predă ca ImageBitmap.** E
   singura variantă măsurată care lasă libere și pagina, și ecranul: clicul e tratat în 0,3 ms, iar cadrul următor
   apare în 24 ms mediana (p95 32 ms), cât fără niciun redesen [măsurat]. Imaginea exactă de 50 k forme vine în
   67–121 ms, pe ambele plăci. Varianta „worker cu pânză accelerată” nu ajută: clicul e tratat imediat, dar răspunsul
   apare pe ecran abia după 272–312 ms, fiindcă rasterul Skia stă în procesul GPU, comun pentru tot ecranul
   [măsurat].
2. **Traseele, pe trepte după placă.** Pe iGPU, 5 M segmente instanțiate costă 33 ms pe cadru (4 ms pe RTX), așa că
   hibridul s6 merge la 30 de cadre/s la DPR 1 și la 20 la DPR 1,5. Desenate ca LINE_STRIP, aceleași 5 M segmente țin
   60 Hz și pe iGPU, la ambele DPR (0 cadre pierdute din 120) [măsurat]. Segmentele instanțiate (cu grosime și
   culoare pe segment) rămân pentru ~1 M pe iGPU.
3. **Metoda s6 măsura altceva la redesenul exact.** Citirea de 1 pixel mută pânza Canvas2D pe procesor. În bucla cu
   citire, pagina ocupă un nucleu plin și procesul GPU 0,06–0,14 nuclee; fără citire, invers: procesul GPU
   1,8–2,0 nuclee, pagina 0,02–0,03 [măsurat]. Cifrele s6 (10 k: 22,6 ms; 50 k: 77–120 ms) sunt deci ale rasterului
   software [dedus: același cod, același browser, aceeași metodă]. Pe calea accelerată reală, 50 k costă 124–181 ms mediana, cu p95 până la 325 ms pe iGPU la DPR 1,5
   [măsurat].

| | RTX 3060 | iGPU AMD (2 CU) |
|---|---|---|
| Hibrid 50 k + 5 M instanțiate + hartă, la 60 Hz (interval median) | 16,7 ms, 0 pierdute (DPR 1 și 1,5) | 33,3 ms (DPR 1), 50 ms (DPR 1,5) |
| Același hibrid, cu traseele ca LINE_STRIP | — | 16,7 ms, 0 pierdute (DPR 1 și 1,5) |
| Redesen exact 50 k, pânză accelerată, fără citire (median) | 124–162 ms | 131–181 ms (p95 până la 325) |
| Redesen exact 50 k, worker cu pânză software (median) | 121 ms | 67–98 ms |
| Clic în timpul redesenului: pictura după clic, med / p95 | fir principal 552 / 784; worker accelerat 304 / 408; **worker software 24 / 32** | 456 / 504; 296 / 344; **24 / 32** |
| Abaterea curbei la 1000 px/mm (max) | 0,04–0,19 px | 0,05–0,50 px (pânza software: 0,17–0,38) |

Procesorul încetinit de 4–6× nu schimbă redesenul accelerat (costul e în procesul GPU, pe care CDP nu-l încetinește)
și nici hit-test-ul: 50 k forme, p95 0,4 ms, max 1,7 ms la 6×, 120 / 120 clicuri corecte [măsurat]. Încetinirea CDP nu
ajunge nici în worker: calibrarea lui rămâne 41 ms la 4× și la 6× [măsurat]. Deci, pentru laptopul slab, durata
redesenului software din worker rămâne neprobată; ea crește cu viteza unui nucleu [dedus].

**Planul B (vectori pe WebGL) nu trebuie promovat.** Problema nu era desenul vectorilor pe placa video, ci locul
rasterului. Pânza software din worker o rezolvă fără cod nou de desen [dedus din măsurători]. Planul B rămâne rezervă,
cu un criteriu scris la §5.

## 3. Afirmațiile și verdictele

| # | Afirmația (s6) | Verdict | Tip | Dovada, pe scurt |
|---|---|---|---|---|
| C1 | Hibridul ține 60 cadre/s cu 50 k + 5 M + hartă/cadru, la DPR 1 și 1,5 | **INFIRMAT** | domeniu | Adevărat pe RTX: 16,7 ms, 0 pierdute. Pe iGPU: 33,3 ms (DPR 1) și 50 ms (DPR 1,5); cele 5 M segmente instanțiate cer singure 33,3 ms. Cu traseele ca LINE_STRIP, 0 pierdute și pe iGPU. |
| C2 | Redesen exact: 10 k ≤ 33 ms; 50 k ≤ 250 ms | **INFIRMAT** | mecanism | Cifrele s6 sunt ale rasterului software: în rulările mele cu metoda s6, citirea mută pânza pe procesor (contabilitatea pe procese, §4.3). Pe calea accelerată reală mediana încape (10 k: 18–34 ms; 50 k: 124–181 ms), dar coada nu: 10 k are p95 52–74 ms; 50 k pe iGPU la DPR 1,5 are p95 325 ms și max 354 ms. |
| C3a | Canvas2D desenează curbele exact, ≤ 0,09 px la 1000 px/mm | **INFIRMAT** | mecanism | Curba e aproximată la fiecare redesen, sub un pixel, nu desenată exact: 0,19 px cu coordonatele mutate lângă origine (pe ambele plăci); 0,5 px pe iGPU, la cusătura căii; 0,17–0,38 px pe pânza software. Bugetul s6 de ≤ 0,5 px ține în toate cele 78 de măsurători. |
| C3b | Linia vectorilor trebuie să aibă 1 pixel fizic | **CONFIRMAT** | — | DPR 1,5, 10 k forme: linie de 1 px CSS 348–384 ms, de 1 px fizic 18–29 ms, pe ambele plăci și pe ambele căi (software și accelerată). |
| R | Redesenul exact de 50 k blochează firul principal | **CONFIRMAT** | — | Apelul de desen ia 0,1 ms, dar firul principal stă ~90 % din timp în sarcini lungi, așteptând procesul GPU. Clicul așteaptă 94–128 ms mediana, iar pictura vine după 456–552 ms. |
| W | Un worker cu OffscreenCanvas rezolvă blocajul | **INFIRMAT** | domeniu | Adevărat doar cu pânza software în worker: pictura după clic 24 ms, ca martorul. Cu pânza accelerată în worker: clic tratat în 0,3 ms, dar pictura vine după 272–312 ms. |

## 4. Cazurile noi și măsurătorile

### 4.1 Cum am mutat randarea pe iGPU, fără setări Windows

Adaptoarele, din `dxdiag /t` și `chrome://gpu` [măsurat]: RTX 3060 (monitorul e pe el: HDMI, 1920×1080, 60 Hz) și AMD
Radeon 0x164E (fără monitor, „Hybrid Graphics GPU: Integrated”). LUID-urile citite din `chrome://gpu`: RTX
`{0,231807}`, AMD `{0,237016}`.

| Metoda (doar în browser) | Pe ce adaptor a rulat procesul GPU [măsurat] |
|---|---|
| implicit | RTX |
| WebGL `powerPreference: 'low-power'` | RTX (ignorat) |
| WebGPU `requestAdapter({ powerPreference: 'low-power' })` | nvidia / ampere (ignorat) |
| `--use-angle=d3d11` | RTX |
| `--use-webgpu-power-preference=force-low-power` | WebGPU: niciun adaptor |
| **`--force_low_power_gpu`** | **AMD**: WebGL, WebGPU (amd / rdna-2) și `chrome://gpu` *ACTIVE* |
| **`--use-adapter-luid=0,237016`** (forma `{HighPart,LowPart}` din `chrome://gpu`) | **AMD** |
| `--use-adapter-luid=0x39dd8`, `=237016`, `=0000000000039dd8` | RTX (ignorat) |
| `--use-adapter-luid=0x0,0x39dd8` | **SwiftShader**, adică software: o capcană care ar fi invalidat cifrele |

Toate rulările pe iGPU au folosit `--force_low_power_gpu`, care nu depinde de LUID (LUID-ul se schimbă la repornirea
Windows). Fiecare pagină a citit `UNMASKED_RENDERER`; niciuna nu a fost software (anexa H).

**Instrumentul a greșit o dată.** Primul meu cititor al `chrome://gpu` raporta AMD și la rularea pe RTX: textul brut
nu avea spațiu în „GPU0 :”, împărțirea pe adaptoare eșua și se citea al doilea nume. L-a prins comparația cu
`UNMASKED_RENDERER` din pagină. L-am reparat înainte de măsurători.

**Cât de bun e înlocuitorul** [dedus]: iGPU-ul are 128 de nuclee de shader, mai slab decât Iris Xe sau Radeon
680M/780M și cam cât un Intel UHD de birou. Procesorul rămâne însă 7950X, iar imaginea iGPU-ului se copiază pe RTX
pentru monitor (pe un laptop, iGPU-ul ține chiar ecranul). Partea de placă video e deci realistă spre pesimistă, iar
partea de procesor e optimistă.

### 4.2 C1: ritmul real la 60 Hz pe iGPU

Metoda din s6, neschimbată: sincronizarea verticală pornită, fără citiri, intervalul dintre cadre (16,7 ms = niciun
cadru pierdut). Martorii funcționează și pe iGPU (anexa B): pânza goală dă 16,7 ms, Canvas2D 10 k redesenat la fiecare
cadru dă 33,3 ms, martorul GPU dă 250–333 ms [măsurat].

Pe iGPU [măsurat]:
- hibridul s6 (50 k din bitmap + 5 M segmente instanțiate + hartă): 33,3 ms la DPR 1 (pan și zoom), 50 ms la DPR 1,5;
- cu 1 M segmente instanțiate: 16,7 ms la ambele DPR (max 17,1 ms);
- cu 2 M: 16,7 ms la DPR 1, dar p95 33,4 ms la DPR 1,5;
- **cu 5 M ca LINE_STRIP: 16,7 ms la ambele DPR, pe pan și pe zoom, max 16,8 ms** (anexa B2).

Costul pe GPU, cu citire (anexa A): 5 M segmente instanțiate 33,3 / 46,8 ms (DPR 1 / 1,5) pe iGPU, față de 4,0 / 4,8 ms
pe RTX, adică de 8–10 ori mai lent. LINE_STRIP 5 M: 7,3 / 8,8 ms. Harta 4096×2048 + o dală pe cadru: 1,5 / 1,7 ms
[măsurat].

### 4.3 C2 și instrumentul s6: unde se face, de fapt, rasterul

Am citit timpul de procesor al fiecărui tip de proces al browserului (CDP `SystemInfo.getProcessInfo`, la începutul și
la sfârșitul buclei de cadre). Rezultatul e în nuclee folosite în medie (1,0 = un nucleu plin), anexa F [măsurat]:

| Bucla de redesen exact | pagina (renderer) | procesul GPU |
|---|---:|---:|
| 10 k sau 50 k, **cu** citire (metoda s6) | 0,97–1,0 | 0,06–0,14 |
| 10 k sau 50 k, **fără** citire (calea reală) | 0,02–0,03 | 1,8–2,0 |

Cu citire, Skia desenează pe procesor, în pagină; fără citire, în procesul GPU, pe aproape două nuclee. A doua probă,
independentă: încetinirea CDP lovește doar pagina. Cu citire, 50 k trece de la 97,9 ms la 543,8 ms (4×) și 754,6 ms
(6×); fără citire rămâne 161,7 → 148,6 → 130,1 ms (anexa E) [măsurat].

**Un martor al meu a ratat, iar contabilitatea l-a prins.** Testul „mută citirea pânza pe procesor?” (anexa G) făcea 12
citiri într-o singură sarcină și nu a văzut nicio mutare. Mutarea apare abia între cadre [dedus]. Nu-l folosesc ca
dovadă.

Calea reală (accelerată, fără citire), interval între cadre, med / p95 (anexele A, E, F) [măsurat]:
- 10 k: RTX 17,6–17,8 / 52–64 ms; iGPU 18,3–33,7 / 63–74 ms;
- 50 k: RTX 124–162 / 150–188 ms; iGPU 131–181 / 159–325 ms (max 354 ms la DPR 1,5).

### 4.4 R și W: latența intrării în timpul redesenului (worker vs fir principal)

**Metoda** [măsurat]: o pagină cu 50 k forme, toate vizibile, cu redesene exacte una după alta timp de 6 s. Playwright
mișcă mouse-ul real (CDP Input → Pointer Events) și dă clicuri la momente aleatoare față de redesen. La fiecare clic,
pagina face hit-test pe 50 k forme și desenează un marcaj pe stratul de interacțiune. Măsor:
- întârzierea clicului (de la `event.timeStamp` la începutul funcției), cu ceasul meu și, independent, cu Event Timing
  (`processingStart − startTime`). Cele două coincid: de exemplu 127,8 față de 127,8 ms și 0,4 față de 0,3 ms;
- durata până la pictură (Event Timing; raportată doar peste 16 ms, cu pas de 8 ms);
- sarcinile lungi ale firului principal.

**Oracolul pe hârtie** (martorul pozitiv `busy`): bucle JS de 100 ms, una după alta. Un clic venit la un moment
aleator așteaptă uniform între 0 și 100 ms, deci mediana prezisă e 50 ms, iar maximul ≤ 100 ms. Măsurat: 48,5 ms (max
90,4) pe RTX și 51,6 ms (max 62) pe iGPU. **Martorul negativ** (`idle`): 0,2 ms și pictura în 16–24 ms.

Modurile:
- `main`: pânză accelerată pe firul principal;
- `worker`: pânza vizibilă transferată în worker (`transferControlToOffscreen`), accelerată;
- `workerbmp`: worker cu OffscreenCanvas propriu, accelerat → `transferToImageBitmap` → `postMessage` →
  `bitmaprenderer` pe firul principal;
- `workersw`: la fel ca `workerbmp`, dar pânza din worker e **software**;
- `slices`: pânză accelerată pe firul principal, cel mult 25 000 de segmente pe cadru, într-un tampon din spate;
- `mainsw`: pânză software pe firul principal.

Rezultatele (anexa D) [măsurat]:

| Mod | Clic: așteptare med, RTX / iGPU | Pictura după clic med / p95, RTX; iGPU | Sarcini lungi în 6 s | Imagine exactă nouă la (med) |
|---|---|---|---|---|
| idle (martor) | 0,2 / 0,2 ms | 16–24 / 32; 16 / 24 ms | 0 | — |
| main | 128 / 94 ms | 552 / 784; 456 / 504 ms | 5,4–5,6 s | 133 ms |
| worker | 0,4 / 0,3 ms | 304 / 408; 296 / 344 ms | ~0,1 s | 133–150 ms |
| workerbmp | 0,3 / 0,3 ms | 312 / 376; 272 / 352 ms | 0 | 133–138 ms |
| slices | 0,2 / 0,3 ms | 32 / 144; 32 / 136 ms | 0 | 433–450 ms |
| mainsw | 43 / 49 ms | 176 / 184; 160 / 184 ms | 6,1–6,2 s | 100 ms |
| **workersw** | **0,3 / 0,3 ms** | **24 / 32; 24 / 32 ms** | **0** | **121 / 98 ms** |

Ce arată:
1. Redesenul accelerat blochează pagina, deși apelul de desen durează 0,1 ms: pagina așteaptă procesul GPU (sarcini
   lungi de până la 288 ms).
2. Workerul cu pânză accelerată eliberează pagina, dar nu ecranul. Toate straturile se compun într-un singur cadru,
   iar rasterul Skia stă în procesul GPU, comun [dedus din măsurători].
3. Feliile țin 60 Hz și pictura în 32 ms mediana, dar coada rămâne (p95 136–144 ms), iar imaginea exactă vine de 3 ori
   mai târziu.
4. Workerul cu pânză software folosește procesul GPU doar pentru imaginea finală [dedus]. E singurul mod la nivelul
   martorului [măsurat].

**Costul transferului** [măsurat]: `postMessage` cu ImageBitmap transferat 0,0–0,2 ms; `transferFromImageBitmap`
0,0 ms; de la `postMessage` la cadrul următor 0,4–0,5 ms (software) și 7–9 ms (accelerat). `transferToImageBitmap`
durează cât rasterul (91–134 ms): acolo se așteaptă desenul, nu copia. Cu `transferControlToOffscreen` nu există un
transfer explicit, dar imaginea exactă vine în același ritm ca pe firul principal (133–150 ms), cu același efect
asupra ecranului.

Cu procesorul încetinit de 4× și 6× (doar firul principal), concluziile nu se schimbă: `main` așteaptă 147–200 ms,
workerul accelerat pictează după 224–320 ms, feliile după 32 ms (anexa D).

### 4.5 Procesorul încetinit: hit-test și Pointer Events

**Oracolul încetinirii:** o buclă fixă de aritmetică trebuie să dureze de k ori mai mult. Măsurat pe firul principal:
41–49 ms la 1×, 172–202 ms la 4×, 272–286 ms la 6×. În worker: 40,6–41,5 ms la toate ratele, deci **CDP nu încetinește
workerul** [măsurat].

Clic real pe 50 k forme, cu oracolul analitic din s6, pe RTX [măsurat]: hit-test med / p95 / max 0,0 / 0,1 / 0,3 ms
(1×), 0,0 / 0,2 / 1,2 ms (4×), 0,1 / 0,4 / 1,7 ms (6×); de la eveniment la rezultat, max 0,8 / 3,9 / 5,8 ms; 120 / 120
corecte la toate ratele. Hit-test-ul și Pointer Events nu sunt o problemă nici pe un procesor de 6 ori mai lent.

### 4.6 C3: fidelitatea la zoom, pe iGPU

Metoda și oracolul din s6: cerc plin de R = 50 mm la 1000 px/mm, muchia la 50 % acoperire, abaterea = distanța până la
centru minus R, calculată în double. **Martorul negativ** (PixiJS, abatere prezisă pe hârtie 29,149 px) dă 29,27 px pe
iGPU, deci metoda vede eroarea și acolo [măsurat]. Am lărgit proba la o grilă: 3 centre (lângă origine, mijlocul
plăcii, colțul ei) × 3 unghiuri, plus o variantă cu coordonatele mutate lângă centrul vederii (RTC), plus pânza
software (anexa C).

[măsurat]:
- RTX, pânză accelerată: max 0,04–0,09 px peste tot, ca în s6;
- iGPU, pânză accelerată: 0,05–0,11 px, cu o excepție. La 0°, **un singur punct din 361 are 0,5 px**: rândul din
  mijlocul vederii, exact punctul de start al cercului. Valoarea e aceeași la toate trei centrele, deci nu vine din
  coordonatele mari, ci din cusătura căii [dedus];
- RTC: 0,19 px la 37°, pe **ambele** plăci (102 din 361 de puncte peste 0,1 px). Mutarea coordonatelor nu repară
  nimic; schimbă doar unde cad vârfurile aproximării;
- pânza software: 0,17–0,20 px la DPR 1 și 0,24–0,38 px la DPR 1,5.

Deci Canvas2D nu desenează curba exact: o aproximează la fiecare redesen, sub un pixel, cu o abatere care depinde de
placă, de cale și de poziție. Cifra s6 de 0,04–0,09 px e un caz favorabil. Bugetul s6 de ≤ 0,5 px ține în toate cele 78
de măsurători (maximul atins: 0,500 px) [măsurat].

**Linia de 1 pixel fizic** (C3b), DPR 1,5, 10 k forme [măsurat]: linie de 1 px CSS 350,7 / 383,5 ms (RTX / iGPU, cu
citire, deci raster software) și 351,0 / 348,3 ms (fără citire, accelerat); linie de 1 px fizic 24,0 / 28,7 ms și
17,6 / 22,1 ms. De 13–20 de ori mai ieftin, pe ambele căi.

## 5. Ce schimbă în arhitectură

1. **Stratul `vectori` = imaginea exactă produsă de un worker, pe pânză software.**
   - Workerul ține propriile Path2D (pe găleți spațiale, ca în s6) și desenează pe un `OffscreenCanvas` cu
     `getContext('2d', { willReadFrequently: true })`.
   - Imaginea pleacă spre firul principal ca `ImageBitmap` transferat (0,1 ms) și se afișează cu `bitmaprenderer` sau
     ca textură. În gest, firul principal mută și scalează ultimul bitmap, ca în s6.
   - Imaginea exactă vine la ~70–120 ms după cerere, pe ambele plăci, fără sarcini lungi și fără să ocupe procesul
     GPU.
   - **Interzis:** redesenul mare pe pânza accelerată, fie pe firul principal, fie în worker. Ocupă procesul GPU
     120–350 ms și îngheață tot ecranul.
   - Pânza accelerată rămâne pentru ce e mic: stratul de interacțiune și redesenul exact la zoom pe puține forme.
   - Rasterul se poate împărți pe 2–4 workeri, pe benzi de ecran, dacă un nucleu de laptop e prea lent [dedus,
     neprobat].
2. **Traseele: două trepte, după placă.**
   - LINE_STRIP (1 px, culoarea din Z) e implicit pentru previzualizarea densă: 5 M segmente încap în 60 Hz și pe iGPU.
   - Segmentele instanțiate (grosime și culoare pe segment) se folosesc sub un buget de segmente vizibile: ~5 M pe o
     placă dedicată, ~1 M pe iGPU.
   - Bugetul se alege la pornire, dintr-un test scurt de cadru, nu după numele plăcii [dedus].
3. **Instrumentul de măsură al pânzei.** `getImageData` nu se folosește ca sincronizare a pânzei măsurate. Costul se
   citește din ritmul real (intervalul rAF), din Event Timing și din timpul de procesor pe tip de proces. Testul de
   performanță care păzește regula 1 se scrie așa.
4. **Bugetele pe clase de hardware** (DPR 1–1,5):

   | Ce | RTX 3060 (placă dedicată) | iGPU slab (proxy) | Procesor ×4–6 (CDP) |
   |---|---|---|---|
   | Cadru în gest: vectori din bitmap + hartă + trasee | 0 cadre pierdute cu 5 M instanțiate | 0 pierdute cu 5 M LINE_STRIP sau ≤ 1 M instanțiate | neschimbat: costul e pe GPU |
   | Imaginea exactă 50 k, worker software | ≤ 150 ms (121 med, p95 134) | ≤ 150 ms (67–98 med, p95 ≤ 124) | neprobat: CDP nu ajunge în worker |
   | Clic în timpul redesenului: pictura după clic | ≤ 50 ms (24 med, p95 32) | ≤ 50 ms (24 med, p95 32) | — |
   | Hit-test, 50 k forme | p95 ≤ 1 ms (0,1) | același procesor | p95 ≤ 1 ms (0,4 la 6×), max 1,7 |
   | Abaterea curbei, până la 1000 px/mm | ≤ 0,5 px (max 0,19) | ≤ 0,5 px (max 0,5) | pânza software: max 0,38 px |
   | Linia vectorilor | 1 px fizic | 1 px fizic | — |

5. **Planul B (vectori pe WebGL) nu se promovează.** Pe iGPU l-ar face dependent de placa video (5 M segmente
   instanțiate = 33 ms) și cere mult cod propriu. Rămâne rezervă, cu un criteriu scris: se promovează dacă, pe un
   laptop real de atelier, imaginea exactă software trece de ~1 s la 50 k forme, sau dacă owner-ul respinge bitmapul
   neclar din timpul gestului.
6. **OffscreenCanvas-ul în worker intră în arhitectură, dar ca pânză software.** Pânza accelerată în worker nu se
   folosește pentru redesenul mare.

## 6. Riscuri și ce a rămas neprobat

- **Procesorul slab, pentru worker.** CDP nu încetinește workerul, iar rasterul software crește cu viteza unui nucleu.
  Pe un laptop cu nucleul de 2–3 ori mai lent, imaginea exactă de 50 k ar veni în ~200–350 ms [dedus]. Ecranul rămâne
  liber, dar durata trebuie măsurată pe un laptop real, în felia verticală.
- **Procesorul slab, pentru procesul GPU.** Nici procesul GPU nu e încetinit de CDP. Pe calea accelerată folosește ~2
  nuclee pentru 50 k forme, deci pe un laptop ar fi mai lent decât aici [dedus]. Recomandarea îl ocolește pentru
  vectori, dar compunerea și stratul de interacțiune trec tot prin el.
- **`willReadFrequently` e un indiciu pentru browser, nu o garanție** [dedus; textul specificației HTML nu a fost
  recitit aici]. O versiune viitoare de Chromium ar putea accelera din nou pânza. Plasa: un test care măsoară nucleele
  procesului GPU în timpul redesenului (ca în anexa F) și pică peste un prag.
- **Fidelitatea pânzei software** e mai slabă decât a celei accelerate (până la 0,38 px la DPR 1,5). Încape în buget,
  dar aproape de el; peste 1000 px/mm nu e probată.
- **iGPU-ul ca înlocuitor:** fără monitor propriu (imaginea se copiază pe RTX), cu procesor 7950X și memorie DDR5
  rapidă. Intel UHD / Iris și Radeon 680M nu sunt măsurate, iar driverele lor pot alege alte căi Skia (vezi cusătura de
  0,5 px de pe AMD).
- **Feliile** nu au fost reglate (buget fix de 25 000 de segmente pe cadru). Coada lor (136–168 ms) ar putea scădea cu
  un buget măsurat pe cadru. Nu mai sunt recomandarea principală.
- **Zgomotul:** alți 4 agenți rulau în paralel. Aceleași configurații au variat între rulări cu ~15–25 % (de exemplu,
  50 k fără citire pe RTX: 124, 141 și 162 ms). Concluziile se sprijină pe comparații din aceeași rulare și pe ordinul
  de mărime.
- **Puține clicuri în modul `main`:** 5–7 în 6 s, fiindcă CDP Input așteaptă ca pagina să confirme fiecare
  eveniment. Peste pragul de 5, dar coada e estimată din puține puncte.
- **DPR 1,25** nu a fost refăcut aici (s6 l-a măsurat pe RTX). **Browserul:** Edge 154; Chrome stabil nemăsurat.

## 7. Cum se reproduce

Cifrele-cheie pe iGPU, în ~2,5 minute: ritmul real al hibridului (instanțiat și LINE_STRIP) cu martori, redesenul
exact pe calea reală, fidelitatea cu martorul negativ, latența clicului (martori, fir principal, worker accelerat,
worker software):

```
cd C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/v3-panza-igpu
node v3run.mjs --gpu igpu --plan masoaravs --dpr 1 --out m-vs.json && node v3run.mjs --gpu igpu --plan masoara --out m-igpu.json && node latrun.mjs --gpu igpu --modes idle,busy,main,worker,workersw --dur 4000 --out m-lat.json
```

Rularea de control (07.10) a durat 78 s și a refăcut cifrele-cheie: hibridul cu 5 M segmente instanțiate 33,3 ms, cu
LINE_STRIP 16,7 ms; 50 k pe pânza accelerată 131 ms, cu procesul GPU la 1,8 nuclee; martorul PixiJS 29,27 px; clicul cu
workerul software pictat în 24 ms (workerul accelerat: 240 ms). Aceeași comandă cu `--gpu rtx` dă referința.
Celelalte rulări:
- `node v3run.mjs --gpu rtx|igpu --plan timed|vsync|vsstrip|fidgrid|fidsw|gpucpu|deaccel` (anexele A–C, F, G);
- `node v3run.mjs --gpu rtx --plan throttle` (încetinirea 1×, 4×, 6×; ~2,7 min; anexa E);
- `node latrun.mjs --gpu rtx --modes idle,busy,main,worker,workerbmp,slices,workersw,mainsw --dur 6000` și
  `node latrun.mjs --gpu rtx --modes idle,main,worker,slices --rate 4,6` (anexa D);
- `node adaptoare.mjs`, apoi `node adaptoare.mjs --doar-luid --luid "0,<LowPart>"` (§4.1);
- `node tabele-v3.mjs > tabele-v3.md` (tabelele din anexă, generate din fișierele de rezultate).

Dacă dosarul de lucru a dispărut, se reface din repo, în afara Drive-ului (codul s6, peste el codul acestei
verificări):

```
xcopy /E /I C:\Users\besli\Desktop\MyWork\Apps\cncvs2\docs\faza2\sonde\s6-panza\cod %TEMP%\v3-panza-igpu && xcopy /E /Y C:\Users\besli\Desktop\MyWork\Apps\cncvs2\docs\faza2\sonde\s6-panza\cod-verificare %TEMP%\v3-panza-igpu && cd /d %TEMP%\v3-panza-igpu && set PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 && npm ci
```

Browserul implicit: `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; altul se dă prin variabila
`S6_CHROME`. Portul e 5186, doar pe 127.0.0.1. Fișierele de rezultate (`v3-*.json`, `adaptoare*.json`) sunt în
`cod-verificare/`.

## Anexă: tabelele, generate din fișierele de rezultate

Generate cu `node tabele-v3.mjs`, nu transcrise de mână. Rândurile „rtx / igpu” fără sufix provin din rulările de
latență; `workersw` și `mainsw` sunt din rularea a doua (`v3-lat-sw-*.json`), cu propriul martor `idle`.

###### A. Cadre, timp până la terminare (median / p95, ms), sincronizarea verticală oprită

ⁱ = fără citire: intervalul dintre cadre (debitul conductei), fiindcă apelul de desen în sine durează ~0,1 ms.

##### Bancurile-cheie s6, pe ambele adaptoare

| Ce | RTX DPR 1 | RTX DPR 1,5 | iGPU DPR 1 | iGPU DPR 1,5 |
|---|---:|---:|---:|---:|
| martor: pânză goală (citire 1 px) | 0,7 / 1,2 | 1,6 / 2,0 | 0,6 / 0,9 | 1,3 / 1,7 |
| Canvas2D 10 k, redesen exact, cu citire (metoda s6) | 15,9 / 20,1 | 24,0 / 29,7 | 16,5 / 22,3 | 28,7 / 35,1 |
| Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală) | 17,8 / 63,8 ⁱ | 17,6 / 52,2 ⁱ | 24,8 / 68,5 ⁱ | 22,1 / 74,0 ⁱ |
| Canvas2D 50 k pe găleți, cu citire (metoda s6) | 68,1 / 78,3 | 93,0 / 114,0 | 91,7 / 100,4 | 140,4 / 146,6 |
| Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală) | 140,7 / 179,6 ⁱ | 124,1 / 149,7 ⁱ | 180,6 / 210,7 ⁱ | 171,0 / 324,9 ⁱ |
| Canvas2D 10 k, linie 1 px CSS, cu citire | — | 350,7 / 385,7 | — | 383,5 / 445,4 |
| Canvas2D 10 k, linie 1 px CSS, fără citire | — | 351,0 / 732,7 ⁱ | — | 348,3 / 786,4 ⁱ |
| WebGL2 1 M segmente instanțiate | 1,1 / 1,5 | 1,3 / 1,7 | 7,8 / 8,3 | 12,5 / 13,2 |
| WebGL2 2 M segmente instanțiate | 1,8 / 2,2 | 2,2 / 2,7 | 14,2 / 14,6 | 21,5 / 22,8 |
| WebGL2 5 M segmente instanțiate | 4,0 / 4,4 | 4,8 / 5,4 | 33,3 / 33,8 | 46,8 / 49,3 |
| WebGL2 5 M ca LINE_STRIP (1 px) | 2,0 / 2,4 | 2,2 / 2,7 | 7,3 / 7,9 | 8,8 / 9,3 |
| WebGL2 hartă 4096×2048 + dală/cadru | 0,5 / 0,7 | 0,5 / 0,8 | 1,5 / 1,7 | 1,7 / 2,2 |
| Hibrid 50 k (bitmap) + 5 M + hartă, pan | 9,0 / 9,7 | 16,0 / 18,4 | 44,2 / 49,8 | 64,3 / 67,9 |
| Hibrid 50 k (bitmap) + 5 M + hartă, zoom | 8,9 / 9,4 | 16,2 / 17,5 | 32,2 / 34,6 | 39,7 / 45,7 |

###### B. Ritmul real la 60 Hz (interval rAF median / p95 / max, ms; 16,7 = niciun cadru pierdut)

##### Sincronizarea verticală pornită, fără citiri

| Ce | RTX DPR 1 | RTX DPR 1,5 | iGPU DPR 1 | iGPU DPR 1,5 |
|---|---:|---:|---:|---:|
| martor pozitiv: Canvas2D 10 k exact la fiecare cadru | 33,3 / 33,4 / 33,5 | 16,7 / 33,4 / 33,5 | 33,3 / 33,4 / 33,5 | 33,3 / 33,4 / 50,1 |
| martor negativ: pânză goală | 16,7 / 16,8 / 17,0 | 16,7 / 16,8 / 16,8 | 16,7 / 16,8 / 16,8 | 16,7 / 16,7 / 16,8 |
| hibrid 50 k + **5 M** + hartă, pan | 16,7 / 16,8 / 16,8 | 16,7 / 16,8 / 16,9 | 33,3 / 33,5 / 50,1 | 50,0 / 50,1 / 50,2 |
| hibrid 50 k + **5 M** + hartă, zoom | 16,7 / 16,7 / 16,8 | 16,7 / 16,8 / 16,8 | 33,3 / 33,4 / 33,5 | 33,3 / 50,0 / 50,1 |
| hibrid 50 k + **1 M** + hartă, pan | 16,7 / 16,8 / 16,8 | 16,7 / 16,8 / 16,8 | 16,7 / 16,8 / 17,1 | 16,7 / 16,7 / 16,8 |
| hibrid 50 k + **2 M** + hartă, pan | 16,7 / 16,8 / 16,8 | 16,7 / 16,8 / 16,8 | 16,7 / 16,8 / 16,9 | 16,7 / 33,4 / 49,9 |
| Canvas2D 50 k exact la fiecare cadru (fără citire) | 133,4 / 150,0 / 200,0 | 133,3 / 166,6 / 266,5 | 166,7 / 233,3 / 333,4 | 166,7 / 200,1 / 350,1 |
| martor pozitiv GPU: 5 M segmente × 8 desene | 33,3 / 50,0 / 116,7 | 33,3 / 66,6 / 66,7 | 250,0 / 500,0 / 1050,1 | 333,4 / 699,9 / 1433,3 |

###### B2. iGPU: hibridul cu traseele ca LINE_STRIP (5 M segmente, linie de 1 px), sincronizarea verticală pornită

| DPR | Ce | Interval rAF med / p95 / max ms | Cadru cu citire med / p95 ms |
|---:|---|---|---|
| 1 | martor negativ: pânză goală | 16,7 / 16,8 / 16,9 | — |
| 1 | hibrid 50 k + 5 M LINE_STRIP + hartă, pan | 16,7 / 16,7 / 16,8 | — |
| 1 | hibrid 50 k + 5 M LINE_STRIP + hartă, zoom | 16,7 / 16,8 / 16,8 | — |
| 1 | hibrid 50 k + 5 M LINE_STRIP + hartă, pan (cu citire) | 16,7 / 33,3 / 33,4 | 18,5 / 21,8 |
| 1,5 | martor negativ: pânză goală | 16,7 / 16,8 / 16,8 | — |
| 1,5 | hibrid 50 k + 5 M LINE_STRIP + hartă, pan | 16,7 / 16,7 / 16,8 | — |
| 1,5 | hibrid 50 k + 5 M LINE_STRIP + hartă, zoom | 16,7 / 16,8 / 16,8 | — |
| 1,5 | hibrid 50 k + 5 M LINE_STRIP + hartă, pan (cu citire) | 33,3 / 33,4 / 33,4 | 26,2 / 29,7 |

###### C. Fidelitatea la zoom (cerc plin R = 50 mm, 1000 px/mm dacă nu scrie altfel)

| Adaptor | DPR | Randator | Centru mm | Unghi | Zoom | Puncte | Abatere max px | p95 px | > 0,1 px | > 0,25 px | Prezis px |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| RTX | 1 | c2d (rularea A) | 150, 150 | 37° | 1000 | 361 | 0,040 | 0,036 | — | — | 0,000 |
| RTX | 1 | c2d (rularea A) | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | — | — | 0,000 |
| RTX | 1 | c2d (rularea A) | 2390, 1170 | 0° | 1000 | 361 | 0,087 | 0,086 | — | — | 0,000 |
| RTX | 1 | pixi (rularea A) | 150, 150 | 37° | 1000 | 361 | 29,264 | 29,177 | — | — | 29,149 |
| RTX | 1,5 | c2d (rularea A) | 150, 150 | 37° | 1000 | 541 | 0,043 | 0,041 | — | — | 0,000 |
| RTX | 1,5 | c2d (rularea A) | 150, 150 | 90° | 1000 | 961 | 0,088 | 0,086 | — | — | 0,000 |
| RTX | 1,5 | c2d (rularea A) | 2390, 1170 | 0° | 1000 | 541 | 0,088 | 0,086 | — | — | 0,000 |
| RTX | 1,5 | pixi (rularea A) | 150, 150 | 37° | 1000 | 541 | 44,204 | 44,093 | — | — | 43,723 |
| iGPU | 1 | c2d (rularea A) | 150, 150 | 37° | 1000 | 361 | 0,051 | 0,036 | — | — | 0,000 |
| iGPU | 1 | c2d (rularea A) | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | — | — | 0,000 |
| iGPU | 1 | c2d (rularea A) | 2390, 1170 | 0° | 1000 | 361 | 0,500 | 0,086 | — | — | 0,000 |
| iGPU | 1 | pixi (rularea A) | 150, 150 | 37° | 1000 | 361 | 29,270 | 29,178 | — | — | 29,149 |
| iGPU | 1,5 | c2d (rularea A) | 150, 150 | 37° | 1000 | 541 | 0,043 | 0,041 | — | — | 0,000 |
| iGPU | 1,5 | c2d (rularea A) | 150, 150 | 90° | 1000 | 961 | 0,088 | 0,086 | — | — | 0,000 |
| iGPU | 1,5 | c2d (rularea A) | 2390, 1170 | 0° | 1000 | 541 | 0,500 | 0,086 | — | — | 0,000 |
| iGPU | 1,5 | pixi (rularea A) | 150, 150 | 37° | 1000 | 541 | 44,204 | 44,093 | — | — | 43,723 |
| RTX | 1 | c2d | 150, 150 | 0° | 1000 | 361 | 0,087 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 150, 150 | 0° | 1000 | 361 | 0,087 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2d | 150, 150 | 37° | 1000 | 361 | 0,040 | 0,036 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 150, 150 | 37° | 1000 | 361 | 0,192 | 0,166 | 102 | 0 | 0,000 |
| RTX | 1 | c2d | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2d | 150, 150 | 37° | 100 | 361 | 0,046 | 0,040 | 0 | 0 | 0,000 |
| RTX | 1 | pixi | 150, 150 | 37° | 1000 | 361 | 29,264 | 29,177 | 361 | 361 | 29,149 |
| RTX | 1 | c2d | 1220, 610 | 0° | 1000 | 361 | 0,087 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 1220, 610 | 0° | 1000 | 361 | 0,087 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2d | 1220, 610 | 37° | 1000 | 361 | 0,059 | 0,057 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 1220, 610 | 37° | 1000 | 361 | 0,192 | 0,166 | 102 | 0 | 0,000 |
| RTX | 1 | c2d | 1220, 610 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 1220, 610 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2d | 1220, 610 | 37° | 100 | 361 | 0,047 | 0,040 | 0 | 0 | 0,000 |
| RTX | 1 | pixi | 1220, 610 | 37° | 1000 | 361 | 29,264 | 29,177 | 361 | 361 | 29,149 |
| RTX | 1 | c2d | 2390, 1170 | 0° | 1000 | 361 | 0,087 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 2390, 1170 | 0° | 1000 | 361 | 0,087 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2d | 2390, 1170 | 37° | 1000 | 361 | 0,059 | 0,057 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 2390, 1170 | 37° | 1000 | 361 | 0,192 | 0,166 | 102 | 0 | 0,000 |
| RTX | 1 | c2d | 2390, 1170 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2drtc | 2390, 1170 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| RTX | 1 | c2d | 2390, 1170 | 37° | 100 | 361 | 0,047 | 0,040 | 0 | 0 | 0,000 |
| RTX | 1 | pixi | 2390, 1170 | 37° | 1000 | 361 | 29,264 | 29,177 | 361 | 361 | 29,149 |
| iGPU | 1 | c2d | 150, 150 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2drtc | 150, 150 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2d | 150, 150 | 37° | 1000 | 361 | 0,051 | 0,036 | 0 | 0 | 0,000 |
| iGPU | 1 | c2drtc | 150, 150 | 37° | 1000 | 361 | 0,192 | 0,166 | 102 | 0 | 0,000 |
| iGPU | 1 | c2d | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2drtc | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2d | 150, 150 | 37° | 100 | 361 | 0,045 | 0,040 | 0 | 0 | 0,000 |
| iGPU | 1 | pixi | 150, 150 | 37° | 1000 | 361 | 29,270 | 29,178 | 361 | 361 | 29,149 |
| iGPU | 1 | c2d | 1220, 610 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2drtc | 1220, 610 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2d | 1220, 610 | 37° | 1000 | 361 | 0,058 | 0,057 | 0 | 0 | 0,000 |
| iGPU | 1 | c2drtc | 1220, 610 | 37° | 1000 | 361 | 0,192 | 0,166 | 102 | 0 | 0,000 |
| iGPU | 1 | c2d | 1220, 610 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2drtc | 1220, 610 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2d | 1220, 610 | 37° | 100 | 361 | 0,047 | 0,040 | 0 | 0 | 0,000 |
| iGPU | 1 | pixi | 1220, 610 | 37° | 1000 | 361 | 29,270 | 29,178 | 361 | 361 | 29,149 |
| iGPU | 1 | c2d | 2390, 1170 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2drtc | 2390, 1170 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2d | 2390, 1170 | 37° | 1000 | 361 | 0,058 | 0,057 | 0 | 0 | 0,000 |
| iGPU | 1 | c2drtc | 2390, 1170 | 37° | 1000 | 361 | 0,192 | 0,166 | 102 | 0 | 0,000 |
| iGPU | 1 | c2d | 2390, 1170 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2drtc | 2390, 1170 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2d | 2390, 1170 | 37° | 100 | 361 | 0,047 | 0,040 | 0 | 0 | 0,000 |
| iGPU | 1 | pixi | 2390, 1170 | 37° | 1000 | 361 | 29,270 | 29,178 | 361 | 361 | 29,149 |
| iGPU | 1 | c2dsw | 150, 150 | 0° | 1000 | 361 | 0,201 | 0,175 | 172 | 0 | 0,000 |
| iGPU | 1 | c2d | 150, 150 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2dsw | 150, 150 | 37° | 1000 | 361 | 0,181 | 0,151 | 87 | 0 | 0,000 |
| iGPU | 1 | c2d | 150, 150 | 37° | 1000 | 361 | 0,051 | 0,036 | 0 | 0 | 0,000 |
| iGPU | 1 | c2dsw | 150, 150 | 90° | 1000 | 641 | 0,167 | 0,134 | 140 | 0 | 0,000 |
| iGPU | 1 | c2d | 150, 150 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | c2dsw | 2390, 1170 | 0° | 1000 | 361 | 0,201 | 0,175 | 172 | 0 | 0,000 |
| iGPU | 1 | c2d | 2390, 1170 | 0° | 1000 | 361 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1 | c2dsw | 2390, 1170 | 37° | 1000 | 361 | 0,168 | 0,137 | 53 | 0 | 0,000 |
| iGPU | 1 | c2d | 2390, 1170 | 37° | 1000 | 361 | 0,058 | 0,057 | 0 | 0 | 0,000 |
| iGPU | 1 | c2dsw | 2390, 1170 | 90° | 1000 | 641 | 0,167 | 0,134 | 140 | 0 | 0,000 |
| iGPU | 1 | c2d | 2390, 1170 | 90° | 1000 | 641 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1 | pixi | 150, 150 | 37° | 1000 | 361 | 29,270 | 29,178 | 361 | 361 | 29,149 |
| iGPU | 1,5 | c2dsw | 150, 150 | 0° | 1000 | 541 | 0,237 | 0,219 | 300 | 0 | 0,000 |
| iGPU | 1,5 | c2d | 150, 150 | 0° | 1000 | 541 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1,5 | c2dsw | 150, 150 | 37° | 1000 | 541 | 0,302 | 0,255 | 370 | 31 | 0,000 |
| iGPU | 1,5 | c2d | 150, 150 | 37° | 1000 | 541 | 0,043 | 0,041 | 0 | 0 | 0,000 |
| iGPU | 1,5 | c2dsw | 150, 150 | 90° | 1000 | 961 | 0,352 | 0,327 | 822 | 170 | 0,000 |
| iGPU | 1,5 | c2d | 150, 150 | 90° | 1000 | 961 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1,5 | c2dsw | 2390, 1170 | 0° | 1000 | 541 | 0,237 | 0,219 | 300 | 0 | 0,000 |
| iGPU | 1,5 | c2d | 2390, 1170 | 0° | 1000 | 541 | 0,500 | 0,086 | 1 | 1 | 0,000 |
| iGPU | 1,5 | c2dsw | 2390, 1170 | 37° | 1000 | 541 | 0,377 | 0,338 | 492 | 171 | 0,000 |
| iGPU | 1,5 | c2d | 2390, 1170 | 37° | 1000 | 541 | 0,113 | 0,102 | 47 | 0 | 0,000 |
| iGPU | 1,5 | c2dsw | 2390, 1170 | 90° | 1000 | 961 | 0,352 | 0,327 | 822 | 170 | 0,000 |
| iGPU | 1,5 | c2d | 2390, 1170 | 90° | 1000 | 961 | 0,088 | 0,086 | 0 | 0 | 0,000 |
| iGPU | 1,5 | pixi | 150, 150 | 37° | 1000 | 541 | 44,204 | 44,093 | 541 | 541 | 43,723 |

###### D. Latența intrării în timpul redesenului exact de 50 k forme (mouse prin CDP Input, 60 Hz, DPR 1)

| Adaptor | CPU × | Mod | Redesene exacte: interval (sau complet) med / p95 ms | pointerdown: întârziere med / p95 / max ms | Event Timing: durata până la pictură med / p95 / max ms (≥16 ms / total) | pointermove: întârziere med / p95 ms | Sarcini lungi: total / max ms | Calibrare fir principal / worker ms |
|---|---:|---|---|---|---|---|---|---|
| rtx | 1 | idle | — | 0,2 / 0,4 / 0,6 | 24,0 / 32,0 / 32,0 (16 / 23) | 12,7 / 16,4 | 0 / 0 | 41,7 / — |
| rtx | 1 | busy | — | 48,5 / 90,4 / 90,4 | 64,0 / 96,0 / 96,0 (10 / 10) | 55,5 / 104,9 | 5800 / 100 | 41,4 / — |
| rtx | 1 | main | 133,4 / 283,4 | 127,8 / 461,4 / 461,4 | 552,0 / 784,0 / 784,0 (6 / 6) | 137,1 / 275,6 | 5375 / 288 | 41,6 / — |
| rtx | 1 | worker | 149,9 / 300,0 | 0,4 / 0,6 / 0,6 | 304,0 / 408,0 / 408,0 (10 / 10) | 32,2 / 188,7 | 96 / 96 | 41,9 / 40,7 |
| rtx | 1 | workerbmp | 137,8 / 283,5 | 0,3 / 0,4 / 0,4 | 312,0 / 376,0 / 376,0 (10 / 10) | 46,3 / 137,3 | 0 / 0 | 42,2 / 41,0 |
| rtx | 1 | slices | complet 433,1 / 450,1 (cadre 16,7 / 17,2) | 0,2 / 0,5 / 0,5 | 32,0 / 144,0 / 152,0 (19 / 19) | 16,2 / 80,4 | 0 / 0 | 41,9 / — |
| rtx | 1 | idle | — | 0,3 / 0,4 / 0,6 | 16,0 / 32,0 / 32,0 (14 / 22) | 9,6 / 16,5 | 0 / 0 | 45,5 / — |
| rtx | 1 | mainsw | 100,1 / 116,7 | 43,4 / 73,1 / 73,1 | 176,0 / 184,0 / 184,0 (8 / 8) | 97,3 / 113,4 | 6190 / 125 | 45,3 / — |
| rtx | 1 | workersw | 120,5 / 133,5 | 0,3 / 0,5 / 1,2 | 24,0 / 32,0 / 48,0 (16 / 21) | 13,6 / 16,4 | 0 / 0 | 44,6 / 45,4 |
| igpu | 1 | idle | — | 0,2 / 1,3 / 2,1 | 16,0 / 24,0 / 32,0 (16 / 23) | 11,3 / 16,8 | 0 / 0 | 41,8 / — |
| igpu | 1 | busy | — | 51,6 / 62,0 / 62,0 | 64,0 / 80,0 / 80,0 (8 / 10) | 52,1 / 104,4 | 5800 / 100 | 39,8 / — |
| igpu | 1 | main | 133,2 / 250,0 | 93,9 / 233,5 / 233,5 | 456,0 / 504,0 / 504,0 (6 / 7) | 111,4 / 238,5 | 5588 / 269 | 41,4 / — |
| igpu | 1 | worker | 133,3 / 300,0 | 0,3 / 0,5 / 0,5 | 296,0 / 344,0 / 344,0 (10 / 10) | 16,1 / 146,6 | 94 / 94 | 41,1 / 40,7 |
| igpu | 1 | workerbmp | 133,1 / 263,4 | 0,3 / 0,6 / 0,6 | 272,0 / 352,0 / 352,0 (10 / 10) | 59,1 / 136,0 | 0 / 0 | 42,1 / 41,5 |
| igpu | 1 | slices | complet 450,2 / 466,8 (cadre 16,7 / 16,9) | 0,3 / 0,4 / 0,4 | 32,0 / 136,0 / 168,0 (18 / 18) | 16,2 / 88,7 | 0 / 0 | 41,7 / — |
| igpu | 1 | workersw | 97,9 / 124,4 | 0,3 / 0,4 / 0,5 | 24,0 / 32,0 / 32,0 (15 / 21) | 12,9 / 16,4 | 0 / 0 | 44,4 / 42,1 |
| igpu | 1 | mainsw | 100,0 / 116,7 | 48,6 / 81,0 / 81,0 | 160,0 / 184,0 / 184,0 (8 / 8) | 93,8 / 105,3 | 6131 / 112 | 42,1 / — |
| rtx | 4 | idle | — | 0,6 / 1,6 / 2,1 | 16,0 / 16,0 / 16,0 (12 / 22) | 11,8 / 16,6 | 0 / 0 | 176,6 / — |
| rtx | 4 | main | 133,2 / 233,4 | 147,2 / 172,8 / 172,8 | 392,0 / 416,0 / 416,0 (6 / 6) | 131,9 / 246,0 | 5716 / 258 | 172,1 / — |
| rtx | 4 | worker | 116,6 / 266,7 | 0,7 / 0,7 / 2,0 | 224,0 / 288,0 / 312,0 (13 / 13) | 16,3 / 133,3 | 0 / 0 | 178,0 / 40,6 |
| rtx | 4 | slices | complet 448,9 / 450,9 (cadre 16,7 / 16,9) | 0,7 / 1,0 / 1,4 | 32,0 / 168,0 / 176,0 (18 / 18) | 16,1 / 78,0 | 0 / 0 | 177,8 / — |
| rtx | 6 | idle | — | 1,0 / 1,4 / 2,8 | 16,0 / 24,0 / 32,0 (14 / 24) | 12,6 / 16,8 | 0 / 0 | 278,1 / — |
| rtx | 6 | main | 166,7 / 283,3 | 199,7 / 265,4 / 265,4 | 496,0 / 576,0 / 576,0 (5 / 5) | 173,5 / 272,5 | 5642 / 288 | 274,9 / — |
| rtx | 6 | worker | 150,0 / 283,2 | 1,1 / 2,3 / 2,3 | 320,0 / 416,0 / 416,0 (10 / 10) | 41,5 / 186,8 | 124 / 124 | 278,1 / 40,8 |
| rtx | 6 | slices | complet 449,6 / 451,2 (cadre 16,7 / 16,8) | 0,8 / 1,6 / 2,5 | 32,0 / 144,0 / 168,0 (18 / 18) | 16,1 / 132,8 | 0 / 0 | 280,4 / — |

Costul transferului (modurile workerbmp și workersw):

| Adaptor | CPU × | Mod | transferToImageBitmap în worker med / p95 ms | postMessage worker→principal med / p95 ms | transferFromImageBitmap med ms | de la postMessage la rAF med / p95 ms |
|---|---:|---|---|---|---:|---|
| rtx | 1 | workerbmp | 134,2 / 269,8 | 0,2 / 0,3 | 0,0 | 9,0 / 127,7 |
| rtx | 1 | workersw | 117,2 / 128,7 | 0,1 / 0,2 | 0,0 | 0,4 / 14,8 |
| igpu | 1 | workerbmp | 120,8 / 237,2 | 0,1 / 0,2 | 0,0 | 7,1 / 125,1 |
| igpu | 1 | workersw | 90,7 / 118,3 | 0,0 / 0,1 | 0,0 | 0,5 / 14,6 |

###### E. Procesorul încetinit prin CDP (Emulation.setCPUThrottlingRate), RTX, DPR 1

| CPU × | Calibrare fir principal ms | Ce | Cadru (cu citire) sau interval (fără citire) med / p95 ms | Nuclee folosite: renderer / GPU / browser |
|---:|---:|---|---|---|
| 1 | 40,8 | Canvas2D 10 k, redesen exact, cu citire (metoda s6) | 17,5 / 20,0 | 1,0 / 0,1 / 0,0 |
| 1 | 41,5 | Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală) | 17,7 / 63,0 | 0,0 / 1,9 / 0,0 |
| 1 | 41,6 | Canvas2D 50 k pe găleți, cu citire (metoda s6) | 97,9 / 111,9 | 1,0 / 0,1 / 0,0 |
| 1 | 49,0 | Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală) | 161,7 / 187,5 | 0,0 / 1,9 / 0,0 |
| 1 | 47,2 | clic real pe 20010 forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | 0,000 / 0,100 / 0,200; 0,100 / 0,200 / 0,800; 120/120 | — |
| 1 | 44,5 | clic real pe 50010 forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | 0,000 / 0,100 / 0,300; 0,100 / 0,200 / 0,800; 120/120 | — |
| 4 | 199,2 | Canvas2D 10 k, redesen exact, cu citire (metoda s6) | 143,8 / 160,9 | 1,2 / 0,0 / 0,0 |
| 4 | 201,6 | Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală) | 18,5 / 87,6 | 1,0 / 2,0 / 0,0 |
| 4 | 200,2 | Canvas2D 50 k pe găleți, cu citire (metoda s6) | 543,8 / 605,1 | 1,1 / 0,0 / 0,0 |
| 4 | 180,4 | Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală) | 148,6 / 285,2 | 1,0 / 1,7 / 0,0 |
| 4 | 179,5 | clic real pe 20010 forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | 0,000 / 0,200 / 0,900; 0,300 / 0,600 / 3,600; 120/120 | — |
| 4 | 174,1 | clic real pe 50010 forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | 0,000 / 0,200 / 1,200; 0,300 / 0,800 / 3,900; 120/120 | — |
| 6 | 273,0 | Canvas2D 10 k, redesen exact, cu citire (metoda s6) | 130,5 / 178,4 | 1,2 / 0,0 / 0,0 |
| 6 | 283,8 | Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală) | 12,3 / 70,8 | 1,0 / 1,9 / 0,0 |
| 6 | 275,8 | Canvas2D 50 k pe găleți, cu citire (metoda s6) | 754,6 / 770,4 | 1,1 / 0,0 / 0,0 |
| 6 | 274,0 | Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală) | 130,1 / 256,3 | 1,0 / 1,5 / 0,0 |
| 6 | 285,8 | clic real pe 20010 forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | 0,100 / 0,400 / 2,000; 0,500 / 0,900 / 6,100; 120/120 | — |
| 6 | 272,1 | clic real pe 50010 forme: hit-test med / p95 / max; eveniment→rezultat med / p95 / max; corecte | 0,100 / 0,400 / 1,700; 0,500 / 0,900 / 5,800; 120/120 | — |

###### F. Unde se duce costul: nuclee de procesor pe tip de proces, în bucla de cadre (1,0 = un nucleu plin)

| Adaptor | Ce | Interval sau cadru med ms | renderer | GPU | browser |
|---|---|---:|---:|---:|---:|
| RTX | Canvas2D 10 k, redesen exact, cu citire (metoda s6) | 17,5 | 1,0 | 0,1 | 0,0 |
| RTX | Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală) | 17,7 | 0,0 | 1,9 | 0,0 |
| RTX | Canvas2D 50 k pe găleți, cu citire (metoda s6) | 97,9 | 1,0 | 0,1 | 0,0 |
| RTX | Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală) | 161,7 | 0,0 | 1,9 | 0,0 |
| iGPU | Canvas2D 10 k, redesen exact, FĂRĂ citire (calea reală) | 33,7 | 0,0 | 2,0 | 0,0 |
| iGPU | Canvas2D 50 k pe găleți, FĂRĂ citire (calea reală) | 166,3 | 0,0 | 1,8 | 0,0 |
| iGPU | Canvas2D 50 k pe găleți, cu citire (metoda s6) | 92,8 | 1,0 | 0,1 | 0,0 |

###### G. Martorul de instrument: getImageData mută pânza pe procesor? (ms pe iterație, 12 iterații)

- RTX: blur, pânză implicită: 76.5 · 5 · 8.8 · 6.7 · 5.1 · 5.7 · 5.3 · 5.4 · 5.6 · 5.3 · 5.3 · 5.4; cu willReadFrequently: 4.5 · 1.1 · 0.8 · 1.1 · 0.8 · 0.7 · 0.7 · 0.8 · 0.8 · 0.9 · 0.8 · 0.8
- RTX: 40 de umpleri cu gradient, implicită: 50.5 · 48.5 · 46 · 45.7 · 51.7 · 49.9 · 53.6 · 47.6 · 47.5 · 47.7 · 53.9 · 48.4; cu willReadFrequently: 38.2 · 4.8 · 11.3 · 56.5 · 7.9 · 1.6 · 2.1 · 2.5 · 1.1 · 1.2 · 1.2 · 1.4
- iGPU: blur, pânză implicită: 93.6 · 10.8 · 16.5 · 9.3 · 9.5 · 9.2 · 9.4 · 9.7 · 8.6 · 12 · 9 · 8.1; cu willReadFrequently: 7 · 2.8 · 2.9 · 2.6 · 2.8 · 6.6 · 3.2 · 22.5 · 67.3 · 2.9 · 2.8 · 2.8
- iGPU: 40 de umpleri cu gradient, implicită: 45.2 · 46.8 · 49.3 · 56.4 · 54.6 · 52.7 · 47.2 · 48.7 · 51.2 · 54.9 · 51.1 · 50.8; cu willReadFrequently: 59.1 · 10.7 · 10.5 · 10.6 · 10.4 · 10.5 · 10.6 · 27.3 · 10.3 · 10.2 · 10.1 · 10.2

###### H. Mașina și adaptoarele verificate la fiecare rulare

- `v3-timed-rtx.json`: argumente []; chrome://gpu activ: NVIDIA GeForce RTX 3060; UNMASKED_RENDERER pe 34 rulări: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 98.729 s
- `v3-timed-igpu.json`: argumente ["--force_low_power_gpu"]; chrome://gpu activ: AMD Radeon(TM) Graphics; UNMASKED_RENDERER pe 34 rulări: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 135.236 s
- `v3-vsync-rtx.json`: argumente []; chrome://gpu activ: NVIDIA GeForce RTX 3060; UNMASKED_RENDERER pe 16 rulări: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 70.967 s
- `v3-vsync-igpu.json`: argumente ["--force_low_power_gpu"]; chrome://gpu activ: AMD Radeon(TM) Graphics; UNMASKED_RENDERER pe 16 rulări: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 108.55 s
- `v3-throttle-rtx.json`: argumente []; chrome://gpu activ: NVIDIA GeForce RTX 3060; UNMASKED_RENDERER pe 18 rulări: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 160.42 s
- `v3-gpucpu-igpu.json`: argumente ["--force_low_power_gpu"]; chrome://gpu activ: AMD Radeon(TM) Graphics; UNMASKED_RENDERER pe 4 rulări: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 29.239 s
- `v3-fidgrid-rtx.json`: argumente []; chrome://gpu activ: NVIDIA GeForce RTX 3060; UNMASKED_RENDERER pe 24 rulări: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 7.525 s
- `v3-fidgrid-igpu.json`: argumente ["--force_low_power_gpu"]; chrome://gpu activ: AMD Radeon(TM) Graphics; UNMASKED_RENDERER pe 24 rulări: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 7.756 s
- `v3-fidsw-igpu.json`: argumente ["--force_low_power_gpu"]; chrome://gpu activ: AMD Radeon(TM) Graphics; UNMASKED_RENDERER pe 26 rulări: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 11.274 s
- `v3-vsstrip-igpu.json`: argumente ["--force_low_power_gpu"]; chrome://gpu activ: AMD Radeon(TM) Graphics; UNMASKED_RENDERER pe 8 rulări: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); software: 0; 32.483 s
- `v3-lat-rtx.json`: argumente []; UNMASKED_RENDERER: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); browser 154.0.4258.62
- `v3-lat-sw-rtx.json`: argumente []; UNMASKED_RENDERER: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); browser 154.0.4258.62
- `v3-lat-igpu.json`: argumente ["--force_low_power_gpu"]; UNMASKED_RENDERER: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); browser 154.0.4258.62
- `v3-lat-sw-igpu.json`: argumente ["--force_low_power_gpu"]; UNMASKED_RENDERER: ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11); browser 154.0.4258.62
- `v3-lat-rtx-throttle.json`: argumente []; UNMASKED_RENDERER: ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11); browser 154.0.4258.62
