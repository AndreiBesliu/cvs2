# ADR 0045: PWA offline: workerul propriu la `/sw.js`, precache-ul fără pagina /admin, actualizarea oferită

**Starea:** acceptat pe 18.10.2026, odată cu felia „PWA offline” (`PLAN.md` §5.3, etapa 4, punctul 7: „PWA: pornește fără
rețea; actualizarea e oferită și blocată cât rulează un job; CSP fără `eval`, probat pe build-ul servit”), adusă ca felie
fără mașină. Scrie contractul lui ADR 0017 (Vite + vite-plugin-pwa) și împlinește ce cerea ADR 0042 („workerul PWA ține
în cache ambele dicționare și toate bucățile la cerere”). **Continuă:** ADR 0040 §2 (`config.json` de la gazdă), ADR 0043
(raportorul; o bucată care nu vine e defect), ADR 0044 (publicarea). **Completat pe 19.10.2026** (felia „4.7↑b”, alegerea
owner-ului la întrebarea deschisă): verificarea orară a versiunii noi (punctul 5).

**Problema.** Aplicația pornea doar cu rețea: fără ea, nici `index.html`. La aceeași adresă stătea `public/sw.js`,
opritorul workerului ediției întâi (cache-urile `cncvs-…`), care cerea, în comentariul lui, ca workerul PWA să-i ia locul
și să facă el curățenia. Ținta: aplicația pornește și lucrează offline de la a doua încărcare, o publicare nouă nu
schimbă codul sub om (actualizarea se oferă), iar aplicația veche e preluată fără reîncărcarea vreunei file.

## Decizia

**1. vite-plugin-pwa 2.0.0, strategia `injectManifest`, cu workerul propriu `src/sw.ts`.** Versiunea fixată exact:
03.10.2026 (15 zile la felie), prima cu Vite 8 în `peerDependencies`. Ieșirea e **`/sw.js`** (adresa workerului ediției
întâi, deci îl înlocuiește pe loc), un worker clasic (`rollupFormat: 'iife'`, înregistrat fără `type: 'module'`), scope
`/`. `manifest: false` (instalabilitatea cere iconițe; nu e ținta), `injectRegister: false` (pornirea cere un singur
script, ADR 0042 §1), fără worker în dezvoltare. Modulele Workbox (`workbox-core`, `workbox-precaching`,
`workbox-routing`, 7.4.1, fixate exact) stau în `dependencies`: codul lor pleacă în `sw.js`, deci `npm run licente` le
verifică (MIT). `public/sw.js` (opritorul) e scos: Vite l-ar fi copiat în `dist/` sub același nume.
- **Strategia lui `config.json` e scrisă de mână**, în `src/pwa/configSw.ts` (punctul 3), nu luată din `NetworkFirst`: se
  probează în Node cu un `CacheStorage` fals, iar întrebarea „am o copie?” se pune cu `caches.match(url, { cacheName })`;
  `NetworkFirst` se putea proba doar în browser. **`workbox-strategies` e totuși în pachet**: e o dependență a lui
  `workbox-precaching` (care îl folosește pentru precache), deci codul lui ajunge în `sw.js`; e fixat exact (7.4.1) în
  `dependencies`, iar `npm run licente` îl vede MIT. Nu e o dependență „lipsă”, doar una pe care n-o folosim direct
  (corectat după recenzia din 18.10, care a găsit formularea veche, „fără `workbox-strategies`”, înșelătoare).
- `maximumFileSizeToCacheInBytes` (8 MB, `vite.config.ts`): peste plafon, vite-plugin-pwa 2.0.0 **oprește build-ul**
  („Configure injectManifest.maximumFileSizeToCacheInBytes…”), nu scoate tăcut fișierul (probat în recenzie cu 100 kB).

**2. Precache-ul**, după predicatul pur `shared/precache.ts` (`motivPrecache`), aplicat de `vite.config.ts` pe manifestul
workerului (`manifestTransforms`) și de poartă pe build: `index.html`, `favicon.svg` și toate bucățile JS / CSS din
`assets/`, inclusiv cele la cerere (ferestrele cu calculul lor, alegerea cu clicul, traseul, workerul pânzei), **ambele
dicționare** și **raportorul de erori cu baza conexiunii** (`raportor-*`, `conexiuneBaza-*`; recenzia din 18.10): fila
rămâne pe versiunea ei până la clicul pe „Reîncarcă”, deci și raportorul ei trebuie să rămână disponibil după o publicare,
când bucata lui veche nu mai e pe hosting (altfel 404, iar prima eroare îl stinge pe toată sesiunea, ADR 0043). Afară
rămân doar pagina `/admin` (`DOAR_ONLINE`: `PaginaAdmin`, cu stilul ei), `config.json`, `sw.js` și `banc/`. Orice alt
fișier e „necunoscut”, iar poarta pică pe el. Cifrele: **32 de fișiere, 218,3 kB gzip** (până la recenzie: 30, 200,2 kB;
raportorul cu baza conexiunii: +18 kB); afară, pagina `/admin` (~150 kB gzip).

