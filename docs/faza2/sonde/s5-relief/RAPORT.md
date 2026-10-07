# Sonda s5-relief: relieful în browser (4000 × 4000, straturi, sculptură, bas-relief) și finisarea 3D din relief și din STL

Faza 2, tranșa 1, 07.10.2026. Cod aruncabil, scris doar ca dovadă pentru arhitectură. Codul e în `cod/`, iar cifrele
brute în `cod/rezultate/`.

**Marcaje:**
- **[măsurat]** = am rulat eu;
- **[citit]** = din documentație sau sursă, cu link;
- **[dedus]** = concluzie trasă din măsurători, nerulată direct.

**Mașina:** Ryzen 9 7950X (32 de fire), 31 GB RAM, RTX 3060. Browserul e Edge 154, pornit cu fereastră (headed), pe
GPU-ul real:
- WebGL: `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)`;
- WebGPU: `vendor nvidia`, `architecture ampere`, adaptor care nu e de rezervă (`isFallbackAdapter: false`);
- **nu e randare software**, deci cifrele de GPU sunt valabile.

---

## 1. Întrebarea

v1 conține aproape tot relieful din ArtCAM (rândurile C) și prelucrarea 3D din STL în stil DeskProto (rândurile D).
Sonda trebuia să decidă:
1. cum ținem în memorie un relief de 4000 × 4000 cu mai multe straturi și când cade tabul;
2. ce rulează pe CPU și ce pe GPU: sculptura, netezirea, combinarea straturilor, bas-relieful, finisarea;
3. cum calculăm finisarea 3D fără să sape sub model, pe relief și direct pe STL;
4. ce operații de relief sunt riscante pentru v1.

**Termeni folosiți mai jos:**
- **Hartă de înălțime** (heightfield): o grilă de cote Z, una pe celulă.
- **Drop-cutter:** pentru un punct (x, y), cât de jos poate coborî freza până atinge modelul. Rezultatul e cota
  vârfului, numită **CL** (cutter location).
- **Scobitură:** freza intră sub suprafața modelului. Nu e voie niciodată.
- **Surplus:** materialul lăsat peste model. E sigur, dar trebuie să fie mic.
- **Creastă** (scallop): dunga lăsată între două treceri ale unei freze bilă.

## 2. Pe scurt

1. **Reprezentarea** [dedus din §4.5–§4.7]: fiecare strat de relief e **Float32 pe dale** (de exemplu 256 × 256),
   rare: o dală lipsă înseamnă o înălțime constantă. Straturile stau pe CPU, în workeri, ca sursă de adevăr. GPU-ul
   ține doar o oglindă, pentru afișare și pentru calculele grele.
   - Stocarea și undo-ul folosesc **Uint16 cu scară pe dală**: eroare de 0,15–0,46 µm. Half-float ar da 7,8–15,6 µm.
     [măsurat]
2. **Siguranța:** finisarea 3D se calculează doar pe un **câmp conservativ** (maximul modelului pe fiecare celulă),
   cu distanța măsurată de la celulă la **segmentul** de traseu.
   - Rezultatul: **0 scobituri pe tot corpusul.** [măsurat]
   - Eșantionarea în nod (ce face o rasterizare obișnuită) sapă până la **5 mm**. Și reparația din ediția întâi
     („maxim pe vecini”) sapă 5 mm, pe un perete de 0,01 mm. [măsurat]
   - Prețul: un surplus de circa (1,5–2) · celulă · tan(pantă), adică 0,09–0,11 mm pe o pantă de 30° la o celulă
     de 0,1 mm. [măsurat]
3. **GPU-ul (WebGPU) câștigă la calculul greu:** [măsurat]
   - rasterul de finisare pe 2,67 M de puncte: **90 ms**, față de 2,2 s pe 16 workeri și ~27 s pe un fir;
   - netezirea globală: **35 ms**, față de 83 ms pe 16 workeri și 893 ms pe un fir.
4. **Rămâne pe CPU:** combinarea straturilor (13–15 ms pe tot relieful) și sculptura (0,27–1,06 ms pe aplicare de
   pensulă). Cu încărcare parțială în textură, afișarea ține **60 fps chiar cu plasa 3D de 32 M de triunghiuri**.
   [măsurat]
