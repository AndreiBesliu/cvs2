# Sonda s7: datele documentului, stocarea locală și pornirea offline

Faza 2, tranșa 1. Cod aruncabil, scris doar ca dovadă pentru deciziile de arhitectură. Codul sondei e în `cod/`.

**Legendă:** [măsurat] = am rulat; [citit] = documentație sau sursă, cu legătură; [dedus] = inferență.

**Mediul:** Ryzen 9 7950X, Windows 11, Node 26.10, Microsoft Edge 154 (motor Chromium), fără ecran (headless).
În paralel rulau alți 9 agenți, deci timpii absoluți sunt umflați și zgomotoși. Comparațiile din aceeași rulare
sunt sigure; valorile absolute sunt o limită de sus. Nicio cifră din sondă nu depinde de placa video, deci n-am
avut nevoie de browser cu ecran și nici de numele renderer-ului WebGL.

---

## 1. Întrebarea

Ce alegem pentru patru lucruri din fundație (`LECTII.md` §4.2, `BRIEF.md` §3):

1. **Schema.** O singură declarație trebuie să dea tipul TypeScript și validatorul cu limite numerice. Trebuie să
   păstreze câmpurile necunoscute și să dea erori cu cale și cod, din care facem mesaje în en și ro.
2. **Stocarea în browser.** Unde țin un relief de 64 MiB și un STL de 100 MiB: OPFS sau IndexedDB? Cum salvez
   astfel încât o cădere la mijlocul salvării să lase intactă versiunea veche? Cum arată fișierul de proiect?
3. **Undo-ul.** Cât costă în memorie un jurnal de comenzi față de copiile complete, pe un document de 50 000 de
   noduri?
4. **PWA-ul.** Pornește aplicația fără rețea și se actualizează curat, fără un amestec de versiune veche și nouă?

Termeni folosiți:
- **OPFS** (Origin Private File System): un sistem de fișiere privat al site-ului, în browser.
- **IndexedDB**: baza de date a browserului, cu tranzacții.
- **Service worker (SW)**: un script care interceptează cererile paginii și le poate servi din cache, deci și
  fără rețea.
- **CSP** (Content Security Policy): antetul care spune ce cod are voie să ruleze pagina. Fără `'unsafe-eval'`,
  pagina nu poate transforma text în cod (`new Function`, `eval`).
- **JIT** (aici): biblioteca își generează codul de validare ca text și îl compilează cu `new Function`.

## 2. Pe scurt

- **Schema: valibot** (MIT). Pe documentul de 50 000 de noduri (55 MB de JSON) a prins toate cele 10 defecte
  injectate, la calea exactă, și pe toate odată. A păstrat câmpurile necunoscute. Validează în ~0,3 s în Edge și
  **nu are nevoie de `eval`**: sub CSP strict merge la fel de repede (311 → 318 ms). Bundle-ul cu schema reală are
  **3,3 KB gzip**, față de 29–47 KB la celelalte. **Zod v4** e rezerva. TypeBox și arktype sunt de 8–10× mai rapide
  cu `eval`, dar fără el TypeBox devine de 59× mai lent (1,96 s), iar arktype pierde calea exactă la 5 din 10
  defecte. [măsurat]
- **Stocarea: resursele mari în OPFS, scrise dintr-un worker** (100 MiB în 130 ms, citiți în 69 ms), **și
  documentul, pointerul și jurnalul într-o singură bază IndexedDB.** Resursele se scriu o singură dată, sub
  numele hash-ului, prin fișier temporar; nu se suprascriu niciodată pe loc. La o cădere simulată (procesul
  omorât la 1/3 din salvare), suprascrierea pe loc a stricat fișierul (21 MiB noi peste 43 MiB vechi). Celelalte
  trei metode au lăsat versiunea veche intactă, verificat cu hash calculat independent. [măsurat]
- **Fișierul de proiect: un zip determinist** (fflate, MIT): manifest + document JSON canonic + resursele după
  SHA-256. Dus-întors, octet cu octet identic, în orice fus orar; citit corect de un program independent (Python).
  [măsurat]