**3. `config.json`: rețeaua întâi, cu termen scurt, apoi ultima copie bună** (`raspunsConfig`): rețeaua are
**2,5 s** (`TERMEN_CONFIG_SW_MS`, sub cele 4 s ale aplicației, cu o secundă de rezervă); peste termen, la cădere sau la un
răspuns prost (alt status decât 200, un corp care nu e obiect JSON), vine copia din cache-ul **`cncvs2-config`**. Doar o
copie bună intră în cache (o pagină de eroare nu o acoperă); un răspuns întârziat o înlocuiește în fundal (`waitUntil`).
Fără copie: ce dă rețeaua (aplicația își spune motivul, ca până acum). Offline, aplicația pornește cu ultima configurație.
- **Prima copie, la instalare** (`copieLaInstalare`, recenzia din 18.10): prima încărcare nu e a workerului (fără
  `clients.claim()`, punctul 6), deci cererea ei pentru `config.json` nu trece prin el; fără copia asta, după o singură
  vizită online, offline aplicația pornea cu „Instanța: necunoscută” și cipul de eroare. La `install`, workerul cere
  `/config.json` din rețea (`cache: 'no-store'`) și pune în `cncvs2-config` doar o copie bună, cu același cod ca strategia
  (`doarBuna`, `pastreaza`). Instalarea nu cade dacă cererea cade (sau dacă scrierea în cache e refuzată).

**4. Navigările: listă albă** (`src/pwa/navigare.ts`, `esteNavigareaAplicatiei`, funcție pură). Workerul servește
`index.html` din precache **doar** pentru ruta aplicației: `/` (cu orice query, de exemplu `/?diagnostic=…`) și
`/index.html`, pe originea lui (`/` vine din precache prin `directoryIndex`; `cleanURLs` e oprit, altfel `/index` ar primi
aplicația). Orice altă navigare merge în rețea, neatinsă (recenzia din 18.10; până atunci era o listă neagră, care uita
tocmai ce nu știa):
- **`/admin`** e doar online: din rețea, deci după o publicare primește versiunea nouă (din precache venea pornirea veche,
  iar pagina ei, care nu e în precache, lipsea de pe hosting: 404 și mesajul de eroare la fiecare reîncărcare, până se
  închideau toate filele). Fără rețea, navigarea pică, ca fără worker.
- **`/__/*`**, paginile rezervate Firebase (`/__/auth/handler`, `/__/auth/iframe`): authDomain e chiar originea instanței
  de test, deci popup-ul login-ului Google de pe `/admin` primea aplicația în locul handler-ului, iar login-ul nu se mai
  termina.
- **`/banc/*`** și **orice rută necunoscută**: 404-ul serverului rămâne 404, nu devine aplicația.
- `/assets/*`, `/config.json`, `/sw.js` nu sunt navigări ale aplicației; o bucată lipsă e 404 (sau eroarea rețelei).
- **`/admin` fără bucata paginii** (rețeaua căzută după `index.html`): `main.tsx` pune un mesaj, nu o pagină albă, cu
  `role="alert"` și o intrare în jurnal. Textul e nou (`admin.cere-retea`, în dicționarele principale, en + ro: „Pagina
  de administrare cere rețea: reîncarcă pagina când ai rețea.”); cel de până la recenzie (`dialog.neincarcat`, „Fereastra
  … Proiectul e salvat”) nu avea sens pe `/admin`.