5. **Bas-relieful** dintr-un STL de 1,38 M de triunghiuri, la 4000²: rasterizare 0,34 s + reconstrucție 6,8 s pe un
   fir. Iese exact până la 0,23 µm pe proba de identitate. [măsurat]

## 3. Candidații

Codul e propriu în toate rândurile, în afară de ultimul. Nicio bibliotecă nu intră în aplicația livrată.

| Candidat | Licență | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| Float32 dens, câte un `ArrayBuffer` pe strat | — | 64 MB pe strat 4000² | 78 de straturi (5 GB) alocate și atinse fără eroare. Un `ArrayBuffer` unic de 2 GiB e refuzat, 1,5 GiB trece | bun în interiorul unei dale sau al unui obiect de 4000²; nu pentru o placă întreagă |
| Float32 pe dale rare (256²) | — | memorie doar unde există relief; undo și încărcare GPU pe dală | neconstruit | **recomandat** [dedus] |
| Half-float (`Float16Array`, există în Edge 154 și în Node 26) | API de browser | 2 octeți pe celulă | eroare max 0,0078 mm la 20 mm și 0,0156 mm la 60 mm | respins pentru înălțimi |
| Uint16 cu scară pe strat sau dală | — | 2 octeți pe celulă, pas fix | eroare max 0,00015 mm la 20 mm și 0,00046 mm la 60 mm | **pentru stocare, undo și imaginea gri pe 16 biți** |
| CPU, un fir (JS) | — | referința | combinare 13–15 ms; blur 893 ms; finisare ~27 s; pensulă 0,27–1,06 ms | pentru operații locale și combinare |
| CPU, workeri + `SharedArrayBuffer` | API de browser; cere izolare cross-origin (COOP/COEP) | paralel pe rânduri | blur 284 / 163 / 83 ms cu 4 / 8 / 16 workeri; finisare 2,2 s cu 16 | rezerva pentru GPU |
| WebGPU compute (WGSL) | API de browser | nuclee pe GPU | blur 35 ms; finisare 88–93 ms; combinare 3 ms cu datele pe GPU. Transfer de 64 MB: 120 ms în sus, 46 ms înapoi | **pentru operațiile globale grele** |
| WebGL2, afișare | API de browser | textură R32F, vedere 2D umbrită și plasă 3D | 60 fps în toate modurile; plasa de 32 M de triunghiuri costă ~4–8 ms pe cadru | **pentru afișare, cu LOD** |
| wasm32 | API de browser | memorie liniară | plafon de 4 GiB (65 536 de pagini) | doar nuclee pe dale |
| wasm memory64 | API de browser | adrese pe 64 de biți | crescută la 5 GiB în Edge 154 | disponibil; viteza nemăsurată |
| Drop-cutter A: eșantion în nod | — | ca o rasterizare GPU | scobitură până la **5 mm** | respins |
| Drop-cutter B: nod + maxim pe vecini | — | aproximarea mea a reparației din ediția întâi (lema coardei pe grila eșantionată în nod) | scobitură **5 mm** pe peretele de 0,01 mm | respins |
| Drop-cutter C: maxim pe celulă + distanța la segment | — | sigur prin construcție | **0 scobituri**; surplus ≈ (1,5–2) · h · tanθ | **recomandat pentru producție** |
| Drop-cutter exact pe triunghiuri | — | vârfuri, muchii, fețe și marginea discului; scris de mine, fără cod copiat | 0 abateri în 8 000 de puncte; 7,8–12,3 k puncte/s pe un fir (bilă) | **oracol și rezervă pe CPU pentru STL** |
| Bas-relief: gradienți, compresie logaritmică, Poisson multigrid | — | relief jos dintr-un model 3D | 6,8 s la 4000² pe un fir; oracol 7,6e-7 mm | bun pentru v1; parametrii se reglează cu owner-ul |
| `playwright-core` 1.63.0 | Apache-2.0 | pornește Edge pentru banc | — | doar banc de test, nu se livrează |

