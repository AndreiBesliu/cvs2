# Sonda s11-izolare: are nevoie v1 de izolare cross-origin (SharedArrayBuffer)?

Faza 2, tranșa 1b, 07.10.2026. Cod aruncabil, scris doar ca dovadă pentru arhitectură. Codul e în `cod/`, iar cifrele
brute în `cod/rezultate/`.

**Marcaje:**
- **[măsurat]** = am rulat eu;
- **[citit]** = din documentație sau sursă, cu link;
- **[dedus]** = concluzie trasă din măsurători, nerulată direct.

**Mașina și browserul:** Ryzen 9 7950X (32 de fire), RTX 3060, Windows 11, Edge 154.0.4258.62, pornit **cu fereastră**
(headed), prin Playwright. La fiecare rulare: WebGL `ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11
vs_5_0 ps_5_0, D3D11)`, WebGPU `nvidia / ampere`, `isFallbackAdapter: false`. Nu e randare software. (Sonda măsoară doar
CPU; GPU-ul e notat pentru regulă.) În paralel rulau alți 4 agenți, deci timpii absoluți sunt umflați.

**Termeni:**
- **SharedArrayBuffer (SAB):** memorie pe care firul principal și workerii o văd în același timp, fără copiere.
- **Worker:** un fir de lucru separat în browser. Fără SAB, datele ajung la el prin `postMessage`.
- **Transfer:** `postMessage(…, [buffer])` mută un `ArrayBuffer` la worker fără copie; expeditorul îl pierde.
- **Izolare cross-origin** (`self.crossOriginIsolated === true`): starea în care browserul dă voie la SAB. Se obține
  în două feluri:
  - **COOP + COEP:** antetele `Cross-Origin-Opener-Policy: same-origin` (pagina rupe legătura cu ferestrele altor
    origini) și `Cross-Origin-Embedder-Policy` (`require-corp` sau `credentialless`: pagina încarcă resurse și
    iframe-uri străine doar dacă acestea acceptă explicit);
  - **DIP:** antetul `Document-Isolation-Policy` (`isolate-and-require-corp` sau `isolate-and-credentialless`). Izolează
    doar documentul, fără cerințe pentru popup-uri și iframe-uri.
- **CORP** (`Cross-Origin-Resource-Policy`) și **CORS:** felurile în care un server străin spune „resursa mea se poate
  încărca de pe alt site”.
- **Halo:** rândurile de margine de care are nevoie o bandă de la vecinii ei (12 rânduri la blur, 30 la freză).

---

## 1. Ce verific

Sondele s4 și s5 nu se potriveau:
- s4 (`s4-simulare/RAPORT.md` §5.6) recomandă **fără SAB**: mutările trimise workerilor ca tablouri transferate;
- s5 (`s5-relief/RAPORT.md` §4.5, §5.6) a măsurat blur-ul și finisarea pe workeri **cu SAB**, care cere izolare.

Întrebările:
1. **Cât costă să NU avem SAB?** Aceleași operații din s5, în aceeași rulare, cu SAB și cu transfer. Ies identic?
2. **Se poate avea izolarea împreună cu Firebase Auth, App Check (reCAPTCHA Enterprise), Stripe Checkout și Google
   Fonts?** Probat local, sub trei feluri de antete.
3. **Ce spun sursele** despre DIP, COEP `credentialless`, Firebase Auth și reCAPTCHA sub izolare.

## 2. Pe scurt

**Recomandarea: v1 NU folosește izolare cross-origin.** Workerii primesc datele prin transfer, pe benzi cu halo, iar
datele grele stau în workeri. Dacă mai târziu SAB devine necesar, se activează cu **Document-Isolation-Policy**, nu cu
COOP + COEP.

**1. Costul fără SAB e mic** [măsurat, 16 workeri, mediane]:

| Operația (s5 / s4) | SAB | Transfer: bandă + halo | Bandă ținută în worker |
|---|---:|---:|---:|
| Blur gaussian σ = 4 px pe 4000 × 4000 Float32 | 90 ms | 99 ms (**× 1,10**) | 102 ms (× 1,13) |
| Finisare drop-cutter, 2,67 M puncte, bilă R3 | 2 349 ms | 2 288 ms (**× 0,97**) | 2 265 ms (× 0,96) |
| Jobul 2D s4 la 0,1 mm (194 208 mutări) | 415 ms | 479 ms (**× 1,16**, mutări copiate) | — |