**5. Actualizarea, oferită** (`src/pwa/inregistrare.ts`). Un worker nou se instalează și **așteaptă**. Aplicația primește o
ofertă, iar bara de jos arată cipul `actualizare` (`aranjament.ts`): „Versiune nouă gata” + „Reîncarcă” (en + ro). Abia
clicul trimite `SKIP_WAITING`, iar pagina se reîncarcă **o singură dată**, la `controllerchange` (o pagină necontrolată, la
activarea workerului nou). **Niciodată singură:** dacă altă filă a acceptat, fila asta nu se reîncarcă (controlorul i se
schimbă, codul ei rămâne cel vechi), iar clicul ei doar reîncarcă. Un worker oferit care devine inutil (înlocuit de unul și
mai nou, instalare eșuată) își retrage oferta.
- **Blocarea cât rulează un job vine cu senderul** (etapa 3.6+): punctul de legătură e `actualizarePermisa()`, care azi
  întoarce `true`. Cât o întoarce `false`, clicul nu trimite nimic și nu reîncarcă (probat); senderul o va lega de starea
  jobului, iar anunțul va spune atunci de ce butonul așteaptă.
- **Abatere: fără `virtual:pwa-register`.** În modul „prompt”, odată oferită actualizarea, el adaugă un ascultător
  `controlling` care **reîncarcă fila** la preluare, deci și când a acceptat altă filă (muncă nesalvată), plus ~2,5 kB de
  workbox-window. Echivalentul de aici e câteva evenimente ale API-ului, probate cu un container fals.
- **Verificarea orară (19.10, felia 4.7↑b).** Browserul caută un `/sw.js` nou doar la navigare, deci o filă lăsată
  deschisă zile întregi afla de o publicare abia la reîncărcare. Acum o caută și aplicația: `registration.update()` la
  fiecare oră (`INTERVAL_VERIFICARE_MS` = 3 600 000, `setInterval` armat după înregistrare, fără verificare la pornire,
  fiindcă navigarea tocmai a verificat), plus **când fila redevine vizibilă și a trecut cel puțin o oră de la ultima
  verificare**. A doua condiție e aleasă pentru fila înghețată: cu calculatorul adormit sau cu fila „adormită” de Edge
  (după o vreme de nefolosire), intervalul nu rulează, iar omul care se întoarce dimineața ar vedea oferta abia după
  încă o oră; așa o vede în câteva secunde. Timpul de la ultima verificare se măsoară pe `Date.now()`, care curge și cât
  calculatorul doarme (ceasul monoton al paginii poate sta pe loc). Intervalul verifică **mereu**, nu „doar dacă a trecut o
  oră”: ceasul lui și ora peretelui pot diferi cu puțin, iar condiția l-ar face să sară o oră întreagă; o verificare în plus,
  lângă una la vizibilitate, e o cerere de câțiva kB (browserul le contopește pe cele simultane).
  - Ce găsește verificarea vine prin `updatefound`, deci prin **aceeași ofertă**, una pe worker: un `update()` care dă
    peste workerul care așteaptă deja nu găsește nimic nou. Anunțul și reîncărcarea doar la clic rămân neschimbate.
  - **Eșecul (offline, serverul căzut, `/sw.js` 404) nu intră în jurnal**, nici local: e o condiție a mediului (ADR 0039
    §6), iar o filă offline ar strânge o intrare pe oră. Un `sw.js` lipsă la publicare îl prinde poarta (punctul 8), nu
    clientul. **Fără buclă:** ora se scrie înaintea încercării, deci nici fila ascunsă și arătată de zece ori, offline, nu
    verifică mai des de o oră; reîncercarea e verificarea următoare.
  - Codul stă în bucata înregistrării (la cerere): 0,5 → 0,66 kB gzip; pornirea nu se schimbă.

**6. Preluarea de la aplicația veche.** La instalare, workerul întreabă dacă există cache-uri `cncvs-` doar prin `keys()`
(`caches.open` ar crea cache-ul întrebat); dacă da (ediția întâi a fost aici), se activează imediat (`skipWaiting`, ca
opritorul), fără să reîncarce vreo filă; altfel așteaptă clicul de la punctul 5. La activare șterge cache-urile `cncvs-` și
precache-urile workbox vechi ale acestui scope (alt nume decât cel curent, ca `cleanupOutdatedCaches`); ale noastre se
numesc `cncvs2-…` și rămân. **Fără `clients.claim()`:** pagina deschisă la instalare rămâne a cui era, deci offline merge
de la a doua încărcare.
- Precizare: o filă a aplicației vechi, controlată de înregistrarea de la `/sw.js`, trece la workerul nou când acesta se
  activează (așa face browserul cu orice worker activat pe aceeași înregistrare; la fel era cu opritorul). Bucățile ei nu
  sunt în precache, deci cererile ei merg în rețea, neatinse (pe hosting-ul nou: 404, ca fără worker); navigarea ei
  următoare primește aplicația nouă.

