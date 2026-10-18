# ADR 0043: Raportorul de erori din client (P0, partea 1b)

**Starea:** acceptat pe 18.10.2026, odată cu felia 3.2; revizuit pe 17.10 după recenzia cu patru lentile (secțiunea
„Recenzia (17.10)”) și pe 18.10 după reverificarea remedierilor și a doua rundă de otrăvuri („Reverificarea (18.10)”). Scrie contractul deciziilor deja luate (ADR 0039 §5: „clientul mai are plafonul lui pe sesiune”; ADR
0039 §6: condițiile de operare nu pleacă; `docs/faza2/admin/RAPORT.md` §5.1, punctele 4 și 6), cu abaterile spuse la fiecare
punct. **Intră în:** etapa 3, felia 3.2. **Continuă:** ADR 0039 (serverul, `logClientError`), ADR 0040 (§2 configurația de
la gazdă, §8 CSP-ul, §9 emulatoarele în carantină), ADR 0042 (§8 poarta pachetului).

**Problema.** `logClientError` e publicat pe test (3.1), dar clientul nu-l cheamă: erorile oamenilor rămân în jurnalul local
al browserului lor. Raportorul trebuie să le trimită fără să mute Firebase în pachetul de pornire, fără să dubleze
rapoartele la fiecare încărcare și fără să se hrănească singur (o eroare de raportare care produce un raport nou).

## Decizia

**1. Doar intrările acestei sesiuni pleacă, și doar defectele.** Raportorul trimite intrările adăugate în jurnal după
crearea lui, în pagina curentă, inclusiv cele dinaintea sosirii `config.json` (ținute în coadă). Intrările vechi din
`localStorage` nu se retrimit: n-au build-ul, iar retrimiterea ar dubla rapoartele la fiecare încărcare. Mecanismul:
ascultătorul jurnalului (`jurnal.asculta`) primește intrarea nouă ca argument; la golire nu primește nimic. Ascultătorii
vechi (`useSyncExternalStore`) ignoră argumentul.
- **Condițiile de operare nu pleacă** (ADR 0039 §6, predicatul îngust, la sursă; din recenzie, **îngustat la
  reverificare**). O intrare poate fi marcată „doar locală” (`IntrareEroare.doarLocala`, scrisă cu `jurnal.adaugaLocala`,
  păstrată și citită din depozit, arătată „(doar local)” în raportul copiat). Se marchează **doar mediul omului la
  deschiderea proiectului local**: IndexedDB lipsă, eroarea browserului (`SecurityError` = date blocate, `InvalidStateError`
  = fereastra privată, `QuotaExceededError` = discul plin, `UnknownError` = profilul stricat; `eroareDeMediu` din
  `proiectLocal.ts`) și baza care nu răspunde la timp (rezultatele poartă `mediu: true`). Raportorul le sare fără să
  descarce nimic: pe o instanță cu Firebase, un om cu datele site-ului blocate nu aduce Firebase (și un POST) la fiecare
  pornire. **Pleacă la server** (reverificarea): dicționarele care nu vin (prima limbă, rezerva, eșecul total, alegerea din
  butoane), ușa proiectului care nu vine (`necitit-acum` din bucata lipsă), `VersionError`, un magazin lipsă, o excepție a
  codului nostru și `nu-se-deschide`. O publicare stricată (bucăți lipsă) arată exact ca o rețea căzută, iar cu rețeaua
  căzută nici bucata raportorului n-ar veni, deci marcajul n-avea ce câștiga acolo și ascundea pana totală.

**2. Partea din pornire e mică și fără Firebase** (`src/app/raportorPornire.ts`, 1,20 kB măsurat singur): ascultă jurnalul,
ține coada (intrările așa cum au venit, cu limba de atunci) și, la prima intrare nouă cu configurația cunoscută, aduce la
cerere bucata care trimite (`src/cloud/raportor.ts`, `import()`; partea din pornire o importă doar ca tip). Raportul se
construiește și se curăță în bucata la cerere (`raportDin`, `curataText`; mutate acolo la reverificare, ca partea din
pornire să rămână sub 1,5 kB). Fără `firebase` în configurație (local) sau cu configurația nevalidă,
raportorul e stins: coada se golește, nimic nu se descarcă, nici mai târziu. Cu emulatoare locale pe gazda locală, trimite
spre emulatoare (calea probată în e2e-ul pe emulator).
- **Abatere: conexiunea s-a împărțit.** Raportorul nu importă `conexiune.ts` întreg: ar fi adus contul și Firestore
  (~150 kB) la prima eroare a oricui, iar totalul aplicației ar fi trecut de plafonul de 300 kB. `src/cloud/conexiuneBaza.ts`
  ține aplicația, App Check și funcțiile (singleton pe pagină); `conexiune.ts` (pagina `/admin`) adaugă peste ea contul și
  Firestore. Build-ul face din bază o bucată comună (`conexiuneBaza-*`, 16,8 kB), descărcată o singură dată, de cine o cere
  primul.