- Pe blur, raportul a variat între **1,10 și 1,23** în cele 4 rulări izolate complete (9 repetiții): **+9 … +22 ms**
  pe o operație de ~90 ms. În rulările scurte din `masoara`, cu repetiții izolate de 345–517 ms (cauza nestabilită),
  a ieșit până la 1,45 la (b) și 1,58 la (c) (§4.1, §6).
- Finisarea e limitată de calcul, deci transferul nu costă nimic măsurabil.
- La s4 se plătește copierea mutărilor la 16 workeri (+64 ms). Se evită dacă traseul stă în workeri [dedus].
- **Toate variantele ies identic, bit cu bit** [măsurat]:
  - între ele și față de calculul pe un fir;
  - amprenta jobului s4 e `b00917a30715ff44`, cea măsurată de s4.
- **Oracolele pe hârtie trec**: eroare 2,3·10⁻⁹ la blur și 2,4·10⁻⁷ mm la finisare. **Controalele negative pică**
  (halo cu un rând mai mic), cum trebuie: la finisare apare o **scobitură de 2,545 mm**, exact valoarea pe hârtie.

**2. COOP + COEP strică login-ul Google; DIP nu strică nimic din ce folosim** [măsurat, Edge 154, emulatorul Auth]:

| | fără antete | COOP + COEP require-corp | COOP + COEP credentialless | DIP require-corp | DIP credentialless |
|---|---|---|---|---|---|
| `crossOriginIsolated` (SAB) | nu | da | da | da | da |
| `signInWithPopup` (Google) | da | **NU** | **NU** | da | da |
| `signInWithRedirect` | da | **NU** | **NU** | da | da |
| Stripe Checkout dus-întors | da | da | da | da | da |
| reCAPTCHA Enterprise (scriptul) | da | da | da | da | da |
| Google Fonts | da | da | da | da | da |
| iframe străin fără antete | da | **NU** | **NU** | da | da |
| Stripe.js încărcat fără `crossorigin` | da | **NU** | da* | **NU** | da |

\* scriptul se încarcă, dar iframe-ul lui ascuns (`m-outer`) e blocat.

- DIP există în Edge 154: pagina e izolată, SAB merge în pagină și în workeri [măsurat]. E livrat în Chrome 137,
  doar pe desktop [citit].
- Login-ul cu e-mail și parolă, SDK-ul Firebase și navigarea la Stripe merg sub orice antete [măsurat].

## 3. Afirmațiile și verdictele

| # | Afirmația (sursa) | Verdict | Tip | Dovada |
|---|---|---|---|---|
| 1 | Alternativa fără SAB e transferul de dale/benzi între workeri (s5 §5.6, „neprobat”) | **CONFIRMAT** | — | Bit cu bit identic; cost × 1,10–1,23 la blur în rulările complete (până la × 1,45 cu vârfuri), × 0,97–1,02 la finisare (§4.1, §4.2) [măsurat] |
| 2 | SAB cere antetele COOP/COEP (s5 §3, §5.6; s4 §5.6) | **INFIRMAT** | domeniu | Adevărat doar fără DIP. În Edge 154, `Document-Isolation-Policy` singur dă `crossOriginIsolated = true` și SAB în workeri (§4.4) [măsurat] |
| 3 | Izolarea afectează popup-ul de login Firebase (s5 §5.6) | **CONFIRMAT** | — | Sub COOP+COEP: `auth/popup-closed-by-user` după 10,2 s; fereastra emulatorului arată „No matching frame”. Sub DIP: merge (§4.5) [măsurat] |
| 4 | COOP/COEP „se bat cap în cap cu ferestrele de login și de plată” (s4 §5.6) | **INFIRMAT** | domeniu | Login: da, și popup, și redirect. Plata prin Stripe Checkout (navigare de nivel înalt) merge sub toate antetele, cu revenirea, `sessionStorage` și SAB intacte (§4.5) [măsurat] |
| 5 | Izolarea afectează iframe-urile Stripe (s5 §5.6) | **CONFIRMAT** | — | Sub COEP, iframe-ul `m-outer` al Stripe.js e blocat; fără `crossorigin`, chiar scriptul e blocat sub `require-corp` (§4.5) [măsurat]. Checkout-ul prin redirect nu folosește iframe-uri |
| 6 | Mutările trimise fiecărui worker „doar pentru banda lui, ca tablouri transferate” e calea bună fără SAB (s4 §5.6) | **NEDECIS** | — | Corect (aceeași amprentă), dar costă × 1,24–1,52 față de SAB, iar față de copierea integrală (× 1,16–1,31) ordinea s-a inversat într-una din 3 rulări (§4.3) [măsurat]. Calea ieftină pare traseul trimis o dată și ținut în workeri [dedus, nemăsurat] |
| 7 | COEP `credentialless` rezolvă problemele lui `require-corp` | **INFIRMAT** | domeniu | Rezolvă doar resursele simple (scripturi, fonturi). Login-ul (popup și redirect) și iframe-urile străine pică la fel (§4.5) [măsurat] |
| 8 | Cifrele s5 cu SAB: blur 83 ms și finisare 2,2 s pe 16 workeri (s5 §4.5) | **CONFIRMAT** | — | Aici 90 ms și 2,35 s, pe o mașină încărcată (§4.1, §4.2) [măsurat] |
| 9 | Fereastra reCAPTCHA (iframe-ul widgetului) se încarcă sub COEP | **NEDECIS** | — | Fără cheie nu se randează widgetul, deci n-am avut ce observa. Sub DIP, iframe-urile străine merg (§4.5) [măsurat pe iframe local și pe iframe-ul emulatorului] |