## 4. Măsurători

**Zgomotul:** pe mașină rulau în paralel alți 9 agenți. Timpii sunt medianele a 3–5 repetiții, iar comparațiile se
fac în aceeași rulare. Monitorul are 60 Hz, deci fps-ul e plafonat la 60. Rezerva GPU-ului am măsurat-o desenând
de mai multe ori pe cadru.

### 4.1 Drop-cutter pe hartă de înălțime, contra CL-ului analitic

**Metoda:**
- Grila are celula de 0,1 mm, 501 × 501 noduri, și 5 rânduri de raster pe fiecare suprafață.
- Traseul liniar dintre noduri e verificat în **16 sub-eșantioane pe segment**, nu doar în noduri. Asta a fost
  defectul D3 din ediția întâi.
- Sculele: bilă R3, dreaptă R3, V90 R6 și V60 R6.

**Oracolul:** formule pe hârtie pentru CL, fără cod comun cu grila:
- plan: bila `z + R(√(1+g²) − 1)`, dreapta `z + R·g`, V-ul `max(z, z + R·g − R·cot α)`;
- sferă și cilindru: contact pe sferă `√((Rs+R)² − d²) − R`, contact pe flancul V-ului `(Rs − d·cos α)/sin α`,
  contact pe muchie, plus podeaua;
- profilele pe bucăți (perete, canale): căutare ternară exactă pe fiecare bucată. Funcția e concavă acolo, fiindcă
  suprafața e liniară și ridicarea frezei e convexă.

**Corpusul** e ales să rupă coincidențele: plan orizontal; plan la 30°; plan oblic; semisferă R20; cilindru R15;
**perete de 0,01 mm × 5 mm** căzut între noduri; canale cu pereți la **30°, 60° și 90°**; **inel cu gaură**.

**Scobitura maximă pe segmente**, cea mai rea dintre cele 4 scule [măsurat]:

| Suprafața | A: nod | B: nod + vecini | C: celulă + segment | Surplusul mediu al lui C |
|---|---:|---:|---:|---:|
| plan orizontal | 0 | 0 | 0 | 0 |
| plan 30° | 9,5e-7 | 0 | 0 | 0,087–0,115 |
| plan oblic (26,6°) | 1,6e-4 | 0 | 0 | 0,065–0,100 |
| semisferă R20 | **0,29** | 0 | 0 | 0,134–0,187 |
| cilindru R15 | **0,43** | 0 | 0 | 0,104–0,146 |
| perete 0,01 mm | **5** | **5** | 0 | 0,033–0,039 |
| canal 30° / 60° / 90° | 0,014 / 0,021 / 0,0004 | 0 | 0 | ≤ 0,053 |
| inel cu gaură | **4** | 0 | 0 | 0,046–0,102 |

Toate valorile sunt în mm.

**De ce sapă A și B:**
- A sapă între noduri. Lângă un perete, CL-ul unei freze drepte sare brusc, iar linia dreaptă dintre două noduri
  taie colțul. Așa se ajunge la 4 mm pe inel.
- B repară asta, dar nu poate vedea un detaliu căzut între noduri, așa că peretele de 0,01 mm dispare complet.
  Ediția întâi eșantiona plasa tot în noduri (`docs/faza0/04`, rândul 2), deci avea aceeași gaură. [dedus]
- Concluzia: **rasterizarea pentru CAM trebuie să fie conservativă**, nu doar filtrul de după ea.

**CL în noduri față de formulă** [măsurat]:
- A stă mereu sub formulă: lipsesc până la 0,29 mm pe semisferă, cu freza dreaptă.
- C stă mereu deasupra.
- Pe plan, surplusul lui C e uniform și egal cu formula de mai sus. De exemplu, la bila pe 30° iese 0,1148 mm.

**Surplusul lui C în funcție de celulă** (semisferă R20, bilă R3, medie / maxim) [măsurat]:
- 0,05 mm → 0,073 / 0,30;
- 0,1 mm → 0,141 / 0,54;
- 0,2 mm → 0,264 / 0,95;
- **0,61 mm → 0,654 / 1,89.**

