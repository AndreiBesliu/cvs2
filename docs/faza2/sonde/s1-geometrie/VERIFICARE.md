# Verificarea v1-geometrie: sonda s1 trecută prin cazuri adversariale

> Faza 2, tranșa 1b. Cod aruncabil, scris doar ca dovadă. Codul e în `cod-verificare/`; rezultatele complete în
> `cod-verificare/rez-*.json`.
> Marcaje: **[măsurat]** = am rulat eu; **[citit]** = documentație sau sursă, cu link; **[dedus]** = concluzie trasă de mine.
> Data: 07.10.2026. Mașina: Ryzen 9 7950X, Node 26.10, Windows 11, încărcată de alte 4 agenți (timpii absoluți sunt umflați).

## 1. Ce verific

Sonda s1 (`RAPORT.md`) recomandă nucleul de geometrie pe care va sta fiecare traseu de sculă din produs:
- calea are trei primitive: **linie, arc de cerc, cubică**;
- **booleanul** (unire, diferență, intersecție, XOR) se face cu **Skia PathOps**, build-ul `pathkit-wasm` 1.0;
- **offsetul** (curba paralelă la distanța d) se face cu algoritmul **cavalier_contours**, din portul TypeScript
  `cavalier-contours-js` 0.1.1;
- cubicele intră în offset o singură dată, ca **biarce** (perechi de arce tangente) date de un fitter propriu, ca CAM-ul
  să scrie direct **G2/G3** (mișcări în arc ale mașinii).

Am încercat să răstorn patru afirmații decisive (C1–C4) cu cazuri pe care sonda nu le-a încercat: buzunare reale pe
litere, schimbări de topologie, intrări „murdare” ca în DXF-urile reale, offseturi deschise, deriva lui PathKit în
lanț, muchii coincidente. Am refăcut și măsurătorile de bază ale sondei.

Termeni folosiți:
- **buzunar** = golirea unei regiuni prin offseturi repetate spre interior; fiecare offset e un **inel** de traseu;
- **Hausdorff în ambele sensuri** = (1) fiecare punct al ieșirii e la distanța corectă de original și (2) fiecare punct
  al curbei adevărate are lângă el un punct al ieșirii; (2) prinde bucățile lipsă;
- **rază maximă înscrisă** = cel mai mare cerc care încape în regiune; numărul de inele de buzunar decurge din ea;
- **bulge** = tan(baleiaj/4), felul în care cavalier și DXF-ul țin un arc pe o polilinie;
- **epsilon** = pragul sub care biblioteca socotește două valori egale;
- **float32** = numere cu ~7 cifre semnificative; așa calculează Skia (și GRBL);
- **oracol** = cod scris separat, care știe răspunsul corect fără să folosească biblioteca testată;
- **control negativ** = o variantă stricată intenționat, pe care verificarea TREBUIE s-o prindă.

## 2. Pe scurt

**Verdict: se păstrează, cu gărzi obligatorii. Nu se înlocuiește.** Nucleul propus e exact și rapid pe domeniul
principal al produsului. Are însă trei slăbiciuni măsurate, pe care sonda nu le-a văzut, și o afirmație de remediu
care nu ține în forma propusă.

Ce ține [măsurat]:
- **Buzunarele pe litere sunt corecte.** 4 fonturi (Arial, Times New Roman, Segoe Script, Gabriola), 4 glife fiecare,
  30 și 200 mm, sculă Ø6,35, pas 2,54: 32 de cazuri, 73 de niveluri. Numărul de inele e exact cel cerut de raza maximă
  înscrisă în **32/32** cazuri. Abaterea în ambele sensuri: **0,00202 mm**, adică toleranța biarcelor (0,002), nimic
  în plus. La 30 mm, cu Ø3,175, încă 16/16.
- **Topologia se schimbă corect.** Haltera se rupe, cercurile se unesc, fanta se închide și apare gaura corectă,
  pieptenele își pierde dinții: **40/50 exact la 1e-11 mm**. Restul de 10 sunt la ±1e-6 mm de prag, unde decid
  epsilon-urile bibliotecii; abaterea rămâne ≤ 2,1e-5 mm.
- **Offsetul deschis pe o parte** e exact (1e-15 mm), chiar și unde raza de curbură (0,33 mm) e sub offset (3,175 mm).
  Controlul negativ (partea greșită) e prins 10/10.
- **Booleanul PathKit, la o singură operație,** stă la nivelul float32: ≤ 1,3e-4 mm la 2 440 mm și ≤ 5e-6 mm la 100 mm.
  Pe glife păstrează topologia, inclusiv cu muchii coincidente.

Ce nu ține [măsurat]:
1. **cavalier nu e robust pe polilinii dense.**
   - Pe o curbă închisă și simplă de 5 000 de segmente, **47 din 240** de offseturi eșuează: **25 întorc bucle
     DESCHISE** (arie 0) și 22 aruncă `view data must be valid for source`. La 200 de segmente: 0 eșecuri.
   - Pe intrare zimțată, ca la o imagine vectorizată (10 000 de vârfuri), un singur offset durează **233 s**. La
     15 000 de vârfuri cade (`Set maximum size exceeded`).