- **Undo: jurnal de comenzi care ține valorile vechi.** O comandă mică ocupă ~190 de octeți. O copie completă
  ocupă 96 MB și durează 0,6 s, deci 200 de pași ar cere 18,7 GB. Undo-ul trebuie să RESTAUREZE valoarea, nu să
  aplice operația inversă: o rotire cu 30° și înapoi schimbă 52 % din puncte. [măsurat]
- **PWA: Vite + vite-plugin-pwa (Workbox), cu actualizare „oferită”.** Pornește fără rețea, inclusiv cu serverul
  oprit de tot. O versiune nouă nu intră până nu o accepți. După accept, toate fișierele sunt noi, iar cache-ul nu
  mai are nimic din versiunea veche. Martorul fără SW pică, deci proba nu e oarbă. [măsurat]

## 3. Candidații

### 3.1 Schema

| Bibliotecă | Licență | Ce face | Ce am măsurat (50 000 de noduri) | Verdict |
|---|---|---|---|---|
| **valibot 1.5.0** | MIT | scheme compuse din funcții mici; fără generare de cod | Node 409 ms; Edge 311 ms, sub CSP 318 ms; 10/10 căi exacte, 10/10 toate odată; 3,3 KB gzip | **ales** |
| zod 4.6.5 | MIT | scheme cu metode; JIT cu `new Function`, cade singur pe varianta fără JIT | Node 406 ms; Edge 282 ms, sub CSP 479 ms (1,7×); 10/10, 10/10; 29,1 KB gzip; are localizare `ro` | rezervă |
| typebox 1.3.36 | MIT | JSON Schema + compilator JIT | Node 78 ms; Edge 33 ms, sub CSP **1 959 ms (59×)**; 10/10 singure, **1/10 toate odată**; 41,8 KB gzip | respins |
| arktype 2.2.7 | MIT | tipuri scrise ca text, JIT | Node 141 ms; Edge 38 ms, sub CSP 288 ms; sub CSP **5/10 căi exacte**; 47,1 KB gzip | respins |
| effect 4.0.1 (Schema) | MIT | instalat | nemăsurat (timp) | neprobat |

### 3.2 Stocare, fișier, undo, PWA

| Candidat | Licență | Ce face | Ce am măsurat | Verdict |
|---|---|---|---|---|
| OPFS `createSyncAccessHandle` (worker) + `move()` | API web | scriere sincronă, direct în fișier; apoi redenumire | 100 MiB: scriere 130 ms, citire 69 ms; **strică fișierul la cădere** dacă suprascrie pe loc; `move()` redenumește în ~9 ms și înlocuiește ținta | **ales**, doar pentru fișiere noi, scrise o dată |
| OPFS `createWritable` | API web | scrie într-un fișier `.crswap`, îl mută peste original la `close()` | 100 MiB: scriere **2 177 ms** (46 MB/s); vechiul a rămas intact la cădere; `.crswap` de 21 MiB rămas vizibil | doar fișiere mici sau fișiere alese de om |
| IndexedDB, `Blob` | API web | tranzacții | 100 MiB: 218 / 84 ms; tranzacția omorâtă la mijloc: vechiul intact | **ales** pentru document, pointer, jurnal |
| IndexedDB, `ArrayBuffer` | API web | idem | 100 MiB: 328 / 132 ms | merge, mai lent decât Blob |
| fflate 0.8.3 | MIT | zip/unzip în JS | 167 MB împachetați în 0,6 s, despachetați în 0,4 s; octet cu octet identic | **ales** |
| immer 11.1.21 | MIT | stare imutabilă + patch-uri | 3,1 MB și 23–39 ms pe editare (copiază tot dicționarul de 50 000 de noduri) | respins pentru undo |
| jurnal de comenzi (scris de noi) | — | ține valorile vechi/noi ale câmpurilor atinse | ~190 o pe comandă; „mută tot” = 2,3 MB; restaurare exactă | **ales** |
| vite 8.3.3 + vite-plugin-pwa 2.0.0 (Workbox 7.4) | MIT | build + SW cu precache generat din build | toate cele 9 verificări trec; martorul pică | **ales** |