**7. Înregistrarea, la cerere și după prima randare** (`main.tsx`, `pornestePwa`, cu pauza și garda în
`src/pwa/pornire.ts`, probate unitar): la 2 s după randare (`PAUZA_PWA_MS`, după preîncărcările aplicației de la 1 s, pe
care instalarea, cu tot precache-ul, le-ar întârzia), `import()` al bucății `inregistrare`, fără `await` la nivelul
modulului; doar în build (`import.meta.env.PROD`) și doar unde există `navigator.serviceWorker` (`pwaPosibil`, funcție
pură). Și pe `/admin` (același worker; probat în e2e: după pauză, `/admin` are o înregistrare). Un eșec intră în jurnal o singură dată, fără reîncercare: o
bucată care nu vine sau o înregistrare refuzată e defect (tipul `promisiune`, deci fără tip nou pe care serverul publicat
l-ar refuza); refuzul cu `SecurityError` (datele site-ului blocate) e o condiție a mediului, doar locală (ca proiectul
local, ADR 0043 §1).
- **E2e-ul obișnuit are workerul blocat** (`serviceWorkers: 'block'` în `playwright.config.ts`, la fel bancul și
  e2e-ul pe emulator): o pagină controlată nu mai trece prin `page.route` (bucățile oprite de probe ar veni din precache),
  iar o reîncărcare ar servi build-ul din cache. Blocarea lui Playwright face ca `register()` să nu întoarcă nimic, iar
  înregistrarea se oprește tăcut (probat). Probele workerului sunt în proiectul `edge-pwa`, fiecare cu serverul ei.
  Contextele Playwright sunt noi la fiecare probă, deci nicio înregistrare nu trece dintr-o rulare în alta.

**8. Poarta** (`scripts/build-determinist.ts`), plase noi: `dist/sw.js` există (determinismul îl cere identic în cele două
build-uri) și are manifestul injectat; fiecare fișier al build-ului are o decizie de precache; manifestul e exact ce cere
predicatul, în ambele direcții; independent de predicat, manifestul are `index.html`, pornirea, ambele dicționare,
ferestrele, calculul exportului, alegerea, workerul pânzei, raportorul și baza conexiunii, și nu are `config.json`,
`sw.js`, `banc/`, nimic din pagina `/admin` (după CONȚINUT: adresele Firestore și ale contului, pe care le are doar ea) și
niciun Firebase în afara lui `raportor-*` / `conexiuneBaza-*` (marcajele din ADR 0043); o bucată din precache adusă doar de bucăți din afara lui (o parte nouă a
lui `/admin`) și un stil fără bucata lui cer trecerea în `DOAR_ONLINE`; pornirea cere `inregistrare-*.js` doar cu
`import()`, iar adresa `/sw.js` nu e în bucata de pornire, dar e în bucata înregistrării.

## Cifrele (măsurate, gzip 9)

- Pornirea: 93,52 → **93,9 kB** (felia, cu remedierile recenziei; `src/pwa/pornire.ts` stă în pornire); cu ușa
  proiectului 98,12 → **98,5 / 100**. Strâmt, cum era (ADR 0042 „se redeschide” la ~95 kB).
- Bucata înregistrării, la cerere: 0,5 kB (0,66 kB din 19.10, cu verificarea orară). `sw.js`: 6,4 kB (intră în total: 211,8 → 218,3 / 300 kB).
- Precache: **32 de fișiere, 218,3 kB gzip** (cu raportorul și baza conexiunii, +18 kB față de prima variantă), aduse o
  dată la instalare, apoi doar ce s-a schimbat.

## Probele