2. **Un epsilon greșit în cavalier umflă offsetul.**
   - Testul „sunt paralele?” compară un produs vectorial nenormalizat (mm²) cu 1e-5 (o lungime).
   - Două segmente scurte cu o întoarcere mică sunt luate drept paralele, iar îmbinarea devine **semicerc**.
   - Abaterea e d·θ/2, prezisă pe hârtie și măsurată: **0,0164 mm** pe un cerc R1 teselat în 600 de segmente
     (prezis 0,0166).
   - Defectul e și în originalul Rust, nu doar în port [citit].
3. **Forme mici dispar în tăcere.** Un pătrat de 50 mm cu colțuri r = 0,001 mm, decalat spre interior cu 0,0011…0,005 mm,
   întoarce **nimic** (aria corectă pe hârtie: 2 499,6 mm²).
4. **PathKit în lanț derivă, iar remediul propus de s1 nu repară.**
   - După 100 de operații la 2 440 mm, abaterea crește de la 9,6e-5 la **5,1e-4 mm**.
   - 27 de bucăți de cerc nu mai trec testul „e arc”. Arcele scurte au centrul greșit cu până la **0,57 mm**.
   - Re-ancorarea pe centru și rază (s1) lasă 31 de arce nepotrivite și **nu reduce abaterea**.
   - Varianta R3 (§4.6) aduce rezultatul la **3,3e-13 mm** după 100 de operații: fiecare segment se potrivește prin
     3 puncte pe primitiva-sursă, iar vârfurile se recalculează ca intersecții exacte, după fiecare operație.

Cifre de context:
- timpii pe offset: buzunar 1,5 ms pe nivel (mediană); elipsă de 5 000 de segmente 7–8 ms spre interior, 11–13 ms spre
  exterior (mediana a 5–7 repetări);