Unelte doar pentru probe (nu ajung în aplicație): playwright-core 1.63.0 (Apache-2.0), esbuild 0.28.2 (MIT),
typescript 7.0.2 (Apache-2.0), Python `zipfile`/`hashlib` (PSF). Licențele sunt citite din `package.json`-ul
pachetelor instalate. [măsurat]

## 4. Măsurători

### 4.1 Corpusul

Documentul e generat determinist (aceeași sămânță dă același document), după schița din
`docs/faza0/09` §4 A1 [citit]:
- un arbore unic: o rădăcină, 1 000 de grupuri, 47 000 de vectori, text, relief și instanțe de mesh;
- 2 000 de operații care referă vectori prin id, 20 de scule, 2 montaje, resurse adresate prin SHA-256;
- **50 000 de noduri, 55 MB de JSON, 90 MB în memorie** [măsurat];
- corpus care rupe coincidențele: unghiuri de 30–90°, arce, cubice, segmente de 0,01 mm, foaie de 2 440 mm,
  centre de arc deplasate cu 1e-9 mm.

### 4.2 Schema

**Metoda.** Aceeași schemă e scrisă în cele patru biblioteci (`cod/schemas/`): limite pe coordonate (±100 m),
dimensiuni, toleranță, diametru, întregi, formate de id și hash, uniuni discriminate (tipul nodului, tipul
segmentului) și obiecte care păstrează cheile necunoscute.

**Oracolul.**
- 10 defecte injectate, fiecare cu **calea așteptată scrisă din locul injecției**, nu dedusă din vreun validator:
  `1e400` (din `JSON.parse` iese `Infinity`), `NaN` în matricea de plasare, grosime 0, diametru negativ,
  toleranță 5 mm, tip de segment necunoscut, ordine 2,5, hash invalid, sensul arcului ca text, mărime negativă.
- Câmpurile necunoscute, puse pe 5 niveluri, se compară prin JSON canonic (chei sortate), cod fără legătură cu
  bibliotecile.
- Tipul: `tsc` verifică 20 de egalități de tip și 5 martori negativi (`@ts-expect-error`). Un mutant
  (`'Q'` adăugat la tipurile de segment) face `tsc` să pice cu 4 erori, deci verificarea nu e vidă. [măsurat]

**Rezultate** [măsurat]:

| | zod | valibot | typebox | arktype |
|---|---:|---:|---:|---:|
| Node, mediana a 7 validări (ms) | 406 | 409 | 78 | 141 |
| Edge, fără CSP (ms) | 282 | 311 | 33 | 38 |
| Edge, CSP fără `'unsafe-eval'` (ms) | 479 | 318 | 1 959 | 288 |
| defecte respinse / cale exactă, câte unul | 10 / 10 | 10 / 10 | 10 / 10 | 10 / 10 |
| cale exactă sub CSP | 10 | 10 | 10 | **5** |
| toate 10 defectele odată: căi găsite | 10 | 10 | **1** | 10 |
| câmpuri necunoscute păstrate | da | da | da | da |
| ordinea cheilor păstrată | nu | nu | da | da |
| întoarce o copie | da | da | nu (același obiect) | nu |
| bundle min / gzip (KB), cu schema reală | 100 / 29,1 | 10,7 / **3,3** | 164 / 41,8 | 154 / 47,1 |

Observații:
- **Codurile de eroare** sunt utilizabile pentru `t()` la toate patru: cale + cod + limită. Mesajele din raport
  (de exemplu „Grosimea plăcii: trebuie să fie cel puțin 0”) sunt făcute de noi din (cale, cod, limită), nu din
  textul bibliotecii. valibot dă cod separat pentru `Infinity` (`finite`); zod îl raportează ca „tip greșit”.
  [măsurat]
- **TypeBox**, la o uniune fără discriminator, raportează erorile tuturor variantelor (8 erori pentru un singur
  defect). Cu mai multe defecte, se oprește la primul subarbore greșit (8 erori, toate în primul nod). [măsurat]