- **Unitare:** `test/unit/precache.test.ts` (predicatul pe lista reală a build-ului, marginile: prefixe comune, amprenta
  cu `-` și `_`, `banc/` adânc, fișiere necunoscute); `test/unit/pwa.preluare.test.ts` (falsul probat întâi: `open`
  creează, `match` cu `cacheName` caută doar acolo; întrebarea de la instalare nu creează nimic; curățenia de la activare);
  `test/unit/pwa.config.test.ts` (rețeaua bună, căzută, lentă cu și fără copie, răspunsul prost, copia dintr-un alt cache
  refuzată, căutarea care nu creează cache-ul; termenul sub al aplicației; copia de la instalare: `no-store`, doar copia
  bună, fără cache creat degeaba, instalarea care nu cade la rețea sau la cotă); `test/unit/pwa.actualizare.test.ts` (prima
  instalare fără ofertă, oferta, clicul pe pagină controlată și necontrolată, alt tab, oferta retrasă,
  `actualizarePermisa`, eșecurile înregistrării, blocarea lui Playwright, protocolul; verificarea orară pe un ceas fals:
  intervalul unic de 3 600 000 ms, `update()` la o oră și nu la 3 599 999 ms, oferta unică a versiunii găsite, eșecul fără
  jurnal și fără reîncercare, vizibilitatea cu pragul de o oră și fila înghețată, nimic fără înregistrare);
  `test/unit/pwa.navigare.test.ts`
  (lista albă, caz cu caz: `/`, query-uri, `/index.html`; `/admin`, `/__/auth/*`, `/banc/*`, `/index`, rutele
  necunoscute, fișierele, altă origine); `test/unit/pwa.pornire.test.ts` (politica pauzei de 2 000 ms, garda prod / dev
  cu și fără `navigator.serviceWorker`, programarea cu un ceas fals).
- **E2e în Edge, pe build** (`test/e2e/pwa.spec.ts`, serverul `test/e2e/server-pwa.ts`: o copie a `dist/`, port liber,
  `no-store` pe tot, ca un fișier lipsă din precache să nu vină din cache-ul HTTP): offline de la a doua încărcare
  (`setOffline`: pornește, ambele limbi, importul și exportul cu G-code-ul, `config.json` din cache, zero cereri la server);
  serverul oprit de tot; **martorul** (workerul blocat: aceeași pornire offline pică); navigările (offline: `/?proba=1` și
  `/index.html` din precache, `/admin` pică ca fără worker; `/assets/*` 404 și offline eroarea rețelei, niciodată
  `index.html`); lista albă (serverul servește o pagină proprie la `/__/auth/*`: navigarea și popup-ul `window.open` ajung
  la ea, nu la worker; `/ceva/necunoscut`, `/index`, `/banc/` rămân 404); `/admin` cu înregistrarea lui; `/admin` fără
  bucata paginii (mesajul nou, `role="alert"`); `config.json` după o singură vizită online (fără reîncărcare controlată:
  offline, instanța „test”, fără avertisment); publicarea simulată (`publicareSimulata`: alt build pe aceeași adresă,
  pornirea, `/admin`, raportorul și baza conexiunii redenumite, cele vechi dispărute: `/admin` încarcă versiunea nouă, iar
  fila rămasă pe versiunea veche își ia raportorul vechi din precache); preluarea (un worker care imită ediția
  întâi, cu `cncvs-shell-v41`: workerul nou se activează singur, șterge doar `cncvs-`, fila nu se reîncarcă) și
  contraproba ei (fără `cncvs-`, workerul nou așteaptă); actualizarea (o a doua versiune a lui `sw.js` pe aceeași adresă:
  anunțul, nicio reîncărcare 3 s, clicul, exact o reîncărcare, pagina răspunde ca workerul nou); verificarea orară (ceasul
  paginii al lui Playwright, `clock.install`; publicarea simulată cu fila deschisă și controlată: 3 s fără nicio ofertă,
  apoi `fastForward` de o oră, oferta vine fără nicio navigare, cu cererea la `/sw.js` și workerul nou în așteptare).
- **Sabotajele verificării orare (19.10):** 8, toate picate, sursa restaurată și verificată cu `cmp`. Unitare (7):
  intervalul de 2 h, eșecul trimis în jurnal, vizibilitatea fără pragul de o oră, fără verificarea la vizibilitate, ora
  scrisă doar după succes (buclă offline), verificarea și la pornire, ascunderea care verifică (scăpat la prima rulare: proba
  ascundea fila înainte de prag; corectată, prins). E2e (1): intervalul implicit care nu pornește (unitarele merg pe ceasul
  fals, deci doar e2e-ul vede `setInterval`).