- **Ordinea e liberă:** funcțiile create înaintea contului primesc tokenul lui când apare. În `@firebase/auth`, componenta
  `auth-internal` e `EXPLICIT` și se creează abia odată cu `getAuth` (`setInstanceCreatedCallback`); `ContextProvider`-ul
  funcțiilor o așteaptă cu `authProvider.get()`. Deci un raport trimis pe `/admin` după login poartă uid-ul, oricine a creat
  aplicația primul (probat pe emulator).
- **Carantina emulatoarelor, pe adresele lor** (din recenzie): `conecteazaBaza` acceptă emulatoarele doar dacă pagina ȘI
  fiecare emulator (contul, Firestore, funcțiile) sunt pe gazda locală (`emulatoareLocale`), altfel
  `emulatoare-in-afara`. Înainte, pe `localhost`, un `config.json` cu `functions: 'colector.exemplu.ro:80'` trimitea
  rapoartele și tokenul de probă acolo, prin http. **La reverificare, adresele se potrivesc întregi** (`http://` +
  `localhost` / `127.0.0.1` + port pentru cont; gazdă locală + port pentru Firestore și funcții), nu prin `new URL`:
  `@firebase/auth` își ia gazda cu regexul lui, deci `http://localhost\@colector.exemplu.ro:9099` trecea de `URL` (gazda
  `localhost`) și lega contul de `colector.exemplu.ro`. `conexiune.ts` leagă contul și Firestore doar după bază, deci
  aceeași verificare le acoperă.
- **App Check fără reîmprospătare în fundal** (`isTokenAutoRefreshEnabled: false`, din recenzie): raportorul și `/admin` cer
  tokenul când îl folosesc. Altfel reCAPTCHA ar evalua periodic tot restul sesiunii, și după ce raportorul s-a stins.

**3. Raportul** e `RaportClient` din `shared/erori.ts`: `tip`, `mesaj`, `stiva` (din intrare), `adresa` fără query și
fragment (`faraInterogare`), `build` = `__VERSIUNE__`, `browser` = `navigator.userAgent` (implicit în raportor; `main.tsx`
nu-l mai dă), `limba` = limba curentă (la intrarea în coadă), fiecare tăiat cu `taie()` la plafoanele contractului. Nimic
altceva nu pleacă (probat pe cheile corpului trimis). Instanța și uid-ul le pune serverul.
- **Textele trimise se curăță** (apărare în adâncime, din recenzie; jurnalul local rămâne neatins): în `mesaj` și `stiva`,
  query-ul și fragmentul adreselor devin `?…`, iar adresele de e-mail devin `<email>` (`curataText`). **Lărgit la
  reverificare:** orice protocol și cu majuscule (`HTTPS://`, `wss://`), parantezele din cale, e-mailul codificat (`%40`),
  iar poziția din stivă de la capătul adresei (`:linie:coloană`, cu paranteza) rămâne. Regexurile sunt liniare:
  protocolul are cel mult 20 de caractere, partea locală a e-mailului cel mult 64, adresa se ia dintr-o trecere și se taie în
  funcție, iar e-mailul începe doar la marginea unui cuvânt (probat: texte de ~4 000 de caractere făcute să provoace
  revenirea, sub 150 ms).
- **Mesajul gol** (`throw ''`, doar spații) pleacă drept `eroare fără mesaj` (`MESAJ_GOL`): serverul refuză un mesaj gol
  (`valideazaRaport`), deci eroarea s-ar fi pierdut și ar fi consumat din plafoane.

**4. Plafonul pe sesiune:** cel mult **20** de rapoarte pe încărcarea paginii și cel mult **3** cu aceeași cheie locală;
restul se numără, nu se trimit.
- **Cheia locală (schimbată la recenzie și la reverificare)** e `tip|mesaj`: cuvintele (despărțite într-o singură trecere)
  care poartă o cifră (numere, uuid-uri, id-uri hex) sau care arată ca un id (cel puțin 16 caractere, cu majuscule și
  litere mici) devin `#`, iar cheia se taie la 300 (`cheieLocala`). Nu e `cheieAmprenta` (regexurile normalizării
  serverului: ~90 ms pe eroare la un mesaj lung cu cratime, plătiți și peste plafon). Prima variantă înlocuia doar cifrele:
  o eroare în buclă cu un uuid nou la fiecare apariție mânca atunci tot plafonul pe sesiune (reverificarea). Gruparea
  adevărată rămâne pe server.
- **Ordinea în ascultător (schimbată la recenzie):** marcajul „doar local”, starea (stins → imediat), plafonul pe sesiune,
  abia apoi cheia. O eroare repetată într-o buclă nu mai costă nimic după plafon.