- **Sub CSP**, zod și TypeBox detectează singure că `new Function` e interzis și trec pe varianta interpretată
  ([citit] `typebox/build/system/environment/evaluate.mjs`, `CanEvaluate`). arktype rămâne corect la respingere,
  dar raportează eroarea la nivelul nodului (`nodes.n12345`), nu la câmp. [măsurat]
- **Zgomot:** a doua rulare (`masoara`, mai multă încărcare) a dat în Node 504 / 530 / 82 / 163 ms și în Edge,
  sub CSP, 509 / 336 / 2 948 / 274 ms. Ordinea și concluziile rămân aceleași.

### 4.3 Stocarea în browser

**Metoda.** Edge 154, **profil persistent pe disc**. Un context incognito ține IndexedDB și OPFS în memorie și ar
fi dat cifre false [dedus]. Datele sunt generate determinist (xorshift, doar întregi). Mediana a 5 repetări.

**Oracolul.** Node calculează SHA-256 cu OpenSSL pe aceleași date; browserul calculează SHA-256 cu `crypto.subtle`
pe ce a citit înapoi. Toate cele 40 de citiri s-au potrivit. [măsurat]

| Metoda | relief 64 MiB scriere / citire (ms) | STL 100 MiB scriere / citire (ms) |
|---|---:|---:|
| OPFS `createSyncAccessHandle`, în worker | **100 / 50** | **130 / 69** |
| IndexedDB, `Blob` | 142 / 55 | 218 / 84 |
| IndexedDB, `ArrayBuffer` | 227 / 82 | 328 / 132 |
| OPFS `createWritable` | 1 347 / 76 | 2 177 / 119 |

- Hash-ul SHA-256 în browser: ~130 ms pentru 64 MiB, ~220 ms pentru 100 MiB. [măsurat]
- `navigator.storage.estimate()`: cotă 10,4 GB, 400 MB folosiți după test (jumătate OPFS, jumătate IndexedDB).
  [măsurat]