- **Sabotajele:** 32, fiecare pe codul pe care îl apără o probă, toate picate, restaurate octet cu octet (arborele verificat
  identic după). Unitare (15): prefixul `cncvs` fără cratimă, activarea care șterge precache-ul curent, copia căutată fără
  `cacheName` sau prin `caches.open`, orice 200 drept copie bună, termenul de 4 s, rețeaua lentă așteptată, clicul care
  reîncarcă imediat, oferta la prima instalare, reîncărcarea la `controllerchange` fără clic, `actualizarePermisa`
  ignorată, `SecurityError` trimis ca defect, al doilea clic care trimite din nou, raportorul și bancul în predicat.
  Poarta (9): fără plugin (`sw.js` lipsă), `sw.js` nedeterminist, manifestul nefiltrat, raportorul în precache (prins
  după conținut), dicționarul englez scos, o bucată nouă doar a lui `/admin`, înregistrarea importată static, `/sw.js` în
  pornire, stilul lui `/admin` în precache. E2e (8): fără activarea imediată la preluare, activarea imediată mereu,
  `clients.claim()`, `/assets/*` pe `index.html`, `config.json` fără rută, `/admin` fără mesaj, actualizarea aplicată
  singură, navigările fără `index.html` (la prima rulare, sabotajul ăsta a trecut de proba „serverul oprit”: `/` vine din
  precache prin `directoryIndex`, nu prin navigare; îl prinde proba navigărilor, cu `/admin` și `/?proba=1` offline).

## Ce impune

- **O bucată nouă doar online** (o parte a paginii `/admin`) intră în `DOAR_ONLINE`; poarta pică altfel. Un fel nou de
  fișier în `dist/` (un font, o imagine) cere o decizie în `shared/precache.ts`.
- **O rută nouă servită cu `index.html`** (de hosting, în `scripts/firebase-json.ts`) intră în lista albă
  (`src/pwa/navigare.ts`) doar dacă e a aplicației și trebuie să pornească offline; altfel rămâne în rețea.
- **Probele e2e care au nevoie de worker** stau în `pwa.spec.ts` (proiectul `edge-pwa`); restul suitei are workerul blocat.
- **Publicarea pe live (3.9) verifică preluarea pe live**, unde ediția întâi rulează încă, cu workerul ei: după publicare,
  un browser care a avut aplicația veche ajunge la cea nouă fără ștergerea manuală a datelor, iar cache-urile `cncvs-`
  dispar. Revenirea din istoricul hosting-ului (ADR 0017) servește un `sw.js` vechi: browserul îl ia drept actualizare,
  deci se oferă, ca orice altă versiune.
- `/sw.js` rămâne `no-cache` pe hosting (`scripts/firebase-json.ts`), ca o versiune nouă să fie văzută la prima navigare.
- **Senderul (3.6+)** leagă `actualizarePermisa()` de starea jobului și spune în anunț de ce așteaptă.
- După o publicare, bucățile aplicației (cu raportorul ei) nu lipsesc: workerul vechi servește setul lui, întreg, până la
  clic, iar instalarea celui nou pică dacă una dintre bucățile lui lipsește (Workbox le aduce pe toate sau niciuna).
  `/admin` vine din rețea, deci e mereu versiunea publicată.

## Ce am respins

- **`generateSW`:** fără loc pentru preluare, pentru strategia lui `config.json` și pentru probele în Node.
- **`clients.claim()`:** o filă deschisă ar trece sub workerul nou înaintea primei reîncărcări; câștigul (offline de la
  prima încărcare) nu merită.
- **Actualizarea automată** (`registerType: 'autoUpdate'`, `skipWaiting` mereu): reîncarcă sub om.
- **`/admin` în precache:** ~150 kB gzip în plus, fără folos offline (n-are cu cine vorbi), iar navigarea lui din precache
  ar ține pagina pe versiunea veche după o publicare. (Raportorul, cu Firebase-ul lui, a intrat după recenzie: punctul 2.)
- **Navigările pe listă neagră** (`NavigationRoute` cu `denylist`, varianta de până la recenzie): uită exact ce nu știe
  (`/__/auth/*`, o rută nouă a hosting-ului, o rută necunoscută care ar trebui să rămână 404).
- **Verificarea periodică doar prin browser** (de la recenzia din 18.10 până la felia 4.7↑b, 19.10): o filă lăsată deschisă
  afla de publicare abia la navigare. Owner-ul a ales verificarea orară (punctul 5). Variantele ei respinse: **Periodic
  Background Sync** (cere aplicația instalată, doar Chromium, frecvența o decide browserul); **doar la vizibilitate** (fila
  văzută tot timpul, pe ecranul de lângă mașină, n-ar mai verifica niciodată); **intervalul cu condiția „o oră de la
  ultima”** (sare ore întregi la o diferență mică de ceas); **la evenimentul `online`** (revenirea rețelei e urmată oricum de
  verificarea orară, iar navigarea verifică singură); **eșecul în jurnal** (o filă offline ar strânge o intrare pe oră).