- **Abatere: coada n-are verificare proprie.** În coadă intră doar rapoarte acceptate, deci plafonul pe sesiune o mărginește
  singur (`PLAFON_COADA = PLAFON_SESIUNE`). O a doua verificare, egală, n-ar putea fi probată de niciun comportament (sabotajul
  ei ar trece de toate testele): ar fi o plasă vidă.

**5. Eșecurile raportorului nu intră în jurnal.** Se numără în memorie (`stare()`: faza, motivul stingerii, trimise,
refuzate, eșuate, peste plafon, renunțate, locale, reîncercări, în așteptare), iar consola primește cel mult un avertisment
pe sesiune. **Starea se vede în „Copiază raportul”** (din recenzie; înainte n-o citea nimic): antetul raportului jurnalului
are o linie `raportorul: <fază> (<motiv>); trimise …` (`descrieStare`, prin contextul raportului). Tot ce e asincron se
prinde (o respingere scăpată ar ajunge în jurnal prin `unhandledrejection`). Trimiterile sunt **pe rând**: un răspuns care
stinge raportorul oprește și restul cozii.

**Termenele sunt ale raportorului, nu doar ale SDK-ului** (din recenzie, trei lentile). `@firebase/functions` pornește
termenul apelului abia după tokenul App Check (`callAtURL`: `makeAuthHeaders`, apoi `failAfter`), iar `@firebase/app-check`
pune pe `enterprise.js` doar `onload`: blocat sau gol, tokenul nu vine niciodată. Fără curse proprii, pompa rămânea cu
`inLucru = true` toată sesiunea, fără niciun POST și fără niciun avertisment. Acum:
- **înaintea primului apel al sesiunii**, trimiterea cere explicit tokenul (`getToken` pe instanța App Check expusă de
  `conexiuneBaza`), în cursă cu **10 s**; termen depășit sau eroare → stins pentru sesiune (`app-check`), coada golită, un
  avertisment. Fără App Check pe instanță, apelul pleacă fără token (401, stins);
- **fiecare apel** e în cursă cu **30 s** (de la cerere, cu tot cu token; acoperă pornirea la rece a funcției), pe lângă
  opțiunea SDK-ului. Nimic nu mai ține pompa.

| Ce vine | Ce face raportorul |
|---|---|
| `{ ok: true }` | trimis |
| `{ ok: false, motiv: 'nevalid' }` | numărat (refuzat), merge mai departe |
| `{ ok: false, motiv: 'plafon' }` | stins pentru sesiune |
| 401 `unauthenticated` (App Check lipsă sau refuzat) | stins pentru sesiune |
| 403 `permission-denied` (invocarea publică lipsă, ca la prima publicare a lui 3.1) | stins pentru sesiune (precizare: toate ar eșua la fel) |
| tokenul App Check nu vine în 10 s, sau aruncă | stins pentru sesiune (`app-check`) |
| cererea n-a ajuns: `internal` cu statusul 0 (mesajul `internal [0]`, `fetch` căzut), `unavailable` (503) | o singură reîncercare după 5 s; apoi **renunță la raport** (eșuat), raportorul rămâne pornit |
| niciun răspuns în 30 s, sau `deadline-exceeded` | eșuat, **fără reîncercare** (nu e idempotentă: serverul poate fi scris deja), raportorul rămâne pornit |
| un 500 (`internal` cu alt status), `{ ok: false, motiv: 'scriere' }`, alt cod, un răspuns de altă formă, o trimitere care aruncă | eșuat (numărat) |
| bucata la cerere nu vine (import eșuat) | stins pentru sesiune; cerută o singură dată |
| conexiunea refuzată (emulatoare în afara gazdei locale) sau aruncată la creare | stins pentru sesiune |

Precizare la rețea: „renunță” e la raport, nu la sesiune (cealaltă citire ar pierde erorile de după o cădere scurtă);
plafonul de 20 mărginește oricum cererile la 40. **Schimbat la recenzie:** `deadline-exceeded` și un 500 nu se mai
reîncearcă (pe emulator, un prim apel de 15,1 s a dat două apariții ale aceluiași raport). Statusul 0 se recunoaște după
mesajul pe care îl pune SDK-ul (`<cod> [<status>]`, `_errorForResponse`), probat cu SDK-ul real și un `fetch` fals.