## 4. Cazurile noi și măsurătorile

### 4.1 Blur gaussian pe 4000 × 4000, cu și fără SAB

**Ce rulează** (`cod/web/bench.js`, `cod/web/bw.js`), pe 16 workeri, în aceeași pagină izolată:
- **(a) SAB:** exact ca s5: trecerea orizontală pe rânduri, o barieră, apoi trecerea verticală. Relieful stă deja în
  memoria comună, deci copierea lui nu intră în timp.
- **(b) Transfer:** firul principal taie fiecare bandă + 12 rânduri de halo (`slice`, o copie) și o transferă. Workerul
  face ambele treceri și transferă înapoi banda rezultată. Firul principal asamblează rezultatul.
- **(c) Bandă ținută în worker:** fiecare worker își ține banda permanent. La o operație se cer doar marginile
  (12 rânduri) și se dau vecinilor. Rezultatul rămâne în worker.

**Timpii** (mediana a 9 repetiții, alternate a/b/c, în ms) [măsurat]:

| Rularea (antetele paginii) | (a) SAB | (b) transfer | (c) bandă proprie | b / a |
|---|---:|---:|---:|---:|
| COOP + COEP require-corp | 90,1 | 98,9 | 101,7 | 1,10 |
| COOP + COEP credentialless | 92,9 | 110,9 | 110,9 | 1,19 |
| DIP require-corp | 97,6 | 119,8 | 118,1 | 1,23 |
| DIP credentialless | 93,5 | 110,3 | 109,5 | 1,18 |
| fără antete (fără SAB) | — | 116,7 | 116,7 | — |
| `masoara`, rularea 1 (COOP + COEP, 7 repetiții) | 87,5 | 127,1 | 102,1 | 1,45 |
| `masoara`, rularea 2 (COOP + COEP, 5 repetiții) | 90,4 | 104,4 | 142,9 | 1,15 |

- În (b), copierea benzilor pe firul principal costă **8–13 ms**, iar asamblarea ~8 ms. Restul e calculul în plus pe
  halo (+10 % rânduri la trecerea orizontală).
- **Vârfurile lovesc mai ales variantele fără SAB.** În rulările scurte, (b) și (c) au avut repetiții izolate de
  345–517 ms, față de ~100 ms de obicei. Erau 2 la (b) și 3 la (c), din 12. La (a), cel mai mare vârf a fost de 144 ms.
  - Cu 5–7 repetiții, două vârfuri mută mediana. De aceea cifra de bază rămâne rularea completă, cu 9 repetiții și fără
    vârfuri.
  - Cauza nu e stabilită: ori încărcarea de la ceilalți agenți, ori alocările de 64 MB pe operație ale lui (b) și (c),
    adică memorie nouă și colectarea ei [dedus]. Pentru produs: buferele benzilor se refolosesc dintr-un bazin, nu se
    alocă la fiecare operație.
- Pe un fir, același blur durează 856 ms.

**Oracolul pe hârtie, fără cod comun cu workerii:**
- 240 de impulsuri unitare puse exact la marginile benzilor (−13 … +12 rânduri), pe fond 0.
- Răspunsul așteptat e `g(dx)·g(dy)`, cu `g(d) = exp(−d²/32) / S`. Scris separat, în float64.
- Valorile pe hârtie:
  - S = Σ exp(−d²/32), pentru |d| ≤ 12 ≈ σ√(2π) minus cozile = 10,0265 − 0,0174 ≈ **10,0091**. Măsurat:
    10,00917;
  - vârful unui impuls izolat = 1/S² ≈ **0,009982**;
  - suma ieșirii = numărul de impulsuri = **240**. Măsurat: 240,0000012.