- **`NetworkFirst` și `virtual:pwa-register`:** punctele 1 și 5.
- **Worker modul (`rollupFormat: 'es'`):** cere `type: 'module'` la înregistrare, fără câștig aici.
- **Înregistrarea în pornire** (sau un script injectat în `index.html`): octeți în plus la fiecare pornire și un al doilea
  script, pe care poarta îl refuză.

## Neprobat

- **Preluarea de la aplicația veche reală:** pe test e deja opritorul (dezînregistrat după prima vizită), pe live rulează
  ediția întâi. Probată cu un worker care o imită (cache-uri `cncvs-`, `clients.claim`); cea reală, la 3.9.
- Firefox și Safari (doar Edge, ca restul e2e-ului).
- Două file deschise, una acceptă actualizarea: doar unitar (containerul fals), nu în browser.
- Verificarea la vizibilitate (fila ascunsă și arătată, fila înghețată de Edge, calculatorul adormit): doar unitar, pe ceasul
  fals. În browser e probat doar intervalul (ceasul lui Playwright, `fastForward`, „capacul închis și deschis”).
- Cota și evacuarea stocării (s7, §6).
- Login-ul Google real pe `https://cncvectorstudio-test.firebaseapp.com` cu workerul activ și iframe-ul `/__/auth/iframe`
  creat de SDK: probate cu un handler simulat pe aceeași origine (navigarea și popup-ul); la publicarea pe test, primul
  login pe `/admin` e proba reală.

## Limite cunoscute

- **O filă a ediției întâi rămasă deschisă de dinainte de 08.10** (doar pe test, rar): cât trăiește, `register('/sw.js')`
  al aplicației noi reînvie înregistrarea pe care opritorul o dezînregistrase; opritorul (fără handler de fetch) rămâne
  activ și controlează filele noi, iar workerul PWA ajunge în așteptare (cache-urile `cncvs-` le-a șters deja opritorul,
  deci preluarea nu face `skipWaiting`). Efectul: „Versiune nouă gata” în fila nouă și fără pornire offline până la clic
  sau până se închide fila veche. Live-ul trece direct de la ediția întâi la PWA (cazul probat), deci nu e atins.
- **`waitUntil` pentru copia din fundal a lui `config.json`** rămâne: fără el, scrierea copiei după un răspuns întârziat nu
  mai e ținută în viață de eveniment. În Chromium, un worker inactiv trăiește ~30 s, deci sabotajul lui e aproape
  echivalent în probe (recenzia l-a lăsat scăpat); după specificație e necesar, așa că rămâne, fără probă proprie.

## Se redeschide dacă

- precache-ul trece de ~300 kB gzip sau instalarea se simte pe o rețea lentă (atunci: bucățile rare la cerere, în cache la
  prima folosire);
- senderul cere altă blocare decât butonul (de exemplu amânarea instalării);
- se cere instalarea ca aplicație (manifestul, iconițele);
- ~~**sesiunile lăsate deschise zile întregi** trebuie să afle de o versiune nouă fără navigare~~: **închis pe 19.10**
  (felia 4.7↑b, alegerea owner-ului), verificarea orară de la punctul 5;
- o oră se dovedește prea rar (o remediere urgentă care trebuie să ajungă repede la filele deschise) sau prea des (cererile
  la `/sw.js` în jurnalele hosting-ului): intervalul e o singură constantă.

## Recenzia (18.10)

Două lentile independente („offline” și „pachet”), pe build-ul servit, cu probe temporare în clone. Constatările și
remediile (fiecare cu proba scrisă întâi, picată pe codul de dinainte, apoi verde; sabotajele mai jos):

1. **Navigările prindeau orice rută** (mare, ambele lentile): `/__/auth/handler` (popup-ul login-ului Google de pe
   `/admin`, authDomain pe aceeași origine) primea aplicația, iar o rută necunoscută răspundea 200 în loc de 404.
   **Remediu:** lista albă (punctul 4), `cleanURLs` oprit; unitar caz cu caz, e2e cu handler-ul simulat, popup-ul și 404-urile.
2. **`/admin` blocat pe eroare după fiecare publicare** (mare / medie): din precache venea pornirea veche, iar
   `PaginaAdmin-<vechi>` lipsea de pe hosting; reîncărcarea nu ajuta, iar mesajul vorbea de „Fereastra” și „Proiectul”.
   **Remediu:** `/admin` doar din rețea (punctul 4), mesajul nou `admin.cere-retea` (en + ro, `role="alert"`); e2e cu
   publicarea simulată (`/admin` încarcă versiunea nouă) și cu bucata paginii lipsă (mesajul).