0,61 mm e celula unei plăci de 2440 mm împărțite în 4000 de puncte: **prea grosier pentru finisare.**

### 4.2 Creasta (scallop), cu un simulator independent

**Metoda:** simulatorul primește doar punctele de traseu. Scrie bila direct ca sferă, `z = zc − √(R² − d²)`, fără
funcția de ridicare a frezei folosită de drop-cutter. Oracolul e `R − √(R² − (s/2)²)`, iar pentru o pantă
transversală θ: `(R − √(R² − (s/(2cos θ))²)) / cos θ`.

| R | Pas lateral s | Pantă | Formula | Simulat, CL exact | Simulat, CL din grila C |
|---:|---:|---:|---:|---:|---:|
| 3 | 1 | 0° | 0,041960 | 0,041960 | 0,041960 |
| 3 | 0,5 | 0° | 0,010435 | 0,010435 | 0,010435 |
| 1,5 | 0,3 | 0° | 0,007519 | 0,007519 | 0,007519 |
| 6,35 | 2 | 0° | 0,079234 | 0,079234 | 0,079234 |
| 3 | 1 | 20° | 0,050616 | 0,050576 | 0,086859 |

Toate valorile sunt în mm, toate [măsurat].
- Pe pantă, simulatorul iese cu 4e-5 sub formulă. Cauza e pasul lui de eșantionare, s/2000.
- Coloana „grila C” adaugă surplusul uniform al câmpului conservativ, ~0,036 mm pe această pantă.

### 4.3 Drop-cutter exact pe triunghiuri (STL)

**Semisfera inscrisă:**
- Plasa are 65 520 de triunghiuri, cu vârfurile pe sferă.
- Oracolul are două margini: `CL(sferă de rază ρ_min) ≤ CL(plasă) ≤ CL(sferă de rază Rs)`, cu ρ_min = 19,998477 mm,
  distanța minimă de la centru la fețe.
- Rezultat: **0 puncte în afara intervalului**, din 2 000 de puncte pe sculă, pentru toate cele 4 scule. [măsurat]
- **Oracolul poate pica:** [măsurat]
  - fără testul pe muchii, 19–59 de abateri din 400 de puncte;
  - fără testul pe fețe, 22–112 abateri din 400.

**Planul din 2 triunghiuri:** eroare ≤ 2,1e-14 mm, inclusiv în cazurile limită: [măsurat]
- V90 pe un plan de 45°, cu flancul paralel cu planul;
- același plan, la 45° + 1e-6;
- o față orizontală, care coincide cu talpa frezei drepte.

**Scobitura față de PLASĂ, nu față de grilă:** în ediția întâi, „0 sub model” fusese verificat doar față de grila
eșantionată. Aici referința e drop-cutter-ul exact pe triunghiuri, alt cod decât grila, cu 8 sub-eșantioane pe
segment. [măsurat]

| Caz | A: nod | C: celulă + segment |
|---|---:|---:|
| plasa semisferei | 0,005–0,089 | 0 |
| peretele de 0,01 mm, din 12 triunghiuri | 5 | 0 |
| scena de 1,38 M de triunghiuri, bilă R3, celulă 0,05 mm | 0,33 | 0 (surplus mediu 0,20) |

Valorile sunt scobituri, în mm.
- Pe scenă, în 3 × 3 800 de noduri, grila C nu stă nicăieri sub plasă.
- **Regula găsită pe drum:** grila trebuie să acopere plasa plus raza frezei. La margine, o grilă prea mică a ieșit
  cu 17 µm sub plasă.

### 4.4 STL-ul mare: rasterizare și debit

Scena are 1 380 000 de triunghiuri: o placă ondulată, o sferă, un tor în picioare cu subtăieri și un nod toric. STL-ul
are 69 MB. [măsurat]

| Pas | Timp |
|---|---:|
| citirea STL-ului | 95 ms |
| indexul spațial | 106 ms |
| rasterizarea în nod la 4000² (0,05 mm) | 389 ms |
| rasterizarea **conservativă** la 4000² | 6 318 ms |

Toate pe un fir.