- portul JS e din Rust v0.7.0. Originalul a scos între timp 0.8.0 și 0.9.0, cu reparații de offset (#79, #82, #83) pe
  care portul nu le are [citit];
- **pathkit-wasm 1.0.0 e din 2022-02-03**, nu din aprilie 2025, cum scrie s1 [măsurat: npm].

## 3. Afirmațiile și verdictele

| # | Afirmația (din s1) | Verdict | Tip | Dovada |
|---|---|---|---|---|
| C1a | Offsetul cavalier e exact; cercul rămâne 2 arce | **CONFIRMAT** | – | Baza refăcută identic (T1: 2 arce, ≤ 2,7e-7 mm). Topologie 1e-11, deschis 1e-15, buzunar = toleranța biarcelor [măsurat] |
| C1b | Offsetul e robust (353/353 în corpus) | **INFIRMAT** | domeniu | Robust doar pe intrări curate, cu puține segmente. Polilinii dense: 47/240 eșecuri. Zimți: 233 s, apoi cădere. Forme sub 0,005 mm dispar. Semicercuri la segmente scurte (§4.3). Banda oracolului s1 la 2 440 mm era ~0,6 mm [măsurat, citit: `cod/robustete.mjs`] |
| C1c | Formele cu găuri se decalează corect cu `Shape` | **CONFIRMAT** | – | 48 de cazuri de buzunar pe glife (B, g, & au găuri), numărul de inele corect, orientare corectă. 1 micro zig-zag de 1,2 µm în 239 de inele (§4.1) [măsurat] |
| C2a | PathKit păstrează arcele (conice reconvertite exact) și cubicele, în eroarea float32 | **CONFIRMAT** la o operație; **INFIRMAT** în lanț | domeniu | 1 op.: ≤ 1,3e-4 mm la 2 440. 100 op.: 5,1e-4 mm, 27–47 de conice nerecunoscute, centre de arc greșite cu până la 0,57 mm (§4.6) [măsurat] |
| C2b | Remediul s1: re-ancorarea arcelor pe cercurile-sursă aduce eroarea la 1e-9 | **INFIRMAT** | mecanism | Potrivirea pe centru/rază lasă 1–31 de arce nepotrivite (31 la 2 440 mm), abaterea rămâne 5,12e-4 mm și apar goluri de 1,9e-4. Ideea ține doar cu alt mecanism (R3): 3,3e-13 mm [măsurat] |
| C3 | Lanțul cubică → biarce → offset → G2/G3 are abaterea egală doar cu toleranța biarcelor | **CONFIRMAT** | – | Abaterea maximă e 1,0076 × toleranța (fitter-ul își verifică eroarea pe 23 de puncte). Cubicele grele (vârf, buclă, mâner retras P1 = P0) ≤ 0,93 × toleranța. 780 de arce G2/G3 fără `error:33`. Ține acolo unde cavalier reușește (vezi C1b) [măsurat] |
| C4a | cavalier-contours-js: MIT OR Apache-2.0, v0.1.1, un singur autor | **CONFIRMAT** | – | `package.json`, LICENSE-MIT și LICENSE-APACHE. npm: un singur maintainer; 0.1.0 și 0.1.1 publicate pe 08.08.2026, la 13 minute distanță [măsurat] |
| C4b | „Livrează ~232 de teste portate” | **INFIRMAT** | adevăr | Pachetul npm conține doar `dist/`, licențele și README; testele sunt doar în depozitul GitHub [măsurat; citit: README] |
| C4c | Cele 232 de teste trec | **NEDECIS** | – | Nu le-am rulat: nu sunt în npm, iar sursa GitHub nu am descărcat-o (doar npm/PyPI permise). Sunt testele Rust v0.7.0, deci nu acoperă reparațiile din 0.8/0.9 [dedus] |
| C4d | pathkit-wasm: BSD-3, ultima versiune aprilie 2025 | licență **CONFIRMAT**; data **INFIRMAT** | adevăr | 1.0.0 publicat pe 2022-02-03 (CHANGELOG-ul pachetului: emsdk 3.1.3). „aprilie 2025” e data modificării metadatelor din registru [măsurat: `npm view pathkit-wasm time`] |
| B | Măsurătorile de bază ale sondei se reproduc | **CONFIRMAT** | – | `node masoara.mjs --rapid` într-o copie: T1–T6 identice la ultima cifră; T7 cavalier 71/71, Skia 102/102; T8 aceeași ordine (cavalier 11 ms pentru 1 000 de offseturi) [măsurat] |
| G | GRBL respinge un arc doar peste 0,005 mm și peste 0,1 % din rază | **INFIRMAT** | adevăr (incomplet) | Îl respinge și peste 0,5 mm absolut [citit: `grbl/gcode.c`] |

## 4. Cazurile noi și măsurătorile

### 4.0 Oracolul și cum l-am verificat

- **Cod nou** (`oracol-v1.mjs`, `adevar.mjs`). Nu importă nimic din sonda s1 și nici din bibliotecile testate.
- **Distanța e exactă:**
  - la linie, prin proiecție;
  - la arc, prin unghiul din baleiaj;
  - la pătratică (fonturile TrueType), prin rădăcinile unei cubice;
  - la cubică, prin eșantionare densă plus căutare ternară.
- **Interior/exterior** se decide prin numărul de înfășurare, nu prin rază (motivul e mai jos).
- **Valori pe hârtie** (`t0-oracol.mjs`, toate trec):
  - distanța la parabolă √3/2 și rădăcina lui 4x³ + 6x − 1;
  - ariile 1/6 și 100π;
  - bulge 1 → semicerc de rază 5;
  - regula GRBL.
- **Control negativ:** un oracol care tratează arcul ca cerc întreg greșește cu 13,6 mm și e prins.

**Defecte găsite în propriul oracol și reparate** (semnalul ≠ măsurătoare):
1. Testul cu raza orizontală număra greșit când raza trecea exact printr-un capăt de arc: π − 2e-19 se rotunjește la π.
   Efectul: un fals „offset greșit cu 2d” la două cercuri. Ieșirea cavalier era corectă. Reparat prin numărul de
   înfășurare, verificat pe 200 000 de puncte aleatoare: 0 nepotriviri (`t0-interior.mjs`).
2. Distanța la cubică se oprea devreme lângă capetele cu viteză zero (P1 = P0). Raporta 0,014 mm pentru puncte aflate
   PE curbă și făcea fitter-ul s1 să pară că depășește toleranța de 6,5 ori. Reparat; testul de regresie e în
   `t0-oracol.mjs`.
3. Sensul arcului în remediul R3 era inversat pentru conicele nerecunoscute (codul meu, nu cel testat). Reparat.

### 4.1 (a) Buzunarul pe glife din 3+1 fonturi

**Metoda:**
- Glifa e scalată la înălțimea H (30 sau 200 mm).
- Calea testată e cea recomandată de s1: pătratice → biarce proprii (0,002 mm) → `Shape` cavalier → `parallelOffset`
  repetat.
- Inelele se calculează în două feluri: **direct** (fiecare inel din original, cu D_k = 3,175 + 2,54·k) și **iterativ**
  (fiecare inel din inelul anterior, cu pasul 2,54).

**Oracolul:**
- frontiera originală, cu pătraticele exacte;
- nivelul adevărat {distanța = D}, găsit pe o grilă de 220–320 de celule pe înălțime și rafinat cu regula falsi;
- raza maximă înscrisă: eșantionare densă plus căutare locală;
- numărul așteptat de inele = câte valori D_k < R_max.

| Mărime | Valoare [măsurat] |
|---|---|
| Cazuri / niveluri | 32 de glife (Arial, Times, Segoe Script, Gabriola × B g & S × 30/200 mm), 73 de niveluri |
| Număr de inele = cel cerut de R_max | **32/32**, atât direct, cât și iterativ; niciun caz ambiguu (D_k la < 0,01 mm de R_max) |
| La 30 mm cu Ø6,35 | R_max = 1,53…2,58 mm < 3,175: **0 inele**, corect. Literele de 30 mm nu se pot goli cu această freză |
| La 30 mm cu Ø3,175 (pas 1,27) | 16/16 corecte (Gabriola „g”, R_max 1,533 < 1,5875: 0 inele, corect) |
| Ieșire → adevăr / adevăr → ieșire | **0,0020151 / 0,0020146 mm** (toleranța biarcelor: 0,002) |
| Puncte în afara regiunii / orientare inversată | 0 / 0 (la Ø6,35); 4 eșantioane pe un zig-zag de 1,2 µm (la Ø3,175, Segoe „B”) |
| Structura (`t-a-zigzag.mjs`) | 239 de inele, 17 024 de segmente: **1 zig-zag** (segment de 1,2 µm întors la ambele capete), 3 segmente < 1 µm |
| Timp | 1,5 ms mediană pe nivel (maximum 6,5 ms) |

**Controale negative:**
- offset × 1,01 → abaterea 0,135 mm, adevăr → ieșire 8 mm: **prins**;
- inelul final șters → 4 inele în loc de 5: **prins**.

**Limită:** numărarea componentelor pe grilă (4-vecini) nu e de încredere la feliile subțiri de lângă axa medială.
De aceea decid cele două direcții Hausdorff, nu acea numărătoare.

### 4.2 (b) Schimbări de topologie

Toate intrările sunt din linii și arce (fără biarce), deci orice abatere peste ~1e-9 ar fi a lui cavalier. Numărul de
bucle așteptat e calculat pe hârtie. Formele sunt verificate pe hârtie: aria halterei, 2 634,177185050775 mm², iese la
toate cifrele.

| Caz | Prag pe hârtie | Rezultat [măsurat] |
|---|---|---|
| Halteră (cercuri R20, gât de 6 mm), offset interior | D = 3: 1 → 2 bucle | Corect la ±0,1, ±0,01 și ±1e-4, abatere ≤ 1e-13. La 3 + 1e-6: 1 buclă în loc de 2, abatere 2e-6 |
| Două cercuri R10, gol 0,1, offset exterior (`Shape`) | d = 0,05: 2 → 1 | Corect la ±0,01 și ±1e-4. La 0,05 + 1e-6: 2 bucle în loc de 1, abatere 2e-6 |
| C cu fantă de 0,05 mm, offset exterior | d = 0,025: apare o gaură CW | Corect (2 bucle, gaura CW) la +1e-4…+1; la ±1e-6 decide epsilon-ul (abatere ≤ 2e-6) |
| Pieptene cu 20 de dinți | interior D = 1; exterior d = 1,5 | Corect; la 1,5 − 1e-4 abaterea e 2,07e-5 (fantă de 2e-4 sub `sliceJoinEps` = 1e-4) |

Total: **40/50 exacte (≤ 6,4e-12 mm)**; 10/50 în banda de epsilon, cu abaterea ≤ 2,07e-5 mm. `Polyline` și `Shape` dau
același rezultat. Pentru CAM banda e fără importanță. Trebuie însă declarată: topologia la mai puțin de ~1e-4 mm de
un prag e decisă de epsilon-urile bibliotecii [dedus].

### 4.3 (c) Intrări murdare

Fiecare offset rulează într-un worker cu termen de 20 s. Oracolul: distanța exactă la polilinia de intrare plus puncte
adevărate pe normale.

| Caz | Rezultat [măsurat] |
|---|---|
| Elipsă 100 × 50 în 5 000 de segmente, ±3,175 | Interior: 1e-5 mm. **Exterior: 0,004 mm**: toate cele 5 000 de arce de îmbinare au bulge = 1 (semicerc) în loc de ~6e-4 |
| Timp, 5 000 de segmente | Elipsă: 7,0 ms interior, 11,7 ms exterior (mediana a 7). Curbă ondulată: 7,1 ms |
| Curbă ondulată de 5 000 de segmente, ±3,175 | închisă, dar abaterea e 0,005 mm (interior și exterior); probabil același mecanism de semicerc [dedus] |
| Curbă ondulată de 5 000 de segmente, interior 6 mm | **2 polilinii DESCHISE**, arie 0. Adevăr → ieșire: 27,8 mm (lipsește aproape tot) |
| Baleiaj d = ±0,25…±30 (240 de offseturi) | Ondulată 5 000: **25 deschise + 22 excepții**. Elipsă 5 000: 2 excepții. „Floare” 5 000: 17 excepții. La 200 de segmente: 0. `handleSelfIntersects` nu schimbă nimic; epsilon × 0,01: 2 + 27; × 10: mai rău |
| Aceeași curbă ondulată, refăcută în 952 de biarce (calea s1) | **2/240 deschise**: biarcele reduc mult problema, dar nu o elimină |
| 100 de vârfuri dublate; arc de lungime zero; vârf dublat la 1e-9…1e-6 | Corect: abaterea e chiar mărimea dublurii |
| Laturi-arc aproape drepte (bulge 1e-9…1e-6); 10 arce ±1e-7 | Corect (≤ 3e-6 mm, zgomotul propriului oracol la raze de 1e9 mm). Doar ieșire → adevăr: la raze de 1e9 mm adevărul pe normale nu se poate construi în double |
| Colțuri r = 0,001 mm, offset ±3,175 și ±0,0005 | Corect, la 1e-12 |
| **Aceleași colțuri, interior 0,0011…0,005 mm** | **0 bucle: forma dispare**. La 0,00099 aria greșește cu 0,001 mm²; corect la 0,001 și de la 0,01 în sus. La r = 0,01 / 0,1 / 1 totul e corect (arie pe hârtie) |
| Cerc r = 0,001 | Corect (exterior, interior, dispare la 0,002) |
| Cerc r = 4e-6 (sub `posEqualEps` = 1e-5); cerc r = 1e-5 | r = 4e-6, exterior 3,175: **0 bucle**, intrarea e aruncată în tăcere. r = 1e-5: ieșiri degenerate (polilinie de un vârf), inclusiv unde rezultatul trebuia să dispară |
| „8” care se autointersectează | Implicit: 1 buclă, adică doar un lob (aria 1 122 din 2 500). Cu `handleSelfIntersects`: încă o buclă deschisă. `scanForSelfIntersect()` îl detectează |

**Mecanismul semicercului, probat pe hârtie** (`t-c3-eps-scara.mjs`) [măsurat, citit]:
- `lineLineIntr` decide „paralele” când |v × u| < `posEqualEps` = 1e-5. v și u sunt segmentele nenormalizate, deci
  testul real este L1·L2·sin θ < 1e-5 mm².
- Atunci îmbinarea devine semicerc (`bulge = ±1`), iar abaterea e ≈ d·θ/2.

| Intrare | L²·sin θ | Prezis (d·θ/2) | Măsurat |
|---|---|---|---|
| Cerc R1 teselat în 600 de segmente | 1,15e-6 (< 1e-5) | 0,0166 mm | **0,01641 mm**, 598 de semicercuri |
| Cerc R10 teselat în 5 000 | 1,98e-7 | 0,00199 mm | **0,001994 mm**, 5 000 de semicercuri |
| Cerc R10 teselat în 600 (control) | 1,15e-4 (≥ 1e-5) | 0 | 4e-15, 0 semicercuri |
| Cerc R100 teselat în 5 000 (control) | 1,98e-5 | 0 | 3e-14, 0 semicercuri |

**Același test există în originalul Rust** (`line_line_intersect.rs`: `v_pdot_u.fuzzy_eq_zero_eps(eps)`, vectori
nenormalizați) [citit:
https://github.com/jbuckmccready/cavalier_contours/blob/master/cavalier_contours/src/core/math/line_line_intersect.rs].
Changelog-ul 0.8.0/0.9.0 nu îl repară [citit].

**Intrare zimțată** (latura de jos a unui pătrat de 30 mm, zgomot de 1–2 µm, ca la o imagine vectorizată), offset
exterior 3,175:

| Vârfuri pe latură | Timp | Rezultat |
|---|---|---|
| 300 (pas 0,1) | 32 ms | corect |
| 3 000 (pas 0,01) | 5,7 s | bucle deschise |
| 6 000 (pas 0,005) | 44 s | bucle deschise |
| 10 000 (pas 0,003) | **233 s** | bucle deschise |
| 15 000 (pas 0,002) | 12 s | **excepție `Set maximum size exceeded`** |

Cauza [dedus]: fiecare segment brut se intersectează cu toate segmentele aflate la mai puțin de 2d, adică O(n·k)
intersecții. Intrările de acest fel trebuie simplificate înainte de offset.

**Cauza probabilă a excepțiilor** [citit, dedus]:
- Portul a transformat `debug_assert!` din Rust într-un `throw` permanent (`core/controlFlow.js`).
- Excepțiile sunt deci invariante interne încălcate. Un build Rust de producție nu le-ar verifica și ar merge mai
  departe în tăcere.
- Originalul Rust a reparat exact clasa aceasta după versiunea portată (v0.7.0):
  - 0.8.0 (2026-08-09): „collapsed near-vertex offset slices that could cause a debug panic (#83)”, curățarea
    vârfurilor repetate, epsilon-uri consecvente la scară (#82);
  - 0.9.0 (2026-08-19): „locally inverted source spans … invalid outputs (#79)” și „repeated polyline offsets dropping
    a valid small-loop span”.

  [citit: https://github.com/jbuckmccready/cavalier_contours/blob/master/CHANGELOG.md]
- Nu am putut rula Rust 0.9.0 (lipsește toolchain-ul). Nu știu deci câte din eșecurile de mai sus dispar acolo.

### 4.4 (d) Offset deschis, pe o singură parte, cu raza de curbură sub offset

Oracolul:
- adevărul e c(t) ± d·n(t), păstrat doar unde distanța la cale e ≥ d, plus evantaiele de la colțuri;
- ieșirea trebuie să stea la distanța d și pe partea cerută.

| Caz (d = 3,175) | Rezultat [măsurat] |
|---|---|
| L – arc r1 (90°) – L, ambele părți | exact (≤ 4e-15) |
| Ac de păr r1 (180°) | exterior exact; interior **gol**, corect (fanta de 2 mm e mai îngustă decât 2d) |
| Zigzag cu unghiuri de 22,6° | exact pe ambele părți |
| Cubică în buclă strânsă (rază minimă 0,33 mm) prin biarce | 0,002 mm = toleranța biarcelor |
| Spirală de arce cu razele 5 → 0,5 | exact; partea interioară e goală, corect |

**10/10.** Controlul negativ (offset pe partea opusă) e prins **10/10**.

### 4.5 C3: fitter-ul de biarce și G2/G3

- **Glife:** 1 682 de pătratice din 4 fonturi; abaterea reală (ambele sensuri, oracol exact) e **1,0053 × toleranța** la
  0,002 și 0,996 × la 0,01. Fitter-ul își măsoară eroarea pe 23 de puncte pe bucată și poate scăpa vârful dintre ele.
  În buzunare depășirea maximă a fost 1,0076 ×.
- **Cubice grele, la toleranța 0,002:**
  - vârf (cusp): 0,93 ×; buclă: 0,96 ×;
  - mâner retras (P1 = P0, frecvent în SVG/Illustrator): 0,66 ×; dreaptă degenerată: exact;
  - dublă inflexiune: 0,79 ×; minusculă (0,01 mm): 0,05 ×; uriașă (2 440 mm): 0,87 ×.
  - Excepție: o cubică aproape dreaptă dă arce de rază **6e7 mm**, cu un gol de 1,6e-8 mm la îmbinare (centru și rază
    prost condiționate).
- **G-code:** inelele buzunarului Arial B 200 mm dau 780 de arce cu **0 `error:33`**, verificate cu regula GRBL în float32
  (Δr max 1,1e-4).
- **Arce aproape drepte** (bulge 1e-8…1e-5 din DXF, sau din fitter) ies cu **|I|,|J| până la 2,5e9 mm**:
  - GRBL le acceptă și, pentru că săgeata e sub `arc_tolerance`, le trasează ca linie [măsurat: emulare; citit: gcode.c];
  - alte controlere (NcStudio, Syntec, Mach3) pot refuza numere cu 10 cifre întregi. Neprobat [dedus].

### 4.6 (e) Deriva PathKit în lanț și remediul

Lanțul are 101 surse: un dreptunghi rotunjit mare, apoi cercuri și dreptunghiuri rotunjite alternate. 100 de operații
alternează reuniunea și diferența. După fiecare operație rezultatul trece prin modelul neutru (conică → arc cu
`conicToArc` din s1), cum ar face produsul.

**Oracolul exact:**
- apartenența unui punct = predicatele exacte ale surselor, pliate;
- abaterea frontierei = min |distanța cu semn la fiecare sursă|.

**Control:** o deplasare de 1e-4 mm e prinsă (1,01e-4 față de 3,7e-6).

| Scenariu | După 1 op. | După 100 op. | Arc: centru greșit (max) | Conice nerecunoscute (cumulat) |
|---|---|---|---|---|
| Placă 0…2 440 mm | 9,6e-5 mm | **5,1e-4 mm** | **0,57 mm** (la op. 50) | 27 |
| Aceeași placă, centrată în origine | 1,9e-5 | 1,2e-4 | 0,016 mm | 28 |
| Detaliu de 100 mm lângă origine | 2,8e-6 | 1,1e-5 | 0,0048 mm | 47 |

**Remediile încercate** (la 2 440 mm, după 100 de operații):

| Remediu | Abatere | Goluri între segmente | Nepotrivite |
|---|---|---|---|
| R1 = propunerea s1 (arcele, după centru/rază ±1e-3; capete proiectate) | **5,1e-4 (neschimbat)** | 1,9e-4 | 31 |
| R2 = R1 + linii + vârfuri recalculate ca intersecții | 5,1e-4 | 1,9e-4 | 31; 86 de vârfuri fără intersecție |
| **R3** = fiecare segment (linie, arc, conică) potrivit prin 3 puncte pe primitiva-sursă (eps 1e-3); vârfuri = intersecții exacte | **3,7e-13** | 3,7e-12 | 0 |
| R3 cu eps 1e-4 | 5,1e-4 (eps sub derivă) | 1,1e-4 | 27 |
| **R3 după fiecare operație** | **3,3e-13** (2 440 mm), 7e-15 (100 mm) | 3,7e-12 | 0 nepotrivite, 0 ambigue; 0 conice rămase |

**De ce eșuează R1:** la arcele scurte, centrul recuperat din conica float32 e prost condiționat (eroare până la
0,57 mm), deși punctele arcului sunt bune. Potrivirea trebuie făcută pe puncte, nu pe centru. Și trebuie făcută după
fiecare operație, ca deriva să nu treacă de eps.

### 4.7 (f) Muchii coincidente și găuri (PathKit 1.0)

| Caz | Rezultat [măsurat] |
|---|---|
| Glifă ∪ aceeași glifă (Arial B & ® 8, Times &, Segoe B, Gabriola g), la (0,0) și la (2 440, 1 220) | numărul de contururi se păstrează 14/14. Abaterea în ambele sensuri: 2,7–4,8e-6 mm la (0,0) și 1,15–1,31e-4 mm la 2 440, adică float32. Aria: ≤ 4e-8 relativ, respectiv ≤ 3e-6 la 2 440 (pragul meu de 1e-6 a fost prea strict pentru float32 acolo) |
| Glifă − aceeași glifă mutată cu 1e-6 mm (x, y, diagonal) | rezultat **gol** (1e-6 e sub precizia float32). Fără bucăți false |
| XOR de contururi imbricate (cercuri 30/20/10 față de aceleași, mutate cu (3,1)) | aria 757,977943 față de 757,978072 pe hârtie (formula lentilei): **1,7e-7 relativ**; 36 de arce, 0 conice. La scară × 40: 6,1e-8 |
| XOR aproape concentric (mutare de 0,001) | aria 0,2394 față de 0,2400: −6,5e-4 mm² absolut (seceri de 1 µm grosime), abatere 1,5e-5 mm. În absolut e nivelul float32 |
| Control: o „reuniune” care pierde găurile | prins (3 → 1 contururi) |

Dovezile s1 pentru boolean (507/508) au venit din **CanvasKit**, nu din PathKit. PathKit fusese probat pe o singură
reuniune. Testele de aici rulează direct pe PathKit 1.0.

### 4.8 C4: maturitate, licențe, istoricul defectelor

- **cavalier-contours-js 0.1.1:**
  - MIT OR Apache-2.0, ambele fișiere de licență prezente;
  - un singur maintainer (msurguy); 0.1.0 și 0.1.1 publicate pe 08.08.2026;
  - 54 de fișiere în pachet, fără teste [măsurat];
  - tracker-ul are 1 issue, cu sugestii de funcții (#1), nicio raportare de defect [citit:
    https://github.com/msurguy/cavalier-contours-js/issues].
- **cavalier_contours (Rust):**
  - 8 issue-uri deschise, 43 închise;
  - deschise și relevante: #84 „Booleans fragile with slightly overlapping rectangles” (05.10.2026), #72 (boolean cu
    autointersecții), #43;
  - închise după v0.7.0: #79 (aserțiune în `pline_view` la offsetul unei polilinii de 300+ vârfuri), #82 (offset gol
    la o polilinie deschisă, d = −0,005), #83;
  - versiuni: 0.7.0 pe 02.01.2026, **0.8.0 pe 10.08.2026, 0.9.0 pe 20.08.2026**.

  [citit: https://github.com/jbuckmccready/cavalier_contours/issues, `/tags`]
- **pathkit-wasm:** BSD-3-Clause. **1.0.0 pe 2022-02-03**, nicio versiune după aceea. Același PathOps e întreținut în
  `canvaskit-wasm` (0.42.0, 2026-08-18; 3,3 MB) [măsurat: `npm view … time`].

## 5. Ce schimbă în arhitectură

Rămân deciziile s1: primitivele L/A/C, booleanul prin PathOps, offsetul prin algoritmul cavalier, biarce la intrarea
în offset, G2/G3 din nucleu. Se adaugă **gărzi obligatorii**, fiecare legată de o măsurătoare de mai sus:

1. **Codul cavalier se ia în proiect, dar întâi se aduce la zi:**
   - se portează reparațiile Rust din 0.8.0 și 0.9.0 (#79, #82, #83, curățarea vârfurilor repetate);
   - se repară testul „paralele”: unghiul normalizat, sin θ = (v × u)/(|v||u|), comparat cu un epsilon unghiular, nu
     produsul în mm² cu o lungime;
   - suita din `cod-verificare/` rulează în CI;
   - estimare: 2–4 zile [dedus].
2. **Ușa de intrare a offsetului curăță intrarea:**
   - scoate vârfurile repetate;
   - unește liniile aproape coliniare (θ < 1e-3);
   - re-aproximează poliliniile dense cu arce sau biarce sub toleranță: 5 000 de segmente devin ~100–1 000;
   - netezește intrarea zimțată, de exemplu cu Douglas–Peucker la 0,01 mm, înainte de orice offset;
   - respinge sau repară căile care se autointersectează (`scanForSelfIntersect`, apoi `simplify` din PathOps).
3. **Ieșirea offsetului e validată în produs**, cu un oracol de structură:
   - orice buclă deschisă sau orice excepție = eșec explicit;
   - rezultat gol când raza înscrisă e > d = eșec;
   - aria se verifică monoton în d;
   - zig-zag-urile și segmentele sub 1 µm se curăță înainte de legarea traseului.

   La eșec: încercare cu d ± 1e-6, apoi o eroare clară către utilizator. Niciodată un traseu tăcut greșit.
4. **Rezoluția modelului se declară: 0,01 mm.** Sub ea (colțuri r = 0,001, offseturi < 0,005) rezultatul nu e garantat.
   Topologia la mai puțin de ~1e-4 mm de un prag o decide epsilon-ul.
5. **Booleanul PathKit merge doar cu re-ancorarea R3 după fiecare operație:**
   - adaptorul ține primitivele exacte (double) ale intrărilor;
   - fiecare segment se potrivește prin 3 puncte, la eps 1e-3 mm (de ~4 ori deriva unei operații la 2 440 mm);
   - vârfurile devin intersecții exacte;
   - segmentele nepotrivite sau ambigue se semnalează;
   - apoi se reunesc arcele co-circulare vecine.

   Fără R3, „cercul rămâne cerc” nu ține după operații repetate (centre greșite cu până la 0,57 mm).
6. **Postprocesorul de G-code:**
   - arcele cu rază > ~1e4 mm sau săgeată < 1e-4 mm se scriu ca G1;
   - modelul trece în linie orice arc cu |bulge| < 1e-6;
   - regula GRBL (0,005 / 0,5 mm / 0,1 %) intră în testele postului.
7. **Fitter-ul de biarce** își verifică eroarea mai des (sau potrivește la 0,98 × toleranța), ca toleranța declarată să
   fie o limită, nu o medie.
8. **PathKit 1.0 e înghețat din 2022.** Rămâne utilizabil (testele de aici trec la nivel float32). Planul trebuie însă să
   aleagă între trei căi: PathOps din CanvasKit (întreținut, dar 3,3 MB), un build propriu, minim, al PathOps din Skia,
   sau PathKit asumat ca dependență înghețată.
9. **De măsurat în plan, înainte de cod:** originalul Rust 0.9.0 compilat în WASM, pe aceeași suită, față de portul JS
   reparat. Dacă 0.9.0 rezolvă poliliniile dense, alegerea se schimbă.

**De ce nu înlocuire:** niciun candidat probat de s1 nu poartă arcele exact (Clipper aplatizează, paper.js greșește
cercul, maker.js e de 50–250 de ori mai lent). Pe domeniul principal (litere, forme CAD, segmente ≳ 0,05 mm, d ≥ 0,01 mm)
cavalier e exact și rapid. Eșecurile apar în domenii identificabile, iar simptomele lor se pot detecta: excepție, buclă
deschisă, gol, durată. Singurele tăcute sunt semicercul și forma minusculă care dispare; prima o elimină garda 1/2,
a doua garda 4 [dedus].

## 6. Riscuri și ce a rămas neprobat

- **Originalul Rust nu a rulat** (fără toolchain): nu știu câte eșecuri de pe poliliniile dense le repară 0.9.0.
  Semicercul rămâne, după sursă [citit].
- **Testele portate (232) nu au rulat**: nu sunt în npm, iar sursa GitHub n-am descărcat-o. Dacă se aduce codul în repo,
  vin cu el.
- **Gărzile din §5 sunt propuse, nu probate**, cu excepția R3. Nu am măsurat cât repară curățarea intrării pe
  poliliniile dense. Proba se face cu `t-c2-dens.mjs` după gardă.
- **R3** depinde de primitive-sursă neambigue. Surse aproape coincidente (cercuri concentrice cu Δr < 1e-3) dau
  „ambigue”; în lanțurile mele, 0 cazuri. Nu am construit adversarial cazul acesta.
- **Numai Node.** Browserul și worker-ul (memoria WASM, transferul datelor) n-au fost probate.
- **Fișiere reale** (DXF/SVG de la clienți) n-au fost încercate; poliliniile dense și zimții sunt sintetice.
- **Fonturile cu contururi suprapuse în aceeași glifă** (unele fonturi variabile) cer o reuniune înainte de offset.
  Neprobat.
- **G-code:** am emulat doar verificarea arcului din GRBL, nu interpolarea din `mc_arc`. Limitele de format ale
  NcStudio, Syntec și Mach3 pentru I/J mari sunt necunoscute. Nimic n-a rulat pe mașină.
- **Legarea inelelor de buzunar** (ordinea, intrarea sculei) e subiectul CAM-ului, nu al acestei verificări.
- **Timpii sunt zgomotoși** (4 agenți în paralel). Ordinele de mărime și rapoartele sunt stabile; valorile absolute
  nu sunt.
- **Numere GPU:** nu se aplică; verificarea nu randează.

## 7. Cum se reproduce

Spațiul de lucru are deja `node_modules` (o copie a sondei s1, cu verificarea în `v1/`):

```
cd C:\Users\besli\AppData\Local\Temp\claude\C--Users-besli-Desktop-MyWork-Apps\50bc5be4-b484-49e8-970f-991b3583b938\scratchpad\sonde\v1-geometrie\baza\v1
node masoara-v1.mjs
```

- Durează **124 s** pe mașina încărcată. Rulează oracolul cu controlul lui, (a) pe Arial B 200 mm cu controlul × 1,01,
  zig-zag-urile, (b), (c), (d) cu controlul, (e), (f), C3; (b), (c), (f) și C3 în mod `--rapid`.
- Variantele complete (minute): `node t-a-buzunar.mjs` (32 de glife, ~4 min), `node t-b-topologie.mjs`,
  `node t-c2-dens.mjs`, `node t-c3-eps-scara.mjs` (cazurile zimțate durează ~5 min și ultimul cade, intenționat),
  `node t-c-murdar.mjs`, `node t-c3-lant.mjs`.
- Controalele negative se rulează cu `SABOTAJ=d` / `SABOTAJ=gol` (a) și `SABOTAJ=parte` (d).
- Linia de bază s1: `node masoara.mjs --rapid` în dosarul părinte (`baza`), ~60 s.

Din repo nu se instalează nimic în Drive. Se copiază codul s1 și verificarea într-un dosar din afara Drive-ului:

```
xcopy /E /I docs\faza2\sonde\s1-geometrie\cod %TEMP%\v1g
xcopy /E /I docs\faza2\sonde\s1-geometrie\cod-verificare %TEMP%\v1g\v1
cd /d %TEMP%\v1g
npm ci
cd v1
node masoara-v1.mjs
```

Fonturile se citesc din `C:\Windows\Fonts` (Arial, Times New Roman, Segoe Script, Gabriola). Nu sunt copiate în repo
și nu se livrează.