**6. Pornirea:** raportorul se creează în `main.tsx` la nivelul modulului, lângă jurnal (deci prinde și erorile dicționarului
și ale configurației), și pornește din promisiunea lui `config.json` (`incarcaConfig(...).then(...)`), fără să aștepte
dicționarul, fără `await` la nivelul modulului (ADR 0042: lecția blocajului) și fără ca randarea să-l aștepte. Ambele rute îl
au (aplicația și `/admin`). Doar primul `porneste` contează (fără dublă pornire; StrictMode nu-l atinge, fiindcă stă în
afara lui React). Fără nicio eroare, nimic nu se descarcă, nici la inactivitate (probat în e2e: 3,5 s fără nicio cerere,
cu Firebase și App Check în config; și unitar, cu ceasul fals: o oră fără nicio intrare, bucata necerută; o aducere amânată
la 5 s trecea de e2e, la reverificare).

**7. Cheia App Check a instanței, la publicare** (`scripts/appcheck-cheie.ts`): `pregateste-publicare.ts` citește
`GET https://firebaseappcheck.googleapis.com/v1/projects/<proiect>/apps/<appId>/recaptchaEnterpriseConfig` prin clientul API al
firebase-tools instalat global (`npm root -g`, `requireAuth` + `apiv2.Client`, doar GET) și pune `appCheck: { cheieSite }` în
`config.json`. Nimic din repo.
- **404, sau obiectul configurației fără `siteKey`** = neînregistrată: `config.json` fără `appCheck` și avertismentul clar
  („App Check neînregistrat […]: raportorul de erori va primi 401 […]. Pasul owner-ului: […]”), nu eșec.
- **Strict (din recenzie):** `siteKey` se acceptă doar dacă se potrivește cu `/^[A-Za-z0-9_-]{20,100}$/`; un 200 al cărui corp
  nu e un obiect cu `name` terminat în `/recaptchaEnterpriseConfig` (un tablou, un plic de eroare) e **eroare de citire**,
  nu „neînregistrat”. Înainte, o cheie de 301 caractere ajungea în `config.json`, iar pagina refuza atunci tot config-ul.
- **Precizare: o eroare de citire (drepturi, rețea, firebase-tools lipsă, corp ciudat) oprește publicarea.** O publicare care
  ar scoate tăcut App Check de pe o instanță care îl are ar opri raportorul și „Rezolvat” fără să spună nimănui.
- **Textul `config.json` publicat** vine dintr-o funcție pură (`configPublicat(instanța, firebase, cheia)`), trecut prin
  schema aplicației (`citesteConfig`): un config pe care pagina l-ar refuza oprește publicarea. `pregatestePublicare`
  primește dependențele (configurația web, citirea cheii, dosarele) și e probată cap-coadă pe un dosar temporar.
- **Măsurat pe 17.10 (GET, doar citire):** pe `cncvectorstudio-test`, înregistrarea există deja (răspunsul are `siteKey`):
  următoarea publicare pe test pune cheia în `config.json`.

**8. CSP-ul** (`shared/csp.ts`), verificat pe documentația Google: FAQ-ul reCAPTCHA (docs.cloud.google.com/recaptcha/docs/faq,
„Can I customize the reCAPTCHA widget or badge?”) cere `script-src` `https://www.google.com/recaptcha/`,
`https://www.gstatic.com/recaptcha/`; `frame-src` `https://www.google.com/recaptcha/`, `https://recaptcha.google.com/recaptcha/`;
`connect-src` `https://www.google.com/recaptcha/`. App Check aduce `https://www.google.com/recaptcha/enterprise.js` și schimbă
tokenul la `https://content-firebaseappcheck.googleapis.com/v1` (constantele `RECAPTCHA_ENTERPRISE_URL` și `BASE_ENDPOINT` din
`@firebase/app-check`); funcțiile sunt deja în `connect-src`. **Lipsea doar `connect-src https://www.google.com/recaptcha/`**,
adăugat; restul era acoperit. Nimic lărgit în rest.

**9. Poarta pachetului** (`scripts/build-determinist.ts`), plase noi, fiecare probată cu un sabotaj:
- **Firebase doar în bucățile permise (lărgit la recenzie):** marcajele `@firebase/app`,
  `content-firebaseappcheck.googleapis.com`, `@firebase/functions`, `logClientError` se caută în TOATE bucățile din `dist`,
  nu doar în cea de pornire; cele care le conțin trebuie să fie `raportor-*`, `conexiuneBaza-*` sau `PaginaAdmin-*`, și
  fiecare marcaj trebuie să existe undeva (altfel plasa n-ar mai vedea nimic). **Plus (abatere de la cerință, necesară):**
  nicio altă bucată nu importă static o bucată permisă. Fără ea, sabotajul cerut (un import de valoare din `conexiuneBaza`
  în `PanouProprietati.tsx`) trecea: Firebase rămânea în bucata lui, dar venea la pornire odată cu panoul;
- bucata `raportor-*` există o dată, iar pornirea o cere cu `import()`;
- ce aduce raportorul la prima eroare (închiderea lui): plafon **25 kB**;
- partea din pornire, măsurată singură (modulul, minificat, cu tot ce importă, gzip 9): plafon **1,5 kB**. Cifra întregii
  porniri n-o vede: un sabotaj care adaugă câteva sute de octeți în partea raportorului lasă pornirea aproape neschimbată;