**Debitul pe un fir**, în puncte CL pe secundă [măsurat]:

| Sculă | Drop-cutter exact pe plasă | Grila C la 0,05 mm, forță brută |
|---|---:|---:|
| bilă R3 | 7 758–12 250 (trei rulări) | 24 229–25 557 (11 787 de deplasamente) |
| dreaptă R3 | 9 259 | 22 958 |
| V90 R6 | 3 114 | 4 456 (46 207 de deplasamente) |

- Drop-cutter-ul exact vizitează ~5 160 de triunghiuri pe punct, dar evaluează complet doar 38–88. Restul cad la
  testele de cutie și de cotă maximă.
- **Pe CPU, cele două drumuri sunt comparabile.** Diferența mare o face GPU-ul, nu reprezentarea (§4.5).

### 4.5 CPU față de GPU, în browser, pe relief de 4000²

Toate cifrele sunt [măsurat].

| Operația | 1 fir | Workeri | WebGPU | Diferența GPU – CPU |
|---|---:|---:|---:|---:|
| combinare add / max / min | 12,8 / 14,7 / 15,0 ms | — | 3 ms (datele deja pe GPU) | — |
| blur gaussian σ = 4 px, tot relieful | 893 ms | 284 / 163 / 83 ms (4 / 8 / 16) | **35 ms** | 4,8e-6 mm |
| finisare raster, 667 de linii × 4000 = 2,67 M de puncte CL, bilă R3 la 0,1 mm | ~27 s (estimat din 2 linii) | 2,2 s (16) | **90 ms** | 4,8e-7 mm |
| la fel, dreaptă R3 / V90 R3 | ~27 / ~33 s | 2,3 / 2,2 s | 88 / 93 ms | 0 / 4,6e-7 mm |
| transfer 64 MB către / dinspre GPU | — | — | 120 / 46 ms | — |

**Concluzia** [dedus]:
- Finisarea e limitată de calcul, deci GPU-ul câștigă de ~25 de ori față de 16 workeri.
- Blur-ul pe date care stau pe CPU câștigă doar dacă relieful e deja pe GPU, fiindcă transferul (120 + 46 ms)
  costă mai mult decât calculul.
- Combinarea e limitată de memorie și rămâne pe CPU.

### 4.6 Sculptura și afișarea

**Metoda:**
- O textură R32F de 4000 × 4000 primește doar dreptunghiul atins de pensulă (`texSubImage2D` cu `UNPACK_ROW_LENGTH`).
- Fiecare test are 180 de cadre și o aplicare de pensulă pe cadru.
- Încărcarea completă a texturii (64 MB) durează 43,5 ms. Pe cadru se încarcă doar dreptunghiul pensulei.

**Rezultatele** [măsurat]:

| Mod | fps median | Cadre > 20 ms | CPU pe cadru |
|---|---:|---:|---:|
| 2D umbrit, pensulă „adaugă” r = 64 px | 60 | 0 | 0,43 ms |
| 2D umbrit, pensulă „netezește” r = 64 px | 60 | 0 | 1,38 ms |
| 3D plasă 1000² / 2000² / **4000² (32 M de triunghiuri)** | 60 / 60 / 60 | 0 | 0,42 ms |
| 3D 4000², desenată de 2× / 4× / 8× pe cadru | 60 / 30 / 15 | 0 / 138 / 168 | 0,4 ms |
| 2D, desenat de 32× pe cadru | 60 | 4 | 0,47 ms |

**Pensula singură, pe CPU:**
- „adaugă”: 0,27 ms la r = 64 px și 2,61 ms la r = 200 px;
- „netezește”, cu 3 iterații: 1,06 ms la r = 64 px.

**Ce înseamnă** [dedus]:
- O plasă 3D de 32 M de triunghiuri costă ~4–8 ms pe RTX 3060. Pe un iGPU (nemăsurat) va avea nevoie de LOD.
- Vederea 2D umbrită costă < 0,5 ms.
- Ținta de 60 fps la sculptură se atinge cu CPU-ul ca sursă de adevăr. Nu e nevoie de sculptură pe GPU.