- Rezultatul: eroare maximă **2,3·10⁻⁹** (toleranța 10⁻⁷) la (a), (b) și (c).

**Controlul negativ:** (b) și (c) cu halo de 11 rânduri în loc de 12. Ambele **pică**:
- 750 de puncte peste toleranță;
- eroarea maximă 1,109·10⁻⁴, adică termenul lipsă, g(12)·g(0), pe hârtie 0,00111 × 0,0998 = 1,108·10⁻⁴.

**Bit cu bit:** (a), (b) și (c) au **0 celule diferite** față de calculul pe un fir (codul s5) [măsurat].

### 4.2 Finisarea drop-cutter (s5, varianta C), cu și fără SAB

**Ce rulează:** bilă R3, celula 0,1 mm, pas de 6 celule: 667 de linii × 4000 = 2,67 M puncte CL, cu 3 071 de
deplasamente pe punct.
- Aceeași buclă în toate variantele, ca să se măsoare doar drumul datelor.
- Prima mea versiune avea un test de margine în plus în varianta cu transfer, care costa singur ~16 %. L-am scos. E un
  exemplu bun de cum se poate „măsura” un cost care nu ține de SAB.
- Variantele (a) și (b, c) rulează pe grupuri de workeri separate, ca JIT-ul să nu le amestece.
- Halo-ul e de 30 de rânduri: cel mai mare |dj| din discul frezei.

**Timpii** (mediana a 7 repetiții, pagina COOP + COEP) [măsurat]:
- (a) SAB: **2 349 ms**;
- (b) transfer: **2 288 ms** (× 0,97), din care copierea benzilor 10 ms;
- (c) bandă proprie: **2 265 ms** (× 0,96).

Fără antete, (b) și (c) au dat 2 550 / 2 537 ms, în altă rulare.

**Oracolul pe hârtie:**
- 370 de vârfuri de 5 mm pe teren 0, fiecare în coloana lui, puse la ±1 și ±29…31 de rânduri de prima și ultima linie a
  fiecărui worker, în ambele împărțiri.
- CL-ul pe hârtie: `max(0, 5 − (R − √(R² − d²)))`, cu d măsurat de la capsula segmentului la celulă. Scris separat de
  `hf.mjs` și `geom.mjs`.
- Rezultatul: eroare maximă **2,4·10⁻⁷ mm** la (a), (b) și (c). Asta e rotunjirea float32 la 5 mm: ulp(5)/2 = 2,4·10⁻⁷.

**Controlul negativ** (halo de 29 de rânduri): **pică**.
- (b): 520 de puncte, (c): 130 de puncte.
- Scobitura e de **2,545 mm**. Pe hârtie: 5 − (3 − √(9 − 2,95²)) = 2,5454 mm, adică exact contribuția vârfului de la 30
  de rânduri, pierdută.
- O primă versiune a controlului **nu** picase: puneam vârfurile de la 29, 30 și 31 de rânduri în aceeași coloană, iar
  maximul vârfului mai apropiat îl masca pe cel lipsă. Reparat prin câte o coloană pe vârf.

**Bit cu bit:** (a) față de (b) și (c) față de (b): **0 diferențe** din 2,67 M. Pe 3 linii, față de `dropRow` din s5,
tot 0 [măsurat].

### 4.3 Jobul s4: simularea 2D la 0,1 mm

Ce rulează: jobul 2D al s4 (194 208 mutări, placa 2440 × 1220), cu rânduri de dale intercalate pe 16 workeri. Dalele
(27 519) se întorc transferate în toate variantele. Diferă doar felul în care workerii primesc mutările (14 MB).

| Varianta | Mediana (7 repetiții) | Față de SAB |
|---|---:|---:|
| (a) mutările în SAB, văzute de toți | 415 ms | 1 |
| (b) mutările copiate la fiecare worker (clonare structurată) | 479 ms | 1,16 |
| (b2) mutările filtrate pe firul principal după rândurile fiecărui worker, apoi transferate | 611 ms | 1,47 |

- În (b2), filtrarea mea costă **237 ms** pe firul principal, mai mult decât copierea integrală.
- **Zgomotul schimbă ordinea dintre (b) și (b2).** Rulările scurte din `masoara` (5 repetiții):
  - rularea 1: (a) 411 ms, (b) 540 ms (× 1,31), (b2) 508 ms (× 1,24), filtrarea 124 ms, deci ordinea inversă;
  - rularea 2: (a) 370 ms, (b) 482 ms (× 1,30), (b2) 562 ms (× 1,52), filtrarea 142 ms.