3. **Fără copia lui `config.json` după o singură vizită** (medie): **Remediu:** copia de la instalare (punctul 3); unitar
   cu falsul (`open` creează, `match` cu `cacheName`) și e2e: o vizită online, activarea, offline, reîncărcarea →
   instanța „test”, fără avertisment.
4. **Raportorul dispărea după o publicare** (medie): fila rămânea pe versiunea veche, raportorul ei dădea 404, prima
   eroare îl stingea pe toată sesiunea. **Remediu:** raportorul și baza conexiunii în precache (punctul 2), poarta îi cere
   în manifest și caută `/admin` după conținut; e2e: după publicarea simulată, bucățile vechi vin din precache (200) deși
   serverul le dă 404.
5. **Opritorul reînviat de o filă veche** (scăzută, doar pe test): rămâne limită cunoscută (mai sus).
6. **Golurile din probe** (lentila „pachet”): pauza de 2 s (M12), garda `PROD` (M13), înregistrarea de pe `/admin` (M17)
   și excluderea `/banc` (M19) treceau toate porțile. **Remediu:** pauza și garda în `src/pwa/pornire.ts`, cu test de
   politică și funcție pură; e2e pentru `/admin`; `/banc` e acum în afara listei albe, cu probă unitară și e2e. `waitUntil`
   (M18) rămâne fără probă (limită cunoscută, mai sus). **Precizare (reverificarea):** pauza și garda sunt probate în
   `pornire.ts`; legătura din `main.tsx` (`prod: import.meta.env.PROD` și ceasul implicit) nu e probată de nimic: o mutație
   acolo (`prod: true`, un `amana` care rulează imediat) trece. Efectul: o eroare în jurnal doar în dezvoltare, respectiv
   precache-ul descărcat mai devreme la prima vizită. Rămâne gol cunoscut, nu închis.

**Reverificarea remedierilor** (un verificator, 18.10): scenariile primei recenzii nu se mai reproduc (popup-ul și cadrul
`/__/auth/*` ajung la server, la prima vizită și după; rutele necunoscute, `/index`, `/Admin` rămân 404; `/admin` după o
publicare simulată încarcă versiunea nouă de trei ori la rând; raportorul vine din precache după publicare; `config.json`
după o singură vizită, cu serverul oprit de tot; `/banc/` ajunge la banc). Cinci constatări scăzute: legătura din
`main.tsx` (mai sus, rămâne); copia de la instalare fără termen ținea workerul în `installing` cât întârzia `config.json`
(acum termen de 10 s, `TERMEN_COPIE_INSTALARE_MS`, cu probă); titlul ADR-ului spunea încă „fără Firebase” (corectat:
precache-ul are raportorul și baza conexiunii, doar pagina `/admin` rămâne afară); lista albă sensibilă la majuscule fără
probă (acum `/INDEX.HTML`, `/ADMIN`, `/__/AUTH/…` în test); copia de la instalare pornită fără `waitUntil` (aproape
echivalentă în Chromium, ca M18: limită).
7. **Documentația** (lentila „pachet”): `workbox-strategies` (tranzitiv, nu lipsă) și `maximumFileSizeToCacheInBytes`
   (oprește build-ul), corectate la punctul 1.

**Sabotajele remedierilor** (fiecare singur, fișierul restaurat octet cu octet, verificat cu sha256): **23, toate prinse.** Unitare (13): lista albă fără `/index.html`, fără verificarea originii, cu
`/__/*` primit; copia de la instalare fără `no-store`, cu `fetch` aruncat pe loc, cu orice răspuns drept copie bună, cu
scrierea refuzată nescăpată; raportorul și baza conexiunii înapoi în `DOAR_ONLINE`; pauza 0, pauza ignorată la
programare, garda fără `PROD`, garda fără `serviceWorker`, programarea fără gardă. Poarta (3): raportorul și baza
conexiunii scoase din precache (prins de „obligatorii”, deși predicatul și manifestul se potrivesc), doar baza conexiunii
scoasă, pagina `/admin` în precache (prinsă după conținut). E2e (7): ruta navigărilor pe orice navigare (3 probe picate:
offline, lista albă, publicarea), `cleanURLs` repornit (`/index` din worker), copia de la instalare scoasă, raportorul
scos din precache (publicarea), mesajul vechi pe `/admin`, fără `role="alert"`, fără înregistrarea de pe `/admin`.