- `navigator.storage.persist()` a întors **false** pe un profil nou, iar `persisted()` tot false. Chromium acordă
  persistența după euristici: aplicație instalată, semn de carte, notificări, implicare
  ([citit] https://web.dev/articles/persistent-storage). Deci aplicația trebuie să trăiască și cu stocare care
  poate fi evacuată. [măsurat + citit]

### 4.4 Salvarea sigură la cădere

**Metoda.** Versiunea v1 (64 MiB) e salvată în patru feluri. Apoi v2 se scrie încet (1 MiB la 60 ms), iar
procesul principal al browserului e omorât cu `TerminateProcess` când scrierea ajunge la bucata 20. La repornire
citim tot și comparăm cu hash-urile din Node, pe întreg și pe fiecare MiB.

| Strategia | Starea după cădere | Bucăți v1 / v2 |
|---|---|---:|
| S1. OPFS sync, suprascriere pe loc (**martor**) | **stricat (amestec)** | 43 / 21 |
| S2. OPFS `createWritable` | v1 intact | 64 / 0 |
| S3. fișier nou `.tmp` + pointer în IndexedDB | v1 intact; pointerul arată v1 | 64 / 0 |
| S4. o tranzacție IndexedDB peste 64 de înregistrări | v1 intact | 64 / 0 |

- Martorul S1 arată că omorârea chiar cade la mijlocul scrierii: 21 de bucăți noi (0–20), cât prezice pragul.
  Fără el, „v1 intact” la celelalte n-ar dovedi nimic. [măsurat]
- **După repornire rămân gunoaie vizibile:** `writable.bin.crswap` (21 MiB, fișierul de lucru al lui
  `createWritable`) și `doc-….bin.tmp` (21 MiB). Ocupă cotă până le șterge cineva. [măsurat]
- Rezultatul s-a repetat identic în a doua rulare (`masoara`). [măsurat]
- Specificația spune că `createWritable` nu atinge fișierul până la `close()`
  ([citit] https://fs.spec.whatwg.org/#api-filesystemwritablefilestream). Proba confirmă, dar arată și costul:
  de ~15× mai lent decât scrierea sincronă.
- **Pasul care lipsea din S3, probat separat** (`p2-move.mjs`): `FileSystemFileHandle.move()` redenumește un
  `.tmp` de 16 MiB în ~9 ms, iar conținutul citit înapoi are hash-ul din Node. Mutat peste un nume care există,
  **îl înlocuiește** (conținutul nou, verificat prin hash). [măsurat] Dacă mutarea e atomică la o cădere n-am
  probat.

### 4.5 Fișierul de proiect

**Formatul probat:** zip cu
- `manifest.json`: format, versiunea containerului, `schema`, `minWriter`, hash-ul documentului, lista resurselor
  (hash, tip, nume, mărime);
- `document.json`: JSON canonic, cu chei sortate;
- `assets/<sha256>`: resursele, nestocate comprimat (oricum nu se comprimă).

Data din zip e fixată în câmpurile LOCALE (1 ianuarie 1980), deci nu depinde de fusul orar.

**Oracolul și rezultatele** [măsurat], pe 5 000 de noduri + relief 64 MiB + STL 100 MiB + un font TTF real:
- împachetat → despachetat → trecut prin validatorul valibot (care reordonează cheile) → reîmpachetat:
  **octet cu octet identic**;
- cititor independent (Python `zipfile` + `hashlib`, zero cod comun): CRC corect, hash-ul documentului și al
  fiecărei resurse corecte, numele resursei egal cu hash-ul ei;
- același proiect împachetat în trei fusuri orare (UTC, Tokyo, Los Angeles): același SHA-256. Martorul: ora
  locală a amiezii UTC a ieșit 12 / 21 / 4, deci fusul chiar s-a schimbat;
- zip de 167 MB: împachetare 0,6 s, despachetare 0,4 s (Node, sincron).

### 4.6 Undo-ul

**Metoda.** Node cu `--expose-gc`, memoria = heap + ArrayBuffer după GC, fiecare strategie în procesul ei.

| Strategia, document de 50 000 de noduri | Memorie pe pas | Timp pe editare |
|---|---:|---:|
| copie completă (`structuredClone`, ca în ediția întâi) | **95,8 MB** (200 de pași = 18,7 GB) | 613 ms |
| Immer, cu înghețare | 3,1 MB | 39 ms (prima: 250 ms) |
| Immer, fără înghețare | 3,0 MB | 23 ms |
| jurnal de comenzi (valori vechi + noi) | **~190 octeți** | sub 1 ms [dedus] |
| jurnal, „selectează tot și mută” (50 000 de noduri) | 2,3 MB | — |

Immer costă 3 MB pe pas fiindcă copiază tot dicționarul de 50 000 de noduri la fiecare editare.

**Exactitatea** [măsurat]:
- pe hârtie: `(0.1 + 0.2) - 0.2` dă `0.10000000000000003`, nu `0.1` (rotunjirea IEEE-754);
- „mută cu 0,1 și înapoi”: 12 din 49 999 de coordonate nu revin bit cu bit (0,02 %);
- „rotește cu 30° și înapoi”: **36 034 din 69 006 puncte (52 %)** nu revin bit cu bit (eroare maximă 4,5e-13 mm);
- jurnalul care restaurează valorile stocate: 0 diferențe.

Eroarea e mică fizic, dar un document care după undo nu e identic strică „nesalvat”, hash-urile și fișierele
de aur. [dedus]

### 4.7 PWA-ul offline

**Metoda.** Două build-uri reale (v1, v2) ale unei aplicații-jucărie. Fiecare are trei markeri de versiune: în
JS, în CSS și într-un JSON încărcat separat. Dacă markerii nu coincid, rulează un amestec de versiuni. Serverul e
pe portul 5177. Edge, profil persistent.

| Pasul | Rezultat [măsurat] |
|---|---|
| 1. online, după precache | v1 / v1 / v1, pagina controlată de SW |
| 2. modul offline al Playwright, reîncărcare | v1 / v1 / v1 |
| 2b. offline, adresă adâncă `/proiect/123` | v1 (servit `index.html`) |
| 3. **serverul oprit de tot**, pornire | v1 / v1 / v1 |
| 4. v2 publicat, pagina reîncărcată | tot v1, iar aplicația știe că există v2 |
| 4b. încă o reîncărcare, fără accept | tot v1, întreg |
| 5. accept | v2 / v2 / v2; cache-ul conține exact cele 6 fișiere din v2 |
| 6. serverul oprit după actualizare | v2 / v2 / v2 |
| **martor:** SW blocat, serverul oprit | **pică**: `ERR_CONNECTION_REFUSED` |

- SW-ul și runtime-ul Workbox: 0,7 + 5,0 + 2,1 KB gzip. Build-ul Vite: 7,1 s la rece, 2,3 s la cald. [măsurat]
- Antete: `index.html` și `sw.js` cu `no-cache`, fișierele cu hash în nume cu `immutable`. [măsurat, în
  serverul de probă]

## 5. Ce schimbă în arhitectură

1. **Schema documentului se scrie în valibot.** Tipul TS iese cu `InferOutput`, obiectele sunt `looseObject` peste
   tot (necunoscutele se păstrează), iar erorile (cale, cod, limită) trec printr-un singur traducător în `t()`.
   Zod v4 rămâne rezerva, cu aceeași formă.
2. **CSP fără `'unsafe-eval'` din ziua 1.** Proba de CSP se face pe build-ul servit, cu antetul real, nu prin
   `page.evaluate`: codul injectat de Playwright ocolește verificarea de `eval` (lecție din ediția întâi). În
   sonda de față, validatorii au rulat dintr-un script încărcat de pagină, deci sub CSP.
3. **Validarea completă rulează o dată, la încărcare, într-un worker** (~0,3–0,5 s la 50 000 de noduri).
   Editările validează doar entitatea atinsă.
4. **Salvarea scrie JSON canonic** (chei sortate). E necesar fiindcă valibot și zod schimbă ordinea cheilor, iar
   fără el același document ar da alt fișier și alt hash.
5. **Trei feluri de date, trei locuri:**
   - documentul, pointerul „versiunea curentă”, jurnalul și registrul resurselor: **o singură bază IndexedDB**,
     cu tranzacții;
   - octeții resurselor (STL, relief, imagini, fonturi): **OPFS, fișiere numite după SHA-256, scrise o singură
     dată** (`.tmp` → `flush` → `move` → verificare), niciodată suprascrise;
   - derivatele (câmpuri coapte, trasee, G-code): cache după hash, pot fi șterse oricând.
6. **Curățenie la pornire:** se șterg `*.tmp`, `*.crswap` și resursele nereferite de niciun document.
7. **Un singur scriitor:** worker-ul de persistență deține OPFS-ul. Între file deschise, accesul trece prin Web
   Locks. [dedus; vezi §6]
8. **Fișierul `.cncvs` e zip-ul determinist din §4.5.** La deschidere se verifică hash-ul fiecărei părți, apoi
   schema. `minWriter` se verifică înainte de orice scriere (`docs/faza0/09` A4).
9. **Undo = jurnal de comenzi** care ține valorile vechi și noi ale câmpurilor atinse. Fără copii complete,
   fără Immer peste tot documentul, fără „operația inversă”. Documentul trăiește într-un singur fir: o copie a lui
   costă ~0,6 s.
10. **PWA cu vite-plugin-pwa, `registerType: 'prompt'`.** Actualizarea se oferă și e blocată cât rulează un job
    pe mașină. Scenariul din §4.7, cu martorul lui, devine test de poartă pe build-ul real.
11. **Stocarea poate fi evacuată.** Cerem `persist()` după instalare și afișăm starea. Plasa e copia în cloud sau
    fișierul exportat.

## 6. Riscuri și ce a rămas neprobat

- **Doar Edge, fără ecran.** Chromium-ul din cache-ul Playwright nu pornește din sandbox-ul acestei sesiuni
  (`spawn UNKNOWN`). Chrome are același motor, dar cota și euristica `persist()` n-au fost măsurate pe el.
- **Căderea simulată e a procesului, nu a sistemului.** O pană de curent poate pierde ce nu a ajuns pe disc.
  Diferența dintre `durability: 'strict'` și `'relaxed'` n-a fost probată.
- **`move()` la cădere:** merge și înlocuiește ținta (§4.4), dar n-am omorât procesul chiar în timpul mutării.
  Resursele adresate prin hash nu depind de asta: un fișier final fără pointer e doar gunoi. Dacă `move()` peste
  un fișier existent se dovedește atomic, devine și o salvare rapidă pentru fișierele care se înlocuiesc
  (`.tmp` sincron + `move()`, față de `createWritable`, de ~15× mai lent). [dedus; de probat]
- **Două file care scriu același proiect**: neprobat. `createSyncAccessHandle` ia un zăvor exclusiv pe fișier
  ([citit] https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle), deci a
  doua filă primește eroare. Web Locks și preluarea scrierii sunt de probat.
- **Depășirea cotei și evacuarea**: neprobate. `persist() = true` (aplicație instalată): neprobat.
- **Două file deschise în timpul actualizării SW**: neprobat (ediția întâi avea un test pentru asta).
- **Migrările vN→vN+1 cu corpus de aur**: neprobate. Am probat doar păstrarea câmpurilor necunoscute.
- **Validarea în worker și transferul documentului între fire**: nemăsurate. O copie structurată a documentului
  de 50 000 de noduri costă ~0,6 s în Node, deci documentul nu trebuie să circule între fire.
- **Mărimea documentului:** 55 MB de JSON la 50 000 de noduri, cu dublele scrise complet. Rotunjirea la 1e-6 mm la
  salvare ar micșora fișierul; nemăsurat.
- **Effect Schema**: instalat, neprobat din lipsă de timp.
- **Zgomotul:** cu 9 agenți în paralel, timpii absoluți variază cu până la ~60 % între rulări (zod în Node: 406,
  422, 504, 560, 651 ms în cinci rulări). Ordinea între candidați nu s-a schimbat: typebox < arktype < zod ≈
  valibot în Node; valibot singurul neafectat de CSP.

## 7. Cum se reproduce

```
cd C:\Users\besli\AppData\Local\Temp\claude\C--Users-besli-Desktop-MyWork-Apps\50bc5be4-b484-49e8-970f-991b3583b938\scratchpad\sonde\s7-date-offline
node masoara.mjs
```

Rulează trei șiruri în paralel: browserul (CSP, stocare, cădere, `move()`, PWA; portul 5177), schema în Node și
undo + fișierul de proiect în Node. Scrie `out/*.json` și un tabel la final. Durata măsurată, pe mașina încărcată
de ceilalți agenți: **150 s** (cel mai lung e `p1-schema`: 149 s). Ca să încapă, `masoara` folosește mai puține
repetări (3) și, în pagina CSP, doar primele 2 defecte. Am rulat-o de patru ori; concluziile n-au variat:
- Edge sub CSP: zod 491–531, valibot 319–417, typebox 2 941–2 964, arktype 274–328 ms; arktype a pierdut calea
  exactă de fiecare dată (5/10, apoi 0/2);
- căderea: identică de fiecare dată (martorul 43 v1 / 21 v2; celelalte 64 / 0);
- zip identic octet cu octet, `move()` înlocuiește ținta, PWA 9/9 cu martorul picat.

Din `cod/` (copie a surselor): `npm ci`, apoi `node masoara.mjs`. Scriptul face singur bundle-urile pentru pagina
CSP (`bundle.mjs`, care dă și tabelul de mărimi) și cele două build-uri PWA. Cere Microsoft Edge instalat și
portul 5177 liber. Rulările complete, cu mai multe repetări:
`node p1-schema.mjs 50000 7`, `node p1-csp.mjs 50000 7 10`, `node p2-storage.mjs 5`, `node --expose-gc p3-undo.mjs`,
`npx tsc -p tsconfig.json` (proba de tip).