- Ce rămâne stabil: ambele căi fără SAB costă **+60 … +190 ms pe rulare** față de SAB, fiindcă pregătesc și mută mutările (14 MB)
  la fiecare rulare [măsurat].
- **Amprentele:** toate trei dau `b00917a30715ff44`, exact amprenta măsurată de s4 (Node, 1 / 4 / 8 / 16 fire, și Edge).
  [măsurat]
- **Controlul negativ:** filtrul care ignoră raza frezei dă `f87f1d888447afbe`, deci pică [măsurat].

### 4.4 Izolarea, pe fiecare set de antete

Pagina de banc (`bench.html`), sub fiecare set de antete [măsurat]:

| Antetele | `crossOriginIsolated` în pagină | în worker | SAB prin `postMessage` |
|---|---|---|---|
| fără | nu | nu | — (`SharedArrayBuffer` nedefinit) |
| COOP same-origin + COEP require-corp | da | da | da |
| COOP same-origin + COEP credentialless | da | da | da |
| DIP isolate-and-require-corp | da | da | da |
| DIP isolate-and-credentialless | da | da | da |
| **control:** COOP same-origin-allow-popups + COEP require-corp | **nu** | nu | — |

Controlul confirmă că bancul vede diferența: varianta COOP care păstrează popup-urile nu dă izolare.

### 4.5 Compatibilitatea: login, App Check, Stripe, fonturi

**Metoda** (`cod/run-compat.mjs`, `cod/web/compat.js`):
- Serverul sondei rulează pe 5187. Antetele se aleg din cale (`/m/<mod>/…`) și se pun pe toate răspunsurile.
- Emulatorul Firebase Auth rulează pe proiectul `demo-s11izolare`, pe portul 19987. Fără cloud și fără chei.
- Playwright apasă butoanele din widgetul emulatorului: „Add new account”, „Auto-generate”, „Sign in”.
- Cele 5 moduri rulează în paralel, fiecare în contextul lui.
- Cererile eșuate se înregistrează cu motivul dat de browser.

**Rezultatul** [măsurat, 07.10.2026]:

| Testul | fără | COEP rc | COEP cl | DIP rc | DIP cl |
|---|---|---|---|---|---|
| SDK Firebase din pachet, de pe aceeași origine | da | da | da | da | da |
| SDK Firebase din CDN gstatic | da | da | da | da | da |
| Auth e-mail + parolă (emulator) | da | da | da | da | da |
| `signInWithPopup` (Google, emulator) | da, 2,2 s | **NU**, popup-closed-by-user, 10,2 s | **NU**, idem | da, 2,9 s | da, 1,3 s |
| `signInWithRedirect` + `getRedirectResult` | da | **NU**, agățat > 30 s | **NU** | da | da |
| scriptul gapi (`apis.google.com/js/api.js`), cerut de Auth | da | da | da | da | da |
| reCAPTCHA Enterprise: scriptul + `ready()` | da | da | da | da | da |
| Google Fonts, fără / cu `crossorigin` | da / da | da / da | da / da | da / da | da / da |
| Stripe.js fără / cu `crossorigin` | da / da | **NU** / da | da / da | **NU** / da | da / da |
| iframe de altă origine, fără antete | da | **NU** | **NU** | da | da |
| iframe de aceeași origine, fără antete | da | **NU** | **NU** | da | da |
| iframe de altă origine, cu CORP + COEP | da | da | da | da | da |
| popup simplu de altă origine: mesaj spre pagină | da | **NU**, `closed = true` după 2,5 s | **NU** | da | da |
| Stripe Checkout: plecare, revenire din pagina Stripe, `sessionStorage`, SAB | da | da | da | da | da |
| Stripe Checkout: plecare și „Înapoi” | da | da | da | da | da |

`checkout.stripe.com` fără sesiune redirecționează la `stripe.com/…/payments/checkout`. Pentru întrebare contează doar
navigarea și revenirea.