- adminul se măsoară acum cu închiderea lui (cu Firebase-ul împărțit), nu doar cu bucata `PaginaAdmin-*`.

## Cifrele (măsurate, gzip 9, după recenzie)

- Pornirea: 92,3 → **93,5 kB** (cu dicționarul, 2,1); partea raportorului: **1,20 kB** singură (plafon 1,5; la recenzie
  1,39, la reverificare 1,52 cu cheia și curățarea noi, apoi 1,20 după mutarea raportului în bucata la cerere). Cu un proiect
  salvat: **98,1 / 100** (strâmt: următoarea mutare la ADR 0042).
- La prima eroare, cu Firebase în configurație: **17,9 kB** (`raportor` 1,1 + `conexiuneBaza` 16,8). **Nu include
  `enterprise.js`** (reCAPTCHA Enterprise, script terț cu cadrul lui), adus în plus la prima eroare pe o instanță cu App Check.
- `/admin` cu tot ce aduce: 164 → 166,6 kB (plafon 200). Totalul fără admin: 192,6 → 211,8 kB (plafon 300).

## Dovada și probele

- **Unitare** (`test/unit/raportor.test.ts`, 49; `appcheck-cheie.test.ts`, 12; `jurnalErori.test.ts`, 13;
  `conexiuneBaza.test.ts`, 5): coada dinaintea configurației, doar intrările sesiunii, intrările „doar locale” sărite fără
  descărcare, fără Firebase = nimic adus, plafoanele (și cu erori rare) și constantele de politică fixate (20 / 3 / 20 /
  5 000 ms / 30 000 ms / 10 000 ms), cheia locală (ieftină pe un mesaj lung în kebab-case, sub 40 ms pentru 10 erori;
  plafonul pe cheie ține), stingerea la 401 / 403 / plafon / import eșuat / conexiune refuzată sau aruncată / token App
  Check care nu vine sau aruncă, trimiterea cu apelul și tokenul injectate (citirea lui `r.data`, termenul propriu al
  apelului și al tokenului), reîncercarea doar pentru cererea care n-a ajuns (și cu SDK-ul real: `fetch` căzut, 500, 503,
  401), trimiterile pe rând, fără buclă și cu un singur avertisment, fără dublă pornire, raportul construit, curățat (și
  liniar), cu mesajul de rezervă și browserul implicit, starea în raportul copiat; ascultătorul primește intrarea și când
  depozitul aruncă; cheia App Check strictă, citirea cu clientul injectat (404, 200 bun, 200 fără `siteKey`, corp ciudat,
  cheie strâmbă, eroare de rețea), `config.json` publicat (funcția pură și pregătirea cu dependențele injectate);
  carantina emulatoarelor pe adresele lor, întregi; clasificarea erorilor proiectului local (mediu sau defect); App Check
  fără reîmprospătare în fundal (plasă pe sursă: fiecare `isTokenAutoRefreshEnabled` din `src/` e `false`).
- **E2e pe build** (`test/e2e/raportor.spec.ts`, 11; plasa refuză orice gazdă externă): fără Firebase, o eroare (și una
  dinaintea `config.json`) nu cere bucata raportorului, nici Firebase; martorul cu Firebase fără App Check: bucata vine la
  prima eroare, corpul are doar cheile contractului și browserul paginii, funcția dă 401, a doua eroare nu mai pleacă,
  jurnalul are doar erorile omului, un singur avertisment; bucata care nu vine: o cerere, nicio eroare nouă; **nu la
  inactivitate** (3,5 s, nicio cerere spre `raportor-*`, `conexiuneBaza-*`, `enterprise.js`); **IndexedDB blocat**: intrarea
  „doar locală”, nicio cerere spre bucata raportorului; **App Check cu `enterprise.js` oprit, apoi servit gol** (o cheie de
  site falsă în config): stins (`app-check`) în termenul tokenului, niciun POST, a doua eroare lăsată imediat; **o publicare
  fără dicționare**: ecranul „fără texte”, iar rapoartele (primul eșec și eșecul total) pleacă; **baza la o versiune mai
  nouă** (`VersionError`): raportul pleacă, nu e „doar local”; **ușa proiectului care nu vine**: „necitit acum” pleacă. **CSP-ul**
  (`csp.spec.ts`, +1): sub CSP-ul din build, scriptul, cadrele, cererile reCAPTCHA, schimbul App Check și funcțiile ambelor
  proiecte trec, o origine străină e refuzată (martorul).