### 4.7 Memoria

Măsurat în Edge 154, pe o pagină separată, cu straturile umplute (`fill`) ca să ocupe memorie reală. [măsurat]

**Straturile:**
- **78 de straturi Float32 de 4000² (4,99 GB) au fost alocate și verificate fără eroare**, ~19 ms pe strat.
- `measureUserAgentSpecificMemory` a raportat aceiași 4,99 GB.
- Plafonul de 78 l-am impus eu, după memoria liberă a mașinii, ca să nu-i sufoc pe ceilalți agenți. Limita reală a
  tabului nu a fost atinsă.
- Pe Windows, Chromium limitează procesul de randare la **1 TB** (`GetJobMemoryLimit`, „Allow up to 1 TB for the
  renderer process”, [`sandbox/policy/win/sandbox_win.cc`](https://github.com/chromium/chromium/blob/main/sandbox/policy/win/sandbox_win.cc)).
  [citit]
- Deci limita practică e memoria mașinii (RAM plus fișierul de paginare), nu browserul. [dedus]

**Limite care contează pentru arhitectură:**
- un **singur `ArrayBuffer`**: 1,5 GiB trece, iar **2 GiB − 64 KiB e refuzat** (`Array buffer allocation failed`),
  chiar după eliberarea memoriei cu `gc()`;
- **wasm32:** maximum 65 536 de pagini, adică **4 GiB**; creșterea până acolo durează 5 ms;
- **wasm memory64:** creat cu `address: 'i64'` și valori BigInt, **crescut la 5 GiB**.

**Ce înseamnă:**
- Un strat dens pentru o placă de 2440 × 1220 mm la 0,1 mm are 24 400 × 12 200 de celule, adică 1,19 GB. Încape încă
  într-un `ArrayBuffer`, dar două straturi și un undo nu mai încap. Dalele sunt obligatorii pentru plăci. [dedus]

### 4.8 Volumul, greutatea și cuantizarea

**Volumul semisferei R20**, cu oracolul `2/3 · π · R³` = 16 755,161 mm³ [măsurat]:
- suma pe noduri are eroarea relativă −2,1e-4 la celula de 0,5 mm și **−1,6e-5 la 0,1 mm**;
- suma pe câmpul conservativ (maximul pe celulă) **supraestimează cu 0,75 %**;
- deci volumul și greutatea se calculează din câmpul în nod, nu din cel pentru CAM;
- greutatea în stejar (0,75 g/cm³): 12,57 g.

**Cuantizarea pe 16 biți:** am măsurat erorile din §3 pe semisfere de 20 și 60 mm.

### 4.9 Bas-relief din STL

**Metoda:**
1. rasterizarea în nod a scenei de 1,38 M de triunghiuri, la 4000², pe 200 mm;
2. gradienții;
3. tăierea pantelor mai mari de 10 (84°), adică a salturilor de adâncime de pe siluetă;
4. compresia logaritmică `ln(1 + a|s|)/a`, cu a = 4;
5. reconstrucția prin ecuația Poisson: o metodă multigrid V(2,2), cu Gauss-Seidel roșu-negru și margini Neumann;
6. scalarea la 8 mm.

**Oracole:**
- (a) Pe o funcție analitică de 1024², unde soluția discretă exactă e chiar funcția: eroare maximă **7,6e-7 mm** la o
  amplitudine de 7,3 mm. [măsurat]
- (b) Fără compresie, reconstrucția trebuie să redea modelul. Eroarea maximă e **2,3e-4 mm**, pe un model adânc de
  97 mm. [măsurat]
- (c) Adâncimea finală trebuie să fie exact ținta: 8,0000 mm, adică un factor de compresie de 12,1. [măsurat]

**Timpii la 4000²**, pe un fir [măsurat]:

| Pas | Timp |
|---|---:|
| rasterizarea | 344 ms |
| gradienții | 71 ms |
| compresia | 552 ms |
| Poisson, 8 cicluri | **6,8 s (800 ms pe ciclu)** |

- După 4 cicluri, reziduul relativ ajunge deja la 2e-6. [măsurat]
- Bas-relieful e deci o operație de câteva secunde, făcută într-un worker, cu progres afișat. [dedus]

## 5. Ce schimbă în arhitectură

1. **Stratul de relief.**
   - Ce e: o grilă Float32 pe dale de 256 × 256 (256 KB pe dală), rară. O dală lipsă înseamnă o constantă, iar un
     index ține dalele existente.
   - Unde stă: pe CPU, ca sursă de adevăr.
   - Ce citesc din el: compunerea pe straturi, undo-ul (copiere la scriere, doar pe dalele atinse), încărcarea pe GPU,
     salvarea și CAM-ul.
   - Rezoluția ține de obiectul de relief, nu de placă. 4000² e un obiect; o placă de 2440 mm la 0,1 mm se acoperă
     cu dale. [dedus din §4.7]
2. **Stocarea și undo-ul:** Uint16 cu decalaj și scară pe dală, care e și formatul imaginii gri pe 16 biți.
   - Calculul rămâne în Float32.
   - Half-float nu se folosește pentru înălțimi. [măsurat §4.8]
3. **Ce rulează unde:**

   | Operația | Unde | De ce |
   |---|---|---|
   | pensulele: adaugă, scoate, netezește, întinde | CPU, pe dalele atinse | 0,3–2,6 ms pe aplicare |
   | combinarea straturilor, scalarea, offsetul, negativul, estomparea, volumul, analiza | CPU, pe dalele murdare | limitate de memorie, 13–15 ms pe tot relieful |
   | netezirea globală, texturile, drop-cutter-ul de finisare și de degroșare, coliziunea cu mandrina, umbrirea | WebGPU, cu rezervă pe workeri | finisarea: de 25 de ori față de 16 workeri și de 300 de ori față de un fir; blur-ul: de 2,4 ori față de 16 workeri |
   | afișarea | WebGL2 sau WebGPU | — |

   - Testele compară GPU cu CPU pe aceleași date. Toleranța e 1e-6 mm, iar diferențele măsurate au fost ≤ 4,8e-6 mm.
     [măsurat]
4. **CAM-ul 3D din relief și din STL:**
   - Se folosește doar câmpul **conservativ**: rasterizarea maximului pe celulă, prin tăierea triunghiului cu coloana
     celulei.
   - Lângă el, **distanța la segment** (capsula) în dilatarea cu profilul frezei.
   - Grila acoperă modelul plus raza frezei.
   - Celula se alege din toleranța de surplus, fiindcă surplusul e ≈ (1,5–2) · h · tanθ: de exemplu 0,05 mm la
     finisare.
   - Rasterizarea în nod e permisă **doar pentru ecran**, niciodată pentru traseu. [măsurat §4.1, §4.3]
5. **Drop-cutter-ul exact pe triunghiuri intră din prima zi ca oracol.** Verifică orice generator nou contra plasei
   originale, pe segmente, cu mutanți care trebuie să pice. Pe CPU e și o rezervă reală pentru STL: ~8–9 k puncte/s
   pe fir, deci ~130 k pe 16 workeri. [dedus din §4.4]
6. **Izolarea cross-origin (COOP/COEP).** `SharedArrayBuffer` o cere.
   - Ea afectează ferestrele de login Firebase (popup) și iframe-urile Stripe. **Trebuie probată** înainte de a o
     alege.
   - Alternativa fără ea: dale transferate între workeri (`postMessage` cu transfer). [dedus; neprobat]
7. **WebAssembly nu e necesar** pentru aceste nuclee: JS ține pasul, iar GPU-ul e acceleratorul. Dacă îl folosim
   totuși, lucrează pe dale, nu ține tot documentul, din cauza plafonului de 4 GiB al wasm32. [măsurat §4.7]
8. **Legătura cu vectorii reali** (`BRIEF.md` §16.2):
   - Relieful din vectori (editorul de forme, textul) se calculează din curbele exacte și rămâne o rețetă derivată.
     Vectorul nu se pierde niciodată.
   - Singurul drum raster → vector din zona de relief e „conturul vectorial al reliefului”. Acolo aproximarea trebuie
     declarată, cu toleranța ei. [dedus]

## 6. Riscuri și ce a rămas neprobat

**Neprobat:**
- iGPU-ul AMD și plăcile slabe. Pe ele, plasa 3D de 4000² va avea nevoie de LOD.
- Un monitor de peste 60 Hz.
- Comportamentul tabului dincolo de 5 GB. Limita din sursă e 1 TB, dar n-am încercat să umplu RAM-ul mașinii.
- Pierderea dispozitivului WebGPU (TDR, reset de driver) în timpul unui calcul lung. Am împărțit dispecerizarea în
  bucăți de 64 de linii. Produsul are nevoie de reluare automată sau de rezervă pe CPU.
- Efectul COOP/COEP asupra login-ului și asupra Stripe (§5.6).
- Operațiile de relief pe care sonda nu le-a atins:
  - extrudarea pe cale și two-rail sweep;
  - relieful din text cu glife reale;
  - texturile și țesătura;
  - back relief și întoarcerea;
  - deformarea în anvelopă a reliefului;
  - feliile pentru modele înalte;
  - zonele;
  - coliziunea cu mandrina, care se reduce la un al doilea profil peste același câmp [dedus].

**Risc de măsurat:** **exportul STL al reliefului.** Plasa completă a unui relief de 4000² are 32 M de triunghiuri,
adică ~1,6 GB în STL binar. Peste limita unui `ArrayBuffer`, deci exportul cere decimare cu toleranță. [dedus din
§4.7]

**Surplusul lângă pereți abrupți:** câmpul conservativ lasă material într-o bandă de ~1,5 celule. Pe verticală,
surplusul poate atinge înălțimea peretelui: până la 5 mm pe peretele de 0,01 mm, cu freza dreaptă. E sigur, dar
lângă pereți finisarea are nevoie de celulă fină sau de o trecere exactă pe plasă. [măsurat]

**Precizia în float32 pe GPU:** coordonatele lumii la 2440 mm au un pas de 0,24 µm. Pe GPU se trimit doar indici de
grilă și cote locale, iar originea rămâne în float64 pe CPU. [dedus]

**Operațiile riscante pentru v1**, de la cel mai mare risc:
1. **bas-relieful din 3D:** metoda merge și e rapidă, dar calitatea artistică depinde de parametrii de compresie, iar
   judecata e a owner-ului;
2. **extrudarea, two-rail sweep, spin și turn:** geometrie cu multe cazuri limită;
3. **exportul STL cu toleranță:** cere decimare;
4. **sculptura cu undo pe dale:** memorie și consistența dalelor;
5. **texturile și țesătura;**
6. **riscul mic:** combinarea, scalarea, estomparea, offsetul, netezirea, volumul și greutatea, imaginea gri pe 16 biți
   și analiza.

## 7. Cum se reproduce

```
cwd: C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s5-relief
comanda: node masoara.mjs
```

- Alternativa: copiezi `cod/` într-un dosar din afara Drive-ului, rulezi `npm ci`, apoi `node masoara.mjs`.
- Comanda rulează pe rând:
  - oracolele pe grilă;
  - oracolele pe plasă și scena de 1,38 M de triunghiuri, pe care o generează la prima rulare;
  - bas-relieful la 2000²;
  - bancul din browser, cu Edge cu fereastră, pe portul 5175 și GPU-ul real.
- La final închide browserul și serverul și tipărește un rezumat.
- Durata măsurată: **78 s** pe 07.10, cu ceilalți agenți rulând în paralel. Rularea a reprodus cifrele cheie: WebGPU
  90–93 ms la finisare și 44 ms la blur, 0 scobituri cu C, 0 abateri pe plasă. `--fara-browser` sare partea de
  browser.
- Cifrele complete din acest raport (5 rânduri pe suprafață, 2 000 de puncte pe sculă, bas-relief la 4000²) vin din:
  - `node oracole-hf.mjs`;
  - `node --max-old-space-size=8192 oracole-mesh.mjs`;
  - `node --max-old-space-size=8192 basrelief.mjs --n=4000`;
  - `node run-browser.mjs`.