**De ce pică login-ul sub COOP + COEP:**
- **Popup:** COOP `same-origin` pune fereastra de altă origine în alt grup de navigare și rupe legătura cu ea. SDK-ul vede
  `popup.closed === true` și, după 8 s, raportează `auth/popup-closed-by-user`.
  - Măsurat: 10,2 s în total.
  - Citit: `pollUserCancellation` în `packages/auth/src/platform_browser/strategies/popup.ts`
    ([sursa](https://github.com/firebase/firebase-js-sdk/blob/main/packages/auth/src/platform_browser/strategies/popup.ts));
    în pachetul npm `firebase` 12.19.0, `@firebase/auth/dist/esm/index-*.js`.
  - În fereastră, widgetul caută `window.opener.frames` și scrie „No matching frame”, fiindcă `opener` e `null`
    ([`widget_ui`](https://github.com/firebase/firebase-tools/blob/main/src/emulator/auth/widget_ui.ts)) [citit].
- **Redirect:** la întoarcere, SDK-ul deschide un iframe ascuns de pe domeniul de autentificare (`__/auth/iframe`, la
  emulator `emulator/auth/iframe`)
  ([iframe.ts](https://github.com/firebase/firebase-js-sdk/blob/main/packages/auth/src/platform_browser/iframe/iframe.ts)).
  - Sub COEP, iframe-ul fără antetul COEP e blocat: `net::ERR_BLOCKED_BY_RESPONSE`, de două ori în jurnal [măsurat].
  - `getRedirectResult` nu se mai întoarce în 30 s [măsurat].
- **De ce merge sub DIP:** DIP nu cere nimic popup-urilor și iframe-urilor
  ([Chrome, 01.05.2025](https://developer.chrome.com/blog/document-isolation-policy)) [citit]. Măsurat: popup-ul,
  iframe-ul emulatorului, iframe-ul străin fără antete și redirectul merg.

**Ce blochează DIP `isolate-and-require-corp`:** doar resursele străine încărcate fără CORS și fără CORP. Aici a fost
doar Stripe.js fără `crossorigin`:
- motivul din jurnal: `net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByDip` [măsurat];
- cu `crossorigin="anonymous"` sau sub `isolate-and-credentialless`, merge.

**Antetele serverelor străine** (curl, 07.10.2026) [măsurat]:

| Resursa | CORP | CORS (`Access-Control-Allow-Origin`) |
|---|---|---|
| `apis.google.com/js/api.js` (gapi, cerut de Auth) | `cross-origin` | `*` |
| `www.google.com/recaptcha/enterprise.js` (cerut de App Check) | `cross-origin` | originea cererii |
| `www.gstatic.com/firebasejs/12.19.0/firebase-app.js` | `cross-origin` | `*` |
| `fonts.googleapis.com/css2` | `cross-origin` | `*` |
| `js.stripe.com/v3/` | **lipsă** | `*` |

De aceea scripturile Google trec chiar și sub `require-corp`, iar Stripe.js trece doar cu `crossorigin`.

**reCAPTCHA Enterprise / App Check:**
- Providerul App Check încarcă `https://www.google.com/recaptcha/enterprise.js?render=explicit`, fără `crossorigin`.
  Apoi randează un widget invizibil cu `grecaptcha.render(container, { sitekey, size: 'invisible' })`, adică un iframe
  ([recaptcha.ts](https://github.com/firebase/firebase-js-sdk/blob/main/packages/app-check/src/recaptcha.ts)) [citit].
- Scriptul se încarcă și `grecaptcha.enterprise.ready()` răspunde sub toate antetele [măsurat].
- Fără cheie nu se randează niciun iframe (0 iframe-uri), deci iframe-ul widgetului **n-a putut fi observat**. Sarcina
  interzicea cheile.
- Sub DIP, orice iframe străin merge [măsurat local]. Sub COEP, iframe-ul ar merge doar dacă Google trimite COEP + CORP
  pe pagina widgetului. Nu e verificat, iar documentația App Check nu spune nimic [citit, căutare fără rezultat].

### 4.6 Ce spun sursele (cu date)

- **Document-Isolation-Policy** [citit]:
  - livrat în **Chrome 137, doar pe desktop**; Android „mai târziu în acest an” (2025); pe Android WebView nu se poate
    ([blogul Chrome, 01.05.2025](https://developer.chrome.com/blog/document-isolation-policy);
    [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/p52-T7m3rOM));
  - „doesn't impose restrictions on pages with which the document can communicate or on child frames it can embed”;
  - **în Edge 154 funcționează** [măsurat §4.4];
  - starea pe Android azi n-am găsit-o într-o sursă oficială. Firefox și Safari nu-l au, după cât am găsit.
- **COEP `credentialless`** [citit]:
  - disponibil din **Chrome 96**, desktop și Android
    ([blogul Chrome, actualizat în mai 2022](https://developer.chrome.com/blog/coep-credentialless-origin-trial));
  - iframe-urile străine cer în continuare aceleași condiții ca la `require-corp`. Ce măsurasem se potrivește.
  - Atributul `<iframe credentialless>` (Chrome 110) ar lăsa un iframe străin sub COEP, dar cu stocare efemeră
    ([blog](https://developer.chrome.com/blog/iframe-credentialless)). Nu l-am probat. SDK-ul Auth își creează singur
    iframe-ul și are nevoie de stocarea lui [dedus].
- **COOP și popup-urile de autentificare și plată** [citit]:
  - problema e descrisă de explicația Chromium
    [„coi-with-popups”](https://github.com/hemeryar/coi-with-popups): „the opener is immediately cut”;
  - încercarea de reparație era `COOP: restrict-properties`, ajunsă doar la experiment
    ([WICG](https://github.com/WICG/coop-restrict-properties)). DIP e drumul livrat.
- **Firebase Auth** [citit]:
  - pagina oficială despre redirect ([actualizată 06.10.2026](https://firebase.google.com/docs/auth/web/redirect-best-practices))
    tratează doar stocarea terță partiționată;
  - **nu pomenește COOP, COEP sau izolarea**;
  - nu am găsit o poziție oficială Firebase despre izolare. Comportamentul vine din sursa SDK-ului (§4.5) și din
    măsurători.

## 5. Ce schimbă în arhitectură

1. **Fără izolare cross-origin în v1.**
   - Hosting-ul nu trimite COOP `same-origin`, COEP sau DIP.
   - Login-ul Google (popup și redirect), App Check, Stripe și fonturile merg fără nicio grijă [măsurat].
2. **Datele spre workeri se transferă, nu se partajează.** Trei reguli:
   - **Datele grele stau în workeri** (varianta c): straturile de relief și câmpul simulării sunt dale deținute de un
     worker. La o operație se schimbă doar halo-urile. Costul măsurat: × 1,13–1,21 la blur în rulările complete (cu
     vârfuri în cele scurte, §4.1) și × 0,96–0,99 la finisare.
   - **Firul principal nu e proprietarul datelor grele.** El cere rezultate (dale pentru afișare, statistici) și le
     primește transferate. Afișarea primește dalele direct pe GPU (s5).
   - **Traseul (mutările) se trimite o dată pe traseu** și rămâne în workeri. Filtrarea pe firul principal la fiecare
     simulare (× 1,47) și copierea la fiecare rulare (× 1,16) sunt de evitat [măsurat §4.3; dedus pentru cache].
3. **Nucleele se scriu peste „o bandă cu decalaj”** `(buffer, gj0, rows)`, nu peste un tablou global.
   - Exact asta face `bw.js`: aceeași buclă rulează pe bandă transferată și pe SAB (cu `gj0 = 0`, `rows = ny`).
   - Trecerea ulterioară la SAB nu cere rescrierea nucleelor [măsurat: aceeași buclă, bit cu bit].
4. **Halo-ul e o constantă calculată din nucleu**, nu un număr scris de mână: raza kernelului la blur, cel mai mare |dj|
   la freză. Testul automat pune vârfuri exact la marginea benzii și cere valoarea pe hârtie.
   - Fără test, halo-ul greșit dă o scobitură de 2,5 mm care trece nevăzută prin orice test pe teren neted [măsurat].
5. **WebGPU nu depinde de izolare.** Acceleratorul recomandat de s5 rămâne valabil.
6. **Ce pierdem fără izolare** [citit / dedus]:
   - `performance.measureUserAgentSpecificMemory()`, folosit de s5 la memorie, cere izolare
     ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measureUserAgentSpecificMemory));
   - ceasul `performance.now()` e mai grosier.
   - Ambele contează doar pentru diagnoză și bancuri, nu pentru produs.
7. **Dacă SAB devine necesar mai târziu**, se schimbă doar:
   - antetul: `Document-Isolation-Policy: isolate-and-credentialless`, numai pe documentul aplicației, nu pe
     `/__/auth/*`;
   - o ramură în pool-ul de workeri: dacă `crossOriginIsolated`, bandă = vedere pe SAB; altfel, transfer;
   - motive posibile: WebAssembly cu fire (o bibliotecă C++ compilată cu pthreads), sculptură interactivă pe dale
     partajate.

   **Nu COOP + COEP**, care strică login-ul Google [măsurat]. Înainte de activare:
   - probă pe `cncvectorstudio-test` cu login Google real, App Check real (cheie reCAPTCHA Enterprise) și o sesiune
     Stripe de test;
   - pe Android și pe alte browsere DIP lipsește, deci ramura cu transfer rămâne obligatorie.

## 6. Riscuri și ce a rămas neprobat

- **Login Google real, App Check real și o sesiune Stripe reală nu sunt probate.** Sarcina interzicea cheile și
  conturile.
  - Emulatorul folosește același mecanism din SDK (popup cu `opener`, iframe ascuns), dar pagina reală Google e alta.
  - Pentru v1 fără izolare nu contează. Contează doar dacă se activează DIP mai târziu (§5.7).
- **Iframe-ul widgetului reCAPTCHA sub COEP:** neobservat, fiindcă e nevoie de cheie (verdictul 9 e NEDECIS).
- **DIP pe Android și în alte browsere:** neprobat. Nu e o problemă pentru recomandarea „fără izolare”.
- **Doar Edge.** Chromium-ul Playwright nu pornește pe mașină. Edge 154 e același motor.
- **Mașina era încărcată.** Rapoartele b/a la blur au variat între 1,10 și 1,23 de la o rulare la alta. Comparațiile
  sunt făcute în aceeași pagină, cu variantele alternate.
- **Efectul V8 al transferului:** după primul `ArrayBuffer` transferat, V8 poate adăuga verificări de „buffer detașat”
  în buclele pe tablouri tipizate [dedus, necitit]. L-am ocolit cu grupuri de workeri separate. Cifrele includ efectul,
  dacă există, doar pentru varianta cu transfer.
- **Vârfuri de 345–517 ms în variantele fără SAB**, în rulările scurte (§4.1). Cauza nu e stabilită: încărcarea mașinii
  sau alocările pe operație. De verificat în produs, cu bazin de bufere, pe o mașină liberă.
- **Lanțuri de operații:** dacă fiecare operație face drumul prin firul principal (varianta b), costul se adună. Varianta
  cu date ținute în workeri (c) îl evită, dar cere ca UI-ul să ceară datele asincron.
- **Memoria:** varianta (b) ține temporar o copie în plus a benzilor, +64 MB pe operație la 4000². Varianta (c) nu.
- **Filtrarea mutărilor** e implementarea mea, naivă. O filtrare mai bună ar putea schimba §4.3, dar nu concluzia
  (traseul ținut în workeri).

## 7. Cum se reproduce

```
cwd:     C:/Users/besli/AppData/Local/Temp/claude/C--Users-besli-Desktop-MyWork-Apps/50bc5be4-b484-49e8-970f-991b3583b938/scratchpad/sonde/s11-izolare
comanda: node masoara.mjs
```

**Ce face comanda:**
1. Edge cu fereastră, pagina COOP + COEP: blur, finisare și jobul s4 în variantele a / b / c, cu oracolele și
   controalele negative (5 repetiții);
2. matricea de compatibilitate pe 5 seturi de antete, cu emulatorul Auth pornit și oprit de script.

**Rezultatul:**
- tipărește la final un rezumat cu rapoartele, numărul de diferențe bit cu bit, OK / PICĂ pe oracole și controale, și
  tabelul de compatibilitate;
- închide singură browserul, serverul (5187) și emulatorul (19987, plus 19988 și 19989 rezervate în `firebase.json`).

**Durata:** **136 s și 138 s**, în două rulări pe 07.10, cu ceilalți agenți activi. Prima rulare a avut 7 repetiții la blur în loc de 5, din cauza unui bug de citire a argumentelor, reparat înainte de a doua.

**Din copia din repo:**
1. copiezi `cod/` în afara Drive-ului;
2. rulezi `npm ci`;
3. rulezi `node node_modules/esbuild/bin/esbuild web/fb-entry.js --bundle --format=esm --minify --outfile=web/fb.bundle.js`
   (pachetul Firebase nu e în repo, fiind ieșire de build);
4. rulezi `node masoara.mjs`.

**Rulări complete, mai lungi:**
- `node run-bench.mjs --moduri=coep-rc,none,dip-rc,dip-cl,coep-cl,coopap-rc` (9 / 7 / 7 repetiții, ~4 min). Cifrele din
  §4.1–§4.4 vin de aici, din `cod/rezultate/complet/`;
- `node run-compat.mjs` (~1,5 min).

**Pachetele:**
- `playwright-core` 1.63.0 (Apache-2.0), `firebase` 12.19.0 (Apache-2.0), `firebase-tools` 15.32.1 (MIT), `esbuild`
  0.28.2 (MIT);
- toate doar pentru banc. Niciunul nu intră în aplicație din cauza acestei sonde.