- **Pe emulatoare** (`test/e2e-emulator/raportor.emulator.spec.ts`, 3): o eroare de randare ajunge grup în `errorLogs`, cu
  tipul, build-ul, adresa, stiva componentelor și browserul apariției (user-agentul paginii), o singură apariție; a patra
  apariție identică nu mai pleacă (grupul rămâne la 3, iar eroarea de după ajunge); pe `/admin`, după login, apariția și
  grupul poartă uid-ul.
- **Sabotajele** (fiecare restaurat, cu comparație octet cu octet): la implementare 20 pe unitare, 6 pe e2e, 4 pe poartă, 3
  pe emulator; la recenzie încă 32 pe unitare, 5 pe e2e, 3 pe poartă, toate prinse (lista în „Recenzia”). O excepție
  scrisă: importul care se reia la fiecare eroare (în loc de stins) e prins doar de unitar, fiindcă Edge ține eșecul
  `import()` până la reîncărcare (ADR 0042) și nu mai cere bucata.
- **Neprobat aici:** tokenul reCAPTCHA adevărat și 200 pe test (cer publicarea, cu cheia acum înregistrată); stilurile pe
  care le-ar injecta `enterprise.js` sub `style-src 'self'` (nu se văd fără tokenul adevărat).

## Recenzia (17.10)

Patru lentile independente (corectitudine, securitate, pachet, probe), pe arborele necomis. Fiecare constatare și remediul:

| Lentila | Constatarea | Remediul |
|---|---|---|
| corectitudine, securitate, pachet | Termenul de 15 s nu acoperea tokenul App Check: `enterprise.js` blocat sau gol → raportorul agățat toată sesiunea, fără POST, fără avertisment; „no recaptcha” în jurnal | §5: tokenul cerut explicit înaintea primului apel, cursă de 10 s → stins (`app-check`); cursa proprie de 30 s pe fiecare apel. Probe: unitare (token care nu vine, care aruncă, apel care nu se încheie) și e2e (`enterprise.js` oprit, apoi gol). „No recaptcha” rămâne în jurnal (limitele) |
| corectitudine | Reîncercarea după `deadline-exceeded` nu e idempotentă (dublură pe emulator, uid-ul de după login pe raportul de dinainte) | §5: fără reîncercare pe termen și pe 500; doar statusul 0 și `unavailable`; termenul la 30 s. Probe pe fiecare cod, și cu SDK-ul real |
| corectitudine | `cheieAmprenta` (regex aproape pătratic) calculată înaintea plafoanelor: ~80–90 ms pe eroare, și peste plafon | §4: cheia locală liniară, verificată după stare și plafonul pe sesiune. Probă: kebab-case de ~1 000 de caractere, 10 erori sub 40 ms (sabotajul cu vechea cheie: 838 ms) |
| corectitudine | Nimic nu citea `stare()`, deși ADR-ul spunea că „se vede” | §5: linia `raportorul: …` în „Copiază raportul”; ADR-ul corectat |
| corectitudine | Mesajul gol era refuzat sigur de server, deci eroarea se pierdea | §3: `eroare fără mesaj` |
| securitate | Citirea cheii la publicare permisivă: cheie de 301 caractere acceptată, un 200 de altă formă = „neînregistrat” | §7: strictă, citirea cu clientul injectat, `config.json` printr-o funcție pură validată de schema aplicației |
| securitate | `mesaj` și `stiva` plecau necurățate (adrese cu token, e-mailuri) | §3: `curataText` (liniar) |
| securitate | Carantina emulatoarelor verifica doar gazda paginii | §2: și gazda fiecărui emulator |
| securitate | reCAPTCHA încărcat la prima eroare și reîmprospătat în fundal tot restul sesiunii | §2: `isTokenAutoRefreshEnabled: false`; „Ce impune”: politica de confidențialitate |
| pachet | Condițiile de mediu (IndexedDB blocat, dicționarul) aduceau Firebase și un POST la fiecare pornire | §1: intrările „doar locale”. Probe unitare și e2e (IndexedDB blocat) |
| pachet | Nicio probă pentru „nu la inactivitate” | e2e de 3,5 s fără eroare; sabotajul cu un `import()` amânat 2,5 s e prins |
| pachet | Marcajele Firebase căutate doar în bucata de pornire | §9: în toate bucățile + importatorii statici |
| pachet | Cifra „la prima eroare” nu include `enterprise.js` | precizat la „Cifrele”; fără schimbare de cod |
| probe | J1 (ascultătorul sărit când `setItem` aruncă), U1, U3 / U4 (constantele), U5 (termenul apelului), U6 (citirea lui `r.data`), U7 (crearea care aruncă), U8 (browserul), U16 (404), U17 (`config.json` fără `appCheck`), U20 (adresa doar cu fragment) scăpau | câte o probă pentru fiecare; fiecare mutație reaplicată pe codul nou e prinsă (U8 și în e2e și pe emulator; U17 și pe funcția pură, și pe pregătire) |

Sabotajele remedierilor (fiecare reaplicat, restaurat octet cu octet, arborele verificat cu amprentele după fiecare grup):
- **unitare, 32, toate prinse:** tokenul necerut, tokenul fără termen, apelul fără cursa proprie, termenul de 15 s, termenul
  tradus ca rețea, pompa care reîncearcă termenul, orice `internal` ca rețea, cheia pe amprenta serverului, plafonul pe cheie
  `>`, starea lipsă din raport (2), mesajul gol, e-mailurile, fragmentul din text, stiva necurățată, carantina doar pe
  pagină, intrările locale trimise, marcajul nepăstrat, J1, U1, U3, U4, plafonul pe cheie 4, U6, U7, U8, U16, U17 (pe
  pregătire, pe funcția pură, fără validare), corpul fără `name`, cheia neverificată. O mutație a ieșit echivalentă:
  `Array.isArray` în citirea cheii (un tablou n-are `name`, deci îl refuză verificarea următoare); verificarea a fost scoasă;
- **e2e, 5, toate prinse:** tokenul necerut (ambele variante App Check), intrările locale trimise, importul amânat la
  inactivitate, browserul gol din `main.tsx`, IndexedDB lipsă raportat ca defect;
- **poarta, 3, toate prinse:** importul de valoare din `conexiuneBaza` în `PanouProprietati.tsx` (de plasa importatorilor;
  marcajele singure nu-l vedeau), trimiterea importată static în `main.tsx` (marcajul `@firebase/app` în pornire), partea
  din pornire cu vechea amprentă (1,58 kB, peste 1,5).

Nerezolvate de recenzie, cu motivul:
- **U9 (`build: ''` în `main.tsx`)** îl prinde doar testul 1 de pe emulator (neschimbat).
- **U19 (cache-ul `curenta` din `conecteazaBaza`)** n-are probă unitară: pe emulator, a doua inițializare App Check ar arunca
  (testul `/admin` ar cădea); cu reCAPTCHA și aceeași cheie, mutația e aproape echivalentă.

## Reverificarea (18.10)

Două lentile pe remedieri (17.10, seara): „remedieri” a terminat cu 6 constatări; „otrăvuri” a fost oprită la pauză, iar a
doua rundă de otrăvuri a rulat-o integratorul, pe 18.10, pe codul final (`test/otravuri/3.2.py`).

| Constatarea | Remediul |
|---|---|
| **mare:** marcajul „doar local” pe dicționare: o publicare fără `mesaje.*` (nimeni nu poate porni aplicația) nu ajungea la server; același `catch` acoperea și defecte de cod | §1: dicționarele pleacă. Probă e2e: 404 pe ambele dicționare → „fără texte”, iar primul eșec și `AggregateError` ajung la funcție (sabotajele: cele două marcaje puse înapoi, prinse; al doilea a scăpat întâi, iar proba cere acum și eșecul total) |
| `fara-memorie` prindea orice excepție (`VersionError`, un `TypeError` al nostru) și o marca „doar local” | §1: `eroareDeMediu` (lista îngustă), `mediu: true` doar pe ea, pe IndexedDB lipsă și pe termen; ușa care nu vine pleacă și ea. Probe: unitară pe clasificare, e2e pe `VersionError` și pe ușa lipsă |
| Cheia locală nu grupa id-urile: o eroare cu uuid în buclă mânca tot plafonul pe sesiune | §4: cuvintele cu cifre sau cu forma unui id devin `#`, liniar. Probă: 25 de uuid-uri + o eroare distinctă (pleacă); id-uri hex și id-uri Firebase fără cifre |
| „Nu la inactivitate” probat doar 3,5 s: o aducere la 5 s trecea | §6: proba unitară cu ceasul fals (o oră) |
| Carantina ocolibilă pe adresa contului (`http://localhost\@colector…`) | §2: adresele potrivite întregi |
| Curățarea scăpa `HTTPS://`, `wss://`, parantezele, `%40` și tăia poziția din stivă | §3: lărgită, poziția păstrată |

Sabotajele acestor remedieri: 12, toate prinse (unul abia după întărirea probei, mai sus). Apoi **a doua rundă de
otrăvuri**, pe codul final: 31 (11 scăpate în prima rundă, reaplicate: J1, U1, U3–U8, U16, U17, U20; 20 noi pe remedierile din
17.10: cursele tokenului și ale apelului, codurile reîncercării, stingerea, starea în raport, cheia App Check strictă,
carantina, plafonul pe cheie, dubla pornire, coada la stingere). **30 prinse de setul lor**; N11 (reîmprospătarea App Check în
fundal pusă înapoi) a scăpat: opțiunea SDK-ului nu se vede la rulare fără reCAPTCHA adevărat și o jumătate de TTL, deci a
primit o plasă pe sursă (îngustă, pe un singur nume de opțiune), probată cu otrava: prinsă. **31 / 31.** Rezultatul e în
antetul listei.

## Ce impune

- Un modul nou care trimite spre funcții din aplicație trece prin `conexiuneBaza.ts`, nu prin `conexiune.ts` (care aduce
  contul și Firestore).
- Partea din pornire importă bucata trimițătoare **doar ca tip** (`import type`): un import de valoare trage Firebase în
  pornire (marcajele și plasa importatorilor din poartă îl opresc).
- Nimic din raportor nu scrie în jurnal; o eroare nouă de raportare se numără în `stare()`, care se vede în „Copiază
  raportul”.
- O sursă nouă de erori care descrie mediul omului (nu un defect) scrie cu `adaugaLocala`; un defect, cu `adauga`. **O
  bucată, un dicționar sau un fișier al aplicației care nu vine e defect** (o publicare stricată arată la fel ca rețeaua):
  se raportează. Lista erorilor de mediu e una singură (`eroareDeMediu`).
- Un apel nou spre server din raportor are termen propriu (cursa din `src/cloud/raportor.ts`), nu doar opțiunea SDK-ului.
- Publicarea cere firebase-tools instalat global și logat (citirea cheii); o eroare de citire oprește publicarea.
- **Politica de confidențialitate, la lansare,** spune că la o eroare (pe o instanță cu App Check) se încarcă reCAPTCHA
  Enterprise (Google): `enterprise.js`, cadrul lui și evaluarea tokenului. Fără eroare nu se încarcă nimic.
- Canalul de previzualizare (`publica-canal.ts`) are alt domeniu (`*.web.app`): dacă domeniul nu e în cheia reCAPTCHA,
  raportorul nu primește token sau primește 401 și se stinge (fără alt efect).

## Limitele rămase

- Când un blocant înlocuiește `enterprise.js` cu un script gol, `onload`-ul SDK-ului aruncă `Error: no recaptcha`, care ajunge
  în jurnalul local ca `fereastra` (omul vede o eroare în plus). Raportorul nu o trimite (se stinge în termenul tokenului),
  dar n-o poate opri: aruncarea e în SDK.
- Canalele de previzualizare n-au App Check (domeniul lor nu e în cheia reCAPTCHA): raportorul se stinge acolo.
- Statusul 0 poate fi și un 500 fără anteturile CORS (comentariul SDK-ului): atunci reîncercarea unică poate dubla un raport.
  La fel un 503 venit după scriere. Rare, mărginite de plafoane.
- Pagina `/admin` folosește aceeași bază: cu `enterprise.js` blocat, apelurile ei („Rezolvat”) rămân fără termen propriu
  (doar raportorul are cursele).
- Cifra „la prima eroare” (17,9 kB) nu include `enterprise.js`.
- O bază la altă versiune (`VersionError`) se raportează acum, dar omul vede tot mesajul „fără memorie” (textul interfeței
  nu s-a schimbat în felia asta).
- Pe o rețea căzută, o bucată care nu vine produce rapoarte care nu pot pleca (raportorul nu vine nici el): se pierd, ca
  înainte; o rețea instabilă poate trimite câteva rapoarte de „bucată lipsă”, mărginite de plafoane și grupate pe server.

## Ce am respins

- **Retrimiterea intrărilor vechi din `localStorage`:** n-au build-ul, iar fiecare încărcare le-ar dubla.
- **Firebase în pornire** (raportorul gata la prima eroare): ~17 kB la fiecare pornire, peste plafon cu ușa proiectului.
- **`conexiune.ts` întreg pentru raportor:** contul și Firestore la prima eroare a oricui (punctul 2).
- **Raportorul oprit preventiv fără cheie App Check:** ar ascunde starea; trimiterea dă 401 o dată, se stinge, iar starea se
  vede în raportul copiat și în consolă.
- **Stingerea la prima cădere de rețea:** pierde erorile de după o cădere scurtă (punctul 5).
- **Reîncercarea după termen:** nu e idempotentă (punctul 5, recenzia).
- **Amprenta serverului ca cheie locală:** costul regexurilor pe fiecare eroare (punctul 4, recenzia).

## Se redeschide dacă

- pe date reale, plafoanele clientului (20 / 3) taie erori distincte care contează sau lasă să treacă zgomot;
- partea din pornire trece de 1,5 kB, sau pornirea trece de ~95 kB, ori pornirea cu ușa de 100 kB (ADR 0042);
- rapoartele de „bucată lipsă” din rețele instabile acoperă defectele adevărate (atunci un predicat îngust pentru ele, la
  sursă);
- pe date reale apar dubluri din reîncercarea pe statusul 0 / 503, sau rapoarte pierdute pe termenul de 30 s.
